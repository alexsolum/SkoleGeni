# Phase 7: Code Hardening - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase makes the existing FastAPI optimizer container safe and deployable on Cloud Run. It covers the service boundary and runtime hardening needed before any cloud deployment: cross-origin access, health/readiness signaling, public endpoint exposure, and container runtime behavior. It does not add new product capabilities or frontend behavior.

</domain>

<decisions>
## Implementation Decisions

### CORS policy
- Allow any origin in Phase 7 rather than restricting to a production-only allowlist yet.
- Allow authenticated cross-origin requests so browser calls with `Authorization: Bearer ...` work against the cloud optimizer.
- Use a broader allowed-method set rather than limiting CORS to only the currently known methods.
- Use a permissive allowed-header policy rather than a minimal `Authorization`/`Content-Type` list.

### Health endpoint contract
- `GET /health` should act as a readiness check, not a bare liveness probe.
- `/health` must explicitly confirm that OR-Tools is ready before returning HTTP 200.
- `/health` should return a slightly richer JSON body than a bare `{ "status": "ok" }` response.
- Missing required runtime env vars for authenticated project optimization should make `/health` return non-200 and include detail about which values are missing.

### Runtime and request posture
- Missing required env vars should fail the container fast at startup rather than only surfacing through request-time errors.
- Use moderate logging: a clear startup summary plus normal request/error logging, without noisy verbose diagnostics.
- Add a small safe `GET /` response for accidental browser or platform hits rather than leaving the root path undefined.

### Claude's Discretion
- Exact response shape for `/health`, as long as it stays readiness-oriented and includes missing-env detail on failure.
- Exact CORS middleware parameter values for the "broad" and "permissive" posture selected above.
- Whether `POST /` is removed outright or otherwise handled during implementation, provided it is no longer a public unauthenticated optimization entry point.
- How to verify or document `PYTHONUNBUFFERED=1` beyond setting it correctly in the Docker image.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and roadmap
- `.planning/PROJECT.md` — Milestone goal, cloud deployment intent, and project-level decisions for Cloud Run auth and Supabase token forwarding
- `.planning/REQUIREMENTS.md` — Phase-linked requirements `HARD-01` and `HARD-02`, plus out-of-scope guardrails for Cloud Run IAM auth
- `.planning/ROADMAP.md` — Phase 7 goal, success criteria, and the requirement that the direct `POST /` endpoint be removed or protected
- `.planning/STATE.md` — Current milestone context, including the open concern about the unauthenticated direct optimize endpoint

### Existing optimizer service
- `api/optimizer.py` — Current FastAPI app, authenticated `/project` routes, public `POST /`, and current env handling behavior
- `docker/optimizer.Dockerfile` — Current container startup command and the missing `PYTHONUNBUFFERED=1` hardening item
- `src/lib/api.ts` — Current frontend optimizer client shape, authenticated `/project` calls, and expected browser request headers

### Codebase guidance
- `.planning/codebase/STACK.md` — Current runtime/deployment stack context for FastAPI, uvicorn, Python 3.12, and Vercel/frontend integration
- `.planning/codebase/INTEGRATIONS.md` — Existing optimizer integration assumptions, including the historical unauthenticated API surface
- `.planning/codebase/CONVENTIONS.md` — Existing backend/frontend coding conventions to preserve while hardening the service

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api/optimizer.py`: already contains the main FastAPI app plus authenticated `POST /project` and `POST /project/score` routes that can remain the supported public API surface.
- `src/lib/api.ts`: already routes browser optimization through `/project` with a bearer token, which means CORS and auth-header handling must support that exact flow.

### Established Patterns
- The optimizer currently loads OR-Tools at module import time, so readiness can rely on explicit dependency confirmation during app startup/health handling.
- Runtime env validation is currently request-driven inside `_supabase_url()` and `_supabase_anon_key()` call sites; Phase 7 will tighten that posture.
- The frontend/browser path already assumes token-based authorization headers rather than cookie auth, so cross-origin header handling matters more than cookie credentials.

### Integration Points
- `api/optimizer.py` is the integration point for adding CORS middleware, startup validation, `GET /health`, and safe root-path behavior.
- `docker/optimizer.Dockerfile` is the integration point for unbuffered Python logging behavior in Cloud Run.
- Future Cloud Run deployment and frontend wiring phases depend on the hardened route surface and readiness semantics established here.

</code_context>

<specifics>
## Specific Ideas

- Allow permissive CORS in Phase 7 to avoid blocking early cloud smoke testing, and tighten origins later if Phase 9 needs a stricter production/preview policy.
- Health should communicate missing env configuration clearly enough that Cloud Run and manual smoke tests can distinguish "container booted" from "optimizer is truly ready."
- The direct root path should be safe for accidental hits while no longer serving as an unauthenticated optimization API.

</specifics>

<deferred>
## Deferred Ideas

- Restricting CORS to production-only or production-plus-preview Vercel origins — revisit in Phase 9 when the final frontend deployment shape is wired
- Broader cloud observability or monitoring integrations beyond moderate startup/request logging
- Async optimization/job queue behavior — explicitly deferred from the current milestone scope

</deferred>

---

*Phase: 07-code-hardening*
*Context gathered: 2026-03-21*
