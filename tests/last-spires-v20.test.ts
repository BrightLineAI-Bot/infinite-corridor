// The last spires back (Tim, 2026-11-05: "sure, we can have those two hidden climb tiles... if it doesn't break the tree — it
// doesn't make the user feel like they're going to die, or unsure how to traverse it concretely — then we can put them in").
// Landscape 20 drops version 19's `least` (every side of a four-sided tree may be three tiles again), and the corner knot the
// returning twin branch then covers is painted again over it (trees.ts canopyRepaint, every tree, drawing only); a tree is laid
// only where, so drawn, every climb tile shows but its one twin-covered tile. Version 19 and older regenerate byte for byte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Game, JUMP } from '../src/game.ts';
import { freshSave } from '../src/types.ts';
import { generateRegion } from '../src/world.ts';
import { LANDSCAPE_VERSION, LIFT_PER_LEVEL, CANOPY_LIFT, tileLiftScale, canStep, fallDamage, LETHAL_KINDS, applyLandscape, applyDream, DREAM_VERSION, dreamsHere } from '../src/landscape.ts';
import { TREES_V20, TREES_V19, TREES_V18, CANOPY_DRAWN, canopyRepaint, canopyBehindTrunk as behindTrees } from '../src/trees.ts';
import { boughsClear, behindGreatTrunk } from '../src/renderer.ts';
import { canopyBehindTrunk, canopyAboveCrown, canopyRepaintFor, drawCanopyBehindTrunk } from '../src/landscape-render.ts';
import { wonderAt } from '../src/wonders.ts';

const W = 32, idx = (x, y) => y * W + x, at = (m, x, y) => (x < 0 || y < 0 || x >= W || y >= W) ? null : m.tiles[idx(x, y)], N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const footing = (t) => !!t && !t.blocked && !LETHAL_KINDS.has(t.kind);
const section = (seed, x, y, v) => { const m = generateRegion(seed, x, y); applyLandscape(m, seed, x, y, { version: v }); applyDream(m, seed, x, y, DREAM_VERSION); return m; };
const fp = (m) => createHash('sha1').update(JSON.stringify({ tiles: m.tiles, objects: m.objects, canopy: m.canopy || null, spawns: m.enemySpawns || null })).digest('hex').slice(0, 16);

// ---------------------------------------------------------------- the climb solver of great-tree-climb.test.ts, as it is there
const step = (m, a, b, jumping, airElev?) => footing(b) && canStep({ isPlayer: true, jumping, airElev }, m, W, a.x, a.y, b.x, b.y);
const SPEED = 2.4;
function movesFrom(m, a) {
  const out = [], budget = JUMP.sky / 1000 * SPEED;
  for (const [dx, dy] of N4) {
    const b = at(m, a.x + dx, a.y + dy); if (!b) continue;
    const d = (b.elev || 0) - (a.elev || 0);
    if (step(m, a, b, false)) out.push({ to: b, kind: 'walk', hurt: fallDamage(Math.max(0, -d), 100) });
    else if (step(m, a, b, true)) out.push({ to: b, kind: 'jump', hurt: 0 });
    if (!a.skyPlatform) continue;
    const L = a.elev || 0; let prev = a;
    for (let k = 1; k <= 3; k++) {
      const g = at(m, a.x + dx * k, a.y + dy * k); if (!g || g.blocked || LETHAL_KINDS.has(g.kind) || k - .5 > budget) break;
      if (!canStep({ isPlayer: true, jumping: true, airElev: L }, m, W, prev.x, prev.y, g.x, g.y)) break;
      if (g.canopy && (g.elev || 0) >= L - 1) { if (k > 1) out.push({ to: g, kind: 'hop', gap: k - 1, hurt: fallDamage(Math.max(0, L - (g.elev || 0)), 100), marginWorst: budget - k }); break; }
      prev = g;
    }
  }
  return out;
}
function solveClimb(m) {
  const c = m.canopy; if (!c) return null;
  const crown = m.tiles.filter((t) => t.kind === 'canopyTrunk' && t.elev === c.top && t.x >= c.x0 && t.x < c.x0 + c.size && t.y >= c.y0 && t.y < c.y0 + c.size);
  const dist = new Float64Array(W * W).fill(Infinity), prev = new Array(W * W).fill(null), via = new Array(W * W).fill(null), seen = new Uint8Array(W * W), q = [];
  for (let i = 0; i < W * W; i++) if (footing(m.tiles[i]) && !m.tiles[i].canopy) { dist[i] = 0; q.push(i); }
  const cost = (mv) => 1 + (mv.hurt >= 100 ? 1e6 : mv.hurt * 50) + (mv.kind === 'hop' ? 5 : 0);
  while (q.length) {
    let bi = 0; for (let i = 1; i < q.length; i++) if (dist[q[i]] < dist[q[bi]]) bi = i; const i = q.splice(bi, 1)[0]; if (seen[i]) continue; seen[i] = 1;
    for (const mv of movesFrom(m, m.tiles[i])) { const j = idx(mv.to.x, mv.to.y), nd = dist[i] + cost(mv); if (nd < dist[j]) { dist[j] = nd; prev[j] = i; via[j] = mv; if (!seen[j]) q.push(j); } }
  }
  let best = null; for (const t of crown) { const j = idx(t.x, t.y); if (dist[j] < Infinity && (best == null || dist[j] < dist[best])) best = j; }
  if (best == null) return { ok: false, reason: 'no route' };
  const route = []; for (let j = best; prev[j] != null; j = prev[j]) route.unshift(via[j]);
  const hops = route.filter((r) => r.kind === 'hop'), hurt = route.reduce((s, r) => s + r.hurt, 0);
  return { ok: hurt < 100, route, hops: hops.length, hurt, maxGap: hops.length ? Math.max(...hops.map((h) => h.gap)) : 0, minMarginWorst: hops.length ? Math.min(...hops.map((h) => h.marginWorst)) : null };
}

