---
phase: 05-polish-and-release-readiness
plan: 03
subsystem: testing
tags: [pytest, vitest, playwright, fastapi, react]
requires:
  - phase: 05-01
    provides: frontend toolchain and test-ready build baseline
provides:
  - Optimizer feasibility regression coverage for class-size edge cases
  - JS/Python roster scoring parity assertions from a shared six-pupil fixture
  - Route-stubbed Playwright journey for create-configure-import-optimize-results
affects: [phase-05-polish-and-release-readiness, qualification, release-readiness]
tech-stack:
  added: []
  patterns: [fixture-driven parity testing, route-stubbed end-to-end workflow coverage]
key-files:
  created:
    - api/test_feasibility.py
    - src/lib/__tests__/rosterValidation-parity.test.ts
    - tests/e2e/full-journey.spec.ts
    - tests/fixtures/fullJourneyData.ts
  modified:
    - .planning/phases/05-polish-and-release-readiness/05-03-SUMMARY.md
    - .planning/STATE.md
    - .planning/ROADMAP.md
key-decisions:
  - "Kept zero-pupil feasibility coverage aligned with the current API contract, which returns an empty successful response instead of a 400."
  - "Captured concrete Python reference scores from api/test_scores_explainability.py and asserted JS parity against those values."
  - "Used seeded auth storage plus page.route Supabase and optimizer stubs so the Playwright journey exercises the real UI flow deterministically."
patterns-established:
  - "Testing pattern: mirror Python optimizer fixtures in TypeScript parity tests when frontend scoring must stay aligned."
  - "E2E pattern: route-stub Supabase auth, REST, RPC, and optimizer endpoints instead of mocking React internals."
requirements-completed: [QUAL-01]
duration: 11min
completed: 2026-03-21
---

# Phase 05 Plan 03: Automated Journey and Parity Coverage Summary

**Optimizer feasibility regression tests, JS/Python score parity assertions, and a mocked full roster journey smoke test**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-21T07:28:30Z
- **Completed:** 2026-03-21T07:39:02Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added five pytest feasibility cases covering conflicting bounds, zero pupils, single-class success, under-minimum rosters, and exact-fit class counts.
- Added a vitest parity suite that mirrors the Python explainability fixture and checks score parity against concrete Python reference values.
- Added a Playwright smoke test and shared fixture data for the create-configure-import-optimize-results journey with mocked Supabase and optimizer routes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create pytest feasibility edge-case tests** - `a6bd304` (test)
2. **Task 2: Create JS/Python scoring parity test and full e2e journey test** - `c9566ab` (test)

**Plan metadata:** Pending docs commit

## Files Created/Modified
- `api/test_feasibility.py` - FastAPI optimizer feasibility coverage for success and failure edges.
- `src/lib/__tests__/rosterValidation-parity.test.ts` - Frontend score parity assertions against Python reference outputs.
- `tests/fixtures/fullJourneyData.ts` - Shared auth, project, pupil, constraints, CSV, and optimizer fixtures for the full journey flow.
- `tests/e2e/full-journey.spec.ts` - Playwright browser smoke test for the main roster workflow.

## Decisions Made
- Treated the zero-pupil case as a valid empty optimizer response because that is the current API behavior and the test should guard the shipped contract.
- Used the actual Python optimizer output as the parity oracle rather than weaker generic range-only assertions.
- Verified the new journey test in Chromium instead of stopping at file existence, because the plan’s risk is workflow breakage rather than fixture syntax.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The initial feasibility assertion expected only one diagnostic, but the optimizer correctly returns both the under-minimum and conflicting-bounds violations for that input; the test was updated to match the real response.
- The first Playwright draft used `getByDisplayValue`, which is unavailable in this repo’s Playwright version, and an ambiguous `75%` locator; both assertions were narrowed to stable compatible locators.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `QUAL-01` now has automated coverage across Python feasibility, frontend scoring parity, and the browser journey.
- Phase 5 still has `05-02` open in roadmap/state terms, so planning metadata remains in progress until that plan is also reconciled by the workflow.

## Self-Check

PASSED

- Verified required files exist on disk.
- Verified task commits `a6bd304` and `c9566ab` exist in git history.

---
*Phase: 05-polish-and-release-readiness*
*Completed: 2026-03-21*
