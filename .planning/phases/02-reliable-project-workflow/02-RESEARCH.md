# Phase 2: Reliable Project Workflow - Research

**Researched:** 2026-03-19
**Domain:** Resilient project setup, CSV mapping/import, debounced autosave patterns, and centralized validation UX
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Configuration State Restoration
- **DB Overrides**: Database values must always override local defaults on load.
- **No Skip**: Remove "Skip (MVP)" button; valid config is mandatory.
- **Session Cache**: Use local state priority during single-session navigation.
- **Failure Gating**: Block UI and show retry button if config load fails.

### CSV Resilience & Error Recovery
- **Partial Import**: Allow valid rows, list failed ones in summary.
- **Column Mapping**: Mapping modal for header resolution.
- **Forced Normalization**: Normalize gender strings ("M", "boy" -> "Male") during import.
- **Duplicate Detection**: Flag duplicates for manual resolution in grid.

### State Persistence Model
- **Autosave**: Debounced autosave (2-3s) for pupils/chemistry.
- **Silent Exit**: Allow navigation during active/successful autosave.
- **Status Header**: Clear "Saving..." / "Saved" status feedback.
- **Save Integrity**: Disable "Run Optimizer" if save fails/in-progress.

### Validation UX
- **Inline Highlighting**: Highlight invalid cells on blur.
- **Issues Panel**: Persistent panel listing errors/warnings.
- **Warning Levels**: Distinguish blocking Errors vs non-blocking Warnings.
- **Immediate Feedback**: Resolve highlights immediately on valid input.
</user_constraints>

## Summary

Phase 2 focuses on turning the "fragile" MVP entry flow into a professional, trustworthy experience. The research confirms that for "Reliable Project Workflow," we must move away from manual "Save" buttons for high-volume student data and toward a **debounced autosave** model powered by **TanStack Query (React Query)** and **Supabase RPC**. 

For CSV imports, the industry standard has shifted from simple parsing to **Wizard-style mapping components**. We will use `react-spreadsheet-import` to handle the requested column mapping and partial import requirements. 

To maintain performance during real-time validation of large tables, we will adopt a **"Validation Registry"** pattern using **Zustand**, which decouples validation metadata from the main table state, preventing "re-render storms" when errors are detected.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-query` | `5.0.0+` | Autosave orchestration and optimistic updates | The gold standard for async state management and resilient mutations. |
| `react-spreadsheet-import` | `2.0.0+` | CSV Mapping Wizard | More feature-rich than `react-csv-importer`; includes built-in mapping and pre-import validation steps. |
| `zustand` | `5.0.0+` | Validation Registry / Issues Panel state | High-performance, lightweight state management that avoids React Context re-render issues. |
| `lodash.debounce` | `4.0.8` | Autosave throttling | Lightweight and predictable for debouncing frequent updates. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | `3.23.0+` | Client-side validation schemas | Use for defining both individual row rules and global project requirements. |
| `lucide-react` | current | Status indicators and warning icons | Standard for clean, modern interface feedback. |
| `framer-motion` | current | Smooth UI transitions for the Issues Panel | Ensures the persistent panel doesn't feel jarring when appearing/disappearing. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-spreadsheet-import` | `react-csv-importer` | `react-spreadsheet-import` provides a better multi-step "Wizard" UX which aligns with "Reliable" goal. |
| Debounced `.upsert()` | `Supabase RPC` | RPC is better for multi-table transactions (Pupils + Chemistry) in a single call. |
| React Context | `Zustand` | Context causes full-page re-renders on validation updates; Zustand allows selective cell subscriptions. |

## Architecture Patterns

### Pattern 1: Debounced RPC Autosave
**What:** use TanStack Query `useMutation` with `onMutate` for optimistic UI, wrapping a debounced call to a Supabase RPC.
**When to use:** every time a user edits a pupil or chemistry link.
**Implementation:**
- `onMutate`: Snapshot current state, update cache immediately.
- `mutationFn`: Debounced 2s delay, then call `rpc('save_pupil_roster', ...)`.
- `onError`: Roll back to snapshot on failure.

### Pattern 2: The "Validation Registry" (Zustand)
**What:** Maintain a store of errors keyed by `rowId:columnId`.
**When to use:** display inline highlights and the centralized "Issues Panel."
**Pattern:**
```typescript
const useValidationStore = create((set) => ({
  errors: {}, // { "pupil-1:name": "Missing name" }
  warnings: {},
  setErrors: (newErrors) => set({ errors: newErrors }),
}));
```
This allows the "Issues Panel" to subscribe to the *entire* error object while individual cells only subscribe to *their* specific key.

