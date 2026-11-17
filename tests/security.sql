-- Test data is completely fictional and local to GitHub Actions' postgres service.
insert into auth.users(id) values
 ('00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000002'),
 ('00000000-0000-4000-8000-000000000003'),
 ('00000000-0000-4000-8000-000000000004'),
 ('00000000-0000-4000-8000-000000000005');

insert into public.profiles (id,full_name) values
 ('00000000-0000-4000-8000-000000000001','Test Admin'),
 ('00000000-0000-4000-8000-000000000002','Test Lead'),
 ('00000000-0000-4000-8000-000000000003','Test Member'),
 ('00000000-0000-4000-8000-000000000004','Other Team'),
 ('00000000-0000-4000-8000-000000000005','Pending Member');

insert into public.team_memberships(team_id,user_id,role,subgroup,status) values
 ('1810','00000000-0000-4000-8000-000000000001','admin','Design','approved'),
 ('1810','00000000-0000-4000-8000-000000000002','lead','Mechanical','approved'),
 ('1810','00000000-0000-4000-8000-000000000003','member','Programming','approved'),
 ('9316','00000000-0000-4000-8000-000000000004','member','Electrical','approved'),
 ('1810','00000000-0000-4000-8000-000000000005','member','Design','pending');

insert into public.tasks(id,team_id,title,subgroup,status,assigned_to,created_by) values
 ('00000000-0000-4000-8000-000000000101','1810','Test assigned task','Programming','todo','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002'),
 ('00000000-0000-4000-8000-000000000102','9316','Secret other-team task','Electrical','todo','00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000004');

set role authenticated;

-- Member should see own team task, own-team profiles and no pending profile.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
do $$
declare
 n integer;
 blocked boolean := false;
begin
 select count(*) into n from public.tasks;
 if n <> 1 then raise exception 'Team member saw % tasks instead of 1',n; end if;
 select count(*) into n from public.profiles;
 if n <> 3 then raise exception 'Member saw % profiles instead of 3 approved teammates',n; end if;
 select count(*) into n from public.team_memberships;
 if n <> 3 then raise exception 'Member saw % memberships instead of 3',n; end if;
 -- Assigned member may update task status.
 update public.tasks set status='done'
 where id='00000000-0000-4000-8000-000000000101';
 select count(*) into n from public.tasks
 where id='00000000-0000-4000-8000-000000000101' and status='done';
 if n <> 1 then raise exception 'Assigned member could not update task status'; end if;
 -- Must not edit priority even though they can update their own task's status.
 begin
  update public.tasks set priority='High'
  where id='00000000-0000-4000-8000-000000000101';
 exception when others then blocked := true;
 end;
 if not blocked then raise exception 'Member improperly changed task priority'; end if;
end $$;

-- Pending member sees no tasks or protected member directory records.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',false);
do $$
declare n integer;
begin
 select count(*) into n from public.tasks;
 if n <> 0 then raise exception 'Pending member saw % private tasks',n; end if;
 select count(*) into n from public.profiles;
 if n <> 1 then raise exception 'Pending member saw other student profiles'; end if;
end $$;

-- Team admin can review pending users and their profiles, but not other team tasks.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $$
declare n integer;
begin
 select count(*) into n from public.team_memberships where status='pending';
 if n <> 1 then raise exception 'Admin cannot see pending membership'; end if;
 select count(*) into n from public.profiles;
 if n <> 4 then raise exception 'Admin should see approved and pending own-team profiles, saw %',n; end if;
 select count(*) into n from public.tasks;
 if n <> 1 then raise exception 'Admin saw other-team task'; end if;
 update public.team_memberships set status='approved'
 where team_id='1810' and user_id='00000000-0000-4000-8000-000000000005';
 select count(*) into n from public.team_memberships
 where user_id='00000000-0000-4000-8000-000000000005' and status='approved';
 if n <> 1 then raise exception 'Admin could not approve member'; end if;
end $$;

-- Cross-team user is isolated from 1810 records and cannot modify them.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',false);
do $$
declare
 n integer;
 blocked boolean := false;
begin
 select count(*) into n from public.tasks;
 if n <> 1 then raise exception 'Cross-team task isolation failed'; end if;
 select count(*) into n from public.profiles;
 if n <> 1 then raise exception 'Cross-team profile isolation failed'; end if;
 begin
  insert into public.messages(team_id,channel,body,author_id)
  values('1810','general','Unauthorized message','00000000-0000-4000-8000-000000000004');
 exception when others then blocked := true;
 end;
 if not blocked then raise exception 'Cross-team message was accepted'; end if;
end $$;

reset role;
select 'Blueprint RLS checks passed' as result;
