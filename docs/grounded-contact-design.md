# Grounded actor contact design

Status: **queued after character and camera work; not implemented**. Read-only architecture findings recorded 2026-11-07 against the r820/neck-repair source. This document does not reserve a release, claim test acceptance, or authorize publication. Re-read current source and project instructions before implementation. Preserve concurrent character, weapon and camera work.

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
