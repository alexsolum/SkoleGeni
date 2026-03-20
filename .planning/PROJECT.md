# SkoleGeni

## What This Is

SkoleGeni is a desktop-first web app for school administrators and grade-level coordinators who need to generate balanced class rosters under real-world constraints. It combines direct data entry, configurable balancing rules, and an algorithmic optimizer so staff can move from raw pupil data to a proposed class structure and then refine the result manually.

The current repository already contains an MVP covering the core five-screen workflow. The current project focus is not inventing a new product from scratch, but finishing, hardening, and polishing that MVP into a more reliable and more production-ready version of the same product.

## Core Value

School staff can generate balanced, defensible class rosters quickly without losing control over the final result.

## Requirements

### Validated

- ✓ User can create or reopen a roster project from a welcome screen — existing MVP
- ✓ User can define class-balancing constraints before optimization — existing MVP
- ✓ User can enter pupil data manually or import it from CSV — existing MVP
- ✓ User can define positive and negative pupil chemistry links — existing MVP
- ✓ User can run an optimizer that generates class assignments and score outputs — existing MVP
- ✓ User can review generated classes in a results view — existing MVP
- ✓ User can manually drag pupils between classes in a class editor — existing MVP
- ✓ Authorized staff access to roster data is now enforced through owner-based project access and RLS — validated in Phase 1
- ✓ Roster saves no longer rely on destructive browser-side replace-all writes — validated in Phase 1
- ✓ User can run the optimizer and receive a clear success or infeasibility outcome instead of a generic failure — validated in Phase 3
- ✓ User can review generated classes using pupil names and class summaries rather than opaque identifiers — validated in Phase 3
- ✓ User can understand optimizer tradeoffs and weakest-class highlights in the results UI — validated in Phase 3

### Active

- [ ] Polish the existing five-screen workflow so the product feels coherent and production-ready
- [ ] Close MVP gaps where data handling, persistence, and output clarity are still weak
- [ ] Bring the UI into tighter alignment with the intended SkoleGeni design language and interaction model
- [ ] Add the minimum testing and verification needed to make further iteration safer

### Out of Scope

- Native mobile support — product direction and design docs are explicitly desktop-first
- Broad feature expansion beyond the class-generation workflow — current priority is finishing and polishing the baseline MVP
- Replacing the core optimization approach with a different paradigm — the existing solver-based model is the baseline to improve, not discard

## Context

The repository already contains a working brownfield MVP built with Vite, React, Tailwind, Supabase-style persistence, and a FastAPI + OR-Tools optimizer. The intended product flow is documented in `PRD.md`, while `DESIGN.md` and the current implementation establish the visual direction: dense, high-utility screens with restrained colors, strong typography, and desktop-oriented layouts.

The codebase map in `.planning/codebase/` shows that the product already implements the main journey, but the current MVP has important gaps. The main concerns are broad anonymous database access, delete-and-reinsert persistence in the pupil workflow, no automated tests, weak persistence semantics around class editing, and some UX roughness in how optimization output is presented.

This project should therefore be planned as a brownfield product-shaping effort: preserve what already works, strengthen fragile areas, and polish the end-to-end experience so the baseline MVP becomes dependable enough to extend.

Phase 1 established the security and persistence baseline for the rest of the roadmap. The product now uses authenticated ownership for project access, a safer trusted boundary for multi-step roster saves, and a server-backed optimizer path based on saved project state.

Phase 3 completed the optimization trust pass. Optimizer runs now return structured diagnostics for infeasible requests, results render with real pupil names and explainability details, and the live local stack is verified against the real Supabase-backed project flow.

## Constraints

- **Platform**: Desktop-first only — product and design docs do not target mobile support
- **Baseline**: Current MVP is the starting point — effort should finish and polish existing flows before expanding scope
- **Tech stack**: React frontend + Python optimizer + Supabase-style persistence — this stack already exists and should be improved rather than replaced
- **Product scope**: Focus on roster generation, balancing, review, and refinement — avoid unrelated admin features for now
- **Design direction**: High-density, minimalist UI with strong typographic hierarchy — must stay aligned with `PRD.md` and current SkoleGeni identity

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Treat the existing MVP as validated baseline | The repository already implements the product’s core workflow end to end | — Pending |
| Focus planning on finishing and polishing rather than broad expansion | The biggest current value comes from reliability, clarity, and trust in the baseline workflow | — Pending |
| Keep the product desktop-first | The target users work in admin-heavy desktop contexts and the design spec explicitly excludes mobile | — Pending |
| Preserve the current solver-centered product model | The optimizer is core to the product value and already exists in the codebase | ✓ Good |
| Keep browser reads direct under RLS and move risky multi-step writes behind a trusted boundary | This improves safety materially without forcing a full backend rewrite in Phase 1 | ✓ Good |
| Use single authenticated staff ownership in Phase 1 while leaving room for future team concepts | This matches the immediate access model while preserving future collaboration paths | ✓ Good |
| Present optimizer outcomes with explicit diagnostics and explainability metadata | Staff need to understand infeasible requests, score tradeoffs, and weak classes before trusting generated rosters | ✓ Good |

---
*Last updated: 2026-03-20 after Phase 3 completion*
