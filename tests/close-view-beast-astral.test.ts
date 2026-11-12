// The Astral Worm in Close View (src/close-view-beast-astral.ts on the shared beast rig): every form on one body, morphing on
// the game's own clock, driven by the real actor adapter (updateAstralActor).
import test from 'node:test';
import assert from 'node:assert/strict';
import { BEAST_SLOT } from '../src/close-view-beast-rig.ts';
import { ASTRAL_CV_RIG, ASTRAL_SKELETON, astralMesh, createAstralTrack, sampleAstral, astralBone, astralRidden } from '../src/close-view-beast-astral.ts';
import { CLOSE_VIEW_BEASTS, closeViewBeastEligible } from '../src/close-view-beasts.ts';
import { ASTRAL, ASTRAL_MOVES, startAstralMove, updateAstralActor, astralBeamAnchors } from '../src/astral-worm.ts';
import { createCombatant } from '../src/combat.ts';

function world(player = { x: 30, y: 20 }) {
  const open = (x, y) => x >= 1 && y >= 1 && x < 63 && y < 43;
  const w = {
    player: { ...player, hp: 1e9, maxHp: 1e9, dodgeUntil: 0 }, width: 64, height: 44, dt: 1 / 60, now: 0, enemies: [], los: () => true,
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt() { return true; }, groundHeight: () => 0,
    spawnMinion(owner, kind, x, y) { const m = createCombatant(kind, x, y, true, []); w.enemies.push(m); return m; },
  };
  return w;
}
const scaleOf = (e) => Math.max(.6, e.scale || 1) * ASTRAL_CV_RIG.closeViewScale;
const env = (e, now, extra = {}) => ({ x: e.x + .5, y: e.y + .82, z: 0, scale: scaleOf(e), now, reduce: false, tier: 'full', target: { x: 30, y: 20 }, dead: false, ...extra });
// A fight in which the Worm only ever uses `only` (forced through the game's own startAstralMove each time it is free).
function fight(only, seconds, each, { player = { x: 30, y: 20 } } = {}) {
  const w = world(player), e = createCombatant('astralWorm', 24, 20, true, []), tr = createAstralTrack(); let now = 1000;
  Object.assign(e, { id: 'astral-cv', aggro: true, hp: 5e5, maxHp: 1e6, damage: 40 }); w.enemies.push(e);
  for (let t = 0; t < seconds; t += w.dt) {
    w.now += w.dt * 1000; now += w.dt * 1000;
    if (e.astral && !e.astral.move && e.astral.recovery < ASTRAL.recovery - .2) startAstralMove(e.astral, only, w.player);
    updateAstralActor(e, w);
    each(sampleAstral(tr, e, env(e, now, { target: w.player })), e, tr, now, w);
  }
}
const finite = (a) => { for (const v of a) if (!Number.isFinite(v)) return false; return true; };
// the angle between two bones' forward axes (the jaw against the upper head: the bite's gape)
const axisOf = (tr, name) => { const i = ASTRAL_SKELETON.index[name] * 9, W = tr.pose.wr, l = Math.hypot(W[i], W[i + 1], W[i + 2]); return [W[i] / l, W[i + 1] / l, W[i + 2] / l]; };
const angleBetween = (tr, a, b) => { const p = axisOf(tr, a), q = axisOf(tr, b); return Math.acos(Math.max(-1, Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2]))); };
const gapeOf = (tr) => angleBetween(tr, 's0', 'jaw');
const scaleOfBone = (tr, name) => { const i = ASTRAL_SKELETON.index[name] * 9, W = tr.pose.wr; return Math.hypot(W[i], W[i + 1], W[i + 2]); };

