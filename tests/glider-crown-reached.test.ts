// Tim, 2026-11-05, Decisions 13 and 14 on gliding off great trees (vehicle-gates.ts TREE_GLIDE.home):
// 13. You wake on the crown only if you actually reached it. A death after a glide wakes you on the crown only when the last
//     ground you stood on was that crown (game.ts `crownFoot`); a glide from halfway up, a lower branch, a grove's lesser crown, or
//     ground merely as high as the crown gives the ordinary recovery at the active rest point. A drone lift that rises past the
//     crown cannot open the glider (its end is a fall) and never counts; a drone that sets you down on the crown does, as standing
//     on it does however you came.
// 14. Waking on the crown after such a death makes that crown's Crown Rest the active rest point, as if it had been touched
//     (game.ts takeCrownRest, the touchCrownRest path), and it survives a save and reload exactly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, GLIDE } from '../src/game.ts';
import { generateRegion } from '../src/world.ts';
import { applyLandscape, sectionRegion, LANDSCAPE_VERSION } from '../src/landscape.ts';
import { TREE_GLIDE, DRONE, setMechMode } from '../src/vehicle-gates.ts';

const W = 32, T = (g, x, y) => g.map.tiles[y * W + x];
const input = (f = {}) => { let jump = !!f.jump; return { state: { x: f.x || 0, y: f.y || 0 }, consume: (k) => (k === 'jump' && jump ? (jump = false, true) : false), held: (k) => k === 'jump' && !!f.hold }; };
function fly(g, frames, plan, t0) { let t = t0; for (let i = 0; i < frames; i++) { const f = plan(i) || {}; g.enemies = []; g.update(.05, input(f), t); t += 50; if (f.until?.()) break; } return t; }
const deaths = (g) => g.save.worldFlags.deaths || 0;
const SEED = 'GLIDEHOME';
const save = (seed = SEED) => { const s = freshSave(); s.seed = seed; s.maxHp = 100; s.glider = true; s.capabilities = { ...(s.capabilities || {}), swim: false }; return s; };
const sections = {}; function treesOf(seed, n, grove = false) {
  const key = `${seed}:${grove}`; if (sections[key]?.length >= n) return sections[key]; const out = sections[key] = [];
  for (let x = 14; x < 420 && out.length < n; x++) for (let y = 14; y < 420 && out.length < n; y += 5) { if (sectionRegion(seed, x, y, LANDSCAPE_VERSION).type !== 'jungle') continue; const m = generateRegion(seed, x, y); applyLandscape(m, seed, x, y, { version: LANDSCAPE_VERSION }); if (m.canopy?.top && (!grove || m.canopy.trees?.length > 1)) { const g = visit(x, y, seed); if (g.map.canopy?.top && (!grove || g.map.canopy.trees?.length > 1)) out.push([x, y]); x += 6; } }
  return out;
}
const visit = (rx, ry, seed = SEED) => { const g = new Game(save(seed), 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); g.enemies = []; g.map.enemySpawns = []; g.player.hp = g.save.maxHp; return g; };
const atTree = (k = 0, grove = false) => { const [x, y] = treesOf(SEED, k + 1, grove)[k]; return visit(x, y); };
const refuge = (g) => { g.save.activeCheckpoint = { rx: 0, ry: 0, x: 16, y: 16, name: 'Ember Refuge' }; };
const cpKey = (c) => c && [c.rx, c.ry, c.x, c.y].join(',');
const under = (g) => T(g, Math.floor(g.player.x + .5), Math.floor(g.player.y + .75));
const onCrown = (g) => { const u = under(g); return !!u && u.kind === 'canopyTrunk' && u.elev === g.map.canopy?.top; };
const restOf = (g) => g.map.objects.find((o) => o.kind === 'crownRest' && !o.keepRest);
// A tile (matching `pick`) with a neighbour over open air at least GLIDE.minDrop below it, and that neighbour's direction.
function edgeOf(g, pick) {
  for (const d of [[-1, 0], [1, 0], [0, 1], [0, -1]]) for (const t of g.map.tiles) { if (!pick(t)) continue; const n = T(g, t.x + d[0], t.y + d[1]); if (n && !n.blocked && !n.canopy && (n.elev || 0) <= (t.elev || 0) - GLIDE.minDrop) return { t, d }; }
  return null;
}
// Stand on `e.t` for a few frames, then walk off its edge into the freefall.
function walkOff(g, e, t = 1000) { Object.assign(g.player, { x: e.t.x, y: e.t.y - .25 }); t = fly(g, 3, () => ({}), t); return fly(g, 40, () => ({ x: e.d[0], y: e.d[1], until: () => !!g.glide }), t); }
const crownEdge = (g) => edgeOf(g, (t) => t.kind === 'canopyTrunk' && t.elev === g.map.canopy.top);
// Everything off the tree becomes open sea: a glide that comes down anywhere drowns (no Tidemantle).
const sea = (g) => { for (const q of g.map.tiles) if (!q.canopy) Object.assign(q, { kind: 'ocean', blocked: false, elev: 0, structure: null, landscape: 'sea' }); };
const dieOut = (g, t) => { const n0 = deaths(g); t = fly(g, 900, () => ({ until: () => deaths(g) > n0 }), t); t = fly(g, 4, () => ({}), t); assert.equal(deaths(g) - n0, 1, 'one death'); return t; };

