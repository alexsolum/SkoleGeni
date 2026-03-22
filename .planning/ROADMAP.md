# Roadmap: SkoleGeni

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 shipped 2026-03-21. Archive: `.planning/milestones/v1.0-ROADMAP.md`
- 🚧 **v1.1 Optimizer in Cloud** — Phases 7-10 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2026-03-21</summary>

Six phases, 20 plans, 42 tasks completed. See `.planning/milestones/v1.0-ROADMAP.md` for full details.

Delivered: authenticated project access, setup and pupil-entry persistence, trustworthy optimization results, durable manual editing, coherent desktop UI, and automated regression coverage.

</details>

### 🚧 v1.1 Optimizer in Cloud (In Progress)

**Milestone Goal:** Deploy the FastAPI + OR-Tools optimizer to Google Cloud Run so the Vercel-hosted frontend can call a cloud-hosted optimization endpoint instead of requiring a local Docker stack.

- [x] **Phase 7: Code Hardening** — Add CORS middleware and a health endpoint before any cloud deploy (completed 2026-03-21)
- [x] **Phase 8: GCP Setup and Manual Deploy** — Provision Artifact Registry and Cloud Run, push image, smoke test (completed 2026-03-22)
- [ ] **Phase 9: Frontend Wiring** — Point the Vercel frontend at the Cloud Run endpoint and validate end-to-end
- [ ] **Phase 10: CI/CD Automation** — Automate future optimizer deploys via GitHub Actions with Workload Identity Federation

## Phase Details

### Phase 7: Code Hardening
**Goal**: The optimizer container is production-ready for cloud deployment
**Depends on**: Nothing (first phase of v1.1)
**Requirements**: HARD-01, HARD-02
**Success Criteria** (what must be TRUE):
  1. A browser on any origin can make a preflight OPTIONS request to the optimizer and receive the correct CORS headers — no browser-level block occurs
  2. `GET /health` returns HTTP 200 with a JSON body, confirming the service and OR-Tools are ready to accept requests
  3. The optimizer `POST /` direct endpoint is either removed or protected so it is not a public unauthenticated entry point in the cloud
  4. The Docker image starts up and serves requests without buffering stdout/stderr (PYTHONUNBUFFERED=1 present)
**Plans**: 2 plans

Plans:
- [ ] 07-01-PLAN.md — Add hardening tests, readiness-backed FastAPI routes, and remove the public root POST surface
- [ ] 07-02-PLAN.md — Harden the optimizer Docker runtime and finalize the Phase 7 validation contract

### Phase 8: GCP Setup and Manual Deploy
**Goal**: The optimizer container is live on Cloud Run and reachable over HTTPS
**Depends on**: Phase 7
**Requirements**: INFRA-01, INFRA-02
**Success Criteria** (what must be TRUE):
  1. A versioned Docker image is stored in Google Artifact Registry under the correct project and region
  2. The Cloud Run service is deployed with memory 2 GiB, request timeout 300 s, concurrency 1, and `--allow-unauthenticated` flag
  3. `curl https://<cloud-run-url>/health` returns HTTP 200 from outside the local network
  4. `curl -X POST https://<cloud-run-url>/project -H "Authorization: Bearer <token>"` with a valid Supabase token returns an optimization result, not a 5xx error
**Plans**: 2 plans

Plans:
- [x] 08-01-PLAN.md — Provision Artifact Registry and push the first timestamped optimizer image (completed 2026-03-22)
- [x] 08-02-PLAN.md — Deploy Cloud Run service and verify functionality with authenticated smoke tests (completed 2026-03-22)

### Phase 9: Frontend Wiring
**Goal**: The Vercel-hosted frontend calls the Cloud Run optimizer and authenticated optimization works end-to-end
**Depends on**: Phase 8
**Requirements**: WIRE-01, WIRE-02
**Success Criteria** (what must be TRUE):
  1. The production Vercel deployment calls the Cloud Run URL (not localhost) for all optimization requests
  2. A logged-in user in the browser can run an optimization and receive a result without any CORS or authentication error in the browser console
  3. The Supabase Bearer token is forwarded from the browser through Cloud Run to Supabase, and RLS is enforced — the optimizer only reads data the authenticated user owns
  4. A 401 response from the optimizer (expired or missing token) triggers the correct re-authentication flow in the frontend rather than a silent failure
**Plans**: TBD

### Phase 10: CI/CD Automation
**Goal**: Future optimizer code changes are automatically built and deployed to Cloud Run on push to main
**Depends on**: Phase 9
**Requirements**: INFRA-03
**Success Criteria** (what must be TRUE):
  1. A push to main that touches `api/**` or `docker/optimizer.Dockerfile` triggers the GitHub Actions workflow and completes a successful deploy without manual steps
  2. The workflow uses Workload Identity Federation — no long-lived service account key JSON is stored in GitHub Secrets
  3. A push that does not touch optimizer files does not trigger a Cloud Run deploy
**Plans**: TBD

## Progress

**Execution Order:** 7 → 8 → 9 → 10

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-6. MVP Phases | v1.0 | 20/20 | Complete | 2026-03-21 |
| 7. Code Hardening | v1.1 | 2/2 | Complete | 2026-03-21 |
| 8. GCP Setup and Manual Deploy | v1.1 | 2/2 | Complete | 2026-03-22 |
| 9. Frontend Wiring | v1.1 | 0/TBD | Not started | - |
| 10. CI/CD Automation | v1.1 | 0/TBD | Not started | - |
