---
phase: 9
slug: frontend-wiring
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vite.config.ts |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test -- --run --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run`
- **After every plan wave:** Run `npm run test -- --run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 0 | WIRE-01 | unit | `npm run test -- --run src/lib/__tests__/api-url.test.ts` | ❌ W0 | ⬜ pending |
| 9-01-02 | 01 | 1 | WIRE-01 | manual | See Manual Verifications | N/A | ⬜ pending |
| 9-02-01 | 02 | 0 | WIRE-02 | unit | `npm run test -- --run src/pages/__tests__/optimizer-401.test.tsx` | ❌ W0 | ⬜ pending |
| 9-02-02 | 02 | 1 | WIRE-02 | manual | See Manual Verifications | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/api-url.test.ts` — unit tests for `getOptimizerBaseUrl()` reading `VITE_OPTIMIZER_URL` env var (WIRE-01)
- [ ] `src/pages/__tests__/optimizer-401.test.tsx` — unit tests for 401 branch in `runOptimizer()` calling `supabase.auth.signOut()` + navigate (WIRE-02)

*Existing vitest infrastructure covers the framework — only test files need to be created.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Production Vercel deployment calls Cloud Run URL | WIRE-01 | Requires live Vercel env + browser network tab | Log into production, open DevTools Network, run an optimization, confirm request URL matches Cloud Run URL (not localhost) |
| No CORS or auth errors in browser console | WIRE-01, WIRE-02 | Requires live cross-origin browser request | Open DevTools Console on production, run optimization, confirm zero CORS/401 errors |
| Supabase Bearer token forwarded and RLS enforced | WIRE-02 | Requires live end-to-end with real auth token | Inspect Authorization header in Network tab, confirm token value matches `supabase.auth.getSession()` access_token |
| 401 triggers re-auth flow | WIRE-02 | Requires simulated expired token in live browser | Force token expiry (or use expired token), run optimization, confirm redirect to login page |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
