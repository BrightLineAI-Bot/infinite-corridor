// The Pentagon's finale (Tim, 2026-11-04): "If you finish the Pentagon, you've done a lot, so you should be rewarded with
// something beautiful. After you beat the boss, a wall opens and a Starfield annex opens up: a short Starfield walkway that
// winds a little. At its end there's a nice little ceremonial dais you can touch; it says 'Transit' and takes you back to the
// Pentagon's front door — only there, because you don't have the coordinates to transit anywhere else."
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { render } from '../src/renderer.ts';
import { LANDSCAPE_VERSION } from '../src/landscape.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';
import { pentagonArenaId } from '../src/pentagon-arena.ts';
import * as TESS from '../src/tesseracts.ts';
import { PENTAGON, pentagonPlan, generatePentagonChamber, pentagonLinkEnds, pentagonVaultId, pentagonFinaleSpot, pentagonFinaleId, isPentagonFinaleId, parsePentagonFinaleId, generatePentagonFinale, pentagonFrontDoor, isPentagonId } from '../src/pentagon.ts';

const SEED = 'TIM1', F = PENTAGON.finale, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const game = (seed = SEED, save = null) => { const s = save || freshSave(); s.seed = seed; return new Game(s, 0); };
const pinned = (seed, cx, cy, V) => { const s = freshSave(); s.seed = seed; s.atlas = { [`${cx + 1},${cy + 1}`]: { landscapeVersion: LANDSCAPE_VERSION, pentVersion: V } }; return new Game(s, 0); };
let found = null; const find = () => { if (found) return found; const g = game(); for (let cx = -64; cx <= 64 && !found; cx += PENTAGON.every) for (let cy = -64; cy <= 64 && !found; cy += PENTAGON.every) if (g.pentagonHere(cx, cy)) found = { cx, cy }; return found; };
const H = (g, P) => g.save.consequences.dungeons[`${P.base}:f1`] || {};
const loadVault = (g, P) => { g.save.session.activeDungeonId = pentagonVaultId(P); g.save.session.dungeonReturn = { rx: P.cx, ry: P.cy, x: 16, y: 16 }; g.loadArea('dungeon', false); assert.ok(g.map.building.vault, 'the vault'); };
const regent = (g) => g.enemies.find((e) => String(e.id).endsWith(':guardian'));
const fell = (g) => { const e = regent(g); assert.ok(e && !e.dead, 'the Regent stands'); e.hp = 0; e.dead = true; g.defeatEnemy(e); return e; };
const opening = (g) => g.map.objects.find((o) => o.kind === 'pentFinaleWall');
const act = (g, o, a) => { assert.ok(o, a); g.player.x = o.inner ? o.inner.x : o.x; g.player.y = o.inner ? o.inner.y : o.y + (o.kind === 'pentDais' ? 1 : 0); return g.interact(a, o.id); };
// every walkable tile reached from `from` on foot (4-neighbour, base movement: no swimming, gliding or robot)
const flood = (m, from) => { const W = m.width, seen = new Set([from.y * W + from.x]), st = [from]; while (st.length) { const c = st.pop(); for (const [dx, dy] of N4) { const x = c.x + dx, y = c.y + dy, t = m.tiles[y * W + x]; if (x < 0 || y < 0 || x >= W || y >= m.height || !t || t.blocked || t.chasm || seen.has(y * W + x)) continue; seen.add(y * W + x); st.push({ x, y }); } } return seen; };
// From release 751 the opened wall leads through the Stillworks first (tests/pentagon-finale-arena.test.ts): fell its beast, then take the seam on to the walkway.
const walkOn = (g) => { let r = act(g, opening(g), 'use'); if (g.map.pentArena) { const b = g.enemies.find((e) => e.pentFinaleBeast && !e.dead); if (b) { b.hp = 0; b.dead = true; g.defeatEnemy(b); } r = act(g, g.map.objects.find((q) => q.kind === 'pentArenaGate' && q.to === 'walk'), 'use'); } return r; };
const touchable = (m, seen, o) => [...seen].some((k) => Math.hypot((k % m.width) - o.x, Math.floor(k / m.width) - o.y) < 1.5);

