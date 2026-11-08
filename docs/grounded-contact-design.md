# Grounded actor contact design

Status: **isolated source candidate; not integrated or published**. Original read-only architecture findings were recorded 2026-11-07 against the r820/neck-repair source. The 2026-11-08 implementation and offline evidence are recorded below. This document does not reserve a release or authorize publication. Preserve concurrent character, weapon and camera work.

## Objective and bounded scope

Implement player-versus-grounded-hostile body contact, shared by both views. Keep enemy-enemy crowd separation, pushing physics and large world-beast collision out of this focused pass. Those are separate mechanics with substantially wider movement dependencies.

The important integration risk is movement consequences calculated before movement. In `src/game.ts`, requested `nx/ny` drive section transitions, raft occupancy, swimming and lethal-terrain checks before `moveAxis` runs. `hazardWhereMoved` also returns open lethal terrain without probing. Adding actor checks only to the final mover could kill a player who actually stopped safely behind an enemy.

## Proposed interface

Keep the current terrain-only behavior of exported `moveAxis` when no contact context is supplied. Add a final optional contact argument:

```ts
moveAxis(entity, dx, dy, map, width,
         allowLethalTerrain, onStep, allowMarineTerrain,
         contacts = null)
```

The context should expose a pure segment-clipping operation, using explicit movement identity rather than reference equality with `entity`: the hazard probe is a copy of the player.

```ts
contacts.clipAxis(subject, fromX, fromY, dx, dy, out)
```

`subject` identifies the actual player/enemy and its physical mode. `out` is reusable scratch containing the allowed scalar fraction and contact reason. No renderer imports, saved state, damage callbacks or enemy pushes.

At Game level, provide one consistent movement adapter for player/enemy ordinary displacement. Pass it explicitly into `updateEnemyAI` as an optional trailing parameter; production callers supply it, standalone legacy callers retain terrain-only defaults. Use it inside `packWorld.move`'s grounded branch. Do not add a global mutable current-Game collision context.

For player locomotion, factor a side-effect-free reachable-motion probe using the same terrain/contact solver, then base movement-dependent consequences on that result. Actual execution must reproduce its accepted substeps, including existing drone ceiling rejection and scar/fall callbacks. Do not merely substitute endpoint deltas and run a different slide path. If necessary, record accepted substeps into a preallocated bounded trace for commit. This is the difficult portion worth reviewing before implementation.

## Physical policy

Put a frozen `ACTOR_CONTACT` table and eligibility/radius helpers in `src/combat.ts` or a dedicated pure module.

- Use ground centers consistently, approximately `(x + .5, y + .69)`, matching the existing footprint's midpoint. Correct for `riderShift` once.
- Start with player radius `.26`; enemy radius uses existing `enemyBodyRadius` for ordinary supported actors. Do not enlarge terrain footprints or change attack radii.
- Collision radius is not attack reach. No damage, cooldown, stagger, dodge-cost or invulnerability changes.
- Scope initially to on-foot grounded player versus ordinary grounded hostile combatants, including ordinary bosses and grounded pack creatures. Exclude explicitly identified major world-beast/mount/sea controllers until their movement routes are supported; document those exclusions rather than silently implying universal coverage.

| State or route | Initial policy |
|---|---|
| Ordinary walk, backpedal, chase, patrol | Solid in both directions |
| Grounded dodge | Solid; retain direction, 260 ms movement and 420 ms invulnerability clocks |
| Ordinary grounded lunge/zigzag/dash | Solid movement; preserve attack phases and damage evaluation |
| Dead actor | Nonblocking immediately |
| Hidden underground travel, `phasing`, `phases`, mist/swarm travel | Nonblocking |
| Flying/hovering actors, `aloft` | Nonblocking in this grounded-only pass |
| Shielded, stunned, recovering or merely `untargetable` | Still solid if otherwise eligible |
| Ordinary hostile summon | Solid; no blanket `summonedBy` exemption |
| Friendly companion, player clone, NPC, ambient passive | Nonblocking for this pass |
| Teleport, arrival, respawn | Preserve destination rules; overlap escape policy below |
| Boat, mount, glider and special world-beast movement | Preserve existing behavior; explicitly outside first pass |

Do not use `untargetable` as a ghost predicate. It also describes turtle shell, ice shield and ordinary evasion. Likewise, reduced opacity is presentation, not a reliable physical classification.

