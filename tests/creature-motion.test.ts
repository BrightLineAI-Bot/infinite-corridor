// Creature motion (Tim, 2026-11-15: a second visual pass on every ordinary creature for a "triple-A feel": reliable wind-ups and
// follow-through, recovery timings, head snaps, flinching, attacks that line up with their hits, clean rendering going in and
// out of view, "even trash mobs should feel real", "without exceeding the phone budget"). creature-motion.ts is the shared
// layer under every rig in CREATURE_POSE.kinds; close-view-models.ts creatureRootPose holds the attack's phase model and
// close-view.ts feeds the real clocks and flags and cross-fades a creature between its card and its body.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCombatant } from '../src/combat.ts';
import { ATTACK_MODULES, freshPackState, closeAttack } from '../src/monster-pack.ts';
import { actorModelKey } from '../src/actor-presentation.ts';
import { nativeWindupDuration } from '../src/renderer.ts';
import { render } from '../src/renderer.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { GLB, BOARD_FLOATS, closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';
import { closeViewMonsterAction, closeViewRootAttack, closeViewRootReach, creatureClock, closeViewCamera, CLOSE_VIEW_HOOKS, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { CREATURE_POSE, creatureRootPose, creaturePoseFamily, creatureRigFrame, writeCloseViewModel, MODEL_FLOATS, MODEL_MAX_VERTICES } from '../src/close-view-models.ts';
import { CREATURE_MOTION, creatureMotion, motionCarry, motionEnvelope, MOTION_STATE_FLOATS, swapStep, deathAlpha } from '../src/creature-motion.ts';
import { flatWorld, spawn, mixedPack, frame as fightFrame, fight } from './enemy-behaviour-harness.ts';

const KINDS = Object.keys(CREATURE_POSE.kinds);
const out = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS * 2);
const write = (a: any) => out.slice(0, writeCloseViewModel(out, 0, a));
const base = (kind: string, extra: any = {}) => ({ kind, x: 0, y: 0, z: 0, yaw: 0, phase: .7, pace: 0, pose: 'idle', amount: 0, reduceMotion: false, ...extra });
const size = (r: any) => Math.abs(r.lunge) + Math.abs(r.squash) + Math.abs(r.lean) + Math.abs(r.twist) + Math.abs(r.lift);
const copy = (r: any) => ({ ...r });
// mean place (forward x, side y, up z) of the vertices that stand above `share` of the body's height in `ref` (the rest pose)
function band(v: Float32Array, share: number, ref: Float32Array = v) {
  let top = -Infinity, bot = Infinity; for (let i = 2; i < ref.length; i += MODEL_FLOATS) { top = Math.max(top, ref[i]); bot = Math.min(bot, ref[i]); }
  const cut = bot + (top - bot) * share; let x = 0, y = 0, z = 0, n = 0;
  for (let i = 0; i < v.length; i += MODEL_FLOATS) if (ref[i + 2] >= cut) { x += v[i]; y += v[i + 1]; z += v[i + 2]; n++; }
  return { x: x / n, y: y / n, z: z / n };
}
function moved(a: Float32Array, b: Float32Array) { let m = 0; for (let i = 0; i < a.length; i += MODEL_FLOATS) m = Math.max(m, Math.hypot(a[i] - b[i], a[i + 1] - b[i + 1], a[i + 2] - b[i + 2])); return m; }

// The actor close-view.ts builds for a creature from its real state (buildActorModels), for the pose alone.
function actorOf(e: any, extra: any = {}) {
  const kind = actorModelKey(e), a: any = closeViewMonsterAction(e, kind, nativeWindupDuration(e));
  const pose = a.semanticPose ? 'semantic' : a.attack ? 'attack' : a.winding ? 'windup' : a.leapActive ? 'jump' : 'idle';
  const amount = a.winding ? a.windupAmount ?? 0 : a.attack ? a.amount ?? 0 : 0, id = closeViewRootAttack(e, a);
  return { kind, x: 0, y: 0, z: 0, yaw: 0, phase: 0, pace: 0, pose, amount, reduceMotion: false,
    action: a.semantic?.action, actionFamily: a.semantic?.family, actionPhase: a.semantic?.phase, actionProgress: a.semantic?.progress || 0,
    rootAttack: id, attackReach: closeViewRootReach(e, id), heavy: e.heavy === true, comboStep: e.pack ? e.pack.combo | 0 : e.comboStep | 0, ...extra };
}

