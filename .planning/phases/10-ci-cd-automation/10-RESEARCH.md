# Phase 10: CI/CD Automation - Research

**Researched:** 2026-03-22
**Domain:** GitHub Actions, Google Workload Identity Federation, Artifact Registry, Cloud Run
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Path triggers (locked):**
- Workflow triggers on push to `main` when files under `api/**` or `docker/optimizer.Dockerfile` are changed.
- Pushes that touch neither path must NOT trigger a Cloud Run deploy.

**Workload Identity Federation (locked):**
- No long-lived service account key JSON stored in GitHub Secrets.
- Use Google's `google-github-actions/auth` action with WIF for authentication.

**Env vars in workflow:**
- Store `SUPABASE_URL` and `SUPABASE_ANON_KEY` as GitHub repository secrets, referenced as `${{ secrets.SUPABASE_URL }}` and `${{ secrets.SUPABASE_ANON_KEY }}` in the workflow YAML.
- Re-inject all Cloud Run runtime flags on every deploy: `--memory`, `--timeout`, `--concurrency`, `--max-instances`, `--allow-unauthenticated`, and `--set-env-vars`. Config is fully declarative in the workflow file — no drift if someone tweaks settings in the GCP console.

**Post-deploy verification:**
- After `gcloud run deploy` completes, curl the Cloud Run `/health` endpoint to confirm the new revision is actually serving traffic.
- HTTP 200 is sufficient — `/health` already returns 200 only when OR-Tools is loaded and ready. No need to parse the response body.

**Failure notifications:**
- Rely on GitHub's default behavior: mark the workflow run as failed and send an email to the pusher. No Slack webhook or additional notification setup needed.

### Claude's Discretion

- Image tagging strategy: git SHA is the standard for CI (best for traceability and rollback). Use `${{ github.sha }}` as the image tag.
- Exact GCP project ID, service name, and WIF pool/provider resource names — derive from prior phase deployment details or prompt to confirm.

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-03 | Pushes to main automatically build and deploy the optimizer via GitHub Actions with Workload Identity Federation | WIF setup (pool, provider, SA binding), `on.push.paths` trigger, `google-github-actions/auth@v3`, docker build+push to Artifact Registry, `google-github-actions/deploy-cloudrun@v3` |
</phase_requirements>

---

## Summary

Phase 10 creates the first GitHub Actions workflow in this repository. The workflow lives at `.github/workflows/deploy-optimizer.yml` and is the only deliverable. It implements a push-triggered CI/CD pipeline that: authenticates to GCP via Workload Identity Federation (no stored credentials), builds and pushes a Docker image to Artifact Registry, deploys to Cloud Run with fully-declarative runtime flags, and verifies the new revision is live by hitting `/health`.

The two-part work of this phase is: (1) one-time GCP infrastructure setup — creating the WIF pool, provider, service account, and IAM bindings via `gcloud` commands, and storing the resulting resource names as GitHub Actions variables/secrets; (2) writing the workflow YAML file itself.

The google-github-actions family of actions (`auth@v3`, `deploy-cloudrun@v3`) is the canonical approach for this stack. The `on.push.paths` trigger is a native GitHub Actions feature that handles the selective-deploy requirement without additional tooling.

**Primary recommendation:** Use `google-github-actions/auth@v3` + Docker build/push + `google-github-actions/deploy-cloudrun@v3` in a single job. Do all Cloud Run flag injection through the `flags` input on the deploy action. Authenticate Docker via `gcloud auth configure-docker europe-west1-docker.pkg.dev` after the auth step.

---

## Standard Stack

