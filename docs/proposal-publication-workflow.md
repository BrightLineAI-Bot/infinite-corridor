# Infinite Corridor candidate review and owner promotion

This repository-owned flow replaces the obsolete Verdict Gate requirement for **new schema-2 candidates only**. Change-Control is disabled. It does not initialize authorities, alter historical proposals, or operate another project's services. Existing schema-1 records remain readable and ineligible; create and validate a fresh candidate.

## Phone workflow

Send a bug or requested change through the existing phone-to-dot conversation. Include game release, lab/scenario/seed if relevant, steps, expected behavior and actual behavior. The coding agent prepares a bounded patch in an independent checkout, runs checks, and returns an exact candidate and preview. Browser gameplay never receives coding credentials or approval authority. An in-game report button and a PC-independent cloud worker are future work.

1. Prepare a clean committed `candidate/*` branch. Existing project UUID and GitHub origin must match; the physical checkout may differ from canonical `main`.
2. Create a candidate, then validate. Real `npm test` and `npm run build` receipts and post-check source reconciliation are required. There is no CLI fixture/synthetic PASS mode.
3. Validation freezes the full release and a self-contained scratch preview. Every file's path, byte length and raw SHA-256 contributes to the artifact identity. A proposal-specific version is applied to runtime URLs and workers so unchanged release-91 cache names cannot mask the candidate.
4. Publish the preview only after authorization for that publication. It adds `previews/<proposal-id>/` on `gh-pages`, with its own modules, images, CSS, manifest, worker scope, exact cache and scratch namespace. It does not change the production root or shared `/src` files. The preview has no normal-game HTML, normal entry module or persistence module.
5. Test on the phone. Review the candidate commit/tree, artifact/evidence/review digests, checks, changed files and rollback refs. Reply with **`approve <proposal-id> <review-digest>`** or **`reject <proposal-id> <review-digest>`**. Approval also confirms you tested that published preview. Approval for preparation or preview publication is not production approval.
6. The trusted operator records that exact human decision. A separate explicit promotion command publishes the sealed release **without rebuilding from mutable `dist/`**, with actual remote-ref comparison and an atomic, leased update of `main` and `gh-pages`. Other preview directories are retained.

## Trusted operator boundary

This is an ordinary version-control release tool, not an independently protected authorization service. Local manifests/checksums bind decisions to bytes but do not authenticate a person or protect against an operator who can alter files. `--source dot` is provenance, not authentication. The connected operator must forward an actual owner message; a coding agent must never invent one, treat model output as approval, or infer approval from silence. Nothing in an intake message or a browser button automatically consumes approval.

The old external Hermes profile adapter is not modified by this repository patch. Its existing `push` action now obtains a plan rather than deploying; direct trusted terminal operation supports the new actions. Connecting a runtime adapter or unattended queue is separate authorized work. No shared Hermes, network or profile changes are needed to prepare and review a patch through the currently connected operator.

## Local commands

Set `IC_CANDIDATE_ROOT` to the independent checkout and `IC_PROPOSAL_STORE` to its private task-local store. Never point a draft at the historical profile store. Commands use `node scripts/proposal-workflow.mjs`:

```text
create --source dot --title "Bounded change"
validate --id <proposal-id>
preview --id <proposal-id>
publish-preview --source dot --id <proposal-id>
publish-preview --source dot --id <proposal-id> --execute true
decide --source dot --id <proposal-id> --review-digest <digest> --preview-tested true --owner-decision "approve <proposal-id> <digest>"
decide --source dot --id <proposal-id> --review-digest <digest> --owner-decision "reject <proposal-id> <digest>"
push --source dot --id <proposal-id>
promote --source dot --id <proposal-id>
promote --source dot --id <proposal-id> --execute true
```

`preview` and `push` are read-only plans. Publication defaults to plan-only; `--execute true` is a separate explicit operation. A bare push cannot publish. Plan-only calls do not consume an approval or write deployment receipts. The historical project Discord channel remains an accepted provenance route; arbitrary channels fail.

Serve only the returned `localPreview` directory on loopback for local runtime validation. Do not serve the private store: it contains the full release payload, audit envelopes and publication work directories. The preview URLs are planned until an authorized preview publication has succeeded. Local browser checks do not establish Android install, touch, thermal or airplane-mode behavior.

## Failures, drift and rollback

Expired/rejected/superseded/failed/consumed candidates, changed source/dependencies, changed or missing/extra payload files, and mismatched review digests fail closed. New content requires a new candidate and human decision. Store directories must be private to this operator; SHA-256 is integrity evidence, not access control.

Immediately before publishing, the tool queries actual remote `main` and `gh-pages`, checks the recorded expected refs and uses explicit leases with an atomic push. Promotion additionally checks source ancestry. Every state mutation shares a per-proposal lock; target commits are recorded before the push. Both working files and the resulting committed Git blobs must match the sealed payload; preview commits must leave every path outside the candidate unchanged.

A hard-killed process leaves its lock, so an ordinary retry cannot recover it. The operator can inspect `recover-lock --source dot --id <id>`: it proves the recorded process no longer exists, checks source/artifact identity and compares recorded targets with actual remote refs. An explicitly authorized `recover-lock --source dot --id <id> --lock-digest <returned-digest> --execute true` either records an already-completed publication, confirms a prepared publication was never applied, or releases a non-publication abandoned operation. Ambiguous refs or a live/unidentifiable process remain blocked. The command performs no remote push, retains prior revisions/work directories and never blindly clears state. A partial artifact left during validation requires a fresh candidate. No automatic production retry or rollback occurs.

Rollback identities are the recorded pre-candidate source and Pages commits; deployed target refs are retained after promotion. A future rollback requires explicit owner authorization, comparison against the actual deployed refs, and exact leases so it cannot overwrite a later release. Git branch publication success does not establish that GitHub Pages has finished serving the build: verify live `release-identity.json`, workers and entry bytes before declaring delivery complete. A user's installed service worker may still need an online update cycle.
