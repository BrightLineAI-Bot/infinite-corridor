// Creature motion layers (Tim, 2026-11-15: a "triple-A feel" for every ordinary creature in Close View: reliable wind-ups and
// follow-through, recovery timings, head snaps, flinching, attacks that line up with their hits, idle life, and clean rendering
// going in and out of view, "even trash mobs should feel real", "without exceeding the phone budget").
//
// The shared motion engine on top of the attack root pose (close-view-models.ts CREATURE_POSE / creatureRootPose). Every rig in
// CREATURE_POSE.kinds takes these layers through writeCloseViewModel, with no per-kind work:
//   phase      the attack's own phase model (read by creatureRootPose): the coil reaches its peak at `peak` of the coil window
//              and holds there, trembling, until the strike; a heavy blow (e.heavy) coils deeper and follows through further; a
//              combo's blows alternate their twist; recovery runs on the real recovery clock (close-view.ts creatureClock).
//   react      additive hit reactions on the enemy-behaviour.ts flags: a flinch (head snapped away from the blow, the torso
//              jolted, a little crouch), a poise-break stagger (a heavier stumble back, swaying, knees buckling), a braced guard,
//              a sidestep lean for a dodge or a feint's break-off, the alert look-up, and the arrival (emerge, drop, fade).
//   life       idle and locomotion life per body family: breathing, weight shift, a roll onto the planted foot in stride, the
//              head leading a turn, tails and hanging parts lagging turns and changes of speed.
//   bend       how a layer reaches the body: rigid root offsets (lunge, squash, lean, twist, lift, roll) plus a three-band bend of
//              the rest pose (torso above the hips, head at the top or the front, tail or hanging parts at the back or below),
//              weighted from each vertex's rest position (close-view-models.ts creatureRigFrame), so every rig bends with no
//              authored weights.
//   carry      continuity: when an attack is broken off (a feint, a poise break, a freeze) or one blow chains into the next
//              coil, the body eases from where it was over `carry.ms` instead of snapping.
//   death      a per-family fall, away from the last blow (close-view.ts fades the body out over its last `fade` share).
//   swap       the Close View card <-> body cross-fade at the model cap, and the fade-in a creature gets when it first takes a
//              body after being drawn as a card (close-view.ts).
// Everything is closed-form maths on the creature's own clocks and flags: no Math.random, no allocation per call (one scratch
// record), O(1) per creature. Reduced Motion: reactions at `reduced.scale` with no translation, no idle life, no tremble.
// Presentation only: the simulation never reads any of it.

