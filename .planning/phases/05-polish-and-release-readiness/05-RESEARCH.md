# Phase 5: Polish and Release Readiness - Research

**Researched:** 2026-03-20
**Domain:** Frontend design system, Tailwind v4, ESLint/Prettier, pytest, vitest, Playwright
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Design Token Authority**
- PRD.md is the authoritative design spec for colors and typography, not DESIGN.md
- Fonts: Cabinet Grotesk for headings/buttons, Satoshi for body text (replace Manrope), JetBrains Mono for data/numbers
- Colors: Primary #0F172A, Accent #2563EB, Background #F8FAFC, Surface #FFFFFF, Text #334155, Muted #94A3B8
- Style: 4px border radius everywhere. 1px solid borders (#E2E8F0) instead of drop shadows. Dense spacing (4px/8px/16px steps)
- Branding: App name is "SkoleGeni" (not "Academic Clarity" or other Stitch placeholder names)

**Navigation & Layout**
- Persistent left sidebar on all five screens with SkoleGeni branding and nav links (Setup, Configuration, Pupil Data, Results)
- Sidebar matches the pattern shown in Stitch designs: app name + subtitle at top, icon+label nav items, active state with blue highlight and left border indicator

**Welcome / Setup Screen**
- Keep the simple centered approach from PRD (480px modal card, Create New Roster CTA, recent projects list)
- Do NOT adopt the full dashboard overview from Stitch designs (that's scope creep toward multi-project analytics)
- Adapt the centered card to work with the new sidebar layout

**Results Screen**
- Add a Class Breakdown table below the score metric cards
- Table columns: Class Name, Capacity (e.g., 24/24), Health Score (percentage + progress bar), ACTION (VIEW link)
- Keep existing ClassCard detail view accessible via the VIEW action
- Worst-class highlighting with color-coded health bars (green/orange/red)

**Pupil Data Screen**
- Add chemistry summary stat cards below the pupil table
- Cards for: total pupils with complex mappings, positive chemistry pairs count, negative chemistry pairs count
- Matches the Stitch pupil_mode_refined_inline_entry design pattern

**Visual Audit Approach**
- Pixel-level pass against Stitch design reference screens
- Each screen should closely match its Stitch counterpart for layout, spacing, typography, card borders, and color usage
- Stitch reference screens located at `stitch_skolegeni/` directory

**Test Coverage**
- Critical paths only — minimum viable safety net
- Python optimizer unit tests: pytest suite for feasibility checks, score calculation, infeasibility diagnostics
- JS scoring parity tests: vitest tests ensuring rosterValidation JS scoring matches Python scoring for identical inputs
- One full e2e journey: Playwright test covering create project -> configure -> add pupils -> optimize -> view results
- Builds on existing vitest + Playwright infrastructure from Phase 2

**Toolchain**
- Tailwind v4: Keep current @tailwindcss/postcss v4 setup. Clean up config to be fully v4-compliant. Update PRD build guide reference
- Pin dependency versions: Replace all `*` versions in package.json with actual resolved versions from package-lock.json
- Add ESLint + Prettier: Standard React/TypeScript linting and consistent formatting
- Add .gitignore: Standard ignores for dist/, node_modules/, __pycache__/, .env, etc.

### Claude's Discretion
- Exact sidebar width and icon choices
- ESLint rule configuration details
- Tailwind v4 migration specifics (CSS-first config vs JS config)
- Test fixture data design
- How to source Satoshi font (Google Fonts CDN or self-hosted)

### Deferred Ideas (OUT OF SCOPE)
- Full dashboard analytics (Total Projects, Pupils Processed, Average Score)
- Class Network View (graph visualization of chemistry links)
- Documentation and Settings screens shown in Stitch sidebar
- Reports screen shown in some Stitch designs
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| QUAL-01 | Team can run automated tests that cover optimizer logic, import/persistence behavior, and a basic end-to-end roster flow | pytest already covers optimizer; vitest covers JS; Playwright covers e2e — all three frameworks are installed and configured |
| QUAL-02 | Team can run the project on a current, documented toolchain without relying on outdated frontend build conventions | Tailwind v4 is installed (4.2.2). PRD build guide says "Tailwind CSS v3" — must update. `*` wildcards in package.json must be pinned. ESLint/Prettier must be added |
| UX-01 | User experiences a visually consistent desktop-first interface aligned with the SkoleGeni design language across all five screens | Design tokens partially present; Manrope must be replaced by Satoshi; sidebar layout wrapper needed; Results screen needs class breakdown table; Pupil screen needs chemistry stat cards |
</phase_requirements>

---

## Summary

Phase 5 has three parallel workstreams that each address a specific unmet requirement. The toolchain plan (05-01) resolves QUAL-02 by pinning dependency versions, migrating Tailwind config to be fully v4-compliant, and adding ESLint/Prettier. The UI polish plan (05-02) resolves UX-01 by wrapping all routes in a persistent sidebar layout, replacing Manrope with Satoshi, and adding new UI sections to the Results and Pupil Data screens. The test plan (05-03) resolves QUAL-01 by building on existing pytest, vitest, and Playwright infrastructure with targeted new test files.

The codebase is in good shape. All five page components exist, the design token colors are correct in `tailwind.config.js`, and the test infrastructure (vitest + Playwright) is already configured and passing. The gaps are: (1) Manrope font still in use instead of Satoshi, (2) `tailwind.config.js` still uses JS-config format while Tailwind v4's canonical approach is CSS-first `@theme`, (3) no sidebar layout wrapper in `App.tsx`, (4) `package.json` has `*` versions for most dependencies, (5) no ESLint/Prettier config, (6) no `.gitignore`, and (7) no JS-vs-Python scoring parity tests or full e2e journey test.

**Primary recommendation:** Execute 05-01 (toolchain) first to give a clean foundation, then 05-02 (UI polish) in parallel with 05-03 (tests) — UI changes and test additions are independent.

---

## Standard Stack

### Core (already installed — versions from package-lock.json)

| Library | Resolved Version | Purpose | Status |
|---------|-----------------|---------|--------|
| tailwindcss | 4.2.2 | Utility-first CSS | Installed — needs v4 cleanup |
| @tailwindcss/postcss | 4.2.2 | PostCSS plugin for v4 | Installed |
| vite | 8.0.0 | Build tool | Installed |
| react | 19.2.4 | UI framework | Installed |
| react-router-dom | (wildcard — pinned in lock) | Routing | Installed |
| vitest | 4.1.0 | Unit/component tests | Installed |
| @playwright/test | 1.58.2 | E2E tests | Installed |
| typescript | 5.9.3 | Type safety | Installed |

### To Be Added (Plan 05-01)

| Library | Purpose | Notes |
|---------|---------|-------|
| eslint | JS/TS linting | Use v9 flat config format (`eslint.config.js`) |
| @typescript-eslint/parser | TypeScript ESLint parsing | Required for TS support |
| @typescript-eslint/eslint-plugin | TS lint rules | Standard type-aware rules |
| eslint-plugin-react | React lint rules | react/recommended |
| eslint-plugin-react-hooks | Hooks rules | exhaustive-deps rule is critical |
| prettier | Code formatting | Single config, no options file needed by default |
| eslint-config-prettier | Disable ESLint format rules that conflict with Prettier | Required when using both |

**Installation:**
```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks eslint-config-prettier prettier
```

### Alternatives Considered

| Standard | Alternative | Tradeoff |
|----------|-------------|----------|
| ESLint v9 flat config | `.eslintrc` format | Old format is deprecated in ESLint 9; flat config is current default |
| Fontshare CDN for Satoshi | Self-hosted font files | CDN is simpler; self-hosting gives offline reliability but adds setup cost |
| Tailwind CSS-first `@theme` | Keep JS `tailwind.config.js` | JS config still works with explicit `@config` directive; CSS-first is the v4 canonical approach but both work |

---

## Architecture Patterns

### Plan 05-01: Toolchain Cleanup

**Tailwind v4 — Two valid approaches:**

Tailwind v4 introduced CSS-first configuration via the `@theme` directive. The current project uses `@config "../tailwind.config.js"` in `src/index.css` which is the v4-compatible way to keep a JS config. Both approaches work:

**Option A (CSS-first — canonical v4):** Move all token definitions into `src/index.css` using `@theme`, delete `tailwind.config.js`:
```css
/* Source: https://tailwindcss.com/docs/upgrade-guide */
@import "tailwindcss";
@theme {
  --font-heading: "Cabinet Grotesk", ui-sans-serif, system-ui;
  --font-body: "Satoshi", ui-sans-serif, system-ui;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular;
  --color-primary: #0F172A;
  --color-accent: #2563EB;
  --color-background: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-text: #334155;
  --color-muted: #94A3B8;
  --radius: 4px;
}
```

**Option B (keep JS config with explicit load):** Keep `tailwind.config.js` and the existing `@config` directive in `src/index.css`. This is fully v4-compatible; the `@config` directive is the documented v4 bridge for JS configs. **Recommendation: Use Option B** — lower risk, the `@config` directive is explicitly documented and the current setup already works.

**Pinning package.json versions:**
Replace each `"*"` entry with the version string from `package-lock.json`. No `npm install` changes required — just update the manifest to reflect reality.

**ESLint v9 flat config structure:**
```js
// eslint.config.js — Source: https://typescript-eslint.io/getting-started/
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { react: reactPlugin, "react-hooks": reactHooksPlugin },
    rules: {
      "react/react-in-jsx-scope": "off",  // Not needed with React 17+ JSX transform
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    }
  },
  prettierConfig  // Must be last — disables format rules
);
```

**Satoshi font sourcing:**
Satoshi is published by Indian Type Foundry on Fontshare. The CDN embed approach:
```html
<!-- Add to index.html or import in index.css -->
<link href="https://api.fontshare.com/v2/css?f[]=satoshi@700,500,400&display=swap" rel="stylesheet">
```
Or update the existing Google Fonts import in `src/index.css` to add Satoshi via Fontshare alongside the existing Cabinet Grotesk and JetBrains Mono imports. Cabinet Grotesk is also on Fontshare.

### Plan 05-02: UI Polish

**Sidebar Layout Wrapper Pattern:**

Wrap all routes except Welcome in a persistent `AppShell` component. The Welcome screen remains full-screen (centered card, no sidebar) per the PRD spec.

```tsx
// src/components/layout/AppShell.tsx
import { NavLink, Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <div className="flex h-screen bg-background">
      <aside className="w-56 border-r border-[#E2E8F0] bg-surface flex flex-col shrink-0">
        {/* SkoleGeni branding at top */}
        <div className="px-4 py-5 border-b border-[#E2E8F0]">
          <div className="font-heading font-bold text-primary text-base">SkoleGeni</div>
          <div className="text-xs text-muted mt-0.5">Roster Optimizer</div>
        </div>
        {/* Nav items */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          <SidebarLink to="/configure/:id" label="Configuration" />
          <SidebarLink to="/pupils/:id" label="Pupil Data" />
          <SidebarLink to="/results/:id" label="Results" />
          <SidebarLink to="/editor/:id" label="Class Editor" />
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
```

Update `App.tsx` routes:
```tsx
// All project-scoped routes share the layout
<Route element={<AppShell />}>
  <Route path="/configure/:projectId" element={<Configuration />} />
  <Route path="/pupils/:projectId" element={<PupilData />} />
  <Route path="/results/:projectId" element={<Results />} />
  <Route path="/editor/:projectId" element={<ClassEditor />} />
</Route>
```

The sidebar nav link active state: use `NavLink` from react-router-dom which provides `isActive` prop. Active style: `bg-accent/10 text-accent border-l-2 border-accent`. Inactive: `text-text hover:bg-background`.

**Font replacement (Manrope → Satoshi):**

Two places to update:
1. `src/index.css` — change the `@import url(...)` to include Satoshi instead of Manrope; change `body { font-family }` to use Satoshi
2. `tailwind.config.js` — change `body` font family from `["Manrope", ...]` to `["Satoshi", ...]`

**Results Screen — Class Breakdown Table:**

New section below existing score cards. Each row: Class Name (`font-heading`), Capacity (`x/y` in `font-mono`), Health Score (progress bar with color coding), VIEW link (routes to editor).

Health bar color thresholds:
- `>= 0.8`: green (`bg-green-500`)
- `>= 0.6`: orange/amber (`bg-amber-500`)
- `< 0.6`: red (`bg-red-500`)

The worst-class data is already available in optimizer `debug.worst_class_highlights`. The per-class score data is available in `OptimizedClass` results from the optimizer response.

**Pupil Data Screen — Chemistry Stat Cards:**

Three stat cards added below the pupil table:
1. Pupils with complex mappings (has at least one chemistry link)
2. Positive chemistry pairs count
3. Negative chemistry pairs count

Chemistry data is already loaded by `PupilData.tsx` (from the `chemistry` table via Supabase). Count cards just need to aggregate from the existing state.

### Anti-Patterns to Avoid

- **Do not animate the sidebar** — Linear/Retool aesthetic is static, not slide-in. Keep it fixed.
- **Do not apply sidebar to the Welcome screen** — PRD spec calls for a centered modal card. The sidebar is only for project-scoped screens.
- **Do not use `tailwind-merge` redundantly** — The codebase already has `clsx` in use. Use `clsx` for conditionals; `tailwind-merge` is already installed for conflict resolution.
- **Do not add `drop-shadow` utilities** — PRD explicitly specifies `1px solid #E2E8F0` borders instead of shadows.
- **Do not run `npm install` to pin versions** — Only edit `package.json` to match the lock file. Running install after changing wildcards to exact pins will not change actual installed code.

### Plan 05-03: Automated Tests

**Existing infrastructure (do not recreate):**
- `vitest.config.ts` — jsdom environment, globals, setup file at `src/test/setup.ts`
- `playwright.config.ts` — Desktop Chrome, base URL, webServer with Vite dev server
- `tests/fixtures/` — pattern for shared test data (see `durableEditingData.ts`)
- `tests/helpers/` — pattern for Supabase route mocking (see `durableEditingSupabaseRoutes.ts`)
- Existing pytest files: `api/test_optimizer.py`, `api/test_scores_explainability.py`, `api/test_fixtures.py`

**New test files for Phase 5:**

| File | Type | Purpose |
|------|------|---------|
| `api/test_feasibility.py` | pytest | Feasibility edge cases: min > max pupils, zero pupils, single class |
| `src/lib/__tests__/rosterValidation-parity.test.ts` | vitest | JS scores match Python scores for identical 6-pupil fixture |
| `tests/e2e/full-journey.spec.ts` | Playwright | Create project → configure → add pupils via CSV → optimize → view results |

**JS/Python parity test strategy:**

The parity test creates a known 6-pupil fixture that is identical to one used by `api/test_scores_explainability.py`. The JS `validateRoster()` function in `src/lib/rosterValidation.ts` is called with the same assignment and constraints. The test asserts that scores fall within a small epsilon (±0.05) of the Python scores computed by `_optimize_request()` on the same input.

Key insight: the JS scoring does not need to be bit-identical to Python. It needs to be directionally consistent — same rough magnitude for each sub-score. The test protects against regressions where a refactor shifts a score category dramatically.

**Full e2e journey test strategy:**

Builds on the Supabase route-mocking pattern from `tests/helpers/phase2SupabaseRoutes.ts`. The journey test:
1. Mocks all Supabase calls (same pattern as existing e2e tests)
2. Creates project on Welcome screen
3. Sets constraints on Configuration screen
4. Imports CSV on Pupil Data screen
5. Clicks "Run Optimizer" — mocked optimizer response returns a known valid result
6. Verifies Results screen shows the score and class count
7. Does NOT navigate to Class Editor (that's covered by `tests/e2e/durable-editing.spec.ts`)

The optimizer call must be mocked because the Python service is not running during CI. Mock via `page.route('/api/optimizer/*', ...)` with a pre-built valid `OptimizeResponse` fixture.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sidebar active link detection | Manual `location.pathname` comparison | `NavLink` from react-router-dom | Built-in `isActive` prop handles nested routes correctly |
| Font loading | Self-hosted font files with manual woff2 | Fontshare CDN embed | Zero setup, free license, no build step |
| TypeScript lint rules | Custom ESLint rules | `@typescript-eslint` preset | Covers 50+ TS-specific anti-patterns |
| Code style enforcement | Manual style review | Prettier | Deterministic, no debates |
| Test data factories | Complex builder classes | Plain TypeScript object literals | Existing pattern in `tests/fixtures/` — lightweight, readable |

---

## Common Pitfalls

### Pitfall 1: Sidebar breaks Welcome screen layout
**What goes wrong:** Wrapping ALL routes in AppShell puts a sidebar on the Welcome centered-modal screen, breaking its full-viewport layout.
**Why it happens:** Developers wrap `<Routes>` instead of selectively wrapping project-scoped routes.
**How to avoid:** Use `<Route element={<AppShell />}>` only for `/configure/:id`, `/pupils/:id`, `/results/:id`, `/editor/:id`. Leave `<Route path="/" element={<Welcome />} />` outside.
**Warning signs:** Welcome screen shows a narrow sidebar on the left with the modal card shifted right.

### Pitfall 2: Tailwind v4 `@config` directive placement
**What goes wrong:** Moving the `@config` directive after `@import "tailwindcss"` breaks custom token resolution.
**Why it happens:** In Tailwind v4, `@config` must come after the `@import "tailwindcss"` line. The current `src/index.css` has the correct order already — do not shuffle imports.
**How to avoid:** Keep `@import "tailwindcss"` first, `@config` second.

### Pitfall 3: ESLint `react-hooks/exhaustive-deps` false positives on Supabase effect hooks
**What goes wrong:** Many existing `useEffect` hooks in page components reference `supabase` (imported singleton) and dependency arrays omit it. ESLint will flag these.
**Why it happens:** `supabase` is a module-level singleton — adding it to dependency arrays doesn't change behavior, but ESLint can't prove that.
**How to avoid:** Set `react-hooks/exhaustive-deps` to `"warn"` not `"error"` for Phase 5. Document known exceptions with `// eslint-disable-next-line` comments where the hook is intentionally stable.

### Pitfall 4: Parity test flakiness from floating point
**What goes wrong:** The JS and Python scoring algorithms produce slightly different floating point results, causing parity tests to fail intermittently.
**Why it happens:** JS and Python use different floating point implementations for division and rounding.
**How to avoid:** Assert scores within ±0.05 tolerance using `expect(jsScore).toBeCloseTo(pyScore, 1)` (vitest's `toBeCloseTo`), not strict equality.

### Pitfall 5: E2E optimizer mock missing required response fields
**What goes wrong:** Playwright test mocks the optimizer but the mock response is missing fields that the Results page expects, causing React render crashes.
**Why it happens:** `OptimizeResponse` has many nested fields. A minimal mock omits `debug`, `score`, or class-level score fields.
**How to avoid:** Build the mock response from the TypeScript `OptimizeResponse` type. Start from the fixture in `api/test_scores_explainability.py` and convert to JSON. Verify the mock produces the exact shape the `Results.tsx` component accesses.

### Pitfall 6: Satoshi/Cabinet Grotesk font flash on load
**What goes wrong:** Users briefly see the system fallback font before custom fonts load.
**Why it happens:** Fontshare CDN is external; fonts load after initial paint.
**How to avoid:** Add `font-display=swap` to the Fontshare URL query params (already the default). Acceptable for a desktop-first internal tool — do not block render for font loading.

---

## Code Examples

### AppShell sidebar with React Router NavLink active state
```tsx
// src/components/layout/AppShell.tsx
import { NavLink, Outlet, useParams } from "react-router-dom";
import clsx from "clsx";

function SidebarLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-2.5 px-3 py-2 rounded-[4px] text-sm transition-colors",
          isActive
            ? "bg-accent/10 text-accent border-l-2 border-accent font-medium"
            : "text-text hover:bg-background"
        )
      }
    >
      {label}
    </NavLink>
  );
}
```

### Tailwind v4 CSS-first theme (if migrating away from JS config)
```css
/* src/index.css */
@import "tailwindcss";
@theme {
  --font-heading: "Cabinet Grotesk", ui-sans-serif, system-ui;
  --font-body: "Satoshi", ui-sans-serif, system-ui;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular;
  --color-primary: #0F172A;
  --color-accent: #2563EB;
  --color-background: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-text: #334155;
  --color-muted: #94A3B8;
}
/* Source: https://tailwindcss.com/docs/upgrade-guide */
```

### Pinned package.json fragment (sample — use lock file values)
```json
{
  "dependencies": {
    "@dnd-kit/core": "6.3.1",
    "@dnd-kit/sortable": "^9.0.0",
    "@supabase/supabase-js": "2.99.2",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "react-router-dom": "^7.5.1",
    "zustand": "5.0.12"
  }
}
```

### Vitest parity test structure
```ts
// src/lib/__tests__/rosterValidation-parity.test.ts
import { describe, expect, it } from "vitest";
import { validateRoster } from "../rosterValidation";

// Fixture mirrors api/test_scores_explainability.py build_request()
const PUPILS = [
  { id: "p1", name: "Ada", gender: "Female", originSchool: "North", needs: "None", zone: "A" },
  { id: "p2", name: "Bo", gender: "Male", originSchool: "North", needs: "Support", zone: "A" },
  // ... 4 more
];
const ASSIGNMENT = [["p1", "p2", "p3"], ["p4", "p5", "p6"]];
const CONSTRAINTS = { minClassSize: 3, maxClassSize: 3, genderPriority: "flexible", ... };
const CHEMISTRY = { positive: [["p1","p2"]], negative: [] };

// Python reference scores (from running the optimizer on this fixture)
const PY_SCORES = { overall: 0.72, genderBalance: 0.78, originMix: 0.65, ... };

describe("rosterValidation JS/Python parity", () => {
  it("produces scores within 0.05 of Python optimizer for identical input", () => {
    const result = validateRoster({ assignment: ASSIGNMENT, pupils: PUPILS, chemistry: CHEMISTRY, constraints: CONSTRAINTS });
    expect(result.scores.overall).toBeCloseTo(PY_SCORES.overall, 1);
    expect(result.scores.genderBalance).toBeCloseTo(PY_SCORES.genderBalance, 1);
  });
});
```

### Playwright optimizer mock pattern
```ts
// tests/e2e/full-journey.spec.ts
import { expect, test } from "@playwright/test";

test("full roster journey", async ({ page }) => {
  // Mock optimizer endpoint
  await page.route("**/api/optimizer/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_OPTIMIZE_RESPONSE)
    });
  });
  // ... rest of journey
});
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|-----------------|-------|
| Tailwind v3 JS config with `tailwind.config.js` | Tailwind v4 with `@config` directive or native `@theme` | PRD build guide still says "Tailwind CSS v3" — update required |
| `*` wildcard package versions | Pinned exact versions from lock file | Wildcards resolved correctly at install time but obscure the actual running version |
| No linting config | ESLint 9 flat config (`eslint.config.js`) | ESLint 9 deprecates `.eslintrc` — use flat config |
| `.eslintrc.js` format | `eslint.config.js` (flat config) | New default since ESLint 9 |
| Manrope body font | Satoshi body font | PRD specifies Satoshi; current code uses Manrope |

**Deprecated/outdated in current project:**
- `package.json` wildcard `*` versions: obscures the actual dependency graph
- `body { font-family: "Manrope" }` in `src/index.css`: must change to Satoshi
- `fontFamily.body: ["Manrope", ...]` in `tailwind.config.js`: must change to Satoshi
- Build Guide in `PRD.md` references "Tailwind CSS v3" — update to v4

---

## Open Questions

1. **Cabinet Grotesk on Fontshare vs Google Fonts**
   - What we know: Cabinet Grotesk is on Fontshare (same service as Satoshi). Current `src/index.css` imports it from Google Fonts.
   - What's unclear: Whether Google Fonts carries a version that matches Fontshare's weight range (400/500/700).
   - Recommendation: Keep Cabinet Grotesk on Google Fonts if it loads successfully today. Migrate both to Fontshare if Google Fonts lacks the needed weights. Do not mix if avoidable.

2. **Python parity test fixture — exact score values**
   - What we know: The `api/test_scores_explainability.py` build_request() fixture exists with 6 pupils and positive chemistry links.
   - What's unclear: The exact numeric Python scores for that fixture are not pre-computed in the test file (only bounds checks are done).
   - Recommendation: During Plan 05-03 implementation, run the optimizer locally with the fixture to capture the exact scores, then hardcode them as parity targets in the vitest test.

3. **Sidebar navigation — projectId URL params**
   - What we know: All project-scoped routes use `:projectId` in the path.
   - What's unclear: The `AppShell` sidebar links need the current `projectId` to construct nav URLs. The `useParams()` hook inside `AppShell` will return it, but this means the sidebar cannot be rendered outside a route that provides `:projectId`.
   - Recommendation: The AppShell should use `useParams()` to extract `projectId` and construct hrefs like `/configure/${projectId}`. This is the correct pattern since the sidebar only renders for project-scoped routes.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| JS Framework | Vitest 4.1.0 |
| JS Config file | `vitest.config.ts` |
| Python Framework | pytest (see `api/test_optimizer.py`) |
| Python Config | None (run from `api/` directory) |
| Quick run command (JS) | `npm test` |
| Full suite command (JS) | `npm test && npm run test:e2e` |
| Python test command | `cd api && pytest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QUAL-01 | Optimizer feasibility and scoring logic | pytest unit | `cd api && pytest test_feasibility.py` | ❌ Wave 0 |
| QUAL-01 | JS/Python scoring parity for identical inputs | vitest unit | `npm test -- src/lib/__tests__/rosterValidation-parity.test.ts` | ❌ Wave 0 |
| QUAL-01 | Full e2e roster journey | Playwright e2e | `npm run test:e2e -- tests/e2e/full-journey.spec.ts` | ❌ Wave 0 |
| QUAL-02 | Project builds without warnings | build smoke | `npm run build` | ✅ (via `verify:phase1` script) |
| UX-01 | Sidebar renders on all project-scoped screens | vitest component | `npm test -- src/components/layout/AppShell.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test && npm run test:e2e`
- **Phase gate:** Full suite green (`npm test && npm run test:e2e && cd api && pytest`) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `api/test_feasibility.py` — covers QUAL-01 optimizer edge cases
- [ ] `src/lib/__tests__/rosterValidation-parity.test.ts` — covers QUAL-01 JS/Python parity
- [ ] `tests/e2e/full-journey.spec.ts` — covers QUAL-01 e2e journey
- [ ] `src/components/layout/AppShell.test.tsx` — covers UX-01 sidebar presence
- [ ] `tests/fixtures/fullJourneyData.ts` — shared mock data for e2e journey test

---

## Sources

### Primary (HIGH confidence)
- Package-lock.json analysis — all resolved versions verified directly from the lock file
- `tailwind.config.js`, `src/index.css`, `package.json`, `src/App.tsx`, `playwright.config.ts`, `vitest.config.ts` — current implementation state verified by direct file read
- `05-CONTEXT.md` — locked user decisions, canonical references, deferred scope
- [Tailwind CSS v4 upgrade guide](https://tailwindcss.com/docs/upgrade-guide) — `@config` directive, `@theme` directive, v4 CSS-first migration
- [typescript-eslint getting started](https://typescript-eslint.io/getting-started/) — flat config setup

### Secondary (MEDIUM confidence)
- [Fontshare Satoshi](https://www.fontshare.com/fonts/satoshi) — official Fontshare source, CDN embed pattern verified
- [Tailwind CSS v4 announcement](https://tailwindcss.com/blog/tailwindcss-v4) — Oxide engine, CSS-first direction confirmed
- [ESLint 9 flat config guide](https://jeffbruchado.com.br/en/blog/eslint-9-flat-config-migration-configuration-guide-2025) — flat config syntax for React + TypeScript

### Tertiary (LOW confidence)
- WebSearch results for "ESLint 9 React TypeScript 2025" — confirmed flat config is current, not independently verified against official ESLint 9 docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions taken from lock file, no guessing
- Architecture (sidebar pattern): HIGH — react-router-dom NavLink is well-documented; pattern matches project's existing Router usage
- Tailwind v4 cleanup: HIGH — official upgrade guide consulted; current setup is already functional, cleanup is additive
- Test patterns: HIGH — existing test files in project provide direct templates; pytest files exist in `api/`
- Font sourcing: MEDIUM — Fontshare is the official source for Satoshi but CDN availability not verified by direct test
- ESLint config: MEDIUM — flat config documented, exact rule set is Claude's discretion

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable toolchain — library versions won't shift in 30 days)
