---
status: diagnosed
phase: 04-durable-class-editing
source:
  - 04-01-SUMMARY.md
  - 04-02-SUMMARY.md
  - 04-03-SUMMARY.md
  - 04-04-SUMMARY.md
  - 04-05-SUMMARY.md
started: 2026-03-21T07:15:06.2268792+01:00
updated: 2026-03-21T08:02:00+01:00
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running app services, then start the app from scratch. The frontend and optimizer boot without startup errors, the editor route loads, and a basic authenticated project flow returns live data instead of missing-table or missing-route failures.
result: pass

### 2. Saved Manual Move Persists Across Reload
expected: Move a pupil to another class, wait for the saved state confirmation, reload the page, and the pupil remains in the edited class instead of snapping back to the optimizer baseline.
result: pass

### 3. Reset Restores Optimizer Baseline
expected: After making manual edits, clicking Reset to Optimizer Result clears the saved manual assignment and restores the latest optimizer layout with the reset confirmation visible.
result: pass

### 4. Undo and Redo Stay Usable During Editing
expected: After one or more moves, the Undo and Redo controls and Cmd/Ctrl keyboard shortcuts step backward and forward through assignment changes without losing the active editor state.
result: issue
reported: "I have to press undo two times for the change to be undone"
severity: major

### 5. Invalid Manual Moves Stay Editable but Clearly Flagged
expected: You can place pupils into an invalid intermediate state, and the editor keeps the move while showing visible red-card conflict feedback, conflict counts, and a sidebar explanation of the violated rule.
result: pass

### 6. Score Verification States Make Sense
expected: After a manual edit, the score verification area transitions through checking and returns an authoritative backend result or a clear unavailable/warning state instead of silently failing.
result: pass

### 7. Return Later Restores Latest Accepted Assignment
expected: Leave the editor after a saved manual edit, reopen the same project later, and the latest saved assignment hydrates instead of an older draft or bare optimizer result.
result: pass

## Summary

total: 7
passed: 6
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "After one or more moves, the Undo and Redo controls and Cmd/Ctrl keyboard shortcuts step backward and forward through assignment changes without losing the active editor state."
  status: failed
  reason: "User reported: I have to press undo two times for the change to be undone"
  severity: major
  test: 4
  root_cause: "zundo records autosave metadata writes as undo history entries, so setLastSaved(updatedAt) adds a duplicate assignment snapshot after each move and the first undo lands on an identical state."
  artifacts:
    - path: "src/lib/editorStore.ts"
      issue: "Temporal history uses partialize but no unchanged-state guard, so metadata-only setter calls still create undo frames."
    - path: "src/pages/ClassEditor.tsx"
      issue: "Autosave success calls setLastSaved(updatedAt) in the temporal-tracked store after each move."
    - path: "src/pages/__tests__/class-editor-undo.test.tsx"
      issue: "Regression coverage exercises direct assignment updates but misses the autosave path that inserts the duplicate undo frame."
  missing:
    - "Prevent zundo from saving unchanged assignment snapshots when non-assignment metadata changes."
    - "Add regression coverage for undo behavior after autosave updates lastSaved."
  debug_session: ".planning/debug/phase4-undo-double-press.md"
