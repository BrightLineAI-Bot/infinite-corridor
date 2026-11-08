// The Pentagon's grand halls (release 795; Tim, 2026-11-06: "larger open ballrooms... huge open arenas and structures that we
// can just wander through and look up at. Various indications of the Watcher sigil in different places... use the lore as
// prompts and seeds to build different scenes, rooms, backdrops within the Pentagon"). Pentagon version 8: halls, murals,
// sigils and backdrops as map data; older Pentagons regenerate byte for byte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { render } from '../src/renderer.ts';
import { PENTAGON, pentagonPlan, generatePentagonChamber, pentagonLinkEnds } from '../src/pentagon.ts';
import { CLOSE_VIEW_ROOM_ROUTING } from '../src/close-view-room-routing.ts';
import { PENTAGON_HALLS, PENTAGON_MURALS, PENTAGON_BACKDROPS, MURAL_PLACES, PENTAGON_SIGILS, muralPattern, readPentagonMural, pentagonMuralsRead } from '../src/pentagon-halls.ts';
import { SIGIL_CELLS } from '../src/watcher.ts';

const SEED = 'TIM1', V8 = 8, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], CHAMBER = PENTAGON.size[0] * PENTAGON.size[1];
const game = (seed = SEED, save = null) => { const s = save || freshSave(); s.seed = seed; return new Game(s, 0); };
let found = null; const find = () => { if (found) return found; const g = game(); for (let cx = -64; cx <= 64 && !found; cx += PENTAGON.every) for (let cy = -64; cy <= 64 && !found; cy += PENTAGON.every) if (g.pentagonHere(cx, cy)) found = { cx, cy }; return found; };
const chamber = (seed, P, q) => generatePentagonChamber(seed, `${P.base}:f${q.n + 1}`);
const flood = (m) => { const W = m.width, seen = new Set([m.entry.y * W + m.entry.x]), st = [m.entry];
  while (st.length) { const c = st.pop(); for (const [dx, dy] of N4) { const x = c.x + dx, y = c.y + dy, k = y * W + x, t = m.tiles[k]; if (x < 0 || y < 0 || x >= W || y >= m.height || !t || seen.has(k) || t.blocked) continue; seen.add(k); st.push({ x, y }); } }
  return seen; };
const plans = (n, V = V8, pre = 'G') => Array.from({ length: n }, (_, i) => ({ seed: `${pre}${i}`, P: pentagonPlan(`${pre}${i}`, i * 8, -i * 8 + (i % 3) * 8, V) }));

// ------------------------------------------------------------------------------------------------ the pins
// Digests of every plan and chamber of versions 1-7 for three Pentagons, taken from the generator before release 795.
const PINNED = {
  'TIM1:8:8:v1': 'cebf49e1268c51049c2056b2', 'PIN2:-16:24:v1': 'f3a0ccf7406f5fe1a2aa8765', 'PIN3:40:-8:v1': 'cfcd70d74db7fb93e065fc96',
  'TIM1:8:8:v2': 'bce70ffeab8feeb305802a94', 'PIN2:-16:24:v2': 'f7440ea3aeb4a46b98f8ac8f', 'PIN3:40:-8:v2': 'ddf9eff14aa9caa1c76fd036',
  'TIM1:8:8:v3': 'b6f276a8874b063efc8a0ec6', 'PIN2:-16:24:v3': 'ce38d1735e2c46094e3a7813', 'PIN3:40:-8:v3': '28f77e5d660e860001e10fd5',
  'TIM1:8:8:v4': 'c0ebc540d05aef553d8bda32', 'PIN2:-16:24:v4': 'c9bd5be8efbacfa321021100', 'PIN3:40:-8:v4': '9a68f958eb1ce9f8a1a21c5d',
  'TIM1:8:8:v5': '414bb94928a3e4a49579b3c7', 'PIN2:-16:24:v5': '9adcc3c4f76da951cebfbfb8', 'PIN3:40:-8:v5': '704b22c0e20716541af1dcf6',
  'TIM1:8:8:v6': '44d41ee89e5af19a31f0fc56', 'PIN2:-16:24:v6': '5e08099304f1430b47f4bfb7', 'PIN3:40:-8:v6': '6fc6fc10daa2719c6353b0cb',
  'TIM1:8:8:v7': '92d5289b6ccb8a0ea64ba5ea', 'PIN2:-16:24:v7': '5d57ad1e2ce91e0081f1f4c5', 'PIN3:40:-8:v7': '8f44d7b8f411e055ef8fcb85',
};
test('old Pentagons: every plan and chamber of versions 1-7 regenerates byte for byte as before the grand halls', () => {
  for (const [k, want] of Object.entries(PINNED)) { const [seed, cx, cy, v] = k.split(':'), V = Number(v.slice(1)), h = createHash('sha256'), P = pentagonPlan(seed, Number(cx), Number(cy), V);
    h.update(JSON.stringify(P)); for (const q of P.nodes) h.update(JSON.stringify(chamber(seed, P, q)));
    assert.equal(h.digest('hex').slice(0, 24), want, k); }
  for (const { seed, P } of plans(30, 7, 'O')) { assert.ok(P.nodes.every((q) => !q.hall && !q.W && !q.H), `${seed}: no halls before v8`);
    for (const q of P.nodes) { const m = chamber(seed, P, q); assert.equal(m.width, PENTAGON.size[0]); assert.equal(m.height, PENTAGON.size[1]); assert.ok(!('hall' in m) && !('murals' in m) && !('sigils' in m) && !('backdrop' in m)); assert.ok(!m.objects.some((o) => o.kind === 'pentMural')); } }
});

