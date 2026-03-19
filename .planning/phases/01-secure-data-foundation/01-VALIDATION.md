---
phase: 01
slug: secure-data-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 01 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `pytest 9.0.2`, `vitest 4.1.0`, `@playwright/test 1.58.2` |
| **Config file** | none - Wave 0 installs `vitest.config.ts` and Python test scaffolding |
| **Quick run command** | `pytest tests/test_security_foundation.py -x` |
| **Full suite command** | `pytest && npx vitest run && npx playwright test` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pytest tests/test_security_foundation.py -x`
- **After every plan wave:** Run `pytest && npx vitest run`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | SECU-01 | integration | `pytest tests/test_security_foundation.py::test_owner_only_project_access -x` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | SECU-01 | integration | `pytest tests/test_security_foundation.py::test_owner_only_project_access -x` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 2 | SECU-02 | integration | `pytest tests/test_security_foundation.py::test_transactional_roster_save -x` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 2 | SECU-02 | integration | `pytest tests/test_security_foundation.py::test_transactional_roster_save -x` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 3 | SECU-01 | integration | `pytest tests/test_security_foundation.py::test_server_side_optimizer_from_saved_state -x` | ❌ W0 | ⬜ pending |
| 01-03-02 | 03 | 3 | SECU-02 | e2e | `npx playwright test tests/e2e/phase1-auth-save.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_security_foundation.py` — integration coverage for `SECU-01` and `SECU-02`
- [ ] `tests/conftest.py` — shared fixtures for authenticated and unauthenticated project access
- [ ] `vitest.config.ts` — frontend test runner config
- [ ] `tests/e2e/phase1-auth-save.spec.ts` — secured roster flow smoke test
- [ ] `python -m pip install pytest httpx` and `npm install -D vitest @testing-library/react @playwright/test` — framework install

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Login boundary redirects unauthenticated users away from roster screens | SECU-01 | Fast visual check of route gating and screen flow | Open the app signed out and verify roster routes do not expose project data |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
