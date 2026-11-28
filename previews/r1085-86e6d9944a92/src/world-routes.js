// Milestones, the Reliquary and pity (docs/progression-design.md revision 3, Phase 6: sections 2.2 routes c and R, 2.5 G3, 2.7,
// 3, 6 and 7 row 6; Tim, 2026-11-20). Pure data and rules; imports only random.ts and journey-start.ts, so constellation.ts may
// read it. world-finds.ts grants what these rules decide, and game.ts counts the deeds.
//
// What Exploration withholds (WORLD_WITHHELD): exactly the abilities whose Exploration route is a milestone (c) or a reliquary
// (R), on a journey reading progression table 3 or later (journey-start.ts EXPLORATION.table). Each stays shut until it is
// earned (save.feats.earned) or kept (save.progression.kept: a switch, a journey's first load under table 3, or the start); a kept
// or earned ability is honoured in either mode for good. Everything still routed to Phases 7-8 (quests, threads, Viscera) stays
// open by today's rules. Classic withholds nothing: there milestones and reliquaries are extra routes, and a reward Classic
// already gives pays a small consolation instead (section 6).
//
// Milestones (route c): counters of deeds the game already has, whole numbers in save.feats.counts (one is read from the save:
// world beasts slain, from save.worldBeasts). A threshold grants its ability once; it is shown (Journal Leads, a hint) from its
// first count. Thresholds are data, set so each comes from playing the matching build.
//
// The Reliquary (route R): a reliquary is laid over the completion room (an object in save.feats.reliquary.sites, laid as the area
// loads, never a generator change), and opening it gives the next ability of the journey's seeded pool of 8 (its order: a hash of
// the seed and RELIQUARY.stream). Certain: the first Revenant horde cleared (a taste horde counts), the first Pentagon heart (the
// Regent's fall), the first seed-realm heart, the first Shell-Labyrinth vault. One in ten (a seeded roll per site): any other Deep
// floor's first clear, a Deep crossing cleared, a labyrinth vault (a Shell-Labyrinth's after the first), a Great Keep's crown
// cache, a Great Castle's treasure. No ability waits only behind more than one horde: the pool is one order, whatever the find.
//
// Pity (G3): a lead, never an ability. After PITY.sections new sections explored with nothing gained, the next rumour is a strong
// one (world-finds.ts pityLead): a directed lead to the nearest place that holds a world ability within PITY.radius sections.
import { hashSeed, rng } from "./random.js?v=r1085-86e6d9944a92";
import { exploring, progressionKept, ensureFeats, FEAT_RECORD } from "./journey-start.js?v=r1085-86e6d9944a92";
import { storyWithheld } from "./quests.js?v=r1085-86e6d9944a92"; // Phase 7: the quest (b) and thread (d) abilities built then

// ---------------------------------------------------------------- milestones (route c): design section 3
//   key      the counter (save.feats.counts), or `derived` (read from the save)
//   ability  the progression.ts row id it grants
//   need     the threshold
//   name     the deed, as the count line and the Journal say it
export const MILESTONES = Object.freeze([
  { key: "airCasts", ability: "casting-wind", need: 30, name: "Spells cast while gliding or air-walking" },
  { key: "burnsSurvived", ability: "ember-skin:alt", need: 20, name: "Set burning, and lived" },
  { key: "summitSkyways", ability: "quickening:alt", need: 1, name: "Cloud Hold summit skyways crossed to the far crown" },
  { key: "dives", ability: "mirror-veil:alt", need: 10, name: "Dives cleared" },
  { key: "worldBeasts", ability: "resonant-force:alt", need: 10, name: "World beasts slain", derived: true },
  { key: "deepFloors", ability: "anchor:alt", need: 10, name: "Deep floors cleared" },
  { key: "glideTiles", ability: "field:drift-field", need: 1000, name: "Tiles glided" },
  { key: "beatKills", ability: "field:ki-blast", need: 15, name: "Foes felled by the Iron Fists on the beat" },
  { key: "magmaKills", ability: "field:lava-slash", need: 30, name: "Foes felled on molten ground" },
  { key: "chargedReleases", ability: "field:rapid-reload", need: 200, name: "Charged releases landed" },
].map((m) => Object.freeze(m)));
// What the two fire milestones count (every offered goal can be completed). Before, a burn was only the Briar Stag's burning grove,
// and a magma kill only a kill in the Magma Rivers (landscape version 27, 52 or more sections out: a 60-hour run never reached
// them). The counts are unchanged; every equivalent source now counts.
//   BURNS: a burn is any fire that lands on the Wayfarer: a blow, a breath, a pool or trail of flame or lava (`sources`, and any
//          creature attack tagged `tag` in monster-pack.ts ATTACK_MODULES), the elite Volcanic affix's burning ground (`affix`),
//          a lava footing's heat under a mount or a suit, or being set alight. Lived through: no fire for `quiet` s, still standing,
//          counts one (however many blows the one burn took).
//   MOLTEN: a foe felled on molten ground: the Magma Rivers and the Firelands (`landscapes`), any tile of lava or magma
//          (`kinds`, a tile's `magma` or `volcanic` mark), or within `near` tiles of one, in the overworld or any crossing.
export const BURNS = Object.freeze({ tag: "fire", affix: "volcanic", quiet: 3,
  sources: Object.freeze(["burnTree", "burnTreeBlast", "lavaBomb", "ember", "wormLava", "flameTrail", "gateFireball", "gateBreath", "dragonScorch", "dragonFlameWave", "dragonMeteor", "dragonBlast", "doomTarFire", "lampFlare", "lava"]) });
