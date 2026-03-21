# Phase 7: Code Hardening - Research

**Researched:** 2026-03-21
**Domain:** FastAPI service hardening for Cloud Run deployment
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

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

### Deferred Ideas (OUT OF SCOPE)
- Restricting CORS to production-only or production-plus-preview Vercel origins — revisit in Phase 9 when the final frontend deployment shape is wired
- Broader cloud observability or monitoring integrations beyond moderate startup/request logging
- Async optimization/job queue behavior — explicitly deferred from the current milestone scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HARD-01 | Optimizer responds to cross-origin requests from the Vercel frontend domain with correct CORS headers | Use Starlette `CORSMiddleware`, explicit methods/headers, and origin reflection via regex so `Authorization` headers and browser preflight both work |
| HARD-02 | Cloud Run can health-check the optimizer via a dedicated GET /health endpoint | Use FastAPI lifespan-backed readiness state plus a JSON `GET /health` route that returns 200 only when env + OR-Tools readiness checks pass |
</phase_requirements>

## Summary

Phase 7 is a small but high-leverage FastAPI hardening pass, not a backend rewrite. The current optimizer already has the right long-term authenticated surface in `POST /project` and `POST /project/score`, but it still exposes a public unauthenticated `POST /` route in [api/optimizer.py](C:/Users/HP/Documents/Koding/SkoleGeni/api/optimizer.py), has no CORS middleware, has no health endpoint, and only discovers missing Supabase env vars at request time. The current Dockerfile also omits `PYTHONUNBUFFERED=1` in [docker/optimizer.Dockerfile](C:/Users/HP/Documents/Koding/SkoleGeni/docker/optimizer.Dockerfile).

The main planning constraint is CORS with bearer auth. FastAPI's CORS docs explicitly say wildcard CORS is not sufficient for credentialed requests such as `Authorization` headers, and also say `allow_origins`, `allow_methods`, and `allow_headers` cannot be `['*']` when `allow_credentials=True`. Because the user wants "any origin for now" and authenticated browser calls, the standard implementation is middleware-based origin reflection: use `allow_origin_regex=".*"` with explicit methods and explicit headers. This matches Starlette's middleware behavior: regex-matched origins are echoed back as the specific `Access-Control-Allow-Origin` value.

The health endpoint should be readiness-oriented, not cosmetic. FastAPI now recommends `lifespan` over deprecated startup/shutdown events, and the app should use that startup path to validate required env vars, confirm OR-Tools import/readiness, and store a health state on `app.state`. `GET /health` should then return `200` only when that state is ready, and `503` with structured detail otherwise. This gives Phase 8 a clean Cloud Run probe target and makes startup failures deterministic instead of latent.

**Primary recommendation:** Keep the implementation in `api/optimizer.py`, add middleware-based CORS plus lifespan-backed readiness, remove the public `POST /` route, add safe `GET /` and `GET /health`, and add one focused pytest module that exercises preflight, readiness success/failure, and route exposure.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | 0.135.1 | API surface, lifespan, route handling | Already in use; official docs recommend `lifespan` for startup/shutdown logic |
| Starlette `CORSMiddleware` | 0.52.1 | Browser CORS and preflight handling | FastAPI delegates to Starlette here; avoids fragile custom `OPTIONS` logic |
| Uvicorn | 0.42.0 | Container ASGI server | Current server in Dockerfile; standard for FastAPI |
| OR-Tools | 9.15.6755 | Solver dependency to confirm during readiness | Existing optimizer dependency and the core runtime dependency the health check must cover |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pytest | 9.0.2 | API hardening tests | For route, health, and CORS assertions |
| FastAPI `TestClient` | bundled with FastAPI 0.135.1 | In-process HTTP tests with lifespan support | Use for `OPTIONS`, `GET /health`, and route exposure tests |
| httpx | 0.28.1 | Optional request-level helpers | Only if a test needs explicit client behavior beyond `TestClient` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Starlette `CORSMiddleware` | Custom `OPTIONS` handlers | Wrong abstraction; easy to miss header rules and browser edge cases |
| FastAPI `lifespan` | Deprecated `@app.on_event("startup")` | Still works, but official docs now recommend `lifespan` |
| Keeping `POST /` behind a shared secret | Removing `POST /` entirely | Shared-secret protection adds config and test surface; remove it unless a real caller still needs it |

