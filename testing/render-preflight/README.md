# Frozen-candidate hosted Chrome preflight — prepared, not dispatched

This is a manual, nonpublishing **capability and imported-render smoke probe** for GitHub-hosted Ubuntu 24.04. It extends the reviewed render-lab prototype from commit `9d394fbc0e1a86bffc432bf37fae51eaa9786d48` and consumes the reviewed offline candidate audit. The runtime audit script is unchanged. Existing CI, freezing, Preview and Publish are unchanged; this workflow neither builds a game candidate nor stages or deploys anything.

The original prototype's historical local blocked receipt remains under `testing/render-lab/evidence/2026-11-09/`. It is historical evidence, not a hosted result. No hosted run, sandboxed Chrome boot, WebGL2 renderer, screenshot, visual acceptance or phone result has been obtained by preparing this change.

## Exact input and evidence flow

`.github/workflows/render-preflight.yml` has **only `workflow_dispatch`**, runs on `ubuntu-24.04`, and requests only `contents: read` and `actions: read`. There are no deployment permissions, repository secrets, credential installation, dependency/browser installs, push, PR, schedule or chained workflow triggers. Checkout does not persist credentials. Third-party actions reuse the exact pinned versions already present in the repository. Evidence upload uses the Actions runtime artifact facility, not repository writes.

After local-owner coordination, select one already frozen, unexpired **real Preview** candidate. Supply all seven inputs; none defaults to latest:

| Input | Required evidence |
| --- | --- |
| `candidate_id` | Exact existing `r<N>-<commit12>`; never allocate a number for this preflight |
| `candidate_commit` | Full lowercase 40-hex commit SHA |
| `candidate_tree` | Full lowercase 40-hex tree SHA |
| `payload_digest` | Existing verified frozen inventory digest, 64 lowercase hex |
| `preview_run_id` | Exact completed successful `.github/workflows/preview.yml` run on main |
| `artifact_id` | Exact unexpired `candidate-<id>` Actions artifact from that run |
| `archive_digest` | Exact `sha256:<64 lowercase hex>` digest from Actions metadata |

The preflight:

1. Queries only the fixed repository's read-only artifact and run endpoints. It requires matching artifact/run IDs, candidate name/commit, main branch, Preview workflow path, successful completed run and exact supplied archive digest. It records the run attempt. A successful workflow conclusion is not a claim that Preview deploy ran; this probe does not check hosted preview bytes.
2. Downloads the exact artifact ZIP through the GitHub redirect, explicitly dropping Authorization before the HTTPS storage request. Signed URLs and tokens are not saved. The streamed archive is bounded to 512 MiB and must match the selected Actions digest.
3. Extracts only `candidate.json`, `release/`, `preview-site/` into a new directory. It rejects links, traversal, duplicate/case-colliding entries and extra roots; limits are 10,000 entries and 512 MiB expanded. No archived entry is executed.
4. Runs the existing candidate audit against the extracted payload, supplied metadata and original ZIP. The exact payload digest, commit/tree and repository's **commit object** must verify. Missing Git objects block this lane. The audit's conservative archive-provenance limitation remains unchanged; the preflight separately records that it performed bounded extraction of the downloaded ZIP.
5. Uses only preinstalled `/usr/bin/google-chrome-stable`; captures its actual version and worker image identifiers. It does not install or substitute Chromium if stable Chrome is absent. The browser runner gets only allowlisted basic environment variables, without Actions tokens, runtime upload credentials or injected `NODE_OPTIONS`.
6. Resolves the diagnostics import from the verified entry module, including its exact candidate query string, so sampling observes the live renderer module instance. It launches Chrome with its normal sandbox and a disposable profile. No sandbox disabling, blocklist bypass, unsafe SwiftShader, GPU forcing or system sandbox-policy changes are attempted. It serves only the already verified preview inventory on a fresh loopback origin and samples the real public seeded scenes.
7. Requires consecutive active advancing WebGL2 frames, the imported character, ready assets and ready scene/hero GPU state. Missing WebGL2, imported assets, diagnostics, browser startup or cleanup blocks the result. The known runtime/asset-error checks remain in the prototype.

The browser observes four boot/loadout scenes; it does not yet press attacks or prove combos/contact timing. Nothing changes simulation state, production journeys, caches on a hosted origin, release numbering, game source or owner manifests.

## Retention and honest outcomes

The first workflow step creates a bootstrap **blocked** receipt and log before checkout/setup/tests. An `if: always()` upload retains receipts, logs and any PNGs for 14 days. If setup fails, the bootstrap receipt remains the fallback. If the runner is cancelled before upload or the upload itself fails, GitHub cannot guarantee retained artifacts; inspect the job log and do not infer success.

