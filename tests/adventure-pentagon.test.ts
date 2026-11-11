// Overworld adventures, first release: Pentagon version 11 (adventures.ts; Tim, 2026-11-11: large, rare, self-contained
// adventure worlds; winding and interconnected, "NOT one hub room with 3–5 corridors each ending in a room"; a Waystone hub that
// is a respawn and rest point; districts that may mix themes; finishable in the standard view). Older Pentagons regenerate
// byte for byte; every key, lever, trial, keeper, vault and shortcut is reachable on foot; the layout has loops, not a tree.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, recoverPentagonVersion, PENTAGON_MAX_VERSION } from '../src/game.ts';
import { PENTAGON, pentagonPlan, generatePentagonChamber, placePentagonSection, pentagonLinkEnds } from '../src/pentagon.ts';
import { CLOSE_VIEW_ROOM_ROUTING } from '../src/close-view-room-routing.ts';
import { CREATURE_FORMS } from '../src/combat.ts';
import { ADVENTURE_PENTAGON as AP, ADVENTURE_THEMES, ADVENTURE_AREAS, adventureThemes, adventureRoster, adventureThemePick, composeDistrict, adventureCycles, edgeDisjointRoutes, solveAdventurePlan, layAdventureArea, adventureCameraClearance } from '../src/adventures.ts';

const V = AP.version, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const plans = (n, pre = 'A', v = V) => Array.from({ length: n }, (_, i) => ({ seed: `${pre}${i}`, P: pentagonPlan(`${pre}${i}`, i * 8, -i * 8 + (i % 3) * 8, v) }));
const chamber = (seed, P, q, T = 2) => generatePentagonChamber(seed, `${P.base}:f${q.n + 1}`, T);
const flood = (m) => { const W = m.width, seen = new Set([m.entry.y * W + m.entry.x]), st = [m.entry];
  while (st.length) { const c = st.pop(); for (const [dx, dy] of N4) { const x = c.x + dx, y = c.y + dy, k = y * W + x, t = m.tiles[k]; if (x < 0 || y < 0 || x >= W || y >= m.height || !t || seen.has(k) || t.blocked) continue; seen.add(k); st.push({ x, y }); } }
  return seen; };

// ------------------------------------------------------------------------------------------------ the pins
// Digests of the plan (every version) and every chamber (versions 8-10, terrain 1 and 2), taken from the generator before
// version 11 (commit 174ffb69), and of the nine overworld sections and the shortcut link ends.
const PINNED = {
  'TIM1:8:8:v1': '984545cc77ffe664479ab4af', 'TIM1:8:8:v2': 'b9a99dcfd2ecee240f595254', 'TIM1:8:8:v3': '2979d3a0a813dad3e70b2f3c', 'TIM1:8:8:v4': 'bb4a7790f26a427911aab2f3', 'TIM1:8:8:v5': 'b20f8d063b73067f1ea23c65',
  'TIM1:8:8:v6': '5aaf761802ecf890a06681e3', 'TIM1:8:8:v7': '93b9dbe463fe7d72677531f7', 'TIM1:8:8:v8': '8e56932d68293f14989b0337', 'TIM1:8:8:v9': 'b9052d97b3c0cb4348add9f1', 'TIM1:8:8:v10': 'c309f84ec6c397823ba3c26d',
  'PIN2:-16:24:v1': '17781be5afe56ceff588dacf', 'PIN2:-16:24:v2': 'c962df8afa399f9e3893d2d3', 'PIN2:-16:24:v3': '1f4b6ac3ab4ca9b356ee97f8', 'PIN2:-16:24:v4': '64ffdb27d109cd3641be5c4a', 'PIN2:-16:24:v5': '4f76380937e93bb72ce29027',
  'PIN2:-16:24:v6': '394ed18516de15095d4008b1', 'PIN2:-16:24:v7': '09cdfea5e2b857c3a8f7103c', 'PIN2:-16:24:v8': 'a187f5cff30dffab35c58a7c', 'PIN2:-16:24:v9': '21d5fed7cad43fa5b2c7ebbd', 'PIN2:-16:24:v10': '551b9b45824e78de28e81f8f',
  'PIN3:40:-8:v1': '9e90680706608b429cc43bda', 'PIN3:40:-8:v2': '76949961e0e5d2f237afe31c', 'PIN3:40:-8:v3': '256e929596eec8681b567204', 'PIN3:40:-8:v4': '3a1dfc7ca3b45ff5ebfe366b', 'PIN3:40:-8:v5': '625b0267c4feaea79209b354',
  'PIN3:40:-8:v6': 'a43f6a88b184883a6c1bef34', 'PIN3:40:-8:v7': '2892b05ee1a13aa1eef9e3a9', 'PIN3:40:-8:v8': 'f99f60e408ba04f3d1c5b73c', 'PIN3:40:-8:v9': '3dd59ca11e2784b301b18365', 'PIN3:40:-8:v10': '48d246e9bb8f01da16930d49',
};
const SECTIONS = { 'TIM1:8:8:v6': '1d5829cf6a1b31b91b7ce7c2', 'TIM1:8:8:v7': 'b2e76caf89c329d121665e4f', 'TIM1:8:8:v9': 'b335125fae08444e5eb5a65d', 'TIM1:8:8:v10': '5cc7d6233443074c40f42e7e',
  'PIN2:-16:24:v6': '6fcb043ba79153f56c68e164', 'PIN2:-16:24:v7': '7a15761aa512c8632655653c', 'PIN2:-16:24:v9': 'bcc684f7e7a0e2153a4e9b6b', 'PIN2:-16:24:v10': 'f0133be749c3f3242097ffd5' };
