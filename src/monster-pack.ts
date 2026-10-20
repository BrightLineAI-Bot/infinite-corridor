// Dungeon Monster Pack v1: ten composable creatures built from shared attribute tables.
//
// A pack monster is a composition of five reusable parts, each defined once below:
//   body (render recipe, scale, palette)  ·  movement mode  ·  brain (AI positioning)
//   attack modules (telegraphed abilities)  ·  boss attack modules (unlocked by health phase)
// `composeMonster` builds new creatures from those parts, and `packVariant` deterministically
// grafts one borrowed attack onto some individuals, so the same ten monsters keep producing
// new combinations. Nothing here touches the save, the DOM, or randomness: every choice is a
// pure function of stable ids, so the simulation stays deterministic.
import { hashSeed } from "./random.ts";

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
  // The Questing Beast's own kit (release 187, Tim 2026-10-18: "attack attack attack", energy as well as claws).
  // Short windups and recoveries; it chases between them. Orbs are dodged (the dodge's i-frames) or outrun; the wave is jumped.
  qbRend: { id: "qbRend", name: "Rend", range: [0, 2.3], cooldown: .9, windup: .22, recover: .2, damage: 1, los: true, tags: ["melee"], text: "A fast, wide rake of claws." },
  qbFlurry: { id: "qbFlurry", name: "Claw Flurry", range: [0, 3], cooldown: 3.2, windup: .15, recover: .15, damage: .8, los: true, tags: ["melee", "combo"], text: "Four lunging claw strikes in quick succession, then a hop back out of reach." },
  qbPounce: { id: "qbPounce", name: "Pounce", range: [2.5, 8], cooldown: 3.6, windup: .2, recover: .2, damage: 1.15, tags: ["leap"], text: "Crouches, springs into the air and dives onto you, slashing as it lands." },
  qbSpiral: { id: "qbSpiral", name: "Spiral Burst", range: [0, 9], cooldown: 6.5, windup: .3, active: 1.5, recover: .25, damage: .55, tags: ["ranged", "orbs"], text: "Spins, flinging two arms of energy orbs in a widening spiral." },
  qbWave: { id: "qbWave", name: "Ground Wave", range: [0, 7], cooldown: 5, windup: .3, recover: .25, damage: 1, jumpable: true, tags: ["ground"], text: "Slams the ground: a wave of energy rolls outward. Jump it." },
  qbBarrage: { id: "qbBarrage", name: "Barrage Charge", range: [2.5, 10], cooldown: 4.8, windup: .3, active: 1, recover: .3, damage: 1.2, los: true, tags: ["charge", "orbs"], text: "Charges at you, spitting arcs of energy orbs behind it." },
  // The Morphing Blob's kit (release 235, Tim 2026-10-19): tendrils, a jet of poison gas that blows you back, gas that
  // rolls out in every direction, bloblets that crawl off and come back to merge, and a surging engulf. Passively it grows,
  // burns what touches it and spatters persistent ooze when struck (see blobPassive).
  blobTendrils: { id: "blobTendrils", name: "Tendril Lash", range: [0, 4.4], cooldown: 2.4, windup: .45, recover: .3, damage: .9, tags: ["melee"], text: "Three tendrils whip out from the mass at once." },
  blobGasJet: { id: "blobGasJet", name: "Poison Jet", range: [0, 5.5], cooldown: 5.2, windup: .55, active: 1.1, recover: .35, damage: .45, tags: ["control", "gas"], text: "A jet of poison gas that blows you back and poisons you. Get out of the cone." },
  blobGasCloud: { id: "blobGasCloud", name: "Gas Bloom", range: [0, 10], cooldown: 8, windup: .6, recover: .35, damage: .3, tags: ["gas", "ground"], text: "Breathes out clouds of poison that roll away in every direction." },
  blobBloblets: { id: "blobBloblets", name: "Bloblets", range: [0, 10], cooldown: 6.5, windup: .6, recover: .3, damage: 0, tags: ["summon"], text: "Throws off bloblets. They wander, then crawl home to merge back in and heal it. Kill them first." },
  blobEngulf: { id: "blobEngulf", name: "Engulfing Surge", range: [1.5, 6.5], cooldown: 4.2, windup: .5, active: .45, recover: .45, damage: 1.3, tags: ["charge"], text: "The whole mass surges forward to swallow you." },
  // The Tremor Worm's kit (release 237, Tim 2026-10-19): it burrows and pops its head out to fight; tentacles lash from its
  // maw; it inhales; it raises tentacles out of the ground around you that spit fire or hold burning lasers until they are
  // cut down; it rises under you; it lobs rocks that burst. Between attacks it sinks and surfaces somewhere else (wormCycle).
  wormMaw: { id: "wormMaw", name: "Maw Tentacles", range: [0, 5.6], cooldown: 2.6, windup: .5, recover: .35, damage: .9, tags: ["melee"], text: "Tentacles lash out of its maw along four lanes." },
  wormSuction: { id: "wormSuction", name: "Suction", range: [2, 8.5], cooldown: 7, windup: .7, active: 1.6, recover: .5, damage: 1.3, tags: ["control"], text: "It inhales: you are dragged toward the maw. Dodge or run against it." },
  wormTentacles: { id: "wormTentacles", name: "Rising Tentacles", range: [0, 12], cooldown: 7.5, windup: .6, recover: .35, damage: .35, tags: ["summon", "ranged"], text: "Tentacles burst out of the ground around you. Some spit fire; some hold a laser on you until they are cut down." },
  wormRise: { id: "wormRise", name: "Rise Beneath", range: [2.5, 12], cooldown: 6.5, windup: .45, recover: .7, damage: 1.45, tags: ["ground", "burrow"], text: "It dives, tunnels under you and bursts up where the ground cracks. Get off the cracks." },
  wormLavaSpew: { id: "wormLavaSpew", name: "Lava Spew", range: [0, 7], cooldown: 5.5, windup: .6, active: 1.1, recover: .45, damage: .5, tags: ["ground", "fire"], text: "Throws its head forward and spews lava that spills across the ground like poured water. It cools in a couple of seconds; until then, stay off it." },
  wormRocks: { id: "wormRocks", name: "Rock Lob", range: [2.5, 10], cooldown: 5, windup: .55, recover: .45, damage: .9, jumpable: true, tags: ["ground", "ranged"], text: "Hurls rocks that burst where they land: one at you, one ahead of you, the rest around." },
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
  // The Questing Beast (release 116; energy attacks in release 187): a unique hunter. Never in spawn pools; see src/questing-beast.ts.
  questingBeast: {
    id: "questingBeast", name: "The Questing Beast", epithet: "The Hunger That Hunts You Back", unique: true,
    stats: [220, 16, 0], form: { scale: 1.5 }, sizeClass: "large", movement: "walk", brain: "duelist", // release 235: a little smaller (was 1.75)
    attacks: ["qbRend", "qbFlurry", "qbPounce", "qbSpiral", "qbWave", "qbBarrage"], bossAttacks: ["leapSlam"],
    palette: ["#4a4650", "#141218", "#ff4a3a", "#f2ece0"], render: "questingBeast", tags: ["beast", "elder", "spikes", "energy"],
    lore: "A horned, winged hunter bristling with spikes, a furnace burning in its chest. It never stops: it rakes, it spins its fire out in spirals, it rolls the ground toward you in waves, and it charges with its fire streaming behind it.",
  },
  // World beasts (release 235; see src/world-beasts.ts). Never in spawn pools.
  morphingBlob: {
    id: "morphingBlob", name: "The Morphing Blob", epithet: "The Hunger That Spreads", unique: true,
    stats: [300, 16, 0], form: { scale: 1.45 }, sizeClass: "large", movement: "walk", brain: "duelist",
    attacks: ["blobTendrils", "blobGasJet", "blobGasCloud", "blobBloblets", "blobEngulf"], bossAttacks: ["leapSlam"],
    palette: ["#5fbf6e", "#143a1d", "#d4ff5a", "#f4ffe8"], render: "morphingBlob", tags: ["ooze", "elder", "gas"],
    lore: "A mound of living ooze that keeps growing while it lives, until it fills the ground it has claimed. Touching it burns; striking it spatters ooze that lingers until it dies; it whips tendrils, breathes poison and throws off bloblets that crawl back to it.",
  },
  bloblet: {
    id: "bloblet", name: "Bloblet", epithet: "A Piece of the Blob", unique: true, minion: true,
    stats: [16, 6, 0], form: { scale: .55 }, sizeClass: "small", movement: "skitter", brain: "duelist",
    attacks: ["bite"], bossAttacks: [],
    palette: ["#6fd17e", "#163f20", "#e2ff7a", "#f4ffe8"], render: "bloblet", tags: ["ooze", "brood"],
    lore: "It wanders off, then hurries home to the Blob. If it gets there, it is part of it again.",
  },
  tremorWorm: {
    id: "tremorWorm", name: "The Tremor Worm", epithet: "The Ground That Opens Its Mouth", unique: true,
    stats: [300, 16, 0], form: { scale: 1.7 }, sizeClass: "large", movement: "burrow", brain: "duelist",
    attacks: ["wormMaw", "wormSuction", "wormTentacles", "wormRise", "wormRocks", "wormLavaSpew"], bossAttacks: ["shockwave"],
    palette: ["#b08a5a", "#2a1c12", "#ff7a2a", "#f3e2c0"], render: "tremorWorm", tags: ["beast", "elder", "earth", "burrow"],
    lore: "A worm as wide as a cart, armoured in sand-coloured rings. It swims under the ground and comes up to feed: tentacles boil out of its round maw, it drinks the air, and the ground around it sprouts lesser tentacles that spit fire and burn lines of light until they are cut down.",
  },
  wormTentacle: {
    id: "wormTentacle", name: "Worm Tentacle", epithet: "A Limb of the Tremor Worm", unique: true, minion: true,
    stats: [34, 6, 6], form: { scale: 1.15 }, sizeClass: "medium", movement: "lurch", brain: "artillery",
    attacks: ["bite"], bossAttacks: [],
    palette: ["#c27a5a", "#3a1a12", "#ff7a2a", "#ffe0b0"], render: "wormTentacle", tags: ["beast", "brood"],
    lore: "It does not move once it is up. It spits fire, or it holds a burning line on you, until you cut it down.",
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

// Energy orbs (release 187): fired by the Questing Beast; they travel straight, stop at walls and hit once.
export const QB_ORB = { speed: 5.2, life: 1.9, radius: .32, spiralEvery: .1, spiralTurn: .42, barrageEvery: .2, barrageArc: 5, barrageSpread: .3 };
export const QB_MOVES = { flurryStrikes: 4, flurryEvery: .2, flurryLunge: .35, backstepTime: .3, backstepSpeed: 9, pounceRise: .25, pounceSpeed: 15, pounceDiveMax: .4,
  evadeCooldown: 1.1, evadeCooldownEnraged: .8, evadeTime: .22, evadeSpeed: 11, threatRange: 3.2, swingRange: 2.6, turnRate: 10 };
// The Morphing Blob (release 235). Balance as data.
export const BLOB = {
  growTime: 120, maxGrow: 2.4, growStep: .08,            // it swells to maxGrow× its size over growTime seconds alive
  contact: .8, contactEvery: .8,                         // touching it: this share of its damage, at most once per contactEvery
  oozePerHit: 2, oozeEvery: .35, oozeMax: 16, oozeRadius: .55, oozeFlight: .55, oozeBite: .3, oozeSlow: .7,
  tendrils: 3, tendrilSpread: .55, tendrilLength: 4.2, tendrilWidth: .45,
  jetLength: 5.5, jetArc: 55, jetPush: 4.2, poison: [5, 3],  // poison: seconds, damage per second
  clouds: 8, cloudSpeed: 1.5, cloudLife: 6, cloudGrow: [.6, 1.6],
  bloblets: 3, blobletsMax: 6, blobletWander: 2.4, blobletHeal: .03, // a merging bloblet restores this share of its max health
  surgeLength: 4.5,
  safeElev: 4,                                           // Tim: ground this high stays above the Blob: no ooze lands there, and its ooze and touch cannot reach you
  mergeGrow: .25, mergeMax: 1.5,                         // each bloblet that makes it home swells it by this much more (up to mergeMax in all)
};
// The Tremor Worm (release 237). Balance as data.
export const WORM = {
  surfaceTime: 3.4, emergeTime: .7, travelTime: 2.6, travelSpeed: 4.4, surfaceRange: [3, 5.5], // it fights surfaced, then sinks and comes up elsewhere
  emergeBite: .8,                                              // coming up under you: this share of its damage
  mawTentacles: 4, mawSpread: .3, mawLength: 5.2, mawWidth: .42,
  suctionRadius: 9, suctionPull: 3.3,
  fieldTentacles: 2, tentaclesMax: 6, lasersMax: 3, tentacleRing: [3, 6.5], tentacleRise: .8,
  fireEvery: .26, fireBurst: 5, fireRest: 1.4, fireSpeed: 6.4, fireLife: 1.8, fireRadius: .3,
  laserCharge: 1.3, laserTurn: .42, laserLength: 10, laserTick: .4, laserWidth: .5, // lasers stay on, turning slowly after you, until their tentacle is cut down
  riseTravel: 2.2, riseSpeed: 5.2, riseMark: .8, riseRadius: 1.6,
  rocks: 4, rockRadius: 1.25, rockFlight: 1.1, rockSpread: 2.2,
  // Lava spew (Tim: "spill out … as if water were getting spilled"): a stream poured along a cone; each gout lands and
  // runs outward, slowing as it spreads, then lies hot for lavaLife seconds and crusts over.
  lavaLength: 6.2, lavaArc: 44, lavaEvery: .09, lavaPerPour: 2, lavaFlight: .12, lavaRun: 1.8, lavaRunTime: .55, lavaGrow: [.35, 1.05], lavaGrowTime: .45, lavaLife: 1.8, lavaTick: .5,
};
const aboveBlob = (w, x, y) => (Number(w.elevation?.(x, y)) || 0) >= BLOB.safeElev;
// Release 237 (Tim: "ooze can still land on high ground, and bloblets"): high ground is drawn raised, a level-4 plateau
// about 1.4 tiles up, so its top covers the low tiles just north of it. Ooze and bloblets keep clear of every tile a
// plateau covers, not only of the plateau's own tiles.
function nearHigh(w, x, y) { if (!w.elevation) return false; for (let dy = -1; dy <= 2; dy++) for (let dx = -1; dx <= 1; dx++) if (aboveBlob(w, x + dx * .6, y + dy * .75)) return true; return false; }
function lowOpen(w, x, y, radius = 2) {
  if (w.open(x, y) && !nearHigh(w, x, y)) return { x, y };
  for (let r = .5; r <= radius; r += .5) for (let i = 0; i < 12; i++) { const a = i * TAU / 12, q = { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r }; if (w.open(q.x, q.y) && !nearHigh(w, q.x, q.y)) return q; }
  return null;
}
function blobOwner(w, f) { return w.enemies.find((q) => q.id === f.owner && !q.dead) || null; }
function addOrb(e, w, angle, damage) { w.addEffect({ kind: "orb", owner: e.id, x: e.x, y: e.y, vx: Math.cos(angle) * QB_ORB.speed, vy: Math.sin(angle) * QB_ORB.speed, radius: QB_ORB.radius, arming: 0, life: QB_ORB.life, damage }); }

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
  s.gap = e.attackGap ?? (attack?.recover || .6) * .6 + .45; // the Questing Beast barely pauses (release 187)
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
  blobTendrils(e, s) { const a = Math.atan2(s.data.aim.y, s.data.aim.x); s.data.dirs = Array.from({ length: BLOB.tendrils }, (_, i) => { const b = a + (i - (BLOB.tendrils - 1) / 2) * BLOB.tendrilSpread; return { x: Math.cos(b), y: Math.sin(b) }; }); s.tele = { type: "tendrils", dirs: s.data.dirs, length: BLOB.tendrilLength + bodyRadius(e) * .6, width: BLOB.tendrilWidth }; },
  wormMaw(e, s) { const a = Math.atan2(s.data.aim.y, s.data.aim.x); s.data.dirs = Array.from({ length: WORM.mawTentacles }, (_, i) => { const b = a + (i - (WORM.mawTentacles - 1) / 2) * WORM.mawSpread; return { x: Math.cos(b), y: Math.sin(b) }; }); s.tele = { type: "tendrils", dirs: s.data.dirs, length: WORM.mawLength, width: WORM.mawWidth, flesh: true }; },
  wormSuction(e, s) { s.tele = { type: "ring", radius: WORM.suctionRadius, inhale: true }; },
  wormTentacles(e, s) { s.tele = { type: "shimmer" }; },
  wormRise(e, s) { s.tele = { type: "submerge" }; },
  wormLavaSpew(e, s) { s.tele = { type: "cone", aim: s.data.aim, length: WORM.lavaLength, arc: WORM.lavaArc, lava: true }; s.data.next = 0; s.data.pours = 0; s.data.front = 0; },
  wormRocks(e, s, w) {
    const p = s.data.target, v = playerVelocity(w), turn = (hashSeed(`${e.id}:${s.seq}:rocks`) % 628) / 100;
    s.data.rocks = [{ x: p.x, y: p.y }, { x: p.x + v.x * 1.2, y: p.y + v.y * 1.2 }, ...Array.from({ length: Math.max(0, WORM.rocks - 2) }, (_, i) => ({ x: p.x + Math.cos(turn + i * TAU / (WORM.rocks - 2)) * WORM.rockSpread, y: p.y + Math.sin(turn + i * TAU / (WORM.rocks - 2)) * WORM.rockSpread }))];
    s.tele = { type: "brace" };
  },
  blobGasJet(e, s) { s.tele = { type: "cone", aim: s.data.aim, length: BLOB.jetLength + bodyRadius(e) * .5, arc: BLOB.jetArc, gas: true }; },
  blobGasCloud(e, s) { s.tele = { type: "brace" }; },
  blobBloblets(e, s) { s.tele = { type: "shimmer" }; },
  blobEngulf(e, s, w) { const len = rayLength(w, e, s.data.aim, BLOB.surgeLength); s.tele = { type: "lane", aim: s.data.aim, length: len, width: bodyRadius(e) * 1.6 }; },
  qbRend(e, s) { s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + 1.6, arc: 150 }; },
  qbFlurry(e, s) { s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + 1.4, arc: 140 }; s.data.strikes = 0; },
  qbPounce(e, s) { s.tele = { type: "circle", x: s.data.target.x, y: s.data.target.y, radius: 1.1 }; },
  qbSpiral(e, s) { s.tele = { type: "brace" }; s.data.angle = (hashSeed(`${e.id}:${s.seq}:spiral`) % 628) / 100; s.data.next = 0; },
  qbWave(e, s) { s.tele = { type: "ring", radius: 7 }; },
  qbBarrage(e, s, w) { const len = rayLength(w, e, s.data.aim, 9); s.tele = { type: "lane", aim: s.data.aim, length: len, width: .8 }; s.data.next = 0; },
};

