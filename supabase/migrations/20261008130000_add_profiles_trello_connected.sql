-- ============================================================================
-- PROPOSED, NOT APPLIED. Step A of 2 for "Trello credentials server-side" (see supabase/functions/trello and the
-- report trello-server-side-report.md). Additive and safe to run at any time; step B (the REVOKE) is a separate file
-- and must wait until A, the function and the new client are live.
-- Project rnrzjlfpwxzomupnxikt (shared by testing.chemcalc.co and chemcalc.co).
-- Migration name: add_profiles_trello_connected
--
-- WHY: once the browser can no longer read profiles.trello_api_key / trello_token, the page still has to know whether
-- Trello is connected (to show "Trello is connected" + Disconnect instead of the key box). This adds a read-only flag
-- computed by the database itself from those two columns, so it can never drift from them and the page never needs the
-- secrets to show it.
--
-- WHAT THIS DOES: adds public.profiles.trello_connected boolean GENERATED ALWAYS ... STORED
--   = (trello_api_key is non-empty AND trello_token is non-empty).
-- Existing rows are computed during the ADD COLUMN, so every already-connected user is "connected" the moment it runs:
-- nobody looks disconnected (the post-flight proves the count matches). A generated column cannot be written by anyone,
-- so no UPDATE grant is added or needed, and the Sept 19 lock-down is untouched. Readers: `authenticated` and `anon`
-- can SELECT it today through the existing table-level SELECT; step B turns that into an explicit column grant.
-- Brief lock: ACCESS EXCLUSIVE on profiles while the (tiny) table is rewritten.
-- ============================================================================
begin;

-- Pre-flight
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'trello_connected') then
    raise exception 'public.profiles.trello_connected already exists: nothing to do';
  end if;
  if (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles'
        and column_name in ('trello_api_key', 'trello_token')) <> 2 then
    raise exception 'profiles.trello_api_key / trello_token are not both present';
  end if;
  if has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
     or has_table_privilege('anon', 'public.profiles', 'UPDATE') then
    raise exception 'anon/authenticated hold table-level UPDATE on public.profiles: the lock-down is not in place. Stop and investigate.';
  end if;
end $$;

-- The change
alter table public.profiles
  add column trello_connected boolean
  generated always as (coalesce(trello_api_key, '') <> '' and coalesce(trello_token, '') <> '') stored;

-- Post-flight
do $$
declare
  expected int;
  actual int;
begin
  select count(*) into expected from public.profiles
   where coalesce(trello_api_key, '') <> '' and coalesce(trello_token, '') <> '';
  select count(*) into actual from public.profiles where trello_connected;
  if actual <> expected then
    raise exception 'trello_connected is true for % rows but % rows hold both credentials', actual, expected;
  end if;
  if (select count(*) from public.profiles where trello_connected is null) <> 0 then
    raise exception 'trello_connected must never be null';
  end if;
  if has_column_privilege('authenticated', 'public.profiles', 'trello_connected', 'UPDATE')
     or has_column_privilege('anon', 'public.profiles', 'trello_connected', 'UPDATE') then
    raise exception 'trello_connected must not be writable by anon/authenticated';
  end if;
  if has_table_privilege('authenticated', 'public.profiles', 'UPDATE') then
    raise exception 'table-level UPDATE appeared for authenticated';
  end if;
end $$;

commit;

-- ----------------------------------------------------------------------------
-- After applying, confirm (read-only):
--   select count(*) filter (where trello_connected) as connected, count(*) as profiles from public.profiles;
--      -> connected = number of users who had both a key and a token before (1 on 2026-10-08).
--   select attname, attgenerated from pg_attribute
--    where attrelid = 'public.profiles'::regclass and attname = 'trello_connected';   -> attgenerated = 's'
--
-- Rollback (nothing depends on the column until the new client ships):
--   alter table public.profiles drop column trello_connected;
-- ----------------------------------------------------------------------------