// ---------------------------------------------------------------- the drawn model of great-tree-climb.test.ts, with the repaint
// `repaint` false: release 758's order (the platforms behind the trunk painted again, as before this change); true: the
// renderer's whole repaint (canopyRepaintFor, the list drawCanopyBehindTrunk paints), in its order.
const lift = (t) => Math.max(0, (t.elev || 0) - (t.slope ? .5 : 0)) * LIFT_PER_LEVEL * tileLiftScale(t);
const HIDDEN = .95;
function coverage(m, repaint = true) {
  const tiles = m.tiles, canopy = tiles.filter((t) => t.canopy), trees = m.canopy.trees || [m.canopy], redraw = !m.canopy.box ? [] : repaint ? canopyRepaintFor(tiles, W, m.canopy.box).map((q) => q.t) : canopyBehindTrunk(tiles, W, m.canopy.box), late = new Map(redraw.map((t, i) => [t, 10000 + i]));
  const above = trees.filter((tr) => !tr.low).flatMap((tr) => canopyAboveCrown(tiles, W, tr)); above.forEach((t, i) => late.set(t, 20000 + i));
  const order = (t) => late.get(t) ?? idx(t.x, t.y), rects = (t) => { const h = lift(t), top = [t.x, t.y - h, t.x + 1, t.y - h + 1]; return { top, body: h <= 0 ? null : t.kind === 'canopyTrunk' ? [t.x, t.y - h + 1, t.x + 1, t.y + 1] : [t.x, t.y - h + 1, t.x + 1, t.y - h + 1 + (t.kind === 'canopyLeaf' ? .14 : .26)] }; };
  const inter = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1], boughs = [], rising = [];
  for (const tr of trees) { for (const b of boughsClear({ ...tr, _boughsClear: null }, tiles, W, m.canopy.box)) { const y = tr.y0 + tr.size - Math.max(2, b.at * tr.top) * LIFT_PER_LEVEL * CANOPY_LIFT, bx = b.side > 0 ? tr.x0 + tr.size : tr.x0, ex = bx + b.side * b.len; boughs.push([Math.min(bx, ex), y - .4 - b.lift - .5, Math.max(bx, ex), y + .2]); }
    if (!tr.low) { const topY = tr.y0 - tr.top * LIFT_PER_LEVEL * CANOPY_LIFT; rising.push([tr.x0 + tr.size * .12, topY - 40, tr.x0 + tr.size * .88, topY]); } }
  const out = [];
  for (const t of canopy.filter((q) => footing(q) && q.kind !== 'canopyTrunk')) {
    const { top } = rects(t), occ = [], trunkOcc = [];
    for (const u of canopy) { if (order(u) <= order(t)) continue; const r = rects(u), into = u.kind === 'canopyTrunk' ? trunkOcc : occ; if (inter(r.top, top)) into.push(r.top); if (r.body && inter(r.body, top)) into.push(r.body); }
    for (const b of boughs) if (inter(b, top)) occ.push(b);
    if (order(t) < 20000) for (const r of rising) if (inter(r, top)) trunkOcc.push(r);
    const share = (list) => { let n = 0; const S = 8; for (let i = 0; i < S; i++) for (let j = 0; j < S; j++) { const px = top[0] + (i + .5) / S, py = top[1] + (j + .5) / S; if (list.some((r) => px >= r[0] && px < r[2] && py >= r[1] && py < r[3])) n++; } return n / (S * S); };
    out.push({ t, covered: share([...occ, ...trunkOcc]), coveredByBranches: share(occ), boughOver: boughs.some((b) => inter(b, top)) });
  }
  return out;
}
// The tile its twin tip sits exactly over: two rows nearer the camera, three levels up (TREES_V18.turns).
const twinTip = (m, t) => { const s = at(m, t.x, t.y + 2); return !!s?.canopy && s.elev === t.elev + 3; };

