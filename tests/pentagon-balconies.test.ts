// The Pentagon, version 7: its roof, balconies and outer stair (Tim, 2026-11-04): "There could be interesting puzzles using drone
// traversal. There could be ledges on the outside of the Pentagon where you can jump down from the roof and not go all the way to
// death — jump down to a balcony a story or two down — and then use that to enter the Pentagon"; and "We should be able to use
// the roof — the roof is just another path".
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, clearSectionTerrainCache, sectionTerrainCacheStats } from '../src/game.ts';
import { render } from '../src/renderer.ts';
import { LANDSCAPE_VERSION, COHERENCE, FALL_DAMAGE, fallDamage, playerStepOk, canStep } from '../src/landscape.ts';
import { DRONE_LIFT } from '../src/vehicle-gates.ts';
import { PENTAGON, pentagonPlan, generatePentagonChamber, placePentagonSection, regionAt, pentagonParapet, pentagonSeamOpen, pentagonRoofAt, pentagonRoofSpots } from '../src/pentagon.ts';

const SEED = 'TIM1', V7 = 7, Bc = PENTAGON.balconies, R0 = PENTAGON.roof.elev;
const game = (seed = SEED, save = null) => { const s = save || freshSave(); s.seed = seed; return new Game(s, 0); };
const pinned = (seed, cx, cy, V) => { const s = freshSave(); s.seed = seed; s.atlas = { [`${cx + 1},${cy + 1}`]: { landscapeVersion: LANDSCAPE_VERSION, pentVersion: V, coherenceVersion: COHERENCE.version } }; return new Game(s, 0); };
const findIn = (g) => { for (let cx = -64; cx <= 64; cx += PENTAGON.every) for (let cy = -64; cy <= 64; cy += PENTAGON.every) if (g.pentagonHere(cx, cy)) return { cx, cy }; return null; };
let found = null; const find = () => (found ||= findIn(game()));
const visit = (g, rx, ry) => { g.rx = rx; g.ry = ry; g.loadArea('overworld', false); return g; };
const act = (g, o, a) => { assert.ok(o, a); g.player.x = o.x; g.player.y = o.y; return g.interact(a, o.id); };
const idle = (x = 0, y = 0) => ({ state: { x, y }, consume: () => false, held: () => false });

