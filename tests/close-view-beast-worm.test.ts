// The Ashen Moth (and the Grove Moth) in Close View (src/close-view-beast-worm.ts on the shared beast rig).
import test from 'node:test';
import assert from 'node:assert/strict';
import { BEAST_SLOT } from '../src/close-view-beast-rig.ts';
import { WORM_RIG, WORM_SKELETON, wormMesh, createWormTrack, sampleWorm, wormBone } from '../src/close-view-beast-worm.ts';
import { CLOSE_VIEW_BEASTS, closeViewBeastEligible } from '../src/close-view-beasts.ts';
import { MONSTER_PACK, updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';

function world(player = { x: 30, y: 20 }) {
  const open = (x, y) => x >= 0 && y >= 0 && x < 64 && y < 44;
  const w = {
    player: { ...player, hp: 1e9, maxHp: 1e9 }, width: 64, height: 44, dt: 1 / 60, now: 0, enemies: [], fx: [], playerVelocity: { x: 0, y: 0 },
    open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true,
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt() { return true; }, slow() {}, push() { return true; }, pull() {}, poison() {}, stun() {},
    addEffect(effect) { addPackEffect(w.fx, effect, w.now); }, effects: () => w.fx,
  };
  return w;
}
const scaleOf = (e) => (e.scale || 1) * WORM_RIG.closeViewScale;
const env = (e, now, extra = {}) => ({ x: e.x + .5, y: e.y + .82, z: 0, scale: scaleOf(e), now, reduce: false, tier: 'full', target: { x: 30, y: 20 }, dead: false, ...extra });
function fight(only, seconds, each) {
  const w = world(), e = createCombatant('tremorWorm', 24, 20, true, []), tr = createWormTrack(); let now = 1000;
  Object.assign(e, { id: 'worm-cv', aggro: true, hp: 5e5, maxHp: 1e6, damage: 40 }); e.packAttacks = [only]; e.packBossAttacks = []; w.enemies.push(e);
  for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; now += w.dt * 1000; updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); each(sampleWorm(tr, e, env(e, now, { target: w.player })), e, tr, now); }
}
const finite = (a) => { for (const v of a) if (!Number.isFinite(v)) return false; return true; };

test('the mesh: bounded per tier, valid, cached; registered for when it is up', () => {
  assert.ok(WORM_SKELETON.count <= BEAST_SLOT.maxBones);
  let prev = Infinity;
  for (const tier of ['full', 'balanced', 'low']) {
    const m = wormMesh(tier);
    assert.ok(m.coreTriangles <= BEAST_SLOT.triangles[tier], `${tier}: ${m.coreTriangles}`); assert.ok(m.coreTriangles < prev); prev = m.coreTriangles;
    for (const i of m.indices) assert.ok(i < m.vertexCount);
    for (let v = 0; v < m.vertexCount; v++) assert.ok(Math.abs(Math.hypot(m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]) - 1) < 1e-3);
    assert.strictEqual(wormMesh(tier), m);
  }
  const e = createCombatant('tremorWorm', 1, 1, true, []); assert.equal(CLOSE_VIEW_BEASTS.tremorWorm.scale, 1.25); assert.ok(closeViewBeastEligible(e));
  e.untargetable = true; assert.ok(!closeViewBeastEligible(e), 'about to burst up: the mound'); e.untargetable = false; e.hidden = true; assert.ok(!closeViewBeastEligible(e), 'under the ground: the mound');
});

test('it stands at the game\'s lift: half out, all the way up', () => {
  const e = createCombatant('tremorWorm', 10, 10, true, []), tr = createWormTrack(), S = scaleOf(e); let now = 1000;
  const top = (lift) => { e.wormLift = lift; for (let i = 0; i < 30; i++) sampleWorm(tr, e, env(e, now += 16)); return wormBone(tr, 'head')[2] / S; };
  const half = top(.5), up = top(1);
  assert.ok(half > .6 && up > half + .5, `half ${half.toFixed(2)}, up ${up.toFixed(2)}`);
  assert.ok(wormBone(tr, 'seg0')[2] < 0, 'its base is under the ground');
});

test('deterministic', () => {
  const run = () => { const out = []; fight('wormSlam', 3, (f) => out.push(Array.from(f.skin.subarray(0, WORM_SKELETON.count * 12)))); return out; };
  assert.deepEqual(run(), run());
});

test('every attack plays without a broken frame', () => {
  for (const id of [...MONSTER_PACK.tremorWorm.attacks, ...MONSTER_PACK.tremorWorm.bossAttacks]) {
    let frames = 0;
    fight(id, 7, (f, e) => { assert.ok(f && finite(f.skin), `${id}: finite`); assert.ok(f.emitK.every((k) => k >= 0 && k <= 3)); if (e.pack.attack === id) frames++; });
    assert.ok(frames > 5, id);
  }
});

test('the slam lies along the line; the sweep swings across the arc; the maw lashes along its lanes', () => {
  let low = Infinity, S = 0;
  fight('wormSlam', 4, (f, e, tr) => { S = f.scale; if (e.pack.data?.slammed) low = Math.min(low, wormBone(tr, 'head')[2]); });
  assert.ok(low < .9 * S, `the head comes down (${(low / S).toFixed(2)})`);
  let l = 0, r = 0;
  fight('wormSweep', 5, (f, e, tr) => { if (e.pack.attack !== 'wormSweep' || e.pack.phase !== 'active') return; const h = wormBone(tr, 'head'), side = (h[0] - f.x) * -Math.sin(f.yaw) + (h[1] - f.y) * Math.cos(f.yaw); l = Math.max(l, side); r = Math.min(r, side); });
  assert.ok(l > .3 * S && r < -.3 * S, `it swings both ways (${(l / S).toFixed(2)}, ${(r / S).toFixed(2)})`);
  let reach = 0;
  fight('wormMaw', 4, (f, e, tr) => { const h = wormBone(tr, 'head'), t = wormBone(tr, 'tentB0'); reach = Math.max(reach, Math.hypot(t[0] - h[0], t[1] - h[1])); });
  assert.ok(reach > .5 * S, `the tentacles lash out (${(reach / S).toFixed(2)})`);
});

test('death; reduced motion', () => {
  const e = createCombatant('tremorWorm', 10, 10, true, []), tr = createWormTrack(); let now = 1000;
  let g = sampleWorm(tr, e, env(e, now)), n = 0; while (g && n < 1000) { g = sampleWorm(tr, e, env(e, now += 16, { dead: true })); n++; }
  assert.ok(n < 1000 && g == null, 'it sinks and is gone');
  const r = createWormTrack(), e2 = createCombatant('tremorWorm', 10, 10, true, []); sampleWorm(r, e2, env(e2, 1000, { reduce: true }));
  const a = Array.from(sampleWorm(r, e2, env(e2, 1016, { reduce: true })).skin); assert.deepEqual(Array.from(sampleWorm(r, e2, env(e2, 4000, { reduce: true })).skin), a);
});
