// The Skiff (water world W2, docs/water-world-design.md). Bought from a Shipwright at a dock (Tim, 2026-10-15) once
// the Wayfarer holds the Tidemantle, so a capsized sailor can swim. The skiff sails open water (sea, lake, swamp pools
// and shallows), never the blight's toxic water or rivers. It has its own hull: hits taken aboard are shared with it,
// and a hull at zero sinks the skiff, which the Shipwright's crew returns to its home dock.
// Data and pure rules; game.ts calls in from movement, interaction, damage and section loading.
import { hashSeed } from "./random.js?v=r563-404782cd3a8a";

export const BOAT = {
  price: { currency: 120, cinderIron: 2 },
  maxHull: 60,
  speed: 1.4,            // x walking speed
  leaveHold: 3,          // seconds holding Act aboard to leave the skiff (release 158)
  turn: 3.2,             // momentum: how fast velocity follows the stick (per second)
  hullShare: .5,         // share of damage taken aboard that the hull absorbs
  repairCostPerPoint: .5, // marks per hull point, rounded up
  sunkHull: .4,          // a sunk skiff comes back with this share of its hull
  waterKinds: ["ocean", "deepOcean", "lakeWater", "swampWater", "shallows", "seaIce"], // seaIce (release 261): the Mountain Turtle's ice floor; a skiff slides over it
  // Docks (landscape version 3): sections with at least this much open water, about one in `dockEvery`.
  // Hull shields (release 263; Tim: "a boat deployment shield... we can buy them from the boatman... deploy them... last for
  // like 3 minutes"): bought from the Shipwright, deployed from the Pack while aboard; while it holds, the hull takes no
  // damage (hits still share with it, so the Wayfarer keeps only their own share). Deploying again refreshes it.
  // Release 269 makes it a hull guard (Tim: "The hull should take reduced damage... and it has more health"; "a slight
  // damage reduction to the player... five percent"): while it holds, blows to the hull are `hullTaken` as strong, `bonus`
  // extra hull soaks them first (gone when the guard ends), and the Wayfarer keeps `guard` less of their share.
  shield: { price: 40, seconds: 180, guard: .05, hullTaken: .5, bonus: 30 },
  // Repairs with the Build button (release 269; Tim: "break up the hull into thirds... one [wood] would get the boat
  // half health... two woods should get the boat back up to full... I don't want to have to manage the boat too much"):
  // each press costs `wood` and mends `share` of the full hull. Holding Build `shieldHold` s at sea deploys a shield.
  mend: { wood: 1, share: .5, shieldHold: .6 },
  // The submersible (release 311; Tim: "the cinder iron can build... a submersible... your boat will turn into a
  // submersible... you can ride on top of the water or you can go underwater... dip down underwater to... dodge damage...
  // extra health to the boat... the player will just get extra... damage reduction... 5%... an item like the hull repair...
  // its own option to place in the... preset slot"). A frame is forged from `cinderIron` and carried as
  // save.consumables.submersible; fitted aboard, the skiff becomes a submersible until it sinks: `hull` more hull in its own
  // bar (eaten first), `guard` less damage to the Wayfarer aboard, and a dodge aboard is a dive of `dive` s, untouchable.
  // Fitting another frame refills the bar. Dive buoys take a submersible down without a rig or lens.
  sub: { cinderIron: 3, hull: 40, guard: .05, dive: 1.1 },
  pushOff: .6,           // release 263: a skiff built at the shore pushes off at this share of sailing speed
  dockMinWater: 40,
  dockEvery: 3,
};
export const SAILABLE_DEEP = ["ocean", "deepOcean", "lakeWater", "swampWater"];
// Wood (release 119; Tim, 2026-10-16): felling a tree yields wood by its size, and enough wood builds a skiff at any
// water's edge, so the Shipwright is no longer the only way to a boat.
// carry: the most wood the Wayfarer carries (release 259 set 6; release 261, Tim: "we should do 99 wood... you can build as
// many boats as you want... the limit... is how much you want to farm").
export const WOOD = { byForm: { shrub: 1, spindle: 2, canopy: 3 }, skiffCost: 3, reach: 1.6, carry: 99 };
export const woodFor = (tree) => WOOD.byForm[tree?.vegetationForm] ?? WOOD.byForm.spindle;
// Normalised in freshSave/migrateSave (additive at schema 14).
export function ensureWood(save) { save.materials ||= {}; save.materials.wood = Math.max(0, Math.floor(Number(save.materials.wood) || 0)); return save; }
// Death drops the wood you carry (Tim, 2026-10-16). Returns how much was lost.
export function loseWood(save) { const n = Math.max(0, Number(save.materials?.wood) || 0); if (n && save.materials) save.materials.wood = 0; return n; }
// Adds up to the carry limit; wood already held over it (an older save) is kept, never taken away.
export function addWood(save, n) { save.materials ||= {}; const have = Math.max(0, Number(save.materials.wood) || 0); save.materials.wood = have >= WOOD.carry ? have : Math.min(WOOD.carry, have + n); return save.materials.wood; }
// Build a skiff on `water` (a sailable deep-water tile next to the Wayfarer) for WOOD.skiffCost wood, and board it.
// Owning a skiff already just means the new one replaces it (one boat at a time).
export const canBuildSkiff = (save) => save?.capabilities?.swim === true && (Number(save.materials?.wood) || 0) >= WOOD.skiffCost;
export function buildSkiff(save, at) {
  const b = ensureBoatState(save), wood = Number(save.materials?.wood) || 0;
  if (save.capabilities?.swim !== true) return { ok: false, message: "You could lash a skiff together, but without the Tidemantle a capsize would drown you." };
  if (wood < WOOD.skiffCost) return { ok: false, message: `A skiff needs ${WOOD.skiffCost} wood (you have ${wood}). Fell trees: shrubs give 1, spindles 2, big trees 3.` };
  save.materials.wood = wood - WOOD.skiffCost;
  // Release 261 (Tim: "I can have up to 2 boats at a time... I'll just make a boat, and one of them will despawn"): a
  // skiff left moored becomes the spare; an older spare is gone.
  if (b.owned && !b.aboard && b.moored) b.spare = { ...b.moored, hull: b.hull, ...(b.sub ? { sub: true, subHull: b.subHull || 0 } : {}) }; // release 311: a submersible stays one
  Object.assign(b, { owned: true, hull: BOAT.maxHull, aboard: true, moored: null, home: at, sub: false, subHull: 0 });
  return { ok: true, message: `You lash ${WOOD.skiffCost} wood into a skiff and push off.${save.materials.wood ? ` ${save.materials.wood} wood left.` : ""}` };
}

