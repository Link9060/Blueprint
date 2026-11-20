-- Blueprint v8: lead moderation, safe role delegation, content removal,
-- self-service role requests and optional VERIFIED-domain Google onboarding.
-- Domain allowlist intentionally starts EMPTY: never grant student team access
-- simply because an arbitrary Google account can authenticate.
begin;

-- Lead+ can delete team content. Preserve metadata in append-only activity.
grant delete on public.announcements, public.build_logs to authenticated;
create policy "Team leads delete announcements" on public.announcements
 for delete to authenticated using(private.is_manager(team_id));
create policy "Team leads delete build logs" on public.build_logs
 for delete to authenticated using(private.is_manager(team_id));

create or replace function private.blueprint_content_deleted()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if (select auth.uid()) is not null then
  insert into public.activity_events(team_id,actor_id,action,subject_type,subject_id)
  values(OLD.team_id,(select auth.uid()),
         case when TG_TABLE_NAME='announcements' then 'announcement_removed' else 'build_log_removed' end,
         TG_TABLE_NAME,OLD.id);
 end if;
 return OLD;
end;
$$;
revoke all on function private.blueprint_content_deleted() from public,anon,authenticated;
drop trigger if exists blueprint_announcement_removed on public.announcements;
create trigger blueprint_announcement_removed
 after delete on public.announcements for each row execute function private.blueprint_content_deleted();
drop trigger if exists blueprint_log_removed on public.build_logs;
create trigger blueprint_log_removed
 after delete on public.build_logs for each row execute function private.blueprint_content_deleted();

-- Moderation should be available to Leads/Mentors/Captains/Admins/Owners,
-- while ordinary members may report but may not review private reports.
drop policy if exists "Approved members see visible messages; admins may review hidden" on public.messages;
create policy "Approved members see messages and managers see hidden" on public.messages
 for select to authenticated using(private.is_approved_member(team_id)
  and (hidden_at is null or private.is_manager(team_id)));
drop policy if exists "Team admins can hide or restore messages" on public.messages;
create policy "Team leads can hide or restore messages" on public.messages
 for update to authenticated using(private.is_manager(team_id))
 with check(private.is_manager(team_id));

drop policy if exists "Reporters see own reports and admins see own-team queue" on public.message_reports;
create policy "Reporters see own reports and team leads see team queue" on public.message_reports
 for select to authenticated using(reporter_id=(select auth.uid()) or private.is_manager(team_id));
drop policy if exists "Admins review reports for their team" on public.message_reports;
create policy "Team leads review reports for their team" on public.message_reports
 for update to authenticated using(private.is_manager(team_id))
 with check(private.is_manager(team_id));
drop policy if exists "Team admins read activity history" on public.activity_events;
create policy "Team leads read team activity" on public.activity_events
 for select to authenticated using(private.is_manager(team_id));

-- A manager may change another member's role, but never their own or
-- the protected Owner tier; a lower role cannot elevate above themselves.
-- Keep existing Owner protection trigger and self-subgroup protection.
create or replace function private.blueprint_role_rank(p_role text)
returns integer language sql immutable set search_path=''
as $$
 select case p_role when 'member' then 1 when 'lead' then 2
 when 'mentor' then 3 when 'captain' then 3 when 'admin' then 4
 when 'owner' then 5 else 0 end;
$$;
revoke all on function private.blueprint_role_rank(text) from public,anon;
grant execute on function private.blueprint_role_rank(text) to authenticated;

create or replace function private.guard_delegated_membership()
returns trigger language plpgsql security invoker set search_path=''
as $$
declare actor_role text; actor_rank integer; old_rank integer; new_rank integer;
begin
 if (select auth.uid()) is null then return NEW; end if;
 if NEW.team_id is distinct from OLD.team_id or NEW.user_id is distinct from OLD.user_id
    or NEW.created_at is distinct from OLD.created_at then
  raise exception 'Membership identity is immutable';
 end if;
 if NEW.status is distinct from OLD.status and not private.is_admin(OLD.team_id) then
  raise exception 'Only administrators can change membership status';
 end if;
 if NEW.role is distinct from OLD.role then
  if NEW.user_id=(select auth.uid()) then raise exception 'You cannot change your own role'; end if;
  if OLD.role='owner' or NEW.role='owner' then raise exception 'Owner changes require trusted administration'; end if;
  if OLD.status<>'approved' or NEW.status<>'approved' then
    if not private.is_admin(OLD.team_id) then raise exception 'Only administrators can review pending memberships'; end if;
  end if;
  select m.role into actor_role from public.team_memberships m
   where m.team_id=OLD.team_id and m.user_id=(select auth.uid()) and m.status='approved';
  actor_rank=private.blueprint_role_rank(actor_role);
  old_rank=private.blueprint_role_rank(OLD.role);
  new_rank=private.blueprint_role_rank(NEW.role);
  if actor_rank<2 or old_rank>=actor_rank or new_rank>actor_rank then
    raise exception 'Role delegation exceeds your authority';
  end if;
 end if;
 return NEW;
