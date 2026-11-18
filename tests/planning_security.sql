-- v6 database tests, run after synthetic team and moderator fixtures.
reset role;
select set_config('request.jwt.claim.sub','',false);

-- Lead adds catalog stock, attaches it to a BOM, and schedules a project milestone.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000009',false);
insert into public.inventory_items(id,team_id,name,sku,quantity_on_hand,reorder_at,unit,storage_location,created_by)
values('00000000-0000-4000-8000-000000000301','1810','M5 socket head bolt','BOLT-M5',8,12,'each','Drawer A',
      '00000000-0000-4000-8000-000000000009');
insert into public.project_bom_items(id,team_id,project_id,inventory_id,quantity_required,notes,created_by)
values('00000000-0000-4000-8000-000000000302','1810','00000000-0000-4000-8000-000000000200',
       '00000000-0000-4000-8000-000000000301',16,'Prototype bolts',
       '00000000-0000-4000-8000-000000000009');
insert into public.project_milestones(id,team_id,project_id,title,due_on,status,notes,created_by)
values('00000000-0000-4000-8000-000000000303','1810','00000000-0000-4000-8000-000000000200',
       'Verify mounting holes','2026-12-05','planned','Check geometry with CAD',
       '00000000-0000-4000-8000-000000000009');
update public.inventory_items set quantity_on_hand=14
 where id='00000000-0000-4000-8000-000000000301';
update public.project_bom_items set quantity_required=18
 where id='00000000-0000-4000-8000-000000000302';
update public.project_milestones set status='in_progress'
 where id='00000000-0000-4000-8000-000000000303';

do $$
begin
 if not exists(select 1 from public.inventory_items
     where id='00000000-0000-4000-8000-000000000301'
       and quantity_on_hand=14 and updated_at is not null and updated_by=(select auth.uid())) then
  raise exception 'Lead cannot update stock or audit metadata';
 end if;
 if not exists(select 1 from public.project_milestones
     where id='00000000-0000-4000-8000-000000000303'
       and status='in_progress' and updated_by=(select auth.uid())) then
  raise exception 'Lead cannot update milestone or audit metadata';
 end if;
end $$;

-- Ordinary approved teammate sees stock and progress but cannot write.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
do $$
declare n integer; denied boolean;
begin
 select count(*) into n from public.inventory_items;
 if n<>1 then raise exception 'Member cannot read own team stock'; end if;
 select count(*) into n from public.project_bom_items;
 if n<>1 then raise exception 'Member cannot read own team BOM'; end if;
 select count(*) into n from public.project_milestones;
 if n<>1 then raise exception 'Member cannot read own team milestone'; end if;

 denied:=false;
 begin
  update public.inventory_items set quantity_on_hand=999
    where id='00000000-0000-4000-8000-000000000301';
 exception when others then denied:=true;
 end;
 if not denied and exists(select 1 from public.inventory_items
    where id='00000000-0000-4000-8000-000000000301' and quantity_on_hand=999) then
  raise exception 'Ordinary member edited stock';
 end if;

 denied:=false;
 begin
  update public.project_bom_items set quantity_required=2
    where id='00000000-0000-4000-8000-000000000302';
 exception when others then denied:=true;
 end;
 if not denied and exists(select 1 from public.project_bom_items
    where id='00000000-0000-4000-8000-000000000302' and quantity_required=2) then
  raise exception 'Ordinary member edited BOM';
 end if;

 denied:=false;
 begin
  update public.project_milestones set status='done'
    where id='00000000-0000-4000-8000-000000000303';
 exception when others then denied:=true;
 end;
 if not denied and exists(select 1 from public.project_milestones
    where id='00000000-0000-4000-8000-000000000303' and status='done') then
  raise exception 'Ordinary member completed milestone';
 end if;
end $$;

-- Another fixture was approved by earlier security tests, so create an
-- independently pending applicant for this v6 permission check.
reset role;
select set_config('request.jwt.claim.sub','',false);
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000007');
insert into public.profiles(id,full_name) values
 ('00000000-0000-4000-8000-000000000007','Pending Inventory User');
insert into public.team_memberships(team_id,user_id,role,subgroup,status) values
 ('1810','00000000-0000-4000-8000-000000000007','member','Design','pending');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000007',false);

do $$
begin
 if (select count(*) from public.inventory_items)<>0 or
    (select count(*) from public.project_bom_items)<>0 or
    (select count(*) from public.project_milestones)<>0 then
  raise exception 'Pending user accessed stock, BOM or milestones';
 end if;
end $$;

-- Give fictional 9316 user a genuine Lead role for cross-team FK tampering tests.
reset role;
select set_config('request.jwt.claim.sub','',false);
update public.team_memberships set role='lead' where team_id='9316'
 and user_id='00000000-0000-4000-8000-000000000004';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',false);
insert into public.inventory_items(id,team_id,name,quantity_on_hand,created_by)
values('00000000-0000-4000-8000-000000000304','9316','Team 9316 gear',4,(select auth.uid()));
insert into public.projects(id,team_id,name,description,subgroup)
values('00000000-0000-4000-8000-000000000305','9316','9316 drive','Other team','Design');
do $$
declare denied boolean; n integer;
begin
 if (select count(*) from public.inventory_items)<>1 then
  raise exception 'Cross-team stock visibility leak';
 end if;
 if (select count(*) from public.project_bom_items)<>0 or
    (select count(*) from public.project_milestones)<>0 then
  raise exception 'Cross-team BOM/milestone leak';
 end if;

 denied:=false;
 begin
  insert into public.project_bom_items(team_id,project_id,inventory_id,quantity_required,created_by)
  values('9316','00000000-0000-4000-8000-000000000305',
        '00000000-0000-4000-8000-000000000301',2,(select auth.uid()));
 exception when others then denied:=true;
 end;
 if not denied then raise exception 'Cross-team inventory ID accepted by BOM'; end if;
 denied:=false;
 begin
  insert into public.project_bom_items(team_id,project_id,inventory_id,quantity_required,created_by)
  values('9316','00000000-0000-4000-8000-000000000200',
        '00000000-0000-4000-8000-000000000304',2,(select auth.uid()));
 exception when others then denied:=true;
 end;
 if not denied then raise exception 'Cross-team project ID accepted by BOM'; end if;
 denied:=false;
 begin
  insert into public.project_milestones(team_id,project_id,title,created_by)
  values('9316','00000000-0000-4000-8000-000000000200','Forged milestone',(select auth.uid()));
 exception when others then denied:=true;
 end;
 if not denied then raise exception 'Cross-team project ID accepted by milestone'; end if;
end $$;

-- Team 1810 Owner sees its team activity events, not 9316 entries.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $$
declare n integer;
begin
 select count(*) into n from public.activity_events where action in
  ('stock_added','stock_updated','bom_added','bom_updated','milestone_added','milestone_updated');
 if n<>6 then raise exception 'Expected 6 own-team planning audit events, got %',n; end if;
end $$;
reset role;
select 'Inventory, BOM, milestone and cross-team RLS checks passed' as result;
