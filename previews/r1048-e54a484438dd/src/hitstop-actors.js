// Per-actor hit-stop (Tim, 2026-11-19: "like Elden Ring"): on a heavy connect only the Wayfarer and the creature she struck pause
// for a few tens of ms; every other creature, shot, hazard, effect and timer runs on, and a blow from anyone else still lands on
// her during the stop (damage is never deferred). It replaces release 1023's presentation-only full-frame hold (close-view-polish.ts)
// and takes in the weighted swings' own game-time hit-stop (melee-swing.ts / great-sweep.ts hitStopMs), which already held only
// the swing and the struck foes.
//
// HITSTOP_ACTORS (data; game.ts reads it):
//   swing: a weighted swing's first hit (the Cleaver, the Pike, the Fourfold Daggers, the Great Sweep): the step's own hitStopMs
//     (40-110 ms, already scaled by the step's weight), never more than `maxMs`. Kept under Reduced Motion and Safe Mode
//     (`reducedScale` 1): it is part of each swing's tuned timeline, as it always was.
//   parry: a perfect parry (Power Aegis): `ms`, never more than `maxMs`.
//   stagger: a blow of the Wayfarer's that staggers hard (Hammerfall, its clap, a charged Iron Fist or the uppercut, a plunge
//     slam; the blow's own stagger seconds, `fx.stun`, so a boss struck as hard pauses as long): `ms` for a blow of at least
//     `heavy` s, scaled down to `ms * minShare` at `from`, none below `from`; never more than `maxMs`.
//   parry and stagger are off under Reduced Motion and Safe Mode (`reducedScale` 0), as the full-frame hold was.
//   gapMs: after a stop ends, none begins for this long (no chaining into a long freeze). A blow landing in the same update as a
//     stop began joins it: each foe it strikes pauses too (never longer than the Wayfarer's stop), the Wayfarer pauses once.
//   wayfarerClocks: the Wayfarer's action and animation clocks (absolute ms on the update clock) held through a parry or stagger
//     stop (a swing's stop is held by the swing's own record, stopLeft, and lengthens the same clocks once).
//   foeMaxMs: a stored foe stop is clamped to this (bounded on load).
//
// State: the Wayfarer's stop is one small record on the Game (`hitStop`: { kind, left, gap, at }, ms, counted down by the update's
// dt), saved with the journey's runtime as ms remaining (playerRuntime.hitStop, additive) so a reload mid-stop resumes the same
// remainder, never longer. A struck foe's is `e.hitStop` (ms left), counted down by dt and saved with the area's foes the way
// hitStun is. Pausing simply stops the update calls, so a pause or the app in the background holds both exactly.
import { unharmablePerson } from "./townsfolk.js?v=r1048-e54a484438dd"; // Tim (2026-11-20): no non-hostile person can be harmed
export const HITSTOP_ACTORS = Object.freeze({
  version: 1,
  swing: Object.freeze({ maxMs: 110, reducedScale: 1 }),
  parry: Object.freeze({ ms: 70, maxMs: 70, reducedScale: 0 }),
  stagger: Object.freeze({ ms: 60, from: .3, heavy: .5, minShare: .67, maxMs: 70, reducedScale: 0 }),
  gapMs: 120,
  foeMaxMs: 110,
  wayfarerClocks: Object.freeze(['attackUntil', 'actionVisualUntil', 'primaryVisualUntil', 'fistVisualUntil', 'meleeUntil']),
});
const KINDS = Object.freeze(['swing', 'parry', 'stagger']);
const clamp01 = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x;

