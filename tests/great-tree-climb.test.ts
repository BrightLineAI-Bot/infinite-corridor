// Great-tree platforming review (Tim, 2026-11-05: "It's hard to jump and dodge... the brown portions that look like platforms
// should be what you can walk on. When you get to the trunk, I just fell through. I couldn't get to the top"; "the skyway door
// at the top should not be visible from the ground"). A headless climb solver over the real step, jump and hop rules, a model
// of what is drawn where, and the game itself on his sections.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freshSave } from '../src/types.ts';
import { Game, JUMP, TREE_FOOTING } from '../src/game.ts';
import { generateRegion } from '../src/world.ts';
import { LANDSCAPE_VERSION, LIFT_PER_LEVEL, CANOPY_LIFT, tileLiftScale, canStep, fallDamage, reachableFromPlaza, LETHAL_KINDS, applyLandscape, applyDream, DREAM_VERSION, dreamsHere, mendCanopy } from '../src/landscape.ts';
import { TREES_V18, TREES_V14, TREES } from '../src/trees.ts';
import { render, crownReveal, CROWN_VEIL, SKY, boughsClear, TREE_LIMBS, behindGreatTrunk } from '../src/renderer.ts';
import { canopyBehindTrunk, canopyAboveCrown, canopyRepaintFor } from '../src/landscape-render.ts';
import { wonderAt } from '../src/wonders.ts';

// ---------------------------------------------------------------- loading
// A section as a journey that first saw it at landscape `version` has it: every other pin as the game writes it today.
function loadAt(seed, x, y, version = null) {
  const s = freshSave(); s.seed = seed; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); g.enemies = []; if (!version) return { s, g };
  const pin = { ...s.atlas[`${x},${y}`], landscapeVersion: version }, s2 = freshSave(); s2.seed = seed; s2.atlas = { [`${x},${y}`]: pin }; const g2 = new Game(s2, 0); g2.rx = x; g2.ry = y; g2.loadArea('overworld'); g2.enemies = []; return { s: s2, g: g2 };
}
// Tim's journey (seed and section coordinates only; his save stays out of the repo). His ground was first seen at landscape 17.
const TIM = { seed: 'CORRIDOR-MUHAPQHU', version: 17, sections: { dead: [41, 63], spire: [41, 62], shown: [44, 63], none: [40, 63] } };
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const W = 32, idx = (x, y) => y * W + x, at = (m, x, y) => (x < 0 || y < 0 || x >= W || y >= W) ? null : m.tiles[idx(x, y)], N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const footing = (t) => !!t && !t.blocked && !LETHAL_KINDS.has(t.kind);
const lift = (t) => Math.max(0, (t.elev || 0) - (t.slope ? .5 : 0)) * LIFT_PER_LEVEL * tileLiftScale(t);
// The share of a platform's top face that later drawing may cover before the platform counts as hidden. A step toward the
// camera covers the tile behind it as any stair seen from above does: one level covers .68 of it, two levels .9 (the trunk
// covered its north-side branches whole: 1.0). Hidden means nothing of it shows.
const HIDDEN = .95;

