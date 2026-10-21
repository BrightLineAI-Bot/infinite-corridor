# Astral Worm — owner design and future review contract

Recorded 2026-10-21 UTC. **Design only; not implemented or verified by this document.** This is a separate next creature, not an expansion of release 251's Walker/Crystal/Blob work. No release number, delivery commitment, deployment authorization, numeric balance, or finished asset is asserted here.

## Evidence and interpretation rules

Read [the verbatim source](astral-worm-source-transcript.md) first. S1 is the detailed dictated description; S2 is the final name correction; S3 adds above-water appearance eligibility and also contains an unrelated Gate correction. S4 approves the latest fourth-pass appearance, defines retreat and adds optional mounted Walker behavior; S5 confirms Wayglass spelling; S6 explicitly approves the proposed reward policy and corresponding regression-test updates. Stable AW requirement IDs below are for future implementation/review traceability, not proof of implementation. An explicit correction takes priority over earlier tentative wording. Open questions are intentionally not silently resolved.

**Canonical name: Astral Worm.** It is one fast, black-ink shapeshifting creature, distinct from the Void Walker. References to “void worm,” “void monster,” and similar transcription variants within S1 mean this newly described creature, not a request to add those mechanics to the Walker. Its normal silhouette is an elongated segmented worm/larva, not the initially considered shapeless blob.

The owner invokes an Elden Ring creature, likely Astel, and a “no name or no face” ooze-like reference as inspiration. These references describe movement and shapeshifting feel, not permission or a requirement to copy branded models, art, sound, or an exact character. Preserve the original reference wording in S1; any identification of the reference is an interpretation.

## Owner requirements

All requirements in this section derive from S1 unless another source is specified. “Unknown” values must stay configurable proposals until decided, not fabricated owner instructions.