test('the tables: every body family has motion, a death and a body frame; the phase model and its multipliers are data', () => {
  for (const f of Object.keys(CREATURE_POSE.families)) {
    const F = CREATURE_MOTION.families[f]; assert.ok(F && (F.axis === 'up' || F.axis === 'front'), f);
    assert.ok(CREATURE_MOTION.death[f], `${f} falls`);
  }
  for (const kind of KINDS) { const r = creatureRigFrame(kind); assert.ok(r && r.top > r.bot && r.front > r.back && r.tSpan > 0 && r.hSpan > 0 && r.lSpan > 0, kind); }
  assert.ok(Object.isFrozen(CREATURE_MOTION) && Object.isFrozen(CREATURE_MOTION.react.flinch));
  const P = CREATURE_MOTION.phase; assert.ok(P.peak > .5 && P.peak < 1 && P.follow > 0 && P.followSpan < .5);
  assert.ok(CREATURE_MOTION.heavy.coil > 1 && CREATURE_MOTION.heavy.extend > 1 && CREATURE_MOTION.combo.amp <= 1);
});

test('anticipation: the coil peaks, then holds still until the strike; the strike lands at full extension on the hit', () => {
  const at = (p: number, extra: any = {}) => copy(creatureRootPose(base('riftLynx', { pose: 'semantic', action: 'clawSweep', actionFamily: 'sweep', actionPhase: 'windup', actionProgress: p, attackReach: 2, ...extra })));
  const peakAt = CREATURE_MOTION.phase.peak * (1 - CREATURE_POSE.tail);
  const mid = at(peakAt * .5), peak = at(peakAt + .01), late = at(1 - CREATURE_POSE.tail - .01);
  assert.equal(mid.stage, 1); assert.ok(mid.hold === 0 && mid.u < 1);
  assert.ok(peak.u === 1 && late.u === 1 && late.hold > .8, 'the coil is at its peak through the hold');
  for (const k of ['lunge', 'squash', 'lean', 'twist', 'lift']) assert.ok(Math.abs(peak[k] - late[k]) < 1e-9, `${k} held still (no tremble without a clock)`);
  assert.ok(size(mid) < size(peak), 'the coil grows to its peak');
  const trembling = [0, 30, 60, 90].map((t) => at(1 - CREATURE_POSE.tail - .01, { effectTime: t }).lean);
  assert.ok(Math.max(...trembling) - Math.min(...trembling) > .005, 'the held peak trembles on the real clock');
  assert.deepEqual(trembling.map(() => at(1 - CREATURE_POSE.tail - .01, { effectTime: 30, reduceMotion: true }).lean), Array(4).fill(at(1 - CREATURE_POSE.tail - .01, { effectTime: 0, reduceMotion: true }).lean), 'no tremble under Reduced Motion');
  const hit = at(1), before = at(.97);
  assert.equal(hit.stage, 2); assert.ok(hit.u > .999 && hit.lunge >= before.lunge, 'full extension on the frame the blow resolves');
});

test('follow-through and recovery: the body carries past extension after contact, then settles to rest on the recovery clock', () => {
  const at = (p: number, extra: any = {}) => copy(creatureRootPose(base('hollowMarshal', { pose: 'semantic', action: 'clawSweep', actionFamily: 'sweep', actionPhase: 'recover', actionProgress: p, attackReach: 2, ...extra })));
  const ext = copy(creatureRootPose(base('hollowMarshal', { pose: 'semantic', action: 'clawSweep', actionFamily: 'sweep', actionPhase: 'windup', actionProgress: 1, attackReach: 2 })));
  const follow = at(CREATURE_MOTION.phase.followSpan / 2);
  assert.ok(Math.abs(follow.twist) > Math.abs(ext.twist), `the swing carries on through (${follow.twist} past ${ext.twist})`);
  assert.equal(size(at(1)), 0, 'at rest when the recovery ends');
  const heavy = at(CREATURE_MOTION.phase.followSpan / 2, { heavy: true });
  assert.ok(Math.abs(heavy.twist) > Math.abs(follow.twist) && heavy.squash >= follow.squash, 'a heavy blow follows through further');
});