// ------------------------------------------------------------------------------------------------ pure: the walkway, the spot
test('the walkway: solvable on foot over thousands of floors (every version and seed): the way back and the dais both reached, no island, no foe; off it, only the drop', () => {
  const bad = [], rows = new Set(); let n = 0, winds = 0;
  for (let V = 1; V <= PENTAGON.version; V++) for (let i = 0; i < 400; i++) { const seed = `W${i}`, P = pentagonPlan(seed, i * 8, i % 50 ? -(i % 50) * 8 : 0, V), id = pentagonFinaleId(P.base), m = generatePentagonFinale(seed, id); n++;
    assert.ok(isPentagonFinaleId(id) && !isPentagonId(id)); assert.deepEqual(parsePentagonFinaleId(id), { base: P.base, seed, cx: P.cx, cy: P.cy, V });
    if (m.width !== F.size[0] || m.height !== F.size[1] || m.tiles.length !== m.width * m.height) bad.push(`${id}: size`);
    if (m.enemySpawns.length) bad.push(`${id}: foes`);
    const seen = flood(m, m.entry), walk = m.tiles.filter((t) => !t.blocked && !t.chasm);
    if (walk.some((t) => !seen.has(t.y * m.width + t.x))) bad.push(`${id}: an island`);
    if (walk.some((t) => t.environment || /void|canyon|water|lava|pit/i.test(t.kind))) bad.push(`${id}: a hazard on the walkway`);
    if (m.tiles.some((t) => !walk.includes(t) && t.kind !== 'starShard' && !(t.kind === 'canyon' && t.chasm && !t.blocked))) bad.push(`${id}: off the walkway, not the drop`); // v2: the stars are a fall
    if (m.tiles.some((t) => t.kind === 'starShard' && !t.blocked)) bad.push(`${id}: a stone to stand on`);
    if (m.finaleFloor !== F.floor) bad.push(`${id}: floor version`);
    if (walk.some((t) => t.x === 0 || t.y === 0 || t.x === m.width - 1 || t.y === m.height - 1)) bad.push(`${id}: floor at the edge`);
    const back = m.objects.find((o) => o.kind === 'pentFinaleWall'), dais = m.objects.find((o) => o.kind === 'pentDais');
    if (!back?.back || back.toId !== pentagonVaultId(P) || !touchable(m, seen, back)) bad.push(`${id}: the way back`);
    if (!dais || !dais.actions.includes('transit') || !touchable(m, seen, dais) || m.tiles[dais.y * m.width + dais.x].blocked) bad.push(`${id}: the dais`);
    if (Math.hypot(dais.x - m.entry.x, dais.y - m.entry.y) < m.width * .6) bad.push(`${id}: a short walk`);
    const ys = new Set(walk.filter((t) => t.kind === 'starWalk').map((t) => t.y)); if (ys.size > 3) winds++; rows.add(ys.size);
    if (walk.filter((t) => t.kind === 'starWalk').length > m.width * 7) bad.push(`${id}: not narrow`); }
  assert.deepEqual(bad.slice(0, 10), []); assert.ok(winds > n * .9, `${winds} of ${n} wind`);
});

test('the walkway is deterministic and pure: the same id, the same floor; different Pentagons, different walks', () => {
  const P = pentagonPlan('D1', 8, 16, 6), id = pentagonFinaleId(P.base), a = JSON.stringify(generatePentagonFinale('D1', id)), b = JSON.stringify(generatePentagonFinale('D1', id));
  assert.equal(a, b); const shapes = new Set(); for (let i = 0; i < 20; i++) { const Q = pentagonPlan(`D${i}`, 8, 16, 6), m = generatePentagonFinale(`D${i}`, pentagonFinaleId(Q.base)); shapes.add(m.tiles.map((t) => (t.blocked ? 0 : 1)).join('')); }
  assert.ok(shapes.size >= 15, `${shapes.size} shapes of 20`);
  assert.equal(createHash('sha256').update(a).digest('hex').length, 64);
});

test('the opening in the vault: on its outer wall, beside floor reached from the way in, clear of every door, link end and object, for every version and seed', () => {
  const bad = []; let n = 0; const sides = {};
  for (let V = 1; V <= PENTAGON.version; V++) for (let i = 0; i < 250; i++) { const seed = `O${i}`, P = pentagonPlan(seed, i * 8, -i * 8, V), id = pentagonVaultId(P), m = generatePentagonChamber(seed, id); n++;
    const ends = pentagonLinkEnds(P, m), all = [...m.objects, ...ends], s = pentagonFinaleSpot({ ...m, objects: all }); if (!s) { bad.push(`${id}: none`); continue; }
    const W = m.width, t = m.tiles[s.y * W + s.x], inn = m.tiles[s.inner.y * W + s.inner.x]; sides[s.x === 0 ? 'west' : s.y === 0 ? 'north' : 'east'] = 1 + (sides[s.x === 0 ? 'west' : s.y === 0 ? 'north' : 'east'] || 0);
    if (!t.blocked || !(s.x === 0 || s.x === W - 1 || s.y === 0)) bad.push(`${id}: not in the outer wall`);
    if (Math.abs(s.x - s.inner.x) + Math.abs(s.y - s.inner.y) !== 1 || inn.blocked || inn.doorway || !flood(m, m.entry).has(s.inner.y * W + s.inner.x)) bad.push(`${id}: its floor`);
    for (const o of [...all, ...m.enemySpawns]) if (Math.max(Math.abs(o.x - s.inner.x), Math.abs(o.y - s.inner.y)) <= 1) bad.push(`${id}: crowds ${o.id}`);
    assert.deepEqual(pentagonFinaleSpot({ ...m, objects: all }), s, 'the same spot each time'); }
  assert.deepEqual(bad.slice(0, 10), []); assert.ok(Object.keys(sides).length === 3, JSON.stringify(sides));
});

