# Close View development and publication manifest

Updated: 2026-11-08. This is the work record for the owner's Close View notes and subsequent independent refinement passes. Deployment authority remains the current conversation and `AGENTS.md`; this file does not grant publishing permission.

Verified live: `r829-9c21fb237fe9`. Source CI42479713134, merged CI42480707039, Preview42480707081 and Publish42482179727 succeeded. Fresh Astra review (828→829): no blockers; live identity and actual Options → System match after normal update, no recent errors. Earlier delivered character/camera/primary work remains; r833 is merged and previewed; exact hosted motion/colors and publication remain pending.

## Single ordered build queue — owner instruction

**This is the authoritative integration and release order.** Linked manifests hold detail and evidence; they are not competing schedules. The owner's latest instruction (2026-11-08) explicitly authorizes parallel specialist implementation, superseding the earlier one-implementation-at-a-time instruction. Independent candidates use isolated worktrees and bounded ownership; one coordinator integrates, reviews and releases them in the queue order below. New notes go into their stage without redirecting an assigned specialist or dropping earlier requirements. Reprioritize integration only on explicit owner direction or a concrete blocker; record why. Keep each PR focused, and choose a game release number from freshly fetched main + 1 only when preparing that PR.

Earlier native creature/combat/actor passes r813–818 remain delivered; preserve their roster, Foundry and auxiliary-actor work recorded in the release log.

Current checkpoint: production remains verified r829. r833 merged23e83526084b; exact source CI42494696828, merged CI42495799008 and Preview42495798951 passed with reviewed treefc9f84c9. The verified latest preview is https://brightlineai-bot.github.io/infinite-corridor/previews/r833-23e83526084b/. Actual hosted violet/tool motion acceptance is blocked by stopped browser loading after a webview-attach timeout; user restoration is pending. No Publish was dispatched. r830/831/832 were never independently published. Continue the ordered prepared queue only through its remaining gates; no next number is reserved.

