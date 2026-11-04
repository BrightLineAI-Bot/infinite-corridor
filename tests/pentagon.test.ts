// The Pentagon (Tim, 2026-11-04): a five-sided megastructure over nine sections, rings of building round ring courts round a
// central court; inside, chambers joined round the rings; a key, a pressure plate built on, three trials, the Heart and its vault.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { render } from '../src/renderer.ts';
import { PENTAGON, pentagonPlan, pentagonCentre, regionAt, generatePentagonChamber, parsePentagonId } from '../src/pentagon.ts';

const SEED = 'TIM1';
const game = (seed = SEED, save = null) => { const s = save || freshSave(); s.seed = seed; return new Game(s, 0); };
const findIn = (g) => { for (let cx = -64; cx <= 64; cx += PENTAGON.every) for (let cy = -64; cy <= 64; cy += PENTAGON.every) if (g.pentagonHere(cx, cy)) return { cx, cy }; return null; };
let found = null; const find = () => (found ||= findIn(game()));
const visit = (g, rx, ry) => { g.rx = rx; g.ry = ry; g.loadArea('overworld', false); return g; };
// the nine sections as one 96×96 ground, and where each world door stands on it
const ground = (g, cx, cy) => { const G = new Array(96 * 96), doors = new Map();
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { visit(g, cx + dx, cy + dy); for (const t of g.map.tiles) G[((dy + 1) * 32 + t.y) * 96 + (dx + 1) * 32 + t.x] = t;
    for (const o of g.map.objects.filter((o) => o.pentagonDoor)) doors.set(o.enterAt, { gx: (dx + 1) * 32 + o.x, gy: (dy + 1) * 32 + o.y, rx: g.rx, ry: g.ry }); }
  const flood = (gx, gy) => { const seen = new Set([gy * 96 + gx]), q = [[gx, gy]]; while (q.length) { const [x, y] = q.pop(); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + a, Y = y + b, k = Y * 96 + X; if (X < 0 || Y < 0 || X > 95 || Y > 95 || seen.has(k) || G[k].blocked) continue; seen.add(k); q.push([X, Y]); } } return seen; };
  return { G, doors, flood }; };

test('Pentagons stand on a grid of centres, nine sections each, a five-sided wall of building round courts within courts', () => {
  const { cx, cy } = find(); assert.ok(Math.abs(cx) + Math.abs(cy) >= PENTAGON.minRing);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) assert.deepEqual(pentagonCentre(cx + dx, cy + dy), { cx, cy });
  assert.equal(pentagonCentre(cx + 2, cy), null);
  const kinds = new Set(); for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) kinds.add(regionAt(x, y).kind);
  assert.deepEqual([...kinds].sort(), ['central', 'court', 'heart', 'inner', 'outer', 'outside', 'wall']);
  const g = game(); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { visit(g, cx + dx, cy + dy); assert.ok(g.map.objects.some((o) => o.kind === 'greatBuilding' && o.pentagon), `section ${dx},${dy}`); assert.ok(g.map.pentagon);
    assert.ok(!g.map.objects.some((o) => o.castle || o.labyrinthDoor || o.compoundDoor), 'nothing else built into it'); }
  let n = 0, all = 0; for (let x = -64; x <= 64; x += 8) for (let y = -64; y <= 64; y += 8) { all++; if (g.pentagonHere(x, y)) n++; } assert.ok(n > 5 && n < all * .6, `${n} of ${all}`);
});

