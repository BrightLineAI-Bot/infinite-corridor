// The Great Sweep's 360° swing (Tim, 2026-11-14: "when the tool is used, he swings it about 360° around himself, a big
// sweeping slash"; "the damage follows the blade around the full circle"). It reuses the weighted swing pieces of
// melee-swing.ts (the exact swept annular-sector test, the smooth easing, hit-stop once per swing, a hit-once list) but is its
// own record (game.toolSwing), because the Great Sweep is a tool: it keeps the tool's cooldown, power and glyphs.
//
// One record and one sampler drive the hit, Standard View's arc and Close View's spin, so the timing is the same in every area
// and in both views. Without the Mirage of Blades passive the blade deals the damage: during the active window each tick hits
// only the annular sector the blade crossed since the last tick (hilt to tip, around the Wayfarer), plus a small body bubble,
// once per foe per swing. With Mirage of Blades the same swing is drawn, faster (it fits the blades' own cooldown), and deals
// nothing: the thrown blades (game.ts mirageThrow, tool-forms.ts MIRAGE) keep their damage, count, timing and range.
//
// Timings (ms at tempo 1; the tool's cooldown modifiers scale every phase but hit-stop, as they scale the cooldown):
//   windupMs 240 (the last holdMs 60 held at full cock): the blade drawn back behind the sweep shoulder, the body turned
//     against the turn. Slightly longer than the Verge Cleaver's 230 ms forehand: a heavier weapon, but the press still moves
//     the pose at once.
//   activeMs 360: one full revolution, eased in and out (smoothstep: peak 1.5 turns/s mid-spin, about 1,500°/s). A third of a
//     second reads as one heavy spin rather than a flicker (Elden Ring's Carian spin is about half a second), and keeps a foe
//     at the far side from being hit long after the press.
//   hitStopMs 70: once, on the first hit (between the Cleaver's 60 and its finisher's 110).
//   followEndMs 760, recoveryMs 930: the blade carried on past the start and settled back to the carry.
//   930 + 70 = 1,000 ms = BRAWLER['great-sweep'].cooldown: the next press is ready just as the swing settles, so damage per
//   second is one sweep's damage per cooldown, as before (tests/great-sweep-orrery.test.ts measures it with the real code).
// Angles are degrees relative to the aim, positive clockwise on screen (from +x toward +y, y down), as melee-swing.ts. The
// Wayfarer holds the sweep in the right hand (CLOSE_VIEW_HELD_GEAR), so the forehand starts on the aim's right (+90) and turns
// counter-clockwise (`turn` -360); the next press within its visual alternates (direction -1: mirrored, from -90, +360).
import { circleTouchesSector } from './melee-swing.js?v=r1008-d97cfaa2129f';

