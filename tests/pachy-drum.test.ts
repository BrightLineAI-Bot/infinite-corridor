// The Pachycephalosaurus's Dome Drum and its daze (Tim, 2026-11-27; pachy.ts PACHY.drum, PACHY.daze): it knocks its dome on the ground
// three or four times (a count hashed per beast and move), each knock a head blow on the marked circle and a small burst ring, within
// the phone's ring cap; every landed head blow or ring counts toward the daze (a knock and its own ring once between them), and the
// second within the decay window stuns the Wayfarer for a second, stars over her head for two. A parried blow, a stunned or fallen
// Wayfarer: nothing counts. Both views draw the knock pose and the stars.
import test from 'node:test';
import assert from 'node:assert/strict';
import { arena, pachy, run } from './pachy-harness.ts';
import { MONSTER_PACK, ATTACK_MODULES } from '../src/monster-pack.ts';
import { PACHY, PACHY_ATTACKS, PACHY_START, PACHY_RUN, pachyDrumKnocks, pachyLive } from '../src/pachy.ts';
import { freshSave } from '../src/types.ts';
import { Game, PLAYER_CLOCKS, RESUME_PLAYER_CLOCKS, shiftClocks } from '../src/game.ts';
import { drawPachy, drawPachyDazeStars, pachyDazeLeft, PACHY_POSES, PACHY_DAZE_ART } from '../src/pachy-render.ts';
import { createPachyTrack, samplePachy, drawPachyDazeClose } from '../src/close-view-beast-pachy.ts';
import { DUEL_SOUNDS } from '../src/battle-sfx.ts';

const D = PACHY.drum, Z = PACHY.daze, ID = 'pachyDomeDrum';
// Fire one move in the headless arena (every other move on cooldown); `dazes` counts the world's daze calls (true on the `stunAt`-th).
function fire(id, { seconds = 5, player = { x: 20, y: 20.8 }, dodge, stunAt = Infinity, eid = 'pachy' } = {}) {
  const w = arena({ player, ...(dodge ? { dodge } : {}) }), e = pachy(w, { id: eid }); run(w, .1);
  const s = e.pack; s.cd = {}; s.gap = 0; s.attack = null; for (const k of Object.keys(PACHY_ATTACKS)) if (k !== id) s.cd[k] = 999;
  const out = { w, e, seq: null, dazes: 0, knocksAfterDaze: 0, maxWaves: 0, poses: new Set(), started: false, ended: false };
  w.dazeHit = () => { out.dazes++; return out.dazes === stunAt; };
  run(w, seconds, () => { if (s.attack === id) { out.started = true; if (out.seq == null) out.seq = s.seq; if (e.pachyPose) out.poses.add(e.pachyPose); } else if (out.started) out.ended = true;
    out.maxWaves = Math.max(out.maxWaves, pachyLive(e, 'waves')); });
  out.knocks = w.cues.filter((c) => c.phase === 'land' && c.move === id).length;
  return out;
}

test('Dome Drum: a move of the beast with its numbers in tables, in the AI\'s list, its sounds and its rings within the phone cap', () => {
  const A = PACHY_ATTACKS[ID]; assert.equal(A.name, 'Dome Drum'); assert.equal(ATTACK_MODULES[ID], A); assert.ok(PACHY_START[ID] && PACHY_RUN[ID]);
  assert.ok(MONSTER_PACK.pachy.attacks.includes(ID), 'the shared brain chooses it');
  assert.ok(!PACHY.fossilOnly.includes(ID) && !PACHY.fleshOnly.includes(ID), 'flesh, armor and fossil alike');
  assert.ok(D.knocks[0] >= 3 && D.knocks[1] <= 4 && D.knocks[0] <= D.knocks[1]);
  assert.ok(D.ringTime < D.every, 'one knock\'s ring is gone before the next knock: at most one drum ring at a time');
  assert.ok(D.ringTime <= .5 && Math.ceil(D.ringTime / D.every) + 3 <= PACHY.caps.waves, 'room in the pool for the other rings');
  assert.ok(A.active >= D.knocks[1] * D.every, 'its active time covers every knock');
  assert.ok(A.windup >= .7, 'telegraphed like the Dome Slam');
  assert.equal(DUEL_SOUNDS.land[ID], 'domeKnock'); assert.equal(DUEL_SOUNDS.hit[ID], 'domeKnock');
  assert.deepEqual({ hits: Z.hits, stun: Z.stun, decay: Z.decay, stars: Z.stars }, { hits: 2, stun: 1, decay: 8, stars: 2 });
  for (const id of Z.head) assert.ok(PACHY_ATTACKS[id], id);
  assert.ok(!Z.head.includes('pachyDomeRam') && !Z.head.includes('pachyJumpSlam'), 'the butts and the feet are no daze blows');
});

