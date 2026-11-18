-- Blueprint v2: team updates, announcements and live subscriptions.
-- Deployed to Resonant. Blueprint as blueprint_announcements_project_events_realtime_v2.
begin;

grant update(name,description,subgroup,progress) on public.projects to authenticated;
grant update(title,starts_at) on public.events to authenticated;
create policy "Leads edit project details" on public.projects
 for update to authenticated using (private.is_manager(team_id))
 with check (private.is_manager(team_id));
create policy "Leads edit events" on public.events
 for update to authenticated using (private.is_manager(team_id))
 with check (private.is_manager(team_id));

create table if not exists public.announcements (
 id uuid primary key default gen_random_uuid(),
 team_id text not null references public.teams(id) on delete cascade,
 title text not null check(char_length(title) between 1 and 140),
 body text not null check(char_length(body) between 1 and 2000),
 author_id uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create index if not exists blueprint_announcements_team_created on public.announcements(team_id,created_at desc);
alter table public.announcements enable row level security;
revoke all on public.announcements from public, anon;
grant select, insert on public.announcements to authenticated;
create policy "Approved members read announcements" on public.announcements
 for select to authenticated using (private.is_approved_member(team_id));
create policy "Leads create announcements" on public.announcements
 for insert to authenticated with check(private.is_manager(team_id) and author_id=(select auth.uid()));

alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.build_logs;
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.announcements;
commit;
