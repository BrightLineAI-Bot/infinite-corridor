# Progression by exploration: a proposal

**Status: a proposal for Tim, 2026-11-19. Nothing here is built.** No acquisition changes until Tim approves this (AGENT_CONTEXT, "Quests as the way abilities are earned"). The doc covers what exists today, what would be new, and which decisions are still open (section 8).

Sources: Tim's direction of 2026-11-19 (`docs/AGENT_CONTEXT.md`; `docs/narrative-bible.md` section 8; field guide "Content stages"), `docs/stage-4-inventory.md`, and the current `src/`.

---

## 0. The idea in one screen

**What changes for the player:**

- Levelling still makes you sturdier: health, stamina, stat points, and a few weapons shown in advance.
- Everything strange is out in the world: in crossings, in threads, in places nobody has mapped. That covers the passives, the spells, the weapon arts, the forms, the Echoes and the odd gear.
- Every ability gets a place, a person, a deed or a story it comes from, so the map of the story and the map of your build are the same map.

Abilities are earned five ways:

| Code | Route | In one line |
|---|---|---|
| **a** | Levelling | "These are the level-ups." Shown ahead of time. |
| **b** | Arcanum / Constellation quest | Spend the point, and the lens shows you where to go. Finishing the quest grants the ability. |
| **c** | Milestone | Do a thing enough times: dungeons, Listeners, relays, skyways, the sea. |
| **d** | Thread | Pick up a thread piece. Something waits at the end, or nothing is said. |
| **V** | Divine Viscera | Bought late, from the endgame currency. Never a build's core. |

Two more labels are used in the tables: **S**, held from the start, and **F**, found (loot, kills, captures, as today).

**Rules that keep it playable:**

1. Every build archetype has a **core** that is directed and reachable near you once you are strong enough for it.
2. You always hold **2 to 3 known leads**.
3. A **pity rule** means a long walk always ends in something.
4. Which ability waits where is **seeded per journey and version-pinned**: playthroughs differ, and nothing already placed ever moves.
5. **No new story density.** Quests hang off threads, crossings, towns, lairs, bosses and places that already exist.
6. **Existing journeys keep everything they have.**
7. **Help without interruptions:** one-line first-use hints (never in a fight, one at a time), a how-to page per ability, and an optional training yard (section 4A).

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
- **Homes on the map.** `lore.ts ARCANA_REGIONS` gives a ring of distance and a compass sector around the Refuge. The Journal says "the rest most likely lie south-west, 25 to 50 out".
- **Story budget and versions.** Threads take shared slots at 0.12 a crossing. Each crossing is pinned to its story and region version the first time it is pinned (`game.ts pinDungeonLayout`).
- **Places worked out once and saved.** The Second Wayfarer's six sightings are computed once from the seed and kept in the save (`second-wayfarer.ts`). Seed hunts are objects laid over a place as it loads, never a generator change (`tall-towers.ts`).
- **"Said to stand there."** `wonders.ts` finds the nearest unexplored Sky Stair, great tree or Starfield from cheap hashes, and a traveller says which way it lies. That is a rumour engine.
- **Reward hooks.** `lore.ts ARCANA_UNLOCKS` and `ARCANA_PASSIVES` are working, and `threads.ts ARCANA_REWARDS` is an empty general hook.
- **Precedents for quest-earned abilities:** the Tidemantle, the hatchling, Bell Toll, Lamplighter's Light, the far quests that a beast's fall opens (`far-realms.ts`), and refinement opening at a town past 1,000 sections.

### 2.2 The five routes in detail

**(a) Levelling.** Health, stamina and stat points, as now. The Arcanum's new "Level-ups ahead" line names the next few gifts: "Level 4: Cinder Pike · Level 8: Needle Caster · Level 12: Fourfold Daggers · Level 16: Quandrix Staff". A few early spells move onto levels too (section 3). Aperture still opens the first disciplines and earns constellation points.

**(b) Arcanum and Constellation quests.**
- The power gate stays; what changes is what happens when it opens. Spending the point, or reaching the tier, **attunes** the node, and attuning opens a quest.
- The node is shown half-lit with "The lens shows a place". Finishing the quest lights the node.
- The quest names a place class and a condition, for example: "A Great Keep, west of the Refuge, 20 to 40 sections out", or "a desert at least 50 sections from the Ember Refuge".
- Accepting the quest points the compass.
- Attuning never spends a point that is lost. If you respec, the point returns and the quest stays in the Journal.

**(c) Milestones.**
- Counters of things the player already does: crossings cleared, Deep levels charted, Listeners felled, relays restored, Pentagons finished, Skylands cleared, Rites of Ascendancy, seed-realm hearts, world beasts felled, sections walked, sea miles, skyway crossings, dives.
- A milestone is shown once its first count is made ("Relays restored: 3 of 5").
- Counters are cheap integers in the save. Most exist already: `farArray.listeners`, `relay-chain.count`, `roomBeastSlain`, charting. A few are new: sea miles, skyway crossings and dives.

