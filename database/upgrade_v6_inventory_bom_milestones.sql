-- Blueprint v6: team-scoped stock catalog, project bills of materials, milestones.
-- These are planned and recorded quantities, not financial or procurement orders.
begin;

create table public.inventory_items(
 id uuid primary key default gen_random_uuid(),
 team_id text not null references public.teams(id) on delete cascade,
 name text not null check(char_length(name) between 1 and 120),
 sku text not null default '' check(char_length(sku)<=80),
 quantity_on_hand integer not null default 0 check(quantity_on_hand between 0 and 1000000),
 reorder_at integer not null default 0 check(reorder_at between 0 and 1000000),
 unit text not null default 'each' check(unit in ('each','mm','cm','m','g','kg','sheet')),
 storage_location text not null default '' check(char_length(storage_location)<=120),
 notes text not null default '' check(char_length(notes)<=1000),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_by uuid references auth.users(id),
 updated_at timestamptz
);
create index inventory_team_name on public.inventory_items(team_id,name);
alter table public.inventory_items enable row level security;
revoke all on public.inventory_items from public,anon,authenticated;
grant select,insert,update(name,sku,quantity_on_hand,reorder_at,unit,storage_location,notes)
 on public.inventory_items to authenticated;
create policy "Approved team reads inventory" on public.inventory_items
 for select to authenticated using(private.is_approved_member(team_id));
create policy "Leads add inventory" on public.inventory_items
 for insert to authenticated
 with check(private.is_manager(team_id) and created_by=(select auth.uid()));
create policy "Leads update inventory" on public.inventory_items
 for update to authenticated
 using(private.is_manager(team_id)) with check(private.is_manager(team_id));

