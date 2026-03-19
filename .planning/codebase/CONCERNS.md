# Codebase Concerns

**Analysis Date:** 2026-03-19

## Tech Debt

**Page-level monoliths:**
- Issue: Core frontend behavior is concentrated in very large route files instead of smaller modules.
- Files: `src/pages/PupilData.tsx`, `src/pages/ClassEditor.tsx`, `src/pages/Configuration.tsx`
- Impact: Small changes risk UI regressions because data loading, validation, persistence, and rendering are tightly coupled.
- Fix approach: Extract table logic, chemistry modal state, scoring helpers, and data loaders into focused hooks/components before adding more workflow complexity.

**Duplicated domain contracts:**
- Issue: Optimization request and response shapes are duplicated manually across TypeScript and Python.
- Files: `src/lib/api.ts`, `api/optimizer.py`
- Impact: The frontend and backend can drift silently when fields or enum values change.
- Fix approach: Generate shared types from an OpenAPI contract or add a schema compatibility test that posts a representative payload.

**Local-only editor persistence:**
- Issue: Drag-and-drop edits in the class editor never write the updated assignment back to storage.
- Files: `src/pages/ClassEditor.tsx`, `src/pages/Results.tsx`, `supabase/migrations/0001_init.sql`
- Impact: Manual edits disappear on reload, and the results page continues to show the pre-edit optimization run.
- Fix approach: Add an explicit save action that writes the edited assignment to `optimization_runs` or a dedicated table.

## Known Bugs

**Results page shows pupil IDs instead of names:**
- Symptoms: The generated class cards render truncated IDs rather than human-readable pupil names.
- Files: `src/pages/Results.tsx`
- Trigger: Open the results screen after any optimization run.
- Workaround: Open `src/pages/ClassEditor.tsx`, which loads the actual pupil map and displays names.

**Backend feasibility failures are returned as uncaught server errors:**
- Symptoms: Invalid class-size ranges produce opaque optimizer failures rather than structured validation responses.
- Files: `api/optimizer.py`, `src/lib/api.ts`
- Trigger: Submit a payload where `_derive_k_options` returns no class count or the solver finds no feasible assignment.
- Workaround: Rely on the limited client-side validation in `src/pages/Configuration.tsx`; there is no backend-safe error envelope.

## Security Considerations

**Public write access to all project data:**
- Risk: Any user with the anonymous key can read and modify every project record.
- Files: `supabase/migrations/0001_init.sql`, `src/lib/supabase.ts`
- Current mitigation: None beyond using Supabase anon credentials.
- Recommendations: Enable RLS, add user identity, and scope policies by project ownership before real deployment.

**Inline development secrets and credentials in compose config:**
- Risk: Local JWT material and database credentials are stored in versioned config.
- Files: `docker-compose.yml`
- Current mitigation: These appear intended for local-only usage.
- Recommendations: Move local secrets to ignored env files or clearly isolate them as disposable dev credentials.

## Performance Bottlenecks

**Full-table replacement on every save:**
- Problem: Pupil and chemistry persistence deletes all rows and reinserts them for each optimization run.
- Files: `src/pages/PupilData.tsx`
- Cause: The MVP avoids diff logic by truncating project-scoped rows.
- Improvement path: Use `upsert` and targeted deletes keyed by row identity to reduce round trips and preserve metadata.

**Solver complexity growth with large cohorts:**
- Problem: The optimizer builds many assignment and penalty variables, then solves each feasible class count candidate sequentially.
- Files: `api/optimizer.py`
- Cause: The CP-SAT model scales with pupils × classes × group counts.
- Improvement path: Add benchmark coverage, prune candidate `k` values, and tune time limits or decomposition for larger datasets.

## Fragile Areas

**Chemistry rules across UI and solver:**
- Files: `src/pages/PupilData.tsx`, `src/pages/ClassEditor.tsx`, `api/optimizer.py`
- Why fragile: Positive links are treated as directed in storage but deduplicated as undirected rewards in the solver, while negative links are treated as undirected hard blocks.
- Safe modification: Change storage semantics and optimizer semantics together, then verify with payload-level tests.
- Test coverage: No automated coverage detected.

**Scoring parity between backend and editor:**
- Files: `src/pages/ClassEditor.tsx`, `api/optimizer.py`
- Why fragile: The editor uses `computeQuickScore`, which is only a heuristic approximation of backend scoring and constraints.
- Safe modification: Keep a documented contract for score meaning or reuse a shared scoring implementation.
- Test coverage: No automated parity checks detected.

## Scaling Limits

**Client-side page ownership model:**
- Current capacity: Works for the current five-screen MVP in `src/App.tsx`
- Limit: More flows will compound repeated query logic and duplicated data transforms across route files.
- Scaling path: Introduce shared data hooks or a query layer before expanding the workflow.

**Anonymous multi-tenant data model:**
- Current capacity: Suitable only for a controlled demo
- Limit: Concurrent real users cannot be isolated securely with the current schema and public grants
- Scaling path: Add authentication, ownership columns, RLS policies, and server-side authorization checks

## Dependencies at Risk

**No locked application package versions:**
- Risk: `package.json` uses `"*"` for most runtime dependencies.
- Impact: Fresh installs can pull different major versions and change behavior unexpectedly.
- Migration plan: Pin exact or bounded semver ranges and rely on `package-lock.json` for reproducibility.

## Missing Critical Features

**No user identity or access model:**
- Problem: Projects have no owner and cannot be isolated securely.
- Blocks: Safe shared deployment and any non-demo usage.

**No automated regression suite:**
- Problem: Frontend workflows, schema behavior, and optimizer correctness are untested.
- Blocks: Confident refactoring of the optimizer, persistence, and class editor flows.

## Test Coverage Gaps

**Optimizer correctness:**
- What's not tested: class-size feasibility, chemistry handling, and score stability
- Files: `api/optimizer.py`
- Risk: Constraint changes can break solver output without immediate detection.
- Priority: High

**Persistence and route flow:**
- What's not tested: create project, save constraints, import pupils, run optimizer, open results, edit classes
- Files: `src/pages/Welcome.tsx`, `src/pages/Configuration.tsx`, `src/pages/PupilData.tsx`, `src/pages/Results.tsx`, `src/pages/ClassEditor.tsx`
- Risk: Regressions in one page can break the entire workflow.
- Priority: High

---

*Concerns audit: 2026-03-19*