**Installation:**
```bash
pip install "fastapi==0.135.1" "uvicorn==0.42.0" "ortools==9.15.6755" "pytest==9.0.2" "httpx==0.28.1"
```

**Version verification:** Verified on 2026-03-21 against PyPI/PyPI JSON.
```bash
python -m pip index versions fastapi
python -m pip index versions starlette
python -m pip index versions uvicorn
python -m pip index versions ortools
python -m pip index versions pytest
python -m pip index versions httpx
```

**Verified publish dates:**
- `fastapi 0.135.1` — published 2026-03-01
- `starlette 0.52.1` — published 2026-01-18
- `uvicorn 0.42.0` — published 2026-03-16
- `ortools 9.15.6755` — published 2026-01-14
- `pytest 9.0.2` — published 2025-12-06
- `httpx 0.28.1` — published 2024-12-06

## Architecture Patterns

### Recommended Project Structure
```text
api/
├── optimizer.py           # Keep the Phase 7 changes here
├── test_optimizer.py      # Existing solver/API tests
├── test_feasibility.py    # Existing solver tests
└── test_hardening.py      # New Phase 7 route/CORS/readiness tests

docker/
└── optimizer.Dockerfile   # Runtime env and startup hardening
```

### Pattern 1: Lifespan-Backed Readiness State
**What:** Validate env and dependency readiness once at startup, store the result on `app.state`, and read that state from `/health`.
**When to use:** Startup-only checks such as required env vars and OR-Tools availability.
**Example:**
```python
# Source: https://fastapi.tiangolo.com/advanced/events/
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    missing = []
    if not (os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")):
        missing.append("SUPABASE_URL|VITE_SUPABASE_URL")
    if not (os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")):
        missing.append("SUPABASE_ANON_KEY|VITE_SUPABASE_ANON_KEY")

    app.state.health = {
        "status": "ok" if not missing else "error",
        "ortools_ready": cp_model is not None,
        "missing_env": missing,
    }
    yield

app = FastAPI(lifespan=lifespan)
```

### Pattern 2: Middleware-First CORS With Origin Reflection
**What:** Use `CORSMiddleware` instead of route-level CORS logic.
**When to use:** Any browser-facing FastAPI service that must answer preflight requests correctly.
**Example:**
```python
# Source: https://fastapi.tiangolo.com/tutorial/cors/
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)
```

**Planning note:** The explicit `allow_methods` and `allow_headers` requirement is HIGH confidence from FastAPI docs. Using `allow_origin_regex=".*"` to satisfy "any origin for now" is a reasoned recommendation verified against the installed Starlette middleware implementation, which reflects regex-matched origins back explicitly.

### Pattern 3: Narrow Public Route Surface
**What:** Public routes should be informational (`GET /`, `GET /health`) and optimization routes should stay authenticated.
**When to use:** Cloud-exposed services where unauthenticated compute endpoints are not acceptable.
**Example:**
```python
@app.get("/")
def root():
    return {"service": "optimizer", "status": "ready", "docs": "Use POST /project with bearer auth."}

@app.get("/health")
def health():
    payload = app.state.health
    if payload["status"] != "ok":
        raise HTTPException(status_code=503, detail=payload)
    return payload
```

### Anti-Patterns to Avoid
- **Custom preflight route handling:** Let middleware intercept `OPTIONS`; do not build manual header logic.
- **Request-time env validation only:** Missing Supabase config should be visible at startup and in `/health`, not only after a user request fails.
- **`GET /health` always returning 200:** That hides bad startup state from Cloud Run and from smoke tests.
- **Leaving `POST /` public because tests use it:** Update tests; don't preserve a cloud-exposed endpoint for test convenience.
- **Hardcoding Docker behavior around local assumptions:** Cloud Run injects `PORT`; if Phase 7 does not adopt it, Phase 8 must explicitly deploy the service on port `8000`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Browser CORS | Manual `OPTIONS` route logic | Starlette `CORSMiddleware` | Browser CORS rules are easy to get subtly wrong |
| Startup readiness | Ad hoc globals or first-request initialization | FastAPI `lifespan` + `app.state` | Deterministic startup behavior and clean testability |
| Health checks | Shelling out or fake "ok" responses | JSON `GET /health` backed by real readiness state | Cloud deployment needs a real readiness signal |
| Public endpoint protection | Hidden conventions or "nobody will call it" | Remove `POST /` or gate it explicitly | Cloud-exposed compute routes get discovered |
| Unbuffered logging | Custom flush wrappers on every log call | `PYTHONUNBUFFERED=1` or `python -u` | Standard Python behavior already solves it |