test('the version: new ground uses the current Pentagon; grand halls and sigils began in v8, and a section pinned to 7 keeps 7', () => {
  assert.equal(PENTAGON.version, 9); assert.equal(PENTAGON_HALLS.since, V8); assert.equal(PENTAGON_SIGILS.since, V8);
  const { cx, cy } = find(), g = game(); g.rx = cx; g.ry = cy + 1; g.loadArea('overworld', false); assert.equal(g.map.pentagon.V, CLOSE_VIEW_ROOM_ROUTING.pentagonVersion); assert.ok(g.map.objects.filter((o) => o.pentagonDoor).every((o) => o.dungeonId.includes(`:v${CLOSE_VIEW_ROOM_ROUTING.pentagonVersion}:`)));
  const s = freshSave(); s.seed = SEED; s.atlas = { [`${cx + 1},${cy + 1}`]: { pentVersion: 7 } }; const old = new Game(s, 0); old.rx = cx; old.ry = cy + 1; old.loadArea('overworld', false); assert.equal(old.map.pentagon.V, 7);
});

// ------------------------------------------------------------------------------------------------ the plan: progression intact
test('v8 plan: the same Pentagon as v7 in every way but the halls: chambers, doors, keys, plate, levers, trials, lords, keepers, shards, sealed chambers, shortcuts, balconies', () => {
  const strip = (P, halls) => JSON.stringify({ nodes: P.nodes.map(({ ports, hall, W, H, floorKind, ...q }) => (halls.has(q.id) ? q : { ...q, floorKind })), edges: P.edges, world: P.world, trials: P.trials, keyNode: P.keyNode, plateE: P.plateE, lockW: P.lockW, sealNode: P.sealNode, levers: P.levers, nh: P.nh, links: P.links, ledges: P.ledges, gate: P.gate });
  for (let i = 0; i < 200; i++) { const seed = `E${i}`, a = pentagonPlan(seed, i * 8, -i * 8, 7), b = pentagonPlan(seed, i * 8, -i * 8, V8); const halls = new Set(b.nodes.filter((q) => q.hall).map((q) => q.id)); assert.equal(strip(b, halls), strip(a, halls), seed); assert.ok(b.nodes.filter((q) => q.hall).every((q) => q.floorKind === "grand"));
    for (const q of b.nodes) if (!q.hall) { const qa = a.nodes[q.n]; assert.deepEqual(q.ports.map((p) => [p.x, p.y]), qa.ports.map((p) => [p.x, p.y]), `${seed} ${q.id}: an ordinary chamber's doors as in v7`); } }
});