end;
$$;
revoke all on function private.guard_delegated_membership() from public,anon,authenticated;
drop trigger if exists blueprint_guard_delegated_membership on public.team_memberships;
create trigger blueprint_guard_delegated_membership before update on public.team_memberships
 for each row execute function private.guard_delegated_membership();

create policy "Team leads delegate roles within their tier" on public.team_memberships
 for update to authenticated
 using(private.is_manager(team_id)) with check(private.is_manager(team_id));

-- Team membership read for Leads already follows approved-member policy.
-- Self-service requests carry no privileged role change; managers decide.
create table if not exists public.role_requests (
 id uuid primary key default gen_random_uuid(),
 team_id text not null,
 requester_id uuid not null,
 requested_role text not null check(requested_role in ('lead','mentor','captain','admin')),
 reason text not null default '' check(char_length(reason)<=500),
 status text not null default 'pending' check(status in ('pending','approved','declined')),
 decided_by uuid references auth.users(id),
 decided_at timestamptz,
 created_at timestamptz not null default now(),
 constraint blueprint_role_req_membership foreign key(team_id,requester_id)
  references public.team_memberships(team_id,user_id) on delete cascade
);
create index if not exists blueprint_role_requests_team_idx on public.role_requests(team_id,status,created_at desc);
create unique index if not exists blueprint_role_requests_single_pending
 on public.role_requests(team_id,requester_id) where status='pending';
alter table public.role_requests enable row level security;
revoke all on public.role_requests from public,anon;
grant select,insert,update(status) on public.role_requests to authenticated;
create policy "Requesters and managers view role requests" on public.role_requests
 for select to authenticated
 using(requester_id=(select auth.uid()) or private.is_manager(team_id));
create policy "Members request an elevated role" on public.role_requests
 for insert to authenticated
 with check(requester_id=(select auth.uid())
  and status='pending' and decided_at is null and decided_by is null
  and private.is_approved_member(team_id));
create policy "Team leads decide role requests" on public.role_requests
 for update to authenticated using(private.is_manager(team_id))
 with check(private.is_manager(team_id));
create or replace function private.guard_blueprint_role_request()
returns trigger language plpgsql security invoker set search_path=''
as $$
declare manager_role text;
begin
 if TG_OP='INSERT' then
  if not exists(select 1 from public.team_memberships m where m.team_id=NEW.team_id
      and m.user_id=NEW.requester_id and m.status='approved') then
   raise exception 'Only an approved member can request a role';
  end if;
 elsif TG_OP='UPDATE' then
  if (to_jsonb(NEW)-'status'-'decided_by'-'decided_at')
     is distinct from (to_jsonb(OLD)-'status'-'decided_by'-'decided_at') then
   raise exception 'Role request details cannot be changed';
  end if;
  if OLD.status<>'pending' or NEW.status not in ('approved','declined') then
   raise exception 'Role request is already decided';
  end if;
  if NEW.requester_id=(select auth.uid()) then
   raise exception 'You cannot approve your own role request';
  end if;
  select m.role into manager_role from public.team_memberships m
    where m.team_id=NEW.team_id and m.user_id=(select auth.uid()) and m.status='approved';
  if private.blueprint_role_rank(NEW.requested_role)>private.blueprint_role_rank(manager_role) then
    raise exception 'Requested role exceeds your authority';
  end if;
  NEW.decided_by=(select auth.uid());NEW.decided_at=now();
 end if;
 return NEW;
end;
$$;
revoke all on function private.guard_blueprint_role_request() from public,anon,authenticated;
drop trigger if exists blueprint_role_request_guard on public.role_requests;
create trigger blueprint_role_request_guard before insert or update on public.role_requests
 for each row execute function private.guard_blueprint_role_request();

-- Google entry is only permitted after a trusted administrator supplies
-- the school email domains for each robotics team.
create table if not exists private.blueprint_google_domains (
 team_id text not null references public.teams(id) on delete cascade,
 domain text not null check(domain=lower(domain) and domain ~ '^[a-z0-9.-]+[.][a-z]{2,}$'),
 primary key(team_id,domain)
);
alter table private.blueprint_google_domains enable row level security;
revoke all on private.blueprint_google_domains from public,anon,authenticated;
create or replace function private.blueprint_google_join_allowed(p_team text)
returns boolean language sql stable security definer set search_path=''
as $$
 select (select auth.uid()) is not null and exists(
   select 1 from auth.users u
   join auth.identities i on i.user_id=u.id and i.provider='google'
   join private.blueprint_google_domains d on d.team_id=p_team
   where u.id=(select auth.uid()) and u.email_confirmed_at is not null
   and lower(u.email)=lower(i.identity_data->>'email')
   and split_part(lower(u.email),'@',2)=d.domain
 );
$$;
revoke all on function private.blueprint_google_join_allowed(text) from public,anon;
grant execute on function private.blueprint_google_join_allowed(text) to authenticated;
create policy "Verified school Google account joins as basic member" on public.team_memberships
 for insert to authenticated
 with check(user_id=(select auth.uid()) and role='member' and status='approved'
  and private.blueprint_google_join_allowed(team_id));
commit;
