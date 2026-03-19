# External Integrations

**Analysis Date:** 2026-03-19

## APIs & External Services

**Database API:**
- Supabase/PostgREST - CRUD access for projects, constraints, pupils, chemistry links, and optimization runs
  - SDK/Client: `@supabase/supabase-js`
  - Implementation: `src/lib/supabase.ts`, consumed from `src/pages/Welcome.tsx`, `src/pages/Configuration.tsx`, `src/pages/PupilData.tsx`, `src/pages/Results.tsx`, and `src/pages/ClassEditor.tsx`
  - Auth: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**Optimization API:**
- FastAPI optimizer endpoint - Generates class assignments from payloads posted by `src/lib/api.ts`
  - SDK/Client: browser `fetch` in `src/lib/api.ts`
  - Auth: none detected
  - Deployment path: `/api/optimizer` on Vercel or `http://localhost:8000/` in local development

**UI Delivery:**
- Google Fonts stylesheet - Loaded from `src/index.css`
  - Auth: none

## Data Storage

**Databases:**
- Supabase Postgres schema defined in `supabase/migrations/0001_init.sql`
  - Connection: frontend uses `VITE_SUPABASE_URL`
  - Client: `@supabase/supabase-js`
- Local Docker Postgres emulation in `docker-compose.yml`
  - Connection is proxied through Kong and PostgREST, not direct SQL from the frontend

**File Storage:**
- Local browser file upload only for CSV import in `src/pages/PupilData.tsx`
- No managed object storage integration detected

**Caching:**
- None detected

## Authentication & Identity

**Auth Provider:**
- No end-user authentication detected
  - Implementation: anonymous/public database access via grants in `supabase/migrations/0001_init.sql`
  - Client bootstrap: `src/lib/supabase.ts`

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- Browser toast notifications via `react-hot-toast`
- Console warning for missing env vars in `src/lib/supabase.ts`
- No centralized logging or tracing pipeline detected

## CI/CD & Deployment

**Hosting:**
- Vercel configuration present in `vercel.json`
- Local container stack for development in `docker-compose.yml`

**CI Pipeline:**
- None detected in the repository

## Environment Configuration

**Required env vars:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_OPTIMIZER_URL` optional override, documented in `.env.example`

**Secrets location:**
- `.env` for local frontend env vars, referenced by `README.md`
- `docker-compose.yml` embeds development-only credentials and tokens inline for local services
- No secret manager integration detected in repo config

## Webhooks & Callbacks

**Incoming:**
- `POST /` in `api/optimizer.py` for optimization requests
- No third-party webhook consumers detected

**Outgoing:**
- Browser-originated requests to Supabase REST endpoints and the optimizer API
- No server-side webhook emitters detected

---

*Integration audit: 2026-03-19*
