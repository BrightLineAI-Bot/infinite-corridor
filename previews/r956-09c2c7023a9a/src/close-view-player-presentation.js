// Pure player form facts and read-only selection. No mesh, Game or renderer dependencies.
import { TOOL_ACTION_TIMING, TOOL_USE_STARTUP_MS } from './action-motion.js?v=r956-09c2c7023a9a';
import { PRIMARY_SWINGS, swingStep, sampleSwing } from './melee-swing.js?v=r956-09c2c7023a9a';
const RIGHT_HAND = Object.freeze({ grip: 'leftSocket', free: 'rightSocket' });
const LEFT_HAND = Object.freeze({ grip: 'rightSocket', free: 'leftSocket' });
// Close View held gear, presentation only (Tim, 2026-11-11: every sword in the left hand,
// guns and tools in the right, tools a little smaller, Rift Bombard and Blunderbuss held
// two-handed like a rifle while firing). `hand` is the DISPLAYED anatomical hand. Source
// labels are retained: in the existing projection source-left (leftSocket, native swing +2,
// recipe/model +Y) is the displayed anatomical right, so a right-hand item uses leftSocket.
// `scale` multiplies the imported .82 recipe conversion and the native baked tool recipe.
// `grip`: 'one' one-handed, 'rifle' trigger hand plus a support hand under the barrel while
// firing, 'pike' the existing two-handed polearm frame.
export const CLOSE_VIEW_HELD_GEAR = Object.freeze({
  melee: Object.freeze({ hand: 'left', scale: 1, grip: 'one' }),
  'salvage-blade': Object.freeze({ hand: 'left', scale: 1, grip: 'one' }),
  'fourfold-daggers': Object.freeze({ hand: 'left', scale: 1, grip: 'paired' }), // 2026-11-14: a dagger in each hand (close-view-models.ts writeCloseViewHeroGear draws one on each socket)
  'verge-cleaver': Object.freeze({ hand: 'left', scale: 1, grip: 'one' }),
  'quandrix-staff': Object.freeze({ hand: 'left', scale: 1, grip: 'one' }), // a primary: held where every primary is (2026-11-13)
  'cinder-pike': Object.freeze({ hand: 'left', scale: 1, grip: 'pike' }),
  'great-sweep': Object.freeze({ hand: 'left', scale: 1, grip: 'one' }),
  mirage: Object.freeze({ hand: 'left', scale: 1, grip: 'one' }),
  emitter: Object.freeze({ hand: 'right', scale: .8, grip: 'one' }),
  'spark-coil': Object.freeze({ hand: 'right', scale: .8, grip: 'one' }),
  'needle-caster': Object.freeze({ hand: 'right', scale: .8, grip: 'one' }),
  carbine: Object.freeze({ hand: 'right', scale: .8, grip: 'one' }), // the Spark Coil's upgraded form: compact, one-handed
  'lumen-spindle': Object.freeze({ hand: 'right', scale: .8, grip: 'one' }),
  'rift-bombard': Object.freeze({ hand: 'right', scale: .78, grip: 'rifle' }),
  blunderbuss: Object.freeze({ hand: 'right', scale: .8, grip: 'rifle' }),
  hammer: Object.freeze({ hand: 'right', scale: .85, grip: 'one' }),
  'orrery-tap': Object.freeze({ hand: 'right', scale: .85, grip: 'one' }),
  'orrery-release': Object.freeze({ hand: 'right', scale: .85, grip: 'one' }),
});
// Rifle-grip tuning (imported source space, metres of the fitted rig; native recipe radians).
// raise: added to the accepted tool motion's shoulder-relative target (negative up lowers it) (side is toward the
// body's centre line), weighted by its raise envelope. support: the point the support hand
// takes, along the barrel from the grip in recipe units (.79 = grip) and below it.
export const CLOSE_VIEW_RIFLE_GRIP = Object.freeze({
  // Tim 2026-11-11: the Bombard is held low, two hands on it down by the hip/waist, muzzle forward.
  'rift-bombard': Object.freeze({ raise: Object.freeze([.07, -.26, -.12]), pitch: 0, support: Object.freeze([1.20, .045]), supportYaw: .55, supportPitch: -.35, nativeRaise: -.35, nativeReach: .92, nativeInward: .55 }),
  blunderbuss: Object.freeze({ raise: Object.freeze([.11, .19, -.06]), pitch: .10, support: Object.freeze([1.22, .04]), supportYaw: .55, supportPitch: -.35, nativeRaise: .28, nativeReach: .92, nativeInward: .55 }),
});
export const closeViewHeldGear = (profile) => Object.hasOwn(CLOSE_VIEW_HELD_GEAR, profile) ? CLOSE_VIEW_HELD_GEAR[profile] : null;
export const closeViewHeldHand = (profile) => closeViewHeldGear(profile)?.hand ?? 'left';
export const closeViewHeldScale = (profile) => closeViewHeldGear(profile)?.scale ?? 1;
// Which socket holds the FINAL held owner and which hand is free. Unknown profiles keep the
// established left-hand (source rightSocket) grip. `stage` is accepted for older callers;
// every Verge Cleaver record now resolves to the same left-hand grip.
export function closeViewHandRoles(finalProfile) {
  return closeViewHeldHand(finalProfile) === 'right' ? RIGHT_HAND : LEFT_HAND;
}
export function cleaverHandRoles(finalProfile, stage = null) {
  return closeViewHandRoles(finalProfile);
}
const cutSmooth = x => { x = Math.max(0, Math.min(1, x)); return x*x*(3-2*x); };
const unit = value => Math.max(0, Math.min(1, Number(value)||0));
export function sampleDrinkPose(phase=0,reducedMotion=false,out={}) {
  const p=unit(phase),lift=p<.34?cutSmooth(p/.34):p<.66?1:1-cutSmooth((p-.66)/.34);
  out.weight=lift;out.sip=p>=.34&&p<=.66?cutSmooth((p-.34)/.12)*(1-cutSmooth((p-.54)/.12)):0;
  out.arm=lift*(reducedMotion?.72:1);out.head=lift*(reducedMotion?.55:1);return out;
}
export function cacheReachWeight(phase, reducedMotion = false) {
  const p = unit(phase);
  const reach = p < .38 ? cutSmooth(p / .38) : p < .57 ? 1 : 1 - cutSmooth((p - .57) / .43);
  return reach * (reducedMotion ? .6 : 1);
}
export function chestOpenWeight(phase, reducedMotion = false) {
  const p = unit(phase);
  const reach = p < .32 ? cutSmooth(p / .32) : p < .65 ? 1 : 1 - cutSmooth((p - .65) / .35);
  return reach * (reducedMotion ? .6 : 1);
}
export function sampleShovelDigPose(phase, reducedMotion = false, out = {}) {
  const p=unit(phase),down=cutSmooth(p/.34),recover=cutSmooth((p-.68)/.32),hold=down*(1-recover),lever=cutSmooth((p-.34)/.20)*(1-cutSmooth((p-.58)/.10)),scale=reducedMotion?.68:1;
  out.weight=hold*scale;out.down=down*(1-recover)*scale;out.lever=lever*scale;out.recover=recover;return out;
}
export function stonePlaceWeight(phase, reducedMotion = false) {
  const p=unit(phase),weight=p<.38?cutSmooth(p/.38):1-cutSmooth((p-.58)/.42);
  return weight*(reducedMotion?.62:1);
}
// Accepted Stage 10b descriptors share one contact clock across native, imported and
// reduced-motion presentation.  This sampler is deliberately geometry-only so the
// renderer can also use it for a bounded weapon trail without inventing another timer.
export function sampleMeleeActionPose(action, progress = 0, variant = 1, fistLead = 'right') {
  if(action?.v===3&&action.kind==='verge-cleaver'&&action.move==='swing')return sampleSwingActionPose(action,progress);
  if(action?.v===3&&action.kind==='fourfold-daggers'&&action.move==='swing')return sampleDaggerActionPose(action,progress);
  const cleaver=action?.v===1&&action.kind==='verge-cleaver'&&action.move==='cleaver';
  const quickCleaver=action?.v===2&&action.kind==='verge-cleaver'&&action.move==='cleaver';
  const fists=action?.v===1&&action.kind==='iron-fists'&&['dash','jab','uppercut'].includes(action.move);
  const duration=Number(action?.durationMs),contactMs=Number(action?.contactMs);
  if((!cleaver&&!quickCleaver&&!fists)||!Number.isFinite(duration)||duration<=0||!Number.isFinite(contactMs)||contactMs<0||contactMs>duration)return null;
  const p=unit(progress),contact=unit(contactMs/duration),before=contact>0?cutSmooth(p/contact):1;
  const followEnd=Math.min(1,contact+Math.max(.12,(1-contact)*.38));
  const follow=p<=contact?0:cutSmooth((p-contact)/Math.max(.001,followEnd-contact));
  const recovery=p<=followEnd?0:cutSmooth((p-followEnd)/Math.max(.001,1-followEnd));
  const weight=(p<=contact?before:1-recovery),drive=before*(1-.28*follow)*(1-recovery);
  const step=Math.max(1,Math.min(4,Math.trunc(Number(variant))||1));
  const up=step===1||step===3,diagonal=quickCleaver?(step===2?-1:1):(step>2?-1:1);
  const travel = p <= contact ? .72 * before : Math.min(1, .72 + .28 * follow);
  const openingLead=fistLead==='left'?-1:1,lead=action.move==='jab'?-openingLead:openingLead;
  return Object.freeze({kind:action.kind,actionVersion:action.v,move:action.move,progress:p,contact,phase:p<contact?'windup':p<=followEnd?'follow-through':'recovery',weight,drive,recovery,lead,openingLead,cutIndex:step,
    pitch:quickCleaver?(.10-.18*travel):cleaver?(up?-.72+1.54*travel:.82-1.54*travel):0,
    yaw:(cleaver||quickCleaver)?diagonal*(.30-.62*travel):0,rise:quickCleaver?.18+.12*travel:cleaver?(up?travel:1-travel):0,
    side:(cleaver||quickCleaver)?diagonal*(.13-.27*travel):0,twist:(cleaver||quickCleaver)?diagonal*(.22-.44*travel)*weight:lead*(action.move==='uppercut'?.30:.18)*weight});
}
// Verge Cleaver slashes (Tim, 2026-11-12: "scrap it and start over, just do some standard sword
// slashes"). Presentation only: the accepted quick action (CLOSE_VIEW_MELEE_TIMING.cleaverQuick)
// owns the clock and its contact; nothing here moves a hit. Each step is a short wind-up from the
// hip carry (guard), one fast swing around a pivot in front of the chest that crosses the strike
// zone at contact, a follow-through and a recovery back to guard.
// Character frame: [side, up, forward], side +1 toward the sword hand. Lengths are in arm reaches
// from the sword shoulder. The blade turns in one plane: at angle 0 (contact) it points along
// `ref`; positive angles move it along `travel`. The flat stays in the swing plane, so an edge leads;
// `edge` picks which (both are bright bevels) to match the hand at guard: no wrist roll. Angles in degrees.
// `twist` (chest toward the sword side, radians) and `lean` (forward) run from the wind-up to the
// end of the follow-through.
export const CLOSE_VIEW_CLEAVER_SLASH_TIMING = Object.freeze({
  windup: .45, // wind-up ends at this fraction of the contact time
  follow: .30, // follow-through ends this fraction of the post-contact time after contact
  reducedBody: .55, // reduced motion keeps the blade arc, with less body motion
});
// Tim, 2026-11-13: the combo is three wide, sweeping, level swings: across, back, then across again,
// the last the widest and weightiest. Every plane is level (`ref` and `travel` have no up component),
// so the blade and its tip hold one height through the sweep; the body turns into each one.
export const CLOSE_VIEW_CLEAVER_SLASHES = Object.freeze([
  // 1: forehand, from the sword side across the front to the far side, at chest height.
  Object.freeze({ name: 'forehand', pivot: Object.freeze([-.30, -.24, .36]), hand: .46,
    ref: Object.freeze([-.06, 0, 1]), travel: Object.freeze([-1, 0, 0]), from: -100, to: 80, edge: -1,
    twist: Object.freeze([.32, -.30]), lean: Object.freeze([-.02, .10]), guard: .30 }),
  // 2: backhand, from the far side back across to the sword side, at the same height.
  Object.freeze({ name: 'return', pivot: Object.freeze([-.30, -.24, .36]), hand: .46,
    ref: Object.freeze([-.06, 0, 1]), travel: Object.freeze([1, 0, 0]), from: -100, to: 78, edge: 1,
    twist: Object.freeze([-.32, .30]), lean: Object.freeze([.02, .08]), guard: .24 }),
  // 3: finisher, across again a little lower and much wider: drawn further back behind the sword
  // side, carried further round past the far side, with the biggest body turn and lean.
  Object.freeze({ name: 'finisher', pivot: Object.freeze([-.30, -.32, .36]), hand: .48,
    ref: Object.freeze([-.06, 0, 1]), travel: Object.freeze([-1, 0, 0]), from: -125, to: 100, edge: -1,
    twist: Object.freeze([.50, -.48]), lean: Object.freeze([-.04, .16]), guard: .36 }),
]);
// Weighted swings (melee-swing.ts, 2026-11-14): the Close View pose of each step, driven by the same sampler as the hit.
// Same format as CLOSE_VIEW_CLEAVER_SLASHES. The hit's arc (PRIMARY_SWINGS from..to) maps linearly onto this plane's
// from..to, so the blade crosses the aim when the hit does; the wind-up cock and the follow-through overshoot carry the
// blade past both ends. 1: a high forehand diagonal, from high on the sword side down across to the far hip. 2: a flat
// backhand. 3: an overhead finisher, raised over the head and brought down across the front to bury low.
export const CLOSE_VIEW_SWING_SLASHES = Object.freeze([
  Object.freeze({ name: 'swing-forehand', pivot: Object.freeze([-.30, -.16, .36]), hand: .47,
    ref: Object.freeze([-.06, 0, 1]), travel: Object.freeze([-1, -.65, 0]), from: -100, to: 82, edge: -1,
    twist: Object.freeze([.48, -.42]), lean: Object.freeze([-.05, .15]), guard: .34 }),
  Object.freeze({ name: 'swing-backhand', pivot: Object.freeze([-.30, -.24, .36]), hand: .46,
    ref: Object.freeze([-.06, 0, 1]), travel: Object.freeze([1, 0, 0]), from: -96, to: 80, edge: 1,
    twist: Object.freeze([-.44, .38]), lean: Object.freeze([.02, .12]), guard: .26 }),
  Object.freeze({ name: 'swing-finisher', pivot: Object.freeze([-.24, -.08, .30]), hand: .50,
    ref: Object.freeze([-.06, 0, 1]), travel: Object.freeze([-.40, -1, 0]), from: -125, to: 64, edge: -1,
    twist: Object.freeze([.58, -.40]), lean: Object.freeze([-.12, .34]), guard: .42 }),
]);
// The slash sample for a weighted swing at its own clock (ms at tempo 1). Same output fields as sampleCleaverSlash.
export function sampleSwingSlash(step, elapsedMs, out = {}) {
  const st = swingStep(PRIMARY_SWINGS['verge-cleaver'], step), spec = CLOSE_VIEW_SWING_SLASHES[Math.max(1, Math.min(3, Math.trunc(Number(step)) || 1)) - 1];
  const s = sampleSwing(st, elapsedMs, 1, out.sample || (out.sample = {})), k = (s.angle - st.from) / ((st.to - st.from) || 1), rad = Math.PI / 180;
  out.spec = spec; out.weight = s.weight; out.angle = (spec.from + (spec.to - spec.from) * k) * rad; out.phase = s.phase;
  out.swing = k; out.windEnd = s.times.windEnd / st.recoveryMs; out.contact = s.times.windEnd / st.recoveryMs; out.followEnd = s.times.followEnd / st.recoveryMs;
  return out;
}
function sampleSwingActionPose(action, progress) {
  const st = swingStep(PRIMARY_SWINGS['verge-cleaver'], action.step), tempo = Number(action.tempo) || 1, duration = Number(action.durationMs);
  if (!st || !Number.isFinite(duration) || duration <= 0) return null;
  const p = unit(progress), e = p * duration / tempo, s = sampleSwing(st, e, 1), T = s.times, k = Math.max(-.2, Math.min(1.2, (s.angle - st.from) / ((st.to - st.from) || 1)));
  const travel = Math.max(0, Math.min(1, k)), dir = st.to > st.from ? 1 : -1, w = s.weight;
  return Object.freeze({ kind: 'verge-cleaver', actionVersion: 3, move: 'swing', progress: p, contact: unit(T.windEnd / st.recoveryMs), phase: s.phase === 'active' ? 'swing' : s.phase === 'follow' ? 'follow-through' : s.phase === 'recover' || s.phase === 'done' ? 'recovery' : 'windup',
    weight: w, drive: w * (s.phase === 'windup' || s.phase === 'hold' ? .3 : 1), recovery: s.phase === 'recover' ? 1 - w : s.phase === 'done' ? 1 : 0, lead: 1, openingLead: 1, cutIndex: Math.trunc(Number(action.step)) || 1, elapsedMs: e,
    pitch: (action.step === 3 ? .30 - .62 * travel : .10 - .18 * travel), yaw: dir * (.30 - .62 * travel), rise: action.step === 3 ? .55 - .45 * travel : .18 + .12 * travel,
    side: dir * (.13 - .27 * travel), twist: dir * (.26 - .52 * travel) * w });
}
// The Fourfold Daggers' cuts (melee-swing.ts PRIMARY_SWINGS['fourfold-daggers'], 2026-11-14): the pose of each hand, driven by
// the same sampler as the hit. Each cut is a level arc in front of the chest around its own shoulder; the blade heads where
// the hit's blade heads (angle 0 along the aim, positive toward the displayed right), wind-up cock and follow-through
// included, so the two hands' cuts cross in an X in front of the Wayfarer. Character frame [right, up, forward] in arm
// reaches from that hand's shoulder: `pivot` (x mirrored for the left hand), `hand` the arc's radius; `guard` the hand not
// cutting, held up in front of its own shoulder with its blade forward; `pitch` the blade's tilt (radians, + up); `twist`
// the chest's turn into the cut at full sweep and `lean` forward (radians). Presentation only.
export const CLOSE_VIEW_DAGGER_CUTS = Object.freeze({
  pivot: Object.freeze([-.12, -.30, .26]), hand: .44, pitch: .10,
  guard: Object.freeze({ hand: Object.freeze([-.06, -.26, .36]), yaw: -.12, pitch: .55 }),
  twist: .30, lean: .10, reducedBody: .55,
});
const DAGGER_SAMPLE = {}; // scratch: the sampler writes into it
function sampleDaggerActionPose(action, progress) {
  const spec = PRIMARY_SWINGS['fourfold-daggers'], st = swingStep(spec, action.step), tempo = Number(action.tempo) || 1, duration = Number(action.durationMs);
  if (!st || !Number.isFinite(duration) || duration <= 0) return null;
  const p = unit(progress), e = p * duration / tempo, s = sampleSwing(st, e, 1, DAGGER_SAMPLE), T = s.times;
  return Object.freeze({ kind: 'fourfold-daggers', actionVersion: 3, move: 'swing', progress: p, contact: unit(T.windEnd / st.recoveryMs), phase: s.phase === 'active' ? 'swing' : s.phase === 'follow' ? 'follow-through' : s.phase === 'recover' || s.phase === 'done' ? 'recovery' : 'windup',
    weight: s.weight, drive: s.weight, recovery: s.phase === 'recover' ? 1 - s.weight : s.phase === 'done' ? 1 : 0, lead: Math.sign(st.side) || 1, openingLead: 1, cutIndex: Math.trunc(Number(action.step)) || 1, elapsedMs: e,
    angle: s.angle * Math.PI / 180, sweep: s.sweep, hand: Math.sign(st.side) || 1, pair: !!st.pair });
}
// Clock sampler for one slash step at accepted action progress p (0..1) with the accepted contact
// fraction. Writes into `out` (no allocation): weight (guard 0 .. slash 1), angle (radians, 0 at
// contact), swing (0 at the wind-up pose .. 1 at the end of the follow-through), phase. While the
// weight is below 1 (wind-up, recovery) the renderer turns the blade in the slash plane from the
// guard angle toward `angle` by the weight, so it is raised through the front and never spun round.
export function sampleCleaverSlash(step, progress, contact, out = {}) {
  const spec = CLOSE_VIEW_CLEAVER_SLASHES[Math.max(1, Math.min(3, Math.trunc(Number(step)) || 1)) - 1], T = CLOSE_VIEW_CLEAVER_SLASH_TIMING;
  const p = unit(progress), c = Math.max(.02, Math.min(.98, Number.isFinite(contact) ? contact : .3));
  const windEnd = c * T.windup, followEnd = c + (1 - c) * T.follow, rad = Math.PI / 180;
  let angle, weight, phase;
  if (p < windEnd) { weight = cutSmooth(p / windEnd); angle = spec.from * rad; phase = 'windup'; }
  else if (p < c) { const u = (p - windEnd) / (c - windEnd); weight = 1; angle = spec.from * rad * (1 - u * u); phase = 'swing'; }
  else if (p < followEnd) { const v = 1 - (p - c) / (followEnd - c); weight = 1; angle = spec.to * rad * (1 - v * v); phase = 'follow-through'; }
  else { weight = p >= 1 ? 0 : 1 - cutSmooth((p - followEnd) / (1 - followEnd)); angle = spec.to * rad; phase = 'recovery'; }
  out.spec = spec; out.weight = weight; out.angle = angle; out.phase = phase;
  out.swing = (angle - spec.from * rad) / ((spec.to - spec.from) * rad);
  out.windEnd = windEnd; out.contact = c; out.followEnd = followEnd;
  return out;
}
// The in-plane angle of a character-frame blade direction (the guard), kept inside [from, to].
export function cleaverSlashAngle(spec, x, y, z) {
  const r = spec.ref, t = spec.travel, rl = Math.hypot(r[0], r[1], r[2]) || 1;
  const rx = r[0] / rl, ry = r[1] / rl, rz = r[2] / rl, along = t[0] * rx + t[1] * ry + t[2] * rz;
  const tx = t[0] - along * rx, ty = t[1] - along * ry, tz = t[2] - along * rz, rad = Math.PI / 180;
  const a = Math.atan2((x * tx + y * ty + z * tz) / (Math.hypot(tx, ty, tz) || 1), x * rx + y * ry + z * rz);
  return Number.isFinite(a) ? Math.max(spec.from * rad, Math.min(spec.to * rad, a)) : 0;
}
// Blade direction and leading edge (unit vectors, character frame) at a slash angle.
// `out` holds six numbers: direction [0..2], edge [3..5].
export function cleaverSlashBlade(spec, angle, out = new Float64Array(6)) {
  const r = spec.ref, t = spec.travel, rl = Math.hypot(r[0], r[1], r[2]) || 1;
  const rx = r[0] / rl, ry = r[1] / rl, rz = r[2] / rl, along = t[0] * rx + t[1] * ry + t[2] * rz;
  let tx = t[0] - along * rx, ty = t[1] - along * ry, tz = t[2] - along * rz; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
  const c = Math.cos(angle), s = Math.sin(angle), e = spec.edge < 0 ? -1 : 1;
  out[0] = rx * c + tx * s; out[1] = ry * c + ty * s; out[2] = rz * c + tz * s;
  out[3] = e * (tx * c - rx * s); out[4] = e * (ty * c - ry * s); out[5] = e * (tz * c - rz * s);
  return out;
}
// Great Sweep (Tim, 2026-11-12: "he takes the Great Sweep out and does a full sweeping animation when
// you attack with it... and then he just keeps holding the Great Sweep until you attack with something
// else"; later the same day: "when he uses the tool in its standard form it should be a 360° sweep
// around you"). Presentation only: the accepted tool action (TOOL_ACTION_TIMING / TOOL_USE_STARTUP_MS)
// owns the clock and the hit; nothing here moves a hit. The hit is a circle all round the Wayfarer for
// the effect's life (BRAWLER['great-sweep']: radius 2.4, lifetime .3 s), so the use is one full turn:
// a short wind-up with the blade drawn back behind the sweep shoulder and the body turned against the
// turn, then the Wayfarer spins once round with the blade held level and straight out to the sweep
// side while the effect lives, a short follow-through across the front, and back to the carry.
// The blade lives in one swing plane around a pivot in front of the chest. Character frame:
// [side, up, forward], side +1 toward the sweep hand. Lengths are in arm reaches from the sweep
// shoulder. At angle 0 the blade points along `ref`; positive angles move it along `travel`. The flat
// lies in the plane and the edge leads (`edge`), so the wrist never rolls. In-plane angles: `from`
// (wind-up), `out` (held through the turn), `to` (follow-through end), degrees. `spin` is the body's
// own turn about the vertical, degrees: `windup` against the turn, then `turn` (one revolution) across
// the arc; positive spin carries the blade the same way as positive plane angles, so the tip only ever
// moves one way round. `twist` (chest leading into the turn, radians) and `lean` (forward) peak mid-turn
// and are zero at its ends; `guard` lifts the free arm. Data, so a later change can make the hit follow it.
export const CLOSE_VIEW_GREAT_SWEEP = Object.freeze({
  pivot: Object.freeze([-.34, -.30, .30]), hand: .50,
  ref: Object.freeze([0, -.06, 1]), travel: Object.freeze([-1, -.04, 0]), from: -112, out: -95, to: -55, edge: 1,
  spin: Object.freeze({ windup: -18, turn: 360 }),
  // The turn runs from the release (startup) for the sweep effect's life (BRAWLER['great-sweep'].lifetime),
  // the follow-through for `followMs`, then the carry returns by the end of the accepted action.
  swingMs: 300, followMs: 120,
  twist: -.26, lean: .10, guard: .30, reducedBody: .55,
  // Held carry between uses: the hand low at the sweep hip and the long blade out forward and down, its
  // flat toward the camera behind and above. `hand` is from the shoulder, `blade` and `edge` directions.
  carry: Object.freeze({ hand: Object.freeze([.16, -.74, .22]), blade: Object.freeze([.58, -.40, .71]), edge: Object.freeze([0, .86, .51]) }),
});
// Clock sampler for one Great Sweep use at accepted elapsed ms. `startupMs` is the accepted release
// offset (the stored toolUse startup, or the nominal TOOL_USE_STARTUP_MS for a record without one) and
// `durationMs` the accepted action length; a record shorter than the table scales the arc with it.
// Writes into `out` (no allocation): weight (carry 0 .. arc 1), angle (radians in the plane), spin
// (body turn, radians; a whole turn is the same facing), sweep (the blade's heading round the body,
// spin + angle, radians, never decreasing through a use), swing (0 at the wind-up .. 1 at the end of
// the turn) and phase. The weight is 0 at both ends: the carry.
export function sampleGreatSweep(elapsedMs, startupMs = TOOL_USE_STARTUP_MS['great-sweep'], durationMs = TOOL_ACTION_TIMING['great-sweep'].durationMs, out = {}) {
  const S = CLOSE_VIEW_GREAT_SWEEP, T = TOOL_ACTION_TIMING['great-sweep'], rad = Math.PI / 180;
  const D = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : T.durationMs, k = Math.min(1, D / T.durationMs);
  const st = Math.max(1e-3, Math.min(D * .5, Number.isFinite(startupMs) && startupMs > 0 ? startupMs : TOOL_USE_STARTUP_MS['great-sweep'] * k));
  const e = Math.max(0, Math.min(D, Number.isFinite(elapsedMs) ? elapsedMs : 0));
  const swingEnd = Math.min(D, st + S.swingMs * k), followEnd = Math.min(D, swingEnd + S.followMs * k);
  let weight, angle, spin, swing, phase;
  if (e >= D) { weight = 0; angle = S.to; spin = 0; swing = 1; phase = 'carry'; }
  else if (e < st) { const u = cutSmooth(e / st); weight = u; angle = S.from; spin = S.spin.windup * u; swing = 0; phase = 'windup'; }
  else if (e < swingEnd) { const u = cutSmooth((e - st) / (swingEnd - st)); weight = 1; angle = S.from + (S.out - S.from) * Math.min(1, u * 3); spin = S.spin.windup + (S.spin.turn - S.spin.windup) * u; swing = u; phase = 'swing'; }
  else if (e < followEnd) { weight = 1; angle = S.out + (S.to - S.out) * cutSmooth((e - swingEnd) / Math.max(1e-3, followEnd - swingEnd)); spin = S.spin.turn; swing = 1; phase = 'follow-through'; }
  else { weight = 1 - cutSmooth((e - followEnd) / Math.max(1e-3, D - followEnd)); angle = S.to; spin = S.spin.turn; swing = 1; phase = 'recovery'; }
  out.weight = weight; out.angle = angle * rad; out.spin = spin * rad; out.sweep = (spin + angle) * rad; out.swing = swing; out.phase = phase;
  out.startupMs = st; out.swingEndMs = swingEnd; out.followEndMs = followEnd; out.durationMs = D;
  return out;
}
// Blade direction and leading edge (unit vectors, character frame) at a Great Sweep plane angle:
// the same one-plane math as the Cleaver slashes (cleaverSlashBlade), on the Great Sweep's plane.
// `out` holds six numbers: direction [0..2], edge [3..5].
export function greatSweepBlade(angle, out = new Float64Array(6)) { return cleaverSlashBlade(CLOSE_VIEW_GREAT_SWEEP, angle, out); }
// Character-frame blade tip at an arc angle, in arm reaches from the sweep shoulder, for a blade
// `length` reaches long past the hand. The tip runs on one circle about the pivot.
export function greatSweepTip(angle, length, out = new Float64Array(3)) {
  const S = CLOSE_VIEW_GREAT_SWEEP, b = greatSweepBlade(angle), r = S.hand + Math.max(0, Number(length) || 0);
  for (let k = 0; k < 3; k++) out[k] = S.pivot[k] + r * b[k];
  return out;
}
// The older four-cut Verge Cleaver (cleaverFourPose; Close View where the quick combo is not used,
// such as outdoors, and its native fallback): level sweeps alternating across (steps 1 and 3) and back
// (steps 2 and 4) on the same accepted clock (Tim, 2026-11-13). `pitch` is the blade's own elevation
// (0 is level), `yaw` its heading from the sword side (+) to the far side (-), `rise` the hand height
// (0 hip .. 1 shoulder) and `side` the hand's shift across, in arm reaches. Radians. `nativeLean` is the
// native fallback body's forward lean at full strike (the generic .29 tipped its sweep 10 degrees down in front).
export const CLEAVER_FOUR_SWEEP = Object.freeze({ pitch: 0, yaw: 1.25, rise: .55, side: .24, twist: .26, nativeLean: .12 });
export function cleaverCutMotion(stage, phase = 0) {
  const p = Math.max(0, Math.min(1, Number(phase)||0)), step = stage?.kind === 'cleaver-four' ? stage.step : 1;
  const weight = p < .12 ? cutSmooth(p/.12) : p <= .40 ? 1 : 1-cutSmooth((p-.40)/.60);
  const travel = cutSmooth((p-.12)/.28), across = step % 2 === 1 ? 1 : -1, S = CLEAVER_FOUR_SWEEP, sweep = across * (1 - 2 * travel);
  return { weight, travel, pitch: S.pitch, yaw: S.yaw * sweep, rise: S.rise, side: S.side * sweep, twist: S.twist * sweep * weight };
}
export const CLOSE_VIEW_PLAYER_FORM_PROFILES = Object.freeze({
  playerIronFists: Object.freeze({ head: 1.68, lift: 0, pose: 'fist' }),
  playerRobot: Object.freeze({ head: 1.49, lift: 0, pose: 'robot' }),
  playerPowerSuit: Object.freeze({ head: 1.68, lift: 0, pose: 'suit' }),
  playerEmberForm: Object.freeze({ head: 1.91, lift: 0, pose: 'ember' }),
});

