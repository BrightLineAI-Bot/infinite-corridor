// Phase 6's leads (docs/progression-design.md revision 3: 2.5 G3 and 2.7), for leads.ts: the nearest Revenant horde crossing not yet
// entered (the horde rumour, from Infinite II), and the strong lead pity gives after a long dry spell. Pure; no section is built,
// and nothing here reads the progression table (leads.ts is imported early: atlas-view.ts).
import { hashSeed, rng } from "./random.js?v=r1048-e54a484438dd";
import { exploring, ensureFeats } from "./journey-start.js?v=r1048-e54a484438dd";
import { MILESTONES, RELIQUARY, PITY, HORDE_RUMOUR, WORLD_WITHHELD, earnedWorld, worldWithheld, featCount, milestoneLine, reliquaryRoll } from "./world-routes.js?v=r1048-e54a484438dd";
import { dungeonId, regionSettled, CROSSING_ROLLS } from "./world.js?v=r1048-e54a484438dd";
import { HORDE } from "./revenant-horde.js?v=r1048-e54a484438dd";
import { ladderRoll } from "./dungeon-ladder.js?v=r1048-e54a484438dd";
import { shaftHere, deepIdFor, deepKey } from "./the-deep.js?v=r1048-e54a484438dd";
import { APERTURE_BANDS, apertureBand } from "./items.js?v=r1048-e54a484438dd";

const feats = (save) => (save?.feats?.counts && save.feats.reliquary?.sites && save.feats.earned && save.feats.pity ? save.feats : ensureFeats(save));
const exploredCount = (save) => Object.keys(save?.explored && typeof save.explored === "object" ? save.explored : {}).length;
const tierOf = (save) => APERTURE_BANDS.indexOf(apertureBand(save?.perception?.aperture || 0));

// ---------------------------------------------------------------- horde crossings (2.7) and the Deep's shafts
// An ordinary landmark crossing at a section whose Revenant horde roll holds at `tier` (world.ts addDungeonLandmark's own draws,
// revenant-horde.ts rollHorde's own hash and the dungeon ladder), not yet entered. A few hashes; no section built.
function hordeAt(save, x, y, tier) {
  const seed = save?.seed, gen = Number(save?.worldGeneration) || 1;
  if ((x === 0 && y === 0) || regionSettled(x, y, seed)) return null;
  const r = rng(`${seed}:${CROSSING_ROLLS[0].key}:g${gen}:${x}:${y}`); if (r() >= CROSSING_ROLLS[0].chance) return null; r(); // its spot
  const id = dungeonId(seed, gen, x, y, `dungeon-g${gen}-${x}-${y}-${Math.floor(r() * 1e6)}`);
  if (hashSeed(`${seed}:revenant-horde:v${HORDE.version}:${id}`) % 1000 >= HORDE.perThousand || ladderRoll(seed, id, "horde", tier) === null) return null;
  const h = save?.consequences?.dungeons?.[id]; if (h && ((Number(h.visits) || 0) > 0 || h.horde === null || h.mire)) return null;
  return { rx: x, ry: y, dungeon: id };
}
const ringScan = (rx, ry, radius, at) => { for (let d = 0; d <= radius; d++) for (let i = 0; i < Math.max(1, 8 * d); i++) {
  const side = Math.floor(i / Math.max(1, 2 * d)), k = i % Math.max(1, 2 * d), x = rx + (d ? [-d + k, d, d - k, -d][side] : 0), y = ry + (d ? [-d, -d + k, d, d - k][side] : 0);
  const q = at(x, y); if (q) return { ...q, d }; } return null; };
const memo = new Map();
export function nearestHorde(save, rx, ry, radius = HORDE_RUMOUR.radius) {
  const tier = Math.max(0, tierOf(save)), key = `h:${save?.seed}:${save?.worldGeneration}:${rx}:${ry}:${radius}:${tier}`;
  if (memo.has(key)) { const q = memo.get(key); return q && !hordeAt(save, q.rx, q.ry, tier) ? null : q; }
  const q = ringScan(rx, ry, radius, (x, y) => hordeAt(save, x, y, tier)); if (memo.size > 64) memo.clear(); memo.set(key, q); return q;
}
// The nearest Deep Shaft on ground not yet explored (the-deep.ts shaftHere: on new ground the hash decides), and the first of its
// floors whose seeded roll holds a reliquary (RELIQUARY.chance.deep), within `radius` sections.
export function nearestShaft(save, rx, ry, radius = PITY.radius) {
  const seed = save?.seed, q = ringScan(rx, ry, radius, (x, y) => !save?.atlas?.[`${x},${y}`] && shaftHere(seed, x, y) ? { rx: x, ry: y } : null); if (!q) return null;
  const id = deepIdFor(seed, q.rx, q.ry); for (let f = 1; f <= PITY.floors; f++) if (reliquaryRoll(seed, "deep", `${id}:f${f}`)) return { ...q, floor: f, shaft: id };
  return null;
}

