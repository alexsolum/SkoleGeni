# Phase 9: Frontend Wiring - Research

**Researched:** 2026-03-22
**Domain:** Vercel environment configuration, Supabase auth token forwarding, 401 error handling
**Confidence:** HIGH

## Summary

Phase 9 is a configuration-and-hardening phase, not a new feature phase. The heavy lifting is already done: `getOptimizerBaseUrl()` in `src/lib/api.ts` already reads `VITE_OPTIMIZER_URL` and falls back to `/api/optimizer`. Auth token forwarding is already implemented via `getAuthHeaders()`. The only required code change is in the error handler for `runOptimizer()` in `PupilData.tsx` — a 401 must trigger re-authentication rather than a generic toast.

Three action categories cover everything: (1) set `VITE_OPTIMIZER_URL` in the Vercel dashboard for all environments, (2) update `.env.example` to reflect the Cloud Run URL as the production default, and (3) add 401 handling in the optimizer catch block in `PupilData.tsx`. Manual end-to-end smoke testing against the live production deployment is the verification gate.

**Primary recommendation:** Set the env var in Vercel first (unblocks everything else), then add the 401 branch in `PupilData.tsx`, then update `.env.example`, then smoke-test against the live production URL.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **CORS policy:** Keep `allow_origin_regex='.*'` on Cloud Run — no change needed.
- **Vercel environment configuration:** Set `VITE_OPTIMIZER_URL` to `https://optimizer-ek4bkd34ja-ew.a.run.app` for ALL Vercel environments (production and preview). No Vercel rewrite proxy — frontend calls Cloud Run directly.
- **End-to-end validation:** Manual browser smoke test on the live Vercel production URL. Log in as a real user, open an existing project, run a full optimization, confirm result returned without CORS or auth errors in the browser console. Verify via the Network tab that the request goes to the Cloud Run URL. A full optimization run (not just a health check) is required.

### Claude's Discretion
- Whether to also update `.env.example` to reflect the Cloud Run URL as the recommended production value.
- Order of steps in the plan (set env var first vs code cleanup first).

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WIRE-01 | Vercel-hosted frontend calls the Cloud Run optimizer endpoint instead of localhost | `VITE_OPTIMIZER_URL` env var in Vercel dashboard (Production + Preview). No code change needed — `getOptimizerBaseUrl()` already reads it. |
| WIRE-02 | Supabase auth tokens are forwarded end-to-end from browser through Cloud Run to Supabase with RLS preserved | `getAuthHeaders()` already attaches `Authorization: Bearer <token>`. 401 handling branch needed in `runOptimizer()` catch block. Smoke test verifies the full chain. |
</phase_requirements>

## Standard Stack

No new libraries are introduced in this phase. The existing stack handles everything.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | already installed | Auth session, `getSession()`, `signOut()` | Already the project auth layer |
| react-hot-toast | already installed | User-facing error messages | Already used in every error path |
| react-router-dom | already installed | `navigate('/')` for re-auth redirect | Already the project router |

### No New Dependencies Required

All needed libraries are already in `package.json`. This phase requires:
- Zero `npm install` calls
- Zero new files (only modifications to existing files and Vercel dashboard config)

## Architecture Patterns

### How env vars reach the Vite bundle

Vite bakes `import.meta.env.VITE_*` values at build time. Setting `VITE_OPTIMIZER_URL` in the Vercel dashboard causes Vercel to inject the value during the build step, so the compiled bundle contains the Cloud Run URL instead of the fallback `/api/optimizer`.

```
Browser
  └─ fetch(`${VITE_OPTIMIZER_URL}/project`)   ← compiled at Vercel build time
       = https://optimizer-ek4bkd34ja-ew.a.run.app/project
  └─ Authorization: Bearer <supabase-access-token>
  └─ Cloud Run → optimizer reads projectId → queries Supabase with user token → RLS enforced
```

The fallback in `getOptimizerBaseUrl()` is `/api/optimizer` — if the env var is missing, requests go to that path (which 404s in production). This means a missing env var fails obviously rather than silently.

### Pattern 1: Vercel Environment Variable Scope

**What:** Vercel lets you scope env vars to Production, Preview, and Development environments separately. The locked decision requires setting `VITE_OPTIMIZER_URL` for both Production and Preview.

