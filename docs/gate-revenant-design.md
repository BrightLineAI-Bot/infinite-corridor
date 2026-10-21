# Gate Revenant upgrade: requirements, read-only audit and next-release plan

Status: design staged only; no implementation, test changes, commit, PR or publication. Owner source: `gate-revenant-source-transcript.md`. Audit 2026-10-21 against HEAD a91cc8c54c088fc7430798c23b7e908722b6d1a1 plus uncommitted r251 ocean work. File hashes are in `audit-source-sha256.txt`; the HEAD alone does not identify the working source. Base implementation on the eventual reviewed r251 commit, not this historical HEAD.

## Normalized owner requirements

1. Keep dungeon escape and cross-section pursuit until the player reaches shelter. Keep ordinary terrain/pathing.
2. Increase health and power but remain below the recent major beasts. Owner considered half to two-thirds, then preferred roughly two-thirds. Compare equivalent player level, equipment and defensive stats.
3. Increase encounter frequency; no numerical chance was supplied.
4. Chase at about 1.5 times player BASE walking speed, explicitly faster than a player with +20% walking speed. Dodging remains an escape tool.
5. Reuse the Void Walker's rift-emitted transient wraith behavior exactly, not merely a similar new summon.
6. Long sustained fire breath/gout from the mouth; rapid straight fireball bursts, potentially multiple simultaneous shots; arcing/lobbed lava-pit-like shots with ground explosions.
7. Very brief windups and recovery, normally little stationary time. One distinct stationary attack may deliver an intense rapid barrage.
8. Retain threatening difficulty with readable counterplay, bounded effects and no unavoidable infinite spam. The counterplay/budget constraints implement project invariants, not additional numerical owner instructions.
9. Preserve detailed source and readable creature/field-guide notes for subsequent Claude/Anthropic review.

## Current implementation facts

### Spawn and lifecycle
- `src/game.ts` loadArea, lines 1886–1887: deterministic hash `${seed}:gate-predator:v1:${areaId}` modulo1000 <12, or 1.2% of IDs, not a fresh random roll each visit. Spawn position hard-coded (18,6).
- Actual condition excludes deepDungeon, recipe deep-v1 and aperture-annex IDs. Unlike field guide §9.3, this particular condition does NOT explicitly exclude arenas, hunt instances or elite portals. The later populateDungeonEncounters guard must not be mistaken for the predator guard. Whether those areas can reach this path needs fixture validation; documentation is overbroad.
- leaveDungeon, lines2252–2270: first living aggro predator marked dead in source snapshot, cloned outside with preserved HP and AI, new breach-suffixed ID and offset from return point.
- moveSection, lines2363–2391: all living aggro predators are cloned, originals marked dead, copies inserted behind player with pursuit IDs. Non-predators lose aggro and return home.
- Snapshot restore, line1973, restores surviving saved predators missing from generated enemy set.
- Shelter, lines3701–3704: in overworld, footprintInsideStructure marks living aggro predators dead. This is structure-footprint escape, not simply proximity to any checkpoint. Do not replace with a distance timeout. Confirm owner hazards cancel too when adding attacks.
- Current ordinary enemy AI remains aggro once alerted, uses boundedChaseStep and moveAxis. No Walker wall-phase or marine privilege should transfer to Gate Revenant.

### Speed and attack kit
- `game.ts` updateEnemyAI sets chase speed .78 and multiplies by speedMultiplier. Predator multiplier1.12 yields .8736 world tiles/sec, not fast relative to player.
- Production player base walking is2.4 tiles/sec (`game.ts` line3581); +20% is2.88, requested1.5× base is3.6. This target is an actual measured unobstructed chase speed, NOT setting speedMultiplier to1.5. Existing legacy chase would need3.6/.78≈4.61538, whereas a new pack brain has different speed factors and must be calibrated separately. Terrain slows and attack stops remain distinct.
- Predator is not a Monster Pack definition. It uses generic ranged combat at range5.5, default single projectile via enemy-patterns.ts, plus close longReach tentacle melee when within2.8. Default ranged windup .9sec; recovery1.9×.85=1.615sec after dungeon threat tuning.
- Generic projectile defaults: speed4.2, life2.4, full actor damage, straight path. No existing Revenant wraith/fire breath/burst/lava-bomb kit.

### Stats, downstream tuning and stale guide
- combat.ts createCombatant has no canonical Gate Revenant stat row, so unmatched construction falls back to ashling24HP/5damage/range0 with Revenant silhouette. Current spawn paths supply overrides; adding paths carelessly is unsafe.
- Predator override260HP,22damage,range5.5,scale1.85,radius.7,eight tentacles.
- tuneDungeonThreat default damage×1.25, ceil:22→28; global ENEMY_DAMAGE_SCALE1.3, round:28→36. Therefore ordinary freshly spawned predator final damage is36, not22; HP remains260. Crossing clone preserves this rather than retuning.
- FinalBoss override360HP/22damage then role×1.48HP/1.2damage gives533HP/26damage; dungeon tuning gives33 then global scale43damage. Guide533HP/26damage is only intermediate. Additional specialized encounter multipliers may differ.
- Existing field-guide elite ceiling22 refers to base stats; do not “repair” protected assertions without checking their actual construction context and approval.
- world-beasts.ts tuneWorldBeast uses HP=round(perHit×hitsToKill+hpPerLevel×level), perHit=max(6,weapon power+meleeBonus); damage=max(4,round(playerMaxHP×damageShare/(1-guard))), guard clamped0–.75. Beast profiles:58–78 hits,26–34 HP/level,.20–.24 damage share. Walker60/28/.20 is a useful explicit comparison, not the only possible benchmark.

