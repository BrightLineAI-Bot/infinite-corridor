// Quest places and quest state (docs/progression-design.md revision 3, Phase 7: 2.5 G4, 2.8, 4.3; the rules: quests.ts). A step
// that needs a place has it resolved once, from cheap hashes (no section is built, as wonders.ts and world-leads.ts find theirs),
// saved in save.quests and never moved: the nearest qualifying ground not yet entered, measured from the quest's `from`, within
// QUEST_PLACES.radius sections. Never the void, the open sea (an island's crossing needs a boat), a town, the Far Sleep (its
// crossings may be Sleeper's Halls) or a crossing that may roll a Poison Crypt instead. Only when that place is spent (entered and
// finished without the quest) is the next one resolved and saved after it; with none inside the search the step relaxes to "any
// such place". game.ts opens quests and marks their steps; main.ts lists them (questLeads); atlas-view.ts points the compass.
import { rng, hashSeed } from "./random.js?v=r1047-4d19e13c4646";
import { dungeonId, regionSettled, CROSSING_ROLLS } from "./world.js?v=r1047-4d19e13c4646";
import { WONDERS } from "./wonders.js?v=r1047-4d19e13c4646";
import { openSeaQuick, farSleepSection } from "./landscape.js?v=r1047-4d19e13c4646";
import { rollMireCrypt } from "./underlands.js?v=r1047-4d19e13c4646";
import { annexRecord } from "./deep-annex.js?v=r1047-4d19e13c4646";
import { ensureQuests, QUEST_RECORD } from "./journey-start.js?v=r1047-4d19e13c4646";
import { QUESTS, QUEST_IDS, questState, questOpen, questStep, stepDone, stepPlace, mealFrom, questFollowId } from "./quests.js?v=r1047-4d19e13c4646";

export const QUEST_PLACES = Object.freeze({
  radius: 24, // sections searched round a quest's `from` (Chebyshev rings), a few thousand hashes at most, once
  layoutPool: 5, // game.ts: the layout pool every crossing first generated from now on takes (the Poison Crypt roll reads it)
});
export const QUEST_WORDS = Object.freeze({
  open: "A QUEST", done: "QUEST COMPLETE",
  any: (what) => `${what}: any one will do (none lies close enough to point the compass at).`,
  starfield: "a crossing that opens on stars",
  giver: (name) => `${name}'s table`,
  first: "A quest: the Journal's Leads say what and where. Point the compass at it to follow.",
});

// ---------------------------------------------------------------- places
// A Starfield crossing at section (x, y) not yet entered, or null: the section's landmark crossing (world.ts addDungeonLandmark's
// own draws), its Starfield roll (game.ts chasmRoll; wonders.ts keeps the chance equal), and nothing that would make it something
// else on first entry (game.ts generateDungeonFor: a Poison Crypt, unless it is a Deep Annex's first floor; the Far Sleep's halls).
export function starfieldAt(save, x, y) {
  const seed = save?.seed, gen = Number(save?.worldGeneration) || 1;
  if ((x === 0 && y === 0) || regionSettled(x, y, seed) || farSleepSection(x, y)) return null;
  const r = rng(`${seed}:${CROSSING_ROLLS[0].key}:g${gen}:${x}:${y}`); if (r() >= CROSSING_ROLLS[0].chance) return null; r(); // its spot
  const id = dungeonId(seed, gen, x, y, `dungeon-g${gen}-${x}-${y}-${Math.floor(r() * 1e6)}`);
  if ((hashSeed(`${seed}:chasm-crossing:v1:${id}`) % 1000) / 1000 >= WONDERS.chasmChance) return null;
  if (!annexRecord(seed, id, true) && rollMireCrypt(seed, id, QUEST_PLACES.layoutPool)) return null; // it might be a Poison Crypt
  if (openSeaQuick(seed, x, y)) return null; // an island's crossing: no boat asked for
  const h = save?.consequences?.dungeons?.[id];
  if ((h && (h.generatorVersion !== undefined || (Number(h.visits) || 0) > 0)) || save?.session?.areas?.[id]) return null; // entered before
  return { rx: x, ry: y, dungeon: id };
}
const FINDERS = Object.freeze({ starfield: starfieldAt });
function ringScan(rx, ry, radius, at) {
  for (let d = 0; d <= radius; d++) for (let i = 0; i < Math.max(1, 8 * d); i++) {
    const side = Math.floor(i / Math.max(1, 2 * d)), k = i % Math.max(1, 2 * d), x = rx + (d ? [-d + k, d, d - k, -d][side] : 0), y = ry + (d ? [-d, -d + k, d, d - k][side] : 0);
    const q = at(x, y); if (q) return { ...q, d };
  }
  return null;
}
// A place used up without the quest: its crossing entered and finished (its guardian down).
export const placeSpent = (save, p) => !!p?.dungeon && !!(save?.consequences?.dungeons?.[p.dungeon]?.guardianDefeated || save?.consequences?.dungeons?.[p.dungeon]?.resolved);
// The place step `key` of quest `id` points at: the one saved, while it is not spent; else the next, resolved now and saved.
export function questPlace(save, id, key) {
  const Q = QUESTS[id], step = Q?.steps.find((s) => s.key === key), q = questState(save, id); if (!step?.place || !q) return null;
  const cur = stepPlace(save, id, key);
  if (cur && (cur.relaxed || !placeSpent(save, cur))) return cur;
  const find = FINDERS[step.place], hit = find ? ringScan(Q.from.rx, Q.from.ry, QUEST_PLACES.radius, (x, y) => find(save, x, y)) : null;
  const p = hit ? { step: key, rx: hit.rx, ry: hit.ry, ...(hit.dungeon ? { dungeon: hit.dungeon } : {}) } : { step: key, relaxed: true };
  q.places = [...(Array.isArray(q.places) ? q.places : []), p].slice(-QUEST_RECORD.placesMax);
  return p;
}

