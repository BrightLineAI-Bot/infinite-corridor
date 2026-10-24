// Dungeon Monster Pack v1: ten composable creatures built from shared attribute tables.
//
// A pack monster is a composition of five reusable parts, each defined once below:
//   body (render recipe, scale, palette)  ·  movement mode  ·  brain (AI positioning)
//   attack modules (telegraphed abilities)  ·  boss attack modules (unlocked by health phase)
// `composeMonster` builds new creatures from those parts, and `packVariant` deterministically
// grafts one borrowed attack onto some individuals, so the same ten monsters keep producing
// new combinations. Nothing here touches the save, the DOM, or randomness: every choice is a
// pure function of stable ids, so the simulation stays deterministic.
import { stageOneBeastReference } from "./stages.ts";
import { hashSeed } from "./random.ts";
import { updateAstralActor } from "./astral-worm.ts";

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
  // The Mountain Turtle's kit (release 241, Tim 2026-10-19: "a walking mausoleum … about twice the size of the Questing
  // Beast … slow … stomps … a burst dash that leaves a trail of fire or ice … spins with an ice tornado that throws off
  // small tornadoes … a comet of ice from its mouth … now and then an ice shield it cannot be hurt through").
  turtleStomp: { id: "turtleStomp", name: "Stomp", range: [0, 4.6], cooldown: 3.2, windup: .75, recover: .55, damage: 1.2, jumpable: true, tags: ["ground", "melee"], text: "Rears and stamps: the ground under it heaves and a ring rolls out. Jump the ring." },
  turtleDash: { id: "turtleDash", name: "Burst Dash", range: [3, 11], cooldown: 6, windup: .85, active: .9, recover: .7, damage: 1.4, tags: ["charge"], text: "Bursts forward in a straight rush, leaving fire or ice behind it. Ice it leaves bursts a couple of seconds later." },
  turtleSpin: { id: "turtleSpin", name: "Ice Tornado", range: [0, 9], cooldown: 9, windup: .6, active: 2.4, recover: .6, damage: .5, tags: ["control", "ice"], text: "Spins in its shell inside a tornado of ice, flinging off small twisters that wander, sting and slow you until they blow out." },
  turtleCyclone: { id: "turtleCyclone", name: "Icicle Cyclone", range: [0, 10], cooldown: 9.5, windup: .6, active: 3.2, recover: .7, damage: .9, tags: ["charge", "ice"], text: "Spins in its shell inside the tornado and careens around, rebounding off walls and flinging icicles in every direction. Keep your distance and dodge the shards." },
  turtleComet: { id: "turtleComet", name: "Ice Comet", range: [3, 11], cooldown: 5.5, windup: .95, recover: .6, damage: 1.5, tags: ["ranged", "ice"], text: "A ball of ice the size of a cart leaves its mouth and bursts where it lands, leaving the ground frozen." },
  turtleShield: { id: "turtleShield", name: "Ice Shield", range: [0, 14], cooldown: 13, windup: .5, active: 3.6, recover: .3, damage: 0, tags: ["defense", "ice"], text: "Ice grows over its shell. While the shield stands nothing hurts it; wait it out." },
  // The Lightning Giant's kit (release 257, Tim 2026-10-21: a giant robot with a club; Tesla-coil arcs that link it to
  // you; a shock that knocks you down; forward and back club swings; a slam that may call a delayed sky strike and/or
  // throw three bolts in a tight cone at you; and an electrified state: haze, more speed, bolts dropping around it).
  giantArcs: { id: "giantArcs", name: "Tesla Arcs", range: [0, 7.5], cooldown: 6, windup: .6, active: 1.6, recover: .4, damage: .35, tags: ["ranged", "lightning", "beam"], text: "Its coils crackle and a sheaf of lightning arcs to you, linking you to it. Get out of reach to break the link." },
  giantShock: { id: "giantShock", name: "Grounding Shock", range: [0, 8], cooldown: 9, windup: .75, recover: .5, damage: .8, tags: ["ranged", "lightning"], text: "It points, and the ground under you crackles: step off the mark, or the shock knocks you flat for a moment." },
  giantSwing: { id: "giantSwing", name: "Club Swings", range: [0, 3.2], cooldown: 3.2, windup: .45, active: .7, recover: .45, damage: 1.1, tags: ["melee", "combo"], text: "A forward swing of its great club, then the back-swing." },
  giantSlam: { id: "giantSlam", name: "Club Slam", range: [0, 4.5], cooldown: 5, windup: .7, recover: .7, damage: 1.4, tags: ["melee", "ground", "lightning"], text: "It slams the club down. Sometimes lightning answers from the sky where you stood; sometimes three bolts leap from the club straight at you." },
  giantMenace: { id: "giantMenace", name: "Menacing Slam", range: [0, 9], cooldown: 8, windup: .5, active: 30, recover: .5, damage: 1.5, tags: ["melee", "ground"], text: "It raises its club and stalks you with it held high. Come within reach and it slams it down (or fires a short bolt from its chest), and may do it again; keep away and it fires two quick chest beams after you before it lowers the club." },
  giantUpswing: { id: "giantUpswing", name: "Charging Upswing", range: [0, 8], cooldown: 7, windup: .35, active: 30, recover: .5, damage: 1.2, tags: ["melee", "charge"], text: "It runs at you and swings the club up. Sometimes it leaps from the swing: from the air it hurls a barrage of bolts or dashes at you in a crackle of arcs, then lands, or comes down in a slam onto where you stand." },
  giantElectrify: { id: "giantElectrify", name: "Electrify", range: [0, 14], cooldown: 18, windup: 1.6, recover: .3, damage: .7, tags: ["buff", "lightning"], text: "It raises the club to the sky and lightning strikes it. Wrapped in a crackling haze it moves faster, and bolts drop around it." },
  // The Nanobot Knight's kit (release 245, Tim 2026-10-19: black with red accents; teleports or dissolves into mist;
  // physical hits scatter it unless elemental, a spell or an Echo-glyphed weapon; Abyss Watcher sword slides; an arm
  // laser cannon; swords falling from the sky; homing orbs that
  // circle it and are sent one by one or all at once; a homing missile barrage that explodes on timeout).
  knightSlide: { id: "knightSlide", name: "Sliding Cuts", range: [0, 6.5], cooldown: 3, windup: .35, active: 1.6, recover: .45, damage: .9, tags: ["melee", "combo"], text: "Three sliding sword cuts: it skids in low along the ground, cuts, and comes again." },
  knightCannon: { id: "knightCannon", name: "Arm Cannon", range: [0, 11], cooldown: 6, windup: .9, active: 1, recover: .5, damage: .5, tags: ["ranged", "beam"], text: "Its arm opens into a cannon; a red beam charges, tracking you, then fires straight. Step off the line before it fires." },
  knightSwordfall: { id: "knightSwordfall", name: "Swordfall", range: [0, 11], cooldown: 7, windup: .5, recover: .5, damage: 1, tags: ["ground"], text: "Swords fall out of the sky around and onto you. Each marks the ground first." },
  knightOrbs: { id: "knightOrbs", name: "Seeker Orbs", range: [0, 11], cooldown: 8, windup: .6, active: 2.6, recover: .3, damage: .6, tags: ["ranged", "orbs"], text: "Orbs gather and circle it, then go for you: one by one or all at once. They home for a moment, then fly straight." },
  knightMissiles: { id: "knightMissiles", name: "Missile Barrage", range: [0, 13], cooldown: 9, windup: .7, recover: .5, damage: .7, tags: ["ranged"], text: "A barrage of homing missiles. They burst on whatever they meet, or on their own when their fuel runs out." },
  knightThrust: { id: "knightThrust", name: "Lunging Thrust", range: [0, 8], cooldown: 3.6, windup: .45, active: .35, recover: .45, damage: 1.2, tags: ["charge", "melee"], text: "It dashes with its sword outstretched, at you or off to the side, along any of the eight ways; sometimes a beam of energy leaves the tip at the end." },
  knightCombo: { id: "knightCombo", name: "Six-Cut Onslaught", range: [0, 6], cooldown: 4.2, windup: .4, active: 6, recover: .5, damage: .85, tags: ["melee", "combo"], text: "Two cuts, a dash after you, two more, another dash, two more: six cuts in all, each pair forward then back. Some throw an arc of energy off the tip, reaching as far as your own blade." },
  knightBackslash: { id: "knightBackslash", name: "Retreating Slash", range: [0, 3.5], cooldown: 4.5, windup: .15, active: .4, recover: .35, damage: 1, tags: ["melee", "evade"], text: "It leaps back away from you, slashing as it goes; the arc of energy off its sword covers its retreat." },
  knightMist: { id: "knightMist", name: "Mist Step", range: [1, 12], cooldown: 5, windup: .3, recover: .35, damage: 1.1, tags: ["teleport", "melee"], text: "It dissolves into a swarm, drifts, and comes together beside you mid-cut." },
  // The Psychic Crystal's kit (release 249, Tim 2026-10-19: a floating crystal whose aura changes colour (hazy white;
  // red and larger when it attacks; blue or purple before a grab); force push; force pull; a command grab that holds you
  // a few seconds while it winds up a powerful attack; debris it levitates and throws; a psychic wall that reflects
  // ranged attacks while blades pass through).
  psyPush: { id: "psyPush", name: "Force Push", range: [0, 4.5], cooldown: 4, windup: .55, active: .35, recover: .45, damage: .7, tags: ["control"], text: "A ring of force throws you back. Hit a wall and it hurts more." },
  psyPull: { id: "psyPull", name: "Force Pull", range: [2.5, 9], cooldown: 6, windup: .6, active: 1.2, recover: .45, damage: .9, tags: ["control"], text: "It drags you toward it, then lashes out as you arrive. Dodge or run against it." },
  psyGrab: { id: "psyGrab", name: "Command Grab", range: [0, 7.5], cooldown: 10, windup: .75, active: 2.4, recover: .6, damage: 2.2, tags: ["control", "grab"], text: "Its aura turns violet: then it seizes you where you stand and crushes you. Dodge as it reaches, or struggle (dodge, again and again) to break free." },
  psyDebris: { id: "psyDebris", name: "Hurled Debris", range: [2, 11], cooldown: 5.5, windup: .9, active: 1.6, recover: .4, damage: 1, tags: ["ranged"], text: "Stones rise around it and are flung at you one by one. Over the open ocean it lifts and hurls water instead." },
  psyWall: { id: "psyWall", name: "Mirror Wall", range: [2, 12], cooldown: 9, windup: .4, recover: .3, damage: 0, tags: ["defense"], text: "A wall of light stands between you. Arrows and bolts that touch it fly back at you; a blade passes straight through." },
  psyOrbital: { id: "psyOrbital", name: "Orbital Lances", range: [0, 14], cooldown: 11, windup: .5, recover: .3, damage: .45, tags: ["ground", "beam"], text: "One to four sky beams trace shifting patterns after you. Outrun the light; the fading marks it leaves are harmless." },
  // Void Walker (release 251): the owner's full kit, with implementation-choice timings in seconds.
  // Release 407 (Tim: "the Void Walker should attack less frequently"): every Void Walker cooldown is about 40% longer.
  voidHand: { id: "voidHand", name: "Rending Hands", range: [0, 12], cooldown: 3.8, windup: .25, recover: .22, damage: 1.05, los: true, tags: ["void", "ground"], text: "Galaxy rends open above the marked ground; open hands slam down." },
  voidClaw: { id: "voidClaw", name: "Rift Claws", range: [0, 12], cooldown: 4.3, windup: .25, recover: .22, damage: .9, los: true, tags: ["void", "melee"], text: "Claws rake out of two warned rends, not from the Walker's hands." },
  voidSword: { id: "voidSword", name: "Swords Beyond", range: [0, 12], cooldown: 4.8, windup: .25, recover: .22, damage: 1.1, los: true, tags: ["void", "melee"], text: "Long swords stab along two narrow, committed rift lanes." },
  voidSlash: { id: "voidSlash", name: "Travelling Slashes", range: [0, 12], cooldown: 5, windup: .28, recover: .24, damage: .8, los: true, tags: ["void", "ranged"], text: "Rends fling straight-travelling violet slashes. Walls stop them." },
  voidSpikes: { id: "voidSpikes", name: "Void Spikes", range: [0, 12], cooldown: 5.8, windup: .25, recover: .25, damage: .9, los: true, jumpable: true, tags: ["void", "ground"], text: "The marked ground breaks into spikes in rapid succession." },
  voidWraiths: { id: "voidWraiths", name: "Passing Wraiths", range: [0, 12], cooldown: 8, windup: .35, recover: .3, damage: .7, los: true, tags: ["void", "ranged"], text: "Brief wraiths emerge, travel straight toward your sampled position, slash three times and disappear." },
  voidRifts: { id: "voidRifts", name: "Open Ways", range: [0, 12], cooldown: 13, windup: .4, recover: .3, damage: .8, los: true, tags: ["void", "teleport"], text: "Persistent galaxy rends spit attacks and let the Walker evade into another opening." },
  voidConstellation: { id: "voidConstellation", name: "Rift Constellation", range: [0, 14], cooldown: 15, windup: .45, recover: .3, damage: .8, los: true, tags: ["void", "ranged", "teleport"], text: "Three to six rends follow you; each opens once, with wraiths, beams and the Walker arriving together or in rapid succession." },
  voidHorizons: { id: "voidHorizons", name: "Event Horizons", range: [0, 12], cooldown: 13, windup: .45, recover: .3, damage: .55, los: true, tags: ["void", "control", "beam"], text: "Dark cores draw you in and hurt on contact. Some pulse a fixed-direction beam two or three times." },
  voidSupernova: { id: "voidSupernova", name: "Supernova", range: [0, 14], cooldown: 30, windup: 1.1, active: 7.8, recover: .6, damage: 1.2, los: true, tags: ["void", "ground", "charge"], text: "A great void consumes dungeon terrain, draws you through local eruptions and two or three radial particle waves. The Walker teleports and dashes straight through sampled positions, leaving one-second damaging trails." },
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
  mountainTurtle: {
    id: "mountainTurtle", name: "The Mountain Turtle", epithet: "The Walking Mausoleum", unique: true,
    stats: [360, 18, 0], form: { scale: 2.9 }, sizeClass: "large", movement: "lurch", brain: "juggernaut",
    attacks: ["turtleStomp", "turtleDash", "turtleSpin", "turtleCyclone", "turtleComet", "turtleShield"], bossAttacks: ["shockwave"],
    palette: ["#6f7a72", "#1e2420", "#8fd8ff", "#e8f6ff"], render: "mountainTurtle", tags: ["beast", "elder", "ice", "stone"],
    lore: "A tortoise the size of a barrow, its shell a tomb of fitted stone: doors, steps and a cold light inside. It walks slowly and stamps the ground flat; it rushes in bursts that leave fire or ice behind; it spins inside a tornado of ice and breathes comets of it; and when it chooses, it grows a shield of ice that nothing gets through.",
  },
  nanobotKnight: {
    id: "nanobotKnight", name: "The Nanobot Knight", epithet: "The Swarm in Armour", unique: true,
    stats: [300, 17, 0], form: { scale: 1.45 }, sizeClass: "large", movement: "walk", brain: "duelist",
    attacks: ["knightSlide", "knightThrust", "knightCombo", "knightBackslash", "knightCannon", "knightSwordfall", "knightOrbs", "knightMissiles", "knightMist"], bossAttacks: ["blinkStrike"],
    palette: ["#16161a", "#060608", "#ff2a2a", "#ffd0c8"], render: "nanobotKnight", tags: ["construct", "elder", "swarm"],
    lore: "Black armour with a red seam of light, and nothing inside but a swarm. Plain steel scatters it like smoke; fire, sparks, spells and a blade that strikes twice find it. It slides in low with its sword, opens its arm into a cannon, calls down swords, and sends seeker orbs and missiles after you.",
  },
  psychicCrystal: {
    id: "psychicCrystal", name: "The Psychic Crystal", epithet: "The Mind That Floats", unique: true,
    stats: [260, 15, 0], form: { scale: 1.1 }, sizeClass: "medium", movement: "hover", brain: "orbit",
    attacks: ["psyPush", "psyPull", "psyGrab", "psyDebris", "psyWall", "psyOrbital"], bossAttacks: ["sweepBeam"],
    palette: ["#c8d4f0", "#3a3a6a", "#e8eeff", "#ffffff"], render: "psychicCrystal", tags: ["construct", "elder", "mind"],
    lore: "A shard of something larger, floating at the height of a head, turning slowly. Its haze goes red when it means harm and violet just before it takes hold of you. It throws you back, draws you in, lifts the stones from the ground, and raises walls of light that send your arrows home.",
  },
  voidWalker: {
    id: "voidWalker", name: "The Void Walker", epithet: "The Space Between Footsteps", unique: true,
    stats: [280, 16, 0], form: { scale: 1 }, sizeClass: "medium", movement: "walk", brain: "orbit",
    attacks: ["voidHand", "voidClaw", "voidSword", "voidSlash", "voidSpikes", "voidWraiths", "voidRifts", "voidConstellation", "voidHorizons", "voidSupernova"], bossAttacks: [],
    palette: ["#29213f", "#0c0918", "#b779ff", "#f1ddff"], render: "voidWalker", tags: ["spirit", "elder", "void"],
    lore: "A figure no larger than a Wayfarer. Behind its quiet silhouette, galaxies open: hands, blades and passing wraiths reach through. Its greatest star leaves a permanent wound in the dungeon floor.",
  },
  lightningGiant: {
    id: "lightningGiant", name: "The Lightning Giant", epithet: "The Walking Storm", unique: true,
    stats: [340, 18, 0], form: { scale: 1.9 }, sizeClass: "huge", movement: "walk", brain: "duelist",
    attacks: ["giantArcs", "giantShock", "giantSwing", "giantSlam", "giantMenace", "giantUpswing", "giantElectrify"], bossAttacks: [],
    palette: ["#5d6670", "#1d2229", "#7fd6ff", "#eafaff"], render: "lightningGiant", tags: ["construct", "elder", "lightning"],
    lore: "A robot as tall as a house, with a club of iron and copper and Tesla coils on its shoulders. Lightning arcs from it to whatever it hunts. It knocks you flat with a shock, swings and slams its club, and when it calls the sky down onto itself it runs hot and fast while bolts fall all around it.",
  },
  // Unique fixture entries only; natural hunts await final r251/Gate lifecycle integration.
  astralWorm: {
    id: "astralWorm", noEcho: true, name: "The Astral Worm", epithet: "The Ink That Remembers Shapes", unique: true,
    stats: [1400, 60, 0], form: { scale: 1 }, sizeClass: "large", movement: "hover", brain: "orbit",
    attacks: ["bite"], bossAttacks: [], palette: ["#080b10", "#030508", "#9eafce", "#c4d0dc"], render: "astralWorm", tags: ["elder", "ink"],
    lore: "An elongated blackness that makes and unmakes its own limbs.",
  },
  astralMirage: {
    id: "astralMirage", prototypeOnly: true, name: "Astral Mirage", epithet: "A Borrowed Outline", unique: true, minion: true,
    stats: [168, 0, 0], form: { scale: 1 }, sizeClass: "large", movement: "hover", brain: "orbit",
    attacks: ["bite"], bossAttacks: [], palette: ["#080b10", "#030508", "#9eafce", "#c4d0dc"], render: "astralWorm", tags: ["ink"],
    lore: "A fragile, hungry outline of the Astral Worm.",
  },
  gnawingMaw: {
    id: "gnawingMaw", name: "Gnawing Maw", epithet: "The Hunger in the Walls", dungeonOnly: true,
    stats: [70, 14, 0], form: { scale: 1.35 }, sizeClass: "large", movement: "phase", brain: "ambush",
    attacks: ["devourPull", "bite"], bossAttacks: ["groundRupture"],
    palette: ["#6e2a2e", "#1a0a0b", "#e8d9c2", "#ff4a4a"], render: "gnawingMaw", tags: ["flesh", "wall"],
    lore: "A mouth that lives inside the masonry. It breathes in, and the room leans toward it.",
  },
};

// Unreleased fixture-only entries are explicitly addressable, but not part of the player catalog,
// generator, Echo list or standard Proving Ground menu until their integration contract is complete.
export const PACK_KINDS = Object.keys(MONSTER_PACK).filter(id => !MONSTER_PACK[id].prototypeOnly);
export function isPackKind(kind) { return Object.hasOwn(MONSTER_PACK, kind); }
export const PACK_FORMS = Object.fromEntries(Object.keys(MONSTER_PACK).map((id) => [id, { ...MONSTER_PACK[id].form }]));
export const PACK_STATS = Object.fromEntries(Object.keys(MONSTER_PACK).map((id) => [id, [...MONSTER_PACK[id].stats]]));

// Boss form shared by every pack creature: tougher, larger, faster cadence, and its
// `bossAttacks` unlock at 66% and 33% health so the fight changes as it goes.
export const PACK_BOSS_TEMPLATE = { hp: 3.4, damage: 1.3, scale: 1.35, cooldown: .85, enrage: .5, phases: [.66, .33] };

