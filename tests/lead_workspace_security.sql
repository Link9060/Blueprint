-- v8 feature regressions; exclusively fictional fixtures in disposable CI Postgres.
reset role;
select set_config('request.jwt.claim.sub','',false);

-- Unauthorized users cannot auto-join just because they have any Google account.
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000021','student@example.edu',now()),
 ('00000000-0000-4000-8000-000000000022','unverified@example.edu',null);
insert into auth.identities(user_id,provider,identity_data) values
 ('00000000-0000-4000-8000-000000000021','google','{"email":"student@example.edu"}'),
 ('00000000-0000-4000-8000-000000000022','google','{"email":"unverified@example.edu"}');
insert into public.profiles(id,full_name) values
 ('00000000-0000-4000-8000-000000000021','Verified Fixture'),
 ('00000000-0000-4000-8000-000000000022','Unverified Fixture');

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000021',false);
do $$
declare denied boolean:=false;
begin
 begin
  insert into public.team_memberships(team_id,user_id,role,subgroup,status)
  values('1810',(select auth.uid()),'member','Design','approved');
 exception when others then denied:=true;
 end;
 if not denied then raise exception 'Arbitrary Google user entered a team without domain approval'; end if;
end $$;
reset role;
insert into private.blueprint_google_domains(team_id,domain) values ('1810','example.edu');

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000021',false);
insert into public.team_memberships(team_id,user_id,role,subgroup,status)
 values('1810',(select auth.uid()),'member','Design','approved');
do $$
declare denied boolean:=false; n integer;
begin
 select count(*) into n from public.team_memberships
 where user_id=(select auth.uid()) and team_id='1810' and role='member' and status='approved';
 if n<>1 then raise exception 'Verified Google user did not enter as basic Member';end if;
 begin
  insert into public.team_memberships(team_id,user_id,role,subgroup,status)
   values('9316',(select auth.uid()),'member','Design','approved');
 exception when others then denied:=true;
 end;
 if not denied then raise exception 'Verified Google user joined unallowlisted team';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000022',false);
do $$
declare denied boolean:=false;
begin
 begin
  insert into public.team_memberships(team_id,user_id,role,subgroup,status)
   values('1810',(select auth.uid()),'member','Design','approved');
 exception when others then denied:=true;
 end;
 if not denied then raise exception 'Unverified Google email entered team';end if;
end $$;

-- Ordinary member can file a role request, but cannot resolve their own.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
insert into public.role_requests(id,team_id,requester_id,requested_role,reason)
 values('00000000-0000-4000-8000-000000000301','1810',(select auth.uid()),'lead','Mechanical support');
do $$
declare blocked boolean:=false; n integer;
begin
 select count(*) into n from public.role_requests;
 if n<>1 then raise exception 'Member cannot see own role request';end if;
 begin
  update public.role_requests set status='approved' where id='00000000-0000-4000-8000-000000000301';
 exception when others then blocked:=true;
 end;
 if not blocked then
   select count(*) into n from public.role_requests where id='00000000-0000-4000-8000-000000000301' and status='approved';
   if n>0 then raise exception 'Member approved own role request';end if;
 end if;
end $$;

-- A lead sees the report queue, moderates messages, removes content, and delegates lower roles.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000009',false);
insert into public.announcements(id,team_id,title,body,author_id)
 values('00000000-0000-4000-8000-000000000302','1810','Lead test post','Removable', (select auth.uid()));
insert into public.build_logs(id,team_id,title,body,author_id)
 values('00000000-0000-4000-8000-000000000303','1810','Lead test log','Removable',(select auth.uid()));
delete from public.announcements where id='00000000-0000-4000-8000-000000000302';
delete from public.build_logs where id='00000000-0000-4000-8000-000000000303';
do $$
declare n integer;
begin
 select count(*) into n from public.activity_events where action in ('announcement_removed','build_log_removed');
 if n<>2 then raise exception 'Lead content removals were not audited, saw %',n;end if;
 select count(*) into n from public.role_requests where status='pending';
 if n<>1 then raise exception 'Lead could not see role request queue';end if;
end $$;

-- Lead can promote ordinary member to Lead, not Admin/Owner/self.
do $$
declare blocked boolean:=false;
begin
 begin
  update public.team_memberships set role='admin'
   where team_id='1810' and user_id='00000000-0000-4000-8000-000000000003';
 exception when others then blocked:=true;
 end;
 if not blocked then raise exception 'Lead promoted a member above their role';end if;
 blocked:=false;
 begin
  update public.team_memberships set role='admin'
   where team_id='1810' and user_id=(select auth.uid());
 exception when others then blocked:=true;
 end;
 if not blocked then raise exception 'Lead self-elevated';end if;
end $$;
update public.team_memberships set role='lead'
 where team_id='1810' and user_id='00000000-0000-4000-8000-000000000003';
update public.role_requests set status='approved'
 where id='00000000-0000-4000-8000-000000000301';

-- Another team cannot read private role requests or content deletion audit.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',false);
do $$
declare n integer;
begin
 select count(*) into n from public.role_requests;
 if n<>0 then raise exception 'Role request leaked across teams';end if;
 select count(*) into n from public.activity_events where team_id='1810';
 if n<>0 then raise exception 'Other team accessed 1810 audit history';end if;
end $$;
reset role;
select 'Blueprint v8 security checks passed' as result;