### Core
| Library / Action | Version | Purpose | Why Standard |
|------------------|---------|---------|--------------|
| `google-github-actions/auth` | v3 | Exchanges GitHub OIDC token for GCP credentials via WIF | Official Google action; only keyless auth option |
| `google-github-actions/deploy-cloudrun` | v3 | Deploys container image to Cloud Run service | Official Google action; wraps `gcloud run deploy` |
| `actions/checkout` | v4 | Checks out repo so Docker build context is available | Mandatory first step |
| Native `on.push.paths` | (built-in) | Selectively triggers workflow only on optimizer file changes | Built into GitHub Actions, no extra action needed |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `gcloud auth configure-docker` | (via gcloud SDK) | Configures Docker credential helper for Artifact Registry | Required before `docker push` to europe-west1-docker.pkg.dev |
| `docker build` / `docker push` | (runner built-in) | Builds image from Dockerfile, pushes to Artifact Registry | Direct commands, no action wrapper needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `google-github-actions/deploy-cloudrun` | `gcloud run deploy` in shell step | Shell step works but loses action output (service URL); action is cleaner |
| `docker build` + `docker push` | `google-github-actions/build-push-action` | No Google-specific action needed; native docker commands are simpler here |
| `on.push.paths` native filter | `dorny/paths-filter` | `dorny/paths-filter` needed only for dynamic conditional logic; native filter suffices here |

**Installation:** No npm install. This phase creates a YAML file and runs `gcloud` commands.

---

## Architecture Patterns

### Recommended Project Structure
```
.github/
└── workflows/
    └── deploy-optimizer.yml   # the only file this phase creates
```

### Pattern 1: Selective Path Trigger

**What:** The workflow only runs when commits touch optimizer-related files.
**When to use:** Any CI pipeline that should not run on every push.

```yaml
# Source: GitHub Actions official docs — on.push.paths
on:
  push:
    branches:
      - main
    paths:
      - 'api/**'
      - 'docker/optimizer.Dockerfile'
```

Key point: `branches` and `paths` are AND-ed together — the workflow fires only when BOTH conditions are true. A push to `main` that changes only `src/` will not trigger this workflow.

### Pattern 2: WIF Authentication with id-token Permission

**What:** The job requests a GitHub OIDC token, exchanges it for short-lived GCP credentials.
**When to use:** Any job that must authenticate to GCP without storing a JSON key.

```yaml
# Source: google-github-actions/auth README (verified 2026-03-22)
permissions:
  contents: 'read'
  id-token: 'write'   # REQUIRED — without this, the OIDC token is not issued

steps:
  - uses: actions/checkout@v4
  - uses: google-github-actions/auth@v3
    with:
      project_id: 'YOUR_PROJECT_ID'
      workload_identity_provider: 'projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID'
      service_account: 'github-actions-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com'
```

The `id-token: write` permission must be set at the job level (or workflow level), not just in the step. This is the most common omission.

### Pattern 3: Docker Authenticate + Build + Push

**What:** After WIF auth, configure Docker to use gcloud credentials, then build and push with a SHA tag.
**When to use:** Any workflow pushing to Artifact Registry.

```yaml
# Image path: REGION-docker.pkg.dev/PROJECT_ID/REPO_NAME/IMAGE_NAME:TAG
- name: Configure Docker for Artifact Registry
  run: gcloud auth configure-docker europe-west1-docker.pkg.dev --quiet

- name: Build and push image
  run: |
    IMAGE="europe-west1-docker.pkg.dev/${{ vars.GCP_PROJECT_ID }}/skolegeni-optimizer/optimizer:${{ github.sha }}"
    docker build -f docker/optimizer.Dockerfile -t "$IMAGE" .
    docker push "$IMAGE"
```

### Pattern 4: Cloud Run Deploy with Declarative Flags

**What:** Deploy using the action's `flags` input to inject all runtime config on every deploy.
**When to use:** When runtime config must be source-controlled, not console-drifted.

```yaml
# Source: google-github-actions/deploy-cloudrun README (verified 2026-03-22)
- uses: google-github-actions/deploy-cloudrun@v3
  with:
    service: 'optimizer'
    region: 'europe-west1'
    image: 'europe-west1-docker.pkg.dev/${{ vars.GCP_PROJECT_ID }}/skolegeni-optimizer/optimizer:${{ github.sha }}'
    flags: >-
      --memory=2Gi
      --timeout=300s
      --concurrency=1
      --max-instances=3
      --allow-unauthenticated
      --set-env-vars=SUPABASE_URL=${{ secrets.SUPABASE_URL }},SUPABASE_ANON_KEY=${{ secrets.SUPABASE_ANON_KEY }}
```

