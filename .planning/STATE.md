---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Optimizer in Cloud
status: unknown
stopped_at: Completed 09-02-PLAN.md
last_updated: "2026-03-22T19:54:13.003Z"
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 6
  completed_plans: 6
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-21)

**Core value:** School staff can generate balanced, defensible class rosters quickly without losing control over the final result.
**Current focus:** Phase 10 — ci-cd (next)

## Current Position

Phase: 09 (frontend-wiring) — COMPLETE
Plan: 2 of 2 — COMPLETE

## Accumulated Context

### Decisions

Key milestone decisions are recorded in `.planning/PROJECT.md`.

- v1.1: Deploy with `--allow-unauthenticated`; Cloud Run IAM auth blocks CORS OPTIONS preflight with HTTP 403
- v1.1: Use Supabase `anon` key (not `service_role`) to preserve RLS on optimizer data reads
- v1.1: Cloud Run Gen 2, memory=2 GiB, timeout=300 s, concurrency=1 as safe baseline for OR-Tools
- [Phase 07-code-hardening]: Use allow_origin_regex='.*' for CORS rather than an allowlist — tighten in Phase 9
- [Phase 07-code-hardening]: Remove POST / outright rather than adding a shared-secret; app stays live with missing env for health probe inspection
- [Phase 07-02]: Use shell-form CMD with ${PORT:-8000} in Dockerfile for Cloud Run port injection
- [Phase 09-frontend-wiring]: waitFor timeout extended to 8s for optimizer 401 test to handle 3s runOptimizer delay without fake timer interference
- [Phase 09-frontend-wiring]: 401 branch placed as first catch condition before 400 diagnostic path in PupilData.runOptimizer
- [Phase 09-02]: VITE_OPTIMIZER_URL set for both Production AND Preview in Vercel (not production-only); preview deploys also get Cloud Run access
- [Phase 09-02]: Vercel redeploy required after env var addition — Vite bakes VITE_* values at build time; existing bundle had no value and fell back to /api/optimizer

### Deferred Tech Debt

- `04-06-PLAN.md`: undo can require two presses after autosave metadata writes duplicate the latest zundo snapshot
- Phase 05 verification noted non-blocking Prettier drift and draft Nyquist validation artifacts
- Build still emits a main-bundle chunk-size warning

### Pending Todos

- Make positive chemistry bidirectional — see `.planning/todos/pending/2026-03-20-make-positive-chemistry-bidirectional.md`

### Blockers/Concerns

- [RESOLVED 07-01] `POST /` removed outright in Phase 7 — no longer a concern
- [RESOLVED 09-02] Vercel preview URL CORS — resolved by setting VITE_OPTIMIZER_URL for Preview environment too; Cloud Run is --allow-unauthenticated so preview deploys work

## Session Continuity

Last session: 2026-03-22T15:30:00.000Z
Stopped at: Completed 09-02-PLAN.md
Resume file: None
