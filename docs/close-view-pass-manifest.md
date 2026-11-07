# Close View development and publication manifest

Updated: 2026-11-07. This is the work record for the owner's Close View notes and subsequent independent refinement passes. Deployment authority remains the current conversation and `AGENTS.md`; this file does not grant publishing permission.

Verified live: `r812-1f4b36dd0279`. Publish run `42394194802` succeeded; `gh-pages:release-identity.json` and the production Options → System label match the reviewed merge.

## Objective and sequence

Finish and publish the current animation, spacious-interior, elevation, drone and control-feel candidate. Then complete four independent passes below and publish validated fixes as they become ready. Each pass records evidence, changes, tests, review, preview identity and publication result. Keep PRs focused and choose each game release number from freshly fetched main + 1.

## Invariants

- Save schema stays 14, preserving unknown fields, exact resume, explored/pinned generation, one-time rewards and existing journeys.
- Building interior versions 1–2 and Pentagon versions 1–8 retain their historical generators. Preserve v3/v9 as well after their publication. New generation uses explicit version pins.
- Proving Ground uses isolated scratch state and its own storage/cache scope.
- Preserve bounded actors, shots, effects, pathfinding and geometry, all quality tiers, reduced motion and offline behavior. Record physical-phone measurement limits honestly.
- Movement touch belongs to the left joystick; camera gestures and action buttons retain distinct ownership.
- Preserve the r801 publication record and rows 797–801, `renderScaleForViewport(1280,800,3)`, `DECAL_FS` highp integer precision, and the documented 256-triangle per-actor cap.
- Leave `handoffs/` and operator work untouched. Change-Control stays disabled; preserve its historical metadata.
- Use the approved plain Git/GitHub commands. Stop blocked transports and report their exact safe error; use no network workarounds or credential transfers.

## Current delivery: releases 806–810

