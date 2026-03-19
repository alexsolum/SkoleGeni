# Research: Features

## Scope

This feature research is for a brownfield education operations product. The current MVP already covers the core roster-creation loop, so the question is what must exist in a polished v1 for administrators to trust and adopt it.

## Table Stakes

### Project and Data Management

- Save and reopen roster projects reliably.
- Edit constraints and pupil data without losing previous work.
- Import structured pupil data from CSV with clear validation feedback.
- Show meaningful names and class summaries instead of opaque IDs in outputs.
- Complexity: low to medium.
- Dependency: stable persistence model.

### Optimization Trust

- Explain what constraints were applied and where tradeoffs occurred.
- Surface when a rule was softened or could not be perfectly met.
- Persist optimization runs with timestamps and enough detail to compare runs.
- Show a clear audit trail of the latest result used in the editor.
- Complexity: medium.
- Dependency: better run storage and result presentation.

### Manual Refinement

- Let users refine classes after optimization.
- Preserve manual edits instead of making the editor effectively ephemeral.
- Prevent invalid moves clearly and immediately.
- Recalculate scores and show the reason for score changes.
- Complexity: medium.
- Dependency: class assignment persistence and score explainability.

### Workflow Safety

- Validate required inputs before optimization.
- Protect against destructive save semantics that can drop data on partial failure.
- Reduce the chance of accidental data corruption by admin users.
- Complexity: medium.
- Dependency: transactional or safer server-side persistence.

## Differentiators

- Rich explainability for why a pupil ended up in a class.
- Scenario comparison across multiple optimization runs.
- Fine-grained chemistry handling and conflict visualization.
- Constraint sensitivity tools showing which rules most affect outcomes.
- Bulk review tools for principals/coordinators before finalizing rosters.
- Complexity: medium to high.

## Brownfield Polish Priorities

- Replace fragile delete-and-reinsert writes with safer persistence semantics.
- Make results readable and decision-ready for administrators.
- Persist class editor changes.
- Align the UI more tightly with the intended SkoleGeni visual system.
- Add tests around optimizer behavior and the pupil workflow.
- Pin dependencies and clean up environment/runtime expectations.

## v2 Candidates

- Multi-user collaboration and permissions.
- Approval workflows across multiple staff roles.
- Scenario branching with side-by-side result comparison.
- Richer reporting/export for downstream school systems.
- Integration with SIS/import pipelines beyond CSV.

## Anti-Features

- Mobile-first redesign: wrong target environment for this product.
- Consumer-style social or engagement features: not relevant to the administrative workflow.
- Broad all-in-one school admin suite expansion: distracts from the core class-generation value.
- Visual over-decoration that reduces density or slows data-heavy tasks.

## Product Principle

Administrators will trust this tool only if it is legible, safe, and reversible. The v1 bar is not just “optimizer works”; it is “the whole workflow feels dependable under real roster-editing conditions.”
