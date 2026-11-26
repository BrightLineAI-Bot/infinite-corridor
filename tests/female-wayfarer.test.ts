// The male or female Wayfarer (Tim, 2026-11-25): the save field, the creator, Close View's female body and braid, and
// Standard View's slimmer drawing. Presentation only; the male Wayfarer is the converted asset untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { ensureWayfarerBody, wayfarerBody, setWayfarerBody, WAYFARER_BODY } from '../src/journey-start.ts';
import { namedFresh } from '../src/persistence.ts';
import { decodeCloseViewHero, closeViewHeroBodyAsset, createHeroPoseState, createHeroFrame, sampleCloseViewHero, HERO_BODY_TRIANGLES, HERO_BRAID, HERO_FEMALE, HERO_PROPORTIONS, sculptHeroPoint } from '../src/close-view-hero.ts';
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
  assert.ok(extent(f, .3, .9) < extent(m, .3, .9) * .96, 'legs (fuller thighs since 2026-11-26, still slimmer than his)');
  assert.ok(extent(f, 1.05, 1.35) < extent(m, 1.05, 1.35) * .95, 'waist and hips');
  // Tim (2026-11-26): fuller, shapelier thighs and a gentle hip curve, with a small natural gap between the thighs (not closed)
  const S = HERO_FEMALE.sculpt, o = [0, 0, 0], at = (x, y) => sculptHeroPoint(S, x, y, 0, o)[0];
  // Tim (2026-11-26, later): the thighs a little slimmer (release 1075's thigh was .141 here, his .14), the gap still open
  assert.ok(at(.23, .75) - at(.09, .75) > .125 && at(.23, .75) - at(.09, .75) < .138, 'the thigh a little slimmer than release 1075, about his');
  assert.ok(at(.23, .4) - at(.09, .4) < .14 * .9, 'the calf still slim');
  assert.ok(at(.07, .75) > .04 && at(.07, .75) < .07, 'a small gap between the thighs, never closed');
  assert.ok(at(.25, 1.0) > .25 && at(.25, 1.0) > at(.25, 1.25), 'the hip curves out below the waist');
  const fm = createHeroFrame(male), ff = createHeroFrame(female);
  assert.equal(sampleCloseViewHero(male, m, input(), fm), true); assert.equal(sampleCloseViewHero(female, f, input(), ff), true);
  const top = (fr, n) => { let z = -Infinity; for (let v = 0; v < n; v++) z = Math.max(z, fr.positionsNormals[v * 6 + 2]); return z; };
  assert.ok(Math.abs(top(ff, female.braid.firstVertex) - top(fm, male.vertexCount)) < .002, 'world height is the same');
  for (const k of [12, 13, 14]) { assert.ok(Number.isFinite(ff.leftSocket[k])); assert.ok(Number.isFinite(ff.rightSocket[k])); }
});

test('a rounder backside (Tim, 2026-11-26): a bounded swell behind the hips; the front, sides, belt line and thigh gap kept', () => {
  const S = HERO_FEMALE.sculpt, flat = { ...S, glutes: { ...S.glutes, depth: 0 } }, o = [0, 0, 0];
  const at = (sc, x, y, z) => sculptHeroPoint(sc, x, y, z, o).slice();
  const swell = (x, y, z) => at(flat, x, y, z)[2] - at(S, x, y, z)[2];
  // the back of the hips swells back (rounder), a little: about 5 cm at the fullest since the waist was drawn in (2.7 cm in
  // release 1079), never more than the parameter
  assert.ok(swell(.1, .93, -.2) > .02 && swell(.1, .93, -.2) <= S.glutes.depth + 1e-9, `fullest ${swell(.1, .93, -.2).toFixed(4)}`);
  assert.ok(S.glutes.depth <= .06, 'natural, not exaggerated');
  assert.ok(swell(.1, .93, -.2) > swell(.1, .82, -.2) * 2 && swell(.1, .93, -.2) > swell(.1, 1.08, -.25) * 4, 'round: easing under into the thigh and up to the belt');
  assert.ok(swell(.1, 1.1, -.26) < .002, 'the belt line barely moves, so the belt neither clips nor floats');
  assert.ok(swell(0, .93, -.22) > 0 && swell(0, .93, -.22) < swell(.1, .93, -.2), 'eased toward the centre');
  // only behind: the front, the outside of the hip and the thigh plates (in front of z -.06) are untouched; x and y never move
  for (const [x, y, z] of [[.1, .93, .1], [.25, .93, -.03], [.2, 1.0, -.055], [.1, 1.7, -.2], [.1, .5, -.2]]) assert.equal(swell(x, y, z), 0, `${x} ${y} ${z}`);
  for (const [x, y, z] of [[.1, .93, -.2], [0, .9, -.25]]) { const a = at(S, x, y, z), b = at(flat, x, y, z); assert.equal(a[0], b[0]); assert.equal(a[1], b[1]); }
  // slimmer thighs, still with the slight natural gap
  assert.ok(S.thigh < 1.12 && S.thigh >= 1, 'thighs slimmer than release 1075, not thin');
  const gap = at(S, .07, .75, 0)[0]; assert.ok(gap > .04 && gap < .07, `gap ${gap.toFixed(4)}`);
});