test('the mesh: bounded per tier, valid, cached; registered, with the ridden Worm on its billboard', () => {
  assert.ok(ASTRAL_SKELETON.count <= BEAST_SLOT.maxBones);
  let prev = Infinity;
  for (const tier of ['full', 'balanced', 'low']) {
    const m = astralMesh(tier);
    assert.ok(m.coreTriangles <= BEAST_SLOT.triangles[tier], `${tier}: ${m.coreTriangles}`); assert.ok(m.coreTriangles < prev); prev = m.coreTriangles;
    assert.ok(m.triangles <= BEAST_SLOT.triangles[tier] * 1.3, `${tier} with the flight parts: ${m.triangles}`);
    for (const i of m.indices) assert.ok(i < m.vertexCount);
    for (let v = 0; v < m.vertexCount; v++) assert.ok(Math.abs(Math.hypot(m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]) - 1) < 1e-3);
    for (let v = 0; v < m.vertexCount; v++) assert.ok(m.skin[v * 4] < ASTRAL_SKELETON.count && m.skin[v * 4 + 2] < ASTRAL_SKELETON.count && m.skin[v * 4 + 1] <= 4);
    assert.strictEqual(astralMesh(tier), m);
  }
  const e = createCombatant('astralWorm', 1, 1, true, []); e.id = 'worm-1';
  assert.equal(CLOSE_VIEW_BEASTS.astralWorm.scale, 1.25); assert.ok(closeViewBeastEligible(e)); assert.ok(closeViewBeastEligible(e, { enemies: [e] }));
  const rider = { id: 'walker-1', kind: 'voidWalker', hp: 10, astralMount: { ownerId: 'worm-1', status: 'mounted' } }, scene = { enemies: [e, rider] };
  assert.ok(astralRidden(e, scene) && !closeViewBeastEligible(e, scene), 'ridden: the billboard draws the saddle');
  for (const status of ['boarding', 'landing']) { rider.astralMount.status = status; assert.ok(!closeViewBeastEligible(e, scene), status); }
  rider.astralMount.status = 'dismounted'; assert.ok(closeViewBeastEligible(e, scene), 'the rider got down');
  assert.ok(!closeViewBeastEligible(createCombatant('astralMirage', 1, 1, true, [])), 'the Mirages stay billboards');
});

test('every move plays without a broken frame, in its own form', () => {
  const formOf = { pool: 'pool', trample: 'trample', bite: 'bite', flight: 'flight', mirage: 'worm', griffin: 'griffin', rings: 'worm', inkWorm: 'worm', inkPool: 'pool', inkTrample: 'trample' };
  for (const move of ASTRAL_MOVES) {
    let frames = 0, phases = new Set();
    fight(move, 7, (f, e) => {
      assert.ok(f && finite(f.skin), `${move}: finite`); assert.ok(f.emitK.every((k) => k >= 0 && k <= 3) && f.emitA.every((a) => a >= 0 && a <= 1));
      if (e.astral?.move === move) { frames++; phases.add(f.phase.split(':').at(-1)); assert.ok(f.phase.startsWith(formOf[move] + ':'), `${move}: ${f.phase}`); }
    });
    assert.ok(frames > 60, move); assert.ok(phases.has('active'), `${move}: ${[...phases]}`);
  }
});

test('the morph follows the game clock: limbs grow in and are drawn back', () => {
  const seen = [];
  fight('trample', 4, (f, e, tr) => { seen.push([e.astral?.form, scaleOfBone(tr, 'limb1L') / f.scale, e.astral ? (e.astral.clock - e.astral.morphStart) / ASTRAL.morphTime : 1]); });
  const grown = seen.filter(([form, s, k]) => form === 'trample' && k > 1.05), growing = seen.filter(([form, s, k]) => form === 'trample' && k > .2 && k < .8), gone = seen.filter(([form, s, k]) => form === 'worm' && k > 1.05);
  assert.ok(grown.length && grown.every(([, s]) => s > .95), 'the limbs are out');
  assert.ok(growing.length && growing.every(([, s]) => s > .01 && s < .95), 'growing on the morph clock');
  assert.ok(gone.length && gone.every(([, s]) => s < .01), 'drawn back into the worm');
});