// ---------------------------------------------------------------- the solver: the real rules, headless
// A step the game allows: canStep for the player (jumping or not, airElev as the game sets it over a sky gap).
const step = (m, a, b, jumping, airElev) => footing(b) && canStep({ isPlayer: true, jumping, airElev }, m, W, a.x, a.y, b.x, b.y);
export const SPEED = 2.4; // tiles a second, no stats
// Every move out of tile `a`: a walk or a jump-step to a neighbour; from a sky platform, a hop in a straight line over gap tiles
// while the sky jump lasts (JUMP.sky at SPEED). The reference point under the Wayfarer's feet must cross into the landing tile:
// from the launching tile's centre that is k - .5 tiles for the k-th tile along, from its far edge k tiles (the worst start).
export function movesFrom(m, a) {
  const out = [], budget = JUMP.sky / 1000 * SPEED;
  for (const [dx, dy] of N4) {
    const b = at(m, a.x + dx, a.y + dy); if (!b) continue;
    const d = (b.elev || 0) - (a.elev || 0);
    if (step(m, a, b, false)) out.push({ to: b, kind: 'walk', hurt: fallDamage(Math.max(0, -d), 100) });
    else if (step(m, a, b, true)) out.push({ to: b, kind: 'jump', hurt: 0 });
    if (!a.skyPlatform) continue;
    const L = a.elev || 0; let prev = a;
    for (let k = 1; k <= 3; k++) {
      const g = at(m, a.x + dx * k, a.y + dy * k); if (!g || g.blocked || LETHAL_KINDS.has(g.kind) || k - .5 > budget) break; // lethal ground kills even mid-jump (hazardWhereMoved)
      if (!canStep({ isPlayer: true, jumping: true, airElev: L }, m, W, prev.x, prev.y, g.x, g.y)) break;
      if (g.canopy && (g.elev || 0) >= L - 1) { // a landing: the jump ends here, falling L - elev (nothing for one level)
        if (k > 1) { let narrow = 0; for (let j = 1; j < k; j++) { const gj = at(m, a.x + dx * j, a.y + dy * j); for (const [sx, sy] of N4) { if ((sx === dx && sy === dy) || (sx === -dx && sy === -dy)) continue; const n = at(m, gj.x + sx, gj.y + sy); if (!n || !footing(n) || (n.elev || 0) < L - 1) narrow++; } }
          out.push({ to: g, kind: 'hop', gap: k - 1, hurt: fallDamage(Math.max(0, L - (g.elev || 0)), 100), marginCentre: budget - (k - .5), marginWorst: budget - k, narrow }); }
        break;
      }
      prev = g;
    }
  }
  return out;
}
// The safest climb from ground the plaza reaches to the door tree's crown: Dijkstra, hurting moves dear, lethal ones barred.
export function solveClimb(m) {
  const c = m.canopy; if (!c) return null;
  const crown = m.tiles.filter((t) => t.kind === 'canopyTrunk' && t.elev === c.top && t.x >= c.x0 && t.x < c.x0 + c.size && t.y >= c.y0 && t.y < c.y0 + c.size);
  const dist = new Float64Array(W * W).fill(Infinity), prev = new Array(W * W).fill(null), via = new Array(W * W).fill(null), seen = new Uint8Array(W * W), q = [];
  for (let i = 0; i < W * W; i++) if (footing(m.tiles[i]) && !m.tiles[i].canopy) { dist[i] = 0; q.push(i); } // from any ground you can stand on (whether the plaza reaches that ground is world coherence, not the tree's)
  const cost = (mv) => 1 + (mv.hurt >= 100 ? 1e6 : mv.hurt * 50) + (mv.kind === 'hop' ? 5 + mv.narrow : 0);
  while (q.length) {
    let bi = 0; for (let i = 1; i < q.length; i++) if (dist[q[i]] < dist[q[bi]]) bi = i; const i = q.splice(bi, 1)[0]; if (seen[i]) continue; seen[i] = 1;
    for (const mv of movesFrom(m, m.tiles[i])) { const j = idx(mv.to.x, mv.to.y), nd = dist[i] + cost(mv); if (nd < dist[j]) { dist[j] = nd; prev[j] = i; via[j] = mv; if (!seen[j]) q.push(j); } }
  }
  let best = null; for (const t of crown) { const j = idx(t.x, t.y); if (dist[j] < Infinity && (best == null || dist[j] < dist[best])) best = j; }
  if (best == null) return { ok: false, reason: 'no route' };
  const route = []; for (let j = best; prev[j] != null; j = prev[j]) route.unshift(via[j]);
  const hops = route.filter((r) => r.kind === 'hop'), hurt = route.reduce((s, r) => s + r.hurt, 0);
  return { ok: hurt < 100, route, hops: hops.length, hurt, maxGap: hops.length ? Math.max(...hops.map((h) => h.gap)) : 0, minMarginWorst: hops.length ? Math.min(...hops.map((h) => h.marginWorst)) : null, minMarginCentre: hops.length ? Math.min(...hops.map((h) => h.marginCentre)) : null };
}

