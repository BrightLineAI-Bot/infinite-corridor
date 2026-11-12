// The Crimson Tyrant and the Doom Chaser in Close View (src/close-view-beast-dragon.ts on the shared beast rig).
import test from 'node:test';
import assert from 'node:assert/strict';
import { BEAST_SLOT } from '../src/close-view-beast-rig.ts';
import { DRAGON_RIG, DRAGON_SKELETON, dragonMesh, createDragonTrack, sampleDragon, dragonBone } from '../src/close-view-beast-dragon.ts';
import { CLOSE_VIEW_BEASTS, closeViewBeastEligible } from '../src/close-view-beasts.ts';
import { MONSTER_PACK, updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';

function world(player = { x: 30, y: 20 }) {
  const open = (x, y) => x >= 0 && y >= 0 && x < 64 && y < 44;
  const w = {
    player: { ...player, hp: 1e9, maxHp: 1e9 }, dt: 1 / 60, now: 0, enemies: [], fx: [], playerVelocity: { x: 0, y: 0 },
    open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true,
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt() { return true; }, slow() {}, push() { return true; }, pull() {}, poison() {}, stun() {},
    addEffect(effect) { addPackEffect(w.fx, effect, w.now); }, effects: () => w.fx,
  };
  return w;
}
const scaleOf = (e) => (e.scale || 1) * DRAGON_RIG.closeViewScale;
const env = (e, now, extra = {}) => ({ x: e.x + .5, y: e.y + .82, z: 0, scale: scaleOf(e), now, reduce: false, tier: 'full', target: { x: 30, y: 20 }, dead: false, ...extra });
function fight(kind, only, seconds, each, player) {
  const w = world(player), e = createCombatant(kind, 24, 20, true, []), tr = createDragonTrack(kind); let now = 1000;
  Object.assign(e, { id: kind + '-cv', aggro: true, hp: 5e5, maxHp: 1e6, damage: 40 }); e.packAttacks = [only]; e.packBossAttacks = []; w.enemies.push(e);
  for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; now += w.dt * 1000; updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); each(sampleDragon(tr, e, env(e, now, { target: w.player })), e, tr, now); }
}
const finite = (a) => { for (const v of a) if (!Number.isFinite(v)) return false; return true; };
const PAWS = ['pawHL', 'pawFL', 'pawHR', 'pawFR'];

test('the meshes: bounded per tier, valid, cached, in each dragon\'s colours; registered', () => {
  assert.ok(DRAGON_SKELETON.count <= BEAST_SLOT.maxBones);
  for (const kind of ['crimsonTyrant', 'doomChaser']) {
    let prev = Infinity;
    for (const tier of ['full', 'balanced', 'low']) {
      const m = dragonMesh(tier, kind);
      assert.ok(m.coreTriangles <= BEAST_SLOT.triangles[tier], `${kind} ${tier}: ${m.coreTriangles}`); assert.ok(m.coreTriangles < prev); prev = m.coreTriangles;
      for (const i of m.indices) assert.ok(i < m.vertexCount);
      for (let v = 0; v < m.vertexCount; v++) assert.ok(Math.abs(Math.hypot(m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]) - 1) < 1e-3);
      assert.strictEqual(dragonMesh(tier, kind), m);
    }
    assert.equal(CLOSE_VIEW_BEASTS[kind].scale, 1.25); assert.ok(closeViewBeastEligible(createCombatant(kind, 1, 1, true, [])));
  }
  assert.notDeepEqual(Array.from(dragonMesh('full', 'crimsonTyrant').colors.subarray(0, 30)), Array.from(dragonMesh('full', 'doomChaser').colors.subarray(0, 30)), 'each in its own colours');
});

test('walking on planted feet', () => {
  const e = createCombatant('crimsonTyrant', 4, 10, true, []), tr = createDragonTrack('crimsonTyrant'), S = scaleOf(e); let now = 1000, checked = 0; const last = [null, null, null, null];
  for (let i = 0; i < 200; i++) {
    e.x += 1.5 / 60; now += 1000 / 60; sampleDragon(tr, e, env(e, now));
    if (i < 40) continue;
    for (let k = 0; k < 4; k++) { const p = dragonBone(tr, PAWS[k]), planted = tr.frame.feet[k * 2] === 1;
      if (planted && last[k]) { assert.ok(Math.hypot(p[0] - last[k][0], p[1] - last[k][1]) < 1e-3 * S, `${PAWS[k]} holds (i ${i}, ${Math.hypot(p[0] - last[k][0], p[1] - last[k][1]).toFixed(4)})`); checked++; }
      last[k] = planted ? p : null; }
  }
  assert.ok(checked > 80, `${checked}`);
});

