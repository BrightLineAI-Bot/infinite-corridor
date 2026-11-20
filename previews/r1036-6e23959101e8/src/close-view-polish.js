// Close View polish (Tim, 2026-11-19: "buttery smooth, no rendering glitches", the controls' feel and ease of navigation).
// The numbers of the polish pass as one data table, and the pure easing arithmetic the camera, the drag and the fades
// share (close-view.ts uses them; tests/close-view-polish.test.ts pins them). Presentation only: nothing here reads or
// writes the save, the simulation or its clocks, so determinism and exact resume are untouched. No allocation in any function.
//
// pitch.fitTau: the framing clamp's correction (the whole body kept in frame, close-view.ts orbitPlace) eases in over about this
//   long (seconds, critically damped) instead of landing in one frame; the clamp's window itself is continuous (framingFit).
// zoom.tau: the Wayfarer's own distance (Look mode's pinch and wheel on her, save.closeViewZoom) eases onto the orbit's radius,
//   critically damped (SmoothDamp's smooth time: rate 2 / tau). Reduced Motion: it snaps.
// drag: `pitch` radians of tilt a px of drag (was .0035, felt slow); on release the turn keeps its momentum (`inertiaTau` seconds'
//   exponential decay, never faster than `inertiaMaxDeg` degrees a second, stopped under `inertiaMinDeg`), only if the finger was
//   still moving (`idleMs`: resting longer than this before lifting leaves nothing to carry); the release velocity is the drag's
//   low-passed speed (`sampleTau` seconds). The tilt's limits are soft: within `softTiltDeg` degrees of either end a push toward it
//   is eased off exponentially (it slows into the stop; never a wall). Reduced Motion: no inertia.
// recentre: the swing back behind the Wayfarer accelerates at `accel` and brakes at `brake` (radians a second squared) to at most
//   `maxRate` radians a second (the old constant speed): an eased start and stop.
// fade: a creature coming into or leaving sight, a light's halo and a card prop entering or leaving the sight field fade over
//   `creatureSec` / `haloSec` / `cardSec` seconds (smoothstep) instead of popping.
// crossfade: the view cutting under the floor (the under-floor view, kept: Tim likes it) or back, and a door, stairs, a teleport or
//   mounting cross-fade from the last frame drawn over `underFloorSec` / `transitionSec` seconds (one canvas copy when it starts, one
//   draw a frame while it lasts), only when the last frame was Close View within `gapMs` (a load or resume never fades from stale art).
// (The cutout's softer rim is CLOSE_VIEW.camera.orbit.cutout.soft, .3 -> .42, on an 8x8 dither: close-view-gl.ts WALL_CUT_GLSL.)
// (hitStop: release 1023's presentation-only full-frame hold was removed on Tim's 2026-11-19 rework; its numbers moved to
//   hitstop-actors.ts HITSTOP_ACTORS, where only the Wayfarer and the creature she struck pause, in game time.)
export const CLOSE_VIEW_POLISH = Object.freeze({
  version: 1,
  pitch: Object.freeze({ fitTau: .06 }),
  zoom: Object.freeze({ tau: .12 }),
  drag: Object.freeze({ pitch: .006, inertiaTau: .12, inertiaMaxDeg: 300, inertiaMinDeg: 4, idleMs: 70, sampleTau: .04, softTiltDeg: 12 }),
  recentre: Object.freeze({ maxRate: 7, accel: 40, brake: 26 }),
  fade: Object.freeze({ creatureSec: .2, haloSec: .2, cardSec: .2 }),
  crossfade: Object.freeze({ underFloorSec: .2, transitionSec: .2, gapMs: 400 }),
});
const DEG = Math.PI / 180;
const clamp01 = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x;
export const smoothstep01 = (x) => { const t = clamp01(x); return t * t * (3 - 2 * t); };

// A critically damped spring on o[k] (velocity o[v]) toward `target`, SmoothDamp's smooth time `tau` (rate 2 / tau), exact for any dt.
export function smoothDamp(o, k, v, target, tau, dt) {
  if (!(tau > 0) || !Number.isFinite(o[k])) { o[k] = target; o[v] = 0; return o[k]; }
  if (!(dt > 0)) return o[k];
  const w = 2 / tau, y = o[k] - target, e = Math.exp(-w * dt), j = ((Number(o[v]) || 0) + w * y) * dt;
  o[k] = target + (y + j) * e; o[v] = ((Number(o[v]) || 0) - w * j) * e; return o[k];
}