test('old Pentagons: plans of versions 1-10 and chambers of 8-10 regenerate byte for byte as before version 11', () => {
  for (const [k, want] of Object.entries(PINNED)) { const [seed, cx, cy, v] = k.split(':'), Vk = Number(v.slice(1)), h = createHash('sha256'), P = pentagonPlan(seed, Number(cx), Number(cy), Vk); h.update(JSON.stringify(P));
    if (Vk >= 8) for (const q of P.nodes) for (const T of [1, 2]) h.update(JSON.stringify(generatePentagonChamber(seed, `${P.base}:f${q.n + 1}`, T)));
    assert.equal(h.digest('hex').slice(0, 24), want, k); }
});
test('old Pentagons: their overworld sections and shortcut link ends are unchanged', () => {
  for (const [k, want] of Object.entries(SECTIONS)) { const [seed, a, b, v] = k.split(':'), cx = Number(a), cy = Number(b), Vk = Number(v.slice(1)), h = createHash('sha256');
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const map = { tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: i >> 5, kind: 'grass', blocked: false, elev: 0 })), objects: [], enemySpawns: [] }; placePentagonSection(map, seed, cx, cy, cx + dx, cy + dy, Vk); h.update(JSON.stringify(map)); }
    const P = pentagonPlan(seed, cx, cy, Vk); for (const q of P.nodes) { const m = generatePentagonChamber(seed, `${P.base}:f${q.n + 1}`, 2); h.update(JSON.stringify(pentagonLinkEnds(P, { ...m, id: `${P.base}:f${q.n + 1}` }))); }
    assert.equal(h.digest('hex').slice(0, 24), want, k); }
});

// Version 11 itself, pinned from this release on: a later change must take a new version, never alter these.
const PINNED_V11 = { 'TIM1:8:8': '78e912738268f42475cc2fc3', 'PIN2:-16:24': 'aaf23c8a471e19d521fdf2ab' };
test('v11 Pentagons are pinned: plan and every chamber (terrain 2) regenerate byte for byte', () => {
  for (const [k, want] of Object.entries(PINNED_V11)) { const [seed, cx, cy] = k.split(':'), h = createHash('sha256'), P = pentagonPlan(seed, Number(cx), Number(cy), V); h.update(JSON.stringify(P));
    for (const q of P.nodes) h.update(JSON.stringify(generatePentagonChamber(seed, `${P.base}:f${q.n + 1}`, 2))); assert.equal(h.digest('hex').slice(0, 24), want, k); }
});

