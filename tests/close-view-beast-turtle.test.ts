// The Mountain Turtle's skinned Close View body (src/close-view-beast-turtle.ts on the shared beast rig).
import test from 'node:test';
import assert from 'node:assert/strict';
import { BEAST_SLOT } from '../src/close-view-beast-rig.ts';
import { TURTLE_RIG, TURTLE_SKELETON, turtleMesh, createTurtleTrack, sampleTurtle, turtleBone } from '../src/close-view-beast-turtle.ts';
import { CLOSE_VIEW_BEASTS, closeViewBeastEligible } from '../src/close-view-beasts.ts';
import { MONSTER_PACK, updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';

function world(player = { x: 30, y: 20 }) {
  const open = (x, y) => x >= 0 && y >= 0 && x < 64 && y < 44;
  const w = {
    player: { ...player, hp: 1e9 }, dt: 1 / 60, now: 0, enemies: [], fx: [], playerVelocity: { x: 0, y: 0 },
    open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true,
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt() { return true; }, slow() {}, push() { return true; }, pull() {}, poison() {}, stun() {},
    addEffect(effect) { addPackEffect(w.fx, effect, w.now); }, effects: () => w.fx,
  };
  return w;
}
const scaleOf = (e) => (e.scale || 1) * TURTLE_RIG.closeViewScale;
const env = (e, now, extra = {}) => ({ x: e.x + .5, y: e.y + .82, z: 0, scale: scaleOf(e), now, reduce: false, tier: 'full', target: { x: 30, y: 20 }, dead: false, ...extra });
function fight(only, seconds, each, player) {
  const w = world(player), e = createCombatant('mountainTurtle', 24, 20, true, []), tr = createTurtleTrack(); let now = 1000;
  Object.assign(e, { id: 'turtle-cv', aggro: true, hp: 1e6, maxHp: 1e6, damage: 40 }); e.packAttacks = [only]; e.packBossAttacks = []; w.enemies.push(e);
  for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; now += w.dt * 1000; updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); each(sampleTurtle(tr, e, env(e, now, { target: w.player })), e, tr, now); }
}
const finite = (a) => { for (const v of a) if (!Number.isFinite(v)) return false; return true; };
const FEET = ['footHL', 'footFL', 'footHR', 'footFR'];

test('the mesh: bounded per tier, valid, cached; registered', () => {
  assert.ok(TURTLE_SKELETON.count <= BEAST_SLOT.maxBones);
  let prev = Infinity;
  for (const tier of ['full', 'balanced', 'low']) {
    const m = turtleMesh(tier);
    assert.ok(m.coreTriangles <= BEAST_SLOT.triangles[tier], `${tier}: ${m.coreTriangles}`); assert.ok(m.coreTriangles < prev); prev = m.coreTriangles;
    assert.ok(m.triangles > m.coreTriangles, 'the shield and the tornado are an optional section');
    for (const i of m.indices) assert.ok(i < m.vertexCount);
    for (let v = 0; v < m.vertexCount; v++) { assert.ok(m.skin[v * 4] < TURTLE_SKELETON.count && m.skin[v * 4 + 2] < TURTLE_SKELETON.count); assert.ok(Math.abs(Math.hypot(m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]) - 1) < 1e-3); }
    assert.strictEqual(turtleMesh(tier), m);
  }
  assert.equal(CLOSE_VIEW_BEASTS.mountainTurtle.scale, 1.25);
  assert.ok(closeViewBeastEligible(createCombatant('mountainTurtle', 1, 1, true, [])));
});

test('walking on planted feet, heavy and slow', () => {
  const e = createCombatant('mountainTurtle', 4, 10, true, []), tr = createTurtleTrack(); let now = 1000, checked = 0; const last = [null, null, null, null];
  for (let i = 0; i < 240; i++) {
    e.x += 1.2 / 60; now += 1000 / 60; sampleTurtle(tr, e, env(e, now));
    if (i < 40) continue;
    for (let k = 0; k < 4; k++) { const p = turtleBone(tr, FEET[k]), planted = tr.frame.feet[k * 2] === 1;
      if (planted && last[k]) { assert.ok(Math.hypot(p[0] - last[k][0], p[1] - last[k][1]) < 2e-3, `${FEET[k]} holds`); checked++; }
      last[k] = planted ? p : null; }
  }
  assert.ok(checked > 200, `${checked}`);
});

test('deterministic', () => {
  const run = () => { const out = []; fight('turtleStomp', 3, (f) => out.push(Array.from(f.skin.subarray(0, TURTLE_SKELETON.count * 12)))); return out; };
  assert.deepEqual(run(), run());
});

