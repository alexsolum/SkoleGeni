---
status: diagnosed
phase: 02-reliable-project-workflow
source:
  - 02-01-SUMMARY.md
  - 02-02-SUMMARY.md
started: 2026-03-20T15:35:00+01:00
updated: 2026-03-20T15:47:00+01:00
---

## Current Test

[testing complete]

## Tests

### 1. Create and enter a roster project
expected: From the welcome screen, clicking "Create New Roster" should create a project and navigate to the Configuration screen without showing an error toast.
result: pass

### 2. Configuration restore and blocking retry
expected: Opening an existing project should show saved configuration values instead of defaults, and a forced load failure should show "Retry loading saved setup" rather than silently continuing.
result: pass

### 3. CSV import and failed import feedback
expected: Importing a valid pupil CSV should append rows to the grid, and malformed rows should appear in "Failed Imports" instead of silently disappearing.
result: pass

### 4. Chemistry picker opens and applies a link
expected: Clicking "+" or "-" on a pupil row should open the chemistry picker modal, allow selecting another pupil, and update the row count from +0/-0 to reflect the new link.
result: issue
reported: "Nothing happens when i press the +/- and see also that the UI is very basic"
severity: major

### 5. Save-state trust signals and blocked draft recovery
expected: Invalid edits should show "Unsaved validation errors" and survive reload as a draft, successful edits should transition through "Saving..." to "All changes saved", and a forced save failure should show "Save failed" with "Retry save" while Run Optimizer stays disabled.
result: pass

## Summary

total: 5
passed: 4
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Clicking \"+\" or \"-\" on a pupil row should open the chemistry picker modal, allow selecting another pupil, and update the row count from +0/-0 to reflect the new link."
  status: failed
  reason: "User reported: Nothing happens when i press the +/- and see also that the UI is very basic"
  severity: major
  test: 4
  root_cause: "Investigation inconclusive in the current checkout. The current runtime repro opens the chemistry picker and updates the count correctly, so the reported failure likely came from a different build/environment or from poor modal discoverability in the minimally styled UI."
  artifacts:
    - path: "src/pages/PupilData.tsx"
      issue: "Button handlers and modal state wiring appear correct in the current checkout."
    - path: "src/index.css"
      issue: "Styling pipeline was previously broken during UAT, which may have made the modal interaction hard to perceive."
    - path: ".planning/debug/chemistry-picker-uat-gap.md"
      issue: "Debug session found no reproducible code-level failure in the current workspace."
  missing:
    - "Re-run the chemistry-picker UAT against the exact current build after hard refresh and CSS fix."
    - "Capture a fresh screenshot or video if the chemistry modal still appears non-responsive."
    - "Add dedicated automated coverage for opening the chemistry modal and incrementing the row count."
  debug_session: .planning/debug/chemistry-picker-uat-gap.md
