// Release 889: the Lightning Giant's skinned Close View body (src/close-view-beast-giant.ts on the shared beast rig).
// Pose and rig checks like the Wayfarer's: every attack reaches its key poses on the game's own clocks, planted feet stay
// put, the mesh is bounded per quality tier, sampling is deterministic and reuses its buffers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BEAST_SLOT, boneLocalToWorld } from '../src/close-view-beast-rig.ts';
import { GIANT_RIG, GIANT_SKELETON, giantMesh, createGiantTrack, sampleGiant, giantBone } from '../src/close-view-beast-giant.ts';
import { CLOSE_VIEW_BEASTS, closeViewBeastEligible } from '../src/close-view-beasts.ts';
import { ATTACK_MODULES, GIANT, MONSTER_PACK, updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';

const SCALE = 1.9 * GIANT_RIG.closeViewScale;
function world(player = { x: 16, y: 12 }) {
  const open = (x, y) => x >= 0 && y >= 0 && x < 32 && y < 32;
  const w = {
    player: { ...player, hp: 1e9 }, dt: 1 / 60, now: 0, enemies: [], fx: [], playerVelocity: { x: 0, y: 0 },
    open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true,
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt() { return true; }, stun() {}, shockHit() {}, slow() {}, push() {}, pull() {}, poison() {},
    addEffect(effect) { addPackEffect(w.fx, effect, w.now); }, effects: () => w.fx,
  };
  return w;
}
function giant(w, only, x = 13, y = 12) {
  const e = createCombatant('lightningGiant', x, y, true, []); Object.assign(e, { id: 'giant-cv', aggro: true, hp: 1e6, maxHp: 1e6, damage: 40 });
  e.packAttacks = [only]; e.giantDashCd = 1e9; w.enemies.push(e); return e;
}
const env = (e, now, extra = {}) => ({ x: e.x + .5, y: e.y + .82, z: 0, scale: SCALE, now, reduce: false, tier: 'full', target: { x: 16, y: 12 }, dead: false, ...extra });
// Run the real pack controller and sample the pose every simulation step (the steady 60 Hz clock).
function fight(only, seconds, each, player) {
  const w = world(player), e = giant(w, only), tr = createGiantTrack(); let now = 1000;
  for (let t = 0; t < seconds; t += w.dt) {
    w.now += w.dt * 1000; now += w.dt * 1000; updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w);
    const f = sampleGiant(tr, e, env(e, now, { target: w.player }));
    each(f, e, tr, now);
  }
  return { e, tr };
}
const tip = (tr) => boneLocalToWorld(tr.pose, 'club', GIANT_RIG.club, 0, 0);
const finite = (a) => { for (const v of a) if (!Number.isFinite(v)) return false; return true; };

test('the mesh: bounded per tier, one bone a vertex, the cloud an optional section', () => {
  assert.ok(GIANT_SKELETON.count <= BEAST_SLOT.maxBones);
  let prev = Infinity;
  for (const tier of ['full', 'balanced', 'low']) {
    const m = giantMesh(tier);
    assert.ok(m.coreTriangles <= BEAST_SLOT.triangles[tier], `${tier}: ${m.coreTriangles} triangles`);
    assert.ok(m.triangles - m.coreTriangles <= 300, `${tier}: the storm cloud stays small`);
    assert.ok(m.coreTriangles < prev, 'each tier is cheaper than the one above'); prev = m.coreTriangles;
    assert.equal(m.indices.length, m.triangles * 3); assert.ok(m.vertexCount < 65536);
    for (const i of m.indices) assert.ok(i < m.vertexCount);
    for (let v = 0; v < m.vertexCount; v++) {
      const b = m.skin[v * 2], e = m.skin[v * 2 + 1];
      assert.ok(Number.isInteger(b) && b >= 0 && b < GIANT_SKELETON.count); assert.ok([0, 1, 2, 3, 4].includes(e));
      assert.ok(Math.abs(Math.hypot(m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]) - 1) < 1e-3);
    }
    assert.strictEqual(giantMesh(tier), m, 'built once and cached');
  }
  // the emissive parts are details, never most of the body
  const m = giantMesh('full'); let lit = 0; for (let v = 0; v < m.vertexCount; v++) if (m.skin[v * 2 + 1] > 0) lit++;
  assert.ok(lit / m.vertexCount < .35);
});

