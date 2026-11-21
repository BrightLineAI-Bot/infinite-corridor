// Phase 6's leads (docs/progression-design.md revision 3: 2.5 G3 and 2.7), for leads.ts: the nearest Revenant horde crossing not yet
// entered (the horde rumour, from Infinite II), and the strong lead pity gives after a long dry spell. Hashes shortlist candidates,
// and nothing here reads the progression table (leads.ts is imported early: atlas-view.ts).
import { hashSeed, rng } from "./random.ts";
import { exploring, ensureFeats } from "./journey-start.ts";
import { MILESTONES, RELIQUARY, PITY, HORDE_RUMOUR, WORLD_WITHHELD, earnedWorld, worldWithheld, featCount, milestoneLine, reliquaryRoll } from "./world-routes.ts";
import { dungeonId, regionSettled, CROSSING_ROLLS } from "./world.ts";
import { HORDE } from "./revenant-horde.ts";
import { ladderRoll } from "./dungeon-ladder.ts";
import { shaftHere, deepIdFor, deepKey } from "./the-deep.ts";
import { APERTURE_BANDS, apertureBand } from "./items.ts";
import { hamletSection, legacyMouthHamlet } from "./settlements.ts";
import { farDomainAt } from "./far-realms.ts";
import { rollMireCrypt } from "./underlands.ts";
import { annexRecord } from "./deep-annex.ts";
import { WONDERS } from "./wonders.ts";

// game.ts installs the pure physical probe after its module loads. Early/standalone callers cannot promise an unverified site.
let worldLeadProbe = null;
export function setWorldLeadProbe(probe) { worldLeadProbe = typeof probe === "function" ? probe : null; memo.clear(); physicalMemo.clear(); }
const physicalMemo = new Map();
function physical(save, x, y, kind, dungeon = null) {
  if (!worldLeadProbe) return false;
  // A castle tests its four quarters and their neighboring Pentagon footprints. These pins can enable/disable an overlay.
  const neighbors = [];
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    const a = save?.atlas?.[`${x + dx},${y + dy}`]; neighbors.push(a ? [a.pentVersion, a.castleVersion, a.coherenceVersion] : null);
  }
  const k = `${x},${y}`, key = JSON.stringify([save?.seed, save?.worldGeneration ?? 1, x, y, kind, dungeon, save?.atlas?.[k],
    save?.checkpoints?.[k], save?.hometowns, save?.farQuests, save?.boat, save?.story, save?.viewport, save?.progression?.start,
    save?.session?.areas?.[`overworld:${x}:${y}:g${save?.worldGeneration ?? 1}`], save?.digging, neighbors]);
  if (physicalMemo.has(key)) return physicalMemo.get(key);
  const ok = worldLeadProbe(save, x, y, kind, dungeon) === true;
  if (physicalMemo.size >= 128) physicalMemo.delete(physicalMemo.keys().next().value);
  physicalMemo.set(key, ok); return ok;
}
const inhabited = (save, x, y) => (x === 0 && y === 0) || regionSettled(x, y, save?.seed)
  || hamletSection(save?.seed, x, y) || legacyMouthHamlet(save, x, y)
  || (save?.hometowns?.towns || []).some((t) => t.rx === x && t.ry === y) || farDomainAt(save, x, y, !!save?.atlas?.[`${x},${y}`]);

const feats = (save) => (save?.feats?.counts && save.feats.reliquary?.sites && save.feats.earned && save.feats.pity ? save.feats : ensureFeats(save));
const exploredCount = (save) => Object.keys(save?.explored && typeof save.explored === "object" ? save.explored : {}).length;
const tierOf = (save) => APERTURE_BANDS.indexOf(apertureBand(save?.perception?.aperture || 0));

