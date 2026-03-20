---
phase: 02-reliable-project-workflow
plan: "01"
subsystem: testing
tags: [react, vitest, playwright, supabase, workflow, configuration]
requires:
  - phase: 01-secure-data-foundation
    provides: Hardened project persistence and authenticated data access for project workflow screens
provides:
  - Phase 2 Vitest and Playwright harness scripts and config
  - Shared configuration workflow helpers and workflow status banner
  - Authoritative configuration restore, validation gating, retry, and save coverage
affects: [phase-02, configuration, pupil-data, workflow-reliability]
tech-stack:
  added: [vitest, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, jsdom, @playwright/test, lodash.debounce]
  patterns: [cache-first configuration restore with authoritative DB overwrite, shared workflow status contract, TDD-backed page workflow changes]
key-files:
  created: [vitest.config.ts, playwright.config.ts, src/test/setup.ts, src/lib/projectWorkflow.ts, src/components/project/WorkflowStatusHeader.tsx, src/pages/__tests__/configuration-load.test.tsx, src/pages/__tests__/configuration-save.test.tsx]
  modified: [package.json, package-lock.json, src/pages/Configuration.tsx, tsconfig.json]
key-decisions:
  - "Use a shared project workflow helper and status banner so Configuration and later Phase 2 pages reuse the same save-state contract."
  - "Hydrate configuration from session cache immediately, but let persisted database constraints win whenever a saved row exists."
  - "Keep failed configuration loads blocking with explicit retry instead of silently falling back to stale defaults."
patterns-established:
  - "Workflow status banner: loading, saving, saved, error, and blocked states render through one reusable component."
  - "Configuration persistence: cache every form change, validate before save, and navigate only after a successful persisted save."
requirements-completed: [FLOW-01, FLOW-02]
duration: 10 min
completed: 2026-03-20
---

# Phase 2 Plan 01: Reliable Project Workflow Summary

**Configuration restore/save now runs on a shared workflow contract with cache-first hydration, authoritative Supabase reloads, and targeted Vitest coverage**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-20T06:09:00Z
- **Completed:** 2026-03-20T06:18:41Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Added the Phase 2 verification harness with exact `test`, `test:e2e`, and `test:phase2` scripts plus Vitest/Playwright config.
- Created shared configuration workflow primitives in `src/lib/projectWorkflow.ts` and a reusable `WorkflowStatusHeader` contract for page save states.
- Refactored `Configuration.tsx` to restore saved setup reliably, block invalid or failed flows, cache edits, and navigate only after successful persistence.
- Added configuration load/save integration tests covering DB restore, blocking retry, validation gating, and success navigation.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the Phase 2 test harness and shared workflow status contract** - `f1733d9` (feat)
2. **Task 2: Make configuration restore, validation gating, and save behavior authoritative** - `beb1987` (test), `f50e097` (feat)

**Additional fix:** `ecf2144` (fix) - resolved build-blocking TypeScript issues introduced by the new test harness

## Files Created/Modified
- `package.json` - Adds Phase 2 test scripts and new runtime/dev dependencies.
- `package-lock.json` - Locks the added harness dependencies.
- `vitest.config.ts` - Enables jsdom, globals, and shared test setup.
- `playwright.config.ts` - Configures deterministic Chromium E2E startup against the local dev server.
- `src/test/setup.ts` - Registers jest-dom matchers and RTL cleanup.
- `src/lib/projectWorkflow.ts` - Centralizes default constraints, cache helpers, Supabase load/save, and validation rules.
- `src/components/project/WorkflowStatusHeader.tsx` - Renders the shared workflow status labels.
- `src/pages/Configuration.tsx` - Implements cache-first restore, authoritative loading, blocking retry, validation gating, and save navigation.
- `src/pages/__tests__/configuration-load.test.tsx` - Covers restore-from-DB and blocking load failure behavior.
- `src/pages/__tests__/configuration-save.test.tsx` - Covers validation-blocked save and successful save/navigation behavior.
- `tsconfig.json` - Adds Vitest global types so the new test files compile during normal builds.

## Decisions Made

- Used session storage as an immediate draft source for reopened configuration work, but only let it stay authoritative when Supabase has no saved constraint row yet.
- Treated load failures as blocking UI states with a retry-only recovery path to avoid accidental progression on stale defaults.
- Exposed exact workflow messages through a shared component so later Phase 2 work can reuse the same trust signals in Pupil Data.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added test-runner typings required for production builds**
- **Found during:** Final verification after Task 2
- **Issue:** `npm run build` failed because the new Vitest test files used global `vi`, `it`, and `expect` symbols that TypeScript did not know during the regular app build.
- **Fix:** Added `vitest/globals` and `@testing-library/jest-dom` to `tsconfig.json`, and tightened `Configuration.tsx` project ID narrowing so the build stayed type-safe.
- **Files modified:** `tsconfig.json`, `src/pages/Configuration.tsx`
- **Verification:** `npm run test -- src/pages/__tests__/configuration-load.test.tsx src/pages/__tests__/configuration-save.test.tsx` and `npm run build`
- **Committed in:** `ecf2144`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix was required to make the new harness usable in normal builds. No scope creep.

## Issues Encountered

- Vitest mock factories needed `vi.hoisted(...)` to avoid hoist-time reference errors in the RED tests.
- The configuration restore flow initially overwrote cached drafts with defaults when no DB row existed; the implementation was corrected so drafts remain authoritative until a saved row exists.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 2 now has the harness and configuration workflow contract required by `02-02` and `02-03`.
- Pupil data import/autosave work can reuse `WorkflowStatusHeader` and the shared persistence pattern introduced here.

## Self-Check: PASSED

- Found `.planning/phases/02-reliable-project-workflow/02-01-SUMMARY.md`
- Found commits `f1733d9`, `beb1987`, `f50e097`, and `ecf2144`

---
*Phase: 02-reliable-project-workflow*
*Completed: 2026-03-20*