// ---------------------------------------------------------------- opening and the steps
const record = (save) => (save?.quests?.open && typeof save.quests.open === "object" ? save.quests : ensureQuests(save));
// Opens quest `id` (once): its record, and every step's place resolved and saved. Returns the record.
export function openQuest(save, id) {
  const Q = QUESTS[id]; if (!Q) return null;
  const R = record(save); if (R.open[id]) return R.open[id];
  R.open[id] = { state: "open", at: Math.floor(Math.max(0, Number(save.playSeconds) || 0)), steps: {}, places: [] };
  for (const s of Q.steps) if (s.place) questPlace(save, id, s.key);
  return R.open[id];
}
// The giver's words for the quests open with them (`giverId`, an object id), or null.
export function questTalk(save, giverId) {
  for (const id of QUEST_IDS) {
    const Q = QUESTS[id]; if (Q.giver !== giverId || !questOpen(save, id)) continue;
    const step = questStep(save, id); if (!step) continue;
    if (step.key === "meal") return Number.isFinite(Number(questState(save, id).steps?.meal)) ? Q.again : Q.offer;
    return Q.waiting || null;
  }
  return null;
}
// A meal eaten at `giverId`'s table: each open quest whose step waits for it marks the meal as its own (it holds while the meal
// lasts; any other meal replaces it). Returns the lines to say.
export function questMeal(save, giverId) {
  const out = [];
  for (const id of QUEST_IDS) {
    const Q = QUESTS[id]; if (Q.giver !== giverId || !questOpen(save, id) || !save.meal) continue;
    if (!Q.steps.some((s) => s.key === "meal") || questStep(save, id)?.key !== "meal") continue;
    save.meal.quest = id; questState(save, id).steps.meal = Math.floor(Math.max(0, Number(save.playSeconds) || 0)); out.push(Q.fed);
  }
  return out;
}
// A place of kind `place` cleared (a Starfield crossing): each open quest whose waiting step asks for it, with the steps it
// needs still holding, takes it. Returns the ids of quests that are now complete (marked done; world-finds.ts grants them).
export function questClear(save, place) {
  const out = [];
  for (const id of QUEST_IDS) {
    if (!questOpen(save, id)) continue;
    const step = questStep(save, id); if (!step || step.place !== place || (step.needs && !stepDone(save, id, step.needs))) continue;
    const q = questState(save, id); q.steps[step.key] = Math.floor(Math.max(0, Number(save.playSeconds) || 0));
    if (!questStep(save, id)) { q.state = "done"; if (save.meal?.quest === id) delete save.meal.quest; out.push(id); }
  }
  return out;
}

// ---------------------------------------------------------------- the Journal and the compass
// Where the compass points for a followed quest (types.ts follow { kind: "quest", id: "progress:<id>" }), or null when it is done
// or its step has no section (relaxed). The meal: the giver's section (the Refuge); a place: its section.
export function questTarget(save, id) {
  const Q = QUESTS[id]; if (!Q || !questOpen(save, id)) return null;
  const step = questStep(save, id); if (!step) return null;
  const at = (rx, ry, name) => ({ area: "overworld", rx, ry, kind: "guidance", name });
  if (step.key === "meal") return at(Q.from.rx, Q.from.ry, QUEST_WORDS.giver(Q.giverName));
  const p = step.place ? questPlace(save, id, step.key) : null;
  return p && !p.relaxed ? at(p.rx, p.ry, Q.title) : null;
}
// The Journal's quest rows: { id, title, detail, at, follow } for each open quest, its step and (once a meal holds) how long.
export function questLeads(save) {
  const out = [];
  for (const id of QUEST_IDS) {
    const Q = QUESTS[id]; if (!questOpen(save, id)) continue;
    const step = questStep(save, id); if (!step) continue;
    const p = step.place ? questPlace(save, id, step.key) : null, t = questTarget(save, id);
    const left = mealFrom(save, id) ? ` The meal holds for ${Math.max(1, Math.ceil(Number(save.meal.remaining) / 60))} more minute${Math.ceil(Number(save.meal.remaining) / 60) === 1 ? "" : "s"}.` : "";
    const where = p?.relaxed ? ` ${QUEST_WORDS.any(QUEST_WORDS[step.place] || "such a place")}` : "";
    out.push({ id, title: Q.title, detail: `${Q.giverName}: ${step.text}${left}${where}`, at: t ? { rx: t.rx, ry: t.ry } : null, follow: { kind: "quest", id: questFollowId(id), name: Q.title } });
  }
  return out;
}
export const openQuestCount = (save) => QUEST_IDS.filter((id) => questOpen(save, id)).length;
