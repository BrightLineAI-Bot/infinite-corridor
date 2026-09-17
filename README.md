# Infinite Corridor

An original, offline-first, single-player mobile adventure game for Android. The player carries one persistent character through procedurally generated realms, ruins, settlements, dungeons, and difficult encounters.

This repository currently contains the **Prototype 1 staging package** for Codex. It intentionally does not contain playable code yet.

## Product intent

- Quiet, exploratory action RPG rather than a frantic enemy-density game.
- Persistent world and character, not disposable roguelike runs.
- Installable Android PWA that remains playable with no data connection.
- Mobile controls that support deliberate play: movement, primary attack, dodge, jump, and contextual interaction.
- Science-fantasy multiverse with sparse NPCs, magic and technology, original lore, and an “infinite corridor” structure.

## Files

- `docs/prototype-1-spec.md` — product requirements, content boundaries, technical architecture, and acceptance criteria.
- `docs/codex-prototype-1-work-card.md` — bounded Codex implementation instruction.
- `docs/design-decisions.md` — decisions preserved from Tim’s concept discussion and explicitly deferred scope.

## Intended development sequence

1. Codex implements the Prototype 1 vertical slice from the work card.
2. Test it on an Android phone as an installed PWA and validate the play loop.
3. Only if the loop works, add more realms, item/ability depth, offline narrative content packs, and optional encrypted backup/sync.

## IP boundary

The game may take high-level genre lessons from isometric action RPGs and difficult exploratory games, but it must use wholly original names, lore, enemies, visual assets, maps, interfaces, narrative, and mechanics expression. It must not reproduce content from Diablo, Elden Ring, Dark Souls, Bloodborne, Remnant, Magic: The Gathering, or Gene Wolfe’s Solar Cycle.
