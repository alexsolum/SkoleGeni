# Pitfalls Research

**Domain:** Cloud Run deployment — FastAPI + OR-Tools optimizer, cross-origin (Vercel frontend)
**Researched:** 2026-03-21
**Confidence:** HIGH (Google official docs + FastAPI official docs verified; Cloud Run-specific CORS limitation confirmed via issue tracker)

---

## Critical Pitfalls

### Pitfall 1: IAM-level auth blocks CORS preflight OPTIONS requests

**What goes wrong:**
If you enable Cloud Run IAM authentication ("require authentication"), the platform rejects all unauthenticated requests at the infrastructure level before your FastAPI application code runs. Browser CORS preflight requests are `OPTIONS` requests with no `Authorization` header — they are intentionally unauthenticated. The result: every preflight from the Vercel frontend returns HTTP 403, blocking all cross-origin optimizer calls.

**Why it happens:**
Developers assume application-level `CORSMiddleware` handles preflight. It does — but only if the request reaches the application. Cloud Run's IAM layer intercepts before the container receives the packet.

**How to avoid:**
Deploy the optimizer service as **publicly invokable** (`--allow-unauthenticated`) and protect it at the application layer instead:

- Use `CORSMiddleware` in FastAPI with an explicit `allow_origins` list (never `"*"` in production — enumerate the exact Vercel domain: `https://your-app.vercel.app`).
- Validate the Supabase `Authorization: Bearer <jwt>` header inside each FastAPI endpoint (already done in `_load_project_optimize_request`).
- If deeper network isolation is needed later, use an authenticated Cloud Run proxy or API Gateway in front — but that is a future concern, not MVP.

**Warning signs:**
- All optimizer requests fail immediately with HTTP 403 without reaching FastAPI logs.
- Chrome DevTools shows the failing request as `OPTIONS` with no response body.
- `curl -X OPTIONS https://<cloudrun-url>/project` returns 403.

**Phase to address:** Container deploy phase — configure IAM policy at deploy time before any frontend wiring.

---

### Pitfall 2: `CORSMiddleware` added but `allow_headers` omits `Authorization`

**What goes wrong:**
Even with IAM public access correct, CORSMiddleware that does not explicitly list `Authorization` in `allow_headers` will cause the browser to block the actual POST request (not just preflight). The `Authorization` header triggers a non-simple request, requiring explicit allow-listing.

**Why it happens:**
FastAPI's CORSMiddleware defaults to `allow_headers=["*"]` only when you pass `allow_headers=["*"]`. Many tutorials use a permissive wildcard that works in dev but gets tightened in production, silently dropping `Authorization`.

**How to avoid:**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-app.vercel.app"],
    allow_credentials=True,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
