// The Ashen Moth (and the Grove Moth) in Close View (src/close-view-beast-crystal.ts on the shared beast rig).
import test from 'node:test';
import assert from 'node:assert/strict';
import { BEAST_SLOT } from '../src/close-view-beast-rig.ts';
import { CRYSTAL_RIG, CRYSTAL_SKELETON, crystalMesh, createCrystalTrack, sampleCrystal, crystalBone } from '../src/close-view-beast-crystal.ts';
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
const scaleOf = (e) => (e.scale || 1) * CRYSTAL_RIG.closeViewScale;
const env = (e, now, extra = {}) => ({ x: e.x + .5, y: e.y + .82, z: 0, scale: scaleOf(e), now, reduce: false, tier: 'full', target: { x: 30, y: 20 }, dead: false, ...extra });
function fight(only, seconds, each) {
  const w = world(), e = createCombatant('psychicCrystal', 24, 20, true, []), tr = createCrystalTrack(); let now = 1000;
  Object.assign(e, { id: 'crystal-cv', aggro: true, hp: 5e5, maxHp: 1e6, damage: 40 }); e.packAttacks = [only]; e.packBossAttacks = []; w.enemies.push(e);
  for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; now += w.dt * 1000; updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); each(sampleCrystal(tr, e, env(e, now, { target: w.player })), e, tr, now); }
}
const finite = (a) => { for (const v of a) if (!Number.isFinite(v)) return false; return true; };

test('the mesh: bounded per tier, valid, cached; registered', () => {
  assert.ok(CRYSTAL_SKELETON.count <= BEAST_SLOT.maxBones);
  for (const tier of ['full', 'balanced', 'low']) {
    const m = crystalMesh(tier);
    assert.ok(m.coreTriangles <= BEAST_SLOT.triangles[tier], `${tier}: ${m.coreTriangles}`);
    for (const i of m.indices) assert.ok(i < m.vertexCount);
    for (let v = 0; v < m.vertexCount; v++) assert.ok(Math.abs(Math.hypot(m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]) - 1) < 1e-3);
    assert.strictEqual(crystalMesh(tier), m);
  }
  assert.equal(CLOSE_VIEW_BEASTS.psychicCrystal.scale, 1.25); assert.ok(closeViewBeastEligible(createCombatant('psychicCrystal', 1, 1, true, [])));
});

test('it floats at head height and turns; its aura says what it means', () => {
  const e = createCombatant('psychicCrystal', 10, 10, true, []), tr = createCrystalTrack(), S = scaleOf(e); let now = 1000, f;
  const run = (n) => { for (let i = 0; i < n; i++) f = sampleCrystal(tr, e, env(e, now += 16)); return f; };
  run(40); assert.ok(crystalBone(tr, 'body')[2] > .6 * S, 'floating'); assert.ok(f.emitA[3] > .1 && f.emitA[1] < .02, 'white at rest');
  e.pack = { attack: 'psyPush', phase: 'active', t: 1, seq: 1, data: {} }; run(60); assert.ok(f.emitA[1] > .2 && f.emitA[3] < .02, 'red attacking');
  e.pack = { attack: 'psyGrab', phase: 'windup', t: 1, seq: 2, data: {} }; run(60); assert.ok(f.emitA[2] > .2 && f.emitA[1] < .02, 'violet as it takes hold');
});

test('deterministic', () => {
  const run = () => { const out = []; fight('psyPush', 3, (f) => out.push(Array.from(f.skin.subarray(0, CRYSTAL_SKELETON.count * 12)))); return out; };
  assert.deepEqual(run(), run());
});

test('every attack plays without a broken frame', () => {
  for (const id of [...MONSTER_PACK.psychicCrystal.attacks, ...MONSTER_PACK.psychicCrystal.bossAttacks]) {
    let frames = 0;
    fight(id, 7, (f, e) => { assert.ok(f && finite(f.skin), `${id}: finite`); assert.ok(f.emitK.every((k) => k >= 0 && k <= 3)); if (e.pack.attack === id) frames++; });
    assert.ok(frames > 5, id);
  }
});

test('broken, it falls to the floor and its aura goes out; death; reduced motion', () => {
  const e = createCombatant('psychicCrystal', 10, 10, true, []), tr = createCrystalTrack(), S = scaleOf(e); let now = 1000, f;
  e.crystalFall = 1; for (let i = 0; i < 10; i++) f = sampleCrystal(tr, e, env(e, now += 16));
  assert.ok(crystalBone(tr, 'body')[2] < .25 * S, 'on the floor'); for (const s of ['shard0', 'lesserL']) assert.ok(crystalBone(tr, s)[2] < .12 * S, s);
  e.crystalFall = 0;
  let g = sampleCrystal(tr, e, env(e, now)), n = 0; while (g && n < 1000) { g = sampleCrystal(tr, e, env(e, now += 16, { dead: true })); n++; }
  assert.ok(n < 1000 && g == null, 'gone');
  const r = createCrystalTrack(), e2 = createCombatant('psychicCrystal', 10, 10, true, []); sampleCrystal(r, e2, env(e2, 1000, { reduce: true }));
  const a = Array.from(sampleCrystal(r, e2, env(e2, 1016, { reduce: true })).skin); assert.deepEqual(Array.from(sampleCrystal(r, e2, env(e2, 4000, { reduce: true })).skin), a);
});