export const PLAYER_FORM_HANDS = Object.freeze({
  playerIronFists: Object.freeze({ x:.22,y:-.35,z:.76,px:0,pz:1.20 }),
  playerRobot: Object.freeze({ x:.24,y:-.73,z:.54,px:0,pz:.96 }),
  playerPowerSuit: Object.freeze({ x:.14,y:-.27,z:.82,px:0,pz:1.18 }),
  playerEmberForm: Object.freeze({ x:.24,y:-.46,z:.84,px:0,pz:1.48 }),
});
export const PLAYER_HELD_PROFILES = Object.freeze(['melee','fist','emitter','hammer','sweep','mirage','orrery-tap','orrery-release']);
const CANONICAL_TOOL_FORM_PROFILE = Object.freeze({
  'rift-bombard': 'emitter',
  blunderbuss: 'emitter',
  'lumen-spindle': 'emitter',
  'great-sweep': 'sweep',
});
export function playerFormPresentation(game) {
  const save=game?.save||{},mech=typeof game?.mechUp==='function'?game.mechUp():save.mech?.active===true&&save.mech.mode!=='drone'&&!save.boat?.aboard;
  const fists=!!game?.fistsEquipped?.(),active=save.magicSkills?.active,ember=active?.id==='ember-form'&&active.remaining>0;
  const kind=mech?save.mech?.empowered===true?'playerPowerSuit':'playerRobot':ember?'playerEmberForm':fists?'playerIronFists':null;
  if(!kind)return null;
  const profile=CLOSE_VIEW_PLAYER_FORM_PROFILES[kind];
  // The authored Ember body is already taller. Preserve the source's rank-dependent final growth once.
  const scale=kind==='playerEmberForm'?(1.25+.05*Math.max(1,Math.min(3,Number(active.rank)||1)))*1.68/profile.head:kind==='playerRobot'?1.12:1;
  return {...profile,kind,scale,head:profile.head*.82*scale,lift:mech&&game.mechBoosting===true?.22:0,mech,fists,empowered:mech&&save.mech?.empowered===true};
}
export function playerFormModelKey(form,held='melee') {
  const profile=['salvage-blade','cinder-pike','verge-cleaver','quandrix-staff','fourfold-daggers'].includes(held)?'melee':CANONICAL_TOOL_FORM_PROFILE[held]||held;
  return form&&PLAYER_HELD_PROFILES.includes(profile)?`${form.kind}:${profile}`:form?.kind||null;
}