test('a heavy blow is bigger and runs on its real, longer windup and recovery; a combo alternates its swing', () => {
  const e: any = createCombatant('riftLynx', 0, 0), spec = ATTACK_MODULES.clawSweep, wind = spec.windup * 1.45;
  e.heavy = true; e.pack = { ...freshPackState(), state: 'attack', attack: 'clawSweep', phase: 'windup', t: wind, data: { aim: { x: 1, y: 0 }, wind } };
  const start = creatureRootPose(actorOf(e)); assert.equal(start.stage, 1); assert.ok(start.u < .02, `the coil starts with the heavy windup (${start.u})`);
  e.pack.t = wind * .5; const half = copy(creatureRootPose(actorOf(e))); assert.ok(Math.abs(half.u - .5 / (.8 * CREATURE_MOTION.phase.peak)) < .02, 'halfway through its own clock');
  e.heavy = false; const light = copy(creatureRootPose(actorOf(e))); e.heavy = true;
  assert.ok(half.squash > light.squash && Math.abs(half.lean) > Math.abs(light.lean), 'a heavy coil is deeper');
  // recovery: BEHAVIOUR heavy.recover longer than the module's own
  e.pack.phase = 'recover'; e.pack.t = spec.recover * .4; // past the module's own recovery length, still recovering on the heavy clock
  const sem = { action: 'clawSweep', family: 'sweep', phase: 'recover', progress: 1 - .4 }; creatureClock(e, sem);
  assert.ok(sem.progress < .9 && sem.progress > .6, `heavy recovery progress on its own clock (${sem.progress})`);
  const rec = creatureRootPose(actorOf(e)); assert.equal(rec.stage, 4); assert.ok(size(rec) > 0, 'still recovering, not at rest');
  // combo: the second blow swings the other way, a little lighter
  const swing = (comboStep: number) => copy(creatureRootPose(base('hollowMarshal', { pose: 'semantic', action: 'clawSweep', actionFamily: 'sweep', actionPhase: 'windup', actionProgress: .97, attackReach: 2, comboStep })));
  const one = swing(1), two = swing(2), three = swing(3);
  assert.ok(Math.sign(one.twist) === -Math.sign(two.twist) && Math.sign(three.twist) === Math.sign(one.twist), 'combo blows alternate');
  assert.ok(Math.abs(two.twist) < Math.abs(one.twist));
});

