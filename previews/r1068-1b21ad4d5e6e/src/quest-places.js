// Quest places and quest state (docs/progression-design.md revision 3, Phase 7: 2.5 G4, 2.8, 4.3; the rules: quests.ts). A step
// that needs a place has it resolved once, from cheap hashes (no section is built, as wonders.ts and world-leads.ts find theirs),
// saved in save.quests and never moved: the nearest qualifying ground not yet entered, measured from the quest's `from`, within
// QUEST_PLACES.radius sections. Never the void, the open sea (an island's crossing needs a boat), a town, the Far Sleep (its
// crossings may be Sleeper's Halls) or a crossing that may roll a Poison Crypt instead. Only when that place is spent (entered and
// finished without the quest) is the next one resolved and saved after it; with none inside the search the step relaxes to "any
// such place". game.ts opens quests and marks their steps; main.ts lists them (questLeads); atlas-view.ts points the compass.
//
// Phase 8 adds the far, sea, sky, under and strange places (FINDERS: canyon craters, shipwrecks, Sky Stairs, Gate Revenants'
// crossings, Pentagons, the Thornglass Caldera, the Storm Halls), each found the same way: a few hashes per section, no section
// built, searched once in a bounded window (QUEST_PLACES.radii) and kept in the quest's record; a far step (`far`) searches
// round a seeded point that far out on the quest's own bearing (2.4: the seed decides the sector) and takes only sections at
// least that far from the Ember Refuge. A place found empty when the Wayfarer gets there (questArrive: no wreck, no crater, no
// stair, no Revenant) is marked `miss`, and the next is resolved after it, so no step is ever stranded. And the events the
// steps move on (questEvent: a kill, a salvage, a word with the giver, a token collected, a place cleared, a beast come home).
import { rng, hashSeed } from "./random.js?v=r1068-1b21ad4d5e6e";
import { dungeonId, regionSettled, CROSSING_ROLLS } from "./world.js?v=r1068-1b21ad4d5e6e";
import { starfieldRolls, starPlaceAt } from "./wonders.js?v=r1068-1b21ad4d5e6e";
import { openSeaQuick, farSleepSection, SEA_FEATURES } from "./landscape.js?v=r1068-1b21ad4d5e6e";
import { canyonHere, canyonIdFor } from "./canyon.js?v=r1068-1b21ad4d5e6e";
import { skylandSection, SKY_PLACE, grantSeed } from "./skylands.js?v=r1068-1b21ad4d5e6e";
import { pentagonAt, PENTAGON } from "./pentagon.js?v=r1068-1b21ad4d5e6e";
import { hamletSection } from "./settlements.js?v=r1068-1b21ad4d5e6e";
import { HORDE } from "./revenant-horde.js?v=r1068-1b21ad4d5e6e";
import { GATE_REVENANT } from "./monster-pack.js?v=r1068-1b21ad4d5e6e";
import { ladderRoll } from "./dungeon-ladder.js?v=r1068-1b21ad4d5e6e";
import { farCivCentre, farCivAt, farDomainCentre } from "./far-realms.js?v=r1068-1b21ad4d5e6e";
import { APERTURE_BANDS, apertureBand } from "./items.js?v=r1068-1b21ad4d5e6e";
import { rollMireCrypt, dreamHallRoll } from "./underlands.js?v=r1068-1b21ad4d5e6e";
import { annexRecord } from "./deep-annex.js?v=r1068-1b21ad4d5e6e";
import { ensureQuests, QUEST_RECORD } from "./journey-start.js?v=r1068-1b21ad4d5e6e";
import { QUESTS, QUEST_IDS, questState, questOpen, questStep, stepDone, stepPlace, stepCount, mealFrom, questFollowId } from "./quests.js?v=r1068-1b21ad4d5e6e";