// Read-only ordinary-air handoff. Lift is supplied by the existing capture producer;
// this descriptor neither lifts the body nor changes traversal/support clocks.
export function ordinaryJumpPresentation(game, now, lift, baseMs) {
  const g=game,p=g?.player,clock=g?.paused&&Number.isFinite(g.pauseStarted)?g.pauseStarted:now;
  if(!p||!(p.hp>0)||!Number.isFinite(clock)||!Number.isFinite(g.jumpUntil)||!(g.jumpUntil>clock)||!Number.isFinite(lift)||lift<0||!Number.isFinite(baseMs)||baseMs<=0)return null;
  if(g.droneLift||g.mechBoosting||g.glide||g.swimming||g.save?.boat?.aboard||g.mountRide?.()||g.mechUp?.()||g.droneUp?.())return null;
  const form=playerFormPresentation(g);if(form&&form.kind!=='playerIronFists')return null;
  if(clock<(p.stunnedUntil||0)||clock<(p.dodgeUntil||0))return null;
  const durationMs=Number.isFinite(g.jumpDur)&&g.jumpDur>0?g.jumpDur:baseMs;
  if(g.jumpStart!=null&&(!Number.isFinite(g.jumpStart)||g.jumpStart>clock))return null;
  const start=Number.isFinite(g.jumpStart)?g.jumpStart:g.jumpUntil-durationMs;
  const elapsedMs=clock-start,remainingMs=g.jumpUntil-clock;
  if(elapsedMs<0||remainingMs>durationMs+1e-6)return null;
  return {v:1,elapsedMs,remainingMs,durationMs,lift,rise:Math.min(1,elapsedMs/(baseMs*.5)),fall:Math.max(0,1-remainingMs/(baseMs*.5))};
}

