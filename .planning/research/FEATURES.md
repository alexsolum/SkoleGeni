# Feature Research

**Domain:** Cloud Run deployment of a FastAPI + OR-Tools optimizer service
**Researched:** 2026-03-21
**Confidence:** HIGH (Cloud Run docs) / MEDIUM (Python/uvicorn specifics) / HIGH (feature categorization)

---

## Context

This research supersedes the earlier product-feature FEATURES.md for the v1.1 milestone.
The question is: what deployment features are necessary, nice-to-have, or overkill for a
low-traffic school scheduling tool hosted on Google Cloud Run?

The existing optimizer (`api/optimizer.py`) is a synchronous FastAPI app running under
uvicorn with no health endpoint, no structured logging, no CORS middleware, and an 8-second
per-k-value solver timeout. The Dockerfile runs `python -m uvicorn ... --host 0.0.0.0 --port 8000`.

---

## Feature Landscape

### Table Stakes (Users Expect These)

These must exist for the service to work correctly from the Vercel frontend. Missing any
of these means the deployment either fails silently, breaks authentication, or leaves the
frontend unable to call the optimizer at all.

| Feature | Why Expected | Complexity | Dependency on Existing Code |
|---------|--------------|------------|----------------------------|
| CORS middleware (restrict to Vercel origin) | Browser blocks cross-origin requests without `Access-Control-Allow-Origin`; the Vercel frontend calls the optimizer from the browser | LOW | Add `CORSMiddleware` to `app` in `optimizer.py`; allow `ALLOWED_ORIGINS` env var |
| Cloud Run request timeout >= optimizer runtime | Optimizer loops over k-values at 8 s each; with 5+ classes that is 40+ s; default Cloud Run timeout is 300 s but must be explicitly set to avoid surprises | LOW | Infrastructure config only — no code change |
| `PYTHONUNBUFFERED=1` in Dockerfile | Uvicorn stdout/stderr is buffered by default; Cloud Run only captures flushed output; errors during a solve appear nowhere without this | LOW | One-line Dockerfile change |
| Env vars: SUPABASE_URL + SUPABASE_ANON_KEY | Optimizer already reads these; they must be injected as Cloud Run secrets/env vars or the `/project` and `/project/score` endpoints return 500 | LOW | No code change; Cloud Run env config only |
| Health/startup probe endpoint (`GET /health`) | Cloud Run startup probes can significantly reduce cold-start failure rates by distinguishing "still loading OR-Tools" from "crashed"; without it Cloud Run uses a raw TCP probe which is weaker | LOW | Add a trivial `@app.get("/health")` returning `{"status": "ok"}` |
| Single-worker uvicorn (`--workers 1`) | Cloud Run scales horizontally by adding instances, not workers; multiple workers per instance waste memory and can cause solver process contention with OR-Tools | LOW | Already default in existing Dockerfile CMD; confirm, do not change |

### Differentiators (Nice-to-Have)

