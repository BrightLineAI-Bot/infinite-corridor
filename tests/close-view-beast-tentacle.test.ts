// The Tremor Worm's field tentacles in Close View (src/close-view-beast-tentacle.ts on the shared beast rig), and the minion
// allowance that keeps them from crowding the worm out of its slot.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BEAST_SLOT } from '../src/close-view-beast-rig.ts';
import { TENTACLE_RIG, TENTACLE_SKELETON, TENTACLE_MODES, tentacleMesh, createTentacleTrack, sampleTentacle, tentacleBone } from '../src/close-view-beast-tentacle.ts';
import { CLOSE_VIEW_BEASTS, closeViewBeastEligible, closeViewBeastAllowance } from '../src/close-view-beasts.ts';
import { updatePackMonster, tickPackEffects, addPackEffect, WORM } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';

function world(player = { x: 30, y: 20 }) {
  const open = (x, y) => x >= 0 && y >= 0 && x < 64 && y < 44;
  const w = {
    player: { ...player, hp: 1e9, maxHp: 1e9 }, width: 64, height: 44, dt: 1 / 60, now: 0, enemies: [], fx: [], playerVelocity: { x: 0, y: 0 },
    open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true,
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt() { return true; }, slow() {}, push() { return true; }, pull() { return true; }, poison() {}, stun() {}, held: () => false,
    addEffect(effect) { addPackEffect(w.fx, effect, w.now); }, effects: () => w.fx,
  };
  return w;
}
const scaleOf = (e) => (e.scale || 1) * TENTACLE_RIG.closeViewScale;
const env = (e, now, extra = {}) => ({ x: e.x + .5, y: e.y + .82, z: 0, scale: scaleOf(e), now, reduce: false, tier: 'full', target: { x: 30, y: 20 }, dead: false, ...extra });
// A worm (standing still, never attacking) and one of its tentacles in `mode`, `dist` tiles from the Wayfarer.
function field(mode, seconds, each, dist = 3) {
  const w = world(), owner = createCombatant('tremorWorm', 20, 20, true, []), e = createCombatant('wormTentacle', 30 - dist, 20, false, []), tr = createTentacleTrack(); let now = 1000;
  Object.assign(owner, { id: 'worm', aggro: true, hp: 5e5, maxHp: 1e6, damage: 40 });
  Object.assign(e, { id: 'worm:brood:0', wormOf: 'worm', bornAt: 0, tentacleMode: mode, aggro: true, hp: 1e5, maxHp: 1e5 }); w.enemies.push(owner, e);
  for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; now += w.dt * 1000; updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w);
    const f = e.hidden ? null : sampleTentacle(tr, e, env(e, now, { target: w.player })); each(f, e, tr, now, w); }
}
const finite = (a) => { for (const v of a) if (!Number.isFinite(v)) return false; return true; };

test('the mesh: one per tier and mode, inside the minion allowance, valid, cached; registered as a minion', () => {
  assert.ok(TENTACLE_SKELETON.count <= BEAST_SLOT.minion.maxBones);
  for (const mode of TENTACLE_MODES) {
    let prev = Infinity;
    for (const tier of ['full', 'balanced', 'low']) {
      const m = tentacleMesh(tier, { tentacleMode: mode });
      assert.ok(m.coreTriangles <= BEAST_SLOT.minion.triangles[tier], `${mode} ${tier}: ${m.coreTriangles}`); assert.ok(m.coreTriangles < prev); prev = m.coreTriangles;
      for (const i of m.indices) assert.ok(i < m.vertexCount);
      for (let v = 0; v < m.vertexCount; v++) assert.ok(Math.abs(Math.hypot(m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]) - 1) < 1e-3, `${mode} ${tier} normal ${v}`);
      assert.strictEqual(tentacleMesh(tier, { tentacleMode: mode }), m);
    }
  }
  assert.notStrictEqual(tentacleMesh('full', { tentacleMode: 'laser' }), tentacleMesh('full', { tentacleMode: 'fire' }), 'the tip follows the mode');
  // the whole minion allowance costs less than one beast at every tier
  for (const tier of ['full', 'balanced', 'low']) assert.ok(BEAST_SLOT.minion.maxMinions * BEAST_SLOT.minion.triangles[tier] <= BEAST_SLOT.triangles[tier], tier);
  assert.ok(BEAST_SLOT.minion.maxMinions >= WORM.tentaclesMax, 'every tentacle the worm can raise fits');
  const e = createCombatant('wormTentacle', 1, 1, false, []); assert.equal(CLOSE_VIEW_BEASTS.wormTentacle.scale, 1.25); assert.ok(closeViewBeastEligible(e));
  assert.equal(closeViewBeastAllowance('wormTentacle'), 'minion'); assert.equal(closeViewBeastAllowance('tremorWorm'), 'beast');
  e.hidden = true; assert.ok(!closeViewBeastEligible(e), 'under the ground: the billboard (which draws nothing)');
});

