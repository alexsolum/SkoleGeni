# Requirements: SkoleGeni

**Defined:** 2026-03-19  
**Core Value:** School staff can generate balanced, defensible class rosters quickly without losing control over the final result.

## v1 Requirements

### Security & Access

- [x] **SECU-01**: Authorized school staff can access roster data only through explicitly allowed project permissions and policies
- [x] **SECU-02**: Staff can save project changes without exposing unrestricted public CRUD access to student data

### Project Workflow

- [x] **FLOW-01**: User can create, reopen, and continue a roster project without losing previously saved setup data
- [x] **FLOW-02**: User can save and update class constraints with clear validation before moving to pupil entry
- [x] **FLOW-03**: User can import pupil data from CSV and immediately see validation feedback for missing or malformed fields
- [x] **FLOW-04**: User can save pupil and chemistry changes without destructive data-loss behavior during normal edits

### Optimization Results

- [x] **OPTI-01**: User can run the optimizer and receive a clear success or infeasibility outcome instead of a generic failure
- [x] **OPTI-02**: User can review generated classes using pupil names and class summaries rather than opaque identifier fragments
- [x] **OPTI-03**: User can understand the major score factors and tradeoffs that produced the optimizer result

### Manual Editing

- [x] **EDIT-01**: User can manually move pupils between classes and keep those edits after refresh or later return
- [x] **EDIT-02**: User can make an invalid manual move, immediately sees it flagged as a conflict, and receives a clear explanation of the violated rule while continuing to edit.
- [x] **EDIT-03**: User can reopen the class editor and continue from the latest saved assignment state

### Quality & Experience

- [x] **QUAL-01**: Team can run automated tests that cover optimizer logic, import/persistence behavior, and a basic end-to-end roster flow
- [x] **QUAL-02**: Team can run the project on a current, documented toolchain without relying on outdated frontend build conventions
- [x] **UX-01**: User experiences a visually consistent desktop-first interface aligned with the SkoleGeni design language across all five screens

## v2 Requirements

### Scenario Planning

- **SCEN-01**: User can compare multiple generated roster scenarios for the same project
- **SCEN-02**: User can keep alternate manual-edit branches before choosing a final roster

### Reporting & Export

- **EXPT-01**: User can export roster results in a staff-friendly format for review and handoff
- **EXPT-02**: User can print or share a summary of score tradeoffs and constraint satisfaction

### Integrations

- **INTG-01**: User can import pupil data directly from an SIS or district data source
- **INTG-02**: User can sync finalized classes back to an external system

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile-first experience | Product direction is explicitly desktop-first and the core UI is data-dense |
| Full master scheduling system | Much broader problem space than class placement and balancing |
| AI-generated placement rationale | Deterministic trust and traceable rule explanations are higher priority |
| Deep SIS integrations in this milestone | Valuable, but not part of finishing and polishing the current MVP baseline |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SECU-01 | Phase 1 | Complete |
| SECU-02 | Phase 1 | Complete |
| FLOW-01 | Phase 2 | Complete |
| FLOW-02 | Phase 2 | Complete |
| FLOW-03 | Phase 2 | Complete |
| FLOW-04 | Phase 2 | Complete |
| OPTI-01 | Phase 3 | Complete |
| OPTI-02 | Phase 3 | Complete |
| OPTI-03 | Phase 3 | Complete |
| EDIT-01 | Phase 4 | Complete |
| EDIT-02 | Phase 4 | Complete |
| EDIT-03 | Phase 4 | Complete |
| QUAL-01 | Phase 5 | Complete |
| QUAL-02 | Phase 5 | Complete |
| UX-01 | Phase 5 | Complete |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-19*  
*Last updated: 2026-03-21 after Phase 5 Plan 03 completion*
