-- Minimal Supabase auth-role fixture for CI only. Not for production.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key);
create or replace function auth.uid()
returns uuid language sql stable set search_path = ''
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

-- Supabase provides this publication in production.
create publication supabase_realtime;