Once the preflight starts, it writes `preflight-receipt.json` and `preflight.log` even on normal input/download/verification/browser failures. A completed browser runner writes `render/receipt.json` and the final bounded `render/chromium.log`, including failure. It attempts `render/failure.png` after a page exists if a later exception occurs. Before browser/page creation, or if CDP capture fails, screenshots are explicitly unavailable; no synthetic screenshot or pass is fabricated. A hard runner timeout may leave only bootstrap/preflight/process logs, with cleanup unconfirmed and a blocked result.

The probe opens the frozen Preview's Diagnostics panel twice and samples its
public rows. This avoids a separate diagnostic import during rendering. Both
samples must belong to the exact candidate.

The probe uses a 768 × 540 viewport at device scale 1 and requests the public
Close View Low setting to limit work on the software renderer. Each diagnostic
sample records the effective game tier when present. The first PNG is saved
before querying renderer diagnostics. This startup frame can show a fallback
while assets load. A successful WebGL witness still requires advancing completed
frames and the imported Wayfarer.

For r863 and later, the Cleaver fixture must report a newly accepted first cut
after normal Attack input. The receipt stores the attack samples and screenshots
before input and after acceptance. This witnesses the input and its action
record. The frame may be in follow-through or recovery, depending on Chrome
capture latency. Reviewing timing and motion requires separate playback.
When a crawl fixture exposes the shared route panel, the probe opens it after
the traversal. It records the position label and known routes, and requires
the discovered-chamber and connection headings for the Pentagon fixture.
When the frozen artifact includes the Great Tree summit fixture, the probe
records the summit gate and the live Cloud Hold after normal Act input. The
world-map receipt is separate from WebGL2 diagnostics and covers entry only.
Consecutive hops and reloads remain gameplay acceptance checks.

Upload paths exclude the downloaded ZIP, extracted game payload, browser profiles, credentials and raw API responses. `actions-evidence.json` contains only allowlisted candidate/artifact/run fields. `candidate-audit.json` remains an unsigned observational receipt with `publicationAuthorized: false` and `releaseReadiness: "not_assessed"`.

Renderer classification is `software` for known software-renderer signatures, otherwise `unknown`. `hardware` is reserved for independently established hardware evidence and is never inferred from a vendor name or WebGL2 success. The original prototype used the historical label `unverified`; newly generated receipts use `unknown`. Software frames can establish some shader/asset functionality, not hardware performance. Physical-phone coverage remains separately `not_measured`; visual acceptance stays `not_reviewed` even with PNGs and advancing frames.

Exit 0 means `render_observed` only. Exit 2 and any missing receipt mean blocked. No preflight status grants publication authority. There is no connection from this receipt to Publish, no automatic promotion and no claim of physical-phone FPS, thermals, battery, touch, visual quality or complete animation acceptance.

## Local validation and coordination

These commands use mocked acquisition and temporary fixtures; they do not launch Chrome, contact GitHub or open a server:

```sh
node --test testing/render-lab/*.test.mjs testing/render-preflight/*.test.mjs
node --test tests/candidate-audit.test.ts tests/pages-release.test.ts tests/render-preflight-contract.test.ts
```

The new `tests/render-preflight-contract.test.ts` bridge runs the renderer/preflight contract suites in ordinary PR CI without browser execution. No existing CI file is changed. The browser path remains manual; merely opening a PR does not run Chrome or dispatch this workflow.

Keep work on `claude/candidate-render-preflight-cloud`, separate from the source render-lab and candidate-audit owner worktrees. Before push/PR creation, report exact refs and changed paths, recheck current main and open PR overlaps, and coordinate one tooling PR with the local game-session owner. Do not predict or reserve a PR number. This file is a design/runbook, not dispatch permission. A newly added manual workflow normally must first exist on the default branch before it appears for dispatch; the coordinator must resolve availability and integration timing rather than bypass it with a PR-triggered privileged workflow. No merge is authorized by this runbook.

The next legitimate hosted run is only a capability preflight on an existing named artifact after coordination and explicit dispatch authorization. If normal sandbox Chrome or WebGL2 is unavailable, retain blocked evidence and stop; do not weaken the sandbox or substitute a phone/hardware claim. Actual hosted acceptance, independent screenshot/motion review, service-worker/offline/update testing and physical-device checks remain separate.

## Source basis

The official [Ubuntu 24.04 runner image inventory](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md) lists Google Chrome; image and browser versions can change, so this lane records them at execution and makes no WebGL2 guarantee. Artifact IDs, digests and read permissions follow the [GitHub Actions artifact REST API](https://docs.github.com/en/rest/actions/artifacts). These sources support the design; they do not establish that this prepared workflow has run.
