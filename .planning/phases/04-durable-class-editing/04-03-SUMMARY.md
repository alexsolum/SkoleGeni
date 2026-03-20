---
phase: 04-durable-class-editing
plan: 03
subsystem: ui
tags: [react, vitest, python, fastapi, manual-editing, verification]
requires:
  - phase: 04-durable-class-editing
    provides: durable editor hydration, undo/redo controls, and debounced autosave
provides:
  - Python-aligned roster validation for manual assignments
  - red-card card states and centralized manual-issues sidebar
  - debounced official score verification for manual edits
affects: [05-01, class-editor, optimizer, testing]
tech-stack:
  added: []
  patterns: [shared manual-validation engine, allow-invalid-then-explain editing, debounced authoritative verification]
key-files:
  created: [src/lib/rosterValidation.ts, src/lib/rosterValidation.test.ts, src/components/PupilCard.test.tsx, src/pages/__tests__/class-editor-sidebar.test.tsx]
  modified: [src/pages/ClassEditor.tsx, src/lib/api.ts, api/optimizer.py]
key-decisions:
  - "Used one shared TypeScript validation engine that mirrors the Python score math so card state, sidebar issues, and score warnings derive from the same source."
  - "Manual drag-and-drop now permits invalid states and explains them immediately instead of hard-blocking edits."
  - "Added an authenticated `/project/score` optimizer endpoint so the editor can verify arbitrary manual assignments against Python without rerunning optimization."
patterns-established:
  - "Manual-edit feedback should tolerate broken intermediate states and mark them with structured validation output instead of rejecting the move."
  - "Authoritative backend verification should run silently on a debounce and only surface UI when drift or failure matters."
requirements-completed: [EDIT-02]
duration: 15min
completed: 2026-03-20
---

# Phase 4 Plan 3: Durable Class Editing Summary

**Manual class edits now show Python-aligned violation feedback, a persistent issues sidebar, and debounced official score verification against the optimizer backend**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-20T20:27:00+01:00
- **Completed:** 2026-03-20T20:42:05+01:00
- **Tasks:** 4
- **Files modified:** 7

## Accomplishments
- Added a shared roster validation engine that flags hard class-size and negative-chemistry issues while matching the Python score math for manual assignments.
- Updated the class editor to show red-card states, score-drop warnings, and a sidebar listing every active conflict with hover-to-highlight feedback.
- Added silent Python verification through a dedicated authenticated score endpoint and surfaced verification drift or failure in the score panel.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the JS Roster Validation Engine** - `64ccca7` (test), `d9c474e` (feat)
2. **Task 2: Implement "Red Card" State and Tooltips** - `e962063` (feat)
3. **Task 3: Create Manual Issues Sidebar** - `7e76e90` (feat)
4. **Task 4: Implement Silent Python Verification** - `bd75e96` (feat)

## Files Created/Modified

- `src/lib/rosterValidation.ts` - Mirrors the Python scoring model and emits structured hard violations for manual assignments.
- `src/lib/rosterValidation.test.ts` - Covers hard-rule detection and score parity expectations for the validator.
- `src/pages/ClassEditor.tsx` - Uses shared validation for red cards, score-drop badges, issues sidebar, highlight behavior, and Python verification status.
- `src/components/PupilCard.test.tsx` - Verifies card-level red-card feedback and score-drop warnings through the editor.
- `src/pages/__tests__/class-editor-sidebar.test.tsx` - Verifies the sidebar conflict list and hover-based pupil highlighting.
- `src/lib/api.ts` - Adds the authenticated client call for Python score verification of manual assignments.
- `api/optimizer.py` - Adds a backend endpoint that scores a provided assignment against saved project data without rerunning optimization.

## Decisions Made

- Kept manual validation centralized in `src/lib/rosterValidation.ts` so the editor UI does not drift from the parity-tested scoring model.
- Treated invalid manual states as editable intermediate states because the product goal is guided refinement, not hard-blocked drag-and-drop.
- Used a narrow scoring endpoint instead of rerunning the optimizer so verification checks the user’s actual manual assignment.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added a backend score endpoint for manual assignment verification**
- **Found during:** Task 4 (Implement Silent Python Verification)
- **Issue:** The existing optimizer API could optimize a project, but it could not score an arbitrary manual assignment for authoritative verification.
- **Fix:** Added `POST /project/score` in `api/optimizer.py` and a matching `scoreProjectAssignment` client helper in `src/lib/api.ts`.
- **Files modified:** `api/optimizer.py`, `src/lib/api.ts`, `src/pages/ClassEditor.tsx`
- **Verification:** `python -m py_compile api/optimizer.py`, `npm run build`, `rg "Python verification" src/pages/ClassEditor.tsx`
- **Committed in:** `bd75e96`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The added endpoint was required to implement the plan’s official Python verification without changing the user workflow. No scope creep beyond that enabling path.

## Issues Encountered

- One initial parity expectation in the new validator test used the wrong weighted overall score; it was corrected to the Python-derived `0.40` result before the TDD implementation was finalized.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 4 now has durable edits, undo/redo, issue surfacing, and authoritative score verification in place for broader release-hardening work.
- The referenced Playwright check `tests/e2e/durable-editing.spec.ts` is still absent from the repository, so browser-level coverage for this phase remains a follow-up item outside this plan.

## Self-Check: PASSED

- Verified `.planning/phases/04-durable-class-editing/04-03-SUMMARY.md` exists.
- Verified task commits `64ccca7`, `d9c474e`, `e962063`, `7e76e90`, and `bd75e96` exist in git history.
- Verified `.planning/REQUIREMENTS.md` exists for requirement status updates.

---
*Phase: 04-durable-class-editing*
*Completed: 2026-03-20*