// ------------------------------------------------------------------------------------------------ the plan
// The solver of tests/pentagon-shortcuts.test.ts (places and chambers, each door passing only when what it wants is had), with
// `noBalcony` to take the balconies away and `start` to begin on one.
function solve(P, { start = ['land'], deny = {}, links = true, noBalcony = false } = {}) {
  const V = P.V, node = (id) => P.nodes.find((n) => n.id === id), seen = new Set(start);
  const state = () => { const has = (id) => seen.has(id), lev = P.levers.filter((l) => has(`c${l.f}`)).length, trials = P.trials.filter((t) => has(t)).length;
    const keys = new Set(P.nodes.filter((n) => n.key && has(n.id)).map((n) => n.key.id).concat(P.nodes.filter((n) => n.shard && has(n.id)).map((n) => n.shard.id)).filter((k) => !(deny.keys || []).includes(k)));
    const seal = !deny.seal && (V >= 4 ? has(`h${P.nh - 1}`) : P.sealNode ? has(P.sealNode) : false);
    return { lev: deny.levers ? 0 : lev, trials: deny.trials ? 0 : trials, keys, seal, plate: !deny.plate }; };
  const moves = (v, st) => { const out = [];
    for (const e of P.edges) for (const [a, b] of [[e.a, e.b], [e.b, e.a]]) { if (a !== v) continue;
      if (e.sigil && !st.seal) continue; if (e.secret && !st.keys.has(e.secret)) continue; if (e.shortcut && a !== e.far && !seen.has(e.far)) continue; if (e.plate && !st.plate) continue;
      if (/^h\d/.test(a) && /^h\d/.test(b) && Number(b.slice(1)) > Number(a.slice(1)) && node(a).boss && (V === 2 || V >= 4) && (!seen.has(a) || deny.keeper === Number(a.slice(1)))) continue;
      out.push(b); }
    for (const w of P.world) { if (noBalcony && w.balcony) continue; const gateOk = !(w.gate === 'levers' && st.lev < PENTAGON.levers) && !(w.sigil && !st.seal) && !(w.lock && !st.keys.has(w.lock));
      if (w.toGate) { if (w.node === v) out.push('land'); continue; }
      if (w.node === v && gateOk) out.push(w.place);
      if (w.place === v && gateOk && !(w.sealed === 'trials' && st.trials < PENTAGON.trials) && !(w.exterior && !(links && seen.has(w.node)))) out.push(w.node); }
    if (links) for (const L of P.links) { if (!seen.has(L.deep)) continue; if (v === L.near) out.push(L.deep); if (v === L.deep) out.push(L.near); }
    return out; };
  for (let grew = true; grew;) { grew = false; const st = state(), q = [...seen]; while (q.length) { const v = q.pop(); for (const u of moves(v, st)) if (!seen.has(u)) { seen.add(u); q.push(u); grew = true; } } }
  return seen;
}
// the long way: doors from the land with every lock, plate, lever, trial, sigil, shard, barred door and balcony shut
function longWay(P) { const adj = new Map(), link = (a, b) => { (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); };
  for (const e of P.edges) if (!e.sigil && !e.secret && !e.shortcut && !e.plate && !e.cut) link(e.a, e.b);
  for (const w of P.world) if (!w.toGate && !w.exterior && !w.sigil && !w.lock && !w.gate && !w.sealed && !w.balcony) link(w.node, w.place);
  const d = new Map([['land', 0]]), q = ['land']; for (let i = 0; i < q.length; i++) for (const u of adj.get(q[i]) || []) if (!d.has(u)) { d.set(u, d.get(q[i]) + 1); q.push(u); } return d; }