// The tilt with soft limits: `cur` moved by `delta` within [lo, hi]; inside `zone` of the end it is moving toward, the motion is
// eased off exponentially (d cur = d input x distance-to-end / zone), so the stop is approached smoothly and never reached hard.
// Moving away from an end is linear. Always within [lo, hi].
export function softTilt(cur, delta, lo, hi, zone) {
  if (!(hi > lo)) return Math.max(lo, Math.min(hi, cur));
  let x = Math.max(lo, Math.min(hi, Number.isFinite(cur) ? cur : 0)), d = Number(delta) || 0; const z = Math.max(1e-6, Math.min(zone, (hi - lo) / 2));
  if (d > 0) { const edge = hi - z; if (x < edge) { const lin = Math.min(d, edge - x); x += lin; d -= lin; } if (d > 0) x = hi - (hi - x) * Math.exp(-d / z); }
  else if (d < 0) { const edge = lo + z; if (x > edge) { const lin = Math.max(d, edge - x); x += lin; d -= lin; } if (d < 0) x = lo + (x - lo) * Math.exp(d / z); }
  if (hi - x < 1e-4) x = hi; else if (x - lo < 1e-4) x = lo; // settled on the stop (no endless creep)
  return Math.max(lo, Math.min(hi, x));
}

// The drag's release: its low-passed velocity (radians a second) carried on, or nothing if the finger had rested `idleMs` before
// lifting; capped at inertiaMaxDeg. Returns the carried velocity for one axis.
export function inertiaRelease(v, restMs, P = CLOSE_VIEW_POLISH.drag) {
  if (!Number.isFinite(v) || !(restMs < P.idleMs)) return 0;
  const cap = P.inertiaMaxDeg * DEG; return Math.max(-cap, Math.min(cap, v));
}
// One frame of the carried turn: the velocity after dt (exponential decay, time constant inertiaTau), 0 under inertiaMinDeg.
export function inertiaDecay(v, dt, P = CLOSE_VIEW_POLISH.drag) {
  if (!Number.isFinite(v) || !(dt > 0)) return Number.isFinite(v) ? v : 0;
  const n = v * Math.exp(-dt / P.inertiaTau); return Math.abs(n) < P.inertiaMinDeg * DEG ? 0 : n;
}
// The angle the carried turn adds over dt (the exact integral of the decay), for velocity v at the frame's start.
export const inertiaTravel = (v, dt, P = CLOSE_VIEW_POLISH.drag) => (Number.isFinite(v) && dt > 0 ? v * P.inertiaTau * (1 - Math.exp(-dt / P.inertiaTau)) : 0);

// The eased recentre: o.v (radians a second, >= 0) gathers at accel, never over maxRate nor faster than it could stop by the goal
// (brake); returns the step toward `diff` (signed radians), never past it.
export function recentreStep(o, diff, dt, P = CLOSE_VIEW_POLISH.recentre) {
  if (!(dt > 0)) return 0; const d = Math.abs(diff); if (d < 1e-9) { o.v = 0; return 0; }
  const v = Math.min((Number(o.v) || 0) + P.accel * dt, P.maxRate, Math.sqrt(2 * P.brake * d) + P.brake * dt * .5);
  o.v = v; return Math.sign(diff) * Math.min(d, v * dt);
}

// A fade's linear progress a (0..1) one frame on toward `want` (0 or 1) over `sec` seconds; the shown alpha is smoothstep01(a).
export function fadeToward(a, want, dt, sec) {
  const x = Number.isFinite(a) ? a : want; if (!(sec > 0)) return want; if (!(dt > 0)) return x;
  const s = dt / sec; return want > x ? Math.min(want, x + s) : Math.max(want, x - s);
}
// A cross-fade's overlay alpha `t` seconds after it began: 1 (the old frame) easing to 0 over `sec`.
export const crossfadeAlpha = (t, sec) => (sec > 0 ? 1 - smoothstep01(t / sec) : 0);