test('the knock count: hashed per beast and move, between three and four, the same every time', () => {
  const seen = new Set();
  for (let seq = 0; seq < 40; seq++) { const n = pachyDrumKnocks({ id: 'p1' }, seq); assert.ok(n >= D.knocks[0] && n <= D.knocks[1]); assert.equal(pachyDrumKnocks({ id: 'p1' }, seq), n); seen.add(n); }
  assert.deepEqual([...seen].sort(), [3, 4], 'both counts occur');
});

test('in the arena: it knocks its counted number of times (a dodged Wayfarer), each a head blow and a burst ring, then recovers', () => {
  for (const eid of ['pachy', 'pachy-b', 'pachy-c', 'pachy-d']) {
    const r = fire(ID, { eid, dodge: () => true });
    assert.ok(r.started && r.ended, `${eid} ran to its end`);
    assert.equal(r.knocks, pachyDrumKnocks(r.e, r.seq), `${eid}: knocks`);
    assert.ok(r.poses.has('drum') && r.poses.has('drumRaise'), `${eid}: the head-bob knock pose (${[...r.poses]})`);
    assert.ok(r.maxWaves >= 1 && r.maxWaves <= PACHY.caps.waves, `${eid}: rings ${r.maxWaves}`);
    assert.equal(r.dazes, 0, 'nothing landed: nothing counts');
  }
  // standing in the circle with no dodge: knock blows and rings land
  const hit = fire(ID); assert.ok(hit.w.hurts.some((h) => h.source === ID), 'a knock lands'); assert.ok(hit.w.hurts.every((h) => h.source === ID || h.source === 'pachyWave'));
  // out of reach: nothing
  const far = fire(ID, { player: { x: 2, y: 2 }, seconds: 3 }); assert.equal(far.w.hurts.length, 0);
});

test('determinism: the same beast and fight give the same knocks, blows and rings', () => {
  const a = fire(ID, { eid: 'same' }), b = fire(ID, { eid: 'same' });
  assert.deepEqual(a.w.hurts, b.w.hurts); assert.deepEqual(a.w.cues, b.w.cues); assert.equal(a.knocks, b.knocks);
});

test('a knock that dazes her ends the drum: no knock lands on a stunned Wayfarer', () => {
  const plain = fire(ID, { eid: 'four' }); let eid = 'four', n = plain.knocks;
  for (let i = 0; n < 3 && i < 20; i++) { eid = `four-${i}`; n = fire(ID, { eid, dodge: () => true }).knocks; }
  const r = fire(ID, { eid, stunAt: 2 }); const heads = r.w.hurts.filter((h) => h.source === ID).length;
  assert.equal(r.dazes, 2, 'two counted blows'); assert.equal(heads, 2, `the drum stopped at the knock that dazed her (${heads} knocks, ${n} counted)`);
  // a ring that dazes her (the dome dodged each time) ends it too
  const ring = fire(ID, { eid, stunAt: 2, dodge: (w, o) => !o.jumpable }); assert.equal(ring.dazes, 2); assert.equal(ring.knocks, 2, `stopped after the ring that dazed her (${ring.knocks})`);
});

