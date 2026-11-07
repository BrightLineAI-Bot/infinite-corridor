# Close View Creature Asset Roster Plan

Durable planning draft — 2026-11-07

## Scope and current candidate

The additional requested scope is:

1. Give every Close View-eligible creature a coherent native 3D presentation.
2. Make the Wayfarer less blocky while preserving gameplay readability and the established character identity.

PR #462 merged as `dbbd7b6c6a51009fd78ce4ee94a9afd7d07c3c02`; its r813 Preview succeeded. It supplies real combat fixtures, not proof that the exhaustive roster below is complete. PR #463 follows with player presentation; the current branch adds the first five creature bodies and the complete roster inspection lab.

No release number beyond 813 is reserved by this plan.

## Implementation checkpoint — first five creature bodies

Source checkpoint `7519ee42` implements Glass Mite (168 triangles), Spark Warden (196), Cinder Wisp (140), Veil Moth (120), and Void Sentinel (204). Each supports three 8-triangle drones under the existing 256-triangle per-actor limit. The Wayfarer has a rounded hood, shaped coat panels and tapered limbs (238 triangles with blade; tool maximum 240).

Shared anchors place actual enemy and drone projectile effects without changing hit positions, speed, damage or collision. Source tests exercise native submission, colocated actors, status/phase alpha, real producer heights, pause and import order. These results establish implementation and regression coverage; hosted visual evidence is still required before marking any row Complete.

The Creature Asset Lab supplies 38 production-backed witnesses: the 26 current interior kinds plus three validated Foundry fixture kinds, six admitted Foundry morphologies, and three decorated production states. It reports actual form/controller/palette data and uses an unchanged generated hall with a clear same-height lane. It is a scratch fixture, not completion evidence by itself.

The model vertex stride grows from 9 to 10 floats to carry explicit scalar alpha. Actor caps (8/14/20), 256-triangle limit and existing two model passes remain fixed; this is a small per-vertex bandwidth increase, not a claim of zero rendering cost. Physical-phone performance remains unmeasured.

## Following non-Foundry implementation checkpoint

Source `039cbf12` adds the remaining fifteen Pentagon/haunt bodies and refines the original six with curved masses and limbs. All 26 non-Foundry normal species have body recipes with room for three drones under256 triangles. Exact source body counts: Ashling160, Hound224, Root Brute204, Coil Stalker176, Hollow Marshal224, Pallid Crawler178; Saint148, Choir204, Lantern160, Shade104, Amalgam192, Maw168, Seraph232, Wraith154, Spinner202, Lynx192, Sunderjaw200, Thunderhorn176, Beetle220, Gloomwisp180, Gloomgorge220.

The integration consumes actual own/boss/guardian/Fracture/hybrid controller states, including pre-hit blink strike, hidden burrow travel, locked dive, live beam aim, wall-stunned charge and spike volleys. Real Game haunt children/merge and decorated captures have targeted regression witnesses. A fresh independent review found missing body motion for several admitted families under reduced motion; that blocker is resolved in the subsequent source delta. Fresh Astra reassessment independently checked 55 own/boss moves and found no remaining identical idle/windup/contact geometry; 25 focused checks pass, including the source-derived allowed-module matrix. Source contact sheets are diagnostic geometry evidence only; hosted visual checks remain pending. A subsequent independent full-release review found horizontal lofts incorrectly used for five upright torso/cloth parts. The explicit verticalLoft correction restores torso depth without adding triangles and preserves horizontal crawlers/muzzles/ribs. Per-part depth/volume, winding and normals regressions pass; r815 remains unpublished and is superseded by this corrected candidate. The multi-angle limb audit also found fixed-axis curvedTube cross-sections collapsing vertical and oblique limbs. Deterministically transported tangent frames now preserve real radial volume while retaining authored centers, pivots, radii and triangle counts; straight-X output remains compatible. Independent actual-leg/tendril sections and all-roster action/budget checks cover the fix.

## Foundry implementation checkpoint

