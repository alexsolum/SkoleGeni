# Deferred Items

## 2026-03-20

- `npx vitest run` currently picks up `tests/phase2-workflow.spec.ts`, which is a Playwright suite and fails under Vitest with `Playwright Test did not expect test() to be called here`. This is a pre-existing test configuration issue outside Plan `03-02` and should be handled in a later quality/tooling pass.
