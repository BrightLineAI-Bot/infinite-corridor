// Great Castles (Tim, 2026-11-03): a castle across a couple of sections, whose traversal means going in and out of its buildings:
// doors only reachable from a courtyard, courtyards reached only through the right wing, the keep's boss and treasure at the top.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { canStep } from '../src/landscape.ts';
import { sectionExits } from '../src/world.ts';
import { render } from '../src/renderer.ts';
import { CASTLES, castleCorner, castleTopology, castleLayout, quarterSection, generateCastleFloor } from '../src/castles.ts';

const SEED = 'TIM1';
const game = (save = null) => { const s = save || freshSave(); s.seed = SEED; return new Game(s, 0); };
let corner = null;
const find = () => { if (corner) return corner; const g = game(); for (let d = 3; d < 60 && !corner; d += 3) for (let X = -d; X <= d && !corner; X += 3) for (const Y of [d - Math.abs(X), Math.abs(X) - d]) if (g.castleHere(X, Y)) { corner = { X, Y }; break; } return corner; };
const visit = (g, s) => { g.rx = s.rx; g.ry = s.ry; g.loadArea('overworld', false); return g; };
const walkFromMiddle = (map) => { const me = { isPlayer: true, jumping: false }, seen = new Set([16 * 32 + 16]), q = [16 * 32 + 16];
  for (let i = 0; i < q.length; i++) { const k = q[i], px = k % 32, py = (k / 32) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = px + dx, y = py + dy, n = y * 32 + x, t = map.tiles[n]; if (x < 0 || y < 0 || x > 31 || y > 31 || seen.has(n) || !t || t.blocked || !canStep(me, map, 32, px, py, x, y)) continue; seen.add(n); q.push(n); } }
  return seen; };

test('castles stand on a grid of corners, four sections each, never where a lane would reach the corner', () => {
  const g = game(); let n = 0, all = 0;
  for (let X = -36; X <= 36; X += CASTLES.every) for (let Y = -36; Y <= 36; Y += CASTLES.every) { all++; if (!g.castleHere(X, Y)) continue; n++;
    const Q = CASTLES.Q, nw = sectionExits(SEED, X - 1, Y - 1), sw = sectionExits(SEED, X - 1, Y), ne = sectionExits(SEED, X, Y - 1);
    assert.ok(nw.east <= 32 - Q - 2 && sw.east >= Q + 1 && nw.south <= 32 - Q - 2 && ne.south >= Q + 1, 'lanes keep clear of the corner');
    for (let q = 0; q < 4; q++) { const s = quarterSection(X, Y, q), c = castleCorner(s.rx, s.ry); assert.deepEqual([c.X, c.Y, c.q], [X, Y, q]); assert.ok(Math.abs(s.rx) + Math.abs(s.ry) >= CASTLES.minRing); } }
  assert.ok(n > 10 && n < all * .35, `${n} castles on ${all} corners`); assert.ok(find());
});

test('each of the four sections holds its quarter: wing, walled court, curtain wall on its edges; the courtyards cannot be walked into; the gates can', () => {
  const { X, Y } = find(), g = game(), T = castleTopology(SEED, X, Y), L = castleLayout(SEED, X, Y);
  for (let q = 0; q < 4; q++) { visit(g, quarterSection(X, Y, q)); const B = g.map.objects.find((o) => o.castle); assert.ok(B, `quarter ${q}`); const m = g.map;
    const court = m.tiles.filter((t) => t.courtyard); assert.ok(court.length >= 20); assert.ok(court.every((t) => t.x > 0 && t.x < 31 && t.y > 0 && t.y < 31), 'the curtain wall keeps the court off the section edge');
    const seen = walkFromMiddle(m); assert.ok(court.every((t) => !seen.has(t.y * 32 + t.x)), 'no walking into a court from the land');
    const gate = m.objects.find((o) => o.castleDoor && o.enterAt === 'outer'); assert.equal(!!gate, !!T.wings[q].outer); if (gate) assert.ok(seen.has(gate.y * 32 + gate.x), 'its causeway reaches the gate');
    assert.equal(!!m.objects.find((o) => o.castleDoor && o.dungeonId.includes(':k:')), q === T.k, 'the keep in one court'); }
  assert.ok(!T.wings[T.k].outer, 'no gate opens on the keep\'s quarter'); assert.equal(T.a, 3 - T.k, 'the gate is diagonal to the keep');
});

