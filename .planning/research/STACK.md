# Stack Research

**Domain:** Cloud deployment of FastAPI + OR-Tools optimizer to Google Cloud Run
**Researched:** 2026-03-21
**Confidence:** HIGH (GCP services and configuration verified against official documentation)

---

## Context

This document covers only what is new or changed for v1.1. The existing stack (React + Vite on Vercel, FastAPI + OR-Tools optimizer, Supabase for persistence/auth) is validated and unchanged. The question is: what GCP services, configuration values, and code changes are needed to deploy the optimizer container to Cloud Run?

---

## Recommended Stack

### Core Technologies

| Technology | Version/Tier | Purpose | Why Recommended |
|------------|-------------|---------|-----------------|
| Google Cloud Run | Gen 2, fully managed | Host the FastAPI + OR-Tools container | Serverless, scales to zero when not in use, supports synchronous requests up to 60 min, no Kubernetes overhead, pays per request |
| Google Artifact Registry | Docker format | Container image storage | Official GCP replacement for Container Registry (gcr.io is deprecated); same-region pull is free and fast; required for Cloud Run deployments |
| FastAPI CORSMiddleware | starlette (bundled with fastapi) | Allow Vercel origin to call Cloud Run | Already a FastAPI built-in; no new dependency needed |
| Supabase JWT (existing) | — | Auth forwarding from browser to optimizer | Frontend already sends `Authorization: Bearer <supabase_token>`; optimizer already validates it against Supabase; no change needed |

### GCP Services Required

| Service | Required | Purpose | Notes |
|---------|----------|---------|-------|
| Cloud Run | Yes | Run optimizer container | Single service, single region |
| Artifact Registry | Yes | Store Docker images | Create one `docker` format repository |
| Cloud Build | Optional | CI/CD image build + deploy | gcloud SDK local build works fine for v1.1 |
| Secret Manager | Optional | Store env vars as secrets | Env vars via `--set-env-vars` is sufficient for v1.1 |
| Cloud IAM | Yes (implicit) | Allow public invocations | `--allow-unauthenticated` is correct here; app-level auth is Supabase JWT |

### GCP Services Explicitly NOT Needed for v1.1

| Service | Why Not |
|---------|---------|
| Cloud Tasks | No async job queue; optimizer is synchronous per requirements |
| Pub/Sub | No event-driven processing needed |
| Cloud Scheduler | No periodic jobs |
| Cloud SQL | Supabase already handles persistence |
| Load Balancer | Cloud Run has a built-in HTTPS endpoint |
| VPC / Private networking | Not required for public API; adds complexity |

---

## Cloud Run Configuration

### Memory and CPU

OR-Tools CP-SAT is a CPU-bound solver that loads its entire model into memory before solving. The existing school-roster problem (typically 30–250 pupils, 4–12 decision variables per pupil pair) is small by CP-SAT standards. The Docker image with python:3.12-slim + ortools will consume roughly 200–350 MB at startup.

| Setting | Recommended Value | Rationale |
|---------|------------------|-----------|
| Memory | **2 GiB** | OR-Tools wheel is ~30 MB; Python interpreter + FastAPI ~100 MB; solver peak ~200–400 MB for school-scale problems; 2 GiB gives 4× headroom before OOM kill |
| CPU | **1 vCPU** | OR-Tools CP-SAT uses multiple threads internally; 1 vCPU is sufficient for single-user school-scale problems; increase to 2 vCPU only if solve time exceeds 30s in production testing |
| Concurrency | **1** | Each optimization run is CPU-bound and occupies the full core for its duration; setting concurrency=1 ensures Cloud Run spawns a new instance per simultaneous request rather than queuing them on one instance |
| Min instances | **0** | School admins run the optimizer infrequently (once or twice per project setup); cold starts of 5–10s are acceptable; min=0 eliminates idle instance cost entirely |
| Max instances | **3** | Prevents runaway scaling; a single school district is unlikely to run more than 3 simultaneous optimizations |
| Request timeout | **300 seconds (5 minutes)** | Default. School-scale CP-SAT problems solve in under 60s empirically; 300s provides a 5× buffer without requiring beta features |
| Startup CPU boost | **Enabled (`--cpu-boost`)** | Reduces cold start from ~5–8s to ~2–4s for Python containers; adds negligible cost; OR-Tools import at startup is the main cold-start cost |
| Execution environment | **Gen 2** | Better performance for CPU-bound workloads; required for startup CPU boost |

### Deployment Command (reference)