| Order | Pass | Required owner direction / completion target | State |
|---|---|---|---|
| 1 | Normal Wayfarer Iron Fists | Retain the imported adult hero, protective head/style and small hands; cover both fists with white/silver gauntlets. Exactly three accepted stages: opening/dash punch, jab, uppercut. Owner confirmed that the opening hand alternates between combo cycles. Use convincing full-body movement and preserve actual combo/dash/effect mechanics and special-form precedence. | Delivered in r826; fresh full/delta review, CI, hosted and live System verified |
| 2a | Verge Cleaver carry and combo | Keep the rusty gladius style, thin side profile, refined hilt and low one-handed carry. Latest owner follow-up requires the right hand and four up/down/up/down swings; the original three-hit r827 version is historical. | Original presentation delivered r827; new right-hand/four-swing correction queued at7a |
| 2b | Cinder Pike carry and combo | Two-handed polearm carry and three distinct forward thrust motions, then reset/repeat. Show actual body/arm movement, not only an effect or hit shape. | Delivered in r827 with 2a; hosted carry, thrust and recovery checked |
| 2c | Remaining primary inventory | Audit every other canonical primary, including Salvage Blade, for coherent carry/attack/recovery and distinct profiles. Do not omit a weapon because it has no new art reference. | Delivered in r829; Salvage/future-primary continuity passed source, review, CI, hosted and live checks |
| 3 | Echo presentation | Actual Echo events create delayed slash/thrust afterimages along the original weapon path. They must not replay the body attack, advance its combo stage or create extra mechanical hits. Keep the real Echo cadence and damage events. | Merged/previewed r830-832; r832 exact CI/Preview and full since-live review passed. Hosted violet verification/publication held for browser restoration; r830/831 never independently published. |
| 4a | Rift Bombard | RG-6-inspired cylinder/short-barrel launcher; appears on accepted tool use, with readable lobbed grenade/drop/explosion and current or separately validated secondary/bounce behavior. Movement continues. | Merged r833-23e83526084b / PR485; full since-live Astra plus source correction review clear, exact source/merged CI and Preview passed. Hosted launcher/startup/release/weaving/colors and publication await browser restoration. |
| 4b | Great Sweep | Normal Wayfarer body; swing the large broken greatsword with substantial guard/hilt and broad truncated blade from the supplied reference. No required permanent back carry or tool-induced body transformation. | Merged in r833; exact hosted broken-sword sweep and weaving remain pending. |
| 4c | Blunderbuss | Compact steampunk firearm, restrained muzzle flare and blue charge accent; distinct firing stance/recoil while moving. This item must not be lost from the queue. | Merged in r833; canonical shared pellet/fan origin correction independently cleared. Hosted firing/hold remains pending. |
| 4d | Lumen Spindle | Wand held up to shoot; stable raised forward casting/firing arm with feedback per accepted shot, no exaggerated repeated left/right waggle. | Merged in r833; hosted raised-wand/repeat/weaving acceptance remains pending. |
| 4e | Remaining tools and variants | Inventory every canonical tool/profile and retain Spark Coil, Needle Caster/Blunderbuss, Hammerfall/Golem, Great Sweep/Mirage, Blunderbuss/Arc Wave, Aether Orrery and other actual variants. Work one at a time with truthful accepted events, carry/swap and socket origins. The owner's unnamed magical-tool remark does not rename an existing item. | Inventory retained. H sourcebecf3c3f includes corrected r833 tools; prior19 propagation checks and14 audit/guard/release checks/build pass. Dedicated release/hosted gates pending. |
| 5 | Spells | All canonical accepted casts, hand origins, projectiles/impacts and distinct visible gestures; movement, rejection, pause, interruption and resume. Retain current mechanics unless a deliberate reviewed combat change is required. | S source71407b40 includes H/tools; latest24 focused checks pass. Release/hosted gesture and projectile gates pending. |
| 6a | Bodies, collisions, items and interactions | Grounded player/enemy separation, legitimate ghost/flight exceptions, overlap escape, wall/corner/door contact, pickups and Act priority. Do not claim body blocking is already implemented. | C sourcec610975b includes spells/H/tools; latest34 focused checks and release833 build pass. Release/hosted contact/item gates pending. |
| 6b | Traversal blocks in Close View | Readable one-level jumpable blocks and two-level stacks. A two-level stack cannot be jumped onto from ground; an adjacent one-level block provides the step. Maximum five physical blocks, ten active seconds. Verify stone selection and production rendering before diagnosing the reported wall appearance; preserve separate wood-wall behavior and placement restrictions. | B source4b4a4696 includes contact/spells/H/tools; latest28 focused checks pass. Hosted stack, lifetime and recovery gates pending. |
| 7a | Right-handed four-swing Cleaver follow-up | Latest owner direction: true right-hand low carry and four convincing full-body swings, up/down/up/down. Preserve original three-stage saved records, one hit per accepted attack, damage/reach/cooldowns and Echo ownership; Pike/Fists stay three stages. | Prepared1eab2818 includes updated tools/blocks plus b1bb1dcf compatibility corrections. Latest30 focused checks/build pass; scoped Astra runtime/presentation correction clear. Hosted right-hand/four-cut acceptance pending. |
| 7b | Camera, environments and combined combat space | Every Target press recenters directly behind the Wayfarer; retain enemy lock behavior and collision clearance. Revisit movement/look ownership, target lock/facing, cramped spaces, all themes, Pentagon halls/shafts, large/multiple foes, enemy melee/ranged readability and solid presentation. Assess breathing room and navigation with the completed actions/contact systems. Preserve pinned layouts. | Finite Target1190b3b4 scoped Astra clear; combined Cleaver/camera source70e465cd passes85 checks/build. Combined-source Astra review clear; hosted camera/environment gates pending. CPU/mock evidence only. |
| 8a | Robot | Restore deliberately clunky oversized technology/cockpit character with a large protective viewport, retaining actual modes/controls. | A source9229c752 includes complete Cleaver/camera union; latest77 focused checks/build pass. Combined-source Astra review clear; release/hosted gates pending. |
| 8b | Powered suit | Fitted human anatomy with modest structural shoulder/head bulk and normal hands, inspired by the supplied hard-suit reference; omit external wires/projections and extreme forearm/head/shoulder mass. | Prepared with 8a source9229c752; normal anatomy and atomic armor/gear budget retained. Combined-source review, release and hosted gates pending. |
| 9 | Close View Pentagon and overworld-keep routing | Latest owner clarification limits this pass to Close View inside overworld Pentagons and keeps, not existing dungeon families. Audit branching paths, room connections and usable multi-level/roof routes in those structures. Determine the representation/generation seam before changes; any new layout requires an explicit new revision and isolated Proving Ground preview, preserving old pins and explored content. The earlier Room Maze target is superseded; reusable region/connector research remains reference only. | R source021a6e2a includes complete Cleaver/camera/armor union; latest83 focused checks/build/release consistency pass. Defaults4/9 remain; opt-in5/10 has not been adopted. Combined-source Astra review clear; hosted/adoption gates pending. |
| 10 | Final combined visual/interaction/performance passes | Exercise the full toolkit, creatures, collisions, items, all environments, traversal/recovery and offline/pause/save behavior at normal gameplay speed. Record bounded work separately from actual phone FPS/thermals/multitouch; those hardware measurements remain open. | Queued |

