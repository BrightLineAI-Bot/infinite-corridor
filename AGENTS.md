# Infinite Corridor

Offline-first, single-player mobile adventure PWA with deterministic worlds, persistent journeys, and a production-backed Proving Ground.

## Commands

Node 22+; no third-party runtime dependencies. Run `npm test` (registered floor: 363 passing tests) and `npm run build` (static PWA in `dist/`). For local candidate inspection run `npm run start:proving-ground:fixture` and open `http://127.0.0.1:5174/proving-ground/`; it builds and serves locally without network access.

## Workflow — operator decision 2026-10-11

Test Bot makes all code changes in isolated worktrees through approved cards, npm test checks, staging, and an operator-approved merge into local main. The `infinitecorridor` Hermes profile only investigates and publishes merged main through `scripts/proposal-workflow.mjs`: create, validate, publish-preview, promote. Each publication requires its own Discord approval card; preparation, preview publication, and production promotion are separate approvals. Never invent owner approval or publish from an unmerged Test Bot branch.

Change-Control is disabled workspace-wide. `.change-control/` is historical, not an authority for new work (the publication tool still reads its project identity). Preserve historical records; do not run its old guarded workflow or Verdict Gate.

## Invariants

Read relevant sections of `docs/HERMES_PROJECT_FIELD_GUIDE.md` and current source/tests before editing.

- Deterministic generation: the same seed, coordinates, generation version, and content schema produce the same base result. Version generation namespaces when algorithms change; retain old generators for existing journeys.
- Save compatibility/migrations: preserve world, character, snapshots, exact-resume state, unknown fields, and one-time rewards. Durable schema changes require explicit supported-version migrations, migration tests, exact-resume tests, and current contract documentation.
- Production vs Proving Ground isolation: laboratories use scratch state, distinct storage/cache namespaces, manifests and scoped workers; never import, overwrite, or clear production journeys.
- Mobile performance: retain bounded active actors, projectiles, summons, hazards and pathfinding work; preserve quality tiers, reduced-motion behavior, offline play, and pause/background exact resume. Automated tests do not establish on-device performance.

Never read or copy secrets; configuration references environment variable names only. Preserve operator work and `USER FILES/`. No gameplay changes without a separate approved scope.