| ID | Requirement | Boundary / nuance |
|---|---|---|
| AW-01 | Name the new creature Astral Worm. | S2 supersedes all provisional spellings and the assistant's Void Worm working name. |
| AW-02 | Follow the same general damage and behavior profile as the exceptional monsters under discussion. | A baseline reference, not a numeric stat specification or proof of an exact shared AI class. Identify the actual baseline before implementation. |
| AW-03 | Primary form is elongated, segmented, worm/larva-like, with a flexible moving body. | Explicitly supersedes primary shapeless-blob suggestion within S1. Exact body size and segment count are unspecified. |
| AW-04 | Use black, inky material and adaptive shape changes rather than a conventional fixed worm anatomy. | Griffin form explicitly retains this same black inky character; limbs match body color. Do not assume a star-textured body merely from the name. |
| AW-05 | Where useful, reuse existing wiggling-tail/worm geometry and movement foundations. | Reuse is permitted, not a mandate to duplicate another monster unchanged. |
| AW-06 | Be fast, not slow. | Applies to encounter feel and mobility; exact speeds, recovery and telegraph durations remain open. |
| AW-07 | Pool into a shapeless ooze/blob alternate form and extend spikes in multiple directions. | Pooling is not the default form; spike count, reach, hit cadence and timing unspecified. |
| AW-08 | In elongated form, extend many limbs from both sides and move forward in a trample attack. | Excess legs are intentional, more than locomotion needs; some may resemble hands or imperfect approximations of legs. Not a tidy natural centipede. |
| AW-09 | Produce a large grotesque human-like mouth for repeated chasing bite attacks, then morph the mouth back into the inky body. | Mouth is temporary morphology, not a permanent face. Grab/immobilization is not established by this requirement. |
| AW-10 | Fly with an elongated body and insect/dragonfly-like wings, with facial pincers available as part of the morphology. | Altitude, flight permissions, collision and whether pincers are their own damaging move are unspecified. |
| AW-11 | While flying, sustain a beam directed down to the ground. Its impact has damaging area around the narrow beam. | Dodging only the beam center must not guarantee safety; the impact/splash footprint matters. No automatic inference of a terrain scar or orbital laser. |
| AW-12 | Create mirage/afterimage-like duplicates around the player that can move together, approach and track the player. | Suggested count is three or four, with potentially a couple more; no hard cap has been chosen. Their depiction is illusory but their combat effect is real. |
| AW-13 | Duplicates have significantly less health than the main creature, but still a meaningful amount, and the player can attack and kill them. | Not invulnerable decorations or necessarily one-hit ghosts. Exact health fraction and rewards unspecified. |
| AW-14 | Staying enclosed by the tracking duplicate ring for long enough causes player damage and restores life to the main monster. | Interpret healed monster as Astral Worm, not Walker. “Energy” appears earlier: additional stamina/energy drain is unresolved. Exact grace period and healing conversion unspecified. |
| AW-15 | The player can escape the tracking enclosure through a few dodges. | Tracking cannot be perfect, unavoidable recapture. Exact escape geometry, pursuit cutoff and dodge count are unspecified; do not require an arbitrary button-count ritual. |
| AW-16 | Morph into a griffin-like form, retain the black inky material, and pounce after the player using suitable Questing Beast move foundations. | Remain in that form for some amount of time, then allow further transformation. No exact duration or copied attack list chosen. |
| AW-17 | Have a sky-to-ground blast pattern centered at/around the creature, beginning with a smaller central impact and successively larger concentric ring blasts. | Central area can be a disk; surrounding blasts are rings/annuli, not increasingly filled disks. Beam source visual, ring count and radii need tuning. |
| AW-18 | Support outward-only, inward-only, outward-then-inward and inward-then-outward versions of the ring sequence. | Both directions are options, not a mandatory reversal every cast. S1 illustrates a center and roughly three surrounding rings; this is not a forced fixed count. |
| AW-19 | A ring blast damages the player when the player occupies that active ring's damaging region. | Safe space inside/outside an annulus must agree with its telegraph. Separate impacts should not accidentally turn the whole area into one continuous filled hazard. |
| AW-20 | Casting the ring sequence may be stationary; moving during it was also left possible. | Owner explicitly leaves this choice open. Do not mark either mobility choice as a settled owner requirement. |
| AW-21 | Rarely allow a paired encounter in which both Astral Worm and Void Walker attack the player. | Exact spawn chance, eligibility, simultaneous-spawn versus arrival timing unspecified. |
| AW-22 | Even more rarely, have Void Walker appear and help the player fight Astral Worm. | Required ordering: P(Walker ally) < P(both hostile); both are uncommon. No numerical probabilities or permanent alliance specified. |
| AW-23 | Astral Worm can appear above water. | S3. This does not establish a boat, water-elemental attacks, underwater form or terrain scarring. Which water bodies qualify remains open. |
| AW-24 | Preserve the owner-approved latest fourth-pass appearance as the visual baseline. | S4. Approval covers that appearance, not all combat correctness or publication. Record the exact asset/commit identifier when available. |
| AW-25 | Retreat to the nearest Wayglass. | S4–S5 resolve the destination. Retreat trigger, reachability policy, navigation and arrival behavior still require decisions. |
| AW-26 | Sometimes Void Walker can ride Astral Worm in any form, including griffin, for an extended period until sufficient damage knocks him off. He can alternatively fight independently. | S4. Optional mounting is not a mandatory pairing. Exact duration, knock-off threshold/recipient and mounting conditions unspecified. |
| AW-27 | Mounted actors retain independent, unchanged health pools. Appropriate piercing or splash attacks can damage both. | S4. Riding is a presentation/combat relationship, not a merged boss HP bar, extra health bonus, or blanket damage immunity. Ordinary single-target hits are not automatically doubled. |
| AW-28 | Astral Worm awards the normal beast bounty and adds no new Echo. Mirages and the allied Walker are rewardless. | S6 explicitly approves this proposal. Use the actual existing bounty policy, not a fabricated reward amount; hostile Walker reward rules are not changed by the allied-only statement. |
| AW-29 | Add corresponding regression tests for the approved reward policy. | S6. Explicit approval is limited to corresponding updates, not unrelated configuration/workflow edits or publication. |
| AW-30 | Put a saddle on Astral Worm while Void Walker rides it. | S7. Preserve the optional any-form mounting rule and unchanged health pools. A recognizable form-fitted saddle, shown only while mounted and removed on dismount, is the implementation interpretation. |

## Attack/readability walkthrough, not new tuning

The continuous identity is a quick, unnatural ink organism: segmented travel, pooling radial spikes, improvised-limb forward trample, chasing temporary-mouth bites, winged movement with a sustained ground-impact beam, tracking killable duplicates with an enclosure life-drain, timed griffin pounces, and alternating-direction concentric blasts. Shape transitions should make it clear these are forms of one creature. This sentence is a synthesis of AW-03–AW-19, not an extra move or a required fixed attack order.

