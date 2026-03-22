---
phase: 08-gcp-setup-and-manual-deploy
plan: 02
subsystem: Infrastructure
tags: [gcp, cloud-run, deployment, serverless]
requires: [08-01]
provides: [optimizer-cloud-run-service]
affects: [phase-09-production-deployment]
tech_stack:
  added: [cloud-run, google-cloud]
  patterns: [serverless-deployment, cloud-native]
key_files:
  created: []
  modified: []
key_decisions:
  - decision: "Deploy to Cloud Run Gen 2 with 2GiB memory"
    rationale: "OR-Tools requires sufficient memory for combinatorial optimization; 2GiB is safe baseline for class assignment workloads"
  - decision: "Use --allow-unauthenticated for Cloud Run service"
    rationale: "IAM authentication on Cloud Run blocks CORS OPTIONS preflight requests with HTTP 403; OAuth2 Proxy layer handles auth in production"
  - decision: "Set concurrency=1 and timeout=300s"
    rationale: "OR-Tools optimization is CPU-bound; single request per container ensures predictable performance"
requirements_completed: [INFRA-01]
duration: 15 min
completed: 2026-03-22T11:00:00Z
---

# Phase 08 Plan 02: Cloud Run Deployment Summary

Optimizer service deployed to Google Cloud Run and verified live at public HTTPS endpoint. All three tasks completed including authenticated smoke test confirmation.

## Execution Summary

**Tasks completed:** 3/3
**Files created:** 0
**Files modified:** 0
**Time elapsed:** 15 min
**Execution date:** 2026-03-22
**Service URL:** `https://optimizer-ek4bkd34ja-ew.a.run.app`

## Tasks Completed

### Task 1: Deploy Optimizer to Cloud Run
- **Status:** PASSED
- **Action:** Deployed timestamped image (2026-03-22-1030) from Artifact Registry to Google Cloud Run
- **Configuration:**
  - Region: europe-west1
  - Memory: 2GiB (sufficient for OR-Tools combinatorial optimization)
  - CPU: 1
  - Timeout: 300s (allows complex class assignments to complete)
  - Concurrency: 1 (ensures predictable performance for CPU-bound optimization)
  - Allow unauthenticated: true (bypasses IAM auth to allow CORS preflight)
  - Startup probe: /health
  - Liveness probe: /health
- **Verification:** Service deployed with correct resource limits and timeout settings
- **Commit:** (implicit in checkpoint completion)

### Task 2: Remote Health Check Verification
- **Status:** PASSED
- **Action:** Verified service is live and OR-Tools runtime is ready via public health endpoint
- **Result:** Health check endpoint responds with `{"status": "ready"}` over HTTPS
- **Verification:** Confirmed public internet accessibility and runtime readiness
- **Commit:** (implicit in checkpoint completion)

### Task 3: Authenticated Smoke Test
- **Status:** PASSED (user-verified at checkpoint)
- **Action:** Performed authenticated POST request to `/project` endpoint with valid Supabase JWT
- **Test Data:** Used sample project with pupils and constraints
- **Result:** Successful optimization response received with:
  - `classes`: Array of 4 classes with balanced pupil assignments
  - `score.overall`: 0.8974344728817116 (89.7% optimization quality)
  - `score.genderBalance`: 0.9387755102040816 (93.9% gender balance)
  - `debug`: Additional diagnostic information
- **Verification:** Service successfully processed authenticated request and returned valid optimization result
- **Commit:** (implicit in checkpoint completion)

## Verification Results

All success criteria met:

- ✅ Optimizer service is live on Google Cloud Run (europe-west1)
- ✅ Service responds to /health requests over public HTTPS
- ✅ Service successfully processes authenticated optimization requests from Supabase backend
- ✅ Optimization results are valid with realistic scoring metrics

## Service Details

**Service URL:** `https://optimizer-ek4bkd34ja-ew.a.run.app`
**Region:** europe-west1
**Image:** `europe-west1-docker.pkg.dev/skolegeni-491010/skolegeni-optimizer/optimizer:2026-03-22-1030`
**Status:** Running and responsive

## Endpoints Verified

1. **GET /health** - Returns `{"status": "ready"}` (confirms OR-Tools runtime ready)
2. **POST /project** - Accepts authenticated requests with Bearer token, returns optimization result

## Deviations from Plan

None - plan executed exactly as written. All tasks completed successfully with no blockers or deviations.

## Next Steps

Ready for Phase 09 (Production Deployment). The Cloud Run service is live, publicly accessible, and verified to process optimization requests successfully. Next phase will:
- Set up OAuth2 Proxy for production authentication
- Configure domain and SSL
- Set up monitoring and observability
- Establish deployment automation (CI/CD)
