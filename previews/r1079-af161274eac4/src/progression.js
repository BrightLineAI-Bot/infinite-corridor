// The progression table (docs/progression-design.md, revision 3; Phase 1, "the spine"). Pure data and pure reads: nothing
// in the table grants, gates, removes or saves anything, and nothing in the game reads it to decide what the Wayfarer may do.
// Phase 2 (at the end of this file) adds the two things that write: a new journey's start (startJourney: the mode, the start
// version, the chosen weapon and tool, Exploration's Aegis) and the mode switch (switchProgression), both on save.progression.
//
// One row per player ability in the design's inventory (section 1): disciplines, spells, Constellation nodes and their
// secondary forms, Lattice field passives, the Arcana passives, weapon arts and tool forms, awakened moves, weapons, tools,
// armour and charm, Echoes, the glyph families, marginalia and supplies, mounts and companions, traversal and utility. Each row:
//   id          the code's own key, in its own namespace: "skill:<id>" and "spell:<id>" (spell-slots.ts CASTABLES), a bare node id
//               (constellation.ts BRANCHES), "<node>:alt" (ALT_PASSIVES, as the Lattice keys it), "field:<id>" (lattice-fields.ts
//               FIELD_KEYS and TOOL_FORM_KEYS), "passive:<id>" (lore.ts ARCANA_UNLOCKS), "awakened:<id>" (weapon-arts.ts
//               AWAKENED_IDS), "gear:<key>" (items.ts WEAPON_SCALING / TOOL_SCALING keys; armour and charm by name), "echo:<id>"
//               (echoes.ts ECHO_IDS), "glyph:", "resonance:", "triad:", "pairing:", "tesseract:", "marginalia:", "potion:",
//               "meal:", "supply:", "mount:", "companion:", "utility:" and "seed:" likewise.
//   group       GROUPS below; archetypes: ARCHETYPES (the design's 2.5 table; empty means general).
//   v0          today's rules (Classic): { route, how, gate } — the route code (ROUTES), how it is obtained today, and the
//               power gate as data ({ aperture } | { tier } | { level } | { listeners }), or null.
//   v1          the Exploration proposal (section 3): { route, where }. Not live: Phase 3 onward reads it.
//   tier        where it waits under v1 (TIERS: a ring R0-R5 or a layer), or null when it is not placed.
//   pool        the v1 pool, from the v1 route: start, core, world, reliquary, viscera or found.
//   visibility  the v1 "Seen" column: D directed, H hinted, X hidden.
//   hint        the one-line first-use hint (section 4A.2); controls: how to use it, touch first, keys in brackets.
//   obtained    the compendium's "how it was obtained" phrasing under today's rules.
//   own         how ownershipV0 reads the save (today's rules): a kind and its argument.
// What each one does is read from the game's own tables (doesText), so the how-to never drifts from the game.
//
// The compendium (compendium()) and the Pace line (pace()) read the save as it is; nothing new is saved.
import { SPELLS, APERTURE_SKILLS, APERTURE_BANDS, apertureBand, skillRank, spellOpen, spellOpenClassic, explorationGateOpen, weaponKey, toolKey, WEAPON_SCALING, TOOL_SCALING, SCALING_LABELS, FOURFOLD_DAGGERS, QUANDRIX_STAFF } from "./items.js?v=r1079-af161274eac4";
import { ensureProgression, progressionMode, progressionKept, modeInfo, PROGRESSION_MODES, PROGRESSION_RECORD, START_FRAME, saveFrame, EXPLORATION, exploring } from "./journey-start.js?v=r1079-af161274eac4";
import { freshViewportState } from "./foundry.js?v=r1079-af161274eac4";
import { ensureSlots, PRESETS } from "./spell-slots.js?v=r1079-af161274eac4";
import { BRANCHES, ALT_PASSIVES, hasNode, altUnlocked } from "./constellation.js?v=r1079-af161274eac4";
import { FIELD_PASSIVES, TOOL_FORMS } from "./lattice-fields.js?v=r1079-af161274eac4";
import { latticeOpen, TRANSIT_LATTICE } from "./transit-lattice.js?v=r1079-af161274eac4";
import { AWAKENED_ARTS } from "./weapon-arts.js?v=r1079-af161274eac4";
import { HAMMER_CLAP } from "./brawler-spells.js?v=r1079-af161274eac4";
import { ECHOES, MINION_ECHOES } from "./echoes.js?v=r1079-af161274eac4";
import { MONSTER_PACK } from "./monster-pack.js?v=r1079-af161274eac4";
import { GLYPHS, RESONANCES, TRIADS } from "./glyphs.js?v=r1079-af161274eac4";
import { PAIRINGS } from "./spell-slots.js?v=r1079-af161274eac4";
import { TESSERACTS, tesseractClass } from "./tesseracts.js?v=r1079-af161274eac4";
import { MARGINALIA } from "./marginalia.js?v=r1079-af161274eac4";
import { POTIONS, potionKnown } from "./potions.js?v=r1079-af161274eac4";
import { INGREDIENTS } from "./meals.js?v=r1079-af161274eac4";
import { MOUNT_BEASTS } from "./beast-mounts.js?v=r1079-af161274eac4";
import { ARCANA_UNLOCKS, arcanaHas } from "./lore.js?v=r1079-af161274eac4";
import { SEEDS } from "./skylands.js?v=r1079-af161274eac4";
import { tierCap } from "./stages.js?v=r1079-af161274eac4"; // the Listener named where its rewards are (Paths, part 1)
import { WORLD_ROUTE_OF, MILESTONES, MILESTONE_FOR, RELIQUARY, worldWithheld, earnedWorld, formFound, featCount, milestoneLine, milestonesUnderWay } from "./world-routes.js?v=r1079-af161274eac4"; // Phase 6
import { STORY_ROUTE_OF, STORY_SEEN, STORY_SINCE, QUESTS, QUEST_FOR, QUEST_IDS, questOpen, questStep, threadReward, carrierOf, storyWithheld, VISCERA_SHOP, boughtRumour } from "./quests.js?v=r1079-af161274eac4"; // Phase 7; Phase 8

export const PROGRESSION_TABLE_VERSION = EXPLORATION.table; // 2 from Phase 3: Exploration's gates (journey-start.ts EXPLORATION)
export const ROUTES = Object.freeze({
  S: "Held from the start", a: "Levelling and the Arcanum", b: "A quest", c: "A milestone", d: "A thread's ending",
  R: "A reliquary", V: "Divine Viscera", F: "Found", U: "An upgrade", W: "The forge and the market",
});
export const TIERS = Object.freeze(["R0", "R1", "R2", "R3", "R4", "R5", "Sea", "Sky", "Under", "Strange"]);
export const POOL_OF = Object.freeze({ S: "start", a: "core", b: "world", c: "world", d: "world", R: "reliquary", V: "viscera", F: "found", U: "found", W: "found" });
export const VISIBILITY = Object.freeze({ D: "directed", H: "hinted", X: "hidden" });
export const ARCHETYPES = Object.freeze({ brawler: "Brawler", blade: "Blade", spellblade: "Spellblade", caster: "Caster", gunner: "Gunner", warden: "Warden", beastcaller: "Beastcaller" });
export const GROUPS = Object.freeze([
  { id: "disciplines", title: "Disciplines" }, { id: "spells", title: "Spells" }, { id: "nodes", title: "Constellation" },
  { id: "forms", title: "Secondary forms" }, { id: "lattice", title: "Lattice field passives" }, { id: "arcana", title: "Arcana passives" },
  { id: "arts", title: "Weapon arts and tool forms" }, { id: "awakened", title: "Awakenings" }, { id: "gear", title: "Weapons, tools, armour and charm" },
  { id: "echoes", title: "Echoes" }, { id: "glyphs", title: "Glyphs and their combinations" }, { id: "marginalia", title: "Marginalia" },
  { id: "supplies", title: "Supplies" }, { id: "mounts", title: "Mounts and companions" }, { id: "traversal", title: "Traversal and utility" },
].map((g) => Object.freeze(g)));
// The Pace line counts abilities; these groups are counted apart (Echoes) or are not abilities (supplies).
export const PACE_SKIPS = Object.freeze(["echoes", "supplies"]);

// Shared control lines (keys: input.ts; slot letters: spell-slots.ts SLOT_LABELS).
const SLOT = "Set it in slot A, B, C or D (Pack → Arcanum), then tap that slot [F, G, C, B]";
const SKILL = "Learn it in Pack → Arcanum, then set it in slot A, B, C or D and tap that slot [F, G, C, B] to start it.";
const CAST = `${SLOT} to cast it at your target.`;
const BUFF = `${SLOT}: it takes hold at once.`;
const PASSIVE = "Learn it in Pack → Arcanum. Always on; nothing to press.";
const WHILE = (s) => `Learn it in Pack → Arcanum. It works while ${s} holds: start ${s} from its slot.`;
const ALT = "From Infinite III, tap the learned node's switch in Pack → Arcanum to choose this form (free, any time), or set it in a Transit Lattice passive slot.";
const LATTICE = "Set it in a Transit Lattice passive slot (Pack → Arcanum → Lattice). Always on while it sits there.";
const ART = (w) => `Set it in a Transit Lattice passive slot, equip the ${w}, Attack [J] three times to arm it, then hold Attack and let go in the ring's gold window.`;
const FORM = (t) => `Set it in a Transit Lattice passive slot and equip the ${t}; it changes the tool's shot [Q].`;
const AWAKE = (w) => `Awakened ${w}: Attack [J] as usual; the move comes on its own.`;
const ECHO = "Pack → Arcanum → Echoes: set it in a notch (three notches; Lattice Echo slots add more). It works by itself when its moment comes.";
const GEAR = (slot) => slot === "primary" ? "Equip it as your weapon (Pack → Gear). Attack [J]; hold to charge." : slot === "tool" ? "Equip it as your tool (Pack → Gear). Tool [Q]; hold to charge." : "Equip it in Pack → Gear. Always on while worn.";
const GLYPH = "Pack → Arcanum → Glyphs: inscribe it in a socket of a weapon, tool, spell, skill or armour.";
const MARGIN = "Fell a Margin Warden in a crossing and pick one of three; it is in the Scrapbook for good, and one pasted page runs a crossing.";

// Row builders. `v0` is [route, how, gate]; `v1` is [route, tier, seen, where].
const ROWS = [];
function add(group, id, name, arch, v0, v1, hint, controls, obtained, own, extra = {}) {
  const [r0, how, gate = null] = v0, [r1, tier, seen, where] = v1;
  ROWS.push(Object.freeze({ id, name, group, archetypes: Object.freeze(arch), v0: Object.freeze({ route: r0, how, gate: gate && Object.freeze(gate) }), v1: Object.freeze({ route: r1, where }),
    tier, pool: POOL_OF[r1], visibility: seen, hint, controls, obtained, own: Object.freeze(own), ...extra }));
}
const W = (r1, tier, seen, where) => [r1, tier, seen, where];

// ---------------------------------------------------------------- 1.1 Disciplines (6)
const discipline = (id, name, arch, gate, v1, hint, obtained) => add("disciplines", `skill:${id}`, name, arch, ["a", `A constellation point once Aperture reaches ${gate}`, { aperture: gate }], v1, hint, SKILL, obtained, ["skill", id]);
discipline("ember-form", "Ember Form", ["brawler", "spellblade"], 6, W("a", "R0", "D", "Aperture 6, at Sela's lens"), "Ember Form: your melee hits land harder and reach farther while it burns.", "Learned at Sela's lens for a constellation point, once Aperture reached 6.");
discipline("quickening", "Quickening", ["blade", "gunner"], 6, W("a", "R0", "D", "Aperture 6"), "Quickening: move faster and leap farther for a few seconds.", "Learned at Sela's lens for a constellation point, once Aperture reached 6.");
discipline("veil-guard", "Veil Guard", ["warden"], 18, W("a", "R1", "D", "Aperture 18"), "Veil Guard: a veil that softens every blow while it holds.", "Learned for a constellation point once Aperture reached 18.");
discipline("force-channel", "Force Channel", ["brawler", "gunner", "beastcaller"], 18, W("a", "R1", "D", "Aperture 18"), "Force Channel: a flat boost to melee, tool shots and spells while it holds.", "Learned for a constellation point once Aperture reached 18.");
discipline("rift-step", "Rift Step", ["blade"], 18, W("a", "R1", "D", "Aperture 18, as today; it combines with Aerial Step"), "Rift Step: tap where to step, or tap again to blink ahead.", "Learned for a constellation point once Aperture reached 18.");
add("disciplines", "skill:aerial-step", "Aerial Step", ["blade"], ["a", "The Motion capstone: Quickening mastered and Light Feet taken, for 2 points (Aperture 36 at the earliest)", { aperture: 36 }],
  W("a", "R0", "D", "Aperture 6, for one point, with no prerequisite: a discipline of its own"), "Aerial Step: walk on the air at the height you cast it. Twice before you touch ground.",
  `${SLOT} to step onto the air; jump to land back on it. Twice at most before your feet touch ground.`, "Taken as the Motion capstone, once Quickening was mastered.", ["skill", "aerial-step"]);