All three Foundry kind defaults and six admitted morphology families have authored native meshes with actual palette0–4, production-scale anchors, real ordinary windup/strike and producer-derived projectile sockets. Exact tentacle variants match3 hostile or6 boss appendages: tentacled152/200 triangles, biomechanical204/228. Maximum withthree drones is252; body/passes/active-actor limits remain fixed.

Actual constructors retain explicit validated candidate palette as foundryPalette; otherwise source visualSeed reconstructs the palette. Tests prove this presentation-only field does not alter combat fields and survives the existing schema14 enemy snapshot round trip. The data-only metadata module avoids importing meshes into projectile producers.

Source facts: Foundry movement labels affect the existing speed multiplier rather than a separate hopping/orbit controller, so native gait follows actual displacement. sweepingBeam emits the existing five straight projectiles; it is presented as a fan, never a sustained beam. Accepted creature states remain tied to source attack clocks. Unknown or malformed custom candidate bodies/actions/movements keep an explicit fallback.

The gallery covers actual generated/admitted/roaming producer data, allroles×six bodies×five palettes, boss slam, close tentacle stab, five ranged patterns, phase alpha, source refs, pause and import order. Foundry constructors are production code but their natural route into current map.building Close View interiors is not established; these are fixture witnesses and future-compatible presentation support, not an expanded encounter roster or camera gate.

Fresh Astra source review of9dfd48ad (tree68ac67c6cb533342c3d457271ea4432af9206ada) found no blockers. Fifteen integrated geometry/producer/action-matrix regressions pass, plus the41-check integration group; full local suite2843/2844 had only the known Windows Pages fixture failure. After the inherited torso/tube corrections,15 focused Foundry/volume/controller checks pass. Final release CI/hosted GPU acceptance remain separate gates. Physical-phone performance is unmeasured.

## Visible character and companion checkpoint

The character branch adds actual-state native Iron Fists, robot, empowered power-suit and Ember bodies. Form selection uses the existing equipment, mechUp and skill state; entering Close View never activates a form. Every form retains its body with all eight known held profiles. The maximum is Robot230 + emitter26 =256 triangles; the suit with its source spiral/core is228 before held parts. Accepted fist-step identity stays in the existing attackVisual record; held charge remains runtime-only across reload, matching the pre-existing gameplay contract.

Corridor Golem, Shadow Clone, Orrery orbs, attached drone, six Reciter looks and Elder Wanderers share exact source capture references and the same8/14/20 native actor caps. Existing body-only suppression and deferred sprite fallback preserve residual effects once. Elders retain the exact9×15 rule-cell panel as a bounded atlas detail on the native cloak. Labels, speech, interactions, gauges, jets, halos, tethers and warning markers remain source-owned. Unknown forms and cap overflow use the original presentation without dropping interaction feedback.

Independent review caught and resolved cap-overflow defects: Shadow Clone BLOCKED now draws exactly once in ordinary/native/fallback paths; Orrery retains one ground halo and body/core-only fallback. Tests reproduce all three caps. Drone rockets latch a finite visual offset from the actual normal/carrying orange launch port, then join their unchanged physics path over0.12 seconds using existing projectile age. Head and historical trail use the same curve; hit XY, damage, speed and life are unchanged. Split-save, pause, invalid/legacy metadata and owner-movement cases pass.

The Creature Asset Lab now has47 cases: the earlier38 plus nine visible-actor producers. These activate real tools, spells, equipment, skill and traveler constructors. High browser clocks are synchronized before activation so Shadow Clone remains live rather than expiring during setup. The full local suite passed2883/2884 with only the known Windows Pages fixture issue;18 post-merge gallery/aux/release checks and build passed. Astra source/delta review cleared both fallback defects at9f742398. Exact final packaging CI and hosted visual acceptance remain outstanding; physical-phone FPS and hardware multi-touch are unmeasured.

## Hosted r816 review checkpoint — 2026-11-07

