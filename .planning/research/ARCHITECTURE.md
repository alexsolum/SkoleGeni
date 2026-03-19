# Research: Architecture

## Target Shape

The product should remain a split system:

- A desktop-first React client for admin workflows
- A persistence boundary around Postgres/Supabase
- A separate optimization service for heavy constraint solving

That basic decomposition is sound. The main architectural improvement is to reduce unsafe direct writes and make optimization runs and manual edits first-class persisted objects.

## Recommended Component Boundaries

### Client App

- Project selection and workflow routing
- Constraint editing
- Pupil import and editing
- Results review
- Class editor interactions
- Read-only explainability views

### Application Persistence Layer

- Safe mutation endpoints or trusted server-side actions for destructive or multi-step writes
- Validation of roster state before optimizer execution
- Transactional handling for pupil, chemistry, and assignment updates
- Storage of manual edit state and optimization-run metadata

### Optimizer Service

- Accept validated, normalized input
- Produce assignments, scores, and debug/explainability payloads
- Return structured failure reasons for infeasible or conflicting input

### Database

- Core relational entities for project, pupils, constraints, chemistry, and saved assignments
- Optimization run history
- Potential future tables for saved manual assignment revisions

## Data Flow

1. User creates or opens a project.
2. Client loads project state from persistence.
3. User updates constraints or pupil data through validated save paths.
4. Client requests an optimization run using normalized project state.
5. Optimizer returns assignments plus score/explanation metadata.
6. Persistence stores the run as a traceable artifact.
7. Results view renders the latest saved run.
8. Class editor loads persisted assignments and writes manual adjustments back as explicit saved state.

## Brownfield Migration Priorities

### First

- Move high-risk writes out of ad hoc client delete-and-reinsert patterns.
- Introduce assignment persistence for class editor changes.
- Improve results data so names and explanations are available in the UI.

### Second

- Separate solver logic from API transport in Python.
- Extract shared scoring/explainability logic into testable modules.
- Normalize migration flow between `supabase/migrations/` and local init SQL.

### Third

- Add richer run comparison, audit, and export capabilities if the product needs them.

## Build Order Implications

- Stabilize persistence and result shape before heavy UI polish.
- Add automated tests before expanding optimizer complexity.
- Improve explainability after the stored data model can support it.

## Architectural Risks to Avoid

- Keeping the browser as the only mutation layer for complex writes.
- Treating optimization output as disposable UI state rather than a persisted decision artifact.
- Letting manual edits diverge permanently from the persisted model.
