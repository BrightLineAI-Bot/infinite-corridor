// The Tremor Worm in Close View (src/close-view-beast-worm.ts on the shared beast rig).
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
  e.untargetable = true; e.pack = { ...(e.pack || {}), attack: 'wormRise', phase: 'erupt', data: {} }; assert.ok(!closeViewBeastEligible(e), 'about to burst up: the mound');
  e.pack = { ...e.pack, attack: null, phase: 'idle', worm: { mode: 'emerge', t: .3 } }; assert.ok(closeViewBeastEligible(e), 'coming up after a trip under the ground: its body, as the standard view draws it');
  e.untargetable = false; e.hidden = true; assert.ok(!closeViewBeastEligible(e), 'under the ground: the mound');
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

test('the lip tentacles: four bones each, writhing on a travelling wave, suckers in the mesh', () => {
  for (let i = 0; i < 6; i++) for (const b of ['tent', 'tentB', 'tentC', 'tentD']) assert.ok(WORM_SKELETON.index[b + i] >= 0, b + i);
  const e = createCombatant('tremorWorm', 10, 10, true, []), tr = createWormTrack(); e.wormLift = 1;
  const local = (now) => { sampleWorm(tr, e, env(e, now)); const h = wormBone(tr, 'head'), d = wormBone(tr, 'tentD0'), c = wormBone(tr, 'tentB0'); return [d[0] - h[0], d[1] - h[1], d[2] - h[2], c[0] - h[0], c[1] - h[1], c[2] - h[2]]; };
  for (let k = 0; k < 20; k++) local(1000 + k * 16);
  const a = local(1400), b = local(1700);
  const tipMove = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), rootMove = Math.hypot(a[3] - b[3], a[4] - b[4], a[5] - b[5]);
  assert.ok(tipMove > rootMove * 1.5 && tipMove > .05, `the tip writhes more than the root (${tipMove.toFixed(3)} vs ${rootMove.toFixed(3)})`);
});

test('the lash snaps out to the ground along the lanes, then recoils', () => {
  let near = Infinity, tipAt = null, after = Infinity, lashT = null;
  fight('wormMaw', 5, (f, e, tr, now) => {
    if (e.pack.data?.lashed && lashT == null) lashT = now;
    if (lashT == null || now - lashT > 900) return;
    const d = wormBone(tr, 'tentD0');
    if (now - lashT < 240) { if (d[2] < near) { near = d[2]; tipAt = [d[0] - f.x, d[1] - f.y, Math.atan2(e.pack.data.aim?.y ?? 0, e.pack.data.aim?.x ?? 1)]; } }
    else if (now - lashT > 700) after = Math.min(after, d[2]);
  });
  assert.ok(lashT != null, 'it lashed');
  const S = (1.7) * WORM_RIG.closeViewScale, ahead = tipAt[0] * Math.cos(tipAt[2]) + tipAt[1] * Math.sin(tipAt[2]);
  assert.ok(near < .6 * S && ahead > 1.5, `the tip strikes the ground ahead (${near.toFixed(2)} high, ${ahead.toFixed(2)} ahead)`);
  assert.ok(after > near + 1, `and recoils (${after.toFixed(2)})`);
});

test('coming up: it rises out of the hole on the emergence clock and throws the ground off', () => {
  const e = createCombatant('tremorWorm', 10, 10, true, []), tr = createWormTrack(); let now = 1000; e.wormLift = .5;
  const at = (t) => { e.pack = { ...(e.pack || {}), attack: null, phase: 'idle', data: {}, worm: { mode: 'emerge', t } }; const f = sampleWorm(tr, e, env(e, now += 16)); return [wormBone(tr, 'head')[2] / f.scale, f.skin[WORM_SKELETON.index.spray * 12]]; };
  const early = at(.6), late = at(.1);
  e.pack.worm = { mode: 'surfaced', t: 3 }; for (let k = 0; k < 20; k++) sampleWorm(tr, e, env(e, now += 16));
  const up = wormBone(tr, 'head')[2] / scaleOf(e);
  assert.ok(early[0] < late[0] && late[0] < up + 1e-6, `it rises (${early[0].toFixed(2)}, ${late[0].toFixed(2)}, ${up.toFixed(2)})`);
  assert.ok(Math.abs(early[1]) > .05, 'the thrown earth shows as it breaks out');
  assert.ok(Math.abs(tr.pose.skin[WORM_SKELETON.index.spray * 12]) < .01, 'and is gone once it is up');
});
