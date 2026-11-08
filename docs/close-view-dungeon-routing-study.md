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


## Phase B design proposal — compact exploration and architectural appearance

**Approved design record; implementation evidence follows below.** Existing prototype revisions keep5/Pentagon10 remain explicitly selected scratch experiments, with production defaults4/9 unchanged. The second experiment revision refines these unpublished candidates; restarting its fixture reconstructs the new recipe. Existing/explored production pins are never regenerated. No new save schema or production-export support is proposed.

### Recommendation and alternatives

Choose compact, varied room grammars plus a maximum of one parallel vertical pair per site. Keep-only stairs are the lowest-risk first slice. The recommended next slice adds at most one **gate-equivalent adjacent Heart pair** for Pentagon, after verifying its complete directed transition contract. Reject novel ring-to-Heart/court-to-Heart links, hall-spine bypasses, nonadjacent floors and new intermediate floor identities in this phase.

The current nine-room grid is too expansive to count as a finished exploration design. A fresh matched source probe used roofed IDs `building:{seed}:1:1:keep:4r`, four floors, unchanged guard counts:

| Seed | Open tiles, v4 → frozen v5 (sum4 floors) | Enemies (both) | Peak static vertices, v4 → frozen v5 |
|---|---:|---:|---:|
| AUDIT0 | 1345 → 4368 | 19 | 20574 → 51036 |
| DIG-AUDIT0 | 1601 → 4407 | 19 | 25950 → 49428 |
| ROUTING0 | 1223 → 4357 | 20 | 18930 → 50046 |

These roofed IDs intentionally differ from the preceding non-roof sample table. The new proposal aims for roughly400–650 open cells per44×40 floor, not another increase. This is an experiment target, not a reason to silently reject inconvenient seeds or change encounter totals.

Use three original bounded grammars: a staggered spine with side chambers and a reconnecting service route; an offset ring with a short chord and one legible optional branch; and unequal paired wings joining a common landmark room. Select5–7 rooms from a fixed finite slot catalogue, vary dimensions/orientation, and allow chamfered/apsidal or short L-shaped footprints where inherited terrain decoration remains valid. Retain a continuous solid margin, existing semantic ports and two-tile connectors; use three-tile junction/landing/escape pockets. Preserve encounter/reward totals and family identity. Prefer route choices that return to useful landmarks, not long empty branches. This phase adds no invisible mandatory route, new secret-door mechanic or reward economy; optional branch entrances remain visually legible.

Geometry, connector choice, port attachment, optional stair placement and appearance each get a local deterministic stream. Maximum7 room nodes, a fixed bounded edge catalogue, at most2 additional horizontal loop edges, existing32 reserved-port/4096-cell limits and no retry/time-based termination. Node roles and measured route lengths are diagnostics, not per-frame navigation. Existing ceiling/light/prop/actor caps remain.

### Vertical routes and progression proof

For a keep, choose at most one adjacent floor pair. Keep original `arrive`/`up` stairs. Scan common candidate coordinates after floor layout but before holes/objects, using bounded distance maps from the original stairs on both floors. Require separated useful approaches and a clear landing/step-off on both maps. Reserve both ends from holes, terrain blocking and object/foe placement; emit both endpoints or neither. If no safe useful pair exists, omit it deterministically and expose the reason. Revalidate normal `canStep` and footprint access after terrain decoration. The intended circuit is ordinary stair up → upper walking route → optional stair down → lower walking route; separate floor maps perform the actual vertical traversal.

For Pentagon, duplicate only an existing adjacent Heart transition, preferably away from the finale. Preserve original nodes/edges/world/links/trials/levers/ledges and IDs; store at most one optional route separately. The current `pp.to === q.id` counterpart lookup and `lab-pass-${destination.n}` IDs assume one edge per pair, so optional routes require stable `routeId`, unique endpoint IDs and explicit counterpart references. Do not append ambiguous ordinary ports. Downward copies retain `labyrinth:true`, the original `bossGate`, and all original ordered guards/effects. Never substitute `pentShortcut`, whose far-side opener has different guard semantics.

`Game.goBuildingFloor` selects its destination through `toId/toX/toY`; `toFloor` is metadata. Keep destinations must identify the existing adjacent floor of the same building. Pentagon area `:fN` encodes chamber n+1, not Heart visual depth. Validate actual `buildingArrival`, both counterpart identities and a real return. Existing roof/hatch/roofExit and living-guardian rules remain exact.

