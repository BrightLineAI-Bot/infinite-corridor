// The Deep (release 677): an endless descent. Tim, 2026-11-01, on the plan: floors harder each time, checkpoints every five
// floors, loot that only improves near your deepest floor, the record of your greatest depth in the journal and the Wayfarer's
// page; "let's not get crossing sigils... We'll just do the embers."
//
// - Deep Shafts: a few sections first seen from this release hold one (`chance`, past `minRing`), named on the Atlas.
// - A floor is a crossing generated afresh from the seed, the shaft and the floor number (`${id}:f${floor}`); only the floor you
//   are on is kept. Fell its guardian and the Deep Stair opens beside it (down to the next floor), and you are given a Return
//   Ember (`emberPerClear`). An Ember Door stands where you arrive on every floor: burning an ember there (or at the cleared
//   floor's return) takes you back up to the shaft. Floor 1's own way in is always open. Die and the run ends, as anywhere.
// - Harder by floor (`perFloor`): +10% health and +6% damage a floor; every `affixEvery` floors more of its creatures carry an
//   affix; guardians carry two from `guardianTwo`.
// - Checkpoints: every `checkpointEvery` floors you have reached, you may start there next time (the shaft offers each).
// - Loot (`loot`): a creature's item is rolled `+1` level per `per` floors (at most `max`), but only on floors within `near` of your
//   deepest floor in that shaft; repeating shallower floors gives ordinary loot. The guardian's expedition cache is paid only the
//   first time a floor is cleared (`payoffOnce`).
// - The record: your deepest floor in any shaft (`save.theDeep.record`), on the Wayfarer's page and in the journal.
// Save: additive at schema 14 (`save.theDeep`: { embers, record, shafts: { [key]: { floor, best } } }).
import { hashSeed } from "./random.js?v=r679-4d93bc15f0b3";

export const THE_DEEP = {
  version: 1,
  chance: .012, minRing: 8, // of sections first seen from now on, past this many sections from the Refuge
  perFloor: { hp: .1, damage: .06 },
  affixEvery: 5, affixShare: .12, affixMaxShare: .6, guardianTwo: 20,
  checkpointEvery: 5,
  emberPerClear: 1,
  loot: { per: 5, max: 10, near: 2 },
  payoffOnce: true,
  recipes: ["hollow", "cistern", "kiln"],
  themes: ["chasm", "lavaBog", "river", "frozen", "boneCrypt", "fungal", "starHive", "geode", "mosaic", "rootwood", "brass", null],
  maxShafts: 64,
  name: "Deep Shaft",
  messages: {
    shaft: "A Deep Shaft drops away here into the dark: an endless descent. Each floor is harder; fell a floor's guardian to go deeper, or burn a Return Ember to come back up.",
    noEmber: "The Ember Door is cold. You have no Return Ember: fell this floor's guardian for one.",
    ember: "You burn a Return Ember. The Deep lets you go, back up to the shaft.",
    stair: "The Deep Stair opens where the guardian fell. A Return Ember warms in your hand.",
  },
};

export const deepIdFor = (seed, rx, ry) => `the-deep:${seed}:${rx}:${ry}`;
export const isDeepId = (id) => String(id || "").startsWith("the-deep:");
export const deepKey = (id) => String(id || "").replace(/^the-deep:[^:]*:/, "");
export function ensureTheDeep(save) {
  const raw = save?.theDeep, n = (v) => { const k = Math.floor(Number(v)); return Number.isFinite(k) && k > 0 ? k : 0; };
  const shafts = {};
  if (raw?.shafts && typeof raw.shafts === "object") for (const [k, r] of Object.entries(raw.shafts).slice(-THE_DEEP.maxShafts)) shafts[k] = { floor: Math.max(1, n(r?.floor)), best: n(r?.best) };
  if (save) save.theDeep = { ...(raw && typeof raw === "object" ? raw : {}), embers: n(raw?.embers), record: n(raw?.record), shafts };
  return save;
}
export function deepShaft(save, id) { ensureTheDeep(save); const k = deepKey(id); return (save.theDeep.shafts[k] ||= { floor: 1, best: 0 }); }

// Does a section first seen now hold a shaft? (rx, ry outside the heartland.)
export const shaftHere = (seed, rx, ry) => Math.abs(rx) + Math.abs(ry) >= THE_DEEP.minRing && (hashSeed(`${seed}:deep-shaft:v1:${rx}:${ry}`) % 100000) / 100000 < THE_DEEP.chance;
// The floors a shaft offers to start from: 1 and every checkpoint reached.
export function startFloors(rec) { const out = [1]; for (let f = THE_DEEP.checkpointEvery; f <= (rec?.best || 0); f += THE_DEEP.checkpointEvery) out.push(f); return out; }
// One floor's crossing: its recipe and environment.
export function floorPlan(seed, id, floor) {
  const h = hashSeed(`${seed}:deep-floor:v1:${id}:${floor}`);
  return { genId: `${id}:f${floor}`, recipe: THE_DEEP.recipes[h % THE_DEEP.recipes.length], theme: THE_DEEP.themes[(h >>> 5) % THE_DEEP.themes.length] };
}
export const floorScale = (floor) => ({ hp: 1 + THE_DEEP.perFloor.hp * (floor - 1), damage: 1 + THE_DEEP.perFloor.damage * (floor - 1) });
export const floorAffixShare = (floor) => Math.min(THE_DEEP.affixMaxShare, Math.floor(floor / THE_DEEP.affixEvery) * THE_DEEP.affixShare);
export const guardianAffixes = (floor) => floor >= THE_DEEP.guardianTwo ? 2 : 1;
// The item level bonus for loot on `floor` of a shaft whose deepest floor is `best`.
export function lootBonus(floor, best) { const L = THE_DEEP.loot; return floor >= (best || 0) - L.near ? Math.min(L.max, Math.floor(floor / L.per)) : 0; }
