---
phase: 07
slug: code-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 9.0.2 + FastAPI `TestClient` |
| **Config file** | none |
| **Quick run command** | `pytest api/test_hardening.py -q` |
| **Full suite command** | `pytest api -q && npm run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pytest api/test_hardening.py -q`
- **After every plan wave:** Run `pytest api -q && npm run test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | HARD-01 | integration | `pytest api/test_hardening.py -q -k cors` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | HARD-02 | integration | `pytest api/test_hardening.py -q -k health` | ❌ W0 | ⬜ pending |
| 07-01-03 | 01 | 1 | HARD-01, HARD-02 | integration | `pytest api/test_hardening.py -q -k "root or startup"` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 2 | HARD-01, HARD-02 | regression | `pytest api -q && npm run test` | ✅ partial | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `api/test_hardening.py` — CORS preflight, authenticated route CORS, `/health`, safe `GET /`, and root-route exposure coverage
- [ ] Dockerfile/runtime verification path — confirm `PYTHONUNBUFFERED=1` is enforced by code, test, or command-level assertion

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cloud Run probe compatibility against the deployed container | HARD-02 | Requires live Cloud Run environment from Phase 8 | After deploy, run `curl https://<cloud-run-url>/health` and confirm HTTP 200 with the expected readiness JSON |
| Browser preflight from a real remote frontend origin | HARD-01 | Final browser/network confirmation requires a deployed cross-origin setup | From the Vercel frontend or browser devtools, trigger an optimizer request and confirm the OPTIONS preflight and follow-up request are not blocked by CORS |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
