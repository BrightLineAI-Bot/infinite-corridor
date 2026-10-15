# Water World — design for the remaining water-traversal components

Status: design proposal (2026-10-15), follows release 102 (Tidemantle surface swimming). Nothing here is built.
Scope source: Tim's brief of 2026-10-15 — boats, sea creatures, large oceans with islands, lakes, blue/swampy/poison waters, underwater grottoes.

## What exists today (release 102)

- `src/landscape.ts` (LANDSCAPE_VERSION 1): one `ocean` noise field at scale 1/150 tiles; tiles above 0.70 are lethal `ocean`, a thin band is `shallows`/`beach`. Sections are 32x32; a "coast" is a few sections at most. No lakes, swamps or islands as authored features (`addCauseways` only rescues objects stranded on water).
- `src/water-traversal.ts`: Tidemantle lets the player swim `river`/`dungeonWater`/`ocean` at x0.55 speed with stamina drain. `capabilities.dive` exists and is false.
- Enemies and pathfinding treat water as blocked; projectiles pass over it.
- Swimming 3 stamina/s caps a crossing at roughly 15-20 tiles. That is fine for rivers, too short for a real ocean. **This is why the boat is the next dependency.**

## Dependency order

```
Tidemantle (102, built)
  └─ W1 Waterbodies v2: ocean scale, islands, lakes, swamps, poison swamps   (generator version 2)
       └─ W2 Skiff: boarding, sailing, docks, boat state in save
            ├─ W3 Surface sea creatures (serpents, leapers) — need a boat to fight from
            ├─ W4 Leviathans: whales, mosasaurs, krakens — need open deep water
            └─ W5 Bathysal Lens + dive (design stage two) → W6 Underwater grottoes + Elder Wyrms (stage three)
```

Each W is one PR and one release bump. W1 and W2 are the critical path; W3-W6 can reorder.

## W1 — Waterbodies v2 (generation)

Gated on a new `LANDSCAPE_VERSION = 2`; sections already in the atlas keep v1 (existing pinning in `Game.loadArea`). Old v1 field code stays.

- **Oceans:** a second, very low-frequency field (`continent`, scale 1/900) multiplied with the existing 1/150 field. Result: most of the world stays land, but where `continent` is low there are seas spanning 20-60+ sections, with smaller seas and gulfs between. Data table `WATERBODIES.ocean = { scale, threshold, shelf }`.
- **Depth bands:** `shallows` (walkable) → `ocean` (swim/boat) → new `deepOcean` (boat only; swimming here drains x2 — the Tidemantle is a surface tool, not an open-sea tool). Depth is stored on the tile as `depth` 0-3 for rendering and for spawn rules.
- **Islands:** inside ocean, an island field (scale 1/40) above a threshold lifts land back: beach ring, interior biome from the normal fields (so desert islands, snow islands, alien islands happen naturally), plus one guaranteed **island landmark** per ~5x5 macrocell of sea (shrine, wreck, Wayglass) so an ocean is never empty. Atlas biome `isles`.
- **Lakes:** inland, small field (scale 1/45) on land only: 1-3 section lakes with shallows rims. Atlas biome `lake`.
- **Swamps:** new biome from a `wet` field where land is low and not desert. Tiles: `bogGround` (walkable, x0.85 speed), `mireWater` (shallow, walkable, x0.6 speed, no stamina regen), `swampWater` (swimmable), dead trees, reeds. Weather: mist.
- **Poison swamps:** a sub-band of swamp (higher `wet` value or near alien biome): `toxicMire` water applies the existing `poison` status per second while standing/swimming in it; Clearroot Ampoule grants immunity for its duration (existing consumable, new use). Green-violet palette.
- **Water palettes:** `blue` (ocean, lake), `swampy` (murky green-brown), `poison` (sickly green with bubbles), `deep` (navy, darker per depth). Data table, not literals.
- Constraints carried over: plaza ring, exits and settlements protected; `ensureReturnable` and causeways still guarantee every exit is reachable *on foot or by a dock* (see W2), never only by swimming.

## W2 — the Skiff (boats)

