# Close View Creature Asset Roster Plan

Durable planning draft — 2026-11-07

## Scope and current candidate

The additional requested scope is:

1. Give every Close View-eligible creature a coherent native 3D presentation.
2. Make the Wayfarer less blocky while preserving gameplay readability and the established character identity.

PR 462 at candidate commit `cfc575fa` is the first attack/gallery candidate for this work. It is part of release 813 review and CI, not proof that the exhaustive roster below is complete. Finish and validate 813 before widening implementation.

No release number beyond 813 is reserved by this plan.

## Completion rule

A creature is **Complete** only when all of the following have direct evidence in Close View:

- Native body: its intended silhouette is represented by native geometry rather than an unreviewed fallback.
- Native action: locomotion and representative attack phases animate coherently.
- Attachments: weapons, wings, jaws, limbs, tendrils, carried pieces, or other defining attachments are placed and move correctly.
- FX: telegraphs, impacts, status overlays, fades, projectiles, and other owned effects originate and layer correctly.
- Evidence: the body, action, attachments, and FX have each been exercised in a deterministic production-backed fixture and visually reviewed.

An existing native body alone is not Complete. Any missing or unaudited column keeps the creature Pending.

## Exhaustive 29-kind baseline

`Existing native` records the currently known body route. It does not imply completion. Pending entries deliberately avoid inventing unaudited behavior.

| Kind | Form status | Silhouette | Locomotion | Representative attack | Attachments | FX ownership | Evidence / remaining proof |
|---|---|---|---|---|---|---|---|
| ashling | Existing native | Existing humanoid body; audit proportions | Pending audit | Pending attack-phase audit | Pending audit | Pending audit | 813 gallery candidate provides a deterministic witness; full completion evidence pending |
| ashenHound | Existing native | Existing quadruped body; audit profile | Pending audit | Pending bite/lunge audit | Pending audit | Pending audit | 813 gallery candidate witness; full action and FX evidence pending |
| rootBrute | Existing native | Existing heavy humanoid body; audit mass | Pending audit | Pending heavy-strike audit | Pending audit | Pending audit | 813 gallery candidate witness; full action and FX evidence pending |
| coilStalker | Existing native | Existing stalker body; audit readable outline | Pending audit | Pending stalk/strike audit | Pending audit | Pending audit | 813 gallery candidate witness; fade/depth and action evidence pending |
| hollowMarshal | Existing native | Existing armed humanoid body; audit diagonal readability | Pending audit | Pending melee-sequence audit | Pending weapon audit | Pending audit | 813 gallery candidate witness; action, attachment, and FX evidence pending |
| glassMite | Existing native | Existing small crawler body; audit scale | Pending crawl audit | Pending attack audit | Pending audit | Pending audit | 813 gallery candidate witness; small-body legibility evidence pending |
| sparkWarden | Pending | Pending audit | Pending audit | Pending audit | Pending audit | Pending audit | No complete Close View evidence recorded |
| cinderWisp | Pending | Pending floating-body audit | Pending hover audit | Pending cast/projectile audit | Pending audit | Pending effect-origin audit | 813 gallery candidate witness; native-body and complete FX proof pending |
| veilMoth | Existing native | Existing flying body; audit wing profile | Pending flight audit | Pending aerial-attack audit | Pending wing audit | Pending audit | 813 gallery candidate witness; flight, attachment, and FX evidence pending |
| voidSentinel | Existing native | Existing sentinel body; audit scale and cover read | Pending audit | Pending ranged/melee audit | Pending audit | Pending audit | 813 gallery candidate witness; complete action and FX proof pending |
| weepingSaint | Pending | Pending audit | Pending audit | Pending audit | Pending audit | Pending audit | No complete Close View evidence recorded |
| hangedChoir | Pending | Pending audit | Pending audit | Pending audit | Pending audit | Pending audit | No complete Close View evidence recorded |
| graveLantern | Pending | Pending audit | Pending audit | Pending audit | Pending audit | Pending audit | No complete Close View evidence recorded |
| pallidCrawler | Existing native | Existing crawler body; audit low silhouette | Pending crawl/leap audit | Pending bite/leap audit | Pending audit | Pending audit | 813 gallery candidate witness; full crawler action evidence pending |
| mirrorShade | Pending | Pending audit | Pending audit | Pending audit | Pending audit | Pending reflection/fade audit | No complete Close View evidence recorded |
| amalgam | Pending | Pending audit | Pending audit | Pending audit | Pending audit | Pending audit | No complete Close View evidence recorded |
| gnawingMaw | Pending | Pending audit | Pending audit | Pending audit | Pending jaw audit | Pending audit | No complete Close View evidence recorded |
| cinderSeraph | Pending | Pending audit | Pending flight/hover audit | Pending audit | Pending wing/halo audit | Pending audit | No complete Close View evidence recorded |
| lumenWraith | Pending | Pending spectral silhouette audit | Pending float/fade audit | Pending audit | Pending audit | Pending spectral FX audit | No complete Close View evidence recorded |
| veilSpinner | Pending | Pending audit | Pending audit | Pending audit | Pending limb/web audit | Pending web FX audit | No complete Close View evidence recorded |
| riftLynx | Pending | Pending quadruped audit | Pending audit | Pending audit | Pending audit | Pending rift FX audit | No complete Close View evidence recorded |
| sunderjaw | Pending | Pending audit | Pending audit | Pending audit | Pending jaw audit | Pending audit | No complete Close View evidence recorded |
| thunderhorn | Pending | Pending heavy quadruped audit | Pending charge audit | Pending charge/contact audit | Pending horn audit | Pending thunder FX audit | No complete Close View evidence recorded |
| siegeBeetle | Pending | Pending armored-insect audit | Pending audit | Pending siege-attack audit | Pending shell/weapon audit | Pending impact FX audit | No complete Close View evidence recorded |
| gloomwisp | Pending | Pending floating-body audit | Pending hover audit | Pending audit | Pending audit | Pending gloom FX audit | No complete Close View evidence recorded |
| gloomgorge | Pending | Pending audit | Pending audit | Pending audit | Pending audit | Pending gloom FX audit | No complete Close View evidence recorded |
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