The `>-` YAML block scalar folds the multi-line string into a single space-separated string with no trailing newline — this is safe for the `flags` input.

### Pattern 5: Post-deploy Health Verification

**What:** After deploy, curl the `/health` endpoint to confirm the new revision is actually serving.
**When to use:** After any Cloud Run deploy where a warm-start check is possible.

```yaml
- name: Verify deployment
  run: |
    sleep 10   # allow revision to become ready
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://optimizer-ek4bkd34ja-ew.a.run.app/health)
    if [ "$STATUS" != "200" ]; then
      echo "Health check failed: HTTP $STATUS"
      exit 1
    fi
    echo "Health check passed: HTTP $STATUS"
```

### Anti-Patterns to Avoid

- **Missing `id-token: write` permission:** The job will fail with a cryptic OIDC error. Always set at job level.
- **Storing service account key JSON in GitHub Secrets:** This is explicitly ruled out by the requirements. WIF is mandatory.
- **Using `--allow-unauthenticated` without re-applying on update:** Cloud Run does not persist IAM policies set by flags — they must be re-applied on every deploy. The `flags` input handles this.
- **Building Docker image without specifying the Dockerfile path:** The Dockerfile is at `docker/optimizer.Dockerfile`, not the default `./Dockerfile`. Always pass `-f docker/optimizer.Dockerfile`.
- **Tagging image as `latest` only:** Loses rollback capability. Always tag with `${{ github.sha }}`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GCP authentication | Custom OIDC token exchange script | `google-github-actions/auth@v3` | WIF token exchange is complex; the action handles token refresh, credential file format, and ADC setup |
| Cloud Run deployment | Shell `gcloud run deploy` with manual output parsing | `google-github-actions/deploy-cloudrun@v3` | Action provides structured output (service URL), cleaner interface, tested edge cases |
| Docker credential setup | Manual `~/.docker/config.json` editing | `gcloud auth configure-docker REGION-docker.pkg.dev` | One command; handles credential helper format correctly |

**Key insight:** The google-github-actions action suite is owned and maintained by Google. Using it is strictly preferable to wrapping `gcloud` shell commands for authentication and deployment steps.

---

## Common Pitfalls

### Pitfall 1: `id-token: write` Permission Missing

**What goes wrong:** Workflow fails at the `google-github-actions/auth` step with: `Error: google-github-actions/auth failed with: the GitHub Actions id-token permission must be set to write`
**Why it happens:** GitHub does not issue an OIDC token unless the job explicitly requests it.
**How to avoid:** Always set `permissions: id-token: write` at the job level (not workflow level alone).
**Warning signs:** The error is explicit — easy to recognize once seen.

### Pitfall 2: WIF Provider attribute-condition Too Permissive

**What goes wrong:** Any repository in the GitHub organization can authenticate to your GCP service account.
**Why it happens:** Omitting `--attribute-condition` when creating the WIF provider leaves it open.
**How to avoid:** Always include `assertion.repository=='OWNER/REPO'` in the attribute-condition.
**Warning signs:** No immediate error — this is a silent security gap.

### Pitfall 3: Wrong Docker Registry Region

**What goes wrong:** `docker push europe-west1-docker.pkg.dev/...` fails with authentication error even after auth step succeeds.
**Why it happens:** `gcloud auth configure-docker` without a region argument only configures `gcr.io`, not Artifact Registry hosts.
**How to avoid:** Always pass the full regional hostname: `gcloud auth configure-docker europe-west1-docker.pkg.dev --quiet`
**Warning signs:** `unauthorized` or `denied` error from Docker during push.

### Pitfall 4: Dockerfile Path Not Specified

**What goes wrong:** `docker build .` looks for `Dockerfile` in the root — which does not exist. Build fails.
**Why it happens:** Default `docker build` assumes `./Dockerfile`.
**How to avoid:** Always pass `-f docker/optimizer.Dockerfile` explicitly.
**Warning signs:** `unable to prepare context: unable to evaluate symlinks in Dockerfile path`.