// ---------------------------------------------------------------- the drawn model
// Screen rectangles in tiles: a tile's top face at (x, y - lift), its underside (a branch) or its face down to the ground (the
// trunk). The ground pass paints row by row; then the behind-the-trunk pass (canopyBehindTrunk); then the dressing's boughs
// (boughsClear) are painted with the actors. The share of each platform's top face something later covers:
function coverage(m) {
  const tiles = m.tiles, canopy = tiles.filter((t) => t.canopy), trees = m.canopy.trees || [m.canopy], redraw = m.canopy.box ? canopyRepaintFor(tiles, W, m.canopy.box).map((q) => q.t) : [] /* landscape 20: the whole repaint the renderer paints */, late = new Map(redraw.map((t, i) => [t, 10000 + i]));
  const above = trees.filter((tr) => !tr.low).flatMap((tr) => canopyAboveCrown(tiles, W, tr)); above.forEach((t, i) => late.set(t, 20000 + i)); // painted again after the dressing
  const order = (t) => late.get(t) ?? idx(t.x, t.y), rects = (t) => { const h = lift(t), top = [t.x, t.y - h, t.x + 1, t.y - h + 1]; return { top, body: h <= 0 ? null : t.kind === 'canopyTrunk' ? [t.x, t.y - h + 1, t.x + 1, t.y + 1] : [t.x, t.y - h + 1, t.x + 1, t.y - h + 1 + (t.kind === 'canopyLeaf' ? .14 : .26)] }; };
  const inter = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1], boughs = [], rising = [];
  for (const tr of trees) { for (const b of boughsClear({ ...tr, _boughsClear: null }, tiles, W, m.canopy.box)) { const y = tr.y0 + tr.size - Math.max(2, b.at * tr.top) * LIFT_PER_LEVEL * CANOPY_LIFT, bx = b.side > 0 ? tr.x0 + tr.size : tr.x0, ex = bx + b.side * b.len; boughs.push([Math.min(bx, ex), y - .4 - b.lift - .5, Math.max(bx, ex), y + .2]); }
    if (!tr.low) { const topY = tr.y0 - tr.top * LIFT_PER_LEVEL * CANOPY_LIFT; rising.push([tr.x0 + tr.size * .12, topY - 40, tr.x0 + tr.size * .88, topY]); } } // the trunk drawn on above the crown (drawn with the actors, before the above-crown repaint)
  const out = [];
  for (const t of canopy.filter((q) => footing(q) && q.kind !== 'canopyTrunk')) {
    const { top } = rects(t), occ = [], trunkOcc = []; // trunkOcc: what the trunk itself (its face and the rising trunk) covers
    for (const u of canopy) { if (order(u) <= order(t)) continue; const r = rects(u), into = u.kind === 'canopyTrunk' ? trunkOcc : occ; if (inter(r.top, top)) into.push(r.top); if (r.body && inter(r.body, top)) into.push(r.body); }
    for (const b of boughs) if (inter(b, top)) occ.push(b);
    if (order(t) < 20000) for (const r of rising) if (inter(r, top)) trunkOcc.push(r);
    const share = (list) => { let n = 0; const S = 8; for (let i = 0; i < S; i++) for (let j = 0; j < S; j++) { const px = top[0] + (i + .5) / S, py = top[1] + (j + .5) / S; if (list.some((r) => px >= r[0] && px < r[2] && py >= r[1] && py < r[3])) n++; } return n / (S * S); };
    out.push({ t, covered: share([...occ, ...trunkOcc]), coveredByBranches: share(occ), boughOver: boughs.some((b) => inter(b, top)) });
  }
  return out;
}
// The tiles from which a trunk's top can be entered at all (the climb's last tile, and nothing else).
function trunkEntries(m, tr) { const out = []; for (let j = 0; j < tr.size; j++) for (let i = 0; i < tr.size; i++) { const t = at(m, tr.x0 + i, tr.y0 + j); for (const [dx, dy] of N4) { const n = at(m, t.x + dx, t.y + dy); if (!n || n.kind === 'canopyTrunk' || !footing(n)) continue; if (step(m, n, t, false) || step(m, n, t, true)) out.push({ from: n, to: t }); } } return out; }

