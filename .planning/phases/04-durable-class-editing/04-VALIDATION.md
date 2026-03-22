# Phase 04: Durable Class Editing - Validation

**Defined:** 2026-03-20
**Phase Goal:** Make manual class editing a persistent part of the product instead of an ephemeral client-side step.

## Success Criteria (Nyquist Dimension 8)

| ID | Criteria | Verification Method |
|----|----------|---------------------|
| S4.1 | Manual moves persist across page reloads and browser sessions. | `npx playwright test tests/e2e/durable-editing.spec.ts` |
| S4.2 | "Red Card" states correctly identify rule violations (chemistry, size). | `vitest src/components/PupilCard.test.tsx` |
| S4.3 | Users can Undo/Redo moves and reset to the original optimizer result. | `vitest src/pages/ClassEditor.test.tsx` |

## Requirement Traceability

| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| EDIT-01 | Persistent manual moves | E2E | `npx playwright test tests/e2e/durable-editing.spec.ts` |
| EDIT-02 | Violation warnings and Red Card states | Component | `vitest src/components/PupilCard.test.tsx` |
| EDIT-03 | Refinement continuity and Undo/Redo | Integration | `vitest src/pages/ClassEditor.test.tsx` |

## Dimension 10: Regression Fixtures

- [ ] `tests/fixtures/manual_edit_scenarios.json` contains valid/invalid assignment states.
- [ ] `vitest src/lib/rosterValidation.test.ts` passes against all scenario fixtures.

## Manual Acceptance (Dimension 12)

- [ ] Persistence: Move a pupil, refresh the page, pupil stays in the new class.
- [ ] Undo/Redo: Perform 3 moves, click Undo 3 times, roster returns to original state.
- [ ] Red Card: Place "Negative Chemistry" pupils together, both cards show red borders.
- [ ] Reset: Click "Reset to Optimizer Result", manual edits are cleared, roster matches solver output.

---
*Phase: 04-durable-class-editing*
*Validation defined: 2026-03-20*
