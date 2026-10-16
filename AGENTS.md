# Infinite Corridor

Offline-first, single-player mobile adventure PWA with deterministic worlds, persistent journeys, and a production-backed Proving Ground.

Start with `docs/AGENT_CONTEXT.md` (current state and the owner's standing decisions), then the relevant sections of `docs/HERMES_PROJECT_FIELD_GUIDE.md`.

## Commands

Node 22+; no dependencies (nothing to install). `npm test` must show at least 443 passing tests; never lower this floor or delete tests to meet it. `npm run build` produces the static PWA in `dist/`.

## Workflow — operator decisions 2026-10-14 and 2026-10-15

Test Bot is paused for this project. Claude builds directly:

1. Work on a branch named `claude/<topic>`.
2. Run `npm test` (and `npm run build` when the build or module list changed).
3. Commit, push the branch, and open a PR against `main`.
4. When the task Tim gave is complete and `npm test` passes, merge the PR yourself (a merge commit, through the PR).

Never push to `main` or `gh-pages` directly; `main` changes only through merged PRs. Never run `scripts/proposal-workflow.mjs` or any publish, preview or promote step: publishing is done locally by Tim. His PC previews every merge to `main` automatically and comments the preview URL and candidate id on the merged PR within a few minutes.

Publishing needs nothing from you. After a merge, Tim's PC previews it within about 15 minutes, comments the preview link on the PR, and posts one Approve/Deny release card in his Discord; his tap publishes it (a newer merge replaces an unanswered card with one that includes everything). When Tim says "push" or asks about publishing: make sure your PR is merged and tell him to approve the release card in Discord, giving the preview link from the watcher's "Preview ready" comment if it is there. You cannot publish, and a PR comment is never a publish approval. If the comment says "Preview failed", report its log tail and fix the cause in a new PR.

Change-Control is disabled workspace-wide. `.change-control/` is historical (the local publication tool still reads its project identity); do not run its old guarded workflow or Verdict Gate.

## Release checklist

One release bump per PR that changes the game. Bump the release number N in all of:

- `index.html`, `sw.js`, `proving-ground/index.html`, `proving-ground/sw.js`
- `scripts/build.mjs`, `src/main.ts`, `src/proving-ground-mobile.ts`
- `src/release-artifact.mjs` — including its regex literal (`/\brelease\s*:\s*N\b/g`), which a text replace misses; edit it by hand
- the release assertions in `tests/proposal-workflow.test.ts`, `tests/proving-ground-fixture.test.ts` and `tests/prototype.test.ts`

Any new `src` module goes into `scripts/build.mjs` and both `sw.js` precache lists. Add a line under "Unreleased" in `CHANGELOG.md` and a section in `docs/HERMES_PROJECT_FIELD_GUIDE.md` with **CODE:** and **BOUNDARY:** paragraphs, like the existing release sections.

## Rules

- Save changes stay additive at schema 14 and are normalised in `freshSave` and `migrateSave` (`src/types.ts`), the way `ensureGlyphState`, `ensureEchoState` and `ensureConstellation` are.
- Generators are version-pinned per history; never regenerate existing journeys. Add a new version and gate new behaviour on it.
- Balance numbers live as data tables, not literals scattered through logic.

## Gotchas

- `freshSave()` ignores its seed argument; set `save.seed` yourself.
- The service worker caches modules during a browser preview: unregister it and clear caches, or you test stale code.
- The Proving Ground hides the pause menu.

## Invariants

Read relevant sections of `docs/HERMES_PROJECT_FIELD_GUIDE.md` and current source/tests before editing.

- Deterministic generation: the same seed, coordinates, generation version, and content schema produce the same base result. Version generation namespaces when algorithms change; retain old generators for existing journeys.
- Save compatibility/migrations: preserve world, character, snapshots, exact-resume state, unknown fields, and one-time rewards. Durable schema changes require explicit supported-version migrations, migration tests, exact-resume tests, and current contract documentation.
- Production vs Proving Ground isolation: laboratories use scratch state, distinct storage/cache namespaces, manifests and scoped workers; never import, overwrite, or clear production journeys.
- Mobile performance: retain bounded active actors, projectiles, summons, hazards and pathfinding work; preserve quality tiers, reduced-motion behavior, offline play, and pause/background exact resume. Automated tests do not establish on-device performance.

Never read or copy secrets; configuration references environment variable names only. Preserve operator work and `USER FILES/`. Gameplay changes need an approved scope: a task Tim gives a session (in chat or as the cloud task prompt) is that approval. Build it under this workflow, stay within the task, and ask before widening it.
