-- Blueprint v7: task blockers, cycle prevention, event preparation and cross-team RLS.
-- Depends on preceding fictional Postgres fixture tests and uses no live data.
reset role;
select set_config('request.jwt.claim.sub','',false);

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000009',false);
insert into public.tasks(id,team_id,title,subgroup,status,assigned_to,created_by) values
 ('00000000-0000-4000-8000-000000000401','1810','Dependent CAD assembly','Design','todo','00000000-0000-4000-8000-000000000003',(select auth.uid())),
 ('00000000-0000-4000-8000-000000000402','1810','Verify frame geometry','Design','todo','00000000-0000-4000-8000-000000000009',(select auth.uid())),
 ('00000000-0000-4000-8000-000000000403','1810','Measure mockup','Mechanical','todo','00000000-0000-4000-8000-000000000009',(select auth.uid()));
insert into public.task_dependencies(team_id,task_id,prerequisite_id,created_by) values
 ('1810','00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000402',(select auth.uid())),
 ('1810','00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000403',(select auth.uid()));

do $$
declare rejected boolean:=false;
begin
 begin
  insert into public.task_dependencies(team_id,task_id,prerequisite_id,created_by)
   values('1810','00000000-0000-4000-8000-000000000403','00000000-0000-4000-8000-000000000401',(select auth.uid()));
 exception when others then rejected:=true;
 end;
 if not rejected then raise exception 'Transitive dependency cycle accepted'; end if;
 rejected:=false;
 begin
  insert into public.task_dependencies(team_id,task_id,prerequisite_id,created_by)
   values('1810','00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000401',(select auth.uid()));
 exception when others then rejected:=true;
 end;
 if not rejected then raise exception 'Self-dependency accepted'; end if;
end $$;

-- The member is assigned to 401 and should be able to complete it only
-- when prerequisite 402 (and upstream 403) is done.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
do $$
declare blocked boolean:=false;
begin
 begin
  update public.tasks set status='done' where id='00000000-0000-4000-8000-000000000401';
 exception when others then blocked:=true;
 end;
 if not blocked then raise exception 'Member completed blocked dependent task'; end if;
end $$;

-- Lead completes prerequisite chain.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000009',false);
update public.tasks set status='done' where id='00000000-0000-4000-8000-000000000403';
update public.tasks set status='done' where id='00000000-0000-4000-8000-000000000402';
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
update public.tasks set status='done' where id='00000000-0000-4000-8000-000000000401';
do $$
declare blocked boolean:=false;
begin
 if not exists(select 1 from public.tasks where id='00000000-0000-4000-8000-000000000401' and status='done') then
  raise exception 'Member could not complete unblocked task'; end if;
end $$;

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000009',false);
do $$
declare blocked boolean:=false;
begin
 begin
  update public.tasks set status='todo' where id='00000000-0000-4000-8000-000000000402';
 exception when others then blocked:=true;
 end;
 if not blocked then raise exception 'Reopening prerequisite left completed dependent inconsistent'; end if;
end $$;

insert into public.event_checklist_items(id,team_id,event_id,category,title,notes,assigned_to,created_by)
values('00000000-0000-4000-8000-000000000411','1810','00000000-0000-4000-8000-000000000111',
 'packing','Pack spare motor controllers','Demo only; verify actual inventory',
 '00000000-0000-4000-8000-000000000003',(select auth.uid()));
-- An assigned member can tick their own checklist item but not rewrite it.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
update public.event_checklist_items set status='done' where id='00000000-0000-4000-8000-000000000411';
do $$
declare blocked boolean:=false;
begin
 if not exists(select 1 from public.event_checklist_items
    where id='00000000-0000-4000-8000-000000000411' and status='done'
    and updated_by=(select auth.uid())) then raise exception 'Assigned checklist update failed'; end if;
 begin
  update public.event_checklist_items set title='Forged title' where id='00000000-0000-4000-8000-000000000411';
 exception when others then blocked:=true;
 end;
 if not blocked then raise exception 'Member changed checklist title'; end if;
 blocked:=false;
 begin
  insert into public.event_checklist_items(team_id,event_id,title,created_by)
   values('1810','00000000-0000-4000-8000-000000000111','Unauthorized checklist',(select auth.uid()));
 exception when others then blocked:=true;
 end;
 if not blocked then raise exception 'Member inserted checklist'; end if;
end $$;

-- Pending user sees none of the new records.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000007',false);
do $$
begin
 if (select count(*) from public.task_dependencies)<>0 or
    (select count(*) from public.event_checklist_items)<>0 then
  raise exception 'Pending user saw dependency or checklist'; end if;
end $$;

-- Team 9316 manager cannot link to 1810 tasks or events.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',false);
insert into public.events(id,team_id,title,starts_at,created_by)
values('00000000-0000-4000-8000-000000000412','9316','Competition planning','2026-12-20 17:00+00',(select auth.uid()));
do $$
declare blocked boolean:=false;
begin
 if (select count(*) from public.task_dependencies)<>0 or
    (select count(*) from public.event_checklist_items)<>0 then
  raise exception 'Cross-team read exposed private planning data'; end if;
 begin
  insert into public.event_checklist_items(team_id,event_id,title,created_by)
   values('9316','00000000-0000-4000-8000-000000000111','Cross-team fake',(select auth.uid()));
 exception when others then blocked:=true;
 end;
 if not blocked then raise exception 'Cross-team checklist event accepted'; end if;
 blocked:=false;
 begin
  insert into public.task_dependencies(team_id,task_id,prerequisite_id,created_by)
   values('9316','00000000-0000-4000-8000-000000000102',
          '00000000-0000-4000-8000-000000000402',(select auth.uid()));
 exception when others then blocked:=true;
 end;
 if not blocked then raise exception 'Cross-team task reference accepted'; end if;
end $$;

-- Privileged audit remains visible only to team 1810 administrators.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $$
begin
 if not exists(select 1 from public.activity_events where action='dependency_added' and team_id='1810')
 or not exists(select 1 from public.activity_events where action='checklist_updated' and team_id='1810')
 then raise exception 'Planning audit entries missing'; end if;
end $$;

reset role;
select 'v7 dependency graph, event preparation and RLS passed' as result;
