-- Blueprint v4: edit build logs and calendar events, plus safe member profiles.
-- All work edits require Lead/Mentor/Captain/Admin/Owner membership on that team.
begin;

grant update(title,body,subgroup) on public.build_logs to authenticated;
create policy "Team leads edit build logs" on public.build_logs
  for update to authenticated
  using (private.is_manager(team_id))
  with check (private.is_manager(team_id));

-- Events already have manager-scoped update policy/column grants from v2.
-- Keep creation/author identity immutable in the browser. Provide edit attribution.
alter table public.build_logs
  add column if not exists edited_at timestamptz,
  add column if not exists edited_by uuid references auth.users(id);
alter table public.events
  add column if not exists edited_at timestamptz,
  add column if not exists edited_by uuid references auth.users(id);

create or replace function private.stamp_blueprint_edit()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  NEW.edited_at = now();
  NEW.edited_by = (select auth.uid());
  return NEW;
end;
$$;
revoke all on function private.stamp_blueprint_edit() from public, anon, authenticated;
create trigger stamp_build_log_edit before update on public.build_logs
  for each row execute function private.stamp_blueprint_edit();
create trigger stamp_event_edit before update on public.events
  for each row execute function private.stamp_blueprint_edit();

-- Public teammate profiles show only non-sensitive, user-chosen details.
-- Email addresses remain in Auth, not shared in team directories.
alter table public.profiles
  add column if not exists headline text not null default ''
    check (char_length(headline) <= 80),
  add column if not exists bio text not null default ''
    check (char_length(bio) <= 300),
  add column if not exists avatar_color text not null default 'slate'
    check (avatar_color in ('slate','blue','sage','amber','violet','rose'));
grant update(full_name,headline,bio,avatar_color) on public.profiles to authenticated;

-- Members may change their OWN team subgroup, never their role/status.
-- Keep the owner guard intact except for verified Owner changing their own subgroup.
create policy "Approved members choose own subgroup" on public.team_memberships
  for update to authenticated
  using (user_id = (select auth.uid()) and status = 'approved')
  with check (user_id = (select auth.uid()) and status = 'approved');

create or replace function private.guard_self_membership_change()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
 if (select auth.uid()) is not null
    and OLD.user_id = (select auth.uid())
    and not private.is_admin(OLD.team_id)
    and (to_jsonb(NEW) - 'subgroup') is distinct from (to_jsonb(OLD) - 'subgroup') then
    raise exception 'You can only edit your own subgroup';
 end if;
 return NEW;
end;
$$;
revoke all on function private.guard_self_membership_change() from public, anon, authenticated;
create trigger blueprint_guard_self_membership_change
  before update on public.team_memberships
  for each row execute function private.guard_self_membership_change();

create or replace function private.protect_owner_membership()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
 if TG_OP = 'INSERT' then
  if NEW.role='owner' and (select auth.uid()) is not null then
   raise exception 'Owner privileges require verified administrator bootstrap';
  end if;
 elsif TG_OP = 'UPDATE' then
  if (OLD.role='owner' or NEW.role='owner')
     and (select auth.uid()) is not null
     and not (
       OLD.role='owner' and NEW.role='owner'
       and OLD.user_id=(select auth.uid())
       and (to_jsonb(NEW) - 'subgroup') is not distinct from (to_jsonb(OLD) - 'subgroup')
     ) then
     raise exception 'Owner membership can be edited only through trusted administration';
  end if;
 end if;
 return NEW;
end;
$$;
revoke all on function private.protect_owner_membership() from public, anon, authenticated;
commit;
