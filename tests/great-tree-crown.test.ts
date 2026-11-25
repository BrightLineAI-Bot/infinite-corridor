// The great tree's crown as its own level, and falls that come down (Tim, 2026-11-22, on his phone at release 1050, at the
// great tree the Rite of Ascendancy raised in section -3,1 of his journey): "sometimes it'll jump you, not into the branches, and
// you end up at the top, then you jump off and die... the top of the tree is not accessible... until you've passed through a
// series of steps... the top must be kept separate from the bottom... I just keep falling, and it's either instant death... I
// can't even see the ground of the platform. If I move from where I am, I'm going to die."
// His tree stands on flat ground with no landscape layer: there the height rules were off (canStep let him walk onto the crown,
// elevationAt read 0, so every jump on the tree landed 38 levels "down"), and the standard view drew the wood flat. The real Game,
// on his seed and section (his save itself stays out of the repo), on other rite trees and on ordinary great trees.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, GLIDE, FALL, JUMP, GREAT_CROWN, crownSpot, fallAirtime } from '../src/game.ts';
import { canStep, fallDamage, CROWN_GATE, LETHAL_KINDS, liftAt, LIFT_PER_LEVEL, tileLiftScale } from '../src/landscape.ts';
import { drawLandscapeTile, CANOPY_RIM } from '../src/landscape-render.ts';
import { outdoorRelief, outdoorSurfaceZ, OUTDOOR } from '../src/close-view-outdoor.ts';
import { ASCENDANCY } from '../src/ascendancy.ts';
import { render } from '../src/renderer.ts';
import { CLOSE_VIEW_HOOKS, closeViewLeap, closeViewShowing, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { resetCloseViewGL } from '../src/close-view-gl.ts';
import { DRONE, setMechMode } from '../src/vehicle-gates.ts';

const TIM = { seed: 'CORRIDOR-MWQDXDQA1BNE5V', rx: -3, ry: 1 }; // his rite tree: crown at 38, on flat ground
const RITES = [[TIM.seed, -3, 1], [TIM.seed, -4, -1], [TIM.seed, 0, 6], ['GLIDEHOME', 0, -7], ['TREEA', 2, -2]]; // flat, flat, on a landscape, flat, on a landscape
const W = 32, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], at = (g, x, y) => (x < 0 || y < 0 || x >= W || y >= W) ? null : g.map.tiles[y * W + x];
const under = (g) => at(g, Math.floor(g.player.x + .5), Math.floor(g.player.y + .75));
const top = (g) => g.map.canopy.top;
const onCrown = (g) => { const u = under(g); return !!u && u.kind === 'canopyTrunk' && u.elev === top(g); };
const deaths = (g) => g.save.worldFlags.deaths || 0;
const rite = (seed, rx, ry, glider = true, extra = {}) => { const s = freshSave(); s.seed = seed; s.maxHp = 100; s.glider = glider; s.capabilities = { ...(s.capabilities || {}), swim: false }; s.ascendancy = { [`${rx},${ry}`]: { tries: 1, done: true, risen: true, bloom: true } }; Object.assign(s, extra); const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); g.enemies = []; g.map.enemySpawns = []; g.player.hp = s.maxHp; return g; };
const tim = (glider = true) => rite(TIM.seed, TIM.rx, TIM.ry, glider);
const input = (f: any = {}) => { let jump = !!f.jump, dodge = !!f.dodge; return { state: { x: f.x || 0, y: f.y || 0 }, consume: (k) => (k === 'jump' && jump ? (jump = false, true) : k === 'dodge' && dodge ? (dodge = false, true) : false), held: (k) => k === 'jump' && !!f.hold }; };
function fly(g, frames, plan, t0, dt = 1 / 30) { let t = t0; for (let i = 0; i < frames; i++) { const f = plan(i) || {}; g.enemies = []; g.update(dt, input(f), t); t += dt * 1000; if (f.until?.()) break; } return t; }
const stand = (g, t, x, y) => { Object.assign(g.player, { x: t.x + (x ?? 0), y: t.y - .25 + (y ?? 0) }); return fly(g, 3, () => ({}), 1000); };
const crownTiles = (g) => g.map.tiles.filter((t) => t.kind === 'canopyTrunk' && t.elev === top(g));
const isCrown = (g, t) => !!t && t.kind === 'canopyTrunk' && t.elev === top(g);
// Ground (not tree) beside the crown, and the tree's own tiles beside it, with the direction onto the crown.
function besideCrown(g) {
  const out = [];
  for (const c of crownTiles(g)) for (const [dx, dy] of N4) { const n = at(g, c.x - dx, c.y - dy); if (n && !n.blocked && !isCrown(g, n) && !LETHAL_KINDS.has(n.kind)) out.push({ from: n, to: c, d: [dx, dy] }); }
  return out;
}
const refuge = (g) => { g.save.activeCheckpoint = { rx: 0, ry: 0, x: 16, y: 16, name: 'Ember Refuge' }; };

