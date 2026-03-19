# Phase 1: Secure Data Foundation - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase locks down roster data access and removes destructive persistence patterns in the existing MVP. It covers security boundaries, ownership model, and safer write behavior for the current product flow; it does not add new end-user product capabilities.

</domain>

<decisions>
## Implementation Decisions

### Access model
- Direct browser reads may remain in place, but only under proper RLS and explicit project-level authorization.
- Simple writes may remain browser-driven where the operation is low-risk and single-record in nature.
- Risky or multi-step writes must move behind trusted server-side boundaries rather than stay in the browser.
- Optimizer execution should run from saved server-side project state, not from a fully client-assembled payload sent directly by the UI.
- When there is a tradeoff inside Phase 1, prefer the lower-implementation-effort option if it still materially improves safety over the current MVP.

### Identity model
- In Phase 1, each project should belong to exactly one authenticated staff user.
- Unauthenticated users should have no app access beyond the landing/login boundary.
- The data model should be shaped so collaboration can be added later without reworking ownership from scratch.
- Team concepts should be anticipated in the model now, even if team-sharing behavior is not delivered in this phase.

### Claude's Discretion
- Exact choice of backend boundary for risky writes, so long as it preserves the decisions above.
- Exact schema shape for future team/collaboration readiness, so long as single-owner project access remains the live behavior in Phase 1.
- Exact split between "simple" and "risky" writes during planning, as long as destructive multi-step saves are treated as server-side work.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and roadmap
- `.planning/PROJECT.md` — Product baseline, constraints, and project-level non-negotiables
- `.planning/REQUIREMENTS.md` — Phase-linked requirements including `SECU-01` and `SECU-02`
- `.planning/ROADMAP.md` — Phase 1 boundary, goal, and success criteria
- `.planning/STATE.md` — Current project position and active phase

### Existing implementation
- `supabase/migrations/0001_init.sql` — Current database schema plus MVP-wide disabled RLS and broad anon/authenticated grants
- `src/pages/PupilData.tsx` — Current destructive delete-and-reinsert save behavior for pupils and chemistry links
- `src/lib/supabase.ts` — Current browser-side Supabase client initialization pattern
- `docker-compose.yml` — Current local credential/default handling, including committed local JWT-style values

### Product/design docs
- `PRD.md` — Product intent and workflow expectations for the current MVP baseline
- `DESIGN.md` — Existing design-system reference, relevant only insofar as this phase must not break the intended product shape while hardening the foundation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/supabase.ts`: existing client entry point for browser-side reads and simple writes
- `src/lib/api.ts`: existing frontend API boundary pattern that can inform a server-side optimizer trigger path
- `src/pages/PupilData.tsx`: current save orchestration point, which is the main integration point for replacing destructive writes

### Established Patterns
- Browser-driven data access is the current default pattern across screens.
- Project data is keyed by `project_id` across the main relational tables.
- Optimization runs are already persisted separately in `optimization_runs`, which gives a natural boundary for server-side optimizer orchestration.

### Integration Points
- Any safer mutation boundary will need to replace or wrap the current save path in `src/pages/PupilData.tsx`.
- RLS and ownership changes will begin in `supabase/migrations/0001_init.sql` or follow-on migrations.
- Identity changes will affect all project-scoped table access, especially `projects`, `project_constraints`, `pupils`, `chemistry_links`, and `optimization_runs`.

</code_context>

<specifics>
## Specific Ideas

- Keep reads direct where possible instead of forcing a full backend-for-everything rewrite in Phase 1.
- Use Phase 1 to establish authenticated ownership and security boundaries without overbuilding full collaboration yet.
- Keep the implementation pragmatic: improve safety materially without turning this phase into a full platform rewrite.

</specifics>

<deferred>
## Deferred Ideas

- Shared staff access and collaboration workflows — future phase
- Full team/room behavior beyond forward-compatible schema decisions — future phase

</deferred>

---

*Phase: 01-secure-data-foundation*
*Context gathered: 2026-03-19*