// ---------------------------------------------------------------- a sample of trees
const SAMPLE = 'CLIMB18';
let sample = null;
function trees18() {
  if (sample) return sample; sample = [];
  for (let y = 14; y < 120 && sample.length < 10; y += 1) for (let x = 14; x < 120 && sample.length < 10; x += 1) { if (!wonderAt(SAMPLE, x, y, 'tree')) continue; const { g } = loadAt(SAMPLE, x, y); if (g.map.canopy) sample.push({ x, y, g }); }
  return sample;
}
const older = () => [[12, 'CANOPY631', 74, 21], [13, 'CANOPY631', 49, 119], [14, 'CANOPY631', 59, 14]].map(([v, seed, x, y]) => ({ v, seed, x, y, g: loadAt(seed, x, y, v).g }));
const recordingCtx = () => { // records fills, arcs and gradients by colour with the alpha in force
  const marks = [], stack = []; let tx = 0, ty = 0, alpha = 1, fill = '';
  const base = { save() { stack.push([tx, ty, alpha]); }, restore() { [tx, ty, alpha] = stack.pop() || [0, 0, 1]; }, translate(x, y) { tx += x; ty += y; },
    set fillStyle(v) { fill = v; }, get fillStyle() { return fill; }, set globalAlpha(v) { alpha = v; }, get globalAlpha() { return alpha; },
    fill() { marks.push({ op: 'fill', fill, alpha }); }, arc(x, y) { marks.push({ op: 'arc', fill, alpha, x: x + tx, y: y + ty }); }, fillRect() { marks.push({ op: 'rect', fill, alpha }); },
    createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => null, measureText: () => ({ width: 10 }), getImageData: () => ({ data: new Uint8ClampedArray(4) }), get marks() { return marks; } };
  return new Proxy(base, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { if (k === 'fillStyle' || k === 'globalAlpha') o[k] = v; return true; } });
};

test('landscape 18: the tree tables, and the drawn scale the generator keeps the trunk strip clear by', () => {
  assert.equal(LANDSCAPE_VERSION, 25); assert.equal(TREES_V18.version, 18);
  assert.equal(TREES_V18.drawnLevel, LIFT_PER_LEVEL * CANOPY_LIFT, 'trees.ts keeps the drawn height of a level without importing the renderer');
  assert.ok(TREES_V18.specs.spire.reach[0] > TREES_V14.compact.reach[0] && TREES_V18.specs.spire.reach[0] >= 4, 'taller spires');
  assert.ok(JUMP.sky / 1000 * SPEED - 2 >= .5, `a sky hop clears one gap tile from anywhere on the launching tile with ${(JUMP.sky / 1000 * SPEED - 2).toFixed(2)} tiles to spare`);
  assert.ok(TREE_LIMBS.bough < .2 && TREE_LIMBS.above < .2, 'no limb is drawn as thick as a slab');
});

test('the solver: every sampled version-18 tree is climbed from the ground to its crown, one-tile hops only, with margin; heights vary; deterministic', () => {
  const S = trees18(); assert.ok(S.length >= 8, `${S.length} trees`);
  const tops = new Set();
  for (const { x, y, g } of S) {
    const r = solveClimb(g.map); assert.ok(r.ok, `${x},${y}: ${r.reason || 'hurts'}`);
    assert.equal(r.hurt, 0, `${x},${y}: a climb without a fall`); assert.ok(r.maxGap <= 1, `${x},${y}: hops cross one gap tile`);
    if (r.hops) assert.ok(r.minMarginWorst >= .5, `${x},${y}: worst-start margin ${r.minMarginWorst}`);
    assert.equal(g.map.canopy.version, 21); tops.add(g.map.canopy.top);
    const again = loadAt(SAMPLE, x, y).g.map.canopy; assert.deepEqual(again, g.map.canopy, 'the same tree each load');
    for (const t of g.map.tiles) if (t.pad) { const s = at(g.map, t.x, t.y + 1); assert.ok(!(s?.canopy && (s.elev || 0) > t.elev), `${x},${y}: a perch never hangs right behind a higher branch`); }
    for (const o of g.map.objects) if (o.kind === 'tree') assert.ok(!behindGreatTrunk(g.map.canopy, o), `${x},${y}: no wood's tree in the trunk's drawn strip`);
  }
  assert.ok(tops.size >= 4, `heights vary: ${[...tops].sort((a, b) => a - b).join(' ')}`);
  assert.ok(Math.max(...tops) >= 30, 'some stand tall');
});