test('outside: the gates open onto the land; each court is walled off from the land and the other courts; its own doors share it', () => {
  for (const seed of [SEED, 'S17', 'S21']) { const g = game(seed), { cx, cy } = findIn(g), P = pentagonPlan(seed, cx, cy), { doors, flood } = ground(g, cx, cy), places = {};
    for (const w of P.world) if (!w.toGate) (places[w.place] ||= []).push(w.key);
    for (const [place, keys] of Object.entries(places)) for (const k of keys) { const d = doors.get(k); assert.ok(d, `${seed}: door ${k} placed`); const seen = flood(d.gx, d.gy);
      if (place === 'land') assert.ok(seen.size >= 400 || [...seen].some((q) => q % 96 === 0 || q % 96 === 95 || q < 96 || q >= 95 * 96), `${seed}: gate ${k} opens on the land`);
      for (const [k2, d2] of doors) { const same = keys.includes(k2), got = seen.has(d2.gy * 96 + d2.gx); if (!same) assert.ok(!got, `${seed}: ${k} walks to ${k2}`); else if (place !== 'land') assert.ok(got, `${seed}: ${k} reaches ${k2}`); } } }
});

test('the plan: every chamber can be reached; the key lies before its door; the plate and three trials on the way; the Heart sealed by them', () => {
  for (let i = 0; i < 300; i++) { const seed = 'P' + i, P = pentagonPlan(seed, i * 8, -i * 8), adj = new Map(), link = (a, b) => { (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); };
    for (const e of P.edges) link(e.a, e.b); for (const w of P.world) if (!w.toGate) link(w.node, w.place);
    const reach = (skip) => { const seen = new Set(['land']), st = ['land']; while (st.length) { const v = st.pop(); for (const u of adj.get(v) || []) if (!seen.has(u) && !skip(v, u)) { seen.add(u); st.push(u); } } return seen; };
    const lock = P.world.find((w) => w.lock), heart = P.world.find((w) => w.sealed === 'trials'), shut = (w) => (v, u) => (v === w.node && u === w.place) || (u === w.node && v === w.place);
    const all = reach(shut(heart)); for (const q of P.nodes) if (q.kind !== 'heart') assert.ok(all.has(q.id), `${seed}: ${q.id} cut off`);
    assert.ok(all.has('central')); assert.ok(lock && P.keyNode, `${seed}: a key and its door`);
    assert.ok(reach((v, u) => shut(lock)(v, u) || shut(heart)(v, u)).has(P.keyNode), `${seed}: the key lies before its door`);
    assert.equal(P.trials.length, PENTAGON.trials); assert.ok(P.plateE && all.has(P.plateE.a));
    assert.equal(P.world.filter((w) => w.place === 'land' && !w.toGate).length, 2, 'two gates'); }
});

