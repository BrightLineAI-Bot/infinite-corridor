# Close View material airborne contact study

Status: **research and queued follow-up only**. This study records a concrete Stage 10 finding; it does not implement airborne collision or claim a release, hosted acceptance, or publication. Schedule it after the existing B → 7a → 7b → armor → routing sequence. Boss rigs remain a separate research program.

## Observed gap and scope

During actual hosted C836 inspection, a living Veil Moth mesh crossed the Wayfarer's torso while the player walked through it. Grounded contact deliberately exempts every flying or aloft actor, so this is outside C836's bounded grounded-body contract rather than a reason to redirect or reopen that release.

The owner's original solid-body/full-sweep request supplies scope for a material-airborne follow-up. The smallest pilot is an ordinary low-hover Veil Moth, followed by an explicit family-by-family audit. Generic flight currently grants terrain permission; it is not an authoritative physical height. Removing the flight exemption globally would therefore create invisible columns and incorrectly solidify phased, gaseous, swarming, or genuinely high actors.

## Proposed physical policy seam

Use a frozen pure policy table for explicitly supported material families. Each entry supplies:

- physical bottom and top offsets;
- the existing horizontal body radius;
- an approved authoritative height sampler for recognized states.

The physical interval is `support height + authored bottom/top + recognized flight lift`. Intersecting horizontal sweeps block only when both actors' physical vertical intervals overlap. Real empty air below or above a hovering body remains traversable, including exact-touch boundaries. Geometry calibration may inform the authored table, but physics must not import renderer bob, reduced-motion state, opacity, or frame history.

Preserve the existing swept horizontal solver, broad phase, 256-step cap, enemy-to-player query direction, player disc/raft/drone support, overlap escape, and accepted-trace consequences. Paused coordinates, schema 14, unknown fields, old generation pins, terrain/death/damage/cooldown and teleport behavior remain unchanged.

## Family inventory

| Policy | Families / examples | Required treatment |
|---|---|---|
| First material pilot | Veil Moth | Low-hover interval with genuine above/below clearance; test both movement directions. Presentation lift alone is not physical authority. |
| Ordinary material hover candidates | Grave Lantern, Cinder Seraph, Hanged Choir, Grove Moth, Shardling, Prism Warden, Ink Griffin/Wing, Slate Rook | Audit individually before opting in. Grave Lantern remains material despite flight. Cinder Wisp materiality must be explicit. |
| Explicit intangible/exception states | Lumen Wraith, Strata Eel, Gnawing Maw; Gloomwisp/Gorge/Vast/Shade; temporary hidden, phase, mist and swarm states | Retain non-solid behavior. Do not infer intangibility from opacity, untargetable, shield or stun alone. |
| Recognized airborne attacks | Pack leap-slam and dive paths | Use deterministic trajectory adapters for continuous motion. `aloft` and inconsistent `hopLift` values are not sufficient height authority. Discrete landing/teleport keeps destination overlap escape rather than gaining an implicit swept dash. |
| Special world beasts | Walker, Crystal, giant/stag/moth/dragon air controllers | Separate family adapters and review. Their lift units, phase meanings and controller paths differ; do not include them through the ordinary pilot. |
| Astral and stalker families | Astral Worm/Mirage forms, clones and mount; Stalker leap/climb states | Keep separate ownership and state-specific policy. Do not treat their presentation or controller fields as a generic flight height. |

Vesperwing and Gravitant Bell also need an explicit audit: current elevation reach names them as flying while the legacy airborne list does not, so runtime flags may leave them physically grounded.

## Acceptance gates

- Actual `Game` two-way Veil Moth contact while vertical intervals overlap.
- Genuine above- and below-body clearance, exact-touch behavior, slopes and platform/support changes without an invisible full-height column.
- Ordinary AI and pack movement, Fists/Shadow Boxing, push, wall slide, retreat and hazard consequences retain their contracts.
- Dive, leap, landing, phase/materialization and death transitions use explicit policy and do not inherit stale solidity.
- Pause/JSON exact resume, both views and reduced-motion mode produce the same physical result.
- Existing actor bounds and bounded work remain intact.
- Hosted normal-speed silhouette/body agreement is required before delivery; server-free source checks alone are not visual proof.

Primary server-free seams are `grounded-contact.test.ts`, `grounded-contact-height.test.ts`, `monster-pack.test.ts`, and relevant roof/presentation cases. Boss-family checks remain separate. Every supported family requires its own source review and hosted gate before any delivery claim.
