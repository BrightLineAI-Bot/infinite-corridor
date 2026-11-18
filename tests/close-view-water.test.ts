// Close View on water (Tim's report 2026-11-18): the water figure Close View draws comes from the same state Standard View
// reads (renderer.ts: boat.aboard, boat.mechSub / boat.sub, the empowered mech at sea, swimming), never from mechUp() alone,
// which is false aboard. Pose selection, depths, the swim clocks, the hero's swim layer and the shader's waterline cut.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CLOSE_VIEW_WATER, closeViewWaterState, closeViewPlayerForm, closeViewWaterLift, closeViewSwimPhases, playerFormPresentation } from '../src/close-view-player-presentation.ts';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';
import { modelSupported } from '../src/close-view-models.ts';
import { OUTDOOR } from '../src/close-view-outdoor.ts';
import { SEA_SUIT } from '../src/renderer.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';

// A plain stand-in carrying only what the selection reads (mechUp as game.ts defines it: never while aboard).
function stub({ swimming = false, aboard = false, mechSub = false, sub = false, mech = false, empowered = false, drone = false, area = 'overworld' } = {}) {
  const save = { boat: { owned: aboard, aboard, mechSub, sub }, mech: { built: true, active: mech, mode: drone ? 'drone' : 'robot', empowered }, magicSkills: {}, equipment: {} };
  return { area, swimming, save, mechUp() { return save.mech.active === true && save.mech.mode !== 'drone' && !save.boat.aboard; }, fistsEquipped: () => false };
}

test('Close View water: every state picks the water figure Standard View draws', () => {
  const W = CLOSE_VIEW_WATER;
  assert.equal(closeViewWaterState(stub()), null, 'on land: nothing');
  assert.equal(closeViewWaterState(stub({ mech: true })), null, 'the robot ashore is the land form');
  assert.equal(closeViewWaterState(stub({ swimming: true })), W.swim, 'the Tidemantle: swimming');
  assert.equal(closeViewWaterState(stub({ swimming: true, area: 'dungeon' })), W.swim, 'flooded halls swim too');
  assert.equal(closeViewWaterState(stub({ swimming: true, mech: true })), W.wade, 'the robot wades');
  assert.equal(closeViewWaterState(stub({ swimming: true, mech: true, empowered: true })), W.suitWade, 'the power armor wades');
  assert.equal(closeViewWaterState(stub({ aboard: true })), W.boat, 'aboard the skiff');
  assert.equal(closeViewWaterState(stub({ aboard: true, mechSub: true, mech: true })), W.robotSea, "the robot put to sea: the robot's water form");
  assert.equal(closeViewWaterState(stub({ aboard: true, sub: true })), W.robotSea, 'the submersible: the same water form');
  assert.equal(closeViewWaterState(stub({ aboard: true, mechSub: true, mech: true, empowered: true })), W.suitSea, 'empowered at sea: the power armor hovers (renderer.ts _seaSuit)');
  assert.equal(closeViewWaterState(stub({ aboard: true, sub: true, mech: false, empowered: true })), W.robotSea, 'a submersible voyage without the active suit stays the submersible');
  assert.equal(closeViewWaterState(stub({ aboard: true, area: 'dungeon' })), null, 'the boat is an overworld state');
  assert.equal(closeViewWaterState(null), null);
});

test('Close View water: the robot and the suit at sea are drawn although mechUp() is false aboard (the root cause)', () => {
  for (const [opts, kind] of [[{ aboard: true, mechSub: true, mech: true }, 'playerRobot'], [{ aboard: true, sub: true }, 'playerRobot'], [{ aboard: true, mechSub: true, mech: true, empowered: true }, 'playerPowerSuit']]) {
    const g = stub(opts);
    assert.equal(g.mechUp(), false, 'aboard, the mech is not "up"');
    assert.equal(playerFormPresentation(g), null, 'so the land selection alone drew the ordinary Wayfarer');
    const form = closeViewPlayerForm(g);
    assert.equal(form?.kind, kind); assert.equal(form.mech, true); assert.equal(form.empowered, kind === 'playerPowerSuit'); assert.equal(form.lift, 0);
    assert.equal(closeViewPlayerForm(g), form, 'one frozen descriptor per form: no allocation a frame');
  }
  for (const opts of [{}, { swimming: true }, { aboard: true }, { swimming: true, mech: true }, { swimming: true, mech: true, empowered: true }, { mech: true, empowered: true }]) {
    const g = stub(opts); assert.deepEqual(closeViewPlayerForm(g), playerFormPresentation(g), 'elsewhere the land forms are unchanged');
  }
});

