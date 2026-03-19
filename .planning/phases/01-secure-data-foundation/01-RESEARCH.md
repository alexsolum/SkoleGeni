# Phase 1: Secure Data Foundation - Research

**Researched:** 2026-03-19
**Domain:** Supabase auth/RLS, Postgres ownership modeling, transactional mutation boundaries, and foundational test coverage
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

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

### Deferred Ideas (OUT OF SCOPE)
- Shared staff access and collaboration workflows — future phase
- Full team/room behavior beyond forward-compatible schema decisions — future phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SECU-01 | Authorized school staff can access roster data only through explicitly allowed project permissions and policies | Owner-based RLS, authenticated-only access, and forward-compatible membership/team schema |
| SECU-02 | Staff can save project changes without exposing unrestricted public CRUD access to student data | Transactional RPC or trusted server mutation path for multi-step roster saves, while leaving low-risk writes in-browser |
</phase_requirements>

## Summary

Phase 1 should not be planned as a full backend rewrite. The lowest-friction route that still materially improves security is to introduce Supabase Auth-backed ownership, enable RLS on project-scoped tables, and keep direct browser reads plus genuinely simple writes where they are safe under policy. The current MVP-wide `anon` CRUD approach in `supabase/migrations/0001_init.sql` is the main thing to eliminate first.

The destructive save path in `src/pages/PupilData.tsx` is the other critical planning input. Because it deletes and reinserts multiple related tables, it should not stay as a browser-issued multi-step mutation. The standard path here is a single trusted mutation boundary, ideally a Postgres function exposed via Supabase RPC for lower implementation effort, or an Edge/server function if the logic needs more orchestration. In either case, the planner should treat "replace destructive roster save with one transactional mutation path" as a core deliverable for this phase.

The optimizer trigger should also move away from client-assembled payload authority. The recommended shape is: browser saves project state, browser requests optimization by `projectId`, trusted server-side code loads the saved state, then calls the existing optimizer service. That preserves the current product flow while aligning with the user’s constraint that reads remain direct and implementation effort stay pragmatic.

**Primary recommendation:** Use Supabase Auth + owner-based RLS on all project-scoped tables, add forward-compatible ownership/team columns, and replace the destructive pupil/chemistry save with a single transactional trusted mutation path. Keep direct reads and low-risk writes in the browser.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | `2.99.3` | Browser client for auth, reads, and low-risk writes | Already in the app, supports Supabase Auth and RLS-backed access cleanly |
| Supabase Auth | Managed service | Authenticated staff identity | Lowest-friction path to move off anonymous editing while staying in the existing platform |
| Postgres RLS + policies | Built-in | Per-row authorization | This is the standard Supabase security boundary, not app-side filtering |
| Postgres SQL functions / Supabase RPC | Built-in | Transactional multi-table mutations | Lower-effort trusted mutation path than introducing a new full application server for this phase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pytest` | `9.0.2` | Python optimizer and mutation-path tests | Use for backend and SQL-adjacent logic validation |
| `httpx` | `0.28.1` | FastAPI endpoint tests | Use with FastAPI `TestClient`/HTTP testing for optimizer-trigger behavior |
| `vitest` | `4.1.0` | Frontend/unit integration tests | Use for save-flow orchestration and client helpers |
| `@testing-library/react` | `16.3.2` | React interaction tests | Use for Pupil Mode regression coverage around validation and mutation calls |
| `@playwright/test` | `1.58.2` | End-to-end workflow smoke tests | Use for one core secured roster flow once auth is in place |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SQL function / RPC for roster save | Supabase Edge Function | More flexible for orchestration, but heavier than needed if Phase 1 only needs transactional writes |
| Mixed model: browser reads + safe writes | Full BFF / custom API layer | Cleaner long-term boundary, but higher implementation cost than the user asked for in Phase 1 |
| Single-owner schema with future-ready team hooks | Full membership/collaboration system now | Better future completeness, but unnecessary scope for this phase |

**Installation:**
```bash
npm install -D vitest @testing-library/react @playwright/test
python -m pip install pytest httpx
```

**Version verification:**
- `npm view @supabase/supabase-js version` -> `2.99.3`
- `npm view vitest version` -> `4.1.0`
- `npm view @testing-library/react version` -> `16.3.2`
- `npm view @playwright/test version` -> `1.58.2`
- `python -m pip index versions pytest` -> `9.0.2`
- `python -m pip index versions httpx` -> `0.28.1`

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── lib/                 # existing shared clients and API helpers
├── pages/               # current screen containers
└── services/            # Phase 1 candidate home for trusted mutation wrappers

supabase/
└── migrations/          # ownership columns, RLS policies, RPC/function definitions

api/
└── optimizer.py         # existing optimizer boundary, to be triggered from saved server-side state
```