**How to set:** Vercel Dashboard → Project → Settings → Environment Variables. Add `VITE_OPTIMIZER_URL` with value `https://optimizer-ek4bkd34ja-ew.a.run.app`, check both Production and Preview checkboxes. A new deployment is triggered automatically (or manually via "Redeploy") for the value to take effect in the compiled bundle.

**Verification:** After deploy, check the Network tab in the browser. The optimizer request URL should start with `https://optimizer-ek4bkd34ja-ew.a.run.app`.

### Pattern 2: 401 Handling in the Optimizer Catch Block

**What:** Success criterion 4 requires a 401 from the optimizer to trigger re-authentication, not a silent failure or generic toast.

**Current state (PupilData.tsx lines 470-481):**
```typescript
} catch (error) {
  if (error instanceof OptimizerRequestError && error.status === 400 && error.diagnostic) {
    setOptimizerDiagnostics(error.diagnostic);
    toast.error(/* diagnostic violations */);
  } else {
    toast.error(error instanceof Error ? error.message : "Optimizer failed.");
  }
}
```

**Required addition — add a 401 branch before the generic else:**
```typescript
} catch (error) {
  if (error instanceof OptimizerRequestError && error.status === 401) {
    toast.error("Your session has expired. Please sign in again.");
    await supabase.auth.signOut();
    navigate("/");
  } else if (error instanceof OptimizerRequestError && error.status === 400 && error.diagnostic) {
    setOptimizerDiagnostics(error.diagnostic);
    toast.error(/* diagnostic violations */);
  } else {
    toast.error(error instanceof Error ? error.message : "Optimizer failed.");
  }
}
```

**Why `signOut()` + `navigate("/")`:** The Welcome page (`/`) already has `onAuthStateChange` which redirects appropriately when session is null. Calling `supabase.auth.signOut()` clears the local session before navigating, ensuring the user is prompted to sign in again. `signOut` is already used in `Welcome.tsx` and the mock is established in test files — this follows the existing pattern.

**Why not `refreshSession()`:** The Supabase client already handles token refresh automatically for database queries. A 401 from the optimizer means the token was rejected by the optimizer's own validation (or truly expired). Attempting a silent refresh loop adds complexity with no benefit for this low-traffic tool.

### Pattern 3: `.env.example` Update

**What:** Update the `VITE_OPTIMIZER_URL` line in `.env.example` from `/api/optimizer` to the Cloud Run URL, so future developers know the production value without consulting docs.

**Current:**
```
VITE_OPTIMIZER_URL="/api/optimizer"
```

**Recommended change:**
```
VITE_OPTIMIZER_URL="https://optimizer-ek4bkd34ja-ew.a.run.app"
```

This is in Claude's Discretion. Given the phase goal, updating it is the right call — the localhost value is now incorrect for production deployments.

### Anti-Patterns to Avoid

- **Redeploy without env var:** Redeploying Vercel without first setting the env var will compile the fallback `/api/optimizer` into the bundle. Always verify the env var is saved in the dashboard before redeploying.
- **Setting env var for Development only:** The locked decision requires Production AND Preview. Checking only one scope is easy to miss in the Vercel UI.
- **Silent 401 swallow:** The current `else` branch catches 401 but shows a generic message with no re-auth flow. This satisfies success criterion 4 only if a specific 401 branch is added.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token refresh | Custom token refresh loop | Supabase client auto-refresh + signOut on 401 | Supabase JS client handles refresh automatically; 401 from optimizer is a hard auth failure, not a refresh opportunity |
| CORS proxy | Vercel rewrite rule `/api/optimizer` → Cloud Run | Direct Cloud Run URL via env var | Already decided in CONTEXT.md; proxy adds latency, complexity, and a second failure point |
| Auth guard on every page | Global auth interceptor middleware | `getAuthHeaders()` guard in `api.ts` + 401 handler in call site | Already implemented; adding middleware adds complexity with no gain at this scale |

## Common Pitfalls

### Pitfall 1: Env Var Not Reflected in Deployed Bundle
**What goes wrong:** Developer sets the env var in Vercel but the live deployment still calls `/api/optimizer` because it uses the old compiled bundle.
**Why it happens:** Vite bakes env vars at build time. The Vercel deployment serving requests was compiled before the env var was set.
**How to avoid:** After saving the env var in the Vercel dashboard, trigger a new deployment (Redeploy from latest commit, or push a trivial commit).
**Warning signs:** Network tab in the browser shows requests to `/api/optimizer` (relative path) or 404s.

