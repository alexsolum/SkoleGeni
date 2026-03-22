---
status: diagnosed
trigger: "Diagnose the Phase 4 UAT gap and find the root cause only."
created: 2026-03-21T00:00:00+01:00
updated: 2026-03-21T00:00:02+01:00
---

## Current Focus

hypothesis: zundo is recording autosave metadata writes as history entries even though only `assignment` should be undoable
test: compare zundo middleware behavior with `ClassEditor`'s `setLastSaved` autosave path
expecting: `setLastSaved` will add a duplicate assignment snapshot, causing the first undo to land on an identical visible state
next_action: finalize the root cause from the confirmed store-level reproduction and map it back to the production files

## Symptoms

expected: A single undo press should undo the latest assignment change.
actual: User reported: "I have to press undo two times for the change to be undone"
errors: none reported
reproduction: Test 4 in .planning/phases/04-durable-class-editing/04-UAT.md
started: Discovered during UAT on 2026-03-21

## Eliminated

## Evidence

- timestamp: 2026-03-21T00:00:00+01:00
  checked: required Phase 4 UAT, store, page, test, and summary files
  found: unit coverage only verifies direct store `setAssignment` changes and button/keyboard undo, not real drag-and-drop move behavior
  implication: the gap may live in the production event path instead of the temporal store's basic undo API

- timestamp: 2026-03-21T00:00:01+01:00
  checked: node_modules/zundo/dist/index.js and node_modules/zundo/README.md
  found: zundo v2 records history on every zustand setter call unless an `equality` or `diff` option prevents unchanged partialized snapshots from being saved
  implication: `partialize` alone does not stop non-assignment setters from creating undo entries

- timestamp: 2026-03-21T00:00:01+01:00
  checked: src/pages/ClassEditor.tsx autosave flow
  found: after a move, the debounced autosave upsert calls `setLastSaved(updatedAt)` without changing `assignment`
  implication: a successful save can create an additional history frame after each visible move

- timestamp: 2026-03-21T00:00:01+01:00
  checked: minimal zustand+zundo reproduction matching the editor store shape
  found: calling `setAssignment` once then `setLastSaved` once produces two `pastStates`, where the second snapshot is identical to the current assignment; first undo leaves assignment unchanged and second undo reverts the move
  implication: this exactly matches the UAT symptom that undo must be pressed twice after a saved edit

## Resolution

root_cause: The editor store uses zundo `partialize` to track only `assignment`, but it does not configure `equality` or `diff`. In zundo v2 that means every store setter call is still saved into history. After a manual move, `ClassEditor` autosave calls `setLastSaved(updatedAt)`, which records a second history entry with the same assignment snapshot. The first undo therefore restores an identical visible assignment, and only the second undo restores the prior class layout.
fix: Add an equality or diff guard to the temporal middleware so unchanged partialized assignment snapshots are not recorded, or isolate `lastSaved` updates from the temporal-tracked store.
verification: Confirmed by tracing the production autosave path and by a minimal zustand+zundo reproduction where `setAssignment` followed by `setLastSaved` requires two undos to revert one visible assignment change.
files_changed: []