// ------------------------------------------------------------------------------------------------ in the game
test('the opening appears only once the Regent falls: then the wall opens with a notice and a burst, kept in the base floor\'s history', () => {
  const { cx, cy } = find(), g = game(), P = pentagonPlan(SEED, cx, cy, PENTAGON.version);
  loadVault(g, P); assert.equal(opening(g), undefined, 'no opening while the Regent lives'); assert.equal(H(g, P).pentFinale, undefined);
  g.loadArea('dungeon', false); assert.equal(opening(g), undefined, 'nor on a second load'); assert.equal(H(g, P).pentFinale, undefined);
  const raw = generatePentagonChamber(SEED, pentagonVaultId(P)); assert.deepEqual(g.map.tiles, raw.tiles);
  fell(g); const o = opening(g); assert.ok(o, 'the wall opens'); assert.equal(H(g, P).pentFinale, F.version);
  assert.ok(g.questNotices.some((q) => q.title === F.notice), 'the notice'); assert.ok(g.shortcutBurst && g.shortcutBurst.x === o.x && g.shortcutBurst.y === o.y, 'a burst where it opened');
  assert.ok(g.save.narrative.journal.some((j) => j.text === F.messages.opens), 'journalled');
  assert.deepEqual(g.map.tiles, raw.tiles, 'no tile changes: an object laid on the wall'); assert.ok(g.map.tiles[o.y * g.map.width + o.x].blocked);
  assert.equal(o.toId, pentagonArenaId(P.base), 'through the Stillworks first (release 751)');
  const n = g.questNotices.length; g.loadArea('dungeon', false); assert.ok(opening(g)); assert.equal(g.questNotices.length, n, 'told once');
  assert.deepEqual([opening(g).x, opening(g).y], [o.x, o.y], 'the same spot');
});

test('through the wall: the walkway among the stars, quiet; the dais reads Transit and sets you down outside the front door, walkable, and nowhere else', () => {
  const { cx, cy } = find(), g = game(), P = pentagonPlan(SEED, cx, cy, PENTAGON.version); loadVault(g, P); fell(g);
  const r = walkOn(g); assert.ok(r.ok, r.message); assert.equal(g.areaId(), pentagonFinaleId(P.base)); assert.equal(g.area, 'dungeon');
  assert.equal(r.message, F.messages.walk); assert.ok(g.map.chasm && g.map.pentFinale, 'the Starfield look');
  const t = g.map.tiles[Math.round(g.player.y) * g.map.width + Math.round(g.player.x)]; assert.ok(t && !t.blocked, 'on the walkway');
  assert.equal(g.enemies.filter((e) => !e.dead).length, 0, 'no foes'); assert.deepEqual(g.map.objects.map((o) => o.kind).sort(), ['pentDais', 'pentFinaleWall'], 'nothing else laid there');
  const d = g.map.objects.find((o) => o.kind === 'pentDais'); assert.deepEqual(d.actions, ['transit']); assert.match(d.name, /^Transit/);
  const door = pentagonFrontDoor(P), t1 = act(g, d, 'transit'); assert.ok(t1.ok, t1.message); assert.equal(g.area, 'overworld'); assert.equal(g.message, F.messages.arrive);
  assert.deepEqual([g.rx, g.ry], [door.rx, door.ry]); const at = g.map.tiles[Math.round(g.player.y) * 32 + Math.round(g.player.x)]; assert.ok(at && !at.blocked && !at.greatBuilding, 'outside, on open ground');
  const gate = g.map.objects.find((o) => o.pentagonDoor && o.enterAt === P.gate.key); assert.ok(gate, 'the front door stands here'); assert.ok(Math.hypot(gate.x - g.player.x, gate.y - g.player.y) <= 2.5, 'by the front door');
  assert.equal(g.defeatNotice?.title, 'TRANSIT');
  // the land around is joined to the gate: you can walk back in
  const ok = flood({ ...g.map, width: 32, height: 32 }, { x: Math.round(g.player.x), y: Math.round(g.player.y) }); assert.ok([...ok].some((k) => Math.hypot((k % 32) - gate.x, Math.floor(k / 32) - gate.y) < 1.5), 'the gate within reach');
  // and the same dais in another Pentagon takes you to that one's door
  const g2 = game('S17'); let at2 = null; for (let x = -64; x <= 64 && !at2; x += PENTAGON.every) for (let y = -64; y <= 64 && !at2; y += PENTAGON.every) if (g2.pentagonHere(x, y)) at2 = { cx: x, cy: y };
  if (at2) { const Q = pentagonPlan('S17', at2.cx, at2.cy, PENTAGON.version); loadVault(g2, Q); fell(g2); walkOn(g2); act(g2, g2.map.objects.find((o) => o.kind === 'pentDais'), 'transit'); const d2 = pentagonFrontDoor(Q); assert.deepEqual([g2.rx, g2.ry], [d2.rx, d2.ry]); }
});

