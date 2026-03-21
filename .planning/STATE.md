---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Optimizer in Cloud
current_plan: null
status: ready_to_plan
stopped_at: null
last_updated: "2026-03-21T14:30:00+01:00"
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-21)

**Core value:** School staff can generate balanced, defensible class rosters quickly without losing control over the final result.
**Current focus:** Phase 7 — Code Hardening (v1.1 Optimizer in Cloud)

## Current Position

Milestone: v1.1 Optimizer in Cloud
Phase: 7 of 10 (Phase 7: Code Hardening)
Plan: — (not yet planned)
Status: Ready to plan
Last activity: 2026-03-21 — v1.1 roadmap created; 4 phases defined (7-10)

Progress: [░░░░░░░░░░] 0%  (v1.1: 0/4 phases complete)

## Accumulated Context

### Decisions

Key milestone decisions are recorded in `.planning/PROJECT.md`.

- v1.1: Deploy with `--allow-unauthenticated`; Cloud Run IAM auth blocks CORS OPTIONS preflight with HTTP 403
- v1.1: Use Supabase `anon` key (not `service_role`) to preserve RLS on optimizer data reads
- v1.1: Cloud Run Gen 2, memory=2 GiB, timeout=300 s, concurrency=1 as safe baseline for OR-Tools

### Deferred Tech Debt

- `04-06-PLAN.md`: undo can require two presses after autosave metadata writes duplicate the latest zundo snapshot
- Phase 05 verification noted non-blocking Prettier drift and draft Nyquist validation artifacts
- Build still emits a main-bundle chunk-size warning

### Pending Todos

- Make positive chemistry bidirectional — see `.planning/todos/pending/2026-03-20-make-positive-chemistry-bidirectional.md`

### Blockers/Concerns

- Research gap: Vercel preview URL CORS — decide at Phase 9 whether preview deploys need optimizer access or production-only is acceptable
- Research gap: `POST /` direct optimize endpoint has no auth — decide at Phase 7 whether to remove or add a shared secret check

## Session Continuity

Last session: 2026-03-21
Stopped at: Roadmap created for v1.1. Ready to plan Phase 7.
Resume file: None
