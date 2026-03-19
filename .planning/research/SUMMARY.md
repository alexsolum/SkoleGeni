# Research Summary: SkoleGeni

**Domain:** Desktop-first school roster optimization web app
**Researched:** 2026-03-19
**Overall confidence:** MEDIUM

## Executive Summary

SkoleGeni does not need a greenfield reset. The research supports keeping the current product shape: a React-based admin client, relational data storage, and a dedicated optimization service. The main v1 opportunity is to turn the existing MVP into a workflow that administrators can trust with real roster work.

The most important product features are not flashy additions. They are trustworthy saves, clear validation, understandable optimization results, and persistence of manual refinement. These are table stakes for a tool that asks staff to rely on automated class assignments while remaining accountable for the final roster.

The current repo already covers the core path from project setup to manual class editing. That means the roadmap should focus first on fragile boundaries: open write permissions, destructive save patterns, weak result explainability, and lack of automated verification. Once those are stable, UI polish and higher-value differentiators become much safer to add.

## Key Findings

**Stack:** Keep the existing React + Python + Postgres/Supabase shape, but add validation, query-state discipline, and automated testing.
**Architecture:** Introduce safer data boundaries and treat optimization runs plus manual edits as persistent artifacts.
**Critical pitfall:** Opaque scores and fragile save semantics will undermine trust faster than any missing visual polish.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Data Integrity and Safety** - tighten persistence, validation, and access rules
   - Addresses: trustworthy saves, safer write model, recoverable project state
   - Avoids: fragile save semantics, weak admin-grade controls

2. **Input Workflow Hardening** - improve import, field validation, and chemistry editing clarity
   - Addresses: bulk import, manual editing, conflict feedback
   - Avoids: import friction and silent data quality issues

3. **Results and Editor Trust** - make outputs readable, explainable, and persistent
   - Addresses: optimization review, manual refinement, run history
   - Avoids: opaque scores and non-persistent edits

4. **UI System Polish** - align screens with the intended SkoleGeni design language
   - Addresses: visual coherence, shared patterns, admin-grade readability
   - Avoids: inconsistent screen-level polish work

5. **Quality Gates and Release Readiness** - add tests and verification around the core flow
   - Addresses: regression safety, deployment confidence
   - Avoids: breaking critical flows while polishing the app

**Phase ordering rationale:**
- Data trust comes before UI trust.
- Input correctness comes before interpreting optimization output.
- Results and editor improvements are more meaningful once saved data is dependable.
- Visual polish should consolidate stable workflows, not hide unstable ones.

**Research flags for phases:**
- Phase 1: Needs careful validation of auth/data access decisions.
- Phase 3: Needs alignment between optimizer scoring and editor scoring semantics.
- Phase 5: Standard patterns, low research risk.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Brownfield fit is clear; exact supporting library adoption is still a planning choice |
| Features | HIGH | The trust and workflow needs are strongly supported by the domain and current product shape |
| Architecture | MEDIUM | Direction is clear, but implementation depth depends on how much of the existing browser-write model is retained |
| Pitfalls | HIGH | The main failure modes are already visible in the repo and common in admin tooling |

## Gaps to Address

- Exact v1 posture for access control and whether write paths stay fully client-driven
- Whether manual class edits should overwrite the latest run or create a separate saved refinement artifact
- Whether scenario comparison is in scope for this milestone or deferred to later