// Ordinary-dungeon guardians: the Hollow Marshal stays in the rotation; every pack creature
// can now guard a dungeon in its boss form.
// Release 263 (Tim, 2026-10-21: "make sure that all the creatures that can [leave Echoes] can also be guardians"): every
// non-unique pack creature with an Echo is in the pool (the Pallid Crawler joins). Unique creatures are world beasts or
// the Far Gate's Listener and leave their Echoes where they are fought. A dungeon keeps the guardian it first rolled
// (history.guardianKind), so only dungeons never entered can draw from the wider pool.
export const GUARDIAN_POOL = ["hollowMarshal", "weepingSaint", "amalgam", "hangedChoir", "gnawingMaw", "sunderjaw", "thunderhorn", "cinderSeraph", "siegeBeetle", "lumenWraith", "mirrorShade", "strataEel", "veilSpinner", "riftLynx", "graveLantern", "pallidCrawler"];
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
  if (!def || kind === "voidWalker") return { hybridAttack: null, donor: null };
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
  enemy.scale = enemy.kind === "voidWalker" ? 1 : Math.round(enemy.scale * t.scale * 100) / 100;
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
  if (enemy.kind === "psychicCrystal") enemy.crystalFall = 0; // release 259: a poise break does not survive a reload
  // Snapshots retain attack lists. Move the sky attack for existing journeys too, without retuning their beasts.
  if (enemy.kind === "nanobotKnight") enemy.packAttacks = (enemy.packAttacks || MONSTER_PACK.nanobotKnight.attacks).filter((id) => id !== "knightOrbital");
  if (enemy.kind === "psychicCrystal" && !(enemy.packAttacks || []).includes("psyOrbital")) enemy.packAttacks = [...(enemy.packAttacks || MONSTER_PACK.psychicCrystal.attacks), "psyOrbital"].filter((id, i, ids) => ids.indexOf(id) === i);
  enemy.voidDashing = false; enemy.voidCharging = false; enemy.voidTeleport = 0;
  enemy.untargetable = false; enemy.hidden = false; enemy.aloft = false; enemy.phasing = false; enemy.iceShield = false; enemy.spinning = false; enemy.tucked = false; enemy.sliding = false; enemy.mist = false; enemy.thrusting = null; enemy.swing = null; enemy.giantPose = null; enemy.giantCharged = 0; enemy.giantAir = 0; enemy.giantThrust = false; enemy.giantDash = null; // release 245: no pose survives a reload
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
// Release 421 (Tim: "the bosses do too much damage... they need to have slightly more wind ups for their attacks... reduce their
// damage by... 15%... more cool down between their attacks... they attack way too aggressively"): every boss and Revenant
// (staggerClass) hits for `damage` of before, winds up `windup` times longer, waits `cooldown` times longer before an attack
// comes round again and pauses `gap` times longer between attacks. Elites and ordinary creatures are unchanged. The game's
// world turns it on (`w.bossPace`); a bare module world keeps the base timings the attack modules are written in.
export const BOSS_PACE = { damage: .85, windup: 1.2, cooldown: 1.25, gap: 1.35 };
export const bossPaced = (e) => { const k = staggerClass(e); return k === "boss" || k === "revenant"; };
function cooldownScale(e) { const enraged = e.boss && e.hp <= e.maxHp * PACK_BOSS_TEMPLATE.enrage; return (Number(e.attackCooldownScale) || 1) * (enraged ? .8 : 1) * (e.pack?.paced ? BOSS_PACE.cooldown : 1); }
function segmentDistance(p, a, b) { const vx = b.x - a.x, vy = b.y - a.y, l = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / l)); return Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t)); }
function inArc(e, target, aim, radius, arcDegrees) {
  const dx = target.x - e.x, dy = target.y - e.y, d = Math.hypot(dx, dy);
  if (d > radius) return false;
  if (d < .25) return true;
  return Math.acos(Math.max(-1, Math.min(1, (dx * aim.x + dy * aim.y) / d))) <= arcDegrees * Math.PI / 360;
}
// Walk a ray until the first tile that blocks sight; beams and charge lanes stop there.
export function rayLength(w, from, dir, max) {
  const open = from.kind === "psychicCrystal" && w.marineTileOpen ? w.marineTileOpen : w.tileOpen;
  for (let t = .25; t <= max; t += .25) if (!open.call(w, from.x + .5 + dir.x * t, from.y + .5 + dir.y * t)) return Math.max(.25, t - .25);
  return max;
}
function nearestOpen(w, x, y, radius = 3, open = w.open) {
  if (open.call(w, x, y)) return { x, y };
  for (let r = .5; r <= radius; r += .5) for (let i = 0; i < 12; i++) { const a = i * TAU / 12, q = { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r }; if (open.call(w, q.x, q.y)) return q; }
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
  growHeal: 0,                                          // release 307 (Tim: "the blob doesn't need to regenerate health... just when his little bloblings get to him"); was .5
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
  // Tim: "you can't really escape them": a tentacle left far behind sinks, and comes up again around the Wayfarer a little later
  tentacleFollow: 8, tentacleFollowDelay: 1.4, tentacleSink: .5, tentacleUnder: [1, 2.4],
  fireEvery: .26, fireBurst: 5, fireRest: 1.4, fireSpeed: 6.4, fireLife: 1.8, fireRadius: .3,
  laserCharge: 1.3, laserTurn: .42, laserLength: 10, laserTick: .4, laserWidth: .5, // lasers stay on, turning slowly after you, until their tentacle is cut down
  riseTravel: 2.2, riseSpeed: 5.2, riseMark: .8, riseRadius: 1.6,
  rocks: 4, rockRadius: 1.25, rockFlight: 1.1, rockSpread: 2.2,
  // Lava spew (Tim: "spill out … as if water were getting spilled"): a stream poured along a cone; each gout lands and
  // runs outward, slowing as it spreads, then lies hot for lavaLife seconds and crusts over.
  lavaLength: 6.2, lavaArc: 44, lavaEvery: .09, lavaPerPour: 2, lavaFlight: .12, lavaRun: 1.8, lavaRunTime: .55, lavaGrow: [.35, 1.05], lavaGrowTime: .45, lavaLife: 1.8, lavaTick: .5,
};
// The Mountain Turtle (release 241). Balance as data.
// Release 397 (Tim, 2026-10-24: "the hits... where they're gonna be going on the floor... right now it's like pale red. It
// should be... pale hot pink... understated and not very bright... translucent... the uniform color for damage all across
// the game"): every warning of where a blow will land uses these.
export const DANGER = { fill: "rgba(255,80,190,.18)", fillStrong: "rgba(255,80,190,.32)", edge: "rgba(255,130,210,.72)", hex: "#ff7ccf" };
export const TURTLE = {
  // Release 261 (Tim: "the turtle can appear in the water... he'll make like a temporary ice floor... walkable tiles... your
  // boat can slide across it... they'll persist for... 5, maybe 10 seconds, and then... unfreeze"): open sea within
  // `radius` of it freezes to walkable ice every `tick` s; each ice tile thaws `life` s after the Turtle last froze it.
  // Release 263 (Tim: "Don't make an ice floor [all the time]... at the end of its attacks it'll make an ice floor... if
  // it's bouncing all over the screen, it's not gonna make a bunch of ice floors"): one patch of `radius`, frozen where it
  // stands once it has made no attack for `settle` s after a combo; it thaws `life` s later, whoever stands on it.
  seaIce: { radius: 2.6, life: 8, tick: .5, settle: 1 },
  stompRadius: 1.9, stompRing: 4.2,
  dashSpeed: 7.5, dashEvery: .14, trailLife: 3.2, trailRadius: .75, trailBite: .45, fireTick: .5, iceTick: .6, iceSlow: .55, iceBurst: [2, 2.6], iceBurstRadius: 1.3, iceBurstBite: .9, // fire burns while it lasts; ice stings and slows, then bursts
  spinRadius: 1.4, spinTick: .4, spinPull: .9, twisterEvery: .5, twisterMax: 6, twisterSpeed: 1.4, twisterLife: 10, twisterRadius: .7, twisterTick: .7, twisterSlow: .5, twisterBite: .35,
  cycloneSpeed: 5.2, cycloneHitEvery: .7, icicleEvery: .2, iciclesPerVolley: 3, icicleTurn: .37, icicleSpeed: 7, icicleLife: 1.3, icicleRadius: .22, icicleBite: .4, // the second spin: careening, rebounding, flinging icicles
  cometSpeed: 5.5, cometRadius: .6, cometBlast: 1.9, cometFrost: 1.6, cometFrostLife: 3.5,
  tuckTime: .8, // its dodge: it pulls into its shell (no blow lands) instead of springing aside
};
// The Nanobot Knight (release 245). Balance as data.
// Lightning Giant tuning (release 257). Provisional numbers, not the owner's.
export const GIANT = {
  arcRange: 7.5, arcTick: .35, arcBolts: 4,
  shockRadius: .95,
  // Stun counter (Tim 2026-10-21): every third lightning hit knocks the Wayfarer down for stunTime; club blows count only
  // while the Giant is electrified. The counter fades after shockDecay seconds without a lightning hit.
  stunHits: 3, stunTime: .5, shockDecay: 10,
  swingReach: 1.8, swingArc: 150,
  slamReach: .9, slamRadius: 1.5, slamRing: 3.2, slamRingShare: .5,
  skyChance: .55, skyWarn: .95, skyRadius: 1.4, skyLife: .45,
  coneChance: .55, coneBolts: 3, coneSpread: 22, boltSpeed: 12, boltLife: .9, boltRadius: .32, boltWarn: .45, // boltWarn (release 397): the slam's bolts hold, lane shown, before they fly
  chargeTime: 8, chargeSpeed: 1.5, stormEvery: .5, stormRing: [1.5, 4.5], stormWarn: .6, stormRadius: .8, stormLife: .35,
  strikeAt: .55,
  // Menacing slam: stalk with the club up for up to menaceHold s; when within reach, a dodgeable wind-up then the slam
  // (or a short chest bolt); up to menaceStrikes times.
  menaceHold: 3.2, menaceSpeed: 1.15, menaceStrikes: 2, menaceReach: 1.1, menaceWindup: .42, menaceBeat: .3, chestChance: .35, chestRange: 5, chestWidth: .45, chestWindup: .3,
  // Kept out of reach, it doesn't just lower the club: it fires honestShots chest beams one after another to keep you
  // honest, each with a short charge, honestStagger s apart, in a small cone (±honestCone/2°), the later one turned
  // toward where you are now by at most honestTrack°. Tim, 2026-10-21: "being and then being... slightly track you".
  honestShots: 2, honestRange: 10, honestWindup: .32, honestStagger: .2, honestCone: 9, honestTrack: 12, honestShare: .6,
  // Charging upswing and its optional leap.
  // Burst dashes (Tim 2026-10-21, "like Armored Core"): it walks slowly but closes distance with shoulder-thruster dashes,
  // up to dashMax in a row, sometimes as a hop through the air. Traversal dashes start when the Wayfarer is beyond dashRange.
  dashRange: 4.5, dashSpeed: 11, dashTime: .3, dashGap: .18, dashMax: 2, dashCooldown: 2.4, hopChance: .3, hopHeight: .9,
  // Charge plans: how a charge attack strings its dashes and upswings together.
  chargePlans: [["dash", "swing"], ["dash", "dash"], ["dash", "swing", "dash", "swing"], ["dash", "dash", "swing"]],
  chargeRun: 6.5, chargeTime: .9, upswingReach: 1.8, upswingArc: 130, upswingTime: .3, jumpChance: .55, jumpHeight: 2, jumpRise: .35,
  barrageBolts: 5, barrageEvery: .1, barrageSpread: 40, airDashSpeed: 9, airDashTime: .35, airArcReach: 2.6, slamLandChance: .5, landWarn: .45, landRadius: 1.6, landFall: .25,
};
export const KNIGHT = {
  slides: 3, slideTime: .28, slideSpeed: 11, slideReach: 2.3, slideArc: 120, slidePause: .2,
  cannonTrack: 1.8, cannonLength: 11, cannonTick: .3, cannonWidth: .5,
  swords: 6, swordRing: [1.2, 2.6], swordRadius: .75, swordFall: [.9, 1.6],
  orbs: 3, orbsEnraged: 6, orbEnrage: .5, orbOrbit: 1.6, orbSpin: 3, orbFloat: .6, orbSpeed: 5.5, orbHome: 2, orbTurn: 3.2, orbLife: 5, orbRadius: .3, orbEvery: .4,
  // Release 421 (Tim: "they shouldn't home in on you forever... like 2 seconds. And then they should just fly straight... they
  // should be blocked by walls and blocks"): missiles home for missileHome s, then fly straight until missileFuel runs out.
  missiles: 8, missileSpeed: 5, missileTurn: 2.4, missileHome: 2, missileFuel: 4, missileBlast: 1.1, missileRadius: .25,
  mistTime: .55, mistLand: 1.6,
  // Tim: its swings sometimes throw energy off the sword, reaching about as far as the Wayfarer's own blades
  // (Verge Cleaver's 1.75, Cinder Pike's 2.45), so it can strike from where you strike it
  arcReach: 1.75, arcChance: 45, thrustSpeed: 13, thrustReach: 1.2, thrustBeam: 2.45, beamChance: 55, comboArc: 150, comboPause: .22, comboPlan: ["cut", "cut", "dash", "cut", "cut", "dash", "cut", "cut"], comboDash: .4, comboClose: 1.1, comboLengths: [[2, 40], [4, 35], [6, 25]], comboLengthsEnraged: [[2, 20], [4, 35], [6, 45]], // Tim: up to six cuts, two between dashes; how many varies (weights in %), longer when it is hurt
  backHop: 2.6, backslashChance: 40, // of the times it slips your attack, this % it leaps back slashing instead of turning to mist
  dodgeMist: .3, dodgeLeap: 2.8, // its dodge: it dissolves and comes together a few tiles aside
  mistChance: 40, mistEvery: .9, // Tim: any attack coming at it (blade, shot or spell) has this % chance to find only mist, even mid-attack
};
// Plain physical blows scatter the Knight (Tim: "unless the attack is elemental, a spell, or the weapon has the Echo glyph").
// Release 249: a weapon carrying an elemental glyph (fire, lightning, a blast) counts as elemental too.
export const SWARM_PIERCING_GLYPHS = ["echo", "ignite", "chain", "volatile"];
export const glyphsReachSwarm = (loadout) => SWARM_PIERCING_GLYPHS.some((id) => loadout?.has?.(id));
const EIGHT = Array.from({ length: 8 }, (_, i) => ({ x: Math.round(Math.cos(i * Math.PI / 4) * 1000) / 1000, y: Math.round(Math.sin(i * Math.PI / 4) * 1000) / 1000 }));
// A cut with, now and then, an arc of energy off the tip: the hit reaches arcReach farther, and the arc is drawn.
function knightCut(e, s, w, id, aim, energized, arc = KNIGHT.slideArc) {
  const reach = bodyRadius(e) + KNIGHT.slideReach + (energized ? KNIGHT.arcReach : 0);
  resolveMelee(e, s, w, id, (q) => inArc(e, q, aim, reach, arc));
  if (energized) w.addEffect({ kind: "swordArc", owner: e.id, x: e.x, y: e.y, angle: Math.atan2(aim.y, aim.x), arc, radius: reach, lift: (Number(e.scale) || 1) * .45, arming: 0, life: .28, total: .28, damage: 0 });
  s.data.cutAt = w.now;
}
const energized = (e, s, n, chance = KNIGHT.arcChance) => hashSeed(`${e.id}:${s.seq}:energy:${n}`) % 100 < chance;
export function nanoScatters(e, { physical = false, echoGlyph = false } = {}) { return e?.kind === "nanobotKnight" && physical && !echoGlyph; }
// The Psychic Crystal (release 249). Balance as data.
// Boss poise (release 307, Tim: "all the bosses should be able to be staggered... a tiered stagger system... a few hits,
// and then a few more... at the third tier... a set amount of hits and a set... cool down between staggers... the larger
// monsters can... have larger poise... the turtle and the robot... the largest... the astral worm... surprisingly low...
// the Void Walker... pretty sturdy"). `hits` are the landed blows for the first, second and every later break (forgotten
// after `forget` s without one); after rising it cannot break again for `guard` s. The Psychic Crystal keeps its own
// (CRYSTAL.poiseHits). Applies to world beasts, the Questing Beast and the Mire Heart.
export const BOSS_POISE = {
  default: { hits: [8, 12, 18], guard: 9, breakTime: 2.4 },
  mountainTurtle: { hits: [14, 20, 28], guard: 10, breakTime: 2.6 },
  lightningGiant: { hits: [14, 20, 28], guard: 10, breakTime: 2.6 },
  nanobotKnight: { hits: [10, 15, 22], guard: 9, breakTime: 2.4 },
  voidWalker: { hits: [12, 17, 24], guard: 10, breakTime: 2.4 },
  astralWorm: { hits: [5, 7, 10], guard: 8, breakTime: 2.8 },
  morphingBlob: { hits: [9, 13, 19], guard: 9, breakTime: 2.4 },
  tremorWorm: { hits: [9, 13, 19], guard: 9, breakTime: 2.4 },
  questingBeast: { hits: [10, 15, 22], guard: 9, breakTime: 2.2 },
  forget: 6,
};
export const bossPoiseOf = (e) => e.kind !== "psychicCrystal" && (e.worldBeast || e.questingBeast || e.mireHeart) ? BOSS_POISE[e.kind] || BOSS_POISE.default : null;
export const CRYSTAL = {
  pushRadius: 4.5, pushForce: 9, pushBite: .7,
  pullRadius: 9.5, pullForce: 3.6, pullReach: 1.2,
  grabRange: 7.5, grabHold: 2.4, struggle: .35, // each dodge pressed while held shortens the hold by this many seconds
  debris: 4, debrisOrbit: 1.3, debrisRise: .7, debrisEvery: .32, debrisSpeed: 7.5, debrisLife: 2.2, debrisRadius: .3,
  waterStep: .2, waterSplashLife: .3, // the ocean variant has the same attack; its spent projectile becomes a harmless splash
  wallLength: 3.4, wallGap: 1.8, wallLife: 5, wallThickness: .35, reflectShare: .8,
  orbitalBeams: [1, 4], orbitalPatterns: ["spiral", "square", "circle", "zigzag", "slash"],
  orbitalLife: 4, orbitalWarn: .7, orbitalSpeed: 2.1, orbitalRadius: .65, orbitalTick: .35,
  orbitalSpread: 1.6, orbitalPeriod: 2.4, scorchEvery: .3, scorchLife: 1.5, scorchRadius: .5, scorchMax: 24,
  roamSpeed: 1.1, roamNodes: 625, roamDistance: 6, roamRecent: 6, roamPause: .25, roamRetry: 1, roamSight: 7, terrainLookahead: 1,
  // Poise (release 259; Tim: "it dodges a lot... that's fine... it has poise, so if it takes a few hits, then it will
  // break and fall through the floor and then you can get a bunch of hits in, and then it will... get up and dodge away").
  // `poiseHits` landed blows (forgotten after `poiseForget` s without one) break it: it drops to the floor for `breakTime`
  // s (falling over `fallTime`, rising over `riseTime`) and cannot dodge, attack or move; then it rises and springs away.
  poiseHits: 10, poiseForget: 5, breakTime: 3.2, fallTime: .25, riseTime: .4, // poiseHits: Tim, "let's do like ten hits for a poise break"; 14 from release 285, with fewer dodges
  // Engaged, it settles where the Wayfarer can reach it (release 259; Tim: "its end goal should be... a place the player can
  // walk to... it can spend some time between walls, that's fine"): after `wallLinger` s inside walls (or over ground the
  // Wayfarer cannot reach) it heads for the nearest reachable floor within `manifestSearch` tiles at `manifestSpeed`, and
  // blinks onto it if held back for `manifestBlink` s. It hunts the Wayfarer "for a while": out of sight and beyond
  // `roamSight` for `forgetAfter` s, it drops its aggro and returns to its own patrol, which roams the whole dungeon.
  wallLinger: 1.5, manifestSearch: 10, manifestSpeed: 2.4, manifestBlink: 1.2, forgetAfter: 12, // wallLinger was 2.5 (release 285)
  // Release 285 (Tim, 2026-10-22: "he retreats to the wall constantly... for every 5 seconds he can only spend 1 second in
  // the tile... so that I actually get to fight him"): a hidden wall budget. Release 401: in a dungeon it no longer drifts into
  // walls at all (game.ts move), so the budget only governs ground the Wayfarer cannot reach (pits, deep water). Engaged, each second off reachable floor spends
  // a second of `wallBudget`; it refills over `wallWindow` s on reachable floor. Spent, it must come out, even mid-attack.
  wallBudget: 1, wallWindow: 5,
  // Release 285 (Tim: "reduce his dodging... so he should stay and fight for a little bit... increase the amount of hits it
  // takes to stagger him... maybe like 10 seconds where it can't be staggered again"): its own evade cooldown (the shared
  // one is QB_MOVES.evadeCooldown, 1.1 s), and after rising from a poise break it cannot break again for `poiseGuard` s.
  // Release 401 (Tim: "he dodges too much... a smaller stagger cooldown... he just runs too much, and I never get to actually
  // fight him"): it dodges at most every 5 s (3.5 s enraged), breaks after 10 blows (was 14), and can break again 4 s after
  // rising (was 10).
  evadeCooldown: 5, evadeCooldownEnraged: 3.5, poiseGuard: 4,
  touchAggro: 1.1, // release 287: unprovoked, it notices the Wayfarer only this close (a touch) or when hurt
  // In a dungeon it may phase through an interior wall up to this many tiles thick (Game.roamerBounds), never beyond the edge.
  boundsSpan: 3,
};
// A continuous path around a slowly tracking centre. Beam phases spread a volley around the same pattern;
// all choices and motion are deterministic, and none of these transient effects changes dungeon geometry.
export function crystalOrbitalOffset(pattern, phase, elapsed) {
  const t = elapsed / CRYSTAL.orbitalPeriod + phase, loop = ((t % 1) + 1) % 1, a = t * TAU, r = CRYSTAL.orbitalSpread;
  if (pattern === "square") {
    const edge = Math.floor(loop * 4), k = loop * 4 - edge;
    return [{ x: -r + 2 * r * k, y: -r }, { x: r, y: -r + 2 * r * k }, { x: r - 2 * r * k, y: r }, { x: -r, y: r - 2 * r * k }][edge];
  }
  if (pattern === "zigzag") return { x: r * (2 / Math.PI) * Math.asin(Math.sin(a)), y: r * (2 / Math.PI) * Math.asin(Math.sin(a * 3)) };
  if (pattern === "slash") { const d = r * Math.sin(a); return { x: d, y: d }; }
  const radius = pattern === "spiral" ? r * (.5 + .5 * Math.sin(a / 2)) : r;
  return { x: Math.cos(a) * radius, y: Math.sin(a) * radius };
}
function launchKnightOrb(f, player) {
  const a = Math.atan2(player.y - f.y, player.x - f.x);
  Object.assign(f, { state: "home", homeFor: KNIGHT.orbHome, life: KNIGHT.orbLife, vx: Math.cos(a) * KNIGHT.orbSpeed, vy: Math.sin(a) * KNIGHT.orbSpeed });
}
// The mirror wall reflects at the first swept contact, not just when a frame happens to land inside it.
// Coordinates use the projectile frame; the returned point includes travel left after reflection in this substep.
export function reflectShotStep(q, effects, step = 0) {
  const dx = (q.dx || 0) * step, dy = (q.dy || 0) * step, end = { x: q.x + dx, y: q.y + dy };
  if (q.hostile || q.dead) return end;
  let first = null;
  for (const f of effects || []) {
    if (f.kind !== "psyWall" || f.arming > 0 || q.reflectedBy === f.id) continue;
    const rx = q.x - f.x - .5, ry = q.y - f.y - .45;
    const axes = [[rx * f.nx + ry * f.ny, dx * f.nx + dy * f.ny, CRYSTAL.wallThickness], [rx * -f.ny + ry * f.nx, dx * -f.ny + dy * f.nx, CRYSTAL.wallLength / 2]];
    let enter = 0, leave = 1;
    for (const [at, delta, half] of axes) {
      if (Math.abs(delta) < 1e-12) { if (Math.abs(at) > half) { enter = 2; break; } }
      else { const a = (-half - at) / delta, b = (half - at) / delta; enter = Math.max(enter, Math.min(a, b)); leave = Math.min(leave, Math.max(a, b)); }
    }
    if (enter > leave || !Number.isFinite(enter) || (first && enter >= first.t)) continue;
    first = { wall: f, t: enter };
  }
  if (!first) return end;
  const { wall: f, t } = first, dot = (q.dx || 0) * f.nx + (q.dy || 0) * f.ny;
  q.dx = (q.dx || 0) - 2 * dot * f.nx; q.dy = (q.dy || 0) - 2 * dot * f.ny;
  Object.assign(q, { hostile: true, reflectedBy: f.id, damage: Math.max(1, Math.round((Number(q.damage) || 1) * CRYSTAL.reflectShare)), pierce: 0, path: q.path === "grenade" ? "straight" : q.path });
  return { x: q.x + dx * t + q.dx * step * (1 - t), y: q.y + dy * t + q.dy * step * (1 - t) };
}
// Compatibility point check for callers with stationary shots. Moving shots use reflectShotStep in updateProjectiles.
export function reflectShots(shots, effects) {
  let n = 0;
  for (const q of shots || []) { const hostile = q.hostile; reflectShotStep(q, effects); if (!hostile && q.hostile) n++; }
  return n;
}
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

