-- Dedicated Blueprint project hardening.
-- Supabase provisions an event-trigger function that turns RLS on for new tables.
-- It is not intended to be a public RPC endpoint.
-- Executed as blueprint_restrict_rls_auto_enable_function_access.
-- The event trigger remains executable by its owner, postgres.
do $$
begin
 if to_regprocedure('public.rls_auto_enable()') is not null then
   revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
 end if;
end
$$;