// ------------------------------------------------------------------------------------------------ the version
test('the version: 11 is the next free Pentagon version (10 is release 844 routing); new ground adopts it, pins keep theirs', () => {
  assert.equal(V, 11); assert.equal(CLOSE_VIEW_ROOM_ROUTING.pentagonVersion, 10); assert.equal(PENTAGON_MAX_VERSION, 11); assert.equal(PENTAGON.version, 9, 'the legacy baseline is untouched');
  const at = (pins) => { const s = freshSave(); s.seed = 'VER'; s.atlas = pins; return recoverPentagonVersion(s, 0, 0); };
  assert.equal(at({}), AP.live ? 11 : 10, 'genuinely new ground');
  for (const v of [1, 7, 9, 10, 11]) assert.equal(at({ '1,0': { pentVersion: v } }), v, `a section pinned to ${v}`);
  assert.equal(at({ '1,0': { pentVersion: 11 }, '0,1': { pentVersion: 10 } }), 10, 'the lowest pin of the nine wins');
  assert.equal(at({ '1,0': { pentVersion: 12 } }), 9, 'an unsupported future pin falls back to v9, as before');
  const s = freshSave(); s.seed = 'VER'; s.consequences.dungeons['pentagon:VER:0:0:v10:f1'] = { visits: 1 }; assert.equal(recoverPentagonVersion(s, 0, 0), 10, 'a v10 history with no atlas pin stays v10');
});
test('a fresh game finds a Pentagon on new ground at version 11 and pins it on the atlas', () => {
  const s = freshSave(); s.seed = 'TIM1'; const g = new Game(s, 0); let site = null;
  for (let cx = -64; cx <= 64 && !site; cx += PENTAGON.every) for (let cy = -64; cy <= 64 && !site; cy += PENTAGON.every) if (g.pentagonHere(cx, cy)) site = { cx, cy };
  g.rx = site.cx; g.ry = site.cy + 1; g.loadArea('overworld', false); assert.equal(g.map.pentagon.V, 11);
  assert.ok(g.map.objects.filter((o) => o.pentagonDoor).every((o) => o.dungeonId.includes(':v11:')));
  assert.equal(s.atlas[`${g.rx},${g.ry}`].pentVersion, 11);
});

// ------------------------------------------------------------------------------------------------ themes
test('themes: seven rows as data, Tomb, Verdant Ruin and Ash Waste enabled; tiles the standard view draws; creatures that exist', () => {
  const src = readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8'), cv = readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8');
  const openAir = JSON.parse(cv.match(/const OPEN_AIR_KINDS = new Set\((\[[^\]]*\])\)/)[1]);
  assert.deepEqual(Object.keys(ADVENTURE_THEMES), ['tomb', 'verdant', 'ash', 'city', 'alien', 'frost', 'foundry']);
  assert.deepEqual(adventureThemes(V), ['tomb', 'verdant', 'ash']); assert.deepEqual(adventureThemes(10), []);
  for (const [k, T] of Object.entries(ADVENTURE_THEMES)) {
    for (const kind of [T.tiles.wall, T.tiles.under, T.tiles.path, ...T.tiles.floor, T.tiles.accent, T.tiles.low, ...Object.values(T.remap)]) { assert.ok(new RegExp(`\\b${kind}: \\[`).test(src), `${k}: ${kind} has a standard-view palette entry`); assert.ok(!openAir.includes(kind), `${k}: ${kind} is indoors for Close View`); }
    for (const c of [...T.creatures.roster, ...T.creatures.newcomers.map((q) => q.kind)]) assert.ok(CREATURE_FORMS[c], `${k}: ${c} is a creature`);
    assert.ok(Array.isArray(T.creatures.newcomers), `${k}: a newcomers hook`); for (const b of T.bosses) assert.ok(PENTAGON.bosses[b], `${k}: ${b} has a boss name`);
    for (const a of Object.keys(ADVENTURE_AREAS)) if (a !== 'waystone') assert.ok(T.areas[a]?.length, `${k}: names for ${a}`); }
  assert.deepEqual(adventureRoster('tomb', V), ADVENTURE_THEMES.tomb.creatures.roster);
});
test('themes: random by seed, mixed across districts (one accent theme), every enabled theme turns up as primary', () => {
  const primary = {}; let accented = 0;
  for (let i = 0; i < 600; i++) { const t = adventureThemePick(`T${i}:0:0`, V); primary[t.primary] = (primary[t.primary] || 0) + 1;
    const used = new Set(t.districts); assert.ok(used.size <= 2 && used.has(t.primary) || t.districts.filter((d) => d === t.primary).length >= 3, `T${i}`); assert.ok(t.districts.filter((d) => d === t.accent).length <= AP.accent.max);
    if (used.size === 2) accented++; assert.deepEqual(adventureThemePick(`T${i}:0:0`, V), t, 'deterministic'); }
  for (const k of adventureThemes(V)) assert.ok(primary[k] > 120, `${k}: ${primary[k]} of 600`); assert.equal(accented, 600, 'every Pentagon mixes in one surprise');
});