The progression validator must prove complete state equivalence for the restricted extension, not flood-fill with all doors open. Collapse geometry into safe semantic components, preserve every original action/pickup/combat trigger, and require each added directed action to match an existing action's source/destination component and **ordered guard/effect contract**. Include labKeys/labOpen, pentLevers, pentTrials, pentBosses, pentSigil/pentOpened, plate latch state, guardian/finale state and active shortcuts. Sigil first-use opens without travel; deep-side shortcut opening and trial-guard clearance are distinct effects. Exact duplication proves no new reachable macro progression state for every valuation of these fields. Fail closed on any unmatched guard/effect or component. This proof does not authorize novel cross-node edges.

Executable witnesses must check fresh/partial/full progression, blocked Heart descent before its keeper and permitted descent afterwards at both stair pairs, upstairs return, unchanged key/trial/lever/sigil/plate/shortcut semantics, required cache/finale/roof routes, and the complete walking vertical circuit. Geometry-only connectivity is insufficient. Test normal scratch reconstruction and export/migrate/resume through the harness that reinstalls the candidate Pentagon selector; retain exact location, counterpart IDs, enemy/guardian state, dungeonReturn and unknown schema14 fields. Standalone experimental exports remain unsupported.

### Biomechanical keep appearance

The narrative bible was read first. Its ambiguous keep/Pentagon seam-life, reciprocal assimilation and accumulated decay support this appearance without naming a new civilization, adding exposition or establishing new metaphysics. Keep the player-facing Old Keep identity. Original ribbed chitin, worn metal, restrained conduits and small warm lights imply the variation; no copied creatures/assets or new gameplay family.

Proposed generated metadata is `building.appearance = {version:1, kind:'biomechanical-keep'}`, present only on a deterministic minority of **standalone candidate keep5** sites (initial proposal one in four). Derive it from building base plus an appearance-specific salt; share it across that site's floors and never consume navigation/loot RNG. Do not change `style:'keep'`, tile gameplay kinds, enemies, loot, dungeon IDs or old theme hashes. The candidate interior version freezes the appearance rule at eventual adoption; generated metadata adds no durable save field and requires no schema migration. Castle/compound keeps, Hive/apartment families, the legacy outdoor Great Keep and ordinary dungeon families are excluded.

A single Close View theme preset can already combine organic wall material2, ribbed ceiling2, machinery floor10, aged neutral metal/chitin colors and bounded existing vent/root decoration. `keepWall` follows the selected theme, unlike hard-coded Hive/apartment tile materials. Keep the existing light budget and at least the current keep's actor readability; use no shader change, atlas addition, image asset, dependency or draw pass. Existing ceiling ribs and wall/ceiling/floor palettes provide coherent architecture. No new combat collision follows decorative ribs.

The proposed optional exterior complement is equally narrow: the selected scratch site's regenerated `greatBuilding` record gets the same **runtime-only appearance tag** from its fixture reconstruction wrapper; `renderer.ts` uses it only to select facade/roof palette and existing line motifs. No roof tile height, footprint, hole, door or path changes. This makes the experimental site's exterior/roof appearance coherent while retaining ordinary outdoor rendering. Production adoption later needs explicit history-aware attachment of that derived tag; do not pretend the PG wrapper is production adoption. If this complement is deferred, report that the experimental interior is biomechanical while the outdoor facade/roof remains ordinary stone.

### Bounded ownership and acceptance plan

Proposed owned sources: `close-view-room-routing.ts` (grammar/route/appearance policy), `great-buildings.ts` (optional stair reservation/pairs and candidate appearance), `pentagon.ts` (separate candidate optional pair/counterparts), narrowly necessary `game.ts` counterpart routing only if existing explicit destinations are insufficient, `close-view.ts` (one theme), `proving-ground-labs.ts` (matched fixtures/diagnostics/reconstruction), and `renderer.ts` only for approved exterior palette complement. No config/build/SW edit or new module is planned. Add focused new routing/progression/theme tests; update only candidate-specific assertions that deliberately encoded9 rooms or one counterpart. Preserve every published generator golden digest and existing compatibility assertion.

Compare baseline/frozen-phaseA/refined-phaseB on AUDIT0, DIG-AUDIT0, ROUTING0, PIN and an unchanged fixed seed corpus. Report diagrams with distinct original/optional stairs, room graph degree/dead ends/cycle rank, useful circuit length, route savings, required/optional walking distances, clearance and open-area/foe ratios, usable object approaches, rejected optional-pair reasons, work counters, static vertex/light/prop counts and theme parity across tiers/reduced motion. Add ordinary body-contact-sized passage/retreat and landing clearance probes without claiming graph metrics establish combat feel. Maximum one extra vertical pair means two new objects per selected site, bounded floor-area scans/BFS and no per-frame generation or all-pairs actors.

Offline tests/build remain allowed; local server/browser/fullnpm remain stopped. Hosted Close View exploration, actual material readability/occlusion and phone frame time remain separate acceptance gates. This design record does not authorize production adoption.


## Phase B implementation evidence — experiment revision 2

