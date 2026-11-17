-- Blueprint schema v1. Run ONLY on a dedicated Blueprint Supabase project.
-- All public tables enable RLS. No data is readable by anonymous visitors.
-- Bootstrap your first administrator in the SQL editor after they sign in/request access.
begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table if not exists public.teams (
  id text primary key check (id in ('1810','9316')),
  name text not null,
  created_at timestamptz not null default now()
);
insert into public.teams(id,name) values
  ('1810','CATATRONICS'),('9316','CUBATRONICS')
on conflict (id) do update set name=excluded.name;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 80),
  created_at timestamptz not null default now()
);

create table if not exists public.team_memberships (
  team_id text not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member','lead','captain','mentor','admin')),
  subgroup text not null check (subgroup in ('Design','Mechanical','Manufacturing','Electrical','Programming','Strategy','Business')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  primary key(team_id,user_id)
);
create index if not exists memberships_by_user on public.team_memberships(user_id,status);

-- Only the database owner creates these routines. SECURITY DEFINER avoids
-- RLS self-reference on membership checks. They live outside exposed public.
-- No user_id is accepted as a parameter: the caller is always auth.uid().
create or replace function private.is_approved_member(p_team text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.team_memberships m
    where m.team_id=p_team and m.user_id=(select auth.uid()) and m.status='approved'
  );
$$;
create or replace function private.is_manager(p_team text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.team_memberships m
    where m.team_id=p_team and m.user_id=(select auth.uid())
      and m.status='approved' and m.role in ('lead','captain','mentor','admin')
  );
$$;
create or replace function private.is_admin(p_team text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.team_memberships m
    where m.team_id=p_team and m.user_id=(select auth.uid())
      and m.status='approved' and m.role='admin'
  );
$$;
-- Only approved teammates see each other's names. Team admins can also
-- see names attached to pending membership requests for their own team.
create or replace function private.shares_team(p_other_user uuid)
returns boolean language sql stable security definer set search_path = ''
as $
 select (select auth.uid()) is not null and exists (
   select 1 from public.team_memberships viewer
   join public.team_memberships target on target.team_id = viewer.team_id
   where viewer.user_id = (select auth.uid()) and viewer.status = 'approved'
     and target.user_id = p_other_user
     and (target.status = 'approved' or viewer.role = 'admin')
 );
$;
revoke all on function private.shares_team(uuid) from public,anon;
grant execute on function private.shares_team(uuid) to authenticated;

revoke all on function private.is_approved_member(text) from public,anon;
revoke all on function private.is_manager(text) from public,anon;
revoke all on function private.is_admin(text) from public,anon;
grant execute on function private.is_approved_member(text) to authenticated;
grant execute on function private.is_manager(text) to authenticated;
grant execute on function private.is_admin(text) to authenticated;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  team_id text not null references public.teams(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  subgroup text,
  due_date date,
  priority text not null default 'Normal' check (priority in ('Low','Normal','High')),
  status text not null default 'todo' check (status in ('todo','in_progress','blocked','done')),
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists tasks_team_created on public.tasks(team_id,created_at desc);

create table if not exists public.build_logs (
  id uuid primary key default gen_random_uuid(),
  team_id text not null references public.teams(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  body text not null check (char_length(body) between 1 and 3000),
  subgroup text,
  author_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists logs_team_created on public.build_logs(team_id,created_at desc);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  team_id text not null references public.teams(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  description text not null default '',
  subgroup text,
  progress integer not null default 0 check(progress between 0 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  team_id text not null references public.teams(id) on delete cascade,
  channel text not null check (channel in ('general','design','mechanical','manufacturing','electrical','programming','strategy')),
  body text not null check (char_length(body) between 1 and 1000),
  author_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists messages_team_channel_created on public.messages(team_id,channel,created_at desc);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  team_id text not null references public.teams(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  starts_at timestamptz not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.team_memberships enable row level security;
alter table public.tasks enable row level security;
alter table public.build_logs enable row level security;
alter table public.projects enable row level security;
alter table public.messages enable row level security;
alter table public.events enable row level security;

-- Tables are not broadly granted to anon or PUBLIC. Policies further scope reads/writes.
revoke all on public.teams,public.profiles,public.team_memberships,public.tasks,
 public.build_logs,public.projects,public.messages,public.events from public,anon;
grant select on public.teams to authenticated;
grant select,insert,update(full_name) on public.profiles to authenticated;
grant select,insert,update(role,subgroup,status) on public.team_memberships to authenticated;
grant select,insert,update(title,subgroup,due_date,priority,status,assigned_to) on public.tasks to authenticated;
grant select,insert on public.build_logs to authenticated;
grant select,insert on public.projects to authenticated;
grant select,insert on public.messages to authenticated;
grant select,insert on public.events to authenticated;

create policy "Signed-in users see team names" on public.teams
 for select to authenticated using (true);

create policy "Read own profile" on public.profiles
 for select to authenticated using (id=(select auth.uid()) or private.shares_team(id));
create policy "Create own profile" on public.profiles
 for insert to authenticated with check (id=(select auth.uid()));
create policy "Edit own profile" on public.profiles
 for update to authenticated using (id=(select auth.uid()))
 with check(id=(select auth.uid()));

create policy "Read own or managed memberships" on public.team_memberships
 for select to authenticated
 using(user_id=(select auth.uid()) or (status='approved' and private.is_approved_member(team_id)) or private.is_admin(team_id));
create policy "Request membership as member pending" on public.team_memberships
 for insert to authenticated
 with check(user_id=(select auth.uid()) and role='member' and status='pending');
create policy "Only admins manage memberships" on public.team_memberships
 for update to authenticated
 using(private.is_admin(team_id)) with check(private.is_admin(team_id));

create policy "Approved members read tasks" on public.tasks
 for select to authenticated using(private.is_approved_member(team_id));
create policy "Leads create tasks" on public.tasks
 for insert to authenticated with check(private.is_manager(team_id) and created_by=(select auth.uid()));
-- Validate assigned member and protect tasks from non-manager edits.
-- Assigned members can change only the status field; managers can edit details.
create or replace function private.guard_task_change()
returns trigger language plpgsql security invoker set search_path = ''
as $
begin
 if NEW.assigned_to is not null and not exists (
  select 1 from public.team_memberships m
  where m.team_id=NEW.team_id and m.user_id=NEW.assigned_to and m.status='approved'
 ) then
  raise exception 'Assignee must be an approved member of this team';
 end if;
 if TG_OP = 'UPDATE' and not private.is_manager(OLD.team_id) then
  if OLD.assigned_to is distinct from (select auth.uid()) or
     (to_jsonb(NEW) - 'status') is distinct from (to_jsonb(OLD) - 'status') then
   raise exception 'Only task status can be changed by assigned members';
  end if;
 end if;
 return NEW;
end;
$;
revoke all on function private.guard_task_change() from public,anon;
create trigger validate_task_changes
 before insert or update on public.tasks
 for each row execute function private.guard_task_change();

create policy "Leads or assignees update task status" on public.tasks
 for update to authenticated
 using(private.is_manager(team_id) or (private.is_approved_member(team_id) and assigned_to=(select auth.uid())))
 with check(private.is_manager(team_id) or (private.is_approved_member(team_id) and assigned_to=(select auth.uid())));

create policy "Approved members read build logs" on public.build_logs
 for select to authenticated using(private.is_approved_member(team_id));
create policy "Leads write build logs" on public.build_logs
 for insert to authenticated with check(private.is_manager(team_id) and author_id=(select auth.uid()));

create policy "Approved members read projects" on public.projects
 for select to authenticated using(private.is_approved_member(team_id));
create policy "Leads create projects" on public.projects
 for insert to authenticated with check(private.is_manager(team_id));

create policy "Approved members read messages" on public.messages
 for select to authenticated using(private.is_approved_member(team_id));
create policy "Approved members send own messages" on public.messages
 for insert to authenticated
 with check(private.is_approved_member(team_id) and author_id=(select auth.uid()));

create policy "Approved members read events" on public.events
 for select to authenticated using(private.is_approved_member(team_id));
create policy "Leads create events" on public.events
 for insert to authenticated with check(private.is_manager(team_id) and created_by=(select auth.uid()));

commit;
