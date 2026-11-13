// The Wild Stegosaurus's Close View body (src/close-view-beast-stego.ts on the shared beast rig) and its standard-view drawing
// (src/wild-stego-render.ts): bounded meshes with unit normals, every contract pose finite, the wheel's curl, the plates
// regrowing, the cut tail, swimming low, the climb, determinism, death and Reduced Motion. The poses are driven by setting the
// contract fields directly (e.stegoPose, stegoAir, stegoRoll, stegoSwim, stegoTail, stegoTree, stegoPlates, stegoClimb,
// stegoClimbDir), never by attack modules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BEAST_SLOT, boneLocalToWorld } from '../src/close-view-beast-rig.ts';
import { STEGO_RIG, STEGO_SKELETON, stegoMesh, createStegoTrack, sampleStego, stegoBone } from '../src/close-view-beast-stego.ts';
import { STEGO_POSES } from '../src/wild-stego-render.ts';
import { CLOSE_VIEW_BEASTS, closeViewBeastEligible } from '../src/close-view-beasts.ts';
import { MONSTER_PACK } from '../src/monster-pack.ts';
import { drawPackMonster } from '../src/monster-render.ts';
import { createCombatant } from '../src/combat.ts';

const SCALE = MONSTER_PACK.wildStego.form.scale * STEGO_RIG.closeViewScale;
const env = (e, now, extra = {}) => ({ x: e.x + .5, y: e.y + .82, z: 0, scale: SCALE, now, reduce: false, tier: 'full', target: { x: e.x + 6, y: e.y }, dead: false, ...extra });
const finite = (a) => { for (const v of a) if (!Number.isFinite(v)) return false; return true; };
const POSES = Object.keys(STEGO_POSES).filter((n) => n !== 'dead');
const FEET = ['footHL', 'footFL', 'footHR', 'footFR'];
function stego(flags = {}) { const e = createCombatant('wildStego', 10, 10, true, []); Object.assign(e, { id: 'stego-test', hp: 1000, maxHp: 1000 }, flags); return e; }
// hold a pose for a while; returns the track and the last frame
function hold(flags, frames = 60, extra = {}, tr = createStegoTrack(), e = stego(flags), t0 = 1000) {
  let f = null, now = t0; for (let i = 0; i < frames; i++) f = sampleStego(tr, e, env(e, now += 16, extra)); return { tr, f, e, now };
}

test('the mesh: bounded per tier, unit normals, valid indices, cached; registered in the roster', () => {
  assert.ok(STEGO_SKELETON.count <= BEAST_SLOT.maxBones, `${STEGO_SKELETON.count} bones`);
  let prev = Infinity;
  for (const tier of ['full', 'balanced', 'low']) {
    const m = stegoMesh(tier);
    assert.ok(m.coreTriangles <= BEAST_SLOT.triangles[tier], `${tier}: ${m.coreTriangles}`); assert.ok(m.coreTriangles < prev); prev = m.coreTriangles;
    for (const i of m.indices) assert.ok(i < m.vertexCount);
    for (let v = 0; v < m.vertexCount; v++) {
      assert.ok(m.skin[v * 4] < STEGO_SKELETON.count && m.skin[v * 4 + 2] < STEGO_SKELETON.count);
      assert.ok(Math.abs(Math.hypot(m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]) - 1) < 1e-3, `${tier} normal ${v}`);
    }
    for (let k = 0; k < m.indices.length; k += 3) { // no degenerate triangles
      const p = (i) => [m.positions[i * 3], m.positions[i * 3 + 1], m.positions[i * 3 + 2]], a = p(m.indices[k]), b = p(m.indices[k + 1]), c = p(m.indices[k + 2]);
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      assert.ok(Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]) > 0, `${tier} triangle ${k / 3}`);
    }
    assert.strictEqual(stegoMesh(tier), m);
  }
  assert.equal(CLOSE_VIEW_BEASTS.wildStego.scale, 1.25);
  assert.ok(closeViewBeastEligible(stego()));
  assert.equal(MONSTER_PACK.wildStego.render, 'wildStego');
});