These improve observability and reliability but are not blockers for initial deployment.
For a low-traffic school tool, these are worth doing only if they take under 30 minutes each.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| JSON structured logging to stdout | Cloud Logging auto-parses JSON logs and makes severity, message, and tracebacks searchable in the GCP console; plain text works but is harder to filter | LOW | Set `PYTHONUNBUFFERED=1` + emit JSON via `python-json-logger` or a simple dict formatter; no Google Cloud Logging SDK needed |
| Startup probe with `failureThreshold: 3` | Prevents Cloud Run from rejecting the instance during the OR-Tools import (which can take 2–4 s on cold start) before uvicorn is fully ready | LOW | Configure via `gcloud run deploy --startup-probe` or YAML; no code change |
| `--timeout-keep-alive 65` uvicorn flag | Prevents Uvicorn from closing keep-alive connections before Cloud Run's 60 s idle timeout, which causes sporadic 502s on the frontend | LOW | One-line Dockerfile CMD change |
| Minimum instances = 0 with CPU boost | Cold starts for a python:3.12-slim + OR-Tools image are typically 4–8 s; acceptable for a school tool where users are not doing rapid-fire requests; min=0 keeps cost at zero when idle | LOW | Infrastructure only; `--cpu-boost` flag on `gcloud run deploy` |
| Request timeout set to 120 s in Cloud Run config | OR-Tools with 5 k-values × 8 s = 40 s max; 120 s provides 3× headroom without going near the 60-minute max | LOW | Infrastructure only |
| Log the projectId and pupil count per request | Makes triage easier when a user reports a slow or failed optimization; currently the optimizer logs nothing | LOW | Add two `print()` or `logging.info()` calls in `optimize_project()` before calling `_optimize_request()` |
| Cloud Run service account with minimal IAM | Avoids the default Compute Engine SA having broad permissions; use a dedicated SA with only `roles/logging.logWriter` if structured logging is added | LOW | Infrastructure only; no code change |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Async job queue (Pub/Sub, Cloud Tasks) | OR-Tools runs up to 40 s; looks like it needs async handling | Adds a second service, a queue, and a polling or webhook loop on the frontend; doubles infrastructure complexity for a tool that gets used ~5 times a day | Cloud Run's 300 s (or 120 s configured) synchronous timeout is already sufficient; keep it synchronous |
| Google Cloud Error Reporting SDK | Real-time error dashboards look appealing | Adds `google-cloud-error-reporting` dependency which increases image size and cold start; Cloud Run already sends unhandled exceptions to Error Reporting automatically if the log entry severity is ERROR and contains a traceback | Just let unhandled exceptions print to stderr; Cloud Run captures them automatically |
| Google Cloud Monitoring custom metrics (request latency, solver duration) | Visibility into solve time per request | Full metrics SDK is ~30 MB of dependencies and requires significant setup; irrelevant at <50 optimizations/month | Cloud Run provides built-in request latency, instance count, and memory metrics in the GCP console at no setup cost |
| Authentication middleware in the optimizer | "Secure the optimizer itself" | The optimizer already validates the Supabase Bearer token by forwarding it to Supabase `/auth/v1/user`; adding a second auth layer duplicates this and adds latency | Keep the existing auth-forwarding pattern; restrict Cloud Run invoker to `allUsers` only if Vercel calls it directly (or restrict to a service account if using server-side calls) |
| Redis/Firestore result caching | "Don't re-run the same optimization" | School datasets change between runs; caching adds a cache-invalidation problem for no real gain at this traffic level | No caching needed; OR-Tools is fast enough (<40 s) for the use case |
| Multi-region deployment | "High availability" | A school roster tool is used by a handful of admins in one country; single-region is fine; multi-region adds cost and complexity with zero user benefit | Deploy to a single region close to Supabase's region to minimize Supabase API call latency |
| Horizontal pod autoscaling with warm pool | "Eliminate cold starts" | Min instances > 0 charges for idle compute 24/7; a cold start of 4–8 s is acceptable for a tool used a few times per day | Leave min instances = 0; use CPU boost for faster cold starts |

---

## Feature Dependencies

```
CORS middleware
    └──requires──> Vercel origin known at deploy time (ALLOWED_ORIGINS env var)

Health probe endpoint
    └──enhances──> Cloud Run startup probe config (infrastructure)

JSON structured logging
    └──enhances──> Cloud Logging severity filtering (observable without it but noisier)

Request timeout (Cloud Run config)
    └──requires──> Solver timeout per k-value is already bounded at 8 s (existing code)
    └──requires──> Cloud Run timeout >= (max k-values × 8 s) + Supabase fetch overhead

Env vars (SUPABASE_URL, SUPABASE_ANON_KEY)
    └──required by──> /project and /project/score endpoints (existing code, no change)

PYTHONUNBUFFERED=1
    └──required for──> Any log output reaching Cloud Logging during a solve
```

### Dependency Notes

- **CORS before anything else:** Without CORS, the browser rejects the response before auth headers are even inspected. It must be the first thing added.
- **Timeout config is independent of code:** Cloud Run timeout is set at deploy time via gcloud or YAML; the existing 8 s solver timeout in `_solve_for_k` is already a hard cap per iteration.
- **Health probe requires a new endpoint:** The existing app has no `GET` routes. One `@app.get("/health")` endpoint is needed; the startup probe path must match it exactly.

---

## MVP Definition

### Launch With (v1 — required before calling this deployed)

- [ ] CORS middleware with `ALLOWED_ORIGINS` env var — without this the frontend cannot call the service from the browser at all
- [ ] `PYTHONUNBUFFERED=1` in Dockerfile — without this errors during cold start or solving are silently swallowed by Cloud Run
- [ ] `GET /health` endpoint — enables a meaningful startup probe so Cloud Run does not send traffic before OR-Tools has finished importing
- [ ] Cloud Run request timeout set to 120 s — ensures the optimizer can complete even for large datasets without Cloud Run cutting the connection
- [ ] Env vars injected: `SUPABASE_URL`, `SUPABASE_ANON_KEY` — required by existing project-based endpoints

