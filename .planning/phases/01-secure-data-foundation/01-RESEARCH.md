# Phase 1 Research: Secure Data Foundation

## Objective

Research how to harden the current SkoleGeni MVP foundation without turning Phase 1 into a full architecture rewrite. The phase must address `SECU-01` and `SECU-02` while respecting the user decisions captured in `01-CONTEXT.md`.

## Key Findings

### 1. Direct browser reads can stay, but only with real ownership-aware RLS

- The current browser-to-Supabase pattern is acceptable for reads only if Row Level Security is enabled and tied to authenticated ownership rules.
- The MVP currently disables RLS on all public tables and grants broad CRUD to `anon` and `authenticated`, which is incompatible with the Phase 1 access goal.
- A pragmatic Phase 1 path is:
  - add authenticated ownership to projects
  - enable RLS on all project-scoped tables
  - define policies so a user can only read/write rows that belong to their projects

### 2. Multi-step save flows should move server-side before finer-grained UX refactors

- The destructive save path in `src/pages/PupilData.tsx` currently deletes all pupils and chemistry links, then reinserts them.
- This creates partial-failure risk and makes the browser responsible for a multi-step transactional write it cannot guarantee safely.
- The best low-friction Phase 1 change is to move this specific operation behind a trusted server-side boundary:
  - Edge Function, backend endpoint, or equivalent trusted mutation path
  - validate payload
  - apply changes transactionally
  - return a success/failure result to the client

### 3. Ownership should be single-user now, but schema should anticipate future collaboration

- The user decision is explicit: one authenticated staff owner per project in Phase 1.
- The schema should still avoid painting the system into a corner.
- A practical approach is:
  - add `owner_user_id` to `projects`
  - keep policies owner-based now
  - leave room for future project membership or team tables later

### 4. Optimizer execution should trust persisted project state, not client-assembled authority

- The user wants optimizer execution to run from saved server-side project state.
- That means the authoritative source for a run should be persisted project data, not a large client payload that can diverge from storage.
- Phase 1 does not need a full optimization redesign, but it should set up the boundary so later phases can call the optimizer from trusted saved state.

### 5. Secrets and local defaults need cleanup, not perfection

- `docker-compose.yml` contains committed local JWT-style values and permissive local defaults.
- Since the user chose lower implementation effort when tradeoffs exist, the phase should focus on:
  - removing obviously unsafe committed defaults from production-facing paths
  - clarifying local-only credentials in docs and env files
  - making missing envs fail more explicitly where appropriate
- Full secret-management maturity can evolve later.

## Recommended Plan Shape

### Plan A: Ownership and RLS Foundation

- Add authenticated ownership to project records.
- Enable RLS and write owner-based policies across project-scoped tables.
- Remove or sharply narrow the current public CRUD grants.

### Plan B: Safe Mutation Boundary

- Replace the destructive pupil/chemistry save flow with a trusted server-side mutation.
- Ensure the operation updates related records atomically or as close to transactionally as the chosen boundary allows.
- Keep the browser client for reads and low-risk writes.

### Plan C: Environment and Credential Cleanup

- Remove or isolate unsafe credential defaults.
- Update env examples/docs so local and deployed behavior are explicit.
- Make it harder to run against accidental empty or unsafe configuration.

## Constraints For Planning

- Do not expand into full collaboration features.
- Do not move the whole app behind a backend abstraction in this phase.
- Do not redesign the optimizer itself beyond establishing safer invocation boundaries.
- Preserve the current product flow while strengthening the foundation underneath it.

## Validation Architecture

### What must be validated

- Only the owning authenticated user can access project-scoped data.
- Anonymous usage cannot reach app data flows after Phase 1 changes.
- Replacing the destructive save path does not regress ordinary pupil/chemistry editing.
- The chosen mutation boundary can be exercised in local development.

### Recommended verification surfaces

- SQL/policy checks for access rules
- integration-style tests around the new save path
- a targeted end-to-end smoke path for login -> open project -> save pupil data successfully

## Planning Implication

The phase should likely produce 3 plans:
1. schema/auth/RLS hardening
2. trusted mutation path for risky saves
3. env/default cleanup plus validation coverage
