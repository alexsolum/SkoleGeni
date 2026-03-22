# Phase 2: Reliable Project Workflow - Context

**Gathered:** 2026-03-19
**Status:** Ready for research/planning

<domain>
## Phase Boundary

This phase focuses on making the project setup and data entry flow resilient, validated, and trustworthy. It covers the transition from initial project creation through configuration and pupil data entry, ending at the point where a user is ready to run the optimizer. It ensures data is persisted safely (autosave) and validated clearly (inline and global feedback).

</domain>

<decisions>
## Implementation Decisions

### Configuration State Restoration
- **DB Overrides**: When loading the configuration page for an existing project, database values must always override local defaults.
- **No Skip**: The "Skip (MVP)" button is removed. Users must explicitly save or have a valid configuration to proceed.
- **Session Cache**: Use local state priority when navigating between screens in a single session to avoid redundant DB re-fetches.
- **Failure Gating**: If a configuration load fails, block the UI and provide a retry button; do not allow the user to proceed with stale or default data.

### CSV Resilience & Error Recovery
- **Partial Import**: Allow partial imports where valid rows are added to the grid, while invalid rows are listed in a "Failed Imports" summary.
- **Column Mapping**: If CSV headers do not match expected internal keys, present a mapping modal for the user to resolve the ambiguity.
- **Forced Normalization**: Normalize gender strings (e.g., "M", "boy", "man" -> "Male") during the import process itself.
- **Duplicate Detection**: Flag duplicate rows (identical student data) as errors that require manual resolution in the grid.

### State Persistence Model
- **Autosave**: Implement a debounced autosave pattern (2-3 seconds) for all pupil and chemistry data.
- **Silent Exit**: Since data is autosaved, allow navigation without an explicit "unsaved changes" dialog unless an autosave is actively failing.
- **Status Header**: Provide clear feedback in the header (e.g., "Saving...", "All changes saved") to build user trust in the persistence.
- **Save Integrity**: The "Run Optimizer" button must be disabled if a background save has failed or is still in progress.

### Validation UX
- **Inline Highlighting**: Cells in the pupil data grid must show error states (e.g., red borders) as soon as they lose focus if the value is invalid.
- **Issues Panel**: Add a persistent panel or sidebar that lists all current blocking errors and non-blocking warnings for the project.
- **Warning Levels**: Distinguish between "Errors" (blocks optimization) and "Warnings" (non-blocking quality signals, like skewed gender ratios).
- **Immediate Feedback**: Error highlights must disappear immediately as soon as a user provides a valid value, without waiting for the next save cycle.

</decisions>

<canonical_refs>
## Canonical References

### Product and roadmap
- `.planning/PROJECT.md` — Product baseline and project-level non-negotiables
- `.planning/REQUIREMENTS.md` — Phase-linked requirements: `FLOW-01` to `FLOW-04`
- `.planning/ROADMAP.md` — Phase 2 boundary and success criteria
- `.planning/STATE.md` — Current project status

### Existing implementation
- `src/pages/Configuration.tsx` — Current configuration form and navigation logic
- `src/pages/PupilData.tsx` — Current pupil table, CSV parsing, and save-all behavior
- `src/lib/api.ts` — Type definitions for constraints, pupils, and chemistry
- `src/lib/supabase.ts` — Supabase client instance

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/pages/PupilData.tsx`'s `ensureRowDefaults` and `onCSVFile` functions: foundations for the new resilient import logic.
- `src/pages/Configuration.tsx`'s `validation` useMemo: basis for the expanded configuration validation rules.

### Established Patterns
- `useParams()` from `react-router-dom` is used for `projectId` across all relevant pages.
- `react-hot-toast` is the current standard for transient feedback, to be supplemented by the Issues Panel.

### Integration Points
- The `saveToSupabase` function in `PupilData.tsx` is the primary target for conversion to an autosave-ready, non-destructive write path.
- The `Configuration.tsx` component needs a `useEffect` hook to fetch and populate existing project settings.
- The `PupilData.tsx` table needs to be extended with inline validation state and a connection to the new global Issues Panel.

</code_context>

<specifics>
## Specific Ideas
- Use a "Validation Store" or context to share errors between the grid and the Issues Panel.
- Leverage `papaparse`'s step-by-step or header-detection features for the new mapping modal.
- Implement a "Saving Status" component that can be reused across both Configuration and Pupil Data pages.

</specifics>

<deferred>
## Deferred Ideas
- Multi-user real-time collaboration (handled by future phases).
- Advanced CSV "healing" (automatic suggestions for typo corrections).
- Complex cross-row constraint validation (e.g., "Total count must be X").

</deferred>

---

*Phase: 02-reliable-project-workflow*
*Context gathered: 2026-03-19*
