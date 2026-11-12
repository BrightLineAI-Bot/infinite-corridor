// The Nanobot Knight's skinned Close View body (src/close-view-beast-knight.ts on the shared beast rig).
import test from 'node:test';
import assert from 'node:assert/strict';
import { BEAST_SLOT } from '../src/close-view-beast-rig.ts';
import { KNIGHT_RIG, KNIGHT_SKELETON, knightMesh, createKnightTrack, sampleKnight, knightBone } from '../src/close-view-beast-knight.ts';
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
const scaleOf = (e) => (e.scale || 1) * KNIGHT_RIG.closeViewScale;
const env = (e, now, extra = {}) => ({ x: e.x + .5, y: e.y + .82, z: 0, scale: scaleOf(e), now, reduce: false, tier: 'full', target: { x: 30, y: 20 }, dead: false, ...extra });
function fight(only, seconds, each, player) {
  const w = world(player), e = createCombatant('nanobotKnight', 24, 20, true, []), tr = createKnightTrack(); let now = 1000;
  Object.assign(e, { id: 'knight-cv', aggro: true, hp: 1e6, maxHp: 1e6, damage: 40 }); e.packAttacks = [only]; e.packBossAttacks = []; w.enemies.push(e);
  for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; now += w.dt * 1000; updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); each(sampleKnight(tr, e, env(e, now, { target: w.player })), e, tr, now); }
}
const finite = (a) => { for (const v of a) if (!Number.isFinite(v)) return false; return true; };
const S0 = () => scaleOf(createCombatant('nanobotKnight', 0, 0, true, []));

test('the mesh: bounded per tier, valid, cached; registered', () => {
  assert.ok(KNIGHT_SKELETON.count <= BEAST_SLOT.maxBones);
  let prev = Infinity;
  for (const tier of ['full', 'balanced', 'low']) {
    const m = knightMesh(tier);
    assert.ok(m.coreTriangles <= BEAST_SLOT.triangles[tier], `${tier}: ${m.coreTriangles}`); assert.ok(m.coreTriangles < prev); prev = m.coreTriangles;
    for (const i of m.indices) assert.ok(i < m.vertexCount);
    for (let v = 0; v < m.vertexCount; v++) { assert.ok(m.skin[v * 4] < KNIGHT_SKELETON.count && m.skin[v * 4 + 2] < KNIGHT_SKELETON.count); assert.ok(Math.abs(Math.hypot(m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]) - 1) < 1e-3); }
    assert.strictEqual(knightMesh(tier), m);
  }
  assert.equal(CLOSE_VIEW_BEASTS.nanobotKnight.scale, 1.25);
  assert.ok(closeViewBeastEligible(createCombatant('nanobotKnight', 1, 1, true, [])));
});

test('walking on planted feet', () => {
  const e = createCombatant('nanobotKnight', 4, 10, true, []), tr = createKnightTrack(); let now = 1000, checked = 0; const last = [null, null];
  for (let i = 0; i < 200; i++) {
    e.x += 2 / 60; now += 1000 / 60; sampleKnight(tr, e, env(e, now));
    if (i < 40) continue;
    for (let k = 0; k < 2; k++) { const p = knightBone(tr, k ? 'footR' : 'footL'), planted = tr.frame.feet[k * 2] === 1;
      if (planted && last[k]) { assert.ok(Math.hypot(p[0] - last[k][0], p[1] - last[k][1]) < 2e-3, 'the foot holds'); checked++; }
      last[k] = planted ? p : null; }
  }
  assert.ok(checked > 80, `${checked}`);
});

test('deterministic', () => {
  const run = () => { const out = []; fight('knightCombo', 3, (f) => out.push(Array.from(f.skin.subarray(0, KNIGHT_SKELETON.count * 12)))); return out; };
  assert.deepEqual(run(), run());
});

test('every attack plays on its own clocks without a broken frame', () => {
  for (const id of [...MONSTER_PACK.nanobotKnight.attacks, ...MONSTER_PACK.nanobotKnight.bossAttacks]) {
    const phases = new Set(); let frames = 0;
    fight(id, 8, (f, e) => {
      assert.ok(f && finite(f.skin), `${id}: finite`); assert.ok(f.emitK.every((k) => k >= 0 && k <= 3)); assert.ok(f.emitA.every((a) => a >= 0 && a <= 1));
      if (e.pack.attack === id) { phases.add(e.pack.phase); frames++; }
    }, { x: id === 'knightBackslash' ? 26 : 28, y: 20 });
    assert.ok(phases.has('recover'), `${id}: ${[...phases]}`); assert.ok(frames > 5, id);
  }
});

test('the thrust: the blade outstretched along its line; the cannon: the arm opens along the beam', () => {
  let along = 0;
  fight('knightThrust', 4, (f, e, tr) => { if (e.pack.attack !== 'knightThrust' || e.pack.phase !== 'active' || !e.pack.data.dir) return;
    const d = e.pack.data.dir, r = tr.pose.wr, i = KNIGHT_SKELETON.index.sword * 9, l = Math.hypot(r[i], r[i + 1], r[i + 2]) || 1; along = Math.max(along, (r[i] * d.x + r[i + 1] * d.y) / l); });
  assert.ok(along > .9, `the blade points along the thrust (${along.toFixed(2)})`);
  let open = 0, glow = 0;
  fight('knightCannon', 4, (f, e, tr) => { if (e.pack.attack !== 'knightCannon') return; open = Math.max(open, tr.pose.scl[KNIGHT_SKELETON.index.cannon]); if (e.pack.phase === 'active') glow = Math.max(glow, f.emitK[1]); });
  assert.ok(open > .9 && glow > 1.5, `the cannon opens (${open.toFixed(2)}) and fires (${glow.toFixed(2)})`);
});

test('mist leaves only the swarm; death; reduced motion', () => {
  const e = createCombatant('nanobotKnight', 10, 10, true, []), tr = createKnightTrack(); let now = 1000;
  for (let i = 0; i < 20; i++) sampleKnight(tr, e, env(e, now += 16));
  e.mist = true; let f; for (let i = 0; i < 30; i++) f = sampleKnight(tr, e, env(e, now += 16));
  assert.ok(tr.pose.scl[KNIGHT_SKELETON.index.pelvis] < .05, 'the armour is gone'); assert.ok(f.emitA[0] < .1);
  const m0 = knightBone(tr, 'mote0'); assert.ok(Math.hypot(m0[0] - (e.x + .5), m0[1] - (e.y + .82)) < 1.5 * S0(), 'the swarm stays where it stood');
  e.mist = false;
  let g = tr.frame, n = 0; while (g && n < 1000) { g = sampleKnight(tr, e, env(e, now += 16, { dead: true })); n++; }
  assert.ok(n < 1000 && g == null, 'it comes apart and is gone');
  const r = createKnightTrack(), e2 = createCombatant('nanobotKnight', 10, 10, true, []); sampleKnight(r, e2, env(e2, 1000, { reduce: true }));
  const a = Array.from(sampleKnight(r, e2, env(e2, 1016, { reduce: true })).skin); assert.deepEqual(Array.from(sampleKnight(r, e2, env(e2, 4000, { reduce: true })).skin), a);
});
