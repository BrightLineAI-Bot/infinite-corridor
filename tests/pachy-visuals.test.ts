// The Pachycephalosaurus's art (pachy-render.ts, close-view-beast-pachy.ts): the Close View meshes of its four looks (flesh, armor,
// fossil, the rock disguise) within the beast triangle budgets at every tier with fewer triangles each tier down and no degenerate
// triangle; the skeleton within the beast slot; its registry; the pose contract read by both views; the Standard View drawing every
// pose of every form without throwing; and the colours Tim asked for.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pachyFormMesh, pachyMesh, createPachyTrack, samplePachy, PACHY_SKELETON, pachyCloseForm } from '../src/close-view-beast-pachy.ts';
import { BEAST_SLOT } from '../src/close-view-beast-rig.ts';
import { CLOSE_VIEW_BEASTS } from '../src/close-view-beasts.ts';
import { drawPachy, drawPachyGround, drawPachyRock, PACHY_ART, PACHY_POSES, pachyLook } from '../src/pachy-render.ts';
import { pachyPools } from '../src/pachy.ts';

test('Close View: four looks within the beast budgets, fewer triangles each tier down, no degenerate triangle', () => {
  assert.ok(PACHY_SKELETON.count <= BEAST_SLOT.maxBones);
  for (const form of ['flesh', 'armor', 'fossil', 'rock']) { let prev = Infinity;
    for (const tier of ['full', 'balanced', 'low']) { const m = pachyFormMesh(tier, form); assert.ok(m.coreTriangles <= BEAST_SLOT.triangles[tier], `${form} ${tier}: ${m.coreTriangles}`); assert.ok(m.coreTriangles < prev, `${form} ${tier}`); prev = m.coreTriangles;
      const P = m.positions; for (let k = 0; k < m.indices.length; k += 3) { const a = m.indices[k] * 3, b = m.indices[k + 1] * 3, c = m.indices[k + 2] * 3, u = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], w = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
        assert.ok(Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]) > 0, `${form} ${tier} triangle ${k / 3}`); } } }
  assert.ok(CLOSE_VIEW_BEASTS.pachy && CLOSE_VIEW_BEASTS.pachy.mesh === pachyMesh);
});

test('the mesh follows the form: the rock while disguised, the armor once its plating has mostly closed, the bone once its flesh has mostly fallen', () => {
  assert.equal(pachyCloseForm({ pachyDisguised: true }), 'rock'); assert.equal(pachyCloseForm({ pachyForm: 'armor', pachyShift: .2 }), 'flesh'); assert.equal(pachyCloseForm({ pachyForm: 'armor', pachyShift: .6 }), 'armor');
  assert.equal(pachyCloseForm({ pachyForm: 'fossil', pachyShift: .4 }), 'flesh'); assert.equal(pachyCloseForm({ pachyForm: 'fossil', pachyShift: .6 }), 'fossil');
  assert.deepEqual(pachyLook({ pachyForm: 'fossil', pachyShift: 1 }), { form: 'fossil', k: 1 });
});

test('Close View sampling: every pose of the contract, one frame record reused (no allocation per frame), poses differ', () => {
  const tr = createPachyTrack(), seen = new Set(); let frame = null, n = 0;
  for (const pose of Object.keys(PACHY_POSES)) for (const form of ['flesh', 'armor', 'fossil']) {
    const f = samplePachy(tr, { id: 'p', kind: 'pachy', hp: 1, maxHp: 1, pachyPose: pose === 'idle' || pose === 'walk' ? null : pose, pachyForm: form, pachyShift: 1, pachyAir: pose === 'air' ? 1 : 0, pachyDisguised: pose === 'rock' }, { x: 0, y: 0, z: 0, scale: 2, now: 1000 + (n++) * 400, tier: 'full', reduce: true });
    assert.ok(f && f.skin.every(Number.isFinite), `${pose} ${form}`); if (frame) assert.equal(f, frame); frame = f; seen.add(Array.from(f.skin.slice(0, 120)).map((v) => v.toFixed(3)).join()); }
  assert.ok(seen.size > 10, `${seen.size} distinct poses`);
});

// a canvas that records nothing but must be called right
function stubCtx() { const noop = () => {}; return new Proxy({ globalAlpha: 1 }, { get: (t, k) => k in t ? t[k] : noop, set: (t, k, v) => { t[k] = v; return true; } }); }
test('Standard View: every pose of every form draws; the rock; the ground pools', () => {
  const ctx = stubCtx();
  for (const pose of Object.keys(PACHY_POSES)) for (const form of ['flesh', 'armor', 'fossil']) {
    const e = { id: `p:${pose}:${form}`, kind: 'pachy', x: 3, y: 4, hp: 1, maxHp: 1, scale: 1.8, pachyPose: pose, pachyForm: form, pachyShift: .7, pachyAir: .5 };
    assert.ok(drawPachy(ctx, { k: 100, b: 100, u: 60, s: 32, t: 1, flip: -1, e }, 1000)); }
  assert.ok(drawPachyRock(ctx, 0, 0, 40, 1)); assert.ok(drawPachy(ctx, { k: 0, b: 0, u: 40, s: 32, t: 0, flip: 1, e: { id: 'r', kind: 'pachy', pachyDisguised: true } }, 0));
  const e = { id: 'g', kind: 'pachy' }; pachyPools(e); e.pachyFx.rocks[0].on = true; e.pachyFx.skulls[0].on = true; e.pachyFx.bones[0].on = true; e.pachyFx.waves[0].on = true; e.pachyFx.bones[0].warn = .5;
  assert.ok(drawPachyGround(ctx, e, 32, 1000)); assert.equal(drawPachyGround(ctx, { kind: 'pachy' }, 32, 0), false);
});

test('the look Tim asked for: green over a gray belly, a yellow head and dome with gray knobs, a black stripe, a gray snout and mouth', () => {
  const g = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), A = PACHY_ART;
  const [r, gr, b] = g(A.body); assert.ok(gr > r && gr > b, 'green');
  for (const k of ['belly', 'knob', 'snout', 'mouth']) { const [x, y, z] = g(A[k]); assert.ok(Math.max(x, y, z) - Math.min(x, y, z) < 16, `${k} gray`); }
  const [hr, hg, hb] = g(A.head); assert.ok(hr > 200 && hg > 170 && hb < 90, 'yellow head'); const [sr, sg, sb] = g(A.stripe); assert.ok(sr + sg + sb < 80, 'black stripe');
});