// ------------------------------------------------------------------------------------------------ the graph: winding, interconnected
test('districts: rows with loops, a layered route, side areas and a vista; never a tree', () => {
  for (let i = 0; i < 400; i++) for (const size of ['grand', 'vast']) { const D = composeDistrict(`D${i}`, { id: 'd0', size, theme: 'tomb' });
    assert.ok(adventureCycles(D.nodes, D.edges) >= 1, `D${i} ${size}: a way round`); assert.ok(D.routes.length >= 1, 'a gallery or undercroft');
    assert.equal(D.nodes.filter((q) => q.template === 'vista').length, 1); assert.equal(D.nodes.filter((q) => q.template === 'keep').length, 1);
    assert.ok(D.sides.length >= 1); const S = AP.sizes[size]; assert.ok(D.R >= S.rows[0] && D.R <= S.rows[1]);
    for (const s of D.sides) assert.equal(D.edges.filter((e) => e.a === s || e.b === s).length, 1, 'a side area is a dead end that pays');
    assert.deepEqual(composeDistrict(`D${i}`, { id: 'd0', size, theme: 'tomb' }), D); }
});
test('v11 plans: large (60+ chambers), many independent loops, two routes with no door in common into every district keep, ways across districts', () => {
  const sizes = {};
  for (const { seed, P } of plans(160)) { const A = P.adventure; sizes[A.size] = (sizes[A.size] || 0) + 1;
    assert.ok(P.nodes.length >= 60, `${seed}: ${P.nodes.length} chambers`); assert.equal(P.nodes.filter((q) => q.kind === 'waystone').length, 1);
    const walk = P.edges.filter((e) => !e.shortcut && !e.sigil && !e.secret);
    assert.ok(adventureCycles(P.nodes, walk) >= 15, `${seed}: ${adventureCycles(P.nodes, walk)} loops`);
    assert.ok(P.edges.filter((e) => e.cross).length >= AP.minCross, `${seed}: ways across districts`);
    for (const D of A.districts) { for (const f of new Set([D.front[0], D.front.at(-1)])) assert.ok(edgeDisjointRoutes(walk, f, D.deep) >= 2, `${seed} ${D.id}: two routes with no door in common from the front (${f}) into the keep`);
      const own = new Set(P.nodes.filter((q) => q.district === D.face).map((q) => q.id)); assert.ok(adventureCycles([...own], walk.filter((e) => own.has(e.a) && own.has(e.b))) >= 1, `${seed} ${D.id}: not a tree`);
      const sc = P.edges.find((e) => e.shortcut === `adv:${D.id}`); assert.ok(sc && sc.far === D.deep && [sc.a, sc.b].includes('w0'), `${seed} ${D.id}: a shortcut from the keep back to the Waystone`); }
    const hub = P.nodes.find((q) => q.id === 'w0'); assert.ok(P.links.filter((L) => L.kind === 'lift').every((L) => L.near === 'w0'), 'the Heart lifts start at the Waystone');
    assert.ok(hub.ports.length >= 2 + A.districts.length);
    if (A.size === 'vast') assert.equal(P.nodes.filter((q) => q.waystone === 2).length, 1, `${seed}: a second Waystone`); }
  assert.ok(sizes.grand && sizes.vast, JSON.stringify(sizes));
});
test('solver: over 400 Pentagons every chamber, key, shard, lever, trial, keeper, sealed chamber and the vault is reached on foot', () => {
  for (const { seed, P } of plans(400, 'S')) {
    const all = solveAdventurePlan(P); for (const q of P.nodes) assert.ok(all.reached.has(q.id), `${seed}: ${q.id} reached`);
    for (const f of [0, 1, 2, 3, 4]) assert.ok(all.reached.has(`c${f}`)); assert.ok(all.reached.has('central'));
    const noSeal = solveAdventurePlan(P, { noSigil: true }); // the way to the end never needs the Regent's own Seal
    assert.ok(noSeal.reached.has(`h${P.nh - 1}`), `${seed}: the vault`); for (const t of P.trials) assert.ok(noSeal.reached.has(t), `${seed}: trial ${t}`);
    for (const L of P.levers) assert.ok(noSeal.reached.has(`c${L.f}`)); assert.equal(P.trials.length, AP.trials);
    for (const q of P.nodes) if (q.shard) assert.ok(noSeal.reached.has(q.id), `${seed}: shard in ${q.id}`);
    assert.ok(P.trials.every((t) => P.adventure.districts.some((D) => D.deep === t)), 'a trial in a district keep');
    assert.ok(P.plateE && P.nodes.find((q) => q.id === P.plateE.a).kind === 'district', `${seed}: a plate door in a district`); }
});

