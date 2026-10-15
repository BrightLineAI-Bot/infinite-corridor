# Proposal: Seas, Boats and Diving (water traversal)

Status: **design proposal, not approved scope.** No gameplay code is changed by this document. Per `AGENTS.md`, implementation goes through Test Bot approved cards; this file is the input for those cards.

Requested by the operator, 2026-10-15: large multi-section bodies of water with islands and deep water, ports, a hunt to build/earn a boat, and later a second hunt for diving with underwater canyons and swimming.

## What already exists (verified in source)

- `src/landscape.ts` — Shattered Coasts come from the world-scale field `ocean` (`fbm(seed:land:ocean, gx/150, gy/150)`), thresholds `T.beach = 0.675`, `T.ocean = 0.70`. Tiles: `beach`, `shallows` (walkable), `ocean` (enterable, lethal — release 101 drowning). `LETHAL_KINDS` includes `ocean`. Islands already happen incidentally; objects/spawns on them get a shallows causeway (line ~308).
- `src/types.ts` — save v14 already carries `capabilities: { swim:false, dive:false, ... }`, defaulted in normalization. Nothing grants them yet.
- `src/story.ts` — the World Steward already recommends "prepare the first water-survival progression quest" after 6 water barriers without `swim`.
- Rivers/canyons (`src/world.ts`, environment v1) are section-band barriers; reachability (`reachableExterior`) treats them as impassable.

So the hooks are in place; what is missing is (1) seas big enough to be destinations, (2) a vessel, (3) the hunts that grant it, (4) later, an underwater layer.

## Package A — Open Seas and Islands (generation)

- New landscape generation namespace (e.g. `land:v2`) that adds an **open-sea** band: where `ocean` field is far above `T.ocean` (say > 0.78) a section becomes a sea section: almost all `ocean`, with deterministic **islands** from a second higher-frequency field (`land:v2:isle`) and rare **atolls/reefs** (shallows rings). Seas then span many sections naturally, like the mountain ranges.
- Depth bands on ocean tiles (`detail.depth` 1–3: shelf, deep, trench) — rendered as darker water; trenches become dive entrances in Package C.
- **Ports**: a coastal settlement variant (dock, pier tiles, harbour master NPC, Wayglass) placed by a coverage lattice like Wayglasses, so every sea has at least one port reachable on foot.
- Island content: each larger island gets one point of interest from existing systems (shrine, cache, landmark, occasionally a dungeon entrance) so sailing pays off.
- **Compatibility:** sections already explored keep their v1 terrain (same rule release 94 used); only never-generated sections use v2. Starting ring and settlements unchanged. Retain v1 generator.
- Reachability: generation must still guarantee every on-foot region leads back out without a boat (no island spawns of the player, checkpoints, story objects only reachable by sea before the boat hunt is done).

## Package B — The Boat (hunt + traversal)

Hunt **"The Tidewright's Keel"** (World Steward-triggered once a port has been seen, or after N water barriers):
1. Harbour master at the first port explains the drowned trade routes.
2. Gather parts: driftwood/keel timber from beaches, a sail from a coastal shack, a **Tide Compass** from a guardian in a coastal or river-verge dungeon.
3. Assemble at any port dock → grants `capabilities.sail` (new field, defaulted false; or a `vessel` object `{ owned, dockedAt }`).

Traversal:
- Board at a dock or by walking into shallows next to your moored boat; while sailing, `ocean` tiles are walkable for the player, land is blocked except shallows/beach/pier where you disembark. Boat follows you (moored where you leave it; recall at any port).
- Faster than walking on open water, no dodge roll, reduced combat (tool/spell only). Sea creatures: a small bounded set (reuse Strata Eel as a surfacing eel, a new Reef Serpent later) within existing active-actor caps.
- Drowning still applies if you jump off the boat into deep water without `swim`.
- Rivers: a boat can follow rivers that touch the sea (optional stretch; otherwise rivers stay barriers).

## Package C — Swimming and Diving (later package)

Hunt **"Breath of the Trench"**: a reef shrine on a far island; grants `capabilities.swim` (deep water no longer instantly lethal; stamina-drained swim, drown at 0) and then `capabilities.dive`.
- Dive at trench tiles → an **underwater area** built on the Underlands framework (`src/underlands.ts` layout grammars + a new "Sunken Canyon" environment): slower movement, oxygen meter, light falloff, kelp, sunken ruins, a guardian. Separate area like dungeons, so overworld performance budgets are untouched.

## Save / invariant checklist (for whichever card implements it)

- Save v14 → v15 migration adding `capabilities.sail` (or `vessel`) and hunt state; unknown fields preserved; migration + exact-resume tests (resume while sailing, boat position, mid-dive).
- New generation namespace; deterministic tests for same seed/coords → same sea, islands, ports.
- Proving Ground "Seas" lab in scratch state (sea section, port, boat granted, dive entrance) — never touches production journeys.
- Bounded sea actors; reduced-motion water animation; quality tiers for wave rendering.
- `docs/HERMES_PROJECT_FIELD_GUIDE.md` section and CHANGELOG entry per release.

## Suggested card order

1. A1: open-sea + island generation (v2 namespace), depth rendering, Proving Ground Seas lab. No new capability yet.
2. A2: ports (coverage lattice, dock tiles, harbour master).
3. B1: boat hunt + `sail` capability + save v15 migration.
4. B2: sailing movement, mooring/recall, sea creatures.
5. C: swim → dive → Sunken Canyon underwater areas.

## Open questions for the operator

- Boat as a single owned vessel that stays where moored, or summonable from any shore? (Proposal: moored, recall at ports.)
- Should combat be possible from the boat, or is sailing a safe travel mode?
- Should rivers become sailable once you have the boat?
- Should `swim` come before the boat (simpler first hunt) or after (boat first, as requested)?