test('standing: four feet on the ground, plates above the back, buffers reused', () => {
  const e = stego(), tr = createStegoTrack(); let f0 = null;
  for (let i = 0; i < 60; i++) { const f = sampleStego(tr, e, env(e, 1000 + i * 16)); if (f0) { assert.strictEqual(f, f0); assert.strictEqual(f.skin, f0.skin); } f0 = f; }
  assert.ok(finite(f0.skin));
  for (const n of FEET) assert.ok(stegoBone(tr, n)[2] < .12 * SCALE, `${n} on the ground`);
  assert.ok(stegoBone(tr, 'plate3')[2] > stegoBone(tr, 'pelvis')[2], 'the plates stand on the back');
  assert.ok(stegoBone(tr, 'head')[2] < stegoBone(tr, 'pelvis')[2], 'the small head carried low');
});

test('walking: planted feet never slide', () => {
  const e = stego(), tr = createStegoTrack(); let now = 1000, checked = 0; const last = [null, null, null, null];
  for (let i = 0; i < 220; i++) {
    e.x += 1.4 / 60; now += 1000 / 60; sampleStego(tr, e, env(e, now));
    if (i < 40) continue;
    for (let k = 0; k < 4; k++) { const p = stegoBone(tr, FEET[k]), planted = tr.frame.feet[k * 2] === 1;
      if (planted && last[k]) { assert.ok(Math.hypot(p[0] - last[k][0], p[1] - last[k][1]) < 2e-3, `${FEET[k]} holds`); checked++; }
      last[k] = planted ? p : null; }
  }
  assert.ok(checked > 100, `${checked} planted frames`);
});

test('every contract pose (and its flags) gives a finite frame on every tier', () => {
  const extras = { leap: { stegoAir: 1.5 }, breach: { stegoAir: 1.8, stegoSwim: 1 }, dive: { stegoSwim: 1 }, roll: { stegoRoll: 1 }, curl: { stegoRoll: .5 },
    climb: { stegoClimb: .8, stegoClimbDir: { x: 0, y: -1 } }, launch: { stegoPlates: .1 }, shake: { stegoTree: { phase: 'pull', treeX: 0, treeY: 0 } },
    swingL: { stegoTree: { phase: 'swing', treeX: 0, treeY: 0 } }, swingR: { stegoTree: { phase: 'swing', treeX: 0, treeY: 0 } } };
  for (const tier of ['full', 'balanced', 'low']) for (const name of POSES) for (const flags of [{}, { stegoSwim: 2 }, { stegoTail: 'cut' }]) {
    const { f } = hold({ stegoPose: name, ...(extras[name] || {}), ...flags }, 24, { tier });
    assert.ok(f && finite(f.skin), `${tier} ${name} ${JSON.stringify(flags)}`); assert.equal(f.mesh, stegoMesh(tier));
    assert.ok(f.emitK.every((k) => k >= 0 && k <= 3) && f.alpha > 0);
  }
});

test('the wheel: it curls into a ring rolling on its plates and spikes, and the ring turns as it goes', () => {
  const { tr } = hold({ stegoPose: 'roll', stegoRoll: 1 }, 60), head = stegoBone(tr, 'head'), tip = stegoBone(tr, 'tail5'), pelvis = stegoBone(tr, 'pelvis');
  assert.ok(Math.hypot(head[0] - tip[0], head[1] - tip[1], head[2] - tip[2]) < .7 * SCALE, 'head and tail meet round the ring');
  const ring = (n) => { const p = stegoBone(tr, n); return p; }, z = ['pelvis', 'chest', 'neck2', 'tail2', 'tail4'].map((n) => ring(n)[2]);
  assert.ok(Math.max(...z) - Math.min(...z) > .3 * SCALE, 'the body stands as a wheel, not lying flat');
  assert.ok(Math.min(...z) > 0, 'above the ground');
  // rolling along: the same bone moves round the centre
  const e = stego({ stegoPose: 'roll', stegoRoll: 1 }), t2 = createStegoTrack(); let now = 1000; const seen = [];
  for (let i = 0; i < 90; i++) { e.x += 3 / 60; sampleStego(t2, e, env(e, now += 16)); if (i % 30 === 29) seen.push(stegoBone(t2, 'pelvis')[2]); }
  assert.ok(Math.max(...seen) - Math.min(...seen) > .1 * SCALE, `the ring turns ${seen.map((v) => v.toFixed(2))}`);
  void pelvis;
});

