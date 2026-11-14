// Close View shadow forms (Tim, 2026-11-12). Presentation only: nothing here writes gameplay state (followShadowDash reads it).
//
// Shadow Boxing: "in close view you kind of just teleport to different places... it'd be cool if the character would
// track and charge to an enemy, a charging animation, then deliver the blow... Make him more of a wraith, a spectral
// form, afterimages of him as he charges towards the enemies, then the attack." Gameplay still moves the Wayfarer in one
// update (game.ts shadowBoxStep and the Iron Fists' boxing rush). The drawn hero now lags behind that move for a short,
// distance-scaled time and catches up along the straight dash line (the live position is always the end point), leaning
// into a charge, translucent and violet, trailing up to `trail.max` pooled afterimages; the swing's own clock is
// re-timed so its contact pose lands at arrival. Reduced motion: no trail and no travel, only a simple wraith fade.
//
// Shadow Clone: "a boxy version of the character, it should be more of a wraith... make it a little more visible". The
// clone's native mesh (close-view-models.ts `playerShadow`) is a hooded, tattered shroud with wisps for legs; this
// table holds its stronger alpha. Positions, timing, hits and wall passing are untouched.
export const CLOSE_VIEW_SHADOW_FORMS = Object.freeze({
  dash: Object.freeze({
    minJump: .6,        // tiles moved in one frame before a boxing swing counts as a dash
    maxJump: 12,        // larger moves are area changes or teleports: drawn as they are
    walkSpeed: 9,       // tiles/s an ordinary move can cover; a dash must beat it for the frame's elapsed time
    lagMin: 120, lagMax: 180, lagPerTile: 14, // ms the drawn hero takes to catch up: lagMin + lagPerTile x distance, clamped
    freshMs: 90,        // the swing must have started within this many ms (plus the frame) of the jump
    settleMs: 140,      // after arrival: the lean and the wraith tint ease back out
    rampIn: .2,         // fraction of the charge over which the lean comes in
    lean: .42,          // forward lean (radians) at full charge, imported hero spine
    nativeLean: .30,    // the same for the native fallback body
    crouch: .45, drop: .1, // 2026-11-14: the charge runs low: planted crouch weight and pelvis drop at full charge (imported hero)
  }),
  wraith: Object.freeze({ alpha: .58, tint: Object.freeze([.70, .56, 1.12]), reducedAlpha: .5 }),
  trail: Object.freeze({ max: 5, spacing: .16, alpha: .5, fadeMs: 170, tint: Object.freeze([.58, .44, 1.15]) }),
  clone: Object.freeze({ alpha: .86, pulse: .04, pulseHz: 6, fadeMs: 1500 }),
});

const clamp01 = (v) => v <= 0 ? 0 : v >= 1 ? 1 : v;
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
// The charge's travel: half linear, half eased, so it sets off and lands softly with a peak speed only 1.25x the mean.
const travel = (t) => { t = clamp01(t); return .5 * t + .5 * t * t * (3 - 2 * t); };

// One state per view. `trail` holds [x, y, alpha] for each live afterimage, nearest first.
export function createShadowDash() {
  return { active: false, reduce: false, fromX: 0, fromY: 0, toX: 0, toY: 0, start: 0, lag: 0, arriveAt: 0,
    x: 0, y: 0, progress: 1, charge: 0, wraith: 0, moving: false, dashes: 0,
    trail: new Float64Array(CLOSE_VIEW_SHADOW_FORMS.trail.max * 3), trailCount: 0, game: false };
}
export function resetShadowDash(D) { D.active = false; D.charge = 0; D.wraith = 0; D.trailCount = 0; D.progress = 1; D.moving = false; return D; }

