// Tim, 2026-11-13: "look at the swing of the Verge Cleaver, just do frame by frame... its swing is not
// horizontal." The Close View quick Cleaver's second slash ('return') is the combo's side-to-side cut;
// it had dropped about 12 degrees across its arc (tip 1.22 -> 0.77 world tiles). It now sweeps in a flat,
// level plane at chest height. The diagonal and overhead slashes keep their designed tilt, and nothing on
// the gameplay side (timing, contact, hit) moves. Presentation only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';
import { CLOSE_VIEW_HERO_WEAPON_FORM } from '../src/close-view-models.ts';
import { CLOSE_VIEW_CLEAVER_SLASHES, CLOSE_VIEW_CLEAVER_SLASH_TIMING, cleaverSlashBlade } from '../src/close-view-player-presentation.ts';
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

test('the return slash is authored in a level plane (no up component in its plane axes)', () => {
  const spec = CLOSE_VIEW_CLEAVER_SLASHES.find(s => s.name === 'return')!;
  assert.equal(spec.ref[1], 0); assert.equal(spec.travel[1], 0);
  for (let a = spec.from; a <= spec.to; a += 2) { const b = cleaverSlashBlade(spec, a / DEG); assert.ok(Math.abs(b[1]) < 1e-12, `blade level at ${a} deg`); }
});

test('Close View return slash: the blade tip stays within 10 degrees of horizontal at chest height, side to side', () => {
  for (const extra of [{}, { reducedMotion: true }, { speed: 1.4, gaitPhase: .7 }]) {
    const S = sweep(2, extra), contact = pose(2, T.contactMs, extra);
    assert.ok(planeTilt(S) < 2, `swept plane within 2 deg of level (${planeTilt(S).toFixed(1)})`);
    for (const s of S) {
      const elevation = Math.asin(Math.max(-1, Math.min(1, s.blade[2]))) * DEG;
      assert.ok(Math.abs(elevation) < 10, `blade within 10 deg of horizontal (${elevation.toFixed(1)})`);
      // Tip height against the contact tip, as an angle at the reach of the tip from the body.
      const reach = Math.hypot(s.tip[0], s.tip[1]), drop = Math.atan2(Math.abs(s.tip[2] - contact.tip[2]), Math.max(.3, reach)) * DEG;
      assert.ok(drop < 10, `tip height within 10 deg of the contact height (${drop.toFixed(1)})`);
      assert.ok(s.tip[2] > .5 * HEIGHT && s.tip[2] < .9 * HEIGHT, `tip at waist-to-chest height (${(s.tip[2] / HEIGHT).toFixed(2)} of height)`);
    }
    // Side to side: from the far side, through the front at contact, out to the sword side (-y here).
    assert.ok(S[0].tip[1] > .6 && S.at(-1).tip[1] < -.6 && contact.tip[0] > .9 && Math.abs(contact.tip[1]) < .35);
  }
});

test('the diagonal and overhead slashes keep their designed tilt', () => {
  const diagonal = planeTilt(sweep(1)), overhead = planeTilt(sweep(3));
  assert.ok(diagonal > 30 && diagonal < 60, `diagonal stays diagonal (${diagonal.toFixed(1)})`);
  assert.ok(overhead > 80, `overhead stays vertical (${overhead.toFixed(1)})`);
});
