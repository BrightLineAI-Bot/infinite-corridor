// Dungeon Monster Pack v1: ten composable creatures built from shared attribute tables.
//
// A pack monster is a composition of five reusable parts, each defined once below:
//   body (render recipe, scale, palette)  ·  movement mode  ·  brain (AI positioning)
//   attack modules (telegraphed abilities)  ·  boss attack modules (unlocked by health phase)
// `composeMonster` builds new creatures from those parts, and `packVariant` deterministically
// grafts one borrowed attack onto some individuals, so the same ten monsters keep producing
// new combinations. Nothing here touches the save, the DOM, or randomness: every choice is a
// pure function of stable ids, so the simulation stays deterministic.
import { hashSeed } from "./random.js?v=r181-eb4e32142255";

export const MONSTER_PACK_VERSION = 1;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- attribute tables

// How a creature travels. `flying` ignores floor hazards and lethal terrain; `phases` lets it move
// through walls (it can never attack from inside one); `burrows` lets it travel unseen underground.
export const MOVEMENT_MODES = {
  walk: { id: "walk", name: "Walker", speed: 1 },
  skitter: { id: "skitter", name: "Skitterer", speed: 1.25 },
  hover: { id: "hover", name: "Hoverer", speed: .9, flying: true },
  fly: { id: "fly", name: "Flier", speed: 1.15, flying: true },
  phase: { id: "phase", name: "Wall-phaser", speed: .95, flying: true, phases: true },
  burrow: { id: "burrow", name: "Burrower", speed: .85, burrows: true },
  blink: { id: "blink", name: "Blinker", speed: 1.1 },
  lurch: { id: "lurch", name: "Lurcher", speed: .6 },
};

// How a creature positions itself around the Wayfarer between attacks.
export const BRAINS = {
  orbit: { id: "orbit", name: "Orbits at range", preferred: [3.4, 5.4] },
  kite: { id: "kite", name: "Keeps its distance", preferred: [4, 6.5], retreat: 2.8 },
  artillery: { id: "artillery", name: "Shells from afar", preferred: [5, 7.5], retreat: 3.4 },
  flank: { id: "flank", name: "Circles behind you", preferred: [1.3, 2.3] },
  duelist: { id: "duelist", name: "Presses close", preferred: [1.2, 2.2] },
  juggernaut: { id: "juggernaut", name: "Squares up to charge", preferred: [3, 6.5] },
  ambush: { id: "ambush", name: "Waits unseen", preferred: [1.5, 3], hiddenUntilAggro: true },
  weeping: { id: "weeping", name: "Moves only when unwatched", preferred: [0.9, 1.6] },
};

// Telegraphed abilities. Times are seconds; `damage` multiplies the creature's damage;
// `jumpable` ground attacks can be jumped, everything can be dodged with the dodge's i-frames.
export const ATTACK_MODULES = {
  bite: { id: "bite", name: "Bite", range: [0, 1.9], cooldown: 1.6, windup: .45, recover: .7, damage: 1, los: true, tags: ["melee"], text: "A short, committed bite in front of it." },
  clawSweep: { id: "clawSweep", name: "Claw Sweep", range: [0, 2.1], cooldown: 1.8, windup: .38, recover: .6, damage: 1, los: true, tags: ["melee"], text: "A wide arc of claws." },
  longStab: { id: "longStab", name: "Long Stab", range: [0, 3], cooldown: 2.2, windup: .55, recover: .8, damage: 1.15, los: true, tags: ["melee"], text: "A narrow lance that reaches farther than it looks." },
  sweepBeam: { id: "sweepBeam", name: "Sweeping Beam", range: [2.2, 8], cooldown: 6, windup: .85, active: 1.45, recover: .8, damage: .45, los: true, tags: ["ranged", "beam"], text: "A persistent beam that sweeps across the room; walls cut it short." },
  groundRupture: { id: "groundRupture", name: "Ground Rupture", range: [0, 7], cooldown: 4.2, windup: .4, recover: .7, damage: 1.2, tags: ["ground"], text: "Marks the floor under you; it erupts a moment later." },
  burrowAmbush: { id: "burrowAmbush", name: "Burrow Ambush", range: [2, 9], cooldown: 7, windup: .5, recover: 1.1, damage: 1.35, tags: ["ground", "burrow"], requires: "burrows", text: "Dives underground, tunnels beneath you and erupts. Keep moving." },
  stillnessCurse: { id: "stillnessCurse", name: "Stillness Curse", passive: true, cooldown: 2.3, damage: 1.3, tags: ["ground", "passive"], text: "Standing still near it condemns the floor beneath you." },
  sigilScatter: { id: "sigilScatter", name: "Sigil Scatter", range: [1.5, 8], cooldown: 5.5, windup: .6, recover: .7, damage: .9, tags: ["ground"], text: "Rings you with sigils, then one under your feet." },
  blinkStrike: { id: "blinkStrike", name: "Blink Strike", range: [2.2, 8], cooldown: 4.5, windup: .55, recover: .55, damage: 1.1, tags: ["melee", "teleport"], text: "Shimmers behind you, then slashes. Watch for the shimmer." },
  mortarVolley: { id: "mortarVolley", name: "Mortar Volley", range: [3, 9], cooldown: 4.8, windup: .55, recover: .8, damage: .9, tags: ["ground", "ranged"], text: "Lobs three shells: one at you, one where you are heading, one astray." },
  webSpit: { id: "webSpit", name: "Web Spit", range: [1.5, 7], cooldown: 5, windup: .5, recover: .5, damage: 0, tags: ["ground", "control"], text: "Webs the floor; you move at half speed inside." },
  leapSlam: { id: "leapSlam", name: "Leap Slam", range: [2, 6], cooldown: 4, windup: .75, active: .35, recover: .9, damage: 1.25, jumpable: true, tags: ["ground", "leap"], text: "Leaps over obstacles onto the marked spot." },
  phaseCharge: { id: "phaseCharge", name: "Phase Charge", range: [2.5, 9], cooldown: 5.5, windup: .9, active: .75, recover: .9, damage: 1.3, tags: ["charge", "phase"], text: "Lines up and charges straight through walls." },
  ramCharge: { id: "ramCharge", name: "Ram Charge", range: [2.5, 9], cooldown: 5, windup: .85, active: 1.1, recover: .8, damage: 1.4, los: true, tags: ["charge"], text: "Charges down a lane. If it hits a wall it is stunned." },
  shockwave: { id: "shockwave", name: "Shockwave", range: [0, 3.6], cooldown: 5, windup: .7, recover: .9, damage: 1, jumpable: true, tags: ["ground"], text: "An expanding ring along the floor. Jump it." },
  mirrorClones: { id: "mirrorClones", name: "Mirror Clones", range: [0, 9], cooldown: 9, windup: .6, recover: .5, damage: 0, tags: ["summon", "illusion"], text: "Splits off two harmless reflections that break in one hit." },
  mirrorSwap: { id: "mirrorSwap", name: "Mirror Swap", range: [0, 9], cooldown: 3.5, windup: .45, recover: .35, damage: 0, tags: ["teleport", "illusion"], text: "Trades places with one of its reflections." },
  diveBomb: { id: "diveBomb", name: "Dive Bomb", range: [2, 9], cooldown: 6, windup: .6, active: 1.45, recover: .9, damage: 1.4, tags: ["ground", "air"], requires: "flying", text: "Rises out of reach; its shadow hunts you, locks, then it crashes down." },
  devourPull: { id: "devourPull", name: "Devouring Pull", range: [1.5, 6], cooldown: 6, windup: .8, active: 1.3, recover: .8, damage: 1.3, tags: ["control"], text: "Inhales: you are dragged toward the maw. Dodge or run against it." },
  broodBirth: { id: "broodBirth", name: "Brood Birth", range: [0, 9], cooldown: 8, windup: .9, recover: .6, damage: 0, tags: ["summon"], text: "Splits off pallid crawlers (at most four alive)." },
  fleshBloom: { id: "fleshBloom", name: "Flesh Bloom", range: [0, 7], cooldown: 5, windup: .6, recover: .6, damage: .35, tags: ["ground", "control"], text: "Living flesh carpets the floor; it slows you and gnaws while you stand in it." },
  spikeVolley: { id: "spikeVolley", name: "Spike Volley", range: [2, 8.5], cooldown: 5.2, windup: .75, recover: .85, damage: .8, jumpable: true, tags: ["ground", "spikes"], text: "Rears up and flings its spikes: five land around and ahead of you." },
  firefall: { id: "firefall", name: "Firefall", range: [1.5, 9], cooldown: 6.5, windup: .7, recover: .8, damage: .85, jumpable: true, tags: ["ground"], text: "Embers rain across the floor around you." },
};