```
Do not use `allow_origins=["*"]` together with `allow_credentials=True` — browsers reject that combination.

**Warning signs:**
- Preflight returns 200 but the actual POST returns a CORS error in the browser console.
- The error message mentions `Authorization` header not allowed.
- The network panel shows the OPTIONS preflight succeeds but no `Access-Control-Allow-Headers: Authorization` is present in the response.

**Phase to address:** Container deploy phase — add middleware before wiring the frontend.

---

### Pitfall 3: Cloud Run request timeout shorter than the CP-SAT solver budget

**What goes wrong:**
The optimizer sets `solver.parameters.max_time_in_seconds = 8.0` per `k` value, but iterates across `k_options` (potentially many class counts). For a school with 120 pupils and a wide class-size range, the solver may run for 30–60 seconds total. Cloud Run's **default request timeout is 300 seconds** (5 minutes), which is sufficient — but only if explicitly confirmed. If someone deploys with the CLI default and later tightens it, or if a large dataset causes solver iteration to exceed the threshold, Cloud Run kills the connection mid-solve and returns a 504 to the browser.

Additionally: if the CP-SAT solver is still running when Cloud Run's timeout fires, it returns a hard kill with no structured error response. The frontend will see a network-level timeout, not the expected JSON error structure.

**Why it happens:**
The default Cloud Run timeout (300s) is not always verified during deployment. Developers assume "it'll be fine" until a real school-sized dataset causes a solve that takes 45+ seconds.

**How to avoid:**
- Set Cloud Run `--timeout=3600` explicitly at deploy time (maximum allowed is 3600 seconds).
- Keep the per-`k` solver budget at 8 seconds (already done), but add a total-solve-time guard: record wall-clock time at the start of `_optimize_request` and break the `k_options` loop early if remaining time is less than 10 seconds.
- Return a structured 408 / 503 with a user-readable message rather than letting the Cloud Run kill produce a network error.

**Warning signs:**
- Optimization works on small test datasets but fails on full school imports (~100+ pupils).
- Cloud Run logs show requests terminating with "Request was killed" rather than a handler exception.
- Frontend shows a generic network error instead of the optimizer's infeasibility JSON.

**Phase to address:** Container deploy phase — set `--timeout=3600` at deploy time. Add solver wall-clock guard in a subsequent optimization-reliability phase if needed.

---

### Pitfall 4: OR-Tools cold start adds 4–8 seconds of import latency

**What goes wrong:**
`from ortools.sat.python import cp_model` at module import time contributes meaningfully to container cold start. OR-Tools wheels are ~22–30 MB. The python:3.12-slim base image with OR-Tools installed will cold-start in approximately 4–10 seconds under Cloud Run, depending on CPU allocation at startup. Users who click "Run Optimizer" after the container has scaled to zero wait that long before the request even begins processing.

**Why it happens:**
Cloud Run scales to zero by default. The OR-Tools import is unavoidably slow on first import. The current Dockerfile does not pre-warm or use startup CPU boost.

**How to avoid:**
- Set `--min-instances=1` so the container stays warm. For a low-traffic school tool this is cost-effective (one always-warm instance costs ~$7–15/month at minimum Cloud Run pricing).
- Enable Cloud Run startup CPU boost: `--cpu-boost` flag allocates extra CPU during container startup, reducing cold start from ~8s to ~3s.
- Keep the `python:3.12-slim` base — do not switch to Alpine. Alpine requires musl libc and OR-Tools wheels are compiled against glibc; using Alpine forces a from-source build that takes significantly longer.

**Warning signs:**
- First optimizer call after a period of inactivity takes 5–12 seconds before the actual solve starts.
- Cloud Run logs show startup time above 3 seconds.
- The "Optimizing..." spinner on the frontend appears to hang before any response headers arrive.

**Phase to address:** Container deploy phase — set `--min-instances=1` at deploy time. CPU boost is a deploy-time flag.

---

### Pitfall 5: OR-Tools CP-SAT solver exceeds Cloud Run memory limit and gets OOM-killed

**What goes wrong:**
Cloud Run's default memory limit is **512 MiB**. OR-Tools CP-SAT with a large, heavily-constrained model (many pupils, strict priorities on all dimensions, many chemistry pairs) can consume 200–400 MB during solve. Add the base Python process (~100 MB), FastAPI/uvicorn (~60 MB), and OR-Tools import footprint (~80 MB), and the container approaches or exceeds 512 MiB. Cloud Run sends SIGKILL with no warning — the request dies mid-solve, logs show nothing from the application, and the user sees a network error.

**Why it happens:**
The default 512 MiB limit is often not reviewed. Developers test with small datasets (20 pupils) where memory is fine, then deploy to production where a 150-pupil school with strict gender + origin + location + needs constraints builds a CP-SAT model with thousands of boolean variables.

**How to avoid:**
- Deploy with `--memory=1Gi` as the baseline. This provides headroom without being wasteful.
- Set `solver.parameters.num_search_workers = 1` (already done in the current code) — multiple workers multiply memory consumption.
- Monitor Cloud Run's memory utilization metric after the first real-school dataset runs. If usage stays below 400 MiB at 1 Gi, it can be reduced.

**Warning signs:**
- Container exits with exit code 137 (SIGKILL) — visible in Cloud Run logs under "Container instance killed".
- Requests to `/project` fail with no application-level error, no stack trace, no JSON response.
- Problem correlates with larger pupil sets or more strict constraint combinations.

**Phase to address:** Container deploy phase — set `--memory=1Gi` at deploy time.

---

### Pitfall 6: Missing `/health` endpoint causes Cloud Run startup probe failures

**What goes wrong:**
Without a health check endpoint, Cloud Run uses basic TCP port availability as its readiness signal. The container is marked ready and starts receiving traffic the moment uvicorn binds to port 8000 — before OR-Tools has finished its first import. The first real request can arrive during module initialization and gets an HTTP 500 or a connection reset.

More critically: if you add startup or readiness probes later (as a health feature), they will fail unless the endpoint exists, causing Cloud Run to never route traffic to the instance.

**Why it happens:**
The current `optimizer.py` has no `GET /health` endpoint. It is never needed locally. Cloud Run deployments work with TCP probes initially, masking the gap.

**How to avoid:**
Add a minimal health endpoint before deploying:
```python
@app.get("/health")
def health():
    return {"status": "ok"}
