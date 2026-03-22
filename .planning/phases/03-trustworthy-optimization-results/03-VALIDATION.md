# Phase 03: Trustworthy Optimization Results - Validation

**Defined:** 2026-03-19
**Phase Goal:** Make optimizer runs easier to understand, debug, and defend.

## Success Criteria (Nyquist Dimension 8)

| ID | Criteria | Verification Method |
|----|----------|---------------------|
| S3.1 | Optimizer outcomes clearly distinguish successful runs from infeasible or invalid requests. | `pytest api/test_optimizer.py::test_infeasibility_diagnosis` |
| S3.2 | Results screens show human-readable class information and meaningful summaries. | `vitest src/components/ClassCard.test.tsx` and manual visual check |
| S3.3 | Users can understand the major score drivers and tradeoffs behind a generated roster. | `pytest api/test_scores_explainability.py` and manual visual check |

## Requirement Traceability

| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| OPTI-01 | Success or infeasibility outcome | Integration | `pytest api/test_optimizer.py` |
| OPTI-02 | Pupil names and class summaries | Unit | `vitest src/components/ClassCard.test.tsx` |
| OPTI-03 | Score factors and tradeoffs | Unit | `pytest api/test_scores_explainability.py` |

## Dimension 10: Regression Fixtures

- [ ] `api/test_fixtures.py` exists and contains known feasible/infeasible roster scenarios.
- [ ] `pytest api/test_optimizer.py` (or a dedicated regression test) passes with consistent scores across runs.

## Manual Acceptance (Dimension 12)

- [ ] Infeasibility: Set Min Class Size > total pupils, run optimizer, see diagnostic toast on Pupil Data screen.
- [ ] Results: Generate classes, see full names and donut charts on each class card.
- [ ] Explainability: Hover over scores, see "Sacrificed Priorities" and "Worst Class" highlights.

---
*Phase: 03-trustworthy-optimization-results*
*Validation defined: 2026-03-19*
