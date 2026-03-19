# Feature Landscape

**Domain:** Desktop-first class roster optimization for school administrators
**Researched:** 2026-03-19

## Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Project-based roster workflow | Admins need to save, reopen, and iterate on roster setups | Low | Already present in MVP, but needs stronger lifecycle clarity |
| Constraint configuration | The product only matters if balancing rules are configurable | Medium | Must be explicit, validated, and explainable |
| Bulk pupil import plus manual editing | Real school data starts in CSV/SIS exports, then needs cleanup | Medium | Import quality strongly affects trust |
| Positive and negative relationship handling | Social dynamics are a major reason to use a tool like this | Medium | Must be easy to edit and easy to audit |
| Optimization run output with quality scores | Users need a reason to trust generated classes | Medium | Scores need plain-language interpretation, not just percentages |
| Manual refinement after generation | Administrators need final human control | Medium | A non-editable optimizer result is not enough |
| Save history / latest result recovery | Staff need confidence they can resume work | Medium | Especially important after long data-entry sessions |
| Validation and conflict feedback | Admin tools must show what is wrong before and after optimization | Medium | Missing validation erodes trust quickly |

## Trust-Building Features

| Feature | Why It Matters | Complexity | Notes |
|---------|----------------|------------|-------|
| Clear explanation of unmet constraints | Users need to know why a result is imperfect | Medium | Particularly important when strict goals conflict |
| Optimization run history | Lets staff compare runs and avoid fear of losing the "good" one | Medium | Pairs naturally with saved constraints snapshots |
| Safer persistence semantics | Admins need confidence that save operations will not silently corrupt data | High | Replace destructive delete-and-reinsert writes |
| Audit trail for manual changes | Final class decisions should be defensible | High | Even a lightweight change log adds real value |
| Human-readable class summaries | Showing pupil names, counts, and issues is essential for review | Low | Current ID-heavy results weaken usability |
| Import diagnostics | Users need actionable feedback on malformed rows and missing columns | Medium | Prevents bad inputs from poisoning the run |

## Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Real-time score updates in the editor | Makes manual refinement feel intelligent rather than blind | Medium | Already partially present; needs alignment with optimizer logic |
| Chemistry-aware editor safeguards | Prevents accidental placement mistakes during drag-and-drop | Medium | Strong fit with the product’s core promise |
| Scenario comparison between runs | Helps admins choose between multiple acceptable roster shapes | High | Good v1.5+ candidate after baseline trust work |
| Constraint weighting presets | Speeds up setup for common school policies | Medium | Useful once the current constraint model is stable |
| SIS-friendly import profiles | Reduces friction for real school datasets | High | Valuable later, but not required before core polish |

## Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Mobile-first redesign | The workflow is data-dense and explicitly desktop-oriented | Keep desktop as primary surface |
| Broad school management suite expansion | Pulls focus away from the roster-generation core | Stay within the roster planning lifecycle |
| Over-automated hidden decision making | Reduces trust in a high-stakes admin workflow | Prefer explainable outputs and editable results |
| Complex real-time collaboration in v1 | High cost and coordination complexity | Focus on reliable single-user project flows first |

## Brownfield Polish Priorities
1. Make saves and reloads trustworthy.
2. Improve import, validation, and conflict feedback.
3. Make results and editor output readable and defensible.
4. Align the UI more tightly with the intended SkoleGeni design system.
5. Add enough test coverage to stop breaking the core workflow.

## Feature Dependencies

```text
Safer persistence -> run history -> trustworthy results review
Import diagnostics -> clean pupil dataset -> meaningful optimizer output
Constraint validation -> explainable scores -> editor trust
Readable results -> manual refinement -> audit trail
```

## MVP Recommendation

Prioritize:
1. Safer persistence and data recovery
2. Import and validation clarity
3. Readable optimization results plus reliable editor refinement

Defer:
- Scenario comparison: useful, but not before baseline trust issues are fixed
- SIS-specific import profiles: valuable after generic CSV import becomes robust

## Confidence
- Table stakes: HIGH
- Trust features: HIGH
- Differentiators: MEDIUM

## Sources
- PRD.md in this repo
- README.md in this repo
- Enriching Students release notes: https://support.enrichingstudents.com/hc/en-us/articles/35864679038861-Start-Of-2025-2026-School-Year-Release
- U.S. Department of Education student data guidance: https://studentprivacy.ed.gov/sites/default/files/resource_document/file/Policies%20for%20Users%20of%20Student%20Data%20Checklist.pdf
