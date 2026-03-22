# Phase 03: Trustworthy Optimization Results - Research

**Researched:** 2026-03-19
**Domain:** Constraint Optimization & Explainable UI
**Confidence:** HIGH

## Summary
The research focuses on two pillars: (1) Diagnosing why the OR-Tools solver fails (Infeasibility) and (2) Visualizing and explaining why the solver made specific choices (Explainability). The primary recommendation is to use the **Enforcement Literal Pattern** in OR-Tools for diagnosis and **shadcn/ui Chart components** for distribution visualization.

**Primary recommendation:** Use OR-Tools `SufficientAssumptionsForInfeasibility` to identify conflicting constraints and present them as human-readable "relaxation suggestions" in the UI.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Specific Violations**: Identify hard rules violated (e.g., "Min Class Size too high").
- **Suggest Relaxation**: Suggest specific parameter changes (e.g., "Decrease Min Class Size by 2").
- **Include Soft Rules**: Report soft constraints if they are mathematically impossible.
- **Pupil Data Toast**: Show violations as a toast/banner on the Pupil Data screen.
- **Full List**: Class cards show full scrollable pupil names.
- **Charts**: Use donut/bar charts for gender and origin school distribution.
- **No Search**: No global search on Results screen.
- **Show Icons**: Visual indicators for chemistry links next to pupil names.
- **Satisfaction (95%)**: Present scores as positive percentages.
- **List Sacrificed Priorities**: Explicitly list compromised priorities.
- **Highlight Worst Class**: Highlight the class that performed worst in each category.
- **Percentages Only**: Global dashboard shows percentages; raw counts on individual cards.

### Claude's Discretion
- Research options for infeasibility diagnosis and tradeoff visualization.

### Deferred Ideas (OUT OF SCOPE)
- Comparison of multiple optimization runs.
- Auto-relaxing constraints (suggest only).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OPTI-01 | Success or infeasibility outcome | OR-Tools `SufficientAssumptionsForInfeasibility` provides the logic to identify failures. |
| OPTI-02 | Pupil names and class summaries | `shadcn/ui` charts and class card mapping patterns enable clear summaries. |
| OPTI-03 | Score factors and tradeoffs | Contrastive analysis and sub-score weighting research enables explainability. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ortools` | 9.15.6755 | CP-SAT Solver | Latest stable version (Jan 2026) with robust infeasibility core support. |
| `shadcn/ui` | Latest | UI Components | Provides highly accessible `Chart` components built on Recharts. |
| `recharts` | 2.12.7 | Charting Engine | Industry standard for React SVG charts with excellent small-card support. |

**Installation:**
```bash
pip install --upgrade ortools
npx shadcn@latest add card chart
```

## Architecture Patterns

### Pattern 1: Enforcement Literal (Assumption) Pattern
**What:** Wrapping constraints in Boolean variables to track their state.
**When to use:** Every hard constraint and tracked soft constraint in the model.
**Example:**
```python
# Source: OR-Tools Official Docs
lit = model.NewBoolVar('min_size_violation')
model.Add(class_size >= min_size).OnlyEnforceIf(lit)
model.AddAssumptions([lit])
# ... if INFEASIBLE:
core = solver.SufficientAssumptionsForInfeasibility()
```

### Pattern 2: Contrastive Explainability
**What:** Generating a "delta" explanation by running a counterfactual scenario.
**When to use:** Explaining "Why wasn't Priority X met?"
**How:** If a priority is sacrificed, run a small sub-problem where that priority is forced. The difference in total satisfaction score is the "cost" of that priority.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Conflict Search | Custom constraint toggling | `SufficientAssumptionsForInfeasibility` | Built-in SAT conflict analysis is significantly faster and more accurate. |
| Visualization | Custom SVG bars/donuts | `recharts` / `shadcn/ui` | Handles resizing, tooltips, and accessibility out of the box. |

## Common Pitfalls

### Pitfall 1: Multi-threaded Diagnostic Noise
**What goes wrong:** Solver returns a "bloated" or non-minimal unsatisfiable core.
**Why it happens:** Different threads find different conflicts; the first one returned might not be the most relevant.
**How to avoid:** Set `num_search_workers: 1` specifically when diagnosing infeasibility.

### Pitfall 2: Objective Function Interference
**What goes wrong:** Diagnosis returns "Everything is infeasible."
**Why it happens:** The solver cannot find a solution that is *both* feasible and meets an objective target.
**How to avoid:** Clear the objective function (`model.Minimize/Maximize`) when performing infeasibility diagnosis.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (Python) / vitest (React) |
| Config file | `pytest.ini` / `vitest.config.ts` |
| Quick run command | `pytest api/` / `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| OPTI-01 | API returns 400 with diagnostic JSON on infeasibility | Integration | `pytest api/test_optimizer.py` |
| OPTI-02 | UI renders donut charts for distribution | Unit | `vitest src/components/ClassCard.test.tsx` |
| OPTI-03 | Satisfaction scores sum correctly | Unit | `pytest api/test_scores.py` |
