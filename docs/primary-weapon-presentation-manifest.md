# Primary weapon presentation manifest

Updated: 2026-11-07. Implementation is intentionally paused until the current character and camera work is published. This document records the completed source audit and a bounded resumption plan; it grants no release or publication authority.

## Canonical facts and invariants

- `src/items.ts` is authoritative: Cinder Pike is a thrust with range 2.45 tiles and arc 32 degrees; Verge Cleaver is an arc with range 1.75 tiles and arc 180 degrees. Presentation must not change damage, range, arc, cooldown, targeting, cover, elevation, save schema 14, pinned generation, Proving Ground isolation, actor/geometry caps, or the existing two hero GL draws.
- The imported Rogue source contains dagger attacks, not polearm or great-blade clips. Pike and Cleaver motion must be truthfully identified as derived polearm/two-hand poses rather than claimed as source animation.
- The imported skeleton audit found the right weapon socket at `Weapon.R` node 16, under the right-hand chain; the left grip chain is nodes 5–7. Feet are root-parented at nodes 1 and 36. Source +Z faces forward. Derived poses must retain socket grip and avoid translating the root or detaching the feet.
- Existing approved character identity remains: adult body, small hands, amber head/eyes, source archives, and imported-body geometry unchanged.

## Current behavior and findings

- `Game.primaryAttack` already owns the accepted 240 ms melee clock and writes `attackVisual`; `closeViewPlayerAction` derives presentation progress from that real clock. Adding an optional normalized weapon identity to the accepted record is the narrow path that can retain the original weapon through recovery, pause, save/resume, and an equipment switch without altering combat.
- Close View currently maps both canonical primaries to generic `melee`, generic blade geometry, and the imported `Dagger_Attack` clip. Idle presentation also lacks Pike/Cleaver silhouette identity.
- Iron Fists already preserve actual accepted combo identity in `attackVisual.fistStep`: step 1 dash punch, step 2 opposite-hand jab, step 3 uppercut. The procedural native forms already select distinct poses for all three steps and preserve the step through pause/schema-14 reload. Gameplay creates the corresponding `iron-fist` or `fist-uppercut` effect at the resolved strike point. The follow-up must audit visible windup/contact/recovery and effect origin, without rewriting hit counts, movement, damage, combo window, or recovery timing.
- Tool/caster presentation remains a separate requirement within the same later visual pass: hand emitters and casting must originate at the correct animated hand/socket, preserve the real accepted aim and clocks, and retain current tool profiles and caps. No spell or tool mechanics should be inferred from desired visuals.

## Bounded resumption plan

1. Add presentation-only primary identity for an accepted attack, preserving unknown future keys and schema-14 round trips. Refused attacks must not stamp or replace presentation metadata. Idle identity follows equipped gear; an active/recovering action follows its accepted original weapon.
2. Build bounded, distinct silhouettes from existing procedural primitives: a long Cinder Pike shaft with compact head and a broad Verge Cleaver blade sized for their canonical reach language. Keep gameplay reach exclusively in `PRIMARY_PROFILES`.
3. Derive Pike anticipation, shaft extension/contact, and retraction from the accepted action phase, with a stable right socket and visible left-hand brace. Derive a broad two-hand Cleaver windup, sweep/contact, and weighted recovery. Preserve reduced-motion attack readability.
4. Verify the Iron Fists dash punch, jab, and uppercut at anticipation/contact/recovery samples in actual native-form rendering, including strike-effect origin relative to the Wayfarer after the real dash.
5. Audit caster and emitter hand origins against the same sockets and accepted aim. Correct only presentation plumbing and geometry; do not alter projectiles, spell/tool timing, or targeting.
6. Run focused offline tests only: player attack visual/schema round trips, imported hero integration, native player forms/Iron Fists, close-view combat contract, targeted primary geometry/motion tests, and the build. Do not run the full suite, local servers, CI, release bumps, publishing, or network actions in this worktree.

## Evidence limits

The audit above is source/CPU evidence. No GPU frame was visually inspected, and no physical-phone FPS or hardware multi-touch claim is made. Those remain later acceptance gates after implementation resumes.