test('the flier: lifted, its beam strikes where the game\'s beam hazard stands', () => {
  let n = 0, high = 0;
  fight('flight', 4, (f, e, tr) => {
    const s = e.astral; if (s?.move !== 'flight' || s.elapsed < ASTRAL.windup || s.clock - s.morphStart < ASTRAL.morphTime) return;
    const g = astralBeamAnchors({ ...s, x: e.x, y: e.y, scale: Math.max(.6, e.scale || 1) }).ground, foot = astralBone(tr, 'beamFoot');
    assert.ok(Math.hypot(foot[0] - (g.x + .5), foot[1] - (e.y + .82)) < .02, `the beam lands on its hazard (${foot[0].toFixed(2)} vs ${(g.x + .5).toFixed(2)})`);
    assert.ok(f.cloud && f.emitA[3] === 1 && f.emitK[3] > 1, 'the beam glows');
    high = Math.max(high, astralBone(tr, 'body')[2] / f.scale); n++;
  }, { player: { x: 20, y: 20 } });
  assert.ok(n > 30); assert.ok(high > ASTRAL_CV_RIG.hover + ASTRAL_CV_RIG.flightLift * .9, `it flies (${high.toFixed(2)})`);
  let beamWhileWorm = false; fight('bite', 3, (f) => { if (f.emitA[3] > 0) beamWhileWorm = true; }); assert.ok(!beamWhileWorm, 'no beam outside the flight');
});

test('the griffin stands on its paws, crouches and leaps on the pounce clock; the bite gapes and snaps', () => {
  let stand = Infinity, crouch = Infinity, leap = 0, S = 1;
  fight('griffin', 5, (f, e, tr) => {
    const s = e.astral; if (s?.move !== 'griffin' || s.elapsed < ASTRAL.morphTime + .05) return; S = f.scale;
    const p = s.elapsed % ASTRAL.pounceGap, body = astralBone(tr, 'body')[2] / S;
    if (p < ASTRAL.pounceWindup) { crouch = Math.min(crouch, body); if (p < .05) stand = Math.min(stand, body); }
    else if (p < ASTRAL.pounceWindup + ASTRAL.pounceActive) leap = Math.max(leap, body);
  });
  assert.ok(crouch < stand - .1 && leap > stand + .25, `crouch ${crouch.toFixed(2)}, stand ${stand.toFixed(2)}, leap ${leap.toFixed(2)}`);
  // the paws (the lower leg's far end) on the ground while it stands
  let low = Infinity;
  fight('griffin', 3, (f, e, tr) => { const s = e.astral; if (s?.move === 'griffin' && s.elapsed > .45 && s.elapsed < .5) { const i = ASTRAL_SKELETON.index.hlR, P = tr.pose; const z = P.wp[i * 3 + 2] - P.wr[i * 9 + 8] * .31; low = Math.min(low, z / f.scale); } });
  assert.ok(Math.abs(low) < .08, `paws on the ground (${low.toFixed(3)})`);
  let gape = 0, shut = Infinity;
  fight('bite', 4, (f, e, tr) => { const s = e.astral; if (s?.move !== 'bite' || s.elapsed < ASTRAL.windup) return; const d = gapeOf(tr), p = (s.elapsed - ASTRAL.windup) % ASTRAL.biteGap;
    if (p < ASTRAL.biteActive) shut = Math.min(shut, d); else if (p > ASTRAL.biteGap * .8) gape = Math.max(gape, d); });
  assert.ok(gape > shut + .6, `gape ${gape.toFixed(2)}, shut ${shut.toFixed(2)}`);
  let spikes = 0;
  fight('pool', 3, (f, e, tr) => { if (e.astral?.move === 'pool' && e.astral.elapsed > ASTRAL.windup + .1) spikes = Math.max(spikes, scaleOfBone(tr, 'spikes') / f.scale); });
  assert.ok(spikes > .9, 'the pool\'s spikes erupt');
});