export const QUEST_PLACES = Object.freeze({
  radius: 24, // sections searched round a quest's `from` (Chebyshev rings), a few thousand hashes at most, once
  // Phase 8: each place kind's own window (Chebyshev rings round `from`, or round the far point): the sea is wider, as open sea
  // lies past OPEN_SEA.minDepth and not on every journey's doorstep; Pentagons stand on a grid of PENTAGON.every.
  radii: Object.freeze({ starfield: 24, canyon: 24, wreck: 40, skyway: 24, revenant: 32, pentagon: 48 }),
  farOut: 6, // a far step's search centre lies this many sections beyond its `far`, on the quest's seeded bearing
  stream: "progression:v5:quest-bearing", // the seeded bearing of a far step
  layoutPool: 5, // game.ts: the layout pool every crossing first generated from now on takes (the Poison Crypt roll reads it)
});
export const QUEST_WORDS = Object.freeze({
  open: "A QUEST", done: "QUEST COMPLETE", gift: "A GIFT",
  any: (what) => `${what}: any one will do (none lies close enough to point the compass at).`,
  starfield: "a crossing that opens on stars",
  canyon: "a canyon crater", wreck: "a shipwreck out at sea (you will want a boat)", skyway: "a Sky Stair at least 50 sections out",
  revenant: "a crossing where a Gate Revenant stalks, at least 50 sections out", pentagon: "a Pentagon (its five-sided sigils, cut in the ground, point the way)", caldera: "the Thornglass Caldera",
  storm: "the Storm Halls", husk: "the Hollow Husk (a Pumice Seed, planted at a Watcher's shrine)",
  giver: (name) => `${name}'s table`,
  speak: (name) => name,
  counted: (n, need) => ` ${n} of ${need} so far.`,
  window: (n, need, left) => ` ${n} of ${need}: ${left} s left before the first relights.`,
  tokens: (n) => ` ${n} still lie${n === 1 ? "s" : ""} where ${n === 1 ? "it" : "they"} fell: Act to collect.`,
  first: "A quest: the Journal's Leads say what and where. Point the compass at it to follow.",
});