test('the daze counts a knock and its own ring once; a dodged knock caught by its ring counts once; the butts never count', () => {
  const slam = fire('pachyHeadSlam', { seconds: 3 });
  assert.ok(slam.w.hurts.some((h) => h.source === 'pachyHeadSlam') && slam.w.hurts.some((h) => h.source === 'pachyWave'), 'head and ring both landed');
  assert.equal(slam.dazes, 1, 'one slam, one count');
  const ring = fire('pachyHeadSlam', { seconds: 3, dodge: (w, o) => !o.jumpable }); // the dome dodged, the ring caught
  assert.equal(ring.dazes, 1, 'the ring counts');
  const jumped = fire('pachyHeadSlam', { seconds: 3, dodge: () => true }); assert.equal(jumped.dazes, 0);
  const butts = fire('pachyDomeRam', { seconds: 3, player: { x: 20, y: 21.5 } });
  assert.ok(butts.w.hurts.some((h) => h.source === 'pachyDomeRam')); assert.equal(butts.dazes, 0, 'Dome Butts are no daze blows');
  const jump = fire('pachyJumpSlam', { seconds: 4, player: { x: 20, y: 25 } });
  assert.ok(jump.w.hurts.some((h) => h.source === 'pachyJumpSlam')); assert.equal(jump.dazes, 0, 'the feet, and the ring of a blow that landed, do not count');
  const charge = fire('pachyCharge', { seconds: 4, player: { x: 20, y: 25 } });
  assert.ok(charge.w.hurts.some((h) => h.source === 'pachyCharge')); assert.equal(charge.dazes, 1, 'the dome charge counts');
});

// ---------------------------------------------------------------- the counter in the Game
const game = (seed = 'DAZE') => { const save = freshSave(); save.seed = seed; return new Game(save, 0); };
test('the daze counter: one blow no stun, the second stuns for its second with stars for two, then it starts again', () => {
  const g = game(), p = g.player; let now = 1000; const w = () => g.packWorld(.05, now);
  assert.equal(w().dazeHit(), false); assert.equal(p.dazeCount, 1); assert.ok(!(now < (p.stunnedUntil || 0)), 'one blow: on her feet');
  now += 500; assert.equal(w().dazeHit(), true); assert.equal(p.dazeCount, 0, 'the counter resets');
  assert.equal(p.stunnedUntil, now + Z.stun * 1000); assert.equal(p.dazedUntil, now + Z.stars * 1000); assert.match(g.message, /dazed/);
  assert.equal(w().dazeHit(), false); assert.equal(p.dazeCount, 0, 'nothing counts while she is down');
  now += Z.stun * 1000 + 1; assert.equal(w().dazeHit(), false); assert.equal(p.dazeCount, 1, 'up again, it counts again');
});

test('the counter fades after its decay window: two blows too far apart never stun', () => {
  const g = game(), p = g.player; let now = 1000; const w = () => g.packWorld(.05, now);
  w().dazeHit(); now += Z.decay * 1000 + 100; assert.equal(w().dazeHit(), false, 'the first had faded'); assert.equal(p.dazeCount, 1);
  const input = { state: { x: 0, y: 0 }, consume: () => false }; now += Z.decay * 1000 + 100; g.update(.05, input, now);
  assert.equal(p.dazeCount, 0, 'and the update clears it');
  now += 100; w().dazeHit(); now += Z.decay * 1000 - 200; assert.equal(w().dazeHit(), true, 'within the window: dazed');
});

test('a parried blow, a fallen Wayfarer, or one already stunned: nothing counts', () => {
  const g = game(), p = g.player; let now = 1000; const w = () => g.packWorld(.05, now);
  g._parryHit = true; assert.equal(w().dazeHit(), false); assert.ok(!(p.dazeCount > 0), 'the parry ward blocks it'); g._parryHit = false;
  p.stunnedUntil = now + 500; assert.equal(w().dazeHit(), false); assert.ok(!(p.dazeCount > 0), 'already stunned'); p.stunnedUntil = 0;
  p.hp = 0; assert.equal(w().dazeHit(), false); assert.ok(!(p.dazeCount > 0), 'fallen'); p.hp = 100;
  w().dazeHit(); g._parryHit = true; assert.equal(w().dazeHit(), false); assert.equal(p.dazeCount, 1, 'a parried second blow stuns nothing');
});