test('timing in real fights: every melee hit lands on a pose at or past contact, struck from a strike or a held extension', () => {
  // The Wayfarer stands among a mixed pack (and the older ordinary creatures) and takes every blow (no i-frames), so every
  // creature keeps attacking with its whole repertoire: heavies, combos, feints.
  const w: any = flatWorld(); mixedPack(w, .7); const P = w.player; P.hp = 1e12;
  for (const [kind, dx, dy] of [['ashling', 1.5, 1.5], ['hollowMarshal', -1.6, 1.2], ['glassMite', 1.2, -1.6], ['coilStalker', -1.4, -1.4]] as const) spawn(w, kind, P.x + dx, P.y + dy, { aggro: true });
  const last = new Map(), seen = { hits: 0, heavy: 0, combo: 0, ordinary: 0 }, fails: string[] = [];
  // a hit straight from a creature's own close blow (not a shot or a mark on the floor landing later)
  const hurt = w.hurt; w.hurt = (source: any, amount: number, opts: any = {}) => { const ok = hurt(source, amount, opts);
    const melee = source && w.enemies.includes(source) && (source.pack ? !!source.pack.attack && closeAttack(source.pack.attack) : source.range < 2.5);
    if (ok && melee) w.landed.push(source); return ok; };
  w.landed = [];
  const poseOf = (e: any) => { if (!creaturePoseFamily(actorModelKey(e))) return null; return copy(creatureRootPose(actorOf(e))); };
  for (let f = 0; f < 30 * 40; f++) {
    P.inv = -Infinity; fightFrame(w);
    for (const e of w.landed) {
      const now = poseOf(e), prev = last.get(e); if (!now || !prev) continue;
      const id = e.pack ? `${e.pack.attack}/${e.pack.phase}` : 'legacy'; seen.hits++; if (e.heavy) seen.heavy++; if ((e.pack?.combo | 0) > 1 || (e.comboStep | 0) > 1) seen.combo++; if (!e.pack) seen.ordinary++;
      if (!(now.stage >= 2)) fails.push(`${e.kind} hit at stage ${now.stage} (${id})`);
      if (!(prev.stage >= 1)) fails.push(`${e.kind} hit from rest`);
      if (prev.stage === 1 && prev.u < 1) fails.push(`${e.kind} hit mid-coil (u ${prev.u.toFixed(2)})`);
    }
    w.landed.length = 0;
    for (const e of w.enemies) if (!e.dead) last.set(e, poseOf(e));
  }
  assert.ok(seen.hits >= 40 && seen.heavy >= 3 && seen.combo >= 3 && seen.ordinary >= 5, `enough hits seen (${JSON.stringify(seen)})`);
  assert.equal(fails.length, 0, fails.slice(0, 12).join('\n'));
});

test('hit reactions: the head snaps away from the blow and the torso flinches; a poise break staggers harder; reduced is calmer', () => {
  for (const kind of ['ashling', 'hollowMarshal', 'rootBrute', 'ashenHound', 'riftLynx', 'veilMoth', 'amalgam', 'sparkWarden', 'coilStalker', 'glassMite']) {
    const rest = write(base(kind)), front = write(base(kind, { hitReact: .8, hitX: -1, hitY: 0 })), side = write(base(kind, { hitReact: .8, hitX: 0, hitY: 1 }));
    assert.ok(moved(front, rest) > .02, `${kind} flinches (${moved(front, rest)})`);
    const top0 = band(rest, .7), topF = band(front, .7, rest), topS = band(side, .7, rest);
    if (CREATURE_MOTION.families[creaturePoseFamily(kind)].axis === 'up') assert.ok(topF.x < top0.x - .005, `${kind}: the top snaps back from a blow in front (${topF.x - top0.x})`);
    assert.ok(topS.y > top0.y + .005, `${kind}: and to the side from a blow on its side (${topS.y - top0.y})`);
    const stagger = write(base(kind, { flinch: .6, reeling: true, hitX: -1, hitY: 0 })), flinch = write(base(kind, { flinch: .6, hitX: -1, hitY: 0 }));
    assert.ok(moved(stagger, rest) > moved(flinch, rest), `${kind}: a poise break staggers harder`);
    const calm = write(base(kind, { hitReact: .8, hitX: -1, hitY: 0, reduceMotion: true })), calmRest = write(base(kind, { reduceMotion: true }));
    assert.ok(moved(calm, calmRest) > .005 && moved(calm, calmRest) < moved(front, rest), `${kind}: Reduced Motion still reads, calmer`);
  }
  // the reaction never translates under Reduced Motion
  const r = creatureMotion(base('ashling', { flinch: .5, reeling: true, hitX: -1, reduceMotion: true }), 'biped', null);
  assert.equal(r.lunge === 0 ? 0 : r.lunge, 0); assert.equal(r.lift, 0);
  // a flinch snaps in fast and eases out: its peak comes in the first fifth of its span
  const env = Array.from({ length: 21 }, (_, i) => motionEnvelope(1 - i / 20, CREATURE_MOTION.react.flinch.in, CREATURE_MOTION.react.flinch.out));
  assert.equal(env[0], 0); assert.ok(env.indexOf(Math.max(...env)) <= 4 && env[20] === 0);
});