**(d) Threads.**
- Finishing a thread grants its ability. Twenty-five carriers already exist: the 21 threads, the Seven Bells, the Surveyor's Chain, the Torn Pages and the Second Wayfarer.
- On the thread's Arcana card, the reward is one of three kinds:
  - *named*: "Completing it opens Pocket Time";
  - *hinted*: "Something waits at the end";
  - *hidden*: nothing is said.
- No new thread pieces are written for this. Rewards hang off endings that already exist.

**(V) Divine Viscera.**
- Bought late, at Sela's Sphere Forge or any smith past 1,000 sections, where refinement already takes Viscera, and at the Pentagon dais.
- **Secondary forms are bought here**: the other face of a star you already hold.
- Also bought here: a **rumour**, which turns the nearest hidden ability into a hinted lead. That is an endgame pity valve.
- Viscera never buys a build's core.

**Found (F).** Loot, guardian drops, captures and first kills, as today. Tim's "some abilities are simply found at random" lives here and in the hidden routes.

### 2.3 Tiers: where things wait

Distances are straight-line from Ember Refuge, as the Arcana homes and the far realms measure them. **Layers** are not distances: they are the other maps.

| Tier | Where | What waits there |
|---|---|---|
| **R0 Hearth** | The Refuge and 0-6 sections | The starting kit, the first errand, the first lead, the first Echo |
| **R1 Near** | 3-18 | Every archetype's first core piece. Near threads (Lamplighter, Letters, Beekeeper, Ferryman). |
| **R2 Middle** | 19-50 | Disciplines' quests (Veil, Force, Rift). Middle threads. Great Keeps, castles, labyrinths. |
| **R3 Far** | 50-150 | "A desert at least 50 out", the Reckoning Fields, the Magma Rivers, the Rimeglaciers. Far threads. Capstones. |
| **R4 Deep band** | 150-1,000 | Late capstones, heavy forms, the Second Surveyor, the Sleeper |
| **R5 Beyond** | 1,000+ | Far realms, domains, civilisations, the far threads, Viscera |
| **Sea** | Open sea, isles, dive sites, shipwrecks | Tidemantle-gated. Mosasaur-adjacent quests, dives. |
| **Sky** | Great trees, skyways, Sky Stairs, Skylands, Cloud Hold, Upwells | Glider-gated. Motion and aerial abilities. |
| **Under** | The Deep, chasms, canyons, Starfields | Charting milestones, Rift abilities |
| **Strange** | Seed realms, the Askew, bizarro pockets, the Pentagon | Stage 4's strangest things |

**The power gate still applies.** A tier-13 ability's quest only opens at tier 13. Its distance is measured from where you are *then*: from your **current hometown** (Listener towns count), not from the Refuge. Late abilities therefore never send a player back to the start, and "far" stays relative to how far you have come.

### 2.4 Variety per playthrough, deterministically

Some pairings are **fixed (F)** because the theme makes them: the Clockmaker's Hours gives Pocket Time, the Well-Digger's Rope gives Gravity Well. The rest sit in **seeded pools (~)**.

- **Pools.** Each tier holds pools of abilities that are interchangeable for reward purposes (for example "R2 thread rewards", "R3 capstone sites", "Under milestones"). A journey's seed decides who sits where:
  - which ability each pool slot carries;
  - which compass sector a quest's home lies in;
  - which of two to four candidate place classes the quest uses (a Great Keep, a castle or a labyrinth).

  So on one journey the Choir of Stones ends in Echoing Cast, and on another in Casting Wind. One player's Fold quest sends them to the Askew; another's to a Starfield crossing.
- **The hash.** `hash(seed : progression : v<N> : <pool>)`, the same kind of seeded roll as `ARCANA_REGIONS` and the Second Wayfarer.
- **Worked out once and saved.** A slot's assignment is realised and stored the first time it matters: when the quest opens, the thread starts, or a rumour names it. This is the Second Wayfarer's rule. Later table edits therefore never move anything already shown to the player.
- **Version-pinned.** A journey records `progression.version` when it adopts the system.
  - **Version 0** means today's rules, the legacy journeys.
  - **Version 1** is the first table. New abilities, or a change to a pool, go into **version 2 keys** and never edit a version 1 entry. This is how threads add `shared: { <next version>: [...] }`.
  - Crossings keep their own story and region versions, so a quest step never changes what a pinned crossing holds. Steps are objects laid over a place as it loads, like seed hunts, never tiles.