// All numbers below are implementation choices, not extra owner requirements. The effect budget is shared with
// every other pack creature. Wraiths are transient effects, never summoned actors or reward-bearing enemies.
export const VOID = {
  rendWarn: .48, rendStagger: .16, rendLife: .3, handRadius: 1.05, clawLength: 2.7, clawWidth: .65,
  swordLength: 3.5, swordWidth: .3, slashSpeed: 6.5, slashLife: 1.5, slashRadius: .4, spikeRadius: .8,
  riftLife: 7, riftRadius: .65, riftCount: 3, riftRing: 3.3, riftMax: 9, riftEmitEvery: 2.1,
  evadeEvery: 2.3, evadeWarn: .23, evadeThreat: 3.2, teleportFlash: .25,
  wraithLife: 1.7, wraithSpeed: 3.4, wraithSlashes: 3, wraithEvery: .45, wraithReach: 1.15,
  constellationMin: 3, constellationMax: 6, constellationRing: 3.4, constellationWarn: 1.1, constellationBatch: .65, constellationLock: .35,
  beamWarn: .35, beamLife: .3, beamLength: 10, beamWidth: .32,
  horizonLife: 4.6, horizonWarn: .65, horizonRadius: 4.3, horizonCore: 1.1, horizonPull: 2.2, horizonTick: .5,
  pulsarFirst: .6, pulsarEvery: 1.1, pulsarMin: 2, pulsarMax: 3,
  novaRadius: 7, novaCharge: 2.3, novaLife: 7.5, novaPull: 1.8, novaLocalEvery: .55, novaAfterEvery: .55,
  novaEruptionWarn: .65, novaEruptionRadius: 1.05, novaWaveMin: 2, novaWaveMax: 3,
  novaWaveEvery: .65, novaParticles: 16, novaParticleSpeed: 10, novaParticleLife: 1.1, novaParticleRadius: .35,
  dashCount: 6, dashRing: 3.6, dashWarn: .28, dashTime: .4, dashSpeed: 18, dashRest: .45, dashRadius: .48,
  trailEvery: .1, trailLife: 1, trailRadius: .38, trailDamage: .75,
  roamSight: 7, effectStep: .2,
};
const voidEffects = (w) => typeof w.effects === "function" ? w.effects() : (w.effects || []);
const liveVoidOwner = (w, f) => w.enemies?.find((q) => q.id === f.owner && !q.dead && !q.retreating && !q.fleeTo);
function voidAdd(w, e, effect) {
  // Do not evict another creature's warned strike to create a decoration or a new Walker hazard.
  const effects = voidEffects(w);
  if (effects.length >= PACK_EFFECT_CAP) { const spent = effects.findIndex((f) => f.kind === "debris" && f.medium === "water" && f.state === "splash"); if (spent >= 0) effects.splice(spent, 1); else return null; }
  const f = { owner: e.id, arming: 0, damage: 0, life: VOID.rendLife, ...effect };
  w.addEffect(f);
  return effects[effects.length - 1] || null;
}
function voidClear(e, w) {
  const fx = voidEffects(w); for (let i = fx.length - 1; i >= 0; i--) if (fx[i].owner === e.id && fx[i].kind.startsWith("void")) fx.splice(i, 1);
  e.voidDashing = false; e.voidCharging = false; e.voidTeleport = 0;
}
function voidTeleport(e, w, at) {
  if (!at || !w.safeTeleport?.(e, at.x, at.y)) return false;
  e.voidTeleport = VOID.teleportFlash; return true;
}
const voidOpen = (w, x, y) => w.marineOpen ? w.marineOpen(x, y) : w.open(x, y);
function voidSpot(w, at, angle, radius) { return nearestOpen(w, at.x + Math.cos(angle) * radius, at.y + Math.sin(angle) * radius, 1, w.marineOpen || w.open); }
function voidRay(w, from, dir, max) {
  const open = w.marineProjectileOpen || w.projectileOpen || w.tileOpen;
  if (!open) return max;
  for (let i = 1; i <= Math.ceil(max / VOID.effectStep); i++) { const t = Math.min(max, i * VOID.effectStep); if (!open(from.x + .5 + dir.x * t, from.y + .5 + dir.y * t)) return Math.max(0, (i - 1) * VOID.effectStep); }
  return max;
}
function voidHurt(w, e, amount, source, jumpable = false) { if (amount > 0) w.hurt(e, amount, { jumpable, source, beam: true }); }
function voidRend(e, w, variant, at, aim, delay = VOID.rendWarn, damage = damageOf(e, "voidHand")) {
  return voidAdd(w, e, { kind: "voidRend", variant, x: at.x, y: at.y, angle: Math.atan2(aim.y, aim.x),
    radius: variant === "hand" ? VOID.handRadius : variant === "spike" ? VOID.spikeRadius : VOID.slashRadius,
    length: variant === "sword" ? VOID.swordLength : VOID.clawLength, width: variant === "sword" ? VOID.swordWidth : VOID.clawWidth,
    vx: aim.x * VOID.slashSpeed, vy: aim.y * VOID.slashSpeed, arming: delay, life: variant === "slash" ? VOID.slashLife : VOID.rendLife, damage });
}
function voidWraith(e, w, at, target, delay = VOID.rendWarn, damage = damageOf(e, "voidWraiths")) {
  const aim = unit(target.x - at.x, target.y - at.y);
  return voidAdd(w, e, { kind: "voidWraith", x: at.x, y: at.y, angle: Math.atan2(aim.y, aim.x), vx: aim.x * VOID.wraithSpeed, vy: aim.y * VOID.wraithSpeed,
    radius: VOID.wraithReach, arming: delay, life: VOID.wraithLife, slashes: 0, nextSlash: VOID.wraithEvery, slashFlash: 0, damage });
}
function voidBeam(e, w, at, angle, damage, delay = VOID.beamWarn) {
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };
  return voidAdd(w, e, { kind: "voidBeam", x: at.x, y: at.y, angle, length: voidRay(w, at, dir, VOID.beamLength), width: VOID.beamWidth, radius: VOID.beamWidth, arming: delay, life: VOID.beamLife, damage });
}
function voidBasicStart(e, s, w, variant) {
  const p = s.data.target, turn = hashSeed(`${e.id}:${s.seq}:rends`) % 628 / 100;
  const count = variant === "spike" ? 4 : 2;
  for (let i = 0; i < count; i++) {
    const a = turn + i * Math.PI, at = variant === "hand" || variant === "spike" ? { x: p.x + (i ? Math.cos(a) * 1.6 : 0), y: p.y + (i ? Math.sin(a) * 1.6 : 0) } : { x: p.x + Math.cos(a) * 2.4, y: p.y + Math.sin(a) * 2.4 };
    voidRend(e, w, variant, at, unit(p.x - at.x, p.y - at.y), VOID.rendWarn + i * VOID.rendStagger, damageOf(e, s.attack));
  }
  s.tele = { type: "brace", void: true };
}
function voidSimpleRun(e, s) { if (s.phase === "windup" && s.t <= 0) { s.tele = null; toPhase(s, "recover", ATTACK_MODULES[s.attack].recover); } }
function voidOpenRifts(e, s, w, tracking) {
  const count = tracking ? VOID.constellationMin + hashSeed(`${e.id}:${s.seq}:constellation`) % (VOID.constellationMax - VOID.constellationMin + 1) : VOID.riftCount;
  const turn = hashSeed(`${e.id}:${s.seq}:rift-turn`) % 628 / 100, p = center(w.player);
  let live = voidEffects(w).filter((f) => f.owner === e.id && f.kind === "voidRift" && f.life > 0).length;
  for (let i = 0; i < count && live < VOID.riftMax; i++) {
    const a = turn + i * TAU / count, radius = tracking ? VOID.constellationRing : VOID.riftRing;
    const at = voidSpot(w, p, a, radius); if (!at) continue;
    const output = ["wraith", "beam", "walker"][i % 3];
    if (voidAdd(w, e, { kind: "voidRift", x: at.x, y: at.y, radius: VOID.riftRadius, life: tracking ? 3.4 : VOID.riftLife,
      arming: .25, tracking, offsetX: at.x - p.x, offsetY: at.y - p.y, activationAt: VOID.constellationWarn + Math.floor(i / 3) * VOID.constellationBatch,
      output, activated: false, angle: Math.atan2(p.y - at.y, p.x - at.x), nextEmit: VOID.riftEmitEvery, emits: 0, damage: damageOf(e, s.attack) })) live++;
  }
}
function voidEvade(e, s, w, p, d) {
  if (s.voidEvade) {
    const ev = s.voidEvade; ev.left -= w.dt;
    if (ev.left <= 0) { voidTeleport(e, w, ev.to); s.voidEvade = null; s.tele = null; }
    return true;
  }
  if (s.attack || (s.cd.voidEvade || 0) > 0) return false;
  const threat = (w.playerSwinging && d < 2.8) || (w.playerShots || []).some((q) => {
    const dx = e.x + .5 - q.x, dy = e.y + .45 - q.y, u = unit(q.dx || 0, q.dy || 0);
    return Math.hypot(dx, dy) < VOID.evadeThreat && dx * u.x + dy * u.y > 0 && Math.abs(dx * u.y - dy * u.x) < .9;
  }) || (w.playerBlasts || []).some((q) => Math.hypot(e.x + .5 - q.x, e.y + .45 - q.y) < (q.radius || 1) + .5);
  if (!threat) return false;
  const rifts = voidEffects(w).filter((f) => f.kind === "voidRift" && f.owner === e.id && !f.tracking && f.life > VOID.evadeWarn && voidOpen(w, f.x, f.y) && distance(f, e) > 1);
  let at = rifts.sort((a, b) => distance(b, p) - distance(a, p))[0];
  if (!at) {
    at = voidSpot(w, p, Math.atan2(e.y - p.y, e.x - p.x) + s.orbitDir * .9, VOID.riftRing);
    if (at && !voidAdd(w, e, { kind: "voidRift", x: at.x, y: at.y, radius: VOID.riftRadius, arming: VOID.evadeWarn, life: VOID.riftLife, tracking: false, nextEmit: VOID.riftEmitEvery, emits: 0, damage: damageOf(e, "voidRifts") })) at = null;
  }
  s.cd.voidEvade = VOID.evadeEvery;
  if (!at) return false;
  s.voidEvade = { left: VOID.evadeWarn, to: { x: at.x, y: at.y } }; s.tele = { type: "blink", x: at.x, y: at.y, void: true };
  return true;
}
function voidStartDash(e, s, w) {
  const p = center(w.player), a = hashSeed(`${e.id}:${s.seq}:dash:${s.data.dashes}`) % 628 / 100;
  s.data.dashes++;
  let teleported = false;
  for (let i = 0; i < 8 && !teleported; i++) { const at = voidSpot(w, p, a + i * TAU / 8, VOID.dashRing); if (at) teleported = voidTeleport(e, w, at); }
  // A blocked teleport consumes this attempt instead of jumping into unsafe geometry or stalling the attack.
  if (!teleported) { s.data.dash = { stage: "rest", left: VOID.dashRest }; s.tele = null; return; }
  const dir = unit(p.x - e.x, p.y - e.y);
  s.data.dash = { stage: "warn", left: VOID.dashWarn, dir, target: { ...p }, trail: { x: e.x, y: e.y }, trailT: 0, hit: false };
  s.tele = { type: "lane", aim: dir, length: VOID.dashSpeed * VOID.dashTime, width: VOID.dashRadius, void: true };
}
function voidDashStep(e, s, w) {
  if (!s.data.dash) { if (s.data.dashes < VOID.dashCount) voidStartDash(e, s, w); return; }
  const dash = s.data.dash; dash.left -= w.dt;
  if (dash.stage === "warn") { if (dash.left <= 0) { dash.stage = "run"; dash.left = VOID.dashTime; s.tele = null; e.voidDashing = true; } return; }
  if (dash.stage === "rest") { if (dash.left <= 0) s.data.dash = null; return; }
  const from = { x: e.x, y: e.y }, travel = VOID.dashSpeed * Math.min(w.dt, Math.max(0, dash.left + w.dt)), steps = Math.ceil(travel / VOID.effectStep);
  for (let i = 0; i < steps; i++) {
    const step = Math.min(VOID.effectStep, travel - i * VOID.effectStep), nx = e.x + dash.dir.x * step, ny = e.y + dash.dir.y * step;
    if (!voidOpen(w, nx, ny)) { dash.left = 0; break; }
    const ox = e.x, oy = e.y;
    if (!w.move(e, dash.dir.x * step, dash.dir.y * step) || Math.abs(e.x - nx) + Math.abs(e.y - ny) > .001) { e.x = ox; e.y = oy; dash.left = 0; break; }
  }
  if (!dash.hit && segmentDistance(w.player, from, e) <= VOID.dashRadius + .3) { dash.hit = true; voidHurt(w, e, damageOf(e, "voidSupernova"), "voidDash"); }
  if (w.bystander && !dash.bystanderHit && segmentDistance(center(w.bystander.actor), from, e) <= VOID.dashRadius + .3) { dash.bystanderHit = true; w.bystander.hurt(e, damageOf(e, "voidSupernova"), { source: "voidDash", beam: true }); }
  dash.trailT += w.dt;
  if (dash.trailT >= VOID.trailEvery || dash.left <= 0) {
    if (distance(dash.trail, e) > .01) voidAdd(w, e, { kind: "voidAfterimage", x: dash.trail.x, y: dash.trail.y, tx: e.x, ty: e.y, radius: VOID.trailRadius,
      life: VOID.trailLife, total: VOID.trailLife, damage: Math.max(1, Math.round(damageOf(e, "voidSupernova") * VOID.trailDamage)) });
    dash.trail = { x: e.x, y: e.y }; dash.trailT = 0;
  }
  if (dash.left <= 0) { dash.stage = "rest"; dash.left = VOID.dashRest; e.voidDashing = false; }
}
function voidNovaRun(e, s, w) {
  if (s.phase === "windup") {
    if (s.t > 0) return;
    const at = { x: e.x, y: e.y }, waves = VOID.novaWaveMin + hashSeed(`${e.id}:${s.seq}:nova-waves`) % (VOID.novaWaveMax - VOID.novaWaveMin + 1);
    const nova = voidAdd(w, e, { kind: "voidNova", ...at, radius: VOID.novaRadius, stage: "charge", life: VOID.novaLife, total: VOID.novaLife,
      elapsed: 0, nextLocal: .25, nextAfter: VOID.novaCharge, waves, wavesFired: 0, nextWave: VOID.novaCharge, eruptions: 0, seed: s.seq, damage: damageOf(e, "voidSupernova") });
    if (!nova) { e.voidCharging = false; s.tele = null; toPhase(s, "recover", ATTACK_MODULES.voidSupernova.recover); return; }
    // The Game owns permanent scars and save writes (physical destruction is separate from quest state); this module only asks once on activation.
    s.data.terrainResult = w.consumeVoidTerrain?.(e, at, VOID.novaRadius);
    s.data.dashes = 0; s.tele = null; toPhase(s, "active", ATTACK_MODULES.voidSupernova.active); return;
  }
  if (s.phase !== "active") return;
  e.voidCharging = s.t > ATTACK_MODULES.voidSupernova.active - VOID.novaCharge;
  voidDashStep(e, s, w);
  if (s.t <= 0) { e.voidCharging = false; e.voidDashing = false; s.tele = null; toPhase(s, "recover", ATTACK_MODULES.voidSupernova.recover); }
}

function beginAttack(e, s, id, w) {
  const attack = ATTACK_MODULES[id];
  s.attack = id; s.phase = "windup"; s.t = (attack.windup || .5) * (s.paced ? BOSS_PACE.windup : 1); s.seq++; s.data = {}; s.hitOnce = false; // release 421
  s.cd[id] = attack.cooldown * cooldownScale(e);
  const p = center(w.player);
  s.data.aim = unit(p.x - e.x, p.y - e.y);
  s.data.target = { ...p };
  START[id]?.(e, s, w, attack);
}
function endAttack(e, s) {
  const attack = ATTACK_MODULES[s.attack];
  s.state = "move"; s.attack = null; s.phase = null; s.tele = null; s.data = null;
  s.gap = (e.attackGap ?? (attack?.recover || .6) * .6 + .45) * (s.paced ? BOSS_PACE.gap : 1); // the Questing Beast barely pauses (release 187); 421: bosses pause longer
  e.voidDashing = false; e.voidCharging = false;
  e.untargetable = false; e.hidden = false; e.aloft = false; e.iceShield = false; e.spinning = false; e.sliding = false; e.mist = false; e.thrusting = null; e.swing = null; e.giantPose = null; e.giantAir = 0; e.giantThrust = false;
}
function toPhase(s, phase, seconds) { s.phase = phase; s.t = seconds; }

// Each runner advances its attack; it reads/writes s.data and s.tele (the renderer draws s.tele).
const START = {
  giantArcs(e, s) { s.tele = { type: "ring", radius: GIANT.arcRange }; e.giantPose = "arcs"; }, // release 397: the arcs' reach, shown while it crackles
  giantShock(e, s) { const p = s.data.target; s.tele = { type: "circle", x: p.x, y: p.y, radius: GIANT.shockRadius }; e.giantPose = "point"; },
  giantSwing(e, s) { s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + GIANT.swingReach, arc: GIANT.swingArc }; e.giantPose = "swingReady"; },
  giantSlam(e, s) { const f = giantSlamPoint(e, s.data.aim); s.tele = { type: "circle", x: f.x, y: f.y, radius: GIANT.slamRadius }; e.giantPose = "slamRaise"; },
  giantElectrify(e, s) { s.tele = { type: "brace" }; e.giantPose = "raise"; },
  giantMenace(e, s) { s.tele = { type: "brace" }; e.giantPose = "menace"; },
  giantUpswing(e, s) { s.tele = { type: "brace" }; e.giantPose = "chargeLow"; },
  voidHand(e, s, w) { voidBasicStart(e, s, w, "hand"); },
  voidClaw(e, s, w) { voidBasicStart(e, s, w, "claw"); },
  voidSword(e, s, w) { voidBasicStart(e, s, w, "sword"); },
  voidSlash(e, s, w) { voidBasicStart(e, s, w, "slash"); },
  voidSpikes(e, s, w) { voidBasicStart(e, s, w, "spike"); },
  voidWraiths(e, s, w) {
    const p = s.data.target, a = hashSeed(`${e.id}:${s.seq}:wraiths`) % 628 / 100;
    for (let i = 0; i < 2; i++) { const at = voidSpot(w, p, a + i * Math.PI, VOID.riftRing); if (at) voidWraith(e, w, at, p); }
    s.tele = { type: "brace", void: true };
  },
  voidRifts(e, s) { s.tele = { type: "shimmer", void: true }; },
  voidConstellation(e, s) { s.tele = { type: "shimmer", void: true }; },
  voidHorizons(e, s) { s.tele = { type: "brace", void: true }; },
  voidSupernova(e, s) { e.voidCharging = true; s.tele = { type: "circle", x: e.x, y: e.y, radius: VOID.novaRadius, void: true }; },
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
  knightSlide(e, s) { s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + KNIGHT.slideReach, arc: KNIGHT.slideArc }; s.data.cut = 0; s.data.sub = 0; s.data.mode = "slide"; },
  knightCannon(e, s, w) { s.data.angle = Math.atan2(s.data.aim.y, s.data.aim.x); s.tele = { type: "beam", angle: s.data.angle, length: rayLength(w, e, s.data.aim, KNIGHT.cannonLength), charging: true, laser: true }; },
  knightSwordfall(e, s) { s.tele = { type: "brace" }; },
  psyOrbital(e, s) { s.tele = { type: "brace" }; },
  knightOrbs(e, s) { s.tele = { type: "shimmer" }; s.data.allAtOnce = hashSeed(`${e.id}:${s.seq}:orbs`) % 2 === 0; s.data.next = 0; },
  knightMissiles(e, s) { s.tele = { type: "brace" }; },
  knightMist(e, s) { s.tele = { type: "shimmer" }; },
  knightThrust(e, s, w) { // along one of the eight ways: straight at you (snapped), or off at an angle to cut across
    const a = Math.round(Math.atan2(s.data.aim.y, s.data.aim.x) / (Math.PI / 4)), roll = hashSeed(`${e.id}:${s.seq}:thrust`) % 10, i = ((a + (roll < 6 ? 0 : roll < 8 ? 1 : -1)) % 8 + 8) % 8;
    s.data.dir = EIGHT[i]; s.data.beam = hashSeed(`${e.id}:${s.seq}:beam`) % 100 < KNIGHT.beamChance;
    const len = Math.min(rayLength(w, e, s.data.dir, KNIGHT.thrustSpeed * ATTACK_MODULES.knightThrust.active), KNIGHT.thrustSpeed * ATTACK_MODULES.knightThrust.active);
    s.tele = { type: "lane", aim: s.data.dir, length: len + bodyRadius(e) + KNIGHT.thrustReach + (s.data.beam ? KNIGHT.thrustBeam : 0), width: .45 };
  },
  knightCombo(e, s) {
    const table = e.hp <= e.maxHp * PACK_BOSS_TEMPLATE.enrage ? KNIGHT.comboLengthsEnraged : KNIGHT.comboLengths, roll = hashSeed(`${e.id}:${s.seq}:combo`) % 100;
    let acc = 0, cuts = table[table.length - 1][0]; for (const [n, wgt] of table) { acc += wgt; if (roll < acc) { cuts = n; break; } }
    s.data.plan = KNIGHT.comboPlan.slice(0, cuts / 2 * 3 - 1); // 2 cuts; 2, dash, 2; or the full six
    s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + KNIGHT.slideReach, arc: KNIGHT.comboArc }; s.data.step = 0; s.data.cuts = 0; s.data.sub = 0;
  },
  knightBackslash(e, s) { s.tele = null; s.data.cut = false; },
  psyPush(e, s) { s.tele = { type: "ring", radius: CRYSTAL.pushRadius }; },
  psyPull(e, s) { s.tele = { type: "ring", radius: CRYSTAL.pullRadius, inhale: true }; },
  psyGrab(e, s, w) { s.tele = { type: "tether", x: w.player.x, y: w.player.y }; },
  psyDebris(e, s) { s.tele = { type: "brace" }; s.data.next = 0; },
  psyWall(e, s) { s.tele = { type: "shimmer" }; },
  turtleStomp(e, s) { s.tele = { type: "ring", radius: bodyRadius(e) + TURTLE.stompRadius }; },
  turtleDash(e, s, w) { const len = Math.min(11, TURTLE.dashSpeed * ATTACK_MODULES.turtleDash.active); s.data.ice = hashSeed(`${e.id}:${s.seq}:dash`) % 2 === 1; s.tele = { type: "lane", aim: s.data.aim, length: len, width: bodyRadius(e) * 1.2 }; s.data.next = 0; },
  turtleSpin(e, s) { s.tele = { type: "brace" }; s.data.next = 0; s.data.flung = 0; },
  turtleCyclone(e, s) { s.tele = { type: "brace" }; s.data.next = 0; s.data.volley = 0; s.data.dir = { ...s.data.aim }; s.data.hitCd = 0; },
  turtleComet(e, s) { s.tele = { type: "circle", x: s.data.target.x, y: s.data.target.y, radius: TURTLE.cometBlast, total: ATTACK_MODULES.turtleComet.windup + 1.2 }; },
  turtleShield(e, s) { s.tele = { type: "shimmer" }; },
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

// One lightning hit: damage, then (if it landed) a pip on the Wayfarer's shock counter.
function giantZap(w, owner, damage, source, opts = {}) { const landed = w.hurt(owner || null, damage, { jumpable: false, source, ...opts }); if (landed) w.shockHit?.(); return landed; }
function giantSlamPoint(e, aim) { const r = bodyRadius(e) + GIANT.slamReach; return { x: e.x + aim.x * r, y: e.y + aim.y * r }; }
// One burst dash toward the Wayfarer (shared by traversal and charge plans). d: { left, hop, dir }. Returns true while it runs.
function giantDashStep(e, w, d, p) {
  const reach = bodyRadius(e) + GIANT.upswingReach * .8, dist = distance(p, e);
  if (!d.dir) d.dir = unit(p.x - e.x, p.y - e.y);
  const step = Math.min(GIANT.dashSpeed * w.dt, Math.max(0, dist - reach));
  if (step > 0 && !w.move(e, d.dir.x * step, d.dir.y * step)) w.detour?.(e, step);
  e.facingX = d.dir.x >= 0 ? 1 : -1; e.giantThrust = true;
  d.left -= w.dt; const k = 1 - Math.max(0, d.left) / GIANT.dashTime;
  e.giantAir = d.hop ? Math.sin(Math.PI * Math.min(1, k)) * GIANT.hopHeight : 0;
  if (d.left > 0 && dist - step > reach) return true;
  e.giantAir = 0; e.giantThrust = false; return false;
}
// Traversal: out of reach and between attacks, it closes the gap in up to GIANT.dashMax shoulder-thruster bursts.
function giantTraverse(e, s, w) {
  const p = center(w.player), dist = distance(p, e);
  e.giantDashCd = Math.max(0, (Number(e.giantDashCd) || 0) - w.dt);
  let d = e.giantDash;
  if (!d) {
    if (s.attack || e.retreating || e.fleeTo || e.giantDashCd > 0 || dist <= GIANT.dashRange || !w.los(e, w.player)) return false;
    const n = (Number(e.giantDashes) || 0) + 1; e.giantDashes = n;
    const roll = (key) => (hashSeed(`${e.id}:giant-dash:${n}:${key}`) % 1000) / 1000;
    d = e.giantDash = { count: roll("count") < .5 ? 1 : GIANT.dashMax, gap: GIANT.dashGap, left: GIANT.dashTime, hop: roll("hop0") < GIANT.hopChance, i: 0, seed: n };
  }
  if (d.gap > 0) { d.gap -= w.dt; e.giantThrust = true; return true; } // the thrusters flare before it lunges
  if (giantDashStep(e, w, d, p)) return true;
  d.i++;
  if (d.i < d.count && distance(p, e) > bodyRadius(e) + GIANT.upswingReach) { Object.assign(d, { gap: GIANT.dashGap, left: GIANT.dashTime, dir: null, hop: (hashSeed(`${e.id}:giant-dash:${d.seed}:hop${d.i}`) % 1000) / 1000 < GIANT.hopChance }); return true; }
  e.giantDash = null; e.giantDashCd = GIANT.dashCooldown; e.giantThrust = false; e.giantAir = 0; return false;
}
// Electrified (giantElectrify): a timed state ticked every frame, even mid-attack; bolts drop around the Giant.
function giantPassive(e, w) {
  if (!(e.giantCharged > 0)) return;
  e.giantCharged = Math.max(0, e.giantCharged - w.dt); e.giantStormClock = (Number(e.giantStormClock) || 0) - w.dt;
  while (e.giantStormClock <= 0 && e.giantCharged > 0) {
    e.giantStormClock += GIANT.stormEvery; e.giantStorms = (Number(e.giantStorms) || 0) + 1;
    const h = hashSeed(`${e.id}:giant-storm:${e.giantStorms}`), a = (h % 628) / 100, r = GIANT.stormRing[0] + (GIANT.stormRing[1] - GIANT.stormRing[0]) * ((h >>> 10) % 100) / 100;
    w.addEffect({ kind: "giantSky", owner: e.id, x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r, radius: GIANT.stormRadius, arming: GIANT.stormWarn, armTotal: GIANT.stormWarn, life: GIANT.stormLife, total: GIANT.stormLife, damage: damageOf(e, "giantElectrify"), storm: true });
  }
}
function resolveMelee(e, s, w, attackId, test) {
  const p = center(w.player);
  if (test(p) && w.los(e, w.player) && w.hurt(e, damageOf(e, attackId), { jumpable: false, source: attackId }) && e.kind === "lightningGiant" && e.giantCharged > 0) w.shockHit?.();
}