Candidate r816-093cff214c39 (tree7fe017393c8f15c58da42cd2aa42e80265dc0843) was checked in the hosted Creature Asset Lab using seed CINDER-VERGE-47, variant0 and the generated Pentagon gallery lane (player25,11; foe30,11). Individual scenarios were reset, exercised and paused; diagnostics confirmed the expected live kinds. All26 normal cases and the three decorated cases were exercised. No preview console errors were reported.

Direct body/action views were obtained for Hound, Root Brute, Coil, Marshal, Warden, Wisp, Moth, Sentinel, Saint, Choir (vertical look/backstep), Lantern, Shade, Amalgam with real child Crawlers, Maw, Seraph, Wraith, Spinner, Lynx, Beetle, Gloomgorge and the decorated ward/drone/guardian states. The rounded Wayfarer, actual hit feedback, warning rings, beams, cloth, wings and tendrils were visible. Some frames cropped tall or overhead bodies, or caught fast/burrowing actors out of frame. Crawler, Glass Mite, Sunderjaw and Gloomwisp need additional unobstructed hosted views; do not infer exhaustive phase acceptance from scenario startup or source tests. Ordered distance/cutline fades were distinguished from missing bodies by approach views and source review. Source multi-angle geometry sheets at48c5bf7e additionally verify solid side profiles; they do not replace GPU evidence.

Publish42416350924 succeeded. Production identity and actual Options → System both identify r816-093cff214c39; the existing journey remained250KB and was left paused. A cold production launch exposed an existing early-timer/game-initialization race in main.ts, although the game subsequently loaded and System reported no recent errors. The following character candidate moves the unchanged UI registration below the completed asynchronous load. Both immediate/deferred startup regressions pass; independent replay against the old source reproduces the exact ReferenceError. Hosted cold-launch confirmation remains required before its publish. Phone FPS and physical multi-touch remain unmeasured. Rows retain Pending until each full evidence gate is satisfied.

## Integration hold and remaining acceptance

The native character/companion source and startup correction are preserved on claude/close-view-character-forms. They have not been assigned a new release or published. PR #466/r817 is held: CI42413525175 failed twice on the unchanged tower-seals generation timing assertion; all2857 other checks and preview rehearsal passed. Astra verified the timing test and11 transitive generator dependencies are byte-identical to r816; isolated tower tests and eight benchmark repetitions pass, with observed GC sensitivity. Test-runner isolation requires the owner approval requested in this session; no assertion, threshold, workflow or generator was weakened or changed.

Independent work completed during the hold: source startup fix and two regressions, character build, updated r816 publication record, and a seven-subject front/side/rear CPU geometry contact sheet. Attempted local UI validation at http://127.0.0.1:8767/proving-ground/ returned net::ERR_FAILED; that transport and temporary server were stopped. Do not use a tunnel, proxy or relay. Continue normal hosted Preview validation after CI is resolved.

Remaining: resolve the CI blocker within approved scope; merge r817 and follow Preview; fetch current main and assign its next number to the character PR; run release consistency/build/CI, exact final Astra delta review, hosted Foundry and character/companion visual passes, then publish under this session's existing explicit authorization. Re-read current live identity and exact latest successful candidate before dispatch. Verify workflow/live identity/System label and record publication. Physical-device FPS and multi-touch remain unmeasured. The additional crawler lock-on/backstep pass obtained an unobstructed native body/limb view; further low-creature and burrow/floating phase views remain deliberately pending.

## Completion rule

A creature is **Complete** only when all of the following have direct evidence in Close View:

- Native body: its intended silhouette is represented by native geometry rather than an unreviewed fallback.
- Native action: locomotion and representative attack phases animate coherently.
- Attachments: weapons, wings, jaws, limbs, tendrils, carried pieces, or other defining attachments are placed and move correctly.
- FX: telegraphs, impacts, status overlays, fades, projectiles, and other owned effects originate and layer correctly.
- Evidence: the body, action, attachments, and FX have each been exercised in a deterministic production-backed fixture and visually reviewed.

