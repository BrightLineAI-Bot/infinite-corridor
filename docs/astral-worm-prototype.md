# Astral Worm isolated source prototype

Status: source/model prototype with explicit production-system fixture hooks only. It is NOT naturally registered in production, released, or gameplay-certified. Branch `claude/astral-worm` starts at historical green `a91cc8c54c088fc7430798c23b7e908722b6d1a1`; final reviewed r251 and Gate are mandatory integration bases. No release number assigned.

## Source and scope

Owner source and acceptance requirements are preserved in `astral-worm-source-transcript.md` and `astral-worm-design.md`. Numbers below are provisional authored proposals, not owner-specified values. Canonical name is Astral Worm; its primary body is elongated and segmented, with black ink throughout. Above-water eligibility does not confer boats, underwater forms, water attacks, terrain damage or Gate's no-retreat rule.

`src/astral-worm.ts` is a JSON-only deterministic combat core and actor adapter. The render, mount and Wayglass-retreat modules are separately registered in the build and both offline precaches. Thin pack/renderer and Game hooks support explicit production-system fixtures. Following the owner's S6 approval, the main Worm is publicly catalogued with `noEcho: true`; mirages remain private rewardless actors. The normal Proving Ground lists the main Worm. No natural random encounter, world regeneration or release-number change is enabled. No external assets are copied.

## Implemented isolated mechanics

- Seven attack families: radial pooled spike footprint, committed forward trample, three pursuing temporary-mouth bites, flight with periodic continuous-beam impact damage, killable mirages, timed committed griffin pounces, concentric blasts.
- All four ring orders. Four bands: center disk, then annuli with explicit inner and outer boundaries. Each band warns 0.6 seconds, hits for 0.16 seconds, then leaves a 0.22-second safe gap. Reversal repeats the terminal band by proposal. Center remains fixed during cast. Renderer consumes the same descriptors as collision.
- Four clones, each 12% of main maximum HP, at most seven active seconds, no independent rewards. A convex polygon enclosure, 1.4-second grace, actual dealt-damage healing only, capped to main maximum HP. Fewer than three or degenerate clones cannot enclose. Killing two breaks the ring. Ring center tracks at 1.05 tiles/second; fast movement/dodges leave it without an artificial dodge counter. Body travel is 3.4 tiles/second.
- Pair selection proposal: 2.5% hostile Walker, 0.5% allied Walker. Requires an explicitly available Walker, no existing other beast, no Questing Beast. This is only a helper, not a global spawn policy change. Allied targeting predicate accepts only the named encounter's worm/mirages, never player/boat/unrelated actors.
- Above-water eligibility helper explicitly proposes ocean, deep ocean, lakes, rivers and dungeon water, excluding walls. Final mapping must use r251's actual terrain/surface rules, not just this prototype helper.
- All simulation consumes active dt, maximum .25 seconds per call, internally bounded to 1/60 substeps (15 steps maximum). A paused/unloaded tick is a no-op. Full state serializes to JSON; no wall clock, external timers, reward writes or world regeneration. Main/player death ends transient attacks. Normal snapshots do not reset wounded HP.
- Render budget: nine segments, twenty decorative limbs, four wings, twelve pool spikes, four clones maximum, one damaging descriptor at a time. Smooth ink silhouette dissolve is a separate render helper; reduced motion switches immediately and freezes decorative motion.

## Host adapter contract and unfinished integration

The host supplies `player`, `canOccupy(x,y,form)`, and `damagePlayer(amount,source)` returning actual HP removed after ordinary dodge/invulnerability/armour checks. Clone hits must route through `damageAstralClone`, and main actor HP must share the one authoritative health pool. Store the complete combat state in existing actor snapshots, preserving unknown fields in host normalization. Use active simulation time for morph progress, not wall clock. Renderer coordinates are actor-centered tile space; host must project terrain consistently.

The production-system fixture now supports explicit createCombatant/updatePackMonster/Game.update calls, real killable clone actors, footprint/line-of-sight checks at spawn, bounded clone movement, actual player HP-loss healing, native pack drawing and orphan cleanup. This prototype does NOT yet provide natural spawn placement, fully terrain-projected continuous beam column, target hitbox sweep, complete quest/reward isolation review, or production save migration. They are explicit next integration work, not claims of completeness. No mirage grants XP, loot, objectives, hunt completion, or separate death attempts. Questing Beast spawn priority is unchanged.

The griffin reuses the Questing-style committed telegraphed pounce pattern concept (tracked aim during warning, then committed dive), but does not import or claim identical Questing attack tuning. It has no automatic untargetability.

The pool's attack currently uses a clearly displayed circular footprint containing its radial spikes; detailed angular spike collision is not claimed. The native form sheet is an enlarged model study on staged backdrops, not production-scale combat or mobile performance evidence. The fourth visual pass is owner-approved; proposal balance remains provisional.

## Shared Gate lifecycle dependency

