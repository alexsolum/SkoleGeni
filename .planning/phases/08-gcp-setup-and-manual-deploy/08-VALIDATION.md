# Phase 08: GCP Setup and Manual Deploy - Validation

**Defined:** 2026-03-21
**Phase Goal:** The optimizer container is live on Cloud Run and reachable over HTTPS.

## Success Criteria (Nyquist Dimension 8)

| ID | Criteria | Verification Method |
|----|----------|---------------------|
| S8.1 | A versioned Docker image is stored in Google Artifact Registry. | `gcloud artifacts docker images list europe-west1-docker.pkg.dev/[GCP_PROJECT_ID]/skolegeni-optimizer/optimizer` |
| S8.2 | The Cloud Run service is deployed with 2 GiB memory and 300s timeout. | `gcloud run services describe optimizer --region=europe-west1 --format="json(spec.template.spec.containers[0].resources.limits.memory,spec.template.spec.timeoutSeconds)"` |
| S8.3 | `GET /health` returns HTTP 200 from the public URL. | `curl -f https://[CLOUD_RUN_URL]/health` |
| S8.4 | `POST /project` returns an optimization result with a valid Supabase token. | `curl -f -X POST https://[CLOUD_RUN_URL]/project -H "Authorization: Bearer [JWT]" -H "Content-Type: application/json" -d '{"projectId": "[PROJECT_ID]"}'` |

## Requirement Traceability

| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| INFRA-01 | Cloud Run Deployment | smoke | `gcloud run services list --region=europe-west1` |
| INFRA-02 | Artifact Registry Storage | smoke | `gcloud artifacts repositories list --location=europe-west1` |

## Dimension 10: Regression Fixtures

- [ ] A dedicated "smoke-test-project" exists in the production Supabase instance.
- [ ] A "test user" with stable credentials exists for generating repeatable JWTs.

## Manual Acceptance (Dimension 12)

- [ ] Confirm the Cloud Run service URL is accessible via a browser (should show a default message or 404 if root is blocked).
- [ ] Verify logs in Cloud Run console show no errors during the smoke test optimization.

---
*Phase: 08-gcp-setup-and-manual-deploy*
*Validation defined: 2026-03-21*
