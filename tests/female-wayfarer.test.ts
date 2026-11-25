// The male or female Wayfarer (Tim, 2026-11-25): the save field, the creator, Close View's female body and braid, and
// Standard View's slimmer drawing. Presentation only; the male Wayfarer is the converted asset untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { ensureWayfarerBody, wayfarerBody, setWayfarerBody, WAYFARER_BODY } from '../src/journey-start.ts';
import { namedFresh } from '../src/persistence.ts';
import { decodeCloseViewHero, closeViewHeroBodyAsset, createHeroPoseState, createHeroFrame, sampleCloseViewHero, HERO_BODY_TRIANGLES, HERO_BRAID, HERO_FEMALE, HERO_PROPORTIONS } from '../src/close-view-hero.ts';
import { STD_FEMALE, stdBraidSide } from '../src/renderer.ts';

const meta = JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json', import.meta.url), 'utf8'));
const file = fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin', import.meta.url));
const male = decodeCloseViewHero(meta, file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)), female = closeViewHeroBodyAsset(male, 'female');
const input = (extra = {}) => ({ nowMs: 100000, reducedMotion: false, x: 3, y: 4, groundZ: .3, liftZ: 0, yaw: 0, height: 1.3776, speed: 0, gaitPhase: 0, action: null, alpha: 1, tint: [1, 1, 1], hitFlash: 0, ...extra });
const finite = (a, n = a.length) => { for (let i = 0; i < n; i++) if (!Number.isFinite(a[i])) return false; return true; };

test('save.wayfarer: fresh journeys and every old save are male; female survives a save and a load; unknown fields kept', () => {
  const fresh = freshSave();
  assert.deepEqual(fresh.wayfarer, { body: 'male' });
  const old = structuredClone(fresh); delete old.wayfarer;
  assert.equal(migrateSave(old).wayfarer.body, 'male');
  for (const body of [undefined, null, 'other', 7, ['female']]) assert.equal(migrateSave({ ...structuredClone(fresh), wayfarer: { body } }).wayfarer.body, 'male');
  assert.equal(migrateSave({ ...structuredClone(fresh), wayfarer: 'female' }).wayfarer.body, 'male');
  const kept = migrateSave(JSON.parse(JSON.stringify({ ...structuredClone(fresh), wayfarer: { body: 'female', later: 3 } })));
  assert.deepEqual(kept.wayfarer, { body: 'female', later: 3 });
  assert.equal(kept.version, 14);
  assert.deepEqual(WAYFARER_BODY.bodies, ['male', 'female']);
  const s = {}; ensureWayfarerBody(s); assert.equal(wayfarerBody(s), 'male'); assert.equal(setWayfarerBody(s, 'female'), 'female'); assert.equal(setWayfarerBody(s, 'nonsense'), 'male');
  assert.equal(wayfarerBody(null), 'male');
});

test('the creator\'s body choice is stored with the weapon and tool and persists through a save round trip', () => {
  const a = namedFresh('Ilse', 'BODY-SEED', { mode: 1, weapon: 'melee', tool: 'emitter', body: 'female' });
  assert.equal(a.wayfarer.body, 'female');
  assert.equal(migrateSave(JSON.parse(JSON.stringify(a))).wayfarer.body, 'female');
  assert.equal(namedFresh('Default', 'BODY-SEED').wayfarer.body, 'male');
  assert.equal(namedFresh('Odd', 'BODY-SEED', { body: 'x' }).wayfarer.body, 'male');
  // the creator asks it beside the weapon and tool, and passes it on; Options -> System can change it later
  const main = fs.readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /body=startBodyGroup\(\),choices=\[mode\.box,body\.box,weapon\.box,tool\.box\]/);
  assert.match(main, /weapon:weapon\.value\(\),tool:tool\.value\(\),body:body\.value\(\)/);
  assert.match(main, /if\(category==="System"\)\{wayfarerBodyRow\(grid\);/);
});

test('the female asset derives from the converted one: no bun, a braid, the same rig, within the body cap', () => {
  assert.equal(closeViewHeroBodyAsset(male, 'male'), male);
  assert.equal(closeViewHeroBodyAsset(male, 'female'), female); // cached
  assert.notEqual(female, male);
  assert.equal(female.body, 'female');
  assert.equal(female.braid.bunTriangles, 336); // the four source locks of the small back bun
  assert.ok(female.indexCount <= HERO_BODY_TRIANGLES * 3);
  assert.ok(female.vertexCount < male.vertexCount, 'the female body uploads fewer vertices per frame than the male one');
  assert.equal(female.braid.vertexCount, (HERO_BRAID.segments * HERO_BRAID.ringsPerSegment + 5) * HERO_BRAID.sides + 1);
  assert.equal(female.rest, male.rest); assert.equal(female.clips, male.clips); assert.equal(female.skins, male.skins); assert.equal(female.images, male.images);
  for (const i of female.arrays.indices.subarray(0, female.indexCount)) assert.ok(i < female.vertexCount);
  // the male asset is unchanged by the derivation
  assert.equal(male.vertexCount, 3602); assert.equal(male.indexCount, 9510); assert.equal(male.braid, undefined);
});

