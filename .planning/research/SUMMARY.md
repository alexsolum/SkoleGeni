# Project Research Summary

**Project:** SkoleGeni v1.1 — Cloud Run Optimizer Deployment
**Domain:** Cloud deployment of a FastAPI + OR-Tools solver service, integrated with an existing Vercel + Supabase product
**Researched:** 2026-03-21
**Confidence:** HIGH

## Executive Summary

SkoleGeni v1.1 is a targeted infrastructure upgrade, not a new product. The core optimization logic (CP-SAT solver in FastAPI + OR-Tools) and the frontend (React + Vite on Vercel) are already validated. The only meaningful question is how to move the optimizer container from local Docker Compose onto Google Cloud Run so that the Vercel frontend can reach it over the public internet. Research shows this is a well-understood deployment pattern with official documentation for every step — the risk is not in the pattern itself but in a small set of highly-specific configuration mistakes that are easy to make and non-obvious to diagnose.

The recommended approach is a single Cloud Run service (Gen 2, `--allow-unauthenticated`, concurrency=1, memory=2 GiB, timeout=300 s) backed by Artifact Registry for image storage. Application-level auth is already handled by the optimizer via Supabase JWT validation — no Cloud Run IAM auth is needed or desirable. The only code changes required are adding `CORSMiddleware` to `optimizer.py` and a `GET /health` endpoint. Everything else is infrastructure configuration and a one-time CI/CD pipeline.

The dominant risks all cluster in the same deployment phase: CORS misconfiguration (three distinct ways to get it wrong), memory and timeout limits being left at defaults that are too low for production-scale school datasets, and OR-Tools cold start latency if min-instances is set to zero. All of these are preventable with explicit configuration values at deploy time. No novel technology decisions are required; research confidence is high across all four areas.

---

## Key Findings

### Recommended Stack

The existing stack is unchanged for v1.1. New infrastructure additions are limited to two GCP services: Cloud Run (Gen 2, managed) to host the optimizer container, and Artifact Registry (Docker format) to store images. Container Registry (gcr.io) is deprecated and must not be used. No new Python dependencies are needed — CORSMiddleware ships with Starlette, which is already a FastAPI transitive dependency.

Cloud Run's cost for a low-traffic school tool is effectively zero (well within the free tier at ~50 optimize calls/month). The scale-to-zero default is acceptable given that a 4–8 s cold start is tolerable for a tool used a few times per day, though `--cpu-boost` should be enabled to halve that cost.

**Core technologies:**
- Google Cloud Run (Gen 2): host the optimizer container — serverless, scales to zero, synchronous requests up to 3600 s, no Kubernetes overhead
- Google Artifact Registry: container image storage — official replacement for deprecated gcr.io, free same-region pulls
- FastAPI CORSMiddleware (already a transitive dep): allow Vercel origin to call Cloud Run — no new dependency needed
- Supabase JWT forwarding (existing): auth unchanged — optimizer already validates Bearer tokens against Supabase; no modification required

### Expected Features

All P1 features are small code or config changes. The entire MVP surface is a single deployment session.

