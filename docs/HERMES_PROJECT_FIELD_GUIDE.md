# Infinite Corridor Field Guide

## Developer Proving Ground

Use `?dev=proving-ground` for targeted production-system validation without contaminating a journey. The initial Shelter Gallery exposes timber, masonry, ruined gatehouse, cyber relay, alien geometric, and biomechanical fixtures selected from stable seed/section coordinates. It uses the production generator, Game simulation, input, collision, renderer, and shelter cutaway logic, but never imports persistence or normal startup. Reset always creates a fresh in-memory save. This is a developer route, not a player menu option.

Current scope is intentionally narrow: Shelter Gallery is implemented. Dedicated dungeon, combat, waypoint, encounter, performance, and save laboratories are still proposed future slices and must not be reported as implemented.

Developer reference for inspecting, modifying, testing, and extending the Infinite Corridor
project. This is the working model that future changes should be checked against.

## 0. Provenance and status of this document

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
| Ordinary dungeon | 24 by 24 | `world.ts:185` |
| Varied dungeon | 28 by 28 | `arenas.ts:44` |
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

`createJourney` refuses an occupied slot unless `replace` is set, and snapshots the previous save before replacing (`persistence.ts:35`). `renameJourney` refuses damaged saves and truncates names to 40 characters (`persistence.ts:36`). Duplicate, export, import, recover, and delete are driven from `main.ts:902-910`, with delete requiring two confirmations and leaving a recovery snapshot. Import into an occupied slot keeps the healthy previous save as a recovery snapshot (`main.ts:910`).

### 6.4 Schema versioning rule

Schema versions should be incremented when **durable state changes**. A version bump is only acceptable when it ships with all of the following, and any bump missing one of them is a defect rather than a release step:

1. An explicit migration path from every previously supported version.
2. Tests covering each supported source version.
3. Exact-resume tests: load a save, resume, and assert the world and progress are identical rather than merely loadable.
4. Contract-document updates, including `.change-control/project.json` interface versions.

Do not bump a version for refactors, renames, or internal shape changes that are invisible in persisted bytes. Conversely, do not ship a durable-state change without a bump, since the current constant is the only gate that decides which migration path a stored save takes.

### 6.5 Known contract drift

`.change-control/project.json` declares component `main` with interface `local-save-schema` at version `10.0.0`. The code constant is `SAVE_VERSION = 12` (`types.ts:5`). That is a declared-versus-actual drift of two major versions.

**Recommended reconciliation: record `local-save-schema` as `12.0.0`.** The historical correspondence is the supporting argument: interface version `10.0.0` matched `SAVE_VERSION 10`, so the interface tracks the save version directly rather than using an independent numbering scheme, and each subsequent save version should have carried a matching interface version. Treating the interface as an independent major/minor convention would require evidence of a separate scheme, and none was found.

`.change-control/project.json` is **not** edited as part of this field-guide operation. This is recorded here as a recommendation and must be executed as its own reviewed architecture and contract change with its own checkpoint.

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
| `npm.cmd test` | Last recorded run: 274 tests, 274 passed, 0 failed, 0 skipped, 118.7 s |
| `npm.cmd run build` | Release 88 build command; record the exact result of each release run in the work log. |
| Lint, format, typecheck | None configured. A typecheck with unused-import detection would have flagged the dead `playerAttack` import |

Named checks relevant to this guide: `tests/prototype.test.ts:2464` (elite scale ceiling) and `:2981` (dungeon combat profiles wake on all damage paths and strengthen final revenants, asserting the revenant reaches at least 532 HP and 26 damage).

Test baseline recorded on 2026-09-20. Re-run both commands afresh before relying on these numbers.

## 22. Build and release

- Build script `scripts/build.mjs` stamps release 88.
- `index.html` loads `styles.css?v=87`, registers `sw.js?v=87`, and imports `src/main.js?v=87`. These must stay in step with the build release.
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
9. The declared interface version for `local-save-schema` is wrong; the recommended fix is recorded in section 6.5 but not applied.

**Not defects, resolved:**

10. Gate Revenant statistics: runtime overrides, consistent with the regression, no defect (section 9.3).
11. Floor mark rotation: rotation is applied at `renderer.ts:399-400`; the earlier suspicion of no orientation was wrong.
12. Rift Bombard and shelter traversal: corrected in commits `6de8481` (2026-09-20 11:22) and `18e972c` (2026-09-20 17:16) with passing automated regressions.

**Corrected but not manually revalidated on device:** Rift Bombard enemy-body contact, shelter entrances and roof cutaways, and every on-device behaviour listed in section 26.

## 26. Manual validation status

Nothing in this project has been revalidated on the owner's device during the field-guide passes. Unverified on device: Rift Bombard contact since the latest corrective commit, shelter traversal since the latest corrective commit, the compass and mark behaviour described in section 16, Android installation, installed-PWA offline launch, airplane-mode resume, touch usability, frame pacing under real load, ambient audio behaviour, the current design intent behind the red and green lifts, the glass symbols, the ring opening, and the amber chevron vertex, sparse-region freshness, overworld compaction, multi-breach and swarm content, and Wayglass Beacon placement rate as experienced rather than as computed.

## 27. Change control and governance

- Mandatory before any project write: read `C:\AI-PROJECTS\brightline-release-manager\docs\GLOBAL_CHANGE_CONTROL.md`, run `status` and `checkpoint` with `-ProjectPath`, then follow the guarded workflow for existing-file changes.
- The guarded adapter changes existing ordinary public files on the qualified local Windows filesystem. It does not manage secrets, databases, services, cloud deployments, ACL changes, file creation, or file deletion (protocol section "Supported scope").
- Additional new files and contract changes require explicit review, ordinary version control, and a fresh checkpoint, and **must not be described as guarded effects**.
- Status recorded for this operation: `ok:true`, projectId `8225aa1c-9d77-49ac-a8a9-f6b740f7d6f6`, componentOrder `["main"]`, `coordinatorInitialized:true`, no active operations, no blockers, 23 drift entries. Of those, three are `sha256+identity` drift and twenty are `input-binding` drift. Drift records are observations about recorded versus current identities, not permission to rewrite anything, and they do not indicate that this project is unusable.
- Checkpoint recorded for this operation: `40d8bf722b82f6c07d5c823996de054263e027b685c44bb78319de058d6e2ac7`, 42 observed files, `preexistingWorkPreserved:true`.
- Never bypass a rejected change-control operation, create a second authority, reset unrelated work, clean the repository, or overwrite user changes.
- Stewardship: `docs/decisions/0001-field-guide-consistency-stewardship.md` defines this guide's role as architectural orientation and regression control for every modification, and the Consistency Steward review that each change must pass, including its four possible verdicts.

## 28. Maintenance rules for this document

- Update this file in the same change that alters the behaviour it describes. A guide that trails the code is worse than no guide.
- Label every new factual claim with CODE, TEST, INTENT, or UNTRACED, and cite a file and line or a command with its actual result.
- Never promote a test name into subsystem certification. A test proves the assertion it makes and nothing more.
- Keep section 19 private. Do not move its content into player-facing surfaces.
- When a claim in this guide is found wrong, correct it in place and note the correction rather than deleting the trail.
- Record the reading ledger honestly. An unread span listed as unread is more useful than a confident claim over unread code.