test('the female body is slimmer, with a smaller head, the same world height and gear sockets', () => {
  const m = createHeroPoseState(male), f = createHeroPoseState(female);
  assert.deepEqual(m.proportions, HERO_PROPORTIONS);
  assert.equal(f.headScale, HERO_FEMALE.proportions.head);
  const extent = (s, y0, y1) => { let x = 0; for (let v = 0; v < 972; v++) { const y = s.vertices[v * 6 + 1]; if (y > y0 && y < y1) x = Math.max(x, Math.abs(s.vertices[v * 6])); } return x; };
  assert.ok(extent(f, .3, .9) < extent(m, .3, .9) * .92, 'legs');
  assert.ok(extent(f, 1.05, 1.35) < extent(m, 1.05, 1.35) * .95, 'waist and hips');
  const fm = createHeroFrame(male), ff = createHeroFrame(female);
  assert.equal(sampleCloseViewHero(male, m, input(), fm), true); assert.equal(sampleCloseViewHero(female, f, input(), ff), true);
  const top = (fr, n) => { let z = -Infinity; for (let v = 0; v < n; v++) z = Math.max(z, fr.positionsNormals[v * 6 + 2]); return z; };
  assert.ok(Math.abs(top(ff, female.braid.firstVertex) - top(fm, male.vertexCount)) < .002, 'world height is the same');
  for (const k of [12, 13, 14]) { assert.ok(Number.isFinite(ff.leftSocket[k])); assert.ok(Number.isFinite(ff.rightSocket[k])); }
});

const ACTIONS = [null, { kind: 'melee', profile: 'melee', phase: .4, durationMs: 300 }, { kind: 'melee', profile: 'hammer', phase: .5, durationMs: 400 }, { kind: 'melee', profile: 'fist', phase: .3, durationMs: 380, fistStep: 2 },
  { kind: 'melee', profile: 'great-sweep', phase: .5, durationMs: 600 }, { kind: 'melee', profile: 'cinder-pike', phase: .4, durationMs: 300, poseMs: 1000 }, { kind: 'melee', profile: 'verge-cleaver', phase: .4, durationMs: 300, poseMs: 1000 },
  { kind: 'ranged', profile: 'emitter', phase: .5, durationMs: 300 }, { kind: 'ranged', profile: 'rift-bombard', phase: .5, durationMs: 300 }, { kind: 'ranged', profile: 'blunderbuss', phase: .5, durationMs: 300 }, { kind: 'ranged', profile: 'lumen-spindle', phase: .5, durationMs: 300 },
  { kind: 'cast', profile: 'cast', phase: .5, durationMs: 400 }, { kind: 'cast', profile: 'traversal-brace', phase: .5, durationMs: 400 }, { kind: 'dodge', phase: .4, durationMs: 260, moveX: 1, moveY: 0, poseMs: 1000 },
  { kind: 'jump', phase: .5, durationMs: 420 }, { kind: 'jump', profile: 'cling', phase: .5, durationMs: 420 }, { kind: 'hit', profile: 'hurt', phase: .3, durationMs: 300 }, { kind: 'hit', profile: 'knockdown', phase: .6, durationMs: 900 },
  { kind: 'death', profile: 'death', phase: 1, durationMs: 1200 }, { kind: 'interact', profile: 'cache-pickup', phase: .5, durationMs: 500 }, { kind: 'interact', profile: 'chest-open', phase: .5, durationMs: 500 },
  { kind: 'interact', profile: 'shovel-dig', phase: .5, durationMs: 500 }, { kind: 'interact', profile: 'stone-place', phase: .5, durationMs: 500 }, { kind: 'drink', profile: 'potion', phase: .5, durationMs: 600 }];
const HELD = [null, 'melee', 'cinder-pike', 'verge-cleaver', 'fist', 'hammer', 'emitter', 'great-sweep'];
const FORMS = [{}, { wayfarerKit: true }, { wayfarerKit: true, powerSuit: true }, { swim: { stroke: .3, tread: .5, move: 1, weight: 1 } }, { carbineHold: true, heldProfile: 'emitter' }, { heldTool: 'orrery' }];

test('Close View builds both bodies with every action, held weapon and form, kit and suit included', () => {
  for (const asset of [male, female]) {
    const s = createHeroPoseState(asset), f = createHeroFrame(asset);
    let t = 100000;
    for (const form of FORMS) for (const held of HELD) for (const action of ACTIONS) {
      t += 16; const ok = sampleCloseViewHero(asset, s, input({ nowMs: t, speed: action ? 0 : 1.2, gaitPhase: t / 300, heldProfile: held, handProfile: held, ...form, action }), f);
      assert.equal(ok, true, `${asset.body || 'male'} ${held} ${action?.kind}/${action?.profile} ${JSON.stringify(form)}`);
      assert.ok(finite(f.positionsNormals), `${asset.body || 'male'} finite ${held} ${action?.kind}/${action?.profile}`);
      if (form.wayfarerKit) assert.ok(f.kitVertexCount > 0);
      if (form.powerSuit) assert.ok(f.suitVertexCount > 0);
    }
  }
});