test('v8 halls: 4-6 a Pentagon, only in the rings, larger than a chamber and bounded; every kind comes up', () => {
  const kinds = {}, T = PENTAGON_HALLS;
  for (const { seed, P } of plans(300)) { const halls = P.nodes.filter((q) => q.hall); assert.ok(halls.length >= T.count[0] && halls.length <= T.count[1], `${seed}: ${halls.length} halls`);
    for (const q of halls) { assert.ok(q.kind === 'outer' || q.kind === 'inner', `${seed} ${q.id}`); const D = T.types[q.hall.type]; assert.ok(D, q.hall.type); assert.deepEqual([q.W, q.H], D.size);
      kinds[q.hall.type] = (kinds[q.hall.type] || 0) + 1; assert.equal(q.hall.murals.length, T.muralsPerHall); }
    assert.ok(new Set(halls.map((q) => q.hall.type)).size >= Math.min(halls.length, Object.keys(T.types).length), `${seed}: different kinds of hall`); }
  assert.deepEqual(Object.keys(kinds).sort(), ['arena', 'ballroom', 'colonnade', 'gallery', 'pitGallery']);
  for (const [k, D] of Object.entries(T.types)) { const [W, H] = D.size; assert.ok(W * H <= T.maxTiles, `${k}: ${W * H} tiles`); assert.ok(W * H >= 2 * CHAMBER, `${k}: well above a chamber`); assert.ok(W >= 23 && H >= 23 || W >= 51, `${k}: open both ways`); }
});

test('v8 ordinary chambers: laid and furnished exactly as v7 lays them (only the sigil record is new)', () => {
  const at = (m) => JSON.stringify({ tiles: m.tiles, objects: m.objects.map((o) => [o.kind, o.x, o.y]), foes: m.enemySpawns.map((e) => [e.kind, e.x, e.y]), entry: m.entry, w: m.width, h: m.height });
  for (const { seed, P } of plans(40, V8, 'L')) { const Q = pentagonPlan(seed, P.cx, P.cy, 7);
    for (const q of P.nodes.filter((n) => !n.hall)) { const m = chamber(seed, P, q), o = chamber(seed, Q, Q.nodes[q.n]); assert.equal(at(m), at(o), `${seed} ${q.id}`); assert.ok(Array.isArray(m.sigils) && !('hall' in m)); } }
});

// ------------------------------------------------------------------------------------------------ reachability
test('v8 chambers and halls: every floor tile of a hall, every door, object, creature and link end reached from the way in (thousands of chambers)', () => {
  const bad = []; let halls = 0, chambers = 0;
  for (const { seed, P } of plans(150, V8, 'R')) for (const q of P.nodes) { const m = chamber(seed, P, q), W = m.width, seen = flood(m); chambers++;
    for (const o of [...m.objects, ...m.enemySpawns, ...pentagonLinkEnds(P, m)]) if (!seen.has(Math.round(o.y) * W + Math.round(o.x))) bad.push(`${seed} ${q.id}: ${o.id}`);
    for (const p of q.ports) if (!seen.has(p.inner.y * W + p.inner.x)) bad.push(`${seed} ${q.id}: door ${p.x},${p.y}`);
    if (q.hall) { halls++; const floor = m.tiles.filter((t) => !t.blocked).length; if (floor !== seen.size) bad.push(`${seed} ${q.id}: ${floor - seen.size} floor tiles cut off`);
      if (m.width * m.height > PENTAGON_HALLS.maxTiles) bad.push(`${seed} ${q.id}: too large`);
      for (const t of m.tiles) if (t.hallVoid && !t.blocked) bad.push(`${seed} ${q.id}: the shaft walked`); }
    if (q.trial) assert.equal(m.enemySpawns.filter((e) => e.boss).length, 1, 'a trial keeps its lord'); }
  assert.deepEqual(bad.slice(0, 10), []); assert.ok(chambers > 3000 && halls > 600, `${chambers} chambers, ${halls} halls`);
});