test('a slimmer waist front to back (Tim, 2026-11-26): the belly and the small of the back drawn in, a gentle S from the side', () => {
  const S = HERO_FEMALE.sculpt, D = S.waistDepth, flat = { ...S, waistDepth: { ...D, back: 0, front: 0 } }, o = [0, 0, 0];
  const at = (sc, x, y, z) => sculptHeroPoint(sc, x, y, z, o).slice();
  const shift = (x, y, z) => at(S, x, y, z)[2] - at(flat, x, y, z)[2];
  assert.ok(D.back > .03 && D.back <= .06 && D.front > .01 && D.front <= .03, 'a little: the small of the back a few cm, the belly less');
  assert.ok(shift(0, D.y, -.29) > .03 && shift(0, D.y, .11) < -.01, 'the small of the back forward, the belly back');
  // a shift, not a squash: the back and the belt over it move together, and so do the belly and the buckle
  assert.ok(Math.abs(shift(0, D.y, -.25) - shift(0, D.y, -.30)) < 1e-9 && Math.abs(shift(0, D.y, .10) - shift(0, D.y, .17)) < 1e-9);
  // the bust, the backside, the thigh plates and the sides are untouched (under .1 mm); x and y never move
  for (const [x, y, z] of [[.1, 1.75, .2], [0, 1.65, .15], [.1, .95, -.25], [.2, 1.0, -.05], [.3, 1.24, -.05], [.2, 1.24, -.09]]) assert.ok(Math.abs(shift(x, y, z)) < 1e-4, `${x} ${y} ${z}`);
  { const a = at(S, .1, D.y, -.29), b = at(flat, .1, D.y, -.29); assert.equal(a[0], b[0]); assert.equal(a[1], b[1]); }
  // the side silhouette (fitted bind, |x| < .15): the waist now behind the backside instead of the deepest point of her back
  const P = createHeroPoseState(female).fit.positions, Q = createHeroPoseState(male).fit.positions;
  const band = (A, y0, y1, pick, init) => { let r = init; for (let v = 0; v < 972; v++) if (Math.abs(A[v * 3]) < .15 && A[v * 3 + 1] > y0 && A[v * 3 + 1] < y1) r = pick(r, A[v * 3 + 2]); return r; };
  const back = (A, y0, y1) => band(A, y0, y1, Math.min, 1), front = (A, y0, y1) => band(A, y0, y1, Math.max, -1);
  // before (release 1079): small of the back -.293 (behind the backside's -.251), belly .118; his -.300 and .121
  assert.ok(back(P, 1.2, 1.4) > back(Q, 1.2, 1.4) + .03 && back(P, 1.2, 1.4) < back(Q, 1.2, 1.4) + .07, 'the small of the back drawn in a little');
  assert.ok(back(P, .95, 1.0) < back(P, 1.2, 1.4) - .015, 'the backside rounds out below the waist');
  assert.ok(back(P, 1.2, 1.4) < back(P, 1.45, 1.65) - .02, 'and the back curves gently up to the shoulder blades');
  assert.ok(front(P, 1.1, 1.45) < front(Q, 1.1, 1.45) - .005 && front(P, 1.1, 1.45) > front(Q, 1.1, 1.45) - .03, 'the belly drawn in a little');
  assert.ok(front(P, 1.7, 1.85) > front(P, 1.1, 1.45) + .08, 'the bust still reads clearly above the waist');
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

test('the braid comes from behind the head over the off-hand shoulder and rests down the front; it sways, bounded, finite and attached', () => {
  const s = createHeroPoseState(female), f = createHeroFrame(female), B = HERO_BRAID, first = female.braid.firstVertex;
  const braidTip = () => { const o = (first + female.braid.vertexCount - 1) * 6; return [f.positionsNormals[o], f.positionsNormals[o + 1], f.positionsNormals[o + 2]]; };
  assert.equal(sampleCloseViewHero(female, s, input({ reducedMotion: true }), f), true);
  const rest = braidTip(), points = s.braid.points, root = [f.positionsNormals[first * 6], f.positionsNormals[first * 6 + 1], f.positionsNormals[first * 6 + 2]];
  // Tim (2026-11-26): forward over the shoulder of the hand that does not hold the blade (the rightSocket, her left), down her front
  assert.ok(root[0] < 3, 'it starts behind the head');
  assert.ok(rest[0] > 3 + .08, 'facing +x (yaw 0), it rests in front of the Wayfarer');
  assert.ok((rest[1] - 4) * (f.rightSocket[13] - 4) < 0 && (root[1] - 4) * (f.rightSocket[13] - 4) < 0, 'on the side away from the blade hand');
  assert.ok(rest[2] > .3 + .75 && rest[2] < .3 + 1.15, 'down the chest, above the hips');
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
  const B = STD_FEMALE.braid; assert.ok(B.top + B.tieAt + B.tieH + B.tuft < -.2, 'it ends at about chest height');
  // Tim (2026-11-26): it starts from behind the head (a lock beside the head, above the shoulder, drawn under the head), and the
  // plaits begin below the head's edge, never at the visor
  const H = STD_FEMALE.head, L = B.lock; assert.ok(L.x + L.width > H[0] + H[2] && L.x < H[0] + H[2], 'the lock shows beside the head');
  assert.ok(L.top + L.height >= H[1] + H[3] - .01 && L.top > STD_FEMALE.visor[1], 'it reaches the shoulder from behind the head');
  assert.ok(B.top - B.plait * .5 >= H[1] + H[3] - .035 && B.top > STD_FEMALE.visor[1] + STD_FEMALE.visor[3], 'the plaits begin below the head');
  assert.ok(STD_FEMALE.hips[2] > STD_FEMALE.torso[2] && STD_FEMALE.hips[1] > STD_FEMALE.torso[1] + .2, 'a gentle hip curve below the waist');
  const src = fs.readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8');
  assert.match(src, /STD_BODY = wayfarerBody\(g\.save\)/);
});