test('guard, dodge, feint, alert and arrival each move the body their own way', () => {
  const rest = write(base('ashling')), b0 = band(rest, 0);
  const guard = write(base('ashling', { guard: .5, seed: 1 })), alert = write(base('ashling', { alert: .7 })), dodge = write(base('ashling', { dodge: .6, dodgeSide: 1 })), feint = write(base('ashling', { feint: .6, feintSide: -1 }));
  assert.ok(band(guard, .55, rest).x > band(rest, .55).x + .01, 'the guard brings its arms and torso forward');
  assert.ok(band(guard, 0, rest).z < b0.z, 'and crouches');
  assert.ok(band(alert, .8, rest).z > band(rest, .8).z, 'the alert straightens it up');
  assert.ok(band(dodge, .6, rest).y > band(rest, .6).y + .01, 'a dodge leans into its step');
  assert.ok(band(feint, .6, rest).y < band(rest, .6).y - .01, 'a feint breaks off to its side');
  // arrival: emerging from a crouch and fading in, dropping in from above, or fading; settled at the end
  const em = creatureMotion(base('ashling', { arrive: .97, arriveStyle: 'emerge' }), 'biped', null), emA = em.alpha, emS = em.squash;
  assert.ok(emA < .05 && emS > .4, `it starts deep in the ground's crouch, unseen (${emA}, ${emS})`);
  const drop = creatureMotion(base('veilMoth', { arrive: .95, arriveStyle: 'drop' }), 'floating', null);
  assert.ok(drop.lift > 1 && drop.alpha < .5, 'a flier drops in from above');
  const end = creatureMotion(base('ashling', { arrive: 0, arriveStyle: 'emerge' }), 'biped', null);
  assert.equal(end.alpha, 1);
  const calm = creatureMotion(base('ashling', { arrive: .5, arriveStyle: 'drop', reduceMotion: true }), 'biped', null);
  assert.ok(calm.lift === 0 && calm.alpha > 0 && calm.alpha < 1, 'Reduced Motion: arrivals only fade in');
});

test('idle life: breathing and weight shift on the clock, desynchronised per creature, frozen under Reduced Motion', () => {
  for (const kind of ['ashling', 'ashenHound', 'veilMoth', 'amalgam', 'voidSentinel', 'rootBrute']) {
    const a = write(base(kind, { effectTime: 0, seed: 7 })), b = write(base(kind, { effectTime: 1300, seed: 7 })), c = write(base(kind, { effectTime: 1300, seed: 8100 }));
    assert.ok(moved(a, b) > .002, `${kind} breathes and shifts its weight`);
    assert.ok(moved(b, c) > .001, `${kind}: two of them are not in step`);
    assert.ok(moved(a, b) < .12, `${kind}: subtly`);
    const ra = write(base(kind, { effectTime: 0, seed: 7, reduceMotion: true })), rb = write(base(kind, { effectTime: 1300, seed: 7, reduceMotion: true }));
    assert.equal(moved(ra, rb), 0, `${kind}: still under Reduced Motion`);
  }
  // the head leads a turn and the tail trails it
  const m = creatureMotion(base('ashenHound', { turn: .8, pace: .5 }), 'quadruped', null);
  assert.ok(m.headYaw > 0 && m.tailYaw < 0 && m.roll !== 0);
  // the low tier keeps the life rigid (no bend at rest)
  const low = creatureMotion(base('ashling', { effectTime: 400, seed: 3, motionDetail: 0 }), 'biped', null);
  assert.equal(low.bend, false);
});

test('determinism: the same clocks and flags write the same bytes', () => {
  for (const kind of KINDS) {
    const a = base(kind, { effectTime: 1234, seed: 99, flinch: .4, guard: .3, pace: .4, turn: .2, accel: .1, pose: 'semantic', action: 'bite', actionFamily: 'bite', actionPhase: 'windup', actionProgress: .9, attackReach: 1.5 });
    assert.deepEqual(write(a), write({ ...a }), kind);
  }
});

