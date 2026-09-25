# Verification Matrix

## Journey management and menu controls

New-journey coverage must prove that a free slot receives an independent schema-14 save; the prior active save is flushed only when it exists in another or occupied target slot; active-slot mutation follows successful creation; failed creation never changes the active slot; rapid taps are single-flight; cancel is mutation-free; occupied replacement is explicitly confirmed; and Proving Ground never imports journey persistence.

Browser validation must use a clean local origin to avoid an older installed service worker masking current source bytes. Required smoke coverage includes normal-module startup, New Journey form/cancel/create/reload, active-slot identity, every Options category, every Journal tab, Pack filters, Atlas/manual waypoint actions, pause/resume, core constellation controls, a mobile viewport, and the isolated Proving Ground. Source-handler presence alone is insufficient evidence.

Verified 2026-09-24: 308/308 automated tests passed, the Release 91 offline build succeeded, `git diff --check` reported no whitespace errors, and the required clean-origin desktop/mobile browser audit passed without console errors.

## Progression and combat extension

Save-schema coverage must preserve legacy equipment power while normalizing upgrade rank/base power, learned Aperture disciplines, selected discipline, active remaining duration, cooldowns, and last safe traversal ground. Equipment checks must cover exact sphere costs, tier caps, insufficient materials, empty slots, every vendor comparison direction, and the no-sphere-refund salvage rule.

Combat coverage must prove stable pattern assignment, bounded pattern counts, exact telegraph/damage geometry, post-telegraph range rechecks, wall-safe committed movement, multi-stage recovery, and deterministic Proving Ground construction. Aperture coverage must prove threshold gating, explicit activation, band transitions, safe Aerial Step expiration, and no reset of ordinary world or dungeon progress.

The isolated focused progression run passed 5/5 and the release build completed. The full isolated suite reached 302 passing application assertions; after correcting the one equipment-upgrade defect, its focused regression passed. The development-server test could not spawn a child process in the restricted validation workspace (`EPERM`) and must be rerun in the canonical repository after guarded apply.

## Wayglass network and complete Proving Ground lattice

The pre-change deterministic `WAYGLASS-AUDIT` corpus contained 346 Wayglasses in 14,640 non-origin sections (2.36%), 7,645 rest points (52.22%), and an observed inner-corpus Chebyshev drought of eight sections. The corrected corpus contains 919 Wayglasses (6.28%), 7,323 rest points (50.02%), and a maximum observed drought of four sections. The fixed five-by-five macrocell lattice is seed-stable; its anchor is promoted only when the section's ordinary landmark is generated, preserving sparse presentation while bounding long travel droughts.

Automated coverage must verify distinct checkpoint/shrine/observatory semantics, Wayglass-only fast travel, rest-point respawn without checkpoint registration, deterministic lattice anchors, save reconstruction and legacy migration, independent manual and quest/hunt compass state, and deterministic drought reporting. It must also instantiate at least one scenario from all fourteen registered laboratories and prove scratch-state reporting. Browser and physical-device interaction remain manual checks after guarded apply.

## Unified dungeon exploration

Normal discovery reveals exactly the occupied dungeon card; cardinally adjacent cards remain concealed until crossed. Recovery coverage must prove the generated entrance accepts the full player footprint, and Proving Ground coverage must retain the production world-tap targeting path.

Release 91 adds deterministic contract coverage for legacy ordinary v2, varied ordinary v3, unified ordinary v4, deep-v1, every deep-v2 archetype, multi-level deep maps, and bounded arenas. Required evidence includes topology determinism, distinct supported variants, critical-route reachability, safe placements, generator-version compatibility, schema-12-to-14 migration, bounded chunk discovery, Atlas/render concealment, scratch-only Proving Ground controls, full tests, build, and runtime browser state that cannot come from static HTML.

Physical-phone frame pacing, installed-PWA offline refresh, and long-form completion of every generated variant remain manual checks.

The Release 91 isolated proposal passed the complete Node suite (289/289), the release build, and local browser startup for both normal play and the ordinary-dungeon Proving Ground. This establishes the covered deterministic, migration, concealment, and startup invariants; it does not replace the manual checks above.

## Developer Proving Ground

Release 90 introduced automated coverage for the laboratory registry, production-map construction for ordinary/deep/Threefold/combat scenarios, deterministic recipes, scratch-state isolation, URL-addressable state, and offline bundle inclusion. The current development tree extends that registry to fourteen laboratories, including direct Aperture discipline and progression fixtures.

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
# Dungeon hazard and concealment verification (2026-09-24)

- Deterministic corpus checks compare repeated ordinary-dungeon hazard layouts, require both trap families across recipes, enforce traversable placement, and verify protected entry/objective/boss clearances for generated hazards.
- Cardinal-direction tests exercise all four Kiln Vent directions plus variable warning, active, recovery, and damage values.
- Source-level concealment checks cover enemy telegraphs, trap overlays, and projectiles while explicitly preserving the design rule that unrevealed enemies may roam into visible cards.
- Proving Ground diagnostics now list hazard identity, type, position, direction, warning duration, and damage.

# Ordinary dungeon visual-identity verification (2026-09-24)

- Generation-3 and generation-4 corpus checks require each ordinary recipe to emit its own wall and floor tile kinds and diagnostic identity.
- Renderer-source checks require dedicated drawing branches for all six material kinds rather than accepting palette aliases.
- These checks do not alter or weaken the existing traversal, discovery, encounter, or hazard assertions.
- Hollow Relay contrast coverage pins the brighter blue-gray floor palette, near-black wall palette, and recessed wall-panel treatment so future palette edits cannot silently collapse their visual separation.

# Dungeon terrain-hazard verification (2026-09-24)

- A deterministic 200-map Hollow/Kiln corpus requires both hazard-bearing and clear layouts, visible blocked terrain metadata, accurate diagnostics, and continued reachability of every object and enemy spawn.
- Cistern coverage requires authored dungeon water with river environment metadata.
- The existing grounded-center death test now exercises overworld river, dungeon water, and canyon at multiple frame rates; edge overlap remains safe until the grounded center actually enters the hazard.