test('the way through: in at a gate; the plate holds its door only with a block built on it; the key opens its door; the Heart opens after three trials; the vault, its regent and hoard; out at the gate', () => {
  const g = game(), { cx, cy } = find(), P = pentagonPlan(SEED, cx, cy), { doors } = ground(g, cx, cy), base = `pentagon:${SEED}:${cx}:${cy}`, H = () => g.save.consequences.dungeons[`${base}:f1`] || {};
  let T = 1e6, place = 'land'; const tick = () => g.update(.05, { state: { x: 0, y: 0 }, consume: () => false, held: () => false }, (T += 50));
  const act = (o, a) => { assert.ok(o, a); g.player.x = o.x; g.player.y = o.y; return g.interact(a, o.id); };
  const moves = (v) => { const keys = H().labKeys || [], trials = (H().pentTrials || []).length, out = [];
    for (const e of P.edges) { if (e.a === v) out.push({ to: e.b, edge: e }); if (e.b === v) out.push({ to: e.a, edge: e }); }
    for (const w of P.world) { if (w.toGate) { if (w.node === v) out.push({ to: 'land', exit: w }); continue; } if (w.node === v) out.push({ to: w.place, exit: w }); if (w.place === v) out.push({ to: w.node, enter: w }); }
    return out.filter((m) => !((m.exit || m.enter)?.lock && !keys.includes((m.exit || m.enter).lock)) && !(m.enter?.sealed && trials < PENTAGON.trials)); };
  const path = (from, to) => { const prev = new Map([[from, null]]), q = [from]; while (q.length) { const v = q.shift(); for (const m of moves(v)) if (!prev.has(m.to)) { prev.set(m.to, { v, m }); q.push(m.to); } } if (!prev.has(to)) return null; const p = []; for (let c = to; prev.get(c); c = prev.get(c).v) p.unshift(prev.get(c).m); return p; };
  let plated = false;
  const hop = (m) => {
    if (m.edge) { const o = g.map.objects.find((o) => o.kind === 'buildingStair' && o.toId === `${base}:f${P.nodes.find((n) => n.id === m.to).n + 1}`); assert.ok(o, `a door ${place} to ${m.to}`);
      if (o.plateLock && !plated) { assert.ok(!act(o, o.actions[0]).ok, 'the plate door will not hold open on its own'); act(g.map.objects.find((q) => q.kind === 'pentRubble'), 'take'); const pl = g.map.tiles.find((t) => t.plate), W = g.map.width;
        const [a, b] = [[-1, 0], [1, 0], [0, -1], [0, 1]].find(([a, b]) => !g.map.tiles[(pl.y + b) * W + pl.x + a]?.blocked); g.player.x = pl.x + a; g.player.y = pl.y + b - .25;
        assert.ok(g.buildAt(pl.x + .5, pl.y + .5).ok, 'a block built on the plate'); plated = true; }
      const r = act(o, o.actions[0]); assert.ok(r.ok, r.message); }
    else if (m.exit) { const r = act(g.map.objects.find((o) => o.id === `building-exit-${m.exit.key}`), 'exit'); assert.ok(r.ok, r.message); assert.equal(g.area, 'overworld'); const t = g.map.tiles[Math.round(g.player.y) * 32 + Math.round(g.player.x)]; assert.ok(!t.blocked); if (m.to !== 'land') assert.ok(t.courtyard, 'let out into a court'); }
    else { const d = doors.get(m.enter.key); visit(g, d.rx, d.ry); const r = act(g.map.objects.find((o) => o.enterAt === m.enter.key), 'enter'); assert.ok(r.ok, r.message); }
    place = m.to; if (/^[oih]\d/.test(m.to)) assert.equal(P.nodes[g.map.building.node].id, m.to); };
  const go = (to) => { const p = path(place, to); if (!p) return false; p.forEach(hop); return true; };
  const there = () => { const k = g.map.objects.find((o) => o.kind === 'labKey'); if (k) assert.ok(act(k, 'take').ok); const rl = g.map.objects.find((o) => o.kind === 'pentRelic' && o.state !== 'read'); if (rl) assert.ok(act(rl, 'read').ok);
    if (g.map.building.trial) { for (const e of g.enemies) if (e.buildingGuard) { e.hp = 0; e.dead = true; } tick(); } };
  const hs = doors.get('heart'); visit(g, hs.rx, hs.ry); assert.ok(!act(g.map.objects.find((o) => o.enterAt === 'heart'), 'enter').ok, 'the Heart is sealed at first');
  const gs = doors.get(P.gate.key); visit(g, gs.rx, gs.ry); const gate = g.map.objects.find((o) => o.enterAt === P.gate.key), front = { rx: g.rx, ry: g.ry, x: gate.x, y: gate.y };
  for (let round = 0; round < 6 && !path(place, 'h2'); round++) for (const t of [P.keyNode, ...P.trials, P.plateE.b]) if (go(t)) there();
  assert.deepEqual(H().labKeys, ['key0']); assert.equal(H().pentTrials.length, PENTAGON.trials); assert.ok(H().pentRelics?.length >= 1, 'relics read on the way');
  assert.ok(go('h2'), 'the vault reached'); assert.ok(g.map.building.vault); assert.ok(g.enemies.find((e) => e.id.endsWith(':guardian') && e.kind === PENTAGON.regent), 'the Regent'); assert.ok(g.map.objects.some((o) => o.kind === 'chest'));
  hop({ to: 'land', exit: P.world.find((w) => w.toGate) }); assert.deepEqual([g.rx, g.ry], [front.rx, front.ry]); assert.ok(Math.hypot(g.player.x - front.x, g.player.y - front.y) < 2.5, 'out at the gate');
});

