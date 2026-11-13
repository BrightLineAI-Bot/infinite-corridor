// Tim, 2026-11-13: "look at the swing of the Verge Cleaver, just do frame by frame... its swing is not
// horizontal." Then: the Close View combo is three wide, sweeping, level swings: across, back, then across
// again, the last the widest and weightiest; the older four-cut (outdoors) sweeps level across and back
// too. Every active sweep stays within 10 degrees of horizontal at waist-to-chest height. Nothing on the
// gameplay side (timing, contact, hit) moves. Presentation only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';
import { CLOSE_VIEW_HERO_WEAPON_FORM, writeCloseViewModel } from '../src/close-view-models.ts';
import { CLOSE_VIEW_CLEAVER_SLASHES, CLOSE_VIEW_CLEAVER_SLASH_TIMING, cleaverSlashBlade, cleaverCutMotion } from '../src/close-view-player-presentation.ts';
import { CLOSE_VIEW_MELEE_TIMING } from '../src/action-motion.ts';

const meta = JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json', import.meta.url), 'utf8'));
const raw = fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin', import.meta.url));
const asset = decodeCloseViewHero(meta, raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
const T = CLOSE_VIEW_MELEE_TIMING.cleaverQuick, TIP = (CLOSE_VIEW_HERO_WEAPON_FORM.cleaver.tip - .79) * .82, DEG = 180 / Math.PI;
const HEIGHT = 1.3776;
const base = { x: 0, y: 0, groundZ: 0, liftZ: 0, yaw: 0, height: HEIGHT, speed: 0, gaitPhase: 0, heldProfile: 'verge-cleaver', handProfile: 'verge-cleaver' };
function pose(step: number, ms: number, extra: any = {}) {
  const state = createHeroPoseState(asset), frame = createHeroFrame(asset);
  sampleCloseViewHero(asset, state, { ...base, ...extra, nowMs: 1200 + ms, primaryCarryStage: { kind: 'cleaver-three', step, direction: step === 2 ? -1 : 1 },
    action: { kind: 'melee', profile: 'verge-cleaver', primaryMotion: { v: 3, mode: 'quick', step }, meleeAction: { v: 2, kind: 'verge-cleaver', move: 'cleaver', contactMs: T.contactMs, durationMs: T.durationMs }, phase: ms / T.durationMs, durationMs: T.durationMs, poseMs: 1200, yaw: 0 } }, frame);
  const m = frame.rightSocket, ax = Math.hypot(m[0], m[1], m[2]), blade = [m[0] / ax, m[1] / ax, m[2] / ax];
  return { blade, tip: [0, 1, 2].map(k => m[12 + k] + blade[k] * TIP) };
}
// Active sweep: from the end of the wind-up to the end of the follow-through.
const windEnd = T.contactMs * CLOSE_VIEW_CLEAVER_SLASH_TIMING.windup, followEnd = T.contactMs + (T.durationMs - T.contactMs) * CLOSE_VIEW_CLEAVER_SLASH_TIMING.follow;
function sweep(step: number, extra: any = {}) { const out = []; for (let ms = Math.ceil(windEnd); ms <= Math.floor(followEnd); ms++) out.push(pose(step, ms, extra)); return out; }
// Tilt of the swept plane from horizontal: the summed rotation axis of the blade through the sweep.
function planeTilt(samples: any[]) {
  const n = [0, 0, 0];
  for (let i = 1; i < samples.length; i++) { const a = samples[i - 1].blade, b = samples[i].blade; n[0] += a[1] * b[2] - a[2] * b[1]; n[1] += a[2] * b[0] - a[0] * b[2]; n[2] += a[0] * b[1] - a[1] * b[0]; }
  return Math.acos(Math.abs(n[2]) / Math.hypot(...n)) * DEG;
}

// The older four-cut: accepted 240 ms primary action, full weight from phase .12 to .40.
function four(step: number, phase: number, extra: any = {}) {
  const state = createHeroPoseState(asset), frame = createHeroFrame(asset);
  sampleCloseViewHero(asset, state, { ...base, ...extra, nowMs: 1200 + phase * 240, primaryCarryStage: { kind: 'cleaver-four', step },
    action: { kind: 'melee', profile: 'verge-cleaver', primaryMotion: { v: 2, step }, phase, durationMs: 240, poseMs: 1200, yaw: 0 } }, frame);
  const m = frame.rightSocket, ax = Math.hypot(m[0], m[1], m[2]), blade = [m[0] / ax, m[1] / ax, m[2] / ax];
  return { blade, tip: [0, 1, 2].map(k => m[12 + k] + blade[k] * TIP), residual: state.primaryGripResidual };
}
function assertLevel(label: string, S: any[], contact: any) {
  assert.ok(planeTilt(S) < 2, `${label}: swept plane within 2 deg of level (${planeTilt(S).toFixed(1)})`);
  for (const s of S) {
    const elevation = Math.asin(Math.max(-1, Math.min(1, s.blade[2]))) * DEG;
    assert.ok(Math.abs(elevation) < 10, `${label}: blade within 10 deg of horizontal (${elevation.toFixed(1)})`);
    // Tip height against the contact tip, as an angle at the reach of the tip from the body.
    const reach = Math.hypot(s.tip[0], s.tip[1]), drop = Math.atan2(Math.abs(s.tip[2] - contact.tip[2]), Math.max(.3, reach)) * DEG;
    assert.ok(drop < 10, `${label}: tip height within 10 deg of the contact height (${drop.toFixed(1)})`);
    assert.ok(s.tip[2] > .5 * HEIGHT && s.tip[2] < .9 * HEIGHT, `${label}: tip at waist-to-chest height (${(s.tip[2] / HEIGHT).toFixed(2)} of height)`);
  }
}

test('all three slashes are authored in level planes (no up component in their plane axes)', () => {
  assert.deepEqual(CLOSE_VIEW_CLEAVER_SLASHES.map(s => s.name), ['forehand', 'return', 'finisher']);
  for (const spec of CLOSE_VIEW_CLEAVER_SLASHES) {
    assert.equal(spec.ref[1], 0); assert.equal(spec.travel[1], 0);
    for (let a = spec.from; a <= spec.to; a += 2) { const b = cleaverSlashBlade(spec, a / DEG); assert.ok(Math.abs(b[1]) < 1e-12, `${spec.name} blade level at ${a} deg`); }
  }
});

test('Close View quick combo: each blade tip stays within 10 degrees of horizontal, across, back and across, the last widest', () => {
  // Side to side: across = from the sword side (-y here) to the far side; back is the reverse.
  const across = [1, -1, 1];
  for (const extra of [{}, { reducedMotion: true }, { speed: 1.4, gaitPhase: .7 }]) for (let step = 1; step <= 3; step++) {
    const S = sweep(step, extra), contact = pose(step, T.contactMs, extra);
    assertLevel(`step ${step}`, S, contact);
    assert.ok(-S[0].tip[1] * across[step - 1] > .6 && S.at(-1).tip[1] * across[step - 1] > .6 && contact.tip[0] > .9 && Math.abs(contact.tip[1]) < .35, `step ${step}: side to side through the front`);
  }
  const swept = (step: number) => { const S = sweep(step); let a = 0; for (let i = 1; i < S.length; i++) a += Math.acos(Math.max(-1, Math.min(1, S[i - 1].blade[0] * S[i].blade[0] + S[i - 1].blade[1] * S[i].blade[1] + S[i - 1].blade[2] * S[i].blade[2]))); return a * DEG; };
  assert.ok(swept(3) > swept(1) + 30 && swept(3) > swept(2) + 30, `the finisher is the widest (${swept(1).toFixed(0)}, ${swept(2).toFixed(0)}, ${swept(3).toFixed(0)})`);
});

test('the older four-cut sweeps level, alternating across and back, imported and native', () => {
  for (const extra of [{}, { reducedMotion: true }, { speed: 1.4, gaitPhase: .7 }]) for (let step = 1; step <= 4; step++) {
    const S = []; for (let p = .12; p <= .4001; p += .005) S.push(four(step, p, extra));
    assertLevel(`four-cut ${step}`, S, four(step, .26, extra));
    for (const s of S) assert.ok(s.residual < .01, 'the grip reaches its target');
    const dir = step % 2 ? 1 : -1;
    assert.ok((S.at(-1).tip[1] - S[0].tip[1]) * dir > 1.4, `four-cut ${step}: wide, ${dir > 0 ? 'across' : 'back'}`);
    const m = cleaverCutMotion({ kind: 'cleaver-four', step }, .26); assert.equal(m.pitch, 0);
  }
  // The native fallback model follows the same level sweep: its blade tip (the edge membrane's middle vertex).
  for (let step = 1; step <= 4; step++) {
    const tip = (p: number) => { const out = new Float32Array(7680), end = writeCloseViewModel(out, 0, { kind: 'playerVergeCleaver', x: 0, y: 0, z: 0, yaw: 0, phase: 0, pace: 0, pose: 'attack', amount: p, primaryStage: { kind: 'cleaver-four', step } }); return [0, 1, 2].map(k => out[end - 50 + k]); };
    const mid = tip(.26), dir = step % 2 ? 1 : -1;
    for (let p = .12; p <= .4001; p += .02) { const t = tip(p), drop = Math.atan2(Math.abs(t[2] - mid[2]), Math.max(.3, Math.hypot(t[0], t[1]))) * DEG; assert.ok(drop < 10, `native four-cut ${step}: level within 10 deg (${drop.toFixed(1)})`); }
    assert.ok((tip(.4)[1] - tip(.12)[1]) * dir > .5, `native four-cut ${step}: side to side`);
  }
});
