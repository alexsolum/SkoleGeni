# Roadmap: SkoleGeni

## Overview

This roadmap takes the existing SkoleGeni MVP and turns it into a more trustworthy, polished, and supportable v1. The order is deliberate: first secure and stabilize data handling, then harden the core optimizer workflow, then make manual editing durable, and finally finish the visual and verification work needed for confident iteration.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Secure Data Foundation** - Lock down access and remove destructive persistence patterns
- [x] **Phase 2: Reliable Project Workflow** - Make project setup, constraints, import, and saving trustworthy
- [ ] **Phase 3: Trustworthy Optimization Results** - Improve optimizer validation, outcomes, and explainability
- [ ] **Phase 4: Durable Class Editing** - Turn manual class editing into a persistent, dependable feature
- [ ] **Phase 5: Polish and Release Readiness** - Align the UI, test stack, and toolchain for safer ongoing delivery

## Phase Details

### Phase 1: Secure Data Foundation
**Goal**: Protect roster data and establish safe persistence boundaries for the app.
**Depends on**: Nothing (first phase)
**Requirements**: [SECU-01, SECU-02]
**Success Criteria** (what must be TRUE):
1. Authorized access to project data is enforced through explicit policies instead of unrestricted public CRUD.
2. Saving roster data no longer depends on delete-and-reinsert behavior that can leave partial state behind.
3. Local and production credential handling no longer relies on committed secrets or unsafe defaults.
**Plans**: 3 plans

Plans:
- [x] 01-01: Design and apply secure database access policies for the current project tables
- [x] 01-02: Refactor save paths away from destructive replace-all behavior
- [x] 01-03: Clean up environment and credential handling across local and deployed flows

### Phase 2: Reliable Project Workflow
**Goal**: Make the setup and pupil-entry flow resilient, validated, and easier to trust.
**Depends on**: Phase 1
**Requirements**: [FLOW-01, FLOW-02, FLOW-03, FLOW-04]
**Success Criteria** (what must be TRUE):
1. User can create, reopen, and continue a roster project without unexpected data loss.
2. Constraint entry and pupil import provide clear validation and actionable error feedback.
3. Saving pupils and chemistry behaves predictably across create, edit, and reload flows.
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — Create the Phase 2 test harness and make configuration restore/save authoritative
- [x] 02-02-PLAN.md — Add mapped CSV import, issues reporting, and debounced autosave to pupil workflow
- [x] 02-03-PLAN.md — Add reload/failure regressions and verify the end-to-end setup-to-save journey

### Phase 3: Trustworthy Optimization Results
**Goal**: Make optimizer runs easier to understand, debug, and defend.
**Depends on**: Phase 2
**Requirements**: [OPTI-01, OPTI-02, OPTI-03]
**Success Criteria** (what must be TRUE):
1. Optimizer outcomes clearly distinguish successful runs from infeasible or invalid requests.
2. Results screens show human-readable class information and meaningful summaries.
3. Users can understand the major score drivers and tradeoffs behind a generated roster.
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — Improve optimizer request validation and error modeling in the Python API
- [x] 03-02-PLAN.md — Redesign results presentation around names, summaries, and constraint signals
- [ ] 03-03-PLAN.md — Add explainability output and regression fixtures for solver behavior

### Phase 4: Durable Class Editing
**Goal**: Make manual class editing a persistent part of the product instead of an ephemeral client-side step.
**Depends on**: Phase 3
**Requirements**: [EDIT-01, EDIT-02, EDIT-03]
**Success Criteria** (what must be TRUE):
1. Manual moves persist and are restored when the user returns to the editor.
2. Invalid moves are blocked with clear explanations tied to the violated rule.
3. Users can continue refining a saved roster without losing the last accepted assignment state.
**Plans**: 3 plans

Plans:
- [ ] 04-01: Design and implement a saved assignment or revision model for manual edits
- [ ] 04-02: Connect the class editor to durable persistence and reload behavior
- [ ] 04-03: Improve conflict feedback and score recalculation trust in the editor

### Phase 5: Polish and Release Readiness
**Goal**: Bring the app into visual alignment with the intended design system and add the safety net needed for ongoing work.
**Depends on**: Phase 4
**Requirements**: [QUAL-01, QUAL-02, UX-01]
**Success Criteria** (what must be TRUE):
1. The full five-screen journey looks and behaves as one coherent SkoleGeni product.
2. The project runs on a current documented toolchain and no longer depends on outdated frontend conventions.
3. Automated tests cover critical optimizer, persistence, and end-to-end flows.
**Plans**: 3 plans

Plans:
- [ ] 05-01: Upgrade and document the frontend toolchain and design-token implementation
- [ ] 05-02: Apply final UI and interaction polish across all core screens
- [ ] 05-03: Add automated tests and smoke checks for the critical user journey

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Secure Data Foundation | 3/3 | Complete | 2026-03-19 |
| 2. Reliable Project Workflow | 3/3 | Complete | 2026-03-20 |
| 3. Trustworthy Optimization Results | 2/3 | In Progress | - |
| 4. Durable Class Editing | 0/3 | Not started | - |
| 5. Polish and Release Readiness | 0/3 | Not started | - |