// ---------------------------------------------------------------- 1.2 Spells (12)
const spell = (id, name, arch, v0, v1, hint, controls, obtained, extra) => add("spells", `spell:${id}`, name, arch, v0, v1, hint, controls, obtained, ["spell", id], extra);
const FREE = ["S", "Open from the start, with no gate"], T13 = ["a", "Opens at Infinite III (Aperture tier 13)", { tier: 13 }];
spell("cinder-dart", "Cinder Dart", ["caster", "spellblade"], FREE, W("S", "R0", "D", "Held from the start: the short-cooldown starter spell (2.5 s)"), "Cinder Dart: a quick bolt of fire, ready again in seconds.", CAST, "Open to every Wayfarer from the first step.", { does: "A quick dart of fire that bursts where it lands; ready again in 2.5 s." });
spell("ember-ring", "Ember Ring", ["caster"], FREE, W("a", "R0", "D", "Level 3"), "Ember Ring: a ring of fire that burns whatever stands in it.", CAST, "Open to every Wayfarer from the first step.", { does: "A ring of fire on the ground near your target that burns every foe inside it for a few seconds." });
spell("grave-sun", "Grave Sun", ["caster"], FREE, W("a", "R1", "D", "Level 10"), "Grave Sun: a slow dark sun that scorches everything under it.", CAST, "Open to every Wayfarer from the first step.", { does: "A wide, lingering sun of dusk that strikes every foe beneath it again and again." });
spell("fire-burst", "Fire Burst", ["caster"], FREE, W("a", "R0", "D", "Level 6"), "Fire Burst: five cinder shells, each bursting into flame.", CAST, "Open to every Wayfarer from the first step.");
spell("aegis", "Aegis", ["warden", "brawler", "blade", "gunner"], T13, W("S", "R0", "D", "Held from the start, so parry builds work from minute one"), "Aegis: one second in which every blow is turned aside. Time it.", `${SLOT} just before a blow lands.`, "Opened at Infinite III.");
spell("shadow-boxing", "Shadow Boxing", ["brawler", "blade"], T13, W("a", "R4", "D", "Infinite III (tier 13), as today"), "Shadow Boxing: your swings carry you to your foe, and heal you a little.", BUFF, "Opened at Infinite III.");
spell("imbue-weapon", "Imbue Weapon", ["brawler", "spellblade"], T13, W("a", "R4", "D", "Infinite III (tier 13), as today"), "Imbue Weapon: every melee hit adds magic damage from your Focus.", BUFF, "Opened at Infinite III.");
spell("orbit-volley", "Orbit Volley", ["caster"], T13, W("a", "R4", "D", "Infinite III (tier 13), as today"), "Orbit Volley: press to gather orbs, press again to launch; gold is perfect.", `${SLOT} to gather orbs; tap it again to launch them. Launch while they glow gold.`, "Opened at Infinite III.");
spell("stillpoint", "Stillpoint", ["warden"], T13, W("a", "R4", "D", "Infinite III (tier 13), as today"), "Stillpoint: held time. Foes crawl, and shots inside it fall apart.", CAST, "Opened at Infinite III.");
spell("shadow-clone", "Shadow Clone", ["blade", "beastcaller"], T13, W("d", "R4", "X", "The Second Wayfarer: someone dressed as you leaves you, at the last, what they were"), "Shadow Clone: a shadow beside you copies your swings. Cast again to step into it.", `${SLOT} to cast it beside you; hold the slot to send it farther, and cast again to step into it.`, "Opened at Infinite III.");
spell("gravity-well", "Gravity Well", ["caster"], T13, W("d", "R2", "H", "The Well-Digger's Rope: the stone that never stops sinking, in your hand"), "Gravity Well: a vortex that drags foes to its eye.", CAST, "Opened at Infinite III.");
spell("essence-walk", "Essence Walk", ["caster"], T13, W("b", "R2", "D", "Tier 13. Eat any meal at Hollis Dray's; while it lasts, clear a Starfield crossing"), "Essence Walk: for 8 s a recovering spell casts anyway, for stamina.", BUFF, "Opened at Infinite III.");

// ---------------------------------------------------------------- 1.3 Constellation nodes (24 rows; Aerial Step's capstone is skill:aerial-step)
const node = (id, name, branch, kind, arch, v1, hint, controls) => {
  const b = BRANCHES[branch], skill = APERTURE_SKILLS[b.active], cap = kind === "cap";
  add("nodes", id, name, arch, ["a", cap ? `2 constellation points once ${skill.name} is mastered and ${b.mod.name} is taken` : `A constellation point once ${skill.name} has a rank`, { aperture: skill.threshold }],
    v1, hint, controls, cap ? `Crowned the ${b.name} branch for 2 points, once ${skill.name} was mastered.` : `Joined the constellation for a point, once ${skill.name} had a rank.`, ["node", id, branch, kind]);
};
const A = (where, tier = "R1") => W("a", tier, "D", where);
node("ember-skin", "Ember Skin", "form", "mod", ["brawler", "spellblade"], A("A point, as today", "R0"), "Ember Skin: while Ember Form holds, your melee hits set foes burning.", WHILE("Ember Form"));
node("light-feet", "Light Feet", "motion", "mod", ["blade"], A("A point, as today", "R0"), "Light Feet: dodges cost 3 less stamina.", PASSIVE);
node("thorned-veil", "Thorned Veil", "veil", "mod", ["warden"], A("A point, as today"), "Thorned Veil: while Veil Guard holds, the nearest foe takes back part of each blow.", WHILE("Veil Guard"));
node("overflow", "Overflow", "force", "mod", ["caster", "spellblade", "gunner"], A("A point, as today"), "Overflow: while Force Channel holds, spells recover faster.", WHILE("Force Channel"));
node("rift-wake", "Rift Wake", "rift", "mod", ["blade"], A("A point, as today"), "Rift Wake: Rift Step tears a line that wounds foes you pass through.", PASSIVE);
node("colossus", "Colossus", "form", "cap", ["brawler"], A("Points, as today", "R2"), "Colossus: Ember Form lasts longer, and you take less damage in it.", WHILE("Ember Form"));
node("cinder-heart", "Cinder Heart", "form", "cap", ["brawler"], A("Points, as today", "R2"), "Cinder Heart: when Ember Form runs out, it bursts around you.", PASSIVE);
node("slipstream", "Slipstream", "motion", "cap", ["blade"], A("Points, as today", "R2"), "Slipstream: while Quickening holds, each dodge gives back stamina.", WHILE("Quickening"));
node("sanctuary", "Sanctuary", "veil", "cap", ["warden"], A("Points, as today", "R2"), "Sanctuary: while Veil Guard holds, your hits heal you.", WHILE("Veil Guard"));
node("mirror-veil", "Mirror Veil", "veil", "cap", ["warden"], A("Points, as today", "R2"), "Mirror Veil: the first blow during Veil Guard is undone.", WHILE("Veil Guard"));
node("amplifier", "Amplifier", "force", "cap", ["caster", "gunner", "beastcaller"], A("Points, as today", "R2"), "Amplifier: while Force Channel holds, Echo and glyph strikes deal half again.", WHILE("Force Channel"));
node("resonant-force", "Resonant Force", "force", "cap", ["brawler"], A("Points, as today", "R2"), "Resonant Force: kills during Force Channel extend it.", WHILE("Force Channel"));
node("fold", "Fold", "rift", "cap", ["blade"], A("Points, as today", "R2"), "Fold: Rift Step holds two charges.", PASSIVE);
node("anchor", "Long Step", "rift", "cap", ["blade"], A("Points, as today", "R2"), "Long Step: Rift Step reaches farther.", PASSIVE);
node("arcane-edge", "Arcane Edge", "form", "extra", ["spellblade"], W("d", "R2", "H", "The Toolmaker's Handles: the unshaped stave worn to your grip teaches the blade to carry the spell"), "Arcane Edge: each spell empowers your next three melee attacks.", PASSIVE);
node("casting-wind", "Casting Wind", "motion", "extra", ["caster"], W("c", "Sky", "D", "Cast 30 spells while gliding or air-walking"), "Casting Wind: each spell gives back stamina.", PASSIVE);
node("pocket-time", "Pocket Time", "veil", "extra", ["blade", "spellblade"], W("d", "R2", "H", "The Clockmaker's Hours: the last watch still runs, set to yours"), "Pocket Time: melee hits stretch your skill.", PASSIVE);
node("echoing-cast", "Echoing Cast", "force", "extra", ["caster"], W("d", "R2", "H", "A seeded thread (for example the Choir of Stones): the chord sings your spells back, quieter"), "Echoing Cast: every fourth spell repeats at half power.", PASSIVE);
node("glyph-mine", "Glyph Mine", "rift", "extra", ["caster"], W("b", "Strange", "D", "Defeat five Vein Wraiths in the Hollow Husk and collect their sigils; Sela sets one under your feet"), "Glyph Mine: spells leave sigils that burst; Rift Steps leave linking mines.", PASSIVE);

// ---------------------------------------------------------------- Secondary forms (16)
const form = (nodeId, arch, v1, hint) => add("forms", `${nodeId}:alt`, ALT_PASSIVES[nodeId]?.name, arch, ["a", "A free switch on a learned node, from Infinite III (tier 13)", { tier: 13 }], v1, hint, ALT,
  "Its node was learned, and Infinite III opened the switch.", ["alt", nodeId]);
form("ember-skin", ["brawler"], W("c", "R1", "H", "Survive being set burning 20 times. The fire learns to bite back"), "Ember Ward: while Ember Form holds, whatever wounds you is set burning.");
form("colossus", ["brawler"], W("b", "R5", "D", "Reach the Thornglass Caldera and survive there until the Questing Beast comes home"), "Ember Mend: Ember Form lasts longer and mends you over its run.");
form("cinder-heart", ["brawler"], W("R", null, "X", "A reliquary, from the seeded pool"), "Kindling: Ember Form bursts as it begins.");
form("light-feet", ["blade"], W("V", "R5", "D", "Divine Viscera"), "Second Wind: each dodge restores a little health.");
form("aerial-step", ["blade"], W("a", "R2", "D", "The Motion capstone that Aerial Step leaves (the save keeps the id aerial-step for the slot)"), "Long Quickening: Quickening lasts half again as long.");
form("quickening", ["blade"], W("c", "Sky", "D", "Reach the far end of a Cloud Hold summit skyway without touching ground"), "Quickened Stride: Aerial Step holds a second charge.");
form("slipstream", ["blade"], W("R", null, "X", "A reliquary, from the seeded pool"), "Afterimage: while Quickening holds, each dodge leaves a burst behind.");
form("thorned-veil", ["warden"], W("V", "R5", "D", "Divine Viscera"), "Veil Pulse: while Veil Guard holds, blows you take pulse back around you.");
form("sanctuary", ["warden"], W("R", null, "X", "A reliquary, from the seeded pool"), "Long Veil: Veil Guard lasts half again as long.");
form("mirror-veil", ["warden"], W("c", "Sea", "D", "Clear 10 dives"), "Stillwater: during Veil Guard you take less damage.");
form("overflow", ["caster"], W("b", "R5", "D", "In the Storm Halls, defeat a Coil Warden while Force Channel holds"), "Wellspring: while Force Channel holds, your skills recover faster.");
form("amplifier", ["warden"], W("V", "R5", "D", "Divine Viscera"), "Bulwark Channel: while Force Channel holds, you take less damage.");
form("resonant-force", ["brawler", "beastcaller"], W("c", "R2", "H", "Defeat 10 world beasts"), "Harvest: kills during Force Channel restore health.");
form("rift-wake", ["blade"], W("R", null, "X", "A reliquary, from the seeded pool"), "Rift Ward: after a Rift Step nothing can touch you for a moment.");
form("fold", ["blade"], W("V", "R5", "D", "Divine Viscera"), "Quick Fold: Rift Step recovers faster.");
form("anchor", ["blade"], W("c", "Under", "D", "Clear 10 Deep floors"), "Rift Echo: Rift Step leaves a burst where you stood.");