test('every mode fights without a broken frame, and it is deterministic', () => {
  for (const mode of TENTACLE_MODES) {
    let frames = 0;
    field(mode, 9, (f) => { if (!f) return; frames++; assert.ok(finite(f.skin.subarray(0, TENTACLE_SKELETON.count * 12)), `${mode}: finite`); assert.ok(f.emitK.every((k) => k >= 0 && k <= 3), mode); });
    assert.ok(frames > 60, mode);
  }
  const run = () => { const out = []; field('fire', 3, (f) => f && out.push(Array.from(f.skin.subarray(0, TENTACLE_SKELETON.count * 12)))); return out; };
  assert.deepEqual(run(), run());
});

test('it rises out of its crack, sinks back into it, and spits with a snap', () => {
  let low = Infinity, high = 0, sinkLow = Infinity, phases = new Set(), snapped = false;
  field('fire', 9, (f, e, tr) => {
    if (!f) return; phases.add(f.phase); const tip = tentacleBone(tr, 'tip')[2] / f.scale * .6;
    if (f.phase === 'rising') low = Math.min(low, tip); else if (f.phase === 'sinking') sinkLow = Math.min(sinkLow, tip); else high = Math.max(high, tip);
    if (f.contact) snapped = true;
  });
  assert.ok(phases.has('rising') && phases.has('sinking'), [...phases].join());
  assert.ok(low < high - .3 && sinkLow < high - .3, `rising ${low.toFixed(2)}, sinking ${sinkLow.toFixed(2)}, up ${high.toFixed(2)}`);
  assert.ok(snapped, 'it snaps as it spits');
});

test('the laser: the lens brightens through the charge, then holds along the game\'s beam as it turns', () => {
  let charge = 0, hold = 0, checked = 0;
  field('laser', 5, (f, e, tr) => {
    if (!f || !e.pack.laser) return;
    if (f.phase === 'laser:charge') charge = Math.max(charge, f.emitK[0]);
    if (f.phase === 'laser:hold') { hold = Math.max(hold, f.emitK[0]); const i = TENTACLE_SKELETON.index.tip * 9, W = tr.pose.wr, l = Math.hypot(W[i + 6], W[i + 7]) || 1, A = e.pack.laser.angle;
      assert.ok((W[i + 6] * Math.cos(A) + W[i + 7] * Math.sin(A)) / l > .97, 'the tip looks along the beam'); checked++; }
  });
  assert.ok(checked > 30 && hold > charge * .9 && hold > 1.2, `charge ${charge.toFixed(2)}, hold ${hold.toFixed(2)}`);
});

test('death; reduced motion', () => {
  const e = createCombatant('wormTentacle', 10, 10, false, []), tr = createTentacleTrack(); let now = 1000;
  let g = sampleTentacle(tr, e, env(e, now)), n = 0; while (g && n < 1000) { g = sampleTentacle(tr, e, env(e, now += 16, { dead: true })); n++; }
  assert.ok(n < 1000 && g == null, 'it flops over, sinks and is gone');
  const r = createTentacleTrack(), e2 = createCombatant('wormTentacle', 10, 10, false, []); sampleTentacle(r, e2, env(e2, 1000, { reduce: true }));
  const a = Array.from(sampleTentacle(r, e2, env(e2, 1016, { reduce: true })).skin); assert.deepEqual(Array.from(sampleTentacle(r, e2, env(e2, 4000, { reduce: true })).skin), a);
});