test('v7 plan: 1-3 balconies, each just outside the outer face, 1 or 2 levels under the roof, its door into an outer chamber you otherwise reach the long way', () => {
  assert.ok(PENTAGON.version >= V7, 'version 7 or later'); /* release 795: version 8 is the newest (grand halls) */ assert.equal(PENTAGON.stair.steps, R0 - 1, 'a level a step from the land up to the roof');
  const bad = [], tally = { n: {}, below: {}, hops: {} };
  for (let i = 0; i < 400; i++) { const seed = 'X' + i, P = pentagonPlan(seed, i * 8, -i * 8, V7), L = P.ledges, tag = `${seed}`, d = longWay(P), balc = P.world.filter((w) => w.balcony);
    tally.n[balc.length] = (tally.n[balc.length] || 0) + 1;
    if (balc.length !== L.balconies.length || balc.length < 1 || balc.length > Bc.count[1]) bad.push(`${tag}: ${balc.length} balconies`);
    const open = new Set(P.world.filter((w) => w.place === 'land' && !w.balcony && !w.exterior).map((w) => w.node)), any3 = [...Array(10).keys()].some((k) => !open.has(`o${k}`) && (d.get(`o${k}`) ?? 0) >= Bc.minHops);
    for (const b of L.balconies) { const w = balc.find((x) => x.key === b.key), below = R0 - b.elev, h = d.get(b.node);
      tally.below[below] = (tally.below[below] || 0) + 1; tally.hops[h] = (tally.hops[h] || 0) + 1;
      if (!w || w.node !== b.node || !/^o\d$/.test(b.node)) bad.push(`${tag}: ${b.key} on ${b.node}`);
      if (below < Bc.below[0] || below > Bc.below[1]) bad.push(`${tag}: ${b.key} ${below} below the roof`);
      if (open.has(b.node)) bad.push(`${tag}: ${b.key} into a chamber the land already opens on`);
      if (!(h >= (any3 ? Bc.minHops : Bc.fallbackHops))) bad.push(`${tag}: ${b.key} into ${b.node}, ${h} doors the long way`);
      for (const c of b.cells) { const R = regionAt(c.gx, c.gy); if (R.kind !== 'outside' || R.face !== b.f) bad.push(`${tag}: ${b.key} cell ${c.gx},${c.gy} is ${R.kind}`); }
      const sec = new Set(b.cells.map((c) => `${Math.floor(c.gx / 32)},${Math.floor(c.gy / 32)}`)); if (sec.size !== 1) bad.push(`${tag}: ${b.key} over a seam`);
      if (!b.cells.some((c) => c.gx === b.out.gx && c.gy === b.out.gy)) bad.push(`${tag}: ${b.key} door off its balcony`);
      if (Math.abs(b.door.gx - b.out.gx) + Math.abs(b.door.gy - b.out.gy) !== 1 || regionAt(b.door.gx, b.door.gy).kind !== 'outer' || pentagonParapet(b.door.gx, b.door.gy)) bad.push(`${tag}: ${b.key} not against the roof`); }
    for (const a of L.balconies) for (const b of L.balconies) if (a !== b && a.cells.some((p) => b.cells.some((q) => Math.max(Math.abs(p.gx - q.gx), Math.abs(p.gy - q.gy)) < 2))) bad.push(`${tag}: ${a.key} touches ${b.key}`);
    const S = L.stair; if (!S) bad.push(`${tag}: no stair`); else { if (S.cells.length !== PENTAGON.stair.steps + 1 || S.cells.some((c, k) => c.elev !== k || regionAt(c.gx, c.gy).kind !== 'outside')) bad.push(`${tag}: stair cells`);
      const top = S.cells[S.cells.length - 1]; if (![[0, -1], [1, 0], [-1, 0], [0, 1]].some(([x, y]) => regionAt(top.gx + x, top.gy + y).kind === 'outer' && !pentagonParapet(top.gx + x, top.gy + y))) bad.push(`${tag}: stair top off the roof`);
      if (S.cells.some((c) => L.balconies.some((b) => b.cells.some((q) => Math.max(Math.abs(c.gx - q.gx), Math.abs(c.gy - q.gy)) < 2)))) bad.push(`${tag}: stair by a balcony`); } }
  assert.deepEqual(bad.slice(0, 10), []); assert.ok(Object.keys(tally.n).length >= 2 && tally.below[1] && tally.below[2], JSON.stringify(tally));
});

test('v7 plan: no balcony lets you past a lock, the plate, the levers, a trial, a keeper, the Seal or a shard', () => {
  const bad = []; const states = [{}, { trials: true }, { levers: true }, { seal: true }, { plate: true }, { keys: ['shard0', 'shard1', 'key0'] }];
  for (let i = 0; i < 300; i++) { const P = pentagonPlan('Z' + i, i * 8, -i * 8, V7), tag = `Z${i}`;
    for (const deny of [...states, ...Array.from({ length: P.nh - 1 }, (_, k) => ({ keeper: k }))]) { const a = [...solve(P, { deny })].sort().join(), b = [...solve(P, { deny, noBalcony: true })].sort().join();
      if (a !== b) bad.push(`${tag}: balconies change what ${JSON.stringify(deny)} reaches`);
      for (const w of P.world.filter((x) => x.balcony)) { const r = solve(P, { deny, start: [w.node], noBalcony: true }), base = solve(P, { deny, noBalcony: true });
        for (const v of r) if (!base.has(v)) bad.push(`${tag}: ${w.key} reaches ${v} without ${JSON.stringify(deny)}`); } }
    for (const id of P.nodes.map((n) => n.id)) if (!solve(P).has(id)) bad.push(`${tag}: ${id} unreachable`); }
  assert.deepEqual(bad.slice(0, 10), []);
});