// ---------------------------------------------------------------- 1.4 Transit Lattice field passives (8) and the Arcana passives (2)
const LT = ["a", "A Transit Lattice pick: Infinite III and one Listener felled", { tier: TRANSIT_LATTICE.openTier, listeners: TRANSIT_LATTICE.openListeners }];
const field = (id, arch, v1, hint) => add("lattice", `field:${id}`, FIELD_PASSIVES[id]?.name, arch, LT, v1, hint, LATTICE, "Drawn into the Transit Lattice once it opened.", ["field", id]);
field("sanctum", ["warden"], W("a", "R4", "D", "Free when the Lattice opens"), "Sanctum: inside your own lingering spell, take less and mend.");
field("wellspring", ["caster"], W("d", "R2", "H", "A seeded thread (for example the Drowned Library): the water reads, and now so does the ground"), "Wellspring Ground: inside your lingering spell, everything recovers faster.");
field("charged-air", ["gunner"], W("a", "R4", "D", "Free when the Lattice opens"), "Charged Air: while a spell runs, tool shots grow and hit harder.");
field("spellblade", ["spellblade"], W("a", "R4", "D", "Free when the Lattice opens"), "Spellblade: while a spell runs, melee strikes deal more and reach farther.");
field("drift-field", ["caster"], W("c", "Sky", "D", "Glide 1,000 tiles"), "Drift Field: a dodge drags your nearest lingering spell along.");
field("tempo", ["blade"], W("b", "Sky", "D", "Climb a Sky Stair at least 50 sections out, wind the metronome on its first island, then clear the Skyland on its beat (moved from an Ember Foundry Pentagon, a theme not in the world)"), "Tempo: every 5th hit on one foe opens a window. Hit it again, now.");
field("shatterpoint", ["blade", "brawler"], W("R", null, "X", "A reliquary, from the seeded pool"), "Shatterpoint: break a foe's poise and the next blows land heavier.");
field("power-aegis", ["warden"], W("b", "R3", "D", "At least 50 sections from the Ember Refuge, use Aegis to turn a Gate Revenant's blow, then defeat it"), "Power Aegis: a perfect Aegis parry strikes back.");
const arcana = (key, from, hint) => add("arcana", key, ARCANA_UNLOCKS[key]?.name, [], ["d", `Completing ${from}`], W("d", "R1", "D", `${from}, unchanged`), hint, "Always on once opened; nothing to press.", `Opened by completing ${from}.`, ["arcana", key]);
arcana("passive:bell-toll", "the Seven Bells", "Bell Toll: a heavy blow tolls like a cracked bell, and foes near it reel.");
arcana("passive:lamplight", "the Lamplighter's Round", "Lamplighter's Light: whatever light you see by reaches farther.");

// ---------------------------------------------------------------- 1.5 Weapon arts and tool forms (13)
const art = (id, controls, arch, v1, hint) => add("arts", `field:${id}`, TOOL_FORMS[id]?.name, arch, LT, v1, hint, controls, "Drawn into the Transit Lattice once it opened.", ["field", id]);
art("ki-blast", ART("Iron Fists"), ["brawler"], W("c", "R2", "D", "Defeat 15 foes with the Iron Fists' perfect-timing ball"), "Ki Blast: the armed punch fires a ki blast; from the uppercut, from the air.");
art("cinder-javelin", ART("Cinder Pike"), ["blade"], W("d", "R1", "H", "The Ferryman's Fares: the pole he never needed, thrown across"), "Cinder Javelin: hurl the pike through a line of foes; it comes back.");
art("transpose", ART("Salvage Blade"), ["spellblade"], W("d", "R2", "H", "The Tollkeeper's Keys: the glass key's keyhole, set down as a seal"), "Transpose: a seal on the ground; inside it, magic hits much harder.");
art("blade-stream", ART("Fourfold Daggers"), ["blade"], W("b", "Strange", "D", "In a Pentagon, defeat three Grave Lanterns before the first relights its lamp (moved from a Lamplit City Pentagon's Lamplighters, a theme not in the world)"), "Blade Stream: a storm of light slashes around you.");
art("lava-slash", ART("Verge Cleaver"), ["brawler"], W("c", "R3", "D", "Defeat 30 foes in the Magma Rivers"), "Lava Slash: dash in and slam; the ground erupts.");
art("mages-hand", "Set it in a Transit Lattice passive slot, equip the Quandrix Staff, and hold Attack [J]: the last hand you cast clenches into a fist.", ["caster"], W("d", "R5", "H", "The Tall Child's Slates: a hand the size of a door, offered gently"), "Mage's Hand: hold Attack and your last hand grabs foes and drags them in.");
art("rapid-reload", "Set it in a Transit Lattice passive slot. Every charged release counts, whatever the weapon or tool.", ["gunner"], W("c", "R2", "D", "Land 200 charged releases"), "Rapid Reload: charged releases come back sooner.");
art("arc-wave", FORM("Blunderbuss"), ["gunner"], W("b", "Sea", "D", "Salvage three shipwrecks with the Blunderbuss equipped"), "Arc Wave: the Blunderbuss fires crescent waves through every foe.");
art("cluster-shell", FORM("Rift Bombard"), ["gunner"], W("R", null, "X", "A reliquary, from the seeded pool"), "Cluster Shell: Rift Bombard shells throw bomblets as they burst.");
art("corridor-golem", FORM("Hammerfall"), ["brawler", "beastcaller"], W("b", "Under", "D", "Defeat five Earth Golems in canyon craters, collect their hearts, and give them to the quarry keeper"), "Corridor Golem: a Hammerfall blow raises a stone golem that fights.");
art("lumen-sunburst", FORM("Lumen Spindle"), ["gunner"], W("R", null, "X", "A reliquary, from the seeded pool"), "Sunburst Ricochet: Spindle shots ricochet off walls and burst into shards.");
art("continuous-assault", FORM("Carbine"), ["gunner"], W("d", "R5", "X", "The Tinker's Tags: tag 7, burnt into the copper by the robots, and their sky lasers with it"), "Continuous Assault: a charged Carbine beam calls lasers from the sky.");
art("nanoknives", FORM("Great Sweep"), ["brawler"], W("R", null, "X", "A reliquary, from the seeded pool"), "Mirage of Blades: each Great Sweep throws a spinning blade that comes home.");

// ---------------------------------------------------------------- 1.6 Awakening and awakened moves
const FORGE = ["W", "At Sela's forge for 6 lumen dust, once the piece is at its cap and holds a Resonance"];
const awake = (id, name, arch, hint, controls, does, own) => add("awakened", `awakened:${id}`, name, arch, FORGE, W("W", "R3", "D", "An awakened piece's own move: awakening opens at Infinite II under v1"), hint, controls, "Awakened at Sela's forge.", own, does ? { does } : {});
add("awakened", "awakened:awakening", "Awakening", [], FORGE, W("a", "R3", "D", "Infinite II (tier 12): Sela's forge opens awakening; the work (cap, Resonance, dust) stays as it is"), "Awakening: a weapon or tool at its cap, holding a Resonance, can wake at Sela's forge.", "Strengthen a weapon or tool to its cap, socket a Resonance pair, then choose Awaken at Sela's forge (6 lumen dust).", "Awakened at Sela's forge.", ["awakened", "any"], { does: "An awakened weapon keeps its Resonance's name and gains a move of its own; an awakened tool changes its shot." });
const AWAKE_HINTS = { fissure: "Fissure: every third swing cracks the ground ahead, and it erupts.", "returning-blades": "Returning blades: every third press throws the pair out and back.",
  lance: "Lance: every third thrust extends a long line of cinder light.", roundhouse: "Roundhouse kick: the fourth step of the awakened combo.", "spell-runes": "Spell runes: every third swing runes a foe; your next spell detonates it." };
for (const [id, arch, w] of [["fissure", ["brawler"], "Verge Cleaver"], ["returning-blades", ["blade"], "Fourfold Daggers"], ["lance", ["blade"], "Cinder Pike"], ["roundhouse", ["brawler"], "Iron Fists"], ["spell-runes", ["spellblade"], "Salvage Blade"]]) {
  const m = AWAKENED_ARTS.moves[id];
  awake(id, m?.name, arch, AWAKE_HINTS[id], AWAKE(w), null, ["awakened", id]);
}
awake("hammerfall-clap", "Hammerfall clap", ["brawler"], "The awakened Hammerfall claps: two lines slide apart and slam together.", "Awakened Hammerfall: use the tool [Q] as usual; the clap comes with every landing.", null, ["awakened", "hammerfall"]);
awake("sweep-freeze", "Great Sweep freeze", ["brawler"], "The awakened Great Sweep freezes whatever its blade touches.", "Awakened Great Sweep: use the tool [Q] as usual.", "Whatever its blade touches freezes (with Mirage of Blades, whatever the blades cut); bosses freeze after many touches.", ["awakened", "great-sweep"]);
awake("quandrix-slam", "Quandrix slam", ["caster"], "The awakened Quandrix Staff: hold Attack to slam your last hand down.", "Awakened Quandrix Staff: hold Attack [J] to slam the last hand down; let go in the ring's gold window for a perfect burst.", "The held slam replaces the crescent: the last hand cast slams down and keeps working until its charge runs out.", ["awakened", "quandrix-staff"]);
awake("tool-fan", "Fanned shots", ["gunner"], "An awakened tool fans every shot into three.", "Awakened tool: fire it [Q] as usual.", "Every shot of an awakened tool (other than Hammerfall and the Great Sweep) fans into three.", ["awakened", "tool"]);

// ---------------------------------------------------------------- 1.7 Weapons, tools, armour and charm (never gated, in both modes)
const NEVER = W("F", null, "X", "Never gated: drops from enemies and loot at random, as now");
const gear = (key, name, slot, arch, v0, hint, obtained, v1 = NEVER, does = "") => add("gear", `gear:${key}`, name, arch, v0, v1, hint, GEAR(slot), obtained, ["gear", slot, key], { does: `${does}${WEAPON_SCALING[key] || TOOL_SCALING[key] ? ` Scales with ${SCALING_LABELS[WEAPON_SCALING[key] || TOOL_SCALING[key]]}.` : ""}`.trim() });
const START = ["S", "The starting kit"], LOOT = ["F", "Loot, at random"];
gear("salvage-blade", "Salvage Blade", "primary", ["spellblade"], START, "Salvage Blade: a short blade that grows with your magic.", "Carried from the start.", W("S", "R0", "D", "Chosen at the start (or any drop)"), "A short blade that grows with your Focus.");
gear("spark-coil", "Spark Coil", "tool", ["caster", "spellblade", "gunner"], START, "Spark Coil: a straight magic bolt. At +6 it becomes the Carbine.", "Carried from the start.", W("S", "R0", "D", "Chosen at the start (or any drop)"), "A straight magic bolt.");
gear("cinder-pike", "Cinder Pike", "primary", ["blade"], ["F", "The level 4 gift, and loot", { level: 4 }], "Cinder Pike: a long thrust. Keep them at the end of your reach.", "A level gift, or found as loot.", NEVER, "A long thrust.");
gear("needle-caster", "Needle Caster", "tool", ["blade", "gunner"], ["F", "The level 8 gift, and loot", { level: 8 }], "Needle Caster: quick needles. At +6 it becomes the Blunderbuss.", "A level gift, or found as loot.", NEVER, "Quick needles.");
gear("fourfold-daggers", "Fourfold Daggers", "primary", ["blade"], ["F", "The level 12 gift, and a share of weapon loot", { level: 12 }], "Fourfold Daggers: paired cuts crossing in an X. Bosses, not crowds.", "A level gift, or found as loot.", NEVER, "Paired cuts that cross in an X just ahead.");
gear("quandrix-staff", "Quandrix Staff", "primary", ["caster"], ["F", "The level 16 gift, and a share of weapon loot", { level: 16 }], "Quandrix Staff: slow spectral hands that strike again and again.", "A level gift, or found as loot.", NEVER, "Casts slow spectral hands that strike again and again, at range.");
gear("verge-cleaver", "Verge Cleaver", "primary", ["brawler"], LOOT, "Verge Cleaver: a wide, heavy arc for crowds.", "Found as loot.", NEVER, "A wide, heavy arc.");
gear("lumen-spindle", "Lumen Spindle", "tool", ["caster", "spellblade", "gunner"], LOOT, "Lumen Spindle: a shot that flies out and comes back.", "Found as loot.", NEVER, "A shot that flies out and comes back.");
gear("rift-bombard", "Rift Bombard", "tool", ["gunner"], LOOT, "Rift Bombard: a lobbed shell that bursts.", "Found as loot.", NEVER, "A lobbed shell that bursts.");
gear("blunderbuss", "Blunderbuss", "tool", ["gunner"], ["U", "A Needle Caster strengthened to +6"], "Blunderbuss: three pellets at once.", "A Needle Caster strengthened to +6.", W("U", null, "D", "+6 on a Needle Caster, as today"), "Three pellets in a cone.");
gear("carbine", "Carbine", "tool", ["gunner"], ["U", "A Spark Coil strengthened to +6"], "Carbine: hold to charge a beam.", "A Spark Coil strengthened to +6.", W("U", null, "D", "+6 on a Spark Coil, as today"), "A charged beam.");
gear("iron-fists", "Iron Fists", "primary", ["brawler"], ["F", "Loot, and given at Infinite III (tier 13)", { tier: 13 }], "Iron Fists: a combo on a beat, charged punches, a perfect-timing ball.", "Given at Infinite III, or found as loot.", W("F", null, "X", "Loot from the start, on its own seeded stream (items.ts BRAWLER_LOOT, in both modes); the tier-13 gift stays a sure copy"), "A combo on a beat, charged punches and a perfect-timing ball.");
gear("hammerfall", "Hammerfall", "tool", ["brawler"], ["F", "Loot, and given at Infinite III (tier 13)", { tier: 13 }], "Hammerfall: a brawler's slam.", "Given at Infinite III, or found as loot.", W("F", null, "X", "Loot from the start, on its own seeded stream (items.ts BRAWLER_LOOT, in both modes); the tier-13 gift stays a sure copy"), "A brawler's slam.");
gear("great-sweep", "Great Sweep", "tool", ["brawler"], ["F", "Loot, and given at Infinite III (tier 13)", { tier: 13 }], "Great Sweep: a great blade sweeping around you.", "Given at Infinite III, or found as loot.", W("F", null, "X", "Loot from the start, on its own seeded stream (items.ts BRAWLER_LOOT, in both modes); the tier-13 gift stays a sure copy"), "A great sweeping blade around you.");
gear("aether-orrery", "Aether Orrery", "tool", ["caster", "gunner"], ["F", "Given at Infinite III (tier 13), and loot", { tier: 13 }], "Aether Orrery: orbs of spell power; hold for a great one.", "Given at Infinite III, or found as loot.", NEVER, "A magic tool of orbiting shots.");
gear("ash-wrap", "Ash Wrap", "armor", ["warden"], START, "Ash Wrap: plain armour that takes the edge off a blow.", "Worn from the start.", W("S", "R0", "D", "Worn from the start"), "Plain starting armour.");
gear("kiln-mantle", "Kiln Mantle", "armor", ["warden"], LOOT, "Kiln Mantle: heavy armour for taking blows.", "Found as loot.", NEVER, "Armour that guards.");
gear("glassweave-coat", "Glassweave Coat", "armor", ["blade"], LOOT, "Glassweave Coat: light armour that keeps your stamina up.", "Found as loot.", NEVER, "Armour that adds stamina.");
gear("quiet-compass", "Quiet Compass", "charm", [], LOOT, "Quiet Compass: a charm for finding things.", "Found as loot.", NEVER, "A charm for discovery.");