### Additional boss-rig program — owner intake 2026-11-08

The owner requests a dedicated monster skeleton, 3D model, animation and boss-fight specialist for all bosses fought in Pentagon arenas, with labyrinth arena bosses audited for relevance. Inventory the actual roster and forms first; existing native creature coverage does not prove that a boss has a detailed articulated rig. Readable windup, committed strike/cast, recovery, hit reaction, movement and defeat must follow the actual canonical combat phases and geometry.

This is an additional staged program after the existing ordered passes, with research/preparation allowed concurrently. Preserve every current weapon/tool/spell/contact/block/camera/armor/routing candidate. Re-run the combined stage10 acceptance after each boss delivery. Research reusable licensed rigged assets and existing RPG-character sources before building bespoke skeletons; humanoid reuse is permitted where anatomically suitable. The dictated “Boardwalker” is verified as Void Walker by its existing source transcript; no lore rename is proposed. The [boss rig research manifest](close-view-boss-rig-manifest.md) inventories the exact roster, forms, reuse/license facts and queued pilot. Per the owner, this is planning only and does not redirect current implementation. Preserve creature identity, proportions and world tone, and keep authored attacks truthful to actual damage/reach. No hidden balance change, new engine/dependency, unbounded animation/mesh budget, or regeneration of old content is implied. Each boss family gets a focused implementation/review/preview gate, native/quality fallback, pause/exact-resume checks and hosted motion acceptance. Physical-phone performance remains a separate measurement.

### Parallel specialist checkpoint — 2026-11-08

The owner explicitly requested tool and robot/suit specialists in addition to routing. Runtime capacity is three specialists alongside the coordinator, so completed candidates are frozen and their slots rotate to the next bounded component; no queued requirement is discarded.

| Responsibility | Isolated candidate | Current evidence / remaining gate |
|---|---|---|
| Iron Fists correction | `claude/wayfarer-iron-fists` | Initial visual review rejected mirrored bone pairing, late extension and charge-release snapping. Corrected source passes 56 focused/release checks and build; fixed-origin 30/60fps CPU sequences, bind-rest and charge-entry invariants pass. Actual queued cross-weapon Echo also required an independent saved fist presentation deadline; corrected-head review/CI/hosted/publication gates remain pending. |
| Cleaver/Pike carry and combos | `claude/wayfarer-primary-combos` | Frozen source candidate: 75 focused checks/build passed; parent integration, independent review and normal-speed hosted acceptance pending. |
| Named tools | `claude/close-view-tool-assets` | Frozen source candidate48a23cc7: Great Sweep, Rift Bombard, Blunderbuss and raised firing wand for Lumen Spindle, with accepted-use identity/poses. 46 focused checks/build and CPU evidence passed; integration/independent review/hosted acceptance remain pending. |
| Robot and powered suit | `claude/close-view-robot-suit` | Robot cockpit draft saved4802605b, 17 focused checks/build passed. Powered native draft was rejected for anatomy; specialist now implements the approved adult rig plus at most60 articulated armor triangles. Existing normal-hero worst-case allowance is retained, but powered mode gains two indexed body draws relative to its old native-only baseline. Actual mode/state rules stay unchanged. |
| Pentagon/overworld Old Keep routing | `claude/close-view-room-routing` | Frozen opt-in PG prototype: candidate 8/8 and legacy 58/58 source checks/build passed; new module registered. Existing defaults/pins remain unchanged. Reachable floor grows 2.7–3.3 times in samples with unchanged enemy totals, so pacing and hosted traversal require review before adoption. |

Iron Fists is delivered in r826. Other rows record preparation evidence, not merged releases; their historical counts are superseded by each final integration check. The focused Cleaver/Pike PR now takes r827 against main826. Other candidates remain unnumbered. Remaining Echo, spell, body/contact, item, block, camera/environment, other inventory and final combined passes remain explicit queue entries.

### Latest owner intake and regression authority — 2026-11-08

The owner explicitly approves **any necessary regression tests for every existing project in this queue**, reaffirmed 2026-11-08. This supersedes earlier per-scope test requests; preserve compatibility assertions, generated-output checks and performance floors. Publishing finished focused work remains authorized by this conversation, subject to fresh review, CI, Preview and actual live verification. This does not reopen stopped local loopback or other blocked transports.

