// Weighted primary swings (Tim, 2026-11-14: "the Verge Cleaver's swings have no weight... step forward, wind up, strike,
// follow through"). The press is acted on in the frame it arrives and the wind-up pose starts moving at once: the weight is
// in the anticipation, the arc and the follow-through, never in dead frames. A dodge, spell or tool cancels the swing the
// moment it is accepted, in any phase. One data table per weapon (PRIMARY_SWINGS) and one sampler drive the hit, the root motion and both
// views' drawing, so the timing is the same in every area and in Close View and Standard View; only the drawing differs.
//
// A swing is a record on game.pendingMeleeContact at version 3 (version 1 is the older single-contact Cleaver/Iron Fists
// record; it still loads and releases as before). game.ts tickMeleeSwing advances it each tick by the gameplay clock, frozen
// during hit-stop. During the step's active window each tick tests only the annular sector the blade crossed since the last
// tick (hilt to tip, previous angle to current), plus a small body bubble, with one hit-once list per swing.
//
// Angles are in degrees relative to the aim, positive turning clockwise on screen (from +x toward +y, y down). The Wayfarer
// carries the Cleaver in the left hand, so the sword side is the aim's left (negative angles): the forehand starts there.
// Times are ms from the accepted press at tempo 1; the attack-speed modifiers (melee glyph cooldown, armor attack speed)
// scale every phase but hit-stop, exactly as they used to scale the 420 ms press cooldown.
//
// Step fields: windupMs (the strike starts here; the last holdMs of it held at full cock), activeMs (the strike: hits only in
// [windupMs, windupMs+activeMs)), hitStopMs (once per swing, on its first hit), followEndMs (end of the drawn follow-through),
// chainMs (the next step may start; null for the finisher), recoveryMs (the swing ends),
// lunge (tiles of root motion), from/to (the damage arc), cock/overshoot (presentation only: the blade drawn back past
// `from` in the wind-up, carried past `to` in the follow-through), share (each hit's damage as a share of a plain hit; raised
// so the three-step chain, with its hit-stops, keeps the Cleaver's damage per second of the old 420 ms press, primaryAttack).
//
// The finisher is an overhead diagonal chop: in Close View the blade comes down from over the head; from above it reads as
// a narrower 150° cut across the front (from the sword side), so it does not catch foes at the flanks an overhead blade never
// reaches, while still taking a pack gathered in front.
export const PRIMARY_SWINGS = Object.freeze({
  'verge-cleaver': Object.freeze({
    hilt: .3, // the blade's inner radius (tiles): the hilt end of the swept annulus; the tip is the profile range with reach
    bubble: .48, // a foe this close to the body centre is hit during any active window, front or back
    foePad: .1, // added to a foe's extra body size (enemyBodyRadius - .38) as its contact circle
    bufferMs: 150, // a press this long before the chain point (or the end of recovery) is kept and starts the next step
    lungeFrom: .4, // root motion starts at this fraction of the wind-up and eases out by the end of the strike
    lungeStop: .8, // stop the lunge when a foe's centre is this close in front (tiles, plus its extra body size), or any foe is inside the bubble
    lungeCone: .5, // "in front": the cosine of the half-angle (60°)
    knockback: .2, // a body-bubble hit pushes the foe this far off the Wayfarer, along the facing when right on top (never a boss, an elite or an anchored foe)
    // Once-a-swing extras fire at the swing's contact, not the press. The Echo glyph's repeat and the Shadow Clone's swing
    // scale by this, the mean of the steps' shares, so their damage per second holds at the slower cadence; the awakened move
    // (every third swing) keeps its own weight.
    extraShare: 1.6,
    steps: Object.freeze([
      Object.freeze({ name: 'forehand', windupMs: 230, holdMs: 50, activeMs: 90, hitStopMs: 60, followEndMs: 440, chainMs: 440, recoveryMs: 640, lunge: .35, from: -90, to: 90, cock: -30, overshoot: 22, share: 1.35 }),
      Object.freeze({ name: 'backhand', windupMs: 170, holdMs: 0, activeMs: 90, hitStopMs: 60, followEndMs: 380, chainMs: 400, recoveryMs: 600, lunge: .25, from: 90, to: -90, cock: 25, overshoot: -20, share: 1.35 }),
      Object.freeze({ name: 'finisher', windupMs: 380, holdMs: 80, activeMs: 90, hitStopMs: 110, followEndMs: 650, chainMs: null, recoveryMs: 950, lunge: .6, from: -75, to: 75, cock: -40, overshoot: 30, share: 2.1 }),
    ]),
  }),
});
export const SWING_TEMPO = Object.freeze({ min: .5, max: 1.6 });
export const SWING_RECORD_VERSION = 3;
const DEG = Math.PI / 180;
export function swingSpec(kind) { return Object.hasOwn(PRIMARY_SWINGS, kind) ? PRIMARY_SWINGS[kind] : null; }
export function swingStep(spec, step) { const s = spec?.steps; return s ? s[Math.max(1, Math.min(s.length, Math.trunc(Number(step)) || 1)) - 1] : null; }
export const clampTempo = (t) => { const n = Number(t); return Number.isFinite(n) ? Math.max(SWING_TEMPO.min, Math.min(SWING_TEMPO.max, n)) : 1; };
const SETTLE = .4; // the follow-through settles back to 40% of its overshoot
const smooth = (u) => { const x = Math.max(0, Math.min(1, u)); return x * x * (3 - 2 * x); };
const easeOut = (u) => { const x = Math.max(0, Math.min(1, u)); return 1 - (1 - x) * (1 - x); };
// The scaled times of a step: every phase but hit-stop scales with tempo.
export function swingTimes(st, tempo = 1, out = {}, lungeFrom = PRIMARY_SWINGS['verge-cleaver'].lungeFrom) {
  const k = clampTempo(tempo);
  out.windEnd = st.windupMs * k; out.holdAt = (st.windupMs - st.holdMs) * k; out.activeEnd = (st.windupMs + st.activeMs) * k;
  out.followEnd = st.followEndMs * k; out.chain = st.chainMs == null ? null : st.chainMs * k; out.recovery = st.recoveryMs * k;
  out.lungeStart = st.windupMs * k * lungeFrom;
  return out;
}
// The blade at a swing time: its angle (degrees from the aim; the drawn angle, wind-up cock and overshoot included), the
// phase, the presentation weight (guard 0 .. swing 1), and the lunge fraction. Writes into `out`, no allocation.
export function sampleSwing(st, elapsedMs, tempo = 1, out = {}, T = swingTimes(st, tempo, out.times || (out.times = {}))) {
  const e = Math.max(0, Number(elapsedMs) || 0), cocked = st.from + st.cock, over = st.to + st.overshoot;
  let angle, phase, weight;
  if (e < T.holdAt) { const u = smooth(e / Math.max(1, T.holdAt)); angle = cocked; weight = u; phase = 'windup'; }
  else if (e < T.windEnd) { angle = cocked; weight = 1; phase = 'hold'; }
  else if (e < T.activeEnd) { angle = strikeAngle(st, (e - T.windEnd) / Math.max(1, T.activeEnd - T.windEnd)); weight = 1; phase = 'active'; }
  else if (e < T.followEnd) { const u = (e - T.activeEnd) / Math.max(1, T.followEnd - T.activeEnd), f = u < .4 ? Math.sin(Math.PI / 2 * u / .4) : 1 - (1 - SETTLE) * smooth((u - .4) / .6); angle = st.to + (over - st.to) * f; weight = 1; phase = 'follow'; }
  else if (e < T.recovery) { const u = (e - T.followEnd) / Math.max(1, T.recovery - T.followEnd); angle = st.to + (over - st.to) * SETTLE; weight = 1 - smooth(u); phase = 'recover'; }
  else { angle = st.to + (over - st.to) * SETTLE; weight = 0; phase = 'done'; }
  out.angle = angle; out.phase = phase; out.weight = weight;
  out.lunge = e <= T.lungeStart ? 0 : easeOut((e - T.lungeStart) / Math.max(1, T.activeEnd - T.lungeStart));
  out.sweep = (angle - cocked) / ((over - cocked) || 1); // 0 at full cock .. 1 at the overshoot
  return out;
}
// The strike: from full cock through the damage arc to `to` in the active window; fast out of the hold (a whip, not a wipe).
export function strikeAngle(st, u) {
  const cocked = st.from + st.cock, x = Math.max(0, Math.min(1, u)), k = x < .5 ? 2 * x * x * 1.3 : 1 - Math.pow(1 - x, 2) * 2 * .7;
  return cocked + (st.to - cocked) * Math.max(0, Math.min(1, k));
}
// The damage arc's angle at a swing time (only meaningful in the active window): the drawn angle limited to [from, to].
export function damageAngle(st, elapsedMs, T) {
  const u = (elapsedMs - T.windEnd) / Math.max(1, T.activeEnd - T.windEnd), a = strikeAngle(st, u), lo = Math.min(st.from, st.to), hi = Math.max(st.from, st.to);
  return Math.max(lo, Math.min(hi, a));
}
const wrap = (a) => { let x = a % (2 * Math.PI); if (x > Math.PI) x -= 2 * Math.PI; else if (x <= -Math.PI) x += 2 * Math.PI; return x; };
// Exact: does a circle (px, py, r) touch the annular sector around (cx, cy) between radii rIn..rOut and world angles a0..a1
// (radians, the shorter way from a0 to a1, at most a half turn either side)? The distance from the centre to the region is
// the radial gap when the circle's bearing is inside the sector, otherwise the distance to the nearer boundary segment.
export function circleTouchesSector(px, py, r, cx, cy, rIn, rOut, a0, a1) {
  const dx = px - cx, dy = py - cy, rho = Math.hypot(dx, dy), span = wrap(a1 - a0), mid = a0 + span / 2, half = Math.abs(span) / 2;
  if (rho > rOut + r) return false;
  const rel = rho > 1e-9 ? Math.abs(wrap(Math.atan2(dy, dx) - mid)) : 0;
  if (rel <= half) return Math.max(0, rIn - rho, rho - rOut) <= r;
  return segmentDistance(dx, dy, a0, rIn, rOut) <= r || segmentDistance(dx, dy, a0 + span, rIn, rOut) <= r;
}
function segmentDistance(dx, dy, a, rIn, rOut) {
  const ux = Math.cos(a), uy = Math.sin(a), t = Math.max(rIn, Math.min(rOut, dx * ux + dy * uy));
  return Math.hypot(dx - ux * t, dy - uy * t);
}
// Save normaliser for the version-3 record (game.ts savedPendingMeleeContact / restorePendingMeleeContact). Unknown
// fields are kept; an invalid record is dropped (the swing is cancelled cleanly rather than resumed wrong).
const finiteObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const inRange = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
export function normalizePendingSwing(raw) {
  if (!finiteObject(raw) || raw.v !== SWING_RECORD_VERSION) return null;
  const spec = swingSpec(raw.weapon), st = spec && swingStep(spec, raw.step), aim = raw.aim, mag = Math.hypot(Number(aim?.x), Number(aim?.y));
  if (!st || !Number.isInteger(raw.step) || raw.step < 1 || raw.step > spec.steps.length || typeof raw.id !== 'string' || !raw.id || raw.id.length > 160 ||
    !['area', 'areaId', 'levelId'].every((k) => typeof raw[k] === 'string' && raw[k].length <= 512) || !finiteObject(aim) || !(Math.abs(mag - 1) <= 1e-5) ||
    !inRange(raw.tempo, SWING_TEMPO.min, SWING_TEMPO.max) || !inRange(raw.elapsedMs, 0, 10000) || !inRange(raw.stopLeft ?? 0, 0, 1000) || !inRange(raw.lunged ?? 0, 0, 5) ||
    !Array.isArray(raw.hits) || raw.hits.length > 64 || !raw.hits.every((h) => typeof h === 'string' && h.length <= 160) || !finiteObject(raw.payload)) return null;
  const p = raw.payload;
  if (!finiteObject(p.profile) || !['range', 'arc', 'damage'].every((k) => inRange(p.profile[k], 0, 1e6)) || !inRange(Number(p.meleeBonus) || 0, 0, 1e9)) return null;
  const out = structuredClone(raw); delete out.lastNow;
  out.stopLeft = Number(raw.stopLeft) || 0; out.lunged = Number(raw.lunged) || 0; out.aim = { x: aim.x / mag, y: aim.y / mag };
  return out;
}
// The swing a renderer should draw now: blade angle (world radians), radii, phase and weight, at the last tick's clock. Null
// when no swing is up. Reuses `out`.
export function swingIndicator(game, now, out = {}) {
  const q = game?.pendingMeleeContact; if (q?.v !== SWING_RECORD_VERSION) return null;
  const st = swingStep(PRIMARY_SWINGS[q.weapon], q.step); if (!st) return null;
  const e = q.elapsedMs, // drawn at the last tick's clock (the game ticks every frame): a pause, a hit-stop and a reload show exactly the same pose
    s = sampleSwing(st, e, q.tempo, out.sample || (out.sample = {})), T = s.times, aim = Math.atan2(q.aim.y, q.aim.x);
  out.x = game.player.x + .5; out.y = game.player.y + .45; out.aim = aim; out.angle = aim + s.angle * DEG; out.from = aim + st.from * DEG; out.to = aim + st.to * DEG;
  out.cocked = aim + (st.from + st.cock) * DEG; out.phase = s.phase; out.weight = s.weight; out.tip = Number(q.payload?.profile?.range) || 1.75;
  out.hilt = PRIMARY_SWINGS[q.weapon].hilt; out.step = q.step; out.elapsedMs = e; out.windup = Math.max(0, Math.min(1, e / Math.max(1, T.windEnd)));
  out.trail = s.phase === 'active' ? aim + damageAngle(st, e, T) * DEG : null; out.stopped = q.stopLeft > 0;
  return out;
}
// The Close View clip progress (0..1 of the swing's drawn duration) for the live swing, frozen in hit-stop; null when none.
export function swingVisualProgress(game, now) {
  const q = game?.pendingMeleeContact; if (q?.v !== SWING_RECORD_VERSION) return null;
  const st = swingStep(PRIMARY_SWINGS[q.weapon], q.step); if (!st) return null;
  return Math.max(0, Math.min(1, q.elapsedMs / (st.recoveryMs * clampTempo(q.tempo))));
}
// The weighted swing drawn from above (Standard View, renderer.ts; and on the Close View floor, main.ts): a faint wedge on the sword side while the blade winds up (brighter at
// full cock), then a bright trail from where the cut began to the blade's real angle, centred on the real aim, and the blade
// itself from hilt to tip. A handful of strokes; nothing allocated beyond the canvas path.
export function drawSwingSweep(ctx, q, sx, sy, s) {
  const cx = sx(q.x), cy = sy(q.y), R = q.tip * s, H = q.hilt * s, dir = q.to > q.from ? 1 : -1, lo = Math.min(q.from, q.to), hi = Math.max(q.from, q.to);
  if (q.phase === "windup" || q.phase === "hold") {
    ctx.globalAlpha = .14 + .22 * q.windup; ctx.fillStyle = "#e6bd78";
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, lo, hi); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = .35 + .45 * q.windup; ctx.strokeStyle = "#ffe0a0"; ctx.lineWidth = 2; ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(q.from) * H, cy + Math.sin(q.from) * H); ctx.lineTo(cx + Math.cos(q.from) * R, cy + Math.sin(q.from) * R); ctx.stroke(); ctx.setLineDash([]);
  } else if (q.phase === "active" || q.phase === "follow") {
    const end = q.phase === "active" ? q.trail : Math.max(lo, Math.min(hi, q.angle)), a0 = dir > 0 ? q.from : end, a1 = dir > 0 ? end : q.from, fade = q.phase === "active" ? 1 : Math.max(0, 1 - (q.elapsedMs - (q.sample?.times?.activeEnd || 0)) / 180);
    if (fade > 0 && a1 > a0) {
      ctx.globalAlpha = .38 * fade; ctx.strokeStyle = "rgba(215,149,72,1)"; ctx.lineWidth = Math.max(6, (R - H) * .5);
      ctx.beginPath(); ctx.arc(cx, cy, (R + H) / 2, a0, a1); ctx.stroke();
      ctx.globalAlpha = .9 * fade; ctx.strokeStyle = "#ffe0a0"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(cx, cy, R * .94, a0, a1); ctx.stroke();
    }
  }
  if (q.weight > .05 && q.phase !== "recover") { // the blade, hilt to tip
    ctx.globalAlpha = Math.min(1, q.weight) * (q.phase === "windup" || q.phase === "hold" ? .6 : 1); ctx.strokeStyle = "#fff1c8"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(q.angle) * H, cy + Math.sin(q.angle) * H); ctx.lineTo(cx + Math.cos(q.angle) * R, cy + Math.sin(q.angle) * R); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