test('continuity: a windup broken off (feint, poise break, freeze) or chained into the next coil eases out; the strike never waits', () => {
  const st = new Float32Array(MOTION_STATE_FLOATS);
  const coil = { lunge: -.08, squash: .2, lean: -.15, twist: -.1, lift: 0 };
  let t = 0; motionCarry(st, { ...coil }, 1, t);
  const steps = [];
  for (let i = 0; i < 20; i++) { t += 16; const p = motionCarry(st, { lunge: 0, squash: 0, lean: 0, twist: 0, lift: 0 }, 0, t); steps.push(p); }
  assert.ok(Math.abs(steps[0].squash) > .1, 'the first frame after the break-off is still near the coil');
  for (let i = 1; i < steps.length; i++) assert.ok(Math.abs(steps[i].squash - steps[i - 1].squash) < .06, `no snap (frame ${i})`);
  assert.ok(Math.abs(steps.at(-1).squash) < 1e-9, `back at rest within ${CREATURE_MOTION.carry.ms} ms`);
  // forward steps are drawn as sampled: coil -> strike -> recover
  const s2 = new Float32Array(MOTION_STATE_FLOATS); motionCarry(s2, { ...coil }, 1, 0);
  const strike = { lunge: .3, squash: 0, lean: .2, twist: .2, lift: 0 }, drawn = motionCarry(s2, { ...strike }, 2, 16);
  assert.deepEqual(drawn, strike, 'the strike lands on its frame');
  // a paused or repeated frame changes nothing
  const s3 = new Float32Array(MOTION_STATE_FLOATS); motionCarry(s3, { ...coil }, 1, 0); const x = motionCarry(s3, { lunge: 0, squash: 0, lean: 0, twist: 0, lift: 0 }, 0, 16), y = motionCarry(s3, { lunge: 0, squash: 0, lean: 0, twist: 0, lift: 0 }, 0, 16);
  assert.deepEqual(x, y);
  // in the model: a combo's next coil starts from the last blow's extension, not from rest
  const state = new Float32Array(MOTION_STATE_FLOATS), A = (phase: string, p: number, time: number) => base('hollowMarshal', { pose: 'semantic', action: 'clawSweep', actionFamily: 'sweep', actionPhase: phase, actionProgress: p, attackReach: 2, motionState: state, effectTime: time });
  const ext = write(A('recover', .02, 0)), next = write(A('windup', 0, 16)), raw = write({ ...A('windup', 0, 16), motionState: null });
  assert.ok(moved(next, ext) < moved(raw, ext), 'the chained coil eases from the blow');
});

test('Reduced Motion and the tiers: calm reactions, no idle life, no new triangles', () => {
  for (const kind of KINDS) {
    const n = writeCloseViewModel(out, 0, base(kind)), m = writeCloseViewModel(out, 0, base(kind, { flinch: .5, reeling: true, guard: .4, alert: .5, arrive: .4, arriveStyle: 'drop', effectTime: 500, seed: 3, pace: .5, turn: .5 }));
    assert.equal(m, n, `${kind}: the layers add no triangles`);
  }
});