test('the tables: the gate is one level, the rite tree\'s layer is the skyways\' minimal one, a closed freefall comes down', () => {
  assert.equal(CROWN_GATE.below, 1, 'onto the crown only from the last step, one level under it');
  assert.deepEqual({ ...GREAT_CROWN.levels }, { version: 1, biome: null, name: null, riteLevels: true }, 'version 1: no sea creatures or dive sites (they need 2), no biome (no sky, banner or music change)');
  assert.equal(GREAT_CROWN.wood, 'jungle', 'drawn as every other great tree is'); assert.ok(GREAT_CROWN.freefallReach >= 1 && GREAT_CROWN.freefallReach <= 3);
  assert.equal(fallDamage(1, 100), 0); assert.ok(fallDamage(2, 100) > 0 && fallDamage(3, 100) > fallDamage(2, 100)); assert.equal(fallDamage(4, 100), Infinity, 'the fall table is unchanged');
});

test('Tim\'s tree: a rite tree on flat ground keeps its heights; its wood is drawn raised with its rims, in both views', () => {
  const g = tim(), c = g.map.canopy; assert.equal(top(g), 38); assert.equal(g.map.landscape?.riteLevels, true, 'the minimal layer');
  assert.ok(g.map.tiles.filter((t) => t.canopy).every((t) => t.landscape === 'jungle'), 'every tile of the wood drawn as wood');
  assert.ok(g.map.tiles.filter((t) => !t.canopy).every((t) => !t.landscape), 'the ground round it is untouched');
  const spot = crownSpot(g.map); Object.assign(g.player, spot); assert.ok(onCrown(g));
  assert.equal(g.playerLevel(), 38, 'standing at the crown\'s height (it read 0)'); assert.equal(g.fallArea(), true, 'the fall model applies');
  const lift = liftAt(g.map, W, g.player.x, g.player.y); assert.ok(Math.abs(lift - 38 * LIFT_PER_LEVEL * tileLiftScale(under(g))) < 1e-9 && lift > 0, 'the standard view raises the Wayfarer to the crown');
  // The standard view's ground cache paints the crown raised, rimmed in gold where it ends over the drop.
  const calls: string[] = []; const ctx = new Proxy({}, { get: (o, k) => k === 'fillStyle' ? '' : typeof k === 'string' && ['fillRect', 'drawImage'].includes(k) ? (...a) => { calls.push(String(k)); } : () => ({ addColorStop() {} }), set: (o, k, v) => { if (k === 'fillStyle' && v === CANOPY_RIM.edge) calls.push('rim'); return true; } });
  const t = under(g); assert.equal(drawLandscapeTile(ctx, t, t.x, t.y, 32, g.map.tiles, W), true, 'the crown tile is drawn as wood'); assert.ok(calls.includes('rim'), 'its edge over the drop is rimmed');
  // Close View: the ground under the feet is the crown's own surface, as high as the standard view puts the Wayfarer.
  const R: any = outdoorRelief(g.map), z = outdoorSurfaceZ(R, t.x + .5, t.y + .5); assert.ok(Math.abs(z - 38 * OUTDOOR.terrain.canopyLevel) < 1e-6, `Close View's crown at ${z}`);
  // Every other rite tree: on flat ground the same layer; on a landscape its own layer is kept.
  for (const [seed, rx, ry] of RITES.slice(1)) { const h = rite(seed, rx, ry); assert.ok(h.map.canopy?.top, `${seed} ${rx},${ry}`); assert.ok(h.map.landscape, 'heights hold'); assert.ok(h.map.tiles.filter((q) => q.canopy).every((q) => q.landscape)); }
});