// ---------------------------------------------------------------- 1.8 Echoes (37): a first kill
const creatureOf = (id) => ECHOES[id]?.creature || MONSTER_PACK[id]?.name || id;
const ECHO_HINTS = {
  thunderhorn: "Thunderhorn's Charge: your dodge tramples what it passes through.", riftLynx: "Lynx Pounce: strike just after a dodge for much more.",
  pallidCrawler: "Pallid Skitter: dodging costs a third less stamina.", veilSpinner: "Spinner's Web: dodging leaves a web that slows foes.",
  strataEel: "Eel's Phase: your dodge stays untouchable a little longer.", sunderjaw: "Sunderjaw's Rupture: landing a jump ruptures the ground.",
  gnawingMaw: "Maw's Hunger: kills drag nearby foes to the body.", amalgam: "Flesh Bloom: kills leave flesh that slows foes.",
  cinderSeraph: "Seraph's Firefall: kills rain embers on nearby foes.", hangedChoir: "Choir's Lament: being hurt rings out striking sigils.",
  mirrorShade: "Mirror Swap: being hurt swaps you with the nearest foe.", lumenWraith: "Wraith Lantern: casting also fires a lantern beam.",
  siegeBeetle: "Beetle Mortar: every third tool shot lobs a mortar too.", weepingSaint: "Saint's Regard: foes you face move slower.",
  listener: "Listener's Answer: when hurt, the nearest foe takes the blow too.", questingBeast: "Beast's Spines: kills fling spines into nearby foes.",
  morphingBlob: "Blob's Spatter: being hurt spatters slowing ooze.", bloblet: "Bloblet Mend: each hit you land mends a little.",
  tremorWorm: "Worm's Upheaval: each dodge heaves the ground under a foe.", wormTentacle: "Tentacle Ember: every third hit on a foe bursts in embers.",
  mountainTurtle: "Turtle's Ward: being hurt grows ice over you for a second.", nanobotKnight: "Nanite Seekers: kills loose seekers into nearby foes.",
  lightningGiant: "Giant's Arc: kills arc lightning into nearby foes.", briarStag: "Bramble Wake: each dodge leaves brambles and roots.",
  ashenMoth: "Moth's Ember: kills loose a burning moth.", crimsonTyrant: "Tyrant's Heart: kills burst into flame.",
  doomChaser: "Chaser's Dark: kills loose a hunting dark.", psychicCrystal: "Mind Ward: being hurt throws nearby foes back.",
  voidWalker: "Rift Upheaval: dodging marks a foe with an erupting void spike.", earthGolem: "Golem's Landfall: landing a jump staggers foes around you.",
  crystalCrab: "Geode Shell: being hurt cracks off shards that strike back.", stalker: "Stalker's Mist: your dodge turns you to mist that drains foes.",
  graveLantern: "Lantern Stillness: stand still a moment and you mend.", wildStego: "Stegosaur's Grip: jump into a wall and hold on.",
  earthApato: "Earth Resolve: attack standing still and a root sigil grows under you.", spinoRex: "Spinosaur's Echo: your jump-attack slams echo.",
  triceratops: "Triceratops Cunning: three hits on one foe and you gore it.",
};
for (const [id, hint] of Object.entries(ECHO_HINTS)) {
  const parent = MINION_ECHOES[id] ? creatureOf(MINION_ECHOES[id]) : null, who = creatureOf(id), the = /^the /i.test(who) ? who.replace(/^The /, "the ") : `${/^[AEIOU]/.test(who) ? "an" : "a"} ${who}`;
  const how = id === "triceratops" ? "The first kill of a hostile Triceratops" : parent ? `The first kill of ${the}, once ${parent.replace(/^The /, "the ")} has fallen` : `The first kill of ${the}`;
  add("echoes", `echo:${id}`, ECHOES[id]?.name, ["beastcaller"], ["F", how], W("F", null, "H", "A first kill, as today; a creature you have seen shows its Echo as rumoured"), hint, ECHO, `${how}.`, ["echo", id]);
}

// ---------------------------------------------------------------- 1.9 Glyphs and their combinations
const EMERGE = W("F", null, "X", "Unchanged: drops and discovery, as today");
const GLYPH_HINTS = { ignite: "Ignite: sets what it strikes burning.", chain: "Chain: its hits arc on to another foe.", pierce: "Pierce: shots go through foes.", echo: "Echo: the strike repeats.", leech: "Leech: hits give back health.", heavy: "Heavy: slower, harder blows.", swift: "Swift: quicker, lighter blows.", volatile: "Volatile: hits burst.", tether: "Tether: hits slow.", still: "Still: hits hold foes in place.", "gathered-breath": "Gathered Breath: charge longer for more." };
for (const [id, hint] of Object.entries(GLYPH_HINTS)) add("glyphs", `glyph:${id}`, GLYPHS[id]?.name, [], id === "gathered-breath" ? ["F", "A rare drop on its own stream; 12 dust to inscribe"] : ["F", "Drops, and certain from guardians"], EMERGE, hint, GLYPH, id === "gathered-breath" ? "A rare drop." : "A drop.", ["glyph", id]);
for (const id of ["ember-choir", "wildfire", "storm-lattice", "afterimage", "grave-tether", "comet", "blood-tide", "quickstep"]) add("glyphs", `resonance:${id}`, RESONANCES[id]?.name, [], ["F", "Discovered by setting its two glyphs together"], EMERGE, `${RESONANCES[id]?.name}: ${RESONANCES[id]?.text}`, "Inscribe its two glyphs in the sockets of one weapon or tool.", "Discovered by setting its two glyphs together.", ["resonance", id]);
for (const id of ["inferno", "maelstrom", "requiem", "sanguine-storm", "starfall", "undertow"]) add("glyphs", `triad:${id}`, TRIADS[id]?.name, [], ["F", "Three glyphs in a three-socket item"], EMERGE, `${TRIADS[id]?.name}: ${TRIADS[id]?.text}`, "Inscribe its three glyphs in a three-socket weapon, tool or armour (a relic, or a smith's socket).", "Discovered by setting its three glyphs together.", ["resonance", id]);
for (const key of ["fire+fire", "dusk+dusk", "wind+wind", "ward+ward", "force+force", "rift+rift", "dusk+fire", "fire+wind", "fire+ward", "fire+force", "fire+rift", "dusk+wind", "dusk+ward", "dusk+force", "dusk+rift", "ward+wind", "force+wind", "rift+wind", "force+ward", "rift+ward", "force+rift"]) add("glyphs", `pairing:${key}`, PAIRINGS[key]?.name, ["caster"], ["F", "Emergent: the attributes slotted in A and B"], EMERGE, `${PAIRINGS[key]?.name}: ${PAIRINGS[key]?.text}`, "Slot spells or disciplines of these two attributes in slots A and B; it holds while both are there.", "Found the first time the pair was slotted.", ["pairing", key]);
for (const id of ["edge", "star", "ward", "gale"]) add("glyphs", `tesseract:${id}`, `Tesseract glyph (${TESSERACTS.classes[id]?.name})`, [], ["F", "Labyrinth vaults, Pentagon keepers, reliquaries, sealed chambers, the Regent's hoard, turtle-shell vaults"], EMERGE, `A ${TESSERACTS.classes[id]?.name} Tesseract: strong lines, with a cost or a curse.`, "Pack → Arcanum → Glyphs: set it in a Tesseract slot.", "Taken from a vault or a keeper.", ["tesseract", id], { does: `A rolled ${TESSERACTS.classes[id]?.name} glyph: its first line leads, the rest are bonuses and costs (a curse at the top grade).` });

// ---------------------------------------------------------------- 1.10 Marginalia (20) and supplies
const MARGIN_HINTS = { secondWind: "Second Wind: once a crossing, a blow that would fell you leaves you standing.", shadowStep: "Shadow Step: every dodge leaves your shadow behind, repeating your attacks." };
for (const id of ["glassEdge", "ironSpine", "fleetHand", "quickHand", "wideFocus", "emberWake", "redMargin", "quickInk", "secondWind", "shadowStep", "hourglass", "lifeblood", "deepLungs", "heavyHand", "inkwell", "longArm", "inkShield", "gildedMargin", "smithsNote", "sigilPage"])
  add("marginalia", `marginalia:${id}`, MARGINALIA[id]?.name, [], ["F", "From Infinite IV: fell a Margin Warden in a crossing and pick 1 of 3", { tier: 14 }], W("F", null, "X", "Unchanged: Margin Wardens, as today"), MARGIN_HINTS[id] || `${MARGINALIA[id]?.name}: ${MARGINALIA[id]?.text}`, MARGIN, "Picked from a fallen Margin Warden's pages.", ["marginalia", id]);
const supply = (id, name, v0, hint, controls, obtained, own, does) => add("supplies", id, name, [], v0, W(v0[0], null, "D", "Unchanged"), hint, controls, obtained, own, does ? { does } : {});
supply("potion:restorativeDraught", POTIONS.restorativeDraught.name, ["S", "Carried from the start; loot and chests"], "Restorative Draught: tap Potion to drink.", "Potion [H] drinks it.", "Carried from the start, and found.", ["potion", "restorativeDraught"]);
supply("potion:highPotion", POTIONS.highPotion.name, ["W", "Brewed from draughts (Pack → Supplies), and loot"], "High Potion: brewed from draughts; heals twice as much.", "Pack → Supplies: choose it for the Potion button [H].", "Brewed, or found.", ["potion", "highPotion"]);
supply("potion:maxPotion", POTIONS.maxPotion.name, ["W", "Brewed from draughts (Pack → Supplies), and loot"], "Max Potion: heals you fully.", "Pack → Supplies: choose it for the Potion button [H].", "Brewed, or found.", ["potion", "maxPotion"]);
for (const id of ["emberPepper", "ironroot", "honeycomb", "windleaf", "quickgrain", "lumenCap", "bloodmoss"]) supply(`meal:${id}`, INGREDIENTS[id]?.name, ["W", "Bought from the Refuge cook or a Listener-town cook"], `${INGREDIENTS[id]?.name}: ${INGREDIENTS[id]?.text}, while the meal lasts.`, "Speak to a cook [E] and choose two ingredients; the same twice is a hearty helping.", "Bought from a cook.", ["meal", id]);
supply("supply:stegoBait", "Stego Bait", ["F", "Cut a Wild Stegosaurus's tail and pick it up"], "Stego Bait: set it down and beasts come to it.", "Set it in the preset's item slot (Pack → Arcanum) and tap that slot to place it.", "Cut from a Wild Stegosaurus.", ["consumable", "stegoBait"], "A severed tail set down as bait.");
supply("supply:empowered-rounds", "Empowered rounds", ["F", "Crossing chests and great-tree crowns"], "Empowered rounds: your next tool shots hit half again as hard.", "Carried in the pack; tool shots [Q] spend them.", "Found in chests and crowns.", ["rounds"], "Tool shots spend them for extra damage.");