// ------------------------------------------------------------------------------------------------ the chambers
test('v11 chambers: in their caps, every door, object and creature reachable on foot from the way in; drops and columns never cut a way', () => {
  const counts = { areas: 0, cache: 0, vista: 0 };
  for (const { seed, P } of plans(30, 'C')) for (const q of P.nodes) { const m = chamber(seed, P, q), W = m.width, seen = flood(m); counts.areas++;
    assert.ok(W <= AP.maxArea.w && m.height <= AP.maxArea.h && W * m.height <= AP.maxArea.tiles, `${seed} ${q.id}: ${W}x${m.height}`);
    for (const o of [...m.objects, ...m.enemySpawns]) { const way = o.kind === 'exit' || o.kind === 'buildingStair';
      assert.ok(way ? N4.some(([dx, dy]) => seen.has((o.y + dy) * W + o.x + dx)) || seen.has(o.y * W + o.x) : seen.has(Math.round(o.y) * W + Math.round(o.x)), `${seed} ${q.id}: ${o.kind || 'creature'} ${o.id} reachable`); }
    assert.equal(m.building.adventure.theme, q.theme || 'tomb'); assert.ok(m.enemySpawns.length <= 8, `${seed} ${q.id}: ${m.enemySpawns.length} placed`);
    if (q.kind === 'waystone') { assert.equal(m.enemySpawns.length, 0, 'the Waystone hall is quiet'); assert.ok(m.objects.some((o) => o.kind === 'pentWaystone')); }
    if (q.waystone === 2) assert.ok(m.objects.some((o) => o.kind === 'pentWaystone' && o.waystone === 2));
    if (q.area === 'vista') { counts.vista++; assert.ok(m.objects.some((o) => o.kind === 'advVista')); assert.ok(m.tiles.some((t) => t.hallVoid), 'a vista looks out over a drop'); }
    if (q.side) { counts.cache++; assert.ok(m.objects.some((o) => o.advCache), `${seed} ${q.id}: a side area pays`); }
    if (q.area) for (const t of m.tiles) assert.ok(t.blocked || !t.hallVoid); }
  assert.ok(counts.areas > 2000 && counts.vista > 100 && counts.cache > 30, JSON.stringify(counts));
});
test('v11 chambers are deterministic, themed and named for their ward', () => {
  const { seed, P } = plans(1, 'Z')[0];
  for (const q of P.nodes.slice(0, 40)) { const a = chamber(seed, P, q), b = chamber(seed, P, q); assert.equal(JSON.stringify(a), JSON.stringify(b));
    const T = ADVENTURE_THEMES[q.theme || 'tomb']; if (q.area) assert.ok(a.tiles.some((t) => t.kind === T.tiles.wall || t.kind === T.tiles.under), `${q.id} in ${T.name}'s stone`);
    if (q.kind === 'district') assert.ok(a.name.includes(P.adventure.districts[q.district].ward)); }
  const L = layAdventureArea('k', 'street', 47, 39, [{ x: 0, y: 9, inner: { x: 1, y: 9 } }, { x: 46, y: 21, inner: { x: 45, y: 21 } }], { x: 1, y: 9 });
  assert.equal(L.grid.length, 47 * 39); assert.deepEqual(layAdventureArea('k', 'street', 47, 39, [{ x: 0, y: 9, inner: { x: 1, y: 9 } }, { x: 46, y: 21, inner: { x: 45, y: 21 } }], { x: 1, y: 9 }), L);
});