- Stage 4e: Hammerfall uses a dedicated stomp: lift one leg, cross clenched fists in front of the chest, plant into a wide bent-knee stance and drop arms beside the torso with elbows still bent. Keep the real delayed remote effect/damage origin; align presentation with its actual impact rather than inventing a new mechanical delay. Imported leg chains and feet must remain connected.
- Stages 7/10: a specialist audits the complete combat and integration toolkit, including collisions, items/Act, taking damage, dodging, clones/Shadow Boxing, projectiles and all tools/spells. Record concrete repros and measured startup/contact/recovery; Elden Ring, Remnant and Tower of Fantasy are quality references, not permission for hidden balance changes. Source-only checks and CPU sheets are distinct from hosted motion and hardware proof.
- Stage 9: compact deterministic branching/loop grammars with meaningful alternate routes, multilevel exploration and escape pockets. New candidate-only keeps may use original decayed biomechanical materials through existing bounded rendering presets. An optional parallel Pentagon stair must preserve identical directed progression guards/effects; old layouts/default pins remain unchanged until explicit candidate adoption.

### Current source preparation receipts — 2026-11-08

These supersede older preparation counts above; none is a publication claim.
- Echo: raised depth-tested afterimages reuse the existing additive batch; up to504 vertices and no new pass. Source56cd531f passes22 focused checks/build. True hosted air-trail acceptance remains.
- Named tools: integrated sourcea677b998 passes155 checks/build, but the launch-cohesion audit reproduced disconnected visible tool/shot origins. This candidate is held for a reviewed presentation remedy, including honest grenade projection; physics and damage remain canonical.
- Hammerfall: independent rig review found arm/endpoint snaps, sole penetration, missing carry-base continuity and disconnected native limbs. The candidate is held for corrections and trajectory/sole tests; its effect-linked clock passed the lag/save probe.
- Spells: corrected free-hand IK, all18 accepted identities and restored legacy/Orrery gestures are prepared at6dd48b8d;64 focused checks/build passed. Final named-tool/Hammerfall integration and hosted gates remain.
- Contact/blocks: conservative body-height correction integrated into569b598c;39 combined checks passed, including tall-body platform contact and legacy/current stone behavior. No old generator change.
- Armor: imported adult powered overlay and clunky cockpit sourcebe032b00 is prepared; later shared-action integration and hosted acceptance remain.
- Routing: compact grammars, paired optional stairs and candidate-only biomechanical keep material source d39df5b1 passed145 checks/build. Candidate versions5/10 remain opt-in; production defaults4/9 and historical outputs are unchanged.
- Boss rigs: documentation-only research is queued; no boss implementation or enlarged rendering budget is approved by its manifest.

### Ordered integration: definition of done

Specialists may prepare independent candidates concurrently; overlapping files are reconciled by the coordinator before release. Tool recipes alone do not complete accepted-use plumbing, animation, projectile or hosted acceptance. For each focused integration pass: reproduce the reported behavior on an exact candidate; implement; run authorized meaningful regressions, release consistency and build; review everything required by current project rules; obtain exact-head CI; merge; follow Preview through completion; verify hosted visuals/interactions; publish only under the current conversation's authority and required approval path; verify workflow, live identity and actual System label; then record evidence and mark that pass delivered. A source-only pose test or a paused screenshot alone cannot establish fluid motion at normal speed. No numerical combat change is hidden inside a cosmetic change, and no existing test assertion is weakened to hide a defect.

Current primary damage resolves immediately with a 240 ms presentation clock. More visible lift/windup and three-stage body motion must remain honest about real contact timing. If visible choreography requires actual startup/contact/recovery changes, make that an explicit data-backed combat pass with its own tests/review; do not show an attack still winding up after an invisible earlier hit. Each accepted press owns its canonical hit; a three-motion cycle does not silently mean three free hits from one press.

### Detail records for the queue

- [Primary and latest combo/carry direction](primary-weapon-presentation-manifest.md): stages 1–3, including the confirmed three-hit alternating-opener decision.
- [Tool and armor specifications](close-view-tool-armor-manifest.md): all named tool/reference details and stages 4/8.
- [Grounded contact design](grounded-contact-design.md), [new excavation return](dug-tunnel-return-height-manifest.md), and the block audit below: stage 6.
- [Combat experience direction](close-view-combat-direction.md) and [routing reuse study](close-view-dungeon-routing-study.md): stage 7/9 reference; latest Pentagon/keep scope supersedes the study's earlier Room Maze target.
- [Release log](RELEASE_LOG.md) and [Anthropic handoff](anthropic-close-view-handoff.md): identities, evidence and continuation.

### Traversal-block audit: current facts, future visual pass

The owner requests blocks rather than an entire wall in dungeon Close View. A read-only production audit found that `src/building.ts` already defines stone as an unblocked elevated perch: `life:10`, `maxOut:5`, and stack cap 2. Each physical record consumes a slot, including each member of a stack; placing the sixth evicts the oldest under existing safety rules. One-level perches require Jump; ground cannot directly enter two levels, and an adjacent one-level block creates the intended three-record stair arrangement. Shared placement restrictions cover slopes, structures/doors, lethal/water terrain, map edges, blocked ground and occupied enemy tiles.

