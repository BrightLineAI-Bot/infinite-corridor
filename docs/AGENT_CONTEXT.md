# Agent context — current state

For a fresh agent picking up Infinite Corridor. Workflow, commands and the release checklist are in `AGENTS.md`; code-level detail per release is in `docs/HERMES_PROJECT_FIELD_GUIDE.md` (the release sections at the top). Last updated 2026-10-14.

## Where things stand

Release 101 is live; release 102 (Tidemantle surface swimming) is merged and in preview; release 103 (Waterbodies: seas, isles, lakes, swamps and blight mires, landscape version 2; W1 of `docs/water-world-design.md`) follows it; release 104 (the Skiff: docks, Shipwright, sailing, hull; `src/boats.ts`, landscape version 3; W2) follows that; release 105 (surface sea creatures, `src/sea-creatures.ts`; W3) follows; release 106 (leviathans: Greywhale, Tyrant Mosasaur, three krakens; W4) follows; release 107 (diving: Bathysal Lens, dive rig, dive buoys, the Sunken Reach with breath and air pockets; `src/diving.ts`; W5) follows; release 108 (underwater grottoes: four themes, currents, grotto beasts, the Elder Wyrm; dive generator 2 in `src/grottoes.ts`; W6) completes the water plan. Release 101: (lethal falls, drowning, ramps, Jump in the action diamond, visible Leech). Release 102 (Tidemantle surface swimming, `src/water-traversal.ts`) is in review. Save schema is 14; every later system is additive state normalised in `freshSave`/`migrateSave`. Test floor: 443 passing.

## Systems

- **Underlands (dungeon generator 5, release 96)** — `src/underlands.ts`. Six layout grammars (spine, hub, ring, cavern, crypt, descent); about 45% of crossings get a themed environment (Sunless Chasm, Lava Bog, Underground River, Frozen Grotto, Bone Crypt, Fungal Hollow) with elevation, lethal terrain and weather. Applies only to histories without a pinned `generatorVersion`; v2/3/4 histories keep their generators.
- **Relay network (release 96)** — `src/relay-network.ts`. About 35% of never-entered ordinary crossings pin a relay node near the guardian. After the guardian falls the player restores it (restorative draught) or severs it (two lumen dust); each answer journals the next draft fragment. At 5 answers the network records `save.relayNetwork.coordinate` off the charted map. Nothing is generated at the coordinate.
- **Landscape (releases 94, 97, 101)** — `src/landscape.ts`, `src/landscape-render.ts`. Noise-driven biomes and elevation 0–5 on overworld sections (adoption pinned per atlas entry via `landscapeVersion`). Level marks and traversal cues show heights; `ensureReturnable` removes trap pockets; release 101 adds walkable ramps between one-level steps (`addRamps`). Falls of 4+ levels, pits/chasms, lava, rivers and deep ocean water kill; shallows are walkable.
- **Monster pack and grotesques (releases 92, 96)** — `src/monster-pack.ts`. Creatures are compositions of body, movement mode, brain, attack modules and stats. Grotesques (Weeping Saint, Amalgam, Hanged Choir, Gnawing Maw; Sunderjaw) are dungeon-only.
- **Glyphs & Resonances (release 98)** — `src/glyphs.ts`. Ten glyphs socketed into primary, tool and spell hosts; eight two-glyph Resonances. Drops, salvage dust, crafting.
- **Creature Echoes (release 99)** — `src/echoes.ts`. One Echo per pack creature, three notches; Echoes add triggered moves on dodge/land/kill/hurt/spell/shot.
- **Aperture Constellation (release 100)** — `src/constellation.ts`. Five branches (Form, Motion, Veil, Force, Rift) with ranks, a modifier and a choice of two capstones; one point per 6 Aperture. Respec only at shrines (Attune) for lumen dust.
- **Awakenings (release 100)** — at Sela's forge, a max-rank weapon holding a Resonance can be Awakened for 6 lumen dust (crescent every third swing; tools fan shots into three).
- **Proving Ground** — `proving-ground/` plus `src/proving-ground*.ts`. Isolated scratch-state labs: ordinary/deep/threefold dungeons, Underlands & Relay, Landscape, Glyph Forge, combat arena, hunts/domains, inventory, magic/Aperture, performance, save/death/recovery, scenes, records, shelters, with scenarios such as Sandbox (every glyph), Echoes (all owned), Constellation + Awakening, and Relay node. Never touches production journeys.

## Tim's standing decisions

- Dungeon and corridor lore stays ambiguous: the dungeons are real places beneath the corridor, and also possibly elsewhere — an infinity of infinities. Do not resolve it.
- The relay story fragments (`FRAGMENTS`) are drafts Tim will rewrite. The relay coordinate's destination is undecided: do not build it.
- Falls of 4+ levels, pits and deep water are lethal on purpose. Release 101 removed the edge guard; do not add it back.
- Respec happens only at shrines, for lumen dust.
- Echoes add moves; they never replace dodge or jump. The 5 stat points stay.
- Tim says "push" to publish. Cloud sessions merge their own PRs; his PC previews each merge and comments the link on the PR. A cloud session answers "push" with that preview link and candidate id and tells Tim to approve the Test Bot card in Discord. Cloud sessions never publish.

## Open ideas and known gaps

- Some landmarks are look-only and unreachable; they should become reachable or read clearly as scenery.
- Balance (monster pack, glyphs, echoes, constellation, Leech, lethal terrain) is checked in tests and simulation only, untested on device.
- Elevation does not yet affect attacks, projectiles or line of sight.
- The relay coordinate's destination (blocked on Tim's decision above).