// The ten creatures. `stats` uses the same [hp, damage, range] shape as the base combatant table.
export const MONSTER_PACK = {
  lumenWraith: {
    id: "lumenWraith", name: "Lumen Wraith", epithet: "The Lantern Without a Keeper",
    stats: [42, 8, 6], form: { scale: 1.05 }, sizeClass: "medium", movement: "phase", brain: "orbit",
    attacks: ["sweepBeam", "bite"], bossAttacks: ["sigilScatter", "groundRupture"],
    palette: ["#c9e8f2", "#2c3b52", "#7fe7ff", "#f6fdff"], render: "lumenWraith", tags: ["spirit", "light"],
    lore: "A shroud of cold light that drifts through stone and burns a line across whatever it watches.",
  },
  sunderjaw: {
    id: "sunderjaw", name: "Sunderjaw", epithet: "The Ring-Toothed Delver",
    stats: [74, 11, 0], form: { scale: 1.45, segments: 3, segmentSpacing: .34 }, sizeClass: "large", movement: "burrow", brain: "ambush",
    attacks: ["burrowAmbush", "bite"], bossAttacks: ["groundRupture", "shockwave"],
    palette: ["#8a6a4f", "#2e2219", "#e0b071", "#f3dcb0"], render: "sunderjaw", tags: ["beast", "earth"],
    lore: "Its mound crosses the floor faster than you can walk. When it stops, the ground opens.",
  },
  graveLantern: {
    id: "graveLantern", name: "Grave Lantern", epithet: "Warden of the Unmoving",
    stats: [28, 9, 5], form: { scale: .85 }, sizeClass: "small", movement: "hover", brain: "kite",
    attacks: ["stillnessCurse", "sigilScatter"], bossAttacks: ["groundRupture", "firefall"],
    palette: ["#4d5560", "#1b1e24", "#9dff8a", "#e9ffd9"], render: "graveLantern", tags: ["construct", "curse"],
    lore: "An iron lantern on a ghost chain. It cannot abide anything that stays still.",
  },
  riftLynx: {
    id: "riftLynx", name: "Rift Lynx", epithet: "The Cat Between Steps",
    stats: [36, 9, 0], form: { scale: .98 }, sizeClass: "medium", movement: "blink", brain: "flank",
    attacks: ["blinkStrike", "clawSweep"], bossAttacks: ["shockwave"],
    palette: ["#3b3f63", "#16172b", "#c58cff", "#f1dcff"], render: "riftLynx", tags: ["beast", "rift"],
    lore: "It is always where you are not looking. A violet shimmer is its only courtesy.",
  },
  siegeBeetle: {
    id: "siegeBeetle", name: "Siege Beetle", epithet: "The Walking Battery",
    stats: [64, 10, 7], form: { scale: 1.35, segments: 2, segmentSpacing: .36 }, sizeClass: "large", movement: "walk", brain: "artillery",
    attacks: ["mortarVolley", "bite"], bossAttacks: ["firefall", "shockwave"],
    palette: ["#5b4a3a", "#211a14", "#ff9d4a", "#ffe0b0"], render: "siegeBeetle", tags: ["beast", "artillery"],
    lore: "Its shell grew around an abandoned mortar. It still remembers how to aim.",
  },
  veilSpinner: {
    id: "veilSpinner", name: "Veil Spinner", epithet: "The Patient Weaver",
    stats: [32, 8, 0], form: { scale: 1.08 }, sizeClass: "medium", movement: "skitter", brain: "kite",
    attacks: ["webSpit", "leapSlam", "bite"], bossAttacks: ["groundRupture"],
    palette: ["#4a3d4f", "#18131a", "#e7d6f2", "#ff6b8a"], render: "veilSpinner", tags: ["beast", "web"],
    lore: "It webs the floor, waits for you to slow, and drops on you from the dark.",
  },
  strataEel: {
    id: "strataEel", name: "Strata Eel", epithet: "Swimmer in the Stone",
    stats: [46, 10, 0], form: { scale: 1.2, segments: 5, segmentSpacing: .28 }, sizeClass: "large", movement: "phase", brain: "juggernaut",
    attacks: ["phaseCharge", "bite"], bossAttacks: ["groundRupture", "sweepBeam"],
    palette: ["#2f6f73", "#10282b", "#7ff5d8", "#e6fff8"], render: "strataEel", tags: ["beast", "phase"],
    lore: "Walls are water to it. It surfaces, takes aim, and swims straight through the room.",
  },
  thunderhorn: {
    id: "thunderhorn", name: "Thunderhorn", epithet: "The Battering Ram",
    stats: [92, 13, 0], form: { scale: 1.55 }, sizeClass: "huge", movement: "walk", brain: "juggernaut",
    attacks: ["ramCharge", "shockwave", "bite"], bossAttacks: ["groundRupture"],
    palette: ["#6d5a4c", "#251d18", "#ffd25a", "#fff1c2"], render: "thunderhorn", tags: ["beast", "charge"],
    lore: "It charges until something breaks. Make sure it is the wall.",
  },
  mirrorShade: {
    id: "mirrorShade", name: "Mirror Shade", epithet: "The Many-Faced Liar",
    stats: [38, 9, 0], form: { scale: 1.12 }, sizeClass: "medium", movement: "walk", brain: "duelist",
    attacks: ["mirrorClones", "mirrorSwap", "longStab"], bossAttacks: ["blinkStrike", "sweepBeam"],
    palette: ["#9aa3b5", "#262a35", "#dff3ff", "#ff9ee8"], render: "mirrorShade", tags: ["spirit", "illusion"],
    lore: "Two of the three are reflections. The one that does not crack is the one that bleeds.",
  },
  cinderSeraph: {
    id: "cinderSeraph", name: "Cinder Seraph", epithet: "The Burning Choir",
    stats: [82, 12, 6], form: { scale: 1.3 }, sizeClass: "large", movement: "fly", brain: "orbit",
    attacks: ["diveBomb", "firefall"], bossAttacks: ["sweepBeam", "shockwave"],
    palette: ["#a8452c", "#2d120c", "#ffc35a", "#fff3c9"], render: "cinderSeraph", tags: ["spirit", "fire"],
    lore: "Six wings of ember and a halo of knives. It rises out of reach before it falls on you.",
  },
  // ---- dungeon-only grotesques (operator ask 2026-10-14: actively creepy things that never walk the overworld)
  weepingSaint: {
    id: "weepingSaint", name: "Weeping Saint", epithet: "It Moves When You Look Away", dungeonOnly: true,
    stats: [58, 13, 0], form: { scale: 1.25 }, sizeClass: "large", movement: "walk", brain: "weeping",
    attacks: ["longStab", "clawSweep"], bossAttacks: ["sigilScatter", "blinkStrike"],
    palette: ["#b9b1a4", "#2a2622", "#d9d2c6", "#7a1f1f"], render: "weepingSaint", tags: ["spirit", "stalker"],
    lore: "A veiled figure with its hands over its face. Every time you turn around it is closer.",
  },
  amalgam: {
    id: "amalgam", name: "The Amalgam", epithet: "Many Who Became One", dungeonOnly: true,
    stats: [96, 11, 0], form: { scale: 1.5 }, sizeClass: "huge", movement: "lurch", brain: "duelist",
    attacks: ["fleshBloom", "broodBirth", "bite"], bossAttacks: ["shockwave"],
    palette: ["#c99a8f", "#3a1a1c", "#f2d0c4", "#6b0f1a"], render: "amalgam", tags: ["flesh", "brood"],
    lore: "Fused bodies dragging themselves forward as one. The floor behind it is still breathing.",
  },
  pallidCrawler: {
    id: "pallidCrawler", name: "Pallid Crawler", epithet: "The Brood", dungeonOnly: true,
    stats: [12, 6, 0], form: { scale: .62 }, sizeClass: "small", movement: "skitter", brain: "flank",
    attacks: ["bite", "leapSlam"], bossAttacks: [],
    palette: ["#e3d6cf", "#3b2a2a", "#ffffff", "#9b1c25"], render: "pallidCrawler", tags: ["flesh", "brood"],
    lore: "Too many joints, no eyes, and a mouth where a face should be. It is never alone.",
  },
  hangedChoir: {
    id: "hangedChoir", name: "Hanged Choir", epithet: "The Ones Who Sing From the Ceiling", dungeonOnly: true,
    stats: [64, 11, 6], form: { scale: 1.3 }, sizeClass: "large", movement: "hover", brain: "orbit",
    attacks: ["diveBomb", "sigilScatter"], bossAttacks: ["sweepBeam"],
    palette: ["#5b5550", "#151312", "#cbbfa8", "#d1e86a"], render: "hangedChoir", tags: ["spirit", "chorus"],
    lore: "Shrouded bodies on chains, swaying in a wind you cannot feel. Their hum stops just before they drop.",
  },
  // The Listener (release 138): the Far Array's final foe; its moves are set per form in game.ts (far-array.ts LISTENER_FORMS).
  listener: {
    id: "listener", name: "The Listener", epithet: "The One Who Learned Every Way Home", unique: true, dungeonOnly: true,
    stats: [260, 15, 0], form: { scale: 1.25 }, sizeClass: "large", movement: "blink", brain: "duelist",
    attacks: ["blinkStrike", "clawSweep", "longStab", "mirrorClones"], bossAttacks: ["mirrorSwap", "shockwave"],
    palette: ["#3b3550", "#0d0b14", "#c9a6ff", "#f3eaff"], render: "listener", tags: ["spirit", "relay", "mirror"],
    lore: "It learned the line by listening, and learned you by the roads you opened and the walls you raised. It wears what you taught it.",
  },
  // The Questing Beast (release 116): a unique, purely physical hunter. Never in spawn pools; see src/questing-beast.ts.
  questingBeast: {
    id: "questingBeast", name: "The Questing Beast", epithet: "The Hunger That Hunts You Back", unique: true,
    stats: [220, 16, 0], form: { scale: 1.75 }, sizeClass: "large", movement: "walk", brain: "duelist",
    attacks: ["leapSlam", "clawSweep", "spikeVolley", "ramCharge"], bossAttacks: ["shockwave", "bite"],
    palette: ["#4a4650", "#141218", "#ff4a3a", "#f2ece0"], render: "questingBeast", tags: ["beast", "elder", "spikes"],
    lore: "A horned, winged hunter bristling with spikes that grow back pale and harden black. It leaps, it slams, it hurls its own spines, and when wounded it only grows angrier.",
  },
  gnawingMaw: {
    id: "gnawingMaw", name: "Gnawing Maw", epithet: "The Hunger in the Walls", dungeonOnly: true,
    stats: [70, 14, 0], form: { scale: 1.35 }, sizeClass: "large", movement: "phase", brain: "ambush",
    attacks: ["devourPull", "bite"], bossAttacks: ["groundRupture"],
    palette: ["#6e2a2e", "#1a0a0b", "#e8d9c2", "#ff4a4a"], render: "gnawingMaw", tags: ["flesh", "wall"],
    lore: "A mouth that lives inside the masonry. It breathes in, and the room leans toward it.",
  },
};