Ten seconds means active gameplay time; pause freezes it. Builds are runtime-only and currently clear on reload or area change rather than restoring a remaining lifetime. Preserve this contract unless a later owner request changes persistence.

Close View static wall extrusion requires a blocked tile; stone is not deliberately classified that way, while wood is a separate intentional full wall. The next pass must reproduce the actual selected material and view first. Diagnose top/edge/side geometry, height, terrain invalidation after placement/top-break/expiry and control clarity before changing any build mechanics. Verify one block, two-stack direct refusal, adjacent one-to-two jump, five-record cap/eviction, ten active seconds/pause, current reload/area clearing, and unchanged lethal/slope/tower/roof restrictions. The exact visual cause has not yet been demonstrated; no fix is claimed.

## Owner direction — compact combat and exploration engine (2026-11-07)

Close View must feel like inhabiting a concrete character in a dangerous, marvelous place. The owner cites Elder Scrolls Online for responsive dodges, casting and readable weapon reach; Bloodborne for pacing; Mortal Shell for weight; and Remnant for tool and weapon interactions. These are quality references, not a claim of feature or production parity. The wider infinite-world view remains the exploration layer; Close View adds deliberate embodied combat and discovery while retaining phone budgets.

This direction supplements the completed passes below; their checkmarks do not mean this expanded work is finished. The single ordered queue above controls implementation; the following list records the earlier broad goals and first-pass evidence, not a separate schedule:

- [x] First imported Wayfarer acceptance delivered in r821: protective green/gray fabric, silver mask and hair, amber eyes, adult proportions/small hands and closed rear neck were verified in hosted rendering.
- [x] First camera clearance and accessible target activation follow-up delivered in r822 with hosted corner/entry/target checks. Combined checks after the new actions/contact systems remain queued in stage 7.
- [x] First distinct primary geometry/grip/action pass delivered in r825 with canonical reach and damage retained. The latest low one-handed Cleaver carry, three-slash/three-thrust cycles, gauntlets and Echo refinements remain queued above; keep the gladius-like shape.
- [ ] Audit and implement solid enemy/player separation so ordinary grounded bodies cannot be walked into. Define and test the existing legitimate ghost, flight, dodge, spawn and knockback exceptions before changing collision. Avoid corridor trapping and preserve authoritative rules in both views.
- [ ] Make ordinary nearby enemies visibly solid and stable while retaining deliberate spectral creatures, wall occlusion and pause/reduced-motion behavior. Investigate whether fade behavior is a stale release or a current defect; record exact candidate evidence.
- [ ] Audit tool and spell actions against accepted gameplay events: distinct visible casts, firing/recoil, correct hands/muzzles, jumping, dodging and interruption/recovery. Refused actions must not animate a successful cast or shot.
- [ ] Assess combat breathing room with representative large and clustered enemies. Prefer camera fixes where sufficient; any larger new layouts need new generator versions and regression digests so explored/pinned dungeons remain unchanged.
- [ ] Validate combined exploration/combat with representative dungeon and Pentagon encounters, range/cover, dodge survival, multiple foes and tool/spell switching; report measured frame/work budgets separately from physical-phone FPS, which remains unmeasured.

Do not add artificial input latency or indiscriminate camera shake to imply weight. Animation and effect reach should communicate the real hit rules. Retain a high skill ceiling through readable danger and responsive control. Record reproducible shortcomings and actual fixes; do not describe a source-only or automated pass as hosted or on-device acceptance.

## Invariants

- Save schema stays 14, preserving unknown fields, exact resume, explored/pinned generation, one-time rewards and existing journeys.
- Every published generator revision retains its historical output and adoption pins, including building interior versions 1–4 and Pentagon versions 1–9 at this checkpoint. New generation uses an explicit new version; no explored history is regenerated.
- Proving Ground uses isolated scratch state and its own storage/cache scope.
- Preserve bounded actors, shots, effects, pathfinding and geometry, all quality tiers, reduced motion and offline behavior. Record physical-phone measurement limits honestly.
- Movement touch belongs to the left joystick; camera gestures and action buttons retain distinct ownership.
- Preserve the r801 publication record and rows 797–801, `renderScaleForViewport(1280,800,3)`, `DECAL_FS` highp integer precision, and the documented 256-triangle per-actor cap.
- Leave `handoffs/` and operator work untouched. Change-Control stays disabled; preserve its historical metadata.
- Use the approved plain Git/GitHub commands. Stop blocked transports and report their exact safe error; use no network workarounds or credential transfers.

## Historical delivery: releases 806–810

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

