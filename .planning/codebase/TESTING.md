# Testing Patterns

**Analysis Date:** 2026-03-19

## Test Framework

**Runner:**
- Not detected
- Config: Not detected

**Assertion Library:**
- Not detected

**Run Commands:**
```bash
npm run build         # Only repository-owned verification command currently defined
python -m uvicorn api.optimizer:app --port 8000   # Manual backend smoke run from README.md
docker compose up --build   # Manual end-to-end environment check from README.md
```

## Test File Organization

**Location:**
- No project-owned `*.test.*` or `*.spec.*` files are present outside dependencies

**Naming:**
- Not applicable

**Structure:**
```text
No test tree detected in project source.
```

## Test Structure

**Suite Organization:**
```typescript
// No in-repo test suites detected.
```

**Patterns:**
- Verification currently relies on manual UI flows across `src/pages/*.tsx`
- Backend verification appears to rely on manual POST requests against `api/optimizer.py`
- Schema verification appears to rely on applying `supabase/migrations/0001_init.sql` or the mirrored Docker init scripts

## Mocking

**Framework:** Not detected

**Patterns:**
```typescript
// No mocking setup present in the repository.
```

**What to Mock:**
- Future frontend unit tests would need to mock `@supabase/supabase-js` calls from `src/lib/supabase.ts`
- Future page tests would need to mock optimizer responses from `src/lib/api.ts`

**What NOT to Mock:**
- The actual SQL schema in `supabase/migrations/0001_init.sql` when validating migration behavior
- The OR-Tools solver path in `api/optimizer.py` when validating optimization correctness

## Fixtures and Factories

**Test Data:**
```typescript
// No fixture or factory helpers detected.
```

**Location:**
- Not applicable

## Coverage

**Requirements:** None enforced

**View Coverage:**
```bash
Not available; no coverage tooling is configured.
```

## Test Types

**Unit Tests:**
- Not used

**Integration Tests:**
- Not used

**E2E Tests:**
- Not used

## Common Patterns

**Async Testing:**
```typescript
// Not applicable yet. Async behavior currently lives in page effects and fetch/Supabase calls.
```

**Error Testing:**
```typescript
// Not applicable yet. Error paths are surfaced by toast branches in `src/pages/*.tsx`.
```

---

*Testing analysis: 2026-03-19*