test('the root cause: on his tree a walk from the ground went straight onto the crown (canStep without a landscape); now nothing but the climb gets there', () => {
  const g = tim(), cases = besideCrown(g); assert.ok(cases.length >= 8);
  for (const { from, to, d } of cases) {
    if ((from.elev || 0) >= top(g) - 1) continue; // the last step: the climb itself
    for (const jumping of [false, true]) assert.equal(canStep({ isPlayer: true, jumping }, g.map, W, from.x, from.y - .25, to.x, to.y - .25), false, `${from.x},${from.y}@${from.elev || 0} → crown ${jumping ? 'jumping' : 'walking'}`);
    // Walking, jumping and dodging at it for two seconds: never on the crown.
    for (const f of [{}, { jump: true }, { dodge: true }]) { const h = tim(); let t = stand(h, from); t = fly(h, 60, (i) => ({ x: d[0], y: d[1], ...(i % 12 === 0 ? f : {}) }), t); assert.ok(!onCrown(h), `${JSON.stringify(f)} from ${from.x},${from.y}`); }
  }
});

test('every route that skips the climb is barred at the crown: inflated heights (Aerial Step, a wall hold, the drone), a blow, Rift Step', () => {
  const g = tim(), last = besideCrown(g).find((q) => q.from.canopy && q.from.elev === top(g) - 1), low = besideCrown(g).find((q) => q.from.canopy && q.from.elev < top(g) - 2);
  assert.ok(last && low, 'his tree has its last step and lower branches against the crown');
  // A body held in the air at the crown's height (held air, a wall hold's lift, the drone's) whose last ground was a low branch.
  for (const air of [top(g) - 1, top(g), top(g) + 3]) {
    assert.equal(canStep({ isPlayer: true, jumping: true, airElev: air, footLevel: low.from.elev }, g.map, W, low.from.x, low.from.y, low.to.x, low.to.y), false, `held at ${air}, last stood at ${low.from.elev}`);
    assert.equal(canStep({ isPlayer: true, jumping: true, airElev: air, footLevel: top(g) - 1 }, g.map, W, last.from.x, last.from.y, last.to.x, last.to.y), true, 'from the last step it is the climb');
  }
  assert.equal(canStep({ isPlayer: false, jumping: true, airElev: 99 }, g.map, W, last.from.x, last.from.y, last.to.x, last.to.y), false, 'creatures never climbed it');
  // The drone, for real: lifted from a low branch past the crown and steered over it, it never sets the Wayfarer down there.
  { const h = tim(); droneOut(h); let t = stand(h, low.from); assert.equal(h.player.footLevel, low.from.elev);
    h.droneLift = { base: low.from.elev, z: top(h) + .4, vz: 0 }; h.jumpUntil = 1e9; t = fly(h, 90, () => ({ x: low.d[0], y: low.d[1], until: () => !h.droneLift }), t); t = fly(h, 3, () => ({}), t);
    assert.ok(!onCrown(h), 'not set down on the crown from a low branch'); }
  { const h = tim(); droneOut(h); let t = stand(h, last.from); h.droneLift = { base: last.from.elev, z: top(h) + .4, vz: 0 }; h.jumpUntil = 1e9;
    t = fly(h, 90, () => ({ x: last.d[0], y: last.d[1], until: () => !h.droneLift }), t); t = fly(h, 3, () => ({}), t); assert.ok(onCrown(h), 'from the last step the drone may set you down on it'); }
  // A blow (the collision mover) from the ground or a low branch never puts the Wayfarer on the crown.
  for (const q of [low, ...besideCrown(g).filter((b) => !b.from.canopy).slice(0, 3)]) { const h = tim(); stand(h, q.from); for (let k = 0; k < 8; k++) h.moveGrounded(h.player, q.d[0] * .5, q.d[1] * .5); assert.ok(!onCrown(h), `knocked from ${q.from.x},${q.from.y}`); }
  // Rift Step: no footing on the crown but from the last step.
  { const h = tim(); stand(h, low.from); assert.equal(h.blinkFooting(low.to.x, low.to.y - .25, top(h) + 2, 1), null, 'from a low branch'); stand(h, last.from); assert.ok(h.blinkFooting(last.to.x, last.to.y - .25, top(h), 1), 'from the last step'); }
});
function droneOut(g) { g.save.consumables.submersible = 1; g.save.perception.aperture = 3255; g.save.farArray = { listeners: 10, gate: 5 }; setMechMode(g.save, 'drone'); g.useConsumable('submersible', 0); assert.ok(g.droneUp()); g.save.mech.fuel = DRONE.carry; }