### Pitfall 5: `--set-env-vars` Comma Quoting in flags Input

**What goes wrong:** Multi-value `--set-env-vars` with commas gets split incorrectly by the action's flags parser.
**Why it happens:** The `flags` input is space-split; commas in values can cause issues with some shell expansion.
**How to avoid:** Keep env vars in `--set-env-vars=KEY1=VAL1,KEY2=VAL2` format without spaces around commas. The values for `SUPABASE_URL` and `SUPABASE_ANON_KEY` do not contain commas, so this is safe here.
**Warning signs:** Cloud Run service missing env vars after deploy.

### Pitfall 6: Health Check Curl Without Delay

**What goes wrong:** The new Cloud Run revision takes 10-30 seconds to become the serving revision after `gcloud run deploy` returns. An immediate curl hits the old revision.
**Why it happens:** `gcloud run deploy` returns after the new revision is created and traffic is shifted, but the /health endpoint may still briefly return from the old container.
**How to avoid:** Add a `sleep 10` before the curl, or loop with retries.
**Warning signs:** Health check passes but deployed code does not reflect the new commit.

---

## GCP Infrastructure Setup Commands

These are one-time `gcloud` commands run manually before the workflow can work. The planner should make these their own Wave 0 task with explicit steps.

### Step 1: Enable Required APIs
```bash
gcloud services enable iamcredentials.googleapis.com \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  --project=YOUR_PROJECT_ID
```

### Step 2: Create Workload Identity Pool
```bash
gcloud iam workload-identity-pools create github-actions-pool \
  --location="global" \
  --display-name="GitHub Actions Pool" \
  --project=YOUR_PROJECT_ID
```

### Step 3: Create OIDC Provider for GitHub
```bash
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location="global" \
  --workload-identity-pool="github-actions-pool" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository=='OWNER/REPO'" \
  --project=YOUR_PROJECT_ID
```

The issuer URI for GitHub Actions OIDC is exactly `https://token.actions.githubusercontent.com` (no trailing slash).

### Step 4: Create Service Account
```bash
gcloud iam service-accounts create github-actions-sa \
  --display-name="GitHub Actions CI/CD" \
  --project=YOUR_PROJECT_ID
```

### Step 5: Grant Required Roles to Service Account
```bash
# Artifact Registry Writer — push images
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Cloud Run Developer — deploy services
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.developer"

# Service Account User — required for Cloud Run deploy to set runtime SA
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

### Step 6: Allow WIF to Impersonate the Service Account
```bash
# Get project number first
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')

gcloud iam service-accounts add-iam-policy-binding \
  github-actions-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-actions-pool/attribute.repository/OWNER/REPO"
```

### Step 7: Get WIF Provider Resource Name (needed for workflow YAML)
```bash
gcloud iam workload-identity-pools providers describe github-provider \
  --location="global" \
  --workload-identity-pool="github-actions-pool" \
  --project=YOUR_PROJECT_ID \
  --format="value(name)"
```

Output format: `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider`

### GitHub Secrets and Variables to Configure

| Name | Type | Value |
|------|------|-------|
| `SUPABASE_URL` | Secret | Supabase project URL |
| `SUPABASE_ANON_KEY` | Secret | Supabase anon key |
| `GCP_PROJECT_ID` | Variable (not secret) | GCP project ID string |
| `WIF_PROVIDER` | Variable (not secret) | Full WIF provider resource name from Step 7 |
| `WIF_SERVICE_ACCOUNT` | Variable (not secret) | `github-actions-sa@PROJECT_ID.iam.gserviceaccount.com` |

Project ID and WIF resource names are not secret — using `vars.*` instead of `secrets.*` makes them visible in logs and easier to debug.

---

## Code Examples

### Complete Workflow File Skeleton

```yaml
# Source: Derived from google-github-actions/auth@v3 and deploy-cloudrun@v3 official READMEs
# Path: .github/workflows/deploy-optimizer.yml

