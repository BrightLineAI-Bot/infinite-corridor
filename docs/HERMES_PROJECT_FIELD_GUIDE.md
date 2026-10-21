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

`playerAttack` in `combat.ts:7` is the older helper. It is imported at `game.ts:28` and never called. Its cooldown was 420 ms and its damage formula was `7 + Might * 2 + weaponLevel * 3`, which is not the live formula. It is dead code and should not be treated as documentation of current behaviour. Removing it is a candidate cleanup, not a fix, and must not be done silently because the import line is shared with live imports.

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

1. `combat.ts:7 playerAttack` is dead: defined, imported at `game.ts:28`, zero call sites.
2. The narrative record `relay-restored` targets a kind the narrative gate returns null for, so it cannot fire through its own path.
3. The guidance branch at `main.ts:451` never selects `beacon` or `story` cues.

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