test('deterministic', () => {
  const run = () => { const out = []; fight('griffin', 3, (f) => out.push(Array.from(f.skin.subarray(0, ASTRAL_SKELETON.count * 12)))); return out; };
  assert.deepEqual(run(), run());
});

test('death; reduced motion; no astral state yet', () => {
  const e = createCombatant('astralWorm', 10, 10, true, []), tr = createAstralTrack(); let now = 1000;
  let g = sampleAstral(tr, e, env(e, now)), n = 0; assert.ok(g && finite(g.skin), 'before its state exists it is the worm');
  while (g && n < 1000) { g = sampleAstral(tr, e, env(e, now += 16, { dead: true })); if (g) assert.ok(finite(g.skin)); n++; }
  assert.ok(n < 1000 && g == null, 'it melts and is gone');
  for (const form of ['worm', 'griffin', 'flight', 'bite']) {
    const r = createAstralTrack(), e2 = createCombatant('astralWorm', 10, 10, true, []);
    e2.astral = { form, previousForm: 'worm', clock: 3, morphStart: 2.9, move: form === 'worm' ? null : form, elapsed: 1, facingX: 1, flightLiftExtra: 0 };
    sampleAstral(r, e2, env(e2, 1000, { reduce: true }));
    const a = Array.from(sampleAstral(r, e2, env(e2, 1016, { reduce: true })).skin); assert.deepEqual(Array.from(sampleAstral(r, e2, env(e2, 4000, { reduce: true })).skin), a, form);
  }
});

test('the bite is the head itself: the jaw gapes from the hinge over the gap and slams shut on the game\'s active window', () => {
  // the mesh: the lower half of the head bead, its gum and its teeth ride the jaw; the upper half and its teeth the head
  const m = astralMesh('full'), jaw = ASTRAL_SKELETON.index.jaw, head = ASTRAL_SKELETON.index.s0, tooth = [0xbf / 255, 0xb5 / 255, 0xa6 / 255];
  let jawTeeth = 0, headTeeth = 0, jawSkin = 0;
  for (let v = 0; v < m.vertexCount; v++) {
    const isTooth = Math.abs(m.colors[v * 3] - tooth[0]) < 1e-3 && Math.abs(m.colors[v * 3 + 1] - tooth[1]) < 1e-3 && Math.abs(m.colors[v * 3 + 2] - tooth[2]) < 1e-3;
    const onJaw = m.skin[v * 4] === jaw || (m.skin[v * 4 + 2] === jaw && m.skin[v * 4 + 3] > .5);
    if (v < m.coreIndices && onJaw) jawSkin++;
    if (isTooth && onJaw) jawTeeth++; else if (isTooth && m.skin[v * 4] === head) headTeeth++;
  }
  assert.ok(jawSkin > 60 && jawTeeth > 10 && headTeeth > 10, `jaw ${jawSkin}, teeth ${jawTeeth}/${headTeeth}`);
  // the clock: wide at the end of each gap, slammed shut early in the active window and clenched to its end, open again by
  // the end of the gap; and it opens through the windup
  const atEnd = [], early = [], clenched = [], windup = [];
  fight('bite', 4, (f, e, tr) => { const s = e.astral; if (s?.move !== 'bite' || s.clock - s.morphStart < ASTRAL.morphTime) return;
    if (s.elapsed < ASTRAL.windup) { windup.push([s.elapsed, gapeOf(tr)]); return; }
    const p = (s.elapsed - ASTRAL.windup) % ASTRAL.biteGap;
    if (p > ASTRAL.biteGap - .05) atEnd.push(gapeOf(tr));
    else if (p < ASTRAL.biteActive * ASTRAL_CV_RIG.biteSnap * .5) early.push(gapeOf(tr));
    else if (p > ASTRAL.biteActive * ASTRAL_CV_RIG.biteSnap && p < ASTRAL.biteActive) clenched.push(gapeOf(tr)); });
  assert.ok(atEnd.length && atEnd.every((g) => g > .8 * ASTRAL_CV_RIG.biteOpen), `wide before the snap: ${atEnd.map((g) => g.toFixed(2))}`);
  assert.ok(clenched.length && clenched.every((g) => g < .05), `shut through the active window: ${clenched.map((g) => g.toFixed(2))}`);
  assert.ok(early.length && early.every((g) => g > .05), 'it is snapping shut, not already shut, as the window opens');
  // (the windup's first share is the morph into the bite form, so it is read from the morph's end)
  const w0 = windup.filter(([t]) => t < ASTRAL.morphTime + .05), w1 = windup.filter(([t]) => t > ASTRAL.windup - .05);
  assert.ok(w1.length && w0.length && Math.min(...w1.map((x) => x[1])) > Math.max(...w0.map((x) => x[1])) + .25, 'it gapes through the windup');
  // outside the bite the head is a bead again, its mouth all but shut
  let worm = 0; fight('rings', 3, (f, e, tr) => { if (e.astral?.form === 'worm' && e.astral.clock - e.astral.morphStart > ASTRAL.morphTime && !e.astral.move) worm = Math.max(worm, gapeOf(tr)); });
  assert.ok(worm < .2, `the worm's mouth (${worm.toFixed(2)})`);
});