// ---------------------------------------------------------------- 1.11 Mounts and companions
for (const id of ["stalker", "morphingBlob", "tremorWorm", "mountainTurtle", "astralWorm", "briarStag", "ashenMoth", "crimsonTyrant", "doomChaser"])
  add("mounts", `mount:${id}`, MOUNT_BEASTS[id]?.name, ["beastcaller"], ["F", "Close a pen on the hurt beast; a stable of three"], W("F", null, "D", "Pens, as today"), `${MOUNT_BEASTS[id]?.name}: build a pen round it when it is hurt, and it is yours to ride.`, "Hurt the beast, then Build [F] a pen around it. Call it from the stable and press Act [E] to mount.", "Penned when it was hurt.", ["mount", id], { does: "A mount from your stable: ride it across the Corridor." });
add("mounts", "mount:triceratops", MOUNT_BEASTS.triceratops?.name || "Triceratops", ["beastcaller"], ["F", "Wild herds and captures; the Beast Hotel"], W("F", null, "D", "Herds, as today"), "Triceratops: catch one from a wild herd and ride it.", "Catch one from a herd; press Act [E] to mount.", "Caught from a wild herd.", ["mount", "triceratops"], { does: "A Good or Silly Triceratops to ride, with horn attacks of its own." });
add("mounts", "companion:hatchling", "Triceratops hatchling", ["beastcaller"], ["b", "A rescue quest from the mother at the Beast Hotel"], W("b", "R1", "D", "From Infinite II: the mother comes to the Beast Hotel when the band opens, and her rescue runs as today"), "The hatchling: he fights beside you and grows as you do.", "He follows you once rescued; feed him by fighting. Choose his form when he has grown.", "Rescued from the pack for his mother at the Beast Hotel.", ["hatchling"], { does: "A companion who fights beside you and grows from baby to young to adult." });

// ---------------------------------------------------------------- 1.12 Traversal and utility
const util = (id, name, v0, v1where, hint, controls, obtained, own, does) => add("traversal", id, name, [], v0, W(v0[0], null, "D", v1where), hint, controls, obtained, own, { does });
const HELD = ["S", "Held from the start"];
util("utility:lantern", "Lantern", HELD, "As today", "Lantern: light the dark around you.", `${SLOT} to light or shutter it.`, "Carried from the start.", ["always"], "Lifts the dark around you in dungeons, and glows a little outside at night.");
util("utility:build", "Build", HELD, "As today", "Build: lay blocks, pens and shelters from wood and stone.", `${SLOT} and tap where to build.`, "Carried from the start.", ["always"], "Builds from wood and stone: blocks to climb, pens for beasts.");
util("utility:oculus", "Oculus", HELD, "As today", "Oculus: look through the layers Aperture reveals.", "The Oculus button under the compass [O].", "Carried from the start.", ["always"], "Shows the hidden layers of the place you stand in.");
util("utility:sling", "Sling", HELD, "As today", "Sling: ten pieces of gear kept out of the pack, safe from salvage.", "Pack → Gear: move a piece to the sling, or equip straight from it.", "Carried from the start.", ["always"], "Holds up to ten pieces of gear outside the pack.");
util("utility:robot", "Robot", ["W", "Forge a submersible frame (Pack → Supplies), then call it up ashore"], "As today", "The robot: a suit of plating; hold Jump to boost over chasms.", `${SLOT} to call it up or stow it; hold Jump [K] in the air to boost.`, "Forged as a submersible frame.", ["frame"], "A plated suit: it takes hits first, and its thrust carries you over chasms, water and lava.");
util("utility:drone", "Drone", ["W", "The same submersible frame, set to its drone form"], "As today", "The drone: the frame's flying form.", `${SLOT} to send it out or call it back.`, "Forged as a submersible frame.", ["frame"], "The frame's flying form, for places the suit cannot go.");
util("utility:glider", "Leaf glider", ["F", "Found on the landing of the first great tree climbed"], "As today: already place-tied", "Leaf glider: leave a great tree's crown and Jump to open it.", "Fall from a great tree's crown and press Jump [K] to open it; steer as you fall.", "Found on a great tree's crown.", ["glider"], "Carries you down from a great tree in any direction you steer.");
util("utility:tidemantle", "Tidemantle", ["b", "A flooded dungeon's guardian, or a Saint of the Low Water"], "As today: already a quest", "Tidemantle: you can swim.", "Walk into deep water.", "Earned from a guardian of the low water.", ["swim"], "Lets you swim through deep water.");
util("utility:skiff", "Skiff", ["W", "Bought from a Shipwright once you hold the Tidemantle, or built from wood"], "As today", "Skiff: a boat of your own.", "Board it at the shore with Act [E]; hold Act to leave it.", "Bought or built.", ["skiff"], "Carries you across open water.");
util("utility:diving", "Diving", ["W", "The Bathysal Lens at an island landmark, and a dive rig from a Shipwright"], "As today", "Diving: Act at a dive buoy to go under.", "Act [E] at a dive buoy.", "The Lens found and a rig bought.", ["dive"], "Takes you down at a dive site.");
util("utility:shovel", "Shovel", ["W", "Lashed from wood and stone"], "As today", "Shovel: dig a short way into a dungeon wall.", "Pack → Supplies: lash one from wood and stone, then use it facing a wall.", "Lashed from wood and stone.", ["shovel"], "Digs a shortcut through a wall, never a key.");
for (const k of ["fossilized", "opal", "pumice", "crimson", "abyssal"]) util(`seed:${k}`, SEEDS[k]?.name, ["F", k === "abyssal" ? "Rarer than any other seed: the bizarro world" : "Open ground, chests, Skyland clears, caches, Upwell seed hunts"], "As today", `${SEEDS[k]?.name}: a travel seed.`, "Carried in the seed pouch; a door or keeper that wants it asks.", "Found.", ["seed", k], SEEDS[k]?.text);
util("utility:crossingSigil", "Crossing Sigil", ["F", "Supplies and rewards"], "As today", "Crossing Sigil: travel to and from a crossing from the Atlas.", "From the Atlas, choose a crossing to travel.", "Found or bought.", ["consumable", "crossingSigil"], "Unseals dungeon travel for one trip.");
util("utility:returnEmber", "Return Ember", ["F", "The Deep's way out: chests and caches"], "As today", "Return Ember: the way up out of the Deep.", "Use it in the Deep to climb back out.", "Found.", ["returnEmber"], "Takes you out of the Deep.");

export const PROGRESSION_ROWS = Object.freeze(ROWS);
export const ROW_BY_ID = Object.freeze(Object.fromEntries(ROWS.map((r) => [r.id, r])));
// Code ids whose ability has its row under another id (the Motion capstone Aerial Step is the discipline skill:aerial-step).
export const ROW_ALIASES = Object.freeze({ "aerial-step": "skill:aerial-step" });

// ---------------------------------------------------------------- what it does (read from the game's own tables)
const nodeOf = (id) => Object.values(BRANCHES).flatMap((b) => [b.mod, ...b.caps, ...(b.extras || [])]).find((q) => q.id === id);
const glyphText = (g) => g && typeof g.text === "object" ? Object.entries(g.text).map(([host, t]) => `In ${host === "armor" ? "armour" : `a ${host}`}: ${t}`).join(" ") : String(g?.text || "");
export function doesText(row) {
  if (!row) return "";
  const [kind, arg] = row.own, key = row.id.split(":").slice(1).join(":");
  switch (row.group) {
    case "disciplines": return APERTURE_SKILLS[arg]?.description || "";
    case "spells": return SPELLS[arg]?.text || row.does || "";
    case "nodes": return nodeOf(row.id)?.text || "";
    case "forms": return ALT_PASSIVES[arg]?.text || "";
    case "lattice": return FIELD_PASSIVES[key]?.text || "";
    case "arcana": return ARCANA_UNLOCKS[row.id]?.text || "";
    case "arts": return TOOL_FORMS[key]?.text || "";
    case "awakened": return AWAKENED_ARTS.moves[key] ? `${AWAKENED_ARTS.moves[key].name}: ${AWAKENED_ARTS.moves[key].text}.` : row.id === "awakened:hammerfall-clap" ? `Clap: ${HAMMER_CLAP.text}.` : row.does || "";
    case "echoes": return ECHOES[key]?.text || "";
    case "glyphs": return kind === "glyph" ? glyphText(GLYPHS[key]) : kind === "pairing" ? PAIRINGS[key]?.text || "" : kind === "tesseract" ? row.does : RESONANCES[key]?.text || TRIADS[key]?.text || "";
    case "marginalia": return MARGINALIA[key]?.text || "";
    case "supplies": return kind === "potion" ? `Heals ${POTIONS[arg]?.heal === Infinity ? "all your health" : `${POTIONS[arg]?.heal} health`}.` : kind === "meal" ? `In a meal: ${INGREDIENTS[arg]?.text}.` : row.does || "";
    default: return row.does || "";
  }
}
// The how-to page (design 4A.3): controls, what it does, and where it came from.
export const howTo = (row) => ({ controls: row.controls, does: row.doesV1 || doesText(row), obtained: row.obtained }); // doesV1: Exploration's words (viewV1, Phase 3)

// ---------------------------------------------------------------- ownership under today's rules (mode 0)
// States: "owned" (held, learned or open to use), "open" (today's rules make it available: take it in the Arcanum, or buy it),
// "rumoured" (its creature has been seen; Echoes only), "locked". Reads the save; never writes it.
const tierOf = (save) => APERTURE_BANDS.indexOf(apertureBand(save?.perception?.aperture || 0));
const apertureOf = (save) => Math.max(0, Number(save?.perception?.aperture) || 0);
const heldItems = (save) => [...Object.values(save?.equipment || {}), ...(Array.isArray(save?.inventory) ? save.inventory : []), ...(Array.isArray(save?.sling) ? save.sling : [])].filter((q) => q && typeof q === "object");
const PRIMARY_NAMES = Object.freeze({ "salvage-blade": "Salvage Blade", "cinder-pike": "Cinder Pike", "verge-cleaver": "Verge Cleaver", "iron-fists": "Iron Fists", "fourfold-daggers": "Fourfold Daggers", "quandrix-staff": "Quandrix Staff" });
function gearHeld(save, slot, key) {
  const items = heldItems(save);
  if (slot === "primary") return items.some((q) => q.slot === "primary" && weaponKey(q) === key && (key !== "salvage-blade" || q.id === "salvage-blade" || q.name === PRIMARY_NAMES[key]));
  if (slot === "tool") return items.some((q) => q.slot === "secondary" && toolKey(q) === key);
  const name = ROW_BY_ID[`gear:${key}`]?.name; return items.some((q) => q.name === name);
}
function awakenedHeld(save, which) {
  const woke = heldItems(save).filter((q) => q.awakened);
  if (which === "any") return woke.length > 0;
  if (AWAKENED_ARTS.moves[which]) return woke.some((q) => q.slot === "primary" && weaponKey(q) === AWAKENED_ARTS.moves[which].weapon);
  if (which === "quandrix-staff") return woke.some((q) => q.slot === "primary" && weaponKey(q) === "quandrix-staff");
  if (which === "hammerfall" || which === "great-sweep") return woke.some((q) => q.slot === "secondary" && toolKey(q) === which);
  return woke.some((q) => q.slot === "secondary" && !["hammerfall", "great-sweep"].includes(toolKey(q)));
}
const num = (v) => Math.max(0, Number(v) || 0);
export function stateV0(save, row) {
  if (!save || !row) return "locked";
  const [kind, a, b, c] = row.own, s = save;
  switch (kind) {
    case "skill": {
      if (skillRank(s, a) > 0) return "owned";
      if (a === "aerial-step") return skillRank(s, "quickening") >= APERTURE_SKILLS.quickening.maxRank && !!s.constellation?.mods?.["light-feet"] ? "open" : "locked";
      return apertureOf(s) >= (APERTURE_SKILLS[a]?.threshold ?? Infinity) ? "open" : "locked";
    }
    case "spell": return spellOpenClassic(s, a) ? "owned" : "locked"; // today's rule; Exploration's level gates: stateV1
    case "node": {
      if (hasNode(s, a)) return "owned";
      const br = BRANCHES[b], rank = skillRank(s, br.active);
      return c === "cap" ? (rank >= APERTURE_SKILLS[br.active].maxRank && s.constellation?.mods?.[br.mod.id] ? "open" : "locked") : rank > 0 ? "open" : "locked";
    }
    case "alt": {
      if (!altUnlocked(s) && !formFound(s, a)) return "locked"; // Phase 6: a form found (a milestone or a reliquary) opens before Infinite III
      const learned = a === "quickening" ? skillRank(s, "quickening") > 0 : hasNode(s, a);
      return learned ? "owned" : "locked";
    }
    case "field": return latticeOpen(s) ? "owned" : "locked";
    case "arcana": return arcanaHas(s, a) ? "owned" : "locked";
    case "awakened": return awakenedHeld(s, a) ? "owned" : "locked";
    case "gear": return gearHeld(s, a, b) ? "owned" : "locked";
    case "echo": return s.echoes?.owned?.[a] ? "owned" : s.codex?.creatures?.[a] ? "rumoured" : "locked";
    case "glyph": return s.glyphCodex?.glyphs?.[a] || num(s.glyphs?.[a]) > 0 ? "owned" : "locked";
    case "resonance": return s.glyphCodex?.resonances?.[a] ? "owned" : "locked";
    case "pairing": return s.magicSkills?.pairingsSeen?.[a] ? "owned" : "locked";
    case "tesseract": return (Array.isArray(s.tesseracts?.owned) ? s.tesseracts.owned : []).some((g) => g && (g.kind === a || tesseractClass(g) === TESSERACTS.classes[a])) ? "owned" : "locked";
    case "marginalia": return Array.isArray(s.marginalia?.found) && s.marginalia.found.includes(a) ? "owned" : "locked";
    case "potion": return potionKnown(s, a) ? "owned" : "open"; // carried, brewed or drunk before, or brewable now (potions.ts potionKnown)
    case "meal": return s.meal && num(s.meal.remaining) > 0 && (s.meal.a === a || s.meal.b === a) ? "owned" : "open";
    case "consumable": return num(s.consumables?.[a]) > 0 ? "owned" : "locked";
    case "rounds": return num(s.rounds?.empowered) > 0 ? "owned" : "locked";
    case "mount": return (Array.isArray(s.mounts?.stable) && s.mounts.stable.some((m) => m?.beast === a)) || num(s.mounts?.caught?.[a]) > 0 ? "owned" : "locked";
    case "hatchling": { const h = s.mounts?.hatchling; return h?.owned ? "owned" : h?.quest && h.quest.state && h.quest.state !== "none" ? "open" : "locked"; }
    case "always": return "owned";
    case "frame": return s.mech?.built || s.boat?.sub || num(s.consumables?.submersible) > 0 ? "owned" : "locked";
    case "glider": return s.glider ? "owned" : "locked";
    case "swim": return s.capabilities?.swim === true ? "owned" : "locked";
    case "skiff": return s.boat?.owned === true ? "owned" : "locked";
    case "dive": return s.capabilities?.dive === true ? "owned" : "locked";
    case "shovel": return num(s.digging?.shovel) > 0 ? "owned" : "locked";
    case "seed": return num(s.seedPouch?.[a]) > 0 || num(s.seedPouch?.used?.[a]) > 0 ? "owned" : "locked";
    case "returnEmber": return num(s.theDeep?.embers) > 0 ? "owned" : "locked";
    default: return "locked";
  }
}
// Every row's state, by id.
export const ownershipV0 = (save) => Object.fromEntries(ROWS.map((r) => [r.id, stateV0(save, r)]));
export const ownedV0 = (save, id) => stateV0(save, ROW_BY_ID[ROW_ALIASES[id] || id]) === "owned";

