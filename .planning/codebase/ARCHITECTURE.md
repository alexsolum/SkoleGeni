# Architecture

**Analysis Date:** 2026-03-19

## Pattern Overview

**Overall:** Single-page React client with a thin backend optimizer service and database-first persistence.

**Key Characteristics:**
- Route-driven workflow where each screen owns its own data loading and mutation logic
- No shared application state container; state is local to each page component
- Persistence is handled directly from UI components through Supabase calls

## Layers

**Routing/UI Layer:**
- Purpose: Render screens and move the user through the roster workflow
- Location: `src/App.tsx`, `src/main.tsx`, `src/pages/*.tsx`
- Contains: routes, page components, local React state, loading states, toast messages
- Depends on: `react-router-dom`, `react-hot-toast`, `src/lib/api.ts`, `src/lib/supabase.ts`
- Used by: browser entry point in `src/main.tsx`

**Client Integration Layer:**
- Purpose: Wrap external service access for the frontend
- Location: `src/lib/api.ts`, `src/lib/supabase.ts`
- Contains: optimizer payload/response types, `fetch` call, Supabase client bootstrap
- Depends on: environment variables and external SDKs
- Used by: every page component with persistence or optimization behavior

**Optimization Service Layer:**
- Purpose: Convert pupil and constraint inputs into a feasible class assignment
- Location: `api/optimizer.py`
- Contains: Pydantic request/response models, CP-SAT model construction, scoring, feasibility search over candidate class counts
- Depends on: FastAPI and OR-Tools
- Used by: `src/lib/api.ts`

**Persistence Layer:**
- Purpose: Store project state, constraints, pupils, chemistry links, and generated runs
- Location: `supabase/migrations/0001_init.sql`, mirrored by `docker/db/init/*.sql`
- Contains: tables, indexes, triggers, grants, RLS configuration
- Depends on: PostgreSQL and Supabase/PostgREST conventions
- Used by: page-level Supabase queries and inserts

## Data Flow

**Project setup and optimization flow:**

1. `src/pages/Welcome.tsx` creates or selects a project record from `projects`.
2. `src/pages/Configuration.tsx` writes constraint values into `project_constraints`.
3. `src/pages/PupilData.tsx` loads constraints and related rows, edits pupil and chemistry state locally, then replaces persisted `pupils` and `chemistry_links`.
4. `src/pages/PupilData.tsx` posts the full optimization payload to `src/lib/api.ts`, which calls `api/optimizer.py`.
5. `api/optimizer.py` computes classes and returns scores; the page persists the result in `optimization_runs`.
6. `src/pages/Results.tsx` reads the newest optimization run.
7. `src/pages/ClassEditor.tsx` reads the newest run again and performs client-only drag-and-drop adjustments with local score recalculation.

**State Management:**
- Use local `useState`, `useMemo`, and `useEffect` inside each page.
- No cross-route store, query cache, reducer layer, or state synchronization abstraction is present.

## Key Abstractions

**Optimization payload contract:**
- Purpose: Keep the frontend and backend aligned on request and response shapes
- Examples: `src/lib/api.ts`, `api/optimizer.py`
- Pattern: duplicated but closely mirrored type/model definitions across TypeScript and Python

**Project-scoped tables:**
- Purpose: Treat each roster as an isolated unit across constraints, pupils, chemistry, and runs
- Examples: `supabase/migrations/0001_init.sql`
- Pattern: `project_id` foreign-key fanout from `projects`

**Heuristic editor scoring:**
- Purpose: Re-score manual edits without calling the backend solver
- Examples: `computeQuickScore` and helpers in `src/pages/ClassEditor.tsx`
- Pattern: client-side approximation of the backend scoring dimensions

## Entry Points

**Frontend app:**
- Location: `src/main.tsx`
- Triggers: browser loading `index.html`
- Responsibilities: mount React, wrap in `BrowserRouter`, import global CSS

**Router shell:**
- Location: `src/App.tsx`
- Triggers: app startup and URL changes
- Responsibilities: define route graph and toast container

**Optimizer API:**
- Location: `api/optimizer.py`
- Triggers: HTTP `POST /`
- Responsibilities: validate payload, solve assignment, return scores and debug fields

**Database bootstrap:**
- Location: `supabase/migrations/0001_init.sql`, `docker/db/init/0001_schema.sql`
- Triggers: Supabase migration apply or local Postgres init
- Responsibilities: create tables, triggers, indexes, grants, and security defaults

## Error Handling

**Strategy:** Surface most failures as toast messages in the UI and rely on thrown exceptions in the optimizer path.

**Patterns:**
- Page components check Supabase `error` values and show generic toast failures
- `src/lib/api.ts` throws `Error` when the optimizer response is non-OK
- `api/optimizer.py` raises `ValueError` for infeasible requests; no explicit FastAPI exception translation is implemented

## Cross-Cutting Concerns

**Logging:** Minimal. One `console.warn` in `src/lib/supabase.ts`; otherwise user-facing toasts only.
**Validation:** Client-side validation in `src/pages/Configuration.tsx` and `src/pages/PupilData.tsx`, request validation via Pydantic in `api/optimizer.py`, schema constraints in `supabase/migrations/0001_init.sql`.
**Authentication:** Not implemented for end users; database access is public/anonymous per `supabase/migrations/0001_init.sql`.

---

*Architecture analysis: 2026-03-19*
