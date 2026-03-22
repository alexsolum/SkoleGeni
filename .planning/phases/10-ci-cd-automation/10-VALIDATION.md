---
phase: 10
slug: ci-cd-automation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual / GitHub Actions CI logs |
| **Config file** | `.github/workflows/deploy-optimizer.yml` |
| **Quick run command** | `act push --dry-run` (local) or check GitHub Actions run |
| **Full suite command** | Push to main and verify GitHub Actions workflow completes |
| **Estimated runtime** | ~5-10 minutes (CI roundtrip) |

---

## Sampling Rate

- **After every task commit:** Validate YAML syntax with `python -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-optimizer.yml'))"` or `yq . .github/workflows/deploy-optimizer.yml`
- **After every plan wave:** Verify workflow file exists and passes syntax check
- **Before `/gsd:verify-work`:** Full suite must be green (workflow triggered and deployed successfully)
- **Max feedback latency:** 600 seconds (CI roundtrip)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 0 | INFRA-03 | manual | `gcloud iam workload-identity-pools list --location=global` | ✅ | ⬜ pending |
| 10-01-02 | 01 | 1 | INFRA-03 | syntax | `python -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-optimizer.yml'))"` | ❌ W0 | ⬜ pending |
| 10-01-03 | 01 | 2 | INFRA-03 | integration | Push to main, check GitHub Actions UI for green run | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.github/workflows/` directory created
- [ ] `.github/workflows/deploy-optimizer.yml` — workflow file stub
- [ ] WIF infrastructure confirmed or created (pool, provider, SA, bindings)

*Wave 0 covers GCP IAM setup (manual steps) and workflow file creation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| WIF authentication works | INFRA-03 | Requires live GCP + GitHub Actions runner | Trigger workflow push, check Actions log for successful `google-github-actions/auth` step |
| Non-optimizer push does NOT deploy | INFRA-03 | Requires live CI run with path filter | Push a change to `README.md` only, verify no workflow run triggered |
| Cloud Run deploy succeeds | INFRA-03 | Requires live GCP infrastructure | Check Cloud Run revision after CI completes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 600s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
