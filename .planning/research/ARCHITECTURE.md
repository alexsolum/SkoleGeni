# Architecture Research

**Domain:** FastAPI + OR-Tools optimizer deployed to Google Cloud Run, integrated with Vercel frontend and Supabase backend
**Researched:** 2026-03-21
**Confidence:** HIGH (Cloud Run deployment patterns), MEDIUM (cold start timings for OR-Tools specifically)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                                  │
│  React + Vite SPA (static, served from Vercel CDN)                  │
│  VITE_OPTIMIZER_URL = https://optimizer-xxx-uc.a.run.app             │
│  VITE_SUPABASE_URL  = https://xxx.supabase.co                        │
└───────────────────────┬──────────────────────┬───────────────────────┘
                        │ fetch POST /project   │ supabase-js REST/auth
                        │ Authorization: Bearer │ (direct from browser)
                        ▼                       ▼
┌────────────────────────────┐     ┌─────────────────────────────────┐
│   GOOGLE CLOUD RUN         │     │   SUPABASE (hosted)              │
│   FastAPI + OR-Tools       │────▶│   PostgreSQL + RLS               │
│   python:3.12-slim image   │     │   REST API (/rest/v1/*)          │
│   --allow-unauthenticated  │     │   Auth  (/auth/v1/user)          │
│   --timeout=3600s          │     │                                  │
│   --min-instances=1        │     │  RLS enforces project ownership  │
│   --concurrency=1          │     │  Bearer token validated per req  │
└────────────────────────────┘     └─────────────────────────────────┘
         ▲
         │ docker push
         │
┌────────────────────────────┐
│  ARTIFACT REGISTRY         │
│  (GCP, same region)        │
│  us-central1-docker.pkg.dev│
└─────────────┬──────────────┘
              │ on push to main
              │
┌─────────────▼──────────────┐
│  GITHUB ACTIONS             │
│  build → push → deploy     │
│  Workload Identity Fed.    │
└────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Notes |
|-----------|----------------|-------|
| Vercel SPA | Serve static assets, call optimizer and Supabase from browser | No server-side code; VITE_OPTIMIZER_URL env var set in Vercel dashboard |
| Cloud Run (optimizer) | Run CP-SAT solver synchronously, fetch project data from Supabase, return classes + score | Stateless; one container handles one request |
| Supabase | Auth token issuance, RLS-protected data, REST API | Token issued to browser; forwarded verbatim to optimizer |
| Artifact Registry | Store and version Docker images | Same GCP region as Cloud Run reduces pull latency |
| GitHub Actions | CI/CD: build image, push to registry, deploy revision to Cloud Run | Workload Identity Federation — no long-lived service account keys |

## Request Flow

### Optimization Request (Primary Flow)

```
1. User clicks "Optimize" in Vercel SPA
   │
2. src/lib/api.ts: getAuthHeaders()
   → supabase.auth.getSession()
   → extracts session.access_token (JWT)
   │
3. fetch POST https://optimizer-xxx-uc.a.run.app/project
   Headers:
     content-type: application/json
     authorization: Bearer <supabase-jwt>
   Body: { "projectId": "uuid" }
   │
4. Cloud Run receives request
   → FastAPI route handler
   → reads Authorization header
   → calls Supabase /auth/v1/user (bearer forwarded)
   → validates user owns project
   → fetches project_constraints, pupils, chemistry_links via REST API
   → runs CP-SAT solver (OR-Tools)
   → returns OptimizeResponse JSON
   │
5. Browser receives { classes: [...], score: {...} }
   → React state updated → UI renders results
```

### Score Request (Secondary Flow)

```
fetch POST https://optimizer-xxx-uc.a.run.app/project/score
Headers: authorization: Bearer <supabase-jwt>
Body: { "projectId": "uuid", "assignment": [[...], [...]] }
→ same auth validation path → score computed → Score JSON returned
```

## CORS Configuration

### The Critical Constraint

Cloud Run's own IAM authentication layer will block preflight OPTIONS requests with HTTP 403 when IAM auth is enabled. Browsers always send OPTIONS before cross-origin requests with custom headers (Authorization). This is an unresolvable conflict when using Cloud Run IAM auth.

**Solution: Use `--allow-unauthenticated` on the Cloud Run service.** Application-level auth is enforced by the optimizer itself (it validates the Supabase Bearer token), not by Cloud Run IAM. This is architecturally correct because the Supabase JWT is the trust boundary — the optimizer already validates it.

### FastAPI CORS Middleware (Required)

The optimizer must mount `CORSMiddleware` restricted to the Vercel origin. Without this, browsers will reject responses despite Cloud Run returning them.

```python
from fastapi.middleware.cors import CORSMiddleware

ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS if o.strip()],
    allow_credentials=True,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
```

`CORS_ALLOWED_ORIGINS` is set as a Cloud Run environment variable to `https://your-app.vercel.app` (and optionally the preview domain pattern). Never use `"*"` in production because Authorization headers require explicit origin allowlisting.

## Auth Token Flow

```
Browser                   Cloud Run              Supabase
   │                          │                      │
   │  supabase.auth.getSession│                      │
   │─────────────────────────▶│                      │
   │◀── { access_token: JWT } │                      │
   │                          │                      │
   │  POST /project           │                      │
   │  Authorization: Bearer JWT                       │
   │─────────────────────────▶│                      │
   │                          │ GET /auth/v1/user     │
   │                          │ Authorization: Bearer JWT
   │                          │ apikey: SUPABASE_ANON_KEY
   │                          │─────────────────────▶│
   │                          │◀── { id: user_uuid } │
   │                          │                      │
   │                          │ GET /rest/v1/pupils   │
   │                          │ Authorization: Bearer JWT (RLS enforced)
   │                          │─────────────────────▶│
   │                          │◀── [ pupil rows ]    │
   │                          │                      │
   │◀── OptimizeResponse      │                      │
```

Key invariant: the Bearer JWT is the user's Supabase session token, issued by Supabase Auth. It carries the user's `sub` claim. Supabase RLS uses `auth.uid()` to scope all table reads — the optimizer never sees data it is not allowed to see, because the database enforces it.

The optimizer also needs `SUPABASE_ANON_KEY` as the `apikey` header. This is the public anon key (not the service role key). Using the anon key preserves RLS enforcement. Do not use `service_role` key in the optimizer — that would bypass RLS.

## Environment Variables on Cloud Run

| Variable | Value source | Purpose |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project settings | Base URL for REST/auth calls |
| `SUPABASE_ANON_KEY` | Supabase project settings | `apikey` header for PostgREST requests |
| `CORS_ALLOWED_ORIGINS` | Vercel app URL | Comma-separated list of allowed origins |

Set via `gcloud run services update` or in the deploy step:

```bash
gcloud run deploy optimizer \
  --set-env-vars="SUPABASE_URL=https://xxx.supabase.co,SUPABASE_ANON_KEY=...,CORS_ALLOWED_ORIGINS=https://your-app.vercel.app"
```

Store secrets (anon key, etc.) in Google Secret Manager and reference them via `--set-secrets` rather than plain env vars for production hardening.

## CI/CD Pipeline

### Recommended: GitHub Actions with Workload Identity Federation

No service account key files stored in GitHub secrets. Uses short-lived OIDC tokens.

```yaml
# .github/workflows/deploy-optimizer.yml
name: Deploy Optimizer to Cloud Run

on:
  push:
    branches: [main]
    paths:
      - 'api/**'
      - 'docker/optimizer.Dockerfile'
      - 'requirements.txt'

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write   # Required for Workload Identity Federation

    steps:
      - uses: actions/checkout@v4

      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: 'projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL/providers/PROVIDER'
          service_account: 'cloud-run-deployer@PROJECT_ID.iam.gserviceaccount.com'

      - uses: google-github-actions/setup-gcloud@v2

      - name: Build and push image
        run: |
          IMAGE="us-central1-docker.pkg.dev/PROJECT_ID/skolegeni/optimizer:${{ github.sha }}"
          gcloud auth configure-docker us-central1-docker.pkg.dev --quiet
          docker build -f docker/optimizer.Dockerfile -t "$IMAGE" .
          docker push "$IMAGE"

      - name: Deploy to Cloud Run
        run: |
          IMAGE="us-central1-docker.pkg.dev/PROJECT_ID/skolegeni/optimizer:${{ github.sha }}"
          gcloud run deploy optimizer \
            --image "$IMAGE" \
            --region us-central1 \
            --platform managed \
            --allow-unauthenticated \
            --timeout 3600 \
            --concurrency 1 \
            --min-instances 1 \
            --set-env-vars "SUPABASE_URL=${{ secrets.SUPABASE_URL }}" \
            --set-env-vars "SUPABASE_ANON_KEY=${{ secrets.SUPABASE_ANON_KEY }}" \
            --set-env-vars "CORS_ALLOWED_ORIGINS=${{ secrets.CORS_ALLOWED_ORIGINS }}"
```

IAM roles required for the deployer service account:
- `roles/run.admin` — deploy and update Cloud Run services
- `roles/artifactregistry.writer` — push images
- `roles/iam.serviceAccountUser` — act as the runtime service account

### Alternative: Cloud Build triggers

Cloud Build can watch the repository directly without GitHub Actions. Simpler setup but less portable and harder to test locally. Use GitHub Actions unless the team is already invested in Cloud Build.

## Cloud Run Service Configuration

### Timeout

Set `--timeout 3600` (60 minutes, the maximum). For a real school dataset (200-500 pupils, 6-10 classes), CP-SAT typically solves in under 60 seconds, but a conservative ceiling prevents unexpected 504s.

### Concurrency

Set `--concurrency 1`. The CP-SAT solver is CPU-bound and multithreaded internally. Running two concurrent optimization requests on one instance would cause resource contention. With concurrency=1, Cloud Run will spin up a second instance for a second simultaneous request rather than queuing it.

### Minimum Instances

Set `--min-instances 1`. The OR-Tools + FastAPI container is non-trivial to cold-start (Python + C++ shared libraries). Cold start estimates are 5-15 seconds. One warm instance keeps latency acceptable for interactive use. This incurs a small always-on cost (memory billing only when idle with default CPU allocation mode).

### Memory / CPU

Start with `--memory 512Mi --cpu 1`. OR-Tools CP-SAT uses threads proportional to available CPUs. 1 vCPU is sufficient for typical school datasets. Increase to 2 vCPU if solve times exceed 30 seconds in production.

## Local Development Workflow

### Unchanged for local dev

The existing `docker-compose.yml` remains the local dev stack. No changes needed:

```
docker compose up
# Optimizer runs at http://localhost:8000
# VITE_OPTIMIZER_URL=http://localhost:8000/
```

### Cloud Run target

Vercel environment variables control which optimizer URL the frontend calls:

| Context | VITE_OPTIMIZER_URL value |
|---------|--------------------------|
| Local dev (docker-compose) | `http://localhost:8000/` |
| Vercel production | `https://optimizer-xxx-uc.a.run.app` |
| Vercel preview (optional) | same Cloud Run URL, or a staging service |

Set `VITE_OPTIMIZER_URL` in the Vercel project dashboard under Settings → Environment Variables. Vercel bakes this into the static build at deploy time — it is not a runtime secret.

### Local smoke test against Cloud Run

To test the deployed Cloud Run service directly without the full Vercel deploy:

```bash
curl -X POST https://optimizer-xxx-uc.a.run.app/project \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(supabase token)" \
  -d '{"projectId":"<uuid>"}'
```

## Architectural Patterns

### Pattern 1: Stateless Optimizer as a Side-car Compute Unit

**What:** The optimizer holds no state between requests. All data lives in Supabase. Each request is self-contained: fetch data, solve, return result.

**When to use:** Always, for this use case. CP-SAT solve is idempotent — same inputs produce equivalent outputs.

**Trade-offs:** Simple to scale and deploy. No session affinity needed. No database migrations on the optimizer. The tradeoff is that every optimization request pays a Supabase round-trip to fetch data, but that cost is negligible compared to solve time.

### Pattern 2: Bearer Token Pass-through (Not Token Exchange)

**What:** The frontend's Supabase JWT is passed verbatim to the optimizer. The optimizer forwards it to Supabase REST/auth unchanged.

**When to use:** When the optimizer must act on behalf of the authenticated user with RLS still enforced.

**Trade-offs:** Correct and simple. Token expiry is handled by the browser (supabase-js auto-refreshes). The optimizer does not need to manage token lifecycle. An expired token will return 401 from Supabase, which the optimizer surfaces as a 401 to the frontend.

### Pattern 3: Path-based Trigger (paths filter in CI)

**What:** GitHub Actions workflow only runs when optimizer-related files change (`api/**`, `docker/optimizer.Dockerfile`, `requirements.txt`).

**When to use:** When frontend and optimizer are in the same monorepo. Prevents unnecessary Cloud Run deploys on frontend-only changes.

**Trade-offs:** Reduces CI cost and deploy noise. Requires careful path configuration to avoid missing relevant changes (e.g., adding `pyproject.toml` later).

## Anti-Patterns

### Anti-Pattern 1: Enabling Cloud Run IAM Authentication with CORS

**What people do:** Enable "Require authentication" on the Cloud Run service to restrict access.

**Why it's wrong:** Cloud Run's IAM layer intercepts ALL requests including browser preflight OPTIONS requests. It returns HTTP 403 before FastAPI even sees the request. Browsers cannot attach Authorization headers to preflight requests by design, so the preflight always fails, blocking all cross-origin requests.

**Do this instead:** Use `--allow-unauthenticated` and enforce auth in FastAPI application code using the Supabase JWT. The application boundary is the correct auth enforcement point.

### Anti-Pattern 2: Using service_role Key in the Optimizer

**What people do:** Give the optimizer the Supabase `service_role` key so it can bypass RLS and access any project's data.

**Why it's wrong:** Defeats Supabase's RLS enforcement entirely. Any authenticated user could theoretically cause the optimizer to fetch another user's project data.

**Do this instead:** Use the `anon` key as `apikey` and the user's Bearer token as `Authorization`. RLS remains enforced. The optimizer can only access data the authenticated user is allowed to see.

### Anti-Pattern 3: High Concurrency on a CPU-Bound Service

**What people do:** Leave Cloud Run's default concurrency (80 concurrent requests per instance).

**Why it's wrong:** CP-SAT is CPU-bound and uses multiple threads. Two concurrent solve operations on the same instance compete for the same CPU cores, causing both to run slower than if handled sequentially on separate instances.

**Do this instead:** Set `--concurrency 1`. Cloud Run will scale out horizontally instead, giving each solve its own CPU budget.

### Anti-Pattern 4: Hardcoding CORS Allow Origins as "*"

**What people do:** Use `allow_origins=["*"]` in CORSMiddleware for simplicity.

**Why it's wrong:** Browsers refuse to pass Authorization headers (or any credentials) to responses with `Access-Control-Allow-Origin: *`. The optimizer calls require the Authorization header, so this breaks auth.

**Do this instead:** Set `allow_origins` to the explicit Vercel domain(s). Use an environment variable so it is configurable across environments without code changes.

## Integration Points

### External Services

| Service | Integration Pattern | Key Notes |
|---------|---------------------|-----------|
| Supabase (from optimizer) | HTTP REST via urllib (stdlib) | Uses user Bearer JWT + anon apikey. Timeout=10s per request. No SDK dependency in the container. |
| Supabase (from frontend) | supabase-js SDK | Direct browser calls; RLS enforced; no optimizer involvement |
| Cloud Run (from frontend) | fetch() with Bearer header | VITE_OPTIMIZER_URL must be set in Vercel env vars |
| Artifact Registry | docker push via gcloud auth | Same GCP project and region as Cloud Run |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Vercel SPA → Cloud Run | HTTPS fetch, JSON body, Authorization header | CORS must be configured; connection from Vercel edge is not special — it is a regular internet HTTPS call |
| Cloud Run → Supabase | HTTPS (urllib), JSON response | Supabase REST API. Optimizer validates user first (/auth/v1/user), then reads tables. RLS applies to all reads. |
| GitHub Actions → Artifact Registry | docker push authenticated via Workload Identity | No long-lived keys needed |
| GitHub Actions → Cloud Run | gcloud run deploy | Requires run.admin + iam.serviceAccountUser roles |

## New vs Modified Components

| Component | Status | What Changes |
|-----------|--------|--------------|
| `api/optimizer.py` | Modified | Add CORSMiddleware mount; add CORS_ALLOWED_ORIGINS env var support |
| `docker/optimizer.Dockerfile` | No change | Already correct for Cloud Run deployment |
| `src/lib/api.ts` | No change | Already reads VITE_OPTIMIZER_URL correctly |
| `docker-compose.yml` | No change | Local dev stack unchanged |
| `.github/workflows/deploy-optimizer.yml` | New | GitHub Actions CI/CD pipeline |
| Vercel project settings | Configuration | Add VITE_OPTIMIZER_URL pointing to Cloud Run URL |
| GCP project | New resource | Artifact Registry repo + Cloud Run service + IAM bindings |

## Suggested Build Order

The following order respects hard dependencies between steps:

1. **GCP project setup** — Create Artifact Registry repository, Cloud Run service account, IAM bindings. Produces the registry URL and service account email needed by later steps.

2. **Add CORS middleware to optimizer** — Modify `api/optimizer.py` to mount CORSMiddleware reading `CORS_ALLOWED_ORIGINS`. This is a code change that must land before the Docker image is built.

3. **Manual first deploy** — Build the image locally, push to Artifact Registry, deploy to Cloud Run with `gcloud run deploy` manually. This validates the container boots and the environment variables reach FastAPI before CI/CD is wired.

4. **Smoke test the Cloud Run URL** — Use curl with a real Supabase JWT to confirm `/project` returns a valid optimization result end-to-end before touching Vercel.

5. **Set Vercel environment variable** — Add `VITE_OPTIMIZER_URL` in the Vercel dashboard pointing to the deployed Cloud Run URL. Trigger a Vercel redeploy. Confirm the frontend can reach Cloud Run and the full browser flow works.

6. **Wire GitHub Actions CI/CD** — Add `.github/workflows/deploy-optimizer.yml`. Configure Workload Identity Federation in GCP. Confirm the workflow fires and deploys successfully on a push to main.

This order ensures each integration point is validated before the next is added, making failures easy to isolate.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single school (1-10 concurrent users) | Current plan: min-instances=1, concurrency=1, timeout=3600s. No changes needed. |
| District (10-100 concurrent optimize calls) | Cloud Run autoscales horizontally. Each instance handles 1 solve. No architecture change, just observe auto-scaling costs. |
| Multi-district (100+ concurrent) | Consider async job queue (Cloud Tasks or Pub/Sub) with polling — deferred per PROJECT.md. Sync model remains correct until 60s timeout is a real problem. |

## Sources

- [Cloud Run request timeout configuration](https://docs.cloud.google.com/run/docs/configuring/request-timeout) — confirmed 60 minute max (HIGH confidence)
- [Cloud Run CORS with IAM auth issue tracker](https://issuetracker.google.com/issues/168707835) — confirms OPTIONS preflight blocked by IAM auth (HIGH confidence)
- [FastAPI CORSMiddleware docs](https://fastapi.tiangolo.com/tutorial/cors/) — allow_origins with credentials requires explicit origins, not "*" (HIGH confidence)
- [Allowing public unauthenticated access on Cloud Run](https://docs.cloud.google.com/run/docs/authenticating/public) — --allow-unauthenticated flag (HIGH confidence)
- [Deploying to Cloud Run using Cloud Build / GitHub Actions](https://cloud.google.com/blog/products/devops-sre/deploy-to-cloud-run-with-github-actions) — CI/CD pattern (HIGH confidence)
- [google-github-actions/deploy-cloudrun](https://github.com/google-github-actions/deploy-cloudrun) — official GitHub Action for Cloud Run (HIGH confidence)
- [Set minimum instances for services](https://docs.cloud.google.com/run/docs/configuring/min-instances) — min-instances=1 to avoid cold starts (HIGH confidence)
- [Optimize Python applications for Cloud Run](https://cloud.google.com/run/docs/tips/python) — slim image, import optimization (MEDIUM confidence for OR-Tools specific timing)

---
*Architecture research for: SkoleGeni v1.1 — Cloud Run deployment*
*Researched: 2026-03-21*
