# Phase 8: GCP Setup and Manual Deploy - Context

**Gathered:** 2026-03-21
**Status:** Ready for research/planning

<domain>
## Phase Boundary

This phase transitions the optimizer from a local Docker container to a cloud-hosted service on Google Cloud Run. It covers the initial GCP infrastructure setup (Artifact Registry, Cloud Run service) and a manual deployment push. It ends with a successful remote health check and authenticated optimization run from a stable test project.

</domain>

<decisions>
## Implementation Decisions

### Infrastructure & Region
- **Region**: `europe-west1` (Belgium) — selected for proximity to Vercel edge and the Northern Europe user base.
- **Registry Repository**: `skolegeni-optimizer` — descriptive name for the Artifact Registry repository.
- **Instance Size**: `512Mi` memory — cost-effective baseline for the initial setup, balancing OR-Tools performance and GCP spend.

### Deployment & Tagging
- **Tagging Strategy**: Timestamped (manual) — images will be pushed with tags like `2026-03-21-1200` for better tracking during this manual phase.
- **Image Push**: Use `gcloud` for manual image push and deployment during this phase (CI/CD automation is deferred to Phase 10).
- **Runtime Env**: Supabase credentials (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) injected as command-line flags (`--set-env-vars`) for simplicity.

### Remote Verification
- **Smoke Test Data**: Use a dedicated "smoke-test-project" in the live Supabase instance for stability and repeatability.
- **Smoke Test Auth**: Use a stable "test user" with fixed credentials to obtain a reliable JWT for the `/project` check.
- **Verification Tool**: Use `curl` for all remote health checks and endpoint validation from the command line.

</decisions>

<canonical_refs>
## Canonical References

### Product and roadmap
- `.planning/PROJECT.md` — v1.1 milestone overview and goal: "Optimizer in Cloud"
- `.planning/REQUIREMENTS.md` — Infrastructure and wiring requirements: `INFRA-01` to `WIRE-02`
- `.planning/ROADMAP.md` — Phase 8 boundary and success criteria
- `.planning/STATE.md` — Current milestone status

### Existing implementation
- `docker/optimizer.Dockerfile` — Current Docker configuration for the optimizer
- `api/optimizer.py` — FastAPI application with health check and project optimization endpoints
- `PRD.md` — Product intent and workflow context

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `docker/optimizer.Dockerfile`: uses `${PORT:-8000}` for Cloud Run port injection (from Phase 7).
- `api.optimizer:app`: ready with `/health` and `/project` endpoints (from Phase 7).

### Established Patterns
- RLS-aware optimization: the optimizer uses Supabase `anon` key + user `Authorization` header to fetch data.
- Unbuffered output: `PYTHONUNBUFFERED=1` is already in the Dockerfile for Cloud Run logging.

### Integration Points
- `gcloud` CLI: required for artifact registry and cloud run deployment.
- Supabase Project Settings: source for the required environment variables.

</code_context>

<specifics>
## Specific Ideas
- Use `gcloud artifacts repositories create` for the initial registry setup.
- Use `docker tag` with a timestamp before `docker push` for clear version tracking.
- Create the smoke test project manually in the Supabase UI before running the verification steps.

</specifics>

<deferred>
## Deferred Ideas
- CI/CD automation with GitHub Actions (Phase 10).
- Vercel frontend wiring (Phase 9).
- Cloud Run IAM authentication (out of scope for v1.1).

</deferred>

---

*Phase: 08-gcp-setup-and-manual-deploy*
*Context gathered: 2026-03-21*