// ------------------------------------------------------------------------------------------------ old Pentagons, byte for byte
// Plans (with their links), every chamber and all nine sections (on plain ground and on landscaped ground) of twelve and six
// Pentagons of versions 5 and 6, hashed from the code before version 7.
const GOLD = { 5: ['0406dd287d9289bb', 'ff2fdfaf82cdb033'], 6: ['a70e21b40c4697d7', '4e65874f4870d669'] };
const digest = (V) => { const h = createHash('sha256');
  for (let i = 0; i < 12; i++) { const seed = 'G' + i, P = pentagonPlan(seed, i * 8, -i * 8, V);
    h.update(JSON.stringify({ nodes: P.nodes.map((n) => ({ ...n, ports: n.ports.map((p) => ({ ...p, edge: undefined, world: undefined })) })), edges: P.edges, world: P.world, levers: P.levers, links: P.links }));
    for (const q of P.nodes) { const m = generatePentagonChamber(seed, `${P.base}:f${q.n + 1}`); h.update(JSON.stringify([m.tiles, m.objects, m.enemySpawns, m.entry, m.building])); } }
  const k = createHash('sha256'); for (let i = 0; i < 6; i++) { const seed = 'G' + i, cx = i * 8, cy = -i * 8; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) for (const land of [false, true]) {
    const map = { landscape: land ? 'plains' : undefined, tiles: Array.from({ length: 1024 }, (_, j) => ({ x: j % 32, y: j >> 5, kind: 'grass', blocked: false, elev: (j * 7) % 3 })), objects: [], enemySpawns: [] };
    placePentagonSection(map, seed, cx, cy, cx + dx, cy + dy, V); k.update(JSON.stringify([map.tiles, map.objects, map.enemySpawns, map.pentagon, map.greatBuilding])); } }
  return [h.digest('hex').slice(0, 16), k.digest('hex').slice(0, 16)]; };
test('old Pentagons: versions 5 and 6 plan, chamber and section byte for byte as before the roof; none has a roof, balcony or stair', () => {
  for (const V of [5, 6]) assert.deepEqual(digest(V), GOLD[V], `v${V}`);
  for (const V of [1, 3, 5, 6]) { const P = pentagonPlan('G1', 8, -8, V); assert.ok(!P.ledges && !P.world.some((w) => w.balcony));
    const map = { landscape: 'plains', tiles: Array.from({ length: 1024 }, (_, j) => ({ x: j % 32, y: j >> 5, kind: 'grass', blocked: false, elev: 0 })), objects: [], enemySpawns: [] };
    placePentagonSection(map, 'G1', 8, -8, 8, -7, V); assert.ok(!map.tiles.some((t) => t.pentRoof || t.pentBalcony || t.pentStair !== undefined || t.pentParapet)); assert.ok(!map.pentagon.roof); assert.deepEqual(pentagonRoofSpots(map), []); }
});

test('determinism: a v7 plan and its sections come out the same on every fresh load', () => {
  const snap = () => { const out = []; for (let i = 0; i < 4; i++) { const seed = 'D' + i, P = pentagonPlan(seed, i * 8, -i * 8, V7); out.push(JSON.stringify([P.world, P.ledges]));
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const map = { landscape: 'plains', tiles: Array.from({ length: 1024 }, (_, j) => ({ x: j % 32, y: j >> 5, kind: 'grass', blocked: false, elev: 0 })), objects: [], enemySpawns: [] };
        placePentagonSection(map, seed, i * 8, -i * 8, i * 8 + dx, -i * 8 + dy, V7); out.push(JSON.stringify([map.tiles, map.objects, map.pentagon, pentagonRoofSpots(map)])); } }
    for (let i = 0; i < 12; i++) pentagonPlan('flush' + i, 0, 0, V7); return createHash('sha256').update(out.join('|')).digest('hex'); };
  assert.equal(snap(), snap());
  const { cx, cy } = find(), a = visit(game(), cx, cy + 1), b = visit(game(), cx, cy + 1), keep = (g) => JSON.stringify([g.map.tiles, g.map.objects.filter((o) => o.kind !== 'traveler'), g.map.pentagon]);
  assert.equal(keep(a), keep(b), 'two fresh journeys');
});

