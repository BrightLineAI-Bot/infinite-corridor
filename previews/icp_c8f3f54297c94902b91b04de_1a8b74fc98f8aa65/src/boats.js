// The Skiff (water world W2, docs/water-world-design.md). Bought from a Shipwright at a dock (Tim, 2026-10-15) once
// the Wayfarer holds the Tidemantle, so a capsized sailor can swim. The skiff sails open water (sea, lake, swamp pools
// and shallows), never the blight's toxic water or rivers. It has its own hull: hits taken aboard are shared with it,
// and a hull at zero sinks the skiff, which the Shipwright's crew returns to its home dock.
// Data and pure rules; game.ts calls in from movement, interaction, damage and section loading.
import { hashSeed } from "./random.js?v=icp_c8f3f54297c94902b91b04de_1a8b74fc98f8aa65";

export const BOAT = {
  price: { currency: 120, cinderIron: 2 },
  maxHull: 60,
  speed: 1.4,            // x walking speed
  leaveHold: 3,          // seconds holding Act aboard to leave the skiff (release 158)
  turn: 3.2,             // momentum: how fast velocity follows the stick (per second)
  hullShare: .5,         // share of damage taken aboard that the hull absorbs
  repairCostPerPoint: .5, // marks per hull point, rounded up
  sunkHull: .4,          // a sunk skiff comes back with this share of its hull
  waterKinds: ["ocean", "deepOcean", "lakeWater", "swampWater", "shallows"],
  // Docks (landscape version 3): sections with at least this much open water, about one in `dockEvery`.
  dockMinWater: 40,
  dockEvery: 3,
};
export const SAILABLE_DEEP = ["ocean", "deepOcean", "lakeWater", "swampWater"];
// Wood (release 119; Tim, 2026-10-16): felling a tree yields wood by its size, and enough wood builds a skiff at any
// water's edge, so the Shipwright is no longer the only way to a boat.
export const WOOD = { byForm: { shrub: 1, spindle: 2, canopy: 3 }, skiffCost: 3, reach: 1.6 };
export const woodFor = (tree) => WOOD.byForm[tree?.vegetationForm] ?? WOOD.byForm.spindle;
// Normalised in freshSave/migrateSave (additive at schema 14).
export function ensureWood(save) { save.materials ||= {}; save.materials.wood = Math.max(0, Math.floor(Number(save.materials.wood) || 0)); return save; }
// Death drops the wood you carry (Tim, 2026-10-16). Returns how much was lost.
export function loseWood(save) { const n = Math.max(0, Number(save.materials?.wood) || 0); if (n && save.materials) save.materials.wood = 0; return n; }
export function addWood(save, n) { save.materials ||= {}; save.materials.wood = Math.max(0, Number(save.materials.wood) || 0) + n; return save.materials.wood; }
// Build a skiff on `water` (a sailable deep-water tile next to the Wayfarer) for WOOD.skiffCost wood, and board it.
// Owning a skiff already just means the new one replaces it (one boat at a time).
export function buildSkiff(save, at) {
  const b = ensureBoatState(save), wood = Number(save.materials?.wood) || 0;
  if (save.capabilities?.swim !== true) return { ok: false, message: "You could lash a skiff together, but without the Tidemantle a capsize would drown you." };
  if (wood < WOOD.skiffCost) return { ok: false, message: `A skiff needs ${WOOD.skiffCost} wood (you have ${wood}). Fell trees: shrubs give 1, spindles 2, big trees 3.` };
  save.materials.wood = wood - WOOD.skiffCost;
  Object.assign(b, { owned: true, hull: BOAT.maxHull, aboard: true, moored: null, home: at });
  return { ok: true, message: `You lash ${WOOD.skiffCost} wood into a skiff and push off.${save.materials.wood ? ` ${save.materials.wood} wood left.` : ""}` };
}

export function ensureBoatState(save) {
  const b = save.boat && typeof save.boat === "object" ? save.boat : {};
  const place = (q) => q && Number.isFinite(q.rx) && Number.isFinite(q.ry) && Number.isFinite(q.x) && Number.isFinite(q.y) ? { rx: q.rx, ry: q.ry, x: q.x, y: q.y } : null;
  save.boat = Object.assign(b, { version: 1, owned: b.owned === true, hull: Math.max(0, Math.min(BOAT.maxHull, Number.isFinite(b.hull) ? b.hull : BOAT.maxHull)),
    aboard: b.owned === true && b.aboard === true, moored: place(b.moored), home: place(b.home) });
  return save.boat;
}
export const aboard = (save) => save?.boat?.owned === true && save.boat.aboard === true;
export const sailable = (kind) => BOAT.waterKinds.includes(kind);