test('deterministic', () => {
  const run = () => { const out = []; fight('crimsonTyrant', 'dragonSlam', 3, (f) => out.push(Array.from(f.skin.subarray(0, DRAGON_SKELETON.count * 12)))); return out; };
  assert.deepEqual(run(), run());
});

test('every attack of both dragons plays without a broken frame', () => {
  for (const kind of ['crimsonTyrant', 'doomChaser']) for (const id of [...MONSTER_PACK[kind].attacks, ...MONSTER_PACK[kind].bossAttacks]) {
    if (id === 'dragonColonize') continue; // scheduled by the world, not a pack pick
    let frames = 0;
    fight(kind, id, 7, (f, e) => { assert.ok(f && finite(f.skin), `${kind} ${id}: finite`); assert.ok(f.emitK.every((k) => k >= 0 && k <= 3)); if (e.pack.attack === id) frames++; }, { x: 30, y: 20 });
    assert.ok(frames > 5, `${kind} ${id}`);
  }
});

test('flight lifts it with wings spread; the spins turn it; the slam lands', () => {
  let high = 0, spread = 0, folded = Infinity;
  fight('crimsonTyrant', 'dragonStrafe', 5, (f, e, tr) => { high = Math.max(high, dragonBone(tr, 'pelvis')[2]); if (e.dragonAir > .5) { const c = dragonBone(tr, 'chest'), w = dragonBone(tr, 'wingTipR'); spread = Math.max(spread, Math.hypot(w[0] - c[0], w[1] - c[1], w[2] - c[2])); } else if (!(e.dragonAir > 0)) { const c = dragonBone(tr, 'chest'), w = dragonBone(tr, 'wingTipR'); folded = Math.min(folded, Math.hypot(w[0] - c[0], w[1] - c[1], w[2] - c[2])); } });
  const S = scaleOf(createCombatant('crimsonTyrant', 0, 0, true, []));
  assert.ok(high > 1.3 * S, `airborne (${(high / S).toFixed(2)})`); assert.ok(spread > 1.5 * folded && spread > .6 * S, `wings open (${(spread / S).toFixed(2)} vs folded ${(folded / S).toFixed(2)})`);
  let turned = 0, last = null;
  fight('crimsonTyrant', 'dragonTailSpin', 4, (f, e, tr) => { if (!(e.dragonSpin > 0)) return; const r = tr.pose.wr, a = Math.atan2(r[1], r[0]); if (last != null) turned += Math.abs(Math.atan2(Math.sin(a - last), Math.cos(a - last))); last = a; });
  assert.ok(turned > Math.PI * 2, `it spins (${turned.toFixed(1)})`);
  let contact = false; fight('crimsonTyrant', 'dragonSlam', 3, (f) => { if (f.contact) contact = true; }); assert.ok(contact, 'the slam lands');
});

test('death; reduced motion', () => {
  const e = createCombatant('doomChaser', 10, 10, true, []), tr = createDragonTrack('doomChaser'); let now = 1000;
  let g = sampleDragon(tr, e, env(e, now)), n = 0; while (g && n < 1000) { g = sampleDragon(tr, e, env(e, now += 16, { dead: true })); n++; }
  assert.ok(n < 1000 && g == null, 'it falls and is gone');
  const r = createDragonTrack('crimsonTyrant'), e2 = createCombatant('crimsonTyrant', 10, 10, true, []); sampleDragon(r, e2, env(e2, 1000, { reduce: true }));
  const a = Array.from(sampleDragon(r, e2, env(e2, 1016, { reduce: true })).skin); assert.deepEqual(Array.from(sampleDragon(r, e2, env(e2, 4000, { reduce: true })).skin), a);
});

// ---- the rework after Tim's review (2026-11-12): wings spread and beating in every flying move, the rearing roar, the aerial slam
const span = (tr) => { const a = dragonBone(tr, 'wingTipL'), b = dragonBone(tr, 'wingTipR'); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); };
const Sof = (kind) => scaleOf(createCombatant(kind, 0, 0, true, []));

