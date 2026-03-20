---
phase: 02-reliable-project-workflow
plan: "02"
subsystem: ui
tags: [react, vitest, papaparse, lodash.debounce, autosave, csv-import]
requires:
  - phase: 02-01
    provides: shared workflow save-state contract and status banner
provides:
  - resilient mapped CSV import with partial success handling
  - persistent pupil issues panel with duplicate and field validation reporting
  - debounced roster autosave with retry, draft persistence, and optimizer gating
affects: [pupil-workflow, optimization-readiness, workflow-status]
tech-stack:
  added: [lodash.debounce]
  patterns: [shared pupil workflow helper module, session draft recovery, debounced autosave state machine]
key-files:
  created: [src/lib/pupilWorkflow.ts, src/components/pupil/CsvMappingModal.tsx, src/components/pupil/IssuesPanel.tsx, src/pages/__tests__/pupil-import-validation.test.tsx, src/pages/__tests__/pupil-autosave.test.tsx]
  modified: [src/pages/PupilData.tsx]
key-decisions:
  - "Kept CSV normalization, duplicate detection, draft persistence, and autosave orchestration in src/lib/pupilWorkflow.ts so PupilData stays thin and future pupil steps can reuse the same contract."
  - "Used sessionStorage drafts only for blocked or failed roster edits, and cleared them only after saveProjectRosterState succeeds so unsaved local state survives reloads without overwriting persisted rows."
patterns-established:
  - "Pupil workflow mutations update local state first, then flow through collectPupilIssues plus createRosterAutosave for save gating."
  - "WorkflowStatusHeader is the shared surface for loading, saving, saved, error, and blocked states across setup screens."
requirements-completed: [FLOW-03, FLOW-04]
duration: 18min
completed: 2026-03-20
---

# Phase 02 Plan 02: Reliable Project Workflow Summary

**Mapped CSV import with duplicate-aware validation, persistent roster issues reporting, and debounced autosave that blocks optimization until roster state is safe**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-20T07:23:39Z
- **Completed:** 2026-03-20T07:41:10Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added shared pupil workflow helpers for CSV header aliasing, gender normalization, duplicate fingerprints, failed import summaries, autosave orchestration, and session draft storage.
- Refactored `PupilData` to support mapping unresolved CSV headers, partial import append behavior, inline error clearing, shared workflow banners, retryable autosave, and optimizer disablement during unsafe save states.
- Added targeted Vitest coverage for import resilience, immediate issue synchronization, autosave debounce timing, failed-save retry, and blocked draft recovery across remounts.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add mapped CSV import, normalization, duplicate detection, and persistent issue reporting** - `4f76b50` (test), `105009a` (feat)
2. **Task 2: Add debounced autosave, save-state gating, and optimizer blocking rules to pupil workflow** - `78148a0` (test), `1a90e99` (feat)

**Plan metadata:** pending

## Files Created/Modified
- `src/lib/pupilWorkflow.ts` - Shared import, validation, autosave, and draft helpers for the pupil workflow.
- `src/components/pupil/CsvMappingModal.tsx` - Column-mapping modal for unresolved CSV headers.
- `src/components/pupil/IssuesPanel.tsx` - Persistent Errors, Warnings, and Failed Imports surface.
- `src/pages/PupilData.tsx` - Non-destructive import flow plus debounced save-state/optimizer gating.
- `src/pages/__tests__/pupil-import-validation.test.tsx` - Import mapping, duplicate handling, and inline validation coverage.
- `src/pages/__tests__/pupil-autosave.test.tsx` - Debounce, retry, blocked draft, and save banner coverage.

## Decisions Made
- Centralized roster workflow behavior in `src/lib/pupilWorkflow.ts` instead of leaving CSV parsing, duplicate logic, and autosave state transitions embedded inside the page component.
- Treated blocked validation and failed save states as draft-only persistence paths, so the UI can preserve edits locally while `saveProjectRosterState(...)` remains the only committed server save seam.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Isolated import and autosave suites from shared draft storage collisions**
- **Found during:** Task 2
- **Issue:** Combined verification of both pupil suites leaked `sessionStorage` draft state across tests, making the import suite nondeterministic.
- **Fix:** Isolated the import suite to a separate test project id and removed brittle empty-state assumptions from the inline validation test.
- **Files modified:** `src/pages/__tests__/pupil-import-validation.test.tsx`
- **Verification:** `npm run test -- src/pages/__tests__/pupil-import-validation.test.tsx src/pages/__tests__/pupil-autosave.test.tsx`
- **Committed in:** `1a90e99`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix stayed inside the planned test surface and was required to make the verification pass reliably.

## Issues Encountered
- Fake-timer coverage initially stalled the autosave suite during page hydration. The tests were adjusted to switch into fake timers only after initial data load, keeping the intended debounce assertions intact.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Pupil entry now has a stable save-state contract and optimizer gate for the next workflow phase.
- Future work can build on `src/lib/pupilWorkflow.ts` for any additional roster validation or recovery behavior.

## Self-Check: PASSED
- Verified `.planning/phases/02-reliable-project-workflow/02-02-SUMMARY.md` exists.
- Verified task commits `4f76b50`, `105009a`, `78148a0`, and `1a90e99` exist in git history.