test('inside every chamber its doors, key, relic, rubble, plate and ghouls stand on ground reachable from where you come in', () => {
  const bad = []; for (const [seed, cx, cy] of [[SEED, find().cx, find().cy], ['Q1', 8, 16], ['Q2', -24, 40], ['Q3', 40, 0]]) { const P = pentagonPlan(seed, cx, cy);
    for (const q of P.nodes) { const m = generatePentagonChamber(seed, `pentagon:${seed}:${cx}:${cy}:f${q.n + 1}`), W = m.width, seen = new Set([m.entry.y * W + m.entry.x]), st = [m.entry];
      while (st.length) { const c = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = c.x + dx, y = c.y + dy, k = y * W + x, t = m.tiles[k]; if (x < 0 || x >= W || !t || seen.has(k) || t.blocked) continue; seen.add(k); st.push({ x, y }); } }
      for (const o of m.objects) if (!seen.has(o.y * W + o.x)) bad.push(`${seed} ${q.id}: ${o.id}`); for (const e of m.enemySpawns) if (!seen.has(e.y * W + e.x)) bad.push(`${seed} ${q.id}: ${e.id}`);
      for (const t of m.tiles.filter((t) => t.plate)) if (!seen.has(t.y * W + t.x)) bad.push(`${seed} ${q.id}: plate`);
      if (q.trial) assert.equal(m.enemySpawns.length, PENTAGON.trialGuards); assert.equal(parsePentagonId(m.id).n, q.n); }
    assert.deepEqual(generatePentagonChamber(seed, `pentagon:${seed}:${cx}:${cy}:f3`).tiles, generatePentagonChamber(seed, `pentagon:${seed}:${cx}:${cy}:f3`).tiles); }
  assert.deepEqual(bad, []);
});

test('within its nine sections you cross an edge where you stand; only on new ground; no castle in its sections', () => {
  const { cx, cy } = find(), g = game(); visit(g, cx, cy);
  const row = [...Array(32).keys()].find((y) => { const a = g.map.tiles[y * 32 + 31]; if (a.blocked) return false; const h = game(); visit(h, cx + 1, cy); return !h.map.tiles[y * 32].blocked; });
  assert.ok(row !== undefined, 'open ground runs on east'); g.player.x = 31; g.player.y = row; g.transitionSection(1, 0); assert.deepEqual([g.rx, g.ry], [cx + 1, cy]); assert.equal(Math.round(g.player.y), row, 'kept its place along the edge');
  const s = freshSave(); s.seed = SEED; (s.atlas ||= {})[`${cx - 1},${cy + 1}`] = { landscapeVersion: 14 }; const old = game(SEED, s); assert.ok(!old.pentagonHere(cx, cy)); visit(old, cx, cy); assert.ok(!old.map.pentagon);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { visit(g, cx + dx, cy + dy); assert.ok(!g.map.objects.some((o) => o.castle), 'no castle quarter in it'); }
});

test('the sections and the chambers draw without throwing', () => {
  const ctx = new Proxy({ createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 10 }), getTransform: () => ({}), ellipse(x, y, rx, ry) { if (rx < 0 || ry < 0) throw new RangeError('negative'); }, arc(x, y, r) { if (r < 0) throw new RangeError('negative'); } }, { get: (o, k) => k in o ? o[k] : () => {}, set: () => true });
  const { cx, cy } = find(), g = game(), P = pentagonPlan(SEED, cx, cy);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { visit(g, cx + dx, cy + dy); for (const [x, y] of [[16, 16], [3, 28]]) { g.player.x = x; g.player.y = y; assert.doesNotThrow(() => render(ctx, g, 360, 640, 5000)); } }
  for (const id of [P.keyNode, P.plateE.a, P.trials[0], 'h2']) { const q = P.nodes.find((n) => n.id === id); g.save.session.activeDungeonId = `pentagon:${SEED}:${cx}:${cy}:f${q.n + 1}`; g.loadArea('dungeon', false); assert.ok(g.map.building.pentagon); assert.doesNotThrow(() => render(ctx, g, 360, 640, 5000), id); }
});