export const PACK_KINDS = Object.keys(MONSTER_PACK);
export function isPackKind(kind) { return Object.hasOwn(MONSTER_PACK, kind); }
export const PACK_FORMS = Object.fromEntries(PACK_KINDS.map((id) => [id, { ...MONSTER_PACK[id].form }]));
export const PACK_STATS = Object.fromEntries(PACK_KINDS.map((id) => [id, [...MONSTER_PACK[id].stats]]));

// Boss form shared by every pack creature: tougher, larger, faster cadence, and its
// `bossAttacks` unlock at 66% and 33% health so the fight changes as it goes.
export const PACK_BOSS_TEMPLATE = { hp: 3.4, damage: 1.3, scale: 1.35, cooldown: .85, enrage: .5, phases: [.66, .33] };

// Ordinary-dungeon guardians: the Hollow Marshal stays in the rotation; every pack creature
// can now guard a dungeon in its boss form.
export const GUARDIAN_POOL = ["hollowMarshal", "weepingSaint", "amalgam", "hangedChoir", "gnawingMaw", "sunderjaw", "thunderhorn", "cinderSeraph", "siegeBeetle", "lumenWraith", "mirrorShade", "strataEel", "veilSpinner", "riftLynx", "graveLantern"];
export function guardianKindFor(seed, identity) { return GUARDIAN_POOL[hashSeed(`${seed}:guardian:pack-v${MONSTER_PACK_VERSION}:${identity}`) % GUARDIAN_POOL.length]; }

// Dungeon ecologies gain pack residents; each entry is [kind, encounter role].
export const PACK_ECOLOGY_ADDITIONS = {
  hollow: [["graveLantern", "keeper"], ["riftLynx", "hunter"], ["mirrorShade", "ambusher"], ["weepingSaint", "ambusher"], ["gnawingMaw", "keeper"]],
  cistern: [["strataEel", "hunter"], ["veilSpinner", "ambusher"], ["sunderjaw", "blocker"], ["amalgam", "blocker"], ["pallidCrawler", "hunter"]],
  kiln: [["siegeBeetle", "ranged"], ["cinderSeraph", "ranged"], ["thunderhorn", "blocker"], ["amalgam", "blocker"]],
  threefold: [["lumenWraith", "ranged"], ["thunderhorn", "blocker"], ["riftLynx", "hunter"], ["hangedChoir", "ranged"]],
  descent: [["sunderjaw", "hunter"], ["graveLantern", "keeper"], ["siegeBeetle", "ranged"], ["hangedChoir", "ranged"], ["weepingSaint", "ambusher"]],
  loop: [["mirrorShade", "ambusher"], ["lumenWraith", "ranged"], ["veilSpinner", "keeper"], ["hangedChoir", "ranged"], ["gnawingMaw", "keeper"]],
  flooded: [["strataEel", "hunter"], ["lumenWraith", "ranged"], ["veilSpinner", "ambusher"], ["gnawingMaw", "keeper"], ["pallidCrawler", "hunter"]],
  fortress: [["thunderhorn", "blocker"], ["mirrorShade", "keeper"], ["siegeBeetle", "ranged"], ["weepingSaint", "keeper"], ["amalgam", "blocker"]],
};

// Slightly denser dungeons for histories that adopt the pack (see populateDungeonEncounters).
export const PACK_DENSITY = { ordinaryBonus: 2, deepBonus: 3, infestedBonus: 2, activeCap: { normal: 8, infested: 10 } };

// ---------------------------------------------------------------- composition

// Build a new creature definition from an existing one plus overrides. Attack lists are replaced
// unless given as { add: [...] }; unknown modules are rejected so a bad composite fails loudly.
export function composeMonster(baseId, overrides = {}) {
  const base = typeof baseId === "string" ? MONSTER_PACK[baseId] : baseId;
  if (!base) throw new Error(`unknown monster base: ${baseId}`);
  const list = (current, value) => value == null ? [...current] : Array.isArray(value) ? [...value] : [...current, ...(value.add || [])].filter((id) => !(value.remove || []).includes(id));
  const def = {
    ...base, ...overrides,
    id: overrides.id || base.id,
    form: { ...base.form, ...(overrides.form || {}) },
    stats: overrides.stats ? [...overrides.stats] : [...base.stats],
    palette: overrides.palette ? [...overrides.palette] : [...base.palette],
    attacks: list(base.attacks, overrides.attacks),
    bossAttacks: list(base.bossAttacks || [], overrides.bossAttacks),
    tags: list(base.tags || [], overrides.tags),
  };
  const problems = validateMonster(def);
  if (problems.length) throw new Error(`invalid composite ${def.id}: ${problems.join("; ")}`);
  return def;
}

export function validateMonster(def) {
  const problems = [], move = MOVEMENT_MODES[def?.movement];
  if (!def?.id) problems.push("missing id");
  if (!move) problems.push(`unknown movement ${def?.movement}`);
  if (!BRAINS[def?.brain]) problems.push(`unknown brain ${def?.brain}`);
  if (!Array.isArray(def?.stats) || def.stats.length !== 3 || def.stats.some((n) => !Number.isFinite(n))) problems.push("stats must be [hp, damage, range]");
  for (const id of [...(def?.attacks || []), ...(def?.bossAttacks || [])]) {
    const attack = ATTACK_MODULES[id];
    if (!attack) { problems.push(`unknown attack ${id}`); continue; }
    if (attack.requires && !move?.[attack.requires]) problems.push(`${id} requires ${attack.requires} movement`);
  }
  if (!(def?.attacks || []).some((id) => !ATTACK_MODULES[id]?.passive)) problems.push("needs at least one active attack");
  return problems;
}

