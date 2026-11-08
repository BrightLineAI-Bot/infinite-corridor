# Close View item and interaction audit

Audit date: 2026-11-08  
Audited base: `5657517168b62f4d3d27d60b8686fb8d293bd27a`  
Scope: read-only source and focused pure-test audit of production `Game` interaction, transient builds, grounded contact, and excavation return behavior. This is not a hosted, GPU, or physical-phone validation.

## Result

No concrete defect was found. No gameplay or test change is warranted by this audit.

### Verified — targeted Act taps retain the established roof-height reach gate

`Game.nearestObject()` measures objects through `Game.reachOf()`, and `Game.interact(action, objectId)` rechecks an explicitly selected object's `reachOf(q) < 1.5`. `reachOf()` intentionally returns `Infinity` when the Wayfarer is on a great-building roof and the candidate object is not on that roof; roof hatches have their own same-roof neighborhood rule. This is the production contract added for the report that roof hatches took several presses.

`Game.interactAt(x, y)`, used by tap-to-Act in both `src/main.ts` and `src/proving-ground.ts`, initially chooses candidates using planar distance from the tap and player, then calls `interact(null, o.id)`. That call enters `interact`'s non-null `objectId` lookup and rechecks `this.reachOf(q) < 1.5`. A ground object provisionally selected by XY while the Wayfarer is on a roof is therefore rejected by the authoritative roof-height check. Ordinary Act and targeted Act share the final reach contract.

The provisional XY candidate scan is redundant for cross-height objects but not an acceptance bypass. Changing it would be cleanup rather than a demonstrated gameplay fix and is outside this audit.

### Candidate/gap — interior object interaction has no general support-height/occlusion contract

All non-roof interactions remain planar: `reachOf()` returns Euclidean XY distance outside an overworld great building, and `interactAt()` has no support-height comparison. Close View terrain picking itself is height-aware and wall-bounded (`terrainFloorRay` stops at `wallAt` and intersects `interiorSurfaceHeight`), but candidate object selection is based on the returned XY point and raw object coordinates. Thus source does not prove that an object on another interior level is unreachable merely because its visible body is vertically separated.

This is recorded as a candidate/gap, not a defect. Existing stairs, doors, levers, guardian gates, and puzzle objects were authored under the planar 1.5-tile interaction contract. Adding a general height gate could silently rebalance old puzzles and escape routes. A concrete generated witness and an owner-approved vertical-reach rule are required before changing it.

## Source-backed behavior retained

- Both camera views share `Game.interact`, `Game.interactAt`, rewards, inventory storage, building, collision, scene transition, death, pause, and save mechanics. Close View changes screen-to-world picking/presentation, not those systems.
- Close View objects are not a second item population. `renderer.ts` iterates the production `g.map.objects`, applies the normal renderability/discovery filters, and submits the same sorted draw closures to Close View capture. Native travelers are an optional presentation replacement only.
- Close View floor taps are height-aware on interior terrain and do not ray through a wall. Creature picking is separate and returns the production enemy id. There is no equivalent object billboard/id pick; Act taps resolve the projected floor point through `Game.interactAt`. Consequently source proves object visibility through shared render submissions, but does not prove that every small object is visually legible or label-complete on hosted WebGL.
- Ordinary Act precedence is deliberate: sea help first; Wayglass before nearest object; with no object, dig before skiff construction, then mount handling. At a shore, passive tree/rock targets yield to a buildable skiff. Targeted object interaction does not invoke the no-target dig/skiff/mount fallbacks.
- Gates retain their existing order before generic `applyInteraction`: rite/tower/completion guards, stairs and building traversal, Pentagon shortcuts/finale/arena/key/gate/seal checks, Deep transitions and guardian locks, then generic object actions. One-time rewards continue to use durable history/flags and `journalOnce`/grant helpers.
- Full inventory behavior is not ground-drop based in this path. `storeInventoryItem` stores when space exists; otherwise it deterministically auto-salvages either the incoming weaker drop or the least-kept oldest carried item, with special protection for fresh brawler gear. No Close View fork was found.
- Transient construction remains runtime-only. Stone costs five stone, stacks to two, provides player perch/support, takes two blows, and a two-high stack stops fliers. Wood remains blocking rather than support. At most five physical records stand; the oldest gives way at the cap; each record has ten active seconds and does not age while paused. Builds clear on area reload rather than entering JSON.
- Build refusals retain boundaries for edge/no-room, occupied cells, blocked/structure/door/slope cells, water and lethal terrain. The player-body overlap refusal for Wood remains intact.
- Excavation return support remains additive only for new supported interior heightfields. Preflight and commit reject stale/sealed/build/cap failures before resource/reward spending; recorded surfaces replay on reload. Coordinate-only legacy tunnels retain historical geometry and rely on the existing recovery route rather than being rewritten.
- Grounded body contact consumes accepted endpoints for lava, crossings, raft occupancy, stairs, dodges, melee and knockback. It does not replace legal stair Act destinations and does not create a separate Close View mechanic.
- Scene/floor transitions clear transient projectiles/effects where their existing branches specify it; death explicitly loses no items, marks, equipment, or XP; pause preserves transient build lifetime in the tested production path. No item-specific Close View mutation was found in these paths.

## Focused verification

Before execution, the selected files were inspected for `node:http`, `node:net`, `createServer`, `listen`, `dev.mjs`, and process/fixture spawning. No server or network path was present. Tests were run directly and sequentially with `node --test`; no `npm` script, dev server, Proving Ground fixture process, network transport, broad changed-file suite, or hosted/GPU check was used.

- `node --test tests/building.test.ts tests/blocks-287.test.ts tests/contact-block-integration.test.ts tests/grounded-contact.test.ts tests/grounded-contact-height.test.ts` — 40 passed, 0 failed.
- `node --test tests/dug-tunnel-surface.test.ts tests/close-view-traversal-blocks.test.ts` — 23 passed, 0 failed.

Existing reported baseline supplied to this pass was source C50 + B19/R + C230 passing. This audit adds only the two focused direct batches above; it does not relabel that baseline as a combined, hosted, GPU, or phone result.

## Remaining gates

- A hosted Close View pass is still required for small-item visibility, readable labels, click affordance, overlap/occlusion, and visual selection on real generated interiors.
- A general vertical interaction rule requires explicit design approval and generated witnesses; this audit does not recommend silently applying one to existing stairs, doors, levers, guardian gates, rewards, or puzzles.