test('the table: reached and setsRest are on, with the wake note', () => {
  assert.equal(TREE_GLIDE.home.reached, true); assert.equal(TREE_GLIDE.home.setsRest, true); assert.equal(TREE_GLIDE.home.crownWithin, 0);
  assert.equal(typeof TREE_GLIDE.home.rest, 'string'); assert.ok(TREE_GLIDE.home.rest.length > 10);
});

test('a freefall off the crown itself remembers the tree; the death wakes on the crown and takes its Crown Rest (Decisions 13 and 14)', () => {
  for (const k of [0, 1, 2]) {
    const g = atTree(k), tree = [g.rx, g.ry], rest = restOf(g); assert.ok(rest, 'every great crown has its Crown Rest');
    const e = crownEdge(g); assert.ok(e, 'a crown edge over open air'); let t = walkOff(g, e); refuge(g); sea(g);
    assert.ok(g.glide, 'the freefall'); assert.deepEqual([g.glideHome?.rx, g.glideHome?.ry], tree, 'remembered: the crown was the last ground stood on');
    t = dieOut(g, t);
    assert.deepEqual([g.rx, g.ry], tree); assert.ok(onCrown(g), 'woke on the crown');
    assert.equal(cpKey(g.save.activeCheckpoint), cpKey({ rx: tree[0], ry: tree[1], x: rest.x, y: rest.y }), 'the Crown Rest is the active rest point');
    assert.equal(g.save.activeCheckpoint.name, 'Crown Rest'); assert.equal(g.save.activeCheckpoint.crown, true);
    assert.deepEqual(g.save.checkpoints[`${tree[0]},${tree[1]}`], g.save.activeCheckpoint, 'kept among the rest points, as a touch keeps it');
    assert.ok(g.message.includes(TREE_GLIDE.home.wake) && g.message.includes(TREE_GLIDE.home.rest.trim()), g.message);
  }
});

// 2026-11-13 (Tim: the glider is for great trees only): was 'a freefall from there remembers nothing'. Ground as high as the crown
// is not the tree, so walking off it is no glide at all, only an ordinary (here lethal) fall, and the recovery is the ordinary one.
test('ground as high as the crown is not the crown: walking off it is an ordinary fall, never a glide, and nothing is remembered', () => {
  const g = atTree(0), top = g.map.canopy.top, b = g.map.canopy.box;
  // A pillar of ordinary ground beside the tree, raised to the crown's height, over open air on its far side.
  const p = g.map.tiles.find((t) => !t.canopy && !t.blocked && t.x >= 3 && t.x <= 28 && t.y >= 3 && t.y <= 28 && (t.x < b.x - 2 || t.x > b.x + b.n + 2) && [[-1, 0], [1, 0], [0, 1], [0, -1]].every(([a, c]) => !T(g, t.x + a, t.y + c).canopy));
  assert.ok(p); Object.assign(p, { kind: 'grass', elev: top, slope: false, structure: null }); for (const [a, c] of [[-1, 0], [1, 0], [0, 1], [0, -1]]) Object.assign(T(g, p.x + a, p.y + c), { kind: 'grass', elev: 0, blocked: false, slope: false, structure: null });
  refuge(g); const n0 = deaths(g); let fell = false, t = 1000; Object.assign(g.player, { x: p.x, y: p.y - .25 }); t = fly(g, 3, () => ({}), t);
  t = fly(g, 60, () => { fell ||= !!g.fall; return { x: 1, until: () => !!g.glide || deaths(g) > n0 }; }, t);
  assert.equal(g.glide, null, 'no glide'); assert.ok(fell, 'an ordinary fall'); assert.equal(g.glideHome, null, 'never stood on the crown: nothing remembered');
  t = fly(g, 6, () => ({}), t); assert.equal(deaths(g) - n0, 1, `a fall of ${top} levels is lethal`); assert.deepEqual([g.rx, g.ry, g.player.x, g.player.y], [0, 0, 16, 16], 'the ordinary recovery'); assert.equal(g.save.activeCheckpoint.name, 'Ember Refuge', 'the rest point untouched');
});