test('the braid hangs behind, sways with travel and turning, and stays bounded, finite and attached', () => {
  const s = createHeroPoseState(female), f = createHeroFrame(female), B = HERO_BRAID, first = female.braid.firstVertex;
  const braidTip = () => { const o = (first + female.braid.vertexCount - 1) * 6; return [f.positionsNormals[o], f.positionsNormals[o + 1], f.positionsNormals[o + 2]]; };
  assert.equal(sampleCloseViewHero(female, s, input({ reducedMotion: true }), f), true);
  const rest = braidTip(), points = s.braid.points;
  assert.ok(rest[0] < 3 - .1, 'facing +x (yaw 0), the braid hangs behind the Wayfarer');
  assert.ok(rest[2] > .3 + .4 && rest[2] < .3 + 1.1, 'about the middle of the back');
  // run forward, turn hard, stop: the tip moves, the chain never stretches or leaves its root
  let t = 200000, x = 3, yaw = 0, moved = 0; const length = B.length * 1.3776 / s.referenceHeight;
  for (let i = 0; i < 600; i++) {
    t += 16; const phase = i < 200 ? 'run' : i < 400 ? 'turn' : 'stop'; if (phase === 'run') x += .05; if (phase === 'turn') yaw += .08;
    assert.equal(sampleCloseViewHero(female, s, input({ nowMs: t, x, yaw, speed: phase === 'stop' ? 0 : 3, gaitPhase: t / 200 }), f), true);
    assert.equal(s.braid.points, points, 'no reallocation');
    assert.ok(finite(f.positionsNormals));
    for (let k = 1; k <= B.segments; k++) { const o = k * 3, d = Math.hypot(points[o] - points[o - 3], points[o + 1] - points[o - 2], points[o + 2] - points[o - 1]); assert.ok(Math.abs(d - s.braid.segment) < 1e-6); }
    const tip = braidTip(), root = [f.positionsNormals[first * 6], f.positionsNormals[first * 6 + 1], f.positionsNormals[first * 6 + 2]];
    assert.ok(Math.hypot(tip[0] - root[0], tip[1] - root[1], tip[2] - root[2]) <= length + .05);
    if (phase === 'turn') { const c = Math.cos(yaw), sn = Math.sin(yaw), bx = tip[0] - x, by = tip[1] - 4, back = -(bx * c + by * sn), side = -bx * sn + by * c; moved = Math.max(moved, Math.abs(side)); }
  }
  assert.ok(moved > .01, 'turning swings the braid out to the side');
  // a pause (the same clock) changes nothing; a teleport or a long gap hangs it at rest again
  const before = Float64Array.from(points);
  sampleCloseViewHero(female, s, input({ nowMs: t, x, yaw }), f); assert.deepEqual(Float64Array.from(points), before);
  assert.equal(sampleCloseViewHero(female, s, input({ nowMs: t + 5000, x: x + 40, yaw }), f), true); assert.ok(finite(f.positionsNormals));
  // reduced motion: no sway; the same pose gives the same braid
  sampleCloseViewHero(female, s, input({ nowMs: t + 6000, reducedMotion: true, x: 9, yaw: 1 }), f); const a = Float64Array.from(points);
  sampleCloseViewHero(female, s, input({ nowMs: t + 6016, reducedMotion: true, x: 9.2, yaw: 1.5 }), f); assert.deepEqual(Float64Array.from(points), a);
});

test('bounded cost: fixed braid size, no per-frame growth, sampling no dearer than the male body by much', () => {
  assert.equal(female.braid.triangles, 222);
  assert.ok(female.indexCount / 3 < male.indexCount / 3, 'fewer triangles than the male body (the bun is gone)');
  const time = (asset) => { const s = createHeroPoseState(asset), f = createHeroFrame(asset), runs = []; for (let i = 0; i < 260; i++) { const t0 = performance.now(); sampleCloseViewHero(asset, s, input({ nowMs: 1e5 + i * 16, speed: 2, gaitPhase: i / 10, x: 3 + i * .03, yaw: i * .02 }), f); if (i >= 60) runs.push(performance.now() - t0); } runs.sort((a, b) => a - b); return runs[runs.length >> 1]; };
  time(male); time(female);
  const m = time(male), f = time(female);
  assert.ok(f < m * 1.35 + .05, `female ${f.toFixed(3)} ms vs male ${m.toFixed(3)} ms`);
});

test('Standard View: a slimmer frame and a small braid over the off-hand shoulder, flipping with the facing', () => {
  assert.ok(STD_FEMALE.torso[2] < .44 && STD_FEMALE.head[2] < .36);
  assert.equal(stdBraidSide('left'), 1); // the blade is drawn on the left when facing left
  for (const f of ['right', 'down', 'up']) assert.equal(stdBraidSide(f), -1);
  const B = STD_FEMALE.braid; assert.ok(B.top + B.tieAt + B.tieH + B.tuft < -.33, 'it ends at about chest height');
  const src = fs.readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8');
  assert.match(src, /STD_BODY = wayfarerBody\(g\.save\)/);
});