```
Then configure Cloud Run startup probe pointing at `/health` with an appropriate `initialDelaySeconds` (15 seconds to allow OR-Tools import). This prevents traffic routing to an instance that is still initializing.

**Warning signs:**
- First requests to a freshly-started instance return 500 or connection resets intermittently.
- Cloud Run startup logs show the container taking over 5 seconds to accept the first request.
- Adding health probes after the fact causes the service to become unreachable (probe fails → no instances healthy → 503 on all requests).

**Phase to address:** Container deploy phase — add the endpoint before building the Cloud Run image.

---

### Pitfall 7: Supabase auth header not forwarded from Vercel frontend

**What goes wrong:**
The `/project` and `/project/score` endpoints require an `Authorization: Bearer <jwt>` header. If the Vercel frontend makes the request without explicitly forwarding the user's Supabase session token, the optimizer returns HTTP 401 or makes downstream Supabase calls with no auth context, causing either a 401 from the optimizer or a 403 from Supabase RLS.

**Why it happens:**
Frontend HTTP clients (fetch, axios) do not automatically forward auth headers to cross-origin endpoints. The Supabase client stores the JWT in `localStorage` or a cookie scoped to the Vercel domain — it is not automatically attached to requests to a different origin.

**How to avoid:**
In the frontend fetch call, explicitly read the session and attach the header:
```typescript
const { data: { session } } = await supabase.auth.getSession();
const response = await fetch(OPTIMIZER_URL + "/project", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session?.access_token}`,
  },
  body: JSON.stringify({ projectId }),
});
```
Never rely on automatic cookie forwarding for cross-origin requests — cookies are not sent cross-origin without `credentials: "include"` and the server's explicit `Access-Control-Allow-Credentials: true`, which requires `allow_origins` to be specific (not `*`).

**Warning signs:**
- Optimizer calls return 401 with message "Missing Authorization header."
- The Supabase auth check inside `_load_project_optimize_request` returns an invalid session.
- The bug only manifests on the deployed Vercel frontend, not locally (where the optimizer may be configured differently).

**Phase to address:** Frontend wiring phase — the auth header attachment must be part of the initial frontend-to-Cloud-Run integration.

---

### Pitfall 8: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` baked into Docker image

**What goes wrong:**
The optimizer already reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as fallbacks (see `_supabase_url()` and `_supabase_anon_key()`). If someone hardcodes these values as `ENV` instructions in the Dockerfile, or passes them as Docker build `--build-arg`, they become permanently embedded in the image layers and are visible to anyone with image pull access. Cloud artifact registries are not always private.

**Why it happens:**
Local `.env` files contain the `VITE_*` variables for the frontend. Developers copy the same `.env` file pattern into the Docker build context without realizing these are now server-side secrets.

