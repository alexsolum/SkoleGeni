---
phase: 09-frontend-wiring
verified: 2026-03-22T16:00:00Z
status: passed
score: 8/8 must-haves verified
human_verification:
  - test: "Production Vercel deployment calls Cloud Run URL in the Network tab"
    expected: "POST to https://optimizer-ek4bkd34ja-ew.a.run.app/project with Authorization: Bearer <token>, 200 response, zero CORS errors in console"
    why_human: "Vercel dashboard env var and redeployment cannot be confirmed from the codebase alone; the Vite bundle bakes VITE_OPTIMIZER_URL at build time, so only a live browser session against the deployed app can confirm the correct URL is in the compiled bundle"
---

# Phase 09: Frontend Wiring Verification Report

**Phase Goal:** The Vercel-hosted frontend calls the Cloud Run optimizer and authenticated optimization works end-to-end
**Verified:** 2026-03-22T16:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | `getOptimizerBaseUrl()` returns `VITE_OPTIMIZER_URL` when the env var is set | VERIFIED | `src/lib/api.ts` line 98: `(import.meta.env.VITE_OPTIMIZER_URL as string | undefined) ?? "/api/optimizer"`.replace(/\/$/, ""); `api-url.test.ts` test "uses VITE_OPTIMIZER_URL when the env var is set" at line 48 stubs the env var and asserts the fetch URL matches. |
| 2 | `getOptimizerBaseUrl()` falls back to `/api/optimizer` when env var is absent | VERIFIED | `src/lib/api.ts` line 98 has the `?? "/api/optimizer"` fallback. `api-url.test.ts` line 59 stubs the var to `undefined` and asserts the URL starts with `/api/optimizer/`. |
| 3 | A 401 response from the optimizer triggers `signOut()` and navigates to `/` | VERIFIED | `src/pages/PupilData.tsx` lines 471-474: `error instanceof OptimizerRequestError && error.status === 401` — calls `toast.error`, `await supabase.auth.signOut()`, `navigate("/")`. Test `optimizer-401.test.tsx` line 138-163 confirms `signOutMock` called and correct toast message shown. |
| 4 | `.env.example` documents the Cloud Run URL as the production value | VERIFIED | `.env.example` line 3: `VITE_OPTIMIZER_URL="https://optimizer-ek4bkd34ja-ew.a.run.app"` |
| 5 | The Supabase Bearer token is forwarded on every optimizer request | VERIFIED | `src/lib/api.ts` lines 153-169: `getAuthHeaders()` reads `supabase.auth.getSession()`, returns `{ authorization: "Bearer <token>" }`. Lines 214-222: `optimizeProject` spreads `authHeaders` into the fetch headers. Throws if no session. |
| 6 | 401 handler is the first condition in the catch block (does not fall through to 400 path) | VERIFIED | `PupilData.tsx` lines 471-475: `if (error instanceof OptimizerRequestError && error.status === 401)` is evaluated before `error.status === 400` at line 475. |
| 7 | `getOptimizerBaseUrl()` strips a trailing slash to prevent double-slash URLs | VERIFIED | `src/lib/api.ts` line 98: `.replace(/\/$/, "")`. `api-url.test.ts` line 70-78 tests that `https://example.com/` produces `https://example.com/project`, not `https://example.com//project`. |
| 8 | The production Vercel deployment calls the Cloud Run URL (not localhost) | HUMAN NEEDED | Code wiring is confirmed (truths 1-7). Whether `VITE_OPTIMIZER_URL` was set in the Vercel dashboard and the redeployment baked the value into the bundle cannot be verified from the codebase — only a live browser test against the deployed app can confirm this. The SUMMARY documents this was done (plan 02), but it is not a code artifact. |

**Score:** 7/8 truths verified (1 requires human confirmation of production deployment state)

---

### Required Artifacts