export const MOLTEN = Object.freeze({ landscapes: Object.freeze(["magma", "volcanic"]), kinds: Object.freeze(["lava"]), near: 1 });
// Whether tile `t` is molten ground (MOLTEN).
export const moltenTile = (t) => !!t && (MOLTEN.landscapes.includes(t.landscape) || MOLTEN.kinds.includes(t.kind) || !!t.magma || t.volcanic === true || t.environment === "lava");
// Whether a fire source landed (BURNS): `source` a hurt's source id, `tags` its attack module's tags.
export const burnSource = (source, tags = []) => !!source && (BURNS.sources.includes(source) || (Array.isArray(tags) && tags.includes(BURNS.tag)));
export const MILESTONE_BY_KEY = Object.freeze(Object.fromEntries(MILESTONES.map((m) => [m.key, m])));
export const MILESTONE_FOR = Object.freeze(Object.fromEntries(MILESTONES.map((m) => [m.ability, m])));

// ---------------------------------------------------------------- the Reliquary (route R): design sections 2.2 and 3
export const RELIQUARY = Object.freeze({
  version: 1,
  stream: "progression:v3:reliquary", // the pool's order: hash(seed : progression : v3 : reliquary : id)
  pool: Object.freeze(["cinder-heart:alt", "slipstream:alt", "sanctuary:alt", "rift-wake:alt", "field:shatterpoint", "field:cluster-shell", "field:lumen-sunburst", "field:nanoknives"]),
  certain: Object.freeze(["horde", "pentagon", "seedRealm", "shellVault"]), // the first of each kind is certain
  chance: Object.freeze({ deep: .1, labyrinth: .1, keep: .1, castle: .1 }), // any other end: a seeded roll per site
  later: Object.freeze({ shellVault: "labyrinth" }), // after the first, a Shell-Labyrinth's vault is a labyrinth vault
  consolation: Object.freeze({ dust: 3 }), // lumen dust, when what it would have taught is already yours (section 6)
  near: 3, // the reliquary is laid on open floor within this many tiles of where the end came
  places: Object.freeze({ horde: "the crossing where the horde broke", pentagon: "the Pentagon's heart", seedRealm: "a seed realm's heart", shellVault: "the Shell-Labyrinth's vault",
    deep: "the bottom of the Deep", labyrinth: "a labyrinth's vault", keep: "a Great Keep's crown", castle: "a Great Castle's treasure room" }),
  name: "Reliquary",
});
// ---------------------------------------------------------------- pity (G3) and the horde rumour (2.7)
// Every offered goal can be completed (2026-11-25): the searches look farther (pity 15 → 40, the horde rumour 24 → 48 sections), so a
// lead names a horde or a shaft that waits anywhere within a reasonable walk, not only close by; how often either exists is unchanged.
export const PITY = Object.freeze({ sections: 200, radius: 40, floors: 20 }); // floors: how deep a shaft's strong lead looks for its reliquary
export const HORDE_RUMOUR = Object.freeze({ tier: 12, radius: 48 }); // from Infinite II: the nearest unentered horde crossing

// Exactly the c and R abilities (progression.ts rows whose Exploration route is c or R; a test holds the two together).
export const WORLD_WITHHELD = Object.freeze([...MILESTONES.map((m) => m.ability), ...RELIQUARY.pool]);
export const WORLD_ROUTE_OF = Object.freeze(Object.fromEntries(WORLD_WITHHELD.map((id) => [id, MILESTONE_FOR[id] ? "c" : "R"])));

