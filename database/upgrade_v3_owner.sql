-- Owner is a verified, team-scoped role above Admin.
-- Only an authorized database administrator can assign or remove it.
begin;
alter table public.team_memberships drop constraint if exists team_memberships_role_check;
alter table public.team_memberships add constraint team_memberships_role_check
 check (role in ('member','lead','mentor','captain','admin','owner'));

create or replace function private.is_manager(p_team text)
returns boolean language sql stable security definer set search_path = ''
as $$
 select (select auth.uid()) is not null and exists (
   select 1 from public.team_memberships m
   where m.team_id=p_team and m.user_id=(select auth.uid())
     and m.status='approved' and m.role in ('lead','mentor','captain','admin','owner')
 );
$$;
create or replace function private.is_admin(p_team text)
returns boolean language sql stable security definer set search_path = ''
as $$
 select (select auth.uid()) is not null and exists (
   select 1 from public.team_memberships m
   where m.team_id=p_team and m.user_id=(select auth.uid())
     and m.status='approved' and m.role in ('admin','owner')
 );
$$;
create or replace function private.protect_owner_membership()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
 if TG_OP = 'INSERT' then
   if NEW.role='owner' and (select auth.uid()) is not null then
     raise exception 'Owner privileges require verified administrator bootstrap';
   end if;
 elsif TG_OP = 'UPDATE' then
   if (OLD.role='owner' or NEW.role='owner') and (select auth.uid()) is not null then
     raise exception 'Owner membership can be edited only through trusted administration';
   end if;
 end if;
 return NEW;
end;
$$;
revoke all on function private.protect_owner_membership() from public, anon, authenticated;
drop trigger if exists blueprint_protect_owner_membership on public.team_memberships;
create trigger blueprint_protect_owner_membership
 before insert or update on public.team_memberships
 for each row execute function private.protect_owner_membership();
commit;
