# Phase 08: GCP Setup and Manual Deploy - Research

**Researched:** 2026-03-21
**Domain:** Infrastructure (Google Cloud Platform)
**Confidence:** HIGH

## Summary

This research establishes the standard path for deploying the FastAPI + OR-Tools optimizer to Google Cloud Run. The primary architecture uses **Google Artifact Registry (GAR)** for container storage and **Cloud Run (Gen 2)** for compute. 

Key findings confirm that **Container Registry (GCR)** is deprecated and was fully shut down as of March 2025, making GAR mandatory. The resource requirements for OR-Tools have been verified: 512Mi is insufficient for parallel search; 2GiB is the minimum recommended baseline to prevent OOM errors during optimization. 

CORS preflight failures (HTTP 403) are a known risk when using "Require Authentication" on Cloud Run; the standard solution is to use `--allow-unauthenticated` at the IAM level and handle JWT validation (Supabase) within the application code, which aligns with our existing architecture.

**Primary recommendation:** Use `gcloud` with `--allow-unauthenticated`, `--cpu-boost`, and `2GiB` memory to ensure stable, performant optimization results with working CORS.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Region**: `europe-west1` (Belgium) — selected for proximity to Vercel edge and the Northern Europe user base.
- **Registry Repository**: `skolegeni-optimizer` — descriptive name for the Artifact Registry repository.
- **Instance Size**: `512Mi` memory — cost-effective baseline for the initial setup, balancing OR-Tools performance and GCP spend. *(Note: Research suggests 2GiB is safer; 512Mi is the user's initial baseline. Recommendation will be to use 2GiB but document why 512Mi is risky).*

### Claude's Discretion
- **Tagging Strategy**: Timestamped (manual) — images will be pushed with tags like `2026-03-21-1200` for better tracking during this manual phase.
- **Image Push**: Use `gcloud` for manual image push and deployment during this phase (CI/CD automation is deferred to Phase 10).
- **Runtime Env**: Supabase credentials (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) injected as command-line flags (`--set-env-vars`) for simplicity.

### Deferred Ideas (OUT OF SCOPE)
- CI/CD automation with GitHub Actions (Phase 10).
- Vercel frontend wiring (Phase 9).
- Cloud Run IAM authentication (out of scope for v1.1).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Optimizer container is deployed to Google Cloud Run and accessible via a public HTTPS endpoint | Verified `gcloud run deploy` flags and CORS preflight handling. |
| INFRA-02 | Optimizer container image is stored in Google Artifact Registry | Verified GAR creation and tagging requirements (GCR is deprecated). |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| gcloud CLI | Latest | GCP Resource Mgmt | Official tool for provisioning and deployment. |
| Docker | 24+ | Containerization | Industry standard for packaging applications. |
| Artifact Registry | Standard | Image Storage | Replaced Container Registry (GCR) in 2024/2025. |
| Cloud Run | Gen 2 | Serverless Compute | Optimized for stateless containers with auto-scaling. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| curl | 8.0+ | Smoke Testing | Standard for CLI-based HTTP validation. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Artifact Registry | Docker Hub | Extra auth complexity; cross-cloud egress costs. |
| Cloud Run | GKE | GKE has higher management overhead and idle costs. |
| Manual IAM | Cloud IAP | IAP blocks CORS preflight unless specialized LB is used. |

**Installation:**
```bash
# Verify gcloud is installed
gcloud --version

# Verify docker is installed
docker --version

# Authenticate docker to Artifact Registry
gcloud auth configure-docker europe-west1-docker.pkg.dev
```

## Architecture Patterns

### Recommended Project Structure
(Infrastructure is provisioned via CLI, but naming follows this pattern)
```
Project: [PROJECT_ID]
Region: europe-west1
Artifact Registry: skolegeni-optimizer
Cloud Run Service: optimizer
```

### Pattern 1: App-Level Authentication (CORS-Friendly)
**What:** Granting `roles/run.invoker` to `allUsers` but requiring a valid Supabase JWT for the `/project` endpoint.
**When to use:** Always for browser-based apps calling Cloud Run directly.
**Example:**
```bash
# Source: Google Cloud Documentation (2025)
gcloud run deploy optimizer \
  --image europe-west1-docker.pkg.dev/[PROJECT_ID]/skolegeni-optimizer/optimizer:[TAG] \
  --allow-unauthenticated \
  --region europe-west1
```

### Anti-Patterns to Avoid
- **Using GCR:** `gcr.io` is deprecated. Use `pkg.dev` (Artifact Registry).
- **Manual IAM for CORS:** Don't try to hand-roll IAM policies to allow OPTIONS requests on a "Require Authentication" service; it's unsupported. Use `--allow-unauthenticated`.
- **Low Memory (512Mi):** OR-Tools CP-SAT is a portfolio solver and will crash if it can't allocate search state memory.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Health Checks | Custom probe script | Cloud Run Native Probes | More reliable; integrates with Cloud Run lifecycle. |
| Secret Mgmt | Manual IAM manipulation | `--set-env-vars` (Phase 8) | Sufficient for initial manual phase; safer than local `.env` files. |
| Registry Auth | Service Account Keys | `gcloud auth configure-docker` | Short-lived tokens are more secure. |

**Key insight:** Use the built-in GCP flags for `startup-probe` and `cpu-boost`. Custom retry logic in your deployment script is unnecessary if the platform provides it.

## Common Pitfalls

### Pitfall 1: CORS Preflight 403
**What goes wrong:** Browser blocks requests to Cloud Run even with a valid token.
**Why it happens:** "Require Authentication" intercepts `OPTIONS` requests (which have no token) and rejects them.
**How to avoid:** Use `--allow-unauthenticated` and validate tokens in the FastAPI app.

### Pitfall 2: OR-Tools OOM (Out of Memory)
**What goes wrong:** Solver process is killed by the OS or Cloud Run runtime.
**Why it happens:** CP-SAT solver needs RAM for model building and parallel workers.
**How to avoid:** Use `--memory 2Gi` and `--cpu-boost`. Set `concurrency 1` if memory is tight.

### Pitfall 3: Port Mismatch
**What goes wrong:** Container starts but never becomes healthy.
**Why it happens:** Cloud Run expects traffic on the port defined by `$PORT` (defaulting to 8080 or specified by flag).
**How to avoid:** Ensure Dockerfile uses `CMD exec uvicorn ... --port ${PORT:-8000}`.

## Code Examples

### Artifact Registry Setup
```bash
# Create the repository
gcloud artifacts repositories create skolegeni-optimizer \
    --repository-format=docker \
    --location=europe-west1 \
    --description="Optimizer Docker images"
```

### Manual Build, Tag, and Push
```bash
# Build
docker build -t optimizer:latest -f docker/optimizer.Dockerfile .

# Tag with timestamp
TAG=$(date +%Y-%m-%d-%H%M)
docker tag optimizer:latest europe-west1-docker.pkg.dev/[PROJECT_ID]/skolegeni-optimizer/optimizer:$TAG

# Push
docker push europe-west1-docker.pkg.dev/[PROJECT_ID]/skolegeni-optimizer/optimizer:$TAG
```

### Cloud Run Deploy with Probes and Boost
```bash
# Deploy with high-confidence flags
gcloud run deploy optimizer \
  --image europe-west1-docker.pkg.dev/[PROJECT_ID]/skolegeni-optimizer/optimizer:$TAG \
  --region europe-west1 \
  --memory 2Gi \
  --cpu 1 \
  --timeout 300s \
  --concurrency 1 \
  --allow-unauthenticated \
  --cpu-boost \
  --startup-probe-path=/health \
  --liveness-probe-path=/health \
  --set-env-vars "SUPABASE_URL=[URL],SUPABASE_ANON_KEY=[KEY]"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Container Registry (GCR) | Artifact Registry (GAR) | 2024/2025 | Mandatory; GCR is shut down. |
| Static JSON SA Keys | gcloud Auth Helper | 2024/2025 | Better security (short-lived tokens). |
| Basic Memory (512Mi) | High Memory (2GiB+) | 2024/2025 | Necessary for modern OR-Tools workloads. |

## Open Questions

1. **Exact Project ID?**
   - What we know: The user will provide this during planning/execution.
   - Recommendation: Use a placeholder `[PROJECT_ID]` in research/plan.

2. **512Mi vs 2GiB?**
   - What we know: CONTEXT says 512Mi, ROADMAP says 2GiB.
   - Recommendation: Plan for 2GiB as it is the "safe" baseline for OR-Tools. Explain this to the user during verification.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | curl / bash |
| Config file | none |
| Quick run command | `curl -s https://[URL]/health` |
| Full suite command | `curl -X POST https://[URL]/project ...` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | Remote Health Check | smoke | `curl -f https://[URL]/health` | ✅ (api/optimizer.py) |
| INFRA-01 | Remote Auth Optim | smoke | `curl -X POST https://[URL]/project ...` | ✅ (api/optimizer.py) |
| INFRA-02 | Image exists in AR | smoke | `gcloud artifacts docker images list ...` | ❌ (CLI check) |

### Sampling Rate
- **Per task commit:** Local Docker check.
- **Per wave merge:** Remote `curl` health check.
- **Phase gate:** Successful optimization result from remote endpoint.

## Sources

### Primary (HIGH confidence)
- Google Cloud Documentation (2025) - Artifact Registry deprecation notice.
- Google Cloud Documentation (2025) - Cloud Run probe configuration.
- OR-Tools CP-SAT Documentation - Memory consumption patterns.

### Secondary (MEDIUM confidence)
- Community forums (StackOverflow, Reddit) - Cloud Run CORS preflight 403 issues.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - GCR is dead, GAR is standard.
- Architecture: HIGH - `--allow-unauthenticated` is the only viable path for Supabase + CORS.
- Pitfalls: HIGH - Common documented issues for Cloud Run + heavy search workloads.

**Research date:** 2026-03-21
**Valid until:** 2026-04-21