// Deterministic per-individual variation: some creatures borrow one attack from another pack
// monster (only modules their movement can perform), so encounters keep surprising.
export function packVariant(kind, identity) {
  const def = MONSTER_PACK[kind];
  if (!def) return { hybridAttack: null, donor: null };
  const n = hashSeed(`pack-variant:v${MONSTER_PACK_VERSION}:${kind}:${identity}`);
  if (n % 100 >= 22) return { hybridAttack: null, donor: null };
  const move = MOVEMENT_MODES[def.movement], own = new Set([...def.attacks, ...(def.bossAttacks || [])]);
  const options = PACK_KINDS.filter((id) => id !== kind && !MONSTER_PACK[id].dungeonOnly && !MONSTER_PACK[id].unique).flatMap((donor) => MONSTER_PACK[donor].attacks.map((attack) => ({ donor, attack })))
    .filter(({ attack }) => !own.has(attack) && !ATTACK_MODULES[attack].passive && !ATTACK_MODULES[attack].tags.includes("illusion") && !ATTACK_MODULES[attack].tags.includes("summon") && (!ATTACK_MODULES[attack].requires || move[ATTACK_MODULES[attack].requires]));
  if (!options.length) return { hybridAttack: null, donor: null };
  const pick = options[Math.floor(n / 100) % options.length];
  return { hybridAttack: pick.attack, donor: pick.donor };
}

// Fields merged into a base combatant (see createCombatant in combat.ts).
export function packCombatantFields(kind, id, boss = false, definition = MONSTER_PACK[kind]) {
  const def = definition, variant = packVariant(kind, id), move = MOVEMENT_MODES[def.movement];
  const fields = {
    packKind: true, packVersion: MONSTER_PACK_VERSION, packName: def.name,
    movement: def.movement, brain: def.brain, flying: !!move.flying, phases: !!move.phases, burrows: !!move.burrows,
    packAttacks: [...def.attacks, ...(variant.hybridAttack ? [variant.hybridAttack] : [])],
    packBossAttacks: boss ? [...(def.bossAttacks || [])] : [],
    hybridAttack: variant.hybridAttack, hybridDonor: variant.donor,
    meleePatterns: [], instantStrike: false,
    pack: freshPackState(),
  };
  return fields;
}

export function applyPackBossForm(enemy) {
  const t = PACK_BOSS_TEMPLATE;
  enemy.maxHp = enemy.hp = Math.round(enemy.maxHp * t.hp);
  enemy.damage = Math.max(1, Math.round(enemy.damage * t.damage));
  enemy.scale = Math.round(enemy.scale * t.scale * 100) / 100;
  enemy.bodyRadius = .38 + Math.max(0, enemy.scale - 1) * .3;
  enemy.attackCooldownScale = (Number(enemy.attackCooldownScale) || 1) * t.cooldown;
  return enemy;
}

export function freshPackState() { return { v: MONSTER_PACK_VERSION, state: "move", attack: null, phase: null, t: 0, cd: {}, seq: 0, tele: null, gap: .8, stillT: 0, anchor: null, orbitDir: 0 }; }

// Called when an enemy is restored from a save: transient attack state never resumes mid-swing.
export function resetPackRuntime(enemy) {
  if (!enemy?.packKind) return enemy;
  const cd = enemy.pack?.cd || {};
  enemy.pack = { ...freshPackState(), cd: { ...cd } };
  enemy.untargetable = false; enemy.hidden = false; enemy.aloft = false; enemy.phasing = false;
  return enemy;
}

export function packDefinition(enemy) { return MONSTER_PACK[enemy?.kind] || null; }

export function availableAttacks(enemy) {
  const ids = [...(enemy.packAttacks || [])];
  if (enemy.boss) {
    const fraction = (Number(enemy.hp) || 0) / Math.max(1, Number(enemy.maxHp) || 1), unlocked = PACK_BOSS_TEMPLATE.phases.filter((p) => fraction <= p).length;
    ids.push(...(enemy.packBossAttacks || []).slice(0, unlocked));
  }
  return ids.filter((id, i) => ATTACK_MODULES[id] && ids.indexOf(id) === i);
}

// ---------------------------------------------------------------- runtime helpers

const center = (q) => ({ x: Number(q.x) || 0, y: Number(q.y) || 0 });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function unit(x, y) { const m = Math.hypot(x, y) || 1; return { x: x / m, y: y / m }; }
function bodyRadius(e) { return Math.max(.28, Number(e?.bodyRadius) || .38); }
function damageOf(e, attackId) { return Math.max(1, Math.ceil((Number(e.damage) || 1) * (ATTACK_MODULES[attackId]?.damage ?? 1))); }
function cooldownScale(e) { const enraged = e.boss && e.hp <= e.maxHp * PACK_BOSS_TEMPLATE.enrage; return (Number(e.attackCooldownScale) || 1) * (enraged ? .8 : 1); }
function segmentDistance(p, a, b) { const vx = b.x - a.x, vy = b.y - a.y, l = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / l)); return Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t)); }
function inArc(e, target, aim, radius, arcDegrees) {
  const dx = target.x - e.x, dy = target.y - e.y, d = Math.hypot(dx, dy);
  if (d > radius) return false;
  if (d < .25) return true;
  return Math.acos(Math.max(-1, Math.min(1, (dx * aim.x + dy * aim.y) / d))) <= arcDegrees * Math.PI / 360;
}
// Walk a ray until the first tile that blocks sight; beams and charge lanes stop there.
export function rayLength(w, from, dir, max) {
  for (let t = .25; t <= max; t += .25) if (!w.tileOpen(from.x + .5 + dir.x * t, from.y + .5 + dir.y * t)) return Math.max(.25, t - .25);
  return max;
}
function nearestOpen(w, x, y, radius = 3) {
  if (w.open(x, y)) return { x, y };
  for (let r = .5; r <= radius; r += .5) for (let i = 0; i < 12; i++) { const a = i * TAU / 12, q = { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r }; if (w.open(q.x, q.y)) return q; }
  return null;
}
function playerVelocity(w) { return w.playerVelocity || { x: 0, y: 0 }; }

function beginAttack(e, s, id, w) {
  const attack = ATTACK_MODULES[id];
  s.attack = id; s.phase = "windup"; s.t = attack.windup || .5; s.seq++; s.data = {}; s.hitOnce = false;
  s.cd[id] = attack.cooldown * cooldownScale(e);
  const p = center(w.player);
  s.data.aim = unit(p.x - e.x, p.y - e.y);
  s.data.target = { ...p };
  START[id]?.(e, s, w, attack);
}
function endAttack(e, s) {
  const attack = ATTACK_MODULES[s.attack];
  s.state = "move"; s.attack = null; s.phase = null; s.tele = null; s.data = null;
  s.gap = (attack?.recover || .6) * .6 + .45;
  e.untargetable = false; e.hidden = false; e.aloft = false;
}
function toPhase(s, phase, seconds) { s.phase = phase; s.t = seconds; }