**How to avoid:**
- Never use `ENV` or `ARG` in the Dockerfile for Supabase credentials.
- At deployment time, inject the values via Cloud Run environment variables:
  ```
  gcloud run deploy optimizer \
    --set-env-vars SUPABASE_URL=https://...,SUPABASE_ANON_KEY=...
  ```
- For production, store values in Google Secret Manager and reference them:
  ```
  --set-secrets SUPABASE_URL=supabase-url:latest,SUPABASE_ANON_KEY=supabase-anon-key:latest
  ```
- Add `*.env` to `.dockerignore` to prevent accidental COPY.

**Warning signs:**
- `docker inspect <image>` or `docker history <image>` reveals environment variable values.
- The `.env` file appears in `docker build` context (no `.dockerignore` present).
- Cloud Run service config page shows credential values in plain text (rather than secret refs).

**Phase to address:** Container deploy phase — `.dockerignore` and secret injection must be in place before pushing the image.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `allow_origins=["*"]` in CORSMiddleware | Works immediately in dev | Allows any origin to call the optimizer; cannot use `allow_credentials=True` | Never in production |
| Hardcoding `SUPABASE_URL` in `optimizer.py` | No env var setup required | Credentials visible in source control; cannot rotate without rebuild | Never |
| Single uvicorn worker (`CMD ["python", "-m", "uvicorn", ...]`) | Simple Dockerfile | Cannot handle concurrent requests; second optimization request during a solve blocks until first finishes | Acceptable for MVP given low concurrency; revisit if concurrent users increase |
| No `--min-instances=1` to save cost | Zero cost when idle | Cold start on every session start; poor UX for a tool used in short bursts | Acceptable as a cost trade-off if cold starts are acceptable to users |
| Pinned `ortools` without version in `requirements.txt` | Always pulls latest | OR-Tools has had breaking API changes between minor versions; a silent upgrade can break the solver | Never in production; pin to a specific version |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Vercel → Cloud Run | Hardcoding Cloud Run URL with trailing slash (`https://optimizer-xxx.run.app/`) while FastAPI routes expect no trailing slash | Store the base URL without trailing slash; append paths explicitly (`/project`, `/project/score`) |
| Vercel → Cloud Run | Using `fetch` without explicit `mode: "cors"` — some older browser environments default to `no-cors` and silently discard the response | Always set `mode: "cors"` on cross-origin fetch calls |
| FastAPI CORSMiddleware | Placing `add_middleware` call after route registration — Starlette processes middleware in registration order and CORS must wrap the router | Always add CORSMiddleware before defining routes |
| Cloud Run → Supabase | Using `_fetch_json` with the 10-second `urlopen` timeout (already in code) — Supabase cold path may take 3–5 seconds, risking timeout on first call after Supabase idle | Keep the 10-second timeout; monitor for 502 errors from `_fetch_json` in production logs |
| Cloud Run environment | Setting `OPTIMIZER_URL` on the Vercel side to `http://` (not `https://`) — Cloud Run only serves HTTPS | Always configure the Vercel env var with `https://` |
| Cloud Run environment | Missing `SUPABASE_URL` / `SUPABASE_ANON_KEY` env vars at runtime — the service starts but returns 500 on every `/project` call | Verify env vars are set before deploying; add a startup log line that prints whether the vars are present (not their values) |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Scale-to-zero with no min instances | Each session start requires a cold start; optimizer appears to hang for 5–10 seconds before responding | Set `--min-instances=1` for teacher-session workloads | Immediately visible at first real user session |
| Default CPU throttled allocation during solve | CP-SAT solver runs at reduced speed because Cloud Run throttles CPU after the HTTP response begins (not applicable here since we return after solve, but matters if OR-Tools uses background threads) | Use `--cpu-boost` for startup; request-based allocation is fine since the solve is synchronous | Becomes a problem if OR-Tools is changed to use worker threads |
| Unpinned `ortools` in `requirements.txt` | Silent upgrade during image rebuild changes solver behavior or API; test suite passes but production produces different results | Pin `ortools==9.x.y` to a specific version | On next `docker build` after an OR-Tools release |
| No request concurrency limit | Two simultaneous optimization requests both run full CP-SAT solves, consuming 2x memory and potentially OOM-killing the instance | Set `--concurrency=1` for the optimizer service — each instance handles only one solve at a time; Cloud Run scales horizontally | With 2+ concurrent users |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Supabase credentials in Docker `ENV` or `ARG` | Credentials embedded in image layers; visible via `docker history`; leaked if image is pushed to a public or shared registry | Inject via Cloud Run `--set-env-vars` or `--set-secrets` at deploy time; never in Dockerfile |
| `allow_origins=["*"]` in production | Any site can make authenticated-appearing requests to the optimizer using a stolen JWT | Use explicit origin list: `["https://your-app.vercel.app"]` |
| No JWT validation at the optimizer | A request with a forged or expired JWT that passes the `Authorization: Bearer` header check in FastAPI but fails at Supabase will cause a 401 from Supabase — but only after fetching project data | The current code correctly calls Supabase `/auth/v1/user` to validate the JWT before loading project data; preserve this check |
| Cloud Run service publicly invokable without any app-level auth | Anyone who discovers the URL can call `/` (the direct optimize endpoint) with arbitrary pupil data | The `/` endpoint (direct optimize) has no auth; consider removing it or adding a shared secret header for the Cloud deployment |
| OPTIMIZER_URL exposed in Vercel client bundle | The optimizer URL is publicly discoverable via browser DevTools | This is unavoidable for a client-side app; ensure the optimizer validates auth on every request and rate-limits aggressively |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Cold start during optimizer call shows no feedback | User clicks "Run Optimizer", sees the spinner, nothing happens for 8 seconds — they assume it is broken and click again, causing duplicate requests | Show a status message "Connecting to optimizer..." that appears after 2 seconds with no response; cancel in-flight requests before issuing a new one |
| Cloud Run timeout returns a generic network error | User sees browser "Failed to fetch" instead of a structured error message | Catch `fetch` network errors and show "The optimizer timed out. Try again or reduce the number of constraints." |
| Long solver time with no progress feedback | For a 100-pupil school with many strict constraints, the solve can take 15–30 seconds; the spinner provides no sense of progress | Accept this for MVP; if user complaints arise, add a "still working…" message after 10 seconds |
| 401 from missing auth header shows as generic error | Users see "Something went wrong" rather than a re-login prompt | Map optimizer 401 responses to a re-authentication flow in the frontend |