An existing native body alone is not Complete. Any missing or unaudited column keeps the creature Pending.

## Baseline: 26 current interior species plus three Foundry fixture cases

`Existing native` records the currently known body route. It does not imply completion. Pending entries deliberately avoid inventing unaudited behavior.

| Kind | Form status | Silhouette | Locomotion | Representative attack | Attachments | FX ownership | Evidence / remaining proof |
|---|---|---|---|---|---|---|---|
| ashling | Source implemented; hosted pending | Authored curved native body, 160 triangles | Source displacement/pose checks passed | Real controller and complete allowed-family checks passed | Defining limbs/carried parts and three drones bounded | Actual capture/decor/phase ownership covered by regressions | Reviewed source039cbf12 plus animation fixb09ab9a8; visual completion remains pending |
| ashenHound | Source implemented; hosted pending | Authored curved native body, 224 triangles | Source displacement/pose checks passed | Real controller and complete allowed-family checks passed | Defining limbs/carried parts and three drones bounded | Actual capture/decor/phase ownership covered by regressions | Reviewed source039cbf12 plus animation fixb09ab9a8; visual completion remains pending |
| rootBrute | Source implemented; hosted pending | Authored curved native body, 204 triangles | Source displacement/pose checks passed | Real controller and complete allowed-family checks passed | Defining limbs/carried parts and three drones bounded | Actual capture/decor/phase ownership covered by regressions | Reviewed source039cbf12 plus animation fixb09ab9a8; visual completion remains pending |
| coilStalker | Source implemented; hosted pending | Authored curved native body, 176 triangles | Source displacement/pose checks passed | Real controller and complete allowed-family checks passed | Defining limbs/carried parts and three drones bounded | Actual capture/decor/phase ownership covered by regressions | Reviewed source039cbf12 plus animation fixb09ab9a8; visual completion remains pending |
| hollowMarshal | Source implemented; hosted pending | Authored curved native body, 224 triangles | Source displacement/pose checks passed | Real controller and complete allowed-family checks passed | Defining limbs/carried parts and three drones bounded | Actual capture/decor/phase ownership covered by regressions | Reviewed source039cbf12 plus animation fixb09ab9a8; visual completion remains pending |
| glassMite | Implemented; visual review pending | Authored native body, 168 triangles | Source motion regression passed | Actual ordinary attack clock covered | Three bounded drones plus authored defining parts | Producer anchors and native decoration regression passed | Creature Asset Lab witness ready; hosted visual gate remains |
| sparkWarden | Implemented; visual review pending | Authored native body, 196 triangles | Source motion regression passed | Actual ordinary attack clock covered | Three bounded drones plus authored defining parts | Producer anchors and native decoration regression passed | Creature Asset Lab witness ready; hosted visual gate remains |
| cinderWisp | Implemented; visual review pending | Authored native body, 140 triangles | Source motion regression passed | Actual ordinary attack clock covered | Three bounded drones plus authored defining parts | Producer anchors and native decoration regression passed | Creature Asset Lab witness ready; hosted visual gate remains |
| veilMoth | Implemented; visual review pending | Authored native body, 120 triangles | Source motion regression passed | Actual ordinary attack clock covered | Three bounded drones plus authored defining parts | Producer anchors and native decoration regression passed | Creature Asset Lab witness ready; hosted visual gate remains |
| voidSentinel | Implemented; visual review pending | Authored native body, 204 triangles | Source motion regression passed | Actual ordinary attack clock covered | Three bounded drones plus authored defining parts | Producer anchors and native decoration regression passed | Creature Asset Lab witness ready; hosted visual gate remains |
| weepingSaint | Source implemented; hosted pending | Authored curved native body, 148 triangles | Source displacement/pose checks passed | Real controller and complete allowed-family checks passed | Defining limbs/carried parts and three drones bounded | Actual capture/decor/phase ownership covered by regressions | Reviewed source039cbf12 plus animation fixb09ab9a8; visual completion remains pending |
| hangedChoir | Source implemented; hosted pending | Authored curved native body, 204 triangles | Source displacement/pose checks passed | Real controller and complete allowed-family checks passed | Defining limbs/carried parts and three drones bounded | Actual capture/decor/phase ownership covered by regressions | Reviewed source039cbf12 plus animation fixb09ab9a8; visual completion remains pending |
| graveLantern | Source implemented; hosted pending | Authored curved native body, 160 triangles | Source displacement/pose checks passed | Real controller and complete allowed-family checks passed | Defining limbs/carried parts and three drones bounded | Actual capture/decor/phase ownership covered by regressions | Reviewed source039cbf12 plus animation fixb09ab9a8; visual completion remains pending |
| pallidCrawler | Source implemented; hosted pending | Authored curved native body, 178 triangles | Source displacement/pose checks passed | Real controller and complete allowed-family checks passed | Defining limbs/carried parts and three drones bounded | Actual capture/decor/phase ownership covered by regressions | Reviewed source039cbf12 plus animation fixb09ab9a8; visual completion remains pending |
| mirrorShade | Source implemented; hosted pending | Authored curved native body, 104 triangles | Source displacement/pose checks passed | Real controller and complete allowed-family checks passed | Defining limbs/carried parts and three drones bounded | Actual capture/decor/phase ownership covered by regressions | Reviewed source039cbf12 plus animation fixb09ab9a8; visual completion remains pending |
| amalgam | Source implemented; hosted pending | Authored curved native body, 192 triangles | Source displacement/pose checks passed | Real controller and complete allowed-family checks passed | Defining limbs/carried parts and three drones bounded | Actual capture/decor/phase ownership covered by regressions | Reviewed source039cbf12 plus animation fixb09ab9a8; visual completion remains pending |
| gnawingMaw | Source implemented; hosted pending | Authored curved native body, 168 triangles | Source displacement/pose checks passed | Real controller and complete allowed-family checks passed | Defining limbs/carried parts and three drones bounded | Actual capture/decor/phase ownership covered by regressions | Reviewed source039cbf12 plus animation fixb09ab9a8; visual completion remains pending |
| cinderSeraph | Source implemented; hosted pending | Authored curved native body, 232 triangles | Source displacement/pose checks passed | Real controller and complete allowed-family checks passed | Defining limbs/carried parts and three drones bounded | Actual capture/decor/phase ownership covered by regressions | Reviewed source039cbf12 plus animation fixb09ab9a8; visual completion remains pending |
| lumenWraith | Source implemented; hosted pending | Authored curved native body, 154 triangles | Source displacement/pose checks passed | Real controller and complete allowed-family checks passed | Defining limbs/carried parts and three drones bounded | Actual capture/decor/phase ownership covered by regressions | Reviewed source039cbf12 plus animation fixb09ab9a8; visual completion remains pending |
| veilSpinner | Source implemented; hosted pending | Authored curved native body, 202 triangles | Source displacement/pose checks passed | Real controller and complete allowed-family checks passed | Defining limbs/carried parts and three drones bounded | Actual capture/decor/phase ownership covered by regressions | Reviewed source039cbf12 plus animation fixb09ab9a8; visual completion remains pending |
| riftLynx | Source implemented; hosted pending | Authored curved native body, 192 triangles | Source displacement/pose checks passed | Real controller and complete allowed-family checks passed | Defining limbs/carried parts and three drones bounded | Actual capture/decor/phase ownership covered by regressions | Reviewed source039cbf12 plus animation fixb09ab9a8; visual completion remains pending |
| sunderjaw | Source implemented; hosted pending | Authored curved native body, 200 triangles | Source displacement/pose checks passed | Real controller and complete allowed-family checks passed | Defining limbs/carried parts and three drones bounded | Actual capture/decor/phase ownership covered by regressions | Reviewed source039cbf12 plus animation fixb09ab9a8; visual completion remains pending |
| thunderhorn | Source implemented; hosted pending | Authored curved native body, 176 triangles | Source displacement/pose checks passed | Real controller and complete allowed-family checks passed | Defining limbs/carried parts and three drones bounded | Actual capture/decor/phase ownership covered by regressions | Reviewed source039cbf12 plus animation fixb09ab9a8; visual completion remains pending |
| siegeBeetle | Source implemented; hosted pending | Authored curved native body, 220 triangles | Source displacement/pose checks passed | Real controller and complete allowed-family checks passed | Defining limbs/carried parts and three drones bounded | Actual capture/decor/phase ownership covered by regressions | Reviewed source039cbf12 plus animation fixb09ab9a8; visual completion remains pending |
| gloomwisp | Source implemented; hosted pending | Authored curved native body, 180 triangles | Source displacement/pose checks passed | Real controller and complete allowed-family checks passed | Defining limbs/carried parts and three drones bounded | Actual capture/decor/phase ownership covered by regressions | Reviewed source039cbf12 plus animation fixb09ab9a8; visual completion remains pending |
| gloomgorge | Source implemented; hosted pending | Authored curved native body, 220 triangles | Source displacement/pose checks passed | Real controller and complete allowed-family checks passed | Defining limbs/carried parts and three drones bounded | Actual capture/decor/phase ownership covered by regressions | Reviewed source039cbf12 plus animation fixb09ab9a8; visual completion remains pending |
| latticeHunter | Pending | Pending audit | Pending audit | Pending audit | Pending audit | Pending lattice FX audit | No complete Close View evidence recorded |
| archiveBehemoth | Pending | Pending large-body audit | Pending audit | Pending audit | Pending audit | Pending audit | No complete Close View evidence recorded |
| riftGrazer | Pending | Pending audit | Pending audit | Pending audit | Pending audit | Pending rift FX audit | No complete Close View evidence recorded |

