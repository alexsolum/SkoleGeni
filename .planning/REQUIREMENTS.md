# Requirements: SkoleGeni

**Defined:** 2026-03-19
**Core Value:** School staff can generate balanced, defensible class rosters quickly without losing control over the final result.

## v1 Requirements

### Workflow

- [ ] **WFLO-01**: Administrator can create a new roster project and reopen a recent project from the welcome flow.
- [ ] **WFLO-02**: Administrator can return to an in-progress project and recover saved constraints, pupils, chemistry links, optimization runs, and draft class edits.
- [ ] **WFLO-03**: Administrator can see clear loading, validation, success, and failure states throughout the setup and roster-building workflow.

### Constraints

- [ ] **CNST-01**: Administrator can set class size bounds with enforced valid ranges before optimization runs.
- [ ] **CNST-02**: Administrator can configure balancing priorities for gender, origin school, location/zone, and academic needs.
- [ ] **CNST-03**: Administrator can understand when constraints were applied strictly, softened, or could not be fully satisfied in the final result.

### Pupil Data

- [ ] **PUPL-01**: Administrator can import pupil data from CSV with clear field expectations and row-level error feedback.
- [ ] **PUPL-02**: Administrator can add, edit, and remove pupils manually in a dense table workflow.
- [ ] **PUPL-03**: Administrator can define positive and negative chemistry links through a searchable pupil-selection flow.
- [ ] **PUPL-04**: Administrator can save pupil and chemistry data without partial-write corruption or silent data loss.

### Optimization

- [ ] **OPTI-01**: Administrator can run the optimizer against the current project data and receive a completed result or a clear failure state.
- [ ] **OPTI-02**: Administrator can view a readable score breakdown for each optimization run, including major tradeoffs and warnings.
- [ ] **OPTI-03**: Administrator can revisit the latest saved optimization result and prior saved runs for a project.

### Review and Editing

- [ ] **EDIT-01**: Administrator can review generated classes using pupil names, class counts, and readable summaries instead of internal identifiers.
- [ ] **EDIT-02**: Administrator can move pupils between classes and receive immediate feedback about conflicts and score changes.
- [ ] **EDIT-03**: Administrator can save manual class edits as a durable draft and reopen them later.
- [ ] **EDIT-04**: Administrator can clearly distinguish generated output, in-progress edits, and finalized roster decisions.

### Trust and Quality

- [ ] **TRST-01**: Administrator project data is protected by controlled access rules instead of open anonymous write access.
- [ ] **TRST-02**: Critical optimizer and workflow behavior is covered by automated tests so regressions are caught before release.

## v2 Requirements

### Output and Integrations

- **OUTP-01**: Administrator can export final rosters in a school-friendly format.
- **OUTP-02**: Administrator can compare multiple optimization runs side by side.
- **OUTP-03**: Administrator can import/export through district-specific SIS integrations.

### Collaboration

- **COLL-01**: Multiple staff members can collaborate on the same roster project with clear ownership or change history.
- **COLL-02**: Administrator can view an audit trail of major project and roster decisions.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native mobile experience | Product is explicitly desktop-first and admin-task oriented |
| Broad school operations suite beyond roster generation | Current milestone is focused on finishing and polishing the class-generation workflow |
| Full optimizer rewrite in another language/runtime | Existing solver is the correct baseline; reliability and explainability matter more now |
| District-specific SIS integrations in v1 | CSV-first workflow is enough for the current product stage |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| WFLO-01 | Phase 2 | Pending |
| WFLO-02 | Phase 2 | Pending |
| WFLO-03 | Phase 2 | Pending |
| CNST-01 | Phase 2 | Pending |
| CNST-02 | Phase 2 | Pending |
| CNST-03 | Phase 3 | Pending |
| PUPL-01 | Phase 2 | Pending |
| PUPL-02 | Phase 2 | Pending |
| PUPL-03 | Phase 2 | Pending |
| PUPL-04 | Phase 2 | Pending |
| OPTI-01 | Phase 3 | Pending |
| OPTI-02 | Phase 3 | Pending |
| OPTI-03 | Phase 3 | Pending |
| EDIT-01 | Phase 4 | Pending |
| EDIT-02 | Phase 4 | Pending |
| EDIT-03 | Phase 4 | Pending |
| EDIT-04 | Phase 4 | Pending |
| TRST-01 | Phase 1 | Pending |
| TRST-02 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after initial definition*
