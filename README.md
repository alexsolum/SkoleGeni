# SkoleGeni 

Web app for algorithmic class generation and balancing, for the school admin.

## What’s included (MVP)

Frontend (Vite + React + Tailwind):
- `Welcome` screen with “Create New Roster” and recent projects list
- `Configuration` screen for class size + constraint priorities
- `Pupil Data` table with CSV import and chemistry (+/-) links
- `Optimization Results` dashboard + “Open Class Editor”
- `Class Editor` drag-and-drop (MVP conflict rule: negative chemistry blocks `(-)` are hard)

Backend (Vercel Python Functions + OR-Tools):
- `api/optimizer.py` uses OR-Tools CP-SAT to generate balanced classes under the configured constraints

Database (Supabase):
- SQL schema in `supabase/migrations/0001_init.sql`
- Tables: `projects`, `project_constraints`, `pupils`, `chemistry_links`, `optimization_runs`

## Local setup

1. Create a Supabase project.
2. Apply the migration SQL: `supabase/migrations/0001_init.sql`
3. Add `.env` (copy from `.env.example`) with your Supabase values:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_AUTH_REDIRECT_URL` (recommended for email sign-in flows)

4. Install + run the frontend:
   - `npm install`
   - `npm run dev`

## Local testing with Docker Desktop (recommended)

This starts a local Postgres + PostgREST (Supabase REST) + Kong gateway, the Python optimizer API, and the frontend dev server.

### Auth and access expectations

- The hardened foundation is owner-based and expects authenticated access for project data.
- Anonymous project browsing and editing are no longer the intended application model.
- Browser reads can remain direct, but only under authenticated access plus Row Level Security.
- The Docker stack in this repository is a local PostgREST-style data stack, not a full Supabase Auth replacement.

### Prereqs
- Docker Desktop running

### Start
- `docker compose up --build`

### URLs
- App: `http://localhost:5173`
- “Supabase” REST base (Kong): `http://localhost:54325` (REST lives at `/rest/v1`)
- Optimizer API (FastAPI): `http://localhost:8000/` (POST to `/`)

### Reset the local DB
- `docker compose down -v`

### Running the optimizer locally (for development)

The frontend calls the optimizer at `VITE_OPTIMIZER_URL` (default: `/api/optimizer` for Vercel).

To run locally:
1. `pip install -r requirements.txt`
2. `uvicorn api.optimizer:app --port 8000`
3. Set `VITE_OPTIMIZER_URL=http://localhost:8000/`

Then start the frontend and use the UI to generate classes.

## Phase 1 verification

After foundation hardening changes, run:

- `npm run verify:phase1`

This currently executes the frontend build as the minimum repeatable safety check for the hardened foundation.

## CSV import format (MVP)

Your CSV should include headers (case-insensitive matches are supported for a few fields):
- `name` (or `student_name`)
- `origin_school`
- `gender` (`Male`/`Female`/`Other`)
- `needs`
- `zone`

Chemistry links are created via the `+` and `-` buttons in the UI.

## Deployment on Vercel

1. Deploy this repo as a Vercel project.
2. Ensure `requirements.txt` and `api/optimizer.py` are included.
3. Configure environment variables:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - (optional) `VITE_OPTIMIZER_URL` (keep `/api/optimizer` for production)

