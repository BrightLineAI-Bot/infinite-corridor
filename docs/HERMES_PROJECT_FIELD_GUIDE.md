# Infinite Corridor Field Guide

## Current release policy

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