- **The guardian roster.** Pack-creature Echoes come from crossing guardians. A seeded roster per journey and ring decides which guardian kinds are commonest near the Refuge, so the first Echoes differ between playthroughs. This is new, behind the same version pin.

### 2.5 Guarantees: builds come together

**The archetypes.** Seven loose ones, defined by data, not classes; a player can mix freely.

| Archetype | Core (all directed, all within R1 of eligibility) |
|---|---|
| Brawler (Might) | Iron Fists, Ki Blast, Hammerfall, Shadow Boxing |
| Blade (Finesse) | Fourfold Daggers or Cinder Pike, its art, Tempo |
| Spellblade (Focus melee) | Salvage Blade, Transpose, Imbue Weapon, Arcane Edge |
| Caster | Quandrix Staff or the base spells, Mage's Hand, Echoing Cast, Wellspring Ground |
| Gunner (tools) | Carbine or Blunderbuss, Rapid Reload, Charged Air |
| Warden (guard) | Veil Guard, Aegis, Sanctum, Mirror Veil |
| Beastcaller (Echo and companion) | Amplifier, the hatchling, a beast mount, Corridor Golem |

**G1, the core rule.** Every archetype's core is directed, fixed (not pooled), and placed within **R1 of the player's hometown at the moment they become eligible**. A brawler at tier 13 can always get Iron Fists and Ki Blast within about 18 sections. The weird, far and hidden things are the second half of a build, never the first.

**G2, the lead floor.** The Journal always shows at least **2 known leads** (named or hinted) the player can act on now. When it falls below 2, the next speaker the player talks to gives a **rumour**: a reciter, a villager, a town keeper, the cook, a lookout or Old Quillon. The rumour names the nearest eligible ability, preferring the archetype of the equipped weapon and spells. At most **3 directed quests** are open at once, so the Journal never becomes a checklist. Hints and rumours do not count toward the 3.

**G3, the pity rule.** A counter of new sections explored since the last ability gained. After **40** with nothing, the next crossing guardian or world cache holds a *found* ability from the eligible hidden pool. The surprise is real; it is just never too late. The number is data and is tuned in Phase 3.

**G4, never stranded.** A quest step that needs a place ("a desert at least 50 out") is resolved when the step opens.
- It takes the nearest unexplored section meeting the condition, found by cheap biome and distance hashes as `wonders.ts` does. It is saved and never moves.
- If none exists within a search budget, the condition relaxes: any section that far out, in that sector.
- A step inside a crossing uses a crossing not yet entered, never a pinned one.

**G5, the power match.** Nothing in R3 or beyond is a requirement for any core.

**G6, the reachability test.** Before anything ships, a simulation over 1,000 seeds checks that:
- every archetype's core resolves within its radius;
- the lead floor holds;
- at least one ability is gained every 40 sections on average across rings R1-R3.

### 2.6 How it fits the story budget

- **No new density.** Quests are short errands: one line from a giver, one line on completion, and a Journal entry in the existing voice. They are not threads. The 0.12 thread budget is untouched.
- **Anchors are existing things:**
  - thread endings and Arcana sets;
  - the Cairn Keeper, Sela, Oren, Vela, Hollis Dray, Ilse, Old Quillon, the Shipwright and the Upwell lookouts;
  - the Beast Hotel mama;
  - Listener towns and their smiths and cooks;
  - crossing guardians, world beasts, Deep lairs and domains;
  - Pentagons and their roofs;
  - Skylands, Rites, seed realms, the Askew, shipwrecks and dive sites.
- **Rumours** replace an idle line; they never add a speaker.
- A new thread written later follows the existing rule: it takes a shared slot under a new story version.
- Tone follows the bible: subtle, never explained, and hooks may be absurd (section 3) without breaking it. The Corridor is strange, and a quest can be.

---

## 3. A route for every ability

How to read the tables:

- **Route:** a / b / c / d / V / S (start) / F (found). A **~** means the slot is seeded (2.4) and the line shows one example.
- **Where / what** gives the tier from 2.3 and the hook, one line each, leaning into the weirdness.
- **Seen:** **D** directed (named, can be followed), **H** hinted (something waits, a vague where), **X** hidden (a surprise).

### 3.1 Disciplines

| Ability | Route | Where / what | Seen |
|---|---|---|---|
| Ember Form | a | Aperture 6, at Sela's lens. "Something in you is already on fire; Sela only names it." | D |
| Quickening | a | Aperture 6, at Sela's lens | D |
| Veil Guard | b | Attune at Aperture 18; R2. Stand in a Gloomwisp haunt's fog until it gets bored of you. | D |
| Force Channel | b | Attune at 18; R2. Carry a Hollow Marshal's live terminal charge to a restored relay without dropping it (a hit drops it). | D |
| Rift Step | b~ | Attune at 18; Under. Step into a Starfield crossing's gap and come out somewhere you have not been. | D |
| Aerial Step | b | The Motion capstone; Sky. At a great tree's crown, step off the last branch and refuse to fall. | D |

