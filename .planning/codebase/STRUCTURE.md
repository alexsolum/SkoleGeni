# Codebase Structure

**Analysis Date:** 2026-03-19

## Directory Layout

```text
skolegeni/
├── src/                  # React frontend source
├── api/                  # Python optimizer API for Vercel/local use
├── supabase/             # Database migrations
├── docker/               # Local infrastructure and container definitions
├── dist/                 # Built frontend output
├── DESIGN.md             # Product-facing design notes
├── PRD.md                # Product requirements
├── README.md             # Setup and deployment guide
└── docker-compose.yml    # Local full-stack runtime
```

## Directory Purposes

**`src/`:**
- Purpose: Owns the browser application
- Contains: route pages, UI primitives, API helpers, styling
- Key files: `src/main.tsx`, `src/App.tsx`, `src/pages/PupilData.tsx`, `src/pages/ClassEditor.tsx`

**`api/`:**
- Purpose: Houses the backend optimization service
- Contains: a single FastAPI module and a generated `__pycache__`
- Key files: `api/optimizer.py`

**`supabase/`:**
- Purpose: Tracks the canonical schema for hosted database environments
- Contains: SQL migration files
- Key files: `supabase/migrations/0001_init.sql`

**`docker/`:**
- Purpose: Recreates the backend stack locally
- Contains: Dockerfiles, Kong config, Postgres init SQL
- Key files: `docker/web.Dockerfile`, `docker/optimizer.Dockerfile`, `docker/kong.yml`, `docker/db/init/0001_schema.sql`

**`dist/`:**
- Purpose: Stores the current built frontend assets
- Contains: generated HTML, JS, and CSS bundles
- Key files: `dist/index.html`, `dist/assets/*`

## Key File Locations

**Entry Points:**
- `src/main.tsx`: frontend bootstrap
- `src/App.tsx`: route graph and global toaster
- `api/optimizer.py`: backend HTTP entry point

**Configuration:**
- `package.json`: npm scripts and dependencies
- `tsconfig.json`: TypeScript compiler settings
- `vite.config.ts`: Vite dev server config
- `tailwind.config.js`: design tokens and font config
- `docker-compose.yml`: local services and env wiring
- `vercel.json`: Vercel function packaging

**Core Logic:**
- `src/pages/Welcome.tsx`: project listing/creation
- `src/pages/Configuration.tsx`: constraint editing
- `src/pages/PupilData.tsx`: pupil editing, CSV import, persistence, optimization launch
- `src/pages/Results.tsx`: latest result visualization
- `src/pages/ClassEditor.tsx`: drag-and-drop assignment editing
- `src/lib/api.ts`: optimizer contract and fetch wrapper
- `src/lib/supabase.ts`: Supabase client factory

**Testing:**
- No project-owned test directory or config is present

## Naming Conventions

**Files:**
- React pages and components use PascalCase file names such as `src/pages/Results.tsx` and `src/components/ui/Button.tsx`
- Utility modules use lowercase names such as `src/lib/api.ts` and `src/lib/supabase.ts`
- SQL migrations use numeric prefixes such as `supabase/migrations/0001_init.sql`

**Directories:**
- Feature groups are shallow and descriptive: `pages`, `components`, `lib`
- Infra directories mirror service responsibility: `docker/db/init`

## Where to Add New Code

**New Feature:**
- Primary UI code: add a route screen under `src/pages/` and wire it in `src/App.tsx`
- Shared helpers or clients: add under `src/lib/`
- Shared UI primitives: add under `src/components/`
- Database schema changes: add a new file under `supabase/migrations/`

**New Component/Module:**
- Reusable React component: `src/components/`
- Route-scoped helper: colocate near the owning page in `src/pages/` until a reusable pattern emerges

**Utilities:**
- Shared frontend utilities and typed service wrappers belong in `src/lib/`
- Backend-only optimizer helpers can be extracted from `api/optimizer.py` into additional modules under `api/`

## Special Directories

**`dist/`:**
- Purpose: frontend build output
- Generated: Yes
- Committed: Yes, currently present in the repo

**`api/__pycache__/`:**
- Purpose: Python bytecode cache
- Generated: Yes
- Committed: Yes, currently present in the repo

**`.planning/codebase/`:**
- Purpose: generated reference docs for GSD workflows
- Generated: Yes
- Committed: intended by the workflow, though this repo currently has no `.git` directory

---

*Structure analysis: 2026-03-19*
