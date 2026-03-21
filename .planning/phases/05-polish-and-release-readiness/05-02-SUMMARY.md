---
phase: 05-polish-and-release-readiness
plan: 02
subsystem: ui
tags: [react, tailwind, routing, dashboard, design-system]
requires:
  - phase: 05-01
    provides: design tokens, typography alignment, current frontend toolchain
provides:
  - persistent sidebar shell for project-scoped routes
  - results class breakdown table with health bars and editor navigation
  - pupil chemistry summary stat cards
affects: [05-03, ux, release-readiness]
tech-stack:
  added: []
  patterns: [route-scoped layout wrapper, read-only summary panels, ownership-safe UI hardening]
key-files:
  created:
    - src/components/layout/AppShell.tsx
    - src/components/results/ClassBreakdownTable.tsx
    - src/components/pupil/ChemistryStatCards.tsx
  modified:
    - src/App.tsx
    - src/pages/Results.tsx
    - src/pages/PupilData.tsx
key-decisions:
  - "Kept Welcome outside AppShell and wrapped only project-scoped routes with a shared sidebar layout."
  - "Handled missing debug.class_scores typing locally in Results.tsx to keep this wave inside owned files."
  - "Used a sticky full-height sidebar shell instead of forcing nested page scrolling because Configuration and ClassEditor were outside this wave's ownership."
patterns-established:
  - "Route-scoped shell: shared product navigation belongs in a layout route rather than repeated page chrome."
  - "Summary surfaces: derived metrics stay in dedicated presentational components fed by existing page state."
requirements-completed: [UX-01]
duration: 11min
completed: 2026-03-21
---

# Phase 5 Plan 2: UI Polish Summary

**Persistent SkoleGeni sidebar navigation with results health-table diagnostics and chemistry summary cards across the desktop workflow**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-21T08:25:00+01:00
- **Completed:** 2026-03-21T08:35:54.8929884+01:00
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added a reusable `AppShell` sidebar with SkoleGeni branding and project-aware navigation for Configuration, Pupil Data, Results, and Class Editor.
- Added a `ClassBreakdownTable` to Results showing per-class capacity, worst-class highlighting, health bars, and links into the editor.
- Added `ChemistryStatCards` to Pupil Data and removed owned page `min-h-screen` wrappers so the new shell layout behaves correctly on those screens.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AppShell sidebar layout and wrap project-scoped routes** - `defebb5` (feat)
2. **Task 2: Add ClassBreakdownTable to Results and ChemistryStatCards to Pupil Data** - `bbdf0e4` (feat)

## Files Created/Modified
- `src/components/layout/AppShell.tsx` - Sidebar shell with branded nav links and an `Outlet` for project routes.
- `src/App.tsx` - Route tree updated so only project-scoped screens render inside `AppShell`.
- `src/components/results/ClassBreakdownTable.tsx` - Results diagnostics table with score thresholds and worst-class badge.
- `src/pages/Results.tsx` - Integrates the breakdown table and locally adapts optional debug score data.
- `src/components/pupil/ChemistryStatCards.tsx` - Derived chemistry stat cards for linked pupils and pair counts.
- `src/pages/PupilData.tsx` - Renders chemistry summary cards and removes the owned full-screen wrapper.

## Decisions Made

- Kept the Welcome route outside the shared shell so onboarding remains a standalone surface.
- Adapted `debug.class_scores` via a local type extension in `Results.tsx` instead of broadening shared API types in an unowned file.
- Avoided changing unowned `Configuration` and `ClassEditor` wrappers; instead the shell uses a sticky sidebar pattern that tolerates those pages' existing height behavior.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Resolved missing `class_scores` typing without expanding wave ownership**
- **Found during:** Task 2 (Add ClassBreakdownTable to Results and ChemistryStatCards to Pupil Data)
- **Issue:** `OptimizeResponse.debug` did not declare `class_scores`, which blocked passing score data into the new Results table.
- **Fix:** Added a local type extension in `src/pages/Results.tsx` and consumed the optional score map there.
- **Files modified:** `src/pages/Results.tsx`
- **Verification:** `npm run build`
- **Committed in:** `bbdf0e4`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix was required for the planned Results UI and stayed within the owned files for this execution wave.

## Issues Encountered

- `Configuration.tsx` and `ClassEditor.tsx` still use `min-h-screen`, but they were outside this wave's ownership. The new shell avoids forcing nested scrolling so the planned UI can ship without cross-wave edits.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase `05-03` can add automated coverage against the new shell navigation and summary surfaces.
- Residual layout cleanup in unowned pages can be handled in a future wave if stricter single-scroll behavior is required everywhere.

## Self-Check: PASSED

- Found `.planning/phases/05-polish-and-release-readiness/05-02-SUMMARY.md`
- Verified task commits `defebb5` and `bbdf0e4` exist in git history

---
*Phase: 05-polish-and-release-readiness*
*Completed: 2026-03-21*