For ring notation, let 1 be the central disk and 2 through N the concentric annuli. Example legal sequences are 1→2→3→4, 4→3→2→1, 1→2→3→4→4→3→2→1, and 4→3→2→1→2→3→4. S1 explicitly mentions repeating the outer fourth blast at reversal; whether every reversal repeats its terminal band remains tuning. Repetition, count, intervals, overlap and center motion need a deliberate implementation decision. The beam/splash move and the concentric sky-blast move are distinct families.

## Open questions and decisions required before treating a build as complete

| ID | Question | Avoid this unsupported assumption |
|---|---|---|
| AW-Q01 | Which existing exceptional-monster stat/behavior baseline applies? What health, damage, speed, stagger, resistance and phase tuning? | Copying exact Walker stats or declaring any numeric value owner-approved. |
| AW-Q02 | What size, segment count, collision footprint and visible form-transition rules? | Importing the Walker's player-sized constraint or resetting HP when form changes. |
| AW-Q03 | Above-water appearance is confirmed by AW-23. Which water bodies and contexts qualify: ocean, lakes, rivers, dungeon pools? What other locations, level/depth gates and cooldowns apply? | Automatically copying Walker/Crystal boats, water-elemental attacks, ocean eligibility details, or underwater behavior. |
| AW-Q04 | AW-25 fixes the retreat destination as the nearest Wayglass. What triggers retreat; nearest by distance or reachable path; how does it navigate, including from water; what happens if none is reachable and on arrival? | Importing Walker door retreat, Crystal water retreat, or Gate no-retreat; assuming teleportation or instant disappearance without a decision. |
| AW-Q05 | Clone cap, lifetime, spacing, spawn telegraph, tracking speed and escape cutoff? Does killing one break the enclosure? | Infinite clones, perfect tracking, or guaranteed enclosure after every dodge. |
| AW-Q06 | Is “energy” drain only HP damage, or also stamina/another resource? Does damage actually dealt determine healing and at what ratio/cap? | Healing from invulnerable/missed hits, stamina drain without a decision, or healing the Walker. |
| AW-Q07 | Are approach/grab words merely pursuit, or an actual command grab/immobilization? | Locking player controls based on ambiguous dictation. |
| AW-Q08 | Beam tracking, collision, walls, elevation, flying over obstacles and landing safety? | Crystal-like dungeon wall phasing, general terrain immunity, or permanent scorch. |
| AW-Q09 | Ring widths/count/radii, telegraph timing, inward/outward variant selection, center tracking and stationary versus mobile casting? | Treating each ring as a filled disk, or requiring both directions on every cast. |
| AW-Q10 | Paired encounter probabilities/eligibility, actor budget, one Walker limit, alliance lifetime, target priorities, friendly fire and accidental player hits? | Permanent friendly Walker or two simultaneous incompatible Walker instances. |
| AW-Q11 | Main/clone death, disappearance, retreat, region exit, save/reload and pause cleanup? AW-28 settles rewardless mirages/allied Walker and normal Worm bounty; who receives kill credit if the allied Walker kills the Worm, and how are mounted death/separation handled? | Reward farming, orphan drains, duplicate rewards or stale alliances. |
| AW-Q12 | How do other moves overlap, cancel or interrupt? Which attacks can coexist with a hostile/ally Walker? | Unbounded simultaneous beam/ring/drain/Walker hazards or no escape window. |

Additional unresolved mounted-mode decisions:

- AW-Q13: Which paired alignments may mount? The owner did not specify whether a player-allied Walker may ride a hostile Astral Worm. Do not assume friendly mounting is approved or disallowed.
- AW-Q14: What damage amount, accumulation window and recipient count toward knock-off? Does damage to the mount count, rider only, both, or stagger? No number was owner-specified.
- AW-Q15: Attachment position/orientation and animation on each form, collision/hit targeting, transition behavior, separation placement, water/elevation safety, arrival/death cleanup, and simultaneous attack budgets require explicit choices.

These are review/design questions, not requests already posed to the owner. Use safe, clearly labeled proposals when implementation needs them; seek owner input where a choice materially changes the design.

## Engineering constraints and recommendations, distinct from source requirements

These are future integration recommendations informed by the repository's existing architecture, not extra owner quotes:

- Inspect current production beasts, movement, renderer and Proving Ground integration before selecting reuse points. Retain one source of truth for visible telegraphs and damaging geometry.
- Bound segments, decorative limbs, clones, beams, collision samples, particles and simultaneous encounter actors. A “ton of legs” is a visual direction, not an unbounded allocation request. Clone lifetime and cleanup should be finite/bounded even though the owner did not specify seconds.
- Keep tuning in data. Seed encounter choices consistently with the game's deterministic world rules. Do not regenerate existing journeys or silently alter eligibility in existing histories.
- Preserve additive save compatibility and unknown state under the repository's current schema policy. Decide whether transient clone/attack state resumes or safely clears; never duplicate rewards or heal on reload.
- Test pause, scene unload/re-entry, player death, monster death, ally departure, offline play and multiple updates at varying frame rates. Active-time damage/healing should not tick while paused or catch up invisibly after unload.
- Clamp healing to the chosen maximum HP; do not increase maximum HP or give separate full health pools to forms without an explicit design decision. This is a proposed invariant, not an imported Blob mechanic.
- Make the enclosure test robust with destroyed, coincident or fewer-than-three clones; define an actual safe escape rather than relying on visual suggestion. Document the chosen geometry.
- Define alignment and collision explicitly for an allied Walker. The existing hostile Walker attack kit must not accidentally damage the player, their boat or noncombat progression through an unintended faction leak.
- Plan mobile readability, reduced-motion treatment and bounded render/pathfinding work. Black material still needs a readable silhouette against dark scenery. Reference inspirations do not supply licensed production assets.
- Implementation and publication remain governed by the separate task and repository instructions. S6 explicitly approves the corresponding reward regression-test updates; it does not grant unrelated protected-path changes or publishing. This documentation worker remains docs-only.

## Future acceptance and reviewer matrix

Every row is **NOT VERIFIED IN THIS HANDOFF**; the staged document does not assess implementation status. S4 supplies owner appearance approval only, not test evidence. These are evidence targets, not claimed passing tests. Future reviewers should cite an exact commit, test name/output, fixture and capture before updating status.

| Review ID | Requirements | Required evidence |
|---|---|---|
| AW-V01 | AW-01–06 | Model turntable/gameplay capture verifies canonical name, elongated segmented default, black ink, flexible motion and quick encounter feel. Inspect baseline/tuning table and ensure no copied franchise assets. |
| AW-V02 | AW-07 | Pool transition and radial spike fixture; safe/out-of-range versus in-range hit cases match actual geometry and recovery. |
| AW-V03 | AW-08–09 | Moving trample with visibly excessive mixed limbs; repeated pursuit bites, temporary grotesque mouth and retraction. Collision and interruption tests. |
| AW-V04 | AW-10–11 | Flying elongated insect-wing form and sustained downward beam capture; center hit, splash hit, outside splash safe, wall/elevation behavior and safe landing per chosen policy. |
| AW-V05 | AW-12–13 | Clone spawn/count cap and finite lifecycle test; lower but meaningful HP, killability, destroyed clone removal and no accidental full-health respawn. |
| AW-V06 | AW-14–15 | Enclosure grace and damage/heal tests; chosen energy semantics documented; actual escape by a few dodges demonstrated with tracking active; broken enclosure/degenerate cases, invulnerability and healing cap. |
| AW-V07 | AW-16 | Timed black-ink griffin form, pounce reuse and return transition; HP continuity and no hidden reset. |
| AW-V08 | AW-17–20 | All four direction modes with deterministic fixtures; center disk versus annulus boundary tests, safe annular hole, no hit between blast windows, chosen center/mobility policy and readable telegraphs. |
| AW-V09 | AW-21–22 | Forced hostile-pair and ally-pair fixtures plus seeded frequency/eligibility inspection establishing ally is rarer; no fabricated owner probabilities. Ally targeting, friendly fire, rewards and departure tests. |
| AW-V10 | AW-23, AW-Q03–04 | Above-water appearance fixture and capture; explicit water-body eligibility and safe movement decisions. Other spawn/location/retreat decisions; old-world generation/save regression checks. Do not inherit Walker boat/door behavior, Crystal water attacks, or Gate no-retreat rules. |
| AW-V11 | AW-Q05–12 | Death, unload, pause, reload, re-entry, duplicate rewards and orphan hazard/clone cleanup regression evidence; no free healing from elapsed inactive time. |
| AW-V12 | Engineering recommendations | Worst-case clone + form + paired Walker fixture on target device; bounded actors/projectiles/render/search, reduced motion, offline/PWA integration and production-backed Proving Ground evidence. |
| AW-V13 | AW-24 | Identify the exact owner-approved fourth-pass model artifact and preserve baseline captures. Compare later rendering changes without presenting appearance approval as mechanics or release approval. |
| AW-V14 | AW-25 | Nearest-Wayglass selection, no-Wayglass/unreachable cases, movement from land/water, save/reload and arrival under the chosen policy; no accidental inherited door retreat or Gate no-retreat. |
| AW-V15 | AW-26–27, AW-Q13–15 | Mounted and independent fixtures, all morph forms including griffin, extended riding and threshold-based knock-off. Verify unchanged separate HP; eligible piercing/splash damages both once per intended hit, ordinary targeting does not auto-double; safe separation/death/retreat cleanup. Record all tuning decisions. |
| AW-V16 | AW-28–29 | Normal Worm bounty exactly once, no new Echo, zero mirage/allied-Walker rewards, existing hostile-Walker policy preserved. Regression coverage includes repeated death callbacks, save/reload, mounted kills and decided allied-kill credit. |
| AW-V17 | AW-26–27, AW-30 | Mounted captures show a recognizable saddle correctly positioned on every supported form, with rider/saddle alignment maintained during morphs; dismount, death, retreat and reload do not leave an orphan saddle. Unmounted forms retain their approved appearance. Saddle visuals must not change health pools or hit policy. |

