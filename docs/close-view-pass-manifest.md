# Close View development and publication manifest

Updated: 2026-11-07. This is the work record for the owner's Close View notes and subsequent independent refinement passes. Deployment authority remains the current conversation and `AGENTS.md`; this file does not grant publishing permission.

Verified live: `r810-8ed20b74216b`. Publish run `42388584029` succeeded; `gh-pages:release-identity.json` and the production Options → System label match the reviewed merge.

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
- [x] Dispatch the approved Publish candidate using the normal workflow approval path: run `42388584029`, candidate `r810-8ed20b74216b`. Artifact verification passed; deployment is in progress.
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

## Independent pass A — collision and traversal

Status: in progress after verified r810 publication. Working branch: `claude/close-view-collision-pass`.

Queued reproduction from the source audit: `generateBuildingFloor("AUDIT0", "building:AUDIT0:1:1:keep:4:f4", 3)` puts `building-stair-down` at blocked tile `(6,5)`, with arrival `(6,4)`. Adjacent Act remains in range. Investigate the visual/collision defect; a repair after v3 publication must preserve existing version pins and generator outputs or introduce a new generation version.

Read-only preparation reproduced actual collision and interaction: movement toward the ladder stops at `y=4.1152`, while adjacent `interact("descend", id)` succeeds to floor 3. A 600-map sample (50 seeds × three styles × four floors) found 269/450 down ladders on blocked tiles, with zero actionable objects lacking a reachable interaction approach. Only down ladders were affected. The connector helper advances before opening its starting cell. Regression targets: the down-ladder tile itself is open and walk-reachable on the new version, stair alignment stays valid, and all older version digests remain unchanged.

Hosted traversal-lab preparation also showed nearby enemies interrupting inspection, damaging the scratch player and sometimes returning it to the original floor entry. Make the new traversal-focused fixtures quiet/deterministic while keeping their real generated geometry and the separate combat scenarios intact.

- [ ] Check wall/corner sliding, diagonal movement, door widths and locked boundaries in old and new interiors.
- [ ] Check ramps in both directions, terrace edges, optional step/platform approaches, holes and grand-hall shafts.
- [ ] Check normal jumping, landing and indoor drone boost/fuel depletion against walls, roofs and arches.
- [ ] Check camera contraction/recovery, body/foot alignment and foreground occlusion while moving and orbiting.
- [ ] Capture reproducible findings; fix and test actionable defects in a focused PR.
- [ ] Complete review, CI, Preview and publication gates; record result below.

## Independent pass B — items, tools and weapons

Status: queued.

- [ ] Check pickups, nearby item interactions and action priority near walls, stairs and raised floors.
- [ ] Check melee hit/miss readability, targeting and reach against elevation and solid cover.
- [ ] Check representative ranged tools, ammunition/projectiles, casts and weapon/tool switching while moving.
- [ ] Check effect origins, impacts, floor height and occlusion; preserve authoritative hit and cooldown rules.
- [ ] Check attack-buffer interruptions, refused competing actions and pause/reload behavior.
- [ ] Fix reproducible defects, validate and publish the resulting focused candidate.

## Independent pass C — monsters and combat feel

Status: queued.

- [ ] Exercise representative humanoid, hound, brute, stalker, caster and flying encounters, plus Stillworks/Void cover cases.
- [ ] Check visible anticipation, strike/contact, recoil and recovery while creatures move, turn and encounter obstacles.
- [ ] Check attacks across slopes/terraces, wall and pillar collision, warnings and projectile placement.
- [ ] Check multi-enemy action readability and bounded actor/effect/pathfinding work at low and full quality.
- [ ] Fix reproducible defects with data-backed tuning where needed; review, validate and publish.

## Independent pass D — environments, interactions and recovery

Status: queued.

- [ ] Revisit keep, lived-in keep, hive, arcology, tomb/root-cellar, grand-hall and shaft scenes.
- [ ] Check doors, stairs/ladders, caches, relays and murals; exercise representative inventory/vendor interactions in the appropriate labs.
- [ ] Check normal character and intentionally active drone/armor state, including switching and arrival behavior.
- [ ] Check simultaneous movement/look/action ownership and responsive layouts; include reduced-motion and quality-tier variants.
- [ ] Check pause/background, save/reload, death/return and Proving Ground isolation after the earlier passes.
- [ ] Record device/performance evidence and limits; fix remaining actionable defects, then review and publish the final candidate.

## Per-pass completion record

| Pass | Findings / fix | Branch / PR | Tests and hosted evidence | Reviewed candidate / reviewer | Publish run and live identity | State |
|---|---|---|---|---|---|---|
| Current delivery | Animation, rooms/elevation/drone, controls and GPU terrain repair | #454–#458 | CI, Preview and hosted GPU repair checks passed | Astra, r805→r810 source: no blockers; merge-tree equality verified | `42388584029`, live `r810-8ed20b74216b`, System verified | Complete |
| A | Blocked down-ladder landing, reproducible across styles; quiet traversal fixtures | `claude/close-view-collision-pass` | 600-map read-only scan and actual scratch collision/Act reproduction | Pending | Pending | In progress |
| B | Pending | Pending | Pending | Pending | Pending | Queued |
| C | Pending | Pending | Pending | Pending | Pending | Queued |
| D | Pending | Pending | Pending | Pending | Pending | Queued |

## Resume protocol and pending inputs

Read current `AGENTS.md`, `docs/RELEASE_LOG.md` and this manifest, then fetch origin before editing. Inspect local changes and preserve operator work. Confirm the current live identity and the exact preview candidate before every Publish. Review everything changing since live using the currently authorized reviewer; if a reviewer cannot be run, ask Tim to arrange Claude's review. Mandatory workflow approval remains mandatory. Preparation and independent testing can continue while an approval is pending.

No product decisions are currently waiting on the owner. Physical-phone frame rate has not been measured. Hosted browser checks have observed a 714×668 viewport; automated camera tests also cover 390×844. Extreme low-arch jumps can require a centered close-up because the whole figure cannot physically fit the available camera space.
