# Replaying the recorded audit

The game source tested was commit `04c11a0d3b73eeb9c767e9548cd3724c92a8dba9` (release 455). The documentation branch carrying this folder may have a later HEAD. It is **not** the source that these results certify. No certification of every possible build or human/mobile experience is implied.

## Files and provenance

- `baseline/REPORT.md`: completed broad audit, preserved byte-for-byte.
- `interactions/Infinite-Corridor-interactions-audit-2026-10-26.md`: separate interaction supplement.
- Subfolders contain original measured JSON, logs, small harnesses and rendered screenshots, not game source or production saves.
- `MANIFEST-SHA256.json`: package evidence digests, excluding itself.
- `source-sha256.json`: digests of the pinned `src` inputs.
- The original harnesses retain their recorded workspace paths. Do not run them directly in the documentation checkout. The runner makes portable copies; originals remain unchanged.

## Requirements and example

Use Node 24 (measured version 24.22.1), Python 3 and Git. No dependency installation is required. Obtain a separate **clean checkout at the exact audited commit** using your normal authorized repository access. The runner rejects a later commit and tracked source edits before creating scratch output.

```sh
python3 replay.py --repo /path/to/clean-release-455 --workdir /tmp/ic-review-slow --suite slow
python3 replay.py --repo /path/to/clean-release-455 --workdir /tmp/ic-review-bombard --suite bombard
python3 replay.py --repo /path/to/clean-release-455 --workdir /tmp/ic-review-clone --suite clone-cooldown
```

Each workdir must be new and outside both the source repository and this evidence folder. The runner copies evidence and scripts into that scratch directory, changes only copied absolute artifact prefixes, and creates a scratch symlink to the supplied source checkout. It executes the selected recorded harness. It does not change the repository, install software, use credentials, contact external services, clear saves, or publish anything. Keep the scratch directory for inspection, or remove only that disposable directory yourself after review.

Use `python3 replay.py --help` for available suites. Larger boss/matrix suites take longer. A successful process exit is not by itself a semantic pass: some harnesses collect discrepancy rows without exiting nonzero. Inspect the report and resulting JSON/logs. The three focused finding reproductions deliberately confirm the measured faulty behavior rather than pretending the bug has been fixed.

## Runner validation

`runner-validation.log` records a successful replay of the independent slow-control reproduction in a new scratch directory. `runner-wrong-sha-validation.log` records rejection of a later source SHA with exit 2 and no scratch directory created. The tested source checkout remained clean. The runner was not tested on Windows without symlink support; WSL/Linux is the established route. A different path layout works through `--repo` and `--workdir` without editing original harnesses.