export function ensureBoatState(save) {
  const b = save.boat && typeof save.boat === "object" ? save.boat : {};
  const place = (q) => q && Number.isFinite(q.rx) && Number.isFinite(q.ry) && Number.isFinite(q.x) && Number.isFinite(q.y) ? { rx: q.rx, ry: q.ry, x: q.x, y: q.y } : null;
  save.boat = Object.assign(b, { version: 1, owned: b.owned === true, hull: Math.max(0, Math.min(BOAT.maxHull, Number.isFinite(b.hull) ? b.hull : BOAT.maxHull)),
    aboard: b.owned === true && b.aboard === true, moored: place(b.moored), home: place(b.home) });
  // Release 261: a second, spare skiff moored elsewhere (additive at schema 14): { rx, ry, x, y, hull }.
  // Release 263: seconds left on a deployed hull shield (additive). Shields carried are save.consumables.hullShield,
  // read as a count (missing or bad = 0) and written only when one is bought.
  save.boat.shield = Math.max(0, Math.min(BOAT.shield.seconds, Number.isFinite(Number(b.shield)) ? Number(b.shield) : 0));
  // Release 269: the guard's extra hull (additive; only while the guard holds).
  save.boat.guardHull = save.boat.shield > 0 ? Math.max(0, Math.min(BOAT.shield.bonus, Number(b.guardHull) || 0)) : 0;
  // Release 311: the submersible (additive): `sub` true while the skiff in use is fitted; `subHull` its own bar.
  save.boat.sub = b.owned === true && b.sub === true; save.boat.mechSub = save.boat.aboard && b.mechSub === true; /* release 557 */ save.boat.subHull = save.boat.sub ? Math.max(0, Math.min(BOAT.sub.hull, Number(b.subHull) || 0)) : 0;
  const spare = b.owned === true && place(b.spare); save.boat.spare = spare ? { ...spare, hull: Math.max(0, Math.min(BOAT.maxHull, Number.isFinite(b.spare.hull) ? b.spare.hull : BOAT.maxHull)), ...(b.spare.sub === true ? { sub: true, subHull: Math.max(0, Math.min(BOAT.sub.hull, Number(b.spare.subHull) || 0)) } : {}) } : null;
  return save.boat;
}
// Boarding the spare: it becomes the skiff in use, and the one left moored (if any) becomes the spare.
export function takeSpare(save) {
  const b = ensureBoatState(save), s = b.spare; if (!s) return false;
  b.spare = b.moored && !b.aboard ? { ...b.moored, hull: b.hull, ...(b.sub ? { sub: true, subHull: b.subHull || 0 } : {}) } : null;
  b.moored = { rx: s.rx, ry: s.ry, x: s.x, y: s.y }; b.hull = s.hull; b.aboard = false; b.sub = s.sub === true; b.subHull = b.sub ? Math.max(0, Math.min(BOAT.sub.hull, Number(s.subHull) || 0)) : 0;
  return true;
}
// One press of Build on a damaged skiff: 1 wood mends half the hull. Returns { ok, message }.
export function mendSkiff(save) {
  const b = ensureBoatState(save), wood = Number(save.materials?.wood) || 0;
  if (!b.owned || b.hull >= BOAT.maxHull) return { ok: false, message: "The hull is sound." };
  if (wood < BOAT.mend.wood) return { ok: false, message: `Patching the hull takes ${BOAT.mend.wood} wood.` };
  save.materials.wood = wood - BOAT.mend.wood; b.hull = Math.min(BOAT.maxHull, b.hull + BOAT.maxHull * BOAT.mend.share);
  return { ok: true, message: b.hull >= BOAT.maxHull ? "The hull is whole again." : `Hull patched: ${Math.round(b.hull)}/${BOAT.maxHull}.` };
}
export const subsCarried = (save) => Math.max(0, Math.floor(Number(save?.consumables?.submersible) || 0));
// Release 557: the robot is the submersible frame ashore, so a robot that walks out to sea takes the skiff as a
// submersible for the voyage (save.boat.mechSub, cleared on stepping ashore) even when no frame is fitted to it.
export const submersible = (save) => save?.boat?.owned === true && (save.boat.sub === true || (save.boat.aboard === true && save.boat.mechSub === true));
export function forgeSubmersible(save) {
  const iron = Number(save.materials?.cinderIron) || 0;
  if (iron < BOAT.sub.cinderIron) return { ok: false, message: `A submersible frame takes ${BOAT.sub.cinderIron} cinder iron (you have ${iron}).` };
  save.materials.cinderIron = iron - BOAT.sub.cinderIron; save.consumables ||= {}; save.consumables.submersible = subsCarried(save) + 1;
  return { ok: true, message: `Submersible frame forged (${save.consumables.submersible} carried). Fit it aboard your skiff.` };
}
export function fitSubmersible(save) {
  const b = ensureBoatState(save);
  if (!(subsCarried(save) > 0)) return { ok: false, message: "You carry no submersible frame. Forge one from cinder iron in Supplies." };
  if (!b.aboard) return { ok: false, message: "Fit the submersible frame aboard your skiff." };
  if (b.sub && b.subHull >= BOAT.sub.hull) return { ok: false, message: "The submersible is already whole." };
  save.consumables.submersible = subsCarried(save) - 1; const was = b.sub; b.sub = true; b.subHull = BOAT.sub.hull;
  return { ok: true, message: was ? "Fresh plating bolted on: the submersible's hull is whole again." : "Silver plates close over the skiff, a great window at its prow. It is a submersible now: Dodge to dive." };
}
export const shieldsCarried = (save) => Math.max(0, Math.floor(Number(save?.consumables?.hullShield) || 0));
export const shielded = (save) => (Number(save?.boat?.shield) || 0) > 0;
export function buyHullShield(save) {
  const b = ensureBoatState(save), price = BOAT.shield.price;
  if (!b.owned) return { ok: false, message: "Shipwright: “A hull shield is no use without a hull. Buy a skiff first.”" };
  if ((save.currency || 0) < price) return { ok: false, message: `Shipwright: “A hull shield costs ${price} marks.”` };
  save.consumables ||= {}; save.currency -= price; save.consumables.hullShield = shieldsCarried(save) + 1;
  return { ok: true, message: `Hull shield bought (${save.consumables.hullShield} carried). Deploy it from the Pack while aboard; it holds ${BOAT.shield.seconds / 60} minutes.` };
}
export function deployHullShield(save) {
  const b = ensureBoatState(save);
  if (!(shieldsCarried(save) > 0)) return { ok: false, message: "You carry no hull shield. The Shipwright sells them." };
  if (!b.aboard) return { ok: false, message: "Deploy a hull shield aboard your skiff." };
  save.consumables.hullShield = shieldsCarried(save) - 1; b.shield = BOAT.shield.seconds; b.guardHull = BOAT.shield.bonus;
  return { ok: true, message: `The skiff rises into a longboat under sail: for ${BOAT.shield.seconds / 60} minutes the hull takes half damage, with ${BOAT.shield.bonus} more to give.` };
}
export function tickHullShield(save, dt) { const b = save?.boat; if (b && b.shield > 0 && dt > 0) { b.shield = Math.max(0, b.shield - dt); if (!b.shield) b.guardHull = 0; } }
// Takes `n` from the hull: under the guard, a reduced blow, the guard's extra hull first. Returns true at zero hull.
// Release 269 (Tim: "it'll get like a shield bar... when it takes damage that bar... gets eaten into... when that bar
// finally gets destroyed... you go back to the smaller wooden ship... it'll just run out after 3 minutes"): emptying
// the guard's bar ends the guard.
function wearHull(save, n) {
  const b = save.boat; if (b.sub && b.subHull > 0) { const g = Math.min(b.subHull, n); b.subHull -= g; n -= g; } // release 311: the submersible's plating first
  if (shielded(save)) { n *= BOAT.shield.hullTaken; const g = Math.min(b.guardHull || 0, n); b.guardHull = (b.guardHull || 0) - g; n -= g; if (b.guardHull <= 0) { b.guardHull = 0; b.shield = 0; } }
  b.hull = Math.max(0, b.hull - n); return b.hull <= 0;
}
export const aboard = (save) => save?.boat?.owned === true && save.boat.aboard === true;
export const sailable = (kind) => BOAT.waterKinds.includes(kind);

