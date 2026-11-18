-- Tests run after standard security and editing fixtures.
reset role;
select set_config('request.jwt.claim.sub','',false);

-- An actual Lead can create a project and attach CAD references.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000009',false);
insert into public.projects(id,team_id,name,description,subgroup)
 values('00000000-0000-4000-8000-000000000200','1810','CAD revision test','Prototype assembly','Design');
insert into public.project_links(id,team_id,project_id,title,url,kind,created_by)
 values('00000000-0000-4000-8000-000000000201','1810','00000000-0000-4000-8000-000000000200',
 'CAD v2','https://cad.example.org/rev2','cad','00000000-0000-4000-8000-000000000009');
insert into public.messages(id,team_id,channel,body,author_id)
 values('00000000-0000-4000-8000-000000000210','1810','general','Fixture message for moderation','00000000-0000-4000-8000-000000000009');

-- A Member may report content and request a part but cannot manage the queue.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
insert into public.message_reports(id,team_id,message_id,reporter_id,reason,note)
 values('00000000-0000-4000-8000-000000000211','1810','00000000-0000-4000-8000-000000000210',
 '00000000-0000-4000-8000-000000000003','other','Review this message');
insert into public.part_requests(id,team_id,project_id,part_name,quantity,method,notes,requested_by)
 values('00000000-0000-4000-8000-000000000220','1810','00000000-0000-4000-8000-000000000200',
 'Chassis bracket',2,'3d_print','Fit check','00000000-0000-4000-8000-000000000003');
do $$
declare n integer; denied boolean:=false;
begin
 select count(*) into n from public.message_reports;
 if n<>1 then raise exception 'Reporter cannot see own report'; end if;
 select count(*) into n from public.activity_events;
 if n<>0 then raise exception 'Activity log exposed to member'; end if;
 begin
  update public.part_requests set status='completed'
  where id='00000000-0000-4000-8000-000000000220';
 exception when others then denied:=true;
 end;
 if not denied then
  select count(*) into n from public.part_requests
   where id='00000000-0000-4000-8000-000000000220' and status='completed';
  if n>0 then raise exception 'Member marked part completed'; end if;
 end if;
 denied:=false;
 begin
  insert into public.project_links(team_id,project_id,title,url,kind,created_by)
  values('1810','00000000-0000-4000-8000-000000000200',
         'Unauthorized link','https://cad.example.org/secret','cad',(select auth.uid()));
 exception when others then denied:=true;
 end;
 if not denied then raise exception 'Member inserted CAD reference'; end if;
end $$;

-- A team administrator can review and moderate only their own team.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',false);
update public.message_reports set status='reviewed'
 where id='00000000-0000-4000-8000-000000000211';
update public.messages set hidden_at=now()
 where id='00000000-0000-4000-8000-000000000210';
do $$
declare n integer;
begin
 select count(*) into n from public.activity_events;
 if n<3 then raise exception 'Moderator audit history missing'; end if;
 if not exists(select 1 from public.message_reports
    where reviewed_by=(select auth.uid()) and reviewed_at is not null and status='reviewed')
 then raise exception 'Report review attribution missing'; end if;
 if not exists(select 1 from public.messages
    where hidden_at is not null and hidden_by=(select auth.uid()))
 then raise exception 'Moderator could not hide message'; end if;
end $$;

-- Hidden content is not returned to ordinary members even with a direct query.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
do $$
declare n integer;
begin
 select count(*) into n from public.messages
  where id='00000000-0000-4000-8000-000000000210';
 if n<>0 then raise exception 'Hidden message exposed to Member'; end if;
end $$;

-- Another team cannot read reports or use another team's project id.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',false);
do $$
declare n integer; denied boolean:=false;
begin
 select count(*) into n from public.message_reports;
 if n<>0 then raise exception 'Cross-team message report leaked'; end if;
 select count(*) into n from public.project_links;
 if n<>0 then raise exception 'Cross-team CAD reference leaked'; end if;
 select count(*) into n from public.activity_events;
 if n<>0 then raise exception 'Cross-team audit history leaked'; end if;
 begin
  insert into public.part_requests(team_id,project_id,part_name,quantity,method,requested_by)
  values('9316','00000000-0000-4000-8000-000000000200','Stolen project',1,'other',(select auth.uid()));
 exception when others then denied:=true;
 end;
 if not denied then raise exception 'Cross-team project ID accepted'; end if;
end $$;

-- Lead advances manufacture status; audit includes the change.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000009',false);
update public.part_requests set status='approved'
 where id='00000000-0000-4000-8000-000000000220';
do $$
begin
 if not exists(select 1 from public.part_requests
  where id='00000000-0000-4000-8000-000000000220'
    and status='approved' and updated_by=(select auth.uid())) then
  raise exception 'Lead could not approve part request'; end if;
end $$;
reset role;
select 'Moderation, engineering, and audit RLS passed' as result;