// ---------------------------------------------------------------- horde crossings (2.7) and the Deep's shafts
// An ordinary landmark crossing at a section whose Revenant horde roll holds at `tier` (world.ts addDungeonLandmark's own draws,
// revenant-horde.ts rollHorde's own hash and the dungeon ladder), not yet entered. Only surviving candidates need a cached terrain probe.
function hordeAt(save, x, y, tier) {
  const seed = save?.seed, gen = Number(save?.worldGeneration ?? 1);
  if (gen === 0) return null;
  const r = rng(`${seed}:${CROSSING_ROLLS[0].key}:g${gen}:${x}:${y}`); if (r() >= CROSSING_ROLLS[0].chance) return null; r();
  const id = dungeonId(seed, gen, x, y, `dungeon-g${gen}-${x}-${y}-${Math.floor(r() * 1e6)}`);
  const h = save?.consequences?.dungeons?.[id], fresh = h?.generatorVersion === undefined && !save?.session?.areas?.[id];
  if ((Number(h?.visits) || 0) > 0 || h?.mire || (h?.horde !== undefined && !h.horde)) return null;
  const rung = h?.ladder ? ladderRoll(seed, id, "horde", h.ladder.tier) : fresh ? ladderRoll(seed, id, "horde", tier) : undefined;
  if (!h?.horde && (hashSeed(`${seed}:revenant-horde:v${HORDE.version}:${id}`) % 1000 >= HORDE.perThousand || rung === null)) return null;
  if (fresh && h?.mire === undefined) {
    const starfield = (hashSeed(`${seed}:chasm-crossing:v1:${id}`) % 1000) / 1000 < WONDERS.chasmChance;
    const annex = h?.deepAnnex === undefined ? annexRecord(seed, id, starfield) : h.deepAnnex;
    const mireRung = h?.ladder ? ladderRoll(seed, id, "poisonCrypt", h.ladder.tier) : ladderRoll(seed, id, "poisonCrypt", tier);
    if (!annex && rollMireCrypt(seed, id, h?.layoutPool ?? 5) && mireRung !== null) return null;
  }
  if (inhabited(save, x, y)) return null;
  return physical(save, x, y, "horde", id) ? { rx: x, ry: y, dungeon: id } : null;
}
const ringScan = (rx, ry, radius, at) => { for (let d = 0; d <= radius; d++) for (let i = 0; i < Math.max(1, 8 * d); i++) {
  const side = Math.floor(i / Math.max(1, 2 * d)), k = i % Math.max(1, 2 * d), x = rx + (d ? [-d + k, d, d - k, -d][side] : 0), y = ry + (d ? [-d, -d + k, d, d - k][side] : 0);
  const q = at(x, y); if (q) return { ...q, d }; } return null; };
const memo = new Map();
export function nearestHorde(save, rx, ry, radius = HORDE_RUMOUR.radius) {
  const tier = Math.max(0, tierOf(save)), key = `h:${save?.seed}:${save?.worldGeneration}:${rx}:${ry}:${radius}:${tier}`;
  if (memo.has(key)) { const q = memo.get(key); if (q && hordeAt(save, q.rx, q.ry, tier)) return q; }
  const q = ringScan(rx, ry, radius, (x, y) => hordeAt(save, x, y, tier)); if (memo.size > 64) memo.clear(); memo.set(key, q); return q;
}
// The nearest Deep Shaft on ground not yet explored (the-deep.ts shaftHere: on new ground the hash decides), and the first of its
// floors whose seeded roll holds a reliquary (RELIQUARY.chance.deep), within `radius` sections.
export function nearestShaft(save, rx, ry, radius = PITY.radius) {
  const seed = save?.seed;
  return ringScan(rx, ry, radius, (x, y) => {
    const key = `${x},${y}`;
    if (save?.atlas?.[key] || save?.explored?.[key] || !shaftHere(seed, x, y) || inhabited(save, x, y)) return null;
    const id = deepIdFor(seed, x, y);
    for (let f = 1; f <= PITY.floors; f++) if (reliquaryRoll(seed, "deep", `${id}:f${f}`))
      return physical(save, x, y, "shaft") ? { rx: x, ry: y, floor: f, shaft: id } : null;
    return null;
  });
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