The approved design is now implemented in the isolated candidate. Production defaults remain4/9; keep5/Pentagon10 stay PG-only. No Game transition change was necessary. The historical phase-A prototype is preserved at e9a88656.

The three-way table uses identical roofed four-floor sites (current v4 / frozen phase A / refined phase B). Far-use distance is the largest shortest ordinary walk to an interactable across the site's floors, not a pacing acceptance score.

| Seed | Open tiles (sum4 floors) | Enemies (sum4 floors) | Peak static vertices | Farthest use, v4 / B |
|---|---:|---:|---:|---:|
| AUDIT0 | 1345 / 4368 / 1386 | 19 / 19 / 19 | 20574 / 51036 / 21714 | 35 / 51 |
| DIG-AUDIT0 | 1601 / 4407 / 1465 | 19 / 19 / 19 | 25950 / 49428 / 23496 | 62 / 63 |
| ROUTING0 | 1223 / 4357 / 1432 | 20 / 20 / 20 | 18930 / 50046 / 23742 | 46 / 55 |

Across the fixed128-site COMPACT corpus (512 keep floors), open floor cells range286–484, mean352.9. This is smaller than the design's initial400–650 target and close to the original floor-area budget; added route variety comes from reconnections and real floor transitions, not empty expansion. Keep optional pairs were omitted3/128 times; accepted raw walking circuits span36–120 steps including2 transitions. Heart pairs were omitted0/64 times in the independent HEART-PAIR corpus. Omission reasons remain explicit and deterministic; no retry or seed filtering repairs them.

Matched AUDIT0 ground-floor footprints: current v4, frozen phase A, refined phase B. # wall, . floor, o hole, @ arrival, E exterior exit, U original up stair, S paired optional side stair. The frozen phase-A panel reconstructs its exact raw layout/up placement from e9a88656; height shading and decorative objects are omitted consistently.

```text
############################################    ############################################    ############################################
###################....#####################    ############################################    ############################################
###################....#####################    ################............###...........##    ############################################
###################....#####################    ##............##............###...........##    ############################################
###################....#####################    ##............##............###...........##    ############################################
####################..######################    ##............##............###........U..##    ############################################
####################..######################    ##........................................##    ###################......###################
####################..######################    ##........................................##    #####.....U########......###################
####################..######################    ##............##............###...........##    #####................................#######
####################..######################    ##............##............###...........##    #####................................#######
####################..######################    ##............##............###...........##    #####......########......######......#######
####################..######################    ##............##............###...........##    #####......###########..#######....S.#######
####################..######################    ########..############..############..######    #####......###########..#######......#######
####################..######################    ########..############..############..######    ########..############..###########..#######
##############...............###############    ########..############..############..######    ########..############..###########..#######
##############...............###############    ###...........###...........###...........##    ########..############..###########..#######
##############...............###############    ###...........###...........###...........##    ########..############..###########..#######
####....######...............######...######    ###...........###...........###...........##    ########..############..###########..#######
####..................................######    ###...........###...........###...........##    ########..############..###########..#######
####..U...............................######    ###.......................................##    ########..############..###########..#######
####....######...............######...######    ###.......................................##    ########..############..###########..#######
##############...............######...######    ###...........###...........###...........##    ########..############..###########..#######
##############...............######...######    ###...........###...........###...........##    ########..############..###########..#######
##############...............######...######    ###...........###...........###...........##    ########..############..###########..#######
##############...............######...######    ###...........###...........###...........##    ########..############..###########..#######
####################..#############...######    ######################..####################    #######...############..##########...#######
####################..#############...######    ######################..####################    #######....###########..##########....######
####################..#############...######    ##............########..#######...........##    ######.....###########..#########.....######
####################..#############...######    ##............##............###...........##    ######.....########.......#######.....######
####################..#############...######    ##............##............###...........##    #######...#########.......#######.....######
####################..#############...######    ##............##............###...........##    ########..............................######
####################..#############...######    ##............##............###...........##    ########.............................#######
####################..#############...######    ##........................................##    ###################.......##################
###################.....###########...######    ##........................................##    ######################..####################
###################...................######    ##............##............###...........##    ######################..####################
###################...................######    ##............##............###...........##    ######################..####################
###################.................########    ##............##............###...........##    ######################..####################
#####################..#####################    ##............##............###...........##    #####################...####################
######################@#####################    ######################@.####################    #####################.@.####################
######################E#####################    ######################E#####################    ######################E#####################
```

A small cached floor inlay marks a recurring junction room (at most24 added vertices, existing static pass). It is a visual cue only, not a lock, reward, hazard or physics surface. The biomechanical preset reuses current material2 walls, material10 floors and organic ceiling ribs; matched PG baseline/candidate scenarios select the same ordinary enterable Old Keep site. ROUTING0's explicit biomechanical comparison is at section(3,-3), door(25,15). Runtime-only exterior tagging survives fixture loads and changes both block-structure facade and roof palettes without touching terrain.