test('no allocation in the motion hot path', () => {
  const a = base('ashling', { flinch: .5, guard: .3, effectTime: 100 }), first = creatureMotion(a, 'biped', null);
  for (let i = 0; i < 500; i++) { a.effectTime = i * 16; assert.equal(creatureMotion(a, 'biped', null), first); }
  const src = readFileSync(new URL('../src/creature-motion.ts', import.meta.url), 'utf8');
  for (const name of ['creatureMotion', 'motionCarry', 'motionEnvelope']) {
    const i = src.indexOf(`function ${name}(`); assert.ok(i >= 0, name); let d = 0, j = src.indexOf('{', i); const s = j;
    for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) break; }
    assert.ok(!/\bnew\s|=>|\[\s*\]|\.map\(|\.filter\(|\.slice\(|\{\s*[A-Za-z_$]+\s*:|\.\.\./.test(src.slice(s, j + 1)), `${name} allocates nothing`);
  }
});

test('swap and death fades are pure and bounded', () => {
  assert.equal(swapStep(0, 1, CREATURE_MOTION.swap.ms), 1); assert.equal(swapStep(1, 0, CREATURE_MOTION.swap.ms / 2), .5); assert.equal(swapStep(.3, 1, 0), .3);
  assert.equal(deathAlpha(0), 1); assert.equal(deathAlpha(1 - CREATURE_MOTION.death.fade), 1); assert.ok(deathAlpha(.99) < .01 && deathAlpha(1) === 0);
});

// ---------------------------------------------------------------- the rendered scene
const context = (log: any[] = []) => new Proxy({
  canvas: null as any, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
  createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}),
}, { get: (o: any, key: any) => key in o ? o[key] : (...args: any[]) => { log.push([key, ...args]); }, set: (o: any, key: any, v: any) => { o[key] = v; return true; } });
class MockGL {
  uploads: Float32Array[] = []; sources: string[] = []; program: any = null;
  constructor() { let id = 1; const constants = new Map(); return new Proxy(this, { get: (o: any, key: any) => {
    if (key in o) return o[key];
    if (typeof key === 'string' && /^[A-Z][A-Z0-9_]+$/.test(key)) { if (!constants.has(key)) constants.set(key, id++); return constants.get(key); }
    return () => {};
  } }); }
  isContextLost() { return false; } createShader() { return {}; } createProgram() { return { shaders: [] }; }
  shaderSource(shader: any, text: string) { shader.text = text; this.sources.push(text); } attachShader(program: any, shader: any) { program.shaders.push(shader); }
  useProgram(program: any) { this.program = program; }
  createBuffer() { return {}; } createTexture() { return {}; } createVertexArray() { return {}; } getShaderParameter() { return true; }
  getProgramParameter(_p: any, key: any) { return key === (this as any).ACTIVE_UNIFORMS || key === (this as any).ACTIVE_ATTRIBUTES ? 0 : true; } getExtension() { return null; }
  bufferData(_t: any, data: any) { if (data instanceof Float32Array && this.program?.shaders?.some((s: any) => s.text.includes('in float a_alpha'))) this.uploads.push(Float32Array.from(data)); }
}
function withGPU(run: (x: any) => void) {
  const previous = (globalThis as any).WebGL2RenderingContext; (globalThis as any).WebGL2RenderingContext = MockGL;
  const gl = new MockGL(), log: any[] = [], screen = context(log);
  const canvas = { width: 390, height: 844, addEventListener() {}, getContext: (kind: string) => kind === 'webgl2' ? gl : context(log) };
  screen.canvas = canvas; setCloseViewCanvasFactory(() => canvas); CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL();
  try { run({ gl, log, screen }); } finally {
    CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); setCloseViewCanvasFactory(null);
    if (previous === undefined) delete (globalThis as any).WebGL2RenderingContext; else (globalThis as any).WebGL2RenderingContext = previous;
  }
}
const modelAlphas = (upload: Float32Array) => Array.from(upload || []).filter((_, i) => i % MODEL_FLOATS === 9);
const cardAlphas = () => Array.from(GLB.board.subarray(0, GLB.nBoard * BOARD_FLOATS)).filter((_, i) => i % BOARD_FLOATS === 5).filter((a) => a > 0);
function lane(now = 100000) { const { game } = createLabFixture({ lab: 'close-view', scenario: 'terrain-ramps', now }); game.presentation = { effectiveQuality: 'full', reduceMotion: false }; return game; }
function ahead(game: any, kind: string, d: number, id: string) { const eye = closeViewCamera(), fx = Math.cos(eye.yaw), fy = Math.sin(eye.yaw); return Object.assign(createCombatant(kind, eye.x + fx * d - .5, eye.y + fy * d - .82), { id }); }