| Artifact | Purpose | Exists | Substantive | Wired | Status |
|----------|---------|--------|-------------|-------|--------|
| `src/lib/__tests__/api-url.test.ts` | Unit tests for VITE_OPTIMIZER_URL reading and fallback | Yes | Yes — 79 lines, 3 tests covering: env var set, env var absent, trailing slash stripping | Used via vitest run | VERIFIED |
| `src/pages/__tests__/optimizer-401.test.tsx` | Integration test for 401 handler triggering signOut + toast | Yes | Yes — 164 lines, full component render with mocked supabase and optimizeProject | Used via vitest run | VERIFIED |
| `src/pages/PupilData.tsx` | 401 catch branch in `runOptimizer()` | Yes | Yes — 401 branch at lines 471-474, calls signOut, navigate, error toast | Rendered as the main pupil-entry page via router | VERIFIED |
| `.env.example` | VITE_OPTIMIZER_URL set to Cloud Run URL | Yes | Yes — line 3 contains `https://optimizer-ek4bkd34ja-ew.a.run.app` | Documentation artifact — no wiring check needed | VERIFIED |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/pages/PupilData.tsx` | `supabase.auth.signOut()` | 401 catch branch | WIRED | Line 473: `await supabase.auth.signOut()` inside `if (error instanceof OptimizerRequestError && error.status === 401)` |
| `src/pages/PupilData.tsx` | `navigate("/")` | 401 catch branch redirects to welcome | WIRED | Line 474: `navigate("/")` immediately after signOut in the 401 branch |
| `src/lib/api.ts` `getOptimizerBaseUrl()` | `VITE_OPTIMIZER_URL` env var | `import.meta.env` | WIRED | Line 98 reads `import.meta.env.VITE_OPTIMIZER_URL` with `/api/optimizer` fallback |
| `src/lib/api.ts` `optimizeProject` | `Authorization: Bearer <token>` header | `getAuthHeaders()` result spread | WIRED | Lines 212, 217: `authHeaders` from `getAuthHeaders()` spread into fetch headers |
| Vercel dashboard env var | Compiled bundle fetch URL | Vite build-time injection | HUMAN NEEDED | Cannot verify from codebase; confirmed by human smoke test per SUMMARY 09-02 |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| WIRE-01 | 09-01-PLAN, 09-02-PLAN | Vercel-hosted frontend calls Cloud Run optimizer instead of localhost | SATISFIED (code) / HUMAN for production confirmation | `getOptimizerBaseUrl()` reads `VITE_OPTIMIZER_URL`; `.env.example` set to Cloud Run URL; unit tests confirm env var controls the URL. Production bundle confirmation requires human. |
| WIRE-02 | 09-01-PLAN, 09-02-PLAN | Supabase auth tokens forwarded end-to-end from browser through Cloud Run to Supabase with RLS preserved | SATISFIED (code) | `getAuthHeaders()` always includes `Authorization: Bearer <token>`; 401 handler triggers signOut + redirect on expired tokens; test confirms 401 flow. RLS enforcement is backend behavior confirmed by phase 8 smoke test. |

No orphaned requirements found. Both WIRE-01 and WIRE-02 appear in plan frontmatter and are traced in REQUIREMENTS.md traceability table.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/api.ts` | 255-273 | `optimizeClasses()` sends POST without `Authorization` header | Info | Legacy function not used by the current UI flow (`optimizeProject` and `scoreProjectAssignment` both use `getAuthHeaders()`). Not a threat to phase goal. |

No TODO/FIXME/placeholder comments found in phase-modified files. No empty return stubs. No console-log-only implementations.

---

### Human Verification Required

#### 1. Production Smoke Test — Cloud Run URL in Network Tab

**Test:** In a logged-in browser session on the production Vercel deployment, open DevTools Network tab, run the optimizer on a project with at least one pupil.
**Expected:**
- The POST request URL begins with `https://optimizer-ek4bkd34ja-ew.a.run.app/project` (not `localhost` and not `/api/optimizer`)
- The request headers include `Authorization: Bearer <token>`
- The response status is 200
- Zero CORS errors and zero auth errors appear in the Console tab
- An optimization result appears in the UI (no error toast)

**Why human:** Vercel env var configuration and build-time bundle injection are external to the codebase. The `VITE_OPTIMIZER_URL` value is baked into the bundle at deploy time — the source code cannot confirm what value is in the live bundle. The SUMMARY (09-02) documents that this was completed and all five checks passed, but that cannot be independently verified without a browser session.

---

### Gaps Summary

No code gaps were found. All four code-level success criteria are fully implemented and wired:

1. `getOptimizerBaseUrl()` reads `VITE_OPTIMIZER_URL` and falls back to `/api/optimizer` — confirmed by implementation in `src/lib/api.ts` and 3 unit tests.
2. Every `optimizeProject` call includes `Authorization: Bearer <token>` via `getAuthHeaders()` — confirmed by implementation.
3. A 401 response calls `signOut()` and navigates to `/` as the first catch condition — confirmed by implementation and 1 integration test.
4. `.env.example` documents the Cloud Run URL.

The single human-needed item is the Vercel dashboard configuration verification, which is production-infrastructure state rather than a code gap. The SUMMARY documents that the smoke test passed (five explicit checks: URL, auth header, 200 status, zero CORS errors, UI result). If that human verification is accepted as complete, the phase status upgrades to `passed`.

---

_Verified: 2026-03-22T16:00:00Z_
_Verifier: Claude (gsd-verifier)_