### 3.2 Spells

| Ability | Route | Where / what | Seen |
|---|---|---|---|
| Cinder Dart | S | Starting kit | D |
| Ember Ring | a | Level 3 | D |
| Fire Burst | a | Level 6 | D |
| Grave Sun | d | Letters Not Sent (R1). The last letter is addressed to you; inside it, a small black sun. | H |
| Aegis | b | Tier 13, Warden core, R1. Oren gives his shield-word to whoever brings the Key Warden's key out of a castle maze unbroken. | D |
| Shadow Boxing | b | Tier 13, Brawler core, R1. A Gaunt Duelist boxes his own shadow at a resonant crossing; beat him bare-handed. | D |
| Imbue Weapon | b | Tier 13, Spellblade core, R1. Sela quenches your blade in something still alive: bring a Mire Heart's pulse. | D |
| Shadow Clone | d | The Second Wayfarer (fixed). Someone dressed as you leaves you, at the last, what they were. | X |
| Gravity Well | d | The Well-Digger's Rope (fixed). The stone that never stops sinking, held in your hand. | H |
| Stillpoint | d | What the Sleeper Dreams (fixed). A shell holding one held breath. | H |
| Orbit Volley | c | Sky. Clear 3 Skylands: their small moons follow you home. | D |
| Essence Walk | b~ | Tier 13, R2. Eat Hollis Dray's lumen-cap broth and walk a Starfield crossing the wrong way round. | D |

### 3.3 Constellation nodes

Modifiers stay **a**: a point, as today. They are the plain spine of each branch.

| Ability | Route | Where / what | Seen |
|---|---|---|---|
| Ember Skin, Light Feet, Thorned Veil, Overflow, Rift Wake | a | A point once the discipline has a rank | D |
| Colossus | b | R4/Strange. Let a Battlement Colossus step on you while Ember Form holds. Get up. | D |
| Cinder Heart | b~ | R3. Carry an ember from the Magma Rivers to the Refuge hearth; it goes out if you dodge. | D |
| Slipstream | b | R3. Outrun the Questing Beast's charge three times in one fight. | D |
| Sanctuary | b~ | R2. Kneel at a Saint of the Low Water's spring with Veil Guard up while something bites you. | D |
| Mirror Veil | d | The Mirror That Remembers (fixed). The last shard shows you, then doesn't. Warden core: see the open questions. | H |
| Amplifier | b | R1 of eligibility, Beastcaller core. Ring the hollow relays in order until the hum learns your name (restore 3). | D |
| Resonant Force | c | Fell 100 foes during Force Channel | D |
| Fold | b~ | Strange. In the Askew, dog-ear the map: stand on two sections that should be far apart within 60 s. | D |
| Long Step | c | Under. Rift Step across 100 gaps (canyon, chasm, water). | D |
| Arcane Edge | d | The Toolmaker's Handles (fixed; Spellblade core: the thread is R1-R2). The unshaped stave worn to your grip teaches the blade to carry the spell. | H |
| Casting Wind | c | Sky. Cast 30 spells while gliding or air-walking. | D |
| Pocket Time | d | The Clockmaker's Hours (fixed). The last watch still runs, set to yours. | H |
| Echoing Cast | d~ | The Choir of Stones (example). The chord sings your spells back, quieter. Caster core when it is pooled near. | H |
| Glyph Mine | b | Strange. Mine five sigils from the Vein Wraiths of the Hollow Husk. | D |

**Secondary forms (16): route V.** Bought at Sela's forge or a far smith for Divine Viscera once the node is owned: "the other face of a star you already hold". There is one exception:

| Ability | Route | Where / what | Seen |
|---|---|---|---|
| Quickened Stride | c | Sky. Cross a Cloud Hold summit skyway without touching ground. | D |
| The other 15 forms | V | For example 6 Viscera each, a table value | D |

### 3.4 Lattice field passives

The Lattice itself still opens at tier 13 after a Listener falls. What goes in its slots must now be *earned*.

