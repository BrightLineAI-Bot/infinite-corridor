// The hero pose state keeps one hidden class (2026-11-28). A state that gained fields after it was built, or whose integer
// fields later held fractions, passed through a dozen maps while it was built and posed; build, deform, the braid and the
// sampler then saw dozens of maps per load site and went megamorphic. These hold the one shape, and that posing does not
// depend on what ran before it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import v8 from 'node:v8';
import { decodeCloseViewHero, closeViewHeroBodyAsset, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';

v8.setFlagsFromString('--allow-natives-syntax');
const sameMap = new Function('a', 'b', 'return %HaveSameMap(a, b);');
v8.setFlagsFromString('--no-allow-natives-syntax');

const meta = JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json', import.meta.url), 'utf8'));
const file = fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin', import.meta.url));
const male = decodeCloseViewHero(meta, file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)), female = closeViewHeroBodyAsset(male, 'female');
const input = (extra = {}) => ({ nowMs: 100000, reducedMotion: false, x: 3, y: 4, groundZ: .3, liftZ: 0, yaw: 0, height: 1.3776, speed: 0, gaitPhase: 0, action: null, alpha: 1, tint: [1, 1, 1], hitFlash: 0, ...extra });
const ACTIONS = [null, { kind: 'melee', profile: 'melee', phase: .4, durationMs: 300 }, { kind: 'melee', profile: 'hammer', phase: .5, durationMs: 400 }, { kind: 'melee', profile: 'fist', phase: .3, durationMs: 380, fistStep: 2 },
  { kind: 'melee', profile: 'great-sweep', phase: .5, durationMs: 600 }, { kind: 'melee', profile: 'cinder-pike', phase: .4, durationMs: 300, poseMs: 1000 }, { kind: 'melee', profile: 'verge-cleaver', phase: .4, durationMs: 300, poseMs: 1000 },
  { kind: 'ranged', profile: 'emitter', phase: .5, durationMs: 300 }, { kind: 'ranged', profile: 'rift-bombard', phase: .5, durationMs: 300 }, { kind: 'cast', profile: 'cast', phase: .5, durationMs: 400 },
  { kind: 'cast', profile: 'traversal-brace', phase: .5, durationMs: 400 }, { kind: 'dodge', phase: .4, durationMs: 260, moveX: 1, moveY: 0, poseMs: 1000 }, { kind: 'jump', phase: .5, durationMs: 420 },
  { kind: 'jump', profile: 'cling', phase: .5, durationMs: 420 }, { kind: 'hit', profile: 'hurt', phase: .3, durationMs: 300 }, { kind: 'hit', profile: 'knockdown', phase: .6, durationMs: 900 },
  { kind: 'death', profile: 'death', phase: 1, durationMs: 1200 }, { kind: 'interact', profile: 'cache-pickup', phase: .5, durationMs: 500 }, { kind: 'interact', profile: 'shovel-dig', phase: .5, durationMs: 500 },
  { kind: 'interact', profile: 'stone-place', phase: .5, durationMs: 500 }, { kind: 'drink', profile: 'potion', phase: .5, durationMs: 600 }];
const HELD = [null, 'melee', 'cinder-pike', 'verge-cleaver', 'fist', 'great-sweep'];
const FORMS = [{}, { wayfarerKit: true }, { wayfarerKit: true, powerSuit: true }, { swim: { stroke: .3, tread: .5, move: 1, weight: 1 } }, { carbineHold: true, heldProfile: 'emitter' }, { heldTool: 'orrery' }];
const sweep = (asset, s, f) => { let t = 100000; for (const form of FORMS) for (const held of HELD) for (const action of ACTIONS) { t += 16; assert.equal(sampleCloseViewHero(asset, s, input({ nowMs: t, speed: action ? 0 : 1.2, gaitPhase: t / 300, heldProfile: held, handProfile: held, ...form, action }), f), true); } };
const walk = (asset, s, f, n = 90) => { const out = []; for (let i = 0; i < n; i++) { sampleCloseViewHero(asset, s, input({ nowMs: 2e5 + i * 16, speed: (i % 45) / 12, gaitPhase: i / 9, x: 3 + i * .03, yaw: Math.sin(i / 20) }), f); out.push(Float32Array.from(f.positionsNormals)); if (s.braid) out.push(Float64Array.from(s.braid.points)); } return out; };

test('his and her pose states share one hidden class from birth, through every action and form, and after it', () => {
  const sm = createHeroPoseState(male), sf = createHeroPoseState(female);
  assert.ok(sameMap(sm, sf), 'his and her fresh states');
  assert.ok(sameMap(sm, createHeroPoseState(male)), 'two of his');
  for (const [asset, s] of [[male, sm], [female, sf]]) {
    const keys = Object.keys(s), f = createHeroFrame(asset), frameKeys = Object.keys(f);
    sweep(asset, s, f);
    assert.deepEqual(Object.keys(s), keys, `${asset.body || 'male'}: posing adds no field to the state`);
    assert.deepEqual(Object.keys(f), frameKeys, `${asset.body || 'male'}: or to the frame`);
    assert.ok(sameMap(s, createHeroPoseState(asset)), `${asset.body || 'male'}: a fraction in a number field changed no map (born doubles)`);
    assert.ok(sameMap(f, createHeroFrame(asset)));
  }
  assert.ok(sameMap(sm, sf), 'still one shape for both after every action');
});

test('posing does not depend on what ran before it: a state made after the sweep draws the same frames as one made before', () => {
  for (const asset of [male, female]) {
    const early = createHeroPoseState(asset), ef = createHeroFrame(asset);
    { const s = createHeroPoseState(asset); sweep(asset, s, createHeroFrame(asset)); }
    const late = createHeroPoseState(asset), lf = createHeroFrame(asset);
    assert.deepEqual(walk(asset, late, lf), walk(asset, early, ef), `${asset.body || 'male'}: bit for bit`);
    assert.equal(early.aerialW, 0, 'nothing to ease out before an Aerial Step');
  }
});
