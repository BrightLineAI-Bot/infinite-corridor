# Progression by exploration: a proposal

**Status: revision 3, 2026-11-20. Nothing here is built.**

- Revision 1 (2026-11-19) went to Tim. He took every recommendation in its open questions and added eleven notes (2026-11-20), which revision 2 folded in.
- Tim then answered revision 2's four open questions (2026-11-20); this revision folds those in. What changed in each revision is listed at the end of this file.
- No acquisition changes until the build phases (section 7) start.

Sources: Tim's direction of 2026-11-19 and 2026-11-20 (`docs/AGENT_CONTEXT.md`; `docs/narrative-bible.md` section 8; field guide "Content stages"), `docs/stage-4-inventory.md`, and the current `src/`.

---

## 0. The idea in one screen

**Two progression modes, chosen per journey** and switchable in Options (section 6):

- **Classic (v0)** is today's rules, unchanged.
- **Exploration (v1)** is this design. New journeys default to it.

**In Exploration, the player gets:**

- **A starting choice.** You pick a primary weapon and a tool from a screen that says what each scales with and how it plays. Aegis is yours from minute one, so parry builds work at once.
- **A core kit from levelling and the Arcanum alone**, enough to play the whole game with any archetype:
  - Aerial Step almost at once (traversal that makes the cramped world breathable), and Rift Step at its usual gate (Aperture 18), which Close View navigation needs; the two combine;
  - the general disciplines and the constellation modifiers and capstones;
  - a short-cooldown starter spell (Cinder Dart, 2.5 s).
- **Weapons are never gated** (Tim, 2026-11-20). Primaries and tools keep dropping from enemies and loot at random, as now; each is a play style to pick up, refine, or swap. "All the power comes from the passives, the abilities and the player's skill."
- **The wild things out in the world**: weapon arts, tool forms, most secondary forms, the strangest spells and passives, the hatchling. They come from quests, milestones, threads, the bottoms of dungeons, and late Divine Viscera. Each has a place, a person, a deed or a story behind it.
- **A random world.** Every new journey gets a random seed, and **every fixed direction is turned per seed** (4.0). The starting town is always Ember Refuge; nothing else about the start is fixed: no "always go north-west".

**The routes:**

| Code | Route | In one line |
|---|---|---|
| **a** | Levelling and the Arcanum | Levels, Aperture and constellation points. Shown ahead of time. The **core kit**. |
| **b** | Quest | A person, the lens or a place opens it: "go here, do this". Finishing grants the ability. |
| **c** | Milestone | Do a thing the game already has, enough times. |
| **d** | Thread | Finish a thread. Something waits at the end, or nothing is said. |
| **R** | Reliquary | Found at the bottom of a dungeon, sometimes. "There might be a crazy passive down there." |
| **V** | Divine Viscera | A few late extras. Never a core. |

Two more labels appear in the tables: **S**, held from the start (or chosen at the start), and **F**, found (loot, first kills, captures, as today).

**Rules that keep it playable:**

1. Every archetype reaches viability by **levelling alone**. Exploration adds the wild half on top.
2. You always hold **2 to 3 known leads**.
3. **Pity gives a lead, never an ability**, and only after a long dry spell (200 sections).
4. Abilities come at a **measured pace**. A 40-hour, 1,300-section player has found about a third of the world's abilities, with plenty left for 1,000+ sections and the far realms (2.7).
5. Placement is **seeded per journey and version-pinned**: nothing already placed ever moves.
6. **No new story density**, and **no new input verbs**: every quest is Act, defeat, reach, survive, clear, or use what you already have (2.8).
7. **Never take away.** Switching modes, or loading an old journey, keeps everything earned.
8. **Help without interruptions**: one-line hints, how-to pages and a training yard (section 4A).

---

## 1. The whole inventory, and how each is earned today

How to read it: **"Today"** gives the mechanism and a `src/` reference. **Stage** is the content stage (1-2, 3 or 4) where it matters. Stage 4 detail and release numbers are in `docs/stage-4-inventory.md`, which this section builds on.

