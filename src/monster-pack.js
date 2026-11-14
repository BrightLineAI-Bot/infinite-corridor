import { HAUNT, GLOOM_FINALE, darkDue, darkDuration } from "./haunts.js?v=r949-8620d2d2e96d";
// Dungeon Monster Pack v1: ten composable creatures built from shared attribute tables.
//
// A pack monster is a composition of five reusable parts, each defined once below:
//   body (render recipe, scale, palette)  ·  movement mode  ·  brain (AI positioning)
//   attack modules (telegraphed abilities)  ·  boss attack modules (unlocked by health phase)
// `composeMonster` builds new creatures from those parts, and `packVariant` deterministically
// grafts one borrowed attack onto some individuals, so the same ten monsters keep producing
// new combinations. Nothing here touches the save, the DOM, or randomness: every choice is a
// pure function of stable ids, so the simulation stays deterministic.
import { stageOneBeastReference } from "./stages.js?v=r949-8620d2d2e96d";
import { hashSeed, byHash } from "./random.js?v=r949-8620d2d2e96d";
import { updateAstralActor } from "./astral-worm.js?v=r949-8620d2d2e96d";
import { ADV, levelAt, heightReach, dropBonus, findPerch, findRetreat, kiteLoop, lampLoop } from "./adventure-creatures.js?v=r949-8620d2d2e96d"; // adventure creatures (Tim, 2026-11-11)
import { onStegoTailSevered } from "./stego-bait.js?v=r949-8620d2d2e96d";
import { BLEED, tickCreatureBleed } from "./bleed.js?v=r949-8620d2d2e96d"; // the Spinosaurus's bleed (its numbers and the Wayfarer's record) // the Wild Stegosaurus: its cut tail becomes the Stego Bait (the bait module owns what happens)
import { DUELISTS, duelistStats, duelSeparation, findHop, hopArc, duelStepTooClose } from "./duelists.js?v=r949-8620d2d2e96d"; // the Gaunt, hooded duelists (Tim, 2026-11-12)

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
  // Adventure creatures (adventure-creatures.ts): a percher holds its ledge or wall until it drops; a vantage keeper shells from its
  // home ground and walks back to it; a looper flies a loop over its home until it sees you, then circles you.
  perch: { id: "perch", name: "Holds a ledge, then drops", preferred: [1.2, 2.2] },
  vantage: { id: "vantage", name: "Keeps the high ground", preferred: [4.5, 7], retreat: 3 },
  loop: { id: "loop", name: "Flies a patrol loop", preferred: [3.4, 5.4] },
  patrol: { id: "patrol", name: "Walks its beat, lamp first", preferred: [1.2, 2.6], cone: true }, // roused only near, or inside its lamp's cone (ADV.lamp)
  // The Wild Stegosaurus (STEGO): presses close like a duelist, but never still; it hops about between its blows (stegoTick).
  restless: { id: "restless", name: "Hungry and restless", preferred: [1.4, 2.6] },
  // The Spinosaurus (SPINO): presses in like a duelist, but hunts its prey first (spinoTick).
  hunter: { id: "hunter", name: "Hunts the hunters", preferred: [1.6, 3] },
  // The Gaunt (duelists.ts): closes in, circles (flipping direction now and then), keeps off its kin, hops to reposition and after it
  // attacks; its own band is DUELISTS.ai[kind].preferred.
  fencer: { id: "fencer", name: "Circles, feints and hops in", preferred: [1.5, 2.6] },
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
  // Adventure creatures (adventure-creatures.ts, Tim 2026-11-11: built for tall, open ground). `gate` names a readiness rule
  // (advGate below); `heightReach` lets a ranged attack reach farther from above (ADV.reach). Their numbers live in ADV.
  ledgeDrop: { id: "ledgeDrop", name: "Ledge Drop", range: [0, 6.5], cooldown: 5, windup: .9, active: .4, recover: 1.1, damage: 1.2, gate: "above", tags: ["ground", "leap", "height"], text: "From a ledge or a wall above you it leans out; its mark follows you, stops, and it drops onto it. The longer the fall, the harder it lands." },
  ledgeClimb: { id: "ledgeClimb", name: "Ledge Climb", range: [0, 14], cooldown: 7, windup: .7, active: .55, recover: .35, damage: 0, gate: "perch", tags: ["movement", "height"], text: "Coils, and springs back up to a ledge or a wall. Catch it on the ground before it does." },
  censerLob: { id: "censerLob", name: "Censer Lob", range: [2.5, 8.5], cooldown: 4.6, windup: .75, recover: .8, damage: .85, jumpable: true, heightReach: true, tags: ["ground", "ranged", "height"], text: "Swings its censer and lobs two smoking pots: one at you, one where you are going. Their smoke slows. From higher up it throws farther." },
  thornDarts: { id: "thornDarts", name: "Thorn Darts", range: [2.5, 7.5], cooldown: 4.2, windup: .8, recover: .7, damage: .7, los: true, heightReach: true, tags: ["ranged", "height"], text: "Its bloom opens and three darts fly down the marked lanes. Walls stop them. From higher up they fly farther." },
  vineVault: { id: "vineVault", name: "Vine Vault", range: [1.8, 7], cooldown: 4.4, windup: .7, active: .5, recover: .8, damage: 1.1, jumpable: true, tags: ["ground", "leap", "height"], text: "Vaults across levels onto the marked spot, wherever you stand. Jump or dodge the landing." },
  vineRetreat: { id: "vineRetreat", name: "Vine Retreat", range: [0, 3.2], cooldown: 5.5, windup: .45, active: .55, recover: .4, damage: 0, gate: "retreat", tags: ["movement", "height"], text: "Swings away up to higher ground, out of reach of your blade." },
  sinkFunnel: { id: "sinkFunnel", name: "Sink Funnel", range: [0, 2.9], cooldown: 6.5, windup: .9, active: 1.2, recover: 1.2, damage: 1.3, gate: "level", requires: "burrows", tags: ["ground", "control", "burrow"], text: "The sand dimples and rings close in: the ground opens into a funnel that drags you to its mouth. Run out against it, or stand higher than it." },
  glassStrafe: { id: "glassStrafe", name: "Glass Strafe", range: [2, 9], cooldown: 5.5, windup: .8, active: .8, recover: .7, damage: .8, jumpable: true, requires: "flying", tags: ["ground", "air"], text: "Banks and runs low down the marked lane, dropping hot glass that bursts a moment later. Jump the bursts or leave the lane." },
  // The second set (adventure-creatures.ts, Tim 2026-11-11: the other four themes; no bosses).
  lampFlare: { id: "lampFlare", name: "Lamp Flare", range: [2.5, 8], cooldown: 5, windup: .75, recover: .7, damage: .9, jumpable: true, heightReach: true, tags: ["ground", "ranged", "fire", "height"], text: "Swings its lamp back and throws it onto the marked spot: it bursts and the ground burns a while. From higher up it throws farther." },
  bellToll: { id: "bellToll", name: "Bell Toll", range: [0, 4.5], cooldown: 6, windup: .85, recover: .9, damage: .9, jumpable: true, heightReach: true, tags: ["ground", "height"], text: "Strikes its bell: three rings roll out along the ground, one after another. Jump them, or stand higher than the bell." },
  tendrilRain: { id: "tendrilRain", name: "Tendril Rain", range: [2, 8], cooldown: 4.8, windup: .7, recover: .7, damage: .8, tags: ["ground", "ranged"], text: "Marks the ground under you, ahead of you and beside you; stinging tendrils drop onto each mark in turn." },
  membranePulse: { id: "membranePulse", name: "Membrane Pulse", range: [0, 2.2], cooldown: 4, windup: .6, recover: .7, damage: .8, tags: ["ground"], text: "Its bell swells and pulses: everything close round it is stung. Step out of the ring." },
  phaseStep: { id: "phaseStep", name: "Phase Step", range: [0, 3.5], cooldown: 6, windup: .45, active: .25, recover: .35, damage: 0, gate: "retreat", tags: ["movement", "teleport", "height"], text: "Shimmers and steps up onto higher ground, out of reach of your blade." },
  icicleLine: { id: "icicleLine", name: "Icicle Line", range: [2, 7.5], cooldown: 5, windup: .8, recover: .7, damage: .75, jumpable: true, heightReach: true, tags: ["ground", "ranged", "ice", "height"], text: "Raises its spear: icicles fall one after another down the marked lane and leave the ground slick. From higher up the lane runs farther." },
  glideRake: { id: "glideRake", name: "Glide Rake", range: [2.5, 8], cooldown: 5, windup: .75, active: .7, recover: .8, damage: 1.15, los: true, tags: ["charge"], text: "Crouches and skates the marked lane, raking whatever it meets; off a wall it rebounds once. It leaves slick ice behind." },
  pendulumSwing: { id: "pendulumSwing", name: "Pendulum", range: [0, 6], cooldown: 5, windup: .85, active: .65, recover: 1, damage: 1.15, gate: "above", tags: ["charge", "height"], text: "From its chain above it swings down the marked lane through you and out the other side. Then it has to climb back." },
  poleThrust: { id: "poleThrust", name: "Pole Thrust", range: [0, 3.2], cooldown: 2.4, windup: .6, recover: .8, damage: 1.1, los: true, tags: ["melee"], text: "Draws back its long pole or spear and drives it straight down the marked line." },
  prismBeam: { id: "prismBeam", name: "Prism Beam", range: [2.2, 8], cooldown: 6, windup: .85, active: 1.45, recover: .8, damage: .45, los: true, tags: ["ranged", "beam"], text: "Its lens gathers light, then a beam sweeps across the ground in front of it; walls cut it short." },
  heavySweep: { id: "heavySweep", name: "Heavy Sweep", range: [0, 2.2], cooldown: 2.2, windup: .55, recover: .75, damage: 1.1, los: true, tags: ["melee"], text: "Draws back its bell, its ladle or its hook, and sweeps a wide arc in front of it." },
  slagPour: { id: "slagPour", name: "Slag Pour", range: [2, 7.5], cooldown: 5.5, windup: .8, recover: .8, damage: .45, heightReach: true, tags: ["ground", "ranged", "fire", "height"], text: "Tips its ladle at the marked spot: molten slag pools there, burns, and runs on down to lower ground. From higher up it reaches farther." },
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
  // Release 664 (Tim, 2026-11-01: "he should spend a lot of time with half of his model outside the ground and only come out
  // every once in a while… when he's fully out he should be doing melee attacks where he swings, uses his length to attack,
  // or slams down"): each worm move has a `posture`. "half" moves are thrown from half out of the ground; "full" moves (the
  // maw, the body sweep and the slam) bring it all the way up, at most once every WORM.fullGap seconds.
  wormMaw: { id: "wormMaw", name: "Maw Tentacles", range: [0, 5.6], cooldown: 2.6, windup: .5, recover: .35, damage: .9, posture: "full", tags: ["melee"], text: "It rears all the way out and tentacles lash out of its maw along four lanes." },
  wormSweep: { id: "wormSweep", name: "Body Sweep", range: [0, 5.4], cooldown: 8, windup: .85, active: .45, recover: .7, damage: 1.15, posture: "full", tags: ["melee"], text: "It rears all the way out and swings its whole length round in a wide arc. Get out of the arc or under it with a dodge." },
  wormSlam: { id: "wormSlam", name: "Slam", range: [0, 7], cooldown: 9, windup: .95, recover: .9, damage: 1.5, posture: "full", tags: ["melee", "ground"], text: "It rears up high and slams its body down along a line; the ground bursts where its head lands." },
  wormSuction: { id: "wormSuction", name: "Suction", range: [2, 8.5], cooldown: 7, windup: .7, active: 1.6, recover: .5, damage: 1.3, posture: "half", tags: ["control"], text: "It inhales: you are dragged toward the maw. Dodge or run against it." },
  wormTentacles: { id: "wormTentacles", name: "Rising Tentacles", range: [0, 12], cooldown: 7.5, windup: .9, recover: .35, damage: .35, posture: "half", tags: ["summon", "ranged"], text: "The ground cracks where tentacles will burst out around you. They spit fire, hold a laser on you, loose homing orbs or fans of shots, grab and drag you, or swipe at you, and burrow to come up around you again between volleys. At its limit, a cast moves the ones it has." },
  wormRise: { id: "wormRise", name: "Rise Beneath", range: [2.5, 12], cooldown: 6.5, windup: .45, recover: .7, damage: 1.45, posture: "half", tags: ["ground", "burrow"], text: "It dives, tunnels under you and bursts up where the ground cracks. Get off the cracks." },
  wormLavaSpew: { id: "wormLavaSpew", name: "Lava Spew", range: [0, 7], cooldown: 5.5, windup: .6, active: 1.1, recover: .45, damage: .5, posture: "half", tags: ["ground", "fire"], text: "Throws its head forward and spews lava that spills across the ground like poured water. It cools in a couple of seconds; until then, stay off it." },
  wormRocks: { id: "wormRocks", name: "Rock Lob", range: [2.5, 10], cooldown: 5, windup: .55, recover: .45, damage: .9, posture: "half", jumpable: true, tags: ["ground", "ranged"], text: "Hurls rocks that burst where they land: one at you, one ahead of you, the rest around." },
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
  // The Briar Stag's kit (release 705; Tim, 2026-11-03: "more world bosses... similar attack and aggressiveness and strength and
  // varied amount of attacks... so they're pretty chaotic"): a stag of bark and bramble the size of a cart-horse, from the forests.
  stagGore: { id: "stagGore", name: "Antler Hooks", range: [0, 3.6], cooldown: 3.4, windup: .45, active: 1.3, recover: .45, damage: 1.1, tags: ["melee", "combo"], text: "Two hooking sweeps of its antlers, each turning after you, then a toss that throws you back." },
  stagCharge: { id: "stagCharge", name: "Bramble Rush", range: [3, 14], cooldown: 7, windup: .8, active: 6, recover: .6, damage: 1.4, tags: ["charge"], text: "It lowers its crown and rushes in a straight line, two or three times, turning after you between rushes. Brambles spring up along its track: they slow and scratch." },
  stagRoots: { id: "stagRoots", name: "Running Roots", range: [0, 11], cooldown: 6, windup: .6, active: 1.6, recover: .5, damage: 1, tags: ["ground"], text: "It stamps, and three lines of roots run out from it toward you, bursting from the ground spike by spike. Step out of their lines." },
  stagThorns: { id: "stagThorns", name: "Thorn Volley", range: [2, 12], cooldown: 6.5, windup: .55, active: 1.2, recover: .45, damage: .55, tags: ["ranged"], text: "It shakes its antlers and fans of thorns fly from them, three volleys, each turned a little from the last." },
  stagLeap: { id: "stagLeap", name: "Canopy Leap", range: [2.5, 11], cooldown: 8, windup: .5, active: 4, recover: .7, damage: 1.5, jumpable: true, tags: ["ground", "leap"], text: "It springs high out of reach and its shadow follows you; then it falls where its shadow is. Jump the ring the landing throws out; roots burst around it." },
  stagCage: { id: "stagCage", name: "Bramble Cage", range: [0, 9], cooldown: 11, windup: .5, active: 2.2, recover: .5, damage: .9, tags: ["ground", "control"], text: "Rings of roots close in around you, the outer first, then the next, then the last. Get out through the gaps, or before the outer ring breaks." },
  stagStomp: { id: "stagStomp", name: "Rearing Stomp", range: [0, 4.4], cooldown: 4.2, windup: .65, active: .7, recover: .5, damage: 1.15, jumpable: true, tags: ["ground", "melee"], text: "It rears and brings its forehooves down twice; each stamp throws out a ring. Jump them." },
  stagHunt: { id: "stagHunt", name: "The Wild Hunt", range: [0, 14], cooldown: 20, windup: 1.3, recover: .3, damage: .7, tags: ["buff"], text: "It bellows, throwing you back, and its crown catches green fire. For a while it runs faster, brambles spring up where it treads and roots burst around it." },
  // Release 708 (Tim, 2026-11-03: "the stag can do a move where he calls trees to grow up... they'll start burning... if you touch
  // them... you'll get on fire... then they'll explode... a blast radius... burning embers... splinters out in all directions... a
  // healing move... he raises his head up and he heals... not all of it... calls... birds... dive attack... from another side... the
  // Earth... when you do Dodge, it feels like you're dodging really slowly... takes a lot of your stamina... as if... on water...
  // long enough to drain... half your stamina... if you stand still, your stamina will recover").
  stagGrove: { id: "stagGrove", name: "Burning Grove", range: [0, 10], cooldown: 12, windup: .8, recover: .5, damage: 1.2, tags: ["ground", "fire", "summon"], text: "Trees burst up around you and catch fire. Touch one and you burn. Then each one explodes, a blast and a spray of burning splinters in every direction." },
  stagMend: { id: "stagMend", name: "Rooted Mend", range: [0, 14], cooldown: 22, windup: .6, active: 4, recover: .4, damage: 0, hurtBelow: .75, tags: ["heal"], text: "It raises its crown to the sky and its wounds begin to close. Hit it hard while it mends." },
  stagBirds: { id: "stagBirds", name: "Hunting Birds", range: [0, 14], cooldown: 10, windup: .7, active: 3, recover: .4, damage: 1, tags: ["ranged", "summon"], text: "It calls, and great birds stoop across the land from the edges of sight, one after another, each from a different side. Each marks its line just before it comes." },
  stagMire: { id: "stagMire", name: "Mire Ground", range: [0, 12], cooldown: 16, windup: .9, recover: .5, damage: 0, tags: ["control"], text: "The ground round you softens as if it were water: dodges are slow and short and cost far more stamina, and moving drains it. Stand still and it comes back." },
  // The Crimson Tyrant's kit (release 709; Tim, 2026-11-03: a red dragon "larger than the astral worm... flies around in the air...
  // shoots fire at the ground... slams down... one paw, or both... 3... streaks of fire... jumps back... flaps its wings forward... a
  // wing slash... raises its head up and moves it back-and-forth... shoots a bunch of fireballs... that rain down... charges up like a
  // great blast... charge it up for a while, then launch it... several times... turning things to lava... you can't interrupt him... a
  // spin attack... claw beams... a tailwind... rolls on the ground... a flame wave... 360... or... 120°... leaves a scorched path... a
  // supernova... pretty incredibly massive... get out of the way, use the pen or... time the aegis").
  dragonStrafe: { id: "dragonStrafe", name: "Burning Pass", range: [3, 16], cooldown: 9, windup: .8, active: 2.2, recover: .7, damage: 1.1, tags: ["charge", "fire", "flying"], text: "It takes to the air and sweeps low over you in a straight pass, breathing fire onto the ground all along its path." },
  dragonSlam: { id: "dragonSlam", name: "Searing Slam", range: [0, 4.6], cooldown: 5, windup: .8, recover: .7, damage: 1.4, tags: ["melee", "ground", "fire"], text: "It rears and brings one forefoot down, or both. Three streaks of fire tear out across the ground from where it struck." },
  dragonWingBack: { id: "dragonWingBack", name: "Wing Lash", range: [0, 4.2], cooldown: 6, windup: .4, active: .55, recover: .5, damage: 1.2, tags: ["melee", "evade"], text: "It springs back away from you and beats its wings forward: a slash of wind and heat that throws you back." },
  dragonRain: { id: "dragonRain", name: "Ember Rain", range: [0, 15], cooldown: 11, windup: .8, active: 4, recover: .6, damage: .8, tags: ["ranged", "fire"], text: "It raises its head and sways it side to side, hurling fireballs high into the air. For a long while they rain down round you, each marking where it will fall." },
  dragonBlast: { id: "dragonBlast", name: "Great Flame", range: [2, 15], cooldown: 9, windup: .5, active: 3.6, recover: .6, damage: 1.6, tags: ["ranged", "fire"], text: "It draws back its head and its throat glows; a great ball of flame leaves its jaws and bursts where you stood. It charges and fires again, three times." },
  dragonColonize: { id: "dragonColonize", name: "Claim the Ground", range: [0, 99], cooldown: 9999, windup: 5, recover: 1, damage: 0, scheduled: true, tags: ["ground", "fire"], text: "It raises its head high and a sun gathers above it. Nothing interrupts it. When it breaks, part of the ground turns to lava, and stays lava. Four times and the whole floor is its own." },
  dragonClawSpin: { id: "dragonClawSpin", name: "Claw Whirl", range: [0, 4.5], cooldown: 6, windup: .5, active: .9, recover: .5, damage: 1.2, tags: ["melee", "spin"], text: "It whirls round on itself, claws out. Sometimes the whirl throws arcs of fire off its claws in a spiral." },
  dragonTailSpin: { id: "dragonTailSpin", name: "Tail Whirl", range: [0, 5.6], cooldown: 6.5, windup: .5, active: 1, recover: .5, damage: 1.3, tags: ["melee", "spin"], text: "It spins its whole length round, the tail sweeping a wide circle." },
  dragonTailSwipe: { id: "dragonTailSwipe", name: "Tail Lash", range: [0, 5], cooldown: 4.5, windup: .45, active: 1.2, recover: .45, damage: 1.1, tags: ["melee", "combo"], text: "Its tail lashes one way and then back the other." },
  dragonRoll: { id: "dragonRoll", name: "Rolling Crush", range: [0, 3.6], cooldown: 7, windup: .5, active: 1.6, recover: .6, damage: 1.3, tags: ["charge"], text: "Close in, it throws itself down and rolls across you, then back." },
  dragonFlameWave: { id: "dragonFlameWave", name: "Flame Wave", range: [0, 9], cooldown: 8, windup: .7, recover: .6, damage: 1, tags: ["ground", "fire"], text: "A wave of flame rolls out from it, all the way round or in a wide wedge toward you, and the ground it crosses stays burning for a while." },
  // Tim (2026-11-12): "a slam attack where they just slam down on you from the air": it climbs, hangs on spread wings while its
  // ring hunts you, then folds them and falls. Numbers in DRAGON.dive.
  dragonDive: { id: "dragonDive", name: "Skyfall", range: [3, 13], cooldown: 11, windup: .5, active: 2.8, recover: .9, damage: 1.5, tags: ["charge", "fire", "flying"], text: "It springs into the air and hangs there on spread wings while a ring of shadow follows you; then it folds them and falls on you, and the ground bursts into flame where it lands." },
  dragonSupernova: { id: "dragonSupernova", name: "Sunfall", range: [0, 99], cooldown: 32, windup: .9, active: 4.2, recover: 1.4, damage: 1, hurtBelow: .8, tags: ["fire", "flying"], text: "It climbs into the sky and draws the heat of everything round it into itself, then bursts like a falling sun. Get out of its reach, shelter in a pen, or meet it with the Aegis: nothing else lives through it." },
  // The Doom Chaser's kit (release 710; Tim, 2026-11-03: "The second dragon... a sweeping laser beam that just like makes eruptions
  // everywhere... flies in the air and launches waves of dark energy... all of his attacks can be black... slam attacks... a similar
  // number of different moves... His name is doom chaser"). An original black dragon: dark fire, black flame pools under its spells,
  // and a frenzy that its blows sow in you (FRENZY).
  doomBeam: { id: "doomBeam", name: "Ruin Beam", range: [3, 12], cooldown: 10, windup: 1, active: 2.4, recover: .8, damage: .5, los: true, tags: ["ranged", "beam", "dark"], text: "Its throat fills with black light and a beam sweeps across the ground; everywhere it passes, black fire erupts a moment later." },
  doomWaves: { id: "doomWaves", name: "Dark Tide", range: [3, 14], cooldown: 9, windup: .8, active: 2.2, recover: .8, damage: 1, tags: ["ranged", "dark", "flying"], text: "It climbs into the air and beats its wings, and wide crescents of dark energy roll across the ground at you, one after another." },
  doomBreath: { id: "doomBreath", name: "Black Breath", range: [0, 6.5], cooldown: 7, windup: .7, active: 1.6, recover: .6, damage: .45, tags: ["ranged", "dark"], text: "It breathes a sweeping cone of black flame, and pools of it burn where it fell." },
  doomWingSlam: { id: "doomWingSlam", name: "Wing Walk", range: [0, 6], cooldown: 7, windup: .6, active: 2, recover: .6, damage: 1.2, tags: ["melee", "ground", "dark"], text: "It walks at you on its wings, slamming them down left and right; each slam bursts and leaves black fire." },
  doomPounce: { id: "doomPounce", name: "Doom Pounce", range: [3, 9], cooldown: 8, windup: .6, active: 1.2, recover: .7, damage: 1.4, tags: ["charge", "dark"], text: "It springs at you and comes down claws first, and dark fire bursts round where it lands." },
  doomScales: { id: "doomScales", name: "Shed Scales", range: [0, 10], cooldown: 11, windup: .8, recover: .6, damage: 1, tags: ["ground", "dark"], text: "It shakes itself and black scales scatter round you; a moment later each one bursts." },
  doomTar: { id: "doomTar", name: "Tar Spit", range: [2, 11], cooldown: 9, windup: .7, active: 1.2, recover: .6, damage: .6, tags: ["ranged", "control", "dark"], text: "It spits globs of black tar that cling and slow; a little later the tar catches and burns." },
  doomFall: { id: "doomFall", name: "Falling Dark", range: [2, 14], cooldown: 12, windup: .7, active: 3, recover: 1, damage: 1.6, tags: ["charge", "dark", "flying"], text: "It climbs out of sight and its shadow hunts you; then it falls on you, and the dark bursts outward in a ring of fire." },
  doomJaws: { id: "doomJaws", name: "Tail and Jaws", range: [0, 4], cooldown: 4.5, windup: .5, active: 1.6, recover: .5, damage: 1.2, tags: ["melee", "combo"], text: "Two lunging bites, then its tail sweeps round behind them." },
  doomOrbs: { id: "doomOrbs", name: "Hunting Dark", range: [2, 14], cooldown: 10, windup: .7, active: 1.2, recover: .5, damage: .8, tags: ["ranged", "dark"], text: "Orbs of darkness leave its jaws and hunt you for a while, then fly on straight; each bursts on what it meets." },
  doomEclipse: { id: "doomEclipse", name: "Eclipse", range: [0, 99], cooldown: 26, windup: 1, active: 4.5, recover: 1.2, damage: .45, hurtBelow: .65, tags: ["beam", "dark", "flying"], text: "Hurt, it rises and hangs in the air, a black sun at its heart, and beams turn round it like the hands of a clock, black fire erupting along them." },
  doomRoar: { id: "doomRoar", name: "Frenzied Roar", range: [0, 8], cooldown: 14, windup: .8, recover: .8, damage: .5, tags: ["control", "dark"], text: "It roars: the blast throws you back, and the frenzy it spreads takes a step closer." },
  // The Ashen Moth's kit (release 706; the same ask): a moth as wide as a house, of ash and ember, from the Firelands.
  mothGust: { id: "mothGust", name: "Ash Gust", range: [0, 8], cooldown: 5, windup: .55, recover: .45, damage: .8, tags: ["control"], text: "A beat of its wings throws you back and scatters ash; the ash smoulders, then catches." },
  mothDust: { id: "mothDust", name: "Kindling Dust", range: [0, 11], cooldown: 7, windup: .6, recover: .5, damage: 1.1, tags: ["ground", "fire"], text: "It shakes clouds of glowing dust down round you, one on you. Each flares up a moment later." },
  mothDive: { id: "mothDive", name: "Burning Dive", range: [3, 12], cooldown: 6.5, windup: .7, active: .9, recover: .6, damage: 1.4, tags: ["charge", "fire"], text: "It climbs, folds its wings and dives through you in a straight line, leaving fire on the ground behind it." },
  mothSpiral: { id: "mothSpiral", name: "Ember Spiral", range: [0, 10], cooldown: 8, windup: .6, active: 2.4, recover: .5, damage: .5, tags: ["ranged", "fire"], text: "It turns in the air, throwing embers out in a widening spiral. Find the gaps." },
  mothSwarm: { id: "mothSwarm", name: "Moth Swarm", range: [2, 12], cooldown: 9, windup: .7, recover: .5, damage: .7, tags: ["ranged", "orbs"], text: "Small burning moths leave its wings and chase you for a moment, then fly straight on." },
  mothCocoon: { id: "mothCocoon", name: "Ash Cocoon", range: [0, 14], cooldown: 14, windup: .5, active: 2.6, recover: .4, damage: 1, tags: ["defense", "fire"], text: "It wraps itself in ash; nothing hurts it. Then the cocoon bursts in a ring of fire and a scatter of embers." },
  mothKindle: { id: "mothKindle", name: "Kindled", range: [0, 14], cooldown: 20, windup: 1.2, recover: .3, damage: .7, tags: ["buff", "fire"], text: "Its wings catch fire. For a while it flies faster, fire falls where it passes and burning dust drifts down round it." },
  // Release 708 (Tim, 2026-11-03: "he shoots out a bunch of... threads... from him towards you... and then another attack where all
  // the threads are together... 2 strong blasts... both of these moves should track the player... not indefinitely... not as much as
  // the nanobot knight's homing orbs... but they should home in on the player for a while").
  mothThreads: { id: "mothThreads", name: "Silk Threads", range: [0, 12], cooldown: 7, windup: .6, recover: .5, damage: .55, tags: ["ranged"], text: "Threads of white silk lash out from its body in a fan, curving after you for a moment before they fly straight, trailing silk." },
  mothThreadBlast: { id: "mothThreadBlast", name: "Silk Burst", range: [0, 13], cooldown: 10, windup: 1, recover: .6, damage: 1.3, tags: ["ranged"], text: "Its threads gather into two great knots of silk that launch at you one after the other and follow you for a while. Each bursts where it strikes." },
  // Release 708 (Tim, 2026-11-03: "the moth can make large whirlwinds, like gigantic whirlwinds that roll around the... screen for a while").
  mothGale: { id: "mothGale", name: "Ash Gale", range: [0, 14], cooldown: 16, windup: 1, recover: .5, damage: .6, tags: ["control", "summon"], text: "It beats up two great whirlwinds of ash and embers that roll about the land for a while, rebounding off whatever stops them. Caught in one, you are dragged toward its heart, slowed and battered." },
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
  // Release 731: the haunts (haunts.ts). A puff or a howl of gloom that confuses: the Wayfarer's movement runs backwards a while.
  wispBewilder: { id: "wispBewilder", name: "Bewildering Puff", range: [0, 2.6], cooldown: 5.5, windup: .6, recover: .5, damage: .4, tags: ["control"], text: "A puff of gloom. Breathe it and left is right, forward is back, for a few heartbeats." },
  gorgeHowl: { id: "gorgeHowl", name: "Gloom Howl", range: [0, 5.5], cooldown: 9, windup: 1, recover: .8, damage: .8, tags: ["control"], text: "The Gloomgorge throws back its head and howls; everything near it is turned about for longer." },
  // The Gloomvast (haunts.ts GLOOM_FINALE): the Pentagon finale's haunt. Its big blows are the talons and the plunge (2 to 3 of
  // them fell a Wayfarer it is tuned to); the rest lay curses. Every one is telegraphed and can be dodged.
  vastRake: { id: "vastRake", name: "Rending Talons", range: [0, 3], cooldown: 3.4, windup: .75, recover: .7, damage: 2, los: true, tags: ["melee"], text: "Both arms sweep out in a wide arc of long hooked talons. Get out of the arc, or dodge through it." },
  vastWail: { id: "vastWail", name: "Hollow Wail", range: [0, 6], cooldown: 11, windup: 1.15, recover: .8, damage: .9, tags: ["control"], text: "It throws back its head and wails: everything near it is turned about and cursed twice over." },
  vastGloomfall: { id: "vastGloomfall", name: "Gloomfall", range: [0, 9], cooldown: 7, windup: .6, recover: .7, damage: 1.2, tags: ["ground"], text: "Pools of gloom gather under you, ahead of you and round you, then fall in. Each one that takes you lays a curse." },
  vastLights: { id: "vastLights", name: "Grave Lights", range: [2, 10], cooldown: 8, windup: .7, recover: .6, damage: .7, tags: ["ranged"], text: "Pale lights leave its mouth and drift after you for a moment before flying straight. Each one that reaches you lays a curse." },
  vastPlunge: { id: "vastPlunge", name: "Drowning Plunge", range: [2.5, 9], cooldown: 7.5, windup: 1.05, active: .7, recover: 1, damage: 2.5, tags: ["charge", "phase"], text: "It gathers itself, then plunges straight through you along the lane it showed, and through walls." },
  vastDark: { id: "vastDark", name: "The Dark", range: [0, 99], cooldown: 1, windup: 1.6, recover: .3, damage: 0, scheduled: true, tags: ["illusion"], text: "It draws the light into itself. Then there is only a little light round you, and many cold lights in the dark, and one of them is it." },
  shadeTouch: { id: "shadeTouch", name: "Cold Touch", range: [0, 1.6], cooldown: 2.8, windup: .6, recover: .6, damage: .5, tags: ["melee"], text: "An orb in the dark swells and brushes you: cold, and a curse." },
  shadePuff: { id: "shadePuff", name: "Gloom Puff", range: [0, 2.4], cooldown: 6.5, windup: .75, recover: .6, damage: .35, tags: ["control"], text: "An orb in the dark breathes out a ring of gloom that lays a curse." },
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
  golemPunch: { id: "golemPunch", name: "Golem Fist", range: [0, 1.9], cooldown: 2.1, windup: .62, recover: .75, damage: 1.45, los: true, tags: ["melee"], text: "Rears back a fist of packed earth and drives it forward. Slow to throw; step aside." }, // Canyon craters
  firefall: { id: "firefall", name: "Firefall", range: [1.5, 9], cooldown: 6.5, windup: .7, recover: .8, damage: .85, jumpable: true, tags: ["ground"], text: "Embers rain across the floor around you." },
  // The Pentagon roofs' dwellers (roof-dwellers.ts; Tim, 2026-11-04): the demon's heavy cleave, the colossus's ground slam and its
  // chest laser. The slam is a body blow (tagged melee: under ELEVATION_REACH it does not carry between heights); the laser is a beam
  // and does. The laser's timings, reach and width are COLOSSUS.laser; its damage multiplier is here.
  demonCleave: { id: "demonCleave", name: "Horned Cleave", range: [0, 2.6], cooldown: 2.6, windup: .62, recover: .75, damage: 1.45, los: true, tags: ["melee"], text: "Both arms come down together in a wide, heavy arc." },
  stoneSlam: { id: "stoneSlam", name: "Ground Slam", range: [0, 2.4], cooldown: 3.6, windup: .85, recover: 1, damage: 1.5, jumpable: true, tags: ["melee", "ground"], text: "Raises both fists and pounds the roof round its feet. Jump it, or do not be close." },
  // The Wild Stegosaurus (Tim, 2026-11-12, for his kid: "threatening for sure"). Numbers other than these are in STEGO.
  stegoBite: { id: "stegoBite", name: "Snapping Hunger", range: [0, 3.2], cooldown: 3.2, windup: .5, active: 1.8, recover: .5, damage: .7, tags: ["melee", "combo"], text: "Two to four quick snapping bites in a row, stepping in after you with each." },
  stegoTailWhack: { id: "stegoTailWhack", name: "Thagomizer Sweep", range: [0, 3.6], cooldown: 4.2, windup: .6, active: 1, recover: .5, damage: 1.05, tags: ["melee"], text: "It swings its spiked tail back and forth across the ground behind and beside it." },
  stegoTailSlam: { id: "stegoTailSlam", name: "Tail Slam", range: [1, 6.5], cooldown: 6, windup: 1, recover: .8, damage: 1.55, tags: ["ground", "melee"], text: "It brings its tail over its back and slams it down where you stand; the ground rings out from it. Step out of the circle, then jump the ring." },
  stegoWheel: { id: "stegoWheel", name: "Plated Wheel", range: [2, 12], cooldown: 11, windup: .8, active: 3.6, recover: .8, damage: 1.3, tags: ["charge"], text: "It curls into a wheel of plates and spikes and rolls after you, kicking up spinning dust devils that sting." },
  stegoPlateRockets: { id: "stegoPlateRockets", name: "Plate Rockets", range: [2, 12], cooldown: 13, windup: .8, active: 2.6, recover: .6, damage: 1, tags: ["ranged", "ground"], text: "Its back plates tear free and climb into the sky; they come down one after another where their shadows show, and each bursts into spikes in every direction. Its plates grow back over a few seconds." },
  stegoTailBlade: { id: "stegoTailBlade", name: "Tail Blade", range: [3, 11], cooldown: 6.5, windup: .7, recover: .5, damage: 1, tags: ["ranged", "beam"], text: "It whips round and slashes the air with its tail, and a blade of air flies at you." },
  stegoClaw: { id: "stegoClaw", name: "Raking Claws", range: [0, 2.8], cooldown: 2.6, windup: .4, active: .9, recover: .45, damage: .6, tags: ["melee"], text: "It rakes with its front claws, and with its hind claws too when you are close." },
  stegoRearSwipe: { id: "stegoRearSwipe", name: "Rearing Swipes", range: [0, 3.4], cooldown: 7, windup: .75, active: 1.6, recover: .7, damage: .95, tags: ["melee", "combo"], text: "It rears up like a bear and swipes again and again, stepping after you." },
  stegoBuck: { id: "stegoBuck", name: "Hind Kick", range: [0, 3.6], cooldown: 3.2, windup: .4, recover: .6, damage: 1.15, tags: ["melee"], text: "Stand behind it and it bucks, kicking out with both hind legs." },
  stegoPounce: { id: "stegoPounce", name: "Wild Pounce", range: [2.5, 10], cooldown: 6, windup: .55, active: 1.2, recover: .6, damage: 1.45, tags: ["ground", "leap"], text: "It crouches and springs, and comes down on you with all its weight. It pounces on other creatures too." },
  stegoTreeClub: { id: "stegoTreeClub", name: "Uprooted Club", range: [0, 9], cooldown: 50, windup: .2, active: 6.5, recover: .8, damage: 1.6, tags: ["melee", "rare"], text: "Near tall thin trees it bites one, tears it out by the roots, shakes it, and swings it as a club. The tree stays down." },
  stegoBreach: { id: "stegoBreach", name: "Breach", range: [2, 12], cooldown: 7, windup: .4, active: 2.2, recover: .6, damage: 1.5, tags: ["ground", "water"], text: "On water only: it dives, then bursts up out of the water across your path, or up and down on top of you." },
  // The Spinosaurus (Tim, 2026-11-12: "The Hunter of Hunters"). Numbers other than these are in SPINO; `fossil` moves only once it is bone.
  spinoBite: { id: "spinoBite", name: "Snapping Jaws", range: [0, 3.6], cooldown: 3.2, windup: .55, active: 1.2, recover: .55, damage: .8, tags: ["melee", "bleed"], text: "One or two long snapping bites of its crocodile jaws, stepping in after you. They make you bleed." },
  spinoClaw: { id: "spinoClaw", name: "Hooked Claws", range: [0, 3], cooldown: 2.8, windup: .45, active: .9, recover: .5, damage: .6, tags: ["melee", "bleed"], text: "It rakes with one great clawed hand, then the other. They make you bleed." },
  spinoLeapSlam: { id: "spinoLeapSlam", name: "Furrow Leap", range: [3, 11], cooldown: 9, windup: .75, active: 2.8, recover: .8, damage: 1.35, tags: ["ground", "leap"], text: "It leaps onto the marked spot and slams its head down, then drags its jaw on through the ground, ploughing a furrow down the marked lane." },
  spinoDigFling: { id: "spinoDigFling", name: "Earth Fling", range: [2.5, 10], cooldown: 11, windup: .7, active: 2.5, recover: .7, damage: .5, tags: ["ranged", "ground"], text: "It buries its snout in the ground and flings rock and earth at you in a cone, again and again." },
  spinoRoar: { id: "spinoRoar", name: "Hunter's Roar", range: [0, 7], cooldown: 18, windup: 1.4, active: 1.2, recover: 1, damage: 1, tags: ["ground", "roar"], text: "It rears up and roars: the ground inside the great ring is struck again and again. Get out of the ring, or behind cover." },
  spinoTailSwipe: { id: "spinoTailSwipe", name: "Tail Sweep", range: [0, 3.8], cooldown: 4.2, windup: .55, active: 1, recover: .5, damage: .95, tags: ["melee"], text: "It swings its heavy tail across the ground behind and beside it, one way and back." },
  spinoBodySlam: { id: "spinoBodySlam", name: "Running Lunge", range: [3, 12], cooldown: 8, windup: .5, active: 2, recover: .7, damage: 1.35, tags: ["charge", "leap", "bleed"], text: "It runs at you down the marked lane, then lunges and comes down on the marked spot jaws first. It makes you bleed." },
  spinoGrab: { id: "spinoGrab", name: "Hunter's Grip", range: [0, 8], cooldown: 14, windup: 1.6, active: 4.8, recover: .8, damage: 1, tags: ["grab", "bleed"], text: "A bite mark follows you. Be out from under it when it stops, or it lunges, lifts you in its jaws, chews (you bleed) and throws you down." },
  spinoBoneVolley: { id: "spinoBoneVolley", name: "Bone Volley", range: [3, 12], cooldown: 10, windup: .8, active: 1.6, recover: .7, damage: .55, fossil: true, tags: ["ranged"], text: "Bone only: it flings its bones into the air; they hunt you, and those that miss land and burst on the marked ground." },
  spinoRibSpears: { id: "spinoRibSpears", name: "Rib Spears", range: [0, 4.6], cooldown: 7, windup: .65, active: .7, recover: .7, damage: 1.1, fossil: true, tags: ["melee"], text: "Bone only: its ribs shoot out to either side as spears, then swing in to meet at a point in front of it." },
  chestLaser: { id: "chestLaser", name: "Heart Lamp", range: [3, 11], cooldown: 8.5, windup: 2, active: .3, recover: 1.5, damage: 6, los: true, tags: ["ranged", "beam"], text: "The lamp in its chest fills with light while a red line follows you; the line stops, flashes, and the lamp fires along it. Be off the line, or dodge through it." },
  // The Gaunt's blades (duelists.ts DUELISTS.attacks holds every number). Melee: under ELEVATION_REACH they never carry between heights.
  ...Object.fromEntries(Object.entries(DUELISTS.attacks).map(([id, A]) => [id, { id, name: A.name, range: [...A.range], cooldown: A.cooldown, windup: A.windup, active: A.active, recover: A.recover, damage: A.damage, los: true, ...(A.jumpable ? { jumpable: true } : {}), tags: ["melee", "blade"], text: A.text }])),
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
    attacks: ["wormMaw", "wormSuction", "wormTentacles", "wormRise", "wormRocks", "wormLavaSpew", "wormSweep", "wormSlam"], bossAttacks: ["shockwave"],
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
  // Canyon creatures (Canyon craters, Tim 2026-11-01: "earth golems... crystal hermit crabs"): only in the craters.
  earthGolem: {
    id: "earthGolem", name: "Earth Golem", epithet: "The Clod That Stood Up", dungeonOnly: true, canyon: true,
    stats: [70, 12, 0], form: { scale: 1.3 }, sizeClass: "large", movement: "burrow", brain: "ambush",
    attacks: ["burrowAmbush", "golemPunch"], bossAttacks: ["groundRupture", "shockwave"],
    palette: ["#7a5a3c", "#2a1d12", "#ffd23a", "#b48a5c"], render: "earthGolem", tags: ["construct", "earth"],
    lore: "Packed crater earth that learned to stand. It swims through the clods, bursts out of the ground you dug, and punches like a landslide.",
  },
  crystalCrab: {
    id: "crystalCrab", name: "Crystal Hermit", epithet: "The Geode That Walks", dungeonOnly: true, canyon: true,
    stats: [30, 8, 0], form: { scale: 1.05 }, sizeClass: "medium", movement: "skitter", brain: "flank",
    attacks: ["clawSweep", "leapSlam"], bossAttacks: ["groundRupture"],
    palette: ["#a8607a", "#2a1620", "#8ff2ff", "#e6fbff"], render: "crystalCrab", tags: ["beast", "crystal"],
    lore: "A hermit crab that took a cracked geode for its shell. It sidles round you and springs, pincers first.",
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
  briarStag: {
    id: "briarStag", name: "The Briar Stag", epithet: "The Forest That Charges", unique: true,
    stats: [320, 17, 0], form: { scale: 1.75 }, sizeClass: "large", movement: "walk", brain: "duelist",
    attacks: ["stagGore", "stagCharge", "stagRoots", "stagThorns", "stagLeap", "stagCage", "stagStomp", "stagHunt", "stagGrove", "stagMend", "stagBirds", "stagMire"], bossAttacks: [],
    palette: ["#5a4632", "#1c140c", "#9cff6a", "#e6ffd0"], render: "briarStag", tags: ["beast", "elder", "forest", "thorn"],
    lore: "A stag as big as a cart-horse, its hide bark and its crown a thicket of antler and bramble hung with pale blossom. It hooks and tosses with that crown, rushes in lines that leave brambles behind it, sends roots running through the ground and closes them round you in rings, shakes thorns from its antlers, and leaps over the canopy to come down on you. When it bellows, its crown burns green and the forest rises wherever it runs.",
  },
  crimsonTyrant: {
    id: "crimsonTyrant", name: "The Crimson Tyrant", epithet: "The Fire That Wants the World", unique: true,
    stats: [420, 20, 0], form: { scale: 2.6 }, sizeClass: "huge", movement: "hover", brain: "duelist",
    attacks: ["dragonStrafe", "dragonSlam", "dragonWingBack", "dragonRain", "dragonBlast", "dragonClawSpin", "dragonTailSpin", "dragonTailSwipe", "dragonRoll", "dragonFlameWave", "dragonSupernova", "dragonColonize", "dragonDive"], bossAttacks: [],
    palette: ["#a8221a", "#3a0a08", "#ffb04a", "#ffe8c0"], render: "crimsonTyrant", tags: ["beast", "elder", "fire", "dragon", "flying"],
    lore: "A dragon as long as a street, red as a forge, horned and winged, its tail never still. It burns the air, the ground and anything that stands on it; it slams, lashes, whirls and rolls; it rains fire and hurls great balls of it; and given time it claims a place for its own, turning the floor to lava a stretch at a time until there is nothing else. Then it bursts like a falling sun.",
  },
  // The Wild Stegosaurus (Tim, 2026-11-12, for his kid): a world beast that roams the land and the sea, and turns up in the big rooms
  // of keeps, arcologies and adventure Pentagons (wild-stego.ts). Its numbers are STEGO; its pose fields are listed there.
  wildStego: {
    id: "wildStego", name: "The Wild Stegosaurus", epithet: "Hunger on Four Legs", unique: true,
    stats: [360, 18, 0], form: { scale: 1.85 }, sizeClass: "huge", movement: "walk", brain: "restless",
    attacks: ["stegoBite", "stegoTailWhack", "stegoTailSlam", "stegoWheel", "stegoPlateRockets", "stegoTailBlade", "stegoClaw", "stegoRearSwipe", "stegoBuck", "stegoPounce", "stegoTreeClub", "stegoBreach"], bossAttacks: [],
    palette: ["#2f6fd6", "#163a7a", "#a9dcff", "#6f9fe6"], render: "wildStego", tags: ["beast", "elder", "dinosaur", "water", "climber"],
    lore: "A stegosaurus as big as a house, blue, striped dark along its flanks, its two rows of tall plates barred with pale light, its eyes a fierce yellow. Its beak has turned to teeth, and it is always hungry. It eats the trees as it goes, but it would rather eat you: it snaps and rakes and rears, swings and slams its spiked tail, rolls at you as a wheel of plates, fires its plates into the sky to fall on you, and swims with only its plates above the water. Cut off its tail and it fights the weaker for it.",
  },
  // The Spinosaurus (Tim, 2026-11-12): a world beast of the land (never the sea), the big rooms of keeps, arcologies and adventure
  // Pentagons, and the interloper in a fight with the Wild Stegosaurus or the Briar Stag (spino-rex.ts). Its numbers and pose fields: SPINO.
  spinoRex: {
    id: "spinoRex", name: "The Spinosaurus", epithet: "The Hunter of Hunters", unique: true,
    stats: [380, 19, 0], form: { scale: 2.1 }, sizeClass: "huge", movement: "walk", brain: "hunter",
    attacks: ["spinoBite", "spinoClaw", "spinoLeapSlam", "spinoDigFling", "spinoRoar", "spinoTailSwipe", "spinoBodySlam", "spinoGrab", "spinoBoneVolley", "spinoRibSpears"], bossAttacks: [],
    palette: ["#f2a35e", "#c4561a", "#a8481e", "#f6c48e"], render: "spinoRex", tags: ["beast", "elder", "dinosaur", "predator"],
    lore: "A spinosaurus taller than a house, always on its hind legs: light orange mottled and striped with rust, a pale belly, a tall dark-orange sail along its back, a long crocodile snout full of teeth, heavy clawed arms and a heavy tail. It hunts the hunters: the Wild Stegosaurus and the Briar Stag first, anything else it sees, and you. It bites and rakes until you bleed, leaps and ploughs the ground with its jaw, digs and flings the earth, roars until the ground shakes, and grabs you in its jaws. Halve it and its skin falls away, and it fights on as a skeleton of white bone, throwing its bones and thrusting its ribs as spears.",
  },
  doomChaser: { // release 710
    id: "doomChaser", name: "The Doom Chaser", epithet: "The Dark That Follows", unique: true,
    stats: [420, 20, 0], form: { scale: 2.5 }, sizeClass: "huge", movement: "hover", brain: "duelist",
    attacks: ["doomBeam", "doomWaves", "doomBreath", "doomWingSlam", "doomPounce", "doomScales", "doomTar", "doomFall", "doomJaws", "doomOrbs", "doomEclipse", "doomRoar", "dragonDive"], bossAttacks: [],
    palette: ["#1c1a24", "#08070c", "#a060ff", "#f0dcff"], render: "doomChaser", tags: ["beast", "elder", "dark", "dragon", "flying"],
    lore: "A black dragon as long as a street, its scales like burnt glass, violet fire showing through the cracks between them. It sweeps the ground with a beam of black light that leaves the earth erupting behind it, throws waves of darkness from the air, walks on its wings and slams them down, spits tar that catches fire, sheds scales that burst, and falls on you out of the sky. Its blows sow a frenzy in you; strike it hard enough and you throw the frenzy off, or it bursts inside you.",
  },
  // Release 715 (Tim, 2026-11-03, the far reaches: "there can be sections where all the monsters are small versions of... the blob...
  // different biome regions just have different blobs... groves of stags... they won't be as powerful as the... world stag... there
  // should be lots of moths as well"): lesser kin of the world beasts, found only in the far reaches (far-realms.ts FAR_POCKETS), so
  // like the chrysalis they are not part of the ordinary roster (prototypeOnly) and no ordinary section or dungeon ever rolls them.
  groveStag: { id: "groveStag", prototypeOnly: true, farKin: true, noEcho: true, name: "Grove Stag", epithet: "Kin of the Briar Stag",
    stats: [110, 12, 0], form: { scale: 1.05 }, sizeClass: "large", movement: "walk", brain: "duelist",
    attacks: ["stagGore", "stagCharge", "stagThorns", "stagStomp"], bossAttacks: [],
    palette: ["#6a5236", "#22180e", "#b8ff8a", "#f0ffe0"], render: "briarStag", tags: ["beast", "forest", "thorn"],
    lore: "A stag of bark and bramble, smaller than the great Briar Stag and gentler of crown, that keeps a grove with others of its kind far out in the Corridor. Its antlers still hook, and it still charges." },
  groveMoth: { id: "groveMoth", prototypeOnly: true, farKin: true, noEcho: true, name: "Grove Moth", epithet: "Kin of the Ashen Moth",
    stats: [60, 8, 0], form: { scale: 1.1 }, sizeClass: "medium", movement: "hover", brain: "orbit",
    attacks: ["mothGust", "mothDust", "mothSpiral"], bossAttacks: [],
    palette: ["#6e6458", "#1e1a16", "#ffb04a", "#fff0d0"], render: "ashenMoth", tags: ["beast", "fire", "flying"],
    lore: "A moth the size of a dog, grey as old ash, that flits about the stag groves of the far reaches. It throws you back with its wings and shakes down smouldering dust." },
  mossBlob: { id: "mossBlob", prototypeOnly: true, farKin: true, noEcho: true, name: "Moss Blob", epithet: "Kin of the Morphing Blob",
    stats: [70, 9, 0], form: { scale: .95 }, sizeClass: "medium", movement: "walk", brain: "duelist",
    attacks: ["blobTendrils", "blobGasJet"], bossAttacks: [],
    palette: ["#6fbf5e", "#1c3a16", "#c8ff6a", "#f0ffe0"], render: "morphingBlob", tags: ["ooze", "gas"],
    lore: "A blob of living ooze the colour of moss and rot, kin of the Morphing Blob and much smaller, one of many that crowd a pocket of the far reaches. It whips tendrils and breathes poison." },
  emberBlob: { id: "emberBlob", prototypeOnly: true, farKin: true, noEcho: true, name: "Ember Blob", epithet: "Kin of the Morphing Blob",
    stats: [70, 9, 0], form: { scale: .95 }, sizeClass: "medium", movement: "walk", brain: "duelist",
    attacks: ["blobTendrils", "blobGasJet"], bossAttacks: [],
    palette: ["#e0703a", "#4a1408", "#ffd060", "#fff0d0"], render: "morphingBlob", tags: ["ooze", "gas"],
    lore: "A blob of living ooze the colour of embers, kin of the Morphing Blob and much smaller, one of many that crowd a pocket of the far reaches. It whips tendrils and breathes poison." },
  frostBlob: { id: "frostBlob", prototypeOnly: true, farKin: true, noEcho: true, name: "Frost Blob", epithet: "Kin of the Morphing Blob",
    stats: [70, 9, 0], form: { scale: .95 }, sizeClass: "medium", movement: "walk", brain: "duelist",
    attacks: ["blobTendrils", "blobGasJet"], bossAttacks: [],
    palette: ["#9fd4f0", "#1c3a50", "#e8fbff", "#ffffff"], render: "morphingBlob", tags: ["ooze", "gas"],
    lore: "A blob of living ooze the colour of meltwater, kin of the Morphing Blob and much smaller, one of many that crowd a pocket of the far reaches. It whips tendrils and breathes poison." },
  duskBlob: { id: "duskBlob", prototypeOnly: true, farKin: true, noEcho: true, name: "Dusk Blob", epithet: "Kin of the Morphing Blob",
    stats: [70, 9, 0], form: { scale: .95 }, sizeClass: "medium", movement: "walk", brain: "duelist",
    attacks: ["blobTendrils", "blobGasJet"], bossAttacks: [],
    palette: ["#8a6ad0", "#24163f", "#e0b8ff", "#f8f0ff"], render: "morphingBlob", tags: ["ooze", "gas"],
    lore: "A blob of living ooze the colour of night, kin of the Morphing Blob and much smaller, one of many that crowd a pocket of the far reaches. It whips tendrils and breathes poison." },
  saltBlob: { id: "saltBlob", prototypeOnly: true, farKin: true, noEcho: true, name: "Salt Blob", epithet: "Kin of the Morphing Blob",
    stats: [70, 9, 0], form: { scale: .95 }, sizeClass: "medium", movement: "walk", brain: "duelist",
    attacks: ["blobTendrils", "blobGasJet"], bossAttacks: [],
    palette: ["#e8e0cc", "#5a4c34", "#fff8e0", "#ffffff"], render: "morphingBlob", tags: ["ooze", "gas"],
    lore: "A blob of living ooze the colour of brine, kin of the Morphing Blob and much smaller, one of many that crowd a pocket of the far reaches. It whips tendrils and breathes poison." },
  // Release 716 (Tim: "the crystal civilization... all the monsters... are psychic crystals or variations... some of them can be
  // smaller, like half crystals... crystal walkers, like the crystal crabs"): the Crystal Civilisation's kin (far-realms.ts FAR_CIVS).
  // Release 731: the haunts (haunts.ts): Gloomwisps that multiply and pour together into a Gloomgorge.
  gloomwisp: { id: "gloomwisp", prototypeOnly: true, farKin: true, noEcho: true, name: "Gloomwisp", epithet: "A Grin in the Dark",
    stats: [34, 6, 0], form: { scale: .95 }, sizeClass: "small", movement: "hover", brain: "orbit",
    attacks: ["wispBewilder", "bite"], bossAttacks: [],
    palette: ["#1d2340", "#0b0e1f", "#5aa6ff", "#a8e4ff"], render: "gloomwisp" /* release 737 (Tim): blue light, not violet */, tags: ["spirit", "gas", "flying"],
    lore: "A ball of dark gas no bigger than a head, with two bright eyes and a wide grin, that drifts through old keeps. Its breath turns you about. Left alone, it splits; enough of them together pour into something much worse." },
  gloomgorge: { id: "gloomgorge", prototypeOnly: true, farKin: true, noEcho: true, name: "Gloomgorge", epithet: "Many Wisps, One Mouth",
    stats: [260, 16, 2], form: { scale: 1.55 }, sizeClass: "large", movement: "hover", brain: "duelist",
    attacks: ["clawSweep", "devourPull", "leapSlam", "gorgeHowl"], bossAttacks: [],
    palette: ["#232c52", "#0c1024", "#6ab4ff", "#bdeeff"], render: "gloomgorge" /* release 737 */, tags: ["spirit", "gas"],
    lore: "Five or more Gloomwisps poured into one: a squat, fat ghost with a mouth from ear to ear, stubby arms and legs that end in hooked claws, and a howl that turns the world about. It drinks the air to pull you in." },
  // The Pentagon finale's haunt (haunts.ts GLOOM_FINALE). Its stats are placeholders: Game tunes it to the Wayfarer (tuneGloomFinale).
  gloomvast: { id: "gloomvast", prototypeOnly: true, farKin: true, noEcho: true, unique: true, name: "The Gloomvast", epithet: "Where the Haunts Go Down",
    stats: [1200, 30, 0], form: { scale: 2.1 }, sizeClass: "huge", movement: "hover", brain: "duelist",
    attacks: ["vastRake", "devourPull", "vastWail", "vastGloomfall", "vastLights", "vastPlunge"], bossAttacks: [],
    palette: ["#5a8ad8", "#1c3a7c", "#9fdcff", "#f2fbff"], render: "gloomvast", tags: ["spirit", "gas", "elder"],
    lore: "Some say the haunts do not end; they go down, and this is where. It is larger than the room it fills, and not wholly in it. When it closes its hands the light goes out of the world and the dark fills with cold lights, and one of them is looking at you. No one who has said so was sure which." },
  gloomShade: { id: "gloomShade", prototypeOnly: true, farKin: true, noEcho: true, minion: true, name: "Cold Light", epithet: "One of Many in the Dark",
    stats: [100, 6, 0], form: { scale: .9 }, sizeClass: "small", movement: "hover", brain: "orbit",
    attacks: ["shadeTouch", "shadePuff"], bossAttacks: [],
    palette: ["#1a2a52", "#050a1c", "#7cc4ff", "#d8f2ff"], render: "gloomShade", tags: ["spirit", "gas", "flying"],
    lore: "A shadowy blue light in the Gloomvast's dark. Strike it and it hardly notices." },
  shardling: { id: "shardling", prototypeOnly: true, farKin: true, noEcho: true, name: "Shardling", epithet: "Half a Crystal",
    stats: [45, 8, 0], form: { scale: .6 }, sizeClass: "small", movement: "hover", brain: "orbit",
    attacks: ["psyPush", "psyDebris"], bossAttacks: [],
    palette: ["#d8c8f0", "#40306a", "#f0e8ff", "#ffffff"], render: "psychicCrystal", tags: ["construct", "mind", "crystal"],
    lore: "A crystal no bigger than a child, half the size of the great Psychic Crystal and with half its mind. It floats in the streets of the Crystal Civilisation, pushing strangers away and throwing stones." },
  prismWarden: { id: "prismWarden", prototypeOnly: true, farKin: true, noEcho: true, name: "Prism Warden", epithet: "A Mind That Keeps the Streets",
    stats: [105, 11, 0], form: { scale: .9 }, sizeClass: "medium", movement: "hover", brain: "orbit",
    attacks: ["psyPull", "psyWall", "psyDebris"], bossAttacks: [],
    palette: ["#a8e0e8", "#20485a", "#e0fbff", "#ffffff"], render: "psychicCrystal", tags: ["construct", "mind", "crystal"],
    lore: "A tall clear crystal that keeps the streets of the Crystal Civilisation. It draws strangers in, raises walls of thought against them, and stones them." },
  crystalStrider: { id: "crystalStrider", prototypeOnly: true, farKin: true, noEcho: true, name: "Crystal Strider", epithet: "The Geode That Walks the Streets",
    stats: [80, 11, 0], form: { scale: 1.3 }, sizeClass: "medium", movement: "skitter", brain: "flank",
    attacks: ["clawSweep", "leapSlam"], bossAttacks: [],
    palette: ["#8a70b8", "#24183a", "#9ff8ff", "#f0ffff"], render: "crystalCrab", tags: ["beast", "crystal"],
    lore: "A great crab of the Crystal Civilisation that wears a geode the size of a barrel. It sidles round you and springs, pincers first, like its little cousins in the canyons." },
  // Release 717 (Tim: "different versions of the lightning giant... way far out... all the monsters and all the creatures are
  // lighting giants... different variations, so it looks like this is their lightning giant civilization"): its kin (FAR_CIVS.storm).
  stormling: { id: "stormling", prototypeOnly: true, farKin: true, noEcho: true, name: "Stormling", epithet: "A Young Giant",
    stats: [75, 10, 0], form: { scale: .95 }, sizeClass: "large", movement: "walk", brain: "duelist",
    attacks: ["giantSwing", "giantShock"], bossAttacks: [],
    palette: ["#6d757e", "#1d2229", "#9fe0ff", "#eafaff"], render: "lightningGiant", tags: ["construct", "lightning"],
    lore: "A young robot of the Storm Halls, half the height of the great Lightning Giant, its coils still small. It swings its club and grounds a shock through you." },
  coilWarden: { id: "coilWarden", prototypeOnly: true, farKin: true, noEcho: true, name: "Coil Warden", epithet: "Keeper of the Storm Halls",
    stats: [140, 13, 0], form: { scale: 1.4 }, sizeClass: "huge", movement: "walk", brain: "duelist",
    attacks: ["giantArcs", "giantSwing", "giantSlam"], bossAttacks: [],
    palette: ["#5a626c", "#181c22", "#7fd6ff", "#eafaff"], render: "lightningGiant", tags: ["construct", "lightning"],
    lore: "A tall old robot that keeps the streets of the Storm Halls, its coils crackling. Lightning arcs from it to whoever comes too close, and its club comes down hard." },
  sparkHauler: { id: "sparkHauler", prototypeOnly: true, farKin: true, noEcho: true, name: "Spark Hauler", epithet: "A Worker of the Storm Halls",
    stats: [100, 11, 0], form: { scale: 1.15 }, sizeClass: "large", movement: "walk", brain: "juggernaut",
    attacks: ["giantShock", "giantSlam"], bossAttacks: [],
    palette: ["#7a6a58", "#221c16", "#ffe08a", "#fff8e0"], render: "lightningGiant", tags: ["construct", "lightning"],
    lore: "A broad-shouldered robot that hauls stone and charge through the Storm Halls. It does not like to be interrupted: it slams the ground and the shock runs out through it." },
  // Release 719 (Tim: "a section with the landscape as all like inky, black... melting... ingly black creatures... the astral
  // worm... his homeland... many creatures that look like the different versions of the astral worm... multiple legs and the mouth
  // and the blob... the griffin... the dragonfly... these creatures won't transform... smaller versions of him... normal size"):
  // the Ink Wastes' own kin (far-realms.ts FAR_INK), each one of the Worm's shapes kept for good (drawn with drawAstralWorm).
  inkPool: { id: "inkPool", prototypeOnly: true, farKin: true, noEcho: true, name: "Ink Pool", epithet: "A Shape of the Astral Worm", inkForm: "pool", inkScale: .68,
    stats: [70, 9, 0], form: { scale: 1 }, sizeClass: "medium", movement: "walk", brain: "duelist",
    attacks: ["bite", "groundRupture"], bossAttacks: [],
    palette: ["#07090e", "#030508", "#697785", "#c4d0dc"], render: "inkKin", tags: ["ink"],
    lore: "A pool of living ink that keeps the Astral Worm's resting shape, as wide as a cart, that rises at your feet and bites." },
  inkGriffin: { id: "inkGriffin", prototypeOnly: true, farKin: true, noEcho: true, name: "Ink Griffin", epithet: "A Shape of the Astral Worm", inkForm: "griffin", inkScale: .58,
    stats: [85, 11, 0], form: { scale: 1 }, sizeClass: "medium", movement: "hover", brain: "duelist",
    attacks: ["diveBomb", "clawSweep"], bossAttacks: [],
    palette: ["#07090e", "#030508", "#697785", "#c4d0dc"], render: "inkKin", tags: ["ink"],
    lore: "An eagle and a lion grown from one black ink, the size of a horse: the Astral Worm's griffin shape, small and settled into it for good. It stoops and rakes." },
  inkWing: { id: "inkWing", prototypeOnly: true, farKin: true, noEcho: true, name: "Ink Wing", epithet: "A Shape of the Astral Worm", inkForm: "flight", inkScale: .52,
    stats: [55, 9, 0], form: { scale: 1 }, sizeClass: "medium", movement: "hover", brain: "duelist",
    attacks: ["diveBomb", "bite"], bossAttacks: [],
    palette: ["#07090e", "#030508", "#697785", "#c4d0dc"], render: "inkKin", tags: ["ink"],
    lore: "A long black dragonfly of ink, the Astral Worm's flying shape in small. It darts in and bites." },
  inkStrider: { id: "inkStrider", prototypeOnly: true, farKin: true, noEcho: true, name: "Ink Strider", epithet: "A Shape of the Astral Worm", inkForm: "trample", inkScale: .56,
    stats: [90, 11, 0], form: { scale: 1 }, sizeClass: "medium", movement: "walk", brain: "duelist",
    attacks: ["ramCharge", "bite"], bossAttacks: [],
    palette: ["#07090e", "#030508", "#697785", "#c4d0dc"], render: "inkKin", tags: ["ink"],
    lore: "A many-legged thing of ink, the Astral Worm's trampling shape, that runs you down and stamps." },
  inkMaw: { id: "inkMaw", prototypeOnly: true, farKin: true, noEcho: true, name: "Ink Maw", epithet: "A Shape of the Astral Worm", inkForm: "bite", inkScale: .56,
    stats: [75, 12, 0], form: { scale: 1 }, sizeClass: "medium", movement: "walk", brain: "duelist",
    attacks: ["bite", "leapSlam"], bossAttacks: [],
    palette: ["#07090e", "#030508", "#697785", "#c4d0dc"], render: "inkKin", tags: ["ink"],
    lore: "Mostly mouth: the Astral Worm's biting shape in small, a black maw on legs of ink." },
  // The Pentagon roofs (roof-dwellers.ts; Tim, 2026-11-04: "gargoyles and angels and demons up there... some bird creatures"; then
  // "a big stone lumbering creature... a laser from its chest"). Original designs. `roofKin`: they live only on a Pentagon's roof,
  // hidden and still until the Wayfarer stands up there; drawn once into cached pictures (monster-render.ts cachedRoof). The angel
  // of the roster is the existing Cinder Seraph (ROOF_DWELLERS.kinds), not a new creature.
  roofGargoyle: { id: "roofGargoyle", prototypeOnly: true, roofKin: true, noEcho: true, name: "Eave Gargoyle", epithet: "Stone Until It Is Not",
    stats: [58, 10, 0], form: { scale: 1.05 }, sizeClass: "medium", movement: "walk", brain: "duelist",
    attacks: ["clawSweep", "leapSlam"], bossAttacks: ["shockwave"],
    palette: ["#77746d", "#34322e", "#ff9a3c", "#d9d3c5"], render: "roofGargoyle", tags: ["construct", "stone", "roof"],
    lore: "A crouched shape on the eaves, horned, its wings folded like a cloak. From the ground it is carving. Up there it is not always carving." },
  ridgeDemon: { id: "ridgeDemon", prototypeOnly: true, roofKin: true, noEcho: true, name: "Ridge Demon", epithet: "Horned on the Heights",
    stats: [96, 13, 0], form: { scale: 1.3 }, sizeClass: "large", movement: "walk", brain: "duelist",
    attacks: ["demonCleave", "firefall", "clawSweep"], bossAttacks: ["ramCharge"],
    palette: ["#5c1c18", "#1d0907", "#ff6a1f", "#ffd59a"], render: "ridgeDemon", tags: ["fiend", "fire", "roof"],
    lore: "Tall, horned, hoofed, its hide cracked through with a slow fire. It walks the ridges of the roof as if it has always walked them. Perhaps it has." },
  slateRook: { id: "slateRook", prototypeOnly: true, roofKin: true, noEcho: true, name: "Slate Rook", epithet: "The Flock on the Parapet",
    stats: [16, 5, 0], form: { scale: .78 }, sizeClass: "small", movement: "fly", brain: "flank",
    attacks: ["bite", "diveBomb"], bossAttacks: [],
    palette: ["#3b414e", "#14161c", "#e9c35a", "#f1eee4"], render: "slateRook", tags: ["beast", "flying", "roof"],
    lore: "Grey birds that sit so still on the parapet they look cut from it. They rise all at once, and they do not settle for long." },
  roofColossus: { id: "roofColossus", prototypeOnly: true, roofKin: true, noEcho: true, name: "Battlement Colossus", epithet: "A Lamp Where the Heart Would Be",
    stats: [210, 14, 0], form: { scale: 1.9 }, sizeClass: "huge", movement: "lurch", brain: "duelist",
    attacks: ["stoneSlam", "chestLaser"], bossAttacks: ["shockwave"],
    palette: ["#8a8478", "#3a362f", "#ff4a2a", "#ffe2c4"], render: "roofColossus", tags: ["construct", "stone", "roof", "light"],
    lore: "Fitted blocks the size of a cart, stacked into a body that walks very slowly. In its chest, a round lamp. Whatever the lamp looks at long enough is not there afterwards." },
  mothChrysalis: { // release 708: the Ashen Moth's chrysalis on a great tree (world-beasts.ts CHRYSALIS); it does nothing but hang
    id: "mothChrysalis", prototypeOnly: true, name: "Ash Chrysalis", epithet: "Something Waiting", unique: true, noEcho: true, // not a creature of the roster: only the great trees hang it
    stats: [120, 0, 0], form: { scale: 1.5 }, sizeClass: "medium", movement: "lurch", brain: "duelist",
    attacks: [], bossAttacks: [], palette: ["#6a645c", "#2a2420", "#ff8a2a", "#ffe2b0"], render: "mothChrysalis", tags: ["fire", "dormant"],
    lore: "A chrysalis of grey ash as long as a man, hanging from a branch of a great tree, warm, its seams glowing. Break it and what is inside comes out early, and angry.",
  },
  ashenMoth: {
    id: "ashenMoth", name: "The Ashen Moth", epithet: "The Lantern in the Smoke", unique: true,
    stats: [280, 16, 0], form: { scale: 1.6 }, sizeClass: "large", movement: "hover", brain: "orbit",
    attacks: ["mothGust", "mothDust", "mothDive", "mothSpiral", "mothSwarm", "mothCocoon", "mothKindle", "mothThreads", "mothThreadBlast", "mothGale"], bossAttacks: ["sweepBeam"],
    palette: ["#4a4440", "#16120f", "#ff8a2a", "#ffe2b0"], render: "ashenMoth", tags: ["beast", "elder", "fire", "flying"],
    lore: "A moth as wide as a house, grey as cold ash, the eyes on its wings two embers that never go out. Its wings throw you back and shake down burning dust; it dives through you and leaves the ground alight, turns spirals of embers, sends little burning moths after you, hides in a cocoon of ash that bursts, and sweeps you with the light of its lantern eyes. Kindled, it burns from wingtip to wingtip.",
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
  // Seed realms (seed-realms.ts, Tim 2026-11-11): the Hollow Husk's dead and the Drifting Ship's robots. Found only there
  // (prototypeOnly keeps them out of the crossings' ecologies and the Echoes); drawn by seed-realm-render.ts.
  hollowMiner: { id: "hollowMiner", prototypeOnly: true, noEcho: true, name: "Hollow Miner", epithet: "Still on Shift",
    stats: [52, 10, 0], form: { scale: 1.05 }, sizeClass: "medium", movement: "hover", brain: "duelist",
    attacks: ["longStab", "groundRupture"], bossAttacks: [],
    palette: ["#a9c4c9", "#1d2a30", "#ffd27a", "#f4fbff"], render: "hollowMiner", tags: ["spirit", "earth"],
    lore: "A miner's ghost, lamp still lit, pick still swinging. It does not know the world it dug is gone; it only knows you are in the way." },
  veinWraith: { id: "veinWraith", prototypeOnly: true, noEcho: true, name: "Vein Wraith", epithet: "The Ore That Walked Away",
    stats: [40, 9, 6], form: { scale: .95 }, sizeClass: "medium", movement: "fly", brain: "orbit",
    attacks: ["sweepBeam", "bite"], bossAttacks: [],
    palette: ["#7fd8c4", "#123032", "#c8fff0", "#ffffff"], render: "veinWraith", tags: ["spirit", "crystal", "flying"],
    lore: "A seam of glowing ore that tore itself out of the rock when the miners came. It drifts over the drop and burns a line across whoever it watches." },
  lastForeman: { id: "lastForeman", prototypeOnly: true, noEcho: true, unique: true, name: "The Last Foreman", epithet: "Who Kept Them Digging",
    stats: [110, 15, 0], form: { scale: 1.75 }, sizeClass: "huge", movement: "hover", brain: "juggernaut",
    attacks: ["shockwave", "longStab", "groundRupture"], bossAttacks: ["sigilScatter", "phaseCharge"],
    palette: ["#c9b48a", "#2a2018", "#ffb347", "#fff2d0"], render: "lastForeman", tags: ["spirit", "earth"],
    lore: "The husk's last overseer, grown huge on the drills it ordered sunk. Its lamps still sweep the dark for idle hands." },
  deckSentry: { id: "deckSentry", prototypeOnly: true, noEcho: true, name: "Deck Sentry", epithet: "An Eye on Every Deck",
    stats: [38, 8, 6], form: { scale: .85 }, sizeClass: "small", movement: "hover", brain: "kite",
    attacks: ["sweepBeam", "bite"], bossAttacks: [],
    palette: ["#b8c4cc", "#262c33", "#ff4a4a", "#ffe0e0"], render: "deckSentry", tags: ["construct", "robot"],
    lore: "A ball of armour on a humming field, one red lens wide open. It keeps its distance and keeps you in its beam." },
  hullWarden: { id: "hullWarden", prototypeOnly: true, noEcho: true, name: "Hull Warden", epithet: "Security, Long Unrelieved",
    stats: [70, 11, 0], form: { scale: 1.2 }, sizeClass: "large", movement: "walk", brain: "duelist",
    attacks: ["clawSweep", "shockwave"], bossAttacks: [],
    palette: ["#8d98a3", "#1c2127", "#5ad1ff", "#e8fbff"], render: "hullWarden", tags: ["construct", "robot"],
    lore: "A tall security frame with a shock baton. It still walks its rounds, and it still stops anyone who has no pass." },
  riveter: { id: "riveter", prototypeOnly: true, noEcho: true, name: "Riveter", epithet: "Repairs in Progress",
    stats: [34, 8, 7], form: { scale: .9 }, sizeClass: "small", movement: "skitter", brain: "artillery",
    attacks: ["mortarVolley", "bite"], bossAttacks: [],
    palette: ["#c9a24a", "#2a2214", "#ffcf6a", "#fff4d6"], render: "riveter", tags: ["construct", "robot"],
    lore: "A six-legged repair crawler. It used to fix the hull; now it lobs hot rivets at anything that moves." },
  helmSovereign: { id: "helmSovereign", prototypeOnly: true, noEcho: true, unique: true, name: "The Helm Sovereign", epithet: "Holding Course",
    stats: [120, 16, 5], form: { scale: 1.85 }, sizeClass: "huge", movement: "walk", brain: "juggernaut",
    attacks: ["ramCharge", "sweepBeam", "shockwave"], bossAttacks: ["mortarVolley", "groundRupture"],
    palette: ["#d0d6de", "#1a1e26", "#ff3b5c", "#ffe3ea"], render: "helmSovereign", tags: ["construct", "robot"],
    lore: "The ship's mind, given a body to defend the helm. It has held the same course for longer than anyone aboard has lived." },
  // Adventure creatures (adventure-creatures.ts; Tim, 2026-11-11: new creatures for the adventures' tall, open ground, original designs).
  // `adventureKin`: found only where an adventure's theme table places them (prototypeOnly keeps them off every crossing, dungeon,
  // guardian pool and Echo list; they keep their own kits, no hybrid). Drawn by adventure-creature-render.ts, solid in Close View
  // through close-view-adventure-models.ts.
  galleryLurker: { id: "galleryLurker", prototypeOnly: true, adventureKin: true, noEcho: true, name: "Gallery Lurker", epithet: "It Waits on the Rail",
    stats: [40, 10, 0], form: { scale: 1.05 }, sizeClass: "medium", movement: "skitter", brain: "perch",
    attacks: ["ledgeDrop", "clawSweep", "ledgeClimb"], bossAttacks: ["shockwave"],
    palette: ["#8c8577", "#24211d", "#e8b04a", "#f6e7c4"], render: "galleryLurker", tags: ["beast", "climber", "tomb"],
    lore: "A gaunt grey thing of too many joints that hangs from the lip of a gallery like a gargoyle that forgot to set. Two amber eyes, and a patience that ends all at once." },
  censerWarden: { id: "censerWarden", prototypeOnly: true, adventureKin: true, noEcho: true, name: "Censer Warden", epithet: "Keeper of the Low Smoke",
    stats: [46, 9, 6], form: { scale: 1.15 }, sizeClass: "medium", movement: "walk", brain: "vantage",
    attacks: ["censerLob", "clawSweep"], bossAttacks: ["sigilScatter"],
    palette: ["#5a5148", "#1c1916", "#ffb347", "#ffe9c2"], render: "censerWarden", tags: ["spirit", "fire", "tomb"],
    lore: "A tall hooded keeper with a censer on a long chain. It keeps to the upper galleries and sends its smoke down to whoever walks below." },
  vinehookLeaper: { id: "vinehookLeaper", prototypeOnly: true, adventureKin: true, noEcho: true, name: "Vinehook Leaper", epithet: "It Takes the High Branch",
    stats: [36, 9, 0], form: { scale: 1 }, sizeClass: "medium", movement: "skitter", brain: "flank",
    attacks: ["vineVault", "clawSweep", "vineRetreat"], bossAttacks: ["shockwave"],
    palette: ["#4f6b3a", "#1a2414", "#c9e86a", "#f2ffd0"], render: "vinehookLeaper", tags: ["beast", "climber", "jungle"],
    lore: "Long arms ending in hooks of green horn, a tail like a coiled vine. It crosses the ruin by its heights and comes down only to strike." },
  thornspitterBloom: { id: "thornspitterBloom", prototypeOnly: true, adventureKin: true, noEcho: true, name: "Thornspitter Bloom", epithet: "The Flower That Aims",
    stats: [34, 8, 7], form: { scale: 1 }, sizeClass: "medium", movement: "lurch", brain: "vantage",
    attacks: ["thornDarts", "bite"], bossAttacks: ["groundRupture"],
    palette: ["#3e6b4a", "#142218", "#ff6a8a", "#ffe0ea"], render: "thornspitterBloom", tags: ["plant", "jungle"],
    lore: "A fleshy bloom on a crawling root, rooted on the old terraces. It turns to follow you like a flower follows the sun, and then it fires." },
  sinkmaw: { id: "sinkmaw", prototypeOnly: true, adventureKin: true, noEcho: true, name: "Sinkmaw", epithet: "The Hollow in the Dune",
    stats: [58, 11, 0], form: { scale: 1.25 }, sizeClass: "large", movement: "burrow", brain: "ambush",
    attacks: ["sinkFunnel", "burrowAmbush", "bite"], bossAttacks: ["shockwave"],
    palette: ["#c9a46a", "#3a2a18", "#ff8a3a", "#fff0d0"], render: "sinkmaw", tags: ["beast", "burrow", "desert"],
    lore: "A mouth the width of a cart under a skin of sand. The dune dimples where it lies; step on the dimple and the dune becomes a throat." },
  cinderKite: { id: "cinderKite", prototypeOnly: true, adventureKin: true, noEcho: true, name: "Cinder Kite", epithet: "It Rides the Heat",
    stats: [30, 8, 0], form: { scale: 1.1 }, sizeClass: "medium", movement: "fly", brain: "loop",
    attacks: ["glassStrafe", "bite"], bossAttacks: ["diveBomb"],
    palette: ["#b0643a", "#2b1a12", "#ffd27a", "#f4e6cc"], render: "cinderKite", tags: ["beast", "flying", "desert"],
    lore: "A rust-red sail of skin on bone ribs that turns the same slow loop over the waste all day. When it sees you it banks, comes in low, and the sand behind it starts to glitter." },
  // The second set (Tim, 2026-11-11: two for each of the other four themes, each theme its own; no bosses).
  lamplighter: { id: "lamplighter", prototypeOnly: true, adventureKin: true, noEcho: true, name: "Lamplighter", epithet: "Keeper of the Night Beat",
    stats: [44, 10, 0], form: { scale: 1.1 }, sizeClass: "medium", movement: "walk", brain: "patrol",
    attacks: ["poleThrust", "lampFlare"], bossAttacks: ["sigilScatter"],
    palette: ["#4a4f58", "#16181c", "#f0a840", "#fff0c8"], render: "lamplighter", tags: ["spirit", "fire", "city"],
    lore: "A long coat, a tall hat, a lamp on a pole twice its height. It walks the same streets every night, and its lamp finds you before its eyes do." },
  knellkeeper: { id: "knellkeeper", prototypeOnly: true, adventureKin: true, noEcho: true, name: "Knellkeeper", epithet: "The Bell Above the Square",
    stats: [52, 10, 0], form: { scale: 1.2 }, sizeClass: "large", movement: "walk", brain: "vantage",
    attacks: ["bellToll", "heavySweep"], bossAttacks: ["shockwave"],
    palette: ["#5c5248", "#1e1a16", "#c8a050", "#f2e4c0"], render: "knellkeeper", tags: ["construct", "city"],
    lore: "A hunched bell-ringer grown into its bell: bronze where its back should be. It keeps the belfries and the high squares, and every toll rolls down the streets below." },
  spindriftMedusa: { id: "spindriftMedusa", prototypeOnly: true, adventureKin: true, noEcho: true, name: "Spindrift Medusa", epithet: "It Drifts Between the Plates",
    stats: [34, 8, 6], form: { scale: 1.05 }, sizeClass: "medium", movement: "hover", brain: "kite",
    attacks: ["tendrilRain", "membranePulse"], bossAttacks: ["sweepBeam"],
    palette: ["#5a3a7a", "#1a0e26", "#70e0f0", "#e8fbff"], render: "spindriftMedusa", tags: ["beast", "flying", "alien"],
    lore: "A glass bell of violet membrane, lit from inside, trailing a curtain of fine tendrils. It rises and sinks with the floating plates as if it were one of them." },
  prismStilt: { id: "prismStilt", prototypeOnly: true, adventureKin: true, noEcho: true, name: "Prism Stilt", epithet: "The Lens on Three Legs",
    stats: [40, 9, 6], form: { scale: 1.2 }, sizeClass: "large", movement: "blink", brain: "vantage",
    attacks: ["prismBeam", "phaseStep", "bite"], bossAttacks: ["blinkStrike"],
    palette: ["#4a5a6a", "#141a22", "#a0f0ff", "#ffffff"], render: "prismStilt", tags: ["construct", "alien"],
    lore: "Three needle legs under a cut-crystal head. It steps from plate to plate without crossing the space between, and where it looks, the light burns." },
  rimeSentinel: { id: "rimeSentinel", prototypeOnly: true, adventureKin: true, noEcho: true, name: "Rime Sentinel", epithet: "It Never Left the Wall",
    stats: [46, 10, 6], form: { scale: 1.15 }, sizeClass: "medium", movement: "walk", brain: "vantage",
    attacks: ["icicleLine", "poleThrust"], bossAttacks: ["groundRupture"],
    palette: ["#6a7e94", "#1a2430", "#bfe8ff", "#f4fbff"], render: "rimeSentinel", tags: ["spirit", "ice", "frost"],
    lore: "A sentry frozen at its post so long the frost became its armour. It still holds its spear, and it still keeps the wall walk." },
  lakeGlider: { id: "lakeGlider", prototypeOnly: true, adventureKin: true, noEcho: true, name: "Lake Glider", epithet: "It Skates Under the Moon",
    stats: [38, 10, 0], form: { scale: 1.05 }, sizeClass: "medium", movement: "skitter", brain: "juggernaut",
    attacks: ["glideRake", "bite"], bossAttacks: ["shockwave"],
    palette: ["#8aa0b4", "#202a36", "#e0f4ff", "#ffffff"], render: "lakeGlider", tags: ["beast", "ice", "frost"],
    lore: "Long, low and pale, on blade-shaped legs. It crosses the frozen lake in long silent glides, and it does not stop for you." },
  hookhanger: { id: "hookhanger", prototypeOnly: true, adventureKin: true, noEcho: true, name: "Hookhanger", epithet: "It Rides the Crane Chains",
    stats: [42, 10, 0], form: { scale: 1.05 }, sizeClass: "medium", movement: "skitter", brain: "perch",
    attacks: ["pendulumSwing", "heavySweep", "ledgeClimb"], bossAttacks: ["shockwave"],
    palette: ["#5a4a40", "#1c1612", "#ff8030", "#ffd8b0"], render: "hookhanger", tags: ["construct", "climber", "foundry"],
    lore: "A soot-black thing of chain and hook that hangs from the crane rails over the catwalks. It drops into a swing, and the swing goes straight through you." },
  slagwright: { id: "slagwright", prototypeOnly: true, adventureKin: true, noEcho: true, name: "Slagwright", epithet: "The Ladle on the Catwalk",
    stats: [48, 9, 6], form: { scale: 1.15 }, sizeClass: "medium", movement: "walk", brain: "vantage",
    attacks: ["slagPour", "heavySweep"], bossAttacks: ["firefall"],
    palette: ["#4a3a32", "#1a120e", "#ff7a20", "#ffe0a0"], render: "slagwright", tags: ["construct", "fire", "foundry"],
    lore: "A foundry hand of riveted plate with a ladle as long as a man. It works the high catwalks, and what it pours runs down to everyone below." },
  // The Gaunt (duelists.ts; Tim, 2026-11-12): hooded, stick-thin duelists a head taller than most, with heavy hands and no face under
  // the cowl. Placed only by Game.placeDuelists (ground first entered from DUELISTS.version) and the Proving Ground; their kits are
  // their own (no hybrid, no Echo, never a guardian).
  gauntDuelist: { id: "gauntDuelist", prototypeOnly: true, duelistKin: true, noEcho: true, name: "Gaunt Duelist", epithet: "The Cowl That Fences",
    stats: duelistStats("gauntDuelist"), form: { scale: DUELISTS.scale }, sizeClass: "medium", movement: "walk", brain: "fencer",
    attacks: [...DUELISTS.kits.gauntDuelist], bossAttacks: [],
    palette: ["#9a948a", "#26262b", "#ff5a4a", "#7a2a2a"], render: "gauntDuelist", tags: ["humanoid", "blade"],
    lore: "Wrapped in ash-grey bands, thin as a drawn wire, its face lost in a charcoal cowl. It circles, waits, and cuts three times before you have answered once." },
  gauntCutthroat: { id: "gauntCutthroat", prototypeOnly: true, duelistKin: true, noEcho: true, name: "Gaunt Cutthroat", epithet: "Two Knives, No Face",
    stats: duelistStats("gauntCutthroat"), form: { scale: DUELISTS.scale }, sizeClass: "medium", movement: "skitter", brain: "fencer",
    attacks: [...DUELISTS.kits.gauntCutthroat], bossAttacks: [],
    palette: ["#8e877c", "#222226", "#ff5a4a", "#6e2626"], render: "gauntCutthroat", tags: ["humanoid", "blade"],
    lore: "It never stands still: in, two cuts, and out again before the blood shows. The knives are the only part of it that catches the light." },
  gauntLongarm: { id: "gauntLongarm", prototypeOnly: true, duelistKin: true, noEcho: true, name: "Gaunt Longarm", epithet: "It Keeps You at the Blade's End",
    stats: duelistStats("gauntLongarm"), form: { scale: DUELISTS.scale }, sizeClass: "medium", movement: "walk", brain: "fencer",
    attacks: [...DUELISTS.kits.gauntLongarm], bossAttacks: [],
    palette: ["#a8a092", "#28272c", "#ff5a4a", "#5e2228"], render: "gauntLongarm", tags: ["humanoid", "blade"],
    lore: "A cowled pole of a thing with a polearm longer than itself. It wants you one blade's length away, and it will hop back to keep you there." },
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
  if (!def || kind === "voidWalker" || def.roofKin || def.adventureKin || def.duelistKin) return { hybridAttack: null, donor: null }; // the roof dwellers (and the adventure creatures, and the Gaunt) keep their own kits
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
    ...(kind === "wildStego" ? stegoPoseDefaults() : {}),
    ...(kind === "spinoRex" ? spinoPoseDefaults() : {}),
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
  // A reset Lantern returns to material hover; its discarded leap cannot retain lift.
  if (enemy.kind === "graveLantern") enemy.hopLift = 0;
  if (MONSTER_PACK[enemy.kind]?.duelistKin) { enemy.hopLift = 0; enemy.aloft = false; enemy.duelPose = null; } // the Gaunt: a hop or a cut never resumes mid-air
  if (MONSTER_PACK[enemy.kind]?.adventureKin) { enemy.hopLift = 0; enemy.advCling = null; enemy.advPerched = false; enemy.advPose = null; } // a leap, a cling or a kite's height never resumes mid-air (its loop and home do; a Lurker by a wall clings again: advInit)
  if (enemy.kind === "psychicCrystal") enemy.crystalFall = 0; // release 259: a poise break does not survive a reload
  if (enemy.kind === "gloomvast") { enemy.gloomReel = 0; enemy.gloomFade = 0; enemy.poiseBreak = 0; if (!(enemy.gloomDark?.left > 0)) { enemy.gloomDark = null; enemy.gloomVeil = false; enemy.brain = MONSTER_PACK.gloomvast.brain; enemy.packAttacks = [...MONSTER_PACK.gloomvast.attacks, ...(enemy.hybridAttack ? [enemy.hybridAttack] : [])]; } else enemy.gloomDark.laid = false; } // the Gloomvast's Dark carries over a reload (Game.gloomResume lays its decoys again); nothing else of it does
  // Snapshots retain attack lists. Move the sky attack for existing journeys too, without retuning their beasts.
  if (enemy.kind === "nanobotKnight") enemy.packAttacks = (enemy.packAttacks || MONSTER_PACK.nanobotKnight.attacks).filter((id) => id !== "knightOrbital");
  if (enemy.kind === "psychicCrystal" && !(enemy.packAttacks || []).includes("psyOrbital")) enemy.packAttacks = [...(enemy.packAttacks || MONSTER_PACK.psychicCrystal.attacks), "psyOrbital"].filter((id, i, ids) => ids.indexOf(id) === i);
  if (enemy.kind === "wildStego") { enemy.stegoPose = null; enemy.stegoAir = 0; enemy.stegoRoll = 0; enemy.stegoTree = null; enemy.stegoClimb = 0; enemy.stegoClimbDir = null; enemy.stegoSwim = 0; } // a move, a hop or a climb never resumes mid-way; its tail, tail wear and plates are kept
  if (enemy.kind === "spinoRex") { enemy.spinoFossil = enemy.spinoFossil === true; Object.assign(enemy, spinoPoseDefaults(), { spinoFossil: enemy.spinoFossil, spinoShed: enemy.spinoFossil ? 1 : 0 }); delete enemy.spinoArriving; } // a move, a grab or the shed never resumes mid-way; once bone, it stays bone
  if (enemy.spinoHeldBy) delete enemy.spinoHeldBy; // a creature in the Spinosaurus's jaws is let go by a reload
  enemy.voidDashing = false; enemy.voidCharging = false; enemy.voidTeleport = 0;
  enemy.untargetable = false; enemy.hidden = false; enemy.aloft = false; enemy.phasing = false; enemy.iceShield = false; enemy.spinning = false; enemy.tucked = false; enemy.sliding = false; enemy.mist = false; enemy.thrusting = null; enemy.swing = null; enemy.giantPose = null; enemy.giantCharged = 0; enemy.giantAir = 0; enemy.giantThrust = false; enemy.giantDash = null; enemy.stagPose = null; enemy.stagAir = 0; enemy.stagHunt = 0; enemy.stagMending = false; /* release 705; 708 */ enemy.mothPose = null; enemy.mothAir = 0; enemy.mothKindled = 0; enemy.mothCocoon = false; /* release 706 */ enemy.dragonPose = null; enemy.dragonAir = 0; enemy.dragonCharge = 0; enemy.doomRays = null; enemy.doomBreath = null; // release 709 // release 245: no pose survives a reload
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
// Release 427 (Tim: "the turtle's tornadoes... don't have pink boxes beneath... go through all of the world bosses... make
// sure that all of their attacks register their hit boxes... fuchsia pink... beneath them, so that we can see where the
// damage is coming from"): the floor footprint every damage-carrying effect and every body-contact attack really hits
// with, drawn in DANGER pink beneath it (monster-render). `pad` is what each effect's hit test adds to its radius.
export const HIT_FOOTPRINT = { pad: { spinoRock: .3, spinoBone: .3, spinoBoneBurst: .1, spinoFlesh: 0, spinoFurrow: 0, dragonScorch: 0, darkPool: .1, doomErupt: .1, doomScale: .1, doomTar: 0, doomOrb: .3, dragonMeteor: .1, colonize: 0, gale: 0, silk: .15, mire: 0, emberDust: .1, briar: .1, thorn: .2, twister: .2, missile: .35, nanoOrb: .3, comet: .3, gloomfall: .1, gloomMote: .3, flameTrail: .1, frostTrail: .1, lava: .15, orbital: .1, ooze: 0, gas: 0, swordfall: 0, condemn: 0, censerPot: .3, glassShard: .3, thornDart: .3, tendrilFall: .3, icicle: .3, slagPool: .1, lampFire: .1 /* adventure creatures */, stegoDust: .1, stegoSpike: .2, stegoRocket: .1, stegoBlade: .3 }, fallbackPad: .2 };
export function effectFootprint(f) {
  if (!f || !(Number(f.damage) > 0) || !(f.life > 0) || f.length || f.to || f.state === "circle" || f.state === "splash" || f.kind === "tollRing") return 0; // a toll ring is a ring, drawn as one
  const pad = HIT_FOOTPRINT.pad[f.kind] ?? HIT_FOOTPRINT.fallbackPad; return Math.max(.2, (Number(f.radius) || .3) + pad);
}
// Attacks that hurt with the body itself, and what their hit test adds to the body's radius.
export const BODY_HIT = { glideRake: ADV.glide.hit, pendulumSwing: ADV.pendulum.hit, blobEngulf: .5, turtleDash: .5, turtleSpin: "spin", turtleCyclone: .5, turtleStomp: "stomp", wormSuction: .8, devourPull: .9, phaseCharge: .55, ramCharge: .55, qbPounce: .6, qbBarrage: .6, vastPlunge: .6, stegoWheel: .6 };
export function bodyHitFootprint(e) {
  const s = e?.pack, pad = s?.attack && BODY_HIT[s.attack]; if (pad == null || e.dead || e.hidden) return null;
  const extra = pad === "spin" ? TURTLE.spinRadius : pad === "stomp" ? TURTLE.stompRadius : pad;
  return { radius: bodyRadius(e) + extra, armed: s.phase !== "windup" };
}
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
  surfaceTime: 5, emergeTime: .7, travelTime: 2.6, travelSpeed: 4.4, surfaceRange: [3, 5.5], // it fights surfaced, then sinks and comes up elsewhere
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
  // Release 664: the rework. The body is drawn at `halfHeight` of its length while half-buried and all the way up only for
  // "full" moves (it rises or sinks at `postureRate` of its length a second); "full" moves come at most every `fullGap` s.
  halfHeight: .5, postureRate: 2.6, fullGap: 7,
  sweepRadius: 5.4, sweepArc: 220, slamLength: 6.6, slamWidth: 1, slamBurst: 1.8,
  // Tentacles take their health from the worm (`tentacleHp` of its maximum, never under `tentacleHpMin`), and their damage
  // from its damage times `tentacleDamage[mode]`. The ground cracks `tentacleWarn` s before one rises.
  tentacleHp: .06, tentacleHpMin: 34, tentacleWarn: .9,
  tentacleModes: ["laser", "fire", "orbs", "grab", "spread", "swipe"], // the order casts deal them out in, two a cast
  tentacleDamage: { fire: .35, laser: .35, orbs: .45, spread: .3, grab: .55, swipe: .7 },
  tentacleVolleys: { fire: 2, spread: 2, orbs: 3, grab: 2, swipe: 2 }, laserHold: 6, // after this many volleys (a laser: seconds of burning) it burrows and comes up around you
  repositionUnder: [.4, 1.1],                                                     // a cast at the limit sends the field under for this long
  orbEvery: 1.6, orbSpeed: 3.8, orbTurn: 1.7, orbHome: 2.2, orbLife: 4.2, orbRadius: .32,
  spreadEvery: 2.1, spreadWarn: .45, spreadShots: 5, spreadArc: 64,
  grabEvery: 3, grabWarn: .8, grabReach: 6.5, grabWidth: .5, grabPull: 8, grabHold: .75,
  swipeEvery: 1.6, swipeWarn: .55, swipeReach: 2.5, swipeArc: 170, swipeChase: 1.4, // out of reach this long, a swipe tentacle burrows after you
};
// The Mountain Turtle (release 241). Balance as data.
// Release 397 (Tim, 2026-10-24: "the hits... where they're gonna be going on the floor... right now it's like pale red. It
// should be... pale hot pink... understated and not very bright... translucent... the uniform color for damage all across
// the game"): every warning of where a blow will land uses these.
export const DANGER = { fill: "rgba(255,80,190,.18)", fillStrong: "rgba(255,80,190,.32)", edge: "rgba(255,130,210,.72)", hex: "#ff7ccf" };
// The Battlement Colossus (roof-dwellers.ts; Tim, 2026-11-04: its chest laser "telegraphed clearly... a charge-up glow and a visible aim
// line with time to dodge... incredibly powerful"). The windup (ATTACK_MODULES.chestLaser.windup) is `track` seconds of the aim line
// following the Wayfarer at no more than `turn` radians a second, then `lock` seconds with the line held still and flashing; then the
// lamp fires once along it, `reach` tiles (walls stop it), hitting within `width` of the line. `slam` is the ground slam's radius.
export const COLOSSUS = { laser: { track: 1.3, lock: .7, turn: 2.2, reach: 11, width: .6, chest: .88 }, slam: { radius: 2.4 } };
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
  chargeRun: 6.5, upswingCharge: .9 /* release 641: was a second chargeTime that overrode the 8 s electrified spell above */, upswingReach: 1.8, upswingArc: 130, upswingTime: .3, jumpChance: .55, jumpHeight: 2, jumpRise: .35,
  barrageBolts: 5, barrageEvery: .1, barrageSpread: 40, airDashSpeed: 9, airDashTime: .35, airArcReach: 2.6, slamLandChance: .5, landWarn: .45, landRadius: 1.6, landFall: .25,
};
// The Crimson Tyrant (release 709). Balance as data. Lengths in tiles, times in seconds.
export const DRAGON = {
  strafe: { height: 1.4, every: .12, blast: .95, arm: .3, trailLife: 3, trailRadius: .8, trailBite: .3, over: 4 },
  slam: { reach: 1.2, radius: 1.8, both: .5, bothRadius: 2.5, streaks: 3, spread: 40, step: .9, steps: 8, every: .07, warn: .35, width: .6, show: .45 },
  wing: { hop: 3, hopTime: .3, reach: 4.6, arc: 140, push: 2.2 },
  rain: { every: .17, near: 4.5, onYou: .3, arm: [.9, 1.3], radius: 1.05, sway: 1.1 },
  blast: { shots: 3, charge: .9, speed: 9, radius: 2.1, size: .7 },
  colonize: { every: 55, first: 40, casts: 4, border: 2, show: 1.2 }, // every/first: s of play while its hunt holds the section; border: tiles left at the edges so a Wayfarer can always arrive and leave
  claw: { reach: 2.4, beams: .5, count: 12, speed: 7.5, life: 1.1, radius: .3, twist: .35 },
  tailSpin: { reach: 3.5 },
  tailSwipe: { swipes: 2, reach: 4.2, arc: 130, gap: .45 },
  roll: { speed: 7, leg: .7, hit: .7 },
  wave: { ring: .5, radius: 7.5, arc: 120, speed: 11, linger: 3.2, tick: .6, bite: .35 },
  // Skyfall (dragonDive): rise s up to height (body units, as dragonAir), hang s while its ring follows you at track tiles/s, fall s;
  // radius: the ring it lands in (tiles from its centre). The blow lands only at the impact.
  // ring: the jumpable shockwave that runs out from its landing (tiles), doing ringShare of the blow (Tim 2026-11-12, as the stag's leap)
  // stop: it hangs this far short of you (it lands beside you, your tile still deep in its ring, never on top of you).
  dive: { rise: .7, height: 2.4, hang: 1.4, track: 5.5, fall: .38, radius: 2.6, stop: .9, ring: 5, ringShare: .6 },
  nova: { rise: .9, gather: 3.3, radius: 11, height: 3, lethal: 4 },
  // Tim (2026-11-03): "the dragons... should make lava on the floor persistent for some time... casting a spell makes a lava pool beneath
  // your spell": its fireballs (every other rain fireball, every Great Flame) and its slams leave a pool that burns `life` s, then crusts.
  pool: { life: 6, rain: .85, rainEvery: 2, blast: 1.5, slam: 1.3, dive: 1.6, bite: .3 }, // lethal: × the Wayfarer's health, through any guard; only out of reach, a pen or the Aegis survive it
};
// The Doom Chaser (release 710). Balance as data. Lengths in tiles, times in seconds.
export const DOOM = {
  beam: { reach: 12, sweep: 1.5, tick: .3, width: .55, eruptEvery: .14, eruptArm: .75, eruptRadius: .9, eruptShare: .8 }, // sweep: radians, the whole pass
  waves: { count: 3, height: 1.6, speed: 8.5, half: 1.7, life: 1.8, radius: .45 },
  breath: { reach: 6.5, arc: 50, tick: .35, sweep: .9, pools: 3 },
  wing: { slams: 4, step: 1.1, reach: 1.2, radius: 1.7, side: .9 },
  pounce: { speed: 13, max: 7, radius: 2, ring: 6, ringRadius: 3.2, height: 1.2 },
  scales: { count: 9, ring: [1.2, 4.5], arm: [1.3, 2.1], radius: 1 },
  tar: { globs: 3, spread: 2.4, fly: .7, radius: 1.3, slow: .55, ignite: 2.4, burn: 3.5, tick: .5, bite: .4 },
  fall: { rise: .7, track: 1.8, trackSpeed: 7, drop: .45, height: 4, radius: 2.6, ring: 8, ringRadius: 4.2 },
  jaws: { bites: 2, lunge: 1.4, reach: 1.9, arc: 90, gap: .4, tailReach: 4, tailArc: 200 },
  orbs: { count: 5, speed: 4.2, turn: 1.6, home: 2.6, life: 5, radius: .35, blast: 1.1 },
  eclipse: { beams: 3, spin: .7, reach: 11, tick: .35, width: .55, eruptEvery: .25, height: 2.2 },
  roar: { radius: 6, push: 2.5, frenzy: 1 },
  // Tim (2026-11-03): "casting a spell makes a lava pool beneath your spell": its spells leave pools of black fire that burn `life` s.
  pool: { life: 6, radius: 1.1, bite: .3, tick: .7 },
};
// Release 710: the frenzy the Doom Chaser's blows sow in the Wayfarer. Every `build` of its hits within `forget` s of each other and the
// frenzy takes hold for `time` s: they take `extra` more from everything. Land `cure` blows on the Doom Chaser in that time to throw it
// off; otherwise it bursts for `burst` of their health (their guard and armour count, a dodge does not).
export const FRENZY = { build: 3, forget: 10, time: 14, cure: 6, extra: .15, burst: .25 };
// The Ashen Moth (release 706). Balance as data. Lengths in tiles, times in seconds.
export const MOTH = {
  gustReach: 6.5, gustArc: 100, gustPush: 2.2, gustAsh: 3,
  dust: 6, dustRing: [1.4, 3.4], dustArm: [1, 1.6], dustRadius: .95,
  diveSpeed: 12, diveHit: .7, diveTrail: .1, trailLife: 3, trailRadius: .7, trailBite: .35,
  spiralEvery: .16, spiralTurn: .45, emberSpeed: 6, emberLife: 1.6, emberRadius: .26,
  swarm: 5, swarmSpeed: 4, swarmTurn: 2.5, swarmHome: 1.8, swarmLife: 4, swarmRadius: .3,
  cocoonRing: 5, cocoonEmbers: 10,
  // Release 708: silk. Homing gentler than the Knight's orbs (orbTurn 3.2 rad/s for 2 s): `turn` rad/s for `home` s, then straight.
  threads: { count: 7, arc: 150, speed: 7, turn: 1.9, home: 1.2, life: 2.2, radius: .24, trail: 9 },
  gale: { count: 2, radius: 2.2, speed: 2.6, life: 10, tick: .5, pull: 2.2, slow: .6, edge: 1 }, // edge: kept this far inside the section
  burst: { count: 2, gap: .45, speed: 6, turn: 1.5, home: 1.6, life: 3, radius: .55, blast: 1.4, trail: 12 },
  kindle: { time: 9, speed: 1.4, trailEvery: .35, dustEvery: .8, dustRing: [1, 3.5], dustArm: .7, dustRadius: .8, dustShare: .7 },
};
// The Briar Stag (release 705). Balance as data. Lengths in tiles, times in seconds.
export const STAG = {
  goreReach: 1.9, goreArc: 140, goreCuts: 3, goreGap: .34, goreLunge: .7, tossReach: 2.4, tossArc: 110, tossPush: 1.6,
  chargeSpeed: 10, chargeTime: .7, charges: [2, 3], chargeTurn: .45, chargeHit: .6,
  briarEvery: .12, briarLife: 3.5, briarRadius: .6, briarSlow: .55, briarTick: .7, briarBite: .3,
  rootLines: 3, rootSpread: 26, rootStep: .95, rootSteps: 8, rootEvery: .09, rootWarn: .55, rootRadius: .55, rootShow: .45,
  thornVolleys: 3, thornShots: 6, thornArc: 70, thornTwist: 11, thornSpeed: 8.5, thornLife: 1.4, thornRadius: .22, thornEvery: .38,
  leapRise: .45, leapHang: 1.1, leapTrack: 9, leapFall: .45, leapHeight: 3, leapRadius: 1.8, leapRing: 4.4, leapSpikes: 9, leapSpikeRing: 2.6,
  cageRings: [3.2, 2.2, 1.2], cageSpikes: [12, 9, 6], cageFirst: 1, cageEvery: .45, cageRadius: .5,
  stompRadius: 1.7, stompRing: 4, stompGap: .55,
  // Release 708: the grove, the mend, the birds and the mire.
  grove: { trees: 5, ring: [1.6, 3.6], grow: .9, burn: [3.2, 4.6], radius: .6, touchEvery: .6, touchShare: .35, igniteFor: 3, igniteShare: .12, blast: 1.9, splinters: 6, splinterSpeed: 7.5, splinterLife: .9, splinterShare: .45 },
  mend: { share: .14 }, // of its health over the whole mend
  birds: { count: 4, every: .7, warn: .6, speed: 17, reach: 9, radius: .65, offset: 1.6 },
  mire: { radius: 5.5, time: 8, warn: .6, dodgeSpeed: .45, dodgeCost: 2.2, drain: .07, exhaustedShare: .08 }, // exhaustedShare: of max health, for a dodge tried on it without the stamina // drain: share of stamina a second while moving in it
  hunt: { time: 9, speed: 1.45, push: 2.4, pushRadius: 6, briarEvery: .4, spikeEvery: .7, spikeRing: [1.4, 4], spikeWarn: .6, spikeRadius: .6, spikeShare: .7 },
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
// The Wild Stegosaurus (Tim, 2026-11-12). Every number its moves, water, climbing, tail, infighting and tree club use. Reaches are
// added to its body radius; `share`s multiply the move's own damage (ATTACK_MODULES); times are seconds.
// The pose contract the art reads (never timing): e.stegoPose (a string, below), e.stegoAir (0..~3, height off the ground),
// e.stegoRoll (0..1, curled into the wheel), e.stegoSwim (0 land, 1 swimming low with only the plates showing, 2 standing on the
// water), e.stegoTail ('whole' | 'cut'), e.stegoTree (null, or { phase: 'grab'|'pull'|'swing', treeX, treeY } while it wields a
// tree), e.stegoPlates (0..1, the back plates grown back), e.stegoClimb (0 on the ground, up to 1 on a wall), e.stegoClimbDir
// ({ x, y } toward the wall it climbs), e.stegoHeading ({ x, y }, the way its body faces; the tail points the other way).
export const STEGO = {
  version: 1,
  turn: 2.4, /* radians a second it turns its body toward its quarry when not attacking (get behind it, and it bucks) */
  bite: { bites: [2, 3, 4], every: .34, reach: 1.5, arc: 80, step: .45 },
  tailWhack: { swings: 2, every: .42, reach: 2.6, arc: 210, front: 100 }, /* the arc behind and beside it; never begun with you in the `front` arc */
  tailSlam: { reach: 4.2, radius: 1.7, ring: 3.6, ringShare: .45 },
  wheel: { speed: 8.2, turn: 1.9, hit: .6, hitGap: .7, dustEvery: .32, dustCap: 8, dustSpeed: 2.6, dustSpin: 2.2, dustLife: 2.4, dustRadius: .45, dustTick: .7, dustShare: .22, blockedStop: .25 },
  rockets: { count: 6, rise: .7, stagger: .3, radius: 1.3, ring: [1.6, 3.4], spikes: 6, spikeSpeed: 6.5, spikeLife: .65, spikeRadius: .2, spikeShare: .35, regrow: 6 },
  blade: { speed: 11, life: 1, radius: .55, length: 1.4 },
  claw: { swipes: 2, close: 1.6, every: .3, reach: 1.45, arc: 110 }, /* a third swipe (the hind claws) when you are within `close` */
  rear: { swipes: 3, every: .4, reach: 1.8, arc: 120, step: .5 },
  buck: { reach: 2.2, arc: 120, push: 1.8, behind: 120 }, /* `behind`: the arc behind it (degrees) where you make it buck */
  pounce: { time: .7, height: 2.4, radius: 1.6, ring: 3.2, ringShare: .5 },
  tree: { near: 4.5, chance: 35, first: 12, go: 2.4, grab: .5, pull: .9, swings: 3, every: .75, warn: .45, reach: 3.4, arc: 150, slamRadius: 1.9, forms: ["spindle"] },
  breach: { under: .7, air: .75, height: 2.6, laneWidth: 1.2, lane: 7, radius: 2, ring: 3.8, ringShare: .45 },
  // Its tail (Monster Hunter's tail cut): blows landed while you stand in the arc behind it, past its hips, wear `tailHp` of its
  // health off the tail; body blows do not. Cut, it staggers `stagger` s and its tail moves are weaker (`cut`).
  tailHp: .12, tail: { arc: 110, hips: .2, stagger: 1.8 },
  cut: { whackReach: 1.6, whackShare: .65, slamRadius: 1.2, bladeLife: .45 },
  water: { surface: 4.5, swimSpeed: 1.35 }, /* it swims low (untargetable) until within `surface` of you, then stands on the water */
  climb: { stuck: .6, near: 2.4, speed: 2.4, time: 4.5, rise: .35, down: .45, settle: .6, reach: 3, perLevel: .3 }, /* `perLevel`: seconds a level of a face it climbs on its way (a route's climb) */
  // Its chase (Tim, 2026-11-12: "it follows the Wayfarer everywhere it can get to, including across levels and heights"). Where the
  // game gives a way-round search (w.stegoRoute: the open world, and inside great buildings and Pentagons), a beast walled off from
  // you (`stuck` s without gaining, or out of sight, or a level or more above or below you) follows the search's first step: on foot
  // round the walls, or up (or down) the face of a height it cannot walk, climbing. It keeps the route `hold` s, then looks again;
  // within `near` of its body, on your level, it fights. `speed`: its ordinary walking pace (.82 × .9, as the shared walk).
  chase: { stuck: .3, near: 2.4, hold: 1.5, speed: .74, arrive: .08 },
  // The way-round search's costs (game.ts stegoRouteSearch): a step on foot costs 1; climbing a face costs `face` and `perLevel` a
  // level of it; climbing over a rock or wall (the open world only) costs `over` a tile, `overMax` tiles at most. So it walks a
  // short way round rather than climb, and climbs when the way round is long or there is none.
  route: { face: 4, perLevel: 2, over: 4, overMax: 4 },
  hop: { every: [1.6, 2.8], time: .45, height: .8, distance: 1.7, sight: 9 },
  graze: { every: 6, time: 2.4 },
  infight: { range: 5, every: 9, chance: 60, share: .8 }, /* `share`: of the victim's health a blow takes (a one-off kill, mostly) */
  baitSeconds: 30, /* the Stego Bait (stego-bait.ts): how long a placed bait holds every monster's attention */
  text: { severed: "Its tail comes away! The Wild Stegosaurus staggers, and the tail lies where it fell." },
};
// Tall thin trees it can tear out (landscape and world trees; never the great trees, nor a crossing's log).
// The pose contract's resting values (a new Wild Stegosaurus starts on all fours on the ground, whole, its plates grown).
export const stegoPoseDefaults = () => ({ stegoPose: null, stegoAir: 0, stegoRoll: 0, stegoSwim: 0, stegoTail: "whole", stegoTree: null, stegoPlates: 1, stegoClimb: 0, stegoClimbDir: null });
export const isClubTree = (o) => !!o && o.kind === "tree" && o.state === "standing" && !o.strange && !o.crossingTiles?.length && !o.canopy && STEGO.tree.forms.includes(o.vegetationForm);
export function clubTreeNear(w, x, y, radius = STEGO.tree.near) {
  let best = null, bd = radius;
  for (const o of w.map?.objects || []) { if (!isClubTree(o)) continue; const d = Math.hypot(o.x - x, o.y - y); if (d <= bd) { bd = d; best = o; } }
  return best;
}
// The Spinosaurus (Tim, 2026-11-12: "The Hunter of Hunters"). Every number its moves, its fossil shed, its hunt and its one-off jumps and
// grabs use. Reaches are added to its body radius; `share`s multiply the move's own damage (ATTACK_MODULES); times are seconds.
// The pose contract the art reads (never timing):
//   e.spinoPose: null | "bite" | "clawL" | "clawR" | "leap" | "headSlam" | "plough" | "dig" | "fling" | "roarReady" | "roar" | "tailL" |
//     "tailR" | "run" | "lunge" | "landBite" | "grabTrack" | "grabLunge" | "grabHold" | "grabThrow" | "boneLaunch" | "ribsOut" |
//     "ribsThrust" | "shed" (the fossil moment) | "roar" too while it arrives as an interloper (e.spinoArriving > 0);
//   e.spinoAir (0..~3 tiles, height off the ground); e.spinoDig (0..1, its snout buried); e.spinoGrab (null, or { who: 'player' | <enemy
//   id>, phase: 'track' | 'lunge' | 'hold' | 'throw', t: 0..1 through that phase, and while it tracks or lunges x, y (tiles: the bite-mark
//   reticle, SPINO.grab.radius across) and k (0..1, the jaws closing as the lunge nears) }); the game's g.spinoBiteMark (1 when a bite
//   lands on the Wayfarer, falling to 0 over SPINO_SCREEN.bite.ms: the screen's bite mark); e.spinoFossil (false, then true for good at half
//   health); e.spinoShed (0 flesh .. 1 bare bone, over the shed); e.spinoHeading ({ x, y }, the way its body faces; facingX follows it).
export const SPINO = {
  version: 1,
  turn: 2.2, /* radians a second it turns its body toward what it hunts, between moves */
  fossil: { at: .5, shed: 1.5, chunks: 6, chunkLife: 1.1, chunkSpeed: 2.2 }, /* at or below `at` of its health it sheds its flesh, for good */
  fossilOnly: ["spinoBoneVolley", "spinoRibSpears"],
  bite: { bites: [1, 2, 2], every: .5, reach: 1.9, arc: 70, step: .5 },
  claw: { swipes: 2, every: .34, reach: 1.6, arc: 120, behind: 120 }, /* bite and claw are never begun with you in the `behind` arc */
  leap: { max: 8, time: .6, height: 3, radius: 1.8, ring: 3.4, ringShare: .4, pause: .25, warn: .45, length: 6, speed: 9, width: 1.1, ploughShare: .7, crackEvery: .7, crackLife: 1.4, crackCap: 10 },
  dig: { volleys: 3, every: .75, rocks: 5, arc: 70, speed: 9, range: 8.5, radius: .35, turn: 1.2, cap: 18, flingPose: .3 },
  roar: { radius: 7.5, hits: 3, every: .45, share: .5, shake: .7, shakeSeconds: 1.4 }, /* three blows in the ring; no dodge passes them, only distance or cover */
  tail: { swings: 2, every: .45, reach: 2.8, arc: 200, front: 100 },
  body: { run: .9, speed: 7, lungeAt: 4, lunge: .55, height: 2.2, radius: 1.7, max: 6 },
  grab: { lockAt: .4, follow: 6, markMax: 8, radius: 1.15, reach: 1.4, lunge: .35, hold: 2.1, slack: .3, chews: 3, chewShare: .35, throwTime: .35, throwShare: .55, throw: 3, throwTurn: .6, lift: 1.2, creatureHold: 3.5, creatureChews: 4 },
  bones: { count: 5, fan: .5, rise: .55, stagger: .22, speed: 6, turn: 2.4, life: 2.4, radius: .35, burst: 1.3, burstArm: .5, burstShare: .6, cap: 12 },
  ribs: { reach: 3.6, side: 2.8, width: .6, thrust: .45, outShare: .7, outArc: 200, inArc: 180 }, /* out to the sides (`outArc` shown), then in to a point in front, sweeping the ground between (`inArc` shown) */
  // Its prey (Tim: "wildStego and briarStag first"): within `sight` it turns on one, at `chance` % each time it chooses (it chooses again after `refocus` s on its prey, `refocusYou` s on you). A blow on
  // one takes `beastShare` of its health at least; a beast, a boss or a big-room beast is never taken below `floor` of its health by
  // it, so the kill and its bounty stay yours. It moves on its prey at `speed` of its walk.
  hunt: { kinds: ["wildStego", "briarStag"], sight: 16, chance: 75, refocus: 5, refocusYou: 2, beastShare: .035, floor: .08, speed: .9, moves: ["spinoGrab", "spinoBodySlam", "spinoBite", "spinoClaw", "spinoLeapSlam"] },
  infight: { range: 7, every: 8, chance: 60, share: .8 }, /* one-off jumps and grabs at other creatures it sees; `share` of the victim's health a blow takes */
  arrive: { time: 1.4 }, /* an interloper roars this long as it comes in (game.ts) */
  text: { fossil: "Its flesh splits and falls away! The Spinosaurus fights on as bare bone.", grabbed: "Its jaws close on you! You are lifted off your feet." },
};
export const spinoPoseDefaults = () => ({ spinoPose: null, spinoAir: 0, spinoGrab: null, spinoDig: 0, spinoFossil: false, spinoShed: 0 });
// Tuned to the Wayfarer like the roaming beast, with no hunt: one met in a big room, or come in as an interloper (spino-rex.ts).
export const spinoTuned = (e) => !!(e?.spinoRoom || e?.spinoInterloper);
export const SWARM_PIERCING_GLYPHS =["echo", "ignite", "chain", "volatile"];
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
// Release 709: a pool of lava the Crimson Tyrant's fire leaves where it lands (the Tremor Worm's lava, lying still).
function dragonPool(owner, w, x, y, radius, damage) { w.addEffect({ kind: "lava", owner, x, y, vx: 0, vy: 0, radius: WORM.lavaGrow[0], grow: radius, arming: 0, life: DRAGON.pool.life, total: DRAGON.pool.life, damage }); }
// Release 710: the Doom Chaser's black fire: a pool that burns where its spells land, and fire that erupts from the ground once.
function doomPool(owner, w, x, y, radius = DOOM.pool.radius, damage = 1) { w.addEffect({ kind: "darkPool", owner, x, y, radius, arming: 0, life: DOOM.pool.life, total: DOOM.pool.life, damage }); }
const doomBite = (e) => Math.max(1, Math.ceil((Number(e.damage) || 1) * DOOM.pool.bite));
function doomErupt(e, w, x, y, arm, radius, damage, pool = 0) { w.addEffect({ kind: "doomErupt", owner: e.id, x, y, radius, arming: arm, armTotal: arm, life: .5, total: .5, damage, pool, bite: doomBite(e) }); }
// Release 708: is (x, y) on the Briar Stag's mire? The Game slows dodges and drains stamina there.
export function stagMireAt(effects, x, y) { return (effects || []).some((f) => f.kind === "mire" && !(f.arming > 0) && f.life > 0 && Math.hypot(x - f.x, y - f.y) <= f.radius); }
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
  briarStag: { hits: [12, 17, 24], guard: 9, breakTime: 2.4 },
  ashenMoth: { hits: [10, 15, 22], guard: 9, breakTime: 2.4 },
  crimsonTyrant: { hits: [16, 22, 30], guard: 10, breakTime: 2.6 },
  doomChaser: { hits: [16, 22, 30], guard: 10, breakTime: 2.6 },
  wildStego: { hits: [12, 17, 24], guard: 9, breakTime: 2.4 },
  spinoRex: { hits: [13, 18, 25], guard: 9, breakTime: 2.4 },
  nanobotKnight: { hits: [10, 15, 22], guard: 9, breakTime: 2.4 },
  voidWalker: { hits: [12, 17, 24], guard: 10, breakTime: 2.4 },
  astralWorm: { hits: [5, 7, 10], guard: 8, breakTime: 2.8 },
  morphingBlob: { hits: [9, 13, 19], guard: 9, breakTime: 2.4 },
  tremorWorm: { hits: [9, 13, 19], guard: 9, breakTime: 2.4 },
  questingBeast: { hits: [10, 15, 22], guard: 9, breakTime: 2.2 },
  forget: 6,
};
export const bossPoiseOf = (e) => e.kind !== "psychicCrystal" && (e.worldBeast || e.questingBeast || e.mireHeart || e.stegoRoom || spinoTuned(e)) ? BOSS_POISE[e.kind] || BOSS_POISE.default : null;
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
  // Warned moving hazards must start outside Stillworks cover, before their arming delay.
  const open = w.marineProjectileOpen || w.projectileOpen || w.tileOpen;
  if (w.map?.stillworks?.cover && (effect.vx || effect.vy) && open && !open(effect.x + .5, effect.y + .5)) return null;
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

function beginAttack(e, s, id, w, prey = null) {
  const attack = ATTACK_MODULES[id];
  s.attack = id; s.phase = "windup"; s.t = (attack.windup || .5) * (s.paced ? BOSS_PACE.windup : 1); s.seq++; s.data = prey ? { prey: prey.id } : {}; s.hitOnce = false; // release 421 (the Wild Stegosaurus: a one-off blow at another creature, `prey`)
  s.cd[id] = attack.cooldown * cooldownScale(e);
  const p = center(prey || w.player);
  s.data.aim = unit(p.x - e.x, p.y - e.y);
  s.data.target = { ...p };
  START[id]?.(e, s, w, attack);
}
function endAttack(e, s) {
  const attack = ATTACK_MODULES[s.attack];
  s.state = "move"; s.attack = null; s.phase = null; s.tele = null; s.data = null;
  s.gap = (e.attackGap ?? (attack?.recover || .6) * .6 + .45) * (s.paced ? BOSS_PACE.gap : 1); // the Questing Beast barely pauses (release 187); 421: bosses pause longer
  e.voidDashing = false; e.voidCharging = false; e.advPose = null; e.duelPose = null;
  e.untargetable = false; e.hidden = false; e.aloft = false; e.iceShield = false; e.spinning = false; e.sliding = false; e.mist = false; e.thrusting = null; e.swing = null; e.giantPose = null; e.giantAir = 0; e.giantThrust = false; e.stagPose = null; e.stagAir = 0; e.stagMending = false; e.mothPose = null; e.mothAir = 0; e.mothCocoon = false; e.dragonPose = null; e.dragonAir = 0; e.dragonCharge = 0; e.doomRays = null; e.doomBreath = null;
  if (e.kind === "wildStego") { e.stegoPose = null; e.stegoAir = 0; e.stegoRoll = 0; e.stegoTree = null; } // its water, tail, plates and climb are its own state, not the move's
  if (e.kind === "spinoRex") { e.spinoPose = null; e.spinoAir = 0; e.spinoDig = 0; e.spinoGrab = null; } // whatever it held is let go on its next frame (spinoTick: s.spinoHolding)
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
  dragonStrafe(e, s, w) { const p = s.data.target, d = Math.max(4, distance(p, e) + DRAGON.strafe.over); s.data.len = d; s.tele = { type: "lane", aim: s.data.aim, length: rayLength(w, e, s.data.aim, d), width: 1.1 }; e.dragonPose = "rise"; e.aloft = true; e.untargetable = true; },
  dragonSlam(e, s) { const both = hashSeed(`${e.id}:${s.seq}:slam`) % 100 < DRAGON.slam.both * 100, r = bodyRadius(e) + DRAGON.slam.reach, f = { x: e.x + s.data.aim.x * r, y: e.y + s.data.aim.y * r }; Object.assign(s.data, { both, at: f }); s.tele = { type: "circle", x: f.x, y: f.y, radius: both ? DRAGON.slam.bothRadius : DRAGON.slam.radius }; e.dragonPose = both ? "rearBoth" : "rear"; },
  dragonWingBack(e, s) { s.tele = { type: "brace" }; e.dragonPose = "crouch"; },
  dragonRain(e, s) { s.tele = { type: "brace" }; e.dragonPose = "headUp"; s.data.next = 0; s.data.n = 0; },
  dragonBlast(e, s) { s.tele = { type: "brace" }; e.dragonPose = "charge"; s.data.shot = 0; s.data.charge = DRAGON.blast.charge; },
  dragonColonize(e, s, w) { s.tele = { type: "brace" }; e.dragonPose = "colonize"; e.dragonCharge = 0; const tiles = w.dragonLavaPreview?.(e) || []; if (tiles.length) w.addEffect({ kind: "colonize", owner: e.id, x: e.x, y: e.y, tiles, radius: 0, arming: 0, life: ATTACK_MODULES.dragonColonize.windup * BOSS_PACE.windup + .2, total: ATTACK_MODULES.dragonColonize.windup * BOSS_PACE.windup + .2, damage: 0 }); },
  dragonClawSpin(e, s) { s.tele = { type: "ring", radius: bodyRadius(e) + DRAGON.claw.reach }; e.dragonPose = "spinReady"; s.data.beams = hashSeed(`${e.id}:${s.seq}:beams`) % 100 < DRAGON.claw.beams * 100; },
  dragonTailSpin(e, s) { s.tele = { type: "ring", radius: bodyRadius(e) + DRAGON.tailSpin.reach }; e.dragonPose = "spinReady"; },
  dragonTailSwipe(e, s) { s.tele = { type: "brace" }; e.dragonPose = "tailReady"; s.data.swipe = 0; s.data.next = 0; },
  dragonRoll(e, s, w) { s.tele = { type: "lane", aim: s.data.aim, length: rayLength(w, e, s.data.aim, DRAGON.roll.speed * DRAGON.roll.leg), width: bodyRadius(e) }; e.dragonPose = "crouch"; },
  dragonFlameWave(e, s) { const ring = hashSeed(`${e.id}:${s.seq}:wave`) % 100 < DRAGON.wave.ring * 100; s.data.ring = ring; s.tele = ring ? { type: "ring", radius: DRAGON.wave.radius } : { type: "arc", aim: s.data.aim, radius: DRAGON.wave.radius, arc: DRAGON.wave.arc }; e.dragonPose = "breath"; },
  dragonSupernova(e, s) { s.tele = { type: "brace" }; e.dragonPose = "rise"; },
  dragonDive(e, s) { s.tele = { type: "brace" }; e.dragonPose = "crouch"; },
  doomBeam(e, s, w) { const base = Math.atan2(s.data.aim.y, s.data.aim.x), dir = hashSeed(`${e.id}:${s.seq}:beam`) % 2 ? 1 : -1, from = base - dir * DOOM.beam.sweep / 2; Object.assign(s.data, { from, to: base + dir * DOOM.beam.sweep / 2, angle: from, tick: 0, erupt: 0, n: 0, wind: s.t }); s.tele = { type: "beam", angle: from, length: rayLength(w, e, { x: Math.cos(from), y: Math.sin(from) }, DOOM.beam.reach), charging: true }; e.dragonPose = "charge"; },
  doomWaves(e, s) { s.tele = { type: "brace" }; e.dragonPose = "rise"; s.data.sent = 0; },
  doomBreath(e, s) { s.tele = { type: "arc", aim: s.data.aim, radius: DOOM.breath.reach, arc: DOOM.breath.arc + DOOM.breath.sweep * 180 / Math.PI }; e.dragonPose = "charge"; Object.assign(s.data, { tick: 0, pools: 0 }); },
  doomWingSlam(e, s) { s.tele = { type: "brace" }; e.dragonPose = "wingWalk"; Object.assign(s.data, { slam: 0, next: 0 }); },
  doomPounce(e, s, w) { const d = Math.max(1, Math.min(DOOM.pounce.max, distance(s.data.target, e))); s.data.len = d; s.tele = { type: "lane", aim: s.data.aim, length: rayLength(w, e, s.data.aim, d), width: 1.2 }; e.dragonPose = "crouch"; },
  doomScales(e, s) { s.tele = { type: "brace" }; e.dragonPose = "roar"; },
  doomTar(e, s) { s.tele = { type: "brace" }; e.dragonPose = "charge"; s.data.spat = 0; },
  doomFall(e, s) { s.tele = { type: "brace" }; e.dragonPose = "rise"; },
  doomJaws(e, s) { s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + DOOM.jaws.reach + DOOM.jaws.lunge, arc: DOOM.jaws.arc }; e.dragonPose = "crouch"; Object.assign(s.data, { bite: 0, next: 0, tail: false }); },
  doomOrbs(e, s) { s.tele = { type: "brace" }; e.dragonPose = "headUp"; s.data.sent = 0; },
  doomEclipse(e, s) { s.tele = { type: "brace" }; e.dragonPose = "rise"; Object.assign(s.data, { tick: 0, erupt: 0, n: 0, turn: (hashSeed(`${e.id}:${s.seq}:eclipse`) % 628) / 100 }); },
  doomRoar(e, s) { s.tele = { type: "ring", radius: DOOM.roar.radius }; e.dragonPose = "crouch"; },
  stagGore(e, s) { s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + STAG.goreReach, arc: STAG.goreArc }; e.stagPose = "lower"; s.data.cut = 0; s.data.next = 0; },
  stagCharge(e, s, w) { const n = STAG.charges[hashSeed(`${e.id}:${s.seq}:rushes`) % STAG.charges.length]; Object.assign(s.data, { rushes: n, rush: 0, mode: "turn", left: 0 }); s.tele = { type: "lane", aim: s.data.aim, length: rayLength(w, e, s.data.aim, STAG.chargeSpeed * STAG.chargeTime), width: bodyRadius(e) * 1.2 }; e.stagPose = "lower"; },
  stagRoots(e, s) { s.tele = { type: "brace" }; e.stagPose = "rear"; },
  stagThorns(e, s) { s.tele = { type: "brace" }; e.stagPose = "shake"; s.data.volley = 0; s.data.next = 0; },
  stagLeap(e, s) { s.tele = { type: "brace" }; e.stagPose = "crouch"; },
  stagCage(e, s) { const p = s.data.target; s.tele = { type: "circle", x: p.x, y: p.y, radius: STAG.cageRings[0], total: ATTACK_MODULES.stagCage.windup }; e.stagPose = "rear"; },
  stagStomp(e, s) { s.tele = { type: "circle", x: e.x, y: e.y, radius: bodyRadius(e) + STAG.stompRadius }; e.stagPose = "rear"; s.data.stamps = 0; },
  stagHunt(e, s) { s.tele = { type: "brace" }; e.stagPose = "bellow"; },
  stagGrove(e, s) { s.tele = { type: "brace" }; e.stagPose = "rear"; },
  stagMend(e, s) { s.tele = { type: "brace" }; e.stagPose = "mend"; },
  stagBirds(e, s) { s.tele = { type: "brace" }; e.stagPose = "bellow"; s.data.next = 0; s.data.birds = 0; },
  stagMire(e, s) { const p = s.data.target; s.tele = { type: "circle", x: p.x, y: p.y, radius: STAG.mire.radius, total: ATTACK_MODULES.stagMire.windup }; e.stagPose = "stamp"; },
  // The Wild Stegosaurus (STEGO). `s.data.prey`: a one-off blow at another creature (stegoTick), aimed at it instead of you.
  stegoBite(e, s) { const B = STEGO.bite; stegoFace(e, s.data.aim); Object.assign(s.data, { bites: B.bites[hashSeed(`${e.id}:${s.seq}:bites`) % B.bites.length], n: 0, next: 0 }); s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + B.reach + B.step, arc: B.arc }; e.stegoPose = "biteReady"; },
  stegoTailWhack(e, s) { const T = STEGO.tailWhack; if (s.data.prey) stegoFace(e, { x: -s.data.aim.x, y: -s.data.aim.y }); Object.assign(s.data, { n: 0, next: 0 }); s.tele = { type: "arc", aim: stegoBack(e), radius: bodyRadius(e) + stegoWhackReach(e), arc: T.arc }; e.stegoPose = "tailReady"; },
  stegoTailSlam(e, s) { const at = stegoSlamPoint(e, s.data.target); s.data.at = at; stegoFace(e, s.data.aim); s.tele = { type: "circle", x: at.x, y: at.y, radius: stegoSlamRadius(e), total: ATTACK_MODULES.stegoTailSlam.windup }; e.stegoPose = "tailRaise"; },
  stegoWheel(e, s, w) { stegoFace(e, s.data.aim); Object.assign(s.data, { dir: { ...s.data.aim }, hitAt: -1, dust: 0, side: 1, stuck: 0 }); s.tele = { type: "lane", aim: s.data.aim, length: rayLength(w, e, s.data.aim, STEGO.wheel.speed * .8), width: bodyRadius(e) * 1.6 }; e.stegoPose = "curl"; e.stegoRoll = 0; },
  stegoPlateRockets(e, s) { s.tele = { type: "brace" }; e.stegoPose = "launch"; },
  stegoTailBlade(e, s, w) { stegoFace(e, { x: -s.data.aim.x, y: -s.data.aim.y }); s.tele = { type: "lane", aim: s.data.aim, length: rayLength(w, e, s.data.aim, STEGO.blade.speed * stegoBladeLife(e)), width: STEGO.blade.radius * 2 }; e.stegoPose = "whip"; },
  stegoClaw(e, s, w) { const C = STEGO.claw; stegoFace(e, s.data.aim); Object.assign(s.data, { n: 0, next: 0, swipes: C.swipes + (distance(stegoQuarry(s, w) || s.data.target, e) <= bodyRadius(e) + C.close ? 1 : 0) }); s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + C.reach, arc: C.arc }; e.stegoPose = "clawL"; },
  stegoRearSwipe(e, s) { const R = STEGO.rear; stegoFace(e, s.data.aim); Object.assign(s.data, { n: 0, next: 0 }); s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + R.reach + R.step, arc: R.arc }; e.stegoPose = "rear"; },
  stegoBuck(e, s) { s.tele = { type: "arc", aim: stegoBack(e), radius: bodyRadius(e) + STEGO.buck.reach, arc: STEGO.buck.arc }; e.stegoPose = "buck"; },
  stegoPounce(e, s, w) { const to = stegoLanding(e, w, s.data.target); s.data.to = to; s.data.from = { x: e.x, y: e.y }; stegoFace(e, s.data.aim); s.tele = { type: "circle", x: to.x, y: to.y, radius: STEGO.pounce.radius, total: ATTACK_MODULES.stegoPounce.windup }; e.stegoPose = "crouch"; },
  stegoTreeClub(e, s, w) { const tree = clubTreeNear(w, e.x, e.y); Object.assign(s.data, { stage: "go", left: STEGO.tree.go, tree: tree ? tree.id : null, n: 0 }); s.tele = { type: "brace" }; e.stegoPose = "bite"; if (tree) { stegoFace(e, unit(tree.x - e.x, tree.y - e.y)); e.stegoTree = { phase: "grab", treeX: tree.x, treeY: tree.y }; } },
  stegoBreach(e, s, w) { const mode = hashSeed(`${e.id}:${s.seq}:breach`) % 2 ? "lane" : "slam", B = STEGO.breach; Object.assign(s.data, { mode, from: { x: e.x, y: e.y } }); e.stegoPose = "dive"; e.stegoSwim = 1; e.untargetable = true;
    if (mode === "lane") s.tele = { type: "lane", aim: s.data.aim, length: Math.min(B.lane, rayLength(w, e, s.data.aim, B.lane)), width: B.laneWidth * 2 };
    else s.tele = { type: "circle", x: s.data.target.x, y: s.data.target.y, radius: B.radius, total: ATTACK_MODULES.stegoBreach.windup + B.under }; },
  // The Spinosaurus (SPINO). `s.data.prey`: a blow at a creature (its prey, or a one-off: spinoTick), aimed at it instead of you.
  spinoBite(e, s) { const B = SPINO.bite; spinoFace(e, s.data.aim); Object.assign(s.data, { bites: B.bites[hashSeed(`${e.id}:${s.seq}:bites`) % B.bites.length], n: 0, next: 0 }); s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + B.reach + B.step, arc: B.arc }; e.spinoPose = "bite"; },
  spinoClaw(e, s) { const C = SPINO.claw; spinoFace(e, s.data.aim); Object.assign(s.data, { n: 0, next: 0 }); s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + C.reach, arc: C.arc }; e.spinoPose = "clawL"; },
  spinoLeapSlam(e, s, w) { const L = SPINO.leap, to = spinoLanding(e, w, spinoReach(e, s.data.target, L.max)); Object.assign(s.data, { to, from: { x: e.x, y: e.y }, stage: "crouch" }); spinoFace(e, s.data.aim); s.tele = { type: "circle", x: to.x, y: to.y, radius: L.radius, total: spinoWindup(s, "spinoLeapSlam") + L.time }; e.spinoPose = "leap"; },
  spinoDigFling(e, s) { const D = SPINO.dig; spinoFace(e, s.data.aim); Object.assign(s.data, { volley: 0, next: 0, flung: 0 }); s.tele = { type: "arc", aim: s.data.aim, radius: D.range, arc: D.arc }; e.spinoPose = "dig"; e.spinoDig = 0; },
  spinoRoar(e, s) { Object.assign(s.data, { n: 0, next: 0 }); s.tele = { type: "ring", radius: SPINO.roar.radius }; e.spinoPose = "roarReady"; },
  spinoTailSwipe(e, s) { const T = SPINO.tail; if (s.data.prey) spinoFace(e, { x: -s.data.aim.x, y: -s.data.aim.y }); Object.assign(s.data, { n: 0, next: 0 }); s.tele = { type: "arc", aim: spinoBack(e), radius: bodyRadius(e) + T.reach, arc: T.arc }; e.spinoPose = "tailL"; },
  spinoBodySlam(e, s, w) { const B = SPINO.body; spinoFace(e, s.data.aim); Object.assign(s.data, { stage: "run", left: B.run }); s.tele = { type: "lane", aim: s.data.aim, length: rayLength(w, e, s.data.aim, Math.min(distance(s.data.target, e) + B.radius, B.speed * B.run + B.max)), width: bodyRadius(e) * 1.6 }; e.spinoPose = "run"; },
  spinoGrab(e, s) { const G = SPINO.grab, at = s.data.target; spinoFace(e, s.data.aim); Object.assign(s.data, { mark: { x: at.x, y: at.y }, stage: "track", n: 0 }); s.tele = { type: "circle", x: at.x, y: at.y, radius: G.radius, total: spinoWindup(s, "spinoGrab"), reticle: true }; e.spinoPose = "grabTrack"; e.spinoGrab = { who: s.data.prey || "player", phase: "track", t: 0, x: at.x, y: at.y, k: 0 }; },
  spinoBoneVolley(e, s) { s.tele = { type: "brace" }; e.spinoPose = "boneLaunch"; },
  spinoRibSpears(e, s) { const R = SPINO.ribs; spinoFace(e, s.data.aim); s.data.stage = "out"; s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + R.side, arc: R.outArc }; e.spinoPose = "ribsOut"; },
  mothGust(e, s) { s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + MOTH.gustReach, arc: MOTH.gustArc }; e.mothPose = "raise"; },
  mothDust(e, s) { s.tele = { type: "brace" }; e.mothPose = "shake"; },
  mothDive(e, s, w) { s.tele = { type: "lane", aim: s.data.aim, length: rayLength(w, e, s.data.aim, MOTH.diveSpeed * ATTACK_MODULES.mothDive.active), width: bodyRadius(e) * .9 }; e.mothPose = "climb"; e.aloft = true; },
  mothSpiral(e, s) { s.tele = { type: "brace" }; e.mothPose = "spin"; s.data.next = 0; s.data.turn = (hashSeed(`${e.id}:${s.seq}:spiral`) % 628) / 100; },
  mothSwarm(e, s) { s.tele = { type: "brace" }; e.mothPose = "raise"; },
  mothCocoon(e, s) { s.tele = { type: "brace" }; e.mothPose = "fold"; },
  mothKindle(e, s) { s.tele = { type: "brace" }; e.mothPose = "raise"; },
  mothThreads(e, s) { s.tele = { type: "brace" }; e.mothPose = "raise"; },
  mothGale(e, s) { s.tele = { type: "brace" }; e.mothPose = "beat"; },
  mothThreadBlast(e, s) { s.tele = { type: "brace" }; e.mothPose = "fold"; s.data.shot = 0; s.data.next = 0; },
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
  golemPunch(e, s) { s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + 1.2, arc: 70 }; },
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
  knightBackslash(e, s) { s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + KNIGHT.slideReach + KNIGHT.arcReach, arc: KNIGHT.comboArc }; s.data.cut = false; }, // release 427: its reach shown (it had none)
  psyPush(e, s) { s.tele = { type: "ring", radius: CRYSTAL.pushRadius }; },
  wispBewilder(e, s) { s.tele = { type: "ring", radius: ATTACK_MODULES.wispBewilder.range[1] }; }, // release 731
  demonCleave(e, s) { s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + 1.8, arc: 170 }; }, // the roof dwellers (roof-dwellers.ts)
  stoneSlam(e, s) { s.tele = { type: "ring", radius: COLOSSUS.slam.radius }; },
  chestLaser(e, s, w) { const L = COLOSSUS.laser, angle = Math.atan2(s.data.aim.y, s.data.aim.x); Object.assign(s.data, { angle, fired: false }); s.tele = { type: "laser", angle, length: rayLength(w, e, s.data.aim, L.reach), charge: 0, locked: false, chest: L.chest }; },
  gorgeHowl(e, s) { s.tele = { type: "ring", radius: ATTACK_MODULES.gorgeHowl.range[1] }; },
  // The Gloomvast (haunts.ts GLOOM_FINALE): every move shows where it will land before it does.
  vastRake(e, s) { s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + 1.7, arc: 160 }; },
  vastWail(e, s) { s.tele = { type: "ring", radius: ATTACK_MODULES.vastWail.range[1] }; },
  vastGloomfall(e, s, w) { const G = GLOOM_FINALE.gloomfall, p = s.data.target, v = playerVelocity(w), a0 = (hashSeed(`${e.id}:gloomfall:${s.seq}`) % 628) / 100, dmg = damageOf(e, "vastGloomfall"), spots = [{ x: p.x, y: p.y }, { x: p.x + Math.max(-2, Math.min(2, v.x * .8)), y: p.y + Math.max(-2, Math.min(2, v.y * .8)) }];
    for (let i = 2; i < G.count; i++) { const a = a0 + i * TAU / (G.count - 2); spots.push({ x: p.x + Math.cos(a) * G.spread, y: p.y + Math.sin(a) * G.spread }); }
    for (const q of spots) w.addEffect({ kind: "gloomfall", owner: e.id, x: q.x, y: q.y, radius: G.radius, arming: G.arm, armTotal: G.arm, life: .35, total: .35, damage: dmg, curse: GLOOM_FINALE.curse.gloomfall }); },
  vastLights(e, s) { s.tele = { type: "ring", radius: bodyRadius(e) + .8 }; },
  vastPlunge(e, s) { const len = 9; s.data.end = { x: e.x + s.data.aim.x * len, y: e.y + s.data.aim.y * len }; s.tele = { type: "lane", aim: s.data.aim, length: len, width: .8, phase: true }; },
  vastDark(e, s, w) { s.data.total = s.t; s.tele = { type: "ring", radius: bodyRadius(e) + 1.2 }; w.say?.(GLOOM_FINALE.text.calling); },
  shadeTouch(e, s) { s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + 1.1, arc: 120 }; },
  shadePuff(e, s) { s.tele = { type: "ring", radius: ATTACK_MODULES.shadePuff.range[1] }; },
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
  // Release 664: the cracks show where each new tentacle will rise for the whole windup (and its rise after); at the limit
  // there are no new ones, and the cast sends the field it has under to come up around the Wayfarer instead.
  wormTentacles(e, s, w) {
    s.tele = { type: "shimmer" }; s.data.spots = [];
    const mine = w.enemies.filter((q) => !q.dead && q.wormOf === e.id), room = Math.min(WORM.fieldTentacles, WORM.tentaclesMax - mine.length), p = s.data.target, turn = (hashSeed(`${e.id}:${s.seq}:field`) % 628) / 100;
    for (let i = 0; i < room; i++) {
      const [lo, hi] = WORM.tentacleRing, r = lo + (hashSeed(`${e.id}:${s.seq}:ring:${i}`) % 100) / 100 * (hi - lo), a = turn + i * TAU / WORM.fieldTentacles;
      const spot = nearestOpen(w, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 2);
      if (!spot || distance(spot, e) < bodyRadius(e) + 1) continue;
      s.data.spots.push({ x: spot.x, y: spot.y, i });
      wormCracks(w, e, spot, s.t + WORM.tentacleRise);
    }
  },
  wormSweep(e, s) { s.tele = { type: "arc", aim: s.data.aim, radius: WORM.sweepRadius, arc: WORM.sweepArc }; },
  wormSlam(e, s) { const a = s.data.aim; s.tele = { type: "rect", aim: a, length: WORM.slamLength, width: WORM.slamWidth }; s.data.head = { x: e.x + a.x * WORM.slamLength, y: e.y + a.y * WORM.slamLength }; },
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
// The Briar Stag (release 705): brambles it leaves, roots it raises, and the Wild Hunt (stagHunt), ticked every frame.
function stagBriar(e, w) { w.addEffect({ kind: "briar", owner: e.id, x: e.x, y: e.y, radius: STAG.briarRadius, arming: 0, life: STAG.briarLife, total: STAG.briarLife, damage: Math.max(1, Math.ceil(e.damage * STAG.briarBite)) }); }
// The Ashen Moth (release 706): burning dust and fire it leaves, and Kindled (mothKindle), ticked every frame.
function mothDustAt(e, w, x, y, arm, radius, damage) { w.addEffect({ kind: "emberDust", owner: e.id, x, y, radius, arming: arm, armTotal: arm, life: .4, total: .4, damage }); }
function mothFire(e, w) { w.addEffect({ kind: "flameTrail", owner: e.id, x: e.x, y: e.y, radius: MOTH.trailRadius, arming: 0, life: MOTH.trailLife, total: MOTH.trailLife, damage: Math.max(1, Math.ceil(e.damage * MOTH.trailBite)) }); }
function mothEmber(e, w, a, damage, speed = MOTH.emberSpeed) { w.addEffect({ kind: "orb", fire: true, owner: e.id, x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, radius: MOTH.emberRadius, arming: 0, life: MOTH.emberLife, damage }); }
function mothPassive(e, w) {
  if (!(e.mothKindled > 0)) return;
  const K = MOTH.kindle; e.mothKindled = Math.max(0, e.mothKindled - w.dt);
  e.mothTrail = (Number(e.mothTrail) || 0) - w.dt; if (e.mothTrail <= 0) { e.mothTrail = K.trailEvery; mothFire(e, w); }
  e.mothDustClock = (Number(e.mothDustClock) || 0) - w.dt;
  if (e.mothDustClock <= 0) { e.mothDustClock = K.dustEvery; const n = e.mothDusts = (Number(e.mothDusts) || 0) + 1, h = hashSeed(`${e.id}:moth-dust:${n}`), a = (h % 628) / 100, r = K.dustRing[0] + (K.dustRing[1] - K.dustRing[0]) * ((h >>> 10) % 100) / 100;
    mothDustAt(e, w, e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, K.dustArm, K.dustRadius, Math.max(1, Math.ceil(e.damage * K.dustShare))); }
}
function stagPassive(e, w) {
  if (!(e.stagHunt > 0)) return;
  const H = STAG.hunt; e.stagHunt = Math.max(0, e.stagHunt - w.dt);
  e.stagTrail = (Number(e.stagTrail) || 0) - w.dt; if (e.stagTrail <= 0) { e.stagTrail = H.briarEvery; stagBriar(e, w); }
  e.stagSpikeClock = (Number(e.stagSpikeClock) || 0) - w.dt;
  if (e.stagSpikeClock <= 0) {
    e.stagSpikeClock = H.spikeEvery; const n = e.stagSpikes = (Number(e.stagSpikes) || 0) + 1, h = hashSeed(`${e.id}:stag-spike:${n}`), a = (h % 628) / 100, r = H.spikeRing[0] + (H.spikeRing[1] - H.spikeRing[0]) * ((h >>> 10) % 100) / 100;
    w.addEffect({ kind: "stagSpike", owner: e.id, x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r, radius: H.spikeRadius, arming: H.spikeWarn, armTotal: H.spikeWarn, life: .45, total: .45, damage: Math.max(1, Math.ceil(e.damage * H.spikeShare)) });
  }
}
function resolveMelee(e, s, w, attackId, test) {
  const p = center(w.player);
  if (test(p) && w.los(e, w.player) && w.hurt(e, damageOf(e, attackId), { jumpable: false, source: attackId }) && e.kind === "lightningGiant" && e.giantCharged > 0) w.shockHit?.();
}

// Release 731: a ring of gloom from a haunt: on the windup's end, the Wayfarer inside it is hurt a little and confused.
// Release 737: and cursed (`n` haunt curses, HAUNT.curse.lay; w.curse hashes which from the haunt and its hit count).
function hauntConfuse(e, s, w, id, seconds, n = 0) {
  const A = ATTACK_MODULES[id], r = A.range[1];
  if (s.phase === "windup" && s.t <= 0) { if (distance(center(w.player), e) <= r + .2) { w.hurt(e, damageOf(e, id), { jumpable: false, source: id }); w.confuse?.(seconds); if (n > 0) w.curse?.(e, n); }
    w.addEffect({ kind: "psyRing", owner: e.id, haunt: true, x: e.x, y: e.y, radius: r, arming: 0, life: .5, total: .5, damage: 0 }); s.tele = null; toPhase(s, "recover", A.recover); }
}
// A charge straight through along the lane it showed (phaseCharge's shape, for any charge module `id`).
function chargeThrough(e, s, w, id) {
  const attack = ATTACK_MODULES[id];
  if (s.phase === "windup") { if (s.t <= 0) { s.data.from = { x: e.x, y: e.y }; toPhase(s, "active", attack.active); e.phasing = true; } return; }
  if (s.phase === "active") {
    const k = 1 - Math.max(0, s.t) / attack.active;
    e.x = Math.max(0, Math.min(w.width - 1, s.data.from.x + (s.data.end.x - s.data.from.x) * k)); e.y = Math.max(0, Math.min(w.height - 1, s.data.from.y + (s.data.end.y - s.data.from.y) * k));
    e.untargetable = !w.open(e.x, e.y);
    if (!s.hitOnce && distance(center(w.player), e) <= bodyRadius(e) + .55) { s.hitOnce = true; w.hurt(e, damageOf(e, id), { jumpable: false, source: id }); }
    if (s.t <= 0) { const land = nearestOpen(w, e.x, e.y, 4) || s.data.from; e.x = land.x; e.y = land.y; e.phasing = false; e.untargetable = false; s.tele = null; toPhase(s, "recover", attack.recover); }
  }
}

// The Gloomvast's Dark (haunts.ts GLOOM_FINALE.darkness). `e.gloomDark` = { n, left, total } while it lasts (seconds, counted
// down by the pack clock, so a pause stops it and a save carries it); `e.gloomDarks` how many it has called; `e.gloomGap` the
// seconds before the next may be called; `e.gloomFade` the seconds the lifting dark still shows. Every orb and the Gloomvast
// itself carry `gloomVeil` while it lasts (drawn alike, as cold lights over the dark; no health bar). Decoys are `gloomOrbOf`
// it, never saved as foes of the area (Game.gloomResume lays them again from the same hash after a reload).
const gloomDecoys = (e, w) => w.enemies.filter((q) => !q.dead && q.gloomOrbOf === e.id);
export function gloomDarkKey(e) { return `${e.gloomSeed ?? 0}:${e.id}`; }
// Lays (or, after a reload, lays again) the decoys of Dark `d.n` round the Wayfarer, and moves it to its own place among them.
export function gloomLayOrbs(e, w, move = false) {
  const D = GLOOM_FINALE.darkness, d = e.gloomDark; if (!d) return 0;
  const have = gloomDecoys(e, w).length, want = Math.max(0, Math.min(D.cap, D.orbs) - have); if (!want || !w.gloomSpots || !w.spawnGloomOrb) return 0;
  const key = `${gloomDarkKey(e)}:${d.n}`, spots = w.gloomSpots(center(w.player), D.orbs + 1, key); if (!spots.length) return 0;
  const mine = hashSeed(`gloom:self:v1:${key}`) % spots.length; let laid = 0;
  if (move) { e.x = spots[mine].x; e.y = spots[mine].y; } // a fresh Dark: it slips to its own place among them (a resumed one stays where it was)
  spots.forEach((q, i) => { if (i === mine || laid >= want) return; const c = w.spawnGloomOrb(e, q.x, q.y, `${d.n}:${i}`, D.brains[hashSeed(`gloom:brain:v1:${key}:${i}`) % D.brains.length]); if (c) laid++; });
  return laid;
}
export function gloomDarkBegin(e, w) {
  const D = GLOOM_FINALE.darkness, n = Math.max(0, Number(e.gloomDarks) || 0), left = darkDurationOf(e, n);
  e.gloomDark = { n, left, total: left }; e.gloomDarks = n + 1; e.gloomVeil = true; e.gloomFade = 0;
  e.packAttacks = [...MONSTER_PACK.gloomShade.attacks]; e.brain = "orbit"; // it fights as one of its lights
  w.addEffect({ kind: "psyRing", owner: e.id, haunt: true, x: e.x, y: e.y, radius: 3, arming: 0, life: .6, total: .6, damage: 0 });
  e.gloomDark.laid = true; gloomLayOrbs(e, w, true); w.say?.(GLOOM_FINALE.text.dark);
  if (e.pack?.cd) for (const id of e.packAttacks) e.pack.cd[id] = Math.max(e.pack.cd[id] || 0, .8 + (hashSeed(`${e.id}:dark-cd:${n}:${id}`) % 100) / 100);
}
const darkDurationOf = (e, n) => darkDuration(gloomDarkKey(e), n);
// Ends its Dark. `reveal` (the Dark ran its course): the decoys burst, it reels, the dark lifts over `fadeOut`. Otherwise (it
// fell, the Wayfarer died or left) everything ends at once.
export function gloomDarkEnd(e, w, reveal = true) {
  const D = GLOOM_FINALE.darkness, def = MONSTER_PACK.gloomvast;
  for (const q of w.enemies) if (q.gloomOrbOf === e.id && !q.dead) { q.dead = true; q.noRewards = true; q.rewarded = true; if (reveal && w.addEffect) w.addEffect({ kind: "psyRing", owner: e.id, haunt: true, x: q.x, y: q.y, radius: 1.1, arming: 0, life: .45, total: .45, damage: 0 }); }
  const was = !!e.gloomDark; e.gloomDark = null; e.gloomVeil = false; e.brain = def.brain;
  e.packAttacks = [...def.attacks, ...(e.hybridAttack ? [e.hybridAttack] : [])];
  if (e.pack?.attack && ["shadeTouch", "shadePuff"].includes(e.pack.attack)) endAttack(e, e.pack);
  if (!was) return;
  e.gloomGap = D.gap; e.gloomFade = reveal ? D.fadeOut : 0;
  if (!reveal && !e.dead) e.gloomDarks = Math.max(0, (Number(e.gloomDarks) || 1) - 1); // a Dark cut short (you died or left) is called again when you are back
  if (reveal && !e.dead) { e.gloomReel = D.revealStagger; e.poiseBreak = 1; w.addEffect?.({ kind: "psyRing", owner: e.id, haunt: true, x: e.x, y: e.y, radius: 3.5, arming: 0, life: .7, total: .7, damage: 0 }); w.say?.(GLOOM_FINALE.text.reveal); }
}
// Every frame, before it moves or attacks: its Dark counts down (and ends in the reveal), the reveal's reeling and the lifting
// dark run out, and the next Dark is called when its health has fallen far enough. True when it should do nothing else now.
function gloomVastTick(e, s, w) {
  const dt = w.dt; e.gloomGap = Math.max(0, (Number(e.gloomGap) || 0) - dt); e.gloomFade = Math.max(0, (Number(e.gloomFade) || 0) - dt);
  if (e.gloomReel > 0) { e.gloomReel = Math.max(0, e.gloomReel - dt); e.poiseBreak = e.gloomReel / GLOOM_FINALE.darkness.revealStagger; if (s.attack) endAttack(e, s); return true; } // reeling after the reveal (drawn dazed)
  const d = e.gloomDark;
  if (d) { d.left -= dt; if (!d.laid && gloomDecoys(e, w).length < Math.min(GLOOM_FINALE.darkness.cap, GLOOM_FINALE.darkness.orbs)) { d.laid = true; gloomLayOrbs(e, w); } if (d.left <= 0) { gloomDarkEnd(e, w, true); return true; } return false; }
  if (darkDue(e) >= 0 && !s.attack && e.aggro) { s.state = "attack"; s.last = "vastDark"; beginAttack(e, s, "vastDark", w); return true; }
  return false;
}
// A decoy goes when its Gloomvast is gone or its Dark has ended.
function gloomShadeTick(e, w) {
  const owner = w.enemies.find((q) => q.id === e.gloomOrbOf && !q.dead);
  if (!owner || !owner.gloomDark) { e.dead = true; e.noRewards = true; e.rewarded = true; return true; }
  return false;
}
const RUN = {
  dragonStrafe(e, s, w) {
    const A = ATTACK_MODULES.dragonStrafe, d = s.data, D = DRAGON.strafe;
    if (s.phase === "windup") { e.dragonAir = Math.min(D.height, (e.dragonAir || 0) + w.dt * 3); if (s.t <= 0) { s.tele = null; e.dragonPose = "fly"; d.drop = 0; d.room = rayLength(w, e, d.aim, d.len); toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active") return;
    const sp = d.len / A.active, step = Math.min(sp * w.dt, Math.max(0, d.room)); if (step > 0) { w.move(e, d.aim.x * step, d.aim.y * step, { phase: true }); d.room -= step; } e.facingX = d.aim.x >= 0 ? 1 : -1;
    d.drop -= w.dt; if (d.drop <= 0) { d.drop = D.every; const ahead = { x: e.x + d.aim.x * 1.2, y: e.y + d.aim.y * 1.2 };
      w.addEffect({ kind: "dragonMeteor", owner: e.id, x: ahead.x, y: ahead.y, radius: D.blast, arming: D.arm, armTotal: D.arm, life: .4, total: .4, damage: damageOf(e, "dragonStrafe") });
      w.addEffect({ kind: "flameTrail", owner: e.id, x: ahead.x, y: ahead.y, radius: D.trailRadius, arming: D.arm, life: D.trailLife, total: D.trailLife, damage: Math.max(1, Math.ceil(e.damage * D.trailBite)) }); }
    if (s.t <= 0 || d.room <= 0) { e.dragonPose = "land"; e.aloft = false; e.untargetable = false; e.dragonAir = 0; toPhase(s, "recover", A.recover); }
  },
  dragonSlam(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const d = s.data, D = DRAGON.slam, r = d.both ? D.bothRadius : D.radius, p = center(w.player), dmg = damageOf(e, "dragonSlam") * (d.both ? 1.2 : 1);
    if (distance(p, d.at) <= r + .2) w.hurt(e, Math.ceil(dmg), { jumpable: false, source: "dragonSlam" });
    w.addEffect({ kind: "dust", owner: e.id, x: d.at.x, y: d.at.y, radius: r + .5, arming: 0, life: .6, damage: 0 }); dragonPool(e.id, w, d.at.x, d.at.y, DRAGON.pool.slam, Math.max(1, Math.ceil(e.damage * DRAGON.pool.bite)));
    const a0 = Math.atan2(p.y - d.at.y, p.x - d.at.x), spread = D.spread * Math.PI / 180;
    for (let i = 0; i < D.streaks; i++) { const a = a0 + (i - (D.streaks - 1) / 2) * spread, dir = { x: Math.cos(a), y: Math.sin(a) }; let steps = 0; for (let k = 0; k < D.steps; k++) { const x = d.at.x + dir.x * (r + k * D.step), y = d.at.y + dir.y * (r + k * D.step); if (w.tileOpen && !w.tileOpen(x + .5, y + .5)) break; steps++; }
      if (steps) w.addEffect({ kind: "fireLine", owner: e.id, x: d.at.x + dir.x * r, y: d.at.y + dir.y * r, dx: dir.x, dy: dir.y, steps, length: steps * D.step, step: D.step, every: D.every, warn: D.warn, radius: D.width, burst: -1, arming: 0, life: D.warn + steps * D.every + D.show, damage: Math.ceil(dmg * .7) }); }
    e.dragonPose = d.both ? "slamBoth" : "slam"; s.tele = null; toPhase(s, "recover", ATTACK_MODULES.dragonSlam.recover);
  },
  dragonWingBack(e, s, w) {
    const A = ATTACK_MODULES.dragonWingBack, d = s.data, D = DRAGON.wing;
    if (s.phase === "windup") { if (s.t <= 0) { d.hop = D.hopTime; d.back = { x: -d.aim.x, y: -d.aim.y }; e.dragonPose = "hop"; toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active") return;
    if (d.hop > 0) { const step = D.hop / D.hopTime * Math.min(w.dt, d.hop); d.hop -= w.dt; w.move(e, d.back.x * step, d.back.y * step); e.dragonAir = Math.sin(Math.PI * (1 - Math.max(0, d.hop) / D.hopTime)) * .5; return; }
    if (!d.lashed) { d.lashed = true; e.dragonAir = 0; const p = center(w.player); d.aim = unit(p.x - e.x, p.y - e.y); e.dragonPose = "wingLash"; const reach = bodyRadius(e) + D.reach;
      s.tele = { type: "arc", aim: d.aim, radius: reach, arc: D.arc }; if (inArc(e, p, d.aim, reach, D.arc) && w.hurt(e, damageOf(e, "dragonWingBack"), { jumpable: false, source: "dragonWingBack" })) w.push?.(e, D.push, reach + 1);
      w.addEffect({ kind: "swordArc", owner: e.id, x: e.x, y: e.y, angle: Math.atan2(d.aim.y, d.aim.x), arc: D.arc, radius: reach, lift: .6, arming: 0, life: .3, total: .3, damage: 0 }); }
    if (s.t <= 0) { s.tele = null; toPhase(s, "recover", A.recover); }
  },
  dragonRain(e, s, w) {
    const A = ATTACK_MODULES.dragonRain, d = s.data, D = DRAGON.rain;
    if (s.phase === "windup") { if (s.t <= 0) { s.tele = null; toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active") return;
    e.dragonSway = Math.sin((A.active - s.t) * D.sway * Math.PI); d.next -= w.dt;
    while (d.next <= 0) { d.next += D.every; d.n++; const h = hashSeed(`${e.id}:${s.seq}:rain:${d.n}`), p = center(w.player), onYou = (h % 100) / 100 < D.onYou, a = ((h >>> 7) % 628) / 100, r = onYou ? 0 : 1 + ((h >>> 3) % 100) / 100 * D.near, arm = D.arm[0] + (D.arm[1] - D.arm[0]) * ((h >>> 11) % 100) / 100;
      w.addEffect({ kind: "dragonMeteor", owner: e.id, x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, radius: D.radius, arming: arm, armTotal: arm, life: .4, total: .4, damage: damageOf(e, "dragonRain"), pool: d.n % DRAGON.pool.rainEvery === 0 ? DRAGON.pool.rain : 0, bite: Math.max(1, Math.ceil(e.damage * DRAGON.pool.bite)) }); }
    if (s.t <= 0) { e.dragonSway = 0; toPhase(s, "recover", A.recover); }
  },
  dragonBlast(e, s, w) {
    const A = ATTACK_MODULES.dragonBlast, d = s.data, D = DRAGON.blast;
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", A.active); return; }
    if (s.phase !== "active") return;
    d.charge -= w.dt; e.dragonCharge = 1 - Math.max(0, d.charge) / D.charge;
    if (d.charge <= 0 && d.shot < D.shots) { const p = center(w.player), dir = unit(p.x - e.x, p.y - e.y), mouth = { x: e.x + dir.x * bodyRadius(e) * 1.4, y: e.y + dir.y * bodyRadius(e) * 1.4 };
      w.addEffect({ kind: "dragonComet", owner: e.id, x: mouth.x, y: mouth.y, vx: dir.x * D.speed, vy: dir.y * D.speed, to: { ...p }, radius: D.size, blast: D.radius, arming: 0, life: Math.max(.2, distance(p, mouth) / D.speed), damage: damageOf(e, "dragonBlast") });
      d.shot++; d.charge = D.charge; e.dragonPose = d.shot % 2 ? "breath" : "charge"; }
    if (d.shot >= D.shots && d.charge < D.charge * .5 || s.t <= 0) { e.dragonCharge = 0; toPhase(s, "recover", A.recover); }
  },
  dragonColonize(e, s, w) {
    if (s.phase === "windup") { e.dragonCharge = 1 - s.t / (ATTACK_MODULES.dragonColonize.windup * BOSS_PACE.windup); if (s.t > 0) return;
      w.dragonLava?.(e); w.addEffect({ kind: "shock", owner: e.id, x: e.x, y: e.y, radius: 8, arming: 0, life: .7, damage: 0 }); e.dragonCharge = 0; e.dragonPose = "roar"; s.tele = null; toPhase(s, "recover", ATTACK_MODULES.dragonColonize.recover); }
  },
  dragonClawSpin(e, s, w) {
    const A = ATTACK_MODULES.dragonClawSpin, d = s.data, D = DRAGON.claw;
    if (s.phase === "windup") { if (s.t <= 0) { e.dragonPose = "spin"; d.fired = 0; toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active") return;
    e.dragonSpin = (e.dragonSpin || 0) + w.dt * 9;
    if (!s.hitOnce && distance(center(w.player), e) <= bodyRadius(e) + D.reach) { s.hitOnce = true; w.hurt(e, damageOf(e, "dragonClawSpin"), { jumpable: false, source: "dragonClawSpin" }); }
    const due = d.beams ? Math.floor((1 - s.t / A.active) * D.count) : 0;
    while (d.fired < Math.min(D.count, due)) { const a = d.fired * (Math.PI * 2 / D.count) + d.fired * D.twist; w.addEffect({ kind: "clawBeam", owner: e.id, x: e.x, y: e.y, vx: Math.cos(a) * D.speed, vy: Math.sin(a) * D.speed, radius: D.radius, arming: 0, life: D.life, damage: Math.ceil(damageOf(e, "dragonClawSpin") * .6) }); d.fired++; }
    if (s.t <= 0) { e.dragonSpin = 0; s.tele = null; toPhase(s, "recover", A.recover); }
  },
  dragonTailSpin(e, s, w) {
    const A = ATTACK_MODULES.dragonTailSpin;
    if (s.phase === "windup") { if (s.t <= 0) { e.dragonPose = "tailSpin"; toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active") return;
    e.dragonSpin = (e.dragonSpin || 0) + w.dt * 7;
    if (!s.hitOnce && distance(center(w.player), e) <= bodyRadius(e) + DRAGON.tailSpin.reach) { s.hitOnce = true; w.hurt(e, damageOf(e, "dragonTailSpin"), { jumpable: false, source: "dragonTailSpin" }); }
    if (s.t <= 0) { e.dragonSpin = 0; s.tele = null; toPhase(s, "recover", A.recover); }
  },
  dragonTailSwipe(e, s, w) {
    const A = ATTACK_MODULES.dragonTailSwipe, d = s.data, D = DRAGON.tailSwipe;
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", A.active); return; }
    if (s.phase !== "active") return;
    d.next -= w.dt;
    if (d.next <= 0 && d.swipe < D.swipes) { const p = center(w.player), base = Math.atan2(p.y - e.y, p.x - e.x) + (d.swipe % 2 ? .5 : -.5), aim = { x: Math.cos(base), y: Math.sin(base) }, reach = bodyRadius(e) + D.reach;
      s.tele = { type: "arc", aim, radius: reach, arc: D.arc }; e.dragonPose = d.swipe % 2 ? "tailR" : "tailL";
      if (inArc(e, p, aim, reach, D.arc)) w.hurt(e, damageOf(e, "dragonTailSwipe"), { jumpable: false, source: "dragonTailSwipe" });
      d.swipe++; d.next = D.gap; }
    if (s.t <= 0 || d.swipe >= D.swipes && d.next <= 0) { s.tele = null; toPhase(s, "recover", A.recover); }
  },
  dragonRoll(e, s, w) {
    const A = ATTACK_MODULES.dragonRoll, d = s.data, D = DRAGON.roll;
    if (s.phase === "windup") { if (s.t <= 0) { s.tele = null; e.dragonPose = "roll"; d.leg = 0; d.left = D.leg; d.hit = false; toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active") return;
    const dir = d.leg ? { x: -d.aim.x, y: -d.aim.y } : d.aim, step = D.speed * w.dt; if (!w.move(e, dir.x * step, dir.y * step)) d.left = 0; d.left -= w.dt;
    if (!d.hit && distance(center(w.player), e) <= bodyRadius(e) + D.hit) { d.hit = true; w.hurt(e, damageOf(e, "dragonRoll"), { jumpable: false, source: "dragonRoll" }); }
    if (d.left <= 0) { if (d.leg === 0) { d.leg = 1; d.left = D.leg; d.hit = false; } else d.left = 0; }
    if (s.t <= 0 || d.leg === 1 && d.left <= 0) { e.dragonPose = null; toPhase(s, "recover", A.recover); }
  },
  dragonFlameWave(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const D = DRAGON.wave, d = s.data;
    w.addEffect({ kind: "dragonScorch", owner: e.id, x: e.x, y: e.y, angle: Math.atan2(d.aim.y, d.aim.x), arc: d.ring ? 360 : D.arc, reach: D.radius, radius: 0, arming: 0, life: D.radius / D.speed + D.linger, total: D.radius / D.speed + D.linger, damage: damageOf(e, "dragonFlameWave"), bite: Math.max(1, Math.ceil(e.damage * D.bite)) });
    e.dragonPose = "breath"; s.tele = null; toPhase(s, "recover", ATTACK_MODULES.dragonFlameWave.recover);
  },
  dragonDive(e, s, w) {
    const A = ATTACK_MODULES.dragonDive, d = s.data, D = DRAGON.dive;
    if (s.phase === "windup") { if (s.t <= 0) { d.stage = "rise"; d.left = D.rise; e.aloft = true; e.untargetable = true; e.dragonPose = "rise"; toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active") return;
    const p = center(w.player); d.left -= w.dt;
    if (d.stage === "rise") { const k = 1 - Math.max(0, d.left) / D.rise; e.dragonAir = D.height * (1 - (1 - k) * (1 - k)); if (d.left <= 0) { d.stage = "hang"; d.left = D.hang; e.dragonPose = "hang"; s.tele = { type: "circle", x: e.x, y: e.y, radius: D.radius }; } return; }
    if (d.stage === "hang") { // its ring follows you
      e.dragonAir = D.height; const dist = distance(p, e), step = Math.min(dist - D.stop, D.track * w.dt); if (step > .01) { w.move(e, (p.x - e.x) / dist * step, (p.y - e.y) / dist * step, { phase: true }); e.facingX = p.x >= e.x ? 1 : -1; }
      s.tele = { type: "circle", x: e.x, y: e.y, radius: D.radius };
      if (d.left <= 0) { d.stage = "fall"; d.left = D.fall; e.dragonPose = "dive"; } return; }
    if (d.stage === "fall") {
      const k = Math.max(0, d.left) / D.fall; e.dragonAir = D.height * k * k; s.tele = { type: "circle", x: e.x, y: e.y, radius: D.radius };
      if (d.left > 0) return;
      d.stage = "done"; e.dragonAir = 0; e.aloft = false; e.untargetable = false; e.dragonPose = "diveLand"; s.tele = null; const dmg = damageOf(e, "dragonDive");
      if (distance(p, e) <= D.radius + .2) w.hurt(e, dmg, { jumpable: false, source: "dragonDive" });
      w.addEffect({ kind: "shock", owner: e.id, x: e.x, y: e.y, radius: D.ring, arming: 0, life: .8, damage: Math.ceil(dmg * D.ringShare), jumpable: true, stone: true });
      w.addEffect({ kind: "dust", owner: e.id, x: e.x, y: e.y, radius: D.radius + .6, arming: 0, life: .7, damage: 0 });
      w.addEffect({ kind: "dragonBurst", owner: e.id, x: e.x, y: e.y, radius: D.radius, arming: 0, life: .5, total: .5, damage: 0 });
      dragonPool(e.id, w, e.x, e.y, DRAGON.pool.dive, Math.max(1, Math.ceil(e.damage * DRAGON.pool.bite)));
      toPhase(s, "recover", A.recover); return;
    }
    if (s.t <= 0) { e.aloft = false; e.untargetable = false; e.dragonAir = 0; s.tele = null; e.dragonPose = "land"; toPhase(s, "recover", A.recover); }
  },
  dragonSupernova(e, s, w) {
    const A = ATTACK_MODULES.dragonSupernova, D = DRAGON.nova;
    if (s.phase === "windup") { e.aloft = true; e.untargetable = true; e.dragonAir = Math.min(D.height, (e.dragonAir || 0) + w.dt * 4); if (s.t <= 0) { e.dragonPose = "nova"; toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active") return;
    e.dragonAir = D.height; e.dragonCharge = Math.min(1, (A.active - s.t) / D.gather); s.tele = { type: "ring", radius: D.radius };
    if (!s.data.burst && A.active - s.t >= D.gather) { s.data.burst = true; const p = center(w.player);
      w.addEffect({ kind: "dragonNova", owner: e.id, x: e.x, y: e.y, radius: D.radius, arming: 0, life: .9, total: .9, damage: 0 });
      if (distance(p, e) <= D.radius && !w.sunfallShaded?.(e)) w.hurt(e, Math.ceil((w.playerMaxHp?.() || 200) * D.lethal), { jumpable: false, source: "dragonSupernova", piercing: true }); } // sunfallShaded: the Stillworks' pillars (pentagon-arena.ts cover); elsewhere there is no such hook
    if (s.t <= 0) { e.aloft = false; e.untargetable = false; e.dragonAir = 0; e.dragonCharge = 0; s.tele = null; e.dragonPose = "land"; toPhase(s, "recover", A.recover); }
  },
  doomBeam(e, s, w) {
    const A = ATTACK_MODULES.doomBeam, d = s.data, D = DOOM.beam;
    if (s.phase === "windup") { e.dragonCharge = 1 - Math.max(0, s.t) / Math.max(.01, d.wind); if (s.t <= 0) { e.dragonPose = "breath"; toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active") return;
    const k = 1 - Math.max(0, s.t) / A.active; d.angle = d.from + (d.to - d.from) * k;
    const dir = { x: Math.cos(d.angle), y: Math.sin(d.angle) }, len = rayLength(w, e, dir, D.reach);
    s.tele = null; e.doomRays = [{ angle: d.angle, length: len }]; e.facingX = dir.x >= 0 ? 1 : -1;
    d.tick -= w.dt; if (d.tick <= 0 && segmentDistance(center(w.player), e, { x: e.x + dir.x * len, y: e.y + dir.y * len }) <= D.width) { w.hurt(e, damageOf(e, "doomBeam"), { jumpable: false, source: "doomBeam", beam: true }); d.tick = D.tick; }
    d.erupt -= w.dt; while (d.erupt <= 0) { d.erupt += D.eruptEvery; d.n++; const r = 1.5 + (hashSeed(`${e.id}:${s.seq}:erupt:${d.n}`) % 100) / 100 * Math.max(0, len - 1.5); doomErupt(e, w, e.x + dir.x * r, e.y + dir.y * r, D.eruptArm, D.eruptRadius, Math.ceil(damageOf(e, "doomBeam") * D.eruptShare)); }
    if (s.t <= 0) { e.doomRays = null; e.dragonCharge = 0; toPhase(s, "recover", A.recover); }
  },
  doomWaves(e, s, w) {
    const A = ATTACK_MODULES.doomWaves, d = s.data, D = DOOM.waves;
    if (s.phase === "windup") { e.aloft = true; e.untargetable = true; e.dragonAir = Math.min(D.height, (e.dragonAir || 0) + w.dt * 3); if (s.t <= 0) { s.tele = null; toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active") return;
    e.dragonAir = D.height; const due = Math.min(D.count, 1 + Math.floor((A.active - s.t) / (A.active / D.count)));
    while (d.sent < due) { const p = center(w.player), dir = unit(p.x - e.x, p.y - e.y); e.facingX = dir.x >= 0 ? 1 : -1; e.dragonPose = d.sent % 2 ? "wingLash" : "hop";
      w.addEffect({ kind: "doomWave", owner: e.id, x: e.x + dir.x, y: e.y + dir.y, vx: dir.x * D.speed, vy: dir.y * D.speed, radius: D.radius, half: D.half, length: D.half, arming: 0, life: D.life, total: D.life, damage: damageOf(e, "doomWaves") }); d.sent++; }
    if (s.t <= 0) { e.aloft = false; e.untargetable = false; e.dragonAir = 0; e.dragonPose = "land"; toPhase(s, "recover", A.recover); }
  },
  doomBreath(e, s, w) {
    const A = ATTACK_MODULES.doomBreath, d = s.data, D = DOOM.breath;
    if (s.phase === "windup") { if (s.t <= 0) { e.dragonPose = "breath"; s.tele = null; toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active") return;
    const k = 1 - Math.max(0, s.t) / A.active, a = Math.atan2(d.aim.y, d.aim.x) + (k - .5) * D.sweep, aim = { x: Math.cos(a), y: Math.sin(a) };
    e.doomBreath = { angle: a, reach: D.reach, arc: D.arc }; e.facingX = aim.x >= 0 ? 1 : -1;
    d.tick -= w.dt; if (d.tick <= 0 && inArc(e, center(w.player), aim, D.reach, D.arc)) { w.hurt(e, damageOf(e, "doomBreath"), { jumpable: false, source: "doomBreath", beam: true }); d.tick = D.tick; }
    while (d.pools < Math.min(D.pools, Math.floor(k * D.pools + .5))) { d.pools++; const r = D.reach * (d.pools % 2 ? .5 : .8); doomPool(e.id, w, e.x + aim.x * r, e.y + aim.y * r, DOOM.pool.radius * 1.2, doomBite(e)); }
    if (s.t <= 0) { e.doomBreath = null; toPhase(s, "recover", A.recover); }
  },
  doomWingSlam(e, s, w) {
    const A = ATTACK_MODULES.doomWingSlam, d = s.data, D = DOOM.wing;
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", A.active); return; }
    if (s.phase !== "active") return;
    d.next -= w.dt;
    if (d.next <= 0 && d.slam < D.slams) { const p = center(w.player), dir = unit(p.x - e.x, p.y - e.y), side = d.slam % 2 ? 1 : -1, r = bodyRadius(e) + D.reach;
      if (distance(p, e) > r + D.step) w.move(e, dir.x * D.step, dir.y * D.step); e.facingX = dir.x >= 0 ? 1 : -1;
      doomErupt(e, w, e.x + dir.x * r - dir.y * side * D.side, e.y + dir.y * r + dir.x * side * D.side, .3, D.radius, damageOf(e, "doomWingSlam"), DOOM.pool.radius);
      e.dragonPose = side > 0 ? "wingR" : "wingL"; d.slam++; d.next = A.active / D.slams; }
    if (s.t <= 0 || d.slam >= D.slams && d.next <= 0) toPhase(s, "recover", A.recover);
  },
  doomPounce(e, s, w) {
    const A = ATTACK_MODULES.doomPounce, d = s.data, D = DOOM.pounce;
    if (s.phase === "windup") { if (s.t <= 0) { s.tele = null; e.dragonPose = "hop"; d.room = rayLength(w, e, d.aim, d.len); d.flown = 0; toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active") return;
    if (!d.landed) { const step = Math.min(D.speed * w.dt, Math.max(0, d.room - d.flown)); if (step > 0 && w.move(e, d.aim.x * step, d.aim.y * step, { phase: true })) d.flown += step; else d.flown = d.room;
      e.dragonAir = Math.sin(Math.PI * Math.min(1, d.flown / Math.max(.1, d.room))) * D.height; e.facingX = d.aim.x >= 0 ? 1 : -1;
      if (d.flown >= d.room - .01) { d.landed = true; e.dragonAir = 0; e.dragonPose = "slamBoth"; const dmg = damageOf(e, "doomPounce");
        if (distance(center(w.player), e) <= bodyRadius(e) + D.radius) w.hurt(e, dmg, { jumpable: false, source: "doomPounce" });
        w.addEffect({ kind: "doomBurst", owner: e.id, x: e.x, y: e.y, radius: bodyRadius(e) + D.radius, arming: 0, life: .5, total: .5, damage: 0 });
        for (let i = 0; i < D.ring; i++) { const a = i * TAU / D.ring + (s.seq % 7) * .3; doomErupt(e, w, e.x + Math.cos(a) * D.ringRadius, e.y + Math.sin(a) * D.ringRadius, .5, .8, Math.ceil(dmg * .6)); }
        doomPool(e.id, w, e.x, e.y, DOOM.pool.radius * 1.4, doomBite(e)); } }
    if (s.t <= 0 || d.landed) { e.dragonAir = 0; toPhase(s, "recover", A.recover); }
  },
  doomScales(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const D = DOOM.scales, p = center(w.player);
    for (let i = 0; i < D.count; i++) { const h = hashSeed(`${e.id}:${s.seq}:scale:${i}`), a = (h % 628) / 100, r = i === 0 ? 0 : D.ring[0] + ((h >>> 9) % 100) / 100 * (D.ring[1] - D.ring[0]), arm = D.arm[0] + ((h >>> 5) % 100) / 100 * (D.arm[1] - D.arm[0]);
      w.addEffect({ kind: "doomScale", owner: e.id, x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, from: { x: e.x, y: e.y }, radius: D.radius, arming: arm, armTotal: arm, life: .45, total: .45, damage: damageOf(e, "doomScales") }); }
    e.dragonPose = "roar"; s.tele = null; toPhase(s, "recover", ATTACK_MODULES.doomScales.recover);
  },
  doomTar(e, s, w) {
    const A = ATTACK_MODULES.doomTar, d = s.data, D = DOOM.tar;
    if (s.phase === "windup") { if (s.t <= 0) { e.dragonPose = "breath"; toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active") return;
    const due = Math.min(D.globs, 1 + Math.floor((A.active - s.t) / (A.active / D.globs)));
    while (d.spat < due) { const p = center(w.player), h = hashSeed(`${e.id}:${s.seq}:tar:${d.spat}`), a = (h % 628) / 100, r = d.spat === 0 ? 0 : ((h >>> 8) % 100) / 100 * D.spread;
      w.addEffect({ kind: "doomTar", owner: e.id, x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, from: { x: e.x, y: e.y }, radius: D.radius, arming: D.fly, armTotal: D.fly, life: D.ignite + D.burn, total: D.ignite + D.burn, damage: Math.max(1, Math.ceil(e.damage * D.bite)), splash: damageOf(e, "doomTar") }); d.spat++; }
    if (s.t <= 0) toPhase(s, "recover", A.recover);
  },
  doomFall(e, s, w) {
    const A = ATTACK_MODULES.doomFall, d = s.data, D = DOOM.fall;
    if (s.phase === "windup") { e.aloft = true; e.untargetable = true; e.dragonAir = Math.min(D.height, (e.dragonAir || 0) + w.dt * 6); if (s.t <= 0) { d.mode = "track"; d.left = D.track; e.dragonPose = "fly"; toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active") return;
    const p = center(w.player);
    if (d.mode === "track") { e.dragonAir = D.height; const dd = distance(p, e); if (dd > .1) { const st = Math.min(dd, D.trackSpeed * w.dt); w.move(e, (p.x - e.x) / dd * st, (p.y - e.y) / dd * st, { phase: true }); e.facingX = p.x >= e.x ? 1 : -1; }
      s.tele = { type: "ring", radius: bodyRadius(e) + D.radius }; d.left -= w.dt; if (d.left <= 0) { d.mode = "drop"; d.left = D.drop; } }
    else if (d.mode === "drop") { d.left -= w.dt; e.dragonAir = D.height * Math.max(0, d.left) / D.drop;
      if (d.left <= 0) { d.mode = "done"; e.dragonAir = 0; e.aloft = false; e.untargetable = false; e.dragonPose = "slamBoth"; s.tele = null; const dmg = damageOf(e, "doomFall");
        if (distance(p, e) <= bodyRadius(e) + D.radius) w.hurt(e, dmg, { jumpable: false, source: "doomFall" });
        w.addEffect({ kind: "doomBurst", owner: e.id, x: e.x, y: e.y, radius: bodyRadius(e) + D.radius, arming: 0, life: .6, total: .6, damage: 0 });
        for (let i = 0; i < D.ring; i++) { const a = i * TAU / D.ring + (s.seq % 5) * .4; doomErupt(e, w, e.x + Math.cos(a) * D.ringRadius, e.y + Math.sin(a) * D.ringRadius, .45, .9, Math.ceil(dmg * .55)); }
        doomPool(e.id, w, e.x, e.y, DOOM.pool.radius * 1.6, doomBite(e)); toPhase(s, "recover", A.recover); return; } }
    if (s.t <= 0) { e.aloft = false; e.untargetable = false; e.dragonAir = 0; s.tele = null; toPhase(s, "recover", A.recover); }
  },
  doomJaws(e, s, w) {
    const A = ATTACK_MODULES.doomJaws, d = s.data, D = DOOM.jaws;
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", A.active); return; }
    if (s.phase !== "active") return;
    if (s.t <= 0) { s.tele = null; toPhase(s, "recover", A.recover); return; }
    d.next -= w.dt; if (d.next > 0) return;
    const p = center(w.player), dir = unit(p.x - e.x, p.y - e.y); e.facingX = dir.x >= 0 ? 1 : -1;
    if (d.bite < D.bites) { const reach = bodyRadius(e) + D.reach; if (distance(p, e) > reach) w.move(e, dir.x * D.lunge, dir.y * D.lunge); e.dragonPose = "bite"; s.tele = { type: "arc", aim: dir, radius: reach, arc: D.arc };
      if (inArc(e, p, dir, reach, D.arc)) w.hurt(e, damageOf(e, "doomJaws"), { jumpable: false, source: "doomJaws" }); d.bite++; d.next = D.gap; }
    else if (!d.tail) { d.tail = true; const reach = bodyRadius(e) + D.tailReach; e.dragonPose = "tailR"; s.tele = { type: "arc", aim: dir, radius: reach, arc: D.tailArc };
      if (inArc(e, p, dir, reach, D.tailArc)) w.hurt(e, Math.ceil(damageOf(e, "doomJaws") * 1.1), { jumpable: false, source: "doomTail" }); d.next = D.gap; }
    else { s.tele = null; toPhase(s, "recover", A.recover); }
  },
  doomOrbs(e, s, w) {
    const A = ATTACK_MODULES.doomOrbs, d = s.data, D = DOOM.orbs;
    if (s.phase === "windup") { if (s.t <= 0) { e.dragonPose = "breath"; toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active") return;
    const due = Math.min(D.count, 1 + Math.floor((A.active - s.t) / (A.active / D.count)));
    while (d.sent < due) { const p = center(w.player), base = Math.atan2(p.y - e.y, p.x - e.x), a = base + (d.sent - (D.count - 1) / 2) * .45, m = bodyRadius(e) * 1.4;
      w.addEffect({ kind: "doomOrb", owner: e.id, x: e.x + Math.cos(base) * m, y: e.y + Math.sin(base) * m, vx: Math.cos(a) * D.speed, vy: Math.sin(a) * D.speed, radius: D.radius, blast: D.blast, home: D.home, turn: D.turn, arming: 0, life: D.life, total: D.life, damage: damageOf(e, "doomOrbs") }); d.sent++; }
    if (s.t <= 0) toPhase(s, "recover", A.recover);
  },
  doomEclipse(e, s, w) {
    const A = ATTACK_MODULES.doomEclipse, d = s.data, D = DOOM.eclipse;
    if (s.phase === "windup") { e.aloft = true; e.dragonAir = Math.min(D.height, (e.dragonAir || 0) + w.dt * 3); if (s.t <= 0) { e.dragonPose = "eclipse"; toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active") return;
    e.dragonAir = D.height; e.dragonCharge = 1; s.tele = null;
    const el = A.active - Math.max(0, s.t), p = center(w.player), rays = [];
    for (let i = 0; i < D.beams; i++) { const a = d.turn + i * TAU / D.beams + el * D.spin, dir = { x: Math.cos(a), y: Math.sin(a) }; rays.push({ angle: a, length: rayLength(w, e, dir, D.reach), dir }); }
    e.doomRays = rays.map(({ angle, length }) => ({ angle, length }));
    d.tick -= w.dt; if (d.tick <= 0 && rays.some((r) => segmentDistance(p, e, { x: e.x + r.dir.x * r.length, y: e.y + r.dir.y * r.length }) <= D.width)) { w.hurt(e, damageOf(e, "doomEclipse"), { jumpable: false, source: "doomEclipse", beam: true }); d.tick = D.tick; }
    d.erupt -= w.dt; while (d.erupt <= 0) { d.erupt += D.eruptEvery; d.n++; const r = rays[d.n % rays.length], at = 1.5 + (hashSeed(`${e.id}:${s.seq}:ecl:${d.n}`) % 100) / 100 * Math.max(0, r.length - 1.5); doomErupt(e, w, e.x + r.dir.x * at, e.y + r.dir.y * at, DOOM.beam.eruptArm, DOOM.beam.eruptRadius, Math.ceil(damageOf(e, "doomEclipse") * 1.4)); }
    if (s.t <= 0) { e.doomRays = null; e.aloft = false; e.dragonAir = 0; e.dragonCharge = 0; e.dragonPose = "land"; toPhase(s, "recover", A.recover); }
  },
  doomRoar(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const D = DOOM.roar, p = center(w.player);
    if (distance(p, e) <= D.radius && w.hurt(e, damageOf(e, "doomRoar"), { jumpable: false, source: "doomRoar" })) { w.push?.(e, D.push, D.radius + 1); w.frenzy?.(D.frenzy); }
    w.addEffect({ kind: "doomBurst", owner: e.id, x: e.x, y: e.y, radius: D.radius, arming: 0, life: .7, total: .7, damage: 0, ring: true });
    e.dragonPose = "roar"; s.tele = null; toPhase(s, "recover", ATTACK_MODULES.doomRoar.recover);
  },
  mothGust(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const d = s.data, reach = bodyRadius(e) + MOTH.gustReach, p = center(w.player);
    if (inArc(e, p, d.aim, reach, MOTH.gustArc) && w.los(e, w.player)) { w.hurt(e, damageOf(e, "mothGust"), { jumpable: false, source: "mothGust" }); w.push?.(e, MOTH.gustPush, reach + 1); }
    const a0 = Math.atan2(d.aim.y, d.aim.x), arc = MOTH.gustArc * Math.PI / 180;
    for (let i = 0; i < MOTH.gustAsh; i++) { const h = hashSeed(`${e.id}:${s.seq}:ash:${i}`), a = a0 + ((h % 100) / 100 - .5) * arc, r = 2 + ((h >>> 8) % 100) / 100 * (MOTH.gustReach - 1.5);
      mothDustAt(e, w, e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, 1.2 + i * .2, MOTH.dustRadius * .85, Math.ceil(damageOf(e, "mothGust") * .8)); }
    w.addEffect({ kind: "dust", owner: e.id, x: e.x + d.aim.x * 2, y: e.y + d.aim.y * 2, radius: 2.4, arming: 0, life: .6, damage: 0 });
    e.mothPose = "beat"; s.tele = null; toPhase(s, "recover", ATTACK_MODULES.mothGust.recover);
  },
  mothDust(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const p = center(w.player), dmg = damageOf(e, "mothDust");
    for (let i = 0; i < MOTH.dust; i++) { const h = hashSeed(`${e.id}:${s.seq}:dust:${i}`), a = (h % 628) / 100, r = i === 0 ? 0 : MOTH.dustRing[0] + (MOTH.dustRing[1] - MOTH.dustRing[0]) * ((h >>> 9) % 100) / 100, arm = MOTH.dustArm[0] + (MOTH.dustArm[1] - MOTH.dustArm[0]) * i / (MOTH.dust - 1);
      mothDustAt(e, w, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, arm, MOTH.dustRadius, dmg); }
    e.mothPose = "beat"; s.tele = null; toPhase(s, "recover", ATTACK_MODULES.mothDust.recover);
  },
  mothDive(e, s, w) {
    const A = ATTACK_MODULES.mothDive, d = s.data;
    if (s.phase === "windup") { e.mothAir = Math.min(1, (e.mothAir || 0) + w.dt * 2); if (s.t <= 0) { s.tele = null; e.mothPose = "dive"; d.drop = 0; d.room = rayLength(w, e, d.aim, MOTH.diveSpeed * A.active); /* release 707: it stops where its lane ends, never inside a wall */ toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active") return;
    const step = Math.min(MOTH.diveSpeed * w.dt, Math.max(0, d.room ?? Infinity)); if (step > 0) { w.move(e, d.aim.x * step, d.aim.y * step, { phase: true }); d.room = (d.room ?? Infinity) - step; } e.mothAir = Math.max(0, (e.mothAir || 0) - w.dt * 3);
    if (!s.hitOnce && distance(center(w.player), e) <= bodyRadius(e) + MOTH.diveHit) { s.hitOnce = true; w.hurt(e, damageOf(e, "mothDive"), { jumpable: false, source: "mothDive" }); }
    d.drop -= w.dt; if (d.drop <= 0) { d.drop = MOTH.diveTrail; mothFire(e, w); }
    if (s.t <= 0) { e.aloft = false; e.mothAir = 0; e.mothPose = null; toPhase(s, "recover", A.recover); }
  },
  mothSpiral(e, s, w) {
    const A = ATTACK_MODULES.mothSpiral, d = s.data;
    if (s.phase === "windup") { if (s.t <= 0) { s.tele = null; toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active") return;
    d.next -= w.dt;
    while (d.next <= 0) { d.next += MOTH.spiralEvery; d.turn += MOTH.spiralTurn; const dmg = damageOf(e, "mothSpiral"); mothEmber(e, w, d.turn, dmg); mothEmber(e, w, d.turn + Math.PI, dmg); }
    if (s.t <= 0) { e.mothPose = null; toPhase(s, "recover", A.recover); }
  },
  mothSwarm(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const p = center(w.player), a0 = Math.atan2(p.y - e.y, p.x - e.x);
    for (let i = 0; i < MOTH.swarm; i++) { const a = a0 + (i / (MOTH.swarm - 1) - .5) * 2.4; w.addEffect({ kind: "orb", fire: true, moth: true, owner: e.id, x: e.x, y: e.y, vx: Math.cos(a) * MOTH.swarmSpeed, vy: Math.sin(a) * MOTH.swarmSpeed, homing: MOTH.swarmHome, turn: MOTH.swarmTurn, radius: MOTH.swarmRadius, arming: 0, life: MOTH.swarmLife, damage: damageOf(e, "mothSwarm") }); }
    e.mothPose = "beat"; s.tele = null; toPhase(s, "recover", ATTACK_MODULES.mothSwarm.recover);
  },
  mothCocoon(e, s, w) {
    const A = ATTACK_MODULES.mothCocoon;
    if (s.phase === "windup") { if (s.t <= 0) { s.tele = null; e.iceShield = true; e.mothCocoon = true; toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active") return;
    e.untargetable = true;
    if (s.t <= 0) {
      e.iceShield = false; e.untargetable = false; e.mothCocoon = false; e.mothPose = "beat"; const dmg = damageOf(e, "mothCocoon");
      w.addEffect({ kind: "shock", owner: e.id, x: e.x, y: e.y, radius: MOTH.cocoonRing, arming: 0, life: .8, damage: dmg, jumpable: true });
      for (let i = 0; i < MOTH.cocoonEmbers; i++) mothEmber(e, w, i * Math.PI * 2 / MOTH.cocoonEmbers, Math.ceil(dmg * .6));
      toPhase(s, "recover", A.recover);
    }
  },
  mothGale(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const G = MOTH.gale, p = center(w.player), base = Math.atan2(p.y - e.y, p.x - e.x);
    for (let i = 0; i < G.count; i++) { const a = base + (i ? 1 : -1) * .9, d = bodyRadius(e) + 1.5; w.addEffect({ kind: "gale", owner: e.id, x: e.x + Math.cos(a) * d, y: e.y + Math.sin(a) * d, vx: Math.cos(a) * G.speed, vy: Math.sin(a) * G.speed, radius: G.radius, arming: 0, life: G.life, total: G.life, seed: hashSeed(`${e.id}:${s.seq}:gale:${i}`), damage: damageOf(e, "mothGale") }); }
    e.mothPose = null; s.tele = null; toPhase(s, "recover", ATTACK_MODULES.mothGale.recover);
  },
  mothThreads(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const T = MOTH.threads, p = center(w.player), a0 = Math.atan2(p.y - e.y, p.x - e.x), arc = T.arc * Math.PI / 180;
    for (let i = 0; i < T.count; i++) { const a = a0 + (i / (T.count - 1) - .5) * arc; w.addEffect({ kind: "silk", owner: e.id, x: e.x, y: e.y, vx: Math.cos(a) * T.speed, vy: Math.sin(a) * T.speed, turn: T.turn, home: T.home, radius: T.radius, trailMax: T.trail, trail: [], arming: 0, life: T.life, damage: damageOf(e, "mothThreads") }); }
    e.mothPose = "beat"; s.tele = null; toPhase(s, "recover", ATTACK_MODULES.mothThreads.recover);
  },
  mothThreadBlast(e, s, w) {
    const B = MOTH.burst, d = s.data;
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", B.gap * B.count + .1); return; }
    if (s.phase !== "active") return;
    d.next -= w.dt;
    if (d.next <= 0 && d.shot < B.count) { const p = center(w.player), a = Math.atan2(p.y - e.y, p.x - e.x) + (d.shot ? .5 : -.5); // they leave to either side, then bend in
      w.addEffect({ kind: "silk", big: true, owner: e.id, x: e.x, y: e.y, vx: Math.cos(a) * B.speed, vy: Math.sin(a) * B.speed, turn: B.turn, home: B.home, radius: B.radius, blast: B.blast, trailMax: B.trail, trail: [], arming: 0, life: B.life, damage: damageOf(e, "mothThreadBlast") });
      d.shot++; d.next = B.gap; e.mothPose = "beat"; }
    if (s.t <= 0) { e.mothPose = null; toPhase(s, "recover", ATTACK_MODULES.mothThreadBlast.recover); }
  },
  mothKindle(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    e.mothKindled = MOTH.kindle.time; e.mothTrail = 0; e.mothDustClock = MOTH.kindle.dustEvery; e.mothPose = null; s.tele = null;
    w.addEffect({ kind: "shock", owner: e.id, x: e.x, y: e.y, radius: 3, arming: 0, life: .5, damage: 0 });
    toPhase(s, "recover", ATTACK_MODULES.mothKindle.recover);
  },
  stagGore(e, s, w) {
    const A = ATTACK_MODULES.stagGore, d = s.data;
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", A.active); return; }
    if (s.phase !== "active") return;
    d.next -= w.dt;
    if (d.next <= 0 && d.cut < STAG.goreCuts) {
      const p = center(w.player), toss = d.cut === STAG.goreCuts - 1; d.aim = unit(p.x - e.x, p.y - e.y); e.facingX = d.aim.x >= 0 ? 1 : -1;
      const lunge = Math.min(STAG.goreLunge, Math.max(0, distance(p, e) - bodyRadius(e) - 1)); if (lunge > 0 && !w.move(e, d.aim.x * lunge, d.aim.y * lunge)) w.detour?.(e, lunge);
      const reach = bodyRadius(e) + (toss ? STAG.tossReach : STAG.goreReach), arc = toss ? STAG.tossArc : STAG.goreArc;
      s.tele = { type: "arc", aim: d.aim, radius: reach, arc }; e.stagPose = toss ? "toss" : d.cut % 2 ? "hookR" : "hookL";
      const q = center(w.player); if (inArc(e, q, d.aim, reach, arc) && w.los(e, w.player) && w.hurt(e, damageOf(e, "stagGore"), { jumpable: false, source: "stagGore" }) && toss) w.push?.(e, STAG.tossPush, reach + 1);
      d.cut++; d.next = STAG.goreGap;
    }
    if (d.cut >= STAG.goreCuts && d.next <= 0 || s.t <= 0) { s.tele = null; toPhase(s, "recover", A.recover); }
  },
  stagCharge(e, s, w) {
    const A = ATTACK_MODULES.stagCharge, d = s.data;
    if (s.phase === "windup") { if (s.t <= 0) { Object.assign(d, { mode: "run", left: STAG.chargeTime, hit: false, drop: 0 }); s.tele = null; e.stagPose = "charge"; toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active") return;
    if (d.mode === "turn") { // between rushes it wheels round after you, the lane showing where it will go
      d.left -= w.dt; const p = center(w.player); d.aim = unit(p.x - e.x, p.y - e.y); e.facingX = d.aim.x >= 0 ? 1 : -1;
      s.tele = { type: "lane", aim: d.aim, length: rayLength(w, e, d.aim, STAG.chargeSpeed * STAG.chargeTime), width: bodyRadius(e) * 1.2 };
      if (d.left <= 0) { Object.assign(d, { mode: "run", left: STAG.chargeTime, hit: false }); s.tele = null; e.stagPose = "charge"; }
    } else {
      const step = STAG.chargeSpeed * w.dt, moved = w.move(e, d.aim.x * step, d.aim.y * step); d.left -= w.dt;
      if (!d.hit && distance(center(w.player), e) <= bodyRadius(e) + STAG.chargeHit) { d.hit = true; w.hurt(e, damageOf(e, "stagCharge"), { jumpable: false, source: "stagCharge" }); }
      d.drop -= w.dt; if (d.drop <= 0) { d.drop = STAG.briarEvery; stagBriar(e, w); }
      if (!moved || d.left <= 0) { d.rush++; if (d.rush >= d.rushes) { s.tele = null; e.stagPose = null; toPhase(s, "recover", A.recover); return; } Object.assign(d, { mode: "turn", left: STAG.chargeTurn }); e.stagPose = "lower"; }
    }
    if (s.t <= 0) { s.tele = null; toPhase(s, "recover", A.recover); }
  },
  stagRoots(e, s, w) {
    const A = ATTACK_MODULES.stagRoots;
    if (s.phase === "windup") {
      if (s.t > 0) return;
      const p = center(w.player), a0 = Math.atan2(p.y - e.y, p.x - e.x), spread = STAG.rootSpread * Math.PI / 180, start = bodyRadius(e) + .4;
      for (let i = 0; i < STAG.rootLines; i++) { const a = a0 + (STAG.rootLines > 1 ? (i / (STAG.rootLines - 1) - .5) * spread * (STAG.rootLines - 1) : 0), dir = { x: Math.cos(a), y: Math.sin(a) };
        let steps = 0; for (let k = 0; k < STAG.rootSteps; k++) { const x = e.x + dir.x * (start + k * STAG.rootStep), y = e.y + dir.y * (start + k * STAG.rootStep); if (w.tileOpen && !w.tileOpen(x + .5, y + .5)) break; steps++; }
        if (steps) w.addEffect({ kind: "rootLine", owner: e.id, x: e.x + dir.x * start, y: e.y + dir.y * start, dx: dir.x, dy: dir.y, steps, length: steps * STAG.rootStep, step: STAG.rootStep, every: STAG.rootEvery, warn: STAG.rootWarn, radius: STAG.rootRadius, burst: -1, arming: 0, life: STAG.rootWarn + steps * STAG.rootEvery + STAG.rootShow, damage: damageOf(e, "stagRoots") }); }
      e.stagPose = "stamp"; s.tele = null; toPhase(s, "recover", A.recover + .4); return;
    }
  },
  stagThorns(e, s, w) {
    const A = ATTACK_MODULES.stagThorns, d = s.data;
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", A.active); return; }
    if (s.phase !== "active") return;
    d.next -= w.dt;
    if (d.next <= 0 && d.volley < STAG.thornVolleys) {
      const p = center(w.player), lift = { x: e.x, y: e.y - .3 }, a0 = Math.atan2(p.y - lift.y, p.x - lift.x) + (d.volley % 2 ? 1 : -1) * STAG.thornTwist * d.volley * Math.PI / 180, arc = STAG.thornArc * Math.PI / 180;
      for (let i = 0; i < STAG.thornShots; i++) { const a = a0 + (i / (STAG.thornShots - 1) - .5) * arc; w.addEffect({ kind: "thorn", owner: e.id, x: lift.x, y: lift.y, vx: Math.cos(a) * STAG.thornSpeed, vy: Math.sin(a) * STAG.thornSpeed, radius: STAG.thornRadius, arming: 0, life: STAG.thornLife, damage: damageOf(e, "stagThorns") }); }
      d.volley++; d.next = STAG.thornEvery; e.stagPose = d.volley % 2 ? "shake" : "shakeB";
    }
    if (d.volley >= STAG.thornVolleys && d.next <= 0 || s.t <= 0) toPhase(s, "recover", A.recover);
  },
  stagLeap(e, s, w) {
    const A = ATTACK_MODULES.stagLeap, d = s.data;
    if (s.phase === "windup") { if (s.t <= 0) { d.stage = "rise"; d.left = STAG.leapRise; e.aloft = true; e.untargetable = true; e.stagPose = "leap"; toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active") return;
    const p = center(w.player); d.left -= w.dt;
    if (d.stage === "rise") { e.stagAir = STAG.leapHeight * (1 - Math.max(0, d.left) / STAG.leapRise); if (d.left <= 0) { d.stage = "hang"; d.left = STAG.leapHang; } return; }
    if (d.stage === "hang") { // its shadow runs after you
      e.stagAir = STAG.leapHeight; const dist = distance(p, e), step = Math.min(dist, STAG.leapTrack * w.dt); if (step > .01) w.move(e, (p.x - e.x) / dist * step, (p.y - e.y) / dist * step, { phase: true });
      s.tele = { type: "circle", x: e.x, y: e.y, radius: STAG.leapRadius };
      if (d.left <= 0) { d.stage = "fall"; d.left = STAG.leapFall; } return;
    }
    if (d.stage === "fall") {
      e.stagAir = STAG.leapHeight * Math.max(0, d.left) / STAG.leapFall; s.tele = { type: "circle", x: e.x, y: e.y, radius: STAG.leapRadius };
      if (d.left > 0) return;
      e.stagAir = 0; e.aloft = false; e.untargetable = false; e.stagPose = "land"; s.tele = null;
      if (distance(center(w.player), e) <= STAG.leapRadius + .2) w.hurt(e, damageOf(e, "stagLeap"), { jumpable: false, source: "stagLeap" });
      w.addEffect({ kind: "shock", owner: e.id, x: e.x, y: e.y, radius: STAG.leapRing, arming: 0, life: .8, damage: Math.ceil(damageOf(e, "stagLeap") * .6), jumpable: true, stone: true });
      w.addEffect({ kind: "rootRing", owner: e.id, x: e.x, y: e.y, ring: STAG.leapSpikeRing, length: STAG.leapSpikeRing /* drawn by its own spike warnings, as lanes are */, spikes: STAG.leapSpikes, turn: (hashSeed(`${e.id}:${s.seq}:land`) % 628) / 100, radius: STAG.cageRadius, arming: .35, armTotal: .35, life: .45, total: .45, damage: Math.ceil(damageOf(e, "stagLeap") * .6) });
      toPhase(s, "recover", A.recover);
    }
  },
  stagCage(e, s, w) {
    const A = ATTACK_MODULES.stagCage;
    if (s.phase !== "windup" || s.t > 0) return;
    const p = s.data.target, turn = (hashSeed(`${e.id}:${s.seq}:cage`) % 628) / 100;
    STAG.cageRings.forEach((ring, i) => { const t = STAG.cageFirst + i * STAG.cageEvery; w.addEffect({ kind: "rootRing", owner: e.id, x: p.x, y: p.y, ring, length: ring, spikes: STAG.cageSpikes[i], turn: turn + i * .4, radius: STAG.cageRadius, arming: t, armTotal: t, life: .45, total: .45, damage: damageOf(e, "stagCage") }); });
    e.stagPose = "stamp"; s.tele = null; toPhase(s, "recover", A.recover + STAG.cageFirst);
  },
  stagStomp(e, s, w) {
    const A = ATTACK_MODULES.stagStomp, d = s.data;
    const stamp = () => {
      if (distance(center(w.player), e) <= bodyRadius(e) + STAG.stompRadius) w.hurt(e, damageOf(e, "stagStomp"), { jumpable: true, source: "stagStomp" });
      w.addEffect({ kind: "shock", owner: e.id, x: e.x, y: e.y, radius: bodyRadius(e) + STAG.stompRing, arming: 0, life: .8, damage: damageOf(e, "stagStomp"), jumpable: true, stone: true });
      w.addEffect({ kind: "dust", owner: e.id, x: e.x, y: e.y, radius: bodyRadius(e) + 1, arming: 0, life: .6, damage: 0 }); d.stamps++; e.stagPose = "stamp";
    };
    if (s.phase === "windup") { if (s.t <= 0) { stamp(); d.next = STAG.stompGap; e.stagPose = "rear"; toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active") return;
    d.next -= w.dt; if (d.stamps < 2 && d.next <= 0) { stamp(); s.tele = null; }
    if (s.t <= 0 || d.stamps >= 2 && d.next < -.2) { s.tele = null; toPhase(s, "recover", A.recover); }
  },
  stagGrove(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const p = center(w.player), G = STAG.grove, dmg = damageOf(e, "stagGrove"), turn = (hashSeed(`${e.id}:${s.seq}:grove`) % 628) / 100;
    for (let i = 0; i < G.trees; i++) { const h = hashSeed(`${e.id}:${s.seq}:tree:${i}`), a = turn + i * Math.PI * 2 / G.trees, r = G.ring[0] + (G.ring[1] - G.ring[0]) * ((h % 100) / 100), burn = G.burn[0] + (G.burn[1] - G.burn[0]) * i / Math.max(1, G.trees - 1), x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
      if (w.tileOpen && !w.tileOpen(x + .5, y + .5)) continue;
      w.addEffect({ kind: "burnTree", owner: e.id, x, y, radius: G.radius, grow: G.grow, burn, arming: 0, life: G.grow + burn + .45, total: G.grow + burn + .45, length: G.blast /* draws its own warnings */, damage: dmg, seed: h }); }
    e.stagPose = "stamp"; s.tele = null; toPhase(s, "recover", ATTACK_MODULES.stagGrove.recover);
  },
  stagMend(e, s, w) {
    const A = ATTACK_MODULES.stagMend;
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", A.active); return; }
    if (s.phase !== "active") return;
    e.stagPose = "mend"; e.stagMending = true; e.hp = Math.min(e.maxHp, e.hp + e.maxHp * STAG.mend.share * w.dt / A.active);
    if (s.t <= 0) { e.stagMending = false; e.stagPose = null; toPhase(s, "recover", A.recover); }
  },
  stagBirds(e, s, w) {
    const A = ATTACK_MODULES.stagBirds, d = s.data, B = STAG.birds;
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", A.active); return; }
    if (s.phase !== "active") return;
    d.next -= w.dt;
    if (d.next <= 0 && d.birds < B.count) {
      const p = center(w.player), h = hashSeed(`${e.id}:${s.seq}:bird:${d.birds}`), a = d.birds * 2.1 + (h % 100) / 60, off = ((h >>> 8) % 100 / 100 - .5) * 2 * B.offset;
      const dir = { x: Math.cos(a), y: Math.sin(a) }, n = { x: -dir.y, y: dir.x }, x = p.x - dir.x * B.reach + n.x * off, y = p.y - dir.y * B.reach + n.y * off;
      w.addEffect({ kind: "birdDive", owner: e.id, x, y, dx: dir.x, dy: dir.y, length: B.reach * 2, speed: B.speed, radius: B.radius, arming: B.warn, armTotal: B.warn, life: B.reach * 2 / B.speed + .1, damage: damageOf(e, "stagBirds") });
      d.birds++; d.next = B.every;
    }
    if (s.t <= 0 || d.birds >= B.count && d.next <= 0) { e.stagPose = null; toPhase(s, "recover", A.recover); }
  },
  stagMire(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const p = s.data.target, M = STAG.mire;
    w.addEffect({ kind: "mire", owner: e.id, x: p.x, y: p.y, radius: M.radius, arming: M.warn, armTotal: M.warn, life: M.time, total: M.time, damage: 0 });
    s.tele = null; e.stagPose = null; toPhase(s, "recover", ATTACK_MODULES.stagMire.recover);
  },
  stagHunt(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    w.push?.(e, STAG.hunt.push, STAG.hunt.pushRadius);
    w.addEffect({ kind: "shock", owner: e.id, x: e.x, y: e.y, radius: STAG.hunt.pushRadius, arming: 0, life: .6, damage: 0, stone: true });
    e.stagHunt = STAG.hunt.time; e.stagTrail = 0; e.stagSpikeClock = STAG.hunt.spikeEvery; e.stagPose = null; s.tele = null;
    toPhase(s, "recover", ATTACK_MODULES.stagHunt.recover);
  },
  // ---------------------------------------------------------------- the Wild Stegosaurus (STEGO)
  stegoBite(e, s, w) {
    const A = ATTACK_MODULES.stegoBite, B = STEGO.bite, d = s.data;
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", A.active); return; }
    if (s.phase !== "active") return;
    d.next -= w.dt; if (d.next < B.every * .5 && d.n > 0) e.stegoPose = "biteReady";
    if (d.next <= 0 && d.n < d.bites) {
      const q = stegoQuarry(s, w) || d.target; d.aim = unit(q.x - e.x, q.y - e.y); stegoFace(e, d.aim);
      const step = Math.min(B.step, Math.max(0, distance(q, e) - bodyRadius(e) - .8)); if (step > 0 && !w.move(e, d.aim.x * step, d.aim.y * step)) w.detour?.(e, step);
      const reach = bodyRadius(e) + B.reach; s.tele = { type: "arc", aim: d.aim, radius: reach, arc: B.arc }; e.stegoPose = "bite";
      stegoStrike(e, s, w, "stegoBite", (t) => inArc(e, t, d.aim, reach, B.arc));
      d.n++; d.next = B.every;
    }
    if (d.n >= d.bites && d.next <= 0 || s.t <= 0) { s.tele = null; e.stegoPose = null; toPhase(s, "recover", A.recover); }
  },
  stegoTailWhack(e, s, w) {
    const A = ATTACK_MODULES.stegoTailWhack, T = STEGO.tailWhack, d = s.data;
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", A.active); return; }
    if (s.phase !== "active") return;
    d.next -= w.dt;
    if (d.next <= 0 && d.n < T.swings) {
      const back = stegoBack(e), reach = bodyRadius(e) + stegoWhackReach(e); s.tele = { type: "arc", aim: back, radius: reach, arc: T.arc }; e.stegoPose = d.n % 2 ? "tailR" : "tailL";
      stegoStrike(e, s, w, "stegoTailWhack", (t) => inArc(e, t, back, reach, T.arc), e.stegoTail === "cut" ? STEGO.cut.whackShare : 1);
      d.n++; d.next = T.every;
    }
    if (d.n >= T.swings && d.next <= 0 || s.t <= 0) { s.tele = null; e.stegoPose = null; toPhase(s, "recover", A.recover); }
  },
  stegoTailSlam(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const T = STEGO.tailSlam, at = s.data.at, r = stegoSlamRadius(e), dmg = damageOf(e, "stegoTailSlam");
    stegoStrike(e, s, w, "stegoTailSlam", (t) => distance(t, at) <= r + .2);
    w.addEffect({ kind: "shock", owner: e.id, x: at.x, y: at.y, radius: T.ring, arming: 0, life: .8, damage: Math.ceil(dmg * T.ringShare), jumpable: true, stone: true });
    w.addEffect({ kind: "dust", owner: e.id, x: at.x, y: at.y, radius: r, arming: 0, life: .6, damage: 0 });
    e.stegoPose = "tailSlam"; s.tele = null; toPhase(s, "recover", ATTACK_MODULES.stegoTailSlam.recover);
  },
  stegoWheel(e, s, w) {
    const A = ATTACK_MODULES.stegoWheel, W = STEGO.wheel, d = s.data;
    if (s.phase === "windup") { e.stegoRoll = Math.min(1, 1 - Math.max(0, s.t) / (A.windup * (s.paced ? BOSS_PACE.windup : 1))); if (s.t <= 0) { s.tele = null; e.stegoPose = "roll"; e.stegoRoll = 1; toPhase(s, "active", A.active); } return; }
    if (s.phase === "recover") { e.stegoPose = "uncurl"; e.stegoRoll = Math.max(0, s.t / A.recover); return; }
    const q = stegoQuarry(s, w) || d.target, want = Math.atan2(q.y - e.y, q.x - e.x), cur = Math.atan2(d.dir.y, d.dir.x), diff = ((want - cur) % TAU + TAU * 1.5) % TAU - Math.PI, a = cur + Math.max(-W.turn * w.dt, Math.min(W.turn * w.dt, diff));
    d.dir = { x: Math.cos(a), y: Math.sin(a) }; stegoFace(e, d.dir); e.stegoRoll = 1; e.stegoPose = "roll";
    const step = W.speed * (e.speedMultiplier || 1) * w.dt, moved = w.move(e, d.dir.x * step, d.dir.y * step); d.stuck = moved ? 0 : d.stuck + w.dt;
    if (d.hitAt < 0 || s.t <= d.hitAt - W.hitGap) { if (stegoStrike(e, s, w, "stegoWheel", (t) => distance(t, e) <= bodyRadius(e) + W.hit)) d.hitAt = s.t; }
    d.dust -= w.dt;
    if (d.dust <= 0) { d.dust = W.dustEvery; d.side = -d.side; const mine = stegoDustCount(w, e.id);
      if (mine < W.dustCap) w.addEffect({ kind: "stegoDust", owner: e.id, x: e.x - d.dir.x * bodyRadius(e), y: e.y - d.dir.y * bodyRadius(e), vx: -d.dir.y * d.side * W.dustSpeed, vy: d.dir.x * d.side * W.dustSpeed, spin: W.dustSpin * d.side, radius: W.dustRadius, arming: 0, life: W.dustLife, total: W.dustLife, damage: Math.max(1, Math.ceil(damageOf(e, "stegoWheel") * W.dustShare)) }); }
    if (s.t <= 0 || d.stuck >= W.blockedStop) { e.stegoPose = "uncurl"; toPhase(s, "recover", A.recover); }
  },
  stegoPlateRockets(e, s, w) {
    const A = ATTACK_MODULES.stegoPlateRockets, R = STEGO.rockets;
    if (s.phase === "windup") {
      if (s.t > 0) return;
      const p = stegoQuarry(s, w) || s.data.target, turn = (hashSeed(`${e.id}:${s.seq}:rockets`) % 628) / 100, dmg = damageOf(e, "stegoPlateRockets");
      for (let i = 0; i < R.count; i++) {
        const r = i === 0 ? 0 : R.ring[0] + (R.ring[1] - R.ring[0]) * ((hashSeed(`${e.id}:${s.seq}:rocket:${i}`) % 100) / 100), a = turn + i * TAU / Math.max(1, R.count - 1), x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
        if (w.tileOpen && !w.tileOpen(x + .5, y + .5) && i > 0) continue;
        const arm = R.rise + i * R.stagger; w.addEffect({ kind: "stegoRocket", owner: e.id, x, y, radius: R.radius, arming: arm, armTotal: arm, life: .35, total: .35, damage: dmg, spikes: R.spikes, turn: a });
      }
      e.stegoPlates = 0; s.tele = null; toPhase(s, "active", A.active); return;
    }
    if (s.phase === "active" && s.t <= 0) { e.stegoPose = null; toPhase(s, "recover", A.recover); }
  },
  stegoTailBlade(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const B = STEGO.blade, q = stegoQuarry(s, w) || s.data.target, aim = unit(q.x - e.x, q.y - e.y), life = stegoBladeLife(e), from = { x: e.x + aim.x * bodyRadius(e), y: e.y + aim.y * bodyRadius(e) };
    stegoFace(e, { x: -aim.x, y: -aim.y });
    w.addEffect({ kind: "stegoBlade", owner: e.id, x: from.x, y: from.y, vx: aim.x * B.speed, vy: aim.y * B.speed, radius: B.radius, length: B.length, arming: 0, life, total: life, damage: damageOf(e, "stegoTailBlade"), cut: e.stegoTail === "cut" });
    e.stegoPose = "whip"; s.tele = null; toPhase(s, "recover", ATTACK_MODULES.stegoTailBlade.recover);
  },
  stegoClaw(e, s, w) {
    const A = ATTACK_MODULES.stegoClaw, C = STEGO.claw, d = s.data;
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", A.active); return; }
    if (s.phase !== "active") return;
    d.next -= w.dt;
    if (d.next <= 0 && d.n < d.swipes) {
      const q = stegoQuarry(s, w) || d.target; d.aim = unit(q.x - e.x, q.y - e.y); stegoFace(e, d.aim);
      const reach = bodyRadius(e) + C.reach; s.tele = { type: "arc", aim: d.aim, radius: reach, arc: C.arc }; e.stegoPose = d.n % 2 ? "clawR" : "clawL";
      stegoStrike(e, s, w, "stegoClaw", (t) => inArc(e, t, d.aim, reach, C.arc)); d.n++; d.next = C.every;
    }
    if (d.n >= d.swipes && d.next <= 0 || s.t <= 0) { s.tele = null; e.stegoPose = null; toPhase(s, "recover", A.recover); }
  },
  stegoRearSwipe(e, s, w) {
    const A = ATTACK_MODULES.stegoRearSwipe, R = STEGO.rear, d = s.data;
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", A.active); return; }
    if (s.phase !== "active") return;
    d.next -= w.dt;
    if (d.next <= 0 && d.n < R.swipes) {
      const q = stegoQuarry(s, w) || d.target; d.aim = unit(q.x - e.x, q.y - e.y); stegoFace(e, d.aim);
      const step = Math.min(R.step, Math.max(0, distance(q, e) - bodyRadius(e) - .9)); if (step > 0 && !w.move(e, d.aim.x * step, d.aim.y * step)) w.detour?.(e, step);
      const reach = bodyRadius(e) + R.reach; s.tele = { type: "arc", aim: d.aim, radius: reach, arc: R.arc }; e.stegoPose = d.n % 2 ? "swipeR" : "swipeL";
      stegoStrike(e, s, w, "stegoRearSwipe", (t) => inArc(e, t, d.aim, reach, R.arc)); d.n++; d.next = R.every;
    }
    if (d.n >= R.swipes && d.next <= 0 || s.t <= 0) { s.tele = null; e.stegoPose = null; toPhase(s, "recover", A.recover); }
  },
  stegoBuck(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const B = STEGO.buck, back = stegoBack(e), reach = bodyRadius(e) + B.reach;
    if (stegoStrike(e, s, w, "stegoBuck", (t) => inArc(e, t, back, reach, B.arc)) && !s.data.prey) w.push?.(e, B.push, reach + 1);
    e.stegoPose = "buck"; s.tele = null; toPhase(s, "recover", ATTACK_MODULES.stegoBuck.recover);
  },
  stegoPounce(e, s, w) {
    const A = ATTACK_MODULES.stegoPounce, P = STEGO.pounce, d = s.data;
    if (s.phase === "windup") { if (s.t <= 0) { d.left = P.time; e.stegoPose = "leap"; e.aloft = true; toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active" || d.landed) return;
    d.left -= w.dt; const k = Math.min(1, 1 - Math.max(0, d.left) / P.time);
    e.x = d.from.x + (d.to.x - d.from.x) * k; e.y = d.from.y + (d.to.y - d.from.y) * k; e.stegoAir = Math.sin(Math.PI * k) * P.height;
    s.tele = { type: "circle", x: d.to.x, y: d.to.y, radius: P.radius };
    if (d.left > 0) return;
    d.landed = true; e.x = d.to.x; e.y = d.to.y; e.stegoAir = 0; e.aloft = false; e.stegoPose = "land"; s.tele = null;
    stegoStrike(e, s, w, "stegoPounce", (t) => distance(t, d.to) <= P.radius + .2);
    w.addEffect({ kind: "shock", owner: e.id, x: d.to.x, y: d.to.y, radius: P.ring, arming: 0, life: .7, damage: Math.ceil(damageOf(e, "stegoPounce") * P.ringShare), jumpable: true, stone: true });
    toPhase(s, "recover", A.recover);
  },
  stegoTreeClub(e, s, w) {
    const A = ATTACK_MODULES.stegoTreeClub, T = STEGO.tree, d = s.data;
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", A.active); return; }
    if (s.phase === "recover") { e.stegoTree = null; return; }
    const tree = (w.map?.objects || []).find((o) => o.id === d.tree);
    if (d.stage === "go") { /* to the tree, then bite into its trunk */
      if (!tree || !isClubTree(tree)) { e.stegoTree = null; e.stegoPose = null; toPhase(s, "recover", A.recover); return; }
      d.left -= w.dt; const to = unit(tree.x - e.x, tree.y - e.y), gap = distance(tree, e) - bodyRadius(e) - .5;
      stegoFace(e, to); e.stegoTree = { phase: "grab", treeX: tree.x, treeY: tree.y }; e.stegoPose = "bite";
      if (gap > .05) { const step = Math.min(gap, STEGO.climb.speed * 1.4 * w.dt); if (!w.move(e, to.x * step, to.y * step)) w.detour?.(e, step); }
      if (gap <= .05 || d.left <= 0) { d.stage = "grab"; d.left = T.grab; }
      return;
    }
    d.left -= w.dt;
    if (d.stage === "grab") { if (d.left <= 0) { if (tree && isClubTree(tree)) w.uprootTree?.(tree, e); else { e.stegoTree = null; toPhase(s, "recover", A.recover); return; } d.stage = "pull"; d.left = T.pull; e.stegoTree = { phase: "pull", treeX: e.stegoTree.treeX, treeY: e.stegoTree.treeY }; e.stegoPose = "shake"; } return; }
    if (d.stage === "pull") { e.stegoPose = "shake"; if (d.left <= 0) { d.stage = "swing"; d.left = T.every; } return; }
    // the swings: a sweep each way, then a slam; each shown `warn` s before it lands
    const q = stegoQuarry(s, w) || d.target, aim = unit(q.x - e.x, q.y - e.y), last = d.n === T.swings - 1, reach = bodyRadius(e) + T.reach;
    e.stegoTree = { phase: "swing", treeX: e.stegoTree?.treeX ?? e.x, treeY: e.stegoTree?.treeY ?? e.y };
    if (d.left <= T.warn && !d.marked) { d.marked = true; stegoFace(e, aim); d.aim = aim; d.at = { x: e.x + aim.x * Math.min(reach, distance(q, e)), y: e.y + aim.y * Math.min(reach, distance(q, e)) };
      s.tele = last ? { type: "circle", x: d.at.x, y: d.at.y, radius: T.slamRadius, total: T.warn } : { type: "arc", aim, radius: reach, arc: T.arc }; e.stegoPose = d.n % 2 ? "swingL" : "swingR"; }
    if (d.left > 0) return;
    if (last) stegoStrike(e, s, w, "stegoTreeClub", (t) => distance(t, d.at) <= T.slamRadius + .2);
    else stegoStrike(e, s, w, "stegoTreeClub", (t) => inArc(e, t, d.aim, reach, T.arc));
    e.stegoPose = last ? "clubSlam" : d.n % 2 ? "swingR" : "swingL"; s.tele = null; d.n++; d.marked = false; d.left = T.every;
    if (d.n >= T.swings) toPhase(s, "recover", A.recover);
  },
  stegoBreach(e, s, w) {
    const A = ATTACK_MODULES.stegoBreach, B = STEGO.breach, d = s.data;
    if (s.phase === "windup") { e.stegoSwim = 1; e.untargetable = true; if (s.t <= 0) { d.stage = "under"; d.left = B.under; toPhase(s, "active", A.active); } return; }
    if (s.phase === "recover") { e.stegoAir = 0; return; }
    if (d.landed) return;
    d.left -= w.dt;
    if (d.stage === "under") { e.stegoSwim = 1; e.untargetable = true;
      if (d.left <= 0) { d.stage = "air"; d.left = B.air; e.stegoPose = "breach"; e.stegoSwim = 2; e.untargetable = false; e.aloft = true; d.from = { x: e.x, y: e.y };
        d.to = d.mode === "lane" ? stegoLanding(e, w, { x: e.x + d.aim.x * s.tele.length, y: e.y + d.aim.y * s.tele.length }, true) : stegoLanding(e, w, d.target, true); }
      return; }
    const k = Math.min(1, 1 - Math.max(0, d.left) / B.air), before = { x: e.x, y: e.y };
    e.x = d.from.x + (d.to.x - d.from.x) * k; e.y = d.from.y + (d.to.y - d.from.y) * k; e.stegoAir = Math.sin(Math.PI * k) * B.height;
    if (d.mode === "lane" && !s.hitOnce) { if (stegoStrike(e, s, w, "stegoBreach", (t) => segmentDistance(t, before, e) <= B.laneWidth)) s.hitOnce = true; }
    if (d.left > 0) return;
    d.landed = true; e.stegoAir = 0; e.aloft = false; s.tele = null;
    if (d.mode === "slam") { stegoStrike(e, s, w, "stegoBreach", (t) => distance(t, d.to) <= B.radius + .2); w.addEffect({ kind: "shock", owner: e.id, x: e.x, y: e.y, radius: B.ring, arming: 0, life: .7, damage: Math.ceil(damageOf(e, "stegoBreach") * B.ringShare), jumpable: true }); }
    toPhase(s, "recover", A.recover);
  },
  // ---------------------------------------------------------------- the Spinosaurus (SPINO)
  spinoBite(e, s, w) {
    const A = ATTACK_MODULES.spinoBite, B = SPINO.bite, d = s.data;
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", A.active); return; }
    if (s.phase !== "active") return;
    d.next -= w.dt;
    if (d.next <= 0 && d.n < d.bites) {
      const q = spinoQuarry(s, w) || d.target; d.aim = unit(q.x - e.x, q.y - e.y); spinoFace(e, d.aim);
      const step = Math.min(B.step, Math.max(0, distance(q, e) - bodyRadius(e) - .9)); if (step > 0) w.move(e, d.aim.x * step, d.aim.y * step);
      const reach = bodyRadius(e) + B.reach; s.tele = { type: "arc", aim: d.aim, radius: reach, arc: B.arc }; e.spinoPose = "bite";
      spinoStrike(e, s, w, "spinoBite", (t) => inArc(e, t, d.aim, reach, B.arc), { bleed: true, bite: true });
      d.n++; d.next = B.every;
    }
    if (d.n >= d.bites && d.next <= 0 || s.t <= 0) { s.tele = null; e.spinoPose = null; toPhase(s, "recover", A.recover); }
  },
  spinoClaw(e, s, w) {
    const A = ATTACK_MODULES.spinoClaw, C = SPINO.claw, d = s.data;
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", A.active); return; }
    if (s.phase !== "active") return;
    d.next -= w.dt;
    if (d.next <= 0 && d.n < C.swipes) {
      const q = spinoQuarry(s, w) || d.target; d.aim = unit(q.x - e.x, q.y - e.y); spinoFace(e, d.aim);
      const reach = bodyRadius(e) + C.reach; s.tele = { type: "arc", aim: d.aim, radius: reach, arc: C.arc }; e.spinoPose = d.n % 2 ? "clawR" : "clawL";
      spinoStrike(e, s, w, "spinoClaw", (t) => inArc(e, t, d.aim, reach, C.arc), { bleed: true }); d.n++; d.next = C.every;
    }
    if (d.n >= C.swipes && d.next <= 0 || s.t <= 0) { s.tele = null; e.spinoPose = null; toPhase(s, "recover", A.recover); }
  },
  spinoLeapSlam(e, s, w) {
    const A = ATTACK_MODULES.spinoLeapSlam, L = SPINO.leap, d = s.data;
    if (s.phase === "windup") { if (s.t <= 0) { d.stage = "air"; d.left = L.time; e.spinoPose = "leap"; e.aloft = true; toPhase(s, "active", A.active); } return; }
    if (s.phase === "recover") { e.spinoAir = 0; return; }
    if (s.phase !== "active") return;
    if (d.stage === "air") {
      d.left -= w.dt; const k = Math.min(1, 1 - Math.max(0, d.left) / L.time);
      e.x = d.from.x + (d.to.x - d.from.x) * k; e.y = d.from.y + (d.to.y - d.from.y) * k; e.spinoAir = Math.sin(Math.PI * k) * L.height;
      if (d.left > 0) return;
      e.x = d.to.x; e.y = d.to.y; e.spinoAir = 0; e.aloft = false; e.spinoPose = "headSlam";
      spinoStrike(e, s, w, "spinoLeapSlam", (t) => distance(t, d.to) <= L.radius + .2);
      w.addEffect({ kind: "shock", owner: e.id, x: d.to.x, y: d.to.y, radius: L.ring, arming: 0, life: .7, damage: Math.max(1, Math.ceil(damageOf(e, "spinoLeapSlam") * L.ringShare)), jumpable: true, stone: true });
      const q = spinoQuarry(s, w) || d.target; d.dir = unit(q.x - e.x, q.y - e.y); spinoFace(e, d.dir);
      d.len = Math.max(.5, rayLength(w, e, d.dir, L.length)); d.stage = "slam"; d.left = L.pause + L.warn; d.went = 0; d.crack = 0;
      s.tele = { type: "lane", aim: d.dir, length: d.len, width: L.width * 2 }; return;
    }
    if (d.stage === "slam") { d.left -= w.dt; e.spinoPose = "headSlam"; if (d.left <= 0) { d.stage = "plough"; e.spinoPose = "plough"; } return; }
    const step = Math.min(L.speed * w.dt, d.len - d.went), before = { x: e.x, y: e.y }, moved = step > 0 && w.move(e, d.dir.x * step, d.dir.y * step);
    e.spinoPose = "plough"; if (moved) d.went += step;
    s.tele = { type: "lane", aim: d.dir, length: Math.max(.2, d.len - d.went), width: L.width * 2 };
    if (!s.hitOnce && spinoStrike(e, s, w, "spinoLeapSlam", (t) => segmentDistance(t, before, e) <= L.width, { share: L.ploughShare })) s.hitOnce = true;
    d.crack -= step;
    if (d.crack <= 0 && spinoFxCount(w, e.id, "spinoFurrow") < L.crackCap) { d.crack = L.crackEvery; w.addEffect({ kind: "spinoFurrow", owner: e.id, x: e.x, y: e.y, angle: Math.atan2(d.dir.y, d.dir.x), radius: L.width, arming: 0, life: L.crackLife, total: L.crackLife, damage: 0 }); }
    if (!moved || d.went >= d.len - .01 || s.t <= 0) { s.tele = null; toPhase(s, "recover", A.recover); }
  },
  spinoDigFling(e, s, w) {
    const A = ATTACK_MODULES.spinoDigFling, D = SPINO.dig, d = s.data;
    if (s.phase === "windup") { e.spinoDig = Math.min(1, 1 - Math.max(0, s.t) / spinoWindup(s, "spinoDigFling")); if (s.t <= 0) { e.spinoDig = 1; toPhase(s, "active", A.active); } return; }
    if (s.phase === "recover") { e.spinoDig = Math.max(0, s.t / A.recover); e.spinoPose = e.spinoDig > 0 ? "dig" : null; return; }
    if (s.phase !== "active") return;
    const q = spinoQuarry(s, w) || d.target, want = Math.atan2(q.y - e.y, q.x - e.x), cur = Math.atan2(d.aim.y, d.aim.x), diff = ((want - cur) % TAU + TAU * 1.5) % TAU - Math.PI, a = cur + Math.max(-D.turn * w.dt, Math.min(D.turn * w.dt, diff));
    d.aim = { x: Math.cos(a), y: Math.sin(a) }; spinoFace(e, d.aim); s.tele = { type: "arc", aim: d.aim, radius: D.range, arc: D.arc }; e.spinoDig = 1;
    d.next -= w.dt; d.flung -= w.dt; e.spinoPose = d.flung > 0 ? "fling" : "dig";
    if (d.next <= 0 && d.volley < D.volleys) {
      const dmg = Math.max(1, Math.ceil(damageOf(e, "spinoDigFling"))), life = D.range / D.speed;
      for (let i = 0; i < D.rocks; i++) {
        if (spinoFxCount(w, e.id, "spinoRock") >= D.cap) break;
        const r = a + (D.rocks > 1 ? i / (D.rocks - 1) - .5 : 0) * D.arc * Math.PI / 180 * .9, ox = e.x + d.aim.x * bodyRadius(e), oy = e.y + d.aim.y * bodyRadius(e);
        w.addEffect({ kind: "spinoRock", owner: e.id, x: ox, y: oy, vx: Math.cos(r) * D.speed, vy: Math.sin(r) * D.speed, radius: D.radius, arming: 0, life, total: life, damage: dmg });
      }
      d.volley++; d.next = D.every; d.flung = D.flingPose; e.spinoPose = "fling";
    }
    if (d.volley >= D.volleys && d.next <= 0 || s.t <= 0) { s.tele = null; e.spinoPose = "dig"; toPhase(s, "recover", A.recover); }
  },
  spinoRoar(e, s, w) {
    const A = ATTACK_MODULES.spinoRoar, R = SPINO.roar, d = s.data;
    if (s.phase === "windup") { e.spinoPose = "roarReady"; if (s.t <= 0) toPhase(s, "active", A.active); return; }
    if (s.phase !== "active") return;
    e.spinoPose = "roar"; d.next -= w.dt;
    if (d.next <= 0 && d.n < R.hits) {
      if (d.n === 0) w.shake?.(R.shake, R.shakeSeconds);
      w.addEffect({ kind: "shock", owner: e.id, x: e.x, y: e.y, radius: R.radius, arming: 0, life: .5, damage: 0, stone: true });
      spinoStrike(e, s, w, "spinoRoar", (t) => distance(t, e) <= R.radius, { share: R.share, piercing: true, beam: true, cover: true });
      d.n++; d.next = R.every;
    }
    if (d.n >= R.hits && d.next <= 0 || s.t <= 0) { s.tele = null; toPhase(s, "recover", A.recover); }
  },
  spinoTailSwipe(e, s, w) {
    const A = ATTACK_MODULES.spinoTailSwipe, T = SPINO.tail, d = s.data;
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", A.active); return; }
    if (s.phase !== "active") return;
    d.next -= w.dt;
    if (d.next <= 0 && d.n < T.swings) {
      const back = spinoBack(e), reach = bodyRadius(e) + T.reach; s.tele = { type: "arc", aim: back, radius: reach, arc: T.arc }; e.spinoPose = d.n % 2 ? "tailR" : "tailL";
      spinoStrike(e, s, w, "spinoTailSwipe", (t) => inArc(e, t, back, reach, T.arc)); d.n++; d.next = T.every;
    }
    if (d.n >= T.swings && d.next <= 0 || s.t <= 0) { s.tele = null; e.spinoPose = null; toPhase(s, "recover", A.recover); }
  },
  spinoBodySlam(e, s, w) {
    const A = ATTACK_MODULES.spinoBodySlam, B = SPINO.body, d = s.data;
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", A.active); return; }
    if (s.phase === "recover") { e.spinoAir = 0; return; }
    if (s.phase !== "active" || d.landed) return;
    if (d.stage === "run") {
      const q = spinoQuarry(s, w) || d.target; d.aim = unit(q.x - e.x, q.y - e.y); spinoFace(e, d.aim); e.spinoPose = "run";
      const step = B.speed * (e.speedMultiplier || 1) * w.dt, near = distance(q, e) <= B.lungeAt + bodyRadius(e); d.left -= w.dt;
      if (!near) w.move(e, d.aim.x * step, d.aim.y * step);
      s.tele = { type: "lane", aim: d.aim, length: rayLength(w, e, d.aim, Math.min(distance(q, e) + B.radius, B.max + B.lungeAt)), width: bodyRadius(e) * 1.6 };
      if (near || d.left <= 0) { d.stage = "lunge"; d.from = { x: e.x, y: e.y }; d.to = spinoLanding(e, w, spinoReach(e, q, B.max)); d.left = B.lunge; e.aloft = true; e.spinoPose = "lunge"; s.tele = { type: "circle", x: d.to.x, y: d.to.y, radius: B.radius, total: B.lunge }; }
      return;
    }
    d.left -= w.dt; const k = Math.min(1, 1 - Math.max(0, d.left) / B.lunge);
    e.x = d.from.x + (d.to.x - d.from.x) * k; e.y = d.from.y + (d.to.y - d.from.y) * k; e.spinoAir = Math.sin(Math.PI * k) * B.height; e.spinoPose = "lunge";
    if (d.left > 0) return;
    d.landed = true; e.x = d.to.x; e.y = d.to.y; e.spinoAir = 0; e.aloft = false; e.spinoPose = "landBite"; s.tele = null;
    spinoStrike(e, s, w, "spinoBodySlam", (t) => distance(t, d.to) <= B.radius + .2, { bleed: true, bite: true });
    toPhase(s, "recover", A.recover);
  },
  spinoGrab(e, s, w) {
    const A = ATTACK_MODULES.spinoGrab, G = SPINO.grab, d = s.data, who = d.prey || "player", total = spinoWindup(s, "spinoGrab");
    if (s.phase === "windup") {
      const q = spinoQuarry(s, w) || d.target;
      if (s.t > G.lockAt) { const k = Math.min(1, w.dt * G.follow); d.mark = spinoReach(e, { x: d.mark.x + (q.x - d.mark.x) * k, y: d.mark.y + (q.y - d.mark.y) * k }, G.markMax + bodyRadius(e)); } else s.tele.locked = true;
      s.tele.x = d.mark.x; s.tele.y = d.mark.y; spinoFace(e, unit(d.mark.x - e.x, d.mark.y - e.y)); e.spinoPose = "grabTrack";
      e.spinoGrab = { who, phase: "track", t: Math.max(0, Math.min(1, 1 - s.t / total)), x: d.mark.x, y: d.mark.y, k: 0 };
      if (s.t <= 0) { const dir = unit(d.mark.x - e.x, d.mark.y - e.y), stand = Math.max(0, distance(d.mark, e) - bodyRadius(e) - G.reach);
        Object.assign(d, { stage: "lunge", left: G.lunge, from: { x: e.x, y: e.y }, to: spinoLanding(e, w, { x: e.x + dir.x * stand, y: e.y + dir.y * stand }) });
        e.spinoPose = "grabLunge"; e.spinoGrab = { who, phase: "lunge", t: 0, x: d.mark.x, y: d.mark.y, k: 0 }; toPhase(s, "active", A.active); }
      return;
    }
    if (s.phase === "recover") { e.spinoGrab = null; return; }
    if (s.phase !== "active") return;
    d.left -= w.dt;
    if (d.stage === "lunge") {
      const k = Math.min(1, 1 - Math.max(0, d.left) / G.lunge); e.x = d.from.x + (d.to.x - d.from.x) * k; e.y = d.from.y + (d.to.y - d.from.y) * k; e.spinoGrab = { who, phase: "lunge", t: k, x: d.mark.x, y: d.mark.y, k };
      if (d.left > 0) return;
      s.tele = null; const prey = spinoPreyAlive(w, d.prey);
      if (d.prey ? prey && distance(prey, d.mark) <= G.radius + bodyRadius(prey) * .5 : distance(center(w.player), d.mark) <= G.radius && (!w.los || w.los(e, w.player)) && w.spinoHold?.(e, G.hold + G.throwTime + G.slack)) {
        if (prey) { prey.spinoHeldBy = e.id; if (prey.pack?.attack) endAttack(prey, prey.pack); }
        const hold = prey ? G.creatureHold : G.hold, chews = prey ? G.creatureChews : G.chews;
        Object.assign(d, { stage: "hold", left: hold, hold, chews, n: 0, next: hold / (chews + 1) }); s.spinoHolding = who; e.spinoPose = "grabHold";
        if (!prey) w.say?.(SPINO.text.grabbed);
      } else { e.spinoGrab = null; e.spinoPose = null; toPhase(s, "recover", A.recover); }
      return;
    }
    const h = spinoHeading(e), mouth = { x: e.x + h.x * (bodyRadius(e) + G.reach * .6), y: e.y + h.y * (bodyRadius(e) + G.reach * .6) }, prey = d.prey ? spinoPreyAlive(w, d.prey) : null;
    if (d.stage === "hold") {
      e.spinoPose = "grabHold"; e.spinoGrab = { who, phase: "hold", t: Math.max(0, Math.min(1, 1 - d.left / d.hold)) };
      if (d.prey) { if (!prey) d.left = 0; else { prey.x = mouth.x; prey.y = mouth.y; } }
      else if (!w.held?.(e)) d.left = 0; else w.carry?.(mouth.x, mouth.y, G.lift);
      d.next -= w.dt;
      if (d.next <= 0 && d.n < d.chews && d.left > 0) { d.n++; d.next = d.hold / (d.chews + 1);
        if (prey) { spinoWound(w, e, prey, spinoPreyBlow(prey, Math.ceil(damageOf(e, "spinoGrab") * G.chewShare))); spinoBleedCreature(prey); }
        else if (w.hurt(e, Math.max(1, Math.ceil(damageOf(e, "spinoGrab") * G.chewShare)), { jumpable: false, source: "spinoGrab", piercing: true, beam: true })) { w.bleed?.(e); w.biteMark?.(e); } }
      if (d.left > 0) return;
      d.stage = "throw"; d.left = G.throwTime; e.spinoPose = "grabThrow"; e.spinoGrab = { who, phase: "throw", t: 0 };
      const dir = unit(h.x - h.y * G.throwTurn, h.y + h.x * G.throwTurn);
      if (d.prey) { if (prey) { delete prey.spinoHeldBy; for (let i = 0; i < 8; i++) if (!w.move(prey, dir.x * G.throw / 8, dir.y * G.throw / 8)) break; spinoWound(w, e, prey, spinoPreyBlow(prey, Math.ceil(damageOf(e, "spinoGrab") * G.throwShare))); } }
      else if (w.held?.(e)) { w.release?.(e); w.throwPlayer?.(e, dir, G.throw); w.hurt(e, Math.max(1, Math.ceil(damageOf(e, "spinoGrab") * G.throwShare)), { jumpable: false, source: "spinoGrab", piercing: true, beam: true }); }
      s.spinoHolding = null; return;
    }
    e.spinoGrab = { who, phase: "throw", t: Math.max(0, Math.min(1, 1 - d.left / G.throwTime)) };
    if (d.left <= 0 || s.t <= 0) { e.spinoGrab = null; toPhase(s, "recover", A.recover); }
  },
  spinoBoneVolley(e, s, w) {
    const A = ATTACK_MODULES.spinoBoneVolley, B = SPINO.bones;
    if (s.phase === "windup") {
      e.spinoPose = "boneLaunch"; if (s.t > 0) return;
      const h = spinoHeading(e), base = Math.atan2(h.y, h.x), dmg = damageOf(e, "spinoBoneVolley");
      for (let i = 0; i < B.count; i++) {
        if (spinoFxCount(w, e.id, "spinoBone") >= B.cap) break;
        const a = base + (i - (B.count - 1) / 2) * B.fan, arm = B.rise + i * B.stagger;
        w.addEffect({ kind: "spinoBone", owner: e.id, x: e.x, y: e.y, vx: Math.cos(a) * B.speed, vy: Math.sin(a) * B.speed, radius: B.radius, arming: arm, armTotal: arm, life: B.life, total: B.life, damage: dmg, burst: B.burst, burstDamage: Math.max(1, Math.ceil(dmg * B.burstShare)) });
      }
      s.tele = null; toPhase(s, "active", A.active); return;
    }
    if (s.phase === "active") { e.spinoPose = "boneLaunch"; if (s.t <= 0) { e.spinoPose = null; toPhase(s, "recover", A.recover); } }
  },
  spinoRibSpears(e, s, w) {
    const A = ATTACK_MODULES.spinoRibSpears, R = SPINO.ribs, d = s.data, h = spinoHeading(e), side = { x: -h.y, y: h.x }, r = bodyRadius(e);
    const tips = [1, -1].map((k) => ({ x: e.x + side.x * k * (r + R.side), y: e.y + side.y * k * (r + R.side) })), roots = [1, -1].map((k) => ({ x: e.x + side.x * k * r, y: e.y + side.y * k * r }));
    if (s.phase === "windup") {
      if (s.t > 0) return;
      e.spinoPose = "ribsOut"; spinoStrike(e, s, w, "spinoRibSpears", (t) => Math.min(segmentDistance(t, roots[0], tips[0]), segmentDistance(t, roots[1], tips[1])) <= R.width, { share: R.outShare });
      d.left = R.thrust; s.tele = { type: "arc", aim: { x: h.x, y: h.y }, radius: r + Math.max(R.reach, R.side), arc: R.inArc }; toPhase(s, "active", A.active); return;
    }
    if (s.phase !== "active" || d.thrust) return;
    d.left -= w.dt; if (d.left > 0 && s.t > 0) return;
    d.thrust = true; e.spinoPose = "ribsThrust"; s.tele = null;
    const point = { x: e.x + h.x * (r + R.reach), y: e.y + h.y * (r + R.reach) };
    spinoStrike(e, s, w, "spinoRibSpears", (t) => inTriangle(t, tips[0], tips[1], point) || Math.min(segmentDistance(t, tips[0], point), segmentDistance(t, tips[1], point)) <= R.width); // they sweep in over everything between them
    toPhase(s, "recover", A.recover);
  },
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
    if (s.phase === "windup") { if (s.t <= 0) { s.data.away = unit(e.x - p.x, e.y - p.y); s.data.aim = unit(p.x - e.x, p.y - e.y); if (s.tele) s.tele.aim = s.data.aim; toPhase(s, "active", attack.active); } return; }
    if (s.phase !== "active") { s.tele = null; return; }
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
  demonCleave(e, s, w) { if (s.phase === "windup" && s.t <= 0) { resolveMelee(e, s, w, "demonCleave", (p) => inArc(e, p, s.data.aim, bodyRadius(e) + 1.8 + .3, 170)); s.tele = null; toPhase(s, "recover", ATTACK_MODULES.demonCleave.recover); } },
  stoneSlam(e, s, w) {
    if (s.phase === "windup" && s.t <= 0) { const R = COLOSSUS.slam.radius; if (distance(center(w.player), e) <= R + .3) w.hurt(e, damageOf(e, "stoneSlam"), { jumpable: true, source: "stoneSlam" });
      w.addEffect({ kind: "dust", owner: e.id, x: e.x, y: e.y, radius: R, arming: 0, life: .55, damage: 0 }); s.tele = null; toPhase(s, "recover", ATTACK_MODULES.stoneSlam.recover); }
  },
  // The Heart Lamp: the aim line follows (turning at most COLOSSUS.laser.turn a second), then holds and flashes for `lock`, then fires once.
  chestLaser(e, s, w) {
    const A = ATTACK_MODULES.chestLaser, L = COLOSSUS.laser, p = center(w.player);
    if (s.phase === "windup") {
      s.data.total ??= Math.max(s.t + w.dt, L.lock);
      if (s.t > L.lock) { const want = Math.atan2(p.y - e.y, p.x - e.x); let d = want - s.data.angle; d = Math.atan2(Math.sin(d), Math.cos(d)); const m = L.turn * w.dt; s.data.angle += Math.max(-m, Math.min(m, d)); }
      const dir = { x: Math.cos(s.data.angle), y: Math.sin(s.data.angle) };
      s.tele = { type: "laser", angle: s.data.angle, length: rayLength(w, e, dir, L.reach), charge: Math.max(0, Math.min(1, 1 - s.t / s.data.total)), locked: s.t <= L.lock, chest: L.chest };
      if (s.t <= 0) toPhase(s, "active", A.active);
      return;
    }
    if (s.phase === "active") {
      const dir = { x: Math.cos(s.data.angle), y: Math.sin(s.data.angle) }, len = rayLength(w, e, dir, L.reach);
      if (!s.data.fired) { s.data.fired = true; if (segmentDistance(p, e, { x: e.x + dir.x * len, y: e.y + dir.y * len }) <= L.width) w.hurt(e, damageOf(e, "chestLaser"), { jumpable: false, source: "chestLaser", beam: true }); }
      s.tele = { type: "beam", angle: s.data.angle, length: len, charging: false, laser: true, chest: L.chest };
      if (s.t <= 0) { s.tele = null; toPhase(s, "recover", A.recover); }
    }
  },
  wispBewilder(e, s, w) { hauntConfuse(e, s, w, "wispBewilder", HAUNT.confuse.wisp, HAUNT.curse.lay.wisp); }, // release 731; 737: curses
  gorgeHowl(e, s, w) { hauntConfuse(e, s, w, "gorgeHowl", HAUNT.confuse.gorge, HAUNT.curse.lay.gorge); },
  vastRake(e, s, w) { if (s.phase === "windup" && s.t <= 0) { resolveMelee(e, s, w, "vastRake", (p) => inArc(e, p, s.data.aim, bodyRadius(e) + 1.7 + .3, 160)); s.tele = null; toPhase(s, "recover", ATTACK_MODULES.vastRake.recover); } },
  vastWail(e, s, w) { hauntConfuse(e, s, w, "vastWail", GLOOM_FINALE.confuse.wail, GLOOM_FINALE.curse.wail); },
  vastGloomfall(e, s) { if (s.phase === "windup" && s.t <= 0) toPhase(s, "recover", ATTACK_MODULES.vastGloomfall.recover); },
  vastLights(e, s, w) {
    if (s.phase === "windup" && s.t <= 0) { const L = GLOOM_FINALE.lights, a0 = Math.atan2(s.data.aim.y, s.data.aim.x), dmg = damageOf(e, "vastLights");
      for (let i = 0; i < L.count; i++) { const a = a0 + (i - (L.count - 1) / 2) * .5; w.addEffect({ kind: "gloomMote", owner: e.id, x: e.x, y: e.y, vx: Math.cos(a) * L.speed, vy: Math.sin(a) * L.speed, radius: L.radius, home: L.home, turn: L.turn, arming: 0, life: L.life, total: L.life, damage: dmg, curse: GLOOM_FINALE.curse.lights }); }
      s.tele = null; toPhase(s, "recover", ATTACK_MODULES.vastLights.recover); }
  },
  vastPlunge(e, s, w) { chargeThrough(e, s, w, "vastPlunge"); },
  vastDark(e, s, w) { if (s.phase === "windup" && s.t <= 0) { s.tele = null; if (!e.gloomDark) gloomDarkBegin(e, w); toPhase(s, "recover", ATTACK_MODULES.vastDark.recover); } },
  shadeTouch(e, s, w) { if (s.phase === "windup" && s.t <= 0) { const p = center(w.player); if (inArc(e, p, s.data.aim, bodyRadius(e) + 1.1 + .3, 120) && w.hurt(e, damageOf(e, "shadeTouch"), { jumpable: false, source: "shadeTouch" })) w.curse?.(e, GLOOM_FINALE.curse.touch); s.tele = null; toPhase(s, "recover", ATTACK_MODULES.shadeTouch.recover); } },
  shadePuff(e, s, w) { hauntConfuse(e, s, w, "shadePuff", 0, GLOOM_FINALE.curse.puff); },
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
    const mine = w.enemies.filter((q) => !q.dead && q.wormOf === e.id);
    if (!s.data.spots.length && mine.length >= WORM.tentaclesMax) { // release 664: at the limit, the cast moves the field it has
      for (const q of mine) if (!q.tentPhase) { const [lo, hi] = WORM.repositionUnder; q.tentPhase = "sinking"; q.underFor = lo + (hashSeed(`${q.id}:moved:${s.seq}`) % 100) / 100 * (hi - lo); if (q.pack) q.pack.tele = null; }
    }
    let lit = mine.filter((q) => q.tentacleMode === "laser").length;
    for (const spot of s.data.spots) {
      if (mine.length + 1 > WORM.tentaclesMax) break;
      let mode = WORM.tentacleModes[((Number(e.wormCasts) || 0) * WORM.fieldTentacles + spot.i) % WORM.tentacleModes.length];
      if (mode === "laser" && lit >= WORM.lasersMax) mode = "fire";
      const c = w.spawnMinion?.(e, "wormTentacle", spot.x, spot.y, spot.i);
      if (c) { Object.assign(c, { wormOf: e.id, bornAt: w.now, tentacleMode: mode }, tentacleStats(e)); mine.push(c); if (mode === "laser") lit++; }
    }
    e.wormCasts = (Number(e.wormCasts) || 0) + 1;
    s.tele = null; toPhase(s, "recover", ATTACK_MODULES.wormTentacles.recover);
  },
  // Release 664: fully out of the ground, it swings its whole length round in a wide arc (the arc's sweep drawn as it goes).
  wormSweep(e, s, w) {
    const attack = ATTACK_MODULES.wormSweep;
    if (s.phase === "windup") { if (s.t <= 0) { s.data.swing = 0; toPhase(s, "active", attack.active); } return; }
    if (s.phase !== "active") return;
    s.data.swing = 1 - Math.max(0, s.t) / attack.active;
    const p = center(w.player), a0 = Math.atan2(s.data.aim.y, s.data.aim.x), half = WORM.sweepArc * Math.PI / 360, at = a0 - half + 2 * half * s.data.swing;
    const pa = Math.atan2(p.y - e.y, p.x - e.x), diff = Math.abs(((pa - at) % TAU + TAU * 1.5) % TAU - Math.PI);
    if (!s.hitOnce && distance(p, e) <= WORM.sweepRadius + .3 && (diff <= .45 || distance(p, e) < bodyRadius(e) + .6) && inArc(e, p, s.data.aim, WORM.sweepRadius + .3, WORM.sweepArc + 10)) { s.hitOnce = true; w.hurt(e, damageOf(e, "wormSweep"), { jumpable: false, source: "wormSweep" }); }
    if (s.t <= 0) { s.tele = null; toPhase(s, "recover", attack.recover); }
  },
  // Release 664: it rears up and slams its body down the line; the head bursts the ground where it lands.
  wormSlam(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const p = center(w.player), a = s.data.aim, end = s.data.head, inLane = segmentDistance(p, e, end) <= WORM.slamWidth + .3 && (p.x - e.x) * a.x + (p.y - e.y) * a.y >= -.3;
    if (inLane || distance(p, end) <= WORM.slamBurst + .3) w.hurt(e, damageOf(e, "wormSlam"), { jumpable: false, source: "wormSlam" });
    for (let i = 1; i <= 4; i++) w.addEffect({ kind: "dust", owner: e.id, x: e.x + a.x * WORM.slamLength * i / 4, y: e.y + a.y * WORM.slamLength * i / 4, radius: i === 4 ? WORM.slamBurst : 1, arming: 0, life: .6, damage: 0 });
    s.data.slammed = true; s.tele = null; toPhase(s, "recover", ATTACK_MODULES.wormSlam.recover);
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
  golemPunch(e, s, w) { if (s.phase === "windup" && s.t <= 0) { resolveMelee(e, s, w, "golemPunch", (p) => inArc(e, p, s.data.aim, bodyRadius(e) + 1.2 + .3, 70)); s.tele = null; toPhase(s, "recover", ATTACK_MODULES.golemPunch.recover); } },
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

// ---------------------------------------------------------------- adventure creatures (adventure-creatures.ts; Tim, 2026-11-11)
// Built for tall, open ground. Every number is in ADV; the floor, the levels (`w.elevation`) and the walls come from the pack world.
// Their leaps share one runner: a mark under the Wayfarer (followed for part of the windup, then held) or a found spot (a perch, a
// retreat), a hop drawn as lift (`hopLift`), and the landing. A landing on the Wayfarer hits harder the farther it fell (dropBonus).
function advLeapStart(e, s, w, id) {
  const C = ADV.leaps[id], A = ATTACK_MODULES[id], p = center(w.player);
  s.data.from = { x: e.x, y: e.y }; s.data.fromLift = Number(e.hopLift) || 0; s.data.fromLevel = levelAt(w, e) + (e.advCling ? ADV.perch.clingRise : 0); e.advPose = C.pose;
  if (C.to === "player") { s.data.held = 0; s.tele = { type: "circle", x: p.x, y: p.y, radius: C.radius, total: (A.windup || .5) * (s.paced ? BOSS_PACE.windup : 1) }; return; }
  const spot = C.search === "perch" ? findPerch(e, w, p) : findRetreat(e, w, p, s.seq);
  s.data.spot = spot ? { x: spot.x, y: spot.y, cling: !!(C.cling && spot.cling) } : null;
  s.tele = spot ? { type: "brace" } : null;
}
function advLeapRun(e, s, w, id) {
  const C = ADV.leaps[id], A = ATTACK_MODULES[id], p = center(w.player);
  if (s.phase === "windup") {
    if (C.to === "player" && s.tele) { s.data.held += w.dt; if (s.data.held <= C.track) { const k = Math.min(1, w.dt * 6); s.tele.x += (p.x - s.tele.x) * k; s.tele.y += (p.y - s.tele.y) * k; } else s.tele.locked = true; }
    if (s.t > 0) return;
    const land = C.to === "player" ? s.tele && nearestOpen(w, s.tele.x, s.tele.y, 2.5) : s.data.spot;
    if (!land) { endAttack(e, s); return; }
    s.data.land = { x: land.x, y: land.y }; s.data.cling = C.to === "spot" && !!land.cling;
    s.data.drop = s.data.fromLevel - levelAt(w, land) - (s.data.cling ? ADV.perch.clingRise : 0); // levels fallen (climbed, when negative)
    e.advCling = false; e.advPerched = false; e.aloft = true; toPhase(s, "active", A.active); return;
  }
  if (s.phase !== "active") return;
  const k = 1 - Math.max(0, s.t) / A.active, f = s.data.from, L = s.data.land, climb = Math.max(0, -s.data.drop);
  e.x = f.x + (L.x - f.x) * k; e.y = f.y + (L.y - f.y) * k; if (Math.abs(L.x - f.x) > .05) e.facingX = L.x > f.x ? 1 : -1;
  e.hopLift = s.data.fromLift * (1 - k) + Math.sin(k * Math.PI) * (C.arc + climb * C.climbLift) + (s.data.cling ? k * ADV.perch.clingLift : 0);
  if (s.t > 0) return;
  e.x = L.x; e.y = L.y; e.aloft = false; e.advCling = s.data.cling; e.hopLift = s.data.cling ? ADV.perch.clingLift : 0;
  if (C.damage) {
    if (distance(p, L) <= C.radius + .3) w.hurt(e, Math.max(1, Math.ceil(damageOf(e, id) * (1 + dropBonus(id, s.data.drop)))), { jumpable: !!A.jumpable, source: id });
    w.addEffect({ kind: "dust", owner: e.id, x: L.x, y: L.y, radius: C.radius, arming: 0, life: .45, damage: 0 });
  }
  s.advGround = 0; s.advScan = null; s.tele = null; e.advPose = null; toPhase(s, "recover", A.recover);
}
// Readiness rules (ATTACK_MODULES[id].gate): "above" only from a ledge or a wall above the Wayfarer; "level" never under someone
// standing higher; "perch" only after a while on the ground and with a perch in reach; "retreat" only with somewhere to go.
// Searches are cached on the pack state for ADV.perch.rescan seconds, so a frame costs one lookup.
function advSpot(e, s, w, p, kind) {
  const now = Number(w.now) || 0, c = s.advScan;
  if (c && c.kind === kind && now - c.at < ADV.perch.rescan * 1000) return c.found;
  const found = !!(kind === "perch" ? findPerch(e, w, p) : findRetreat(e, w, p, s.seq));
  s.advScan = { kind, at: now, found }; return found;
}
function advGate(e, s, w, gate) {
  const p = center(w.player);
  if (gate === "above") return !!e.advCling || levelAt(w, e) - levelAt(w, p) >= ADV.perch.minRise;
  if (gate === "level") return levelAt(w, p) - levelAt(w, e) <= ADV.sink.above;
  if (gate === "perch") return !e.advPerched && !e.advCling && (s.advGround || 0) >= ADV.perch.wait && advSpot(e, s, w, p, "perch");
  if (gate === "retreat") return advSpot(e, s, w, p, "retreat");
  return true;
}
// A Gallery Lurker set beside a wall on level ground starts clinging to it (once; after a reload it decides again).
function advInit(e, w) {
  if (!e.advHome) e.advHome = { x: e.x, y: e.y };
  if (e.brain === "perch" && e.advCling == null) { // a percher (Gallery Lurker, Hookhanger)
    const here = levelAt(w, e); let wall = false, ledge = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if (!w.open(e.x + dx, e.y + dy)) wall = true; else if (levelAt(w, { x: e.x + dx, y: e.y + dy }) < here) ledge = true; }
    e.advCling = wall && !ledge; e.hopLift = e.advCling ? ADV.perch.clingLift : 0;
  }
  if (e.kind === "sinkmaw" && e.advBuried == null) e.advBuried = true;
}
function advKiteLift(e, s, dt) {
  const K = ADV.kite, target = s.attack === "glassStrafe" && s.phase !== "recover" ? K.low : s.attack === "diveBomb" ? 0 : K.altitude, now = Number(e.hopLift) || 0;
  e.hopLift = now + Math.max(-K.ease * dt, Math.min(K.ease * dt, target - now));
}
// A loop walked (or flown): toward the current waypoint at `speed` of its movement's pace; at a waypoint, or blocked, on to the next.
function advWalkLoop(e, w, route, K) {
  if (!Array.isArray(e.advLoop) || !e.advLoop.length) { e.advLoop = route(e.id, e.advHome, w); e.advLeg = 0; }
  const leg = (Number(e.advLeg) || 0) % e.advLoop.length, q = e.advLoop[leg], dx = q.x - e.x, dy = q.y - e.y, dd = Math.hypot(dx, dy);
  if (dd <= (K.arrive ?? K.near ?? .6)) { e.advLeg = (leg + 1) % e.advLoop.length; return; }
  const step = Math.min(dd, .82 * K.speed * (MOVEMENT_MODES[e.movement] || MOVEMENT_MODES.walk).speed * (e.speedMultiplier || 1) * w.dt);
  if (!w.move(e, dx / dd * step, dy / dd * step, { phase: false })) e.advLeg = (leg + 1) % e.advLoop.length; // blocked: on to the next point
  e.advHeading = { x: dx / dd, y: dy / dd }; if (Math.abs(dx) > .05) e.facingX = dx > 0 ? 1 : -1;
}
// The Lamplighter sees you close by, or inside its lamp's cone with a clear line.
function advSees(e, w, p, d) {
  const L = ADV.lamp, h = e.advHeading || { x: e.facingX || 1, y: 0 }; if (d < L.near) return true; if (d > L.sight) return false;
  return ((p.x - e.x) * h.x + (p.y - e.y) * h.y) / (d || 1) >= Math.cos(L.cone * Math.PI / 180) && w.los(e, w.player);
}
// The Medusa drifts higher when the Wayfarer stands above it.
function advHoverLift(e, w, p) {
  const M = ADV.medusa, target = M.altitude + Math.min(M.maxLift, Math.max(0, levelAt(w, p) - levelAt(w, e)) * M.perLevel), now = Number(e.hopLift) || 0;
  e.hopLift = now + Math.max(-M.ease * w.dt, Math.min(M.ease * w.dt, target - now));
}
// Not yet roused: the Kite flies its loop, the Lamplighter walks its beat; the Sinkmaw lies buried; the Medusa drifts; the percher and
// the keepers hold still. The Leaper and the Glider wander.
function advIdle(e, s, w) {
  advInit(e, w);
  if (e.kind === "cinderKite") { advKiteLift(e, s, w.dt); advWalkLoop(e, w, kiteLoop, ADV.kite); return true; }
  if (e.kind === "lamplighter") { advWalkLoop(e, w, lampLoop, ADV.lamp); return true; }
  if (e.kind === "spindriftMedusa") { advHoverLift(e, w, center(w.player)); return true; }
  if (e.kind === "sinkmaw") { e.untargetable = !!e.advBuried; return true; }
  return e.kind !== "vinehookLeaper" && e.kind !== "lakeGlider";
}
// Roused, each frame before it moves or picks an attack. True when it is done for this frame.
function advTick(e, s, w, p, d) {
  advInit(e, w);
  if (e.brain === "perch") {
    e.advPerched = !s.attack && (!!e.advCling || levelAt(w, e) - levelAt(w, p) >= ADV.perch.minRise);
    if (!s.attack) s.advGround = e.advPerched ? 0 : (s.advGround || 0) + w.dt;
  } else if (e.kind === "sinkmaw") {
    if (!s.attack && !e.advBuried) { s.advUp = (s.advUp || 0) + w.dt; if (s.advUp >= ADV.sink.rebury && d >= ADV.sink.clear) { e.advBuried = true; s.advUp = 0; } }
    if (e.advBuried) e.untargetable = true;
  } else if (e.kind === "spindriftMedusa") advHoverLift(e, w, p);
  else if (e.kind === "cinderKite") {
    advKiteLift(e, s, w.dt);
    const H = e.advHome; if (!s.attack && Math.hypot(e.x - H.x, e.y - H.y) > ADV.kite.leash) { e.aggro = false; return true; } // back to its loop
  }
  return false;
}
// Holding its place this frame: a percher on its ledge, a Sinkmaw under the sand.
const advHold = (e) => !!(e.advPerched || e.advBuried);
Object.assign(START, {
  ledgeDrop(e, s, w) { advLeapStart(e, s, w, "ledgeDrop"); },
  ledgeClimb(e, s, w) { advLeapStart(e, s, w, "ledgeClimb"); },
  vineVault(e, s, w) { advLeapStart(e, s, w, "vineVault"); },
  vineRetreat(e, s, w) { advLeapStart(e, s, w, "vineRetreat"); },
  censerLob(e, s, w) { const p = s.data.target, v = playerVelocity(w), C = ADV.censer; s.data.pots = [{ x: p.x, y: p.y }, { x: p.x + v.x * C.lead, y: p.y + v.y * C.lead }]; s.tele = { type: "spit", target: { ...p } }; e.advPose = "swing"; },
  thornDarts(e, s, w) {
    const D = ADV.darts, base = Math.atan2(s.data.aim.y, s.data.aim.x); s.data.reach = D.reach + heightReach("thornDarts", levelAt(w, e) - levelAt(w, w.player));
    s.data.dirs = Array.from({ length: D.count }, (_, i) => { const a = base + (i - (D.count - 1) / 2) * D.spread; return { x: Math.cos(a), y: Math.sin(a) }; });
    s.tele = { type: "tendrils", dirs: s.data.dirs, length: s.data.reach, width: D.width }; e.advPose = "open";
  },
  sinkFunnel(e, s) { s.tele = { type: "ring", radius: ADV.sink.radius, inhale: true }; e.advPose = "open"; },
  glassStrafe(e, s, w) {
    const K = ADV.kite, a = s.data.aim, end = { x: Math.max(0, Math.min((w.width || 32) - 1, e.x + a.x * K.lane)), y: Math.max(0, Math.min((w.height || 32) - 1, e.y + a.y * K.lane)) };
    s.data.from = { x: e.x, y: e.y }; s.data.end = end; s.data.dropped = 0; s.tele = { type: "lane", aim: a, length: Math.hypot(end.x - e.x, end.y - e.y), width: K.width }; e.advPose = "bank";
  },
});
Object.assign(RUN, {
  ledgeDrop(e, s, w) { advLeapRun(e, s, w, "ledgeDrop"); },
  ledgeClimb(e, s, w) { advLeapRun(e, s, w, "ledgeClimb"); },
  vineVault(e, s, w) { advLeapRun(e, s, w, "vineVault"); },
  vineRetreat(e, s, w) { advLeapRun(e, s, w, "vineRetreat"); },
  censerLob(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const C = ADV.censer; s.data.pots.forEach((q, i) => { const at = nearestOpen(w, q.x, q.y, 1.5); if (at) w.addEffect({ kind: "censerPot", owner: e.id, x: at.x, y: at.y, radius: C.radius, arming: C.arming[i] ?? C.arming[0], damage: damageOf(e, "censerLob"), jumpable: true, from: { x: e.x, y: e.y } }); });
    s.tele = null; e.advPose = null; toPhase(s, "recover", ATTACK_MODULES.censerLob.recover);
  },
  thornDarts(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const D = ADV.darts; let live = voidEffects(w).filter((f) => f.kind === "thornDart" && f.owner === e.id && f.life > 0).length;
    for (const dir of s.data.dirs) { if (live >= D.cap) break; live++; w.addEffect({ kind: "thornDart", owner: e.id, x: e.x, y: e.y, vx: dir.x * D.speed, vy: dir.y * D.speed, radius: D.radius, arming: 0, life: s.data.reach / D.speed, total: s.data.reach / D.speed, damage: damageOf(e, "thornDarts") }); }
    s.tele = null; e.advPose = null; toPhase(s, "recover", ATTACK_MODULES.thornDarts.recover);
  },
  sinkFunnel(e, s, w) {
    const A = ATTACK_MODULES.sinkFunnel, C = ADV.sink, p = center(w.player), reach = levelAt(w, p) - levelAt(w, e) <= C.above;
    if (s.phase === "windup") { if (s.t <= 0) { e.advBuried = false; e.hidden = false; e.untargetable = false; s.advUp = 0; toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active") return;
    if (reach) w.pull?.(e, C.pull * w.dt, C.radius);
    if (reach && !s.hitOnce && distance(p, e) <= bodyRadius(e) + C.bite) { s.hitOnce = true; w.hurt(e, damageOf(e, "sinkFunnel"), { jumpable: false, source: "sinkFunnel" }); }
    if (s.t <= 0) { s.tele = null; e.advPose = null; toPhase(s, "recover", A.recover); }
  },
  glassStrafe(e, s, w) {
    const A = ATTACK_MODULES.glassStrafe, K = ADV.kite;
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", A.active); return; }
    if (s.phase !== "active") return;
    const k = 1 - Math.max(0, s.t) / A.active, f = s.data.from, E = s.data.end, nx = f.x + (E.x - f.x) * k, ny = f.y + (E.y - f.y) * k;
    if (w.open(nx, ny)) { e.x = nx; e.y = ny; } // a wall ends its run where it stands
    while (s.data.dropped < K.shards && k >= (s.data.dropped + .5) / K.shards) { w.addEffect({ kind: "glassShard", owner: e.id, x: e.x, y: e.y, radius: K.shardRadius, arming: K.arming + s.data.dropped * K.step, damage: damageOf(e, "glassStrafe"), jumpable: true }); s.data.dropped++; }
    if (s.t <= 0) { s.tele = null; e.advPose = null; toPhase(s, "recover", A.recover); }
  },
});

// ---- the second set (Tim, 2026-11-11: the other four themes). Lob, ring, rain, lane, rake, swing, pour: every one marked first.
const pctr = (e) => ({ x: e.x, y: e.y });
function advReachOf(e, w, id) { return heightReach(id, levelAt(w, e) - levelAt(w, w.player)); }
// The Glider's rake, one step: along its aim; a wall turns it (once per ADV.glide.rebounds) or ends the run; it leaves slicks behind.
function glideStep(e, s, w, step) {
  const G = ADV.glide, a = s.data.aim, nx = e.x + a.x * step, ny = e.y + a.y * step;
  if (w.open(nx, ny)) { e.x = nx; e.y = ny; s.data.run += step; }
  else if (s.data.rebounds > 0) {
    const bx = !w.open(e.x + a.x * step, e.y), by = !w.open(e.x, e.y + a.y * step); s.data.rebounds--;
    s.data.aim = { x: bx || !by ? -a.x : a.x, y: by || !bx ? -a.y : a.y }; s.tele = { type: "lane", aim: s.data.aim, length: rayLength(w, e, s.data.aim, Math.max(.5, G.length - s.data.run)), width: G.width };
  } else return false;
  if (s.data.slicks < G.slicks && s.data.run >= (s.data.slicks + .5) * G.length / G.slicks) { const S = ADV.icicles.slick; w.addEffect({ kind: "iceSlick", owner: e.id, x: e.x, y: e.y, radius: S.radius, arming: 0, life: S.life, total: S.life, damage: 0, slow: S.slow }); s.data.slicks++; }
  return true;
}
Object.assign(START, {
  phaseStep(e, s, w) { advLeapStart(e, s, w, "phaseStep"); },
  poleThrust(e, s) { s.tele = { type: "rect", aim: s.data.aim, length: 3.2, width: .45 }; e.advPose = "thrust"; },
  prismBeam(e, s, w) { START.sweepBeam(e, s, w); }, // the Prism Stilt's own module, the Sweeping Beam's shape
  heavySweep(e, s) { s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + 1.5, arc: 130 }; },
  lampFlare(e, s) { s.tele = { type: "spit", target: { ...s.data.target } }; e.advPose = "throw"; },
  bellToll(e, s, w) { s.data.radius = ADV.toll.radius + advReachOf(e, w, "bellToll"); s.tele = { type: "ring", radius: s.data.radius }; e.advPose = "raise"; },
  tendrilRain(e, s, w) {
    const M = ADV.medusa, p = s.data.target, v = playerVelocity(w), side = hashSeed(`${e.id}:${s.seq}:tendrils`) % 2 ? 1 : -1, a = unit(p.x - e.x, p.y - e.y);
    s.data.marks = [{ x: p.x, y: p.y }, { x: p.x + v.x * M.lead, y: p.y + v.y * M.lead }, { x: p.x - a.y * side * M.spread, y: p.y + a.x * side * M.spread }].slice(0, M.count); s.tele = { type: "spit", target: { ...p } }; e.advPose = "swell";
  },
  membranePulse(e, s) { s.tele = { type: "ring", radius: ADV.medusa.pulse }; e.advPose = "swell"; },
  icicleLine(e, s, w) { const I = ADV.icicles, a = s.data.aim; s.data.len = rayLength(w, e, a, I.reach + advReachOf(e, w, "icicleLine")); s.tele = { type: "lane", aim: a, length: s.data.len, width: I.width }; e.advPose = "raise"; },
  glideRake(e, s, w) { const G = ADV.glide, a = s.data.aim; Object.assign(s.data, { run: 0, slicks: 0, rebounds: G.rebounds }); s.tele = { type: "lane", aim: a, length: rayLength(w, e, a, G.length), width: G.width }; e.advPose = "crouch"; },
  pendulumSwing(e, s, w) {
    const P = ADV.pendulum, p = s.data.target, a = s.data.aim, far = { x: p.x + a.x * P.over, y: p.y + a.y * P.over }, to = (w.open(far.x, far.y) ? far : nearestOpen(w, far.x, far.y, 1.5)) || nearestOpen(w, p.x, p.y, 2) || pctr(e);
    Object.assign(s.data, { from: pctr(e), to, fromLift: Number(e.hopLift) || 0 }); s.tele = { type: "lane", aim: a, length: Math.hypot(to.x - e.x, to.y - e.y), width: P.width }; e.advPose = "lean";
  },
  slagPour(e, s) { s.tele = { type: "spit", target: { ...s.data.target } }; e.advPose = "tip"; },
});
Object.assign(RUN, {
  phaseStep(e, s, w) { advLeapRun(e, s, w, "phaseStep"); },
  poleThrust(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return; const a = s.data.aim;
    resolveMelee(e, s, w, "poleThrust", (p) => { const dx = p.x - e.x, dy = p.y - e.y, f = dx * a.x + dy * a.y, l = Math.abs(dx * a.y - dy * a.x); return f >= -.2 && f <= 3.5 && l <= .45 + .35; });
    s.tele = null; e.advPose = null; toPhase(s, "recover", ATTACK_MODULES.poleThrust.recover);
  },
  prismBeam(e, s, w) {
    const A = ATTACK_MODULES.prismBeam;
    if (s.phase === "windup") { if (s.t <= 0) { toPhase(s, "active", A.active); s.data.total = s.t; s.tele.charging = false; } return; }
    if (s.phase !== "active") return;
    const k = 1 - Math.max(0, s.t) / s.data.total; s.data.angle = s.data.from + (s.data.to - s.data.from) * k;
    const dir = { x: Math.cos(s.data.angle), y: Math.sin(s.data.angle) }, len = rayLength(w, e, dir, 8); s.tele = { type: "beam", angle: s.data.angle, length: len, charging: false }; s.data.tick -= w.dt;
    if (s.data.tick <= 0 && segmentDistance(center(w.player), e, { x: e.x + dir.x * len, y: e.y + dir.y * len }) <= .55) { w.hurt(e, damageOf(e, "prismBeam"), { jumpable: false, source: "prismBeam", beam: true }); s.data.tick = .32; }
    if (s.t <= 0) { s.tele = null; toPhase(s, "recover", A.recover); }
  },
  heavySweep(e, s, w) { if (s.phase === "windup" && s.t <= 0) { resolveMelee(e, s, w, "heavySweep", (p) => inArc(e, p, s.data.aim, bodyRadius(e) + 1.5 + .3, 130)); s.tele = null; toPhase(s, "recover", ATTACK_MODULES.heavySweep.recover); } },
  lampFlare(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const L = ADV.lamp, at = nearestOpen(w, s.data.target.x, s.data.target.y, 1.5);
    if (at) w.addEffect({ kind: "censerPot", lamp: true, owner: e.id, x: at.x, y: at.y, radius: L.radius2, arming: L.arming, damage: damageOf(e, "lampFlare"), jumpable: true, from: pctr(e), fire: { radius: L.fire.radius, life: L.fire.life, damage: Math.max(1, Math.ceil(e.damage * L.fire.bite)) } });
    s.tele = null; e.advPose = null; toPhase(s, "recover", ATTACK_MODULES.lampFlare.recover);
  },
  bellToll(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const T = ADV.toll, top = levelAt(w, e); for (let i = 0; i < T.rings; i++) w.addEffect({ kind: "tollRing", owner: e.id, x: e.x, y: e.y, radius: s.data.radius, arming: i * T.every, life: T.life, total: T.life, damage: damageOf(e, "bellToll"), jumpable: true, maxLevel: top });
    s.tele = null; e.advPose = null; toPhase(s, "recover", ATTACK_MODULES.bellToll.recover);
  },
  tendrilRain(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const M = ADV.medusa; s.data.marks.forEach((q, i) => { const at = nearestOpen(w, q.x, q.y, 1); if (at) w.addEffect({ kind: "tendrilFall", owner: e.id, x: at.x, y: at.y, radius: M.radius, arming: M.arming + i * M.step, damage: damageOf(e, "tendrilRain") }); });
    s.tele = null; e.advPose = null; toPhase(s, "recover", ATTACK_MODULES.tendrilRain.recover);
  },
  membranePulse(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    if (distance(center(w.player), e) <= ADV.medusa.pulse + .3) w.hurt(e, damageOf(e, "membranePulse"), { jumpable: false, source: "membranePulse" });
    w.addEffect({ kind: "dust", owner: e.id, x: e.x, y: e.y, radius: ADV.medusa.pulse, arming: 0, life: .4, damage: 0 }); s.tele = null; e.advPose = null; toPhase(s, "recover", ATTACK_MODULES.membranePulse.recover);
  },
  icicleLine(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const I = ADV.icicles, a = s.data.aim; for (let i = 0; i < I.count; i++) { const k = (i + 1) / I.count, q = { x: e.x + a.x * s.data.len * k, y: e.y + a.y * s.data.len * k }; if (w.open(q.x, q.y)) w.addEffect({ kind: "icicle", owner: e.id, x: q.x, y: q.y, radius: I.radius, arming: I.arming + i * I.step, damage: damageOf(e, "icicleLine"), jumpable: true }); }
    s.tele = null; e.advPose = null; toPhase(s, "recover", ATTACK_MODULES.icicleLine.recover);
  },
  glideRake(e, s, w) {
    const A = ATTACK_MODULES.glideRake, G = ADV.glide;
    if (s.phase === "windup") { if (s.t <= 0) toPhase(s, "active", A.active); return; }
    if (s.phase !== "active") return;
    const going = glideStep(e, s, w, G.length / A.active * w.dt); if (Math.abs(s.data.aim.x) > .05) e.facingX = s.data.aim.x > 0 ? 1 : -1;
    if (!s.hitOnce && distance(center(w.player), e) <= bodyRadius(e) + G.hit) { s.hitOnce = true; w.hurt(e, damageOf(e, "glideRake"), { jumpable: false, source: "glideRake" }); }
    if (s.t <= 0 || !going || s.data.run >= G.length) { s.tele = null; e.advPose = null; toPhase(s, "recover", A.recover); }
  },
  pendulumSwing(e, s, w) {
    const A = ATTACK_MODULES.pendulumSwing, P = ADV.pendulum;
    if (s.phase === "windup") { if (s.t <= 0) { e.advCling = false; e.advPerched = false; e.aloft = true; toPhase(s, "active", A.active); } return; }
    if (s.phase !== "active") return;
    const k = 1 - Math.max(0, s.t) / A.active, f = s.data.from, T = s.data.to;
    e.x = f.x + (T.x - f.x) * k; e.y = f.y + (T.y - f.y) * k; e.hopLift = s.data.fromLift * (1 - k) * (1 - Math.sin(k * Math.PI)) + Math.sin(k * Math.PI) * P.arc * .4; if (Math.abs(T.x - f.x) > .05) e.facingX = T.x > f.x ? 1 : -1;
    if (!s.hitOnce && distance(center(w.player), e) <= bodyRadius(e) + P.hit) { s.hitOnce = true; w.hurt(e, damageOf(e, "pendulumSwing"), { jumpable: false, source: "pendulumSwing" }); }
    if (s.t <= 0) { e.x = T.x; e.y = T.y; e.hopLift = 0; e.aloft = false; s.advGround = 0; s.advScan = null; s.tele = null; e.advPose = null; toPhase(s, "recover", A.recover); }
  },
  slagPour(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const L = ADV.slag, at = nearestOpen(w, s.data.target.x, s.data.target.y, 1.5);
    if (at) w.addEffect({ kind: "slagPool", owner: e.id, x: at.x, y: at.y, radius: L.radius, arming: L.arming, life: L.life, total: L.life, damage: damageOf(e, "slagPour"), steps: L.steps, flowIn: L.flowEvery });
    s.tele = null; e.advPose = null; toPhase(s, "recover", ATTACK_MODULES.slagPour.recover);
  },
});

// Brains: where to stand between attacks.
// ---------------------------------------------------------------- the Gaunt (duelists.ts; Tim, 2026-11-12)
// Hooded duelists. Between attacks they close in on a slant, circle the Wayfarer (flipping direction on a hashed clock), give ground
// when crowded, keep off their kin (duelSeparation) and hop: onto the Wayfarer's level when it is one above or below, out of a corner
// they cannot walk out of, to a new angle now and then, and back or aside after an attack. A hop in flight always lands, even under a
// blow; a new hop or attack never starts while the creature is stunned (the ordinary hit-stun, windup-hold and stagger governor apply
// before any of this runs). Every number is DUELISTS. The vector is written into one scratch object (no allocation a frame).
const DUEL_V = { x: 0, y: 0, speed: 0 }, DUEL_PUSH = { x: 0, y: 0 };
const duelAi = (e) => DUELISTS.ai[e.kind] || DUELISTS.ai.gauntDuelist;
const duelFlipTime = (e, n) => { const F = duelAi(e).flip; return F[0] + (hashSeed(`${e.id}:duel-flip:${n}`) % 1000) / 1000 * (F[1] - F[0]); };
// The hop in flight: from its start to its landing in DUELISTS.hop.time, lifted along hopArc; aloft while it lasts.
function duelHopStep(e, s, w) {
  const h = s.duelHop; if (!h) return false;
  h.t += w.dt; const k = Math.min(1, h.t / DUELISTS.hop.time);
  e.x = h.from.x + (h.to.x - h.from.x) * k; e.y = h.from.y + (h.to.y - h.from.y) * k; e.hopLift = hopArc(k, h.climb); e.aloft = k < 1;
  if (Math.abs(h.to.x - h.from.x) > .05) e.facingX = h.mode === "back" ? (w.player.x >= e.x ? 1 : -1) : h.to.x > h.from.x ? 1 : -1;
  if (k >= 1) { duelLandClear(h.to, w); e.x = h.to.x; e.y = h.to.y; e.hopLift = 0; e.aloft = false; s.duelHop = null; s.duelLanded = Number(w.now) || 0; s.gap = Math.max(s.gap || 0, DUELISTS.hop.time * .5); }
  return true;
}
// 926 bug 9: a landing the Wayfarer has walked onto while the hop was in the air is set down DUELISTS.separation.wayfarer from them
// (straight out from them, where that is open ground on the landing's level); otherwise where it was going.
function duelLandClear(to, w) {
  const p = w.player, keep = DUELISTS.separation.wayfarer, dx = to.x - p.x, dy = to.y - p.y, d = Math.hypot(dx, dy); if (!(d < keep)) return;
  const ux = d > 1e-4 ? dx / d : 1, uy = d > 1e-4 ? dy / d : 0, x = p.x + ux * keep, y = p.y + uy * keep;
  if (w.open(x, y) && levelAt(w, { x, y }) === levelAt(w, to)) { to.x = x; to.y = y; }
}
function duelHop(e, s, w, p, mode) {
  s.duelCd = DUELISTS.hop.cooldown; s.duelTries = (s.duelTries || 0) + 1;
  const to = findHop(e, w, p, mode, s.seq * 7 + s.duelTries, duelAi(e).preferred); if (!to) return false;
  s.duelHop = { from: { x: e.x, y: e.y }, to, t: 0, climb: Math.max(0, levelAt(w, to) - levelAt(w, e)), mode }; s.duelHops = (s.duelHops || 0) + 1;
  return true;
}
// Each frame it is free to act (not attacking, not stunned): after an attack, a hop out or aside; the Wayfarer a level away, a hop to
// them; stuck, a hop out; and now and then, circling, a hop to a new angle. True when it hopped.
function duelTick(e, s, w, p, d) {
  const A = duelAi(e), H = DUELISTS.hop;
  s.duelCd = Math.max(0, (s.duelCd || 0) - w.dt);
  if (s.attack) return false;
  if (s.duelSeen !== s.seq) { // an attack has just ended
    s.duelSeen = s.seq;
    if (s.seq > 0) {
      const R = DUELISTS.after[e.kind] || DUELISTS.after.gauntDuelist, roll = hashSeed(`${e.id}:after:${s.seq}`) % 100;
      let mode = roll < R.back ? "back" : roll < R.back + R.side ? "side" : null; if (mode === "back" && R.near != null && d > R.near) mode = null;
      if (mode && duelHop(e, s, w, p, mode)) return true;
    }
  }
  if (s.duelCd > 0) return false;
  const lv = levelAt(w, e), lp = levelAt(w, p);
  if (lv !== lp && Math.abs(lv - lp) <= H.maxRise && d <= H.reach[H.reach.length - 1] + A.preferred[1]) return duelHop(e, s, w, p, "close"); // the Wayfarer a level away
  if ((s.duelStuck || 0) > .6 && d > A.preferred[1]) { s.duelStuck = 0; return duelHop(e, s, w, p, "close"); } // walled in on foot
  s.duelEvery = (s.duelEvery ?? H.every) - w.dt;
  if (s.duelEvery <= 0) { s.duelEvery = H.every; s.duelRoll = (s.duelRoll || 0) + 1; if (hashSeed(`${e.id}:reposition:${s.duelRoll}`) % 100 < H.chance) return duelHop(e, s, w, p, d > A.preferred[1] + H.closeFrom ? "close" : "circle"); } // a hop in from afar, or to a new angle
  return false;
}
// Where it walks: in on a slant from beyond its band, round the Wayfarer inside it (easing to the band's middle), away when crowded
// (`backOff`), straight in when it has lost the line; plus the push off its kin.
function duelVector(e, s, w, p, d) {
  const A = duelAi(e), near = A.preferred[0], far = A.preferred[1], to = unit(p.x - e.x, p.y - e.y);
  if (!s.orbitDir) s.orbitDir = 1;
  s.duelFlip = (s.duelFlip ?? duelFlipTime(e, 0)) - w.dt;
  if (s.duelFlip <= 0) { s.orbitDir = -s.orbitDir; s.duelFlips = (s.duelFlips || 0) + 1; s.duelFlip = duelFlipTime(e, s.duelFlips); }
  const sx = -to.y * s.orbitDir, sy = to.x * s.orbitDir; let x, y, speed;
  if (!w.los(e, w.player)) { const back = d < DUELISTS.separation.wayfarer; x = back ? -to.x : to.x; y = back ? -to.y : to.y; speed = back ? A.retreat : A.approach; } // 926 bug 9: straight in, never into them
  else if (d < A.backOff) { x = -to.x + sx * .5; y = -to.y + sy * .5; speed = A.retreat; }
  else if (d > far) { x = to.x + sx * .35; y = to.y + sy * .35; speed = A.approach; }
  else { const radial = (d - (near + far) / 2) * .8; x = sx + to.x * radial; y = sy + to.y * radial; speed = A.strafe; }
  const push = duelSeparation(e, w.enemies, DUEL_PUSH); x += push.x; y += push.y;
  DUEL_V.x = x; DUEL_V.y = y; DUEL_V.speed = speed; return DUEL_V;
}
// The feint: some swings are held a little longer than the rest (the telegraph shows the whole time).
function duelFeint(e, s) { if (hashSeed(`${e.id}:feint:${s.seq}`) % 100 < DUELISTS.feint.chance) { s.t += DUELISTS.feint.delay * (s.paced ? BOSS_PACE.windup : 1); s.data.feint = true; } }
// One blade blow at the Wayfarer if `hit` (they must be in sight): the ordinary damage path (guard, dodge frames, reductions).
function duelBlow(e, w, id, hit, jumpable = false) { if (hit && w.los(e, w.player)) w.hurt(e, damageOf(e, id), { jumpable, source: id }); }
Object.assign(START, {
  duelCombo(e, s) { const A = DUELISTS.attacks.duelCombo; s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + A.radius, arc: A.arc }; s.data.cut = 0; e.duelPose = "load"; duelFeint(e, s); },
  duelTwinCuts(e, s, w) {
    const A = DUELISTS.attacks.duelTwinCuts, p = s.data.target, room = rayLength(w, e, s.data.aim, A.dash.length);
    s.data.dash = Math.max(0, Math.min(room, Math.hypot(p.x - e.x, p.y - e.y) - A.dash.stop)); s.data.cut = 0;
    s.tele = { type: "lane", aim: s.data.aim, length: s.data.dash + bodyRadius(e) + A.radius, width: .55 }; e.duelPose = "crouch"; duelFeint(e, s);
  },
  duelThrust(e, s) { const A = DUELISTS.attacks.duelThrust; s.tele = { type: "rect", aim: s.data.aim, length: A.length, width: A.width }; e.duelPose = "aim"; duelFeint(e, s); },
  duelSweep(e, s) { const A = DUELISTS.attacks.duelSweep; s.tele = { type: "arc", aim: s.data.aim, radius: bodyRadius(e) + A.radius, arc: A.arc }; e.duelPose = "wind"; duelFeint(e, s); },
});
Object.assign(RUN, {
  // Three cuts, each a short step along the aim; each can land.
  duelCombo(e, s, w) {
    const A = DUELISTS.attacks.duelCombo, a = s.data.aim;
    if (s.phase === "windup") { if (s.t <= 0) { toPhase(s, "active", A.active); e.duelPose = "cut"; } return; }
    if (s.phase !== "active") return;
    const at = A.active - Math.max(0, s.t);
    while (s.data.cut < A.cuts.length && at >= A.cuts[s.data.cut]) {
      if (!duelStepTooClose(e, center(w.player), a.x * A.step, a.y * A.step)) w.move(e, a.x * A.step, a.y * A.step); // 926 bug 9: each cut's step stops short of the Wayfarer
      duelBlow(e, w, "duelCombo", inArc(e, center(w.player), a, bodyRadius(e) + A.radius + .3, A.arc));
      s.data.cut++; s.data.cutAt = Number(w.now) || 0;
    }
    if (s.t <= 0) { s.tele = null; toPhase(s, "recover", A.recover); }
  },
  // The dart in along the lane it showed, then two quick cuts.
  duelTwinCuts(e, s, w) {
    const A = DUELISTS.attacks.duelTwinCuts, a = s.data.aim;
    if (s.phase === "windup") { if (s.t <= 0) { toPhase(s, "active", A.active); s.data.ran = 0; e.duelPose = "dart"; } return; }
    if (s.phase !== "active") return;
    const at = A.active - Math.max(0, s.t);
    if (s.data.ran < s.data.dash) { const want = Math.min(s.data.dash, s.data.dash * Math.min(1, at / A.dash.time)), step = want - s.data.ran; if (step > 0 && (duelStepTooClose(e, center(w.player), a.x * step, a.y * step) || !w.move(e, a.x * step, a.y * step))) s.data.dash = s.data.ran; else s.data.ran = want; } // 926 bug 9: the dart stops short of the Wayfarer
    if (at >= A.dash.time && s.tele?.type === "lane") { s.tele = { type: "arc", aim: a, radius: bodyRadius(e) + A.radius, arc: A.arc }; e.duelPose = "cut"; }
    while (s.data.cut < A.cuts.length && at >= A.cuts[s.data.cut]) {
      duelBlow(e, w, "duelTwinCuts", inArc(e, center(w.player), a, bodyRadius(e) + A.radius + .3, A.arc));
      s.data.cut++; s.data.cutAt = Number(w.now) || 0;
    }
    if (s.t <= 0) { s.tele = null; toPhase(s, "recover", A.recover); }
  },
  // The thrust down its line at the windup's end, held out for `active`.
  duelThrust(e, s, w) {
    const A = DUELISTS.attacks.duelThrust, a = s.data.aim;
    if (s.phase === "windup") {
      if (s.t > 0) return;
      const p = center(w.player), dx = p.x - e.x, dy = p.y - e.y, f = dx * a.x + dy * a.y, l = Math.abs(dx * a.y - dy * a.x);
      duelBlow(e, w, "duelThrust", f >= -.2 && f <= A.length + .3 && l <= A.width + .35); s.data.cut = 1;
      s.tele = null; e.duelPose = "thrust"; toPhase(s, "active", A.active); return;
    }
    if (s.phase === "active" && s.t <= 0) toPhase(s, "recover", A.recover);
  },
  // The sweep round its front at the windup's end; low, so a jump clears it.
  duelSweep(e, s, w) {
    const A = DUELISTS.attacks.duelSweep;
    if (s.phase === "windup") {
      if (s.t > 0) return;
      duelBlow(e, w, "duelSweep", inArc(e, center(w.player), s.data.aim, bodyRadius(e) + A.radius + .3, A.arc), !!A.jumpable); s.data.cut = 1;
      s.tele = null; e.duelPose = "swept"; toPhase(s, "active", A.active); return;
    }
    if (s.phase === "active" && s.t <= 0) toPhase(s, "recover", A.recover);
  },
});

function brainVector(e, s, w, def) {
  const p = center(w.player), brain = BRAINS[e.brain || def.brain] || BRAINS.duelist, [near, far] = brain.preferred, d = distance(p, e), to = unit(p.x - e.x, p.y - e.y), side = { x: -to.y * s.orbitDir, y: to.x * s.orbitDir };
  if (brain.id === "vantage" && e.advHome && Math.hypot(e.x - e.advHome.x, e.y - e.advHome.y) > ADV.vantage.leash) return { ...unit(e.advHome.x - e.x, e.advHome.y - e.y), speed: .9 }; // back to its high ground
  if (brain.id === "orbit" || brain.id === "loop") { const radial = (d - (near + far) / 2) * .7; return { x: side.x * .85 + to.x * radial, y: side.y * .85 + to.y * radial, speed: .95 }; }
  if (brain.id === "kite" || brain.id === "artillery" || brain.id === "vantage") {
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
  const [lo, hi] = attack.range || [0, 9], reach = attack.heightReach ? heightReach(id, levelAt(w, e) - levelAt(w, w.player)) : 0; // adventure creatures reach farther from above
  if (d < lo || d > hi + reach + bodyRadius(e)) return false;
  if (e.advBuried && id !== "sinkFunnel") return false; // a buried Sinkmaw only opens its funnel
  if (attack.gate && !advGate(e, s, w, attack.gate)) return false;
  if (e.phases && !w.open(e.x, e.y)) return false;
  if (attack.los && !w.los(e, w.player, attack.tags.includes("ranged"))) return false;
  if (id === "voidSupernova" && voidEffects(w).some((f) => f.owner === e.id && f.kind === "voidRift" && f.tracking && !f.activated)) return false;
  if (attack.scheduled) return false; // release 709: only its own clock starts it
  if (e.kind === "wildStego" && !stegoCan(e, s, w, id)) return false; // STEGO: water, plates, the buck rule, the rare tree
  if (e.kind === "spinoRex" && !spinoCan(e, s, w, id)) return false; // SPINO: bone-only moves, the tail behind it
  if (attack.hurtBelow && !((Number(e.hp) || 0) < (Number(e.maxHp) || 0) * attack.hurtBelow)) return false; // release 708: a heal only once it is hurt
  if (e.kind === "tremorWorm" && attack.posture === "full" && Number.isFinite(s.worm?.fullAt) && (w.now - s.worm.fullAt) / 1000 < WORM.fullGap) return false; // release 664: it comes all the way out only now and then
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
// Release 664: up means half out of the ground (`e.wormLift`, the share of its length above ground, which the renderer
// draws); only a "full" move brings it all the way up. Its time up now runs during its attacks too, so it moves about.
function wormCycle(e, s, w, p) {
  const W = s.worm ||= { mode: "surfaced", t: WORM.surfaceTime, trips: 0 };
  const full = !!s.attack && ATTACK_MODULES[s.attack]?.posture === "full", want = full ? 1 : WORM.halfHeight, lift = Number.isFinite(e.wormLift) ? e.wormLift : WORM.halfHeight;
  e.wormLift = lift + Math.max(-WORM.postureRate * w.dt, Math.min(WORM.postureRate * w.dt, want - lift)); e.wormPosture = full ? "full" : "half";
  if (full) W.fullAt = w.now;
  if (s.attack) { if (W.mode === "surfaced") W.t -= w.dt; return false; }
  if (W.mode === "surfaced") {
    W.t -= w.dt;
    if (W.t > 0 || s.evade) return false;
    const a = (hashSeed(`${e.id}:worm-trip:${W.trips}`) % 628) / 100, [lo, hi] = WORM.surfaceRange, r = lo + (hashSeed(`${e.id}:worm-r:${W.trips}`) % 100) / 100 * (hi - lo);
    W.trips++; W.dest = { x: Math.max(1, Math.min(w.width - 2, p.x + Math.cos(a) * r)), y: Math.max(1, Math.min(w.height - 2, p.y + Math.sin(a) * r)) }; W.mode = "under"; W.t = WORM.travelTime;
  }
  if (W.mode === "under") {
    e.hidden = true; e.untargetable = true; W.t -= w.dt; e.wormLift = 0;
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
// Release 664: the cracks where a tentacle will rise (harmless; drawn on the ground).
function wormCracks(w, e, at, life) { w.addEffect({ kind: "wormCracks", owner: e.id, x: at.x, y: at.y, radius: .85, arming: 0, life, total: life, damage: 0 }); }
// Release 664: a tentacle's health from the worm's (its damage is read from the worm's each time it strikes).
function tentacleStats(owner) { const hp = Math.max(WORM.tentacleHpMin, Math.round((Number(owner.maxHp) || 0) * WORM.tentacleHp)); return { hp, maxHp: hp }; }
function tentacleDamage(owner, mode) { return Math.max(1, Math.ceil((Number(owner.damage) || 1) * (WORM.tentacleDamage[mode] ?? ATTACK_MODULES.wormTentacles.damage))); }
// One volley done: after its mode's count it burrows and comes up around the Wayfarer (release 664).
function tentacleVolley(e, s) { e.volleys = (Number(e.volleys) || 0) + 1; if (e.volleys >= (WORM.tentacleVolleys[e.tentacleMode] || 2)) { e.tentPhase = "sinking"; s.tele = null; } }
function tentacleSpot(e, w, p) {
  const [lo, hi] = WORM.tentacleRing, a = (hashSeed(`${e.id}:follow:${e.moves || 0}`) % 628) / 100, r = lo + (hashSeed(`${e.id}:follow-r:${e.moves || 0}`) % 100) / 100 * (hi - lo);
  return nearestOpen(w, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 2);
}
// A tentacle the worm raised: it never walks. It rises, then spits bursts of fire at the Wayfarer or (laser) holds a
// burning line that turns slowly after them. It sinks when the worm dies. Left far behind, it sinks and comes up again
// around the Wayfarer a little later, so running never leaves the tentacles behind.
// Release 664: it also burrows between volleys and comes up around the Wayfarer, the ground cracking where it will rise;
// and it has six ways to fight (WORM.tentacleModes): fire bursts, a laser, homing orbs, a fan of shots, a grab that drags
// you to it, and a swipe at whoever is close.
function tentacleTurret(e, s, w, p) {
  const owner = w.enemies.find((q) => q.id === e.wormOf && !q.dead);
  if (!owner) { e.dead = true; e.noRewards = true; return true; }
  if (e.tentPhase === "sinking") { // going back into the ground
    e.untargetable = true; s.tele = null; e.grabbing = null; e.rising = Math.min(1, (Number(e.rising) || 0) + w.dt / WORM.tentacleSink);
    if (e.rising >= 1) { const [lo, hi] = WORM.tentacleUnder, under = Number.isFinite(e.underFor) ? e.underFor : lo + (hashSeed(`${e.id}:under:${e.moves || 0}`) % 100) / 100 * (hi - lo); e.tentPhase = "under"; e.underFor = null; e.surfaceAt = w.now + Math.max(under, WORM.tentacleWarn) * 1000; e.surfaceSpot = null; }
    return true;
  }
  if (e.tentPhase === "under") { // travelling under the ground; then it comes up somewhere around the Wayfarer
    e.hidden = true; e.untargetable = true; s.tele = null;
    if (!e.surfaceSpot && w.now >= e.surfaceAt - WORM.tentacleWarn * 1000) { const spot = tentacleSpot(e, w, p); if (spot) { e.surfaceSpot = spot; wormCracks(w, owner, spot, (e.surfaceAt - w.now) / 1000 + WORM.tentacleRise); } }
    if (w.now < e.surfaceAt) return true;
    const spot = e.surfaceSpot || tentacleSpot(e, w, p);
    if (!spot) { e.surfaceAt = w.now + 400; return true; }
    e.moves = (e.moves || 0) + 1;
    e.x = spot.x; e.y = spot.y; e.tentPhase = null; e.surfaceSpot = null; e.hidden = false; e.bornAt = w.now; s.laser = null; s.fire = null; s.tent = null; e.farFor = 0; e.volleys = 0;
  }
  const age = (w.now - (e.bornAt || 0)) / 1000;
  if (age < WORM.tentacleRise) { e.untargetable = true; e.rising = 1 - age / WORM.tentacleRise; s.tele = { type: "circle", x: e.x, y: e.y, radius: .8, erupt: true, total: WORM.tentacleRise, left: WORM.tentacleRise - age }; return true; }
  if (e.rising) { e.rising = 0; e.untargetable = false; s.tele = null; if (distance(p, e) <= 1.1) w.hurt(owner, Math.max(1, Math.ceil((Number(owner.damage) || 1) * .4)), { jumpable: false, source: "wormTentacle" }); }
  if (distance(p, e) > WORM.tentacleFollow && !e.grabbing) { e.farFor = (Number(e.farFor) || 0) + w.dt; if (e.farFor >= WORM.tentacleFollowDelay) { e.tentPhase = "sinking"; e.farFor = 0; s.tele = null; return true; } }
  else e.farFor = 0;
  e.facingX = (p.x - e.x) >= 0 ? 1 : -1; e.tentSwing = Math.max(0, (Number(e.tentSwing) || 0) - w.dt);
  const mode = e.tentacleMode, dmg = tentacleDamage(owner, mode);
  if (mode === "laser") {
    const want = Math.atan2(p.y - e.y, p.x - e.x), L = s.laser ||= { angle: want, charge: WORM.laserCharge, tick: 0, held: 0 };
    let diff = ((want - L.angle) % TAU + TAU * 1.5) % TAU - Math.PI;
    L.angle += Math.max(-WORM.laserTurn * w.dt, Math.min(WORM.laserTurn * w.dt, diff));
    const dir = { x: Math.cos(L.angle), y: Math.sin(L.angle) }, len = rayLength(w, e, dir, WORM.laserLength);
    if (L.charge > 0) { L.charge -= w.dt; s.tele = { type: "beam", angle: L.angle, length: len, charging: true, laser: true }; return true; }
    s.tele = { type: "beam", angle: L.angle, length: len, charging: false, laser: true };
    L.tick -= w.dt; L.held = (Number(L.held) || 0) + w.dt;
    if (L.tick <= 0 && segmentDistance(p, e, { x: e.x + dir.x * len, y: e.y + dir.y * len }) <= WORM.laserWidth) { L.tick = WORM.laserTick; w.hurt(owner, dmg, { jumpable: false, source: "wormLaser", beam: true }); }
    if (L.held >= WORM.laserHold) { e.tentPhase = "sinking"; s.tele = null; } // release 664: it burns a while, then burrows to a new angle on you
    return true;
  }
  if (mode === "fire") {
    const F = s.fire ||= { next: .4, shots: 0 };
    F.next -= w.dt;
    if (F.next <= 0) {
      if (w.los(e, w.player, true)) { const a = Math.atan2(p.y - e.y, p.x - e.x); w.addEffect({ kind: "orb", fire: true, owner: owner.id, x: e.x, y: e.y, vx: Math.cos(a) * WORM.fireSpeed, vy: Math.sin(a) * WORM.fireSpeed, radius: WORM.fireRadius, arming: 0, life: WORM.fireLife, damage: dmg }); }
      F.shots++; F.next = F.shots % WORM.fireBurst ? WORM.fireEvery : WORM.fireRest;
      if (!(F.shots % WORM.fireBurst)) tentacleVolley(e, s);
    }
    return true;
  }
  const T = s.tent ||= { next: .5, stage: "rest", t: 0 };
  T.next -= w.dt;
  if (mode === "orbs") { // a slow orb that turns after you for a while, then flies straight
    if (T.next <= 0) { T.next = WORM.orbEvery; if (w.los(e, w.player, true)) { const a = Math.atan2(p.y - e.y, p.x - e.x); w.addEffect({ kind: "orb", homing: WORM.orbHome, turn: WORM.orbTurn, owner: owner.id, x: e.x, y: e.y, vx: Math.cos(a) * WORM.orbSpeed, vy: Math.sin(a) * WORM.orbSpeed, radius: WORM.orbRadius, arming: 0, life: WORM.orbLife, damage: dmg }); } tentacleVolley(e, s); }
    return true;
  }
  if (mode === "spread") { // it rears back (the fan shown), then looses a fan of shots
    if (T.stage === "rest" && T.next <= 0) { T.stage = "warn"; T.t = WORM.spreadWarn; T.aim = unit(p.x - e.x, p.y - e.y); s.tele = { type: "cone", aim: T.aim, length: 4, arc: WORM.spreadArc }; }
    else if (T.stage === "warn" && (T.t -= w.dt) <= 0) {
      const a0 = Math.atan2(T.aim.y, T.aim.x), n = WORM.spreadShots, arc = WORM.spreadArc * Math.PI / 180;
      for (let i = 0; i < n; i++) { const a = a0 - arc / 2 + arc * i / Math.max(1, n - 1); w.addEffect({ kind: "orb", fire: true, owner: owner.id, x: e.x, y: e.y, vx: Math.cos(a) * WORM.fireSpeed, vy: Math.sin(a) * WORM.fireSpeed, radius: WORM.fireRadius, arming: 0, life: WORM.fireLife, damage: dmg }); }
      T.stage = "rest"; T.next = WORM.spreadEvery; s.tele = null; tentacleVolley(e, s);
    }
    return true;
  }
  if (mode === "grab") { // it reaches along a lane; caught, you are dragged to it (w.pull) and squeezed
    if (T.stage === "rest" && T.next <= 0 && distance(p, e) <= WORM.grabReach + .5) { T.stage = "warn"; T.t = WORM.grabWarn; T.aim = unit(p.x - e.x, p.y - e.y); s.tele = { type: "lane", aim: T.aim, length: WORM.grabReach, width: WORM.grabWidth }; }
    else if (T.stage === "warn" && (T.t -= w.dt) <= 0) {
      const end = { x: e.x + T.aim.x * WORM.grabReach, y: e.y + T.aim.y * WORM.grabReach }, caught = segmentDistance(p, e, end) <= WORM.grabWidth + .3 && w.pull?.(e, 0, WORM.grabReach + 1) !== false && !w.held?.(owner);
      s.tele = null;
      if (caught) { T.stage = "hold"; T.t = WORM.grabHold; e.grabbing = { x: p.x - e.x, y: p.y - e.y }; }
      else { T.stage = "rest"; T.next = WORM.grabEvery; tentacleVolley(e, s); }
    } else if (T.stage === "hold") {
      w.pull?.(e, WORM.grabPull * w.dt, WORM.grabReach + 1.5); e.grabbing = { x: p.x - e.x, y: p.y - e.y };
      if ((T.t -= w.dt) <= 0) { if (distance(p, e) <= 1.6) w.hurt(owner, dmg, { jumpable: false, source: "wormGrab" }); e.grabbing = null; T.stage = "rest"; T.next = WORM.grabEvery; tentacleVolley(e, s); }
    }
    return true;
  }
  if (mode === "swipe") { // a melee arc at whoever comes close; kept out of reach, it burrows after you
    const near = distance(p, e) <= WORM.swipeReach + .8;
    if (T.stage === "rest") {
      T.far = near ? 0 : (Number(T.far) || 0) + w.dt;
      if (T.far >= WORM.swipeChase) { T.far = 0; e.tentPhase = "sinking"; s.tele = null; return true; }
      if (near && T.next <= 0) { T.stage = "warn"; T.t = WORM.swipeWarn; T.aim = unit(p.x - e.x, p.y - e.y); s.tele = { type: "arc", aim: T.aim, radius: WORM.swipeReach, arc: WORM.swipeArc }; }
    } else if (T.stage === "warn" && (T.t -= w.dt) <= 0) {
      if (inArc(e, p, T.aim, WORM.swipeReach + .3, WORM.swipeArc)) w.hurt(owner, dmg, { jumpable: false, source: "wormSwipe" });
      e.tentSwing = .3; T.stage = "rest"; T.next = WORM.swipeEvery; s.tele = null; tentacleVolley(e, s);
    }
    return true;
  }
  return true;
}

// A world beast in retreat (release 239; the game sets `fleeTo`): it no longer fights or dodges, cannot be touched, and
// follows `fleePath` (found by the game around walls, over chasms with a bound, by bridges over water) to the gate it leaves
// by or to its home ground, where it fades into the ground (`fleeFade` from 1 to 0). With no path it goes straight. The
// Tremor Worm swims there under the ground, leaving a wake of churned earth. The game reads `fleeDone`.
function fleeStep(e, s, w) {
  if (s.attack) endAttack(e, s);
  s.evade = null; s.tele = null; e.untargetable = true; e.hidden = e.kind === "tremorWorm" && !e.passingBeast; /* release 569: a passing worm stays in sight */ e.tucked = false; e.mist = e.kind === "nanobotKnight"; // the Knight goes home as a swarm
  if (e.fleeFade != null) { e.hopLift = 0; e.fleeFade = Math.max(0, e.fleeFade - w.dt / (e.fleeFadeTime || 1.4)); if (e.fleeFade <= 0) e.fleeDone = true; return; }
  const next = e.fleePath?.[0] || e.fleeTo, dx = next.x - e.x, dy = next.y - e.y, d = Math.hypot(dx, dy), step = (e.fleeSpeed || 2) * w.dt;
  e.hopLift = next.leap ? Math.min(1, (Number(e.hopLift) || 0) + w.dt * 4) : Math.max(0, (Number(e.hopLift) || 0) - w.dt * 4); // a bound over the chasm
  if (d > .01) { e.fleeDir = { x: dx / d, y: dy / d }; e.facingX = dx >= 0 ? 1 : -1; }
  if (e.hidden && (s.furrow = (s.furrow || 0) - w.dt) <= 0) { s.furrow = .2; w.addEffect({ kind: "furrow", owner: e.id, x: e.x, y: e.y, radius: .9, arming: 0, life: 2.2, total: 2.2, damage: 0, dir: e.fleeDir || { x: 1, y: 0 } }); } // the worm's wake of churned earth
  if (d > step + .05) { e.x += dx / d * step; e.y += dy / d * step; return; }
  e.x = next.x; e.y = next.y;
  if (e.fleePath?.length) { e.fleePath.shift(); if (e.fleePath.length) return; }
  if (e.fleeTo.home && e.standsAtHome) { e.fleeDone = true; return; } // release 653: home, it turns at bay instead of fading away
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
// ---------------------------------------------------------------- the Wild Stegosaurus (STEGO): body, water, climbing, tail
function stegoHeading(e) { const h = e.stegoHeading; return h && Number.isFinite(h.x) && Number.isFinite(h.y) && (h.x || h.y) ? h : { x: e.facingX < 0 ? -1 : 1, y: 0 }; }
function stegoFace(e, v) { const u = unit(v.x, v.y); e.stegoHeading = { x: u.x, y: u.y }; if (Math.abs(u.x) > .05) e.facingX = u.x >= 0 ? 1 : -1; }
function stegoBack(e) { const h = stegoHeading(e); return { x: -h.x, y: -h.y }; }
const stegoWhackReach = (e) => e.stegoTail === "cut" ? STEGO.cut.whackReach : STEGO.tailWhack.reach;
const stegoSlamRadius = (e) => e.stegoTail === "cut" ? STEGO.cut.slamRadius : STEGO.tailSlam.radius;
const stegoBladeLife = (e) => e.stegoTail === "cut" ? STEGO.cut.bladeLife : STEGO.blade.life;
const stegoOnWater = (e, w) => w.oceanAt ? !!w.oceanAt(e.x, e.y) : !!e.marine;
function stegoSlamPoint(e, t) { const max = bodyRadius(e) + STEGO.tailSlam.reach, dx = t.x - e.x, dy = t.y - e.y, m = Math.hypot(dx, dy); return m <= max ? { x: t.x, y: t.y } : { x: e.x + dx / m * max, y: e.y + dy / m * max }; }
const stegoPreyAlive = (w, id) => id ? (w.enemies || []).find((q) => q.id === id && !q.dead) || null : null;
function stegoQuarry(s, w) { const id = s.data?.prey; if (id) { const q = stegoPreyAlive(w, id); return q ? center(q) : null; } return center(w.player); }
function stegoDustCount(w, owner) { let n = 0; for (const f of voidEffects(w)) if (f.kind === "stegoDust" && f.owner === owner && f.life > 0) n++; return n; }
// Where it comes down (a pounce, a breach): the spot, or the nearest open ground or open water to it (33 checks at most).
function stegoLanding(e, w, t) {
  const ok = (x, y) => w.open(x, y) || !!w.marineOpen?.(x, y);
  if (ok(t.x, t.y)) return { x: t.x, y: t.y };
  for (let r = .6; r <= 2.4; r += .6) for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, x = t.x + Math.cos(a) * r, y = t.y + Math.sin(a) * r; if (ok(x, y)) return { x, y }; }
  return { x: e.x, y: e.y };
}
// A blow lands on whatever `test` holds: you, and (a one-off at another creature) its prey, which it mostly kills.
function stegoStrike(e, s, w, id, test, share = 1) {
  const dmg = Math.max(1, Math.ceil(damageOf(e, id) * share)), prey = stegoPreyAlive(w, s.data?.prey); let landed = false;
  if (test(center(w.player)) && (!w.los || w.los(e, w.player))) landed = !!w.hurt(e, dmg, { jumpable: false, source: id });
  if (prey && test(center(prey))) { w.hurtCreature?.(e, prey, Math.max(dmg, Math.ceil((Number(prey.maxHp) || 1) * STEGO.infight.share))); landed = true; }
  return landed;
}
// What it will turn on besides you: ordinary creatures and wildlife, never a boss, a beast, a guardian, an elite or anything hidden.
export const stegoPrey = (q, e) => !!q && q !== e && !q.dead && q.kind !== "npc" && q.kind !== e?.kind && !q.boss && !q.worldBeast && !q.questingBeast && !q.stalker && !q.gatePredator && !q.dungeonRole && !q.eliteId && !q.elite && !q.passingBeast && !q.retreating && !q.untargetable && !q.hidden && !q.illusion && !q.astralCompanionOf && !q.stegoRoom && !q.pentBoss && !q.buildingGuardian && !q.farArrayBoss && !q.mothChrysalis && !q.fleeTo && q.kind !== "spinoRex";
function stegoPreyNear(e, w) { let best = null, bd = STEGO.infight.range + bodyRadius(e); for (const q of w.enemies || []) { if (!stegoPrey(q, e)) continue; const dd = distance(q, e); if (dd < bd) { bd = dd; best = q; } } return best; }
// A blow counts on the tail when you stand in the arc behind it, past its hips; anywhere else it is a body blow.
export function stegoTailHit(e, at) { const back = stegoBack(e), along = (at.x - e.x) * back.x + (at.y - e.y) * back.y; return along >= bodyRadius(e) * STEGO.tail.hips && inArc(e, at, back, Infinity, STEGO.tail.arc); }
function stegoSever(e, s, w) {
  e.stegoTail = "cut"; e.stegoTailHp = 0; if (s.attack) endAttack(e, s); s.tele = null; s.stegoHop = null; s.stegoClimbing = null; s.stegoRoute = 0; e.stegoAir = 0;
  s.stegoStagger = STEGO.tail.stagger; e.stegoPose = "stagger";
  w.stegoTailCut?.(e); onStegoTailSevered(e, w); w.say?.(STEGO.text.severed);
}
function stegoCan(e, s, w, id) {
  if (e.stegoSwim === 1 && id !== "stegoBreach") return false; // swimming low it only breaches; it stands on the water to fight
  if (id === "stegoBreach") return e.stegoSwim > 0;
  if (id === "stegoPlateRockets") return !(e.stegoPlates < 1);
  const behind = inArc(e, center(w.player), stegoBack(e), Infinity, STEGO.buck.behind);
  if (id === "stegoBuck") return behind;
  if (id === "stegoBite" || id === "stegoClaw" || id === "stegoRearSwipe") return !behind;
  if (id === "stegoTailWhack") return !inArc(e, center(w.player), stegoHeading(e), Infinity, STEGO.tailWhack.front); // its tail sweeps what is behind and beside it
  if (id === "stegoTreeClub") return !e.stegoSwim && hashSeed(`${e.id}:tree:${s.seq}`) % 100 < STEGO.tree.chance && !!clubTreeNear(w, e.x, e.y);
  return true;
}
const stegoHopGap = (e, s) => { const [a, b] = STEGO.hop.every; return a + (b - a) * (hashSeed(`${e.id}:hop-gap:${s.stegoHops || 0}`) % 100) / 100; };
// Out of the fight: it grazes now and then on land, and drifts low in the water.
function stegoIdle(e, s, w) {
  const G = STEGO.graze, water = stegoOnWater(e, w); e.stegoSwim = water ? 1 : 0;
  s.stegoIdleT = ((s.stegoIdleT ?? (hashSeed(`${e.id}:graze`) % 100) / 100 * G.every) + w.dt) % G.every;
  if (!water && s.stegoIdleT < G.time) { e.stegoPose = "graze"; return true; }
  if (e.stegoPose === "graze") e.stegoPose = null;
  return false;
}
function stegoClimbStep(e, s, w, p, d) {
  const C = STEGO.climb, c = s.stegoClimbing; c.left -= w.dt; c.spent += w.dt;
  // a route's climb (stegoChase): up or down one face of a height, or over a rock or wall to the ground beyond
  if (c.to) {
    e.stegoPose = "climb"; e.stegoClimb = Math.min(1, (e.stegoClimb || 0) + w.dt / C.rise);
    const k = Math.min(1, c.spent / c.need), nx = c.from.x + (c.to.x - c.from.x) * k, ny = c.from.y + (c.to.y - c.from.y) * k;
    if (!w.climbFree(nx, ny)) { s.stegoClimbing = null; s.stegoRoute = 0; if (!w.open(e.x, e.y)) { e.x = c.from.x; e.y = c.from.y; } return true; }
    e.x = nx; e.y = ny; if (k >= 1) s.stegoClimbing = null;
    return true;
  }
  const v = unit(p.x - e.x, p.y - e.y), st = Math.min(Math.max(0, d - bodyRadius(e)), C.speed * (e.speedMultiplier || 1) * w.dt), nx = e.x + v.x * st, ny = e.y + v.y * st;
  e.stegoClimbDir = { x: v.x, y: v.y }; stegoFace(e, v); e.stegoPose = "climb"; e.stegoClimb = Math.min(1, (e.stegoClimb || 0) + w.dt / C.rise);
  if (w.climbFree(nx, ny)) { e.x = nx; e.y = ny; }
  const open = w.open(e.x, e.y), level = w.elevation ? Math.abs((Number(w.elevation(p.x, p.y)) || 0) - (Number(w.elevation(e.x, e.y)) || 0)) < 1 : true;
  if (open && c.spent >= C.settle && (d <= C.reach + bodyRadius(e) || level) || c.left <= 0) { if (!open) { const q = stegoLanding(e, w, p); e.x = q.x; e.y = q.y; } s.stegoClimbing = null; }
  return true;
}
// Its body turns toward (x, y) at its own pace (STEGO.turn): get behind it, and it bucks.
function stegoTurnToward(e, x, y, dt) { const h = stegoHeading(e), cur = Math.atan2(h.y, h.x), diff = ((Math.atan2(y - e.y, x - e.x) - cur) % TAU + TAU * 1.5) % TAU - Math.PI, a = cur + Math.max(-STEGO.turn * dt, Math.min(STEGO.turn * dt, diff)); stegoFace(e, { x: Math.cos(a), y: Math.sin(a) }); }
const stegoLevelGap = (w, e, p) => w.elevation ? Math.abs((Number(w.elevation(p.x, p.y)) || 0) - (Number(w.elevation(e.x, e.y)) || 0)) : 0;
// Its chase (STEGO.chase). Walled off from you (pressing on without gaining), out of sight, or a level or more above or below you,
// it follows the game's way-round search (w.stegoRoute: the first step of a bounded search that knows heights) instead of pressing
// straight at you: on foot round the walls, or a climb up or down the face of a height, or over a rock. True when it has spent the
// frame; false hands it back to the shared brain (which fights when you are near and on its level).
function stegoChase(e, s, w, p, d) {
  const C = STEGO.chase, dt = w.dt, apart = stegoLevelGap(w, e, p) >= 1, hidden = !!w.los && !w.los(e, w.player);
  if (d <= C.near + bodyRadius(e) && !apart) { s.stegoRoute = 0; s.stegoStuck = 0; s.stegoPrevD = null; return false; }
  if (!(s.stegoRoute > 0)) {
    const gain = (s.stegoPrevD ?? d + 1) - d; s.stegoPrevD = d;
    s.stegoStuck = (s.moveFailed || apart) && gain < .02 || hidden ? (s.stegoStuck || 0) + dt : 0;
    if (s.stegoStuck < C.stuck) return false;
    s.stegoStuck = 0; s.stegoRoute = C.hold + dt;
  }
  s.stegoRoute -= dt;
  if (s.stegoRoute <= 0) { if (!apart && !hidden) { s.stegoRoute = 0; s.stegoPrevD = null; return false; } s.stegoRoute = C.hold; }
  const step = w.stegoRoute(e);
  if (!step) { s.stegoRoute = 0; return false; }
  const cx = Math.round(e.x), cy = Math.round(e.y), speed = C.speed * (MOVEMENT_MODES[e.movement] || MOVEMENT_MODES.walk).speed * (e.speedMultiplier || 1) * dt;
  // a climb starts from the middle of its own ground, up (or down, or over) to the step's
  if (step.climb && Math.hypot(e.x - cx, e.y - cy) <= C.arrive) {
    const from = { x: e.x, y: e.y }, to = { x: step.x, y: step.y }, v = unit(to.x - from.x, to.y - from.y), levels = w.elevation ? Math.abs((Number(w.elevation(to.x, to.y)) || 0) - (Number(w.elevation(from.x, from.y)) || 0)) : 0;
    s.stegoClimbing = { left: STEGO.climb.time, spent: 0, from, to, need: Math.max(STEGO.climb.settle, Math.hypot(to.x - from.x, to.y - from.y) / STEGO.climb.speed, levels * STEGO.climb.perLevel) };
    e.stegoClimbDir = { x: v.x, y: v.y }; stegoFace(e, v); s.stegoHop = null;
    return stegoClimbStep(e, s, w, p, d);
  }
  if (e.stegoClimb > 0) { e.stegoClimb = Math.max(0, e.stegoClimb - dt / STEGO.climb.down); e.stegoPose = e.stegoClimb > 0 ? "climb" : null; if (!(e.stegoClimb > 0)) e.stegoClimbDir = null; }
  else if (e.stegoPose === "climb" || e.stegoPose === "hop") e.stegoPose = null;
  const tx = step.climb ? cx : step.x, ty = step.climb ? cy : step.y, gap = Math.hypot(tx - e.x, ty - e.y);
  if (gap > 1e-6) { const st = Math.min(gap, speed), ux = (tx - e.x) / gap, uy = (ty - e.y) / gap;
    stegoTurnToward(e, step.x, step.y, dt);
    if (!w.move(e, ux * st, uy * st) && !step.climb) { const bx = cx - e.x, by = cy - e.y, bm = Math.hypot(bx, by); if (bm > 1e-6) w.move(e, bx / bm * Math.min(bm, st), by / bm * Math.min(bm, st)); } }
  return true;
}
// Every fighting frame, before the shared brain: the tail, its plates, the water, a climb, a stagger, a hop, a buck, a one-off at
// another creature. True when it has spent the frame.
function stegoTick(e, s, w, p, d) {
  const S = STEGO, dt = w.dt;
  if (e.stegoTail !== "cut") e.stegoTail = "whole";
  e.stegoPlates = Math.min(1, (Number.isFinite(e.stegoPlates) ? e.stegoPlates : 1) + (s.attack === "stegoPlateRockets" ? 0 : dt / S.rockets.regrow));
  if (!e.stegoHeading) stegoFace(e, unit(p.x - e.x, p.y - e.y));
  if (s.cd.stegoTreeClub === undefined) s.cd.stegoTreeClub = S.tree.first;
  const hp = Number(e.hp) || 0;
  if (!Number.isFinite(e.stegoTailHp)) e.stegoTailHp = e.stegoTail === "cut" ? 0 : Math.max(1, Math.round((Number(e.maxHp) || 1) * S.tailHp));
  if (Number.isFinite(s.stegoHp) && hp < s.stegoHp && e.stegoTail === "whole" && stegoTailHit(e, w.wayfarer ? center(w.wayfarer) : p)) { /* w.wayfarer: the Stego Bait's lure world (game.ts) keeps where you strike from */ e.stegoTailHp -= s.stegoHp - hp; if (e.stegoTailHp <= 0) stegoSever(e, s, w); }
  s.stegoHp = hp;
  if (s.attack !== "stegoBreach") { const water = stegoOnWater(e, w), swim = !water ? 0 : !s.attack && d > S.water.surface && !s.stegoClimbing ? 1 : 2; if (swim === 1) e.untargetable = true; else if (e.stegoSwim === 1 && !s.evade) e.untargetable = false; e.stegoSwim = swim; }
  if (s.stegoStagger > 0) { s.stegoStagger -= dt; e.stegoPose = s.stegoStagger > 0 ? "stagger" : null; return s.stegoStagger > 0; }
  if (s.attack || s.broken > 0 || e.hitStun > 0 || s.evade) { s.stegoHop = null; return false; }
  if (s.stegoClimbing) { if (!w.climbFree) { s.stegoClimbing = null; return false; } return stegoClimbStep(e, s, w, p, d); }
  if (e.stegoClimb > 0 && w.stegoRoute && s.stegoRoute > 0 && stegoChase(e, s, w, p, d)) return true; // on along its route (the next face, or on foot as it comes down)
  if (e.stegoClimb > 0) { e.stegoClimb = Math.max(0, e.stegoClimb - dt / S.climb.down); e.stegoPose = e.stegoClimb > 0 ? "climb" : null; if (!(e.stegoClimb > 0)) e.stegoClimbDir = null; return e.stegoClimb > 0; }
  if (s.stegoHop) { const h = s.stegoHop, step = S.hop.distance / S.hop.time * dt; h.left -= dt; w.move(e, h.x * step, h.y * step); e.stegoAir = Math.sin(Math.PI * Math.min(1, 1 - Math.max(0, h.left) / S.hop.time)) * S.hop.height; e.stegoPose = "hop"; if (h.left <= 0) { s.stegoHop = null; e.stegoAir = 0; e.stegoPose = null; } return true; }
  if (e.stegoPose === "graze" || e.stegoPose === "stagger") e.stegoPose = null;
  // its body turns toward you at its own pace: get behind it, and it bucks
  stegoTurnToward(e, p.x, p.y, dt);
  if (s.gap <= 0 && attackReady(e, s, w, "stegoBuck", d)) { s.state = "attack"; s.last = "stegoBuck"; beginAttack(e, s, "stegoBuck", w); return true; }
  if (s.gap <= 0 && (s.cd.stegoInfight || 0) <= 0 && e.stegoSwim !== 1) {
    const prey = stegoPreyNear(e, w);
    if (prey) { s.cd.stegoInfight = S.infight.every; s.infights = (s.infights || 0) + 1;
      if (hashSeed(`${e.id}:infight:${s.infights}`) % 100 < S.infight.chance) { const id = distance(prey, e) >= ATTACK_MODULES.stegoPounce.range[0] ? "stegoPounce" : "stegoTailWhack"; s.state = "attack"; s.last = id; beginAttack(e, s, id, w, prey); return true; } }
  }
  // walled off, out of sight or on another level: it chases along the game's way round, climbing where the way goes up or over
  if (w.stegoRoute) { if (e.stegoSwim === 0 && stegoChase(e, s, w, p, d)) return true; }
  // without that search (a bare world): walled off, it digs its claws and spikes in and climbs straight over toward you
  else if (w.climbFree && e.stegoSwim === 0 && d > S.climb.near + bodyRadius(e)) {
    const gain = (s.stegoPrevD ?? d + 1) - d; s.stegoStuck = s.moveFailed && gain < .02 ? (s.stegoStuck || 0) + dt : 0; s.stegoPrevD = d;
    if (s.stegoStuck >= S.climb.stuck) { s.stegoStuck = 0; s.stegoPrevD = null; s.stegoClimbing = { left: S.climb.time, spent: 0 }; return stegoClimbStep(e, s, w, p, d); }
  } else { s.stegoStuck = 0; s.stegoPrevD = null; }
  s.stegoHopIn = (s.stegoHopIn ?? stegoHopGap(e, s)) - dt;
  if (s.stegoHopIn <= 0 && e.stegoSwim === 0 && d <= S.hop.sight) {
    s.stegoHops = (s.stegoHops || 0) + 1; const h = hashSeed(`${e.id}:hop:${s.stegoHops}`), to = unit(p.x - e.x, p.y - e.y), side = h % 2 ? 1 : -1, fwd = d > 3 ? .6 : -.3, v = unit(to.x * fwd - to.y * side, to.y * fwd + to.x * side);
    s.stegoHop = { x: v.x, y: v.y, left: S.hop.time }; s.stegoHopIn = stegoHopGap(e, s); return true;
  }
  return false;
}

// ---------------------------------------------------------------- the Spinosaurus (SPINO): body, prey, shed
function spinoHeading(e) { const h = e.spinoHeading; return h && Number.isFinite(h.x) && Number.isFinite(h.y) && (h.x || h.y) ? h : { x: e.facingX < 0 ? -1 : 1, y: 0 }; }
function spinoFace(e, v) { const u = unit(v.x, v.y); e.spinoHeading = { x: u.x, y: u.y }; if (Math.abs(u.x) > .05) e.facingX = u.x >= 0 ? 1 : -1; }
function spinoBack(e) { const h = spinoHeading(e); return { x: -h.x, y: -h.y }; }
const spinoWindup = (s, id) => (ATTACK_MODULES[id].windup || .5) * (s.paced ? BOSS_PACE.windup : 1);
function spinoReach(e, t, max) { const dx = t.x - e.x, dy = t.y - e.y, m = Math.hypot(dx, dy); return m <= max ? { x: t.x, y: t.y } : { x: e.x + dx / m * max, y: e.y + dy / m * max }; }
const spinoLanding = (e, w, t) => stegoLanding(e, w, t);
function inTriangle(p, a, b, c) { const s1 = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x), s2 = (c.x - b.x) * (p.y - b.y) - (c.y - b.y) * (p.x - b.x), s3 = (a.x - c.x) * (p.y - c.y) - (a.y - c.y) * (p.x - c.x); return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0); }
const spinoPreyAlive = (w, id) => stegoPreyAlive(w, id);
const spinoQuarry = (s, w) => stegoQuarry(s, w);
function spinoFxCount(w, owner, kind) { let n = 0; for (const f of voidEffects(w)) if (f.kind === kind && f.owner === owner && (f.life > 0 || f.arming > 0)) n++; return n; }
const spinoBig = (q) => !!(q.boss || q.worldBeast || q.questingBeast || q.stegoRoom || spinoTuned(q) || SPINO.hunt.kinds.includes(q.kind));
// A wound on a creature. A beast (or a boss, or a big-room beast) is never taken below SPINO.hunt.floor of its health by it.
function spinoWound(w, source, q, amount) {
  if (!q || q.dead || !(amount > 0)) return false;
  const n = spinoBig(q) ? Math.min(amount, Math.max(0, (Number(q.hp) || 0) - Math.ceil((Number(q.maxHp) || 1) * SPINO.hunt.floor))) : amount;
  return n > 0 ? !!w.hurtCreature?.(source, q, n) : false;
}
const spinoPreyBlow = (q, dmg) => Math.max(dmg, Math.ceil((Number(q.maxHp) || 1) * (SPINO.hunt.kinds.includes(q.kind) ? SPINO.hunt.beastShare : SPINO.infight.share)));
function spinoBleedCreature(q) { if (q?.kind === "wildStego" && !q.dead) { q.spinoBleed = BLEED.seconds; if (!Number.isFinite(q.spinoBleedTick)) q.spinoBleedTick = BLEED.tick; } } // only the Wild Stegosaurus bleeds
// A blow lands on whatever `test` holds: you (bleed and the bite mark if it says so), and its prey when the move is aimed at one.
function spinoStrike(e, s, w, id, test, o = {}) {
  const dmg = Math.max(1, Math.ceil(damageOf(e, id) * (o.share ?? 1))), prey = spinoPreyAlive(w, s.data?.prey); let landed = false;
  if (test(center(w.player)) && (!w.los || w.los(e, w.player, !!o.cover)) && !(o.cover && w.sunfallShaded?.(e))) {
    landed = !!w.hurt(e, dmg, { jumpable: false, source: id, ...(o.piercing ? { piercing: true } : {}), ...(o.beam ? { beam: true } : {}) });
    if (landed && o.bleed) w.bleed?.(e); if (landed && o.bite) w.biteMark?.(e);
  }
  if (prey && test(center(prey))) { spinoWound(w, e, prey, spinoPreyBlow(prey, dmg)); if (o.bleed) spinoBleedCreature(prey); landed = true; }
  return landed;
}
// The prey it hunts first: the Wild Stegosaurus or the Briar Stag, standing its ground within sight (the nearest).
export const spinoPreferredPrey = (q, e) => !!q && q !== e && !q.dead && SPINO.hunt.kinds.includes(q.kind) && !q.retreating && !q.passingBeast && !q.fleeTo && !q.untargetable && !q.hidden && !q.illusion && !q.spinoHeldBy;
function spinoPreferred(e, w) { let best = null, bd = SPINO.hunt.sight; for (const q of w.enemies || []) { if (!spinoPreferredPrey(q, e)) continue; const dd = distance(q, e); if (dd < bd) { bd = dd; best = q; } } return best; }
// What else it turns on: ordinary creatures and wildlife it sees (the Wild Stegosaurus's rule), never another Spinosaurus.
export const spinoPrey = (q, e) => stegoPrey(q, e) && !SPINO.hunt.kinds.includes(q.kind) && !q.spinoHeldBy;
function spinoPreyNear(e, w) { let best = null, bd = SPINO.infight.range + bodyRadius(e); for (const q of w.enemies || []) { if (!spinoPrey(q, e)) continue; const dd = distance(q, e); if (dd < bd && (!w.los || w.los(e, q))) { bd = dd; best = q; } } return best; }
function spinoCan(e, s, w, id) {
  if (SPINO.fossilOnly.includes(id) && !e.spinoFossil) return false; // its bones are a weapon only once its flesh is gone
  const behind = inArc(e, center(w.player), spinoBack(e), Infinity, SPINO.claw.behind);
  if (id === "spinoBite" || id === "spinoClaw") return !behind;
  if (id === "spinoTailSwipe") return !inArc(e, center(w.player), spinoHeading(e), Infinity, SPINO.tail.front); // its tail sweeps what is behind and beside it
  return true;
}
// Is a creature still in its jaws? (Its holder alive, mid-grab, holding this one.)
function spinoHolds(q, w) { const h = (w.enemies || []).find((x) => x.id === q.spinoHeldBy); if (h && !h.dead && h.pack?.spinoHolding === q.id) { q.aloft = false; return true; } delete q.spinoHeldBy; return false; }
// Lets go of whatever it held (a grab broken off by a stagger, its death or a reload).
function spinoLetGo(e, s, w) {
  const held = s.spinoHolding; s.spinoHolding = null; e.spinoGrab = null; if (!held) return;
  if (held === "player") w.release?.(e); else { const q = (w.enemies || []).find((x) => x.id === held); if (q?.spinoHeldBy === e.id) delete q.spinoHeldBy; }
}
// Every fighting frame, before the shared brain: the shed, a broken-off grab, its prey first, then one-off jumps and grabs at other
// creatures. True when it has spent the frame.
function spinoTick(e, s, w, p, d) {
  const S = SPINO, dt = w.dt, hp = Number(e.hp) || 0;
  if (!e.spinoHeading) spinoFace(e, unit(p.x - e.x, p.y - e.y));
  if (s.spinoHolding && s.attack !== "spinoGrab") spinoLetGo(e, s, w);
  if (!e.spinoFossil && hp > 0 && hp <= (Number(e.maxHp) || 0) * S.fossil.at) { // its flesh falls away, for good
    if (s.attack) { if (s.spinoHolding) spinoLetGo(e, s, w); endAttack(e, s); }
    e.spinoFossil = true; e.spinoShed = 0; e.spinoAir = 0; e.spinoDig = 0; s.spinoShedding = S.fossil.shed; e.spinoPose = "shed";
    for (let i = 0; i < S.fossil.chunks; i++) { const a = (hashSeed(`${e.id}:shed`) % 628) / 100 + i * TAU / S.fossil.chunks; w.addEffect({ kind: "spinoFlesh", owner: e.id, x: e.x, y: e.y, vx: Math.cos(a) * S.fossil.chunkSpeed, vy: Math.sin(a) * S.fossil.chunkSpeed, radius: .3, arming: 0, life: S.fossil.chunkLife, total: S.fossil.chunkLife, damage: 0 }); }
    w.say?.(S.text.fossil); w.spinoFossil?.(e);
  }
  if (s.spinoShedding > 0) { s.spinoShedding -= dt; e.spinoShed = Math.min(1, 1 - Math.max(0, s.spinoShedding) / S.fossil.shed); e.spinoPose = s.spinoShedding > 0 ? "shed" : null; return s.spinoShedding > 0; }
  if (e.spinoFossil && !(e.spinoShed >= 1)) e.spinoShed = 1;
  if (e.spinoArriving > 0) { e.spinoArriving -= dt; e.spinoPose = e.spinoArriving > 0 ? "roar" : null; return e.spinoArriving > 0; } // an interloper roars as it comes in
  // its prey first: now and then (`refocus` s on its prey, `refocusYou` on you; the clock runs through its moves too) it turns on the stego or the stag in sight, else on you
  s.spinoRefocus = (s.spinoRefocus ?? 0) - dt;
  if (s.spinoRefocus <= 0 && !s.attack) { const near = spinoPreferred(e, w); s.spinoFocusN = (s.spinoFocusN || 0) + 1; s.spinoFocus = near && hashSeed(`${e.id}:focus:${s.spinoFocusN}`) % 100 < S.hunt.chance ? near.id : null; s.spinoRefocus = s.spinoFocus ? S.hunt.refocus : S.hunt.refocusYou; }
  if (s.attack || s.broken > 0 || e.hitStun > 0 || s.evade) return false;
  if (e.spinoPose === "shed" || e.spinoPose === "roar") e.spinoPose = null;
  const focus = s.spinoFocus ? (w.enemies || []).find((q) => q.id === s.spinoFocus && spinoPreferredPrey(q, e)) || null : null; if (!focus) s.spinoFocus = null;
  const at = focus || p;
  { const h = spinoHeading(e), cur = Math.atan2(h.y, h.x), diff = ((Math.atan2(at.y - e.y, at.x - e.x) - cur) % TAU + TAU * 1.5) % TAU - Math.PI, a = cur + Math.max(-S.turn * dt, Math.min(S.turn * dt, diff)); spinoFace(e, { x: Math.cos(a), y: Math.sin(a) }); }
  if (focus) {
    const fd = distance(focus, e);
    if (s.gap <= 0) {
      const ready = S.hunt.moves.filter((id) => { const A = ATTACK_MODULES[id]; return (e.packAttacks || []).includes(id) && !((s.cd[id] || 0) > 0) && fd >= A.range[0] && fd <= A.range[1] + bodyRadius(e); });
      if (ready.length) { const id = ready[hashSeed(`${e.id}:prey-pick:${s.seq}`) % ready.length]; s.state = "attack"; s.last = id; beginAttack(e, s, id, w, focus); return true; }
    }
    if (fd > bodyRadius(e) + bodyRadius(focus) + .8) { const v = unit(focus.x - e.x, focus.y - e.y), step = .82 * S.hunt.speed * (e.speedMultiplier || 1) * dt; w.move(e, v.x * step, v.y * step); }
    return true;
  }
  // a creature it sees: a one-off jump or grab
  if (s.gap <= 0 && (s.cd.spinoInfight || 0) <= 0) {
    const prey = spinoPreyNear(e, w);
    if (prey) { s.cd.spinoInfight = S.infight.every; s.infights = (s.infights || 0) + 1;
      if (hashSeed(`${e.id}:infight:${s.infights}`) % 100 < S.infight.chance) { const id = distance(prey, e) >= ATTACK_MODULES.spinoBodySlam.range[0] && (e.packAttacks || []).includes("spinoBodySlam") ? "spinoBodySlam" : "spinoGrab"; s.state = "attack"; s.last = id; beginAttack(e, s, id, w, prey); return true; } }
  }
  return false;
}

export function updatePackMonster(e, w) {
  if (e.kind === "mothChrysalis") { e.facingX = 1; return; } // release 708: it only hangs there
  if(e.kind === "voidWalker" && e.astralAllyOf && !w.astralAllyContext) { updateAstralWalkerAllyFixture(e,w.enemies.find(q=>q.id===e.astralAllyOf),w); return; }
  const def = packDefinition(e);
  if (!def) return;
  if (e.pack && w.dt > 0) { if (w.bossPace && bossPaced(e)) e.pack.paced = true; else delete e.pack.paced; } // release 421 (a paused frame changes nothing)
  if (e.kind === "astralWorm" || e.kind === "astralMirage") { if (w.dt > 0) updateAstralActor(e, w); return; }
  if (e.kind === "voidWalker" && !(w.dt > 0)) return;
  if (e.dead) { if (e.kind === "voidWalker") { voidClear(e, w); if (e.pack?.attack) endAttack(e, e.pack); } if (e.gloomDark) gloomDarkEnd(e, w, false); if (e.kind === "spinoRex" && e.pack) spinoLetGo(e, e.pack, w); return; }
  if (e.spinoHeldBy && spinoHolds(e, w)) return; // in the Spinosaurus's jaws: it does nothing until let go
  const s = e.pack && e.pack.v === MONSTER_PACK_VERSION ? e.pack : (e.pack = freshPackState()), dt = w.dt;
  if (e.kind === "wildStego" && e.spinoBleed > 0) { const n = tickCreatureBleed(e, dt); if (n > 0) spinoWound(w, null, e, n); if (e.dead) return; } // the Spinosaurus's bleed runs its minute (BLEED)
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
  if (e.roofDweller && (e.roofWake > 0 || e.roofReturning)) { if (e.roofWake > 0) e.facingX = (w.player.x - e.x) >= 0 ? 1 : -1; return; } // roof-dwellers.ts: waking, or flying home to its perch
  if (e.illusion && (w.now - (e.bornAt || 0)) > 14000) { e.dead = true; return; }
  if (e.gloomOrbOf && gloomShadeTick(e, w)) return; // the Gloomvast's decoys go with its Dark
  if (e.kind === "gloomvast" && gloomVastTick(e, s, w)) return; // its Dark, the reveal, and calling the next
  const p = center(w.player), d = distance(p, e), brain = BRAINS[e.brain || def.brain], roaming = isDungeonRoamer(e, w.area), hunting = isDungeonHunter(e, w.area);
  // Release 287 (Tim: "the crystal doesn't have to aggro to you, he can just be wandering around... if you touch him, or if
  // you attack him, he'll aggro"): a roaming dungeon Crystal ignores the Wayfarer until touched or hurt (hits alert it).
  const calmCrystal = roaming && e.kind === "psychicCrystal";
  if (calmCrystal && !e.aggro) { if (d < CRYSTAL.touchAggro || (Number.isFinite(s.calmHp) && e.hp < s.calmHp)) e.aggro = true; s.calmHp = e.hp; }
  else if (!e.aggro && d < (hunting ? CRYSTAL.roamSight : brain?.hiddenUntilAggro ? 4.2 : 7) && (!hunting || w.los(e, w.player)) && (!brain?.cone || advSees(e, w, p, d))) e.aggro = true; // a patrol sees only in its lamp's cone
  e.hidden = !!(brain?.hiddenUntilAggro && !e.aggro) || (s.attack === "burrowAmbush" && ["travel", "erupt"].includes(s.phase)) || (e.kind === "sinkmaw" ? e.advBuried !== false : !!e.advBuried);
  if (e.kind === "spinoRex" && !e.aggro && spinoPreferred(e, w)) e.aggro = true; // it scents its prey before it sees you
  if (!e.aggro) {
    if (def.adventureKin && advIdle(e, s, w)) return; // adventure-creatures.ts: a loop, a burial, a perch
    if (hunting && e.kind === "voidWalker") { w.walkerPatrol?.(e, s); return; }
    if (e.kind === "wildStego" && stegoIdle(e, s, w)) return; // it grazes
    if (roaming) { patrolDungeon(e, s, w); return; }
    s.wander = ((s.wander ?? (hashSeed(e.id) % 628) / 100) + dt / 2.4) % TAU;
    if (!brain?.hiddenUntilAggro) w.move(e, Math.cos(s.wander) * .28 * dt, Math.sin(s.wander * .8) * .28 * dt, { phase: false });
    return;
  }
  // Release 259: a dungeon Crystal that has lost the Wayfarer for a while goes back to its patrol.
  if (roaming && !e.retreating) { const seen = d <= CRYSTAL.roamSight || w.los(e, w.player); s.lostFor = seen ? 0 : (s.lostFor || 0) + dt; if (s.lostFor >= CRYSTAL.forgetAfter && !s.attack) { e.aggro = false; s.lostFor = 0; s.manifest = null; s.wallTime = 0; s.roam = null; patrolDungeon(e, s, w); return; } }
  if (def.adventureKin && advTick(e, s, w, p, d)) return;
  if (e.kind === "wildStego" && stegoTick(e, s, w, p, d)) return; // STEGO: its tail, water, climbing, hops, buck and infighting
  if (e.kind === "spinoRex" && spinoTick(e, s, w, p, d)) return; // SPINO: the fossil shed, its prey first, one-off jumps and grabs
  if (def.duelistKin && duelHopStep(e, s, w)) return; // the Gaunt: a hop in flight always lands
  if (e.hitStun > 0 && s.state === "move") return;
  if (e.hitStun > 0 && s.attack && s.phase === "windup" && !e.untargetable && windupHeld(e, s.data ||= {}, dt)) return; // release 561: held, never cancelled
  if (def.duelistKin && duelTick(e, s, w, p, d)) return; // the Gaunt: hops in, out, aside and up (never while stunned)
  if (!e.illusion) passiveStillness(e, s, w);
  if (e.kind === "morphingBlob") blobPassive(e, s, w, p, d);
  if (e.kind === "lightningGiant") { giantPassive(e, w); if (giantTraverse(e, s, w)) return; }
  if (e.kind === "briarStag") stagPassive(e, w); // release 705
  if (e.kind === "ashenMoth") mothPassive(e, w); // release 706
  if (e.blobletOf && blobletHome(e, s, w)) return;
  if (e.wormOf && tentacleTurret(e, s, w, p)) return;
  if (e.kind === "tremorWorm" && wormCycle(e, s, w, p)) return;
  if (e.kind === "psychicCrystal" && crystalPoise(e, s, w, p)) return; // release 259: a poise break grounds it
  if (bossPoiseOf(e) && s.attack !== "dragonColonize" && bossPoise(e, s, w)) return; // release 307: every boss can be staggered (709: not while it claims the ground)
  if (roaming && crystalManifest(e, s, w)) return; // release 285: before evading or attacking, so neither keeps it in the walls
  if (e.kind === "voidWalker" ? voidEvade(e, s, w, p, d) : e.evasive && s.attack !== "dragonColonize" && evade(e, s, w, p, d)) return;
  if (s.attack) {
    s.t -= dt;
    RUN[s.attack]?.(e, s, w);
    if (s.attack && s.phase === "recover" && s.t <= 0) endAttack(e, s);
    return;
  }
  if (e.kind === "crimsonTyrant" && w.dragonDue?.(e)) { s.state = "attack"; s.last = "dragonColonize"; beginAttack(e, s, "dragonColonize", w); return; } // release 709: its clock, not its choice
  // The Weeping Saint never moves or starts an attack while the Wayfarer faces it.
  if ((e.brain || def.brain) === "weeping") {
    const f = w.playerFacing || { x: 0, y: 1 }, to = unit(e.x - p.x, e.y - p.y);
    e.watched = d < 11 && (f.x * to.x + f.y * to.y) > .3;
    if (e.watched) return;
  }
  // Move according to the brain, then start the best ready attack.
  const move = MOVEMENT_MODES[e.movement] || MOVEMENT_MODES.walk, raw = roaming && (e.inRock || !w.los(e, w.player)) ? { ...unit(p.x - e.x, p.y - e.y), speed: .95 } : def.duelistKin ? duelVector(e, s, w, p, d) : brainVector(e, s, w, def), v =e.evasive ? fluid(s, raw, dt) : raw, m = Math.hypot(v.x, v.y) || 1, speed = .82 * v.speed * move.speed * (e.speedMultiplier || 1) * (e.giantCharged > 0 ? GIANT.chargeSpeed : 1) * (e.stagHunt > 0 ? STAG.hunt.speed : 1) * (e.mothKindled > 0 ? MOTH.kindle.speed : 1) * (e.stegoSwim === 1 ? STEGO.water.swimSpeed : 1) * dt;
  const hold = def.adventureKin && advHold(e), moved = hold || w.move(e, v.x / m * speed, v.y / m * speed, { phase: !!move.phases });
  s.moveFailed = !moved; if (!moved && !move.phases) w.detour?.(e, speed);
  if (def.duelistKin) s.duelStuck = moved ? 0 : (s.duelStuck || 0) + dt; // the Gaunt: walled in on foot for a while, it hops (duelTick)
  e.facingX = e.kind === "wildStego" ? (stegoHeading(e).x >= 0 ? 1 : -1) : e.kind === "spinoRex" ? (spinoHeading(e).x >= 0 ? 1 : -1) : (p.x - e.x) >= 0 ? 1 : -1;
  if (s.gap > 0) return;
  if (hunting && (e.inRock || !w.los(e, w.player))) return; // move toward the player first; never begin a grab/sky attack from an unseen room (release 437: nor from inside rock; it comes out to you first)
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
export const STAGGER_GOVERNOR = { limit: { revenant: .6, boss: .9, elite: 1.3, ordinary: .6 }, decay: .2, guard: 3, guardBy: { ordinary: 1.5 } };
// Release 561 (Tim, 2026-10-29: "they can get stunlocked... when monsters are winding up to attack. If I just shoot them,
// they won't attack... They should... finish their attack... they can get stunned for a second. But after the stun... they
// should finish their attack... only monsters that we've... specified have poise... everything gets hitstun, that's fine...
// But it's way too easy to stun lock everything"): a blow during an attack's windup only holds the windup, for at most `max`
// seconds of each attack in all; then the foe shrugs the stun off and the attack lands. Ordinary creatures join the stagger
// governor too (class "ordinary": `limit` s of stun, then `guardBy.ordinary` s in which blows land but do not stun).
export const WINDUP_STAGGER = { max: .35 };
// Call while hit-stunned during a windup; `held` is the attack's own record. True while the windup may still be held.
export function windupHeld(e, held, dt) { held.windupStagger = (held.windupStagger || 0) + dt; if (held.windupStagger < WINDUP_STAGGER.max) return true; e.hitStun = 0; return false; }
export function staggerClass(e) { return e?.gatePredator ? "revenant" : e?.boss || e?.marginWarden /* release 459 */ || e?.fracWarden /* release 666 */ || e?.worldBeast || e?.stegoRoom || e?.spinoRoom || e?.spinoInterloper || e?.questingBeast || e?.farArrayBoss || ["gateWarden", "objectiveGuardian", "wingMiniboss", "finalBoss"].includes(e?.dungeonRole) ? "boss" : e?.eliteId || e?.elite ? "elite" : null; }
// Call after the frame's hit-stun countdown. Returns true while the foe is guarded (it shrugs stuns off).
export function staggerGovernor(e, dt) {
  const k = staggerClass(e) || "ordinary"; // release 561: ordinary creatures cannot be stun-locked either
  const G = STAGGER_GOVERNOR;
  if (e.staggerGuard > 0) { e.staggerGuard -= dt; e.hitStun = 0; if (e.staggerGuard <= 0) delete e.staggerGuard; return true; }
  if (e.hitStun > 0) e.staggerMeter = (e.staggerMeter || 0) + dt; else if (e.staggerMeter) { e.staggerMeter -= G.decay * dt; if (e.staggerMeter <= 0) delete e.staggerMeter; } // no field until there is something to count
  if (e.staggerMeter >= G.limit[k]) { delete e.staggerMeter; e.staggerGuard = G.guardBy[k] ?? G.guard; e.hitStun = 0; return true; }
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
  const ref = stageOneBeastReference(save, { level, perHit: Math.max(6, (Number(weapon?.power) || 6) + (Number(stats.weaponBonus ?? stats.meleeBonus) || 0)), maxHp: Number(save.maxHp) || 60, guard: Math.max(0, Math.min(.75, Number(stats.damageReduction) || 0)) });
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
// Release 748 (Tim, 2026-11-04): what lies on the ground (pools, trails, webs, tar, brambles) is met at the Wayfarer's feet; on a
// mount that is the mount's feet (`w.feet`), while blows, shots, blasts and beams meet the rider where drawn (`w.player`).
export const GROUND_EFFECTS = new Set(["web", "ooze", "lava", "flameTrail", "frostTrail", "flesh", "briar", "darkPool", "doomTar", "mire", "censerSmoke", "iceSlick", "slagPool", "lampFire"]);
export function tickPackEffects(effects, world) {
  if (!(world.dt > 0)) return effects;
  const body0 = center(world.player), feet0 = world.feet ? center(world.feet()) : body0;
  // New effects wait until the next tick: an emitter cannot recursively simulate its own new outputs this frame.
  for (const f of [...effects]) {
    // The Stego Bait (stego-bait.ts): a lured creature's effects meet the bait in the Wayfarer's place (game.ts stegoLureWorld).
    const lured = world.lureWorldFor?.(f.owner) || null, w = lured || world, body = lured ? center(w.player) : body0, feet = lured ? body : feet0;
    const p = GROUND_EFFECTS.has(f.kind) ? feet : body; // release 748: a ground pool at the feet, everything else at the body
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
      if (f.burst && !f.burstDone && f.life - w.dt <= 0) { f.burstDone = true; if (distance(body, f) <= TURTLE.iceBurstRadius + .2) w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.burst, { jumpable: false, source: "iceBurst" }); w.addEffect({ kind: "iceBurst", owner: f.owner, x: f.x, y: f.y, radius: TURTLE.iceBurstRadius, arming: 0, life: .45, total: .45, damage: 0 }); }
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
    else if (f.kind === "wormCracks") { /* release 664: where a tentacle will rise; harmless, drawn only */ }
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
    else if (f.kind === "orb") { if (f.homing > 0 && f.age <= f.homing) { const sp = Math.hypot(f.vx, f.vy) || 1, cur = Math.atan2(f.vy, f.vx), diff = ((Math.atan2(p.y - f.y, p.x - f.x) - cur) % TAU + TAU * 1.5) % TAU - Math.PI, a = cur + Math.max(-(f.turn || 1.5) * w.dt, Math.min((f.turn || 1.5) * w.dt, diff)); f.vx = Math.cos(a) * sp; f.vy = Math.sin(a) * sp; } /* release 664: a worm tentacle's homing orb */ f.x += f.vx * w.dt; f.y += f.vy * w.dt; if (w.tileOpen && !w.tileOpen(f.x + .5, f.y + .5)) f.life = 0; else if (!f.hit && distance(p, f) <= f.radius + .3) { f.hit = true; f.life = 0; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: false, source: "orb" }); } }
    else if (f.kind === "briar") { // release 705: the Briar Stag's brambles slow and scratch while they stand
      if (distance(p, f) <= f.radius + .1) { w.slow(STAG.briarSlow, .3); if (!(f.nextBite > f.age)) { f.nextBite = f.age + STAG.briarTick; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: true, source: "briar", beam: true }); } }
    } else if (f.kind === "thornDart") { // the Thornspitter's darts (adventure creatures): straight, stopped by walls, one hit each
      const before = { x: f.x, y: f.y }, open = w.projectileOpen || w.tileOpen; f.x += f.vx * w.dt; f.y += f.vy * w.dt;
      if (open && !open(f.x + .5, f.y + .5)) f.life = 0;
      else if (!f.hit && segmentDistance(p, before, f) <= f.radius + .3) { f.hit = true; f.life = 0; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: false, source: "thornDarts" }); }
    } else if (f.kind === "censerPot") { // the Censer Warden's pot bursts, and leaves smoke that slows (the Lamplighter's lamp: fire)
      if (!f.detonated) { f.detonated = true; f.life = .35; if (distance(p, f) <= f.radius + .3) w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: true, source: f.lamp ? "lampFlare" : "censerLob" });
        const S = ADV.censer.smoke; if (f.fire) w.addEffect({ kind: "lampFire", owner: f.owner, x: f.x, y: f.y, radius: f.fire.radius, arming: 0, life: f.fire.life, total: f.fire.life, damage: f.fire.damage });
        else w.addEffect({ kind: "censerSmoke", owner: f.owner, x: f.x, y: f.y, radius: S.radius, arming: 0, life: S.life, total: S.life, damage: 0, slow: S.slow }); }
    } else if (f.kind === "censerSmoke" || f.kind === "iceSlick") { if (distance(p, f) <= f.radius) w.slow?.(f.slow, .25);
    } else if (f.kind === "icicle") { // the Rime Sentinel's icicle bursts, and leaves the ground slick
      if (!f.detonated) { f.detonated = true; f.life = .35; if (distance(p, f) <= f.radius + .3) w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: true, source: "icicleLine" });
        const S = ADV.icicles.slick; w.addEffect({ kind: "iceSlick", owner: f.owner, x: f.x, y: f.y, radius: S.radius, arming: 0, life: S.life, total: S.life, damage: 0, slow: S.slow }); }
    } else if (f.kind === "tollRing") { // the Knellkeeper's ring rolls out; it never touches ground higher than the bell
      const r = f.radius * (1 - Math.max(0, f.life) / (f.total || 1)); f.ring = r;
      if (!f.hit && f.damage > 0 && Math.abs(distance(p, f) - r) < ADV.toll.band && (Number(w.elevation?.(p.x, p.y)) || 0) <= (f.maxLevel || 0) + ADV.toll.above) { f.hit = true; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: true, source: "bellToll" }); }
    } else if (f.kind === "lampFire") { // the Lamplighter's spilled lamp burns a while
      if (distance(p, f) <= f.radius + .1 && !(f.nextBite > f.age)) { f.nextBite = f.age + ADV.lamp.fire.tick; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: true, source: "lampFlare", beam: true }); }
    } else if (f.kind === "slagPool") { // the Slagwright's slag: it burns, then runs on down to lower ground (ADV.slag)
      if (distance(p, f) <= f.radius + .1 && !(f.nextBite > f.age)) { f.nextBite = f.age + ADV.slag.tick; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: false, source: "slagPour", beam: true }); }
      f.flowIn = (f.flowIn ?? 0) - w.dt;
      if (f.steps > 0 && f.flowIn <= 0 && w.elevation) { const here = Number(w.elevation(f.x, f.y)) || 0; let best = null;
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const q = { x: Math.round(f.x) + dx, y: Math.round(f.y) + dy }, lv = Number(w.elevation(q.x, q.y)) || 0; if (lv < here && w.open(q.x, q.y) && (!best || lv < best.lv)) best = { ...q, lv }; }
        if (best) w.addEffect({ kind: "slagPool", owner: f.owner, x: best.x, y: best.y, radius: f.radius, arming: .35, life: ADV.slag.life, total: ADV.slag.life, damage: f.damage, steps: f.steps - 1, flowIn: ADV.slag.flowEvery });
        f.steps = 0; }
    } else if (f.kind === "thorn" || f.kind === "clawBeam") {
      const before = { x: f.x, y: f.y }; f.x += f.vx * w.dt; f.y += f.vy * w.dt;
      if (w.tileOpen && !w.tileOpen(f.x + .5, f.y + .5)) f.life = 0;
      else if (!f.hit && segmentDistance(p, before, f) <= f.radius + .3) { f.hit = true; f.life = 0; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: false, source: f.kind === "clawBeam" ? "dragonClawSpin" : "stagThorns" }); }
    } else if (f.kind === "rootLine" || f.kind === "fireLine") { // spike by spike (release 709: the dragon's fire streaks, burst by burst) from the stag outward; each spike strikes once as it bursts
      const due = Math.floor((f.age - f.warn) / f.every);
      while (f.burst < Math.min(f.steps - 1, due)) { f.burst++; const sx = f.x + f.dx * f.burst * f.step, sy = f.y + f.dy * f.burst * f.step;
        if (!f.hit && Math.hypot(p.x - sx, p.y - sy) <= f.radius + .3) { f.hit = true; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: false, source: f.kind === "fireLine" ? "dragonSlam" : "stagRoots" }); } }
    } else if (f.kind === "dragonComet") { // release 709: the Great Flame flies to where it was aimed and bursts
      f.x += f.vx * w.dt; f.y += f.vy * w.dt; const owner = w.enemies.find((q) => q.id === f.owner) || null;
      if (f.life - w.dt <= 0 || (w.tileOpen && !w.tileOpen(f.x + .5, f.y + .5))) { f.life = 0; if (distance(p, f) <= f.blast + .2) w.hurt(owner, f.damage, { jumpable: false, source: "dragonBlast" }); w.addEffect({ kind: "dragonBurst", owner: f.owner, x: f.x, y: f.y, radius: f.blast, arming: 0, life: .5, total: .5, damage: 0 }); dragonPool(f.owner, w, f.x, f.y, DRAGON.pool.blast, Math.max(1, Math.ceil(f.damage * DRAGON.pool.bite))); }
    } else if (f.kind === "dragonScorch") { // a flame wave rolling out (ring or wedge), the ground it crossed left burning
      const D = DRAGON.wave, front = Math.min(f.reach, f.age * D.speed), d = distance(p, f), a = Math.atan2(p.y - f.y, p.x - f.x), off = Math.abs(((a - f.angle) % TAU + TAU * 1.5) % TAU - Math.PI) * 180 / Math.PI, inside = (f.arc >= 360 || off <= f.arc / 2) && d <= front;
      f.front = front; const owner = w.enemies.find((q) => q.id === f.owner) || null;
      if (!f.hit && inside && d >= front - 1.2) { f.hit = true; w.hurt(owner, f.damage, { jumpable: false, source: "dragonFlameWave" }); }
      else if (!(f.nextBite > f.age) && (() => { const dg = distance(feet, f), ag = Math.atan2(feet.y - f.y, feet.x - f.x), og = Math.abs(((ag - f.angle) % TAU + TAU * 1.5) % TAU - Math.PI) * 180 / Math.PI; return (f.arc >= 360 || og <= f.arc / 2) && dg <= front; })()) { f.nextBite = f.age + D.tick; w.hurt(owner, f.bite, { jumpable: true, source: "dragonScorch", beam: true }); } // release 748: the burning ground behind the front, at the feet
    } else if (f.kind === "dragonMeteor") { // a fireball landing: it strikes once, and some leave a pool of lava
      if (!f.detonated) { f.detonated = true; if (distance(p, f) <= f.radius + .3) w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: false, source: "dragonMeteor" }); if (f.pool) dragonPool(f.owner, w, f.x, f.y, f.pool, f.bite || 1); }
    } else if (f.kind === "doomErupt" || f.kind === "doomScale") { // release 710: black fire bursting from the ground (or a shed scale bursting), once; some leave a pool
      if (!f.detonated) { f.detonated = true; if (distance(p, f) <= f.radius + .3) w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: false, source: f.kind }); if (f.pool) doomPool(f.owner, w, f.x, f.y, f.pool, f.bite || 1); }
    } else if (f.kind === "darkPool") { // the Doom Chaser's black fire, burning where its spells fell
      if (distance(p, f) <= f.radius + .1 && !(f.nextBite > f.age)) { f.nextBite = f.age + DOOM.pool.tick; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: true, source: "darkPool", beam: true }); }
    } else if (f.kind === "doomWave") { // a crescent of dark energy rolling along the ground: it strikes once across its whole width (jump it)
      f.x += f.vx * w.dt; f.y += f.vy * w.dt; const sp = Math.hypot(f.vx, f.vy) || 1, ux = f.vx / sp, uy = f.vy / sp, rx = p.x - f.x, ry = p.y - f.y, along = rx * ux + ry * uy, across = Math.abs(ry * ux - rx * uy);
      if (!f.hit && along <= f.radius + .3 && along >= -(f.radius + .3 + sp * w.dt) && across <= f.half) { f.hit = true; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: true, source: "doomWaves" }); }
      if (w.tileOpen && !w.tileOpen(f.x + .5, f.y + .5)) f.life = Math.min(f.life, .15);
    } else if (f.kind === "doomTar") { // tar where it landed: it slows, then catches and burns
      const owner = w.enemies.find((q) => q.id === f.owner) || null, inside = distance(p, f) <= f.radius, burning = f.age - (f.armTotal || 0) >= DOOM.tar.ignite; f.lit = burning;
      if (!f.splashed) { f.splashed = true; if (distance(body, f) <= f.radius) w.hurt(owner, f.splash || f.damage, { jumpable: false, source: "doomTar" }); } // the splash strikes the body; the tar lies at the feet
      if (inside) { w.slow(DOOM.tar.slow, .25); if (burning && !(f.nextBite > f.age)) { f.nextBite = f.age + DOOM.tar.tick; w.hurt(owner, f.damage, { jumpable: true, source: "doomTarFire", beam: true }); } }
    } else if (f.kind === "doomOrb") { // hunting dark: homes for `home` s, then flies straight; bursts on whatever it meets
      if (f.age <= f.home) { const sp = Math.hypot(f.vx, f.vy) || 1, cur = Math.atan2(f.vy, f.vx), diff = ((Math.atan2(p.y - f.y, p.x - f.x) - cur) % TAU + TAU * 1.5) % TAU - Math.PI, a = cur + Math.max(-f.turn * w.dt, Math.min(f.turn * w.dt, diff)); f.vx = Math.cos(a) * sp; f.vy = Math.sin(a) * sp; }
      f.x += f.vx * w.dt; f.y += f.vy * w.dt;
      if ((w.shotBlocked ? w.shotBlocked(f.x + .5, f.y + .5) : w.tileOpen && !w.tileOpen(f.x + .5, f.y + .5)) || distance(p, f) <= f.radius + .3 || f.life - w.dt <= 0) {
        f.life = 0; if (distance(p, f) <= f.blast + .2) w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: false, source: "doomOrbs" });
        w.addEffect({ kind: "doomBurst", owner: f.owner, x: f.x, y: f.y, radius: f.blast, arming: 0, life: .4, total: .4, damage: 0 }); continue; }
    } else if (f.kind === "gloomfall") { // the Gloomvast's pools of gloom falling in, once each; one that takes you lays a curse
      if (!f.detonated) { f.detonated = true; const owner = w.enemies.find((q) => q.id === f.owner) || null; if (distance(p, f) <= f.radius + .3 && w.hurt(owner, f.damage, { jumpable: false, source: "vastGloomfall" }) && f.curse) w.curse?.(owner, f.curse); }
    } else if (f.kind === "gloomMote") { // its Grave Lights: home for `home` s, then fly straight; one that reaches you lays a curse
      if (f.age <= f.home) { const sp = Math.hypot(f.vx, f.vy) || 1, cur = Math.atan2(f.vy, f.vx), diff = ((Math.atan2(p.y - f.y, p.x - f.x) - cur) % TAU + TAU * 1.5) % TAU - Math.PI, a = cur + Math.max(-f.turn * w.dt, Math.min(f.turn * w.dt, diff)); f.vx = Math.cos(a) * sp; f.vy = Math.sin(a) * sp; }
      const before = { x: f.x, y: f.y }; f.x += f.vx * w.dt; f.y += f.vy * w.dt;
      if (w.shotBlocked ? w.shotBlocked(f.x + .5, f.y + .5) : w.tileOpen && !w.tileOpen(f.x + .5, f.y + .5)) { f.life = 0; continue; }
      if (segmentDistance(p, before, f) <= f.radius + .3) { f.life = 0; const owner = w.enemies.find((q) => q.id === f.owner) || null; if (w.hurt(owner, f.damage, { jumpable: false, source: "vastLights" }) && f.curse) w.curse?.(owner, f.curse); continue; }
      if (!w.enemies.some((q) => q.id === f.owner && !q.dead) && f.life > .3) f.life = .3; // they go out with it
    } else if (f.kind === "dragonNova" || f.kind === "dragonBurst" || f.kind === "colonize" || f.kind === "doomBurst") { /* drawn only */
    } else if (f.kind === "gale") { // release 708: a giant whirlwind rolling about, rebounding off walls and the section's edges
      const G = MOTH.gale, turn = Math.sin(f.age * .8 + (f.seed % 100)) * .6 * w.dt, c = Math.cos(turn), sn = Math.sin(turn); [f.vx, f.vy] = [f.vx * c - f.vy * sn, f.vx * sn + f.vy * c];
      let nx = f.x + f.vx * w.dt, ny = f.y + f.vy * w.dt; const lo = G.edge, hi = 31 - G.edge;
      if (nx < lo || nx > hi || (w.tileOpen && !w.tileOpen(nx + .5, f.y + .5))) { f.vx = -f.vx; nx = f.x; }
      if (ny < lo || ny > hi || (w.tileOpen && !w.tileOpen(f.x + .5, ny + .5))) { f.vy = -f.vy; ny = f.y; }
      f.x = nx; f.y = ny;
      if (distance(p, f) <= f.radius) { w.pull?.(f, G.pull * w.dt, f.radius + .5); w.slow(G.slow, .3); if (!(f.nextBite > f.age)) { f.nextBite = f.age + G.tick; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: false, source: "mothGale", beam: true }); } }
      if (!w.enemies.some((q) => q.id === f.owner && !q.dead) && f.life > 1) f.life = 1;
    } else if (f.kind === "silk") { // release 708: the Moth's threads, homing for `home` s, a trail of silk behind
      if (f.age <= f.home) { const sp = Math.hypot(f.vx, f.vy) || 1, cur = Math.atan2(f.vy, f.vx), diff = ((Math.atan2(p.y - f.y, p.x - f.x) - cur) % TAU + TAU * 1.5) % TAU - Math.PI, a = cur + Math.max(-f.turn * w.dt, Math.min(f.turn * w.dt, diff)); f.vx = Math.cos(a) * sp; f.vy = Math.sin(a) * sp; }
      const before = { x: f.x, y: f.y }; f.x += f.vx * w.dt; f.y += f.vy * w.dt; (f.trail ||= []).push([before.x, before.y]); if (f.trail.length > f.trailMax) f.trail.shift();
      const owner = w.enemies.find((q) => q.id === f.owner) || null, burst = () => { if (f.big) { if (distance(p, f) <= f.blast + .3) w.hurt(owner, f.damage, { jumpable: false, source: "mothThreadBlast" }); w.addEffect({ kind: "dust", owner: f.owner, x: f.x, y: f.y, radius: f.blast, arming: 0, life: .5, damage: 0 }); } };
      if (w.tileOpen && !w.tileOpen(f.x + .5, f.y + .5)) { burst(); f.life = 0; }
      else if (!f.hit && segmentDistance(p, before, f) <= f.radius + .3) { f.hit = true; f.life = 0; if (f.big) burst(); else w.hurt(owner, f.damage, { jumpable: false, source: "mothThreads" }); }
    } else if (f.kind === "burnTree") { // release 708: grows, burns (touch it and you burn), then explodes in splinters
      const G = STAG.grove, owner = w.enemies.find((q) => q.id === f.owner) || null, d = distance(p, f);
      if (f.age >= f.grow && f.age < f.grow + f.burn && d <= f.radius + .25 && !(f.nextBite > f.age)) { f.nextBite = f.age + G.touchEvery; if (w.hurt(owner, Math.max(1, Math.ceil(f.damage * G.touchShare)), { jumpable: false, source: "burnTree" })) w.ignite?.(G.igniteFor, Math.max(1, Math.ceil(f.damage * G.igniteShare))); }
      if (!f.burst && f.age >= f.grow + f.burn) { f.burst = true;
        if (d <= G.blast + .3) w.hurt(owner, f.damage, { jumpable: false, source: "burnTreeBlast" });
        for (let i = 0; i < G.splinters; i++) { const a = (f.seed % 628) / 100 + i * Math.PI * 2 / G.splinters; w.addEffect({ kind: "thorn", ember: true, owner: f.owner, x: f.x, y: f.y, vx: Math.cos(a) * G.splinterSpeed, vy: Math.sin(a) * G.splinterSpeed, radius: STAG.thornRadius, arming: 0, life: G.splinterLife, damage: Math.max(1, Math.ceil(f.damage * G.splinterShare)) }); } }
    } else if (f.kind === "birdDive") { // a bird stooping along its line once the line has shown
      const t = f.age - (f.armTotal || 0), a = Math.max(0, (t - w.dt) * f.speed), b = Math.min(f.length, t * f.speed);
      f.bx = f.x + f.dx * b; f.by = f.y + f.dy * b;
      if (!f.hit && b > a && segmentDistance(p, { x: f.x + f.dx * a, y: f.y + f.dy * a }, { x: f.bx, y: f.by }) <= f.radius + .3) { f.hit = true; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: false, source: "stagBirds" }); }
    } else if (f.kind === "mire") { /* the Game reads it: soft ground (stagMireAt) */
    } else if (f.kind === "rootRing") {
      if (!f.detonated) { f.detonated = true; const d = distance(p, f), gap = Math.PI * 2 / f.spikes, a = ((Math.atan2(p.y - f.y, p.x - f.x) - f.turn) % gap + gap) % gap, near = Math.min(a, gap - a) * f.ring;
        if (Math.abs(d - f.ring) <= f.radius + .3 && near <= f.radius + .3) w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: false, source: "rootRing" }); }
    }
    else if (f.kind === "stegoDust") { /* the wheel's dust devils: they spin out from its path and sting on touch */
      const k = Math.max(.25, 1 - f.age / (f.total || STEGO.wheel.dustLife)), wob = Math.sin(f.age * (f.spin || 2) * 3) * .35, nx = f.x + (f.vx - f.vy * wob) * k * w.dt, ny = f.y + (f.vy + f.vx * wob) * k * w.dt;
      if (!w.tileOpen || w.tileOpen(nx + .5, ny + .5)) { f.x = nx; f.y = ny; } else { f.vx = -f.vx; f.vy = -f.vy; }
      if (distance(p, f) <= f.radius + .2 && !(f.nextBite > f.age)) { f.nextBite = f.age + STEGO.wheel.dustTick; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: false, source: "stegoDust" }); }
      if (!w.enemies.some((q) => q.id === f.owner && !q.dead) && f.life > .4) f.life = .4;
    } else if (f.kind === "stegoRocket") { /* a plate coming down where its shadow showed: it strikes once and bursts into spikes */
      if (!f.detonated) { f.detonated = true; const R = STEGO.rockets, n = f.spikes || R.spikes;
        if (distance(p, f) <= f.radius + .3) w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: false, source: "stegoPlateRockets" });
        for (let i = 0; i < n; i++) { const a = (f.turn || 0) + i * TAU / n; w.addEffect({ kind: "stegoSpike", owner: f.owner, x: f.x, y: f.y, vx: Math.cos(a) * R.spikeSpeed, vy: Math.sin(a) * R.spikeSpeed, radius: R.spikeRadius, arming: 0, life: R.spikeLife, damage: Math.max(1, Math.ceil(f.damage * R.spikeShare)) }); } }
    } else if (f.kind === "stegoSpike" || f.kind === "stegoBlade") { /* straight, stopped by walls, one hit each */
      const before = { x: f.x, y: f.y }; f.x += f.vx * w.dt; f.y += f.vy * w.dt;
      if (w.shotBlocked ? w.shotBlocked(f.x + .5, f.y + .5) : w.tileOpen && !w.tileOpen(f.x + .5, f.y + .5)) f.life = 0;
      else if (!f.hit && segmentDistance(p, before, f) <= f.radius + .3) { f.hit = true; if (f.kind === "stegoSpike") f.life = 0; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: false, source: f.kind === "stegoBlade" ? "stegoTailBlade" : "stegoSpike" }); }
    }
    else if (f.kind === "spinoRock") { /* a flung rock: straight, stopped by walls, one hit */
      const before = { x: f.x, y: f.y }; f.x += f.vx * w.dt; f.y += f.vy * w.dt;
      if (w.shotBlocked ? w.shotBlocked(f.x + .5, f.y + .5) : w.tileOpen && !w.tileOpen(f.x + .5, f.y + .5)) f.life = 0;
      else if (!f.hit && segmentDistance(p, before, f) <= f.radius + .3) { f.hit = true; f.life = 0; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: false, source: "spinoDigFling" }); }
    } else if (f.kind === "spinoBone") { /* a bone that hunts you; one that misses lands and bursts on its marked ground (spinoBoneBurst) */
      const B = SPINO.bones, sp = Math.hypot(f.vx, f.vy) || B.speed, want = Math.atan2(p.y - f.y, p.x - f.x), cur = Math.atan2(f.vy, f.vx), diff = ((want - cur) % TAU + TAU * 1.5) % TAU - Math.PI, a = cur + Math.max(-B.turn * w.dt, Math.min(B.turn * w.dt, diff));
      f.vx = Math.cos(a) * sp; f.vy = Math.sin(a) * sp; const before = { x: f.x, y: f.y }; f.x += f.vx * w.dt; f.y += f.vy * w.dt;
      const blocked = w.shotBlocked ? w.shotBlocked(f.x + .5, f.y + .5) : w.tileOpen && !w.tileOpen(f.x + .5, f.y + .5);
      if (!blocked && segmentDistance(p, before, f) <= f.radius + .3) { f.life = 0; f.landed = true; w.hurt(w.enemies.find((q) => q.id === f.owner) || null, f.damage, { jumpable: false, source: "spinoBoneVolley" }); }
      else if (!f.landed && (blocked || f.life - w.dt <= 0)) { f.landed = true; f.life = 0; const at = blocked ? before : f; w.addEffect({ kind: "spinoBoneBurst", owner: f.owner, x: at.x, y: at.y, radius: f.burst || B.burst, arming: B.burstArm, armTotal: B.burstArm, life: .3, total: .3, damage: f.burstDamage || 1 }); }
    } else if (f.kind === "spinoFlesh" || f.kind === "spinoFurrow") { /* the shed's falling flesh and the plough's broken ground: only seen */
      if (f.kind === "spinoFlesh") { const k = Math.max(0, 1 - f.age / (f.total || 1)); f.x += (f.vx || 0) * k * w.dt; f.y += (f.vy || 0) * k * w.dt; }
    }
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
// `fits(tile)` (world coherence 1, new ground only): an extra stands only on open ground it can move about in, outside castle
// courts, buildings, caps and trees (landscape.ts creatureSpot, WG-08). Without it the extras go where they always did.
export function populateOverworldPack(map, seed, rx, ry, { safe = null, fits = null } = {}) {
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
    && !inSafe(t) && (!fits || fits(t)) && occupied.every((q) => Math.hypot(q.x - t.x, q.y - t.y) >= 3))
    .sort(byHash((a) => `${key}:spot:${a.x}:${a.y}`));
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
