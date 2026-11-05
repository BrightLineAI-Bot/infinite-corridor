// Tall spires again (Tim, 2026-11-05: "For trees, let's keep it as it was before. I like having tall spires"). Landscape 19
// grows about as many spires and groves as versions 14 to 17 did, under every rule version 18 brought (readable turns, open and
// cleared hop gaps, perches in the open, the trunk's strip cleared, nothing where the Far Sleep dreams); version 18 and older
// ground regenerates byte for byte. The crown veil starts thinning halfway up the climb.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Game, JUMP } from '../src/game.ts';
import { freshSave } from '../src/types.ts';
import { generateRegion } from '../src/world.ts';
import { LANDSCAPE_VERSION, LIFT_PER_LEVEL, CANOPY_LIFT, tileLiftScale, canStep, fallDamage, LETHAL_KINDS, applyLandscape, applyDream, DREAM_VERSION, dreamsHere } from '../src/landscape.ts';
import { TREES_V19, TREES_V18, TREES_V14, TREES } from '../src/trees.ts';
import { crownReveal, CROWN_VEIL, SKY, boughsClear, behindGreatTrunk } from '../src/renderer.ts';
import { canopyBehindTrunk, canopyAboveCrown } from '../src/landscape-render.ts';
import { wonderAt } from '../src/wonders.ts';

const W = 32, idx = (x, y) => y * W + x, at = (m, x, y) => (x < 0 || y < 0 || x >= W || y >= W) ? null : m.tiles[idx(x, y)], N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const footing = (t) => !!t && !t.blocked && !LETHAL_KINDS.has(t.kind);
const section = (seed, x, y, v) => { const m = generateRegion(seed, x, y); applyLandscape(m, seed, x, y, { version: v }); applyDream(m, seed, x, y, DREAM_VERSION); return m; };
const fp = (m) => createHash('sha1').update(JSON.stringify({ tiles: m.tiles, objects: m.objects, canopy: m.canopy || null, spawns: m.enemySpawns || null })).digest('hex').slice(0, 16);

// ---------------------------------------------------------------- the climb solver of great-tree-climb.test.ts (the real step,
// jump and sky-hop rules, headless), as it is there
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
      if (g.canopy && (g.elev || 0) >= L - 1) {
        if (k > 1) { let narrow = 0; for (let j = 1; j < k; j++) { const gj = at(m, a.x + dx * j, a.y + dy * j); for (const [sx, sy] of N4) { if ((sx === dx && sy === dy) || (sx === -dx && sy === -dy)) continue; const n = at(m, gj.x + sx, gj.y + sy); if (!n || !footing(n) || (n.elev || 0) < L - 1) narrow++; } }
          out.push({ to: g, kind: 'hop', gap: k - 1, hurt: fallDamage(Math.max(0, L - (g.elev || 0)), 100), marginCentre: budget - (k - .5), marginWorst: budget - k, narrow }); }
        break;
      }
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
  const cost = (mv) => 1 + (mv.hurt >= 100 ? 1e6 : mv.hurt * 50) + (mv.kind === 'hop' ? 5 + mv.narrow : 0);
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