// ---------------------------------------------------------------- the Pace line (design section 7; every player)
// Read from the save: hours played (playSeconds), new sections (explored), abilities owned by their route today, Echoes, and
// deaths an hour (lastDeath.sequence counts every death).
export function pace(save, states = ownershipV0(save), v1 = false) {
  const seconds = num(save?.playSeconds), hours = seconds / 3600, sections = Object.keys(save?.explored && typeof save.explored === "object" ? save.explored : {}).length;
  const byRoute = {};
  for (const r of ROWS) if (!PACE_SKIPS.includes(r.group) && states[r.id] === "owned") { const k = (v1 ? r.v1 : r.v0).route; byRoute[k] = (byRoute[k] || 0) + 1; } // an Exploration journey counts by its own routes
  const echoes = ROWS.filter((r) => r.group === "echoes"), deaths = Math.floor(num(save?.lastDeath?.sequence));
  return { hours, sections, sectionsPerHour: hours > 0 ? sections / hours : null, byRoute, abilities: Object.values(byRoute).reduce((n, v) => n + v, 0),
    echoes: echoes.filter((r) => states[r.id] === "owned").length, echoTotal: echoes.length, deaths, deathsPerHour: hours > 0 ? deaths / hours : null };
}
const ROUTE_WORDS = Object.freeze({ S: "from the start", a: "by levelling", b: "by quests", c: "by milestones", d: "by threads", R: "from reliquaries", V: "for Viscera", F: "found", U: "by upgrades", W: "at the forge and market" });
const fmt = (n, d = 0) => Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
export function paceText(p) {
  const routes = Object.keys(ROUTES).filter((k) => p.byRoute[k]).map((k) => `${p.byRoute[k]} ${ROUTE_WORDS[k]}`).join(", ");
  return [`${fmt(p.hours, 1)} hours played`, `${fmt(p.sections)} sections explored${p.sectionsPerHour != null ? ` (${fmt(p.sectionsPerHour)} an hour)` : ""}`,
    `${p.abilities} abilities${routes ? `: ${routes}` : ""}`, `Echoes ${p.echoes} of ${p.echoTotal}`,
    p.deathsPerHour != null ? `${fmt(p.deathsPerHour, 1)} deaths an hour` : `${p.deaths} deaths`].join(" · ");
}

// ---------------------------------------------------------------- the compendium (design section 5), Classic (v0)
const STATE_WORDS = Object.freeze({ owned: "Yours", open: "Open to you", rumoured: "Rumoured" });
const openWhere = (row, save) => WORLD_ROUTE_OF[row.id] || (STORY_ROUTE_OF[row.id] && (exploring(save) || earnedWorld(save, row.id))) ? worldWhere(save, row) : row.group === "supplies" ? "from a cook or the forge" : row.own[0] === "hatchling" ? (save?.mounts?.hatchling?.quest?.state === "active" ? "a quest is under way" : "the mother waits at the Beast Hotel") : row.group === "lattice" || row.group === "arts" ? "from the Transit Lattice" : row.group === "awakened" ? "at Sela's forge" : "from the Arcanum";
export const COMPENDIUM = Object.freeze({
  title: "What the Corridor Taught You",
  intro: "Everything you can do, and how you came by it. What you have not found stays hidden: only its count shows.",
  before: "Before the Corridor kept count: the line under each says how such a thing is earned.",
});
const AHEAD_GROUPS = Object.freeze(["disciplines", "spells"]);
// The model the Journal draws. Unknown rows are never named: a group shows only how many it holds.
export function compendium(save) {
  const states = ownership(save), groups = [], v1 = exploring(save);
  for (const g of GROUPS) {
    const rows = ROWS.filter((r) => r.group === g.id), entries = [];
    for (const r0 of rows) {
      const state = states[r0.id]; if (state === "locked") continue;
      const r = worldView(save, v1 ? viewV1(r0) : r0); // Exploration's own words for the rows it changes (Phase 3); how a milestone or a reliquary gave it (Phase 6)
      entries.push({ id: r.id, name: r.name, state, label: state === "open" ? `${STATE_WORDS.open}: ${openWhere(r, save)}` : state === "rumoured" ? `${STATE_WORDS.rumoured}: ${boughtRumour(save, r.id) ? boughtRumour(save, r.id).where : STORY_ROUTE_OF[r.id] ? STORY_RUMOUR : `${r.v0.how.charAt(0).toLowerCase()}${r.v0.how.slice(1)}`}` : STATE_WORDS.owned,
        ...(state === "rumoured" ? { hint: "", controls: "", does: "", obtained: "" } : { hint: r.hint, ...howTo(r) }) }); // a rumour names it, no more
    }
    groups.push({ id: g.id, title: g.title, total: rows.length, owned: entries.filter((e) => e.state === "owned").length, entries });
  }
  // Level-ups ahead: the directed gates not yet reached (disciplines by Aperture, spells and the Lattice by band; in Exploration
  // also spells by level, Aerial Step at Aperture 6, awakening and the hatchling at Infinite II and the Lattice's free passives).
  const ahead = [], tier = tierOf(save), ap = apertureOf(save), level = Math.max(1, Math.floor(Number(save?.level)) || 1);
  for (const r of ROWS) {
    const gt = v1 ? gateV1(r) : r.v0.gate; if (!gt || states[r.id] !== "locked" || !(AHEAD_GROUPS.includes(r.group) || (v1 && AHEAD_V1.includes(r.id)))) continue;
    const label = gt.level != null ? (level < gt.level ? `Level ${gt.level}` : null) : gt.aperture != null ? (ap < gt.aperture ? `Aperture ${gt.aperture}` : null) : gt.tier != null && tier < gt.tier ? `${APERTURE_BANDS[gt.tier]?.name || `tier ${gt.tier}`}${gt.listeners ? " and a Listener felled" : ""}` : null;
    if (!label) continue; const at = ahead.find((q) => q.label === label); if (at) at.names.push(r.name); else ahead.push({ label, names: [r.name], ...(gt.tier != null && !gt.listeners && gt.tier > tierCap(save) ? { note: "once a Listener falls" } : {}) }); // Paths part 1: the Aperture holds below it until then
  }
  const p = pace(save, states, v1);
  return { title: COMPENDIUM.title, intro: COMPENDIUM.intro, before: COMPENDIUM.before, mode: modeInfo(progressionMode(save)), pace: p, paceText: paceText(p), ahead, groups };
}

// ================================================================ Phase 2: modes, the start choice (design sections 4.0 and 6)
// The mode is save.progression.mode (journey-start.ts): 0 Classic, 1 Exploration. Classic reads today's rules (stateV0); from
// Phase 3 an Exploration journey on table 2 or later (exploring) reads its own (stateV1, below). An ability in
// save.progression.kept stays open in either mode for good: shown as yours once held, else as open to you (a discipline kept
// across a switch still has to be learned; awakening and the hatchling kept are open, not done).
export const progressionState = (save, row) => { if (!row) return "locked"; const st = exploring(save) ? stateV1(save, row) : stateV0(save, row); return progressionKept(save, row.id) && st !== "owned" ? "open" : st; };
export const ownership = (save) => Object.fromEntries(ROWS.map((r) => [r.id, progressionState(save, r)]));

// ---------------------------------------------------------------- switching (design section 6)
// Allowed any time out of combat; asks for confirmation (main.ts) and says plainly what it does. Never takes anything away.
//   Classic -> Exploration: everything owned, learned or open by today's rules at that moment goes into `kept` (those a mode
//     could ever gate: rows whose Exploration route is not "found", an upgrade or the forge and market) and stays yours.
//   Exploration -> Classic: today's rules apply at once (in this phase Exploration has closed nothing, so nothing waits to open);
//     what was kept stays kept.
export const SWITCH_TEXT = Object.freeze({
  keep: "Abilities you have stay yours in either mode.",
  toExploration: "Switch to Exploration? Everything you hold or could take now under Classic rules is kept for good; what you have not opened yet follows Exploration from now on.",
  toClassic: "Switch to Classic? Today's rules apply at once: whatever their levels and Aperture would give you opens now. Nothing is taken away.",
  fighting: "Not while you are fighting. Switch once the fight is over.",
  same: (name) => `This journey is already ${name}.`,
  done: (name, n) => `Progression is now ${name}.${n ? ` ${n} abilit${n === 1 ? "y is" : "ies are"} kept for good.` : ""}`,
});
const NEVER_GATED = Object.freeze(["F", "U", "W"]);
// Awakening and the hatchling's rescue are open at every moment under today's rules (Sela's forge; the mother at the Beast Hotel),
// so a switch to Exploration always keeps them (design section 6), as it keeps the three starter spells Classic opens at once.
const OPEN_IN_CLASSIC = Object.freeze(["awakened:awakening", "companion:hatchling"]);
export const switchKeeps = (save) => ROWS.filter((r) => !NEVER_GATED.includes(r.v1.route) && (OPEN_IN_CLASSIC.includes(r.id) || ["owned", "open"].includes(stateV0(save, r)))).map((r) => r.id);
export function switchText(save, to) { return `${to === 1 ? SWITCH_TEXT.toExploration : SWITCH_TEXT.toClassic} ${SWITCH_TEXT.keep}`; }
export function switchProgression(save, to, { fighting = false } = {}) {
  const p = ensureProgression(save), from = p.mode, mode = to === 1 ? 1 : 0, info = modeInfo(mode);
  if (from === mode) return { ok: false, message: SWITCH_TEXT.same(info.name) };
  if (fighting) return { ok: false, message: SWITCH_TEXT.fighting };
  let added = 0;
  if (mode === 1) { added = keepAll(p, switchKeeps(save)); p.table = Math.max(Number(p.table) || 1, EXPLORATION.table); } // Exploration from now on, on Phase 3's table
  else if (exploring(save)) added = leaveExploration(save, p); // Classic's rules at once; what only Exploration gave stays
  p.log = [...p.log, { from, to: mode, playSeconds: Math.floor(Math.max(0, Number(save.playSeconds) || 0)), section: `${save.session?.rx ?? 0},${save.session?.ry ?? 0}` }].slice(-PROGRESSION_RECORD.logMax);
  p.mode = mode;
  return { ok: true, from, to: mode, added, message: SWITCH_TEXT.done(info.name, added) };
}