| Ability | Route | Where / what | Seen |
|---|---|---|---|
| Sanctum | b | Warden core, R1. Sit in a Terrace Springs hot spring while a spell lingers, until the water hums. | D |
| Wellspring Ground | d~ | The Drowned Library (example; Caster core when pooled near). The water reads, and now so does the ground. | H |
| Charged Air | c | Gunner core. Fell the Lightning Giant; the air keeps its charge. | D |
| Spellblade | b~ | R2. Strike 20 runed foes in a Lamplit City Pentagon. | D |
| Drift Field | c | Sky. Drift 1,000 tiles on the glider. | D |
| Tempo | b | Blade core, R1. A clockwork metronome in an Ember Foundry room: land five hits on each tick, ten ticks running. | D |
| Shatterpoint | c | Break the poise of 25 elites | H |
| Power Aegis | b | R3. Perfect-parry the Gate Revenant with Aegis. It is impressed, in its way. | D |
| Bell Toll; Lamplighter's Light | d | The Seven Bells; the Lamplighter's Round. Unchanged. | D |

### 3.5 Weapon arts and tool forms

| Ability | Route | Where / what | Seen |
|---|---|---|---|
| Ki Blast | c | Brawler core. Finish 15 fights with the Iron Fists; on the 15th, you shout and something leaves. | D |
| Cinder Javelin | d | The Ferryman's Fares (fixed, R1-R2). Throw the ferry pole across the river nobody crosses. | H |
| Transpose | d | The Tollkeeper's Keys (fixed; Spellblade core: the thread is R2). The glass key's keyhole, set down as a seal. | H |
| Blade Stream | b | Blade core, R1. In a Lamplit City Pentagon, put out every lamp before the first relights. | D |
| Lava Slash | c | R3. Fell 30 foes standing in lava (the Magma Rivers). | D |
| Mage's Hand | d~ | The Tall Child's Slates (example, R5). A hand the size of a door, offered gently. Caster core: a pooled near copy is guaranteed. | H |
| Rapid Reload | c | Gunner core. Land 200 charged releases. | D |
| Arc Wave | b~ | Sea. Salvage three shipwrecks in a storm with the Blunderbuss loaded. | D |
| Cluster Shell | c | Strange. Burst 10 bizarro pockets' heart-forms with the Rift Bombard. | H |
| Corridor Golem | b | Under, R2. Bring stones from five canyon craters to the quarry keeper; she stacks a small man who stands up. | D |
| Sunburst Ricochet | c~ | Shatter 10 Prism Stilts with the Lumen Spindle | H |
| Continuous Assault | d | The Tinker's Tags (fixed, R5). Tag 7, burnt into the copper by the robots, and their sky lasers with it. | X |
| Mirage of Blades | c | Fell 6 of the Gaunt with the Great Sweep | H |

### 3.6 Awakening and awakened moves

| Ability | Route | Where / what | Seen |
|---|---|---|---|
| Awakening | Forge, as today | Sela, lumen dust, cap and a Resonance | D |
| Fissure, Returning Blades, Lance, Roundhouse Kick, Spell Runes | Forge, as today | They come with the awakened weapon | D |
| Sweep freeze, Hammerfall clap | Forge, as today | | D |

Awakening is a growth system. Its moves come with the weapon, so it stays a forge service.

### 3.7 Weapons, tools, armour, charm

| Ability | Route | Where / what | Seen |
|---|---|---|---|
| Salvage Blade, Spark Coil | S | Starting kit | D |
| Cinder Pike; Needle Caster; Fourfold Daggers; Quandrix Staff | a + F | Levels 4, 8, 12 and 16, shown in "Level-ups ahead", and loot | D |
| Verge Cleaver, Lumen Spindle, Rift Bombard, armour, Quiet Compass | F | Loot | X |
| Blunderbuss; Carbine | Upgrade | +6 on the Needle Caster or Spark Coil, as today. A transformation is its own reward. | D |
| Iron Fists | b | Brawler core, tier 13, R1. A boxing ring chalked in a Great Keep courtyard: win three bouts against the Gaunt. | D |
| Hammerfall | b | Brawler core, tier 13, R1. The quarry keeper's hammer fell into a canyon crater and an Earth Golem is using it. | D |
| Great Sweep | b~ | Tier 13, R2. Mow a field of the Revenant horde in the Reckoning Fields. | D |
| Aether Orrery | c + F | Sky. Stand on 3 Sky Stair summits at night. Also loot, as today. | D |

### 3.8 Echoes

**Keep the route: F, a first kill.** It is already the most convincing tie in the game. What is new:

- **The seeded guardian roster** (2.4) decides which pack-creature Echoes are near on this journey.
- **Hints:** a creature you have seen but whose Echo you lack appears as "rumoured" in the compendium.

| Echoes | Route | Seen |
|---|---|---|
| 17 guardian Echoes | F~ (roster) | H once the creature is seen, else X |
| 15 world-beast and unique Echoes | F (first kill) | D once the beast is known |
| Bloblet Mend, Tentacle Ember | F (minion, once the parent falls) | X |
| Stegosaur's Grip, Spinosaur's Echo, Earth Resolve, Triceratops Cunning | F (first kill) | H |
| Listener's Answer | c (first Listener kill) | H |

