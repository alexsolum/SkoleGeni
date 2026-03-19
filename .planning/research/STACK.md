# Technology Stack

**Project:** SkoleGeni
**Researched:** 2026-03-19

## Recommended Stack

This is a brownfield project. The right move is to keep the current product shape and harden it, not replace the stack.

### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | Current stable line | Admin UI | Existing app already uses it well, and the product is screen-driven rather than content-driven |
| Vite | Current stable line | Frontend build/dev | Fast iteration, already integrated, low migration cost |
| TypeScript | Current stable line | UI correctness | Needed to reduce regressions as the data workflow becomes stricter |
| React Router | Current stable line | Screen flow | Existing route model matches the product’s stepwise workflow |

### Data and Backend
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Postgres + Supabase patterns | Current stable line | Primary persistence | Strong fit for structured roster data, audit trails, and relational constraints |
| FastAPI | Current stable line | Optimizer API | Existing Python service is already a good boundary around OR-Tools |
| OR-Tools CP-SAT | Current stable line | Constraint solving | The product’s core value is optimization under multiple constraints; keep the solver-centered model |

### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | Current stable line | Runtime validation for client forms and API payloads | Use at every browser/service boundary where invalid data can leak through |
| TanStack Query | Current stable line | Query/mutation state | Use when replacing ad hoc `useEffect` loading and manual re-fetch logic |
| React Hook Form | Current stable line | Complex config/data entry forms | Use for constraint forms and modal workflows if page logic keeps growing |
| Vitest + Testing Library | Current stable line | Frontend unit/integration tests | Use for route flows, validation, and stateful UI logic |
| Playwright | Current stable line | End-to-end verification | Use for the core setup -> optimize -> review -> edit flow |

## Recommended Platform Direction
- Keep the browser as the main admin surface.
- Move risky persistence rules behind safer boundaries instead of relying on broad anonymous CRUD.
- Preserve the Python solver service, but formalize API contracts and failure handling.
- Introduce audit-friendly persistence around optimization runs and manual edits.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Frontend app | React + Vite | Rewrite to Next.js | Adds migration cost without solving the current trust and workflow problems |
| Data access | Safer scoped Supabase usage | Direct broad browser CRUD everywhere | Too fragile for admin-grade data handling |
| Form management | Add focused validation tools | Keep all form state ad hoc | Current page size already shows the limits |
| Testing | Vitest + Playwright | Manual-only QA | Too risky once data integrity and optimization trust become product promises |

## What Not to Do
- Do not replace the solver with heuristic-only client logic.
- Do not introduce a heavy greenfield architecture reset before core polish lands.
- Do not keep delete-and-reinsert persistence as the long-term write model.
- Do not ship admin-facing roster tools without stronger validation and auditability.

## Confidence
- Stack baseline: HIGH
- Brownfield recommendations: MEDIUM
- Specific library additions: MEDIUM

## Sources
- React docs: https://react.dev/
- Vite docs: https://vite.dev/
- Supabase docs: https://supabase.com/docs
- FastAPI docs: https://fastapi.tiangolo.com/
- OR-Tools docs: https://developers.google.com/optimization
- Playwright docs: https://playwright.dev/
- Vitest docs: https://vitest.dev/