### Add After Validation (v1.x)

- [ ] JSON structured logging — add once deployment is confirmed working; makes production triage significantly easier when users report failures
- [ ] `--timeout-keep-alive 65` uvicorn flag — add if 502 errors appear on the frontend after long solves; investigate first
- [ ] Log projectId + pupil count per request — add if a user reports a mysterious slow/failed run and there is no signal in logs

### Future Consideration (v2+)

- [ ] Async job queue — only if synchronous timeout proves insufficient for real school datasets (deferred per PROJECT.md)
- [ ] Dedicated Cloud Run service account with minimal IAM — worth doing before handing off to a client; overkill for internal dev validation
- [ ] Custom Cloud Monitoring metrics — only if the tool scales to a multi-school deployment

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| CORS middleware | HIGH (blocks all browser calls without it) | LOW (5 lines) | P1 |
| PYTHONUNBUFFERED=1 | HIGH (silent failures without it) | LOW (1 line) | P1 |
| GET /health endpoint | HIGH (reliable startup) | LOW (3 lines) | P1 |
| Cloud Run timeout 120 s | HIGH (prevents timeout failures) | LOW (gcloud flag) | P1 |
| SUPABASE env vars injected | HIGH (existing code requires it) | LOW (gcloud secrets) | P1 |
| JSON structured logging | MEDIUM (triage only) | LOW (add python-json-logger) | P2 |
| Startup probe config | MEDIUM (reduces cold-start failures) | LOW (gcloud YAML) | P2 |
| Log projectId + pupil count | MEDIUM (debug signal) | LOW (2 print calls) | P2 |
| Async job queue | LOW (not needed at current timeouts) | HIGH | P3 |
| Custom metrics SDK | LOW (GCP built-ins sufficient) | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Cloud Run Specifics for This Optimizer

### Request timeout calculation

The optimizer iterates over `k_options = range(k_low, k_high + 1)`. For a typical school
dataset of 80–120 pupils with min=25, max=35:

- k_low = ceil(80/35) = 3 classes, k_high = floor(80/25) = 3 classes → 1 iteration × 8 s = 8 s max
- For 200 pupils, min=20, max=30: k_low=7, k_high=10 → 4 iterations × 8 s = 32 s max

Setting the Cloud Run timeout to 120 s provides 3-4× headroom for any realistic school dataset.

### Cold start

The `python:3.12-slim` + OR-Tools image will typically take 4–8 s to cold-start (OR-Tools
import is the dominant cost). This is acceptable for a school tool used a few times per
day. Setting `--cpu-boost` on the Cloud Run service reduces this by ~40% at no additional
cost (only charged during startup).

### CORS allowed origins

The optimizer must allow:
- The Vercel production URL (e.g., `https://skolegeni.vercel.app`)
- The Vercel preview URL pattern (e.g., `https://skolegeni-*.vercel.app`) or a wildcard
- `http://localhost:5173` for local development

Inject as `ALLOWED_ORIGINS=https://skolegeni.vercel.app,http://localhost:5173` env var
and parse as a comma-separated list in the CORS middleware configuration.

---

## Sources

- [Cloud Run health checks documentation](https://docs.cloud.google.com/run/docs/configuring/healthchecks) — HIGH confidence
- [Cloud Run request timeout documentation](https://docs.cloud.google.com/run/docs/configuring/request-timeout) — HIGH confidence
- [Optimize Python applications for Cloud Run](https://docs.cloud.google.com/run/docs/tips/python) — HIGH confidence
- [Cloud Run logging documentation](https://cloud.google.com/run/docs/logging) — HIGH confidence
- [FastAPI CORS tutorial](https://fastapi.tiangolo.com/tutorial/cors/) — HIGH confidence
- [Taming Python/FastAPI/Uvicorn logs in GCP](https://medium.com/@hosseinjafari/the-google-cloud-logging-challenge-taming-uvicorn-and-python-logs-in-gcp-a996049ed3d9) — MEDIUM confidence
- [Cloud Run cold start optimization 2025](https://markaicode.com/google-cloud-run-cold-start-optimization-2025/) — MEDIUM confidence
- Existing `api/optimizer.py` and `docker/optimizer.Dockerfile` — HIGH confidence (direct inspection)

---

*Feature research for: Cloud Run deployment of FastAPI + OR-Tools optimizer*
*Researched: 2026-03-21*
