// The dungeon ladder (release 319; Tim, 2026-10-22: "for the different aperture levels... include some of the more special,
// unique and larger dungeons... you should always have access to some of the... unique dungeons, but they should be fewer
// or... smaller versions... a taste... a phased, gradual rollout... by the time you get to infinite tier 13, you should have
// basically everything"; "level one is just the normal base game... no taste... at level 2... There should be a large...
// dungeon that's available at level one").
//
// Each special kind has an unlock tier (apertureTier). From it, the kind appears at a share of today's rate that climbs from
// `ramp.from` to `ramp.at12` by Infinite II, and at today's full rate from Infinite III (`fullTier`). Below its unlock tier,
// from `tasteFrom` (Open) up, it can still appear as a taste: `tasteShare` of the time, and where a smaller version exists,
// the smaller one. Below `tasteFrom` there are no tastes; the one exception is the large quiet crossing (`largeQuiet`): a
// large ordinary dungeon with no environment and no daises.
//
// Decisions are fixed per dungeon: ordinary crossings record the tier they were first generated at (history.ladder), and
// deep and arena entrances record theirs when first entered (release 323: they never seal; below their tier they open as tastes, 325: whole, with weaker creatures). Histories pinned before this release have no
// `ladder` and keep today's rules.
import { hashSeed } from "./random.js?v=r629-abf201d59b52";
import { apertureTier } from "./world.js?v=r629-abf201d59b52";

export const DUNGEON_LADDER = {
  version: 1,
  tasteFrom: 2,
  tasteShare: .25,
  ramp: { from: .5, at12: .8 },
  fullTier: 13,
  unlock: { large: 3, warp: 3, newThemes: 3, gatePredator: 3, guardiansMid: 3, guardiansAll: 6, poisonCrypt: 6, arena: 6, threefold: 6, deepV2: 9, horde: 9 },
  largeQuiet: .25,
  guardians: { base: 5, mid: 10 },
  tasteThreat: { base: .55, perTier: .05 }, // release 325: creature strength in a deep or arena entered as a taste, by the tier it was entered at
};

export function ladderTier(save) { return apertureTier(save?.perception?.aperture || 0); }
// The share of today's rate at which a kind appears at `tier`, once unlocked (0 below its unlock tier).
export function ladderRate(kind, tier) {
  const L = DUNGEON_LADDER, u = L.unlock[kind] ?? 0;
  if (tier >= L.fullTier) return 1;
  if (tier < u) return 0;
  if (tier >= 12 || u >= 12) return L.ramp.at12;
  return L.ramp.from + (L.ramp.at12 - L.ramp.from) * (tier - u) / (12 - u);
}
// "full", "taste" or null for one dungeon. The roll is fixed per seed, id and kind, so as the tier climbs a kind only ever
// opens up, never closes.
export function ladderRoll(seed, id, kind, tier) {
  const L = DUNGEON_LADDER, u = hashSeed(`${seed}:ladder:v${L.version}:${kind}:${id}`) % 1000 / 1000;
  if (tier >= (L.unlock[kind] ?? 0)) return u < ladderRate(kind, tier) ? "full" : null;
  if (tier >= L.tasteFrom) return u < L.tasteShare ? "taste" : null;
  if (kind === "large") return u < L.largeQuiet ? "quiet" : null;
  return null;
}
// What an ordinary crossing's generator may use (underlands.ts generateExpeditionDungeon reads it as options.ladder).
export function crossingLadder(seed, id, tier) {
  return { large: ladderRoll(seed, id, "large", tier), warp: !!ladderRoll(seed, id, "warp", tier), newThemes: !!ladderRoll(seed, id, "newThemes", tier) };
}
// The guardian a crossing gets: the first `guardians.base` of the pool at first, `mid` from guardiansMid, all of them from
// guardiansAll; from tasteFrom, a quarter of the later ones still come through.
export function ladderGuardian(seed, id, tier, kind, pool) {
  const L = DUNGEON_LADDER, n = tier >= L.unlock.guardiansAll ? pool.length : tier >= L.unlock.guardiansMid ? L.guardians.mid : L.guardians.base, i = pool.indexOf(kind);
  if (i >= 0 && i < n) return kind;
  if (tier >= L.tasteFrom && hashSeed(`${seed}:ladder:v${L.version}:guardian-taste:${id}`) % 1000 / 1000 < L.tasteShare) return kind;
  return pool[hashSeed(`${seed}:ladder:v${L.version}:guardian:${id}`) % n];
}
// Deep and arena entrances: which ladder kind an overworld object is, if any.
export function entranceKind(o) { return o?.kind === "arenaEntrance" ? "arena" : o?.dungeonType === "deep-v1" ? "threefold" : o?.dungeonType === "deep-v2" ? "deepV2" : null; }