// ---------------------------------------------------------------- the Shipwright
export function shipwrightActions(save) {
  const b = ensureBoatState(save);
  if (!b.owned) return ["speak", "buySkiff"];
  const rig = save.worldFlags?.diveRig === true ? [] : ["buyRig"]; // Diving (W5): the Shipwright also sells a dive rig
  return [...(b.hull < BOAT.maxHull ? ["board", "repair"] : ["board"]), ...rig];
}
export function repairCost(save) { return Math.ceil((BOAT.maxHull - ensureBoatState(save).hull) * BOAT.repairCostPerPoint); }
export function buySkiff(save, dock) {
  const b = ensureBoatState(save), p = BOAT.price;
  if (b.owned) return { ok: false, message: "The skiff is already yours." };
  if (save.capabilities?.swim !== true) return { ok: false, message: "Shipwright: “No one sails my hulls who can't swim home. Earn the Tidemantle first.”" };
  if ((save.currency || 0) < p.currency || (save.materials?.cinderIron || 0) < p.cinderIron) return { ok: false, message: `Shipwright: “A skiff costs ${p.currency} marks and ${p.cinderIron} cinder iron for the keel.”` };
  save.currency -= p.currency; save.materials.cinderIron -= p.cinderIron;
  Object.assign(b, { owned: true, hull: BOAT.maxHull, aboard: false, home: dock, moored: dock });
  return { ok: true, message: "The skiff is yours. It waits at the berth: choose Board to sail." };
}
export function repairSkiff(save) {
  const b = ensureBoatState(save), cost = repairCost(save);
  if (!b.owned || cost <= 0) return { ok: false, message: "The hull is sound." };
  if ((save.currency || 0) < cost) return { ok: false, message: `Shipwright: “Patching that hull costs ${cost} marks.”` };
  save.currency -= cost; b.hull = BOAT.maxHull;
  return { ok: true, message: `Hull repaired for ${cost} marks.` };
}
// Boarding puts the Wayfarer on the berth (dock) or the moored skiff. Returns the tile to stand on, or null.
export function board(save, at) {
  const b = ensureBoatState(save);
  if (!b.owned || !at) return null;
  if (b.hull <= 0) return null;
  b.aboard = true; b.moored = null;
  return at;
}
// Stepping ashore moors the skiff where it floats.
export function disembark(save, where) { const b = ensureBoatState(save); b.aboard = false; b.moored = where; }

// Damage taken aboard: the hull absorbs its share. Returns the share the Wayfarer keeps; sinks at zero hull.
export function hullAbsorb(save, damage) {
  const b = ensureBoatState(save);
  if (!b.aboard || !(damage > 0)) return { kept: damage, sunk: false };
  const take = Math.min(b.hull, damage * BOAT.hullShare);
  b.hull = Math.max(0, b.hull - take);
  if (b.hull > 0) return { kept: damage - take, sunk: false };
  b.aboard = false; b.hull = Math.round(BOAT.maxHull * BOAT.sunkHull); b.moored = b.home;
  return { kept: damage - take, sunk: true };
}

// A blow to the hull alone (open-sea hazards, release 152). Returns true when it sinks the skiff.
export function hullStrike(save, n) {
  const b = ensureBoatState(save);
  if (!b.aboard || !(n > 0)) return false;
  b.hull = Math.max(0, b.hull - n);
  if (b.hull > 0) return false;
  b.aboard = false; b.hull = Math.round(BOAT.maxHull * BOAT.sunkHull); b.moored = b.home;
  return true;
}

// One sailing step along one axis. `open(x, y)` says whether a footprint fits on sailable water; `land(x, y)` returns
// the safe ground position to step onto ahead of the bow, or null. Returns "sail", "ashore" or "blocked".
export function sailStep(open, land, x, y) { return open(x, y) ? "sail" : land(x, y) ? "ashore" : "blocked"; }
// Momentum: velocity eases toward the stick.
export function steer(vel, target, dt) { const k = Math.min(1, BOAT.turn * dt); return vel + (target - vel) * k; }

// ---------------------------------------------------------------- docks (landscape version 3)
const idx = (x, y) => y * 32 + x;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// A dock: a Shipwright on a reachable shore tile, a pier of up to two planks into the water, and a berth beyond it.
export function placeDock(map, seed, rx, ry, reach) {
  const water = map.tiles.filter((t) => SAILABLE_DEEP.includes(t.kind)).length;
  if (water < BOAT.dockMinWater || hashSeed(`${seed}:land:dock:${rx}:${ry}`) % BOAT.dockEvery !== 0) return null;
  const deep = (x, y) => x > 1 && y > 1 && x < 30 && y < 30 && SAILABLE_DEEP.includes(map.tiles[idx(x, y)]?.kind);
  let best = null;
  for (const t of map.tiles) {
    if (!reach[idx(t.x, t.y)] || t.blocked || (t.elev || 0) !== 0 || t.x < 3 || t.y < 3 || t.x > 28 || t.y > 28) continue;
    if (map.objects.some((o) => Math.abs(o.x - t.x) + Math.abs(o.y - t.y) < 2)) continue;
    for (const [dx, dy] of N4) {
      if (!deep(t.x + dx, t.y + dy) || !deep(t.x + dx * 2, t.y + dy * 2) || !deep(t.x + dx * 3, t.y + dy * 3)) continue;
      const score = Math.hypot(t.x - 16, t.y - 16) + (hashSeed(`${seed}:land:dock-pick:${t.x}:${t.y}`) % 100) / 1000;
      if (!best || score < best.score) best = { t, dx, dy, score };
    }
  }
  if (!best) return null;
  const { t, dx, dy } = best;
  for (const k of [1, 2]) { const q = map.tiles[idx(t.x + dx * k, t.y + dy * k)]; map.tiles[idx(q.x, q.y)] = { ...q, kind: "dock", blocked: false, elev: 0, pierAxis: dx ? "x" : "y" }; }
  const berth = { x: t.x + dx * 3, y: t.y + dy * 3 };
  const o = { id: `shipwright-${rx}-${ry}`, kind: "shipwright", name: "Shipwright", lore: "Tar, rope and patience. She builds skiffs for those who can swim.", x: t.x, y: t.y, state: "idle", actions: ["speak"], berth, landmark: true };
  map.objects.push(o);
  map.dock = { x: t.x, y: t.y, berth };
  return o;
}
