-- Copied from supabase/migrations/0001_init.sql for Docker init
-- SkoleGeni schema for the "Academic Clarity" app

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create table if not exists public.project_constraints (
  project_id uuid primary key references public.projects(id) on delete cascade,
  min_class_size int not null,
  max_class_size int not null,
  gender_priority text not null,
  origin_priority text not null,
  location_priority text not null,
  needs_priority text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_project_constraints_updated_at on public.project_constraints;
create trigger trg_project_constraints_updated_at
before update on public.project_constraints
for each row execute function public.set_updated_at();

create table if not exists public.pupils (
  id uuid primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  gender text not null,
  origin_school text not null,
  needs text not null,
  zone text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_pupils_project_id on public.pupils(project_id);

create table if not exists public.chemistry_links (
  project_id uuid not null references public.projects(id) on delete cascade,
  from_pupil_id uuid not null references public.pupils(id) on delete cascade,
  to_pupil_id uuid not null references public.pupils(id) on delete cascade,
  relationship text not null check (relationship in ('positive','negative')),
  created_at timestamptz not null default now(),
  primary key (project_id, from_pupil_id, to_pupil_id, relationship)
);

create index if not exists idx_chemistry_links_project_id on public.chemistry_links(project_id);

create table if not exists public.optimization_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  constraints jsonb not null,
  result_json jsonb not null,
  score_overall double precision not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_optimization_runs_project_id on public.optimization_runs(project_id, created_at desc);

-- MVP access: grant anon permissions.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.projects to anon, authenticated;
grant select, insert, update, delete on table public.project_constraints to anon, authenticated;
grant select, insert, update, delete on table public.pupils to anon, authenticated;
grant select, insert, update, delete on table public.chemistry_links to anon, authenticated;
grant select, insert, update, delete on table public.optimization_runs to anon, authenticated;

