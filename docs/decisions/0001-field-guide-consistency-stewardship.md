# 0001: Field-guide stewardship and the Consistency Steward review role

- **Date:** 2026-09-21
- **Status:** accepted
- **Owners:** Tim (project owner), Bright Line IP

## Context

Infinite Corridor has grown to a size where a single change can cross several systems without the author noticing. The codebase is 17 source modules, including a 2,732-line `src/game.ts` and a 1,852-line `src/main.ts`. Durable state is versioned, generation is deterministic from seed namespaces, and several player-facing behaviours depend on geometry, budgets, and one-time reward idempotence holding simultaneously.

A durable developer field guide now exists at `docs/HERMES_PROJECT_FIELD_GUIDE.md` (created in commit `258c0df`, 646 lines). It maps architecture, runtime dataflow, purity and mutation boundaries, saves and migrations, generation namespaces and coordinate spaces, combat and AI, dungeon population, arenas, deep-dungeon traversal, interaction dispatch, scenes, UI surfaces, guidance symbols, performance budgets, tests, and the high-risk regression areas.

A guide alone does not change behaviour. Without a review step, an agent can read the guide, agree with it, and still duplicate an existing system, break a seed namespace, or leak hidden narrative through a new surface.

## Decision

**1. The field guide is the architectural orientation and regression-control document for every change.** Before implementing, an agent reads the relevant guide sections and inspects the current source modules involved. The guide is a living map, not an unquestionable source of truth. Where the guide conflicts with current source, current tests, verified history, or an explicitly approved design change, the conflict is recorded and reconciled. Correct code is never modified merely to match stale documentation.

**2. Every modification follows a seven-phase workflow.**

1. Orientation: read relevant guide sections, inspect source, read tests and docs, inspect Git status and preserve unrelated work, follow `GLOBAL_CHANGE_CONTROL.md`, use `Change-Control.ps1`, resolve the real repository root and project authority, and never assume the guide is current.
2. Pre-change impact review: a bounded request to the Consistency Steward returning an Impact Record.
3. Implementation under the required change-control workflow.
4. Post-change consistency review against the exact diff, before completion or commit.
5. Field-guide reconciliation.
6. Verification proportionate to the change.
7. Completion report.

**3. The Consistency Steward is an independent reviewer role with these boundaries.**

- It does not replace the primary implementer and does not edit files unless ownership is separately and explicitly assigned.
- It does not run concurrently on the same files as the implementer unless ownership is explicitly divided.
- It receives the exact user request, repository root, branch and HEAD, proposed files, relevant guide sections, the plan or diff, test results, and known manual-validation gaps.
- Its Impact Record covers 17 areas: related existing systems, reusable existing implementation, potential duplication, deterministic generation, save schema and migration, geometry and traversal, combat and balance, narrative and spoiler exposure, UI and terminology, mobile performance, offline and PWA behaviour, existing protective tests, required new tests, guide sections needing revision, high-risk regressions, conflicts with established design, and whether an architectural or public contract changes.
- It distinguishes VERIFIED IN CURRENT CODE, VERIFIED BY TEST, DOCUMENTED INTENT, FIELD-GUIDE CLAIM, PROPOSED CHANGE, MANUAL VALIDATION REQUIRED, and UNRESOLVED.
- Its post-change verdict is exactly one of CONSISTENT, CONSISTENT WITH FOLLOW-UPS, REVISION REQUIRED, or INSUFFICIENT EVIDENCE.
- It cites files, symbols, tests, or diff locations. A generic approval is not acceptable.
- It must not approve a design because the guide describes it. It inspects the current implementation.

**4. The Steward is realized as an independently dispatched worker, not as an in-session review.** Concretely, the Steward is a Hermes kanban task on the `infinite-corridor` board, assigned to an existing profile with an architecture-class model pinned for the task, in its own workspace. Rationale: it must have separate context and a separate audit trail to be a real review. A review performed by the implementer inside its own session is not equivalent and, when it happens, must be labelled as self-review rather than presented as Steward output.

**5. Evidence labels are preserved in every record.** Claims are labelled CODE, TEST, INTENT, or UNTRACED, with a file and line or a command and its actual result. A passing automated test is not evidence of on-device behaviour. No agent may claim Android, touch, airplane-mode, installed-PWA, background and resume, or frame-rate validation unless it genuinely performed and recorded that check.

**6. Documentation writes pass through change control.** New files and contract changes require explicit review, ordinary version control, and a fresh checkpoint, and must not be described as guarded adapter effects. Changes to existing ordinary public files use the guarded workflow.

**7. The guide is reconciled with the change, not after it.** Materially affected sections are edited in place rather than appended chronologically. Trivial edits that do not change the guide's architectural truth do not produce guide entries. `CHANGELOG.md` is updated for user-visible or release-relevant changes, `docs/work-log.md` for implementation and verification evidence, this directory for architectural or contract decisions, and `docs/verification.md` when verification procedure changes.

## Consequences

- Every change acquires a pre-change Impact Record and a post-change verdict, with the cost of an extra review cycle. The cost is accepted because the alternative is silent cross-system breakage.
- A change that deliberately alters an existing rule must identify the old rule, explain why it changes, review compatibility, update tests, update the guide, preserve historical records, and disclose the change. The guide does not freeze the project.
- The guide must be updated in the same change that alters its truth, or it becomes misleading.
- Independence of the Steward depends on dispatch mechanics: assignee, pinned model, and separate workspace. It is verified by inspecting the task, not by assertion.
- New-file creation under this policy is not a guarded adapter effect and must never be reported as one.

## Alternatives considered

- **Self-review inside the implementer's session.** Rejected: the same context and the same author cannot supply meaningful independence, and there is no audit trail beyond a transcript.
- **A dedicated consistency-steward profile.** Deferred rather than rejected. The four existing profiles are `brightline`, `dreamweaver`, `patent-research`, and `personal`. Creating a fifth profile is additional setup, so the Steward currently runs as a dispatched task on an existing profile with a pinned architecture-class model. If review quality proves insufficient, a dedicated profile becomes the next step.
- **Informal review without a written Impact Record.** Rejected: the 17-area record is what forces cross-system awareness, and its absence is what allows duplication and budget violations.
- **Relying on the field guide as authority.** Rejected: a living map maintained by the same agents it guides cannot arbitrate. Current source, current tests, and approved design changes take precedence.

## Verification

- The guide exists and is tracked: `git ls-files docs/HERMES_PROJECT_FIELD_GUIDE.md` returns the path at commit `258c0df`. CODE.
- Working tree state at the time of this record: branch `main`, HEAD `258c0df`, clean before this write.
- Change-control evidence for this operation: `status` returns `ok:true`, projectId `8225aa1c-9d77-49ac-a8a9-f6b740f7d6f6`, no active operations, 23 recorded drift entries. Checkpoint `76cda8706ae42e78532d2613756953e552521deb5e15e2750c0ab45c7ba5c047` observed 43 files with `preexistingWorkPreserved:true`. CODE.
- Drift disclosure: the control plane reports three `sha256+identity` and twenty `input-binding` drift records, and `observedVersions` is null for every recorded resource. Drift records are observations about recorded versus current identity. They are not permission to rewrite anything and they did not block this operation. This is disclosed rather than resolved, and resolving it is a separate decision.
- Manual verification, not yet performed: that a dispatched Steward task is genuinely independent, that its pinned model actually differs from the implementer's, and that its workspace is separate. This must be confirmed by reading the task record on its first real use.