```bash
# One-time: create Artifact Registry repository
gcloud artifacts repositories create skolegeni \
  --repository-format=docker \
  --location=europe-west1 \
  --description="SkoleGeni optimizer images"

# Configure Docker auth for Artifact Registry
gcloud auth configure-docker europe-west1-docker.pkg.dev

# Build and push image
docker build -f docker/optimizer.Dockerfile \
  -t europe-west1-docker.pkg.dev/PROJECT_ID/skolegeni/optimizer:latest .
docker push europe-west1-docker.pkg.dev/PROJECT_ID/skolegeni/optimizer:latest

# Deploy to Cloud Run
gcloud run deploy skolegeni-optimizer \
  --image europe-west1-docker.pkg.dev/PROJECT_ID/skolegeni/optimizer:latest \
  --region europe-west1 \
  --memory 2Gi \
  --cpu 1 \
  --concurrency 1 \
  --min-instances 0 \
  --max-instances 3 \
  --timeout 300 \
  --cpu-boost \
  --execution-environment gen2 \
  --allow-unauthenticated \
  --set-env-vars SUPABASE_URL=https://YOUR_REF.supabase.co,SUPABASE_ANON_KEY=YOUR_KEY \
  --port 8000
```

---

## CORS Configuration

The optimizer currently has no CORS middleware. This must be added before Cloud Run deployment — the Vercel frontend at `https://[project].vercel.app` makes cross-origin requests to Cloud Run.

### Required Code Change in `api/optimizer.py`

```python
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Read allowed origins from env so they can be overridden per-environment.
# Fallback includes localhost for local Docker development.
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
```

### Environment Variable

Set `ALLOWED_ORIGINS` in the Cloud Run deployment:

```
ALLOWED_ORIGINS=https://skolegeni.vercel.app,https://skolegeni-git-main-yourteam.vercel.app
```

**Do not use `allow_origins=["*"]` with `allow_credentials=True`.** Browsers reject this combination per the CORS spec. You must list specific origins.

---

## Auth Forwarding

No changes needed to auth forwarding. The current design already works correctly for Cloud Run:

1. Browser acquires Supabase JWT via `supabase.auth.getSession()`.
2. Frontend sends `Authorization: Bearer <token>` to the optimizer (code in `src/lib/api.ts` lines 153–168, 214–222).
3. Cloud Run with `--allow-unauthenticated` passes all HTTP headers through unchanged to the container.
4. Optimizer validates the JWT by calling `SUPABASE_URL/auth/v1/user` with the forwarded token (code in `api/optimizer.py` lines 172–199).

Cloud Run IAM authentication (`--no-allow-unauthenticated`) is **not** appropriate here. That would require the Vercel frontend to generate a Google identity token for Cloud Run, which requires a service account — unnecessary complexity when the optimizer already performs its own Supabase JWT validation.

---

## Environment Variables

### Cloud Run environment variables (set at deploy time)

| Variable | Value | Source |
|----------|-------|--------|
| `SUPABASE_URL` | `https://YOUR_REF.supabase.co` | Supabase dashboard |
| `SUPABASE_ANON_KEY` | Supabase anon/public key | Supabase dashboard |
| `ALLOWED_ORIGINS` | Comma-separated list of Vercel URLs | Vercel dashboard / project settings |

The optimizer already reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` (with fallbacks to `VITE_SUPABASE_*` names). The `VITE_` prefix variables should not be set in Cloud Run — they are browser-only build-time variables and have no meaning server-side.

### Vercel environment variable (existing, update value)

| Variable | Current Value | New Value |
|----------|---------------|-----------|
| `VITE_OPTIMIZER_URL` | `/api/optimizer` | `https://skolegeni-optimizer-HASH-ew.a.run.app` |

The Cloud Run service URL is assigned after first deployment. Grab it from the deploy output and set it in Vercel's environment variables (Production + Preview environments).

---

## Supporting Libraries