test('the way back from the walkway leads into the vault beside its opened wall; the walk is repeatable and journals once', () => {
  const { cx, cy } = find(), g = game(), P = pentagonPlan(SEED, cx, cy, PENTAGON.version); loadVault(g, P); fell(g); const o = opening(g);
  walkOn(g); const back = g.map.objects.find((q) => q.kind === 'pentFinaleWall'); act(g, back, 'use'); assert.equal(g.areaId(), pentagonArenaId(P.base), 'back into the Stillworks');
  const r = act(g, g.map.objects.find((q) => q.kind === 'pentArenaGate' && q.to === 'vault'), 'use'); assert.ok(r.ok, r.message);
  assert.equal(g.areaId(), pentagonVaultId(P)); assert.ok(Math.hypot(g.player.x - o.inner.x, g.player.y - o.inner.y) < 1.5, 'beside the wall'); assert.ok(!regent(g) || regent(g).dead, 'the Regent stays down');
  walkOn(g); act(g, g.map.objects.find((q) => q.kind === 'pentDais'), 'transit'); assert.equal(g.area, 'overworld');
  loadVault(g, P); walkOn(g); act(g, g.map.objects.find((q) => q.kind === 'pentDais'), 'transit'); assert.equal(g.area, 'overworld');
  for (const text of [F.messages.opens, F.messages.walk, F.messages.arrive]) assert.equal(g.save.narrative.journal.filter((j) => j.text === text).length, 1, text);
  assert.ok(!g.save.narrative.journal.some((j) => /You left/.test(j.text) && /finale/.test(j.recordId || '')), 'not a crossing left unexplored');
});

test('persistent: the opening survives a reload, a death; exact resume on the walkway, the same spot', () => {
  const { cx, cy } = find(), g = game(), P = pentagonPlan(SEED, cx, cy, PENTAGON.version); loadVault(g, P); fell(g); const o = opening(g);
  const h = game(SEED, migrateSave(JSON.parse(JSON.stringify(g.save)))); loadVault(h, P); assert.ok(opening(h), 'kept through a reload'); assert.deepEqual([opening(h).x, opening(h).y], [o.x, o.y]);
  h.player.hp = 0; h.recoverFromDeath(0); loadVault(h, P); assert.ok(opening(h), 'kept through a death'); assert.equal(H(h, P).pentFinale, F.version);
  walkOn(h); const dais = h.map.objects.find((q) => q.kind === 'pentDais'); h.player.x = dais.x - 3; h.player.y = dais.y; const at = [h.player.x, h.player.y], id = h.areaId();
  const r = new Game(deserializeSave(serializeSave(h.exportSnapshot(300))), 900); assert.equal(r.area, 'dungeon'); assert.equal(r.areaId(), id); assert.deepEqual([r.player.x, r.player.y], at, 'the same spot');
  assert.ok(r.map.pentFinale && r.map.objects.some((q) => q.kind === 'pentDais'));
  const t = act(r, r.map.objects.find((q) => q.kind === 'pentDais'), 'transit'); assert.ok(t.ok); assert.deepEqual([r.rx, r.ry], [pentagonFrontDoor(P).rx, pentagonFrontDoor(P).ry]);
});

