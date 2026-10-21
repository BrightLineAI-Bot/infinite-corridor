# Void Walker implementation checkpoint — 2026-10-21

This is a **local work-in-progress**, not a release approval. Read [the owner design record](void-walker-design.md) and [verbatim transcript](void-walker-source-transcript.md) first. This companion records current code, evidence, and deviations so a later Claude/Anthropic reviewer can challenge the implementation rather than infer intent from it.

## Candidate and boundaries

- Branch: `claude/void-walker-251`, based on live r249 commit `4a43f3ccc5cdbc918310ea41f8e53425a1cedac3`, tree `28e5028bfdba9d85c2144acf8ec29ec6bdf03e18`.
- Implementation checkpoint only. Release numbers remain 249 until packaging a reviewed release. No remote push, PR, merge, or deployment for this work.
- No existing test, configuration, workflow, generator, or release script has been modified. New Void Walker tests were explicitly approved by Tim.
- Independent review is **pending**. Attempted review workers encountered model capacity; their absence is not approval.

## Requirement-to-code evidence

These rows describe evidence, not blanket PASS judgments. Automated checks do not establish subjective visual acceptance, balance, accessibility on every device, or mobile performance.

| Owner IDs | Implemented path | Current evidence / limitation |
| --- | --- | --- |
| VW-A01 | `MONSTER_PACK.voidWalker`, `applyPackBossForm`, `BODY.voidWalker` | New combat tests assert scale 1, radius .38, no giant boss inflation or borrowed hybrid attacks. Actual renderer side-by-side shows the Wayfarer and Walker at approximately .80-tile body height. Dark clothing, hood, galaxy face remain provisional art. |
| VW-A02–A04, B01–B07 | Ten `void*` attack modules, `voidBasicStart`, `voidRend`, `voidWraith`, `tickVoidEffect`, `drawVoidEffect` | New combat tests cover named attack output, warned impacts, finite straight wraith travel and three swings. Native effect sheet shows open hands, claws, swords, slashes and spikes. Practical readability at mobile size remains untested. |
| VW-A05–A06 | `WORLD_BEASTS.voidWalker`, `worldBeastForDungeon`, `isDungeonHunter`, `walkerDungeonRoute`, `advanceWalkerRetreatSearch`, `Game.walkWalkerRoute` | New integration tests exercise overworld and dry-dungeon spawn, separate Crystal water gating, offscreen patrol within the existing actor cap, bounded long-range entrance retreat and safe fallback. Ordinary Walker movement does not inherit Crystal phasing. |
| VW-A07 | Source transcript, owner design record, this report; native render artifacts | Requested notes are in the repository working tree. Model, effects and animated simulation artifacts are local validation outputs, not published game assets. |
| VW-C01–C03 | `voidOpenRifts`, `voidEvade`, `Game.walkerSafeTeleport` | New tests cover persistent portal emission, warned evasion, cooldown and legal landing. Teleports reject lethal footprints, overlap, bounds and disconnected sealed regions. Cache invalidates on in-place gate/topology/elevation changes. |
| VW-D01–D07 | Tracking `voidRift` effects with `activated` flag and mixed output groups | New tests produce counts 3, 4, 5 and 6, moving-player tracking, one activation per rend and overlapping wraith/beam/Walker outputs. The one-activation interpretation remains I-04, not a silently rewritten quote. Escape fairness still needs human playtesting. |
| VW-E01–E04 | `voidHorizon`, `voidBeam`, production pull/hurt callbacks | Tests cover pull, independent core damage, pulsar and non-pulsar variants, and fixed-direction 2–3-pulse sequences. Native animation demonstrates this in the same production renderer. |
| VW-F01–F07 | `voidNovaRun`, `consumeVoidTerrain`, `applyVoidScars`, `Game.loadArea`, `tileBase` | Charge and fixed origin, terrain callback timing, permanent safe scar floor, save normalization and exact-area reload are tested. **PARTIAL / design decision pending:** unsafe progression/elevation regions are refused atomically rather than consuming all walls. See below. Overworld is visual/combat only, with no permanent terrain deletion. |
| VW-G01–G04 | `voidNova` phase timing, `voidParticle`, `voidNovaEruption` | Tests cover 2–3 finite outward waves, swept collision with surviving walls, independent particles and post-burst eruptions. Native animation shows the field, particles and aftermath. |
| VW-H01–H05 | `voidStartDash`, `voidDashStep`, `voidAfterimage` | Tests cover repeated player-local teleports, target snapshot and straight motion, swept body contact, continuing outside the anchored region, and one-second damaging trails. Straight movement stops at surviving blocking geometry. |

## Explicit implementation choices and outstanding design acceptance

