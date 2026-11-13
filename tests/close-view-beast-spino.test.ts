// The Spinosaurus in Close View (src/close-view-beast-spino.ts on the shared beast rig): its hide and its fossil, driven only by
// the pose contract (spinoPose, spinoAir, spinoGrab, spinoDig, spinoFossil, spinoShed). The fields are set directly here; the
// gameplay that sets them is built separately.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BEAST_SLOT, boneLocalToWorld } from '../src/close-view-beast-rig.ts';
import { SPINO_RIG, SPINO_SKELETON, spinoMesh, spinoHideMesh, spinoBoneMesh, spinoShowsFossil, createSpinoTrack, sampleSpino, spinoBone } from '../src/close-view-beast-spino.ts';
import { SPINO_POSES } from '../src/spino-render.ts';
import { CLOSE_VIEW_BEASTS, closeViewBeastEligible } from '../src/close-view-beasts.ts';
import { MONSTER_PACK } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';

// the beast's own start (monster-pack.ts) sets spinoShed 0; a fossil asked for here without a shed is one already shed (spinoShed 1)
const spino = (flags = {}) => Object.assign(createCombatant('spinoRex', 20, 20, true, []), { id: 'spino-cv', hp: 400, maxHp: 500 }, flags.spinoFossil && !('spinoShed' in flags) ? { spinoShed: 1 } : {}, flags);
const scaleOf = (e) => (e.scale || 1) * SPINO_RIG.closeViewScale;
const env = (e, now, extra = {}) => ({ x: e.x + .5, y: e.y + .82, z: 0, scale: scaleOf(e), now, reduce: false, tier: 'full', target: { x: e.x + 6, y: e.y }, dead: false, ...extra });
const finite = (a) => { for (const v of a) if (!Number.isFinite(v)) return false; return true; };
// run a track for `frames` frames at 60 a second with the attack in `phase` (null: no attack)
function play(e, frames, phase = null, tr = createSpinoTrack(), now0 = 1000, extra = {}) {
  let f = null, now = now0;
  for (let i = 0; i < frames; i++) { now += 1000 / 60; e.pack = phase ? { attack: 'spinoTest', phase, t: 1, seq: 1, data: { aim: { x: 1, y: 0 } } } : null; f = sampleSpino(tr, e, env(e, now, extra)); }
  return { f, tr, now };
}
const angle = (tr, a, b) => { const P = tr.pose, i = SPINO_SKELETON.index[a] * 9, j = SPINO_SKELETON.index[b] * 9, la = Math.hypot(P.wr[i], P.wr[i + 1], P.wr[i + 2]), lb = Math.hypot(P.wr[j], P.wr[j + 1], P.wr[j + 2]);
  return Math.acos(Math.max(-1, Math.min(1, (P.wr[i] * P.wr[j] + P.wr[i + 1] * P.wr[j + 1] + P.wr[i + 2] * P.wr[j + 2]) / la / lb))); };

test('the meshes: hide and bones within the beast slot per tier, valid, cached; registered for spinoRex', () => {
  assert.ok(SPINO_SKELETON.count <= BEAST_SLOT.maxBones, `${SPINO_SKELETON.count} bones`);
  for (const build of [spinoHideMesh, spinoBoneMesh]) {
    let prev = Infinity;
    for (const tier of ['full', 'balanced', 'low']) {
      const m = build(tier);
      assert.ok(m.coreTriangles <= BEAST_SLOT.triangles[tier], `${tier}: ${m.coreTriangles}`); assert.ok(m.coreTriangles < prev); prev = m.coreTriangles;
      for (const i of m.indices) assert.ok(i < m.vertexCount);
      for (let v = 0; v < m.vertexCount; v++) assert.ok(Math.abs(Math.hypot(m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]) - 1) < 1e-3, `${tier} normal ${v}`);
      for (let v = 0; v < m.vertexCount; v++) assert.ok(m.skin[v * 4] < SPINO_SKELETON.count && m.skin[v * 4 + 2] < SPINO_SKELETON.count);
      assert.strictEqual(build(tier), m);
    }
  }
  assert.ok(spinoBoneMesh('full').triangles > spinoBoneMesh('full').coreTriangles, 'the shed pieces are an optional section');
  assert.equal(CLOSE_VIEW_BEASTS.spinoRex.scale, 1.25);
  assert.equal(MONSTER_PACK.spinoRex.render, 'spinoRex');
  assert.ok(closeViewBeastEligible(spino()));
});

