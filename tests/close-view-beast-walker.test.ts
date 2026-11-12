// The Void Walker's skinned Close View body (src/close-view-beast-walker.ts on the shared beast rig).
import test from 'node:test';
import assert from 'node:assert/strict';
import { BEAST_SLOT } from '../src/close-view-beast-rig.ts';
import { WALKER_RIG, WALKER_SKELETON, walkerMesh, createWalkerTrack, sampleWalker, walkerBone } from '../src/close-view-beast-walker.ts';
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
const scaleOf = (e) => (e.scale || 1) * WALKER_RIG.closeViewScale;
const env = (e, now, extra = {}) => ({ x: e.x + .5, y: e.y + .82, z: 0, scale: scaleOf(e), now, reduce: false, tier: 'full', target: { x: 30, y: 20 }, dead: false, ...extra });
function fight(only, seconds, each, player) {
  const w = world(player), e = createCombatant('voidWalker', 24, 20, true, []), tr = createWalkerTrack(); let now = 1000;
  Object.assign(e, { id: 'walker-cv', aggro: true, hp: 1e6, maxHp: 1e6, damage: 40 }); e.packAttacks = [only]; e.packBossAttacks = []; w.enemies.push(e);
  for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; now += w.dt * 1000; updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); each(sampleWalker(tr, e, env(e, now, { target: w.player })), e, tr, now); }
}
const finite = (a) => { for (const v of a) if (!Number.isFinite(v)) return false; return true; };
const S0 = () => scaleOf(createCombatant('voidWalker', 0, 0, true, []));

test('the mesh: bounded per tier, valid, cached; registered', () => {
  assert.ok(WALKER_SKELETON.count <= BEAST_SLOT.maxBones);
  let prev = Infinity;
  for (const tier of ['full', 'balanced', 'low']) {
    const m = walkerMesh(tier);
    assert.ok(m.coreTriangles <= BEAST_SLOT.triangles[tier], `${tier}: ${m.coreTriangles}`); assert.ok(m.coreTriangles < prev); prev = m.coreTriangles;
    for (const i of m.indices) assert.ok(i < m.vertexCount);
    for (let v = 0; v < m.vertexCount; v++) { assert.ok(m.skin[v * 4] < WALKER_SKELETON.count && m.skin[v * 4 + 2] < WALKER_SKELETON.count); assert.ok(Math.abs(Math.hypot(m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]) - 1) < 1e-3); }
    assert.strictEqual(walkerMesh(tier), m);
  }
  assert.equal(CLOSE_VIEW_BEASTS.voidWalker.scale, 1.25);
  assert.ok(closeViewBeastEligible(createCombatant('voidWalker', 1, 1, true, [])));
});

test('walking on planted feet', () => {
  const e = createCombatant('voidWalker', 4, 10, true, []), tr = createWalkerTrack(); let now = 1000, checked = 0; const last = [null, null];
  for (let i = 0; i < 200; i++) {
    e.x += 2 / 60; now += 1000 / 60; sampleWalker(tr, e, env(e, now));
    if (i < 40) continue;
    for (let k = 0; k < 2; k++) { const p = walkerBone(tr, k ? 'footR' : 'footL'), planted = tr.frame.feet[k * 2] === 1;
      if (planted && last[k]) { assert.ok(Math.hypot(p[0] - last[k][0], p[1] - last[k][1]) < 2e-3, 'the foot holds'); checked++; }
      last[k] = planted ? p : null; }
  }
  assert.ok(checked > 80, `${checked}`);
});

test('deterministic', () => {
  const run = () => { const out = []; fight('voidHand', 3, (f) => out.push(Array.from(f.skin.subarray(0, WALKER_SKELETON.count * 12)))); return out; };
  assert.deepEqual(run(), run());
});

test('every attack plays on its own clocks without a broken frame', () => {
  for (const id of [...MONSTER_PACK.voidWalker.attacks, ...MONSTER_PACK.voidWalker.bossAttacks]) {
    const phases = new Set(); let frames = 0;
    fight(id, 8, (f, e) => {
      assert.ok(f && finite(f.skin), `${id}: finite`); assert.ok(f.emitK.every((k) => k >= 0 && k <= 3)); assert.ok(f.emitA.every((a) => a >= 0 && a <= 1));
      if (e.pack.attack === id) { phases.add(e.pack.phase); frames++; }
    }, { x: 28, y: 20 });
    assert.ok(phases.size > 0, `${id}: ${[...phases]}`); assert.ok(frames > 5, id);
  }
});

test('the rends: hands gathered before the chest, then brought down as it casts; the teleport shows the rend', () => {
  let high = 0, cast = false;
  fight('voidHand', 4, (f, e, tr) => { if (e.pack.attack !== 'voidHand') return; const h = walkerBone(tr, 'handR')[2]; if (e.pack.phase === 'windup') high = Math.max(high, h); if (f.contact) cast = true; });
  assert.ok(high > .55 * S0() && cast, `gathered (${(high / S0()).toFixed(2)}) and cast`);
  const e = createCombatant('voidWalker', 10, 10, true, []), tr = createWalkerTrack(); let now = 1000;
  e.voidTeleport = .2; const f = sampleWalker(tr, e, env(e, now += 16)); assert.ok(f.cloud && f.emitA[2] > .5 && tr.pose.scl[WALKER_SKELETON.index.rend] > .5, 'the rend shows');
  e.voidTeleport = 0; assert.ok(!sampleWalker(tr, e, env(e, now += 16)).cloud);
});

test('death; reduced motion', () => {
  const e = createCombatant('voidWalker', 10, 10, true, []), tr = createWalkerTrack(); let now = 1000;
  for (let i = 0; i < 20; i++) sampleWalker(tr, e, env(e, now += 16));
  let g = tr.frame, n = 0; while (g && n < 1000) { g = sampleWalker(tr, e, env(e, now += 16, { dead: true })); n++; }
  assert.ok(n < 1000 && g == null, 'it comes apart and is gone');
  const r = createWalkerTrack(), e2 = createCombatant('voidWalker', 10, 10, true, []); sampleWalker(r, e2, env(e2, 1000, { reduce: true }));
  const a = Array.from(sampleWalker(r, e2, env(e2, 1016, { reduce: true })).skin); assert.deepEqual(Array.from(sampleWalker(r, e2, env(e2, 4000, { reduce: true })).skin), a);
});