The gap this section shows: most abilities today come from **power gates**. Those are an Aperture tier, a level, a constellation point, or the Transit Lattice opening at Infinite III (tier 13) after a Listener falls. Once the gate opens, the ability is simply picked from a menu, so **the world plays no part**. The exceptions are Echoes (kill the creature), mounts (pen the beast), the glider, the Tidemantle, diving, the hatchling, and the two Arcana passives (Bell Toll, Lamplighter's Light).

### 1.1 Disciplines (Aperture skills): 6

| Ability | Today | Stage |
|---|---|---|
| Ember Form | A constellation point once Aperture reaches 6 (`items.ts:102`; `constellation.ts:175` `learnRank`) | 1-2 |
| Quickening | Same, at Aperture 6 | 1-2 |
| Veil Guard | Same, at Aperture 18 | 1-2 |
| Force Channel | Same, at Aperture 18 | 1-2 |
| Rift Step | Same, at Aperture 18 | 1-2 |
| Aerial Step | The Motion capstone, at Aperture 36 (`constellation.ts:47`, `:205`) | 4 rework |

Aperture itself rises from discovery: signal sites, buried memories, relics, deep stories, charting, shelter creatures and the crystal realm (`interactions.ts:31` `gainAperture` and its callers). It is capped by the Listener stage (`stages.ts`). Constellation points come at one per 6 Aperture (`constellation.ts:24`, `:162`).

### 1.2 Spells: 12

| Ability | Today | Stage |
|---|---|---|
| Cinder Dart, Ember Ring, Grave Sun, Fire Burst | Open from the start, with no gate (`items.ts:52-59`; `spell-slots.ts:157` `availableCastables`) | 1-2 |
| Shadow Clone, Gravity Well, Stillpoint, Aegis, Shadow Boxing, Orbit Volley | Open at Infinite III, tier 13 (`unlockTier:13`, `items.ts:54-64`; `spellOpen` `items.ts:66`) | 1-2 |
| Imbue Weapon, Essence Walk | Open at tier 13 (`items.ts:61-63`) | 4 |

### 1.3 Constellation nodes: 20 nodes and 16 secondary forms

| Group | Members | Today |
|---|---|---|
| Modifiers (5) | Ember Skin, Light Feet, Thorned Veil, Overflow, Rift Wake | A point once the discipline has a rank (`constellation.ts:43-60`, `:186`) |
| Capstones (10) | Colossus, Cinder Heart; Aerial Step, Slipstream; Sanctuary, Mirror Veil; Amplifier, Resonant Force; Fold, Long Step | 2 points once the discipline is mastered and the modifier taken (`:195`). A branch can hold both. |
| On-cast/on-hit extras (5) | Arcane Edge, Casting Wind, Pocket Time, Echoing Cast, Glyph Mine | A point once the discipline has a rank (`:65-67`, `:208`). Stage 4. |
| Secondary forms (16) | Ember Ward, Ember Mend, Kindling, Second Wind, Long Quickening, **Quickened Stride**, Afterimage, Veil Pulse, Long Veil, Stillwater, Wellspring, Bulwark Channel, Harvest, Rift Ward, Quick Fold, Rift Echo | A free switch on a learned node from Infinite III (`constellation.ts:87-106`). Quickened Stride is Stage 4. |

### 1.4 Transit Lattice field passives: 8

The Lattice opens at tier 13 after one Listener kill (`transit-lattice.ts:19`, `:59`). Its slots take any field passive or tool form, with nothing to learn (`lattice-fields.ts:17-30`).

| Ability | Today | Stage |
|---|---|---|
| Sanctum, Wellspring Ground, Charged Air, Spellblade, Drift Field | Lattice pick | 1-2 |
| Tempo, Shatterpoint, Power Aegis | Lattice pick | 4 |

### 1.5 Weapon arts and Lattice tool forms: 13

All of these are Lattice picks today (`lattice-fields.ts:31-52`). A weapon art does nothing with any other weapon.

| Ability | Works with | Stage |
|---|---|---|
| Arc Wave | Blunderbuss | 1-2 |
| Cluster Shell | Rift Bombard | 1-2 |
| Corridor Golem | Hammerfall | 1-2 |
| Mirage of Blades | Great Sweep | 3 |
| Sunburst Ricochet | Lumen Spindle | 4 |
| Continuous Assault | Carbine | 4 |
| Mage's Hand | Quandrix Staff | 4 |
| Lava Slash | Verge Cleaver (art) | 4 |
| Blade Stream | Fourfold Daggers (art) | 4 |
| Cinder Javelin | Cinder Pike (art) | 4 |
| Ki Blast | Iron Fists (art) | 4 |
| Transpose | Salvage Blade (art) | 4 |
| Rapid Reload | Any charged release | 4 |

### 1.6 Awakened moves: 7, plus awakening itself

| Ability | Today |
|---|---|
| Awakening a weapon or tool | At Sela's forge for 6 lumen dust, once the piece is at its cap and holds a Resonance (`constellation.ts:25`, `:405`) |
| Fissure, Returning Blades, Lance, Roundhouse Kick, Spell Runes | The awakened primary's own move (`weapon-arts.ts:91-127`) |
| Great Sweep freeze, Hammerfall clap | The awakened tool (`great-sweep.ts`, `brawler-spells.ts`) |

### 1.7 Weapons, tools, armour and charm: 18

| Ability | Today | Stage |
|---|---|---|
| Salvage Blade, Spark Coil | Starting kit | 1 |
| Cinder Pike | Level 4 gift (`game.ts:957` `MILESTONE_GEAR`), and loot | 1-2 |
| Needle Caster | Level 8 gift, and loot | 1-2 |
| Fourfold Daggers | Level 12 gift, and 20% of weapon loot (`items.ts:35`) | 4 |
| Quandrix Staff | Level 16 gift, and loot (`items.ts:40`) | 4 |
| Verge Cleaver, Lumen Spindle, Rift Bombard | Loot (`items.ts:5` `ITEM_TABLE`; `generateItem` `:203`) | 1-2 |
| Blunderbuss | A Needle Caster upgraded to +6 (`items.ts:13`) | 1-2 |
| Carbine | A Spark Coil upgraded to +6 (`items.ts:18`) | 4 |
| Iron Fists, Hammerfall, Great Sweep | Given at tier 13 (`game.ts:988` `grantBrawlerGear`) | 1-2 |
| Aether Orrery | Given at tier 13 (`game.ts:1004`), and loot (`items.ts:201`) | 4 |
| Kiln Mantle, Glassweave Coat (armour); Quiet Compass (charm) | Loot | 1 |

### 1.8 Echoes: 37

Echoes are already tied to the world: each comes from the **first kill** of its creature. Guardians and world beasts always leave theirs (`echoes.ts:20` `ECHO_DROPS`; `echoDrop` `:220`). Minion Echoes need their parent beast slain (`:219`).

| Source today | Echoes |
|---|---|
| Pack creatures met as crossing guardians | Thunderhorn's Charge, Lynx Pounce, Pallid Skitter, Spinner's Web, Eel's Phase, Sunderjaw's Rupture, Maw's Hunger, Flesh Bloom, Seraph's Firefall, Choir's Lament, Mirror Swap, Wraith Lantern, Beetle Mortar, Saint's Regard, Lantern Stillness, Geode Shell, Golem's Landfall |
| World beasts and uniques | Listener's Answer, Beast's Spines (Questing Beast), Blob's Spatter, Worm's Upheaval, Turtle's Ward, Nanite Seekers, Giant's Arc, Bramble Wake (3), Moth's Ember (3), Tyrant's Heart (3), Chaser's Dark (3), Mind Ward, Rift Upheaval, Stalker's Mist (3) |
| Minions | Bloblet Mend, Tentacle Ember (4 reworks) |
| Dinosaurs (Stage 4) | Stegosaur's Grip, Spinosaur's Echo, Earth Resolve, Triceratops Cunning (a hostile one only) |

Three notches (`echoes.ts:12`), plus extra Lattice echo slots bought with Transit Coordinates.

### 1.9 Glyphs and their combinations

| Ability | Today |
|---|---|
| 10 base glyphs: Ignite, Chain, Pierce, Echo, Leech, Heavy, Swift, Volatile, Tether, Still | Drops, certain from guardians (`glyphs.ts:20`, `:346` `glyphDrop`). Each behaves differently in a weapon, tool, spell, skill or armour. |
| Gathered Breath (4) | A rare drop on its own stream; 12 dust to inscribe (`glyphs.ts:50`) |
| 8 Resonances (pairs): Ember Choir, Wildfire, Storm Lattice, Afterimage, Grave Tether, Comet, Blood Tide, Quickstep | Discovered by combining glyphs (`glyphs.ts:131`) |
| 6 Triads: Inferno, Maelstrom, Requiem, Sanguine Storm, Starfall, Undertow | Three glyphs in a three-socket item (`glyphs.ts:150`) |
| 21 spell Pairings (Kindled, Eclipse and the rest) | Emergent from the attributes of slots A and B (`spell-slots.ts:41`) |
| Tesseract glyphs (4): 5 forms × 4 tiers × 4 classes, with rolled lines | Labyrinth vaults, Pentagon keepers, reliquaries, sealed chambers, the Regent's hoard, turtle-shell vaults (`tesseracts.ts:31`; `turtle-shell.ts:28`) |

### 1.10 Run perks and supplies (ability-like)

| Ability | Today |
|---|---|
| 20 marginalia (Glass Edge to Sigil Page) | From Infinite IV: fell a Margin Warden in a crossing, pick 1 of 3, and it goes into the Scrapbook for good (`marginalia.ts:18`, `:25`) |
| 3 potions (Draught, High, Max) | Supplies; High and Max are brewed from draughts (`potions.ts:6`) |
| 7 meal ingredients (14 dishes and hearty helpings) | Bought from the Refuge cook or a Listener-town cook (`meals.ts:18`) |
| Stego Bait | Cut a Wild Stegosaurus's tail (`stego-bait.ts`) |
| Empowered rounds | Crossing chests and great-tree crowns (`tool-forms.ts:745`) |

### 1.11 Mounts and companions

| Ability | Today |
|---|---|
| 9 beast mounts: Stalker, Morphing Blob, Tremor Worm, Mountain Turtle, Astral Worm, Briar Stag, Ashen Moth, Crimson Tyrant, Doom Chaser | Close a pen on the hurt beast; a stable of three (`beast-mounts.ts:19`) |
| Triceratops (Good and Silly) | Wild herds, capture, the Beast Hotel (`monster-pack.ts:26`) |
| Triceratops hatchling (baby, young, adult) | A rescue quest from the mama at the Beast Hotel (`hatchling.ts:19`). **Already a quest.** |
| Shadow Clone; Corridor Golem | Through the spell (1.2) and the tool form (1.5) |

### 1.12 Traversal and utility

| Ability | Today |
|---|---|
| Lantern, Build, Oculus | Held from the start (`spell-slots.ts:94`, `:112`; `oculus.ts`) |
| Robot, drone, submersible | Forge a submersible frame (Pack → Supplies) (`game.ts:5935`; `vehicle-gates.ts:48`) |
| Leaf glider | Found on the landing of the first great tree climbed (`game.ts:257`). **Already place-tied.** |
| Tidemantle (swim) | A quest: a flooded dungeon's guardian, or a Saint of the Low Water (`water-traversal.ts:35-44`). **Already a quest.** |
| Skiff | Bought from a Shipwright once you hold the Tidemantle, or built from wood (`boats.ts`) |
| Diving | The Bathysal Lens at an island landmark, plus a dive rig from a Shipwright (`diving.ts:2`) |
| Shovel | Lashed from wood and stone (`digging.ts:16`) |
| Travel seeds (Fossilized, Opal, Pumice, Crimson, Abyssal) | Open ground, chests, Skyland clears, caches, Upwell seed hunts (`skylands.ts:349`) |
| Crossing Sigil, Return Ember | Supplies and rewards |
| Sling | A pack extension (`sling.ts:11`) |

### 1.13 Growth systems (not abilities, but they shape builds)

These come from levelling or the economy, and the proposal keeps them as they are:

- Upgrades with spheres, and the town smith's services (`smithy.ts:15`, unlocked as Listeners fall).
- The masterwork rank, the late +10 (`items.ts:72`) and refinement to +20 for Divine Viscera past 1,000 sections (`items.ts:86`).
- The Pentagon dais reroll, with its paid reroll costing 10 Viscera.
- Lattice slots, bought with Transit Coordinates.
- Stat points, one per level.
- Arcana passives: **Bell Toll** (the Seven Bells) and **Lamplighter's Light** (the Lamplighter's Round), `lore.ts:225-240`. These are the precedent for route (d).

### 1.14 Counts

| Group | Count | Already tied to the world today |
|---|---|---|
| Disciplines | 6 | 0 |
| Spells | 12 | 0 |
| Constellation nodes | 20, plus 16 secondary forms | 0 |
| Lattice field passives | 8 | 0 |
| Arcana passives | 2 | 2 |
| Weapon arts and tool forms | 13 | 0 |
| Awakened moves | 7, plus awakening | 0 (a forge service) |
| Weapons, tools, armour, charm | 18 | 0 (levels, loot, tier gifts) |
| Echoes | 37 | 37 (a first kill) |
| Glyphs | 11 base; 8 Resonances; 6 Triads; 21 Pairings; the Tesseract family | Partly (drops, Pentagon places) |
| Marginalia | 20 | Partly (Margin Wardens) |
| Supplies | 3 potions; 7 meal ingredients; Stego Bait; rounds | Mostly |
| Mounts and companions | 9 beast mounts; Triceratops; hatchling | All |
| Traversal and utility | about 14 | 5 (glider, Tidemantle, skiff, diving, seeds) |
| **Player-chosen abilities with no world tie** | **about 115**: disciplines, spells, nodes, secondary forms, Lattice picks, arts and forms, awakened moves, gifted gear | |

That last line is the gap this proposal closes.

---

## 2. The acquisition architecture

### 2.1 What it builds on (already in the game)

- **Quests with a compass.** Journal "Active quests", and a compass that points only where the player chooses; accepting a quest sets it (`save.guidance.follow`; field guide, release 1021). Quest kinds already exist: hunts, far quests, the rescue, the errand, relay leads and seed hunts.
- **Homes on the map.** `lore.ts ARCANA_REGIONS` gives a ring of distance and a compass sector around the Refuge, and the Journal names them ("south-west of the Refuge, 25 to 50 sections out").
- **Story budget and versions.** Threads take shared slots at 0.12 a crossing. Crossings are pinned to their story and region versions the first time they are pinned (`game.ts pinDungeonLayout`).
- **Places worked out once and saved.** The Second Wayfarer's sightings (`second-wayfarer.ts`). Seed hunts are objects laid over a place as it loads, never a generator change (`tall-towers.ts`).
- **A rumour engine.** `wonders.ts` finds the nearest unexplored Sky Stair, great tree or Starfield from cheap hashes, and a traveller says which way it lies.
- **Reward hooks.** `lore.ts ARCANA_UNLOCKS` and `ARCANA_PASSIVES` work; `threads.ts ARCANA_REWARDS` is an empty general hook.
- **Precedents for quest-earned abilities:** the Tidemantle, the hatchling, Bell Toll, Lamplighter's Light, the far quests a beast's fall opens, and refinement opening at a far town.
- **A random seed.** The journey creator already makes one when the field is left blank (`persistence.ts:316` `namedFresh`, `CORRIDOR-<time>`).