**Key insight:** This phase is mostly about using the framework and platform correctly. Hand-rolled substitutes are more likely to create cloud-only bugs than to add value.

## Common Pitfalls

### Pitfall 1: Credentialed CORS With Wildcards
**What goes wrong:** Browser preflight or actual requests fail even though curl appears fine.
**Why it happens:** FastAPI docs explicitly say wildcard CORS is not enough for credentialed communication like `Authorization` headers, and `allow_origins`, `allow_methods`, and `allow_headers` cannot be `['*']` with `allow_credentials=True`.
**How to avoid:** Use explicit methods and headers. For the temporary "any origin" requirement, reflect origins via `allow_origin_regex=".*"`.
**Warning signs:** Browser console CORS errors, missing `Access-Control-Allow-Origin`, or missing `Access-Control-Allow-Headers` on `OPTIONS`.

### Pitfall 2: Lifespan Never Runs in Tests
**What goes wrong:** `/health` tests pass or fail for the wrong reason because startup state was never initialized.
**Why it happens:** FastAPI lifespan logic runs when `TestClient` is used as a context manager.
**How to avoid:** Write tests as `with TestClient(app) as client: ...`.
**Warning signs:** `app.state` missing attributes, health route behavior differing between tests and real runtime.

### Pitfall 3: Health Endpoint Becomes a Liveness Ping
**What goes wrong:** Cloud smoke tests return 200 even though Supabase config is missing or startup is incomplete.
**Why it happens:** Teams often return a constant `{ "status": "ok" }`.
**How to avoid:** Include `ortools_ready`, env validation, and failure detail in the response contract.
**Warning signs:** Local startup logs mention missing env vars but `/health` still returns 200.

### Pitfall 4: Route Hardening Breaks Existing Tests or Callers
**What goes wrong:** Removing `POST /` breaks tests that still post there.
**Why it happens:** Existing API tests currently hit `/`, and older integration assumptions still mention the public root endpoint.
**How to avoid:** Add a Phase 7-specific test module and update or replace old tests that depend on the unauthenticated root route.
**Warning signs:** Failing tests in `api/test_optimizer.py` after route removal.

### Pitfall 5: Dockerfile Is "Cloud Ready" Except for Port Handling
**What goes wrong:** The image works locally but Cloud Run traffic fails if deployment assumes the default port.
**Why it happens:** Current Dockerfile hardcodes `--port 8000`, while Cloud Run sends traffic to the configured container port and injects `PORT`.
**How to avoid:** Prefer honoring `PORT` in the container now, or make Phase 8 explicitly configure the service port to `8000`.
**Warning signs:** Service starts successfully but never receives traffic in Cloud Run.

## Code Examples

Verified patterns from official sources:

### CORS Middleware
```python
# Source: https://fastapi.tiangolo.com/tutorial/cors/
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    max_age=600,
)
```

### Lifespan Test Pattern
```python
# Source: https://fastapi.tiangolo.com/advanced/testing-events/
from fastapi.testclient import TestClient

def test_health_ready():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
```

### Unbuffered Python Runtime
```dockerfile
# Source: https://docs.python.org/3/using/cmdline.html
ENV PYTHONUNBUFFERED=1
CMD ["python", "-m", "uvicorn", "api.optimizer:app", "--host", "0.0.0.0", "--port", "8000"]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@app.on_event("startup")` / `@app.on_event("shutdown")` | `FastAPI(lifespan=...)` | Current FastAPI docs recommend `lifespan` | New readiness work should use lifespan, not deprecated events |
| Public compute route at `POST /` | Authenticated project routes plus safe public `GET` endpoints | Current milestone decision | Reduces accidental public attack surface |
| Buffered Python stdout/stderr in containers | `PYTHONUNBUFFERED=1` or `-u` | Long-standing Python runtime standard; still current | Cloud logs appear promptly during startup and failures |

