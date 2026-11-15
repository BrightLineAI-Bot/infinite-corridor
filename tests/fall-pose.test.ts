// The falling pose (Tim, 2026-11-15: "The character should have a fall animation when he starts falling. The longer he falls, he starts
// moving his arms and legs a little ... It shouldn't become frantic"). FALL_POSE is read from the fall's own clock (game.fall.t): a
// small arms-out reaction at the onset, building into a slow arm wheel and leg cycle on a long fall, settling into the landing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';
import { FALL_POSE, FALL_REACH_MS, sampleFallPose, ordinaryFallPresentation } from '../src/close-view-player-presentation.ts';
import { render } from '../src/renderer.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

const meta = JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json', import.meta.url), 'utf8')), raw = fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin', import.meta.url));
const asset = decodeCloseViewHero(meta, raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
const F = FALL_POSE, out = new Float64Array(4);
const s = (t: number, rem = 5000, reduced = false) => Array.from(sampleFallPose(t, rem, reduced, out));
const air = (t: number, rem = 5000, flail = true) => ({ v: 1, elapsedMs: t, remainingMs: rem, durationMs: t + rem, lift: 1, rise: 1, fall: Math.max(0, Math.min(1, .3 + .7 * (1 - rem / FALL_REACH_MS))), falling: true, flail });
function mesh(a: any, reducedMotion = false) {
  const state = createHeroPoseState(asset), frame = createHeroFrame(asset);
  assert.ok(sampleCloseViewHero(asset, state, { nowMs: 2000, reducedMotion, x: 0, y: 0, groundZ: 0, liftZ: 0, yaw: 0, height: 1.3776, speed: 0, gaitPhase: 0,
    action: a ? { kind: 'jump', phase: .5, durationMs: a.durationMs, jumpAir: a } : { kind: '', phase: 0, durationMs: 1 }, alpha: 1, tint: [1, 1, 1], hitFlash: 0 }, frame));
  return Float32Array.from(frame.positionsNormals);
}
const delta = (a: Float32Array, b: Float32Array) => { let d = 0; for (let i = 0; i < a.length; i += 6) for (let k = 0; k < 3; k++) d = Math.max(d, Math.abs(a[i + k] - b[i + k])); return d; };

test('FALL_POSE: a small arms-out onset, growing into the full loop on a long fall; bounded weights', () => {
  assert.deepEqual(s(0).slice(0, 3), [0, 0, 0], 'nothing at the first instant');
  const onset = s(F.onsetMs);
  assert.ok(onset[0] > .2 && onset[0] <= F.onset + 1e-9, `the onset: arms only a little out (${onset[0].toFixed(3)})`);
  assert.ok(onset[2] === 0, 'no loop yet at the onset');
  const short = s(F.onsetMs + 150);
  assert.ok(short[2] < .1, `a short fall barely starts the loop (${short[2].toFixed(3)})`);
  let prev = -1; for (let t = 0; t <= F.onsetMs + F.buildMs; t += 50) { const [arms, legs, loop] = s(t); assert.ok(arms >= prev - 1e-12, 'the arms only grow in the air'); prev = arms;
    for (const v of [arms, legs, loop]) assert.ok(v >= 0 && v <= 1, 'bounded'); }
  const long = s(F.onsetMs + F.buildMs + 10);
  assert.ok(Math.abs(long[0] - 1) < 1e-9 && Math.abs(long[2] - 1) < 1e-9, 'a long fall: the full loop');
  for (let t = 3000; t < 20000; t += 777) { const v = s(t); assert.ok(v[0] <= 1 && v[1] <= 1 && v[2] <= 1 && v[3] >= 0 && v[3] < 2 * Math.PI); }
});

test('FALL_POSE: the loop is periodic and never frantic', () => {
  assert.ok(F.periodMs >= F.minPeriodMs && F.minPeriodMs >= 900, `at most ${(1000 / F.minPeriodMs).toFixed(2)} cycles a second`);
  for (const t of [1600, 2400, 5000, 12345]) { const a = s(t), b = s(t + F.periodMs); for (let k = 0; k < 4; k++) assert.ok(Math.abs(a[k] - b[k]) < 1e-6, `periodic at ${t}`); }
  // The drawn body: one period apart is the same pose; half a period apart, the arms have wheeled (but modestly).
  const a = mesh(air(3000)), b = mesh(air(3000 + F.periodMs)), c = mesh(air(3000 + F.periodMs / 2));
  assert.ok(delta(a, b) < 1e-4, 'the drawn loop repeats'); const swing = delta(a, c);
  assert.ok(swing > .05 && swing < .5, `the loop moves readably but modestly (${swing.toFixed(3)} m)`);
  // Per 60 Hz frame, no vertex moves faster than a gentle loop allows.
  let most = 0; for (let t = 3000; t < 3000 + F.periodMs; t += 1000 / 60) most = Math.max(most, delta(mesh(air(t)), mesh(air(t + 1000 / 60))));
  assert.ok(most < .03, `calm tempo: at most ${most.toFixed(4)} m a frame`);
});

test('FALL_POSE: the drawn fall grows from the onset into the loop, and settles smoothly into the landing', () => {
  const ground = mesh(null), at02 = mesh(air(200)), at08 = mesh(air(800)), at2 = mesh(air(2000));
  const d02 = delta(ground, at02), d08 = delta(ground, at08), d2 = delta(ground, at2);
  assert.ok(d02 > .01 && d02 < d08 && d08 < d2, `the motion builds (${d02.toFixed(3)} < ${d08.toFixed(3)} < ${d2.toFixed(3)})`);
  // The last FALL_REACH_MS before the ground: no pop frame to frame, and the touchdown is the ground pose.
  let most = 0, prev = mesh(air(4000, FALL_REACH_MS + 50));
  for (let r = FALL_REACH_MS + 50 - 1000 / 60; r >= 0; r -= 1000 / 60) { const m = mesh(air(4000 + FALL_REACH_MS + 50 - r, Math.max(0, r))); most = Math.max(most, delta(prev, m)); prev = m; }
  assert.ok(most < .06, `the landing blend is smooth (${most.toFixed(4)} m a frame)`);
  assert.ok(delta(mesh(air(4400, 0)), mesh(air(4400, 0, false))) < 1e-6, 'at touchdown nothing of the loop is left: the existing hand-off to the ground (the landing absorb or roll) is unchanged');
  // The arms settle back with the loop as the ground nears.
  const [armsHigh, , loopHigh] = s(4000, FALL_REACH_MS * 2), [armsLow, , loopLow] = s(4000, FALL_REACH_MS * .2);
  assert.ok(armsLow < armsHigh && loopLow < loopHigh, 'settling near the ground');
});

test('FALL_POSE: Reduced Motion holds a smaller, still arms-out pose', () => {
  for (const t of [2000, 2400, 3100]) { const [arms, , loop] = s(t, 5000, true); assert.equal(loop, 0, 'no loop'); assert.ok(Math.abs(arms - F.reducedArms) < 1e-9, 'smaller arms-out'); }
  assert.ok(delta(mesh(air(2000), true), mesh(air(2000 + F.periodMs / 2), true)) < 1e-5, 'still in Reduced Motion');
  assert.ok(delta(mesh(null, true), mesh(air(2000), true)) < delta(mesh(null), mesh(air(2000))), 'smaller than the full pose');
});

test('FALL_POSE: deterministic for a given fall time; no allocation (the caller owns the output)', () => {
  const r1 = sampleFallPose(1234.5, 900, false, out); assert.equal(r1, out, 'writes into the given array');
  const a = Array.from(r1), b = Array.from(sampleFallPose(1234.5, 900, false, out)); assert.deepEqual(a, b);
  assert.deepEqual(mesh(air(1777)), mesh(air(1777)), 'same fall time, same pose');
  // A plunge (an attack in the air) keeps the plain hang: the flail layer is off.
  assert.ok(delta(mesh(air(2000, 5000, false)), mesh(air(2000))) > .05, 'a plunge keeps its own pose');
  assert.deepEqual(mesh(air(2000, 5000, false)), mesh(air(2600, 5000, false)), 'a plunge has no loop');
});

// The game: walking off a 3-level ledge on the test tile.
function cliff() {
  const g: any = createLabFixture({ lab: 'test-tile', scenario: '', now: 1000 }).game, W = 32, screen: any = ctx2d(); screen.canvas = { width: 390, height: 844 };
  g.save.overworldCloseView = false; g.presentation = { effectiveQuality: 'low', reduceMotion: false }; g.enemies = [];
  for (let y = 1; y <= 5; y++) for (let x = 2; x <= 14; x++) Object.assign(g.map.tiles[y * W + x], { blocked: false, elev: x <= 7 ? 3 : 0, slope: false, structure: undefined, buildingId: undefined });
  g.player.x = 6.2; g.player.y = 2.6; g.player.hp = g.save.maxHp; let T = 50000;
  const frame = (x: number, jump = false) => { T += 1000 / 60; let j = jump; g.update(1 / 60, { state: { x, y: 0 }, consume: (k: string) => k === 'jump' && j ? (j = false, true) : false, held: () => false }, T); return T; };
  for (let i = 0; i < 30; i++) frame(0);
  return { g, frame, now: () => T, screen };
}
function ctx2d() { return new Proxy({ canvas: null as any, globalAlpha: 1, arcs: 0, arc() { (this as any).arcs++; }, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) },
  { get: (o: any, k: any) => k in o ? o[k] : () => {}, set: (o: any, k: any, v: any) => { o[k] = v; return true; } }); }

