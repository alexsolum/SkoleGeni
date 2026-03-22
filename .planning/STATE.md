---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Optimizer in Cloud
status: unknown
stopped_at: Phase 9 context gathered
last_updated: "2026-03-22T12:40:34.103Z"
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 4
  completed_plans: 4
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-21)

**Core value:** School staff can generate balanced, defensible class rosters quickly without losing control over the final result.
**Current focus:** Phase 08 — gcp-setup-and-manual-deploy

## Current Position

Phase: 08 (gcp-setup-and-manual-deploy) — COMPLETED
Plan: 2 of 2 — COMPLETED

## Accumulated Context

### Decisions

Key milestone decisions are recorded in `.planning/PROJECT.md`.

- v1.1: Deploy with `--allow-unauthenticated`; Cloud Run IAM auth blocks CORS OPTIONS preflight with HTTP 403
- v1.1: Use Supabase `anon` key (not `service_role`) to preserve RLS on optimizer data reads
- v1.1: Cloud Run Gen 2, memory=2 GiB, timeout=300 s, concurrency=1 as safe baseline for OR-Tools
- [Phase 07-code-hardening]: Use allow_origin_regex='.*' for CORS rather than an allowlist — tighten in Phase 9
- [Phase 07-code-hardening]: Remove POST / outright rather than adding a shared-secret; app stays live with missing env for health probe inspection
- [Phase 07-02]: Use shell-form CMD with ${PORT:-8000} in Dockerfile for Cloud Run port injection

### Deferred Tech Debt

- `04-06-PLAN.md`: undo can require two presses after autosave metadata writes duplicate the latest zundo snapshot
- Phase 05 verification noted non-blocking Prettier drift and draft Nyquist validation artifacts
- Build still emits a main-bundle chunk-size warning

### Pending Todos

- Make positive chemistry bidirectional — see `.planning/todos/pending/2026-03-20-make-positive-chemistry-bidirectional.md`

### Blockers/Concerns

- Research gap: Vercel preview URL CORS — decide at Phase 9 whether preview deploys need optimizer access or production-only is acceptable
- [RESOLVED 07-01] `POST /` removed outright in Phase 7 — no longer a concern

## Session Continuity

Last session: 2026-03-22T12:40:34.098Z
Stopped at: Phase 9 context gathered
Resume file: .planning/phases/09-frontend-wiring/09-CONTEXT.md