test('standing: a quarter larger than the standard view, upright, both feet on the ground, buffers reused', () => {
  const e = createCombatant('lightningGiant', 10, 10, true, []), tr = createGiantTrack();
  let f0 = null;
  for (let i = 0; i < 90; i++) { const f = sampleGiant(tr, e, env(e, 1000 + i * 16)); if (f0) { assert.strictEqual(f, f0); assert.strictEqual(f.skin, f0.skin); } f0 = f; }
  assert.ok(finite(f0.skin));
  const head = giantBone(tr, 'head'), feet = [giantBone(tr, 'footL'), giantBone(tr, 'footR')];
  // the helm's base sits near GIANT_ART's .965 u, scaled to the Close View size
  assert.ok(Math.abs(head[2] / SCALE - .975) < .06, `head ${head[2] / SCALE}`);
  for (const p of feet) assert.ok(Math.abs(p[2] - GIANT_RIG.ankle * SCALE) < .05 * SCALE, 'ankles at their height');
  assert.equal(CLOSE_VIEW_BEASTS.lightningGiant.scale, 1.25);
  assert.ok(closeViewBeastEligible(e)); assert.ok(!closeViewBeastEligible({ ...e, hidden: true })); assert.ok(!closeViewBeastEligible({ ...e, kind: 'ashling' }));
  // presentation only: the game's body is the Monster Pack's
  assert.equal(MONSTER_PACK.lightningGiant.form.scale, 1.9);
});

test('walking: a planted foot never slides while the body passes over it', () => {
  const e = createCombatant('lightningGiant', 10, 10, true, []), tr = createGiantTrack();
  let now = 1000, checked = 0; const last = [null, null];
  for (let i = 0; i < 240; i++) {
    e.x += 1.6 / 60; now += 1000 / 60;
    sampleGiant(tr, e, env(e, now));
    if (i < 40) continue; // settle into the stride
    for (let s = 0; s < 2; s++) {
      const p = giantBone(tr, s ? 'footR' : 'footL'), planted = tr.frame.feet[s * 2] === 1;
      if (planted && last[s]) { assert.ok(Math.hypot(p[0] - last[s][0], p[1] - last[s][1]) < 1e-3, 'planted foot holds'); checked++; }
      last[s] = planted ? p : null;
    }
  }
  assert.ok(checked > 100);
  assert.ok(tr.gait.moving > .9);
});

test('deterministic: the same game states and frame times give the same pose', () => {
  const run = () => { const out = []; fight('giantSwing', 3, (f) => out.push(Array.from(f.skin.subarray(0, GIANT_SKELETON.count * 12)))); return out; };
  assert.deepEqual(run(), run());
});

test('club swing: anticipation over the shoulder, contact as each cut resolves, follow-through', () => {
  const mod = ATTACK_MODULES.giantSwing; let raised = false, cut1 = null, cut2 = null, prevPhase = '', crossed = false;
  fight('giantSwing', 4, (f, e, tr) => {
    const p = e.pack; if (p.attack !== 'giantSwing') return;
    const c = tip(tr), head = giantBone(tr, 'head');
    if (p.phase === 'windup' && c[2] > head[2]) raised = true;
    if (p.phase === 'active' && prevPhase === 'windup') cut1 = { c, e: { x: e.x + .5, y: e.y + .82 }, aim: p.data.aim };
    if (p.phase === 'active' && p.data.cut === 2 && !crossed) { crossed = true; cut2 = { c, e: { x: e.x + .5, y: e.y + .82 }, aim: p.data.aim }; }
    prevPhase = p.phase;
    assert.ok(finite(f.skin));
  });
  assert.ok(raised, 'the club is cocked above the helm during the wind-up');
  for (const cut of [cut1, cut2]) {
    assert.ok(cut, 'both cuts sampled');
    const dx = cut.c[0] - cut.e.x, dy = cut.c[1] - cut.e.y, ahead = (dx * cut.aim.x + dy * cut.aim.y) / Math.hypot(cut.aim.x, cut.aim.y);
    assert.ok(ahead > .6 * SCALE * .5, `the club head is out in front at contact (${ahead.toFixed(2)})`);
  }
  assert.ok(mod.active > 0);
});

