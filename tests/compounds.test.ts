// Compounds (Tim, 2026-11-03): courtyards in the middle, many doors leading different ways, some only from the courtyard; a
// wall walk; mazes where you go in and out through different doors and floors to reach the tower's boss and treasure room.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { sectionRegion, LANDSCAPE_VERSION, canStep } from '../src/landscape.ts';
import { COMPOUNDS, compoundHere, compoundTopology, generateCompoundFloor, parseCompoundId } from '../src/compounds.ts';
import { render } from '../src/renderer.ts';

const SEED = 'TIM1';
const visit = (rx, ry, save = null) => { const s = save || freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); return g; };
const found = {};
const find = (maze) => { const k = String(maze); if (found[k]) return found[k]; for (let d = COMPOUNDS.minRing; d < 40 && !found[k]; d++) for (let x = -d; x <= d && !found[k]; x++) for (const y of [d - Math.abs(x), Math.abs(x) - d]) { if (!compoundHere(SEED, x, y, sectionRegion(SEED, x, y, LANDSCAPE_VERSION))) continue; const g = visit(x, y), c = g.map.objects.find((o) => o.compound); if (c && c.maze === maze) { found[k] = { x, y }; break; } } return found[k]; };
const act = (g, o, a) => { g.player.x = o.x; g.player.y = o.y; const r = g.interact(a, o.id); assert.ok(r.ok, r.message); return r; };
const climbAll = (g) => { for (let i = 0; i < 8; i++) { const up = g.map.objects.find((o) => o.kind === 'buildingStair' && o.dir === 'up'); if (!up) return; act(g, up, 'climb'); } };
const downAll = (g) => { for (let i = 0; i < 8; i++) { const dn = g.map.objects.find((o) => o.kind === 'buildingStair' && o.dir === 'down'); if (!dn) return; act(g, dn, 'descend'); } };
const partOf = (o) => o.id.match(/-(w[0-3]|t)-(outer|court|hatch)$/);
const walkFromMiddle = (map) => { const me = { isPlayer: true, jumping: false }, seen = new Set([16 * 32 + 16]), q = [16 * 32 + 16];
  for (let i = 0; i < q.length; i++) { const k = q[i], px = k % 32, py = (k / 32) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = px + dx, y = py + dy, n = y * 32 + x, t = map.tiles[n]; if (x < 0 || y < 0 || x > 31 || y > 31 || seen.has(n) || !t || t.blocked || !canStep(me, map, 32, px, py, x, y)) continue; seen.add(n); q.push(n); } }
  return seen; };

test('compounds stand past the heartland in some new sections, keeps, arcology blocks and hives; mazes and simple ones', () => {
  let rolled = 0, built = 0, styles = new Set(); for (let x = -12; x <= 12; x++) for (let y = -12; y <= 12; y++) { const p = compoundHere(SEED, x, y, sectionRegion(SEED, x, y, LANDSCAPE_VERSION)); if (!p) continue; rolled++; assert.ok(Math.abs(x) + Math.abs(y) >= COMPOUNDS.minRing); styles.add(p.style); if (rolled <= 40 && visit(x, y).map.objects.some((o) => o.compound)) built++; }
  assert.ok(rolled > 40, `${rolled} rolled`); assert.ok(built >= 8, `${built} of 40 built`); assert.ok(styles.has('keep') && styles.size >= 2, [...styles].join());
  assert.ok(find(true), 'a maze compound'); assert.ok(find(false), 'a simple compound');
});

test('the topology always leads from outside to the courtyard and the tower; in a maze no outer door opens on the courtyard', () => {
  for (let i = 0; i < 300; i++) { const T = compoundTopology(SEED, i, -i, 'keep');
    assert.ok(T.wings.some((q) => q.outer), 'an outer door'); assert.ok(T.wings.some((q) => q.court), 'a courtyard door'); assert.ok(T.tower.court);
    if (T.maze) { assert.ok(T.wings.every((q) => !(q.outer && q.court)), 'maze'); assert.ok(T.wings.filter((q) => q.outer || q.court).every((q) => q.hatch), 'joined by the wall walk'); } }
});