// Advance the presentation for one frame. lx, ly: the Wayfarer's logical position now; px, py: last frame's logical
// position; elapsedMs: time since that frame; boxing: Shadow Boxing holds; fresh: a swing began this frame (the only
// thing that moves the Wayfarer by Shadow Boxing). Writes D.x, D.y (the drawn position, logical coordinates), D.charge
// (lean weight 0..1), D.wraith (spectral weight 0..1) and the trail. No allocation.
export function stepShadowDash(D, now, lx, ly, px, py, elapsedMs, boxing, fresh, reduce) {
  const T = CLOSE_VIEW_SHADOW_FORMS.dash, R = CLOSE_VIEW_SHADOW_FORMS.trail;
  const jump = Math.hypot(lx - px, ly - py), dt = Math.max(0, Number(elapsedMs) || 0);
  if (boxing && fresh && Number.isFinite(jump) && jump >= T.minJump && jump <= T.maxJump && jump > T.walkSpeed * dt / 1000) {
    const fx = D.active && D.moving && !D.reduce ? D.x : px, fy = D.active && D.moving && !D.reduce ? D.y : py;
    D.fromX = fx; D.fromY = fy; D.start = now; D.reduce = !!reduce;
    D.lag = Math.max(T.lagMin, Math.min(T.lagMax, T.lagMin + T.lagPerTile * Math.hypot(lx - fx, ly - fy)));
    D.arriveAt = now + D.lag; D.active = true; D.dashes++;
  }
  D.toX = lx; D.toY = ly;
  if (!D.active) { D.x = lx; D.y = ly; D.progress = 1; D.charge = 0; D.wraith = 0; D.trailCount = 0; D.moving = false; return D; }
  const t = Math.max(0, (now - D.start) / D.lag), after = Math.max(0, now - D.arriveAt);
  if (D.reduce) { // reduced motion: drawn where it stands, a plain spectral fade in and back out
    D.x = lx; D.y = ly; D.progress = 1; D.moving = false; D.charge = 0; D.trailCount = 0;
    D.wraith = t < 1 ? 1 : 1 - smooth(after / T.settleMs);
    if (t >= 1 && after >= T.settleMs) resetShadowDash(D);
    return D;
  }
  const e = travel(t), dx = lx - D.fromX, dy = ly - D.fromY;
  D.moving = t < 1; D.progress = t < 1 ? e : 1;
  D.x = t < 1 ? D.fromX + dx * e : lx; D.y = t < 1 ? D.fromY + dy * e : ly;
  D.charge = t < 1 ? smooth(t / T.rampIn) : 1 - smooth(after / T.settleMs);
  D.wraith = t < 1 ? 1 : 1 - smooth(after / T.settleMs);
  // Afterimages: the same path sampled behind the hero; they keep closing in after arrival as they fade.
  const fade = t < 1 ? 1 : 1 - clamp01(after / R.fadeMs);
  let n = 0;
  if (fade > 0) for (let k = 1; k <= R.max; k++) {
    const tk = t - k * R.spacing; if (tk <= 0 || tk >= 1) continue;
    const ek = travel(tk), o = n * 3; D.trail[o] = D.fromX + dx * ek; D.trail[o + 1] = D.fromY + dy * ek;
    D.trail[o + 2] = R.alpha * (1 - k / (R.max + 1)) * fade; n++;
  }
  D.trailCount = n;
  if (t >= 1 && after >= Math.max(T.settleMs, R.fadeMs)) resetShadowDash(D);
  return D;
}

// Shadow Boxing's charge as gameplay now runs it (brawler-spells.ts SHADOW_DASH, game.shadowDash; Tim, 2026-11-14: "I still
// just see him teleport"). The Wayfarer really travels, so the drawn hero stands on the logical position (no lag) and only the
// pose and the afterimages come from the dash: the lean and crouch weight, the wraith weight and up to SHADOW_DASH.ghosts
// afterimages back along the path, during the dash and for its fade after arrival. Unlike the release-922 lag above this is
// drawn in safe mode and at every quality tier (it is the same few pooled copies, nothing flashes). True while it drives D.
// `ghostsOf` and `poseOf` are brawler-spells.ts shadowDashGhosts and shadowDashPose, passed in by close-view.ts (importing
// brawler-spells here would close a module cycle through close-view.ts). No allocation.
const DASH_POSE = { live: false, charge: 0, wraith: 0, t: 1 };
export function followShadowDash(D, game, lx, ly, ghostsOf, poseOf) {
  const P = poseOf(game, DASH_POSE); if (!P.live && !(P.charge > 0)) { if (D.game) { resetShadowDash(D); D.game = false; } return false; }
  D.active = true; D.game = true; D.reduce = false; D.x = lx; D.y = ly; D.toX = lx; D.toY = ly; D.moving = !!game?.shadowDash && !game.shadowDash.arrived; D.progress = P.t;
  D.charge = P.charge; D.wraith = P.wraith;
  D.trailCount = ghostsOf(game, D.trail); return true; // at most trail.max (the pool's size)
}

// The swing's presented progress during a dash. Gameplay's clock is unchanged; only the pose is re-timed so the
// wind-up fills the charge and the contact pose lands on arrival, then the rest of the swing plays out in the time left.
export function shadowStrikePhase(D, now, amount, durationMs, contact = .18) {
  const a = clamp01(Number(amount) || 0), dur = Number(durationMs), c = clamp01(Number(contact));
  if (!D?.active || D.reduce || !(dur > 0)) return a;
  const attackStart = now - a * dur;
  if (Math.abs(attackStart - D.start) > CLOSE_VIEW_SHADOW_FORMS.dash.freshMs) return a;
  const k = Math.max(0, Math.min(.9, (D.arriveAt - attackStart) / dur));
  if (!(k > 0)) return a;
  return a <= k ? c * a / k : c + (1 - c) * (a - k) / (1 - k);
}

// The Shadow Clone's Close View opacity from its own lifetime: brighter than before (.62 to .70), still breathing,
// still fading over its last `fadeMs`. Reduced motion keeps it steady.
export function shadowCloneAlpha(until, now, reduce = false) {
  const C = CLOSE_VIEW_SHADOW_FORMS.clone, left = (Number(until) || 0) - now;
  const fade = clamp01(left / C.fadeMs);
  return fade * Math.min(1, C.alpha + (reduce ? 0 : C.pulse * Math.sin(now / 1000 * C.pulseHz)));
}
