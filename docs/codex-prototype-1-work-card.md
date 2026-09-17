# Codex Work Card — Build Infinite Corridor Prototype 1

## Role

You are the primary implementation agent. Build a playable vertical-slice PWA in this repository.

## Authoritative requirements

Read these files before changing code:

1. `README.md`
2. `docs/design-decisions.md`
3. `docs/prototype-1-spec.md`

The specification controls. If a detail is not specified, choose the smallest maintainable implementation that advances the offline Android prototype.

## Deliverable

Implement **Prototype 1** as an installable, offline-first, single-player Android PWA. It must be a working playable game—not a mockup, design document, or bare screen.

Use TypeScript. Prefer Vite + a lightweight canvas/game-rendering approach that is appropriate for a compact mobile web application. You may use a small established package where it materially reduces implementation risk, but keep dependencies modest.

## Build order

1. Create the TypeScript/PWA project structure and make it run locally.
2. Implement deterministic seeded region and dungeon generation.
3. Implement persistent, versioned local save/load using IndexedDB.
4. Implement responsive touch controls plus desktop keyboard fallback.
5. Implement the core player loop: movement, readable real-time combat, health/stamina, attack, dodge, jump, death/recovery.
6. Add world entities, roaming enemies, dungeon entrance/interior, contextual interactions, and a small hub.
7. Add lightweight equipment, drops, upgrades, levels/stats, and the rare world boss.
8. Add automated tests required by the specification.
9. Build, run tests, and document actual Android installation/offline verification steps in the README.

## Product boundaries

- This is original science-fantasy fiction. Do not copy any existing game’s names, enemy designs, mechanics expression, UI, maps, lore, visual assets, dialogue, or music.
- Do not use assets, text, characters, or setting material from Diablo, Elden Ring, Dark Souls, Bloodborne, Remnant, Magic: The Gathering, or Gene Wolfe’s Solar Cycle.
- Do not introduce accounts, telemetry, ads, monetization, social features, multiplayer, a backend, or live AI calls.
- Do not replace required systems with a static mockup or pseudo-interactive wireframe.
- Keep the prototype intentionally small enough to finish. Full isometric rendering is optional; a clear original top-down view is acceptable.

## Quality bar

- Keep simulation/game state separate from UI/rendering.
- Use typed data structures and modules for world generation, combat, persistence, input, interactables, and items.
- Each visible interaction must have a working underlying state transition.
- Prefer explicit failure/error handling over silent fallback behavior.
- Keep mobile input calm and readable; do not require frantic tapping.
- Keep progress persistent across app reloads.

## Verification before finishing

Run and report:

```bash
npm run build
npm test
```

If you add another essential validation command, document and run it. Fix errors rather than merely reporting them.

In your final response, give:

1. a compact file/change summary;
2. commands actually run and their results;
3. known limitations against the spec;
4. exact steps to install and test the PWA on Android, including airplane-mode verification.