test('outside: a ring of wings round a courtyard the land cannot walk into; the wall walk high above, joining its hatches', () => {
  const at = find(true), g = visit(at.x, at.y), C = g.map.objects.find((o) => o.compound), m = g.map, W = 32, ring = C.blocks[0].cells;
  assert.ok(ring.every(({ x, y }) => m.tiles[y * W + x].elev === COMPOUNDS.elev), 'the wall walk is high ground');
  const court = m.tiles.filter((t) => t.courtyard); assert.ok(court.length > 0); const seen = walkFromMiddle(m);
  assert.ok(court.every((t) => !seen.has(t.y * W + t.x)), 'no walking into the courtyard from the land');
  const outer = m.objects.filter((o) => o.compoundDoor && o.enterAt === 'outer'); assert.ok(outer.length >= 1 && outer.every((o) => seen.has(o.y * W + o.x)), 'every outer door can be walked to');
  const hatches = m.objects.filter((o) => o.roofHatch && !o.id.includes('-t-')), roof = (t) => t?.structure === 'buildingRoof' && !t.blocked && t.elev === COMPOUNDS.elev;
  const s0 = new Set([hatches[0].y * W + hatches[0].x]), q = [hatches[0]]; while (q.length) { const p = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = p.x + dx, y = p.y + dy, k = y * W + x; if (!s0.has(k) && roof(m.tiles[k])) { s0.add(k); q.push({ x, y }); } } }
  assert.ok(hatches.every((o) => s0.has(o.y * W + o.x)), 'one wall walk joins them');
  assert.ok(m.objects.filter((o) => o.compoundDoor && o.enterAt === 'court').every((o) => m.tiles[o.y * W + o.x].courtyard), 'courtyard doors open on the courtyard');
});

test('the maze, walked: in by an outer door, no way to the courtyard there; up, along the wall walk, down another wing, across the courtyard, up the tower to the boss and the treasure', () => {
  const at = find(true), g = visit(at.x, at.y), od = g.map.objects.find((o) => o.compoundDoor && o.enterAt === 'outer'), wingA = partOf(od)[1];
  act(g, od, 'enter'); assert.equal(g.area, 'dungeon'); assert.ok(g.map.building.compound); assert.ok(!g.map.objects.some((o) => o.id === 'building-exit-court'), 'this wing has no courtyard door');
  climbAll(g); const rl = g.map.objects.find((o) => o.dir === 'roof'); assert.ok(rl, 'a ladder to the wall walk'); act(g, rl, 'climb');
  assert.equal(g.area, 'overworld'); const here = g.map.tiles[Math.round(g.player.y) * 32 + Math.round(g.player.x)]; assert.equal(here.elev, COMPOUNDS.elev, 'on the wall walk');
  const courtWing = g.map.objects.find((o) => o.compoundDoor && o.enterAt === 'court' && partOf(o)[1] !== 't'), wingB = partOf(courtWing)[1]; assert.notEqual(wingA, wingB);
  const hatchB = g.map.objects.find((o) => o.roofHatch && partOf(o)[1] === wingB); act(g, hatchB, 'enter'); assert.equal(g.map.building.floor, g.map.building.floors); downAll(g);
  const cd = g.map.objects.find((o) => o.id === 'building-exit-court'); assert.ok(cd); act(g, cd, 'exit');
  assert.equal(g.area, 'overworld'); assert.ok(g.map.tiles[Math.round(g.player.y) * 32 + Math.round(g.player.x)].courtyard, 'in the courtyard');
  const td = g.map.objects.find((o) => o.compoundDoor && partOf(o)?.[1] === 't' && o.enterAt === 'court'); act(g, td, 'enter'); climbAll(g);
  assert.equal(g.map.building.part, 't'); assert.equal(g.map.building.floor, g.map.building.floors); assert.ok(g.map.objects.some((o) => o.kind === 'chest'), 'the treasure');
  const boss = g.enemies.find((e) => e.id.endsWith(':guardian')); assert.ok(boss && boss.affixes?.length, 'the boss');
});

test('every door lets you out where it stands: an outer door outside, a courtyard door in the courtyard', () => {
  const at = find(false), g = visit(at.x, at.y), od = g.map.objects.find((o) => o.compoundDoor && o.enterAt === 'outer'), part = partOf(od)[1];
  act(g, od, 'enter'); let ex = g.map.objects.find((o) => o.id === 'building-exit-court');
  if (ex) { act(g, ex, 'exit'); const cd = g.map.objects.find((o) => o.compoundDoor && o.enterAt === 'court' && partOf(o)[1] === part); assert.deepEqual([g.player.x, g.player.y], [cd.x, cd.y]); act(g, cd, 'enter'); }
  ex = g.map.objects.find((o) => o.id === 'building-exit-outer'); act(g, ex, 'exit'); assert.deepEqual([g.player.x, g.player.y], [od.x, od.y]);
});