// Each runner advances its attack; it reads/writes s.data and s.tele (the renderer draws s.tele).
const START = {
  bite(e, s) { s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + 1.25, arc: 100 }; },
  clawSweep(e, s) { s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + 1.45, arc: 140 }; },
  longStab(e, s) { s.tele = { type: "rect", aim: s.data.aim, length: 3, width: .5 }; },
  sweepBeam(e, s, w) { const base = Math.atan2(s.data.aim.y, s.data.aim.x), dir = hashSeed(`${e.id}:${s.seq}`) % 2 ? 1 : -1; s.data.from = base - dir * .7; s.data.to = base + dir * .7; s.data.angle = s.data.from; s.data.tick = 0; s.tele = { type: "beam", angle: s.data.angle, length: rayLength(w, e, { x: Math.cos(s.data.angle), y: Math.sin(s.data.angle) }, 8), charging: true }; },
  groundRupture(e, s, w) { w.addEffect({ kind: "rupture", owner: e.id, x: s.data.target.x, y: s.data.target.y, radius: 1.2, arming: .95, damage: damageOf(e, "groundRupture"), jumpable: true }); },
  sigilScatter(e, s, w) { const p = s.data.target; for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + (hashSeed(`${e.id}:${s.seq}`) % 90) * Math.PI / 180; w.addEffect({ kind: "sigil", owner: e.id, x: p.x + Math.cos(a) * 1.9, y: p.y + Math.sin(a) * 1.9, radius: 1, arming: 1.05, damage: damageOf(e, "sigilScatter"), jumpable: true }); } w.addEffect({ kind: "sigil", owner: e.id, x: p.x, y: p.y, radius: 1.05, arming: 1.45, damage: damageOf(e, "sigilScatter"), jumpable: true }); },
  mortarVolley(e, s, w) {
    const p = s.data.target, v = playerVelocity(w), stray = (hashSeed(`${e.id}:${s.seq}:stray`) % 628) / 100;
    s.data.shells = [{ x: p.x, y: p.y }, { x: p.x + v.x * 1.15, y: p.y + v.y * 1.15 }, { x: p.x + Math.cos(stray) * 1.7, y: p.y + Math.sin(stray) * 1.7 }];
    s.tele = { type: "brace" };
  },
  webSpit(e, s) { s.tele = { type: "spit", target: { ...s.data.target } }; },
  leapSlam(e, s) { s.tele = { type: "circle", x: s.data.target.x, y: s.data.target.y, radius: 1.3 }; },
  spikeVolley(e, s, w) {
    const p = s.data.target, v = playerVelocity(w), turn = (hashSeed(`${e.id}:${s.seq}:spikes`) % 628) / 100;
    s.data.spikes = [{ x: p.x, y: p.y }, { x: p.x + v.x * 1.2, y: p.y + v.y * 1.2 }, ...[0, 1, 2].map((i) => ({ x: p.x + Math.cos(turn + i * TAU / 3) * 1.9, y: p.y + Math.sin(turn + i * TAU / 3) * 1.9 }))];
    s.tele = { type: "brace" };
  },
  blinkStrike(e, s, w) {
    const p = s.data.target, away = unit(p.x - e.x, p.y - e.y), v = playerVelocity(w), facing = Math.hypot(v.x, v.y) > .1 ? unit(v.x, v.y) : away, options = [];
    for (let i = 0; i < 8; i++) { const a = Math.atan2(-facing.y, -facing.x) + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 5; options.push({ x: p.x + Math.cos(a) * 1.55, y: p.y + Math.sin(a) * 1.55 }); }
    s.data.dest = options.find((q) => w.open(q.x, q.y)) || null;
    s.tele = s.data.dest ? { type: "blink", x: s.data.dest.x, y: s.data.dest.y } : null;
  },
  phaseCharge(e, s, w) { const len = 8.5; s.data.end = { x: e.x + s.data.aim.x * len, y: e.y + s.data.aim.y * len }; s.tele = { type: "lane", aim: s.data.aim, length: len, width: .6, phase: true }; },
  ramCharge(e, s, w) { const len = rayLength(w, e, s.data.aim, 8); s.tele = { type: "lane", aim: s.data.aim, length: len, width: .75 }; },
  shockwave(e, s) { s.tele = { type: "ring", radius: 3.6 }; },
  mirrorClones(e, s) { s.tele = { type: "shimmer" }; },
  mirrorSwap(e, s, w) { const clones = w.enemies.filter((q) => !q.dead && q.illusion && q.summonedBy === e.id); s.data.clone = clones.length ? clones[s.seq % clones.length].id : null; s.tele = s.data.clone ? { type: "shimmer" } : null; },
  diveBomb(e, s) { e.aloft = true; e.untargetable = true; s.tele = { type: "rise" }; },
  firefall(e, s) { s.tele = { type: "brace" }; },
  burrowAmbush(e, s) { s.tele = { type: "submerge" }; },
  devourPull(e, s) { s.tele = { type: "ring", radius: 6, inhale: true }; },
  broodBirth(e, s) { s.tele = { type: "shimmer" }; },
  fleshBloom(e, s) { s.tele = { type: "spit", target: { ...s.data.target } }; },
};

function resolveMelee(e, s, w, attackId, test) {
  const p = center(w.player);
  if (test(p) && w.los(e, w.player)) w.hurt(e, damageOf(e, attackId), { jumpable: false, source: attackId });
}