### Pattern 1: Owner-based RLS on every project-scoped table
**What:** add authenticated ownership to `projects`, then enforce access to all related rows through policies tied to project ownership.
**When to use:** immediately, because the current schema has no protected ownership boundary at all.
**Example:**
```sql
alter table public.projects enable row level security;

create policy projects_select_own
on public.projects
for select
to authenticated
using ((select auth.uid()) = owner_user_id);
```

### Pattern 2: Trusted transactional mutation for multi-table roster saves
**What:** replace the current client-side delete/reinsert sequence with one trusted write path that updates pupils and chemistry atomically.
**When to use:** for the current `saveToSupabase()` behavior in `src/pages/PupilData.tsx`.
**Example:**
```sql
create or replace function private.save_project_roster(
  p_project_id uuid,
  p_pupils jsonb,
  p_chemistry jsonb
)
returns void
language plpgsql
security definer
set search_path = private, public
as $$
begin
  -- verify caller owns the project
  -- delete/update/insert within one transaction
end;
$$;
```

### Pattern 3: Optimizer invocation from saved state, not client payload authority
**What:** browser requests optimization for a `projectId`; trusted code loads rows from the database and constructs the optimizer payload server-side.
**When to use:** once ownership and trusted mutation boundaries exist.
**Example:**
```text
client -> request optimize(projectId)
trusted server path -> load constraints/pupils/chemistry
trusted server path -> call optimizer service
trusted server path -> persist optimization_runs
```

### Anti-Patterns to Avoid
- **App-side authorization only:** hiding data in the UI but leaving unrestricted table access underneath.
- **Delete-and-reinsert from the browser:** causes partial-failure risk and invites destructive write behavior to remain public.
- **Anonymous editing as a stopgap:** it conflicts directly with the locked Phase 1 identity decision.
- **Overbuilding full collaboration now:** Phase 1 only needs forward-compatible data shape, not full team access behavior.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Authenticated staff identity | Custom password/session system | Supabase Auth email/password | Existing platform support, less security surface |
| Row authorization | Client-side ownership checks | Postgres RLS policies | Database-enforced access is the real control plane |
| Multi-table roster save orchestration | Ad hoc chained browser writes | Transactional RPC / trusted server mutation path | Fewer partial-failure cases, easier to reason about |
| End-to-end UI security confidence | Manual click-testing only | Playwright smoke flow | Critical because Phase 1 changes login and save boundaries |

**Key insight:** the expensive part here is not CRUD plumbing, it is getting ownership and mutation boundaries correct. Standard platform primitives already exist for that. The planner should spend effort on policy shape and transaction boundaries, not on inventing custom auth or orchestration frameworks.

## Common Pitfalls

### Pitfall 1: Enabling RLS without adding ownership columns first
**What goes wrong:** policies exist, but the tables lack a stable identity link such as `owner_user_id`, so policies become awkward or incorrect.
**Why it happens:** teams try to retrofit RLS rules before shaping the relational ownership model.
**How to avoid:** add explicit ownership keys and project-scoped joins first, then write policies.
**Warning signs:** policies depend on fragile indirect joins or duplicated ownership logic per table.

### Pitfall 2: Keeping public CRUD and adding auth later
**What goes wrong:** browser code and schema both normalize unsafe access assumptions, making migration harder.
**Why it happens:** MVP shortcuts linger because they "still work."
**How to avoid:** make authenticated ownership the first non-negotiable boundary in this phase.
**Warning signs:** `anon` still has update/delete rights on project tables after Phase 1 work starts.

### Pitfall 3: Moving destructive logic server-side without making it atomic
**What goes wrong:** the save path changes location but still fails half-way through.
**Why it happens:** code is wrapped in an API endpoint but not in a real transaction boundary.
**How to avoid:** planner should require one transactional mutation path for pupil and chemistry saves.
**Warning signs:** separate delete and insert operations remain visible as independent steps.

### Pitfall 4: Designing ownership with no future team escape hatch
**What goes wrong:** single-user ownership works, but later collaboration requires a schema rewrite.
**Why it happens:** Phase 1 is scoped tightly and future shape is ignored completely.
**How to avoid:** add forward-compatible nullable `team_id` / membership join concepts or ownership abstractions now, even if only `owner_user_id` is live.
**Warning signs:** every policy and table shape assumes only one permanent user model with no extension point.

### Pitfall 5: Trusting client-assembled optimizer payloads after auth hardening
**What goes wrong:** data saves are protected, but optimization still runs on arbitrary unsaved or manipulated client state.
**Why it happens:** optimization is treated as separate from data trust.
**How to avoid:** run optimization from saved server-side state keyed by project ownership.
**Warning signs:** the browser still posts the full project payload as the source of truth.

## Code Examples

Verified patterns from official sources and adapted to this codebase:

### Authenticated password sign-in on the client
```ts
import { supabase } from "./supabase";

await supabase.auth.signInWithPassword({
  email,
  password
});
```