For vertical separation, derive physical support from simulation terrain/lift state, never visual bobbing. Ordinary jump alone should not turn collision off: it otherwise becomes a pass-through exploit. Exempt genuinely separated flight/drone/sky states. Keep grounded contact only where support heights are within a conservative data threshold; start with less than one terrain level, and test slopes/platform edges. Do not reuse `bodyBlowReaches`: its flying exception intentionally permits attacks between heights and is unsuitable for collision.

## Solver and overlap behavior

- Preserve current X-then-Y terrain substeps, maximum `.16` per axis.
- Clip each attempted segment to the earliest circle contact analytically. An endpoint-only test misses grazing or high-speed crossings.
- Continue the remaining free axis for sliding. No automatic tangent steering when the input directly faces an obstacle.
- Recheck terrain and height permission at the clipped destination; all committed motion must still satisfy the existing mover.
- Do not push the other actor. This avoids feedback loops, wall penetration and order-dependent crowd explosions.
- Resolve simultaneous equal contacts deterministically by stable actor identity.
- Bound new work: enemy movement checks only the player; player movement queries nearby eligible actors once, then checks that bounded local set per substep. Avoid all-pairs separation. Never cap candidates by silently omitting a nearby blocker.
- Place an explicit maximum on accepted contact substeps for malformed/extreme requests; stop at the last validated point, never enlarge steps to consume an over-budget displacement. Choose the limit above all current ordinary movement/dodge/lunge requests.

For valid old saves that already overlap, do not relocate during load or pause. Establish runtime-only escape allowances for pairs already overlapping at restoration/teleport/materialization. Permit movement out; remove the allowance immediately after separation, then prohibit reentry. Do not create allowances for ordinary movement collisions. At exact coincident centers, honor the player's requested escape direction instead of selecting an arbitrary push. A paused save round trip must preserve coordinates exactly. This avoids hidden migrations and forced damage/falls.

## Exact integration audit

Required ordinary routes in `src/game.ts` (line locations refer to the audited r820/neck-repair source and may shift):

- `moveAxis` near 983.
- `updateEnemyAI` near 2046: patrol, ordinary chase, detours and melee-pattern dash.
- `hazardWhereMoved` near 3262 and the player update block around 7950-8050.
- `packWorld.move` around 5115, preserving explicit phasing branches.
- Pack `displacePlayer`, trap pulls and elite gravity if they affect in-scope grounded player movement.
- Any in-scope direct position nudge, such as glyph knockback around 3377.

Do not casually wire `moveWalkerGround`, sea displacement, special Stalker free movement or teleport branches into the ordinary adapter: each carries separate terrain/lifecycle rules. The existing native creature roster includes multiple controller families, so acceptance must state which routes are covered.

## Meaningful acceptance tests

Add focused tests, retaining existing `tests/prototype.test.ts` wall-slide/tunneling and dodge contracts:

1. Real Game player walks and dodges toward stationary Ashling/Brute; stops outside the combined radius without changing dodge clocks.
2. Real ordinary AI and grounded pack chase cannot enter a stationary player; attacks still become reachable.
3. Diagonal contact slides; head-on contact stops; corner/wall/doorway contact never moves either actor into blocked terrain.
4. High-speed crossing and grazing segments cannot tunnel; over-budget requests stop safely.
5. An enemy before open lava/pit prevents movement and prevents false hazard death; stepping around it onto the hazard still kills normally.
6. Different support heights, ramp approach, ordinary jump, actual lifted drone, flying foe and phase foe follow the matrix.
7. Shielded/untargetable grounded actor remains solid; hidden burrow/mist actor does not.
8. Old-save coincident and partial overlaps preserve paused coordinates, allow escape, and reject reentry after separation.
9. Two nearby blockers and reversed array order produce stable valid results.
10. Close View enabled/disabled produces identical position, damage, action clocks and snapshots.
11. Terrain-only `moveAxis` callers retain previous results; no added persistent keys or generation changes.
12. Instrument contact work under the existing maximum encounter fixture; assert no all-pairs growth or unbounded retries.

No product question is necessary for these defaults. The implementation must clearly call this ordinary grounded contact, with the excluded special controllers recorded as remaining work. The preceding audit was source-only. This document records design and acceptance criteria; it is not implementation, executed-test evidence or physical-phone performance evidence.

## Isolated contact candidate, 2026-11-08