// ------------------------------------------------------------------------------------------------ in the game
// The nine sections as one 96×96 ground. A step is the Wayfarer's on foot (landscape.ts playerStepOk: climb a level, walk a
// slope, drop less than a lethal fall) or, with `drone`, anything open (the booster lifts five levels over the jump's start, so
// any open tile beside you can be landed on); across a seam only at a lane or where the Pentagon's courts or roof run on.
const ground = (g, cx, cy) => { const G = new Array(96 * 96), exits = new Map();
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { visit(g, cx + dx, cy + dy); exits.set(`${dx},${dy}`, g.map.exits); for (const t of g.map.tiles) G[((dy + 1) * 32 + t.y) * 96 + (dx + 1) * 32 + t.x] = t; }
  const seamOk = (x, y, X, Y) => { const sx = Math.floor(x / 32), sy = Math.floor(y / 32), SX = Math.floor(X / 32), SY = Math.floor(Y / 32); if (sx === SX && sy === SY) return true;
    const dx = SX - sx, dy = SY - sy, ex = exits.get(`${sx - 1},${sy - 1}`) || {}, v = dx ? y % 32 : x % 32, lane = dx ? (dx > 0 ? ex.east : ex.west) : (dy > 0 ? ex.south : ex.north);
    return (Number.isFinite(lane) && Math.abs(v - lane) <= 1) || pentagonSeamOpen(cx, cy, cx + sx - 1, cy + sy - 1, dx, dy, v, v, true); };
  const flood = (starts, drone = false) => { const seen = new Set(starts), q = [...starts]; while (q.length) { const k = q.pop(), x = k % 96, y = (k / 96) | 0;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + a, Y = y + b, K = Y * 96 + X; if (X < 0 || Y < 0 || X > 95 || Y > 95 || seen.has(K)) continue; const A = G[k], T = G[K];
        if (!T || T.blocked || !seamOk(x, y, X, Y) || !(drone ? true : playerStepOk(A, T, a, b))) continue; seen.add(K); q.push(K); } }
    return seen; };
  return { G, flood, at: (gx, gy) => G[gy * 96 + gx] }; };

test('v7 in the game: the roof is walked all the way round from the outer stair; every balcony is a survivable drop from it; no step, drop or drone lift reaches a court', () => {
  for (const seed of [SEED, 'S17', 'B2']) { const at = seed === SEED ? find() : findIn(game(seed)); if (!at) continue; const { cx, cy } = at, g = game(seed), P = pentagonPlan(seed, cx, cy, g.pentagonVersion(cx, cy)), { G, flood, at: tile } = ground(g, cx, cy);
    assert.ok(G.every(Boolean)); const idx = (c) => c.gy * 96 + c.gx, roof = [], courts = [], outside = [];
    G.forEach((t, k) => { if (t.pentRoof) roof.push(k); else if (t.courtyard && t.pentagon) courts.push(k); else if (!t.greatBuilding && !t.blocked && regionAt(k % 96, (k / 96) | 0).kind === 'outside') outside.push(k); });
    assert.ok(roof.length > 900, `${seed}: ${roof.length} roof tiles`); for (const k of roof) { assert.equal(G[k].elev, R0); assert.equal(G[k].structure, 'buildingRoof'); }
    for (const k of roof) assert.ok(!G[k].blocked);
    // up the stair on foot, and round the whole roof
    const S = P.ledges.stair, foot = tile(S.foot.gx, S.foot.gy); assert.equal(foot.elev, 0); assert.ok(S.cells.slice(1).every((c, k) => tile(c.gx, c.gy).elev === k + 1 && tile(c.gx, c.gy).slope));
    const walk = flood([idx(S.foot)]); assert.ok(roof.every((k) => walk.has(k)), `${seed}: all the roof walked from the stair's foot`);
    for (const k of courts) assert.ok(!walk.has(k), `${seed}: a court reached on foot`);
    // the stair's foot is on the land the section's ways lead to (so is the roof)
    { const h = visit(game(seed), cx - 1 + Math.floor(S.foot.gx / 32), cy - 1 + Math.floor(S.foot.gy / 32)); assert.ok(h.map.pentagon.stairFoot?.joined, `${seed}: the stair's foot joins the section's land exits`); }
    // the drone: anything open beside you; still no court from the land or the roof
    const fly = flood([...outside, ...roof], true); for (const k of courts) assert.ok(!fly.has(k), `${seed}: a court reached by the drone from outside`);
    for (const b of P.ledges.balconies) { const out = tile(b.out.gx, b.out.gy), door = tile(b.door.gx, b.door.gy); assert.equal(out.pentBalcony, b.key); assert.equal(out.structure, 'buildingRoof'); assert.ok(door.pentRoof);
      const drop = door.elev - out.elev; assert.ok(drop === 1 || drop === 2, `${b.key}: a drop of ${drop}`); assert.notEqual(fallDamage(drop, 100), Infinity); assert.ok(playerStepOk(door, out, b.out.gx - b.door.gx, b.out.gy - b.door.gy), 'a step down from the roof');
      assert.ok(walk.has(idx(b.out)), `${b.key} reached on foot from the stair`);
      assert.ok(canStep({ isPlayer: true, jumping: true, airElev: DRONE_LIFT.max }, { landscape: true, tiles: [{ elev: 0 }, out] }, 2, 0, 0, 1, 0), 'the drone lifts onto it from the land'); } }
});

