---
phase: 07-code-hardening
plan: "02"
subsystem: infra
tags: [docker, cloud-run, uvicorn, fastapi, python, optimizer]

# Dependency graph
requires:
  - phase: 07-01
    provides: CORS-hardened optimizer API with health readiness endpoint and removed unauthenticated POST /

provides:
  - Cloud Run-compatible optimizer Docker image with PYTHONUNBUFFERED=1 and PORT-aware startup
  - Closed Phase 7 Nyquist validation contract with concrete docker run verification commands

affects: [08-cloud-run-deploy]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shell-form Dockerfile CMD with ${PORT:-8000} for Cloud Run port injection"
    - "PYTHONUNBUFFERED=1 ENV var for prompt log flushing in containers"

key-files:
  created:
    - docker/optimizer.Dockerfile
    - .planning/phases/07-code-hardening/07-VALIDATION.md (updated to complete)
  modified:
    - docker/optimizer.Dockerfile
    - .planning/phases/07-code-hardening/07-VALIDATION.md

key-decisions:
  - "Use shell-form CMD (not JSON array) in Dockerfile so ${PORT:-8000} shell variable expansion works at runtime for Cloud Run"
  - "Document docker run verification commands in VALIDATION.md with explicit port numbers (18080, 18081) to make the runtime contract testable"

patterns-established:
  - "Cloud Run Dockerfile pattern: ENV PYTHONUNBUFFERED=1 + shell CMD with ${PORT:-8000}"

requirements-completed: [HARD-01, HARD-02]

# Metrics
duration: 2min
completed: 2026-03-21
---

# Phase 07 Plan 02: Code Hardening — Runtime Contract and Validation Closure Summary

**Cloud Run-ready optimizer Dockerfile with unbuffered logging and PORT-aware startup, plus a complete Nyquist validation contract with concrete docker run verification evidence**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-21T19:57:04Z
- **Completed:** 2026-03-21T19:58:46Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Upgraded optimizer Dockerfile from fixed-port JSON CMD to shell-form CMD with `${PORT:-8000}`, enabling Cloud Run to inject the listen port at runtime
- Added `ENV PYTHONUNBUFFERED=1` so Python stdout/stderr are flushed immediately to Cloud Run's logging infrastructure
- Closed the Phase 7 Nyquist validation contract: set `nyquist_compliant: true`, `wave_0_complete: true`, checked all Wave 0 bullets, and replaced draft placeholders with concrete `docker run` commands verified to work

## Task Commits

Each task was committed atomically:

1. **Task 1: Make the optimizer image Cloud Run compatible and unbuffered** - `7a527aa` (feat)
2. **Task 2: Close the Phase 7 validation gaps with concrete hardening coverage** - `cb9db6f` (docs)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `docker/optimizer.Dockerfile` - Added `ENV PYTHONUNBUFFERED=1`; replaced JSON CMD with shell-form CMD using `${PORT:-8000}` for Cloud Run port injection
- `.planning/phases/07-code-hardening/07-VALIDATION.md` - Promoted to `nyquist_compliant: true`, `wave_0_complete: true`; all per-task entries marked green; added `docker run` verification commands for both ready and not-ready paths

## Decisions Made

- Used shell-form CMD rather than JSON CMD so `${PORT:-8000}` variable expansion works without a shell wrapper. The `JSONArgsRecommended` Docker linter warning is expected and acceptable here.
- Chose ports 18080 and 18081 as concrete verification ports in VALIDATION.md so the commands are copy-pasteable without port conflicts.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Local Python environment (Python 3.14 + Windows DLL policy) blocks numpy/ortools import outside Docker. Tests were verified inside the Docker container (`python -m pytest api/test_hardening.py -q` → 4 passed). This is a pre-existing local environment constraint, not introduced by this plan.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The optimizer image is ready for Cloud Run deployment in Phase 8
- `docker/optimizer.Dockerfile` sets `PYTHONUNBUFFERED=1`, binds `0.0.0.0`, and respects the `PORT` env var injected by Cloud Run
- Phase 7 validation contract is fully closed with runtime evidence — both the happy path (HTTP 200, `status: "ready"`) and the missing-env path (HTTP 503, `missing_env` list) have been verified
- No blockers for Phase 8

---
*Phase: 07-code-hardening*
*Completed: 2026-03-21*

## Self-Check: PASSED

- docker/optimizer.Dockerfile: FOUND
- .planning/phases/07-code-hardening/07-VALIDATION.md: FOUND
- .planning/phases/07-code-hardening/07-02-SUMMARY.md: FOUND
- Commit 7a527aa: FOUND
- Commit cb9db6f: FOUND