1. **Protected-region exception, not an owner requirement.** Tim explicitly asked for all dungeon walls inside the void radius to be consumed. The prototype currently refuses the entire terrain batch if it intersects a progression gate/shortcut/structural boundary, would join formerly disconnected floor regions, or would create an unsafe elevation transition. Merely preserving the gate tile was proven insufficient: the blast could excavate around its ends. This exception requires Tim's acceptance or a revised mechanic before the behavior can be approved. Prefer a legal cast location/region rather than unexplained surviving walls. The combat/visual attack currently continues when terrain conversion is refused; this is also visible to the reviewer and is not full satisfaction of VW-F04.
2. Outer map boundaries and occupied essential object/actor footprints are preserved. Safe occupied floor is not converted under its occupant during the initial batch. Previously recorded scars replay before position repair, after saved objects and deep-dungeon progress, so consumed wall collision cannot reappear around a resumed actor.
3. Dungeon scar records are additive at save schema 14: `save.voidScars = {schema:1, areas:{[exactAreaStateId]:{width,height,elevation:0,cells:['x,y',…]}}}`. Unknown fields survive. Capacity refusal does not truncate old scars. Dungeon level suffixes isolate the mutation; base generation stays pinned and unchanged.
4. Overworld Supernova does not permanently erase buildings, water, quest objects or terrain. S2 specified permanent consumption explicitly for dungeons, not equivalent overworld destruction. This conservative interpretation is I-07.
5. The Supernova field and blast origin stay at the cast location while Walker teleports around the current player. This is the declared I-10 choice. Dashes remain active when the player leaves the region, but not across unloaded scenes or owner death/retreat.
6. Wraiths commit one straight travel vector and make three transient slashes without curving or re-aiming. They are effects, not summoned enemy actors. No loot, durable army, or extra actor slots result.
7. A constellation rend has one activation; different rends can produce a wraith, beam or Walker teleport concurrently. Persistent non-constellation rends have a separate finite lifetime and emission limit.
8. Ordinary patrol and combat obey ground geometry. Explicit rift teleports land only on safe floor in the current entrance-connected dungeon component. A genuinely disconnected retreat may visibly rift back to a verified safe landing at/near the entrance, then fade, rather than walk through a wall or hang forever. Normal retreat walks. This is an engineering safeguard using the specified teleport ability, not generic wall phasing or a forward progression bypass.
9. A Walker hunt is pinned to its first dungeon level, preventing a fresh-health copy on each floor. Leaving that level during retreat ends its escape. Crystal level behavior is unchanged. Reload cancels transient attacks/visuals under the existing pack runtime contract, while preserving health, cooldowns, hunt tries, precise legal position and persistent terrain. Pause with dt 0 freezes Walker simulation. Full attack-phase continuation across reload was not added.
10. Proposed Echo, not a dictated mechanic: **Rift Upheaval** makes dodging leave one delayed void-spike eruption under a nearby foe, using the established bounded Echo patch path. It has its own data table and new tests. Tim did not specify a Walker Echo.
11. Spawn rate, level/depth gates, damage, recovery, radii and lifetimes are initial balance proposals, not user-supplied numbers. `VOID`, `ATTACK_MODULES.void*`, `WORLD_BEASTS.voidWalker`, `WALKER_ROUTE`, `VOID_SCARS` and `VOID_ECHO` are the tuning sources. In particular: three hunt attempts; level 8/depth 5 ordinary-dungeon gate; 3–6 constellation portals; .48-second basic rend warning; 7-tile Supernova radius; 2–3 particle waves; six teleport-dash opportunities; .28-second dash warning; one-second trails. Field/rift/collision pressure needs player feedback.
12. All pack effects share the existing cap of 48. Walker emission refuses excess effects instead of evicting another creature's telegraph. Patrol plans cap at 625 nodes; long retreat searches retain their frontier across frames with at most 625 expansions per call. Landing connectivity is finite and cached with topology invalidation. On-device performance remains unverified.

## Test and visual receipt

At this checkpoint:

- `node --test tests/void-walker-*.test.ts`: **68/68 pass**, zero skipped. Includes 21 combat, 16 routing, 15 terrain and 16 integration tests.
- Focused existing plus new suite across world beasts, continuation, pack, roaming, digging, levels and Echoes: **191/193 pass** (before the final multi-level regression was added). The two failures are protected pre-existing Crystal fixtures that assert no dungeon beast can appear without water. They now correctly encounter a Walker. These tests were not changed or skipped.
  - `tests/world-beasts.test.ts`, “the Crystal haunts only dungeons with water…”
  - `tests/beast-continuation.test.ts`, “single-puddle eligibility retains level, depth, ordinary-ID, cooldown, and one-hunt gates”
  - Proposed minimal update pending Tim's approval: put the Walker on cooldown in those Crystal-specific fixtures and preserve every assertion. Do not weaken water eligibility or alter seeds/chances just to make them green.
- `npm run build`: passed, still release 249 (not a prepared release candidate).
- `git diff --check`: passed.
- The previous routing-only **662/662** full suite predates combat and is not a current full-suite result. A final full suite is still required after the pending test edits, review fixes and release packaging.
- Actual native model preview: `.local-validation/void-walker-model-preview.png` and its `.mjs` renderer driver.
- Actual native effect preview: `.local-validation/void-walker-effects-preview.png`; driver also checks reduced-motion determinism and no render-side simulation mutation.
- Actual simulated game preview: `.local-validation/void-walker-gameplay-preview.mp4`, H.264, 960×600, 20 seconds at 15 fps. Production Game callbacks, monster simulation and renderer; scripted Wayfarer motion in a labeled test arena. Observed 38 peak effects, 144 persistent scar cells and 12 damage events. It is not a human/mobile playtest and not a live deployment. Neighboring PNG is a poster; JSON records its metrics.
- Frozen source/test hashes: `.local-validation/void-walker-implementation.sha256`. Logs are in the same local validation directory. These artifacts are local evidence, not assumed present in a remote clone.

## Next reviewer actions

1. Independently review the complete diff from live r249, not just the new tests. Challenge both the combat implementation and original routing scaffold.
2. Decide the protected-region/cast-location behavior with Tim. Do not mark VW-F04 complete while its exception is unresolved.
3. Obtain the narrow existing-test approval, then isolate the two Crystal fixtures without weakening assertions; add any discovered regressions as new tests.
4. Play the fight with actual dodge input, particularly mixed constellation/horizon/trail overlap, walls outside the void area, small dungeon rooms, map edges, and reduced motion. Check overworld performance and dungeon progression locks.
5. Finish release checklist once the candidate is accepted, run the unmodified full suite, and follow AGENTS review/publishing gates. This checkpoint grants no push or publish authority.