### Pattern 3: Wizard-style CSV Mapping
**What:** Multi-step modal (Upload -> Select Header -> Map Columns -> Validate -> Finish).
**When to use:** whenever "Import CSV" is clicked.
**Goal:** prevent "junk data" from ever reaching the main table.

### Anti-Patterns to Avoid
- **Saving on every keystroke:** results in "429 Too Many Requests" and database thrashing.
- **Blocking the UI during save:** breaks the "App like Linear" aesthetic.
- **Storing errors in the row object:** makes the table data "dirty" and causes massive re-renders when one error changes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV Mapping UI | Custom dropdowns & mapping logic | `react-spreadsheet-import` | Handling all edge cases of column mapping is complex and error-prone. |
| Debounce/Retry Logic | `setTimeout` + `try/catch` | `TanStack Query` | Built-in support for retries, cache invalidation, and race-condition handling. |
| Table Virtualization | Manual `slice()` of rows | `TanStack Table` (if not already used) | Large rosters (500+) will lag without virtualization. |
| Drag-and-drop mapping | Native HTML5 DnD | `dnd-kit` (already in repo) | More accessible and robust for mapping interactions. |

## Common Pitfalls

### Pitfall 1: Race conditions in autosave
**What goes wrong:** User types fast, two saves trigger close together, and an older save finishes *after* a newer one, overwriting data.
**How to avoid:** TanStack Query `mutationFn` automatically handles serialization if configured correctly, or use a "saving lock" state.

### Pitfall 2: Re-render storms on validation
**What goes wrong:** A table with 200 rows re-renders every time any cell's validation state changes.
**How to avoid:** Use Zustand selectors or a localized "Validation Provider" that doesn't trigger parent updates.

### Pitfall 3: "Ghost" successful saves
**What goes wrong:** UI says "Saved" but a network flicker caused the database to reject it.
**How to avoid:** Always verify the RPC response and use the "Block Run on Fail" decision to prevent proceeding with unsaved data.

## Code Examples

### Debounced Mutation with TanStack Query
```typescript
const mutation = useMutation({
  mutationFn: (data) => supabase.rpc('save_pupil_roster', data),
  onMutate: async (newData) => {
    await queryClient.cancelQueries(['pupils']);
    const prev = queryClient.getQueryData(['pupils']);
    queryClient.setQueryData(['pupils'], (old) => merge(old, newData));
    return { prev };
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(['pupils'], context.prev);
    toast.error("Save failed. Reverting...");
  }
});

// Use lodash.debounce to wrap mutation.mutate
```

### Supabase RPC for Roster Transaction
```sql
create or replace function save_pupil_roster(
  p_project_id uuid,
  p_pupils jsonb,
  p_chemistry jsonb
)
returns void as $$
begin
  -- Delete existing
  delete from pupils where project_id = p_project_id;
  
  -- Insert new pupils
  insert into pupils (id, project_id, name, ...)
  select (value->>'id')::uuid, p_project_id, value->>'name', ...
  from jsonb_array_elements(p_pupils);
  
  -- Insert chemistry...
end;
$$ language plpgsql;
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `vitest` + `react-testing-library` |
| Primary focus | Autosave debounce timing and error rollback |
| E2E | `playwright` for "Import -> Map -> Save -> Reload" flow |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type |
|--------|----------|-----------|
| FLOW-01 | Project state restored from DB on reload | Integration (Vitest) |
| FLOW-02 | CSV Import with mapping resolves headers | E2E (Playwright) |
| FLOW-03 | Autosave triggers after 2s of inactivity | Integration (Vitest/msw) |
| FLOW-04 | Issues panel lists all blocking errors | Component (Testing Lib) |

## Sources

### Primary (HIGH confidence)
- TanStack Query Docs: https://tanstack.com/query/latest/docs/react/guides/optimistic-updates
- Supabase RPC Performance: https://supabase.com/docs/guides/database/functions
- react-spreadsheet-import: https://github.com/charkour/react-spreadsheet-import

### Secondary (MEDIUM confidence)
- Enterprise UX patterns for "Issues Panels" in SaaS (Linear, Retool).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH (Modern best practices for 2026).
- Architecture: HIGH (Well-known patterns for resilient apps).

**Research date:** 2026-03-19
**Valid until:** 2026-04-18