---

## "Looks Done But Isn't" Checklist

- [ ] **CORS configured:** Verify `OPTIONS https://<cloudrun-url>/project` returns 200 with `Access-Control-Allow-Origin` matching the Vercel domain — not just that POST works from curl.
- [ ] **Auth header forwarded:** Verify the Vercel frontend attaches `Authorization: Bearer <jwt>` on optimizer requests — not just that the optimizer endpoint is reachable.
- [ ] **Env vars injected:** Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in Cloud Run service config, not in the Dockerfile — run `gcloud run services describe optimizer --format='value(spec.template.spec.containers[0].env)'` to confirm.
- [ ] **Memory limit set:** Verify the deployed service uses `--memory=1Gi`, not the default 512 MiB — check Cloud Run service configuration page.
- [ ] **Timeout configured:** Verify `--timeout=3600` is set on the Cloud Run service — default of 300s will likely be sufficient but should be explicit.
- [ ] **Health endpoint accessible:** Verify `GET https://<cloudrun-url>/health` returns 200 — confirms the service is routable before running the first optimization.
- [ ] **Image uses glibc base:** Verify the Dockerfile uses `python:3.12-slim` (Debian-based, glibc) not `python:3.12-alpine` — OR-Tools wheels require glibc.
- [ ] **`ortools` version pinned:** Verify `requirements.txt` specifies `ortools==9.x.y` not just `ortools` — run `pip show ortools` inside the container to confirm the exact version.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| IAM blocks CORS preflight | LOW | `gcloud run services add-iam-policy-binding optimizer --member=allUsers --role=roles/run.invoker` — instant, no redeploy |
| Wrong CORS origins | LOW | Update `allow_origins` in `optimizer.py`, rebuild image, redeploy — ~5 minutes |
| Request timeout kills long solve | LOW | `gcloud run services update optimizer --timeout=3600` — no rebuild needed |
| OOM kill during solve | LOW | `gcloud run services update optimizer --memory=1Gi` — no rebuild needed |
| Credentials baked in image | HIGH | Rebuild image without credentials, push new image, update Cloud Run to use new image, rotate the leaked credentials in Supabase |
| OR-Tools version drift breaks solver | MEDIUM | Pin version in requirements.txt, rebuild, redeploy, re-run regression tests |
| Auth header not forwarded | LOW | Frontend-only change; update the fetch call, deploy to Vercel — no optimizer change needed |
| Missing health endpoint | MEDIUM | Add endpoint to optimizer.py, rebuild image, redeploy — existing traffic continues on old instance until new one is healthy |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| IAM blocks CORS preflight | Phase: Container deploy (Cloud Run config) | `curl -X OPTIONS` returns 200 with CORS headers |
| `Authorization` not in allow_headers | Phase: Container deploy (FastAPI middleware) | Browser DevTools shows preflight response includes `Access-Control-Allow-Headers: Authorization` |
| Request timeout shorter than solve time | Phase: Container deploy (Cloud Run config) | `gcloud run services describe` shows `timeoutSeconds: 3600` |
| OR-Tools cold start latency | Phase: Container deploy (Cloud Run config) | Cold start measured via Cloud Run logs; target under 10s |
| Memory OOM during large solve | Phase: Container deploy (Cloud Run config) | Load test with 150-pupil dataset; no exit code 137 in logs |
| Missing health endpoint | Phase: Container deploy (FastAPI code) | `GET /health` returns 200 before any optimization call |
| Auth header not forwarded | Phase: Frontend wiring (Vercel-side code) | End-to-end test: authenticated Vercel page calls optimizer successfully |
| Credentials in Docker image | Phase: Container deploy (Dockerfile + .dockerignore) | `docker history <image>` shows no credential values; env vars set via Cloud Run config |