// ---------------------------------------------------------------- the sample of tall-spires-v19.test.ts: the first trees the Atlas would point to
const SEED = 'SURVEY19', COUNT = 100, samples = {};
function trees(v, count = COUNT) {
  const key = `${v}:${count}`; if (samples[key]) return samples[key]; const out = samples[key] = [];
  for (let y = 14; y < 400 && out.length < count; y++) for (let x = 14; x < 400 && out.length < count; x++) { if (!wonderAt(SEED, x, y, 'tree')) continue; const m = section(SEED, x, y, v); if (m.canopy) out.push({ x, y, m }); }
  return out;
}
const mix = (list) => { const n = { spire: 0, compact: 0, grove: 0 }; for (const { m } of list) n[m.canopy.form]++; return n; };

test('landscape 20: the tables; version 19 keeps its own `least`; the trunk list moved to trees.ts unchanged', () => {
  assert.equal(LANDSCAPE_VERSION, 21); assert.equal(TREES_V20.version, 20); assert.equal(TREES_V19.version, 19);
  assert.deepEqual(TREES_V19.specs.spire.least, { 4: [3, 4, 3, 3] }, 'version 19 as it shipped'); assert.deepEqual(TREES_V19.specs.greater.least, { 4: [3, 4, 3, 3] });
  for (const k of ['spire', 'greater']) { assert.equal(TREES_V20.specs[k].least, undefined, `${k}: every side may be three tiles`); assert.deepEqual(TREES_V20.specs[k].reach, TREES_V19.specs[k].reach); }
  for (const k of ['tall', 'compact', 'lesser']) assert.deepEqual(TREES_V20.specs[k], TREES_V19.specs[k]);
  assert.deepEqual([TREES_V20.tries, TREES_V20.greaterTries, TREES_V20.forms, TREES_V20.allTurns], [TREES_V19.tries, TREES_V19.greaterTries, TREES_V19.forms, TREES_V19.allTurns]);
  assert.equal(TREES_V20.readable.perTree, 1); assert.equal(CANOPY_DRAWN.hidden, HIDDEN); assert.ok(CANOPY_DRAWN.keep <= 1 - .68, 'a repaint may leave a neighbour a stair tread\'s share');
  assert.equal(canopyBehindTrunk, behindTrees, 'one list, used by the renderer and the generator');
  assert.equal(TREES_V18.drawnLevel, LIFT_PER_LEVEL * CANOPY_LIFT);
});

test('the corner knot: hidden by the returning twin and the next step, painted again over the twin with the step painted back over it', () => {
  const m = section(SEED, 160, 18, 20), c = m.canopy; assert.deepEqual([c.version, c.form, c.reach], [20, 'spire', [4, 3, 4, 5]], 'a four-sided spire whose second side is three tiles');
  const knot = at(m, 26, 4), next = at(m, 26, 5); assert.deepEqual([knot.elev, next.elev], [9, 10], 'the knot before the second side, and its first step');
  const before = coverage(m, false).find((q) => q.t === knot), after = coverage(m).find((q) => q.t === knot);
  assert.ok(before.covered >= HIDDEN, `drawn as release 758 drew it, the knot is hidden (${before.covered})`);
  assert.ok(1 - after.covered >= .3, `with the repaint, ${(1 - after.covered).toFixed(2)} of its face shows (a one-level stair shows .32)`);
  const plan = canopyRepaintFor(m.tiles, W, c.box), i = plan.findIndex((q) => q.t === knot); assert.ok(i >= 0 && plan[i].shade, 'painted again, shaded as behind');
  assert.ok(plan.slice(i + 1).some((q) => q.t === next && q.shade === false), 'and the step in front of it painted back over it, unshaded');
  const hidden = coverage(m).filter((q) => q.covered >= HIDDEN && !q.t.pad); assert.deepEqual(hidden.map((q) => `${q.t.x},${q.t.y}`), ['27,5'], 'only the tile its twin tip sits exactly over'); assert.ok(twinTip(m, hidden[0].t));
  assert.deepEqual(canopyRepaint(m.tiles, W, c.box).hiddenAfter.map((t) => `${t.x},${t.y}`), ['27,5'], 'the generator\'s view agrees');
});