// ------------------------------------------------------------------------------------------------ the camera's room
test('the camera: the wide boom fits behind the Wayfarer on a walking line across most of every open area; cramped ones are named exceptions', () => {
  const C = AP.camera, by = {}; let clear = 0, walkable = 0;
  assert.deepEqual(C.cramped, ['undercroft', 'side']); assert.ok(C.boom >= 5 && C.pad > 0);
  for (const { seed, P } of plans(8, 'K')) for (const q of P.nodes) { if (!q.area || C.cramped.includes(q.area)) continue; const r = adventureCameraClearance(chamber(seed, P, q));
    (by[q.area] ||= [0, 0]); by[q.area][0] += r.clear; by[q.area][1] += r.walkable; clear += r.clear; walkable += r.walkable; }
  assert.ok(clear / walkable >= C.share, `open areas: ${(clear / walkable).toFixed(2)} of walkable tiles clear`);
  for (const [a, [c, w]] of Object.entries(by)) assert.ok(c / w >= C.least, `${a}: ${(c / w).toFixed(2)} clear`);
  assert.ok(Object.keys(by).length >= 7, Object.keys(by).join(' '));
  // a straight corridor (the boom keeps a third of a tile off each wall) is clear where five tiles run on both ways; a small room nowhere
  const room = (W, H, open) => ({ width: W, height: H, tiles: Array.from({ length: W * H }, (_, k) => ({ x: k % W, y: (k / W) | 0, blocked: !open(k % W, (k / W) | 0) })) });
  assert.equal(adventureCameraClearance(room(30, 9, (x, y) => y === 4 && x > 0 && x < 29)).clear, 18, 'a long corridor: clear where five tiles run on both ways');
  assert.equal(adventureCameraClearance(room(9, 9, (x, y) => x > 0 && y > 0 && x < 8 && y < 8)).clear, 0, 'a small room: none');
});

