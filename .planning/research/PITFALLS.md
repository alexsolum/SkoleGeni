# Research: Pitfalls

## Pitfall 1: Users cannot trust why a result happened

- Warning signs: administrators ask “why did these pupils end up together?” and the product cannot answer clearly.
- Prevention: store and render constraint summaries, tradeoff notes, and clearer score explanations.
- Phase implication: address in optimization/results polish phase.

## Pitfall 2: Destructive saves corrupt roster data

- Warning signs: edits disappear after save failures, chemistry links drift from pupil rows, or partial writes leave projects inconsistent.
- Prevention: replace delete-and-reinsert flows with safer persistence and transactional mutation boundaries.
- Phase implication: address early, before UI polish.

## Pitfall 3: Manual edits are not durable

- Warning signs: users refine classes in the editor and later discover the system has no memory of those edits.
- Prevention: make assignments and revisions persisted domain objects, not just in-memory UI state.
- Phase implication: address in core workflow hardening.

## Pitfall 4: Open MVP security shortcuts leak into production

- Warning signs: anonymous full-table access remains enabled, keys/secrets stay committed in local configs, or the browser keeps privileged write access.
- Prevention: reintroduce RLS, narrow client permissions, and move privileged mutations behind trusted code paths.
- Phase implication: address in the foundation/security phase.

## Pitfall 5: Output is technically correct but operationally unusable

- Warning signs: results show IDs instead of names, class summaries are hard to scan, and administrators export to spreadsheets to finish the job.
- Prevention: optimize for human review, not just solver output correctness.
- Phase implication: address in results/editor polish.

## Pitfall 6: Solver changes become too risky to ship

- Warning signs: every optimizer change requires manual confidence, regressions appear in edge cases, and nobody wants to touch the scoring logic.
- Prevention: add targeted tests around feasibility, chemistry, score behavior, and result persistence.
- Phase implication: address early, alongside core hardening.

## Pitfall 7: Design polish happens before workflow safety

- Warning signs: UI looks better but users still lose work or cannot explain outputs.
- Prevention: treat polish as clarity plus safety, not just visuals.
- Phase implication: roadmap should place data integrity ahead of cosmetic refinement.

## Pitfall 8: Scope expands into a generic school platform

- Warning signs: roadmap starts adding unrelated admin features before the roster workflow is dependable.
- Prevention: keep the core value narrow and measure work against roster generation, balancing, review, and refinement.
- Phase implication: apply across all phases.
