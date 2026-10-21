# Major-beast strength floor and fresh rematches

Unreleased follow-on source prototype. Exact authority is in `beast-level-eight-source-transcript.md`; later Gate clarification is in `gate-revenant-source-transcript.md`. This work is not r251 publication clearance and does not alter ordinary enemies.

## Owner requirements

- Major beasts have at least approximately level-eight strength even when a brand-new character encounters them. Level eight is NOT a spawn gate. No existing stronger beast should be weakened.
- Questing Beast is strongest, most damaging and punishing of the group.
- On player death both player and participating major beasts restart full health. Three failed attempts, then the beast leaves. Preserve attempts across saves and grant no kill rewards for departure.
- Gate Revenant is different: it has no retreat/rematches and disappears after player death. The previously requested shelter escape remains. Ordinary enemies are not globally retuned/reset by this feature.

## Baseline findings

Previously both tune functions used actual level>=1/current gear/current maxHP; no level8 floor. Questing HP55hits+25/level was lower than every recent major beast58–78hits+26–34/level. Questing already had highest damage share.27, fastest speed multiplier1.55 and shortest attack gap.12. Crystal/Walker dungeonMinLevel8 blocked new characters. Their three-attempt counters existed; worldBeastPlayerFell returned after its first participant, skipping simultaneous beasts. Source enemies were snapshotted with wounds on player death. Additionally overworld death switched rx/ry to checkpoint before capture, writing the source enemy snapshot under the destination key.

## Implemented provisional tuning

Central `BEAST_BASELINE` in world-beasts.ts sets minimum level8, starter perHit16, maxHP102, starter armor guard.025. These correspond to an attainable level8 character retaining starter gear and unspent attribute points: level grants guaranteed+42HP and+4 melee bonus over level1. No invented all-stats8 allocation is assumed. Reference preserves actual stronger gear/HP/guard, and adds only missing guaranteed level bonuses below8.

`beastTuningReference(save,stats)` returns this reference. `beastProfileVitals(profile,save,stats)` evaluates each existing profile's hits/levelHP/damageShare against it. A SEPARATE provisional balance choice sets delivered base-hit damage floor60 before ability multipliers (raw actor damage is ceil(60/(1-guard))). This is not mathematically implied by level8 and is not an owner-specified number. It keeps Gate40 lesser and makes level1 exposure punishing. Existing ability-specific multipliers, dodges, guard and invulnerability continue to apply.

Questing uses at least1.15× the strongest same-reference WORLD_BEASTS HP and damage, also retaining its own stronger existing values. This1.15 is a prototype multiplier, not owner wording. Existing fast movement/attack kit is preserved, with attackGap.12 lower than every current other major beast. Equal-reference raw HP/damage dominance and gap ordering are tested; varied attack geometry, immunity, arena conditions and player skill still require play review. We do not claim a universal DPS or difficulty ranking from raw stats alone.

World tuning never lowers an already stronger actor maxHP/damage. Additive beastTuningVersion1 upgrades legacy restored actors once, preserving currentHP on ordinary reload; normal leave/reload never grants free healing. New characters can now encounter dungeon Crystal/Walker (dungeonMinLevel1), with all existing depth, biome/water, cooldown and ordinary-dungeon restrictions retained.

## Death and lifecycle

- Every simultaneously participating live world-beast ID spends one attempt. Existing retreating beasts do not count as an attempt.
- Surviving participating major beasts reset hp=maxHp before source-area snapshot; transient attack runtime clears. Attempts, rewards, identity and encounter cycle are not reset.
- On third failure the existing active encounter clears/cooldown begins; live actor is marked dead/noRewards so it cannot reappear from a snapshot or pay a bounty.
- Gate predators are separately marked dead/noRewards after a player death, with no three-try state.
- Source snapshot now occurs before changing checkpoint coordinates; loading destination uses capture=false to avoid overwriting the source reset under the wrong key.
- Current production still allows one world beast per area and prioritizes Questing; this patch does not enable new co-encounter spawns. Multi-participant counter correctness is future-safe and validated synthetically. Astral Worm's special rare co-encounters need separate integration.

## Verification and pending protected work