test('the fall numbers: a balcony 1 level down is free, 2 levels costs 15% of max HP; the roof to the land is fatal on foot', () => {
  assert.deepEqual(FALL_DAMAGE, { 1: 0, 2: .15, 3: .4 }); assert.equal(fallDamage(1, 120), 0); assert.equal(fallDamage(2, 120), 18); assert.equal(fallDamage(R0, 120), Infinity);
  const { cx, cy } = find(), P = pentagonPlan(SEED, cx, cy, V7), b = P.ledges.balconies[0], g = game(), rx = cx - 1 + Math.floor(b.out.gx / 32), ry = cy - 1 + Math.floor(b.out.gy / 32); visit(g, rx, ry);
  g.save.glider = false; if (g.save.mech) g.save.mech.active = false;
  const door = { x: b.door.gx % 32, y: b.door.gy % 32 }, out = { x: b.out.gx % 32, y: b.out.gy % 32 }; g.player.x = door.x; g.player.y = door.y; g.player.invulnerableUntil = 0; const hp = g.player.hp = g.save.maxHp;
  const tileAt = () => g.map.tiles[Math.floor(g.player.y + .75) * 32 + Math.floor(g.player.x + .5)];
  assert.ok(tileAt().pentRoof); const dx = Math.sign(out.x - door.x), dy = Math.sign(out.y - door.y); let t = 3000;
  for (let i = 0; i < 40 && !tileAt()?.pentBalcony; i++) g.update(.05, idle(dx, dy), t += 50);
  assert.ok(tileAt()?.pentBalcony, 'onto the balcony'); assert.equal(g.save.worldFlags?.deaths || 0, 0); const drop = R0 - b.elev; assert.equal(hp - g.player.hp, fallDamage(drop, g.save.maxHp), `a drop of ${drop}`);
});