test('Close View water: the real game agrees (aboard with the robot put to sea, the suit at sea, swimming)', () => {
  const { game: g } = createLabFixture({ lab: 'landscape', scenario: 'sea', seed: 'TIDE', now: 1000 });
  g.enemies = []; const s = g.save;
  s.mech = Object.assign(s.mech || {}, { built: true, active: true, mode: 'robot', empowered: false });
  Object.assign(s.boat, { owned: true, aboard: true, hull: 60, mechSub: true });
  assert.equal(g.mechUp(), false);
  assert.equal(closeViewWaterState(g), CLOSE_VIEW_WATER.robotSea); assert.equal(closeViewPlayerForm(g).kind, 'playerRobot');
  s.mech.empowered = true;
  assert.equal(closeViewWaterState(g), CLOSE_VIEW_WATER.suitSea); assert.equal(closeViewPlayerForm(g).kind, 'playerPowerSuit');
  Object.assign(s.boat, { aboard: false, mechSub: false }); s.mech.active = false; g.swimming = true;
  assert.equal(closeViewWaterState(g), CLOSE_VIEW_WATER.swim); assert.equal(closeViewPlayerForm(g), null);
});

test('Close View water: depths, hover and bob; the suit matches Standard View', () => {
  const W = CLOSE_VIEW_WATER;
  assert.equal(W.suitSea.hover, SEA_SUIT.hover); assert.equal(W.suitSea.bob, SEA_SUIT.bob); assert.equal(W.suitSea.bobMs, SEA_SUIT.bobMs);
  assert.equal(closeViewWaterLift(null, 0), 0);
  for (const water of Object.values(W)) if (water?.mode) {
    for (const t of [0, 123, 4567, 1e6]) for (const reduce of [false, true]) for (const diving of [false, true]) for (const move of [0, .5, 1]) assert.ok(Number.isFinite(closeViewWaterLift(water, t, reduce, diving, move)));
    assert.equal(closeViewWaterLift(water, 777, true), closeViewWaterLift(water, 12345, true), `${water.mode}: reduced motion holds still`);
    assert.ok(Math.abs(closeViewWaterLift(water, 777) - closeViewWaterLift(water, 0, true)) <= water.bob + 1e-9, `${water.mode}: a gentle bob`);
  }
  assert.ok(closeViewWaterLift(W.suitSea, 0, true) > .25, 'the suit hovers over the sea');
  assert.ok(closeViewWaterLift(W.robotSea, 0, true) < -.4, "the robot's water form rides low");
  assert.ok(closeViewWaterLift(W.robotSea, 0, true, true) < closeViewWaterLift(W.robotSea, 0, true), 'diving sinks it');
  assert.ok(closeViewWaterLift(W.suitSea, 0, true, true) < 0, 'the suit dives under too');
  assert.ok(closeViewWaterLift(W.swim, 0, true, false, 1) > closeViewWaterLift(W.swim, 0, true, false, 0), 'the crawl lies higher than the tread');
  assert.ok(closeViewWaterLift(W.wade, 0, true) < 0 && closeViewWaterLift(W.boat, 0, true) <= 0);
  assert.ok(W.cut > 1 && W.cut < 2, 'the waterline cut stays local to the Wayfarer');
});

test('Close View water: the swim clocks follow the distance swum and the logical clock; reduced motion holds still', () => {
  const out = new Float64Array(2);
  assert.equal(closeViewSwimPhases(Math.PI, 0, false, out), out);
  assert.ok(Math.abs(out[0] - .5) < 1e-9 && out[1] === 0);
  closeViewSwimPhases(0, CLOSE_VIEW_WATER.stroke.treadMs * 1.25, false, out); assert.ok(out[0] === 0 && Math.abs(out[1] - .25) < 1e-9);
  closeViewSwimPhases(-1, -500, false, out); assert.ok(out[0] >= 0 && out[0] < 1 && out[1] >= 0 && out[1] < 1);
  closeViewSwimPhases(2.2, 999, true, out); const held = [...out]; closeViewSwimPhases(5.1, 77777, true, out); assert.deepEqual([...out], held);
  closeViewSwimPhases(NaN, NaN, false, out); assert.deepEqual([...out], [0, 0]);
});

