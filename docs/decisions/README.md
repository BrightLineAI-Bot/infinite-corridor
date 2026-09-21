# Decision Records

Decision records preserve consequential project choices without turning ordinary implementation notes into bureaucracy. They complement `docs/design-decisions.md`; they do not replace it.

## When a record is required

Create a decision record before or with a change that establishes or materially changes:

- an architecture boundary or module responsibility;
- a deterministic-generation, simulation, ordering, seed, or replayability convention;
- save-schema compatibility, migration behavior, or persistent-data policy;
- a new dependency, build tool, or external service;
- a substantial gameplay-direction decision, especially one affecting the project's "add density, not obligation" principle;
- an irreversible project convention, data format, or operational policy.

Do not create records for narrow bug fixes, localized implementation details, or reversible refactors unless they establish one of the conventions above.

## File naming

Use `NNNN-short-title.md`, beginning with `0001-`. Assign the next number only when a real decision is ready to record.

## Template

```md
# NNNN: Decision title

- **Date:** YYYY-MM-DD
- **Status:** proposed | accepted | superseded | deprecated
- **Owners:**

## Context

What constraint, problem, or decision requires a durable record?

## Decision

What is being adopted, with precise boundaries and invariants?

## Consequences

What becomes easier, harder, required, or prohibited? Include compatibility and migration effects.

## Alternatives considered

What meaningful alternatives were rejected and why?

## Verification

What evidence or checks establish that the implementation follows this decision? Identify manual verification separately.
```