test('v7: a balcony door takes you into its chamber and back out onto the balcony; only from up there; the roof seams cross anywhere along it', () => {
  const { cx, cy } = find(), P = pentagonPlan(SEED, cx, cy, V7), g = pinned(SEED, cx, cy, V7); // release 795: new ground is version 8; this Pentagon is pinned to 7
  for (const b of P.ledges.balconies) { const rx = cx - 1 + Math.floor(b.out.gx / 32), ry = cy - 1 + Math.floor(b.out.gy / 32); visit(g, rx, ry);
    const o = g.map.objects.find((q) => q.enterAt === b.key); assert.ok(o && o.roofHatch && o.pentagonDoor && o.dungeonId.includes(':v7:')); assert.equal(o.x, b.out.gx % 32); assert.equal(o.y, b.out.gy % 32);
    // from the ground below it, Act does not reach it
    const below = [[0, 1], [1, 0], [-1, 0], [0, -1]].map(([x, y]) => ({ x: o.x + x, y: o.y + y })).find((c) => { const t = g.map.tiles[c.y * 32 + c.x]; return t && !t.blocked && !t.greatBuilding && !t.structure; });
    if (below) { g.player.x = below.x; g.player.y = below.y; assert.equal(g.reachOf(o), Infinity, 'not from the ground'); }
    g.player.x = b.door.gx % 32; g.player.y = b.door.gy % 32; assert.ok(g.reachOf(o) < 1.5, 'from the roof beside it');
    const r = act(g, o, 'enter'); assert.ok(r.ok, r.message); assert.equal(g.area, 'dungeon'); assert.equal(P.nodes[g.map.building.node].id, b.node, `${b.key} into ${b.node}`);
    const e = g.map.building.entries[b.key]; assert.deepEqual([Math.round(g.player.x), Math.round(g.player.y)], [e.x, e.y]);
    const ex = g.map.objects.find((q) => q.id === `building-exit-${b.key}`); assert.equal(ex.name, Bc.exit); const r2 = act(g, ex, 'exit'); assert.ok(r2.ok, r2.message);
    assert.equal(g.area, 'overworld'); assert.deepEqual([g.rx, g.ry, Math.round(g.player.x), Math.round(g.player.y)], [rx, ry, o.x, o.y]); assert.ok(g.map.tiles[o.y * 32 + o.x].pentBalcony, 'out onto the balcony'); }
  // the chambers hold together: the balcony door stands on the chamber's wall and its arrival is reachable
  for (const b of P.ledges.balconies) { const q = P.nodes.find((n) => n.id === b.node), m = generatePentagonChamber(SEED, `${P.base}:f${q.n + 1}`), W = m.width, e = m.building.entries[b.key];
    const seen = new Set([m.entry.y * W + m.entry.x]), st = [m.entry]; while (st.length) { const c = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = c.x + dx, y = c.y + dy, k = y * W + x, t = m.tiles[k]; if (x < 0 || x >= W || !t || seen.has(k) || t.blocked) continue; seen.add(k); st.push({ x, y }); } }
    assert.ok(seen.has(e.y * W + e.x), `${b.key}'s arrival joins the chamber`); }
  // seams: roof to roof anywhere along a seam; never a parapet, never on a v6 Pentagon
  let roofSeams = 0; for (let v = 0; v < 32; v++) { if (pentagonSeamOpen(cx, cy, cx, cy - 1, 1, 0, v, v, true)) { roofSeams++; assert.ok(!pentagonSeamOpen(cx, cy, cx, cy - 1, 1, 0, v, v, false) || regionAt(64, v).kind === 'court' || regionAt(64, v).kind === 'central'); } }
  assert.ok(roofSeams >= 3, `${roofSeams} roof tiles across the seam`);
});

test('pentagonRoofAt and pentagonRoofSpots: the roof walk and a deterministic, spaced handful of perches on it', () => {
  const { cx, cy } = find(), g = game(); let total = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { visit(g, cx + dx, cy + dy); const m = g.map;
    for (const t of m.tiles) assert.equal(pentagonRoofAt(m, t.x, t.y), !!(t.pentRoof || t.pentBalcony) && !t.blocked, `${t.x},${t.y}`);
    const spots = pentagonRoofSpots(m); assert.deepEqual(spots, pentagonRoofSpots(JSON.parse(JSON.stringify(m)))); assert.ok(spots.length <= PENTAGON.roof.perch.max); total += spots.length;
    for (const s of spots) { const t = m.tiles[s.y * 32 + s.x]; assert.ok(t.pentRoof && !t.blocked && !t.pentBalcony); assert.ok(s.x >= 2 && s.x <= 29 && s.y >= 2 && s.y <= 29); }
    for (const a of spots) for (const b of spots) if (a !== b) assert.ok(Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) >= PENTAGON.roof.perch.spacing); }
  assert.ok(total >= 12, `${total} perches round the Pentagon`);
  const v6 = visit(pinned(SEED, cx, cy, 6), cx, cy + 1); assert.ok(!v6.map.pentagon.roof); assert.deepEqual(pentagonRoofSpots(v6.map), []); assert.ok(!v6.map.tiles.some((t) => pentagonRoofAt(v6.map, t.x, t.y)));
});