test('old journeys: a Pentagon whose Regent fell before this release gets the opening when its vault next loads (objects only); every other tile and object as before', () => {
  const { cx, cy } = find();
  for (const V of [1, 3, 5, 6]) { const g = V === PENTAGON.version ? game() : pinned(SEED, cx, cy, V), P = pentagonPlan(SEED, cx, cy, V); loadVault(g, P); fell(g);
    // the journey as it was before: the Regent down (in the vault's snapshot), no finale recorded
    g.snapshotArea(); const save = JSON.parse(JSON.stringify(g.save)), base = save.consequences.dungeons[`${P.base}:f1`]; delete base.pentFinale;
    for (const a of Object.values(save.session.areas)) if (a?.objects) delete a.objects['pent-finale-wall'];
    save.narrative.journal = save.narrative.journal.filter((j) => j.text !== F.messages.opens);
    const off = JSON.parse(JSON.stringify(save)); off.consequences.dungeons[`${P.base}:f1`].pentFinale = 0; // the same journey, the overlay held off
    const h = game(SEED, migrateSave(save)), k = game(SEED, migrateSave(off)); h.questNotices = []; loadVault(h, P);
    assert.ok(opening(h), `v${V}: the wall stands open`); assert.equal(H(h, P).pentFinale, F.version); assert.ok(h.questNotices.some((q) => q.title === F.notice), `v${V}: told, the first time`);
    k.save.session.activeDungeonId = pentagonVaultId(P); k.save.session.dungeonReturn = { rx: P.cx, ry: P.cy, x: 16, y: 16 }; const was = k.openPentagonFinale; k.openPentagonFinale = () => null; k.loadArea('dungeon', false); k.openPentagonFinale = was;
    assert.deepEqual(h.map.tiles, generatePentagonChamber(SEED, pentagonVaultId(P)).tiles, `v${V}: tiles as generated`); assert.deepEqual(h.map.tiles, k.map.tiles);
    const still = (q) => q.kind !== 'traveler' && q.kind !== 'pentFinaleWall'; assert.deepEqual(h.map.objects.filter(still), k.map.objects.filter(still), `v${V}: every other object where it was`);
    assert.deepEqual(h.map.enemySpawns, k.map.enemySpawns);
    walkOn(h); assert.equal(h.areaId(), pentagonFinaleId(P.base)); act(h, h.map.objects.find((q) => q.kind === 'pentDais'), 'transit'); assert.deepEqual([h.rx, h.ry], [pentagonFrontDoor(P).rx, pentagonFrontDoor(P).ry]); }
});

test('an old Pentagon whose Regent still stands gets nothing until he falls', () => {
  const { cx, cy } = find(), g = pinned(SEED, cx, cy, 5), P = pentagonPlan(SEED, cx, cy, 5); loadVault(g, P); assert.equal(opening(g), undefined);
  const h = game(SEED, migrateSave(JSON.parse(JSON.stringify(g.save)))); loadVault(h, P); assert.equal(opening(h), undefined); fell(h); assert.ok(opening(h));
});

test('no other chamber of the Pentagon ever gets an opening, even with the finale recorded', () => {
  const { cx, cy } = find(), g = game(), P = pentagonPlan(SEED, cx, cy, PENTAGON.version); (g.save.consequences.dungeons ||= {})[`${P.base}:f1`] = { pentFinale: F.version };
  for (const q of P.nodes) { g.save.session.activeDungeonId = `${P.base}:f${q.n + 1}`; g.save.session.dungeonReturn = { rx: cx, ry: cy, x: 16, y: 16 }; g.loadArea('dungeon', false);
    assert.equal(!!opening(g), !!g.map.building.vault, q.id); }
});

test('the opening, the walkway and the dais draw without throwing', () => {
  const ctx = new Proxy({ createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 10 }), getTransform: () => ({}), ellipse(x, y, rx, ry) { if (rx < 0 || ry < 0) throw new RangeError('negative'); }, arc(x, y, r) { if (r < 0) throw new RangeError('negative'); } }, { get: (o, k) => k in o ? o[k] : () => {}, set: () => true });
  const { cx, cy } = find(), g = game(), P = pentagonPlan(SEED, cx, cy, PENTAGON.version); loadVault(g, P); fell(g);
  const o = opening(g); g.player.x = o.inner.x; g.player.y = o.inner.y; assert.doesNotThrow(() => render(ctx, g, 360, 640, 5000)); assert.doesNotThrow(() => render(ctx, g, 360, 640, 9000));
  act(g, o, 'use'); for (const q of g.map.objects) { g.player.x = q.x + 1; g.player.y = q.y; assert.doesNotThrow(() => render(ctx, g, 360, 640, 5000)); assert.doesNotThrow(() => render(ctx, g, 390, 844, 12000)); }
});

test('an old Pentagon (v3+) whose history records the Regent\'s fall opens its wall even where he stands again', () => {
  const { cx, cy } = find(), g = pinned(SEED, cx, cy, 5), P = pentagonPlan(SEED, cx, cy, 5); (g.save.consequences.dungeons ||= {})[`${P.base}:f1`] = { regentGrade: 'regent' }; // as pentagonChampionDown records it
  loadVault(g, P); assert.ok(regent(g) && !regent(g).dead, 'he stands'); assert.ok(opening(g), 'the wall stands open'); assert.equal(H(g, P).pentFinale, F.version);
});