**Must have (table stakes — P1):**
- CORS middleware with explicit `ALLOWED_ORIGINS` env var — without this the browser blocks all optimizer calls before they reach FastAPI
- `PYTHONUNBUFFERED=1` in Dockerfile — without this, errors and log output during solves are silently swallowed by Cloud Run
- `GET /health` endpoint — enables a meaningful startup probe so Cloud Run does not route traffic before OR-Tools finishes importing
- Cloud Run request timeout set to 120 s (minimum) or 300 s (safe default) — prevents Cloud Run from killing a valid long-running solve
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` injected as Cloud Run env vars — required by all project-based endpoints

**Should have (P2, add after initial validation):**
- JSON structured logging to stdout — Cloud Logging auto-parses severity; triage is significantly easier when users report failures
- Startup probe with `initialDelaySeconds: 15` pointing at `/health` — prevents traffic to instances still loading OR-Tools
- `--timeout-keep-alive 65` uvicorn flag — prevents sporadic 502s on long solves due to keep-alive timeout racing Cloud Run's idle timeout
- Log projectId and pupil count per request — minimal debugging signal for mysterious slow or failed runs

**Defer (v2+):**
- Async job queue (Cloud Tasks / Pub/Sub) — explicitly out of scope per PROJECT.md; Cloud Run's synchronous timeout is sufficient
- Custom Cloud Monitoring metrics SDK — GCP's built-in request latency metrics are sufficient at this traffic level
- Multi-region deployment — a single-school tool serving one country needs one region

### Architecture Approach

The architecture is a stateless request/response pattern. The Vercel SPA calls Cloud Run over HTTPS with a Supabase Bearer JWT; Cloud Run validates that JWT against Supabase auth, fetches project data from Supabase REST (with RLS enforced via the same token), runs the CP-SAT solve, and returns the result synchronously. No queues, no sessions, no state on the optimizer. The optimizer is intentionally a "side-car compute unit" — all persistence stays in Supabase.

The critical architectural constraint is that Cloud Run must use `--allow-unauthenticated` because Cloud Run's own IAM layer intercepts OPTIONS preflight requests and returns 403 before FastAPI can process them. Auth is enforced at the application layer (Supabase JWT validation), which is already implemented. The `anon` key must be used (not `service_role`) to preserve Supabase RLS enforcement on all data reads.

**Major components:**
1. Vercel SPA — serves static assets, attaches Supabase JWT to all optimizer fetch calls via `Authorization: Bearer`
2. Cloud Run (FastAPI + OR-Tools) — validates JWT, fetches project data, runs CP-SAT, returns result synchronously; concurrency=1, memory=2 GiB
3. Supabase — issues JWTs to the browser, enforces RLS on all table reads, validates token identity on behalf of the optimizer
4. Artifact Registry — stores versioned Docker images; same GCP region as Cloud Run for free, fast pulls
5. GitHub Actions (CI/CD) — builds image on optimizer file changes, pushes to Artifact Registry, deploys revision to Cloud Run via Workload Identity Federation

### Critical Pitfalls

1. **Cloud Run IAM auth blocks CORS preflight with HTTP 403** — deploy with `--allow-unauthenticated`; the optimizer already enforces auth via Supabase JWT. This conflict is confirmed via the GCP issue tracker and is unresolvable at the infrastructure level.

2. **`allow_origins=["*"]` combined with `allow_credentials=True` silently breaks auth** — browsers reject this combination per the CORS spec; enumerate explicit Vercel domains in `allow_origins`; also ensure `allow_headers` explicitly lists `Authorization` or the actual POST is blocked even when preflight passes.

3. **OOM kill when Cloud Run memory is left at the 512 MiB default** — OR-Tools CP-SAT with a 100–200 pupil school model peaks at 200–400 MB; add Python and FastAPI overhead and the container exceeds 512 MiB silently (exit code 137, no application logs); deploy with `--memory=2Gi` as a safe baseline.

4. **OR-Tools cold start latency (4–10 s) with min-instances=0** — the first optimizer call after inactivity appears to hang; mitigate with `--cpu-boost` (halves cold start time); optionally `--min-instances=1` if users find the latency unacceptable.

5. **Supabase credentials baked into Docker image via ENV or ARG** — credentials embedded in image layers are visible via `docker history`; inject via `--set-env-vars` at Cloud Run deploy time; add `*.env` to `.dockerignore`; leaked credentials require rotation which is HIGH recovery cost.

---

## Implications for Roadmap

Based on combined research, all work for this milestone fits a tight four-phase structure. Dependencies run strictly in order: infrastructure must exist before code is built against it, and the full stack must be validated end-to-end before CI/CD automation is worth wiring.

### Phase 1: GCP Infrastructure Setup
**Rationale:** Everything else depends on having a GCP project, Artifact Registry repository, and Cloud Run service account with correct IAM bindings. This is purely infrastructure — no code changes. Doing it first produces concrete outputs (registry URL, service account email) that parameterize all later steps.
**Delivers:** Artifact Registry repo, Cloud Run deployer service account, IAM bindings (`run.admin`, `artifactregistry.writer`, `iam.serviceAccountUser`), gcloud SDK configured locally
**Addresses:** STACK.md GCP services section
**Avoids:** Credentials baked into the image (Pitfall 8) — secret injection pattern is established from the start, not retrofitted

### Phase 2: Container Hardening and Manual First Deploy
**Rationale:** Code changes must land before the Docker image is built. All P1 features are tiny code or Dockerfile changes (under 20 lines total). A manual deploy validates the container in isolation before CI/CD automation is added, making failures easy to isolate (container problem vs. pipeline problem).
**Delivers:** Modified `optimizer.py` with CORSMiddleware and `/health` endpoint; `PYTHONUNBUFFERED=1` in Dockerfile; pinned `ortools` version in `requirements.txt`; Docker image pushed to Artifact Registry; Cloud Run service live with correct env vars (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ALLOWED_ORIGINS`), memory (2 GiB), timeout, and concurrency (1); service smoke-tested via curl against `/health` and `/project`
**Uses:** All P1 features from FEATURES.md; all Cloud Run configuration values from STACK.md
**Implements:** Core architecture — stateless optimizer accessible over HTTPS
**Avoids:** Pitfalls 1–6 (all address CORS, timeout, memory, health endpoint, cold start, credentials)