export const GREAT_SWEEP_SWING = Object.freeze({
  hilt: .3, // the blade's inner radius (tiles); the tip is BRAWLER['great-sweep'].radius (with Spellblade and Charged Air)
  bubble: .48, // a foe this close to the body centre is hit during the active window wherever the blade is
  foePad: .1, // added to a foe's extra body size (enemyBodyRadius - .38) as its contact circle
  windupMs: 240, holdMs: 60, activeMs: 360, hitStopMs: 70, followEndMs: 760, recoveryMs: 930,
  from: 90, turn: -360, cock: 25, overshoot: 30, // presentation only: drawn back past `from`, carried past the end
  chunk: 90, // the swept test splits a tick's arc into pieces of at most this many degrees (circleTouchesSector takes a half turn)
  maxHits: 64, // the hit-once list's bound
  mirage: Object.freeze({ fit: 1 }), // with Mirage of Blades: the cosmetic swing's recovery fits this share of the blades' cooldown
  tempo: Object.freeze({ min: .5, max: 1.6 }),
});
export const GREAT_SWEEP_RECORD_VERSION = 1;
const S = GREAT_SWEEP_SWING, DEG = Math.PI / 180;
const smooth = (u) => { const x = Math.max(0, Math.min(1, u)); return x * x * (3 - 2 * x); };
export const sweepTempo = (t) => { const n = Number(t); return Number.isFinite(n) ? Math.max(S.tempo.min, Math.min(S.tempo.max, n)) : 1; };
// The scaled phase ends (ms) at a tempo; writes `out`.
export function sweepTimes(tempo = 1, out = {}) {
  const k = sweepTempo(tempo);
  out.holdAt = (S.windupMs - S.holdMs) * k; out.windEnd = S.windupMs * k; out.activeEnd = (S.windupMs + S.activeMs) * k;
  out.followEnd = S.followEndMs * k; out.recovery = S.recoveryMs * k;
  return out;
}
// The revolution's progress (0..1) at a swing time: 0 through the wind-up, eased through the active window, 1 after.
export function sweepProgress(elapsedMs, T) { return elapsedMs <= T.windEnd ? 0 : elapsedMs >= T.activeEnd ? 1 : smooth((elapsedMs - T.windEnd) / Math.max(1, T.activeEnd - T.windEnd)); }
// The damage angle (degrees from the aim) at a swing time, direction applied.
export function sweepDamageAngle(elapsedMs, T, direction = 1) { return (direction === -1 ? -1 : 1) * (S.from + S.turn * sweepProgress(elapsedMs, T)); }
// The drawn blade at a swing time. Writes `out`, no allocation: angle (degrees from the aim, cock and overshoot included),
// phase (windup, hold, active, follow, recover, done), weight (carry 0 .. swing 1), progress (0..1 of the turn).
export function sampleSweep(elapsedMs, tempo = 1, direction = 1, out = {}, T = sweepTimes(tempo, out.times || (out.times = {}))) {
  const e = Math.max(0, Number(elapsedMs) || 0), m = direction === -1 ? -1 : 1, end = S.from + S.turn, cocked = S.from - Math.sign(S.turn) * S.cock, over = end + Math.sign(S.turn) * S.overshoot;
  let angle, phase, weight;
  if (e < T.holdAt) { weight = smooth(e / Math.max(1, T.holdAt)); angle = S.from + (cocked - S.from) * weight; phase = 'windup'; }
  else if (e < T.windEnd) { weight = 1; angle = cocked; phase = 'hold'; }
  else if (e < T.activeEnd) { const u = sweepProgress(e, T); weight = 1; angle = cocked + (end - cocked) * u; phase = 'active'; }
  else if (e < T.followEnd) { const u = (e - T.activeEnd) / Math.max(1, T.followEnd - T.activeEnd), f = u < .4 ? Math.sin(Math.PI / 2 * u / .4) : 1 - .6 * smooth((u - .4) / .6); weight = 1; angle = end + (over - end) * f; phase = 'follow'; }
  else if (e < T.recovery) { weight = 1 - smooth((e - T.followEnd) / Math.max(1, T.recovery - T.followEnd)); angle = end + (over - end) * .4; phase = 'recover'; }
  else { weight = 0; angle = end + (over - end) * .4; phase = 'done'; }
  out.angle = m * angle; out.phase = phase; out.weight = weight; out.progress = sweepProgress(e, T); out.elapsedMs = e;
  return out;
}
// Does the blade, sweeping from angle a0 to a1 (world radians, any span) around (cx, cy), touch the circle (px, py, r)
// between radii rIn and rOut? Split into pieces of at most `chunk` degrees for the exact sector test. No allocation.
export function sweptArcTouches(px, py, r, cx, cy, rIn, rOut, a0, a1) {
  const span = a1 - a0, n = Math.max(1, Math.ceil(Math.abs(span) / (S.chunk * DEG)));
  for (let i = 0; i < n; i++) if (circleTouchesSector(px, py, r, cx, cy, rIn, rOut, a0 + span * i / n, a0 + span * (i + 1) / n)) return true;
  return false;
}
// The Close View pose for a live swing (close-view-hero.ts greatSweepPose): the same fields as close-view-player-presentation.ts
// sampleGreatSweep (weight, angle, spin, sweep, swing, phase; radians), on this swing's clock, so the drawn spin is the
// revolution the hit follows. `C` is CLOSE_VIEW_GREAT_SWEEP (passed in, so this module stays free of presentation imports).
export function sampleSweepPose(C, elapsedMs, durationMs, out = {}) {
  const tempo = sweepTempo((Number(durationMs) > 0 ? Number(durationMs) : S.recoveryMs) / S.recoveryMs), T = sweepTimes(tempo, out.times || (out.times = {})), e = Math.max(0, Math.min(T.recovery, Number(elapsedMs) || 0)), rad = DEG;
  const cut = smooth;
  let weight, angle, spin, swing, phase;
  if (e < T.windEnd) { const u = cut(e / Math.max(1, T.holdAt)); weight = u; angle = C.from; spin = C.spin.windup * u; swing = 0; phase = 'windup'; }
  else if (e < T.activeEnd) { const u = sweepProgress(e, T); weight = 1; angle = C.from + (C.out - C.from) * Math.min(1, u * 3); spin = C.spin.windup + (C.spin.turn - C.spin.windup) * u; swing = u; phase = 'swing'; }
  else if (e < T.followEnd) { weight = 1; angle = C.out + (C.to - C.out) * cut((e - T.activeEnd) / Math.max(1, T.followEnd - T.activeEnd)); spin = C.spin.turn; swing = 1; phase = 'follow-through'; }
  else if (e < T.recovery) { weight = 1 - cut((e - T.followEnd) / Math.max(1, T.recovery - T.followEnd)); angle = C.to; spin = C.spin.turn; swing = 1; phase = 'recovery'; }
  else { weight = 0; angle = C.to; spin = 0; swing = 1; phase = 'carry'; }
  out.weight = weight; out.angle = angle * rad; out.spin = spin * rad; out.sweep = (spin + angle) * rad; out.swing = swing; out.phase = phase;
  out.startupMs = T.windEnd; out.swingEndMs = T.activeEnd; out.followEndMs = T.followEnd; out.durationMs = T.recovery;
  return out;
}
// Save normaliser (game.ts savedToolSwing / restoreToolSwing). Unknown fields are kept; an invalid record is dropped.
const obj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const inRange = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
export function normalizeToolSwing(raw) {
  if (!obj(raw) || raw.v !== GREAT_SWEEP_RECORD_VERSION) return null;
  const aim = raw.aim, mag = Math.hypot(Number(aim?.x), Number(aim?.y)), p = raw.payload;
  if (typeof raw.id !== 'string' || !raw.id || raw.id.length > 160 || !['area', 'areaId', 'levelId'].every((k) => typeof raw[k] === 'string' && raw[k].length <= 512) ||
    !obj(aim) || !(Math.abs(mag - 1) <= 1e-5) || (raw.direction !== 1 && raw.direction !== -1) || typeof raw.mirage !== 'boolean' ||
    !inRange(raw.tempo, S.tempo.min, S.tempo.max) || !inRange(raw.elapsedMs, 0, 10000) || !inRange(raw.stopLeft ?? 0, 0, 1000) || !inRange(raw.busy ?? 0, 0, 15) ||
    !Array.isArray(raw.hits) || raw.hits.length > S.maxHits || !raw.hits.every((h) => typeof h === 'string' && h.length <= 160) || !obj(p) ||
    !inRange(p.damage, 0, 1e9) || !inRange(p.radius, 0, 20) || !inRange(Number(p.imbue) || 0, 0, 1e9) || !inRange(Number(p.healShare) || 0, 0, 4) ||
    !Array.isArray(p.echoCopies) || p.echoCopies.length > 8 || !p.echoCopies.every((c) => obj(c) && inRange(c.delayMs, 0, 10000) && inRange(c.share, 0, 4))) return null;
  const out = structuredClone(raw); delete out.lastNow;
  out.stopLeft = Number(raw.stopLeft) || 0; out.aim = { x: aim.x / mag, y: aim.y / mag }; out.stopUsed = raw.stopUsed === true; out.contacted = raw.contacted === true; out.freeze = raw.freeze === true; // the awakened sweep's freeze (SWEEP_FREEZE), fixed when the swing began
  return out;
}
// The swing a renderer draws now (Standard View; the Close View floor): the blade's world angle, radii, the trail's start
// and phase, at the last tick's clock. Null when none is up. Reuses `out`.
export function sweepIndicator(game, out = {}) {
  const q = game?.toolSwing; if (q?.v !== GREAT_SWEEP_RECORD_VERSION) return null;
  const T = sweepTimes(q.tempo, out.times || (out.times = {})), s = sampleSweep(q.elapsedMs, q.tempo, q.direction, out.sample || (out.sample = {}), T), aim = Math.atan2(q.aim.y, q.aim.x);
  out.x = game.player.x + .5; out.y = game.player.y + .45; out.angle = aim + s.angle * DEG; out.start = aim + sweepDamageAngle(0, T, q.direction) * DEG;
  out.trail = s.phase === 'active' || s.phase === 'follow' ? aim + sweepDamageAngle(q.elapsedMs, T, q.direction) * DEG : null;
  out.phase = s.phase; out.weight = s.weight; out.tip = q.payload.radius; out.hilt = S.hilt; out.mirage = q.mirage; out.direction = q.direction;
  out.windup = Math.max(0, Math.min(1, q.elapsedMs / Math.max(1, T.windEnd))); out.fade = s.phase === 'follow' ? Math.max(0, 1 - (q.elapsedMs - T.activeEnd) / Math.max(1, T.followEnd - T.activeEnd)) : 1;
  return out;
}
// Standard View: the wind-up as a faint ring with the blade drawn back, then a bright trail from where the turn began round to
// the blade, and the blade itself hilt to tip. A Mirage swing (no damage) is drawn fainter. A handful of strokes.
export function drawSweepSwing(ctx, q, cx, cy, s) {
  const R = q.tip * s, H = q.hilt * s, dim = q.mirage ? .45 : 1;
  if (q.phase === 'windup' || q.phase === 'hold') {
    ctx.globalAlpha = (.12 + .2 * q.windup) * dim; ctx.strokeStyle = '#ffe0a0'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  } else if (q.trail != null && q.fade > 0) {
    const a0 = Math.min(q.start, q.trail), a1 = Math.max(q.start, q.trail);
    if (a1 > a0) {
      ctx.globalAlpha = .34 * q.fade * dim; ctx.strokeStyle = 'rgba(159,196,224,1)'; ctx.lineWidth = Math.max(6, (R - H) * .45);
      ctx.beginPath(); ctx.arc(cx, cy, (R + H) / 2, a0, a1); ctx.stroke();
      ctx.globalAlpha = .9 * q.fade * dim; ctx.strokeStyle = '#dfe8f0'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, R * .94, a0, a1); ctx.stroke(); ctx.lineCap = 'butt';
    }
  }
  if (q.weight > .05 && q.phase !== 'recover') {
    ctx.globalAlpha = Math.min(1, q.weight) * dim; ctx.strokeStyle = '#eef2f4'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(q.angle) * H, cy + Math.sin(q.angle) * H); ctx.lineTo(cx + Math.cos(q.angle) * R, cy + Math.sin(q.angle) * R); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the awakened Great Sweep: a freezing blade
