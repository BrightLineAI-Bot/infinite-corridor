// The Tyrant Mosasaur hunts (release 231; Tim, 2026-10-19: "in any ocean tile … the Tyrant Mosasaur can always come
// and get you, even if you kill him … similar to the Questing Beast … a chance twice per tile … if you hang out in that
// tile too long, there's a chance he'll come back").
//
// While the Wayfarer is on ocean water, a clock runs; every TYRANT_HUNT.every seconds there is a TYRANT_HUNT.chance
// that the Tyrant rises from the deep a few tiles away and hunts them with its usual stalk, lock and lunge. It comes at
// most TYRANT_HUNT.perVisit times in one visit to a section (leaving and returning is a new visit), never while one is
// already in the section, and it is not saved: leave the section and it is gone. Killing it gives its experience and,
// the first time, its leviathan trophy, like any other. Pure rules: no DOM; game.ts calls tickTyrantHunt each frame.
export const TYRANT_HUNT = {
  kind: "tyrantMosasaur",
  water: ["ocean", "deepOcean"], // where it can reach you, and where it rises
  every: 40,                     // seconds on ocean water between chances
  chance: .3,                    // the chance it comes, at each
  perVisit: 2,                   // at most this many times per visit to a section
  range: [6, 9],                 // tiles from the Wayfarer it rises at
};

// A visit: the section, the clock on the water, and how many times it has come.
export function tyrantVisit(rx, ry) { return { key: `${rx},${ry}`, clock: 0, count: 0 }; }
// Advances the visit by `dt` seconds. Returns true when the Tyrant comes now. `rand` returns [0, 1).
export function tickTyrantHunt(visit, dt, onOcean, present, rand) {
  if (!visit || !onOcean || present || visit.count >= TYRANT_HUNT.perVisit) return false;
  visit.clock += dt;
  if (visit.clock < TYRANT_HUNT.every) return false;
  visit.clock = 0;
  if (!(rand() < TYRANT_HUNT.chance)) return false;
  return true;
}
// Counts a rise against the visit (only once the Tyrant has actually surfaced).
export function countTyrantRise(visit) { if (visit) visit.count += 1; return visit; }
// Where it rises: an ocean tile in range of (px, py), inside the section, or null when the water is too small.
// (Ocean tiles are `blocked` to walking in generated sections; only the kind matters here, as for sea spawns.)
export function tyrantRisePoint(map, px, py, rand, width = 32) {
  const [lo, hi] = TYRANT_HUNT.range, tiles = (map?.tiles || []).filter((t) => TYRANT_HUNT.water.includes(t.kind) && t.x > 1 && t.y > 1 && t.x < width - 2 && t.y < width - 2);
  const ring = tiles.filter((t) => { const d = Math.hypot(t.x - px, t.y - py); return d >= lo && d <= hi; });
  if (!ring.length) return null;
  const t = ring[Math.floor(rand() * ring.length) % ring.length];
  return { x: t.x, y: t.y };
}
