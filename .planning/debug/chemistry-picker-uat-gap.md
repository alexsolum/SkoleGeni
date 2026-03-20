---
status: investigating
trigger: "Diagnose the root cause of this UAT gap only. Do not implement fixes."
created: 2026-03-20T00:00:00+01:00
updated: 2026-03-20T00:16:00+01:00
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: The current workspace may not contain a functional chemistry-picker bug at all; the UAT report may reflect a perception/discoverability issue or a mismatch with the exact build/environment that was tested.
test: Evaluate the browser reproduction result against the reported symptom and determine whether any code-level root cause remains supported by evidence.
expecting: If the picker opens, displays candidates, and updates counts in a realistic browser run, the investigation should conclude as inconclusive for a code defect in this checkout.
next_action: finalize diagnosis from collected evidence

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: Clicking "+" or "-" on a pupil row should open the chemistry picker modal, allow selecting another pupil, and update the row count from +0/-0 to reflect the new link.
actual: User reported: "Nothing happens when i press the +/- and see also that the UI is very basic"
errors: None reported
reproduction: Test 4 in UAT
started: Discovered during UAT

## Eliminated
<!-- APPEND only - prevents re-investigating -->

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-03-20T00:03:00+01:00
  checked: src/pages/PupilData.tsx
  found: The `+` and `-` buttons unconditionally call `setChemSearch("")` and `setChemModalFor({ pupilId, kind })`; there is no guard that would block opening while the page is otherwise interactive.
  implication: A missing click handler is unlikely to be the primary cause.

- timestamp: 2026-03-20T00:04:00+01:00
  checked: src/pages/__tests__/pupil-autosave.test.tsx, src/pages/__tests__/pupil-import-validation.test.tsx, src/pages/__tests__/workflow-reload.test.tsx
  found: Existing tests cover autosave, import mapping, reload, and validation, but none exercise the chemistry `+/-` buttons or the picker modal.
  implication: This path could regress without test coverage, so diagnosis must rely on code/runtime evidence rather than an existing regression test.

- timestamp: 2026-03-20T00:08:00+01:00
  checked: npm run build, dist/assets/index-*.css, src/index.css, tailwind.config.js, postcss.config.js
  found: The production build succeeds and emits Tailwind utility classes used by the pupil page and modal (`fixed`, `inset-0`, `bg-black/40`, `max-w-[520px]`, `font-heading`, `text-primary`, `bg-surface`).
  implication: The "very basic" complaint is not caused by a total Tailwind/PostCSS failure, so the chemistry issue is more likely in the modal presentation path itself.

- timestamp: 2026-03-20T00:15:00+01:00
  checked: browser-driven reproduction against the current app via `.planning/debug/chemistry-repro.mjs`
  found: With two pupils loaded, clicking the positive chemistry button opens the `Chemistry (+) Picker`, shows another pupil as a selectable candidate, and updates the source row count to `+1 / -0` after selection.
  implication: The exact UAT-reported functional failure ("Nothing happens when i press the +/-") is not reproducible from the current workspace, so there is no confirmed code-level break in the present implementation.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: No reproducible code defect was found in the current checkout for the chemistry picker flow. The UAT gap is more consistent with a perception/discoverability issue in a visually minimal UI, or with the user testing a different build/environment than this workspace.
fix:
verification: Browser-driven reproduction confirmed the current implementation opens the picker and updates counts.
files_changed: []