// Tim, 2026-11-14: "Great Sweep applies a freeze to enemies that it touches... the actual blade when you spin it, and, if you
// have Mirage of Blades, the Mirage blades too... It should work on bosses... It may have diminishing returns and take a lot
// to freeze them, similar to stagger". The game had no freeze before (its statuses were the glyph slow, hit-stun under the
// stagger governor and the boss poise break), so this is the freeze, and only the awakened Great Sweep applies it.
// Every foe has a freeze meter (e.sweepFreeze, saved with the foe, every clock in seconds counted down by dt, so a reload
// resumes it exactly). Each touch adds `touch` (the swung blade, or a Mirage blade's cut, out or back). A full meter freezes
// the foe in place for `hold` s (it neither moves nor attacks; blows still land), then `guard` s in which touches add nothing
// (it cannot be held frozen). Each freeze raises its tier (diminishing returns): the next needs more and lasts less (`need`
// and `hold` by tier; from the third freeze on the last entry, where the tier stops); every `calm` s without a freeze drops a tier again. Touches stop counting `forget`
// s after the last one and the meter then drains `drain` per second. A partly filled meter slows the foe (glyph slow, at most
// `slow` off its speed at a full meter). Classes follow the stagger governor (monster-pack.ts staggerClass): ordinary foes
// freeze at a touch; elites take a few; bosses, guardians, world beasts and Gate Revenants take many.
// Worst-case lock at the boss row: a 1.6 s freeze, then 8 s guarded, so at most about a sixth of the time, less each tier.
export const SWEEP_FREEZE = Object.freeze({
  touch: Object.freeze({ blade: 1, mirage: .5 }), // the Mirage blades cut far more often (out and back, every .55 s); one cut still freezes an ordinary foe (need .5)
  classes: Object.freeze({
    ordinary: Object.freeze({ need: Object.freeze([.5, .5, 1]), hold: Object.freeze([1.6, 1.3, 1]), guard: 1.2, forget: 2, drain: 1, calm: 6 }),
    elite: Object.freeze({ need: Object.freeze([3, 4.5, 6]), hold: Object.freeze([1.6, 1.3, 1]), guard: 4, forget: 3, drain: .75, calm: 10 }),
    boss: Object.freeze({ need: Object.freeze([6, 9, 13]), hold: Object.freeze([1.6, 1.2, .9]), guard: 8, forget: 4, drain: .6, calm: 15 }),
  }),
  slow: .45, // speed × (1 - slow × fill) while the meter fills
  slowMs: 120, // the glyph slow is renewed for this long each frame (it lapses on its own once the meter is empty)
  maxTier: 8,
});
const FZ = SWEEP_FREEZE;
const num = (v, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo; };
export const freezeRow = (cls) => FZ.classes[cls] || FZ.classes.ordinary;
const pick = (list, tier) => list[Math.min(list.length - 1, tier)];
// The highest tier: the table's last entry (Tim, 2026-11-14: "after bosses get frozen a third time, they just keep the same
// high-level freeze resistance"), so from the third freeze on every freeze needs and holds that row's last entry, and a calm
// spell eases it back one tier as from any other.
const topTier = (R) => Math.min(FZ.maxTier, R.need.length - 1, R.hold.length - 1);
// The meter (created on the first touch; never allocated again for that foe while it lasts). Clamps a stored record.
function meter(e) {
  const q = e.sweepFreeze;
  if (!q || typeof q !== 'object') return (e.sweepFreeze = { build: 0, left: 0, hold: 0, guard: 0, tier: 0, idle: 0, calm: 0, fill: 0 });
  q.build = num(q.build, 0, 100); q.left = num(q.left, 0, 30); q.hold = num(q.hold, 0, 30); q.guard = num(q.guard, 0, 60); q.tier = Math.round(num(q.tier, 0, FZ.maxTier)); q.idle = num(q.idle, 0, 1e6); q.calm = num(q.calm, 0, 1e6); q.fill = num(q.fill, 0, 1);
  return q;
}
export const sweepFrozen = (e) => Number(e?.sweepFreeze?.left) > 0;
// One touch. Returns true when it freezes the foe now. A frozen or guarded foe gains nothing.
export function sweepFreezeTouch(e, cls, amount = FZ.touch.blade) {
  if (!e || e.dead) return false;
  const q = meter(e), R = freezeRow(cls); if (q.left > 0 || q.guard > 0) return false;
  q.build += Math.max(0, Number(amount) || 0); q.idle = 0;
  const need = pick(R.need, q.tier);
  if (q.build + 1e-9 < need) { q.fill = Math.min(1, q.build / need); return false; }
  q.left = q.hold = pick(R.hold, q.tier); q.build = 0; q.fill = 0; q.tier = Math.min(topTier(R), q.tier + 1); q.calm = 0;
  return true;
}
// One frame (dt seconds). Returns the speed factor while the meter fills (1 when there is no slow); drops the record once it
// has nothing left to count.
export function tickSweepFreeze(e, cls, dt) {
  if (!e?.sweepFreeze) return 1;
  const q = meter(e), R = freezeRow(cls), d = Math.max(0, Number(dt) || 0);
  if (q.tier > topTier(R)) q.tier = topTier(R); // a record kept from before the cap
  if (q.left > 0) { q.left = Math.max(0, q.left - d); if (q.left <= 0) { q.left = 0; q.guard = R.guard; } return 1; }
  if (q.guard > 0) q.guard = Math.max(0, q.guard - d);
  q.idle += d; if (q.idle >= R.forget && q.build > 0) q.build = Math.max(0, q.build - R.drain * d);
  if (q.tier > 0) { q.calm += d; if (q.calm >= R.calm) { q.tier--; q.calm = 0; } }
  q.fill = q.build > 0 ? Math.min(1, q.build / pick(R.need, q.tier)) : 0;
  if (q.build <= 0 && q.guard <= 0 && q.tier <= 0) { delete e.sweepFreeze; return 1; }
  return q.fill > 0 ? 1 - FZ.slow * q.fill : 1;
}