// How long (ms, whole) a connect of `kind` stops the two actors. swing: `ms` is the step's hitStopMs; stagger: `stun` is the
// blow's stagger seconds; `reduce`: Reduced Motion or Safe Mode. 0: no stop.
export function hitStopActorMs(kind, { ms = 0, stun = 0, reduce = false } = {}, H = HITSTOP_ACTORS) {
  const R = H[kind]; if (!R || !KINDS.includes(kind)) return 0;
  let out = 0;
  if (kind === 'swing') out = Math.max(0, Number(ms) || 0);
  else if (kind === 'parry') out = R.ms;
  else { const s = Number(stun) || 0; if (s >= R.from) out = R.ms * (R.minShare + (1 - R.minShare) * clamp01((s - R.from) / Math.max(1e-6, R.heavy - R.from))); }
  out = Math.min(R.maxMs, out) * (reduce ? R.reducedScale : 1);
  return out > 0 ? Math.round(out) : 0;
}

// A clean Wayfarer record (also clamps one read back from a save; null when there is nothing left to count).
export function normalizeHitStop(raw, H = HITSTOP_ACTORS) {
  if (!raw || typeof raw !== 'object' || !KINDS.includes(raw.kind)) return null;
  const n = (v, hi) => { const x = Number(v); return Number.isFinite(x) ? Math.max(0, Math.min(hi, x)) : 0; };
  const left = n(raw.left, H[raw.kind].maxMs), gap = n(raw.gap, H.gapMs);
  return left > 0 || gap > 0 ? { kind: raw.kind, left, gap, at: null } : null;
}

// Begin (or refuse) the Wayfarer's stop at update time `now` for `ms`. `state` is the Game's record (or null); returns
// { state, ms }: the record to keep and the ms granted (0 refused). A stop already running refuses a new one, unless it began
// in this same update (`at === now`): then the new blow joins it and its foes pause for at most what the Wayfarer has left.
// Inside `gapMs` after a stop ends, none begins.
export function beginHitStop(state, kind, ms, now, H = HITSTOP_ACTORS) {
  const want = Math.min(Number(ms) || 0, H[kind]?.maxMs || 0);
  if (!(want > 0)) return { state, ms: 0 };
  if (state && state.left > 0) return { state, ms: state.at === now ? Math.min(want, state.left) : 0, joined: state.at === now };
  if (state && state.gap > 0) return { state, ms: 0 };
  return { state: { kind, left: want, gap: 0, at: now }, ms: want };
}

// One update (`dtMs`): how long the Wayfarer is held in it (ms), counting the stop down; the gap starts as it ends and counts
// down through the rest of the update. Returns 0 with no record.
export function tickHitStop(state, dtMs, H = HITSTOP_ACTORS) {
  if (!state) return 0;
  const d = Math.max(0, Number(dtMs) || 0);
  const held = Math.min(state.left, d); state.left -= held;
  if (held > 0 && state.left <= 0) { state.left = 0; state.gap = H.gapMs; }
  if (state.left <= 0 && state.gap > 0) state.gap = Math.max(0, state.gap - (d - held));
  return held;
}

// A struck foe pauses for `ms` (the longer of what it has and this). Returns true when it holds. A foe the stagger governor is
// guarding (staggerGuard: it was just stagger-locked and shrugs blows off, monster-pack.ts) or one that is never staggered
// (staggerImmune) does not pause: no weapon chains its stops into a lock.
export function holdFoe(e, ms, H = HITSTOP_ACTORS) {
  if (!e || e.dead || unharmablePerson(e) || !(ms > 0) || e.staggerGuard > 0 || e.staggerImmune) return false;
  e.hitStop = Math.min(H.foeMaxMs, Math.max(Number(e.hitStop) || 0, ms)); return true;
}
// Whether a foe is held this update (and its stop counted down by `dtMs`). A stored value is clamped (bounded on load).
export function foeHeld(e, dtMs, H = HITSTOP_ACTORS) {
  const left = Number(e?.hitStop);
  if (!(left > 0)) { if (e && 'hitStop' in e) delete e.hitStop; return false; }
  if (e.dead) { delete e.hitStop; return false; }
  const rest = Math.min(H.foeMaxMs, left) - Math.max(0, Number(dtMs) || 0);
  if (rest > 0) e.hitStop = rest; else delete e.hitStop;
  return true;
}
