---
phase: 03-trustworthy-optimization-results
plan: 01
subsystem: api
tags: [fastapi, ortools, react, diagnostics, pytest]
requires:
  - phase: 02-reliable-project-workflow
    provides: saved project constraints, roster persistence, pupil data workflow
provides:
  - structured optimizer infeasibility responses with human-readable violations
  - frontend diagnostic parsing and actionable Pupil Data failure feedback
  - regression coverage for impossible class-size requests
affects: [03-02, results-ui, optimizer-feedback]
tech-stack:
  added: [pytest, httpx]
  patterns: [cp-sat assumption literals for infeasibility diagnosis, typed frontend optimizer errors]
key-files:
  created: [api/test_optimizer.py, requirements.txt]
  modified: [api/optimizer.py, src/lib/api.ts, src/pages/PupilData.tsx]
key-decisions:
  - "Use CP-SAT assumption literals on hard constraints so infeasible requests return specific violations instead of generic failures."
  - "Keep diagnostic feedback on the Pupil Data page with both an inline summary banner and toast text so users can adjust constraints without leaving the workflow."
patterns-established:
  - "Optimizer 400 responses should use DiagnosticResponse payloads with category, message, and suggestion fields."
  - "Frontend optimizer failures should throw a typed OptimizerRequestError that preserves structured diagnostics."
requirements-completed: [OPTI-01]
duration: 7min
completed: 2026-03-20
---

# Phase 3 Plan 01: Improve optimizer request validation and error modeling Summary

**Structured infeasibility diagnostics in FastAPI with OR-Tools assumption literals and inline Pupil Data feedback for impossible roster runs**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-20T16:45:31+01:00
- **Completed:** 2026-03-20T16:52:34+01:00
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Added shared `Violation` and `DiagnosticResponse` models so optimizer failures return structured 400 payloads.
- Diagnosed infeasible solver runs with CP-SAT assumptions and mapped min/strict hard-constraint conflicts to human-readable suggestions.
- Kept users on the Pupil Data screen with parsed diagnostic toasts and an inline banner that explains how to relax constraints.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define DiagnosticResponse Models** - `7766e26` (feat)
2. **Task 2: Implement Infeasibility Diagnosis in API** - `030adee` (test), `c5a734f` (feat)
3. **Task 3: Implement Pupil Data Toast for Diagnostic Errors** - `c1da7cf` (feat)

**Plan metadata:** Pending

_Note: TDD task included separate RED and GREEN commits._

## Files Created/Modified
- `api/optimizer.py` - Added diagnostic models, class-size bound checks, assumption-literal conflict mapping, and structured 400 responses.
- `api/test_optimizer.py` - Added regression coverage for impossible `minClassSize` requests.
- `requirements.txt` - Added Python test dependencies needed to execute the planned optimizer verification.
- `src/lib/api.ts` - Added shared diagnostic types plus a typed optimizer error that preserves parsed 400 payloads.
- `src/pages/PupilData.tsx` - Added inline diagnostic banner and actionable toast handling for optimizer infeasibility.

## Decisions Made
- Used class-size bound prechecks for impossible `k` ranges, then CP-SAT infeasibility cores for solver-level hard-constraint failures.
- Reduced solver workers to `1` in the diagnostic path to keep infeasibility reporting deterministic enough for test coverage.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing Python test tooling**
- **Found during:** Task 2 (Implement Infeasibility Diagnosis in API)
- **Issue:** `pytest` was not installed and no repo-level Python test dependency file existed, so the required TDD verification could not run.
- **Fix:** Added `requirements.txt` with `pytest` and `httpx`, then installed dependencies locally before continuing the RED/GREEN loop.
- **Files modified:** `requirements.txt`
- **Verification:** `python -m pytest api/test_optimizer.py`
- **Committed in:** `030adee` (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The deviation was necessary to execute the planned tests. No product scope changed.

## Issues Encountered
- `pytest` was not on PATH and not installed as a Python module. Switched verification to `python -m pytest` after installing dependencies to keep commands deterministic in this environment.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `OPTI-01` is now covered with structured infeasibility outcomes and a visible Pupil Data recovery path.
- Phase `03-02` can build on the new diagnostic transport without revisiting optimizer error contracts.

## Self-Check: PASSED
- Found `.planning/phases/03-trustworthy-optimization-results/03-01-SUMMARY.md`
- Found task commits `7766e26`, `030adee`, `c5a734f`, and `c1da7cf`

---
*Phase: 03-trustworthy-optimization-results*
*Completed: 2026-03-20*
