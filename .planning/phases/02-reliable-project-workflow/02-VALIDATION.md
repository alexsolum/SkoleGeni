---
phase: 2
slug: reliable-project-workflow
status: draft
nyquist_compliant: false
harness_plan: 02-01
created: 2026-03-19
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` + `@testing-library/react` + `playwright` |
| **Config ownership** | `02-01-PLAN.md` creates `vitest.config.ts`, `playwright.config.ts`, `src/test/setup.ts`, and package scripts in Wave 1 |
| **Quick run command** | `npm run test -- src/pages/__tests__/workflow-reload.test.tsx` |
| **Full suite command** | `npm run test:phase2 && npm run build` |
| **Estimated runtime** | ~20 seconds quick run / ~45 seconds full suite |

---

## Sampling Rate

- **After every task commit:** Run the task-specific `<automated>` command; use `npm run test -- src/pages/__tests__/workflow-reload.test.tsx` as the default quick regression when a checkpoint needs fast feedback
- **After every plan wave:** Run `npm run test:phase2 && npm run build`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | FLOW-01 | integration | `npm run test -- src/pages/__tests__/configuration-load.test.tsx` | created in 02-01 | ⬜ pending |
| 02-01-02 | 01 | 1 | FLOW-02 | integration | `npm run test -- src/pages/__tests__/configuration-save.test.tsx` | created in 02-01 | ⬜ pending |
| 02-02-01 | 02 | 2 | FLOW-03 | component | `npm run test -- src/pages/__tests__/pupil-import-validation.test.tsx` | depends on 02-01 harness | ⬜ pending |
| 02-02-02 | 02 | 2 | FLOW-04 | integration | `npm run test -- src/pages/__tests__/pupil-autosave.test.tsx` | depends on 02-01 harness | ⬜ pending |
| 02-03-01 | 03 | 3 | FLOW-01,FLOW-02,FLOW-03,FLOW-04 | e2e smoke | `npm run test:e2e -- tests/phase2-workflow.spec.ts` | depends on 02-01 harness | ⬜ pending |
| 02-03-03 | 03 | 3 | FLOW-01,FLOW-02,FLOW-03,FLOW-04 | checkpoint regression | `npm run test -- src/pages/__tests__/workflow-reload.test.tsx` | depends on 02-01 harness | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Harness Ownership

- [ ] `02-01-PLAN.md` creates `vitest.config.ts` for jsdom React tests
- [ ] `02-01-PLAN.md` creates `src/test/setup.ts` for shared RTL setup and mocks
- [ ] `02-01-PLAN.md` creates or updates `playwright.config.ts` for browser smoke coverage
- [ ] `02-01-PLAN.md` updates `package.json` with `test`, `test:e2e`, and `test:phase2` scripts
- [ ] `02-01-PLAN.md` installs `vitest`, Testing Library packages, `jsdom`, and `@playwright/test`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Saving status feels trustworthy during delayed saves and retry states | FLOW-04 | The phase requires visible confidence cues, and final UX quality still needs human review | Start the app, edit pupil rows, verify the header transitions through `Saving...`, `All changes saved`, and a failed-save state without blocking typing. |
| CSV mapping resolves ambiguous headers in a clear order | FLOW-03 | Mapping clarity and operator comprehension are better judged manually than by DOM assertions alone | Import a CSV with mismatched headers, confirm the mapping modal lets staff match columns, review the failed-import summary, and verify valid rows still reach the grid. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] All tasks have `<automated>` verify or explicit 02-01 harness dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] 02-01 harness ownership covers all config and runner references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