const RUN = {
  giantArcs(e, s, w) {
    const attack = ATTACK_MODULES.giantArcs;
    if (s.phase === "windup") { if (s.t <= 0) { w.addEffect({ kind: "giantArc", owner: e.id, x: e.x, y: e.y, scale: e.scale, range: GIANT.arcRange, tick: 0, seed: s.seq, life: attack.active, total: attack.active, damage: damageOf(e, "giantArcs") }); s.tele = null; toPhase(s, "active", attack.active); } return; }
    if (s.phase === "active" && s.t <= 0) toPhase(s, "recover", attack.recover);
  },
  giantShock(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const p = s.data.target;
    w.addEffect({ kind: "giantShock", owner: e.id, x: p.x, y: p.y, radius: GIANT.shockRadius, arming: 0, life: .5, total: .5, damage: damageOf(e, "giantShock") });
    s.tele = null; e.giantPose = "pointFire"; toPhase(s, "recover", ATTACK_MODULES.giantShock.recover);
  },
  giantSwing(e, s, w) {
    const attack = ATTACK_MODULES.giantSwing, reach = bodyRadius(e) + GIANT.swingReach;
    if (s.phase === "windup") { if (s.t <= 0) { toPhase(s, "active", attack.active); s.data.cut = 0; } return; }
    if (s.phase !== "active") return;
    if (s.data.cut === 0) { e.giantPose = "swingFore"; resolveMelee(e, s, w, "giantSwing", (p) => inArc(e, p, s.data.aim, reach, GIANT.swingArc)); s.data.cut = 1; }
    else if (s.data.cut === 1 && s.t <= attack.active / 2) {
      // The back-swing re-aims at you.
      const p = center(w.player); s.data.aim = unit(p.x - e.x, p.y - e.y); s.tele = { type: "arc", aim: s.data.aim, radius: reach, arc: GIANT.swingArc };
      e.giantPose = "swingBack"; resolveMelee(e, s, w, "giantSwing", (q) => inArc(e, q, s.data.aim, reach, GIANT.swingArc)); s.data.cut = 2;
    }
    if (s.t <= 0) { s.tele = null; toPhase(s, "recover", attack.recover); }
  },
  giantSlam(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const f = giantSlamPoint(e, s.data.aim), p = center(w.player), dmg = damageOf(e, "giantSlam");
    e.giantPose = "slamDown"; s.tele = null;
    resolveMelee(e, s, w, "giantSlam", (q) => distance(q, f) <= GIANT.slamRadius);
    w.addEffect({ kind: "shock", lightning: true, owner: e.id, x: f.x, y: f.y, radius: GIANT.slamRing, life: .6, total: .6, damage: Math.ceil(dmg * GIANT.slamRingShare) });
    const roll = (key) => (hashSeed(`${e.id}:${s.seq}:slam:${key}`) % 1000) / 1000;
    // Sometimes the sky answers where you stood (a delayed blast); sometimes three bolts leave the club straight at you,
    // in a tight cone toward you whichever way it faces. Either, both, or neither.
    if (roll("sky") < GIANT.skyChance) w.addEffect({ kind: "giantSky", owner: e.id, x: p.x, y: p.y, radius: GIANT.skyRadius, arming: GIANT.skyWarn, armTotal: GIANT.skyWarn, life: GIANT.skyLife, total: GIANT.skyLife, damage: dmg });
    if (roll("cone") < GIANT.coneChance) {
      const a0 = Math.atan2(p.y - f.y, p.x - f.x), spread = GIANT.coneSpread * Math.PI / 180;
      for (let i = 0; i < GIANT.coneBolts; i++) { const a = a0 + (GIANT.coneBolts > 1 ? (i / (GIANT.coneBolts - 1) - .5) * spread : 0);
        w.addEffect({ kind: "giantBolt", owner: e.id, x: f.x, y: f.y, vx: Math.cos(a) * GIANT.boltSpeed, vy: Math.sin(a) * GIANT.boltSpeed, radius: GIANT.boltRadius, arming: GIANT.boltWarn, armTotal: GIANT.boltWarn, life: GIANT.boltLife, damage: Math.ceil(dmg * .6) }); } // release 397: each bolt shows its lane before it flies
    }
    toPhase(s, "recover", ATTACK_MODULES.giantSlam.recover);
  },
  giantMenace(e, s, w) {
    const attack = ATTACK_MODULES.giantMenace, d = s.data, p = center(w.player), dist = distance(p, e);
    const roll = (key) => (hashSeed(`${e.id}:${s.seq}:menace:${key}`) % 1000) / 1000;
    // One honest beam: aim at you (a later shot turns toward you by at most honestTrack°), offset to its side of the cone.
    const honestAim = () => {
      const want = Math.atan2(p.y - e.y, p.x - e.x), turn = GIANT.honestTrack * Math.PI / 180;
      d.base = d.base == null ? want : d.base + Math.max(-turn, Math.min(turn, Math.atan2(Math.sin(want - d.base), Math.cos(want - d.base))));
      const side = GIANT.honestShots > 1 ? d.shot / (GIANT.honestShots - 1) - .5 : 0, a = d.base + side * GIANT.honestCone * Math.PI / 180;
      d.aim = { x: Math.cos(a), y: Math.sin(a) }; d.wait = d.shot ? GIANT.honestStagger : GIANT.honestWindup;
      s.tele = { type: "beam", angle: a, length: rayLength(w, e, d.aim, GIANT.honestRange), charging: true }; e.giantPose = "chest"; e.facingX = d.aim.x >= 0 ? 1 : -1;
    };
    const nextStrike = () => { d.mode = "stalk"; d.hold = GIANT.menaceHold; d.action = roll(`act${d.strikes}`) < GIANT.chestChance ? "bolt" : "slam"; e.giantPose = "menace"; s.tele = null; };
    if (s.phase === "windup") { if (s.t <= 0) { d.strikes = 0; nextStrike(); toPhase(s, "active", attack.active); } return; }
    if (s.phase !== "active") return;
    if (d.mode === "beat") { d.wait -= w.dt; if (d.wait <= 0) nextStrike(); return; }
    if (d.mode === "stalk") {
      d.hold -= w.dt;
      // It reads the distance: it only commits when the swing (or the bolt) would actually reach you.
      const reach = d.action === "slam" ? bodyRadius(e) + GIANT.slamReach + GIANT.menaceReach : GIANT.chestRange;
      if (dist <= reach && w.los(e, w.player)) {
        d.aim = unit(p.x - e.x, p.y - e.y);
        if (d.action === "slam") { d.mode = "strike"; d.wait = GIANT.menaceWindup; const f = giantSlamPoint(e, d.aim); s.tele = { type: "circle", x: f.x, y: f.y, radius: GIANT.slamRadius }; e.giantPose = "slamRaise"; }
        else { d.mode = "bolt"; d.wait = GIANT.chestWindup; s.tele = { type: "beam", angle: Math.atan2(d.aim.y, d.aim.x), length: rayLength(w, e, d.aim, GIANT.chestRange), charging: true }; e.giantPose = "chest"; }
        return;
      }
      if (d.hold <= 0) { d.mode = "honest"; d.shot = 0; d.base = null; honestAim(); return; } // no opening: two chest beams, then it lowers the club
      const to = unit(p.x - e.x, p.y - e.y), step = GIANT.menaceSpeed * (e.giantCharged > 0 ? GIANT.chargeSpeed : 1) * w.dt;
      if (dist > bodyRadius(e) + .6 && !w.move(e, to.x * step, to.y * step)) w.detour?.(e, step);
      e.facingX = p.x >= e.x ? 1 : -1; return;
    }
    d.wait -= w.dt; if (d.wait > 0) return;
    if (d.mode === "honest") {
      const len = rayLength(w, e, d.aim, GIANT.honestRange), end = { x: e.x + d.aim.x * len, y: e.y + d.aim.y * len };
      w.addEffect({ kind: "giantChest", owner: e.id, x: e.x, y: e.y, tx: end.x, ty: end.y, scale: e.scale, radius: 0, arming: 0, life: .26, total: .26, damage: 0, honest: true });
      if (segmentDistance(p, e, end) <= GIANT.chestWidth + .3) giantZap(w, e, Math.ceil(damageOf(e, "giantMenace") * GIANT.honestShare), "giantChest", { beam: true });
      if (++d.shot < GIANT.honestShots) { honestAim(); return; }
      e.giantPose = null; s.tele = null; toPhase(s, "recover", attack.recover); return;
    }
    if (d.mode === "strike") {
      const f = giantSlamPoint(e, d.aim), dmg = damageOf(e, "giantMenace"); e.giantPose = "slamDown";
      resolveMelee(e, s, w, "giantMenace", (q) => distance(q, f) <= GIANT.slamRadius);
      w.addEffect({ kind: "shock", lightning: true, owner: e.id, x: f.x, y: f.y, radius: GIANT.slamRing, life: .6, total: .6, damage: Math.ceil(dmg * GIANT.slamRingShare) });
    } else {
      const len = rayLength(w, e, d.aim, GIANT.chestRange), end = { x: e.x + d.aim.x * len, y: e.y + d.aim.y * len };
      w.addEffect({ kind: "giantChest", owner: e.id, x: e.x, y: e.y, tx: end.x, ty: end.y, scale: e.scale, radius: 0, arming: 0, life: .3, total: .3, damage: 0 });
      if (segmentDistance(p, e, end) <= GIANT.chestWidth + .3) giantZap(w, e, damageOf(e, "giantMenace"), "giantChest", { beam: true });
    }
    s.tele = null; d.strikes++;
    if (d.strikes >= GIANT.menaceStrikes) { toPhase(s, "recover", attack.recover); return; }
    d.mode = "beat"; d.wait = GIANT.menaceBeat;
  },
  giantUpswing(e, s, w) {
    const attack = ATTACK_MODULES.giantUpswing, d = s.data, p = center(w.player), dist = distance(p, e);
    const roll = (key) => (hashSeed(`${e.id}:${s.seq}:upswing:${key}`) % 1000) / 1000;
    // A charge plan strings burst dashes and upswings: dash+swing, dash+dash, dash+swing+dash+swing, or dash+dash+swing.
    const nextStep = () => {
      const step = d.plan[d.step++];
      if (step === "dash") { d.mode = "dash"; d.dash = { left: GIANT.dashTime, hop: roll(`hop${d.step}`) < GIANT.hopChance }; d.left = GIANT.dashGap; e.giantPose = "chargeLow"; return true; }
      // Still out of reach when a swing is due: one extra burst to close the gap first (once per swing).
      if (step === "swing" && !d.extra && distance(p, e) > bodyRadius(e) + GIANT.upswingReach) { d.extra = true; d.step--; d.mode = "dash"; d.dash = { left: GIANT.dashTime, hop: false }; d.left = GIANT.dashGap; e.giantPose = "chargeLow"; return true; }
      if (step === "swing") { d.extra = false; d.aim = unit(p.x - e.x, p.y - e.y); d.mode = "upswing"; d.left = GIANT.upswingTime; e.giantPose = "upswing"; e.giantThrust = false;
        resolveMelee(e, s, w, "giantUpswing", (q) => inArc(e, q, d.aim, bodyRadius(e) + GIANT.upswingReach, GIANT.upswingArc)); return true; }
      return false;
    };
    if (s.phase === "windup") { if (s.t <= 0) { d.plan = GIANT.chargePlans[Math.floor(roll("plan") * GIANT.chargePlans.length)]; d.step = 0; toPhase(s, "active", attack.active); nextStep(); } return; }
    if (s.phase !== "active") return;
    d.left -= w.dt;
    if (d.mode === "dash") { // thrusters flare, then the burst
      if (d.left > 0) { e.giantThrust = true; return; }
      if (giantDashStep(e, w, d.dash, p)) return;
      if (!nextStep()) { e.giantThrust = false; toPhase(s, "recover", attack.recover); }
      return;
    }
    if (d.mode === "upswing") {
      if (d.left > 0) return;
      if (d.step < d.plan.length) { nextStep(); return; }
      if (roll("jump") >= GIANT.jumpChance) { toPhase(s, "recover", attack.recover); return; }
      d.mode = "air"; d.left = GIANT.jumpRise + GIANT.airDashTime + GIANT.barrageEvery * GIANT.barrageBolts; d.air = roll("air") < .5 ? "barrage" : "dash"; d.fired = 0; d.clock = GIANT.jumpRise; e.giantPose = "raise";
      return;
    }
    if (d.mode === "air") {
      e.giantAir = Math.min(GIANT.jumpHeight, (e.giantAir || 0) + GIANT.jumpHeight * w.dt / GIANT.jumpRise);
      d.clock -= w.dt;
      if (d.clock <= 0 && d.air === "barrage" && d.fired < GIANT.barrageBolts) { // a fan of bolts thrown down at you
        d.clock += GIANT.barrageEvery; const a0 = Math.atan2(p.y - e.y, p.x - e.x), a = a0 + ((d.fired / Math.max(1, GIANT.barrageBolts - 1)) - .5) * GIANT.barrageSpread * Math.PI / 180;
        w.addEffect({ kind: "giantBolt", owner: e.id, x: e.x, y: e.y, vx: Math.cos(a) * GIANT.boltSpeed, vy: Math.sin(a) * GIANT.boltSpeed, radius: GIANT.boltRadius, arming: 0, life: GIANT.boltLife, damage: Math.ceil(damageOf(e, "giantUpswing") * .5) }); d.fired++;
      }
      if (d.clock <= 0 && d.air === "dash") { // a quick dash through the air at you, trailing arcs
        if (!d.arc) { d.arc = true; w.addEffect({ kind: "giantArc", owner: e.id, x: e.x, y: e.y, scale: e.scale, range: GIANT.airArcReach, tick: 0, seed: s.seq + 7, life: GIANT.airDashTime + .15, total: GIANT.airDashTime + .15, damage: Math.ceil(damageOf(e, "giantUpswing") * .4) }); }
        const to = unit(p.x - e.x, p.y - e.y), step = Math.min(GIANT.airDashSpeed * w.dt, Math.max(0, dist - bodyRadius(e)));
        w.move(e, to.x * step, to.y * step); e.facingX = to.x >= 0 ? 1 : -1; // it still cannot pass through walls, so it never lands inside one
      }
      if (d.left > 0) return;
      if (roll("land") < GIANT.slamLandChance) { d.mode = "slamFall"; d.left = GIANT.landWarn; d.mark = { x: p.x, y: p.y }; s.tele = { type: "circle", x: p.x, y: p.y, radius: GIANT.landRadius }; e.giantPose = "slamRaise"; }
      else { d.mode = "fall"; d.left = GIANT.landFall; }
      return;
    }
    if (d.mode === "slamFall") { // it comes down onto where you stood, tracking across the mark
      const to = unit(d.mark.x - e.x, d.mark.y - e.y), gap = distance(d.mark, e), step = Math.min(gap, gap * w.dt / Math.max(w.dt, d.left));
      e.x += to.x * step; e.y += to.y * step; e.giantAir = Math.max(0, GIANT.jumpHeight * d.left / GIANT.landWarn);
      if (d.left > 0) return;
      e.giantAir = 0; e.giantPose = "slamDown"; s.tele = null;
      const dmg = damageOf(e, "giantUpswing"); resolveMelee(e, s, w, "giantUpswing", (q) => distance(q, d.mark) <= GIANT.landRadius);
      w.addEffect({ kind: "shock", lightning: true, owner: e.id, x: d.mark.x, y: d.mark.y, radius: GIANT.slamRing, life: .6, total: .6, damage: Math.ceil(dmg * GIANT.slamRingShare) });
      toPhase(s, "recover", attack.recover); return;
    }
    if (d.mode === "fall") { e.giantAir = Math.max(0, (e.giantAir || 0) - GIANT.jumpHeight * w.dt / GIANT.landFall); if (d.left <= 0) { e.giantAir = 0; toPhase(s, "recover", attack.recover); } }
  },
  giantElectrify(e, s, w) {
    if (s.phase !== "windup") return;
    // The sky strikes the raised club partway through the stand; at the end of it the Giant runs hot.
    if (!s.data.struck && s.t <= ATTACK_MODULES.giantElectrify.windup * (1 - GIANT.strikeAt)) { s.data.struck = true; w.addEffect({ kind: "giantStrike", owner: e.id, x: e.x, y: e.y, scale: e.scale, radius: 0, arming: 0, life: .5, total: .5, damage: 0 }); }
    if (s.t > 0) return;
    e.giantCharged = GIANT.chargeTime; e.giantStormClock = GIANT.stormEvery; s.tele = null;
    toPhase(s, "recover", ATTACK_MODULES.giantElectrify.recover);
  },
  voidHand: voidSimpleRun, voidClaw: voidSimpleRun, voidSword: voidSimpleRun, voidSlash: voidSimpleRun, voidSpikes: voidSimpleRun, voidWraiths: voidSimpleRun,
  voidRifts(e, s, w) { if (s.phase === "windup" && s.t <= 0) { voidOpenRifts(e, s, w, false); voidSimpleRun(e, s); } },
  voidConstellation(e, s, w) { if (s.phase === "windup" && s.t <= 0) { voidOpenRifts(e, s, w, true); voidSimpleRun(e, s); } },
  voidHorizons(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const p = s.data.target, a = hashSeed(`${e.id}:${s.seq}:horizons`) % 628 / 100;
    for (let i = 0; i < 2; i++) {
      const at = { x: p.x + Math.cos(a + i * Math.PI) * 2, y: p.y + Math.sin(a + i * Math.PI) * 2 };
      voidAdd(w, e, { kind: "voidHorizon", ...at, radius: VOID.horizonRadius, coreRadius: VOID.horizonCore, angle: Math.atan2(p.y - at.y, p.x - at.x),
        pulsar: i === 0, pulses: 0, pulseCount: VOID.pulsarMin + hashSeed(`${e.id}:${s.seq}:pulses`) % (VOID.pulsarMax - VOID.pulsarMin + 1), nextPulse: VOID.pulsarFirst,
        arming: VOID.horizonWarn, life: VOID.horizonLife, damage: damageOf(e, "voidHorizons") });
    }
    voidSimpleRun(e, s);
  },
  voidSupernova: voidNovaRun,
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
  knightSlide(e, s, w) {
    const attack = ATTACK_MODULES.knightSlide;
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", attack.active); return; }
    if (s.phase !== "active") return;
    s.data.sub -= w.dt;
    if (s.data.mode === "slide") { // skid in low, then cut
      const p = center(w.player), to = unit(p.x - e.x, p.y - e.y), step = KNIGHT.slideSpeed * w.dt;
      if (distance(p, e) > bodyRadius(e) + 1) w.move(e, to.x * step, to.y * step);
      s.data.aim = to; e.sliding = true;
      if (s.data.sub <= -KNIGHT.slideTime || distance(p, e) <= bodyRadius(e) + 1) { s.data.mode = "cut"; s.data.sub = KNIGHT.slidePause; e.sliding = false; knightCut(e, s, w, "knightSlide", s.data.aim, energized(e, s, s.data.cut)); s.data.cut++; s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + KNIGHT.slideReach, arc: KNIGHT.slideArc }; }
    } else if (s.data.sub <= 0) { if (s.data.cut >= KNIGHT.slides) { s.tele = null; e.sliding = false; toPhase(s, "recover", attack.recover); return; } s.data.mode = "slide"; s.data.sub = 0; }
    if (s.t <= 0) { e.sliding = false; s.tele = null; toPhase(s, "recover", attack.recover); }
  },
  knightCannon(e, s, w) {
    const attack = ATTACK_MODULES.knightCannon, p = center(w.player);
    if (s.phase === "windup") { // charging: it tracks you
      const want = Math.atan2(p.y - e.y, p.x - e.x), diff = ((want - s.data.angle) % TAU + TAU * 1.5) % TAU - Math.PI;
      s.data.angle += Math.max(-KNIGHT.cannonTrack * w.dt, Math.min(KNIGHT.cannonTrack * w.dt, diff));
      const dir = { x: Math.cos(s.data.angle), y: Math.sin(s.data.angle) }; s.tele = { type: "beam", angle: s.data.angle, length: rayLength(w, e, dir, KNIGHT.cannonLength), charging: true, laser: true };
      if (s.t <= 0) { toPhase(s, "active", attack.active); s.data.tick = 0; } return;
    }
    if (s.phase !== "active") return;
    const dir = { x: Math.cos(s.data.angle), y: Math.sin(s.data.angle) }, len = rayLength(w, e, dir, KNIGHT.cannonLength);
    s.tele = { type: "beam", angle: s.data.angle, length: len, charging: false, laser: true };
    s.data.tick -= w.dt;
    if (s.data.tick <= 0 && segmentDistance(p, e, { x: e.x + dir.x * len, y: e.y + dir.y * len }) <= KNIGHT.cannonWidth) { s.data.tick = KNIGHT.cannonTick; w.hurt(e, damageOf(e, "knightCannon"), { jumpable: false, source: "knightCannon", beam: true }); }
    if (s.t <= 0) { s.tele = null; toPhase(s, "recover", attack.recover); }
  },
  knightSwordfall(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const p = s.data.target, turn = (hashSeed(`${e.id}:${s.seq}:swords`) % 628) / 100, [lo, hi] = KNIGHT.swordRing, [f0, f1] = KNIGHT.swordFall;
    for (let i = 0; i < KNIGHT.swords; i++) { const on = i === 0, a = turn + i * TAU / (KNIGHT.swords - 1), r = on ? 0 : lo + (hi - lo) * ((hashSeed(`${e.id}:${s.seq}:sr:${i}`) % 100) / 100); w.addEffect({ kind: "swordfall", owner: e.id, x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, radius: KNIGHT.swordRadius, arming: f0 + (f1 - f0) * (on ? .4 : i / KNIGHT.swords), damage: damageOf(e, "knightSwordfall"), jumpable: false, life: 1.4 }); }
    s.tele = null; toPhase(s, "recover", ATTACK_MODULES.knightSwordfall.recover);
  },
  psyOrbital(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const p = center(w.player), [lo, hi] = CRYSTAL.orbitalBeams, count = lo + hashSeed(`${e.id}:${s.seq}:sky-count`) % (hi - lo + 1);
    const pattern = CRYSTAL.orbitalPatterns[hashSeed(`${e.id}:${s.seq}:sky-pattern`) % CRYSTAL.orbitalPatterns.length];
    for (let i = 0; i < count; i++) {
      const phase = i / count, offset = crystalOrbitalOffset(pattern, phase, 0);
      w.addEffect({ kind: "orbital", owner: e.id, x: p.x + offset.x, y: p.y + offset.y, anchor: { ...p }, pattern, phase, elapsed: 0, radius: CRYSTAL.orbitalRadius, arming: CRYSTAL.orbitalWarn, life: CRYSTAL.orbitalLife, total: CRYSTAL.orbitalLife, damage: damageOf(e, "psyOrbital") });
    }
    s.tele = null; toPhase(s, "recover", ATTACK_MODULES.psyOrbital.recover);
  },
  knightOrbs(e, s, w) {
    const attack = ATTACK_MODULES.knightOrbs;
    if (s.phase === "windup") {
      if (s.t <= 0) { const count = e.hp <= e.maxHp * KNIGHT.orbEnrage ? KNIGHT.orbsEnraged : KNIGHT.orbs; for (let i = 0; i < count; i++) w.addEffect({ kind: "nanoOrb", owner: e.id, x: e.x, y: e.y, radius: KNIGHT.orbRadius, arming: 0, life: 99, orbit: i * TAU / count, state: "circle", damage: damageOf(e, "knightOrbs") }); toPhase(s, "active", attack.active); s.data.next = KNIGHT.orbFloat; }
      return;
    }
    if (s.phase !== "active") return;
    s.data.next -= w.dt;
    const waiting = (w.effects?.() || []).filter((f) => f.kind === "nanoOrb" && f.owner === e.id && f.state === "circle");
    if (s.data.next <= 0 && waiting.length) { // send them: all at once, or one at a time
      for (const f of s.data.allAtOnce ? waiting : waiting.slice(0, 1)) launchKnightOrb(f, w.player);
      s.data.next = s.data.allAtOnce ? 99 : KNIGHT.orbEvery;
    }
    if (s.t <= 0) { for (const f of waiting) if (f.state === "circle") launchKnightOrb(f, w.player); s.tele = null; toPhase(s, "recover", attack.recover); }
  },
  knightMissiles(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    for (let i = 0; i < KNIGHT.missiles; i++) { const a = -Math.PI / 2 + (i - (KNIGHT.missiles - 1) / 2) * .38 + ((hashSeed(`${e.id}:${s.seq}:m:${i}`) % 100) / 100 - .5) * .3; w.addEffect({ kind: "missile", owner: e.id, x: e.x, y: e.y - .3, vx: Math.cos(a) * KNIGHT.missileSpeed, vy: Math.sin(a) * KNIGHT.missileSpeed, radius: KNIGHT.missileRadius, arming: 0, life: KNIGHT.missileFuel + i * .05, damage: damageOf(e, "knightMissiles") }); }
    s.tele = null; toPhase(s, "recover", ATTACK_MODULES.knightMissiles.recover);
  },
  knightThrust(e, s, w) {
    const attack = ATTACK_MODULES.knightThrust;
    if (s.phase === "windup") { if (s.t <= 0) { s.tele = null; e.thrusting = s.data.dir; toPhase(s, "active", attack.active); } return; }
    if (s.phase !== "active") return;
    const d = s.data.dir, step = KNIGHT.thrustSpeed * w.dt, p = center(w.player), tip = { x: e.x + d.x * (bodyRadius(e) + KNIGHT.thrustReach), y: e.y + d.y * (bodyRadius(e) + KNIGHT.thrustReach) };
    if (!w.move(e, d.x * step, d.y * step)) s.t = 0;
    if (!s.hitOnce && segmentDistance(p, e, tip) <= .5) { s.hitOnce = true; w.hurt(e, damageOf(e, "knightThrust"), { jumpable: false, source: "knightThrust" }); }
    if (s.t <= 0) {
      if (s.data.beam) { const far = { x: tip.x + d.x * KNIGHT.thrustBeam, y: tip.y + d.y * KNIGHT.thrustBeam }; w.addEffect({ kind: "swordBeam", owner: e.id, x: tip.x, y: tip.y, to: far, lift: (Number(e.scale) || 1) * .72, arming: 0, life: .3, total: .3, damage: 0 }); if (!s.hitOnce && segmentDistance(p, tip, far) <= .5) { s.hitOnce = true; w.hurt(e, damageOf(e, "knightThrust"), { jumpable: false, source: "knightThrustBeam", beam: true }); } }
      e.thrusting = null; toPhase(s, "recover", attack.recover);
    }
  },
  knightCombo(e, s, w) { // the onslaught: cut, cut, dash after you, cut, cut, dash, cut, cut (each pair forward then back)
    const attack = ATTACK_MODULES.knightCombo, plan = s.data.plan || KNIGHT.comboPlan, p = center(w.player);
    if (s.phase === "windup") { if (s.t <= 0) { s.data.step = 0; s.data.sub = 0; toPhase(s, "active", attack.active); } return; }
    if (s.phase !== "active") return;
    const what = plan[s.data.step];
    if (!what || s.t <= 0) { e.swing = null; e.sliding = false; s.tele = null; toPhase(s, "recover", attack.recover); return; }
    s.data.sub -= w.dt;
    if (what === "dash") { // skid in after you
      e.sliding = true; e.swing = null; const to = unit(p.x - e.x, p.y - e.y), step = KNIGHT.slideSpeed * w.dt;
      if (distance(p, e) > bodyRadius(e) + KNIGHT.comboClose) w.move(e, to.x * step, to.y * step);
      if (s.data.sub <= -KNIGHT.comboDash || distance(p, e) <= bodyRadius(e) + KNIGHT.comboClose) { e.sliding = false; s.data.step++; s.data.sub = KNIGHT.comboPause; }
      return;
    }
    s.data.aim = unit(p.x - e.x, p.y - e.y); s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + KNIGHT.slideReach, arc: KNIGHT.comboArc }; // the cut's reach shows while it gathers
    if (s.data.sub > 0) return;
    e.swing = s.data.cuts % 2 ? "back" : "fore"; knightCut(e, s, w, "knightCombo", s.data.aim, energized(e, s, s.data.cuts), KNIGHT.comboArc);
    s.data.cuts++; s.data.step++; s.data.sub = KNIGHT.comboPause;
  },
  knightBackslash(e, s, w) { // it leaps back away from you, slashing as it goes; the energy arc covers its retreat
    const attack = ATTACK_MODULES.knightBackslash, p = center(w.player);
    if (s.phase === "windup") { if (s.t <= 0) { s.data.away = unit(e.x - p.x, e.y - p.y); s.data.aim = unit(p.x - e.x, p.y - e.y); toPhase(s, "active", attack.active); } return; }
    if (s.phase !== "active") return;
    const step = KNIGHT.backHop / attack.active * w.dt; w.move(e, s.data.away.x * step, s.data.away.y * step);
    e.hopLift = Math.sin(Math.max(0, 1 - s.t / attack.active) * Math.PI) * .6; e.swing = "back";
    if (!s.data.cut && s.t <= attack.active - .08) { s.data.cut = true; knightCut(e, s, w, "knightBackslash", s.data.aim, true, KNIGHT.comboArc); }
    if (s.t <= 0) { e.hopLift = 0; e.swing = null; toPhase(s, "recover", attack.recover); }
  },
  knightMist(e, s, w) {
    const p = center(w.player);
    if (s.phase === "windup") { if (s.t <= 0) { e.mist = true; e.untargetable = true; toPhase(s, "travel", KNIGHT.mistTime); } return; }
    if (s.phase === "travel") {
      e.untargetable = true;
      if (s.t <= 0) { const v = playerVelocity(w), side = s.orbitDir || 1, base = Math.hypot(v.x, v.y) > .1 ? unit(-v.x, -v.y) : unit(e.x - p.x, e.y - p.y), a = Math.atan2(base.y, base.x) + side * .9, spot = nearestOpen(w, p.x + Math.cos(a) * KNIGHT.mistLand, p.y + Math.sin(a) * KNIGHT.mistLand, 2);
        if (spot) { e.x = spot.x; e.y = spot.y; } e.mist = false; e.untargetable = false; s.data.aim = unit(p.x - e.x, p.y - e.y); s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + KNIGHT.slideReach, arc: KNIGHT.slideArc }; toPhase(s, "strike", .22); }
      return;
    }
    if (s.phase === "strike" && s.t <= 0) { resolveMelee(e, s, w, "knightMist", (q) => inArc(e, q, s.data.aim, bodyRadius(e) + KNIGHT.slideReach, KNIGHT.slideArc)); s.data.cutAt = w.now; s.tele = null; toPhase(s, "recover", ATTACK_MODULES.knightMist.recover); }
  },
  psyPush(e, s, w) {
    const attack = ATTACK_MODULES.psyPush, p = center(w.player);
    if (s.phase === "windup") { if (s.t <= 0) { if (distance(p, e) <= CRYSTAL.pushRadius) w.hurt(e, damageOf(e, "psyPush"), { jumpable: false, source: "psyPush" }); w.addEffect({ kind: "psyRing", owner: e.id, x: e.x, y: e.y, radius: CRYSTAL.pushRadius, arming: 0, life: .4, total: .4, damage: 0 }); toPhase(s, "active", attack.active); s.tele = null; } return; }
    if (s.phase === "active") { w.push?.(e, CRYSTAL.pushForce * w.dt, CRYSTAL.pushRadius + 1); if (s.t <= 0) toPhase(s, "recover", attack.recover); }
  },
  psyPull(e, s, w) {
    const attack = ATTACK_MODULES.psyPull, p = center(w.player);
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", attack.active); return; }
    if (s.phase !== "active") return;
    w.pull?.(e, CRYSTAL.pullForce * w.dt, CRYSTAL.pullRadius);
    if (!s.hitOnce && distance(p, e) <= bodyRadius(e) + CRYSTAL.pullReach) { s.hitOnce = true; w.hurt(e, damageOf(e, "psyPull"), { jumpable: false, source: "psyPull" }); w.addEffect({ kind: "psyRing", owner: e.id, x: e.x, y: e.y, radius: 1.6, arming: 0, life: .3, total: .3, damage: 0 }); }
    if (s.t <= 0) { s.tele = null; toPhase(s, "recover", attack.recover); }
  },
  psyGrab(e, s, w) { // violet, then it seizes you; it crushes you unless you dodged its reach or struggle free
    const attack = ATTACK_MODULES.psyGrab, p = center(w.player);
    if (s.phase === "windup") {
      s.tele = { type: "tether", x: p.x, y: p.y, reaching: true };
      if (s.t <= 0) { if (distance(p, e) <= CRYSTAL.grabRange && w.los(e, w.player) && w.grab?.(e, CRYSTAL.grabHold)) { s.data.held = true; toPhase(s, "active", CRYSTAL.grabHold); } else { s.tele = null; toPhase(s, "recover", attack.recover); } }
      return;
    }
    if (s.phase !== "active") return;
    s.tele = { type: "tether", x: p.x, y: p.y, holding: true };
    if (s.t > 0 && !w.held?.(e)) { s.tele = null; toPhase(s, "recover", attack.recover); return; } // struggled free before the crush
    if (s.t <= 0) { w.release?.(e); w.hurt(e, damageOf(e, "psyGrab"), { jumpable: false, source: "psyGrab" }); w.addEffect({ kind: "psyRing", owner: e.id, x: p.x, y: p.y, radius: 1.4, arming: 0, life: .45, total: .45, damage: 0 }); s.tele = null; toPhase(s, "recover", attack.recover); }
  },
  psyDebris(e, s, w) {
    const attack = ATTACK_MODULES.psyDebris;
    if (s.phase === "windup") {
      if (s.t <= 0) {
        // Choose the material where the Crystal actually lifts it, not from its saved spawn or the player's boat.
        // The material remains fixed after launch, even if either combatant crosses the shoreline.
        const water = typeof w.oceanAt === "function" ? w.oceanAt(e.x, e.y) : !!e.marine;
        for (let i = 0; i < CRYSTAL.debris; i++) w.addEffect({ kind: "debris", owner: e.id, x: e.x, y: e.y, radius: CRYSTAL.debrisRadius, arming: 0, life: 99, orbit: i * TAU / CRYSTAL.debris, state: "lift", ...(water ? { medium: "water" } : {}), shape: hashSeed(`${e.id}:${s.seq}:rock:${i}`) % 5, damage: damageOf(e, "psyDebris") });
        s.data.next = .25; toPhase(s, "active", attack.active);
      }
      return;
    }
    if (s.phase !== "active") return;
    s.data.next -= w.dt;
    const held = (w.effects?.() || []).filter((f) => f.kind === "debris" && f.owner === e.id && f.state === "lift");
    if ((s.data.next <= 0 || s.t <= 0) && held.length) { s.data.next = CRYSTAL.debrisEvery; const f = held[0], p = center(w.player), a = Math.atan2(p.y - f.y, p.x - f.x); Object.assign(f, { state: "thrown", vx: Math.cos(a) * CRYSTAL.debrisSpeed, vy: Math.sin(a) * CRYSTAL.debrisSpeed, life: CRYSTAL.debrisLife }); }
    if (s.t <= 0 && held.length <= 1) toPhase(s, "recover", attack.recover);
  },
  psyWall(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const p = center(w.player), n = unit(p.x - e.x, p.y - e.y), mid = { x: e.x + n.x * CRYSTAL.wallGap, y: e.y + n.y * CRYSTAL.wallGap };
    w.addEffect({ kind: "psyWall", owner: e.id, x: mid.x, y: mid.y, nx: n.x, ny: n.y, arming: .15, life: CRYSTAL.wallLife, total: CRYSTAL.wallLife, damage: 0 });
    s.tele = null; toPhase(s, "recover", ATTACK_MODULES.psyWall.recover);
  },
  turtleStomp(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    if (distance(center(w.player), e) <= bodyRadius(e) + TURTLE.stompRadius) w.hurt(e, damageOf(e, "turtleStomp"), { jumpable: true, source: "turtleStomp" });
    w.addEffect({ kind: "shock", owner: e.id, x: e.x, y: e.y, radius: bodyRadius(e) + TURTLE.stompRing, arming: 0, life: .9, damage: damageOf(e, "turtleStomp"), jumpable: true, stone: true });
    w.addEffect({ kind: "dust", owner: e.id, x: e.x, y: e.y, radius: bodyRadius(e) + 1, arming: 0, life: .7, damage: 0 });
    s.tele = null; toPhase(s, "recover", ATTACK_MODULES.turtleStomp.recover);
  },
  turtleDash(e, s, w) {
    const attack = ATTACK_MODULES.turtleDash;
    if (s.phase === "windup") { if (s.t <= 0) { s.tele = null; toPhase(s, "active", attack.active); } return; }
    if (s.phase !== "active") return;
    const step = TURTLE.dashSpeed * w.dt;
    if (!w.move(e, s.data.aim.x * step, s.data.aim.y * step)) s.t = 0; // it stops against what it cannot shoulder through
    if (!s.hitOnce && distance(center(w.player), e) <= bodyRadius(e) + .5) { s.hitOnce = true; w.hurt(e, damageOf(e, "turtleDash"), { jumpable: false, source: "turtleDash" }); }
    s.data.next -= w.dt;
    if (s.data.next <= 0) {
      s.data.next = TURTLE.dashEvery; const n = s.data.dropped = (s.data.dropped || 0) + 1, burst = TURTLE.iceBurst[0] + (TURTLE.iceBurst[1] - TURTLE.iceBurst[0]) * ((hashSeed(`${e.id}:${s.seq}:burst:${n}`) % 100) / 100);
      w.addEffect(s.data.ice
        ? { kind: "frostTrail", owner: e.id, x: e.x, y: e.y, radius: TURTLE.trailRadius, arming: 0, life: burst, total: burst, damage: Math.max(1, Math.ceil(e.damage * TURTLE.trailBite)), burst: Math.max(1, Math.ceil(e.damage * TURTLE.iceBurstBite)) }
        : { kind: "flameTrail", owner: e.id, x: e.x, y: e.y, radius: TURTLE.trailRadius, arming: 0, life: TURTLE.trailLife, total: TURTLE.trailLife, damage: Math.max(1, Math.ceil(e.damage * TURTLE.trailBite)) });
    }
    if (s.t <= 0) toPhase(s, "recover", attack.recover);
  },
  turtleSpin(e, s, w) {
    const attack = ATTACK_MODULES.turtleSpin;
    if (s.phase === "windup") { if (s.t <= 0) { s.tele = null; toPhase(s, "active", attack.active); } return; }
    if (s.phase !== "active") return;
    e.spinning = true; const p = center(w.player), d = distance(p, e);
    if (d <= bodyRadius(e) + TURTLE.spinRadius + 2) w.pull?.(e, TURTLE.spinPull * w.dt, bodyRadius(e) + TURTLE.spinRadius + 2);
    s.data.tick = (s.data.tick || 0) - w.dt;
    if (s.data.tick <= 0 && d <= bodyRadius(e) + TURTLE.spinRadius) { s.data.tick = TURTLE.spinTick; w.hurt(e, damageOf(e, "turtleSpin"), { jumpable: false, source: "turtleSpin", beam: true }); w.slow(TURTLE.twisterSlow, .5); }
    s.data.next -= w.dt;
    if (s.data.next <= 0) {
      s.data.next = TURTLE.twisterEvery;
      const alive = (w.effects?.() || []).filter((f) => f.kind === "twister" && f.owner === e.id).length;
      if (alive < TURTLE.twisterMax) { const a = (hashSeed(`${e.id}:${s.seq}:twister:${s.data.flung++}`) % 628) / 100, r = bodyRadius(e) + .6; w.addEffect({ kind: "twister", owner: e.id, x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r, vx: Math.cos(a) * TURTLE.twisterSpeed, vy: Math.sin(a) * TURTLE.twisterSpeed, radius: TURTLE.twisterRadius, arming: 0, life: TURTLE.twisterLife, total: TURTLE.twisterLife, damage: Math.max(1, Math.ceil(e.damage * TURTLE.twisterBite)), wander: a }); }
    }
    if (s.t <= 0) { e.spinning = false; toPhase(s, "recover", attack.recover); }
  },
  turtleCyclone(e, s, w) {
    const attack = ATTACK_MODULES.turtleCyclone;
    if (s.phase === "windup") { if (s.t <= 0) { s.tele = null; toPhase(s, "active", attack.active); } return; }
    if (s.phase !== "active") return;
    e.spinning = true; const d = s.data.dir, step = TURTLE.cycloneSpeed * w.dt;
    if (!w.move(e, d.x * step, d.y * step)) { // rebound: off a wall side, off the other, or straight back
      if (w.move(e, -d.x * step, d.y * step)) d.x = -d.x; else if (w.move(e, d.x * step, -d.y * step)) d.y = -d.y; else { d.x = -d.x; d.y = -d.y; }
      w.addEffect({ kind: "dust", owner: e.id, x: e.x + d.x * bodyRadius(e), y: e.y + d.y * bodyRadius(e), radius: 1, arming: 0, life: .4, damage: 0 });
    }
    s.data.hitCd -= w.dt;
    if (s.data.hitCd <= 0 && distance(center(w.player), e) <= bodyRadius(e) + .5) { s.data.hitCd = TURTLE.cycloneHitEvery; w.hurt(e, damageOf(e, "turtleCyclone"), { jumpable: false, source: "turtleCyclone" }); }
    s.data.next -= w.dt;
    if (s.data.next <= 0) { // a volley of icicles flung outward, turning as it spins
      s.data.next = TURTLE.icicleEvery; const base = s.data.volley++ * TURTLE.icicleTurn, dmg = Math.max(1, Math.ceil(e.damage * TURTLE.icicleBite));
      for (let i = 0; i < TURTLE.iciclesPerVolley; i++) { const a = base + i * TAU / TURTLE.iciclesPerVolley; w.addEffect({ kind: "orb", icicle: true, owner: e.id, x: e.x + Math.cos(a) * bodyRadius(e), y: e.y + Math.sin(a) * bodyRadius(e) * .7, vx: Math.cos(a) * TURTLE.icicleSpeed, vy: Math.sin(a) * TURTLE.icicleSpeed, radius: TURTLE.icicleRadius, arming: 0, life: TURTLE.icicleLife, damage: dmg }); }
    }
    if (s.t <= 0) { e.spinning = false; toPhase(s, "recover", attack.recover); }
  },
  turtleComet(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const p = s.data.target, d = Math.max(.5, distance(p, e)), dir = unit(p.x - e.x, p.y - e.y), mouth = { x: e.x + dir.x * bodyRadius(e) * .9, y: e.y + dir.y * bodyRadius(e) * .6 };
    w.addEffect({ kind: "comet", owner: e.id, x: mouth.x, y: mouth.y, vx: dir.x * TURTLE.cometSpeed, vy: dir.y * TURTLE.cometSpeed, radius: TURTLE.cometRadius, arming: 0, life: Math.max(.3, (d - bodyRadius(e) * .9) / TURTLE.cometSpeed), to: { ...p }, damage: damageOf(e, "turtleComet"), frost: Math.max(1, Math.ceil(e.damage * TURTLE.trailBite)) });
    toPhase(s, "recover", ATTACK_MODULES.turtleComet.recover);
  },
  turtleShield(e, s, w) {
    const attack = ATTACK_MODULES.turtleShield;
    if (s.phase === "windup") { if (s.t <= 0) { s.tele = null; e.iceShield = true; toPhase(s, "active", attack.active); } return; }
    if (s.phase === "active") { e.untargetable = true; if (s.t <= 0) { e.iceShield = false; e.untargetable = false; toPhase(s, "recover", attack.recover); } }
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
  if (id === "voidSupernova" && voidEffects(w).some((f) => f.owner === e.id && f.kind === "voidRift" && f.tracking && !f.activated)) return false;
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
// Release 245 (Tim: "periodically he'll dodge your attack … turn to mist … doesn't matter if it's magic or physical … it
// can be random"). Whenever a blade, shot or spell threatens it, it rolls once per threat (at most every mistEvery): at
// mistChance % it dissolves, mid-attack or not, and reforms a few tiles aside. Rolls are hashed, so runs are repeatable.
function knightMistDodge(e, s, w, p, d) {
  if ((s.cd.qbEvade || 0) > 0 || e.mist) return false;
  let threat = null;
  for (const q of w.playerShots || []) { const dx = e.x - q.x + .5, dy = e.y - q.y + .45, m = Math.hypot(q.dx || 0, q.dy || 0) || 1, ux = (q.dx || 0) / m, uy = (q.dy || 0) / m, along = dx * ux + dy * uy; if (Math.hypot(dx, dy) <= QB_MOVES.threatRange && along > 0 && Math.abs(dx * uy - dy * ux) <= bodyRadius(e) + .7) { const side = (dx * uy - dy * ux) >= 0 ? 1 : -1; threat = { x: -uy * side, y: ux * side }; break; } }
  if (!threat) for (const fx of w.playerBlasts || []) if (Math.hypot(e.x + .5 - fx.x, e.y + .45 - fx.y) <= (fx.radius || 1) + bodyRadius(e) + .6) { threat = unit(e.x + .5 - fx.x, e.y + .45 - fx.y); break; }
  if (!threat && w.playerSwinging && d <= QB_MOVES.swingRange) { const away = unit(e.x - p.x, e.y - p.y), side = s.orbitDir || 1; threat = unit(away.x - away.y * side * .8, away.y + away.x * side * .8); }
  if (!threat) return false;
  s.cd.qbEvade = KNIGHT.mistEvery; s.mistRolls = (s.mistRolls || 0) + 1;
  if (hashSeed(`${e.id}:mist:${s.mistRolls}`) % 100 >= KNIGHT.mistChance) return false; // this time it stands and takes it
  if (s.attack) endAttack(e, s);
  if (d <= 4 && hashSeed(`${e.id}:mist-or-blade:${s.mistRolls}`) % 100 < KNIGHT.backslashChance) { s.state = "attack"; beginAttack(e, s, "knightBackslash", w); return true; } // it leaps back slashing instead
  const to = nearestOpen(w, e.x + threat.x * KNIGHT.dodgeLeap, e.y + threat.y * KNIGHT.dodgeLeap, 1.5);
  s.evade = { x: 0, y: 0, t: KNIGHT.dodgeMist, to }; e.untargetable = true; e.mist = true;
  return true;
}
function evade(e, s, w, p, d) {
  if (s.evade) {
    const step = QB_MOVES.evadeSpeed * w.dt; if ((s.evade.x || s.evade.y) && !w.move(e, s.evade.x * step, s.evade.y * step)) s.evade.t = 0;
    s.evade.t -= w.dt; e.hopLift = e.tucked || e.mist ? 0 : Math.sin(Math.max(0, s.evade.t) / QB_MOVES.evadeTime * Math.PI) * .5;
    if (s.evade.t <= 0) { if (s.evade.to) { e.x = s.evade.to.x; e.y = s.evade.to.y; } s.evade = null; e.untargetable = false; e.hopLift = 0; e.tucked = false; e.mist = false; }
    return true;
  }
  if (e.kind === "nanobotKnight") return knightMistDodge(e, s, w, p, d);
  if ((s.attack && s.phase !== "recover") || (s.cd.qbEvade || 0) > 0) return false; // it may spring out of an attack's recovery
  let dir = null;
  for (const q of w.playerShots || []) {
    const dx = e.x - q.x + .5, dy = e.y - q.y + .45, dist = Math.hypot(dx, dy), m = Math.hypot(q.dx || 0, q.dy || 0) || 1, ux = (q.dx || 0) / m, uy = (q.dy || 0) / m, along = dx * ux + dy * uy;
    if (dist > QB_MOVES.threatRange || along <= 0 || Math.abs(dx * uy - dy * ux) > bodyRadius(e) + .7) continue;
    const side = (dx * uy - dy * ux) >= 0 ? 1 : -1; dir = { x: -uy * side, y: ux * side }; break;
  }
  if (!dir && w.playerSwinging && d <= QB_MOVES.swingRange) { const away = unit(e.x - p.x, e.y - p.y), side = s.orbitDir || 1; dir = unit(away.x + -away.y * side * .8, away.y + away.x * side * .8); }
  if (!dir) return false;
  if (e.kind === "mountainTurtle") { s.cd.qbEvade = QB_MOVES.evadeCooldown * 1.6; if (s.attack) endAttack(e, s); s.evade = { x: 0, y: 0, t: TURTLE.tuckTime }; e.untargetable = true; e.tucked = true; return true; } // release 241: too big to spring aside; it pulls into its shell
  const enraged = e.hp <= e.maxHp * PACK_BOSS_TEMPLATE.enrage;
  const cool = e.kind === "psychicCrystal" ? CRYSTAL : QB_MOVES; // release 285: the Crystal dodges less often
  s.cd.qbEvade = enraged ? cool.evadeCooldownEnraged : cool.evadeCooldown;
  if (s.attack) endAttack(e, s);
  s.evade = { ...dir, t: QB_MOVES.evadeTime }; e.untargetable = true; s.vel = null;
  return true;
}

// The Morphing Blob's passives (release 235): it grows while it lives (in steps, so its sprite is not redrawn every
// frame), burns what touches it, and every time it is struck it spatters ooze that lies on the ground until it dies.
function blobPassive(e, s, w, p, d) {
  e.blobBase ||= { scale: Number(e.scale) || 1, radius: bodyRadius(e) };
  const age = Math.max(0, Math.min(BLOB.growTime, Number(e.blobAge) || 0)), dt = Number.isFinite(w.dt) ? Math.max(0, w.dt) : 0;
  e.blobAge = Math.min(BLOB.growTime, age + dt);
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
  // Detect the hit before regenerating, even when this tick's growth restores more than the hit dealt.
  // Deriving the increment from saved age avoids catch-up healing on reload and discards healing at full HP.
  const maxHp = Number(e.maxHp), grown = (e.blobAge - age) / BLOB.growTime;
  if (grown > 0 && Number.isFinite(hp) && hp > 0 && Number.isFinite(maxHp) && hp < maxHp) e.hp = Math.min(maxHp, hp + maxHp * BLOB.growHeal * grown);
  s.lastHp = Number(e.hp) || 0;
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
// burning line that turns slowly after them, until it is cut down. It sinks when the worm dies. Left far behind, it sinks
// and comes up again around the Wayfarer a little later, so running never leaves the tentacles behind.
function tentacleTurret(e, s, w, p) {
  const owner = w.enemies.find((q) => q.id === e.wormOf && !q.dead);
  if (!owner) { e.dead = true; e.noRewards = true; return true; }
  if (e.tentPhase === "sinking") { // going back into the ground
    e.untargetable = true; s.tele = null; e.rising = Math.min(1, (Number(e.rising) || 0) + w.dt / WORM.tentacleSink);
    if (e.rising >= 1) { const [lo, hi] = WORM.tentacleUnder; e.tentPhase = "under"; e.surfaceAt = w.now + (lo + (hashSeed(`${e.id}:under:${e.moves || 0}`) % 100) / 100 * (hi - lo)) * 1000; }
    return true;
  }
  if (e.tentPhase === "under") { // travelling under the ground; then it comes up somewhere around the Wayfarer
    e.hidden = true; e.untargetable = true; s.tele = null;
    if (w.now < e.surfaceAt) return true;
    e.moves = (e.moves || 0) + 1;
    const [lo, hi] = WORM.tentacleRing, a = (hashSeed(`${e.id}:follow:${e.moves}`) % 628) / 100, r = lo + (hashSeed(`${e.id}:follow-r:${e.moves}`) % 100) / 100 * (hi - lo);
    const spot = nearestOpen(w, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 2);
    if (!spot) { e.surfaceAt = w.now + 400; return true; }
    e.x = spot.x; e.y = spot.y; e.tentPhase = null; e.hidden = false; e.bornAt = w.now; s.laser = null; s.fire = null; e.farFor = 0;
  }
  const age = (w.now - (e.bornAt || 0)) / 1000;
  if (age < WORM.tentacleRise) { e.untargetable = true; e.rising = 1 - age / WORM.tentacleRise; s.tele = { type: "circle", x: e.x, y: e.y, radius: .8, erupt: true, total: WORM.tentacleRise, left: WORM.tentacleRise - age }; return true; }
  if (e.rising) { e.rising = 0; e.untargetable = false; s.tele = null; if (distance(p, e) <= 1.1) w.hurt(owner, Math.max(1, Math.ceil((Number(owner.damage) || 1) * .4)), { jumpable: false, source: "wormTentacle" }); }
  if (distance(p, e) > WORM.tentacleFollow) { e.farFor = (Number(e.farFor) || 0) + w.dt; if (e.farFor >= WORM.tentacleFollowDelay) { e.tentPhase = "sinking"; e.farFor = 0; s.tele = null; return true; } }
  else e.farFor = 0;
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

// A world beast in retreat (release 239; the game sets `fleeTo`): it no longer fights or dodges, cannot be touched, and
// follows `fleePath` (found by the game around walls, over chasms with a bound, by bridges over water) to the gate it leaves
// by or to its home ground, where it fades into the ground (`fleeFade` from 1 to 0). With no path it goes straight. The
// Tremor Worm swims there under the ground, leaving a wake of churned earth. The game reads `fleeDone`.
function fleeStep(e, s, w) {
  if (s.attack) endAttack(e, s);
  s.evade = null; s.tele = null; e.untargetable = true; e.hidden = e.kind === "tremorWorm"; e.tucked = false; e.mist = e.kind === "nanobotKnight"; // the Knight goes home as a swarm
  if (e.fleeFade != null) { e.hopLift = 0; e.fleeFade = Math.max(0, e.fleeFade - w.dt / (e.fleeFadeTime || 1.4)); if (e.fleeFade <= 0) e.fleeDone = true; return; }
  const next = e.fleePath?.[0] || e.fleeTo, dx = next.x - e.x, dy = next.y - e.y, d = Math.hypot(dx, dy), step = (e.fleeSpeed || 2) * w.dt;
  e.hopLift = next.leap ? Math.min(1, (Number(e.hopLift) || 0) + w.dt * 4) : Math.max(0, (Number(e.hopLift) || 0) - w.dt * 4); // a bound over the chasm
  if (d > .01) { e.fleeDir = { x: dx / d, y: dy / d }; e.facingX = dx >= 0 ? 1 : -1; }
  if (e.hidden && (s.furrow = (s.furrow || 0) - w.dt) <= 0) { s.furrow = .2; w.addEffect({ kind: "furrow", owner: e.id, x: e.x, y: e.y, radius: .9, arming: 0, life: 2.2, total: 2.2, damage: 0, dir: e.fleeDir || { x: 1, y: 0 } }); } // the worm's wake of churned earth
  if (d > step + .05) { e.x += dx / d * step; e.y += dy / d * step; return; }
  e.x = next.x; e.y = next.y;
  if (e.fleePath?.length) { e.fleePath.shift(); if (e.fleePath.length) return; }
  if (e.fleeTo.home) { e.fleeFade = 1; if (e.kind === "lightningGiant") e.giantCloud = true; } else e.fleeDone = true;
}

// The Psychic Crystal's poise (release 259; CRYSTAL.poise*). Counts landed blows (from hp drops); enough of them break
// it: it falls to the floor (`e.crystalFall` 0..1 for the renderer), helpless, for CRYSTAL.breakTime, then rises and
// springs away from the Wayfarer. Returns true while it is broken (the tick is spent).
function crystalPoise(e, s, w, p) {
  const hp = Number(e.hp) || 0, dt = Number.isFinite(w.dt) ? Math.max(0, w.dt) : 0;
  s.poiseGuard = Math.max(0, (s.poiseGuard || 0) - dt); // release 285: no new break for CRYSTAL.poiseGuard s after rising
  if (s.hpSeen != null && hp < s.hpSeen && !(s.poiseGuard > 0)) { s.poiseHits = (s.poiseHits || 0) + 1; s.poiseIdle = 0; } else s.poiseIdle = (s.poiseIdle || 0) + dt;
  s.hpSeen = hp; if (s.poiseIdle >= CRYSTAL.poiseForget) s.poiseHits = 0;
  if (!(s.broken > 0) && (s.poiseHits || 0) >= CRYSTAL.poiseHits) { // release 401: a dodge no longer saves it once its poise is spent
    s.broken = CRYSTAL.breakTime; s.poiseHits = 0; if (s.attack) endAttack(e, s); s.tele = null; s.vel = null; w.release?.(e); // a held Wayfarer is let go
  }
  if (!(s.broken > 0)) { e.crystalFall = 0; return false; }
  s.broken -= dt; e.untargetable = false; e.hopLift = 0; s.evade = null;
  const gone = CRYSTAL.breakTime - s.broken; e.crystalFall = Math.max(0, Math.min(1, gone / CRYSTAL.fallTime, s.broken / CRYSTAL.riseTime));
  if (s.broken > 0) return true;
  // Up again: it springs away from the Wayfarer at once.
  s.broken = 0; e.crystalFall = 0; s.poiseGuard = CRYSTAL.poiseGuard; const away = unit(e.x - p.x, e.y - p.y), side = s.orbitDir || 1;
  s.evade = { ...unit(away.x - away.y * side * .6, away.y + away.x * side * .6), t: QB_MOVES.evadeTime }; e.untargetable = true; s.cd.qbEvade = CRYSTAL.evadeCooldown; // release 289: its own (longer) cooldown, as after any dodge
  return true;
}

// Release 307: landed blows (seen as health falling) build toward the next tier's break; a break ends the attack in hand and
// holds the boss still for breakTime (e.poiseBreak 1..0 for the renderer); then `guard` s before blows count again.
function bossPoise(e, s, w) {
  const P = bossPoiseOf(e), hp = Number(e.hp) || 0, dt = Number.isFinite(w.dt) ? Math.max(0, w.dt) : 0;
  s.poiseGuard = Math.max(0, (s.poiseGuard || 0) - dt);
  if (!(s.broken > 0)) {
    if (s.hpSeen != null && hp < s.hpSeen && !(s.poiseGuard > 0)) { s.poiseHits = (s.poiseHits || 0) + 1; s.poiseIdle = 0; } else s.poiseIdle = (s.poiseIdle || 0) + dt;
    s.hpSeen = hp; if (s.poiseIdle >= BOSS_POISE.forget) s.poiseHits = 0;
    const need = P.hits[Math.min(P.hits.length - 1, s.poiseTier || 0)];
    if ((s.poiseHits || 0) < need || e.untargetable || e.retreating) { e.poiseBreak = 0; return false; }
    s.broken = P.breakTime; s.poiseHits = 0; s.poiseTier = (s.poiseTier || 0) + 1; if (s.attack) endAttack(e, s); s.tele = null; s.vel = null; w.release?.(e);
  }
  s.broken -= dt; s.hpSeen = hp; e.poiseBreak = Math.max(0, s.broken / P.breakTime);
  if (s.broken > 0) return true;
  s.broken = 0; e.poiseBreak = 0; s.poiseGuard = P.guard; return false;
}

// The dungeon Crystal settles where the Wayfarer can reach it (release 259; CRYSTAL.wallLinger etc.). It may pass through
// and linger in walls, but after wallLinger s off reachable floor it makes for the nearest reachable floor, and blinks
// onto it if something holds it back. Returns true while it is on its way (the tick is spent).
function crystalManifest(e, s, w) {
  if (!w.walkable) return false;
  const full = CRYSTAL.wallBudget, budget = Number.isFinite(s.wallBudget) ? s.wallBudget : full;
  if (w.walkable(e.x, e.y)) { s.wallBudget = Math.min(full, budget + w.dt * full / CRYSTAL.wallWindow); s.wallTime = 0; s.manifest = null; return false; }
  s.wallBudget = Math.max(0, budget - w.dt); s.wallTime = (s.wallTime || 0) + w.dt;
  if (!s.manifest) {
    if (s.wallTime < CRYSTAL.wallLinger && s.wallBudget > 0) return false; // release 285: the budget, as well as one stay's limit
    if (s.attack) endAttack(e, s); s.tele = null; s.evade = null; e.untargetable = false; e.hopLift = 0; // it breaks off whatever it was doing
    let best = null, bd = Infinity; const R = CRYSTAL.manifestSearch, cx = Math.round(e.x), cy = Math.round(e.y);
    for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) { const dd = Math.hypot(x - e.x, y - e.y); if (dd < bd && dd <= R && w.walkable(x, y)) { bd = dd; best = { x, y }; } }
    w.roamWork?.((2 * R + 1) ** 2);
    if (!best) return false;
    s.manifest = { ...best, stuck: 0 };
  }
  const to = s.manifest, dx = to.x - e.x, dy = to.y - e.y, d = Math.hypot(dx, dy), step = CRYSTAL.manifestSpeed * w.dt, ox = e.x, oy = e.y;
  if (Math.abs(dx) > .001) e.facingX = dx > 0 ? 1 : -1;
  if (d <= step + .02) { e.x = to.x; e.y = to.y; s.manifest = null; s.wallTime = 0; return true; }
  if (w.roamMove) w.roamMove(e, dx / d * step, dy / d * step); else w.move(e, dx / d * step, dy / d * step);
  to.stuck = Math.hypot(e.x - ox, e.y - oy) < step * .5 ? to.stuck + w.dt : 0;
  if (to.stuck >= CRYSTAL.manifestBlink) { w.addEffect?.({ kind: "blinkTrail", owner: e.id, x: e.x, y: e.y, radius: .7, arming: 0, life: .35, damage: 0 }); e.x = to.x; e.y = to.y; s.manifest = null; s.wallTime = 0; }
  return true;
}

// Wall-phasing remains Crystal-only. Hunter scheduling is separate from locomotion permissions.
export function isDungeonRoamer(e, area) { return area === "dungeon" && e?.worldBeast === "psychicCrystal"; }
export function isDungeonHunter(e, area) { return isDungeonRoamer(e, area) || (area === "dungeon" && e?.worldBeast === "voidWalker"); }

// Sample the whole dungeon domain, not its connected floor graph (Tim, release 259: unaggroed "he can just roam around the
// dungeon... whatever his own ends are"). Open destinations keep encounters discoverable, but travel between them phases
// through walls and hazards. Sampling and recent-memory are strictly bounded.
export function dungeonPatrolRoute(e, w, seq = 0, recent = []) {
  const size = w.width * w.height, count = Math.min(size, CRYSTAL.roamNodes), cells = [];
  if (!(count > 0)) return [];
  const offset = hashSeed(`${e.id}:dungeon-sample:${seq}`) % size;
  for (let i = 0; i < count; i++) {
    const k = (Math.floor(i * size / count) + offset) % size, x = k % w.width, y = Math.floor(k / w.width);
    if (x < 1 || y < 1 || x >= w.width - 1 || y >= w.height - 1 || !w.open(x, y)) continue;
    cells.push({ x, y });
  }
  w.roamWork?.(count);
  // Even an old save inside solid terrain can leave it without snapping or requiring a connected floor tile.
  if (!cells.length) for (const x of [Math.min(1, w.width - 1), Math.max(0, w.width - 2)]) for (const y of [Math.min(1, w.height - 1), Math.max(0, w.height - 2)]) cells.push({ x, y });
  const farthest = cells.reduce((n, c) => Math.max(n, distance(e, c)), 0);
  if (farthest < .001) return [];
  const far = cells.filter(c => distance(e, c) >= Math.min(CRYSTAL.roamDistance, farthest));
  const fresh = far.filter(c => recent.every(p => distance(c, p) >= CRYSTAL.roamDistance)), pool = fresh.length ? fresh : far;
  return [{ ...pool[hashSeed(`${e.id}:dungeon-patrol:${seq}`) % pool.length] }];
}
function patrolDungeon(e, s, w) {
  if (!(w.dt > 0) || !w.roamMove) return;
  const r = s.roam ||= { route: [], recent: [], seq: 0, wait: 0 };
  r.wait = Math.max(0, r.wait - w.dt); if (r.wait > 0) return;
  if (!r.route.length) {
    r.route = dungeonPatrolRoute(e, w, r.seq++, r.recent);
    if (!r.route.length) { r.wait = CRYSTAL.roamRetry; return; }
    r.recent.push({ ...r.route[r.route.length - 1] }); r.recent = r.recent.slice(-CRYSTAL.roamRecent);
  }
  const at = r.route[0], dx = at.x - e.x, dy = at.y - e.y, d = Math.hypot(dx, dy);
  if (d < .001) { r.route.shift(); if (!r.route.length) r.wait = CRYSTAL.roamPause; return; }
  const step = Math.min(d, CRYSTAL.roamSpeed * (e.speedMultiplier || 1) * w.dt), x = e.x, y = e.y;
  w.roamMove(e, dx / d * step, dy / d * step);
  if (Math.hypot(e.x - x, e.y - y) < step * .5) { r.route = []; r.wait = CRYSTAL.roamRetry; }
  if (Math.abs(dx) > .001) e.facingX = dx > 0 ? 1 : -1;
}

// One simulation step for a pack creature. `w` is the world adapter built by the game (or a test).
export function updatePackMonster(e, w) {
  if(e.kind === "voidWalker" && e.astralAllyOf && !w.astralAllyContext) { updateAstralWalkerAllyFixture(e,w.enemies.find(q=>q.id===e.astralAllyOf),w); return; }
  const def = packDefinition(e);
  if (!def) return;
  if (e.pack && w.dt > 0) { if (w.bossPace && bossPaced(e)) e.pack.paced = true; else delete e.pack.paced; } // release 421 (a paused frame changes nothing)
  if (e.kind === "astralWorm" || e.kind === "astralMirage") { if (w.dt > 0) updateAstralActor(e, w); return; }
  if (e.kind === "voidWalker" && !(w.dt > 0)) return;
  if (e.dead) { if (e.kind === "voidWalker") { voidClear(e, w); if (e.pack?.attack) endAttack(e, e.pack); } return; }
  const s = e.pack && e.pack.v === MONSTER_PACK_VERSION ? e.pack : (e.pack = freshPackState()), dt = w.dt;
  if (!s.orbitDir) s.orbitDir = hashSeed(`${e.id}:orbit`) % 2 ? 1 : -1;
  e.hitFlash = Math.max(0, (e.hitFlash || 0) - dt); e.scattered = Math.max(0, (Number(e.scattered) || 0) - dt); // release 249: a scatter is brief
  e.recoil = Math.max(0, (e.recoil || 0) - dt); e.hitStun = Math.max(0, (e.hitStun || 0) - dt); staggerGovernor(e, dt); // release 377
  for (const id of Object.keys(s.cd)) s.cd[id] = Math.max(0, s.cd[id] - dt);
  s.gap = Math.max(0, (s.gap || 0) - dt);
  if (e.kind === "voidWalker") {
    e.voidTeleport = Math.max(0, (e.voidTeleport || 0) - dt);
    if (e.retreating || e.fleeTo) {
      voidClear(e, w); if (s.attack) endAttack(e, s); s.voidEvade = null; s.tele = null;
      if (e.fleeTo) w.walkerRetreat?.(e, s);
      return;
    }
  }
  if (e.fleeTo) { fleeStep(e, s, w); return; }
  if (e.illusion && (w.now - (e.bornAt || 0)) > 14000) { e.dead = true; return; }
  const p = center(w.player), d = distance(p, e), brain = BRAINS[e.brain || def.brain], roaming = isDungeonRoamer(e, w.area), hunting = isDungeonHunter(e, w.area);
  // Release 287 (Tim: "the crystal doesn't have to aggro to you, he can just be wandering around... if you touch him, or if
  // you attack him, he'll aggro"): a roaming dungeon Crystal ignores the Wayfarer until touched or hurt (hits alert it).
  const calmCrystal = roaming && e.kind === "psychicCrystal";
  if (calmCrystal && !e.aggro) { if (d < CRYSTAL.touchAggro || (Number.isFinite(s.calmHp) && e.hp < s.calmHp)) e.aggro = true; s.calmHp = e.hp; }
  else if (!e.aggro && d < (hunting ? CRYSTAL.roamSight : brain?.hiddenUntilAggro ? 4.2 : 7) && (!hunting || w.los(e, w.player))) e.aggro = true;
  e.hidden = !!(brain?.hiddenUntilAggro && !e.aggro) || (s.attack === "burrowAmbush" && ["travel", "erupt"].includes(s.phase));
  if (!e.aggro) {
    if (hunting && e.kind === "voidWalker") { w.walkerPatrol?.(e, s); return; }
    if (roaming) { patrolDungeon(e, s, w); return; }
    s.wander = ((s.wander ?? (hashSeed(e.id) % 628) / 100) + dt / 2.4) % TAU;
    if (!brain?.hiddenUntilAggro) w.move(e, Math.cos(s.wander) * .28 * dt, Math.sin(s.wander * .8) * .28 * dt, { phase: false });
    return;
  }
  // Release 259: a dungeon Crystal that has lost the Wayfarer for a while goes back to its patrol.
  if (roaming && !e.retreating) { const seen = d <= CRYSTAL.roamSight || w.los(e, w.player); s.lostFor = seen ? 0 : (s.lostFor || 0) + dt; if (s.lostFor >= CRYSTAL.forgetAfter && !s.attack) { e.aggro = false; s.lostFor = 0; s.manifest = null; s.wallTime = 0; s.roam = null; patrolDungeon(e, s, w); return; } }
  if (e.hitStun > 0 && s.state === "move") return;
  if (e.hitStun > 0 && s.attack && !e.boss && s.phase === "windup" && !e.untargetable) { endAttack(e, s); return; }
  if (!e.illusion) passiveStillness(e, s, w);
  if (e.kind === "morphingBlob") blobPassive(e, s, w, p, d);
  if (e.kind === "lightningGiant") { giantPassive(e, w); if (giantTraverse(e, s, w)) return; }
  if (e.blobletOf && blobletHome(e, s, w)) return;
  if (e.wormOf && tentacleTurret(e, s, w, p)) return;
  if (e.kind === "tremorWorm" && wormCycle(e, s, w, p)) return;
  if (e.kind === "psychicCrystal" && crystalPoise(e, s, w, p)) return; // release 259: a poise break grounds it
  if (bossPoiseOf(e) && bossPoise(e, s, w)) return; // release 307: every boss can be staggered
  if (roaming && crystalManifest(e, s, w)) return; // release 285: before evading or attacking, so neither keeps it in the walls
  if (e.kind === "voidWalker" ? voidEvade(e, s, w, p, d) : e.evasive && evade(e, s, w, p, d)) return;
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
  const move = MOVEMENT_MODES[e.movement] || MOVEMENT_MODES.walk, raw = roaming && !w.los(e, w.player) ? { ...unit(p.x - e.x, p.y - e.y), speed: .95 } : brainVector(e, s, w, def), v = e.evasive ? fluid(s, raw, dt) : raw, m = Math.hypot(v.x, v.y) || 1, speed = .82 * v.speed * move.speed * (e.speedMultiplier || 1) * (e.giantCharged > 0 ? GIANT.chargeSpeed : 1) * dt;
  const moved = w.move(e, v.x / m * speed, v.y / m * speed, { phase: !!move.phases });
  if (!moved && !move.phases) w.detour?.(e, speed);
  e.facingX = (p.x - e.x) >= 0 ? 1 : -1;
  if (s.gap > 0) return;
  if (hunting && !w.los(e, w.player)) return; // move toward the player first; never begin a grab/sky attack from an unseen room
  const ready = availableAttacks(e).filter((id) => attackReady(e, s, w, id, d));
  if (!ready.length) return;
  const preferred = ready.filter((id) => id !== s.last), pool = preferred.length ? preferred : ready, id = pool[hashSeed(`${e.id}:pick:${s.seq}`) % pool.length];
  s.last = id; s.state = "attack";
  beginAttack(e, s, id, w);
}

// Returns true when this is a Walker effect. Each promised activation is one-shot and every lifetime is finite.
function tickVoidEffect(f, w, dt) {
  if (!f.kind.startsWith("void")) return false;
  const owner = liveVoidOwner(w, f); if (!owner) { f.life = 0; f.arming = 0; return true; }
  const p = center(w.player), before = { x: f.x, y: f.y };
  f.age = (f.age || 0) + dt;
  const waiting = Math.max(0, f.arming || 0), activeDt = Math.max(0, dt - waiting);
  f.arming = Math.max(0, waiting - dt);
  // Constellation movement and fixed-direction aim locking happen during the warning, not while a beam fires.
  if (f.kind === "voidRift" && f.tracking && !f.activated && f.age < f.activationAt - VOID.constellationLock) {
    const nx = p.x + f.offsetX, ny = p.y + f.offsetY;
    if (voidOpen(w, nx, ny)) { f.x = nx; f.y = ny; }
    f.angle = Math.atan2(p.y - f.y, p.x - f.x);
  }
  if (f.arming > 0 || !(activeDt > 0)) return true;
  f.elapsed = (f.elapsed || 0) + activeDt;
  if (f.kind === "voidRend") {
    if (f.variant === "slash") {
      const speed = Math.hypot(f.vx, f.vy), dir = unit(f.vx, f.vy), travel = speed * activeDt, length = voidRay(w, f, dir, travel);
      f.x += dir.x * length; f.y += dir.y * length;
      if (!f.hit && segmentDistance(p, before, f) <= f.radius + .3) { f.hit = true; voidHurt(w, owner, f.damage, "voidSlash"); f.life = 0; }
      if (length < travel) f.life = 0;
    } else if (!f.detonated) {
      f.detonated = true;
      f.detonatedNow = true;
      if (f.variant === "hand" || f.variant === "spike") {
        if (distance(p, f) <= f.radius + .3) voidHurt(w, owner, f.damage, f.variant === "hand" ? "voidHand" : "voidSpikes", f.variant === "spike");
      } else {
        const dir = { x: Math.cos(f.angle), y: Math.sin(f.angle) }, length = voidRay(w, f, dir, f.length), end = { x: f.x + dir.x * length, y: f.y + dir.y * length };
        f.length = length;
        if (segmentDistance(p, f, end) <= f.width + .3) voidHurt(w, owner, f.damage, f.variant === "claw" ? "voidClaw" : "voidSword");
      }
    }
  } else if (f.kind === "voidWraith") {
    f.slashFlash = Math.max(0, (f.slashFlash || 0) - activeDt);
    const dir = unit(f.vx, f.vy), travel = Math.hypot(f.vx, f.vy) * activeDt, length = voidRay(w, f, dir, travel);
    f.x += dir.x * length; f.y += dir.y * length;
    if (length < travel) { f.life = 0; return true; }
    if (f.slashes < VOID.wraithSlashes && f.elapsed >= f.nextSlash) {
      f.slashes++; f.nextSlash += VOID.wraithEvery; f.slashFlash = .22; f.slashedNow = true;
      if (segmentDistance(p, before, f) <= VOID.wraithReach + .3) voidHurt(w, owner, f.damage, "voidWraith");
    }
  } else if (f.kind === "voidBeam") {
    const dir = { x: Math.cos(f.angle), y: Math.sin(f.angle) };
    f.length = Math.min(f.length, voidRay(w, f, dir, VOID.beamLength));
    if (!f.hit && segmentDistance(p, f, { x: f.x + dir.x * f.length, y: f.y + dir.y * f.length }) <= f.width + .3) { f.hit = true; voidHurt(w, owner, f.damage, "voidBeam"); }
  } else if (f.kind === "voidRift") {
    if (f.tracking && !f.activated && f.age >= f.activationAt) {
      // Independent rifts can activate concurrently, but each has exactly one output.
      f.activated = true; f.life = Math.min(f.life, .7);
      if (f.output === "wraith") voidWraith(owner, w, f, p, VOID.beamWarn, f.damage);
      else if (f.output === "beam") voidBeam(owner, w, f, f.angle, f.damage);
      else if (voidTeleport(owner, w, f)) voidRend(owner, w, "claw", f, unit(p.x - f.x, p.y - f.y), VOID.rendWarn, f.damage);
    } else if (!f.tracking && f.emits < 2 && f.elapsed >= f.nextEmit) {
      f.emits++; f.nextEmit += VOID.riftEmitEvery;
      const variant = f.emits === 1 ? "slash" : "sword";
      voidRend(owner, w, variant, f, unit(p.x - f.x, p.y - f.y), VOID.rendWarn, f.damage);
    }
  } else if (f.kind === "voidHorizon") {
    f.pulseFlash = Math.max(0, (f.pulseFlash || 0) - activeDt);
    if (distance(p, f) <= f.radius) w.pull?.(f, VOID.horizonPull * activeDt, f.radius);
    if (distance(p, f) <= f.coreRadius + .3 && !(f.nextBite > f.elapsed)) { f.nextBite = f.elapsed + VOID.horizonTick; voidHurt(w, owner, f.damage, "voidHorizon"); }
    if (f.pulsar && f.pulses < f.pulseCount && f.elapsed >= f.nextPulse) {
      f.pulses++; f.nextPulse += VOID.pulsarEvery; f.pulseFlash = .22;
      voidBeam(owner, w, f, f.angle, f.damage, VOID.beamWarn);
    }
  } else if (f.kind === "voidNova") {
    f.stage = f.elapsed < VOID.novaCharge ? "charge" : f.wavesFired < f.waves ? "burst" : "aftermath";
    if (f.stage === "charge") {
      if (distance(p, f) <= f.radius) w.pull?.(f, VOID.novaPull * activeDt, f.radius);
      if (f.elapsed >= f.nextLocal) { f.nextLocal += VOID.novaLocalEvery; voidNovaEruption(f, owner, w); }
    } else {
      if (f.wavesFired < f.waves && f.elapsed >= f.nextWave) {
        const turn = f.wavesFired * Math.PI / VOID.novaParticles;
        f.wavesFired++; f.nextWave += VOID.novaWaveEvery;
        for (let i = 0; i < VOID.novaParticles; i++) {
          const a = turn + i * TAU / VOID.novaParticles;
          voidAdd(w, owner, { kind: "voidParticle", x: f.x, y: f.y, vx: Math.cos(a) * VOID.novaParticleSpeed, vy: Math.sin(a) * VOID.novaParticleSpeed,
            radius: VOID.novaParticleRadius, life: VOID.novaParticleLife, damage: f.damage, wave: f.wavesFired });
        }
      }
      if (f.elapsed >= f.nextAfter) { f.nextAfter += VOID.novaAfterEvery; voidNovaEruption(f, owner, w); }
    }
  } else if (f.kind === "voidParticle") {
    const dir = unit(f.vx, f.vy), travel = Math.hypot(f.vx, f.vy) * activeDt, length = voidRay(w, f, dir, travel);
    f.x += dir.x * length; f.y += dir.y * length;
    if (!f.hit && segmentDistance(p, before, f) <= f.radius + .3) { f.hit = true; voidHurt(w, owner, f.damage, "voidSupernova"); f.life = 0; }
    if (length < travel) f.life = 0;
  } else if (f.kind === "voidEruption") {
    if (!f.detonated) { f.detonated = true; f.detonatedNow = true; if (distance(p, f) <= f.radius + .3) voidHurt(w, owner, f.damage, "voidEruption", true); }
  } else if (f.kind === "voidAfterimage") {
    if (!f.hit && segmentDistance(p, f, { x: f.tx, y: f.ty }) <= f.radius + .3) { f.hit = true; voidHurt(w, owner, f.damage, "voidAfterimage"); }
  }
  if (w.bystander) voidBystander(f, w, owner, before);
  delete f.detonatedNow; delete f.slashedNow;
  f.life -= activeDt;
  return true;
}
// Free-for-all (owner rule 2026-10-21): a helping Walker's attacks, aimed at the Worm, also strike the player where
// they pass. Same geometry as the primary checks, with separate one-shot flags and bite clock for the bystander.
function voidBystander(f, w, owner, before) {
  const b = w.bystander, q = center(b.actor), hit = (source, jumpable = false) => { if (f.damage > 0) b.hurt(owner, f.damage, { jumpable, source, beam: true }); };
  if (f.kind === "voidRend") {
    if (f.variant === "slash") { if (!f.bystanderHit && segmentDistance(q, before, f) <= f.radius + .3) { f.bystanderHit = true; hit("voidSlash"); } }
    else if (f.detonatedNow) {
      if (f.variant === "hand" || f.variant === "spike") { if (distance(q, f) <= f.radius + .3) hit(f.variant === "hand" ? "voidHand" : "voidSpikes", f.variant === "spike"); }
      else { const dir = { x: Math.cos(f.angle), y: Math.sin(f.angle) }; if (segmentDistance(q, f, { x: f.x + dir.x * f.length, y: f.y + dir.y * f.length }) <= f.width + .3) hit(f.variant === "claw" ? "voidClaw" : "voidSword"); }
    }
  } else if (f.kind === "voidWraith") { if (f.slashedNow && segmentDistance(q, before, f) <= VOID.wraithReach + .3) hit("voidWraith"); }
  else if (f.kind === "voidBeam") { const dir = { x: Math.cos(f.angle), y: Math.sin(f.angle) }; if (!f.bystanderHit && segmentDistance(q, f, { x: f.x + dir.x * f.length, y: f.y + dir.y * f.length }) <= f.width + .3) { f.bystanderHit = true; hit("voidBeam"); } }
  else if (f.kind === "voidHorizon") { if (distance(q, f) <= f.coreRadius + .3 && !(f.bystanderBite > f.elapsed)) { f.bystanderBite = f.elapsed + VOID.horizonTick; hit("voidHorizon"); } }
  else if (f.kind === "voidParticle") { if (!f.bystanderHit && segmentDistance(q, before, f) <= f.radius + .3) { f.bystanderHit = true; hit("voidSupernova"); } }
  else if (f.kind === "voidEruption") { if (f.detonatedNow && distance(q, f) <= f.radius + .3) hit("voidEruption", true); }
  else if (f.kind === "voidAfterimage") { if (!f.bystanderHit && segmentDistance(q, f, { x: f.tx, y: f.ty }) <= f.radius + .3) { f.bystanderHit = true; hit("voidAfterimage"); } }
}
function voidNovaEruption(f, owner, w) {
  const n = f.eruptions++, a = hashSeed(`${owner.id}:${f.seed}:eruption:${n}`) % 628 / 100;
  const radius = Math.sqrt((hashSeed(`${owner.id}:${f.seed}:eruption-r:${n}`) % 100) / 100) * (f.radius - VOID.novaEruptionRadius);
  voidAdd(w, owner, { kind: "voidEruption", x: f.x + Math.cos(a) * radius, y: f.y + Math.sin(a) * radius, radius: VOID.novaEruptionRadius,
    arming: VOID.novaEruptionWarn, life: .35, damage: Math.max(1, Math.round(f.damage * .65)) });
}

// Follow-on prototype: predator only. Final-boss Revenants retain their progression profile.
// Release 377 (Tim, 2026-10-24: "the bosses with their poise... need to have more poise... so that they can't just get
// stagger locked... being able to stagger [them] for a while... is fine... But... I just wiped out an entire Revenant
// dungeon... just by stagger locking them"). The stagger governor: every second a boss-class foe (boss, elite, guardian,
// Gate Revenant, world beast) spends hit-stunned fills its meter; the meter drains `decay` per second while it is free.
// A full meter (`limit`, by class) clears the stun and grants `guard` seconds in which blows still land but no longer
// stun. Knockdowns (BOSS_POISE poise breaks) are separate and unchanged. Ordinary creatures keep their old stagger.
export const STAGGER_GOVERNOR = { limit: { revenant: .6, boss: .9, elite: 1.3 }, decay: .2, guard: 3 };
export function staggerClass(e) { return e?.gatePredator ? "revenant" : e?.boss || e?.worldBeast || e?.questingBeast || e?.farArrayBoss || ["gateWarden", "objectiveGuardian", "wingMiniboss", "finalBoss"].includes(e?.dungeonRole) ? "boss" : e?.eliteId || e?.elite ? "elite" : null; }
// Call after the frame's hit-stun countdown. Returns true while the foe is guarded (it shrugs stuns off).
export function staggerGovernor(e, dt) {
  const k = staggerClass(e); if (!k) return false;
  const G = STAGGER_GOVERNOR;
  if (e.staggerGuard > 0) { e.staggerGuard -= dt; e.hitStun = 0; if (e.staggerGuard <= 0) delete e.staggerGuard; return true; }
  if (e.hitStun > 0) e.staggerMeter = (e.staggerMeter || 0) + dt; else if (e.staggerMeter) { e.staggerMeter -= G.decay * dt; if (e.staggerMeter <= 0) delete e.staggerMeter; } // no field until there is something to count
  if (e.staggerMeter >= G.limit[k]) { delete e.staggerMeter; e.staggerGuard = G.guard; e.hitStun = 0; return true; }
  return false;
}
export const GATE_REVENANT = {
  spawnPerThousand: 24, legacySpawnPerThousand: 12,
  baseWalk: 2.4, chaseRatio: 1.5, hpFloor: 320, damageFloor: 40, beastShare: 2 / 3,
  referenceHits: 60, referenceLevelHp: 28, referenceDamageShare: .2,
  range: 6, ownerEffects: 16, step: .05, recover: .3, gap: .55,
  // Poise: stun accumulated within one exchange beyond `poise` seconds grants `unstoppable` seconds of
  // ignoring hit-stun, so rapid blows interrupt it but never lock it out of attacking.
  poise: .6, unstoppable: 2.4,
  breath: { warn: .4, duration: 1.4, every: .35, length: 7, width: .5, bite: .26 },
  burst: { warn: .32, count: 4, every: .18, speed: 6.2, life: 1.5, bite: .38 },
  lob: { warn: .35, count: 3, every: .22, flight: .8, radius: .85, bite: .55 },
  barrage: { warn: .5, count: 9, every: .13, flight: .85, radius: .8, bite: .36 },
  moves: ["burst", "lob", "wraith", "breath", "burst", "barrage"],
  // Release 271 (Tim, 2026-10-21: "When you get into a dungeon... it can be like two minutes, and then the gate revenants
  // start hunting you... It should be stalking... after about two minutes... hunting regardless of whether or not you
  // run into them"; "the gate revenant can borrow some of the crystal's behavior... hop between walls... it's more
  // aggressive... it should still not go to a place that you can't go"; "smart dodge behavior and... poise break").
  // In a dungeon it stalks at `stalkKeep` tiles for `huntAfter` s, turning on the Wayfarer at once if they come within
  // `stalkAggro` or wound it; then it hunts, passing through walls straight at them, and if it has been in rock for
  // `wallLinger` s it blinks to the nearest floor the Wayfarer can reach. Everywhere it slips some blows (`dodge`), and
  // `poiseBreak.hits` blows inside `poiseBreak.forget` s break it for `poiseBreak.time` s before it springs away.
  huntAfter: 120, stalkAggro: 3.5, stalkKeep: [5, 8], stalkSpeed: .55, wallLinger: 1.4, manifestSearch: 7, walkAround: 2.5,
  dodge: { chance: .45, cooldown: 2.2, time: .22, speed: 9, reach: 2.4, shotReach: 1.6 },
  poiseBreak: { hits: 8, forget: 3, time: 2.4, away: .38 },
};
export function tuneGatePredator(e, save, stats = {}) {
  if (!e.gatePredator || e.gateTuningVersion === 1) return e;
  const t = GATE_REVENANT, level = Math.max(1, Number(save.level) || 1), weapon = save.equipment?.[save.activeWeaponSlot];
  // Release 275: the Gate Revenant is held with the Stage 1 world beasts (stages.ts), from tier 13 until three Listeners.
  const ref = stageOneBeastReference(save, { level, perHit: Math.max(6, (Number(weapon?.power) || 6) + (Number(stats.meleeBonus) || 0)), maxHp: Number(save.maxHp) || 60, guard: Math.max(0, Math.min(.75, Number(stats.damageReduction) || 0)) });
  const hit = ref.perHit, guard = ref.guard;
  const oldMax = Math.max(1, Number(e.maxHp) || 1), missing = Math.max(0, oldMax - (Number.isFinite(e.hp) ? e.hp : oldMax));
  e.maxHp = Math.max(oldMax, t.hpFloor, Math.round((hit * t.referenceHits + ref.level * t.referenceLevelHp) * t.beastShare));
  e.hp = e.dead ? 0 : Math.max(1, e.maxHp - missing);
  e.damage = Math.max(e.damage, t.damageFloor, Math.round(ref.maxHp * t.referenceDamageShare / (1 - guard) * t.beastShare));
  e.gateTuningVersion = 1; return e;
}
function gateAdd(e, w, effect) {
  const fx = voidEffects(w);
  if (fx.length >= PACK_EFFECT_CAP || fx.filter(f => f.owner === e.id).length >= GATE_REVENANT.ownerEffects) return false;
  w.addEffect({ owner: e.id, gateOwned: true, life: .4, arming: 0, ...effect }); return true;
}
export function resetGateAttack(e, resetRoute = false) { if (e.gatePredator) { e.gateAttack = null; e.telegraph = 0; if (resetRoute && e.ai) { delete e.ai.gateStep; delete e.ai.gatePathRetry; } } }
function gateMove(e, w, dt, fraction = 1) {
  const p = w.player, d = Math.hypot(p.x - e.x, p.y - e.y);
  if (d < 1.4) return;
  const slow = e.glyphBaseSpeed > 0 ? Math.max(.05, Math.min(1, e.speedMultiplier / e.glyphBaseSpeed)) : 1;
  const step = Math.min(d - 1.4, GATE_REVENANT.baseWalk * GATE_REVENANT.chaseRatio * dt * fraction * slow);
  // Release 271: in a dungeon, straight through the walls; held back at the dungeon's edge, it paths around for `walkAround` s.
  if (e.gateWalkFor > 0) e.gateWalkFor = Math.max(0, e.gateWalkFor - dt);
  if (w.walkable && !(e.gateWalkFor > 0 && w.walkable(e.x, e.y))) { w.move(e, (p.x - e.x) / d * step, (p.y - e.y) / d * step, { phase: true }); return; }
  if (w.gateChase) { w.gateChase(e, step); return; }
  if (!w.los(e, p)) { w.detour?.(e, step); return; }
  w.move(e, (p.x - e.x) / d * step, (p.y - e.y) / d * step, { phase: false });
}
// Release 271: before it hunts, a dungeon Revenant keeps its distance (GATE_REVENANT.stalkKeep), through walls if need be.
function gateStalk(e, w, dt, d) {
  const G = GATE_REVENANT, p = w.player, [near, far] = G.stalkKeep; if (!(d > 0)) return;
  const sign = d > far ? 1 : d < near ? -1 : 0; if (!sign) return;
  const step = G.baseWalk * G.stalkSpeed * dt; e.facingX = p.x >= e.x ? 1 : -1;
  w.move(e, (p.x - e.x) / d * step * sign, (p.y - e.y) / d * step * sign, { phase: true });
}
// After GATE_REVENANT.wallLinger s inside rock it blinks to the nearest floor the Wayfarer can reach. Returns true on the blink.
function gateManifest(e, w, dt) {
  if (w.walkable(e.x, e.y)) { e.gateWallTime = 0; return false; }
  e.gateWallTime = (e.gateWallTime || 0) + dt; if (e.gateWallTime < GATE_REVENANT.wallLinger) return false;
  let best = null, bd = Infinity; const R = GATE_REVENANT.manifestSearch, cx = Math.round(e.x), cy = Math.round(e.y), p = w.player;
  for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) { if (!w.walkable(x, y)) continue; const dd = Math.hypot(x - e.x, y - e.y) + Math.hypot(x - p.x, y - p.y) * .5; if (dd < bd) { bd = dd; best = { x, y }; } }
  w.roamWork?.((2 * R + 1) ** 2); e.gateWallTime = 0;
  if (!best) return false;
  w.addEffect?.({ kind: "blinkTrail", owner: e.id, x: e.x, y: e.y, radius: .8, arming: 0, life: .35, damage: 0 }); e.x = best.x; e.y = best.y; return true;
}
// Smart dodge: a blow or a shot about to land may be slipped, sideways, with a cooldown.
function gateDodge(e, w, d, dt) {
  const G = GATE_REVENANT.dodge; e.gateDodgeAt = (e.gateDodgeAt || 0) - dt; if (e.gateDodgeAt > 0 || e.gateAttack?.phase === "active") return false;
  const swing = w.playerSwinging && d < G.reach, shot = (w.playerShots || []).some((q) => !q.dead && !q.hostile && Math.hypot(q.x - e.x - .5, q.y - e.y - .45) < G.shotReach);
  if (!swing && !shot) return false;
  e.gateDodgeAt = G.cooldown; const n = (e.gateDodges = (e.gateDodges || 0) + 1);
  if (hashSeed(`${e.id}:gate-dodge:${n}`) % 100 >= G.chance * 100) return false;
  const away = unit(e.x - w.player.x, e.y - w.player.y), side = n % 2 ? 1 : -1;
  e.gateEvade = { ...unit(-away.y * side + away.x * .3, away.x * side + away.y * .3), t: G.time }; e.untargetable = true; resetGateAttack(e);
  return true;
}
// Poise break: enough blows in quick succession knock it down, open to harm, before it springs away.
function gatePoiseBreak(e, w, dt) {
  const G = GATE_REVENANT.poiseBreak, hp = Number(e.hp) || 0;
  if (e.gateHpSeen != null && hp < e.gateHpSeen) { e.gatePoiseHits = (e.gatePoiseHits || 0) + 1; e.gatePoiseIdle = 0; } else e.gatePoiseIdle = (e.gatePoiseIdle || 0) + dt;
  e.gateHpSeen = hp; if (e.gatePoiseIdle >= G.forget) e.gatePoiseHits = 0;
  if (!(e.gateBroken > 0) && (e.gatePoiseHits || 0) >= G.hits) { e.gateBroken = G.time; e.gatePoiseHits = 0; resetGateAttack(e); e.gateEvade = null; e.untargetable = false; e.aggro = true; }
  if (!(e.gateBroken > 0)) return false;
  e.gateBroken -= dt; e.hitStun = 0;
  if (e.gateBroken > 0) return true;
  e.gateBroken = 0; const away = unit(e.x - w.player.x, e.y - w.player.y); e.gateEvade = { ...away, t: G.away }; e.untargetable = true; e.gateDodgeAt = GATE_REVENANT.dodge.cooldown;
  return true;
}
function gateEmit(e, a, w) {
  const t = GATE_REVENANT, dir = unit(a.target.x - e.x, a.target.y - e.y);
  if (a.move === "wraith") { if (a.emitted++) return; if (voidEffects(w).filter(f => f.owner === e.id).length + 2 > t.ownerEffects) return; START.voidWraiths(e, { data: { target: a.target }, seq: a.seq }, w); return; }
  if (a.move === "breath") {
    if (a.emitted++) return;
    gateAdd(e, w, { kind: "gateBreath", x: e.x, y: e.y, dx: dir.x, dy: dir.y, length: t.breath.length, radius: t.breath.width, life: t.breath.duration, nextBite: 0, damage: Math.ceil(e.damage * t.breath.bite) }); return;
  }
  const cfg = t[a.move], i = a.emitted++;
  if (a.move === "burst") {
    // Fixed aim and small fan; no homing. Simultaneous final pair still obeys the owner budget.
    for (const angle of i === cfg.count - 1 ? [-.12, .12] : [0]) {
      const dx = dir.x * Math.cos(angle) - dir.y * Math.sin(angle), dy = dir.x * Math.sin(angle) + dir.y * Math.cos(angle);
      gateAdd(e, w, { kind: "orb", fire: true, x: e.x, y: e.y, vx: dx * cfg.speed, vy: dy * cfg.speed, radius: .22, life: cfg.life, damage: Math.ceil(e.damage * cfg.bite) });
    }
  } else {
    const angle = i * 2.39996 + (a.seq % 7), radius = a.move === "barrage" ? 1.1 + i % 3 : .8 * i;
    const target = { x: a.target.x + Math.cos(angle) * radius, y: a.target.y + Math.sin(angle) * radius };
    // Lob across open ground only; an intervening wall cannot be bombed through.
    if (w.open(target.x, target.y) && w.los(e, target, true)) gateAdd(e, w, { kind: "lavaBomb", x: target.x, y: target.y, from: { x: e.x, y: e.y }, radius: cfg.radius, arming: cfg.flight, armTotal: cfg.flight, damage: Math.ceil(e.damage * cfg.bite), jumpable: true });
  }
}
export function updateGatePredator(e, w) {
  if (!e.gatePredator || e.dead || !(w.dt > 0)) return;
  // Bounded fixed substeps, never catch up a suspended tab with a burst of untelegraphed attacks.
  let remaining = Math.min(w.dt, .25);
  while (remaining > 1e-8) {
    const dt = Math.min(GATE_REVENANT.step, remaining); remaining -= dt;
    e.hitFlash = Math.max(0, (e.hitFlash || 0) - dt); e.hitStun = Math.max(0, (e.hitStun || 0) - dt); staggerGovernor(e, dt); // release 377: never locked
    const inDungeon = !!w.walkable, G = GATE_REVENANT;
    if (gatePoiseBreak(e, w, dt)) continue; // release 271
    if (e.gateEvade) { const v = e.gateEvade; w.move(e, v.x * G.dodge.speed * dt, v.y * G.dodge.speed * dt, { phase: inDungeon }); v.t -= dt; if (v.t <= 0) { e.gateEvade = null; e.untargetable = false; } continue; }
    const distance = Math.hypot(w.player.x - e.x, w.player.y - e.y);
    if (!e.aggro) {
      const hunting = inDungeon && (w.dungeonClock || 0) >= G.huntAfter, wounded = e.hp < e.maxHp;
      if (hunting || wounded || distance < (inDungeon ? G.stalkAggro : 6)) e.aggro = true;
      else { if (inDungeon) gateStalk(e, w, dt, distance); continue; }
    }
    if (gateDodge(e, w, distance, dt)) continue;
    if (inDungeon && gateManifest(e, w, dt)) continue;
    e.facingX = w.player.x >= e.x ? 1 : -1;
    e.gateUnstoppable = Math.max(0, (e.gateUnstoppable || 0) - dt);
    if (e.gateUnstoppable > 0) e.hitStun = 0;
    if (e.hitStun > 0) {
      e.gateStunned = (e.gateStunned || 0) + dt;
      if (e.gateStunned >= GATE_REVENANT.poise) { e.hitStun = 0; e.gateStunned = 0; e.gateUnstoppable = GATE_REVENANT.unstoppable; }
      else { resetGateAttack(e); e.gateGap = .4; continue; }
    } else if (!e.gateAttack && e.gateGap <= 0) e.gateStunned = 0;
    e.gateGap = Math.max(0, (e.gateGap || 0) - dt);
    let a = e.gateAttack;
    if (!a) {
      gateMove(e, w, dt);
      if (e.gateGap > 0 || distance > GATE_REVENANT.range || !w.los(e, w.player, true)) continue;
      const seq = e.gateSequence || 0, move = GATE_REVENANT.moves[seq % GATE_REVENANT.moves.length]; e.gateSequence = seq + 1;
      const cfg = GATE_REVENANT[move], warn = (move === "wraith" ? ATTACK_MODULES.voidWraiths.windup : cfg.warn) * (w.bossPace ? BOSS_PACE.windup : 1); // release 421
      a = e.gateAttack = { move, seq, target: { x: w.player.x, y: w.player.y }, phase: "warn", left: warn, emitted: 0, emitIn: 0 };
      e.telegraph = warn; continue;
    }
    if (a.phase !== "recover" && a.move !== "barrage") gateMove(e, w, dt, a.phase === "warn" || a.move === "breath" ? .85 : 1);
    a.left -= dt;
    if (a.phase === "warn") {
      e.telegraph = Math.max(0, a.left);
      if (a.left > 0) continue;
      a.phase = "active"; const cfg = GATE_REVENANT[a.move];
      a.left = a.move === "wraith" ? .05 : a.move === "breath" ? cfg.duration : (cfg.count - 1) * cfg.every + .05;
    }
    if (a.phase === "active") {
      const cfg = GATE_REVENANT[a.move]; a.emitIn -= dt;
      if (a.emitIn <= 0 && a.emitted < (cfg?.count || 1)) { gateEmit(e, a, w); a.emitIn += cfg?.every || 99; }
      if (a.left <= 0) { a.phase = "recover"; a.left = GATE_REVENANT.recover; }
    } else if (a.phase === "recover") {
      gateMove(e, w, dt);
      if (a.left <= 0) { resetGateAttack(e); e.gateGap = GATE_REVENANT.gap * (w.bossPace ? BOSS_PACE.gap : 1); } // release 421
    }
  }
}
function tickGateEffect(f, w) {
  if (!f.gateOwned) return false;
  const owner = w.enemies.find(e => e.id === f.owner && !e.dead);
  if (!owner) { f.life = 0; f.arming = 0; return true; }
  if (f.kind === "lavaBomb") return false; // generic arc warning and single detonation
  const dt = Math.min(w.dt, .25), p = center(w.player);
  if (f.kind === "orb") {
    const dir = unit(f.vx, f.vy), travel = Math.hypot(f.vx, f.vy) * dt, length = voidRay(w, f, dir, travel), old = { x: f.x, y: f.y };
    f.x += dir.x * length; f.y += dir.y * length;
    if (segmentDistance(p, old, f) <= f.radius + .3) { w.hurt(owner, f.damage, { source: "gateFireball", jumpable: false }); f.life = 0; }
    if (length < travel) f.life = 0;
  } else if (f.kind === "gateBreath") {
    f.x = owner.x; f.y = owner.y;
    f.length = voidRay(w, f, { x: f.dx, y: f.dy }, GATE_REVENANT.breath.length);
    f.nextBite -= dt;
    if (f.nextBite <= 0) { f.nextBite = GATE_REVENANT.breath.every; if (segmentDistance(p, f, { x: f.x + f.dx * f.length, y: f.y + f.dy * f.length }) < f.radius + .3) w.hurt(owner, f.damage, { source: "gateBreath", jumpable: false, beam: true }); }
  }
  f.life -= dt; return true;
}

// Ground effects: arming, detonation (once, if the player is inside), webs that slow, and rings.
export function tickPackEffects(effects, w) {
  if (!(w.dt > 0)) return effects;
  const p = center(w.player);
  // New effects wait until the next tick: an emitter cannot recursively simulate its own new outputs this frame.
  for (const f of [...effects]) {
    if (tickGateEffect(f, w)) continue;
    if (tickVoidEffect(f, w, w.dt)) continue;
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
    else if (f.kind === "flameTrail") { // release 241: fire left by the Turtle's dash; it burns while it lasts
      if (distance(p, f) <= f.radius + .1 && !(f.nextBite > f.age)) { f.nextBite = f.age + TURTLE.fireTick; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: true, source: "flameTrail", beam: true }); }
    } else if (f.kind === "frostTrail") { // ice left behind: it stings and slows, then bursts (a comet's frost does not burst)
      if (distance(p, f) <= f.radius + .1) { w.slow(TURTLE.iceSlow, .3); if (!(f.nextBite > f.age)) { f.nextBite = f.age + TURTLE.iceTick; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: true, source: "frostTrail", beam: true }); } }
      if (f.burst && !f.burstDone && f.life - w.dt <= 0) { f.burstDone = true; if (distance(p, f) <= TURTLE.iceBurstRadius + .2) w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.burst, { jumpable: false, source: "iceBurst" }); w.addEffect({ kind: "iceBurst", owner: f.owner, x: f.x, y: f.y, radius: TURTLE.iceBurstRadius, arming: 0, life: .45, total: .45, damage: 0 }); }
    } else if (f.kind === "twister") { // a small tornado flung off the spin: it wanders, stings and slows until it blows out
      f.wander = (f.wander || 0) + Math.sin(f.age * 1.7 + f.x) * w.dt * 1.2;
      const sp = Math.hypot(f.vx || 0, f.vy || 0) || TURTLE.twisterSpeed, nx = f.x + Math.cos(f.wander) * sp * w.dt, ny = f.y + Math.sin(f.wander) * sp * w.dt;
      if (!w.tileOpen || w.tileOpen(nx + .5, ny + .5)) { f.x = nx; f.y = ny; } else f.wander += Math.PI * .75;
      if (distance(p, f) <= f.radius + .2) { w.slow(TURTLE.twisterSlow, .4); if (!(f.nextBite > f.age)) { f.nextBite = f.age + TURTLE.twisterTick; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: false, source: "twister", beam: true }); } }
      if (!w.enemies.some((q) => q.id === f.owner && !q.dead) && f.life > .5) f.life = .5; // they blow out when the Turtle is gone
    } else if (f.kind === "comet") { // the ice comet: it flies to where it was aimed and bursts there (or on whoever it meets)
      const nx = f.x + f.vx * w.dt, ny = f.y + f.vy * w.dt, hit = distance(p, f) <= f.radius + .3, wall = w.tileOpen && !w.tileOpen(nx + .5, ny + .5);
      if (!hit && !wall && f.life - w.dt > 0) { f.x = nx; f.y = ny; }
      else {
        const owner = w.enemies.find((q) => q.id === f.owner) || null;
        if (distance(p, f) <= TURTLE.cometBlast + .2) w.hurt(owner, f.damage, { jumpable: false, source: "turtleComet" });
        w.addEffect({ kind: "iceBurst", owner: f.owner, x: f.x, y: f.y, radius: TURTLE.cometBlast, arming: 0, life: .55, total: .55, damage: 0 });
        w.addEffect({ kind: "frostTrail", owner: f.owner, x: f.x, y: f.y, radius: TURTLE.cometFrost, arming: 0, life: TURTLE.cometFrostLife, total: TURTLE.cometFrostLife, damage: f.frost, burst: 0 });
        f.life = 0; continue;
      }
    } else if (f.kind === "orbital") { // the Crystal's sky beams trace patterns around a centre that pursues the Wayfarer
      const owner = w.enemies.find((q) => q.id === f.owner && !q.dead && !q.retreating) || null;
      if (!owner) { f.life = Math.min(f.life, .3) - w.dt; continue; }
      const previous = { x: f.x, y: f.y }, anchor = f.anchor ||= { ...previous }, d = distance(p, anchor), sp = CRYSTAL.orbitalSpeed * w.dt;
      if (d > .05) { anchor.x += (p.x - anchor.x) / d * Math.min(d, sp); anchor.y += (p.y - anchor.y) / d * Math.min(d, sp); }
      f.elapsed = (f.elapsed || 0) + w.dt;
      const offset = crystalOrbitalOffset(f.pattern, f.phase || 0, f.elapsed);
      f.x = anchor.x + offset.x; f.y = anchor.y + offset.y;
      if (segmentDistance(p, previous, f) <= f.radius + .1 && !(f.nextBite > f.age)) { f.nextBite = f.age + CRYSTAL.orbitalTick; w.hurt(owner, f.damage, { jumpable: false, source: "psyOrbital", beam: true }); }
      if (!(f.nextScorch > f.age)) {
        f.nextScorch = f.age + CRYSTAL.scorchEvery;
        const marks = effects.filter((q) => q.kind === "scorch" && q.owner === f.owner && q.life > 0);
        // Decoration must never evict a live projectile or an armed warning from the shared effect budget.
        if (marks.length < CRYSTAL.scorchMax && effects.length < PACK_EFFECT_CAP) w.addEffect({ kind: "scorch", owner: f.owner, x: f.x, y: f.y, radius: CRYSTAL.scorchRadius, arming: 0, life: CRYSTAL.scorchLife, total: CRYSTAL.scorchLife, damage: 0 });
      }
    } else if (f.kind === "scorch") { /* harmless marks only; they fade within 1.5 seconds */
    } else if (f.kind === "nanoOrb") { // circling the Knight until sent; then homing for a moment, then straight
      const owner = w.enemies.find((q) => q.id === f.owner && !q.dead);
      if (f.state === "circle") {
        if (!owner || owner.retreating) { f.life = 0; continue; }
        f.orbit += KNIGHT.orbSpin * w.dt; f.x = owner.x + Math.cos(f.orbit) * KNIGHT.orbOrbit; f.y = owner.y + Math.sin(f.orbit) * KNIGHT.orbOrbit * .7; f.life = 99;
        // A mist dodge may interrupt the gather. Finish the promised float, then launch rather than orbit forever.
        if (owner.pack?.attack !== "knightOrbs" && f.age >= KNIGHT.orbFloat) launchKnightOrb(f, p);
      }
      else {
        if (f.homeFor > 0) { const turnTime = Math.min(f.homeFor, w.dt); f.homeFor = Math.max(0, f.homeFor - w.dt); const want = Math.atan2(p.y - f.y, p.x - f.x), cur = Math.atan2(f.vy, f.vx), diff = ((want - cur) % TAU + TAU * 1.5) % TAU - Math.PI, a = cur + Math.max(-KNIGHT.orbTurn * turnTime, Math.min(KNIGHT.orbTurn * turnTime, diff)); f.vx = Math.cos(a) * KNIGHT.orbSpeed; f.vy = Math.sin(a) * KNIGHT.orbSpeed; }
        if (!(f.homeFor > 0)) f.state = "straight";
        f.x += f.vx * w.dt; f.y += f.vy * w.dt;
        if (w.shotBlocked ? w.shotBlocked(f.x + .5, f.y + .5) : w.tileOpen && !w.tileOpen(f.x + .5, f.y + .5)) f.life = 0; // release 421: builds stop them too
        else if (distance(p, f) <= f.radius + .3) { f.life = 0; w.hurt(owner || null, f.damage, { jumpable: false, source: "knightOrb" }); }
      }
    } else if (f.kind === "missile") { // homing; bursts on whatever it meets, or by itself when its fuel runs out
      if (f.age <= KNIGHT.missileHome) { const want = Math.atan2(p.y - f.y, p.x - f.x), cur = Math.atan2(f.vy, f.vx), diff = ((want - cur) % TAU + TAU * 1.5) % TAU - Math.PI, a = cur + Math.max(-KNIGHT.missileTurn * w.dt, Math.min(KNIGHT.missileTurn * w.dt, diff));
      f.vx = Math.cos(a) * KNIGHT.missileSpeed; f.vy = Math.sin(a) * KNIGHT.missileSpeed; } // release 421: then straight
      const nx = f.x + f.vx * w.dt, ny = f.y + f.vy * w.dt, wall = w.shotBlocked ? w.shotBlocked(nx + .5, ny + .5) : w.tileOpen && !w.tileOpen(nx + .5, ny + .5), hit = distance(p, f) <= f.radius + .35;
      if (!wall && !hit && f.life - w.dt > 0) { f.x = nx; f.y = ny; }
      else { if (distance(p, f) <= KNIGHT.missileBlast + .2) w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: false, source: "knightMissile" }); w.addEffect({ kind: "nanoBurst", owner: f.owner, x: f.x, y: f.y, radius: KNIGHT.missileBlast, arming: 0, life: .4, total: .4, damage: 0 }); f.life = 0; continue; }
    } else if (f.kind === "debris" && f.medium === "water") {
      tickCrystalWater(f, w, p); // separate material, identical volley timing and damage; no terrain mutation
    } else if (f.kind === "debris") { // release 249: stones the Crystal lifts, circling it until thrown
      const owner = w.enemies.find((q) => q.id === f.owner && !q.dead);
      if (f.state === "lift") { if (!owner) { f.life = 0; continue; } f.orbit += 1.4 * w.dt; f.x = owner.x + Math.cos(f.orbit) * CRYSTAL.debrisOrbit; f.y = owner.y + Math.sin(f.orbit) * CRYSTAL.debrisOrbit * .6; f.lift = Math.min(CRYSTAL.debrisRise, (f.lift || 0) + w.dt * 1.5); f.life = 99; }
      else { f.x += f.vx * w.dt; f.y += f.vy * w.dt; if (w.tileOpen && !w.tileOpen(f.x + .5, f.y + .5)) f.life = 0; else if (distance(p, f) <= f.radius + .3) { f.life = 0; w.hurt(owner || null, f.damage, { jumpable: false, source: "psyDebris" }); } }
    } else if (f.kind === "psyWall") { if (!w.enemies.some((q) => q.id === f.owner && !q.dead) && f.life > .3) f.life = .3;
    } else if (f.kind === "nanoBurst" || f.kind === "swordArc" || f.kind === "swordBeam" || f.kind === "psyRing") { /* drawn only */
    } else if (f.kind === "iceBurst") { /* the shatter, drawn only */ }
    else if (f.kind === "furrow") { /* release 239: the fleeing worm's wake; harmless, it only fades */ }
    else if (f.kind === "flesh") { if (distance(p, f) <= f.radius) { w.slow(f.slow || .55, .25); if (!(f.nextBite > f.age)) { f.nextBite = f.age + .8; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: false, source: "fleshBloom", beam: true }); } } }
    else if (f.kind === "giantArc") { // Tesla arcs: linked to the Giant, they hurt while you stay within reach and sight
      const owner = w.enemies.find((q) => q.id === f.owner && !q.dead);
      if (!owner) { f.life = 0; continue; }
      f.x = owner.x; f.y = owner.y; f.tx = p.x; f.ty = p.y;
      f.connected = distance(p, center(owner)) <= f.range && (!w.los || w.los(owner, w.player));
      f.tick -= w.dt;
      if (f.connected && f.tick <= 0) { f.tick = GIANT.arcTick; if (w.hurt(owner, f.damage, { jumpable: false, source: "giantArcs", beam: true }) && !f.counted) { f.counted = true; w.shockHit?.(); } } // one pip per arc attack
    }
    else if (f.kind === "giantBolt") {
      const before = { x: f.x, y: f.y }; f.x += f.vx * w.dt; f.y += f.vy * w.dt;
      if (w.tileOpen && !w.tileOpen(f.x + .5, f.y + .5)) f.life = 0;
      else if (!f.hit && segmentDistance(p, center(before), center(f)) <= f.radius + .3) { f.hit = true; f.life = 0; giantZap(w, w.enemies.find((q) => q.id === f.owner), f.damage, "giantBolt"); }
    }
    else if (f.kind === "giantShock") {
      if (!f.detonated) { f.detonated = true; if (distance(p, f) <= f.radius + .3) giantZap(w, w.enemies.find((q) => q.id === f.owner), f.damage, "giantShock"); }
    }
    else if (f.kind === "giantSky") { if (!f.detonated) { f.detonated = true; if (f.damage > 0 && distance(p, f) <= f.radius + .3) giantZap(w, w.enemies.find((q) => q.id === f.owner), f.damage, "giantSky"); } }
    else if (f.kind === "orb") { f.x += f.vx * w.dt; f.y += f.vy * w.dt; if (w.tileOpen && !w.tileOpen(f.x + .5, f.y + .5)) f.life = 0; else if (!f.hit && distance(p, f) <= f.radius + .3) { f.hit = true; f.life = 0; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: false, source: "orb" }); } }
    else if (f.kind === "shock") { const total = f.total ??= f.life ?? .8, r = f.radius * (1 - Math.max(0, f.life ?? total) / total); f.ring = r; if (!f.hit && f.damage > 0 && Math.abs(distance(p, f) - r) < .5) { f.hit = true; if (w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: true, source: "shockwave" }) && f.lightning) w.shockHit?.(); } }
    else if (!f.detonated) { f.detonated = true; f.life ??= .4; if (f.damage > 0 && distance(p, f) <= f.radius + .3) w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: !!f.jumpable, source: f.kind }); }
    f.life = (f.life ?? .4) - w.dt;
  }
  return effects.filter((f) => f.arming > 0 || f.life > 0);
}