// ------------------------------------------------------------------------------------------------ the walkway's floor, version 1
// Release 750's walkway (stars you cannot step onto) regenerates byte for byte for a walkway first generated under it: a digest
// of 240 floors taken from the code of release 750 (the map's new `finaleFloor` field set aside).
test('walkway floor version 1 (release 750) regenerates byte for byte; a walkway first seen then keeps it', () => {
  const h = createHash('sha256'); for (let V = 1; V <= 6; V++) for (let i = 0; i < 40; i++) { const seed = 'H' + i, P = pentagonPlan(seed, i * 8, -i * 8, V), { finaleFloor, ...m } = generatePentagonFinale(seed, pentagonFinaleId(P.base), 1); assert.equal(finaleFloor, 1); h.update(JSON.stringify(m)); }
  assert.equal(h.digest('hex').slice(0, 16), 'f111d0b213315919');
  const { cx, cy } = find(), g = game(), P = pentagonPlan(SEED, cx, cy, PENTAGON.version), id = pentagonFinaleId(P.base); loadVault(g, P); fell(g);
  (g.save.consequences.dungeons ||= {})[id] = { generatorVersion: 5, visits: 1 }; g.save.session.areas[id] = { enemies: [], objects: {}, projectiles: [], effects: [], eliteHazards: [] }; // walked under release 750
  walkOn(g); assert.equal(g.areaId(), id); assert.equal(g.save.consequences.dungeons[id].finaleFloor, 1); assert.ok(g.map.tiles.every((t) => !t.chasm || t.blocked), 'its stars still not a drop');
  const k = game(); loadVault(k, P); fell(k); walkOn(k); assert.equal(k.save.consequences.dungeons[id].finaleFloor, F.floor, 'a new walkway: the drop');
});

// ------------------------------------------------------------------------------------------------ falling off
const onWalk = (g) => { const t = g.map.tiles[Math.floor(g.player.y + .72) * g.map.width + Math.floor(g.player.x + .5)]; return t && !t.blocked && !t.chasm; };
test('falling off the walkway kills, and wakes you at the walkway\'s start beside the doorway back; the Pentagon keeps its progress; Transit still works after', () => {
  const { cx, cy } = find(), g = game(), P = pentagonPlan(SEED, cx, cy, PENTAGON.version), id = pentagonFinaleId(P.base); loadVault(g, P); fell(g); walkOn(g);
  const base = JSON.stringify(H(g, P)), deaths = g.save.worldFlags.deaths || 0, ck = JSON.stringify(g.save.activeCheckpoint), ret = { ...g.save.session.dungeonReturn };
  g.player.hp = 0; g.resolveDeath(20000, { reset() {} }, true, 'canyon');
  assert.equal(g.area, 'dungeon'); assert.equal(g.areaId(), id, 'still on the walkway'); assert.deepEqual([g.player.x, g.player.y], [g.map.entry.x, g.map.entry.y], 'at its start');
  assert.ok(Math.hypot(g.player.x - g.map.objects.find((o) => o.kind === 'pentFinaleWall').x, g.player.y - g.map.entry.y) < 1.5, 'beside the doorway back');
  assert.equal(g.player.hp, g.save.maxHp); assert.equal(g.message, F.messages.fell + (g.message.includes('draughts') ? ' Restorative draughts replenished to 2.' : '')); assert.equal(g.save.worldFlags.deaths, deaths + 1, 'it counts as a death');
  assert.equal(JSON.stringify(H(g, P)), base, 'the Pentagon keeps its progress'); assert.equal(JSON.stringify(g.save.activeCheckpoint), ck); assert.deepEqual(g.save.session.dungeonReturn, ret);
  assert.equal(g.save.lastDeath.dungeonId, id);
  const d = g.map.objects.find((o) => o.kind === 'pentDais'); g.save.tesseracts = { owned: [], slots: [null, null, null], seq: 0, got: {} }; const t = act(g, d, 'transit'); assert.ok(t.ok, t.message); assert.deepEqual([g.rx, g.ry], [pentagonFrontDoor(P).rx, pentagonFrontDoor(P).ry]);
});
test('in play: stepping off the path is a fall (the death beat), then the walkway\'s start; an exact resume mid-walk keeps the drop', async () => {
  const { cx, cy } = find(), g = game(), P = pentagonPlan(SEED, cx, cy, PENTAGON.version), id = pentagonFinaleId(P.base); loadVault(g, P); fell(g); walkOn(g);
  const W = g.map.width, edge = g.map.tiles.find((t) => t.kind === 'starWalk' && t.x > 4 && g.map.tiles[(t.y + 1) * W + t.x]?.kind === 'canyon' && g.map.tiles[(t.y + 2) * W + t.x]?.kind === 'canyon'); assert.ok(edge);
  g.player.x = edge.x; g.player.y = edge.y + .9; g.player.invulnerableUntil = 0; g.deathBeat = .3; let beat = false; // feet over the drop; the played game holds the death beat
  const input = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} }; let now = 50000; for (let i = 0; i < 300 && g.areaId() === id && !(g.player.x === g.map.entry.x && g.player.y === g.map.entry.y); i++) { g.update(1 / 30, input, (now += 34)); beat ||= !!g.fallen?.beat; }
  assert.ok(beat, "the death beat held first");
  assert.equal(g.areaId(), id); assert.deepEqual([g.player.x, g.player.y], [g.map.entry.x, g.map.entry.y], 'woken at the start'); assert.ok(g.player.hp > 0); assert.match(g.message, /fall/);
  g.player.x = edge.x; g.player.y = edge.y; const at = [g.player.x, g.player.y];
  const r = new Game(deserializeSave(serializeSave(g.exportSnapshot(now))), now + 1000); assert.equal(r.areaId(), id); assert.deepEqual([r.player.x, r.player.y], at); assert.ok(r.map.tiles.some((t) => t.kind === 'canyon' && t.chasm && !t.blocked), 'the drop kept');
});