// ------------------------------------------------------------------------------------------------ in the game
const enterHub = () => { const s = freshSave(); s.seed = 'TIM1'; const g = new Game(s, 0); let site = null;
  for (let cx = -64; cx <= 64 && !site; cx += PENTAGON.every) for (let cy = -64; cy <= 64 && !site; cy += PENTAGON.every) if (g.pentagonHere(cx, cy)) site = { cx, cy };
  g.rx = site.cx; g.ry = site.cy + 1; g.loadArea('overworld', false); const P = pentagonPlan(s.seed, site.cx, site.cy, g.map.pentagon.V), hub = P.nodes.find((q) => q.id === 'w0');
  s.session.activeDungeonId = `${P.base}:f${hub.n + 1}`; s.session.dungeonReturn = { rx: g.rx, ry: g.ry, x: 16, y: 16 }; g.loadArea('dungeon', false); return { s, g, P, hub }; };
test('the Waystone: a rest heals and records the rest point; a fall anywhere in the Pentagon wakes you there; the save keeps it', () => {
  const { s, g, P } = enterHub(), ws = g.map.objects.find((o) => o.kind === 'pentWaystone'); g.player.x = ws.x; g.player.y = ws.y; g.player.hp = 1;
  const r = g.interact('rest', ws.id); assert.ok(r.ok); assert.equal(g.player.hp, s.maxHp); const H = s.consequences.dungeons[`${P.base}:f1`]; assert.deepEqual(H.advRest, { id: g.areaId(), x: ws.x, y: ws.y, name: ws.name });
  const door = g.map.objects.find((o) => o.kind === 'buildingStair' && !o.barred); g.player.x = door.x; g.player.y = door.y; g.interact(null, door.id); assert.notEqual(g.areaId(), H.advRest.id);
  g.player.hp = 0; g.resolveDeath(1000, { reset() {} }); assert.equal(g.area, 'dungeon'); assert.equal(g.areaId(), H.advRest.id); assert.match(g.message, /Waystone/); assert.equal(g.player.hp, s.maxHp);
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(back.consequences.dungeons[`${P.base}:f1`].advRest, H.advRest, 'additive at schema 14');
  const g2 = new Game(back, 0); g2.loadArea('dungeon', false); assert.equal(g2.areaId(), H.advRest.id, 'exact resume inside the adventure');
});
test('a fall with no Waystone rested at still wakes at the overworld checkpoint, as in every older Pentagon', () => {
  const { g } = enterHub(); g.player.hp = 0; g.resolveDeath(1000, { reset() {} }); assert.equal(g.area, 'overworld');
});
test('a district keep opens its shortcut back to the Waystone from the keep side only, once and for good', () => {
  const { s, g, P } = enterHub(), D = P.adventure.districts[0], keep = P.nodes.find((q) => q.id === D.deep);
  const barred = g.map.objects.find((o) => o.barred && o.toId === `${P.base}:f${keep.n + 1}`); assert.ok(barred && barred.advShortcut); g.player.x = barred.x; g.player.y = barred.y;
  assert.equal(g.interact(null, barred.id).ok, false, 'barred from the hall'); s.session.activeDungeonId = `${P.base}:f${keep.n + 1}`; g.loadArea('dungeon', false);
  const gate = g.map.objects.find((o) => o.shortcutOpens === `adv:${D.id}`); g.player.x = gate.x; g.player.y = gate.y; const r = g.interact(null, gate.id); assert.ok(r.ok); assert.equal(g.message, 'The way back to the Waystone opens, and stays open.');
  assert.ok(s.consequences.dungeons[`${P.base}:f1`].labOpen.includes(`adv:${D.id}`)); const there = g.map.objects.find((o) => o.shortcutKey === `adv:${D.id}`); assert.ok(there.opened, 'open from the hall now');
});
test('a vista: looking out names the landmark and journals it once', () => {
  const { s, g, P } = enterHub(), q = P.nodes.find((n) => n.area === 'vista'); s.session.activeDungeonId = `${P.base}:f${q.n + 1}`; g.loadArea('dungeon', false);
  const v = g.map.objects.find((o) => o.kind === 'advVista'); g.player.x = v.x; g.player.y = v.y; const r = g.interact('look', v.id); assert.ok(r.ok); assert.equal(g.message, ADVENTURE_THEMES[q.theme].landmark.lore);
});
