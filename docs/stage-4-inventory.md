# Stage 4 inventory: abilities and content to tie to quests

Written 2026-11-19 for Tim's direction of the same day (field guide "Content stages"; `docs/narrative-bible.md` section 8; `docs/AGENT_CONTEXT.md`). Tim wants Stage 4's passives, spells, skills, tools and abilities earned through quests, places and milestones, so different playthroughs come out with different kits. This file only lists what exists and how it is obtained today. The acquisition design comes later, from the lead, and needs Tim's approval.

**Stage 4** runs from release 727 (2026-11-04, PR #375, the first Pentagon) to now (release 1025). **Stage 3** is releases 575-726, and Stage 2 ends at release 573. The boundaries were found with `git log --first-parent` on main; the method is in the field guide.

How to read the tables:

- **Release** is the release that added the thing, taken from `CHANGELOG.md`. Later reworks are named after it.
- **How the player gets it today** gives a `src/` file:line, or the mechanism.
- **Proposed route** is left empty for the acquisition design. Its codes are Tim's: (a) levelling up; (b) an Arcanum or Constellation unlock that opens a quest; (c) an exploration milestone; (d) a thread.
- **(?)** marks a row whose Stage 4 membership is unsure, usually an older ability reworked in Stage 4.

The Transit Lattice opens at Aperture tier 13 (Infinite III) once a Listener has fallen. Its passive slots take any field passive or tool form with nothing to learn (`transit-lattice.ts:19`, `lattice-fields.ts:17`). Today, most Stage 4 passives are therefore simply chosen once the Lattice is open.

## 1. Passives

| Name | Release | How the player gets it today | What it does | Proposed route (a/b/c/d) |
|---|---|---|---|---|
| Tempo | 1010 | Transit Lattice field passive (`lattice-fields.ts:24`; rules `hit-cast-passives.ts` `TEMPO`) | Every 5th hit on a foe within 4 s opens a 2 s window in which it takes +25% damage. | |
| Shatterpoint | 1010 | Transit Lattice field passive (`lattice-fields.ts:25`; `SHATTERPOINT`) | +40% damage to staggered or poise-broken foes. | |
| Power Aegis | 1014 (reflect 1015, 1016; counts as your hit 1018) | Transit Lattice field passive (`lattice-fields.ts:27`; `POWER_AEGIS`) | Casting Aegis within 0.45 s of a blow parries it: the attacker staggers and the blow is sent back at 1.5x, homing (up to 15% of a boss's health). | |
| Rapid Reload | 1010 | Transit Lattice tool form (`lattice-fields.ts:52`; `RAPID_RELOAD`) | Every 3rd charged release that hits refunds 20% stamina, at most once every 1.5 s. | |
| Arcane Edge | 1010 | Constellation node, Form branch, learned with a constellation point once the discipline has a rank (`constellation.ts:56-58`) | A cast empowers the next 3 melee attacks (+30%) and adds the spell's element touch. | |
| Casting Wind | 1010 | Constellation node, Motion branch (`constellation.ts:56-58`) | Each cast refunds 15% stamina. | |
| Pocket Time | 1010 | Constellation node, Veil branch (`constellation.ts:56-58`) | Melee hits extend your active timed skill by 0.15 s, up to +3 s. | |
| Echoing Cast | 1010 | Constellation node, Force branch (`constellation.ts:56-58`) | Every 4th cast repeats at half power. | |
| Glyph Mine | 1010; Rift Step mines 1022 | Constellation node, Rift branch (`constellation.ts:56-58`; `hit-cast-passives.ts` `GLYPH_MINE`, `RIFT_MINE`) | Each cast leaves a sigil that bursts on a foe. With Rift Step, the mines link into a damaging line or triangle of void. | |
| Quickened Stride | 996 | Secondary form of the Quickening node, open from tier 13 (`constellation.ts:77`, `:86`) | Aerial Step holds a second charge, but Quickening can no longer be cast. | |
| Sanctuary leech | 1008 (?) | Rework of the older Sanctuary node (`constellation.ts` `SANCTUARY.leech`) | While Veil Guard holds, heal 12% of hit damage; the heal cap rises to 15%/s against elites and stronger. | |
| Bell Toll | 886 | Quest reward: finish the Seven Bells (`lore.ts:226`, `ARCANA_PASSIVES` `lore.ts:232`) | A heavy blow stuns every foe near the one struck. This is already quest-tied, a precedent. | already (d) |
| Lamplighter's Light | 886 | Quest reward: finish the Lamplighter's Round (`lore.ts:227`) | Whatever light you see by reaches farther into the dark. Already quest-tied. | already (d) |
| Encumbered (status) | 1022 | Always on: built up by pull damage (`hit-cast-passives.ts` `ENCUMBERED`) | Pull damage fills a meter; when it is full, the foe takes +5% and deals -5% for 10 s. This is a mechanic, not a pick; listed for completeness. | |

## 2. Spells and Aperture skills

| Name | Release | How the player gets it today | What it does | Proposed route (a/b/c/d) |
|---|---|---|---|---|
| Imbue Weapon | 753 | Spell that opens at tier 13, Infinite III (`items.ts:61`, `unlockTier:13`; `spellOpen` `items.ts:66`) | For 20 s every melee hit adds magic damage from Focus. | |
| Essence Walk | 769 | Spell that opens at tier 13 (`items.ts:63`) | For 8 s, spells still on cooldown cast anyway for stamina. | |
| Aerial Step (air walk) | 996 (?) | Older Motion discipline at Aperture 36 (`items.ts:109`), reworked in Stage 4 | Walk on air at cast height, catch a fall; 2 casts per airtime. | |
| Glyph Mine × Rift Step | 1022 (?) | Rift Step together with Glyph Mine (above) | See Glyph Mine; an extension of an older skill. | |

## 3. Skills, weapon arts and moves

| Name | Release | How the player gets it today | What it does | Proposed route (a/b/c/d) |
|---|---|---|---|---|
| Lava Slash | 938 | Transit Lattice tool form, Verge Cleaver only (`lattice-fields.ts:44`; `weapon-arts.ts:38`) | Three attacks arm it; a charged release dashes to a foe and erupts the ground. | |
| Blade Stream | 938 | Lattice tool form, Fourfold Daggers only | A storm of light slashes around you. | |
| Cinder Javelin | 938 | Lattice tool form, Cinder Pike only | Hurl the pike through foes; it returns. | |
| Ki Blast | 938 | Lattice tool form, Iron Fists only | The next punch fires a ki blast; on the uppercut, from the air, with a ground slam (945). | |
| Transpose | 938 | Lattice tool form, Salvage Blade only | A seal: +25% spell damage, +5% damage taken; melee hits extend it. | |
| Awakened moves (Fissure, returning daggers, Lance, roundhouse kick, spell runes) | 939 | Awakening at Sela's forge for lumen dust (`constellation.ts:25` `AWAKEN_COST`; `weapon-arts.ts:91` `AWAKENED_ARTS`) | Each primary's own awakened move, replacing the shared crescent; with the weapon art selected, a small extra. | |
| Awakened Great Sweep freeze | 967 | Awakened Great Sweep (`great-sweep.ts:155` `SWEEP_FREEZE`) | The blade freezes what it touches; bosses fill a freeze meter. | |
| Awakened Hammerfall clap | 968 | Awakened Hammerfall (`brawler-spells.ts:66` `HAMMER_CLAP`) | Two energy lines slide apart and slam together for an extra hit. | |
| Mage's Hand | 936 | Lattice tool form, Quandrix Staff only (`lattice-fields.ts:38`) | Hold to clench the last hand into a fist that drags foes in, then bursts. | |
| Sunburst Ricochet | 753 | Lattice tool form, Lumen Spindle (`lattice-fields.ts:35`) | A shot off a wall ricochets and bursts into 6 shards. | |
| Continuous Assault | 925 | Lattice tool form, Carbine (`lattice-fields.ts:36`) | A charged beam calls 3 tracking sky lasers. | |
| Jump attacks (plunge) | 923 | Every melee weapon, always (`brawler-spells.ts:730` `PLUNGE`) | Attack in the air to plunge and slam; with Shadow Boxing, a charging dive. | |
| Iron Fists combo and roundhouse | 945, 956 | Iron Fists (awakened for the kick) | Cross, jab, uppercut on a beat; a perfect-timing ball; charged steps. | |
| Cyclone Heel | 981 | Awakened Iron Fists with Ki Blast (`brawler-spells.ts:179`) | A spinning leg kick after the airborne blast. | |
| Shadow Boxing charge, Shadow Clone + Carbine | 952, 963 (?) | Older spells, reworked | Visible charge to the foe; the clone fires its own charged beam. | |
| Triceratops mount moves: Horn Dash, Bash, Horn Shot, Stomp, Silly Goose Drill | 987, 1002 | Riding a Triceratops (`beast-mounts.ts:50` `TRICERATOPS_CONTROLS`) | Slots B-D and Jump become mount attacks while riding. | |
| Hatchling forms (baby buffs, young form's attacks) | 1017 | Triceratops hatchling quest at the Beast Hotel (`hatchling.ts:19`) | Companion: rotating buffs, heals and chill; then a fighting young form, then a rideable adult. Already quest-tied. | already (b/d) |

## 4. Echoes and glyphs

| Name | Release | How the player gets it today | What it does | Proposed route (a/b/c/d) |
|---|---|---|---|---|
| Stegosaur's Grip | 929 | Echo, certain on the first Wild Stegosaurus kill, world beast or room beast (`echoes.ts:120`; `echoDrop` `echoes.ts:220`; room beasts `echoes.ts:60`, 997) | Cling to walls and wall-jump; two holds per airtime. | |
| Spinosaur's Echo | 929 | Echo, first Spinosaurus kill (`echoes.ts:128`) | Jump-attack slams echo with an afterimage slam for 50%. | |
| Earth Resolve | 1013 | Echo, first Earth Apatosaurus kill (`echoes.ts:126`) | Attacking while still grows a root sigil: inside it, 25% less damage taken and 10% lifesteal. | |
| Triceratops Cunning | 1008 | Echo, from a hostile Triceratops only (`echoes.ts:175`) | Marks foes; the third hit within 3 s gores for +60% and a stagger. | |
| Bloblet Mend (on-hit rework) | 1008 (?) | Minion Echo, certain on first kill once the Morphing Blob is slain (`echoes.ts:219` `MINION_ECHOES`) | Each hit mends 1% of max health, up to 3 times a second. The name is older; the on-hit form and the drop rule are Stage 4. | |
| Tentacle Ember (on-hit rework) | 1008 (?) | Minion Echo, once the Tremor Worm is slain (`echoes.ts:219`) | Embers stack on hit; the third bursts (harder on burning foes). | |
| Tesseract glyphs (Edge, Ward, Gale, Star, Sovereign; Hollow, Reliquary, Regent's, Sealed tiers; Melee, Magic, Vitality and Motion classes) | 729; tiers 762; classes 767; per-Pentagon 756 | Labyrinth vaults, Pentagon keepers, reliquaries, sealed chambers, the Regent's hoard, Pentagon completion (`tesseracts.ts:31`); the dais reroll (753) | One-of-a-kind glyphs with rolled bonuses and costs; three slots. | |
| Gathered Breath | 956 | Rare glyph drop; 12 dust to inscribe (`glyphs.ts:32`) | Each copy makes charged attacks fill 30% sooner. | |

## 5. Tools, weapons and gear

| Name | Release | How the player gets it today | What it does | Proposed route (a/b/c/d) |
|---|---|---|---|---|
| Quandrix Staff | 936 | Level-16 milestone, plus a share of weapon drops (`items.ts:40`) | Focus primary: slow spectral hands that strike foes again and again. | |
| Fourfold Daggers | 918 (stats), 938 | Level-12 milestone, plus a share of loot (`items.ts:35`) | Finesse primary: paired cuts crossing in an X. | |
| Carbine | 925 | A Spark Coil upgraded to +6 (`items.ts:18` `CARBINE_RANK`) | Charged beam carbine (Finesse). | |
| Aether Orrery | 753; first orb 756 | Given once at Infinite III (`game.ts:1002` `grantOrreryGear`; `tool-forms.ts:515`) | Magic tool: orbs, sparks, a great piercing orb; Echo glyphs add circling orbs. | |
| Lantern | 880 | A utility castable for slot A-D in the Arcanum (`spell-slots.ts`) | Lit, it pushes back dungeon dread and gloom and lengthens the torch. | |
| Empowered rounds and the round belt | 902 | Crossing chests and great-tree crowns (`tool-forms.ts:745` `ROUNDS`) | Firing tools spend empowered rounds (x1.5) first, then the belt. | |
| Stego Bait | 929 | Cut off a Wild Stegosaurus's tail (`stego-bait.ts:17`) | Draws other monsters away for 30 s. | |
| Beast mounts | 748 | Close a pen on a hurt world beast or the Stalker (`beast-mounts.ts:19`) | Ride it: faster, longer jumps, your attacks from its back; a stable of three. | |
| Triceratops (herds, Good and Silly mounts) | 987-989; standard mount withdrawn 1017 | Wild herds (`monster-pack.ts:26` `TRICERATOPS_HERDS`), capture and the Beast Hotel | Rideable dinosaur with its own moves (section 3). | |
| Travel seeds (Fossilized, Opal, Pumice, Crimson; Abyssal 1009) | 879, 883, 1009 | Open ground, crossing chests, Skyland clears, world caches, Upwell seed hunts (`skylands.ts:349` `SEEDS`) | Crown-to-crown travel, a buoy line, entry to seed realms and the Askew. | |
| Refinement to +20 | 1004 | Unlocked on first entering a town 1,000+ sections out (`items.ts:86` `REFINEMENT`) | Gear past its limit, paid in Divine Viscera. | |
| Tesseract reroll at the Pentagon dais | 753 | One free per Pentagon, one more for 10 Divine Viscera | Rerolls a Tesseract line. | |

## 6. Creatures and world beasts (grouped)

| Group | Release | Where met today | Notes |
|---|---|---|---|
| Pentagon guards, lords, keepers, the Regent, sealed-chamber wardens | 727-732 | Pentagons (`pentagon.ts:27`) | Named bosses built from existing kinds; they drop the Tesseracts and the Fivefold Seal. |
| Pentagon roof dwellers: Eave Gargoyle, Ridge Demon, Slate Rook, Battlement Colossus | ~752 (commit at r748-752) | Pentagon roofs (`roof-dwellers.ts:26`) | |
| Haunts: Gloomwisp, Gloomgorge | 730-731, curses 742 | Old keeps, castles, great buildings, the Pentagon, fog moors, the Far Sleep (`haunts.ts:17`) | |
| The Gloomvast | 754 | The Pentagon finale (`haunts.ts:128`, `pentagon-arena.ts:23`) | |
| Key Warden | 789 | Compound and castle mazes (`great-buildings.ts:760` `TOWER_SEAL`) | Guards the sealed tower's key. |
| Adventure creatures, set 1 (Gallery Lurker, Censer Warden, Vinehook Leaper, Thornspitter Bloom, Sinkmaw, Cinder Kite) and set 2 (Lamplighter, Knellkeeper, Spindrift Medusa, Prism Stilt, Rime Sentinel, Lake Glider, Hookhanger, Slagwright) | 894, 899; spawned from 897 | Adventure Pentagons (`adventure-creatures.ts:21`) | |
| Seed-realm creatures (Hollow Miner, Vein Wraith, Deck Sentry, Hull Warden, Riveter; bosses The Last Foreman, The Helm Sovereign) | 883 | The Hollow Husk and the Drifting Ship (`seed-realms.ts:29`) | |
| The Gaunt (Duelist, Cutthroat, Longarm) | 924 | Resonant crossings, Old Keep floors, Pentagon chambers (`duelists.ts:18`) | |
| Wild Stegosaurus, Spinosaurus | 929 | World beasts; big rooms of keeps, arcologies and Pentagons (`wild-stego.ts:13`, `spino-rex.ts:18`); Deep lairs 998 | Dino duel 974. |
| Triceratops (wild herds, hostile kind) | 987 | Overworld herds (`monster-pack.ts:26`) | |
| Earth Apatosaurus and its tree clones | 1013 | World beast and big rooms (`earth-apato.ts:26`) | Root venom status. |
| Bizarro forms (12 rounded kinds) and the Askew's Rift Colossus | 1009 | Bizarro pockets and the Askew (`strange.ts:41`) | The Rift Colossus kind is older (2026-09); its role as the Askew's heart is Stage 4. |
| Deep lairs (Mire Heart, Psychic Crystal, Tremor Worm, Void Walker, Stegosaurus, Spinosaurus; then Turtle, Stag, Moth, Astral Worm) | 998, 1011 | The Deep (`the-deep.ts:105` `DEEP_SPECIALS`) | Older beasts in new places; no Echo. |
| Squad tactics, alert-and-call, building respawns | 975, 992, 891 | Everywhere | Behaviour only, no new creatures. |

## 7. Places, regions, dungeons and quests (grouped)

| Group | Release | Where and how found today | Notes |
|---|---|---|---|
| The Pentagon (v1-v11): gates, rings, trials, the Heart, sealed chambers, shortcuts, roof, grand halls, sigils and hunts | 727-797, 844 | New ground; Pentagon sigils across a ~22-section catchment (`pentagon.ts:27`, `pentagon-halls.ts:31`, `:120`) | Relics of the Fivefold Court (lore), the Regent's Key, the Fivefold Seal, shards. |
| The Stillworks (finale arena) | 754, 760 | Through the Regent's vault wall (`pentagon-arena.ts:25`) | A world beast or the Doom Chaser; the Gloomvast. |
| Adventure Pentagons (Tomb, Verdant Ruin, Ash Waste; Lamplit City, Alien Capital, Frost Citadel, Ember Foundry themes) and the Waystones | 897 | Pentagons found from v11 (`adventures.ts:22`, `:88`) | |
| The Shell-Labyrinth | 745 | Inside a slain Mountain Turtle's shell (`labyrinths.ts:46`) | |
| Room mazes, labyrinth fog, sealed towers, vault stairs to the roof | 784, 785, 789, 746 | Labyrinths, compounds, castles (`labyrinths.ts:20`, `great-buildings.ts:760`) | Extensions of Stage 3 buildings. |
| Upwells (tall towers) and the lookout's seed hunts | 937, 1003 | New ground, about 1 in 20 sections (`tall-towers.ts:23`) | |
| Seed realms: the Hollow Husk, the Drifting Ship; the Askew; bizarro pockets | 883, 1009 | A seed offered at a Watcher's shrine (`seed-realms.ts:29`); pockets about 1 in 400 sections (`strange.ts:41`) | |
| Seed hunts in great-tree crowns | 1012 | Seed-hunt entries on the compass (`atlas-view.ts:196`) | |
| Canopy groves; Cloud Hold summit skyways; roof decks | 780, 865, 915 | Great-tree sections; houses (`roof-decks.ts:17`) | Vertical traversal, Stage 4 part. |
| New regions: Terrace Springs (hot springs 776), the Reckoning Fields, Rimeglaciers, the Lunar Wastes, the Marrowworks, the Magma Rivers | 772, 792, 903, 920, 944, 962 | Landscape versions 21-27 on new ground (`landscape.ts:66-73`) | Each has region caches. |
| The Deep's lairs and the charting bonus | 998, 1011 | The Deep (`the-deep.ts:105`) | |
| World caches (fallen wayfarer, empty throne, barred alcove, ledge, climb top) | 907 | New crossings and ground (`world.ts:284`) | Hold supplies, Return Embers, marks, rarely seeds. |
| Waymark guides; arcana regions | 904, 878, 886 | Trail marks to skyways, world bosses, shrines (`waymark-guides.ts:27`); story home regions (`lore.ts:165`) | Groundwork for directing players to quests. |
| Stories: the Beekeeper's Jars, the Toolmaker's Handles, the Tall Child's Slates, the Spore Prints, the Ink-Clerk's Blotters, the Enumerator's Count, the Tinker's Tags, the Second Wayfarer | 735, 771, 779, 781, 1024 | Threads in crossings (`threads.ts`); the Second Wayfarer from footprints (`second-wayfarer.ts:23`) | Candidate carriers for route (d). |
| The Beast Hotel and the hatchling rescue | 985-1017 | Ember Refuge; the rescue site is marked (`hatchling.ts:19`) | |
| The Listener cycle rework, the Rite as a lockdown, the Crossing Sigil as a sure way out | 757, 761, 774, 782 | The Far Array | System changes, not new places. |

## Not Stage 4, despite appearing in Tim's examples

These came up in Tim's list for Stage 4 but were built earlier. They may still be tied to quests in the rework; they are listed so their stage is not confused.

- **Lattice field passives** Sanctum, Wellspring Ground, Charged Air, Spellblade and Drift Field: release 515 (Stage 2). Only Tempo, Shatterpoint and Power Aegis are Stage 4.
- **Tool forms** Arc Wave (533), Cluster Shell (537) and Corridor Golem (535) are Stage 2. Mirage of Blades (649) is Stage 3.
- **The Constellation's primary nodes and their secondary forms** (`constellation.ts` `ALT_PASSIVES`) predate Stage 4, except Quickened Stride and the five extras.
- **Echoes of the Stalker (699), Briar Stag (705), Ashen Moth (706) and the two dragons (709-710)** are Stage 3, as are those beasts.
- **Great trees (631-669), skyways (585-587), Great Keeps (683), ruined arcologies (685), great buildings (711), labyrinths (718), Great Castles (726), the Deep (677) and the far realms and domains past 1000 (714-724)** are Stage 3. Stage 4 extended them (canopy groves, the Shell-Labyrinth, room mazes, Deep lairs, adventure Pentagons, more far stories).
- **Spells** Cinder Dart, Ember Ring, Grave Sun, Gravity Well, Stillpoint, Aegis, Shadow Clone, Shadow Boxing, Orbit Volley and Fire Burst, and the disciplines (Ember Form, Quickening, Veil Guard, Force Channel, Rift Step), predate Stage 4. Only their Stage 4 reworks are listed above.

## Counts

| Group | Rows | Notes |
|---|---|---|
| Passives | 14 | 12 if Encumbered (a status) and Sanctuary leech (?) are left out. Two (Bell Toll, Lamplighter's Light) are already quest-tied. |
| Spells and skills | 4 | Two new spells; two reworks marked (?). |
| Skills, weapon arts and moves | 17 | 5 weapon arts; 3 Lattice tool forms; awakened moves; the Fists' moves; mount and hatchling kits. |
| Echoes and glyphs | 8 | 4 new Echoes, 2 on-hit reworks (?), the Tesseract family, Gathered Breath. |
| Tools, weapons and gear | 12 | |
| Creature groups | 14 | |
| Place, region and quest groups | 16 | |
