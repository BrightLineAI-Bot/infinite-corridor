# Morphing Blob growth-linked regeneration

Local implementation and review record, 2026-10-21 UTC. This is not a release or publication approval.

## Owner request and correction

User message `Sentinel_079143e282e48191b2f46b1d9d814184`:

> I want to modify the blobs code so that he, you know, he continuously grows whatever. But he also gained health, and as he grows, he gains health. The larger he gets, the more health he gets, right. So you gotta kill him before he just, you know, you gotta kill him quickly

User message `Sentinel_80020a14308881919f17a2f57aa5f724`:

> Oh, no, his max health pool doesn't increase just his available health like his hp regenerates as he grows

The correction governs implementation: restore current HP only. Never increase the maximum health pool.

## Implementation

**CODE:** `src/monster-pack.ts`, the `BLOB` balance table and `blobPassive`.

- Proposed initial balance: `BLOB.growHeal = 0.5`. Across the existing 120 seconds of natural growth, a wounded Blob can recover at most 50% of its unchanged maximum HP.
- Each active growth tick restores `maxHp × growHeal × (newAge − previousAge) / growTime`. Age is bounded to the natural-growth interval. A timestep crossing the cap receives only its remaining growth increment.
- Current HP never exceeds maximum HP; healing while full is discarded rather than banked for later. Reaching the growth cap ends this natural regeneration.
- Zero-HP, negative-HP and dead actors are not revived. Invalid or nonpositive elapsed growth time grants no healing.
- The existing `maxGrow = 2.4`, `growStep = 0.08`, scale rounding, body radius calculation, and capped merge swelling are unchanged. Existing stepping can round the nominal combined 3.9× natural-plus-merge size to 3.92×; this change does not alter that behavior.
- Bloblets keep their separate existing 3%-of-maximum-HP merge heal and capped swelling. Merge swelling does not grant a second growth-regeneration reward.
- Ooze damage detection runs before regeneration. Even damage smaller than the current tick's healing still triggers the existing ooze response; healing itself does not trigger it.

**BOUNDARY:** The existing Blob simulation path is unchanged: growth and its new healing happen when its existing active, aggressive passive update runs, not while paused, fleeing, inactive, or offline. This is not a new passive offline-healing or uncapped regeneration mechanic. No other creature, attack, reward, retreat, renderer, generator, configuration, or publication path is changed by this work.

## Save semantics

No new save fields or schema bump are introduced. Existing `blobAge`, `blobBase`, `blobMerged`, current HP and maximum HP already persist in actor snapshots. On resume, only newly elapsed active growth time heals, so loading cannot replay prior growth as catch-up healing. Resetting transient pack runtime does not reset the growth clock. Historical ages beyond 120 seconds normalize to the completed-growth cap without changing body geometry or restoring HP. Unknown actor/save fields remain untouched.

## Verified locally

- External check before test-file permission: 12/12 passed, `.local-validation/blob-growth-health-check.mjs`.
- Authorized new `tests/blob-growth-health.test.ts`: 12/12 passed.
- New file plus unchanged `tests/monster-pack.test.ts`: 37/37 passed.
- Existing Blob cases from `tests/world-beasts.test.ts` were run separately using the `Blob|blob` test-name filter; all selected cases passed.

Regression coverage: current-HP-only healing, unchanged maximum and geometry, total healing/cap, full-health overflow disposal, 30/60/144 fps versus a single larger timestep, ooze damage detection, dead/zero/negative HP, zero/invalid elapsed time, old-state continuation, JSON exact continuation, unchanged bloblet merge healing, production pause handling, and real `Game.exportSnapshot` → schema-14 migration → `Game` reload without catch-up regeneration.

These checks establish implementation behavior, not on-device balance or mobile performance. The 50% total amount is an initial tuning choice, not a numeric requirement dictated by the owner. Full combined-branch testing and any independent release review remain the coordinating task's responsibility.
