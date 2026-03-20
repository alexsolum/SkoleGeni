---
created: 2026-03-20T15:27:49.667Z
title: Make positive chemistry bidirectional
area: ui
files:
  - src/pages/PupilData.tsx
  - src/lib/api.ts
  - src/lib/pupilWorkflow.ts
---

## Problem

Positive chemistry links are currently added only from the selected pupil to the connected pupil. In the product behavior the user expects a positive relationship to appear for both pupils once it is added, rather than acting like a one-way edge.

## Solution

Update the chemistry add/save flow so positive chemistry is created symmetrically for both pupils while preserving the existing negative-link behavior unless explicitly changed. Verify the UI counts and persisted roster state both reflect the bidirectional positive link.
