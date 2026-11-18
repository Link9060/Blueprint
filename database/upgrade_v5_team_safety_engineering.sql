-- Blueprint v5: protected message reporting, moderator actions, audit history,
-- CAD reference links and manufacturing request tracking. No AI features.
begin;

-- Moderation preserves the evidence, rather than deleting a message.
alter table public.messages
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references auth.users(id);
grant update(hidden_at) on public.messages to authenticated;
drop policy if exists "Approved members read messages" on public.messages;
create policy "Approved members see visible messages; admins may review hidden"
 on public.messages for select to authenticated
 using (private.is_approved_member(team_id)
        and (hidden_at is null or private.is_admin(team_id)));
create policy "Team admins can hide or restore messages"
 on public.messages for update to authenticated
 using (private.is_admin(team_id))
 with check (private.is_admin(team_id));

create or replace function private.guard_blueprint_moderation()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
  if (to_jsonb(NEW) - 'hidden_at' - 'hidden_by')
       is distinct from (to_jsonb(OLD) - 'hidden_at' - 'hidden_by') then
    raise exception 'Moderation cannot alter original message content or authorship';
  end if;
  NEW.hidden_at = case when NEW.hidden_at is null then null else now() end;
  NEW.hidden_by = case when NEW.hidden_at is null then null else (select auth.uid()) end;
  return NEW;
end;
$$;
revoke all on function private.guard_blueprint_moderation() from public,anon,authenticated;
create trigger blueprint_moderate_message before update on public.messages
 for each row execute function private.guard_blueprint_moderation();

create table public.message_reports(
 id uuid primary key default gen_random_uuid(),
 team_id text not null references public.teams(id) on delete cascade,
 message_id uuid not null references public.messages(id) on delete cascade,
 reporter_id uuid not null references auth.users(id),
 reason text not null check (reason in ('inappropriate','bullying','privacy','other')),
 note text not null default '' check(char_length(note)<=500),
 status text not null default 'open' check (status in ('open','reviewed','dismissed')),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 unique(message_id,reporter_id)
);
create index blueprint_reports_team_status on public.message_reports(team_id,status,created_at desc);
alter table public.message_reports enable row level security;
revoke all on public.message_reports from public,anon;
grant select,insert,update(status) on public.message_reports to authenticated;
create policy "Reporters see own reports and admins see own-team queue"
 on public.message_reports for select to authenticated
 using (reporter_id=(select auth.uid()) or private.is_admin(team_id));
create policy "Approved members report visible team messages"
 on public.message_reports for insert to authenticated
 with check (
   reporter_id=(select auth.uid()) and status='open'
   and reviewed_by is null and reviewed_at is null
   and private.is_approved_member(team_id)
   and exists (select 1 from public.messages m where m.id=message_id and m.team_id=team_id and m.hidden_at is null)
 );
create policy "Admins review reports for their team"
 on public.message_reports for update to authenticated
 using(private.is_admin(team_id))
 with check(private.is_admin(team_id));

create or replace function private.guard_blueprint_report()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
 if TG_OP='UPDATE' then
   if (to_jsonb(NEW) - 'status' - 'reviewed_by' - 'reviewed_at')
       is distinct from (to_jsonb(OLD) - 'status' - 'reviewed_by' - 'reviewed_at') then
     raise exception 'Report evidence and author cannot be changed';
   end if;
   if NEW.status='open' then raise exception 'A reviewed report cannot be reopened from the client'; end if;
   NEW.reviewed_by=(select auth.uid());
   NEW.reviewed_at=now();
 end if;
 return NEW;
end;
$$;
revoke all on function private.guard_blueprint_report() from public,anon,authenticated;
create trigger blueprint_review_message_report
 before update on public.message_reports
 for each row execute function private.guard_blueprint_report();

-- Approved users can submit an engineering request; team Leads manage its status.
create table public.part_requests(
 id uuid primary key default gen_random_uuid(),
 team_id text not null references public.teams(id) on delete cascade,
 project_id uuid references public.projects(id) on delete set null,
 part_name text not null check(char_length(part_name) between 1 and 120),
 quantity integer not null check(quantity between 1 and 999),
 method text not null check(method in ('3d_print','cnc','laser','assembly','other')),
 notes text not null default '' check(char_length(notes)<=1000),
 status text not null default 'requested' check(status in ('requested','approved','in_progress','on_hold','completed')),
 requested_by uuid not null references auth.users(id),
 updated_by uuid references auth.users(id),
 updated_at timestamptz,
 created_at timestamptz not null default now()
);
create index blueprint_part_requests_team_status on public.part_requests(team_id,status,created_at desc);
alter table public.part_requests enable row level security;
revoke all on public.part_requests from public,anon;
grant select,insert,update(status) on public.part_requests to authenticated;
create policy "Approved team sees part requests"
 on public.part_requests for select to authenticated
 using(private.is_approved_member(team_id));
create policy "Approved team submits own part requests"
 on public.part_requests for insert to authenticated
 with check(private.is_approved_member(team_id) and requested_by=(select auth.uid()));
create policy "Leads update part request progress"
 on public.part_requests for update to authenticated
 using(private.is_manager(team_id))
 with check(private.is_manager(team_id));