test('drawn is walkable: no platform hides behind the trunk once it is painted again; boughs keep off the platforms', () => {
  for (const { x, y, g } of [...trees18(), ...older().map((o) => ({ x: o.x, y: o.y, g: o.g }))]) {
    const c = g.map.canopy, trees = c.trees || [c], cov = coverage(g.map), hidden = cov.filter((q) => q.covered >= HIDDEN && !q.t.pad);
    const byTrunk = hidden.filter((q) => q.coveredByBranches < HIDDEN); // hidden only because of the trunk's face or the trunk drawn on above the crown
    assert.equal(byTrunk.length, 0, `${x},${y}: nothing hidden behind the trunk any more: ${byTrunk.map((q) => `${q.t.x},${q.t.y}@${q.t.elev}`).join(' ')}`);
    // What a twin branch returning two rows nearer the camera and three levels higher still covers (TREES_V18.turns): one tile
    // per tree, on the first side of a three-sided tree (at most four levels up) or the second side of a four-sided one (at most
    // three reaches up); older trees up to one per side.
    const R = TREES_V18.specs.spire.reach[1];
    if (c.version >= 18) { assert.ok(hidden.length <= trees.length, `${x},${y}: ${hidden.length} twin-covered tiles (${c.reach.length} sides)`); for (const q of hidden) assert.ok(q.t.elev <= (c.reach.length === 4 ? 3 * R : R - 1), `${x},${y}: the covered tile is low on the climb (${q.t.elev})`); assert.equal(cov.filter((q) => q.covered >= HIDDEN && q.t.pad).length, 0, `${x},${y}: perches in the open`); }
    else assert.ok(hidden.length <= 4, `${x},${y}: ${hidden.length} twin-covered tiles`);
    assert.ok(!cov.some((q) => q.boughOver), `${x},${y}: a bough crosses a platform`);
    const behind = canopyBehindTrunk(g.map.tiles, W, c.box); for (const t of behind) assert.ok(t.canopy && t.kind !== 'canopyTrunk');
  }
});

test('the trunk is solid: the crown is entered only from the climb\'s last tile, never from the ground; a step off it is a fall the glider catches', () => {
  for (const { x, y, g } of [...trees18(), ...older().map((o) => ({ x: o.x, y: o.y, g: o.g }))]) {
    const m = g.map, c = m.canopy;
    for (const [k, tr] of (c.trees || [c]).entries()) { const e = trunkEntries(m, tr), crownOnly = c.form === 'canopy' && k > 0; /* landscape 22: a canopy grove's other crowns are joined by bridges, not climbed */ assert.ok(e.length >= 1, `${x},${y}: a way onto the trunk at ${tr.x0},${tr.y0}`); for (const q of e) assert.ok(q.from.canopy && (q.from.elev === tr.top - 1 || (q.from.walk && q.from.elev === tr.top)), `${x},${y}: onto the trunk only from the climb's last tile or the canopy walk (${q.from.x},${q.from.y}@${q.from.elev})`); assert.equal(e.filter((q) => q.from.elev === tr.top - 1).length, crownOnly ? 0 : 1, `${x},${y}: one last step`); }
    for (const t of m.tiles) if (!t.canopy && footing(t)) for (const [dx, dy] of N4) { const n = at(m, t.x + dx, t.y + dy); if (n?.kind === 'canopyTrunk') { assert.ok(!step(m, t, n, true), `${x},${y}: the trunk cannot be stepped into from the ground`); } }
  }
  const { g } = loadAt(TIM.seed, ...TIM.sections.dead, TIM.version), rest = g.map.objects.find((o) => o.kind === 'crownRest');
  g.player.x = rest.x; g.player.y = rest.y; g.update(.05, idle, 1000); assert.ok(g.save.glider, 'the crown gives the glider');
  g.update(.05, { state: { x: 1, y: 0 }, consume: () => false, held: () => false }, 1050); let t = 1100; for (let i = 0; i < 8 && !g.glide; i++) g.update(.05, { state: { x: 1, y: 0 }, consume: () => false, held: () => false }, t += 50);
  assert.ok(g.glide, 'off the crown: a freefall (Jump opens the glider), not a death'); assert.ok(g.player.hp > 0);
});