### Pitfall 2: Preview Deployments Use Stale Scope
**What goes wrong:** Preview deploys work but production doesn't (or vice versa) because the env var was only scoped to one environment.
**Why it happens:** Vercel env vars are scoped independently per environment (Production, Preview, Development).
**How to avoid:** In the Vercel dashboard, check both Production and Preview checkboxes when creating the env var entry.
**Warning signs:** Production smoke test passes but PR preview deploys show the old fallback URL.

### Pitfall 3: 401 Branch Not Reached Because getAuthHeaders Throws First
**What goes wrong:** A 401 from the optimizer is masked because `getAuthHeaders()` throws `"Sign in before saving or optimizing a roster."` when the session is missing, before the fetch even fires.
**Why it happens:** `getAuthHeaders()` in `api.ts` checks `session?.access_token` and throws a plain `Error` (not `OptimizerRequestError`) when the session is absent. This path is distinct from the optimizer returning 401.
**Research finding:** The 401 scenario means the session exists locally but is rejected by the Cloud Run optimizer (e.g., token expired server-side but not yet locally expired). Both paths should show an appropriate message.
**How to handle:** The 401 branch in PupilData covers the "token rejected by server" case. The existing `getAuthHeaders` error path covers "no local session." Both result in the user being directed to re-authenticate — consistent behavior.

### Pitfall 4: Network Tab Shows OPTIONS Preflight Failing
**What goes wrong:** Browser console shows a CORS preflight failure, blocking the actual POST.
**Why it happens:** The Cloud Run optimizer uses `allow_origin_regex='.*'` — this should pass all preflights. If a preflight fails, it may indicate a Cloud Run service configuration issue (e.g., the service is not `--allow-unauthenticated`, causing IAM to reject OPTIONS before the app handles it).
**How to avoid:** Smoke test must check the Network tab explicitly. If OPTIONS returns 4xx, the issue is upstream of the app code.
**Warning signs:** Browser console shows "CORS policy" error; OPTIONS request shows 403 or 401.

## Code Examples

### Current `getOptimizerBaseUrl()` — no change needed
```typescript
// Source: src/lib/api.ts line 97-99
function getOptimizerBaseUrl() {
  return ((import.meta.env.VITE_OPTIMIZER_URL as string | undefined) ?? "/api/optimizer").replace(/\/$/, "");
}
```

### Current `getAuthHeaders()` — no change needed
```typescript
// Source: src/lib/api.ts lines 153-169
async function getAuthHeaders(signal?: AbortSignal) {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Sign in before saving or optimizing a roster.");
  }

  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }

  return {
    authorization: `Bearer ${session.access_token}`
  };
}
```

### Required change to `runOptimizer()` catch block in PupilData.tsx
```typescript
// Source: src/pages/PupilData.tsx lines 470-481 (current)
// Add the 401 branch as the first condition:
} catch (error) {
  if (error instanceof OptimizerRequestError && error.status === 401) {
    toast.error("Your session has expired. Please sign in again.");
    await supabase.auth.signOut();
    navigate("/");
  } else if (error instanceof OptimizerRequestError && error.status === 400 && error.diagnostic) {
    setOptimizerDiagnostics(error.diagnostic);
    toast.error(
      error.diagnostic.violations
        .map((violation) => `${violation.message}\nSuggestion: ${violation.suggestion}`)
        .join("\n\n"),
      { duration: 8000 }
    );
  } else {
    toast.error(error instanceof Error ? error.message : "Optimizer failed.");
  }
}
```