test('a glide opened mid-jump from a lower branch, or from the highest branch just under the crown, wakes at the rest point', () => {
  const g = atTree(0), top = g.map.canopy.top;
  const hi = edgeOf(g, (t) => t.canopy && t.kind !== 'canopyTrunk' && !t.slope && t.elev >= GLIDE.minDrop + 2 && t.elev === Math.max(...g.map.tiles.filter((q) => q.canopy && q.kind !== 'canopyTrunk' && !q.slope).map((q) => q.elev || 0)));
  const lo = edgeOf(g, (t) => t.canopy && t.kind !== 'canopyTrunk' && !t.slope && t.elev >= GLIDE.minDrop + 2 && t.elev <= top - 6);
  for (const e of [hi, lo].filter(Boolean)) {
    const h = visit(g.rx, g.ry); refuge(h); Object.assign(h.player, { x: e.t.x, y: e.t.y - .25 }); let t = fly(h, 3, () => ({}), 1000); assert.equal(h.crownFoot, null, 'a branch is not the crown');
    t = fly(h, 1, () => ({ jump: true, x: e.d[0], y: e.d[1] }), t); t = fly(h, 6, () => ({ x: e.d[0], y: e.d[1] }), t); if (!h.glide) t = fly(h, 1, () => ({ jump: true, x: e.d[0], y: e.d[1] }), t);
    if (!h.glide) t = fly(h, 40, () => ({ x: e.d[0], y: e.d[1], until: () => !!h.glide }), t);
    assert.ok(h.glide, `a glide off the branch at ${e.t.elev} (crown ${top})`); assert.equal(h.glideHome, null, 'nothing remembered'); sea(h);
    t = dieOut(h, t); assert.deepEqual([h.rx, h.ry, h.player.x, h.player.y], [0, 0, 16, 16], 'the ordinary recovery'); assert.equal(h.save.activeCheckpoint.name, 'Ember Refuge');
  }
  assert.ok(hi || lo, 'a branch over open air');
});

test('a grove: a glide off the lesser tree\'s crown never wakes you on the great crown, even after you stood on the great crown', () => {
  const g = atTree(0, true), c = g.map.canopy, lesser = c.trees.find((q) => q.low); assert.ok(lesser && lesser.top < c.top, 'the lesser crown is lower than the great one');
  const e = edgeOf(g, (t) => t.kind === 'canopyTrunk' && t.elev === lesser.top && t.x >= lesser.x0 && t.x < lesser.x0 + lesser.size && t.y >= lesser.y0 && t.y < lesser.y0 + lesser.size); assert.ok(e, 'a lesser crown edge over open air');
  for (const first of [false, true]) {
    const h = visit(g.rx, g.ry); refuge(h);
    if (first) { const s = crownEdge(h).t; Object.assign(h.player, { x: s.x, y: s.y - .25 }); fly(h, 3, () => ({}), 500); assert.deepEqual(h.crownFoot, { rx: h.rx, ry: h.ry }, 'stood on the great crown'); refuge(h); }
    let t = walkOff(h, { t: T(h, e.t.x, e.t.y), d: e.d }); assert.ok(h.glide, 'the freefall'); assert.equal(h.glideHome, null, 'the lesser crown is not the great crown'); sea(h);
    t = dieOut(h, t); assert.deepEqual([h.rx, h.ry, h.player.x, h.player.y], [0, 0, 16, 16], 'the ordinary recovery, never the great crown'); assert.equal(h.save.activeCheckpoint.name, 'Ember Refuge');
  }
});

