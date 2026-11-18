-- Blueprint v7: task prerequisites and event-linked competition preparation.
-- Safe, additive to v1-v6. No AI, notifications, email, or outside accounts.
begin;

create table public.task_dependencies(
 team_id text not null references public.teams(id) on delete cascade,
 task_id uuid not null references public.tasks(id) on delete cascade,
 prerequisite_id uuid not null references public.tasks(id) on delete cascade,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 primary key(task_id,prerequisite_id),
 check(task_id<>prerequisite_id)
);
create index task_dependencies_team on public.task_dependencies(team_id,task_id);
create index task_dependencies_prereq on public.task_dependencies(prerequisite_id);
alter table public.task_dependencies enable row level security;
revoke all on public.task_dependencies from public,anon,authenticated;
grant select,insert,delete on public.task_dependencies to authenticated;
create policy "Approved team views task dependencies"
 on public.task_dependencies for select to authenticated
 using(private.is_approved_member(team_id));
create policy "Leads add task dependencies"
 on public.task_dependencies for insert to authenticated
 with check(private.is_manager(team_id) and created_by=(select auth.uid()));
create policy "Leads remove task dependencies"
 on public.task_dependencies for delete to authenticated
 using(private.is_manager(team_id));

-- A dependency is only valid between tasks in the SAME team. Reject cycles
-- (including transitive cycles) and inconsistent links to an already done task.
create or replace function private.blueprint_check_task_dependency()
returns trigger language plpgsql security invoker set search_path=''
as $$
declare cyclic boolean; task_state text; pre_state text;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(NEW.team_id));
 select status into task_state from public.tasks
  where id=NEW.task_id and team_id=NEW.team_id;
 select status into pre_state from public.tasks
  where id=NEW.prerequisite_id and team_id=NEW.team_id;
 if task_state is null or pre_state is null then
  raise exception 'Both tasks must be in the selected team';
 end if;
 with recursive upstream(id) as (
  select d.prerequisite_id from public.task_dependencies d where d.task_id=NEW.prerequisite_id
  union
  select d.prerequisite_id from public.task_dependencies d join upstream u on d.task_id=u.id
 )
 select exists(select 1 from upstream where id=NEW.task_id) into cyclic;
 if cyclic then raise exception 'Circular task dependencies are not allowed'; end if;
 if task_state='done' and pre_state<>'done' then
  raise exception 'Reopen the dependent task before adding an unfinished prerequisite';
 end if;
 return NEW;
end;
$$;
revoke all on function private.blueprint_check_task_dependency() from public,anon,authenticated;
create trigger blueprint_validate_task_dependency
 before insert on public.task_dependencies
 for each row execute function private.blueprint_check_task_dependency();

-- Enforce prerequisites in the database, including direct API requests.
-- Also reject reopening a completed prerequisite when a downstream task
-- is already completed, so the board does not silently become inconsistent.
create or replace function private.blueprint_guard_task_prerequisites()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
 if NEW.status is distinct from OLD.status then
  if NEW.status='done' and exists(
   select 1 from public.task_dependencies d
   join public.tasks prereq on prereq.id=d.prerequisite_id
   where d.task_id=NEW.id and d.team_id=NEW.team_id and prereq.status<>'done'
  ) then raise exception 'Complete the prerequisite tasks first'; end if;
  if OLD.status='done' and NEW.status<>'done' and exists(
   select 1 from public.task_dependencies d
   join public.tasks dependent on dependent.id=d.task_id
   where d.prerequisite_id=NEW.id and d.team_id=NEW.team_id and dependent.status='done'
  ) then raise exception 'Reopen dependent tasks before reopening this prerequisite'; end if;
 end if;
 return NEW;
end;
$$;
revoke all on function private.blueprint_guard_task_prerequisites() from public,anon,authenticated;
create trigger blueprint_enforce_task_prerequisites before update of status on public.tasks
 for each row execute function private.blueprint_guard_task_prerequisites();

create table public.event_checklist_items(
 id uuid primary key default gen_random_uuid(),
 team_id text not null references public.teams(id) on delete cascade,
 event_id uuid not null references public.events(id) on delete cascade,
 category text not null default 'other'
  check(category in ('packing','pit','inspection','travel','other')),
 title text not null check(char_length(title) between 1 and 140),
 notes text not null default '' check(char_length(notes)<=800),
 status text not null default 'todo' check(status in ('todo','done')),
 assigned_to uuid references auth.users(id) on delete set null,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_by uuid references auth.users(id),
 updated_at timestamptz
);
create index event_checklist_team_event on public.event_checklist_items(team_id,event_id);
alter table public.event_checklist_items enable row level security;
revoke all on public.event_checklist_items from public,anon,authenticated;
grant select,insert,update(title,notes,category,status,assigned_to),delete
 on public.event_checklist_items to authenticated;