### Phase 3: Frontend Wiring and End-to-End Validation
**Rationale:** The Vercel `VITE_OPTIMIZER_URL` env var update is independent of the container but meaningless without a live Cloud Run URL. Wire the frontend only after the Cloud Run service is smoke-tested. This phase is the first time the full browser → Cloud Run → Supabase → Cloud Run → browser path is exercised.
**Delivers:** `VITE_OPTIMIZER_URL` updated in Vercel dashboard; Vercel redeployed; authenticated browser flow confirmed working end-to-end; 401 responses mapped to re-authentication flow in the frontend
**Avoids:** Pitfall 7 (auth header not forwarded) — validate `Authorization: Bearer` is attached to all optimizer fetch calls from the Vercel-deployed frontend

### Phase 4: CI/CD Automation
**Rationale:** Automate what has been manually validated. GitHub Actions with Workload Identity Federation (no long-lived service account keys) is the recommended pattern. This phase adds no new user-facing functionality — it makes future optimizer deploys automatic and key-free.
**Delivers:** `.github/workflows/deploy-optimizer.yml` with path filter on `api/**` and `docker/optimizer.Dockerfile`; Workload Identity Federation configured in GCP; confirmed to fire and deploy on a push to main
**Implements:** Architecture CI/CD pipeline component from ARCHITECTURE.md

### Phase Ordering Rationale

- GCP infrastructure precedes all other phases because it produces the registry URL, service account, and IAM bindings that all other steps require.
- Code changes (CORS, health endpoint, Dockerfile) must be committed and the image built before any Cloud Run testing is possible.
- Manual first deploy before CI/CD automation is the pattern explicitly recommended in ARCHITECTURE.md's "Suggested Build Order" — it isolates container failures from pipeline failures and avoids debugging both simultaneously.
- Frontend wiring after Cloud Run validation ensures the URL is stable and confirmed working before it is embedded in Vercel's production environment.

### Research Flags

All four phases have well-documented patterns. No additional research sessions are required before implementation:

- **Phase 1:** Standard GCP project setup; official docs cover every step; no unknowns
- **Phase 2:** All configuration values explicitly enumerated in STACK.md and PITFALLS.md; code changes are mechanical
- **Phase 3:** Frontend auth header attachment is already implemented in `src/lib/api.ts`; Vercel env var change is mechanical
- **Phase 4:** Complete GitHub Actions workflow YAML provided in ARCHITECTURE.md; Workload Identity Federation is well-documented

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All GCP services verified against official documentation; Cloud Run configuration values have explicit rationale tied to OR-Tools memory and runtime characteristics |
| Features | HIGH | Feature categorization based on direct inspection of `optimizer.py` and `Dockerfile`; Cloud Run docs confirm all P1 requirements; nothing speculative |
| Architecture | HIGH | Request flow is directly traceable through existing code; CORS/IAM conflict confirmed via GCP issue tracker; auth forwarding pattern already works in the codebase |
| Pitfalls | HIGH | All critical pitfalls confirmed by official docs or the GCP issue tracker; cold start timings are MEDIUM confidence (depend on actual OR-Tools wheel size and GCP region CPU allocation) |

