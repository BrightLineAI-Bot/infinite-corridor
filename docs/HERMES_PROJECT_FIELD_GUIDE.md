# Infinite Corridor Field Guide

## Current release policy

**Superseded 2026-10-18:** previews and publishing now run on GitHub Actions (`.github/workflows/preview.yml` and `publish.yml`); Tim's PC, Hermes and the Discord cards are retired. The current rule is in `AGENTS.md` (Publishing) and `docs/github-actions-release.md`. The text below is historical.

Operator decision 2026-10-11: Test Bot makes all code changes through approved cards, npm test checks, staging, and an operator-approved merge into local main. The `infinitecorridor` Hermes profile only investigates and publishes merged main through `scripts/proposal-workflow.mjs` (create, validate, publish-preview, promote), using the repository-owned [owner review and promotion flow](proposal-publication-workflow.md). Each publication requires a separate Discord approval card. Change-Control is disabled workspace-wide; `.change-control/` and the old Verdict Gate are historical, not current authority. Approval for preparation does not approve preview publication or production promotion. This documentation does not change the external profile adapter.

## Developer Proving Ground

Release 91 provides fourteen implemented production laboratories: Shelter/Building, Ordinary Dungeon, Legacy/Deep Dungeon, Threefold Dungeon, Monster/Elite Combat, Wayglass/Checkpoint/Compass, Bespoke Environment/Domain, Hunts/Creatures, Inventory/Equipment/Vendors, Aperture/Magic Progression, Performance, Recovery/Save/Death, Narrative Scenes, and Atlas/Journal/Records. Scenario state is encoded through `lab`, `scenario`, `seed`, `variant`, `size`, and `reveal` URL parameters.

Use `?dev=proving-ground` for local targeted validation without contaminating a journey. The separately installable mobile laboratory is `/proving-ground/`; it uses the same production systems with in-memory scratch state, a distinct manifest, the `ic-proving-ground-` cache namespace, a path-scoped worker, a non-production banner, and a non-sensitive diagnostics/reset panel. It never imports or clears production journeys. The initial Shelter Gallery exposes timber, masonry, ruined gatehouse, cyber relay, alien geometric, and biomechanical fixtures selected from stable seed/section coordinates.

All fourteen laboratories above are addressable and construct isolated production-backed fixtures. Geometry/combat laboratories are directly playable. State-oriented laboratories expose real generated maps, saves, items, registries, migrations, and diagnostics in scratch state; they are diagnostic harnesses, not alternate player menus and they never import or overwrite a journey.

## Equipment, Aperture, and melee progression

**CODE:** Save schema 14 adds normalized equipment `basePower`/`upgradeRank`, `magicSkills`, and the derived `apertureBand`. Migration preserves legacy item power and all existing journey state. Sela is the existing refuge Artificer: her forge spends Weapon Spheres on primary/secondary weapons and Armor Spheres on armor/charms. Costs rise by rank, caps follow item tier, and salvage never refunds spheres.

**CODE:** Aperture bands are Dormant (0), Stirring (6), Open (18), and Resonant (36). Ember Form, Quickening, Veil Guard, Force Channel, and Aerial Step unlock at fixed thresholds and are learned and activated explicitly. Aerial Step is temporary lethal-terrain traversal, not general flight; it does not cross blocked walls or locked gates and safely restores the last valid ground position if it expires over water, canyon, or pit terrain.

**CODE:** Melee enemies may receive deterministic, class-compatible long-reach, lunge, zigzag, hop, or slam patterns. Normal enemies carry at most one and bosses at most two. Telegraph range and actual damage range use the same circular geometry; committed displacement uses ordinary collision checks. Aperture changes only the exceptional encounter namespace/composition at band boundaries and never refreshes or resets existing ordinary regions or dungeons.

**BOUNDARY:** Ember Form's increased size is visual and offensive; the player's collision footprint remains unchanged to prevent wall trapping. Hop patterns do not cross solid walls. The systems are finite authored progressions and do not introduce swimming, diving, unrestricted flight, procedural skill generation, or a global enemy-stat treadmill.

The Wayglass network uses three deliberately separate concepts. A Wayglass is a cyan fast-travel and respawn anchor registered in `save.checkpoints`. A Singing Array is a lower violet/green rest point that may become the active respawn checkpoint but never enters the fast-travel list. A Broken Observatory is a discovery landmark and neither a rest point nor a fast-travel anchor. Ordinary generation retains sparse randomness but also promotes one deterministic landmark candidate per five-by-five macrocell, bounding long Wayglass droughts while keeping the network uncommon.

## The tier system: Aperture bands, Listener stages and what each one opens (reference, current at release 331)

Tim asked on 2026-10-23 for one place that says how the tier system works and what is tied to it. Update this section whenever a gate changes; the release sections below keep the history.

### Bands
- **What the band is.** The Wayfarer's Aperture (`save.perception.aperture`) decides their band (`apertureTier`, world.ts; names and thresholds in `APERTURE_BANDS`, items.ts).
- **How it grows.** Aperture only ever grows:
  - +1 for each new section;
  - +1 for each creature, +4 for each guardian;
  - +2 for shrines, ruin markers and shelter creatures;
  - +2 or +3 for deep stories;
  - +3 for each perception object.
- **Thresholds.** Past Resonant, each band needs round(previous × 1.45 + 20).

| Tier | Band | Aperture | | Tier | Band | Aperture |
|---|---|---|---|---|---|---|
| 0 | Dormant | 0 | | 8 | Boundless | 470 |
| 1 | Stirring | 6 | | 9 | Unbound | 702 |
| 2 | Open | 18 | | 10 | Sovereign | 1038 |
| 3 | Resonant | 36 | | 11 | Infinite | 1525 |
| 4 | Lucid | 72 | | 12 | Infinite II | 2231 |
| 5 | Unveiled | 124 | | 13 | Infinite III | 3255 |
| 6 | Abyssal | 200 | | 14 | Infinite IV | 4740 |
| 7 | Starward | 310 | | 15 | Infinite V | 6893 |

### Listener stages (stages.ts `STAGES`)
- **Stage 1** is tiers 0–12. Aperture stops one point short of Infinite III (3254) until the first Listener falls.
- **Later stages.** The first Listener kill opens Stage 2 (up to tier 24). Each 2 further kills open another stage of 12 tiers (stage 3 at 3 kills, stage 4 at 5). Kills are counted in `save.farArray.listeners`.
- **World-beast strength:**
  - **Below Infinite III:** world beasts (and the Questing Beast, the Mire Heart and the roaming Gate Revenant) match the Wayfarer.
  - **From Infinite III:** their strength holds at the measure taken there, until the Wayfarer has beaten 3 Listeners.
  - **From the third Listener on (331):** each Listener kill catches them up to the Wayfarer's strength at that moment, and they hold there until the next kill (`beastCatchUp`). The time between Listeners is the Wayfarer's to outgrow them.
- **The Far Gate.** The Far Gate itself scales by Gate number, not tier:
  - Gate g needs g+2 pieces.
  - The Listener summons from Gate 2, with more phases at Gates 3 and 4.
  - Guardians get +30% health and +12% damage for each Gate past the first.

### The dungeon ladder (dungeon-ladder.ts `DUNGEON_LADDER`, 319–325)
- **Unlock tiers:**

| Kind | Unlocks at |
|---|---|
| Large dungeons, Watcher's daises, the newer environments, 10 of 16 guardians, the roaming Gate Revenant | Tier 3 (Resonant) |
| All 16 guardians (and so their Echoes), Poison Crypts, world-threat arenas, the Threefold Deep | Tier 6 (Abyssal) |
| The deep archetypes, the Revenant horde | Tier 9 (Unbound) |

- **How often an unlocked kind appears.** At its unlock tier it appears at half its old rate. That climbs to 80% by Infinite II, and from Infinite III everything is at today's full rate.
- **Tiers 0–1, the base game.** Ordinary crossings, short plain dungeons, the six original environments and 5 guardians. A quarter of would-be large crossings stay large and plain ("quiet"); there are no tastes.
- **Tastes, from Open (tier 2).** A locked kind still appears 25% as often. A Poison Crypt taste is compact, and a horde taste is 12–18 Revenants.
- **Deeps and arenas.** Nothing is ever sealed (323). Every deep and arena opens whole (325). One entered below its tier is a taste: its creatures have min(1, 0.55 + 0.05 × tier) of their health and damage.
- **Fixed for good.** Each dungeon keeps the tier it was first found or entered at (`history.ladder`). Dungeons pinned before 319 keep the old rules.
- **Aperture annex.** The "Unseen Crossing" door in a resolved dungeon needs Aperture 18 (Open).

### Monsters and world beasts
- **World beasts.** Each can first be met at (`BEAST_APERTURE`):

| Tier | World beasts |
|---|---|
| 3 (Resonant) | Mountain Turtle, Void Walker, Psychic Crystal |
| 4 | Morphing Blob |
| 5 | Lightning Giant |
| 6 | Astral Worm |
| 7 | Nanobot Knight, Tremor Worm |
| 8 (Boundless) | Questing Beast |

- **Aperture encounters** (`apertureEncounterSpawns`, world.ts) are overworld creatures with extra traits, worth 6 marks:

| Tier | Chance per section | Creatures and traits |
|---|---|---|
| 0 | none | — |
| 1 | 12% | Ashen hounds, coil stalkers and glass mites, with keen or swift |
| 2 | 20% | Brutes, wardens, stalkers and sentinels, with vital, feral or farcasting |
| 3 | 30% | Brutes, marshals, wardens and sentinels, with vital, plated, orbital or swift |
| Above 3 | +1.2% per tier, up to 42% | Threat 1 + 0.4 × min(3, t) + 0.15 × (t − 3) |

- **Foundry domains.** Cleared domains manifest again once Aperture reaches 24 (Sentinel Manufactory) or 30 (Rootbound Crown).

### The Wayfarer: stats, skills, constellation
- **Aperture Resonance.** Every band past Resonant adds +6 max health, +2 melee and +2 magic (`APERTURE_RESONANCE`, game.ts). At Infinite IV that is +66 health, +22 melee and +22 magic.
- **Aperture skills** (`APERTURE_SKILLS`, items.ts) are taught by Sela:
  - **Stirring (6):** Ember Form and Quickening, rank 3.
  - **Open (18):** Veil Guard, Force Channel and Rift Step, rank 3.
  - **Resonant (36):** Aerial Step (rank 1, the Motion capstone).
  - Spell slots list only learned skills.
- **The constellation** (constellation.ts) gives 1 point per 6 Aperture. A rank needs its skill's Aperture threshold. Mods and capstones need the skill learned or mastered, and capstones cost 2 points.

### Items, gear, glyphs, Echoes
- **No band gates here.** Item tiers (common, rare, epic, relic), upgrade caps (3/4/5/6) and glyph sockets (1/2/2/3) come from item level. Shops scale by character level.
- **Echoes** have no gate of their own: guardian Echoes follow the guardian ladder above, and world-beast Echoes follow the world-beast table.
- **Glyphs.** Aperture skills infuse glyphs. The glyph "echo" makes Aperture skills last 20% longer.

### Vehicles (vehicle-gates.ts `VEHICLE_GATES`, 315–321)

| Unlock | Needs |
|---|---|
| Dive rig and buoy diving | Infinite II |
| Forging the submersible | Infinite II + the Void Walker or a Listener beaten |
| Taking the submersible under, riding the deep current | Infinite III + both the Void Walker and a Listener beaten |
| The robot ashore | Infinite III + 2 Listeners |
| The drone instead of the robot | 4 Listeners |

### Perception objects and the rite
- **Perception objects** appear by Aperture:
  - Veiled Inscription at 6 (gives +3);
  - the Unseen Crossing at 18;
  - Deep Lattice Relic at 36 (gives +3).
- **The Aperture rite** needs Aperture 12, the Relay resolved and one Viewport hunt done.
- **On reaching a new band,** the band is saved and a journal entry is written. The world's colour tint caps at Resonant.

## Void Walker, permanent scars and Blob regeneration (release 251)

**CODE:** `src/world-beasts.ts`, `src/monster-pack.ts`, `src/monster-render.ts` and `src/game.ts` add the player-scale Void Walker hunter with ten bounded attack modules, dungeon patrol, combat rifts and nearest-reachable-door retreat. Retreat walks/jumps normal terrain to a physical `exit` or `deepTransition` doorway, disappearing only after arrival; no-route states wait/retry and persist across unloaded scenes. Search work is capped at 625 expansions per frame, and sanctuary handling cannot relocate/freeze a harmless retiring Walker. See [owner requirements/source](void-walker-design.md) and [implementation/review evidence](void-walker-implementation.md).

**CODE:** Supernova permanently overlays intersected in-bounds nonmarine terrain cells, including progression walls, in the current loaded dungeon or overworld section; the later ocean exception is described below. Additive schema-14 `voidScars` records retain exact circle center/radius/projection and safe floor heights. Physical destruction does not complete quests or change discovery. `src/renderer.ts` draws cached smooth white/red circular material; active Nova is visible through fog while hidden terrain/entities and undiscovered aftermath remain concealed. `src/landscape.ts` and `src/landscape-render.ts` agree on safe scar-edge movement and danger cues.

**CODE:** `BLOB.growHeal` in `src/monster-pack.ts` links only current-HP recovery to newly elapsed natural growth, restoring at most 50% of fixed maximum HP over 120 active seconds. Maximum HP, stepped geometry and existing 3% bloblet-merge healing are unchanged. Saved age prevents catch-up healing; full-health excess is discarded. Details and exact owner correction: [Blob growth health](blob-growth-health.md).

**CODE:** Owner source S8 extends Walker/Crystal encounters to `ocean` and `deepOcean`. Shared marine classification drives legal footprints, actor-specific attack callbacks, a derived small Walker skiff and Crystal water debris with the original volley timing/damage. Water is excluded from both terrain mutation/replay and cached permanent-circle artwork; mixed coastal land retains the existing rule. Other monsters keep their original ground callbacks and the player's boat ownership/hull are not repurposed. An existing pause-position repair now respects an aboard player at a valid sailable position, matching load-time resume. Hostile pull/push sweeps an occupied skiff using its full sailable footprint and iceberg collision rather than stranding it partly ashore; on-foot forces and deliberate player-directed landings retain their existing rules. The conservative sea-retreat interpretation retains physical-door completion: legal sailing/shore traversal, exact cross-section entry and wounded vitals, no arbitrary edge escape or fallback teleport, and safe wait/retry when no route exists.

**BOUNDARY:** No new generator version or save schema is introduced; base generation remains pinned. Scars clip to the loaded section, not adjacent unloaded maps. Tile-based collision consumes intersected boundary cells; only the white/red material has an exact continuous contour. It uses the saved cast-center projection plane across uneven physical heights. Permanent history is not evicted, but storage and current-section geometry can grow. Cached raster layers stay within the pixel budget and very large viewports may downsample. Combat/model art and numerical balance are implementation proposals; native tests/previews do not certify human combat fairness or mobile performance. Unloaded retreat pauses rather than simulating another floor. A proposed bounded Rift Upheaval Echo was added separately from the dictated attacks. Publishing still requires the independent live-range review and the owner's authorization under `AGENTS.md`.

## Crystal pause and mirror-wall review fixes (release 249 continuation)

**CODE:** `Game.setPaused` shifts `player.heldUntil` with the other combat deadlines, preserving the remaining grip across a pause. `reflectShotStep` sweeps each projectile substep against the oriented mirror-wall rectangle, selects its earliest contact, reflects the shot and spends only the remaining substep distance in the reflected direction. `updateProjectiles` runs this before actor collision; `Game.update` supplies active pack effects instead of doing a single pre-frame point check.

**BOUNDARY:** The grab still fails during a dodge, each deliberate dodge shortens the hold, and a hold that runs out normally still crushes. Reflection remains player-shot only, once per shot, at 80% damage, without pierce; reflected grenades become straight shots. Ordinary projectile paths are unchanged when no mirror wall is present. No save schema, generator, release-script or workflow change.

## The Crystal roams its dungeon domain (release 249 continuation)

Tim, 2026-10-20: in a dungeon the Psychic Crystal should roam, so the Wayfarer can find it and fight it, rather than float in one location. It floats over terrain and obstacles and can phase through dungeon walls. The same roaming requirement applies to the future Void Walker.

**CODE:** `src/monster-pack.ts` opts the dungeon Psychic Crystal into deterministic, direct patrol routes. Each new route samples at most 625 cells across the entire dungeon, prefers open-floor destinations with recent-destination avoidance, and can cross disconnected rooms; an interior fallback lets a saved Crystal leave solid terrain without teleporting. `CRYSTAL` holds the tuning. `Game.packWorld` bounds its patrol and combat movement to the map but ignores walls, locked doors and lethal floor. Phasing does not change terrain, open player doors or confer combat invulnerability. `activeDungeonEnemies` keeps the hunter awake off-screen within the existing actor cap. It engages within seven tiles with line of sight, then uses its combat movement, approaching through walls if sight is lost; it cannot begin a new attack until it can see the player. Already committed attacks and the separate through-terrain water retreat retain their behavior.

**CODE:** `crystalFlightLift` in `src/monster-render.ts` samples nine nearby terrain heights, using a smooth one-tile approach to higher ground. The body rises before crossing a cliff and descends after clearing it, never lagging below the ground. This applies in both overworld and dungeon. `src/renderer.ts` passes only the difference from its existing terrain translation to the Crystal body, keeping the shadow on actual ground; the health bar and grab tether follow their appropriate body/target heights. Beam contact and scorch stay grounded. Reduced motion and safe mode suppress cosmetic Crystal bobbing and spinning, not terrain clearance or attack timing.

**BOUNDARY:** No generator or save-schema change. Health, hunt progress and in-bounds saved positions, including water, walls and disconnected pockets, survive reload exactly; only invalid/out-of-bounds coordinates are clamped. Transient routes replan. There is no entrance-connected spawn restriction or new relocation migration: phasing makes those unnecessary. Pausing freezes simulation. Water remains an eligibility and retreat condition, not a patrol anchor. Single-pool eligibility, ordinary-dungeon, level 8, five-section and guardian-clear rules remain unchanged. Overworld flight retains its existing collision rules; wall phasing is dungeon-specific. The Void Walker's dungeon roaming is a design requirement only, pending its appearance and combat specification.

## The Crystal's sky beams and the Knight's seekers (release 249 continuation)

**CODE:** `src/monster-pack.ts` assigns `psyOrbital` to the Psychic Crystal and removes `knightOrbital` from the Knight. `CRYSTAL` holds the beam and cosmetic-scorch tuning. A deterministic volley contains one to four beams and selects a spiral, square, circle, zigzag or slash path. Each beam warns for 0.7 seconds, then traces its continuous path around a centre that pursues the Wayfarer for four seconds. Contact is checked along each frame's travelled segment. The beams stop doing damage when their owner dies or retreats. Harmless scorch lasts 1.5 seconds, is capped separately and cannot evict combat effects from the shared 48-effect budget. `src/monster-render.ts` aligns the warning, beam contact and fading cool mark with terrain height.

**CODE:** `KNIGHT` now defines three seeker orbs, six at half health or below, a 0.6-second gathering float, two seconds of homing and a five-second launched lifetime. Orbs then keep their last velocity until collision or lifetime expiry. An interrupted gather finishes the float and launches instead of remaining in orbit forever; death or retreat removes still-circling orbs. `resetPackRuntime` corrects the two beasts' saved attack lists while preserving their health, tuning and cooldowns. A comment/newline typo that swallowed recoil and hit-stun decay is also repaired.

**BOUNDARY:** No save-schema or generator changes. The existing single-`dungeonWater` eligibility, ordinary-dungeon restriction, level 8 minimum, five-section minimum, grab/dodge struggle, reflected projectiles, elemental glyph damage and dungeon-clear exemption remain unchanged. This extends the unmerged release 249 PR, so it retains that PR's single release-number bump.

## The Psychic Crystal; a dungeon hunt (release 249)

The fifth of Tim's world beasts. He asked (2026-10-19, 2026-10-20) for:
- a floating crystal whose aura changes: hazy white; red or larger when attacking; blue or purple before a grab;
- a force push and a force pull;
- a command grab that holds you for a few seconds while it winds up a powerful attack;
- debris it levitates and throws;
- a psychic wall that reflects ranged attacks while physical attacks pass through;
- it may appear in the overworld, and in dungeons only where there is some water, retreating into that water.

**CODE:**

- **`src/monster-pack.ts`.**
  - `CRYSTAL` holds the balance.
  - `psyPush`: a hit at its windup end, a `psyRing`, then `w.push` for its active time.
  - `psyPull`: `w.pull`, plus one lash when you arrive.
  - `psyGrab`: a violet `tether` telegraph. At the windup end it calls `w.grab(e)`, which fails if you are dodging or invulnerable. Held, a holding tether shows. The crush lands when the hold ends unless you broke free earlier (`w.held` false before then).
  - `psyDebris`: `debris` effects circle it in state `lift`, then are thrown every `debrisEvery`; they hit once and stop at walls.
  - `psyWall`: a `psyWall` effect between you and it, perpendicular to you, lasting `wallLife` seconds.
  - `reflectShots(shots, effects)`: any non-hostile shot crossing a standing wall reflects about its normal, turns hostile (it then hits the Wayfarer through the existing hostile-shot rule), and keeps `reflectShare` of its damage. Melee is untouched.
  - `MONSTER_PACK.psychicCrystal`: `hover`, `orbit`, boss attack `sweepBeam`.
- **`src/game.ts`.**
  - The pack world gains `grab`, `held` and `release`. The hold is `p.heldUntil`/`p.heldBy`, lasting `grabHold` + 0.1 s.
  - While held, movement input is zeroed and each dodge press shortens the hold by `CRYSTAL.struggle`.
  - `reflectShots` runs each frame before `updateProjectiles`.
  - World beasts are exempt from `tuneDungeonThreat`, both on spawn and on snapshot restore.
  - `shouldSimulateEnemy` keeps an aggro world beast awake in dungeons, so a retreat out of sight finishes.
- **`src/world-beasts.ts`, the dungeon hunt.**
  - A beast with `dungeonChance` (the Crystal, .35) may claim a dungeon on entry. It needs `dungeonWater` tiles, a free hunt and no cooldown. The dungeon must also be an ordinary `dungeon:…:g<n>:<rx>:<ry>:<object>` dungeon at least `minDepth` sections out (never the story dungeon, arenas, hunts or runs), and the Wayfarer must be at least `dungeonMinLevel` (8). The claim is stored as `active = { dungeon, tries }`, which `ensureWorldBeasts` keeps, and lasts until the hunt ends.
  - `worldBeastForDungeon` spawns it on an open tile at least 7 tiles from the entry, preferably within 4 of the water. `loadArea` calls it, with its arrival line shown on the first frame.
  - Tries count on deaths in that dungeon (`worldBeastPlayerFell`'s `dungeonId`).
  - A haunting beast is never one of the dungeon's guardians: `registerDungeonBosses` and `recordDungeonBossDefeat` (`src/dungeon-completion.ts`) skip `worldBeast`, so it neither blocks nor counts toward a combat clear.
  - Out of patience, `beginDungeonRetreat` sends it to the nearest `dungeonWater` (`BEAST_HOMES.water` now includes it), along a `through` path. `worldBeastsLost` ends the hunt if you leave that dungeon while it retreats.
  - `cleanRetreat` accepts `{ dungeon }` homes.
  - Overworld claims, cooldowns and the Atlas are unchanged; dungeon claims carry no Atlas mark.
- **`src/monster-render.ts`.**
  - `BODY.psychicCrystal`: flat faceted faces that slide as it turns, two lesser crystals at its foot, circling shards, a core in the aura's colour, and the three-layer aura.
  - Effects: the `tether` telegraph, `debris` stones, a leaning `psyWall` pane with rising motes, and `psyRing`.
- **`src/echoes.ts`.** "Mind Ward": being hurt throws foes within 3 tiles back.
- **Knight fixes from the 247 review.**
  - `e.scattered` now decays each frame.
  - A stray duplicate line was removed.
  - `glyphsReachSwarm`: echo, ignite, chain or volatile on the weapon's loadout reaches the Knight (Tim: "unless the attack is elemental").

**BOUNDARY:** The save change is additive at schema 14: `worldBeasts.psychicCrystal`, plus dungeon-held `active` rows. No generator changes; dungeons are read, never altered.

## The Nanobot Knight's swarm cape (release 247)

Tim, 2026-10-20: the cape was too clean. It should be "a series of small particles that trail behind him like a cape … like smoke", not a solid cape.

**CODE:**

- **`src/monster-render.ts`, `BODY.nanobotKnight`.** The solid cape polygon and its lining are gone. In their place:
  - 90 motes (`fillRect`, dark, every ninth one red) flow along a trailing field `at(f, g)`, where `f` runs from the shoulders to the tail and `g` runs across the stream.
  - The stream pours off the shoulders and trails out behind and down like a plume. It billows in slow waves, harder while the Knight slides. Each mote loops from the shoulders to the tail, shrinking and fading.
  - Four translucent smoke wisps run along the same field.
  - Tim picked this trailing version over a hanging, sail-shaped one.
  - The cost is about a hundred small rect fills per Knight per frame, with no gradients.

- **Swordplay (Tim, the same day).** He asked for a thrust (dashing "forward or sideways … in the cardinal directions and diagonally", a beam off the tip "but it doesn't always have to"), "a forward swing, a back swing", "a dodging swing where he jumps back … while swinging", and energy off the sword "about as large as the player's weapon melee attacks". In `src/monster-pack.ts`:
  - `knightThrust`: picks one of `EIGHT` directions, hashed: straight at the Wayfarer (snapped) 60%, or 45° to either side. It dashes at `thrustSpeed` and hits with the sword's segment. At `beamChance` it ends in a `swordBeam` reaching `thrustBeam` (2.45, a Cinder Pike) beyond the tip.
  - `knightCombo` (Tim: "a six-cut combo … he should be oppressive … an aggressive sword fighter"): it follows `KNIGHT.comboPlan` (cut, cut, dash, cut, cut, dash, cut, cut). Each cut is re-aimed, shows its arc during the `comboPause` gather, and alternates fore and back (`e.swing`). Each dash skids after the Wayfarer at `slideSpeed` for up to `comboDash` seconds, or until within `comboClose`. The length is chosen per attack (hashed) from `comboLengths` (2/4/6 cuts at 40/35/25%), or `comboLengthsEnraged` (20/35/45%) below half health (Tim: "it can be up to six cuts … increasing levels"). The plan is cut to the first 2, 5 or 8 steps.
  - `knightBackslash`: hops back `backHop` away, cutting early in the hop with an energized arc. `knightMistDodge` uses it instead of mist at `backslashChance` when the Wayfarer is within 4 tiles.
  - `knightCut`: the shared cut. When energized (hashed `arcChance`, always for the backslash), it reaches `arcReach` (1.75, a Verge Cleaver) farther and draws a `swordArc`. The slides use it too.
  - Drawing: the blade is outstretched along the thrust and swept low behind on a back cut. `swordArc` and `swordBeam` are drawn at the sword's height, from the effect's `lift`.

**BOUNDARY:** Drawing and the Knight's own attack kit only. No save or generator change.

## The Nanobot Knight (release 245)

The fourth of Tim's world beasts (2026-10-19). He asked for:
- black with red accents;
- it teleports or dissolves into mist;
- physical hits scatter it, unless the attack is elemental, a spell, or the weapon has the Echo glyph, which hits twice;
- Abyss Watcher sword slides, an arm laser cannon, and swords falling from the sky;
- an orbital tracking laser that scorches the ground;
- homing orbs that circle it, sent one at a time or all at once, homing for 1–2 s and then flying straight;
- a homing missile barrage that explodes on timeout.

**CODE:**

- **The scatter rule.**
  - `nanoScatters(e, { physical, echoGlyph })` in `src/monster-pack.ts` decides it. `Game.scatterCheck` in `src/game.ts` applies it, sets `e.scattered` for the drawing, and gives a throttled hint message.
  - It is wired into the only two plain-physical hit sites, so both scatter unless the weapon's loadout has the `echo` glyph:
    - melee swings (`primaryAttack`, glyph host `melee`);
    - physical shots (the projectile `damageFor`, `shot.damageType === "physical"`, including the crescent).
  - A scattered blow does no damage, no hit flash and no stagger. `updateProjectiles` only flashes and staggers when damage is above 0.
  - These still hurt it, by design:
    - magic shots;
    - spells and rift blasts (`updateEffects`);
    - glyph procs, echoes and constellation effects (`glyphWorld.damage`);
    - burns (`tickGlyphStatus`).
- **`src/monster-pack.ts`.** `KNIGHT` holds the balance. The attacks:
  - `knightSlide`: three skid-and-cut cycles. `e.sliding` is set while it skids.
  - `knightCannon`: tracks the player at `cannonTrack` while charging, then fires a fixed beam.
  - `knightSwordfall`: `swords` marks, one on the player and the rest in a ring. They are generic detonating effects that stay standing as fallen swords.
  - `knightOrbital`: an `orbital` effect that, once armed, follows the player at `orbitalSpeed`, bites each `orbitalTick` and drops `scorch` patches.
  - `knightOrbs`: `nanoOrb` effects circle the Knight in state `circle`. They are sent all at once or every `orbEvery`, chosen by hash per attack, home for a hashed 1–2 s, then fly straight. Any still circling are sent when the attack ends.
  - `knightMissiles`: `missile` effects home at `missileTurn` and burst (`nanoBurst`) on contact, at a wall, or when their fuel runs out.
  - `knightMist`: it is untargetable in mist (`e.mist`), reforms beside the player, and cuts.
  - Its dodge is `knightMistDodge` (Tim, 2026-10-20: "periodically … he'll dodge your attack … turn to mist … doesn't matter if it's a magic attack or a physical attack … it can be random").
    - A threat is a player shot heading at it, a spell or blast effect reaching it (`packWorld.playerBlasts`), or a swing in reach.
    - Each threat triggers one hashed roll, at most every `mistEvery`. At `mistChance` % it dissolves for `dodgeMist`, ending any attack in progress, and reforms `dodgeLeap` aside.
    - Otherwise it stands and takes the hit.
  - `resetPackRuntime` now clears every pose flag (`iceShield`, `spinning`, `tucked`, `sliding`, `mist`). `fleeStep` clears `tucked`, and the Knight flees as mist.
- **`src/monster-render.ts`.** `BODY.nanobotKnight` is flat-shaded and painted directly.
  - The figure: angular greaves, a breastplate with a red seam, pauldrons, a tall helm with a glowing visor slit and a spike, a tattered cape with red lining, and a long black greatsword with a red edge (low at rest, trailing in a slide, raised with an arc in a cut).
  - The cannon arm opens along the beam angle with a charging glow.
  - Motes drift off it; in mist it is only a swarm; when scattered it is jittered and translucent with a burst of motes.
  - Tim's touches: the cape streams back from the shoulders like a sail. Its ragged hem rolls in slow waves (harder while it slides), with folds and a red lining where it turns. A faint dark-red miasma drifts up around it in six translucent puffs, all flat fills.
  - Effects: falling and fallen swords, the orbital lance column and its scorch, seeker orbs, missiles with exhaust, and missile bursts.
- **`src/world-beasts.ts`.** A `nanobotKnight` row: home `glass`, `retreatMoves: "through"`.
- **`src/echoes.ts`.** "Nanite Seekers": kills strike up to two foes within 5 tiles.

**BOUNDARY:** No save or generator change. Effects stay under the pack cap: an in-game run peaked at 26.

## The Mountain Turtle's Icicle Cyclone (release 243)

Tim, 2026-10-20: the spin should come in two variants. The first makes tornadoes that wander for a while. In the second, the Turtle spins and bounces around the stage inside its tornado, launching icicles in all directions.

**CODE:**

- **`src/monster-pack.ts`.**
  - The `turtleCyclone` attack module is now in the Turtle's kit, alongside `turtleSpin`.
  - During its active phase it sets `e.spinning` and moves at `TURTLE.cycloneSpeed`. When `w.move` refuses a step, it rebounds: it flips x, else y, else both, and leaves a dust puff.
  - It strikes on contact at most every `cycloneHitEvery`.
  - Every `icicleEvery` seconds it fires `iciclesPerVolley` `orb` effects marked `icicle`, evenly spaced and turning by `icicleTurn` per volley. They travel straight, stop at walls and hit once (the existing orb rules).
- **`src/monster-render.ts`.** An icicle is drawn as a lit shard pointing along its flight, with a frost streak behind it. The tornado and tucked shell are the existing spinning drawing.
- **`tests/world-beasts.test.ts`.** The test covers rebounds, at least 8 icicle headings, a bound on live icicles and contact hits.

**BOUNDARY:** No save or generator change. Live icicles stay at about 20 (3 every 0.2 s, 1.3 s life), under the pack effect cap.

## The Mountain Turtle; retreat fixes (release 241)

The third of Tim's world beasts (2026-10-19: "a walking mausoleum … about twice the size of the Questing Beast … slow … stomps … a burst dash leaving a trail of fire or ice; the ice damages, then bursts after a couple of seconds … a spinning attack with an ice tornado that spawns small tornadoes which persist, damage and slow … a comet ice-ball from its mouth … a periodic invulnerable ice shield").

**CODE:**

- **`src/monster-pack.ts`.**
  - `TURTLE` holds the balance.
  - Attacks:
    - `turtleStomp`: a jumpable hit at its feet, plus a `shock` ring marked `stone`.
    - `turtleDash`: it moves at `dashSpeed` and stops at what it cannot pass. Each dash is fire or ice, by hash. It leaves `flameTrail` (burns per `fireTick`) or `frostTrail` (stings, slows, then bursts with an `iceBurst` once its hashed `iceBurst` time ends).
    - `turtleSpin`: sets `e.spinning`, damages and slows in the vortex with a slight pull, and flings `twister` effects. Twisters are capped at `twisterMax` per turtle, wander, sting and slow for `twisterLife` seconds, and blow out when it is gone.
    - `turtleComet`: a `comet` effect flies to the aimed spot or to whoever it meets, bursts, and leaves a non-bursting `frostTrail` of radius `cometFrost`.
    - `turtleShield`: `e.iceShield` plus `untargetable` while it is active. Every damage path already skips untargetable foes, so nothing lands.
  - `MONSTER_PACK.mountainTurtle`: scale 2.9 (about 3.9 with the boss form), `lurch` (slow), `juggernaut` brain, `shockwave` boss attack.
  - Its dodge: in `evade`, the Turtle does not spring aside. It tucks (`e.tucked`, untargetable, no movement, `tuckTime`).
  - `endAttack` clears `iceShield` and `spinning`.
- **`src/monster-render.ts`.**
  - `BODY.mountainTurtle` is painted directly (Tim, 2026-10-20: "more angular … ziggurat shaped … weathered … impassive, eyelids half closed … I don't want a lot of shading costing frames").
    - It uses flat fills only, with no gradients. The one glow is the comet's mouth light.
    - The shell is a ziggurat of four set-back terraces, each face cut into lit, mid and shadowed facets with a lit ledge. It has block joints, chipped corners, a crack per course, lichen, a tomb door with sill and lintel, and a snow-capped crag for a summit. Ice crystals on the ledges are drawn last, over the terraces above.
    - Four faceted pillar legs stand under the shell's plinth, with folds and nails.
    - The neck is a long, arched run of plates whose thickness follows the curve. The head is a wedge skull with a hooked beak and a narrow, half-lidded eye.
  - Spinning and tucked, it draws legs and head in. Spinning adds the ice tornado; the shield is a faceted dome.
  - Effects: `flameTrail`, `frostTrail` (crystals; it flickers white before bursting), `twister`, `comet` (with its shadow) and `iceBurst`, plus the stone stomp ring. Trails are drawn at ground height.
- **`src/world-beasts.ts`.**
  - A `mountainTurtle` row: chance .025, minDepth 6, home `canyon`, `retreatMoves: "through"`.
  - Retreat fixes from the 239 review:
    - `fleeSpawn` serves a retreating beast in settlement and Questing Beast sections too. `game.ts` keeps the fleeing spawn alongside the Questing Beast.
    - Its arrival message says it is fleeing.
    - The home probe is lazy: a section is generated only for homes that need it (canyon, glass, dungeon), and the biome check is cheap.
    - A claim on a section with no open tile is released (`q.active = null`), unless tries were already spent there.
- **`src/echoes.ts`.** `mountainTurtle` "Turtle's Ward": being hurt makes you untouchable for 1 s, once every 8 s.

**BOUNDARY:** No save change; `ensureWorldBeasts` adds the row on load. No generator changes. Effects stay under the pack cap: a dash lays about 7 trails, and twisters are capped at 6.

**Tim's decisions for beasts still to come (2026-10-20):**
- The Void Walker can appear in the overworld and in dungeons.
- The Psychic Crystal can appear in the overworld, retreating to open water. It also appears in dungeons, but only dungeons with some water (any amount, even a puddle); there it retreats into that water.

## World beasts retreat home (release 239)

Tim, 2026-10-20: a beast should not hold its section forever. If neither side wins in time, it retreats to a home of its own in the landscape, and you can follow it over several sections. Once it retreats, it is invulnerable and moves "on its own special geometry and laws".

**CODE:**

- **`src/world-beasts.ts`.**
  - Each `WORLD_BEASTS` row gains `patience` (seconds), `home`, `flee` and `homeLine`.
  - `BEAST_HOMES` defines each home: a section test over a probe `{ biome, dominant, canyon, dungeon }`, and the tile or object the beast goes into.
    - `mire`: blight or swamp; toxic or swamp water.
    - `dunes`: desert sand.
    - `water`: sea, coast, lake or isles; ocean or lake water. (For the Psychic Crystal.)
    - `canyon`: canyon tiles. (For the Mountain Turtle.)
    - `glass`: glass tiles. (For the Nanobot Knight.)
    - `dungeon`: a dungeon entrance. (For the Void Walker.)
  - `RETREAT` holds the tuning: search 8, fallback 6, speed 2.1 tiles/s (a little under walking pace), entry inset and fade time.
  - `worldBeastPatience` counts fighting time in the save (`active.patience`).
  - `beginRetreat` picks the nearest home section, by steps across sections, in deterministic order. With none in reach it picks a point `fallback` sections away. It stores `active.retreat = { home, side, legs }`.
  - `retreatSide` and `retreatTarget` give the gate it leaves by, or its home ground in the home section.
  - `retreatCrossed` moves `active.rx/ry` into the next section with the opposite entry side, so the Atlas danger mark follows it.
  - `worldBeastsLost` runs on every area load. A retreating beast whose section is not the one being loaded (including any dungeon load, or a death) is gone.
  - `retreatEnded` ends the hunt as an escape.
  - `worldBeastFor` spawns a retreating beast at its entry gate, with a per-leg id, so the restored snapshot never merges into it.
  - `worldBeastPlayerFell` takes no tries while it retreats.
- **`src/game.ts`.**
  - `tickWorldBeasts` runs each overworld frame. It counts patience, starts the retreat (message, journal, its minions dissolve) and aims the beast with `fleeTo`.
  - When the beast is done, it either ends the hunt at home or crosses it into the next section, and removes the beast from the area without a kill.
  - `loadArea` calls `worldBeastsLost`.
- **Pathing (Tim, the same day: it "should still respect the geometry of the world").**
  - `RETREAT_GROUND` and `retreatPassable` sort tiles into water, chasm (canyon, abyss, lava) and walls (other blocked tiles).
  - Each beast's `retreatMoves` sets how it crosses them:
    - `walk` goes round walls, crosses water only by a bridge, and leaps chasms.
    - `burrow` passes under walls but not water.
    - `through` crosses everything. It is meant for the Mountain Turtle.
  - `retreatPath` is an 8-way BFS on the 32×32 grid with no corner cutting. It returns turn waypoints, with chasm tiles marked `leap`. It is computed once when the beast is aimed.
  - With no path, the beast goes straight. Its large body is not footprint-tested: only the tile it walks on counts.
- **`src/monster-pack.ts`.**
  - `fleeStep`: with `fleeTo` set, the creature does nothing else. It is untargetable and does not attack or dodge.
  - It follows `fleePath` at `fleeSpeed`, with `hopLift` rising over `leap` waypoints. At home it fades (`fleeFade`).
  - The Worm swims as a mound and drops harmless `furrow` effects. They are churned earth, 1.6 s each, under the effect cap.
- **`src/monster-render.ts`.** Fleeing, the Worm's mound draws three rolling humps behind it. `furrow` is drawn as a sinking ridge of churned earth with clods.
- **`src/monster-render.ts`.** A fading beast is drawn sinking and fading.
- **`tests/world-beasts.test.ts`.** Home choice, the fallback, sides and crossing, lost-when-unfollowed, no tries, save round-trip, movement through walls, the fade, and a real-Game run.

**BOUNDARY:** The save change is additive and stays at schema 14. `active.patience` and `active.retreat` are kept only when set; older saves load unchanged. No generator changes: homes are read from existing sections (`biomeFor`, `generateRegion`), probed once when a retreat begins.

## The Tremor Worm (release 237)

The second of Tim's world beasts (2026-10-19: "burrows … its head pops out … tentacles from its maw … suction … tentacles pop up around the map shooting rapid fireballs and long persistent lasers that accumulate until killed … rises under you … lobbed rocks that explode").

**CODE:**

- **`src/world-beasts.ts`.** A `tremorWorm` row in `WORLD_BEASTS`; the hunt itself is unchanged. With two beasts, a beast claims a section a little more often (each rolls its own chance; one beast per section).
- **`src/monster-pack.ts`.**
  - `WORM` holds the balance. Attacks: `wormMaw`, `wormSuction`, `wormTentacles`, `wormRise` and `wormRocks`; `shockwave` unlocks as its boss attack.
  - `MONSTER_PACK.tremorWorm` and the minion `wormTentacle` are both unique, so they are never in spawn pools.
  - `wormCycle` runs between attacks. The worm stays up for `WORM.surfaceTime`, then is hidden and untargetable while it swims to a spot near the Wayfarer (clamped to the map). Where there is no open ground (a lake), it swims back toward the Wayfarer instead. It emerges (untargetable, a bite on whoever stands there), then fights again.
  - `tentacleTurret` drives the raised tentacles. A tentacle never moves. It rises (telegraphed), then either fires bursts of `orb` effects marked `fire`, or holds a beam that turns at `WORM.laserTurn` toward the Wayfarer and bites each `laserTick`. Its damage is credited to the worm. It dies with the worm.
  - Following (Tim, 2026-10-20: "you can't really escape them"). A tentacle more than `WORM.tentacleFollow` tiles from the Wayfarer for `tentacleFollowDelay` seconds sinks (`tentacleSink`, untargetable). It waits underground for a hashed `tentacleUnder` time (hidden), then rises again at a hashed spot in `tentacleRing` around the Wayfarer. It keeps its health and mode; only its laser aim and burst timer reset. No new tentacle is made.
  - Rocks are `mortar` effects with `rock: true`.
  - `wormLavaSpew` (Tim, 2026-10-20: lava "spilled out … as if water were getting spilled"). During its active phase it pours `lava` effects along a widening cone. Each one runs outward, slowing over `WORM.lavaRunTime`, and swells to its own size. It lies for `WORM.lavaLife` seconds and bites each `lavaTick`.
  - High ground and the Blob (the same day: "Ooze can still land on high ground. And bloblets."). The rule was right, but a level-4 plateau is drawn about 1.4 tiles up, over the low tiles north of it. Ooze landing there looked as if it lay on the plateau.
    - `nearHigh` now keeps ooze spots and bloblet births (`lowOpen`) clear of every tile a plateau covers.
    - Wandering bloblets turn back at its foot. Homing bloblets will not step onto it.
- **`src/monster-render.ts`.**
  - `BODY.tremorWorm` is painted directly, not from the sprite cache. It draws a heaving mound when hidden, and the emergence. Surfaced, it draws a ringed column out of a rubble-rimmed hole, a round maw with three rings of teeth and a fire-lit throat, and lip tentacles that lash along the attack lanes.
  - `BODY.wormTentacle` has a burning mouth for fire and a lens for lasers.
  - Telegraphs: flesh-coloured tendril lanes, a red `laser` beam, and a `circle` that reads `total`/`left`.
  - Effects: fireballs and tumbling rocks.
- **`src/monster-render.ts` / `src/renderer.ts`.** `drawPackEffects` takes a `lift`. The renderer passes the ground lift, so puddles and clouds (ooze, lava, gas, web, flesh) are drawn at the height of the ground they lie on. Lava rims are all drawn before any molten tops, so touching pools read as one spill. The worm's maw wells up and drips while it winds up, and pours an arcing stream while it spews.
- **`src/echoes.ts`.** `tremorWorm` "Worm's Upheaval": dodging bursts the ground under the nearest foe. `wormTentacle` "Tentacle Ember": kills set the nearest foe burning.
- **`tests/world-beasts.test.ts`.** The hunt test now accepts whichever beast claims first. New tests cover the surfacing cycle and every attack: the laser stays on until cut down, tentacles never move and sink with the worm, and the rise from beneath.

Tim, same day: of the beasts still to come, the Void Walker and the Psychic Crystal are small enough to appear in dungeons as well; the rest stay overworld bosses.

**BOUNDARY:** No save change: `ensureWorldBeasts` already adds a row for every `WORLD_BEASTS` id, so a 235 save gains `tremorWorm` on load. No generator changes. Its suction uses the shared pack pull, which, like the Gnawing Maw's, can drag you over lethal ground; dodging breaks it. Tim, asked, kept that: "the worm can pull you into water that kills you, one hundred percent". Active tentacles are capped (`WORM.tentaclesMax` 6, `lasersMax` 3), as are effects (the pack cap of 48).

## World beasts and the Morphing Blob; a smaller Questing Beast (release 235)

Tim, 2026-10-19: the Questing Beast is a little too large. He wants five or six more roaming world bosses at its level of detail, built on its template: strong, hyper-aggressive, huge health, varied attacks, dodging AI, three tries. They are being built one per release. This release is the shared hunt and the first beast, the Morphing Blob.

**CODE:**

- **`src/world-beasts.ts`** (new; it is in `scripts/build.mjs` and both precache lists). The Questing Beast's hunt, generalised.
  - `WORLD_BEASTS` holds one data row per beast: chance, minDepth, tries, cooldowns, hitsToKill, damageShare, speed, rewards and lines.
  - `ensureWorldBeasts` normalises `save.worldBeasts`. `worldBeastFor` places at most one beast per section and never in the Questing Beast's section, with cooldowns counted in sections entered.
  - Also: `tuneWorldBeast` (the same formula as `tuneQuestingBeast`, plus `evasive`), `worldBeastSlain`, `worldBeastPlayerFell` and `worldBeastsHeld`.
  - `src/questing-beast.ts` is unchanged.
- **`src/monster-pack.ts`.**
  - `morphingBlob` and `bloblet` are new `unique` entries, so they are never in pools.
  - The Blob's attacks are `blobTendrils`, `blobGasJet`, `blobGasCloud`, `blobBloblets` and `blobEngulf`, with START and RUN runners.
  - `BLOB` is the balance table.
  - `blobPassive` handles stepped growth, the burning touch, and ooze spatter on taking damage.
  - `blobletHome` makes a bloblet wander, return and merge, healing the Blob and swelling it (`BLOB.mergeGrow`, up to `mergeMax`).
  - High ground stays above the Blob (Tim): on elevation of `BLOB.safeElev` (4) or more, no ooze lands, and its ooze, touch and surge do no harm (`aboveBlob`, via the world's optional `elevation`). Tendrils and gas still reach.
  - The new effects are `ooze`, which persists until its owner dies, and `gas`, which drifts and poisons. The world adapter gains optional `push`, `poison` and `effects`.
  - `questingBeast.form.scale` drops from 1.75 to 1.5.
- **`src/monster-render.ts`.**
  - `morphingBlob` and `bloblet` bodies: the Blob has a wobbling translucent mass, nuclei, embedded slit-pupil eyes, bubbles, drips, and tendrils along their lanes.
  - `tendrils` and `cone` telegraphs, and `ooze` (an arcing ball, then a glossy puddle) and `gas` effects.
  - The Blob is painted directly, outside the sprite cache, because its tendrils reach past the sprite box.
- **`game.ts`.**
  - Overworld load calls `worldBeastFor` and announces the beast. Spawning tunes it, and it is exempt from the global damage scale.
  - Its death pays the bounty, and the Wayfarer's death counts a try.
  - `packWorld` gains `push`, `poison`, `effects` and `elevation`.
- **`src/echoes.ts`.** Every pack creature has one Echo. Blob's Spatter: being hurt leaves a slowing patch. Bloblet Mend: kills heal 3.
- **`world.ts`.** Held sections are Atlas danger marks.
- **`types.ts`.** `ensureWorldBeasts` runs in `freshSave` and `migrateSave`.
- **Tests.** `tests/world-beasts.test.ts` is new.

**BOUNDARY:**

- **Save.** `save.worldBeasts` is additive at schema 14; unknown beasts are kept. Bloblets and ooze are not saved; restored sections respawn the beast.
- **Generation.** No generation change; claims are seeded per cycle and section, like the Questing Beast's.
- **Proving Ground.** The Blob can be fought there as `pack-boss-morphingBlob`.

## The Tyrant's hunt fixed (release 233)

Found by the release-231 review (a blocker, so 231 was never published): `tyrantRisePoint` filtered out `blocked` tiles, but every generated ocean tile is `blocked` to walking (`landscape.ts`), so the Tyrant never rose in play. The tests had hand-built unblocked ocean.

**CODE:**

- `tyrantRisePoint` checks the tile's kind only, as `seaSpawns` does.
- `tickTyrantHunt` no longer counts; `riseTyrant` calls the new `countTyrantRise` only after a rise point is found, so a failed rise spends no chance.
- `loadArea("overworld")` clears `this.tyrantVisit`, so returning from a dungeon or a death starts a fresh visit.
- **Tests.** Blocked ocean tiles throughout, plus a test over real generated sea sections. It fails on the 231 code.

**BOUNDARY:** As in 231.

## The Tyrant Mosasaur hunts (release 231)

Tim, 2026-10-19: in any ocean tile the Tyrant Mosasaur can always come and get you, even if you have killed it, like the Questing Beast: a chance twice per tile, more likely the longer you stay, and never a certainty.

**CODE:**

- **`src/tyrant-hunt.ts`** (new; it is in `scripts/build.mjs` and both precache lists).
  - `TYRANT_HUNT` is the data table: ocean and deep-ocean water, every 40 s, chance .3, perVisit 2, and a rise range of 6–9 tiles.
  - `tyrantVisit` holds a section visit's water clock and count.
  - `tickTyrantHunt` runs the clock only on ocean water. It rolls once per interval and never fires while a Tyrant is in the section or after `perVisit`.
  - `tyrantRisePoint` picks an ocean tile in range inside the section, or returns null.
- **`game.ts`.** The overworld update keeps `this.tyrantVisit` per section and calls `tickTyrantHunt(…, Math.random)`. `riseTyrant` spawns an ordinary `tyrantMosasaur` sea combatant marked `hunting`, starting hidden in its lurk phase, with a message.
- **Tests.** `tests/tyrant-hunt.test.ts` is new.

**BOUNDARY:**

- **Save.** No save change: the hunter is never saved. A section's restore merges saved enemies onto what it spawns, so leaving or reloading ends the hunt. A visit's count lives only in memory, and reloading starts a fresh visit.
- **Rewards.** Kills use the ordinary sea-creature path: experience every time, and the leviathan trophy once (`worldFlags["leviathan:tyrantMosasaur"]`).
- **Static spawns.** Leviathan spawns are unchanged; a section's own Tyrant counts as present, so two never hunt at once.

## The Tyrant Mosasaur and the Undertow Leviathan (release 229)

Tim, 2026-10-19: keep the big segmented leviathan that was the Tyrant Mosasaur as its own creature, with its own name. The Tyrant Mosasaur should look like a mosasaur (pointed snout, big jaws, a fat body, flippers), be bigger and have more health.

**CODE:**

- **`src/sea-creatures.ts`.**
  - `tyrantMosasaur` gains `body: "mosasaur"`, hp 480 (was 320), damage 24, xp 120, size 3 (was 2.2), lockAt 4.8, exposed 1.8, and `hitReach` 1.6 so its bite matches its size.
  - `undertowLeviathan` is new, with the old mosasaur's stats, five segments and colours.
  - The lunge hit test uses `d.hitReach || 1.1`.
  - `SEA_SPAWNS.leviathans` gives one of the Mosasaur's two places to the Leviathan; the table keeps its nine entries, so every section rolls the same place as before.
- **`src/renderer.ts`.** `drawMosasaur`, a semi-segmented top-down mosasaur. Tim asked for a tail that moves up and down like a whale's.
  - `mosasaurSpine` lays 15 joints along the path the head has swum. The path is kept per creature in a `WeakMap`, never saved, and the body runs straight back past its end, so the body bends through turns.
  - A kick (`MOSASAUR_KICK`, .14 of the body length at the tail tip) raises and lowers each joint more toward the tail; raised parts draw higher and a little wider, and the fluke grows as it rises and fades as it dips.
  - Over the spine:
    - one outline from behind the head to the tail, with a dark back and pale flanks, and bands across the back;
    - a downturned shark-like fluke;
    - four rowing paddle flippers;
    - a skull, toothed jaws that gape with the lunge's telegraph and strike, and yellow eyes.
  - `drawSeaCreature` is now exported, for the creature preview tests.

  `drawSeaCreature` hands the Mosasaur to it; the Undertow Leviathan keeps the segmented body.
- **`src/main.ts`.** Codex entries for both.
- **Tests.** One test is added to `tests/leviathans.test.ts`.

**BOUNDARY:**

- **Save.** No save change. A Mosasaur already met keeps its saved hit points until its section's state is refreshed.
- **Spawning.** Spawning stays deterministic; no generator version changes.

## Strange stones fixed (release 227)

Found by the release-225 review: since release 215 a strange stone never offered Touch. `validActions` (`src/interactions.ts`) returned the sealed-rock actions (move, break, and from 225 chip) before an object's own actions were consulted, so only strange trees opened Glimpses.

**CODE:** `validActions` now returns `['touch']` first for any untouched strange rock or tree. After touching, the rock falls through to the ordinary rock rules. `touchStrange` says "It is only a stone now." for a spent stone. One test is added to `tests/strange.test.ts`.

**BOUNDARY:** No save or generation change. The same rare objects are strange as before; strange stones simply work now.

## The shovel (release 225)

Tim, 2026-10-19:
- a shovel to dig certain places in the overworld, and to dig 2 or 3 blocks into the walls of dungeons;
- it should break after 6 blocks;
- walls should hold treasure, not always marked;
- it should be crafted on the go from wood and stone;
- it should add depth "without breaking anything".

**CODE:**

- **`src/digging.ts`** (new; it is in `scripts/build.mjs` and both precache lists). It holds the rules and nothing else.
  - **Data.** `DIG` holds reach 3, shovelUses 6, the recipe (2 wood, 2 stone), stone yields, a treasure chance of .1, a glint share of .4, the dig-spot chance and a per-area cap. `DIG_FINDS` is the weighted find table.
  - **The shovel.** `ensureShovel` crafts one from the recipe when you have none.
  - **Planning a dig.** `planDig` is the rule that keeps digging safe:
    - only blocked rock inside the map's edge, never a door, sealed gate, structure, lethal tile or a tile with an object on it;
    - at most `DIG.reach` blocks from untouched floor (`tunnelDepth`);
    - breaking through only into floor already `reachable` on foot (sealed gates and blocking objects stop the flood fill), so no sealed or guarded part opens early;
    - never in temporary areas (`canDigArea`: hunts, portals, displacement, arenas, the Far Array, dives).
  - **Digging.** `dig` opens a tile as `kind:"tunnel"` floor, records it, wears the shovel, yields stone and credits any treasure. `applyTunnels` re-applies an area's tunnels after generation, so generation itself never changes.
  - **Treasure.** `wallTreasure` is seeded by area and tile, so a dug block can never yield twice. `wallGlints` lists the treasure blocks that show a glint on an exposed face.
  - **Disturbed earth.** `spotHere`, `addDigSpot` and `digSpot` handle the overworld's rare patches, each dug once.
- **`game.ts`.**
  - `loadArea` applies tunnels and computes `map.wallGlints` for dungeons, keyed by `areaStateId()`, so each level of a deep dungeon keeps its own.
  - The overworld load line adds the dig spot.
  - `digAhead` runs on Act with no object while you face a wall, before the skiff check. It returns null when you are not facing diggable rock.
  - `interact` handles `dig` on a dig spot.
- **`interactions.ts`.** Rocks offer `chip` (one stone, once, at any Might), and breaking a rock gives 2 stone.
- **`types.ts`.** `ensureDigging` runs in `freshSave` and `migrateSave`.
- **`renderer.ts`.** A `tunnel` floor colour; `drawWallGlint` (only where the dungeon is discovered); `drawDigSpot`.
- **`main.ts`.** "Chip stone" and "Dig" labels, and the resource line shows Stone and the shovel's digs left.
- **Tests.** `tests/digging.test.ts` is new.

**BOUNDARY:**

- **Save.** Additive at schema 14: `save.digging` (`shovel`, `dug` per area key capped at 60 entries, `spots`) and `save.materials.stone`. Malformed entries are dropped.
- **Generation.** Untouched; tunnels are an overlay. Dungeon generators and existing journeys are unchanged.
- **Behaviour.** Enemies may walk through tunnels too. A tunnel can end in a dead end if the shovel snaps.

## The hands, reworked; square creature portraits (release 223)

Tim, 2026-10-19, after release 221: the hands still looked like a mannequin or a robot. He wanted high-quality, lifelike hands that fit the painterly style and move with the fluid, travelling motion the snake has. He also reported that a creature's portrait in the Journal stretched when its variants were opened.

**CODE:**

- **`src/glimpse-hand.ts` rewritten. The `paintHand` interface is unchanged, with new options.**
  - Each part is one closed outline built from its bones (`outline` and `blob`). Fingers swell slightly at the joints and end in a rounded pad. The palm is a soft trapezoid whose knuckle line arches and drops toward the little finger. The thumb comes from a mound by the wrist, with a web to the index.
  - Parts are filled flat. The hand's light and shadow are laid over the whole silhouette at once (`band`: the silhouette minus itself shifted, softened at reduced scale), so parts never meet at a seam.
  - Each finger keeps a soft lit flank and brushwork that follows its bones. Parts in front cast a soft shadow, and a folded finger shows a lit knuckle dome.
  - One rim of light runs around the whole silhouette, and the forearm fades out instead of ending in a cut.
  - Motion: a curl travels from the index to the little finger (`HAND.fingers[].delay`), and `time` adds a slight living sway (`HAND.sway`).
  - New options: `shadow`, `lift`, `foreshorten` (the hand seen from above), `rim.width` and `time`.
  - Hands always draw with normal blending.
- **Call sites.** All pass `time`. The wagon's fists are foreshortened, dark, with a thin warm rim. The Plant hand is tinted by the water and lit from the plant's side.
- **`styles.css`.** `.creature-portrait` is a fixed 78×78 square (`top`/`left`/`height`) instead of being stretched between the card's top and bottom.
- **People in the Glimpses.** Tim: human arms and legs should be convincing or not shown, and "RuneScape-level fidelity" is not enough for these scenes.
  - The Burning Plain's ash hands and Under the Ice's hand on the ice are painted with `paintHand`. Ash fingers wear away one by one through the new `lengths` option, with embers in the cracks.
  - The Fourth Floor's figure is an old woman with real proportions: a shawl over hunched shoulders and her hair in a bun, rim-lit by the lamp.
  - The figures standing in the fire have a small head, sloping shoulders and arms at their sides.
  - The Plant no longer draws your feet: ropes run from below the frame to the stones. The tipping view now clears first, so the last frame never shows below it.
  - Hands under `HAND.tiny` (40 px) skip the whole-silhouette lighting, which they are too small to show.
- **Atlas pins** (`main.ts` `drawAtlasPins`, `ATLAS_PIN`).
  - The manual waypoint (cyan) and the compass target (gold) are drawn last, at a fixed size, in both the close and world views, whatever the zoom or layer toggles.
  - Off the visible map, each becomes an arrow at the edge, pointing to it, with its distance in sections from the view's centre.
  - The world view's old waypoint and target dots are replaced by these pins; the close view keeps its section frames.

**BOUNDARY:**

- **Scope.** No save, rule or timing change.
- **Cost.** In headless software Chromium at 844×390: the Wagon at Dusk costs about 40 ms a frame (26 in release 219), the Drowning about 12 ms (6) and the Plant about 20 ms (19).

## Painted hands (release 221)

Tim, 2026-10-19: "everything else is beautiful … the hands are no good … the way you made the snake … make the fingers something like that … either more drawn or less drawn."

**CODE:**

- **`src/glimpse-hand.ts`** (new; it is in `scripts/build.mjs` and both precache lists).
  - `HAND` is the proportion table: the four fingers, the phalanges, joint bends for a curl and for a `claw`, the wrist, the thumb, and `sheetScale`.
  - `paintHand(ctx, options)` builds a hand the way the snake is built:
    - Each bone is a tapering body (`paintBody`): a soft dark margin, an opaque base, an inner form shadow, a lit flank, an optional rim, then hatching along the form.
    - Fingers curl in depth. Parts folded behind the hand are painted before it, so a fist reads as knuckles and a palm-on grip as fingers closing.
    - `hook` instead curls three-quarter fingers across the picture, which is how a grasp reads.
  - The forearm or sleeve is painted straight onto the scene. The hand itself is painted on a reused offscreen sheet at 0.6 scale and drawn back up smoothly; that is its softening, with no blur filter.
- **Call sites.**
  - `glimpse-render.ts` `drawHand`: the wagon's gloved fists.
  - `glimpse-horror.ts`: the rail hand and the axe fists in The Fourth Floor, and the drowned hands (palm-on, `claw`, `hook`, long and thin).
  - `glimpse-legend.ts` `drawReach`: the hand reaching for the plant, with blood as dabs.
- **Tests.** One test is added to `tests/glimpses.test.ts`.

**BOUNDARY:**

- **Scope.** No save, rule or timing change; only how hands are drawn. The Wheat creature's claws are a monster silhouette and are unchanged.
- **Cost.** In headless software Chromium at 844×390, the Wagon at Dusk costs about 34 ms a frame (26 before) and the Drowning about 11 ms (6). The Fourth Floor and the Plant are unchanged.

## The Plant at the Bottom: the first legend Glimpse (release 219)

Tim, 2026-10-19: "the legend of Gilgamesh, this is what I meant", and Glimpse figures should be painterly (impressionist, pointillist, hatched) rather than hard-edged. The daily narrative session built step 5 of the narrative bible's build order as a Glimpse first. The Gilgamesh *voice* (recited lines) waits for a public-domain source text. Project Gutenberg is blocked by this environment's network policy, and lines are never quoted from memory.

**CODE:**

- **`src/glimpse-legend.ts`** (new; it is in `scripts/build.mjs` and both precache lists).
  - `brushwork` paints a backdrop once from thousands of short tilted dabs over a flat wash. `dabs` paints moving things in the same hand.
  - The night sea, the deep and the dawn pool are cached per canvas size in the Glimpse state.
  - `LEGEND.thePlant` runs in five beats: the rock (bare feet, roped stones, the moon's road), the dive, the plant and the hand closing on its thorns, the pool at dawn, and the snake taking the plant and leaving its skin. It ends in grief, as colour drains and the view blurs (the blur is skipped on low quality).
- **`glimpses.ts`.** `thePlant` (human .85, 16 s, reduced stills at .08, .38 and .76). `glimpse-render.ts` adds `...LEGEND` to its draw table.
- **Tests.** One test is added to `tests/glimpses.test.ts`.

**BOUNDARY:**

- **Save and rules.** No save change: Glimpse counts already live in `save.lore.glimpses`. It surfaces like any other Glimpse (strange things, rare touches and crossings) and gives a Glimpse fragment on first sight.
- **Performance and text.** About 11 ms a frame at 844×390 in headless Chromium; the backdrops are painted once. Nothing in it quotes a translation.

## Linked dungeons: the guardian's door opens elsewhere (release 217)

Tim, 2026-10-19: in some dungeons, going through the guardian's door after the second level should bring you out at a different, unexplored place on the map, at another entrance to the same dungeon. The Atlas should mark the connected entrances with an indicator that is not purple.

**CODE:**

- **`src/linked-dungeons.ts`** (new; it is in `scripts/build.mjs` and both precache lists).
  - `LINKED` is a data table: `share` .3 of linkable dungeons, `distance` 7–14 sections.
  - `isLinkable`: only ordinary world dungeons (`dungeon:` ids). `isLinked` is a seeded hash per dungeon id.
  - `linkedExit(save, id, entered)`: creates `save.linkedDungeons[id] = { a, b }` on first use. `a` is where you went in; `b` (`farMouth`) is a seeded direction and distance away, stepping outward past explored sections and never onto the Refuge. Returns the other mouth.
  - `mouthsIn` and `placeMouth`: the second mouth is an ordinary `kind:"dungeon"` object carrying `dungeonId` and `linked:true`, named "The Other Mouth", on open ground nearest the section centre. Placing is idempotent.
  - `linksKnown` lists links whose two mouths are both explored. `ensureLinks` normalises the save.
- **`game.ts`.**
  - The `completionExit` branch ("Cleared Expedition Return", the guardian's door) asks `linkedExit` only when `this.map.multiLevel`. A link replaces `session.dungeonReturn`. The player lands beside the second mouth, or back at the first mouth when leaving from the second.
  - Overworld load places the second mouths with `placeMouth`. Entering one uses its `dungeonId`, so it is the same pinned dungeon.
- **`types.ts`.** `ensureLinks` runs in `freshSave` and `migrateSave`.
- **`main.ts`.**
  - `drawLinkedDungeons` joins the two mouths with a dashed green (`#7dff9e`) line and double rings, in both the close and world views, under the Places layer.
  - The legend has "Linked crossing".
- **Tests.** `tests/linked-dungeons.test.ts` is new.

**BOUNDARY:**

- **Save.** `save.linkedDungeons` is additive at schema 14. Malformed entries are dropped on load.
- **Generation.** Dungeon generation is untouched, and so are existing journeys' sections. A second mouth is only added on load, to a section that was unexplored when the link was made.
- **Scope.** Single-level dungeons, hunts, portals, dives and displacement crossings never link. The ordinary exit by the entrance still leads back to the mouth you came in by.
- **Terrain.** If the far section has no open ground, no mouth is placed and you land by the usual stranding rules. The link stays.

## Strange things carry the story beats (release 215)

Tim, 2026-10-19, after finding his first remembrance fragment: he does not want to chop every tree or move every rock. Story beats should be rare, noticeably weird versions of ordinary interactable things, unmarked.

**CODE:**

- **`src/strange.ts`** (new; it is in `scripts/build.mjs` and both precache lists).
  - `STRANGE` is a data table (`chance` .035 of sections, `minDepth` 1).
  - `strangeHere` uses a seeded hash per section.
  - `addStrange` (called on overworld section load in `game.ts`) turns one of the section's own standing trees or unmoved rocks into a strange one: it keeps its kind, shape and solidity, and gets the action `touch`.
  - `touchStrange` records `worldFlags["strange:rx,ry"]`, makes the object ordinary again and returns a line.
- **`game.ts`.** `interact` handles `touch` on a strange object and sets `glimpseCue = "strange"`. The tree-felling cue is gone.
- **`glimpses.ts`.** `GLIMPSE_CHANCE` is `{ strange: 1, touch: .15, crossing: .2 }`.
- **`renderer.ts`.** `drawStrange` draws the object with an occasional flicker, a pale additive double drifting half a step, a pulsing violet-blue halo and nine rising motes. `main.ts` labels the action "Touch".
- **Tests.** `tests/strange.test.ts` is new. `tests/glimpses.test.ts` replaces the old chance ordering (tree < crossing < touch) with the new table, since Tim asked for exactly this change.

**BOUNDARY:**

- **Save.** Only one `worldFlags` key per touched section (additive). Generation is untouched: an existing tree or rock is chosen at load.
- **Atlas.** Strange things are not shown.

## A cleaner Atlas: towns as places, Wayglass travel by tap (release 213)

Tim, 2026-10-19:
- The Waypoints toggle seemed to show nothing but his last death.
- Supply caches and shelters should come off the Atlas; dungeons should be marked instead.
- Places should mean towns, dungeons and interesting sites.
- Wayglasses keep a toggle of their own.
- Tapping a Wayglass on the map should ready it for travel without scrolling.

**CODE (`main.ts`):**

- **Layers.** `ATLAS_LAYERS` is now Wayglasses, Places, Signals, Objectives, "Waypoint & death" and Regions; the 209 Crossings layer is folded into Places.
  - `siteLayerOn` routes `checkpoint` to Wayglasses and drops `UNMARKED_SITES` (`supplyCache`, `shack`) entirely.
  - Every other kind, crossings included, goes to Places.
- **Towns.** Ember Refuge and hamlets (`hamletSection`/`hamletIdentity` on sections with `hamletVersion`) are drawn in the close view as a gold house glyph (`town`, reusing the shelter house).
  - In the world view: towns are gold dots, districts tan dots, crossings orange triangles.
  - The legend swaps Supply Cache and Shelter for Town.
- **Go to….** `atlasPlaces` lists towns, districts and Wayglasses; shelters are gone.
- **Travel by tap.** Tapping a section that holds a Wayglass (already chosen in `#mapWayglassSelect` by `showMapDetail`) now scrolls `#mapTravel` into view and pulses it (`.ready`).

**BOUNDARY:**

- **Presentation only.** Shelters and caches still exist in the world and in a section's detail text; they are simply not marked.
- **Saved layer settings** keep working: unknown keys are ignored and new ones default to on.

## Water opens section borders (release 211)

Tim, 2026-10-19 (with a screenshot of section -2,5): grey "hard pieces of earth" stood where shallow water met a section's edge, and his skiff could not pass; "those need to be removed".

**CODE:** In `applyLandscape` (`landscape.ts`), the edge rule `(x|y ∈ {0,31}) && (prot || o <= T.ocean) → keep the wall` meant only deep sea opened a border, and only in sea sections (border tiles of other sections were never visited). For landscape version 3:
- border tiles are visited in every section;
- a border opens where sea water is shallows or deeper (`o > SHALLOWS_FROM`, the existing shallows threshold), or where the lake field passes its rim (lake shallows, or `lakeWater` past `W.lake.water`);
- protection comes from `protectedMask(map, { border: false })` outside sea sections, so exits, the plaza and landmarks stay protected;
- deep sea at the edge of a non-sea section stays walled, as before.

Crossing works through the existing paths: `sailAcross` searches the neighbour's matching edge for sailable water, and walkers arrive at the neighbour's exit.

**BOUNDARY:**

- **Pinned versions.** Landscape versions 1 and 2 are unchanged (their byte-identical tests still pass).
- **Explored sections.** Version 3 is current and not hash-pinned, so sections explored since about release 104 regenerate with these walls gone. Tim asked for exactly that; it is an explicit exception to "never regenerate existing journeys", and it only replaces wall with water at borders where water runs on.
- **Tests.** `tests/sea-borders.test.ts` checks that version 3 leaves far fewer walled shallow edges than version 2.

## Relays at world scale, and layers of their own for Wayglasses and crossings (release 209)

Tim, 2026-10-19:
- With Relays on, the relays' fractal should stay visible as he zooms out, and grow as more relays connect.
- He wants to switch everything off except Wayglasses and the crossings (dungeons, glass kilns), without removing anything from the map.

**CODE:**

- **Layers (`main.ts`).** `ATLAS_LAYERS` gains `wayglasses` and `crossings` beside `sites` (now labelled "Other places"). They default to on, including in stored layer settings.
  - `siteLayerOn(kind)` routes `checkpoint` to Wayglasses, `CROSSING_KINDS` (`dungeon`, `arenaEntrance`) to Crossings, and every other kind to Other places. It applies to both the close view and the world view.
- **World view markers.**
  - The world-image cache also lists crossing sections, drawn as outlined orange triangles.
  - Wayglass dots are larger and outlined.
  - Hamlets and the Refuge follow Other places.
- **Relays in the world view.** `atlasRelayImage` (cached with the world image; its key includes `relayOverlay`) marks every live `relayCell` within one section of explored land as one violet pixel: the whole pattern, which Tim preferred to its edges alone. It uses the same reveal rule as the close overlay.
  - When Relays is on, the land is drawn at 28% opacity under it.
  - Answered relays and their links (the two nearest within two sections) are drawn at a fixed size.

**BOUNDARY:**

- **Untouched.** Presentation only: no relay rule, save or generation change.
- **What shows.** The pattern still shows only next to explored land.

## Atlas and Glimpse polish (release 207)

These follow the non-blocking observations of the 199→205 pre-publish review.

**CODE:**

- **Scrolling tools.** In the short-landscape Atlas, `#atlas[open]` uses `overflow-y:auto` instead of `overflow:hidden`, which had clipped the tool column. `#mapCanvas` is `position:sticky; top:0`, so the map stays while the tools scroll.
- **World-image cache.** It now stores `atlasPlaces(save)` and keys on `save.seed`. The markers no longer recompute the places on every pinch frame, and another journey never reuses the image.
- **Under the Ice.** `glimpse-scenes.ts` replaces `ctx.roundRect` with an arc-drawn `pill`, so the scene runs on browsers without `roundRect`.

**BOUNDARY:** Presentation only; no save or rule changes.

## The Atlas at world scale (release 205)

Tim, 2026-10-19: the map must zoom out "way, way farther", into a region view or world view. He wants to zoom to a region, or to a place inside one such as a town or shelter, and to navigate with his fingers.

**CODE:**

- **`src/atlas-view.ts`** (new; it is in `scripts/build.mjs` and both precache lists).
  - `ATLAS_ZOOM` is a data table: `base` 52 px per section at zoom 1, `min` .02, `max` 3.2, `detail` .45 (the world-view threshold), `step` 1.35 and `placeZoom` 1.6.
  - Helpers: `clampZoom`, `sectionPixels`, `worldView`, `exploredSections`, `boundsOf`, `frame(bounds, w, h)` (centre and zoom that fit), and `panStep` (a third of the view).
  - `atlasPlaces(save)` groups explored sections by Reading. Readings not yet heard become "Elsewhere" and are never named. Each group lists Ember Refuge, hamlets (`hamletSection`/`hamletIdentity` on sections with `hamletVersion`), Wayglasses, districts and shelters from the atlas records.
- **`main.ts`**
  - **World view.** Below `detail`, `drawMap` calls `drawAtlasWorld`. A cached image holds one pixel per explored section in its terrain or landscape colour, tinted 38% by `READING_TINT` for heard Readings when the Regions layer is on. It is rebuilt only when the explored count or the heard Readings change, and drawn scaled with smoothing off.
  - **Markers** keep a fixed size: Wayglasses and towns once sections are at least 3 px, signals, the waypoint, the compass target, the last death, the selection and you.
  - **Region names** are drawn at the centroid of their explored sections, larger regions first; a name that would collide steps down or is left out. In the detailed view the Reading of the centre section is named at the top left.
  - **Controls.** Zoom is multiplicative (buttons, pinch, wheel); a double-tap within 350 ms zooms in on that section. "World" fits everything explored; `#mapPlaces` ("Go to…") jumps as described. There is a new **Regions** layer toggle.
  - **Sideways layout.** On short landscape screens `drawMap` sizes the map to the dialog, and `styles.css` lays `#atlas` out in two columns: the map on the left, the tools scrolling on the right.
  - **Fix.** `.wayglass-picker[hidden]` is now hidden; `display:grid` had shown an empty level picker on the overworld.

**BOUNDARY:**

- **Untouched.** No save or generation change; `mapView.zoom` is per session.
- **Performance.** The detailed view is unchanged. The world view costs one `drawImage` plus a handful of markers, whatever the size of the explored world.
- **Dungeon maps** are unchanged.

## Glimpses of horror and violence (release 203)

Tim, 2026-10-19: "Some of the scenes need to be scenes of horror … some of them should be violent."

**CODE:**

- **`src/glimpse-horror.ts`** (new; it is in `scripts/build.mjs` and both precache lists) exports `HORROR`, which `glimpse-render.ts` merges into its draw table. It has three helpers:
  - `jolt` for impact shake;
  - `redVeil` for red from the edges;
  - `spatter` for seeded dark-red flecks with wet highlights.
- **The scenes:**
  - `fourthFloor`: the stairwell climb, a crossfade into the room, the figure turning away, the lifted axe, and the strike at t=.66 (white flash, jolt, the figure falling, a spreading pool, a swinging lamp, keys still swaying).
  - `theHunt`: heat-palette forest and a running deer. You leap at t=.62 and strike at t=.7: furred heat-orange forelegs with dark hooked claws, spatter, red veil, slowing breath.
  - `theTrench`: flares, distant flashes, the man ahead turning, and a shell at t=.64 (an earth column and clods). He is gone, the view tips 0.9 rad, and the screen whites out briefly, then shows grey ringing.
  - `theDrowning`: the surface disc shrinking as you sink, bubbles, and 14 pale arms rising in turn whose fingers curl to grip.
  - `theWheat`: a 360° wheat field (900 stalks rotated by yaw), something parting the wheat to your left that stops when you stop, the turn at t=.55–.72, and a gaunt red-eyed figure rising behind you that lunges at t=.86, then red and black.
  - `burningPlain`: a red sky, pulsing cracks, figures wrapped in flame, ash hands flaking from the fingertips, and embers.
- **`glimpses.ts`** gives each scene its `human` value (trench and fourth floor are high; the burning plain and the hunt are lower).

**BOUNDARY:**

- **Tone.** The violence stays at the level of silhouette, flash and red, with no anatomy.
- **Untouched.** No rule or save changes: the scenes join the same pools, and replays and previews are unchanged.

## The Glimpse suite, first batch (release 201)

Tim, 2026-10-19, after seeing the first three: "let's do the full suite of glimpses". This release adds six from `docs/narrative-bible.md` section 5.

**CODE:**

- **`src/glimpse-paint.ts`** (new) holds the shared painting helpers, moved out of `glimpse-render.ts` so scenes can live in several files.
- **`src/glimpse-scenes.ts`** (new) exports `SCENES`, which `glimpse-render.ts` merges into its draw table. `hasGlimpseRenderer(id)` lets the tests check every catalogued Glimpse can be drawn. The scenes:
  - `theSky`: soft cloud sprites (140 shaded puffs each), tapered grass blades, the Atlas grid surfacing, a shake at t≈.53 and closing eyelids.
  - `rainAtWindow`: bokeh lights, still beads and running drops, a mullioned frame, soft hair with lit strands, and a lightning flash at t≈.58.
  - `underTheIce`: a crossing caustic net, cracks, boot soles stepping above, a hand pressing down, and fins.
  - `theSpheres`: about 34 spheres in perspective. Each frame tests for touching pairs and spawns chime rings; at the end one sphere fills the view.
  - `edgeLight`: the rim of a vast circle, lit through a conic-gradient taper (a plain stroke where unsupported), a second far rim and dust.
  - `glyphRain`: procedurally drawn glyphs, so no fonts are needed (0 and 1, wedge marks, stroke letters). A face map shows through both as glyph brightness and as a scaled-up glow.
- **`glimpses.ts`** gives each scene its `human` value, duration and reduced-motion frames. The new modules are in `scripts/build.mjs` and both precache lists.

**BOUNDARY:**

- **Untouched.** No rule, trigger or save changes: the new Glimpses enter the same weighted pool. With nine Glimpses, `GLIMPSE_MAX_SEEN` still caps each at 3 sightings.
- **Previews.** The Proving Ground viewer lists them automatically.

## Glimpses freeze the game (release 199)

The pre-publish review of 191→197 found a second route to the game running under a Glimpse. Backgrounding the app mid-Glimpse set `overlayPause` false. On return, `visibilitychange` showed the pause menu above the Glimpse, and its Continue button (or a back gesture closing it) called `resume()`.

**CODE:** `frame()` in `main.ts` returns right after `input.update` while `glimpseRun` is set, re-pausing the game with `game.setPaused(true, now)`. So no key, menu or resume path can run `game.update` under a Glimpse. `visibilitychange` no longer opens the pause menu while a Glimpse plays. When the Glimpse ends, its `finish` resumes the game (or runs its `after` callback) as before.

**BOUNDARY:** Pausing only. No gameplay or save changes.

## The Elder Wanderers (release 197)

Tim, 2026-10-19: rare road creatures that speak no language, only Wolfram's patterns. They travel the world and wander dungeons, and mastering them should be very hard. They are called the Elder Wanderers.

**CODE:**

- **`src/elders.ts`** (new; it is in `scripts/build.mjs` and both precache lists).
  - `ELDER_RULES` holds the 88 classes of the 256 elementary rules under mirroring and inversion. `elderClass` gives a rule's smallest equivalent number.
  - `ELDERS` is the balance table: `chance` (trail .08, wild .05, dungeon .035), `minDepth` 2, `unheardShare` .6 and `speed`.
  - `elderPlan(save, key, chance)` hashes the seed, the place and the number of rules heard, so a place re-rolls as you progress. It picks an unheard rule `unheardShare` of the time, otherwise any rule.
  - `hearElder` sets the rule's bit in `save.lore.elders` (a 256-bit hex string). When all 88 are heard it raises `noteCompletionOf("elders")`, which shows "Recitation complete · The Elder Wanderers · Mastered".
  - `ruleRows(rule, width, rows, start)` computes rows, wrapping at the edges, from a single cell or a seeded random row.
- **`travelers.ts`**
  - `addElder` walks the section's longest trail when it has one; otherwise it takes a stitched stroll. `addDungeonElder` wanders near a crossing's entrance.
  - `tickElder` (inside `tickTravelers`) walks back and forth at `ELDERS.speed` and stops to face you when you are near.
- **`game.ts`** spawns Elders on section and level load. The HUD line reads "Something tall and silent walks the road".
- **`interactions.ts`**: speaking (labelled "Listen") returns `pattern: {rule, seed}` and no words.
- **`main.ts` and `glimpse-render.ts`**
  - `performInteraction` draws the pattern with `paintRule`: rows unfold over 1.6 s in the rule's hue, with a glow.
  - The Tome shows "The Elder Wanderers · n of 88 patterns" with a thumbnail of each rule heard.
- **`renderer.ts`**: `drawElder` draws a faceless figure on four jointed stilt legs. Its body is its rule scrolling upward, from a fresh random row every 26 rows. A pale disc with a halo is its head.

**BOUNDARY:**

- **Save.** The change is additive at schema 14: `save.lore.elders` is normalised by `ensureLore`, and malformed values become "".
- **Generation.** No world generator changes. Elders are runtime objects like reciters, not saved.
- **Preview.** Elders appear only in the production game, not in Proving Ground previews.

**Fixes from the 195 pre-publish review (also in release 197):**

- **Replayed Glimpses kept the game running.** A replay from the Tome or from Options → System closed the dialog, and its asynchronous close handler then unpaused the game underneath the Glimpse. That handler and the pause key now stand aside while `glimpseRun` is set.
- **Previews now return to Options.**
- **The Rule's texture** is built once instead of growing about nine times a second.

## Glimpses in the Proving Ground (release 195)

Previews are Proving Ground builds, which do not run `main.ts`, so release 193's Glimpses could not be seen in a preview.

**CODE:**

- `proving-ground/index.html` adds a "Glimpses" button beside Diagnostics, a `#pgGlimpses` dialog and the `#glimpse` overlay.
- `src/proving-ground-mobile.ts` imports `glimpses.ts` and `glimpse-render.ts`, lists `GLIMPSE_ORDER` and plays the chosen Glimpse with `startGlimpse`. A tap after 0.9 s lets go. The OS reduced-motion setting is honoured.
- `styles.css` exempts `#pgGlimpses[open]` from the Proving Ground's rule hiding dialogs.

**BOUNDARY:**

- **Scratch only.** The viewer records nothing, and there is no save in the Proving Ground.
- **Preview graph.** The preview's module graph gains `glimpses`, `glimpse-render`, `lore` and `recitations` (static imports, so `freezeArtifact` copies them). It still has no production entry or persistence module.

## Glimpses: first-person scenes (release 193)

This is step 2 of `docs/narrative-bible.md`: the Glimpse engine and three first Glimpses, built for Tim to judge before more are made.

**CODE:**

- **`src/glimpses.ts`** (rules, no DOM).
  - `GLIMPSES` holds `wagonAtDusk`, `lanternFaceted` and `theRule`. Each entry has `human` (1 human … 0 unhuman), `seconds`, `eyes`, and `reduced` (still-frame times for reduced motion).
  - `humanDrift(rx, ry)` falls from 1 at the Refuge to 0 at `GLIMPSE_DRIFT_DEPTH` (40). `glimpseWeight` uses it, with a floor of `GLIMPSE_FLOOR`.
  - `pickGlimpse` prefers unseen Glimpses, then allows ones seen fewer than `GLIMPSE_MAX_SEEN` (3) times.
  - `glimpseFor(save, kind, rx, ry, rand)` rolls `GLIMPSE_CHANCE` (`touch` .5, `crossing` .25, `tree` .04).
  - `witnessGlimpse` counts a sighting in `save.lore.glimpses`. The first sighting credits the region's next free Glimpse fragment through `creditPiece` (new in `lore.ts`, which also raises "Recitation complete").
- **`src/glimpse-render.ts`** (drawing). `drawGlimpse(ctx, id, t, w, h, state)` paints frame `t` ∈ [0, 1]. `startGlimpse(canvas, id, {reduceMotion, quality, onEnd})` runs one at up to 2× device pixels (1× on low quality), with three crossfading stills under reduced motion. Everything is Canvas 2D, with no assets.
  - **Wagon:** perspective road and birches with cached canopy sprites (leaf, haze and dusk tints), long shadows, sun rays, a backlit horse and gloved hands, a swinging lantern, a blanket that breathes, and fireflies.
  - **Lantern:** each frame of a moth's flight is painted at 240×150 into a three-frame history. A hex lattice of facets, each clipped to a lagged, shifted copy of the frame, sits under a cached lens-shading overlay.
  - **Rule:** Rule 30, then Rule 110 after `ruleSwitch` rows. It is drawn into a 4×4-pixel-per-cell texture, laid row by row onto a ground plane with square cells, with a downscaled bloom pass. The out-of-step amber cell is "you".
- **Triggers.** `Game.interact` sets `glimpseCue` (`touch` for inspecting a ruin marker or shrine, `tree` for cutting a tree, `crossing` for a dungeon transition). `main.ts` reads it each frame and calls `playGlimpse`.
- **Playing.** `playGlimpse` closes open dialogs, pauses, shows `#glimpse`, lets go on a tap after 0.9 s, records the first sighting and notes a found fragment.
- **Replays.** The Tome's "Glimpses" section replays seen ones. Options → System → "Glimpse previews" plays any of them. Replays record nothing.
- **Fixes from the 191 review.** The Tome lists only heard Readings, and a fragment of an unheard Reading is noted as "A fragment is remembered" without its name.

**BOUNDARY:**

- **Save.** `save.lore.glimpses` (`{id: count}`) is additive at schema 14. `ensureLore` keeps positive counts, including ids unknown to this build.
- **Untouched.** No generator, world or combat code changes.
- **Cost.** Glimpses draw only while their overlay is open. The game is paused underneath, and nothing persists in the render loop afterwards.
- **Still to come.** Only three Glimpses exist, so a region's Glimpse fragments cannot all be found yet. Glimpses run as Canvas 2D; WebGL is left for the sphere, crystal and gas scenes.

## The Readings: regional voices and what the Corridor remembers (release 191)

This is step 1 of the narrative design Tim approved on 2026-10-19 (`docs/narrative-bible.md`).

- Each region speaks one public-domain book that is already in the game: the residue of human lives the Corridor still remembers.
- No line is repeated.
- The Reciter's Tome counts each region's fragments, so Tim can see when a region is mastered.

Tim also decided on 2026-10-19:

- Region names never name their book.
- Regions hold different numbers of fragments (about 20 on average).
- Nothing reveals a region, or a book, before you have heard it: you learn you are in a new region when someone there speaks a different book.

**CODE:** `src/lore.ts` is new; it is in `scripts/build.mjs` and both precache lists.

- **Region map.** `readingAt(rx, ry)` maps a section to one of ten Readings:
  - Distance `|rx|+|ry|` ≤ 6: the Smoke Meadows (the first half of War and Peace).
  - Distances 7–18 split into compass quarters (north is `ry < 0`): the Ferry Reaches (N, Siddhartha), the Clear Country (E, Emerson), the Fevered Stairs (S, Crime and Punishment) and the Whetstone Hills (W, Musashi).
  - Distances 19–35 split the same way: the Long Table (N, Karamazov), the Autumn Galleries (E, Rilke), the Low Rooms (S, Underground and Idiot) and the Ash Orchards (W, the second half of War and Peace).
  - Beyond 35: the Far Sleep (the Randolph Carter stories).
- **Region data.** Each entry in `READINGS` gives:
  - its voices, as reciter ids with a share of their lines;
  - its fragment counts per kind (`voice`, `recite`, `glimpse`, `margin`, `last`). `bookSize` is 13–33.
- **Fragments.** `bookPieces` fixes the fragment ids.
  - Only voice and recite fragments can be found yet.
  - Their lines are spread through the Reading's lines, and no two fragments share a line.
  - Recite fragments run from the first reciter's opening line to its last.
- **Travellers.** `travelerTalk(o, save)` → `nextReadingLine` gives an unheard line of the Reading the traveller stands in. `TRAVELER_LINES` stays in `travelerPlan`, so its seeded draws (group, names, mounts) are unchanged, but it is no longer spoken.
- **Reciters.**
  - In random mode, `reciterTalk` picks an unheard line of its own book, leaning toward fragment lines (`RECITER_PIECE_CHANCE`). Linear mode is unchanged.
  - `reciterPlan` takes the section's Reading and picks one of its voices `READING_VOICE_SHARE` (70%) of the time. Without a Reading, the old pick stands.
- **Hearing lines.** Every spoken line goes through `hearLine`:
  - It sets a bit in `save.lore.heard[voice]` (a hex bitset) and credits a fragment.
  - Recite fragments count only when a reciter speaks them, and travellers never speak those lines.
  - A found fragment is noted after the line: "· A fragment of <Reading> is remembered (Reciter's Tome)".
  - The last fragment of a Reading instead adds "· Recitation complete: <Reading>." It also flashes the event banner "RECITATION COMPLETE · <Reading> · Mastered" (Tim, 2026-10-19). `hearLine` returns `completed`, and the transient `takeCompletedReading()` is polled each frame in `main.ts`; it is not saved.
- **Region names in play.**
  - `discoverReading` is called when a traveller, or one of the Reading's own reciters, speaks. On the first line heard in a Reading it adds "· You are in the <Reading>." Walking in reveals nothing, and a visiting reciter from another Reading reveals nothing.
  - The Tome opens with "What the Corridor Remembers": "<Reading> · n of N fragments", plus "Mastered" in gold. It lists only the Readings heard and gives no count of the rest.
  - The Tome's library lists only books heard or whose reciter you have met (`libraryBooks` now carries each book's `voices`).
  - The Atlas section line names the section's Reading only once that Reading is known (`readingKnown`).
- **Written lore.** Objects with `lore` text (summit stones, castle lookouts, grotto ruins, wrecks, the Array Mouth) now show it when touched.

**BOUNDARY:**

- **Save.** The change is additive at schema 14. `save.lore = {v, heard, pieces, entered}` is normalised by `ensureLore` in `freshSave` and `migrateSave`. Unknown voices, Readings and fragment ids are dropped; unknown top-level lore fields are kept.
- **Generation.** No world generation changed: traveller groups, reciter appearance chances and every generator are untouched. The only change to who appears is which reciter `reciterPlan` picks.
- **Not findable yet.** Glimpse, margin and last fragments arrive with the Glimpse engine (step 2) and the threads, so no region can be mastered yet.
- **Unchanged speakers.** Villagers, wardens and Old Quillon keep their own lines.

## Bog pools stop tiring (release 189)

The pre-publish review of release 187 found that release 185's "bog pools no longer drain stamina" was not delivered.

**CODE:** `swimUpkeep` (`water-traversal.ts`) read `TIDEMANTLE.drainMultiplier[kind] || 1`, which turned the `0` set for `swampWater` and `toxicWater` back into 1. So those pools still drained 3 stamina a second as well as rotting. It now reads `?? 1`: swimming a bog pool keeps stamina, while lake, deep ocean (2×) and open sea (17/s) are unchanged.

**BOUNDARY:** Swimming rules only. Rot and the poison at the rot cap are unchanged.

## The Questing Beast fights with energy (release 187)

Tim met the Questing Beast for the first time (2026-10-18). He found it too weak, too slow and too plain. He reversed his earlier "purely physical" decision and asked for energy attacks, a constant barrage, much more health and blows strong enough that four unhealed hits kill.

**CODE:** `questing-beast.ts`:
- `QUESTING_BEAST.hitsToKill` goes 30 → 55 and `hpPerLevel` 15 → 25: a level-17 Wayfarer with a power-30 weapon faces 2,625 health.
- `damageShare` goes .11 → .27; it is still divided by `(1 − damage reduction)`, so a blow takes about 27% of maximum health after armour.
- New: `speed` 1.55 (`speedMultiplier`), `attackGap` .12 and `staggerResistance` .85.

**CODE:** `monster-pack.ts`:
- The beast's kit is four new modules, used only by it (unique creatures never donate attacks):
  - `qbRend`: a 150° claw rake (windup .22 s, cooldown .9 s);
  - `qbSpiral`: two arms of orbs every .1 s for 1.5 s, the angle turning .42 rad per step (cooldown 6.5 s);
  - `qbWave`: an energy ring of radius 7 rolling out over 1.3 s, which can be jumped (cooldown 5 s);
  - `qbBarrage`: a charge at 9.5 tiles/s that spits five-orb arcs behind it every .2 s (cooldown 4.8 s).
- `leapSlam` unlocks in its wounded phase.
- New effect kind `orb` (table `QB_ORB`): it moves at 5.2 tiles/s for 1.9 s, stops at the first blocking tile and hurts once. Orbs deal .55 of a blow (about 19% of maximum health).
- `endAttack` uses `e.attackGap` when set.

**CODE:** Tim's second pass (same release): combos, pounces, dodging and panther movement.
- Two more attacks:
  - `qbFlurry`: four lunging claw strikes .2 s apart, then a hop back out of reach;
  - `qbPounce`: a crouch, a .25 s rise while tracking the Wayfarer (untargetable, `hopLift` up to 4), a dive at 15 tiles/s, and a slash on landing.
- `QB_MOVES` holds these numbers.
- Evasion (`evade`, for creatures with `evasive`, which `tuneQuestingBeast` sets):
  - Triggers: one of the Wayfarer's shots (`w.playerShots`, the game's projectiles) closing within 3.2 tiles on a line through it, or a swing (`w.playerSwinging`) within 2.6 tiles.
  - It springs aside at 11 tiles/s for .22 s, untargetable.
  - Cooldown 1.1 s (.8 s when enraged). It may spring out of an attack's recovery, never out of the attack itself.
- `fluid` eases its heading and pace toward the brain's wish (rate 10/s), so it moves like a panther rather than snapping between directions.

**CODE:** `monster-render.ts`: Tim found the first model fat and goofy. `questingBeast` is now its own detailed recipe, drawn in body units, instead of the pack's ellipses:
- a lean, muscular body: a deep chest and heavy shoulders, a tucked waist, haunches, a light edge along the top of the back, ribs, and shoulder and haunch masses;
- jointed legs drawn as round-capped strokes, with soft muscle masses on the thighs and upper arms, digitigrade hind feet, claws, and a stride while it moves;
- a long neck and an angular wedge skull with a brow ridge, a slit eye, teeth and a jaw that glows when open;
- two thick, ridged horns swept back over the skull;
- translucent folded bat wings with arm and finger bones and a scalloped edge, which fan out during windups;
- a ridge of 15 back spines and a long tapering tail ending in a bone blade;
- burning veins along the legs and flanks when enraged.
- A furnace core in the chest flares during windups, spirals and barrages.
- Orbs draw as glowing red spheres with trails; the energy wave as a red-white ring.

**BOUNDARY:** No save or generation change; spawning, tries, cooldowns and rewards are as before.
- Live effects stay within the pack cap of 48: a 30-second simulation peaked at 28.
- In that simulation (with the second pass) the beast started 20 attacks in 30 s, using all six. Firing a shot at it every .6 s, it dodged 9 times and took 28 of 48 shots.
- The game's 0.7 s of invulnerability after a hit limits orb damage to about one hit per 0.7 s; an orb that arrives inside that window is spent.
- Not tested on a device; the numbers are a first pass for Tim to judge.

## Faster water; update prompt; bogs rot; Pack and Atlas fixes (release 185)

Tim's probe on release 181 (Firefox, Android, 2026-10-18): the overworld ran at 31 fps and the open sea at 24, against 87 in a dungeon. The game code was almost all `render` → `ground`: about 16 ms per frame on land and 20 ms at sea, versus 0.8 ms in a dungeon. He also reloaded after the release-183 publish and was still on 181.

**CODE:** Water overlays.
- The overworld's ground is one cached image per section (release 159). Copying it costs about a third more than the full-screen tint copy, which Tim's phone does in ~4 ms (calibrated in Chromium's CPU canvas, which uses the same Skia engine).
- The rest was the animated overlays: every visible water tile made its own stroke call, two per ocean tile. Each also set `strokeStyle` from a string, which Firefox parses on every set. A watery screen meant several thousand canvas calls a frame.
- `landscape-render.ts` adds `animateLandscapeTiles(ctx, tiles, s)`, which takes a flat `[tile, x, y, …]` list:
  - ocean, deep ocean, lake water, shallows and current streaks each go into one path with one stroke;
  - ocean sparkles are filled after the strokes;
  - lava, bubbles, glow and motes still draw per tile.
- `renderer.ts` collects the visible animated tiles into a reused array and makes one call.
- In Chromium's CPU canvas, a screen of ocean takes 0.30 ms instead of 0.75 ms. Firefox's per-call cost is much higher, so the saving should be larger on Tim's phone; his next probe will tell.
- Pixel comparison against the per-tile drawing: 3% of overlay pixels differ, by at most 48 levels, where two semi-transparent strokes used to overlap and double-blend.

**CODE:** Update prompt.
- `sw.js` serves cache-first, including `index.html`. So after a publish, the first load runs the old build while the new worker installs, and only the next load runs the new one.
- `index.html` now listens for `controllerchange` (only when a worker already controlled the page). It then shows a "New release ready · tap to update" button (`.update-ready`) that reloads. Reloading triggers `pagehide`, which pauses and saves, so play resumes exactly.

**CODE:** Get latest release. Tim plays from the home-screen app, which has no reload button.
- Options → System has a "Get latest release" button. It calls `registration.update()` and waits (at most 15 s) for an installing worker to activate or fail. It then saves (`persist`, `flushSaves`) and reloads. With nothing new, it simply reloads.
- Tested in Chromium with a changed `sw.js`: the page reloaded under the new worker.

**CODE:** Bogs. Tim found bogs that tired him instead of lowering maximum health, and murk where nothing happened.
- In `water-traversal.ts`, ordinary swamps now match blight swamps:
  - `MIRE.rotKinds` adds `mireWater` (walkable murk) and `swampWater` (deep pool);
  - `TIDEMANTLE.drainMultiplier` sets `swampWater` and `toxicWater` to 0, so swimming a bog pool rots instead of tiring.
- Bog ground (the dry land between pools) stays safe. At the rot cap, lingering poisons, as in the blight.
- The rot message names bog water in an ordinary swamp.

**CODE:** Pack. Tim's Pack showed "Carried equipment could not be shown ((intermediate value).reduce is not a function)" with 62 items carried.
- `completeRevelationArc` (`story.ts`) granted the Echo Compass with `affixes` as an object, `{attackReach, moveSpeed}`; every other item uses a list of `{id, value}`.
- The grant now uses a list: reach 0.08, movement 0.03.
- `items.ts` adds `affixList` (readers accept only a list) and `normalizeAffixes`. `normalizeItemUpgrade`, which `migrateSave` runs on every carried and equipped item, converts an existing object to the list, so saved compasses keep their values.

**CODE:** Atlas. Tim's Atlas framed a section gold although it held nothing to do, before and after he left it.
- `openChallengeSections` counted Major Danger sites (Colossus Traces, `bossCue`), which nothing ever resolves.
- `CHALLENGE_SITES` now holds only crossings and arenas. A trace still shows as a danger sign; the compass no longer points at it.
- Correction (release 187): Colossus Traces exist only in the origin section (the legacy `world-boss` cue, whose "challenge" action has no handler). Tim's gold sections (4,7 to 6,7) therefore hold a crossing or arena the Atlas recorded from the live map; the cause is not yet known and needs his diagnostics.

**BOUNDARY:** Water drawing and the boot script change no game state. The bog rules change hazard data only; the affix repair is additive at schema 14; the Atlas change affects marking only. No generation changes. The water's look is unchanged except at those overlaps. The prompt never reloads on its own. Not measured on a device yet.

## The action cross; location label under Map; crossing text only at crossings (release 183)

Tim, 2026-10-18, after playing release 181:
- Jump was too small, and Spell A at the cluster's top-right covered too much of the playfield.
- Reviewing screenshots of earlier drafts of 183, he asked for:
  - no overlapping buttons;
  - the five action buttons in a cross of equal size, with Jump in the middle;
  - Spell A low under Act (right edges aligned) and Spell B low under Dodge (left edges aligned), so the cross sits centred between the spells.

**CODE:** `styles.css` (release 183 block at the end):
- `--button` is 58 px on large screens (was 54); portrait and short landscape stay at 50 px.
- The cluster is `3.56 × 3.24` buttons, with every button positioned in `--button` units:
  - Tool, Act, Jump, Dodge and Attack are all `1 × --button`, set by `.action-diamond button.core`. That selector outranks the release-101 Jump transform and the release-179 Jump/Dodge sizes.
  - Neighbours in the cross are `0.12 ×` apart (6–7 px).
  - Spell A (left 0) and Spell B (left 2.4) are the 179 ovals on the bottom row, 6.5–7.5 px from Attack.
  - Spell A's right edge equals Act's; Spell B's left edge equals Dodge's.
- `index.html` and `proving-ground/index.html` move Spell A back into the cluster markup; the bottom row holds Potion alone.
- Portrait phones (344–412 px wide) have no room for Potion between Pack and the cluster. In portrait, Potion sits one row up, right of the compass, and the cluster sits 6 px from the right edge.

**CODE:** Location label. Tim asked for the "SECTION x,y" label beneath Map and Pack.
- `.left-controls` (compass, Map, Pack) rises 30 px. In portrait, Potion rises with it.
- `main.ts` measures `.left-controls` on resize and sets three values:
  - `game.labelInset` places the label 5 px below Pack.
  - `game.labelX` aligns the label with the controls.
  - `game.labelMaxWidth` stops the label 8 px before the first cluster or bottom-row button in its band.
- `renderer.ts` draws the box at those values and passes the width to `fillText` as its maximum, so a long place name compresses instead of running under Spell A on a narrow portrait phone.

**CODE:** Interaction dialog text. Tim reported that talking to Pim, a traveller, showed "Enter now, or record that you are leaving this crossing unexplored…". That text was `openInteraction`'s fallback for every kind without its own branch. It now appears only for `dungeon` objects and objects whose valid actions include `enter` or `bypass`. Any other kind shows its `role` (e.g. "Wandering reciter"), or no description at all.

**BOUNDARY:** Layout only. Dodge is no longer larger than the others: Tim asked for equal buttons. The gap handler still sends a press in a gap to the nearest button within 18 px, with Dodge winning ties, which covers release 179's off-centre thumb. The rendered buttons were measured with Playwright, as stadium shapes, at 1280×800, 915×412, 780×360, 412×915, 360×780 and 344×780: no two are closer than 5 px and none is off-screen. Not tested on a device.

## Gap presses release their hold (release 181)

The towns session flagged this after release 179 (2026-10-18). Holding Act to leave the skiff reads `input.held("interact")`, which `heldButtons` tracks.

**CODE:** `input.ts` `press(b, e)` now listens for the release (`pointerup`, `pointercancel`, `pointerleave`) on the element that received the press, `e.currentTarget`. That is the button for a direct press, and the action cluster for a press in a gap.
- Release 179 listened on the button only, but a touch's events stay with the element it started on. A gap press therefore left its button held after the finger lifted. Confirmed with synthetic pointer events: release 179 kept "attack" held, release 181 clears it.
- The listener only ends the hold for the same `pointerId`, so another finger lifting elsewhere no longer ends a held press.

**BOUNDARY:** Input bookkeeping only. Presses latch exactly as before.

## Dodge reaches the thumb; oval spell buttons (release 179)

Tim's 110-second probe on the folded outer screen (release 175 layout) shows where his second finger lands. Presses he meant as Jump, Tool and Act all registered. His roughly ten Dodge attempts landed just off Dodge's lower-left curve, on average about 24 px left of and 17 px below its centre. A round button's square corners are not part of it, so those presses fell on the cluster itself and did nothing; only one reached Dodge. The input path was never at fault.

**CODE:**
- `input.ts`: a `pointerdown` on `.action-diamond` itself (a gap, not a button) presses the button whose edge is nearest, within `GAP_REACH` (18 px).
  - Dodge wins near-ties by `GAP_PRIORITY.dodge` (8 px), because it is the action that has to land at once.
  - The press logic is shared (`press(b, e)`), so a gap press latches, holds and swallows its click exactly like a direct press.
- `styles.css` (appended; sizes follow `--button` on every screen):
  - Dodge is 1.1 buttons wide and reaches slightly left and down (`right` 0.12, `top` 1.0).
  - Jump stays in the centre at 0.7 of a button.
  - The spell buttons are ovals again (1.16 x 0.72 buttons, Tim: "they fit better that way"). They reach 0.16 of a button past the cluster's right edge to stay clear of Tool, Dodge and Attack.

**Replay of Tim's probe:** his touch points were replayed against the new layout at 437x608, each placed at the same offset from the button's centre. Dodge attempts went from 4 of 10 to 9 of 10, and Jump presses from 14 of 14 to 13 of 14.

In Chromium, two-finger dodges with the second touch at Tim's average offset dodge every time.

**BOUNDARY:** Controls only; no gameplay change. The gap rule applies to the action cluster only, so taps on the world, the HUD and the quick row are unchanged.

## Spell buttons beside Dodge; System page wraps (release 177)

Tim's layout (2026-10-18): the action cluster sits low, near the bottom of the screen. The spell buttons move from the quick row into the cluster's empty right-hand corners: Spell A beside Tool, above Dodge, and Spell B below Dodge in the bottom-right corner (from Tim's marked-up screenshot). The cluster shifts a little left, and Potion takes the spells' old place beside it.

**CODE:**
- `index.html` and `proving-ground/index.html`: the two spell buttons move from `.quick-row` into `.action-diamond`, after Jump. They keep the `spell` class, `data-action` and `data-slot`, and add the classes `core spell spell-b` and `core spell spell-a`. Jump stays in the centre (the release 101 test).
- `styles.css` (appended):
  - `.spell-a` at `right: 0; top: 0`; `.spell-b` at `right: 0; bottom: 0`. These are the empty corners of the 3x3 grid, so the cluster keeps its size on every screen.
  - The spell symbol and slot letter are restyled for round buttons.
  - The cluster's `right`/`bottom` are lowered and moved left (default, portrait, short landscape), and `.quick-row`'s `right` is widened so Potion sits beside the cluster.
- At 437x608, 412x915, 895x530 and 1280x800 no action buttons overlap and none fall off screen.
- **System page:** `#optionsPanel pre` now uses `pre-wrap` and `overflow-wrap: anywhere`, and the panel is capped at the viewport width. The browser and release lines wrap instead of widening the page past the screen.

**BOUNDARY:** Layout only. In Chromium, simulated two-finger dodges (one touch steering, a second tapping Dodge four times) all dodge, and the input path is unchanged since release 158. Tim's report of Dodge failing on his phone is still open, pending his probe report.

## Release 173's button layout reverted; the Atlas fits any screen (release 175)

Tim (2026-10-17): the action buttons worked fine in their long-standing layout. Stop tuning for particular Fold screens and let the game size itself to whatever screen it is on, so it runs on other phones and computers too.

**CODE:**
- `styles.css`: release 173's portrait rules (Jump in the corner, a wide Dodge) are removed. Jump is back in the centre of the diamond on every screen, as in release 101.
- `styles.css`: `.maptools` uses `repeat(auto-fit, minmax(52px, 1fr))`. The Atlas tool row wraps on narrow screens instead of squeezing "Center" and "Relays" past their buttons.
- `main.ts` `atlasMapHeight()`: when the Atlas is open, the map is also capped to the dialog height minus everything above it and the tool and layer rows below it. The rows are measured from the layout (`getBoundingClientRect`), so the map, its tools and the layer toggles are all visible at once on any screen. The details below still scroll.
- Checked at 437x608, 360x780, 895x530 and 1280x800.

**BOUNDARY:** Layout only. The two-finger dodge report is still open. Tim's outer-screen probe showed every second-finger press reaching the page and registering as Jump, and the input and dodge code are unchanged since release 158. The next step is a probe in which he presses only Dodge.

## Two-finger dodge on a portrait phone (release 173)

Tim's 30-second probe on the Fold's folded outer screen (437x608 CSS px, portrait) tested the two-finger dodge: one finger steering, the other pressing Dodge. All 30 second-finger presses reached the page with no cancels, but every one landed on `action:jump`, at about x 352-369. Dodge spans 380-430, and the centred Jump button (`--button` x 0.86 = 43 px) filled the middle of a 150 px diamond. The input path was never at fault.

**CODE:** `styles.css` (rules appended at the end, `@media (orientation: portrait)`):
- `.action-diamond .jump` moves to the diamond's empty top-right corner (`right: 0; top: 0`, `--button` x 0.84).
- `.action-diamond .dodge` widens leftward to `--button` x 1.62 as a pill.
- At 437x608, Dodge now spans x 349-430. Every touch point in Tim's report resolves to `action:dodge` via `elementFromPoint`; Jump sits at 388-430 x 405-447.

**BOUNDARY:** Portrait only. Landscape (the inner screen), where Tim's release 165 probe showed Dodge presses registering, keeps Jump in the centre as in release 101. No input or gameplay code changes.

## Strong poison from ooze pools and toxic vents (release 171)

Tim's decision (2026-10-17): Mire Apostle ooze pools and shelter toxic vents have their own character, distinct from the swamp's rot. They poison at once and hard, and leave max HP alone.

**CODE:**
- `elites.ts` adds `STRONG_POISON` (`duration` 10 s, `maxHpFraction` .03 per second, `minDps` 2), `strongPoisonDps(maxHp)` and `applyStrongPoison(status, maxHp)`.
  - It uses the existing `applyPoison`, so a stronger poison replaces a weaker one's damage rate, and `cleansePoison` (Clearroot Ampoule) still ends it.
- `game.ts`:
  - **Ooze pools.** Touching an ooze pool (`eliteHazards` with `poison`) applies strong poison and says so the first time. Before, it set a plain 8 s poison at 2 per second.
  - **Toxic vents.** A shelter hazard of type `toxicVent` applies strong poison along with its one-time damage. Before, it only did the damage.
- The green pulse and the HUD's `POISON Ns` show for any poison.
- Totals: about a third of max HP over 10 s, e.g. 20 of 60 HP or 80 of 268 HP.

**BOUNDARY:** The swamp (`MIRE` rot, then poison after `poisonDelay`) is unchanged. No save-schema change: `status.poisonDps` already existed in release 165.

## HUD room for poison text; batched projectiles (release 169)

**CODE:**
- **HUD.** While rotted, `#healthText` reads like "115/134 (rot −134)". It ran into the level/XP/Aperture column, garbling both.
  - The expand button (`#hudExpand`) now sits just under the HUD box at its left edge, instead of outside its top-right corner. The box takes the width the button used: 340 px, 316 portrait, 294 narrow portrait, and 42vw + 30 px on short landscape screens.
  - `.hud-summary` gives the vitals column its content width (`minmax(0, max-content)`), with fixed-width bars. Level, XP and Aperture take the rest and shorten with an ellipsis.
  - Rules are appended at the end of `styles.css`.
- **Projectiles.** `combat-visuals.ts` `drawRangedEffects()` groups projectiles by colour. Each group draws one halo path at alpha .28 and one body path, instead of two fills and two alpha changes per projectile.
  - Tim saw slowdowns while firing an awakened Lumen Spindle with Echo, which keeps 30 or more projectiles in the air.
  - Overlapping halos now merge rather than stack.

**BOUNDARY:** Presentation only: no gameplay, save or generation change. The projectile slowdown was not reproduced in Chromium (update stays under 0.1 ms with 15 projectiles; render adds about 90 canvas calls). The batching removes per-projectile draws, but the Firefox cause is unconfirmed until a probe report taken while firing.

## Smoother overworld from the probe report (release 167)

Tim's release 165 probe (Firefox, inner Fold screen, 1790x1060 canvas) showed dungeons at 117 fps with 1.5 ms of render, but the overworld at 41 fps with 17 ms of render. It also showed autosave stalls of 30-72 ms and section-crossing stalls of 100-260 ms. Firefox's accelerated canvas falls back to drawing on the CPU when frames are full of complex paths and gradients. On that path, full-screen gradient fills and hundreds of path draws are expensive.

**CODE:**
- **Screen overlay.** `renderer.ts` `drawScreenOverlay()` paints the warm tint and the vignette once into a screen-sized image and copies it each frame. The old per-frame fills remain as the fallback for contexts without `getTransform`/`canvas` (tests).
  - In Chromium software rendering this cut those two fills from about 6.4 ms to 1.6 ms per frame.
- **Pack creature sprites.** `monster-render.ts` paints each pack creature into its own image keyed by kind, animation step, facing, state, scale and pixel density. `PACK_SPRITE`: up to 24 repaints a second, a box measured to hold every kind's poses, boss glow and flight lift, and up to 48 kept.
  - The image is copied to the screen each frame at the creature's position, so movement stays smooth while limb animation steps at the sprite rate.
  - A hit flash ("lighter" compositing) is drawn directly over the copy. Phasing, aloft and illusion transparency apply to the copy.
  - Contexts without `getTransform`, and creatures without an id, are painted directly. Bestiary portraits use the direct painter (`paintPackMonster`).
  - On-screen canvas calls for pack creatures fell from about 490 to 9 per frame in a busy section. Total software-rendered frame time fell from 13-15 ms to 8-9 ms.
- **Ground image reuse.** `drawGroundCache()` keeps the ground image's allocation when a new section has the same size. It clears and repaints the image instead of reallocating about 32 MB on every crossing.
- **Compass warm-up.** `world.ts` `warmWayfindingSignals()` fills the wayfinding signal cache for every section within radius 5, one per call. `main.ts` calls it from `requestIdleCallback` (1.5 s timeout; `setTimeout` without it). The next crossing's compass cues then no longer generate 5-10 sections inside one frame.
- **Autosave.** `persistence.ts` `snapshotSave()` reuses the previous save's copy of each `session.areas` entry that has not been replaced since. Areas are replaced, never edited in place, by `snapshotArea()`. The snapshot is identical to a full `structuredClone`, but the autosave no longer grows with every area ever visited.
- **Probe.**
  - Each frame interval is now paired with the frame it measures, the one before it. Release 165 paired it with the following frame and misplaced hitches under "unaccounted".
  - Render is split into `renderParts` (ground, world, overlay) through `renderer.ts` `renderTimings`, which `main.ts` switches on while the probe runs.
  - The report's `info.release` is a literal (it read null).

**BOUNDARY:** No gameplay, generation or save-schema change. Saved data is byte-for-byte what a full copy would hold. Pack creature art is unchanged apart from its animation stepping at 24 Hz and sub-pixel placement (a 0.03-0.05% pixel difference in frozen-time screenshots). The 8 s autosave interval, quality tiers and reduced-motion behaviour are unchanged. The fixes target the measured causes but are verified only in Chromium software rendering; Tim's next probe report confirms them on the phone.

## Diagnostic probe; dungeon reveal patching; boats and poison (release 165)

**CODE:**
- **Diagnostic probe.** `src/diagnostic-probe.ts` (new module; in `scripts/build.mjs` and both `sw.js` lists) is started from Options → System and records `PROBE.durationSeconds` (300) of unpaused play.
  - Per frame it keeps the interval, each `measured()` phase, the unaccounted remainder (browser paint, compositing and GC), ground-cache builds and patches, and the on-screen context. Frames are bucketed by area, boat and open sea.
  - It also keeps the 40 longest frames with their breakdown and recent events, plus a pointer/touch event log for multi-touch diagnosis.
  - `measured()` now times phases while the probe runs, even with diagnostics off. The HUD buff line shows `PROBE m:ss`.
  - The report is kept in memory and `localStorage` (`corridor-probe-report`); "Copy probe report" copies it, or downloads it if the clipboard is refused.
- **Dungeon reveal patching.** `renderer.ts` `drawGroundCache()` no longer rebuilds a dungeon's whole ground image when discovery reveals chunks, which happened about once a second while exploring and caused a visible hitch.
  - Newly revealed chunks are repainted in place: clipped to the chunk plus one tile and the raised-tile band, repainting every tile that can paint there in order.
  - After exploring 13 chunks, a patched image matched a full rebuild except for 12 pixels.
  - Each frame now copies only the on-screen part of the image.
- **Boats.** `footprintSailable()` rejects tiles with `structure` or `buildingId`. 29 of 198 scanned sections had shacks or districts standing on `shallows`, which the skiff sailed through.
- **Poison.** Blight rot (`MIRE.rotKinds`: toxic mire and toxic water; toxic bog stays safe) now applies in every area, not just landscape overworld sections.
  - At the rot cap (maximum health halved), staying `MIRE.poisonDelay` (5 s) poisons for `MIRE.poisonDuration` (10 s), refreshed while still in it, through `applyPoison(status, duration, dps)`.
  - Damage is `max(MIRE.poisonMinDps, maxHp × MIRE.poisonMaxHpFraction)` per second. Elite poison keeps 2/s.
  - `status.poisonDps` resets when poison ends. The Wayfarer pulses green while poisoned.

**BOUNDARY:** No generation change. Save: `elites.status.poisonDps` is an additive transient field, kept by `ensureEliteState`'s spread. The probe never touches the save.

## Frame-rate pass; heavier swimming (release 159)

**CODE:** Measured on a phone-sized viewport at 4× CPU throttle. The overworld ran at about 25 fps, using about 10× the dungeon's paint work, and dungeons at about 30. Now it is about 42 and 44 respectively. A read-only review (Fable) agreed with the profile.
- `renderer.ts` `drawGroundCache()` draws the static ground once per map into an offscreen canvas at the context's pixel scale, capped at `GROUND_MAX_PIXELS`. That covers tiles, trails, cliffs and, in dungeons, fog. Each frame blits the image.
  - It is rebuilt when the map, tile size, scale, occupied building or (in dungeons) revealed set changes, or when any tile is replaced or changes kind, blocking or elevation.
  - Animated landscape overlays are drawn per frame through `animateLandscapeTile()`: `landscape-render.ts` skips them while `setLandscapeStaticPass(true)` builds the image.
  - Hazard brinks stay per frame so they sit over animated water, as before.
  - In a dungeon, an unseen lethal tile beside the Wayfarer is still drawn through the fog per frame.
  - A dungeon that would cache below screen scale falls back to the per-tile path.
  - Screenshots with the cache on and off are pixel-identical in five overworld sections; dungeons differ in 0.05% of pixels, all faint anti-aliasing.
- The tile size `s` is rounded to whole pixels everywhere it is computed (renderer, combat visuals, main), so blits are 1:1.
- `main.ts` `hudSet()` writes HUD and compass DOM properties only when their value changes, and element lookups are cached. Layouts per frame dropped from 1 to 0.
- `objectiveList()` checks a cheap section and one-second key before counting anything.
- The main canvas context is `{ alpha: false }`.
- `dungeon-framework.ts` `dungeonTileVisibility()` reads a per-chunk `Uint8Array`, rebuilt per revealed set, instead of building a string per call. It matched the old answers in 424,192 checks.
- `combat-visuals.ts` draws a translucent halo instead of `shadowBlur` on projectiles.

Swimming: release 159 also raised `TIDEMANTLE.staminaDrainPerSecond` to 8 and `exhaustedDamagePerSecond` to 10. **Release 161 reverted both to 3 and 6** (Tim: the request was meant for another session), so swimming is as release 158 left it.

**BOUNDARY:** No save or generation change. The 8 s autosave and the CSS filter on `#game` are unchanged; both are candidates if a device still struggles.

## Arcanum: element badges, Active/Passive tags, what affects spells (release 157)

**CODE:** `ATTRIBUTES` in `spell-slots.ts` gains an `icon` per element (🔥 Fire, ☾ Dusk, ≋ Wind, ◈ Ward, ✦ Force, ⟡ Rift). `constellation.ts` exports a `NODE_EFFECTS` data table that classifies every modifier and capstone:
- `cast`: a new ability for slot A or B
- `while`: works only while the branch's discipline is active
- `changes`: alters how the discipline works
- `always`: permanent passive

Nodes that also reach spells name it in `spells`: Overflow (spell recovery) and Amplifier (glyph strikes).

`openSkills()` in `main.ts` shows:
- an element key and an Active/Passive explanation at the top
- element badges on the slot rows and on every branch (with a coloured left border), plus element-coloured node orbs
- a ⚡ after every Active node's name
- in each detail, an element badge and a kind tag (`nodeKind()`, which reads `NODE_EFFECTS` via each node's `ref`)
- for a spell, "What affects your spells": Focus bonus, the current Pairing when it touches spells, and each `NODE_EFFECTS.spells` node with its learned state

**BOUNDARY:** Labels only; no rule, balance or save change.

## Active quests in the Journal; Atlas layer toggles (release 155)

**CODE:** The Journal's new `quests` tab (`renderQuests` in `main.ts`, second after Chronicle) lists everything in progress from `activeQuests()`: accepted, tracking and located Viewport hunts, Old Quillon's errand, the Questing Beast, the Far Array (gate pieces), the Unwritten Meridian, relay leads and the great enemy. Each shows its section, distance and heading. Unfinished challenges from `objectiveList()` are listed below them. "Point compass here" sets `compassPin`, which `navigationTargets()` uses ahead of every other guidance until the compass is tapped (which resumes cycling) or "Let the compass choose again" is pressed. The compass itself shows no text. Under the Atlas, `#mapLayers` holds `ATLAS_LAYERS` toggles for Places (site glyphs), Signals (unresolved signal icons), Objectives (gold and violet frames) and Waypoints (manual waypoint and last death), plus All on/off. `atlasLayers` is kept per device in `localStorage` (`corridor-atlas-layers`, wrapped in try/catch).

**BOUNDARY:** Presentation only; nothing is written to the save. `compassPin` lasts until reload.

## The compass always points somewhere; the Atlas frames objectives (release 153)

**CODE:** The compass used to aim only at an active Viewport hunt or at a wayfinding cue in the current section (and only while the relay lead was open), so most of the time it was blank. `world.ts` now exports `wayfindingTargets()`, the full target list that `wayfindingCues()` used to build internally. `wayfindingCues()` calls it and picks one per kind exactly as before, so cue output is unchanged. In `main.ts`, `objectiveList()` ranks objectives nearest first (ties by `OBJECTIVE_KINDS` rank) and keeps the nearest `COMPASS_OBJECTIVE_LIMIT` (12). The candidates are:
- the hunt;
- story targets (Far Array, Questing Beast, Quillon's satchel, the Meridian, the great enemy);
- nearby crossing and event signals, minus explored sections without open challenges;
- `openChallengeSections()`: explored Atlas sections with a `CHALLENGE_SITES` site (Crossing, Arena, Major danger) and no resolved dungeon or arena history. `sectionOfAreaId()` reads the section from `dungeon:` and `arena:` ids.

Guidance keeps its old order (hunt, then the local cue) and falls back to the chosen objective. A challenge in the current section points at its site, not the section centre. Tapping the compass names its target in the message line (name, distance, heading, section) and steps to the next objective. On the Atlas, the compass target's section gets a gold frame (`ATLAS_FRAMES.compassTarget`, drawn even if unexplored) and unfinished challenges a dashed violet one. Both frames appear in the legend.

**BOUNDARY:** Presentation only. No save field and no generation change; the compass pick is in memory and resets on reload.

## Pack sections fail alone; landings step out of walls (release 151)

**CODE:** `openPack()` in `main.ts` builds each part (Character, Spheres, Stats, Resources, Equipped gear, Arcanum, Consumables, Carried equipment) inside its own `try`. A part that throws is replaced by a `packSectionFailed()` note naming the part and the error (also recorded by `noteError` for Copy diagnostics), and the Pack still opens. On a player's save the Pack had been falling back to the pause menu (release 145); the underlying cause is still unknown. Carried equipment skips null or non-object inventory entries. In `game.ts`, every move to a fixed landing point now calls `relocateIfStranded` against the loaded map: `deepTransition` (stairs between floors), `deepPortal`, `deepReturn`, dungeon entry, Far Array entry and the elite portal. Generated landing points were all open in a scan (3,600 floor landings, 564 entries), so the wall comes from state applied while loading (progress gates, shortcuts). Loading an area already relocated the player's old position, but the landing point was assigned afterwards without a check.

**BOUNDARY:** No save or generation change; positions only move when the landing footprint is blocked.

## Copy diagnostics carries the save (release 149)

**CODE:** Options → System's "Copy diagnostics" in `main.ts` now copies, as compact JSON: release, `navigator.userAgent`, whether the game runs as an installed app, the screen size, settings, storage, `recentErrors` and the active journey's `save`. `recentErrors` holds the last 8 errors (message, first stack lines, repeat count) recorded by `noteError()`, which `recoverOverlay()` calls for every error from the frame loop, window `error` and `unhandledrejection`. Performance samples are included only when performance recording is on. If the clipboard is refused, the JSON downloads as a file instead. The System text shows the browser and recent errors, and the old "Diagnostics: off" line now reads "Performance recording", because it never gated the copy.

**BOUNDARY:** Read-only; nothing in the save changes. The copied text contains the player's save, so it goes only where the player pastes it.

## Overlay errors name themselves on the pause menu (release 145)

**CODE:** Overlays call `pauseForOverlay()` and close the pause menu before building their contents, so an exception while building left the game paused with nothing on screen. Release 126 covered only the frame loop; the pause menu's own buttons (Pack, Atlas, Journal) run outside it. `recoverOverlay(error)` in `main.ts` now handles all of these: `frame()`'s catch plus window `error` and `unhandledrejection` listeners. When the game is paused, visible and no dialog is open, it shows the pause menu with a `#pauseError` note naming the error. `resume()` removes the note, and the pause menu's `close` listener now ignores a close when the menu has already been reopened. Options → System shows the real release number instead of a stale "Release 102", so a player can confirm which build is running.

**BOUNDARY:** UI only; no save, generation or Proving Ground change. This reports the cause rather than fixing it. A save that makes the Pack throw on a device still needs its error message to locate the fault.

## Pack taps no longer fall through; failed overlays fall back to the pause menu (release 126)

**CODE:** HUD action buttons latch their action on `pointerdown` (`input.ts`), so the Pack, Map or Journal overlay opens during the next frame, while the finger is still down. Chrome then delivers that touch's `click` to whatever now lies under the finger in the dialog: the Arcanum button on a Pixel-sized screen, stat rows (and `Increase` when points are free) on others. `createInput` now records the action button's `pointerId` and swallows, in the capture phase, the one click belonging to that gesture unless it lands on the button itself. A later tap has a new pointer id and goes through. Separately, `frame()`'s catch now shows the pause menu (with Continue) when the game is paused and no dialog is open: an overlay that throws while opening (it has already called `pauseForOverlay()`) used to leave the game paused with nothing on screen.

**BOUNDARY:** Input/UI only; no save, generation or Proving Ground change. The underlying exception, if any on a given save, is still logged to the console as "Infinite Corridor frame recovered from an error".

## Back no longer freezes the pause menu (release 125)

**CODE:** `pausePanel` prevents its `cancel` event, but Chrome on Android closes a modal dialog without firing `cancel` when the back gesture arrives with no user activation since the dialog opened (for example the pause menu that `visibilitychange` shows on returning from the background, or a second back press). Only the overlay dialogs had `close` listeners, so the game stayed paused with nothing on screen. `main.ts` now listens for the pause menu's `close`: if the game is paused, `overlayPause` is false (overlay transitions set it through `pauseForOverlay()` before closing the menu), the page is visible and no other dialog is open, it calls `resume()`. Back on the pause menu therefore means Continue.

**BOUNDARY:** Input/UI only; no save, generation or Proving Ground change. The Reciter's Tome itself was verified not to hang on back.

## Open-sea swimming (release 164)

**CODE:** In `water-traversal.ts`, `swimUpkeep(..., openSea)` drains a flat `TIDEMANTLE.openSeaPerSecond` (17) in open-sea sections, about 3 s from a 50-stamina bar. Otherwise the drain is `staminaDrainPerSecond` × `drainMultiplier`. This replaces release 158's `openSeaDrain` ×2.

**BOUNDARY:** Rules only, with no save changes. Swimming elsewhere and exhausted damage (6/s) are unchanged.

## Hunts and the open sea (release 162)

**CODE:** `landscape.ts` exports `openSeaSection(seed, rx, ry)`, the same test applyLandscape uses. `game.ts` `seaBound(rx, ry)` is true when any section in rx..rx+3 × ry-1..ry+2 (the span of domain role offsets) would be open sea, counting unseen sections and those pinned with a `seaVersion`. It is passed to `refreshViewportBoard`'s `avoid`. In loadArea, an open-sea section with a non-archived, uncompleted contract targeting it (or a `domainSectionAt` section) gets `map.huntersRaft`: tiles 14–18 × 14–18 become dock, with a "Hunter's Raft" marker. The hunt and domain `open` spot list is then restricted to the raft.

**BOUNDARY:** Board selection only changes for new postings. Existing contracts keep their targets and are made playable by the raft. The raft is a load-time map edit and is not saved. Land sections are unchanged.

## Sea fog fix and seamanship (release 158)

**CODE:** In `open-sea.ts` `tickSeaHazards`, the fog drift wrap was `(x + v·dt + 48) % 48 - 8`, which moved a bank 8 tiles every frame. It is now `wrap(v) = ((v + 8) % 48 + 48) % 48 - 8`. Each bank gains `swirl`, and the state gains `fogLevel`: the depth inside the nearest bank, eased at 1.5/s. In `renderer.ts`, each bank is drawn as 7 soft puffs turning with `swirl`, and the vision gradient's radii and opacity scale with `fogLevel` instead of switching on and off.

Also in this release:
- `input.ts` adds `held(action)`, true while a key or on-screen button is down.
- In `game.ts`, holding interact aboard for `BOAT.leaveHold` (3 s) calls `leaveSkiff`. It steps ashore, or goes over the side with the Tidemantle, mooring the skiff in place. Without the Tidemantle it refuses until the button is released.
- A jump while aboard counts as `dodging` for the rogue wave.
- `swimUpkeep(..., openSea)` applies `TIDEMANTLE.openSeaDrain` (2).
- `OPEN_SEA_VERSION` 3 uses `SEA_FEATURES.buoyEveryV3` (8).
- The renderer lifts the skiff with the jump and draws a hull gauge from `BOAT.maxHull`.

**BOUNDARY:** The fog fix is visual only: fog placement and seeds are unchanged, nothing is saved, and no rules change. Sections pinned to sea version 2 keep their buoys (one in three); only new sea uses one in eight. The hull, wave and swim rules change gameplay only, with no save changes.

## Sea features (release 156)

**CODE:** `open-sea.ts` `OPEN_SEA_VERSION` is 2. `game.ts` passes `openSea` as the section's pinned `seaVersion` (current for unseen sections) and `buoy:false` when the save remembers a different checkpoint there. With `openSea >= 2`, `landscape.ts` `addSeaFeatures` adds:
- a 2×2 dock buoy with checkpoint `sea-buoy-rx-ry` (`seaBuoy`) every `buoyEvery`;
- a beach sandbar with a `shipwreck` object every `wreckEvery`;
- `snowRock` `seaIce` floes when `coldSea` (moved here from open-sea).

All of these are data in `SEA_FEATURES`. `interactions.ts` handles `shipwreck` `salvage` once (worldFlags[id]), awarding marks, wood and a consumable. `seaHazards` draws its additions from a separate `v2` stream: current band, reefs and drifting fog patches. `tickSeaHazards` carries the skiff along currents, scrapes the hull on reefs, drifts fog, applies storm wind, and raises a storm wave (period 6.5 s) while `w.storm` is set. `stormAt(seed, rx, ry, t)` is pure: one storm per qualifying 10×10 block crosses it once per 720 s of real time. The game checks it once a second and sets `map.weather = "rain"` while inside. In `update`, a buoy re-moors an owned skiff beside it. The renderer draws currents, reefs, fog banks with a vision limit inside them, the storm tint, and the wreck.

**BOUNDARY:** Sections pinned to `seaVersion` 1 (release 152) get no buoys, wrecks or floes. Their transient hazards keep the v1 stream unchanged. Storm, fog and current state is transient. Salvage is one-time and recorded in worldFlags. Checked over 554 open-sea sections: buoy 169, wreck 111, floe 175, current 226, reef 185, fog 234. Storms cover about 9% of sections at a time. Salvage works once, buoy rescue works, and renders were checked in a browser.

## Open seas (release 152)

**CODE:** `landscape.ts` `applyLandscape(..., { openSea, hamlet })`. With `openSea`, deep water may replace border tiles (never protected ones or shallows). A section at |rx|+|ry| ≥ `OPEN_SEA.minDepth` (8) whose `openSeaShare` (sampled every second tile) is ≥ `minWater` (.55) becomes full open sea. Its mask drops the plaza, the exit causeways, the border, ruins, decor and spawns, and protects objects by `landmarkReach` 2. Structures and object bounds are kept plus one tile. A hamlet section protects an `hamletIsle` of beach. Trees, rocks and land spawns left on water are removed, `connectStranded` is skipped, `map.openSea = true` is set, and `map.landscape.openSea` is "open" or "coast". `game.ts` pins `seaVersion: OPEN_SEA_VERSION` in new atlas entries and passes `openSea` only for unseen sections or those with `seaVersion`. `transitionSection` returns false when it turns back. While aboard, `sailAcross` places the skiff on the matching edge (offsets up to ±4). Failing that it lands the player ashore and moors the skiff in the old section; failing that, `returnFrom` turns back. A walker arriving on deep water without the Tidemantle is turned back. In update, the skiff crosses at any edge. New module `open-sea.ts` (in the build and both precache lists): `seaHazards` (whirlpools, rogue wave, icebergs in `coldSea`) and `tickSeaHazards`, both data in `SEA_HAZARDS`. Also `bergAt` (blocks the skiff's footprint) and `waveCrest`. `boats.ts` `hullStrike` damages only the hull and sinks the skiff at zero. `renderer.ts` `drawSeaHazards` draws spirals, a crest clipped to water, and floes.

**BOUNDARY:** Sections in the atlas without `seaVersion` keep their exact layout. Tests that call `applyLandscape` without `openSea` are byte-identical. Hazard state is transient (not saved) and deterministic per section. Checked: sailing across three open sections, grounding and turning back, a walker refused at open sea, each hazard denting the hull, island hamlets built in 53 of 96 candidate sections, and renders of all three hazards. On-device timing was not measured.

## Organic pattern catalogue (release 148)

**CODE:** `pattern-dungeons.ts` adds `ORGANIC_CATALOG`: 28 entries. It keeps ten Life-like and turmite entries from `PATTERN_CATALOG` and adds Vote Caves. Three new families: `turing` (Young's activator–inhibitor: radius `r1` activates, the ring to `r2` inhibits by `weight`), `dla` (aggregation on 2×2 cells from the entry plus `seeds`-1 random seeds, until `mass` of the grid) and `burrow` (walkers from the entry or dug points, with `turn`, `length` and `chambers`). Entries with `warp` are drawn unbent into a scratch grid, then resampled through smooth value noise (`noiseField`, lattice 9) by up to `warp` tiles. Ternary entries accept `seed: "scatter"`. `carvePattern` takes a `catalog` argument. `underlands.ts` passes `ORGANIC_CATALOG` when `layoutPool >= 4`. `game.ts` marks fresh histories `layoutPool: 4`.

**BOUNDARY:** Pool 3 (release 147) dungeons draw from `PATTERN_CATALOG` exactly as before. The new branches only run for new families or `warp` entries, and the ternary branch is unchanged without `seed`. Checked: 28 entries × 3 sizes × 6 seeds reach the guardian, ≤61 ms on desktop.

## Pattern catalogue dungeons (release 147)

**CODE:** New module `pattern-dungeons.ts` (in `scripts/build.mjs` and both precache lists). `PATTERN_CATALOG` holds about 50 entries in nine families: elementary (window cut from a run three maps wide; odd rules drawn with alternate rows inverted), ternary (three-colour totalistic codes), pascal (additive mod p), life (outer totalistic from a soup, on tiles), growth (five-neighbour outer totalistic codes from one cell, 2×2 tiles per cell), ant (turmites; odd colours are floor), hilbert, dragon (largest paper fold at ≥2 tiles per step) and carpet (Sierpinski or Cantor, tiled). `carvePattern` draws a pattern into the grid, oriented so time runs from the entry. `stitchPattern` drops specks under 4 cells, then repeatedly joins the nearest separate piece to the entry's piece by the shortest tunnel through rock. `underlands.ts` adds `LAYOUTS_V3` (six grammars + four "pattern") for `layoutPool >= 3`; `options.pattern` forces an entry (previews and tests). `map.automaton` gains `pattern` (the catalogue id). `game.ts` marks fresh histories `layoutPool: 3`.

**BOUNDARY:** Histories with `layoutPool` 1 or 2 keep their grammars and automaton picks unchanged; release-146 automaton dungeons stay pool 2. Balance numbers are data in the catalogue (fills, steps, codes). Checked: all 52 entries × 3 sizes × 6 seeds reach the guardian, 42 ms at worst on desktop; on-device timing not measured.

## Automaton dungeons and Threefold layout 2 (release 146)

**CODE:** `game.ts` `generatePinnedDungeon` marks histories first generated from now on (`fresh`) with `layoutPool: 2` and, for threefold deep ids, `threefoldLayout: 2`. It passes `layoutPool` to `generateExpeditionDungeon` and `threefoldLayout` through `generateDungeon` to `generateDeepV2Dungeon`. `generatorVersion` stays 5 (a test pins it). `underlands.ts`: `LAYOUTS_V2` adds two `automaton` entries to the six grammars, so about 25% of pool-2 dungeons use it. The `automaton` grammar evolves a rule from `AUTOMATON_RULES` (curated; no bit-0 rules; single-seed fractal or scattered chaotic/gliding). Each cell becomes a 3×2 floor block so diagonal neighbours connect, with time flowing from the entry side; dense results use dead cells as halls. A few rooms are set in, then the existing guarantee-path and drop-islands passes run. `map.automaton {rule, name}` prefixes the dungeon name. `deep-dungeons.ts` `threefold2` builds an 80×76 map: entry hall, a two-chamber processional (`route`) to a rotunda, three wing routes of 3–4 varied chambers (`chamber`) with a side room, a smoothed random-fill warden cave (`cave`), straight hidden `deepShortcut` doors from each cave toward the hub, and the north gate and final arena via `finalize`. Residents come from `populateDungeonEncounters` as for every deep map.

**BOUNDARY:** Existing dungeons (no `layoutPool` / `threefoldLayout`) keep their layouts. Other deep archetypes are unchanged. Checked: automaton maps fully reachable entry to guardian; threefold v2 objectives reachable before shortcuts, and the final boss sealed until the gate opens.

## Patterns beyond the pattern (release 144)

**CODE:** `relay-network.ts`: inside the core (|rx|, |ry| ≤ 128) `relayCell` reads the release-142 Rule 110 grid. Outside it, `RELAY_REGIONS` (size 64, top -1024, cache 48, tiers by Chebyshev distance of the region centre: 0 → [124, 110], 400 → [90, 150, 126, 22, 18], 800 → [30, 86, 106, 54]) and `regionRule` pick each region's rule by a seeded hash. `regionGrid` computes a 64×64 region on demand, wrapping horizontally. Its first row is the cells just north of it (core or region above, recursively), or a sparse seeded row at the top band, or a fresh sprinkle when the inherited row is under 4% or over 96% alive. Grids are cached in a bounded LRU. Rules with bit 0 set (an empty neighbourhood turns on: 73, 105, 45…) are excluded because they only flicker in stripes. `relayRuleAt` and `RULE_NAMES` label the Atlas overlay. Measured at about 3 µs per cell, including region creation.

**BOUNDARY:** North of `top` (ry < -1024) no relays are placed. Regions abut side by side without blending; only the north-to-south seams inherit. Decisions already pinned are unchanged.
## Relays follow Rule 110 (release 142)

**CODE:** `relay-network.ts`: `RELAY_PATTERN` (rule 110, 257×257, origin 128). `relayPattern(seed)` runs Rule 110 from a sparse seeded first row (1 in 7 alive); each section row `ry` is a generation and each column `rx` a cell, wrapping beyond the square, and results are cached per seed. `relayCell` reports alive; `relayEdge` (alive with a dead northern neighbour, about 20%) is where relays go. `relayNodeDecision` uses `relayEdge` for ordinary crossings (`crossingSection` parses `dungeon:<seed>:g<n>:<rx>:<ry>:<object>`) and keeps the old hash share for other ids. Histories already decided are unchanged (`relayPattern: 2` marks pattern-decided ones). Atlas: the `#mapRelays` toggle (`relayOverlay`) calls `drawRelayOverlay`, which draws faint edge marks over explored sections and their neighbours, answered relays as nodes, and links from each node to at most two nearest answered neighbours within two sections.

**BOUNDARY:** The overlay is display-only and off by default. The relay share drops from 35% to about 20% of crossings for crossings decided from now on. Previewed as a static render of the pattern; the in-game overlay was checked headless with a fresh save.

## Varied Array runs; monsters hit harder (release 140)

**CODE:** `far-array.ts` `beginArrayRun` picks the run's dungeon from `RUN_KINDS` (expedition, threefold, descent, loop, flooded, fortress) by a hash of the run number. Deep kinds append `:deep-v2:<archetype>` to the run id, so `generatePinnedDungeon` routes them to `generateDeepV2Dungeon`. Multi-level runs start on their first level (as ordinary dungeon entry does). The boss swap uses only `finalBoss` or `gateWarden` spawns on multi-level maps, so the guardian or Listener appears once, on the last level. `arrayPylons` places three `arrayPylon` objects per level (drawn as restored relay nodes; inspect replays a `PYLON_LINES` line), and `runName` names the run (`RUN_NOUNS`). `game.ts` `ENEMY_DAMAGE_SCALE` (1.3) multiplies every created monster's damage at the end of `createEnemyFromSpawn`, except passives (damage 0), the Questing Beast and Far Array bosses.

**BOUNDARY:** Deep-archetype runs keep their own objectives and gates before the final boss, so they are longer than expedition runs. The damage scale also reaches summoned foes made through `createEnemyFromSpawn`, but not pack broods or illusions made directly by `createCombatant`. Player power is unchanged at Tim's request.

## The Far Array (release 138)

**CODE:** `src/far-array.ts`. `save.farArray` (`ensureFarArray`, normalised in `freshSave`/`migrateSave`) holds gate, pieces, runs, listeners, boons, offer, ending, endingPending, history and activeRun. `arrayMouthAt` puts an `arrayMouth` object (action `enter`) in the coordinate section, and a story wayfinding cue points to it. `game.interact` → `beginArrayRun` clears the previous run's area state and history, and the run id is `far-array:<seed>:run<n>`. Relay nodes are excluded from runs (`ELIGIBLE` in relay-network.ts). On dungeon load, `runBossSpawn` replaces the final guardian. The guardian is chosen from `GUARDIANS.restore` or `GUARDIANS.sever` by the restore share; once `gateOpen`, it is the Listener instead. `MONSTER_PACK.listener` (unique, dungeonOnly) has its moves set per form from `LISTENER_FORMS` (open, walled, or both, switching at 50%), plus `BODY.listener` and Echo `listener`. Scaling: `scaleForGate` raises run minions per tier (`FAR.dungeonHp` / `FAR.dungeonDamage`) and gives bosses a borrowed move from gate 2. `tuneArrayBoss` (`ARRAY_TUNING`) sets boss and summon health in the Wayfarer's melee blows (+8 per tier, +1 per relay) and damage as 8.5% (+1.2% per tier, capped at 20%) of max HP, after armour. It runs after creation, and the regional depth pass skips `farArrayBoss`. `Game.updateListener` handles summons at `summonThresholds(gate)` (none at gate 1; 50% at gate 2; 66/33 at gate 3; 75/50/25 after), hiding (`untargetable`, AI skipped) from gate 3 until its summons fall, and the "both" form change. Defeat: `guardianFelled` adds a piece; `listenerFelled` raises the gate, rolls three `BOONS` and sets `endingPending` the first time. Boons feed `characterStats` through `boonTotals`. Journal tab `gate` (`renderFarGate` / `drawGate`) draws the ring of pieces and handles the boon and ending choices.

**BOUNDARY:** One dungeon level per run; extra relays add difficulty, not levels. The approach flavour (pylons, quiet ground) is not built. The ending choice is narrative only (journal); the climb continues either way. Simulated: 6 runs through Gate 1 into Gate 2 with tuned bosses (~1,000 HP guardians at level 15 with a starter blade, about 8% of max HP per hit), and the Gate-3 Listener's summon, hide, reappear and form change. Not checked on a phone.

## Aperture keeps going (release 136)

**CODE:** `items.ts` `APERTURE_BANDS` now holds 40 bands: the original four, then named deep bands, each threshold `round(prev × 1.45 + 20)`. `world.ts` derives `APERTURE_THRESHOLDS` from it, and `apertureTier` counts thresholds reached (tiers 0–3 unchanged). `apertureEncounterSpawns` keeps the tier-3 tables for deeper tiers but adds `APERTURE_DEEP` per extra tier: +1.2% chance (capped at 42%) and +0.15 threat multiplier. `game.ts` `apertureResonance(save)` (tiers past 3) feeds `characterStats` via `APERTURE_RESONANCE` (+6 HP, +2 melee, +2 magic each). Visual Aperture tints clamp to tier 3. HUD: `#progressCompact` stacks `#xpCompact` (`LV n · XP a/b`, with numbers ≥10k shortened) over `#apCompact` (`AP a/b · Tn`, band name in the title), and the summary grid is `minmax(96px,1fr) auto`; `#hudExpand` is absolutely positioned at `left: 100%`, touching the box's top-right corner. Checked at the Fold sizes with long values. Relay fix: `relayCoordinate(save)` is shared, and `ensureRelayNetwork` records the coordinate and a "The Far Coordinate" journal entry whenever `relay.networkAnswered` is set, whichever path set it.

**BOUNDARY:** Nothing is generated at the relay coordinate yet; that is Tim's call (see Agent context). Constellation points still come one per 6 Aperture. Resonance makes the Questing Beast (tuned from `meleeBonus`) a little tougher too.

## The hunt board grows up (release 134)

**CODE:** `src/foundry.ts`. `BOARD` now posts every 15 sections (the first after 5); untaken postings lapse after 20. Posting kinds are weighted in `BOARD.kinds`: foundry 40, tracking 25, bounty 20, territory 15 (at most one open territory). Lapsed Foundry contracts become `dormant` and are re-posted at a new target; returns alternate with new postings (even `seq`), and each return adds a Recent-arrivals record. Lapsed bounties and territories are archived. Tracking hunts: `retrace` builds `trail` (`BOARD.traceStages` = 2 sections between the player and `finalTarget`) and a pre-selected ordinary destination. `q.target` is always the next place to go, so wayfinding and arrival code work unchanged. `huntTraceStage(q)` gates `game.ts`: a trace section gets a `huntTrace` object instead of the target. Inspecting it calls `followHuntTrace`, which advances `stage` and `target`. Territories: a generated contract carries `domainSpec` (family `pack`, roles outskirts/warren/lair). `ensureViewportState` registers each into `DOMAIN_BLUEPRINTS`, and `packDomainPlan` spawns the pack kind (the lieutenant in the warren; the boss in the lair with `boss`, `domainBoss` and `viewportHuntId`). The bestiary: `foundryAdmission(save, id, decision)` records corridor/rare/dungeon lifeforms in `save.viewport.bestiary` (additive), for generated Foundry hunts and the Foundry trial. `admittedFoundrySpawn` places at most one per section (`BESTIARY`: corridor 3%, rare 0.8%) or dungeon level (6%), scaled like hunt lifeforms. Viewport shows a "Resting in the rotation" group, and the decision buttons appear on completed lifeform hunts.

**BOUNDARY:** Generated territories have no Aperture manifestations. Admitted lifeforms do not give hunt rewards. Simulated: tracking traces, the territory across all three sections (also after `migrateSave`), rotation returns, admission, and wild appearance at about 2.5% per section. Note for simulations: setting `rx`/`ry` before `loadArea(..., true)` captures the old section's foes under the new section's id; use `loadArea(area, false)`.

## Viewport keeps watch (release 132)

**CODE:** `src/foundry.ts` adds the rolling hunt board. `BOARD`: at most 3 open generated hunts, one posted every 6 newly explored sections (the first after 3), lapse after 45, target 4–9 sections from the player, 55% Foundry. `HUNT_FOUNDRY` holds the hunt-target stats (120 + 18 per level HP). `refreshViewportBoard(save, rx, ry, { level, packKinds, avoid })` runs on each overworld load from `game.ts`. `avoid` keeps hunts off the origin, town-nominated sections and the two fixed settlements. It posts a `viewport-gen-N` contract (`generated: true`). Foundry postings store the whole `foundryCandidate` (rolled with a `board{seq}` salt, passive results promoted to hostile) and add a Recent-arrivals record. Bounties name a non-unique, non-dungeon pack kind. State is `save.viewport.board { v, seq, lastPostAt }` (additive); `v.read` is cleared on a post. `generatedHuntSpawn(q, at)` builds the tagged target for both the overworld site and the Held Aperture fallback. Fixes: `populateOverworldPack` no longer converts spawns carrying `viewportHuntId` or `domainId`. The ordinary-site spawn uses the contract's own `targetKind` instead of forcing `rootBrute`. `resolveHuntDestination` keeps the Vesperwing on its fixed site (23,16) when a town stands on its section (a blocked site still falls back), and the Vesperwing is tagged whenever its contract is accepted or located. Note: `ensureViewportState` rebuilds `save.viewport`, so take `save.viewport` after calling it.

**BOUNDARY:** Generated hunts are always `direct` hunts: no tracking stages or domains. Accepted hunts never lapse. Verified in headless simulation for both seeds: every fixed contract spawns its tagged target, and generated hunts post, guide, spawn (overworld and arena) and complete with rewards.

## Travellers keep to the ground (release 130)

**CODE:** `src/travelers.ts` adds `groundRegion` (flood fill) and `groundPath` (bounded breadth-first route) over 4-connected walkable tiles: not blocked, not a structure, not lethal or shallows, and the same elevation unless a ramp (`slope`) joins a one-level step. `stitch` joins waypoints into a continuous walk. Traveller group paths (the trail tiles) are stitched on foot. The leader never wraps from the path's end to its start; it turns back. Followers keep their own `pathIndex` and step tile by tile toward their slot behind the leader. Reciters pick their stroll waypoints from their own ground region. A share (`RECITER_LEAVE.share` 0.6) get `leaveAfter` of 25–70 s; when it passes, they route to the nearest reachable section-edge tile (or the dungeon entry) and are removed on arrival. `RECITER_CHANCE` drops to wild 0.05, town 0.2, dungeon 0.08. Simulated across 289 sections for 90 s each: about 50,000 position checks, none off walkable ground.

**BOUNDARY:** Leaving is per visit, not persistent; a reciter that left may be met again on a later visit. Quillon still stands still.

## Reciters keep their secrets (release 128)

**CODE:** `reciterTalk` returns `Name: “line”` only. Each placed reciter gets `linesLeft` of 1–`RECITER_LINES_PER_MEETING` (3, rolled with `Math.random` when the section or level loads); after that it answers "has nothing more to say". The role text and arrival messages no longer name the book. `save.reciters` v4 makes random the default (`modes[id]` stores only an explicit "linear"); earlier modes are dropped in migration, so everyone starts random. The Reciter's Tome lists Random first and shows "in order, line N of M" only for Linear reciters.

**BOUNDARY:** Coordinated with the freeze-fix session (release 125, pause-menu back gesture): this change touches only the reciter section of `travelers.ts`, `renderTome` in `main.ts` and two arrival messages in `game.ts`.

## The Reciter's Tome (release 124)

**CODE:** The release-122 Library moved from Options into the Journal as the `tome` tab ("Reciter's Tome"), rendered by `renderTome(out)` in `main.ts`; Options no longer has a Library tab. The data functions (`libraryBooks`, `setReciterMode`, `resetReciter`) are unchanged.

**BOUNDARY:** Name and placement only; nothing changes in the save.

## The Library (release 122)

**CODE:** `save.reciters` is now v3 `{ progress, met, modes, disabled }`. `reciterTalk` records `met`, and `modes[id] === "random"` gives random lines per reciter. `ensureReciters` migrates v2: kept progress counts as met, and the old journey-wide random setting becomes per-reciter random for those already met. Custom stories are kept in the save if present but are no longer used or editable. `libraryBooks(save)` groups `RECITERS` by book (sources, total lines, met readers with place and mode); `setReciterMode` and `resetReciter` back the Options → Library tab (`renderLibrary` in `main.ts`). In `src/recitations.ts`, `silverkey` is now "The Randolph Carter Stories": all five Carter pieces in full, in publication order, sentences merged to about 230 characters (1,915 lines, about 380 KB). The texts come from the vilmibm/lovecraftcorpus GitHub repository.

**BOUNDARY:** The Library lists every book but only reciters already met. There is no in-game story import: Tim asks for books and they ship in a release. Copyright: the 1920, 1925 and 1929 Carter stories are public domain in the US; Through the Gates (1934) and Dream-Quest (1943) are treated as public domain because their copyrights were not renewed, which is the basis on which they are widely hosted in the US. `recitations.ts` is now about 575 KB of precached text.

## Fold layout pass (release 119)

**CODE:** Primary devices are the Galaxy Z Fold outer screen (about 412×916 CSS px, also used sideways at 916×412) and inner screen (about 840×757, also 757×840). The canvas area label in `renderer.ts` now draws at `h - g.labelInset`. `main.ts` `resize()` sets `game.labelInset` from the top of `.left-controls` on every resize, orientation change and fold, so the label clears the compass and Map/Pack buttons. `atlasMapHeight()` in `main.ts` sizes both the Atlas and the dungeon map to leave room for the dialog chrome. `styles.css` compacts the Atlas header on short landscape screens (`max-height: 540px`) and gives `.maptools` buttons a 34 px minimum height.

**BOUNDARY:** Checked in headless Chromium at those four viewports (HUD, action diamond, quick row, Atlas, Pack, Journal, Options → Stories), not on the device. The hinge and display cutouts are not modelled. Other panels (Pack, Journal) already scroll inside their dialogs and were left as they are.

## Story library (release 118)

**CODE:** `src/travelers.ts`. `save.reciters` (`ensureReciters`) is now `{ v: 2, progress, mode, disabled, custom }`. `mode` is linear or random. `disabled` lists story ids travellers don't carry. `custom` holds the player's pasted stories (`STORY_LIMITS`: 8 stories, 600 lines, 400 characters a line). `storyCatalog` lists built-in and custom stories, and `storyLines` returns a story's lines. `splitStory` splits pasted text by line when most lines are short (verse), otherwise by sentence (prose). `addCustomStory` and `removeCustomStory` manage the player's stories. `reciterPlan(seed, key, save, chance)` picks from the enabled catalogue with `RECITER_CHANCE` (wild 0.12, town 0.45, dungeon 0.18). `addDungeonReciter` places a reciter on open tiles within seven tiles of a dungeon level's entry. `tickTravelers` now runs in dungeons too. `reciterTalk` in random mode returns a random line and leaves progress untouched. `src/main.ts` adds the Options → Stories tab (order, carry toggles, restart, remove, add). `src/recitations.ts` gains Siddhartha (220 lines, the 2008 Project Gutenberg volunteer translation) and Rilke (67 lines from eleven Book of Images poems, English renderings written for this game).

**BOUNDARY:** Story settings and custom stories belong to the journey (the save), not the device. Only the full Rilke book in a public-domain English translation could have made it "full Rilke"; none was reachable, so the selection is ours. Narcissus and Goldmund (1930) is left out: the German original entered the US public domain in 2026, but no public-domain English translation exists and the German text could not be fetched here. Travelling groups still appear only overworld; only reciters enter dungeons.

## Reciters (release 117)

**CODE:** `src/recitations.ts` holds `RECITERS` (id, name, book, voice, look, source) and `RECITATIONS` (id to lines, about 165 KB of text). Character lines were extracted in book order from the Project Gutenberg texts (via the GITenberg GitHub mirror) by attribution ("said Pierre", "Pierre asked:"), taking the attributed quote and its continuation after a short attribution. Essays and narratives (Notes from Underground, Self-Reliance, Nature, The Silver Key) are taken sentence by sentence. Casts longer than their cap (up to 160) are thinned evenly across the book. In `src/travelers.ts`, `reciterPlan` picks one reciter for about 12% of sections (`TRAVEL.reciterChance`, depth 1+, none in skirmish sections). `addReciter` places it as a `traveler` object with `reciter: id`, walking the section's first trail or a stroll path (`map.reciterWalk`), and `tickTravelers` moves it and stops it near the player. Speaking calls `reciterTalk`, which reads `save.reciters.progress[id]` (`ensureReciters`, normalised in `freshSave`/`migrateSave`), returns that line (the first meeting also names the voice and book) and advances, wrapping to the first line after the last.

**BOUNDARY:** Only texts in the US public domain: the Maude War and Peace (1922–23), Garnett's Dostoevsky (1912–1918), Eva Martin's The Idiot (1915), Emerson (1836, 1841), Lovecraft's The Silver Key (1929, public domain since 2025), and Musashi's Dokkodo (1645) in an English rendering written for this game. Left out on purpose: The Dream-Quest of Unknown Kadath (1943) and Through the Gates of the Silver Key (1934), whose US copyright status is unclear, and Osamu Dazai, whose works and English translations are still under US copyright. Attribution is heuristic, so a stray line may belong to someone else in the same exchange. Reciters only speak; they don't trade, fight or give quests.

## The Questing Beast (release 116)

**CODE:** `MONSTER_PACK.questingBeast` in `src/monster-pack.ts` is a pack creature (walk movement, duelist brain, scale 1.75) with attacks leapSlam, clawSweep, ramCharge and the new `spikeVolley` (five jumpable `mortar` effects with `spike: true`, two aimed at and ahead of the player and three in a ring; sets `e.spikesSpent`). Boss attacks: shockwave and bite. It carries `unique: true`, which keeps it out of the overworld fallback pool and out of `packVariant` donors (it is not in `OVERWORLD_PACK_POOLS` or `GUARDIAN_POOL`). `BODY.questingBeast` in `src/monster-render.ts` draws it; its spines turn black and it glows red below half health, which is also when the boss-template enrage speeds its cooldowns. `ECHOES.questingBeast` (Beast's Spines, cost 3, kill trigger) is its Echo. `src/questing-beast.ts`: `QUESTING_BEAST` holds the numbers (`chance` 0.035 per section entered, `minDepth` 4, `tries` 3, cooldowns of 24 sections after a kill and 30 after an escape, `hitsToKill` 30, `hpPerLevel` 15, `damageShare` 0.11, bounty 150 + 15 per level). `save.questingBeast` (`ensureQuestingBeast`, normalised in `freshSave`/`migrateSave`) holds cycle, cooldown, active `{rx, ry, tries}`, slain and escaped. `questingBeastFor` runs on each overworld load: it counts the cooldown down, rolls a new hunt keyed by cycle, and returns the boss spawn when the player is in the active section. `tuneQuestingBeast` (in `createEnemyFromSpawn`) sets its health from the active weapon's power plus `meleeBonus`, and its damage from `maxHp` adjusted for armour. `defeatEnemy` calls `questingBeastSlain` (bounty, journal, notice). The player-death branch calls `questingBeastPlayerFell`, which counts tries only while the beast is alive in its section; the third ends the hunt. A danger wayfinding cue points to the active section.

**BOUNDARY:** One beast at a time. It never leaves its section, never appears in towns or near the origin, and does not respawn after a kill until a new hunt rolls. Tries reset only with a new hunt; leaving the section without dying uses none. Balance was checked in simulation only (level 8 with the starting blade: 792 HP, 14 damage per base hit, about 15 to 18 seconds to fell a player who stands still), not on a phone.

## Travellers, trails and Old Quillon (release 115)

**CODE:** `src/travelers.ts`. `TRAVEL` holds the numbers. Trails: each section edge is a trail with probability `trailChance` (0.08), or `trailNearTown` (0.6) when either side is a town-nominated section (`hamletSection`); both sections compute the same edge, so trails continue across them. `applyTrails` walks from each trail exit toward the hub (the town square, else the centre) and marks walkable tiles `trail: true`; `renderer.ts` `tile()` now wraps `tileBase()` and draws a dirt overlay on trail tiles. Trails are pinned per atlas entry with `travelVersion`, like `hamletVersion`. Travellers: `travelerPlan` picks a group from `TRAVELER_GROUPS` (`groupChance` 0.2, 0.42 on a trail; none in skirmish sections), giving each member a look, an optional mount from `MOUNTS` and three lines from `TRAVELER_LINES` (witty, odd, lore, pilgrim, trade, road, song, classic; all original apart from a few short public-domain quotes). `addTravelers` places them as `traveler` objects with a path along the trails, or a stroll between open points. `tickTravelers` (called each overworld frame) walks the leader back and forth along the path, has the others follow, and stops everyone to face the Wayfarer within `pauseRadius`. Speak cycles a member's lines (`travelerTalk`); peddlers trade from the shared `traveler-peddler` shop (`vendorShop`/`buyFromVendor` map every `travelers:` id to it). Old Quillon: `save.wanderer` (`ensureWanderer`, normalised in `freshSave`/`migrateSave`: stage, completed, met, quest). `addWanderer` places him (`wandererChance` 0.07, or 0.22 when an errand is done or none is held), keyed by stage so he moves on. `wandererTalk` pays a finished errand (marks to `save.currency`) and hands out the next from `WANDERER_QUESTS` (hunt, cache, town; rewards grow 50% per full cycle). Hooks: `wandererKill` in `defeatEnemy` (rewarding kills only), `wandererArrive` on overworld load (towns complete town errands; the target section of a cache errand gets a `wandererCache` object to collect), and a story wayfinding cue toward the satchel.

**BOUNDARY:** Save additions are additive (`save.wanderer`; shop `traveler-peddler`); schema stays 14. Travellers are not persistent: groups reset when a section reloads, never cross sections, cannot be harmed and do not fight. Trails are cosmetic (no speed bonus) and never cross lethal tiles; sections explored before release 115 get none. Not built: roads with bridges, mounts for the Wayfarer, traveller quests beyond Quillon's, travellers inside dungeons. Not checked on a phone.
## Boats from wood (release 121)

**CODE:** `src/boats.ts` `WOOD` holds the table: `byForm` shrub 1, spindle 2, canopy 3 (the tree's `vegetationForm`), `skiffCost` 3 and `reach` 1.6. `save.materials.wood` is additive at schema 14, normalised by `ensureWood` in `freshSave`/`migrateSave`. In `Game.interact`, after a successful tree `cut`, `addWood(save, woodFor(o))` adds the wood and the message says how much; a felled tree has no actions, so each pays once. `Game.shoreWater()` finds the nearest deep-water tile (`SAILABLE_DEEP`) within reach where the skiff footprint fits, overworld only and not aboard. With no object to act on, `interact()` calls `buildSkiffHere()`. That runs `buildSkiff(save, at)`, which needs the Tidemantle and 3 wood: it marks the skiff owned with a full hull, sets home to that spot and puts the Wayfarer aboard on the water tile, replacing any older skiff. `update` shows a throttled "Act: build a skiff here" hint at the water's edge with enough wood. The Pack shows the wood count. Death drops carried wood (`loseWood` in both recovery paths; the death message says how much), per Tim 2026-10-16. Other materials are still kept.

**BOUNDARY:** Tim, 2026-10-16. Wood is only for skiffs (no other crafting). The Shipwright, docks and repairs are unchanged. Release numbers alternate with the towns session: this session takes odd numbers and the towns session even, by agreement.

## Compass above Map; slot B apart (release 114)

**CODE:** In both `index.html` files, `#navCompassSlot` moved from the quick row into `.left-controls`, ahead of `.utility-buttons`. CSS (`.left-controls .compass-slot`: order 1, start-aligned) puts it just above the Map button. `.quick-row button[data-action="spell2"]` has a 12 px left margin, so slot B stands apart from A. `main.ts` finds the compass by id, so no script changed.

**BOUNDARY:** Layout only (Tim, 2026-10-16). Checked in Chromium at 844x390 and 390x844, not on a phone.

## Spell slots A and B, and Pairings (release 113)

**CODE:** `src/spell-slots.ts` is data plus pure rules. `CASTABLES` maps `spell:<id>` and `skill:<id>` to a unique `symbol` and an `attr` from `ATTRIBUTES` (fire, dusk, wind, ward, force, rift, each with a colour). `PAIRINGS` holds one entry per attribute pair (21, keyed by `pairKey`), each with `mods` among `spellDamage`, `cooldown`, `speed`, `guard` and `stamina`. `save.magicSkills.slots = {a, b}` and `magicSkills.pairingsSeen` are additive at schema 14. `ensureSlots` (in `freshSave`/`migrateSave`) seeds A from `equippedSpell` and B from the old `selected` discipline. `migrateSave` now spreads the existing `magicSkills` first, so its extra fields survive reloads. `setSlot` validates against `availableCastables`, swaps when moving a castable between slots, keeps `equippedSpell` (spell glyph host) and `selected` in step, and reports a first-found Pairing. In `game.ts`, `castSlot(slot)` activates a discipline or calls `castSpell(spellId)`. With an id, a spell becomes the readied glyph host and uses its own cooldown in `magicSkills.cooldowns["spell:<id>"]`; the old no-argument `castSpell()` keeps its single `spellCooldownRemaining`. Pairing mods reach `characterStats` (`moveSpeed`, `damageReduction`), spell damage and cooldown, discipline cooldowns and stamina regeneration. Overflow also speeds the per-spell cooldowns. Input `spell` casts A and the new `spell2` (key G) casts B; `actionReadiness` reports both through `slotReadiness`. In both `index.html` files, the quick row's `#fieldMenuToggle` became `data-action="spell2"`; field details stay on `#hudExpand`. `updateHud` draws each slot's symbol and letter in its attribute colour. The Arcanum gains a Spell slots block (with Clear and the active Pairing), Set in A / Set in B on every spell and learned discipline, and a found-Pairings list. The Glyphs tab shows one spell host per slotted spell.

**BOUNDARY:** Pairings are passive while both slots are set; there are no cast-together combos. No new spells. Visual check in Chromium only, not on a phone.
## Hamlet architecture (release 112)

**CODE:** `HAMLET_VERSION` is 2 in `src/settlements.ts`. `applyHamlet(map, seed, rx, ry, version)` takes the version from the section's atlas entry (`hamletVersion`, defaulting to the current one for new ground); placement (`hamletSection`) and identity (`hamletIdentity`) keep their `v1` hash keys so towns stay in the same sections with the same names. Version 2 builds each building on a 5x5 lot (rows `cy-5..cy-1`, door at the centre of the south edge onto the square) with `buildMixed`: `HAMLET_ARCHITECTURE.byKind` lists the families a town kind favours, and each building picks one. Shelter families (`timber`, `masonry`, `ruinedGatehouse`, `cyberRelay`, `alienGeometric`, `biomechanical`) produce `shack` objects (family, facadeStyle, roofProfile, `shackWall`/`shackDoor`/`shackInterior` tiles with `shelterFamily`), drawn by the existing shelter renderer. District styles (`city`, `arcology`, `cloister`, `fortress`) produce `architecturalBuilding` objects with district floor and wall tiles. Shapes are rect, lshape (optionally mirrored), cross, diamond and oval. Environmental scenery (trees, rocks) under a new building is left in place on purpose: trees growing through town halls read as part of the world.

**BOUNDARY:** Version 1 towns (atlas `hamletVersion: 1`, release 111) keep their plain huts. Town buildings carry no shelter hazards, surprises or loot. Courtyard, H-shape and twin-pod shapes are left out because they don't read on a 5x5 lot. Not checked on a phone.

## Hamlets and skirmishes (release 111)

**CODE:** `src/settlements.ts` adds procedural towns. `HAMLET` holds the placement numbers (2x2-section blocks, `chance` 0.65 that a block nominates one section, `minDepth` 2, a 15x11 square, `clearRadius` 10) and `HAMLET_KINDS` the four kinds (Hamlet, Village, Outpost, Market Town: huts, villagers, wardens, trader). `hamletSection(seed, rx, ry)` decides the nomination; `applyHamlet(map, seed, rx, ry)` runs after the landscape pass, finds the flat dry patch nearest the section centre (`hamletSite`; ruin rubble is cleared, small sites such as caches and arrays are shifted aside, water, elevation changes and major sites refuse it) and lays a `refuge` square, two or three `architecturalBuilding` huts, a Wayglass checkpoint, a `shelterMerchant` trader and `villager` objects (speak lines; wardens carry `guard`). It sets `map.settlement` with `procedural`, `x`, `y`, `radius`, which `settlementSanctuary` uses for the safe zone. Adoption is pinned per atlas entry with `hamletVersion` exactly like `landscapeVersion`: only sections first seen at release 111 or later can hold a hamlet. In a sample 19x19 area about one section in 11 to 22 holds one. `src/skirmishes.ts` adds rare faction battles: `skirmishPlan` (7% of sections at depth 3+, a quarter of those war-band clashes with larger sides) picks a matchup from `SKIRMISH_MATCHUPS` (mites vs ashlings, brute vs hounds, moths vs wisps, stalkers vs mites, and hamlet wardens vs watchers, overseers or brutes). `addSkirmish` places both sides on level ground connected to the centre; `updateSkirmisher` drives unprovoked units at the nearest foe with simple steering. A player hit (detected as hp lost outside the skirmish) provokes the unit and its kin within four tiles back onto their normal AI; wardens (`militia`, `MILITIA` stats, no rewards) turn hostile only individually and keep fighting creatures that turned on the player. Kills between factions grant nothing. When a side is wiped out the battle is settled in `save.worldFlags[plan.id]` and journaled; creature victors become ordinary foes. A creature that cannot reach a foe for six seconds leaves the fight.

**BOUNDARY:** No save schema change (atlas entries and world flags are free-form). Sections explored before release 111 never gain a hamlet. Hamlet villagers are not consequence-tracked residents: they cannot be harmed, have no persistence, and only speak; the trader uses the shelter-merchant stock. Skirmishes are not persistent wars between sections, do not move between sections, and reset if the player leaves before one side falls. Not built: hamlet quests, inns or rest beds, roads between towns, wayfinding cues to towns. Balance and pacing were checked in simulation only, not on a phone.
## The Arcanum and both capstones (release 109)

**CODE:** In `src/constellation.ts`, capstones are no longer exclusive (Tim, 2026-10-16). `chooseCap` lets a mastered branch (modifier taken, active at max rank) take its first capstone into `constellation.caps` and the other into `constellation.caps2`, 2 points each. `ensureConstellation` normalises `caps2` (a valid id, different from `caps[branch]`, only beside a first capstone); this is additive at schema 14, and a learned Aerial Step claims a free slot. `pointsSpent` counts both maps, `hasNode` reads both, `branchCaps(save, branch)` lists them, and `respec` clears both. In `main.ts`, the Arcanum replaces the release-98 to 100 screens: `arcanumShell(tab, title, subtitle)` sets `panel.dataset.theme = "arcane"` (cleared by `pauseForOverlay` for every other screen) and draws the tabs. Per Tim's follow-up the same day ("one place"), spells, disciplines and capstones share one page. `openSkills(atShrine)` (tab "Spells & Constellation") starts with a Spells branch (`SPELLS` nodes with their glyph sockets; equip from the detail box), then one node path per constellation branch. `arcanumFocus` picks the node shown in the detail box, which offers Learn, Crown, or Bind to the Spell button (`magicSkills.selected`, for a learned active or Aerial Step); the bound branch gets `.bound`. The Pack keeps only a summary row with an Open the Arcanum button. `openGlyphs` uses socket rings (`arcanumSocket`) and glyph tiles with Set here, Effects and Inscribe. `openEchoes` shows notch gems and Echo cards. The Pack gains an Arcanum button. Styles: release 110 removed the Arcanum's own theme (Tim, 2026-10-16: "in line with the theme and the styling of the rest of the game"). `arcanumShell` builds a plain `h2`, intro `p` and a `.codex-tabs` row (current tab `aria-current`). The `.arc-*` rules at the end of `styles.css` only lay out grids, rows, sockets and tiles in the game's existing colours, font and buttons. New Arcanum UI should keep to that.

**BOUNDARY:** No rule changes beyond capstones: glyph socket counts, spell sockets, Echo notches and a single Spell-button binding are unchanged. The Pack's older spell list and discipline rows were removed in favour of the Arcanum. Visual check at 390 px in Chromium only, not on a phone.

## Underwater grottoes, currents and the Elder Wyrm (release 108)

**CODE:** `src/grottoes.ts` is dive generator 2. `GROTTO_THEMES` (drownedChapel, kelpCathedral, pearlTrench, sunkenSettlement) give each theme a floor and wall tile kind, a beast table and lore; `GROTTO` holds the balance (34x32 map, `currentSpeed` 1.1, two current stretches of four path tiles, 3-4 beasts, `chamberRadius` 4.4). `generateGrotto(seed, id)` (theme from `grottoTheme`) carves a meandering climb to a lair, side chambers and the lair chamber. It places air pockets every `DIVE.maxPocketGap - 1` path tiles plus one at the lair mouth, then `seaCurrent` tiles carrying `current: {dx, dy}` against the direction of travel, never on or beside a pocket. Objects: the surface line, a lore `ruinMarker`, and a `grotto-cache` chest above the lair. `map.seaSpawns` lists the beasts and one `elderWyrm`. The dive generator is pinned per history: `Game.diveAction` sets `history.diveGenerator ??= visits > 0 ? 1 : DIVE_GENERATOR` before counting the visit, and `generatePinnedDungeon` builds the release-107 `generateDiveSite` (fingerprinted unchanged in `tests/grottoes.test.ts`) for generator 1 or a missing pin, else `generateGrotto`. `loadArea` spawns `map.seaSpawns` for underwater maps the same way as overworld sea creatures. In `update`, a current under the diver pushes them by `currentSpeed` (not during a dodge, only onto an open footprint). In `src/sea-creatures.ts`, the `grotto` habitat covers the scene's floor kinds. It adds `grottoEel` (line), `angler` (ambush, with a lure the renderer always draws), `abyssalBeast` (sine) and `elderWyrm` (`wyrm` pattern: weave with bites, draw back when too close, a `line` telegraph, a straight lunge, then rest; 12 segments, size 1.5, boss and leviathan, so `leviathanTrophy` pays once). Renderer: textures for the theme floors and walls and `seaCurrent`, with animated current streaks. `main.ts`: bestiary entries.

**BOUNDARY:** W6 of `docs/water-world-design.md`, the last stage of the water plan. Not built: hidden vertical routes, drowned settlements as places with people, beasts attacking the skiff from below a grotto, and multi-level grottoes. Grotto beasts never leave the grotto floor. Balance checked in tests only, not on a phone.

## Diving: the Bathysal Lens, dive rig and Sunken Reach (release 107)

**CODE:** `src/diving.ts` is data plus pure rules. `DIVE` holds the balance: rig 80 currency + 2 cinder iron, `breath` 20 s, `refillPerSecond` 12 within `pocketRadius` 1.3, `drownDamagePerSecond` 8, `speed` .8, dive sites in sections with 60+ deep-ocean tiles about one in `siteEvery` 3, `maxPocketGap` 9. `capabilities.dive` becomes true once `worldFlags.bathysalLens` (`grantLens`, the first island landmark inspected, intercepted in `Game.interact` before `applyInteraction`) and `worldFlags.diveRig` (`buyRig`, the Shipwright's `buyRig` action, which needs a skiff) are both set; no schema change. `diveSite(map, seed, rx, ry)` (landscape version 2+) is a runtime object that `loadArea` adds like the moored skiff; `validActions` returns `diveSiteActions` (`dive` or `inspect`), `surface` for `diveExit` and nothing for `airPocket`. `Game.diveAction` sets `session.dungeonReturn` to the buoy and `activeDungeonId = dive:<seed>:<rx>:<ry>`, then loads the dungeon area; `generatePinnedDungeon` routes `dive:` ids to `generateDiveSite`. That builds a bounded `arena` map (so dungeon completion, discovery, packs and hazards are skipped) with `underwater: true` and `landscape.biome` `underwater`: a winding corridor carved up from the entry, side chambers, kelp, `airPocket` objects on `airVent` tiles no more than `maxPocketGap` path tiles apart, a `chest` (`rewardSource` dive-cache) at the far end and a `diveExit` surface line at the entry. In `update`, `breathe(session, dt, atPocket)` drains or refills `session.breath` and returns drowning damage; movement uses `DIVE.speed`. Surfacing is `leaveDungeon` (the skiff's `aboard` flag survives, so the Wayfarer comes up aboard). In `installTraversalSafety`, a death under water returns the diver to the buoy with fresh breath instead of re-entering below; `recoverFromDeath` does the same for direct callers. The HUD shows `air Ns`; the renderer adds the underwater wash and light shafts, buoys, bubble columns, the surface line and seabed textures.

**BOUNDARY:** W5 of `docs/water-world-design.md`. One dive scene layout family, with no creatures below yet; currents, underwater beasts, Elder Wyrms and the themed grottoes are W6. Whether the sunken cache refills between dives follows the ordinary dungeon area-snapshot rules; it was not tuned. Balance checked in tests only, not on a phone.

## Leviathans (release 106)

**CODE:** In `src/sea-creatures.ts`, five `leviathan: true` entries join `SEA_CREATURES` (habitat `deep` = ocean/deepOcean; `size` 2.2-3 scales body, radius and segment spacing; all but the Greywhale are `boss`), plus the summon-only `tentacle`. `seaSpawns` adds at most one leviathan per section with at least `SEA_SPAWNS.leviathanTiles` (120) deep-ocean tiles 8+ from the plaza, about one in `leviathanEvery` (4), from the weighted `leviathans` table. `updateSeaCreature` hands leviathans and tentacles to `updateLeviathan`. The patterns are: `whale` (calm drift; once struck, a big `shadow` telegraph then a breach that hurts and pushes with a negative `pull`); `lunge` (hidden stalk with its own shadow, a `line` telegraph, a straight strike, then an `exposed` targetable window); `reef` and `storm` (`rings` telegraph, then `w.summon("tentacle")` in the marked water, capped by `maxTentacles` using `w.tentacles`; the storm also calls `w.ink` every `inkEvery`); `grab` (`mark`, then `hold` with a per-frame `pull` toward the body and bites, broken by `breakAt` damage); `tentacle` (`slam` ring before each hit, `life` 3.6 s, dies with its owner via `w.ownerDead`). `Game` supplies `tentacles`, `summon` (rewardless `summonedBy` combatants pushed after the enemy loop; the existing cleanup removes dead summons), `ownerDead` and `ink` (`game.inkUntil`; the renderer darkens the sea beyond a small circle). `leviathanTrophy` (in `defeatEnemy`) pays `LEVIATHAN_TROPHY` once per kind (`worldFlags["leviathan:<kind>"]`) with a journal entry and a defeat notice. The renderer draws kraken mantles, tentacle columns and the new telegraphs; `main.ts` adds bestiary entries.

**BOUNDARY:** W4 of `docs/water-world-design.md`. Leviathans use the sea-creature runtime rather than elite contracts: there are no elite modules, no contract states and no Echoes. Tentacles rise only in deep water. There is no capsizing beyond hull damage. Balance checked in tests only, not on a phone.

## Surface sea creatures (release 105)

**CODE:** `src/sea-creatures.ts` is data plus pure rules. `SEA_CREATURES` (6) carries each creature's habitat (`SEA_HABITATS.open` ocean/deepOcean/lakeWater, `swamp` swampWater/mireWater/toxicMire/toxicWater), `pattern` (line, orbit, sine, leap, hop, ambush), stats, XP, timings and colours; `SEA_SPAWNS` the spawn table (at least 30 habitat tiles 6+ from the plaza, 1-3 per habitat per section; lakes only Lanceeel and Breachfin). `seaSpawns(map, seed, rx, ry)` is deterministic and returns nothing for landscape version 1 maps. `Game.loadArea` appends them to `enemies` as ordinary combatants (base `ashling`, then `seaCombatantFields`: `seaKind`, stats, `segments`, `sea` state) so attacks, `untargetable`/`hidden`, defeat, marks and XP (`SEA_CREATURES[kind].xp` in `defeatEnemy`) work unchanged; they are skipped by `relocateIfStranded`. In the enemy loop a `seaKind` enemy bypasses `updateEnemyAI` and calls `updateSeaCreature(e, seaWorld, dt)`; `seaWorld` supplies `water(habitat, x, y)` (tile under the footprint), `hurt` (invulnerability window, guard and damage reduction) and `pull` (Bog Lurker drag, only onto an open footprint). Hits aboard reach the hull through the release-104 `hpStart` share. Every strike has a telegraph set on the frame it starts (`e.seaTele`: line, shadow, coil, jaw, bubbles); submerged creatures are hidden and untargetable, and the Breachfin is targetable only while aloft. `renderer.ts` `drawSeaCreature` draws ripples, telegraphs and segmented bodies; `main.ts` adds bestiary entries. `loadArea` no longer relocates a Wayfarer who is aboard on sailable water (resume fix for release 104).

**BOUNDARY:** W3 of `docs/water-world-design.md`. No leviathans (W4), no lantern to reveal submerged creatures, no Echoes for sea creatures; they never leave habitat water, and land enemies still treat water as blocked. Sea creatures respawn with the section like other overworld creatures. Balance checked in tests only, not on a phone.

## The Skiff: docks, Shipwright and sailing (release 104)

**CODE:** `src/boats.ts` is data plus pure rules. `BOAT` holds the balance (price 120 currency + 2 cinder iron, `maxHull` 60, `speed` 1.4, `turn` momentum 3.2, `hullShare` .5, `repairCostPerPoint` .5, `sunkHull` .4, `waterKinds` ocean/deepOcean/lakeWater/swampWater/shallows, `dockMinWater` 40, `dockEvery` 3). `save.boat = {version, owned, hull, aboard, moored, home}` (additive at schema 14, `ensureBoatState` in `freshSave`/`migrateSave`; it mutates in place so callers keep one object). `LANDSCAPE_VERSION` is 3: `applyLandscape` calls `placeDock` last for version 3 sections only (versions 1 and 2 are fingerprinted byte-identical in `tests/boats.test.ts`); a dock is a `shipwright` object on a reachable shore tile, two `dock` plank tiles and a `berth` three tiles out. `validActions` returns `shipwrightActions` (`speak`/`buySkiff`, then `board`/`repair`) and `board` for a moored `skiff`. `Game.boatAction` handles both object kinds (buy requires `capabilities.swim`). In `Game.update`, `sailing` (overworld and `aboard`) uses `BOAT.speed`, eases `p.sailVx/sailVy` with `steer` (a dodge sets them directly), skips hazards, swimming and stamina drain, and calls `Game.sail`: `footprintSailable` decides open water; pushing at walkable dry ground half a tile ahead (`ashoreAt`) disembarks, moors the skiff on the tile under the Wayfarer and adds a `skiff-moored` object. A skiff found under dry ground (section edge or resume) goes back to `home`. Damage aboard: `hpStart` is taken at the top of `update` and, before the death check, `hullAbsorb` gives the hull its share; at zero the skiff sinks to `home` with 40% hull. `loadArea` re-adds the moored skiff in its section. Render: `drawSkiff` under the Wayfarer and at moorings, the `shipwright` sprite and a `dock` plank texture.

**BOUNDARY:** W2 of `docs/water-world-design.md`. No sea creatures yet (W3), so the hull only takes damage from existing threats; no upgrades (reinforced hull, harpoon, lantern, sail). Deep-sea sections keep their walkable shallows corridors; docks did not replace them. Rivers and blight water cannot be sailed. Sections first seen at landscape version 2 get no dock. Balance checked in tests only, not on a phone.

## Waterbodies: seas, isles, lakes, swamps and blight mires (release 103)

**CODE:** `src/landscape.ts` `LANDSCAPE_VERSION` is 2; `applyLandscape(map, seed, rx, ry, { version })` and `biomeFor(seed, rx, ry, version)` keep the version-1 path byte-identical (fingerprint in `tests/waterbodies.test.ts`). `Game.loadArea` passes the atlas pin (`landscapeVersion`, else current); sections explored before landscapes still get none. `WATERBODIES` holds the balance: `seaLevel` bends the v1 ocean field by a `continent` field (1/1100) so seas span many sections, `island` lift raises land back out of the sea, `deep` marks `deepOcean` (biome `sea`); a `lake` field makes `lakeWater` with shallows rims; a `wet` field makes swamps (`bogGround`, `mireWater`, `swampWater`) and above `blight` poison swamps (`toxicBog`, `toxicMire`, `toxicWater`). `DEEP_WATER` lists every lethal landscape water and feeds `LETHAL_KINDS`, `connectStranded` and the hazard lists in `game.ts`. `placeIslandLandmark` puts one landmark per `landmarkMacrocell` (5x5) of sea on an island tile the plaza cannot walk to; it runs after causeways. `src/water-traversal.ts`: the new waters join `TIDEMANTLE.swimKinds`, `drainMultiplier.deepOcean` 2 (`swimUpkeep(player, dt, kind)`, `game.swimKind`); `MIRE` holds mire slow (0.6, not while dodging) and rot (`rotPerSecond` 1.5, `maxRotFraction` .5). `save.rot` (additive at schema 14, `ensureRot` in `freshSave`/`migrateSave`) lowers the health ceiling (`healthCeiling`); `clearRot` runs on checkpoint activation and on recovery after a death. HUD shows `hp/ceiling (rot −N)`. Renderer: textures, bubbles and brinks for every new kind; atlas colours for the new biomes.

**BOUNDARY:** W1 of `docs/water-world-design.md` only: no boat, docks, sea creatures or diving. Deep-sea sections still keep walkable shallows corridors to their exits and plaza (the protected mask) until the Skiff and docks (W2) replace them. Enemies still treat water as blocked. Balance checked in tests only, not on a phone.

## Tidemantle surface swimming (release 102)

**CODE:** `src/water-traversal.ts` is data plus pure rules. `TIDEMANTLE` holds the balance (swim kinds `river`/`dungeonWater`/`ocean`, speed x0.55, stamina drain 3/s, exhausted damage 6/s, `minWaterTiles` 6, quest kinds `mireApostle`). The save already carried `capabilities.swim` (normalised in `freshSave`/`migrateSave`); `grantTidemantle` sets it true once and records the source in `worldFlags.tidemantle`. `Game.defeatEnemy` calls `tidemantleTrial(area, map, enemy)`: a guardian (boss, pack guardian, Hollow Marshal, objective guardian or final boss) in a dungeon with at least 6 water tiles, or a Mire Apostle elite/boss anywhere; the grant journals "The Tidemantle" and appends to the defeat notice. In `Game.update`, `swimsThrough(save, hazard)` clears the lethal hazard for swimmable kinds, sets `game.swimming`, scales speed and replaces stamina regeneration with `swimUpkeep`. Aerial Step expiring over swimmable water no longer relocates a Tidemantle holder.

**BOUNDARY:** Stage one only (`docs/design-decisions.md`, Traversal horizon — water): no submersion, breath, dive rig, Bathysal Lens, underwater regions or currents; `capabilities.dive` stays false. Lava, abyss, pits and canyons stay lethal, and without the Tidemantle the release-101 drowning rule is unchanged. No generator changed and no save schema bump; existing journeys gain the quest without regeneration. Enemies and pathfinding still treat water as blocked.

## Lethal falls, drowning, ramps, controls (release 101)

**CODE:** The release-97 brink guard is removed (operator 2026-10-14: falling must be able to kill): `footprintHazard` deaths and `fallDamage` (4+ levels fatal) apply to walking again; `brinkStop` remains only as an unused helper. `ocean` joins the lethal kinds in `footprintOpen(allowLethal)`, `footprintHazard`, `projectileTileOpen`, `LETHAL_KINDS` and `BRINK` (foam rim). `addRamps(map, w, h, key)` in landscape.ts marks lower tiles beside a +1 neighbour as `slope` (mountainTrail / chasmStair kinds), sampled about one in three with spacing 3 and at least one per map; it runs last in `applyLandscape` and after `ensureReturnable` in Underlands. Controls: `.action-diamond .jump` is the centre button; `#navCompass` lives in `#navCompassSlot` in the quick row. Leech rates raised; `glyphWorld.heal` pushes a `heal` visual (+N).

**BOUNDARY:** Ramps change tile slopes in already-explored landscape sections and v5 dungeons (deterministic regeneration); only one-level steps gain ramps.

## Aperture Constellation and Awakenings (release 100)

**CODE:** `src/constellation.ts`. `BRANCHES` (form, motion, veil, force, rift) give each branch an `active` (an `APERTURE_SKILLS` id; `rift-step` is new), a `mod` and two `caps`. State `save.constellation = {version, mods, caps, bonus}` (additive at schema 14); `ensureConstellation` runs on every load and reconciles: a learned Aerial Step claims the Motion capstone, and `bonus = max(bonus, spent - earned)` keeps pre-release learning. Points: `pointsEarned` = floor(aperture / `POINT_EVERY` 6); `learnRank`, `learnMod` and `chooseCap` enforce cost, order and exclusivity; `respec` (lumen dust, `respecCost`) is only offered through the shrine `attune` action (`validActions` and `applyInteraction` in interactions.ts; `openSkills(true)` in main.ts). Runtime hooks in Game: `riftStep` (from `activateApertureSkill`; charges and `tickRiftCharges`; never up a ledge or onto a hazard), `skillDurationScale`, `extraReduction` (in `characterStats`), `strikeAmplifier` (glyph world `damage`), `onConstellationDodge`, `onConstellationMelee`, `onConstellationKill`, `onSkillEnded`, `tickConstellation` (veil reactions by HP change, Sanctuary, Overflow). Awakenings: `awakenCheck` and `awaken` (`AWAKEN_COST` 6 lumen dust; upgrade cap plus a Resonance in sockets) set `item.awakened`; `primaryAttack` spawns a `crescent` projectile every third swing (pierce 6, melee glyphs); `fireSecondary` adds a ±12° fan.

**BOUNDARY:** The legacy `learnApertureSkill` (no points) remains for old callers and labs; the player UI uses the point-aware functions. Balance was tuned only in tests.

## Creature Echoes (release 99)

**CODE:** `src/echoes.ts`: `ECHOES` maps each `PACK_KINDS` creature to one Echo (name, `cost` 1-3, `trigger`, source `module`). `save.echoes = {version, owned, equipped}` (additive at schema 14, `ensureEchoState` in freshSave/migrateSave); `NOTCHES` = 3, `toggleEcho` enforces the budget. `echoDrop(save, enemy, guardian, n)` runs in `defeatEnemy` (guardian or boss: always, first copy; else `ECHO_DROP_CHANCE` 4%; never summons). Triggers: `echoEvent(game, "dodge"|"land"|"kill"|"hurt"|"spell"|"shot", now, data)` from the dodge input, `defeatEnemy`, `castSpell`, `fireSecondary`; `tickEchoes` (called after `tickGlyphs`) detects landing and hurt by state change, runs the Thunderhorn charge contact, Saint's Regard (facing cone slow) and Lantern Stillness, and ticks `game.echoPatches` (web, flesh, mortar). `pounceBonus` is applied in `primaryAttack`. Effects reuse the glyph world adapter (`blast`, `damage`, `nudge`, `arc`, `canStand`) and statuses (`glyphSlow`, `glyphBurn`, `hitStun`). UI: `openEchoes` (Pack); render: `drawEchoPatches`.

**BOUNDARY:** Echoes add triggered moves; they never replace dodge or jump (operator default 2026-10-14). Mirror Swap only targets grounded foes standing where the player can stand. Damage scales `6 + 1.5 x level`; tuned only in tests.

## Glyphs & Resonances (release 98)

**CODE:** `src/glyphs.ts` is data plus pure logic. `GLYPHS` (10) each carry per-host text and numbers for `melee` (primary), `tool` (secondary) and `spell`; `RESONANCES` (8) are glyph pairs in one host. Items: `normalizeSockets` gives primary/secondary items `glyphs[]` sized by `SOCKETS_BY_TIER` (1/2/2/3); spells use `save.spellGlyphs[spellId]` (2). Save state is additive at schema 14: `save.glyphs` (counts), `save.glyphDust`, `save.glyphCodex.{glyphs,resonances}`, one-time `glyphGrant`; `ensureGlyphState` runs in `freshSave` and `migrateSave`. `Game.glyphLoadout(host)` returns mods (damage, cooldown, range, radius, pierce) and records first-use resonances; `primaryAttack`, `fireSecondary` and `castSpell` apply the mods; `updateProjectiles`/`updateEffects` take `damageFor` and `onHit` callbacks; `glyphHit` applies on-hit rules through `Game.glyphWorld` (damage, heal, stamina, blast, arc, nudge). Echo uses `Game.glyphTimers` (melee strike via `primaryStrike`, tool shot) or a delayed spell effect (`fx.delay`). Burn and slow tick in `tickGlyphStatus` (slow scales `speedMultiplier`; freeze is `hitStun`). Drops: `glyphDrop` (guardians and bosses always, else about 12%); salvage adds `salvageDust`; `craftGlyph` costs `DUST_PER_GLYPH` (6) for found patterns. UI: `openGlyphs` in main.ts; Proving Ground lab `forge`.

**BOUNDARY:** Phase one of the itemization plan (operator-approved 2026-10-14): Creature Echoes (release 99) and Awakenings plus the Aperture constellation with lumen-dust respec at shrines (release 100) are not built yet. Balance was checked in tests and the Forge lab only, not on a phone.

## Level legibility, no trap pockets, brink guard (release 97)

**CODE:** `landscape-render.ts` `drawLevelMarks` gives every raised tile (`elev` 1-5) the same identity in every biome and dungeon: `LEVEL_WASH` (lighter per level), `LEVEL_TRIM` inset frame (bronze, teal, gold, violet, white) and `elev` carved notches on edge tiles and a sparse lattice; ground is plain. `levelName` feeds the HUD area label. `drawTraversalCues` adds +1 (cyan chevron, jumpable) and +2 (red cross, too high) markers within 3.5 tiles, hidden in unexplored fog. `drawHazardBrinks` draws a crumbling rim and inward shadow on every walkable edge beside `abyss`, `canyon`, `lava`, `river` or `dungeonWater` in any map; `renderer.ts` `fogTile` hatches unexplored dungeon space, and lethal tiles within 2.6 tiles of the player are always drawn.

**CODE:** `landscape.ts` `ensureReturnable(map, w, h, start)` raises each trap floor (reachable but unable to walk back to `start` under climb +1 / drop any) to one level below its lowest way out, until `trappedTiles` is empty. It runs last in `applyLandscape` (after volcano, bridges, slopes, causeways and summit) and after `unstrand` in Underlands themes. `Game` brink guard: a step whose grounded centre would enter a lethal tile, or a move that would be a fatal (4+) drop, is cancelled unless the player is dodging (or under Aerial Step); `brinkStop` sets `ledgeHint.kind = "brink"` (EDGE prompt) and a throttled message. `Game.unstick()` (Atlas button `#mapUnstick`): dungeon to `map.entry`; overworld to `nearestReturnable` toward the plaza; 30 s cooldown.

**BOUNDARY:** `ensureReturnable` changes tile heights in landscape sections and v5 dungeons that were already visited (only trap floors are raised); this is a deliberate fix, not gated on a version. Known gap: four inspect-only landmarks per 984 sampled sections sit on unreachable cells (glass landmarks, a castle battlement, a summit marker); pre-existing.

## Underlands, grotesques and the Relay Network (release 96)

**CODE:** `src/underlands.ts` is dungeon generator 5 (`generateExpeditionDungeon`). Six layout grammars (`LAYOUTS`: spine, hub, ring, cavern, crypt, descent) carve the floor plan on the v4 map contract (exit, chest, trap, `gateWarden` guardian), and about 45% of crossings get a bespoke environment from `UNDER_THEMES` (Sunless Chasm, Lava Bog, Underground River, Frozen Grotto, Bone Crypt, Fungal Hollow). Themes reuse the landscape technology: `map.landscape` with biome `underlands:<theme>`, tile `elev` with stairs along the critical path, lethal `abyss`/`lava`/`dungeonWater`, and `map.weather` (embers, drip, snow, spores) that the renderer draws in dungeons. `unstrand` bridges or flattens rescue routes and walls off any pocket, so every object, spawn and walkable tile stays reachable. Fall damage, elevation and the traversal cues (drop stripes, slope chevrons, the JUMP / TOO HIGH ledge marker and a throttled ledge hint) apply in any map with `landscape`.

**CODE:** Grotesques (`dungeonOnly: true`, never in overworld pools): Weeping Saint (moves only while the player faces away: `world.playerFacing`), Amalgam (flesh bloom ground effects, births Pallid Crawlers via `world.spawnMinion`, at most four), Hanged Choir, Gnawing Maw (`devourPull` uses `world.pull`). Sunderjaw is now dungeon-only too. `packVariant` never grafts a dungeon-only donor or a summon attack.

**CODE:** `src/relay-network.ts`: `relayNodeDecision` pins `history.relayNode` in `pinDungeonLayout` for about 35% of never-entered ordinary crossings (never the story dungeon or instances). `Game.loadArea` places a `relayNode` 2-5 tiles from the guardian. After the guardian falls it can be restored (restorative draught) or severed (two lumen dust); each answer journals the next `FRAGMENTS` line. At `RELAY_TARGET` (5) answers the network sets `relay.networkAnswered` and records `save.relayNetwork.coordinate` off the charted map. The objective line shows `Relays N/5` once a relay has been seen.

**BOUNDARY:** Generator 5 applies only to histories without a `generatorVersion`; existing 2/3/4 pins never regenerate. `FRAGMENTS` is draft narrative owned by the operator; mechanics never depend on its text. The coordinate is recorded but nothing is generated there yet. The `relay.networkAnswered` fact is shared with the hidden five-guardian chain, so whichever completes first takes the beat.

## Landscape Pack (release 94)

**CODE:** `src/landscape.ts` layers geography onto generated overworld sections (`applyLandscape`, called in `Game.loadArea` right after `generateRegion`). Biome fields are fbm value noise at global tile coordinates (`field.*`, thresholds `T`), so features line up across section borders; `biomeFor` classifies a section for the atlas. Tiles gain `elev` (0-5), optional `slope`, and `landscape`. Protected cells (exit corridors, plaza 13-19, objects/spawns + 1, structures, rivers/canyons, borders) stay at ground level. `ensureClimbable` lowers any walkable tile the player cannot climb to (climb at most one level, drop any); `connectStranded` carves causeways to objects/spawns on islands. Mountains add `buildVolcano` (lava tiles are fatal via `footprintHazard`; `Game` throws lava bombs every `map.volcano.period` s within 12 tiles) and `buildSkyBridges`; castles come from `castleSection` (one candidate per 7x7 macrocell) and `buildCastle`.

**CODE:** Movement: `moveAxis` asks `canStep` per sub-step: same level or slope always; the player climbs +1 only while jumping and may drop any height; other creatures need slopes; fliers and phasers ignore elevation. `Game` applies `fallDamage(drop)` after the player's move (1 none, 2 = 15% max HP, 3 = 40%, 4+ fatal). Rendering: `src/landscape-render.ts` paints cached textures per (kind, variant, size) and draws raised tops `elev * LIFT_PER_LEVEL` tiles up with cliff faces; `render()` lifts objects, creatures and the camera by `liftAt`.

**BOUNDARY:** Adoption is pinned in the atlas: a section first seen with release 94 gets `landscapeVersion`; an atlas entry without it (explored earlier) keeps its original terrain forever. Changing thresholds or generators changes pinned sections; bump `LANDSCAPE_VERSION` and gate new behaviour on it. Elevation does not affect attacks, projectiles or line of sight yet.

## Dungeon Monster Pack (release 92)

**CODE:** `src/monster-pack.ts` defines the pack as data. A creature is a composition of a body (`render` recipe, `form.scale`/segments, palette), a `movement` mode from `MOVEMENT_MODES` (walk, skitter, hover, fly, phase, burrow, blink), a `brain` from `BRAINS` (orbit, kite, artillery, flank, duelist, juggernaut, ambush), active `attacks` and `bossAttacks` from `ATTACK_MODULES`, and `stats` in the shared `[hp, damage, range]` shape. `composeMonster(baseId, overrides)` builds and validates new creatures (attack lists accept `{add, remove}`; a module that needs flying or burrowing is rejected on the wrong body). `packVariant` deterministically grafts one compatible borrowed attack onto about a fifth of individuals. `createCombatant` merges `packCombatantFields`, and `applyPackBossForm` applies the shared boss template (hp x3.4, damage x1.3, scale x1.35, faster cadence, `bossAttacks` unlocked at 66%/33%).

**CODE:** `updatePackMonster(e, world)` replaces `updateEnemyAI` for pack creatures; `Game.packWorld` supplies the adapter (collision, line of sight, damage, slow, ground effects, illusions). Ground effects live in `game.packEffects` (transient, not saved) and resolve in `tickPackEffects`; `jumpable` effects miss a jumping player, and `packHurt` applies the same guard, damage-reduction and invulnerability rules as ordinary hits. Burrowed, aloft and in-wall creatures set `untargetable`, which projectile, effect and melee damage paths skip. Saved pack creatures never resume mid-attack (`resetPackRuntime`). `src/monster-render.ts` draws the creatures, telegraphs (`pack.tele`) and effects.

**CODE:** Adoption is pinned per dungeon history (`history.monsterPack`, set beside `layoutVersion` in `pinDungeonLayout`): only never-entered histories adopt it. Adopted ordinary dungeons draw their guardian from `GUARDIAN_POOL` (`history.guardianKind`, flagged `packGuardian`) and re-run `populateDungeonEncounters(map,{monsterPack:true})` with the `pack-v1` kind namespace, `PACK_ECOLOGY_ADDITIONS` and `PACK_DENSITY`. Excluded: the canonical Missing Crossing dungeon, displacement, hunt-instance, elite-portal, aperture-annex and Proving Ground combat maps. `isCrossingGuardian(e)` is the single guardian test.

**CODE:** Overworld (release 93): `populateOverworldPack(map, seed, rx, ry, {safe})` runs in `Game.loadArea` for every overworld section except (0,0), with no history pin (operator decision: the overworld respawns). It converts a deterministic share of ordinary hostile spawns to `OVERWORLD_PACK_POOLS[dominant]` creatures and adds extra residents with stable ids `pack-overworld:<rx>:<ry>:<n>`, outside `settlementSanctuary` + 2. In the update loop pack creatures get `enforceSanctuary`, skip simulation while the player is inside the sanctuary, and `packWorld.hurt` refuses damage there.

**BOUNDARY:** Changing a creature or attack module changes encounters in histories that already adopted the pack; add new creatures or bump `MONSTER_PACK_VERSION` (and the `pack-v` namespaces) rather than repurposing existing ids. Balance was checked in simulation only; on-device feel is untested.

## Unified dungeon exploration contract

**CODE:** `src/dungeon-framework.ts` defines `infinite-corridor-dungeon/1.0.0`, six-tile discovery chunks, deterministic chunk adjacency, a stable topology hash, bounded discovery normalization, and size profiles. Production ordinary v4 dungeons use the namespace `ordinary-v4:{id}:{recipe}:{size}:v{variant}`. Complete topology is generated before play; discovery controls presentation and Atlas disclosure, so traversal order and frame timing never alter geometry.

**CODE:** New ordinary histories use generator version 4. Existing version-2 and version-3 histories continue through their original generators. Deep-v1 and deep-v2 maps retain their existing geometry namespaces and gain derived contract metadata. Temporary hunt and persistent world-threat arenas are classified as `bounded-arena` and deliberately do not use incremental discovery.

**CODE:** Dungeon discovery is durable state under each dungeon history, separated by stable level id. `Game.updateDungeonDiscovery` runs only when the player changes cards and reveals exactly the occupied card; neighboring N/S/E/W cards remain concealed until the Wayfarer crosses into them. The renderer and Dungeon Atlas suppress undiscovered tiles, objects, and enemies. Proving Ground reveal and teleport controls affect scratch state only, while its canvas uses production targeted Attack, Tool, and Act behavior.

Developer reference for inspecting, modifying, testing, and extending the Infinite Corridor
project. This is the working model that future changes should be checked against.

## 0. Provenance and status of this document

Historical record: the Change-Control evidence and adapter descriptions in this section and the reading ledger describe the original documentation operation, not requirements for new work.

- Created: 2026-09-20, in the personal Hermes session on Windows.
- Repository: `C:\AI-PROJECTS\infinite-corridor`, branch `main`, HEAD `5c721982a37335ab5b02c91f0e851b41454d8884`.
- Change-control status before creation: `ok:true`, projectId `8225aa1c-9d77-49ac-a8a9-f6b740f7d6f6`, no active operations, no blockers, 23 recorded drift entries (see section 27).
- Fresh checkpoint before creation: `40d8bf722b82f6c07d5c823996de054263e027b685c44bb78319de058d6e2ac7`, 42 observed files, `preexistingWorkPreserved:true`.
- This document is a new file. It was created as an explicitly reviewed new-file operation under ordinary version control after a fresh checkpoint. **Its creation was not a guarded adapter effect.** The guarded adapter documented in `brightline-release-manager/docs/GLOBAL_CHANGE_CONTROL.md` manages changes to existing ordinary public files and explicitly does not create files. Do not describe this file's creation, or any future creation of files, as a guarded effect.
- `.change-control/project.json` was not modified during this operation.
- No gameplay code was modified during this operation.
- Committed to `main` as `258c0df` with its own message, so the canonical guide is under version control. No push was performed.
- Related decision records: `docs/decisions/0001-field-guide-consistency-stewardship.md` records the field-guide stewardship protocol and the Consistency Steward review role that governs changes to this project.

## 1. Evidence labels and the reading ledger

### 1.1 Labels used throughout

| Label | Meaning |
| --- | --- |
| **CODE** | Verified by reading the source text during the pass named in the ledger. |
| **TEST** | A named automated check exists and passes. Internals of the check were not all re-read. |
| **INTENT** | Documented intent only. Not implemented in the code read. |
| **UNTRACED** | Not read, or read in an earlier pass whose text is no longer available to quote. |

A passing automated test is not evidence of on-device behaviour. A command that ran is not evidence of success unless the meaningful result is quoted. A claim without a citation is inference, and is marked as inference.

### 1.2 Final reading ledger

Text read verbatim during the two field-guide passes, with the span and what it grounds:

| Material | Span read | Status | What it grounds |
| --- | --- | --- | --- |
| `src/world.ts` | 1-40, 130-186 | CODE | Section size, edge and region namespaces, shelter families, environment rules, Wayglass demotion, settlement beacons, `wayfindingCues`, aperture thresholds, deep-v1 generator, ordinary dungeon generator |
| `src/world.ts` | 41-129 | UNTRACED | Shelter shape families, districts, collision constants |
| `src/arenas.ts` | 1-44 | CODE | Arena families and rules, eligibility, bespoke arena generation, reachability diagnostic, ecologies, active-enemy caps, dungeon population, varied dungeon grammars |
| `src/deep-dungeons.ts` | 121-197 | CODE | Multi-level deep dungeons, level id stability |
| `src/deep-dungeons.ts` | 1-120 | UNTRACED | Story package definitions, archetype tables, objectives, schema version |
| `src/combat.ts` | 1-7 (whole file) | CODE | Creature traits, creature forms, base stat table, `createCombatant`, `dodge`, dead `playerAttack` |
| `src/items.ts` | 1-16 (whole file) | CODE | Item table, tiers, ranged weapons, primary profiles, spells, item maths |
| `src/elites.ts` | 1-22 (whole file) | CODE | Elite definitions, variant derivation, threat maths, and the full mutation inventory |
| `src/input.ts` | 1-165 (whole file) | CODE | Keyboard map, latch semantics, touch drag, tap event, reset behaviour |
| `src/scenes.ts` | 1-22 (whole file) | CODE | Scene schema, definitions, lifecycle, playback budget, interruption recovery, aperture gate |
| `src/interactions.ts` | 56-79 | CODE | End of the dispatch chain, narrative gate |
| `src/interactions.ts` | 1-55 | UNTRACED | Head of the dispatch chain |
| `src/foundry.ts` | 46-57 | CODE | Domain encounter plan, boss completion, hunt instance lifecycle, codex records |
| `src/foundry.ts` | 1-45 | UNTRACED | Foundry candidate generation and validation |
| `src/renderer.ts` | 31-431 | CODE | Tile, actor, building, shelter rendering, `drawWaymarkIcon`, `waymark` rotation |
| `src/renderer.ts` | 1-30, 432-760 | UNTRACED | Remaining draw functions |
| `src/game.ts` | 1495-1580 | CODE | Dungeon spawn assembly, gate predator, encounter population call, combat profiles, final boss override |
| `src/game.ts` | 1667-1720 | CODE | Pause-time position recovery, pause clock handling, snapshot export |
| `src/game.ts` | 2516-2732 | CODE | Complete frame update loop, death and recovery, save write-back |
| `src/game.ts` | 41-1494, 1581-1666, 1721-2515 | UNTRACED | Constructor, systems installation, geometry helpers, interaction methods, attack methods |
| `src/main.ts` | 440-478 | CODE | Guidance target resolution and compass rendering |
| `src/main.ts` | remainder | UNTRACED | Read in an earlier pass only; quoted lines below are command-verified |
| `src/persistence.ts` | 3-36 | CODE | Database, slot keys, settings normalisation, validation, metadata, write coordination, journey operations |
| `src/types.ts` | `SAVE_VERSION` | CODE | Version constant |
| `index.html` | 1-185 (whole file) | CODE | Complete DOM surface and service worker boot |
| `docs/prototype-1-spec.md` | 1-144 (whole file) | CODE | Prototype scope, required tests, deferrals |
| `.change-control/project.json` | whole file | CODE | Component and interface declarations |
| `tests/prototype.test.ts` | 2464, 2981 | CODE | Elite scale ceiling, dungeon combat profile regressions |
| `brightline-release-manager/docs/GLOBAL_CHANGE_CONTROL.md` | 1-157 (whole file) | CODE | Change-control workflow and supported scope |

Honest gaps: `game.ts` is 2,732 lines and only 392 of them are quoted above. `main.ts` is 1,852 lines and only 39 are quoted. Where this guide makes a claim about those files outside the spans listed, the claim is marked inference or left out. Closing those gaps is the first task of any future pass that depends on them.

## 2. One-line model

Infinite Corridor is a deterministic, seed-driven, save-persistent solo exploration game: pure generation functions derive region, dungeon, and arena maps from a stored seed plus coordinates plus a generation version; one state object holds all durable progress; one `Game` class simulates and mutates it; a DOM and canvas layer presents it; and most durable identities are deterministic strings, with authored IDs, counters, snapshot keys, and the user-created journey seed as documented exceptions.

## 3. Architecture, dependencies, and runtime dataflow

### 3.1 Layers

| Layer | Modules | Notes |
| --- | --- | --- |
| Leaf, pure | `random.ts` | Seeded PRNG, `pick`, `hashSeed`. Three functions, no state. |
| Leaf, rules and tables | `combat.ts`, `items.ts`, `elites.ts` | Mixed. See section 5. |
| Generation | `world.ts`, `arenas.ts`, `deep-dungeons.ts` | Deterministic. See section 4 for the precise definition. |
| Generation plus save mutation | `story.ts`, `foundry.ts` | Mixed. See section 5.4. |
| Contracts and state | `types.ts`, `persistence.ts` | Schema, defaults, migration, storage. |
| Dispatch | `interactions.ts` | Resolves an interaction against the save and map. |
| Simulation | `game.ts` | 2,732 lines. Owns runtime state, mutates the save. |
| Presentation | `renderer.ts` (760 lines), `main.ts` (1,852 lines), `index.html` | Rendering, UI, input wiring. |
| Input | `input.ts` | 165 lines. |
| Scenes | `scenes.ts` | 22 lines. |

`world.ts:2-3` re-exports the deep-v2 generator from `deep-dungeons.ts` and the varied-dungeon and arena generators from `arenas.ts`, so `world.ts` acts as the generation facade.

### 3.2 Runtime order

1. Release 88 starts the versioned `main.js` import immediately and runs service-worker registration and its update check as best-effort background work. Registration or update failure warns but cannot block gameplay. A main-module failure displays a visible error and does not enter a reload loop.
2. `main.ts` loads or creates a journey through `persistence.loadSave()`, installs systems, and starts the frame loop (`main.ts:1535`).
3. Each frame: `input.update(dt)` then `game.update(dt, input, now)` (`game.ts:2516`), then render, then HUD and compass updates.
4. `game.update` returns immediately when `this.paused` is true (`game.ts:2517`). This is the mechanism behind the invariant that pause and backgrounding do not advance combat.
5. At the end of every update the live runtime is written back into the save: `position`, `hp`, `stamina`, `magicBuff`, `spellCooldown` (`game.ts:2720-2730`).
6. `main.ts:876` persists on a schedule: `persist = () => measured("persist", () => saveGame(game.exportSnapshot(performance.now())))`.
7. `game.exportSnapshot` (`game.ts:1702`) syncs, snapshots the area, and writes session fields including a `playerRuntime` block. When paused it stamps the pause start time as the clock.

## 4. Deterministic generation: precise definition

**Definition used in this guide.** A module is deterministic when it has no external save mutation and performs no I/O, and when it produces the same observable result for the same inputs. Deterministic modules **do** build and mutate internal map, tile, and object structures during generation; those internal operations are ordinary mutation on freshly created local data and are not a violation. What matters is that no input object is mutated, nothing is written to the save, and the same seed, coordinates, generation version, and content schema produce the same base result.

Deterministic under that definition: `random.ts`, `world.ts` generation functions, `arenas.ts` generation functions, `deep-dungeons.ts` generation functions, `items.ts`, and the pure half of `combat.ts` and `elites.ts`.

Explicitly **not** covered: save mutation performed by the same modules that also offer pure generation. `story.ts` and `foundry.ts` are the clearest cases; see section 6.

### 4.1 Namespaces

Generation identity is derived from explicit `rng` namespace strings. Namespaces verified in source include `region:g{gen}:{rx}:{ry}`, `region:0:0`, `edge:{axis}:{a}:{b}`, `supplies:v2:{rx}:{ry}`, `environment:*`, `weather:v1:g{gen}:{rx}:{ry}`, `wayglass-sparsity:v1:{rx}:{ry}` (`world.ts:6-25`, `:90`), `arena:v1:{id}` and `arena-cadence:{kind}:{rx}:{ry}` (`arenas.ts:10-11`), `encounters:v1:{identity}` (`arenas.ts:30`), `ordinary-v3:{id}` (`arenas.ts:44`), `deep-v2:archetype:g{gen}:{rx}:{ry}` (`deep-dungeons.ts:42`), `deep-story-v1:{id}` (`deep-dungeons.ts:52`), and `scene {seed}:{id}:{encounter}:{definitionVersion}` (`scenes.ts:14`).

Changing the algorithm behind a namespace while keeping the namespace string silently rewrites every existing world. Bump the version segment instead.

### 4.2 Identity classes

1. **Procedural and seed-derived.** Regions, dungeons, arenas, domains, elite variants, story packages, cues, and weather.
2. **Fixed authored IDs.** `tree-1`, `rock-1`, `shrine-1`, `door-ruin`, `dungeon-gate`, `vendor-vela`, `cache-1`, `world-boss` (`world.ts:11`), `dungeon-exit`, `dungeon-chest`, `vault-cache`, `relay-terminal`, `cistern-vine`, `kiln-vent`, `crossing-spikes`, `knife-choir-portal`, `deep-v1-exit`, `deep-v1-final-gate`, `deep-v1-miniboss-{west,east,south}`, `deep-v1-final-boss`, `deep-v1-final-arena` (`world.ts:179-185`), and the arena object IDs `arena-exit` and `arena-recovery` (`arenas.ts:11`).
3. **Counters and snapshot keys.** `waves`, `sequence`, `visits`, `attempts`, `abandoned`, `discoveredLevelIds`, and the timestamped recovery keys `recovery:{slot}:{1,2}` (`persistence.ts:34`) and the legacy `damaged:{slot}:{timestamp}` form. These are deliberately not seed-derived.
4. **Stored user-created journey seeds.** `createJourney` with a blank seed produces a generated name of the form `CORRIDOR-{Date.now().toString(36).toUpperCase()}`, which is non-deterministic at creation and then persisted as the deterministic root for everything else.

Qualified statement for this guide: generation output is a pure function of the stored seed, generation version, coordinates, and content schema; not every identifier in a save is seed-derived.

### 4.3 Coordinate spaces

These are separate spaces. No code converts a dungeon tile into an overworld section, and no scale contract asserts equivalence.

| Space | Extent | Source |
| --- | --- | --- |
| Overworld section | 32 by 32 | `world.ts:5` (`SECTION_SIZE = 32`) |
| Legacy ordinary v2 | 24 by 24 | `world.ts` |
| Varied ordinary v3 | 28 by 28 | `arenas.ts` |
| Unified ordinary v4 | 34, 40, or 46 square | `arenas.ts`, compact/standard/extended profiles |
| Bespoke arena | 36 by 30 | `arenas.ts:11` |
| Deep v1 (Threefold Deep) | 64 by 64 | `world.ts:173` |
| Perception overlay | default 24 | `world.ts:169` |
| Aperture encounter spawns | default 32 | `world.ts:166` |

Overworld transitions test against `SECTION_SIZE` using the player's full collision footprint (`game.ts:2569-2591`): west when `nx < 0`, east when `nx + 0.76 >= SECTION_SIZE - 0.02` and the player's row is within 1.45 of `exits.east`, north when `ny < 0`, south when `ny + 0.88 >= SECTION_SIZE - 0.02` and the player's column is within 1.45 of `exits.south`. Each exit must be matched positionally or the player is bumped rather than transferred.

Dungeon interiors are bridged back to the overworld only by the entry object and the stored return point.

## 5. Purity and mutation map

### 5.1 `combat.ts` (7 lines total)

| Element | Classification |
| --- | --- |
| `CREATURE_TRAITS` (`:2`), `CREATURE_FORMS` (`:3`) | Pure tables |
| `enemyBodyRadius` (`:4`) | Pure calculation |
| `createCombatant` (`:5`) | Constructor. Builds a fresh object, mutates no input, deterministic. Reads `eliteVariant("combat", kind)` from `elites.ts` |
| `dodge` (`:6`) | **State-mutating.** Writes `player.dodgeX/dodgeY`, `lastMoveVector`, decrements `stamina` by 15, sets `invulnerableUntil` and `dodgeUntil` |
| `playerAttack` (`:7`) | **State-mutating and dead.** Writes `player.attackReadyAt` and enemy hp. Imported at `game.ts:28`, never called anywhere in `src/` or `tests/` |

`createCombatant` has **no** `gateRevenant` entry in its base stat table. Fifteen kinds are defined: `ashling`, `glassMite`, `sparkWarden`, `ashenHound`, `veilMoth`, `rootBrute`, `coilStalker`, `cinderWisp`, `voidSentinel`, `hollowMarshal`, `riftColossus`, `vesperwing`, `gravitantBell`, `mireApostle`, `knifeChoir`. `CREATURE_FORMS` does include `gateRevenant` with scale 1.85 and 8 tentacles. Because the table lookup falls back with `defs[kind] || defs.ashling`, an unmodified `gateRevenant` construction yields the ashling base of 24 HP, 5 damage, 0 range with the revenant's silhouette. See section 9.3.

### 5.2 `items.ts` (16 lines total)

All exports are pure derivations or constructors. There is no save mutation, no I/O, and no mutation of any input object.

| Element | Classification |
| --- | --- |
| `ITEM_TABLE` (`:2`), `ITEM_TIERS` (`:3`), `RANGED_WEAPONS` (`:4`), `PRIMARY_PROFILES` (`:5`), `SPELLS` (`:6`) | Pure tables |
| `primaryProfile` (`:7`), `rangedWeapon` (`:8`), `itemTier` (`:9`), `affixValue` (`:10`), `itemScore` (`:11`), `describeAffixes` (`:12`), `compareItemStats` (`:13`) | Pure calculations |
| `rollAffixes` (`:14`, internal) | Pure. Builds a new array from a passed PRNG |
| `generateItem` (`:15`) | Pure function of seed and level |
| `isValidItem` (`:16`) | Pure validation |

**Divergence to flag.** The correction that grouped `combat.ts`, `items.ts`, and `elites.ts` together implied all three contain state-mutating functions. For `items.ts` that is not the case: the separation finds zero mutators. This guide records the audit result, which is that `items.ts` is wholly pure. If a future change adds an inventory or equip mutation to this file, that is the point at which this row stops being true.

### 5.3 `elites.ts` (22 lines total)

Pure half:

| Element | Classification |
| --- | --- |
| `ELITE_DEFINITIONS` (`:2-7`), `ELITE_KINDS` (`:8`) | Pure tables. Four elites: `vesperwing`, `gravitantBell`, `mireApostle`, `knifeChoir` |
| `eliteDefinition` (`:9`), `eliteVariant` (`:10`) | Pure derivation from `hashSeed` |
| `eliteThreat` (`:11`) | Pure calculation |
| `freshEliteState` (`:12`) | Pure constructor |

State-mutating half, which is the majority of the file:

| Function | Mutation performed |
| --- | --- |
| `ensureEliteState` (`:13`) | Writes `save.elites`, merging contracts, defeated, encounters, status |
| `acceptContract` (`:14`) | Sets `contracts[id].state = "accepted"`; enforces the `knifeChoir` prerequisite `progress >= goal` |
| `recordPortalPrey` (`:15`) | Increments `contracts.knifeChoir.progress`; promotes `state` from `locked` to `available` at goal |
| `applyPoison` (`:16`) | Mutates a passed status object: `poison`, `poisonTick` |
| `tickEliteStatus` (`:17`) | Mutates status each frame and invokes `onDamage(2)` while poisoned |
| `cleansePoison` (`:18`) | Decrements `save.consumables.clearrootAmpoule`; zeroes the status poison fields |
| `gravityPull` (`:19`) | Displaces the player: writes `player.x` and `player.y` |
| `addEliteHazard` (`:20`) | Mutates the hazards array, evicting the oldest of the same owner and kind at a cap of 8 |
| `tickEliteHazards` (`:21`) | Decrements hazard life and filters the array |
| `completeElite` (`:22`) | Sets `defeated[id]`, transitions the contract to `rewardAvailable` then `resolved` with `rewarded:true`, adds `save.currency`, increments `save.materials[reward.material]`, increments `save.consumables[reward.consumable]` when one exists |

So the correction's list holds: this file mutates contracts, poison, hazards, prerequisites, rewards, materials, consumables, and currency. It also mutates player position through `gravityPull`, which the correction did not name, and which is worth knowing because displacement is usually discussed as world geometry rather than as elite behaviour.

### 5.4 `story.ts` and `foundry.ts`

Both are mixed and must not be described as pure generation modules.

`foundry.ts` mutation, verified in the tail: `completeDomainBoss` writes `save.materials` and `save.currency` (`:47`), `manifestationMechanics` is a pure calculation, `ensureHuntInstance` writes `save.viewport.instances` (`:51`), `beginHuntInstance` writes `save.session.areas` plus `attempts` and the return point (`:52`), `abandonHuntInstance` increments `abandoned` (`:53`), `completeHuntInstance` writes `completed`, `status`, `scar`, and the reward claim (`:54`), `cleanupHuntInstance` deletes session areas prefixed with the instance id and clears `activeDungeonId` when it matched (`:55`), and `recordPeoplePlace` writes `save.codex.peoplePlaces` (`:57`). The pure half covers candidate generation, validation, and the manifestation calculation.

`story.ts` (15 lines total, read in an earlier pass) contains both story site lookup and save-mutating progression, reward, and stewardship functions. Treat the same way: separate the pure site resolution from the functions that write narrative facts, leads, rewards, and stewardship output.

### 5.5 Why `fresh*` and `ensure*` functions are not full integration

`fresh*` and `ensure*` functions establish default creation and migration normalisation. That is not the same as a subsystem being wired into persistence. A subsystem counts as fully integrated only when all six of these are true, and each must be evidenced separately:

1. Default creation: a `fresh*` constructor exists.
2. Migration normalisation: an `ensure*` function merges old shapes forward without erasing unknown fields.
3. Mutation: a real code path writes the subsystem's state.
4. Runtime invocation: that path is actually called from the frame update, the load path, or an interaction, not merely defined.
5. Presentation: the state reaches the player through a UI or rendering surface where the design says it should.
6. Idempotence and tests: repeated application cannot duplicate a one-time reward or reverse a completed choice, and at least one named test covers it.

## 6. Saves, slots, and migrations

### 6.1 Storage

| Item | Value | Source |
| --- | --- | --- |
| Database | `infinite-corridor`, version 1 | `persistence.ts:3`, `:18` |
| Object store | `saves` | `persistence.ts:3` |
| Slot count | 3 | `persistence.ts:3` |
| Slot key | `journey:{1..3}` | `persistence.ts:6` |
| Active slot key | `infinite-corridor:active-slot-v1` | `persistence.ts:4` |
| Settings key | `infinite-corridor:settings-v1` | `persistence.ts:4` |
| Legacy mirror | `infinite-corridor:active-v2` | `persistence.ts:4` |
| Per-slot mirror | `infinite-corridor:slot-mirror:{slot}` | `persistence.ts:5` |
| Recovery snapshots | `recovery:{slot}:1`, `recovery:{slot}:2` | `persistence.ts:34` |

Saves are written to IndexedDB and mirrored to `localStorage` on every write. Loading takes the newest healthy candidate from either source and falls back to `freshSave()` (`persistence.ts:27`). Writes are serialised through `createSlotWriteCoordinator`, which batches queued slots per microtask and swallows chain errors so one failure cannot wedge later writes (`persistence.ts:28-31`). `flushSaves` is awaited before slot switching, deletion, and export.

### 6.2 Validation and metadata

`validateJourney` deep-clones the raw value, runs `migrateSave`, and requires `seed`, `position`, and a finite numeric `level`; it returns `healthy` or `damaged` with the error string (`persistence.ts:16`). `journeyMetadata` produces the slot card data: name, seed, level, location (dungeon or `rx, ry`), `updatedAt`, explored-section count, and byte size (`persistence.ts:17`).

### 6.3 Journey operations

`createJourney` refuses an occupied IndexedDB or mirror slot unless `replace` is set, and snapshots the previous save before replacing. Creation and switching are guarded by a single-flight operation gate. `commitNewJourneyTransition` flushes an existing prior journey, durably creates the target, and changes the active-slot key only after creation succeeds; it deliberately skips persisting the placeholder runtime when the already-active target is genuinely empty. `renameJourney` refuses damaged saves and truncates names to 40 characters. New Journey and Rename use in-panel forms rather than native browser prompts. Occupied replacement requires a dedicated confirmation checkbox. Duplicate, export, import, recover, and delete remain slot-card actions; delete requires two confirmations and leaves a recovery snapshot. Import into an occupied slot keeps the healthy previous save as a recovery snapshot.

### 6.4 Schema versioning rule

Schema versions should be incremented when **durable state changes**. The current runtime authority is `src/types.ts` `SAVE_VERSION = 14`; the current test suite covers schema-14 normalization and migration from version 12. Dungeon discovery is one persisted feature within this durable contract. A version bump is only acceptable when it ships with all of the following, and any bump missing one of them is a defect rather than a release step:

1. An explicit migration path from every previously supported version.
2. Tests covering each supported source version.
3. Exact-resume tests: load a save, resume, and assert the world and progress are identical rather than merely loadable.
4. Current contract-document updates. Historical policy also required `.change-control/project.json` interface versions; that disabled declaration is no longer a required update for new work.

Do not bump a version for refactors, renames, or internal shape changes that are invisible in persisted bytes. Conversely, do not ship a durable-state change without a bump, since the current constant is the only gate that decides which migration path a stored save takes.

### 6.5 Save contract

**VERIFIED IN CURRENT CODE / VERIFIED BY TEST:** `SAVE_VERSION` declares version 14. Migration normalizes existing histories to `{schema:1, levels:{}}` without changing stored area snapshots, generator versions, rewards, or character progression; current tests also cover migration from version 12.

**HISTORICAL CONTRACT ALIGNMENT:** `.change-control/project.json` declares the `local-save-schema` provider interface as `14.0.0`, matching runtime `SAVE_VERSION = 14`. Git history establishes this interface's direct-major convention (`8.0.0` for save version 8, `10.0.0` for 10, `12.0.0` for 12, and `13.0.0` for 13); it is a historical change-control integration declaration, not the runtime migration gate or a required update for new work. The project has no component requiring this interface, so the declaration change introduced no in-repository consumer migration.

## 7. Input flow

`input.ts` in full.

State fields: `x`, `y`, `attack`, `tool`, `spell`, `dodge`, `jump`, `interact`, `potion`, `menu`, `pause`, `map`, `journal`.

Keyboard map (`input.ts:42-56`): `j` attack, `q` tool, `r` tool, `f` spell, Space dodge, `k` jump, `e` interact, `h` potion, `p` pause, Escape pause, `m` map, `i` menu, `l` journal. Two keys map to `tool`, which is intentional redundancy, not a bug. Space and the arrow keys call `preventDefault`.

Edge semantics: `keydown` latches only when `!e.repeat` (`input.ts:72`); `update` copies the latch into state and clears it; `consume(key)` reads and clears. Actions are one-shot latches, so holding a key does not repeat an action and a single frame cannot double-fire.

Touch: the first pointer becomes the movement pointer; drag beyond 10 px marks movement; a release under 450 ms without movement dispatches a `worldtap` CustomEvent carrying `clientX`, `clientY`, and `pointerType` (`input.ts:95-113`). The drag vector uses radius 52, a deadzone clamped between 0 and 0.3, sensitivity clamped between 0.7 and 1.8, and a response curve of 1.2 (`input.ts:17-18`, `:83-84`). Note that `shapeStick` itself defaults to a curve of 2; the touch path passes 1.2.

On-screen actions: every `[data-action]` element latches its action on pointerdown (`input.ts:132-138`). `index.html` provides `pause`, `journal`, `map`, `menu`, `jump`, `spell`, `potion`, `tool`, `interact`, `dodge`, and `attack`, and `main.ts` additionally resolves some of these by id.

Reset: `blur` and a `visibilitychange` to hidden both clear keys, latch, pointers, and all state. This is the input half of the invariant that backgrounding cannot leave a stuck direction or a queued action.

## 8. Runtime frame and live combat flow

Verified against `game.ts:2516-2732`, with supporting spans at `game.ts:1495-1580` and `game.ts:1667-1720`.

Order of operations per frame:

1. Bail out when paused (`:2517`).
2. Decay timers: guard, magic buff, spell cooldown, reticle life (`:2519-2522`).
3. Normalise the movement vector; if it exceeds 0.15, store `save.lastAim` as the facing-relative aim direction (`:2523-2530`).
4. Consume actions in this order: tool (sets `toolMode` and fires the secondary with auto-aim via `selectRangedAim`, `:2531-2537`), spell (`:2538`), dodge (calls `dodge`, messages on insufficient stamina, `:2539-2542`), jump (520 ms window, `:2543-2546`), potion (`:2547`), foundry observation (`:2600-2609`), attack (`:2610-2614`), interact (`:2615-2619`).
5. Movement speed is 4.8 while dodging and 2.4 otherwise, both scaled by `characterStats(save).moveSpeed` (`:2553`). Dodge overrides the input vector with the stored dodge direction (`:2548-2552`).
6. Facing and `walkPhase` update only when the vector exceeds 0.15 on an axis (`:2558-2568`).
7. Overworld section transition checks run on the full footprint and return early on transfer (`:2569-2591`).
8. Terrain hazard check via `footprintHazard`. A canyon or water footprint sets hp to 0 and sets a cause-specific message (`:2593-2594`). Otherwise `moveAxis` resolves collision (`:2595`).
9. Inside a structure, a primed displacement trap within 0.55 tiles triggers `startDisplacement(trap, true)` and returns (`:2596-2598`).
10. Inside a structure, an armed shelter hazard within 0.6 tiles fires once: it records `shelter-hazard:{rx},{ry}:{id}`, marks the hazard spent, applies damage floored at 1, writes one journal record per hazard type, and syncs (`:2598`).
11. Foundry creatures within 5 tiles are recorded into `save.codex.foundry` once, with a `recordCreatureEncounter` call and an `UNCLASSIFIED LIFEFORM` notice (`:2600-2609`).
12. Projectiles update at `:2627`, capped at 32 inside dungeons and 64 in the overworld; effects update at `:2648`; elite status and elite hazards update at `:2659`; enemy simulation runs at `:2674`. That is the verified call order inside one frame.
13. Elite status ticks: poison deals 2 damage per second while active (`:2659`).
14. Elite behaviours run for active elites only: `gravity` winds up for 1.1 s, then pulls for 1.15 s at force 1.65 within radius 6, on a 7 s cooldown; `trail` and `oozePool` place hazards on a 3.5 s cooldown at a cap of 8; `summon` adds `glassMite` for `knifeChoir` and `ashling` otherwise, capped at 3 per summoner and 6 total, on an 8 s cooldown (`:2660`).
15. Rootbound domain enemies regenerate while undamaged for 3 s, at 2.4 per second for a domain boss and 1.1 otherwise, and place a root eruption hazard on a 4.5 s or 6.5 s cooldown at a cap of 3 (`:2661`).
16. Stamina regenerates at 9 per second up to the maximum (`:2662`).
17. Performance counters are recomputed, including a `updateBudgetViolations` counter that increments whenever `dt > 1/30` (`:2663`).
18. Enemy simulation runs for the active set only. Ambient enemies are throttled: an accumulator below 0.125 skips the enemy entirely as dormant, and otherwise simulation dt is clamped to 0.25 (`:2664-2668`).
19. Enemy contact damage applies when `updateEnemyAI` returns true, guarded by invulnerability, jump immunity, and sanctuary (`:2671-2686`).
20. Death handling when hp is at or below zero (`:2690-2719`).
21. Save write-back (`:2720-2730`).

AI structure, from the earlier pass and the pieces quoted: `ensureAI` (`game.ts:858`) gives every combatant an AI record; `alertEnemy` (`:872`) sets chase mode; chase uses direct movement when line of sight exists, and a bounded detour step with a 350 ms retry and a 3 s detour window when it does not (`:948-956`). Sanctuary enforcement pulls enemies back and suppresses their telegraph inside a settlement sanctuary (`:894`). Passive behaviours are separated by the `passiveBehavior` flag (`:908`). Enemy simulation gating in the overworld requires aggro, boss status, elite status, world-boss status, gate-predator status, an active telegraph, strike, windup, or a summoner (`:971-974`).

Death and recovery (`:2690-2719`): captures the last death with the cause (`combat` or a terrain kind), abandons the active dungeon and any hunt instance, increments the deaths counter, clears displacement state, floors restorative draughts at 2, restores hp and stamina, clears attack, dodge, and melee timers, clears projectiles, effects, and elite hazards, resets elite status with a 2 s stun guard, resets input, reloads the overworld at the active checkpoint, and grants 2 s of invulnerability. The player keeps all items, marks, equipment, and XP. The message names the checkpoint and states what was not lost.

## 9. Combat, items, and elites

### 9.1 Item and weapon tables

Ranged weapons (`items.ts:4`): Spark Coil (8 damage, speed 12, 1.6 s, straight), Lumen Spindle (11, speed 10, 1.8 s, boomerang with a turn at 0.8), Needle Caster (10, speed 15, 1.25 s, straight), Rift Bombard (16, speed 8, 1.4 s, grenade with radius 2.15). Damage types are `magic` except the Needle Caster, which is `physical`.

Primary profiles (`items.ts:5`): `salvage-blade` cone, range 1.7, arc 100, 7 damage; `primary-cinder-pike` thrust, range 2.45, arc 32, 8 damage; `primary-verge-cleaver` arc, range 1.75, arc 180, 9 damage.

Spells (`items.ts:6`): Cinder Dart (2.5 s cooldown, 1.25 radius, 7 damage, 6 range), Ember Ring (6 s, 2.35 radius, 5 damage per pulse, 4.5 range), Grave Sun (12 s, 3.15 radius, 11 damage, 3.5 range).

Item generation is a pure function of seed and level (`items.ts:15`). Tier is derived from power when no explicit tier is present (`items.ts:9`). `isValidItem` enforces that a name and property pair exists in the table, the slot is one of the four real slots, power is a positive integer, and the tier resolves (`items.ts:16`).

### 9.2 Melee resolution

The live path is `Game.primaryAttack` (`game.ts:2293`), which reads `primaryProfile` from `items.ts:7`, builds geometry with `meleeAttackGeometry` (`game.ts:463`), and resolves hits with `primaryAttackHits` (`game.ts:477`), invoked at `game.ts:2298-2306` and previewed for the HUD at `game.ts:1040`. The player attack cooldown is set to `now + 360` at `game.ts:2358`.

`playerAttack` in `combat.ts:7` is the older helper. It is imported at `game.ts:28` and never called. Its cooldown was 420 ms and its damage formula was `7 + Might * 2 + weaponLevel * 3`, which is not the live formula. It was dead code. Release 387 removed it, taking only `playerAttack` out of the shared `game.ts` import line; the live imports on that line are unchanged.

### 9.3 Gate Revenant statistics

The Gate Revenant has **no canonical entry in the base combat table**. Its statistics are runtime overrides supplied by the dungeon initialisation paths:

- Dungeon role profile block (`game.ts:1542-1551`), which applies only inside a dungeon, only to non-passive combatants, and only when `gatePredator` is falsy. It computes role multipliers, then `game.ts:1549` sets the revenant base to 360 HP, 22 damage, 5.5 range, and `game.ts:1550` applies the multiplier, so a `finalBoss` revenant resolves to 533 HP (`Math.round(360 * 1.48)`) and 26 damage (`Math.max(1, Math.round(22 * 1.2))`).
- Gate predator path (`game.ts:1506`, profile at `:1532`): 260 HP, 22 damage, 5.5 range, scale 1.85, body radius 0.7, 8 tentacles, `pursuesOutdoors`. Spawn probability is 12 in 1000 on ordinary dungeon loads, and the path excludes arenas, hunt instances, elite portals, aperture annexes, and deep dungeons.
- Deep v1 final boss (`world.ts:184`): `gateRevenant` with `dungeonRole: "finalBoss"` and `arenaId: "deep-v1-final-arena"`, which therefore receives the 533 HP and 26 damage above.

The regression at `tests/prototype.test.ts:2981` constructs a deep-v2 threefold dungeon and asserts `maxHp >= 532` and `damage >= 26` on the `gateRevenant` with role `finalBoss`. 533 and 26 satisfy it. This is not an unresolved defect; the earlier flag about a missing stat-table entry was a correct observation whose consequence was wrong.

**Rule for future spawn paths.** Any new spawn path must provide equivalent explicit statistics, or the base combat table must gain a canonical Gate Revenant definition. Without an override the table lookup in `createCombatant` falls back to the ashling base of 24 HP, 5 damage, 0 range while keeping the revenant silhouette, which would produce a visually threatening and mechanically trivial enemy. The base table already omits `gateRevenant`, so this is a live trap rather than a hypothetical one.

Separately, `tests/prototype.test.ts:2464` asserts every elite has at least 230 HP, at least 17 damage, at least 3 modules, and strictly less than 22 damage. That 22 is the gate predator's damage value, so the elite ceiling is coupled to the revenant's predator variant. Changing either number requires checking the other.

### 9.4 Elite definitions

Four elites (`elites.ts:2-7`), each with an epithet, a base form, a movement mode, stable and variant modules, a threat cost, a context, a reward, and lore:

| Elite | Base form | Movement | Stable modules | Variant pool | Threat | Context | Reward |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Vesperwing, The Ashen Meridian | `veilMoth` | hover | dive, ranged | swift, farcasting, orbital | 8 | marked | 35 marks, 55 xp, weapon sphere |
| Gravitant Bell, The Weight Below | `rootBrute` | hover | gravity, radialPulse | plated, orbital, stun | 10 | guardian | 42 marks, 60 xp, armor sphere |
| Mire Apostle, Saint of the Low Water | `rootBrute` | ooze | oozePool, poison, trail | plated, summon, farcasting | 11 | world | 48 marks, 65 xp, armor sphere, clearroot ampoule |
| Choir of Knives, The Divided Cantor | `coilStalker` | skitter | summon, split | swift, orbital, ranged | 12 | portal | 55 marks, 70 xp, weapon sphere |

Variant selection is deterministic: `hashSeed(seed:elite:{id}:{area})` drives a count of one or two modules and picks from the pool with a stride of 5, producing a `variantId` of the form `elite:{id}:{n % 997}` and a `phase` of `restless` or `watchful` (`elites.ts:10`). `eliteThreat` adds 0.35 per point of depth and a flat arena term, times count, rounded to one decimal (`elites.ts:11`).

Elite state defaults (`elites.ts:12`): the Vesperwing contract starts `available` with goal 1, the Choir of Knives contract starts `locked` with goal 4, and status begins with zero poison, stun, and stun guard.

## 10. Dungeon population

`populateDungeonEncounters` (`arenas.ts:28-43`).

Dungeon hazard population is a separate deterministic layer. `populateDungeonHazards` preserves authored hazards, then adds a seed-stable bounded mix of Crossing Spikes and directional Kiln Vents. Generated hazards keep six tiles clear around the entrance and three tiles clear around objectives, bosses, and functional objects. Standard ordinary dungeons carry roughly three to five hazards; deep layouts carry a denser package. Warning, active, recovery, damage, range, and cardinal direction can vary by seed. Jumping remains the shared evasion rule. The Proving Ground report exposes each hazard and its parameters.

Ordinary dungeon recipes also own a stable visual-material identity in both generation 3 and generation 4 layouts. Hollow Relays use fractured blue-charcoal relay slate and inset wall panels; Root-Sunk Cisterns use damp green flagstones, water marks, root-threaded aqueduct masonry, and shallow reflective details; Glass Kilns use rust-red furnace plates, rivets, scorch seams, and staggered refractory brick. These tile kinds are presentation metadata only: collision, reachability, discovery cards, and topology remain governed by the common dungeon contract.

Ordinary dungeons may also receive a sparse deterministic terrain-hazard patch. Hollow Relays and Glass Kilns sometimes contain a small chasm or, rarely for a Hollow Relay, a flooded break; Root-Sunk Cisterns retain their authored water basins and bridges. Hazard tiles are never blank or visually disguised: pits use the canyon renderer and water uses the animated dungeon-water renderer. They are blocked for ordinary pathfinding but intentionally enterable through the lethal-terrain movement check, producing the same death and recovery behavior as overworld canyon and water. Placement protects all objects and enemy spawns and is rolled back unless every protected point remains reachable. Swimming, diving, and pit exploration remain future equipment/progression systems and are not implied by this layer.

Discovery fog is visual rather than a simulation wall. Unrevealed cards must not leak actors, telegraphs, projectiles, effects, or trap geometry, but enemies are intentionally allowed to move from an unrevealed card into a revealed one. This preserves unexpected incursions without showing the source card in advance.

- Refuses to run on arenas.
- Idempotent per map object: it returns early when `encounterVersion` is already set.
- Identity is `map.levelStableId || map.id`.
- Profile is `hashSeed(seed:encounters:v1:{identity}) % 100 < 8`, so 8 percent of maps are infested.
- Total population target: normal 8 plus 0 to 2, infested 16; deep dungeons 12 plus 0 to 3 normal and 24 infested.
- Candidate tiles must be open, must not be an environmental tile, must not be a bridge, sealed gate, or dungeon water, must be at least 5 tiles from the entry, must have at least 6 of 8 neighbours open, and must be at least 2.25 tiles from every reserved object.
- Candidates are ordered by `hashSeed(identity:x:y)` so selection is deterministic and independent of iteration order.
- Ecology comes from `map.archetype`, then `map.recipe`, then hollow (`arenas.ts:16-25`). Nine ecologies exist: hollow, cistern, kiln, threefold, descent, loop, flooded, fortress.
- One in seven spawns receives a role-matched trait: swift for hunter, plated for blocker, farcasting for ranged, keen otherwise.
- Spawns are grouped three at a time with an activation radius of 9 for infested and 8 for normal maps.
- The result stamps `encounterVersion: 1`, `encounterProfile`, `encounterGroups`, `activeEnemyCap`, and diagnostics.

**Population target and active cap are different numbers.** `DUNGEON_ACTIVE_CAP` is `{normal: 7, infested: 9}` (`arenas.ts:26`). A map may contain up to 10 or 16 enemies while at most 7 or 9 simulate at once. Conflating these is an easy error when reasoning about difficulty or performance.

Spawn assembly order at load (`game.ts:1499-1507`): elite spawns, then the rare gate predator, then population, with the population call skipped for arenas, hunt instances, elite portals, aperture annexes, and deep dungeons. Combatants are then rebuilt from `map.enemySpawns` (`game.ts:1524`), stamped with their role and domain fields (`:1527`), given profiles (`:1531-1551`), given AI (`:1552`), joined by aperture intrusions (`:1555-1575`), and finally have projectiles, effects, and elite hazards cleared (`:1576-1578`).

## 11. Arena lifecycle

Two different systems share the name.

**Bespoke world-threat arenas.** Eight families with floor, hazard, and boss rules (`arenas.ts:3-6`). Eligibility is `hashSeed(seed:arena-cadence:{kind}:{rx}:{ry}) % 1000 < 18` for temporary and `< 7` for persistent, so 1.8 percent and 0.7 percent (`arenas.ts:10`). Persistent entrances additionally require depth of at least 8 and no settlement. Generation builds a 36 by 30 grid of void and blocked tiles, carves rooms with one of three layouts (ring-bridge, cross-court, offset-vault), places the entry at 18,27, the objective at 18,11, and the exit equal to the entry, adds `arena-exit` and `arena-recovery` objects, and spawns a single boss unless the arena is already cleared. A diagnostic asserts `reachable(entry, objective) && reachable(objective, exit)` (`arenas.ts:11`), surfaced as `traversalValidation: "pass" | "fail"` by `arenaDescriptor` (`arenas.ts:12`).

**Temporary hunt instances.** Created by `ensureHuntInstance` with defaults and a null return point, started by `beginHuntInstance` which refuses a completed instance, marks it active, increments `attempts`, and stores the return point, abandoned by `abandonHuntInstance` which returns it to available and increments `abandoned`, completed by `completeHuntInstance` which writes status, scar, and the reward claim, and cleaned by `cleanupHuntInstance`, which deletes session areas prefixed with the instance id and clears `activeDungeonId` on a match (`foundry.ts:51-55`).

## 12. Deep dungeon traversal

**Deep v1, Threefold Deep** (`world.ts:171-185`). A 64 by 64 grid, entirely `deepWall` until carved. Hub and three wings: west 3-16 by 25-40, east 47-60 by 25-40, south 9-23 by 43-55, north 23-41 by 3-17, central refuge 27-37 by 27-38, and an entry hall at 28-35 by 56-62, with halls carved as 3-wide corridors. Three pits act as wing canyons, each with exactly one permanent bridge: west at column 10 rows 26-39 bridging at row 32; east at column 53 rows 26-39 bridging at row 32; south at row 49 columns 10-22 bridging at column 17. Entry is 31,59 and the hub is 32,33. Three `deepReturn` anchors teleport back to the hub so a cleared wing never has to be walked twice. The final gate at 32,24 is a `sealedGate` requiring all three wing minibosses, sealing `deep-v1-final-arena`. The final boss is the `gateRevenant` at 32,9.

**Deep v2.** Archetype is chosen by `hashSeed(seed:deep-v2:archetype:g{gen}:{rx}:{ry})` from `DEEP_ARCHETYPE_IDS` (`deep-dungeons.ts:42`), and the dungeon id embeds the archetype (`:45`). `deepV2Levels(id)` (`:169`) expands multi-level definitions with stable ids of the form `{id}:level:{levelId}`. `baseMap` stamps `schemaVersion`, archetype, `depth`, objectives, zones, layout graph, shortcuts, routes, final gate tiles, final enemy ids, and the story package (`deep-dungeons.ts:70-72`). The Atlas exposes discovered levels through `progress.discoveredLevelIds` and a level picker (`main.ts:1054`).

A dungeon is persisted as an identity plus progress, not as a tile dump. Regenerating it is expected; what must never change is the generated result for a given id and version.

## 13. Interaction dispatch

`interactions.ts` resolves in this order: displacement device, shelter hazard, validity gate, shrine or ruin marker (aperture +2, records a signal lead), aperture memory (+3), aperture door, aperture relic (+3), NPC, relay terminal, dungeon bypass, supply and weapon cache, chest, shack, architectural district (aperture +1), the narrative pack, tree, rock, and finally a generic world flag.

NPC semantics: an attack applies 18 damage and writes a journal line; `standDown` sets disposition `spared`; trade is refused while hostile or while the settlement has fallen. Only `vendor-vela` is bound to the narrative pack, so the other residents return one of three authored lines.

Dead data: the narrative record `relay-restored` targets `kind: "chest"`, but the narrative gate returns null for `chest` and `exit` before lookup. That record cannot fire through its own path. The relay effect still happens through `commitRelay`, so the consequence is a missing narrative line rather than a broken feature.

## 14. Scenes

`scenes.ts` in full. Schema `infinite-corridor-scene/1.0.0`. Four definitions: `rift-arrival` (illustrated, first singular monster), `memorial-release` (illustrated, deep-story-resolution), `relay-awakening` (illustrated, relay-chain), `aperture-rite` (in-world, version 2, aperture-ritual-object, with actors and choreography).

State is `{schema, witnessed, pending, completed}`. `ensureSceneState` drops a pending entry whose definition no longer exists, which is the forward-compatibility guard.

Lifecycle: `queueScene` refuses when no definition exists, when a scene is already pending, or when the scene was already witnessed. Variant is `hashSeed(seed:sceneId:encounter:definitionVersion) % 3`, so a replay of the same encounter looks the same. `commitScene` marks witnessed and completed, records the narrative fact only on first completion, writes one journal record for the aperture rite with instance key `record:scene:aperture-rite`, and clears the matching pending entry.

Interruption recovery: `recoverInterruptedScene` clamps the pending shot into range and resets elapsed to 0, so playback resumes on the same shot with the original variant, since the variant lives in the pending record.

Playback budget: `scenePlaybackPlan` returns null for an already-witnessed scene unless replay is requested. It degrades to one layer at reduce-motion or low or safe quality, two at medium, three otherwise, and when limited it forces camera `still`, effect `fade`, durations at 0.7 times with a 1,600 ms floor, and choreography cues to `hold`.

Aperture gate: `apertureRitualState` requires the rite not yet completed, aperture of at least 12, the relay fact `crossing.complete`, and at least one completed Viewport contract (`scenes.ts:19`). `requestApertureRitual` returns the exact missing list and queues the scene with encounter `ember-refuge-plinth`. The threshold of 12 sits between the 6 and 18 bands of `APERTURE_THRESHOLDS` (`world.ts:164`).

UI side: `main.ts:1530` builds a plan, sets the game paused during playback, and stores the previous pause state. `main.ts:1532` commits on finish and restores the previous pause state. `main.ts:1533` advances shots and persists the pending shot index so an interrupted scene resumes where it stopped. A first tap reveals the skip affordance and a second tap finishes; `#sceneSkip` finishes immediately.

## 15. UI surfaces

The complete DOM surface is `index.html` (185 lines).

| Surface | Elements | Behaviour |
| --- | --- | --- |
| Field HUD | `#hud`, `#vitals` with `#healthBar` maximum 60 and `#staminaBar` maximum 50, `#xpCompact`, `#hudExpand` | Expand toggles `#hudDetails`, which holds place, objective, loadout, buff, and a nav with Pause, Journal, Options |
| Message line | `#messageViewport`, `#message` | Polite live region; `updateMessage` at `main.ts:1477` |
| Event banner | `#eventBanner` | Assertive live region; `showEventBanner` at `main.ts:313`, dismissed by `updateWorldNotices` at `main.ts:322` |
| Action bar | `#actions` | Map, Pack, Menu, Jump, Spell, Potion, and the diamond of Tool, Act, Dodge, Attack |
| Navigation compass | `#navCompass`, `#navGuidanceArrow`, `#navManualArrow` | Two independent arrows, hidden when neither target exists. See section 16 |
| Generic panel | `#panel`, `#panelBody` | Vendor shop and Viewport content |
| Pause panel | `#pausePanel` | Resume, Atlas, Journal, Pack, Options. States that progress is saved and time is still |
| Options | `#optionsPanel`, `#optionsTabs`, `#optionsBody` | Journey files and device settings, opened by `openOptions` (`main.ts:927`), which pauses and closes the pause panel |
| Journal | `#journal`, `#journalBody` | Seven modes: Chronicle, Deep expeditions, Creatures, People and Places, Encountered features, Symbols and controls, Glossary (`main.ts:1370`) |
| Story scene | `#storyScene`, `#sceneArt`, `#sceneActors`, `#sceneTitle`, `#sceneCaption`, `#sceneSkip` | Section 14 |
| Creature viewer | `#creatureViewer`, `#creatureViewerCanvas` | Draws a sprite cell from `assets/bestiary-atlas-v1.png` for creatures with 4 columns and 2 rows, or from `assets/elite-bestiary-atlas-v1-wide.png` for elites with 4 columns and 1 row (`main.ts:1361`). Rendering is nearest-neighbour |
| Atlas | `#atlas`, `#mapCanvas`, `#mapTitle`, `#mapModeToggle`, `#dungeonLevelPicker`, `.maptools`, `#mapWayglassSelect`, `#mapTravel`, `#mapHome`, `#mapWaypoint`, `#mapDetail`, `#mapInstructions`, `#mapLegend` | Section 15.1 |

### 15.1 Pack, Atlas, options, and slots

**Pack** (`main.ts:1095`) shows equipment for the four slots with generated gear icons, upgrade spheres with a Fuse action that calls `game.useUpgradeSphere`, spells, and an inventory list with slot, tier, and sort filters held in `inventoryView` (`main.ts:299`, `:1236-1254`). Fusing is bounded: `useUpgradeSphere` refuses without a matching material and clamps both armor power and weapon level to 8, reporting that the upgrade is permanent (`game.ts:2455`).

**Atlas** (`main.ts:1081`) switches between Corridor Atlas and Dungeon Map modes. The dungeon mode hides the home, waypoint, and legend controls and exposes the discovered-level picker populated only from `progress.discoveredLevelIds` (`main.ts:1054`). Zoom and pan are drag and pinch with plus, minus, and directional buttons. Tapping an explored section selects it; `updateMapWaypointButton` (`main.ts:1059`) enables Set manual waypoint only for explored sections and toggles the label to Clear manual waypoint when the selection already holds the waypoint. The legend is built from `ATLAS_SYMBOLS` via `renderAtlasLegend` (`main.ts:1033`), including a last-death mark from `drawDeathGlyph` (`main.ts:1013`). Wayglass fast travel uses `#mapWayglassSelect`, populated by `refreshWayglassDestinations` (`main.ts:1034`), with `selectedWayglassKey` (`main.ts:1040`) preferring the explicit selection and falling back to the selected section when it holds a checkpoint.

**Options** (`main.ts:926`) renders a tab per category. The Journeys category is `renderJourneys` (`main.ts:902`), the three-slot grid. Each card shows health, active status, and metadata, and offers New journey, Continue, Rename, Duplicate, Export, Import, Delete, and Recover as applicable. New journey prompts for a name and an optional seed, and a blank seed generates one (`main.ts:905`). Delete requires two confirmations and keeps a recovery snapshot; import into an occupied slot also keeps the previous save as a recovery snapshot (`main.ts:909-910`). Other categories come from `renderSettings` with switch, select, and range controls built by `settingRow`, `selectSetting`, `rangeSetting`, and `toggleSetting` (`main.ts:913-917`). Settings are normalised with clamps: quality in auto, low, balanced, full; UI scale 0.85 to 1.3; text scale 0.9 to 1.35; control sensitivity 0.7 to 1.8; deadzone 0 to 0.3; smoothing 10 to 60; volumes 0 to 1 (`persistence.ts:10`). `effectiveQuality` falls back to `low` when the smaller viewport dimension is under 500 px, device memory is 3 or less, or cores are 3 or fewer, and otherwise to `balanced` (`persistence.ts:13`).

**Pause and overlay discipline.** `pause(show)`, `pauseForOverlay()`, and `resume()` (`main.ts:877-888`) ensure exactly one overlay owns the pause state. Every overlay entry point pauses before opening. Returning from an overlay restores the previous pause state rather than forcing a resume.

**Audio and performance.** Mute state lives in `localStorage["corridor-muted"]` (`main.ts:476`, `:488`, `:595`). `recordPerf`, `measured`, and `percentile` (`main.ts:256-268`) wrap persistence and other hot operations. `applyPresentationSettings` (`main.ts:255`) writes `--ui-scale`, root font size, contrast and reduce-motion classes, and `game.presentation`, and it reapplies audio gain without touching journey data.

## 16. Guidance: compass and symbols

Two systems that are easy to conflate, both verified.

### 16.1 Compass arrows, player-relative

`navigationTargets` (`main.ts:440-456`) resolves two independent targets and caches them keyed on area, section, hunt id and status, hunt target coordinates, whether the objective is open, and the manual waypoint fields.

Resolution order:

1. **Guidance** (violet, `#navGuidanceArrow`): if a Viewport hunt is active with integer target coordinates, the hunt target wins. Otherwise, if the player is in the overworld and `objectiveOpen` is true, the target is the first matching cue in the order `crossing`, then `danger`, then `event`.
2. **Manual waypoint** (cyan, `#navManualArrow`): `save.manualWaypoint`, drawn independently and never replaced by guidance.

`objectiveOpen` is true when the relay choice has not been made, or when `leads.active` is true and `leads.complete` is false (`main.ts:444-445`).

Arrow rendering (`main.ts:457-462`) is player-relative: the angle is `atan2((target.rx - game.rx) * 32 + 16 - player.x, (target.ry - game.ry) * 32 + 16 - player.y)`. An arrow is `dormant` when the area differs and `arrived` when the section matches, and the accessible label reports the name and section distance. `updateNavigationCompass` (`main.ts:464`) sets a combined ARIA label for the compass and fires a `WAYPOINT REACHED` banner once per arrival.

**Candidate reliability issue.** The guidance branch selects only `crossing`, `danger`, and `event`. `beacon` and `story` cues are generated by `wayfindingCues` and drawn in the world and on the Atlas, but are never consulted by that branch, so a visible mark of those kinds can never become a compass target through it. Recorded as a candidate, not a defect: the branch is verified, but the player-visible consequences have not been reproduced on device.

### 16.2 Floor and Atlas marks, section-relative

`wayfindingCues` (`world.ts:137-158`) builds at most four cues, one per kind, in the priority order `story`, `beacon`, `crossing`, `danger`, `event`. Each cue stores `dirX` and `dirY` as the **sign** of the section delta, so the mark indicates an octant of the neighbouring sections rather than a bearing to a tile, and it does not move while the player walks around inside one section.

`waymark` (`renderer.ts:399-400`) translates to `(x + 0.5) * s, (y + 0.55) * s` and rotates by `atan2(dirY, dirX)` before calling `drawWaymarkIcon`. So rotation is applied; the earlier suspicion that floor marks had no orientation was wrong.

`drawWaymarkIcon` (`renderer.ts:391-397`) geometry:

| Kind | Colour | Geometry | Relation to forward |
| --- | --- | --- | --- |
| `beacon` | cyan `#72d7df` | Arc from 0 to 1.65 pi, plus an inner ring | Gap spans 297 to 360 degrees, so one gap edge lies exactly along forward and the gap body opens upward; the gap centre sits about 31.5 degrees off forward |
| `crossing` | amber `#d5a464` | Polyline with a vertex at the leading edge | Vertex sits exactly on forward |
| `danger` | red `#d16b62` | Triangle with an interior wedge | Both the triangle apex and the wedge apex sit on forward |
| `event` | violet `#a68ad2` | Arc from 0 to 1.5 pi plus a tail stroke to `(0.28, 0)` | The arc ends straight up, but the tail stroke continues to forward |

Marks are drawn in the world at `renderer.ts:531` and on the Atlas at `main.ts:993`, where zoom of 1.35 or more also draws an `UNRESOLVED SIGNAL` label.

The Journal renders the four marks as trail symbols with the accessible label `"{signal} floor mark pointing right"` (`main.ts:1358`). That is a player-facing assertion about orientation, so the `beacon` gap offset is the clearest candidate mismatch against the documented promise. Candidate only; no implementation without authorization.

Two further marks live on the Atlas and are distinct from floor marks: `atlasSignal` (`main.ts:1026`) maps site kinds to glyph kinds, and `drawAtlasGlyph` (`main.ts:1027-1029`) draws them.

## 17. Geometry, collision, and traversal

- Player collision samples the full footprint, not the centre point: overworld transitions and hazard checks use `nx + 0.76` and `ny + 0.88` against `SECTION_SIZE` (`game.ts:2573-2575`), and rendering uses a matching 0.22 inset (`renderer.ts:411`).
- Terrain hazard is assessed by footprint, so a canyon or water tile under any part of the footprint is fatal. Water traversal beyond lethal unbridged surface water is documented intent only (`docs/design-decisions.md:72-78`), the save carries always-false water capabilities as scaffolding, and no runtime swimming or diving exists.
- Shelters have exactly one hazard and one trap slot wired into the update loop, both one-shot through `save.worldFlags` keys (`game.ts:2596-2598`).
- Building enterability and roof cutaways were corrected in commit `18e972c`; the tests pass. Not revalidated on device.
- Pause-time recovery (`game.ts:1667-1679`) calls `relocateIfStranded` against the full footprint. If the player is invalid it moves only the player to the nearest valid tile in the same area, sets the message "The Corridor settles you onto nearby stable ground. Your journey remains unchanged.", and syncs. If the player is valid it does nothing. It is a safety-only repair, never a mobility or escape mechanic, and it changes no other subsystem.
- Pause clock handling (`game.ts:1680-1701`) adds the paused duration to attack, melee, dodge, invulnerability, and jump timers on resume, so a pause cannot consume or grant combat time. `exportSnapshot` stamps the pause start as the clock while paused, so a save taken during a pause does not appear to be from the future.

## 18. Viewport, domains, and Foundry

- Viewport gathers contracts into a modal, with statuses `available`, `deferred`, `accepted`, `tracking`, `target-located`, `completed`, and `archived`. Actions are Accept hunt, Archive, Guidance active, Defer, and, for a completed trial, one of five decisions: enter the Corridor, keep as a rare hunt, reserve for dungeons, rework and return later, or archive (`main.ts:1763`). Reward summaries come from `viewportReward` (`main.ts:1759`).
- Domains have families including `sentinel` and `rootbound`. Rootbound enemies carry regeneration, ground attack, manifestation level, and boss or lieutenant flags, all of which are read in the update loop (section 8, step 15).
- Foundry creatures are singletons: statistics come from explicit per-role blocks rather than the base table (`game.ts:1531`), they are stamped `foundryValidated`, and the first observation within 5 tiles writes one codex entry and one notice (`game.ts:2600-2609`).
- Foundry candidates are generated, validated, planned into domain encounters, and recorded in the codex through `foundry.ts`. The pure half is candidate generation and validation; the mutating half is listed in section 5.4.
- Deep story packages are reconciled here: `storyFor` (`deep-dungeons.ts:51`) draws from pools containing `none`, `boundSpirit`, `resonantDead`, `lostBearer`, `lastPatrol`, and `emberWitness`. The default pool has three playable packages, and the union across pools has five. That is the whole content of the earlier "three playable packages" test title, which describes a narrower assertion than the five-package test.

## 19. DEVELOPER ONLY: narrative register (SPOILERS)

> **SPOILER WARNING. PRIVATE, DEVELOPER-FACING.**
> Nothing in this section may be surfaced through any player-facing interface, journal entry, Atlas label, or tooltip merely because it exists here. The project owner and the player deliberately experience much of Infinite Corridor through gradual discovery. A separate spoiler-light player synopsis belongs in the player-facing documentation, not in this section. Keep edits to this section internal.

Verified threads, all CODE unless noted:

1. **The Aperture rite.** The rite requires an aperture value of at least 12, the relay fact `crossing.complete`, and at least one completed Viewport contract. It plays at `ember-refuge-plinth`. It is a one-time scene that writes a journal record (`scenes.ts:19-20`).
2. **The relay network.** Restoring crossings forms a readable pattern. Restoring a relay improves passage and connection while allowing hostile things to learn and pursue the route; severing a relay permanently closes the line and forfeits whatever it might have reached. A far relay answers with a coordinate that belongs to no charted section and leaves three lumen dust and a Crossing Sigil fused into the receiver. Recorded under the journal title "The Far Signal" (`game.ts:130`).
3. **Five deep story packages** plus a storyless result: `boundSpirit`, `resonantDead`, `lostBearer`, `lastPatrol`, `emberWitness`, and `none`. Archetype-specific pools mean some archetypes cannot roll some packages (`deep-dungeons.ts:51`). Completing one writes a journal record keyed `deep-story-complete:{dungeonId}:{packageId}` and queues the `memorial-release` scene (`game.ts:95-96`).
4. **Three illustrated scenes** plus one in-world rite: first singular monster, deep-story resolution, and relay chain, plus the aperture rite (`scenes.ts:5-8`).
5. **Four named elites** with epithets that carry hidden framing: the Ashen Meridian, the Weight Below, Saint of the Low Water, and the Divided Cantor (`elites.ts:2-7`).
6. **Settlements.** Glasshaven at 4,-2 and Coilmarket at -5,3 exist as authored regions with Wayglass landmarks. `vendor-vela` is the only narrative-bound resident; other residents carry one of three authored lines.
7. **The Gate Revenant** guards the deep final gate and also roams as a rare predator of ordinary dungeons. Its silhouette is defined even though its statistics are not, which is the mechanism described in section 9.3.
8. **Water.** Staged progression exists in design notes: lethal unbridged surface water now, then a Tidemantle, then a Bathysal Lens with a dive rig and dedicated underwater regions (`docs/design-decisions.md:72-78`). The save already carries always-false capability scaffolding. None of it is implemented at runtime. Treat the staging as private design, not as announced content.

Unknown or untraced and deliberately not invented here: the internal schema version of deep dungeons, the full objective and zone tables, the archetype list contents, and the specific authored text of the five deep story packages. Those live in `deep-dungeons.ts` lines 1 to 120, which this pass did not read.

## 20. Performance

- Counters are recomputed per frame: `totalDungeonEncounterRecords`, `activeEnemies`, `dormantEnemies`, `activeProjectiles`, `activeHazardsAndEffects`, `pathfindingWork`, `ambientTicks`, and `updateBudgetViolations` which increments when `dt > 1/30` (`game.ts:2663`).
- Only active enemies simulate. Overworld gating requires aggro or a threatening state (`game.ts:971-974`).
- Ambient enemies are sampled: an accumulator under 0.125 skips them, and their simulation dt is clamped to 0.25 (`game.ts:2668`).
- Bounded actor counts: projectiles 32 in dungeons and 64 in the overworld; elite hazards 8 per owner and kind; summoned adds 3 per summoner and 6 total; root eruption hazards 3; oak and ooze hazards 8.
- Pathfinding work is bounded by a detour retry at 350 ms with a 3 s detour window (`game.ts:948-956`).
- Elite hazards tick on a 1,000 ms hit repeat and elaborate hazards wind up before arming, so damage cannot stack per frame.
- Presentation cost is managed by quality tiers from `effectiveQuality`, by reduce-motion and safe mode, and by scene playback layer reduction (section 14).
- `main.ts:256-268` provides `recordPerf`, `measured`, and `percentile` for wrapping hot paths.

## 21. Tests, commands, and verification status

| Command | Status |
| --- | --- |
| `npm.cmd test` | Verified 2026-09-24: 308 tests passed; 0 failed, cancelled, skipped, or todo; duration 167.1 s. |
| `npm.cmd run build` | Verified 2026-09-24: completed successfully and built static offline PWA Release 91 in `dist/`. |
| Lint, format, typecheck | None configured. A typecheck with unused-import detection would have flagged the dead `playerAttack` import |

Named checks relevant to this guide: `tests/prototype.test.ts:2464` (elite scale ceiling) and `:2981` (dungeon combat profiles wake on all damage paths and strengthen final revenants, asserting the revenant reaches at least 532 HP and 26 damage).

Test baseline recorded on 2026-09-20. Re-run both commands afresh before relying on these numbers.

## 22. Build and release

- Build script `scripts/build.mjs` stamps release 91.
- `index.html`, `sw.js`, generated modules, and System diagnostics use release 91. These must stay in step with the build release.
- `dist/` is untracked and ignored.
- Offline model: service worker with cache-first assets, a manifest, an installed-PWA path, and the boot sequence in section 3.2. Offline behaviour after install is unverified on device.
- A separate deployment worktree exists at `C:\AI-PROJECTS\infinite-corridor-pages-release40` on branch `deploy/release-40`. Deployment is outside this guide's scope and requires explicit authorization.

### 22.1 Local dev server (`scripts/dev.mjs`)

- Serves the repository root on port 5173, bound to `0.0.0.0`, so it is reachable from the local network for as long as it runs. There is no bundler and no watch step: it reads files from disk on each request, and rewrites `.js` specifiers to `.ts` for the browser's benefit (a request for `src/main.js` resolves to and is served from `src/main.ts`). It serves any in-repo file by path, so it is a convenience server, not a hardened host, and it should not be exposed beyond a trusted network. Narrowing the bind to `127.0.0.1` would remove LAN access, which is how the game is played on a phone, so the bind is left as-is and disclosed rather than silently changed.
- **It must strip the URL query string before resolving a path.** `index.html` requests release-88 versioned assets (`styles.css?v=88`, `sw.js?v=88`, `src/main.js?v=88`), and the document URL itself may also carry a query. A resolver that treats the query as part of the filename resolves to a nonexistent file and answers 404 for every versioned request. Startup now imports the game independently of the best-effort service-worker path, so an update failure cannot recreate the former black-screen reload loop.
- **Containment must be decided on path components, not on a string prefix.** The root check uses `relative(root, full)`, which must not begin with `..` and must not be absolute. A `full.startsWith(root)` test also admits any sibling directory whose name merely begins with the repository directory name, such as the `infinite-corridor-pages-release40` deployment worktree named in section 22.
- **This is dev-tooling only.** The production path serves `dist/` through `scripts/serve-private-pwa.ps1`, which uses Python's `http.server` and ignores query strings, so the installed PWA was never affected by this failure mode.
- The dev server is not covered by the automated suite. Any change to asset-request shape (adding a query string, a new asset root, or a redirect) must be checked against it by fetching the exact URL the page requests.

## 23. Ten highest-risk regression areas

1. Changing a generation algorithm without bumping its `rng` namespace version, which silently rewrites every existing save's world.
2. The save version funnel: every supported version routes through one migration function, so renumbering or reordering is high risk.
3. Collision constants and the full-footprint sampling that depends on them (0.22 inset, 0.76 and 0.88 boundary terms).
4. Shelter family generation, single-entrance guarantee, and the one-shot hazard and trap wiring.
5. Dungeon population idempotence via `encounterVersion`, and the distinction between population target and active cap.
6. Deep v1 bridge topology, where losing a bridge strands a wing.
7. Arena reachability, the only traversal assertion in arena generation.
8. The two Gate Revenant configurations and the elite damage ceiling of 22 that references the predator variant.
9. Scene pending recovery and the one-scene-at-a-time rule.
10. Input latch and reset semantics, especially the backgrounding reset.

Also non-negotiable and worth stating separately: same seed, coordinates, generation version, and content schema must produce the same base result; existing mutable state must come from saved snapshots rather than fresh rerolls; one-time rewards must not duplicate; completed choices must not silently reverse; older supported saves must migrate without erasing character or world state; death must not delete permanent progression; pause and backgrounding must not advance combat; dungeon exit must return to the correct entrance; all required objectives, exits, bosses, and return routes must stay reachable; buildings must retain at least one genuinely traversable entrance; roof cutaways must reflect actual player occupancy; water and canyon hazards must trigger only on genuine entry; displacement destinations must be valid and safe; manual waypoints must remain independent of quest guidance; ordinary enemy deaths must not produce grand completion notices; major guardians, elites, bosses, and exceptional enemies must use consistent earned notices; enemy attacks must remain telegraphed and counterable; active actor, projectile, summon, hazard, and effect counts must remain bounded; save state must never contain live DOM, canvas, timers, or audio nodes; the game must remain playable offline after assets are cached; and no player-facing surface may expose developer-only narrative knowledge.

## 24. Safe extension recipes

Each recipe is the short version: find the table, extend the table, check the wiring, then verify.

| Target | Where to change | Required follow-through |
| --- | --- | --- |
| Normal creature | `CREATURE_FORMS` and the `defs` table in `combat.ts:3-5` | Add both, or the form falls back to ashling stats. Check spawn sources and the elite ceiling test |
| Creature trait | `CREATURE_TRAITS` (`combat.ts:2`) with hp, damage, range, or speed multipliers | Trait application multiplies hp, damage, range, and speed. Verify the 1-in-7 spawn assignment in `arenas.ts:38` |
| Elite | `ELITE_DEFINITIONS` (`elites.ts:2-7`) | Provide stable and variant modules, threat cost, context, reward, and lore. Check `tests/prototype.test.ts:2464` bounds |
| Foundry module | `foundry.ts` candidate generation and validation, plus the explicit stat block at `game.ts:1531` | Statistics must be explicit, since foundry entities bypass the base table |
| Weapon | `RANGED_WEAPONS` or `PRIMARY_PROFILES` (`items.ts:4-5`), plus `ITEM_TABLE` (`:2`) so it can drop | Check `rangedWeapon` and `primaryProfile` name and id fallbacks |
| Armor or charm affix | Affix pools in `rollAffixes` (`items.ts:14`) and the label sets in `describeAffixes` and `compareItemStats` | Keep percent versus flat handling consistent across the three |
| Consumable | `useConsumable` (`game.ts:2477`) and the material keys used by `useUpgradeSphere` (`game.ts:2455`) | Verify the draught floor of 2 on death does not conflict |
| Dungeon recipe | `GRAMMARS` and `ECOLOGIES` (`arenas.ts:16-25`) and the generator at `arenas.ts:44` | Bump the `ordinary-v3` namespace if output must change; keep the entry, guardian, chest, and trap placements valid |
| Deep dungeon archetype | `deep-dungeons.ts` archetype and level tables | Level ids must stay stable as `{id}:level:{levelId}`. Check `deepV2Levels` |
| Dungeon quest | Objective and zone tables in `deep-dungeons.ts` plus the objective guardian branch at `game.ts:2222` | Verify the objective stays reachable and that the gate logic still requires the right keys |
| Overworld shelter family | `world.ts:41-129` shelter generation | Every building needs at least one genuinely traversable entrance; verify roof cutaways match occupancy |
| Trap | The `displacementTrap` and `shelterHazard` objects and their one-shot keys at `game.ts:2596-2598` | Confirm the trigger radius (0.55 and 0.6) and that the world flag prevents repeat triggering |
| Landmark | Landmark roll and site definitions in `world.ts` | Beware the demotion path that converts a checkpoint landmark into a shrine when the sparsity roll is at least 0.36 (`world.ts:89-90`) |
| Viewport hunt | Contract creation in `foundry.ts` and the status actions at `main.ts:1763` | Keep manual waypoints independent; verify reward idempotence |
| Temporary arena | Hunt instance lifecycle in `foundry.ts:51-55` and the return point | Confirm cleanup removes only instance-prefixed session areas |
| Persistent domain | Family rules, manifestation mechanics, and the rootbound block at `game.ts:2661` | Verify regeneration lock and hazard caps |
| Scene | `scenes.ts:5-8`, then `commitScene` and the playback plan | Bump the definition version when shots change, or existing variants persist |
| Story arc | Story pools in `deep-dungeons.ts:51` and narrative facts | Do not expose hidden answers through player surfaces. Keep the archetype pools consistent with the five-package union |
| Atlas symbol | `ATLAS_SYMBOLS`, `atlasSignal`, and `drawAtlasGlyph` (`main.ts:1026-1033`) | The legend and the accessibility labels are generated from the same table, so update the table rather than the drawing |
| Save field | `types.ts` and the migration function | Follow section 6.4 in full: migration, supported-version tests, exact-resume tests, contract document |
| Migration | The migration funnel in `persistence.ts` and `types.ts` | Never erase unknown fields. `ensure*` functions must merge forward |
| Performance-sensitive overworld feature | Update loop, gating rules at `game.ts:971-974`, and the ambient throttle | Watch `updateBudgetViolations`, `peakActiveEnemies`, and `pathfindingWork` |

## 25. Unresolved claims and confirmed defects

**Confirmed by code (CODE):**

1. ~~`combat.ts:7 playerAttack` is dead~~ — removed in release 387 (function and its `game.ts` import).
2. The narrative record `relay-restored` targets a kind the narrative gate returns null for, so it cannot fire through its own path.
3. The guidance branch never selects `beacon` cues. Release 387 review: this is by design. `wayfindingTargets` in `main.ts` skips `beacon` on purpose, because Wayglass beacons show on the Atlas, and `story` targets are routed through the contract branch. Not a defect.

**Candidate reliability issues, source-evidenced but not reproduced on device:**

4. The `beacon` mark's gap centre sits about 31.5 degrees off forward while the Journal asserts marks point right.
5. The `event` mark's arc gap sits in the forward-upper quadrant with a forward tail stroke.

**Open, evidence incomplete:**

6. `game.ts` spans 41 to 1494, 1581 to 1666, and 1721 to 2515 are unread. The interaction methods, the attack methods, and the systems installation functions are known only by signature and line number.
7. `main.ts` outside 440 to 478 is unread. Overlay internals, the settings category list, and the Atlas drawing internals are grounded only by command-verified lines.
8. `deep-dungeons.ts` lines 1 to 120, `foundry.ts` lines 1 to 45, `interactions.ts` lines 1 to 55, `world.ts` lines 41 to 129, and `renderer.ts` lines 432 to 760 are unread.
9. Historical `local-save-schema` was declared as `14.0.0`, matching runtime `SAVE_VERSION = 14`. Future durable-schema bumps must update migrations, migration coverage, exact-resume tests, and current contract documentation, not the disabled provider declaration.

**Not defects, resolved:**

10. Gate Revenant statistics: runtime overrides, consistent with the regression, no defect (section 9.3).
11. Floor mark rotation: rotation is applied at `renderer.ts:399-400`; the earlier suspicion of no orientation was wrong.
12. Rift Bombard and shelter traversal: corrected in commits `6de8481` (2026-09-20 11:22) and `18e972c` (2026-09-20 17:16) with passing automated regressions.

**Corrected but not manually revalidated on device:** Rift Bombard enemy-body contact, shelter entrances and roof cutaways, and every on-device behaviour listed in section 26.

## 26. Manual validation status

**MANUAL VALIDATION REPORTED (2026-09-24):** the owner reported successful phone validation that the current site runs and works. This is valuable device evidence, but the device/browser/build identifier, route coverage, offline/resume coverage, and reproducible steps were not recorded; it does not establish all cases below.

Still unverified on device: Rift Bombard contact since the latest corrective commit, shelter traversal since the latest corrective commit, the compass and mark behaviour described in section 16, Android installation, installed-PWA offline launch, airplane-mode resume, touch usability, frame pacing under real load, ambient audio behaviour, the current design intent behind the red and green lifts, the glass symbols, the ring opening, and the amber chevron vertex, sparse-region freshness, overworld compaction, multi-breach and swarm content, and Wayglass Beacon placement rate as experienced rather than as computed.

## 27. Change control and governance

Current workflow: Test Bot owns implementation, approved cards, npm test checks, staging, and the operator-approved merge into local main. The `infinitecorridor` Hermes profile only investigates and publishes merged main via create, validate, publish-preview, promote in `scripts/proposal-workflow.mjs`. Each publication is behind a separate Discord approval card. Preserve unrelated work and never infer approval. Change-Control is disabled workspace-wide; `.change-control/` is historical.

### Historical governance (superseded 2026-10-11; not instructions for new work)

The following original protocol is retained as historical evidence only. The linked stewardship decision's Change-Control and dispatch requirements are historical too; the current workflow above governs new work.

- Mandatory before any project write: read `C:\AI-PROJECTS\brightline-release-manager\docs\GLOBAL_CHANGE_CONTROL.md`, run `status` and `checkpoint` with `-ProjectPath`, then follow the guarded workflow for existing-file changes.
- The guarded adapter changes existing ordinary public files on the qualified local Windows filesystem. It does not manage secrets, databases, services, cloud deployments, ACL changes, file creation, or file deletion (protocol section "Supported scope").
- Additional new files and contract changes require explicit review, ordinary version control, and a fresh checkpoint, and **must not be described as guarded effects**.
- Status recorded for the 2026-09-24 documentation draft: `ok:true`, projectId `8225aa1c-9d77-49ac-a8a9-f6b740f7d6f6`, componentOrder `["main"]`, `coordinatorInitialized:true`, no active operations, no blockers, 30 recorded drift entries. One is `sha256+identity`; the remaining entries are `input-binding`. Drift records are observations about recorded versus current identities, not permission to rewrite anything, and they do not indicate that this project is unusable.
- Checkpoint recorded before the 2026-09-24 documentation draft: `b7aecab07b82519aa1bed10537f05af13e67ab7d2e7d90e4393b5247bd3772e6`, 49 observed files, `preexistingWorkPreserved:true`.
- Never bypass a rejected change-control operation, create a second authority, reset unrelated work, clean the repository, or overwrite user changes.
- Stewardship: `docs/decisions/0001-field-guide-consistency-stewardship.md` defines this guide's role as architectural orientation and regression control for every modification, and the Consistency Steward review that each change must pass, including its four possible verdicts.

## 28. Maintenance rules for this document

- Update this file in the same change that alters the behaviour it describes. A guide that trails the code is worse than no guide.
- Label every new factual claim with CODE, TEST, INTENT, or UNTRACED, and cite a file and line or a command with its actual result.
- Never promote a test name into subsystem certification. A test proves the assertion it makes and nothing more.
- Keep section 19 private. Do not move its content into player-facing surfaces.
- When a claim in this guide is found wrong, correct it in place and note the correction rather than deleting the trail.
- Record the reading ledger honestly. An unread span listed as unread is more useful than a confident claim over unread code.

## Astral Worm follow-on integration (unreleased)

**CODE:** Six `astral-*` modules provide bounded deterministic combat and owner-approved black-ink forms, natural main/paired encounters, independent-health Walker riding and physical nearest-Wayglass retreat. The main Worm is publicly catalogued with no new Echo and normal beast bounty; mirages/helpers are rewardless. The narrow pairing does not alter other beasts' single-occupancy rule. Shared Gate level8 floor, Questing dominance and three-attempt/full-health resets are retained. The reviewed corrected r251/Gate histories were merged, not replaced. Exact sources, provisional tuning, budgets and validation boundaries are in `docs/astral-worm-prototype.md`.

**BOUNDARY:** This is local follow-on source, not a release. Release packaging, final exact-source tests and independent review still apply. No merged HP, Worm boat, magical retreat fallback, unrelated generator changes, remote write or publication is enabled by these edits. Native captures do not certify browser/mobile gameplay or balance. The r251 aboard-only swept sailable-footprint force fix is preserved. The ocean regression's unrelated-beast loop now explicitly excludes owner-authorized Astral; every prior unrelated creature assertion remains.

## Unreleased follow-on: Gate Revenant pressure kit

**CODE:** The roaming gatePredator now has a separate bounded controller, actual3.6-unit chase against player base2.4, finite rapid fireball/lob/barrage attacks, sustained wall-clipped mouth-fire, and exactly reused Void Walker passing wraiths. Its final health/damage are increased with320HP/40damage floors and an approximate two-thirds player-scaled Walker reference; the floors take precedence where the ratio would nerf the old predator. New first-pinned layouts provisionally double rarity from12 to24 per1000; existing pins keep their old threshold. Ordinary terrain, exit/cross-section pursuit and shelter escape remain. See [exact owner dictation](gate-revenant-source-transcript.md), [audit/design](gate-revenant-design.md) and [implementation/validation](gate-revenant-implementation.md).

**BOUNDARY:** This is an isolated future prototype, not part of r251 clearance or a live release. §9.3 describes intermediate historical stats: legacy predator22 becomes36 after dungeon/global scaling, and deep final boss26 becomes43. Its claimed arena/hunt/elite exclusions are broader than the actual predator condition; this prototype preserves the condition rather than silently widening or narrowing eligibility. Deep final bosses are not upgraded. New protected regression files, final r251 integration, release assignment and publication remain pending.

## Unreleased follow-on: major-beast baseline and rematches

**CODE:** World beasts now use an attainable level8 reference even for new characters; stronger existing tuning remains. Questing receives at least1.15× the strongest same-reference beast HP/damage, retaining its fastest existing cadence. Additional delivered-damage floor60 is provisional balance, not an owner number. Crystal/Walker dungeon level eligibility is1, with other environment/depth restrictions unchanged. Player death resets participating surviving major beasts to fullHP and spends all relevant attempts; third failure clears them without reward. Gate instead disappears after player death with no rematch counter. Source-area snapshots are captured before switching checkpoint coordinates. See [source](beast-level-eight-source-transcript.md) and [design/validation](beast-level-eight-design.md).

**BOUNDARY:** Ordinary enemies are not globally buffed. Normal leave/reload retains wounds; no attempt count resets. Co-encounter spawn rules remain separate. This is a follow-on prototype, not live or included in current r251 review; protected regression updates and fresh shared-lifecycle review remain pending.

### Astral mouth beam and ink recall follow-on

**CODE:** Shared `astralBeamAnchors` ties the mouth-origin flight beam and ground AoE to actor scale/cast-facing; native projection includes terrain-height differences. `inkWorm`, `inkPool`, and `inkTrample` preserve their silhouette while three JSON-only blobs telegraph, fly, briefly spread and recall. The current riding-only saddle is compact, dark and subtly violet.

**BOUNDARY:** Only temporary ground splats damage; no added healing, actors, persistent terrain, rewards or player boat. Three descriptors and normal hit cadence stay bounded. New owner-approved regressions preserve prior coverage; final exact-source review/full suite and follow-on release packaging remain separate gates.

## Combined release 251 packaging audit — 2026-10-21

**CODE:** The previously isolated Walker/ocean/Blob, Gate/shared lifecycle and Astral histories now form one combined release 251 candidate. Earlier follow-on boundaries above are historical checkpoint descriptions, not exclusions from this candidate. Gameplay remains identical to reviewed commit `1054a167`; packaging consolidates duplicate Proving Ground worker declarations into one complete precache and adds syntax checks to the existing release-coherence regression. Both source and emitted workers are checked, including all six Astral modules.

**BOUNDARY:** Retaining the allocated 251 is deliberate because it has not been merged or published. Local tests, build and simulated precache installation are not browser/offline certification or publication evidence. Upload, CI, merged preview, fresh full-range publication review and final live verification remain separate coordinator-owned gates; workflow files are unchanged.

## Release 251 review fixes, Griffin forelegs and leather saddle — 2026-10-21

Claude reviewed all 17 Codex commits from live r249 to the combined r251 candidate. Tim then asked for higher-quality Griffin front paws, a bigger traditional leather saddle that is easy to see, and a reconcile of his Void Walker descriptions across Codex and Claude, adding anything left out and removing nothing.

**CODE:**
- **Gate poise.** `GATE_REVENANT.poise` (0.6 s) and `GATE_REVENANT.unstoppable` (2.4 s) cap the hit-stun lock in `updateGatePredator`. `tuneGatePredator` tolerates a non-finite `hp` or `maxHp`.
- **Walker exits.** `Game.walkerExitTargets` returns every ground-open tile on a non-marine overworld exit edge, the clamped gate first.
- **Supernova spill.** `Game.spillVoidTerrain` previews each overlapping neighbour with `walkerCrossingMap`. It records that neighbour's scar through `consumeVoidTerrain(..., { spill: true })`, under the neighbour's own `overworld:rx:ry:gN` key. Scar circles may now keep a centre outside their section, as long as the disk still overlaps it. This is additive at schema 14.
- **Griffin forelegs.** `drawAstralWorm`'s griffin uses a `foreleg` helper: feathered upper leg, scaled tapering tarsus, three ground-gripping toes and a hallux, with crescent claws.
- **Saddle.** `drawAstralSaddle` draws tan leather from the `ASTRAL_SADDLE` table: an oxblood pad, cantle and pommel, a stitched fender, and a stirrup leather with a steel iron, at a width of 0.64–0.74 units.
- **Griffin, second pass (Tim: rework all the legs).** A `hindleg` helper draws a lion leg: gaskin to a backward hock, a slim metatarsus, a padded paw with claw tips, and a teardrop thigh outlined only on its front and underside. The `foreleg` plumes now layer over the tarsus as a scalloped hem. The tail gets a hair tuft and the throat scallop feathers.
- **Saddle size.** `ASTRAL_SADDLE.size` is 0.8 (Tim: a little smaller).
- **Beam.** `drawAstralBeam` (`ASTRAL_BEAM_FX` table) is painted before the Worm, so the beam sits behind the mandibles. It adds a glow and core, two expanding impact rings, a splash and ten sparks, driven by the active clock; reduced motion shows one steady ring and no sparks. It is visual only: the combat hazard is unchanged.
- Tests are in `tests/review-251-fixes.test.ts`. The saddle render test now looks for the new leather colour.

**BOUNDARY:**
- A walled-in retreating Walker still waits and retries, never fading or teleporting (Codex's owner-backed rule and its tests).
- An unfollowed Walker retreat still resumes when you return, rather than escaping. Tim has not ruled on this for the Walker.
- The Questing Beast keeps its 1.15× dominance over every beast, including the Astral Worm's native floor (Tim's "strongest" rule). It can reach about 5,500 HP at level 1.
- The spill never simulates actors in the neighbour section and never marks it visited.
- The reconcile found no described Walker feature missing; the section-clipped overworld scar was the one partial, and the spill completes it.

## Release 251 saddle: futuristic plinth — 2026-10-21

Tim saw the violet rider placeholder in a test render and asked for that as the saddle. He wants it compact, black and silver and futuristic, with a purple glow beneath where it mounts to the beast, a platform the Walker stands on, and a purple glow rising to about his hips.

**CODE:** `drawAstralSaddle` (data in `ASTRAL_SADDLE`) now draws a gunmetal clamp with two bracket feet, over a radial violet underglow. Above it sits a silver disc platform with a shaded side band, a glowing seam and an inset ring. A violet light column with glowing edges and streaks rises `glowHeight` 0.46 units. `paintPackMonster` calls it twice: `layer: 'back'` before the rider body, and `layer: 'front'` (the column only, at `veilAlpha` 0.4) after it. The saddle test now looks for the platform colour.

**BOUNDARY:** It is visual only. Riding, knock-off, health and hitboxes are unchanged. The leather saddle from earlier the same day is replaced. The column is static, so reduced motion needs no special case.

## Release 253: Void Walker boards the Astral Worm — 2026-10-21

Tim's description: the Walker throws his saddle disk at the Astral Worm, which can be moving, like an attack. A purple pillar rises from the disk. He phases out with a purple light and phases in on top of the plinth.

**CODE:**
- **State machine.** `src/astral-worm-mount.ts` adds `ASTRAL_BOARDING` (reach 8; throw 0.6 s, pillar 0.45 s, phase out 0.3 s, phase in 0.3 s), `beginAstralBoarding` and `tickAstralBoarding`. A new `astralMount.status: 'boarding'` carries `phase`, `t`, `from`, `disk` and `seat`. The disk homes on the Worm's current position along an arc; the tick handles any `dt`, carrying time over between phases.
- **Shared code.** `canBind` and `mountedState` are now shared with `mountAstralWalker`, which stays instant for fixtures.
- **Interrupts.** `dismountAstralWalker` cancels boarding where the Walker stands. During the phase-in it lands normally instead. `syncAstralMount` never shortcuts boarding.
- **Presentation.** `astralMountPresentation` exposes `boarding`, and gives zero lift until the phase-in.
- **Game wiring.** `Game.boardAstralWalker` is the natural path, called from `reconcileAstralCompanions`. The pack update ticks a boarding Walker instead of running his AI. `astralRiderHeld` includes `'boarding'`.
- **Render.** `drawAstralBoarding` and `ASTRAL_BOARDING_FX` draw the spinning disk with its trail, the latched plinth with the pillar rising (`drawAstralSaddle({rise})`), and the violet phase bursts. `astralBoardingRiderAlpha` fades the rider out and in.
- **Tests.** New tests are in `tests/astral-boarding.test.ts`. Natural-pair tests now wait for, or fast-forward, the boarding.

**BOUNDARY:**
- The disk deals no damage.
- Knock-off damage counts only once he is mounted.
- Riding, health, hitboxes and the fixture mount are unchanged.
- The boarding state saves with the enemy snapshot and resumes exactly.

## Release 253: Astral pair rules (rider, fighter, ally) — 2026-10-21

Tim's rules:
- Once on the Worm, the Walker stays on through form changes and through the player's death.
- While riding he randomly stays on, gets off, or leaves; he is part of the fight and never takes it over.
- If the Worm retreats while he rides, he rides it home and both disappear. If it retreats while he fights on foot, he keeps fighting until he feels like retreating, the player dies, or he is killed.
- A Walker who joins can outlast the Worm. The three deaths count from the first monster met and never reset.
- A helping Walker never rides. The Worm sometimes turns on him, and everyone's attacks hurt everyone. He leaves after losing half his health.

**CODE:**
- **Rider (`src/astral-worm-mount.ts`).** `ASTRAL_RIDER` and `tickAstralRiderChoice` decide stay, dismount or leave every 12 riding seconds, deterministically per rider. `syncAstralMount` keeps a rider on a departing owner (`ridingAway`, untargetable). `ASTRAL_FIGHTER` and `tickAstralFighterChoice` give an on-foot joined Walker a 15% chance to leave every 15 seconds.
- **Game (`src/game.ts`).** The player's death no longer unseats a rider. Rider choices act through `dismountAstralWalker`, with `q.astralLeave` starting the ordinary Walker retreat. A riding-away rider skips his AI. `astralRiderLeavesWith` removes him (no rewards, hunt escaped) when the Worm crosses or arrives.
- **Death count (`src/world-beasts.ts`, `src/astral-encounters.ts`).** `worldBeastPatience` ignores patience for `astralJoined` until `astralLeave`. The pair gives a hostile Walker `astralJoined` and the Worm's spent `tries`.
- **Worm focus (`src/astral-worm.ts`).** `ASTRAL_ALLY_FOCUS` turns the Worm on a helper 30% of the time, for 3-second spells, deterministically. A non-focused bystander is hurt by active hazards on its own clock.
- **Ally (`src/monster-pack.ts`).** `voidBystander` makes the helper's void effects (and his dash) hit the player as well, with one-shot flags and a horizon clock of their own. The helper is targetable, and leaves at half health (`ASTRAL_WALKER_ALLY`) by fading out with no rewards.
- **Tests.** New tests are in `tests/astral-pair-rules.test.ts`. Three existing tests now expect the rider to stay on through the player's death and a Worm retreat.

**BOUNDARY:**
- The probabilities and timings are provisional data, not Tim's numbers.
- A Worm followed across sections while retreating appears without its rider: he leaves with it at the section edge rather than being re-spawned beside it.
- A helping Walker still leaves when the Worm dies or retreats, as before.
- Mirage drain targets only the current focus.

## Release 257: the Lightning Giant — 2026-10-21

Tim's brief, verbatim, is in `docs/lightning-giant-source-transcript.md`:
- **Body:** a giant robot, bigger than the Void Walker and about the Astral Worm's height, that bends its legs and moves its arms.
- **Arcs:** Tesla-coil lightning arcs to the player and links the two.
- **Shock:** knocks the player down, shaking, before they get up.
- **Club:** forward and back swings, and a slam. The slam sometimes brings a delayed sky strike and sometimes fires three bolts in a tight cone toward the player, whichever way the Giant faces.
- **Electrify:** a club-raised electrify (lightning strikes it; it holds still for a second or two), then a haze, more speed, and bolts dropping around it.
- **Retreat:** to a chasm, where it forms a large cloud and rides it up into the sky.

**CODE:**
- **Registry.** `WORLD_BEASTS.lightningGiant` (`src/world-beasts.ts`) has home `canyon` (the chasm) and `retreatMoves: "walk"`. `MONSTER_PACK.lightningGiant` (`src/monster-pack.ts`) is scale 1.6 (2.16 as a boss), brain `duelist`. Its attacks are `giantArcs`, `giantShock`, `giantSwing`, `giantSlam` and `giantElectrify`; tuning is in `GIANT`.
- **Effects.** `giantArc` (tracks owner and player; ticks damage while connected), `giantBolt` (cone projectile), `giantShock` (calls `w.stun`), `giantSky` (armed, generic detonation) and `giantStrike`, plus the existing `shock` ring.
- **Electrified state.** `giantPassive` ticks `e.giantCharged` and the storm bolts. Movement speed multiplies by `GIANT.chargeSpeed`. At its home, `fleeStep` sets `e.giantCloud`.
- **Stun (`src/game.ts`).** The pack world gains `stun(seconds)`, which sets `p.stunnedUntil` and `stunnedAt`; both shift on pause. While stunned, movement and every action input are swallowed.
- **Render.** The new module `src/lightning-giant-render.ts` (registered in `scripts/build.mjs` and both precache lists) holds:
  - `drawLightningGiant`: two-bone IK legs, arms, a club on pose angles eased per actor through a WeakMap (no actor mutation), shoulder Tesla coils, a core and a visor;
  - `drawGiantCloud`;
  - `drawGiantEffect`;
  - `lightningBolt`;
  - `knockdownPose` and `drawShockSparks`, which `src/renderer.ts` uses to tip, shake and raise the player.
- **Echo.** `ECHOES.lightningGiant` (Giant's Arc).
- **Tests.** `tests/lightning-giant.test.ts`.

Tim's follow-up rules (same day):
- **Stun counter:** three lightning hits knock the Wayfarer down for half a second, then the counter resets. Club blows don't count unless the Giant is electrified. The pips sit under the HUD, not over the character.
- **Look:** a centurion crest, and a height to match the Astral Worm's length.
- **Menacing slam:** he raises the club and stalks, gauging reach. When the player is in reach: a dodgeable wind-up, then a slam or a short chest bolt, up to twice. If the player never comes in reach, he lowers the club.
- **Charging upswing:** he runs in and swings up. He may then jump, and from the air fire a bolt barrage or air-dash with arcs, then land plainly or in a slam that tracks the player.

**CODE (follow-up):**
- **Counter.** `GIANT.stunHits`/`stunTime`/`shockDecay`. `giantZap` calls `w.shockHit()` for every landed lightning hit; arcs count once per arc, and the slam ring counts via `shock.lightning`. `resolveMelee` adds a pip for club blows only while `giantCharged`. `Game.packWorld.shockHit` stuns on the third pip; `p.shockCount`/`shockAt` fade after 10 s and shift on pause.
- **HUD.** `#shockPips` in both `index.html` files, styled in `styles.css`, updated in `updateHud`.
- **Menacing slam.** `giantMenace` runs stalk, then strike or bolt, then a beat: `menaceHold`, `menaceStrikes`, `chestChance`, and a beam telegraph for the chest bolt. The `giantChest` effect is visual; damage is a segment test.
- **Upswing.** `giantUpswing` runs charge, upswing, air (barrage of `giantBolt` or a dash with a `giantArc`), then slamFall or fall. `e.giantAir` lifts the body while the shadow stays on the ground; `endAttack` and `resetPackRuntime` clear it. The air dash uses `w.move`, so it never ends inside a wall.
- **Art.** `form.scale` 1.9 (boss 2.565). The crest is drawn in `drawLightningGiant`, with new poses `menace`, `chest`, `chargeLow` and `upswing`.

Tim's second follow-up (same day):
- **Crest:** blue, swept back like a pteranodon's, made of lightning bolts.
- **Movement, "like Armored Core":** slow on the ground. He closes distance with shoulder-thruster burst dashes, up to two in a row, sometimes bursting into the air. The charge can be dash plus swing, two dashes, dash-swing-dash-swing, or two dashes plus a swing.

**CODE (second follow-up):**
- **Movement.** `giantDashStep` is the single burst. `giantTraverse` handles traversal between attacks when the player is beyond `GIANT.dashRange`: one or two dashes, `dashGap` spool, `hopChance` hop and `dashCooldown`, with state in `e.giantDash`/`giantDashCd`. Ground speed is `WORLD_BEASTS.lightningGiant.speed` .65.
- **Charge.** `giantUpswing` runs one of `GIANT.chargePlans`, inserting one extra dash before a swing that would miss. The leap follows only the last swing.
- **Render.** `e.giantThrust` draws the shoulder exhaust and speed streaks. The crest is three bolt-glyph blades with a glow and a spark.

Visual polish (Tim: six passes; "chunky and fun, but disjointed and amateurish"; focus on the crest). `drawLightningGiant` was rebuilt as overlapping, lit armour plates. The passes, in order:
1. **Structure:** a barrel chest, segmented waist, hip skirt over the thigh roots, rounded pauldrons over the arm roots, a raised collar, and tapered armoured limbs with knee caps and wedge feet.
2. **Stance and helm:** a grounded leg stance with mild knee bend, and a larger helm with brow, visor and jaw guard.
3. **Crest:** a sculpted crest grown from the helm crown. One long lightning-notched blade plus two fins, with a gradient from deep blue to cyan and a white-hot spine (`drawCrest`).
4. **Club and coils:** a Tesla mace (wrapped haft, flange, copper windings, vents, capacitor cap), a gauntlet fist over the haft, and back-leaning Tesla-coil pylons on vented mounts.
5. **Detail:** calf hydraulics, a blue trim system echoing the crest (pauldron rims, chest seams, brow, knees), and rivets and panel lines.
6. **Finish:** a larger, lower helm, and catch-lights on the top edges of the large plates.

Shading uses `shadeHex` gradients from a fixed upper-left light. Behaviour, poses and hit geometry are unchanged.

Redesign and gait (Tim, same day): "not a knight, more a robot", "a weathered old Neanderthal robot", "just a giant of his people", with a weathered garment strapped over the shoulder that has no weapon, down to the waist. Also "especially focus on his walking mechanics".

**CODE (redesign and gait):**
- **Gait.** `gait()` keeps per-actor render state in a WeakMap and advances the walk phase by the distance actually travelled. `giantFoot(phase, moving, offset)` sweeps a planted foot back at exactly the body's speed (no sliding) and lifts the swing foot in an eased arc.
- **Body motion.** The weight drops at each heel strike. The torso pitches forward (the hunch) and rocks with the stride; it breathes when still. The free arm counter-swings, and the loin flap trails a beat behind.
- **Stand, dash, air.** The legs settle under the hips when he stops, brace in a long stride while dashing, and tuck in the air.
- **Look.** Faded olive-grey, dented, rust-streaked, mismatched plates (a newer patch on the chest). The head is low and thrust forward, with a brow ridge, deep visor and jutting jaw.
- **Shoulders and garment.** A bare mechanical shoulder ball with a cable bundle on the club arm. A frayed hide sash runs over the other shoulder to a knot at the near hip.
- **Club.** Hide grip wraps, and at rest the mace is carried low in front.
- **Framing.** Only the torso and head are skewed for the hunch; the arms hang unskewed from the leaned shoulders.
- **Tests.** A no-slide test covers `giantFoot`.

Clean-up (Tim: "his head is in his chest, and we haven't addressed the crest"):
- **Upper body.** Rebuilt around a Neanderthal silhouette: a broad hump plate rising above the shoulders, and the head thrust forward from it on a ringed neck at shoulder height, clear of the chest. The skull is squared, with a brow ridge, deep visor, jutting jaw and mouth grille.
- **No shear.** The upper body is no longer sheared; it rocks slightly about the hips through `R()`.
- **Crest.** `drawCrest` builds explicit sweep vectors (`GIANT_CREST`): a slim lightning-glyph blade rising up and back from the top-back of the skull, plus a shorter fin. The skull is drawn over the crest's root.
- **Coils and shoulders.** The thruster coils lean back off the hump, with exhaust along their axis. The shoulders are lowered so the club arm no longer crowds the head.

Final direction (Tim, same day; this supersedes the weathered/Neanderthal redesign and the clean-up above): scrap that archetype for this robot and keep it for a future creature (a warrior shaman, upright "like the Onyx Lords"). The Giant goes back to the look after the six visual passes (no weathering, no hunch, no garment), with these changes:
- **One arm.** He is "a big Armored Core robot that's lost one arm". The far arm, its pauldron and its coil are gone; `socket()` draws a ring housing, a glowing open socket and severed cables.
- **Socket boost.** The socket is the booster. While boosting (`e.giantThrust`) the hole itself glows white and a layered energy plume erupts out of it (the plume starts at the mouth inside the hole, not behind the shoulder) with sparks, and the whole machine leans into the burst (`GIANT_ART.boostLean`, eased). Tim, 2026-10-21: "It should be coming out of that hole." `socket()` is drawn after the torso so the hole and plume sit over the torso's back edge.
- **Crest.** About 45% of its six-pass size (Tim: "too large").

Late additions (Tim, 2026-10-21):
- **Honest beams.** When the menacing slam times out with no opening, `giantMenace` enters mode `honest` instead of just lowering the club. It fires `GIANT.honestShots` (2) chest beams (`giantChest` effects flagged `honest`, range `honestRange` 10). Each has a short charging beam telegraph: `honestWindup` for the first, `honestStagger` between them, so only one fires at a time. The beams sit on either side of a small cone (`honestCone`°). The second re-aims toward the Wayfarer's current position, turning by at most `honestTrack`°. Each beam deals `honestShare` of the menace damage and counts toward the stun. Then the club lowers.
- **At sea.** The Giant is a marine world beast: `refreshMarineBeast`, world-beast placement, pack-world `los` and the no-phase rule in `move` list `lightningGiant` beside the Void Walker and Psychic Crystal, so it can hold and cross open water. On a marine tile (`e.marine`) `drawLightningGiant` stands it on its storm cloud (`drawStormCloud`, a back layer with rain under the body and a front layer over its feet; `GIANT_ART.cloudRide`/`cloudBob`), legs still, with a wide shadow on the water. The chasm ascent cloud (`drawGiantCloud`) draws the same cloud. The cloud is a traditional layered cartoon cloud in flat tones (`CLOUD_TONES`), not 3D-shaded. Tim, after the soft-shaded and merged versions: "we're doing too much... billowy sections in the cloud front, up into the middle, and then... other sections that are not billowing... layered". From the leading edge (its facing) back past the middle are billows (`CLOUD_BILLOWS`), each with a dark edge copy below, a lit cap and a flat belly shadow. A large round billow closes the cluster at the trailing end. Behind, it trails away in flat, tapered streaks (`CLOUD_STREAKS`) of different lengths, more of them along the bottom, so the trailing edge is jagged and reads as movement (Tim: "they're not all the same... a little bit jagged, kind of indicating movement"). `drawStormCloud(..., trail)` takes the trailing side, which `drawLightningGiant` eases toward `-flip` (the `cloudTrail` render state); while it turns, the layers draw in under the billows, so the cloud swaps ends without a jump.
- **Head jets** (replacing the blade crest; Tim: "3 small Tesla coils that conform to the back of the head... each... an individual burst of energy... like a bolt"). A raised armoured crown cap over the dome carries a lit channel from the brow trim back to three copper-wound coil jets of different sizes along the back of the helm, fanned from up-and-back to straight back. A fourth, larger generator (Tim: "one more bolt generator... towards the front of his head... a larger bolt") leads the group from the top of the crown (Tim: "closer to the group... so it reads more like a plumage"): the four fan out like the old crest's plumage, the lead jet most upright with the biggest bolt. Each jet fires a pulsing, bolt-shaped burst (white at the nozzle, fading to blue) with a soft glow and an occasional stray arc. Before Tim's change of direction, three passes rebuilt the old blade crest as fins slotted into the crown cap; only the cap survives.
- **Supernova fog** (`open-sea.ts` `NOVA_FOG`, `novaFogCapable`, `novaFog`, `tickNovaFog`). An overworld Supernova (the pack world's `consumeVoidTerrain` hook) in an open-sea section, or one at least `oceanShare` (70%) ocean, blankets the section in fog banks (`game.novaFog`) for `duration` 30 s, fading over `fade` s at each end. Another Supernova renews it in place: the 30 s timer resets and no banks are added, so repeated Supernovas never stack (the Supernova's own cooldown is 23 s). It is transient (cleared on section load, never saved) and is drawn and sight-limited the same way as sea fog banks.
- **Gait.** The planted, distance-driven gait (`giantFoot`/`gait`, with the no-slide test) is kept underneath: legs brace while boosting and tuck in the air.

**BOUNDARY:**
- Numbers are provisional data, not Tim's.
- The Giant is overworld-only, with no dungeon claim.
- The stun is blocked by dodge frames, like any hit.
- The knock-down pose is presentation only; collision and position are unchanged.
- The cloud ascent is the existing home-fade timing, with the body lifted instead of sunk.
- At sea, the Giant's attacks are unchanged (slams land on the water). Supernova fog only limits sight; it has no damage and no saved state.

## Release 259: world beasts pursue; the Blob splits; Glyphs fix; Rift Step without recall; Pack tabs; back button — 2026-10-21

Tim, 2026-10-21. On pursuit: "these world bosses should pursue you... The blob can just take one", then "three tiles max... it'll chase you 2 tiles, and then it'll stop there and then it'll chase you 1 more... If you don't wanna fight it within three tiles, you're obviously running away". On the Blob: "a portion of it just detaches and retreats home and just leaves the large mass", then "if the blob is at its original size, it will just leave... only if it's larger will it shrink and leave a residue". On the Arcanum: "the glyphs and echoes aren't working", then "Glyphs, echoes, arcanum, all those steps should just be under... an arcanum tab... so I can just flip through them... in one place... the armor and weapon upgrading system should be another tab". On Rift Step: "should not recall you back to a point... disable that". On the back button: "the back button just freezes the game... it should go back to pause or resume, it should give me that menu".

**CODE:**
- **Pursuit.** `world-beasts.ts` `PURSUIT` = `{ sections: 3, inset: 3.5, limits: { morphingBlob: 1 }, exclude: [voidWalker, astralWorm] }`.
  - `canPursue(save, id, rx, ry, dx, dy)` checks that the beast is active, not retreating, not in a dungeon and not excluded. Its `active.chase` must be under its limit, no other world beast may hold the next section, and the Questing Beast must not be there.
  - `pursued` moves `active.rx/ry` and increments `chase`.
  - `pursuitSpawn` places it `inset` tiles inside the gate the Wayfarer entered by, on the nearest ground it can hold (`beastGround`, which `worldBeastFor` now shares).
  - `Game.transitionSection` collects the aggro, non-retreating world beasts that may pursue before the snapshot. After the crossing holds (the sea checks pass), `worldBeastsFollow` spawns each one in the new section with its own `hp`/`maxHp`/`damage`, aggro and chasing, and removes its record from the section it left. It does not follow into a settlement or a section that already has a world beast or the Questing Beast.
  - `chase` counts crossings for the whole encounter and is never reset on return, so three is the total. It ends with the encounter (`active` is cleared).
  - `patience` is untouched, so it keeps counting across sections.
  - `ensureWorldBeasts` normalises `chase` (a positive integer, or absent). This is additive at schema 14.
- **Blob split.** `BLOB_SPLIT` = `{ grown: .05, linger: 14, fade: 5 }`.
  - When the Blob begins an overworld retreat, `Game.splitBlob` checks its size. Only a Blob grown more than `grown` past its original size (`blobBase.scale`) splits.
  - The grown Blob flees at its original size (`blobAge`/`blobMerged` reset) and leaves an inert `blobRemnant` at its grown size: untargetable, no rewards, no AI.
  - The update loop counts `remnantLeft` down, drives `fleeFade` over the last `fade` s and removes the remnant at 0. `snapshotArea` never saves remnants.
  - A Blob still at its original size leaves whole.
- **Glyphs fix.** `openGlyphs` in `main.ts` read `constlit=` for `const lit=`, a merge typo from release 112 (89015a9). In the strict module it threw `ReferenceError` on every open, after `arcanumShell` had drawn only the tabs.
- **Pack tabs.** `main.ts` `PACK_TABS` (Wayfarer, Gear, Forge, Arcanum, Supplies) and `packTabBar(current)`, a sticky `.pack-tabs` row.
  - `openPack(tab)` shows one tab. It remembers `packTab` and ignores a click event passed as the argument.
  - `openForge` and `arcanumShell` draw the same bar (Forge, Arcanum). The Arcanum keeps its own non-sticky `.arc-subtabs` row (Spells & Constellation, Glyphs, Echoes).
  - "Reinforce weapon · 3 iron" moved from the Pack to the Forge. The Pack's separate Glyphs, Echoes and Constellation buttons were removed.
  - The Aperture card still attaches under the Wayfarer heading (the save's name).
- **Back button.** `backPressed()` in `main.ts`:
  - The creature viewer closes on its own.
  - Any open Pack/Atlas/Journal/Options closes and the pause menu shows.
  - The pause menu continues play.
  - In play, it opens the pause menu.
  - It runs from each dialog's `cancel` (close request; default prevented) and from `popstate`. A guard history entry (`{icBack:true}`), re-armed after each back, keeps the page from navigating away.
- **Carry limits and the shovel.** `boats.ts` `WOOD.carry` = 6 (two skiffs at `skiffCost` 3). `digging.ts` `DIG.carryStone` = 2, and `DIG.recipe` is now 1 wood + 1 stone. Tim: "one wood and one stone to make a shovel... 3 wood for a boat... up to 6... the choice between 2 boats or a boat and 2 shovels". `ensureShovel` crafts it on the first dig with the materials, one at a time, `shovelUses` 6.
  - `addWood` and `addStone` add up to the limit, and never take away wood or stone an older save already holds over it.
  - Chipping a rock with a full pouch is refused without using up the rock. Cutting a tree says when you are full.
- **Crystal poise.** `CRYSTAL.poiseHits` 10 (Tim: "ten hits for a poise break"), `poiseForget` 5, `breakTime` 3.2, `fallTime` .25, `riseTime` .4.
  - Tim first asked for fewer dodges ("dodges after a few hits"). He then changed it: "it dodges a lot, that's fine... it has poise, so if it takes a few hits, then it will break and fall... you can get a bunch of hits in... then it will get up and dodge away". So the generic dodge is unchanged.
  - `crystalPoise` in `monster-pack.ts`, run each tick before the dodge, counts landed blows from hp drops into `pack.poiseHits`. The count is forgotten after `poiseForget` s without one.
  - At `poiseHits` the Crystal breaks (`pack.broken`) and loses any attack, telegraph or grab hold.
  - While broken it is targetable and does not move, dodge or attack. `e.crystalFall` (0 to 1) eases over `fallTime` and `riseTime`. The renderer sinks the Crystal to the floor, tips it over and greys its aura; its two lesser crystals and four circling shards drop out of the tipped frame and clatter to the floor around it with a small bounce.
  - When the break ends, it springs away from the Wayfarer (an immediate evade).
  - `resetPackRuntime` clears the break and `crystalFall`.
- **Crystal dungeon bounds.** `Game.roamerBounds()`, cached against the walker landing graph so it rebuilds when the terrain changes, marks where a dungeon roamer may be:
  - any open (unblocked) tile, so every room counts, including one walking cannot reach (the release 249 decision);
  - any tile touching one;
  - an interior wall with open ground on both opposite sides within `CRYSTAL.boundsSpan` 3 tiles.

  The game loop undoes a roamer tick that ends outside the bounds (not while retreating). A roamer saved outside them is moved to the nearest allowed tile on load.
- **Crystal goals.** Tim: "its end goal should be... a place the player can walk to... it can spend some time between walls". Then: unaggroed "he can just roam around the dungeon... whatever his own ends are... if you do find him... he'll try and find you for a while, until... you die and you leave his aggro area".
  - The pack world's `walkable(x, y)` (dungeons only) is `Game.playerFloor()`: the floor 4-way connected to the Wayfarer's own tile, cached until the terrain changes or the Wayfarer leaves it.
  - Unaggroed patrol (`dungeonPatrolRoute`) still samples the whole domain's open ground, as before.
  - Engaged, `crystalManifest` runs each tick after any attack. Off reachable floor for `CRYSTAL.wallLinger` 2.5 s, the Crystal makes for the nearest reachable floor within `manifestSearch` 10 at `manifestSpeed` 2.4, and blinks onto it if held back `manifestBlink` 1.2 s. It can still attack from inside walls before then.
  - It hunts for a while: out of sight and beyond `roamSight` for `forgetAfter` 12 s (`pack.lostFor`), it drops aggro and resumes its patrol. Sighting it again re-engages it as before.
- **Rift Step.** `constellation.ts` `RIFT` = `{ reach: 2, longStep: 2 }`.
  - The recall (`magicSkills.riftAnchor`) is gone; a stale one from an older save is dropped on the next step.
  - The `anchor` capstone keeps its id and is renamed Long Step: `+RIFT.longStep` reach. The step still stops at walls, ledges and unstandable ground.

**BOUNDARY:**
- The back button was checked in Chromium at 390 px with real history back and Escape: Pack, then pause menu, then play, then pause menu; Atlas, then pause menu. The page never navigated away. Not tested on a phone.
- Pursuit applies only to overworld section edges. Dungeons, the Void Walker's and the Astral Worm's own crossings, and retreats are unchanged.
- A beast that follows is placed fresh by the gate. Its position in the section it left is not kept.
- The pursuit numbers and the Blob split numbers are provisional, not Tim's.
- The Glyphs fix was checked in Chromium at 390 px against a build of `main` (which threw "constlit is not defined" with an empty screen). Glyphs then showed its hosts, sockets, tiles and footer, and Echoes and the Arcanum opened without errors.
- Tests: `tests/world-beast-pursuit.test.ts`, `tests/constellation.test.ts` (Long Step, no recall), `tests/crystal-259.test.ts` (poise break, dungeon bounds, patrol anywhere, settling out of walls when engaged, losing the Wayfarer) and `tests/digging.test.ts` (carry limits; the old chip-then-break total now stops at the stone limit).

## Release 261: world-boss pacing, placement geometry, the Turtle at sea, wood and skiffs, controls and spell presets — 2026-10-21

Tim, 2026-10-21. On rarity: "these world bosses should be more rare... if you meet a world boss, it shouldn't be another world boss for... 8 tiles... unless you put your foot into eight different tiles... you've never been in". On placement: "there should always be a path of retreat for the creature, that's a rule... the large creatures shouldn't really be trapped on... small islands... the questing beast can't be on totally ocean tiles... much, much more rare". On the Turtle: "the turtle can appear in the water... he'll make like a temporary ice floor... walkable tiles... your boat can slide across it... they'll persist for... 5, maybe 10 seconds". On wood and boats: "99 wood and 99 stone... I can have up to 2 boats at a time... I'll just make a boat, and one of them will despawn". On the controls: "the potion should be where the B button currently sits... the A and B... next to each other... a preset button... with the number 1 or 2... two different presets for the spells... the passives won't change".

**CODE:**
- **Pacing.** `world-beasts.ts` `ENCOUNTER` = `{ newSections: 8, chanceScale: .5 }`.
  - `save.beastGap.fresh` (additive at schema 14, normalised in `ensureWorldBeasts`; a save without it starts ready) counts first visits. `Game.loadArea` calls `noteSectionVisit(save, !prior)` where it writes the atlas entry, before any beast is placed.
  - `worldBeastFor`, `questingBeastFor` and `worldBeastForDungeon` claim nothing new until `encounterReady`, and a claim calls `encounterMet` (fresh = 0). A claim that finds no ground to stand on gives the buffer back.
  - World beast and Questing Beast chances are multiplied by `chanceScale`. Dungeon haunt chances are unchanged (they are per dungeon).
- **Placement.** `PLACEMENT` and `placementRegions(map, id)` flood a section over the ground a beast can stand on or cross in its retreat (`beastGround`, or `retreatPassable` for its `retreatMoves`). A region is sound when it touches a section edge and holds at least `minRegion` 40 tiles (`big` 120 for `bigBeasts`).
  - `worldBeastFor` places a new beast only on sound ground. A beast already met (`tries` > 0) keeps any ground it had.
  - "Through" movers (the Turtle, the Knight) and marine beasts can always leave.
  - `questing-beast.ts` `QB_SEA`: no claim in a section at least 90% ocean; the chance is ×.25 over 30% ocean.
- **The Turtle at sea.** It joins the marine lists: `refreshMarineBeast`, spawn ground, pack-world `los`, and the no-phase rule.
  - `Game.tickSeaIce` (every `TURTLE.seaIce.tick` .5 s) turns open sea (`marineTileOpen`) within `radius` 2.2 into `seaIce` tiles (`blocked: false`, `seaIce: true`), keeping the original tile.
  - Each ice tile thaws `life` 8 s after the Turtle last froze it, except under the Wayfarer's footprint.
  - `seaIce` is in `BOAT.waterKinds`, so a skiff slides over it. `renderer.ts` `seaIceTile` draws it.
  - The ice is transient: cleared on section load, never saved. Because it is batched, the ground cache redraws at most every half second.
- **Wood, stone, skiffs.** `WOOD.carry` and `DIG.carryStone` are 99.
  - `save.boat.spare` (additive) is a second moored skiff `{ rx, ry, x, y, hull }`. `buildSkiff` turns a moored skiff into the spare, and an older spare is gone. `takeSpare` swaps them.
  - `Game.placeSpareSkiff` shows the spare as the `skiff-spare` object in its section, and boarding it calls `takeSpare`.
- **Controls and presets.**
  - In `index.html` and `proving-ground/index.html`, Potion moves into the cluster at Spell B's old corner (`.action-diamond button.potion`). Spells A and B move into `.quick-row` side by side. A `data-action="preset"` square follows Map and Pack. `input.ts` adds the `preset` action (key T).
  - In `spell-slots.ts`, `magicSkills.presets` (two `{a, b}`) and `magicSkills.preset` are normalised in `ensureSlots`; both start as the slots. `setSlot` writes the active preset, and `togglePreset` swaps.
  - `game.ts` toggles the preset on the `preset` action. `main.ts` shows the number on the button and adds a Preset 1 / Preset 2 row to the Arcanum's Spell slots.

**BOUNDARY:**
- Encounter state already in saves is left alone. Only new claims are paced and placed by the new rules.
- No beast's strength changed; Tim: "let's not change anything yet".
- The ice floor never forms over structures or anything that isn't open sea.
- A skiff over ice obeys the usual sailing rules.
- The HUD was checked in Chromium at 390×844 and 844×390, before and after opening and closing the Pack, and the ice in the real renderer. Not on a phone.
- The numbers (8 sections, chance ×.5, region sizes, ice radius and life, Questing Beast sea shares) are provisional, not Tim's.
- Tests:
  - `tests/encounter-pacing.test.ts` (the buffer, placement, the Questing Beast and the sea);
  - `tests/turtle-sea-ice.test.ts`;
  - `tests/wood-boats.test.ts` (two skiffs);
  - `tests/spell-slots.test.ts` (presets);
  - `tests/digging.test.ts` (the 99 limits).
- Fixtures that relied on the old numbers now say so:
  - `tests/astral-natural-encounters.test.ts` finds its encounters at full chance;
  - the Walker hunt fixture gets open ground;
  - the "nowhere to stand" example is the Blob;
  - `tests/beast-ocean.test.ts` lists the Turtle as marine.

## Release 263: Echo drops, Crossing Sigils, safe dungeon arrivals, the boss gap, the Turtle's ice, hull shields, skiffs and shovels, spells by the compass — 2026-10-21

Tim, 2026-10-21. On Echoes: "there should be a pretty low chance to drop them... from different guardians... make sure that all the creatures that can [leave Echoes] can also be guardians". On sigils: "they're too rare... when you kill these world bosses... and the [Gate Revenants], those will drop crossing sigils... the first guardian in a dungeon won't ever drop a crossing sigil. Only the second guardian... ultra rare". On arrivals: "I spawn into like right next to The Guardian... I should not spawn next to The Guardian". On the gap: "8 consecutively different tiles. They don't have to be completely new". On the Turtle: "one ice floor whenever it stops doing its combo attack... if the ice dissolves while you're standing on it, then you will fall into the deep water". On boats: "a boat deployment shield... buy them from the boatman... last for like 3 minutes"; "if I go to the edge of the water and hit action, I should be building a boat and getting on that boat and moving". On shovels: "one shovel will only dig two blocks, and then it breaks". On the HUD: "the AB spells should always be positioned next to the compass, permanently".

**CODE:**
- **Echo drops.** `echoes.ts` `echoDrop` read `enemy.packKind` as the creature id, but `packCombatantFields` sets `packKind: true`, so no real kill ever matched an Echo. `echoKindOf` uses `kind` when the flag is a boolean.
  - `ECHO_DROPS = { guardian: 3, ordinary: 0 }` (percent; Tim: "Okay three percent"). The roll is `rng(key)()`, not the raw hash modulo 100, which ran at about a third of the stated chance when only the drop counter changed. `Game.defeatEnemy` passes `guardian` for `boss`, crossing guardians, world beasts and the Questing Beast.
  - `monster-pack.ts` `GUARDIAN_POOL` gains `pallidCrawler`, the one non-unique creature with an Echo that could not guard. A dungeon keeps the guardian stored in `history.guardianKind`, so only dungeons never entered draw from the wider pool.
- **Crossing Sigils.** `game.ts` `SIGIL_DROPS = { worldBeast: 20, gateRevenant: 1, deepGuardian: 3, threefold: 6 }` and `sigilDrop(save, e, map, n, first)`. `takeFirstSpoils` marks `save.worldBeasts[id].spoils` / `save.questingBeast.spoils` (additive, kept by the ensure functions): a beast's first kill since 263 gives a Sigil and, through `echoDrop(..., certain)`, its Echo for certain; later kills a 20% Sigil chance (Tim: "The first time you kill it, there's a hundred percent chance... But each time [after], there's a twenty percent chance"). Any `gateRevenant` gives one; a guardian (`isDungeonGuardian`) on level index 1 or more of a `multiLevel` map has a seeded 3% chance, and any guardian of the Threefold Deep (`map.name`) 6% (Tim: "a slightly greater chance"). Summons and `noRewards` give none. `defeatEnemy` adds them to `save.consumables.crossingSigil`.
- **Arrivals.** `ARRIVAL = { clear: 8, search: 2000 }` and `clearArrival(map, width, at, enemies)`: when a living guardian is within `clear` tiles, a breadth-first walk over open floor (`footprintOpen`) finds the nearest spot clear of all of them (the farthest reachable one when none is). It runs after a `deepTransition`, after being felled in a dungeon, and on re-entering one at its anchor.
- **The gap.** `ensureBeastGap` adds `recent` (the last `newSections` different section keys). `noteSectionVisit(save, key)` counts a section only when it is not in `recent`; `Game.loadArea` passes `"rx,ry"`.
- **The Turtle's ice.** `TURTLE.seaIce = { radius: 2.6, life: 8, tick: .5, settle: 1 }`. `Game.tickSeaIce` marks a Turtle that attacks (`e.pack.attack`), and once it has made no attack for `settle` s freezes one patch where it stands. Ice thaws on schedule even under the Wayfarer; the existing deep-water rule then applies.
- **Hull shields.** `boats.ts` `BOAT.shield = { price: 40, seconds: 180 }`, `buyHullShield`, `deployHullShield` (aboard only; refreshes, never stacks) and `tickHullShield`. `save.boat.shield` (seconds) and `save.consumables.hullShield` are additive and normalised in `ensureBoatState`. While shielded, `hullAbsorb` keeps the hull's share off the Wayfarer without touching the hull, and `hullStrike` does nothing. The Shipwright offers `buyShield`; the Pack's Supplies list deploys it (`useConsumable("hullShield")`); `renderer.ts` rings the skiff and adds a shield bar under the hull gauge.
- **Skiffs at the shore.** `SHORE_PASSIVE` (`tree`, `rock`): when the nearest object is one of these, Act at the water's edge builds the skiff instead, if `canBuildSkiff`. `buildSkiffHere` gives the skiff a push away from the shore (`BOAT.pushOff`).
- **Shovels.** `DIG.shovelUses` is 2; `DIG.heldUses` 6 is the clamp in `ensureDigging`, so a shovel saved with more uses keeps them. Crafting on the next dig was already automatic (`ensureShovel`). The dig messages say how many digs are left.
- **Spells by the compass.** In `index.html` and `proving-ground/index.html` the `.quick-row` moves inside `.left-controls`, after the compass. `styles.css` lays the left controls out as a grid: compass and spells on the first row, Map, Pack and the preset button on the second.

**BOUNDARY:**
- Saves stay at schema 14. All new fields are additive and normalised.
- No creature's strength changed.
- Echoes already owned stay owned; nothing is reset.
- The arrival fix moves the Wayfarer only along floor they could walk; it never moves a guardian. The reported spawn did not reproduce in a scan of overworld dungeons (10 multi-level dungeons, 15 descents), so the fix covers every way onto a level.
- Boat dodging already granted the land dodge's 420 ms of invulnerability, and the hull is only struck when the Wayfarer is, so a dodge already protected the hull; nothing changed there. Rift Step already blinks along the last movement direction.
- The HUD was checked in Chromium at 390×844, 844×390, 884×1104, 1104×884 and 360×740. Not on a phone.
- The numbers (3% sigil, 6% Threefold, 8-tile arrival gap, 2.6 ice radius, 1 s settle, 40 marks, 3 minutes) are provisional except where Tim named them (3% Echo, 2 digs, 3 minutes).
- Tests:
  - `tests/echoes.test.ts` (rates and a real guardian kill);
  - `tests/sigils-arrival.test.ts`;
  - `tests/encounter-pacing.test.ts`;
  - `tests/turtle-sea-ice.test.ts`;
  - `tests/wood-boats.test.ts` (shields, building at the shore);
  - `tests/digging.test.ts`.

## Release 265: building, the Refuge's lands and regrowth — 2026-10-21

Tim, 2026-10-21. On building: "you can build walls out of stone or wood... in the pack menu, you can... select which wall type... if you build it out of wood, it'll be like a thin wooden wall... it'll block enemy attacks and enemies can't walk through it... a wooden wall would block one enemy attack... you can stand on a [stone block]... stack 2... If you put a [block] into a chasm, into water... it won't even let you do that... they despawn after 10 seconds... we'll put the... building block tool down where the A button is... the max blocks you could have out... is 5... world bosses... charge through... melee attacks... will destroy the blocks... they'll stop the damage... any range attack... 2 attacks for a stone block, and one attack for a wood wall". Then: "2 hits on the stone block". On regrowth: "the trees and The Rocks around the town will just repopulate in a widening circle... the more you explore, the more area around the ember refuge gets populated. We'll just do the ember refuge for now". On the lands: "a farm near the Ember Refuge and a quarry... a farmer... says... you're turning the corridor into fuel... cryptic, enigmatic things... you won't be able to buy stone... the quarry and the farm will be populated first".

**CODE:**
- **Building.** New `src/building.ts`: `BUILD = { kinds: { wood: { cost 5 wood, hits 1 }, stone: { cost 10 stone, hits 2, stack 2 } }, life 10, maxOut 5, breakReach .9 }`.
  - `save.build.kind` is additive and normalised by `ensureBuild` in `freshSave` and `migrateSave`. The Supplies tab chooses it, and the HUD's `data-action="build"` button (key B; an inline SVG hammer, Tim: "The build button can just have a hammer") raises one via `placeBuild(game, buildSpot(player))`.
  - A build replaces its tile and keeps the original (`buildOrig`). A wood wall is `blocked`, with `buildRun` "v" when built while moving left or right and "h" otherwise (Tim: "if I'm just not moving, it can just be the standard regular fence, but if I'm moving to the side it'll be positioned that way"); only its drawing differs. A stone block is a `perch` with `elev` +1 per level (stacked blocks share a tile, and the top one goes first).
  - `footprintOpen` refuses a perch unless `allowLethalTerrain` is set, which only the Wayfarer's movement and fliers pass. So creatures cannot step on it, and `canStep` makes the Wayfarer jump onto it as onto any ledge.
  - `buildRefusal` refuses map edges, lethal or water kinds, ice, slopes, structures, blocked ground and occupied tiles.
  - Builds are transient: `Game.builds` is cleared on every area load, never saved, and `tickBuilds` expires them.
  - **Absorbing hits.** `buildBetween(game, source)` finds a build on the line to the Wayfarer, skipping the tiles of the source and of the Wayfarer's feet.
    - `packHurt` gives the blow to it (`strikeBuild`); a world beast's or Questing Beast's `melee`-tagged attack smashes it outright.
    - Ordinary creatures' melee in `update` does the same.
    - `updateProjectiles` takes an `onBuildHit` callback: a hostile shot entering a build tile, other than the one under the Wayfarer, dies there and strikes it.
  - `tickBuilds` also breaks every build within a world beast's body plus `breakReach` while it rushes (`voidDashing`, `sliding`, `thrusting`, `spinning`, `giantThrust`, or a pack attack tagged charge, dash, leap, combo or phase).
  - `renderer.ts` `buildTile` draws planks or a stone block (two courses when stacked) over the original ground.
  - `styles.css` puts `.action-diamond button.build` in Spell A's old corner.
- **The Refuge's lands.** New `src/refuge-lands.ts`.
  - `refugeLands(seed, suitable)` takes the first two suitable sections (dry, open land, no hamlet or open sea) from a seeded order of the twelve around the Refuge, never side by side: the farm and the quarry.
  - `plantRefugeLands` adds the farm's 6 canopy trees (`farm-tree-k`), the quarry's 10 rocks (`quarry-rock-k`), Shale the quarry keeper (`quarry-keeper`, a `villager` with `quarryTurtle`, drawn by `renderer.ts` `quarryTurtle`: a small fitted-stone turtle in a straw hat; Tim: "a small stone turtle... very straightforward... no ice on him... wearing a hat"), and the farmer `refuge-farmer` (a `villager`) in the Refuge, all with stable ids. It runs at every overworld load, after the landscape.
  - A villager with a `talkKey` says `talkLine` on each word, counted in `worldFlags[talkKey]`. The farmer's lines are two that point the way, then `FARMER_LINES`; Shale's are the plain `QUARRY_LINES`.
- **Regrowth.** `REGROW = { every: 20, maxRadius: 5 }`.
  - `save.regrowth = { epoch, mark, done }` is additive. An older save's `mark` starts at its atlas size; `migrateSave` drops the fresh default when the raw save had none.
  - `Game.loadArea` calls `noteDiscovery` on a first visit: every 20 atlas entries is a new epoch.
  - After saved objects are restored, `regrowSection` sets environmental trees back to `standing` and rocks to `sealed`, and clears their cut, chip, break, move and ignite flags. This happens once per epoch per section, on the farm and quarry, and within `ringFor(epoch)` sections of the Refuge. Trees with `crossingTiles` and story rocks without `environmental` are left alone.

**BOUNDARY:**
- No creature's strength changed.
- Saves stay at schema 14.
- Builds are never saved.
- The farm, quarry and farmer are added to their sections in existing journeys too (new objects with new ids; nothing existing moves). Tim asked for them in his world.
- In dungeons, which have no levels, a stone block is still a perch creatures can't enter but needs no jump.
- The absorbing rule is the line between attacker and Wayfarer. A ground attack aimed at the Wayfarer's own tile is also stopped when a build stands on that line.
- The numbers Tim gave are 5 wood, 10 stone, 1 and 2 hits, 10 s and 5 builds. The rest (`breakReach`, 6 trees, 10 rocks, every 20, radius 5) are provisional.
- Tests:
  - `tests/building.test.ts`;
  - `tests/refuge-lands.test.ts`.

## Release 267: build mode, and the wall-trap fix — 2026-10-21

Tim, 2026-10-21: "build will be like another one of those toggle buttons... when you just press the button, it'll just build... the standard block or the standard fence... when you have it toggled on... you tap the screen... it'll build... in one of the 8... directions... with its longitudinal axis... perpendicular to that direction heading... 3 character lengths away... if your finger is farther away than three character lengths, it'll... cast the fence at the maximum distance. If your finger is within those three character lengths, it'll cast it exactly where you click"; "always aim at the tap". The pre-publish Fable review of release 265 found the trap fixed here.

**CODE:**
- `building.ts` `BUILD.reach` 3 and `tapTarget(player, wx, wy)`: the target tile is the tap, or `reach` tiles from the Wayfarer's feet along the same line. The fence's `buildRun` is at right angles to the heading snapped to the nearest of 8 directions: "v", "h", "ne" (/) or "nw" (\\).
- `placeBuild(..., moving, run)` takes the run.
- `Game.buildAt(wx, wy)` builds there. The `build` action now also sets `save.aimMode = "build"` (the constructor accepts it), and `main.ts` and `proving-ground.ts` send world taps in build mode to `buildAt`. `main.ts` marks the Build button `selected` in build mode.
- `renderer.ts` draws diagonal fences.
- **Trap fix.** `placeBuild` refuses a wood wall on any tile the Wayfarer's walking footprint (x+.24..x+.76, y+.5..y+.88) overlaps. A wall there closed the footprint, and `moveAxis` could not move from a closed position. `Game.loadArea` clears `builds` on every load, not only overworld ones.

**BOUNDARY:**
- Stone blocks never trapped anyone: a perch is open to the Wayfarer's movement.
- Build mode uses the same 5-build limit and costs.
- A fence's run is only how it is drawn: it blocks its whole tile.
- Tests: `tests/building.test.ts` covers build mode and the trap.

## Release 563: regional threat weighs more far out — 2026-10-29

Tim (2026-10-29, at ring ~160 where the Wayfarer card read "enemy vitality ×7.80"): "if the distance between you and the Ember
Refuge [is] 100 or over, then it should be like... 10... [over] 200... 20... make the distance of exploration more weighty".

**CODE:** `src/world.ts` `REGIONAL_THREAT`, rows of [from ring, vitality per ring, damage per ring]: 0 (.08, .05), 10 (.04, .025),
60 (.155, .035), 100 (.1, .035). `regionalThreat` sums them up to the section's ring (straight-line distance from 0,0) and rounds
to six places. Vitality ×3.8 at 60, ×10 at 100, ×16 at 160, ×20 at 200; damage ×2.75, ×4.15, ×6.25, ×7.65. XP unchanged.

**BOUNDARY:** Balance only. Applied as before, to creatures spawned fresh in a section (game.ts `scaleFresh`); creatures already
saved in an area keep their health and damage. Rings up to 60 are unchanged (the 399 and prototype tests at rings 10 and 20 still
hold). Aperture does not enter regional threat; it adds Aperture encounters and Resonance instead.

**FIX (pre-publish Fable review of 555→561):** 557's `hamletSection` exclusion of the Mouth's section dropped a hamlet that
about 3% of seeds had built there (the Far Sleep did not always prevent it), for journeys that explored the Mouth before 557.
`settlements.ts` now splits the seed's roll (`hamletRoll`) from `hamletSection` (which still excludes the Mouth) and adds
`legacyMouthHamlet(save, rx, ry)`: true for the Mouth's section when its atlas record pins `hamletVersion` and a `dreamVersion`
below 3 (first seen before 557) and the roll falls there. The landscape `hamlet` flag and `applyHamlet` (as `force`) in
`game.ts` (loadArea and `walkerCrossingMap`) and `astral-world-retreat.ts`, and the Atlas town labels (`main.ts`,
`atlas-view.ts`), honour it, so that ground is as it was.

## Release 561: windups held, never cancelled; no ordinary stun-lock; deep wardens — 2026-10-29

Tim (2026-10-29, a new journey): "the guardians for the threefold deep are comically easy to kill... they can get stunlocked...
when monsters are winding up to attack. If I just shoot them, they won't attack... they should still finish their attack... only
monsters that we've... specified have poise... everything gets hitstun, that's fine... But it's way too easy to stun lock
everything".

**CODE:**
- `src/monster-pack.ts`: `WINDUP_STAGGER.max` and `windupHeld(e, held, dt)`: while hit-stunned in a windup the foe is held, up to
  `max` seconds per attack in all (`held` is the attack's own record: the pack brain's `s.data`, the classic brain's
  `e.windupStagger`, cleared when the blow resolves); then its stun is cleared and the windup runs on. The pack brain's line that
  ended a non-boss's attack on a stun now holds it instead, bosses included. `STAGGER_GOVERNOR` gains the class "ordinary"
  (`limit .6`, guard `guardBy.ordinary` 1.5 s) for every foe `staggerClass` does not name.
- `src/game.ts` `updateEnemyAI` (the classic brain): a stun no longer zeroes `telegraph` or drops `meleePhase` mid-windup; it holds
  them under the same rule. `DEEP_WARDEN` (hp ×2.4, damage ×1.25, faster and readier) for a deep dungeon's objective guardians,
  which had a crossing guardian's ×1.35.
- Tests that encoded the old rule were updated at Tim's word: a staggered Void Sentinel's committed stab (gameplay-integration) and
  the 377 governor's "a common foe can still be kept staggered".

**BOUNDARY:** Balance only, at spawn and in the brains; no generator or save change. Poise breaks (BOSS_POISE, the Crystal's, the
Gate Revenant's) are unchanged. The Aperture encounter Tim saw (the ring and rotating star is the `orbital` trait, given to every
tier-3 Aperture encounter: Aperture 36 and up) is already gated by Aperture and was not changed.

## Release 559: the Atlas in real colours, honest relay markers, QUEST COMPLETE — 2026-10-29

Tim (2026-10-29): "the colors on the atlas... don't correspond to the tiles that you actually visited... I want to see the world
that I actually am exploring"; "when you complete a hunt or... whatever quest... just get a banner... quest complete"; "the
relays seemed to be too rare... it says that there are relays in these areas... the purple triangles... if there's no relays in
the area, then it shouldn't show up on the map". He also set down what the Corridor is made of (narrative bible, section 1).

**CODE:**
- New `src/atlas-colors.ts`: `ATLAS_TILE_COLORS` (each tile kind's base colour, from the two ends of its PAINT gradient or PAL
  pair) and `sectionAtlasColor(map)`, the mean over the section's tiles. `game.ts` writes it into the atlas record (`color`) on
  every entry. `main.ts` draws `record.color` first, zoomed in and out; a heard Reading tints a coloured section at
  `ATLAS_READING_TINT.coloured` (.14). `atlasBackfill()` colours records without one while the Atlas is open, nearest the view
  first, one `walkerCrossingMap` per frame, redrawing every `ATLAS_BACKFILL.redrawEvery`. Registered in `scripts/build.mjs` and
  both `sw.js` lists.
- `src/relay-network.ts`: `RELAY_PLACEMENT` 3 and `relayHeld(seed, rx, ry, pattern)`: a crossing decided from 559 holds a relay
  where its section's cell is alive (`relayCell`), recorded as `history.relayPattern = 3`; version 2 kept edges only.
  `knownRelaySections(save)`: explored sections with a crossing site whose crossings hold a relay ("dormant", by decision, or by
  `relayHeld` when never entered), plus answered relays. `main.ts` draws triangles and the zoomed-out violet pixels from it only.
- QUEST COMPLETE: the Viewport hunt's completion pushes onto `game.questNotices` (it was a `defeatNotice` that a world beast's
  banner in the same frame could overwrite). `main.ts watchQuests` drains it, and every 500 ms notices Old Quillon's errand
  done, the seventh bell and the Surveyor's Chain complete, comparing with what it saw last (the first look at a journey
  announces nothing); banners show `QUEST_BANNER.gap` apart. `styles.css` `#eventBanner.quest` is gold.
- `docs/narrative-bible.md` section 1: "What the Corridor is made of".

**BOUNDARY:** Schema stays 14; `atlas[...].color` and `relayPattern` 3 are additive. Ground, generation and relay decisions
already made are unchanged; only crossings first entered from 559 use the alive-cell rule. The fill-in is read-only
(`walkerCrossingMap` never advances a visit) and runs only while the Atlas is open; a section whose map cannot be built gets the
old ash colour. The first look at a journey never raises a banner.

## Release 557: Far Sleep pockets, hunts off explored ground, traps by level, the robot to sea — 2026-10-29

Tim (2026-10-29): far out "everything just is mostly just the dreamlands... I like variation where you never know what you're
gonna get"; old hunts "set in the viewport before I... explored the tile... sets it to another unexplored tile"; "the dungeon
traps... should scale with your level... you can mitigate the trap damage with your build, but they should still be
impactful"; "if you're in the robot and you go into the water, it doesn't smoothly transition to... the water version".

**CODE:**
- `src/landscape.ts`: `DREAM_VERSION` 3 and `DREAM_POCKETS`. `dreamPocket(seed, rx, ry)` mixes a broad value noise over sections
  with a per-section roll whose weight grows past the Far Sleep's edge (`scatterMax`, `scatterOver`); `applyDream` at version 3
  leaves a section that is not a pocket untouched, so it keeps its biome. Pocket ground is version 2's (`DREAM_BY_VERSION[3]`).
- `src/foundry.ts`: `HUNT_RETARGET`, `retargetExploredHunt(save, id, opts)`. `acceptViewportHunt(save, id, opts)` calls it first:
  an available or deferred hunt whose target (a tracking hunt's final target) is explored, with no trace followed and no territory
  section entered, moves to an unexplored section on the nearest ring round it (seeded order, `opts.avoid` respected). A tracking
  hunt's traces are laid again from the Wayfarer's section. The summary's "near x,y" follows. `Game.huntSiteAvoided` is the rule
  new postings already used, now shared with `main.ts`'s Accept button.
- `src/dungeon-traps.ts`: higher shares (sigil .07, lava .18, dart .09, vortex .22, `TRAP_DAMAGE_SHARE` .15) scaled by
  `trapShareScale(level)` = min(`TRAP_LEVEL_GROWTH.max`, 1 + `perLevel` × (level − 1)). `updateTraps` (the old fire and spike
  traps) takes the level. Mitigation is unchanged.
- `src/game.ts` `robotPutsToSea`: in the open world, the robot stepping onto water the skiff can sail boards the owned, sound
  skiff there and sets `save.boat.mechSub`; `boats.ts submersible()` counts it while aboard, `disembark` clears it, and the
  renderer and dive-site actions read it. `save.mech.active` is untouched, so landing stands the robot up again.
- `src/game.ts` `WAYGLASS_ZONE` and `Game.wayglassNear()` (Tim, mid-task: "if there's a weight glass and near water... it's gonna
  be prioritized... you won't be able to make a boat there"): with no object named, `interact()` takes the nearest usable
  checkpoint or relay within `reach` before `nearestObject()`; `buildSkiffHere`, `robotPutsToSea` and the shore hint refuse inside
  the zone. `interactAt` (a tap in Act aim) still names its object, so a person tapped by a Wayglass answers.
- `src/settlements.ts` `hamletSection`: never the Mouth's section (`relayCoordinate`). The Far Sleep used to keep a hamlet off it;
  with pockets the 373 rule (open land until the Listener falls) is stated directly.

**BOUNDARY:** Schema stays 14; `boat.mechSub` is additive and normalised in `ensureBoatState`. Explored sections keep their
pinned `dreamVersion` (1 or 2), so Tim's current far ground does not change; only sections first seen from 557 use pockets.
Dream halls (dungeons) and Readings still follow depth. A hunt already accepted, or under way, is never moved. Without a skiff the
robot wades as in 507; dungeon water is unchanged. No frame is spent or fitted by the robot's voyage.

## Release 555: areas saved separately; the probe sees long frames, heap and saves — 2026-10-29

Tim's probe (2026-10-29) showed 83–108 ms frames every ~8 s with ~1.5 ms of game work in them: the autosave. IndexedDB `put`
structured-clones its whole value on the main thread, and a journey's `session.areas` holds every area ever visited.

**CODE:** `src/persistence.ts` stores a journey as a main record (`journey:N`, its `session.areas` replaced by `null` and
`session.areasSplit`, the list of area keys) plus one record per area at `journey:N::area::<areaKey>`. `splitSnapshot(snapshot,
known)` returns that main record and the areas to put: those whose snapshot copy is not the one already stored (`storedAreas`,
by identity; release 167's `snapshotSave` already reuses the copy of an unchanged area). `writeJourney` puts them and the main
record in one transaction and deletes area records no longer listed; `readJourney` reads the main record and, when it is split,
the area records, and `assembleSave` puts them back. `loadSave` primes `storedAreas` from a journey it read split, so the first
autosave after launch writes only what changed. `removeJourney` deletes both. Every slot read, write and removal (rename,
duplicate, import, recover, delete) goes through these. `setWriteTimingListener` reports each write's main-thread put time and
area count to `main.ts`, which passes it to the probe. `src/game.ts`: the one place an area's stored state was edited in place
(a crossing hunter leaving its old area) now replaces it, so the save sees the change. `src/diagnostic-probe.ts` adds `loafs`
(the 40 longest Long Animation Frames, or long tasks where that API is missing: blocking, render and style/layout time and the
top three scripts), `heap` (start, min, max and drops over 2 MB, from `performance.memory` where available; long frames also
carry the heap at that moment) and `saves` (each write's put time and areas written).

**BOUNDARY:** Schema stays 14. A journey stored before 555 (areas inside the main record) loads unchanged and is split on its
next save; `migrateSave` turns a split main record read without its area records into empty areas rather than failing. The
localStorage mirror and exported journeys still hold the whole journey. The probe's new fields are empty in browsers without
the APIs (Safari has no Long Animation Frames or `performance.memory`).

## Release 553: presets keep weapon and tool only — 2026-10-28

Tim: "armor shouldn't swap with the preset and should just be tools. Spells, skills and weapons... armor stays the same, like... the Quiet Compass".

**CODE:**
- build-presets.ts:
  - `PRESET_GEAR_SLOTS` is `primary` and `secondary` (541 also had armor).
  - `ensurePresetGear` moves any held armor into the pack before normalizing, in `freshSave` and `migrateSave`, so release 545 saves lose nothing.
  - The swap message names only weapon and tool.
- main.ts: the Gear tab's note lists only weapon and tool.
- tests/preset-gear-541.test.ts: its armor test is replaced by this behaviour, at Tim's word, and a test covers the returning armor.

**BOUNDARY:**
- `presetGear` loses its armor key; the piece moves to `inventory`.
- The pack can briefly sit above its capacity if it was full. Nothing is salvaged for it.

## Release 551: the Surveyor's Chain, part two — 2026-10-28

The daily narrative session (Tim's routine), docs/narrative-bible.md section 7, step 6. Section 6, thread 2 reads: "With all twelve links, the last dungeon's map turns out to be the overworld. The thread ends at his statue". Section 4 reads: "At the end he is found as a statue at the edge of the Far Sleep, measuring himself".

**CODE:**
- surveyor.ts:
  - `surveyorComplete`.
  - `surveyorStatueSection` records `save.lore.surveyor.statue` once: the first Far Sleep section (|rx|+|ry| = `FAR_SLEEP_DEPTH` + 1) along the line from the Refuge through the twelfth link's crossing. It has a seeded fallback.
  - `surveyorChainPath` gives the crossings in link order, then the statue.
  - `addSurveyorStatue` places it on open ground nearest the middle of its overworld section, once.
  - `visitSurveyorStatue` sets `statueSeen`.
  - `SURVEYOR_STATUE_LINES`: original writing.
- game.ts:
  - The overworld load calls `addSurveyorStatue`.
  - Taking the twelfth link adds the Atlas line to the message and writes `journalOnce(surveyor:map)`.
  - The `surveyorStatue` interaction writes `journalOnce(surveyor:statue)`.
- renderer.ts: `drawSurveyorStatue` draws a kneeling figure in pale stone on a numbered plinth, with a brass chain from boot to hand that glints until visited.
- main.ts, the Atlas (`drawAtlasPins`): a dashed brass line through `surveyorChainPath`, a bead at each crossing, and a pale "Abel Corwin's statue" flag at its end.
- docs/narrative-bible.md step 6 updated.
- tests/surveyor-551.test.ts.

**BOUNDARY:**
- Additive fields in `save.lore.surveyor` (`statue`, `statueSeen`).
- No generation change: the statue is an object placed on load, the way town amenities are.
- The Torn Pages remain.

## Release 549: three Arc Waves — 2026-10-28

Tim: "for the blunderbuss, instead of shooting a single crescent, it'll shoot three crescent waves... in a cone... they would follow the same path of the blunderbuss's original shots, but they'll just replace the shots with crescents".

**CODE:**
- game.ts fireSecondary: with Arc Wave held, the main shot becomes a wave first, and then the pellet loop runs as always. Each pellet copies the wave, so all three shots are crescents along the cone.
- tool-forms.ts: `ARC_WAVE` is per wave now: share 1 (was 2.2 for the single wave) and grow .5 (was .75). Pierce and speed are unchanged.
- tests/tool-forms-533.test.ts expects three waves; this follows Tim's request.

**BOUNDARY:** Runtime only. Three projectiles per shot, as without the passive.

## Release 547: Fire Burst — 2026-10-28

Tim: "a spell... fire burst or something, which just launches out a series of fireballs that fly a short distance and explode... look exactly like those [cracked ember shells]" (with a screenshot of a dark shell with a glowing crack).

**CODE:**
- items.ts: `SPELLS["fire-burst"]` (cooldown 5, radius 1.1, damage 9, maxRange 6). It has no unlock tier.
- spell-slots.ts: `CASTABLES["spell:fire-burst"]` (fire, ✺).
- tool-forms.ts:
  - `FIRE_BURST` (count 5, spread 1.4 rad, reach 2.6 tiles, speed 9).
  - `drawToolForms` draws the shells (`fireBomb`: a dark shell, a turning three-armed glowing crack, a halo) and the flame (`fireBurst` effects: a radial burst that swells and fades).
- game.ts:
  - `castFireBurst` aims at the lock, else the nearest foe in reach, else the way you face, and throws `count` grenade-path magic projectiles in a fan.
  - Each shell lives `reach × glyph range / speed`, carries spell damage (Focus, glyph damage, pairing and armor spell bonuses) and blast radius (glyph radius), with `glyphHost: "spell"` and `glyphSpell`.
  - The projectile detonation now carries `glyphSpell` and a `fireBurst` flag onto its blast, so the blast uses the spell's own glyphs.
  - The cooldown is reduced like other spells'.
- combat-visuals.ts skips `fireBomb` in the batched pass.
- tests/fire-burst-547.test.ts.

**BOUNDARY:**
- No save change.
- At most five shells per cast; they are bounded runtime projectiles.
- Echo glyphs do not repeat the fan.

## Release 545: the full pack, first in first out by tier — 2026-10-28

Tim: "the pack... salvages... first in first out... ranks it by power first. So the most powerful ones don't get salvaged... leave the relic and higher quality weapons at the top... if they're all the same tier... salvage the first one that you got... when you... buy something and your pack is full, the item disappears... It should... salvage the oldest least priority item".

**CODE:**
- game.ts:
  - `packKeep(item)` is `ITEM_TIERS` index × 2, plus 1 if the piece has been worked on (`upgradeRank`, `masterwork`, `extraSockets`).
  - `packVictim(save, spareBrawler)` returns the pack's lowest-keep piece; ties go to the lowest index, the oldest, since the pack only appends.
  - `storeInventoryItem(save, item, keep)`:
    - A drop whose keep is below the victim's is salvaged on arrival. Otherwise the victim is salvaged and the drop is kept.
    - At equal keep the oldest piece goes. Before, the decision used `itemScore`, and an equal-scoring drop was salvaged.
    - `keep` (purchases) always stores the item.
  - The two shop purchase paths no longer refuse "Pack is full". They store with `keep` and name what was salvaged.
- Release 513's rule, never letting new brawler gear push out other brawler gear, stands.
- Tests:
  - tests/pack-order-545.test.ts (new).
  - tests/brawler-loot-513.test.ts: a same-tier second Hammerfall now replaces the older copy (was: salvaged on arrival). One copy stays either way, as Tim's FIFO rule asks.

**BOUNDARY:**
- No save change.
- A purchase is always kept, even when that means salvaging a higher-tier piece from a pack full of better gear.

## Release 543: the Wayfarer rises with the big robot — 2026-10-28

Tim: "when the robot jumps you see the character's legs just hanging out beneath the suit". Then: "the way the robot functions right now is great... the character's head moves up-and-down as the robot walks... just that when you jumped his legs hang out the bottom. That's the only real problem."

**CODE:**
- renderer.ts, the player draw: with the robot up and not empowered, `actor` is drawn at `lift + mechLift`, the same height as the robot's back and front layers. Before, it was drawn at `lift` only, so a boost raised the robot by `mechLift` and left the Wayfarer's legs below it.
- Otherwise the robot is unchanged. An eyes-only pilot was tried and dropped at Tim's word.

**BOUNDARY:** Drawing only.

Also in 543, the sling. Tim: "a pack that can have... ten items... a sling... they don't count to what your inventory space... you don't have to see them when [you] select... items that you want to save... weapons or tools that you've masterworked".

**CODE:**
- sling.ts (new module; registered in scripts/build.mjs and both sw.js lists):
  - `SLING.size` is 10.
  - `ensureSling` keeps gear only, normalized, and never drops a piece. It is called in `freshSave` and `migrateSave`.
  - `toSling` moves a piece in from the pack. `fromSling` moves it back when the pack has room.
  - `equipFromSling` equips straight from the sling; the replaced piece takes the slung piece's place there.
- main.ts, Pack → Gear:
  - A Sling section above the carried equipment, with Equip and To pack buttons.
  - Each pack card gets a “To sling” button.
  - Slung pieces are not in `save.inventory`, so Select all, salvage, selling and the pack's space never see them.
- tests/sling-543.test.ts.

**BOUNDARY:** `save.sling` is additive at schema 14.

## Release 541: each preset keeps its own gear — 2026-10-28

Tim: "when you set an item or a tool... in your preset, it does not become deselected or unequipped... It's like your character just has a second item slot... a second weapon slot or a second tool slot... you don't have the ability to sell or lose or salvage the other items that are in your other preset".

**CODE:**
- build-presets.ts:
  - `PRESET_GEAR_SLOTS` (primary, secondary, armor).
  - `ensurePresetGear` normalizes `save.presetGear` to two `{ primary, secondary, armor }` sets of items or null. It is called in `freshSave` and `migrateSave`. Pieces go through `normalizeItemUpgrade`, and a junk or wrong-slot entry becomes null.
  - `stashForOtherPreset`: once presets are in use (any preset has a `build`, which happens on the first switch), equipping over a piece the other preset shares (its held slot is null) puts the old piece in that held slot instead of the pack.
  - `swapPreset` swaps in each slot the target preset holds. What was equipped goes into the leaving preset's held slot, and the message names what changed.
- game.ts and main.ts: `equipInventoryItem` and `equipFromInventory` call `stashForOtherPreset`. Both preset switches (the HUD button and the Arcanum) call `refreshDerivedStats`, because armor changes the maxima.
- main.ts: the Gear tab names what the other preset keeps.
- Tests:
  - tests/preset-gear-541.test.ts (new).
  - tests/brawler-tools-493.test.ts: its 527 test, "the gear stays as it is", is replaced by the 541 behaviour Tim asked for.

**BOUNDARY:**
- `presetGear` is additive at schema 14, and held pieces round-trip through saves.
- Gear tags and `applyGear` are left as they were.
- Before the first preset switch, equipping works exactly as before.
- The charm is not per preset.

Also in 541. Tim: "I'm not seeing the option to set a listener town as my home... in the atlas"; "I don't see a forge master in this town... a pretty small island... put the smithy inside one of those buildings".

**CODE:**
- game.ts:
  - `townIndoorSpot()` returns a floor tile inside the town's own huts (`hamlet-rx-ry-*` buildings, `*Interior` tiles). It skips tiles next to a door and tiles within 1.5 of anyone, and picks in building order.
  - `raiseMouthTown` places the smith there first, with `townSpot` as the fallback.
  - `raiseTownAmenities` adds the smith to every Listener town that lacks one, Mouth or not, indoors first. Its Viewport, Keeper and Cook fall back indoors when `townSpot` finds no open ground.
- main.ts:
  - The Atlas home button now targets the first of three that is a home candidate other than the current home: the tapped section, the selected Wayglass, then the section you stand in. Before, a selected Wayglass always won, so a tapped town never showed the button.
  - A disabled button says "light its Wayglass first" in its label, not only in a tooltip.
  - `#mapTowns` lists the Listener towns with coordinates, which one is home, and which have an unlit Wayglass.
- tests/preset-gear-541.test.ts: the island smith.

**BOUNDARY:**
- No save change: amenities are map objects.
- A smith already standing outdoors stays where it is.
- Listener towns rise on the Mouth's section, and Mouths lie within 62 sections of the origin on each axis. A hamlet beyond that is an ordinary hamlet and cannot be home.

## Release 539: the golem's cooldown, Nanoknives that fire themselves, wider Cluster Shells — 2026-10-28

Tim:
- "the golem cooldown should be... your tool cooldown... should be able to be reduced".
- "the Nano knives should automatically fire... if there's an enemy nearby... if there's no enemy nearby, then they should wait until I launch them".
- "the cluster shells should have a wider horizontal distance... the edges of the secondary explosion... [at] the center of that... initial explosion".
- Then: "random positions around the center... always... along the same... center line... at different opposite poles of the circle".

**CODE:**
- game.ts:
  - `toolCooldownScale()` returns the tool glyphs' `mods.cooldown` × (1 − armor `attackSpeed`), the factor the tool's own cooldown uses.
  - `raiseGolem` sets `golemReadyAt` to `GOLEM.cooldown` × that factor.
  - Wellspring Ground runs `golemReadyAt` down at the same rate as `toolReadyAt`.
  - Nanoknives:
    - `NANOKNIVES.hold` is gone; it is replaced by `arm` (.3 s) and `autoRange` (6 tiles).
    - `tickKnives` throws the daggers once they are armed and `knifeFoe(autoRange)` finds a foe: the lock if it is that near, else the nearest. Otherwise they keep circling and never fade.
    - A press still throws them early and raises a fresh set.
  - Cluster Shell:
    - `CLUSTER.angle` and `life` are gone.
    - `clusterShell` turns a line through the burst by `hashSeed(shot.id)`, so each shell gets a different angle while replays stay the same. The bomblets go to its opposite ends, evenly spaced around the burst.
    - Each bomblet gets the life `r / speed`, so it flies exactly its own blast radius `r`.
- tests/tool-forms-533.test.ts.

**BOUNDARY:**
- Runtime only.
- The base 6 s and the other golem numbers are unchanged.
- Circling daggers stay bounded at three.

## Release 537: Cluster Shell — 2026-10-28

Tim: "a passive... for the rift bombard, where its first initial explosion... two smaller balls just fly off... a very short distance... and then they explode".

**CODE:**
- tool-forms.ts: `CLUSTER` (count, angle, speed, life, share, radius).
- lattice-fields.ts: `TOOL_FORMS["cluster-shell"]`.
- game.ts:
  - The projectile `onDetonate` callback calls `clusterShell(shot)` before pushing the blast.
  - `clusterShell` throws `count` bomblets (`path: "grenade"`, `bomblet: true`) to either side of the shell's path. It only acts on the player's own tool shells, never on hostile shells or on bomblets themselves.
  - A bomblet bursts when its short life ends, or on the first foe it touches, through the same detonation.
- combat-visuals.ts draws bomblets as smaller grenades.
- Fix from the 535 pre-publish review: `drawGolem` used `ctx.roundRect`, which older Safari and Chrome lack. A throw there left the golem's floor clip on the canvas. It now draws with arcs (`rounded`) and restores the context in a `finally`.
- tests/tool-forms-533.test.ts.

**BOUNDARY:**
- Runtime projectiles only, with no save state.
- Each shell adds at most two bomblets, and bomblets never split again, so the projectile count stays bounded.

## Release 535: the Corridor Golem — 2026-10-28

Tim: "the hammer... summon a golem... dash to the nearest enemy and deliver like 3 blows... if the enemy dies on the first blow... to the next enemy... rises up out of the ground... melts back into the tiles". Of three proposals he chose "the quick golem".

**CODE:**
- tool-forms.ts:
  - `GOLEM`: share, punches, gap, rise, sink, range, radius, stun, cooldown and reach.
  - `drawGolem` draws a squat stone figure with yellow sigil eyes. It is clipped at the floor line, so it rises out of the ground and sinks back.
  - `drawToolForms` also draws the `golem-punch` rings.
- lattice-fields.ts: `TOOL_FORMS["corridor-golem"]`.
- game.ts:
  - `brawlerTool("hammerfall")` calls `raiseGolem(at, now + delay)` when the form is held. It does nothing while a golem is up or before `golemReadyAt`.
  - `tickGolem` dashes the golem to `reach` short of the nearest live foe within `range` of itself, keeping its foe while that foe lives. Each punch is a `golem-punch` tool effect (`share` × `toolPower`, a `stun`) and runs through `updateEffects` like the hammer's own blow.
  - The golem sinks when its punches are spent or no foe is near, and drops on an area change.
- combat-visuals.ts skips `golem-punch` in the generic effect pass.
- tests/tool-forms-533.test.ts.

**BOUNDARY:**
- `golem` and `golemReadyAt` are runtime only.
- At most one golem exists, and it needs no pathfinding: it dashes in a straight line. This respects the bounded-actor rule.
- Physical, like the hammer.

## Release 533: tool forms — 2026-10-28

Tim: "Rift bombard should be physical... like a goblin bazooka"; "the needle caster... after +6 it gets upgraded to a blunderbuss... 3 shots at once"; "passives... can turn the blunderbuss's 3 shot cone spread into an arc... the great sweep... 3 swords that float... shoot at the nearest enemy... nanobot daggers... yellow sigils... still physical".

**CODE:**
- items.ts:
  - The Rift Bombard's `damageType` is `physical`, so fireSecondary adds the Might melee bonus and armor's attack bonus (release 529), not Focus.
  - `BLUNDERBUSS_RANK` (6) and a `secondary-blunderbuss` profile with `pellets` 3 and `spread` .26.
  - `normalizeItemUpgrade` renames a Needle Caster at +6 or more to "Blunderbuss" (equipment and pack). `rangedWeapon` returns the Blunderbuss profile for that name, or for a Needle Caster at rank 6+.
  - `upgradeEquipment` says when the item changes.
- tool-forms.ts (new module, in build.mjs and both sw.js lists): `ARC_WAVE`, `NANOKNIVES`, `knifeOffset`, and `drawToolForms`, which draws the circling and thrown daggers (steel blade, yellow sigil) and the wave.
- lattice-fields.ts: `TOOL_FORMS` (`arc-wave`, `nanoknives`), held under `field:<id>` keys like the field passives but listed apart (`TOOL_FORM_KEYS`), so `FIELD_KEYS` stays five. `fieldForm` reads both.
- game.ts:
  - fireSecondary adds the extra pellets, or turns the shot into one wave (`arcWave`, wider `grow`, more `pierce`, `share` × damage) when Arc Wave is held.
  - `brawlerTool("great-sweep")` hands off to `nanoknivesPress` when Nanoknives is held. `launchKnives` throws homing (`seekId`) physical tool projectiles from where the daggers circle. `tickKnives` throws them when `hold` runs out, or drops them in a new area or with another tool.
- combat-visuals.ts skips `knife` and `arcWave` projectiles in the batched pass and calls `drawToolForms`.
- tests/tool-forms-533.test.ts.

**BOUNDARY:**
- Renaming a +6 Needle Caster is the only change to stored data. It is a value change in an existing field at schema 14 and carries no new state.
- `knives` is runtime only.
- Both forms stay physical: plain steel still scatters the Nanobot Knight unless the tool's glyphs reach the swarm.
- The hammer's golem form is not built yet. Tim asked for recommendations first.

## Release 531: spells and skills keep two sockets — 2026-10-28

Tim: "don't add a third socket for spells, only some, you know, items. I get three sockets, get the three socket resonance".

**CODE:**
- glyphs.ts: `SPELL_SOCKETS` goes back to 2. `ensureGlyphState` trims a spell or skill to two sockets. Release 529 was never published, so no live save holds a third spell socket.
- Triads now come from three-socket items: relic tier (`SOCKETS_BY_TIER`) or the smith's added socket. A weapon or tool can also reach three glyphs with an Aperture skill's infusing glyphs.
- main.ts: the undiscovered-triad hint names three-socket weapons, tools and armor.
- tests/skill-glyphs-297.test.ts is back to its pre-529 form. tests/triads-529.test.ts checks triads on relic weapons and tools.

**BOUNDARY:** Socket count only. The triads, armor triads and the Needle Caster's Might scaling from 529 are unchanged. Save schema 14 is unchanged.

## Release 529: triads — 2026-10-28

Tim: "three part resonances, where if you have three different glyphs, you can get resonances for those as well... spells and skills... armor can resonate with three slot resonances, so if you want your armor to resonate, you have to resonate with three glyphs".

**CODE:**
- glyphs.ts:
  - `TRIADS` (six entries) is kept apart from `RESONANCES`, so the pair rules and counts are unchanged. Each entry has `pair` (three glyphs), a hit `text`, and `armor` bonuses with `armorText`.
  - `resonancesOf` also returns triads, so `hostLoadout(...).resonant(id)` and `discoverResonances` cover them. `resonanceInfo(id)` looks up either kind.
  - `glyphHit` effects:
    - inferno: a burning foe that dies → a 1.9-tile blast of 6 + 80%;
    - maelstrom: chained foes nudged toward the struck one;
    - sanguine-storm: arcs heal 6%;
    - requiem: echo hits stun 1 s (halved on bosses);
    - starfall: echo hits blast 1 tile for 50%;
    - undertow: kills heal 5% of maximum health.
  - `armorGlyphBonus` adds a lit armor triad's `armor` after the caps. `armorTriads(save)` discovers them, and `socketGlyph` reports "Triad discovered".
  - `SPELL_SOCKETS` goes from 2 to 3. Saves pad with an empty socket in `ensureGlyphState`. tests/skill-glyphs-297.test.ts now expects the padded third socket; the change follows from Tim's request.
- game.ts: the discovery notice says "Triad" or "Resonance".
- main.ts: the Glyphs screen lists triads under the resonances.
- Needle Caster (Tim: "make the needle caster scale with your might"): in `fireSecondary`, a physical shot adds `meleeBonus` (Might) and armor `attackDamage` instead of `magicBonus`. Magic shots are unchanged.
- tests/triads-529.test.ts.
- A skill passes on only its infusing glyphs, so of the triads only Inferno and Undertow can come from a skill's sockets alone.

**BOUNDARY:**
- Pairs and their effects are unchanged.
- Armor pairs still never resonate.
- Save changes are additive.

## Release 527: resonance gift, presets keep gear, quiet crossings, the vortex trap — 2026-10-28

Tim's requests:
- "just unlock all those resonances... do it one time";
- "when you switch presets... they shouldn't become unequipped, because I just... salvaged an amazing Lumen Spindle";
- "when you're in a dungeon, [it] should only say major threat when there's a world boss";
- "traps... [that] pull you into... an explosion... if you trigger the trap [and] stay in it for too long";
- "the floor starts crumbling... glowing red... two seconds to get off... if you have aerial step... jump out".

**CODE:**
- glyphs.ts `giftResonances(save)`: once (`save.resonanceGift`), a journey past level 1 gets every resonance in its codex. The Game constructor calls it (not the normalisers), so fresh-save defaults never fill the mark in for an old save.
- build-presets.ts `swapPreset` no longer calls `applyGear`; the message says the gear stays equipped. Presets still record gear tags. tests/brawler-tools-493.test.ts's preset test was rewritten for the new behaviour, which Tim asked for.
- main.ts `updateWorldNotices`: in a dungeon, the threat banner is shown only for `worldBeast`/`worldBoss` enemies.
- dungeon-traps.ts:
  - `DUNGEON_TRAPS.version` 3, with kinds `+ vortex`. Crossings stamped 1 and 2 keep theirs.
  - The vortex runs armed → warning (`hold` s inside) → pulling (`pull`/s toward its eye via `world.pull`, game.ts `moveAxis`, so walls stop it) → `enemy-blast` (`share` .18 of maximum health) plus `frags` hostile grenades. Leaving during warning puts it to rest.
  - `airborne` includes an active Aerial Step.
- main.ts: the pit fills red and pulses while warning, and the vortex draws a rune ring with three swirl arms (blue while warning, orange while pulling).
- tests/release-527.test.ts.

**BOUNDARY:**
- Saves stay additive (`resonanceGift`).
- Existing crossings' traps are unchanged.
- Banners outside dungeons are unchanged.

## Release 525: harder traps and the pitfall — 2026-10-28

Tim: "the trap should do more damage. All across the board... the pitfall trap... you trigger it. And... two seconds before the ground falls out. And you die if you stay on the ground. But you can just move".

**CODE:**
- dungeon-traps.ts:
  - Each new kind has a `share`: sigil .05, lava .14 (blobs 70% of it), dart .07. `damageOf` takes the larger of `base + perLevel × level` and `share × maxHp`.
  - `TRAP_DAMAGE_SHARE` (.12) applies to the old traps.
  - `DUNGEON_TRAPS.version` is now 2. `TRAP_KINDS_BY_VERSION` is `{1: sigil/lava/dart, 2: + pit}`. `addNewTraps(map, seed, id, version)` hashes `v1`/`v2` by version, so crossings stamped 1 keep their traps.
  - The pit: armed → warning (`warn` 2 s, floor cracks) → open (`open` 3 s). Standing on it and not airborne (jumping or boosting) calls `world.fall()`. Then it rests and rearms.
- game.ts:
  - `updateTraps` takes `maxHp`; a hit is `max(trap damage, maxHp × TRAP_DAMAGE_SHARE)`.
  - `tickNewTraps` gets `maxHp`, `airborne` and `fall`, which sets health to 0 with "The floor gives way...". Invulnerability still applies.
  - `addNewTraps` gets the history's `trapsVersion`.
- main.ts `drawNewTrap` draws the pit: a plain square, then glowing cracks, then a black hole.
- tests/dungeon-traps-523.test.ts adds three tests.

**BOUNDARY:**
- Trap placement in crossings stamped before is unchanged.
- No new save fields.

## Release 523: sigil, lava and dart traps — 2026-10-28

Tim: "lanterns... shoot out like a bunch of different balls, and then they land on the floor and... spin for a second, and they shoot out in pentagram patterns, let's have some traps that launch things like that... Lava traps... when you... step on them, they... explode, or... launch lava in the air... dart traps that shoot darts from across the wall... 3 projectiles".

**CODE:**
- New module dungeon-traps.ts, registered in scripts/build.mjs and both sw.js lists. `DUNGEON_TRAPS` holds the data, with damage `base + perLevel × level`.
  - `addNewTraps(map, seed, id)` places 2–4 traps (`kind: "trap"`, `newTrap: 1`) once per map, deterministically, on floor away from the entry and from objects. A dart trap takes the first free tile against a wall and faces away from it.
  - `tickNewTraps(objects, world, dt)` runs armed → warning → fire → rest.
    - sigil: `seeds` orbs fly out to a ring, spin, then each fires `points` hostile star shots (jumpable).
    - lava: a hostile `enemy-blast` at the vent plus `blobs` hostile lava grenades that detonate where they land.
    - dart: `darts` jumpable shots along its line, `gap` s apart.
- game.ts:
  - `generatePinnedDungeon` stamps `history.trapsVersion` only for fresh crossings.
  - loadArea calls `addNewTraps` after `populateDungeonEncounters` when the active crossing has `trapsVersion` (`this.trapSeeds` resets per area).
  - The dungeon frame calls `tickNewTraps` after `updateTraps`. `updateTraps` skips `newTrap` objects.
  - Shots and blasts reuse the existing hostile projectile and blast paths: guard, invulnerability, Sanctuary, jumping and builds all apply.
- main.ts `drawNewTrap` draws the pentagram, the vent and the wall slit (glowing while warning). `drawDungeonSystems` draws the flying and spinning orbs.
- tests/dungeon-traps-523.test.ts.

**BOUNDARY:**
- Crossings generated before keep exactly their traps.
- The old fire, spike and gas traps are unchanged.
- No save shape change beyond the additive `trapsVersion` on new histories.

## Release 521: fewer save stutters — 2026-10-28

Tim: "there might have been some slowdowns. Some stutters, you can test that, check that", with a 3-minute probe on r515 (Android, 120 Hz).

The probe ran at 97 fps in dungeons, with game code at about 1.6 ms a frame. The hitches came in an 8 s rhythm:
- a `persist` frame of 30–44 ms, the timed autosave's `snapshotSave` clone;
- about 50 ms frames with almost no game time, the queued write's synchronous localStorage mirror (`JSON.stringify` of the whole journey) and the IndexedDB put.

Two single long frames came from area loads: 112 ms entering an open-sea section (a ground build) and 57 ms entering a dungeon.

**CODE:**
- persistence.ts: the coordinator writes the localStorage mirror at most every `MIRROR_EVERY_MS` (60 s) per slot, and always when the IndexedDB write throws. `loadSave` already takes the newer of IndexedDB and the mirror, so a stale mirror never wins over a good IndexedDB save.

**BOUNDARY:**
- The save format, slots, recovery copies, export and import are unchanged.
- The timed autosave stays at 8 s, pinned by tests/prototype.test.ts. Its 30–44 ms clone frame remains; spacing it out needs that assertion changed, which is Tim's call.

## Release 519: every spell and skill shows its drain — 2026-10-28

Tim: "all spells and skills should show their duration... in the button... a similar golden infill that winds down or drains out".

**CODE:**
- game.ts `spellBuffLeft` covers every spell. Any own effect of the spell counts, so quick spells such as Cinder Dart do too (the 517 `FIELD.minLife` floor is gone there).
- Orbit Volley shows `1 - held/ORBIT.window` while the orbs gather, and full in flight.
- A successful Rift Step stamps `riftFlashAt`; `riftFlashLeft` gives a `RIFT_FLASH` (.6 s) flash.
- main.ts `spellOrSkillLeft` takes the larger of the Rift Step infusion and the flash.
- Every timed Aperture skill already drained through `buffLeft` (release 313).

**BOUNDARY:** Display only.

## Release 517: spell buttons show their duration — 2026-10-28

Tim: "shadow Boxing... when you activate it... The spell button doesn't show the duration. I know you have a ring around you and that's fine... let's not change that. But the spell should show the duration. In the button, similar to every other spell and [skill]".

Before this, the draining button fill (`setBuffFill`, release 313) came only from `buffLeft`, which answers Aperture skills alone.

**CODE:**
- game.ts `Game.spellBuffLeft(id, now)` returns 0..1:
  - Shadow Boxing: `boxingUntil` over `BRAWLER["shadow-boxing"].seconds`.
  - Aegis: `aegisUntil` over `BRAWLER.aegis.ms`.
  - Shadow Clone: `shadowClone.until` over the spell's lifetime. The Shadow Step and boxing clones do not count.
  - Any spell lasting at least `FIELD.minLife`: the longest-lived of your own effects of it (not echoes or the Orbit vortex) over its lifetime.
  - Quick spells: 0.
- main.ts `spellOrSkillLeft(key)` picks `spellBuffLeft` for spells and `buffLeft` for skills. Both the Spell A/B buttons and a preset's spell on the Build button use it.
- tests/spell-duration-517.test.ts.
- Resonance check (Tim: "assess whether... the glyphs are actually showing the resonances in the spells, or the skills... I've only discovered four"):
  - All eight resonances light and are discovered (`glyphLoadout` → `discoverResonances`) with their pair in a weapon, the Iron Fists, a tool, Hammerfall, a cast spell or Shadow Boxing.
  - In an Aperture skill only infusing glyphs (ignite, chain, leech, volatile, tether, still) ride onto weapon and tool hits, so only Wildfire, Storm Lattice and Grave Tether can come from a skill's sockets alone.
  - Armor glyphs never resonate (`armorGlyphBonus`).
  - tests/resonance-hosts-517.test.ts pins all of this. No code change was needed.

**BOUNDARY:** Display only. The Shadow Boxing ring, every spell's rules and the save are unchanged.

## Release 515: field passives in the Transit Lattice — 2026-10-28

Tim: "passives... that don't purely depend on... a skill active... while your spell's going... if you stand inside of it... extra healing, extra damage reduction... increased cooldown... your tool shots are larger... passives that modify the Dodge". Tim chose the Transit Lattice as their home (there is no Astral Cloak) and all five proposals.

**CODE:**
- New module lattice-fields.ts, registered in scripts/build.mjs and both sw.js lists:
  - `FIELD = {minLife: 1}`.
  - `FIELD_PASSIVES`, with `sanctum` (guard .2, mend .02/s), `wellspring` (rate .3), `charged-air` (scale 1.5, damage .25, blast 1.3, grow .18), `spellblade` (damage .2, reach .4) and `drift-field` (reach 6).
  - `FIELD_KEYS` (`field:<id>`), `fieldForm` and `fieldOn(save, id)`.
- constellation.ts:
  - `passiveForm` answers `field:` keys.
  - `toggleLatticePassive` sets them with no learning check.
- main.ts: the Lattice lists them as "only in the Lattice" cards.
- game.ts:
  - New methods:
    - `ownSpellFx(lingering)`: your own spell effects, not hostile and not delayed. Lingering means a spell lifetime of at least `minLife`, or the `-vortex`.
    - `spellRunning()`: Aegis, Shadow Boxing, the Orbit orbs, your spell's Shadow Clone (not the Shadow Step or boxing clones), or any own spell effect.
    - `inOwnField()` and `spellbladeOn()`.
  - Sanctum runs after the Aegis/boxing guard.
  - Wellspring adds `rate`×dt to every cooldown tick: spells, skills, `attackReadyAt` and `toolReadyAt`.
  - Charged Air applies in `fireSecondary`. Projectiles carry `scale` (drawn by combat-visuals) and `grow` (added to the hit radius in `updateProjectiles`).
  - Spellblade raises `primaryStrike` damage and range, and `fistPower`.
  - Drift Field acts on a dodge and moves the field at `dodgeUntil` (`this.driftField`).
- tests/lattice-fields-515.test.ts.

**BOUNDARY:**
- No save shape change (schema 14). Keys live in `save.lattice.passives` and presets carry them as strings.
- The Lattice's slot counts and costs are unchanged.
- Nothing changes until a field passive is set.
- Enemy effects never count as your field.

## Release 513: more brawler gear — 2026-10-27

Tim: "monsters aren't dropping them... I accidentally destroyed my hammerfall, and so I want to get some instances of the hammerfall".

Measured at release 511 with 4000 level-30 drops, Hammerfall was about 2.6% of item drops. Once the Pack held `EQUIPMENT_CAPACITY` (60) items, `storeInventoryItem` silently salvaged any drop scoring no better than the weakest item, so a late Pack almost never kept one.

**CODE:**
- items.ts: `BRAWLER_LOOT.share` goes from .18 to .35, in the same separate `brawler-loot:v1` stream, so other rolls are unchanged. Hammerfall becomes about 5% of drops.
- game.ts:
  - `isBrawlerGear(item)`.
  - `storeInventoryItem`: with the Pack full, brawler gear whose name is not in the Pack or equipped is always kept. It replaces the weakest item that is not brawler gear (salvaged as before). A second copy follows the old rule.
  - `obtainDrop`: says "<name> found: it is in your Pack." when brawler gear is kept.
- tests/brawler-loot-513.test.ts.

**BOUNDARY:**
- Drop chance per kill, the other item kinds' names, tiers and powers, and the save shape (schema 14) are unchanged.
- Shop stock cached for the current rotation is untouched. New rotations may show more brawler gear.

## Release 511: Sleeper's Hall walls stay walls — 2026-10-27

The pre-publish Fable review (505→509) found a blocker in 509. A Sleeper's Hall (underlands.ts, the dream theme) uses `starVoid` as its wall tile, with landscape "underlands". So in the robot, any hall wall could be walked into, and 4 s against it destroyed the robot and killed the Wayfarer.

**CODE:**
- game.ts `isDreamVoid(tile)`: `starVoid` with landscape "dream", meaning the Far Sleep's overworld voids and the Listener arena's surrounding night.
- `footprintOpen`'s `allowVoid` and `footprintVoid` both use `isDreamVoid`.
- `p.voidSuit` is also false in dungeons.
- tests/robot-void-509.test.ts adds two cases: a hall wall stops the robot, and an underlands starVoid is not a dream void.

**BOUNDARY:** Only the 509 rule is narrowed. Dungeon layouts, the Far Sleep's terrain and the robot are otherwise unchanged.

## Release 509: the robot in the star-voids — 2026-10-27

Tim: "in the dream world... these areas which are like dream holes... I was able to go into them with my suit. And I started taking damage, but then I didn't die... when you go through them, you should take damage as well similar to the lava, and you should die. If you stay in them for too long... it'll destroy your suit... beyond the corridor you don't have the necessary power or... permissions... to actually exist there. The suit gives you some protection from the... yawning void, but it's very little protection".

The star-voids (landscape.ts `starVoid`, release 305) were blocked to every mover. In tests, walking, boosting and dodging in the robot all stopped at the edge, so how Tim got in on r505 was not found. The behaviour he described is now a rule.

**CODE:**
- vehicle-gates.ts:
  - `MECH_VOID = {plate: 15, heat: .06}`.
  - `voidTick(save, dt)` takes `plate`/s of plating, never re-forged from iron. When the plating runs out it destroys the robot (`built: false`, fresh plate for the next frame) and returns `{gone, torn}`.
- game.ts:
  - `footprintOpen` takes `allowVoid`. `moveAxis` passes it for the player with `voidSuit`, which update sets to `mechUp()` each frame. Only the robot steps in; the drone and the bare Wayfarer do not.
  - `footprintVoid(map, width, x, y)`: whether any part of the footprint is over a star-void.
  - Each frame over a void: `voidTick` runs and the Wayfarer loses `heat` of maximum health per second, after every guard (like `MECH_LAVA`). A destroyed robot, or a void without the robot (stowed inside), sets health to 0, and the usual fall and recovery follow.
- tests/robot-void-509.test.ts:
  - The void is impassable without the robot.
  - It can be entered in the robot, tears the plating without spending iron, and burns the Wayfarer.
  - A quick crossing survives.
  - Staying destroys the robot and the Wayfarer.

**BOUNDARY:**
- Star-voids stay impassable to creatures and to the Wayfarer outside the robot.
- No terrain, generator or save shape changes (schema 14; `mech.built` already existed).
- Lava, water and plating outside the voids are unchanged.
- The Listener arena's surrounding night is `starVoid` too, so the robot can step off the hall's edge there, with the same cost.

## Release 507: the submersible suit, and more hammers with Echo — 2026-10-27

Tim: "Something's broken with a submersible. I have it set on an item to have and it's not working. I'm pressing it and nothing's happening... make sure that the submersible suit works very well".

**CODE:**
- Cause: building the robot (the Build button or Use) consumes the submersible frame, so its count drops to 0. `Game.useButtonItem` refused any item at count 0 ("None left.") before `useConsumable` was reached. So did the HUD, which greyed the button out.
- game.ts `useButtonItem`: the submersible passes through to `useConsumable` when `save.mech.built` and the Wayfarer is not aboard the boat. `useConsumable` already handles every state: call, empower, stow and call again.
- main.ts HUD item button: with the robot built, the submersible is not `spent`. Its label shows the robot's state (DRONE, EMP, ON, OFF or the cooldown seconds) instead of ×0.
- tests/submersible-button-507.test.ts covers the full button cycle with 0 frames, calling again after stowing, the button in a dungeon, and "None left." with no robot and no frame.
- The robot in water (Tim: "when I go into the water, I lose stamina, and I can't go between tiles"):
  - vehicle-gates.ts adds `MECH_WATER = {speed: .9}`.
  - `Game.swimsHere(hazard)`: the Tidemantle swimmer, or the robot up on any swimmable kind. It replaces `swimsThrough` in movement, the swim state and the Aerial Step landing.
  - `Game.wading()`: swimming in the robot. It skips `swimUpkeep` and `dungeonWaterToll`, so stamina regenerates normally.
  - Overworld edges are crossed anywhere while wading, as when sailing. `transitionSection` keeps the cross-edge coordinate when water or open ground meets it, otherwise it uses the exit. The open-sea refusal no longer applies in the robot.
- Echo on the tools (Tim: "each time you do an echo, it should do another hammer... Bang bang boom... The second echo should just make another shot that does twenty five percent damage"):
  - glyphs.ts `echoPlan` returns `copies`, one `{delay, share}` per echo. A second Echo on the tool host adds `GLYPHS.echo.third.tool` (.25) at twice the delay. Spells keep their single 75% echo.
  - `fireSecondary` queues every copy.
  - `brawlerTool` adds one Hammerfall or Great Sweep effect per copy, each `BRAWLER_ECHO.toolGap` (.22 s) after the last.
- tests/robot-water-507.test.ts.

**BOUNDARY:** The robot's plating, cooldowns, frames, lava rules and save shape are unchanged (schema 14). Other items still stop at 0. Aboard the boat, the button and sailing keep their old behaviour. Without the robot, swimming still needs the Tidemantle and drains stamina, and dungeon water still bites. Melee and spell echoes are unchanged.

## Release 505: the Surveyor's Chain, part one — 2026-10-27

The daily narrative session (Tim's routine): the next step of docs/narrative-bible.md section 7, step 6 ("the Surveyor and the Torn Pages"), from section 6, thread 2: "Abel Corwin's lost chain-links lie in dungeons; each comes with a page of his notes... the measurements grow wrong in an orderly way".

**CODE:**
- New module surveyor.ts (in scripts/build.mjs and both sw.js lists):
  - `SURVEYOR = {links: 12, chance: .14, minRing: 8, minFromEntry: 6}`.
  - `SURVEYOR_NOTES`: twelve original field notes. `SURVEYOR_LENGTHS` are the lengths in them: 32, 33, 35, 38, 42, 47, 53, 60, 68, 77, 87, 98, each step one more than the last.
  - `ensureSurveyor`: `save.lore.surveyor = {links, where}`, additive and normalised.
  - `surveyorCrossing(seed, dungeonId)`: ordinary crossings, ring ≥ `minRing`, hash < `chance`.
  - `addSurveyorLink`: one per crossing, on open floor away from the entry. Not placed in multi-level, arena or underwater maps, or once the crossing has given its link.
  - `takeSurveyorLink`: gives the lowest unfound link, so the notes read in order, and records where it came from.
- game.ts calls `addSurveyorLink` beside `addMargin` in dungeon loads. The `surveyorLink` interaction takes it and writes `journalOnce(surveyor:i, ..., "The Surveyor's Chain")`.
- renderer.ts `drawSurveyorLink` draws a glinting brass link, then only its print once taken.
- docs/narrative-bible.md step 6 now records this.

**BOUNDARY:**
- Additive `save.lore.surveyor`; crossings, their generation and their ids are unchanged.
- No link within 8 sections of the Refuge.
- Part two is not built: the last map revealed as the overworld, and his statue at the edge of the Far Sleep.

Tests: `tests/surveyor-505.test.ts`.

## Release 503: the new gear with Echo, the Shadow Clone and loot — 2026-10-27

Tim: "we have to make sure that they work with all the existing architecture... the echoes"; for Shadow Boxing "it spawns a shadow clone for 3 seconds... that only does melee attacks"; "the shadow clone... doesn't do melee attacks, and it should... just... an arc melee attack"; Iron Fists with Echo "it'll let you power up your second swing... a second [Echo]... your third swing [can] be charged... as well"; "those... tools that we're new are showing up in the... [loot]".

**CODE:**
- brawler-spells.ts:
  - The jab and uppercut get `chargeShare` (1.2 and 1.6) and `echoes` (1 and 2).
  - `BRAWLER_ECHO = {echoClone: 3, cloneArc}`.
- game.ts, Iron Fists: with enough Echo glyphs in the fists (`hostLoadout(melee).count("echo") >= echoes`), `fistPress` on a live combo starts a charge for that punch (`fistCharge.step`). The release calls `fistPunch(step, charge)`.
- game.ts, Shadow Clone:
  - `fistPunch` and `brawlerTool` call `cloneSwing` with a plain arc profile, so a Shadow Clone swings along.
  - `castShadowClone` replaces a boxing clone instead of stepping into it.
  - Tool shots are not copied by a boxing clone.
- game.ts, Echo:
  - `brawlerTool`: with `echoPlan(tool)`, a delayed echo copy of the blow at the plan's share.
  - `tickOrbit`: with `echoPlan(spell, "orbit-volley")`, a second burst after .2 s.
  - `castBrawler("shadow-boxing")`: with an Echo on the spell and no clone up, a `shadowClone` with `boxing: true` for `echoClone` s, beside you.
- items.ts: `BRAWLER_LOOT = {share: .18, primary: Iron Fists, secondary: Hammerfall, Great Sweep}`. `generateItem` draws all the usual rolls first (unchanged), then a separate stream `seed:brawler-loot:v1` may rename a weapon or tool into brawler gear. `isValidItem` accepts them.
- The comment `release 467 (Codex audit F002)` in proving-ground-mobile.ts is restored; the release bump had been renumbering it.

**BOUNDARY:**
- No save change.
- Items already owned are untouched; only items generated from now on can be brawler gear.
- Aegis with Echo does nothing extra.

**Damage (Tim asked):**
- Hammerfall and Great Sweep: (10 + the tool's power × 1.2 + your melee bonus) × the tool's glyph damage mods × (1 + armor, meal, page and empowered-robot melee damage) × the tool share (1.8 and 1.2; × 1.1 under Shadow Boxing).
- Iron Fists: the same formula, using the weapon's power and melee glyphs.
- These blows have no damage type. They are not magic, so spell-damage bonuses do not add, and the Nanobot Knight's "plain steel scatters" rule (physical shots) does not apply to them.

Tests: `tests/brawler-echo-503.test.ts`.

## Release 501: a smaller Jump button — 2026-10-27

Tim: "decrease the size or the response area of the jump button so that [it] doesn't encroach on the other buttons around it... those other buttons should take priority". (He also confirmed release 499's intent: "sometimes when you go inside of those buildings, there should be a dungeon door... it gives me a reason to search in the buildings".)

**CODE:**
- styles.css: `.action-diamond button.core.jump` is 0.68 × `--button` (38px at 56px), offset by 0.16 so it stays centred in its old cell. It was a full button, about 6px from Tool, Act, Dodge and Attack.
- input.ts: `GAP_PRIORITY.jump = -18`. A press on the cluster between buttons goes to Jump only when its edge is clearly nearer than the others'.
- The release bump's text replace caught two values in `tests/prototype.test.ts` that are not release numbers: the gate predator's 499 health and a test currency of 499. Both are restored. Check for such collisions when the new release number matches a test value.

**BOUNDARY:**
- No other button moves or changes size; checked at 390×844 and 844×390.
- Rules and saves are unchanged.

## Release 499: crossings indoors — 2026-10-27

Tim: "if a dungeon will [spawn] in that tile, sometimes it can be spawned in a building. If there's a building in that tile, no other changes beyond that". A sample of 516 sections with an entrance found none placed in a building before this release.

**CODE:**
- game.ts `INDOOR_DUNGEON = {version: 1, chance: .5}` and `placeDungeonIndoors(map, seed, rx, ry)`. If the section's dungeon object passes a fixed hash (`indoor-dungeon:v1`) at `chance`, it moves to a free `shackInterior` or `districtInterior` tile with an open footprint (not holding another object), picked by the same hash, and is marked `indoors`.
- loadArea (overworld) reads the atlas record first: a section with no record takes `INDOOR_DUNGEON.version`, an existing one keeps its own. It places the entrance indoors when the record carries the version, before the atlas `sites` are written, so the map marker matches.
- The atlas record stores `indoorDungeonVersion` (additive), like the hamlet, trail and sea versions.

**BOUNDARY:**
- The generator itself is unchanged: `generateRegion` output and dungeon ids are the same.
- Sections explored before this release never move their entrance.
- No other building or dungeon change.

Tests: `tests/indoor-dungeon-499.test.ts`.

## Release 497: a spell row that scrolls — 2026-10-27

Tim (with a screenshot of the spell names broken into letters): "the spells have become... clumped together... they should just become a scrollable line where you can just scroll left or right on... just that portion of it".

**CODE:**
- styles.css: `.arc-path.spell-path` does not wrap; it scrolls on x (`overflow-x: auto`, touch scrolling, `overscroll-behavior-x: contain`, proximity snap). Its `.arc-node` cards are fixed at 136px (`flex: 0 0 auto`), with names wrapping by word.
- main.ts keeps the row's `scrollLeft` in `spellPathScroll` (`onscroll`) and restores it after each redraw (`requestAnimationFrame`), so tapping a spell does not jump the row back.

**BOUNDARY:**
- Layout only; no save or rules change.
- The other Arcanum branches lay out as before.

## Release 495: Shadow Boxing with the hammer and the sweep — 2026-10-27

Tim: "Shadow boxing should work with the hammer fall and the sword sweep as well".

**CODE:**
- game.ts `brawlerTool` reads `boxing` (Shadow Boxing active) at the start.
- Great Sweep: with boxing, it first runs `shadowBoxStep(radius × .6)`, so the sweep happens beside the foe; the centre is taken after the step.
- Hammerfall: with boxing, its reach grows by `stick`, both for aiming and for landing on the foe.
- Both tools' effects deal × (1 + `damage`) and carry `healShare` = `heal`, which the effects' onHit (release 493) turns into healing.

**BOUNDARY:**
- No save change.
- Without Shadow Boxing, the tools are unchanged.
- The step never crosses walls or lethal ground.

Tests: `tests/brawler-tools-493.test.ts` (release 495 case).

## Release 493: fists as a weapon, hammer and sweep as tools, gear in presets — 2026-10-27

Tim: "shadow Boxing should work with iron fist as well... the iron fist is an attack. The hammer fall and the great sweep are tools. And the [aegis] and shadow boxing are spells... the presets should be able to preset... your weapon and your tool for... preset one and preset two".

**CODE:**
- items.ts:
  - `PRIMARY_PROFILES["primary-iron-fists"]` (`fist: true`), also matched by name in `primaryProfile`.
  - `RANGED_WEAPONS["secondary-hammerfall"]` and `["secondary-great-sweep"]` (`brawlerTool`) replace `secondary-iron-fists`.
  - `SPELLS.hammerfall` and `SPELLS["great-sweep"]` are removed; `itemMechanicalStats` shows only damage for brawler tools.
- spell-slots.ts: the two `CASTABLES` are removed and `RETIRED_SPELLS` adds both, so their socketed glyphs return.
- brawler-spells.ts `BRAWLER.hammerfall` and `["great-sweep"]` get tool numbers (`share` 1.8 and 1.2, `cooldown` 1.2 and 1 s, `lifetime`).
- game.ts:
  - `BRAWLER_GEAR` and `grantBrawlerGear` replace `grantIronFists`. They give Iron Fists, Hammerfall and Great Sweep once each at Infinite III (flags `gear:iron-fists`, `gear:hammerfall`, `gear:great-sweep`), and move a release-489 secondary Iron Fists into the pack as a primary.
  - `primaryAttack` with fists equipped (`fistsEquipped`) calls `fistPress(now, direction, this.attackAction)`; echoes are skipped. The Attack input sets `attackAction = "attack"` for the call, so a held Attack charges the rush punch.
  - `fistPower` reads the primary item and the melee glyphs, and punch effects carry `glyphHost: "melee"`.
  - With Shadow Boxing, `fistPunch` extends the rush by `stick`, steps the jab and uppercut to the foe (`shadowBoxStep`), multiplies damage by 1 + `damage`, and sets `healShare`. The effects' onHit heals `healShare` of the damage actually dealt.
  - The Tool button and `fireSecondary` (taps) call `brawlerTool(kind)`: `toolPower()` × share, the hammer delayed on the foe or ahead, the sweep round you, gated by `toolReadyAt` (cooldown × tool glyph cooldown × attack speed).
  - `castBrawler` keeps only Aegis and Shadow Boxing.
- build-presets.ts: builds carry `gear: { primary, secondary }`, item tags given by `gearTag` (`save.gearTagCounter`, additive `item.tag`). `swapPreset` calls `applyGear` to equip tagged pieces from the pack, naming any that are gone. The existing message wording is kept; "So do its weapon and tool." is added.

**BOUNDARY:**
- Additive save state only: item tags, the counter, `gear` in preset builds, and the grant flags.
- Armor and charm are not part of a preset.
- Other weapons and tools behave as before.

Tests: `tests/brawler-tools-493.test.ts`; `tests/iron-fists-489.test.ts` updated for the weapon; the Hammerfall and Great Sweep spell tests in `tests/brawler-483.test.ts` are retired.

## Release 491: the dash punch goes to your target — 2026-10-27

Tim: "the iron fists, initial punch should [dash] you towards the enemy that you're targeting, either the one that you have tapped to target or the one that is just auto... if it's beyond range, then it should just do a punch in place... a reasonable range for the character to [dash] to him... if you try to hold it, you'll stay in place and then you can charge it up... and do a more powerful punch... on release".

**CODE:**
- brawler-spells.ts `IRON_FISTS.punches[0]` is now `{dash: 0, rush: 4, stop: .9}`; `chargeDash` is gone, so the charge raises damage only.
- game.ts `fistPunch`, for a punch with `rush`: the foe is the lock (if within `rush` + 1), else `pickMeleeTarget` within `rush`. With a foe, the punch steps toward it until `stop` short (through `canStand`) and marks it. With none, it lands in place, facing your last aim.
- Charging never moves you; the rush happens on release.
- The jab and uppercut are unchanged.

**BOUNDARY:**
- No save change.
- The rush never crosses walls or lethal ground.
- Auto aim needs a clear line, so a foe behind a wall is not rushed.

Tests: `tests/iron-fists-489.test.ts` updated.

## Release 489: Iron Fists — 2026-10-27

Tim: "let's make the iron fist a tool that you can use instead of a spell... a three button combo... the first punch is... your standard dash. You can charge it and then dash... you can hold it and dash farther... Second [punch] will be like a quick follow up. You can't hold it. And the third punch would be like an uppercut that does more damage. If you can land the third, if you land all three".

**CODE:**
- brawler-spells.ts `IRON_FISTS` holds the numbers: `base` 10 + power × `perPower` 1.2; `window` .9 s between punches; `recover` .45 s after the uppercut; `finisher` ×1.5 with `finisherStun` .8; `tapGrace` and `chargeTime` for the dash punch; and the three `punches` (dash punch: share 1.4 + 2.2 with charge, dash 2 + 3; jab: share .9, dash .6; uppercut: share 2.4, stun .5). `fistCharge(held)` now reads `IRON_FISTS`. drawBrawler adds the `fist-uppercut` streaks, brighter for a finisher. `BRAWLER["iron-fist"]` is removed.
- items.ts: `RANGED_WEAPONS["secondary-iron-fists"]` has `fist: true` and `path: "fist"`, also matched by name in `rangedWeapon`. `itemMechanicalStats` shows only damage for it. `SPELLS["iron-fist"]` is removed.
- spell-slots.ts: `CASTABLES["spell:iron-fist"]` is removed. `RETIRED_SPELLS` is checked in `ensureSlots`, which returns a retired spell's socketed glyphs to the pouch, drops its glyph host and resets `equippedSpell`. Slots and presets already drop unknown castables.
- game.ts:
  - `IRON_FISTS_ITEM` and `grantIronFists(save)` give the gauntlets once at Infinite III (flag `worldFlags["gear:iron-fists"]`). It runs on level-up and when a Game starts, which shows a message.
  - The Tool button with fists calls `fistPress(now, null, "tool")`. `fireSecondary` (a world tap) calls `fistPress(now, direction)`.
  - `fistPress` throws the next punch while `fistCombo.until` holds; otherwise it starts a dash punch, charging while the button is held. The update loop releases it as `fistPunch(1, fistCharge(held))`.
  - `fistPunch` aims like the brawler spells (a tap's direction when not locked), steps the dash while `canStand`, and checks whether the blow lands. It places a `brawler` effect with `glyphHost: "tool"` and records `fistCombo.landed`; the uppercut is a finisher when the first two both landed.
  - `fistPower()` = (base + power × perPower + meleeBonus) × tool glyph mods × (1 + attackDamage).
  - `releaseFist` and the spell's charge path are removed.

**BOUNDARY:**
- Additive save state only: the flag, plus an inventory item when granted. The combo is runtime only.
- Other tools fire as before.
- The Shadow Clone copies tool shots, not punches.
- Loot tables are unchanged, so the gauntlets come only from the grant.

Tests: `tests/iron-fists-489.test.ts`; the Iron Fist spell tests in `tests/brawler-483.test.ts` were retired.

## Release 487: Orbit Volley — 2026-10-27

Tim: "a spell that like rotates around the character. And then you hit it again, and it sends like a group of balls... at... whatever enemy... you charge it up, and then if you press it again, before... the timer runs out, it sends like a larger ball. If you just let it run out, it'll just send a regular ball... if you perfect time it... it does more damage... it makes like a vortex swirl in front of you". This is the last item of his new-spells list (with the brawler spells of 483 and 485).

**CODE:**
- New module orbit-volley.ts (in scripts/build.mjs and both sw.js lists):
  - `ORBIT` holds the numbers: 3→7 orbs over `charge` 2.4 s; the perfect window from `perfectFrom` 2.0 to 2.4 s; `window` 3.2 s before it fires by itself; share 1→2 with the charge, or `perfect` 2.4; radius 1.1, or 1.6 at half charge; `speed` 12; `reach` 7; and the `vortex`.
  - `orbitCharge`, `orbitPerfect`, `orbitCount` and `orbitLaunch` are the rules; `drawOrbit` draws the orbs, the time-left ring (gold in the perfect window) and the ball in flight. It is called from combat-visuals.ts.
- items.ts `SPELLS["orbit-volley"]` (damage 14, cooldown 9, `unlockTier` 13); spell-slots.ts Rift ❂.
- game.ts:
  - `castSpell` sends it to `castOrbitVolley`. The first press sets the runtime `this.orbit`; a press while gathering calls `launchOrbit`.
  - `launchOrbit` works out the spell power the way `castSpell` does (spell damage + magic bonus, × glyph mods, Pairing and armor spell damage), times the launch share. It aims at the lock, else `pickMeleeTarget` within `reach`, else `lastAim`; marks the foe; and starts the cooldown.
  - `tickOrbit` fires the plain ball when `window` passes, then flies the ball and bursts it on the first foe, at the aim or at a wall. The burst is an `orbit-volley` effect with the spell's glyphs. A perfect volley adds a `gravity-well` effect, which `tickSpellFields` pulls and combat-visuals draws.
  - The orbs scatter if the area changes.

**BOUNDARY:**
- No save change: `this.orbit` is runtime only.
- The other spells and the Gravity Well spell are unchanged.

Tests: `tests/orbit-volley-487.test.ts`.

## Release 485: Aegis and Shadow Boxing — 2026-10-27

Tim: "another one can be a shield... you can put up this shield for like a second... it'll just like block damage for a second... shadow boxing... if you [lock] on a target, you can hit the melee... moves and it will move with the target... stick to him... a bruiser... you'll want to... beef up your defense and your... leaching... this shadow step might have some like healing passives, or like damage reduction, passives, or... damage increased passives". This release is the second batch of his new-spells list. The orbiting charge orbs are still to come.

**CODE:**
- brawler-spells.ts `BRAWLER.aegis = {ms: 1000}` and `BRAWLER["shadow-boxing"] = {seconds: 8, stick: 4, damage: .1, heal: .06, guard: .15}`. `drawBrawlerAuras` draws a hexagon-ribbed dome while Aegis holds and a dashed shadow ring under you during Shadow Boxing (called from combat-visuals.ts).
- items.ts `SPELLS.aegis` (Ward ⛉) and `SPELLS["shadow-boxing"]` (Dusk ⚔), each `brawler: true`, `unlockTier: 13`.
- game.ts `castBrawler` sets the runtime timers `aegisUntil` and `boxingUntil`.
- At the end of each frame, after Ink Shield and before the robot's lava heat: health lost this frame (not to a hazard fall) is refunded under Aegis, or reduced by `guard` under Shadow Boxing.
- `primaryAttack` calls `shadowBoxStep(reach)` first while Shadow Boxing holds. The foe is the lock, else `pickMeleeTarget` within reach + `stick`. If that foe is out of reach, it steps you toward it in quarter tiles while `canStand`, to within about 70% of reach, then turns the swing to it.
- While boxing, a swing's damage is × (1 + `damage`) and it heals `heal` × the damage dealt.

**BOUNDARY:**
- No save change: the timers are runtime and end on reload.
- Lava heat in the robot still burns through Aegis.
- Shadow Boxing never moves you through walls or onto lethal ground, and never moves you without a foe.

Tests: `tests/brawler-485.test.ts`.

## Release 483: brawler spells — 2026-10-27

Tim: "we can even have like spell sword spells... a giant hammer that comes down and attacks... another one that does a large sweep with a sword. And these can be buffed by melee damage... brawler type [spells]... another one can be like a charge punch fist... you [dash] forward and you punch... you can like charge it up if you hold the spell button... the hammer... in whatever direction he's facing, or... the regular, like, targeting... that applies for attacking". This release is the first batch of his new-spells list. The shield, Shadow Boxing and the orbiting charge orbs are still to come.

**CODE:**
- New module brawler-spells.ts (in scripts/build.mjs and both sw.js lists): `BRAWLER` holds each spell's numbers, `fistCharge(held)` the charge, and `drawBrawler` the visuals (called from combat-visuals.ts; the generic effect ring skips `fx.brawler`).
- items.ts `SPELLS`: `hammerfall`, `great-sweep` and `iron-fist`, each `brawler: true`, `unlockTier: 13`, `damage: 0`. spell-slots.ts `CASTABLES` adds them as Force spells (⚒ ◠ ✊).
- game.ts `meleePower()` is a swing's damage: `(primaryProfile.damage × melee glyph mods + meleeBonus) × (1 + attackDamage)`. `brawlerAim(reach)` aims at the lock, else `pickMeleeTarget`, else `lastAim`, and marks the foe.
- `castSpell` sends brawler spells to `castBrawler`, which sets the cooldown with the usual glyph, Pairing and armor reductions.
- Hammerfall is an effect on the foe (if within `reach` + .5) or `reach` ahead, with `delay` and `stun`. Great Sweep is an effect centred on you.
- Iron Fist with a button (`castAction`) sets `fistCharge`. The update loop calls `releaseFist(fistCharge(held))` when that button is let go, or after `tapGrace + chargeTime + 1` s. `releaseFist` guards for `guardMs`, steps the dash in .25-tile steps while `canStand`, then places the punch effect .7 ahead.
- `updateEffects` applies `fx.stun` (a quarter for bosses and elites).
- The effects carry `glyphHost: "spell"`, so the spell's own glyph sockets apply.
- The Arcanum describes brawler spells as melee-scaled.

**BOUNDARY:**
- No save change: `fistCharge` is runtime only.
- Swings, the other spells and the aim order are unchanged.
- The dash never crosses walls or lethal ground.

Tests: `tests/brawler-483.test.ts`.

## Release 481: lock, foe, tap; stronger echoes and bursts; bigger buttons — 2026-10-27

Tim: "first lock then enemy then tap"; "if you have two... echo gliffs on a [spell]... the echo shot does seventy five percent damage, instead of fifty percent"; "I shouldn't be [seeing] the same glimpses multiple times... just see them once, and then if I wanna see them again I can... look in the book"; "make the [action buttons] a little bit larger and more like translucent... I find myself pressing the wrong buttons"; "the passive that leaves... an explosion every time I Dodge... does that get increased by... spell damage... increase the radius... if it hits one enemy, it explodes around that enemy". He chose the action buttons, and spell scaling plus armor-glyph effects for the bursts.

**CODE:**
- **Aim order.** game.ts `castSpell`: the locked target, then auto target (`pickMeleeTarget` within `AUTO_AIM.spellScale` × range), then a `pendingAim` whose reticle still shows. In 479 a fresh tap came before auto target.
- **Double Echo.** glyphs.ts `GLYPHS.echo.double = {spell: .75}`; `echoPlan` uses it when the host has two or more Echo glyphs. Afterimage still makes it 1.
- **Glimpses once.** glimpses.ts `GLIMPSE_MAX_SEEN` 1 (was 3). The Library's Glimpses list replays any seen one.
- **Action buttons.** styles.css: `--button` 64px (56px in portrait and short landscape; was 58/50). Every position in the cluster is in `--button` units. `.action-diamond button` gets a translucent gradient and lighter shadow.
- **Dodge bursts.** game.ts `dodgeBurst(x, y, radius, base)`: `(base + magicBonus) × (1 + Pairing spellDamage) × (1 + armor spellDamage)`; the armor bonus includes meals, pages and the empowered robot. Ember Wake (game.ts) and Afterimage (constellation.ts `onConstellationDodge`) call it. glyphs.ts `ARMOR_GLYPHS.volatile.burstRadius .3` and `ARMOR_GLYPHS.chain.burstChain .6`, capped in `ARMOR_GLYPH_CAP` at .6 each. With Chain, the nearest foe in the burst gets a second blast of `burstChain` × the damage within `DODGE_BURST.chainRadius` (.8) × the radius.
- The `tests/prototype.test.ts` comment "release 327: the louder mix" is restored (each release bump had renumbered it).

**BOUNDARY:**
- No save change.
- The other armor glyph effects are unchanged.
- Bursts still hit only foes, never the Wayfarer.
- Glimpse chances per moment are unchanged; only repeats stop.

Tests: `tests/dodge-burst-481.test.ts`; `tests/spell-aim-479.test.ts` updated for the order.

## Release 479: spells at your target, a rift you can tell apart — 2026-10-27

Tim: "the spells, when I cast them right now, they just get cast in some random direction, they should just get cast at whatever enemy... I'm targeting... either it's auto target or... the enemy that I have... tab targeted"; and "the crystals that the rift... the guardians spawn... they're the same... it's kind of confusing... a starburst... or a different color... or a different outline... So they look different".

**CODE:**
- **Spell aim.** game.ts `castSpell` picks the aim in this order: the locked target (`lockedTarget`), then a `pendingAim` whose tap reticle still shows, then auto target (`pickMeleeTarget` within `AUTO_AIM.spellScale` (1.6) × `spell.maxRange`). A `pendingAim` whose reticle has faded is dropped. Before this release, a lock was used only when no `pendingAim` was waiting, and a leftover tap (kept across swings) sent the spell wherever it was. Without a lock it never auto-targeted. The chosen foe gets the `aimMark`. The spell still lands at most `maxRange` toward the aim.
- **Starburst rift.** main.ts `drawApertureVisuals` draws the `apertureDoor` (the Unseen Crossing, perceived once the crossing's guardian has fallen) as a turning teal eight-pointed star (`#8ff0e0` outline, `#1f8a7a55` fill, pale core). `apertureMemory` and `apertureRelic` keep the violet diamond.

**BOUNDARY:**
- No save change; `pendingAim` keeps its shape.
- The Shadow Clone, tool shots and swings are unchanged.
- With no foe in reach and no tap, a spell lands where you stand, as before.

Tests: `tests/spell-aim-479.test.ts`.

## Release 477: just the sigil — 2026-10-27

Tim: "Let's take out the penumbra or the glow around it. Let's just have the sigil, just be the color that his eyes are, and just that's it".

**CODE:** renderer.ts `drawPowerSuit` `cosmos` draws only the two-armed spiral and its core, both in `COLORS.player[2]` (the Wayfarer's eye colour, `#b9925f`). There is no `glowAt` halo, glass orb, rim or motes. `amber` (the back pack's status light) uses the same colour.

**BOUNDARY:** Drawing only. The sigil keeps its shape and its place on the chest in every facing. No rules, save or other sprite change.

## Release 475: wade the lava, reach every crystal — 2026-10-27

Tim: "one of these aperture crystals... is in a wall or in an unreachable area... the lava just kills me immediately, which is fine... when I have power armor I can walk through the lava... the power armor doesn't take damage, but I take damage... I can still die from walking in the lava, so there's still consequence... the sigil on his armor should be yellow, not purple... the same sigil... golden or amber... the same as his eyes".

**CODE:**
- **Safe aperture picks.** world.ts `perceptionOverlay(seed, areaId, tiles, width, entry)` keeps its v1 random picks, then `settle`s each: a pick on lethal ground (`APERTURE_UNSAFE`: lava, abyss, canyon, river, dungeon water, deep water), on a perch, or (when the entry is given) outside `apertureReach(tiles, width, entry)` (a 4-way flood over safe floor, climbing at most one level) moves to a safe reachable tile chosen by `hashSeed(seed:aperture-safe:v1:areaId:id)`. game.ts passes `this.map.entry` at all three call sites. On 1,200 sampled crossings, 32 picks had been on lethal ground; none are now.
- **Lava wading.** vehicle-gates.ts `MECH_LAVA = {heat:.1}`. In game.ts movement, lava is not a hazard while `mechUp()` (robot or empowered, not the drone). At the frame's end, after the plating (`mechAbsorb`) and Ink Shield, a Wayfarer standing in lava in the robot (and not boosting) loses `heat × maxHp × dt`, so it can kill them and the plating is untouched.
- **Amber sigil.** renderer.ts `drawPowerSuit`: `amber` is `#ffb347` again (the pre-393 status light), and the `cosmos` sigil keeps its shape with an amber glow, dark amber glass, pale gold spiral and motes, and a warm core.

**BOUNDARY:**
- No save change.
- Picks that were already safe and reachable stay exactly where they were. Objects already restored from a crossing's snapshot keep their saved place.
- Without the robot, lava still kills at once. The drone, Aerial Step and the boost are unchanged.

Tests: `tests/lava-wade-475.test.ts`.

## Release 473: real wardens — 2026-10-26

Tim: "when you die in a dungeon, the wardens respawn and you get more pages... wardens can only die once... it's disruptive... you have to stop and select the page... just a random buff applies, and there's just a notification... the wardens need to be significantly stronger... about half the strength of the Gate Revenant... more compelling moves... put in some of the elite monsters as wardens... not the rift bosses or the world bosses."

**CODE:**
- **Elite wardens.** marginalia.ts `RULES.warden = {revenantShare:.5, scale:1.1, elites:[vesperwing, gravitantBell, mireApostle, knifeChoir]}`. `wardenSpawns` picks an elite kind by seed and filters out `slain` ids. game.ts `createEnemyFromSpawn` tunes a warden to half of a Gate Revenant probe (`tuneGatePredator` on a fresh `gateRevenant`) for health and damage. It sets `boss: false` (elite combatants are bosses by default) and names it `Margin Warden · <elite>`. `defeatEnemy` skips `completeElite` for wardens.
- **Felled once.** `marginaliaOnKill` records the warden in `dungeonHistory(id).wardensSlain` (`loadArea` passes it to `wardenSpawns`), applies `wardenPage` (unfound first, by seed) to the Scrapbook and the run, and shows it in the defeat notice and message. The offer screen only appears for a page left on offer by an older release.

**BOUNDARY:**
- The elites' own hunts, contracts and rewards are unchanged.
- Reinforcements still answer a fallen warden.
- Additive history field `wardensSlain`.

Tests: `tests/wardens-473.test.ts`; `tests/marginalia-459.test.ts` was updated for the automatic page.

## Release 471: your lock, as it was — 2026-10-26

Tim: "I like the lock targets... we can keep them the way it is... if I tap on the target and it's locked on, I like the way that functions... just moving past targets, the auto lock... it's been a little bit wonky."

**CODE:** `TARGET_LOCK.meleeReach` (5) is how far past the weapon a tapped lock takes a melee swing, the reach it had before release 469 (`profile.range + max(meleeSlack, the old meleeExtra 5)`). `Game.meleeAimAt` takes the lock first again; only without a lock does `pickMeleeTarget` choose, foes in reach first. `AUTO_AIM.meleeExtra` stays 3, so auto aim alone reaches less far.

**BOUNDARY:** ranged aim, tapping to lock and the aim marks are unchanged. Tests: `tests/aim-salvage-perf-469.test.ts` (the lock case).

## Release 469: salvage in bulk, truer swings, smoother frames — 2026-10-26

Tim: "a select all in the gear menu... everything will be highlighted... click something, it'll become deselected... then salvage"; "the targeting seems a little bit long... I'll be moving past enemies and the targeting won't hit them... I don't know where it's aiming"; and a 300-second probe (taken on r455) showing slow frames "in some sections".

**CODE:**
- **Select and salvage.** game.ts `salvageInventoryItems(save, items)` salvages by identity. In main.ts, the Gear tab's carried list gets Select all, `Salvage selected (n) · iron`, Cancel, and tap-to-toggle cards (`gearPick`, a Set of item objects, cleared on `resume`).
- **Truer swings.** `pickMeleeTarget(player, enemies, map, width, reach, core)` sorts foes within `core` (weapon range + `TARGET_LOCK.meleeSlack`) before any others; `selectMeleeAim` wraps it. `Game.meleeAimAt(range, width)` chooses, in order:
  1. a lock within core;
  2. any foe within core;
  3. a lock within the auto-aim range;
  4. the nearest reachable foe.

  It sets `aimMark {id, until}` (`AIM_MARK.ms` 450), which the renderer draws as fading corner brackets. `AUTO_AIM.meleeExtra` is 3 (was 5); `tests/auto-aim-419.test.ts` was updated to match.
- **Smoother frames.** The probe showed game code at about 1 ms per frame and its 40–50 ms frames as browser (GPU) time, clustered during attack spam. The melee swing arc (main.ts) drew a `shadowBlur` 9 stroke every swing; it is now a wide translucent stroke under the edge. The Watcher's tomb and the warp dais use a translucent disc instead of `shadowBlur`.

**BOUNDARY:**
- Damage, reach and lock range are unchanged.
- The probe's other costs are not addressed here: section loads at 40–73 ms, and 20–37 ms saves every 8 s.

Tests: `tests/aim-salvage-perf-469.test.ts`.

## Release 467: fixes from the Codex audit — 2026-10-26

Codex audited release 455 read-only (docs/test-runs/2026-10-26-release-455 on branch claude/audit-test-runs-2026-10-26, draft PR #214): six findings (F001–F006) and three interaction findings (I001–I003). Each was reproduced on the current source before it was fixed.

**CODE:**
- **F001.** The cistern's runtime pool (four tiles at 11–12, 4–5) is not laid when it would cut a guardian spawn or an exit off from the entry (laid as before otherwise, so Psychic Crystal haunts that need its water are unchanged). THRESH451-82: the entry reached 29 tiles; now 417, guardian included.
- **F002.** proving-ground-mobile clears `hidden` before `showModal`, and styles.css shows `#pgDiagnostics[open]` (the Proving Ground hides every dialog by default).
- **F003.** meals.ts `isIngredient`, marginalia.ts `isMarginalia` and lore.ts `ensureLore` use own-key membership, so `constructor` or `__proto__` keys are dropped instead of crashing.
- **F004 and F005.** types.ts `sanitizeSaveShape` runs first in `migrateSave`. It:
  - clamps `SAVE_NUMBERS`, stats, materials and consumables to finite ranges;
  - empties non-array `inventory` and `narrative.journal`;
  - keeps only object entries in `session.areas` and `consequences.dungeons`.
- **F006.** game.ts `openWayglassApproach()` (overworld load): a Wayglass not adjacent to the section's largest walkable component gets a two-tile straight path cleared to its nearest cell (tiles marked `wayglassPath`).
- **I001.** The Bombard's `rift-blast` carries the shot's `glyphHost`, so tool glyphs apply once per foe hit.
- **I002.** `castShadowClone` multiplies by the spell's glyph cooldown mods.
- **I003.** `tickGlyphStatus` recomputes speed from the saved base whenever a slow is active.

**BOUNDARY:**
- No generator change. The pool and Wayglass edits are deterministic load-time map edits.
- Saves with good data are unchanged; only malformed values are normalised.
- Boss balance signals in the audit were not acted on: they are not correctness findings.

Tests: `tests/audit-fixes-467.test.ts`.

## Release 465: Watcher's shrines on the map — 2026-10-26

Tim: "those teleportation shrines... in the symbol for the watcher... should be marked as a location on the map... one of the things that are identified on the map."

**CODE:** game.ts records `watcherTomb` objects among a section's Atlas sites, named "Watcher's Shrine" (`where: "shrine"`) or "Watcher's Tomb". main.ts adds the `watcherTomb` Atlas symbol (legend: "Watcher's shrine"), maps it to the `watcher` signal, and draws an eye glyph in pale violet; it shows under the Places layer. atlas-view.ts `PLACE_KINDS` lists it in Go to….

**BOUNDARY:** Atlas records are written when a section loads, so shrines seen before this release are marked on the next visit. Nothing about the shrine itself changes. Tests: `tests/watcher-atlas-465.test.ts`.

## Release 463: tougher dungeons — 2026-10-26

Tim: "increase the enemies in the dungeons... 20% more health... 20% more damage... about twenty percent more monsters."

**CODE:** game.ts `DUNGEON_BOOST{hp:1.2,damage:1.2,count:.2,near:3}`. `createEnemyFromSpawn` scales a dungeon foe's health and damage after the threat and taste tuning, except passive, ambient, astral, world-beast, Questing Beast, Far Array boss and Gate Revenant (gatePredator) foes. Summoned brood and reinforcements are not spawns and keep their own numbers. `extraDungeonSpawns()` (from `loadArea`, before the Margin Wardens) adds round(count × the crossing's ordinary spawns): copies of non-guardian spawns (any non-guardian `dungeonRole`, no encounter group) on open, safe floor within 3 tiles of one, by seed, with stable ids `<crossing>:extra:i`. None are added in arenas, Far Array runs, hunt instances, or crossings already resolved or cleared. `tests/gate-revenant-integration.test.ts` now expects the boosted final-boss numbers (640 health, 52 damage).

**BOUNDARY:** no generator change; saved foes keep their saved health. Tests: `tests/dungeon-boost-463.test.ts`.

## Release 461: damage numbers, and twenty marginalia — 2026-10-26

Tim: "a button in the options where we can toggle on or off damage numbers... how much they do to us and how much we do to them... each dodge leaves behind a shadow clone for like 3 seconds... another one could be just cool down... come up with... more, so we have 20."

**CODE:**
- **Damage numbers.** persistence.ts `damageNumbers` (default on); main.ts adds the toggle in Options → Accessibility and sets `game.damageNumbers`. game.ts `DAMAGE_NUMBERS{life,rise,cap}` and `trackDamageNumbers(now)`, called in `update` after the frame's damage: a drop in a foe's `hp` (from `e._dnHp`) is a gold "dealt" number, a drop in the Wayfarer's (in the same area) a red "taken" one. Heals, arrivals and illusions make none. They are not saved, and at most 48 show at once. renderer.ts `drawDamageNumbers` draws them rising and fading, offset in a five-step fan.
- **Marginalia** (marginalia.ts): eleven more, twenty in all.
  - Stat rules: Lifeblood, Deep Lungs, Heavy Hand, Inkwell and Long Arm. `reach` joins the gear-bonus fields, and characterStats `attackReach` adds it.
  - Event rules: Shadow Step (on dodge, a `shadowClone` 2 tiles behind for 3 s when none is active, through the release-365 clone that repeats attacks at half strength), Hourglass, Gilded Margin, Smith's Note and Sigil Page (all in `marginaliaOnKill`), and Ink Shield (`applyInkShield(hpStart, now)` in `update`: health lost in the frame comes back, once per 10 s, on a runtime clock).

**BOUNDARY:** damage numbers are drawing only. The shadow from Shadow Step is the existing clone (casting Shadow Clone while it stands steps into it, as always). No save change beyond the setting. Tests: `tests/damage-numbers-marginalia-461.test.ts`.

## Release 459: Marginalia — 2026-10-26

Tim: "each time you go into a dungeon... you can find different marginalia, and they'll change how you play in the dungeon... after Infinite 4... more of a roguelite... a Scrapbook... you can paste them in when you get into the dungeon... several guardians in the dungeon... killing one is the one that you need to exit... as you kill a guardian, you get to select different marginalia... they call in reinforcements."

**CODE:** `src/marginalia.ts` (new; in the build and both sw.js lists) holds `RULES` (tier 14, offer 3, one paste, wardens by reachable floor size, warden hp ×7, damage ×1.5, scale 1.3, reinforcements 5 with a live cap of 28), `MARGINALIA` (nine: five stat rules as `bonus`, four event rules) and pure rules. `wardenSpawns` walks the floor from the entry (so no warden stands in rock), keeps 9+ tiles from the entry and 7 between wardens, by seed, in ordinary crossings only (the Seven Bells regex). `wardenOffer` puts unfound marginalia first. `chooseMarginalia` adds to `save.marginalia.found` (the Scrapbook) and to the run. `pasteMarginalia` handles one paste per crossing. The run is `save.session.marginRun = {dungeon, perks, secondWind, offer, pasted}`; its annex counts as the same crossing.

In game.ts:
- `loadArea` pushes the wardens into `enemySpawns` (stable ids `margin-warden-i`, so the snapshot keeps them dead) and ends the run on any overworld load. The death wrapper restores the run when a fall re-enters the same crossing.
- `createEnemyFromSpawn` scales a warden.
- `armorGlyphBonus` folds `marginBonus` in beside meals (fields now include `defense` and `dodgeCost`).
- `marginaliaOnKill` handles Red Margin and Quick Ink, and, for a warden, sets the offer and calls `callReinforcements`: kinds of the crossing's own spawns, 7–21 tiles from you, on open, safe floor, aggro, never saved.
- Dodge triggers Ember Wake through `glyphWorld().blast`; Second Wind triggers before the death branch (not for hazard falls).
- Entering a crossing at tier 14+ begins a run and asks for the Scrapbook paste when it holds pages.

monster-pack `staggerClass` counts `marginWarden` as a boss (poise and the dungeon-map mark). main.ts:
- `openMarginOffer` reopens until a page is taken, including after a reload;
- `openScrapbookPaste`;
- HUD `MARGINALIA ...`;
- a Scrapbook row in Supplies.

**BOUNDARY:** wardens are never `boss` and never crossing guardians, so completion, doors and the displacement seal are unchanged. No generator change (added at load). Save: `save.marginalia` (additive, normalised in `migrateSave`) and the session run (normalised). Tests: `tests/marginalia-459.test.ts`.

## Release 457: to +10 — 2026-10-26

Tim: "after Infinite 4, after you've played the second gate, you should be able to upgrade your weapons to +10... +10 is the max upgrade."

**CODE:** items.ts `LATE_UPGRADE{ranks:3,tier:14,listeners:2}` and `lateUpgradeOpen(save)` (Aperture band 14, Infinite IV, and `farArray.listeners >= 2`). `itemCap(item, save)` adds the ranks when it is open; `upgradeCost(item, save)` and `upgradeEquipment` pass the save. `normalizeItemUpgrade` (no save) now clamps to the widest legal cap (base + masterwork + 3), so ranks earned past the base cap survive every save and migration. The Forge button passes the save and, at the base limit, names what raises it.

**BOUNDARY:** sphere costs per rank are unchanged (rank + 1). Without a save, callers see the old caps. No save change. Tests: `tests/upgrade-cap-457.test.ts`.

## Release 455: margins — 2026-10-26

Daily narrative session, docs/narrative-bible.md section 7, step 6 ("Ilse, the Seven Bells, margins in crossings"), and section 2 ("Margins: inscriptions, objects or Glimpses inside the region's crossings", about 20% of each Reading).

**CODE:** `src/margins.ts` (new; in the build and both sw.js lists). `MARGINS{chance:.2,minFromEntry:5,maxPassage:220}`. `MARGIN_NOTES[readingId]` holds, for each of the Reading's margin fragments (lore.ts `margin:i`, ids fixed since release 191), the words that find its line in the Reading's own book and the original note written beside it. `marginPassage` returns the first short line holding those words (a fixed-hash line should the library change). `marginIn(seed, dungeonId)` gives an ordinary crossing's margin by seed (the same regex as the Seven Bells, any distance; the Reading is `readingAt(rx, ry)`). `addMargin` places a `marginNote` on open floor away from the entry; if the crossing's own margin is read and another of the Reading's is not, it shows the first unread one, so every margin can be found. `readMargin` credits the fragment through `creditPiece` once. game.ts calls `addMargin` beside `addBell` in `loadArea`; Act at a `marginNote` reads it, writes the Journal ("Margins", or "Margins · <Reading>" once the Reading is known) and, the first time, tells how far through the Reading's fragments you are (or "a book you have not heard yet", so nothing names an unheard Reading). renderer.ts `drawMarginNote`: a low slab with cut lines and a smaller slanted hand, faintly lit until read.

**BOUNDARY:** no generator change (the note is added at load, like the bells). The passages are public-domain lines already in the library; the notes are original. Save: lore pieces only, as before. Tests: `tests/margins-455.test.ts`.

## Release 453: ways out, named on the map — 2026-10-26

Tim, in a Mislaid Threshold crossing: "There's no exit... I got to the second level. But there was no exit. So now I'm kind of just trapped." Simulation found no crossing or annex (80 annexes) whose exit could not be reached, and his screenshots showed the exit as a small cyan block; it was not recognisable as one.

**CODE:** main.ts `dungeonMapTag(o)` names an `exit` ("WAY BACK" in an `:aperture-annex`, "DOOR OUT" for a completion exit or `threshold-door`, else "EXIT"), a `warpDais` ("DAIS") and a `deepReturn` ("EXIT"). `drawDungeonMap` writes the word beside each discovered marker in its own colour, flipped to the left near the right edge.

**BOUNDARY:** drawing only; which markers show, and discovery, are unchanged. Tests: `tests/map-exit-label-453.test.ts`.

## Release 451: a way out of the Mislaid Threshold — 2026-10-26

Tim: "I saw a shrine on the overworld and I clicked it. And it took me to this dungeon... When I killed the guardian, he didn't spawn a door for me to leave... now I can't leave."

**CODE:** a Mislaid Threshold (`displacementDevice`) sets `session.activeDisplacement` and loads its crossing. Completion doors (`installCompletionExit`) skip displacement crossings, so the only way out was the entry `exit`, sealed while any crossing guardian (`isCrossingGuardian`) lived, with no door and no word when it opened; a crossing whose boss fell while its warden lived stayed sealed. `defeatEnemy` now, in a displacement crossing, when a boss falls or the last crossing guardian falls, sets `history.thresholdOpen` and `history.thresholdDoor`, raises `threshold-door` (an `exit`, so the existing displacement release handles it) with `Game.raiseThresholdDoor`, shows the THE THRESHOLD OPENS notice and writes a journal line. `Game.thresholdOpen()` (the flag, or no live crossing guardian) gates the entry exit. `loadArea` re-raises the door and opens it for a guardian or boss already found dead in the restored area (saves from before this release).

**BOUNDARY:** other dungeons' completion doors are unchanged; the displacement destination and Wayglass rules after it are unchanged. Additive history fields only. Tests: `tests/threshold-door-451.test.ts`.

## Release 449: a Crossing Sigil you can use — 2026-10-26

Tim, with a screenshot of Supplies: "Crossing sigil is still not something I can use."

**CODE:** Supplies listed the sigil with no button (release 291), and the Atlas's travel button in a dungeon only called `useCrossingSigil()`, which left the dungeon at its entrance although the text promised "across the corridor". `Game.useCrossingSigil(key)` now leaves the dungeon and, when `key` names a lit Wayglass, goes on with `travelToCheckpoint(key)`. main.ts passes the Atlas's chosen Wayglass, labels the button `Use Crossing Sigil ×N → <Wayglass | dungeon entrance>`, and gives the Supplies row a Use button that (inside a dungeon, with a sigil) closes the Pack and calls `openSigilAtlas()`: the corridor Atlas with a prompt to choose a Wayglass.

**BOUNDARY:** one sigil per use, as before; outside a dungeon it is not spent, and the button reads "Use (inside a dungeon)", disabled. No save change. Tests: `tests/crossing-sigil-449.test.ts`.

## Release 447: Refuge meals — 2026-10-26

Tim: "food buffs... 15 minutes... you should have to go back to the town to get another buff, so it shouldn't be like you can carry food with you... similar to Monster Hunter... combinations of ingredients to make a food that gives you a desired buff... extra damage, life, stamina, movement speed, attack speed... It shouldn't be crazy... something that attracts... world bosses... make it easier for world bosses to find you."

**CODE:** `src/meals.ts` (new; in the build and both sw.js lists) holds the balance in `MEAL{seconds:900,hearty:1.5}` and `INGREDIENTS` (price, course, bonus fields), and pure rules: `mealName`, `mealBonus`, `mealPercent`, `eatMeal` (pays, replaces), `tickMeal`, `ensureMeal` and `mealLure`. `save.meal = {a,b,remaining}` is additive, normalised in `migrateSave` (junk or spent meals dropped), and ticks with play time in `Game.update`. game.ts folds `activeMealBonus` into the gear bonus (`armorGlyphBonus`: attackDamage, spellDamage, hp, staminaRegen, move, attackSpeed, spellCooldown), so meals act through the same paths as armor glyphs. `refreshDerivedStats` re-syncs maximum health and stamina when a meal starts or ends. Cooks are objects with `cook: true`: Hollis (refuge-lands.ts) and `town-cook-rx-ry` raised by `raiseTownAmenities`. Act at a cook sets `kitchenRequested` (his talk lines still advance); main.ts `openKitchen` picks two ingredients and calls `Game.eatAt(cookId,a,b)`, which refuses unless that cook stands within 3 tiles. The HUD shows `MEAL m:ss`. Bloodmoss: `encounterReady` needs `ceil(newSections × mealLure.gap)` new sections and `encounterChance` (overworld beasts and the Questing Beast) multiplies by `mealLure.chance`, as does the dungeon chance.

**BOUNDARY:** only one meal at a time; no carried food. Cooldowns after a beast is slain or escapes, Aperture unlocks and minimum depths are unchanged by Bloodmoss. No generator change; save change additive at schema 14. Tests: `tests/meals-447.test.ts`.

## Release 445: an instant jump — 2026-10-26

Tim: "There's actually a significant delay between when you press the jump button and when the character actually jumps... the character needs to jump when you actually press the button, not like a second later."

**CODE:** a jump lasted 520 ms plus 140 ms per Quickening rank, but the renderer drew a fixed 520 ms arc counted back from `jumpUntil`, so the extra time came first and the hero stood flat after the press (up to 420 ms at rank 3). `game.ts` now holds the numbers in `JUMP{base,quickening,arc}` and records `jumpStart`/`jumpDur` on the press (paused time shifts `jumpStart` like `jumpUntil`; an exact resume clears it). `jumpLift(g,now)` rises over the plain leap's first half from `jumpStart`, holds the top through any extra time and while the robot boosts, and falls over the plain leap's second half before `jumpUntil`; `renderer.ts` draws `lift = jumpLift(g, now) * s`. A resumed leap with no start falls back to `jumpUntil - jumpDur`.

**BOUNDARY:** the visual arc changes; how long you are airborne, what a jump clears, and the input timing are unchanged. No save change (`jumpStart` is runtime only). Tests: `tests/jump-445.test.ts`.

## Release 443: easier travel — 2026-10-26

Tim, 2026-10-26: "the Wayglass beacons... should just be arranged numerically, so I can just scroll down... when I'm in the Atlas and I select a section that has a Wayglass in it, it should just automatically populate the... travel to Wayglass"; "in the Far Gate section of the journal, whenever there's a new... location for the Listener... a button... make this your active compass... so I can just start navigating to it."

**CODE (main.ts):**
- `refreshWayglassDestinations` sorts by `rx`, then `ry`, then name. Options read `rx, ry · Name`.
- `atlasWayglassNear(rx, ry)` gives the tapped section's Wayglass, else the nearest within `ATLAS_WAYGLASS_REACH` (1) sections. The Atlas tap handler sets `#mapWayglassSelect` to it and calls `updateMapTravelButton()`, so Travel names it at once.
- `renderFarGate`, while the Listener holds the Mouth, adds "Point compass to the Array Mouth": it sets `compassPin` (as Active quests do) and `rememberGuidance()`.
- Tests: `tests/atlas-travel-443.test.ts`. A browser smoke load of the built game shows no errors.

**BOUNDARY:** Travel rules (Wayglass activation, sigils in dungeons) are unchanged. No save change beyond the existing `save.guidance.pin`.

## Release 441: Listener towns with Ember Refuge's services — 2026-10-26

Tim, 2026-10-26 (at Mosscross): "there's no viewpoint, and I can't talk to any of the people... the smith doesn't do anything. He should also be moved a little bit farther... away from the Wayglass... there should be... all the amenities of the Ember Refuge at the new towns that spring up around the Listener's... Mouth."

**CODE:**
- `game.ts raiseTownAmenities` runs for every section with a town record (`townAt`) and adds two services:
  - a `viewport` (the hunt board, opened as at the Refuge);
  - a `townKeeper` (actions upgrade, attune, retrain).
- `townSpot(origin)` places them on open ground at least `TOWN_AMENITY.clear` (3) tiles from the Wayglass checkpoint and `TOWN_AMENITY.spacing` (2) from other objects, nearest the Wayglass. The Mouth town's smith now uses the same rule (it stood two tiles below the Mouth, beside the Wayglass).
- `interactions.ts`: `townKeeper` upgrade → forge, attune → skills, retrain → `retrainStats` (Oren's rules, its own name).
- `game.interact` opens its action menu.
- **The smith:** Act on the `townSmith` sets `game.smithyRequested`, which `main.ts` polls to open the smithy, as shops are opened. Before, only a direct tap's result opened it; Act from the game loop showed the greeting and nothing else.
- `renderer.ts` draws the keeper with an Aperture lens.
- Tests: `tests/town-amenities-441.test.ts`.

**BOUNDARY:** The townsfolk still say their line when spoken to; the Refuge's Aperture plinth and its people stay unique to it. No save change: the services are placed each time the town loads.

## Release 439: no more landing in the dark — 2026-10-26

Tim, 2026-10-26 (screenshot: the Wayfarer alone in darkness after "The annex resolves around you in impossible clarity"): "It's still starting me in random places... it happens randomly, like intermittently."

**CODE:**
- **The cause:** release 419's `settleArrival` covered stairs, lattices, entrances, death recovery and loads, but six transitions still set a fixed position after `loadArea` and skipped it:
  - the Aperture annex (4,5) and its return (`veilReturn`);
  - displacement thresholds (4,5);
  - the Listener's Hall (entry, one row up);
  - Viewport hunt instances (entry);
  - the elite portal (4,5).
- **Measured:** in 11 of 40 generated annexes, (4,5) is off the floor.
- **The fix:** the annex and displacement landings now use `map.entry` (falling back to 4,5). All six call `settleArrival()` afterwards: the floor reached from the entry, clear of guardians, with discovery refreshed.
- Tests: `tests/arrivals-439.test.ts`.

**BOUNDARY:** The underwater dive keeps its own entry landing (its floor rules differ). No save change.

## Release 437: the Psychic Crystal stays where you can hit it — 2026-10-25

Tim, 2026-10-25: "the psychic crystal keeps staying in the squares where I can't attack him... He just stays there, attacks me, and then, you know, I'm dead."

**CODE:**
- **The gap:** release 401's rule in `packWorld.move` (no wall drifting) applied only while the Crystal had line of sight. Once it slipped behind a wall, the dungeon-roamer branch let it phase into the rock and stay there.
- **Movement now:**
  - An aggro Crystal in a dungeon that is in the open with you in sight walks (`moveAxis`), as in release 401.
  - Inside rock (`e.inRock`, set by the move), it keeps moving through. If a move stalls there, it is nudged toward the nearest open footprint (new `nearestOpenFootprint`).
  - Out of sight, it may still phase through a wall to reach you; `tests/dungeon-roaming.test.ts` needs that so it is never trapped in its room.
  - `monster-pack.ts updatePackMonster`: while `e.inRock`, a dungeon-roaming Crystal heads straight for you and begins no attack.
- **Verification:** in two simulated real-dungeon fights of 2400 frames, the old code had it fighting from inside rock for 1902 and 707 frames. Now it is 109 and 63, in passes of at most about 2 s, with no attack begun inside rock.
- Tests: `tests/crystal-437.test.ts`.

**BOUNDARY:** Unaware (patrolling), it still roams through stone, as Tim asked in release 259. Attacks, poise and dodges are unchanged.

## Release 435: mixed dungeons in the Far Sleep — 2026-10-25

Tim, 2026-10-25: "a disproportionately large number of dungeons in the dreamland are just like dreamland dungeons... the first level seems to be just always a dreamlined dungeon, that's not how it should be... You should still be just like mixed dungeons."

**CODE:**
- `underlands.ts`: `DREAM_HALL.share = .3` and `dreamHallRoll(seed, id)`.
- `generatePinnedDungeon` (game.ts): when an ordinary crossing in the Far Sleep is first pinned, `history.dream` becomes `DREAM_HALL.version` only on that roll; otherwise it is pinned `0` (ordinary), where every one used to be a Sleeper's Hall.
- Multi-level deep dungeons were never Sleeper's Halls, which is why their second floors looked different.
- Tests: `tests/dream-share-435.test.ts`. `tests/dream-hall-351.test.ts` picks a crossing that rolls a Sleeper's Hall.

**BOUNDARY:** Histories already pinned keep their `dream` value, so the halls a journey has found stay halls. No change to the hall generator itself.

## Release 433: shovels everywhere underground — 2026-10-25

Tim, 2026-10-25: "I'm in a dungeon that says the walls cannot be bitten by the shovel... I'm at a wall right now. And the shovel isn't working... we need to make sure that the shovels are actually working. Whatever we decided on."

**CODE:**
- `digging.ts canDigHere(areaKey)`: any area.
- `planDig` uses `canDigHere`, so the refusal "not stone a shovel can bite" no longer fires in the TEMPORARY areas (hunt-instance, hunt-arena, elite-portal, proving, displacement, arena, far-array, dive).
- `canDigArea` still marks the areas whose tunnels are kept. In `dig`, a temporary area's tunnel is opened on the map but not pushed to `save.digging.dug`, and its walls give no `wallTreasure`.
- The cost rules (standard shovel, a whole shovel for an obstacle, the iron shovel's points and its automatic forging) are unchanged.
- Tests: `tests/temporary-dig-433.test.ts`. `tests/digging.test.ts` now expects the shovel to work there.

**BOUNDARY:** No save change. Overworld digging still waits for Infinite II (release 425).

## Release 431: the Seven Bells — 2026-10-25

The daily narrative task: `docs/narrative-bible.md` section 6, thread 1, and section 7, step 6 (after Ilse in release 415).

**CODE:**
- `src/bells.ts`: `BELLS{count:7, chance:.14, minDepth:3, maxDepth:READING_BANDS.middle}`, `BELL_GLIMPSES` 1–7 (seven lost people, each walking home) and `BELL_FINAL` (the door at dusk). All of it is original writing.
- `bellIn(seed, dungeonId)`: which bell (by seed) hangs in an ordinary crossing (`dungeon:…:gN:rx:ry:…`) at depth 3–18, or 0.
- `addBell` hangs it on open floor at least 6 tiles from the entry; a bell already rung hangs silent ("inspect").
- `ringBell` records it in `save.lore.bells`, a sorted digit string normalised by `bellsRung`; `ensureLore` keeps it through its spread.
- `game.ts`: `loadArea` calls `addBell` for dungeons. `interact` rings it, writes a Journal entry ("The Seven Bells") and, at the seventh, the door.
- `renderer.ts drawCrackedBell`: a bronze bell with a crack on a frame; rung ones glow faintly.
- `main.ts activeQuests` lists the thread while 1–6 bells are rung.
- Registered in `scripts/build.mjs` and both `sw.js` lists.
- Tests: `tests/seven-bells-431.test.ts`.

**BOUNDARY:** No reward, no combat, no generator change: the bell is an object added on load, like the dig spot. The Glimpses are written scenes in the message and Journal; painted Glimpse scenes for them can follow in a later pass.

## Release 429: wounds that really stay; no Void Walker in dungeons — 2026-10-25

Tim, 2026-10-25: "I just fought the void Walker in a dungeon, and he was just like floating off through space... through blocks and tiles... It's possible that I shouldn't be meeting him in the dungeons, because he makes kind of a big mess... his health reset. When I died... make sure that the health doesn't reset when you die for the world bosses."

**CODE:**
- **The cause:** release 423 stored `active.hpShare` in `game.resolveDeath`, but the "fresh duel" loop just after it still set `e.hp = e.maxHp` and deleted `active.wounds` (the release-353 rule that a death heals a beast). The area snapshot then saved the healed beast, so the share never applied.
- **The fix:**
  - The loop now keeps `e.hp` and writes `active.wounds` from it. That covers tries on and tries off (release 345/353 branches).
  - It still calms the beast, resets its pack runtime and starts a fresh patience clock.
  - `applyBeastWounds` brings the wounds back however the beast is loaded.
- **Void Walker in dungeons:**
  - `WORLD_BEASTS.voidWalker.dungeonChance` is 0 (was .3).
  - `worldBeastForDungeon` keeps beasts with a defined `dungeonChance` in its lookup, so a hunt already recorded in a dungeon still loads there.
  - Investigation: in simulated dungeon fights (2400 frames) the Walker never stood in a wall on foot. The likely sight was the Walker riding the Astral Worm, whose dungeon pairing (2%) is unchanged.
- **Tests:**
  - New `tests/beast-wounds-429.test.ts`.
  - Owner-rule updates to the full-health-rematch expectations in `tests/beast-wounds-353.test.ts`, `tests/beast-tries-345.test.ts`, `tests/beast-baseline-rematch.test.ts`, `tests/gate-revenant-integration.test.ts` and `tests/astral-natural-encounters.test.ts`.
  - `tests/void-walker-integration.test.ts` now expects no new dungeon hunts.

**BOUNDARY:** Tries, escapes, cooldowns, rewards and retreats are unchanged. A beast's health resets only when it dies or its hunt ends.

## Release 427: every boss hit shown in pink — 2026-10-25

Tim, 2026-10-24: "the turtle's tornadoes... don't have pink boxes beneath... we need to go through all of the world bosses... make sure that all of their attacks register their hit boxes... fuchsia pink... beneath them. So that we can see where the... damage is coming from."

**CODE:**
- `monster-pack.ts`:
  - `HIT_FOOTPRINT.pad` (what each effect's hit test adds to its radius; `fallbackPad` .2).
  - `effectFootprint(f)`: any live effect with damage. Lanes (length/to) and circling orbs are excluded; their own renderers draw them.
  - `BODY_HIT` (body-contact attacks and their hit pad) and `bodyHitFootprint(e)`.
- `knightBackslash` now telegraphs its arc (`bodyRadius + slideReach + arcReach`, `comboArc`); it had no warning.
- `monster-render.ts`:
  - `drawPackEffects` first draws every effect footprint in `DANGER` pink, dashed while arming.
  - `drawPackTelegraphs` draws the body footprint under a boss using a body attack, dashed during windup.
  - `drawVoidWarning` and `drawVoidLane` use `DANGER`.
- `astral-worm-render.ts drawAstralHazards` uses the same pink.
- Tests: `tests/hit-footprints-427.test.ts`. It includes a sweep that runs every world beast's every attack and fails on any damaging effect with no marking.

**BOUNDARY:** Rendering only, plus one telegraph; no damage, timing or hit test changes. The Listener's moves already used `DANGER`.

## Release 425: the open world waits for Infinite II — 2026-10-24

Tim, 2026-10-24: "you can get the shovel whenever, but you can't change the world overworld blocks, you can't modify the overworld until infinite two."

**CODE:**
- `digging.ts OVERWORLD_DIG.tier = 12` (`APERTURE_BANDS[12]` is Infinite II).
- `game.digAhead`: in the overworld, a sound dig plan below that tier (`saveTier`) is refused with a message before any shovel is crafted or spent.
- Tests: `tests/overworld-dig-tier-425.test.ts`.

**BOUNDARY:** Dungeon digging, dig spots and the shovel recipe are unchanged. Tunnels dug earlier are kept.

## Release 423: kept wounds, open dreams, open-world digging — 2026-10-24

Tim, 2026-10-24: "The world bosses... keep their health when you die... it only resets after they die"; "the dreamlands have too many obstacles in them. So I can't... burst around and run from the bosses... It also just makes... traverse... harder"; "you should be able to use the shovel. In the overworld, also to dig through blocks and things... just like it works... in the dungeons."

**CODE:**
- **Kept wounds:**
  - `game.resolveDeath` stores each living world beast's and Questing Beast's health share on its hunt record (`active.hpShare`, additive). `ensureWorldBeasts` keeps it by spread, and `ensureQuestingBeast` now keeps it explicitly.
  - `createEnemyFromSpawn` gives a tuned beast back that share of its health.
  - The record goes with `active` when the beast dies or escapes.
- **Dream version 2:**
  - `landscape.ts DREAM_VERSION = 2`, with `DREAM_BY_VERSION[2]` = `{voidAbove:.82, terraces:[.62,.8], stoneAbove:.955}` (v1: .72, [.5,.64], .88).
  - The atlas pins `dreamVersion` on first visit, so explored sections keep v1.
  - In a sample, blocked dream ground falls from about 10% to 3.6%, raised ground from 28% to 19%.
- **Overworld digging:**
  - `digging.ts` adds `OVERWORLD_DIG`, `overworldDiggable`, `overworldDigKey(rx,ry)` (`overworld:rx,ry`), and `planDig(..., {overworld})`. In the open world there is no sealed-hall check; a sleeper-stone, spire or crag is an "obstacle", other rock a "wall".
  - `openTunnel(map,x,y,overworld)` levels a dug tile to the lowest open ground beside it.
  - `applyTunnels(..., overworld)` reapplies tunnels on section load (`loadArea`, outside settlements).
  - `game.digAhead` runs in the overworld when not aboard a boat.
- Tests: `tests/beasts-dreams-digging-423.test.ts`.

**BOUNDARY:**
- No generator changes for explored sections.
- The tries and patience rules are unchanged; only health carries over.
- Water, chasms, starVoid, ice, castles, buildings, builds, environments and settlements are never dug.
- The per-section tunnel cap (60) and the 3-block reach apply as in dungeons.

## Release 421: calmer bosses — 2026-10-24

Tim, 2026-10-24: "the bosses do too much damage... reduce their damage... 15%... more wind up... the nanobot knight... his homing... orbs... should be blocked by walls and blocks... home in on you for like 2 seconds. And then they should just fly straight... more cool down between their attacks... they attack way too aggressively."

**CODE:**
- `monster-pack.ts`: `BOSS_PACE{damage:.85, windup:1.2, cooldown:1.25, gap:1.35}` and `bossPaced(e)` (`staggerClass` boss or revenant).
- `updatePackMonster` marks `e.pack.paced` when the world sets `bossPace` (never on a zero-dt frame).
- The marked pack bosses get a scaled windup in `beginAttack`, a scaled cooldown in `cooldownScale` and a scaled pause in `endAttack`.
- `updateGatePredator` scales the Revenant's warn and gap the same way.
- `game.ts` `packWorld` sets `bossPace: true`; a bare module world (the attack-module tests) keeps base timings.
- **Damage:** `packHurt` multiplies a boss source's damage by `BOSS_PACE.damage`, except the Astral Worm's drain, which is also its heal (release 307). The same cut applies to contact blows and boss shots in the older enemy AI.
- **Older enemy AI:** boss telegraphs and cooldowns are scaled too.
- **The Knight:** `KNIGHT.missileHome` 2 s of homing, then straight; `missileFuel` is 4 (was 2.4).
- **Builds stop seekers:** `packWorld.shotBlocked` (a wall or any build tile) stops seeker orbs and missiles.
- Tests: `tests/boss-pace-421.test.ts`.

**BOUNDARY:** Elites and ordinary creatures, boss health, poise and the stagger governor are unchanged. Effects already in the air keep their own timers.

## Release 419: sharper auto targeting; the Build button holds a Shadow Clone; safe dungeon arrivals — 2026-10-24

Tim, 2026-10-24: "yes make the build button hold too. Also, the automatic targeting of enemies isn't working very well... It needs to be a little bit more sensitive and a little bit longer range."

**CODE:**
- `game.ts AUTO_AIM` is now `{meleeExtra:5, rangedScale:2.2, facingBias:.75}` (was 3 and 1.6).
- `autoAimBody(e)` (bodyRadius, or half of scale above 1) is subtracted from the distance in `selectMeleeAim` and `selectRangedAim`.
- `autoAimable(e)` skips dead, hidden, untargetable, ambient, astral allies and npc kinds in both. Melee previously skipped only the dead.
- The melee pick scores distance minus edge minus alignment × `facingBias`, so a foe ahead beats one a little nearer behind.
- `TARGET_LOCK.pick` is 1.35 (was 1.05).
- The Build button's "cast" mode sets `castAction = "build"` around `castKey`, so `castShadowClone` charges against `input.held("build")`.
- Tests: `tests/auto-aim-419.test.ts`.
- **Arrivals** (Tim: "I keep getting spawned in... out of bound areas... the second level of a dungeon... will be just black... it spawns me right by The Guardian... a hard rule"):
  - The cause: an arrival point in a wall fell back on `relocateIfStranded`'s nearest open tile, which can be inside a pocket walled off from the level, such as the sealed final chamber behind the `sealedGate`. `clearArrival` then counted only guardians on that pocket's floor.
  - New `settleDungeonArrival(map,width,at,enemies,guardians)` flood-fills the floor from `map.entry` (or `hub`) and moves the arrival to the nearest floor tile at least `ARRIVAL.clear` (8) from every living guardian (`isDungeonGuardian` or `isCrossingGuardian`), whatever lies between. Failing that, it picks the floor tile farthest from them.
  - `Game.settleArrival()` runs it and refreshes discovery. It is called after deep stairs, return lattices (`deepPortal`, `deepReturn`), dungeon and Mouth entrances, `recoverFromDeath` and the relaunch recovery (replacing their `relocateIfStranded` + `clearArrival` pair).
  - `loadArea` applies the floor rule alone (no guardian rule) to a loaded dungeon, so a resumed Wayfarer is never left in a sealed pocket but is not pulled out of a fight.
  - Wing anchors set on a multi-level floor now record `levelId`.
  - Tests: `tests/dungeon-arrival-419.test.ts`.

**BOUNDARY:** A locked target still wins, and the blow and the shot still travel only as far as before; only where they turn changes. Lock range (16) and lock behaviour are unchanged.

## Release 417: the Shadow Clone, placed by holding — 2026-10-24

Tim, 2026-10-24: "The shadow clone spawn too far away it should spawn within that circle around the character when you give it the default press. It can get positioned up to the max distance by holding the clone button. So a shadow should travel over the floor indicating the position of the clone and the clone should spawn where the shadow is when you pick up your finger... basically tapping the button counts like the shortest press and hold duration."

**CODE:**
- `late-spells.ts`: `SHADOW_CLONE` gains `near:1, grow:6, tapGrace:.12`; `distance` (5) is now the farthest a hold reaches. `chargeDistance(held)` gives how far the shadow has gone after `held` seconds.
- `game.castSlot` records which button cast (`castAction`: "spell" for A, "spell2" for B).
- `castShadowClone` sets the clone `near` you (`cloneOffset(..., SHADOW_CLONE.near)`) with `charging {action, start, dir}`, and no longer arms the tap placement (`cloneAim` stays false).
- `tickCloneCharge(held, now)`, run each frame from `update` with `input.held(action)`:
  - while the button is held, it moves the offset out along `dir` (re-aimed behind you while you move);
  - on release, it clears `charging` and gives the lifetime back for the time held.
- While charging, the clone neither swings nor shoots. Stepping in settles it first.
- `combat-visuals.ts` draws a charging clone as a floor shadow with a tether, inside a dotted ring of `distance`.
- The spell text says "Hold the button to send it farther"; `maxRange` is 5.
- Tests: `tests/shadow-clone-417.test.ts`; `tests/late-spells-365.test.ts` no longer expects a tap to place it.

**BOUNDARY:** A cast from a path without a button (`castKey`) settles at once beside you. Stepping into the clone, its lifetime, cooldown, half-damage copies and target lock are unchanged.

## Release 415: Ilse, the Lamplighter — 2026-10-24

The daily narrative task, `docs/narrative-bible.md` section 7, step 6 (the first of Ilse, the Seven Bells and margins in crossings). Gilgamesh's recited voice (step 5) still waits for a public-domain source text.

**CODE:**
- `src/ilse.ts`: `ILSE{chance:.045,minDepth:3,finalAfter:3}` and `ILSE_MEETINGS` 1–5 (child, young, woman with the last lamp, old woman, a Far Sleep girl beside a lamp with no post), all original writing.
- `ilseMeetingAt(save,rx,ry,far)` rolls by seed and section. In the waking world it picks a seeded meeting among 1–4 not yet had; in the Far Sleep it offers 5 once three are had. After 5, nothing.
- `addIlse` places an object of kind "ilse" (action speak) on open ground in a wild overworld section. `game.ts` calls it after `addDigSpot`, with `farSleepSection`, and announces her when nothing louder is there.
- `game.interact` handles kind "ilse" with `meetIlse`, which records the meeting in `save.lore.ilse` (a sorted string of digits, normalised by `ilseMet`; `ensureLore` keeps it through `...l`) and writes a Journal entry once.
- `renderer.ts drawIlse` draws her at her age, with the lamp post lit, the lamp she holds, the dark lamp or the postless lamp.
- Registered in `scripts/build.mjs` and both `sw.js` lists.
- Tests: `tests/ilse-415.test.ts`.

**BOUNDARY:** No reward, no quest, no fight: she is met and remembered. Settlements, skirmish sections and sections within 3 of Ember Refuge never hold her. No generator version changes; she is an object added on load, like the dig spot, and is not saved in the map.

## Release 413: stone is a resource; pillars take a whole shovel — 2026-10-24

Tim, 2026-10-24: "it shouldn't refund your wood or your stone. Your stone should go down... it's a resource that you shouldn't get from digging... you can't just have unlimited digs in the dungeon... there's some consequence"; "to break those pillars, it should just take a full... shovel... we don't have to spend iron for that... [cinder iron is] basically fuel for the robot suit".

**CODE:**
- `digging.ts` sets `DIG.stone.wall` and `.spot` to 0. `dig` and `digSpot` add no stone, and their messages no longer mention it.
- `DIG.obstacleTakesShovel`: a standard-shovel dig whose `cut` is "obstacle" spends every dig the shovel has left.
- The iron shovel's table is unchanged: it is for hard walls, and for any dig when no standard shovel can be had.
- `tests/digging.test.ts` expects no stone back.
- Tests: `tests/iron-shovel-411.test.ts` (release 413 case).

**BOUNDARY:** Chipping and breaking rocks, supply caches and Observatories still give stone as before. Dig finds (marks, cinder iron, dust, spheres) are unchanged.

## Release 411: the iron shovel's points; forgiving dig aim — 2026-10-24

Tim, 2026-10-24 (with a Sleeper's Hall screenshot, Act answering "Nothing nearby responds" beside sleeper-stones): "these aren't really blocks, these are just impediments, so if you have cinder iron, you should just be able to cut through these... the iron shovel can dig through 2 of these... obstacles... 4 blocks [of] regular dungeon walls before it breaks... the hard dungeon walls that resist the shovel... just two of them".

**CODE:**
- `digging.ts`: `DIG.iron{uses:4, cost:{wall:1, obstacle:2, hard:2}}`. `isObstacle(t)` is a blocked tile whose kind is not a wall or rim, such as `sleeperStone` or `crystalSpire`. `planDig` returns `cut` ("wall" or "obstacle"), and `dig` spends the iron shovel by `DIG.iron.cost`, with `plan.hard` costing "hard".
- `game.ts` `digAhead`:
  - It tries the feet row first, then the body row (`round` and `floor` of `y+.4`), so a stone just above or below the feet is dug.
  - A resisting plan becomes an iron plan with `hard: true`.
  - With no standard shovel and no wood and stone for one, an iron shovel in hand digs plain walls.
- Tests: `tests/iron-shovel-411.test.ts`.

**BOUNDARY:** The standard shovel is unchanged: 2 digs, wood and stone. A stone is still given for every dug block, so lashing a standard shovel (1 stone) and digging (1 stone back) leaves the stone count where it was. Reach (3), temporary areas and the per-area cap are unchanged.

## Release 409: creatures visible on the Supernova's scar — 2026-10-24

Tim, 2026-10-24: "the white cracked area that overlays the world... also overlays enemies and the Void Walker himself, so I can't see him... after the supernova, it should change the floor and remove the blocks of the dungeon walls, but... all enemies should still be visible".

**CODE:** `renderer.ts` `discoveredInDungeon(g, point)` now also returns true for a world beast (`point.worldBeast`) and for a point on a `voidScar` tile (`scarredAt`). The scar overlay deliberately paints over undiscovered fog (release 257), but actors there were filtered out by discovery, so they vanished inside the white. Tests: `tests/void-scar-visible-409.test.ts`.

**BOUNDARY:** Discovery itself (the dungeon map, objects and tiles) is unchanged. Only creature drawing (sprites, telegraphs and windups) treats scarred ground and world beasts as seen.

## Release 407: the Void Walker, paced; the Supernova fog thins — 2026-10-24

Tim, 2026-10-24: "the Supernova... covers the entire world, so I can't see him... all the other creatures... become invisible... the Void Walker should attack less frequently... he covers up the entire screen with attacks... a little bit more pacing".

**CODE:**
- `world-beasts.ts` raises `voidWalker.attackGap` from .3 to 1.1.
- `monster-pack.ts` `ATTACK_MODULES` cooldowns go up for every Void Walker move: hand 3.8, claw 4.3, sword 4.8, slash 5, spikes 5.8, wraiths 8, rifts 13, constellation 15, horizons 13, supernova 30.
- `renderer.ts`: the close-in fog vignette reads only `seaHazards.fogLevel` (sea fog banks), not the Supernova's. Nova fog puffs draw at .1 alpha instead of .22.
- Tests: `tests/void-pacing-407.test.ts`.

**BOUNDARY:** The Supernova's damage, its charge and its water fog timing are unchanged. Sea fog banks still close in as before.

## Release 405: the Crystal's push, pull and grab show their reach — 2026-10-24

Tim, 2026-10-24: "the pull move and the grab move should have a wave... where you're gonna get... when you're in the grab range or in the push range... a wave of where it's coming".

**CODE:** `monster-render.ts` `drawPackTelegraphs`, for the `psychicCrystal`:
- A `ring` tele (psyPush; psyPull with `inhale`) and a reaching `tether` (psyGrab windup) fill the reach (`tele.radius`, or `CRYSTAL.grabRange`) in `DANGER.fill`.
- Three animated rings run outward for the push and inward for the pull and grab.
- The grab adds a dashed line to the Wayfarer with pulses running along it.
- Tests: `tests/crystal-waves-405.test.ts`.

**BOUNDARY:** Drawing only: reaches, timings and damage are unchanged.

## Release 403: bosses on the dungeon map — 2026-10-24

Tim, 2026-10-24: "the location of... the Psychic Crystal and the Void Walker... any bosses should be indicated on the map... I guess it's just for the dungeons... where they are... [bosses] are already shown on the overworld".

**CODE:** `main.ts` `drawDungeonMap`, for the current level only, draws every living enemy whose `monster-pack.ts` `staggerClass` is `boss` or `revenant` as a pink diamond at its live position, fog or not. That covers `boss`, world beasts, the Questing Beast, Far Array bosses, guardian roles and Gate Revenants. Tests: `tests/dungeon-boss-map-403.test.ts`.

**BOUNDARY:** Ordinary creatures, elites, reflections and worms are not marked. Levels viewed through the level picker show no live positions. The overworld Atlas is unchanged.

## Release 401: the Crystal fights in the open; daises on the dungeon map — 2026-10-24

Tim, 2026-10-24: "the [Psychic] Crystal still isn't working right... he just spends too much time in the squares where you can't be hurt... he dodges too much... he can have a smaller stagger cooldown... he just runs too much, and I never get to actually fight him"; "the teleportation daises in dungeons should show on the map once you find them".

**CODE:**
- `game.ts` `packWorld().move`: a dungeon `psychicCrystal` that is aggro and has line of sight to the Wayfarer moves with `moveAxis` (flying, so pits and water are fine, walls are not) instead of the roamer's phase branch. Patrol and out-of-sight hunting still phase within `roamerBounds`.
- `monster-pack.ts` `CRYSTAL`: `evadeCooldown` 5, `evadeCooldownEnraged` 3.5, `poiseHits` 10, `poiseGuard` 4. `crystalPoise` breaks a spent poise even mid-dodge.
- `main.ts` `drawDungeonMap` marks discovered `warpDais` objects as a violet ring with a bright core.
- Tests: `tests/crystal-401.test.ts`.

**BOUNDARY:** The wall budget and manifest rules remain for ground the Wayfarer cannot reach. Release 249/259 phasing (patrol between rooms, never beyond the dungeon's edge) is unchanged when it is not fighting a Wayfarer in sight.

## Release 399: kills pay the regional experience multiplier — 2026-10-24

Tim, 2026-10-24: "the further away we get from the Ember Refuge... the harder the monsters get. But we should also get more experience for fighting those harder monsters". He also asked to lower the Questing Beast's health by 25%. Its health is floored at `BEAST_BASELINE.questingDominance` (1.15×) of the toughest world beast, which existing tests enforce. Given that trade-off, Tim chose to leave its health as it is.

**CODE:** `world.ts` `regionalThreat` has long returned `xpMultiplier` (1 + .06 per ring), and `game.ts` stamps it on each foe as `e.xpMultiplier`, but `defeatEnemy` awarded a flat 10 (35 for a boss). The award now multiplies by `e.xpMultiplier` (at least 1), which also pays Aperture-encounter multipliers. Tests: `tests/regional-xp-399.test.ts`.

**BOUNDARY:** Marks, drops and creature stats are unchanged. The Questing Beast is unchanged.

## Release 397: one warning colour; the Giant's and Turtle's unseen hits — 2026-10-24

Tim, 2026-10-24: "we need to register the... wind ups... for the world bosses... the robot, I was getting hit by lightning that I didn't even see where it was coming from... similar to the turtle"; "the hits... on the floor... right now it's like pale red. It should be... pale hot pink... understated... translucent... the uniform color for damage all across the game".

**CODE:**
- `monster-pack.ts` `DANGER{fill, fillStrong, edge, hex}` is the one warning palette. It is imported by `monster-render.ts` (every `drawPackTelegraphs` shape, `drawWarningCircle`, the Morphling's warnings), `lightning-giant-render.ts` (sky marks, the bolt lanes, the arc reach) and `renderer.ts` (legacy enemy and elite windups).
- `giantArcs` telegraphs a `ring` of `GIANT.arcRange`; the live `giantArc` effect draws the reach.
- The slam's `giantBolt`s spawn with `arming: GIANT.boltWarn` (.45 s): `tickPackEffects` holds armed effects, and the renderer draws each bolt's lane while armed.
- The Turtle's `comet` effect draws its landing ring at `f.to`.
- `glyphs.ts` keeps 4 entries per gear layout.
- Tests: `tests/danger-telegraphs-397.test.ts`.

**BOUNDARY:** Live hazards (lava, gas, frost, ooze, the void art) keep their own looks; only the warnings of where a blow will land are pink. Damage, timings and AI are unchanged, except that the slam bolts leave .45 s later.

## Release 395: the town smith — 2026-10-24

Tim, 2026-10-24: "the smithy can do all those things that you just described": salvage, reforge, add a socket, masterwork, each opening as Listeners fall.

**CODE:**
- New module `src/smithy.ts`, registered in `scripts/build.mjs` and both `sw.js` lists.
  - `SMITHY` holds unlocks by `farArray.listeners` (salvage 1, reforge 1, socket 2, masterwork 3) and the costs.
  - `salvageItem(save, index)`: iron by tier and a seeded sphere chance; the item's glyphs return to the pouch.
  - `reforgeAffix(save, slot, index)`: a seeded re-roll of kind and value from `items.ts` `AFFIX_POOLS` and `rollAffixValue`, never duplicating a kind.
  - `addSocket`: sets `item.extraSockets = 1`.
  - `masterwork`: sets `item.masterwork = true`.
- `items.ts` adds `itemCap(item)` (the tier cap +1 for a masterwork), used by `normalizeItemUpgrade` and `upgradeCost`. `awakenCheck` still asks for the plain tier cap.
- `glyphs.ts` `socketCount` adds `extraSockets`.
- `game.ts` `raiseMouthTown` places a `townSmith` beside the Mouth; interacting returns `smithy: true`.
- `main.ts` `openSmithy` is the smith's screen. `renderer.ts` draws the forge, anvil and smith.
- Tests: `tests/smithy-395.test.ts`.

**BOUNDARY:** Item fields are additive and kept by `normalizeItemUpgrade`. Existing Listener towns gain their smith on the next visit, because `raiseMouthTown` runs on every load of a Mouth town. Loot tables are unchanged.

## Release 393: whole-build presets; the suit's violet cosmos — 2026-10-24

Tim, 2026-10-24: "all the spells that are equippable and the Transit Lattice... need presets in the Arcanum... for glyphs, and all the skills need presets"; "I'll take your recommendation on the presets"; "the suit should have the same... purple cosmic world as the lantern, rather than that... golden... emblem... all the gold [should] be that same color".

**CODE:**
- New module `src/build-presets.ts`, registered in `scripts/build.mjs` and both `sw.js` lists: `normalizeBuild`, `snapshotBuild`, `applyBuild` and `swapPreset`.
- `save.magicSkills.presets[i].build` (additive) holds `{ glyphs: spellGlyphs by host, alt: constellation.alt, lattice: { passives, echoes } }`.
- `spell-slots.ts` `ensureSlots` `pair()` keeps `build`.
- `swapPreset` snapshots the outgoing build into the outgoing preset and calls `togglePreset`. It then applies the incoming build: every spell/skill glyph returns to the pouch, the preset's glyphs are set from the pouch (missing ones are named), `constellation.alt` is replaced, and the Lattice lists are replaced and clamped by `ensureLattice`. A preset with no build adopts the current one.
- `game.ts` (Preset input) and `main.ts` (Arcanum preset buttons) call `swapPreset`.
- `renderer.ts` `drawPowerSuit`: the amber status lights become a violet cosmos orb (night glass, two-armed spiral, core); the back light is violet.
- Tests: `tests/build-presets-393.test.ts`.

**BOUNDARY:** Glyphs are never copied or lost: they move between pouch and sockets through `socketGlyph`. Gear glyph layouts keep their own release-295 save and apply. Echoes outside the Lattice are not part of a preset.

## Release 391: re-plating cost; the Morphling's cyborg head; an understated suit — 2026-10-24

Tim, 2026-10-24: "when the plating breaks... three cinder iron"; "remove his horns and... make his head... more mechanical, electromechanical, like cyborg... tubes... Ghost in the Shell... but not so overly futuristic... more so like Remnant: From the Ashes"; "[the suit] looks too much like a Gundam or Ultraman Tiga... more understated... more like a spacesuit... almost like a Black Panther suit, but still spacey, like Iron Man or War Machine... we don't want to depart from the overall gritty, down-to-earth feel".

**CODE:**
- `vehicle-gates.ts` sets `MECH_POWER.replate` to 3; the Supplies text reads it.
- `monster-render.ts` `drawMorphling` redraws the head: an iron cage over a flesh skull, with rust and rivets; a slatted grille with breath glow; ribbed `hose`s into the traps; skull cables; one big lens and a three-lens cluster. The horns are gone.
- `renderer.ts` `drawPowerSuit` is redrawn: a graphite suit, plates, a smoked visor band, a pack and hoses, an amber status light, scuffs, and small cold jets only while boosting.

**BOUNDARY:** Drawing only, except the re-plating cost. Rules for empowered mode and for the Morphling are unchanged.

## Release 389: the Morphling's ranged patterns and new art; the empowered suit — 2026-10-24

Tim, 2026-10-24: "it should be like a svelte Gundam... like Armored Core... almost like an Iron Man suit... silver... pretty much the same size as a character model"; "[the Listener] can also send out a bunch of beams... 4 beams, and then they'll rotate around him... several orbs... in a spiral pattern around him... come up with some convincing and unique ranged patterns"; "let's do 6 visual passes... it doesn't look very muscular... I like... the direction... like he has a chamber inside of him... increase the fidelity of his tentacles and arms".

**CODE:** `listener-morph.ts` `MORPH_FORM.moves` adds three moves.
- `beams`: four beams; telegraph, then live and turning at `turn` rad/s; `beamAngle` is shared with the renderer.
- `orbs`: `arms` arms of hostile shots wound out in a spiral, tagged `morphOrb`.
- `barbs`: `volleys` fans that home briefly through the existing `homingTurnRate`/`homingUntil`, tagged `morphBarb`.

`monster-render.ts`:
- `morphTendril` draws tapered, lit, ridged and suckered limbs on a quadratic spine.
- `morphTip` cycles six limb ends.
- `drawMorphling` is rewritten in six passes: a V torso with traps, deltoids, pectorals, abdomen and serratus; the chest chamber with teeth and rising motes; jointed arms running into tendrils; goat legs with hooves; the crown of back tentacles; the head, horns, eyes and tusks; spawn at its feet; the lunge mass and the sunk pool.
- `drawMorphEffects` draws the beams.

`combat-visuals.ts` colours orb and barb shots. `renderer.ts` `drawPowerSuit` draws the empowered robot in the Wayfarer's place, with front, back and side views, a walk, an attack arm and thrusters; the plain robot keeps `drawSubmersible`. Tests: `tests/listener-morph-385.test.ts` (ranged patterns).

**BOUNDARY:** Rules for the six earlier moves, and the mirror form, are unchanged. Drawing only for the suit: empowered rules are as in release 383.

## Release 387: your journey; digging scales with the Aperture — 2026-10-24

Tim approved the suggestions list on 2026-10-24 ("I like the expansions that you described... go ahead and... implement them"). This release takes the journey page, the dig scaling and the field guide's dead-code item.

**CODE:** `persistence.ts` `journeyStats(save)` returns [label, value] rows read only from existing save fields: `playSeconds`, `explored`, resolved or guardian-defeated `consequences.dungeons`, `worldBeasts[*].slain`, `farArray.listeners`, `hometowns.towns` and `digging.dug`. The Wayfarer tab shows them under "Your journey". `digging.ts` `DIG.tierScale{every:4,chance:.02,more:.5}`, `digStep(tier)`, `saveTier(save)`. `wallTreasure(seed, area, x, y, tier = 0)` raises the chance and scales marks and material counts (not spheres). `dig`, `wallGlints` and `digSpot` pass the save's tier. `combat.ts` `playerAttack` is removed, along with its `game.ts` import. Shadow Clone (Tim: "it should target... if you click on something... larger range... cast directly behind you... the normal distance is 5"): `late-spells.ts` `SHADOW_CLONE{distance:5,placeRange:5}`. `Game.cloneAimFrom(at)` aims the clone's shot copies and swings from its place at the locked target. In `main.ts`, a tap on a creature locks it before any clone placement is tried. Tests: `tests/journey-dig-387.test.ts`.

**BOUNDARY:** At tier 0 the odds and amounts are exactly release 225's. A wall that held something at a lower tier still holds it at a higher one, so the threshold only rises. Dug tunnels and saves are unchanged; no new save fields.

## Release 385: the Morphling (the Listener's walled form) — 2026-10-24

Tim, 2026-10-24: "like one of the Night Lords from Elden Ring... more like Shub-Niggurath... a thousand young... it just keeps making things... it won't have one particular form... a big imposing, strong, muscular type thing... its arms will shoot out like putty and turn into different forms... like Akira... shoots cables from itself in a bunch of different directions... its cables can ride back and forth... its hand... turns into a dragon mouth that clamps down... sink into the floor and then reappear... or come out through the walls... break off its tentacles to form worms... they try to come back to it... spins around with his arm tentacles spread out... bounce around the screen... dives forward at you... a writhing mass of tentacles". (Tim's spoken note named the Lovecraft deity in a mis-transcribed form; it is written here as Shub-Niggurath.)

**CODE:** New module `src/listener-morph.ts`, registered in `scripts/build.mjs` and both `sw.js` precache lists. `MORPH_FORM` holds all of its numbers. `isMorph(e)` is the walled phase. `tickMorphListener(e, w)` chooses a move every `every` s (never the same twice running): `cables`, `jaw`, `sink`, `worms`, `spin` or `lunge`. It returns true while it moves itself, so the pack AI is skipped. It grows by `scale` once (`e.morphScaled`). `tickWorm(c, w)` runs the worms: they spread, crawl back, nip within `nipRange`, and rejoin (heal `heal`) or dry up after `life`. `game.ts` `mirrorWorld` gains `hurtAs(source, amount, {jumpable})` and `spawnWorm`. The enemy loop ticks the Morphling after the mirror form, and worms next to reflections. `updateListener` no longer un-hides it while it is sunk (`e.morph.sunk`). `far-array.ts` `LISTENER_FORMS.walled.attacks` drops `ramCharge`, since the lunge replaces it. `monster-render.ts` `drawMorphling`, `morphLimb` and `drawMorphWorm` draw the body, its shifting arms and the worms. `drawMorphEffects` (called after the pack effects in `renderer.ts`) draws the cables and pulses, the jaw arm and head, the lunge warning band and the rising ring. Tests: `tests/listener-morph-385.test.ts`.

**BOUNDARY:** The mirror form (release 369), the summons and the hide-behind-callers rule are unchanged. The "both" form still turns walled at half health and then fights as the Morphling. State is runtime only (`e.morph`); worms give no rewards. Worms and the live cables are bounded (`worms.max`, `cables.count`).

## Release 383: smelting spheres; the empowered robot — 2026-10-24

Tim, 2026-10-24: "we can use cinder iron to build armor spheres... merge the iron into armor spheres or weapon spheres"; "you can just autocraft with cinder iron... stay in the robot suit until your cinder iron... runs out, or until you toggle... off... empowered mode... burns more cinder iron... damage boost and a defense boost... longer flight time".

**CODE:** `items.ts` `SMELT{cost:5}` and `smeltSphere(save, kind)`, two Forge buttons in `main.ts` `openForge`. `vehicle-gates.ts` `MECH_POWER{burn:1,every:20,damage:.25,guard:.15,boost:2,replate:1}`, `mechEmpowered`, `setEmpowered`. `fuelMax(mode, empowered)`. `ensureMech` keeps `empowered`/`burnIn` only while built, active and in robot mode. `mechAbsorb` adds the guard and re-plates from iron (`replated`) before folding away. `tickMech` burns iron each `every` s and returns `"spent"` when it runs out. `Game.toggleMech` (robot, active, not empowered, iron ≥ 1) empowers; the next press stows. `game.ts` wraps `armorGlyphBonus` so `attackDamage` and `spellDamage` gain `MECH_POWER.damage` while empowered. That covers melee, the crescent, magic weapon shots and spells; physical weapon shots read only `spellDamage` for magic types, so they gain nothing. The renderer draws a furnace glow and an ember line under the bars. Tests: `tests/empowered-robot-383.test.ts`.

**BOUNDARY:** The plain robot is unchanged and free to keep up, as since release 317 (no time limit). With iron, a broken plate no longer forces the 20 s rebuild. The drone has no empowered mode. Smelting does not change dig finds or any reward table.

## Release 381: the iron shovel digs three deep — 2026-10-24

Tim, 2026-10-24: "even with the iron shovel... you can still only dig three from your position."

**CODE:** `digging.ts` `DIG.iron` drops `reach`; `planDig` checks `DIG.reach` for both shovels, and the "too deep" refusal no longer carries `resists`. Only "rings hollow and sealed" falls back to the iron plan. `tests/iron-shovel-379.test.ts` asserts the iron plan stops at three.

**BOUNDARY:** Release 379's description of a 6-block iron reach is superseded. Everything else about the iron shovel is unchanged: its recipe, its 2 uses, opening sealed pockets, and the places it never digs.

## Release 379: the iron shovel; playtime — 2026-10-24

Tim, 2026-10-24: "I'm running into walls that resist the shovel... you should be able to make a shovel with cinder iron to break through the walls. It'll just cost one cinder iron and one wood"; "it should show how long you've been playing... playtime in hours".

**CODE:** `digging.ts` `DIG.iron` `{recipe:{cinderIron:1,wood:1},uses:2,reach:6}`. `planDig(map,px,py,facing,areaKey,{iron})` marks the two refusals the standard shovel gives (`too deep`, `rings hollow and sealed`) with `resists:true`. With `iron`, it allows `DIG.iron.reach` and skips the sealed check, and the plan carries `iron:true`. `ensureIronShovel` forges one when the recipe is carried. `dig` wears `save.digging.iron` for an iron plan; the field is additive, clamped in `ensureDigging` and removed at 0. `Game.digAhead` plans with the standard shovel first and falls back to the iron plan only when the rock resists. Supplies shows both shovels. Playtime: `save.playSeconds` (additive; `freshSave` 0, `migrateSave` clamps a number ≥ 0) grows by `dt` (at most 1 s a frame) in `Game.update` after the pause check. `persistence.ts` `journeyMetadata` carries `playSeconds`, and the journey card shows `N.N h played`. Tests: `tests/iron-shovel-379.test.ts`.

**BOUNDARY:** The iron shovel is the one deliberate exception to "a shovel makes shortcuts, never keys": it can open a sealed pocket, including the far side of a sealed gate, by digging around it. It still never digs the map edge, doors, gates, structures, lethal tiles, occupied tiles or temporary areas (hunts, portals, the Far Array and its hall, dives, crossings), and the per-area tunnel cap holds. Playtime starts at 0 for existing journeys; earlier time was never recorded.

## Release 377: no more stagger-locking bosses — 2026-10-24

Tim, 2026-10-24: "the bosses... need to have more poise... so that they can't just get stagger locked... being able to stagger [them] for a while... is fine... I just wiped out an entire Revenant dungeon... just by stagger locking them".

**The bug:** a Gate Revenant's poise counted stun only while hits came within 0.4 s of each other. A melee swing comes every 0.42 s, so its poise reset between swings, and every hit cancelled its attack: an endless lock. Other bosses, guardians and elites had no limit at all.

**CODE (`monster-pack.ts`):**
- `STAGGER_GOVERNOR = { limit: { revenant: .6, boss: .9, elite: 1.3 }, decay: .2, guard: 3 }`.
- `staggerClass(e)` sorts foes into Revenant; boss (any boss, guardian role, world beast, Questing Beast, Array boss); elite; or none.
- `staggerGovernor(e, dt)` runs after each frame's stun countdown:
  - time spent hit-stunned fills `staggerMeter`, which drains `decay` per second while the foe is free;
  - a full meter clears the stun and sets `staggerGuard` for `guard` seconds, during which blows still land but do not stun;
  - fields exist only while counting.
- It is called in the pack AI update, in `updateGatePredator` (in addition to the Revenant's own poise) and in `game.ts`'s legacy enemy update.

**Tests:**
- `tests/stagger-governor-377.test.ts`: under a swing every 0.42 s a Revenant is guarded within 6 s and stunned under 40% of the time; ordinary creatures are unaffected.

**Daises in every large crossing (same release).** Tim: "daises should appear in all the large dungeons. It shouldn't be rare. It's just an easy way to help me navigate these super large dungeons". A sample showed only 35 of 81 large crossings had them: a 50% roll that could also fail to find room, and none below tier 3.
- `game.ts` `generatePinnedDungeon` pins `history.warpVersion = 2` on fresh histories and passes `warpAlways`.
- `underlands.ts` then places the pair in every extended, non-plain crossing, at any tier. `placeWarpDaises(map, dist, always)` tries wider spacings before giving up.
- Histories pinned earlier keep the old chance.

**BOUNDARY:**
- Knockdowns (`BOSS_POISE` poise breaks), damage and ordinary creatures are unchanged.
- Nothing is saved except the additive `warpVersion` on new dungeon histories.

## Release 375: the Listener's Hall — 2026-10-23

Tim, 2026-10-23: "the listener should have his own specific arena, so that I have to... complete the tasks or trials. A teleportation dais... appears and you get into it and you go to the listener's arena... something unique... There should be no fog... we don't have to do it for this dungeon. [For] the next". Also: "go ahead and build the listener arena". The new Listener model waits for the notes Tim will send.

**CODE:**
- **New module `listener-arena.ts`** (added to `scripts/build.mjs` and both `sw.js` lists):
  - `LISTENER_ARENA` holds the layout numbers.
  - `daisDue(f)` is true when a Listener has fallen before, the Array is not quiet and the Gate is whole.
  - `isArenaRun(id)` matches `far-array:<seed>:arena<n>`.
  - `generateListenerArena` builds a 32×32 round hall of radius 13 over `starVoid`: a `templeMosaic` dais at the centre, a `geodeFloor` band, a `dreamMarble` rim, and eight `crystalSpire` relay pylons for cover, off the straight line from the entry. The Listener is the only spawn (`finalBoss`), with a Return Dais (`exit`) at the entry. There is no `dungeonContract`, so no fog; `arena: true` means no residents, layout variation or completion objectives.
- **`far-array.ts`:**
  - `beginListenerArena` starts the run. It is an Array run, so `runBossSpawn`, `tuneArrayBoss`, the mirror form, `listenerFelled`, coordinates and towns all apply unchanged. `RUN_NOUNS.arena` names it "The Listener's Hall".
  - `beginArrayRun` never holds the Listener while the dais is due.
- **`game.ts`:**
  - `generatePinnedDungeon` routes arena ids to the hall.
  - The `listenerDais` object rises beside the current Mouth while `daisDue`, and entering it loads the hall.
  - The 373 fix: `raiseMouthTown` now runs after old Mouths are placed, so their towns get the Listening Stone and the Delvers' Exchange.
- **`renderer.ts`:** draws the dais, a dark glass disc with a lit rim and a column of light.
- **Tests:** `tests/listener-arena-375.test.ts`.

**BOUNDARY:**
- The first Listener of a journey is met in a Mouth run as before (Tim's current one counts as done).
- No save changes: the run is the usual `farArray.activeRun`.

## Release 373: the Mouth becomes a town — 2026-10-23

Tim, 2026-10-23: after the Listener falls, a town should spring up around its dungeon, with a shrine of its own (not the ordinary shrine's symbol). When you leave and come back, the section is a town. The Mouth stays an open random dungeon, "a source of adventure and prosperity": people go in and come back with goods, gems, tools and rare items.

**CODE:**
- **`hometowns.ts` `grantTowns`:** a fallen Listener's town now rises on the Mouth's own section (`mouth: true`). A 371 town on a nearby section stays as one more town.
- **`game.ts`:**
  - The Mouth section's hamlet is applied even though the section is explored (it is the change Tim asked for), from the next load after the kill, which is leaving the run.
  - `raiseMouthTown()` adds "The Listening Stone" (`listeningStone`, inspect for its lore) and "The Delvers' Exchange" (a `shelterMerchant` with the usual rotating rare stock) beside the Mouth.
  - The Mouth and every old Mouth still open runs (release 361).
- **`renderer.ts`:** the Listening Stone is a dark standing stone with pulsing violet ear-like rings, unlike the shrine.
- **Tests:**
  - `tests/mouth-town-373.test.ts` (new);
  - `tests/hometowns-371.test.ts`: the first test now expects the town on the Mouth.

**BOUNDARY:**
- Only a section where a Listener fell changes.
- Home, farm and quarry rules are unchanged from 371.
- The Listener's arena and its new model are the next release.

## Release 371: Listener towns and a hometown — 2026-10-23

Tim, 2026-10-23: a new town springs up where you find the Listener. You can set it as your hometown, so travel goes there instead of Ember Refuge. Its quarry, farm and 20-section regrowth then belong to the hometown, and new towns appear around the world wherever Listeners fall.

**CODE:**
- **New module `hometowns.ts`** (added to `scripts/build.mjs` and both `sw.js` lists):
  - `save.hometowns = { towns: [{ rx, ry, name, listener }], home }` is additive; `ensureHometowns` runs in `freshSave` and `migrateSave`.
  - `grantTowns` raises one town per fallen Listener at the Mouth it fell at (`relayNetwork.pastMouths`, then `coordinate`). `townSite` picks the nearest unexplored, dry section within 4 rings that is not already a hamlet, so no explored section changes. Journeys that felled a Listener before get their town on load.
  - Other functions: `townAt`, `homeKey`, `homeCenter`, `homeName`, `homeCandidate`, `setHome` (needs the town's Wayglass lit).
- **`settlements.ts` `applyHamlet(..., force)`:** raises the town's hamlet on that section, clearing a patch at the centre if no flat one exists. `game.ts` passes it for town sections on first load (then the atlas pins `hamletVersion` as usual).
- **`refuge-lands.ts`:**
  - `refugeLands(seed, suitable, center)` places the farm and quarry around home. The Refuge keeps its exact old order.
  - `regrowSection` centres the regrowth ring on `where.center`.
  - `game.ts` `refugeLandsWhere` passes the home, and `returnHome` travels there.
- **The kill:** a Listener kill journals the town and names it in the defeat notice (`townNote`).
- **`main.ts` and `atlas-view.ts`:**
  - "Return to <home>";
  - a "Make <town> my home" button for the selected Wayglass (the Refuge too);
  - towns listed and drawn like hamlets.
- **Tests:** `tests/hometowns-371.test.ts`.

**BOUNDARY:**
- Ember Refuge stays home until the player chooses otherwise.
- The farmer stays in the Refuge.
- When home moves, the Refuge's farm trees and quarry rocks are no longer planted there; the new home's are.
- Death still wakes you at the active checkpoint.

## Release 369: the Listener's mirror form fights with reflections — 2026-10-23

Tim, 2026-10-23 ("Far away wanderer"): the mirror form should not use "copy magic". It should spawn many versions of itself (up to eight), each with different health. They are easier to kill than it, fade after a while, use the Wayfarer's sword, tools and spells, dodge and position, rush in a phalanx, or swell and cast. Like the Psychic Crystal, it holds the Wayfarer's shots in the air (up to ten) and throws them back in quick succession. The grotesque (walled) form waits for his verdict.

**CODE:**
- **`far-array.ts` `LISTENER_FORMS.open`:** loses `mirrorClones` and `mirrorSwap`.
- **New module `listener-mirror.ts`** (added to `scripts/build.mjs` and both `sw.js` lists):
  - `MIRROR_FORM` holds the balance.
  - `tickMirrorListener` handles spawning (every 1.5–2.5 s, up to 8; 5–13% of its health each; 14–22 s life; a short walk-out), the phalanx (from 4 reflections, every 14 s: a line between it and you, a hold, a rush), the swell (every 17 s: ×1.35 size, ×1.4 damage for 5 s, and a shockwave each) and the mirror (shots within 2.2 tiles are held, up to 10; after 1.2 s they are thrown back one every 0.12 s at 80% damage; it holds nothing new while throwing).
  - `tickReflection` handles fading, the walk-out, phalanx moves and the "archer" reflections' shots.
- **The Wayfarer's kit on a reflection:**
  - always a sword sweep and lance;
  - a tool shot (half of them) if the Wayfarer carries a tool;
  - a shockwave if a spell is slotted.
  Reflections use the pack's evasive brain to dodge.
- **`game.ts`:** `mirrorWorld(dt, now)` builds the hooks. The enemy loop calls in for the Listener (open phase only) and for reflections, which are `noRewards` `listener` combatants.
- **`combat-visuals.ts`:** draws the held shots and the mirror ring.
- **Tests:** `tests/listener-mirror-369.test.ts`.

**BOUNDARY:**
- The walled form, the "both" switch at half health, gate summons and hiding, and the Listener's own health and damage are unchanged.
- Reflections never heal it and give nothing.
- No save changes: the rhythm is runtime state.

## Release 367: the Gravity Well swallows shots — 2026-10-23

Tim, 2026-10-23: "Gravity well should pull... enemy shots as well... if they fly through... the well, then they should just get pulled to it like anywhere within the swirl... almost like a shield that just pulls in the shots that go in to it".

**CODE:**
- `late-spells.ts` `tickSpellFields`: each frame, a hostile shot inside the well's radius turns toward the eye at `GRAVITY_WELL.shotTurn` = 9 per second.
- The bend also ends its homing (`homingTurnRate`, `seekId`).
- A shot that reaches the eye (`GRAVITY_WELL.eye`) is swallowed.
- Shots outside the swirl and the Wayfarer's own shots are untouched.
- Tests: `tests/late-spells-365.test.ts` (one more test).

**BOUNDARY:** The pull on creatures, the damage pulses and the cooldown are unchanged.

## Release 365: three spells from Infinite III — 2026-10-23

Tim, 2026-10-23: "let's add 3 more spells... after infinite 3... one of them will be like a shadow clone... [the] two others... you can figure em out".

**Shadow Clone (Tim's design):**
- The first press deploys it 1.5 tiles away: behind you if you are moving, beside you if you are still.
- The next tap on the world sets it where you tap, at most 2 tiles from you.
- It keeps that offset as you move, through walls.
- It copies every swing (the same blow from where it stands) and every tool shot at half damage.
- A second press while it lasts (12 s) carries you to it, unless you cannot stand there. Then "BLOCKED" flashes over it.

**My two designs:**
- **Gravity Well:** a vortex that drags foes toward its eye while it pulses. Bosses and great beasts barely move, and nothing is pulled into a wall.
- **Stillpoint:** foes inside move at 40% speed, and hostile shots that enter it fall apart.

**CODE:**
- **`items.ts`:** `SPELLS` gains the three with `unlockTier: 13` and a `text`; `spellOpen(save, id)` checks the band.
- **`spell-slots.ts`:** `CASTABLES` gains them (◐ dusk, ⊛ rift, ⧗ ward). `availableCastables` and `slotted` use `spellOpen`.
- **New module `late-spells.ts`** (added to `scripts/build.mjs` and both `sw.js` lists): `SHADOW_CLONE`, `GRAVITY_WELL`, `STILLPOINT`, `cloneOffset`, `clampPlacement`, `clonePosition`, `tickSpellFields`.
- **`game.ts`:**
  - Shadow Clone: `castShadowClone`, `shadowCloneActive`, `placeShadowClone`, `cloneSwing`. `primaryAttack` and `fireSecondary` call in, and `movingNow` is recorded in the movement wrapper.
  - The clone is runtime only and ends on `loadArea`.
  - `tickSpellFields` runs before `updateEffects`.
- **`main.ts`:** the first world tap after casting places the clone. The Arcanum lists the new spells, locked until Infinite III, with their text.
- **`combat-visuals.ts`:** draws the spiral, the clock rings, the shadow, its swing arc and "BLOCKED".
- **Tests:** `tests/late-spells-365.test.ts`.

**BOUNDARY:**
- No save changes beyond the usual slot keys.
- Glyphs still socket in Gravity Well and Stillpoint like any spell. The clone's copies carry no glyphs.

## Release 363: the Transit Lattice — 2026-10-23

Tim, 2026-10-23: after Infinite III and a first Listener, a Transit Lattice holds extra passives beyond the usual rules:
- 2 constellation passives and 1 Echo at first;
- up to 3 more of each, bought with Transit Coordinates;
- coordinates come from each Gate completed: its components + 1 for the Listener.

The lore is his too: the Lattice bends reality between eventualities, drawing in the coordinates of other Transit Lattices (other histories where that passive exists) and merging them into yours.

**CODE:**
- **New module `transit-lattice.ts`** (added to `scripts/build.mjs` and both `sw.js` lists):
  - `TRANSIT_LATTICE = { openTier: 13, openListeners: 1, base: { passive: 2, echo: 1 }, extra: { passive: 3, echo: 3 }, costs: [4, 4, 5, 5, 6, 6] }`.
  - `save.lattice` (additive; `ensureLattice` in `freshSave` and `migrateSave`) holds `coordinates`, `paidFor`, `extra`, `passives` and `echoes`.
  - `grantCoordinates` pays every unpaid Listener kill `coordinatesFor(k) = piecesNeeded(k) + 1`. Kills from before this release are paid on load. `game.ts` pays at the kill and says so (`latticeNote`).
  - Other functions: `latticeOpen`/`latticeWhy`, `latticeSlots`, `nextSlotCost`, `unlockSlot`, `toggleLatticeSlot`.
- **`constellation.ts`:**
  - `nodeOn`/`altOn` also count forms held in the Lattice, so a passive can work in both its forms at once.
  - `passiveForm`, `PASSIVE_KEYS`, `toggleLatticePassive`. A slot takes the primary (`id`) or secondary (`id:alt`) form of a learned passive, never the form already chosen.
- **`echoes.ts`:**
  - `activeEchoes` adds Lattice Echoes to the notched ones; `hasEcho`, `echoEvent` and `tickEchoes` read it.
  - `toggleLatticeEcho` takes owned Echoes that are not already notched.
- **`main.ts`:** a "Transit Lattice" Arcanum tab shows the coordinates, the lore, the slots (Clear), the unlock buttons and the choices.
- **Tests:** `tests/transit-lattice-363.test.ts`.

**BOUNDARY:**
- A closed Lattice (below Infinite III) holds nothing, though its settings are kept.
- Notches, constellation costs and respec are unchanged. A shrine respec does not clear the Lattice; a form of a passive no longer learned stops working until it is learned again.

## Release 361: the Mouth stays open — 2026-10-23

Tim, 2026-10-23: "I like the mouth being open as a random dungeon... it just gives you another dungeon each time".

**CODE:**
- **`far-array.ts` `beginArrayRun(save, returnPoint, { noListener })`:** a run holds the Listener only when the Gate is whole, the Array is not `quiet`, and the run starts at the current Mouth.
- **`game.ts`:**
  - The Quiet Mouth and every old Mouth (`silentMouth`, now "A Quiet Mouth") open runs again, each a new dungeon.
  - Their final foe is always a guardian.
  - Pieces won while the Array is quiet still lock (up to the Gate's need), so a Gate made whole there is ready at the new Mouth.
- **Tests:** `tests/listener-moves-357.test.ts` now expects the quiet Mouth and an old Mouth to open runs without the Listener.

**BOUNDARY:** Release 357's five relays, its new coordinate, and its compass and relay-strength rules are unchanged.

## Release 359: secondary passives in the Arcanum — 2026-10-23

Tim, 2026-10-23: "develop an additional passive for each one that you can select... a button... it'll show the secondary passive... whenever you select this button, it'll just show whatever the opposite one is. Secondary or primary... available in infinite 3 and beyond".

**CODE (`constellation.ts`):**
- **The secondary forms:** `ALT_PASSIVES` holds a secondary form for each of the 15 modifiers and capstones, with its name, text, kind and numbers.
- **When it opens:** `ALT_UNLOCK_TIER` = 13 (Infinite III); `altUnlocked` checks it.
- **Switching:** `toggleAlt(save, id)` flips `save.constellation.alt[id]` (additive, normalised in `ensureConstellation`). A shrine respec clears it.
- **Which form works:** `nodeOn` is true when the primary works (learned, secondary not chosen); `altOn` is true when the secondary works. Every runtime hook reads them instead of `hasNode`, so only the chosen form works.
- **The secondaries:**
  - Form: Ember Ward (a foe that wounds you burns); Ember Mend (+50% duration, mends 15%); Kindling (the burst comes when Ember Form begins).
  - Motion: Second Wind (+3 health per dodge); Long Quickening (+50% duration; Aerial Step cannot be cast while chosen); Afterimage (a burst where each dodge starts).
  - Veil: Veil Pulse (each blow pulses 15% back at every foe within 2 tiles); Long Veil (+50% duration); Stillwater (20% less damage).
  - Force: Wellspring (Aperture skills recover 25% faster); Bulwark Channel (15% less damage); Harvest (+4 health per kill).
  - Rift: Rift Ward (0.6 s untouchable after a step); Quick Fold (one charge that recovers 30% faster); Rift Echo (a burst where you stood).

**CODE (elsewhere):**
- `game.ts` `activateApertureSkill` refuses Aerial Step when its secondary form is chosen.
- `main.ts` Arcanum:
  - a passive shows the form in use (⇄ marks a secondary);
  - its detail names the other form and has a "⇄ Use secondary / primary" button, disabled until Infinite III and until the node is learned.
- Tests: `tests/secondary-passives-359.test.ts`.

**BOUNDARY:**
- Costs, learning order, respec and the primaries are unchanged.
- Below Infinite III a stored choice is kept but has no effect.

## Release 357: the Listener moves on — 2026-10-23

Tim, 2026-10-23: "after you defeat [the Listener] the first time... His dungeon can stay there... but he won't be there... you have to... activate or deactivate... at least 5 more relays... for his quest to become available, and then you have to complete his quest... depending on how many relays you do in total will increase... his strength".

**CODE (`far-array.ts`):**
- **New state:** `save.farArray` gains `quiet`, `relaysAt` and `mouth` (additive, normalised in `ensureFarArray`).
- **`listenerFelled`:** sets `quiet` and records `relaysAt`, the relays answered at the time.
- **Returning:**
  - `relaysUntilReturn(save)` gives how many more relays are needed (`LISTENER_RETURN.returnRelays` = 5).
  - `relay-network.ts` `commitRelayNode` calls `listenerReturns`. Once enough relays have answered, it moves `relayNetwork.coordinate` to `listenerCoordinate(seed, mouth, previous)` (40 to 62 sections out, at least 20 from the old Mouth). It also records the old coordinate in `relayNetwork.pastMouths`, clears `quiet`, and journals "The Listener Moved".
- **Strength:** `tuneArrayBoss` and `scaleForGate` count relays up to `ARRAY_TUNING.relayCap` = 40 (was 7). Every relay answered, restored or severed, adds `hitsPerRelay` to the Listener's and the guardians' health.
- **Older journeys:** a journey that felled a Listener before this release goes quiet on load, counting from the relays it has now.

**CODE (elsewhere):**
- `game.ts`:
  - While quiet, the Mouth is "The Quiet Mouth" and admits no run (`quietMouthNote`).
  - Past Mouths get an inspect-only `silentMouth`.
- `world.ts` `wayfindingTargets` and the Journal objectives drop the Far Array while quiet.
- The Far Gate journal tab counts the relays still needed.
- Tests: `tests/listener-moves-357.test.ts`.

**BOUNDARY:**
- The Gate tier, its pieces, boons and the Listener's forms are unchanged. Pieces gained while it is quiet (a Revenant horde) still count.
- The first Listener is where it always was.

## Release 355: three map marks — 2026-10-23

Tim, 2026-10-23: "on the map, there should be three... points of interest markers that you can just set on some place on the map. The compass won't navigate to them... up to 3 places can be highlighted in some color... a couple different colors".

**CODE:**
- **`atlas-view.ts`:**
  - `MAP_MARKS = { max: 3, colors, names }` (Rose, Green, Violet).
  - `normalizeMapMarks`, `mapMarkAt`, `toggleMapMark(save, rx, ry)`. Marking a marked section clears it; a freed colour is reused.
- **Save:** `save.mapMarks` (additive) is `[]` in `freshSave` and normalised in `migrateSave` (`types.ts`).
- **`main.ts`:**
  - `mapMarkButton()` creates the "Mark selected section" button under the waypoint button, so both pages get it without HTML changes.
  - `drawAtlasPins` draws each mark as a small flag in its colour, at every zoom. Off screen, it is an edge arrow with the distance, like the waypoint. Marks are drawn whatever the layer switches say.
- **Tests:** `tests/map-marks-355.test.ts`.

**BOUNDARY:**
- Navigation (`wayfindingTargets`, the compass, `manualWaypoint`) never reads the marks.
- Any selected section can be marked, explored or not.

## Release 353: a world boss stays hurt until it kills you — 2026-10-23

Tim, 2026-10-23: "it'll hunt you through different tiles, and you can run away and it can chase you. So it's health, only resets when you die".

**CODE:**
- **The wounds live on the hunt:** `save.worldBeasts[id].active.wounds` is the share of health a hurt beast has left (0–1, exclusive). It is additive, normalised in `world-beasts.ts` `ensureWorldBeasts` and dropped when it is not a number in that range.
- **Writing it:** `game.ts` writes it every frame for a live, non-retreating world beast, in the patience loop.
- **Reading it back:** `Game.applyBeastWounds()` runs at the end of every `loadArea`, after the fresh-section scaling. It lowers the beast to that share, never heals it. Whichever way the beast is loaded again (left behind, followed, or with its section record gone), it is as hurt as it was.
- **Death heals it:** `resolveDeath` clears `wounds` for a beast present at your death, and now resets its health with tries off too. With tries off a death still costs no try, and the patience clock still carries on (release 345).
- **Tests:**
  - `tests/beast-wounds-353.test.ts` (new);
  - `tests/beast-tries-345.test.ts`: its death test now expects the reset.

**BOUNDARY:**
- A death away from the beast does not heal it.
- Slaying it or its escape ends the hunt, and with it the wounds.
- The Questing Beast is unchanged.
- No schema bump.

## Release 351: Sleeper's Hall, the Far Sleep's dream crossings — 2026-10-23

The daily narrative session (docs/narrative-bible.md section 7, step 4: "The Far Sleep made strange"). Release 305 turned the Far Sleep's landscapes into Dreamlands; this release does the same for its dungeons.

**CODE:**
- `underlands.ts` adds a `dream` environment, "Sleeper's Hall", with balance in `DREAM_HALL`:
  - sleep-meadow floors;
  - walls of `starVoid` (worn through to the night sky; impassable, never lethal);
  - sleeper-stones standing in the halls;
  - low `dreamMarble` terraces with `dreamStair` steps where the path climbs;
  - petal weather.
- It is never drawn from a theme pool. `game.ts` `generatePinnedDungeon` pins `history.dream = DREAM_HALL.version` on a fresh ordinary crossing whose section is in the Far Sleep (`landscape.ts` `farSleepSection`, depth over 35), and generates it with that environment. A Poison Crypt still takes precedence.
- The tiles reuse release 305's painters. Sleeper-stones are in the `DECOR` set a rescue route may clear, and the Proving Ground's environment list shows the hall automatically.
- Tests: `tests/dream-hall-351.test.ts`; `tests/underlands.test.ts` checks reachability for every environment, this one included.

**BOUNDARY:**
- Only crossings first generated from this release on are affected. Pinned histories, deeps and arenas keep what they were.
- The ladder, size, guardians, hordes and rewards are unchanged; only the look and the terrain change.

## Release 349: world bosses a little more often — 2026-10-23

Tim, 2026-10-23: "make... the world bosses just slightly more... frequent, so I can see a few more of them more frequently".

**CODE:** `world-beasts.ts` `ENCOUNTER`:
- `newSections` goes from 8 to 6 (the gap of new sections between meetings);
- `chanceScale` goes from .5 to .7 (multiplies every beast's per-section `chance`).
The encounter tests read the constants.

**BOUNDARY:**
- `BEAST_APERTURE` unlocks, placement rules, pursuit and cooldowns are unchanged.
- The Questing Beast keeps its own chance.

## Release 347: steadier tap targeting; retraining stats — 2026-10-23

Tim, 2026-10-23:
- "the tap to targeting system... works, but it's inconsistent... make that a little bit tighter... so that when we tap on a target it kills them";
- "we need to have ability to respec... at the Ember Refuge... pay marks... five hundred marks".

**CODE:**
- **`game.ts` targeting:**
  - `TARGET_LOCK.pick` goes from .75 to 1.05, and `enemyAt` uses the larger of bodyRadius + .6 and scale × .6.
  - `lockTarget` no longer toggles off when the locked creature is tapped again.
  - The melee lock reaches `range + max(meleeSlack, AUTO_AIM.meleeExtra)`, so it wins over auto aim.
  - Tool shots use `lockedDirection()` before `selectRangedAim`. Before this they ignored the lock.
  - `castSpell` aims at the locked target when it has no tap aim.
- **Retraining:**
  - `interactions.ts` `STAT_RESPEC = { marks: 500 }` and `retrainStats` reset every stat to 1 and return the spent points. `validActions` adds `retrain` to Oren Vale when he is not hostile. It is not added to `REFUGE_NPCS`, so the generated Refuge stays byte-identical.
  - `game.ts` syncs character stats on the `retrain` transition; `main.ts` labels it.
- **Tests:**
  - `tests/target-respec-347.test.ts` (new);
  - `tests/target-slots-309.test.ts`: re-tapping now keeps the lock.

**BOUNDARY:**
- The constellation respec at shrines is unchanged.
- Spending stat points, and how they are earned, is unchanged.
- No save fields.

## Release 345: no loss on death; world-boss tries switch — 2026-10-23

Tim, 2026-10-23:
- "When you die, you don't lose anything. You don't lose your resources";
- "an option... next to the parental controls, where we can set the death sequence for the world bosses... a number of deaths... the number should actually be 4... or you can turn that setting off... if you don't beat the boss... within 3 minutes. He'll just lose patience and then leave. But if you do more than 50% of the boss's health, he will extend that 3 minutes by another two minutes".

**CODE:**
- **`game.ts`:** both death paths (`resolveDeath`, `recoverFromDeath`) stop calling `loseWood`.
- **`persistence.ts`:** `beastTries` is a device setting, default true. `main.ts` adds an Accessibility toggle beside `familySafe`, and `applyPresentationSettings` copies it to `game.beastTries`.
- **`world-beasts.ts`:**
  - `BEAST_NO_TRIES = { extend: 120, below: .5 }`.
  - `worldBeastPatience(save, id, dt, e, triesOff)` adds `extend` once the beast is below half health, and only with tries off. The base `patience` is 180 s.
  - `worldBeastPlayerFell(..., triesOff)` takes no try with tries off and reports the patience left.
- **`resolveDeath` with tries off:** a world beast keeps its health and its patience clock; it is only calmed (aggro off).
- **Tests:**
  - `tests/beast-tries-345.test.ts` (new);
  - `tests/wood-boats.test.ts`: dying keeps wood.

**BOUNDARY:**
- The Questing Beast keeps its tries.
- With tries on, nothing changed.
- The setting is per device (settings), not per journey.

## Release 343: auto targeting reaches farther — 2026-10-23

Tim, 2026-10-23: "the range for auto targeting, where it just targets the next closest enemy, needs to be increased".

**CODE:** `game.ts` `AUTO_AIM = { meleeExtra: 3, rangedScale: 1.6 }`.
- With no locked target, the melee swing's `selectMeleeAim` searches `profile.range + meleeExtra`.
- The tool shot's `selectRangedAim` searches its travel range × `rangedScale`.
- Only the facing changes; reach, projectile life and the target lock (`TARGET_LOCK`) are unchanged. Spells do not auto-aim.
- Tests: `tests/auto-aim-343.test.ts`.

**BOUNDARY:** No save changes.

## Release 341: the potion tier toggle brews as you drink — 2026-10-23

Tim, 2026-10-23: "You should... be able to set which one you want to use... I don't think you necessarily need to continuous craft. You can just do like 1 2 or 3. Select the toggle, and then it'll just craft potions for you... when you... hit the button, potions will be available to you. Potions of whichever rank you want".

**CODE:**
- **`potions.ts`:**
  - `potionsReady(save)`: the chosen tier carried, plus floor(draughts / cost); for plain draughts, just the draughts.
  - `potionToDrink`: the chosen tier while one is carried or brewable.
- **`game.ts` `drinkPotion(now)`** is the Potion input. A chosen tier not carried is brewed (`craftPotion`) only when the Wayfarer is hurt, then drunk. The button's count and availability use `potionsReady`, falling back to draughts.
- **`main.ts` Supplies:** the per-row "Potion button" buttons become one toggle on the draught row (`.potion-tiers`, `styles.css`) with "N ready".
- **Tests:** `tests/potion-autobrew-341.test.ts`.

**BOUNDARY:** No new save fields; `save.potionChoice` is from 339.

## Release 339: potion tiers — 2026-10-23

Tim, 2026-10-23: "there's a potion, a high potion, and a Max potion... high potion... twice the amount... the Max potion will heal... your health to full. A high potion cost 3 potions, and the Max potion cost 5 potions"; "set the Max potion as your potion".

**CODE:**
- **`potions.ts`** (new module, in `scripts/build.mjs` and both precache lists):
  - `POTIONS` table: the Restorative Draught heals 30, `highPotion` heals 60 (cost 3) and `maxPotion` heals to full (cost 5).
  - `craftPotion` brews a tier from draughts.
  - `setPotionChoice` and `potionChoice` store the choice in `save.potionChoice` (additive; an unknown value falls back to the draught).
  - `potionToDrink` is the chosen tier while any are left, else the draught.
  - `potionHeal` gives the heal amount.
- **`game.ts`:**
  - `useConsumable` treats every `POTIONS` id as a heal and is never used at full health.
  - The Potion input drinks `potionToDrink`, and the button's count and availability follow it.
- **`main.ts`:**
  - Supplies lists the High and Max Potions, with Brew (disabled without enough draughts) and a "Potion button" choice on all three tiers.
  - `ITEM_ICONS` gains red, amber and gold bottles.
  - The HUD sets the potion button's `data-tier`; `styles.css` tints the bottle.
- **Tests:** `tests/potions-339.test.ts`.

**BOUNDARY:**
- Recovering at a checkpoint still tops up plain draughts to 2.
- Shops sell only plain draughts.
- Counts live in `save.consumables` (additive).

## Release 337: Echoes from every first kill — 2026-10-23

Tim, 2026-10-23: guardians were not leaving Echoes; a guaranteed first kill plus a higher chance after ("option 3"); "grant the Questing Beast echo". An Echo is owned once and never drops again, so a guaranteed first kill covers every later case.

**CODE:**
- **`echoes.ts`:**
  - `ECHO_DROPS.guardian` goes from 3 to 100. `echoDrop` already returns nothing for an owned Echo, a summon or a no-reward kill.
  - `grantSlainEchoes(save)` grants the Echo of a Questing Beast or world beast with `slain` ≥ 1 that the save lacks. `migrateSave` calls it, so it runs once per load and does nothing after.
- **Tests:**
  - `tests/echo-grant-337.test.ts` (new);
  - `tests/echoes.test.ts`: the old 3% statistics assertion now checks the guaranteed drop.

**BOUNDARY:**
- Non-pack guardians have no Echo entry and still leave none: the Hollow Marshal, the Threefold wing wardens and the Gate Revenant.
- Guardian kills before 337 are not recorded, so they grant nothing retroactively. The next kill of that kind does.
- No schema change; `echoes.owned` is the existing field.

## Release 335: glyph and buff wiring; the Arcanum follows the preset — 2026-10-23

Tim, 2026-10-23: "check the bindings between all the glyphs and all the armor... the presets... when you switch between preset 1 and preset 2, the arcanum... glyphs that appear don't reflect the... spells that are actively selected for that preset... make sure that the... passive buffs for like leeching and empowerment and cool down reduction work".

An audit measured every buff with it and without it in a running Game: armor glyphs, skill glyphs and infusion, weapon/tool/spell glyphs, resonances, pairings, constellation passives and creature Echoes. Everything not listed below already applied.

**CODE:**
- **Armor Volatile and Ignite.**
  - `game.ts` `characterStats` no longer multiplies `meleeBonus` and `magicBonus` by `armorGlyphBonus().attackDamage/spellDamage`. Those flat bonuses are also read by the beast and Gate Revenant scaling.
  - The melee `base`, the spell cast's `damage` and magic-type tool shots now take ×(1 + bonus).
- **Rift Step cooldown.** `constellation.ts` `riftCooldown()` adds the pairing `cooldown` and armor `spellCooldown`, both on the step and on the recharge.
- **Spell pulses keep their glyphs.**
  - `glyphs.ts`: `socketsFor` and `hostLoadout` take an optional spell id.
  - `game.ts`: `castSpell` stores `glyphSpell: spell.id` on the cast (the echo copy inherits it). Pulse damage and glyph hits read `glyphLoadout(fx.glyphHost, fx.glyphSpell)`.
- **The Arcanum (`main.ts`).** `presetCastables()` is A, B and a castable on the active preset's Build button.
  - The Spells panel shows its spell.
  - The Glyphs tab lists hosts only for its spells and skills, with no fallback to the stale `equippedSpell`.
- **Tests:** `tests/buff-wiring-335.test.ts`.

**BOUNDARY:**
- **Amplifier** (constellation) still boosts only secondary strikes (arcs, bursts, Echo creatures, Rift Wake), as its text says.
- **The Pallid Skitter Echo** refunds a flat 5 stamina.
- No save changes.

## Release 333: the larger Threefold Deep's gate — 2026-10-23

Tim, 2026-10-23, from a live r331 save in a `deep-v2:threefold` Deep: "It says the gate is open, but the gate isn't actually open. I've completed all the guardians".

**CODE:**
- **The bug.** In `deep-dungeons.ts` `threefold2`, the larger Threefold Deep that `threefoldLayout` 2 histories get, the processional was carved `hall(hub, …, 24, 2)`. The Choir is `rect(28, 4, 52, 20)`, which left row 21 solid between the gate (row 23) and the Choir. Every such Deep was unwinnable.
- **The fix.** The hall now runs to row 20. `hall` draws no random numbers, so every other tile of an existing Deep is generated as before.
- **Existing histories are fixed in place on purpose:** players stuck behind the gate are freed. The layout variation pass (`varyDungeonLayout`) reads the tiles, so it may now place the final boss elsewhere in the Choir.
- **Tests:** `tests/threefold-gate-333.test.ts` checks that the final boss is reachable from the rotunda once the gate opens, for threefold, loop and flooded. For loop and flooded it also checks that the gate holds before then.

**BOUNDARY:**
- **A known gap, not fixed.** About 1 in 12 of these larger Threefold Deeps have always had a way round the gate (a wing route wanders into the Choir). Closing it would add walls to existing journeys.
- Other archetypes are unchanged.

## Release 331: beasts catch up per Listener — 2026-10-23

Tim, 2026-10-23: "when you get to infinite 3, they'll stop scaling with you... until you've beaten 3 listeners... every time you beat the listener, the... world bosses will catch up to your strength... and they'll stay capped there until you beat the listener again... you can kind of have control over how strong the monsters get". Later gates may give bigger jumps; not built.

**CODE:**
- **`stages.ts`**:
  - **`stageOneBeastReference`:** from `freezeTier`, it holds the reference at `save.beastCeiling`. That measure now carries `kills`, the Listener count it was taken at.
  - **Retaking the measure:** at `thawKills` (3) kills or more, a measure whose `kills` is below the current count is retaken. That covers saves with pre-331 measures and kills made before 331.
  - **`beastCatchUp(save, ref)`:** retakes the measure from the live reference. The `game.ts` Listener kill calls it, with a journal line.
  - **`ensureBeastCeiling`:** normalises the optional `kills`.
- **`world-beasts.ts`:** `liveBeastReference` is the unheld reference, and `beastTuningReference` wraps it.
- **Who it applies to:** world beasts, the Questing Beast, the Mire Heart and the Gate Revenant predator all read the same held reference.
- **Tests:** `tests/beast-catch-up-331.test.ts`.

**BOUNDARY:**
- Below tier 13 nothing changed: beasts match the Wayfarer live.
- Before the third Listener nothing changed: the beasts stay held from tier 13.
- `kills` on the measure is additive; a missing field is fine.

## Release 329: the fallen pause — 2026-10-22

Tim, 2026-10-22: "for world bosses... If they kill you, there should be like a... 4 second... pause... where you see the boss just like moving around or milling around after you die. Just to give you like a second to like collect yourself. Before you have to run back into the fight."

**CODE:**
- **`game.ts`**:
  - `DEATH_PAUSE = { seconds: 4, millSpeed: 1.1, millRadius: 3 }`.
  - The death block in `update` is moved, unchanged, into `resolveDeath(now, input, fellIntoHazard, terrainHazard)`.
  - At `p.hp <= 0`, when `deathPause` is on (`main.ts` turns it on for the played game; headless simulations and older tests keep the immediate recovery), the death is not a hazard fall and a live world beast or Questing Beast is present, the game sets `this.fallen = { until }`. It also knocks the Wayfarer down (`stunnedUntil`), drops hostile shots and calms the beasts (`aggro = false`, `millHome`).
  - While `fallen`, `update` runs only `tickFallen`. That swallows input and makes each beast wander within `millRadius` of where it stood. When the time is up it calls `resolveDeath`.
- **Tests:** `tests/fallen-pause-329.test.ts`.

**BOUNDARY:**
- Tries, rewards and the beast reset are exactly as before, because they all run in `resolveDeath`.
- `fallen` is runtime-only, with no save change. Closing the game mid-pause leaves hp 0 in the save, and the next update recovers at the checkpoint.

## Release 327: louder sound — 2026-10-22

Tim, 2026-10-22: "The music and the game is too low... it needs to be louder... on my headphones, and it's just a little bit too understated".

**CODE:**
- **`main.ts` `AUDIO_MIX`:** master 0.45 (was 0.06), music 0.72, makeup 3, lowpass 2200 Hz (was 1150), and the compressor at threshold −30, knee 18, ratio 3 (it was the default, −24/30/12).
- **The chain:** `musicBus` → `filter` → `compressor` → `makeup` → `audioGain` → destination.
- **Where it is read:** startAmbience, the mute ramp and `applyPresentationSettings`.
- **Measured** with an OfflineAudioContext render of the score: −49.9 → −19.5 dBFS RMS, peak −41.2 → −11.4.

**BOUNDARY:** The score, the pulse and the sliders are unchanged. Every sound still goes through `musicBus`.

## Release 325: taste deeps open all the way — 2026-10-22

Tim, 2026-10-22: "the threefold deeps should just open all the way. Just one wing isn't really useful... have like... lower tier monsters... monsters that are scoped to the strength of the character at that point".

**CODE:**
- 319's `wings: 1` option is removed from `world.ts` `generateDeepDungeon` and from `generatePinnedDungeon`. No published release ever used it.
- `DUNGEON_LADDER.tasteThreat = { base: .55, perTier: .05 }`.
- `Game.tasteThreat()` returns min(1, base + perTier × `history.ladder.tier`) in a deep or arena whose ladder rung is "taste", and 1 everywhere else.
- `createEnemyFromSpawn` scales every dungeon creature's maxHp, hp and damage by it, after the dungeon tuning, and marks it `tasteScaled`. Restored creatures keep their saved, already-scaled stats.
- Test: `tests/dungeon-ladder-319.test.ts`.

**BOUNDARY:** Ordinary crossings, and deeps or arenas entered at or above their tier, are untouched. World beasts, ambient creatures and astral companions are never scaled.

## Release 323: no dungeon is sealed — 2026-10-22

Tim, 2026-10-22: "no dungeons should say sealed... No dungeon should be sealed, and you should just be able to access all the dungeons... Because sometimes people will probably never come back to them".

**CODE:** `game.ts` replaces 319's `entranceSealed` with `openEntrance(o)`. It runs before `enter` on deep-v1, deep-v2 and arena entrances, and never blocks.
- Its first call records `history.ladder = { version, tier, rung }`.
- `rung` is the ladder roll when it passes. Otherwise it is "full" at or above the kind's unlock tier and "taste" below it.
- A deep-v1 "taste" is still generated with `wings: 1`.
- `dungeon-ladder.ts` drops `unlockBandName`.
- `tests/dungeon-ladder-319.test.ts`: the entrance test now checks that every entrance opens.

**BOUNDARY:** Ordinary crossings are unchanged from 319. The ladder still decides their size, environments, crypts, guardians and hordes, and nothing there was ever sealed.

## Release 321: the drone — 2026-10-22

Tim, 2026-10-22:
- "whenever you have unlocked the... fourth or fifth gate, you can get a drone... it can attack for you... heal you on command... or... automatically";
- "if you hold jump, it'll... grab you and you can... fly around";
- "you can choose this version or the submersible version to deploy, and it can have like homing rockets".

**CODE:**
- **`vehicle-gates.ts`**:
  - **`DRONE`** (range 8, rocketEvery 1.6 s, rocketDamage 10 + magic bonus, rocketSpeed 7.5, rocketLife 1.8, rocketTurn 7, heal .3 of max health, healCooldown 30 s, autoHealBelow .3, carry 3 s, carryRecharge 1/s).
  - **`setMechMode(save, mode)`** is gated by `droneGate` for "drone".
  - **`fuelMax(mode)`**.
  - **`ensureMech`** keeps `mode`, `healCd` and `rocketCd` only once a mode has been chosen, so a 317 robot save gains nothing.
  - **`tickMech`** counts down the drone timers and refuels at the mode's rate.
- **`game.ts`**:
  - **`toggleMech`**: in drone mode it checks `droneGate`. A press while the drone is up, the Wayfarer is hurt and the heal is ready mends instead of docking (`droneHeal`).
  - **`mechUp()`** now excludes drone mode. **`droneUp()`** is the drone's test.
  - The held-Jump carry reuses the robot's boost path (`mechBoosting`, `mechSpent`).
  - **`tickDrone`**: eases `droneAt` beside or above the Wayfarer, heals by itself below `autoHealBelow`, and fires a `droneRocket` projectile with `seekId` at the nearest live creature, skipping ambient creatures and the Wayfarer's astral allies (the same rule as `enemyAt`).
  - **`updateProjectiles`** steers friendly `seekId` shots toward their target.
- **`renderer.ts`** `drawDrone`: body, eye, rotors, pod, claws while carrying and a green heal ring. It also draws the carry and heal bars. **`combat-visuals.ts`** colours rockets orange.
- **`main.ts`**: the Supplies row gains the "Ashore: Robot / Drone" switch, and the frame's description mentions the robot and the drone.
- Tests: `tests/drone-321.test.ts`.

**BOUNDARY:**
- The drone takes no damage and has no plating.
- It is not available aboard the skiff, where the frame stays the submersible.
- The robot is unchanged.

## Release 319: the dungeon ladder — 2026-10-22

Tim, 2026-10-22:
- "for the different aperture levels... include some of the more special, unique and larger dungeons... you should always have access to some of the... unique dungeons, but they should be fewer or... smaller versions... a taste";
- "a phased, gradual rollout... by... infinite tier 13, you should have basically everything";
- then: "no taste... at level 2... Level one is just the normal base game... your tier system is fine... There should be a large... dungeon that's available at level one".

**CODE:**
- **`dungeon-ladder.ts`** (new module, in `scripts/build.mjs` and both precache lists):
  - **`DUNGEON_LADDER`**: unlock tiers per kind (large, warp, newThemes, gatePredator, guardiansMid 3; guardiansAll, poisonCrypt, arena, threefold 6; deepV2, horde 9), `tasteFrom` 2, `tasteShare` .25, `ramp` .5→.8 at tier 12, `fullTier` 13, `largeQuiet` .25 and guardian pool sizes 5/10.
  - **`ladderRoll(seed, id, kind, tier)`** returns "full", "taste", "quiet" (large only, below `tasteFrom`) or null. A fixed hash is compared with a rate that only rises, so a kind never closes as the tier climbs.
  - **`crossingLadder`** returns `{ large, warp, newThemes }` for the generator.
  - **`ladderGuardian`** narrows `GUARDIAN_POOL` by tier.
  - **`entranceKind`** and **`unlockBandName`** serve the sealed entrances.
- **`game.ts`**:
  - **`generatePinnedDungeon`**: a fresh ordinary crossing records `history.ladder = { version, tier }`. That tier decides:
    - the Poison Crypt (a taste is `{ taste: true }`, generated compact);
    - `gatePredatorSpawnThreshold` (0 when locked);
    - the guardian (`ladderGuardian`);
    - the horde (`rollHorde`'s new `rung`);
    - the generator's `options.ladder`.
  - A deep-v1 history whose ladder rung is "taste" is generated with `wings: 1`.
  - **`entranceSealed(o)`** runs before `enter` on deep-v1, deep-v2 and arena entrances. Once a history has visits or a ladder it is always open. Otherwise the current tier is rolled; a pass records `history.ladder = { version, tier, rung }` and a fail returns the band message.
  - The boost now needs Jump released after it runs dry (`mechSpent`).
- **`underlands.ts`** `generateExpeditionDungeon`, only with `options.ladder`:
  - a natural extended crossing becomes standard unless `large` holds; "quiet" stays extended with no theme and no daises;
  - daises need `warp`;
  - a newer theme falls back to one of the original six unless `newThemes`.
- **`world.ts`** `generateDeepDungeon` `wings: 1`: one hashed wing keeps its warden, and `finalGate.requires` names only it. The wing notice and journal count the wings the map has.
- **`revenant-horde.ts`**: `rollHorde(..., rung)`. null means no horde, "taste" uses `HORDE.tasteTotal` [12, 18], and undefined keeps the old rule.
- Tests:
  - `tests/dungeon-ladder-319.test.ts`;
  - `tests/poison-crypt-303.test.ts` now pins its crypt histories to Infinite III.

**BOUNDARY:**
- History with no `ladder` (every dungeon pinned before 319, the canonical crossing, dive grottoes) generates exactly as before.
- At Infinite III a new crossing is identical to its pre-ladder self.
- Deep-v2 and arena tastes are rarer but full size.
- World beasts keep `BEAST_APERTURE`.
- Spells, the constellation and Echo drop rates are unchanged. Echoes follow the guardians that drop them.

## Release 317: the robot ashore — 2026-10-22

Tim, 2026-10-22:
- "take the submersible... on land... at infinite tier 3 and after you've unlocked the second gate";
- "walk around... boost over chasms... higher defenses";
- "hold jump and... boost... fly a little bit";
- "everything else about your character still works";
- "the same robot button" turns the boat into the submersible at sea and deploys the robot on land.

**CODE:**
- **`vehicle-gates.ts`**:
  - `MECH` (plate 60, guard .1, boost 1.6 s, boostRecharge 1/s, plateRegen 3/s, rebuild 20 s).
  - `ensureMech` normalises the additive `save.mech = { built, active, plate, fuel, cooldown }`. `migrateSave` calls it only when the field exists; `freshSave` leaves it absent.
  - `mechAbsorb(save, loss)`: guard first, then plating. At 0 plating the robot is stowed with the rebuild cooldown.
  - `tickMech`: counts the cooldown down, regrows plating while stowed and refuels on the ground.
- **`game.ts`**:
  - `useConsumable("submersible")` while not aboard calls `toggleMech`. It checks `mechGate`, spends one frame the first time, then toggles.
  - `mechUp()` is true only when the robot is active and the Wayfarer is not aboard.
  - In the input step, holding Jump while airborne in the robot burns fuel and extends `jumpUntil`. `mechBoosting` joins the `aerial` hazard skip, so the boost crosses pits, water and lava.
  - Damage settles after the hull guard through `mechAbsorb`.
- **`renderer.ts`**: draws `drawSubmersible` on land around the Wayfarer, with flames lit and lifted while boosting, plus silver plating and blue fuel bars underneath.
- Tests: `tests/robot-ashore-317.test.ts`.

**BOUNDARY:**
- Nothing about Rift Step, spells, skills, attacks or items changes in the robot.
- At sea the frame behaves exactly as in 311/315.
- `droneGate` (4 Listeners) is still unused: the drone is the next release.
- No generator changes.

## Release 315: vehicle progression; the submersible robot — 2026-10-22

Tim, 2026-10-22, with his answers: "Infinite 2" and "Infinite 3" are the bands named Infinite II and Infinite III (tiers 12 and 13); the skiff and the Tidemantle stay early. He also said:
- "you can't dive until you get to infinite 2... those quests don't become available until infinite 2";
- "you can't get the submersible until you're at infinite 2 and... until you've beaten either the void Walker or the listener";
- "you can't go underwater with a submersible until... infinite tier 3... you have to have beaten the void Walker and the listener at least once";
- "the submersible should kind of look like a robot... a big large viewpoint... very short legs... 2 robotic arms... boosters on the back... a little bit larger than the player".

**CODE:**
- **`vehicle-gates.ts`** (new module, in `scripts/build.mjs` and both precache lists):
  - `VEHICLE_GATES` (diveTier 12, subTier 12, underwaterTier 13, mechTier 13, mechListeners 2, droneListeners 4).
  - `diveGate`, `subGate`, `underwaterGate`, `mechGate` and `droneGate` each return `{ ok, why }`. They read `apertureTier`, `worldBeasts.voidWalker.slain` and `stages.ts` `listenerKills`.
  - `mechGate` and `droneGate` are for the next releases. Gates live outside `boats.ts`, because `landscape.ts` imports boats and a world import there would cycle.
- **`interactions.ts`**: the Shipwright's `buyRig` and a buoy's `dive` appear only from Infinite II (a submersible's dive appears once `underwaterGate` holds).
- **`game.ts`**:
  - `diveAction` checks `diveGate` for rig divers, `underwaterGate` for the submersible, and `underwaterGate` for the deep current.
  - `useConsumable("submersible")` checks `subGate`. `main.ts` disables Forge with the reason.
- **`renderer.ts`** `drawSubmersible` draws the robot:
  - back: boosters (flaming ashore), shell, viewport frame;
  - front: lower shell over the legs, the short legs, glass, two jointed arms with three-fingered manipulators, and at sea a soft water cover with a ripple ring below the waterline.
  - Diving, only an arm and bubbles show. `ITEM_ICONS.submersible` is the robot.

**BOUNDARY:**
- A save with a rig and Lens below Infinite II keeps both but cannot dive until it reaches the band. A submersible already fitted keeps its plating and dive-dodge.
- No save change.
- Tests: `tests/vehicle-gates-315.test.ts`. `tests/diving.test.ts`, `tests/boats.test.ts`, `tests/grottoes.test.ts` and `tests/submersible-311.test.ts` now set their divers at the required bands.

## Release 313: the skill buff bar — 2026-10-22

Tim, 2026-10-22: "a timer on the skills to show how long they last... the button can... get illuminated, like a yellow... that color can just drain out... left to right... until the buff is over... depending on how long it is supposed to last".

**CODE:**
- **`game.ts`**: `activateApertureSkill` also stores `magicSkills.active.duration` (the starting `remaining`).
- **`spell-slots.ts`**: `buffLeft(save, key)` gives how much is left, 0..1:
  - for the running timed skill, `remaining / duration` (older saves without `duration` fall back to the skill's base duration);
  - for Rift Step, `riftInfuse / RIFT_INFUSE_SECONDS` (equal to `glyphs.ts` `SKILL_INFUSE_AFTER_STEP`).
- **`main.ts`**: `setBuffFill` keeps a `.buff-fill` span and the `buffing` class on the A/B buttons, and on the Build button when it holds a castable.
- **`styles.css`**: a right-anchored gold fill whose width shrinks as the effect runs out, plus a gold glow.

**BOUNDARY:**
- Cooldowns and their countdown are unchanged.
- Spells are instant, so they show no bar.
- `duration` is an additive field inside the existing `magicSkills.active`.
- Tests: `tests/skill-buff-bar-313.test.ts`.

## Release 311: the submersible — 2026-10-22

Tim, 2026-10-22:
- "the cinder iron can build... a submersible... your boat will turn into a submersible... ride on top of the water or... go underwater... dip down underwater to... dodge damage... like a jet boost".
- "these buoys... red and white... marks for... underwater travel... connect to one buoy... and then go to another buoy... if you traverse the dungeon".
- "silver... a big viewpoint in the front, where you can see the Wayfarer... like Faye Valentine's zipcraft... 2 larger arms and 2 smaller arms... one arm poking above the water".
- "extra health to the boat... extra... damage reduction... 5%... an item like the hull repair... its own option to place in the... preset slot".

**CODE:**
- **`boats.ts`**:
  - `BOAT.sub` (cinderIron 3, hull 40, guard .05, dive 1.1 s). `forgeSubmersible` turns iron into `consumables.submersible`. `fitSubmersible` (aboard) sets `boat.sub` and fills `boat.subHull`; a second frame refills it.
  - `wearHull` eats `subHull` first. `hullAbsorb` counts it and keeps 5% off the Wayfarer's share.
  - Sinking (`hullAbsorb`, `hullStrike`) clears `sub`. A new skiff starts plain. The spare skiff carries its own `sub`/`subHull` through `takeSpare`.
  - All boat fields are additive and normalised in `ensureBoatState`.
- **`game.ts`**:
  - `useConsumable("submersible")` fits a frame.
  - A dodge aboard a submersible sets `subDiveUntil` and invulnerability for `BOAT.sub.dive`; sea hazards count it as dodging.
  - `diveAction` lets a submersible dive without `capabilities.dive`.
  - Grotto maps (`arenaKind: "dive"` with a lair) gain a `diveOnward` object at load, without regenerating the map. Following it calls `onwardBuoy()`, which searches rings outward (radius `DIVE_ONWARD.radius`, at most `tries` map previews) for the nearest other section where `diveSite` holds (sea biome, the same site hash). It reads the buoy from `walkerCrossingMap` and `diveSite`, falling back to deep water near the centre, and surfaces there through `leaveDungeon`.
- **`renderer.ts`**: `drawSubmersible` draws the back (silver hull, tail fin, thruster, window frame) and the front (lower hull over the legs, window glass and glint, two large and two small manipulator arms). Diving, it draws the dark shape, bubbles and one arm through the surface, with the Wayfarer faint. A silver plating bar extends the hull gauge to the left.
- **`main.ts`**: the Supplies row has Forge and Use, plus `ITEM_ICONS.submersible`. `spell-slots.ts` adds `submersible` to `BUTTON_ITEMS`.

**BOUNDARY:**
- The grotto generator is unchanged; the onward current is added at load only.
- The breath, rig and lens rules are unchanged for swimmers.
- Under water the submersible is not yet a vehicle in the grotto: the Wayfarer swims as before.
- No save schema change.
- Tests: `tests/submersible-311.test.ts`.

## Release 309: target lock; Build, item or spell in any slot — 2026-10-22

Tim, 2026-10-22:
- "we can click on a monster... that'll just be the targeting... whenever we shoot or attack our blasts and attacks and swings will go towards the... monster that we clicked... until we click on another monster... rift step will still go in the direction that you're pointing".
- "I want you to be able to put build in any one of those positions... items... spells... or build".

**CODE:**
- **`game.ts`**:
  - `TARGET_LOCK` (range 16, pick radius, melee slack).
  - `lockTarget(id)` toggles the lock. `lockedTarget()` drops a dead or distant target. `lockedDirection(within)` gives the aim at it. `enemyAt(x, y)` hit-tests a world tap.
  - Each update sets `save.lastAim` toward the locked target (so tools and spells aim at it) and clears `pendingAim`. The melee wrapper uses `lockedDirection(range + slack)` before `selectMeleeAim`. Rift Step keeps `lastMoveVector`.
  - `castSlot` dispatches Build (`pressBuild`) and the item (`useButtonItem`). The Build input dispatches `activeButton` modes build, item or cast (`castKey`). Holding a Build slot aboard still raises the hull shield.
- **`main.ts`**: the `worldtap` handler locks a tapped creature (except in Act or Build mode). The A/B HUD buttons draw ⚒ or the item's icon with its count. The Build button draws a cast symbol (`.cast-glyph`). The Arcanum slot rows have Build and Item buttons, and each castable has "Set on Build button".
- **`combat-visuals.ts`**: pulsing red brackets on the locked target.
- **`spell-slots.ts`**:
  - `SLOT_TOOLS` ("build", "item") are valid in A and B. `presets[i].button` may be "build", "item" or a learned castable key; an unlearned one leaves it unchanged.
  - `slotTool(save, slot)`. `activeButton` returns `{ mode: "cast", key }`.
  - `assignPresetItem` needs any Item slot (A, B or the button) in that preset.
  - All of this is additive at schema 14.

**BOUNDARY:**
- No save schema change.
- Pairings count only castables in A and B.
- The lock is not saved: it ends on reload or area change, when the target leaves the enemy list.
- Tests: `tests/target-slots-309.test.ts`.

## Release 307: boss balance; tiered boss poise — 2026-10-22

Tim, 2026-10-22:
- "everybody's health is too much... cut their health in half... decrease their overall damage output by ten percent".
- "the blob doesn't need to regenerate health... just when his little bloblings get to him".
- "you should get 4 tries to kill them".
- "all the bosses should be able to be staggered... a tiered stagger system... a few hits, and then a few more... at the third tier... a set amount of hits and a set... cool down between staggers... the turtle and the robot will have the largest poise... the astral worm... surprisingly low... the Void Walker... pretty sturdy".

**CODE:**
- **`world-beasts.ts`**:
  - `BEAST_BALANCE` ({ hp: .5, damage: .9 }) scales `beastProfileVitals`, and so every world beast, the Questing Beast (`tuneQuestingBeast`) and the Mire Heart.
  - `tuneWorldBeast` and `tuneQuestingBeast` scale the creature's own pack floor by the same factors, so a body sturdier than its profile is halved too.
  - Every `tries` is 4 (also `QUESTING_BEAST`, `ASTRAL_PROFILE`).
- **`monster-pack.ts`**:
  - `BLOB.growHeal` is 0; bloblet merges still heal (`blobletHeal`).
  - `BOSS_POISE` gives per-kind `hits` [first, second, every later break], `guard` (cooldown after rising) and `breakTime`. `bossPoiseOf(e)` applies to world beasts, the Questing Beast and the Mire Heart, but not the Psychic Crystal, which keeps `CRYSTAL.poiseHits`.
  - `bossPoise` counts landed blows as falling health (forgotten after `forget` s) and ignores them during `guard`, while untargetable and while retreating. A break ends the attack in hand, clears telegraph and velocity, releases a held Wayfarer, and holds the boss still for `breakTime`. `e.poiseBreak` runs 1→0 for the renderer.
- **`monster-render.ts`**: while `poiseBreak` > 0 the body sags and sways (`drawPackMonster`), with circling stars and a closing ring at its feet (`drawDazed`). There is one shared animation, not one per boss.

**BOUNDARY:**
- Ordinary monsters, dungeon guardians and the Gate Revenant are unchanged.
- The Mire Heart keeps `MIRE_CRYPT.heartHp` 0.5 of the (now halved) overland Blob.
- No save change.
- Tests: `tests/boss-poise-307.test.ts`. Older tests that pinned 3 tries, the old vitals and the Blob's growth healing now pin the new rules (`world-beasts`, `lightning-giant`, `beast-baseline-rematch`, `astral-natural-encounters`, `blob-growth-health`).

## Release 305: the Far Sleep made strange — 2026-10-22

This release is step 4 of `docs/narrative-bible.md` section 7 ("The Far Sleep made strange... Dreamlands landscapes... for the far regions... used only for sections not yet explored"). The daily narrative session began it, and Tim approved it on 2026-10-22: "you can continue working on the dream section".

**CODE:**
- **`landscape.ts`**:
  - `applyDream(map, seed, rx, ry, version)` runs after `applyLandscape` on sections past `FAR_SLEEP_DEPTH` (35, the same line as `lore.ts` `READING_BANDS.far`, where `readingAt` returns "dreamlands").
  - Value noise from the `DREAM` table places `starVoid` (blocked, not lethal), `sleeperStone` (blocked) and marble terraces (`dreamMarble`, elev 1–2) over `sleepMeadow`.
  - Protected tiles (plaza, exits, objects, spawns) become meadow at ground level. Structures, ruins, environments and bridges are untouched.
  - `ensureClimbable`, `wakeStranded` (a path search that turns dream blockers on the way back into meadow) and `ensureReturnable` keep everything reachable and trap-free. Tiles beside higher ground become `dreamStair` slopes.
  - In open sea only walkable island tiles become meadow or marble; water, docks and shallows are untouched.
  - The Atlas colour comes from `landscapeAtlasColor("dream")`. `dream` is not in `BIOMES`, which lists only noise-made biomes.
- **`game.ts`** (`loadArea`, `walkerCrossingMap`) and **`astral-world-retreat.ts`** apply it when `!seen || seen.dreamVersion`, the same rule as hamlets. The atlas pins `dreamVersion` for sections first seen now. The first dream section sets `narrative.facts["farSleep.entered"]` and shows one line.
- **`landscape-render.ts`**: painters for the five kinds (`starVoid` twinkles), the `dream` cliff face and the atlas colour. **`renderer.ts`**: `petals` weather.

**BOUNDARY:**
- `LANDSCAPE_VERSION` stays 3, and versions 1–3 are byte-identical: the dream is a separate pinned pass.
- Explored sections never change.
- No save schema change: `dreamVersion` is an additive atlas field.
- Dream dungeons, Ilse's last meeting and the Surveyor's statue are later steps.
- Tests: `tests/far-sleep-305.test.ts`.

## Release 303: the Poison Crypt — 2026-10-22

Tim, 2026-10-22: "a poison crypt... large sections of poison water and poison mire... poison jets... a smaller version of the blob... manifest from one of those poison pools... they all try and go back to the main blob... a larger... arena... a poison pool in the corner... he'll just be kind of stationary... until you find him... he'll grow... depending on the other blobs that get to him... once you get to the arena... other blobs will stop... the blob in this arena will have... half health"; "keep these special types rare".

**CODE:**
- **`underlands.ts`**:
  - `UNDER_THEMES.poisonCrypt` is never drawn from a pool. `MIRE_CRYPT` holds the data.
  - `rollMireCrypt` decides a history at 2% (`perThousand` 20), only in layout pool 5 and never for a plain crossing (`plainCrossing`).
  - The theme has a `toxicBog` floor, `cryptWall` walls and `toxicMire` patches.
  - `mireCrypt` makes the lair (mire within `lairRadius` of the guardian, with the critical path left dry) and up to five 3x3 seep pools (`map.seepPools`, spaced apart, far from the entry and the lair).
  - It adds three gas jets on the path (fire-type traps with `gas: true`) and turns the guardian spawn into `morphingBlob` with `mireHeart`. It records `map.mireLair`.
- **`game.ts`**:
  - `generatePinnedDungeon` pins `history.mire = { version, merged, found }` for fresh histories and passes `theme: "poisonCrypt"`.
  - `createEnemyFromSpawn`: the Heart takes `beastProfileVitals(morphingBlob)` × `heartHp` (0.5) × (1 + merged × `mergeHp`).
  - `tickMire`:
    - The Heart is held at the lair centre until found.
    - Every `seepEvery` seconds a pool spawns a seepling: a `bloblet` with `blobletOf` set to the Heart, `mireSeep`, kept aggroed so the existing `blobletHome` runs.
    - Seeplings grow to 2× health and size over `seepGrow` seconds. Touching one deals `contact` × growth and poisons.
    - Each merge (from `blobletHome`) raises `history.mire.merged` and the Heart's maximum health.
    - Gas jets poison.
    - Coming within the lair radius sets `found` and stops the pools.
  - `shouldSimulateEnemy` simulates seeplings anywhere in the dungeon.
- **`revenant-horde.ts`**: a Poison Crypt is never a horde. **`main.ts`**: gas jets draw green.

**BOUNDARY:**
- Only histories first generated from now on can be a Poison Crypt.
- The overland Morphing Blob is unchanged. The Heart is not a world beast (no pursuit, retreat or bounty). It is the gate warden, so defeating it completes the crossing as usual.
- No save schema change: `history.mire` is additive in `consequences.dungeons`.
- Tests: `tests/poison-crypt-303.test.ts`.

## Release 301: plain short dungeons; rarer themes; Watcher's daises — 2026-10-22

Tim, 2026-10-22:
- "it's now actually surprising to get a short dungeon... we should have some short dungeons... just short boxy dungeons... a few rooms... a corridor or two. And that's it".
- "the basic dungeon, like tiles and setup, should be the default. And then everything else should be... a little bit... more rare"; the newer ones "should be more rare. Since they're a little bit more well-designed".
- "for dungeons that are... the largest... a teleportation system... you can't teleport to one place until you found the other... a dias that you walk up to, that has that symbol on it".

**CODE:**
- **`underlands.ts`**:
  - Layout pool 5: `PLAIN` (25% of crossings) makes a small box (about 26x22) with the `rooms` grammar: 3–5 rectangular rooms joined by 1-wide corridors, sometimes with one loop. Such a map is never themed, has `map.plain`, and is annotated with size profile "small".
  - `THEME_POOLS[3]` themes 30% of crossings, listing the first six themes twice and the five newer ones once.
  - `WARP` sets the chance (50%) that an "extended" crossing in pool 5 gets `placeWarpDaises`: two `warpDais` objects about 30% and 85% of the way along the entry's distance field, at least 16 tiles apart and away from the guardian.
- **`game.ts`**:
  - `generatePinnedDungeon` pins `layoutPool = 5` and `themePool = THEME_POOL_VERSION` (3) for never-generated histories only.
  - `useWarpDais`: the first touch sets `worldFlags["warp-dais:<dungeon id>:<dais id>"]` (attuned). Once both are attuned, a touch moves the Wayfarer beside the other dais. `loadArea` restores the attuned state.
- **`renderer.ts`**: `drawWarpDais` draws a stepped stone disc with the Watcher's sigil, dim when dormant, lit and haloed when attuned.

**BOUNDARY:**
- Histories pinned to layout pools 1–4 and theme pools 1–2 generate exactly as before.
- No new hazards or monsters. Plain crossings keep the usual guardian, chest, trap and residents.
- The daises use only `worldFlags`, so there is no save schema change.
- Tests: `tests/plain-dungeons-301.test.ts`.

## Release 299: five new dungeon environments (theme pool 2) — 2026-10-22

Tim, 2026-10-22: "I like... that fungal grotto dungeon... interesting floor... mushrooms... we can design different dungeons to have different patterns like that. And different floors, it can be like alien... just to add some variation to the dungeon".

**CODE:**
- **`underlands.ts`**: `UNDER_THEMES` gains five environments:
  - `starHive`: alien moss, pools, crystal spires and level-1 hex platforms, with the same climbability pass as chasm and frozen.
  - `geode`: geode floor and walls, amethyst clusters.
  - `mosaic`: rosette mosaic, columns on a 4-tile grid, still pools.
  - `rootwood`: root floor and walls, knots along a value-noise ridge.
  - `brass`: grating over gears, steam pipes.
- `THEME_POOLS` lists which themes a pool draws and how often a crossing is themed: pool 1 is the old six at 45%, pool 2 is all eleven at 60%.
- The mosaic and brass floors set `detail` to the tile's quarter of a 2x2 motif, so four tiles draw one rosette or one gear.
- The new blockers join `DECOR`, so the rescue route can clear them.
- **`game.ts`**: `generatePinnedDungeon` pins `history.themePool = THEME_POOL_VERSION` (2) only for never-generated histories and passes it to the generator. Older histories keep pool 1.
- **`landscape-render.ts`**: painters for every new tile kind. `geodeCluster` and `templePool` are animated (glint, shimmer).
- **`renderer.ts`**: two new dungeon weathers, `glints` (Geode) and `steam` (Brass).

**BOUNDARY:**
- A dungeon generated before this release draws exactly as before: pool 1 keeps the old ids in their old order and the old 45% chance.
- No new hazards: the pools are walkable (Mosaic) or blocking decor (Star Hive), never lethal.
- Monsters, rewards, layouts and the save schema are unchanged (`themePool` is an additive history field).
- Tests: `tests/dungeon-themes-299.test.ts`; the existing Underlands test covers every layout with every theme.

## Release 297: glyphs for Aperture skills — 2026-10-22

Tim, 2026-10-22: "the glyphs... don't apply to... the constellations... I'm using the rift step or some other constellation... in my spell slot instead of a spell... The glyphs should modify the constellation... that you have active".

**CODE:**
- **`glyphs.ts`**: `SKILL_GLYPHS` gives each glyph one skill effect (and its `text.skill`). Swift, Heavy, Echo and Pierce shape the skill: cooldown ×, duration ×, Rift Step reach + and charges +. The other six are `infuse`.
- A skill's glyphs live in `save.spellGlyphs["skill:<id>"]` (`skillGlyphKey`), two sockets, through the existing spell-socket code. This is additive at schema 14.
- `skillGlyphMods(save, id)` returns the shaping. `skillInfusion(save)` returns the infusing glyphs of the active timed skill, or of Rift Step while `magicSkills.riftInfuse > 0`. `hostLoadout` adds them to the melee and tool hosts, so they hit, and resonate, as if socketed there.
- **`game.ts`**: `activateApertureSkill` multiplies duration and cooldown by the skill's mods. The update tick decays `riftInfuse`.
- **`constellation.ts`**: `riftStep`/`tickRiftCharges` add the glyph charges and reach and scale the cooldown. A step with infusing glyphs sets `riftInfuse = SKILL_INFUSE_AFTER_STEP` (4 s).
- **`main.ts`**: the Arcanum page shows a Skill card for each skill slotted in A or B, with its sockets and what each glyph does there.

**BOUNDARY:**
- Spells, weapons, tools and armour keep their glyph rules.
- A skill not slotted in A or B shows no card, but its glyphs stay socketed.
- No generator, save schema or balance table outside `SKILL_GLYPHS` changed.
- Tests: `tests/skill-glyphs-297.test.ts`.

## Release 295: armor glyphs; gear glyph layouts — 2026-10-22

Tim, 2026-10-22:
- "there should be a glyph setting for the armor... movement or traversal... attack speed... dodges cost less stamina... stamina increases more rapidly"; "it can also reduce cool down for spells... attack speed, movement, stamina reduction, defense and health... spell... duration".
- "we could just use the existing glyphs... they'll just have new attributes when slotted into the armor".
- "a preset... so that you can save the glyphs that you have on your current... equipment... when you get a new piece of gear, you can just apply the preset".
- "We don't need the hull [shield] button, because it will be under build".

**CODE:**
- **`glyphs.ts`**:
  - `socketCount` gives armor sockets by tier (`SOCKETS_BY_TIER`). `socketsFor`/`socketGlyph` accept the "armor" host.
  - `ARMOR_GLYPHS` gives each glyph one bonus (and its `text.armor`). `ARMOR_GLYPH_CAP` caps each kind. `armorGlyphBonus(save)` sums them.
  - `describeHost(save, "armor")` lists no Resonances: armor glyphs do not resonate.
- **Where the bonuses apply** (`game.ts`):
  - `characterStats`: maxHp ×(1+hp), damageReduction +defense, moveSpeed +move, meleeBonus ×(1+attackDamage), magicBonus ×(1+spellDamage).
  - Melee and tool readiness ×(1−attackSpeed).
  - Spell cooldown and Aperture skill cooldown ×(1−spellCooldown); skill duration ×(1+spellDuration).
  - Stamina regeneration ×(1+staminaRegen).
  - `dodgeCost(save)` = 15×(1−dodgeCost), passed to `combat.ts` `dodge(…, cost)` and to action readiness.
  - `main.ts` `syncArmorGlyphs` re-syncs max health and stamina when armor sockets change.
- **Gear layouts**:
  - `save.glyphLayouts` (additive; normalised in `ensureGlyphState`) for `LAYOUT_HOSTS` (melee, tool, armor).
  - `saveGlyphLayout` / `applyGlyphLayout`: applying returns the item's glyphs to the pouch first, then sets the saved ones it can, and names any missing.
  - Each host card in Glyphs has the buttons.
- **Presets**: `spell-slots.ts` drops `hullShield` from `BUTTON_ITEMS`.

**BOUNDARY:**
- Armor items already saved gain empty sockets through `normalizeSockets` (additive).
- `tests/glyphs.test.ts` now expects armor sockets.
- Tests: `tests/armor-glyphs-295.test.ts`.

## Release 293: child-safe Glimpses; item icons — 2026-10-22

Tim, 2026-10-22:
- "a child safety setting... when I'm playing with my son... it turns off the terrifying or horror glimpses... the creatures and monsters are fine, but the glimpses that show like people getting killed... I can just turn it back on".
- "the draught doesn't need a preset... convincing symbols for each one... relevant and easy to discern".

**CODE:**
- **Child-safe Glimpses**:
  - `glimpses.ts` marks release 203's Glimpses `mature`: The Fourth Floor, The Hunt, The Trench, The Drowning, The Wheat and The Burning Plain.
  - `glimpseAllowed(id, family)`; `pickGlimpse` / `glimpseFor` take `{ family }`.
  - `persistence.ts` adds the `familySafe` setting (default off, normalised).
  - `main.ts`: the Options → Accessibility toggle. Glimpse cues pass `{ family: settings.familySafe }`, and the Library and the previews list only allowed Glimpses. Saves are untouched.
- **Item icons** (`main.ts` `ITEM_ICONS`): solid filled SVGs, shown on the Build button in Item mode and beside the item titles in Supplies.
  - Ironbark Tonic: a bark shield with an iron rim.
  - Lumen Phial: a gold vial with rays.
  - Clearroot Ampoule: a green ampoule with pale roots.
  - Hull Shield: a teal shield over a skiff hull.
- `spell-slots.ts` drops the draught from `BUTTON_ITEMS`; a preset holding it normalises to no item.

**BOUNDARY:**
- Device setting only; saves are unchanged.
- Tests: `tests/family-safe-293.test.ts`. `tests/preset-button-291.test.ts` now uses the tonic.

## Release 291: preset item buttons; the back button; Crossing Sigils in Supplies — 2026-10-22

Tim, 2026-10-22:
- The back button: "if you don't have any menus open... hitting the back button on the phone... should open that pause menu and then if you hit back again... it should be an unpause".
- Presets: "in the presets... you should also be able to select whether... the build button is a build or an item... next to each item in the supplies menu... preset 1 or preset 2... if preset 1 is set to build, then only preset 2 will be selectable".
- Crossing Sigils: "I don't see crossing sigils in the supplies menu anymore".

**CODE:**
- **Back button** (`main.ts`):
  - `pausePanel` joins the dialogs whose `cancel` runs `backPressed()`, so back on the pause menu resumes. Before, the dialog's default close left the game paused under nothing.
  - Chrome ignores history entries pushed without a user gesture when back is pressed, so the first `pointerdown` or `keydown` arms a fresh `backGuard()`.
- **Presets** (`spell-slots.ts`):
  - Each `magicSkills.presets[i]` gains `button` ("build" | "item") and `item` (one of `BUTTON_ITEMS`). They are additive and normalised in `ensureSlots`.
  - Preset writes now merge (`{ ...preset, ...slots }`), so swapping presets or setting a slot keeps the button choice.
  - `presetButton`, `setPresetButton`, `assignPresetItem` (only on an Item preset; again removes it) and `activeButton`.
- **The button** (`game.ts`): in Item mode, Build uses the item (`useConsumable`) or says what is missing. Repair and build aim apply only in Build mode.
- **Menus** (`main.ts`):
  - The Arcanum presets have a "Preset N · Build button: Build | Item" row each.
  - Supplies items show Preset 1 / Preset 2 buttons, disabled while that preset is Build and gold when assigned.
  - A Crossing Sigil row is listed again.
  - The HUD button shows the item glyph (`ITEM_GLYPHS`) and `×count`, and is barred at zero.
- `tests/spell-slots` preset assertions compare the A/B spells only, since presets now carry the button too.

**BOUNDARY:**
- Additive save fields on presets.
- Tests: `tests/preset-button-291.test.ts`.

## Release 289: the Watcher's sigil in the world — 2026-10-22

Tim, 2026-10-22:
- The sigil: "we can mark this symbol as an enduring mark... placed in various ways throughout the corridor... in arenas... a large fixture on the floor... intricate ornate patterns around it like a mosaic"; "floor tiles arranged in this symbol... not even frequently"; "a series of raised platforms that are built into this symbol... pretty infrequent and rare... like an ancient ruin... a shrine".
- Pristine tombs: "pristine, where the glyph is just very bright... a little halo above it... super rare... could also be teleportation traps... in a dungeon... or in a shack... teleporting you somewhere in the map or... a new location".
- The meaning: "the top symbol is a closed eyelid... the eye... the watcher, the wanderer... still open, still aware... the slash across... coterminous with everything... the symbol below are the tools... for accessing it"; "the listener is there, listening, but the symbol that dominates the corridor is the watcher".

**CODE:**
- **`watcher.ts`** (new module, in `scripts/build.mjs` and both service-worker precache lists):
  - `WATCHER` holds the balance: shelter tomb 3%, crypt tomb 35%, shrine roll 25% (about 1 section in 25 has open flat ground, so roughly 1 in 100), dungeon inlay roll 20% (about 1 in 3 has room, so roughly 6%), and fold distance at least 10 tiles.
  - `SIGIL_CELLS` lays the sigil out in tiles from the eye: lid, ring, eye, pupil, orbit, tools. `lift` gives shrine heights: 1 for all parts and 2 for the pupil, so every step is one jump.
  - `sigilSpot` / `sigilFits` find a seeded spot. With a negative margin, only the sigil's own tiles must fit.
  - `inlaySigil` sets `tile.sigil`. For a shrine it also raises `elev` and sets `sigilShrine`; for a mosaic it adds `border` and `tessera` tiles.
  - `placeWatcherOverworld`: a shrine clears trees, rocks and wayfinding marks in its footprint and puts a tomb on the pupil. A shelter tomb sits on a `shackInterior` tile. Never in section 0,0.
  - `placeWatcherDungeon`: an inlay (always in arenas, with the mosaic), and a crypt tomb beside a sarcophagus.
  - `dungeonFoldTarget`: a seeded reachable floor tile far from the Wayfarer.
  - `map.watcherPlaced` keeps placement to once per loaded map.
- **Pinning** (`game.ts`):
  - Overworld sections first seen from now on carry atlas `watcherVersion`; `loadArea` places only when the section is unseen or carries it.
  - `pinDungeonLayout` sets history `watcherVersion` (0 for dungeons already entered). `generatePinnedDungeon` places only for new histories, never in displacement pockets, dive sites or multi-level maps.
- **The tomb** (`Game.touchWatcherTomb`, once per tomb, `worldFlags["watcher-tomb:<id>"]`):
  - Overworld: the shelter Folded Seam's `startDisplacement` (a pocket crossing, then a section 8–14 away).
  - Dungeon: a far tile of `playerFloor()`.
  - Each use writes a Journal line under "The Watcher". An opened tomb stays opened after reload.
- **Drawing** (`renderer.ts`):
  - `sigilInlay` draws pale violet inlaid stone, with the pupil brightest, the border gold and the tesserae as small tiles. It is lifted with the landscape on a shrine.
  - `drawWatcherTomb` draws a pale lid with the bright sigil (`watcherSigil`, glow), a pulsing halo above, and lifts onto the shrine's eye. Opened, the lid is pushed aside and the sigil is dark.
- **Crystal**: after a poise break it springs away with `CRYSTAL.evadeCooldown` (the 285 review's note).

**BOUNDARY:**
- Additive only: atlas `watcherVersion` and history `watcherVersion` (unversioned entries mean "explored before 289": nothing placed).
- `tile.sigil` and `sigilShrine` live on generated maps only.
- No change to places already explored.
- Tests: `tests/watcher-289.test.ts`.

## Release 287: blocks as stairs and barriers; a calm Crystal; dungeon caches; one gold for "selected"; four coffins — 2026-10-22

Tim, 2026-10-22:
- Blocks: "you can stack 2 blocks on top of each other... jump up to the 2nd block... you can only have 5, so the bottom block would disappear"; "your blocks that are stacked too high will impede [a flying monster's] motion... if they're doing a charge attack... they'll still break through".
- The Crystal: "doesn't have to aggro to you... if you touch him, or if you attack him".
- Dungeon caches: "the first level should just give 2 stone and 2 wood just flat... the second level... 2 stone and 2 wood... and then there should be a random chance to get 3 stone and 3 wood".
- Menus: "uniform... when you have something selected, it'll be golden"; Supplies "much smaller... symbols... a dot between each one"; the Build button when nothing can be built: "a circle with a / through it... red".
- Coffins: "a few different versions... weathered... broken... faded... more subtle, understated... an empty tomb".

**CODE:**
- **Builds** (`building.ts`):
  - At `BUILD.maxOut`, `placeBuild` breaks the oldest build (`builds[0]`) instead of refusing. A stack's lower block is older, so the stack drops a level and the upper block stays. Adding to a stack whose base is the oldest build is refused.
  - `tallBuildAt(map, width, x, y)`: the footprint touches a wood wall or a stone stack `BUILD_FLIER_STACK` (2) or more high.
  - `game.ts` `moveAxis`: a non-player mover passing lethal or perch terrain (fliers) may not enter such a tile. The dungeon Crystal's phasing move refuses a step into one.
  - Charges still break builds (`tickBuilds`).
  - Stairs need no new rule: a stack is `elev` + `buildLevel`, and `canStep` already allows one level up while jumping (`tests/blocks-287.test.ts` walks 0, 1, 2, 2, 3).
- **Crystal** (`monster-pack.ts`): a roaming dungeon Crystal engages only within `CRYSTAL.touchAggro` (1.1) or when its hp drops (`pack.calmHp`); hits also call `alertEnemy`. The old "seen again, it engages" assertion in `tests/crystal-259.test.ts` now expects it to keep wandering.
- **Dungeon caches**:
  - `digging.ts` `DIG.dungeonCache`.
  - `interactions.ts` `dungeonCacheMaterials` replaces `DIG.cache`'s stone and wood; the draught and the cache's own supply stay. The deeper roll is seeded by `${seed}:dungeon-cache:v1:${areaId}:${object id}`.
  - `applyInteraction(o, a, s, context, place)` takes `place.dungeonDepth` from `game.ts` (the index of `map.levelId` in `map.levels`; 0 for single-level dungeons).
- **Menus** (`main.ts`, `styles.css`):
  - Supplies leads with `.resource-line` (wood · stone · Cinder Iron) and `.resource-note` (shovel digs, weapon level). Then comes the build block: "Build with", its choices (the chosen one `aria-current`), Continuous build, the status line, and "Recipes".
  - One rule gives every selected tab or toggle the same gold: `button[aria-current]`, `button[aria-selected="true"]` and `.arc-kind.active`. Journal tabs now set `aria-current` on the open tab.
  - `.action-diamond button.build.spent::before` draws a red barred circle over the hammer, and the label is empty.
- **Coffins** (`landscape-render.ts`):
  - `sarcophagus` paints have ten cached looks (`detail % 10`, passed to `PAINT` as `variant`): 4 clean, 3 weathered, 2 cracked, 1 opened and empty.
  - The sigil is the exported `watcherSigil(c, cx, cy, R, s, alpha)`, at alpha .38 / .18 / .28 / .14.

**BOUNDARY:**
- No save schema change: `build.continuous` is from 283, and builds are transient.
- Generation is unchanged. The Watcher's sigil in arenas, shrines and floors is reserved as 289, versioned.
- Tests: `tests/blocks-287.test.ts`, `tests/crystal-287.test.ts`, `tests/dungeon-cache-287.test.ts`. `tests/building.test.ts` now expects the oldest-build rule.

## Release 285: the Psychic Crystal comes out to fight — 2026-10-22

Tim, 2026-10-22 (probe of a Crystal fight): "the crystal spends way too much time in the areas where I can't fight him... he retreats to the wall constantly... also retreats to the areas... I can't access, which is breaking the rules"; "a cooling down period... when you stagger him... like 10 seconds, where it can't be staggered again"; "reduce his dodging... so he should stay and fight for a little bit... increase the amount of hits it takes to stagger him"; "for every 5 seconds he can only spend 1 second in the tile".

**CODE:**
- **Wall budget** (`monster-pack.ts` `crystalManifest`):
  - Engaged, the Crystal carries `pack.wallBudget` (`CRYSTAL.wallBudget` 1 s). Every second off floor the Wayfarer can reach (`w.walkable`, the player floor: walls and the black alike) spends a second of it. It refills over `CRYSTAL.wallWindow` 5 s on reachable floor.
  - It sets out for the nearest reachable floor (blinking if held back) when the budget is spent, or after `wallLinger` (now 1.5 s, was 2.5) in one stay. Either way it ends any attack, evade or telegraph on leaving.
  - The check now runs before evading and attacking, so neither can keep it inside. Before, it ran after them, and an attack begun inside a wall kept it there.
- **Dodges**: `evade()` uses `CRYSTAL.evadeCooldown` 3 s (2.2 s enraged) for the Crystal, instead of the shared `QB_MOVES` 1.1 s (0.8 s).
- **Poise**: `poiseHits` is 14 (was 10). After rising from a break, `pack.poiseGuard` (`CRYSTAL.poiseGuard` 10 s) stops hits from counting toward the next break.

**BOUNDARY:**
- Pack state fields are transient combat state, not save schema.
- Other creatures are unchanged.
- Tests: `tests/crystal-285.test.ts`. `tests/crystal-259.test.ts` passes unchanged.

## Release 283: dungeon water is deadly; rot shows grey on the health bar; the crypt sigil; Supplies and Continuous build — 2026-10-22

Tim, 2026-10-22: "in dungeons, the traversal should be a little bit more consequential... if you go into water in the dungeons... you just start taking health damage... not your [max] health. Just your hp... a pretty rapid damage over time. And if you go into water when you have no stamina... while you're in a dungeon, you just die".

**CODE:**
- `water-traversal.ts`:
  - `DUNGEON_WATER = { hpPerSecond: .05, drownBelow: 1 }`.
  - `dungeonWaterToll(player, dt, maxHp)` returns `maxHp × hpPerSecond × dt`, or `Infinity` when stamina is below `drownBelow`.
- `game.ts` (swim upkeep): while swimming in a dungeon that is not a dive grotto (`!map.underwater`), the toll comes off `p.hp`. Infinity sets hp to 0, and the ordinary defeat path runs ("Out of stamina in the dark water: it drags you under.").
  - The usual Tidemantle stamina drain still runs while the Wayfarer lives, so a long swim ends in drowning once stamina runs out.
  - Bog and blight pools in dungeons also rot as before.
- Overworld water, open sea and dive grottoes are unchanged. Without the Tidemantle, dungeon water still drowns at once, as before.
- **Rot on the HUD.** Tim: "a portion of your health bar... just turns grey... like a necrosis".
  - `main.ts` `updateHud` sets `--rot` on `#healthBar` to rot ÷ max health. `styles.css` paints that share at the right end of the bar's track grey.
  - The bar's maximum stays the full max health.
- **Crypt coffins.** Tim: change the cross to "some type of cosmic or arcane" symbol. `landscape-render.ts` `PAINT.sarcophagus` now carves the Watcher's orrery in pale violet: an eye within a ring, a tilted orbit with its moon, a crescent above and, centred beneath, a three-star constellation crossed by a short stroke (longer toward the eye).
  - It is paint only and draws no extra random numbers, so the crack roll and the tile cache are unchanged.
- **Supplies and Continuous build.** Tim: "the resources... in one line... easy to identify"; "the shovel and skiff recipes should just go underneath... the recipe section"; "a checkbox... continuous build... when you're out of resources... an X".
  - `building.ts`:
    - `save.build.continuous` (additive boolean, normalised in `ensureBuild`) and `setContinuousBuild`.
    - `canAffordBuild` and `activeBuildKind(save)`: the chosen kind if it is affordable. Otherwise, with Continuous build, the next affordable kind in `BUILD_KINDS` order. Otherwise null.
    - `placeBuild` defaults to the active kind.
  - `main.ts`:
    - Pack → Supplies opens with `.resource-tiles` (wood, stone, Cinder Iron, shovel digs).
    - The Recipes block holds the material picker (the chosen one highlighted), the Continuous build checkbox, what Build raises now, and the recipe list.
    - The HUD Build button shows `WOOD` or `STONE` for the active kind, `REPAIR` when `game.mendTarget()` finds a damaged skiff, and otherwise `✕` with the `spent` class (a red cross in `styles.css`).

**BOUNDARY:**
- No save or generator changes.
- Tests: `tests/dungeon-water.test.ts`.

## Release 281: Dodge answers every touch; Leech heals visibly; the stray ">" — 2026-10-22

Tim, 2026-10-22 (two 300-second probes): "Dodge needs to be incredibly sensitive... I press Dodge a bunch of times... and nothing happens"; "dodge should be directly tied to stamina... if we don't have stamina, we should not be able to dodge"; "you don't have to change anything about the dodge. We just want the button to be more responsive"; "the leeching glyph isn't working, so I'm not getting health"; and a stray ">" floating near the action buttons.

**CODE:**
- **Dodge.** The dodge rule is unchanged: `combat.ts` `dodge()` still needs 15 stamina.
  - `input.ts` `press()`: the touched button gets the `pressed` class at once for 160 ms (a bright ring in `styles.css`), so every touch shows that it registered.
  - A tap on the cluster background goes to the nearest button within `GAP_REACH` 24 px (was 18), with Dodge favoured by 16 px (was 8).
  - `main.ts`: while the diagnostic probe runs, every Dodge press that reaches `game.update` is logged as a `dodge` event. It records `dodged` with the distance moved, or the reason it did not: `no stamina`, `held (struggle)`, `stunned` or `refused`. The next probe says what happens to each tap on Tim's device.
- **Leech.** `glyphs.ts` `glyphHit`: Leech heals its share of damage dealt (`GLYPHS.leech.hit`), but never less than `GLYPHS.leech.floor` of max health per landed hit (melee 2%, tool 1.2%, spell 0.8%). A hit that deals nothing heals nothing.
  - Before this, Leech worked but healed 1–4 HP a hit at 328 max health.
  - `glyphWorld` passes `maxHp`.
  - The other glyph and echo tests pass unchanged.
- **Stray ">".** In `index.html` and `proving-ground/index.html`, the Potion button's closing tag was complete (`</button>`), and the next line also began with `>`. That left a text node ">" in the action cluster. The tag now ends `</button`, like its siblings.

**BOUNDARY:**
- No save changes. Leech is stronger at high level (Blood Tide still doubles it).
- Tests: `tests/leech-floor.test.ts`.

## Release 279: the compass keeps its choice; the Proving Ground's test tile, environment list and Start test — 2026-10-22

Tim, 2026-10-22: "when you close the map... it changes whatever way marker you have... or whatever active quest you have... it doesn't maintain it"; "it doesn't let you select the arena... you have to type it in... there should just be a drop down for whichever... environment"; "one area of testing that's just a tile... a standard tile, but it has... water, a chasm, and some elevated blocks... as well as a building... and also a dungeon door... we can just keep this in place"; "there should be a start simulation button".

**CODE:**
- **Guidance.** `main.ts`:
  - `compassPick` and `compassPin` start from `save.guidance` and are written back by `rememberGuidance()` whenever the compass is tapped or a Journal quest is pinned or released. `save.guidance = { pick: "rx,ry" | null, pin: { rx, ry, name } | null }` is additive; `types.ts` `normalizeGuidance` validates it in `migrateSave` and drops a malformed one.
  - `objectiveList` keeps the untruncated `objectiveCache.all`, and `compassObjective` finds the pick there. So a pick farther than the 12 nearest is kept, and only a finished one falls back to the nearest.
  - `openMap` sets `mapView.chosen = false`. Tapping a section, stepping with the arrows or Center, or choosing a Wayglass sets it, and `#mapWaypoint` acts only when it is set.
  - Every overlay `close` stamps `overlayClosedAt`, and the compass ignores a click within 500 ms of it.
- **Proving Ground.** `proving-ground-labs.ts`:
  - `TEST_TILE` (the Timber shelter section 0,-1 of the default seed) and `stampTestTile(map)`:
    - a lakeWater pond at 15..19 × 3..6;
    - an alpineGrass plateau at 24..29 × 2..7, a ring at elevation 1 and a core at 2, with mountainTrail stairs at 24,4 and 25,4;
    - a canyon at 24..29 × 16..17;
    - the crossing `test-tile-crossing` at 27,24.
    The stamp sets `map.landscape` and `map.testTile`.
  - The `test-tile` laboratory.
  - `COMBAT_ENVIRONMENTS`: `test-tile`, `dungeon-<recipe>`, `arena-<family>`, `land-<biome>`. `combatFixture(…, environment)` builds the overworld ones with `overworldCombat`: creatures 4–9 tiles from the Wayfarer, aggro, and a Gate Revenant as a `gatePredator`. It builds arenas with `arenaCombat` and dungeons with `dungeonCombat` (the old path, now taking the recipe). `createLabFixture` takes `environment`, which defaults to the old hollow dungeon.
- **Panel.** `proving-ground.ts`:
  - an Environment select (combat lab only, defaulting to the test tile, mirrored to `?env=`);
  - Generate becomes **Start test**;
  - changing a select only readies the lab, and opening a lab readies it unless the URL names a scenario;
  - the frame loop re-stamps the test tile when the Wayfarer comes back out to it.

**BOUNDARY:**
- Saves stay at schema 14 (`guidance` is additive).
- The Proving Ground stays in scratch state and never touches production saves.
- `createLabFixture` without `environment` behaves as before, for recipes and tests.
- Tests: `tests/proving-test-tile.test.ts`.

## Release 277: supply caches give a stone, a wood and a draught; Broken Observatories hold a cache — 2026-10-22

Tim, 2026-10-22: "the supply cache will just give you one of each of those, a stone... a draught, and a wood, and then the observatory can give you a random of... three wood or three stone or... one stone and one draught, that's fine".

**CODE:**
- **Data.** `digging.ts` `DIG.cache = { stone: 1, wood: 1, restorativeDraught: 1 }` (275's 2 stone and 1 wood). `DIG.observatory = [{ wood: 3 }, { stone: 3 }, { stone: 1, restorativeDraught: 1 }]`.
- **Supply caches.** `interactions.ts` `grantSpoils(s, g)` adds stone (`addStone`), wood (`addWood`) and restorative draughts (`consumables`), within carry limits, and returns the "+n ..." text. `supplyCache` collection grants `DIG.cache` after its own supply. A `restorativeDraught` cache does not add a second draught. Weapon caches are unchanged.
- **Observatories.** Inspecting a `ruinMarker` (Broken Observatory) the first time, keyed by `observatory-spoils:<context>:<id>` in `worldFlags`, grants `DIG.observatory[hashSeed(seed:observatory:v1:context:id) % 3]`. It still gives its +2 Aperture and its signal lead. The spoils text is appended to the narrative or generic message.

**BOUNDARY:**
- Saves stay at schema 14 (one more `worldFlags` key per observatory).
- Observatories already inspected before 277 still give their cache once, because the spoils flag is new.
- Singing Arrays give nothing new.
- Tests: `tests/stages.test.ts` (supply cache and observatory cases).

## Release 275: creature stages; the Aperture holds at a stage's top tier; Stage 1 beasts held from tier 13 — 2026-10-21

Tim, 2026-10-21: "after you beat the listener you get access to stage 2, and you... go up to another 24... each time you beat the gate... unlock the different tier... maybe it'll be like two or three [required] for the next... stage"; "Yep, I like your plan for the listener kills and the aperture system"; "cap the strength of the stage one monsters... they'll be capped at... tier 13, until... you've beaten the listener maybe like 3 times and then... start increasing again to start matching your power level".

**CODE:**
- **New `src/stages.ts`.** `STAGES = { tiersPerStage: 12, firstKills: 1, killsPerStage: 2, freezeTier: 13, thawKills: 3 }`.
  - `listenerKills(save)` reads `save.farArray.listeners`.
  - `stageOf(save)` is 1 below `firstKills`, then `2 + floor((kills - 1) / 2)`: kills 1–2 give Stage 2, 3–4 Stage 3, and so on.
  - `tierCap(save) = stage * 12`. `apertureCeiling(save)` is one short of the next stage's first tier (`APERTURE_THRESHOLDS[tierCap]`).
  - `cappedAperture(save, value)` clamps to the ceiling but never below what the save holds.
- **Aperture gains.** `interactions.ts` `gainAperture` stores `cappedAperture(...)`. Every Aperture gain goes through it; the Proving Ground's fixtures set the value directly and are unaffected.
- **Stage 1 beasts.** `world-beasts.ts` `beastTuningReference` returns `stageOneBeastReference(save, ref)`. At `apertureTier >= freezeTier` with fewer than `thawKills` Listener kills, the first measure taken is stored in `save.beastCeiling = { level, perHit, maxHp, guard }`. Each field is then the lower of the live and the stored value. `beastProfileVitals` (world beasts, the Astral Worm and the Questing Beast) all read it.
- **Saves.** `save.beastCeiling` is additive (absent until frozen). `ensureBeastCeiling` in `migrateSave` keeps a valid one (numbers coerced) and drops a malformed one.
- **UI.** The HUD Aperture readout gains ` · S<stage>`. The Aperture card says "Stage n: the Aperture holds at tier N until the Listener falls (again) at the Far Gate" while held.
- **Build.** `stages` is in `scripts/build.mjs` and both `sw.js` precache lists.
- **Stone fix (Tim's probe, 2026-10-21).** `interactions.ts` `validActions` for a sealed rock is now `chip` (once), then `break`, `move` (Might 3+); `DIG.stone.break` is 0 (was 2; Tim: "every rock gives one stone"), so a rock gives its one chipped stone and breaking only clears it; Shale's lines say so. `DIG.cache = { stone: 2, wood: 1 }`: collecting a `supplyCache` adds them (Tim: "The supply caches give 2 stone and one wood"). Before, it was `move`, `break`, `chip`, so Act (which takes the first action) rolled a quarry rock aside for no stone and spent it. A rock that is not sealed (rubble, rolled aside) has no actions unless it is strange, so it no longer takes the press from the next rock. `tests/digging.test.ts` line 98 now expects `['break', 'move']`.

**BOUNDARY:**
- Saves stay at schema 14. A save past its stage's top tier keeps its Aperture (it only stops growing) and freezes its beasts at its first measure.
- The ceiling is taken at the first Stage 1 beast measured at tier 13 or above, not at the instant of reaching tier 13.
- Only world beasts (the Astral Worm among them), the Questing Beast and the Gate Revenant are held (Tim: "The damage freeze should only be on the world bosses and the revenant. All the other... creatures should keep getting stronger"). `monster-pack.ts` `tuneGatePredator` runs its reference through `stageOneBeastReference` (sharing `save.beastCeiling`), so every `gatePredator` (horde ones too) is held. The Deep's final-boss Revenants are not `gatePredator`s and keep scaling, as do ordinary creatures, guardians, elites and Far Array guardians.
- Stage 2 creatures do not exist yet; `BEAST_APERTURE` will take their tiers (13+).
- Tests: `tests/stages.test.ts`.

## Release 273: world beasts by Aperture tier; Crossing Sigils from a horde — 2026-10-21

Tim, 2026-10-21: "you won't see all of these world monsters... until... that'll be tied to your aperture... at aperture 3... aperture 4, you can see the blob... 5, you can see the robot... 6, you can see the astral worm... we'll just do a phase rollout... the void walker... at any level starting at aperture 3... and the crystal... at aperture 8, you can see the questing beast"; "Revenants can still give crossing sigils... in regular dungeons, but in the swarm dungeon... maybe... four crossing sigils throughout... break it into waves".

**CODE:**
- **The gate.** `world-beasts.ts` `BEAST_APERTURE = { mountainTurtle 3, voidWalker 3, psychicCrystal 3, morphingBlob 4, lightningGiant 5, astralWorm 6, nanobotKnight 7, tremorWorm 7, questingBeast 8 }`. `beastUnlocked(save, id)` compares `apertureTier(save.perception.aperture)` (world.ts; tier n is band n of `APERTURE_BANDS`, tier 3 = Resonant) with the table.
  - `worldBeastFor` and `worldBeastForDungeon` skip a locked beast when choosing a new meeting; `questingBeastFor` needs tier 8.
  - Only a new claim is gated: an `active` beast (held, retreating, tracked or in a dungeon) keeps appearing at any tier. The Astral Worm's Void Walker companion needs nothing more (tier 6 > 3).
- **Horde Sigils.** `revenant-horde.ts` `HORDE.sigils = 4`. `hordeKill` returns `sigils: 1` when a kill moves `floor(killed * sigils / total)` up a step (kills 8, 15, 23 and 30 of 30), and `defeatEnemy` adds them to `consumables.crossingSigil`. Horde Revenants still skip `sigilDrop`.

- **Creature stages (canon).** Tim, 2026-10-21: "all these creatures are aperture stage one... I'm gonna start making more creatures that have different powers... that you can see [at] aperture that are higher... make that canonical... in the field guide, that all the creatures that we've introduced so far [are] stage one, and after you beat the Listener you get access to stage 2". Every creature in the game as of release 273 is **Stage 1**: the eight world beasts and the Questing Beast (by Aperture tier as in `BEAST_APERTURE`), the Gate Revenant and its horde, every pack creature, dungeon guardian, elite, Far Array guardian and the Listener itself. New creatures from here on are Stage 2 or later and will be gated behind beating the Listener (the Far Array Gate) and higher Aperture tiers; the exact rule (how many Gates or tiers per stage) is still to be decided with Tim and is not in code yet.

**BOUNDARY:**
- No save changes. The tier choices for "the robot" (the Lightning Giant at 5) and for the unnamed tier-7 pair (the Nanobot Knight and the Tremor Worm) are provisional, pending Tim's word; the Mountain Turtle at 3 reads Tim's "eternal" as the Turtle.
- Tests: `tests/aperture-beasts.test.ts`. Existing world-beast tests (beast-ocean, beast-continuation, dungeon-roaming, encounter-pacing, void-walker-integration, world-beasts) now give their fixture saves a high Aperture, so they keep testing spawning itself.

## Release 271: Gate Revenants stalk, hunt through walls, dodge and break; the new Revenant — 2026-10-21

Tim, 2026-10-21: "When you get into a dungeon... it can be like two minutes, and then the gate revenants start hunting you... It should be stalking... after about two minutes... hunting regardless of whether or not you run into them"; "the gate revenant can borrow some of the crystal's behavior where it can hop between walls... it should still not go to a place that you can't go"; "smart Dodge behavior and... poise break behavior"; "a model rework on the gate revenant... increase its Fidelity, without increasing... processing requirements".

**CODE:**
- **Data.** `monster-pack.ts` `GATE_REVENANT` gains `huntAfter 120, stalkAggro 3.5, stalkKeep [5, 8], stalkSpeed .55, wallLinger 1.4, manifestSearch 7`, `dodge { chance .45, cooldown 2.2, time .22, speed 9, reach 2.4, shotReach 1.6 }` and `poiseBreak { hits 8, forget 3, time 2.4, away .38 }`.
- **Clock.** `Game.dungeonClock` counts seconds since the Wayfarer entered a dungeon from elsewhere (going down a level keeps it) and reaches `updateGatePredator` as `packWorld.dungeonClock`.
- **Stalk and hunt.** In a dungeon (`w.walkable` set) a Revenant that is not yet aggro hunts once `dungeonClock >= huntAfter`, when wounded, or within `stalkAggro`; otherwise `gateStalk` keeps it between `stalkKeep` tiles, phasing through walls. Outdoors it still wakes at 6 tiles.
- **Through walls.** In a dungeon `gateMove` moves it straight at the Wayfarer with `{ phase: true }`. The game reverts any step outside `roamerInBounds` (the Crystal's bounds), and `gateManifest` blinks one that has been inside rock for `wallLinger` s to the nearest floor in `playerFloor()` (searching `manifestSearch` tiles). `shouldSimulateEnemy` now always simulates a `gatePredator` in a dungeon, so one far off still stalks and hunts.
- **Dodge.** `gateDodge`: a melee swing within `reach`, or a Wayfarer shot within `shotReach`, gets a seeded `chance` roll per `cooldown`. On a dodge, `gateEvade` moves it sideways at `speed` for `time` s, untargetable, and its current attack is reset.
- **Poise.** `gatePoiseBreak` counts hp drops; `hits` inside `forget` s set `gateBroken = time`. While broken it doesn't move, attack or dodge. When it ends, it springs away (`gateEvade` for `away` s).
- **Horde.** `hordeSpawnPoints` takes the floor reachable from `map.entry` (`applyHorde` reads `playerFloor()` with the Wayfarer briefly set on the entry, since they are placed there only after `loadArea`), so horde Revenants start on reachable floor.
- **Held at the edge.** When the game reverts a Revenant's step that would leave the dungeon bounds, it sets `gateWalkFor = GATE_REVENANT.walkAround` (2.5 s); while that runs and it stands on reachable floor, `gateMove` uses the old walking chase (`gateChase`) around the rock instead of phasing (review note: no stall against thick rock).
- **Model.** `renderer.ts` `drawGateRevenant` replaces the shared `actor` sprite for `gateRevenant`: a tattered cloak (ragged swaying hem), an inner fold, pauldrons, talons, the Gate arch sigil, bone horns, the hood and slit eyes. It uses flat fills and batched paths, about a dozen fills and strokes, no gradients or blur. States: alpha .7 while stalking; red eyes on the hunt and pale eyes and a full sigil on windup; an ember afterimage during `gateEvade`; kneeling and squashed, with a flickering sigil, while `gateBroken`.
- **The maw.** Tim: "his chest... opens up to a large mouth that spews out lava, and [the] cape flies back to be like wings... his body is actually just a gaping maw". During a `barrage` `gateAttack`, `maw` (0..1) opens over the warning, holds through the active phase and closes over the recovery. It draws two ragged wings behind (one fill and stroke), narrows the cloak, and replaces the sigil with one open mouth: lips, throat, lava core, a row of small teeth along each jaw and four curved canines (the upper pair long, curving inward; the lower pair small and set apart, leaving the lava a clear way out) and rising embers (six fills, only during the barrage). `renderer.ts` now imports `GATE_REVENANT` for the timings.

**BOUNDARY:**
- No save changes: the clock and combat state are transient.
- The overworld Gate Revenant's pursuit is unchanged apart from dodge and poise. The numbers other than 2 minutes are provisional.
- Tests: `tests/gate-revenant-hunt.test.ts`. The model was checked in a Chromium render (six states). On-device performance is not established by tests.

## Release 269: the Gate Revenant horde, skiff repairs, the hull guard's longboat, cheaper building — 2026-10-21

Tim, 2026-10-21. On the horde: "There's a 1/2 a percent chance that you spawn a dungeon that's all gate revenants, and those gate revenants can leave the dungeon... chase you until you die... it'll keep track of them until they're all cleared out... If you kill 2... while they're chasing you, then... they'll be 18 in the dungeon next time"; "capped at for spawning... a different number per dungeon... like 36... 3 gate revenants at a time is probably even a challenge"; "If you complete a... revenant swarm dungeon, then you get a piece of the gate". On boats: "two woods should get the boat back up to full, and one would get the boat like half health... if you hold the build button while you're at sea, it will apply the hull shield"; "The hull should take reduced damage"; "a slight damage reduction to the player... five percent"; "it'll get like a shield bar... when that bar finally gets destroyed... you go back to the smaller wooden ship"; "a Viking longboat with a sail and a mast"; "the figurehead should be a lantern... a spiral in it... like a spiral galaxy... it can just sit there and hang there"; "in fog it should cast a... violet glow"; "show it in a profile in like an isometric view". On costs: "a wall takes 4 wood... five stone".

**CODE:**
- **The horde.** New `src/revenant-horde.ts`: `HORDE = { perThousand: 5, total: [28, 44], active: 3, respawn: 4, version: 1 }`.
  - `rollHorde(save, id, history)` decides on a dungeon's first visit only (`visits` 0; ordinary `dungeon:` ids, never deep ones) and stores `history.horde = { total, left }` in `save.consequences.dungeons[id]` (additive; `ensureHorde` normalises in place).
  - `Game.applyHorde` (end of `loadArea` in a dungeon) clears every other creature and the spawn list, and stands up to `active` Revenants at `hordeSpawnPoints` (open tiles far from the entrance, 4+ apart). `tickHorde` brings another after `respawn` seconds while fewer stand than `min(active, left)`.
  - Horde Revenants are ordinary `gatePredator`s with `hordeOf`, so they pursue outdoors and across sections as the Gate Revenant does. `leaveDungeon` now carries every aggroed pursuer out (at most `active`), not only the first.
  - `defeatEnemy` calls `hordeKill` for a `hordeOf` kill anywhere: `left` falls by one; the last one marks the dungeon resolved and adds a Far Gate piece (`ensureFarArray`; it never touches an active run). Horde Revenants drop no Crossing Sigils.
  - A death or a lost trail removes the live ones without counting; the next load stands them up again from `left`.
- **Costs.** `BUILD.kinds.wood.cost` 4 wood, `stone.cost` 5 stone.
- **Skiff repairs.** `boats.ts` `BOAT.mend = { wood: 1, share: .5, shieldHold: .6 }` and `mendSkiff`. `Game.mendTarget` is the skiff you're aboard or your moored `skiff-moored` within reach, while its hull is not whole; the `build` action patches it instead of building. Aboard with a whole hull, Build says to hold it. `renderer.ts` `repairTag` marks it.
- **The hull guard.** `BOAT.shield = { price 40, seconds 180, guard .05, hullTaken .5, bonus 30 }`.
  - `save.boat.guardHull` (additive) is the guard's bar. `wearHull` halves hull wear under the guard, takes it from `guardHull` first, and ends the guard when the bar is gone. `hullAbsorb` and `hullStrike` both go through it, and the Wayfarer keeps 5% less of their share.
  - Holding `build` for `shieldHold` s aboard calls `deployHullShield`.
  - `renderer.ts` `drawLongboat` draws the longboat three-quarters on, in two parts: the back (deck, far shields, posts, the lantern, mast and sail) before the Wayfarer, the front (near hull, strakes, shields, waterline and foam) after, so the Wayfarer sits inside. It keeps its last side-on bearing (`g.longboatSide`).
  - The guard bar is a fuchsia extension of the hull gauge. In sea fog or Supernova fog the lantern lights the mist violet (an additive radial glow plus a tint, stronger with fog depth).

**BOUNDARY:**
- Saves stay at schema 14. Dungeons entered before 269 never become hordes.
- The boat's hurt box is unchanged: hits reach the Wayfarer, and the hull takes its share through them. The sail, mast and lantern are only drawn.
- The horde's numbers (28 to 44, 3 at once, 4 s) are Tim's ("like 36", "3 at a time"), except the respawn delay, which is provisional.
- Tests:
  - `tests/revenant-horde.test.ts`;
  - `tests/wood-boats.test.ts` (repairs, the guard);
  - `tests/building.test.ts` (costs).
