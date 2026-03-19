-- SkoleGeni schema for the "Academic Clarity" app

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.requesting_user_id()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')
  )::uuid
$$;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default public.requesting_user_id(),
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

create or replace function public.replace_project_roster_state(
  project_id_input uuid,
  pupils_input jsonb,
  chemistry_input jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  select owner_user_id
  into owner_id
  from public.projects
  where id = project_id_input;

  if owner_id is null then
    raise exception 'Project not found';
  end if;

  if owner_id <> public.requesting_user_id() then
    raise exception 'Project access denied';
  end if;

  delete from public.chemistry_links where project_id = project_id_input;
  delete from public.pupils where project_id = project_id_input;

  insert into public.pupils (id, project_id, name, gender, origin_school, needs, zone)
  select
    p.id,
    project_id_input,
    p.name,
    p.gender,
    p.origin_school,
    p.needs,
    p.zone
  from jsonb_to_recordset(coalesce(pupils_input, '[]'::jsonb)) as p(
    id uuid,
    name text,
    gender text,
    origin_school text,
    needs text,
    zone text
  );

  insert into public.chemistry_links (project_id, from_pupil_id, to_pupil_id, relationship)
  select
    project_id_input,
    c.from_pupil_id,
    c.to_pupil_id,
    c.relationship
  from (
    select
      positive_link.from_pupil_id,
      positive_link.to_pupil_id,
      'positive'::text as relationship
    from jsonb_to_recordset(coalesce(chemistry_input -> 'positive', '[]'::jsonb)) as positive_link(
      from_pupil_id uuid,
      to_pupil_id uuid
    )
    union all
    select
      negative_link.from_pupil_id,
      negative_link.to_pupil_id,
      'negative'::text as relationship
    from jsonb_to_recordset(coalesce(chemistry_input -> 'negative', '[]'::jsonb)) as negative_link(
      from_pupil_id uuid,
      to_pupil_id uuid
    )
  ) as c;
end;
$$;

alter table public.projects enable row level security;
alter table public.project_constraints enable row level security;
alter table public.pupils enable row level security;
alter table public.chemistry_links enable row level security;
alter table public.optimization_runs enable row level security;

drop policy if exists projects_select_owner on public.projects;
create policy projects_select_owner on public.projects for select to authenticated
using (owner_user_id = public.requesting_user_id());

drop policy if exists projects_insert_owner on public.projects;
create policy projects_insert_owner on public.projects for insert to authenticated
with check (owner_user_id = public.requesting_user_id());

drop policy if exists projects_update_owner on public.projects;
create policy projects_update_owner on public.projects for update to authenticated
using (owner_user_id = public.requesting_user_id())
with check (owner_user_id = public.requesting_user_id());

drop policy if exists projects_delete_owner on public.projects;
create policy projects_delete_owner on public.projects for delete to authenticated
using (owner_user_id = public.requesting_user_id());

drop policy if exists project_constraints_select_owner on public.project_constraints;
create policy project_constraints_select_owner on public.project_constraints for select to authenticated
using (exists (
  select 1 from public.projects
  where public.projects.id = public.project_constraints.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
));

drop policy if exists project_constraints_insert_owner on public.project_constraints;
create policy project_constraints_insert_owner on public.project_constraints for insert to authenticated
with check (exists (
  select 1 from public.projects
  where public.projects.id = public.project_constraints.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
));

drop policy if exists project_constraints_update_owner on public.project_constraints;
create policy project_constraints_update_owner on public.project_constraints for update to authenticated
using (exists (
  select 1 from public.projects
  where public.projects.id = public.project_constraints.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
))
with check (exists (
  select 1 from public.projects
  where public.projects.id = public.project_constraints.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
));

drop policy if exists project_constraints_delete_owner on public.project_constraints;
create policy project_constraints_delete_owner on public.project_constraints for delete to authenticated
using (exists (
  select 1 from public.projects
  where public.projects.id = public.project_constraints.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
));

drop policy if exists pupils_select_owner on public.pupils;
create policy pupils_select_owner on public.pupils for select to authenticated
using (exists (
  select 1 from public.projects
  where public.projects.id = public.pupils.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
));

drop policy if exists pupils_insert_owner on public.pupils;
create policy pupils_insert_owner on public.pupils for insert to authenticated
with check (exists (
  select 1 from public.projects
  where public.projects.id = public.pupils.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
));

drop policy if exists pupils_update_owner on public.pupils;
create policy pupils_update_owner on public.pupils for update to authenticated
using (exists (
  select 1 from public.projects
  where public.projects.id = public.pupils.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
))
with check (exists (
  select 1 from public.projects
  where public.projects.id = public.pupils.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
));

drop policy if exists pupils_delete_owner on public.pupils;
create policy pupils_delete_owner on public.pupils for delete to authenticated
using (exists (
  select 1 from public.projects
  where public.projects.id = public.pupils.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
));

drop policy if exists chemistry_links_select_owner on public.chemistry_links;
create policy chemistry_links_select_owner on public.chemistry_links for select to authenticated
using (exists (
  select 1 from public.projects
  where public.projects.id = public.chemistry_links.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
));

drop policy if exists chemistry_links_insert_owner on public.chemistry_links;
create policy chemistry_links_insert_owner on public.chemistry_links for insert to authenticated
with check (exists (
  select 1 from public.projects
  where public.projects.id = public.chemistry_links.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
));

drop policy if exists chemistry_links_update_owner on public.chemistry_links;
create policy chemistry_links_update_owner on public.chemistry_links for update to authenticated
using (exists (
  select 1 from public.projects
  where public.projects.id = public.chemistry_links.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
))
with check (exists (
  select 1 from public.projects
  where public.projects.id = public.chemistry_links.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
));

drop policy if exists chemistry_links_delete_owner on public.chemistry_links;
create policy chemistry_links_delete_owner on public.chemistry_links for delete to authenticated
using (exists (
  select 1 from public.projects
  where public.projects.id = public.chemistry_links.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
));

drop policy if exists optimization_runs_select_owner on public.optimization_runs;
create policy optimization_runs_select_owner on public.optimization_runs for select to authenticated
using (exists (
  select 1 from public.projects
  where public.projects.id = public.optimization_runs.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
));

drop policy if exists optimization_runs_insert_owner on public.optimization_runs;
create policy optimization_runs_insert_owner on public.optimization_runs for insert to authenticated
with check (exists (
  select 1 from public.projects
  where public.projects.id = public.optimization_runs.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
));

drop policy if exists optimization_runs_update_owner on public.optimization_runs;
create policy optimization_runs_update_owner on public.optimization_runs for update to authenticated
using (exists (
  select 1 from public.projects
  where public.projects.id = public.optimization_runs.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
))
with check (exists (
  select 1 from public.projects
  where public.projects.id = public.optimization_runs.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
));

drop policy if exists optimization_runs_delete_owner on public.optimization_runs;
create policy optimization_runs_delete_owner on public.optimization_runs for delete to authenticated
using (exists (
  select 1 from public.projects
  where public.projects.id = public.optimization_runs.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
));

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.project_constraints to authenticated;
grant select, insert, update, delete on table public.pupils to authenticated;
grant select, insert, update, delete on table public.chemistry_links to authenticated;
grant select, insert, update, delete on table public.optimization_runs to authenticated;
grant execute on function public.requesting_user_id() to authenticated;
grant execute on function public.replace_project_roster_state(uuid, jsonb, jsonb) to authenticated;