test('every attack plays on its own clocks without a broken frame', () => {
  for (const id of [...MONSTER_PACK.mountainTurtle.attacks, ...MONSTER_PACK.mountainTurtle.bossAttacks]) {
    const phases = new Set(); let frames = 0;
    fight(id, 8, (f, e) => {
      assert.ok(f && finite(f.skin), `${id}: finite`); assert.ok(f.emitK.every((k) => k >= 0 && k <= 3)); assert.ok(f.emitA.every((a) => a >= 0 && a <= 1));
      if (e.pack.attack === id) { phases.add(e.pack.phase); frames++; }
    }, { x: id === 'turtleDash' || id === 'turtleComet' ? 31 : 27, y: 20 });
    assert.ok(phases.has('windup') && phases.has('recover'), `${id}: ${[...phases]}`); assert.ok(frames > 5, id);
  }
});

test('stomp: it rears on its hind legs over the wind-up and the forefeet come down as the stomp lands', () => {
  let rest = null, high = 0, landed = null;
  fight('turtleStomp', 4, (f, e, tr) => {
    const s = e.pack, n = turtleBone(tr, 'neck0')[2];
    if (!s.attack) rest ??= n;
    if (s.attack === 'turtleStomp' && s.phase === 'windup') high = Math.max(high, n);
    if (s.attack === 'turtleStomp' && s.phase === 'recover' && landed == null) landed = { n, fore: turtleBone(tr, 'footFR')[2], contact: f.contact };
  });
  assert.ok(rest != null && high > rest + .15 * scaleOf(createCombatant('mountainTurtle', 0, 0, true, [])), `the front rises (${rest?.toFixed(2)} -> ${high.toFixed(2)})`);
  assert.ok(landed && landed.contact === 1 && landed.n < high, 'down on the stamp');
  assert.ok(landed.fore < .1 * scaleOf(createCombatant('mountainTurtle', 0, 0, true, [])), 'the forefoot is on the ground');
});

test('the spins: drawn into the shell and turning inside the tornado; the shield grows and stands', () => {
  let turned = 0, wind = 0, footUp = 0, lastYaw = null;
  fight('turtleSpin', 5, (f, e, tr) => {
    if (!e.spinning) return;
    const r = tr.pose.wr, yaw = Math.atan2(r[1], r[0]); if (lastYaw != null) turned += Math.abs(Math.atan2(Math.sin(yaw - lastYaw), Math.cos(yaw - lastYaw))); lastYaw = yaw;
    wind = Math.max(wind, f.emitA[3]); assert.ok(f.cloud, 'the tornado is drawn');
    const body = turtleBone(tr, 'body')[2], foot = turtleBone(tr, 'footFL')[2]; footUp = Math.max(footUp, foot / Math.max(1e-6, body));
  });
  assert.ok(turned > Math.PI * 4, `it spins (${turned.toFixed(1)} rad)`); assert.ok(wind > .5, 'the tornado shows');
  let dome = 0, during = 0;
  fight('turtleShield', 6, (f, e) => { if (e.iceShield) { during++; dome = Math.max(dome, f.emitA[2]); assert.ok(f.cloud); } });
  assert.ok(during > 30 && dome > .5, `the shield stands (${dome.toFixed(2)})`);
});

test('tucks into its shell to dodge; death; reduced motion', () => {
  const e = createCombatant('mountainTurtle', 10, 10, true, []), tr = createTurtleTrack(); let now = 1000;
  for (let i = 0; i < 20; i++) sampleTurtle(tr, e, env(e, now += 16));
  const neckOut = turtleBone(tr, 'head'), bodyOut = turtleBone(tr, 'body');
  e.tucked = true; for (let i = 0; i < 40; i++) sampleTurtle(tr, e, env(e, now += 16));
  const neckIn = turtleBone(tr, 'head'), bodyIn = turtleBone(tr, 'body');
  assert.ok(Math.hypot(neckIn[0] - bodyIn[0], neckIn[1] - bodyIn[1]) < Math.hypot(neckOut[0] - bodyOut[0], neckOut[1] - bodyOut[1]) * .8, 'the head draws in');
  assert.ok(bodyIn[2] < bodyOut[2], 'the shell sinks onto the ground');
  e.tucked = false;
  let g = tr.frame, lowest = Infinity; while (g) { g = sampleTurtle(tr, e, env(e, now += 16, { dead: true })); if (g) lowest = Math.min(lowest, turtleBone(tr, 'head')[2]); }
  assert.ok(lowest < .25 * scaleOf(e), 'the head sinks to the ground');
  const r = createTurtleTrack(), e2 = createCombatant('mountainTurtle', 10, 10, true, []); sampleTurtle(r, e2, env(e2, 1000, { reduce: true }));
  const a = Array.from(sampleTurtle(r, e2, env(e2, 1016, { reduce: true })).skin); assert.deepEqual(Array.from(sampleTurtle(r, e2, env(e2, 4000, { reduce: true })).skin), a);
});
