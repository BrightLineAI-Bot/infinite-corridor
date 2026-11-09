# Isolated cloud 3D render laboratory (prototype)

This is test tooling, not a game release or a publication workflow. It consumes an
**already frozen candidate** and serves only its verified preview inventory on a
new loopback origin. It does not rebuild the input, touch production saves, modify
gameplay, reserve release/PR numbers, merge, dispatch Actions or publish.

## Run

Requirements: Node 24 (built-in WebSocket), installed Chromium with its **normal
sandbox**, loopback socket access, and a functioning supported WebGL2 renderer.
There are no npm dependencies and no changes to package.json or Actions.

```sh
node --test testing/render-lab/*.test.mjs
node testing/render-lab/run.mjs \
  --candidate /absolute/path/to/extracted-frozen-candidate \
  --digest <trusted-artifact-digest-from-candidate-audit> \
  --out /absolute/path/to/new-evidence-directory \
  --chromium /usr/bin/chromium
```

The input contains `candidate.json`, `release/` and `preview-site/` in the existing
Pages release format. Obtain the digest from the independently verified candidate
source/audit, not merely from untrusted input. The runner calls the existing
`verifyCandidate` and matches the explicitly supplied digest. It refuses existing
output directories and overlapping input/output, including symlink aliases and
misleading `..prefixed` child names. It does not extract archives.

Outputs: `receipt.json`, `chromium.log` and, only if the browser runs, one PNG per
scenario. It uses a disposable browser profile, cleans it only after confirming its browser process group has stopped, and shuts
down the server. Termination uses bounded SIGTERM then SIGKILL of that newly
created group only; unconfirmed cleanup blocks the receipt and retains the profile. No real journey or signed-in profile is opened. Candidate bytes
are checked again after successful sampling.

Exit 0 means **render-observed**, not approved or publishable. Exit 2 means blocked;
a fallback, missing sample, missing imported asset, stale/inactive frame, failed
GPU upload, missing diagnostics or runtime/network error cannot pass. Invalid CLI
arguments are ordinary nonzero process failures. Never map a nonzero run or missing
receipt to skipped/success in a publication gate.

## What it actually observes

Four seeded real Proving Ground combat-asset scenes: Cleaver, Pike, Aerial Step
loadout and Hammerfall loadout. Browser navigation uses the public URL contract.
After normal boot it reads the existing `closeViewRenderDiagnostics()` export twice
and requires active advancing `webgl2` frames, an `imported` player, ready assets,
and ready scene/hero GPU state. No renderer or simulation variables are changed.
Screenshots document the scene for human review. The current prototype is a **boot
and imported-render smoke test**, not animation/action acceptance: it does not yet
press attacks, play the complete combo, assert contact timing or judge a pose.

Chromium GPU diagnostics identify known software renderers (SwiftShader/llvmpipe)
as `software`; anything else is `unknown`, never presumed physical hardware.
There are no GPU forcing, blocklist bypass, unsafe SwiftShader or sandbox-disabling
flags. Software rendering, if supplied normally by a future worker, can establish
shader/asset functionality but **not phone FPS, thermal, battery, touch or aesthetic
acceptance**. Two real advancing frames do not prove every mesh is visually right.

## Actual cloud trial, 2026-11-09

Local rehearsal only: built unchanged r852 source at `b635f4b34336b3bad89054919ed699070ab8bdaa`,
tree `430a9c43d986f17a94d01c1a2cd74f7f858f7e8d`, then froze it under the existing
candidate machinery. Rehearsal digest:
`8397b830c7ef339e56c3a1ab32673537874db058925c25b9230cc7295c40b72d`.
This is **not** a claim to have downloaded or tested the GitHub frozen candidate.

The verified inventory server started. Installed Chromium 156 failed before opening
a page: `process_singleton_posix.cc:297 ... socket() failed: Operation not permitted`.
A normal-sandbox launch with permitted execution escalation failed the same way.
No `/dev/dri` devices, Docker executable or Xvfb executable are exposed here; EGL
libraries alone do not establish an available renderer.
No attempt was made to bypass that boundary. Consequently no screenshots, GPU
classification, game render, shader, imported-asset or visual pass was obtained.
The recorded result is blocked, with zero scenarios executed.

Reviewed-run evidence is preserved in `testing/render-lab/evidence/2026-11-09/`
and `/tmp/ic-render-lab-evidence-20261109-reviewed/{receipt.json,chromium.log}`.
The rerun confirms the owned browser process group stopped and its profile was removed.
The temporary rehearsal artifact is `/tmp/ic-render-lab-rehearsal-r852/`.
These local paths are execution artifacts, not durable GitHub artifacts or links.

## Integration boundary and next step

Keep this component separate from `scripts/candidate-audit.mjs`: its only input
contract is the audited frozen directory + expected digest; its output is a JSON
receipt plus evidence. Preserve the existing frozen-byte publication pipeline.
No workflow/config changes are included in this prototype.

Before it is a usable cloud 3D lane, run it on a cloud worker that legitimately
supports sandboxed Chromium and WebGL2. Use the same approved frozen candidate;
record its GPU classification, screenshots, logs and identity. Then add public-input
animation capture and independent screenshot/normal-speed motion review. Hosted
worker/cache isolation, update/offline behavior and physical-phone testing remain
separate gates. The current environment is **not ready for a test publish** on the
strength of this blocked rehearsal.

## Historical validation of the source prototype

- `npm test`: 3,354 passed, zero failed/skipped (394 s, Node 24.22.1).
- `npm run build`: static r852 build passed; no source/gameplay changes.
- `node --test testing/render-lab/*.test.mjs`: 22 passed, zero failed/skipped.
- `node --check testing/render-lab/run.mjs` and `git diff --check`: passed.
- Actual reviewed-run invocation: exit 2, correctly blocked before Chromium boot;
  owned process group shutdown and disposable-profile removal confirmed.

The source prototype's separate harness tests were outside the repository's default
`tests/*.test.ts` glob. The combined preflight branch adds
`tests/render-preflight-contract.test.ts` to run the no-browser contract suites in
ordinary PR CI. It also prepares a separate manual hosted preflight; see
[`../render-preflight/README.md`](../render-preflight/README.md). No hosted run or
publication is claimed by this integration.