const fz = (o) => Object.freeze(o);
export const CREATURE_MOTION = fz({
  version: 1,
  phase: fz({ peak: .78, tremble: .022, trembleHz: 11, follow: .18, followSpan: .34 }),
  heavy: fz({ coil: 1.35, extend: 1.25, follow: 1.7, recoil: 1.45, spent: fz({ window: 1.2, lean: .12, squash: .05, head: .22, breath: 2.5 }) }),
  combo: fz({ amp: .9 }),
  reduced: fz({ scale: .5 }),
  react: fz({
    // a jolt: snapped in over `in` of its span, eased out over `out`
    flinch: fz({ in: .14, out: .86, lean: .2, bend: .16, roll: .12, twist: .14, head: .42, headYaw: .34, squash: .05, back: .07, arm: .28 }),
    stagger: fz({ in: .08, out: .55, lean: .26, bend: .2, sway: .14, swayHz: 1.6, squash: .13, back: .2, head: .5, lurch: .45 }),
    daze: fz({ sway: .07, hz: 1.1 }),
    guard: fz({ in: .16, out: .22, squash: .08, lean: .1, twist: .22, bend: .1, head: .14, arm: -.75 }),
    dodge: fz({ in: .22, out: .4, roll: .3, twist: .12, squash: .07, hop: .07, head: .26 }),
    feint: fz({ in: .05, out: .75, back: .1, lean: .14, roll: .16, shake: .3, shakeHz: 1.6 }),
    alert: fz({ in: .12, out: .6, stretch: .06, lift: .03, head: .3, lean: .08 }),
    arrive: fz({ emerge: .62, drop: 1.6, land: .22, landAt: .22, fadeIn: .3, dropFade: .18, fadeLift: .1, head: .35 }),
  }),
  // Per body family: axis ('up': head at the top; 'front': head at the front, tail behind), react (scale of the reactions),
  // breath [Hz, stretch, chest], sway [Hz, roll, twist] (weight shift at rest), step (roll onto the planted foot), head (lead into
  // a turn), tail (lag of tails and trailing parts), hang (lag of parts hanging below a floater), bank (roll into a turn).
  families: fz({
    biped: fz({ axis: 'up', react: 1, breath: fz([.32, .012, .03]), sway: fz([.21, .022, .03]), step: .045, head: .38, tail: .3, hang: 0, bank: .08 }),
    quadruped: fz({ axis: 'front', react: .9, breath: fz([.42, .014, .02]), sway: fz([.17, .016, .02]), step: .035, head: .45, tail: .9, hang: 0, bank: .1 }),
    crawler: fz({ axis: 'front', react: .8, breath: fz([.5, .01, .012]), sway: fz([.25, .012, .03]), step: .025, head: .3, tail: .6, hang: 0, bank: .06 }),
    serpent: fz({ axis: 'front', react: .9, breath: fz([.36, .012, .02]), sway: fz([.3, .02, .06]), step: .02, head: .55, tail: 1.2, hang: 0, bank: .12 }),
    floating: fz({ axis: 'up', react: 1.1, breath: fz([.28, .016, .025]), sway: fz([.19, .04, .04]), step: .02, head: .3, tail: .3, hang: 1, bank: .14 }),
    blob: fz({ axis: 'up', react: 1.2, breath: fz([.4, .03, .02]), sway: fz([.23, .03, .02]), step: .03, head: .2, tail: .3, hang: .4, bank: .05 }),
    construct: fz({ axis: 'up', react: .7, breath: fz([.22, .005, .012]), sway: fz([.13, .01, .015]), step: .03, head: .3, tail: .2, hang: .3, bank: .05 }),
    plant: fz({ axis: 'up', react: .9, breath: fz([.24, .015, .02]), sway: fz([.15, .035, .03]), step: .02, head: .3, tail: .4, hang: .3, bank: .05 }),
  }),
  // The bands of the rest pose the bend reaches, as shares of the body: torso above `hip` (up) or ahead of `hip` (front), head
  // from `head`, tail behind `tail` (front) or hanging below `hang` (up).
  bend: fz({ hip: .38, head: .74, tail: .32, hang: .3 }),
  carry: fz({ ms: 150, jump: .2 }),
  // close-view.ts: how fast (per second, eased) a creature squares up to its blow while it winds up (it used to turn in one frame)
  turn: fz({ wind: 26 }),
  // The fall per family (radians, shares of the body; `pitch` is toward the side the last blow pushed it, `roll` to its side).
  death: fz({ fade: .32,
    biped: fz({ pitch: 1.45, roll: .25, sink: .36, squash: 0 }), quadruped: fz({ pitch: .35, roll: 1.25, sink: .3, squash: .12 }),
    crawler: fz({ pitch: .2, roll: 1.4, sink: .25, squash: .2 }), serpent: fz({ pitch: .15, roll: .7, sink: .2, squash: .45 }),
    floating: fz({ pitch: .9, roll: .4, sink: .3, squash: .3 }), blob: fz({ pitch: .1, roll: .2, sink: .05, squash: .62 }),
    construct: fz({ pitch: 1.35, roll: .3, sink: .34, squash: .08 }), plant: fz({ pitch: 1.2, roll: .35, sink: .32, squash: .15 }) }),
  // Close View card <-> body cross-fades (close-view.ts): `ms` to swap, at most `out` bodies kept fading out after losing a slot.
  swap: fz({ ms: 220, out: 2 }),
  // Joint groups the layers reach (close-view-models.ts joint conventions): arms of the upright families.
  arms: fz([-2, 2, 50, 51]),
});

const clamp01 = (t) => t <= 0 ? 0 : t >= 1 ? 1 : t;
// a turn or a change of pace too small to see moves nothing (and leaves the body unbent, the cheap path)
const deadband = (v) => v > 1 ? 1 : v < -1 ? -1 : Math.abs(v) < .02 ? 0 : v;
const smooth = (t) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
// A flag that runs 1 -> 0 over its span: snapped in over the first `a` of it, eased out over its last `r`.
export function motionEnvelope(v, a, r) {
  if (!(v > 0)) return 0;
  const t = 1 - (v >= 1 ? 1 : v);
  return (a > 0 ? smooth(t / a) : 1) * (r > 0 ? smooth(v / r) : 1);
}

