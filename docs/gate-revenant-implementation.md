# Gate Revenant implementation and historical stage records

Current status, 2026-10-21: integrated in the single combined release 251 candidate with corrected Walker/ocean/Blob work and completed Astral Worm. The combined local implementation at `1054a167` passed 1,062 tests and build. Final packaging is being audited and retested; CI, preview and publication verification remain separate. The isolated-stage notes below preserve their historical facts and are superseded only as to current integration/release scope.

## Historical isolated starting point

Unreleased, not a publication candidate. Branch `claude/gate-revenant-upgrade` is isolated from the ongoing r251 ocean work and provisionally based on a91cc8c54c088fc7430798c23b7e908722b6d1a1. Integrate the reviewed final r251 baseline and obtain fresh review before any release. No release markers or protected test/config/script files changed.

Read `gate-revenant-source-transcript.md` for exact owner wording and `gate-revenant-design.md` for the historical read-only audit. The latter's initial planning status is superseded by this implementation record, not erased.

## Implemented scope

Only the roaming `gatePredator` variant receives the new controller/stat tuning. Deep final-boss variants keep their existing progression/stats. Generic Gate Revenant identity is not converted into a Monster Pack or world-beast identity, preventing inherited teleport/phase/marine/boss rules.

- Actual unobstructed chase3.6 world units/sec =1.5× base player2.4. Production ordinary moveAxis collision and350ms-cached boundedChaseStep pathing remain. Attack stops intentionally reduce average combat traversal speed.
- Existing eligibility condition unchanged. Provisional chance24/1000 doubles12/1000 for first-pinned new layouts, with legacy threshold retained for old pinned/visited histories. Threshold is additive history state. No base map regeneration or reroll on revisit.
- One-time tuning occurs AFTER legacy dungeon/global damage scalars. Final HP=max(existing,320,round(two-thirds×Walker-reference tuned HP)); final damage=max(existing,40,round(two-thirds×Walker-reference tuned damage)). This prioritizes the requested increase over the approximate ratio. At low player stats the floor intentionally exceeds two-thirds of the reference; it never lowers an existing stat. Upgrade preserves missing HP, dead remains dead; repeated load does not retune or heal. Current actor260HP/36damage minimum becomes320HP/40damage; actual HP depends on equipment/level.
- Burst4 emissions, last a pair; .32sec warning/.18 spacing, .38damage share, straight6.2speed/1.5sec life. Burst movement full chase.
- Lobs3 emissions, .35 warning/.22 spacing/.8 flight/.85blast radius/.55damage share; full chase. Visible ground warning and arc use existing lavaBomb renderer; launch requires clear line of sight and open target.
- Most warnings and sustained breath move at85% chase (3.06units/sec); other non-barrage active stages and recovery use full chase. Attack initiation range6 avoids permanently hovering outside reach.
- Sustained breath .4 warning,1.4duration, fixed direction following the mouth/7range/.5half-width/.35tick/.26damage share. Continuous orange-white beam is clipped at walls; no homing or camera effects.
- Stationary barrage9 lobs, .5 warning/.13 spacing/.85 flight/.8radius/.36damage share. Finite spread around sampled player position, not unlimited screen coverage.
- Wraiths call the exact Walker START.voidWraiths, preserving two rends, straight transient motion, slash behavior and live-owner cancellation. No new summoned actor/reward.
- Rotation is burst, lob, wraith, breath, burst, barrage; .3 recovery and .55 gap. Numeric values are prototype choices, not owner-mandated. Attack damage is per-event fraction of tuned damage, not40damage every frame. Production invulnerability/dodge gates still apply.
- All new emissions respect shared48-effect capacity without evicting other warnings and16-per-owner budget. Actor state advances in bounded.05sec substeps with.25 catch-up cap; no paused update. New shots use swept collisions; owner death or shelter termination cancels live fire and wraiths. Area reload/crossing clears transient effects and resets attack windup while preserving health and sequence, matching existing pack runtime treatment.

## Validation and outstanding work

External scratch probes (outside protected tests/) verify actual speed,27 stat/guard/level combinations, wound preservation/idempotence, all four effect kinds, pause, owner cancellation, walls, capacity preservation and exact wraith parameters. Production probes verify pinned rarity, final actor stats, unchanged deep final boss, absence of pack/phase privileges, JSON/schema14 reload HP and legacy save upgrade. Build passed. Full existing suite and independent stage review are recorded in the parent task; this document does not claim their completion until results are appended.

