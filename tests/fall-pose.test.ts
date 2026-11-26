// The falling pose (Tim, 2026-11-15: "The character should have a fall animation when he starts falling. The longer he falls, he starts
// moving his arms and legs a little ... It shouldn't become frantic"). FALL_POSE is read from the fall's own clock (game.fall.t): a
// small arms-out reaction at the onset, building into a slow arm wheel and leg cycle on a long fall, settling into the landing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';
import { FALL_POSE, FALL_REACH_MS, sampleFallPose, ordinaryFallPresentation, ordinaryLandingPresentation } from '../src/close-view-player-presentation.ts';
import { render } from '../src/renderer.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

const meta = JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json', import.meta.url), 'utf8')), raw = fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin', import.meta.url));
const asset = decodeCloseViewHero(meta, raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
const F = FALL_POSE, out = new Float64Array(6);
const s = (t: number, rem = 5000, reduced = false) => Array.from(sampleFallPose(t, rem, reduced, out));
const air = (t: number, rem = 5000, flail = true) => ({ v: 1, elapsedMs: t, remainingMs: rem, durationMs: t + rem, lift: 1, rise: 1, fall: Math.max(0, Math.min(1, .3 + .7 * (1 - rem / FALL_REACH_MS))), falling: true, flail });
// One Close View hero frame as close-view.ts draws it: a fall is a 'jump' action past its end (phase 1) carrying the fall descriptor;
// on the ground there is no action. `state` carries across frames when a sequence is drawn.
function mesh(a: any, reducedMotion = false, nowMs = 2000, state = createHeroPoseState(asset), action: any = undefined, landing = NaN) {
  const frame = createHeroFrame(asset);
  assert.ok(sampleCloseViewHero(asset, state, { nowMs, reducedMotion, x: 0, y: 0, groundZ: 0, liftZ: 0, yaw: 0, height: 1.3776, speed: 0, gaitPhase: 0,
    action: action !== undefined ? action : a ? { kind: 'jump', phase: 1, durationMs: 420, jumpAir: a } : null, landing, alpha: 1, tint: [1, 1, 1], hitFlash: 0 }, frame));
  return Float32Array.from(frame.positionsNormals);
}
const delta = (a: Float32Array, b: Float32Array) => { let d = 0; for (let i = 0; i < a.length; i += 6) for (let k = 0; k < 3; k++) d = Math.max(d, Math.abs(a[i + k] - b[i + k])); return d; };

test('FALL_POSE: a small arms-out onset, growing into the full loop on a long fall; bounded weights', () => {
  assert.deepEqual(s(0).slice(0, 3), [0, 0, 0], 'nothing at the first instant');
  const onset = s(F.onsetMs);
  assert.ok(onset[0] > .2 && onset[0] <= F.onset + .05, `the onset: arms only a little out (${onset[0].toFixed(3)})`);
  assert.ok(onset[2] < .03, `the loop has barely begun at the onset (${onset[2].toFixed(3)})`);
  assert.ok(s(F.torsoMs)[4] > s(F.torsoMs)[0], 'the chest reacts ahead of the arms (overlapping action)');
  const short = s(F.onsetMs + 150);
  assert.ok(short[2] < .1, `a short fall barely starts the loop (${short[2].toFixed(3)})`);
  // Eased: the arms only grow, and never stall between the onset and the build (no hitch where one hands over to the other).
  let prev = -1, slowest = Infinity; for (let t = 0; t <= F.buildFrom + F.buildMs; t += 10) { const [arms, legs, loop, , torso, head] = s(t); assert.ok(arms >= prev - 1e-12, 'the arms only grow in the air');
    if (t > 40 && t < F.buildFrom + F.buildMs * .6) slowest = Math.min(slowest, arms - prev); prev = arms;
    for (const v of [arms, legs, loop, torso, head]) assert.ok(v >= 0 && v <= 1, 'bounded'); }
  assert.ok(slowest > 1e-4, `no stall between onset and build (${slowest.toExponential(2)} per 10 ms at the slowest)`);
  const long = s(F.buildFrom + F.buildMs + 10);
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
  assert.ok(delta(mesh(air(4400, 0)), ground) < 1e-6, 'at touchdown the falling pose is exactly the ground pose (no frozen idle, no leftover loop), so the landing absorb or roll takes over cleanly');
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

// Frame sequences (Tim's bar: AAA feel, nothing pops). A walk off a 2-level and a 20-level ledge at 60 Hz, drawn as close-view.ts draws
// them: the hero's pose state carries over every frame, the fall descriptor while falling, the landing absorb after (a landing roll,
// a dodge of its own, is skipped). Close View: no vertex moves more than a calm step a frame, from the walk-off through the
// touchdown. Standard View: the hands' weight never jumps, and is all but gone at the touchdown.
function ledge(h: number) {
  const g: any = createLabFixture({ lab: 'test-tile', scenario: '', now: 1000 }).game, W = 32; g.enemies = []; g.presentation = { effectiveQuality: 'low', reduceMotion: false };
  for (let y = 1; y <= 5; y++) for (let x = 2; x <= 14; x++) Object.assign(g.map.tiles[y * W + x], { blocked: false, elev: x <= 7 ? h : 0, slope: false, structure: undefined, buildingId: undefined });
  g.player.x = 6.2; g.player.y = 2.6; g.player.hp = g.save.maxHp; return g;
}
test('frame sequences: a short and a long fall flow from the walk-off through the loop into the landing without a pop', () => {
  for (const [h, minMs] of [[2, 350], [20, 2000]]) {
    const g = ledge(h), state = createHeroPoseState(asset), std = new Float64Array(6); let T = 50000, prev: Float32Array | null = null, most = 0, mostAt = '', fellMs = 0, prevArms = 0, armsJump = 0, lastArms = 0, landed = false;
    for (let i = 0; i < 240 && !(landed && T > g.fallLanded?.at + 400); i++) {
      T += 1000 / 60; g.update(1 / 60, { state: { x: i < 40 ? 1 : 0, y: 0 }, consume: () => false, held: () => false }, T);
      const fa: any = ordinaryFallPresentation(g, T, 0); if (g.fall) fellMs = g.fall.t * 1000; else if (fellMs) landed = true;
      const arms = fa ? sampleFallPose(fa.elapsedMs, fa.remainingMs, false, std)[0] : 0; armsJump = Math.max(armsJump, Math.abs(arms - prevArms)); if (fa) lastArms = arms; prevArms = arms;
      if (T < (g.player.landRollUntil || 0)) { prev = null; continue; }
      const m = mesh(fa, false, T, state, undefined, ordinaryLandingPresentation(g, T) ?? NaN);
      if (prev) { const d = delta(prev, m); if (d > most) { most = d; mostAt = `${g.fall ? `falling ${(g.fall.t * 1000).toFixed(0)} ms` : 'on the ground'}`; } } prev = m;
    }
    assert.ok(landed && fellMs >= minMs, `${h} levels: a fall of ${fellMs.toFixed(0)} ms`);
    // .045 before HERO_STAND (2026-11-26): the landing absorb now bends knees that were standing straight, so at the touchdown the
    // knee travels further in its first frames (.0518 at most, the knee; was .0407, the chest). Nothing else moves faster.
    assert.ok(most < .055, `${h} levels, Close View: at most ${most.toFixed(4)} m a frame (${mostAt})`);
    assert.ok(armsJump < .05, `${h} levels, Standard View: the hands' weight moves at most ${armsJump.toFixed(3)} a frame`);
    assert.ok(lastArms < .1, `${h} levels: the arms are down by the touchdown (${lastArms.toFixed(3)})`);
  }
});

test('interruptions: the drone\'s catch eases the arms down; a jump in the ground\'s distance never pops; a dodge or cast owns the body at once', () => {
  const step = 1000 / 60, catchAction = { kind: 'jump', phase: .67, durationMs: 420, jumpAir: null };
  const run = (release: boolean) => { const state = createHeroPoseState(asset); let T = 60000, prev = mesh(air(1500), false, T, state), most = 0;
    for (let t = 1500 + step; t < 2000; t += step) { T += step; const m = mesh(air(t), false, T, state); most = Math.max(most, delta(prev, m)); prev = m; }
    let first = 0; for (let k = 0; k < 20; k++) { T += step; const st = release ? state : createHeroPoseState(asset), m = mesh(null, false, T, st, k < 8 ? catchAction : null); const d = delta(prev, m); if (k === 0) first = d; else most = Math.max(most, d); prev = m; }
    return { first, most }; };
  const eased = run(true), cut = run(false);
  assert.ok(eased.first < cut.first * .5, `the catch: ${eased.first.toFixed(3)} m on its first frame (${cut.first.toFixed(3)} if the arms dropped at once)`);
  // (the catch's own 140 ms brace, the legacy jump layer, ends with the step it always had; the release adds none of its own)
  assert.ok(eased.most <= cut.most + .005, `and the release adds no pop after it (${eased.most.toFixed(4)} m; ${cut.most.toFixed(4)} without it)`);
  // The ground under a fall moving from near to far (stepping out over a deeper drop): the settled arms rise back, never in one frame.
  { const state = createHeroPoseState(asset); let T = 70000, prev = mesh(air(1800, 120), false, T, state), most = 0;
    for (let k = 1; k < 30; k++) { T += step; const m = mesh(air(1800 + k * step, k < 3 ? 120 - k * step : 3000), false, T, state); most = Math.max(most, delta(prev, m)); prev = m; }
    assert.ok(most < .05, `the far ground: at most ${most.toFixed(4)} m a frame`); }
  // A dodge (the landing roll's try) or a cast in the air: their own pose at once, and nothing of the fall comes back after it.
  for (const kind of ['dodge', 'cast']) { const state = createHeroPoseState(asset); mesh(air(2000), false, 80000, state);
    const own = mesh(null, false, 80000 + step, createHeroPoseState(asset), { kind, profile: kind === 'cast' ? 'cast' : 'dodge', phase: .3, durationMs: 260 }), mid = mesh(null, false, 80000 + step, state, { kind, profile: kind === 'cast' ? 'cast' : 'dodge', phase: .3, durationMs: 260 });
    assert.ok(delta(own, mid) < 1e-6, `${kind}: its own pose, untouched by the fall`);
    assert.ok(delta(mesh(null, false, 80000 + 3 * step, state), mesh(null, false, 80000 + 3 * step)) < 1e-6, `${kind}: no fall release after it`); }
});
