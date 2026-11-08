# Close View routing adoption plan

Status: **planning only**. The opt-in routing prototype remains unadopted. Production adoption requires a separate focused PR after exact-prototype hosted traversal, combat and pacing gates pass. This document is not adoption approval, implementation, delivery or publication evidence.

## Compatibility rule

Adoption must preserve every seen or previously represented place. `BUILDINGS.interior.version = 4`, the `interiorVersion` fallback and current inheritance rules remain unchanged. No global default bump is permitted.

For a genuinely new standalone `building:…:keep` in a newly entered section, first complete ordinary placement. Only after successful placement may the existing first-floor history receive `interiorVersion: 5`, and only when there is no evidence of an earlier identity:

- no family-level explicit version pin;
- no generated or visited floor history;
- no stored snapshot or reconstruction record;
- no conflicting/unknown compatibility metadata.

The pin operation must not generate or visit a floor, grant a reward, mutate discovery, create doors, or rewrite siblings. An old visited-but-unentered keep stays version 4. Explicit versions 1–4, legacy generated-only histories, snapshot-only histories, unknown metadata and sibling histories remain byte-compatible. Roof-first entry inherits the established family version and never creates a new pin independently.

Pentagon adoption is separate. `PENTAGON.version = 10` may be selected only by a deterministic eligibility routine for a genuinely new site at least nine sections out. Any existing pin keeps the whole old site on its prior version, and a prior section with no Pentagon placement does not retroactively gain one. The supported edge case of an old active Pentagon ID with missing atlas pins must have an explicit compatibility contract and fail closed; it must never mint a fresh v10 reward namespace.

This scope excludes apartments, hives, compounds, castles, labyrinths, ordinary dungeons and outdoor `keeps.ts` generation.

## Production reconstruction seam

On ordinary overworld load, production reads the explicit keep-family pin and calls `routingKeepAppearance(base, 5)`. The result is attached to both `map.greatBuilding` and the matching exterior object so entry, roof return and presentation share one identity. Reconstruction must not mutate tiles, roof geometry, placement, discovery or rewards. A Proving Ground load wrapper alone is not proof of this production path.

Existing `buildingDoors` contracts remain authoritative:

- front entrance, breach, hatch, `roofTop` and same-session return stay intact;
- every optional paired stair duplicates the complete directed guard and effect payload, not merely the destination coordinate;
- `ROUTING0` retains its guardian-controlled one-way roof route and gains no invented hatch;
- `CONTACT-ROOF2` retains its actual paired hatch.

Pentagon v10 retains its old namespace and all existing keys, trials, bosses, levers, opened/finale state, Tesseract gates and rewards. No old progression state is copied into a fresh namespace and no new reward can be inferred from routing appearance alone.

## Frozen grammar

If adopted, the exact reviewed grammar is frozen as routing grammar revision 2. Future layout or connector changes require explicit version dispatch and a new compatibility review; they cannot silently alter revision 2 or the production selector.

## Focused implementation surface

The expected adoption surface is the production selection/reconstruction seam in `src/game.ts`, the Pentagon eligibility/version seam in `src/pentagon.ts`, focused tests, and this documentation. `src/types.ts` is not expected to change because the plan reuses existing additive history fields. Any need for a new durable field, broad generator edit or migration is a design change requiring review before implementation.

## Regression matrix

The focused adoption PR must prove, without Proving Ground-only wrappers:

1. New eligible keep versus visited-unentered, discovery-only, explicitly pinned, generated-only, snapshot-only, unknown-metadata, roof-first and sibling-family histories.
2. All nine Pentagon visit/entry orders plus a prior unpinned section, old active-ID/missing-atlas fail-closed behavior and whole-site pin retention.
3. Real ordinary `Game` serialize, migrate and reconstruct paths, exterior-to-interior and roof reload, pause/exact-resume and a schema-14 unknown-field canary.
4. Front/breach/hatch/roof return payloads, rewards, directed guards and partial-keeper lock behavior.
5. Baseline digests for non-keep buildings and excluded families, proving no default or placement drift.
6. The exact candidate at low, balanced and full quality, plus hosted traversal pacing, combat readability and retreat around bodies.

Hosted acceptance must cover the exact adopted prototype at normal speed. Automated checks do not establish GPU appearance, pacing, thermals, hardware multi-touch or physical-phone performance; no hardware claim is implied.

## Gate order

1. Complete exact R prototype hosted traversal and combat gates with defaults still unchanged.
2. Prepare a separate focused adoption PR implementing only the conservative selectors and production reconstruction seam above.
3. Run fresh source review, exact CI/Preview and hosted new-vs-old compatibility checks.
4. Publish only through the normal release gate and verify live identity/System state before claiming adoption.

Until every gate completes, defaults remain keep interior 4 and Pentagon 9, with opt-in keep 5 and Pentagon 10 confined to the existing prototype.