### 2.2 The routes in detail

**(a) Levelling and the Arcanum: the core kit.** This covers:

- health, stamina and stat points, as now;
- Aperture opening the disciplines;
- constellation points buying modifiers and **capstones**;
- the spells shown in advance by level.

Weapons are not on this route or any other: they are never gated (section 3.7).

The Arcanum's "Level-ups ahead" line names what is next. Section 2.5 shows that every archetype is viable on this route alone.

**(b) Quests.**
- A quest opens when its gate is met (a tier, a level, a person spoken to, or a thread or place found). It names a place class and a condition, for example "a desert at least 50 sections from the Ember Refuge". Accepting it points the compass.
- Quests use only existing verbs (2.8).
- Givers are existing people: Sela, Oren, Vela, Hollis Dray, the Cairn Keeper, Ilse, Old Quillon, the Shipwright, the lookouts, the Beast Hotel mama, and the keepers, smiths and cooks of Listener towns.

**(c) Milestones.**
- Counters of things the player already does. Each threshold is shown once its first count is made ("Charged releases: 40 of 200").
- Counters are integers in the save. Most exist already (`farArray.listeners`, `relay-chain.count`, `roomBeastSlain`, charting); a few are new (glide distance, spells cast airborne, poise breaks).
- Thresholds are set so each one comes from playing the matching build, not from grinding.

**(d) Threads.**
- Finishing a thread grants its ability. Twenty-five carriers exist: the 21 threads, the Bells, the Chain, the Torn Pages and the Second Wayfarer.
- On the Arcana card the reward is *named*, *hinted* ("something waits at the end") or *hidden*. No new thread pieces are written.

**(R) The Reliquary: the bottom of the dungeon.** This route is new. Some dungeon ends hold a reliquary (a quest object laid in the completion room, as seed hunts are laid). It gives one ability from a small seeded **Reliquary pool** of 8 (section 3).

| Find | Chance |
|---|---|
| The first Revenant horde cleared (a taste horde counts) | Certain |
| The first Pentagon Heart | Certain |
| The first seed-realm heart | Certain |
| The first Shell-Labyrinth vault | Certain |
| Any other Deep floor's last room, labyrinth vault, Great Keep or Great Castle top | 1 in 10 |

So any dungeon *might* end in something mad. The certain ones mean it is never a lottery forever.

**(V) Divine Viscera.** Four secondary forms, plus the **rumour** purchase: pay to turn the nearest unknown ability into a hinted lead. Bought at Sela's forge or any smith past 1,000 sections (where refinement already takes Viscera).

**(F) Found.** Loot, guardian glyphs, first-kill Echoes and captures, as today.

### 2.3 Tiers: where things wait

Distances are straight-line from Ember Refuge, as the Arcana homes and far realms measure them. **Layers** are the other maps.

| Tier | Where | What waits there |
|---|---|---|
| **R0 Hearth** | The Refuge and 0-6 sections | The starting choice, the first errand, the first lead, the first Echo |
| **R1 Near** | 3-18 | Near threads (the Lamplighter, the Letters, the Beekeeper, the Ferryman); the first quests |
| **R2 Middle** | 19-50 | Middle threads; Great Keeps, castles, labyrinths; most quests |
| **R3 Far** | 50-150 | "A desert at least 50 out"; the Reckoning Fields, the Magma Rivers, the Rimeglaciers; far threads |
| **R4 Deep band** | 150-1,000 | Late quests; the Second Surveyor, the Sleeper |
| **R5 Beyond** | 1,000+ | Far realms, domains, civilisations, the far threads, Viscera. **Four of the 44 world abilities live only here.** |
| **Sea** | Open sea, isles, dive sites, shipwrecks | |
| **Sky** | Great trees, skyways, Sky Stairs, Skylands, Cloud Hold, Upwells | |
| **Under** | The Deep, chasms, canyons, Starfields | |
| **Strange** | Seed realms, the Askew, bizarro pockets, the Pentagon | |

Power gates still apply: a quest needing tier 13 opens at tier 13. Its place is measured from your **current hometown** (Listener towns count), not from the Refuge, so a late ability never sends you back to the start.

### 2.4 Variety per playthrough, deterministically

- **Fixed pairs (F).** The theme makes them, for example the Clockmaker's Hours gives Pocket Time and the Well-Digger's Rope gives Gravity Well.
- **Seeded pools (~).** The seed decides:
  - which ability each pool slot carries;
  - which compass sector a quest's home lies in;
  - which of two to four candidate place classes it uses;
  - which 8 abilities fill the Reliquary pool's order.

  The hash is `hash(seed : progression : v<N> : <pool>)`, like `ARCANA_REGIONS` and the Second Wayfarer.
- **Worked out once and saved.** An assignment is stored when it first matters (a quest opens, a thread starts, a rumour names it, a reliquary is opened). Later table edits never move it.
- **Version-pinned data.** `save.progression.table` records the table version a journey uses. New abilities or pool changes go into the next version's keys and never edit an older entry, the rule threads already follow. This **table version** is separate from the **mode** (v0 or v1, section 6).
- **No tile changes.** Quest steps and reliquaries are objects laid over places as they load. Crossings keep their own story and region versions.
- **The guardian roster.** A seeded roster per journey and ring decides which guardian kinds are commonest near the Refuge, so the first Echoes differ. This is new, and only for ground first seen under v1.
- **Random starts** (section 4.0) add the largest difference of all: the map itself, and the directions of the starting stories.

### 2.5 Guarantees: builds come together

**G1, the levelling core.** Each archetype reaches a legitimate, complete build from levelling and the Arcanum alone. Its weapon is whatever suits the style: the start pick, or any drop, since weapons are never gated. **The power is in the passives, skills and spells**, so the table lists only those. Exploration adds the second half: the arts, forms, secondary forms and strange passives. The archetypes are loose and defined by data, not classes.

| Archetype | Typical weapons (start pick or any drop) | Power by levelling and the Arcanum alone (v1) | What exploration adds on top |
|---|---|---|---|
| Brawler (Might) | Iron Fists or Verge Cleaver; Hammerfall or Great Sweep | Ember Form, Force Channel, Ember Skin, Colossus, Resonant Force, Aegis; Shadow Boxing and Imbue Weapon at Infinite III | Ki Blast, Lava Slash, Corridor Golem, Mirage of Blades, Kindling |
| Blade (Finesse) | Fourfold Daggers or Cinder Pike; Needle Caster | Quickening, Aerial Step, Rift Step, Light Feet, Slipstream, Fold, Long Step, Aegis; Shadow Boxing at Infinite III | Blade Stream, Cinder Javelin, Tempo, Shatterpoint, Afterimage |
| Spellblade (Focus melee) | Salvage Blade; Spark Coil or Lumen Spindle | Cinder Dart, Ember Form, Ember Skin, Overflow; Imbue Weapon at Infinite III; Spellblade (free in the Lattice) | Transpose, Arcane Edge, Spell Runes |
| Caster | Quandrix Staff; Spark Coil or Lumen Spindle | Cinder Dart (2.5 s), Ember Ring (level 3), Fire Burst (6), Grave Sun (10), Overflow, Amplifier; Orbit Volley at Infinite III | Mage's Hand, Echoing Cast, Glyph Mine, Wellspring Ground, Gravity Well, Essence Walk |
| Gunner (tools) | Any primary; Spark Coil, Needle Caster, Rift Bombard or the Aether Orrery (+6 makes the Carbine or Blunderbuss) | Force Channel, Overflow, Amplifier, Quickening, Aegis; Charged Air (free in the Lattice) | Rapid Reload, Continuous Assault, Arc Wave, Cluster Shell, Sunburst Ricochet |
| Warden (guard) | Any | **Aegis from the start**, Veil Guard, Thorned Veil, Sanctuary, Mirror Veil; Stillpoint at Infinite III; Sanctum (free in the Lattice) | Power Aegis, Long Veil, Stillwater |
| Beastcaller (Echo and companion) | Any | Echoes (first kills), Force Channel and Amplifier, beast mounts (pens) | The hatchling (Infinite II), Harvest, more Echoes |

**G2, the lead floor.** At least **2** leads the player can act on now, and at most **3** directed quests open at once. When below 2, the next person spoken to gives a rumour about the nearest eligible ability, preferring the archetype of the equipped weapon and spells.

**G3, pity is a lead, never an ability.** It replaces revision 1's "an ability every 40 sections", which would have given Tim about 30 abilities by section 400 just by walking.

- A counter runs of new sections explored since the last ability **gained by any route**.
- At **200**, the next rumour is a *strong* one: a directed lead to the nearest eligible world ability within about 15 sections of where you stand.
- The counter starts again from that lead.
- The ability itself still has to be earned. At Tim's pace (about 32 new sections an hour) that is one strong lead per six hours of dry play at most.

