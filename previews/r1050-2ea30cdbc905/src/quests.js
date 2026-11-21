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
//
// Phase 8 (docs/progression-design.md revision 3, 2.2 routes b and V, 2.3, 3 and 7 row 8; Tim, 2026-11-20): the remaining quests,
// far (R3, R5), sea, sky, under and strange, and the four Divine Viscera forms. On progression table 5 (STORY.table) Exploration
// withholds the whole designed set: every b, d and V row, each until earned (save.feats.earned) or kept. Tempo and Blade Stream
// were designed for Ember Foundry and Lamplit City Pentagons, two themes not in the world (adventures.ts `since` null); they are
// moved to places that stand (Tim, 2026-11-20): Tempo's metronome to a Skyland at least 50 sections out (a skyway-only find),
// Blade Stream's lamps to the Heart of any Pentagon (always Tomb-built: "Lamps for the Heart: forty"). Four abilities exist only
// past 1,000 sections: Ember Mend and Wellspring (quests that open once the Wayfarer has stood 1,000 sections out), Mage's Hand
// and Continuous Assault (far threads, Phase 7). At most QUEST_LIMIT.open directed quests are open at once (G2); the rest wait.
import { hashSeed } from "./random.js?v=r1050-2ea30cdbc905";
import { exploring, progressionKept } from "./journey-start.js?v=r1050-2ea30cdbc905";