const RUN = {
  devourPull(e, s, w) {
    const attack = ATTACK_MODULES.devourPull;
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", attack.active); return; }
    if (s.phase === "active") {
      w.pull?.(e, 2.6 * w.dt, 6.5);
      if (!s.hitOnce && distance(center(w.player), e) <= bodyRadius(e) + .9) { s.hitOnce = true; w.hurt(e, damageOf(e, "devourPull"), { jumpable: false, source: "devourPull" }); }
      if (s.t <= 0) { s.tele = null; toPhase(s, "recover", attack.recover); }
    }
  },
  broodBirth(e, s, w) {
    if (s.phase === "windup" && s.t <= 0) {
      const alive = w.enemies.filter((q) => !q.dead && q.broodOf === e.id).length;
      for (let i = alive; i < Math.min(4, alive + 2); i++) { const a = (i / 2) * Math.PI + (hashSeed(`${e.id}:${s.seq}`) % 100) / 30, spot = nearestOpen(w, e.x + Math.cos(a) * 1.3, e.y + Math.sin(a) * 1.3, 2); if (spot) w.spawnMinion?.(e, "pallidCrawler", spot.x, spot.y, i); }
      s.tele = null; toPhase(s, "recover", ATTACK_MODULES.broodBirth.recover);
    }
  },
  fleshBloom(e, s, w) {
    if (s.phase === "windup" && s.t <= 0) {
      w.addEffect({ kind: "flesh", owner: e.id, x: s.data.target.x, y: s.data.target.y, radius: 1.35, arming: .35, life: 6, damage: damageOf(e, "fleshBloom"), slow: .55 });
      w.addEffect({ kind: "flesh", owner: e.id, x: e.x, y: e.y, radius: 1.1, arming: .2, life: 5, damage: damageOf(e, "fleshBloom"), slow: .55 });
      s.tele = null; toPhase(s, "recover", ATTACK_MODULES.fleshBloom.recover);
    }
  },
  bite(e, s, w) { if (s.phase === "windup" && s.t <= 0) { resolveMelee(e, s, w, "bite", (p) => inArc(e, p, s.data.aim, bodyRadius(e) + 1.25 + .3, 100)); s.tele = null; toPhase(s, "recover", ATTACK_MODULES.bite.recover); } },
  clawSweep(e, s, w) { if (s.phase === "windup" && s.t <= 0) { resolveMelee(e, s, w, "clawSweep", (p) => inArc(e, p, s.data.aim, bodyRadius(e) + 1.45 + .3, 140)); s.tele = null; toPhase(s, "recover", ATTACK_MODULES.clawSweep.recover); } },
  longStab(e, s, w) {
    if (s.phase === "windup" && s.t <= 0) {
      const a = s.data.aim;
      resolveMelee(e, s, w, "longStab", (p) => { const dx = p.x - e.x, dy = p.y - e.y, f = dx * a.x + dy * a.y, l = Math.abs(dx * a.y - dy * a.x); return f >= -.2 && f <= 3.3 && l <= .5 + .35; });
      s.tele = null; toPhase(s, "recover", ATTACK_MODULES.longStab.recover);
    }
  },
  sweepBeam(e, s, w) {
    const attack = ATTACK_MODULES.sweepBeam;
    if (s.phase === "windup") { if (s.t <= 0) { toPhase(s, "active", attack.active * (e.boss ? 1.25 : 1)); s.data.total = s.t; s.tele.charging = false; } return; }
    if (s.phase === "active") {
      const k = 1 - Math.max(0, s.t) / s.data.total; s.data.angle = s.data.from + (s.data.to - s.data.from) * k;
      const dir = { x: Math.cos(s.data.angle), y: Math.sin(s.data.angle) }, len = rayLength(w, e, dir, 8);
      s.tele = { type: "beam", angle: s.data.angle, length: len, charging: false };
      s.data.tick -= w.dt;
      if (s.data.tick <= 0 && segmentDistance(center(w.player), e, { x: e.x + dir.x * len, y: e.y + dir.y * len }) <= .55) { w.hurt(e, damageOf(e, "sweepBeam"), { jumpable: false, source: "sweepBeam", beam: true }); s.data.tick = .32; }
      if (s.t <= 0) { s.tele = null; toPhase(s, "recover", attack.recover); }
    }
  },
  groundRupture(e, s) { if (s.phase === "windup" && s.t <= 0) toPhase(s, "recover", ATTACK_MODULES.groundRupture.recover); },
  sigilScatter(e, s) { if (s.phase === "windup" && s.t <= 0) toPhase(s, "recover", ATTACK_MODULES.sigilScatter.recover); },
  mortarVolley(e, s, w) {
    if (s.phase === "windup" && s.t <= 0) {
      s.data.shells.forEach((q, i) => w.addEffect({ kind: "mortar", owner: e.id, x: q.x, y: q.y, radius: 1, arming: 1.15 + i * .18, damage: damageOf(e, "mortarVolley"), jumpable: true, from: { x: e.x, y: e.y } }));
      s.tele = null; toPhase(s, "recover", ATTACK_MODULES.mortarVolley.recover);
    }
  },
  spikeVolley(e, s, w) {
    if (s.phase === "windup" && s.t <= 0) {
      s.data.spikes.forEach((q, i) => w.addEffect({ kind: "mortar", spike: true, owner: e.id, x: q.x, y: q.y, radius: .85, arming: .8 + i * .12, damage: damageOf(e, "spikeVolley"), jumpable: true, from: { x: e.x, y: e.y } }));
      e.spikesSpent = true; s.tele = null; toPhase(s, "recover", ATTACK_MODULES.spikeVolley.recover);
    }
  },
  webSpit(e, s, w) { if (s.phase === "windup" && s.t <= 0) { w.addEffect({ kind: "web", owner: e.id, x: s.data.target.x, y: s.data.target.y, radius: 1.25, arming: .3, life: 4.5, damage: 0, slow: .5 }); s.tele = null; toPhase(s, "recover", ATTACK_MODULES.webSpit.recover); } },
  leapSlam(e, s, w) {
    const attack = ATTACK_MODULES.leapSlam;
    if (s.phase === "windup") { if (s.t <= 0) { const land = nearestOpen(w, s.data.target.x, s.data.target.y, 2.5) || { x: e.x, y: e.y }; s.data.from = { x: e.x, y: e.y }; s.data.land = land; toPhase(s, "active", attack.active); e.aloft = true; } return; }
    if (s.phase === "active") {
      const k = 1 - Math.max(0, s.t) / attack.active; e.x = s.data.from.x + (s.data.land.x - s.data.from.x) * k; e.y = s.data.from.y + (s.data.land.y - s.data.from.y) * k; e.hopLift = Math.sin(k * Math.PI) * .9;
      if (s.t <= 0) { e.x = s.data.land.x; e.y = s.data.land.y; e.hopLift = 0; e.aloft = false; if (distance(center(w.player), s.data.land) <= 1.3 + .3) w.hurt(e, damageOf(e, "leapSlam"), { jumpable: true, source: "leapSlam" }); w.addEffect({ kind: "dust", owner: e.id, x: e.x, y: e.y, radius: 1.3, arming: 0, life: .45, damage: 0 }); s.tele = null; toPhase(s, "recover", attack.recover); }
    }
  },
  blinkStrike(e, s, w) {
    const attack = ATTACK_MODULES.blinkStrike;
    if (s.phase === "windup" && s.t <= 0) {
      if (!s.data.dest) { endAttack(e, s); return; }
      w.addEffect({ kind: "blinkTrail", owner: e.id, x: e.x, y: e.y, radius: .7, arming: 0, life: .35, damage: 0 });
      e.x = s.data.dest.x; e.y = s.data.dest.y;
      const p = center(w.player); s.data.aim = unit(p.x - e.x, p.y - e.y);
      s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + 1.35, arc: 120 }; toPhase(s, "strike", .32); return;
    }
    if (s.phase === "strike" && s.t <= 0) { resolveMelee(e, s, w, "blinkStrike", (p) => inArc(e, p, s.data.aim, bodyRadius(e) + 1.35 + .3, 120)); s.tele = null; toPhase(s, "recover", attack.recover); }
  },
  phaseCharge(e, s, w) {
    const attack = ATTACK_MODULES.phaseCharge;
    if (s.phase === "windup") { if (s.t <= 0) { s.data.from = { x: e.x, y: e.y }; toPhase(s, "active", attack.active); e.phasing = true; } return; }
    if (s.phase === "active") {
      const k = 1 - Math.max(0, s.t) / attack.active;
      e.x = Math.max(0, Math.min(w.width - 1, s.data.from.x + (s.data.end.x - s.data.from.x) * k)); e.y = Math.max(0, Math.min(w.height - 1, s.data.from.y + (s.data.end.y - s.data.from.y) * k));
      e.untargetable = !w.open(e.x, e.y);
      if (!s.hitOnce && distance(center(w.player), e) <= bodyRadius(e) + .55) { s.hitOnce = true; w.hurt(e, damageOf(e, "phaseCharge"), { jumpable: false, source: "phaseCharge" }); }
      if (s.t <= 0) { const land = nearestOpen(w, e.x, e.y, 4) || s.data.from; e.x = land.x; e.y = land.y; e.phasing = false; e.untargetable = false; s.tele = null; toPhase(s, "recover", attack.recover); }
    }
  },
  ramCharge(e, s, w) {
    const attack = ATTACK_MODULES.ramCharge;
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", attack.active); return; }
    if (s.phase === "active") {
      const step = 8.5 * w.dt, moved = w.move(e, s.data.aim.x * step, s.data.aim.y * step);
      if (!s.hitOnce && distance(center(w.player), e) <= bodyRadius(e) + .55) { s.hitOnce = true; w.hurt(e, damageOf(e, "ramCharge"), { jumpable: false, source: "ramCharge" }); }
      if (!moved) { s.tele = null; e.stunnedUntil = w.now + 1400; w.addEffect({ kind: "dust", owner: e.id, x: e.x, y: e.y, radius: 1.1, arming: 0, life: .5, damage: 0 }); toPhase(s, "stunned", 1.4); return; }
      if (s.t <= 0) { s.tele = null; w.addEffect({ kind: "shock", owner: e.id, x: e.x, y: e.y, radius: 2.4, arming: 0, life: .55, damage: damageOf(e, "shockwave"), jumpable: true }); toPhase(s, "recover", attack.recover); }
      return;
    }
    if (s.phase === "stunned" && s.t <= 0) toPhase(s, "recover", .3);
  },
  shockwave(e, s, w) { if (s.phase === "windup" && s.t <= 0) { w.addEffect({ kind: "shock", owner: e.id, x: e.x, y: e.y, radius: 3.6, arming: 0, life: .8, damage: damageOf(e, "shockwave"), jumpable: true }); s.tele = null; toPhase(s, "recover", ATTACK_MODULES.shockwave.recover); } },
  mirrorClones(e, s, w) {
    if (s.phase === "windup" && s.t <= 0) {
      const existing = w.enemies.filter((q) => !q.dead && q.illusion && q.summonedBy === e.id).length;
      for (let i = existing; i < 2; i++) { const a = (i ? 1 : -1) * Math.PI / 2 + Math.atan2(s.data.aim.y, s.data.aim.x), spot = nearestOpen(w, e.x + Math.cos(a) * 1.6, e.y + Math.sin(a) * 1.6, 2); if (spot) w.spawnIllusion(e, spot.x, spot.y, i); }
      s.tele = null; toPhase(s, "recover", ATTACK_MODULES.mirrorClones.recover);
    }
  },
  mirrorSwap(e, s, w) {
    if (s.phase === "windup" && s.t <= 0) {
      const clone = w.enemies.find((q) => q.id === s.data.clone && !q.dead);
      if (clone) { const x = e.x, y = e.y; e.x = clone.x; e.y = clone.y; clone.x = x; clone.y = y; w.addEffect({ kind: "blinkTrail", owner: e.id, x, y, radius: .7, arming: 0, life: .35, damage: 0 }); }
      s.tele = null; toPhase(s, "recover", ATTACK_MODULES.mirrorSwap.recover);
    }
  },
  diveBomb(e, s, w) {
    const p = center(w.player);
    if (s.phase === "windup") { if (s.t <= 0) { s.data.shadow = { ...p }; toPhase(s, "track", 1); s.tele = { type: "shadow", x: p.x, y: p.y, locked: false }; } return; }
    if (s.phase === "track") { s.data.shadow.x += (p.x - s.data.shadow.x) * Math.min(1, w.dt * 6); s.data.shadow.y += (p.y - s.data.shadow.y) * Math.min(1, w.dt * 6); s.tele = { type: "shadow", x: s.data.shadow.x, y: s.data.shadow.y, locked: false }; if (s.t <= 0) { toPhase(s, "lock", .45); s.tele.locked = true; } return; }
    if (s.phase === "lock" && s.t <= 0) {
      const land = nearestOpen(w, s.data.shadow.x, s.data.shadow.y, 3) || { x: e.x, y: e.y }; e.x = land.x; e.y = land.y; e.aloft = false; e.untargetable = false;
      if (distance(p, land) <= 1.6 + .3) w.hurt(e, damageOf(e, "diveBomb"), { jumpable: false, source: "diveBomb" });
      w.addEffect({ kind: "crash", owner: e.id, x: land.x, y: land.y, radius: 1.6, arming: 0, life: .6, damage: 0 }); s.tele = null; toPhase(s, "recover", ATTACK_MODULES.diveBomb.recover);
    }
  },
  firefall(e, s, w) {
    if (s.phase === "windup" && s.t <= 0) {
      const p = center(w.player), n = hashSeed(`${e.id}:${s.seq}:fire`);
      w.addEffect({ kind: "ember", owner: e.id, x: p.x, y: p.y, radius: .95, arming: 1.05, damage: damageOf(e, "firefall"), jumpable: true });
      for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + (n % 628) / 100, r = 1.6 + ((n >> (i * 3)) % 9) / 8; w.addEffect({ kind: "ember", owner: e.id, x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, radius: .9, arming: 1.15 + i * .12, damage: damageOf(e, "firefall"), jumpable: true }); }
      s.tele = null; toPhase(s, "recover", ATTACK_MODULES.firefall.recover);
    }
  },
  burrowAmbush(e, s, w) {
    const attack = ATTACK_MODULES.burrowAmbush, p = center(w.player);
    if (s.phase === "windup") { if (s.t <= 0) { e.hidden = true; e.untargetable = true; toPhase(s, "travel", 2.6); s.tele = { type: "mound" }; } return; }
    if (s.phase === "travel") {
      const d = unit(p.x - e.x, p.y - e.y), step = 2.5 * w.dt * (e.speedMultiplier || 1);
      e.x = Math.max(0, Math.min(w.width - 1, e.x + d.x * step)); e.y = Math.max(0, Math.min(w.height - 1, e.y + d.y * step));
      if ((distance(p, e) < .45 || s.t <= 0) && w.open(e.x, e.y)) { toPhase(s, "erupt", .75); s.tele = { type: "circle", x: e.x, y: e.y, radius: 1.3, erupt: true }; }
      else if (s.t <= -1.5) { const land = nearestOpen(w, e.x, e.y, 4); if (land) { e.x = land.x; e.y = land.y; } toPhase(s, "erupt", .75); s.tele = { type: "circle", x: e.x, y: e.y, radius: 1.3, erupt: true }; }
      return;
    }
    if (s.phase === "erupt" && s.t <= 0) {
      e.hidden = false; e.untargetable = false;
      if (distance(p, e) <= 1.3 + .3) w.hurt(e, damageOf(e, "burrowAmbush"), { jumpable: true, source: "burrowAmbush" });
      w.addEffect({ kind: "dust", owner: e.id, x: e.x, y: e.y, radius: 1.4, arming: 0, life: .6, damage: 0 }); s.tele = null; toPhase(s, "recover", attack.recover);
    }
  },
};