// ---------------------------------------------------------------- the Shipwright
export function shipwrightActions(save) {
  const b = ensureBoatState(save);
  if (!b.owned) return ["speak", "buySkiff"];
  const rig = save.worldFlags?.diveRig === true ? [] : ["buyRig"]; // Diving (W5): the Shipwright also sells a dive rig
  return [...(b.hull < BOAT.maxHull ? ["board", "repair"] : ["board"]), "buyShield", ...rig];
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
export function disembark(save, where) { const b = ensureBoatState(save); b.aboard = false; b.moored = where; b.mechSub = false; }

// Damage taken aboard: the hull absorbs its share. Returns the share the Wayfarer keeps; sinks at zero hull.
export function hullAbsorb(save, damage) {
  const b = ensureBoatState(save);
  if (!b.aboard || !(damage > 0)) return { kept: damage, sunk: false };
  const guarded = shielded(save), take = Math.min(b.hull + (b.sub ? b.subHull || 0 : 0) + (guarded ? (b.guardHull || 0) / BOAT.shield.hullTaken : 0), damage * BOAT.hullShare), kept = (damage - take) * (guarded ? 1 - BOAT.shield.guard : 1) * (b.sub ? 1 - BOAT.sub.guard : 1); // release 311: the submersible guards 5% too
  if (!wearHull(save, take)) return { kept, sunk: false }; // release 269: the guard halves the hull's wear and keeps 5% off the Wayfarer's share
  b.aboard = false; b.hull = Math.round(BOAT.maxHull * BOAT.sunkHull); b.moored = b.home; b.shield = 0; b.guardHull = 0; b.sub = false; b.subHull = 0; // a sunk submersible comes back a plain skiff
  return { kept, sunk: true };
}

// A blow to the hull alone (open-sea hazards, release 152). Returns true when it sinks the skiff.
export function hullStrike(save, n) {
  const b = ensureBoatState(save);
  if (!b.aboard || !(n > 0)) return false;
  if (!wearHull(save, n)) return false;
  b.aboard = false; b.hull = Math.round(BOAT.maxHull * BOAT.sunkHull); b.moored = b.home; b.shield = 0; b.guardHull = 0; b.sub = false; b.subHull = 0;
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