### 3.9 Glyphs, Resonances, Triads, Tesseracts

| Ability | Route | Notes | Seen |
|---|---|---|---|
| 10 base glyphs | F | Drops, as today | X |
| Gathered Breath | F | A rare drop, as today | X |
| Resonances, Triads, Pairings | Emergent | Found by combining: the "exploring yourself" part of exploration. The compendium counts them ("5 of 8 Resonances heard"). | H |
| Tesseract glyphs | F | Pentagon places, as today | H |

### 3.10 Marginalia, potions, meals

| Ability | Route | Where / what | Seen |
|---|---|---|---|
| 17 marginalia | F | Margin Wardens, as today | X |
| Quick Ink, Inkwell, Ink Shield | d / F | Also from the Ink-Clerk's Blotters (R5): the black ink knows them | H |
| Potions; meals | S / economy | Unchanged. A meal is a supply, not an ability. | D |

### 3.11 Mounts and companions

| Ability | Route | Where / what | Seen |
|---|---|---|---|
| 9 beast mounts | F | Pen the hurt beast, as today | D |
| Triceratops | F | Herds and the Beast Hotel, as today | D |
| Hatchling | b | The mama's rescue, as today (already a quest). It counts as the Beastcaller core. | D |

### 3.12 Traversal and utility

| Ability | Route | Where / what | Seen |
|---|---|---|---|
| Lantern, Build, Oculus | S | Unchanged | D |
| Leaf glider; Tidemantle; skiff; diving | F / b | Unchanged: already place- and quest-tied | D |
| Robot / drone / submersible | b | R1. A foundry blueprint in a crossing chest; Sela can read it. Proposed, see the open questions. | H |
| Shovel, travel seeds, Stego Bait, Crossing Sigil, Return Ember, rounds, sling | Unchanged | | D |

### 3.13 Route totals (proposed)

The 115 abilities that today have no world tie would go as follows:

| Route | Count | Notes |
|---|---|---|
| a | 14 | 5 modifiers, 2 disciplines, 3 spells, 4 milestone weapons |
| b | 30 | |
| c | 16 | |
| d | 13 | Plus the 2 Arcana passives already there |
| V | 15 | Secondary forms |
| Forge, starting kit or upgrade | 13 | Awakening, 7 awakened moves, 2 starting weapons, Cinder Dart, Blunderbuss, Carbine |
| F | The rest | Loot, as today |

Exact numbers move with Tim's answers.

---

## 4. Onboarding: the player knows from minute one

**What the player should come away with in the first hour:** I grow by going out. Levels make me sturdier; the strange things are out there; there are quests; I choose where the compass points.

### 4.1 The first hour

1. **Waking at Ember Refuge.** The Cairn Keeper, Maud Fennick, stands by the cairn as now. Her opening gains one line between her first two. This is a draft for Tim to rewrite:
   > "Levels'll make you sturdier. That's all the Refuge can give you. Everything strange is out there: in the crossings, in what people dropped, in places nobody's walked yet. Abel knew. Go and get measured."

   She then sets the errand as today: the first crossing holds the chain's first link.
2. **The first level-up** (level 2). Its message adds the "Level-ups ahead" line: "Ahead: Level 3 Ember Ring · Level 4 Cinder Pike · Level 6 Fire Burst". This is route (a), visibly.
3. **The first crossing.** Each find shows one route:
   - the chain link (exists);
   - the guardian's Echo, certain as today: the first *found* power;
   - a **guaranteed thread piece** from a near thread, rolled for this one crossing on new journeys. Its Arcana card says "something waits at the end" (d).
4. **Back at the Refuge, or the first hamlet.** Sela's Arcanum now shows half-lit nodes ("the lens shows a place"). The first time the player opens it, a one-line card:
   > "Some stars Sela can teach. Others you have to go and stand under."

   A villager in the first hamlet has a rumour instead of an idle line: the first **hinted** lead. That makes two leads (G2).
5. **The first attuned node** (Aperture 18, usually within the first hour or two). This is the first route (b) quest, directed, in R2. Accepting it points the compass.

### 4.2 The words the game uses

- **"Lead"**: anything you know of and can act on (a quest, a rumour, a milestone in progress). The Journal's Active quests becomes **Leads**, with the quests first, then rumours.
- **"Attuned"**: a node whose quest is open.
- **"Something waits at the end"**: the hinted thread reward. "It does not say": hidden.
- **The first lead banner**, once only:
  > "A lead. Hold the compass to follow it, or don't: leads keep."
- **No tutorial pop-ups beyond these.** The Cairn Keeper's line, the level-up line, Sela's card and the first-lead banner carry it.

### 4.3 The compass leads without hand-holding