function droneOut(g) { g.save.consumables.submersible = 1; g.save.perception.aperture = 3255; g.save.farArray = { listeners: 10, gate: 5 }; setMechMode(g.save, 'drone'); g.useConsumable('submersible', 0); assert.ok(g.droneUp()); g.save.mech.fuel = DRONE.carry; }
test('the drone: a lift past the crown cannot open the glider and its fall is the ordinary death; set down on the crown, it counts', () => {
  { const g = atTree(0), top = g.map.canopy.top, b = g.map.canopy.box; droneOut(g); refuge(g);
    const spot = g.map.tiles.find((t) => !t.canopy && !t.blocked && (t.elev || 0) === 0 && t.x > 2 && t.x < 29 && t.y > 2 && t.y < 29 && (t.x < b.x - 3 || t.x > b.x + b.n + 3)); assert.ok(spot);
    Object.assign(g.player, { x: spot.x, y: spot.y - .25 }); fly(g, 3, () => ({}), 500); g.droneLift = { base: 0, z: top + 3, vz: 0 }; g.jumpUntil = 1e9; let t = fly(g, 4, () => ({ hold: true }), 1000);
    t = fly(g, 1, () => ({ jump: true, hold: true }), t); assert.equal(g.glide, null, 'Jump in a lift does not open the glider'); assert.equal(g.crownFoot, null);
    const n0 = deaths(g); g.endDroneLift(t); t = fly(g, 3, () => ({}), t); assert.equal(g.glide, null, 'stowed high, the lift ends in a fall, not a freefall'); assert.equal(g.glideHome, null);
    assert.ok(g.fall, 'a fall with real airtime (fall physics, game.ts FALL)'); t = fly(g, 200, () => ({ until: () => deaths(g) > n0 }), t); assert.equal(deaths(g) - n0, 1, 'the fall kills'); assert.deepEqual([g.rx, g.ry, g.player.x, g.player.y], [0, 0, 16, 16], 'the ordinary recovery'); }
  { const g = atTree(1), tree = [g.rx, g.ry], top = g.map.canopy.top, rest = restOf(g); droneOut(g); refuge(g); const e = crownEdge(g); assert.ok(e);
    Object.assign(g.player, { x: e.t.x, y: e.t.y - .25 }); g.droneLift = { base: 0, z: top + .4, vz: 0 }; g.jumpUntil = 1e9; g.crownFoot = null;
    let t = fly(g, 60, () => ({ until: () => !g.droneLift }), 1000); t = fly(g, 3, () => ({}), t); assert.ok(g.player.hp > 0 && onCrown(g), 'set down on the crown'); assert.deepEqual(g.crownFoot, { rx: tree[0], ry: tree[1] });
    refuge(g); sea(g); t = fly(g, 40, () => ({ x: e.d[0], y: e.d[1], until: () => !!g.glide }), t); assert.ok(g.glide, 'a freefall with the drone out'); assert.deepEqual([g.glideHome?.rx, g.glideHome?.ry], tree, 'it counts: the crown was stood on');
    t = dieOut(g, t); assert.ok(onCrown(g)); assert.equal(cpKey(g.save.activeCheckpoint), cpKey({ rx: tree[0], ry: tree[1], x: rest.x, y: rest.y })); }
});

