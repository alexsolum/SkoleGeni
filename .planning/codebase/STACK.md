# Technology Stack

**Analysis Date:** 2026-03-19

## Languages

**Primary:**
- TypeScript - Frontend application code in `src/App.tsx`, `src/pages/*.tsx`, `src/lib/*.ts`
- Python - Optimizer API in `api/optimizer.py`
- SQL - Schema and local database bootstrap in `supabase/migrations/0001_init.sql` and `docker/db/init/*.sql`

**Secondary:**
- CSS - Global styling in `src/index.css`
- YAML/JSON - Deployment and local infra config in `docker-compose.yml`, `docker/kong.yml`, and `vercel.json`

## Runtime

**Environment:**
- Node.js 22 in local container flow via `docker/web.Dockerfile`
- Python 3.12 in local optimizer container via `docker/optimizer.Dockerfile`
- PostgreSQL 16 in local Docker setup via `docker-compose.yml`

**Package Manager:**
- npm - Manifest in `package.json`
- Lockfile: present in `package-lock.json`
- pip - Python dependencies listed in `requirements.txt`

## Frameworks

**Core:**
- React - UI rendering and route-level screens in `src/main.tsx` and `src/App.tsx`
- React Router - Page navigation in `src/App.tsx`
- FastAPI - HTTP API surface in `api/optimizer.py`
- Supabase JS - Database client in `src/lib/supabase.ts`

**Testing:**
- Not detected - No project-owned test runner config or test files outside `node_modules`

**Build/Dev:**
- Vite - Frontend dev server and bundler in `vite.config.ts`
- TypeScript compiler - Build typecheck step in `package.json`
- Tailwind CSS - Utility styling via `tailwind.config.js` and `postcss.config.js`
- Docker Compose - Local multi-service environment in `docker-compose.yml`
- Vercel Functions - Python function deployment target in `vercel.json`

## Key Dependencies

**Critical:**
- `react`, `react-dom` - Application shell and rendering from `package.json`
- `react-router-dom` - URL-based workflow routing in `src/App.tsx`
- `@supabase/supabase-js` - All persistence calls from `src/lib/supabase.ts` and page components
- `ortools` - CP-SAT solver implementation in `api/optimizer.py`
- `fastapi`, `uvicorn` - Optimizer request handling and local serving in `api/optimizer.py` and `docker/optimizer.Dockerfile`

**Infrastructure:**
- `papaparse` - CSV import in `src/pages/PupilData.tsx`
- `react-hot-toast` - User feedback in `src/App.tsx` and page components
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` - Drag-and-drop editor support in `src/pages/ClassEditor.tsx`
- `clsx`, `tailwind-merge` - UI class composition, though only `clsx` is used in `src/components/ui/Button.tsx`

## Configuration

**Environment:**
- Frontend expects `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and optional `VITE_OPTIMIZER_URL` as shown in `.env.example`
- `src/lib/supabase.ts` logs a warning when Supabase env vars are missing but still creates a client with empty strings
- Local Docker flow injects development-specific environment values directly in `docker-compose.yml`

**Build:**
- `vite.config.ts` sets the dev server port
- `tsconfig.json` enables strict TypeScript mode for `src`
- `tailwind.config.js` defines theme tokens and font families
- `postcss.config.js` wires Tailwind and Autoprefixer
- `vercel.json` configures Python function packaging exclusions

## Platform Requirements

**Development:**
- Node/npm for frontend work
- Python 3.12-compatible environment for `api/optimizer.py`
- Docker Desktop for the documented local full-stack setup in `README.md`

**Production:**
- Static frontend bundle from Vite
- Vercel-hosted Python function under `api/optimizer.py`
- Supabase-backed Postgres using schema from `supabase/migrations/0001_init.sql`

---

*Stack analysis: 2026-03-19*
