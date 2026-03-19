# Roadmap: SkoleGeni

**Created:** 2026-03-19
**Project:** SkoleGeni
**Mode:** yolo
**Granularity:** standard

## Summary

This roadmap assumes the existing MVP is the baseline and focuses on finishing and polishing it into a dependable v1. The phase order is driven by trust: first make the data flow safe, then harden user input, then improve optimization review and manual refinement, then consolidate UI polish, and finally lock in quality gates.

## Phases

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Data Integrity and Safety | Make project persistence and access rules trustworthy | PROJ-01, PROJ-02, PROJ-03 | 3 |
| 2 | Input Workflow Hardening | Make data entry, CSV import, chemistry management, and constraint validation dependable | DATA-01, DATA-02, DATA-03, DATA-04 | 4 |
| 3 | Results and Editor Trust | Make optimizer outputs understandable, persistent, and safe to refine manually | OPTM-01, OPTM-02, OPTM-03, EDIT-01, EDIT-02, EDIT-03 | 5 |
| 4 | UI System Polish | Align the five-screen flow with the intended SkoleGeni design language and navigation quality | UX-01, UX-02 | 3 |
| 5 | Quality Gates and Release Readiness | Add verification and developer workflow reliability around the polished product | QLTY-01, QLTY-02 | 3 |

## Phase Details

### Phase 1: Data Integrity and Safety
**Goal:** Make project reads and writes recoverable, validated, and safer than the current MVP baseline.

**Requirements:** PROJ-01, PROJ-02, PROJ-03

**Success criteria:**
1. Returning to an existing project reliably restores the last saved constraints, pupil data, chemistry links, and latest result.
2. Save flows no longer depend on destructive replace-all writes that can silently lose data on partial failure.
3. The persistence layer uses safer access rules or write boundaries than the current broad anonymous CRUD setup.

### Phase 2: Input Workflow Hardening
**Goal:** Make setup and data entry reliable enough that optimization runs start from clean, understandable inputs.

**Requirements:** DATA-01, DATA-02, DATA-03, DATA-04

**Success criteria:**
1. CSV import surfaces row-level problems before optimization can run.
2. Manual pupil editing clearly marks missing or invalid required data.
3. Chemistry relationships are easy to create, inspect, and remove without ambiguity.
4. Constraint configuration prevents or explains invalid combinations before advancing.

### Phase 3: Results and Editor Trust
**Goal:** Make generated rosters readable, explainable, and safely refinable.

**Requirements:** OPTM-01, OPTM-02, OPTM-03, EDIT-01, EDIT-02, EDIT-03

**Success criteria:**
1. Each optimizer execution creates a persisted run artifact with useful metadata.
2. Results screens show named pupils, readable summaries, and clear score breakdowns.
3. Users can see when constraints conflict or when tradeoffs were made.
4. Drag-and-drop editing blocks or warns on invalid moves and recalculates useful feedback.
5. Manual refinements persist and remain distinguishable from raw optimizer output.

### Phase 4: UI System Polish
**Goal:** Bring all five product screens into a coherent desktop-first system that matches the intended SkoleGeni product identity.

**Requirements:** UX-01, UX-02

**Success criteria:**
1. Shared visual patterns, spacing, typography, and interaction states are consistent across the workflow.
2. Navigation between welcome, configuration, pupil, results, and editor screens feels deliberate and dead-end free.
3. Dense admin workflows remain readable and efficient rather than being simplified into a consumer-style UI.

### Phase 5: Quality Gates and Release Readiness
**Goal:** Add enough automated and documented verification to make the polished workflow maintainable.

**Requirements:** QLTY-01, QLTY-02

**Success criteria:**
1. Automated tests cover the critical project setup, input, optimization, and review flow plus major failure cases.
2. The documented local workflow reflects the real supported build and verification path.
3. The repo can be validated with repeatable commands before further feature work lands.

## Ordering Rationale

- Phase 1 reduces the highest-risk operational fragility.
- Phase 2 ensures optimization runs start from trustworthy inputs.
- Phase 3 improves the product’s core promise once the data foundation is reliable.
- Phase 4 consolidates design quality after workflow semantics stabilize.
- Phase 5 protects the finished baseline from regression.

## Research Notes

- Use the existing stack instead of rewriting.
- Prioritize explainability and persistence before expanding feature scope.
- Keep the product desktop-first and admin-dense.

---
*Last updated: 2026-03-19 after initial roadmap creation*
