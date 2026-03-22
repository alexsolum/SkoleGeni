# Phase 6: Restore Phase 2 Verification Coverage - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning
**Source:** Milestone audit gap closure

<domain>
## Phase Boundary

This phase does not introduce new user-facing workflow behavior. It closes a milestone evidence gap by reconstructing the missing verification artifact for Phase 2 so the shipped setup, configuration, import, autosave, reload, retry, and trust-signaling behavior can be audited as complete.

The phase owns documentation, verification evidence, and any narrowly-scoped automated coverage needed to make that evidence defensible. It should avoid reopening broad product or design work unless the missing verification cannot be completed without one specific, proven fix.

</domain>

<decisions>
## Implementation Decisions

### Locked Decisions
- Treat the v1.0 audit result as authoritative: the blocker is the missing `.planning/phases/02-reliable-project-workflow/02-VERIFICATION.md` artifact.
- Phase 6 is a gap-closure phase for `FLOW-01`, `FLOW-02`, `FLOW-03`, and `FLOW-04`; every plan must explicitly address those four requirements.
- Reuse existing Phase 2 artifacts first: `02-CONTEXT.md`, `02-RESEARCH.md`, `02-01/02/03-SUMMARY.md`, `02-UAT.md`, `02-VALIDATION.md`, and the existing test files/specs.
- Keep the scope evidence-first. Do not redesign Pupil Data or Configuration just because the old UAT noted the UI was basic.
- The only Phase 2 UAT issue on record is the chemistry-picker interaction ambiguity. The current checkout reportedly opens the modal and updates counts, so any follow-up must start by verifying the current implementation and only add the minimum missing proof or automation.
- Phase 6 should leave the codebase in a state where rerunning `$gsd-audit-milestone` can mark the Phase 2 workflow as verified instead of partial.

### Claude's Discretion
- Whether one plan is enough or the work should be split into a second plan for additional automated coverage if the verification evidence cannot be made robust in a single plan.
- Whether a small targeted test is needed for the chemistry picker to convert the inconclusive UAT note into executable evidence.
- Whether to update stale planning-state files beyond the minimum needed for the milestone audit to pass.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Audit and current milestone state
- `.planning/v1.0-MILESTONE-AUDIT.md` — Source of the blocker and the exact requirements/flow gap being closed
- `.planning/ROADMAP.md` — Phase 6 scope, requirements, and success criteria
- `.planning/REQUIREMENTS.md` — `FLOW-01` through `FLOW-04` are reopened and assigned to Phase 6
- `.planning/STATE.md` — Current milestone progress and project decisions

### Original Phase 2 source material
- `.planning/phases/02-reliable-project-workflow/02-CONTEXT.md` — Original Phase 2 boundary and decisions
- `.planning/phases/02-reliable-project-workflow/02-RESEARCH.md` — Original technical research for the workflow phase
- `.planning/phases/02-reliable-project-workflow/02-01-SUMMARY.md` — Configuration restore/save harness evidence
- `.planning/phases/02-reliable-project-workflow/02-02-SUMMARY.md` — CSV import, issues, autosave, and draft behavior evidence
- `.planning/phases/02-reliable-project-workflow/02-03-SUMMARY.md` — Reload/retry/browser smoke evidence and human approval record
- `.planning/phases/02-reliable-project-workflow/02-UAT.md` — Live verification record including the chemistry-picker ambiguity
- `.planning/phases/02-reliable-project-workflow/02-VALIDATION.md` — Existing validation contract, currently partial

### Relevant implementation and tests
- `src/pages/Configuration.tsx` — Saved configuration restore and retry behavior
- `src/pages/PupilData.tsx` — CSV import, issues panel, autosave, chemistry picker, workflow trust signals, and optimizer gating
- `src/lib/projectWorkflow.ts` — Shared workflow save-state contract
- `src/lib/pupilWorkflow.ts` — Import, validation, autosave, and draft logic
- `src/components/project/WorkflowStatusHeader.tsx` — Trust-signaling UI
- `src/components/pupil/CsvMappingModal.tsx` — CSV header resolution flow
- `src/components/pupil/IssuesPanel.tsx` — Blocking/non-blocking issue rendering
- `src/pages/__tests__/configuration-load.test.tsx`
- `src/pages/__tests__/configuration-save.test.tsx`
- `src/pages/__tests__/pupil-import-validation.test.tsx`
- `src/pages/__tests__/pupil-autosave.test.tsx`
- `src/pages/__tests__/workflow-reload.test.tsx`
- `tests/phase2-workflow.spec.ts`
- `tests/helpers/phase2SupabaseRoutes.ts`
- `tests/fixtures/phase2WorkflowData.ts`

</canonical_refs>

<specifics>
## Specific Ideas

- The fastest closure path is likely one verification-focused plan that:
  - audits the existing test and UAT evidence,
  - adds any one missing automated proof for the chemistry picker if needed,
  - writes `02-VERIFICATION.md`,
  - then reruns milestone audit.
- If Phase 2 evidence is already strong enough, the implementation delta may be limited to documentation plus one narrow regression test.
- The verification report should mirror the stronger structure used in `03-VERIFICATION.md`, `04-VERIFICATION.md`, and `05-VERIFICATION.md` so the milestone audit can reason about it cleanly.

</specifics>

<deferred>
## Deferred Ideas

- Fixing the deferred Phase 4 undo double-press issue
- Broad UI redesign work beyond what is required to verify Phase 2 behavior
- Full Nyquist cleanup across all earlier phases unless Phase 6 specifically needs one targeted validation update

</deferred>

---

*Phase: 06-restore-phase-2-verification-coverage*
*Context gathered: 2026-03-21 via milestone audit gap closure*
