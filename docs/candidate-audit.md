# Offline candidate audit receipt

`scripts/candidate-audit.mjs` observes an **existing frozen candidate** and prints a schema-1 JSON receipt to stdout. It reuses `verifyCandidate` from `scripts/pages-release.mjs`. It does not replace CI, freezing, Preview or Publish, and is not connected to a deployment workflow. No new credentials, dependencies or permissions are needed.

The receipt records the exact candidate commit/tree, frozen inventory digest and candidate-manifest SHA-256. Optional inputs add Actions artifact ID/name/digest, Preview and CI run IDs/attempts/results, a live-baseline observation, a since-live review report and three separate acceptance reports (hosted, visual, physical phone). Workflow/report inputs are caller-supplied snapshots, not authenticated facts. A run conclusion is recorded as `reported_success`, never as independently verified CI or deployment acceptance. Run success does not establish that a deploy job ran.

Every receipt sets `publicationAuthorized: false` and `releaseReadiness: "not_assessed"`, including when all supplied reports say passed. Receipts never authorize publication. Current owner instructions and the existing publication checks remain necessary. Do not treat a receipt, PR number, successful test, merged PR or old conversation as permission to publish.

## Safe isolated rehearsal

Run only on a distinct unnumbered branch/worktree, after coordinating its base with the game-session owner. This implementation has no workflow-dispatch or remote-write command. Nothing below stages files into gh-pages, changes gameplay or reserves a release number.

Use a previously downloaded/extracted candidate artifact in a separate temporary directory; do not rebuild a supposedly tested candidate. A bare rehearsal needs no network and no evidence file:

```sh
node scripts/candidate-audit.mjs --candidate /tmp/existing-candidate
node --test tests/candidate-audit.test.ts tests/pages-release.test.ts
```

The first command prints JSON, verifies both frozen file inventories and identity bindings, and marks external evidence `unavailable`. It opens input files read-only. It never writes a receipt itself. If preserving stdout, choose an output path outside the repository, candidate directory, and owner data; shell redirection is a caller action and can overwrite files.

Optional arguments:

```sh
node scripts/candidate-audit.mjs \
  --candidate /tmp/existing-candidate \
  --evidence /tmp/candidate-evidence.json \
  --archive /tmp/original-actions-download.zip \
  --repository /path/to/cloud-checkout
```

`--archive` hashes the original downloaded ZIP (at most 512 MiB), without extracting or executing it. A supplied Actions digest is compared with that hash; disagreement fails. If the digest is null, it stays null. Hashing or matching the ZIP **does not prove the extracted directory came from that ZIP**; the receipt records that relationship as `not_established`. The existing frozen inventory digest covers the extracted payload independently. These are different digests, not interchangeable proofs.

`--repository` performs a read-only Git commit-to-tree lookup using existing local objects, with lazy fetch and replace objects disabled. Missing commits are `unavailable`; an existing object that is not itself a commit (including a tree or annotated tag) fails before tree resolution, and a different tree fails. It does not fetch, check out refs, test main ancestry or change the repository. No repository argument means Git lookup is unavailable.

Exit 0 means the audit completed, including receipts with failed, pending or unavailable reports. Exit 1 means invalid input, inconsistent evidence or failed frozen-byte verification; no receipt is printed on stdout. Exit 0 is never a release-readiness signal. A failed/skipped/cancelled/neutral workflow stays `reported_not_success`. A missing human report stays `unavailable`. Supplied human reports retain `reported_` status, including `reported_unavailable` and `reported_not_run`. There is no waiver or automatic pass for visual or physical-phone checks.

## Disposable test-release rehearsal

The focused test file includes a synthetic rehearsal using the **existing** `stagePreview` and `stageRelease` functions. Run it alone with:

```sh
node --test --test-name-pattern='isolated test-release rehearsal' tests/candidate-audit.test.ts
```

The test creates a frozen synthetic candidate and a synthetic baseline site under a fresh OS temporary directory, copies the site to a disposable rehearsal directory with no Git remotes, stages the preview and release there, and compares the staged inventories with the frozen artifact. It verifies that the original site and candidate stay unchanged and that retained previews, CNAME and `.nojekyll` survive. A second case alters the staged preview and confirms release staging refuses it before changing the rehearsal site. Test cleanup removes the temporary fixtures.