### Smoke Test Checklist (manual, no automation)
```
1. Open https://<vercel-production-url> in browser
2. Sign in with a real Supabase user account
3. Open an existing project that has pupils
4. Click "Run Optimizer"
5. Expected: result appears, navigate to /results/<projectId>
6. Check: browser console — zero errors, zero CORS warnings
7. Check: Network tab — optimization POST goes to https://optimizer-ek4bkd34ja-ew.a.run.app/project
8. Check: Network tab — request has Authorization: Bearer <token> header
9. Check: 200 response with optimizer result JSON
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localhost optimizer via `/api/optimizer` | Cloud Run via `VITE_OPTIMIZER_URL` | Phase 9 | Frontend stops requiring local Docker stack |
| No 401 handling in optimizer call | 401 triggers signOut + navigate("/") | Phase 9 | Expired sessions redirect to login instead of silent failure |
| `.env.example` shows `/api/optimizer` | Updated to Cloud Run URL | Phase 9 | New developers see the correct production value |

## Open Questions

1. **Token expiry window vs. Cloud Run request duration**
   - What we know: Supabase access tokens expire after 1 hour by default. Cloud Run timeout is 300s.
   - What's unclear: If a user starts a long optimization near the token expiry boundary, the token may expire mid-request server-side.
   - Recommendation: Not a blocking concern for Phase 9. The optimizer reads Supabase data at request start, not continuously. If the token is valid at request start, the optimization proceeds. A 401 would only occur at the initial auth check. Accept this edge case as non-blocking.

2. **Preview deployments and Supabase auth redirect URL**
   - What we know: `.env.example` has `VITE_AUTH_REDIRECT_URL="http://localhost:5173"`. Preview deployments have dynamic URLs.
   - What's unclear: Whether preview deployments can complete the Supabase auth flow.
   - Recommendation: Not in scope for Phase 9 (the locked decision only requires setting `VITE_OPTIMIZER_URL` for preview, not fixing auth flows). The smoke test is against production, not preview. Flag as a known gap.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test -- src/pages/__tests__/` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WIRE-01 | `getOptimizerBaseUrl()` returns `VITE_OPTIMIZER_URL` when set | unit | `npm test -- src/lib/__tests__/api-url.test.ts -x` | ❌ Wave 0 |
| WIRE-01 | `getOptimizerBaseUrl()` falls back to `/api/optimizer` when env var absent | unit | same file | ❌ Wave 0 |
| WIRE-02 | `runOptimizer()` catches status 401 and calls `supabase.auth.signOut()` + `navigate("/")` | unit | `npm test -- src/pages/__tests__/optimizer-401.test.tsx -x` | ❌ Wave 0 |
| WIRE-02 | Bearer token forwarding verified by Cloud Run smoke test | manual | — (manual browser test against production) | manual-only |

**Note on manual-only items:** The full end-to-end Bearer token + RLS validation requires a real Supabase session against the live Cloud Run service. This cannot be automated in a unit test environment without live credentials and a running Cloud Run instance. Manual smoke test per the CONTEXT.md protocol is the acceptance gate.

### Sampling Rate
- **Per task commit:** `npm test -- src/lib/__tests__/api-url.test.ts src/pages/__tests__/optimizer-401.test.tsx -x`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green + manual production smoke test before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/api-url.test.ts` — covers WIRE-01 env var reading and fallback
- [ ] `src/pages/__tests__/optimizer-401.test.tsx` — covers WIRE-02 401 handler (signOut + navigate)

*(Existing test infrastructure covers the vitest setup; only new test files are needed.)*

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/lib/api.ts` — full implementation of `getOptimizerBaseUrl()`, `getAuthHeaders()`, `optimizeProject()`, `scoreProjectAssignment()`
- Direct code inspection: `src/pages/PupilData.tsx` — full `runOptimizer()` function and existing error handling
- Direct code inspection: `src/pages/Welcome.tsx` — existing `signOut()` pattern and `onAuthStateChange` usage
- Direct code inspection: `src/lib/supabase.ts` — `createClient` with anon key
- Direct code inspection: `.env.example` — current `VITE_OPTIMIZER_URL="/api/optimizer"` value
- Direct code inspection: `vercel.json` — no proxy/rewrite rules for optimizer
- Direct code inspection: `vitest.config.ts` — test framework config
- CONTEXT.md (09-CONTEXT.md) — locked decisions, constraints, Cloud Run URL

### Secondary (MEDIUM confidence)
- Vite env var documentation pattern: `import.meta.env.VITE_*` is baked at build time — this is standard Vite behavior, consistent with the existing `getOptimizerBaseUrl()` implementation
- Vercel env var scoping: Production/Preview/Development scope checkboxes — standard Vercel dashboard behavior

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, full code inspection of existing implementation
- Architecture: HIGH — code behavior directly observable, no inference required
- Pitfalls: HIGH — pitfalls derived from direct code analysis and platform mechanics, not speculation
- 401 handling pattern: HIGH — existing `signOut()` + `navigate("/")` pattern already present in Welcome.tsx

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable phase — Cloud Run URL and Supabase patterns don't change)
