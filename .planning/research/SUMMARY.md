# Research Summary

## Context

SkoleGeni should be planned as a brownfield product-hardening effort, not a rewrite. The current stack and workflow are fundamentally sound for the problem; the main issues are safety, trust, persistence durability, and missing verification.

## Stack

- Keep React, Vite, Tailwind, Postgres/Supabase patterns, FastAPI, and OR-Tools.
- Pin versions and clean up wildcard dependencies.
- Add Vitest and React Testing Library for unit/integration coverage.
- Add Playwright for the end-to-end admin workflow.
- Reintroduce safer Supabase patterns instead of broad anonymous writes.

## Table Stakes

- Reliable project persistence
- Safer pupil and chemistry editing
- Readable optimization results
- Durable manual refinement
- Clear explanation of constraint outcomes

## Biggest Risks

- Anonymous broad database access
- Delete-and-reinsert save semantics
- Non-persistent class editor changes
- Weak explainability of optimizer output
- No automated tests around critical logic

## Roadmap Implication

Plan the work in this order:

1. Security and persistence hardening
2. Results and editor workflow completion
3. Design-system alignment and UX polish
4. Testing and release confidence improvements where not already folded into earlier phases

## Product Principle

For this product, “polish” means administrators can trust the workflow end to end. Visual refinement matters, but only after the data model, save semantics, and optimization outputs are dependable.