- It never points by itself. Accepting a quest points it, as now. The compass's hold menu lists Leads.
- Hinted leads give a sector and a range, the way the Arcana homes already do ("east of the Refuge, 19 to 35 sections out"). Following one sets the compass to the sector's nearest edge, not to the spot.
- Hidden things are never on the compass.
- If the player has no needle set and **no** lead has been followed for a long while (for example 15 new sections), the Journal button shows a small dot. No arrow, no marker.

---

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

Three options, from least to most work. The proposal recommends **(i) now and (ii) later**.

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
- it is only offered for abilities the player **owns** (it should not become a free preview of quest rewards). Lending one not yet owned is an open question.

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

A new page in the Reciter's Tome, **"What the Corridor Taught You"** (or in the Journal: Tim's choice).

**Grouping.** By kind (disciplines, spells, nodes, the Lattice, arts and forms, Echoes, glyph combinations, gear, mounts, traversal). Each group shows a count of known against total: "Echoes: 11 of 37".

**An entry has four states:**

| State | What shows | When |
|---|---|---|
| Unknown | Nothing but the group count | Hidden routes until owned; everything else until rumoured |
| Rumoured | The name and a vague where ("said to be found south, 20 to 40 sections out"), or "a thread's ending" | A rumour, a seen creature, a hinted thread card |
| Open | The name, the route, the steps done and left, a Follow button | Quest open, milestone counting |
| Owned | What it does, and **how it was earned**: where, when, from whom ("Pocket Time: the Clockmaker's Hours, finished 3 sections north of Larrow Ford") | On gain |

The "how it was earned" line is the playthrough's own record. Two players comparing compendiums see different stories.

**Also on the page:**

- **Level-ups ahead**: the next gifts by level.
- **Kits**: a small row per archetype, showing how many of its core pieces are owned, rumoured or open. This answers "what is my build moving toward?" without a checklist of the whole world.

**Existing journeys** see every owned ability as Owned, with the line "Before the Corridor kept count".

---

## 6. Existing journeys

**Never take away.** Everything a journey has, keeps working exactly as it does:

- owned Echoes, glyphs, Tesseracts, marginalia, gear and mounts;
- learned disciplines and nodes, and the secondary-form choices;
- Lattice picks;
- open spells.

What is open to them today stays open.

**Version 0 stays version 0.**

- A journey from before the system records `progression.version = 0`: the legacy rules. Power gates keep granting what they grant today, so a version 0 journey that reaches tier 13 still gets the tier-13 spells and the Lattice picks as now.
- On top of that, it **gets the new leads, quests and milestones as extra routes**. A quest for something it already owns is not offered. A thread reward it already owns pays a small consolation (lumen dust) and names what the thread "would have taught".
- The compendium fills in from what it owns.

**New journeys** start at version 1: the new routes, the new gates.

**An option for Tim (see the open questions):** let a version 0 player *choose* to switch to version 1 from the Options page, keeping everything owned and gating only what they have not yet unlocked. It would be one-way, behind a confirmation.

---

## 7. Build phases

Each phase is one release or a few, previewed for Tim, the smallest shippable first. Every phase keeps the test floor and adds its own tests.