The audit receipts before and after staging must be identical at a fixed observation time. CI/Preview and hosted/visual/phone evidence remain unavailable, and publication authorization remains false. These tests prove local staging and receipt behavior only. They do not dispatch an Actions run, publish a GitHub Release, serve a URL, modify real gh-pages, or establish hosted acceptance. Do not run staging functions against an owner checkout or production data as a substitute for these fixtures.

## Evidence input contract

JSON snapshots are limited to 1 MiB. Unknown fields fail, including attempted authorization fields. All nonempty evidence files must include `repository` equal to `BrightLineAI-Bot/infinite-corridor` and the exact `candidate` binding:

```json
{
  "repository": "BrightLineAI-Bot/infinite-corridor",
  "candidate": {
    "proposalId": "r1-aaaaaaaaaaaa",
    "candidateCommit": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "candidateTree": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  }
}
```

This is synthetic schema illustration, not a real release, reservation or acceptance result. Replace the entire binding with values from the existing candidate. Omit unavailable sections rather than inventing values. Additional optional sections have these shapes:

| Section | Fields and requirements |
| --- | --- |
| `ci`, `preview` | `id`, `run_attempt`, `path`, `head_sha`, `head_branch`, `event`, `status`, `conclusion`, `html_url`. Use `.github/workflows/ci.yml` or `.github/workflows/preview.yml` respectively, exact candidate commit, branch `main`, event `push` or `workflow_dispatch`, and the repository's canonical `https://github.com/BrightLineAI-Bot/infinite-corridor/actions/runs/<id>` URL. Preserve run attempt. A PR's synthetic merge/source CI is not exact merged-candidate evidence. |
| `artifact` | `id`, `name` (`candidate-<candidate id>`), `expired` (boolean), `digest` (`sha256:<64 lowercase hex>` or null), `workflow_run` with `id`, `head_sha`, `head_branch`. Artifact run must match supplied Preview run ID. Dry-run artifacts are refused. Expired artifacts stay explicitly expired. |
| `liveBaseline` | `identity` (full binding), `ghPagesCommit` (full SHA), `observedAt` (canonical UTC timestamp). Capture the identity from that exact gh-pages revision and its observation time. This records a historical observation; it does not recheck current live state or actual Options → System. |
| `review` | `candidate` (full binding), `liveBaseline` (full reviewed baseline binding), `status`, `reference`, `note`, `observedAt`. Both the candidate tree and observed baseline must match. A missing baseline is refused. A passed report remains an unauthenticated report, not a fresh independent review performed by this command. |
| `acceptance` | Optional `hosted`, `visual`, `physicalPhone` reports, each with `candidate`, `status`, `reference`, `note`, `observedAt`. Do not substitute a billboard/CPU/mock view for textured GPU acceptance or a browser viewport for a physical phone. |

Run/artifact identifiers accept positive safe integers or exact decimal strings; strings avoid precision loss. Completed runs need a conclusion; unfinished runs need null. Report `status` is one of `passed`, `failed`, `pending`, `unavailable`, `not_run`. References are bounded opaque identifiers starting with `review:`, `capture:`, `device:`, `conversation:` or `operator:`. Notes are at most 500 characters and references at most 300. Timestamps use `YYYY-MM-DDTHH:mm:ss.sssZ`. Keep secrets, production saves and personal data out of all evidence inputs.

## Coordination and next test

The initial cloud scope adds only this document, the standalone script and its tests. The existing CI/Preview/Publish workflows, release scripts, gameplay, production data, release log, and both PR #502 manifests are untouched. Existing local-owner worktrees and branches remain owned by their sessions. There is no release-number bump for this tooling change.

Before pushing or opening a draft PR, report the exact base/head/tree and file list to the coordinator, check current remote/main and overlapping changes, and coordinate PR creation with the local game session. Do not try to reserve or predict a PR number. Once a PR is coordinated, its existing CI can test this change with synthetic fixtures; no live or dry-run publication is required. An actual test release/publish rehearsal is a separate coordinated step using the existing workflows and a named artifact; this document grants no dispatch authority.

Focused tests cover false-success cases, exact binding, stale review baselines, run/artifact correlation, immutable inputs, CLI failures, and Git-tree mismatch. They establish audit behavior only. Full game CI, current hosted acceptance, independent since-live review, hardware-phone performance and publication remain separate evidence.