---

## Sources

- [Configure memory limits for services — Cloud Run official docs](https://docs.cloud.google.com/run/docs/configuring/services/memory-limits)
- [Configure request timeout for services — Cloud Run official docs](https://docs.cloud.google.com/run/docs/configuring/request-timeout)
- [Configure container health checks — Cloud Run official docs](https://docs.cloud.google.com/run/docs/configuring/healthchecks)
- [CORS with End-user Authentication on Cloud Run — Known issue](https://issuetracker.google.com/issues/168707835)
- [Allowing public (unauthenticated) access — Cloud Run official docs](https://cloud.google.com/run/docs/authenticating/public)
- [CORS (Cross-Origin Resource Sharing) — FastAPI official docs](https://fastapi.tiangolo.com/tutorial/cors/)
- [Optimize Python applications for Cloud Run — Google Cloud](https://cloud.google.com/run/docs/tips/python)
- [SecretsUsedInArgOrEnv — Docker official docs](https://docs.docker.com/reference/build-checks/secrets-used-in-arg-or-env/)
- [Configure secrets for services — Cloud Run official docs](https://cloud.google.com/run/docs/configuring/services/secrets)
- [Cloud Run gets always-on CPU allocation — Google Cloud Blog](https://cloud.google.com/blog/products/serverless/cloud-run-gets-always-on-cpu-allocation)
- [OR-Tools PyPI package — release sizes and versions](https://pypi.org/project/ortools/)
- [How to Fix Cloud Run Memory Limit Exceeded Error — OneUptime](https://oneuptime.com/blog/post/2026-02-17-how-to-fix-cloud-run-memory-limit-exceeded-error-and-right-size-container-memory/view)

---
*Pitfalls research for: Cloud Run deployment of FastAPI + OR-Tools optimizer with Vercel cross-origin frontend*
*Researched: 2026-03-21*