// The climb: the real Game, a thumb that holds the stick along each move and presses Jump for a jump or a hop (as
// great-tree-keel.test.ts), from the ground to the crown, every step one level.
function climbs(g) {
  const footing = (t) => !!t && !t.blocked && !LETHAL_KINDS.has(t.kind), idx = (x, y) => y * W + x, n = W * W;
  const step = (a, b, jumping, airElev?) => footing(b) && canStep({ isPlayer: true, jumping, airElev, footLevel: airElev ?? a.elev ?? 0 }, g.map, W, a.x, a.y, b.x, b.y);
  const moves = (a) => { const out = []; for (const [dx, dy] of N4) { const b = at(g, a.x + dx, a.y + dy); if (!b) continue;
    if (step(a, b, false)) { if (fallDamage(Math.max(0, (a.elev || 0) - (b.elev || 0)), 100) === 0) out.push({ to: b, kind: 'walk', dx, dy }); } else if (step(a, b, true)) out.push({ to: b, kind: 'jump', dx, dy });
    if (!a.skyPlatform) continue; const L = a.elev || 0, g1 = b, g2 = at(g, a.x + 2 * dx, a.y + 2 * dy);
    if (!g2 || g1.blocked || LETHAL_KINDS.has(g1.kind) || g1.canopy || !canStep({ isPlayer: true, jumping: true, airElev: L, footLevel: L }, g.map, W, a.x, a.y, g1.x, g1.y)) continue;
    if (g2.canopy && footing(g2) && (g2.elev || 0) >= L - 1 && (g2.elev || 0) <= L + 1 && canStep({ isPlayer: true, jumping: true, airElev: L, footLevel: L }, g.map, W, g1.x, g1.y, g2.x, g2.y) && fallDamage(Math.max(0, L - (g2.elev || 0)), 100) === 0) out.push({ to: g2, kind: 'hop', dx, dy }); }
    return out; };
  const back = Array.from({ length: n }, () => []), edges = Array.from({ length: n }, () => []), dist = new Float64Array(n).fill(Infinity), done = new Uint8Array(n);
  for (const t of g.map.tiles) if (footing(t)) for (const mv of moves(t)) { edges[idx(t.x, t.y)].push(mv); back[idx(mv.to.x, mv.to.y)].push({ from: idx(t.x, t.y), cost: mv.kind === 'hop' ? 3 : 1 }); }
  for (const t of crownTiles(g)) dist[idx(t.x, t.y)] = 0;
  for (;;) { let i = -1; for (let k = 0; k < n; k++) if (!done[k] && dist[k] < Infinity && (i < 0 || dist[k] < dist[i])) i = k; if (i < 0) break; done[i] = 1; for (const e of back[i]) if (dist[i] + e.cost < dist[e.from]) dist[e.from] = dist[i] + e.cost; }
  const start = g.map.tiles.filter((q) => footing(q) && !q.canopy && dist[idx(q.x, q.y)] < Infinity).sort((a, b) => dist[idx(a.x, a.y)] - dist[idx(b.x, b.y)])[0]; if (!start) return { ok: false, why: 'no climb' };
  let t = 10000; const dt = 1 / 30, tick = (sx, sy, jump = false) => { let pressed = false; g.enemies = []; g.update(dt, { state: { x: sx, y: sy }, consume: (k) => k === 'jump' && jump && !pressed ? (pressed = true) : false, held: () => false }, t += dt * 1000); };
  g.player.x = start.x; g.player.y = start.y - .25; let levels = [0];
  for (let k = 0; k < 400; k++) {
    if (g.player.hp < g.save.maxHp || g.glide || g.fall && !(t < g.jumpUntil)) return { ok: false, why: 'fell' };
    const u = under(g), d = dist[idx(u.x, u.y)]; if (d === 0) return { ok: true, levels, from: levels.at(-1) }; if (d === Infinity) return { ok: false, why: `stranded ${u.x},${u.y}` };
    const mv = edges[idx(u.x, u.y)].filter((q) => dist[idx(q.to.x, q.to.y)] < Infinity).sort((a, b) => (dist[idx(a.to.x, a.to.y)] + (a.kind === 'hop' ? 3 : 1)) - (dist[idx(b.to.x, b.to.y)] + (b.kind === 'hop' ? 3 : 1)))[0];
    if (mv.kind === 'walk') { for (let i = 0; i < 60 && under(g) === u; i++) tick(mv.dx, mv.dy); } else { tick(mv.dx, mv.dy, true); for (let i = 0; i < 60 && (t < g.jumpUntil || under(g) === u); i++) tick(mv.dx, mv.dy); }
    if (!(t < g.jumpUntil) && !g.fall && under(g) !== u && under(g).kind !== 'canopyTrunk') levels.push(under(g).elev || 0);
  }
  return { ok: false, why: 'too long' };
}