test('completion: the first step onto the crown gives the glider once (one Journal entry), the Crown Rest holds once, the door opens the crossing', () => {
  const { s, g } = loadAt(TIM.seed, ...TIM.sections.dead, TIM.version), gate = g.map.objects.find((o) => o.kind === 'canopyGate'), rest = g.map.objects.find((o) => o.kind === 'crownRest');
  assert.ok(gate && rest && rest.x !== gate.x || rest.y !== gate.y); const crown = at(g.map, gate.x, gate.y); assert.equal(crown.kind, 'canopyTrunk'); assert.equal(crown.elev, g.map.canopy.top);
  assert.ok(!s.glider); g.player.x = rest.x; g.player.y = rest.y; g.update(.05, idle, 1000);
  assert.equal(s.glider, true); const entries = () => (s.lore?.journal || s.journal || []).filter((e) => JSON.stringify(e).includes('glider:found') || /glider/i.test(JSON.stringify(e))).length; const n1 = entries();
  assert.deepEqual([s.activeCheckpoint.rx, s.activeCheckpoint.ry, s.activeCheckpoint.crown], [...TIM.sections.dead, true], 'the rest holds');
  assert.ok(!g.touchCrownRest(), 'held once'); g.update(.05, idle, 1050); assert.equal(entries(), n1, 'the glider is found once');
  g.player.x = gate.x; g.player.y = gate.y; const r = g.interact('enter', gate.id); assert.ok(r.ok, g.message); assert.equal(g.area, 'dungeon'); assert.equal(s.session.activeDungeonId, `dungeon:${TIM.seed}:g${s.worldGeneration}:${TIM.sections.dead[0]}:${TIM.sections.dead[1]}:canopy`);
});

test('Tim\'s sections (landscape 17): the level-9 dead end was six climb tiles behind the trunk, now drawn; every tree climbs to its crown; 40,63 has none', () => {
  const dead = loadAt(TIM.seed, ...TIM.sections.dead, TIM.version).g.map, spire = loadAt(TIM.seed, ...TIM.sections.spire, TIM.version).g.map, shown = loadAt(TIM.seed, ...TIM.sections.shown, TIM.version).g.map, none = loadAt(TIM.seed, ...TIM.sections.none, TIM.version).g.map;
  assert.equal(none.canopy, undefined);
  assert.deepEqual([dead.canopy.form, dead.canopy.top, dead.canopy.x0, dead.canopy.y0], ['compact', 21, 24, 5], 'the tree in his screenshot: a 2 by 2 trunk, 21 levels');
  const knot = at(dead, 23, 4); assert.equal(knot.elev, 9, 'where he stood: level 9, left of the trunk');
  const behind = canopyBehindTrunk(dead.tiles, W, dead.canopy.box).map((t) => `${t.x},${t.y}`);
  for (const p of ['24,4', '24,3', '24,2', '25,2', '25,3', '25,4']) assert.ok(behind.includes(p), `${p}: the next step of the climb, behind the trunk, is painted again`);
  const r = solveClimb(dead); assert.ok(r.ok && r.hops === 0 && r.hurt === 0, 'the compact tree is a walk and one jump'); assert.equal(r.route[0].kind, 'jump'); assert.equal(r.route.at(-1).to.kind, 'canopyTrunk');
  for (const [name, m] of [['41,62', spire], ['44,63', shown]]) { const q = solveClimb(m); assert.ok(q.ok && q.hurt === 0, `${name} climbs`); assert.equal(q.hops, 4, `${name}: four hops`); assert.equal(q.maxGap, 1); assert.ok(q.minMarginWorst >= .5, `${name}: margin ${q.minMarginWorst}`); }
  assert.deepEqual([spire.canopy.top, shown.canopy.top], [32, 38]);
  for (const m of [dead, spire, shown]) { const c = m.canopy, hidden = coverage(m).filter((q) => q.covered >= HIDDEN && !q.t.pad); assert.ok(!hidden.some((q) => q.t.x >= c.x0 && q.t.x < c.x0 + c.size && q.t.y < c.y0), 'no climb tile hidden behind the trunk'); assert.ok(hidden.length <= 2, `${hidden.length} tiles covered by a twin branch nearer the camera (landscape 17 turns)`); }
  assert.ok(shown.objects.some((o) => o.kind === 'tree' && behindGreatTrunk(shown.canopy, o)), '44,63: the wood\'s trees that stood over the trunk are the ones drawn faint');
});

