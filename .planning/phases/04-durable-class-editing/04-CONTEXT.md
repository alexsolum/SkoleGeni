# Phase 4: Durable Class Editing - Context

**Gathered:** 2026-03-20
**Status:** Ready for research/planning

<domain>
## Phase Boundary

This phase turns manual class editing into a persistent, dependable feature. It covers the transition from ephemeral drag-and-drop moves to a durable, validated, and autosaved state. It includes score parity between JS and Python, exhaustive manual validation, and a robust "conflict" UX.

</domain>

<decisions>
## Implementation Decisions

### Persistence & Continuity
- **Autosave Every Move**: All manual moves are autosaved to the database using a debounced pattern (2-3 seconds).
- **Session Drafts**: Use session storage or local storage to keep unsaved "draft" moves, ensuring no loss on refresh.
- **Manual Priority**: The app will restore the latest manual edits by default when returning to a project.
- **Reset to Optimizer**: Provide a "Reset to Optimizer Result" button to discard manual edits and go back to the original solver output.
- **Clear on Pupil Change**: If the underlying pupil data is changed in Pupil Mode, all manual edits for that project are cleared.

### Validation & Enforcement
- **Warn Only (Safe)**: The editor will not hard-block any move. Users can make "broken" drops, but these will be visually marked as violations.
- **Red Card State**: Pupil cards in a class that violates a "Hard" rule (negative chemistry, size limits) will glow red or have a red border.
- **Warn on Score Drop**: If a move significantly drops a "Soft" rule score (e.g. gender balance), show a "Warning" state next to the score or on the card.
- **Exhaustive Validation**: Re-validate all rules (hard and soft) on every drop to provide immediate, detailed feedback.

### Scoring Authority
- **JS Feedback, JS Commit**: Use JS for instant feedback during the edit. The JS-calculated score is the one "Committed" to the database to ensure the user's view and the stored state are in parity.
- **Python Verification**: Call the Python backend silently after moves for "official" score verification, but don't let it block the UI.
- **Same Detailed Meters**: The Class Editor will show the same detailed scoring dashboard (gender mix, origin balance, etc.) as the Results page.

### Conflict UX
- **Manual Issues Sidebar**: Add a persistent sidebar that lists all current manual violations in the roster.
- **Hover for Reason**: Hovering over a red pupil card or an issue in the sidebar will explain the specific rule violation.
- **Undo/Redo Support**: Implement Undo/Redo specifically for manual drag-and-drop moves to build trust in the editing process.

</decisions>

<canonical_refs>
## Canonical References

### Product and roadmap
- `.planning/PROJECT.md` — Product baseline and project-level non-negotiables
- `.planning/REQUIREMENTS.md` — Phase-linked requirements: `EDIT-01` to `EDIT-03`
- `.planning/ROADMAP.md` — Phase 4 boundary and success criteria
- `.planning/STATE.md` — Current project status

### Existing implementation
- `src/pages/ClassEditor.tsx` — Current ephemeral drag-and-drop editor
- `src/lib/api.ts` — Type definitions for scores and pupils
- `api/optimizer.py` — Scoring logic source of truth for parity

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/pages/ClassEditor.tsx`'s `computeQuickScore` function: foundation for the expanded JS-based scoring.
- `dnd-kit` usage in the current editor: established pattern for drag-and-drop moves.
- `src/lib/pupilWorkflow.ts` (Phase 2): established pattern for debounced autosaving and draft state handling.

### Established Patterns
- Manual edits currently use a simple `string[][]` (array of arrays of pupil IDs) for the assignment state.
- Score calculation uses a 0.0 to 1.0 normalization across categories.

### Integration Points
- A new `roster_assignments` table or similar persistence model will be needed to store the "Current Manual Roster."
- The `ClassEditor.tsx` needs a "Draft Store" (Zustand or similar) to handle Undo/Redo and session persistence.
- The `Issues Panel` from Phase 2/3 should be adapted for a sidebar "Manual Issues" view.

</code_context>

<specifics>
## Specific Ideas
- Use a `History` stack for Undo/Redo that tracks only the `assignment` (`string[][]`) state.
- Implement the "Red Card State" using Tailwind's `shadow-red-500` or an outline on the `PupilCard`.
- Use the `silent Python update` to warn the user if the "Official" score deviates significantly from the "Quick" score.

</specifics>

<deferred>
## Deferred Ideas
- Branching or alternate manual-edit scenarios (v2 requirement `SCEN-02`).
- AI-suggested manual move explanations.
- Real-time multi-user "Co-editing" of the class roster.

</deferred>

---

*Phase: 04-durable-class-editing*
*Context gathered: 2026-03-20*