test('the climb works: the real Game climbs each rite tree branch by branch onto the crown from its last step', () => {
  for (const [seed, rx, ry] of RITES) {
    const g = rite(seed, rx, ry), r: any = climbs(g); assert.ok(r.ok, `${seed} ${rx},${ry}: ${r.why}`); assert.ok(onCrown(g)); assert.equal(g.player.hp, g.save.maxHp, 'unhurt');
    assert.equal(r.from, top(g) - 1, 'the last ground before the crown was its last step'); assert.equal(g.player.footLevel, top(g));
  }
});

test('falls: off a branch or the crown the Wayfarer falls through the levels at the fall model\'s speed, hurt by the fall table only on landing', () => {
  const g0 = tim(false), drops = new Map();
  for (const t of g0.map.tiles) { if (!t.canopy || t.kind === 'canopyTrunk' || t.slope) continue; for (const [dx, dy] of N4) { const n = at(g0, t.x + dx, t.y + dy); if (n && !n.canopy && !n.blocked && !LETHAL_KINDS.has(n.kind) && !(n.elev > 0)) { const k = t.elev; if (!drops.has(k)) drops.set(k, { t, d: [dx, dy] }); } } }
  for (const c of crownTiles(g0)) for (const [dx, dy] of N4) { const n = at(g0, c.x + dx, c.y + dy); if (n && !n.canopy && !n.blocked && !LETHAL_KINDS.has(n.kind) && !(n.elev > 0) && !drops.has(c.elev)) drops.set(c.elev, { t: c, d: [dx, dy] }); }
  const heights = [...drops.keys()].sort((a, b) => a - b); assert.ok(heights.some((h) => h <= 3) && heights.some((h) => h >= 4 && h < 38) && heights.includes(38), `heights ${heights}`);
  for (const h of heights) {
    const { t, d } = drops.get(h), g = tim(false); refuge(g); let time = stand(g, t); const n0 = deaths(g), hp0 = g.player.hp; let began = null, ended = null, frames = 0, lethal = fallDamage(h, 100) === Infinity;
    time = fly(g, 600, (i) => { if (!began && g.fall) began = time + i * 1000 / 30; if (began && !ended && ((!g.fall && !g.glide) || deaths(g) > n0)) ended = time + i * 1000 / 30; frames = i; return { ...(began ? {} : { x: d[0], y: d[1] }), until: () => !!ended || (!began && h <= 1 && i > 40) }; }, time);
    if (h < FALL.minDrop + 1 && !began) continue; // a one-level step is walked down
    assert.ok(began && ended, `a fall of ${h} levels began and ended (${frames} frames)`);
    const airtime = (ended - began) / 1000, want = fallAirtime(h, 0); assert.ok(Math.abs(airtime - want) < .2, `${h} levels: ${airtime.toFixed(2)} s in the air, the model says ${want.toFixed(2)} s`);
    if (lethal) assert.equal(deaths(g) - n0, 1, `${h} levels kill, on landing`); else { assert.equal(deaths(g), n0); assert.equal(hp0 - g.player.hp, fallDamage(h, 100), `${h} levels: the table's damage`); }
  }
  assert.ok(fallAirtime(38, 0) > 3 && fallAirtime(38, 0) < 6, 'the crown\'s fall takes a few seconds, never for ever');
});

test('the glide: off the crown with the glider, Jump opens it and it comes down gently; without Jump the freefall comes down (never hangs)', () => {
  const g = tim(true), e = besideCrown(g).find((q) => !q.from.canopy && !(q.from.elev > 0)); assert.ok(e);
  refuge(g); let t = stand(g, e.to); const n0 = deaths(g), hp0 = g.player.hp;
  t = fly(g, 60, () => ({ x: -e.d[0], y: -e.d[1], until: () => !!g.fall || !!g.glide }), t); assert.ok(g.fall || g.glide, 'off the crown into the air');
  t = fly(g, 6, () => ({}), t); t = fly(g, 1, () => ({ jump: true }), t); assert.ok(g.glide?.open, 'Jump opens the glider');
  t = fly(g, 2000, () => ({ until: () => !g.glide }), t); assert.equal(g.glide, null, 'landed'); assert.equal(deaths(g), n0); assert.equal(g.player.hp, hp0, 'a glide lands softly');
  // A closed freefall over ground it cannot stand on (the section's walled rim) comes down beside it instead of hanging there.
  const h = tim(true); refuge(h); h.lastCrownAt = 1000; Object.assign(h.player, { x: 16, y: 30.6 }); h.glide = { z: 20, vx: 0, vy: 0, vz: -9, open: false, fallFrom: 38, told: false, tree: true };
  assert.ok(h.map.tiles[31 * W + 16].blocked, 'the rim under the feet'); const m0 = deaths(h); fly(h, 200, () => ({ until: () => !h.glide && deaths(h) > m0 }), 1000);
  assert.equal(h.glide, null, 'it came down'); assert.equal(deaths(h) - m0, 1, '38 levels kill where it lands');
});