## Additional owner combat direction — queued

See [the preserved combat direction](close-view-combat-direction.md) for weapon identity, the Iron Fists dash punch/jab/uppercut, visible casting, solid bodies, combat spacing and evidence gates. Finish current character and camera work before this expanded pass.

## Imported Wayfarer publication — r821

PR470, CI42431390795, merged CI42432379946, Preview42432379936 and Publish42433628415 succeeded. Fresh Astra full review (live818 through source5a020acb; mergec4303ef9 has the exact reviewed tree1ce4265c): no blockers. Hosted1280×720 quiet-ramp checks show the corrected fabric neck in rear idle, melee and inverted roll poses, approved front proportions, small hands and amber eyes. Updated cached production818 with the normal Get latest release control; Options → System now namesr821-c4303ef9b07c and reports no recent errors. Journey stayed paused; displayed storage remained250KB. This includes819/820; neither candidate was published separately. Camera822 is merged and awaiting Preview/hosted acceptance. Phone FPS/multitouch remain unmeasured.

## Post-publication owner feedback — queued

Preserve the approved character. Next: low directional dash instead of somersault, smoother gait, and reproduction of digging/denied-block escape traps. Elden Ring fine combat analysis, reuse-first frameworks and Tower of Fantasy combat/world/traversal systems are research directions. Full notes, acceptance boundaries and priorities are in close-view-combat-direction.md; evidence in close-view-combat-references.md; future Anthropic continuity in anthropic-close-view-handoff.md. None of these new runtime changes is claimed complete.

## Camera follow-up publication — r822

PR471 source/merge trees match8667848f6de0eb42ad749b8a85e27cc09f6b607d. CI42432626387, merged CI42433819389, Preview42433819396 and Publish42435253843 passed. Fresh Astra current-live821→822 review: no blockers. Hosted1280×720 checks covered raw outer fixture before death, hive, arcology, cellar and quiet current Pentagon traversal, plus actual Enter acquisition/Space release. No captured console errors. Suspected relocation was resolved as normal guardian death/respawn, not a camera bug. Live identity and Options → System name r822-1d2ba908e56c; updated cached821 through normal Get latest release. Production remained paused when the verification tab closed; displayed journey storage250KB. Legacy narrow rooms still require close overhead views; phone FPS/thermals/multitouch remain unmeasured. This documents completed character/camera scope, not the queued dash/gait/dig/weapon/body/cast/spacing changes.


Latest block/contact evidence: actual Game.buildAt in building:CONTACT-AUDIT:-4:0:keep:3:f1 succeeds for stone at(8,4) in legacy v2, but cached and rebuilt Close View static geometry omit it. Current v4 terrain-ramps stone at(19,13) is unblocked elevation4 on base3, with a .34-high top; wood produces a2.4-high wall. PG currently lacks the production Pack → Supplies → Build with selector, so hosted wood/stone comparison needs an explicit scratch fixture/control. Production defaults to wood when no material was selected. An ordinary rootBrute movement witness allows body overlap in both views (minimum center distance.0472 versus expected radii sum about.736); the new contact pass is not yet delivered. Owner approved focused armor/contact/block regressions, preserving existing assertions and thresholds.


## Prepared-source checkpoint — 2026-11-08

Stages2a/2b are live in827. Camera828 is published after corrected exact-head CI, fresh Astra review, Preview and actual hosted corner comparison; live identity and System are verified. Stage2c829 fixes the separately reproduced Salvage entry-clock snap before Echo. Its focused audit is [recorded here](remaining-primary-presentation-audit.md). All other candidates remain unnumbered.

- Echo sourceae013434 merges main828 while retaining the raised afterimages, whole-frame GL failure/recovery protection and quiet inspection fixtures. 40 focused checks/build passed; schema14 ownership remains covered. Fresh main829 integration and release gates remain.
- Named tools source2e2852e5 retains readable Bombard720ms/Blunder640ms/Spindle760ms/Sweep840ms motions, continuous repeats, and current hit/cooldown timing. Actual three-tool renderer regressions caught and repaired an undefined numeric helper. Source checks now cover positive flashes/links, final-action priority, bounded 3D spans and conservative wall/grid/endpoint safety; 12 public checks plus one private renderer witness and build pass. Hosted readability and fresh release review remain gates.
- Hammerfall source1332f144 has connected imported/native stomp phases and additive logical presentation-clock resume; focused checks/CPU evidence pass, hosted review remains.
- Spells source d524594d has corrected cast origins/metadata, shared capped Fire/Orbit-flight projection and GPU transaction recovery; gather/fields keep their existing floor owners. Build and focused checks pass; no hosted/device claim.
- Contact a340306f, Stone blocks56575171 and compact opt-in routing a111603a retain their prepared source coverage. Routing230 checks/build passed with contact integration; defaults4/9 and all old pins remain.
- Armor recovery29afaa0d on claude/close-view-armor-recovery merges the three explicitly approved complete histories, passes99 focused checks/build, and preserves the original failed attempt. Ordered-main integration, fresh review, CI and hosted checks remain.
- The read-only item audit found no concrete defect; boss rigs remain queued research only. No physical-phone FPS, thermals or hardware multitouch has been measured.


