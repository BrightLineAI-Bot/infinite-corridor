// Release 645 (Tim, 2026-11-01: "make a tree package, so we can have different branches and different configurations...
// deterministically... not all trees are the same... multiple trees... canopy level... branches don't really have any leaves...
// platforms you could land on if you were to fall from above"): from landscape version 13 the great trees come from trees.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRegion } from '../src/world.ts';
import { applyLandscape, sectionRegion, LANDSCAPE_VERSION, reachableFromPlaza, trappedTiles, canStep, fallDamage } from '../src/landscape.ts';
import { TREES, TREE_VERSION } from '../src/trees.ts';

const SEED = 'CANOPY631';
const make = (x, y, version = 13) => { const m = generateRegion(SEED, x, y); applyLandscape(m, SEED, x, y, { version }); return m; };
const found = []; const find = (pred, n) => { const out = found.filter(([, , m]) => pred(m)); for (let x = 14; x < 200 && out.length < n; x++) for (let y = 14; y < 200 && out.length < n; y += 3) { if (found.some(([a, b]) => a === x && b === y) || sectionRegion(SEED, x, y, 13).type !== 'jungle') continue; const m = make(x, y); if (!m.canopy) continue; found.push([x, y, m]); if (pred(m)) out.push([x, y, m]); } return out.slice(0, n); };
const at = (m, x, y) => (x < 0 || y < 0 || x > 31 || y > 31) ? null : m.tiles[y * 32 + x];
// Going up only: walk level, step or slope one level up, or hop over one gap to the same level or one up.
function climbable(m) {
  const seen = new Set(), q = []; for (const t of m.tiles) if (t.canopy && t.elev === 1) { q.push(t); seen.add(t); }
  while (q.length) { const t = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const k of [1, 2]) { const n = at(m, t.x + dx * k, t.y + dy * k); if (!n || !n.canopy || seen.has(n)) continue; const d = n.elev - t.elev; if ((k === 1 && (d === 0 || d === 1)) || (k === 2 && (d === 0 || d === 1) && !at(m, t.x + dx, t.y + dy)?.canopy)) { seen.add(n); q.push(n); } } }
  return seen;
}

test('version 13 grows the tree package: spires and groves, every one climbed to its door, as deterministic as the ground', () => {
  assert.equal(LANDSCAPE_VERSION, 13); assert.equal(TREE_VERSION, 13);
  const spires = find((m) => m.canopy.form === 'spire', 6), groves = find((m) => m.canopy.form === 'grove', 4);
  assert.ok(spires.length >= 6 && groves.length >= 4, `${spires.length} spires, ${groves.length} groves`);
  const looks = new Set(), shapes = new Set();
  for (const [x, y, m] of [...spires, ...groves]) {
    const c = m.canopy, seen = climbable(m), crown = m.tiles.filter((t) => t.kind === 'canopyTrunk' && t.elev === c.top);
    assert.ok(c.top >= 28, `${x},${y}: ${c.top} levels`); assert.equal(crown.length, 9, 'the door tree has a 3x3 crown');
    assert.ok(crown.every((t) => seen.has(t)), `${x},${y}: the crown can be climbed to`);
    const gate = m.objects.find((o) => o.kind === 'canopyGate'); assert.ok(gate && at(m, gate.x, gate.y).kind === 'canopyTrunk' && at(m, gate.x, gate.y).elev === c.top, 'the door is on the top crown');
    assert.ok(m.tiles.filter((t) => t.canopy && !t.pad).every((t) => seen.has(t)), `${x},${y}: every branch and platform lies on the climb`);
    const foot = m.tiles.find((t) => t.canopy && t.elev === 1), walked = reachableFromPlaza(m); assert.ok([[1, 0], [0, 1], [-1, 0], [0, -1]].some(([dx, dy]) => { const n = at(m, foot.x + dx, foot.y + dy); return n && !n.canopy && walked[n.y * 32 + n.x]; }), 'the climb starts from ground you can walk to');
    assert.equal(trappedTiles(m, 32, 32, { x: 16, y: 16 }).length, 0, 'no trap pockets');
    for (const t of m.tiles.filter((q) => q.canopy)) for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const n = at(m, t.x + dx, t.y + dy); if (!n || n.canopy) continue; assert.equal(canStep({ isPlayer: false }, m, 32, n.x, n.y, t.x, t.y), (n.elev || 0) >= t.elev, 'creatures cannot climb'); }
    assert.ok(!(m.enemySpawns || []).some((q) => at(m, Math.round(q.x), Math.round(q.y))?.canopy), 'nothing spawns up there');
    assert.ok(m.tiles.some((t) => t.canopy && t.leaves === 2), 'leafy tips'); assert.ok(c.trees.every((tr) => tr.boughs.length >= TREES.boughs.count[0] && tr.boughs.length <= TREES.boughs.count[1]), 'decorative boughs');
    for (const tr of c.trees) looks.add(tr.look); shapes.add(`${c.form}:${c.reach.join('')}`);
    assert.deepEqual(make(x, y), m, 'deterministic');
  }
  assert.ok(looks.size >= 3, `${looks.size} looks`); assert.ok(shapes.size >= 8, 'not all trees are the same');
  for (const [, , m] of groves) {
    const c = m.canopy, [a, b] = c.trees; assert.equal(c.trees.length, 2); assert.ok(a.low && !b.low && a.top < b.top, 'a lesser tree, then the greater with the door');
    const walk = m.tiles.filter((t) => t.walk); assert.ok(walk.length >= 2 && walk.every((t) => t.kind === 'canopyLeaf' && t.elev >= a.top && t.elev < b.top), 'the canopy walk runs from the lesser crown towards the greater tree');
    assert.ok(new Set(walk.map((t) => t.elev)).size >= 2 || walk.length < 4, 'hopped one level at a time');
  }
});

test('perches: a fall off the branch above lands on one and hurts, and the climb goes on from it', () => {
  const trees = find(() => true, 12); let pads = 0;
  for (const [, , m] of trees) for (const t of m.tiles.filter((q) => q.pad)) {
    pads++; const ns = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([dx, dy]) => at(m, t.x + dx, t.y + dy)).filter((n) => n?.canopy && n.kind !== 'canopyTrunk');
    assert.ok(ns.some((n) => n.elev === t.elev), 'level with a branch: back onto the climb');
    const above = ns.filter((n) => n.elev > t.elev); assert.ok(above.length && above.every((n) => n.elev - t.elev >= TREES.pads.fall[0] && n.elev - t.elev <= TREES.pads.fall[1]), 'two or three under the branch above');
    for (const n of above) { const d = fallDamage(n.elev - t.elev, 100); assert.ok(d > 0 && Number.isFinite(d), 'the fall hurts but is survived'); }
  }
  assert.ok(pads >= 12, `${pads} perches`);
});

test('older journeys keep their trees: version 12 still grows the single great tree', () => {
  const [x, y] = find(() => true, 1)[0], m = make(x, y, 12);
  if (m.canopy) { assert.equal(m.canopy.trees, undefined); assert.ok(!m.tiles.some((t) => t.look != null || t.pad || t.walk)); }
  assert.ok(!make(x, y, 11).canopy, 'version 11 ground has none');
});
