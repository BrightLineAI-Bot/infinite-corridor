# Close View full combat contract audit

Date: 2026-11-08  
Audited source: `6288b273` (`claude/close-view-combat-sweep`)  
Status: prepared source baseline, **not live**

This is a read-only combat-contract audit. It makes no damage, balance, origin, runtime, test, configuration, release, or generation change. The audited tree includes the shared accepted-action visual-clock preparation and primary-combo preparation; those results are not evidence for other isolated candidates and are not a combined-candidate acceptance claim.

## Result

No new deterministic combat defect was reproduced. Three focused runs completed with **170 tests passed, 0 failed**. No assertion was added or weakened.

Run 1 (123 passing) covered the production action, presentation, exact-resume and bounded-work seams for primary attacks, Iron Fists, tools, spells, Echoes, Shadow Clone, Shadow Boxing, Orbit Volley, Corridor Golem and projectile anchors.

Run 2 (27 passing) filled the remaining spell-family coverage for Fire Burst, Imbue Weapon and Essence Walk, including pause/resume and 60-second bounded spam witnesses.

Run 3 (20 passing) exercised discipline cooldown/duration modifiers, Quickening jumps, Rift Step and its secondary form, skill glyphs, buff clocks and target/slot routing.

These are source/runtime contract results. They do not establish hosted GPU appearance, normal-speed feel, physical-phone performance, hardware multitouch, or the behavior of any separately prepared contact/tool/armor candidate.

## Accepted versus refused actions

- Accepted primary inputs alone advance their 1/2/3 presentation sequence. Queued Echo damage neither advances nor replays the body action.
- Accepted fist, primary and tool identities are latched in the current presentation record, with a saved presentation deadline independent of the canonical combat clock. Switching equipment does not rewrite an action already in recovery.
- Successful newer casts, Aperture skills and jumps cancel an accepted tool action as specified. Refused casts/skills and expired actions preserve the accepted presentation and mechanical recovery.
- Tool recovery, spell cooldown, golem cooldown, stun/confusion/grip/slow/burning/frenzy and accepted visual clocks retain remaining time across pause/reload.
- Malformed explicit action records normalize without reviving combat; unknown nested fields survive migration/save/reload where the compatibility contract permits them.

## Canonical action coverage

### Primaries and Iron Fists

- Salvage Blade fallback, Verge Cleaver 1.75-tile/180-degree arc, Cinder Pike 2.45-tile/32-degree thrust and Iron Fists are exercised through the actual `Game` attack paths.
- On this prepared primary baseline, only successful real attacks cycle the three accepted stages; 30/60 fps witnesses preserve distinct Cleaver cuts and Pike thrusts without source-foot displacement.
- Iron Fists preserve the actual dash punch, jab and uppercut sequence. Charge eligibility, no-target behavior, wall-stopped rush, combo timeout, finisher condition, alternating accepted lead metadata and queued-primary-Echo coexistence pass.
- Mechanical contact remains immediate under the existing 240 ms combat clock; the independent visual deadline is presentation only and does not invent startup damage or extra hits.

### Tools and variants

- Spark/standard ranged behavior, Lumen Spindle boomerang, Needle Caster, +6 Blunderbuss cone, Rift Bombard/Cluster Shell, Hammerfall/Corridor Golem, Great Sweep/Mirage of Blades and Aether Orrery tap/charge/overcharge/orbs are covered by actual production calls.
- Hammerfall, Great Sweep and Orrery each retain their own recovery/resource rules. Corridor Golem is bounded to its existing retarget/punch/sink lifecycle; the golem cooldown follows tool cooldown modifiers.
- Orrery cleanup passes for pause, death and Wayglass travel. Its 60-second forced-input witness remains within caps and finite.

### Twelve spells and six Aperture disciplines

The canonical spell table contains Cinder Dart, Ember Ring, Grave Sun, Shadow Clone, Gravity Well, Stillpoint, Aegis, Shadow Boxing, Fire Burst, Imbue Weapon, Essence Walk and Orbit Volley. Coverage establishes:

