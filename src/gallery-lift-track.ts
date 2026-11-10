const finite = (value, name) => {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
  return value;
};
const positive = (value, name) => {
  finite(value, name);
  if (!(value > 0)) throw new RangeError(`${name} must be greater than zero`);
  return value;
};
const nonnegative = (value, name) => {
  finite(value, name);
  if (value < 0) throw new RangeError(`${name} must not be negative`);
  return value;
};

// The horizontal leg arrives beneath the upper station before the deck rises. No map
// tiles or production mover records are owned by this pure scratch-gallery track.
export function createGalleryLiftTrack(options) {
  const lower = Object.freeze({
    x: finite(options.lower.x, "lower.x"), y: finite(options.lower.y, "lower.y"),
    elevation: finite(options.lower.elevation, "lower.elevation"),
  });
  const upper = Object.freeze({
    x: finite(options.upper.x, "upper.x"), y: finite(options.upper.y, "upper.y"),
    elevation: finite(options.upper.elevation, "upper.elevation"),
  });
  if (!(upper.elevation > lower.elevation)) throw new RangeError("upper.elevation must exceed lower.elevation");
  const deck = Object.freeze({
    halfWidth: positive(options.deck?.halfWidth ?? .46, "deck.halfWidth"),
    halfDepth: positive(options.deck?.halfDepth ?? .46, "deck.halfDepth"),
    heightTolerance: nonnegative(options.deck?.heightTolerance ?? .08, "deck.heightTolerance"),
  });
  const timing = Object.freeze({
    dwellLower: nonnegative(options.timing?.dwellLower ?? 1, "timing.dwellLower"),
    travel: positive(options.timing?.travel ?? 2.5, "timing.travel"),
    rise: positive(options.timing?.rise ?? 2, "timing.rise"),
    dwellUpper: nonnegative(options.timing?.dwellUpper ?? 1, "timing.dwellUpper"),
  });
  const cycle = timing.dwellLower + timing.travel + timing.rise + timing.dwellUpper + timing.rise + timing.travel;
  return Object.freeze({ lower, upper, deck, timing, cycle });
}

const mix = (a, b, p) => a + (b - a) * p;

// O(1) for every finite elapsed value: large accepted clocks are reduced by one modulo,
// rather than replaying prior phases. Every boundary is assigned to its new exact pose.
export function galleryLiftPose(track, elapsed) {
  finite(elapsed, "elapsed");
  let t = ((Math.max(0, elapsed) % track.cycle) + track.cycle) % track.cycle;
  const { lower, upper, timing } = track;
  const pose = (phase, phaseProgress, x, y, elevation) =>
    Object.freeze({ phase, phaseProgress, x, y, elevation });
  if (t < timing.dwellLower) return pose("dwell-lower", timing.dwellLower ? t / timing.dwellLower : 1, lower.x, lower.y, lower.elevation);
  t -= timing.dwellLower;
  if (t < timing.travel) { const p = t / timing.travel; return pose("travel-out", p, mix(lower.x, upper.x, p), mix(lower.y, upper.y, p), lower.elevation); }
  t -= timing.travel;
  if (t < timing.rise) { const p = t / timing.rise; return pose("rise", p, upper.x, upper.y, mix(lower.elevation, upper.elevation, p)); }
  t -= timing.rise;
  if (t < timing.dwellUpper) return pose("dwell-upper", timing.dwellUpper ? t / timing.dwellUpper : 1, upper.x, upper.y, upper.elevation);
  t -= timing.dwellUpper;
  if (t < timing.rise) { const p = t / timing.rise; return pose("descend", p, upper.x, upper.y, mix(upper.elevation, lower.elevation, p)); }
  t -= timing.rise;
  const p = t / timing.travel;
  return pose("travel-back", p, mix(upper.x, lower.x, p), mix(upper.y, lower.y, p), lower.elevation);
}

// The caller supplies only accepted simulation time. A refused carry or a paused frame
// leaves the clock bit-identical and therefore cannot move the deck behind the caller.
export function advanceGalleryLiftClock(clock, dt, status = {}) {
  finite(clock.elapsed, "clock.elapsed");
  nonnegative(dt, "dt");
  return status.blocked || status.paused || dt === 0 ? clock : Object.freeze({ elapsed: clock.elapsed + dt });
}

export function galleryLiftContains(track, pose, actor) {
  if (![pose.x, pose.y, pose.elevation, actor.x, actor.y, actor.footElevation].every(Number.isFinite)) return false;
  return Math.abs(actor.x - pose.x) <= track.deck.halfWidth
    && Math.abs(actor.y - pose.y) <= track.deck.halfDepth
    && Math.abs(actor.footElevation - pose.elevation) <= track.deck.heightTolerance;
}

// Conservative continuous deck/body overlap for the one accepted frame. The deck path is
// linear within each phase; the vertical envelope also covers frames crossing one phase boundary.
export function galleryLiftSweepsActor(track, from, to, actor) {
  if (![from.x, from.y, from.elevation, to.x, to.y, to.elevation, actor.x, actor.y, actor.bottomElevation, actor.topElevation].every(Number.isFinite)) return false;
  const dx = to.x - from.x, dy = to.y - from.y;
  const denom = dx * dx + dy * dy;
  const p = denom > 0 ? Math.max(0, Math.min(1, ((actor.x - from.x) * dx + (actor.y - from.y) * dy) / denom)) : 0;
  const x = from.x + dx * p, y = from.y + dy * p;
  const verticalMin = Math.min(from.elevation, to.elevation), verticalMax = Math.max(from.elevation, to.elevation);
  return Math.abs(actor.x - x) <= track.deck.halfWidth
    && Math.abs(actor.y - y) <= track.deck.halfDepth
    && Math.max(verticalMin, actor.bottomElevation) <= Math.min(verticalMax, actor.topElevation);
}
