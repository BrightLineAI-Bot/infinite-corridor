// Tim (2026-11-26): both Wayfarers stood "hunched from the hips with knees bent, as if slightly squatting, with a curved
// back"; standing idle they now stand up straight (HERO_STAND), feet planted; walking and running fade it out with the idle, and
// an action that plays its own clip owns the body as before.
// And the female Wayfarer's bust is "slightly fuller... easy to tell she's a woman just by looking at her, but not
// exaggerated" (HERO_FEMALE.sculpt.bust), with the braid and kit still resting on it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodeCloseViewHero, closeViewHeroBodyAsset, createHeroPoseState, createHeroFrame, sampleCloseViewHero, HERO_STAND, HERO_FEMALE, HERO_BRAID, HERO_BODY_TRIANGLES } from '../src/close-view-hero.ts';
import { CLOSE_VIEW_WAYFARER_KIT } from '../src/close-view-player-forms.ts';

const meta = JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json', import.meta.url), 'utf8'));
const file = fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin', import.meta.url));
const male = decodeCloseViewHero(meta, file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)), female = closeViewHeroBodyAsset(male, 'female');
const BODIES = [['female', female], ['male', male]] as const;
const HEIGHT = 1.3776;
const input = (extra = {}) => ({ nowMs: 0, reducedMotion: true, x: 0, y: 0, groundZ: 0, liftZ: 0, yaw: 0, height: HEIGHT, speed: 0, gaitPhase: 0, action: null, alpha: 1, tint: [1, 1, 1], hitFlash: 0, ...extra });
const sample = (asset: any, extra = {}, state: any = createHeroPoseState(asset), frame: any = createHeroFrame(asset)) => { assert.ok(sampleCloseViewHero(asset, state, input(extra), frame)); return { state, frame }; };
const P = (g: Float64Array, n: number) => [g[n * 16 + 12], g[n * 16 + 13], g[n * 16 + 14]];
const DEG = 180 / Math.PI;
const lean = (a: number[], b: number[]) => Math.atan2(b[2] - a[2], b[1] - a[1]) * DEG; // a -> b from straight up, + forward
const bend = (a: number[], b: number[], c: number[]) => { const u = a.map((x, i) => x - b[i]), v = c.map((x, i) => x - b[i]); return 180 - Math.acos((u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / Math.hypot(...u) / Math.hypot(...v)) * DEG; };
const heights = (f: any) => { let lo = Infinity, hi = -Infinity; for (let i = 0; i < f.positionsNormals.length; i += 6) { lo = Math.min(lo, f.positionsNormals[i + 2]); hi = Math.max(hi, f.positionsNormals[i + 2]); } return [lo, hi]; };
// Idle samples through the clip: the reduced-motion reference and four points of the breathing idle.
const IDLE = [[0, true], [400, false], [1100, false], [1900, false], [2700, false]] as const;

test('standing idle, both bodies: straight knees and thighs, hips under the shoulders, a straight back and the head up', () => {
  // Before (release 1076, the same samples): knees 21-29°, thighs 9.5-13.7° off vertical, hips-to-neck 4.5-6°,
  // abdomen-to-neck 9.5-11.2°, chest-to-neck 8.4-11.2°, the head 4.5-5.7% of the height ahead of the ankles.
  for (const [body, asset] of BODIES) for (const [nowMs, reducedMotion] of IDLE) {
    const { state } = sample(asset, { nowMs, reducedMotion }), g = state.global, at = `${body} at ${nowMs}`;
    const hips = P(g, 30).map((x, i) => (x + P(g, 32)[i]) / 2), ankles = P(g, 1).map((x, i) => (x + P(g, 36)[i]) / 2);
    const knee = Math.max(bend(P(g, 30), P(g, 29), P(g, 1)), bend(P(g, 32), P(g, 31), P(g, 36)));
    assert.ok(knee < 10, `${at}: knees nearly straight (${knee.toFixed(1)}°)`);
    for (const [hip, kneeNode] of [[30, 29], [32, 31]]) { const t = 180 - Math.abs(lean(P(g, hip), P(g, kneeNode))); assert.ok(t < 4, `${at}: thigh upright (${t.toFixed(1)}°)`); }
    assert.ok(Math.abs(lean(hips, P(g, 4))) < 3, `${at}: hips under the shoulders (${lean(hips, P(g, 4)).toFixed(1)}°)`);
    assert.ok(Math.abs(lean(P(g, 27), P(g, 4))) < 6, `${at}: the back straight (${lean(P(g, 27), P(g, 4)).toFixed(1)}°)`);
    assert.ok(Math.abs(lean(P(g, 24), P(g, 4))) < 4.5, `${at}: the chest upright (${lean(P(g, 24), P(g, 4)).toFixed(1)}°)`);
    const head = (P(g, 3)[2] - ankles[2]) / state.referenceHeight;
    assert.ok(Math.abs(head) < .015, `${at}: head up over the feet (${head.toFixed(3)} of the height)`);
  }
});

test('the feet stay planted on groundZ and the standing height rises only slightly; the pose is the same for every body', () => {
  for (const [body, asset] of BODIES) {
    // The boots' soles (every vertex wholly on a foot bone) are exactly where the source Idle put them, which a new pose state holds.
    const skin = asset.skins[0], ref = createHeroPoseState(asset), { state } = sample(asset); let soles = 0;
    for (let v = 0; v < asset.vertexCount; v++) { let w = 0; for (let k = 0; k < 4; k++) { const n = skin.joints[asset.arrays.joints[v * 4 + k]]; if (n === 1 || n === 36) w += asset.arrays.weights[v * 4 + k]; }
      if (w < 1 - 1e-6) continue; soles++; for (let k = 0; k < 3; k++) assert.ok(Math.abs(state.vertices[v * 6 + k] - ref.vertices[v * 6 + k]) < 1e-9, `${body}: the boot ${v} has not moved`); }
    assert.ok(soles >= 20, `${body}: boot vertices (${soles})`);
    for (const [nowMs, reducedMotion] of IDLE) {
      const { frame } = sample(asset, { nowMs, reducedMotion, groundZ: .3 }), [lo, hi] = heights(frame);
      // The lowest point is the boot sole, on the ground; a heel crease that dipped 1 mm under it (min exactly .3 before) no longer does.
      assert.ok(lo >= .3 - 1e-4 && lo < .3 + .0011, `${body} at ${nowMs}: soles on the ground (${lo})`);
      // Was 1.366-1.3776 through the idle; standing straight it is 1.394-1.396 (about 1.3% taller), well under 2%.
      assert.ok(hi - .3 > HEIGHT && hi - .3 < HEIGHT * 1.02, `${body} at ${nowMs}: standing height ${hi - .3}`);
    }
  }
  const her = sample(female).state, him = sample(male).state, wide = sample(male, {}, createHeroPoseState(male, { width: 1, depth: 1, hands: 1 })).state;
  assert.deepEqual(her.pose, him.pose, 'solved on the source skeleton: one stance for both bodies');
  assert.deepEqual(wide.pose, him.pose, 'and for any proportions');
  assert.deepEqual(Object.keys(HERO_STAND), ['legs', 'spine', 'chest', 'neck']); assert.ok(Object.isFrozen(HERO_STAND));
  assert.ok(female.indexCount / 3 <= HERO_BODY_TRIANGLES); assert.equal(male.indexCount, meta.indexCount);
});

test('walking and running fade the stance out continuously; from 1.6 tiles/s the gait owns the body', () => {
  for (const [body, asset] of BODIES) {
    let last: Float32Array | null = null, worst = 0;
    for (let speed = 0; speed <= 2.0001; speed += .05) {
      const { state, frame } = sample(asset, { speed, gaitPhase: 1.3 }), p = Float32Array.from(frame.positionsNormals);
      assert.equal(state.standShare, speed < 1.6 ? 1 - speed / 1.6 : 0);
      if (last) for (let i = 0; i < p.length; i += 6) worst = Math.max(worst, Math.hypot(p[i] - last[i], p[i + 1] - last[i + 1], p[i + 2] - last[i + 2]));
      last = p;
    }
    assert.ok(worst < .03, `${body}: no pop through the walk blend (${worst.toFixed(4)} a step of .05 tiles/s)`);
  }
});

test('an action that plays its own clip owns the body: a dodge at full weight is the same whatever stance it started from', () => {
  for (const [body, asset] of BODIES) for (const phase of [.3, .5]) {
    const action = { kind: 'dodge', profile: 'roll', phase, poseMs: 1000, durationMs: 260, yaw: 0, moveX: 1, moveY: 0 };
    const standing = sample(asset, { nowMs: 1000, action }), walking = sample(asset, { nowMs: 1000, speed: .8, gaitPhase: 1.3, action });
    assert.equal(standing.state.standShare, 1); assert.equal(walking.state.standShare, .5);
    assert.deepEqual(Array.from(standing.frame.positionsNormals), Array.from(walking.frame.positionsNormals), `${body}: the roll at ${phase}`);
  }
});

// Torso-local front of the body's skinned vertices (|x| < .22): the chest band and the waist below it.
function frontProfile(asset: any, state: any) {
  const g = state.global, t = 24 * 16, V = state.vertices; let chest = -Infinity, waist = -Infinity;
  for (const m of asset.meta.meshes) { if (m.skin < 0 || m.procedural) continue; for (let v = m.firstVertex; v < m.firstVertex + m.vertexCount; v++) {
    const dx = V[v * 6] - g[t + 12], dy = V[v * 6 + 1] - g[t + 13], dz = V[v * 6 + 2] - g[t + 14];
    const x = g[t] * dx + g[t + 1] * dy + g[t + 2] * dz, y = g[t + 4] * dx + g[t + 5] * dy + g[t + 6] * dz, z = g[t + 8] * dx + g[t + 9] * dy + g[t + 10] * dz; if (Math.abs(x) > .22) continue;
    if (y > .15 && y < .32) chest = Math.max(chest, z); if (y > -.15 && y < -.05) waist = Math.max(waist, z); } }
  return { chest, waist, projection: chest - waist };
}
// The body's front surface (torso-local +Z) under a point, by its rendered triangles.
function surface(asset: any, state: any) {
  const g = state.global, t = 24 * 16, V = state.vertices, I = asset.arrays.indices, end = asset.braid ? asset.braid.firstVertex : Infinity, tris: number[][] = [];
  const local = (x: number, y: number, z: number) => { const dx = x - g[t + 12], dy = y - g[t + 13], dz = z - g[t + 14]; return [g[t] * dx + g[t + 1] * dy + g[t + 2] * dz, g[t + 4] * dx + g[t + 5] * dy + g[t + 6] * dz, g[t + 8] * dx + g[t + 9] * dy + g[t + 10] * dz]; };
  for (let i = 0; i < asset.indexCount; i += 3) { if (I[i] >= end) continue; tris.push([0, 1, 2].flatMap(k => local(V[I[i + k] * 6], V[I[i + k] * 6 + 1], V[I[i + k] * 6 + 2]))); }
  return { local, at(u: number, w: number) { let best = -Infinity; for (const p of tris) { const den = (p[4] - p[7]) * (p[0] - p[6]) + (p[6] - p[3]) * (p[1] - p[7]); if (Math.abs(den) < 1e-12) continue;
    const l0 = ((p[4] - p[7]) * (u - p[6]) + (p[6] - p[3]) * (w - p[7])) / den, l1 = ((p[7] - p[1]) * (u - p[6]) + (p[0] - p[6]) * (w - p[7])) / den, l2 = 1 - l0 - l1;
    if (l0 >= 0 && l1 >= 0 && l2 >= 0) best = Math.max(best, l0 * p[2] + l1 * p[5] + l2 * p[8]); } return best; } };
}

test('her bust is fuller than before but bounded, natural and on the front of the upper chest only', () => {
  const her = frontProfile(female, sample(female).state), him = frontProfile(male, sample(male).state);
  // Before (release 1076): her chest stood .0153 ahead of her waist, his .0139 (model units, the body ~2.29 tall): flat.
  assert.ok(her.projection > him.projection + .03, `fuller: hers ${her.projection.toFixed(4)} vs his ${him.projection.toFixed(4)}`);
  assert.ok(her.projection > .04 && her.projection < .08, `but not exaggerated (${her.projection.toFixed(4)}; about 4-5 cm on a 1.68 m figure)`);
  assert.ok(Math.abs(her.waist - him.waist) < .01, 'the waist below it is not pushed out');
  const B = HERO_FEMALE.sculpt.bust; assert.ok(Object.isFrozen(B) && B.depth > 0 && B.depth <= .06 && B.tuck > 0 && B.tuck < B.depth && B.from < B.to);
});

test('the braid and the Wayfarer kit rest on the fuller chest without sinking into it or floating off it', () => {
  const { state } = sample(female, { wayfarerKit: true }), S = surface(female, state), P8 = state.braid.points;
  const lie = HERO_BRAID.radius * HERO_BRAID.flat; let lowest = Infinity, highest = -Infinity;
  for (let i = 3; i <= HERO_BRAID.segments; i++) {
    const p = S.local(P8[i * 3], P8[i * 3 + 1], P8[i * 3 + 2]), under = S.at(p[0], p[1]); if (!Number.isFinite(under) || p[1] < -.1) continue;
    lowest = Math.min(lowest, p[2] - under); highest = Math.max(highest, p[2] - under);
  }
  assert.ok(lowest > lie, `the braid's tube is never inside the chest (${lowest.toFixed(3)} > ${lie.toFixed(3)})`);
  assert.ok(highest < .11, `and lies on it as before (${highest.toFixed(3)}; was .105 on the flatter chest)`);
  // Kit pieces over the chest front keep the offsets they had on the flatter chest (release 1076: -.024 to .102).
  const skin = female.skins[0], m = state.skinMatrices[0]; let lo = Infinity, hi = -Infinity, n = 0;
  for (const part of CLOSE_VIEW_WAYFARER_KIT) { const j = skin.joints.indexOf(part.node); if (j < 0 || part.node === 3) continue; const k = j * 16;
    for (const v of state.overlayParts.get(part)) { const p = S.local(m[k] * v[0] + m[k + 4] * v[1] + m[k + 8] * v[2] + m[k + 12], m[k + 1] * v[0] + m[k + 5] * v[1] + m[k + 9] * v[2] + m[k + 13], m[k + 2] * v[0] + m[k + 6] * v[1] + m[k + 10] * v[2] + m[k + 14]);
      if (p[2] < .05 || Math.abs(p[0]) > .22 || p[1] < .05 || p[1] > .4) continue; const under = S.at(p[0], p[1]); if (!Number.isFinite(under)) continue; n++; lo = Math.min(lo, p[2] - under); hi = Math.max(hi, p[2] - under); } }
  assert.ok(n > 40, `kit vertices over the chest (${n})`);
  assert.ok(lo > -.03 && hi < .11, `kit offsets ${lo.toFixed(3)}..${hi.toFixed(3)}`);
});
