// The Deep (release 677): an endless descent. Tim, 2026-11-01, on the plan: floors harder each time, checkpoints every five
// floors, loot that only improves near your deepest floor, the record of your greatest depth in the journal and the Wayfarer's
// page; "let's not get crossing sigils... We'll just do the embers."
//
// - Deep Shafts: a few sections first seen from this release hold one (`chance`, past `minRing`), named on the Atlas. A Listener's
//   Mouth whose Listener has fallen opens one too (the Listener's Descent, beside the Mouth; any explored ground, old or new).
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
import { hashSeed } from "./random.js?v=r1093-e998a7074c45";

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
  mouthName: "The Listener's Descent", // beside a Mouth whose Listener fell (game.ts raiseMouthTown)
  messages: {
    shaft: "A Deep Shaft drops away here into the dark: an endless descent. Each floor is harder; fell a floor's guardian to go deeper, or burn a Return Ember to come back up.",
    noEmber: "The Ember Door is cold. You have no Return Ember: fell this floor's guardian for one.",
    ember: "You burn a Return Ember. The Deep lets you go, back up to the shaft.",
    stair: "The Deep Stair opens where the guardian fell. A Return Ember warms in your hand.",
    mouth: "With its Listener gone, the Mouth goes on down: the Listener's Descent, the Array's own endless Deep. Each floor is harder; fell a floor's guardian to go deeper, or burn a Return Ember to come back up.",
  },
};

// The generation of a Deep floor (Unreleased; Tim's log). A floor is generated afresh on each visit, and only the floor you stand on
// is kept (its dungeon history, wiped by game.ts resetDeepFloor on every floor change), so the version is pinned on that history
// (`deepGen`) when the floor is entered (enterDeep, descendDeep). A floor entered before keeps generation 1 until it is left.
// Generation 2: Watcher's daises on every floor (underlands.ts warpAny); the guardian's species rolled per floor (not once per
// shaft); and the Fractured mode's seal kept per floor (game.ts fractureAreaKey).
// Generation 3 (Unreleased; Tim's log at about floor 50: "if you're in the depths, it should spawn all of these types of dungeons, maybe
// not the Threefold dungeons, but those other different special creature dungeons"): a share of floors are lairs (DEEP_SPECIALS),
// rolled per floor, more often the deeper the floor. A floor that is not a lair is generated exactly as at generation 2.
// Generation 4 (Unreleased; Tim, 2026-11-19: more Deep lairs): four more lair beasts (DEEP_SPECIALS rows with `gen: 4`). The floor's
// generation 3 roll is made first, unchanged; then a second hashed roll gives the floor to one of the new lairs at the new rows'
// share of all the weight. A generation 4 floor that the second roll does not take is the generation 3 floor exactly.
export const DEEP_FLOOR_GEN = { version: 4 };
export const deepFloorGen = (history) => Math.max(1, Math.floor(Number(history?.deepGen) || 1));
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

