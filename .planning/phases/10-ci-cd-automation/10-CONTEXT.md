# Phase 10: CI/CD Automation - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Automate optimizer builds and deploys to Cloud Run on every push to main that touches optimizer files. Uses GitHub Actions with Workload Identity Federation — no long-lived service account key JSON stored in GitHub Secrets. Non-optimizer pushes must not trigger a Cloud Run deploy.

</domain>

<decisions>
## Implementation Decisions

### Env vars in workflow
- Store `SUPABASE_URL` and `SUPABASE_ANON_KEY` as GitHub repository secrets, referenced as `${{ secrets.SUPABASE_URL }}` and `${{ secrets.SUPABASE_ANON_KEY }}` in the workflow YAML.
- Re-inject all Cloud Run runtime flags on every deploy: `--memory`, `--timeout`, `--concurrency`, `--max-instances`, `--allow-unauthenticated`, and `--set-env-vars`. Config is fully declarative in the workflow file — no drift if someone tweaks settings in the GCP console.

### Post-deploy verification
- After `gcloud run deploy` completes, curl the Cloud Run `/health` endpoint to confirm the new revision is actually serving traffic.
- HTTP 200 is sufficient — `/health` already returns 200 only when OR-Tools is loaded and ready. No need to parse the response body.

### Failure notifications
- Rely on GitHub's default behavior: mark the workflow run as failed and send an email to the pusher. No Slack webhook or additional notification setup needed for this low-traffic school tool.

### Path triggers (from success criteria — locked)
- Workflow triggers on push to `main` when files under `api/**` or `docker/optimizer.Dockerfile` are changed.
- Pushes that touch neither path must NOT trigger a Cloud Run deploy.

### Workload Identity Federation (from requirements — locked)
- No long-lived service account key JSON stored in GitHub Secrets.
- Use Google's `google-github-actions/auth` action with WIF for authentication.

### Claude's Discretion
- Image tagging strategy — git SHA is the standard for CI (best for traceability and rollback). Claude may use `${{ github.sha }}` as the image tag.
- Exact GCP project ID, service name, and WIF pool/provider resource names — Claude should derive these from prior phase deployment details or prompt the researcher to confirm.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing deployment config
- `.planning/phases/08-gcp-setup-and-manual-deploy/08-CONTEXT.md` — Region (`europe-west1`), registry name (`skolegeni-optimizer`), Cloud Run flags (2 GiB memory, 300s timeout, concurrency=1, `--allow-unauthenticated`), env var injection approach
- `.planning/STATE.md` — Cloud Run URL (`https://optimizer-ek4bkd34ja-ew.a.run.app`), accumulated deployment decisions including WIF requirement and Supabase key choices

### Roadmap and requirements
- `.planning/ROADMAP.md` — Phase 10 goal and success criteria (INFRA-03)
- `.planning/REQUIREMENTS.md` — INFRA-03: pushes to main automatically build and deploy the optimizer via GitHub Actions with Workload Identity Federation

### Optimizer source
- `docker/optimizer.Dockerfile` — The Dockerfile being built and pushed; its path is used in the path filter trigger
- `api/optimizer.py` — FastAPI app; changes here should also trigger a deploy

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `docker/optimizer.Dockerfile`: already production-ready with `PYTHONUNBUFFERED=1`, shell-form CMD with `${PORT:-8000}` — no changes expected before CI automates builds
- `api/optimizer.py`: `/health` endpoint returns HTTP 200 when OR-Tools is ready — used as the post-deploy verification target

### Established Patterns
- Manual deploy in Phase 8 used `gcloud artifacts repositories create`, `docker build/tag/push`, and `gcloud run deploy` with explicit flags — the workflow replicates this sequence
- Cloud Run service was deployed with `--allow-unauthenticated`; this flag must be re-applied on every automated deploy

### Integration Points
- GitHub repository: the workflow file lives at `.github/workflows/deploy-optimizer.yml` (to be created)
- GCP Workload Identity Federation: requires a WIF pool and provider configured in GCP, plus a service account with Artifact Registry writer and Cloud Run deployer roles
- No existing `.github/` directory — this phase creates the first GitHub Actions workflow in the repo

</code_context>

<specifics>
## Specific Ideas

- No specific references given — standard GitHub Actions + google-github-actions/auth + google-github-actions/deploy-cloudrun approach is fine.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-ci-cd-automation*
*Context gathered: 2026-03-22*