The room graphs in the same512-floor corpus have maximum degree3, zero or two degree1 chambers, and cycle rank1 or2. These are grammar graph measurements; crossing/overlapping carved corridors can alter the physical graph, so these numbers are not a claim about perceived route complexity. Actual ordinary-footprint paths and real walking circuits are checked separately. Static geometry peaks at27402 vertices,32 placed light candidates and46 prop-card candidates. Existing tier selection still limits submitted lights to3/5/8 and cards to10/20/28. One offline warm-process probe generated these floors and static meshes in6098ms; its slowest individual floor-generation call was15.32ms. These source CPU measurements are descriptive, not timing thresholds or device/GPU acceptance.

Work is bounded structurally:6–7 room nodes, at most8 connector edges, at most32 reserved ports, at most4096 floor cells, exactly two distance maps and one cell scan per optional pair, and zero regeneration attempts. The finite pairs add at most two stair objects per site. All generation uses local deterministic streams; there is no frame-time stopping condition, dependency, new shader/pass or persistent cache. Optional stair landings reserve a flat3×3 footprint from holes, other objects and spawns; tests require normal footprint/canStep access and an escape pocket. This branch predates the separate actor-contact integration, so a live foe blocking/retreat playtest is still required after that candidate merges.

The optional Heart action is a complete clone of its existing directed action. Only identity, label and position/destination coordinates differ. Tests compare every original transition's full guard/effect payload withv9, and each extra transition with its original, while requiring both endpoints to occupy the same ordinarily connected semantic chambers. With identical action ordering in unchanged Game code, this establishes progression-state equivalence for every guard valuation of this restricted parallel-edge extension. Executable Game witnesses additionally cover partial keeper histories, keys, first-use Seal opening without travel, a real stone-held plate, actual lever pulls, real trial-clear consequences and deep-side shortcut opening. The witnesses deliberately clear enemies to exercise travel; they do not validate encounter pacing or actual combat difficulty.

An endpoint audit found inherited shortcut-placement omissions:21 missing ends across16 v9 HEART-PAIR sites, versus6 in the initial v10 candidate. Pinnedv9 is unchanged. Candidatev10 now permits existing planned link ends in safe flat pockets anywhere inside their original semantic chamber. It changes no planned link ID, guard, effect or macro connection. Regression coverage requires every planned near/deep end across64 sites, a walkable approach, near-side refusal, deep-side opening, scratch reload and counterpart return.

`restoreRoomRoutingFixture` is an explicit interior-only scratch test harness: it validates the seed/site/revision, runs the normal snapshot migration and Game reconstruction, then reinstalls the selected-site experiment selector/appearance wrapper. Exact position, dungeonReturn, counterpart identity, keeper/shortcut histories and an unknown schema14 canary survive. No production save import/export support is introduced. Cross-experiment-revision snapshots are unsupported; reset the fixture when changing prototype revisions. Production adoption would require a separately reviewed generation/history decision and exterior appearance attachment.

Validation completed offline at release825:

- `node --test tests/close-view-room-routing.test.ts tests/close-view-routing-exploration.test.ts` —15/15 passed. Includes1000-seed order-independent determinism, unchanged v4 golden,128-site keep/Pentagon reachability,64-site transition equivalence and all endpoint checks, real progression/travel/resume witnesses, matched biomechanical exterior identity, and mock GPU execution at all three quality tiers with reduced motion on/off.
- `node --test tests/great-buildings.test.ts tests/pentagon.test.ts tests/pentagon-grand-halls.test.ts tests/interior-v4-arrival.test.ts tests/interior-terrain.test.ts tests/close-view.test.ts tests/close-view-v4.test.ts tests/close-view-terrain-render.test.ts tests/release-consistency.test.ts` —82/82 passed, unchanged assertions and legacy digests.
- `node --test tests/close-view-atmosphere-794.test.ts tests/pentagon-shortcuts.test.ts tests/pentagon-balconies.test.ts tests/pentagon-finale.test.ts` —48/48 passed, unchanged assertions.
- `npm run build` —passed; static offline PWA release825 and PG-1. No release/configuration/module-registration change in this phase.

Hosted cases remain: explore both real stair circuits with ordinary enemy contact active; compare room recognition, encounter density and retreat options; inspect biomechanical wall/floor/ceiling cohesion and actor readability across phone tiers and reduced motion; verify outdoor roof/facade palette and return visually. Courts and roofs intentionally retain the ordinary outdoor view. CPU and mock GL checks cannot establish hardware rendering, art acceptance or exploration quality. The candidate is ready for that explicit PG comparison, not production adoption.
