# Domain Pitfalls

**Domain:** Class roster optimization for school administrators
**Researched:** 2026-03-19

## Critical Pitfalls

### Pitfall 1: Trusting opaque scores
**What goes wrong:** Users see percentages but cannot understand why the result is good or where it compromised.
**Why it happens:** Optimization output is treated as self-explanatory.
**Consequences:** Admins revert to manual processes or distrust the solver.
**Prevention:** Show constraint-level explanations, unmet rules, and readable class summaries.
**Detection:** Users ask "why did it place this pupil here?" or export results to re-check manually.

### Pitfall 2: Fragile save semantics
**What goes wrong:** Data entry sessions are lost or partially corrupted during save operations.
**Why it happens:** Replace-all writes and loosely validated payloads are easy to implement in MVPs.
**Consequences:** Lost confidence, duplicate work, difficult bug reports.
**Prevention:** Transactional writes, staged validation, recoverable run snapshots.
**Detection:** Intermittent missing pupils, broken chemistry rows, or stale results after edits.

### Pitfall 3: Weak admin-grade data controls
**What goes wrong:** Sensitive pupil data is too broadly readable or writable.
**Why it happens:** MVPs often disable policy controls to move faster.
**Consequences:** Security risk, compliance risk, and organizational distrust.
**Prevention:** Restore scoped access rules, validate writes centrally, and minimize public privileges.
**Detection:** Anonymous roles can perform broad CRUD or local configs contain secrets longer than intended.

## Moderate Pitfalls

### Pitfall 1: Import friction
**What goes wrong:** CSV data is technically accepted but semantically messy.
**Prevention:** Add row-level diagnostics, alias mapping feedback, and required-field summaries.

### Pitfall 2: Non-persistent manual edits
**What goes wrong:** The editor feels useful during a session but loses its value once the page reloads.
**Prevention:** Save refined assignments explicitly and distinguish them from raw optimizer output.

### Pitfall 3: UI polish before workflow safety
**What goes wrong:** The app looks sharper but remains hard to trust operationally.
**Prevention:** Prioritize integrity, explainability, and persistence before visual extras.

## Minor Pitfalls

### Pitfall 1: Over-expanding scope early
**What goes wrong:** The roadmap adds admin dashboards, collaboration, and SIS integrations too early.
**Prevention:** Keep the roadmap centered on the roster generation lifecycle.

### Pitfall 2: Treating desktop density as a design flaw
**What goes wrong:** Simplifying too aggressively removes the information density admins need.
**Prevention:** Polish the dense workflow instead of redesigning it into a consumer UI.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Data layer hardening | Preserving existing behavior while tightening writes | Add migration-safe data access wrappers and verify round-trips |
| Import and validation | Fixing obvious errors but missing semantic issues | Add structured row diagnostics and mandatory-field checks |
| Results and editor | Improving visuals without improving explainability | Add readable names, warnings, and persisted refined outputs |
| UI polish | Reworking screens without a shared component baseline | Extract common primitives before broad redesign |
| Testing | Writing only happy-path checks | Cover failure paths and persistence edge cases first |

## Confidence
- Core pitfalls: HIGH
- Phase mitigation guidance: MEDIUM

## Sources
- `.planning/codebase/CONCERNS.md`
- PRD.md in this repo
- U.S. Department of Education student data guidance: https://studentprivacy.ed.gov/sites/default/files/resource_document/file/Policies%20for%20Users%20of%20Student%20Data%20Checklist.pdf