- **Getting it:** a **Shipwright** appears in coastal settlements and at island landmarks; a repaired skiff costs marks plus cinder iron. Requires the Tidemantle (story reason: you must be able to survive capsizing). Save: `save.boat = { version, owned, hull, dockedAt: {rx,ry,x,y} | null, upgrades: [] }`, additive at schema 14 via `ensureBoatState` in `freshSave`/`migrateSave`.
- **Docks:** generator places `dock` tiles on shallows next to ocean/lake in settlements and island landmarks (W1 v2 sections only). Boarding: interact on a dock or in shallows beside the moored boat. Disembark onto any walkable shore tile.
- **Sailing:** the player sprite becomes the boat; it moves only on `ocean`/`deepOcean`/`lake`/`swampWater` tiles (not `toxicMire`, not rivers in v1 of the boat — rivers keep bridges/swimming). Speed x1.4 of walking, momentum/turning so it feels like a boat, no stamina cost. Dodge becomes a short **oar burst**. Primary/secondary/spells work from the deck (combat from the boat is the point of W3/W4).
- **Hull HP:** separate `boat.hull` bar. At zero the boat sinks: player is in the water (Tidemantle swimming), the boat respawns at the last dock. Repairs at docks/shipwrights.
- **Persistence/exact resume:** boat position saved with `position.boat = true`; section transitions carry the boat across the border like the player.
- **Upgrades (later, data table):** reinforced hull, harpoon mount, lantern (reveals sea creatures under the surface), sail (speed).

## W3 — surface sea creatures

New `aquatic` movement layer: these enemies spawn and path only on water tiles (inverse of current land pathing), bounded by the existing active-actor caps. Movement patterns are data in `src/enemy-patterns.ts` style:

| Creature | Pattern | Threat |
| --- | --- | --- |
| **Lanceeel** (sea serpent, small) | `line` — surfaces, charges straight across, dives | contact damage, telegraphed wake line |
| **Ringcoil Serpent** | `orbit` — circles the boat at a fixed radius, tightening; bites when radius closes | rewards breaking the circle with an oar burst |
| **Sinewake Serpent** | `sine` — S-shaped weave toward you, segmented body (head + 6 trailing segments, only head vulnerable) | body segments block projectiles |
| **Breachfin** | `leap` — jumps out of the water in an arc over/at the boat, lands back in water; airborne window is the only hit window | lands on deck = hull damage |
| **Mire Leech swarm** (swamps) | short hops in swamp water; latches to the swimmer | ties to swamps/poison |
| **Bog Lurker** (swamps) | ambush from `mireWater`, drags the player one tile | swamp only |

Submerged creatures show only a ripple/shadow until they surface (readability: always telegraph before damage, mobile-first).

## W4 — leviathans (open/deep ocean world beasts)

Deep-ocean only, rare, one at a time per section, using the existing elite/world-beast contract architecture (`src/elites.ts`): stable ID, modules, threat cost, idempotent reward.

- **Greywhale** — huge, mostly passive; dives under the boat and surfaces, capsizing chance. Hunting is optional; it can be a calm landmark.
- **Tyrant Mosasaur** — fast pursuit predator; long lunge from below with a dark-shadow telegraph; boss-tier.
- **Krakens** (variants by data): *Reef Kraken* (tentacles rise from tiles around the boat, each a separate target), *Abyssal Kraken* (grabs and drags the boat toward its maw), *Stormkraken* (ink cloud = vision fog). Tentacles are bounded hazards with lifetimes, like existing ooze/trail modules.

## W5 — Bathysal Lens and diving (design stage two)

As already written in `design-decisions.md`: the Lens + dive rig set `capabilities.dive`; dive from boat or shore into marked **dive sites**; readable breath meter; air pockets. Underwater is a separate scene type (like a dungeon), not a layer over the overworld.

## W6 — underwater grottoes and Elder Wyrms (design stage three)

- Grotto dungeons built on the Underlands generator (new themes: *Drowned Chapel*, *Kelp Cathedral*, *Pearl Trench*, *Sunken Settlement*), with currents (tiles that push) and air pockets.
- Underwater beasts: **Elder Wyrm** (grotto final boss, long serpent body through the cave), **Abyssal Beast** variants, angler-style lure creatures. Beasts in deep ocean above a grotto can attack the boat from below (shadow telegraph, then strike).

## Rules every stage keeps

- Deterministic: same seed + coordinates + generation version = same water. New behaviour behind LANDSCAPE_VERSION 2 / new dungeon generator version; never regenerate explored journeys.
- Balance values in data tables (`WATERBODIES`, `BOAT`, `SEA_CREATURES`).
- Save additive at schema 14.
- Mobile: bounded creature counts, tentacles and segments; reduced-motion drops wave/bob animation.

## Open questions for Tim

1. Build order: W1 (oceans/islands/swamps) then W2 (Skiff) — or the boat first on today's smaller coasts?
2. Boat acquisition: buy from a Shipwright (proposed) or earn through a quest like the Tidemantle?
3. Should swimming deep ocean be possible at all (proposed: yes but twice the drain), or boat-only?
4. Poison swamps: damage over time (proposed) or a stronger "rot" that also lowers max HP until you rest?