// Brains: where to stand between attacks.
function brainVector(e, s, w, def) {
  const p = center(w.player), brain = BRAINS[e.brain || def.brain] || BRAINS.duelist, [near, far] = brain.preferred, d = distance(p, e), to = unit(p.x - e.x, p.y - e.y), side = { x: -to.y * s.orbitDir, y: to.x * s.orbitDir };
  if (brain.id === "orbit") { const radial = (d - (near + far) / 2) * .7; return { x: side.x * .85 + to.x * radial, y: side.y * .85 + to.y * radial, speed: .95 }; }
  if (brain.id === "kite" || brain.id === "artillery") {
    if (!w.los(e, w.player, true)) return { x: to.x, y: to.y, speed: .9 };
    if (d < (brain.retreat || near)) return { x: -to.x + side.x * .4, y: -to.y + side.y * .4, speed: 1.05 };
    if (d > far) return { x: to.x, y: to.y, speed: .85 };
    return { x: side.x, y: side.y, speed: .45 };
  }
  if (brain.id === "flank" || brain.id === "ambush") {
    const v = playerVelocity(w), facing = Math.hypot(v.x, v.y) > .1 ? unit(v.x, v.y) : unit(e.x - p.x, e.y - p.y), behind = { x: p.x - facing.x * 1.7 + side.x * .6, y: p.y - facing.y * 1.7 + side.y * .6 };
    return { ...unit(behind.x - e.x, behind.y - e.y), speed: d > 3 ? 1.05 : .8 };
  }
  if (brain.id === "weeping") return { x: to.x, y: to.y, speed: d > near ? 1.9 : .3 };
  if (brain.id === "juggernaut") { if (d < near) return { x: -to.x * .6 + side.x, y: -to.y * .6 + side.y, speed: .55 }; return { x: to.x, y: to.y, speed: d > far ? .85 : .4 }; }
  if (d <= near) return { x: side.x, y: side.y, speed: .5 };
  return { x: to.x, y: to.y, speed: .9 };
}

function attackReady(e, s, w, id, d) {
  const attack = ATTACK_MODULES[id];
  if (!attack || attack.passive || (s.cd[id] || 0) > 0) return false;
  const [lo, hi] = attack.range || [0, 9];
  if (d < lo || d > hi + bodyRadius(e)) return false;
  if (e.phases && !w.open(e.x, e.y)) return false;
  if (attack.los && !w.los(e, w.player, attack.tags.includes("ranged"))) return false;
  if (id === "mirrorSwap" && !w.enemies.some((q) => !q.dead && q.illusion && q.summonedBy === e.id)) return false;
  if (id === "mirrorClones" && w.enemies.filter((q) => !q.dead && q.illusion && q.summonedBy === e.id).length >= 2) return false;
  return true;
}

function passiveStillness(e, s, w) {
  if (!availableAttacks(e).includes("stillnessCurse")) return;
  const p = center(w.player);
  if (!s.anchor || distance(s.anchor, p) > .35) { s.anchor = { ...p }; s.stillT = 0; return; }
  s.stillT += w.dt; s.cd.stillnessCurse = Math.max(0, (s.cd.stillnessCurse || 0));
  if (s.stillT >= 1.25 && s.cd.stillnessCurse <= 0 && distance(p, e) <= 8 && w.los(e, w.player, true)) {
    w.addEffect({ kind: "condemn", owner: e.id, x: p.x, y: p.y, radius: 1.15, arming: .75, damage: damageOf(e, "stillnessCurse"), jumpable: true });
    s.cd.stillnessCurse = ATTACK_MODULES.stillnessCurse.cooldown * cooldownScale(e); s.stillT = 0;
  }
}