**G4, never stranded.** A step needing a place is resolved when it opens:
- it takes the nearest unexplored section meeting the condition, found by cheap biome and distance hashes (`wonders.ts`);
- it is saved and never moves;
- it relaxes to "any section that far out, in that sector" if the search budget runs out;
- it uses only crossings not yet entered.

**The table was re-checked with no gated weapons (Tim, 2026-11-20).** Every "power" cell is passives, skills and spells from route (a), none of which depends on owning a particular weapon. Gunner is the one archetype whose power partly rides on gear: the +6 transformations need a Spark Coil or Needle Caster, and either can be the start pick. A Gunner who starts with something else still has Force Channel, Overflow and Charged Air working on any tool.

**G5, the power match.** Nothing in R3 or beyond is ever needed for a G1 core.

**G6, the tests.** A simulation over 1,000 seeds checks that:
- every quest step resolves;
- the lead floor holds;
- the cadence (2.7) lands inside its bands.

### 2.6 How it fits the story budget

- Quests are short errands: one line from a giver, one on completion, a Journal entry in the existing voice. The 0.12 thread budget is untouched.
- Rumours replace an idle line; they never add a speaker.
- Reliquaries and quest objects sit in places that already exist.
- Hooks can be absurd. The Corridor is strange, and a quest can be.

### 2.7 Pacing: how many abilities, and when

Calibrated on Tim's real journey: about **1,300 sections uncovered in 40+ hours** (about 32 new sections an hour), heading past 1,000 sections out.

**The world pool under v1:** 44 abilities that are earned out in the world.

| Group | Count |
|---|---|
| Spells | 3 |
| On-cast extras | 5 |
| Secondary forms | 11 |
| Lattice passives | 5 |
| Arts and forms | 13 |
| The hatchling, the two Arcana passives | 3 |
| Viscera forms | 4 |

Echoes (37) are counted apart, since they come from first kills.

**Expected cadence** for a player exploring at about Tim's pace. These are targets for the simulation (G6) and Tim's playtests, not promises.

| Played | New sections | Core kit (route a) | World abilities found (of 44) | Echoes (of 37) |
|---|---|---|---|---|
| 1 h | ~30 | Start choice, Aegis, Cinder Dart, Ember Form or Quickening, Aerial Step | 0-1 | 1-2 |
| 5 h | ~160 | + Rift Step, Veil Guard, Force Channel (Aperture 18), modifiers, Ember Ring, Fire Burst | 1-3 (a near thread, a first quest) | 4-6 |
| 10 h | ~330 | + first capstones, Grave Sun | 3-5 | 6-9 |
| 20 h | ~650 | + Infinite II: the hatchling's quest, awakening at Sela's | 7-10 | 10-14 |
| 40 h | ~1,300 | + Infinite III: its spells, the Lattice with 3 free passives | **12-16** (about a third) | 15-20 |
| 80 h | ~2,500 | Late capstones | 24-30 | 24-28 |
| 150 h+ | 5,000+ | | 36-44: the far realms' 4, the last threads, Viscera forms | 33+ |

**Expected by route at 40 hours** (about 14 in all):

| Route | Expected | Of |
|---|---|---|
| b, quests | 5 | 10 |
| c, milestones | 3 | 10 |
| d, threads | 3 | 12 |
| R, reliquaries | 3: the first horde, Pentagon, seed realm or vault, and about 1 in 10 of some 15 other dungeon ends | 8 |
| V | 0 | 4 |

**Levers if it is too slow or too fast:**
- the Reliquary chance;
- milestone thresholds;
- the pity interval;
- how many Lattice passives are free.

All are data, and none touches creature numbers.

**The Revenant horde.** Hordes are 5 crossings in 1,000 (`revenant-horde.ts:20`), with 28-44 revenants, or 12-18 in a taste horde. Tim has cleared one in 40 hours, so no route asks for more than **one** horde cleared, and that first clear is a certain reliquary. To make sure a player meets one:
- from Infinite II, rumours can name the nearest unentered horde crossing, found by the horde's own hash as `wonders.ts` finds Sky Stairs;
- a taste horde counts.

### 2.8 Quest verbs: only what the game already has

Every quest step is one of these. A quest may add a **condition** (a time limit, night, "while a meal lasts", "using Aegis"), but never a new action or button.

| Verb | The existing input | Used for |
|---|---|---|
| **Act** | The Act button: speak, inspect, collect, open, salvage, ring, enter | Talking to givers; picking up a quest item; delivering it (speak to the person while holding it); a quest object laid in a place |
| **Defeat** | Combat | A named foe, or N of a kind |
| **Reach** | Moving | A section, place or height, under a condition |
| **Survive** | Staying alive | N seconds in a place, as the Rite already asks |
| **Clear** | Completing a crossing, floor, Pentagon, Skyland, horde or pocket | |
| **Use** | An ability you own | Cast Aegis into a blow; glide a distance; land charged releases; cast while airborne |

Revision 1's "kneel", "sit in a spring", "shout", "put out the lamps", "dropped if you dodge" and "dog-ear the map" are gone. Section 3 rewrites each hook in these verbs.

---

## 3. A route for every ability (Exploration, v1)

How to read the tables:

- **Route:** S / a / b / c / d / R / V / F, as in section 0. **~** means seeded: the line shows one example.
- **Where / what** gives the tier and the hook, in the verbs of 2.8 (**Act, defeat, reach, survive, clear, use**).
- **Seen:** **D** directed (named, can be followed), **H** hinted, **X** hidden.

Under Classic (v0), every row keeps its "Today" route from section 1. The quests are still there as extra routes (section 6).

### 3.1 Disciplines: all core (a)

| Ability | Route | Where / what | Seen |
|---|---|---|---|
| Ember Form | a | Aperture 6, at Sela's lens | D |
| Quickening | a | Aperture 6 | D |
| **Aerial Step** | a | **Aperture 6, for one point, with no prerequisite.** In v1 it is a discipline of its own rather than the Motion capstone; its capstone slot in Motion goes to **Long Quickening**, promoted. Walk on air from the first hour. | D |
| Rift Step | a | Aperture 18, as today (Tim, 2026-11-20). With Aerial Step it combines: step, then hold the air. | D |
| Veil Guard, Force Channel | a | Aperture 18 | D |

Aperture 6 usually comes from the first signal sites and buried memories near the Refuge: the first hour.

### 3.2 Spells

| Ability | Route | Where / what | Seen |
|---|---|---|---|
| **Cinder Dart** | S | Start. The short-cooldown spell (2.5 s, `items.ts:52`); the caster's bread. | D |
| **Aegis** | S | Start (today tier 13). Parry builds work from minute one. | D |
| Ember Ring | a | Level 3 | D |
| Fire Burst | a | Level 6 | D |
| Grave Sun | a | Level 10 | D |
| Shadow Boxing, Imbue Weapon, Orbit Volley, Stillpoint | a | Infinite III (tier 13), as today: cores | D |
| Shadow Clone | d | The Second Wayfarer (fixed). Someone dressed as you leaves you, at the last, what they were. | X |
| Gravity Well | d | The Well-Digger's Rope (fixed). The stone that never stops sinking, in your hand. | H |
| Essence Walk | b~ | Tier 13, R2. Act: eat any meal at Hollis Dray's; while it lasts, clear a Starfield crossing. The broth goes the wrong way round. | D |

### 3.3 Constellation nodes

| Ability | Route | Where / what | Seen |
|---|---|---|---|
| 5 modifiers (Ember Skin, Light Feet, Thorned Veil, Overflow, Rift Wake) | a | A point, as today | D |
| 10 capstones (Colossus, Cinder Heart, Long Quickening, Slipstream, Sanctuary, Mirror Veil, Amplifier, Resonant Force, Fold, Long Step) | a | Points, as today. Long Quickening takes Aerial Step's old slot. | D |
| Arcane Edge | d | The Toolmaker's Handles (fixed). The unshaped stave worn to your grip teaches the blade to carry the spell. | H |
| Casting Wind | c | Sky. Use: cast 30 spells while gliding or air-walking. | D |
| Pocket Time | d | The Clockmaker's Hours (fixed). The last watch still runs, set to yours. | H |
| Echoing Cast | d~ | The Choir of Stones (example). The chord sings your spells back, quieter. | H |
| Glyph Mine | b | Strange. Defeat five Vein Wraiths in the Hollow Husk and Act: collect their sigils. Sela sets one under your feet. | D |

### 3.4 Secondary forms: mostly out in the world

In v1 a learned node's secondary form must be found first; the switch works once found. The Viscera four are the plainest stat forms.

| Form (of) | Route | Where / what | Seen |
|---|---|---|---|
| Ember Ward (Ember Skin) | c | Survive being set burning 20 times. The fire learns to bite back. | H |
| Ember Mend (Colossus) | b | R5. Reach the Thornglass Caldera and survive there until the Questing Beast comes home. (Opens once you have stood 1,000 sections out.) | D |
| Kindling (Cinder Heart) | R~ | Reliquary | X |
| Second Wind (Light Feet) | V | Divine Viscera | D |
| Quickened Stride (Quickening) | c | Sky. Reach the far end of a Cloud Hold summit skyway without touching ground. | D |
| Afterimage (Slipstream) | R~ | Reliquary | X |
| Veil Pulse (Thorned Veil) | V | Divine Viscera | D |
| Long Veil (Sanctuary) | R~ | Reliquary | X |
| Stillwater (Mirror Veil) | c | Sea. Clear 10 dives. | D |
| Wellspring (Overflow) | b | R5. In the Storm Halls, defeat a Coil Warden while Force Channel holds. The robots hum along. (Opens once you have stood 1,000 sections out.) | D |
| Bulwark Channel (Amplifier) | V | Divine Viscera | D |
| Harvest (Resonant Force) | c | Defeat 10 world beasts | H |
| Rift Ward (Rift Wake) | R~ | Reliquary | X |
| Quick Fold (Fold) | V | Divine Viscera | D |
| Rift Echo (Long Step) | c | Under. Clear 10 Deep floors. | D |