## Foundry morphology coverage

Foundry work must explicitly cover all six morphology families. A shared family solution is acceptable only when each member retains a distinct readable silhouette and its attachments and effects remain correctly owned.

| Morphology family | Status | Required evidence |
|---|---|---|
| Quadruped | Pending | Native stance, gait, turn, attack, contact point, attachments, and FX origin |
| Floating | Pending | Native volume, hover rhythm, depth stability, cast/attack pose, and FX origin |
| Segmented | Pending | Native segment chain, turning and compression, attack propagation, and attachment continuity |
| Tentacled | Pending | Native core plus bounded tendril motion, attack pose, occlusion behavior, and FX origin |
| Geometric | Pending | Native readable facets/planes, motion language, attack transition, and owned glow/projectile FX |
| Biomechanical | Pending | Native organic/mechanical hierarchy, joint motion, attack pose, attachments, and owned FX |

## Additional visible actor scope and route audit

A later producer audit separates camera eligibility from an injected gallery witness. Current Close View requires dungeon `map.building`. Gate Revenant, domain manifestations, four elite classes and Foundry encounters have no demonstrated natural route into those building IDs; Foundry gallery cases validate presentation integration without claiming a natural interior encounter. Do not expand camera eligibility to manufacture coverage.

Production-reachable presentation work still pending beyond enemy bodies: Iron Fists Wayfarer, deliberately activated robot/mech and Ember Form; Corridor Golem; Shadow Clone; Orrery orbiting/effect geometry; dungeon Reciters and Elder Wanderers. These remain explicit coverage tasks. Player special forms must activate only from real existing equipment/state, never automatically on entering Close View. NPCs retain labels, interactions and original identities; no lore rewrite is implied.

