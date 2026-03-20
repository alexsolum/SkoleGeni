---
phase: 04-durable-class-editing
plan: 02
subsystem: ui
tags: [react, zustand, zundo, supabase, vitest, playwright]
requires:
  - phase: 04-durable-class-editing
    provides: durable roster assignments, persisted editor drafts, and optimizer-baseline hydration
provides:
  - undo and redo controls for manual roster edits
  - debounced Supabase autosave for roster assignments and score snapshots
  - draft invalidation when pupil data changes after manual editing
affects: [04-03, class-editor, persistence, testing]
tech-stack:
  added: []
  patterns: [reactive zundo temporal subscriptions, debounced Supabase upserts, pupil-change draft invalidation]
key-files:
  created: [src/pages/__tests__/class-editor-undo.test.tsx, src/pages/__tests__/class-editor-autosave.test.tsx, src/pages/__tests__/class-editor-integrity.test.tsx]
  modified: [src/lib/editorStore.ts, src/pages/ClassEditor.tsx]
key-decisions:
  - "Subscribed the header to the zundo temporal store so undo/redo button state reflects actual history depth instead of local guesses."
  - "Tracked the last persisted assignment snapshot in ClassEditor to avoid autosaving immediately after hydration or reset."
  - "Used the latest pupils.created_at value as the pupil-change marker because the current schema does not expose pupils.updated_at."
patterns-established:
  - "Guard debounced autosave with a persisted snapshot key so hydrated state is treated as already synced."
  - "Invalidate both saved rows and session drafts when upstream pupil data changes, then fall back to the latest optimizer result."
requirements-completed: [EDIT-01, EDIT-03]
duration: 10min
completed: 2026-03-20
---

# Phase 4 Plan 2: Durable Class Editing Summary

**Class editor moves now support undo and redo, sync to Supabase after a debounce, and automatically discard stale drafts when pupil data changes underneath them**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-20T20:14:36+01:00
- **Completed:** 2026-03-20T20:24:36+01:00
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Added visible Undo and Redo controls with Cmd/Ctrl keyboard shortcuts backed by the existing temporal editor store.
- Wired debounced background saves to `roster_assignments` and exposed save-state feedback that only flips to saved after the upsert completes.
- Invalidated stale manual edits when pupil data changed, clearing old durable/session state and restoring the latest optimizer baseline.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Undo/Redo UI and Keyboard Support** - `69bf623` (feat)
2. **Task 2: Implement Debounced Database Autosave** - `6194b72` (feat)
3. **Task 3: Implement Draft Integrity and Clear on Pupil Change** - `0cccbd1` (feat)

## Files Created/Modified

- `src/lib/editorStore.ts` - Exposes a typed reactive hook for the zundo temporal store so UI controls can subscribe to undo and redo state.
- `src/pages/ClassEditor.tsx` - Adds undo and redo controls, debounced autosave, save-state UI, and stale-draft invalidation against pupil changes.
- `src/pages/__tests__/class-editor-undo.test.tsx` - Verifies button states plus click and keyboard undo/redo behavior.
- `src/pages/__tests__/class-editor-autosave.test.tsx` - Verifies the 2 second autosave debounce and saved-state transition after the Supabase upsert.
- `src/pages/__tests__/class-editor-integrity.test.tsx` - Verifies stale manual edits are cleared and the optimizer baseline is restored when pupil data is newer.

## Decisions Made

- Kept autosave logic in `ClassEditor` instead of a separate hook because it depends directly on page-local hydration, score recomputation, and reset behavior.
- Used a persisted assignment snapshot ref rather than `lastSaved` timestamps alone so local undo and redo state can return to a previously saved layout without redundant writes.
- Treated the latest pupil row `created_at` as the available integrity signal for pupil edits because the current schema rewrites pupil rows without an `updated_at` column.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Correctness] Switched the integrity comparison to `pupils.created_at`**
- **Found during:** Task 3 (Implement Draft Integrity and "Clear on Pupil Change")
- **Issue:** The plan expected `pupils.updated_at`, but the current schema only stores `created_at` on pupil rows.
- **Fix:** Compared the latest pupil `created_at` against saved/draft timestamps and documented that as the available pupil-change marker.
- **Files modified:** `src/pages/ClassEditor.tsx`
- **Verification:** `npx vitest run src/pages/__tests__/class-editor-integrity.test.tsx`
- **Committed in:** `0cccbd1`

**2. [Rule 3 - Blocking] Updated existing editor test doubles for the new pupil timestamp query**
- **Found during:** Task 3 (Implement Draft Integrity and "Clear on Pupil Change")
- **Issue:** The earlier undo/autosave tests only mocked the full pupil fetch, so the added `created_at` lookup caused unhandled test failures.
- **Fix:** Extended the existing Supabase mocks to support both the roster fetch and the latest-pupil timestamp query.
- **Files modified:** `src/pages/__tests__/class-editor-undo.test.tsx`, `src/pages/__tests__/class-editor-autosave.test.tsx`
- **Verification:** `npx vitest run src/pages/__tests__/class-editor-undo.test.tsx src/pages/__tests__/class-editor-autosave.test.tsx src/pages/__tests__/class-editor-integrity.test.tsx`
- **Committed in:** `0cccbd1`

---

**Total deviations:** 2 auto-fixed (1 correctness, 1 blocking)
**Impact on plan:** Both fixes were necessary to keep the integrity feature aligned with the actual schema and to keep the planned verification path executable. No scope creep.

## Issues Encountered

- The plan references `tests/e2e/durable-editing.spec.ts`, but that Playwright spec is not present in the repository yet. Unit coverage and build verification passed, but that browser-level verification remains unavailable in this plan run.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The editor now exposes durable save state, undo/redo affordances, and integrity invalidation that Phase 4.3 can build on for red-card validation and issue surfacing.
- The Playwright durable-editing spec referenced by the plan still needs to be added before the full browser verification loop for Phase 4 is complete.

## Self-Check: PASSED

- Verified `.planning/phases/04-durable-class-editing/04-02-SUMMARY.md` exists.
- Verified task commits `69bf623`, `6194b72`, and `0cccbd1` exist in git history.
- Verified `.planning/REQUIREMENTS.md` exists for requirement status updates.

---
*Phase: 04-durable-class-editing*
*Completed: 2026-03-20*