export const earnedWorld = (save, id) => !!save?.feats?.earned && Object.prototype.hasOwnProperty.call(save.feats.earned, id);
// Shut on this journey: Exploration (table 3 on), one of the c and R abilities, neither kept nor earned. From Phase 7 (table 4) also
// the b and d abilities whose quest or thread is built (quests.ts storyWithheld), so the Arcanum refuses them the same way.
export const worldWithheld = (save, id) => (WORLD_WITHHELD.includes(id) && exploring(save) && !progressionKept(save, id) && !earnedWorld(save, id)) || storyWithheld(save, id);
// A secondary form found (kept or earned): its switch works once its node is learned, before Infinite III too.
export const formFound = (save, nodeId) => progressionKept(save, `${nodeId}:alt`) || earnedWorld(save, `${nodeId}:alt`);
export const formWithheld = (save, nodeId) => worldWithheld(save, `${nodeId}:alt`);

// ---------------------------------------------------------------- counting
const whole = (v) => Math.max(0, Math.floor(Number(v) || 0));
export function featCount(save, key) {
  const m = MILESTONE_BY_KEY[key]; if (!m) return 0;
  if (key === "worldBeasts") { let n = 0; for (const b of Object.values(save?.worldBeasts && typeof save.worldBeasts === "object" ? save.worldBeasts : {})) n += whole(b?.slain); return n; }
  return whole(save?.feats?.counts?.[key]);
}
const record = (save) => (save?.feats?.counts && save.feats.reliquary?.sites ? save.feats : ensureFeats(save)); // normalised once, then kept
// Adds `n` to a counter (a derived one is only read). Returns the milestones it has now reached and not yet earned.
export function addCount(save, key, n = 1) {
  const m = MILESTONE_BY_KEY[key]; if (!m || !save) return [];
  const f = record(save);
  if (!m.derived && n > 0) f.counts[key] = Math.min(FEAT_RECORD.countMax, whole(f.counts[key]) + whole(n));
  return MILESTONES.filter((q) => q.key === key && featCount(save, key) >= q.need && !earnedWorld(save, q.ability));
}
// "Charged releases landed: 40 of 200".
export const milestoneLine = (m, n) => `${m.name}: ${Math.min(n, m.need).toLocaleString("en-US")} of ${m.need.toLocaleString("en-US")}`;
// The milestones under way (counted, not yet earned), for the Journal's Leads: [{ key, ability, line, n, need }].
export function milestonesUnderWay(save) {
  return MILESTONES.filter((m) => !earnedWorld(save, m.ability)).map((m) => ({ m, n: featCount(save, m.key) })).filter((q) => q.n > 0)
    .map(({ m, n }) => ({ key: m.key, ability: m.ability, n, need: m.need, line: milestoneLine(m, n) }));
}

// ---------------------------------------------------------------- the pool and the rolls
const ORDER = new Map();
// The journey's Reliquary pool in its seeded order (the same seed, the same order, always).
export function reliquaryOrder(seed) {
  const k = String(seed); if (ORDER.has(k)) return ORDER.get(k);
  const out = Object.freeze([...RELIQUARY.pool].sort((a, b) => hashSeed(`${k}:${RELIQUARY.stream}:${a}`) - hashSeed(`${k}:${RELIQUARY.stream}:${b}`) || (a < b ? -1 : 1)));
  if (ORDER.size > 16) ORDER.clear(); ORDER.set(k, out); return out;
}
// Whether a reliquary waits at this end. `kind`: a RELIQUARY.certain kind (certain the first time, then its `later` kind's roll
// or nothing) or a RELIQUARY.chance kind (the seeded roll). `site`: the end's own key. Returns the kind it counts as, or null.
export function reliquaryDue(save, kind, site) {
  const f = save?.feats?.reliquary, sites = f?.sites || {}, firsts = f?.firsts || {};
  if (!site || sites[site]) return null; // each end holds at most one
  if (RELIQUARY.certain.includes(kind) && !firsts[kind]) return kind;
  const as = RELIQUARY.certain.includes(kind) ? RELIQUARY.later[kind] : kind, p = RELIQUARY.chance[as];
  return p && reliquaryRoll(save?.seed, as, site) ? as : null;
}
export const reliquaryRoll = (seed, kind, site) => rng(`${seed}:reliquary:v${RELIQUARY.version}:${kind}:${site}`)() < (RELIQUARY.chance[kind] || 0);