**Overall confidence:** HIGH

### Gaps to Address

- **Cold start timing:** Research cites 4–10 s for OR-Tools cold start but this depends on the deployed image size and GCP region. Measure actual cold start in Phase 2 and decide whether `--min-instances=1` is worth the ~$7–15/month cost.
- **OR-Tools version pin:** The exact `ortools` version to pin in `requirements.txt` must be confirmed at implementation time by running `pip show ortools` inside a fresh container build. Do not defer — an unpinned version is a silent production risk on the next `docker build`.
- **Vercel preview URL CORS:** Vercel preview URLs have a non-deterministic hash component (`skolegeni-git-<branch>-<org>.vercel.app`). Either enumerate the production URL only in `ALLOWED_ORIGINS` (preview deploys cannot call the optimizer) or configure the preview domain explicitly. Decide at Phase 3.
- **The `/` direct optimize endpoint has no auth:** `POST /` (distinct from `POST /project`) has no Supabase JWT validation. For Cloud Run this becomes a public unauthenticated endpoint. Decide whether to remove it or add a shared secret check before Phase 2 deploys the image.

---

## Sources

### Primary (HIGH confidence)
- [Cloud Run memory limits](https://docs.cloud.google.com/run/docs/configuring/services/memory-limits) — memory default 512 MiB, OOM behavior (exit code 137)
- [Cloud Run request timeout](https://docs.cloud.google.com/run/docs/configuring/request-timeout) — default 300 s, max 3600 s
- [Cloud Run health checks](https://docs.cloud.google.com/run/docs/configuring/healthchecks) — startup probe configuration and initialDelaySeconds
- [Cloud Run min instances](https://docs.cloud.google.com/run/docs/configuring/min-instances) — scale-to-zero behavior and billing
- [Artifact Registry push/pull](https://cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling) — gcloud auth, image URL format
- [Allowing public access on Cloud Run](https://cloud.google.com/run/docs/authenticating/public) — `--allow-unauthenticated` and allUsers IAM binding
- [FastAPI CORS tutorial](https://fastapi.tiangolo.com/tutorial/cors/) — CORSMiddleware, credentials + wildcard restriction
- [CORS with Cloud Run IAM auth — issue tracker](https://issuetracker.google.com/issues/168707835) — confirms OPTIONS blocked by IAM auth layer
- [Optimize Python for Cloud Run](https://cloud.google.com/run/docs/tips/python) — PYTHONUNBUFFERED, startup optimization
- [Cloud Run secrets configuration](https://cloud.google.com/run/docs/configuring/services/secrets) — Secret Manager integration
- [Docker build secrets ARG/ENV warning](https://docs.docker.com/reference/build-checks/secrets-used-in-arg-or-env/) — credentials in image layers
- [Deploy to Cloud Run with GitHub Actions](https://cloud.google.com/blog/products/devops-sre/deploy-to-cloud-run-with-github-actions) — Workload Identity Federation CI/CD pattern
- Existing `api/optimizer.py` and `docker/optimizer.Dockerfile` — direct code inspection

### Secondary (MEDIUM confidence)
- [Cloud Run cold start optimization 2025](https://markaicode.com/google-cloud-run-cold-start-optimization-2025/) — CPU boost reduces cold start 30–50%
- [Cloud Run pricing](https://cloudchipr.com/blog/cloud-run-pricing) — free tier limits, per-request billing rates
- [Taming Python/FastAPI/Uvicorn logs in GCP](https://medium.com/@hosseinjafari/the-google-cloud-logging-challenge-taming-uvicorn-and-python-logs-in-gcp-a996049ed3d9) — JSON structured logging pattern for Cloud Logging
- [OR-Tools PyPI page](https://pypi.org/project/ortools/) — wheel size ~30 MB for Linux x86-64

---
*Research completed: 2026-03-21*
*Ready for roadmap: yes*