name: Deploy Optimizer

on:
  push:
    branches:
      - main
    paths:
      - 'api/**'
      - 'docker/optimizer.Dockerfile'

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: 'read'
      id-token: 'write'

    steps:
      - uses: actions/checkout@v4

      - uses: google-github-actions/auth@v3
        with:
          project_id: '${{ vars.GCP_PROJECT_ID }}'
          workload_identity_provider: '${{ vars.WIF_PROVIDER }}'
          service_account: '${{ vars.WIF_SERVICE_ACCOUNT }}'

      - name: Configure Docker for Artifact Registry
        run: gcloud auth configure-docker europe-west1-docker.pkg.dev --quiet

      - name: Build and push image
        env:
          IMAGE: europe-west1-docker.pkg.dev/${{ vars.GCP_PROJECT_ID }}/skolegeni-optimizer/optimizer:${{ github.sha }}
        run: |
          docker build -f docker/optimizer.Dockerfile -t "$IMAGE" .
          docker push "$IMAGE"

      - uses: google-github-actions/deploy-cloudrun@v3
        with:
          service: 'optimizer'
          region: 'europe-west1'
          image: 'europe-west1-docker.pkg.dev/${{ vars.GCP_PROJECT_ID }}/skolegeni-optimizer/optimizer:${{ github.sha }}'
          flags: >-
            --memory=2Gi
            --timeout=300s
            --concurrency=1
            --max-instances=3
            --allow-unauthenticated
            --set-env-vars=SUPABASE_URL=${{ secrets.SUPABASE_URL }},SUPABASE_ANON_KEY=${{ secrets.SUPABASE_ANON_KEY }}

      - name: Verify deployment health
        run: |
          sleep 10
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://optimizer-ek4bkd34ja-ew.a.run.app/health)
          if [ "$STATUS" != "200" ]; then
            echo "Health check failed: HTTP $STATUS"
            exit 1
          fi
          echo "Health check passed: HTTP $STATUS"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Service account JSON key in GitHub Secrets | Workload Identity Federation via OIDC | 2021+ (now standard) | No long-lived credentials to rotate or leak |
| `google-github-actions/auth@v1/v2` | `@v3` | 2024 | Requires Node 20+; runners default to this |
| `google-github-actions/deploy-cloudrun@v1/v2` | `@v3` | 2024-2025 | Requires Node 24; ubuntu-latest runners satisfy this |
| `gcr.io` as container registry | `REGION-docker.pkg.dev` (Artifact Registry) | 2023 (Container Registry deprecated) | Must use `gcloud auth configure-docker REGION-docker.pkg.dev` |
| `latest` image tag | Git SHA tag | Best practice | Enables rollback, traceability |

**Deprecated/outdated:**
- Container Registry (`gcr.io`): deprecated in favor of Artifact Registry. This project already uses Artifact Registry from Phase 8 — correct.
- `google-github-actions/auth@v0` / `v1`: uses older Node runtime; use `v3`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (no version pinned — from requirements.txt) |
| Config file | none — pytest discovers tests in `api/` |
| Quick run command | `cd api && python -m pytest test_hardening.py -x -q` |
| Full suite command | `cd api && python -m pytest -x -q` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-03 | Workflow YAML syntax is valid | lint/static | `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-optimizer.yml'))"` | Wave 0 (file created in plan) |
| INFRA-03 | Path trigger fires on `api/**` change | manual smoke | Push a commit touching `api/optimizer.py`, observe GitHub Actions run | N/A — requires live GitHub |
| INFRA-03 | Path trigger does NOT fire on non-optimizer change | manual smoke | Push a commit touching only `src/`, observe no workflow run | N/A — requires live GitHub |
| INFRA-03 | Deploy completes and `/health` returns 200 | integration | `curl -s -o /dev/null -w "%{http_code}" https://optimizer-ek4bkd34ja-ew.a.run.app/health` | N/A — requires live Cloud Run |
| INFRA-03 | WIF authentication succeeds (no JSON key) | manual verification | Inspect workflow run logs — confirm no service account key referenced | N/A — requires live GitHub |