No new Python dependencies needed. The existing `requirements.txt` (fastapi, ortools, uvicorn, httpx, pytest) covers everything. CORSMiddleware ships with Starlette which is already a transitive dependency of FastAPI.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Cloud Run (Gen 2) | Cloud Run Gen 1 | Gen 1 lacks startup CPU boost; Gen 2 is now the default for new services |
| Artifact Registry | Container Registry (gcr.io) | Container Registry is deprecated; GCP recommends migrating to Artifact Registry |
| `--allow-unauthenticated` + Supabase JWT | Cloud Run IAM auth | IAM auth requires frontend to generate GCP identity tokens; the optimizer already validates Supabase JWTs, making double-auth unnecessary overhead |
| Concurrency=1 | Concurrency=80 (default) | CP-SAT is CPU-bound, not I/O-bound; high concurrency would serialize compute-heavy requests on a single vCPU, degrading all callers |
| Min-instances=0 | Min-instances=1 | Usage is infrequent (once per project setup session); $10–15/month idle cost is not justified at this stage |
| 300s timeout | 900s or longer | School-scale problems solve well under 60s; 300s is safe without enabling beta timeout features |
| Env vars via `--set-env-vars` | Secret Manager | Secret Manager adds IAM complexity; for two non-rotating Supabase keys this is unnecessary in v1.1 |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Async job queue (Cloud Tasks, Pub/Sub) | Explicitly deferred per PROJECT.md; synchronous Cloud Run timeout is sufficient | Synchronous POST with 300s timeout |
| Multiple Cloud Run services | Single optimizer service covers all endpoints; no microservice split needed | Single Cloud Run service |
| Cloud CDN or Load Balancer | Cloud Run includes a managed HTTPS endpoint with global anycast | Cloud Run's built-in endpoint |
| gunicorn with multiple uvicorn workers | Adds complexity; CP-SAT benefits from having the full CPU; Cloud Run scales by spawning new instances | Single uvicorn worker (current CMD in Dockerfile) |
| Docker multi-stage build | python:3.12-slim is already lean; OR-Tools wheel (~30 MB) dominates size regardless | Current single-stage Dockerfile |

---

## Cost Estimate

Assumptions: school district, optimizer called ~50 times/month, each call takes 30s average, 2 GiB memory, 1 vCPU.

| Component | Monthly compute | Free tier covers | Billable |
|-----------|----------------|-----------------|---------|
| CPU (vCPU-seconds) | 50 × 30 = 1,500 vCPU-s | 180,000 vCPU-s/month free | $0 |
| Memory (GiB-seconds) | 50 × 30 × 2 = 3,000 GiB-s | 360,000 GiB-s/month free | $0 |
| Requests | 50 + preflight OPTIONS | 2 million/month free | $0 |
| Artifact Registry storage | ~500 MB image | 0.5 GB free | ~$0.05 |
| **Total** | | | **~$0.05/month** |

At min-instances=0, idle cost is $0. Even a 10× usage increase (500 calls/month) stays well within the free tier.

---

## Version Compatibility

| Package | Tested Combination | Notes |
|---------|-------------------|-------|
| python:3.12-slim | ortools 9.15.x | OR-Tools 9.x supports Python 3.12; verify wheel availability on PyPI before pinning |
| fastapi (latest) | starlette CORSMiddleware | CORSMiddleware is bundled; no separate starlette install needed |
| uvicorn | Cloud Run Gen 2 | Single-worker uvicorn is correct for Cloud Run; do not add `--workers N` flag |

---

## Sources

- [Configure memory limits — Cloud Run docs](https://docs.cloud.google.com/run/docs/configuring/services/memory-limits) — memory default 512 MiB, max 32 GiB, OOM = instance termination
- [Configure CPU limits — Cloud Run docs](https://docs.cloud.google.com/run/docs/configuring/services/cpu) — 1 vCPU default, up to 4 vCPU per instance
- [Set minimum instances — Cloud Run docs](https://docs.cloud.google.com/run/docs/configuring/min-instances) — min=0 means scale to zero; billing stops when idle
- [Configure request timeout — Cloud Run docs](https://docs.cloud.google.com/run/docs/configuring/request-timeout) — default 300s, max 3600s (>15 min is beta)
- [Push and pull images — Artifact Registry docs](https://cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling) — gcloud auth configure-docker, image URL format
- [Deploying to Cloud Run — Artifact Registry docs](https://docs.cloud.google.com/artifact-registry/docs/integrate-cloud-run) — same-region pull, IAM binding
- [Allowing public access — Cloud Run docs](https://docs.cloud.google.com/run/docs/authenticating/public) — --allow-unauthenticated and allUsers binding
- [CORS middleware — FastAPI docs](https://fastapi.tiangolo.com/tutorial/cors/) — CORSMiddleware, allow_credentials + wildcard restriction
- [Cloud Run pricing — cloudchipr.com](https://cloudchipr.com/blog/cloud-run-pricing) — $0.000024/vCPU-s, $0.0000025/GiB-s, free tier limits (MEDIUM confidence)
- [Cloud Run cold start optimization — markaicode.com](https://markaicode.com/google-cloud-run-cold-start-optimization-2025/) — startup CPU boost reduces cold starts 30–50% (MEDIUM confidence)
- [OR-Tools PyPI page](https://pypi.org/project/ortools/) — wheel size ~30 MB for Linux x86-64, version 9.15.x

---

*Stack research for: Cloud Run deployment of FastAPI + OR-Tools optimizer*
*Researched: 2026-03-21*
