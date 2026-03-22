# Phase 9: Frontend Wiring - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Point the Vercel-hosted frontend at the Cloud Run optimizer by setting the `VITE_OPTIMIZER_URL` environment variable in Vercel, then validate end-to-end that a logged-in user can run optimization without errors. No new product features — only the connection, env config, and error handling needed to make the cloud optimizer the live target.

</domain>

<decisions>
## Implementation Decisions

### CORS policy
- Keep the current permissive `allow_origin_regex='.*'` setting on Cloud Run — no change needed.
- Rationale: the optimizer already requires a valid Supabase auth token for all meaningful requests. CORS is not the real security gate here; auth is. Maintaining an origin allowlist adds friction with no meaningful security benefit for this low-traffic school tool.

### Vercel environment configuration
- Set `VITE_OPTIMIZER_URL` to the Cloud Run URL (`https://optimizer-ek4bkd34ja-ew.a.run.app`) for **all** Vercel environments — production and preview.
- Preview deployments should be able to call the real Cloud Run optimizer so QA and testing on preview branches work with real optimization.
- No Vercel rewrite proxy needed — the frontend calls Cloud Run directly via the env var.

### End-to-end validation
- Manual browser smoke test against the live Vercel production URL.
- Steps: log in as a real user, open an existing project, run optimization, confirm a result is returned without errors in the UI and without CORS or auth errors in the browser console.
- Also verify via the browser Network tab that the optimization request goes to the Cloud Run URL (not localhost or `/api/optimizer`).
- A full optimization run (not just a health check) is required — this proves auth token forwarding, CORS, and the optimizer all work together.

### Claude's Discretion
- Whether to also update `.env.example` to reflect the Cloud Run URL as the recommended production value.
- Order of steps in the plan (set env var first vs code cleanup first).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Frontend wiring
- `src/lib/api.ts` — `getOptimizerBaseUrl()` reads `VITE_OPTIMIZER_URL`; `optimizeProject()` and `scoreProjectAssignment()` are the two functions that call Cloud Run. The env var fallback is `/api/optimizer`.
- `.env.example` — Documents the expected env vars including `VITE_OPTIMIZER_URL`.

### Roadmap and requirements
- `.planning/ROADMAP.md` — Phase 9 goal and success criteria (WIRE-01, WIRE-02)
- `.planning/REQUIREMENTS.md` — Requirements WIRE-01 (frontend calls Cloud Run) and WIRE-02 (Supabase auth tokens forwarded end-to-end with RLS preserved)
- `.planning/STATE.md` — Accumulated context including: Cloud Run URL is `https://optimizer-ek4bkd34ja-ew.a.run.app`, `--allow-unauthenticated` is locked, Supabase `anon` key is used (not `service_role`)

### Prior phase decisions
- `.planning/phases/07-code-hardening/07-CONTEXT.md` — CORS was explicitly left permissive in Phase 7 pending Phase 9 decision (now resolved: stay permissive)
- `.planning/phases/08-gcp-setup-and-manual-deploy/08-CONTEXT.md` — Cloud Run deployment details, region (`europe-west1`), memory, timeout, and env var injection approach

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/api.ts`: `getOptimizerBaseUrl()` already reads `VITE_OPTIMIZER_URL` — no code change needed to support Cloud Run. Setting the env var in Vercel is sufficient.
- `src/pages/PupilData.tsx`: handles `OptimizerRequestError` for `status === 400` (infeasibility). This is the call site that also needs any 401 handling if added.

### Established Patterns
- Auth token forwarding is already implemented: `getAuthHeaders()` in `api.ts` reads the Supabase session and attaches `Authorization: Bearer <token>` to all optimizer requests.
- Error handling uses `OptimizerRequestError` (typed with `status` and optional `diagnostic`) — any 401 handling should follow this same pattern.

### Integration Points
- Vercel project settings (not code): `VITE_OPTIMIZER_URL` must be set in the Vercel dashboard under Environment Variables for Production and Preview.
- `vercel.json`: currently only configures Python function exclusions — no proxy/rewrite rules exist for the optimizer. None needed with the direct Cloud Run approach.

</code_context>

<specifics>
## Specific Ideas

- No specific UI or interaction references given — standard approach for env var config and smoke testing is fine.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 09-frontend-wiring*
*Context gathered: 2026-03-22*
