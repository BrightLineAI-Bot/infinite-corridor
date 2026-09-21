# Work Log

This log records implementation-level work that is too detailed for `CHANGELOG.md`. Every meaningful work item must update this file and, when user-visible or release-relevant, the changelog as part of the same change.

## Entry format

```md
## YYYY-MM-DD: Short work-item title

- **Scope:**
- **Baseline:** branch, commit, and relevant working-tree state.
- **Changed:** files and behavior.
- **Verification:** commands actually run and their actual result.
- **Open follow-ups:** risks, deferred checks, or manual validation gaps.
```

## 2026-09-20: Documentation and verification baseline

- **Scope:** Introduce minimal changelog, work-log, decision-record, verification, and test-maintenance governance without altering gameplay, source logic, tests, dependencies, save compatibility, or Change-Control configuration.
- **Baseline:** `main` at `14205c05ce4a16faacef27a6aa2eb5bfe222c8a1`; the working tree was clean before these documentation edits. Change-Control project ID: `8225aa1c-9d77-49ac-a8a9-f6b740f7d6f6`.
- **Confirmed source versions:** `SAVE_VERSION = 12`; `WORLD_GENERATION = 1`.
- **Changed:** `CHANGELOG.md`, this work log, decision-record guidance, verification guidance, test-suite maintenance guidance, and a narrow README link update.
- **Verification:** `npm.cmd test` passed 273 tests with 0 failures, 0 skips, and a reported duration of 124.86 seconds. `npm.cmd run build` completed successfully and reported `Built static offline PWA release 87 in dist/.`; `dist/index.html`, `dist/manifest.webmanifest`, `dist/sw.js`, and `dist/src/main.js` were present. `dist/` is ignored. Post-build Git and whitespace checks are recorded with this work item.
- **Open follow-ups:** Current Android installation, offline airplane-mode behavior, touch-control usability, and device-performance validation are not established by this record unless performed and recorded separately. Future work should not treat deterministic automated checks as proof of those manual behaviors.

## 2026-09-20: Pause-time invalid-position recovery

- **Scope:** Add a safety-only geometry recovery check at the transition into pause. It repairs an invalid player footprint in the current area without becoming a travel, dungeon-exit, death, or combat-escape mechanic.
- **Baseline:** `main` at `14205c05ce4a16faacef27a6aa2eb5bfe222c8a1`, with the existing unstaged documentation-governance changes preserved.
- **Changed:** `Game.setPaused` now invokes `Game.recoverPosition` only when entering pause. The method reuses `relocateIfStranded` and `footprintOpen` through the current map width, moves only an invalid player position, synchronizes the corrected coordinates, and reports recovery only when it occurred. Added regression coverage that verifies valid positions remain unchanged and that recovery preserves area, coordinates, enemies, projectiles, effects, inventory, health, stamina, and saved position.
- **Verification:** `npm.cmd test` passed 274 tests with 0 failures, 0 skips, and a reported duration of 138.55 seconds. `npm.cmd run build` completed successfully and reported `Built static offline PWA release 87 in dist/.` `git diff --check` and `git diff --cached --check` completed with no whitespace errors; Git emitted existing line-ending conversion warnings for `README.md`, `src/game.ts`, and `tests/prototype.test.ts`.
- **Open follow-ups:** Manual device validation should include pausing while deliberately placed in invalid dungeon and structure geometry. This automated coverage does not establish that every generated dungeon placement path is valid.