test('exact resume: saved just after the wake, the Crown Rest, the spot and the crown footing reload exactly; a jump off the crown saved mid-air still remembers', () => {
  const g = atTree(1), tree = [g.rx, g.ry], rest = restOf(g), e = crownEdge(g); let t = walkOff(g, e); refuge(g); sea(g); t = dieOut(g, t);
  const snap = JSON.parse(JSON.stringify(g.exportSnapshot(t))); assert.deepEqual(snap.session.playerRuntime.crownFoot, { rx: tree[0], ry: tree[1] }); assert.equal(snap.session.playerRuntime.glideHome, null);
  const b = new Game(migrateSave(snap), 9000); b.enemies = [];
  assert.deepEqual([b.rx, b.ry, b.player.x, b.player.y], [g.rx, g.ry, g.player.x, g.player.y], 'where it was'); assert.ok(onCrown(b));
  assert.deepEqual(b.save.activeCheckpoint, g.save.activeCheckpoint, 'the Crown Rest kept'); assert.equal(cpKey(b.save.activeCheckpoint), cpKey({ rx: tree[0], ry: tree[1], x: rest.x, y: rest.y }));
  assert.deepEqual(b.save.checkpoints[`${tree[0]},${tree[1]}`], b.save.activeCheckpoint); assert.deepEqual(b.crownFoot, g.crownFoot); assert.equal(b.glideHome, null); assert.equal(b.glide, null);
  assert.equal(b.player.hp, g.player.hp); assert.equal(b.paused, g.paused);
  // An ordinary death after the reload wakes at that Crown Rest (the rest point now), on the crown.
  { b.player.hp = 0; let u = fly(b, 4, () => ({}), 9000); assert.deepEqual([b.rx, b.ry, b.player.x, b.player.y], [tree[0], tree[1], rest.x, rest.y], 'woke at the Crown Rest'); assert.ok(onCrown(b)); }
  // A jump off the crown saved before the glider opens: the crown footing comes back, so the glide opened after reload remembers the tree.
  const h = atTree(1); const he = crownEdge(h); Object.assign(h.player, { x: he.t.x, y: he.t.y - .25 }); let v = fly(h, 3, () => ({}), 1000); refuge(h);
  v = fly(h, 1, () => ({ jump: true, x: he.d[0], y: he.d[1] }), v); v = fly(h, 2, () => ({ x: he.d[0], y: he.d[1] }), v); assert.equal(h.glide, null, 'still in the jump'); assert.ok(h.crownFoot);
  const s2 = JSON.parse(JSON.stringify(h.exportSnapshot(v))); const r = new Game(migrateSave(s2), 20000); r.enemies = []; assert.deepEqual(r.crownFoot, h.crownFoot); assert.ok(r.jumpUntil > 20000, 'the jump resumes');
  assert.deepEqual([r.jumpFrom, r.skyAir, r.jumpDur], [h.jumpFrom, h.skyAir, h.jumpDur], 'at the height it left from (jumpAir; before, the sky-hop height was lost on reload)');
  let w = fly(r, 1, () => ({ jump: true, x: he.d[0], y: he.d[1] }), 20000); if (!r.glide) w = fly(r, 40, () => ({ x: he.d[0], y: he.d[1], until: () => !!r.glide }), w);
  assert.ok(r.glide); assert.deepEqual([r.glideHome?.rx, r.glideHome?.ry], [h.rx, h.ry], 'remembered after the reload');
  // An older save without the field reads as not on a crown.
  const s3 = JSON.parse(JSON.stringify(s2)); delete s3.session.playerRuntime.crownFoot; assert.equal(new Game(migrateSave(s3), 0).crownFoot, null);
  // Wayglass travel clears it, as it clears the glide.
  r.clearCarriedStates(); assert.equal(r.crownFoot, null);
});

test('a jump off the crown: opened mid-jump, or left to end over open air (a freefall), the glide remembers the tree', () => {
  for (const open of [true, false]) {
    const g = atTree(2), tree = [g.rx, g.ry], top = g.map.canopy.top, e = edgeOf(g, (t) => t.kind === 'canopyTrunk' && t.elev === top && t.y > 2); assert.ok(e);
    Object.assign(g.player, { x: e.t.x, y: e.t.y - .25 }); let t = fly(g, 3, () => ({}), 1000); assert.deepEqual(g.crownFoot, { rx: tree[0], ry: tree[1] });
    t = fly(g, 1, () => ({ jump: true, x: e.d[0], y: e.d[1] }), t);
    t = fly(g, 60, () => ({ x: e.d[0], y: e.d[1], jump: open && T(g, Math.floor(g.player.x + .5), Math.floor(g.player.y + .75))?.kind !== 'canopyTrunk', until: () => !!g.glide }), t);
    assert.ok(g.glide, `the glide (${open ? 'opened mid-jump' : 'a freefall as the jump ends'})`); assert.equal(g.glide.open, open);
    assert.deepEqual([g.glideHome?.rx, g.glideHome?.ry], tree, 'remembered'); refuge(g); sea(g); t = dieOut(g, t); assert.ok(onCrown(g)); assert.equal(g.save.activeCheckpoint.name, 'Crown Rest');
  }
});
