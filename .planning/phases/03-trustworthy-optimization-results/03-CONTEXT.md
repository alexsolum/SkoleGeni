# Phase 3: Trustworthy Optimization Results - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase hardens the optimizer's feedback loop and results presentation. It moves the user from "black box" optimization to a transparent, defensible outcome. It covers infeasibility reporting, human-readable results, and score explainability. It does not cover manual roster editing (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Infeasibility Diagnosis
- **Specific Violations**: When optimization fails, the app must identify the specific hard rules that were violated (e.g., "Min Class Size (20) too high for total pupils (100) across 6 classes").
- **Suggest Relaxation**: The error feedback must suggest specific parameter changes to achieve feasibility (e.g., "Decrease Min Class Size by 2 or increase Max Class Size by 2").
- **Include Soft Rules**: If soft constraints (like gender balance) are mathematically impossible to satisfy even partially, they should also be reported alongside hard failures.
- **Pupil Data Toast**: If optimization fails, the user remains on the Pupil Data screen, and the specific violations are presented as a descriptive toast or notification banner.

### Results Detail Level
- **Full List**: Each class card in the Results view should show a full, scrollable list of pupil names rather than just a truncated preview.
- **Charts**: Use visual charts (e.g., simple donut or bar charts) on each class card to show the distribution of gender and origin school.
- **No Search**: No global search bar is required on the Results screen; the view focuses on high-level statistical balance and class composition.
- **Show Icons**: Display visual indicators (icons) for chemistry links (positive/negative) next to pupil names to explain their placement.

### Score Explainability
- **Satisfaction (95%)**: Present optimization scores as "Satisfaction" percentages (positive) rather than "Deductions" (negative).
- **List Sacrificed Priorities**: Explicitly list which priorities were "sacrificed" or compromised to satisfy others (e.g., "Gender balance was reduced to satisfy 100% of Chemistry links").
- **Highlight Worst Class**: For each scoring category (Gender, Origin, etc.), highlight the specific class that performed the worst to help the user identify where manual refinement might be needed.
- **Percentages Only**: Show only high-level percentage scores in the summary metrics; raw counts (e.g., "12/10 Gender split") are reserved for the individual class cards, not the global dashboard.

</decisions>

<canonical_refs>
## Canonical References

### Product and roadmap
- `.planning/PROJECT.md` — Product baseline and project-level non-negotiables
- `.planning/REQUIREMENTS.md` — Phase-linked requirements: `OPTI-01` to `OPTI-03`
- `.planning/ROADMAP.md` — Phase 3 boundary and success criteria
- `.planning/STATE.md` — Current project status

### Existing implementation
- `api/optimizer.py` — Current OR-Tools solver implementation and FastAPI endpoints
- `src/pages/Results.tsx` — Current results dashboard and class listing
- `src/lib/api.ts` — Type definitions for optimization requests and responses

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api/optimizer.py`: The `_solve_for_k` and `_optimize_request` functions are the core logic to be extended with infeasibility diagnosis.
- `src/pages/Results.tsx`: The `ScoreRadial` and `Meter` components are foundational for the expanded explainability UI.

### Established Patterns
- The optimizer currently uses a "Scale by 100" pattern for OR-Tools integers, which should be maintained for consistency.
- Success/Failure results are currently handled via standard FastAPI `HTTPException` codes.

### Integration Points
- The Python API needs a more structured error response model to return specific violated rules and relaxation suggestions.
- The `src/pages/Results.tsx` page needs to fetch the full pupil list (already in `result_json.classes`) and map them to names using the project's saved pupil data.
- The `OptimizationResults` screen needs to integrate a "Tradeoffs" section and "Worst Class" highlights.

</code_context>

<specifics>
## Specific Ideas
- Return a "diagnostic" object from the Python API when the solver returns `INFEASIBLE`.
- Use the `debug` field in `OptimizeResponse` to pass "Sacrificed Priorities" and "Worst Class" data to the frontend.
- Implement a simple "Relaxation Suggestion" helper in the Python API that checks total pupil count against `min_size * k` and `max_size * k`.

</specifics>

<deferred>
## Deferred Ideas
- Comparison of multiple optimization runs (handled by future phases if needed).
- Auto-relaxing constraints (the app suggests, but the user must click to apply and re-run).

</deferred>

---

*Phase: 03-trustworthy-optimization-results*
*Context gathered: 2026-03-19*