## Explicit boundaries and conditional coverage

- World beasts that still work in the existing presentation are excluded because they are not currently Close View-eligible. This plan does not expand camera eligibility.
- The Astral retreat route is conditional. Its route witness has not been proven, so it must not be marked covered until a deterministic production-backed witness exists.
- Travelers, Reciters, and Elders are separate visible-character coverage, not part of the 29-kind hostile baseline.
- The allied Clone, Aether Orrery, and Corridor Golem are separate visible-character/tool-summon coverage. They require their own native body/action/attachment/FX evidence where applicable.
- Decorated elite, ward, shaman, affix, and alpha variants require authored effect ownership. A base body plus a generic overlay is not automatically sufficient; each variant must prove that its defining attachments, telegraphs, status layers, and impacts belong to the correct actor and depth.
- Normal melee occlusion is not itself a defect. Review should target incorrect depth, fade, attachment, timing, or effect-origin behavior.

## Phased execution

### Phase 1 — Finish release 813

- Complete CI, review, hosted inspection, and any bounded corrections for PR 462 / `cfc575fa`.
- Treat the first attack/gallery work as candidate infrastructure and evidence, not roster completion.
- Preserve existing generated interiors, scenario pins, scratch-save isolation, and production behavior.

### Phase 2 — Player status, tool profiles, and the Wayfarer