test('the hide until it turns; the bones once the shed is under way; the shed pieces fall and are gone', () => {
  const tiers = ['full', 'balanced', 'low'];
  for (const tier of tiers) {
    assert.strictEqual(spinoMesh(tier, spino()), spinoHideMesh(tier));
    assert.strictEqual(spinoMesh(tier, spino({ spinoFossil: true })), spinoBoneMesh(tier));
    assert.strictEqual(spinoMesh(tier, spino({ spinoFossil: true, spinoShed: .05 })), spinoHideMesh(tier), 'the first moment of the shed still shows the hide');
    assert.strictEqual(spinoMesh(tier, spino({ spinoFossil: true, spinoShed: .5 })), spinoBoneMesh(tier));
  }
  assert.equal(spinoShowsFossil(spino({ spinoShed: 1 })), false, 'spinoShed alone does not turn it');
  // through the shed (spinoShed 0 → 1 over 1.5 s): the frame's mesh follows, the pieces show (the optional section) and drop
  const e = spino({ spinoFossil: true, spinoShed: 0 }), tr = createSpinoTrack(); let now = 1000, sawPieces = false, sawFall = false, first = null;
  for (let i = 0; i <= 90; i++) {
    now += 1000 / 60; e.spinoShed = i / 90; const f = sampleSpino(tr, e, env(e, now));
    assert.ok(f && finite(f.skin));
    assert.strictEqual(f.mesh, spinoMesh('full', e));
    const c = SPINO_SKELETON.index.chunkflankR, z = tr.pose.wp[c * 3 + 2];
    if (f.cloud) { sawPieces = true; assert.ok(tr.pose.scl[c] > 0); if (first == null && tr.pose.scl[c] > .5) first = z; if (first != null && z < first - .5) sawFall = true; }
  }
  assert.ok(sawPieces && sawFall, 'pieces of hide show and fall');
  const done = sampleSpino(tr, e, env(e, now + 16));
  assert.equal(done.cloud, false, 'once shed, the pieces are gone');
  assert.strictEqual(done.mesh, spinoBoneMesh('full'));
  for (const [name] of [['chunkflankL'], ['chunksail']]) assert.ok(tr.pose.scl[SPINO_SKELETON.index[name]] < .01, name);
});

test('every pose of the contract, in its windup and its blow, flesh and bone, plays a finite frame', () => {
  for (const fossil of [false, true]) for (const pose of Object.keys(SPINO_POSES)) for (const phase of ['windup', 'active']) {
    const e = spino({ spinoPose: pose, spinoFossil: fossil, spinoAir: pose === 'leap' ? 1.2 : 0, spinoDig: pose === 'dig' ? 1 : 0, spinoGrab: pose.startsWith('grab') ? { who: 'player', phase: 'hold', t: .2 } : null });
    const { f } = play(e, 30, phase);
    assert.ok(f && finite(f.skin), `${pose} ${phase} ${fossil}`);
    assert.ok(f.emitK.every((k) => k >= 0 && k <= 3) && f.emitA.every((a) => a === 0 || a === 1), `${pose}: emissive`);
    for (let i = 0; i < SPINO_SKELETON.count; i++) assert.ok(tr0(f, i), `${pose}: bone ${i}`);
  }
  function tr0(f, i) { return Number.isFinite(f.skin[i * 12 + 3]) && Number.isFinite(f.skin[i * 12 + 7]) && Number.isFinite(f.skin[i * 12 + 11]); }
});

test('the rib spears grow out of the ribcage to the sides, then thrust together to a point ahead of it', () => {
  const S = scaleOf(spino()), tip = (tr, name) => boneLocalToWorld(tr.pose, name, SPINO_RIG.spear, 0, 0);
  const idle = play(spino({ spinoFossil: true }), 40).tr, idleLen = Math.hypot(...tip(idle, 'spear0L').map((v, k) => v - spinoBone(idle, 'spear0L')[k]));
  assert.ok(idleLen < .01 * S, 'hidden at rest');
  const out = play(spino({ spinoFossil: true, spinoPose: 'ribsOut' }), 40, 'active').tr, chest = spinoBone(out, 'chest');
  const l = tip(out, 'spear0L'), r = tip(out, 'spear0R');
  assert.ok(Math.hypot(l[0] - r[0], l[1] - r[1]) > 1.2 * S, `out to the sides (${(Math.hypot(l[0] - r[0], l[1] - r[1]) / S).toFixed(2)})`);
  const th = play(spino({ spinoFossil: true, spinoPose: 'ribsThrust' }), 40, 'active').tr, c2 = spinoBone(th, 'chest');
  const yaw = th.yaw, fw = (p) => (p[0] - c2[0]) * Math.cos(yaw) + (p[1] - c2[1]) * Math.sin(yaw);
  for (const n of ['spear0L', 'spear1L', 'spear0R', 'spear1R']) assert.ok(fw(tip(th, n)) > .8 * S, `${n} thrust ahead (${(fw(tip(th, n)) / S).toFixed(2)})`);
  const a = tip(th, 'spear0L'), b = tip(th, 'spear1R');
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < .35 * S, 'to one point');
  // the hide has no spears: in flesh the pose leaves them hidden
  const flesh = play(spino({ spinoPose: 'ribsOut' }), 40, 'active').tr; assert.ok(flesh.pose.scl[SPINO_SKELETON.index.spear0L] < .01);
  void chest;
});