External scratch matrix:36 level/weapon/guard combinations, all six beasts and Questing, no weaker HP than former formula, Questing HP/damage and gap ordering. Production probes cover full-health death snapshots, separate natural Questing/Blob reentry, ordinary wound-preserving reload, three-failure departure, saved attempt counts and Gate disappearance/no reward/no live restore. Synthetic Crystal+Walker death increments both counts through three attempts.

Existing focused suites:51pass/2expected failures in tests that explicitly forbid low-level dungeon encounters. Owner permission is needed to replace those now-obsolete expectations while preserving their other water/depth/cooldown/eligibility coverage. Gate also needs the historical exact260HP assertion updated. New tests proposed: gate-revenant.test.ts, gate-revenant-integration.test.ts, beast-baseline-rematch.test.ts. No protected test changes made.

Remaining: fresh independent review of the shared floor/death scope, render/play review, approved tests, full suite/build on exact final source, integration with final r251 ocean commit and Astral registration, release number/checklist and explicit publication authorization.

### Fresh-attempt timer interpretation

A player-death rematch also resets that participating beast's per-fight patience to zero, while retaining spent attempts and the existing180-second per-attempt timeout. Otherwise a prior179-second fight would make a full-health second attempt flee almost immediately. This is an implementation interpretation of a fresh duel, not a newly owner-specified timeout. The external death probe covers prior patience179.9, reset through normalized saves (zero may be omitted), and unchanged attempts. Gate remains excluded.

### Installed ordinary-dungeon death wrapper

Independent review found the outer dungeon-death wrapper discarded the entire ordinary-room snapshot, reviving a natural Gate and dropping stronger major-beast fields despite the inner death reset. It now retains ONLY exceptional enemy records (Gate tombstones and major-beast records), while ordinary enemies and ordinary room objects retain their existing run-reset behavior. No hostile transient projectile/effect is kept. External production-wrapper tests use a naturally generated Gate through two player deaths and a natural dungeon Walker with9000maxHP/200damage/unknown future field: Gate remains gone, Walker returns9000HP with metadata and spent attempt intact. This is necessary lifecycle preservation, not new encounter eligibility.

The minimal exceptional snapshot also preserves encounterVersion so ordinary encounterSpawn populations regenerate instead of being mistaken for a legacy sparse snapshot. Fresh rematches clear known burn/slow effects (restoring unslowed speed), hit-stun/recoil/flash, so a previous attempt's damage-over-time cannot immediately wound the full-health retry. Unknown actor fields remain preserved.

## Independent stage review (2026-10-21)

Read-only reviewer found no remaining confirmed gameplay blockers on frozen source hashes game7943a86c217db99cb0fa93b3f051d21aa5b985df574f0e3c60c916e87642e7e5, monster-pack95fee5c6a1389eb1c86cbce355562ff71b0bcac679dab51c6c2c93f93aaf6363, world-beastse6c5fb92b855b7e7cdfcb6d754ec04397647a624ac4657cf9f9ef968e310d5a9, questing-beast36a19e023e3286838bdd4682b6ccd33fcc2a55ae08f4eecd2d8c7e9c74401b92. Independently reproduced attainable level8 via seven production level-ups; checked natural dungeon rematches, stronger/unknown fields, status/patience, all attempts and third departure without reward. This is a stage review, not release approval.

Combined existing suite before final review fixes:819pass/4fail, all obsolete protected requirements (one Gate260HP assertion, three level8 encounter exclusion assertions). Final source still requires authorized coverage updates and an exact-candidate full-suite run. Build and diff whitespace check passed on the reviewed source. No protected files or release markers were edited; no remote action occurred.

### Bounded test approval received

The owner's2026-10-21 approval permits these specific regression additions/updates while preserving existing coverage. Added beast-baseline-rematch.test.ts plus Gate suites; four obsolete historical exclusions/HP assertions updated. The attainable baseline test uses seven actual awardExperience calls. Further integration with final r251 and Astral, exact integrated candidate validation and release authorization remain separate.

Final isolated approved-test stage:834/834 tests and static build pass; independent focused/affected recheck98/98 passes with no new blockers. This supersedes historical pre-approval819/4 status for this isolated branch only. Final integrated release validation and publication authorization remain outstanding.
