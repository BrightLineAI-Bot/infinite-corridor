# Testing, previews and publishing on GitHub Actions

Tim's decision 2026-10-18: CI, previews (including the Proving Ground) and production publishing run entirely on GitHub Actions, driven from cloud sessions. Tim's PC and its release watcher are retired for this project, and there is no external approval gate. Production publishes only after a Fable review of everything changing since the live release **and** Tim saying "publish" in the session. The session procedure is in `AGENTS.md` (Publishing); this page covers the mechanics.

## What runs where

| Workflow | Trigger | Does | Token permissions |
| --- | --- | --- | --- |
| `ci.yml` | every PR, push to `main` | `npm test` and `npm run build` on Node 24; a **preview rehearsal** that freezes the candidate and stages it as a preview and as a release against the current gh-pages, pushing nothing | `contents: read` |
| `preview.yml` | push to `main`; `workflow_dispatch` (`dry_run`, default `true`) | **build**: test, build, freeze the candidate, rehearse staging, store the candidate as a workflow artifact. **deploy**: add `previews/<id>/` to gh-pages, prune, push, wait until Pages serves it, write the job summary. **comment**: "Preview ready: <url>" on the merged PR | build `contents: read`; deploy `contents: write`, `pages: write`; comment `contents: read`, `pull-requests: write` |
| `publish.yml` | `workflow_dispatch` only (`candidate`, required for a real publish; `dry_run` default `true`) | **verify**: resolve the candidate, require its commit on main and its tree to match, download its stored artifact, check its bytes, stage the release against gh-pages. **deploy** (only when `dry_run` is `false`): copy the release to the gh-pages root (keeping `previews/` and any hand-added `CNAME` or `.nojekyll`), push, wait until the live `release-identity.json` and `index.html` are the candidate's | verify `contents: read`, `actions: read`; deploy adds `contents: write`, `pages: write` |

Both deploy jobs use the concurrency group `pages` (never cancelled in progress), so nothing races on gh-pages. Third-party code is limited to `actions/checkout`, `actions/setup-node`, `actions/upload-artifact` and `actions/download-artifact`, each pinned by commit SHA. Untrusted text (inputs, commit messages) reaches scripts only through environment variables. Nothing uses `pull_request_target`, `workflow_run` or repository secrets.

The logic is in `scripts/pages-release.mjs` and is tested in `tests/pages-release.test.ts`. It reuses `freezeArtifact` from `src/release-artifact.mjs`, so previews and releases have exactly the shape the retired PC tool produced.

## Candidates and the gh-pages layout

- A candidate id is `r<N>-<first 12 hex of the main commit>`, e.g. `r181-b62ccf6fc7c3`. It replaces the release number in cache names, `?v=` URLs and the in-game release text, exactly as the old `icp_…` proposal ids did. Options → System in the live game shows `Release r181-b62ccf6fc7c3`.
- gh-pages keeps its layout: the release at the root, `previews/<id>/` (a self-contained Proving Ground build with its own worker scope, cache and scratch storage; no production entry or persistence module), and `release-identity.json` with the same shape `{"proposalId","candidateCommit","candidateTree"}`.
- Each preview keeps the newest 10 previews (by gh-pages history) and always keeps the one `release-identity.json` names. The first Actions preview prunes the ~40 old `icp_…` previews; they stay in gh-pages history.
- The preview run stores the frozen candidate (`release/`, `preview-site/`, `candidate.json`) as the workflow artifact `candidate-<id>` for 90 days. Publish downloads exactly that artifact and never rebuilds. It refuses unless the artifact came from a `preview.yml` run on `main`, the commit is an ancestor of `main`, gh-pages holds `previews/<id>/` with byte-identical files, and every file matches the digest recorded at freeze time.
- Freezing fails if `src/release-artifact.mjs` was not bumped with the release (its replacements would silently miss), and `tests/release-consistency.test.ts` checks the release number agrees across `index.html`, `sw.js`, `proving-ground/index.html`, `proving-ground/sw.js`, `scripts/build.mjs`, `src/main.ts`, `src/proving-ground-mobile.ts` and `src/release-artifact.mjs`.

## Running the workflows from a cloud session

Workflows run on `main` (`ref: main`). From a cloud session, use the GitHub MCP tool `actions_run_trigger` with `method: run_workflow`, `workflow_id: publish.yml` (or `preview.yml`), `ref: main` and `inputs`. With the GitHub CLI: `gh workflow run publish.yml --ref main -f candidate=<id> -f dry_run=false`. Follow the run with `actions_list` / `actions_get` and read the job summary or logs.

- **Dry-run publish** (harmless; the default): `inputs: {}` or `{"candidate": "<id>"}`. Only the read-only verify job runs; its summary names the candidate and what is live now.
- **Publish**: `inputs: {"candidate": "<id>", "dry_run": "false"}`, only after the Fable review and Tim's "publish". The workflow refuses a real publish without `candidate`, so the published candidate is always the one the review covered. Verify also checks the commit's tree matches the artifact's recorded `candidateTree`.
- **Dry-run preview**: `preview.yml` with `inputs: {}` builds, tests, freezes and rehearses without pushing (its artifact is named `dryrun-…` and publish ignores it). `{"dry_run": "false"}` re-publishes the preview of the current main head, for example after its artifact expired.

After a publish, confirm `https://brightlineai-bot.github.io/infinite-corridor/release-identity.json?cb=<anything>` names the candidate (the deploy job already waits for this and for `index.html`). Pages caches for up to 10 minutes, so the URL without a cache-buster may show the previous release for a while. Installed copies pick up the release on their next online launch.

## Failures and rollback

- **Preview failed**: read the failed job's log tail. Test or build failures are fixed in a new PR. A "did not serve the expected content" failure means Pages was slow or its build failed. Check the `pages-build-deployment` run, then re-run the job.
- **Publish refused**: the message says which check failed. Usually the preview was pruned or its artifact expired: re-run `preview.yml` with `dry_run: false` on the current main, review again, and publish the new id.
- **Queued runs**: GitHub keeps one pending run per concurrency group. If a preview is queued while a publish waits for the `pages` group (or the reverse), the older pending run is cancelled. Use "Re-run failed jobs" (re-running all jobs repeats `build`, whose artifact name already exists in that run, and fails), or dispatch `preview.yml` with `dry_run: false` for the current head.
- **Rollback**: revert the bad change on main through a PR. The merge previews automatically. Then review and publish that preview as usual. Do not push gh-pages by hand.

## Settings Tim may need

- **Settings → Actions → General → Workflow permissions**: the workflows request write access per job, which works with the default "Read repository contents" setting. If a push to gh-pages fails with 403, choose "Read and write permissions".
- **Settings → Pages**: source stays "Deploy from a branch", `gh-pages` / `(root)`, as today.
- **Settings → Branches** (optional): require the `test` and `preview-rehearsal` checks on `main`. Do not require code-owner review: CODEOWNERS names the same account that opens and merges PRs, so that rule would block every merge. Add a rule that only Actions may push to `gh-pages` if you want to protect it from hand pushes.
