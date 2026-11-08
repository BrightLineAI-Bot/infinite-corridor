# Close View material-contact family inventory

Status: **source pilot prepared, not integrated or delivered**. This inventory preserves the airborne-contact design findings after the ordinary Veil Moth pilot. The separate Grave Lantern branch now carries the reviewed low-hover interval and active-phase admission only; it allocates no release and claims no hosted GPU, phone, full-flight-family or boss delivery.

## Existing ordinary contact routes

Common grounded packs are already eligible through the shared actor-contact path: Saint, Amalgam, Beetle and Thunderhorn. Crawler and Spinner are grounded as well; their ordinary solidity remains while their travel gaps and `leapSlam` direct route require separate phase-aware handling. Lynx is ordinarily solid and uses blink as a discrete teleport. Mirror Shade and its clones are solid outside their discrete mirror-swap teleport. Sunderjaw is solid while surfaced and excluded while underground.

The current source seam begins in `src/actor-contact.ts` (around line 15). Pack fields are assembled by `packCombatantFields` in `src/monster-pack.ts` (around line 736). Ordinary pack updates around `src/game.ts` lines 3325, 3364 and 3398 call the shared pack-world move around lines 5261–5267, which reaches `moveGrounded`. This is the established route to preserve; no replacement contact engine is proposed.

Direct movement modules require behavior-specific treatment rather than a kit-name blacklist:

- `leapSlam` (around line 2777) is continuous and needs a future authoritative height/phase adapter.
- `blink` (around line 2786) and mirror swap (around line 2882) are discrete teleports; keep teleport semantics and use bounded post-teleport overlap escape rather than sweeping the skipped path.
- `phaseCharge` (around line 2798) remains genuinely phasing.
- `ramCharge` (around line 2807) already uses `w.move`; preserve blocking and its resulting stun behavior.
- `diveBomb` (around line 2886) needs separate airborne versus landed admission.
- burrow (around line 2904) remains excluded while underground and solid only after surfacing.

## Material-family queue

The next bounded ordinary-family study after Veil Moth is **Grave Lantern**. Its flying material cage, chains and censers use the independently reviewed fixed authored interval `support + [.33 * scale, 2.33 * scale]`, with scale clamped to `.25…4`; the older `2.35` body-height fallback is not used as the physical interval. The source pilot admits only the ordinary current physical phase. Idle, chase, patrol, hit/stun and supported ground-height attacks stay solid; actual phase-charge/leap/dive travel remains excluded, while blink destinations, ram blocking/stun and landed recovery retain ordinary contact. Unknown active states and nonzero physical lift fail closed. Runtime physics does not import or sample presentation geometry.

Choir and Seraph are materially rendered but their dive behavior and multi-body presentation make them a larger later scope. Wraith, Maw and Strata Eel phase; Gloom is ghostlike. Preserve their ethereal/non-solid behavior. Cinder Wisp's legacy airborne exclusion is not evidence that every visually material flyer should remain excluded, nor permission to admit Cinder Wisp without its own study.

The ordinary roster borrows twelve kit modules: `sweepBeam`, `bite`, `blinkStrike`, `clawSweep`, `mortarVolley`, `webSpit`, `leapSlam`, `phaseCharge`, `ramCharge`, `shockwave`, `longStab` and `diveBomb`. Admission must follow the actor's **active physical phase**, not the mere presence of one of these unused/borrowed module names.

## Preserved boundaries

Every later family must preserve ordinary terrain permission, existing contact/radius rules, cooldowns, damage, pause/exact-resume, schema 14, actor/work bounds, authored scale handling, reduced motion and native fallback. Aloft, phase, teleport, dive and underground exceptions stay explicit. This inventory does not change renderer budgets, save fields, attacks, movement producers or boss rigs.

## Required future evidence

A focused family PR must use actual `Game` witnesses for ordinary walk and player dodge approaches in both directions, reverse enemy movement, blocked `ramCharge` and its stun, teleport placement plus overlap escape, phase passage, continuous leap height, dive airborne clearance, landing solidity and resumed/loaded overlap. It must also cover terrain, cooldown/damage, pause, schema, bounds, scale, reduced-motion and native-fallback controls.

For Grave Lantern specifically, the fixed interval has been reviewed against bounded cage/chain/censer source geometry and living poses, and focused source tests distinguish its occupied band from empty air without reading transient bob. Hosted texture-lit GPU inspection, integration after routing adoption, and dedicated leap/dive clearance work remain later acceptance gates; source geometry and CPU contact checks are not delivery or a physical-device claim.

## Order

1. Complete the existing ordinary Veil Moth pilot and its integration gates after routing.
2. Review and integrate the prepared Grave Lantern low-hover pilot only after the Veil Moth and routing/adoption hosted gates; do not broaden it to leap/dive travel or reuse `2.35` as a physics interval.
3. Consider Choir/Seraph only as a separate dive/multi-body scope.
4. Preserve Wraith/Maw/Strata Eel/Gloom phase/ghost behavior unless a new owner-approved design proves otherwise.