Prepared on `claude/close-view-grounded-contact`, base `a2685814`. Source ownership is `src/actor-contact.ts`, the movement seams in `src/game.ts`, this appendix and the new `tests/grounded-contact.test.ts`. The coordinator owns build/service-worker registration and integration. No save, generation, release, configuration, existing test or balance table was changed by the specialist. The block-rendering work below is a separate candidate and is not implemented here.

The pure helper performs swept circle contact using the shared ground-center offset `(.5,.69)`, player radius `.26`, and existing `enemyBodyRadius`. The common offset cancels in pair distances. It retains X then Y terrain substeps of at most `.16`, clips each to earliest body contact, then validates terrain at the clipped position. It never pushes or relocates either actor. Equal contacts take the minimum scalar fraction, independent of enemy array order. Partial old overlaps permit nondecreasing separation; exact coincidences allow the requested escape direction. No load-time change or saved allowance is needed.

Player locomotion records accepted substeps in a reusable trace **before** section, hazard, swimming and raft consequences. Commit executes that same trace and invokes the existing scar/fall callbacks once. Lifted drone motion is excluded and continues through its original ceiling callback; the contact preflight never mutates lift state or runs that callback speculatively. Grounded mech walking is included, with its overworld `voidSuit` permission mirrored in the probe. Actual boost, drone lift, gliding, riding, occupied skiff and mech wading retain their separate controllers. Ordinary Jump does not phase through bodies. A real `airElev` platform launch is physical support above the gap and clears lower actors.

Ordinary AI patrol/chase/detour/lunge, grounded pack movement, pack push/pull, trap pull, elite gravity and glyph nudge use contact. The two direct combat loops, Fists and Shadow Boxing, retain their original quarter-tile `canStand` guards. A pure sweep-clear combat step assigns the exact original endpoint, preserving numeric clear-path motion. Only a body intersection invokes the terrain/contact solver. Strike origins remain computed from the accepted post-dash position; damage, charge, rush distance, hit predicates, combo clocks and invulnerability formulas were not edited. The coordinator must preserve the separate Fists candidate's pre-dash presentation capture and metadata when merging these two small loop changes.

Eligibility is explicit: dead, friendly/companion, NPC, passive/ambient, unprovoked skirmish, hidden-burrow, mist, flying/aloft and phase states do not block. Merely shielded, recovering, stunned or `untargetable` grounded actors and ordinary hostile summons do block. Large ordinary grounded bodies use their existing radius. Major world-beast, Questing Beast, Stalker, sea and astral controllers are excluded, including their dedicated movement/teleport routes. The special `voidWalker`, `psychicCrystal`, `astralWorm`, `astralMirage`, `lightningGiant`, `mountainTurtle`, `briarStag`, `ashenMoth`, `crimsonDragon` and `doomChaser` kind routes remain outside this pass. Legacy Veil Moths and Cinder Wisps are airborne exclusions. There is no enemy-enemy separation or new navigation search. A living enemy can still deliberately obstruct a narrow passage; retreat, combat and existing Act/stair interactions remain available. This is not a guarantee against every possible crowd trap.

New work is bounded per movement request: at most 256 X/Y substep pairs, no enlarged step when the request exceeds that budget, a 2,048-double (16 KiB) trace per Game, and one reusable candidate list. Player broadphase scans its existing enemy list once and retains every eligible intersecting candidate; it never silently drops a nearby blocker to meet a cap. With E candidates the narrowphase has at most 512E circle checks; an enemy query checks only the player. This is not all-pairs separation. Runtime counters expose queries, checks and budget stops. A 300-body test verifies inclusion and the one-player enemy query. Those operation counts are not a phone performance measurement.

Both real frame drivers (`main.ts` and `proving-ground.ts`) cap dt at `.05`. The 40.96-tile per-axis budget is above the existing ordinary requests: melee pattern lunges are at most 1.7 total and already subdivided, Fists/Shadow Boxing submit .25 steps, glyph Tether is .35 and Maelstrom at most 1.2, trap pull is 5 tiles/s, elite gravity 1.65 tiles/s, and pack forces include Crystal 9 tiles/s and fixed Doom push 2.5. Ordinary pack dash/charge movement is submitted in frame-sized steps; specialized long-range phase/teleport/world-beast controllers retain their own routes. The budget protects malformed/extreme contact requests; no general Game dt clamp or legacy terrain-only mover cap was added. Future movement producers must remain below the contact request budget or receive an explicit reviewed adaptation.