test('the plates launch and regrow: their size follows stegoPlates', () => {
  const size = (plates) => { const { tr } = hold({ stegoPose: 'launch', stegoPlates: plates }, 30); const i = STEGO_SKELETON.index.plate3; return Math.hypot(tr.pose.wr[i * 9], tr.pose.wr[i * 9 + 1], tr.pose.wr[i * 9 + 2]); };
  const gone = size(0), half = size(.5), full = size(1);
  assert.ok(gone < half && half < full, `${gone.toFixed(3)} < ${half.toFixed(3)} < ${full.toFixed(3)}`);
  assert.ok(gone / full < .2 && gone > 0, 'stubs stay when launched');
  const def = hold({}, 10); const i = STEGO_SKELETON.index.plate3; assert.ok(Math.abs(Math.hypot(def.tr.pose.wr[i * 9], def.tr.pose.wr[i * 9 + 1], def.tr.pose.wr[i * 9 + 2]) - full) < 1e-9, 'no field: whole plates');
});

test('the cut tail: a stump, no tail beyond it and no spikes', () => {
  const whole = hold({}, 20).tr, cut = hold({ stegoTail: 'cut' }, 20).tr, S = (tr, n) => { const i = STEGO_SKELETON.index[n]; return Math.hypot(tr.pose.wr[i * 9], tr.pose.wr[i * 9 + 1], tr.pose.wr[i * 9 + 2]); };
  assert.ok(S(cut, 'tail5') < .01 * SCALE && S(cut, 'tail3') < .01 * SCALE, 'the end of the tail is gone');
  assert.ok(S(cut, 'stump') > .9 * SCALE && S(whole, 'stump') < .01 * SCALE, 'the stump shows only when cut');
  assert.ok(S(whole, 'tail5') > .9 * SCALE);
});

test('swimming low: only the plates break the water; standing on it, it stands; diving goes under', () => {
  const swim = hold({ stegoSwim: 1 }, 200).tr, top = (tr) => { const P = tr.pose, p = boneLocalToWorld(P, 'plate3', 0, 0, .3); return p[2]; };
  for (const n of ['pelvis', 'chest', 'head', 'tail3', ...FEET]) assert.ok(stegoBone(swim, n)[2] < 0, `${n} under the water`);
  assert.ok(top(swim) > 0, 'the plates break the surface like fins');
  assert.equal(hold({ stegoSwim: 1 }, 200).f.shadow, 0);
  const stand = hold({ stegoSwim: 2 }, 60).tr; for (const n of FEET) assert.ok(stegoBone(stand, n)[2] < .12 * SCALE && stegoBone(stand, n)[2] > -.01, `${n} on the surface`);
  const dive = hold({ stegoPose: 'dive', stegoSwim: 1 }, 200).tr; assert.ok(stegoBone(dive, 'head')[2] < stegoBone(dive, 'pelvis')[2]);
  const breach = hold({ stegoPose: 'breach', stegoSwim: 1, stegoAir: 1.8 }, 60).tr; assert.ok(stegoBone(breach, 'pelvis')[2] > 1.5, 'the breach leaves the water');
});

test('the climb: pitched up the wall along stegoClimbDir, claws alternating', () => {
  const dir = { x: 0, y: -1 }, { tr } = hold({ stegoPose: 'climb', stegoClimb: 1, stegoClimbDir: dir }, 90), head = stegoBone(tr, 'head'), pelvis = stegoBone(tr, 'pelvis');
  assert.ok(head[2] > pelvis[2] + .3 * SCALE, 'nose up the wall');
  assert.ok((head[0] - pelvis[0]) * dir.x + (head[1] - pelvis[1]) * dir.y > 0, 'facing the wall');
  assert.ok(Math.abs(tr.yaw - Math.atan2(dir.y, dir.x)) < .05);
  // the forefeet hook in by turns
  const e = stego({ stegoPose: 'climb', stegoClimb: 1, stegoClimbDir: dir }), t2 = createStegoTrack(); let now = 1000; const L = [], R = [];
  for (let i = 0; i < 120; i++) { sampleStego(t2, e, env(e, now += 16)); if (i > 30) { L.push(stegoBone(t2, 'footFL')[2]); R.push(stegoBone(t2, 'footFR')[2]); } }
  const range = (a) => Math.max(...a) - Math.min(...a), corr = L.reduce((s, v, i) => s + (v - L[0]) * (R[i] - R[0]), 0);
  assert.ok(range(L) > .02 && range(R) > .02, 'the claws move'); assert.ok(corr < 0, 'left and right alternate');
});