create policy "Approved team sees event preparation"
 on public.event_checklist_items for select to authenticated
 using(private.is_approved_member(team_id));
create policy "Leads create preparation items"
 on public.event_checklist_items for insert to authenticated
 with check(private.is_manager(team_id) and created_by=(select auth.uid()));
create policy "Leads or assigned member update preparation"
 on public.event_checklist_items for update to authenticated
 using(private.is_manager(team_id) or
  (private.is_approved_member(team_id) and assigned_to=(select auth.uid())))
 with check(private.is_manager(team_id) or
  (private.is_approved_member(team_id) and assigned_to=(select auth.uid())));
create policy "Leads delete preparation items"
 on public.event_checklist_items for delete to authenticated
 using(private.is_manager(team_id));

create or replace function private.blueprint_guard_event_checklist()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
 if not exists(select 1 from public.events e where e.id=NEW.event_id and e.team_id=NEW.team_id) then
  raise exception 'Preparation item event must be on this team';
 end if;
 if NEW.assigned_to is not null and not exists(
   select 1 from public.team_memberships m
   where m.team_id=NEW.team_id and m.user_id=NEW.assigned_to and m.status='approved'
 ) then raise exception 'Checklist assignee must be an approved teammate'; end if;
 if TG_OP='UPDATE' then
  if not private.is_manager(OLD.team_id) and (
    OLD.assigned_to is distinct from (select auth.uid()) or
    (to_jsonb(NEW)-'status') is distinct from (to_jsonb(OLD)-'status')
  ) then raise exception 'Assigned teammates may change checklist status only'; end if;
  NEW.updated_at=now();
  NEW.updated_by=(select auth.uid());
 end if;
 return NEW;
end;
$$;
revoke all on function private.blueprint_guard_event_checklist() from public,anon,authenticated;
create trigger blueprint_validate_event_checklist
 before insert or update on public.event_checklist_items
 for each row execute function private.blueprint_guard_event_checklist();

-- Reuse v5 audit table, but do not include student notes or checklist contents.
create or replace function private.blueprint_v7_audit()
returns trigger language plpgsql security definer set search_path=''
as $$
declare actor uuid; team text; subject uuid; action_name text;
begin
 actor=(select auth.uid());
 if actor is null then return case when TG_OP='DELETE' then OLD else NEW end; end if;
 team=case when TG_OP='DELETE' then OLD.team_id else NEW.team_id end;
 subject=case when TG_OP='DELETE' then OLD.id else NEW.id end;
 action_name=case
  when TG_TABLE_NAME='event_checklist_items' then
   case TG_OP when 'INSERT' then 'checklist_added'
              when 'UPDATE' then 'checklist_updated'
              else 'checklist_removed' end
  when TG_TABLE_NAME='task_dependencies' then
   case TG_OP when 'INSERT' then 'dependency_added' else 'dependency_removed' end
 end;
 insert into public.activity_events(team_id,actor_id,action,subject_type,subject_id)
 values(team,actor,action_name,TG_TABLE_NAME,subject);
 return case when TG_OP='DELETE' then OLD else NEW end;
end;
$$;
revoke all on function private.blueprint_v7_audit() from public,anon,authenticated;
-- Dependency table has a composite key: use task_id as the audit subject.
create or replace function private.blueprint_v7_dependency_audit()
returns trigger language plpgsql security definer set search_path=''
as $$
declare actor uuid;
begin
 actor=(select auth.uid());
 if actor is not null then
  insert into public.activity_events(team_id,actor_id,action,subject_type,subject_id)
  values(case when TG_OP='DELETE' then OLD.team_id else NEW.team_id end,
         actor,case when TG_OP='DELETE' then 'dependency_removed' else 'dependency_added' end,
         'task_dependencies',case when TG_OP='DELETE' then OLD.task_id else NEW.task_id end);
 end if;
 return case when TG_OP='DELETE' then OLD else NEW end;
end;
$$;
revoke all on function private.blueprint_v7_dependency_audit() from public,anon,authenticated;
create trigger blueprint_audit_task_dependencies after insert or delete on public.task_dependencies
 for each row execute function private.blueprint_v7_dependency_audit();
create trigger blueprint_audit_event_checklists after insert or update or delete on public.event_checklist_items
 for each row execute function private.blueprint_v7_audit();

alter publication supabase_realtime add table public.task_dependencies;
alter publication supabase_realtime add table public.event_checklist_items;
commit;