test('no death loop: dying off the crown wakes on the crown held from its rim; every way the stick or a dodge goes, the Wayfarer stays; a jump is the way down', () => {
  const g = tim(true), e = besideCrown(g).find((q) => !q.from.canopy); refuge(g); let t = stand(g, e.to); const n0 = deaths(g);
  t = fly(g, 60, () => ({ x: -e.d[0], y: -e.d[1], until: () => !!g.fall || !!g.glide }), t); t = fly(g, 900, () => ({ until: () => deaths(g) > n0 }), t); t = fly(g, 3, () => ({}), t);
  assert.equal(deaths(g) - n0, 1, 'the fall killed'); assert.ok(onCrown(g), 'woke on the crown (TREE_GLIDE.home, Tim 2026-11-05)'); assert.match(g.message, /crown of the great tree you leapt from/);
  assert.equal(g.save.activeCheckpoint.name, 'Crown Rest'); assert.equal(g.crownHold, true, 'held from the rim');
  let left = null;
  for (const [dx, dy] of [[0, -1], [-1, 0], [-1, -1], [1, -1], [1, 0], [0, 1], [-1, 1], [1, 1]]) for (const dodge of [false, true]) {
    const n1 = deaths(g); t = fly(g, 75, (i) => ({ x: dx, y: dy, dodge: dodge && i % 10 === 0, until: () => !onCrown(g) }), t); t = fly(g, 3, () => ({}), t);
    assert.equal(deaths(g), n1, `no death walking ${dx},${dy}${dodge ? ' dodging' : ''}`);
    if (!onCrown(g)) { assert.equal(under(g).elev, top(g) - 1, 'off the crown only down onto its last step'); assert.equal(g.crownHold, false, 'stepped down: the hold is done'); left = [dx, dy]; break; }
  }
  assert.ok(left, 'the last step is a way down'); assert.ok(g.player.hp > 0);
  // A later death anywhere wakes at the Crown Rest, held too.
  g.player.hp = 0; t = fly(g, 4, () => ({}), t); assert.ok(onCrown(g)); assert.equal(g.crownHold, true);
  const n2 = deaths(g); t = fly(g, 90, () => ({ x: 0, y: -1 }), t); assert.equal(deaths(g), n2);
  // The jump ends the hold: the deliberate way off (the glider opens from it).
  t = fly(g, 1, () => ({ jump: true, x: 0, y: -1 }), t); assert.equal(g.crownHold, false);
});

test('exact resume on the crown: position, the hold and the gate\'s level reload exactly; a pause shifts nothing', () => {
  const g = tim(true), c = crownTiles(g).find((t) => t.x === g.map.canopy.x0 + 1 && t.y === g.map.canopy.y0) || crownTiles(g)[0]; let t = stand(g, c); g.holdCrown(); t = fly(g, 5, () => ({ x: .2 }), t);
  const snap = JSON.parse(JSON.stringify(g.exportSnapshot(t))), pr = snap.session.playerRuntime; assert.equal(pr.crownHold, true); assert.equal(pr.footLevel, 38);
  const b = new Game(migrateSave(snap), 50000); b.enemies = [];
  assert.deepEqual([b.rx, b.ry, b.player.x, b.player.y, b.crownHold, b.player.footLevel, b.playerLevel()], [g.rx, g.ry, g.player.x, g.player.y, true, 38, 38]);
  assert.deepEqual(b.crownFoot, g.crownFoot); assert.equal(JSON.stringify(b.exportSnapshot(50000).session.playerRuntime.crownHold), 'true');
  // Not held: it reloads not held.
  g.crownHold = false; const s2 = JSON.parse(JSON.stringify(g.exportSnapshot(t))), b2 = new Game(migrateSave(s2), 60000); assert.equal(b2.crownHold, false); assert.deepEqual([b2.player.x, b2.player.y], [g.player.x, g.player.y]);
  // Mid-hop from the last step onto the crown, saved and reloaded: the gate's level comes back, so the hop lands on the crown.
  const h = tim(true), last = besideCrown(h).find((q) => q.from.canopy && q.from.elev === top(h) - 1); let v = stand(h, last.from); v = fly(h, 1, () => ({ jump: true, x: last.d[0], y: last.d[1] }), v); v = fly(h, 2, () => ({ x: last.d[0], y: last.d[1] }), v);
  assert.ok(v < h.jumpUntil, 'in the air'); const s3 = JSON.parse(JSON.stringify(h.exportSnapshot(v))), r = new Game(migrateSave(s3), 70000); r.enemies = []; assert.equal(r.player.footLevel, top(h) - 1);
  fly(r, 40, () => ({ x: last.d[0], y: last.d[1], until: () => onCrown(r) }), 70000); assert.ok(onCrown(r), 'the hop resumed lands on the crown');
});

