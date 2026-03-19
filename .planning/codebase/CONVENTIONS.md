# Coding Conventions

**Analysis Date:** 2026-03-19

## Naming Patterns

**Files:**
- Use PascalCase for route screens and UI components in `src/pages/*.tsx` and `src/components/ui/Button.tsx`
- Use lowercase module names for service and bootstrap files such as `src/lib/api.ts`, `src/lib/supabase.ts`, and `src/main.tsx`

**Functions:**
- Use camelCase for local functions like `createNewRoster`, `saveAndNext`, `runOptimizer`, and `computeQuickScore`
- Use small helper functions inside the same file until reuse forces extraction, as seen in `src/pages/Configuration.tsx` and `src/pages/ClassEditor.tsx`

**Variables:**
- Use camelCase for state and local values such as `optimizerLoading`, `recentProjects`, and `negativeSet`
- Use UPPER_SNAKE_CASE for constants like `DEFAULT_CONSTRAINTS` in `src/pages/PupilData.tsx` and `src/pages/ClassEditor.tsx`

**Types:**
- Use PascalCase for TypeScript types and Python Pydantic models such as `OptimizeRequest`, `OptimizationRunRow`, and `OptimizeResponse`

## Code Style

**Formatting:**
- TypeScript code uses semicolons, double quotes, and trailing commas are generally absent
- JSX favors inline utility classes rather than extracted style objects
- No dedicated formatter config is present; the style is inferred from existing files in `src/`

**Linting:**
- No ESLint or Biome config file is present in the repo root
- There is an inline lint suppression in `src/lib/supabase.ts`, which implies linting may be expected externally even though config is missing

## Import Organization

**Order:**
1. External packages
2. Router or React-adjacent packages
3. Local modules and types

**Path Aliases:**
- Not used; imports are relative paths such as `../lib/supabase` and `./pages/Welcome`

## Error Handling

**Patterns:**
- For Supabase calls, inspect `{ error }` and show a generic toast if present
- For async workflow actions, use `try/catch/finally` only around longer flows, as in `src/pages/PupilData.tsx`
- The optimizer client throws a regular `Error` with status text in `src/lib/api.ts`

## Logging

**Framework:** browser console and toast notifications

**Patterns:**
- Prefer user-facing toasts for operational failures
- Use `console.warn` only for missing configuration, as in `src/lib/supabase.ts`

## Comments

**When to Comment:**
- Add short comments when the logic is not obvious, for example the delete-and-reinsert MVP persistence path in `src/pages/PupilData.tsx`
- Keep most JSX and helper logic uncommented when the naming is clear

**JSDoc/TSDoc:**
- Not used in the frontend codebase

## Function Design

**Size:** 
- Page files tolerate large in-file functions and helpers; `src/pages/PupilData.tsx` and `src/pages/ClassEditor.tsx` are the current examples

**Parameters:**
- Prefer typed object parameters when a helper needs multiple related values, as in `computeQuickScore` and `scoreDistribution` in `src/pages/ClassEditor.tsx`

**Return Values:**
- Use plain objects for computed validation or score data
- Async functions either return domain objects (`optimizeClasses`) or throw on failure

## Module Design

**Exports:** 
- One default export per page module
- Named exports for shared helpers/components such as `Button` in `src/components/ui/Button.tsx`

**Barrel Files:** 
- Not used

---

*Convention analysis: 2026-03-19*