test('v7 reload: a save on a balcony resumes there; the roof and balconies regenerate the same', () => {
  const { cx, cy } = find(), P = pentagonPlan(SEED, cx, cy, V7), b = P.ledges.balconies[0], g = game(), rx = cx - 1 + Math.floor(b.out.gx / 32), ry = cy - 1 + Math.floor(b.out.gy / 32);
  visit(g, rx, ry); g.player.x = b.out.gx % 32; g.player.y = b.out.gy % 32; const before = JSON.stringify(g.map.tiles); g.sync?.();
  const h = game(SEED, migrateSave(JSON.parse(JSON.stringify(g.save)))); h.loadArea('overworld', false); assert.equal(JSON.stringify(h.map.tiles), before);
  assert.ok(h.map.tiles[Math.round(h.player.y) * 32 + Math.round(h.player.x)]?.pentBalcony, "resumes on the balcony");
});

// Release 738's section terrain cache holds only the terrain passes; the Pentagon is laid after, on the copy it hands out.
test('the terrain cache: a v7 section never gets a v6 Pentagon, nor a v6 one a v7, whichever loads first', () => {
  const { cx, cy } = find(), rx = cx, ry = cy + 1, snap = (g) => JSON.stringify([g.map.tiles, g.map.objects.filter((o) => o.kind !== 'traveler'), g.map.pentagon]);
  const fresh = (mk) => { clearSectionTerrainCache(); return snap(visit(mk(), rx, ry)); };
  const v6 = () => pinned(SEED, cx, cy, 6), v7 = () => pinned(SEED, cx, cy, 7) /* release 795: new ground is version 8 */, want6 = fresh(v6), want7 = fresh(v7);
  assert.ok(want6.includes(':v6:') && !want6.includes(':v7:') && !want6.includes('pentRoof')); assert.ok(want7.includes(':v7:') && !want7.includes(':v6:') && want7.includes('pentRoof'));
  for (const order of [[v6, v7], [v7, v6]]) { clearSectionTerrainCache(); const [a, b] = order.map((mk) => visit(mk(), rx, ry)); assert.ok(sectionTerrainCacheStats().hits >= 1, 'the second load is served from the cache');
    for (const [gm, mk] of [[a, order[0]], [b, order[1]]]) assert.equal(snap(gm), mk === v6 ? want6 : want7); }
});

test('the roof, its parapet, balconies and stair draw without throwing, on the roof, on a balcony, on the stair and below', () => {
  const ctx = new Proxy({ createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}), measureText: () => ({ width: 10 }), getTransform: () => ({}), ellipse(x, y, rx, ry) { if (rx < 0 || ry < 0) throw new RangeError('negative'); }, arc(x, y, r) { if (r < 0) throw new RangeError('negative'); } }, { get: (o, k) => k in o ? o[k] : () => {}, set: () => true });
  const { cx, cy } = find(), P = pentagonPlan(SEED, cx, cy, V7), g = game();
  for (const c of [...P.ledges.balconies.map((b) => b.out), ...P.ledges.balconies.map((b) => b.door), P.ledges.stair.cells[2], P.ledges.stair.foot]) { visit(g, cx - 1 + Math.floor(c.gx / 32), cy - 1 + Math.floor(c.gy / 32)); g.player.x = c.gx % 32; g.player.y = c.gy % 32; assert.doesNotThrow(() => render(ctx, g, 360, 640, 5000)); }
  const rec = g.map.objects.find((o) => o.kind === 'greatBuilding' && o.pentagon); assert.ok(rec.parapet.length && rec.pentRoof === R0);
});