test('the way through: in at the gate, out into the next section\'s court, through that wing into the keep\'s court, up to its lord and treasure; its gate lets you out at the front', () => {
  const { X, Y } = find(), g = game(), T = castleTopology(SEED, X, Y), sec = (q) => quarterSection(X, Y, q);
  const act = (o, a) => { assert.ok(o, a); g.player.x = o.x; g.player.y = o.y; const r = g.interact(a, o.id); assert.ok(r.ok, r.message); };
  const climbTo = (f) => { while (g.map.building.floor < f) act(g.map.objects.find((o) => o.kind === 'buildingStair' && o.dir === 'up'), 'climb'); };
  visit(g, sec(T.a)); const gate = g.map.objects.find((o) => o.castleDoor && o.enterAt === 'outer'), front = { x: gate.x, y: gate.y }; act(gate, 'enter');
  const s1 = T.wings[T.a].sides[0]; climbTo(s1.floor); act(g.map.objects.find((o) => o.id === `building-exit-side${s1.to}`), 'exit');
  assert.equal(g.area, 'overworld'); assert.deepEqual([g.rx, g.ry], [sec(T.b).rx, sec(T.b).ry], 'another section'); assert.ok(g.map.tiles[Math.round(g.player.y) * 32 + Math.round(g.player.x)].courtyard);
  act(g.map.objects.find((o) => o.castleDoor && o.enterAt === 'court' && o.dungeonId.includes(`:w${T.b}:`)), 'enter');
  const s2 = T.wings[T.b].sides[0]; climbTo(s2.floor); act(g.map.objects.find((o) => o.id === `building-exit-side${s2.to}`), 'exit'); assert.deepEqual([g.rx, g.ry], [sec(T.k).rx, sec(T.k).ry]);
  act(g.map.objects.find((o) => o.castleDoor && o.dungeonId.includes(':k:')), 'enter'); climbTo(T.keep.floors);
  assert.ok(g.map.objects.some((o) => o.kind === 'chest')); assert.ok(g.enemies.find((e) => e.id.endsWith(':guardian'))?.affixes?.length, 'its lord');
  act(g.map.objects.find((o) => o.id === 'building-exit-gate'), 'exit'); assert.deepEqual([g.rx, g.ry, g.player.x, g.player.y], [sec(T.a).rx, sec(T.a).ry, front.x, front.y], 'out at the gate');
});

test('the keep\'s court is reached only by the right wing: no gate, no other door leads there', () => {
  for (let i = 0; i < 200; i++) { const T = castleTopology('T' + i, i * 3, -i * 3), into = (q) => T.wings.filter((w) => w.sides.some((s) => s.to === q)).map((w) => w.q);
    assert.deepEqual(into(T.k), [T.b]); assert.ok(!T.wings[T.k].outer && !T.wings[T.b].outer); assert.deepEqual(into(T.b), [T.a]); assert.ok(T.wings[T.a].outer); }
});

test('only on new ground: a corner with one section explored before castles has no castle in any of its four', () => {
  const { X, Y } = find(), s = freshSave(); s.seed = SEED; const other = quarterSection(X, Y, 3); (s.atlas ||= {})[`${other.rx},${other.ry}`] = { landscapeVersion: 14 };
  const g = game(s); assert.ok(!g.castleHere(X, Y)); visit(g, quarterSection(X, Y, 0)); assert.ok(!g.map.objects.some((o) => o.castle));
});

test('inside every wing and the keep, every floor holds together and its doors stand on their floors', () => {
  const bad = []; for (let i = 0; i < 30; i++) { const X = i * 3, Y = -i * 3, T = castleTopology('SW', X, Y);
    for (const p of [...T.wings, T.keep]) for (let f = 1; f <= p.floors; f++) { const m = generateCastleFloor('SW', `castle:SW:${X}:${Y}:${p.part}:${p.floors}:f${f}`), W = m.width, seen = new Set([m.entry.y * W + m.entry.x]), q = [m.entry];
      while (q.length) { const c = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = c.x + dx, y = c.y + dy, k = y * W + x, t = m.tiles[k]; if (!t || seen.has(k) || t.blocked || t.hole) continue; seen.add(k); q.push({ x, y }); } }
      if (m.tiles.some((t, k) => !t.blocked && !t.hole && !seen.has(k))) bad.push(`${p.part} f${f}: cut off`);
      for (const sd of p.sides || []) if (sd.floor === f && !m.objects.some((o) => o.id === `building-exit-side${sd.to}`)) bad.push(`${p.part} f${f}: side door`);
      for (const o of m.objects) if (o.kind === 'exit' && !m.building.exitsTo[o.id]) bad.push(`${p.part} f${f}: an exit to nowhere`); } }
  assert.deepEqual(bad, []);
});

test('the quarters draw without throwing', () => {
  const ctx = new Proxy({ createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 10 }), getTransform: () => ({}), ellipse(x, y, rx, ry) { if (rx < 0 || ry < 0) throw new RangeError('negative'); }, arc(x, y, r) { if (r < 0) throw new RangeError('negative'); } }, { get: (o, k) => k in o ? o[k] : () => {}, set: () => true });
  const { X, Y } = find(), g = game(); for (let q = 0; q < 4; q++) { visit(g, quarterSection(X, Y, q)); const c = g.map.tiles.find((t) => t.courtyard); for (const [x, y] of [[16, 16], [c.x, c.y]]) { g.player.x = x; g.player.y = y; assert.doesNotThrow(() => render(ctx, g, 360, 640, 5000)); } }
});