test('club slam: raised overhead, the head at the ground the moment it lands, then hauled free', () => {
  let high = false, landed = null, prev = '', end = null;
  fight('giantSlam', 4, (f, e, tr) => {
    const p = e.pack; if (p.attack !== 'giantSlam') { if (prev === 'recover') end ??= tip(tr)[2]; prev = ''; return; }
    const c = tip(tr), head = giantBone(tr, 'head');
    if (p.phase === 'windup' && c[2] > head[2] + .1 * SCALE) high = true;
    if (p.phase === 'recover' && prev === 'windup') landed = c[2];
    prev = p.phase;
  });
  assert.ok(high, 'overhead before the blow');
  assert.ok(landed != null && landed < .35 * SCALE, `the club head reaches the ground at the slam (${landed?.toFixed(2)})`);
  assert.ok(end != null && end > landed, 'and comes up again in recovery');
});

test('every attack plays on its own clocks without a broken frame', () => {
  for (const id of MONSTER_PACK.lightningGiant.attacks) {
    const phases = new Set(); let frames = 0;
    fight(id, id === 'giantMenace' || id === 'giantUpswing' ? 9 : 5, (f, e) => {
      assert.ok(f && finite(f.skin), `${id}: finite pose`);
      assert.ok(f.emitK.every((k) => k >= 0 && k <= 3), `${id}: bounded glows`);
      if (e.pack.attack === id) { phases.add(e.pack.phase); frames++; }
    }, { x: 15, y: 12 });
    assert.ok(phases.has('windup') && phases.has('recover'), `${id}: ${[...phases]}`);
    assert.ok(frames > 10, id);
  }
});

test('electrify: the sky strike jolts the raised club and the coils run hot', () => {
  let before = 0, after = 0;
  fight('giantElectrify', 4, (f, e, tr) => {
    const p = e.pack; if (p.attack !== 'giantElectrify' || p.phase !== 'windup') return;
    const share = 1 - p.t / (ATTACK_MODULES.giantElectrify.windup * (p.paced ? 1.2 : 1));
    if (share < GIANT.strikeAt - .05) before = Math.max(before, f.emitK[1]); else if (share > GIANT.strikeAt + .02) after = Math.max(after, f.emitK[1]);
    if (share > .4) assert.ok(tip(tr)[2] > giantBone(tr, 'head')[2], 'club raised to the sky');
  });
  assert.ok(after > before + .3, `coils flare after the strike (${before.toFixed(2)} -> ${after.toFixed(2)})`);
});