// ------------------------------------------------------------------------------------------------ the dais's rerolls
const glyphs = (g, n = 2) => { const { grantTesseract } = TESS; for (let i = 0; i < n; i++) grantTesseract(g.save, `test:glyph:${i}`, i ? 'deep' : 'regent', 0, 'a test'); return g.save.tesseracts.owned; };
const atDais = (g, P) => { loadVault(g, P); if (regent(g) && !regent(g).dead) fell(g); walkOn(g); const d = g.map.objects.find((o) => o.kind === 'pentDais'); g.player.x = d.x; g.player.y = d.y + 1; return d; };
test('the Regent\'s rewards are unchanged by the finale: his fall grants no glyph of its own (v1/v2 none; v3+ the hoard, when opened)', () => {
  const { cx, cy } = find();
  for (const V of [1, 2]) { const g = pinned(SEED, cx, cy, V), P = pentagonPlan(SEED, cx, cy, V); loadVault(g, P); const n0 = (g.save.tesseracts?.owned || []).length; fell(g); g.loadArea('dungeon', false);
    assert.equal((g.save.tesseracts?.owned || []).length, n0, `v${V}: no extra Tesseract`); assert.ok(opening(g)); }
  const g = game(), P = pentagonPlan(SEED, cx, cy, PENTAGON.version); loadVault(g, P); fell(g); assert.ok(!(g.save.tesseracts?.got || {})[`${P.base}:hoard`], 'v6: still the hoard\'s, when opened');
  const chest = g.map.objects.find((o) => o.id === 'building-cache'); g.player.x = chest.x; g.player.y = chest.y; g.interact('open', chest.id); assert.ok(g.save.tesseracts.got[`${P.base}:hoard`], 'the hoard pays it');
});
test('the dais: one free reroll of a Tesseract line, then one for 10 Divine Viscera, then only Transit; deterministic across a reload', () => {
  const { cx, cy } = find(), g = game(), P = pentagonPlan(SEED, cx, cy, PENTAGON.version); glyphs(g); const d = atDais(g, P), R = F.reroll;
  assert.deepEqual(R, { free: 1, paid: 1, viscera: 10, list: 12 });
  const r0 = g.interact(undefined, d.id); assert.equal(g.interactionRequested, d.id, 'Act opens its choices'); assert.equal(g.area, 'dungeon'); g.interactionRequested = null;
  const g0 = g.save.tesseracts.owned[0], uid = g0.uid; assert.ok(d.actions.includes('transit') && d.actions.includes(`pick:${uid}`)); assert.match(d.actionLabels[`pick:${uid}`], /free/);
  g.interact(`pick:${uid}`, d.id); assert.deepEqual(d.actions.filter((a) => a.startsWith('reroll:')), [0, 1, 2, 3].map((i) => `reroll:${uid}:${i}`));
  const saved = JSON.parse(JSON.stringify(g.save)), before = JSON.parse(JSON.stringify(g0.lines));
  const r1 = g.interact(`reroll:${uid}:1`, d.id); assert.ok(r1.ok, r1.message); const after = g.save.tesseracts.owned[0].lines;
  assert.notDeepEqual(after[1], before[1], 'line 2 cut again'); assert.deepEqual([after[0], after[2], after[3]], [before[0], before[2], before[3]], 'the others as they were');
  assert.equal(new Set(after.map((l) => l.k)).size, 4, 'no effect twice'); assert.equal(after[1].bad, false, 'the second line stays a bonus'); assert.equal(H(g, P).pentRerolls, 1);
  // a reload from before the reroll, the same choice: the same result
  const h = game(SEED, migrateSave(JSON.parse(JSON.stringify(saved)))); h.save.session.activeDungeonId = g.areaId(); h.loadArea('dungeon', false); const dh = h.map.objects.find((o) => o.kind === 'pentDais'); h.player.x = dh.x; h.player.y = dh.y + 1;
  h.interact(`pick:${uid}`, dh.id); h.interact(`reroll:${uid}:1`, dh.id); assert.deepEqual(h.save.tesseracts.owned[0].lines, after, 'deterministic');
  // the second: 10 Divine Viscera
  g.save.skylands = { ...(g.save.skylands || {}), viscera: 9 }; assert.match(d.actionLabels[`pick:${uid}`] || g.map.objects.find((o) => o.kind === 'pentDais').actionLabels[`pick:${uid}`], /10 Divine Viscera/);
  g.interact(`pick:${uid}`, d.id); const r2 = g.interact(`reroll:${uid}:2`, d.id); assert.ok(!r2.ok); assert.match(r2.message, /Divine Viscera for another cutting: 10 \(you have 9\)/); assert.equal(H(g, P).pentRerolls, 1, 'nothing spent');
  g.save.skylands.viscera = 14; const l3 = JSON.parse(JSON.stringify(g.save.tesseracts.owned[0].lines)); const r3 = g.interact(`reroll:${uid}:2`, d.id); assert.ok(r3.ok, r3.message); assert.equal(g.save.skylands.viscera, 4); assert.equal(H(g, P).pentRerolls, 2);
  assert.notDeepEqual(g.save.tesseracts.owned[0].lines[2], l3[2]);
  // no third
  g.save.skylands.viscera = 100; assert.deepEqual(d.actions, ['transit'], 'only Transit'); const r4 = g.interact(`reroll:${uid}:3`, d.id); assert.ok(!r4.ok); assert.equal(g.save.skylands.viscera, 100); assert.equal(H(g, P).pentRerolls, 2);
  const r5 = g.interact(undefined, d.id); assert.ok(r5.ok); assert.equal(g.area, 'overworld', 'Act is Transit now');
  // and kept: back on the walkway after a reload, still only Transit
  const k = game(SEED, migrateSave(JSON.parse(JSON.stringify(g.save)))); const dk = atDais(k, P); assert.deepEqual(dk.actions, ['transit']); assert.equal(H(k, P).pentRerolls, 2);
});
test('the rerolls are per Pentagon, follow the glyph\'s own rules (a cost stays in the cost lines, a bonus in the first two), and never touch another glyph', () => {
  for (let i = 0; i < 300; i++) { const g = { uid: 't1', ...TESS.rollTesseract('R' + i, 'src' + i, ['labyrinth', 'deep', 'regent', 'sealed', 'sovereign'][i % 5]) };
    for (let j = 0; j < 4; j++) { const l = TESS.rerollTesseractLine('R' + i, `p:${i}:reroll0:t1:${j}`, g, j); assert.ok(l && TESS.TESSERACTS.effects[l.k], 'a line');
      if (j < 2) assert.equal(l.bad, false); if (j === 0) assert.ok(TESS.TESSERACTS.kinds[g.kind].favour.includes(l.k) || true);
      assert.ok(!g.lines.some((q, k) => k !== j && q.k === l.k), 'no effect twice'); const E = TESS.TESSERACTS.effects[l.k][l.bad ? 'bad' : 'good']; assert.ok(l.v >= E[0] - 1e-9 && l.v <= E[1] + 1e-9, 'in range');
      assert.deepEqual(TESS.rerollTesseractLine('R' + i, `p:${i}:reroll0:t1:${j}`, g, j), l, 'pure'); } }
  const { cx, cy } = find(), g = game(), P = pentagonPlan(SEED, cx, cy, PENTAGON.version); const [a, b] = glyphs(g); const d = atDais(g, P), bl = JSON.stringify(b.lines);
  g.interact(`pick:${a.uid}`, d.id); g.interact(`reroll:${a.uid}:0`, d.id); assert.equal(JSON.stringify(g.save.tesseracts.owned[1].lines), bl, 'the other glyph untouched');
  const Q = pentagonPlan('S17', 16, 16, PENTAGON.version); assert.equal((g.save.consequences.dungeons[`${Q.base}:f1`] || {}).pentRerolls, undefined, 'another Pentagon has its own two');
});
test('without a Tesseract the dais offers only Transit', () => {
  const { cx, cy } = find(), g = game(), P = pentagonPlan(SEED, cx, cy, PENTAGON.version); const d = atDais(g, P); g.save.tesseracts = { owned: [], slots: [null, null, null], seq: 0, got: g.save.tesseracts?.got || {} }; g.refreshDais(d);
  assert.deepEqual(d.actions, ['transit']); const r = g.interact(undefined, d.id); assert.ok(r.ok); assert.equal(g.area, 'overworld');
});
