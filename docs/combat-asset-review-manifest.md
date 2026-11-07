# Combat asset and interaction review

Started 2026-11-07. Baseline main `37f20ae33a3fea095df4641347273a3e7b2614e4`; verified prior production `r812-1f4b36dd0279`. Re-read the actual live identity before any publication. This record grants no deployment authority.

## Objective

Review the actual visual assets and their gameplay bindings for player melee/tools/spells and monster melee/ranged attacks. Check camera, pacing and movement during combat. Improve coherent anticipation, contact and recovery within the existing art style and phone budgets; use the named action games as pacing references, not a claim of equivalent fidelity.

## Passes

- [ ] Player melee and tools: equipped silhouette, attack facing, contact/miss, charge/release, projectiles and impacts while stationary/moving.
- [ ] Spells: accepted/refused casts, origins, airborne/raised-floor alignment, palette and warning/effect readability, repeated effects and low/reduced-motion presentation.
- [ ] Monster attacks: ordinary, pattern, pack and special melee/ranged producers; windup, real strike, recoil/recovery, solid-cover and elevation interaction.
- [ ] Integrated feel: camera orbit/contraction/recovery, lock targeting, movement/dodge/action ownership, multi-actor readability and bounded work.
- [ ] Resolve reproducible findings, run relevant checks/build/release consistency, exact-source review, focused PRs and hosted Preview verification; record exact identities and limits.

## Invariants

Schema 14 and unknown fields/exact resume stay compatible. Preserve explored generation pins, Proving Ground scratch isolation, authoritative hit/cooldown rules, bounded actors/effects/geometry/pathfinding, quality tiers and reduced motion. Keep Change-Control disabled and `handoffs/` untouched. Choose release numbers from freshly fetched main at merge time. Tim approved focused regression tests for this review in the current conversation. Existing compatibility and hit-rule assertions remain intact.

## Findings and evidence

- Resolved in r813: ordinary native monsters now consume their existing strike countdown at contact instead of snapping from windup to idle. Actual producer tests and hosted scratch checks cover the repaired route.
- Hosted baseline review uses the immutable r812 documentation preview, with isolated scratch state. Physical-phone FPS and hardware multi-touch are not available in this environment.

## Release ledger

First focused candidate: r813 on `claude/combat-asset-cohesion`, chosen after fetching main at r812. Review source/tree and recheck main before merge.

## Expanded creature model scope

Tim additionally requested 3D assets, convincing movement/windup/attacks for every creature that can appear in Close View, and a less boxy Wayfarer. Preserve the current native-action/gallery work. An exhaustive source-derived roster and grouped implementation plan is being prepared; do not treat placeholder or generic box replacements as completion. Keep distinctive silhouettes, authored attack cues and the existing phone budgets.

## Current findings and implementation

- Ordinary native monsters now use their real strike countdown and committed direction. Crawler bite/landing recovery and flight progress use authored phase durations; native hopLift is applied without double-shifting the existing sprite artwork. Real ordinary/pack producer, mid-phase timing and native/sprite lift regressions pass (34 focused CV checks).
- Eleven gallery scenarios cover standard/special tools, eight spells, native melee/pack/caster/flying foes, clear deterministic positioning and exact gallery-start teleport. Actual action artifact checks and geometry/isolation checks pass (50 focused checks). Forge display metadata now agrees with the upgraded Blunderbuss resolver and is accurately labelled Awakening-ready.
- Subsequent presentation pass: preserve native stun/poison/fire cues and stamp accepted tool action metadata tied to the existing attack clock, avoiding stale sword poses without changing meleeUntil or lastAim. Implemented in r814: existing accepted producers stamp presentation-only data; focused resume/tool regressions pass.
- Baseline hosted arcology: default tool/cast/movement inputs and solid scene rendered without captured console errors; long-running background automation produced delayed-frame diagnostics, so this is not physical-phone performance evidence.

- r813 build and release-consistency pass. The combined new gallery/monster regressions and release check pass 8/8. Full local suite had only the known Windows pages-release fixture failure; complete Linux CI passed before merge.

- r813 PR #462 merged after complete CI passed at source c69a462ae2cba6808896e83a121cb43d69a00107 (tree79ea0fe08e578e19632a1e400013579479d0d739). Fresh Astra full/delta reviews found no blockers; merge dbbd7b6c6a51009fd78ce4ee94a9afd7d07c3c02 has the same tree. Preview42406824433 succeeded. Publish42408237197 succeeded, live identity names r813-dbbd7b6c6a51, and hosted scratch combat renders without current client errors; Options → System verification is pending browser-control recovery. Initial CI failure was only the old lab-count assertion; it now asserts20 and explicitly includes Combat Asset Lab while retaining all fixture/scratch checks.
- Native player contract source is implemented separately: accepted attacks latch validated profile/duration/actual aim against the existing attack clock; unknown fields, old saves and pause/split-save resume are preserved. Stun/poison/fire remain native, distinct tool gestures use bounded meshes, and initial tapered limbs soften the Wayfarer. Fifty targeted checks and build passed; local2789/2790 had only the known Windows fixture failure. CI42407875425 passed; PR #463 merged as2bbee6cc627a60f4048780833f96e0ce0f7d6ad0 with the reviewed tree. Preview42408769197 is running. No damage, melee observation, lastAim or cooldown rule was changed.
- The exhaustive creature roster and rollout gates live in [creature-asset-manifest.md](creature-asset-manifest.md). The first five Arcology/Hive bodies and rounded hood/coat/limbs are implemented on this branch; full tests and source review are underway. Fifteen further creatures, six legacy silhouette refinements and six Foundry morphologies remain on following branches, with hosted completion gates pending.