test('in the game: a hall loads with every dressing (bells, pages, marks, links) on ground reached from where you come in, and draws without throwing', () => {
  const { cx, cy } = find(), g = game(), P = pentagonPlan(SEED, cx, cy, V8), bad = [];
  const ctx = new Proxy({ createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 10 }), getTransform: () => ({}), ellipse(x, y, rx, ry) { if (rx < 0 || ry < 0) throw new RangeError('negative'); }, arc(x, y, r) { if (r < 0) throw new RangeError('negative'); } }, { get: (o, k) => k in o ? o[k] : () => {}, set: () => true });
  for (const q of P.nodes.filter((n) => n.hall)) { g.save.session.activeDungeonId = `${P.base}:f${q.n + 1}`; g.save.session.dungeonReturn = { rx: cx, ry: cy, x: 16, y: 16 }; g.loadArea('dungeon', false);
    assert.equal(g.map.hall.type, q.hall.type); const seen = flood(g.map), W = g.map.width;
    for (const o of g.map.objects) if (!seen.has(Math.round(o.y) * W + Math.round(o.x))) bad.push(`${q.id}: ${o.kind} ${o.id}`);
    for (const e of g.enemies) if (!e.dead && !e.roofDweller && !seen.has(Math.round(e.y) * W + Math.round(e.x))) bad.push(`${q.id}: ${e.kind}`);
    for (const [x, y] of [[g.map.entry.x, g.map.entry.y], [W >> 1, g.map.height >> 1]]) { g.player.x = x; g.player.y = y; assert.doesNotThrow(() => render(ctx, g, 360, 640, 5000), q.id); } }
  assert.deepEqual(bad, []);
});

// ------------------------------------------------------------------------------------------------ the data for Close View
test('a hall\'s record: tall, a ceiling class, a backdrop that suits it, structures on its own floor; deterministic', () => {
  const T = PENTAGON_HALLS, seenCeil = new Set(), seenDrop = new Set();
  for (const { seed, P } of plans(60, V8, 'C')) for (const q of P.nodes.filter((n) => n.hall)) { const m = chamber(seed, P, q), H = m.hall, D = T.types[q.hall.type];
    assert.equal(H.tall, true); assert.ok(D.ceilings.includes(H.ceiling), H.ceiling); const C = T.ceilings[H.ceiling]; assert.equal(H.ceilingHeight, C.height); assert.equal(H.open, C.open); assert.equal(H.sky, C.sky);
    const B = PENTAGON_BACKDROPS.find((b) => b.id === H.backdrop); assert.ok(B && B.ceilings.includes(H.ceiling), `${seed} ${q.id}: ${H.backdrop} over ${H.ceiling}`); assert.equal(m.backdrop, H.backdrop);
    for (const f of H.features) { const t = m.tiles[f.y * m.width + f.x]; assert.ok(t && t.hall === q.hall.type, `${f.kind} in the hall`); if (f.kind === 'skylight') assert.ok(H.sky); }
    seenCeil.add(H.ceiling); seenDrop.add(H.backdrop);
    assert.deepEqual(chamber(seed, P, q), m, `${seed} ${q.id}: the same hall every time`); }
  assert.deepEqual([...seenCeil].sort(), Object.keys(T.ceilings).sort(), 'every ceiling class comes up'); assert.deepEqual([...seenDrop].sort(), PENTAGON_BACKDROPS.map((b) => b.id).sort(), 'every backdrop comes up');
});