test('inside every part, every floor holds together and its doors are on floor 1', () => {
  const bad = []; for (let i = 0; i < 40; i++) { const st = ['keep', 'apartment', 'hive'][i % 3], T = compoundTopology('SW', i, i * 3, st);
    for (const p of T.parts) { const base = `compound:SW:${i}:${i * 3}:${st}:${p.part}:${p.floors}${p.hatch ? 'r' : ''}`;
      for (let f = 1; f <= p.floors; f++) { const m = generateCompoundFloor('SW', `${base}:f${f}`), W = m.width, start = f === 1 ? m.entry : m.objects.find((o) => o.dir === 'down'), seen = new Set([start.y * W + start.x]), q = [start];
        while (q.length) { const c = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = c.x + dx, y = c.y + dy, k = y * W + x, t = m.tiles[k]; if (!t || seen.has(k) || t.blocked || t.hole) continue; seen.add(k); q.push({ x, y }); } }
        if (m.tiles.some((t, k) => !t.blocked && !t.hole && !seen.has(k))) bad.push(`${base} f${f}: cut off`);
        if (f === 1 && ((p.outer && !m.objects.some((o) => o.id === 'building-exit-outer')) || (p.court && !m.objects.some((o) => o.id === 'building-exit-court')))) bad.push(`${base}: doors`);
        if (f === p.floors && p.hatch && !m.objects.some((o) => o.dir === 'roof')) bad.push(`${base}: hatch ladder`);
        if (f < p.floors && !m.objects.some((o) => o.dir === 'up')) bad.push(`${base} f${f}: no ladder up`); } } }
  assert.deepEqual(bad, []);
});

test('only on new ground, and a save inside a compound resumes there', async () => {
  const at = find(true), s = freshSave(); (s.atlas ||= {})[`${at.x},${at.y}`] = { landscapeVersion: LANDSCAPE_VERSION, buildingVersion: 1 }; assert.ok(!visit(at.x, at.y, s).map.objects.some((o) => o.compound), 'explored before: no compound');
  const { serializeSave, deserializeSave } = await import('../src/persistence.ts');
  const g = visit(at.x, at.y), od = g.map.objects.find((o) => o.compoundDoor && o.enterAt === 'outer'); act(g, od, 'enter'); const up = g.map.objects.find((o) => o.dir === 'up'); act(g, up, 'climb');
  const id = g.areaId(), r = new Game(deserializeSave(serializeSave(g.exportSnapshot(200))), 900); assert.equal(r.areaId(), id); assert.ok(parseCompoundId(id)); assert.equal(r.map.building.floor, 2);
});

// a canvas that throws on negative radii (as Chrome does) and counts save/restore, as tests/canvas-safety-694.test.ts
function strictCtx() {
  let depth = 0; const base = { save() { depth++; }, restore() { depth--; }, get depth() { return depth; }, createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => null, measureText: () => ({ width: 10 }), getImageData: () => ({ data: [] }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1 }),
    ellipse(x, y, rx, ry) { if (rx < 0 || ry < 0) throw new RangeError(`The major-axis radius provided (${rx}) is negative.`); },
    arc(x, y, r) { if (r < 0) throw new RangeError(`The radius provided (${r}) is negative.`); } };
  return new Proxy(base, { get: (o, k) => k in o ? o[k] : () => {}, set: () => true });
}
test('compounds and shaped buildings draw without throwing from outside, behind them, in the courtyard and on the wall walk', () => {
  for (const maze of [true, false]) { const at = find(maze), g = visit(at.x, at.y), C = g.map.objects.find((o) => o.compound), b = C.bounds, ctx = strictCtx();
    const court = g.map.tiles.find((t) => t.courtyard), roof = g.map.tiles.find((t) => t.structure === 'buildingRoof' && !t.blocked);
    for (const [x, y] of [[b.x - 1, b.y + b.h + 1], [b.x + 2, b.y - 1], [court.x, court.y], [roof.x, roof.y]]) { g.player.x = x; g.player.y = y; assert.doesNotThrow(() => render(ctx, g, 360, 640, 5000)); }
    assert.equal(ctx.depth, 0, 'every save restored'); }
  let shaped = 0; for (let x = -8; x <= 8 && shaped < 4; x++) for (let y = -8; y <= 8 && shaped < 4; y++) { const g = visit(x, y), B = g.map.objects.find((o) => o.kind === 'greatBuilding' && o.v === 2 && !o.compound); if (!B) continue; shaped++; const ctx = strictCtx(); g.player.x = B.bounds.x + 1; g.player.y = B.bounds.y - 1; assert.doesNotThrow(() => render(ctx, g, 360, 640, 5000)); assert.equal(ctx.depth, 0); }
  assert.ok(shaped > 0, 'a shaped building drawn');
});
