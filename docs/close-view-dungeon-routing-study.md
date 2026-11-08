# Deterministic dungeon routing — reuse study and construction pass

Recorded 2026-11-07 against published game commit `0c066edbc1a0dff1f33bf83b71bbd3221683d06a`. Research and read-only architecture review only: no dependency, generator, map, save or runtime change has been made.

The owner wants reusable deterministic room-maze routing with distinct branches, loops and less obvious vertical connections. Keep the enjoyable roof access and movement up/down through buildings. Preserve every explored/pinned layout; a new structure experiment belongs behind a new generator revision for new histories, initially in Proving Ground.

## Latest owner scope clarification — 2026-11-08

The owner has now specified Close View inside **overworld Pentagons and keeps**, rather than existing dungeon families. This supersedes the Room Maze-first implementation target below; the earlier research remains a reusable algorithm/reference audit. A dedicated specialist is auditing Pentagon/keep representation, branching and vertical/roof transition contracts before proposing source changes. Preserve explored/pinned structures and dungeon layouts. Any geometry that changes authoritative routes must use the applicable new structure revision, with an isolated Proving Ground comparison before adoption; a view-only change must not invent passages absent from the authoritative map. No routing implementation is claimed by this clarification.

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
