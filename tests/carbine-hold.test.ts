// The Carbine shouldered (Tim, 2026-11-14): "When you're charging it, the character's arm just kind of wiggles in a weird way.
// His arms should just be held steady." and "use 2 hands; instead of holding it down by the hip, it should be up at the
// shoulder, like a cheek weld." Close View presentation only (close-view-player-presentation.ts CARBINE_HOLD).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CARBINE_HOLD, carbineRecoil, closeViewHeldGear } from '../src/close-view-player-presentation.ts';
import { closeViewHeldMuzzlePoint, writeCloseViewHeroGear, CLOSE_VIEW_HERO_WEAPON_FORM, MODEL_FLOATS } from '../src/close-view-models.ts';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';
import { CARBINE } from '../src/tool-forms.ts';

const meta = JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json', import.meta.url), 'utf8'));
const raw = fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin', import.meta.url));
const asset = decodeCloseViewHero(meta, raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
const HEIGHT = 1.3776; // close-view.ts input.height (1.68 × .82)

// One sampled frame. Facing yaw 0: world +X is forward, +Y the displayed right, +Z up.
function hero(input: any, state = createHeroPoseState(asset)) {
  const frame = createHeroFrame(asset);
  assert.ok(sampleCloseViewHero(asset, state, { nowMs: 1000, reducedMotion: false, x: 0, y: 0, groundZ: 0, liftZ: 0, yaw: 0, height: HEIGHT, speed: 0, gaitPhase: 0, heldProfile: 'emitter', handProfile: 'emitter', ...input }, frame));
  return { state, frame };
}
// A charge: the carbine record (profile 'emitter', CARBINE.poseMs) at progress `phase`, as each restamp restarts it.
const charging = (phase: number, nowMs = 1000, extra: any = {}) => ({ nowMs, carbineHold: true, carbineRecoil: 0, action: { kind: 'ranged', profile: 'emitter', phase, durationMs: CARBINE.poseMs, yaw: 0 }, ...extra });
// Both arms' joints (source shoulder, elbow, wrist, grip; both sides) in world space, plus the two hand sockets.
const ARM_NODES = [12, 11, 7, 6, 22, 21, 18, 16];
function arms(state: any, frame: any) {
  const k = HEIGHT / state.referenceHeight, g = state.global, out: number[] = [];
  for (const n of ARM_NODES) out.push(g[n * 16 + 12] * k, g[n * 16 + 13] * k, g[n * 16 + 14] * k);
  out.push(...frame.leftSocket, ...frame.rightSocket);
  return out;
}
const dist = (a: ArrayLike<number>, b: ArrayLike<number>) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const at = (m: Float32Array) => m.subarray(12, 15);
const joint = (state: any, n: number) => { const k = HEIGHT / state.referenceHeight, g = state.global; return [g[n * 16 + 14] * k, g[n * 16 + 12] * k, (g[n * 16 + 13] - state.minY) * k]; };

test('the pose numbers are one frozen data table, and the Carbine keeps its held-gear entry', () => {
  assert.ok(Object.isFrozen(CARBINE_HOLD) && Object.isFrozen(CARBINE_HOLD.butt) && Object.isFrozen(CARBINE_HOLD.head) && Object.isFrozen(CARBINE_HOLD.recoil) && Object.isFrozen(CARBINE_HOLD.support));
  assert.deepEqual(closeViewHeldGear('carbine'), { hand: 'right', scale: .8, grip: 'one' });
  const F = CLOSE_VIEW_HERO_WEAPON_FORM.carbine;
  assert.ok(CARBINE_HOLD.support[0] > F.grip[1] && CARBINE_HOLD.support[0] < F.muzzle[0], 'the support hand is on the fore-end, ahead of the grip');
});

test('charging holds both arms steady: identical joints through every restamp and over time', () => {
  const first = hero(charging(0)), ref = arms(first.state, first.frame);
  assert.equal(first.state.clip, 'derived-carbine-shoulder');
  // The restamp cycle (CARBINE.charge.restampMs before each 600 ms record ends) and the record's own envelope ends.
  for (const phase of [0, .02, .05, .08, .12, .3, .5, .566, .57, .75, .9, .97, 1]) for (const nowMs of [1000, 1350, 2730, 9000]) {
    const { state, frame } = hero(charging(phase, nowMs)), got = arms(state, frame);
    let worst = 0; for (let i = 0; i < ref.length; i++) worst = Math.max(worst, Math.abs(got[i] - ref[i]));
    assert.ok(worst < 1e-6, `phase ${phase} at ${nowMs} ms moved an arm by ${worst}`);
  }
  // One pose state sampled frame after frame (as the renderer does) never drifts.
  const state = createHeroPoseState(asset);
  for (let f = 0; f < 40; f++) { const p = (f * 16.7 % 340) / 600, { frame } = hero(charging(p, 1000 + f * 16.7), state), got = arms(state, frame); let worst = 0; for (let i = 0; i < ref.length; i++) worst = Math.max(worst, Math.abs(got[i] - ref[i])); assert.ok(worst < 1e-6, `frame ${f}: ${worst}`); }
  // The same hold carried (no record) as charging: starting a charge does not move the arms either.
  const carry = hero({ carbineHold: true, carbineRecoil: 0, action: null }), still = arms(carry.state, carry.frame);
  let worst = 0; for (let i = 0; i < ref.length; i++) worst = Math.max(worst, Math.abs(still[i] - ref[i])); assert.ok(worst < 1e-6, `carry vs charge ${worst}`);
});

test('shouldered: stock at the right shoulder, cheek on the stock, barrel level forward, two hands on it', () => {
  const { state, frame } = hero(charging(.3)), grip = frame.leftSocket, support = frame.rightSocket;
  const shoulder = joint(state, 12), otherShoulder = joint(state, 22), head = joint(state, 4), hip = joint(state, 28);
  assert.ok(shoulder[1] > 0 && otherShoulder[1] < 0, 'source-left is the displayed right');
  const muzzle = closeViewHeldMuzzlePoint(new Float32Array(3), 'carbine', grip)!;
  // The drawn stock's rearmost point is its butt.
  const out = new Float32Array(300 * 3 * MODEL_FLOATS), n = writeCloseViewHeroGear(out, 0, { profile: 'carbine', leftSocket: grip, rightSocket: support });
  let butt = [Infinity, 0, 0]; for (let i = 0; i < n; i += MODEL_FLOATS) if (out[i] < butt[0]) butt = [out[i], out[i + 1], out[i + 2]];
  // The right hand holds it (source-left socket), at shoulder height, well above the hip.
  assert.ok(grip[13] > 0, 'in the right hand');
  assert.ok(Math.abs(grip[14] - shoulder[2]) < .1, `grip at shoulder height (${grip[14]} vs shoulder ${shoulder[2]})`);
  assert.ok(grip[14] - hip[2] > .3, 'not down by the hip');
  // The butt sits in the right shoulder pocket: on the right side, at the shoulder, just inside and ahead of the joint.
  assert.ok(dist(butt, shoulder) < .12, `butt ${butt} vs shoulder ${shoulder}`);
  assert.ok(butt[1] > 0 && butt[1] < shoulder[1], 'right of the centre line, inside the shoulder joint');
  assert.ok(butt[2] >= shoulder[2] - .02, 'not below the shoulder');
  // Cheek weld: the stock's comb rides at the jaw, right beside the head, and the head leans onto it.
  assert.ok(butt[2] > head[2] - .05 && butt[2] < head[2] + .06, `stock ${butt[2]} at the jaw (${head[2]})`);
  assert.ok(Math.abs(butt[1] - head[1]) < .1, 'the stock is beside the face');
  const g = state.global, o = 4 * 16, up = [g[o + 6], g[o + 4], g[o + 5]], l = Math.hypot(...up);
  assert.ok(up[1] / l > .1, 'the head tilts toward the stock'); assert.ok(up[0] / l > .1, 'and down onto it');
  // The barrel runs forward along the aim, level, at shoulder/eye height.
  assert.ok(muzzle[0] - butt[0] > .6, 'muzzle well ahead of the butt');
  assert.ok(Math.abs(muzzle[2] - butt[2]) < .03, `level (${muzzle[2]} vs ${butt[2]})`);
  assert.ok(Math.abs(muzzle[1] - butt[1]) < .06, 'pointing along the aim');
  assert.ok(muzzle[2] > shoulder[2] && muzzle[2] < head[2] + .1, `muzzle height ${muzzle[2]}`);
  // Two hands: the left reaches across to the fore-end, under the barrel, ahead of the grip.
  assert.ok(support[13] > otherShoulder[1] + .1, 'the left hand has crossed toward the gun');
  assert.ok(support[12] > grip[12] + .08 && support[12] < muzzle[0], 'on the fore-end, ahead of the grip');
  const along = (support[12] - butt[0]) / (muzzle[0] - butt[0]), axis = [butt[0] + along * (muzzle[0] - butt[0]), butt[1] + along * (muzzle[1] - butt[1]), butt[2] + along * (muzzle[2] - butt[2])];
  assert.ok(dist(at(support), axis) < .06, `support hand ${dist(at(support), axis)} from the barrel`);
  assert.ok(support[14] <= axis[2] + .005, 'under the barrel');
  assert.ok(state.primaryGripResidual < 1e-3, 'the right hand reaches its grip');
});

test('the muzzle visuals follow the shouldered carbine; Close View fires from where it now is', () => {
  const { frame } = hero(charging(.3)), muzzle = closeViewHeldMuzzlePoint(new Float32Array(3), 'carbine', frame.leftSocket)!;
  // The old raised-emitter hold kept the muzzle low and out at the right hand; the shouldered one is higher and nearer the centre.
  const old = hero({ action: { kind: 'ranged', profile: 'emitter', phase: .3, durationMs: CARBINE.poseMs, yaw: 0 } }).frame, oldMuzzle = closeViewHeldMuzzlePoint(new Float32Array(3), 'carbine', old.leftSocket)!;
  assert.ok(muzzle[2] > oldMuzzle[2] + .05 && muzzle[1] < oldMuzzle[1], `${muzzle} vs ${oldMuzzle}`);
  // Below the Carbine (no carbineHold) the Spark Coil keeps its one-handed raise.
  assert.equal(hero({ action: { kind: 'ranged', profile: 'emitter', phase: .3, durationMs: 360, yaw: 0 } }).state.clip, 'derived-ranged');
});

test('a shot kicks back and returns exactly to the steady hold; a charge never kicks', () => {
  assert.equal(carbineRecoil(0), 0); assert.equal(carbineRecoil(CARBINE_HOLD.recoil.end), 0); assert.equal(carbineRecoil(1), 0); assert.equal(carbineRecoil(NaN), 0);
  assert.ok(Math.abs(carbineRecoil(CARBINE_HOLD.recoil.peak) - 1) < 1e-12);
  assert.ok(carbineRecoil(CARBINE_HOLD.recoil.peak, true) < carbineRecoil(CARBINE_HOLD.recoil.peak), 'Reduced Motion kicks less');
  let prev = 1; for (let p = CARBINE_HOLD.recoil.peak; p <= CARBINE_HOLD.recoil.end; p += .01) { const k = carbineRecoil(p); assert.ok(k <= prev + 1e-12); prev = k; }
  const steady = hero(charging(.3)), ref = arms(steady.state, steady.frame), kicked = hero(charging(.05, 1000, { carbineRecoil: 1 }));
  const a = closeViewHeldMuzzlePoint(new Float32Array(3), 'carbine', steady.frame.leftSocket)!, b = closeViewHeldMuzzlePoint(new Float32Array(3), 'carbine', kicked.frame.leftSocket)!;
  assert.ok(b[0] < a[0] && b[2] > a[2], 'the kick drives it back and the muzzle up');
  assert.ok(dist(at(kicked.frame.leftSocket), at(steady.frame.leftSocket)) < .06, 'a slight kick');
  const settled = hero(charging(.6, 1000, { carbineRecoil: carbineRecoil(.6) })), got = arms(settled.state, settled.frame);
  let worst = 0; for (let i = 0; i < ref.length; i++) worst = Math.max(worst, Math.abs(got[i] - ref[i])); assert.ok(worst < 1e-6, `settled ${worst}`);
});

test('the hold yields to whole-body actions: a dodge, a hit or a knockdown is not shouldered', () => {
  for (const action of [{ kind: 'dodge', profile: 'emitter', phase: .4, durationMs: 260, yaw: 0 }, { kind: 'hit', profile: 'hurt', phase: .4, durationMs: 300, yaw: 0 }, { kind: 'hit', profile: 'knockdown', phase: .4, durationMs: 300, yaw: 0 }])
    assert.notEqual(hero({ carbineHold: true, carbineRecoil: 0, action }).state.clip, 'derived-carbine-shoulder', action.kind + ' ' + action.profile);
  // Walking keeps the shouldered hold over the gait.
  assert.equal(hero({ carbineHold: true, carbineRecoil: 0, action: null, speed: 1.2, gaitPhase: 1.3 }).state.clip, 'derived-carbine-shoulder');
});