// ---------------------------------------------------------------- the journey creator (design section 4.0)
// Two rows of cards, "Choose your weapon" and "Choose your tool". Weapons are never gated (Tim, 2026-11-20): the choice sets only
// the starting kit, at the starting tier; drops continue as now. The Aether Orrery stays a find. A default pair is chosen
// (today's kit), so Start works at once. Exploration also holds Aegis from the start, in slot B.
export const START_KIT = Object.freeze({
  weapons: Object.freeze(["salvage-blade", "cinder-pike", "verge-cleaver", "iron-fists", "fourfold-daggers", "quandrix-staff"]),
  tools: Object.freeze(["spark-coil", "needle-caster", "lumen-spindle", "rift-bombard", "hammerfall", "great-sweep"]),
  defaults: Object.freeze({ weapon: "salvage-blade", tool: "spark-coil", mode: PROGRESSION_RECORD.newMode }),
  // the item each card gives: today's starter keeps its own id; any other is the game's profile id for it (items.ts)
  ids: Object.freeze({ "salvage-blade": "salvage-blade", "spark-coil": "spark-coil" }),
  property: Object.freeze({ "salvage-blade": "steady", "cinder-pike": "reach", "verge-cleaver": "impact", "iron-fists": "brawler", "fourfold-daggers": FOURFOLD_DAGGERS.property, "quandrix-staff": QUANDRIX_STAFF.property,
    "spark-coil": "focus", "needle-caster": "quick", "lumen-spindle": "focus", "rift-bombard": "blast", hammerfall: "brawler", "great-sweep": "brawler" }),
  aegis: Object.freeze({ id: "spell:aegis", slot: "b", modes: Object.freeze([1]) }),
  dart: "spell:cinder-dart", // Exploration's starter spell (Phase 3), set where a slot held a spell not yet open
});
const goodWith = (row) => row.archetypes.map((a) => ARCHETYPES[a]).filter(Boolean);
// The cards, read from the game's data: the name and play style from the gear rows above, what it scales with from items.ts.
export function startCards(kind) {
  const keys = kind === "tool" ? START_KIT.tools : START_KIT.weapons;
  return keys.map((key) => { const row = ROW_BY_ID[`gear:${key}`], stat = (kind === "tool" ? TOOL_SCALING : WEAPON_SCALING)[key];
    return { key, name: row.name, scales: SCALING_LABELS[stat] || "", style: String(row.hint || "").replace(/^[^:]*:\s*/, "").replace(/^./, (c) => c.toUpperCase()), goodWith: goodWith(row), does: doesText(row) }; });
}
export const startChoice = (kind, key) => ((kind === "tool" ? START_KIT.tools : START_KIT.weapons).includes(key) ? key : START_KIT.defaults[kind === "tool" ? "tool" : "weapon"]);
function startItem(save, slot, key) {
  const base = save.equipment?.[slot] || {}, prefix = slot === "primary" ? "primary-" : "secondary-";
  return { ...base, id: START_KIT.ids[key] || `${prefix}${key}`, name: ROW_BY_ID[`gear:${key}`].name, slot, property: START_KIT.property[key] || base.property, upgradeRank: 0 };
}
// Sets a new journey's start: the mode, start version 1 (the frame turn), the table version, the chosen weapon and tool, and in
// Exploration Aegis held and set in slot B. The seed must already be set (the frame and the first hunt read it). Returns the save.
export function startJourney(save, options = {}) {
  const p = ensureProgression(save), mode = options.mode === 0 ? 0 : options.mode === 1 ? 1 : START_KIT.defaults.mode;
  const weapon = startChoice("weapon", options.weapon), tool = startChoice("tool", options.tool);
  Object.assign(p, { mode, start: START_FRAME.version, table: PROGRESSION_TABLE_VERSION, kit: { weapon, tool } });
  save.equipment ||= {};
  if (weapon !== START_KIT.defaults.weapon) save.equipment.primary = startItem(save, "primary", weapon);
  if (tool !== START_KIT.defaults.tool) save.equipment.secondary = startItem(save, "secondary", tool);
  const A = START_KIT.aegis;
  if (A.modes.includes(mode)) {
    if (!p.kept.includes(A.id)) p.kept = [...p.kept, A.id];
    const ms = save.magicSkills; ensureSlots(save);
    if (!Object.values(ms.slots).includes(A.id)) { ms.slots[A.slot] = A.id; for (let i = 0; i < PRESETS; i++) if (ms.presets?.[i] && !Object.values(ms.presets[i]).includes(A.id)) ms.presets[i][A.slot] = A.id; }
  }
  // Phase 3: Exploration holds Cinder Dart from the start and the later starter spells by level, so a slot holding one not yet
  // open (freshSave's Ember Ring in slot A) takes Cinder Dart instead, and it is the readied spell.
  if (exploring(save)) {
    const ms = save.magicSkills, dart = START_KIT.dart, closed = (k) => typeof k === "string" && k.startsWith("spell:") && !spellOpen(save, k.slice(6));
    for (const slots of [ms.slots, ...(ms.presets || [])]) for (const q of Object.keys(slots || {})) if (["a", "b", "c", "d"].includes(q) && closed(slots[q])) slots[q] = Object.values(slots).includes(dart) ? null : dart;
    if (!spellOpen(save, save.equippedSpell)) save.equippedSpell = dart.slice(6);
  }
  // The Viewport's hunts, from the journey's own seed and frame: freshSave made them before the seed was set (so every journey
  // made in the creator had CINDER-VERGE-47's hunts). A new journey has touched none of them yet; the first hunt is turned.
  // Journeys from before keep the hunts they have.
  save.viewport = freshViewportState(save.seed, saveFrame(save));
  return save;
}
export { PROGRESSION_MODES };

// ================================================================ Phase 3: the core kit (design sections 2.5, 3.1-3.9 and 7 row 3)
// Exploration's gates are data in journey-start.ts (EXPLORATION) and are kept by the code that grants each thing: items.ts
// spellOpen (Ember Ring, Fire Burst and Grave Sun by level), constellation.ts learnAerialStep / capstoneOf / longQuickeningOn
// (Aerial Step a discipline at Aperture 6; Long Quickening the Motion capstone), constellation.ts awakenCheck (awakening from
// Infinite II), game.ts hatchMamaHere (the hatchling's mother from Infinite II). Weapons are never gated: the Iron Fists,
// Hammerfall and Great Sweep already drop from their own seeded stream in both modes (items.ts BRAWLER_LOOT), so no roll moves.
// What waits for a later phase (quests, milestones, threads, reliquaries, Viscera) stays open by today's rules meanwhile.
const LQ = "aerial-step:alt"; // Long Quickening: Classic's secondary form of the Aerial Step capstone, Exploration's Motion capstone
const LATTICE_GATE = Object.freeze({ tier: TRANSIT_LATTICE.openTier, listeners: TRANSIT_LATTICE.openListeners });
// The rows "Level-ups ahead" also names in Exploration, beside the disciplines and spells.
const AHEAD_V1 = Object.freeze([...Object.keys(EXPLORATION.gates), ...EXPLORATION.latticeFree]);
// A row's directed gate under Exploration: its EXPLORATION gate, Aerial Step's Aperture, the Lattice's opening, or today's.
export function gateV1(row) {
  if (!row) return null;
  if (row.id === "skill:aerial-step") return { aperture: EXPLORATION.aerialStep.aperture };
  if (EXPLORATION.gates[row.id]) return EXPLORATION.gates[row.id];
  if (EXPLORATION.latticeFree.includes(row.id)) return LATTICE_GATE;
  return row.v0.gate;
}
// A row's state under Exploration's rules (owned, open, rumoured or locked). Reads the save; never writes it.
export function stateV1(save, row) {
  if (!save || !row) return "locked";
  const s = save;
  if (WORLD_ROUTE_OF[row.id] || STORY_ROUTE_OF[row.id]) return worldState(s, row); // Phase 6: the milestone and reliquary abilities; Phase 7: the quest and thread ones
  if (row.id === "skill:aerial-step") return skillRank(s, "aerial-step") > 0 ? "owned" : apertureOf(s) >= EXPLORATION.aerialStep.aperture ? "open" : "locked";
  if (row.id === LQ) return hasNode(s, "aerial-step") ? "owned" : skillRank(s, "quickening") >= APERTURE_SKILLS.quickening.maxRank && s.constellation?.mods?.[BRANCHES.motion.mod.id] ? "open" : "locked";
  if (row.group === "spells") return spellOpen(s, row.own[1]) ? "owned" : "locked";
  if (row.own[0] === "field") return !latticeOpen(s) ? "locked" : EXPLORATION.latticeFree.includes(row.id) ? "owned" : "open"; // the three are the core kit's; the rest stay open as today until their routes are built
  const st = stateV0(s, row);
  if (EXPLORATION.gates[row.id]) return st !== "locked" ? st : explorationGateOpen(s, row.id) ? "open" : "locked"; // awakening, the hatchling: open once their band is reached
  return st;
}
// Exploration's words for the rows it changes: how each was earned, and Long Quickening as a capstone.
const V1_VIEW = Object.freeze({
  "skill:aerial-step": Object.freeze({ obtained: `Learned for a constellation point once Aperture reached ${EXPLORATION.aerialStep.aperture}.` }),
  [LQ]: Object.freeze({ controls: "Crown the Motion branch with it in Pack → Arcanum (Quickening mastered, Light Feet taken). Always on; nothing to press.", obtained: "Crowned the Motion branch for 2 points, once Quickening was mastered.", does: EXPLORATION.aerialStep.cap.text }),
  "awakened:awakening": Object.freeze({ obtained: "Awakened at Sela's forge, from Infinite II." }),
  "spell:aegis": Object.freeze({ obtained: "Held from the start of the journey." }), // Phase 4: the how-to page says where it came from
  ...Object.fromEntries(Object.entries(EXPLORATION.gates).filter(([, g]) => g.level != null).map(([id, g]) => [id, Object.freeze({ obtained: `Opened at level ${g.level}.` })])),
  ...Object.fromEntries(EXPLORATION.latticeFree.map((id) => [id, Object.freeze({ obtained: "Free when the Transit Lattice opened." })])),
});
export const viewV1 = (row) => (V1_VIEW[row?.id] ? Object.freeze({ ...row, ...V1_VIEW[row.id], ...(V1_VIEW[row.id].does ? { doesV1: V1_VIEW[row.id].does } : {}) }) : row);
// Every row's state as the journey's own rules read it (Exploration's or Classic's), with what it keeps.
export const ownershipV1 = (save) => Object.fromEntries(ROWS.map((r) => [r.id, stateV1(save, r)]));

// Adds `ids` to save.progression.kept (never removes); returns how many were new.
function keepAll(p, ids) {
  const have = new Set(p.kept); let added = 0;
  for (const id of ids) if (!have.has(id)) { have.add(id); added++; }
  p.kept = [...have].slice(0, PROGRESSION_RECORD.keptMax); return added;
}
// Leaving Exploration for Classic: Classic's gates open at once by themselves. The one thing only Exploration's rules gave is
// the Motion capstone read as Long Quickening: under Classic that slot is the Aerial Step capstone, so Aerial Step is granted
// (as Classic's capstone always grants it) and Long Quickening is kept, so both stay. Returns how many ids were newly kept.
function leaveExploration(save, p) {
  if (!hasNode(save, "aerial-step")) return 0;
  save.magicSkills ||= {}; save.magicSkills.learned ||= {};
  if (skillRank(save, "aerial-step") < 1) save.magicSkills.learned["aerial-step"] = 1;
  return keepAll(p, [LQ]);
}
// An Exploration journey from before Phase 3 (Release 1036, table 1) took Phase 2's start with today's rules. On its first load
// under Phase 3 it keeps everything today's rules have open at that moment (as a switch to Exploration does), then reads
// table 2. Nothing it had closes; Aerial Step and Long Quickening it gains. A Classic journey is never touched. Returns the
// number of ids kept, or 0.
// Phase 8: likewise a journey on Phase 7's table (EXPLORATION.storyTable) keeps, on its first load under table 5, those of the
// abilities Phase 8 withholds (its quests' and the Viscera forms) that today's rules have open at that moment.
// Phase 6: an Exploration journey on Phase 3's table (EXPLORATION.coreTable) keeps, on its first load under table 3, those of the
// milestone and reliquary abilities today's rules have open at that moment (learned forms, Lattice picks, Casting Wind once its
// discipline has a rank), and nothing else: the core kit's gates it already reads.
export function adoptExploration(save) {
  const raw = save?.progression;
  if (!raw || raw.mode !== 1 || Number(raw.table) >= EXPLORATION.table) return 0;
  const from = Number(raw.table) || 1, p = ensureProgression(save);
  const later = [...(from < EXPLORATION.worldTable ? Object.keys(WORLD_ROUTE_OF) : []), ...Object.keys(STORY_ROUTE_OF).filter((id) => STORY_SINCE[id] > from)]; // Phase 7: from table 3, only the b and d ones are new; Phase 8: from table 4, only its own
  const ids = from < EXPLORATION.coreTable ? switchKeeps(save) : later.filter((id) => ["owned", "open"].includes(stateV0(save, ROW_BY_ID[id])));
  const added = keepAll(p, ids);
  p.table = EXPLORATION.table;
  return added;
}

