# Verification Matrix

## Developer Proving Ground

Release 90 expands automated coverage to the laboratory registry, production-map construction for ordinary/deep/Threefold/combat scenarios, deterministic recipes, scratch-state isolation, URL-addressable state, and offline bundle inclusion.

The supported vertical slice is `?dev=proving-ground`. Automated checks verify that its six Shelter Gallery fixtures resolve to the intended production families, remain enterable, have validated approaches/interiors, use independent scratch saves, and do not import persistence. Browser checks must cover both normal boot and the developer route. Device-level touch, roof cutaway, and sustained frame pacing remain manual verification.

Verification is part of a work item, not a postscript. A passing deterministic test suite is evidence about the assertions it covers. It is not proof of all runtime behavior, device behavior, or product quality.

## Current automated commands

| Command | Current purpose | Notes |
| --- | --- | --- |
| `npm.cmd test` | Run the Node automated regression suite. | Covers deterministic generation, persistence and migration cases, combat, interactions, scenes, and selected rendering/input invariants. |
| `npm.cmd run build` | Produce the static offline PWA in `dist/`. | This is a build-output check, not an Android-install or service-worker proof. |

No dedicated lint, formatter, or static typecheck command is currently declared. Adding one is a separate proposal because it would change project tooling and potentially dependencies.

## Required gates by work type

| Work type | Required evidence |
| --- | --- |
| Documentation-only change | Inspect changed files and run `git diff --check`. |
| Behavioral change | Run the narrowest relevant automated test coverage. Add or update tests where the existing framework applies. |
| Deterministic generation, content-state, or simulation change | Run applicable deterministic tests and verify stable ordering, seeds, state transitions, and bounded behavior. |
| Persistence or save migration change | Run serialization, migration, backward-compatibility, and exact-resume coverage as applicable. |
| Release-candidate work | Run `npm.cmd test`, `npm.cmd run build`, inspect expected `dist/` output, and record the exact results. |
| Android/PWA/device work | Perform and record manual installation, offline airplane-mode, touch-control, resume, and device-performance checks. Do not infer them from automated tests. |

## Manual verification gaps

The README supplies Android installation and offline verification instructions. A work item may reference those instructions, but it must not claim they were performed unless it records the actual device, build, date, and observed result.

## Test-suite maintenance plan

`tests/prototype.test.ts` is currently a monolithic suite. Do not split it through a broad mechanical rewrite. Extract tests only when the affected subsystem is already changing, preserving behavior and running the full suite before and after extraction.

The intended future destination groups are:

- `tests/generation.test.ts` for world, dungeon, arena, and deterministic content generation;
- `tests/persistence.test.ts` for save serialization, slots, migrations, and resume state;
- `tests/combat.test.ts` for combat, enemies, hazards, items, and progression;
- `tests/interactions.test.ts` for interactables, narrative, consequences, and world-state transitions;
- `tests/rendering-input.test.ts` for renderer, HUD, layout, and input invariants;
- `tests/content-story.test.ts` for scenes, codex, foundry, Viewport, and story systems;
- `tests/integration-regression.test.ts` for cross-subsystem and release-regression scenarios.

Each extraction must preserve the full suite's assertions, avoid unrelated formatting changes, and leave the suite passing before and after the move.