create table public.project_bom_items(
 id uuid primary key default gen_random_uuid(),
 team_id text not null references public.teams(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete cascade,
 inventory_id uuid not null references public.inventory_items(id) on delete restrict,
 quantity_required integer not null check(quantity_required between 1 and 1000000),
 notes text not null default '' check(char_length(notes)<=500),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz,
 updated_by uuid references auth.users(id),
 unique(project_id,inventory_id)
);
create index bom_team_project on public.project_bom_items(team_id,project_id);
alter table public.project_bom_items enable row level security;
revoke all on public.project_bom_items from public,anon,authenticated;
grant select,insert,update(quantity_required,notes),delete on public.project_bom_items to authenticated;
create policy "Approved teammates read BOM" on public.project_bom_items
 for select to authenticated using(private.is_approved_member(team_id));
create policy "Leads attach catalog parts" on public.project_bom_items
 for insert to authenticated
 with check(private.is_manager(team_id) and created_by=(select auth.uid()));
create policy "Leads edit BOM requirements" on public.project_bom_items
 for update to authenticated
 using(private.is_manager(team_id)) with check(private.is_manager(team_id));
create policy "Leads remove BOM lines" on public.project_bom_items
 for delete to authenticated using(private.is_manager(team_id));

create table public.project_milestones(
 id uuid primary key default gen_random_uuid(),
 team_id text not null references public.teams(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete cascade,
 title text not null check(char_length(title) between 1 and 140),
 status text not null default 'planned' check(status in ('planned','in_progress','blocked','done')),
 due_on date,
 notes text not null default '' check(char_length(notes)<=800),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_by uuid references auth.users(id),
 updated_at timestamptz
);
create index milestone_team_project_due on public.project_milestones(team_id,project_id,due_on);
alter table public.project_milestones enable row level security;
revoke all on public.project_milestones from public,anon,authenticated;
grant select,insert,update(title,status,due_on,notes),delete on public.project_milestones to authenticated;
create policy "Approved team sees milestones" on public.project_milestones
 for select to authenticated using(private.is_approved_member(team_id));
create policy "Leads create project milestones" on public.project_milestones
 for insert to authenticated
 with check(private.is_manager(team_id) and created_by=(select auth.uid()));
create policy "Leads update milestones" on public.project_milestones
 for update to authenticated
 using(private.is_manager(team_id)) with check(private.is_manager(team_id));
create policy "Leads remove milestones" on public.project_milestones
 for delete to authenticated using(private.is_manager(team_id));

-- Structural relationships must be team-local even if a client forges foreign IDs.
create or replace function private.blueprint_validate_bom()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
 if not exists(select 1 from public.projects p where p.id=NEW.project_id and p.team_id=NEW.team_id) then
   raise exception 'BOM project must belong to the selected team';
 end if;
 if not exists(select 1 from public.inventory_items i where i.id=NEW.inventory_id and i.team_id=NEW.team_id) then
   raise exception 'BOM stock item must belong to the selected team';
 end if;
 return NEW;
end;
$$;
revoke all on function private.blueprint_validate_bom() from public,anon,authenticated;
create trigger blueprint_validate_bom_before_write before insert or update on public.project_bom_items
 for each row execute function private.blueprint_validate_bom();

create or replace function private.blueprint_validate_milestone()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
 if not exists(select 1 from public.projects p where p.id=NEW.project_id and p.team_id=NEW.team_id) then
   raise exception 'Milestone project must belong to the selected team';
 end if;
 return NEW;
end;
$$;
revoke all on function private.blueprint_validate_milestone() from public,anon,authenticated;
create trigger blueprint_validate_milestone_before_write before insert or update on public.project_milestones
 for each row execute function private.blueprint_validate_milestone();

-- A small append-only activity record for planning changes, no full student notes.
create or replace function private.blueprint_planning_audit()
returns trigger language plpgsql security definer set search_path=''
as $$
declare actor uuid; team text; subject uuid; action_name text;
begin
 actor=(select auth.uid());
 if actor is null then return case when TG_OP='DELETE' then OLD else NEW end; end if;
 team=case when TG_OP='DELETE' then OLD.team_id else NEW.team_id end;
 subject=case when TG_OP='DELETE' then OLD.id else NEW.id end;
 action_name=case TG_TABLE_NAME
  when 'inventory_items' then case TG_OP when 'INSERT' then 'stock_added' else 'stock_updated' end
  when 'project_bom_items' then case TG_OP when 'INSERT' then 'bom_added' when 'DELETE' then 'bom_removed' else 'bom_updated' end
  when 'project_milestones' then case TG_OP when 'INSERT' then 'milestone_added' when 'DELETE' then 'milestone_removed' else 'milestone_updated' end
 end;
 insert into public.activity_events(team_id,actor_id,action,subject_type,subject_id)
 values(team,actor,action_name,TG_TABLE_NAME,subject);
 return case when TG_OP='DELETE' then OLD else NEW end;
end;
$$;
revoke all on function private.blueprint_planning_audit() from public,anon,authenticated;
create trigger blueprint_audit_inventory after insert or update on public.inventory_items
 for each row execute function private.blueprint_planning_audit();
create trigger blueprint_audit_bom after insert or update or delete on public.project_bom_items
 for each row execute function private.blueprint_planning_audit();
create trigger blueprint_audit_milestones after insert or update or delete on public.project_milestones
 for each row execute function private.blueprint_planning_audit();

-- Server-assigned modification attribution: browser clients cannot forge authorship.
create or replace function private.blueprint_stamp_planning_edit()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
 NEW.updated_at=now();
 NEW.updated_by=(select auth.uid());
 return NEW;
end;
$$;
revoke all on function private.blueprint_stamp_planning_edit() from public,anon,authenticated;
create trigger blueprint_stock_edit_stamp before update on public.inventory_items
 for each row execute function private.blueprint_stamp_planning_edit();
create trigger blueprint_bom_edit_stamp before update on public.project_bom_items
 for each row execute function private.blueprint_stamp_planning_edit();
create trigger blueprint_milestone_edit_stamp before update on public.project_milestones
 for each row execute function private.blueprint_stamp_planning_edit();

alter publication supabase_realtime add table public.inventory_items;
alter publication supabase_realtime add table public.project_bom_items;
alter publication supabase_realtime add table public.project_milestones;
commit;
