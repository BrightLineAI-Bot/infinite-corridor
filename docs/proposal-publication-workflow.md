# Proposal and publication-preparation workflow

This project provides a fail-closed proposal workflow for the Infinite Corridor Discord profile. It prepares immutable, project-bound candidate manifests, runs allowlisted validation, records bounded evidence, reconciles the current repository, and produces a non-mutating publication preview.

It does **not** publish. `push` never deploys, and `push <proposal-id>` stops with `BLOCKED: protected Verdict Gate authorization unavailable`. No local JSON file, model statement, fixture, or same-account Verdict Gate prototype can authorize promotion.

## Commands

- `status`
- `proposals`
- `proposal <proposal-id>`
- `validate <proposal-id>`
- `preview <proposal-id>`
- `supersede <proposal-id>`
- `push`
- `push <proposal-id>`

The project-scoped Hermes plugin maps those commands to `scripts/proposal-workflow.mjs`. The plugin fixes the repository, proposal store, project UUID, and authorized channel; it accepts no arbitrary command or path.

Proposal records live outside Git at `C:\AI-PROJECTS\.hermes\profiles\infinitecorridor\proposal-store`. Each revision and state event is retained. Candidate creation requires a clean committed `main` checkout with the configured origin. Full validation runs `npm.cmd test` and `npm.cmd run build` before reaching `WAITING_FOR_VERDICT_GATE`.

## Trust boundary

The current Verdict Gate is a same-account deterministic prototype, not a protected service. The adapter therefore reports the verifier unavailable and cannot produce `ELIGIBLE`, `PROMOTION_STARTED`, `DEPLOYED`, or `CONSUMED`. Future cutover requires a protected authenticated record bound to the project UUID, proposal revision, candidate, manifest, evidence bundle, dependency snapshot, nonce, protocol, issue time, and expiry.