test('in every flying move the wings are spread wide, and they beat', () => {
  for (const [kind, id] of [['crimsonTyrant', 'dragonStrafe'], ['crimsonTyrant', 'dragonSupernova'], ['crimsonTyrant', 'dragonDive'], ['doomChaser', 'doomWaves'], ['doomChaser', 'doomFall'], ['doomChaser', 'doomEclipse']]) {
    const S = Sof(kind); let n = 0, least = Infinity, lo = Infinity, hi = -Infinity;
    fight(kind, id, 9, (f, e, tr) => { const d = e.pack?.data || {}; if (!(e.dragonAir > .5) || d.stage === 'fall' || d.mode === 'drop') return;
      n++; least = Math.min(least, span(tr) / S); const z = (dragonBone(tr, 'wingTipR')[2] - dragonBone(tr, 'chest')[2]) / S; lo = Math.min(lo, z); hi = Math.max(hi, z); });
    assert.ok(n > 20, `${kind} ${id}: aloft (${n})`); assert.ok(least > .9, `${kind} ${id}: spread (${least.toFixed(2)})`); assert.ok(hi - lo > .6, `${kind} ${id}: beating (${(hi - lo).toFixed(2)})`);
  }
});

test('the roar: it rears up with its wings outspread; on the move it carries them half open', () => {
  const S = Sof('doomChaser'); let reared = 0, spread = 0;
  fight('doomChaser', 'doomRoar', 4, (f, e, tr) => { if (e.dragonPose !== 'roar') return; reared = Math.max(reared, (dragonBone(tr, 'chest')[2] - dragonBone(tr, 'pelvis')[2]) / S); spread = Math.max(spread, span(tr) / S); });
  assert.ok(reared > .25, `reared (${reared.toFixed(2)})`); assert.ok(spread > 1.5, `wings out (${spread.toFixed(2)})`);
  const e = createCombatant('crimsonTyrant', 4, 10, true, []), tr = createDragonTrack('crimsonTyrant'); let now = 1000;
  for (let i = 0; i < 30; i++) sampleDragon(tr, e, env(e, now += 16)); const rest = span(tr);
  for (let i = 0; i < 60; i++) { e.x += 1.5 / 60; sampleDragon(tr, e, env(e, now += 1000 / 60)); }
  assert.ok(span(tr) > rest * 1.15, `half open on the move (${(span(tr) / Sof('crimsonTyrant')).toFixed(2)} vs ${(rest / Sof('crimsonTyrant')).toFixed(2)})`);
});

test('the aerial slam: it hangs upright on spread wings, dives nose first, and lands with its wings flung up', () => {
  for (const [kind, id, stageOf] of [['crimsonTyrant', 'dragonDive', (d) => d.stage], ['doomChaser', 'doomFall', (d) => ({ track: 'hang', drop: 'fall', done: 'done' })[d.mode]]]) {
    const S = Sof(kind), seen = { hang: 0, fall: 0, done: 0 }; let upright = 0, nose = Infinity, flung = -Infinity, contact = false;
    fight(kind, id, 9, (f, e, tr) => { if (e.pack?.attack !== id) return; const st = stageOf(e.pack.data || {}); if (!(st in seen)) return; seen[st]++;
      const c = dragonBone(tr, 'chest'), p = dragonBone(tr, 'pelvis'), h = dragonBone(tr, 'head');
      if (st === 'hang' && seen.hang > 20) upright = Math.max(upright, (c[2] - p[2]) / S);
      if (st === 'fall' && seen.fall > 12) nose = Math.min(nose, (h[2] - p[2]) / S);
      if (st === 'done' && seen.done > 3 && seen.done < 20) { flung = Math.max(flung, (dragonBone(tr, 'wingTipR')[2] - c[2]) / S); if (f.contact) contact = true; } });
    assert.ok(seen.hang && seen.fall && seen.done, `${kind}: every stage (${JSON.stringify(seen)})`);
    assert.ok(upright > .25, `${kind}: hangs upright (${upright.toFixed(2)})`); assert.ok(nose < 0, `${kind}: nose first (${nose.toFixed(2)})`);
    assert.ok(flung > 1, `${kind}: wings flung up (${flung.toFixed(2)})`); assert.ok(contact, `${kind}: it lands`);
  }
});
