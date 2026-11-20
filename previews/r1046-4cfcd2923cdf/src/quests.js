// Quests (route b) and thread rewards (route d) (docs/progression-design.md revision 3, Phase 7: sections 2.2 routes b and d, 2.8,
// 3, 6 and 7 row 7; Tim, 2026-11-20). Pure data and rules; imports only random.ts and journey-start.ts, so items.ts (spellOpen),
// constellation.ts and threads.ts (ARCANA_REWARDS) may read it. quest-places.ts resolves a step's place on the map; game.ts
// opens the quests, marks their steps and grants through world-finds.ts grantWorld.
//
// What Exploration now withholds (STORY_WITHHELD): exactly the abilities whose Exploration route is a quest (b) or a thread (d)
// and whose quest or thread is built here, on a journey reading progression table EXPLORATION.table (4) or later. Each stays shut
// until earned (save.feats.earned, route "b" or "d") or kept (save.progression.kept); kept or earned, it is honoured in either
// mode for good. Phase 8's (the R3-R5 and layer quests: far, sea, sky, strange) and the Viscera forms stay open by today's rules
// (STORY_LATER, each with its reason), as do the rows that already had their own route before this phase (STORY_OWN).
//
// Quests (QUESTS). A quest opens when its gate is met (an Aperture band reached, read from the Arcanum), once, and only while its
// ability is still to be found under the journey's rules (Exploration: withheld; Classic: not yet open by today's rules, so a
// Classic journey sees a quest only where it is an extra route). Opening shows a banner, a Journal line and a first-use hint, and
// lists it first in the Journal's Leads; following it ("Point compass here") is accepting it (setCompassChoice). Each step is one
// of the verbs of 2.8 (act, defeat, reach, survive, clear, use) and never a new input. A step that needs a place has it resolved
// once when the quest opens (quest-places.ts: the nearest qualifying ground not yet entered, by cheap hashes, never into the
// void, the open sea, a town or a sealed place), saved in save.quests and never moved; only when that place is spent (entered
// and finished without the quest) is the next one resolved and saved after it. With no qualifying ground inside the search, the
// step relaxes to "any such place" (directed, with no section to point at).
//
// Thread rewards (THREAD_REWARDS, SEEDED_REWARDS). Finishing a carrier (a thread of threads.ts, or the Second Wayfarer's trail)
// grants its ability through threads.ts ARCANA_REWARDS and settleArcanaRewards, as Bell Toll and Lamplighter's Light are earned:
// once, recorded in save.lore.arcanaClaimed. Two rewards are seeded (route d~): the seed picks which of a few threads carries
// each (stream `progression:v4:thread-rewards`), the pick is saved (save.quests.threads) the first time it is read, and a later
// table never moves it. The Arcana card says what the visibility allows: a hinted reward (H) "Something waits at the end",
// a hidden one (X) nothing at all.
//
// Classic (section 6): quests and threads are extra routes. A reward Classic's rules already give pays a small consolation in
// lumen dust and names what it would have taught (world-finds.ts grantWorld); one they do not yet give is given early.
import { hashSeed } from "./random.js?v=r1046-4cfcd2923cdf";
import { exploring, progressionKept } from "./journey-start.js?v=r1046-4cfcd2923cdf";

export const STORY = Object.freeze({
  table: 4, // the progression table that withholds the b and d abilities built here (journey-start.ts EXPLORATION.table)
  stream: "progression:v4:thread-rewards", // the seeded thread rewards' picks
  follow: "progress:", // a quest's compass follow id: { kind: "quest", id: "progress:<quest id>" } (types.ts normalizeCompassFollow)
});