In v1, Long Quickening (today Aerial Step's secondary form) becomes the Motion capstone that Aerial Step leaves, keeping the save id `aerial-step` for the slot. It has no secondary form of its own, so v1 has 15 forms: 11 out in the world and 4 for Viscera.

### 3.5 Transit Lattice field passives

The Lattice opens as today (Infinite III plus one Listener).

| Ability | Route | Where / what | Seen |
|---|---|---|---|
| Sanctum, Charged Air, Spellblade | a | **Free on opening**: one each for Warden, Gunner and Spellblade | D |
| Drift Field | c | Sky. Use: glide 1,000 tiles. | D |
| Wellspring Ground | d~ | The Drowned Library (example). The water reads, and now so does the ground. | H |
| Tempo | b | **Sky (moved, Phase 8).** A metronome on the first island of any Skyland climbed from a Sky Stair at least 50 sections from the Ember Refuge. Act: wind it, then clear that Skyland: everything that starts moving on its beat. *Was:* an Ember Foundry Pentagon's heart room, a theme not in the world (`adventures.ts`, `since` null). | D |
| Shatterpoint | R~ | Reliquary | X |
| Power Aegis | b | R3. At least 50 sections from the Ember Refuge, use Aegis to turn a Gate Revenant's blow, then defeat it. It is impressed, in its way. | D |
| Bell Toll; Lamplighter's Light | d | The Seven Bells; the Lamplighter's Round. Unchanged. | D |

### 3.6 Weapon arts, tool forms, and awakening

| Ability | Route | Where / what | Seen |
|---|---|---|---|
| Ki Blast | c | Defeat 15 foes with the Iron Fists' perfect-timing ball. On the 15th, something leaves you on its own. | D |
| Cinder Javelin | d | The Ferryman's Fares (fixed). The pole he never needed, thrown across. | H |
| Transpose | d | The Tollkeeper's Keys (fixed). The glass key's keyhole, set down as a seal. | H |
| Blade Stream | b | **Strange (moved, Phase 8).** In any Pentagon (its Heart is always Tomb-built: "Lamps for the Heart: forty"), defeat three Grave Lanterns before the first relights its lamp (two minutes from the first). *Was:* every Lamplighter in a Lamplit City Pentagon, a theme not in the world. | D |
| Lava Slash | c | R3. Defeat 30 foes in the Magma Rivers. | D |
| Mage's Hand | d | The Tall Child's Slates (fixed, R5). A hand the size of a door, offered gently. | H |
| Rapid Reload | c | Use: land 200 charged releases | D |
| Arc Wave | b | Sea. Act: salvage three shipwrecks (open sea: by boat) with the Blunderbuss equipped. | D |
| Cluster Shell | R~ | Reliquary | X |
| Corridor Golem | b | Under, R2. Defeat five Earth Golems in canyon craters, Act: collect their hearts, and give them to the quarry keeper (Shale). She stacks a small man who stands up. | D |
| Sunburst Ricochet | R~ | Reliquary | X |
| Continuous Assault | d | The Tinker's Tags (fixed, R5). Tag 7, burnt into the copper by the robots, and their sky lasers with it. | X |
| Mirage of Blades | R~ | Reliquary | X |

**Awakening: an analysis.**

*Today*:
- Sela awakens a primary or tool for 6 lumen dust once the piece is at its tier's cap and holds a Resonance (`constellation.ts:405`).
- A common piece caps at +3, so a player who happens to socket a matching glyph pair can awaken within the first hours. The awakened move (Fissure, Returning Blades, Lance, Roundhouse Kick, Spell Runes; the Sweep freeze; the Hammerfall clap) comes with it.
- Each move's "up" form needs its weapon art. Those sit in the Lattice, which opens at Infinite III.

*The bands, from `items.ts` `APERTURE_BANDS`:*

| Band | Tier | Aperture |
|---|---|---|
| Infinite | 11 | 1,525 |
| Infinite II | 12 | 2,231 |
| Infinite III | 13 | 3,255 |

Stage 1 caps Aperture at the top of tier 12 (`stages.ts`), so **Infinite II is the last band reachable before the first Listener falls**, and Infinite III needs that kill.

*Recommendation for v1: awakening opens at Infinite II.*
- At Infinite, it would sit beside nothing else.
- At Infinite II it is the power spike a player carries *into* the first Listener fight.
- Infinite III then brings its spells and the Lattice, where the arts' "up" forms live. The spikes come one band apart instead of all at once.

The work of awakening (cap, Resonance, dust) stays as it is. Sela's line when the band opens: "Something in your steel is asleep, not dead. Bring it to me."

Items already awakened keep it, in both modes. Classic (v0) is unchanged.

### 3.7 Weapons, tools, armour, charm: never gated

Tim (2026-11-20): every weapon is a play style the player can pick up, refine, and swap if they don't like it. All the power comes from the passives, the abilities and the player's skill. In both modes, then, no primary or tool is ever behind a quest, milestone, level or tier.

| Ability | Route | Where / what | Seen |
|---|---|---|---|
| **One primary, one tool** | S | Chosen at the start (section 4.0) | D |
| Every primary and tool | F | Dropping from enemies and loot at random, as now. Today's level gifts (Cinder Pike at 4, Needle Caster at 8, Fourfold Daggers at 12, Quandrix Staff at 16; `game.ts:957`) stay as they are: a sure copy, not a gate. | X |
| Iron Fists, Hammerfall, Great Sweep | F | **New in v1:** they join the loot pool from the start, each on its own seeded stream (as the Quandrix Staff's `loot.stream` does), so no other roll moves. Today they never drop and only arrive as the tier-13 gift (`game.ts:988`), which is a gate. The gift stays as a sure copy. | X |
| Aether Orrery | F | Already loot (`items.ts:201` `ORRERY_LOOT`), plus the tier-13 gift (`game.ts:1004`). Unchanged; it leaves revision 2's milestone route. | X |
| Blunderbuss; Carbine | Upgrade | +6 on the Needle Caster or Spark Coil, as today. A transformation, not a gate. | D |
| Armour, charm | F | Loot, as today | X |

### 3.8 Echoes, glyphs, run perks

These stay as they are: **F**, a first kill, a drop or a Margin Warden.

- Echoes are already the game's most convincing tie.
- New under v1: the seeded **guardian roster** (2.4), and Echoes of seen creatures showing as "rumoured" in the compendium.
- Listener's Answer is earned with the first Listener kill.
- Resonances, Triads and Pairings stay emergent, discovered by combining.
- Quick Ink, Inkwell and Ink Shield can also come from the Ink-Clerk's Blotters (R5).

### 3.9 Mounts, companions, traversal

| Ability | Route | Where / what | Seen |
|---|---|---|---|
| Beast mounts, Triceratops | F | Pens and herds, as today | D |
| **The hatchling** | b | **From Infinite II.** The mother Triceratops comes to the Beast Hotel when the band opens (her rescue quest then runs as today, `hatchling.ts:24`). A fully grown companion should not be a first-hour thing. | D |
| Glider, Tidemantle, skiff, diving, robot, shovel, seeds, Lantern, Build, Oculus | As today | Already place-tied or a system | D |

### 3.10 Route totals (v1)

The world pool is 44 abilities:

| Route | Count |
|---|---|
| b, quests | 10 |
| c, milestones | 10 |
| d, threads | 12 (with Bell Toll and Lamplighter's Light) |
| R, the Reliquary | 8 |
| V, Viscera | 4 |

**R5-only** (1,000+ sections): Mage's Hand, Continuous Assault, Ember Mend and Wellspring.

**The core kit (S and a):**
- 6 disciplines;
- 8 spells, including Aegis and Cinder Dart;
- 5 modifiers and 10 capstones;
- 3 free Lattice passives;
- the start choice.

Weapons are outside the count: never gated, always loot.

**Unchanged (F and forge):** Echoes, glyphs, marginalia, loot, mounts, awakened moves.

---

## 4. Onboarding: the player knows from minute one

**What the player should come away with in the first hour:** I chose how I fight. Levels make me sturdier and give me a full kit. The strange things are out there, and people will point me at them. I choose where the compass points.

### 4.0 Random worlds, and the starting choice

**Random starts (both modes, new journeys only).**

*Today:*
- The very first journey on a device starts from `freshSave()`, whose seed is always `CINDER-VERGE-47` (`types.ts:37`, used by `persistence.ts:285`). Only a journey made in the creator gets a fresh `CORRIDOR-<time>` seed.
- Several things are set in one fixed direction for every seed. Each takes the turn below:

| Fixed direction today | Where in code | After the turn |
|---|---|---|
| The hamlets **Glasshaven (4,-2)** and **Coilmarket (-5,3)** | `world.ts:142` `SETTLEMENTS` | Same distance, turned bearing |
| The **Arcana homes**' compass sectors (the Bells south-west, the Surveyor north-east, the Lamplighter south, and the rest) | `lore.ts:165-190` `ARCANA_REGIONS` | Every sector turned together. Their journal words ("south-west of the Refuge") read from the turned sector. |
| The **Readings' compass quarters** (each book's voice in the north, south, east or west quarter of the middle and far bands), and with them each Reading's **Torn Page** and fragments | `lore.ts:37` `readingAt` | The quarters turned: a book's country lies in a different direction on every journey |
| **The Far Sleep's edge**: a diamond, \|rx\|+\|ry\| > 35, with its far corners on the four compass axes | `landscape.ts:2307` `farSleepSection` | The diamond turns with the frame. Under a 45° turn its corners point at the diagonals. Its distances are unchanged: nearest about 25 sections straight-line, farthest 35. |
| **The Surveyor's statue line**: on the Far Sleep's edge, along the last link's bearing; with no link bearing, a seeded diagonal | `surveyor.ts:91` `surveyorStatueSection` | Follows the turned chain home and the turned edge. The fallback diagonal is turned too. |
| **The Viewport's first hunt**, "The Ashen Meridian", always at (5,-2), "five sections east and two north" | `foundry.ts:13` | Turned target; the summary's directions read from it |

Already seeded and **not** fixed, so left alone: the Viewport's other hunts (seeded signs), the hatchling's rescue site, the Second Wayfarer's trail, the Refuge's farm and quarry (`refuge-lands.ts`), section exits, landscape regions, and the far realms (straight-line cells).

*Proposed:*
- The first journey gets a random seed too.
- Journeys created from now on record a **start version 1**, and with it **one frame turn per journey**: a seeded multiple of 45°, sometimes mirrored (16 frames in all).
  - Every directional lookup in the table above turns the section's coordinates into the journey's frame first, then asks the same question it asks today. One rule, so the stories keep their relationships to each other: the bells and the chain stay opposite, the Readings keep their bands, the statue stays on the Far Sleep's edge along the chain.
  - Text that names a direction reads it from the turned data, as `arcanaHint` already builds its words.
- **Versioning.** The bible's rule ("a changed home is a new region version") makes this **region version 2**, and the Far Sleep's turned edge a new landscape and lore pin. Both are given only to journeys created at start version 1, whose whole world is new ground, so nothing explored ever changes. Existing journeys keep every fixed direction exactly as it is.
- **What stays.** The Refuge stays at (0,0) and stays the starting town. The Cairn Keeper still stands at its cairn. Nothing else is a fixed starter block: the rest of the map is made by how you explore.
- The Proving Ground keeps its fixed laboratory seed and no turn.

**The starting choice (both modes, new journeys).** After the name and seed, the journey creator shows two rows of cards, **Choose your weapon** and **Choose your tool**. Each card gives the name, what it scales with, its play style in one line, and a small "good with".

| Weapon | Scales with | Play style |
|---|---|---|
| Salvage Blade | Focus | A short blade that grows with your magic. For spellblades. |
| Cinder Pike | Finesse | A long thrust. Keep them at the end of your reach. |
| Verge Cleaver | Might | A wide, heavy arc. Crowds. |
| Iron Fists | Might | A combo on a beat, charged punches, a perfect-timing ball. Brawlers. (Today only a tier-13 gift; on the cards from now.) |
| Fourfold Daggers | Finesse | Paired cuts crossing in an X. Bosses, not crowds. |
| Quandrix Staff | Focus | Slow spectral hands that strike again and again, at range. Casters. |

| Tool | Scales with | Play style |
|---|---|---|
| Spark Coil | Focus | A straight magic bolt. At +6 it becomes the Carbine. |
| Needle Caster | Finesse | Quick needles. At +6 it becomes the Blunderbuss. |
| Lumen Spindle | Focus | A shot that flies out and comes back. |
| Rift Bombard | Might | A lobbed shell that bursts. |
| Hammerfall | Might | A brawler's slam. |
| Great Sweep | Might | A great sweeping blade around you. |

Scaling is from `items.ts` `WEAPON_SCALING` and `TOOL_SCALING`. The cards read it, so they follow any change.

Hammerfall and Great Sweep, today tier-13 gifts, are on the tool cards from now too. The Aether Orrery is not offered at the start: it stays a find. A default pair is preselected (Salvage Blade and Spark Coil, today's kit), so "Start" works at once. Any card can be swapped later for any drop. The choice is the item's identity only; the stats are the starting tier. Under Classic (v0) the choice is offered too (it only adds), and the rest of the start is as today.

### 4.1 The first hour (Exploration)

1. **Wake in Ember Refuge. The compass points at nothing** (as now). The Refuge's people are the tutorial: each has one first-journey line that points to a person, never a riddle.
   - Vela (vendor): "New? Go and see Maud by the cairn. She sends everyone out sooner or later."
   - Oren (warden): "Before you go past the wall, talk to Maud. And come back to me when you can block a blow." (Aegis is already in slot B.)
   - Sela (keeper): "When the world starts to make sense to you, come to me. I'll read it." (The Arcanum.)
   - Hollis Dray (cook): "Eat before you go. Maud won't feed you."
2. **The Cairn Keeper, Maud Fennick, gives the first quest**, plainly:
   > "Levels'll make you sturdier, and Sela will teach you what the Refuge knows. Everything strange is out there: in the crossings, in what people dropped, in places nobody's walked. Go into the first crossing you find. There'll be a piece of chain on the floor. Keep it."

   Accepting the quest points the compass at "the nearest crossing". The errand now has a target: `wonders.ts`-style, the nearest crossing by hash.
3. **The first signal site or buried memory** gives Aperture. At 6, Sela's lens opens: **Ember Form or Quickening, and Aerial Step**. Its first-use hint (4A): "Aerial Step: walk on the air at the height you cast it. Twice before you touch ground."
4. **The first crossing** shows one route per find:
   - the chain link (exists);
   - the guardian's Echo (a first kill);
   - a guaranteed near thread piece, with "something waits at the end";
   - the chance (1 in 10) of a reliquary if it is a Deep floor.
5. **Back in town, the first rumour** comes from a villager or Glasshaven/Coilmarket resident (wherever they now lie): the first hinted lead. That makes two leads (G2).
6. **Level 3: Ember Ring; level 4: today's sure Cinder Pike.** The level-up line shows "Level-ups ahead". Drops keep bringing other weapons to try.

### 4.2 The words the game uses

- **"Lead"**: anything you know of and can act on. The Journal's Active quests becomes **Leads**, with quests first, then rumours.
- **"Something waits at the end"**: a hinted thread reward. "It does not say": hidden.
- **The first lead banner**, once only: "A lead. Hold the compass to follow it, or don't: leads keep."
- **No tutorial chain.** People, Maud's quest, the level-up line and the one-line hints (4A) carry it.

### 4.3 The compass leads without hand-holding

- It never points by itself. Accepting a quest points it (as now), starting with Maud's.
- Hinted leads give a sector and a range, as the Arcana homes do. Following one points at the sector's nearest edge.
- Hidden things are never on the compass.
- If no needle is set and no lead has been followed for 15 new sections, the Journal button shows a small dot. No arrow, no marker.

## 4A. Tutorials that don't break the flow

Tim (2026-11-19): the game mostly explains itself, and players should mostly learn by playing and finding things. With this many systems, though, people will appreciate some help, as in Monster Hunter, where a new ability or a visit to the training yard gives you a short tutorial.

It must be unobtrusive:

- no forced, blocking tutorial chains;
- never interrupting combat or exploration.

### 4A.1 What exists today

There is no tutorial or hint system. Help is scattered across these places:

| What | Where | Behaviour |
|---|---|---|
| The message line | `game.message`, for example "Level 5 reached... stat points available in Pack" (`game.ts:9027`), and Rift Step's "tap where to step" (`constellation.ts:290` `RIFT_AIM.armed`) | One line, replaced by the next. Not remembered, not repeatable, sometimes missed in a fight. |
| Situational lines | The glider's "Falling! Jump to open the glider", "Nothing to land on below" (`game.ts:267`) | Good first-use teaching, tied to the moment. |
| Event banners | `main.ts:435` `showEventBanner`, with a queue spaced 3.4 s apart (`main.ts:448` `QUEST_BANNER`) | Discoveries and quests. Non-blocking. |
| Journal records | `journalOnce` (128 calls). Examples: the Aperture tier line "Sela can now interpret new Aperture disciplines" (`interactions.ts:31`), refinement's explanation (`items.ts:99`), shelter hazards | Once-only written explanations, readable later. The nearest thing to a "how to" today. |
| Arcanum labels | `constellation.ts:72` `NODE_EFFECTS` (cast / while / changes / always), and every spell's, node's, form's and Echo's `text` | Good descriptions, but no controls or combos |
| Stat help | `main.ts:2150` `statHelp` (which gear each stat grows) | Inline in the Pack |
| Control help | `index.html` `#navCompassHelp`, `#oculusHelp` | Screen-reader text only (`visually-hidden`); sighted players never see it |
| The Proving Ground | Options → System → Enter Proving Ground, while "Proving Ground access" is on (default on) (`main.ts:1618`; `proving-ground-handoff.ts`). A one-way copy of the journey runs as scratch state in its own storage, and Exit reloads the untouched journey. 22 labs and many presets, including "Magic & Aperture Progression", "Echoes: every Creature Echo owned", "Sandbox: every glyph", and weapon-and-tool pairs against a creature. | A developer laboratory. Isolated, but not player-facing in tone. |

So the pieces are there: a once-only record (`journalOnce`), a non-blocking banner queue, good ability text, and an isolated practice space. What is missing is a **hint layer** that knows what you have just met, and a **how-to page** per ability.

### 4A.2 First-use hints

A hint is **one short line, shown once**, the first time the player gets or uses something new:

- a move, spell, tool, weapon art or form;
- a passive firing;
- an Echo triggering;
- a status landing on the player or a foe (Encumbered, root venom, a freeze meter);
- a new kind of place (a Pentagon gate, a Margin Warden, a seed realm).

How a hint looks and behaves:

- **A small card at the screen's edge**, under the message line, not in the middle. One line, and at most about 90 characters. For example:
  > "Tempo: every 5th hit on one foe opens a window. Hit it again, now."
  > "Encumbered: pull damage fills their meter; full, they hit softer and take more."
- **Two taps:** ✕ dismisses it. **"How to"** opens the ability's page (4A.3) and pauses, as the Journal already does.
- It fades by itself after about 6 s. Nothing waits for an answer, nothing blocks input, and nothing chains into a next step.
- **Shown once per journey per subject**, remembered in an additive `save.hints.seen` (ids only, at schema 14). A dismissed or faded hint is never shown again; its page stays readable.
- **Options → Hints:** *On* (default), *Only new abilities* (no places or statuses), or *Off*. The setting is per device, as other display settings are. Turning hints back on never replays the seen ones; "Reset hints" does that.
- **Hints are data.** Each ability's row in the progression table (Phase 1) carries its `hint` line and its `howTo` page. The coverage test then also fails for an ability with no hint.

### 4A.3 A "how to" page per ability

Every compendium entry in the Owned state (section 5) gets a **How to** tab, readable at any time:

- **Controls**: which button, tap or hold, the charge ring, the air version. Written for touch first, with the keyboard key in brackets.
- **What it does**, in plain words with the real numbers. These come from the same data tables the game reads (as `lattice-fields.ts` already builds its texts from `TEMPO`, `QUANDRIX` and the others), so the page never drifts from the game.
- **Combos**: two or three lines linking what it works with. For example, "Glyph Mine with Rift Step: mines link into a void line", or "Shatterpoint loves Hammerfall's stagger". These are hand-written and short, and point only to things the player owns or has rumoured. Nothing unknown is spoiled.
- **Where it came from**: the compendium's own "how it was earned" line.
- **Try it**: a button to the practice space (4A.4), when that is available.

The Journal records that `journalOnce` writes today (refinement, shelter hazards, Aperture tiers) move into the matching how-to pages as well. The Journal keeps its entries too.

### 4A.4 A training yard

Three options, from least to most work. Tim took the recommendation (2026-11-20): **(i) now and (ii) later**.

**(i) "Try it" in the Proving Ground** (recommended first). The Proving Ground already does exactly the dangerous part right:

- it takes a one-way copy of the journey;
- it plays scratch state in its own storage, behind its own scoped worker;
- it never imports production persistence (the release artifact refuses one that does);
- Exit reloads the untouched journey.

A **player-facing preset**, "Training Yard", would open the Standard Test Tile (an existing lab) with:

- the player's own kit;
- the chosen ability **lent** (granted in scratch only);
- a few practice dummies and one ordinary foe.

The how-to page's **Try it** button leads there through the existing handoff.

What has to change:
- the button must say plainly "Practice: nothing here is kept";
- the laboratory's developer chrome is hidden in this preset;
- it is only offered for abilities the player **owns** (it should not become a free preview of quest rewards). Tim agreed (2026-11-20).

Risks:
- leaving the game is a full page change; the Proving Ground hides the pause menu, and Exit reloads.
- it is behind "Proving Ground access", which is on by default.

Production saves are never touched; that is the Proving Ground's whole contract and existing tests guard it.

**(ii) A training corner in towns** (later). In Ember Refuge, and in each Listener town, a sparring post beside Warden Oren or the town keeper:

- straw dummies that take hits and show numbers;
- one tame sparring foe that throws slow, telegraphed blows to practise Aegis parries and dodges against.

It is in the real game, so there is no page switch, but nothing is lent. You practise what you own. Its state is session-only: the dummies leave no rewards and write nothing but an optional "practised" mark. Oren's one line points to it: "Hit the post till your arms know it. The Corridor won't wait for you to learn."

**(iii) A bespoke tutorial area.** Not proposed. It is a forced chain in disguise, and it is the thing Tim says players complain about.

### 4A.5 Teaching "exploration is how you grow" without lecturing

The meta-rule is never stated as a rule. Hints teach it by **where the thing came from**, in the same breath as what it does:

- **On gaining an ability**, the hint's second clause names its source:
  > "Pocket Time, from the Clockmaker's watch: melee hits stretch your skill."
- **On the first rumour** (once): "Someone's heard of something. Leads keep in the Journal."
- **On the first attuned node** (once): "The lens shows a place. The star lights when you've stood there."
- **On the first milestone counted**: "Relays restored: 1 of 5. Something answers at 5."
- **On a hidden reward arriving**: no lesson at all, just the gain. The surprise *is* the lesson.
- **Loading-screen lines** (if Tim wants them; the game has none today): the Cairn Keeper and Sela voices, rotating, such as "Levels make you sturdier. That's all the Refuge can give you." Optional.

Most of the teaching is done by the onboarding beats (4.1) and by the compendium's "how it was earned" line. Hints only make sure each new thing is noticed once.

### 4A.6 Budget

| Rule | Value (data, tunable) |
|---|---|
| Hints on screen at once | **1**. Others wait in a short queue, at most 3; older ones are dropped and stay readable as how-to pages. |
| Gap between hints | At least **45 s** of play |
| Hints per 10 minutes | At most **4** |
| In a fight | **None.** Suppressed while any foe is aggroed or engaged, during a boss or Listener arena, a Rite, a Pentagon trial or a fall. A queued hint waits for 5 s of calm. |
| While exploring | Only when the player is not moving, or just after an area loads |
| Never during | Scenes and Glimpses, the Atlas or Journal open, Close View Look mode, dialogue |
| Expiry | A queued hint older than 3 minutes is dropped, not shown late out of context |
| Reduced Motion | The card appears without sliding |
| Cost | No per-frame allocation. The check runs on the existing banner-queue cadence (every 500 ms, `QUEST_BANNER.checkEvery`). |

This shares the banner queue's spacing, so a hint and a quest banner never stack.

---

## 5. The compendium

A new page in the Reciter's Tome, **"What the Corridor Taught You"**. Each group shows a count of known against total: "Echoes: 11 of 37".

**An entry has four states:**

| State | What shows | When |
|---|---|---|
| Unknown | Nothing but the group count | Hidden routes until owned; everything else until rumoured |
| Rumoured | The name and a vague where, or "a thread's ending", or "at the bottom of something" (a Reliquary entry) | A rumour, a seen creature, a hinted thread card |
| Open | The name, the route, the steps done and left, a Follow button | A quest open, a milestone counting |
| Owned | What it does, **how it was earned** (where, when, from whom), and the How-to page (4A.3) | On gain |

**Also on the page:**

- **Level-ups ahead**: spells by level; disciplines by Aperture.
- **Pace** (Tim, 2026-11-20; see section 7): the journey's own numbers, for every player.
- **Kits**: a row per archetype, showing core pieces owned and the world additions known.

**Under Classic (v0)** the compendium works the same, with two differences:
- an ability today's rules make available shows as "Open to you: from the Arcanum" rather than as a lead;
- owned abilities from before the compendium read "Before the Corridor kept count".

---

## 6. Progression modes: Classic (v0) and Exploration (v1)

Tim (2026-11-20): a toggle in Options. v0 is today's rules, v1 the new progression.

**The record.** `save.progression`, additive at schema 14 and normalised in `freshSave` and `migrateSave`:

| Field | What it holds |
|---|---|
| `mode` | `"v0"` or `"v1"`, the rules |
| `table` | The data-table version (2.4) |
| `start` | The start version (4.0) |
| `kept` | Ability ids kept across a switch |
| `log` | The switches: mode, play time, section |

Unknown fields are kept, as elsewhere.

**Defaults (recommended):**

| Journey | Mode |
|---|---|
| New, from the journey creator | v1. The creator shows "Progression: Exploration (recommended) · Classic". |
| The first journey on a new device | v1 |
| Existing (no record) | v0. Nothing changes until the player chooses. |

**Switching, from Options → Journey → Progression.** Allowed any time out of combat. Each switch asks for confirmation, and says plainly what it does.

*v0 → v1:*
- Everything owned, learned or **open by today's rules at that moment** goes into `kept` and stays usable forever. That covers spells open at tier 13, Lattice picks, awakening and the hatchling quest.
- Anything not yet open follows v1 from then on.
- Quests for kept abilities are not offered.

*v1 → v0:*
- Today's rules apply at once: everything their gates would give unlocks, as if the journey had always been Classic.
- Quests in progress stay in the Journal as extra routes.
- Nothing is lost.

*Switching back and forth* never takes anything away, so a player can unlock everything under v0 and return to v1 with it. That is the player's choice in a single-player game. The confirmation says so: "Abilities you have stay yours in either mode."

**What runs under v0:**
- Leads, rumours, milestones, thread rewards, Reliquaries, the compendium and hints all run, as **extra** routes.
- A reward already owned pays a small consolation (lumen dust) and names what it "would have taught".
- Rumours point only at abilities v0 does not already open.
- Random starts and the starting choice apply to any *new* journey, whichever mode it chooses.
- v0 never changes the start kit beyond the choice: Aegis stays at tier 13, Aerial Step stays a capstone, the level gifts stay fixed.

**Existing journeys** load as v0 and change nothing. They keep their fixed seed, their homes, their hamlets and every ability.

**The Proving Ground** copies the mode with the journey (one-way, scratch). Its labs grant what they grant today.

---

## 7. Build phases

Smallest shippable first. Each phase is one release or a few, previewed for Tim, keeps the 443-test floor, and adds the tests listed.

| Phase | What ships | Gameplay change | Main risks | Tests |
|---|---|---|---|---|
| **1. The spine** | `src/progression.ts`: every ability's row (mode-0 route, mode-1 route, tier, pool, visibility, hint, how-to), pure. The compendium page showing today's routes. | None: read-only | The table drifting from the code | Coverage: every id in `SPELLS`, `APERTURE_SKILLS`, `BRANCHES`, `ALT_PASSIVES`, `FIELD_PASSIVES`, `TOOL_FORMS`, `ECHOES`, `GLYPHS`, `MARGINALIA`, `MOUNT_IDS` and `MILESTONE_GEAR` has a row |
| **2. Modes, random starts, start choice** | `save.progression`; the Options toggle (v0/v1) with switch rules; the creator's mode, weapon and tool cards; random seed for the first journey; start version 1 (the frame turn for every fixed direction in 4.0: hamlets, Arcana homes, Reading quarters, the Far Sleep's edge, the statue line, the first Viewport hunt; region version 2) | New journeys only; existing ones are v0 and unchanged | A hamlet turned onto water or a blocked section (fall back to the next bearing); text naming the old directions; the Far Sleep's turned edge in the dream pass (`landscape.ts`) | Migration (no record → v0; unknown fields kept); a switch keeps everything (`kept`); v1 → v0 unlocks by today's gates; the turn is deterministic per seed; every fixed direction turns together (the bells opposite the chain; the statue on the edge); existing seeds' hamlets, homes, quarters and edge are unchanged; fixtures from real old saves |
| **3. The core kit (v1)** | Aegis at the start; Aerial Step at Aperture 6 and Long Quickening as the Motion capstone; spells by level (3, 6, 10); 3 free Lattice passives; the Iron Fists, Hammerfall and Great Sweep on their own loot streams; awakening and the hatchling at Infinite II | v1 only | Aerial Step's save id (`aerial-step` kept for the slot); an old v1 test fixture | Each archetype's G1 core is reachable by levelling alone (scripted); the new loot streams leave every other roll unchanged; v0 gates are byte-for-byte as today; exact resume |
| **4. Leads, hints, how-to** | Journal "Leads"; rumours from existing speakers; the lead floor; first-journey lines for Vela, Oren, Sela, Hollis and Maud; Maud's errand pointing at the nearest crossing; first-use hints with their budget; how-to pages; Options → Hints | Text and guidance | Hint spam; a rumour line replacing a needed line | `save.hints.seen` migration; hints suppressed in fights; queue cap and gap; lead floor over a simulated walk |
| **5. Training yard** | "Try it" from a how-to page into a Proving Ground preset (owned abilities only); later the town sparring post | None to production | The page switch feeling heavy | The existing isolation tests; the preset lends only owned abilities; Exit resumes exactly |
| **6. Milestones, Reliquary, pity** | Counters and thresholds; the reliquary object and its pool; the first-horde, Pentagon, seed-realm and vault certainties; horde rumours from Infinite II; the 200-section strong lead | v1 gating begins for c and R | Counter cost (integers only); a reliquary in a pinned crossing (laid over, never generated) | Pool determinism; certain finds fire once; chance rolls are seeded; pity gives a lead, never an ability; a v0 journey gets consolations |
| **7. Quests (b) and thread rewards (d)** | The quest-step engine (resolved once, saved, relaxed; verbs from 2.8); thread endings granting through `ARCANA_REWARDS` | v1 gating for b and d | An unreachable step | The 1,000-seed simulation (G6): steps resolve, the cadence lands in its bands; a v2 table key never changes v1 results |
| **8. Far, sea, sky, strange; Viscera** | The R3-R5 and layer quests; the four Viscera forms and the rumour purchase; the guardian roster | v1 | Biome-scan cost (bounded and cached, as `wonders.ts`) | Search bounds; price table; roster determinism |

**Phase 8 as built (2026-11-20).** Tempo and Blade Stream were designed for Ember Foundry and Lamplit City Pentagons, two themes not in the world; Tim chose to move them rather than enable the themes: Tempo to a Skyland at least 50 sections out (a skyway-only find), Blade Stream to the Grave Lanterns of any Pentagon (section 3.5 and 3.6). Quest gates (the Aperture band; `src/quests.ts`): Corridor Golem 3, Tempo 6, Blade Stream 6, Glyph Mine 8, Arc Wave 8, Power Aegis 11, Essence Walk 13, Ember Mend and Wellspring 13 and 1,000 sections stood. At most three quests are open at once (G2). Viscera prices (`VISCERA_SHOP`): Second Wind 8, Veil Pulse 8, Bulwark Channel 10, Quick Fold 10, a rumour 3, at Sela's forge or any smith once refinement is open. The guardian roster favours four seeded kinds per ring (0-6, 7-18, 19-50 sections) at three times the weight, for crossings first entered under Exploration. The cadence check (2.7) runs as a simulation in `tests/progression-phase8.test.ts`; its numbers are a model, with assumptions written beside it.

**Watching difficulty.** No numbers change in this plan; creature health and damage stay as they are.

- *Why it matters:* Tim has already lowered player damage by about 10-20%. Under v1 the start is stronger than today (a chosen weapon, Aegis, Aerial Step, the brawler gear dropping from the start). From Infinite III on, though, a v1 character holds fewer Lattice picks, forms and arts than a v0 one, so it is **weaker for longer in the mid and late game**.
- *How to watch it,* with nothing sent anywhere:
  1. **The Pace line, in the Journal, for every player** (Tim, 2026-11-20). It shows hours played, new sections, abilities earned by route, Echoes, and deaths per hour, read from the save.
     - The Journal over Options, because it is about the journey, not a setting, and players already go there to see how a journey is going.
     - It sits at the top of the compendium page and does nothing else.
  2. **A Proving Ground "v1 view"** of a real journey: a copy of Tim's save, read under v1 rules, lists what he would and would not hold at his hours and sections, against the cadence table (2.7).
  3. **Checkpoints** in Tim's own v1 playtest at 2, 10, 20 and 40 hours. Things to note: time to fell the first world beast, the first Listener attempt, and deaths per hour against his v0 numbers.
- *Levers, all data:* the free Lattice passives, the Reliquary chance, milestone thresholds, the pity interval, and moving one more piece into an archetype's core.

---

## 8. Open questions for Tim

None. Tim answered revision 2's four questions on 2026-11-20:

- Rift Step stays at Aperture 18.
- Weapons are never gated, and there are no armoury picks.
- Every fixed direction turns per seed.
- The Pace line is shown to every player, in the Journal.

The next decision is approval to start Phase 1.

---

## What changed in revision 2 (2026-11-20)

- **Modes**: Classic (v0) and Exploration (v1), chosen per journey and switchable in Options, with defaults and switch rules (section 6).
- **The start**: a weapon and tool choice screen; Aegis from the start; random seeds for every new journey; the hamlets and Arcana homes turned per seed (4.0).
- **The core kit by levelling alone** (Rift Step and the armoury picks were withdrawn in revision 3): Aerial Step at Aperture 6; Rift Step at 12; Cinder Dart as the short-cooldown starter; spells by level; armoury picks; capstones by points; 3 free Lattice passives; a G1 table per archetype (2.5, 3).
- **Secondary forms** are now mostly found in the world (11), with 4 for Viscera.
- **Awakening at Infinite II**, with the analysis (3.6). **The hatchling at Infinite II.**
- **Pity is now a lead, never an ability**, after 200 sections. A cadence table calibrated on Tim's 40 hours and 1,300 sections (2.7).
- **The Reliquary** route: a mad find at the bottom of dungeons, certain on the first horde, Pentagon, seed realm and vault. Horde quests ask for one clear only, and rumours point to the nearest horde.
- **Quest verbs** limited to Act, defeat, reach, survive, clear and use (2.8). Every hook in section 3 is rewritten in them.
- **Onboarding**: the Refuge's people point to Maud; Maud's errand is plain and points the compass (4.1).
- **Watching difficulty** without changing numbers (section 7). Build phases reordered: modes, starts and the core kit come early.
- **Open questions** cut to the four that remain.

## What changed in revision 3 (2026-11-20)

- **Rift Step** stays at Aperture 18, as today; the Aerial Step plan is unchanged (0, 3.1, 7).
- **Weapons are never gated** in either mode (3.7):
  - the armoury cadence is removed everywhere;
  - today's level gifts stay as a sure copy;
  - the Iron Fists, Hammerfall and Great Sweep join the loot pool on their own seeded streams;
  - the Orrery, already loot, leaves the world pool, which is now 44.
- **The archetype table** is re-checked so its power column is only passives, skills and spells (2.5).
- **Random turns for every fixed direction**, listed with their code (4.0): the hamlets, the Arcana homes, the Readings' quarters (and their Torn Pages), the Far Sleep's edge, the Surveyor's statue line, and the Viewport's first hunt. One 45° frame turn per journey, for new journeys only.
- **The Pace line** is in the Journal, for every player (5, 7).
- **Section 8** is empty.