// One simulation step for a pack creature. `w` is the world adapter built by the game (or a test).
export function updatePackMonster(e, w) {
  const def = packDefinition(e);
  if (!def || e.dead) return;
  const s = e.pack && e.pack.v === MONSTER_PACK_VERSION ? e.pack : (e.pack = freshPackState()), dt = w.dt;
  if (!s.orbitDir) s.orbitDir = hashSeed(`${e.id}:orbit`) % 2 ? 1 : -1;
  e.hitFlash = Math.max(0, (e.hitFlash || 0) - dt); e.recoil = Math.max(0, (e.recoil || 0) - dt); e.hitStun = Math.max(0, (e.hitStun || 0) - dt);
  for (const id of Object.keys(s.cd)) s.cd[id] = Math.max(0, s.cd[id] - dt);
  s.gap = Math.max(0, (s.gap || 0) - dt);
  if (e.illusion && (w.now - (e.bornAt || 0)) > 14000) { e.dead = true; return; }
  const p = center(w.player), d = distance(p, e), brain = BRAINS[e.brain || def.brain];
  if (!e.aggro && d < (brain?.hiddenUntilAggro ? 4.2 : 7)) e.aggro = true;
  e.hidden = !!(brain?.hiddenUntilAggro && !e.aggro) || (s.attack === "burrowAmbush" && ["travel", "erupt"].includes(s.phase));
  if (!e.aggro) {
    s.wander = ((s.wander ?? (hashSeed(e.id) % 628) / 100) + dt / 2.4) % TAU;
    if (!brain?.hiddenUntilAggro) w.move(e, Math.cos(s.wander) * .28 * dt, Math.sin(s.wander * .8) * .28 * dt, { phase: false });
    return;
  }
  if (e.hitStun > 0 && s.state === "move") return;
  if (e.hitStun > 0 && s.attack && !e.boss && s.phase === "windup" && !e.untargetable) { endAttack(e, s); return; }
  if (!e.illusion) passiveStillness(e, s, w);
  if (s.attack) {
    s.t -= dt;
    RUN[s.attack]?.(e, s, w);
    if (s.attack && s.phase === "recover" && s.t <= 0) endAttack(e, s);
    return;
  }
  // The Weeping Saint never moves or starts an attack while the Wayfarer faces it.
  if ((e.brain || def.brain) === "weeping") {
    const f = w.playerFacing || { x: 0, y: 1 }, to = unit(e.x - p.x, e.y - p.y);
    e.watched = d < 11 && (f.x * to.x + f.y * to.y) > .3;
    if (e.watched) return;
  }
  // Move according to the brain, then start the best ready attack.
  const move = MOVEMENT_MODES[e.movement] || MOVEMENT_MODES.walk, v = brainVector(e, s, w, def), m = Math.hypot(v.x, v.y) || 1, speed = .82 * v.speed * move.speed * (e.speedMultiplier || 1) * dt;
  const moved = w.move(e, v.x / m * speed, v.y / m * speed, { phase: !!move.phases });
  if (!moved && !move.phases) w.detour?.(e, speed);
  e.facingX = (p.x - e.x) >= 0 ? 1 : -1;
  if (s.gap > 0) return;
  const ready = availableAttacks(e).filter((id) => attackReady(e, s, w, id, d));
  if (!ready.length) return;
  const preferred = ready.filter((id) => id !== s.last), pool = preferred.length ? preferred : ready, id = pool[hashSeed(`${e.id}:pick:${s.seq}`) % pool.length];
  s.last = id; s.state = "attack";
  beginAttack(e, s, id, w);
}

// Ground effects: arming, detonation (once, if the player is inside), webs that slow, and rings.
export function tickPackEffects(effects, w) {
  const p = center(w.player);
  for (const f of effects) {
    f.age = (f.age || 0) + w.dt;
    if (f.arming > 0) { f.arming -= w.dt; if (f.arming > 0) continue; f.armed = true; }
    if (f.kind === "web") { if (distance(p, f) <= f.radius) w.slow(f.slow || .5, .25); }
    else if (f.kind === "flesh") { if (distance(p, f) <= f.radius) { w.slow(f.slow || .55, .25); if (!(f.nextBite > f.age)) { f.nextBite = f.age + .8; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: false, source: "fleshBloom", beam: true }); } } }
    else if (f.kind === "shock") { const total = f.total ??= f.life ?? .8, r = f.radius * (1 - Math.max(0, f.life ?? total) / total); f.ring = r; if (!f.hit && f.damage > 0 && Math.abs(distance(p, f) - r) < .5) { f.hit = true; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: true, source: "shockwave" }); } }
    else if (!f.detonated) { f.detonated = true; f.life ??= .4; if (f.damage > 0 && distance(p, f) <= f.radius + .3) w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: !!f.jumpable, source: f.kind }); }
    f.life = (f.life ?? .4) - w.dt;
  }
  return effects.filter((f) => f.arming > 0 || f.life > 0);
}

export const PACK_EFFECT_CAP = 48;
export function addPackEffect(effects, effect, now = 0) {
  if (effects.length >= PACK_EFFECT_CAP) effects.splice(0, effects.length - PACK_EFFECT_CAP + 1);
  effects.push({ id: `pack-fx-${effect.owner}-${now}-${effects.length}`, life: undefined, ...effect });
  return effects;
}

// ---------------------------------------------------------------- overworld (operator ask 2026-10-13)

// Terrain-biased pack residents for overland sections; every section regenerates with these (no history pin:
// the operator chose to respawn the overworld with the pack).
export const OVERWORLD_PACK_POOLS = {
  ash: ["cinderSeraph", "siegeBeetle", "thunderhorn", "graveLantern", "riftLynx"],
  glass: ["lumenWraith", "riftLynx", "mirrorShade", "strataEel", "veilSpinner"],
  ember: ["veilSpinner", "siegeBeetle", "thunderhorn", "cinderSeraph", "riftLynx"],
};
export const OVERWORLD_PACK_DENSITY = { replaceShare: 45, extraNear: 1, extraFar: 3, farDepth: 4, maxPack: 6 };
const LETHAL = new Set(["canyon", "river", "dungeonWater", "water", "bridge"]);

// Mix pack creatures into a generated overworld section: convert a share of ordinary hostile spawns and add a few
// extra pack residents (more far from the origin). The starting section, settlements' safe circle, ambient wildlife,
// shelter/district residents and story creatures are left alone. Deterministic per seed and section.
export function populateOverworldPack(map, seed, rx, ry, { safe = null } = {}) {
  if (!map || map.monsterPack || (rx === 0 && ry === 0)) return map;
  const depth = Math.abs(rx) + Math.abs(ry), width = Number(map.width) || 32, height = Math.floor((map.tiles?.length || 1024) / width);
  const pool = OVERWORLD_PACK_POOLS[map.dominant] || PACK_KINDS.filter((id) => !MONSTER_PACK[id].unique), key = `${seed}:overworld-pack:v${MONSTER_PACK_VERSION}:${rx}:${ry}`, D = OVERWORLD_PACK_DENSITY;
  const inSafe = (q) => safe && Math.hypot(q.x - safe.x, q.y - safe.y) < safe.radius + 2;
  const spawns = map.enemySpawns || (map.enemySpawns = []);
  let packCount = 0;
  spawns.forEach((e, i) => {
    if (e.ambient || e.passiveBehavior || e.shelterAmbush || e.districtResident || e.boss || e.elite || e.gatePredator || e.foundryId || e.viewportHuntId || e.domainId || MONSTER_PACK[e.kind] || inSafe(e)) return; // hunt and domain foes keep their kind (release 132)
    const n = hashSeed(`${key}:convert:${i}`);
    if (n % 100 < D.replaceShare && packCount < D.maxPack) { e.kind = pool[Math.floor(n / 100) % pool.length]; e.packOverworld = true; packCount++; }
  });
  const occupied = [...spawns, ...(map.objects || [])].filter((q) => Number.isFinite(q?.x) && Number.isFinite(q?.y));
  const open = (map.tiles || []).filter((t) => !t.blocked && !LETHAL.has(t.kind) && !t.environment && t.x > 2 && t.y > 2 && t.x < width - 3 && t.y < height - 3
    && !inSafe(t) && occupied.every((q) => Math.hypot(q.x - t.x, q.y - t.y) >= 3))
    .sort((a, b) => hashSeed(`${key}:spot:${a.x}:${a.y}`) - hashSeed(`${key}:spot:${b.x}:${b.y}`));
  const extra = depth >= D.farDepth ? D.extraFar : D.extraNear, placed = [];
  for (const t of open) {
    if (placed.length >= extra || packCount >= D.maxPack) break;
    if (placed.some((q) => Math.hypot(q.x - t.x, q.y - t.y) < 5)) continue;
    const kind = pool[hashSeed(`${key}:extra:${placed.length}`) % pool.length];
    const spawn = { id: `pack-overworld:${rx}:${ry}:${placed.length}`, kind, x: t.x, y: t.y, packOverworld: true };
    spawns.push(spawn); placed.push(spawn); packCount++;
  }
  map.monsterPack = MONSTER_PACK_VERSION;
  map.diagnostic = { ...(map.diagnostic || {}), overworldPack: { converted: packCount - placed.length, added: placed.length } };
  return map;
}