- [x] Restore Proving Ground's initial idle frame (r806, PR #454).
- [x] Walking, facing, sword cuts/recovery, successful casting, jumping and enemy windup/strike animation (r807, PR #455).
- [x] Versioned larger rooms, branching corridors/side cells, ramps, optional jump chains and indoor drone traversal (r808, PR #456).
- [x] Near-ready attack-button buffer and final-eye tight-space camera framing (r809, PR #457).
- [x] Find the real hosted heightfield rendering crash and add complete GPU-path regression coverage (r810, PR #458).
- [x] Build and release consistency for r810; 70 Close View tests, including all four new traversal fixtures through mocked WebGL2.
- [x] Fresh Astra source review of live r805 commit `9122ca315766a22cb090bd492d392c87066da373` through r810 source `bfe23725ff98b1e9e6091356694c8e340d5f4b5c`: no blocking issues found. Review covers only that named source candidate; coordinator must verify final candidate consistency.
- [x] Complete r810 CI and merge: PR #458, main `8ed20b74216b6137856641ea8a896328ff520f7f`. Its tree `04d7660377625a7c60fa05c32a09c53925259ce7` exactly matches the reviewed source tree.
- [x] Complete r810 Preview (`r810-8ed20b74216b`, run `42386790754`).
- [x] Verify real hosted GPU rendering for all four new traversal scenarios; walk the ramp in both directions, jump onto the first platform, engage indoor drone boost, and orbit/walk in the v9 Pentagon. No r810 console errors/warnings were captured. Legacy hive tight-camera centering/recovery was checked on the identical r809 camera code.
- [x] Save this versioned manifest/release-status record in the working branch; carry it into the first independent-pass PR. The first publication uses the already reviewed r810 source candidate.
- [x] Re-read live identity and exact successful preview candidate; report and resolve review/QA blockers. Live was r805; candidate/source tree matched the reviewed r810 merge exactly. No blocking findings remained.
- [x] Dispatch the approved Publish candidate using the normal workflow approval path: run `42388584029`, candidate `r810-8ed20b74216b`. Artifact verification and deployment both passed.
- [x] Verify workflow success, live identity and in-game System release label: all name `r810-8ed20b74216b`.
- [x] Record the verified publication in the release log and this ledger; rows 806–810 are marked published in r810. The record is carried by the first independent-pass branch.

### Artifact ledger

| Release | PR / source | Verified state |
|---|---|---|
| 805 | `r805-9122ca315766` | Last verified production identity before this delivery. |
| 806 | #454 / `r806-2ac648555b7a` | Preview completed. Included in subsequent candidates. |
| 807 | #455 / `r807-3228675c72d5` | Preview completed; hosted hive/arcology checks exercised animation and camera. |
| 808 | #456 / `r808-ca55b4cd807c` | Workflow completed; hosted terrain rendering exposed the undefined actor-index blocker. Superseded by repair in r810. |
| 809 | #457 / `r809-9bae1bce42e2` | Preview completed; camera centering checked on a legacy hive. Shares the terrain blocker repaired in r810. |
| 810 | #458 / `r810-8ed20b74216b` | Published and verified through workflow, live identity and in-game System label. |
| 811 | #459 / `r811-a0060f80fb7a` | Published; workflow, live identity, System label and all four quiet hosted traversal fixtures verified. |
| 812 | #460 / `r812-1f4b36dd0279` | Published; workflow, live identity and System label verified after CI, Preview, hosted checks and exact-source Astra review. |

## Independent pass A — collision and traversal

Status: complete and published in r811, PR #459.

Reproduced finding from the source audit: `generateBuildingFloor("AUDIT0", "building:AUDIT0:1:1:keep:4:f4", 3)` puts `building-stair-down` at blocked tile `(6,5)`, with arrival `(6,4)`. Adjacent Act remains in range. Investigate the visual/collision defect; a repair after v3 publication must preserve existing version pins and generator outputs or introduce a new generation version.

Read-only preparation reproduced actual collision and interaction: movement toward the ladder stops at `y=4.1152`, while adjacent `interact("descend", id)` succeeds to floor 3. A 600-map sample (50 seeds × three styles × four floors) found 269/450 down ladders on blocked tiles, with zero actionable objects lacking a reachable interaction approach. Only down ladders were affected. The connector helper advances before opening its starting cell. Regression targets: the down-ladder tile itself is open and walk-reachable on the new version, stair alignment stays valid, and all older version digests remain unchanged.

Hosted traversal-lab preparation also showed nearby enemies interrupting inspection, damaging the scratch player and sometimes returning it to the original floor entry. Make the new traversal-focused fixtures quiet/deterministic while keeping their real generated geometry and the separate combat scenarios intact.

- [x] Check wall/corner sliding, diagonal movement, door widths and locked boundaries in old and new interiors.
- [x] Check ramps in both directions, terrace edges, optional step/platform approaches, holes and grand-hall shafts.
- [x] Check normal jumping, landing and indoor drone boost/fuel depletion against walls, roofs and arches.
- [x] Check camera contraction/recovery, body/foot alignment and foreground occlusion while moving and orbiting.
- [x] Capture reproducible findings; fix and test actionable defects in a focused PR.
- [x] Complete review, CI, Preview and publication gates; record result below.

## Independent pass B — items, tools and weapons

Status: complete; no additional actionable defect found.

Automated/read-only preparation: 77 production-backed item/tool/weapon checks passed, including melee, seven tool profiles, casting success/refusal, moving charge, switching, impact origins, cover/elevation contracts, buffer cancellation and save round trips. No actionable defect found. Hosted checks and their limits are recorded below; no additional fix was needed.

- [x] Check pickups, nearby item interactions and action priority near walls, stairs and raised floors.
- [x] Check melee hit/miss readability, targeting and reach against elevation and solid cover.
- [x] Check representative ranged tools, ammunition/projectiles, casts and weapon/tool switching while moving.
- [x] Check effect origins, impacts, floor height and occlusion; preserve authoritative hit and cooldown rules.
- [x] Check attack-buffer interruptions, refused competing actions and pause/reload behavior.
- [x] Fix reproducible defects, validate and publish the resulting focused candidate.

## Independent pass C — monsters and combat feel

Status: complete; no additional actionable defect found.

Automated/read-only preparation: 129 focused combat/render/pause/resume/depth checks passed. Additional real-loop five-level cliff probes stopped grounded humanoid/hound/brute/stalker actors while preserving the flying-wisp exception. Windup/strike/recovery, obstacles, pillars, Void rend origin rejection, actor/effect caps, depth ordering and billboard/native exclusion were consistent. No actionable defect found. Hosted checks and their visibility limits are recorded below.

- [x] Exercise representative humanoid, hound, brute, stalker, caster and flying encounters, plus Stillworks/Void cover cases.
- [x] Check visible anticipation, strike/contact, recoil and recovery while creatures move, turn and encounter obstacles.
- [x] Check attacks across slopes/terraces, wall and pillar collision, warnings and projectile placement.
- [x] Check multi-enemy action readability and bounded actor/effect/pathfinding work at low and full quality.
- [x] Fix reproducible defects with data-backed tuning where needed; review, validate and publish.

## Independent pass D — environments, interactions and recovery

Status: complete and published in r812, PR #460; workflow, live identity and System label verified.

Automated/read-only preparation: 83 focused recovery, migration, drone, isolation, workflow/cache/module checks passed. One pre-existing forward-compatibility defect was found and fixed in r812: valid `session.playerRuntime.droneLift.zzLift` survives migration but is lost on `Game.exportSnapshot()`/restore, while peer unknown fields survive. Reproduction seed `PASS-D-UNKNOWN`, nested marker `{future:"kept"}`. The same behavior existed in r805. Preserve validated unknown lift keys through restore/export while overwriting canonical numeric and area/level identity fields; continue discarding invalid lift records. The separate focused repair followed pass A and retained the existing runtime-shape assertion.

- [x] Revisit keep, lived-in keep, hive, arcology, tomb/root-cellar, grand-hall and shaft scenes.
- [x] Check doors, stairs/ladders, caches, relays and murals; exercise representative inventory/vendor interactions in the appropriate labs.
- [x] Check normal character and intentionally active drone/armor state, including switching and arrival behavior.
- [x] Check simultaneous movement/look/action ownership and responsive layouts; include reduced-motion and quality-tier variants.
- [x] Check pause/background, save/reload, death/return and Proving Ground isolation after the earlier passes.
- [x] Record device/performance evidence and limits; fix remaining actionable defects, then review and publish the final candidate.

## Per-pass completion record

| Pass | Findings / fix | Branch / PR | Tests and hosted evidence | Reviewed candidate / reviewer | Publish run and live identity | State |
|---|---|---|---|---|---|---|
| Current delivery | Animation, rooms/elevation/drone, controls and GPU terrain repair | #454–#458 | CI, Preview and hosted GPU repair checks passed | Astra, r805→r810 source: no blockers; merge-tree equality verified | `42388584029`, live `r810-8ed20b74216b`, System verified | Complete |
| A | New v4 opens down-ladder arrivals; quiet traversal fixtures | #459 | Legacy digests, 600-map scan, actual movement/descent, complete CI/Preview and four hosted fixtures | Astra, exact reviewed/merge tree matched | `42393069055`, live `r811-a0060f80fb7a`, System verified | Complete |
| B | No actionable finding; no speculative tuning | Read-only pass | 77 production-backed checks; hosted hive/arcology inputs and scratch interaction approach | Covered by reviewed release sources; no new code | Included game baseline r810; no separate release needed | Complete |
| C | No actionable finding; no balance changes | Read-only pass | 129 checks, cliff probes and representative hosted encounters; visibility limits below | Covered by reviewed release sources; no new code | Included game baseline r810; no separate release needed | Complete |
| D | Preserve nested drone metadata and canonical runtime shape; correct lab control help | #460 | 83 audit checks, 40 repair regressions, complete CI/Preview, hosted boost/help/pause; limits below | Fresh Astra, r810→r812: no blockers; merge-tree equality verified | `42394194802`, live `r812-1f4b36dd0279`, System verified | Complete |

## Resume protocol and pending inputs

Read current `AGENTS.md`, `docs/RELEASE_LOG.md` and this manifest, then fetch origin before editing. Inspect local changes and preserve operator work. Confirm the current live identity and the exact preview candidate before every Publish. Review everything changing since live using the currently authorized reviewer; if a reviewer cannot be run, ask Tim to arrange Claude's review. Mandatory workflow approval remains mandatory. Preparation and independent testing can continue while an approval is pending.

No product decisions are currently waiting on the owner. Physical-phone frame rate has not been measured. Hosted browser checks have observed a 714×668 viewport; automated camera tests also cover 390×844. Extreme low-arch jumps can require a centered close-up because the whole figure cannot physically fit the available camera space.

## Additional pass evidence (2026-11-07)

- Pass A: real scratch movement on AUDIT0 upper floor stops at y=4.1152 in pinned v3 and reaches y=5.1136 in v4; descent succeeds in both. Fresh Astra review of source `cca3c6f48f8717ff4b5f7f98c5a4d51531920582`, tree `a988e1930fd7680faaf722fd9f55b01250f8f522`: no blockers; 45 reviewer checks passed. PR #459 runs CI.
- Pass B hosted r810: hive corridor walking/orbit, Attack and Tool, and arcology Spell A/B, Tool, Attack and Dodge inputs, wall stopping and corner traversal. Normal Wayfarer remained visible; walls and ceiling structure remained solid. No captured console warnings/errors. Short-lived poses/effects between screenshots are principally verified by automated render/action tests, not claimed as a physical-phone measurement.
- Pass C hosted r810: loaded humanoid, hound, brute, stalker, caster and flying-wisp fixtures in the hollow combat lab and used its near-combatant teleport. Observed brute circular anticipation and caster/wisp projectiles. Some grounded approaches were occluded by the legacy map; the 129 production-loop/render tests establish their windup/contact/recovery and obstacle contracts. This combat lab renders top-down; hive/arcology provide the hosted Close View checks. No captured console warnings/errors.
- Pass D repair: validated lift records retain unknown nested keys on restore/export; canonical numbers and current dungeon identity overwrite retained metadata. Outdoor and bound-dungeon round trips, peer canaries, invalid/stale rejection: 34 focused checks passed. No schema version, balance or rendering-budget change.

- Further hosted r810 environment sweep: cold keep, inhabited keep, Pentagon cellar maze, grand hall and shaft gallery; walked/orbited and checked the normal actor, solid walls, ceiling treatment, floor inlays and visible shaft edge. No captured console warnings/errors. Low-arch orbit can contract to a close-up, consistent with the documented physical framing limit. Scratch inventory fixture, vendor approach and Act were exercised without a production save; the lab does not expose the full normal-game vendor overlay, so stock/equipment results use the production-backed automated checks.
- Local r811 full suite: 2,767/2,772 initially passed; four source-text assertions were sensitive to Windows CRLF and passed after local LF normalization (30 + 6 focused tests). The remaining Windows-only pages-release path failure is pre-existing; Linux CI is the required complete-suite gate. No assertions were weakened for platform behavior.

- Pass D broad testing caught the established runtime-shape assertion: saved area/areaId/levelId are known binding fields, not future metadata. Restore now excludes those known bindings from the live lift while retaining unknown keys; export remains responsible for writing current bindings. All 40 focused tests (including existing interior pause/resume) pass without changing that assertion. The generic lab help was also corrected to describe left-joystick movement and scene-drag looking in Close View.
- r811 CI first attempt: 2,779/2,780 passed; the sole failure was the unchanged legacy tower-generation wall-clock ratio. The complete tower suite passed 10/10 in isolation (castle quarters v2 0.126 ms vs v3 0.147 ms); failed CI job was retried without changing any threshold.

- Pass A final hosted r811: all four traversal fixtures reported zero enemies and HP 60 after inspection. Ramp crossing/reversal ended at (3,16.72); the first platform jump reached (17,14.22); indoor drone boost rendered; current Pentagon walking/orbit rendered. No captured r811 console warnings/errors. A delayed-frame diagnostic tick was observed under browser automation, so these checks establish correctness rather than physical-phone FPS.
- r812 CI `42392084208` passed; PR #460 merged as `1f4b36dd0279de49f82e9c6b3f97a396db492079`. Merge tree `ee3397371ebebda42a97618c399b31e1680a6530` exactly matches fresh Astra-reviewed source `ec573a444a9bdf2794f6afb02343263d016054dd` (r810→r812: no blockers). Preview run `42393087255` is in progress.

- r811 publication complete: Publish `42393069055` succeeded, live identity and production Options → System both read `r811-a0060f80fb7a`; journey remained paused with 250 KB storage and no recent errors. r812 Preview remains in progress.

- Pass D hosted r812: candidate label `r812-1f4b36dd0279`, corrected joystick/look help, quiet indoor-drone fixture, boost rendering and pause verified; no captured console warnings/errors. Preview `42393087255` passed. Fresh live identity was r811; exact r812 preview commit/tree matched the Astra-reviewed source, whose full r810→r812 review covers every change since r811. Publish `42394194802` dispatched through the normal approval path.

## Completion methods and limits

Checked pass items combine the production-backed automated suites, generator probes, source reviews and representative hosted scenarios documented above. They do not assert that every possible actor/environment/input combination was manually played. Item/monster passes found no additional actionable defect and required no speculative balance changes. Unknown-field rejection and round trips are established by focused tests; the hosted lab does not expose arbitrary save-canary injection or the normal-game vendor overlay. Physical-phone FPS and real multi-touch hardware were not measured; existing automated phone-layout and pointer-ownership coverage remains required.

## Final closure

All four independent passes are complete. Actionable findings were fixed in focused PRs #459 and #460 and published as r811 then r812. The clean item/tool and monster passes required no speculative tuning or extra game release. Final Publish `42394194802`, live identity and production Options → System agree on `r812-1f4b36dd0279`; the journey remained paused, storage stayed 250 KB, and recent errors were none. Source commit `1f4b36dd0279de49f82e9c6b3f97a396db492079`, tree `ee3397371ebebda42a97618c399b31e1680a6530`. The release-log/context/manifest closure is documentation only and does not request another game release or publication. No owner decisions remain pending; device measurement limits above remain explicit. Temporary task QA servers were stopped.


## Additional approved mobile camera pass — 2026-11-07

The owner reports unreliable following and cramped-space navigation while liking the environment feel. Research, design inferences, work items and acceptance gates are tracked in [the mobile camera manifest](mobile-close-view-camera-manifest.md). Preserve prior assets, controls and generated/pinned interiors; no new release number is reserved. This pass is additional work, not a claim that the earlier feel pass covered the newly reported issue.