// ------------------------------------------------------------------------------------------------ lairs (DEEP_FLOOR_GEN 3, 4)
// The special creature floors of the Deep: every creature dungeon the game has, save the Threefold (Tim) and the Gate Revenant horde
// (it follows you out across the land, locks a piece of the Far Gate and drops Crossing Sigils, none of which the Deep has):
// - poisonCrypt: the Poison Crypt (underlands.ts MIRE_CRYPT): the Mire Heart (the Morphing Blob) in its lair, seeplings from the pools.
// - psychicCrystal: an Underground River floor (its water is what the Crystal haunts in a dungeon) held by the Psychic Crystal.
// - tremorWorm: a Lava Bog floor held by the Tremor Worm (its own burrowing moves: it travels under the floor, surfaces on open ground).
// - voidWalker: a Geode Hollow floor held by the Void Walker (as in the Stillworks, its Supernova burns but never scars the floor).
// - wildStego, spinoRex: the big-room beasts of the great buildings, on a Rootbound Deep and a Fungal Hollow floor.
// From DEEP_FLOOR_GEN 4 (`gen: 4`; Tim, 2026-11-19), the world beasts' kin, each with its own moves (no new AI):
// - mountainTurtle: a Frozen Deep floor (its comets and dash leave frost and fire as effects only; the sea ice is the overworld's).
// - briarStag: a Rootbound floor (its brambles, roots, groves and mire are effects; game.ts containDeepLair sets it back on open
//   ground should its leap's shadow, which follows you through stone, come down inside it).
// - ashenMoth: a Lava Bog floor (its dive stops where its lane ends; no chrysalis, which only the great trees hang).
// - astralWorm: a Star Hive floor (its ink, rings and mirages are its own bounded state; as kin it never makes for a Wayglass).
// Not lairs, by Tim's word (2026-11-19): the Lightning Giant, the Nanobot Knight, the Crimson Tyrant and the Doom Chaser.
// `contain`: set back on open ground should it come down in rock (game.ts containDeepLair). `noEcho`: its fall leaves no Echo (Tim, 2026-11-19: the lair pays the floor's guardian cache only; game.ts defeatEnemy).
// Each lair beast is the floor's guardian (its spawn, its place and its role: felling it opens the Deep Stair). It is the beast's kin,
// not the roaming hunt (no tries, retreat, bounty or Echo), tuned to the Wayfarer as the world beasts are, times `lair` by floor
// (game.ts tuneDeepLair) in place of the floor's own +hp/+damage, and it carries no affix or boss kit.
// `chance`: [floor, share of floors that are lairs], straight between the points, the last held beyond. `weight`: each row's share.
// `pool`: for the Crystal, how many walls by its place seep into water on the rare river floor whose channel found no open ground.
export const DEEP_SPECIALS = {
  version: 1, // the roll's hash namespace
  chance: [[1, .1], [10, .2], [25, .3], [50, .42], [100, .55]],
  rows: [
    { id: "poisonCrypt", noEcho: true, weight: 3, theme: "poisonCrypt", beast: "morphingBlob", heart: true, name: "The Mire Heart", lore: "The floor sinks into a green mire. Something in its pools is all one thing, and it is gathering itself." },
    { id: "psychicCrystal", noEcho: true, weight: 3, theme: "river", beast: "psychicCrystal", pool: 6, name: "The Psychic Crystal", lore: "A black river runs through this floor, and a pale light drifts over it. The Psychic Crystal haunts this water." },
    { id: "tremorWorm", noEcho: true, weight: 3, theme: "lavaBog", beast: "tremorWorm", name: "The Tremor Worm", lore: "The ash crust shivers under your feet. Something long is swimming through the stone below: the Tremor Worm." },
    { id: "voidWalker", noEcho: true, weight: 2, theme: "geode", beast: "voidWalker", name: "The Void Walker", lore: "The light here bends toward a point that is not there. The Void Walker keeps this floor." },
    { id: "wildStego", noEcho: true, weight: 2, theme: "rootwood", beast: "wildStego", name: "The Wild Stegosaurus", lore: "Roots, plates and a low, slow breathing. The Wild Stegosaurus has made this floor its own." },
    { id: "spinoRex", noEcho: true, weight: 2, theme: "fungal", beast: "spinoRex", name: "The Spinosaurus", lore: "Under the glowing caps the air smells of blood. The Spinosaurus hunts this floor." },
    { id: "mountainTurtle", gen: 4, noEcho: true, contain: true, weight: 2, theme: "frozen", beast: "mountainTurtle", name: "The Mountain Turtle", lore: "Frost furs the walls, and the floor trembles to slow, enormous steps. The Mountain Turtle has walked down even here." },
    { id: "briarStag", gen: 4, noEcho: true, contain: true, weight: 2, theme: "rootwood", beast: "briarStag", name: "The Briar Stag", lore: "Brambles have grown through the stone, and somewhere among the roots an antlered crown is burning. The Briar Stag ruts on this floor." },
    { id: "ashenMoth", gen: 4, noEcho: true, contain: true, weight: 2, theme: "lavaBog", beast: "ashenMoth", name: "The Ashen Moth", lore: "Grey ash drifts up from the cracks like snow falling the wrong way. Two embers watch you from above: the Ashen Moth." },
    { id: "astralWorm", gen: 4, noEcho: true, weight: 2, theme: "starHive", beast: "astralWorm", name: "The Astral Worm", lore: "The dark between the cells is deeper than it should be, and it moves. The Astral Worm is unfolding on this floor." },
  ],
  // The lair beast's factors on the world beast's vitals (pentagon-arena.ts pentagonArenaVitals): `at1` on floor 1, `perFloor` more for
  // each floor below it, at most `max`.
  lair: { hp: { at1: .8, perFloor: .025, max: 3 }, damage: { at1: .9, perFloor: .012, max: 2 } },
  containReach: 4, // tiles game.ts containDeepLair looks for open ground round a `contain` beast that came down in rock
};
// The share of floors that are lairs at `floor`.
export function specialChance(floor) {
  const C = DEEP_SPECIALS.chance, f = Math.max(1, Number(floor) || 1);
  if (f <= C[0][0]) return C[0][1];
  for (let i = 1; i < C.length; i++) if (f <= C[i][0]) { const [a, p] = C[i - 1], [b, q] = C[i]; return p + (q - p) * (f - a) / (b - a); }
  return C[C.length - 1][1];
}
// The rows a floor of generation `gen` may roll from (a row arrives at its `gen`, 3 if none).
const rowGen = (r) => Number(r.gen) || 3;
const pickRow = (rows, h) => { const total = rows.reduce((n, r) => n + r.weight, 0); let k = h % total; for (const r of rows) { if (k < r.weight) return r; k -= r.weight; } return null; };
// The lair of a floor (a DEEP_SPECIALS row), or null: from generation 3 on, fixed per seed, shaft and floor. Generation 3's roll over
// its own rows is made exactly as before; each later generation that added rows then takes the floor for one of them at their share
// of the weight so far (a second hash), else leaves the earlier answer as it was.
export function floorSpecial(seed, id, floor, gen = DEEP_FLOOR_GEN.version) {
  if (!(gen >= 3)) return null;
  const S = DEEP_SPECIALS, h = hashSeed(`${seed}:deep-special:v${S.version}:${id}:${floor}`);
  if ((h % 10000) / 10000 >= specialChance(floor)) return null;
  let row = pickRow(S.rows.filter((r) => rowGen(r) === 3), hashSeed(`${seed}:deep-special-row:v${S.version}:${id}:${floor}`));
  for (let g = 4; g <= gen; g++) {
    const added = S.rows.filter((r) => rowGen(r) === g); if (!added.length) continue;
    const have = S.rows.reduce((n, r) => n + (rowGen(r) < g ? r.weight : 0), 0), more = added.reduce((n, r) => n + r.weight, 0);
    if ((hashSeed(`${seed}:deep-special-gen:v${S.version}:${g}:${id}:${floor}`) % 10000) / 10000 < more / (have + more)) row = pickRow(added, hashSeed(`${seed}:deep-special-row:v${S.version}:${g}:${id}:${floor}`));
  }
  return row;
}
export const deepSpecialRow = (id) => DEEP_SPECIALS.rows.find((r) => r.id === id) || null;
// The lair beast's factors on `floor`.
export function lairScale(floor) {
  const L = DEEP_SPECIALS.lair, f = Math.max(1, Number(floor) || 1), at = (q) => Math.min(q.max, q.at1 + q.perFloor * (f - 1));
  return { hp: at(L.hp), damage: at(L.damage) };
}