test('the tree club: the tree shows only while it wields one', () => {
  const S = (tr) => { const i = STEGO_SKELETON.index.tree; return Math.hypot(tr.pose.wr[i * 9], tr.pose.wr[i * 9 + 1], tr.pose.wr[i * 9 + 2]); };
  assert.ok(S(hold({ stegoPose: 'bite', stegoTree: { phase: 'grab', treeX: 0, treeY: 0 } }, 10).tr) < .01, 'not while it grabs (the world tree still stands)');
  assert.ok(S(hold({ stegoPose: 'shake', stegoTree: { phase: 'pull', treeX: 0, treeY: 0 } }, 10).tr) > .9 * SCALE);
  const l = hold({ stegoPose: 'swingL', stegoTree: { phase: 'swing', treeX: 0, treeY: 0 } }, 40).tr, r = hold({ stegoPose: 'swingR', stegoTree: { phase: 'swing', treeX: 0, treeY: 0 } }, 40).tr;
  const tip = (tr) => boneLocalToWorld(tr.pose, 'tree', 1.2, 0, 0); assert.ok(tip(l)[2] > tip(r)[2] + .5, 'up for the sweep, down for the slam');
  assert.ok(S(hold({}, 10).tr) < .01);
});

test('poses that change the body: the tail whack swings sideways, the rear lifts the forefeet, the leap tucks them', () => {
  const side = (n) => { const { tr } = hold({ stegoPose: n }, 40), tip = stegoBone(tr, 'tail5'), p = stegoBone(tr, 'pelvis'), y = tr.yaw; return (tip[0] - p[0]) * -Math.sin(y) + (tip[1] - p[1]) * Math.cos(y); };
  assert.ok(Math.sign(side('tailL')) !== Math.sign(side('tailR')) && Math.abs(side('tailL')) > .3, 'the whack swings to either side');
  const rear = hold({ stegoPose: 'rear' }, 40).tr; assert.ok(stegoBone(rear, 'footFL')[2] > .3 * SCALE && stegoBone(rear, 'footHL')[2] < .12 * SCALE, 'reared on its hind legs');
  const slam = hold({ stegoPose: 'tailSlam' }, 40).tr; assert.ok(stegoBone(slam, 'tail5')[2] > stegoBone(slam, 'pelvis')[2] + .2 * SCALE, 'the tail up over the back');
  const leap = hold({ stegoPose: 'leap', stegoAir: 1.5 }, 40).tr; assert.ok(stegoBone(leap, 'footHL')[2] > 1, 'aloft');
});

test('deterministic', () => {
  const run = () => { const out = []; const e = stego(), tr = createStegoTrack(); let now = 1000; const seq = ['idle', 'bite', 'tailL', 'roll', 'launch', 'rear', 'climb', 'graze'];
    for (let i = 0; i < 240; i++) { e.stegoPose = seq[Math.floor(i / 30)]; e.stegoRoll = e.stegoPose === 'roll' ? 1 : 0; e.stegoClimb = e.stegoPose === 'climb' ? 1 : 0; e.stegoClimbDir = { x: 1, y: 0 }; e.x += .01;
      out.push(Array.from(sampleStego(tr, e, env(e, now += 16)).skin.subarray(0, STEGO_SKELETON.count * 12))); }
    return out; };
  assert.deepEqual(run(), run());
});