test('the crown veil: from the ground the door and the Crown Rest lie under leaves; the leaves thin as you climb; gone near the crown', () => {
  assert.equal(crownReveal(0, 21), 0); assert.equal(crownReveal(SKY.from, 21), 0); assert.equal(crownReveal(21 - CROWN_VEIL.below, 21), 1); assert.equal(crownReveal(60, 38), 1);
  const mid = crownReveal((38 * CROWN_VEIL.from + 38 - CROWN_VEIL.below) / 2, 38); assert.ok(mid > .3 && mid < .7);
  const { g } = loadAt(TIM.seed, ...TIM.sections.dead, TIM.version), gate = g.map.objects.find((o) => o.kind === 'canopyGate'), look = TREES.looks[g.map.canopy.trees[0].look].leaf;
  const veilArcs = (ctx) => ctx.marks.filter((q) => q.op === 'arc' && look.includes(q.fill) && q.alpha < 1 && q.alpha > 0).length + ctx.marks.filter((q) => q.op === 'arc' && look.includes(q.fill) && q.alpha === 1).length, starsAt = (ctx) => ctx.marks.findIndex((q) => q.op === 'fill' && q.fill === '#0b0e11');
  const frame = (x, y) => { g.player.x = x; g.player.y = y; const ctx = recordingCtx(); render(ctx, g, 475, 661, 5000); return ctx; };
  const ground = frame(23, 7); assert.ok(starsAt(ground) >= 0, 'the door is drawn'); const veil = ground.marks.slice(starsAt(ground)).filter((q) => q.op === 'arc' && look.includes(q.fill) && q.alpha === 1); assert.ok(veil.length >= CROWN_VEIL.leaves, `from the ground ${veil.length} leaves cover it, drawn after the door`);
  const top = frame(gate.x, gate.y); const after = top.marks.slice(Math.max(0, starsAt(top))).filter((q) => q.op === 'arc' && look.includes(q.fill) && q.alpha === 1); assert.ok(after.length < CROWN_VEIL.leaves, `on the crown the veil is gone (${after.length})`);
  const mids = frame(24, 3); const partly = mids.marks.filter((q) => q.op === 'arc' && look.includes(q.fill) && q.alpha > 0 && q.alpha < 1); assert.ok(partly.length >= CROWN_VEIL.leaves, `half way up (level ${at(g.map, 24, 3).elev}) the leaves are thinning: ${partly.length} faint`);
});

test('the hop: from the inner edge of a tip the sky jump lands on the twin tip; the thumb\'s drift does not carry it off; a dodge on a branch runs along it', () => {
  const { g } = loadAt(TIM.seed, ...TIM.sections.spire, TIM.version); const m = g.map; assert.deepEqual([at(m, 11, 11).elev, at(m, 12, 11).canopy, at(m, 13, 11).elev], [3, undefined, 4], 'the first hop: 11,11 to 13,11 over open ground');
  // Jump pressed at the tip's inner edge (the reference point under the feet just inside 11,11), the stick held east with `drift`
  // south on it, until the jump ends; then the stick is let go.
  const hop = (drift, straight) => { const was = TREE_FOOTING.straightHop; TREE_FOOTING.straightHop = straight; try {
    g.player.x = 10.52; g.player.y = 10.4; g.player.hp = g.player.maxHp = 400; g.save.maxHp = 400; g.jumpUntil = 0; g.skyAir = null; g.glide = null; let t = 1000, pressed = false;
    for (let i = 0; i < 40; i++) { const flying = !pressed || t + 50 < g.jumpUntil; g.update(.05, { state: flying ? { x: 1, y: drift } : { x: 0, y: 0 }, consume: (k) => k === 'jump' && !pressed ? (pressed = true) : false, held: () => false }, t += 50); if (pressed && t > g.jumpUntil + 200) break; }
    return { x: g.player.x, y: g.player.y, hp: g.player.hp, under: m.tiles[Math.floor(g.player.y + .75) * W + Math.floor(g.player.x + .5)] };
  } finally { TREE_FOOTING.straightHop = was; } };
  const clean = hop(0, true); assert.deepEqual([clean.under.x, clean.under.y, clean.hp], [13, 11, 400], `landed on the twin tip from the far edge (${clean.x.toFixed(2)},${clean.y.toFixed(2)})`);
  const drifted = hop(.5, true); assert.deepEqual([drifted.under.x, drifted.under.y, drifted.hp], [13, 11, 400], 'a diagonal thumb still lands it');
  const loose = hop(.5, false); assert.ok(loose.under.y !== 11 || loose.hp < 400, 'without the straight hop the same thumb drifts off the line and falls');
  // a dodge on a branch: 11,10 (level 2) runs north-south; a dodge aimed mostly south goes straight along it, not off its side
  g.player.x = 11; g.player.y = 9.5; g.player.hp = 400; g.jumpUntil = 0; g.skyAir = null; g.player.stamina = 100; let t = 5000, d = false;
  g.update(.05, { state: { x: .5, y: .9 }, consume: (k) => k === 'dodge' && !d ? (d = true) : false, held: () => false }, t);
  assert.deepEqual([g.player.dodgeX, g.player.dodgeY], [0, 1], 'snapped to the branch\'s axis');
  for (let i = 0; i < 5; i++) g.update(.05, { state: { x: .5, y: .9 }, consume: () => false, held: () => false }, t += 50); // the dodge's 260 ms and a step
  assert.equal(Math.floor(g.player.x + .5), 11, 'still on the branch'); assert.equal(g.player.hp, 400); assert.equal(Math.floor(g.player.y + .75), 11, 'and at its tip, a level up');
});