// ---------------------------------------------------------------- quests (route b): design sections 2.8 and 3
//   ability     the progression.ts row it grants
//   gate        { tier } the Aperture band (read from the Arcanum) that opens it
//   giver       the person who gives it (an object id in the world) and their name
//   tier        where it waits (design 2.3); `from` where its places are measured from
//   steps       in order; each { key, verb (2.8), text, place? (a quest-places.ts kind), needs? (the step before, still holding) }
//   offer       the giver's words while the first step waits (`again` once it was done and has lapsed; `waiting` while it holds);
//               `fed` the line as the first step is done; `done` the line on completion (the hook, unhinged as written)
export const QUESTS = Object.freeze({
  "essence-walk": Object.freeze({
    id: "essence-walk", ability: "spell:essence-walk", name: "Essence Walk", title: "The Wrong-Way Broth", visibility: "D",
    gate: Object.freeze({ tier: 13 }), giver: "refuge-farmer", giverName: "Hollis Dray", tier: "R2", from: Object.freeze({ rx: 0, ry: 0 }),
    steps: Object.freeze([
      Object.freeze({ key: "meal", verb: "act", text: "Eat any meal at Hollis Dray's table in the Refuge." }),
      Object.freeze({ key: "starfield", verb: "clear", text: "While the meal lasts, clear a crossing that opens on stars (a Starfield).", place: "starfield", needs: "meal" }),
    ]),
    offer: "Eat first. Then, while it's still in you, find a crossing that opens on stars and clear it. Don't ask me why. The broth goes the wrong way round out there, and then so do you.",
    again: "That meal's worn off. Sit down and have another, then get yourself to the stars before it does again.",
    waiting: "Still in you? Then why are you talking to me? Stars. Go.",
    fed: "The broth sits oddly, as if it is still deciding which way to go. Clear a Starfield crossing before it wears off.",
    done: "Under the stars the broth goes the wrong way round, and so do you: a spell still recovering casts anyway, and your legs pay for it.",
  }),
});
export const QUEST_IDS = Object.freeze(Object.keys(QUESTS));
export const QUEST_FOR = Object.freeze(Object.fromEntries(QUEST_IDS.map((id) => [QUESTS[id].ability, id])));
// A quest's compass follow id, and back.
export const questFollowId = (id) => `${STORY.follow}${id}`;
export const questOfFollow = (fid) => (typeof fid === "string" && fid.startsWith(STORY.follow) && QUESTS[fid.slice(STORY.follow.length)] ? fid.slice(STORY.follow.length) : null);

// ---------------------------------------------------------------- thread rewards (route d): design section 3
//   carrier  the set id threads.ts knows it by (a THREADS key, or "second" for the Second Wayfarer's trail) and its title
//   seen     the design's visibility: H hinted ("something waits at the end"), X hidden
//   hook     the line when it is given (section 3's words)
export const THREAD_REWARDS = Object.freeze({
  second: Object.freeze({ ability: "spell:shadow-clone", name: "Shadow Clone", title: "The Second Wayfarer", seen: "X", hook: "Someone dressed as you leaves you, at the last, what they were." }),
  wellDigger: Object.freeze({ ability: "spell:gravity-well", name: "Gravity Well", title: "The Well-Digger's Rope", seen: "H", hook: "The stone that never stops sinking, in your hand." }),
  toolmaker: Object.freeze({ ability: "arcane-edge", name: "Arcane Edge", title: "The Toolmaker's Handles", seen: "H", hook: "The unshaped stave, worn to your grip, teaches the blade to carry the spell." }),
  clockmaker: Object.freeze({ ability: "pocket-time", name: "Pocket Time", title: "The Clockmaker's Hours", seen: "H", hook: "The last watch still runs, set to yours." }),
  ferry: Object.freeze({ ability: "field:cinder-javelin", name: "Cinder Javelin", title: "The Ferryman's Fares", seen: "H", hook: "The pole he never needed, thrown across." }),
  tollKeys: Object.freeze({ ability: "field:transpose", name: "Transpose", title: "The Tollkeeper's Keys", seen: "H", hook: "The glass key's keyhole, set down as a seal." }),
  tallSlates: Object.freeze({ ability: "field:mages-hand", name: "Mage's Hand", title: "The Tall Child's Slates", seen: "H", hook: "A hand the size of a door, offered gently." }),
  tinkerTags: Object.freeze({ ability: "field:continuous-assault", name: "Continuous Assault", title: "The Tinker's Tags", seen: "X", hook: "Tag 7, burnt into the copper by the robots, and their sky lasers with it." }),
});
// The seeded ones (d~): the seed picks one carrier of each list; the lists never overlap, so no thread carries two.
export const SEEDED_REWARDS = Object.freeze({
  "echoing-cast": Object.freeze({ name: "Echoing Cast", seen: "H", candidates: Object.freeze({
    choir: Object.freeze({ title: "The Choir of Stones", hook: "The chord sings your spells back, quieter." }),
    mirror: Object.freeze({ title: "The Mirror That Remembers", hook: "The mirror remembers your spells too, and says each fourth one again, quieter." }),
    weaver: Object.freeze({ title: "The Weaver's Cloth", hook: "The cloth repeats its pattern every fourth row; now, so do your spells." }),
  }) }),
  "field:wellspring": Object.freeze({ name: "Wellspring Ground", seen: "H", candidates: Object.freeze({
    library: Object.freeze({ title: "The Drowned Library", hook: "The water reads, and now so does the ground." }),
    orchard: Object.freeze({ title: "Seeds for an Orchard", hook: "The ground where the papers were is quick now; whatever you cast on it comes back sooner." }),
    moth: Object.freeze({ title: "The Moth Saint", hook: "The light the moth wanted pools under your spells, and everything in it wakes faster." }),
  }) }),
});
export const SEEDED_IDS = Object.freeze(Object.keys(SEEDED_REWARDS));

