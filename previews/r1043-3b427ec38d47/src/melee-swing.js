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
  // The Fourfold Daggers (Tim, 2026-11-14: "cuts that cross in an X in front of the Wayfarer", quick and snappy like paired
  // daggers). One cut a press, each from its own hand: `side` is the hand's pivot, tiles to the aim's right (+) or left (-),
  // and the cut's annulus is centred there, hilt to tip (the profile's range, lengthened by reach). Facing north: the right
  // hand's cut starts east (+95°), sweeps across north and ends north-west (-50°); the left hand's mirrors it. The third step
  // is both hands at once (`pair`: the mirrored blade from the other hand), the X in one motion. A foe in front, in the X,
  // takes both hands' cuts; one off to a side takes one; one further out than the tip takes none. Short wind-ups, short
  // hit-stops, chained fast; the third step loops back to the first (`chainMs` on the finisher).
  'fourfold-daggers': Object.freeze({
    hilt: .15, bubble: .48, foePad: .1, bufferMs: 150, lungeFrom: .3, lungeStop: .7, lungeCone: .5, knockback: .15,
    extraShare: .78, // the mean step cadence over the old 420 ms press: the Echo and the Shadow Clone keep their damage per second
    steps: Object.freeze([
      Object.freeze({ name: 'right-cut', side: .28, windupMs: 110, holdMs: 20, activeMs: 60, hitStopMs: 40, followEndMs: 220, chainMs: 230, recoveryMs: 360, lunge: .12, from: 95, to: -50, cock: 25, overshoot: -22, share: .6 }),
      Object.freeze({ name: 'left-cut', side: -.28, windupMs: 90, holdMs: 0, activeMs: 60, hitStopMs: 40, followEndMs: 200, chainMs: 220, recoveryMs: 340, lunge: .12, from: -95, to: 50, cock: -25, overshoot: 22, share: .6 }),
      Object.freeze({ name: 'cross', side: .28, pair: true, windupMs: 160, holdMs: 40, activeMs: 70, hitStopMs: 60, followEndMs: 300, chainMs: 360, recoveryMs: 460, lunge: .2, from: 95, to: -50, cock: 30, overshoot: -25, share: .7 }),
    ]),
  }),
  // The Cinder Pike (Tim, 2026-11-14): a draw back, a thrust whose damage follows the spear tip out along its line, a
  // follow-through and a recovery. `thrust`: the blade does not turn (from = to = 0); the tip runs from `draw` of the reach
  // (drawn back in the wind-up) out to the full reach in the active window, and each tick hits only the stretch of line the
  // tip crossed, `width` tiles either side (a thin capsule), so a foe off the line is not touched. Weightier than the daggers,
  // quicker than the Cleaver; the third thrust is the deep lunge. Reach lengthens the shaft.
  // `shaft`: the Standard View's drawn shaft behind the head, in tiles (presentation only): the Close View pike is 1.47 tiles
  // long (close-view-models.ts CLOSE_VIEW_HERO_WEAPON_FORM.pike, 1.79 recipe x .82), less the .22 drawn head.
  'cinder-pike': Object.freeze({
    shaft: 1.25, hilt: .3, bubble: .48, foePad: .1, bufferMs: 150, lungeFrom: .35, lungeStop: .9, lungeCone: .5, knockback: .2, width: .12,
    extraShare: 1.17,
    steps: Object.freeze([
      Object.freeze({ name: 'thrust', thrust: true, draw: .55, windupMs: 200, holdMs: 40, activeMs: 80, hitStopMs: 50, followEndMs: 360, chainMs: 380, recoveryMs: 560, lunge: .3, from: 0, to: 0, cock: 0, overshoot: 0, share: 1.17 }),
      Object.freeze({ name: 'high-thrust', thrust: true, draw: .6, windupMs: 170, holdMs: 20, activeMs: 80, hitStopMs: 50, followEndMs: 330, chainMs: 360, recoveryMs: 540, lunge: .25, from: 0, to: 0, cock: 0, overshoot: 0, share: 1.12 }),
      Object.freeze({ name: 'lunge-thrust', thrust: true, draw: .45, windupMs: 280, holdMs: 60, activeMs: 90, hitStopMs: 80, followEndMs: 470, chainMs: 560, recoveryMs: 720, lunge: .5, from: 0, to: 0, cock: 0, overshoot: 0, share: 1.33 }),
    ]),
  }),
});
// Where each weapon's Close View pose keys sit (its own pose's progress 0..1 at the end of the wind-up, of the active window
// and of the follow-through); the weapon's pose is driven through these by the swing clock. Presentation only.
export const SWING_POSE_KEYS = Object.freeze({ 'cinder-pike': Object.freeze([.14, .30, .44]) });
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
  // A thrust's tip, as a share of the reach: drawn back to `draw` in the wind-up, driven out in the strike, held through the
  // follow-through, eased half back in the recovery. 1 for a cut (the blade's length never changes).
  if (st.thrust) { const d = st.draw;
    out.reach = phase === 'windup' ? 1 - (1 - d) * smooth(e / Math.max(1, T.holdAt)) : phase === 'hold' ? d : phase === 'active' ? damageReach(st, e, T) : phase === 'follow' ? 1 : 1 - (1 - d) * .5 * (phase === 'done' ? 1 : smooth((e - T.followEnd) / Math.max(1, T.recovery - T.followEnd)));
  } else out.reach = 1;
  return out;
}
// The strike's progress (0 at full cock .. 1 at `to`) at u of the active window: fast out of the hold (a whip, not a wipe).
export function strikeCurve(u) { const x = Math.max(0, Math.min(1, u)), k = x < .5 ? 2 * x * x * 1.3 : 1 - Math.pow(1 - x, 2) * 2 * .7; return Math.max(0, Math.min(1, k)); }
export function strikeAngle(st, u) { const cocked = st.from + st.cock; return cocked + (st.to - cocked) * strikeCurve(u); }
// A thrust's tip (share of the reach) at a swing time in the active window.
export function damageReach(st, elapsedMs, T) { return st.thrust ? st.draw + (1 - st.draw) * strikeCurve((elapsedMs - T.windEnd) / Math.max(1, T.activeEnd - T.windEnd)) : 1; }
// The blades a step swings: one, or two for a paired step (the second the mirror image from the other hand). `mirror` is +1
// for the step's own blade and -1 for the paired one: its pivot side and its angles are negated.
export const swingBlades = (st) => st?.pair ? 2 : 1;
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
// Exact: does a circle (px, py, r) touch the segment (ax, ay)-(bx, by)? (A thrust's swept capsule: the segment the tip
// crossed, with the capsule's width added to r by the caller.)
export function circleTouchesSegment(px, py, r, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy, t = l2 > 1e-12 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2)) : 0;
  return Math.hypot(px - ax - vx * t, py - ay - vy * t) <= r;
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
// when no swing is up. Reuses `out`. `rel*` are the same angles relative to the aim (radians) for a mirrored second blade;
// `side` is the blade's hand pivot (tiles to the aim's right), `pair` a paired step, `thrust`/`reach`/`draw` a thrust's tip.
export function swingIndicator(game, now, out = {}) {
  const q = game?.pendingMeleeContact; if (q?.v !== SWING_RECORD_VERSION) return null;
  const spec = PRIMARY_SWINGS[q.weapon], st = swingStep(spec, q.step); if (!st) return null;
  const e = q.elapsedMs, // drawn at the last tick's clock (the game ticks every frame): a pause, a hit-stop and a reload show exactly the same pose
    T = swingTimes(st, q.tempo, out.times || (out.times = {}), spec.lungeFrom), s = sampleSwing(st, e, q.tempo, out.sample || (out.sample = {}), T), aim = Math.atan2(q.aim.y, q.aim.x);
  out.x = game.player.x + .5; out.y = game.player.y + .45; out.aim = aim; out.angle = aim + s.angle * DEG; out.from = aim + st.from * DEG; out.to = aim + st.to * DEG;
  out.cocked = aim + (st.from + st.cock) * DEG; out.phase = s.phase; out.weight = s.weight; out.tip = Number(q.payload?.profile?.range) || 1.75;
  out.hilt = spec.hilt; out.step = q.step; out.elapsedMs = e; out.windup = Math.max(0, Math.min(1, e / Math.max(1, T.windEnd)));
  out.trail = s.phase === 'active' ? aim + damageAngle(st, e, T) * DEG : null; out.stopped = q.stopLeft > 0;
  out.relAngle = s.angle * DEG; out.relFrom = st.from * DEG; out.relTo = st.to * DEG; out.relCocked = (st.from + st.cock) * DEG; out.relTrail = out.trail == null ? null : out.trail - aim;
  out.side = Number(st.side) || 0; out.pair = !!st.pair; out.weapon = q.weapon; out.thrust = !!st.thrust; out.reach = s.reach; out.draw = st.thrust ? st.draw : 1;
  out.activeEnd = T.activeEnd;
  return out;
}
// The Close View clip progress (0..1 of the swing's drawn duration) for the live swing, frozen in hit-stop; null when none.
// A weapon with SWING_POSE_KEYS has its pose's own keys mapped onto the swing's phases instead.
export function swingVisualProgress(game, now) {
  const q = game?.pendingMeleeContact; if (q?.v !== SWING_RECORD_VERSION) return null;
  const spec = PRIMARY_SWINGS[q.weapon], st = swingStep(spec, q.step); if (!st) return null;
  return swingPoseProgress(q.weapon, st, q.elapsedMs, q.tempo, spec.lungeFrom);
}
const POSE_T = {}, POSE_AT = [0, 0, 0, 0, 0]; // scratch: no allocation per frame
export function swingPoseProgress(weapon, st, elapsedMs, tempo = 1, lungeFrom = .4) {
  const k = clampTempo(tempo), e = Math.max(0, Number(elapsedMs) || 0), keys = Object.hasOwn(SWING_POSE_KEYS, weapon) ? SWING_POSE_KEYS[weapon] : null;
  if (!keys) return Math.max(0, Math.min(1, e / (st.recoveryMs * k)));
  const T = swingTimes(st, k, POSE_T, lungeFrom), at = POSE_AT; at[1] = T.windEnd; at[2] = T.activeEnd; at[3] = T.followEnd; at[4] = T.recovery;
  for (let i = 1; i < 5; i++) if (e < at[i]) { const a = i === 1 ? 0 : keys[i - 2], b = i === 4 ? 1 : keys[i - 1]; return a + (b - a) * (e - at[i - 1]) / Math.max(1e-6, at[i] - at[i - 1]); }
  return 1;
}
// The weighted swing drawn from above (Standard View, renderer.ts; and on the Close View floor, main.ts): a faint wedge on
// the blade's side while it winds up (brighter at full cock), then a bright trail from where the cut began to the blade's real
// angle, and the blade itself from hilt to tip; each from its own hand's pivot. A paired step draws both blades; a
// one-handed dagger step also shows the other hand's dagger held at guard, so the pair reads as two blades. A thrust draws
// the shaft along the aim, its tip where the hit is. A handful of strokes; nothing allocated beyond the canvas path.
export function drawSwingSweep(ctx, q, sx, sy, s) {
  const rx = -Math.sin(q.aim), ry = Math.cos(q.aim), blades = q.pair ? 2 : 1, R = q.tip * s, H = q.hilt * s;
  if (q.thrust) { drawThrust(ctx, q, sx(q.x), sy(q.y), s, R, H); ctx.globalAlpha = 1; return; }
  for (let b = 0; b < blades; b++) {
    const m = b ? -1 : 1, cx = sx(q.x) + rx * q.side * m * s, cy = sy(q.y) + ry * q.side * m * s, A = (rel) => q.aim + m * rel;
    const from = A(q.relFrom), to = A(q.relTo), lo = Math.min(from, to), hi = Math.max(from, to), angle = A(q.relAngle), dir = to > from ? 1 : -1;
    if (q.phase === "windup" || q.phase === "hold") {
      ctx.globalAlpha = .14 + .22 * q.windup; ctx.fillStyle = "#e6bd78";
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, lo, hi); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = .35 + .45 * q.windup; ctx.strokeStyle = "#ffe0a0"; ctx.lineWidth = 2; ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(from) * H, cy + Math.sin(from) * H); ctx.lineTo(cx + Math.cos(from) * R, cy + Math.sin(from) * R); ctx.stroke(); ctx.setLineDash([]);
    } else if (q.phase === "active" || q.phase === "follow") {
      const end = q.phase === "active" ? A(q.relTrail) : Math.max(lo, Math.min(hi, angle)), a0 = dir > 0 ? from : end, a1 = dir > 0 ? end : from, fade = q.phase === "active" ? 1 : Math.max(0, 1 - (q.elapsedMs - (q.activeEnd || 0)) / 180);
      if (fade > 0 && a1 > a0) {
        ctx.globalAlpha = .38 * fade; ctx.strokeStyle = "rgba(215,149,72,1)"; ctx.lineWidth = Math.max(6, (R - H) * .5);
        ctx.beginPath(); ctx.arc(cx, cy, (R + H) / 2, a0, a1); ctx.stroke();
        ctx.globalAlpha = .9 * fade; ctx.strokeStyle = "#ffe0a0"; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(cx, cy, R * .94, a0, a1); ctx.stroke();
      }
    }
    if (q.weight > .05 && q.phase !== "recover") { // the blade, hilt to tip
      ctx.globalAlpha = Math.min(1, q.weight) * (q.phase === "windup" || q.phase === "hold" ? .6 : 1); ctx.strokeStyle = "#fff1c8"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(angle) * H, cy + Math.sin(angle) * H); ctx.lineTo(cx + Math.cos(angle) * R, cy + Math.sin(angle) * R); ctx.stroke();
    }
  }
  if (blades === 1 && q.weapon === 'fourfold-daggers') { // the other hand's dagger, held at guard ahead of its own shoulder
    const m = -1, cx = sx(q.x) + rx * q.side * m * s, cy = sy(q.y) + ry * q.side * m * s, a = q.aim + Math.sign(q.side || 1) * .5, r = Math.min(R, .7 * s);
    ctx.globalAlpha = .75; ctx.strokeStyle = "#fff1c8"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * H, cy + Math.sin(a) * H); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function drawThrust(ctx, q, cx, cy, s, R, H) {
  const ux = Math.cos(q.aim), uy = Math.sin(q.aim), tip = R * Math.max(.2, q.reach), tail = tip - s * PRIMARY_SWINGS['cinder-pike'].shaft, w = Math.max(3, s * .1);
  if (q.phase === "windup" || q.phase === "hold") { // the line the thrust will run along, out to the full reach
    ctx.globalAlpha = .3 + .45 * q.windup; ctx.strokeStyle = "#ffe0a0"; ctx.lineWidth = 2; ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(cx + ux * tip, cy + uy * tip); ctx.lineTo(cx + ux * R, cy + uy * R); ctx.stroke(); ctx.setLineDash([]);
  } else if (q.phase === "active" || q.phase === "follow") { // the stretch the tip crossed
    const fade = q.phase === "active" ? 1 : Math.max(0, 1 - (q.elapsedMs - (q.activeEnd || 0)) / 180), from = R * q.draw;
    if (fade > 0 && tip > from) { ctx.globalAlpha = .5 * fade; ctx.strokeStyle = "rgba(215,149,72,1)"; ctx.lineWidth = w * 2.2; ctx.beginPath(); ctx.moveTo(cx + ux * from, cy + uy * from); ctx.lineTo(cx + ux * tip, cy + uy * tip); ctx.stroke(); }
  }
  if (q.weight > .05) { // the shaft and its head
    ctx.globalAlpha = Math.min(1, q.weight); ctx.strokeStyle = "#c6a36a"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx + ux * tail, cy + uy * tail); ctx.lineTo(cx + ux * tip, cy + uy * tip); ctx.stroke();
    ctx.fillStyle = "#fff1c8"; ctx.beginPath(); ctx.moveTo(cx + ux * (tip + s * .22), cy + uy * (tip + s * .22)); ctx.lineTo(cx + ux * tip - uy * s * .08, cy + uy * tip + ux * s * .08); ctx.lineTo(cx + ux * tip + uy * s * .08, cy + uy * tip - ux * s * .08); ctx.closePath(); ctx.fill();
  }
}