test('a landing from the leap is absorbed, a blow makes it flinch, and death fells it', () => {
  const e = createCombatant('lightningGiant', 10, 10, true, []), tr = createGiantTrack(); let now = 1000;
  const pelvis = () => giantBone(tr, 'pelvis')[2];
  for (let i = 0; i < 30; i++) sampleGiant(tr, e, env(e, now += 16));
  const rest = pelvis();
  e.giantAir = 1.5; for (let i = 0; i < 10; i++) sampleGiant(tr, e, env(e, now += 16));
  e.giantAir = 0; let low = Infinity; for (let i = 0; i < 20; i++) { sampleGiant(tr, e, env(e, now += 16)); low = Math.min(low, pelvis()); }
  assert.ok(low < rest - .03 * SCALE, 'knees take the landing');
  for (let i = 0; i < 40; i++) sampleGiant(tr, e, env(e, now += 16));
  e.hp -= 10; let f = sampleGiant(tr, e, env(e, now += 16)); assert.ok(f.hit > 0, 'hit reaction');
  // death: it topples over its feet and fades, then is gone
  const start = now; let lowest = Infinity, frames = 0;
  while (f) { f = sampleGiant(tr, e, env(e, now += 16, { dead: true })); if (f) { lowest = Math.min(lowest, giantBone(tr, 'head')[2]); frames++; } }
  assert.ok(lowest < .5 * SCALE, 'the head comes down to the ground');
  assert.ok(now - start >= GIANT_RIG.deathMs - 20 && frames > 100);
});

test('reduced motion: no ambient flourish or loose lightning, the attacks still read', () => {
  const e = createCombatant('lightningGiant', 10, 10, true, []), tr = createGiantTrack();
  sampleGiant(tr, e, env(e, 1000, { reduce: true })); const a = Array.from(sampleGiant(tr, e, env(e, 1016, { reduce: true })).skin);
  const b = Array.from(sampleGiant(tr, e, env(e, 4321, { reduce: true })).skin);
  assert.deepEqual(a, b, 'standing still is still');
  for (const n of ['spark0', 'clubArc', 'pylonArc']) { const i = GIANT_SKELETON.index[n] * 9; assert.equal(tr.pose.wr[i], 0, `${n} hidden`); }
  e.giantCharged = 5; sampleGiant(tr, e, env(e, 5000, { reduce: true })); assert.equal(tr.pose.wr[GIANT_SKELETON.index.spark0 * 9], 0);
});

test('turning on the spot: feet are lifted and stepped, never slid while planted', () => {
  const e = createCombatant('lightningGiant', 10, 10, true, []), tr = createGiantTrack(); let now = 1000, steps = 0;
  const target = (deg) => ({ x: e.x + Math.cos(deg * Math.PI / 180) * 6, y: e.y + Math.sin(deg * Math.PI / 180) * 6 });
  for (let i = 0; i < 30; i++) sampleGiant(tr, e, env(e, now += 16, { target: target(0) }));
  const last = [giantBone(tr, 'footL'), giantBone(tr, 'footR')];
  for (let i = 0; i < 150; i++) {
    sampleGiant(tr, e, env(e, now += 16, { target: target(120) }));
    for (let s = 0; s < 2; s++) {
      const p = giantBone(tr, s ? 'footR' : 'footL'), moved = Math.hypot(p[0] - last[s][0], p[1] - last[s][1]);
      if (tr.frame.feet[s * 2] === 1) assert.ok(moved < 1e-3, 'a planted foot holds');
      else if (moved > 1e-3) steps++;
      last[s] = p;
    }
  }
  assert.ok(steps > 10, 'the feet stepped round');
  assert.ok(Math.abs(Math.atan2(Math.sin(tr.yaw - 2.094), Math.cos(tr.yaw - 2.094))) < .05, 'it turned to face');
});

test('sparse frames (a hidden tab, a slow phone) show the act as it is now, never a stale blend', () => {
  const e = createCombatant('lightningGiant', 10, 10, true, []), tr = createGiantTrack(); let now = 1000;
  for (let i = 0; i < 20; i++) sampleGiant(tr, e, env(e, now += 16));
  e.pack = { attack: 'giantMenace', phase: 'active', t: 20, seq: 1, paced: false, data: { mode: 'stalk', hold: 2 } };
  sampleGiant(tr, e, env(e, now += 600));
  assert.ok(boneLocalToWorld(tr.pose, 'club', GIANT_RIG.club, 0, 0)[2] > giantBone(tr, 'head')[2], 'the club is already up');
});
