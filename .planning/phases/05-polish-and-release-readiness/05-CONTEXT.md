# Phase 5: Polish and Release Readiness - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Bring the app into visual alignment with the intended SkoleGeni design system, modernize the toolchain, and add automated test coverage for critical flows. This phase covers UI consistency across all five screens, toolchain documentation and cleanup, and the minimum automated test safety net. It does not add new product capabilities.

</domain>

<decisions>
## Implementation Decisions

### Design Token Authority
- **PRD.md is the authoritative design spec** for colors and typography, not DESIGN.md
- **Fonts**: Cabinet Grotesk for headings/buttons, Satoshi for body text (replace Manrope), JetBrains Mono for data/numbers
- **Colors**: Primary #0F172A, Accent #2563EB, Background #F8FAFC, Surface #FFFFFF, Text #334155, Muted #94A3B8
- **Style**: 4px border radius everywhere. 1px solid borders (#E2E8F0) instead of drop shadows. Dense spacing (4px/8px/16px steps)
- **Branding**: App name is "SkoleGeni" (not "Academic Clarity" or other Stitch placeholder names)

### Navigation & Layout
- **Persistent left sidebar** on all five screens with SkoleGeni branding and nav links (Setup, Configuration, Pupil Data, Results)
- Sidebar matches the pattern shown in Stitch designs: app name + subtitle at top, icon+label nav items, active state with blue highlight and left border indicator

### Welcome / Setup Screen
- **Keep the simple centered approach** from PRD (480px modal card, Create New Roster CTA, recent projects list)
- Do NOT adopt the full dashboard overview from Stitch designs (that's scope creep toward multi-project analytics)
- Adapt the centered card to work with the new sidebar layout

### Results Screen
- **Add a Class Breakdown table** below the score metric cards
- Table columns: Class Name, Capacity (e.g., 24/24), Health Score (percentage + progress bar), ACTION (VIEW link)
- Keep existing ClassCard detail view accessible via the VIEW action
- Worst-class highlighting with color-coded health bars (green/orange/red)

### Pupil Data Screen
- **Add chemistry summary stat cards** below the pupil table
- Cards for: total pupils with complex mappings, positive chemistry pairs count, negative chemistry pairs count
- Matches the Stitch pupil_mode_refined_inline_entry design pattern

### Visual Audit Approach
- **Pixel-level pass** against Stitch design reference screens
- Each screen should closely match its Stitch counterpart for layout, spacing, typography, card borders, and color usage
- Stitch reference screens located at `stitch_skolegeni/` directory

### Test Coverage
- **Critical paths only** — minimum viable safety net
- **Python optimizer unit tests**: pytest suite for feasibility checks, score calculation, infeasibility diagnostics
- **JS scoring parity tests**: vitest tests ensuring rosterValidation JS scoring matches Python scoring for identical inputs
- **One full e2e journey**: Playwright test covering create project -> configure -> add pupils -> optimize -> view results
- Builds on existing vitest + Playwright infrastructure from Phase 2

### Toolchain
- **Tailwind v4**: Keep current @tailwindcss/postcss v4 setup. Clean up config to be fully v4-compliant. Update PRD build guide reference
- **Pin dependency versions**: Replace all `*` versions in package.json with actual resolved versions from package-lock.json
- **Add ESLint + Prettier**: Standard React/TypeScript linting and consistent formatting
- **Add .gitignore**: Standard ignores for dist/, node_modules/, __pycache__/, .env, etc.

### Claude's Discretion
- Exact sidebar width and icon choices
- ESLint rule configuration details
- Tailwind v4 migration specifics (CSS-first config vs JS config)
- Test fixture data design
- How to source Satoshi font (Google Fonts CDN or self-hosted)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design & Product
- `PRD.md` — Authoritative design system (colors, typography, spacing, screen specs), screen specifications for all five screens, key flows
- `DESIGN.md` — Secondary design reference (NOT authoritative for fonts/colors, but useful for spacing/roundedness guidance)
- `stitch_skolegeni/` — Stitch design reference screens for pixel-level visual alignment:
  - `stitch_skolegeni/dashboard_overview/screen.png` — Welcome/Dashboard design
  - `stitch_skolegeni/configuration_mode_updated_sidebar/screen.png` — Configuration screen with sidebar
  - `stitch_skolegeni/pupil_mode_refined_inline_entry/screen.png` — Pupil data with inline chemistry entry
  - `stitch_skolegeni/optimization_results_with_sidebar/screen.png` — Results overview with class table
  - `stitch_skolegeni/class_editor_with_sidebar/screen.png` — Class editor with violation panel
  - `stitch_skolegeni/blueprint_precision/DESIGN.md` — Stitch design tokens (reference only, PRD.md takes precedence)

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — Phase-linked requirements: `QUAL-01`, `QUAL-02`, `UX-01`
- `.planning/ROADMAP.md` — Phase 5 boundary and success criteria
- `.planning/PROJECT.md` — Product baseline, constraints, key decisions

### Existing Implementation
- `tailwind.config.js` — Current design tokens (needs update to match PRD)
- `src/index.css` — Current CSS variables and font imports
- `src/App.tsx` — Current routing (needs sidebar layout wrapper)
- `src/pages/Welcome.tsx` — Welcome screen
- `src/pages/Configuration.tsx` — Configuration screen
- `src/pages/PupilData.tsx` — Pupil data screen
- `src/pages/Results.tsx` — Results screen
- `src/pages/ClassEditor.tsx` — Class editor screen
- `src/components/ui/Button.tsx` — Existing shared UI component
- `src/lib/rosterValidation.ts` — JS scoring engine (needs parity tests)
- `api/optimizer.py` — Python optimizer (needs unit tests)
- `package.json` — Dependencies to pin, scripts to update

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/Button.tsx`: Existing shared UI component — extend pattern for more shared primitives
- `src/components/ClassCard.tsx` + `ClassCard.test.tsx`: Class display component with existing tests
- `src/components/PupilCard.test.tsx`: Existing pupil card tests
- `src/lib/rosterValidation.ts`: JS scoring engine — target for parity tests
- `src/lib/pupilWorkflow.ts`: Established debounced autosave pattern
- Phase 2 test infrastructure: vitest config, Playwright config, test helpers

### Established Patterns
- Tailwind utility classes for all styling (no CSS modules or styled-components)
- React Router for page navigation (needs wrapping in sidebar layout)
- `clsx` for conditional class composition
- Toast notifications via `react-hot-toast`
- Zustand + zundo for state management in Class Editor

### Integration Points
- `src/App.tsx` route graph needs a shared layout wrapper component with sidebar
- All five page components need layout adjustments to work within sidebar + content area
- Font imports in `src/index.css` need updating (Manrope -> Satoshi)
- `tailwind.config.js` font family config needs Satoshi substitution

</code_context>

<specifics>
## Specific Ideas

- PRD says "Inspired by: Linear, Retool" — both use dense, utility-focused layouts with persistent sidebars and minimal decoration
- Use 1px solid borders (#E2E8F0) instead of drop shadows for the flat, technical, paper-like aesthetic specified in PRD
- The Stitch Class Editor design shows a floating "Constraint Violation" panel at bottom-right — this already exists as the Issues Sidebar from Phase 4, but may need repositioning
- Stitch Pupil Mode shows inline chemistry tags (green +, red -) directly in the table row — good pattern for at-a-glance chemistry visibility
- JetBrains Mono for all numerical data (scores, counts, percentages) to maintain the technical/precise feel

</specifics>

<deferred>
## Deferred Ideas

- Full dashboard analytics (Total Projects, Pupils Processed, Average Score) — belongs in a future analytics/reporting phase
- Class Network View (graph visualization of chemistry links) — shown in Stitch designs but is a new capability, not part of Phase 5 polish
- Documentation and Settings screens shown in Stitch sidebar — new capabilities beyond current scope
- Reports screen shown in some Stitch designs — new capability for v2

</deferred>

---

*Phase: 05-polish-and-release-readiness*
*Context gathered: 2026-03-20*