const meta = JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json', import.meta.url), 'utf8')), raw = fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin', import.meta.url));
const asset = decodeCloseViewHero(meta, raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
function sample(swim, extra = {}) {
  const st = createHeroPoseState(asset), f = createHeroFrame(asset);
  const ok = sampleCloseViewHero(asset, st, { nowMs: 2000, reducedMotion: false, x: 3, y: 4, groundZ: -.08, liftZ: 0, yaw: 0, height: 1.3776, speed: 0, gaitPhase: 0, heldProfile: 'melee', handProfile: 'melee', action: null, alpha: 1, tint: [1, 1, 1], hitFlash: 0, swim, ...extra }, f);
  const g = st.global, at = (n) => [g[n * 16 + 12], g[n * 16 + 13], g[n * 16 + 14]];
  let zLo = Infinity, zHi = -Infinity, xLo = Infinity, xHi = -Infinity, finite = true; const v = f.positionsNormals;
  for (let i = 0; i < v.length; i += 6) { if (!Number.isFinite(v[i]) || !Number.isFinite(v[i + 1]) || !Number.isFinite(v[i + 2])) finite = false; zLo = Math.min(zLo, v[i + 2]); zHi = Math.max(zHi, v[i + 2]); xLo = Math.min(xLo, v[i]); xHi = Math.max(xHi, v[i]); }
  return { ok, st, f, head: at(3), hips: at(33), zLo, zHi, xLo, xHi, finite };
}

test('Close View water: the hero treads water upright and swims the crawl laid out along the surface', () => {
  const land = sample(null), tread = sample({ stroke: 0, tread: .25, move: 0, weight: 1 }), crawl = sample({ stroke: .25, tread: 0, move: 1, weight: 1 });
  for (const s of [land, tread, crawl]) { assert.equal(s.ok, true); assert.equal(s.finite, true); }
  assert.equal(tread.st.clip, 'derived-tread'); assert.equal(crawl.st.clip, 'derived-swim'); assert.notEqual(land.st.clip, 'derived-swim');
  // treading: upright, drawn from the hips (so liftZ is their depth under the surface): the head well above them
  assert.ok(tread.head[1] - tread.hips[1] > .7, 'the tread stays upright');
  assert.ok(tread.zLo < -.08 - .3 && tread.zHi > -.08 + .5, 'the tread hangs from the hips: legs below, head and shoulders above');
  // the crawl: the head ahead of the hips (forward is model +Z, world +X at yaw 0) and not far above them
  assert.ok(crawl.head[2] - crawl.hips[2] > .6, 'laid out forward');
  assert.ok(crawl.head[1] - crawl.hips[1] < .5 * (tread.head[1] - tread.hips[1]), 'nearly level');
  assert.ok(crawl.zHi - crawl.zLo < .8 * (land.zHi - land.zLo), 'lower in the water than a standing body');
  assert.ok(crawl.xHi - 3 > .45, 'the body reaches ahead of the Wayfarer');
  // the stroke moves the arms, and a pace in between blends the two whole poses
  const later = sample({ stroke: .5, tread: 0, move: 1, weight: 1 }), half = sample({ stroke: .25, tread: .25, move: .5, weight: 1 });
  const hand = (s) => [s.st.global[7 * 16 + 12], s.st.global[7 * 16 + 13], s.st.global[7 * 16 + 14]];
  assert.ok(Math.hypot(...hand(crawl).map((q, i) => q - hand(later)[i])) > .3, 'the arms wheel through the stroke');
  assert.equal(half.finite, true); assert.ok(half.head[2] - half.hips[2] > tread.head[2] - tread.hips[2] && half.head[2] - half.hips[2] < crawl.head[2] - crawl.hips[2]);
  // reduced motion and any accepted action: still valid; an action owns the body (no swim layer)
  assert.equal(sample({ stroke: .3, tread: .3, move: 1, weight: 1 }, { reducedMotion: true }).finite, true);
  const acting = sample({ stroke: .25, tread: 0, move: 1, weight: 1 }, { action: { kind: 'hit', profile: 'hurt', phase: .5, durationMs: 300 } });
  assert.equal(acting.ok, true); assert.notEqual(acting.st.clip, 'derived-swim');
  assert.equal(sample({ stroke: .25, tread: 0, move: 1, weight: 0 }).st.clip === 'derived-swim', false, 'zero weight: no swim');
});

test('Close View water: the skiff model, the shader waterline cut and the open sea are wired', () => {
  assert.equal(modelSupported('playerSkiff'), true);
  const S = OUTDOOR.sea; for (const k of ['swell', 'wavenumber', 'speed', 'reach']) assert.ok(Number.isFinite(S[k]) && S[k] > 0, k);
  const gl = fs.readFileSync(new URL('../src/close-view-gl.ts', import.meta.url), 'utf8'), hero = fs.readFileSync(new URL('../src/close-view-hero-gl.ts', import.meta.url), 'utf8'), cv = fs.readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8');
  for (const src of [gl, hero]) assert.match(src, /uniform vec4 u_water;/, 'the model and hero programs know the waterline');
  assert.match(gl, /u_water\.w > 0\.0 && dot\(v_pos\.xy - u_water\.xy, v_pos\.xy - u_water\.xy\) < u_water\.w \? v_pos\.z < u_water\.z : v_pos\.z < 0\.0/);
  assert.match(hero, /u_water\.w>0\.0&&dot\(v_pos\.xy-u_water\.xy,v_pos\.xy-u_water\.xy\)<u_water\.w\?v_pos\.z<u_water\.z:v_pos\.z<0\.0/);
  assert.match(gl, /uniform vec4 u_sea;/);
  // the regression itself: Close View chooses its body through the water-aware selection, never the land one alone
  assert.doesNotMatch(cv, /playerFormPresentation\(/);
  assert.match(cv, /const form = closeViewPlayerForm\(g\), water = closeViewWaterState\(g\)/);
});
