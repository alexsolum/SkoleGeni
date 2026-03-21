---
phase: 07-code-hardening
plan: "01"
subsystem: api

tags: [fastapi, cors, python, ortools, health-check, readiness, middleware]

requires:
  - phase: 03-trustworthy-optimization-results
    provides: optimizer solver with POST /project bearer-auth route and _optimize_request internal contract

provides:
  - CORSMiddleware on optimizer FastAPI app with allow_origin_regex=".*" for browser preflight support
  - FastAPI lifespan-based startup readiness validation logging env group status at boot
  - GET /health returning 200 JSON when ready, 503 with missing_env list when not ready
  - GET / safe informational root endpoint
  - POST / public unauthenticated optimization route removed
  - api/test_hardening.py with 4 Phase 7 contract tests
  - Realigned test_optimizer.py and test_feasibility.py using _optimize_request directly

affects: [07-02-PLAN, cloud-run-deployment, cors-policy, browser-preflight]

tech-stack:
  added: [fastapi.middleware.cors.CORSMiddleware, contextlib.asynccontextmanager lifespan]
  patterns:
    - FastAPI lifespan context manager for one-time startup validation
    - Readiness state stored in module-level _readiness dict computed once at boot
    - Env group presence checked by OR of primary and VITE_ prefixed variants

key-files:
  created:
    - api/test_hardening.py
  modified:
    - api/optimizer.py
    - api/test_optimizer.py
    - api/test_feasibility.py

key-decisions:
  - "Use allow_origin_regex='.*' rather than an allowlist — tighten in Phase 9 if needed"
  - "Startup keeps app running even with missing env so health probes can inspect state"
  - "Remove POST / outright rather than adding shared-secret protection"
  - "Tests run via Docker (python:3.12-slim) due to Windows AppLocker policy blocking numpy DLLs locally"

patterns-established:
  - "Readiness pattern: compute once in lifespan, store in module-level dict, serve from GET /health"
  - "Test pattern: use _optimize_request directly instead of HTTP client when route is removed"

requirements-completed: [HARD-01, HARD-02]

duration: 8min
completed: 2026-03-21
---

# Phase 07 Plan 01: Code Hardening — Optimizer Service Boundary

**FastAPI optimizer hardened with CORSMiddleware, lifespan readiness validation, safe root endpoints, and removal of the public unauthenticated POST / optimization route**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-21T19:46:05Z
- **Completed:** 2026-03-21T19:54:15Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Added `CORSMiddleware` with `allow_origin_regex=".*"` so browser preflight requests from any Vercel preview or production origin succeed without explicit allowlisting
- Added FastAPI lifespan that validates env groups `SUPABASE_URL` and `SUPABASE_ANON_KEY` at startup, logs a concise readiness summary when ready and a not-ready warning with missing group names when not
- Added `GET /health` returning HTTP 200 with full readiness JSON when ready, or HTTP 503 with `missing_env` list when not ready
- Added `GET /` safe informational endpoint pointing callers to `POST /project`
- Removed the public unauthenticated `POST /` optimization route entirely
- Created `api/test_hardening.py` with 4 contract tests covering CORS preflight, ready health, missing-env health, and safe root behavior
- Realigned `test_optimizer.py` and `test_feasibility.py` to use `_optimize_request` directly instead of the removed HTTP route

## Task Commits

1. **Task 1 (TDD RED): Failing hardening contract** - `7772644` (test)
2. **Task 2 (TDD GREEN): FastAPI hardening implementation** - `b13538e` (feat)
3. **Task 3: Realign regression tests** - `bfcd1bb` (feat)

## Files Created/Modified

- `api/test_hardening.py` - Phase 7 contract: CORS preflight, readiness health, missing-env health, safe root
- `api/optimizer.py` - Added CORSMiddleware, lifespan, GET /, GET /health; removed POST /
- `api/test_optimizer.py` - Rewritten to use `_optimize_request` directly
- `api/test_feasibility.py` - Rewritten to use `_optimize_request` with Pydantic models directly

## Decisions Made

- `allow_origin_regex=".*"` chosen over an explicit allowlist — permissive in Phase 7 to avoid blocking early cloud smoke tests; tighten in Phase 9 if needed
- App stays alive with missing env vars so Cloud Run health probes can return structured failure detail rather than a crashed process
- `POST /` removed outright rather than protected with a shared secret, as decided in Phase 7 context
- Tests verified via `docker run python:3.12-slim` because Windows AppLocker policy blocks numpy PYDs regardless of Zone.Identifier unblocking

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Tests run via Docker instead of local Python**
- **Found during:** Task 1 (test execution)
- **Issue:** Windows AppLocker/WDAC policy blocked `_umath_linalg.cp314-win_amd64.pyd` (numpy dependency of ortools) from loading even after `Unblock-File` removed the Zone.Identifier stream
- **Fix:** Used `docker run python:3.12-slim` with bind mounts for api/ and requirements.txt to execute all pytest runs
- **Files modified:** None — only the test execution environment changed
- **Verification:** All 10 tests passed in Docker (4 hardening + 1 optimizer + 5 feasibility)
- **Committed in:** No separate commit — execution environment workaround only

---

**Total deviations:** 1 auto-fixed (blocking — test environment)
**Impact on plan:** Test execution via Docker is equivalent to the plan's `python -m pytest` intent. All acceptance criteria are met.

## Issues Encountered

- Windows AppLocker policy prevented numpy from loading in Python 3.14, both system-wide and in a freshly-created `.venv`. `Unblock-File` on PYD files did not resolve the DLL policy block. Resolved by running tests in Docker `python:3.12-slim` container (same version as the optimizer Dockerfile).

## Next Phase Readiness

- Optimizer service exposes only authenticated project routes and safe public endpoints — ready for containerization and Cloud Run deployment in Phase 07-02
- CORS and readiness semantics are in place; Cloud Run can use `GET /health` as a readiness probe
- All existing solver regression coverage remains green

## Self-Check: PASSED

- api/test_hardening.py: FOUND
- api/optimizer.py: FOUND
- .planning/phases/07-code-hardening/07-01-SUMMARY.md: FOUND
- Commits 7772644, b13538e, bfcd1bb: ALL FOUND
- CORSMiddleware in optimizer.py: FOUND
- allow_origin_regex in optimizer.py: FOUND
- GET /health in optimizer.py: FOUND
- No client.post("/") in test_optimizer.py or test_feasibility.py: CONFIRMED

---
*Phase: 07-code-hardening*
*Completed: 2026-03-21*