function crystalSplash(f) {
  // Reuse this projectile's budget slot. A splash is cosmetic and cannot hit again or create more effects.
  Object.assign(f, { state: "splash", life: CRYSTAL.waterSplashLife, total: CRYSTAL.waterSplashLife, damage: 0, vx: 0, vy: 0 });
}
function tickCrystalWater(f, w, p) {
  if (f.state === "splash") return;
  const owner = w.enemies.find((q) => q.id === f.owner && !q.dead && !q.retreating && !q.fleeTo);
  if (f.state === "lift") {
    if (!owner || owner.pack?.attack !== "psyDebris") { crystalSplash(f); return; }
    f.orbit += 1.4 * w.dt;
    f.x = owner.x + Math.cos(f.orbit) * CRYSTAL.debrisOrbit; f.y = owner.y + Math.sin(f.orbit) * CRYSTAL.debrisOrbit * .6;
    f.lift = Math.min(CRYSTAL.debrisRise, (f.lift || 0) + w.dt * 1.5); f.life = 99;
    return;
  }
  const open = w.marineProjectileOpen || w.projectileOpen || w.tileOpen, start = { x: f.x, y: f.y };
  if (open && !open(f.x + .5, f.y + .5)) { crystalSplash(f); return; }
  // Sweep only its remaining lifetime, in bounded substeps. It neither tunnels across a wall nor dies on open sea.
  const dt = Math.min(w.dt, Math.max(0, f.life)), dx = (f.vx || 0) * dt, dy = (f.vy || 0) * dt;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / CRYSTAL.waterStep));
  for (let i = 1; i <= steps; i++) {
    const next = { x: start.x + dx * i / steps, y: start.y + dy * i / steps }, before = { x: f.x, y: f.y };
    if (open && !open(next.x + .5, next.y + .5)) { crystalSplash(f); return; }
    f.x = next.x; f.y = next.y;
    if (segmentDistance(p, before, f) <= f.radius + .3) { w.hurt(owner || null, f.damage, { jumpable: false, source: "psyDebris" }); crystalSplash(f); return; }
  }
  if (f.life <= w.dt) crystalSplash(f);
}

