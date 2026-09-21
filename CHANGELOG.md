# Changelog

This file records user-visible and release-relevant changes. It is not a substitute for the implementation-level [work log](docs/work-log.md) or decision records.

The project follows a compact Keep a Changelog-style structure. Entries describe verified scope and do not imply manual device validation unless that validation is recorded explicitly.

## [Unreleased]

### Changed

- Pausing now validates the Wayfarer's full collision footprint and, only when it is invalid, relocates the Wayfarer to deterministic nearby stable ground in the current area without resetting journey progress.

## [2026-09-20] Documentation and verification baseline

### Added

- Change-management, verification, work-log, decision-record, and test-suite maintenance documentation.
- A dated repository baseline for `main` at `14205c05ce4a16faacef27a6aa2eb5bfe222c8a1`.

### Notes

- This entry records project-maintenance documentation only. It does not claim Android installation, airplane-mode, touch-control, or device-performance validation.

## Retrospective history, 2026-09-20

The following summaries reconcile recent Git history into project records. They are retrospective descriptions rather than release records. Their scope is supported by commit subjects and diffs inspected during the baseline audit. No commit-specific Android or manual device validation was reconstructed.

### Dungeon encounters and difficulty

- **Subsystems:** dungeon generation, deep-dungeon generation, combat simulation, regression tests.
- **Intent:** added deterministic dungeon encounter populations, ecology profiles, bounded active-enemy simulation, and role-based combat tuning.
- **Compatibility:** encounter state is represented in runtime snapshots; no save-schema version change was identified in the inspected commit.
- **Verification evidence:** current baseline automated tests cover deterministic population, caps, reachability, and combat activation. Build and device validation were not reconstructed for this historical batch.

### Shelter entrances and roof cutaways

- **Subsystems:** overworld structures, collision/occupancy, renderer, regression tests.
- **Intent:** corrected shelter entrances and roof-cutaway behavior so exterior approach, thresholds, and interiors remain readable and traversable.
- **Compatibility:** no save-schema change is recorded in the inspected history.
- **Verification evidence:** the current suite includes shelter-approach, occupancy, cutaway, and doorway coverage. No historical device-validation claim is made.

### Arena and narrative-scene integration

- **Subsystems:** arena generation, scene state, story progression, rendering, tests.
- **Intent:** integrated deterministic arenas and bounded narrative scenes into persistent exploration.
- **Compatibility:** scene state is persisted; the precise migration implications of this historical batch were not reconstructed here.
- **Verification evidence:** current tests cover arena lifecycle and scene idempotence. No historical build or device result is asserted.

### Overworld mobile-performance work

- **Subsystems:** overworld simulation, rendering, input presentation, diagnostics, tests.
- **Intent:** reduced unnecessary overworld work through culling, bounded caches, dormant actors, and presentation tiers.
- **Compatibility:** no save-schema change is recorded in the inspected history.
- **Verification evidence:** current tests cover performance-oriented invariants. They do not establish device-frame-rate results.

### Cinematic scenes, arenas, and death markers

- **Subsystems:** scenes, arena presentation, death-state capture, persistence, tests.
- **Intent:** added bounded scene presentation, arena variety, and persistent last-death records.
- **Compatibility:** persisted state is involved; current migration coverage exists, but this entry does not reconstruct a batch-specific migration decision.
- **Verification evidence:** current tests cover scene recovery and last-death independence. Manual runtime validation is unverified.

### Geometry traversal and dungeon-state stabilization

- **Subsystems:** movement geometry, dungeon traversal, snapshots, persistence, tests.
- **Intent:** stabilized collision, traversal paths, dungeon transitions, and exact state restoration.
- **Compatibility:** persistent dungeon snapshots are involved; no new save-schema version was identified from the recent commit subjects alone.
- **Verification evidence:** current tests cover traversal, snapshots, exits, and resume behavior. No device validation is asserted.

### Viewport hunts, domains, and hunt instances

- **Subsystems:** foundry/Viewport state, hunt instances, domain topology, persistence, tests.
- **Intent:** added deterministic, bounded hunt and domain systems with explicit instance lifecycle behavior.
- **Compatibility:** persisted Viewport state and migration coverage exist in the current suite.
- **Verification evidence:** current tests cover hunt lifecycle, domain topology, and migration initialization. No historical Android validation is asserted.