test('save repair: Tim\'s r1050 save, standing on the crown\'s rim with the Crown Rest active, loads on safe crown ground, held; no move kills him', () => {
  const s = freshSave(); s.seed = TIM.seed; s.maxHp = 100; s.glider = true; s.ascendancy = { [`${TIM.rx},${TIM.ry}`]: { tries: 1, done: true, risen: true, bloom: true } };
  s.worldFlags.deaths = 23; s.activeCheckpoint = { rx: -3, ry: 1, x: 25, y: 24, name: 'Crown Rest', crown: true }; s.checkpoints = { '-3,1': s.activeCheckpoint };
  s.position = { area: 'overworld', rx: -3, ry: 1, x: 26.07, y: 23.76 }; Object.assign(s.session, { area: 'overworld', rx: -3, ry: 1, x: 26.07, y: 23.76 }); s.session.playerRuntime = { ...(s.session.playerRuntime || {}), crownFoot: { rx: -3, ry: 1 }, hp: 100 };
  const m = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual([m.session.x, m.session.y], [26.07, 23.76], 'migration keeps his place: the repair is the load\'s'); const g = new Game(m, 0); g.enemies = [];
  assert.deepEqual([g.rx, g.ry], [-3, 1]); assert.ok(onCrown(g), 'on the crown'); assert.equal(g.map.landscape?.riteLevels, true);
  const spot = crownSpot(g.map); assert.deepEqual([g.player.x, g.player.y], [spot.x, spot.y], 'set on the crown\'s safest ground'); assert.equal(g.crownHold, true, 'held from its rim'); assert.equal(g.player.footLevel, 38);
  assert.deepEqual(g.save.activeCheckpoint, s.activeCheckpoint, 'his Crown Rest kept');
  let t = 1000; for (const [dx, dy] of [[0, -1], [1, 0], [-1, 0], [0, 1]]) { const n0 = deaths(g); t = fly(g, 90, () => ({ x: dx, y: dy }), t); assert.equal(deaths(g), n0, `moving ${dx},${dy}`); assert.ok(onCrown(g) || under(g).elev === 37); if (!onCrown(g)) break; }
  // His deaths there: the next one (anywhere) wakes him at the Crown Rest, held, and moving does not kill him.
  const g2 = new Game(migrateSave(JSON.parse(JSON.stringify(s))), 0); g2.enemies = []; g2.player.hp = 0; let u = fly(g2, 4, () => ({}), 1000); assert.ok(onCrown(g2)); assert.equal(g2.crownHold, true);
  const n1 = deaths(g2); u = fly(g2, 90, () => ({ x: 0, y: -1 }), u); u = fly(g2, 90, () => ({ x: -1, y: 0 }), u); assert.equal(deaths(g2), n1, 'the Crown Rest\'s corner holds');
  // The repair runs once: a save written after it reloads exactly.
  const again = new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(t)))), 0); assert.deepEqual([again.player.x, again.player.y, again.crownHold], [g.player.x, g.player.y, g.crownHold]);
});

test('the rising tree carries nobody up: its wood cannot be stepped on until it has risen', () => {
  const s = freshSave(); s.seed = TIM.seed; s.maxHp = 100; s.ascendancy = { [`${TIM.rx},${TIM.ry}`]: { tries: 1, done: true, risen: false, bloom: false } };
  const g = new Game(s, 0); g.rx = TIM.rx; g.ry = TIM.ry; g.loadArea('overworld', false); g.enemies = []; const ash = g.map.objects.find((o) => o.kind === 'riteAshes'); assert.ok(ash);
  g.player.x = ash.x; g.player.y = ash.y; g.lastUpdateNow = 1000; assert.ok(g.interact('touch', ash.id).ok); assert.ok(g.treeRise); assert.ok(!g.overRisingWood(g.player.x, g.player.y), 'set clear of the wood');
  assert.equal(g.map.landscape?.riteLevels, true, 'heights from the first frame');
  const beside = g.map.tiles.filter((t) => t.canopy).flatMap((c) => N4.map(([dx, dy]) => ({ n: at(g, c.x + dx, c.y + dy), d: [-dx, -dy] }))).find((q) => q.n && !q.n.canopy && !q.n.blocked && !LETHAL_KINDS.has(q.n.kind) && !g.map.objects.some((o) => Math.round(o.x) === q.n.x && Math.round(o.y) === q.n.y)); assert.ok(beside);
  Object.assign(g.player, { x: beside.n.x, y: beside.n.y - .25 }); let t = fly(g, 20, () => ({ x: beside.d[0], y: beside.d[1] }), 1000);
  assert.ok(!under(g).canopy, 'never on the rising wood'); t = fly(g, Math.ceil(ASCENDANCY.rise * 30) + 10, () => ({}), t); assert.equal(g.treeRise, null);
  assert.ok(g.map.tiles.filter((q) => q.canopy).every((q) => !q.rising), 'risen: the flag is gone'); assert.ok(!under(g).canopy);
});