function resolveMelee(e, s, w, attackId, test) {
  const p = center(w.player);
  if (test(p) && w.los(e, w.player)) w.hurt(e, damageOf(e, attackId), { jumpable: false, source: attackId });
}

const RUN = {
  blobTendrils(e, s, w) {
    if (s.phase === "windup" && s.t <= 0) {
      const L = BLOB.tendrilLength + bodyRadius(e) * .6, W = BLOB.tendrilWidth + .3;
      resolveMelee(e, s, w, "blobTendrils", (p) => s.data.dirs.some((a) => { const dx = p.x - e.x, dy = p.y - e.y, f = dx * a.x + dy * a.y; return f >= 0 && f <= L && Math.abs(dx * a.y - dy * a.x) <= W; }));
      s.data.lashed = w.now; toPhase(s, "recover", ATTACK_MODULES.blobTendrils.recover);
    }
    if (s.phase === "recover" && s.t <= 0) s.tele = null;
  },
  blobGasJet(e, s, w) {
    const attack = ATTACK_MODULES.blobGasJet;
    if (s.phase === "windup") { if (s.t <= 0) { toPhase(s, "active", attack.active); s.data.tick = 0; } return; }
    if (s.phase === "active") {
      const p = center(w.player), L = BLOB.jetLength + bodyRadius(e) * .5;
      s.data.tick -= w.dt;
      if (inArc(e, p, s.data.aim, L, BLOB.jetArc)) {
        w.push?.(e, BLOB.jetPush * w.dt, L + 1);
        if (s.data.tick <= 0) { s.data.tick = .4; w.hurt(e, damageOf(e, "blobGasJet"), { jumpable: false, source: "blobGasJet", beam: true }); w.poison?.(BLOB.poison[0], BLOB.poison[1]); }
      }
      if (s.t <= 0) { s.tele = null; toPhase(s, "recover", attack.recover); }
    }
  },
  blobGasCloud(e, s, w) {
    if (s.phase === "windup" && s.t <= 0) {
      const turn = (hashSeed(`${e.id}:${s.seq}:gas`) % 628) / 100;
      for (let i = 0; i < BLOB.clouds; i++) { const a = turn + i * TAU / BLOB.clouds; w.addEffect({ kind: "gas", owner: e.id, x: e.x + Math.cos(a) * bodyRadius(e), y: e.y + Math.sin(a) * bodyRadius(e), vx: Math.cos(a) * BLOB.cloudSpeed, vy: Math.sin(a) * BLOB.cloudSpeed, radius: BLOB.cloudGrow[0], arming: 0, life: BLOB.cloudLife, damage: damageOf(e, "blobGasCloud") }); }
      s.tele = null; toPhase(s, "recover", ATTACK_MODULES.blobGasCloud.recover);
    }
  },
  blobBloblets(e, s, w) {
    if (s.phase === "windup" && s.t <= 0) {
      const alive = w.enemies.filter((q) => !q.dead && q.blobletOf === e.id).length, turn = (hashSeed(`${e.id}:${s.seq}:bloblets`) % 628) / 100;
      for (let i = 0; i < Math.min(BLOB.bloblets, BLOB.blobletsMax - alive); i++) {
        const a = turn + i * TAU / BLOB.bloblets, spot = lowOpen(w, e.x + Math.cos(a) * (bodyRadius(e) + 1.2), e.y + Math.sin(a) * (bodyRadius(e) + 1.2), 2.5);
        const c = spot && w.spawnMinion?.(e, "bloblet", spot.x, spot.y, i);
        if (c) Object.assign(c, { blobletOf: e.id, bornAt: w.now, wanderAngle: a });
      }
      s.tele = null; toPhase(s, "recover", ATTACK_MODULES.blobBloblets.recover);
    }
  },
  blobEngulf(e, s, w) {
    const attack = ATTACK_MODULES.blobEngulf;
    if (s.phase === "windup") { if (s.t <= 0) { s.data.len = s.tele?.length || 2; s.data.done = 0; toPhase(s, "active", attack.active); } return; }
    if (s.phase === "active") {
      const step = s.data.len / attack.active * w.dt; if (s.data.done < s.data.len && w.move(e, s.data.aim.x * step, s.data.aim.y * step)) s.data.done += step;
      if (!s.hitOnce && distance(center(w.player), e) <= bodyRadius(e) + .5 && !aboveBlob(w, w.player.x, w.player.y)) { s.hitOnce = true; w.hurt(e, damageOf(e, "blobEngulf"), { jumpable: false, source: "blobEngulf" }); }
      if (s.t <= 0) { s.tele = null; toPhase(s, "recover", attack.recover); }
    }
  },
  wormMaw(e, s, w) {
    if (s.phase === "windup" && s.t <= 0) {
      const L = WORM.mawLength, W = WORM.mawWidth + .3;
      resolveMelee(e, s, w, "wormMaw", (p) => s.data.dirs.some((a) => { const dx = p.x - e.x, dy = p.y - e.y, f = dx * a.x + dy * a.y; return f >= 0 && f <= L && Math.abs(dx * a.y - dy * a.x) <= W; }));
      s.data.lashed = w.now; toPhase(s, "recover", ATTACK_MODULES.wormMaw.recover);
    }
  },
  wormSuction(e, s, w) {
    const attack = ATTACK_MODULES.wormSuction;
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", attack.active); return; }
    if (s.phase === "active") {
      w.pull?.(e, WORM.suctionPull * w.dt, WORM.suctionRadius);
      if (!s.hitOnce && distance(center(w.player), e) <= bodyRadius(e) + .8) { s.hitOnce = true; w.hurt(e, damageOf(e, "wormSuction"), { jumpable: false, source: "wormSuction" }); }
      if (s.t <= 0) { s.tele = null; toPhase(s, "recover", attack.recover); }
    }
  },
  wormTentacles(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const mine = w.enemies.filter((q) => !q.dead && q.wormOf === e.id), lasers = mine.filter((q) => q.tentacleMode === "laser").length, p = s.data.target, turn = (hashSeed(`${e.id}:${s.seq}:field`) % 628) / 100;
    for (let i = 0, made = 0, lit = lasers; i < WORM.fieldTentacles && mine.length + made < WORM.tentaclesMax; i++) {
      const [lo, hi] = WORM.tentacleRing, r = lo + (hashSeed(`${e.id}:${s.seq}:ring:${i}`) % 100) / 100 * (hi - lo), a = turn + i * TAU / WORM.fieldTentacles;
      const spot = nearestOpen(w, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 2);
      if (!spot || distance(spot, e) < bodyRadius(e) + 1) continue;
      const mode = (s.seq + i) % 2 && lit < WORM.lasersMax ? "laser" : "fire";
      const c = w.spawnMinion?.(e, "wormTentacle", spot.x, spot.y, i);
      if (c) { Object.assign(c, { wormOf: e.id, bornAt: w.now, tentacleMode: mode }); made++; if (mode === "laser") lit++; }
    }
    s.tele = null; toPhase(s, "recover", ATTACK_MODULES.wormTentacles.recover);
  },
  wormRise(e, s, w) {
    const attack = ATTACK_MODULES.wormRise, p = center(w.player);
    if (s.phase === "windup") { if (s.t <= 0) { toPhase(s, "travel", WORM.riseTravel); s.tele = { type: "mound" }; } return; }
    if (s.phase === "travel" || s.phase === "erupt") { e.hidden = s.phase === "travel"; e.untargetable = true; }
    if (s.phase === "travel") {
      const d = unit(p.x - e.x, p.y - e.y), step = Math.min(distance(p, e), WORM.riseSpeed * w.dt * (e.speedMultiplier || 1));
      e.x = Math.max(0, Math.min(w.width - 1, e.x + d.x * step)); e.y = Math.max(0, Math.min(w.height - 1, e.y + d.y * step));
      if (s.t <= 0 || distance(p, e) < .3) { const land = w.open(e.x, e.y) ? { x: e.x, y: e.y } : nearestOpen(w, e.x, e.y, 4); if (land) { e.x = land.x; e.y = land.y; } toPhase(s, "erupt", WORM.riseMark); s.tele = { type: "circle", x: e.x, y: e.y, radius: WORM.riseRadius, erupt: true, total: WORM.riseMark }; }
      return;
    }
    if (s.phase === "erupt" && s.t <= 0) {
      e.hidden = false; e.untargetable = false;
      if (distance(p, e) <= WORM.riseRadius + .3) w.hurt(e, damageOf(e, "wormRise"), { jumpable: false, source: "wormRise" });
      w.addEffect({ kind: "dust", owner: e.id, x: e.x, y: e.y, radius: WORM.riseRadius + .4, arming: 0, life: .7, damage: 0 });
      if (s.worm) { s.worm.mode = "surfaced"; s.worm.t = WORM.surfaceTime; }
      s.tele = null; toPhase(s, "recover", attack.recover);
    }
  },
  wormLavaSpew(e, s, w) {
    const attack = ATTACK_MODULES.wormLavaSpew;
    if (s.phase === "windup") { if (s.t <= 0) { toPhase(s, "active", attack.active); s.tele = null; } return; }
    if (s.phase !== "active") return;
    const k = 1 - Math.max(0, s.t) / attack.active, a0 = Math.atan2(s.data.aim.y, s.data.aim.x), half = WORM.lavaArc * Math.PI / 360;
    s.data.front = (.25 + .75 * k) * WORM.lavaLength;
    s.data.next -= w.dt;
    if (s.data.next <= 0) {
      s.data.next = WORM.lavaEvery;
      for (let i = 0; i < WORM.lavaPerPour; i++) {
        const n = s.data.pours++, h = (hashSeed(`${e.id}:${s.seq}:lava:${n}`) % 1000) / 1000, h2 = (hashSeed(`${e.id}:${s.seq}:lava-r:${n}`) % 1000) / 1000;
        const a = a0 + (h * 2 - 1) * half * (.35 + .65 * k), r = Math.max(1, s.data.front * (.55 + .45 * h2)), dir = { x: Math.cos(a), y: Math.sin(a) };
        const len = Math.min(r, rayLength(w, e, dir, r)), x = e.x + dir.x * len, y = e.y + dir.y * len;
        w.addEffect({ kind: "lava", owner: e.id, x, y, vx: dir.x * WORM.lavaRun, vy: dir.y * WORM.lavaRun, from: { x: e.x, y: e.y }, radius: WORM.lavaGrow[0], grow: WORM.lavaGrow[0] + (WORM.lavaGrow[1] - WORM.lavaGrow[0]) * h, arming: WORM.lavaFlight, life: WORM.lavaLife, total: WORM.lavaLife, damage: damageOf(e, "wormLavaSpew") });
      }
    }
    if (s.t <= 0) toPhase(s, "recover", attack.recover);
  },
  wormRocks(e, s, w) {
    if (s.phase === "windup" && s.t <= 0) {
      s.data.rocks.forEach((q, i) => w.addEffect({ kind: "mortar", rock: true, owner: e.id, x: q.x, y: q.y, radius: WORM.rockRadius, arming: WORM.rockFlight + i * .15, damage: damageOf(e, "wormRocks"), jumpable: true, from: { x: e.x, y: e.y } }));
      s.tele = null; toPhase(s, "recover", ATTACK_MODULES.wormRocks.recover);
    }
  },
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
  qbRend(e, s, w) { if (s.phase === "windup" && s.t <= 0) { resolveMelee(e, s, w, "qbRend", (p) => inArc(e, p, s.data.aim, bodyRadius(e) + 1.6 + .3, 150)); s.tele = null; toPhase(s, "recover", ATTACK_MODULES.qbRend.recover); } },
  qbFlurry(e, s, w) {
    const p = center(w.player);
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "strike", 0); return; }
    if (s.phase === "strike" && s.t <= 0) {
      if (s.data.strikes >= QB_MOVES.flurryStrikes) { s.tele = null; s.data.away = unit(e.x - p.x, e.y - p.y); toPhase(s, "backstep", QB_MOVES.backstepTime); return; }
      s.data.aim = unit(p.x - e.x, p.y - e.y); w.move(e, s.data.aim.x * QB_MOVES.flurryLunge, s.data.aim.y * QB_MOVES.flurryLunge);
      s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + 1.4, arc: 140 };
      resolveMelee(e, s, w, "qbFlurry", (q) => inArc(e, q, s.data.aim, bodyRadius(e) + 1.4 + .3, 140));
      s.data.strikes++; toPhase(s, "strike", QB_MOVES.flurryEvery); return;
    }
    if (s.phase === "backstep") { const step = QB_MOVES.backstepSpeed * w.dt; w.move(e, s.data.away.x * step, s.data.away.y * step); e.hopLift = Math.sin(Math.max(0, s.t) / QB_MOVES.backstepTime * Math.PI) * .8; if (s.t <= 0) { e.hopLift = 0; toPhase(s, "recover", ATTACK_MODULES.qbFlurry.recover); } }
  },
  qbPounce(e, s, w) {
    const p = center(w.player);
    if (s.phase === "windup") { if (s.t <= 0) { e.aloft = true; e.untargetable = true; s.tele = null; toPhase(s, "rise", QB_MOVES.pounceRise); } return; }
    if (s.phase === "rise") { e.hopLift = (1 - Math.max(0, s.t) / QB_MOVES.pounceRise) * 4; s.data.target = { ...p }; s.tele = { type: "circle", x: p.x, y: p.y, radius: 1.1 }; if (s.t <= 0) toPhase(s, "dive", QB_MOVES.pounceDiveMax); return; }
    if (s.phase === "dive") {
      const to = s.data.target, dx = to.x - e.x, dy = to.y - e.y, d = Math.hypot(dx, dy), step = Math.min(d, QB_MOVES.pounceSpeed * w.dt);
      if (d > .01) w.move(e, dx / d * step, dy / d * step, { phase: true });
      e.hopLift = Math.max(0, e.hopLift - 4 * w.dt / QB_MOVES.pounceDiveMax);
      if (!s.hitOnce && distance(p, e) <= bodyRadius(e) + .6) { s.hitOnce = true; w.hurt(e, damageOf(e, "qbPounce"), { jumpable: false, source: "qbPounce" }); }
      if (d - step <= .05 || s.t <= 0) {
        e.aloft = false; e.untargetable = false; e.hopLift = 0; s.tele = null;
        if (!w.open(e.x, e.y)) { const q = nearestOpen(w, e.x, e.y); if (q) { e.x = q.x; e.y = q.y; } }
        if (!s.hitOnce) resolveMelee(e, s, w, "qbPounce", (q) => distance(q, e) <= bodyRadius(e) + 1.5);
        w.addEffect({ kind: "dust", owner: e.id, x: e.x, y: e.y, radius: 1.2, arming: 0, life: .4, damage: 0 });
        toPhase(s, "recover", ATTACK_MODULES.qbPounce.recover);
      }
    }
  },
  qbSpiral(e, s, w) {
    const attack = ATTACK_MODULES.qbSpiral;
    if (s.phase === "windup") { if (s.t <= 0) { s.tele = null; toPhase(s, "active", attack.active); } return; }
    if (s.phase === "active") {
      s.data.next -= w.dt;
      if (s.data.next <= 0) { s.data.next = QB_ORB.spiralEvery; s.data.angle += QB_ORB.spiralTurn; for (const arm of [0, Math.PI]) addOrb(e, w, s.data.angle + arm, damageOf(e, "qbSpiral")); }
      if (s.t <= 0) toPhase(s, "recover", attack.recover);
    }
  },
  qbWave(e, s, w) { if (s.phase === "windup" && s.t <= 0) { w.addEffect({ kind: "shock", owner: e.id, x: e.x, y: e.y, radius: 7, arming: 0, life: 1.3, damage: damageOf(e, "qbWave"), jumpable: true, energy: true }); s.tele = null; toPhase(s, "recover", ATTACK_MODULES.qbWave.recover); } },
  qbBarrage(e, s, w) {
    const attack = ATTACK_MODULES.qbBarrage;
    if (s.phase === "windup") { if (s.t <= 0) { s.tele = null; toPhase(s, "active", attack.active); } return; }
    if (s.phase === "active") {
      const step = 9.5 * w.dt, moved = w.move(e, s.data.aim.x * step, s.data.aim.y * step);
      if (!s.hitOnce && distance(center(w.player), e) <= bodyRadius(e) + .6) { s.hitOnce = true; w.hurt(e, damageOf(e, "qbBarrage"), { jumpable: false, source: "qbBarrage" }); }
      s.data.next -= w.dt;
      if (s.data.next <= 0) { s.data.next = QB_ORB.barrageEvery; const back = Math.atan2(-s.data.aim.y, -s.data.aim.x); for (let i = 0; i < QB_ORB.barrageArc; i++) addOrb(e, w, back + (i - (QB_ORB.barrageArc - 1) / 2) * QB_ORB.barrageSpread, damageOf(e, "qbSpiral")); }
      if (!moved || s.t <= 0) toPhase(s, "recover", attack.recover);
    }
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

// Release 187 (Tim): the Questing Beast moves like a panther (its heading and pace ease toward the brain's wish
// instead of snapping) and dodges: a shot of the Wayfarer's closing on it, or a swing in reach, makes it spring aside,
// untargetable for the spring, at most once per QB_MOVES.evadeCooldown. It can spring out of an attack's recovery, never
// out of the attack itself, so committing to an attack is when it can be hit.
function fluid(s, v, dt) {
  const k = 1 - Math.exp(-QB_MOVES.turnRate * dt), prev = s.vel || { x: v.x, y: v.y, speed: v.speed };
  s.vel = { x: prev.x + (v.x - prev.x) * k, y: prev.y + (v.y - prev.y) * k, speed: prev.speed + (v.speed - prev.speed) * k };
  return s.vel;
}
function evade(e, s, w, p, d) {
  if (s.evade) {
    const step = QB_MOVES.evadeSpeed * w.dt; if (!w.move(e, s.evade.x * step, s.evade.y * step)) s.evade.t = 0;
    s.evade.t -= w.dt; e.hopLift = Math.sin(Math.max(0, s.evade.t) / QB_MOVES.evadeTime * Math.PI) * .5;
    if (s.evade.t <= 0) { s.evade = null; e.untargetable = false; e.hopLift = 0; }
    return true;
  }
  if ((s.attack && s.phase !== "recover") || (s.cd.qbEvade || 0) > 0) return false; // it may spring out of an attack's recovery
  let dir = null;
  for (const q of w.playerShots || []) {
    const dx = e.x - q.x + .5, dy = e.y - q.y + .45, dist = Math.hypot(dx, dy), m = Math.hypot(q.dx || 0, q.dy || 0) || 1, ux = (q.dx || 0) / m, uy = (q.dy || 0) / m, along = dx * ux + dy * uy;
    if (dist > QB_MOVES.threatRange || along <= 0 || Math.abs(dx * uy - dy * ux) > bodyRadius(e) + .7) continue;
    const side = (dx * uy - dy * ux) >= 0 ? 1 : -1; dir = { x: -uy * side, y: ux * side }; break;
  }
  if (!dir && w.playerSwinging && d <= QB_MOVES.swingRange) { const away = unit(e.x - p.x, e.y - p.y), side = s.orbitDir || 1; dir = unit(away.x + -away.y * side * .8, away.y + away.x * side * .8); }
  if (!dir) return false;
  const enraged = e.hp <= e.maxHp * PACK_BOSS_TEMPLATE.enrage;
  s.cd.qbEvade = enraged ? QB_MOVES.evadeCooldownEnraged : QB_MOVES.evadeCooldown;
  if (s.attack) endAttack(e, s);
  s.evade = { ...dir, t: QB_MOVES.evadeTime }; e.untargetable = true; s.vel = null;
  return true;
}

// The Morphing Blob's passives (release 235): it grows while it lives (in steps, so its sprite is not redrawn every
// frame), burns what touches it, and every time it is struck it spatters ooze that lies on the ground until it dies.
function blobPassive(e, s, w, p, d) {
  e.blobBase ||= { scale: Number(e.scale) || 1, radius: bodyRadius(e) };
  e.blobAge = (Number(e.blobAge) || 0) + w.dt;
  const grow = 1 + Math.min(1, e.blobAge / BLOB.growTime) * (BLOB.maxGrow - 1) + Math.min(BLOB.mergeMax, Number(e.blobMerged) || 0), stepped = Math.round(grow / BLOB.growStep) * BLOB.growStep;
  e.scale = Math.round(e.blobBase.scale * stepped * 100) / 100; e.bodyRadius = e.blobBase.radius * stepped;
  s.contactCd = Math.max(0, (s.contactCd || 0) - w.dt); s.oozeCd = Math.max(0, (s.oozeCd || 0) - w.dt);
  if (s.contactCd <= 0 && d <= bodyRadius(e) + .2 && !aboveBlob(w, p.x, p.y)) { s.contactCd = BLOB.contactEvery; w.hurt(e, Math.max(1, Math.ceil((Number(e.damage) || 1) * BLOB.contact)), { jumpable: false, source: "blobTouch" }); }
  const hp = Number(e.hp) || 0;
  if (s.lastHp !== undefined && hp < s.lastHp && s.oozeCd <= 0) {
    s.oozeCd = BLOB.oozeEvery; s.oozes = (s.oozes || 0) + 1;
    const lying = (w.effects?.() || []).filter((f) => f.kind === "ooze" && f.owner === e.id).length;
    for (let i = 0; i < BLOB.oozePerHit && lying + i < BLOB.oozeMax; i++) {
      const a = (hashSeed(`${e.id}:ooze:${s.oozes}:${i}`) % 628) / 100, r = bodyRadius(e) + 1 + (hashSeed(`${e.id}:ooze-r:${s.oozes}:${i}`) % 100) / 45, spot = lowOpen(w, e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, 2);
      if (spot) w.addEffect({ kind: "ooze", owner: e.id, x: spot.x, y: spot.y, from: { x: e.x, y: e.y }, radius: BLOB.oozeRadius, arming: BLOB.oozeFlight, life: 1e6, damage: Math.max(1, Math.ceil((Number(e.damage) || 1) * BLOB.oozeBite)), slow: BLOB.oozeSlow });
    }
  }
  s.lastHp = hp;
}
// A bloblet wanders off for a while, then crawls home; reaching the Blob, it merges back in and heals it.
// Returns true while it is heading home (its own attacks wait).
function blobletHome(e, s, w) {
  const owner = w.enemies.find((q) => q.id === e.blobletOf && !q.dead);
  if (!owner) { e.blobletOf = null; return false; }
  const age = (w.now - (e.bornAt || 0)) / 1000;
  if (age < BLOB.blobletWander) { const a = e.wanderAngle || 0, sp = .9 * (MOVEMENT_MODES.skitter.speed) * w.dt, nx = Math.cos(a) * sp, ny = Math.sin(a) * sp; if (nearHigh(w, e.x + nx * 8, e.y + ny * 8)) e.wanderAngle = a + Math.PI; else w.move(e, nx, ny); return true; } // it turns back at the foot of high ground
  const dx = owner.x - e.x, dy = owner.y - e.y, dd = Math.hypot(dx, dy) || 1;
  if (dd <= bodyRadius(owner) + .3) { e.dead = true; e.noRewards = true; e.merged = true; owner.hp = Math.min(owner.maxHp, (Number(owner.hp) || 0) + Math.round(owner.maxHp * BLOB.blobletHeal)); owner.blobMerged = Math.min(BLOB.mergeMax, (Number(owner.blobMerged) || 0) + BLOB.mergeGrow); /* and it swells */ const os = owner.pack; if (os) os.lastHp = owner.hp; return true; }
  const sp = 1.1 * MOVEMENT_MODES.skitter.speed * w.dt; if (aboveBlob(w, e.x + dx / dd * sp * 6, e.y + dy / dd * sp * 6) || !w.move(e, dx / dd * sp, dy / dd * sp)) w.detour?.(e, sp);
  return true;
}

// The Tremor Worm between attacks (release 237): it stays up for WORM.surfaceTime, then sinks and swims under the ground
// (hidden, untargetable) to a spot near the Wayfarer, and comes up there (a short, cracking emergence that bites whoever
// stands on it). Returns true while it is under or emerging (no attack or dodge then).
function wormCycle(e, s, w, p) {
  const W = s.worm ||= { mode: "surfaced", t: WORM.surfaceTime, trips: 0 };
  if (s.attack) return false;
  if (W.mode === "surfaced") {
    W.t -= w.dt;
    if (W.t > 0 || s.evade) return false;
    const a = (hashSeed(`${e.id}:worm-trip:${W.trips}`) % 628) / 100, [lo, hi] = WORM.surfaceRange, r = lo + (hashSeed(`${e.id}:worm-r:${W.trips}`) % 100) / 100 * (hi - lo);
    W.trips++; W.dest = { x: Math.max(1, Math.min(w.width - 2, p.x + Math.cos(a) * r)), y: Math.max(1, Math.min(w.height - 2, p.y + Math.sin(a) * r)) }; W.mode = "under"; W.t = WORM.travelTime;
  }
  if (W.mode === "under") {
    e.hidden = true; e.untargetable = true; W.t -= w.dt;
    const d = distance(W.dest, e), u = unit(W.dest.x - e.x, W.dest.y - e.y), step = Math.min(d, WORM.travelSpeed * w.dt * (e.speedMultiplier || 1));
    e.x = Math.max(0, Math.min(w.width - 1, e.x + u.x * step)); e.y = Math.max(0, Math.min(w.height - 1, e.y + u.y * step));
    if (d < .3 || W.t <= 0) { const land = w.open(e.x, e.y) ? { x: e.x, y: e.y } : nearestOpen(w, e.x, e.y, 4); if (land) { e.x = land.x; e.y = land.y; W.mode = "emerge"; W.t = WORM.emergeTime; } else { W.dest = { x: p.x, y: p.y }; W.t = WORM.travelTime; } } // no open ground there (a lake, a cliff): it swims back toward the Wayfarer, who stands on open ground
    return true;
  }
  // emerging
  e.hidden = false; e.untargetable = true; W.t -= w.dt;
  if (W.t <= 0) {
    e.untargetable = false; W.mode = "surfaced"; W.t = WORM.surfaceTime; s.gap = Math.min(s.gap || 0, .15);
    if (distance(p, e) <= bodyRadius(e) + .6) w.hurt(e, Math.max(1, Math.ceil((Number(e.damage) || 1) * WORM.emergeBite)), { jumpable: false, source: "wormEmerge" });
    w.addEffect({ kind: "dust", owner: e.id, x: e.x, y: e.y, radius: bodyRadius(e) + 1, arming: 0, life: .6, damage: 0 });
  }
  return true;
}
// A tentacle the worm raised: it never moves. It rises, then spits bursts of fire at the Wayfarer or (laser) holds a
// burning line that turns slowly after them, until it is cut down. It sinks when the worm dies.
function tentacleTurret(e, s, w, p) {
  const owner = w.enemies.find((q) => q.id === e.wormOf && !q.dead);
  if (!owner) { e.dead = true; e.noRewards = true; return true; }
  const age = (w.now - (e.bornAt || 0)) / 1000;
  if (age < WORM.tentacleRise) { e.untargetable = true; e.rising = 1 - age / WORM.tentacleRise; s.tele = { type: "circle", x: e.x, y: e.y, radius: .8, erupt: true, total: WORM.tentacleRise, left: WORM.tentacleRise - age }; return true; }
  if (e.rising) { e.rising = 0; e.untargetable = false; s.tele = null; if (distance(p, e) <= 1.1) w.hurt(owner, Math.max(1, Math.ceil((Number(owner.damage) || 1) * .4)), { jumpable: false, source: "wormTentacle" }); }
  e.facingX = (p.x - e.x) >= 0 ? 1 : -1;
  const dmg = Math.max(1, Math.ceil((Number(owner.damage) || 1) * ATTACK_MODULES.wormTentacles.damage));
  if (e.tentacleMode === "laser") {
    const want = Math.atan2(p.y - e.y, p.x - e.x), L = s.laser ||= { angle: want, charge: WORM.laserCharge, tick: 0 };
    let diff = ((want - L.angle) % TAU + TAU * 1.5) % TAU - Math.PI;
    L.angle += Math.max(-WORM.laserTurn * w.dt, Math.min(WORM.laserTurn * w.dt, diff));
    const dir = { x: Math.cos(L.angle), y: Math.sin(L.angle) }, len = rayLength(w, e, dir, WORM.laserLength);
    if (L.charge > 0) { L.charge -= w.dt; s.tele = { type: "beam", angle: L.angle, length: len, charging: true, laser: true }; return true; }
    s.tele = { type: "beam", angle: L.angle, length: len, charging: false, laser: true };
    L.tick -= w.dt;
    if (L.tick <= 0 && segmentDistance(p, e, { x: e.x + dir.x * len, y: e.y + dir.y * len }) <= WORM.laserWidth) { L.tick = WORM.laserTick; w.hurt(owner, dmg, { jumpable: false, source: "wormLaser", beam: true }); }
    return true;
  }
  const F = s.fire ||= { next: .4, shots: 0 };
  F.next -= w.dt;
  if (F.next <= 0) {
    if (w.los(e, w.player, true)) { const a = Math.atan2(p.y - e.y, p.x - e.x); w.addEffect({ kind: "orb", fire: true, owner: owner.id, x: e.x, y: e.y, vx: Math.cos(a) * WORM.fireSpeed, vy: Math.sin(a) * WORM.fireSpeed, radius: WORM.fireRadius, arming: 0, life: WORM.fireLife, damage: dmg }); }
    F.shots++; F.next = F.shots % WORM.fireBurst ? WORM.fireEvery : WORM.fireRest;
  }
  return true;
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
  if (e.kind === "morphingBlob") blobPassive(e, s, w, p, d);
  if (e.blobletOf && blobletHome(e, s, w)) return;
  if (e.wormOf && tentacleTurret(e, s, w, p)) return;
  if (e.kind === "tremorWorm" && wormCycle(e, s, w, p)) return;
  if (e.evasive && evade(e, s, w, p, d)) return;
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
  const move = MOVEMENT_MODES[e.movement] || MOVEMENT_MODES.walk, raw = brainVector(e, s, w, def), v = e.evasive ? fluid(s, raw, dt) : raw, m = Math.hypot(v.x, v.y) || 1, speed = .82 * v.speed * move.speed * (e.speedMultiplier || 1) * dt;
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
    else if (f.kind === "ooze") { // release 235: lies where it fell until the Blob is dead
      const owner = blobOwner(w, f); if (!owner && f.life > 1) f.life = 1;
      if (distance(p, f) <= f.radius && !aboveBlob(w, p.x, p.y)) { w.slow(f.slow || .7, .25); if (!(f.nextBite > f.age)) { f.nextBite = f.age + .9; w.hurt(owner, f.damage, { jumpable: false, source: "ooze", beam: true }); } }
    } else if (f.kind === "gas") { // release 235: drifts outward and swells; poisons whoever stands in it
      f.x += (f.vx || 0) * w.dt; f.y += (f.vy || 0) * w.dt; const k = Math.min(1, f.age / BLOB.cloudLife); f.radius = BLOB.cloudGrow[0] + (BLOB.cloudGrow[1] - BLOB.cloudGrow[0]) * k;
      if (w.tileOpen && !w.tileOpen(f.x + .5, f.y + .5)) { f.vx = 0; f.vy = 0; }
      if (distance(p, f) <= f.radius && !(f.nextBite > f.age)) { f.nextBite = f.age + .6; w.hurt(blobOwner(w, f), f.damage, { jumpable: false, source: "blobGas", beam: true }); w.poison?.(BLOB.poison[0], BLOB.poison[1]); }
    }
    else if (f.kind === "lava") { // release 237: spilled lava runs outward, slowing, swells as it spreads, then lies hot until it crusts over
      if (f.age < WORM.lavaRunTime) { const slow = 1 - f.age / WORM.lavaRunTime, nx = f.x + (f.vx || 0) * slow * w.dt, ny = f.y + (f.vy || 0) * slow * w.dt; if (!w.tileOpen || w.tileOpen(nx + .5, ny + .5)) { f.x = nx; f.y = ny; } }
      f.radius = WORM.lavaGrow[0] + (f.grow - WORM.lavaGrow[0]) * Math.min(1, f.age / WORM.lavaGrowTime);
      if (distance(p, f) <= f.radius + .15 && !(f.nextBite > f.age)) { f.nextBite = f.age + WORM.lavaTick; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: false, source: "wormLava", beam: true }); }
    }
    else if (f.kind === "flesh") { if (distance(p, f) <= f.radius) { w.slow(f.slow || .55, .25); if (!(f.nextBite > f.age)) { f.nextBite = f.age + .8; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: false, source: "fleshBloom", beam: true }); } } }
    else if (f.kind === "orb") { f.x += f.vx * w.dt; f.y += f.vy * w.dt; if (w.tileOpen && !w.tileOpen(f.x + .5, f.y + .5)) f.life = 0; else if (!f.hit && distance(p, f) <= f.radius + .3) { f.hit = true; f.life = 0; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: false, source: "orb" }); } }
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