// One scratch record, rewritten by every call. Rigid: lunge (tiles along its facing), squash (share of its height; negative
// stretches), lean, twist, roll (radians), lift (tiles), alpha (multiplier). Bend (radians, by band): bendPitch/Yaw/Roll (torso),
// headPitch/headYaw, tailPitch/tailYaw. arm: radians added to the arm joints of the upright families. bend: whether any band moves.
const MOTION = { lunge: 0, squash: 0, lean: 0, twist: 0, roll: 0, lift: 0, alpha: 1, bendPitch: 0, bendYaw: 0, bendRoll: 0, headPitch: 0, headYaw: 0, tailPitch: 0, tailYaw: 0, arm: 0, push: -1, pushSide: 0, bend: false, family: '' };
const num = (v) => Number.isFinite(v) ? v : 0;

// The motion layers of an ordinary creature this frame (an actor as writeCloseViewModel takes it), given its body family and
// its attack root pose (stage: 0 at rest). Pure: the same actor gives the same record.
export function creatureMotion(actor, family, root, out = MOTION) {
  out.lunge = 0; out.squash = 0; out.lean = 0; out.twist = 0; out.roll = 0; out.lift = 0; out.alpha = 1;
  out.bendPitch = 0; out.bendYaw = 0; out.bendRoll = 0; out.headPitch = 0; out.headYaw = 0; out.tailPitch = 0; out.tailYaw = 0; out.arm = 0; out.push = -1; out.pushSide = 0; out.bend = false; out.family = '';
  const M = CREATURE_MOTION, F = family && Object.hasOwn(M.families, family) ? M.families[family] : null;
  if (!F || !actor) return out;
  out.family = family;
  const R = M.react, reduce = !!actor.reduceMotion, amp = (reduce ? M.reduced.scale : 1) * F.react, move = reduce ? 0 : 1;
  const yaw = num(actor.yaw), cy = Math.cos(yaw), sy = Math.sin(yaw);
  // the push of the last blow in its own frame: bf forward (negative: pushed back), bs to its side (+ its left, the model's +Y)
  let hx = num(actor.hitX), hy = num(actor.hitY);
  if (hx === 0 && hy === 0) { hx = -cy; hy = -sy; }
  const bf = hx * cy + hy * sy, bs = -hx * sy + hy * cy;
  out.push = bf; out.pushSide = bs;
  const time = num(actor.effectTime) / 1000, seed = num(actor.seed), ph = (seed % 997) / 997 * 6.2832;
  // a flinch (the enemy-behaviour.ts flag, or any blow the art saw land), or a poise-break stagger on the same clock
  const fl = num(actor.flinch), reeling = !!actor.reeling && fl > 0;
  const fe = Math.max(reeling ? 0 : motionEnvelope(fl, R.flinch.in, R.flinch.out), motionEnvelope(num(actor.hitReact), R.flinch.in, R.flinch.out));
  if (fe > 0) {
    const Q = R.flinch, k = fe * amp;
    out.lean += Q.lean * bf * k; out.bendPitch += Q.bend * bf * k; out.roll += Q.roll * bs * k; out.twist += Q.twist * bs * k;
    out.headPitch += Q.head * bf * k; out.headYaw += Q.headYaw * bs * k; out.squash += Q.squash * k; out.lunge += Q.back * bf * fe * move; out.arm += Q.arm * k;
    out.tailPitch -= Q.bend * bf * k; out.tailYaw -= Q.twist * bs * k;
  }
  if (reeling) {
    const Q = R.stagger, k = motionEnvelope(fl, Q.in, Q.out), t = 1 - Math.min(1, fl), w = Math.sin(t * 6.2832 * Q.swayHz);
    // a stumble back along the push in two lurches, the knees buckling, the torso and head whipping and swaying
    out.lunge += Q.back * bf * k * (1 + Q.lurch * Math.sin(t * 12.566)) * move; out.squash += Q.squash * k * amp;
    out.lean += Q.lean * bf * k * amp; out.bendPitch += (Q.bend * bf + .5 * Q.bend * w) * k * amp;
    out.roll += (Q.sway * w + .5 * Q.sway * bs) * k * amp; out.headPitch += Q.head * (bf * .6 + .4 * Math.sin(t * 9.42)) * k * amp;
    out.headYaw += Q.head * .5 * bs * k * amp; out.arm += .4 * k * amp; out.tailYaw -= Q.sway * 2 * w * k * amp;
  }
  const daze = num(actor.stagger);
  if (daze > 0 && !reduce) { const Q = R.daze; out.roll += Q.sway * daze * Math.sin((time * Q.hz + seed % 7 / 7) * 6.2832); out.headPitch += .2 * daze; }
  const guard = motionEnvelope(num(actor.guard), R.guard.in, R.guard.out);
  if (guard > 0) {
    const Q = R.guard, k = guard * amp, side = seed % 2 ? 1 : -1;
    out.squash += Q.squash * k; out.lean += Q.lean * k; out.twist += Q.twist * side * k; out.bendPitch += Q.bend * k; out.headPitch += Q.head * k; out.arm += Q.arm * k;
  }
  const dodgeV = num(actor.dodge), dodge = motionEnvelope(dodgeV, R.dodge.in, R.dodge.out);
  if (dodge > 0) {
    const Q = R.dodge, k = dodge * amp, side = actor.dodgeSide < 0 ? -1 : 1;
    out.roll += Q.roll * side * k; out.twist -= Q.twist * side * k; out.squash += Q.squash * k; out.headYaw -= Q.head * side * k; out.bendRoll += .5 * Q.roll * side * k;
    out.lift += Q.hop * Math.sin(Math.PI * (1 - Math.min(1, dodgeV))) * move;
  }
  const feintV = num(actor.feint), feint = motionEnvelope(feintV, R.feint.in, R.feint.out);
  if (feint > 0) {
    // the break-off: pulled back out of the coil, leaning off to the side it steps, a shake of the head
    const Q = R.feint, k = feint * amp, side = actor.feintSide < 0 ? -1 : 1, t = 1 - Math.min(1, feintV);
    out.lunge -= Q.back * feint * move; out.lean -= Q.lean * k; out.roll += Q.roll * side * k; out.headYaw += Q.shake * Math.sin(t * 6.2832 * Q.shakeHz) * k; out.bendRoll += .5 * Q.roll * side * k;
  }
  const alert = motionEnvelope(num(actor.alert), R.alert.in, R.alert.out);
  if (alert > 0) {
    // the startle: it straightens up and lifts its head, then settles into its stance
    const Q = R.alert, k = alert * amp;
    out.squash -= Q.stretch * k; out.lift += Q.lift * alert * move; out.headPitch -= Q.head * k; out.lean -= Q.lean * k; out.bendPitch -= .5 * Q.lean * k;
  }
  const arrive = num(actor.arrive);
  if (arrive > 0) {
    const Q = R.arrive, a = Math.min(1, arrive), style = reduce ? 'fade' : actor.arriveStyle;
    if (style === 'emerge') { out.squash += Q.emerge * a * a; out.alpha *= smooth((1 - a) / Q.fadeIn); out.headPitch -= Q.head * a; }
    else if (style === 'drop') { out.lift += Q.drop * a * a; out.alpha *= smooth((1 - a) / Q.dropFade); if (a < Q.landAt) out.squash += Q.land * Math.sin(Math.PI * a / Q.landAt); }
    else { out.alpha *= smooth(1 - a); out.lift += Q.fadeLift * a * move; }
  }
  // the heavy blow's punish window (its recovery and the cooldown after): slumped, heaving
  const spent = clamp01(num(actor.spent)), H = M.heavy.spent;
  if (spent > 0) { const k = spent * amp; out.lean += H.lean * k; out.squash += H.squash * k; out.headPitch += H.head * k; }
  if (!reduce) {
    // idle and locomotion life
    const pace = clamp01(num(actor.pace)), rest = 1 - pace, busy = !root || !root.stage ? 1 : root.stage === 4 ? .35 + .65 * clamp01(root.u) : .35, turn = deadband(num(actor.turn)), accel = deadband(num(actor.accel));
    const b = Math.sin(time * 6.2832 * F.breath[0] + ph) * busy * (1 + H.breath * spent);
    // detail (close-view.ts, by quality tier): 2 every layer; 1 no counter-turn of the torso in stride; 0 rigid life only (the bend still carries
    // the reactions, which are brief)
    const detail = actor.motionDetail === 0 || actor.motionDetail === 1 ? actor.motionDetail : 2, gait = num(actor.phase), sw = time * 6.2832 * F.sway[0] + ph * 1.7;
    out.squash -= F.breath[1] * b * (.4 + .6 * rest); out.roll += F.sway[1] * Math.sin(sw) * rest * busy; out.roll += F.step * Math.sin(gait) * pace;
    out.roll += F.bank * turn * pace; out.lean += .05 * accel;
    // at rest the chest's rise and the hips' weight shift stay rigid (no bend, so a creature standing still costs no more to draw)
    out.lean -= .5 * F.breath[2] * b; out.twist += F.sway[2] * Math.sin(sw * .61 + 1.3) * rest * (!root || !root.stage ? 1 : root.stage === 4 ? clamp01(root.u) : 0);
    if (detail === 2 && pace > .05) out.bendYaw += .5 * F.step * Math.cos(gait) * pace;
    if (detail >= 1) { out.headYaw += F.head * turn; out.tailYaw -= F.tail * turn; out.headPitch -= .1 * F.head * accel; out.tailPitch += .3 * F.tail * accel; }
    if (F.hang > 0 && detail === 2) { out.tailPitch += F.hang * (.12 * accel + .05 * Math.sin(time * 4.4 + ph)); out.tailYaw += F.hang * (.07 * Math.sin(time * 2.9 + ph * 1.3) - .2 * turn); }
  }
  if (out.squash > .7) out.squash = .7; else if (out.squash < -.12) out.squash = -.12;
  out.bend = out.bendPitch !== 0 || out.bendYaw !== 0 || out.bendRoll !== 0 || out.headPitch !== 0 || out.headYaw !== 0 || out.tailPitch !== 0 || out.tailYaw !== 0;
  return out;
}

