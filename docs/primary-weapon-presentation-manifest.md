# Primary weapon presentation manifest

Updated: 2026-11-07. The bounded Pike/Cleaver implementation is in progress on the published character/camera baseline; this document grants no release or publication authority.

## Canonical facts and invariants

- `src/items.ts` is authoritative: Cinder Pike is a thrust with range 2.45 tiles and arc 32 degrees; Verge Cleaver is an arc with range 1.75 tiles and arc 180 degrees. Presentation must not change damage, range, arc, cooldown, targeting, cover, elevation, save schema 14, pinned generation, Proving Ground isolation, actor/geometry caps, or the existing two hero GL draws.
- The imported Rogue source contains dagger attacks, not polearm or great-blade clips. Pike and Cleaver motion must be truthfully identified as derived polearm/two-hand poses rather than claimed as source animation.
- The imported skeleton audit found the right weapon socket at `Weapon.R` node 16, under the right-hand chain; the left grip chain is nodes 5–7. Feet are root-parented at nodes 1 and 36. Source +Z faces forward. Derived poses must retain socket grip and avoid translating the root or detaching the feet.
- Existing approved character identity remains: adult body, small hands, amber head/eyes, source archives, and imported-body geometry unchanged.

## Current behavior and findings

- `Game.primaryAttack` already owns the accepted 240 ms melee clock and writes `attackVisual`; `closeViewPlayerAction` derives presentation progress from that real clock. Adding an optional normalized weapon identity to the accepted record is the narrow path that can retain the original weapon through recovery, pause, save/resume, and an equipment switch without altering combat.
- Accepted melee presentation now records a normalized `weaponKind` and logical `poseMs`. Known Pike/Cleaver identities select their accepted silhouette through recovery and save/resume even after an equipment switch. Missing legacy or unknown future identities retain the neutral generic fallback; idle follows current equipment.
- The bounded procedural geometry now distinguishes the Pike's long shaft and compact head from the Cleaver's broad blade. The normal native fallback keeps that identity in idle, attack, and recovery and uses the same immediate-commit (at most 19.2 ms), followthrough, and recovery policy; it does not add a pre-hit windup or change the already-resolved gameplay hit. Robot, Power Suit, and Ember retain their existing bounded `melee` held recipe rather than gaining unreviewed form-specific Pike/Cleaver geometry.
- The imported source still has no canonical polearm or two-hand clip. Its in-progress derived pose is labeled `derived-polearm-thrust` or `derived-twohand-cleaver`, retains source locomotion/feet, and samples the accepted logical idle clock at both action boundaries. Final two-hand grip calibration remains a required acceptance check, not a completed claim.
- Iron Fists already preserve actual accepted combo identity in `attackVisual.fistStep`: step 1 dash punch, step 2 opposite-hand jab, step 3 uppercut. The procedural native forms already select distinct poses for all three steps and preserve the step through pause/schema-14 reload. Gameplay creates the corresponding `iron-fist` or `fist-uppercut` effect at the resolved strike point. The follow-up must audit visible windup/contact/recovery and effect origin, without rewriting hit counts, movement, damage, combo window, or recovery timing.
- Tool/caster presentation remains a separate requirement within the same later visual pass: hand emitters and casting must originate at the correct animated hand/socket, preserve the real accepted aim and clocks, and retain current tool profiles and caps. No spell or tool mechanics should be inferred from desired visuals.

## Bounded resumption plan

1. Completed in this worktree: presentation-only accepted identity and pose clock, future-key/schema-14 preservation, neutral legacy/future fallback, refusal stability, and accepted gear identity through switching/recovery.
2. Completed in this worktree: bounded distinct Pike/Cleaver silhouettes built from existing primitives. Gameplay reach remains exclusively authoritative in `PRIMARY_PROFILES`.
3. In progress: derive a direct committed Pike thrust and broad Cleaver cut with no fake pre-hit anticipation, then return to the identical ready hold within the existing 240 ms. The final right socket must own the weapon frame and the left hand must remain within .01 world tile of its fixed second grip across 21+ phases and gait inputs.
4. Verify the Iron Fists dash punch, jab, and uppercut at anticipation/contact/recovery samples in actual native-form rendering, including strike-effect origin relative to the Wayfarer after the real dash.
5. Audit caster and emitter hand origins against the same sockets and accepted aim. Correct only presentation plumbing and geometry; do not alter projectiles, spell/tool timing, or targeting.
6. Run focused offline tests only: player attack visual/schema round trips, imported hero integration, native player forms/Iron Fists, close-view combat contract, targeted primary geometry/motion tests, and the build. Do not run the full suite, local servers, CI, release bumps, publishing, or network actions in this worktree.

## Evidence limits

Focused offline evidence on the implementation candidate:

- The imported hero matrix samples both weapons at 22 accepted phases and four gait phases. It checks finite unit normals, exact phase-0/phase-1 body and socket equality against the matching logical idle pose, immutable source positions, and a maximum two-hand socket target error below .01 world tile. Separate trajectory assertions measure the Cleaver's 105-degree derived horizontal cut, verify that both grips remain collinear with the shared rotating weapon frame, and require more than .08 world tile of Pike socket extension. The visual cut angle and extension are readability choices, not claims that the mesh depicts either canonical gameplay hit boundary.
- Actual `Game` plus production renderer tests cover nonzero logical idle entry/recovery for both canonical weapons; metadata tests cover refusal, equipment switching, pause, schema-14 round trips, malformed optional fields, and future-safe unknown identity fallback.
- Native fallback tests check distinct silhouettes and motion, identical canonical model selection across idle/attack/recovery, special-form legacy held-gear retention, live nonplayer model isolation while either canonical primary is equipped, the 256-triangle cap, finite geometry, direct commitment by phase .08, and return to the ready endpoint. The Cleaver silhouette uses a bounded tapered forged blade with contrasting guard rather than a flat rectangular board. The existing combat-contract tests remain green, and the offline build remains release 823 in this unnumbered worktree.

These are source/CPU and mock-GL submission checks; no GPU frame was visually inspected. No physical-phone FPS or hardware multi-touch claim is made. Hosted visual review remains a later acceptance gate. Iron Fists, caster/emitter origin, contact readability, and room/body spacing remain the unchanged queued follow-ups in steps 4–5 rather than scope silently absorbed by this pass.

Parent source art acceptance at frozen 12809723: local untracked CPU rasterizer sampled actual body and held-gear writers at phases 0/.08/.30/.65/1 from front-quarter, side and rear-quarter. Inspected attached grips, straight thrust, distinct angular cut, preserved head/neck/proportions/palette and tapered blade. Source hash receipt and PNGs stay outside the repo. This is unlit CPU evidence, not GPU/device acceptance. Component full/delta Astra review cleared the fixed angular path, special-form gear routing, native idle continuity, non-player selection and all 256-triangle caps; independent 38 checks passed. Release825 integrates verified main824; final gates remain pending.