test('the mix: the spires version 19 gave up come back, as many as versions 14 to 17 grew', () => {
  const v17 = mix(trees(17)), v19 = mix(trees(19)), v20 = mix(trees(20));
  assert.equal(trees(20).length, COUNT); assert.deepEqual(v20, { spire: 50, compact: 46, grove: 4 }, JSON.stringify({ v17, v19, v20 }));
  assert.ok(v20.spire > v19.spire && v20.spire >= .95 * v17.spire, JSON.stringify({ v17, v19, v20 }));
  const tops = trees(20).filter(({ m }) => m.canopy.form === 'spire').map(({ m }) => m.canopy.top); assert.ok(Math.max(...tops) >= 44 && new Set(tops).size >= 8, `spire heights ${Math.min(...tops)}-${Math.max(...tops)}`);
});

test('every version 20 tree in the sample climbs from the ground to its crown with the real rules: no fall, one-tile hops with margin', () => {
  for (const { x, y, m } of trees(20)) {
    const r = solveClimb(m); assert.ok(r.ok, `${x},${y}: ${r.reason || 'hurts'}`); assert.equal(r.hurt, 0, `${x},${y}`); assert.ok(r.maxGap <= 1, `${x},${y}`); if (r.hops) assert.ok(r.minMarginWorst >= .5, `${x},${y}`);
    assert.equal(m.canopy.version, 20); assert.equal(r.route.at(-1).to.kind, 'canopyTrunk');
  }
});

test('drawn is walkable on every version 20 tree: one tile a tree hidden at most, the one its twin tip sits on, low on the climb; perches, boughs and the trunk\'s strip as before', () => {
  const R = TREES_V20.specs.spire.reach[1]; let covered = 0, shown = 0;
  for (const { x, y, m } of trees(20)) {
    const c = m.canopy, list = c.trees, cov = coverage(m), hidden = cov.filter((q) => q.covered >= HIDDEN && !q.t.pad); covered += hidden.length;
    shown += coverage(m, false).filter((q) => q.covered >= HIDDEN && !q.t.pad).length - hidden.length;
    assert.equal(hidden.filter((q) => q.coveredByBranches < HIDDEN).length, 0, `${x},${y}: hidden by the trunk`);
    const base = (e) => list.length > 1 && e >= list[0].top ? list[0].top : 0;
    for (const own of [hidden.filter((q) => !base(q.t.elev)), hidden.filter((q) => base(q.t.elev))]) assert.ok(own.length <= 1, `${x},${y}: ${own.map((q) => `${q.t.x},${q.t.y}@${q.t.elev}`).join(' ')} (${c.form}, reach ${c.reach})`);
    for (const q of hidden) { assert.ok(twinTip(m, q.t), `${x},${y}: ${q.t.x},${q.t.y} is the twin-covered tile`); assert.ok(q.t.elev - base(q.t.elev) <= (c.reach.length === 4 ? 3 * R : R - 1), `${x},${y}: low on the climb`); }
    assert.equal(cov.filter((q) => q.covered >= HIDDEN && q.t.pad).length, 0, `${x},${y}: perches in the open`); assert.ok(!cov.some((q) => q.boughOver), `${x},${y}: a bough over a platform`);
    for (const t of m.tiles) if (t.pad) { const s = at(m, t.x, t.y + 1); assert.ok(!(s?.canopy && (s.elev || 0) > t.elev), `${x},${y}: a perch behind a higher branch`); }
    for (const o of m.objects) if (o.kind === 'tree') assert.ok(!behindGreatTrunk(c, o), `${x},${y}: a tree in the trunk's strip`);
  }
  assert.ok(shown >= 10, `${shown} knots the repaint shows`); assert.ok(covered <= COUNT + 10, `${covered} twin-covered tiles in ${COUNT} trees`);
});