test('the flier\'s mandibles work, held wide on the beam; the hidden beam waits in the mouth', () => {
  let lo = Infinity, hi = -Infinity, beamLo = Infinity, idle = 0, waits = 0;
  fight('flight', 4, (f, e, tr) => { const s = e.astral; if (s?.form !== 'flight' || s.clock - s.morphStart < ASTRAL.morphTime) return;
    const spread = angleBetween(tr, 'mandL', 'mandR');
    if (s.move === 'flight' && s.elapsed >= ASTRAL.windup) beamLo = Math.min(beamLo, spread); else { lo = Math.min(lo, spread); hi = Math.max(hi, spread); }
    if (!(f.emitA[3] > 0)) { idle++; const a = astralBone(tr, 'beamFoot'), b = astralBone(tr, 'jaw'); if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 1e-6) waits++; } }, { player: { x: 20, y: 20 } });
  assert.ok(hi - lo > .5, `they open and snap (${lo.toFixed(2)}..${hi.toFixed(2)})`);
  assert.ok(beamLo > hi - .05, `wide on the beam (${beamLo.toFixed(2)})`);
  assert.ok(idle > 10 && waits === idle, 'the beam is drawn up into the mouth while it is off');
});

test('the griffin is one body: its trunk, head, wings and tail grow in on the morph; the beads gather small inside', () => {
  const seen = [];
  fight('griffin', 3, (f, e, tr) => { const s = e.astral; if (!s) return; seen.push([s.form, (s.clock - s.morphStart) / ASTRAL.morphTime, scaleOfBone(tr, 'gchest') / f.scale, scaleOfBone(tr, 'ghead') / f.scale, scaleOfBone(tr, 'tail1') / f.scale, scaleOfBone(tr, 's3') / f.scale]); });
  const grown = seen.filter(([form, k]) => form === 'griffin' && k > 1.05), growing = seen.filter(([form, k]) => form === 'griffin' && k > .3 && k < .7), worm = seen.filter(([form, k]) => form === 'worm' && k > 1.05);
  assert.ok(grown.length && grown.every(([, , c, h, t, b]) => c > .97 && h > .97 && t > .97 && b < .8), 'grown: the trunk, the head and the tail at full size, the beads gathered small');
  assert.ok(growing.length && growing.every(([, , c, h]) => c > .1 && c < .9 && h > .1 && h < .9), 'growing in once, on the morph clock (not squared through the chain)');
  assert.ok(worm.length && worm.every(([, , c, h, t, b]) => c < .01 && h < .01 && t < .01 && b > .95), 'drawn back into the worm');
});