// ---------------------------------------------------------------- places
// A Starfield crossing at section (x, y) not yet entered, or null: the section's landmark crossing (world.ts addDungeonLandmark's
// own draws), its Starfield roll (game.ts chasmRoll, at the section's placement: wonders.ts STARFIELD_ROLL), and nothing that would make it something
// else on first entry (game.ts generateDungeonFor: a Poison Crypt, unless it is a Deep Annex's first floor; the Far Sleep's halls).
export function starfieldAt(save, x, y) {
  const seed = save?.seed, gen = Number(save?.worldGeneration) || 1;
  if ((x === 0 && y === 0) || regionSettled(x, y, seed) || farSleepSection(x, y)) return null;
  const r = rng(`${seed}:${CROSSING_ROLLS[0].key}:g${gen}:${x}:${y}`); if (r() >= CROSSING_ROLLS[0].chance) return null; r(); // its spot
  const id = dungeonId(seed, gen, x, y, `dungeon-g${gen}-${x}-${y}-${Math.floor(r() * 1e6)}`);
  if (!starfieldRolls(seed, id, starPlaceAt(save, x, y))) return null; // the section's Starfield placement (wonders.ts STARFIELD_ROLL)
  if (!annexRecord(seed, id, true) && rollMireCrypt(seed, id, QUEST_PLACES.layoutPool)) return null; // it might be a Poison Crypt
  if (openSeaQuick(seed, x, y)) return null; // an island's crossing: no boat asked for
  const h = save?.consequences?.dungeons?.[id];
  if ((h && (h.generatorVersion !== undefined || (Number(h.visits) || 0) > 0)) || save?.session?.areas?.[id]) return null; // entered before
  return { rx: x, ry: y, dungeon: id };
}
// ---- Phase 8 finders: each (save, x, y) -> { rx, ry, dungeon? } or null; never the void, a town or a hamlet.
const seen = (save, x, y) => !!save?.atlas?.[`${x},${y}`] || !!save?.explored?.[`${x},${y}`];
// Ground a place may lie on: not the Refuge, a town or a hamlet. The Far Sleep is allowed here (every section past 35 out is in
// it, so every far place is): its crossings that may be Sleeper's Halls are passed over (revenantAt).
const solid = (save, x, y) => !(x === 0 && y === 0) && !regionSettled(x, y, save?.seed) && !hamletSection(save?.seed, x, y);
// An ordinary landmark crossing at (x, y) (world.ts addDungeonLandmark's own draws), its id, or null; never a possible Poison Crypt.
// Exported for thread-trails.ts (2026-11-21: the crossing that holds a followed thread's next piece).
export function crossingAt(save, x, y) {
  const seed = save?.seed, gen = Number(save?.worldGeneration) || 1;
  const r = rng(`${seed}:${CROSSING_ROLLS[0].key}:g${gen}:${x}:${y}`); if (r() >= CROSSING_ROLLS[0].chance) return null; r();
  const id = dungeonId(seed, gen, x, y, `dungeon-g${gen}-${x}-${y}-${Math.floor(r() * 1e6)}`);
  if (!annexRecord(seed, id, true) && rollMireCrypt(seed, id, QUEST_PLACES.layoutPool)) return null;
  const h = save?.consequences?.dungeons?.[id]; if ((h && (h.generatorVersion !== undefined || (Number(h.visits) || 0) > 0)) || save?.session?.areas?.[id]) return null;
  return id;
}
// A canyon crater (canyon.ts canyonHere: on ground first seen now the hash decides), never on open sea.
export const canyonAt = (save, x, y) => solid(save, x, y) && !seen(save, x, y) && canyonHere(save?.seed, x, y) && !openSeaQuick(save?.seed, x, y) ? { rx: x, ry: y, dungeon: canyonIdFor(save?.seed, x, y) } : null;
// A shipwreck: open sea (a boat is needed: reachable by boat), whose sea-feature roll lays a wreck (landscape.ts addSeaFeatures).
// openSeaQuick gives openSeaSection's own answer, from 16 samples where they settle it.
export const wreckAt = (save, x, y) => solid(save, x, y) && !seen(save, x, y) && hashSeed(`${save?.seed}:sea-feature:wreck:${x}:${y}`) % SEA_FEATURES.wreckEvery === 0 && openSeaQuick(save?.seed, x, y) ? { rx: x, ry: y, flag: `wreck-${x}-${y}` } : null;
// A Sky Stair (skylands.ts skylandSection, as wonders.ts finds a skyway), on land.
export const skywayAt = (save, x, y) => solid(save, x, y) && !seen(save, x, y) && skylandSection(save?.seed, x, y, SKY_PLACE.version) && !openSeaQuick(save?.seed, x, y) ? { rx: x, ry: y } : null;
// A crossing where a Gate Revenant stalks: its horde roll, or its gate-predator roll at today's rate for new crossings (game.ts),
// each through the dungeon ladder at the Wayfarer's band.
export function revenantAt(save, x, y) {
  const id = crossingAt(save, x, y); if (!id || !solid(save, x, y) || openSeaQuick(save?.seed, x, y)) return null;
  if (farSleepSection(x, y) && dreamHallRoll(save?.seed, id)) return null; // a Sleeper's Hall (game.ts): no Revenant is promised there
  const seed = save?.seed, tier = Math.max(0, APERTURE_BANDS.indexOf(apertureBand(save?.perception?.aperture || 0)));
  const horde = hashSeed(`${seed}:revenant-horde:v${HORDE.version}:${id}`) % 1000 < HORDE.perThousand && ladderRoll(seed, id, "horde", tier) !== null;
  const stalker = hashSeed(`${seed}:gate-predator:v1:${id}`) % 1000 < GATE_REVENANT.spawnPerThousand && ladderRoll(seed, id, "gatePredator", tier) !== null;
  return horde || stalker ? { rx: x, ry: y, dungeon: id } : null;
}
// A Pentagon's centre section on new ground (pentagon.ts pentagonAt, with game.ts pentagonHere's own ground test).
export function pentagonPlaceAt(save, x, y) {
  const E = PENTAGON.every; if (x % E !== 0 || y % E !== 0 || seen(save, x, y)) return null;
  const seed = save?.seed, ok = (rx, ry) => !regionSettled(rx, ry, seed) && !hamletSection(seed, rx, ry) && !openSeaQuick(seed, rx, ry) && !(save?.atlas?.[`${rx},${ry}`] && !save.atlas[`${rx},${ry}`].pentVersion);
  return pentagonAt(seed, x, y, ok) ? { rx: x, ry: y } : null;
}
const FINDERS = Object.freeze({ starfield: starfieldAt, canyon: canyonAt, wreck: wreckAt, skyway: skywayAt, revenant: revenantAt, pentagon: pentagonPlaceAt });
// The fixed places: the Thornglass Caldera (far-realms.ts: its far quest's record, else its centre on ground not seen before) and
// the Storm Halls (the civilisation's centre). The Hollow Husk has no section: a Pumice Seed at any Watcher's shrine opens it.
const FIXED = Object.freeze({
  caldera: (save) => { const q = save?.farQuests?.questingBeast; if (q && Number.isInteger(q.rx)) return { rx: q.rx, ry: q.ry }; const c = farDomainCentre(save?.seed, "questingBeast"); return seen(save, c.rx, c.ry) ? null : { rx: c.rx, ry: c.ry }; },
  // the nearest section to its centre that is the Storm Halls' own (another civilisation may overlap its edge, or its heart)
  storm: (save) => { const c = farCivCentre(save?.seed, "storm"); return ringScan(c.rx, c.ry, c.radius, (x, y) => (farCivAt(save?.seed, x + .5, y + .5)?.id === "storm" ? { rx: x, ry: y } : null)); },
});
// A far step's search centre: `far` + farOut sections out on the quest's seeded bearing (2.4: the seed picks its sector).
export function farCentre(seed, id, far) { const a = (hashSeed(`${seed}:${QUEST_PLACES.stream}:${id}`) % 3600) / 3600 * Math.PI * 2, d = far + QUEST_PLACES.farOut; return { rx: Math.round(Math.cos(a) * d), ry: Math.round(Math.sin(a) * d) }; }
function ringScan(rx, ry, radius, at) {
  for (let d = 0; d <= radius; d++) for (let i = 0; i < Math.max(1, 8 * d); i++) {
    const side = Math.floor(i / Math.max(1, 2 * d)), k = i % Math.max(1, 2 * d), x = rx + (d ? [-d + k, d, d - k, -d][side] : 0), y = ry + (d ? [-d, -d + k, d, d - k][side] : 0);
    const q = at(x, y); if (q) return { ...q, d };
  }
  return null;
}
// A place used up without the quest: its crossing entered and finished (its guardian down), or found empty (`miss`, questArrive).
export const placeSpent = (save, p) => !!p?.miss || (!!p?.flag && !!save?.worldFlags?.[p.flag]) || (!!p?.dungeon && !!(save?.consequences?.dungeons?.[p.dungeon]?.guardianDefeated || save?.consequences?.dungeons?.[p.dungeon]?.resolved));
// Earlier places of the same step are passed over when the next is resolved (a counted step goes on to the next wreck or crater).
const tried = (q, key) => new Set((Array.isArray(q?.places) ? q.places : []).filter((p) => p?.step === key && !p.relaxed).map((p) => `${p.rx},${p.ry}`));
// The place step `key` of quest `id` points at: the one saved, while it is not spent; else the next, resolved now and saved.
export function questPlace(save, id, key) {
  const Q = QUESTS[id], step = Q?.steps.find((s) => s.key === key), q = questState(save, id); if (!step?.place || !q) return null;
  const cur = stepPlace(save, id, key);
  if (cur && (cur.relaxed || cur.fixed || !placeSpent(save, cur))) return cur;
  let p;
  if (FIXED[step.place]) { const f = FIXED[step.place](save); p = f ? { step: key, rx: f.rx, ry: f.ry, fixed: true } : { step: key, relaxed: true }; }
  else {
    const find = FINDERS[step.place], skip = tried(q, key), far = Number(step.far) || 0, c = far ? farCentre(save?.seed, id, far) : Q.from;
    const hit = find ? ringScan(c.rx, c.ry, QUEST_PLACES.radii[step.place] || QUEST_PLACES.radius, (x, y) => (!far || Math.hypot(x, y) >= far) && !skip.has(`${x},${y}`) ? find(save, x, y) : null) : null;
    p = hit ? { step: key, rx: hit.rx, ry: hit.ry, ...(hit.dungeon ? { dungeon: hit.dungeon } : {}), ...(hit.flag ? { flag: hit.flag } : {}) } : { step: key, relaxed: true };
  }
  q.places = [...(Array.isArray(q.places) ? q.places : []), p].slice(-QUEST_RECORD.placesMax);
  return p;
}
// What each kind of place should hold when the Wayfarer stands there (an object in the section, or a creature in the crossing).
const HOLDS = Object.freeze({
  canyon: (o) => typeof o?.id === "string" && o.id.startsWith("canyon-crater-") && o.kind === "dungeon",
  wreck: (o) => o?.kind === "shipwreck", skyway: (o) => o?.kind === "skyStair",
});
// The Wayfarer stands in a section (overworld) or a crossing (dungeon): a place pointed at that turns out not to hold what it
// should (a wreck's spot found no clear water, a stair or crater could not be laid, no Revenant walks the crossing after all)
// is marked `miss`, so the next is resolved. Returns the ids of quests whose place moved.
export function questArrive(save, { area, rx, ry, areaId = "", objects = [], enemies = [] } = {}) {
  const out = [];
  for (const id of QUEST_IDS) {
    if (!questOpen(save, id)) continue; const step = questStep(save, id); if (!step?.place) continue;
    const p = stepPlace(save, id, step.key); if (!p || p.relaxed || p.fixed || p.miss) continue;
    if (area === "overworld" && p.rx === rx && p.ry === ry && HOLDS[step.place] && !objects.some(HOLDS[step.place])) { p.miss = true; out.push(id); }
    else if (area === "dungeon" && step.place === "revenant" && p.dungeon && areaId === p.dungeon && !enemies.some((e) => e?.kind === "gateRevenant")) { p.miss = true; out.push(id); }
  }
  for (const id of out) { const s = questStep(save, id); if (s) questPlace(save, id, s.key); }
  return out;
}