Do NOT copy lifecycle into this module. Gate owns `BEAST_BASELINE`, `beastTuningReference`, `beastProfileVitals`, `tuneWorldBeast`, Questing dominance and shared attempts/death resets. Integrate `ASTRAL_PROFILE` into final reviewed `WORLD_BEASTS` and inherit the level-8 strength floor with early-character eligibility, Questing strongest, and no existing-beast nerfs. The main player's death resets living participating beast HP; three failed attempts ends the encounter. Separate Gate no-rematch behavior must NOT leak to Astral Worm. On player-death reset only, delete `e.astral` and remove `astralOwner` mirages; normal reload must preserve `e.astral`. This integration hook has been sent to the Gate worker.

For paired encounters, preserve one-beast default everywhere else. Both hostile participating beast IDs must reach shared failure accounting, each at most once per death; an allied Walker is not a hostile attempt or reward source. Ally departure on target defeat/unload/departure must be idempotent. This requires dedicated adversarial integration fixtures.

## Approved tests and packaging

The owner explicitly approved bounded formal regressions and the normal world-beast bounty with no new Echo, rewardless mirages and rewardless allied Walker (S6). Formal core, collision, adapter, mount and Wayglass-search tests are additive; the Echo contract narrowly excludes the main Worm from expected Echo sources without deleting existing coverage. All four new modules are included in the build and offline precaches. Release 251 is unchanged locally and is not a publishable follow-on package. The final integrated release needs the ordinary synchronized release checklist.

Original 823-test baseline results are historical, not validation of subsequently added code. Final whole-suite logs and exact source hashes must be checked after all latest hooks. Scratch probes supplement, rather than replace, repository tests.

## Explicit paired-actor fixture progress and remaining requirements

A Walker carrying `astralAllyOf` routes through an isolated target-world adapter. Direct attacks and the real Walker effect kit target only that named Astral Worm; private effects never join the player's hostile effect array. Shared callbacks which close over the player or mutate terrain are replaced. Private plus ordinary effects reserve one descriptor for the worm and remain at most 48. The native renderer displays those private effects. On target death, missing target, ally death or player death, the helper departs and clears effects. Provisional fixture policy makes the ally untargetable by the player and gives no rewards; it does not establish a permanent alliance. A 60-second external real-kit probe checks player/global-effect/terrain isolation and damage to the worm.

Still required, separately:

1. **Natural encounter registration:** merge/rebase onto reviewed final r251 and Gate first, then register profile and eligible above-water placements with version-safe activation. No random spawn is enabled here.
2. **Public catalog/Echo contract:** approved and implemented: Astral Worm is in PACK_KINDS and the normal Proving Ground with no new Echo. Mirages remain private/rewardless. The narrow Echo regression exception is explicitly approved. Normal beast bounty wiring still uses final shared lifecycle integration.
3. **Paired encounter creation/lifecycle:** the selector and explicit ally actor route exist; natural pair creation, ownership reservation, hostile shared-attempt accounting, companion save/re-entry, ally-kill forwarding into one-time hunt/reward accounting, sanctuary/boat behavior, inherited Marine Walker rules and integration review still need implementation. The fixture's no-player-friendly-fire ally policy is provisional. No global two-boss rule was added.
4. **Shared death/reset hooks:** Gate owns strength/Questing dominance/three attempts/full HP reset. Its final death path must clear `e.astral` and mirages only on death reset, while ordinary reload preserves the entire state. No duplicate lifecycle implementation is present here.
5. **Formal tests:** bounded repository regressions are owner-approved and now being implemented and run. External probes cover isolated core, emitted modules, real actor adapters, Game.update, native rendering and paired ally isolation; they are not a substitute for final integrated save/death/quest/reward tests or human/mobile combat review.
6. **Final terrain/morph presentation:** above-water flight is depicted and actor movement is flying, but exact native elevation/continuous-beam grounding across cliffs, sky-to-ground annular blast columns, target hitbox sweep and terrain-specific eligibility remain integration work. Form transitions now use active-time dissolve in the real pack renderer; reduced-motion behavior is deterministic.

The first catalog-inclusive run had three failures caused by incomplete public catalog enrollment. No tests were weakened: prototype-only catalog isolation keeps the current player-facing catalog and Echo system untouched. A subsequent focused unchanged catalog/Echo run passed. Baseline build and pre-adapter tests are distinguished from new module-inclusive build, direct built-module checks, actor fixture checks and final full-suite rerun logs.


## Independent stage-review fixes

The first independent exact-source review found three real bugs missed by the initial happy-path fixtures: prototype catalog filtering also filtered runtime stat/form maps (causing fallback ashling stats), allied lethal damage did not mark the worm dead, and mirage collision validation happened after drain. These were fixed, not hidden with test changes. Runtime definition maps now retain explicit prototype vitals/forms while the public catalog and normal Proving Ground menu exclude prototype-only mirages. The main Worm was subsequently enrolled after explicit owner approval. Allied lethal hits mark dead; retreat/flee/terminated targets end assistance. The core accepts/rejects clone movement before enclosure/drain. The reviewer's original reproduction now reports dead=true and zero drain/healing when movement is blocked. Scratch adapter assertions now explicitly require base1400HP/60damage/scale1 and clone168HP.