### Owner-scoped update policy
```sql
create policy project_constraints_update_own
on public.project_constraints
for update
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_constraints.project_id
      and (select auth.uid()) = p.owner_user_id
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_constraints.project_id
      and (select auth.uid()) = p.owner_user_id
  )
);
```

### FastAPI test entry
```python
from fastapi.testclient import TestClient
from api.optimizer import app

client = TestClient(app)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Public/anonymous CRUD for MVP tables | Auth-backed RLS with explicit role/policy rules | Established long before 2026 in Supabase best-practice docs | Phase 1 should move to database-enforced access, not UI-only checks |
| Client orchestrates destructive multi-step saves | Trusted transactional server/RPC mutation path | Longstanding standard for multi-table writes | Prevents partial data loss and reduces exposed write surface |
| Client payload treated as optimizer source of truth | Saved server-side state becomes authority | Current hardening expectation for admin tools | Aligns security and reproducibility |

**Deprecated/outdated:**
- Anonymous project editing as the normal workflow: incompatible with the Phase 1 identity decision and unsafe for roster data.
- Wildcard "just tighten policies later" thinking: the schema already grants broad CRUD, so policy work must be explicit and first-class.

## Open Questions

1. **Should the trusted mutation boundary be SQL RPC first or an Edge/server function first?**
   - What we know: the user wants the lower-effort option, and the main risky operation is the multi-table roster save.
   - What's unclear: whether future logic will quickly exceed what is comfortable in SQL.
   - Recommendation: default to SQL/RPC for the roster save unless planning reveals substantial non-DB orchestration in Phase 1.

2. **How much team scaffolding belongs in the initial schema change?**
   - What we know: single-owner access is the live behavior, but future team concepts should be anticipated.
   - What's unclear: whether Phase 1 should add only nullable `team_id` hooks or a true membership table now.
   - Recommendation: add only the minimum forward-compatible ownership hooks needed to avoid rewriting policies later.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `pytest 9.0.2` + `httpx 0.28.1`, `vitest 4.1.0`, `@playwright/test 1.58.2` |
| Config file | none - Wave 0 should add `vitest.config.ts` and Python test structure |
| Quick run command | `pytest tests/test_security_foundation.py -x` |
| Full suite command | `pytest && npx vitest run && npx playwright test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SECU-01 | Only authenticated project owners can read/update project-scoped data | integration | `pytest tests/test_security_foundation.py::test_owner_only_project_access -x` | ❌ Wave 0 |
| SECU-02 | Risky roster saves go through a trusted transactional boundary instead of public CRUD | integration | `pytest tests/test_security_foundation.py::test_transactional_roster_save -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pytest tests/test_security_foundation.py -x`
- **Per wave merge:** `pytest && npx vitest run`
- **Phase gate:** `pytest && npx vitest run && npx playwright test`

### Wave 0 Gaps
- [ ] `tests/test_security_foundation.py` - covers `SECU-01` and `SECU-02`
- [ ] `tests/conftest.py` - shared fixtures for authenticated/unauthenticated access setup
- [ ] `vitest.config.ts` - frontend test configuration
- [ ] `src/**/*.test.ts(x)` coverage for any client-side auth/mutation wrapper introduced in this phase
- [ ] `playwright.config.ts` and `tests/e2e/phase1-auth-save.spec.ts` - secured roster workflow smoke test
- [ ] Framework install: `python -m pip install pytest httpx && npm install -D vitest @testing-library/react @playwright/test`

## Sources

### Primary (HIGH confidence)
- Supabase Row Level Security docs: https://supabase.com/docs/guides/database/postgres/row-level-security - policy structure, `auth.uid()`, role scoping, RLS performance notes, security-definer guidance
- Supabase Database Functions docs: https://supabase.com/docs/guides/database/functions - SQL function / RPC patterns for trusted database-side logic
- Supabase Auth password sign-in docs: https://supabase.com/docs/reference/javascript/auth-signinwithpassword - browser auth flow for authenticated staff sign-in
- FastAPI testing docs: https://fastapi.tiangolo.com/tutorial/testing/ - `TestClient` testing approach
- Vitest guide: https://vitest.dev/guide/ - current Vite-aligned unit/integration testing guidance
- Playwright intro docs: https://playwright.dev/docs/intro - current e2e setup and runner guidance

### Secondary (MEDIUM confidence)
- Current package registry lookups on 2026-03-19 via `npm view` and `pip index versions` for the versions listed above

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - recommended pieces are either already in the repo or verified against official docs/package registries
- Architecture: HIGH - directly constrained by locked user decisions and current code shape
- Pitfalls: HIGH - strongly grounded in the existing schema/code plus official Supabase/RLS behavior

**Research date:** 2026-03-19
**Valid until:** 2026-04-18