// Phase 7 builds these; the rest of the b and d rows wait, open by today's rules (design 7 rows 7-8), or kept their own route.
export const STORY_LATER = Object.freeze({
  "glyph-mine": "Phase 8: a Strange quest (the Hollow Husk)",
  "colossus:alt": "Phase 8: an R5 quest (the Thornglass Caldera)",
  "overflow:alt": "Phase 8: an R5 quest (the Storm Halls)",
  "field:power-aegis": "Phase 8: an R3 quest (a Gate Revenant)",
  "field:arc-wave": "Phase 8: a Sea quest (shipwrecks)",
  "field:corridor-golem": "Phase 8: an Under quest (canyon craters)",
  "field:tempo": "not built: no Ember Foundry Pentagon stands in the world yet (adventures.ts: its theme is not enabled)",
  "field:blade-stream": "not built: no Lamplit City Pentagon stands in the world yet, so no Lamplighter walks anywhere a player can reach",
});
export const STORY_OWN = Object.freeze({
  "companion:hatchling": "its own quest, at Infinite II (Phase 3)",
  "utility:tidemantle": "already a quest today",
  "passive:bell-toll": "the Seven Bells, unchanged (lore.ts ARCANA_UNLOCKS)",
  "passive:lamplight": "the Lamplighter's Round, unchanged (lore.ts ARCANA_UNLOCKS)",
});
export const STORY_WITHHELD = Object.freeze([...QUEST_IDS.map((id) => QUESTS[id].ability), ...Object.values(THREAD_REWARDS).map((r) => r.ability), ...SEEDED_IDS]);
export const STORY_ROUTE_OF = Object.freeze(Object.fromEntries(STORY_WITHHELD.map((id) => [id, QUEST_FOR[id] ? "b" : "d"])));
export const STORY_SEEN = Object.freeze(Object.fromEntries([...QUEST_IDS.map((id) => [QUESTS[id].ability, QUESTS[id].visibility]), ...Object.values(THREAD_REWARDS).map((r) => [r.ability, r.seen]), ...SEEDED_IDS.map((id) => [id, SEEDED_REWARDS[id].seen])]));

const earned = (save, id) => !!save?.feats?.earned && Object.prototype.hasOwnProperty.call(save.feats.earned, id);
// Shut on this journey: Exploration (table 4 on), a b or d ability built here, neither kept nor earned.
export const storyWithheld = (save, id) => Object.prototype.hasOwnProperty.call(STORY_ROUTE_OF, id) && exploring(save) && !progressionKept(save, id) && !earned(save, id);