The reviewer also identified missing host reduced-motion forwarding. Root approved a narrow renderer condition extension for Astral Worm/mirages and sprite-cache bypass only for these continuously morphing forms. A real Game/production-renderer frame comparison now verifies reduceMotion and safeMode, and ordinary active animation remains visible. Visual-only passes continue separately from frozen mechanics; all final checks must be rerun after the fourth visual iteration.


## Four native visual iterations

At the owner's explicit request, the dragonfly and griffin underwent exactly four reviewed visual passes. Each uses the same native drawing source, with enlarged anatomy plus actual 44px/28px tile-scale comparisons; untouched forms were preserved.

1. Articulated serrated insect mandibles; hooked eagle beak, lion haunch/paw and tail.
2. Four veined membrane wings, organic mandibles, layered griffin feathers and eagle talons.
3. Separated hooked pincer tips with clear negative space; lowered predatory griffin head, distinct quadruped limbs and tapered feathers.
4. Rounded lion contours, integrated raptor beak/brow and modest crest, restrained liquid sheen, final contour cleanup.

The first three passes were independently inspected by the parent before the next began; the fourth was separately inspected, delivered and approved by the owner. The final optional eight-second native dissolve clip is a source-rendered model demonstration, not gameplay footage. No fifth pass was performed. Visual files and source snapshots per iteration live in the external `astral-worm-preview` scratch directory. Final source hashes are recorded there; all final source/module-build/runtime regressions must match those hashes.


## Prepared natural-spawn and ownership adapters

`planAstralEncounter` is now a pure bounded placement planner using deterministic host-supplied rolls and the final host's authoritative footprint/above-water predicate. It preserves Questing priority and rejects existing other beasts, settlements and unsupported areas. It scans at most 625 cells; ordinary-dungeon eligibility/chance and five-section depth remain documented provisional placement choices. It returns a main spawn descriptor and a reservation-required optional Walker, but never claims actors, changes journeys, or enables random spawning itself.

`astralOwnership` prepares an additive versioned record after successful placement/reservation, preserving unknown fields. `astralOwnershipActions` returns read-only directives for suspend, main defeat, player death, retirement and continuation. It has no independent failure counter. A hostile pair reports both IDs' kinds to the shared lifecycle. Main defeat departs an allied helper only; a surviving hostile Walker stays under its existing shared lifecycle. Main reward uses an idempotence signal; the host must atomically persist rewardClaimed with the existing world-beast reward operation. No companion reward is created by the main worm's completion. A separately defeated hostile Walker retains its normal shared reward path; the allied helper and mirages are always rewardless.

Integration must wire these adapters only against the final reviewed r251/Gate branch, reserve the Walker atomically, preserve scene snapshots and invoke exact shared death/reward handlers. These pure functions are preparation, not a claim that natural encounters or save migrations are enabled.


## Owner-added Wayglass retreat and mounted Walker

S4–S6 supersede the earlier unspecified retreat destination: the Astral Worm retreats to the nearest reachable Wayglass. `astral-worm-retreat.ts` performs a bounded, resumable shortest-path search over an authoritative host graph, accepts only actual Wayglass roles, follows physical paths and transitions, and refuses to guess a teleport or substitute a shrine. The final world graph adapter remains an integration dependency.

`astral-worm-mount.ts` couples a hostile paired Walker's position and presentation to the Worm in every form, never health. Mounting is an explicit host decision, has no short expiry, and counts only actual player damage to the rider toward a provisional 20% rider-max-HP knockoff threshold. Provisional reach is 2.25 tiles and visual contact lift .3 tiles (.18 pooled, .45 griffin), plus .8 times owner scale for flight altitude. Allied helpers do not mount the creature they are fighting. Independent hitboxes and ordinary damage paths permit pierce/splash to hit both, with no pair-level deduplication or new immunity. Dismount validates safe placement; if no safe landing exists it remains a targetable pending-landing state rather than claiming a guessed tile is safe. Death/retreat/missing-owner transitions are idempotent. JSON state survives ordinary snapshots, and paused/unloaded hosts do not advance it. Native drawing lifts only the rider's presentation and ensures it draws after the owner, without changing collision coordinates. These values and hostile-only initial policy are implementation assumptions, not owner-specified balance.

Final baseline dependency: r251 candidate `083c03959cb1f7c2be8d62f4a5620ee849f23bdc` includes the corrected aboard-only swept full-footprint pull/push behavior. Preserve that exact behavior during reconciliation, then apply Gate shared lifecycle. Neither branch's remote publication status is implied by this isolated work.