- independent slot cooldowns and preset swapping;
- accepted target selection (lock, nearest eligible foe, fresh tap, range clamp) without stale-tap misdirection;
- field pulses and lifetimes; Gravity Well pull/projectile bend/swallow; Stillpoint slow/projectile removal;
- Aegis, Shadow Boxing, Imbue Weapon and Essence Walk buff durations and exact pause/resume;
- Fire Burst's five accepted shells; Orbit gather/early/perfect/timeout launch and wall stop;
- bounded 60-second all-spell pressure with finite effects/projectiles and no NaN.

The six disciplines are Ember Form, Quickening, Veil Guard, Force Channel, Aerial Step and Rift Step. Existing focused coverage establishes learned/rank/cooldown/refusal behavior, successful-action interruption, zero-duration Rift Step flash, and persistence of discipline cooldowns while Essence Walk affects spells only. This audit did not reinterpret their balance or movement rules.

### Shadow Clone, Shadow Boxing, Orbit, Golem and Echo

- Shadow Clone hold/tap placement, correct A/B held-button ownership, wall refusal, follow, copied melee/ranged actions, swap/step-in, timeout and area-exit cleanup pass. A Shadow Boxing Echo clone swings only and fires no shots.
- Shadow Boxing carry-to-target behavior, damage/heal/guard modifiers, tool/Fists compatibility and duration pass.
- Orbit Volley preserves gather-versus-follow-up semantics, perfect timing, timeout and vortex behavior. Echo produces the documented repeat without granting a free new cast.
- Echo triggers cover dodge, land, kill, hurt, spell and shot events plus continuous Saint/Lantern behavior. Primary Echo preserves mechanical damage clocks without taking over accepted hero action identity.

## Honesty, anchors and vertical presentation

- Actual projectile producers latch their committed visual launch sockets. Split shots inherit the original socket even when age resets; Drone Swarm retains its orbiter anchor over area save/load.
- Close View native combat presentation preserves committed directions for ordinary enemy impacts and crawler bite/leap phases. Native support receives the full apex lift while the captured sprite billboard remains at its authored projection.
- The audit found no deterministic evidence of a projectile changing gameplay XY, hit physics, damage or lifetime to satisfy presentation. Hosted GPU review is still required to judge whether every hand/muzzle origin and air height looks convincing.

## Pause, death, reload and cleanup

- Pause shifts the audited wall-clock timers without letting them expire and prevents negative frame time on resume.
- Death clears grip, slow, confusion, stun and glide; ordinary recovery remains immediate while the intentional world-beast pause remains distinct.
- Reload retains tool/golem cooldowns and status durations as remaining time, resumes the Rite, and preserves accepted action records without reviving expired ones.
- Wayglass travel clears transient traversal state and Orrery state; Shadow Clone ends on area exit.

## Interaction, escape and work-bound boundary

- Dodge-to-blocked lava/abyss stops at the reachable endpoint and does not apply a hazard from an unreachable requested position.
- Iron Fists rush stops at walls; Shadow Clone step-in refuses an invalid stand point; Orbit's launched ball stops at a wall.
- Effect/projectile pressure checks are bounded and finite. Orrery and all-spell 60-second stress witnesses remain within their established caps.
- Ordinary grounded body contact/overlap recovery is **not part of this baseline** and is not claimed validated here. The project already records that seam as a separate prepared contact pass. Its collision/Act/pickup/escape acceptance must be run on that exact candidate and must not be inferred from this combat-clock audit.

## Priorities and remaining evidence

1. Root-hosted QA should exercise accepted versus refused action visuals at normal speed, especially casts/tool use while switching and while moving.
2. Run the separate contact candidate's exact body-separation, corner/door sliding, overlap escape, pickup and Act-priority suite before integration; do not combine its result with this baseline informally.
3. Hosted inspection should compare actual hand/muzzle origins, projectile air heights, spell fields, Echo afterimages and recovery poses. Automated anchors establish consistency, not visual quality.
4. Final combined acceptance still needs pause/death/reload transitions, clustered foes and bounded work on the exact integrated candidate.

No minimal remedy is proposed because this audit reproduced no new defect. Any hosted finding should be recorded with exact candidate, scenario, accepted/refused input, resource/cooldown state, presentation clock and observable mismatch before changing its owning seam.