## Approved tool startup and melee weaving — 2026-11-08

The owner explicitly selected brief visible startup → physical release → melee may cancel the remaining body animation, with cooldown enforced. Pressing Tool must begin its draw/windup immediately; a gun/wand releases after its brief startup, Great Sweep swings through release, and Hammerfall retains its original delayed impact without doubling that delay. If no interrupting accepted action begins, the complete authored presentation finishes. A legal accepted melee may end recovery; refused attacks do not fake cancellation, and a cancel never refunds the spent tool cooldown or duplicates shots/hits.

The existing T5d76c7eb baseline already replaces tool presentation on accepted melee and passes the 48-combination weaving matrix plus refusal/buffer/repeat/Echo checks. It still physically releases the four base tools immediately; the newly requested startup transaction is an additional implementation stage, not delivered by that baseline. Preserve longer readable holds, movement and all passive/clone/Echo/child ownership while implementing it. Exact phase/save/buffer/capacity contracts are being finalized before runtime work; no new engine or dependency is planned. Old supported saves/effects must retain their interpretation, pending uses must survive pause/reload exactly once, and no renderer asset readiness may decide physical release. New physical timing requires focused regression, fresh review and actual hosted acceptance before publication.

## Hosted Echo correction — 2026-11-08

r830 is held, never published independently. Its oversized stun was cleared by the intentional governor after 0.6 seconds; hosted HP loss and a source trace to death reproduced all three cases. r831 uses stationary practice behavior while retaining real targeting/damage/recoil and ordinary governor rules. Sixty-second irregular-step, movement, primary/Echo, pause/JSON/reset and ordinary/passive controls pass. Production stays r829 until corrected-candidate gates finish. Current-session publication, Astra and regression authority remains; local loopback/full local suite remains stopped.

## Owner follow-up: right-handed Cleaver and Target recenter — 2026-11-08

The latest owner instruction supersedes the earlier three-hit Cleaver presentation: keep the rusty gladius style and low right-hand carry, then four accepted swings, up / down / up / down, repeating. Verify true anatomical right-handedness from front and rear views; do not infer it from screen position or simply rename a socket. Use convincing shoulder, elbow, wrist, torso and stance motion. One accepted attack remains one attack; do not create four mechanical hits from one press or let Echo advance/replay the body combo. Preserve existing reach/damage/cooldowns and old supported three-stage motion/save records. Pike and Iron Fists remain three stages. Salvage Blade is the existing starter/fallback primary and is separate from the Verge Cleaver; no rename is requested.

Target activation should recenter directly behind the Wayfarer on his facing direction, with a centered rear view rather than a lateral shoulder view. Coordinator assumption preserves the earlier requested enemy acquisition/switching/lock behavior: every Target activation recenters even without an eligible enemy; an acquired target turns the Wayfarer and the camera recenters behind that resulting facing. Preserve wall/ceiling clearance, pause/input ownership, accessibility and committed tool aim. Do not teleport the player or disable collision to force an obstructed camera position.

These are queued follow-ups within stage7 after the existing tools/Hammerfall/spell/contact/block order. Parallel preparation is authorized; current Echo correction and prior prepared candidates stay in order. Necessary regression scope is already approved. Neither change is delivered or published by this intake.

## Hosted packed-color correction — 2026-11-08

Actual side-view frames show raised Echo geometry but yellow color. Float32 addition of 0.5 carries C9A7FF/D8C8FF into C9A800/D8C900. r832 removes that arithmetic and packed-float interpolation through a flat integer varying. Source/interface/buffer regressions pass; actual hosted violet is still a release gate. Production remains r829; r830/831 are never published independently.

## Named-tool release preparation — 2026-11-08

T eadbb8b1695de36c988247d0b0db83686008d366 integrates official main832 and the scoped Astra-cleared shared pellet/fan origin correction. Root post-main57 checks/build and correction41+13 checks/build pass. r833 packages only named tools and accepted startup/release/weaving; Hammerfall/spells/contact/blocks/7a/7b/armor/routes remain later. The new right-hand/four-cut Cleaver source b1bb1dcf passed focused checks and scoped Astra correction review; Target source remains under lifecycle review. These are preparation receipts, not hosted or publication claims. Browser loading stopped on a webview-attach timeout; other GitHub/local work continues.

