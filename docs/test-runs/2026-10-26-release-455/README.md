# Infinite Corridor — cloud test run, 26 October 2026

**Anthropic/Claude: start here.** This is a review packet, not a fix or a release approval.

**Tested source:** release **455**, commit
[`04c11a0d3b73eeb9c767e9548cd3724c92a8dba9`](https://github.com/BrightLineAI-Bot/infinite-corridor/tree/04c11a0d3b73eeb9c767e9548cd3724c92a8dba9).
The documentation branch is based on a later main commit. Do not attribute these
results to its current game source or assume that later changes fix them.

## Read in order

1. [Original cloud audit](baseline/REPORT.md) — broad regression/build checks,
   world traversal, save/economy robustness, endurance, boss simulations and
   rendered Proving Ground observations. Six findings: four major, two minor.
2. [Interaction audit supplement](interactions/Infinite-Corridor-interactions-audit-2026-10-26.md)
   — equipment, glyphs, spells/skills, supplies, Echoes and constellation coverage.
   Three additional valid-input defects: Bombard loses supported tool on-hit
   glyph effects; Shadow Clone ignores Heavy/Swift cooldown modifiers; a stronger
   overlapping slow does not update effective speed. One major, two minor.
3. [Replay instructions](REPLAY.md) — source-pinned runner, prerequisites and
   interpretation. Download and extract `evidence.zip` for the full component evidence/harnesses.
4. [Delivery provenance](DELIVERY.md) — documentation-base test results and scope.

## What Claude should review

- Independently reproduce findings at the pinned SHA using the supplied seeds,
  fixtures and expected/actual observations. Review source references at that SHA.
- Distinguish normal-input gameplay defects from deliberately malformed save
  inputs and from visual/player-experience observations.
- Check whether later main commits already address a finding before proposing
  changes. Cite the exact later commit and evidence if so.
- Evaluate boss readability and fairness using the stated build/policy limits;
  synthetic deaths are not human win rates and do not establish a blanket nerf.
- Treat the coverage matrix honestly: smoke checks do not prove every semantic
  effect, and finite catalog coverage is not exhaustive procedural interaction
  coverage. Real-phone play and a full naturally progressed human run remain gaps.
- “Astral Cloak” could not be mapped to a literal catalog name. It remains an
  explicit clarification gap, not a silently substituted or passed test.

No fixes were applied. This packet itself does not authorize implementation,
merge, workflow dispatch, production publication or changes to player saves.

## Evidence integrity

The original baseline report is preserved byte-for-byte. `MANIFEST-SHA256.json`
covers the supplied evidence package; the delivery-added `README.md` and
`DELIVERY.md` are intentionally outside that original manifest. The [evidence archive](evidence.zip) contains all 143 original package files,
including four rendered screenshots under `baseline/ui`, JSON/logs and harnesses.
No game-source snapshot, generated site, credentials or production saves are included.
The archive is the authoritative complete replay layout; extract it to a new folder
before running the runner. The loose reports here are readable copies, not a second
full evidence dataset. `DELIVERY-SHA256.json` covers the compact delivery files.

Original scripts retain historical scratch paths. Use `replay.py`, not direct
execution of those originals. Its guarded scratch copies do not alter source.
A zero exit code is not necessarily a semantic pass: inspect discrepancy rows.

## Extract before replay

```sh
unzip evidence.zip -d /tmp/ic-review-evidence
cd /tmp/ic-review-evidence
python3 replay.py --repo /path/to/clean-release-455 --workdir /tmp/ic-review-slow --suite slow
```

Use a new extraction and work directory. The original evidence manifest covers the
extracted archive, not just the loose browser-readable report copies.
