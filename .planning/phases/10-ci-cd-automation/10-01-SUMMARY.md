---
phase: 10-ci-cd-automation
plan: 01
subsystem: infra
tags: [github-actions, cloud-run, artifact-registry, workload-identity-federation, docker, gcp, ci-cd]

# Dependency graph
requires:
  - phase: 08-gcp-setup-and-manual-deploy
    provides: Cloud Run service (optimizer), Artifact Registry (skolegeni-optimizer), europe-west1 region, runtime flags (2Gi memory, 300s timeout, concurrency=1)
provides:
  - GitHub Actions workflow that automates optimizer builds and Cloud Run deploys on push to main
  - Path-filtered trigger scoped to api/** and docker/optimizer.Dockerfile
  - Keyless GCP authentication via Workload Identity Federation
  - Declarative runtime config for Cloud Run service in source control
affects: [future-ci-phases, optimizer-deploys, gcp-infra]

# Tech tracking
tech-stack:
  added: [google-github-actions/auth@v3, google-github-actions/deploy-cloudrun@v3, actions/checkout@v4]
  patterns: [WIF-keyless-auth, git-sha-image-tagging, declarative-cloudrun-flags, path-filtered-ci-trigger, post-deploy-health-verification]

key-files:
  created:
    - .github/workflows/deploy-optimizer.yml
  modified: []

key-decisions:
  - "Use github.sha as Docker image tag for traceability and rollback capability — never tag as latest only"
  - "Set id-token: write permission at job level (not workflow level) — required for OIDC token issuance"
  - "Pass all Cloud Run runtime flags via flags: input on every deploy to prevent GCP console drift"
  - "Use gcloud auth configure-docker europe-west1-docker.pkg.dev explicitly — without region, only gcr.io is configured"
  - "Add sleep 10 before health curl to allow new revision to become serving revision"

patterns-established:
  - "Pattern: WIF via google-github-actions/auth@v3 with vars.* (not secrets.*) for non-sensitive GCP resource names"
  - "Pattern: Docker build with -f flag when Dockerfile is not at default ./Dockerfile path"
  - "Pattern: Post-deploy health check via curl with exit 1 on non-200 to fail workflow on bad deploy"

requirements-completed: [INFRA-03]

# Metrics
duration: 2min
completed: 2026-03-22
---

# Phase 10 Plan 01: Deploy Optimizer Workflow Summary

**GitHub Actions CI/CD pipeline using Workload Identity Federation to build Docker images to Artifact Registry and deploy to Cloud Run with declarative runtime flags and post-deploy health verification**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-22T20:58:45Z
- **Completed:** 2026-03-22T21:00:26Z
- **Tasks:** 1 of 1
- **Files modified:** 1

## Accomplishments

- Created `.github/workflows/deploy-optimizer.yml` — the first GitHub Actions workflow in this repository
- Path-filtered trigger (api/** and docker/optimizer.Dockerfile) ensures non-optimizer pushes do not trigger Cloud Run deploys
- Keyless GCP authentication via WIF using google-github-actions/auth@v3 — no stored service account JSON keys
- All Cloud Run runtime flags declared in YAML (memory=2Gi, timeout=300s, concurrency=1, max-instances=3, allow-unauthenticated) — config is source-controlled, not GCP-console-drifted
- Post-deploy health verification curls /health and fails the workflow on non-200 response

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the deploy-optimizer GitHub Actions workflow** - `0461133` (feat)

**Plan metadata:** _(pending final docs commit)_

## Files Created/Modified

- `.github/workflows/deploy-optimizer.yml` - Complete CI/CD pipeline: path-filtered trigger, WIF auth, Docker build+push to Artifact Registry with SHA tag, Cloud Run deploy with all runtime flags, post-deploy health check

## Decisions Made

- Git SHA image tag (`${{ github.sha }}`) used instead of `latest` only — enables rollback and traceability per CI best practices
- `id-token: write` permission set at job level as required by GitHub for OIDC token issuance
- `gcloud auth configure-docker europe-west1-docker.pkg.dev --quiet` with explicit region — configures Artifact Registry, not just gcr.io
- `sleep 10` before health curl allows Cloud Run revision rollover to complete after `gcloud run deploy` returns
- All runtime flags re-applied on every deploy via `flags:` input to prevent IAM policy drift from GCP console edits

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. The PyYAML verification command in the plan uses `y['on']` but PyYAML 1.1 parses bare `on` as boolean `True`. The workflow YAML is correct and GitHub Actions parses it properly — this is a PyYAML quirk, not a YAML syntax issue. Verified by checking `y.get(True)` which confirmed all trigger and permission fields are correctly present.

## User Setup Required

**External services require manual configuration before the workflow can succeed.**

The following one-time GCP infrastructure setup must be completed (see 10-RESEARCH.md for full gcloud commands):

1. Enable APIs: `iamcredentials.googleapis.com`, `artifactregistry.googleapis.com`, `run.googleapis.com`
2. Create Workload Identity Pool: `github-actions-pool` (global)
3. Create OIDC Provider: `github-provider` with `assertion.repository=='OWNER/REPO'` attribute-condition
4. Create Service Account: `github-actions-sa@PROJECT_ID.iam.gserviceaccount.com`
5. Grant roles: `artifactregistry.writer`, `run.developer`, `iam.serviceAccountUser`
6. Bind WIF to service account: `roles/iam.workloadIdentityUser`

Then configure GitHub repository settings:

| Name | Type | Value |
|------|------|-------|
| `SUPABASE_URL` | Secret | Supabase project URL |
| `SUPABASE_ANON_KEY` | Secret | Supabase anon key |
| `GCP_PROJECT_ID` | Variable | GCP project ID string |
| `WIF_PROVIDER` | Variable | Full WIF provider resource name |
| `WIF_SERVICE_ACCOUNT` | Variable | `github-actions-sa@PROJECT_ID.iam.gserviceaccount.com` |

## Next Phase Readiness

- Workflow YAML is complete and valid — ready to trigger on first push to main touching optimizer files
- GCP infrastructure setup (WIF pool/provider, service account, IAM bindings) and GitHub secrets/variables must be configured before the workflow can run successfully
- Plan 10-02 covers any remaining phase tasks

## Self-Check: PASSED

- FOUND: .github/workflows/deploy-optimizer.yml
- FOUND: .planning/phases/10-ci-cd-automation/10-01-SUMMARY.md
- FOUND commit: 0461133

---
*Phase: 10-ci-cd-automation*
*Completed: 2026-03-22*