**Deprecated/outdated:**
- Bare liveness-only health endpoint: not sufficient for this phase because the user explicitly wants readiness semantics.
- Wildcard CORS with bearer auth: not valid for the target browser flow.

## Open Questions

1. **Should `POST /` be removed or protected?**
   - What we know: The frontend in [src/lib/api.ts](C:/Users/HP/Documents/Koding/SkoleGeni/src/lib/api.ts) already uses `POST /project`, not `POST /`.
   - What's unclear: Whether any local tooling still depends on `POST /`.
   - Recommendation: Remove `POST /` unless a real caller is identified. It is simpler and safer than adding a shared secret path.

2. **Should Phase 7 also make Uvicorn honor Cloud Run's `PORT` env var?**
   - What we know: Cloud Run requires the ingress container to listen on `0.0.0.0` and sends traffic to the configured port; by default that is `8080`, and Cloud Run injects `PORT`.
   - What's unclear: Whether Phase 8 will explicitly set the container port to `8000`.
   - Recommendation: If touching the Dockerfile anyway, adopt `PORT` in Phase 7. If not, Phase 8 must explicitly configure port `8000` and treat that as a hard dependency.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 9.0.2 + FastAPI `TestClient` |
| Config file | none |
| Quick run command | `pytest api/test_hardening.py -q` |
| Full suite command | `pytest api -q && npm run test && npm run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HARD-01 | `OPTIONS` preflight from an arbitrary origin returns the expected CORS headers and an authenticated `POST /project` response includes CORS headers | integration | `pytest api/test_hardening.py -q -k cors` | ❌ Wave 0 |
| HARD-02 | `GET /health` returns `200` with JSON only when env + OR-Tools readiness checks pass, and returns non-200 with missing-env detail otherwise | integration | `pytest api/test_hardening.py -q -k health` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pytest api/test_hardening.py -q`
- **Per wave merge:** `pytest api -q`
- **Phase gate:** `pytest api -q && npm run test`

### Wave 0 Gaps
- [ ] `api/test_hardening.py` — add CORS preflight, simple-request CORS, `/health`, safe `GET /`, and `POST /` exposure tests
- [ ] Dockerfile verification test or assertion path — confirm `PYTHONUNBUFFERED=1` is enforced

## Sources

### Primary (HIGH confidence)
- FastAPI CORS docs: https://fastapi.tiangolo.com/tutorial/cors/ - credentialed CORS rules, preflight behavior, supported middleware arguments
- FastAPI lifespan docs: https://fastapi.tiangolo.com/advanced/events/ - `lifespan` recommended over startup/shutdown events
- FastAPI lifespan testing docs: https://fastapi.tiangolo.com/advanced/testing-events/ - `TestClient` context-manager pattern for lifespan
- Google Cloud Run container contract: https://cloud.google.com/run/docs/container-contract - ingress container must listen on `0.0.0.0`; Cloud Run injects `PORT`
- Google Cloud Run health checks: https://cloud.google.com/run/docs/configuring/healthchecks - startup/readiness/liveness probe semantics
- Python command line/environment docs: https://docs.python.org/3/using/cmdline.html - `PYTHONUNBUFFERED` is equivalent to `-u`
- PyPI package metadata:
  - https://pypi.org/pypi/fastapi/json
  - https://pypi.org/pypi/starlette/json
  - https://pypi.org/pypi/uvicorn/json
  - https://pypi.org/pypi/ortools/json
  - https://pypi.org/pypi/pytest/json
  - https://pypi.org/pypi/httpx/json

### Secondary (MEDIUM confidence)
- Installed Starlette `CORSMiddleware` source inspected locally on 2026-03-21 - confirms regex-matched origins are reflected explicitly, which makes the temporary any-origin + bearer-auth plan technically viable

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing repo stack plus official FastAPI/Cloud Run/Python docs and verified current package versions
- Architecture: HIGH - directly grounded in official FastAPI and Cloud Run behavior, plus code inspection of the current service
- Pitfalls: HIGH - mostly derived from official docs and the current code's actual gaps

**Research date:** 2026-03-21
**Valid until:** 2026-04-20
