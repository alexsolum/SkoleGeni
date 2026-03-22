---
phase: 09-frontend-wiring
plan: 02
subsystem: infra
tags: [vercel, env-var, cloud-run, smoke-test, production]

# Dependency graph
requires:
  - phase: 09-frontend-wiring (plan 01)
    provides: VITE_OPTIMIZER_URL env var wiring in PupilData.tsx, 401 handler, unit tests
  - phase: 08-gcp-setup
    provides: Cloud Run service live at optimizer-ek4bkd34ja-ew.a.run.app
provides:
  - VITE_OPTIMIZER_URL configured in Vercel for Production and Preview environments
  - Production smoke test confirming end-to-end optimizer flow via Cloud Run
  - Phase 9 complete: frontend calls Cloud Run, auth flows end-to-end, 401 handled
affects: [10-ci-cd]

# Tech tracking
tech-stack:
  added: []
  patterns: [Vercel build-time env var injection via VITE_ prefix for Vite bundles]

key-files:
  created: []
  modified: []

key-decisions:
  - "VITE_OPTIMIZER_URL set for both Production AND Preview in Vercel (not production-only) per locked decision in CONTEXT.md"
  - "Redeploy required after env var addition because Vite bakes VITE_* values at build time — existing bundle compiled without it"

patterns-established:
  - "Smoke test protocol: Network tab URL check + Authorization header check + 200 status + zero console errors = confirmed end-to-end"

requirements-completed: [WIRE-01, WIRE-02]

# Metrics
duration: ~30min
completed: 2026-03-22
---

# Phase 09 Plan 02: Frontend Wiring - Vercel Config and Production Smoke Test Summary

**VITE_OPTIMIZER_URL set in Vercel dashboard for Production and Preview; production smoke test confirmed POST goes to Cloud Run URL with Bearer auth, 200 response, and zero console errors**

## Performance

- **Duration:** ~30 min (human action + verification)
- **Started:** 2026-03-22T15:00:00Z
- **Completed:** 2026-03-22T15:30:00Z
- **Tasks:** 2 (both checkpoints — human-action + human-verify)
- **Files modified:** 0 (Vercel dashboard configuration only)

## Accomplishments
- VITE_OPTIMIZER_URL added to Vercel dashboard for both Production and Preview environments with value `https://optimizer-ek4bkd34ja-ew.a.run.app`
- Production redeployment triggered to bake the new env var into the Vite bundle
- End-to-end smoke test passed all five checks:
  - A: Optimization result appeared in UI (no error toast)
  - B: POST request URL starts with `https://optimizer-ek4bkd34ja-ew.a.run.app/project` (not localhost, not `/api/optimizer`)
  - C: `Authorization: Bearer <token>` header present on the optimizer request
  - D: 200 response from the Cloud Run optimizer
  - E: Zero CORS errors and zero auth errors in browser console
- Phase 9 complete: all four success criteria verified in production

## Task Commits

No code commits for this plan — both tasks were human actions and human verification against the production Vercel deployment. The plan's code changes were committed in Plan 01 (commits d8b2086 and a4e259b).

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

None — this plan consisted entirely of Vercel dashboard configuration and browser-based smoke testing. No source files were added or modified.

## Decisions Made
- VITE_OPTIMIZER_URL set for Preview in addition to Production, per the locked decision in CONTEXT.md (preview deploys should also be able to call Cloud Run during development)
- Redeploy was required after adding the env var because Vite compiles `import.meta.env.VITE_*` values at build time; the existing bundle had no value and fell back to `/api/optimizer`

## Deviations from Plan

None - plan executed exactly as written. Both checkpoints completed on first attempt with no failures.

## Issues Encountered

None — all five smoke test checks passed on the first attempt after redeployment.

## User Setup Required

**Completed in this plan:**
- `VITE_OPTIMIZER_URL=https://optimizer-ek4bkd34ja-ew.a.run.app` — set in Vercel dashboard for Production and Preview
- Vercel redeployment triggered and completed

## Next Phase Readiness

Phase 9 is complete. All four phase success criteria are confirmed:
1. Production Vercel calls Cloud Run URL — verified via Network tab
2. Logged-in user runs optimization without CORS or auth errors — verified via Console tab
3. Supabase Bearer token forwarded through Cloud Run — verified via Authorization header + successful 200 response
4. 401 handling implemented — verified by unit tests in Plan 01

Phase 10 (CI/CD Automation) can begin. It depends on the Cloud Run service (live at optimizer-ek4bkd34ja-ew.a.run.app) and the Artifact Registry image built in Phase 8. No blockers.

---
*Phase: 09-frontend-wiring*
*Completed: 2026-03-22*