| Phase | What ships | Gameplay change | Main risks | Tests it needs |
|---|---|---|---|---|
| **1. The spine** | `src/progression.ts`: the data table of every ability (route, tier, pool, visibility, anchor class), pure. The compendium page showing **today's** routes honestly. "Level-ups ahead". | None: read-only | The table drifting from the code | Every ability id in `SPELLS`, `APERTURE_SKILLS`, `BRANCHES`, `ALT_PASSIVES`, `FIELD_PASSIVES`, `TOOL_FORMS`, `ECHOES`, `GLYPHS`, `MARGINALIA`, `MOUNT_IDS` and `MILESTONE_GEAR` has a row (a coverage test fails when a new ability is added without one). Compendium states. |
| **2. Leads** | Journal "Leads"; rumours from existing speakers; the lead floor (G2); the first-lead banner; the Cairn Keeper's new line; the first-crossing thread piece on new journeys. `save.progression` additive at schema 14, normalised in `freshSave` and `migrateSave`. | Text and guidance only; nothing locked | Story budget (the rumours replace idle lines); the first-crossing roll must not touch pinned crossings | Migration and exact resume of `save.progression`; rumour determinism; the floor holds over a simulated walk; pinned crossings unchanged |
| **2b. Hints and how-to pages** | First-use hints (4A.2) with the budget (4A.6); the Options → Hints setting; how-to pages from the data table (4A.3); the existing Journal explanations linked in. Can ship before any gating, and helps today's game too. | Presentation only | Hint spam; a hint firing mid-fight | Each subject shown once (`save.hints.seen` additive, migration test); suppressed while foes are engaged; the queue cap and gap; the coverage test requires a hint and a how-to for every row; the Off setting shows nothing |
| **2c. Training yard** | (i) The "Training Yard" preset and the how-to page's Try it button, through the existing Proving Ground handoff. Later, (ii) the sparring post in towns. | None to production | The page switch feeling heavy; lending abilities not owned | The existing isolation tests still pass (no production storage key in the laboratory graph); the preset lends only owned abilities; Exit resumes the journey exactly |
| **3. Milestones (c) and pity (G3)** | Counters, the milestone display, pity drops. On **version 1 journeys only**, the c-route abilities stop being free picks. | First real gating | Gating a Lattice pick a player relies on; counter cost on mobile (integers only) | Counter increments and their caps; version 0 journeys unchanged (old save fixtures); pity triggers at N |
| **4. Attuned quests (b), first batch** | The quest-step engine: steps resolved once and saved (G4); objects over places as they load. The cores first: Iron Fists, Hammerfall, Shadow Boxing, Aegis, Sanctum, Tempo, Blade Stream, Imbue Weapon, Amplifier. | Gates the cores on version 1, directed and near | A step placed somewhere unreachable; Proving Ground isolation (labs must still grant everything from scratch state) | Reachability sim (G6) over 1,000 seeds; step resolution is deterministic and saved; relaxation fallback; exact resume mid-step |
| **5. Thread rewards (d)** | Thread endings grant (`ARCANA_REWARDS`), with fixed and pooled slots seeded and realised once | Gates thread-tied abilities on version 1 | A thread nobody finds; the lead floor covers it by rumouring threads near | The pool permutation is stable per seed and version; a version 2 key never changes version 1 results; consolation on owned |
| **6. Far, sea, sky and strange quests** | The R3-R5 and layer quests ("a desert at least 50 out", shipwrecks, Cloud Hold, the Askew) | More gating, all non-core | Long searches for a matching section; perf of the biome scan (bounded, cached per section as `wonders.ts` does) | Search bounds; relaxation; no generator change (landscape versions untouched) |
| **7. Viscera and the guardian roster** | Secondary forms bought for Viscera (version 1); rumour purchase; the seeded guardian roster for new ground | Economy | Viscera supply versus price; the roster changing Echo pacing | Price table; roster determinism by version; version 0 ground keeps its guardians |
| **8. Opt-in switch (if Tim wants it)** | An Options toggle from version 0 to version 1 | Player's choice | Confusing players; it must never remove anything | Owned-everything-kept test over real old save fixtures |

**Risks that cut across all phases:**

- **Fun early, power late.** Moving tier-13 gifts behind quests slows Infinite III builds. The near-core rule (G1) and the reachability sim are the guard.
- **Save compatibility.** Everything is additive at schema 14, version-pinned, and never regenerates a journey.
- **Story tone.** Hooks are drafts; Tim rewrites any.
- **Tests ≠ device.** The pacing (one unlock per about 40 sections) needs Tim playing it.

---

## 8. Open questions for Tim

1. **Existing journeys.** Version 0 keeps today's rules plus the new quests as extras (recommended). Or should version 0 players be able to opt into the new gates (Phase 8)?
2. **How much stays free?** The proposal keeps free: Ember Form and Quickening, the five modifiers, Cinder Dart, the level-gifted weapons, Echoes, glyphs, loot, mounts and all traversal. Everything else moves to quests, milestones, threads or Viscera. Too much or too little?
3. **Secondary forms for Divine Viscera.** Is that the right "buy" list? Or should Viscera buy only rumours and rerolls, and the forms come from quests too?
4. **Variety: how much is seeded?** The proposal fixes about half (the thematic pairs and all cores) and seeds the rest within each tier. More shuffle (even cores vary) or less?
5. **The numbers.** The pity rule at 40 sections without a gain, the lead floor of 2, and at most 3 directed quests open. Also, does Mirror Veil (Warden core) stay a far thread, or get a near copy?
6. **Where the compendium lives**, the Reciter's Tome or the Journal, and its name.
7. **The Cairn Keeper's new line** and Sela's card: keep the drafts, or write your own?
8. **Hints.** On by default with the budget in 4A.6? And should the hint teach the source ("from the Clockmaker's watch"), or only what the ability does?
9. **Training yard.** "Try it" through the Proving Ground first, with town sparring posts later? And may it lend an ability the player has *not* earned yet (a preview), or only owned ones (recommended)?

---

*Prepared from the code at `origin/main` 825204efc (release 1031 era). File and line references were checked against that tree; counts were read from the live tables (`ECHO_IDS` 37, `MARGINALIA` 20, `RESONANCES` 8, `TRIADS` 6, `MOUNT_IDS` 9).*