test('the falling pose applies only to a genuine fall: not on the ground, gliding, on the drone or in a rising jump', () => {
  const c = cliff(), g = c.g;
  assert.equal(ordinaryFallPresentation(g, c.now(), 0), null, 'on the ground');
  c.frame(0, true); c.frame(0); assert.ok(c.now() < g.jumpUntil, 'a jump in its rise'); assert.equal(ordinaryFallPresentation(g, c.now(), 0), null, 'the rising jump keeps the jump pose');
  for (let i = 0; i < 40; i++) c.frame(0);
  let fell = 0, posed = 0, prevT = -1, checked = false;
  for (let i = 0; i < 120 && (!fell || g.fall); i++) { c.frame(1); if (!g.fall) continue; fell++; const a: any = ordinaryFallPresentation(g, c.now(), 0); if (!a) continue; posed++;
    assert.equal(a.falling, true); assert.equal(a.flail, true); assert.ok(Math.abs(a.elapsedMs - g.fall.t * 1000) < 1e-6, 'the fall\'s own clock'); assert.ok(a.elapsedMs >= prevT, 'the clock runs on'); prevT = a.elapsedMs;
    if (posed === 15) { // mid-fall: the exclusions, and exact resume from a save made in the air
      const glide = g.glide; g.glide = { z: g.fall.z, vx: 0, vy: 0, open: true }; assert.equal(ordinaryFallPresentation(g, c.now(), 0), null, 'gliding'); g.glide = glide;
      const lift = g.droneLift; g.droneLift = { base: 0, z: g.fall.z, vz: 0 }; assert.equal(ordinaryFallPresentation(g, c.now(), 0), null, 'on the drone'); g.droneLift = lift;
      const plunge = g.plunge; g.plunge = { at: 0 }; assert.equal((ordinaryFallPresentation(g, c.now(), 0) as any).flail, false, 'a plunge keeps its own pose'); g.plunge = plunge;
      const back: any = new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(c.now())))), c.now());
      assert.ok(back.fall, 'the fall resumes in the air'); assert.ok(Math.abs(back.fall.t - g.fall.t) < 1e-9, 'the fall clock resumes exactly');
      const paused = g.fall.t; g.paused = true; g.pauseStarted = c.now(); assert.equal(g.fall.t, paused); g.paused = false;
      // Standard View: the arms are drawn out (two hands) for a real fall; a plunge draws none.
      const ctx = c.screen; ctx.arcs = 0; render(ctx, g, 390, 844, c.now()); const withArms = ctx.arcs;
      g.plunge = { at: 0 }; ctx.arcs = 0; render(ctx, g, 390, 844, c.now()); const without = ctx.arcs; g.plunge = plunge;
      assert.equal(withArms - without, 2, 'Standard View: two hands raised for the fall'); checked = true;
    } }
  assert.ok(checked, 'checked mid-fall'); assert.ok(fell > 10 && posed > 5, `a fall with airtime (${fell} frames, ${posed} posed)`);
  assert.equal(ordinaryFallPresentation(g, c.now(), 0), null, 'landed: no falling pose');
  g.player.hp = 0; assert.equal(ordinaryFallPresentation(g, c.now(), 0), null, 'defeat keeps its own fall-over');
});
