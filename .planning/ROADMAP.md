# Roadmap: SkoleGeni

**Created:** 2026-03-19
**Project:** `.planning/PROJECT.md`
**Requirements:** `.planning/REQUIREMENTS.md`
**Research:** `.planning/research/SUMMARY.md`
**Granularity:** standard

## Overview

This roadmap treats the current MVP as a validated baseline and focuses on finishing and polishing it into a dependable v1. The phase order follows the research outcome: secure the foundation first, stabilize the workflow, improve optimization trust, make manual editing durable, tighten the product UI, then lock in regression coverage and release readiness.

## Phase Summary

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Platform Hardening | Secure and type the app foundation so future work is safe to build on | TRST-01 | 4 |
| 2 | Workflow Reliability | Make project setup, constraints, pupil entry, chemistry, and saving dependable | WFLO-01, WFLO-02, WFLO-03, CNST-01, CNST-02, PUPL-01, PUPL-02, PUPL-03, PUPL-04 | 5 |
| 3 | Optimization Transparency | Make optimization runs trustworthy, explainable, and easy to revisit | CNST-03, OPTI-01, OPTI-02, OPTI-03 | 4 |
| 4 | Durable Class Editing | Turn manual refinement into a persistent, understandable workflow | EDIT-01, EDIT-02, EDIT-03, EDIT-04 | 4 |
| 5 | Product Polish | Align the experience tightly with the intended SkoleGeni design language and admin workflow quality | Cross-cutting polish supporting all v1 requirements | 4 |
| 6 | Verification and Release Readiness | Add the automated checks and smoke paths needed to ship confidently | TRST-02 | 4 |

## Phase Details

### Phase 1: Platform Hardening
**Goal:** Replace MVP-grade trust shortcuts with a safer, typed, production-ready foundation.

**Requirements:**
- TRST-01

**Success criteria:**
1. Sensitive project data is no longer writable through open anonymous access.
2. The app uses typed database boundaries instead of repeated handwritten shape mapping.
3. Multi-step or privileged writes have a safer execution path than direct ad hoc page mutations.
4. Environment and local-development configuration clearly separate development convenience from production behavior.

### Phase 2: Workflow Reliability
**Goal:** Make the project creation, configuration, pupil entry, chemistry, and save/reload experience dependable for real admin work.

**Requirements:**
- WFLO-01
- WFLO-02
- WFLO-03
- CNST-01
- CNST-02
- PUPL-01
- PUPL-02
- PUPL-03
- PUPL-04

**Success criteria:**
1. Users can start a project, leave, and return without losing project state.
2. Constraint and pupil workflows provide clear validation and failure feedback at the point of use.
3. CSV import supports the documented format with clear row-level problem reporting.
4. Chemistry links can be created and preserved reliably through save/reload cycles.
5. Save operations do not leave projects in a silently corrupted partial state.

### Phase 3: Optimization Transparency
**Goal:** Make optimization output legible, trustworthy, and recoverable.

**Requirements:**
- CNST-03
- OPTI-01
- OPTI-02
- OPTI-03

**Success criteria:**
1. Running the optimizer produces a clear success, failure, or infeasible-result state.
2. Results explain key score components and important tradeoffs in administrator-friendly language.
3. Users can reopen the latest run and inspect prior saved runs for the same project.
4. Results are displayed using real pupil and class context instead of internal-only identifiers.

### Phase 4: Durable Class Editing
**Goal:** Make manual class refinement persistent, understandable, and safe.

**Requirements:**
- EDIT-01
- EDIT-02
- EDIT-03
- EDIT-04

**Success criteria:**
1. Users can manually move pupils between classes and get immediate conflict/score feedback.
2. Manual edits persist as a draft or equivalent durable state across reloads.
3. The UI clearly distinguishes generated assignments, saved edits, and finalized roster state.
4. Users can reopen and continue a prior editing session without reconstructing their changes manually.

### Phase 5: Product Polish
**Goal:** Bring the entire workflow into tighter alignment with the intended SkoleGeni interaction and visual standard.

**Requirements:**
- Cross-cutting polish supporting all active v1 requirements

**Success criteria:**
1. The welcome, configuration, pupil, results, and editor screens feel visually and behaviorally consistent.
2. Dense admin workflows remain fast, legible, and desktop-first rather than decorative or sparse.
3. Loading, empty, and error states match the intended product tone and reduce user uncertainty.
4. The UI reflects domain language and human-readable output throughout the core journey.

### Phase 6: Verification and Release Readiness
**Goal:** Create enough automated verification and smoke coverage to support safe iteration and delivery.

**Requirements:**
- TRST-02

**Success criteria:**
1. Optimizer core logic has automated coverage for key constraint and chemistry behavior.
2. Critical UI workflows have automated coverage for save/load and run-generation paths.
3. The local stack supports a repeatable smoke test for the main end-to-end flow.
4. Shipping changes to the roster workflow no longer depends entirely on manual confidence.

## Coverage Check

- v1 requirements mapped: 19 / 19
- Unmapped requirements: 0
- Brownfield baseline preserved: yes

## Ordering Rationale

1. Security and data trust must come before product polish.
2. Workflow reliability must come before optimizer and editor enhancements, because everything downstream depends on correct inputs and persistence.
3. Optimization transparency comes before durable editing so users understand the generated baseline.
4. Visual/system polish comes after the trust-critical structural work.
5. Verification closes the loop once the core workflow has been reshaped into testable boundaries.

---
*Last updated: 2026-03-19 after roadmap creation*