**Note:** INFRA-03 is inherently an infrastructure/integration requirement. The automated test surface is limited to YAML syntax validation. The success criteria are verified by observing actual GitHub Actions workflow runs — this is normal for CI/CD phase verification.

### Sampling Rate
- **Per task commit:** `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-optimizer.yml'))"` (YAML lint)
- **Per wave merge:** Full pytest suite in `api/` — `cd api && python -m pytest -x -q`
- **Phase gate:** Trigger a real push to `main` touching `api/optimizer.py` and observe the full workflow completing green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `.github/workflows/deploy-optimizer.yml` — this is the primary deliverable of the phase (created in plan, not pre-existing)
- [ ] GCP WIF infrastructure (pool, provider, service account, IAM bindings) — one-time setup commands must be run before the workflow can succeed

*(Existing Python test files in `api/` cover the optimizer contract — no new test files needed for this phase)*

---

## Open Questions

1. **GCP Project ID confirmation**
   - What we know: Phase 8 used a GCP project; Artifact Registry repo `skolegeni-optimizer` in `europe-west1` exists
   - What's unclear: The exact project ID string is not recorded in CONTEXT.md or STATE.md
   - Recommendation: The planner should include a task step to confirm `gcloud config get-value project` and store the output as a GitHub Actions variable

2. **Cloud Run service name**
   - What we know: Cloud Run URL is `https://optimizer-ek4bkd34ja-ew.a.run.app` (from STATE.md)
   - What's unclear: The service name used in `gcloud run deploy SERVICE_NAME` — it is likely `optimizer` but should be confirmed with `gcloud run services list --region=europe-west1`
   - Recommendation: Planner should include a verification step before writing the workflow YAML

3. **WIF pool and provider already exist?**
   - What we know: Phase 8 set up Artifact Registry and Cloud Run manually; WIF was noted as a requirement for Phase 10
   - What's unclear: Whether any WIF infrastructure was pre-created
   - Recommendation: Planner should include `gcloud iam workload-identity-pools list --location=global` as a check step before creating new resources

4. **`--max-instances` value**
   - What we know: Phase 8 context says 512Mi memory for initial setup; STATE.md says 2 GiB and concurrency=1 as the settled values
   - What's unclear: Whether a specific `--max-instances` value was decided
   - Recommendation: Use `--max-instances=3` as a safe low-traffic default; this is Claude's discretion per CONTEXT.md

---

## Sources

### Primary (HIGH confidence)
- `google-github-actions/auth` GitHub repository (fetched 2026-03-22) — WIF YAML syntax, required permissions, `v3` version
- `google-github-actions/deploy-cloudrun` GitHub repository (fetched 2026-03-22) — `flags` input format, `v3` version
- Google Cloud Artifact Registry docs (fetched 2026-03-22) — `europe-west1-docker.pkg.dev` hostname, `gcloud auth configure-docker` command
- Google Cloud WIF with deployment pipelines docs (fetched 2026-03-22) — pool/provider setup commands, attribute-condition format

### Secondary (MEDIUM confidence)
- WebSearch: roles required for service account (artifactregistry.writer, run.developer, iam.serviceAccountUser) — consistent across multiple community sources, aligns with official docs pattern
- WebSearch: `on.push.paths` behavior with `branches` AND-ed — verified against GitHub community discussions

### Tertiary (LOW confidence)
- `sleep 10` duration for post-deploy health check — empirical community guidance; adjust if Cloud Run revision rollover takes longer

---

## Metadata

**Confidence breakdown:**
- Standard stack (actions, versions): HIGH — verified from official GitHub repos
- GCP setup commands: HIGH — verified from official GCP documentation
- Workflow YAML patterns: HIGH — derived directly from official action READMEs
- IAM roles required: MEDIUM — consistent across community sources, not verified line-by-line against GCP docs
- Health check delay timing: LOW — empirical, environment-dependent

**Research date:** 2026-03-22
**Valid until:** 2026-09-22 (stable Google Actions; check for v4 major version bumps if planning after this date)