- Audit player action/status poses against all representative production tool and spell profiles.
- Make the Wayfarer less blocky without changing collision, timings, reach, or combat readability.
- Verify held equipment, cast poses, hit reactions, status overlays, and summoned/tool-owned effects.
- Retain production action clocks; do not create gallery-only fake attack or hit clocks.

### Phase 3 — Five Arcology/Hive bodies

- Author and validate the five selected Arcology/Hive creature bodies as one bounded batch.
- Require distinct silhouettes, native locomotion and attacks, correct attachments, and effect ownership before any member is Complete.
- Exercise representative cover, elevation, pause/resume, and Close View depth cases.

### Phase 4 — Remaining Pentagon, fauna, and spectral bodies

- Complete the remaining Pentagon inhabitants, grounded fauna/crawlers, flying bodies, and spectral/fading creatures.
- Prioritize low silhouettes, flight/hover stability, translucent depth, and projectile/cast origins.
- Add deterministic gallery witnesses only where they improve inspection without flattening production geometry.

### Phase 5 — Foundry morphologies and variants

- Cover quadruped, floating, segmented, tentacled, geometric, and biomechanical Foundry families.
- Author decorated elite, ward, shaman, affix, and alpha effect ownership.
- Verify that shared morphology systems remain bounded and that variant overlays attach to and sort with their owner.

### Phase 6 — Complete QA

- Re-audit every roster row against the completion rule.
- Exercise idle, locomotion, windup, strike/cast, recovery, hurt, death/fade, pause/resume, cover, and elevation where applicable.
- Confirm deterministic fixtures, production/scratch isolation, save compatibility, phone quality tiers, and pink-warning behavior.
- Record direct evidence for native body, action, attachments, and FX before changing any row to Complete.

## Rendering and compatibility budgets

- Geometry budget: at most 256 triangles per actor.
- Active actor budgets remain 8 / 14 / 20 across the established quality tiers.
- Keep the two existing model passes; do not add a third pass for this work.
- Pink warning materials remain visible for missing or invalid assets; do not hide failures with silent fallback styling.
- Gameplay timing, collision, reach, damage, AI, and rewards remain unchanged unless separately approved.
- Schema 14 compatibility and unknown-field preservation remain unchanged.
- Existing scenario pins, generation identities, and legacy geometry remain unchanged.
- Proving Ground remains scratch-only and isolated from production journeys, storage, caches, rewards, and progression.
- Automated checks do not establish phone FPS; practical device performance still requires hosted/on-device measurement.

## Evidence ledger rule

For each creature and visible-character case, retain a compact evidence record containing:

1. Production kind and resolved native form.
2. Deterministic seed, laboratory, scenario, and starting position.
3. Body/silhouette inspection result.
4. Locomotion and representative action result.
5. Attachment result.
6. FX origin, layering, fade, and impact result.
7. Cover, elevation, pause/resume, and quality-tier observations where relevant.
8. Automated test references and hosted visual-review reference.

No row becomes Complete from automated tests alone, from a static body alone, or from another creature in the same morphology family passing review.