// ---------------------------------------------------------------- pity (G3): a lead, never an ability
// pityDue: Exploration, PITY.sections new sections explored since, and something left to find. pityLead: the
// strong lead (once due): the nearest unentered horde crossing while the first horde's reliquary waits, else the nearest Deep
// Shaft and the floor whose reliquary waits, within PITY.radius; else the milestone nearest its threshold. The counter starts
// again from the lead.
export const pitySince = (save) => Math.max(0, exploredCount(save) - (Number(save?.feats?.pity?.mark) || 0));
export const pityDue = (save) => exploring(save) && pitySince(save) >= PITY.sections && WORLD_WITHHELD.some((id) => worldWithheld(save, id));
export const PITY_WORDS = Object.freeze({
  title: "A strong lead",
  horde: (d) => `Listen: a crossing ${d} section${d === 1 ? "" : "s"} from here is thick with Gate Revenants. Break the horde, and what waits at the bottom is yours.`,
  shaft: (d, f) => `There's a Deep Shaft ${d} section${d === 1 ? "" : "s"} from here, on ground no one's walked. On floor ${f} something waits at the bottom, they say.`,
  milestone: (line, need) => `Keep at it, they say: ${line}. Something answers at ${need.toLocaleString("en-US")}.`,
});
export function pityLead(save, rx = 0, ry = 0) {
  if (!pityDue(save)) return null;
  let lead = null;
  const h = !save?.feats?.reliquary?.firsts?.horde && RELIQUARY.pool.some((id) => worldWithheld(save, id)) ? nearestHorde(save, rx, ry, PITY.radius) : null;
  if (h) lead = { id: `pity:horde:${h.rx},${h.ry}`, kind: "pity", target: "horde", dungeon: h.dungeon, text: PITY_WORDS.horde(h.d), rx: h.rx, ry: h.ry, name: PITY_WORDS.title };
  const s = !lead && RELIQUARY.pool.some((id) => worldWithheld(save, id)) ? nearestShaft(save, rx, ry, PITY.radius) : null;
  if (s) lead = { id: `pity:deep:${s.rx},${s.ry}`, kind: "pity", target: "deep", shaft: s.shaft, floor: s.floor, text: PITY_WORDS.shaft(s.d, s.floor), rx: s.rx, ry: s.ry, name: PITY_WORDS.title };
  if (!lead) {
    const m = MILESTONES.filter((q) => worldWithheld(save, q.ability)).map((q) => ({ q, share: featCount(save, q.key) / q.need })).sort((a, b) => b.share - a.share)[0]?.q;
    if (m) lead = { id: `pity:milestone:${m.key}`, kind: "pity", target: "milestone", milestone: m.key, text: PITY_WORDS.milestone(milestoneLine(m, featCount(save, m.key)), m.need), name: PITY_WORDS.title };
  }
  if (!lead) return null;
  const P = feats(save).pity; P.mark = exploredCount(save); P.told += 1;
  return lead;
}
// Whether a strong lead still points at something to do.
export function pityLive(save, r) {
  if (r?.target === "horde") return !save?.feats?.reliquary?.firsts?.horde && !((Number(save?.consequences?.dungeons?.[r.dungeon]?.visits) || 0) > 0);
  if (r?.target === "deep") { const best = Number(save?.theDeep?.shafts?.[deepKey(r.shaft)]?.best) || 0; return best < (Number(r.floor) || 1) && RELIQUARY.pool.some((id) => worldWithheld(save, id)); }
  if (r?.target === "milestone") { const m = MILESTONES.find((q) => q.key === r.milestone); return !!m && !earnedWorld(save, m.ability); }
  return false;
}