test('ordinary great trees: the gate never blocks their climb; the hold and the gate change nothing for a jungle tree\'s rules', () => {
  const s = freshSave(); s.seed = 'SURVEY19'; const g = new Game(s, 0); g.rx = 179; g.ry = 18; g.loadArea('overworld'); g.enemies = []; g.map.enemySpawns = []; assert.ok(g.map.canopy?.top);
  assert.ok(g.map.landscape && !g.map.landscape.riteLevels, 'its own landscape'); const r: any = climbs(g); assert.ok(r.ok, r.why); assert.ok(onCrown(g));
  assert.equal(JUMP.sky > 0 && GLIDE.minDrop, 4);
});

// A WebGL2 stand-in, as tests/close-view-terrain-height.test.ts: enough for a Close View frame to run here.
class StubGL { constructor() { let next = 1; const c = new Map(); return new Proxy(this, { get: (o: any, k: any) => { if (k in o) return o[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!c.has(k)) c.set(k, next++); return c.get(k); } return () => {}; } }); }
  isContextLost() { return false; } getError() { return (this as any).NO_ERROR; } getExtension() { return null; } createShader() { return {}; } getShaderParameter() { return true; }
  createProgram() { return {}; } getProgramParameter(_p: any, k: any) { return k === (this as any).ACTIVE_UNIFORMS || k === (this as any).ACTIVE_ATTRIBUTES ? 0 : true; } createBuffer() { return {}; } createVertexArray() { return {}; } createTexture() { return {}; } }
function ctx2d() { return new Proxy({ canvas: null as any, globalAlpha: 1, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) },
  { get: (o: any, k: any) => k in o ? o[k] : () => {}, set: (o: any, k: any, v: any) => { o[k] = v; return true; } }); }
function withGPU(run: () => void) {
  const prev = (globalThis as any).WebGL2RenderingContext, gl: any = new StubGL(); let made = 0; (globalThis as any).WebGL2RenderingContext = StubGL;
  setCloseViewCanvasFactory(() => { if (++made === 1) return { width: 390, height: 844, getContext: () => ctx2d() }; return { width: 390, height: 844, addEventListener() {}, getContext: (k: string) => k === 'webgl2' ? gl : ctx2d() }; });
  CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL(); resetCloseViewCamera();
  try { run(); } finally { CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); resetCloseViewCamera(); setCloseViewCanvasFactory(null); if (prev === undefined) delete (globalThis as any).WebGL2RenderingContext; else (globalThis as any).WebGL2RenderingContext = prev; }
}
test('both views agree on the crown: Close View stands the Wayfarer on the crown\'s ground, the standard view frames them there; a standard frame draws without error', () => withGPU(() => {
  const g = tim(true), spot = crownSpot(g.map), screen = ctx2d(); screen.canvas = { width: 390, height: 844 }; Object.assign(g.player, spot); g.holdCrown();
  g.save.overworldCloseView = true; g.presentation = { effectiveQuality: 'low', reduceMotion: true }; let T = 90000;
  for (let k = 0; k < 4; k++) { render(screen, g, 390, 844, T); T += 33; } assert.equal(closeViewShowing(g), true);
  const want = 38 * OUTDOOR.terrain.canopyLevel; assert.ok(Math.abs(closeViewLeap().base - want) < 1e-6, `Close View's footing ${closeViewLeap().base} is the crown's ${want}`);
  g.save.overworldCloseView = false; for (let k = 0; k < 3; k++) { render(screen, g, 390, 844, T); T += 33; } // the standard view (lifted ground cache, rims, the crown veil) draws
  assert.ok(liftAt(g.map, W, g.player.x, g.player.y) > 0, 'and lifts the Wayfarer to it');
}));