// Continuity across an interrupted or chained attack (CREATURE_MOTION.carry). `state` is one small Float32Array kept per creature
// by the caller (close-view.ts tracks; MOTION_STATE_FLOATS long), or null. `pose` is the attack root pose about to be drawn
// ({ lunge, squash, lean, twist, lift }, close-view-models.ts creatureRootPose), rewritten in place. Forward steps of the attack
// (rest -> coil -> strike -> hold -> recover -> rest) are drawn exactly as sampled, so the strike always lands on its frame; a step
// back (a windup broken off by a feint, a poise break or a freeze; a recovery chained into the next coil of a combo) or a jump
// inside the coil eases from the last drawn pose over `carry.ms`, on the actor's own clock (a paused or repeated frame changes
// nothing). Layout: [0-4] last drawn, [5-9] last sampled, [10-14] the carried offset, [15] stage, [16] weight, [17] time, [18] set.
export const MOTION_STATE_FLOATS = 20;
export function motionCarry(state, pose, stage, timeMs) {
  if (!(state instanceof Float32Array) || state.length < MOTION_STATE_FLOATS || !pose) return pose;
  const C = CREATURE_MOTION.carry, now = num(timeMs), l = pose.lunge, q = pose.squash, n = pose.lean, t = pose.twist, f = pose.lift;
  if (state[18] !== 1) { state[0] = state[5] = l; state[1] = state[6] = q; state[2] = state[7] = n; state[3] = state[8] = t; state[4] = state[9] = f; state[15] = stage; state[16] = 0; state[17] = now; state[18] = 1; return pose; }
  const last = state[15], dt = Math.max(0, Math.min(.1, (now - state[17]) / 1000));
  let w = state[16];
  if (dt > 0 && w > 0) w = Math.max(0, w - dt * 1000 / C.ms);
  // the strike and its held extension (stages 2 and 3) are always drawn as sampled
  let back = false;
  if (stage === 2 || stage === 3) w = 0;
  else {
    back = stage < last && !(last === 4 && stage === 0);
    if (!back) back = Math.abs(l - state[5]) > C.jump || Math.abs(q - state[6]) > C.jump || Math.abs(n - state[7]) > C.jump || Math.abs(t - state[8]) > C.jump || Math.abs(f - state[9]) > C.jump;
  }
  if (back && (dt > 0 || stage !== last)) { state[10] = state[0] - l; state[11] = state[1] - q; state[12] = state[2] - n; state[13] = state[3] - t; state[14] = state[4] - f; w = 1; }
  if (w > 0) { const e = w * w * (3 - 2 * w); pose.lunge = l + state[10] * e; pose.squash = q + state[11] * e; pose.lean = n + state[12] * e; pose.twist = t + state[13] * e; pose.lift = f + state[14] * e; }
  state[0] = pose.lunge; state[1] = pose.squash; state[2] = pose.lean; state[3] = pose.twist; state[4] = pose.lift;
  state[5] = l; state[6] = q; state[7] = n; state[8] = t; state[9] = f; state[15] = stage; state[16] = w; state[17] = now;
  return pose;
}

// Close View swap weight (CREATURE_MOTION.swap): how far a creature has come into its body (1) from its card (0), stepped by
// `dtMs` toward `goal`. Pure.
export function swapStep(weight, goal, dtMs) {
  const w = Number.isFinite(weight) ? weight : goal, k = Math.max(0, num(dtMs)) / CREATURE_MOTION.swap.ms;
  return goal > w ? Math.min(goal, w + k) : Math.max(goal, w - k);
}
export const swapEase = smooth;
// The death fade: whole until `death.fade` of the fall is left, then out to nothing as it ends (no pop when the body goes).
export function deathAlpha(amount) { const f = CREATURE_MOTION.death.fade; return 1 - smooth((num(amount) - (1 - f)) / f); }