### Offline witnesses and verification

An actual `Game.update` probe using seed `CONTACT-AUDIT`, a quiet lab instance with an open floor, player `(3,5)` and Root Brute `(5,5)`, moving right for 60 × .04 s, reproduced body overlap in both views before the change: minimum center distance `.0472`. The contact candidate held minimum distance `.73600000312`, matching `.26 + .476`. This is simulation evidence, not hosted visual acceptance.

The new 20-case regression file covers two-way blocking, grazing/high-speed sweeps, diagonal wall slide, narrow-door retreat, old/coincident overlap escape, order independence and per-Game isolation, exclusions/untargetability/summons, separated support/high platform jump versus ordinary Jump, work bounds, exact clear terrain traces, actual Game walk/dodge view parity and clocks, actual ordinary AI/pack attack reach, prevented false lava death, four section exits, below-level raft occupancy, schema-14 overlap resume/pins, grounded mech/void permission, push/nudge dodge immunity, legal stair Act destinations, and clear/blocked Fists and Shadow Boxing with canonical post-dash effect origins.

Executed offline commands:

```text
node --test tests/grounded-contact.test.ts tests/building.test.ts tests/dungeon-traps-523.test.ts tests/glyphs.test.ts tests/interior-terrain.test.ts tests/interior-v4-arrival.test.ts tests/great-buildings.test.ts tests/fallen-pause-329.test.ts tests/close-view-combat-contract.test.ts
# 76/76 passed before adding the two combat-loop cases (18 new + 58 existing).

node --test --test-name-pattern="movement transition supports negative|ordinary movement crosses|sprite-footprint movement slides|game defensively caps movement|stationary dodge uses movement" tests/prototype.test.ts
# 5/5 existing movement contracts passed; the server tests were not selected.

node --test tests/grounded-contact.test.ts tests/iron-fists-489.test.ts tests/brawler-485.test.ts tests/void-walker-terrain.test.ts
# 61/61 passed after combat-loop and physical airElev integration (20 new + 41 existing).

npm run build
# Passed: static offline PWA release 825 + Proving Ground PG-1; actor-contact.js
# registered by the coordinator in build and both service-worker module lists.
```

Every existing assertion and digest remains untouched; `git diff --check` passed. No local server, browser automation or full `npm test` was run because of the established local network stop. Hosted/GPU/phone acceptance remains outstanding. In particular, supported graph/physics tests cannot establish Close View silhouette clearance or crowd feel on hardware.

### Separate traversal-block diagnosis, no fix in this candidate

The canonical build mechanics already distinguish **stone perch** from **wood wall**: stone is unblocked, one physical level, two stack; wood is intentionally a blocked wall. The existing limit is five physical records and ten active seconds. Fresh save material selection is wood. Rebuilding those mechanics would not address the reported visual issue.

Disposable source probes used actual `Game.buildAt` and `closeViewStatic`, not a mock build implementation:

| Matched site / material | Simulation result | Native static geometry witness |
|---|---|---|
| `CONTACT-AUDIT`, PG `keep`, `building:CONTACT-AUDIT:-4:0:keep:3:f1`, tile `(8,4)`, stone | `blocked=false`, `buildLevel=1`, `elev=1` | Neither live nor rebuilt legacy-v2 static geometry emitted raised block vertices: a genuine legacy rendering gap. |
| Same legacy-v2 site, wood | `blocked=true` | Rebuilt wall geometry spans z 0–2.4; live legacy wall-cache refresh can lag up to 500 ms. |
| Same seed, PG `terrain-ramps` current v4, tile `(19,13)`, stone | Base elev 3, stone elev 4 | Top z 1.36 above ground 1.02: one `.34` level, not a whole wall. |
| Same v4 tile, wood | `blocked=true` | Wall z 1.02–3.42: intentional 2.4-height wall. |

The v4 stone probe also raises the generic local ceiling by `.34`; its treatment needs deliberate review in a separate rendering candidate. The source diagnosis does **not** establish that the owner's report was merely wood selection. Hosted PG currently lacks the production Pack/Supplies material selector and resources, so an honest stone-versus-wood interactive comparison requires an explicit quiet block fixture. Production selection is Pack → Supplies → Build with → Stone block / Wood wall, then Build. The coordinator owns any actual hosted CUA reproduction; no source probe is presented as such.
