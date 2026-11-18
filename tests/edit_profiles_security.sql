-- Follow the ordinary v1-v3 security checks. Authoritative SQL execution
-- is simulated with distinct JWT sub claims and RLS enforced by Postgres.
reset role;
select set_config('request.jwt.claim.sub','',false);

-- Approved Captain (a former Lead in this fixture) creates editable records.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
insert into public.build_logs(id,team_id,title,body,subgroup,author_id) values
 ('00000000-0000-4000-8000-000000000110','1810','Assembly check','Original entry','Mechanical','00000000-0000-4000-8000-000000000002');
insert into public.events(id,team_id,title,starts_at,created_by) values
 ('00000000-0000-4000-8000-000000000111','1810','Design review','2026-12-01 19:30+00','00000000-0000-4000-8000-000000000002');
update public.build_logs set title='Assembly checked', body='Revised details'
 where id='00000000-0000-4000-8000-000000000110';
update public.events set title='CAD fit review',starts_at='2026-12-02 19:30+00'
 where id='00000000-0000-4000-8000-000000000111';

do $$
begin
 if not exists (select 1 from public.build_logs
   where id='00000000-0000-4000-8000-000000000110' and title='Assembly checked'
     and edited_at is not null and edited_by='00000000-0000-4000-8000-000000000002') then
   raise exception 'Captain build log update or edit attribution failed';
 end if;
 if not exists (select 1 from public.events
   where id='00000000-0000-4000-8000-000000000111' and title='CAD fit review'
     and edited_at is not null and edited_by='00000000-0000-4000-8000-000000000002') then
   raise exception 'Captain event update or edit attribution failed';
 end if;
end $$;

-- Ordinary member cannot edit team engineering records, but can edit own profile.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
do $$
declare n integer;
begin
 update public.build_logs set title='Tampered'
   where id='00000000-0000-4000-8000-000000000110';
 get diagnostics n = row_count;
 if n <> 0 then raise exception 'Member edited a log'; end if;
 update public.events set title='Tampered'
   where id='00000000-0000-4000-8000-000000000111';
 get diagnostics n = row_count;
 if n <> 0 then raise exception 'Member edited an event'; end if;
 update public.profiles set full_name='Member Updated',
   headline='CAD apprentice',bio='Building robots.',avatar_color='sage'
   where id='00000000-0000-4000-8000-000000000003';
 get diagnostics n = row_count;
 if n <> 1 then raise exception 'Member could not edit own profile'; end if;
 update public.profiles set full_name='Should not change'
   where id='00000000-0000-4000-8000-000000000002';
 get diagnostics n = row_count;
 if n <> 0 then raise exception 'Member edited another profile'; end if;
 update public.team_memberships set subgroup='Design'
   where team_id='1810' and user_id='00000000-0000-4000-8000-000000000003';
 get diagnostics n = row_count;
 if n <> 1 then raise exception 'Member could not change own subgroup'; end if;
end $$;
do $$
declare denied boolean := false;
begin
 begin
  update public.team_memberships set role='admin'
   where team_id='1810' and user_id='00000000-0000-4000-8000-000000000003';
 exception when others then denied:=true;
 end;
 if not denied then raise exception 'Member escalated own role'; end if;
end $$;

-- Owner can update their own subgroup without losing protected role.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
update public.team_memberships set subgroup='Electrical'
 where team_id='1810' and user_id='00000000-0000-4000-8000-000000000001';
do $$
declare denied boolean := false;
begin
 if not exists(select 1 from public.team_memberships where user_id='00000000-0000-4000-8000-000000000001' and subgroup='Electrical' and role='owner')
 then raise exception 'Owner subgroup edit failed'; end if;
 begin
  update public.team_memberships set role='admin'
   where team_id='1810' and user_id='00000000-0000-4000-8000-000000000001';
 exception when others then denied:=true;
 end;
 if not denied then raise exception 'Owner demoted via profile edit'; end if;
end $$;

-- A user from the other team cannot edit the 1810 records or profiles.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',false);
do $$
declare n integer;
begin
 update public.build_logs set body='Cross-team tamper'
   where id='00000000-0000-4000-8000-000000000110';
 get diagnostics n=row_count;
 if n <> 0 then raise exception 'Other team edited a log'; end if;
 update public.profiles set bio='Cross-team tamper'
   where id='00000000-0000-4000-8000-000000000003';
 get diagnostics n=row_count;
 if n <> 0 then raise exception 'Other team edited a profile'; end if;
end $$;
reset role;
select 'Edit/profile permissions passed' as result;