test('the repaint on older trees (it applies to every version): it only ever shows more; no platform newly hidden, none left under a stair tread\'s share', () => {
  let more = 0;
  for (const v of [14, 17, 18, 19]) for (const { x, y, m } of trees(v, 40)) {
    const was = new Map(coverage(m, false).map((q) => [q.t, q.covered]));
    for (const q of coverage(m)) { const o = was.get(q.t); if (o >= HIDDEN && q.covered < HIDDEN) more++; assert.ok(!(o < HIDDEN && q.covered >= HIDDEN), `v${v} ${x},${y}: ${q.t.x},${q.t.y} newly hidden`); if (q.covered > o) assert.ok(1 - q.covered >= Math.min(CANOPY_DRAWN.keep, 1 - o) - 1e-9, `v${v} ${x},${y}: ${q.t.x},${q.t.y} keeps ${1 - q.covered}`); }
  }
  assert.ok(more >= 5, `${more} tiles on older trees shown`);
});

test('the renderer paints the plan once worked out: shaded "behind", the steps in front unshaded; the same list each frame', () => {
  const m = section(SEED, 160, 18, 20), box = m.canopy.box, plan = canopyRepaintFor(m.tiles, W, box);
  assert.equal(canopyRepaintFor(m.tiles, W, box), plan, 'worked out once for the map');
  assert.deepEqual(plan.slice(0, canopyBehindTrunk(m.tiles, W, box).length).map((q) => q.t), canopyBehindTrunk(m.tiles, W, box), 'release 758\'s platforms first, in their order');
  const drawn = [], shades = []; const ctx = { set fillStyle(v) { this._f = v; }, get fillStyle() { return this._f; }, fillRect() { shades.push(this._f); } };
  const n = drawCanopyBehindTrunk(ctx, m.tiles, W, 32, box, (t) => drawn.push(t)); assert.equal(n, plan.length); assert.deepEqual(drawn, plan.map((q) => q.t));
  assert.equal(shades.length, plan.filter((q) => q.shade).length, 'one shade for each tile painted as behind');
});

test('deterministic: two fresh loads grow the same version 20 tree; none where the Far Sleep dreams', () => {
  for (const { x, y, m } of trees(20).slice(0, 12)) assert.equal(fp(section(SEED, x, y, 20)), fp(m), `${x},${y}`);
  const seed = 'AUDIT-A', x = 185, y = 22; assert.ok(dreamsHere(seed, x, y, DREAM_VERSION, 20)); assert.equal(section(seed, x, y, 20).canopy, undefined);
});

test('older ground regenerates byte for byte: version 19 sections fingerprinted on main (release 764) before this change', () => {
  for (const [seed, v, x, y, hash, form] of [
    ['SURVEY19', 19, 181, 14, '404b48d7cbccde0e', 'spire'], ['SURVEY19', 19, 224, 14, '501e69063c033088', 'spire'], ['SURVEY19', 19, 282, 14, '475452d53361e897', 'compact'],
    ['SURVEY19', 19, 182, 16, '5d292aef72f336b4', 'grove'], ['SURVEY19', 19, 53, 14, 'f5a96f9a744e3edf', null], ['SURVEY19', 18, 184, 16, '97103739d5f37995', 'spire'],
  ]) { const m = section(seed, x, y, v); assert.equal(m.canopy?.form || null, form, `${seed} v${v} ${x},${y}`); assert.equal(fp(m), hash, `${seed} v${v} ${x},${y}`); }
  assert.deepEqual([section(SEED, 224, 14, 20).canopy.form, section(SEED, 282, 14, 20).canopy.form], ['grove', 'spire'], 'the same ground first seen at 20 grows the trees 19 gave up');
});

test('in the game: new ground grows version 20 trees and pins landscape 20; ground first seen at 19 keeps its version 19 tree', () => {
  const [x, y] = [282, 14], fresh = freshSave(); fresh.seed = SEED; const g = new Game(fresh, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
  assert.equal(fresh.atlas[`${x},${y}`].landscapeVersion, 21); assert.equal(g.map.canopy.version, 20); assert.equal(g.map.canopy.form, 'spire');
  const old = freshSave(); old.seed = SEED; old.atlas = { [`${x},${y}`]: { ...fresh.atlas[`${x},${y}`], landscapeVersion: 19 } }; const g19 = new Game(old, 0); g19.rx = x; g19.ry = y; g19.loadArea('overworld');
  assert.equal(g19.map.canopy.version, 19); assert.equal(g19.map.canopy.form, 'compact'); assert.deepEqual(g19.map.canopy, section(SEED, x, y, 19).canopy, 'the version 19 tree, as it was');
});