test('holding its prey: the head lifts and the jaws stay open on it, chewing', () => {
  const idle = play(spino(), 40).tr, hold = play(spino({ spinoPose: 'grabHold', spinoGrab: { who: 'player', phase: 'hold', t: .3 } }), 40, 'active');
  assert.ok(spinoBone(hold.tr, 'head')[2] > spinoBone(idle, 'head')[2] + .15, 'head lifted');
  assert.ok(angle(hold.tr, 'head', 'jaw') > angle(idle, 'head', 'jaw') + .15, `jaw open (${angle(hold.tr, 'head', 'jaw').toFixed(2)})`);
  let lo = Infinity, hi = 0; const e = spino({ spinoPose: 'grabHold', spinoGrab: { who: 'player', phase: 'hold', t: .3 } }); let now = hold.now;
  for (let i = 0; i < 60; i++) { now += 1000 / 60; e.pack = { attack: 'spinoTest', phase: 'active' }; sampleSpino(hold.tr, e, env(e, now)); const a = angle(hold.tr, 'head', 'jaw'); lo = Math.min(lo, a); hi = Math.max(hi, a); }
  assert.ok(hi - lo > .1, 'it chews');
  assert.ok(lo > .1, 'never quite closes on what it holds');
});

test('the strike follows the attack: a bite gapes in the windup and snaps shut on the blow; the dig buries the snout', () => {
  const wind = play(spino({ spinoPose: 'bite' }), 40, 'windup').tr, blow = play(spino({ spinoPose: 'bite' }), 40, 'active').tr;
  assert.ok(angle(wind, 'head', 'jaw') > .6 && angle(blow, 'head', 'jaw') < .15);
  const dig = play(spino({ spinoPose: 'dig', spinoDig: 1 }), 40, 'active').tr, snout = boneLocalToWorld(dig.pose, 'head', .6, 0, 0);
  assert.ok(snout[2] < .05, `snout in the ground (${snout[2].toFixed(2)})`);
  const leap = play(spino({ spinoPose: 'leap', spinoAir: 1.5 }), 40, 'active').tr; assert.ok(spinoBone(leap, 'root')[2] > 1.4, 'spinoAir lifts it');
});

test('it walks on planted feet', () => {
  const e = spino(), tr = createSpinoTrack(); let now = 1000; const S = scaleOf(e); let planted = 0, slid = 0, prev = null;
  for (let i = 0; i < 240; i++) {
    now += 1000 / 60; e.x += 2 / 60; sampleSpino(tr, e, env(e, now));
    const foot = spinoBone(tr, 'footL');
    if (prev && tr.gait.out[3] === 1 && tr.gait.moving > .9) { planted++; if (Math.hypot(foot[0] - prev[0], foot[1] - prev[1]) > .02 * S) slid++; }
    prev = tr.gait.out[3] === 1 ? foot : null;
  }
  assert.ok(planted > 30 && slid < planted * .1, `${slid} of ${planted}`);
});

test('deterministic', () => {
  const run = () => { const out = []; const e = spino({ spinoPose: 'roar' }), tr = createSpinoTrack(); let now = 1000;
    for (let i = 0; i < 90; i++) { now += 1000 / 60; e.x += .01; e.spinoPose = i < 45 ? 'roar' : 'tailL'; e.pack = { attack: 'spinoTest', phase: i % 30 < 15 ? 'windup' : 'active' }; out.push(Array.from(sampleSpino(tr, e, env(e, now)).skin.subarray(0, SPINO_SKELETON.count * 12))); }
    return out; };
  assert.deepEqual(run(), run());
});

test('death: it falls and is gone; reduced motion holds it still', () => {
  for (const fossil of [false, true]) {
    const e = spino({ spinoFossil: fossil }), tr = createSpinoTrack(); let now = 1000;
    let g = sampleSpino(tr, e, env(e, now)), n = 0; while (g && n < 1000) { assert.ok(finite(g.skin)); g = sampleSpino(tr, e, env(e, now += 16, { dead: true })); n++; }
    assert.ok(n < 1000 && g == null, 'it falls and is gone');
  }
  for (const flags of [{}, { spinoPose: 'grabHold' }, { spinoPose: 'roar' }, { spinoFossil: true, spinoShed: .5 }]) {
    const r = createSpinoTrack(), e = spino(flags); sampleSpino(r, e, env(e, 1000, { reduce: true }));
    const a = Array.from(sampleSpino(r, e, env(e, 1016, { reduce: true })).skin); assert.deepEqual(Array.from(sampleSpino(r, e, env(e, 4000, { reduce: true })).skin), a, JSON.stringify(flags));
  }
});
