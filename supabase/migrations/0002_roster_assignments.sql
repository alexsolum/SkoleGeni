create table if not exists public.roster_assignments (
  project_id uuid primary key references public.projects(id) on delete cascade,
  assignment jsonb not null default '[]'::jsonb,
  score_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_roster_assignments_updated_at on public.roster_assignments;
create trigger trg_roster_assignments_updated_at
before update on public.roster_assignments
for each row execute function public.set_updated_at();

alter table public.roster_assignments enable row level security;

drop policy if exists roster_assignments_select_owner on public.roster_assignments;
create policy roster_assignments_select_owner on public.roster_assignments for select to authenticated
using (exists (
  select 1 from public.projects
  where public.projects.id = public.roster_assignments.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
));

drop policy if exists roster_assignments_insert_owner on public.roster_assignments;
create policy roster_assignments_insert_owner on public.roster_assignments for insert to authenticated
with check (exists (
  select 1 from public.projects
  where public.projects.id = public.roster_assignments.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
));

drop policy if exists roster_assignments_update_owner on public.roster_assignments;
create policy roster_assignments_update_owner on public.roster_assignments for update to authenticated
using (exists (
  select 1 from public.projects
  where public.projects.id = public.roster_assignments.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
))
with check (exists (
  select 1 from public.projects
  where public.projects.id = public.roster_assignments.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
));

drop policy if exists roster_assignments_delete_owner on public.roster_assignments;
create policy roster_assignments_delete_owner on public.roster_assignments for delete to authenticated
using (exists (
  select 1 from public.projects
  where public.projects.id = public.roster_assignments.project_id
    and public.projects.owner_user_id = public.requesting_user_id()
));

grant select, insert, update, delete on table public.roster_assignments to authenticated;