## Candidate balancing, clearly proposed rather than owner-set

- Spawn proposal:24/1000 (double12/1000), retaining rare menace; compare36/1000 if still unseen. Preserve old journey generation and pin any new spawn policy when first adopted. Do not simply change v1 hash semantics for existing explored dungeons or respawn defeated predators.
- HP proposal: two-thirds of Walker's tuned HP at equivalent level/equipment; damage proposal: two-thirds of Walker's final tuned damage, applied exactly once, not multiplied again by dungeon/global scalars. Keep comparisons final-to-final.
- Important conflict to resolve in balancing: at low player maxHP60 and guard0, Walker base damage12, two-thirds is8, below current predator36. At level1/perHit6 WalkerHP388, two-thirds259, about existing260. Thus “increase” and “two-thirds” cannot both be strict for all low-level states with current formulas. Do not silently weaken predator or claim both achieved. Candidate constrain access to an appropriate level/depth and tune attack-budget/DPS, or retain a floor while documenting where ratio is exceeded. Parent/owner balancing choice pending.
- Default scope recommendation is roaming gatePredator variant. Deep final bosses share kind but have distinct roles and completion gates; preserve their existing health floor and lifecycle until deciding explicitly whether the new kit/stat tuning also applies there. Owner did not distinguish variants.
- Timing candidate envelope for new fire moves: .3–.45sec visible startup, short .2–.35sec recovery, finite burst counts; sustained breath and stationary barrage duration1.2–2sec initially. These are prototypes only. Retain existing Walker wraith timings exactly rather than speeding them up to match fire attacks.

## Exact reuse and implementation seams

- Reuse monster-pack.ts `voidWraiths` START/RUN attack and `voidWraith` effect, not duplicate. Current wraith attack emits2 opposite rends around sampled player position; rend warning.48sec; speed3.4; life1.7; three slashes spaced.45sec; reach1.15. Attack table cooldown6, windup.35,recover.3,damage multiplier.7. Live-owner cancellation and PACK_EFFECT_CAP48 already exist. Registering Gate Revenant as pack needs its own profile/brain, not borrowing Walker's entire identity, dodge, teleport, terrain or worldBeast flag.
- Existing lavaBomb effect from volcano (`game.ts` line3827) and monster-render.ts mortar/lavaBomb arc rendering provide appropriate visual/ground-detonation reuse. Current volcano targets4 shots with warning1.3+i*.2 and radius1.05; do not inherit18% player maxHP per shot for rapid barrages without a combined damage budget.
- Implement actor-owned lobs with proper owner cancellation: generic lavaBomb effects do not automatically share Walker's live-owner lifetime rules. Shelter, death, source area unload and pursuit-ID replacement must clear/retire attacks and avoid orphaned effects.
- Sustained breath needs collision-aware swept beam/cone geometry and capped tick interval; rapid balls need bounded emitters, single aim sampling/limited turning and projectile collision. Reuse current render conventions/reduced-motion. A breath must not hit through intervening walls or shelter.
- Pack AI currently stops movement while s.attack is active. Do not merely register attacks and get permanently stationary combat. Explicitly allow measured pursuit during selected burst/recovery stages, leaving stationary barrage distinct.
- Keep balances in a named GATE_REVENANT data table; avoid a new src module unless protected build/precache registration receives approval. Existing src modules are sufficient for first iteration.

## Isolated worktree proposal (not executed)

Wait for reviewed/frozen r251 commit, create branch `claude/gate-revenant-upgrade` and separate worktree `/workspace/scratch/4d68e10a6a91/infinite-corridor-gate-revenant`. Do not modify the shared r251 tree or use its uncommitted changes as an unstated base. If starting prototype sooner is necessary, parent can authorize an isolated copy of the known working snapshot plus hashes, with mandatory rebase/review after r251 freezes.

Proposed source scope: src/game.ts (initialization, speed integration, scoped lifecycle cancellation), src/monster-pack.ts (profile, finite moves, exact wraith reuse), src/monster-render.ts (fire/breath visuals), src/main.ts (outdated “exceptionally rare/escape long before killed” codex copy), src/combat.ts only if canonical base stats/profile integration requires it. Documentation: source/design plus §9.3/update release section in field guide, AGENT_CONTEXT and CHANGELOG later. No release bump until release owner assigns next odd release; do not assume253 is free.

## Validation plan, not tests written or run

External scratch probes first, then request explicit approval for focused regression test additions before editing tests/.
- Speed distances at base and+20%, all chase/attack phases and same delta-time partitions; ordinary terrain/corners/doorways.
- Spawn distribution, deterministic revisit, old pinned journeys, dead predator no respawn, valid spawn tile.
- HP/damage ratio matrix across player levels/equipment/guard, and no double tuning on reload or cross-section migration.
- Preserve single predator across dungeon exit, multi-section pursuit, save/reload; no duplicate rewards or completion guardian regressions.
- Shelter cancels every harmful owner effect, projectile and pending emitter; other actors' warnings survive capacity exhaustion.
- Wraith behavior equivalence to Walker, no copied wall-phase, teleport, sea allowance or supernova.
- Wall-blocked breath, fixed tick damage, finite fireball/lob counts, readable ground warnings, dodging escape windows, worst-case combined hazard budget.
- Pause, large delta time, reduced motion, exact resume, dead/missing owners, actor cap, projectile cap32dungeon/64overworld and effect cap48.
- Run existing full suite/build from isolated worktree after implementation; protected test changes remain pending approval. No current feature publication authorization assumed.