// ---------------------------------------------------------------- the drawn model of great-tree-climb.test.ts, as it is there
const lift = (t) => Math.max(0, (t.elev || 0) - (t.slope ? .5 : 0)) * LIFT_PER_LEVEL * tileLiftScale(t);
const HIDDEN = .95;
function coverage(m) {
  const tiles = m.tiles, canopy = tiles.filter((t) => t.canopy), trees = m.canopy.trees || [m.canopy], redraw = m.canopy.box ? canopyBehindTrunk(tiles, W, m.canopy.box) : [], late = new Map(redraw.map((t, i) => [t, 10000 + i]));
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

// ---------------------------------------------------------------- the sample: the first trees the Atlas would point to
const SEED = 'SURVEY19', COUNT = 100, samples = {};
function trees(v) {
  if (samples[v]) return samples[v]; const out = samples[v] = [];
  for (let y = 14; y < 400 && out.length < COUNT; y++) for (let x = 14; x < 400 && out.length < COUNT; x++) { if (!wonderAt(SEED, x, y, 'tree')) continue; const m = section(SEED, x, y, v); if (m.canopy) out.push({ x, y, m }); }
  return out;
}
const mix = (list) => { const n = { spire: 0, compact: 0, grove: 0 }; for (const { m } of list) n[m.canopy.form]++; return n; };

test('landscape 19: the tables; version 18 keeps its own', () => {
  assert.equal(LANDSCAPE_VERSION, 22); assert.equal(TREES_V19.version, 19); assert.equal(TREES_V18.version, 18);
  assert.deepEqual(TREES_V18.specs.spire.reach, [4, 7], 'version 18 as it shipped'); assert.deepEqual(TREES.tries, { spire: 80, grove: 240 }); assert.equal(TREES.greaterTries, 120); assert.equal(TREES_V14.layouts, 60);
  const S = TREES_V19.specs; assert.deepEqual(S.spire.reach, TREES.spire.reach, 'the spire reach of versions 13 to 17'); assert.ok(S.tall.reach[0] >= TREES_V18.specs.spire.reach[0], 'tall spires first');
  assert.equal(S.spire.least[4][1], 4, 'a four-sided tree\'s second side keeps four tiles'); assert.equal(S.greater.least[4][1], 4);
});

test('the mix: about as many spires and groves as versions 14 to 17 grew, far more than version 18', () => {
  const v17 = mix(trees(17)), v18 = mix(trees(18)), v19 = mix(trees(19));
  assert.equal(trees(19).length, COUNT); assert.deepEqual(v19, { spire: 47, compact: 50, grove: 3 }, JSON.stringify({ v17, v18, v19 }));
  assert.ok(v19.spire + v19.grove >= .9 * (v17.spire + v17.grove), `tall trees: ${v19.spire + v19.grove} (v17 ${v17.spire + v17.grove}, v18 ${v18.spire + v18.grove})`);
  assert.ok(v19.spire >= 1.5 * v18.spire && v19.grove >= v17.grove * .75, JSON.stringify({ v17, v18, v19 }));
  const tops = trees(19).filter(({ m }) => m.canopy.form === 'spire').map(({ m }) => m.canopy.top); assert.ok(Math.max(...tops) >= 44 && new Set(tops).size >= 8, `spire heights ${Math.min(...tops)}-${Math.max(...tops)}`);
});

test('every version 19 tree in the sample climbs from the ground to its crown with the real rules: no fall, one-tile hops with margin', () => {
  for (const { x, y, m } of trees(19)) {
    const r = solveClimb(m); assert.ok(r.ok, `${x},${y}: ${r.reason || 'hurts'}`); assert.equal(r.hurt, 0, `${x},${y}`); assert.ok(r.maxGap <= 1, `${x},${y}`); if (r.hops) assert.ok(r.minMarginWorst >= .5, `${x},${y}`);
    assert.equal(m.canopy.version, 19); assert.equal(r.route.at(-1).to.kind, 'canopyTrunk');
  }
});

test('version 18\'s drawing rules hold on every version 19 tree: one twin-covered tile a tree at most, low on its climb; perches in the open; nothing behind the trunk; the trunk\'s strip clear', () => {
  const R = TREES_V19.specs.spire.reach[1];
  for (const { x, y, m } of trees(19)) {
    const c = m.canopy, list = c.trees, cov = coverage(m), hidden = cov.filter((q) => q.covered >= HIDDEN && !q.t.pad);
    assert.equal(hidden.filter((q) => q.coveredByBranches < HIDDEN).length, 0, `${x},${y}: hidden by the trunk`);
    const base = (e) => list.length > 1 && e >= list[0].top ? list[0].top : 0; // a grove's greater tree climbs on from the lesser crown
    for (const own of [hidden.filter((q) => !base(q.t.elev)), hidden.filter((q) => base(q.t.elev))]) assert.ok(own.length <= 1, `${x},${y}: ${own.map((q) => `${q.t.x},${q.t.y}@${q.t.elev}`).join(' ')} covered by twins (${c.form}, reach ${c.reach})`);
    for (const q of hidden) assert.ok(q.t.elev - base(q.t.elev) <= (c.reach.length === 4 ? 3 * R : R - 1), `${x},${y}: the covered tile is low on the climb`);
    assert.equal(cov.filter((q) => q.covered >= HIDDEN && q.t.pad).length, 0, `${x},${y}: perches in the open`); assert.ok(!cov.some((q) => q.boughOver), `${x},${y}: a bough over a platform`);
    for (const t of m.tiles) if (t.pad) { const s = at(m, t.x, t.y + 1); assert.ok(!(s?.canopy && (s.elev || 0) > t.elev), `${x},${y}: a perch behind a higher branch`); }
    for (const o of m.objects) if (o.kind === 'tree') assert.ok(!behindGreatTrunk(c, o), `${x},${y}: a tree in the trunk's strip`);
  }
});

test('deterministic: two fresh loads grow the same version 19 tree; none where the Far Sleep dreams', () => {
  for (const { x, y, m } of trees(19).slice(0, 12)) assert.equal(fp(section(SEED, x, y, 19)), fp(m), `${x},${y}`);
  const seed = 'AUDIT-A', x = 185, y = 22; assert.ok(dreamsHere(seed, x, y, DREAM_VERSION, 19)); assert.equal(section(seed, x, y, 19).canopy, undefined);
});

test('older ground regenerates byte for byte: version 18 sections fingerprinted on main (release 759) before this change', () => {
  for (const [seed, v, x, y, hash, form] of [
    ['SURVEY19', 18, 181, 14, '0eec7ad5856c04a2', 'spire'], ['SURVEY19', 18, 184, 16, '97103739d5f37995', 'spire'], ['SURVEY19', 18, 181, 15, 'ac5508d2bfc86fbc', 'compact'],
    ['SURVEY19', 18, 179, 16, '62f08f51d115f7d8', 'compact'], ['SURVEY19', 18, 53, 14, 'f5a96f9a744e3edf', null], ['CANOPY631', 18, 59, 14, '06ec9d78c7b778c9', 'compact'], ['CANOPY631', 18, 60, 14, 'ba84de93374eed38', 'spire'],
  ]) { const m = section(seed, x, y, v); assert.equal(m.canopy?.form || null, form, `${seed} v${v} ${x},${y}`); assert.equal(fp(m), hash, `${seed} v${v} ${x},${y}`); }
});

test('in the game: new ground grows version 19 trees and pins landscape 19; ground first seen at 18 keeps its version 18 tree', () => {
  const [x, y] = [184, 16], fresh = freshSave(); fresh.seed = SEED; const g = new Game(fresh, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
  assert.equal(fresh.atlas[`${x},${y}`].landscapeVersion, 22); assert.equal(g.map.canopy.version, 21); assert.equal(g.map.canopy.form, 'spire');
  const old = freshSave(); old.seed = SEED; old.atlas = { [`${x},${y}`]: { ...fresh.atlas[`${x},${y}`], landscapeVersion: 18 } }; const g18 = new Game(old, 0); g18.rx = x; g18.ry = y; g18.loadArea('overworld');
  assert.equal(g18.map.canopy.version, 18); assert.deepEqual(g18.map.canopy, section(SEED, x, y, 18).canopy, 'the version 18 tree, as it was');
});

test('the crown veil starts thinning halfway up the climb and is gone just under the crown, whatever the height', () => {
  assert.equal(CROWN_VEIL.from, .5);
  for (const top of [22, 30, 38, 48, 63]) {
    const half = top * CROWN_VEIL.from; assert.equal(crownReveal(0, top), 0); assert.equal(crownReveal(half - .5, top), 0, `${top}: still veiled just under halfway`); assert.ok(crownReveal(half + 1, top) > 0, `${top}: thinning just past halfway`);
    assert.equal(crownReveal(top - CROWN_VEIL.below, top), 1); const mid = crownReveal((half + top - CROWN_VEIL.below) / 2, top); assert.ok(mid > .4 && mid < .6, `${top}: ${mid}`);
  }
  assert.equal(crownReveal(SKY.from, 16), 0, 'never thinner than the sky allows on a short tree');
});