export const STORY = Object.freeze({
  table: 5, // the progression table that withholds every b, d and V ability (journey-start.ts EXPLORATION.table); Phase 7's was 4
  phase7Table: 4, // the table Phase 7 withheld its eleven on (journey-start.ts EXPLORATION.storyTable)
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
  // ---- Phase 8. Step fields beyond Phase 7's: `on` the event that moves it (game.ts reports each: kill, token, speak, salvage,
  // clear, home), `kind` the creature, `where` a tag of the area it must happen in (game.ts questWhere), `need` how many, `token`
  // a thing each kill leaves to collect with Act (its name), `at` the giver's object id for a delivery, `with` the tool equipped,
  // `cond` aegis (the creature's blow was turned by the Aegis) or force (Force Channel holds), `far` the least straight-line
  // distance from the Ember Refuge, `within` seconds from the first to the last (a time limit), `atPlace` only at the step's place
  // (`placeOf`: the place another step was given), `lay` a thing laid where the step happens (the metronome, on a Skyland).
  "corridor-golem": Object.freeze({
    id: "corridor-golem", ability: "field:corridor-golem", name: "Corridor Golem", title: "Five Hearts of Clay", visibility: "D",
    gate: Object.freeze({ tier: 3 }), giver: "quarry-keeper", giverName: "Shale", tier: "Under", from: Object.freeze({ rx: 0, ry: 0 }),
    steps: Object.freeze([
      Object.freeze({ key: "golems", verb: "defeat", on: "kill", kind: "earthGolem", where: "canyon", need: 5, token: "a golem's heart", text: "Defeat five Earth Golems in canyon craters, and Act: collect the heart each one leaves.", place: "canyon" }),
      Object.freeze({ key: "shale", verb: "act", on: "speak", at: "quarry-keeper", text: "Give the five hearts to Shale at the Refuge quarry.", needs: "golems" }),
    ]),
    offer: "Golems. In the craters, where the sky fell. Bring me their hearts, five, and I'll show you what stone does when it's asked nicely.",
    waiting: "Five hearts. Clay ones. They're warm, you'll know them.",
    deliver: "Shale stacks the five hearts one on another. A small stone man stands up, looks at you, and waits for orders.",
    done: "Shale stacks the five hearts and a small man of stone stands up: now your Hammerfall raises one wherever it lands.",
  }),
  tempo: Object.freeze({
    id: "tempo", ability: "field:tempo", name: "Tempo", title: "The Metronome in the Sky", visibility: "D",
    gate: Object.freeze({ tier: 6 }), giver: "vendor-vela", giverName: "Vela", tier: "Sky", from: Object.freeze({ rx: 0, ry: 0 }),
    steps: Object.freeze([
      Object.freeze({ key: "wind", verb: "act", on: "token", lay: "skyland", token: "a metronome", text: "Climb any Sky Stair at least 50 sections from the Ember Refuge, and Act: wind the metronome on its first island.", place: "skyway", far: 50 }),
      Object.freeze({ key: "beat", verb: "clear", on: "clear", what: "skyland", atPlace: true, text: "Clear that Skyland: defeat everything that starts moving on the metronome's beat.", placeOf: "wind", needs: "wind" }),
    ]),
    offer: "Someone traded me a metronome that won't stop. I sent it up a Sky Stair, far out, fifty sections or more. Go and wind it. Then see what dances.",
    waiting: "Wound it yet? Whatever's up there moves on its beat now. Better you than me.",
    done: "Everything that came moved on the metronome's beat, and so, now, do you: every fifth blow on one foe opens a window.",
  }),
  "blade-stream": Object.freeze({
    id: "blade-stream", ability: "field:blade-stream", name: "Blade Stream", title: "Forty Lamps for the Heart", visibility: "D",
    gate: Object.freeze({ tier: 6 }), giver: "warden-oren", giverName: "Oren", tier: "Strange", from: Object.freeze({ rx: 0, ry: 0 }),
    steps: Object.freeze([
      Object.freeze({ key: "lamps", verb: "defeat", on: "kill", kind: "graveLantern", where: "pentagon", need: 3, within: 120, text: "In a Pentagon, defeat three Grave Lanterns before the first relights its lamp (two minutes from the first).", place: "pentagon" }),
    ]),
    offer: "The Pentagon's ledger asked for forty lamps for the Heart. Somebody carries them still. Put out three before the first one lights again, and come back with your blades singing.",
    waiting: "Three lamps, and quick. The first one's patient. It'll wait two minutes, no more.",
    done: "The lamps go out one after another, too quick to relight, and their light stays in your blades as a storm.",
  }),
  "glyph-mine": Object.freeze({
    id: "glyph-mine", ability: "glyph-mine", name: "Glyph Mine", title: "Sigils from the Hollow Husk", visibility: "D",
    gate: Object.freeze({ tier: 8 }), giver: "keeper-sela", giverName: "Sela", tier: "Strange", from: Object.freeze({ rx: 0, ry: 0 }),
    steps: Object.freeze([
      Object.freeze({ key: "wraiths", verb: "defeat", on: "kill", kind: "veinWraith", where: "husk", need: 5, token: "a vein sigil", text: "Plant a Pumice Seed at a Watcher's shrine; in the Hollow Husk defeat five Vein Wraiths and Act: collect their sigils." }),
      Object.freeze({ key: "sela", verb: "act", on: "speak", at: "keeper-sela", text: "Bring the five sigils to Sela in the Refuge.", needs: "wraiths" }),
    ]),
    offer: "The ore in the Hollow Husk walked away and took its sigils with it. Five, please. A Pumice Seed at a Watcher's shrine will take you there.",
    waiting: "Five sigils. They hum when you hold them; that's how you know they're the ones.",
    deliver: "Sela turns the five sigils over, chooses one, and sets it under your feet. It stays there.",
    done: "Sela sets one sigil under your feet and it stays: your spells leave sigils that burst, and your Rift Steps leave mines.",
  }),
  "arc-wave": Object.freeze({
    id: "arc-wave", ability: "field:arc-wave", name: "Arc Wave", title: "Three Wrecks and a Blunderbuss", visibility: "D",
    gate: Object.freeze({ tier: 8 }), giver: "vendor-vela", giverName: "Vela", tier: "Sea", from: Object.freeze({ rx: 0, ry: 0 }),
    steps: Object.freeze([
      Object.freeze({ key: "wrecks", verb: "act", on: "salvage", with: "blunderbuss", need: 3, text: "Sail out and Act: salvage three shipwrecks with the Blunderbuss equipped.", place: "wreck" }),
    ]),
    offer: "Wreck salvage sells. Wreck salvage taken with a Blunderbuss on your hip sells better; don't ask me why. Three wrecks. You'll want a boat.",
    waiting: "A Blunderbuss on you when you salvage, mind. The sea notices.",
    done: "Three wrecks salvaged with the Blunderbuss on your hip, and the sea's crescent swell goes into it: it fires waves now.",
  }),
  "power-aegis": Object.freeze({
    id: "power-aegis", ability: "field:power-aegis", name: "Power Aegis", title: "The Revenant's Respect", visibility: "D",
    gate: Object.freeze({ tier: 11 }), giver: "warden-oren", giverName: "Oren", tier: "R3", from: Object.freeze({ rx: 0, ry: 0 }),
    steps: Object.freeze([
      Object.freeze({ key: "revenant", verb: "use", on: "kill", kind: "gateRevenant", cond: "aegis", far: 50, text: "At least 50 sections from the Ember Refuge, use Aegis to turn a Gate Revenant's blow, then defeat it.", place: "revenant" }),
    ]),
    offer: "You can block a blow now. Good. Go out past fifty sections and turn a Gate Revenant's with your Aegis, then put it down. It'll respect that.",
    waiting: "A Revenant's blow, turned by the Aegis, then the Revenant down. Fifty sections out or more. They're thicker out there.",
    done: "The Revenant is impressed, in its way: a perfect Aegis now strikes back.",
  }),
  "ember-mend": Object.freeze({
    id: "ember-mend", ability: "colossus:alt", name: "Ember Mend", title: "The Caldera's Patience", visibility: "D",
    gate: Object.freeze({ tier: 13, far: 1000 }), giver: null, giverName: "the far road", tier: "R5", from: Object.freeze({ rx: 0, ry: 0 }),
    steps: Object.freeze([
      Object.freeze({ key: "caldera", verb: "survive", on: "home", what: "questingBeast", text: "Reach the Thornglass Caldera and survive there until the Questing Beast comes home.", place: "caldera" }),
    ]),
    opened: "A thousand sections out, the ground is warm under your feet, as if a fire you once fed is asking after you. Somewhere out here is the caldera the Questing Beast was made in.",
    done: "You waited in the caldera until its beast came home, and the fire there took you for its own: Ember Form mends you as it burns.",
  }),
  wellspring: Object.freeze({
    id: "wellspring", ability: "overflow:alt", name: "Wellspring", title: "The Robots Hum Along", visibility: "D",
    gate: Object.freeze({ tier: 13, far: 1000 }), giver: null, giverName: "the far road", tier: "R5", from: Object.freeze({ rx: 0, ry: 0 }),
    steps: Object.freeze([
      Object.freeze({ key: "warden", verb: "defeat", on: "kill", kind: "coilWarden", cond: "force", where: "storm", text: "In the Storm Halls, defeat a Coil Warden while Force Channel holds.", place: "storm" }),
    ]),
    opened: "A thousand sections out, your Force Channel hums on its own for a moment, in tune with something far off: coils, and the people of the Storm Halls.",
    done: "The Coil Warden falls inside your Force Channel and the robots hum along: while it holds, your skills come back sooner.",
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

// Phase 7 built Essence Walk and the threads; Phase 8 builds the rest (above), so nothing of the b and d rows waits any more. The
// two Pentagon quests whose themes are not in the world were moved, not left open (Tim, 2026-11-20): MOVED says where.
export const STORY_LATER = Object.freeze({});
export const MOVED = Object.freeze({
  "field:tempo": "designed for an Ember Foundry Pentagon's heart room (a theme not in the world): moved to a Skyland at least 50 sections out",
  "field:blade-stream": "designed for a Lamplit City Pentagon's Lamplighters (a theme not in the world): moved to the Grave Lanterns of any Pentagon",
});
// Divine Viscera (route V, design 2.2 and 3.4): the four plainest stat forms, bought at Sela's forge or any smith once refinement
// is open (past 1,000 sections, items.ts unlockRefinement), and the rumour: pay to turn the nearest unknown ability into a
// hinted lead. Prices in Divine Viscera (save.skylands.viscera), as data.
export const VISCERA_SHOP = Object.freeze({
  forms: Object.freeze({ "light-feet:alt": 8, "thorned-veil:alt": 8, "amplifier:alt": 10, "fold:alt": 10 }),
  rumour: 3,
});
export const VISCERA_IDS = Object.freeze(Object.keys(VISCERA_SHOP.forms));
export const STORY_OWN = Object.freeze({
  "companion:hatchling": "its own quest, at Infinite II (Phase 3)",
  "utility:tidemantle": "already a quest today",
  "passive:bell-toll": "the Seven Bells, unchanged (lore.ts ARCANA_UNLOCKS)",
  "passive:lamplight": "the Lamplighter's Round, unchanged (lore.ts ARCANA_UNLOCKS)",
});
export const STORY_WITHHELD = Object.freeze([...QUEST_IDS.map((id) => QUESTS[id].ability), ...Object.values(THREAD_REWARDS).map((r) => r.ability), ...SEEDED_IDS, ...VISCERA_IDS]);
export const STORY_ROUTE_OF = Object.freeze(Object.fromEntries(STORY_WITHHELD.map((id) => [id, QUEST_FOR[id] ? "b" : VISCERA_SHOP.forms[id] ? "V" : "d"])));
export const STORY_SEEN = Object.freeze(Object.fromEntries([...QUEST_IDS.map((id) => [QUESTS[id].ability, QUESTS[id].visibility]), ...Object.values(THREAD_REWARDS).map((r) => [r.ability, r.seen]), ...SEEDED_IDS.map((id) => [id, SEEDED_REWARDS[id].seen]), ...VISCERA_IDS.map((id) => [id, "D"])]));
// The table each is first withheld on: Phase 7's eleven on table 4, Phase 8's on table 5 (progression.ts adoptExploration keeps,
// for a journey from before, those today's rules had open).
export const PHASE7_STORY = Object.freeze(["spell:essence-walk", ...Object.values(THREAD_REWARDS).map((r) => r.ability), ...SEEDED_IDS]);
export const STORY_SINCE = Object.freeze(Object.fromEntries(STORY_WITHHELD.map((id) => [id, PHASE7_STORY.includes(id) ? STORY.phase7Table : STORY.table])));

// Phase 8: a rumour bought with Divine Viscera (world-finds.ts buyVisceraRumour) about `id`, still unfound, or null: { where }.
export function boughtRumour(save, id) {
  if (earned(save, id) || progressionKept(save, id)) return null;
  const r = (Array.isArray(save?.leads?.rumours) ? save.leads.rumours : []).find((q) => q?.kind === "viscera" && q.ability === id);
  return r ? { where: typeof r.where === "string" && r.where ? r.where : "somewhere out there" } : null;
}
const earned = (save, id) => !!save?.feats?.earned && Object.prototype.hasOwnProperty.call(save.feats.earned, id);
// Shut on this journey: Exploration (table 5 on), a b, d or V ability, neither kept nor earned.
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
//   places [{ step, rx, ry, dungeon?, relaxed?, miss? }]: the places resolved for its steps, in order; the last for a step is its
//          place now (`miss`: found without what it should hold, so the next is resolved)
//   counts { [step key]: how many } (Phase 8: a step with `need`); window { step, at, n } (a step with `within`: since the first)
//   tokens [{ id, step, area, x, y }]: things a kill left to collect (Act), laid again whenever their area loads
//   giverAt { rx, ry }: where the giver stands (game.ts: the quarry keeper moves with the Wayfarer's home)
export const QUEST_LIMIT = Object.freeze({ open: 3 }); // G2: at most this many directed quests open at once; the rest wait
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
// How many of a counted step are done (0 for any other).
export const stepCount = (save, id, key) => Math.max(0, Math.floor(Number(questState(save, id)?.counts?.[key]) || 0));
// The meal eaten for quest `id` at its giver's table is still in effect (meals.ts: save.meal, replaced by any other meal).
export const mealFrom = (save, id) => !!save?.meal && Number(save.meal.remaining) > 0 && save.meal.quest === id;
// The place a step points at now (the last resolved for it), or null.
export const stepPlace = (save, id, key) => { const list = questState(save, id)?.places; if (!Array.isArray(list)) return null; for (let i = list.length - 1; i >= 0; i--) if (list[i]?.step === key) return list[i]; return null; };
export const openQuestCount = (save) => QUEST_IDS.filter((id) => questOpen(save, id)).length;
// The farthest the Wayfarer has stood from the Ember Refuge (straight line, in sections), read from save.explored; kept per count.
let farMemo = { save: null, n: -1, d: 0 };
export function farthest(save) {
  const ex = save?.explored && typeof save.explored === "object" ? save.explored : {}, keys = Object.keys(ex);
  if (farMemo.save === save && farMemo.n === keys.length) return farMemo.d;
  let d = 0; for (const k of keys) { const i = k.indexOf(","); const x = Number(k.slice(0, i)), y = Number(k.slice(i + 1)); const h = Math.hypot(x, y); if (h > d) d = h; }
  farMemo = { save, n: keys.length, d }; return d;
}
// Whether quest `id` may open on this journey now: its gate met (the Aperture band; for the far ones, 1,000 sections stood), not
// opened before, fewer than QUEST_LIMIT.open open, and its ability still to be found under the journey's rules (`classicHas`
// tells whether Classic's rules already give it; Exploration: withheld).
export function questDue(save, id, tier, classicHas = false) {
  const Q = QUESTS[id]; if (!Q || questState(save, id)) return false;
  if (Number(tier) < Q.gate.tier) return false;
  if (Q.gate.far && farthest(save) < Q.gate.far) return false;
  if (openQuestCount(save) >= QUEST_LIMIT.open) return false;
  return exploring(save) ? storyWithheld(save, Q.ability) : !classicHas && !earned(save, Q.ability) && !progressionKept(save, Q.ability);
}