// ================================================================ Phase 4: hints and how-to pages (design sections 4A.2, 4A.3, 4A.5)
// A first-use hint is one short line, shown once per journey per subject (hints.ts schedules them; save.hints.seen keeps the
// subjects shown or passed over). Every hint is text from this file: an ability's own row (`row:<id>`, its `hint`, when it is
// first yours), a gate opening on Exploration (`gate:<id>`: a spell at its level, awakening and the hatchling at Infinite II),
// or one of HINT_SUBJECTS below (a status, the first constellation point, the first lead). `kind` "ability" hints show under
// Options → Hints "Only new abilities" too; "status" ones only with hints On; "banner" ones are a one-time event banner.
export const HINT_SUBJECTS = Object.freeze({
  "status:encumbered": Object.freeze({ kind: "status", text: "Encumbered: pull damage fills their meter; full, they hit softer and take more." }),
  "point:constellation": Object.freeze({ kind: "banner", title: "A CONSTELLATION POINT", text: "Spend it at Sela's lens: Pack → Arcanum.", ability: true }),
  "lead:first": Object.freeze({ kind: "banner", title: "A LEAD", text: "Hold the compass to follow it, or don't: leads keep." }),
  "quest:first": Object.freeze({ kind: "ability", ability: true, text: "A quest: the Journal's Leads say what and where. Point the compass here to follow it." }), // Phase 7
});
// Gates that open on Exploration with a line of their own (design 3.6, 3.9): the rows go from locked to open at Infinite II.
export const GATE_HINTS = Object.freeze({
  "awakened:awakening": "Sela: \"Something in your steel is asleep, not dead. Bring it to me.\"",
  "companion:hatchling": "Infinite II: a mother Triceratops waits at the Beast Hotel. She needs help.",
});
const levelGate = (row) => EXPLORATION.gates[row?.id]?.level;
// The subject ids a journey has right now (owned rows; Exploration's opened gates), from its own rules' states.
export function hintSubjectsHeld(save, states = ownership(save)) {
  const out = [], v1 = exploring(save);
  for (const r of ROWS) {
    const st = states[r.id];
    if (st === "owned" && r.hint) out.push(`row:${r.id}`);
    if (v1 && GATE_HINTS[r.id] && (st === "open" || st === "owned")) out.push(`gate:${r.id}`);
  }
  if (milestonesUnderWay(save).length) out.push("milestone:first"); // Phase 6 (4A.5): "Relays restored: 1 of 5. Something answers at 5."
  if (QUEST_IDS.some((id) => questOpen(save, id))) out.push("quest:first"); // Phase 7
  return out;
}
// A subject's hint: { id, kind, text, title?, howTo? } (howTo: the row id whose page the card's "How to" opens), or null.
export function hintFor(save, id) {
  if (id === "milestone:first") { const q = milestonesUnderWay(save)[0]; return q ? { id, kind: "ability", text: `${q.line}. Something answers at ${q.need.toLocaleString("en-US")}.` } : null; }
  if (HINT_SUBJECTS[id]) { const H = HINT_SUBJECTS[id]; return { id, kind: H.kind, text: H.text, ...(H.title ? { title: H.title } : {}), ...(H.ability ? { ability: true } : {}) }; }
  const [kind, ...rest] = String(id).split(":"), rowId = rest.join(":"), row = ROW_BY_ID[rowId];
  if (!row) return null;
  if (kind === "gate") return GATE_HINTS[rowId] ? { id, kind: "ability", text: GATE_HINTS[rowId], howTo: rowId } : null;
  if (kind !== "row" || !row.hint) return null;
  const lv = exploring(save) ? levelGate(row) : null, from = storySource(save, rowId); // 4A.5: a quest's or thread's gift names where it came from
  return { id, kind: "ability", text: lv ? `Level ${lv}: ${row.name} is yours. Set it in a slot in Pack → Arcanum.` : from ? `${row.name}, ${from}: ${row.hint.replace(/^[^:]*:\s*/, "")}` : row.hint, howTo: rowId };
}

// The how-to page of one ability (4A.3): what the compendium knows of it, as a page. Null for anything not yet known to the
// player (locked) or only rumoured, so a page never spoils what is still to be found.
export function howToPage(save, id) {
  const row0 = ROW_BY_ID[ROW_ALIASES[id] || id]; if (!row0) return null;
  const state = progressionState(save, row0); if (state === "locked" || state === "rumoured") return null;
  const row = worldView(save, exploring(save) ? viewV1(row0) : row0), h = howTo(row), group = GROUPS.find((g) => g.id === row.group);
  return { id: row.id, name: row.name, group: group?.title || "", state, hint: row.hint || "",
    sections: [["Controls", h.controls], ["What it does", h.does], ["Where it came from", state === "owned" ? h.obtained : `Not yet yours: ${openWhere(row, save)}.`]].filter(([, t]) => t) };
}

// ================================================================ Phase 6: milestones, the Reliquary and pity (design 2.2, 2.5 G3, 3, 6, 7 row 6)
// The rules are world-routes.ts; world-finds.ts grants. Exploration withholds exactly the milestone (c) and reliquary (R) abilities
// until earned or kept (worldWithheld): a milestone under way reads as open (its count line), a reliquary's stays unknown (hidden,
// X). Found (earned or kept), an ability is yours once it can be used: a form once its node is learned (before Infinite III too),
// a Lattice pick once the Lattice opens, Casting Wind once learned; until then it reads as open, with what it waits for.
function usable(save, row) {
  const [kind, a] = row.own;
  if (kind === "alt") return a === "quickening" ? skillRank(save, "quickening") > 0 : hasNode(save, a);
  if (kind === "field") return latticeOpen(save);
  if (kind === "node") return hasNode(save, a);
  if (kind === "spell") return spellOpen(save, a); // Phase 7: a quest's or thread's spell, once found, is set in a slot
  return false;
}
function worldState(save, row) {
  if (STORY_ROUTE_OF[row.id] && storyWithheld(save, row.id)) return storyState(save, row); // Phase 7
  if (worldWithheld(save, row.id)) { const m = MILESTONE_FOR[row.id]; return m && featCount(save, m.key) > 0 ? "open" : boughtRumour(save, row.id) ? "rumoured" : "locked"; } // Phase 8: a rumour bought with Viscera
  if (!earnedWorld(save, row.id) && !progressionKept(save, row.id)) return stateV0(save, row); // not withheld and not found (an old table): today's rules
  return usable(save, row) ? "owned" : "open";
}
// What an open milestone or reliquary ability waits for (the compendium's "Open to you: ..." and a how-to page's "Not yet yours").
function worldWhere(save, row) {
  if (STORY_ROUTE_OF[row.id] && storyWithheld(save, row.id)) return storyWhere(save, row); // Phase 7
  const m = MILESTONE_FOR[row.id];
  if (worldWithheld(save, row.id)) return m ? `a milestone: ${milestoneLine(m, featCount(save, m.key))}` : "at the bottom of something";
  const [kind] = row.own;
  if (kind === "alt") return "found; learn its node in Pack → Arcanum to use it";
  if (kind === "field") return "found; it waits for the Transit Lattice (Infinite III and a Listener felled)";
  if (kind === "spell") return "found; set it in a slot in Pack → Arcanum";
  return "found; learn it in Pack → Arcanum";
}
// How a milestone or a reliquary gave it (save.feats.earned), for the compendium and the how-to page.
export function worldObtained(save, id) {
  const e = save?.feats?.earned?.[id]; if (!e) return "";
  const m = MILESTONE_FOR[id], when = Number.isFinite(Number(e.at)) ? ` after ${Math.max(0, Number(e.at) / 3600).toFixed(1)} hours` : "";
  if (e.route === "c" && m) return `Earned by a milestone${when}: ${m.name}, ${m.need.toLocaleString("en-US")}.`;
  if (e.route === "b") { const Q = QUESTS[e.from]; return `Earned by a quest${when}: ${Q ? `${Q.title}, for ${Q.giverName}. ${Q.done}` : "a quest."}`; }
  if (e.route === "d") { const t = threadReward(save, e.from); return `Given at the end of ${t ? `${t.title}${when}. ${t.hook}` : `a thread${when}.`}`; }
  if (e.route === "V") return `Bought for ${Number(e.paid) || VISCERA_SHOP.forms[id] || 0} Divine Viscera${when}, at ${e.from === "forge" ? "Sela's forge" : "a smith's"}.`; // Phase 8
  return `Found in a ${RELIQUARY.name.toLowerCase()} at ${RELIQUARY.places[e.from] || "the bottom of something"}${when}.`;
}
const worldView = (save, row) => (row && earnedWorld(save, row.id) ? Object.freeze({ ...row, obtained: worldObtained(save, row.id) }) : row);

// ================================================================ Phase 7: quests (b) and thread rewards (d) (design 2.2, 2.8, 3, 5, 6, 7 row 7)
// The rules are quests.ts; quest-places.ts resolves places; world-finds.ts grants. Exploration withholds exactly the b and d
// abilities whose quest or thread is built (storyWithheld): a quest's reads as open while the quest is (its step), a hinted thread
// reward (H) as rumoured once its thread is begun ("a thread's ending"), a hidden one (X) stays unknown until it is yours.
export const STORY_RUMOUR = "a thread's ending";
const begun = (save, set) => set === "second" ? Array.isArray(save?.lore?.second?.trail) && save.lore.second.trail.length > 0 : Array.isArray(save?.lore?.threads?.[set]) && save.lore.threads[set].length > 0;
// Phase 8: a Viscera form reads as open once refinement is (past 1,000 sections: on sale at Sela's forge and every smith), and any
// withheld ability still unknown reads as rumoured once a rumour about it was bought (quests.ts boughtRumour).
const refining = (save) => save?.refinement?.unlocked === true;
function storyState(save, row) {
  const route = STORY_ROUTE_OF[row.id], rumour = boughtRumour(save, row.id) ? "rumoured" : "locked";
  if (route === "b") return questOpen(save, QUEST_FOR[row.id]) ? "open" : rumour;
  if (route === "V") return refining(save) ? "open" : rumour;
  const set = carrierOf(save, row.id);
  return STORY_SEEN[row.id] === "H" && set && begun(save, set) ? "rumoured" : rumour;
}
function storyWhere(save, row) {
  if (STORY_ROUTE_OF[row.id] === "d") return STORY_RUMOUR;
  if (STORY_ROUTE_OF[row.id] === "V") return `for ${VISCERA_SHOP.forms[row.id]} Divine Viscera at Sela's forge or any smith`;
  const id = QUEST_FOR[row.id], Q = QUESTS[id], step = questOpen(save, id) ? questStep(save, id) : null, who = Q.giver ? `for ${Q.giverName}` : "out on the far road";
  const gate = `${APERTURE_BANDS[Q.gate.tier]?.name || `tier ${Q.gate.tier}`}${Q.gate.far ? `, once you have stood ${Q.gate.far.toLocaleString("en-US")} sections out` : ""}`;
  return step ? `a quest ${who}: ${step.text.charAt(0).toLowerCase()}${step.text.slice(1).replace(/\.$/, "")}` : `a quest that opens at ${gate}`;
}
// "from the Clockmaker's Hours" / "from Hollis Dray's quest" for an ability a quest or a thread gave (save.feats.earned), else "".
function storySource(save, id) {
  const e = save?.feats?.earned?.[id]; if (!e || !["b", "d", "V"].includes(e.route) || e.dust) return "";
  if (e.route === "V") return "bought with Divine Viscera"; // Phase 8
  if (e.route === "b") { const Q = QUESTS[e.from]; return Q ? `from ${Q.giverName}'s quest` : ""; }
  const t = threadReward(save, e.from); return t ? `from ${t.title.replace(/^The /, "the ")}` : "";
}
