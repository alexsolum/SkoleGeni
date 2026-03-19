# Research: Stack

## Scope

This is brownfield stack guidance for taking the existing SkoleGeni MVP to a more dependable v1. The goal is to preserve the current product shape while removing weak points in persistence, testing, deployment safety, and developer workflow.

## Recommended Direction

- **Frontend framework**: Keep React and align with current React 19.x guidance. Confidence: high.
- **Build tooling**: Keep Vite as the SPA toolchain rather than introducing a heavier framework. Confidence: high.
- **Styling**: Keep Tailwind, but finish the migration to modern Tailwind v4 patterns instead of maintaining partial legacy setup. Confidence: high.
- **Database/backend platform**: Keep Postgres and Supabase-style tooling, but move away from anonymous broad-table writes in production paths. Confidence: high.
- **Optimizer service**: Keep FastAPI + OR-Tools CP-SAT. Confidence: high.

## Why Keep the Existing Core Stack

- The existing stack already matches the product well: admin-heavy desktop UI, structured data, and a computational backend.
- The MVP’s biggest problems are not framework mismatch. They are trust, safety, persistence semantics, and missing verification.
- A rewrite would delay the value of polishing without solving the real risks first.

## Frontend Recommendations

- Keep `react` and `react-dom`, but pin versions instead of using `"*"` in `package.json`.
- Keep Vite for the web client and pin the current stable major used by the team after validation in this repo.
- Add **Vitest** for unit/integration testing because it is Vite-native and reuses Vite transforms.
- Add **React Testing Library** for component and workflow tests.
- Add **Playwright** for end-to-end validation of the core flow: create project -> configure -> import pupils -> optimize -> review results.
- Add ESLint if the team wants static guardrails beyond TypeScript, but prioritize tests first.

## Styling Recommendations

- Keep Tailwind as the styling layer.
- Normalize the project on one Tailwind generation path and remove ambiguity between older `@tailwind` directives and newer package expectations.
- Move design tokens into a clearer source of truth and explicitly reconcile `DESIGN.md`, `PRD.md`, and the code.
- Avoid introducing a large third-party component library; the UI is product-specific and already intentionally custom.

## Backend Recommendations

- Keep **FastAPI** for the optimizer boundary because the service is simple and typed.
- Keep **Pydantic** request/response models to preserve a clear contract.
- Keep **OR-Tools CP-SAT** because the problem shape is largely discrete and constraint-driven, which fits CP-SAT well.
- Extract solver logic from `api/optimizer.py` into smaller testable modules before adding more optimization complexity.

## Data and Auth Recommendations

- Keep Postgres as the source of truth.
- Use real Supabase production patterns rather than the current MVP shortcut of broad anon CRUD access.
- Introduce **Row Level Security** and move privileged write paths behind trusted server-side boundaries where needed.
- Keep direct browser reads only where policy-safe and low risk.

## Operational Recommendations

- Pin Node and Python versions in docs and CI.
- Add a smoke-test path for the Docker stack because the repo already depends on multi-service local orchestration.
- Add migration discipline around `supabase/migrations/` and stop relying on drift between canonical migration files and local init SQL.

## What Not to Do

- Do not replace the app with Next.js just for convention; this product currently behaves like a focused internal-style SPA.
- Do not keep wildcard dependency versions in `package.json`; they increase drift risk.
- Do not ship the current anonymous write model to production usage.
- Do not merge persistence, transport, and solver concerns further inside one Python file.

## Source Basis

This guidance is based on the current repository plus current official docs/guidance from React, Vite, Tailwind CSS, Supabase, FastAPI, OR-Tools, Vitest, and Playwright as checked during initialization on 2026-03-19.
