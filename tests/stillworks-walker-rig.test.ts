import assert from 'node:assert/strict';
import test from 'node:test';
import { stillworksWalkerRigPose } from '../src/close-view.ts';
import { MODEL_FLOATS, modelTriangleCount, writeCloseViewModel } from '../src/close-view-models.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';

const fixture = (seed = 'CINDER-VERGE-47') =>
  createLabFixture({ lab: 'close-view', scenario: 'stillworks-void-walker', seed, now: 1000 });

const rends = [
  ['voidHand', 'hand', 2.7, .65],
  ['voidClaw', 'claw', 2.7, .65],
  ['voidSword', 'sword', 3.5, .3],
];
for (const seed of ['CINDER-VERGE-47', 'TIM1']) for (const [attack, variant, length, width] of rends)
test(`Stillworks rig follows the accepted ${attack} cast in ${seed}`, () => {
  const { game: g, stillworksProbes } = fixture(seed);
  const e = g.enemies.find(q => q.pentFinaleBeast === 'voidWalker');
  assert.deepEqual(stillworksWalkerRigPose(g.map, e), { gesture: 0, aim: null });
  const at = stillworksProbes.find(q => q.id === 'stillworks-exposed');
  Object.assign(g.player, { x: at.x, y: at.y, hp: 1000 });
  g.save.maxHp = 1000;
  e.packAttacks = [attack];
  e.packBossAttacks = [];
  const input = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
  const windup = [], recovery = [];
  let anchors, warnings, pose;
  for (let i = 1; i <= 140; i++) {
    g.update(.02, input, 1000 + i * 20);
    if (e.pack.attack !== attack) {
      if (recovery.length) break;
      continue;
    }
    pose = stillworksWalkerRigPose(g.map, e);
    assert.ok(pose);
    assert.equal(pose.attack, attack);
    assert.equal(pose.sequence, e.pack.seq);
    assert.deepEqual(pose.aim, e.pack.data.aim);
    const effects = g.packEffects.filter(q => q.owner === e.id && q.kind === 'voidRend' && q.variant === variant);
    assert.equal(effects.length, 2);
    const positions = effects.map(q => [q.x, q.y, q.angle]);
    anchors ??= positions;
    if (!warnings) {
      warnings = effects.map(q => q.arming);
      for (const q of effects) {
        assert.equal(q.length, length);
        assert.equal(q.width, width);
        if (variant !== 'hand') {
          assert.ok(Math.abs(Math.hypot(q.x - at.x, q.y - at.y) - 2.4) < 1e-8);
          assert.ok(Math.abs(Math.atan2(at.y - q.y, at.x - q.x) - q.angle) < 1e-8);
        }
      }
    }
    assert.deepEqual(positions, anchors);
    (pose.phase === 'windup' ? windup : recovery).push(pose.gesture);
  }
  assert.ok(windup.length > 2 && recovery.length > 2);
  assert.equal(windup[0], 0);
  assert.ok(windup.at(-1) > .9);
  assert.equal(recovery[0], 1);
  assert.ok(recovery.at(-1) < .1);
  assert.ok(warnings[0] > .4 && warnings[1] - warnings[0] > .15);
  assert.deepEqual(stillworksWalkerRigPose(g.map, e), { gesture: 0, aim: null });
});

test('unsupported Walker forms and actions keep the sprite path', () => {
  const { game: g } = fixture();
  const e = g.enemies.find(q => q.pentFinaleBeast === 'voidWalker');
  for (const extra of [{ worldBeast: 'voidWalker' }, { hidden: true }, { untargetable: true },
    { voidTeleport: .1 }, { voidDashing: true }, { voidCharging: true }, { hp: 0 },
    { pack: { attack: 'voidSupernova', phase: 'windup', t: .3 } },
    { pack: { attack: 'voidHand', phase: 'windup', seq: 1, t: .1 } }]) {
    assert.equal(stillworksWalkerRigPose(g.map, { ...e, ...extra }), null);
  }
  assert.equal(stillworksWalkerRigPose({}, e), null);
});

test('the articulated cast stays within the actor budget and reads with reduced motion', () => {
  const triangles = modelTriangleCount('voidWalker');
  assert.ok(triangles > 0 && triangles <= 256);
  const mesh = (walkerGesture, pace = 0, walkerAttack = 'voidHand', yaw = 0) => {
    const out = new Float32Array(triangles * 3 * MODEL_FLOATS);
    assert.equal(writeCloseViewModel(out, 0, { kind: 'voidWalker', x: 0, y: 0, z: 0,
      yaw, phase: 1, pace, pose: 'idle', amount: 0, walkerGesture, walkerAttack, reduceMotion: true }), out.length);
    assert.ok(out.every(Number.isFinite));
    return out;
  };
  assert.notDeepEqual(mesh(0), mesh(1));
  assert.deepEqual(mesh(1), mesh(1));
  assert.deepEqual(mesh(0, 1), mesh(0));
  for (const yaw of [0, Math.PI / 2, Math.PI]) {
    const poses = rends.map(([attack]) => mesh(1, 0, attack, yaw));
    for (let i = 0; i < poses.length; i++) for (let j = i + 1; j < poses.length; j++)
      assert.notDeepEqual(poses[i], poses[j]);
  }
});