test('no popping between card and body: a creature taking its body fades into it over its card, and back', () => withGPU(({ gl, screen }) => {
  const game: any = lane(); let now = 100000; game.paused = false; resetCloseViewCamera(); game.enemies = []; render(screen, game, 390, 844, now);
  const e: any = ahead(game, 'glassMite', 3, 'swap'); e.affixes = ['future-affix']; game.enemies = [e];
  render(screen, game, 390, 844, now += 16); render(screen, game, 390, 844, now += 16);
  assert.equal(closeViewGLStats.models, 1, 'a card first'); const card = Math.max(...cardAlphas()); assert.ok(card > .9);
  e.affixes = [];
  const ins: number[] = [], cards: number[] = [];
  for (let i = 0; i < 18; i++) { render(screen, game, 390, 844, now += 16); ins.push(Math.min(...modelAlphas(gl.uploads.at(-1)))); cards.push(Math.max(0, ...cardAlphas())); }
  assert.ok(ins[0] < .25 && cards[0] > .6, `the body comes in faint over its card (${ins[0]}, ${cards[0]})`);
  for (let i = 1; i < ins.length; i++) assert.ok(ins[i] >= ins[i - 1] - 1e-6 && ins[i] - ins[i - 1] < .25, `no jump in (frame ${i}: ${ins[i - 1]} -> ${ins[i]})`);
  assert.ok(ins.at(-1) > .99 && cards.at(-1) === 0, 'whole, and its card gone, once the swap is done');
  e.affixes = ['future-affix'];
  const outs: number[] = [], back: number[] = [];
  for (let i = 0; i < 18; i++) { render(screen, game, 390, 844, now += 16); const m = gl.uploads.at(-1); outs.push(closeViewGLStats.swapOut ? Math.min(...modelAlphas(m)) : 0); back.push(Math.max(0, ...cardAlphas())); }
  assert.ok(outs[0] > .75 && back[0] < .35, `the body fades out over its returning card (${outs[0]}, ${back[0]})`);
  for (let i = 1; i < back.length; i++) assert.ok(back[i] >= back[i - 1] - 1e-6 && back[i] - back[i - 1] < .25, `the card fades in (frame ${i})`);
  assert.ok(outs.at(-1) === 0 && back.at(-1) > .9 && closeViewGLStats.swapOut === 0, 'a card again, the body gone');
}));

test('a slain creature fades out at the end of its fall instead of vanishing', () => withGPU(({ gl, screen }) => {
  const game: any = lane(); let now = 100000; game.paused = false; resetCloseViewCamera(); game.enemies = []; render(screen, game, 390, 844, now);
  const e: any = ahead(game, 'glassMite', 3, 'death'); game.enemies = [e]; render(screen, game, 390, 844, now += 16);
  e.dead = true; e.hp = 0; const alphas: number[] = [];
  for (let i = 0; i < 40 && closeViewGLStats.models >= 2 || i === 0; i++) { render(screen, game, 390, 844, now += 16); if (closeViewGLStats.models >= 2) alphas.push(Math.min(...modelAlphas(gl.uploads.at(-1)))); }
  assert.ok(alphas.length > 10, `the fall plays (${alphas.length} frames)`);
  assert.ok(alphas[0] > .95 && alphas.at(-1) < .2, `whole as it falls, nearly gone on its last frame (${alphas[0]}, ${alphas.at(-1)})`);
}));

test('a mid-fight arrival rises in rather than popping', () => withGPU(({ gl, screen }) => {
  const game: any = lane(); let now = 100000; game.paused = false; resetCloseViewCamera(); game.enemies = []; render(screen, game, 390, 844, now);
  const e: any = ahead(game, 'ashling', 3, 'arrive'); e.arrive = 1; e.arriveStyle = 'emerge'; game.enemies = [e];
  const alphas: number[] = [];
  for (let i = 0; i <= 10; i++) { e.arrive = 1 - i / 10; render(screen, game, 390, 844, now += 16); alphas.push(Math.min(...modelAlphas(gl.uploads.at(-1)))); }
  assert.ok(alphas[0] < .05, `unseen as it starts (${alphas[0]})`); assert.ok(alphas.at(-1) > .99, 'whole once arrived');
  for (let i = 1; i < alphas.length; i++) assert.ok(alphas[i] >= alphas[i - 1] - 1e-6, 'it only comes in');
}));
