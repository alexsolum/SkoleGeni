---
phase: 03-trustworthy-optimization-results
plan: 03
subsystem: api
tags: [ortools, fastapi, react, pytest, explainability]
requires:
  - phase: 03-02
    provides: Results dashboard cards and shared result rendering primitives
provides:
  - Solver debug metadata for sacrificed priorities and weakest classes
  - Results UI sections for tradeoff explanations and outlier highlighting
  - Regression fixtures that lock solver behavior to stable scenario invariants
affects: [phase-04-class-editor, optimization-results, testing]
tech-stack:
  added: []
  patterns:
    - Optimizer debug metadata drives both frontend explainability and solver regression coverage
    - Scenario fixtures assert invariants instead of brittle exact assignments
key-files:
  created: [api/test_scores_explainability.py, api/test_fixtures.py, .planning/phases/03-trustworthy-optimization-results/03-03-SUMMARY.md]
  modified: [api/optimizer.py, src/pages/Results.tsx, src/components/ClassCard.tsx, src/lib/api.ts]
key-decisions:
  - "Treat materially imperfect active score categories as sacrificed priorities so tradeoff explanations stay populated for real solver compromises."
  - "Expose worst-class highlights through optimizer debug metadata and let the frontend translate those indices into visible class badges."
patterns-established:
  - "Explainability contract: backend debug metadata remains the single source for sacrifice summaries and weakest-class signals."
  - "Regression fixtures use named roster scenarios with score and assignment invariants to guard future optimizer tweaks."
requirements-completed: [OPTI-03]
duration: 7 min
completed: 2026-03-20
---

# Phase 3 Plan 3: Explainable optimizer tradeoffs with weakest-class highlights and regression fixtures Summary

**Solver explainability metadata now identifies sacrificed priorities and weakest classes, while the Results dashboard and regression fixtures make optimization outcomes easier to defend over time.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-20T17:09:33+01:00
- **Completed:** 2026-03-20T17:15:52+01:00
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Added sacrificed-priority and worst-class analysis to the optimizer debug payload while keeping scores normalized as positive satisfaction values.
- Rendered human-readable tradeoff explanations and weakest-class highlighting in the Results view.
- Added a fixture-driven regression suite for balanced, chemistry-conflict, and boundary-size solver scenarios.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement Tradeoff Detection and Outlier Analysis** - `d63666a` (test), `778bd17` (feat)
2. **Task 2: Dashboard Explainability Features** - `75b6604` (feat)
3. **Task 3: Established Regression Fixtures Suite** - `2fc5dd0` (test)

## Files Created/Modified
- `api/optimizer.py` - Computes per-category penalties, sacrificed priorities, and weakest-class indices in optimizer debug output.
- `api/test_scores_explainability.py` - TDD coverage for normalized scores and explainability metadata.
- `api/test_fixtures.py` - Named solver fixtures with stable score and assignment invariants.
- `src/pages/Results.tsx` - Shows tradeoff summaries and passes weakest-class highlights into class cards.
- `src/components/ClassCard.tsx` - Visually marks classes called out by explainability metadata.
- `src/lib/api.ts` - Extends OptimizeResponse typing for the new debug payload.

## Decisions Made
- Treated score categories with real penalty and less than full satisfaction as sacrificed priorities so the UI can explain broad compromises, not only extreme outliers.
- Kept class highlighting metadata numeric in the API and mapped it to display labels in the frontend to preserve a stable backend contract.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Switched verification commands to `python -m pytest`**
- **Found during:** Task 1 (Implement Tradeoff Detection and Outlier Analysis)
- **Issue:** `pytest` was not available on PATH in the execution shell, so the plan's verification command failed before tests could run.
- **Fix:** Used `python -m pytest` for RED, GREEN, and final verification commands.
- **Files modified:** None
- **Verification:** `python -m pytest api/test_scores_explainability.py`, `python -m pytest api/test_fixtures.py`, `python -m pytest api/test_scores_explainability.py api/test_fixtures.py`
- **Committed in:** Not committed (execution environment adjustment only)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No scope creep. The deviation only changed how verification commands were invoked in this shell.

## Issues Encountered
- The initial "perfectly balanced" regression fixture used odd per-category totals, which made a mathematically perfect score impossible. The fixture was corrected to a divisible scenario so it can serve as a stable gold standard.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 3 is now complete from an explainability standpoint and has regression coverage for future solver changes.
- Phase 4 can build on the weakest-class and tradeoff metadata if the editor needs to surface manual refinement targets.

## Self-Check

PASSED

---
*Phase: 03-trustworthy-optimization-results*
*Completed: 2026-03-20*
