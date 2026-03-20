---
phase: 5
slug: polish-and-release-readiness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.0 (frontend), pytest (backend), Playwright 1.58.2 (e2e) |
| **Config file** | `vite.config.ts` (vitest), `tests/e2e/` (Playwright) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run && python -m pytest api/ && npx playwright test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run && python -m pytest api/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | QUAL-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | QUAL-02 | config | `npx tailwindcss --help` | ✅ | ⬜ pending |
| 05-01-03 | 01 | 1 | QUAL-02 | lint | `npx eslint .` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | UX-01 | visual | browser check | ✅ | ⬜ pending |
| 05-02-02 | 02 | 2 | UX-01 | e2e | `npx playwright test` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 2 | QUAL-01 | unit | `python -m pytest api/test_feasibility.py` | ❌ W0 | ⬜ pending |
| 05-03-02 | 03 | 2 | QUAL-01 | unit | `npx vitest run src/lib/__tests__/rosterValidation-parity.test.ts` | ❌ W0 | ⬜ pending |
| 05-03-03 | 03 | 2 | QUAL-01 | e2e | `npx playwright test tests/e2e/full-journey.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `eslint.config.js` — ESLint v9 flat config setup
- [ ] `api/test_feasibility.py` — stubs for optimizer feasibility tests (QUAL-01)
- [ ] `src/lib/__tests__/rosterValidation-parity.test.ts` — stubs for parity tests (QUAL-01)
- [ ] `tests/e2e/full-journey.spec.ts` — stubs for e2e journey test (QUAL-01)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual coherence across screens | UX-01 | Design aesthetic cannot be automated | Navigate all 5 screens, verify consistent typography, spacing, colors |
| Sidebar navigation UX | UX-01 | Interaction feel is subjective | Click through sidebar links, verify active states and transitions |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