// ---------------------------------------------------------------- opening and the steps
const record = (save) => (save?.quests?.open && typeof save.quests.open === "object" ? save.quests : ensureQuests(save));
const nowOf = (save) => Math.floor(Math.max(0, Number(save?.playSeconds) || 0));
// Opens quest `id` (once): its record, and every step's place resolved and saved. `giverAt`: where its giver stands (game.ts).
// Returns the record.
export function openQuest(save, id, { giverAt = null } = {}) {
  const Q = QUESTS[id]; if (!Q) return null;
  const R = record(save); if (R.open[id]) return R.open[id];
  R.open[id] = { state: "open", at: nowOf(save), steps: {}, places: [], ...(giverAt && Number.isInteger(giverAt.rx) && Number.isInteger(giverAt.ry) ? { giverAt: { rx: giverAt.rx, ry: giverAt.ry } } : {}) };
  for (const s of Q.steps) if (s.place) questPlace(save, id, s.key);
  return R.open[id];
}
// A quest's gift (quests.ts `gift`), handed once while the quest is open and the step it is for still waits: the seed into the
// pouch, recorded as the quest's `gifted`. A quest opened before gifts existed is handed its gift the first time this runs after
// (game.ts settleQuests). Returns the gift, or null.
export function questGift(save, id) {
  const G = QUESTS[id]?.gift; if (!G || !questOpen(save, id)) return null;
  const q = questState(save, id); if (q.gifted === true || stepDone(save, id, G.step)) return null;
  if (!grantSeed(save, G.seed, G.n)) return null;
  q.gifted = true; return G;
}
// While a counted step's window runs (quests.ts `calls`), the kind of creature it calls to a floor tagged `where` (game.ts
// questWhere): the creatures that come back there are of that kind. Returns the kind, or null.
export function questCalled(save, where = [], at = nowOf(save)) {
  for (const id of QUEST_IDS) {
    if (!questOpen(save, id)) continue; const step = questStep(save, id); if (!step?.calls || !step.within || !where.includes(step.where)) continue;
    const w = questState(save, id).window; if (w && w.step === step.key && at - w.at <= step.within && w.n < step.need) return step.kind;
  }
  return null;
}
// Marks step `key` of quest `id` done; the quest is done when no step waits. Returns whether it is now complete.
function mark(save, id, key) {
  const q = questState(save, id); q.steps = { ...(q.steps || {}), [key]: nowOf(save) };
  if (questStep(save, id)) return false;
  q.state = "done"; if (save.meal?.quest === id) delete save.meal.quest; delete q.window; return true;
}
// One more of a counted step (`need`; within `within` seconds of the first, when it has one). Returns whether the quest is done.
function tally(save, id, step, at = nowOf(save)) {
  const q = questState(save, id); q.counts = { ...(q.counts || {}) };
  if (step.within) {
    const w = q.window && q.window.step === step.key && at - q.window.at <= step.within ? q.window : { step: step.key, at, n: 0 };
    w.n++; q.window = w; q.counts[step.key] = w.n;
  } else q.counts[step.key] = Math.min(step.need, (Number(q.counts[step.key]) || 0) + 1);
  return q.counts[step.key] >= step.need ? mark(save, id, step.key) : false;
}
// The giver's words for the quests open with them (`giverId`, an object id), or null: the offer until the first step moves, then
// the waiting line (the meal: Phase 7's own lines). A giver with two quests open says both (fixes from a 20-hour playthrough:
// Vela spoke only of the metronome, so Arc Wave's boat and Blunderbuss were never heard; Oren likewise hid Power Aegis).
export function questTalk(save, giverId) {
  const lines = [];
  for (const id of QUEST_IDS) {
    const Q = QUESTS[id]; if (Q.giver !== giverId || !questOpen(save, id)) continue;
    const step = questStep(save, id); if (!step) continue;
    let line;
    if (step.key === "meal") line = Number.isFinite(Number(questState(save, id).steps?.meal)) ? Q.again : Q.offer;
    else { const q = questState(save, id), moved = Object.keys(q.steps || {}).length || Object.keys(q.counts || {}).length || (q.tokens || []).length; line = moved ? Q.waiting : Q.offer; }
    if (line) lines.push(line);
  }
  return lines.length ? lines.join(" ") : null;
}
// A word with `giverId`: a step that asks for a delivery to them (`on: "speak"`), with the steps it needs done, is done.
// Returns { line, done }: what is said (the delivery, else the giver's own words, else null) and the quests now complete.
export function questSpeak(save, giverId) {
  const done = [];
  for (const id of QUEST_IDS) {
    if (!questOpen(save, id)) continue; const step = questStep(save, id), Q = QUESTS[id];
    if (step?.on !== "speak" || step.at !== giverId || (step.needs && !stepDone(save, id, step.needs))) continue;
    if (mark(save, id, step.key)) done.push(id);
    return { line: Q.deliver || null, done };
  }
  return { line: questTalk(save, giverId), done };
}
// A meal eaten at `giverId`'s table: each open quest whose step waits for it marks the meal as its own (it holds while the meal
// lasts; any other meal replaces it). Returns the lines to say.
export function questMeal(save, giverId) {
  const out = [];
  for (const id of QUEST_IDS) {
    const Q = QUESTS[id]; if (Q.giver !== giverId || !questOpen(save, id) || !save.meal) continue;
    if (!Q.steps.some((s) => s.key === "meal") || questStep(save, id)?.key !== "meal") continue;
    save.meal.quest = id; questState(save, id).steps.meal = nowOf(save); out.push(Q.fed);
  }
  return out;
}
// A place cleared: `what` a Starfield crossing ("starfield", Phase 7) or a Skyland ("skyland", from its stair's section `rx`,
// `ry`). Each open quest whose waiting step asks for it, with the steps it needs still holding, takes it. Returns the ids of
// quests that are now complete (marked done; world-finds.ts grants them).
export function questClear(save, what, { rx = null, ry = null } = {}) {
  const out = [];
  for (const id of QUEST_IDS) {
    if (!questOpen(save, id)) continue;
    const step = questStep(save, id); if (!step || (step.on ? step.on !== "clear" || step.what !== what : step.place !== what) || (step.needs && !stepDone(save, id, step.needs))) continue;
    if (step.atPlace) { const p = stepPlace(save, id, step.placeOf || step.key); if (!p || p.relaxed || p.rx !== rx || p.ry !== ry) continue; }
    if (mark(save, id, step.key)) out.push(id);
  }
  return out;
}
// A beast come home to its domain (`what`: "questingBeast", game.ts domainTick): a step that waits for it is done.
export function questHome(save, what) {
  const out = [];
  for (const id of QUEST_IDS) { if (!questOpen(save, id)) continue; const step = questStep(save, id); if (step?.on === "home" && step.what === what && mark(save, id, step.key)) out.push(id); }
  return out;
}
// Whether event `ev` meets a step's conditions: the creature, the area's tag, the distance out, the tool, the Aegis or Force Channel.
function meets(save, id, step, ev) {
  if (step.kind && ev.kind !== step.kind) return false;
  if (step.where && !(Array.isArray(ev.where) && ev.where.includes(step.where))) return false;
  if (step.far && !(Number(ev.far) >= step.far)) return false;
  if (step.with && ev.with !== step.with) return false;
  if (step.cond === "aegis" && !ev.aegis) return false;
  if (step.cond === "force" && !ev.force) return false;
  if (step.needs && !stepDone(save, id, step.needs)) return false;
  return true;
}
// A deed in the world (game.ts reports each): { on: "kill" | "salvage", kind?, where?: [tags], far?, with?, aegis?, force?,
// areaId?, x?, y?, rx?, ry?, at? }. A counted step counts it; a step with a `token` lays a thing to collect where it fell instead
// (at most as many as are still needed); any other step is done. Returns { done, lay }: the quests now complete, and the tokens to
// lay in the area now ({ id, kind: "questToken", ... } objects).
export function questEvent(save, ev = {}) {
  recoverLostQuestTokens(save);
  const done = [], lay = [];
  for (const id of QUEST_IDS) {
    if (!questOpen(save, id)) continue;
    const step = questStep(save, id); if (!step || step.on !== ev.on || !meets(save, id, step, ev)) continue;
    const q = questState(save, id);
    if (step.token && ev.on === "kill") {
      const lying = (q.tokens || []).filter((t) => t.step === step.key).length;
      if (stepCount(save, id, step.key) + lying >= step.need || !Number.isFinite(Number(ev.x)) || !Number.isFinite(Number(ev.y))) continue;
      q.seq = (Number(q.seq) || 0) + 1; const t = { id: `${id}:${step.key}:${q.seq}`, step: step.key, area: String(ev.areaId || ""), x: Math.round(Number(ev.x)), y: Math.round(Number(ev.y)) };
      q.tokens = [...(q.tokens || []), t].slice(-QUEST_RECORD.tokensMax); lay.push(tokenObject(id, step, t)); continue;
    }
    if (step.on === "salvage" && step.place) { const p = stepPlace(save, id, step.key); if (p && !p.relaxed && p.rx === ev.rx && p.ry === ev.ry) p.used = true; }
    if ((step.need ? tally(save, id, step, Number.isFinite(Number(ev.at)) ? Number(ev.at) : nowOf(save)) : mark(save, id, step.key))) done.push(id);
  }
  return { done, lay };
}
// A thing to collect (a golem's heart, a vein sigil) or to wind (the metronome), as a map object.
function tokenObject(id, step, t) {
  const wind = step.on === "token" && !step.need, name = String(step.token || "something").replace(/^(a|an|the) /, "");
  return { id: `quest-token:${t.id}`, kind: "questToken", name: name.charAt(0).toUpperCase() + name.slice(1), x: t.x, y: t.y, state: "waiting", actions: [wind ? "wind" : "collect"], quest: id, step: step.key, token: t.id, lore: QUESTS[id].title };
}
// Act on a quest token: collected (a counted step counts it) or wound (its step is done). Returns { ok, done, n, need, step } or
// null when it belongs to nothing waiting.
export function questToken(save, tokenId, at = null) {
  for (const id of QUEST_IDS) {
    if (!questOpen(save, id)) continue; const q = questState(save, id), step = questStep(save, id); if (!step) continue;
    const t = (q.tokens || []).find((k) => k.id === tokenId);
    if (t) { if (t.step !== step.key) return null; q.tokens = q.tokens.filter((k) => k !== t); const fin = tally(save, id, step); return { ok: true, id, done: fin ? [id] : [], n: stepCount(save, id, step.key), need: step.need, step }; }
    if (tokenId === `${id}:${step.key}` && step.on === "token") { // wound where it stands: that Skyland's stair is the place the next step asks for
      if (at && Number.isInteger(at.rx) && Number.isInteger(at.ry)) q.places = [...(q.places || []), { step: step.key, rx: at.rx, ry: at.ry, wound: true }].slice(-QUEST_RECORD.placesMax);
      const fin = mark(save, id, step.key); return { ok: true, id, done: fin ? [id] : [], n: 1, need: 1, step }; }
  }
  return null;
}
// What a quest lays in an area as it loads (`areaId`): the tokens left there, and the metronome on a Skyland climbed from its
// step's place (`skyland`: the stair's section). (`x`, `y`): where to lay a new one (game.ts finds open floor near the Wayfarer.)
export function questLay(save, { areaId = "", skyland = null, x = 0, y = 0 } = {}) {
  recoverLostQuestTokens(save);
  const out = [];
  for (const id of QUEST_IDS) {
    if (!questOpen(save, id)) continue; const q = questState(save, id), step = questStep(save, id);
    for (const t of q.tokens || []) if (t.area === String(areaId) && step && t.step === step.key) out.push(tokenObject(id, step, t));
    // any Skyland climbed from a stair far enough out (the compass points at the nearest; Sky Stairs find no room on some ground)
    if (step?.lay === "skyland" && skyland && Number.isInteger(skyland.rx) && Math.hypot(skyland.rx, skyland.ry) >= (Number(step.far) || 0)) out.push({ ...tokenObject(id, step, { id: `${id}:${step.key}`, x, y }), at: { rx: skyland.rx, ry: skyland.ry } });
  }
  return out;
}

