# Requirements: SkoleGeni

**Defined:** 2026-03-19
**Core Value:** School staff can generate balanced, defensible class rosters quickly without losing control over the final result.

## v1 Requirements

### Projects

- [ ] **PROJ-01**: User can create a new roster project and reopen an existing one from the welcome screen.
- [ ] **PROJ-02**: User can return to a saved project and continue from previously saved constraints, pupil data, and latest roster state.

### Constraints

- [ ] **CONS-01**: User can define class size and balancing priorities before running the optimizer.
- [ ] **CONS-02**: User gets clear validation feedback when constraint combinations are invalid or risky.

### Pupil Data

- [ ] **DATA-01**: User can import pupil data from CSV with clear feedback on accepted columns and rejected rows.
- [ ] **DATA-02**: User can add and edit pupil records manually without losing prior saved data on partial failure.
- [ ] **DATA-03**: User can create and edit positive and negative chemistry links safely.

### Optimization

- [ ] **OPTI-01**: User can run the optimizer against the current saved project state and receive a persisted result.
- [ ] **OPTI-02**: User can see when constraints were not perfectly satisfied and which tradeoffs affected the result.
- [ ] **OPTI-03**: User can review generated classes using readable pupil names and class summaries rather than opaque identifiers.

### Refinement

- [ ] **EDIT-01**: User can manually move pupils between classes in the class editor.
- [ ] **EDIT-02**: User is prevented from making invalid moves that violate hard constraints such as negative chemistry blocks.
- [ ] **EDIT-03**: User can save manual class edits so the refined roster persists across reloads and later sessions.
- [ ] **EDIT-04**: User can see score changes and conflict feedback when refining classes.

### Reliability

- [ ] **RELY-01**: Sensitive data operations are protected by safer access controls than the current MVP-wide anonymous write model.
- [ ] **RELY-02**: Core optimizer, persistence, and roster workflow behaviors are covered by automated tests.
- [ ] **RELY-03**: The local development and verification workflow is documented and repeatable for future changes.

## v2 Requirements

### Collaboration

- **COLL-01**: Multiple staff users can collaborate on the same roster project with role-aware permissions.
- **COLL-02**: User can submit a roster for review and approval before finalization.

### Scenario Planning

- **SCEN-01**: User can compare multiple optimization runs side by side.
- **SCEN-02**: User can branch a project into alternative roster scenarios.

### Integrations

- **INTG-01**: User can import roster data from school information systems beyond CSV.
- **INTG-02**: User can export finalized classes in formats tailored to downstream school workflows.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile-first experience | Product is explicitly desktop-first |
| Broad school administration suite features | Not part of the core roster-generation value |
| Replacing the solver with a different optimization paradigm | Existing solver-based approach is the baseline to harden |
| Consumer/social engagement features | Misaligned with administrator workflow |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROJ-01 | Unmapped | Pending |
| PROJ-02 | Unmapped | Pending |
| CONS-01 | Unmapped | Pending |
| CONS-02 | Unmapped | Pending |
| DATA-01 | Unmapped | Pending |
| DATA-02 | Unmapped | Pending |
| DATA-03 | Unmapped | Pending |
| OPTI-01 | Unmapped | Pending |
| OPTI-02 | Unmapped | Pending |
| OPTI-03 | Unmapped | Pending |
| EDIT-01 | Unmapped | Pending |
| EDIT-02 | Unmapped | Pending |
| EDIT-03 | Unmapped | Pending |
| EDIT-04 | Unmapped | Pending |
| RELY-01 | Unmapped | Pending |
| RELY-02 | Unmapped | Pending |
| RELY-03 | Unmapped | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 0
- Unmapped: 17 ⚠️

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after initial definition*