// Read-only falling pose (game.ts FALL, Tim 2026-11-12: falls with real airtime): a fall from FALL.pose levels or more, on foot and
// out of a jump, is drawn with the ordinary air pose held at its hang (arms out, knees softly tucked), the legs reaching down over the
// last FALL_REACH_MS before the ground under them; the ends connect to the ground pose. The clocks are the fall's own (game.fall.t,
// stepped only by the game, so a pause holds them). Null otherwise.
export const FALL_REACH_MS = 350;
export function ordinaryFallPresentation(game, now, lift) {
  const g=game,p=g?.player,f=g?.fall,clock=g?.paused&&Number.isFinite(g.pauseStarted)?g.pauseStarted:now;
  if(!p||!f||!(p.hp>0)||!Number.isFinite(clock)||clock<(g.jumpUntil||0)||!g.fallPoseDue?.())return null;
  if(g.droneLift||g.mechBoosting||g.glide||g.swimming||g.save?.boat?.aboard||g.mountRide?.()||g.mechUp?.())return null;
  const form=playerFormPresentation(g);if(form&&form.kind!=='playerIronFists')return null;
  if(clock<(p.stunnedUntil||0)||clock<(p.dodgeUntil||0))return null;
  const elapsedMs=Math.max(0,(Number(f.t)||0)*1000),remainingMs=Math.max(0,Number(g.fallRemainingMs?.())||0),durationMs=Math.max(1,elapsedMs+remainingMs);
  return {v:1,elapsedMs,remainingMs,durationMs,lift:Math.max(0,Number(lift)||0),rise:1,fall:unit(.3+.7*(1-remainingMs/FALL_REACH_MS)),falling:true};
}

