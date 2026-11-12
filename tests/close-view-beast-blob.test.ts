// The Ashen Moth (and the Grove Moth) in Close View (src/close-view-beast-blob.ts on the shared beast rig).
import test from 'node:test';
import assert from 'node:assert/strict';
import { BEAST_SLOT } from '../src/close-view-beast-rig.ts';
import { BLOB_RIG, BLOB_SKELETON, blobMesh, createBlobTrack, sampleBlob, blobBone } from '../src/close-view-beast-blob.ts';
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
const scaleOf = (e) => (e.scale || 1) * BLOB_RIG.closeViewScale;
const env = (e, now, extra = {}) => ({ x: e.x + .5, y: e.y + .82, z: 0, scale: scaleOf(e), now, reduce: false, tier: 'full', target: { x: 30, y: 20 }, dead: false, ...extra });
function fight(only, seconds, each) {
  const w = world(), e = createCombatant('morphingBlob', 24, 20, true, []), tr = createBlobTrack(); let now = 1000;
  Object.assign(e, { id: 'blob-cv', aggro: true, hp: 5e5, maxHp: 1e6, damage: 40 }); e.packAttacks = [only]; e.packBossAttacks = []; w.enemies.push(e);
  for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; now += w.dt * 1000; updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); each(sampleBlob(tr, e, env(e, now, { target: w.player })), e, tr, now); }
}
const finite = (a) => { for (const v of a) if (!Number.isFinite(v)) return false; return true; };

test('the mesh: bounded per tier, valid, cached; registered', () => {
  assert.ok(BLOB_SKELETON.count <= BEAST_SLOT.maxBones);
  let prev = Infinity;
  for (const tier of ['full', 'balanced', 'low']) {
    const m = blobMesh(tier);
    assert.ok(m.coreTriangles <= BEAST_SLOT.triangles[tier], `${tier}: ${m.coreTriangles}`); assert.ok(m.coreTriangles < prev); prev = m.coreTriangles;
    for (const i of m.indices) assert.ok(i < m.vertexCount);
    for (let v = 0; v < m.vertexCount; v++) assert.ok(Math.abs(Math.hypot(m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]) - 1) < 1e-3);
    assert.strictEqual(blobMesh(tier), m);
  }
  assert.equal(CLOSE_VIEW_BEASTS.morphingBlob.scale, 1.25); assert.ok(closeViewBeastEligible(createCombatant('morphingBlob', 1, 1, true, [])));
});

test('its outline wobbles; its irises go orange when it is enraged; it grows with the game', () => {
  const e = createCombatant('morphingBlob', 10, 10, true, []), tr = createBlobTrack(); let now = 1000; const seen = new Set();
  for (let i = 0; i < 90; i++) { sampleBlob(tr, e, env(e, now += 16)); seen.add(tr.pose.scl[BLOB_SKELETON.index.lobe0].toFixed(3)); }
  assert.ok(seen.size > 20, 'the lobes wobble');
  assert.ok(tr.pose.scl[BLOB_SKELETON.index.irisLime] > .5 && tr.pose.scl[BLOB_SKELETON.index.irisRage] < .01);
  e.hp = e.maxHp * .4; sampleBlob(tr, e, env(e, now += 16)); assert.ok(tr.pose.scl[BLOB_SKELETON.index.irisRage] > .5 && tr.pose.scl[BLOB_SKELETON.index.irisLime] < .01, 'enraged');
  const small = sampleBlob(createBlobTrack(), e, env(e, now, { scale: 1 })).scale, big = sampleBlob(createBlobTrack(), e, env(e, now, { scale: 2.4 })).scale; assert.ok(big > small * 2);
});

test('deterministic', () => {
  const run = () => { const out = []; fight('blobTendrils', 3, (f) => out.push(Array.from(f.skin.subarray(0, BLOB_SKELETON.count * 12)))); return out; };
  assert.deepEqual(run(), run());
});

test('every attack plays without a broken frame; the tendrils lash out along their lanes', () => {
  for (const id of [...MONSTER_PACK.morphingBlob.attacks, ...MONSTER_PACK.morphingBlob.bossAttacks]) {
    let frames = 0;
    fight(id, 7, (f, e) => { assert.ok(f && finite(f.skin), `${id}: finite`); assert.ok(f.emitK.every((k) => k >= 0 && k <= 3)); if (e.pack.attack === id) frames++; });
    assert.ok(frames > 5, id);
  }
  let reach = 0;
  fight('blobTendrils', 4, (f, e, tr) => { const c = blobBone(tr, 'core'), t = blobBone(tr, 'ten1_2'); if (e.pack.attack === 'blobTendrils' && e.pack.phase !== 'windup') reach = Math.max(reach, Math.hypot(t[0] - c[0], t[1] - c[1])); });
  assert.ok(reach > 2, `out along the lane (${reach.toFixed(2)} tiles)`);
});

test('death; reduced motion', () => {
  const e = createCombatant('morphingBlob', 10, 10, true, []), tr = createBlobTrack(); let now = 1000;
  let g = sampleBlob(tr, e, env(e, now)), n = 0; while (g && n < 1000) { g = sampleBlob(tr, e, env(e, now += 16, { dead: true })); n++; }
  assert.ok(n < 1000 && g == null, 'it melts and is gone');
  const r = createBlobTrack(), e2 = createCombatant('morphingBlob', 10, 10, true, []); sampleBlob(r, e2, env(e2, 1000, { reduce: true }));
  const a = Array.from(sampleBlob(r, e2, env(e2, 1016, { reduce: true })).skin); assert.deepEqual(Array.from(sampleBlob(r, e2, env(e2, 4000, { reduce: true })).skin), a);
});
