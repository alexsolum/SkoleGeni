---
phase: 09-frontend-wiring
plan: 01
subsystem: auth
tags: [vitest, react, supabase, auth, optimizer, env-var]

# Dependency graph
requires:
  - phase: 07-code-hardening
    provides: OptimizerRequestError class with status property in src/lib/api.ts
provides:
  - Unit tests proving VITE_OPTIMIZER_URL env var controls the optimizer base URL
  - 401 catch branch in PupilData.runOptimizer calling signOut() and navigate("/")
  - .env.example updated with Cloud Run production URL
affects: [10-deploy, 09-02]

# Tech tracking
tech-stack:
  added: []
  patterns: [vi.stubEnv for import.meta.env testing, waitFor with extended timeout for async flows with delays]

key-files:
  created:
    - src/lib/__tests__/api-url.test.ts
    - src/pages/__tests__/optimizer-401.test.tsx
  modified:
    - src/pages/PupilData.tsx
    - .env.example

key-decisions:
  - "Test the 3-second runOptimizer delay by extending waitFor timeout to 8s rather than using fake timers — avoids autosave debounce interference"
  - "401 branch placed as first condition in catch block to prevent fall-through to 400 diagnostic path"

patterns-established:
  - "Indirect testing of private functions via observable side effects (fetch URL) using vi.stubEnv + fetch spy"
  - "Supabase auth mock pattern: include signOut, getSession, onAuthStateChange in auth block alongside from"

requirements-completed: [WIRE-01, WIRE-02]

# Metrics
duration: 20min
completed: 2026-03-22
---

# Phase 09 Plan 01: Frontend Wiring - Auth Error Handling Summary

**401 handler in PupilData.runOptimizer calls supabase.auth.signOut() and navigates to "/" on expired token; VITE_OPTIMIZER_URL env var wiring validated with 4 unit tests; .env.example updated to Cloud Run URL**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-22T14:35:00Z
- **Completed:** 2026-03-22T14:55:00Z
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files modified:** 4

## Accomplishments
- Created `src/lib/__tests__/api-url.test.ts` with 3 tests proving VITE_OPTIMIZER_URL controls the fetch URL (including fallback and trailing-slash stripping)
- Created `src/pages/__tests__/optimizer-401.test.tsx` validating the full 401 flow: signOut() called, correct error toast shown
- Added 401 catch branch to `PupilData.tsx` `runOptimizer()` — first condition, before 400 diagnostic path
- Updated `.env.example` VITE_OPTIMIZER_URL to the Cloud Run production URL

## Task Commits

Each task was committed atomically:

1. **Task 1: Create unit tests (RED)** - `d8b2086` (test)
2. **Task 2: Add 401 handler + env example (GREEN)** - `a4e259b` (feat)

**Plan metadata:** (docs commit — see below)

_Note: TDD tasks have two commits: RED (failing tests) then GREEN (implementation + passing tests)_

## Files Created/Modified
- `src/lib/__tests__/api-url.test.ts` - 3 unit tests for VITE_OPTIMIZER_URL env var wiring via optimizeProject/fetch spy
- `src/pages/__tests__/optimizer-401.test.tsx` - 1 integration test: 401 from optimizer triggers signOut + toast
- `src/pages/PupilData.tsx` - Added 401 catch branch (lines 471-474) in runOptimizer() catch block
- `.env.example` - VITE_OPTIMIZER_URL changed from /api/optimizer to Cloud Run URL

## Decisions Made
- Tested `getOptimizerBaseUrl()` indirectly through `optimizeProject` + fetch spy (function is private, testing observable behavior is cleaner than exporting it)
- Extended `waitFor` timeout to 8 seconds instead of using fake timers: `runOptimizer` has a 3-second artificial delay; fake timers interfere with the autosave debounce timer pattern used elsewhere in the component test suite
- 401 branch is the first condition in the catch block to ensure expired tokens are caught before the generic fallback

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test timer handling for 3-second runOptimizer delay**
- **Found during:** Task 1/2 (optimizer-401 test initially failed even after GREEN implementation)
- **Issue:** `runOptimizer()` has `await new Promise((resolve) => setTimeout(resolve, 3000))` before calling `optimizeProject`. The test's default `waitFor` timeout (1s) expired before the mock rejection was processed.
- **Fix:** Extended `waitFor` timeout to 8000ms in the 401 test. Fake-timer approach was tried first but caused a 5s test timeout due to autosave timer interaction.
- **Files modified:** src/pages/__tests__/optimizer-401.test.tsx
- **Verification:** Test passes in ~3.3s, signOutMock called, toast message verified
- **Committed in:** a4e259b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in test timer handling)
**Impact on plan:** Required to make the GREEN phase actually pass. No scope creep.

## Issues Encountered
- Vitest `vi.stubEnv` with `undefined` value required casting (`undefined as unknown as string`) to satisfy TypeScript — no runtime impact
- Pre-existing Playwright e2e test failures (4 files) exist due to `@playwright/test` version conflict in the repo — confirmed pre-existing and out of scope

## Next Phase Readiness
- WIRE-01 and WIRE-02 are verified with passing tests
- Plan 02 can proceed: Vercel dashboard configuration (VITE_OPTIMIZER_URL env var), CORS origin update on Cloud Run, and production smoke test
- The 401 handler is live in production code; expired tokens will now trigger re-authentication instead of a confusing generic error

---
*Phase: 09-frontend-wiring*
*Completed: 2026-03-22*