export const PACK_EFFECT_CAP = 48;
export function addPackEffect(effects, effect, now = 0) {
  while (effects.length >= PACK_EFFECT_CAP) {
    // Discard the Crystal's cosmetic trail or spent water before a combat effect needs that slot.
    const scorch = effects.findIndex((f) => f.kind === "scorch" || f.kind === "debris" && f.medium === "water" && f.state === "splash");
    effects.splice(scorch < 0 ? 0 : scorch, 1);
  }
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

// Astral-owned helper adapter, shared by explicit fixtures and the narrow natural ally role.
// An ally's effect list and damage callbacks cannot enter the hostile player's effect pipeline.
// Owner rules 2026-10-21: a helping Walker never rides; the Worm sometimes turns on him; his attacks also hit the
// player where they pass, and the player's attacks hit him; after losing ASTRAL_WALKER_ALLY.leaveShare of his health
// he leaves, fading out over ASTRAL_WALKER_ALLY.leaveTime without rewards.
export const ASTRAL_WALKER_ALLY = Object.freeze({ leaveShare: .5, leaveTime: .8 });
export function updateAstralWalkerAllyFixture(ally, target, world) {
  ally.noRewards = true;
  if (ally.astralAllyLeaving != null) {
    ally.untargetable = true; ally.astralAllyEffects = []; ally.fleeFade = ally.astralAllyLeaving;
    ally.astralAllyLeaving = Math.max(0, ally.astralAllyLeaving - (world.dt || 0) / ASTRAL_WALKER_ALLY.leaveTime);
    if (!ally.astralAllyLeaving) { ally.dead = true; ally.hp = Math.max(1, ally.hp); }
    return;
  }
  if (!ally.dead && ally.maxHp > 0 && ally.hp <= ally.maxHp * (1 - ASTRAL_WALKER_ALLY.leaveShare)) { ally.astralAllyLeaving = 1; ally.untargetable = true; ally.astralAllyEffects = []; return; }
  if (!target || target.kind !== 'astralWorm' || target.dead || target.hp <= 0 || target.retreating || target.fleeTo || target.astral?.terminated || ally.dead || (world.playerDeathFinal?world.playerDeathFinal():world.player.hp <= 0)) {
    ally.astralAllyEffects = []; ally.dead = true; ally.hp = 0; return;
  }
  ally.aggro = true; ally.astralAllyOf = target.id;
  const effects = ally.astralAllyEffects ||= [];
  // Reserve one worm descriptor; later growth of the shared list cannot exceed the combined cap.
  effects.length=Math.min(effects.length,Math.max(0,PACK_EFFECT_CAP-1-(world.effects?.().length||0)));
  const wrapped = { ...world, astralAllyContext:true, player: target, playerVelocity: {x:0,y:0}, playerShots: [], playerBlasts: [], playerSwinging:false,
    enemies: [ally,target], sanctuary:null, effects:()=>effects,
    addEffect: effect => { if(effects.length+(world.effects?.().length||0)<PACK_EFFECT_CAP-1) addPackEffect(effects,effect,world.now); },
    hurt(source,amount) { if(target.dead||target.retreating||target.untargetable||!(amount>0))return false; target.hp=Math.max(0,target.hp-amount); if(target.hp<=0)target.dead=true; if(target.astral)target.astral.hp=target.hp; return true; },
    // No borrowed callbacks which close over the real player, boat, or terrain are allowed here.
    consumeVoidTerrain:()=>({changed:false}), pull:()=>false, push:()=>false, grab:()=>false, held:()=>false,
    release:()=>{}, poison:()=>{}, slow:()=>{}, detour(e,speed) { const dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy)||1;world.move(e,dx/d*speed,dy/d*speed); },
    spawnIllusion:()=>null, spawnMinion:()=>null, walkerPatrol:()=>{}, walkerRetreat:()=>{},
    bystander: { actor: world.player, hurt: (source, amount, opts) => (world.playerDeathFinal ? world.playerDeathFinal() : world.player.hp <= 0) ? false : world.hurt(source, amount, opts) },
  };
  updatePackMonster(ally,wrapped);
  ally.astralAllyEffects=tickPackEffects(effects,wrapped);
  // Free-for-all: the player's blows land on the helper too.
  ally.untargetable=false;
  if(target.hp<=0){ally.astralAllyEffects=[];ally.dead=true;ally.hp=0;}
}
