// The haunts (release 731). Tim, 2026-11-04: "cool creatures that... floated around... put them in the keeps... in various
// places... they can confuse you. So that instead of moving forward, you move backwards for a time. And... they can multiply if
// enough... get together, then they form one big... ghost creature... a fatter body. The big, scary mouth and face and arms and
// legs... sharp pointy... points at the ends of its arms and legs." Original creatures in that spirit:
// - Gloomwisps (monster-pack.ts `gloomwisp`): small floating orbs of dark gas with a grin and two eyes. Their puff (`wispBewilder`)
//   confuses: for `confuse.wisp` seconds the Wayfarer's movement is reversed (Game: player.confusedUntil). Now and then a wisp that
//   is hunting splits in two (`split`), `max` times, up to `cap` in the area; the children neither split nor give a reward.
// - The Gloomgorge (`gloomgorge`): when `merge.count` wisps drift within `merge.radius` of one another they pour together into one
//   squat, fat ghost with a huge grinning mouth and stubby clawed arms and legs: claws, a gaping inhale, a pouncing rake and a howl
//   that confuses for longer (`confuse.gorge`). One forms in an area each visit.
// Where (`places`): keeps, arcologies and the courts of the Great Castles on the overworld (`keep`), the floors inside the great buildings, castles and the Pentagon
// (`interior`), and now and then the fog moors and the Far Sleep (`wild`). Spawns are hashed from the seed and the area, so a
// haunted place is haunted every visit.
import { hashSeed } from "./random.js?v=r740-29f9ebbdac8f";
import { LETHAL_KINDS } from "./landscape.js?v=r740-29f9ebbdac8f";

export const HAUNT = {
  confuse: { wisp: 3.2, gorge: 5 }, // seconds the Wayfarer's movement is reversed
  split: { every: [11, 18], cap: 10, range: 1.2, max: 2 }, // seconds between a hunting wisp's splits (hashed), area cap, spawn offset; only a wisp that was placed splits, `max` times (so a haunt is bounded)
  merge: { count: 5, radius: 4.2, check: .5 }, // wisps this close together pour into a Gloomgorge
  clear: { entry: 5 }, // release 735: inside, wisps keep this far from where you come in (and off holes, doorways and objects)
  places: { keep: { chance: .7, count: [3, 5] }, interior: { chance: .3, count: [2, 4] }, wild: { chance: .035, count: [2, 3], minDepth: 8 } },
  text: { confused: "Your head swims: left is right, forward is back.", merge: "The wisps pour into one another and something huge grins out of the dark: a Gloomgorge.", split: "A wisp tears in two." },
};
export const isHaunt = (e) => e?.kind === "gloomwisp" || e?.kind === "gloomgorge";

// Where an area is haunted, and by how many: null or { place, count }.
export function hauntPlan(seed, areaKey, { keep = false, interior = false, wild = false, depth = 0 } = {}) {
  const place = keep ? "keep" : interior ? "interior" : wild && depth >= HAUNT.places.wild.minDepth ? "wild" : null; if (!place) return null;
  const P = HAUNT.places[place], h = (k) => hashSeed(`${seed}:haunt:v1:${areaKey}:${k}`);
  if ((h("roll") % 1000) / 1000 >= P.chance) return null;
  return { place, count: P.count[0] + h("n") % (P.count[1] - P.count[0] + 1) };
}
// The wisps' spawns: open, safe floor, inside `box` when given (a keep's court), in a loose knot, hashed from the area.
export function hauntSpawns(map, width, seed, areaKey, plan, box = null, where = null) {
  if (!plan || !map?.tiles?.length) return [];
  const h = (k) => hashSeed(`${seed}:haunt-at:v1:${areaKey}:${k}`), height = Math.floor(map.tiles.length / width);
  const ok = (t, x, y) => t && !t.blocked && !LETHAL_KINDS.has(t.kind) && !t.pit && x > 1 && y > 1 && x < width - 2 && y < height - 2 && (!box || (x >= box.x && y >= box.y && x < box.x + box.w && y < box.y + box.h)) && (!where || where(t));
  // release 735: never on a hole, a doorway or an object's tile (a stair, a chest, a door); inside, clear of the way in
  const objAt = new Set((map.objects || []).map((o) => `${Math.round(o.x)},${Math.round(o.y)}`)), ins = plan.place === "interior";
  const arrivals = ins ? [map.entry, ...Object.values(map.building?.entries || {})].filter((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y)) : [];
  const clear = (t, x, y) => !t.hole && !t.doorway && !objAt.has(`${x},${y}`), far = (x, y) => arrivals.every((p) => Math.hypot(x - p.x, y - p.y) >= HAUNT.clear.entry);
  const cand = []; for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const t = map.tiles[y * width + x]; if (ok(t, x, y) && clear(t, x, y)) cand.push([x, y]); }
  const strict = cand.filter(([x, y]) => far(x, y)), open = strict.length >= plan.count ? strict : cand;
  if (!open.length) return [];
  const [ax, ay] = open[h("anchor") % open.length], near = open.filter(([x, y]) => Math.hypot(x - ax, y - ay) <= 5);
  const pool = near.length >= plan.count ? near : open, out = [], used = new Set();
  for (let i = 0; out.length < plan.count && i < plan.count * 8; i++) { const [x, y] = pool[h(`p${i}`) % pool.length]; if (used.has(`${x},${y}`)) continue; used.add(`${x},${y}`); out.push({ id: `haunt:${areaKey}:${out.length}`, kind: "gloomwisp", x, y, haunt: plan.place, traits: [] }); }
  return out;
}
// Wisps that could pour together: the largest knot of `merge.count` or more within `merge.radius` of their centre, or null.
export function hauntKnot(wisps) {
  const M = HAUNT.merge; let best = null;
  for (const a of wisps) { const near = wisps.filter((b) => Math.hypot(b.x - a.x, b.y - a.y) <= M.radius); if (near.length >= M.count && (!best || near.length > best.length)) best = near; }
  if (!best) return null; const knot = best.slice(0, Math.max(M.count, best.length));
  return { wisps: knot, x: knot.reduce((s, e) => s + e.x, 0) / knot.length, y: knot.reduce((s, e) => s + e.y, 0) / knot.length };
}
export const splitDelay = (id, n) => { const S = HAUNT.split.every; return S[0] + (hashSeed(`split:${id}:${n}`) % 1000) / 1000 * (S[1] - S[0]); };
