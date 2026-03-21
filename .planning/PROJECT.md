# SkoleGeni

## Current Milestone: v1.1 Optimizer in Cloud

**Goal:** Deploy the FastAPI + OR-Tools optimizer to Google Cloud Run so the Vercel-hosted frontend can call a cloud-hosted optimization endpoint instead of requiring a local Docker stack.

**Target features:**
- Deploy optimizer container to Cloud Run with the existing Dockerfile
- Wire the Vercel frontend to call the cloud optimizer endpoint
- Support synchronous long-running optimizations via Cloud Run's generous timeout
- Maintain authenticated access (Supabase auth headers forwarded to optimizer)

## Current State

SkoleGeni v1.0 MVP shipped on 2026-03-21.

The shipped product now covers the full desktop-first roster workflow: authenticated project access, trustworthy setup and pupil-entry persistence, explainable optimization results, durable manual editing, and a coherent five-screen UI backed by automated regression coverage.

The primary deferred item is the Phase 4 double-undo regression captured in `04-06-PLAN.md`. Milestone audit marked it as minor tech debt rather than a blocker.

## What This Is

SkoleGeni is a desktop-first web app for school administrators and grade-level coordinators who need to generate balanced class rosters under real-world constraints. It combines direct data entry, configurable balancing rules, and an algorithmic optimizer so staff can move from raw pupil data to a proposed class structure and then refine the result manually.

## Core Value

School staff can generate balanced, defensible class rosters quickly without losing control over the final result.

## Requirements

### Validated

- ✓ Authorized staff access to roster data is enforced through owner-based project access and RLS — v1.0
- ✓ Roster saves no longer rely on destructive browser-side replace-all writes — v1.0
- ✓ Users can create, reopen, and continue a roster project without losing saved setup data — v1.0
- ✓ Users can save validated constraints, import pupil data with actionable feedback, and rely on predictable autosave/retry behavior — v1.0
- ✓ Users can run the optimizer and receive clear success or infeasibility outcomes with explainability and readable class summaries — v1.0
- ✓ Users can manually edit classes, keep those edits durably saved, and continue through warn-only invalid intermediate states with clear feedback — v1.0
- ✓ The product ships with a coherent desktop UI plus automated Python, Vitest, and Playwright coverage for critical flows — v1.0

### Active

- [ ] Deploy the optimizer as a cloud-hosted service accessible from the Vercel frontend
- [ ] Maintain authenticated optimizer access with Supabase auth forwarding
- [ ] Support long-running synchronous optimizations without timeout failures

### Future (deferred from v1.1)

- SCEN-01: Compare multiple generated roster scenarios for the same project
- SCEN-02: Keep alternate manual-edit branches before choosing a final roster
- EXPT-01: Export roster results in a staff-friendly format for review and handoff
- EXPT-02: Print or share a summary of score tradeoffs and constraint satisfaction
- INTG-01: Import pupil data directly from an SIS or district data source
- INTG-02: Sync finalized classes back to an external system
- Async optimization with job queuing and progress tracking (deferred until sync timeout proves insufficient)

### Out of Scope

- Native mobile support — product direction and design docs are explicitly desktop-first
- Broad feature expansion beyond roster generation, balancing, review, and refinement
- Replacing the current solver-centered product model

## Context

Shipped v1.0 after 6 phases, 20 plans, and 42 documented tasks across 2026-03-19 through 2026-03-21.

The product now runs on the existing React + Vite frontend, FastAPI + OR-Tools optimizer, and Supabase-style persistence stack with stronger access control, safer persistence boundaries, durable editing state, and milestone-level verification coverage.

## Next Milestone Goals

- Validate that the cloud-hosted optimizer works reliably for real school-sized datasets before expanding feature scope.
- Revisit scenario planning vs export/reporting priorities after cloud deployment is stable.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Treat the existing MVP as the validated baseline | The repository already implemented the core workflow end to end | ✓ Good |
| Focus on finishing and polishing before broad expansion | Reliability and trust were the highest-value gaps in the baseline product | ✓ Good |
| Keep the product desktop-first | The user context and dense workflow remain desktop-oriented | ✓ Good |
| Preserve the solver-centered product model | Optimization is still the core product value | ✓ Good |
| Keep browser reads direct under RLS and move risky writes behind a trusted boundary | This materially improved safety without a full backend rewrite | ✓ Good |
| Use shared workflow state banners and route-stubbed browser verification for trust-sensitive flows | The workflow needed reusable save-state semantics and deterministic regression coverage | ✓ Good |
| Allow warn-only invalid manual edit states with immediate explanations and backend score verification | Users need control while still seeing clear rule violations and tradeoffs | ✓ Good |

---
*Last updated: 2026-03-21 after v1.1 milestone start*
