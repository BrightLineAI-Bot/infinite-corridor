# The agent team

Tim, 2026-11-04: "come up with a series of sub agents... wired for a specific task or specific ranges of tasks... so that we can have reliable hands working on the systems that they are designed to work on... running in parallel."

The specialists live in `.claude/agents/`. Each one knows its systems, the design intent Tim has given for them, the house rules (AGENTS.md) and how to report. The coordinating session gives each a scoped task, runs several at once and turns their work into releases.

## The roster

| Agent | Systems | Typical tasks |
|---|---|---|
| `world-builder` | Overworld sections, landscapes, regions, far realms and domains, castles, Pentagons, keeps, settlements, sea, seasons, Atlas colours | New region types and map features; exits, bridges and cut-off pockets |
| `world-beasts` | World beasts, Questing Beast, Stalker, dragons, Astral Worm, Lightning Giant, Stag, Moth, Revenants, the Listener | New bosses and movesets; boss tuning; hunts, retreats, rewards |
| `monsters` | The monster pack, enemy AI, elites and affixes, haunts, Fractured mode, sea creatures | New creatures; spawns; creature drawing |
| `combat-balance` | Damage, reduction, regional threat, creature and beast vitals, spells vs Might, Aperture, gear power, statuses | Any tuning request, measured before and after |
| `spells-and-builds` | Spells, tool forms, presets, glyphs, echoes, constellation, Lattice, Tesseracts, marginalia, potions, meals | New spells and build pieces; caps and stacking |
| `player-actions` | Movement, dodge and stamina, jumping, gliding, swimming, diving, boats, robot and drone, sling, building, digging, death and respawn | Movement feel; stuck states; statuses across death, pause and reload |
| `dungeons` | Dungeons, the Deep, annexes, labyrinths, arenas, craters, traps, the Foundry, the Rite, building and castle floors | New dungeon kinds; solvability; the Depths |
| `travel-and-teleport` | Wayglasses and checkpoints, section crossings, the Transit Lattice, relays, Skylands, the Far Array, far gates, the compass | Arrival safety; crossings; travel and respawn rules |
| `story-and-lore` | Threads, lore, Glimpses, the Reciter, Bells, Surveyor, pages, margins, Ilse, elders, the Journal and Tome | The daily narrative pass; story coherence with the narrative bible |
| `saves-and-persistence` | Save shape and migrations, IndexedDB and the mirror, recovery, import/export, exact resume, save size | Anything that could lose a journey; save growth |
| `performance` | Rendering and sprite caches, load hitches, autosave cost, GC churn, soaks | "It's slow" or "make it cheaper" |
| `ui-and-hud` | HUD, touch controls, menus, the Atlas, banners, accessibility | Interface changes, checked in a browser at phone size |
| `qa-fuzzer` (read-only) | The whole game, driven headlessly | Crash, softlock and break-point sweeps before and after big changes |
| `release-reviewer` (read-only) | The diff from the live release | The blocker-only review before every publish (on the Fable model) |

## How work runs

1. The coordinator splits a request into scoped tasks, one per specialist, and starts them together, each in its own worktree.
2. Each specialist builds and tests, commits in its worktree and reports (changes, tests, numbers, suggested release notes). Specialists never push, merge, bump the release or publish.
3. The coordinator takes finished work one at a time: claims the next release number (the baton with the other sessions), merges it onto `main`'s latest, bumps the release, writes the CHANGELOG, field guide and release log, runs the tests and build, opens the PR and merges it when CI is green, then sends Tim the preview link.
4. Before a publish, `release-reviewer` checks the diff from the live release; `qa-fuzzer` sweeps after large batches.

Specialists that touch the same file (most often `src/game.ts`) are merged one after another, and the later one is rebased onto the earlier by the coordinator.