## Handoff completeness checklist

- [x] Sources S1–S7 preserved with exact owner wording and IDs, including the approval question/answer pair; unrelated Gate correction explicitly excluded from Astral Worm scope.
- [x] Final Astral Worm spelling and default-form correction recorded.
- [x] Every distinct described morphology, attack family and paired-encounter outcome mapped to stable IDs.
- [x] Correct rarity hierarchy and open tuning preserved without invented percentages.
- [x] Reference reuse distinguished from copied franchise assets and implementation claims.
- [x] Major ambiguities, integration risks and future acceptance evidence identified.
- [x] Fourth-pass appearance, nearest-Wayglass retreat, optional rider with independent health, and reward/test approval recorded.
- [ ] Remaining owner/tuning decisions on unresolved questions.
- [ ] Implementation, tests, rendered model review and gameplay review.
- [ ] Separate feature release scope and any required publication approval.

This document is ready for a future implementation/review agent, including Claude/Anthropic, to compare an actual build to the original description. It is not evidence that the feature is coded, committed, uploaded, tested or published.

## Latest clarification: above water (S3)

AW-23 adds above-water appearance to the design; it does not change the black inky identity or established attack families. A future model/implementation worker should support a visible above-water presentation, while leaving exact surface clearance, locomotion, collision and qualifying water bodies as explicit decisions. Do not silently add a boat, swimming/submerged form, watery attack reskin, permanent scar, or terrain destruction. The Gate no-retreat/death statements earlier in S3 concern a different creature and grant no Astral Worm retreat rule.

## Latest clarification: appearance, Wayglass retreat, riding and rewards (S4–S6)

The latest fourth-pass appearance is approved. Astral Worm retreats to the nearest Wayglass, not a dungeon doorway or water by default. Void Walker may ride any form for an extended period, then be knocked off by sufficient damage or fight independently. Keep both health pools unchanged and allow suitable piercing/splash hits to affect both. Knock-off tuning, attachment placement, faction compatibility and transition safety are still choices to make visibly, not owner-provided numbers.

The separate explicit question/answer approval in S6 settles normal beast bounty, no new Echo, rewardless mirages and allied Walker, and the corresponding regression-test updates. No publication authorization is inferred from appearance approval, destination confirmation, or S6.

## Latest clarification: mounted saddle (S7)

The owner requests a saddle while the Walker rides Astral Worm. Show it as a recognizable, form-fitted riding accessory rather than a permanent mutation of the approved creature anatomy. Remove it with the mounted state; exact saddle material, ornament and attachment geometry are implementation choices. The builder reports the render is implemented and a new sheet was inspected/delivered by the parent, but this documentation handoff independently verifies neither code nor captures and supplies no publication approval.