test('a tree the Far Sleep paved over is struck from the record on older ground; landscape 18 grows none there, and the Atlas says so', () => {
  const seed = 'AUDIT-A', x = 185, y = 22; assert.ok(dreamsHere(seed, x, y, DREAM_VERSION, 17), 'a section that dreams');
  const m17 = generateRegion(seed, x, y); applyLandscape(m17, seed, x, y, { version: 17 }); assert.ok(m17.canopy, 'version 17 grew a tree here'); applyDream(m17, seed, x, y, DREAM_VERSION);
  assert.ok(m17.tiles.some((t) => t.canopy && t.kind !== 'canopyBranch' && t.kind !== 'canopyLeaf' && t.kind !== 'canopyTrunk'), 'the dream paved it'); assert.ok(mendCanopy(m17)); assert.equal(m17.canopy, undefined); assert.ok(!m17.tiles.some((t) => t.canopy) && !m17.objects.some((o) => o.kind === 'canopyGate'));
  const old = loadAt(seed, x, y, 17).g; assert.equal(old.map.canopy, undefined); assert.ok(!old.map.objects.some((o) => o.kind === 'crownRest' || o.kind === 'canopyGate'), 'in the game: no rest, no door');
  const m18 = generateRegion(seed, x, y); applyLandscape(m18, seed, x, y, { version: 18 }); assert.equal(m18.canopy, undefined); assert.equal(wonderAt(seed, x, y, 'tree'), false);
  const whole = loadAt(TIM.seed, ...TIM.sections.dead, TIM.version).g.map; assert.ok(!mendCanopy(whole), 'a whole tree is left alone');
});

test('older ground regenerates byte for byte: fingerprints of version 12 to 17 sections taken on main before this change', () => {
  const fp = (seed, v, x, y) => { const m = generateRegion(seed, x, y); applyLandscape(m, seed, x, y, { version: v }); applyDream(m, seed, x, y, DREAM_VERSION); return [createHash('sha1').update(JSON.stringify({ tiles: m.tiles, objects: m.objects, canopy: m.canopy || null, spawns: m.enemySpawns || null })).digest('hex').slice(0, 16), !!m.canopy]; };
  for (const [seed, v, x, y, hash] of [['CANOPY631', 12, 74, 21, 'e3a37870954cde51'], ['CANOPY631', 12, 139, 56, 'aafe52be49226e02'], ['CANOPY631', 13, 49, 119, '786ca27bff9f0d0f'], ['AUDIT-A', 13, 14, 70, 'ef056cca60938f2f'], ['CANOPY631', 14, 59, 14, 'e121abf48f2d48b9'], ['CANOPY631', 14, 69, 21, 'f825f1b7c9d5293a'], ['CANOPY631', 17, 59, 14, 'e121abf48f2d48b9'], ['CANOPY631', 17, 69, 21, 'f825f1b7c9d5293a']]) {
    const [h, tree] = fp(seed, v, x, y); assert.ok(tree, `${seed} v${v} ${x},${y} has a tree`); assert.equal(h, hash, `${seed} v${v} ${x},${y}`);
  }
});