// Forget only tokens whose floor is gone for good. Seed realms cease to exist when their session ends, and a sealed canyon
// cannot be entered again; every other dungeon history remains revisitable and keeps its tokens. Counts already collected are
// deliberately untouched, so recovery can only make room for replacement drops and can never grant quest progress itself.
export function recoverLostQuestTokens(save) {
  let removed = 0;
  const activeRealm = save?.session?.seedRealm?.id;
  for (const id of QUEST_IDS) {
    if (!questOpen(save, id)) continue;
    const q = questState(save, id), step = questStep(save, id); if (!step || !Array.isArray(q.tokens)) continue;
    q.tokens = q.tokens.filter((t) => {
      if (t?.step !== step.key) return true;
      const area = String(t.area || ""), realmGone = area.startsWith("seedrealm:") && area !== activeRealm;
      const canyonGone = !!save?.consequences?.dungeons?.[area]?.canyon?.sealed;
      if (!realmGone && !canyonGone) return true;
      removed++; return false;
    });
  }
  return removed;
}

// ---------------------------------------------------------------- the Journal and the compass
// Where the compass points for a followed quest (types.ts follow { kind: "quest", id: "progress:<id>" }), or null when it is done
// or its step has no section (relaxed). The meal: the giver's section (the Refuge); a delivery: the giver's (giverAt, else the
// Refuge); a place: its section.
export function questTarget(save, id) {
  const Q = QUESTS[id]; if (!Q || !questOpen(save, id)) return null;
  const step = questStep(save, id); if (!step) return null;
  const at = (rx, ry, name) => ({ area: "overworld", rx, ry, kind: "guidance", name });
  if (step.key === "meal") return at(Q.from.rx, Q.from.ry, QUEST_WORDS.giver(Q.giverName));
  if (step.on === "speak") { const g = questState(save, id).giverAt || Q.from; return at(g.rx, g.ry, QUEST_WORDS.speak(Q.giverName)); }
  const p = placeFor(save, id, step);
  return p && !p.relaxed ? at(p.rx, p.ry, Q.title) : null;
}
// The place a step points at: its own, or (`placeOf`) the one an earlier step was given.
const placeFor = (save, id, step) => (step.place ? questPlace(save, id, step.key) : step.placeOf ? stepPlace(save, id, step.placeOf) : null);
// The Journal's quest rows: { id, title, detail, at, follow } for each open quest: its step, how many so far, a time limit's
// seconds left, tokens still lying, and (once a meal holds) how long.
export function questLeads(save) {
  const out = [];
  for (const id of QUEST_IDS) {
    const Q = QUESTS[id]; if (!questOpen(save, id)) continue;
    const step = questStep(save, id); if (!step) continue;
    const q = questState(save, id), p = placeFor(save, id, step), t = questTarget(save, id);
    const left = mealFrom(save, id) ? ` The meal holds for ${Math.max(1, Math.ceil(Number(save.meal.remaining) / 60))} more minute${Math.ceil(Number(save.meal.remaining) / 60) === 1 ? "" : "s"}.` : "";
    const where = p?.relaxed ? ` ${QUEST_WORDS.any(QUEST_WORDS[step.place || ""] || "such a place")}` : !step.place && step.where && QUEST_WORDS[step.where] ? ` Where: ${QUEST_WORDS[step.where]}.` : "";
    const win = step.within && q.window?.step === step.key ? Math.max(0, step.within - (nowOf(save) - q.window.at)) : 0;
    const n = stepCount(save, id, step.key), lying = (q.tokens || []).filter((k) => k.step === step.key).length;
    const counted = step.need ? (win > 0 ? QUEST_WORDS.window(n, step.need, win) : step.within ? "" : n ? QUEST_WORDS.counted(n, step.need) : "") : "";
    out.push({ id, title: Q.title, detail: `${Q.giverName}: ${step.text}${counted}${lying ? QUEST_WORDS.tokens(lying) : ""}${left}${where}`, at: t ? { rx: t.rx, ry: t.ry } : null, follow: { kind: "quest", id: questFollowId(id), name: Q.title } });
  }
  return out;
}
export { openQuestCount } from "./quests.js?v=r1068-1b21ad4d5e6e";