test('the murals: original scenes from the Corridor\'s lore, each with a title, a short caption, its source, a motif and a palette', () => {
  const ids = PENTAGON_MURALS.map((m) => m.id); assert.equal(new Set(ids).size, ids.length); assert.ok(ids.length >= 12);
  for (const m of PENTAGON_MURALS) { assert.ok(m.title && m.title.length <= 40, m.id); assert.ok(m.caption.length >= 40 && m.caption.length <= 260, `${m.id}: ${m.caption.length}`); assert.ok(m.source.length > 4, m.id);
    assert.ok(MURAL_PLACES[m.motif], m.motif); assert.equal(m.palette.length, 3); for (const c of m.palette) assert.match(c, /^#[0-9a-f]{6}$/); assert.equal(m.since, V8);
    if (m.motif === 'rule-figure') { assert.ok(m.rule, m.id); const P = muralPattern(m, 13, 7), lit = P.flat().filter(Boolean).length; assert.ok(lit > 5 && lit < 13 * 7, `${m.id}: a figure (${lit})`); } }
  const all = JSON.stringify(PENTAGON_MURALS); for (const lore of ['world-beasts', 'elders.ts', 'giantFolk', 'giants', 'FAR_CIVS storm', 'surveyor', 'bells', 'Listener', 'RECKONING sieve', 'RECKONING cross', 'RECKONING carpet', 'e30', 'watcher.ts']) assert.ok(all.includes(lore), lore);
  for (const k of Object.keys(MURAL_PLACES)) assert.ok(PENTAGON_MURALS.some((m) => m.motif === k), k);
  assert.ok(!/model|claude|gpt/i.test(all));
});

test('murals in a hall: on its walls (each facing open floor, read from the floor before it), one overhead, and a floor inlay; deterministic, spread across a Pentagon', () => {
  const bad = [];
  for (const { seed, P } of plans(80, V8, 'M')) { const inPent = [];
    for (const q of P.nodes.filter((n) => n.hall)) { const m = chamber(seed, P, q), W = m.width, H = m.height, at = (x, y) => m.tiles[y * W + x], reads = m.objects.filter((o) => o.kind === 'pentMural');
      const walls = m.murals.filter((u) => u.place === 'wall'), D = PENTAGON_HALLS.types[q.hall.type];
      if (walls.length < D.murals[0]) bad.push(`${seed} ${q.id}: ${walls.length} wall murals`); if (m.murals.filter((u) => u.place === 'ceiling').length !== 1) bad.push(`${seed} ${q.id}: no ceiling`);
      for (const u of m.murals) { const M = PENTAGON_MURALS.find((x) => x.id === u.muralId); if (!M || !MURAL_PLACES[M.motif].includes(u.place)) bad.push(`${seed} ${q.id}: ${u.muralId} on the ${u.place}`); inPent.push(u.muralId);
        if (u.place === 'wall') { const t = at(u.x, u.y), [dx, dy] = { north: [0, 1], south: [0, -1], west: [1, 0], east: [-1, 0] }[u.side], f = at(u.x + dx, u.y + dy);
          if (!t?.blocked || f?.blocked || t.doorway) bad.push(`${seed} ${q.id}: wall mural at ${u.x},${u.y}`); if (!reads.some((o) => o.muralId === u.muralId && o.x === u.x + dx && o.y === u.y + dy)) bad.push(`${seed} ${q.id}: read before ${u.muralId}`); }
        if (u.place === 'floor') { const inlay = m.tiles.filter((t) => t.inlay); if (inlay.length < 20 || !inlay.some((t) => t.inlay === 2) || !inlay.some((t) => t.inlay === 1)) bad.push(`${seed} ${q.id}: floor inlay`); }
        if (!reads.some((o) => o.muralId === u.muralId)) bad.push(`${seed} ${q.id}: no way to read ${u.muralId}`); }
      if (new Set(m.murals.map((u) => u.muralId)).size !== m.murals.length) bad.push(`${seed} ${q.id}: a mural twice in one hall`);
      for (const o of reads) { const t = at(o.x, o.y); if (!t || t.blocked || t.doorway) bad.push(`${seed} ${q.id}: read object off the floor`); } }
    if (new Set(inPent).size < Math.min(10, inPent.length)) bad.push(`${seed}: only ${new Set(inPent).size} different murals`); }
  assert.deepEqual(bad.slice(0, 10), []);
});

test('the Watcher\'s sigil: over every door of a hall, over some doors of other v8 chambers, on banners and columns, inlaid in full in ballroom and arena floors', () => {
  let lintels = 0, doors = 0, inlays = 0, banners = 0, columns = 0;
  for (const { seed, P } of plans(80, V8, 'S')) for (const q of P.nodes) { const m = chamber(seed, P, q), W = m.width, H = m.height, at = (x, y) => m.tiles[y * W + x], edge = (p) => p.x === 0 || p.y === 0 || p.x === W - 1 || p.y === H - 1;
    assert.ok(Array.isArray(m.sigils), `${seed} ${q.id}: v8 records its sigils`);
    for (const s of m.sigils) { if (s.kind === 'lintel') { lintels++; assert.ok(q.ports.some((p) => p.x === s.x && p.y === s.y && edge(p)), 'over a door'); assert.ok(at(s.x, s.y).doorway || q.hall === undefined); }
      if (s.kind === 'banner') { banners++; assert.ok(at(s.x, s.y).blocked && edge(s), 'hung on a wall'); }
      if (s.kind === 'column') { columns++; assert.ok(at(s.x, s.y).column, 'cut on a column'); }
      if (s.kind === 'inlay') { inlays++; for (const c of SIGIL_CELLS) { const t = at(s.x + c.dx, s.y + c.dy); assert.equal(t.sigil, c.part); assert.ok(!t.blocked); } } }
    if (q.hall) { const hd = q.ports.filter(edge); doors += hd.length; assert.equal(m.sigils.filter((s) => s.kind === 'lintel').length, hd.length, `${seed} ${q.id}: every hall door`);
      if (PENTAGON_HALLS.types[q.hall.type].inlay === 'sigil') assert.ok(m.sigils.some((s) => s.kind === 'inlay'), `${seed} ${q.id}: the sigil inlaid`); }
    assert.deepEqual(chamber(seed, P, q).sigils, m.sigils); }
  assert.ok(lintels > doors && inlays > 50 && banners > 100 && columns > 50, JSON.stringify({ lintels, doors, inlays, banners, columns }));
});

// ------------------------------------------------------------------------------------------------ reading a mural
const hallIn = (g) => { const { cx, cy } = find(), P = pentagonPlan(SEED, cx, cy, V8), q = P.nodes.find((n) => n.hall); g.save.session.activeDungeonId = `${P.base}:f${q.n + 1}`; g.save.session.dungeonReturn = { rx: cx, ry: cy, x: 16, y: 16 }; g.loadArea('dungeon', false); return q; };
test('reading a mural: Act at it shows its title and caption; the first time journals it once and remembers it; again, the words but no new line; a reload shows it read', () => {
  const g = game(); hallIn(g); const o = g.map.objects.find((q) => q.kind === 'pentMural'), M = PENTAGON_MURALS.find((m) => m.id === o.muralId); assert.ok(o && M); assert.deepEqual(o.actions, ['read']); assert.equal(o.state, 'waiting');
  const lines = () => g.save.narrative.journal.filter((j) => j.recordId === `pentagon-mural:${M.id}`);
  g.player.x = o.x; g.player.y = o.y; const r = g.interact('read', o.id); assert.ok(r.ok && r.first); assert.ok(g.message.includes(M.title) && g.message.includes(M.caption)); assert.equal(lines().length, 1); assert.equal(lines()[0].title, PENTAGON_HALLS.names.journal);
  assert.deepEqual(g.save.lore.murals, [M.id]); assert.equal(o.state, 'read');
  const r2 = g.interact('read', o.id); assert.ok(r2.ok && !r2.first); assert.ok(g.message.includes(M.caption)); assert.equal(lines().length, 1, 'journalled once'); assert.deepEqual(g.save.lore.murals, [M.id]);
  const h = game(SEED, migrateSave(JSON.parse(JSON.stringify(g.save)))); hallIn(h); assert.equal(h.map.objects.find((q) => q.id === o.id).state, 'read', 'read after a reload'); assert.deepEqual(pentagonMuralsRead(h.save).map((m) => m.id), [M.id]);
  const other = h.map.objects.find((q) => q.kind === 'pentMural' && q.muralId !== M.id); if (other) assert.equal(other.state, 'waiting');
});

test('the save: save.lore.murals is additive at schema 14, normalised by freshSave and migrateSave; unknown ids kept, junk dropped; an unknown mural reads as worn', () => {
  const f = freshSave(); assert.equal(f.lore.murals, undefined); assert.equal(f.version, 14);
  const s = freshSave(); s.lore.murals = ['theSieve', 'aFutureMural', 7, null, 'theSieve']; s.lore.someFuture = { kept: true }; const m = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(m.lore.murals, ['theSieve', 'aFutureMural']); assert.deepEqual(m.lore.someFuture, { kept: true }); assert.equal(m.version, 14);
  const bad = migrateSave({ ...JSON.parse(JSON.stringify(freshSave())), lore: { murals: 'nope' } }); assert.deepEqual(bad.lore.murals, []);
  const r = readPentagonMural(freshSave(), { muralId: 'noSuchMural' }); assert.ok(!r.ok); assert.equal(r.message, PENTAGON_HALLS.messages.worn);
});
