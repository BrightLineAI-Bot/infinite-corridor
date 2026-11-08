# Deterministic dungeon routing — reuse study and construction pass

Recorded 2026-11-07 against published game commit `0c066edbc1a0dff1f33bf83b71bbd3221683d06a`. Research and read-only architecture review only: no dependency, generator, map, save or runtime change has been made.

The owner wants reusable deterministic room-maze routing with distinct branches, loops and less obvious vertical connections. Keep the enjoyable roof access and movement up/down through buildings. Preserve every explored/pinned layout; a new structure experiment belongs behind a new generator revision for new histories, initially in Proving Ground.

## Recommendation

Keep Infinite Corridor's engine and map/save contracts. Adapt the **Rooms and Mazes region/connector structure** to the existing Room Maze family; use rot.js as an isolated comparison implementation and Edgar's graph/template vocabulary as design material. Do not adopt a whole dungeon engine or flatten the existing multi-floor families into a generic 2D generator.

| Reference | Verified useful structure | Fit and boundary |
|---|---|---|
| [rot.js official repository](https://github.com/ondras/rot.js/) | Browser-compatible TypeScript/JavaScript, BSD-3-Clause. Digger, Uniform and Rogue produce 2D grid layouts. Its [RNG](https://raw.githubusercontent.com/ondras/rot.js/master/src/rng.ts) supports seed/state operations and cloning. | Good isolated benchmark or a carefully bounded adapter. [Digger](https://raw.githubusercontent.com/ondras/rot.js/master/src/map/digger.ts) and [Uniform](https://raw.githubusercontent.com/ondras/rot.js/master/src/map/uniform.ts) have `Date.now()` cutoffs: seed alone cannot establish identical results if the cutoff is reached. Do not put shared library RNG or wall-clock termination into authoritative generation. No vertical-world model is supplied. |
| Bob Nystrom's [Rooms and Mazes](https://journal.stuffwithstuff.com/2014/12/21/rooms-and-mazes/) and [Hauberk](https://github.com/munificent/hauberk) | Rooms and maze regions, candidate connectors, region joining, optional additional connectors/loops and dead-end removal. Hauberk's [code license is MIT](https://raw.githubusercontent.com/munificent/hauberk/master/COPYRIGHT). | Closest conceptual match to the owner's room-maze request. Its Dart/web implementation is not a drop-in TypeScript dependency. Reuse the structure with Corridor's local RNG and existing semantic constraints. A saveable deterministic RNG contract was not verified for Hauberk. It is a 2D algorithm, not a supplied vertical engine. |
| [Edgar-DotNet official repository](https://github.com/OndrejNepozitek/Edgar-DotNet) | MIT; graph-directed connectivity using authored polygon/door room templates, with JSON/PNG export. README specifies 2D grid layouts, recommends fewer than 30 rooms, and notes an ongoing refactor. | Useful template/connectivity reference. The .NET Standard runtime is not browser-native JavaScript; do not add it to this offline mobile game for the spike. No saveable RNG-state contract was verified. No project-specific vertical transitions are supplied. |

These are primary author/project sources. Before any later code port, pin the exact upstream revision and license and retain required notices. No source code or package has been imported by this study.

## Existing integration seams

- [random.ts](../src/random.ts): stable string hashing and local closure RNG. Keep generation isolated from invocation order and unrelated random draws. The game currently has no package dependencies.
- [game.ts](../src/game.ts): history/generator versions are pinned before generation; old areas retain their existing versions. [types.ts](../src/types.ts) remains additive save schema 14.
- [dungeon-framework.ts](../src/dungeon-framework.ts): existing generator/topology contracts, topology hashes, critical routes, branch/loop metrics and discovery chunks provide comparison and validation seams.
- [labyrinths.ts](../src/labyrinths.ts): current Room Mazes already contain logical levels -1 through 2, barrier crossings, optional dead-end wings, braided room loops, extra-stair loops, keys/locks and roof/undercroft identities. Improve this family rather than beginning with Pentagon or migrating every building family.
- [great-buildings.ts](../src/great-buildings.ts), [compounds.ts](../src/compounds.ts) and [castles.ts](../src/castles.ts): explicit `buildingStair` destinations (`toId`/`toFloor`), roof hatches/exits and atlas version pins must remain owned by those families.
- [pentagon.ts](../src/pentagon.ts) already has seeded graph nodes, edges, shortcuts and Pentagon version pins. [deep-dungeons.ts](../src/deep-dungeons.ts) already has layout graphs, routes, shortcuts and stable multi-level identities. Preserve them in the initial experiment.

A new Room Maze revision number is selected against current source at implementation time; this note reserves neither a game release nor a generator revision.

## Vertical routing that actually works

`Tile.elev` is one walkable heightfield surface within a map area, including walkable roof surfaces. It does not by itself represent independently walkable stacked corridors at the same x/y. Genuine upper/lower routes use separate floor-area maps joined by explicit stairs/hatches and landings.

Therefore subtle vertical weaving should mean a route that changes floor, branches or crosses another route there, and later rejoins through another existing-style connection. A 2D layout tool can arrange rooms/corridors **around reserved landings**; it cannot independently invent or relocate cross-floor destinations. None of the three references supplies Corridor's vertical layer model.

The dungeon family owns a reproducible floor/transition graph with stable semantic edge identifiers and consistent endpoints. Derive shared vertical connections coherently for the whole family; derive floor-local layouts from their own isolated stages afterward. Reserve entry, required stairs, landing approaches, roof access, key/lock roles, objectives and protected branches before optional connector placement or dead-end pruning. Validate reciprocal links where required, and explicitly mark intentional one-way transitions.

## Bounded Proving Ground experiment

1. Keep one existing Room Maze revision as a reference and add one candidate behind a new revision for newly created histories only. Start in isolated Proving Ground fixtures; do not adopt it into production histories as part of this research.
2. Generate an intermediate room/region graph, required connectors and bounded optional branches/loops. Keep semantic room/connector IDs through tile realization.
3. Realize it using the existing tiles, terrain, floor transitions, navigation and dungeon contract rather than a parallel engine/save system.
4. Use isolated RNG streams derived from family seed/location, generator revision and generation stage; add floor identity to floor-local stages. Decoration draws must not alter connectivity. Use bounded deterministic attempts/retries, not elapsed wall time, to terminate generation.
5. Validate progression states as well as geometry: all-doors-open flood fill alone cannot detect a key behind its own lock or a required stair gated by unavailable traversal.
6. Present matched seed layouts with route/branch/loop metrics and actual Close View traversal, including rejected/problematic seeds. Adopt only if the comparison improves understandable choices, optional exploration or encounter pacing.

## Acceptance and preservation

- Repeated seed/version output and topology digests match across repeated calls and varied generation order, independent of wall-clock speed.
- Previously pinned layouts and golden digests remain unchanged; no journey is regenerated and no save schema is expanded.
- Entry, mandatory objectives/vault, roof and required return routes are reachable with the intended progression capabilities; keys precede their locks.
- Every floor edge has valid destination identity/floor and usable landing/approach; no unsupported same-x/y stacked surface is assumed.
- Roof/up/down routes, sealed towers, air/drone restrictions, lethal terrain and intentional one-way rules retain their semantics.
- Measure branch/loop diversity, critical-path length and optional exploration distance, while avoiding excessive loops that erase progression or pruning that removes useful branches.
- Generation time, memory, retries, map size and tile/object/enemy work remain bounded. Hardware phone measurements and hosted visual traversal remain separate gates.
- Schema 14 malformed/future/unknown fields, exact resume and production/Proving Ground isolation retain their current contracts.

Sol performed the primary-source and repository audit; Astra reviewed the bounded adaptation recommendation. No automatic adoption or publication authority follows from either the study or its review. The next product choices are revision versus a new family, dependency versus internal adaptation, and desired branch/loop/floor distributions; the recommendation is a versioned internal adaptation first, with ranges tuned from matched layouts rather than guessed here.


## Close View Old Keep / Pentagon prototype — 2026-11-08

Owner correction supersedes the initial Room Maze recommendation above: this experiment targets Close View inside enterable overworld **Old Keeps** and Pentagon chambers. It does not change the Room Maze family or ordinary dungeons. The current `great-buildings.ts` Old Keep has three or four separately generated floors and an exterior door. The historical `keeps.ts` Great Keep is an outdoor heightfield structure, generated only on already-pinned `keepVersion` sections; it has no Close View interior. Castle Great Keep parts and compound towers are not included.

### Implementation and isolation

The original internal `src/close-view-room-routing.ts` helper partitions the existing 44×40 keep / 45×39 ordinary Pentagon floor into nine separated room regions. A locally shuffled twelve-edge adjacency graph supplies an eight-edge spanning tree and one or two extra connectors; two-tile corridors link the rooms. Independent room, connector, reserved-port and material RNG streams derive from family identity, floor and experiment revision 1. No upstream code, dependency, global RNG, time cutoff or engine replacement is introduced.

Only exact keep interior version **5** (standalone keep style) and Pentagon version **10** select the candidate. Production defaults remain **4 / 9**. Existing dispatches and every earlier generator remain unchanged. Existing semantic ports, up/down destinations, roof return metadata, trial/boss/shard/lever gates and the Pentagon macro graph are retained. Keeps recompute their paired stair positions coherently from their newly versioned floor plans. True multi-floor routes remain separate maps. No fake stacked surface or additional semantic floor edge is introduced.

Pentagon grand halls keep their existing generator and templates. The new site namespace can change their dressing/placement hashes; the complete v10 site is not claimed byte-identical to v9 outside ordinary chambers. All candidate hall ports and usable objects are included in the walking sweep.

Four accessible Close View scenarios compare matched seeds: `routing-keep-baseline`, `routing-keep-candidate`, `routing-pentagon-baseline`, `routing-pentagon-candidate`. They enter actual generated exterior doors through normal Game interactions. Keep discovery is bounded to 24 actual section loads and rings below 48. Pentagon candidates override version selection only on their scratch Game instance and chosen site, because production's selector caps adoption at v9. Restart/reconstruction reinstalls the override. These fixtures are **not supported production exports**. Diagnostics state this scope. No prototype/global override or save-schema change exists. Existing lab defaults are unchanged. Guardian/trial actors remain, so opening a roof or passing a boss gate still requires normal progression. Roofs and courts retain the ordinary outdoor view.

### Matched layout evidence

Metrics below use cardinal flood fill with `canStep` for an ordinary walking actor, excluding holes. “Farthest use” is the longest shortest route from entry to an interactable tile; “farthest tile” also includes optional floor exploration. These are navigation diagnostics, not combat quality, human legibility, phone performance or product acceptance. More distance is not automatically better. The initial layout has five room leaves; the candidate has nine. Candidate design graph has 1–2 independent loops; these graph edges must not be confused with tile-graph cycles inside open rooms.

| Matched site | Walkable reached tiles (current → candidate) | Farthest use (steps) | Farthest tile (steps) | Ramp tiles |
|---|---:|---:|---:|---:|
| Old Keep AUDIT0, floor 4 | 390 → 1046 | 66 → 69 | 67 → 78 | 10 → 62 |
| Old Keep DIG-AUDIT0, floor 4 | 319 → 1065 | 52 → 61 | 67 → 62 | 28 → 41 |
| Old Keep ROUTING0, floor 4 | 338 → 1017 | 41 → 55 | 42 → 56 | 34 → 18 |
| Pentagon ROUTING0 (8,-8), o0 | 373 → 1138 | 59 → 59 | 59 → 61 | 6 → 62 |

AUDIT0 previously exposed the v3 wall-hosted down-ladder; DIG-AUDIT0 exposed the earlier excavation support defect. They remain fixed-version comparison seeds, not omitted outliers. These samples show longer optional/required walking distances as well as more separated rooms; encounter pacing still needs hosted play.

The usable-floor increase is substantial, roughly 2.7–3.3 times the baseline in these keep samples. Generated enemy totals are unchanged (AUDIT0: 6/6; DIG-AUDIT0: 4/4; ROUTING0: 6/6), distributed across nine rooms instead of five. More clearance gives room to move and more route choices, but it also lowers encounter density and may produce empty-feeling travel, repetitive room silhouettes or extra backtracking. The candidate uses compact two-tile connector passages between broad rooms; doorway camera comfort and the transition from broad combat space to those passages need actual Close View review. The room graph and longer routes establish neither visual variety nor improved pacing. No enemy count, balance or art tuning is included.

Matched tile diagrams (`#` wall, `.` floor, `~` ramp, `o` hole, `@` entry, `D` down, `U` up, `E` exit, `R` roof ladder, `C` cache):

Old Keep AUDIT0, floor 4: current on the left, candidate on the right.

```text
############################################    ############################################
####################....####################    ############################################
#####......~~...........####################    ##....D....~~.#################...........##
###........~~.oo........####################    ##....@....~~.##............###...........##
###...@#############....####################    ##.........~~.##............###...........##
###..#D#############....####################    ##.........~~.##............###...........##
###..################..#####################    ##.........~~.##............###...........##
###..################..#####################    ##.........~~...............###...........##
###..################..#####################    ##.........~~.............oo###...........##
###..################..#####################    ##.........~~.##..........oo###...........##
###..################..#####################    ##.........~~.##...oo.....o.###...........##
###..################..#####################    ##.........~~.##...oo.......###....oo.....##
###..################..#####################    #######..############..#############..######
###..################..#####################    #######..############..#############..######
###..################..#####################    ###........~~.##............########..######
###..###########....oo......################    ###........~~.##....oo......###....oo.....##
###..###########....oo......################    ###........~~.##....oo......###....oo.....##
###..###########....o.......################    ###........~~.##....oo......###....oo.....##
##.....#########............##########...###    ###........~~.##....o.......###....o.oo...##
##.........~~........................oo..###    ###........~~........................oo...##
##.........~~............................###    ###........~~........................o....##
##.........~~...............##########...###    ###........~~.##............###...........##
################............##########...###    ###........~~.##............###...........##
################............##########...###    ###........~~.##............###...........##
################............##########...###    ###........~~.##............###...........##
#####################..###############...###    ######################..############..######
#####################..###############...###    ######################..############..######
#####################..###############...###    ######################..############..######
#####################..###############...###    ##C........~~.###.........oo###...........##
#####################..###############...###    ##.........~~.###.........oo###...........##
#####################..###############...###    ##.........~~.###.........oo###...........##
#####################..###############...###    ##.........~~.###.........oo###...........##
####################....................C###    ##.........~~.............o...............##
####################.....................###    ##.........~~.............................##
####################...................#####    ##.........~~.###..........o###...........##
############################################    ##.........~~.###..........o###...........##
############################################    ##.........~~.###...........###...........##
############################################    ##.........~~.###...........###...........##
############################################    ############################################
############################################    ############################################
```

Pentagon ROUTING0 (8,-8), o0: current on the left, candidate on the right.

```text
#########E###################################    #########E###################################
#########............########################    #########..##################################
########.................####################    ###...........###...........##.~~..........##
####################.....####################    ###...........###...........##.~~..........##
####################.....####################    ###...........###...........##.~~..........##
####################.....####################    ###...........###...........##.~~..........##
####################.....####################    ###...........###..............~~..........##
#####################..######################    ###...........###..............~~..........##
#####################..######################    ###...........###...........##.~~..........##
#####################..######################    ###...........###...........##.~~..........##
#####################..######################    ###...........###...........##.~~..........##
#####################..######################    ###...........###...........##.~~..........##
#####################..######################    ########..############..############..#######
#####################..######################    ########..############..############..#######
###############..............################    ###...........###...........###~~..........##
###############..............##############@.    ###...........###...........###~~..........@.
###############..............############...#    ###...........###...........###~~...........#
##....#########..............#########......#    ###...........###...........###~~..........##
##.............................~~.........###    ###............................~~..........##
##.............................~~.........###    ###............................~~..........##
##.............................~~.........###    ###...........###...........###~~..........##
#.....#########..............#########....###    ###...........###...........###~~..........##
#.#############..............################    ###...........###...........###~~..........##
#.#############..............################    ###...........###...........###~~..........##
#.#############..............################    ########..###########..#############..#######
#.###################...#####################    ########..###########..#############..#######
#.###################...#####################    ###...........##............##.~~..........##
#.###################...#####################    ###...........##............##.~~..........##
#.###################...#####################    ###...........##............##.~~..........##
#.###################...#####################    ###...........##............##.~~..........##
#.###################...#####################    ###...........##............##.~~..........##
..###################...#####################    ............................##.~~..........##
#####################...#####################    #...........................##.~~..........##
####################.....####################    ###...........##............##.~~..........##
####################.....####################    ###...........##............##.~~..........##
####################.....####################    ###...........##............##.~~..........##
##################.......####################    ###...........##............##.~~..........##
###################.#########################    ###################..########################
###################E#########################    ###################E#########################
```

### Validation and remaining gates

- Existing offline baseline: 23/23 passed (interior-v4-arrival, interior-terrain, pentagon-balconies). After implementation, the new routing suite plus unchanged arrival/terrain suites passed 19/19; the expanded final routing suite passed 8/8. Final unchanged legacy suites passed 58/58: `node --test tests/great-buildings.test.ts tests/pentagon.test.ts tests/pentagon-grand-halls.test.ts tests/interior-v4-arrival.test.ts tests/interior-terrain.test.ts`. Final candidate command: `node --test tests/close-view-room-routing.test.ts`.
- The final source regression covers 1,000 deterministic/order-independent room layouts with material-stream isolation; 128 complete keep/Pentagon sites (512 keep floor checks plus 3328 Pentagon chamber checks including grand halls); usable-object approaches, actual stairs/landings, roof ladder presence, exact macro/progression plan equivalence to v9, and real fixture enter/exit/reconstruction and keep roof travel. Legacy v1–3/Pentagon1–9 golden tests are unchanged. A new independent v4 digest covers all three standalone styles, four floors and PIN/AUDIT0/DIG-AUDIT0/ROUTING0.
- Living keep guardians still refuse the roof exit; defeat then permits a real elevation-5 roof landing. Living Pentagon Heart keepers still refuse downward travel. Unknown schema-14 canaries survive the unchanged save path. Existing exact-resume tests remain unchanged. No candidate production-export compatibility is claimed.
- Mock-WebGL source execution submits geometry for both candidates at low/balanced/full tiers. This is not a real GPU screenshot or hardware measurement. Hosted traversal, actual GPU visual review and physical-phone timing remain pending. Local loopback/server/full npm checks were not retried after the established EACCES stop.
- New helper work is bounded: nine room regions, twelve candidate edges, at most ten selected connectors, at most 32 reserved points and 4096 tiles; each corridor advances only along cardinal coordinate differences. No retry loop or wall-clock termination exists. The existing inherited terrain/decoration passes retain their existing bounds. No per-frame generation is added.
- The coordinator registered `close-view-room-routing.ts` in the explicit build module list and both service workers; the final sequential `npm run build` passed at the unchanged release 825. No release number is reserved and neither experimental revision is adopted into production. Integration stays at the construction stage after the earlier character/tool/camera passes. Full Linux CI and hosted acceptance remain separate gates.