test('death fells it and ends; reduced motion holds still', () => {
  const e = stego(), tr = createStegoTrack(); let now = 1000, g = sampleStego(tr, e, env(e, now)), n = 0, lowest = Infinity;
  while (g && n < 1000) { g = sampleStego(tr, e, env(e, now += 16, { dead: true })); if (g) { lowest = Math.min(lowest, stegoBone(tr, 'pelvis')[2]); assert.ok(finite(g.skin)); } n++; }
  assert.equal(g, null); assert.ok(n * 16 >= STEGO_RIG.deathMs - 32 && n < 400, `${n} frames`); assert.ok(lowest < .74 * SCALE, 'it sinks');
  for (const flags of [{}, { stegoPose: 'roll', stegoRoll: 1 }, { stegoPose: 'climb', stegoClimb: 1, stegoClimbDir: { x: 1, y: 0 } }, { stegoSwim: 1 }, { stegoPose: 'shake', stegoTree: { phase: 'pull' } }]) {
    const r = createStegoTrack(), e2 = stego(flags); sampleStego(r, e2, env(e2, 1000, { reduce: true }));
    const a = Array.from(sampleStego(r, e2, env(e2, 1016, { reduce: true })).skin);
    assert.deepEqual(Array.from(sampleStego(r, e2, env(e2, 5000, { reduce: true })).skin), a, JSON.stringify(flags));
  }
});

// ------------------------------------------------------------------------------------------------ the standard view
function mockCtx() {
  let calls = 0; const grad = { addColorStop() {} };
  const ctx = new Proxy({}, { get(t, k) {
    if (k === 'calls') return calls;
    if (k in t) return t[k];
    if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
    if (k === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
    if (k === 'measureText') return () => ({ width: 10 });
    return (...args) => { calls++; for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) throw new Error(`${String(k)}: non-finite argument`); };
  }, set(t, k, v) { t[k] = v; return true; } });
  return ctx;
}
test('standard view: drawPackMonster draws wildStego in every pose and flag without throwing', () => {
  const flagsets = [{}, { stegoSwim: 1 }, { stegoSwim: 2 }, { stegoTail: 'cut' }, { stegoPlates: 0 }, { stegoRoll: 1 }, { stegoAir: 2 }, { stegoClimb: 1, stegoClimbDir: { x: -1, y: 0 } },
    { stegoTree: { phase: 'pull', treeX: 0, treeY: 0 } }, { stegoTree: { phase: 'swing', treeX: 0, treeY: 0 } }, { poiseBreak: .7 }, { hitFlash: .8 }, { reduceMotion: true }, { dead: true, hp: 0 }];
  let n = 0;
  for (const name of [...POSES, 'walk', undefined]) for (const flags of flagsets) {
    const e = stego({ stegoPose: name, ...flags, id: `s2d-${n++}` }), ctx = mockCtx();
    for (let i = 0; i < 4; i++) { e.x += .02; assert.equal(drawPackMonster(ctx, e, 32, 1000 + i * 16, i % 2 ? 'left' : 'right'), true, `${name} ${JSON.stringify(flags)}`); }
    assert.ok(ctx.calls > 50, `${name}: it drew`);
  }
});
test('standard view: Reduced Motion holds the drawing still', () => {
  const record = () => { const out = []; const ctx = new Proxy({}, { get(t, k) { if (k in t) return t[k]; if (k === 'createLinearGradient' || k === 'createRadialGradient') return (...a) => { out.push(String(k), ...a); return { addColorStop() {} }; }; if (k === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1 }); return (...a) => { out.push(String(k), ...a.map((v) => typeof v === 'number' ? Math.round(v * 1e6) : typeof v)); }; }, set(t, k, v) { t[k] = v; return true; } }); return { ctx, out }; };
  for (const flags of [{}, { stegoPose: 'roll', stegoRoll: 1 }, { stegoSwim: 1 }, { stegoPose: 'climb', stegoClimb: 1, stegoClimbDir: { x: 1, y: 0 } }, { stegoPose: 'launch', stegoPlates: .3 }]) {
    const e = stego({ ...flags, reduceMotion: true, id: 'rm-' + JSON.stringify(flags) }), a = record(), b = record();
    drawPackMonster(record().ctx, e, 32, 1000, 'right'); drawPackMonster(a.ctx, e, 32, 1016, 'right'); drawPackMonster(b.ctx, e, 32, 7000, 'right');
    assert.deepEqual(b.out, a.out, JSON.stringify(flags));
  }
});
