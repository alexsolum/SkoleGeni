# Phase 4: Durable Class Editing - Research

**Researched:** 2026-03-20
**Domain:** Persistent Drag-and-Drop, Undo/Redo Patterns, and Scoring Parity
**Confidence:** HIGH

## Summary
Phase 4 focuses on transforming the ephemeral class editor into a durable, production-grade tool. The core architectural shift is moving from purely local state to a **Persistent Shadow Model** where manual edits are the primary source of truth, backed by a robust Undo/Redo stack and server-side verification.

**Primary recommendation:** Use `zundo` for persistent Undo/Redo history and implement a dedicated `roster_assignments` persistence model that treats manual moves as first-class citizens.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Autosave Every Move**: All manual moves are autosaved using a debounced pattern (2-3s).
- **Session Drafts**: Use session/local storage to prevent data loss on refresh.
- **Manual Priority**: Restore manual edits by default; provide "Reset to Optimizer" button.
- **Clear on Pupil Change**: Clear manual edits if underlying pupil data is modified.
- **Warn Only (Safe)**: Do not hard-block any move; visually mark violations (Red Card State).
- **Warn on Score Drop**: Show warnings for significant score drops.
- **Exhaustive Validation**: Re-validate all rules on every drop.
- **JS Feedback, JS Commit**: JS provides instant feedback and is the "committed" score source.
- **Python Verification**: Silent background verification of scores via Python.
- **Same Detailed Meters**: Mirror the Results page's scoring dashboard.
- **Manual Issues Sidebar**: Persistent panel listing all manual violations.
- **Hover for Reason**: Tooltips on red cards explaining the violation.
- **Undo/Redo Support**: Specifically for drag-and-drop moves.

### Claude's Discretion
- Exact implementation of the history stack and persistence table structure.
- Threshold for "significant score drop" warnings.

### Deferred Ideas (OUT OF SCOPE)
- Branching scenarios (v2).
- AI move explanations.
- Real-time collaboration.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EDIT-01 | Persistent manual moves | Dedicated `roster_assignments` table and `zundo` persistent history. |
| EDIT-02 | Violation warnings and rules | Exhaustive JS validation engine matching Python's CP-SAT rules. |
| EDIT-03 | Refinement continuity | Session-synced "Draft" state and automatic manual-priority loading. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zundo` | 2.1.0+ | Undo/Redo middleware | Optimized for Zustand; provides automated history management without hand-rolling stacks. |
| `zustand` | 5.0.0+ | State management | High-performance state that supports middleware like `temporal` (zundo) and `persist`. |
| `dnd-kit` | Current | Drag-and-Drop | Already in the repo; best-in-class for React accessibility and performance. |

**Installation:**
```bash
npm install zundo zustand
```

## Architecture Patterns

### Pattern 1: The "Temporal" Store (Undo/Redo)
**What:** Wrapping the Class Editor state in `temporal` middleware to track `string[][]` assignments.
**When to use:** Only trigger state updates in `onDragEnd` to avoid polluting history with mid-drag snapshots.
**Example:**
```typescript
const useEditorStore = create()(
  temporal((set) => ({
    assignment: [],
    movePupil: (pid, targetIdx) => set(...)
  }), { 
    partialize: (state) => ({ assignment: state.assignment }),
    limit: 50
  })
);
```

### Pattern 2: Shadow Scoring Parity
**What:** Implementing a TS-transpiled version of the Python scoring logic.
**How:** Use integer-only math (multiply scores/weights by 100) in both JS and Python to prevent floating-point drift.
**Goal:** Ensure the "Instant" JS score and "Official" Python score stay within a 1% tolerance.

### Pattern 3: Soft-Blocking (Red Card State)
**What:** Allowing "invalid" drops but marking them with data-attributes or state flags.
**Visuals:** Use a "Conflict Context" that maps `pupilId -> violationReason[]`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Undo History | Custom array stack | `zundo` | Handles branching, limits, and temporal state snapshots reliably. |
| Persistence Sync | Manual `localStorage` | `zustand/middleware/persist` | Built-in hydration and storage adapters. |
| Validation Engine | Ad-hoc `if` statements | Centralized `ValidationService` | Needs to mirror Python rules exactly for "trust." |

## Common Pitfalls

### Pitfall 1: History Bloat
**What goes wrong:** Every pixel of a drag creates an undo step.
**How to avoid:** Ensure Zustand `set` calls only happen in `onDragEnd`.

### Pitfall 2: Hydration Mismatch
**What goes wrong:** Client-side "Draft" state conflicts with Database "Saved" state on load.
**How to avoid:** Database state always wins on initial load unless the "Draft" timestamp is strictly newer.

### Pitfall 3: Scoring Drift
**What goes wrong:** JS says 95%, Python says 92%. User loses trust.
**How to avoid:** Use the "JS Commit" decision: the score the user sees while editing is the one stored. Use Python only for "Official Verification" warnings.

## Code Examples

### Persistent temporal store with zundo
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';

export const useRosterStore = create()(
  persist(
    temporal(
      (set) => ({
        assignment: [[]], // string[][]
        setAssignment: (next) => set({ assignment: next }),
      }),
      { partialize: (state) => ({ assignment: state.assignment }) }
    ),
    { name: 'roster-draft-storage' }
  )
);
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + Playwright |
| Quick run command | `npm test src/pages/ClassEditor.test.tsx` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| EDIT-01 | Moves persist after browser refresh | E2E | `npx playwright test tests/e2e/durable-editing.spec.ts` |
| EDIT-02 | Card turns red on negative chemistry drop | Component | `vitest src/components/PupilCard.test.tsx` |
| EDIT-03 | "Reset to Optimizer" clears manual state | Integration | `vitest src/pages/ClassEditor.test.tsx` |

---
*Phase: 04-durable-class-editing*
*Research date: 2026-03-20*