## Frozen dependency propagation and latest corrections — 2026-11-08

This section supersedes older preparation counts; none of these source receipts means delivered. T source468a1bd5/treeb42a1864 is PR485/r833. Fresh full since-live829→833 Astra review found no blockers and passed70 focused checks. r832 Preview42492299719 and merged CI42492299388 passed with exact treea80785e1; hosted access stopped on a browser webview-attach timeout. Production remains verified r829. Browser restoration is the pending user action, and actual hosted color/tool acceptance remains mandatory before publishing the exact latest reviewed candidate.

Complete r833 tools, the shared-pellet/fan origin correction and current release references were propagated through Hc304b330, S71407b40, Cc610975b, B4b4a4696, Cleaver1eab2818, A58f60aed and Rc9ba18ed. Latest focused gates respectively passed19/24/34/28/30/26/30 checks, with required static builds/release consistency and exact module registrations verified. Private evidence folders remain preserved. Earlier broader component checks remain historical receipts; these numbers identify the latest propagation gate rather than a full suite.

Cleaver b1bb1dcf corrected reverse family/version inheritance and old descriptor-only carry after expiry/reload. Astra re-probed actual Game and1200 submitted gear floats without blockers; its updated union1eab2818 remains prepared, not hosted. Target1190b3b4 uses a finite recenter transaction sharing actual desired/displayed/transient presentation facing, rather than camera-derived idle aim or a frozen transient heading. Astra actual Game/native/imported render probes cleared unlock, no-target pan, action expiry and manual cancellation. These are CPU/mock results, not GPU raster or phone measurements. The final Cleaver/camera→armor→routing source union is being prepared separately; retain its later exact-candidate review/CI/Preview/hosted gates.

No next release number is assigned by this receipt. Preserve queue order, schema14/unknown fields/pins/Proving Ground isolation, existing thresholds, stopped local loopback/full suite and stopped browser loading. Boss rigs remain research/manifest only.

### Completed combined preparation and CI correction

Camera70e465cd/treee52de8c3 combines four-cut/right-hand Cleaver with finite Target recenter and passes85 focused checks/build. Armor9229c752/treef200e94d retains both the empowered-fist exclusion/atomic equipment writer and new Cleaver hand/stage/facing resolution, passing77 checks/build. Routing021a6e2a/tree3c8c09e2 combines that armor/camera source and passes83 checks/build/release consistency with exact module registration and unchanged production defaults4/9. Fresh Astra cross-system source review is in progress; actual hosted/device proof is still absent.

r833 source468a1bd5 CI had3043/3044 pass, with one old audit source-pattern assertion interrupted by the inserted newborn flag. No assertion was weakened: source4d077965/treefc9f84c9 only restores property spread order, with separate glyphHost/newborn keys and identical values/conditions. Local21 checks/build and Astra24-case correction review pass, preserving the full since-live829 review clearance. New CI42494696828 is pending. H sourcebecf3c3f includes that correction; later frozen candidates still contain468 and must incorporate4d/current main before their release gates. Browser restoration and exact hosted acceptance remain pending; no publication claim.

### Combined-source review cleared

Fresh scoped Astra review of R021a6e2a79931fe078c1f819888cf64e684004fd/tree3c8c09e24ce1f06be431518a7e274c9434d39855 found no integration blockers. Besides source inspection,105 armor/Cleaver carry/cut/Fire cases retained exact body/socket samples and atomic equipment admission;8 actual Game scratch-resume cases covered all four Cleaver stages at candidate Keep/Pentagon side stairs with production recording GL/native fallback, finite Target settling, clear wall rays and unchanged accepted gameplay data. This is source/CPU/mock preparation, not GPU raster, full CI, device or publication clearance. Current T source4d/new CI and its later property-order reconciliation remain separate; exact hosted acceptance is still blocked by browser restoration.

### Verified r833 preview and publication boundary

PR485 merged23e83526084bb3f7dcad0cde10a2fa69e18618a8; treefc9f84c98be3ef96d124e7e3ad1dcdd7fc74d861 exactly matches source4d077965. Source CI42494696828, merged CI42495799008 and Preview42495798951 succeeded. The latest served identity and workflow comment verify https://brightlineai-bot.github.io/infinite-corridor/previews/r833-23e83526084b/. Fresh gh-pages live identity still names r829-9c21fb237fe9. No Publish dispatch occurred. Browser restoration remains the single user action required for exact hosted motion/violet acceptance; all other source candidates and review/check receipts above are preserved. Do not treat CI, a source image or this preview link as actual GPU/phone proof.