Needed protected additions for explicit owner approval: `tests/gate-revenant.test.ts` (tuning, fixed-step controller, attack budgets/collision/owner cleanup) and `tests/gate-revenant-integration.test.ts` (spawn pinning, production speed, terrain/pursuit/shelter, deep-boss isolation, save migration). No protected test was written or edited. Existing assertions must not be weakened to hide regressions.

Before release: reconcile provisional tuning through play/visual review, check shelter and exit behavior in production fixtures, review difficulty at low player HP, integrate final r251, assign next available odd release, perform authorized release checklist and CI, and obtain specific publication approval. This prototype has no publication approval and remains on disk only.

## Stage corrections and current validation

Reviewer found and implementation fixed attack pauses letting ordinary walking escape forever, frame-rate-dependent barrage shot count, out-of-bounds cross-section pursuer placement, and point-LOS/footprint corner traps. External tests now cover9 barrage shots at20/60/144Hz, capturing base/+20% retreat from gap8, all four production crossings, and valid footprints. Existing suite before later beast-floor changes:822pass/1failure, the protected predator-HP260 assertion at prototype.test.ts2573 requires authorized update; no assertions edited. Latest owner clarification makes Gate disappear without reward on player death, no retreat/rematch counter. Shelter remains an earlier explicit escape exception. Major-beast rematches are separate; see beast-level-eight-design.md.

Gate chase retains active glyphSlow via its speedMultiplier/glyphBaseSpeed ratio: unmodified speed3.6, a50% slow1.8. Route waypoints/retry timestamps are transient and cleared on load/area handoff. Current external probes include these behaviors; no new protected tests have been written.

Independent read-only stage review completed2026-10-21 with no remaining confirmed gameplay blockers after the documented fixes. This does not clear release: protected expectation updates/new regression coverage, visual/play checks, final r251/Astral integration and exact-candidate full-suite/production review remain outstanding. Full hash record and shared review details are in beast-level-eight-design.md.

## Authorized regression coverage and visual polish

On2026-10-21 the owner approved the bounded regression changes for ocean creatures, Gate and beast scaling/death (Sentinel_d98297056a8c8191855c27fb7ab65285, answering Sentinel_512b8f9b1c548191aa7a9ea01c6af64a). Added focused Gate controller/integration and major baseline/rematch tests. Updated four obsolete historical assertions (fixed260HP and three low-level encounter exclusions), retaining their other eligibility/pursuit assertions. This authorization does not grant follow-on publication.

Gate-specific breath art now uses tapered irregular flame tongues and restrained embers instead of a rounded laser-like bar. All pixels stay within the wall-clipped lane; damage geometry/timing are unchanged. Reduced-motion/safe-mode freeze the animation. External native pixel checks verify bounds, zero-length clipping, stable accessibility frames and no effect mutation. Scripted22second preview confirms each labeled attack starts, activates and emits, nine-shot barrage, closing pursuit and actual shelter cleanup; opening galaxy portals render within the wraith arming branch. This is not a human/browser/mobile playtest. Prior pre-polish full-suite result was819pass/4obsolete failures; current approved full-suite/build results will be appended after completion.

Final isolated stage validation:834/834 tests pass,0fail (174310ms), npm run build succeeds. Independent reviewer also ran98/98 focused/affected tests and found no new blockers; independently verified pure bounded flame rendering and accessibility stability. Current source/test hashes were frozen throughout these runs. Release remains251 only because this is an uncommitted follow-on branch on historical a91cc8c, not an integrated/publication candidate. Final r251/Astral integration must rerun the exact-candidate checks.

## Corrected r251 integration

Locally merged corrected r251083c03959cb1f7c2be8d62f4a5620ee849f23bdc (tree dc31b3e02f768881134188eeca7eca8f1cb54f7d) into the reviewed Gate checkpoint735d16903ae9eccc2dd22bd37453eaf115331d66. Two game.ts conflicts resolved additively: Gate tuning plus Walker retreat-vitals restoration, and the dedicated Gate update branch followed by r251's marine-refreshed pack branch. The marine forced-displacement fix, Walker boat/door-retreat behavior, Crystal water effects and ocean scar exclusion are retained. Gate remains an ordinary-terrain predator with separate shelter/death termination, not a marine or three-rematch beast. No incomplete Astral files imported; no release-number or remote changes. Targeted ocean/Gate/baseline suites103/103 pass; full integrated suite/build completion recorded below when verified.

Integrated validation passed:926/926 tests,0fail (177928ms), static offline build successful. Source hashes remained frozen during validation. This is a local merged stage only; release251 markers intentionally unchanged, no remote publication, and Astral integration remains outstanding.
