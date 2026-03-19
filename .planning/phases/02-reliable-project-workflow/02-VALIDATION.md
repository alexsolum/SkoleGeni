---
phase: 2
slug: reliable-project-workflow
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` + `@testing-library/react` + `playwright` |
| **Config file** | `none — Wave 0 installs and configures vitest/playwright` |
| **Quick run command** | `npm run test -- --runInBand` |
| **Full suite command** | `npm run test:phase2 && npm run build` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --runInBand`
- **After every plan wave:** Run `npm run test:phase2 && npm run build`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | FLOW-01 | integration | `npm run test -- src/pages/__tests__/configuration-load.test.tsx` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | FLOW-02 | integration | `npm run test -- src/pages/__tests__/configuration-save.test.tsx` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | FLOW-03 | component | `npm run test -- src/pages/__tests__/pupil-import-validation.test.tsx` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | FLOW-04 | integration | `npm run test -- src/pages/__tests__/pupil-autosave.test.tsx` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | FLOW-01,FLOW-02,FLOW-03,FLOW-04 | e2e | `npm run test:e2e -- --grep "phase-2 workflow"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest jsdom configuration for React component/integration tests
- [ ] `src/test/setup.ts` — shared RTL setup and mocks
- [ ] `playwright.config.ts` — browser flow config for reload/autosave verification
- [ ] `package.json` — add `test`, `test:phase2`, and `test:e2e` scripts
- [ ] `npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom playwright`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Saving status feels trustworthy during delayed saves and retry states | FLOW-04 | The phase requires visible confidence cues, and final UX quality still needs human review | Start the app, edit pupil rows, verify the header transitions through `Saving...`, `All changes saved`, and a failed-save state without blocking typing. |
| CSV mapping resolves ambiguous headers in a clear order | FLOW-03 | Mapping clarity and operator comprehension are better judged manually than by DOM assertions alone | Import a CSV with mismatched headers, confirm the mapping modal lets staff match columns, review the failed-import summary, and verify valid rows still reach the grid. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