// ---------------------------------------------------------------- the seeded thread rewards (route d~)
// The pick for a seed: each seeded ability's candidates in their seeded order, the first. Pure: the same seed, the same pick.
export function seededPick(seed) {
  const out = {};
  for (const id of SEEDED_IDS) {
    const c = Object.keys(SEEDED_REWARDS[id].candidates);
    out[id] = [...c].sort((a, b) => hashSeed(`${seed}:${STORY.stream}:${id}:${a}`) - hashSeed(`${seed}:${STORY.stream}:${id}:${b}`) || (a < b ? -1 : 1))[0];
  }
  return out;
}
// The journey's picks: saved the first time they are read (save.quests.threads), and read from there ever after.
export function seededThreads(save) {
  const saved = save?.quests?.threads, pick = seededPick(save?.seed), out = {};
  for (const id of SEEDED_IDS) out[id] = saved && SEEDED_REWARDS[id].candidates[saved[id]] ? saved[id] : pick[id];
  if (save?.quests && typeof save.quests === "object") save.quests.threads = { ...(saved || {}), ...out };
  return out;
}
// What finishing carrier `setId` gives on this journey: { ability, name, title, seen, hook, kind, id, label } or null.
export function threadReward(save, setId) {
  const f = THREAD_REWARDS[setId];
  if (f) return { ...f, kind: "ability", id: f.ability, label: `${f.name} · ${f.title}` };
  const picks = seededThreads(save);
  for (const id of SEEDED_IDS) if (picks[id] === setId) { const S = SEEDED_REWARDS[id], c = S.candidates[setId]; return { ability: id, name: S.name, title: c.title, seen: S.seen, hook: c.hook, kind: "ability", id, label: `${S.name} · ${c.title}` }; }
  return null;
}
// Every carrier that may give something (for threads.ts ARCANA_REWARDS).
export const REWARD_CARRIERS = Object.freeze([...Object.keys(THREAD_REWARDS), ...SEEDED_IDS.flatMap((id) => Object.keys(SEEDED_REWARDS[id].candidates))]);
// The carrier of a d ability on this journey (its set id), or null.
export function carrierOf(save, abilityId) {
  for (const [set, r] of Object.entries(THREAD_REWARDS)) if (r.ability === abilityId) return set;
  return SEEDED_REWARDS[abilityId] ? seededThreads(save)[abilityId] : null;
}

// ---------------------------------------------------------------- quest state (save.quests.open; journey-start.ts ensureQuests)
//   state  "open" | "done"
//   at     play seconds when it opened
//   steps  { [step key]: play seconds when done }
//   places [{ step, rx, ry, dungeon?, relaxed? }]: the places resolved for its steps, in order; the last for a step is its place now
export const questState = (save, id) => save?.quests?.open?.[id] || null;
export const questOpen = (save, id) => questState(save, id)?.state === "open";
// The step waiting now (the first not done), or null when every step is done.
export function questStep(save, id) {
  const Q = QUESTS[id], q = questState(save, id); if (!Q || !q) return null;
  for (const s of Q.steps) if (!stepDone(save, id, s.key)) return s;
  return null;
}
// A step is done when marked; a step that `needs` another holds only while that one still holds (the meal: while it lasts).
export function stepDone(save, id, key) {
  const q = questState(save, id); if (!q) return false;
  if (key === "meal") return mealFrom(save, id);
  return Number.isFinite(Number(q.steps?.[key]));
}
// The meal eaten for quest `id` at its giver's table is still in effect (meals.ts: save.meal, replaced by any other meal).
export const mealFrom = (save, id) => !!save?.meal && Number(save.meal.remaining) > 0 && save.meal.quest === id;
// The place a step points at now (the last resolved for it), or null.
export const stepPlace = (save, id, key) => { const list = questState(save, id)?.places; if (!Array.isArray(list)) return null; for (let i = list.length - 1; i >= 0; i--) if (list[i]?.step === key) return list[i]; return null; };
// Whether quest `id` may open on this journey now: its gate met, not opened before, and its ability still to be found under the
// journey's rules (`open` tells whether Classic's rules already give it; Exploration: withheld).
export function questDue(save, id, tier, classicHas = false) {
  const Q = QUESTS[id]; if (!Q || questState(save, id)) return false;
  if (Number(tier) < Q.gate.tier) return false;
  return exploring(save) ? storyWithheld(save, Q.ability) : !classicHas && !earned(save, Q.ability) && !progressionKept(save, Q.ability);
}