create or replace function private.validate_blueprint_part()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
 if NEW.project_id is not null and not exists(
   select 1 from public.projects p where p.id=NEW.project_id and p.team_id=NEW.team_id
 ) then raise exception 'Project must be part of the selected robotics team'; end if;
 if TG_OP='UPDATE' then
  if (to_jsonb(NEW) - 'status' - 'updated_by' - 'updated_at')
     is distinct from (to_jsonb(OLD) - 'status' - 'updated_by' - 'updated_at') then
    raise exception 'Only progress status may be updated';
  end if;
  NEW.updated_at=now();
  NEW.updated_by=(select auth.uid());
 end if;
 return NEW;
end;
$$;
revoke all on function private.validate_blueprint_part() from public,anon,authenticated;
create trigger blueprint_validate_part before insert or update on public.part_requests
 for each row execute function private.validate_blueprint_part();

-- Linked CAD, drawings and engineering references. No unsafe uploads.
create table public.project_links(
 id uuid primary key default gen_random_uuid(),
 team_id text not null references public.teams(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete cascade,
 title text not null check(char_length(title) between 1 and 120),
 url text not null check(
   char_length(url)<=1000 and url ~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?(/[^[:space:]]*)?$'
 ),
 kind text not null check(kind in ('cad','drawing','document','code','other')),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create index blueprint_project_links_project on public.project_links(team_id,project_id,created_at desc);
alter table public.project_links enable row level security;
revoke all on public.project_links from public,anon;
grant select,insert,delete on public.project_links to authenticated;
create policy "Approved members read own-team engineering links"
 on public.project_links for select to authenticated
 using(private.is_approved_member(team_id));
create policy "Leads add engineering references"
 on public.project_links for insert to authenticated
 with check(private.is_manager(team_id) and created_by=(select auth.uid()));
create policy "Leads remove engineering references"
 on public.project_links for delete to authenticated
 using(private.is_manager(team_id));

create or replace function private.check_blueprint_link_team()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
 if not exists (select 1 from public.projects p
                where p.id=NEW.project_id and p.team_id=NEW.team_id) then
   raise exception 'CAD reference must belong to this team';
 end if;
 return NEW;
end;
$$;
revoke all on function private.check_blueprint_link_team() from public,anon,authenticated;
create trigger blueprint_project_links_team before insert on public.project_links
 for each row execute function private.check_blueprint_link_team();

-- Append-only activity records. No direct insert/update/delete privileges.
create table public.activity_events(
 id uuid primary key default gen_random_uuid(),
 team_id text not null references public.teams(id) on delete cascade,
 actor_id uuid not null references auth.users(id),
 action text not null,
 subject_type text not null,
 subject_id uuid not null,
 created_at timestamptz not null default now()
);
create index blueprint_activity_team_created on public.activity_events(team_id,created_at desc);
alter table public.activity_events enable row level security;
revoke all on public.activity_events from public,anon,authenticated;
grant select on public.activity_events to authenticated;
create policy "Team admins read activity history" on public.activity_events
 for select to authenticated using(private.is_admin(team_id));

create or replace function private.blueprint_audit_event()
returns trigger language plpgsql security definer set search_path=''
as $$
declare event_name text; actor uuid; team text; subject uuid; kind text;
begin
 actor=(select auth.uid());
 if actor is null then return NEW; end if;
 kind=TG_TABLE_NAME;
 if TG_TABLE_NAME='messages' and TG_OP='UPDATE' then
   if NEW.hidden_at is not distinct from OLD.hidden_at then return NEW; end if;
   event_name=case when NEW.hidden_at is null then 'message_restored' else 'message_hidden' end;
 elsif TG_TABLE_NAME='message_reports' then
   event_name=case when TG_OP='INSERT' then 'message_reported'
             when NEW.status='reviewed' then 'report_reviewed' else 'report_dismissed' end;
 elsif TG_TABLE_NAME='part_requests' then
   event_name=case when TG_OP='INSERT' then 'part_requested' else 'part_status_updated' end;
 elsif TG_TABLE_NAME='project_links' then
   event_name=case when TG_OP='INSERT' then 'reference_added' else 'reference_removed' end;
 else
   return NEW;
 end if;
 team=case when TG_OP='DELETE' then OLD.team_id else NEW.team_id end;
 subject=case when TG_OP='DELETE' then OLD.id else NEW.id end;
 insert into public.activity_events(team_id,actor_id,action,subject_type,subject_id)
 values(team,actor,event_name,kind,subject);
 return case when TG_OP='DELETE' then OLD else NEW end;
end;
$$;
revoke all on function private.blueprint_audit_event() from public,anon,authenticated;
create trigger blueprint_audit_moderation after update on public.messages
 for each row execute function private.blueprint_audit_event();
create trigger blueprint_audit_reports after insert or update on public.message_reports
 for each row execute function private.blueprint_audit_event();
create trigger blueprint_audit_parts after insert or update on public.part_requests
 for each row execute function private.blueprint_audit_event();
create trigger blueprint_audit_links after insert or delete on public.project_links
 for each row execute function private.blueprint_audit_event();

-- Client refreshes report queues after actions; no private reporter details
-- are published to a team-wide realtime channel.
alter publication supabase_realtime add table public.project_links;
alter publication supabase_realtime add table public.part_requests;
commit;