// Read-only touchdown handoff: the short absorb after an ordinary jump, read from the jump's own
// finished clock (jumpUntil). No new timer or state; null outside the window or in any other mode.
export const ORDINARY_LANDING_MS = 220;
export function ordinaryLandingPresentation(game, now) {
  const g=game,p=g?.player,clock=g?.paused&&Number.isFinite(g.pauseStarted)?g.pauseStarted:now;
  const fell=g?.fallLanded&&Number.isFinite(g.fallLanded.at)&&g.fallLanded.drop>=1?clock-g.fallLanded.at:NaN; // FALL: a landing from a fall absorbs too
  const jumped=p&&Number.isFinite(g.jumpUntil)&&Number.isFinite(g.jumpStart)&&g.jumpStart<g.jumpUntil?clock-g.jumpUntil:NaN;
  if(!p||!(p.hp>0)||!Number.isFinite(clock)||!Number.isFinite(jumped)&&!Number.isFinite(fell))return null;
  const age=Number.isFinite(fell)&&fell>=0&&!(jumped>=0&&jumped<fell)?fell:jumped;if(!(age>=0&&age<ORDINARY_LANDING_MS))return null;
  if(g.droneLift||g.mechBoosting||g.glide||g.swimming||g.save?.boat?.aboard||g.mountRide?.()||g.mechUp?.()||g.droneUp?.())return null;
  const form=playerFormPresentation(g);if(form&&form.kind!=='playerIronFists')return null;
  if(clock<(p.stunnedUntil||0)||clock<(p.dodgeUntil||0))return null;
  return age/ORDINARY_LANDING_MS;
}

// Read-only defeat handoff for the ordinary on-foot body. The short ordinary
// death beat supplies the authored motion clock; a longer fallen window keeps
// its endpoint instead of stretching or replaying the fall.
export function ordinaryDefeatPresentation(game, now) {
  const player = game?.player, fallen = game?.fallen;
  const clock = game?.paused && Number.isFinite(game.pauseStarted) ? game.pauseStarted : now;
  if (!fallen || player?.hp !== 0 || !Number.isFinite(clock) ||
      !Number.isFinite(player.stunnedAt) || !Number.isFinite(fallen.until)) return null;
  if (game.save?.boat?.aboard || game.mountRide?.()) return null;
  const form = playerFormPresentation(game);
  if (form && form.kind !== 'playerIronFists') return null;
  const windowMs = fallen.until - player.stunnedAt;
  const beatMs = game.deathBeat * 1000;
  const durationMs = Number.isFinite(beatMs) && beatMs > 0 ? Math.min(windowMs, beatMs) : windowMs;
  if (!(durationMs > 0)) return null;
  return { amount: unit((clock - player.stunnedAt) / durationMs), durationMs };
}