test('its clocks pause with the game; the stars resume with the stun on a reload; no stars on a fallen Wayfarer', () => {
  assert.ok(PLAYER_CLOCKS.includes('dazeAt') && PLAYER_CLOCKS.includes('dazedUntil') && RESUME_PLAYER_CLOCKS.includes('dazedUntil'));
  const g = game(), p = g.player; p.dazedUntil = 5000; p.dazeAt = 4000; shiftClocks(g, 700); assert.equal(p.dazedUntil, 5700); assert.equal(p.dazeAt, 4700);
  const r = g.resumeRuntime(4000); assert.equal(r.clocks.dazedUntil, 1700);
  const h = game(); h.restoreRuntime(r, 9000); assert.equal(h.player.dazedUntil, 10700);
  assert.equal(pachyDazeLeft({ hp: 0, dazedUntil: 9e9 }, 0), 0, 'no stars on a fallen Wayfarer');
});

// ---------------------------------------------------------------- the art
function stubCtx(calls) { const noop = (k) => () => { calls[k] = (calls[k] || 0) + 1; }; return new Proxy({ globalAlpha: 1 }, { get: (t, k) => k in t ? t[k] : noop(k), set: (t, k, v) => { t[k] = v; return true; } }); }
test('both views draw the knock pose in every form, and the stars over the dazed Wayfarer (still under Reduced Motion)', () => {
  assert.ok(PACHY_POSES.drum && PACHY_POSES.drumRaise && PACHY_POSES.drum.head < 0 && PACHY_POSES.drumRaise.head > 0, 'the dome down, then up');
  const calls = {}, ctx = stubCtx(calls);
  for (const pose of ['drumRaise', 'drum']) for (const form of ['flesh', 'armor', 'fossil']) assert.ok(drawPachy(ctx, { k: 100, b: 100, u: 60, s: 32, t: 1, flip: 1, e: { id: `d:${pose}:${form}`, kind: 'pachy', x: 3, y: 4, hp: 1, maxHp: 1, pachyPose: pose, pachyForm: form, pachyShift: 1 } }, 1000));
  const tr = createPachyTrack(), sk = [];
  for (const pose of ['drumRaise', 'drum']) { const f = samplePachy(tr, { id: 'c', kind: 'pachy', hp: 1, maxHp: 1, pachyPose: pose, pachyForm: 'flesh', pachyShift: 1 }, { x: 0, y: 0, z: 0, scale: 2, now: 1000, tier: 'full', reduce: true }); assert.ok(f && f.skin.every(Number.isFinite)); sk.push(Array.from(f.skin.slice(0, 120)).join()); }
  assert.notEqual(sk[0], sk[1], 'the knock is a different pose from the raise');
  const p = { x: 4, y: 5, hp: 50, dazedUntil: 3000 };
  assert.equal(pachyDazeLeft(p, 1000), 1); assert.equal(pachyDazeLeft(p, 3000), 0);
  for (const k of Object.keys(calls)) delete calls[k];
  assert.equal(drawPachyDazeStars(ctx, 100, 100, 32, pachyDazeLeft(p, 2000), 2000, false), true); assert.equal(calls.fill, PACHY_DAZE_ART.count);
  assert.equal(drawPachyDazeStars(ctx, 100, 100, 32, 0, 2000), false, 'nothing once it has passed');
  const cards = []; const card = (...a) => cards.push(a);
  assert.equal(drawPachyDazeClose(p, card, true, 1500), true); assert.equal(cards.length, PACHY_DAZE_ART.count * 2, 'a halo and a core a star');
  const still = cards.map((c) => c.slice(0, 4).join()); cards.length = 0; drawPachyDazeClose(p, card, true, 2200); assert.deepEqual(cards.map((c) => c.slice(0, 4).join()), still, 'Reduced Motion: the stars hold still');
  cards.length = 0; assert.equal(drawPachyDazeClose({ ...p, dazedUntil: 0 }, card, false, 1500), false); assert.equal(cards.length, 0);
});
