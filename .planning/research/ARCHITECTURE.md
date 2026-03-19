# Architecture Patterns

**Domain:** Brownfield roster optimization web app
**Researched:** 2026-03-19

## Recommended Architecture

SkoleGeni should keep its current three-part shape:
- React admin client
- relational persistence layer
- dedicated optimization service

The main architectural change is not a rewrite. It is adding safer boundaries between them.

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Admin UI | Project setup, data entry, review, editor workflows | App data service, optimizer API |
| App data service | Validated reads/writes for projects, pupils, chemistry, runs, edits | Postgres/Supabase |
| Optimizer API | Constraint solving and score generation | App data service or validated client payloads |
| Run history store | Snapshot constraints, outputs, status, and metadata | App data service, results UI |
| Editor scoring layer | Fast local feedback plus persisted edits | Admin UI, run history store |

## Data Flow

1. User creates or opens a project.
2. UI loads constraints, pupils, and prior runs through a consistent data-access layer.
3. User edits data with client-side validation and server-side shape validation.
4. Optimizer is invoked with a normalized payload.
5. Result, score, and metadata are stored as an optimization run.
6. Results screen reads the latest run plus warnings or unmet constraints.
7. Class editor reads a saved run, applies manual adjustments, recalculates quick feedback, and persists the refined state.

## Patterns to Follow

### Pattern 1: Normalize at the boundary
**What:** Convert UI-friendly data into one canonical backend shape before writing or optimizing.
**When:** Pupil edits, chemistry edits, constraints save, optimizer request creation.
**Why:** The current code manually maps camelCase to snake_case in multiple places, which is easy to drift.

### Pattern 2: Snapshot every optimization run
**What:** Treat each optimization execution as a recoverable artifact with inputs, outputs, and timestamps.
**When:** Every time the optimizer runs.
**Why:** Trust improves when users can recover or compare a prior result.

### Pattern 3: Persist manual edits explicitly
**What:** Store refined class assignments separately from raw optimizer output.
**When:** After drag-and-drop or when the user saves a refined arrangement.
**Why:** Manual changes are part of the real workflow, not disposable UI state.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Browser owns all write rules
**Why bad:** Makes permissions, validation, and auditability too weak for admin workflows.
**Instead:** Centralize risky writes behind stricter policies or validated service boundaries.

### Anti-Pattern 2: Destructive replace-all saves
**Why bad:** Partial failures can erase good data and make the workflow feel fragile.
**Instead:** Use transactional upserts or staged replacement with rollback semantics.

### Anti-Pattern 3: Divergent scoring logic
**Why bad:** Users lose trust if the editor’s score and optimizer’s score disagree without explanation.
**Instead:** Define clear "optimizer score" vs "editor quick score" semantics and show both when needed.

## Build Order Implications
1. Fix data integrity and write boundaries first.
2. Improve import/validation and optimizer request consistency next.
3. Upgrade results readability and editor persistence after the data layer is dependable.
4. Apply visual polish and design-system tightening once the workflow is stable.
5. Add automated quality gates alongside or immediately after the higher-risk workflow changes.

## Confidence
- Brownfield architecture direction: HIGH
- Migration details: MEDIUM

## Sources
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/CONCERNS.md`
- Supabase docs: https://supabase.com/docs
- FastAPI docs: https://fastapi.tiangolo.com/
