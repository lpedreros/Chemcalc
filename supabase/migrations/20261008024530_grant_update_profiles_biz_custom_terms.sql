-- ============================================================================
-- APPLIED 2026-10-08 (run by Leo in the Supabase SQL editor; verified 2026-10-08 02:45 UTC: column grant present,
-- 19 updatable columns, none of the 8 protected ones, as-the-user save OK). The statements below are exactly the
-- reviewed and cleared SQL; only this banner differs. NOT recorded in supabase_migrations.schema_migrations
-- (a SQL-editor run does not create a migration row), so the timestamp in this file's name is the verification time.
-- Project rnrzjlfpwxzomupnxikt (shared by testing.chemcalc.co and chemcalc.co).
-- Migration name: grant_update_profiles_biz_custom_terms
--
-- WHY: profiles is locked down to COLUMN-level UPDATE for `authenticated`
-- (migration 20260919004225 lock_down_profiles_write_grants). That migration lists
-- the 18 columns the browser may write. The column biz_custom_terms was added on
-- 2026-10-07 (migration 20261007211212) WITHOUT a matching grant, and testing's
-- saveBusinessInfo() sends it in the same UPDATE as biz_name, trello_*, etc. Postgres
-- rejects the whole statement when any SET column lacks the privilege, so every
-- Business Info / Trello save from testing.chemcalc.co fails with 42501.
--
-- WHAT THIS DOES: grants UPDATE on that ONE column, to `authenticated` only. Nothing
-- else changes. Row scoping stays with the existing RLS policy "Users can update own
-- profile" (auth.uid() = id). It does NOT add table-level UPDATE, and it does NOT touch
-- tier, subscription_status, stripe_customer_id, stripe_subscription_id, beta_tester,
-- id, email or created_at: a signed-in user still cannot write any of those.
--
-- The two DO blocks make the migration refuse to run (or roll back) if the lock-down is
-- not exactly as expected, before and after the grant.
-- ============================================================================
begin;

-- Pre-flight: the Sept 19 lock-down must still be in place.
do $$
declare
  bad text;
begin
  if has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
     or has_table_privilege('anon', 'public.profiles', 'UPDATE') then
    raise exception 'anon/authenticated hold table-level UPDATE on public.profiles: the lock-down is not in place. Stop and investigate.';
  end if;

  select string_agg(c, ', ') into bad
  from unnest(array['id','created_at','email','tier','stripe_customer_id','stripe_subscription_id',
                    'subscription_status','beta_tester']) as c
  where has_column_privilege('authenticated', 'public.profiles', c, 'UPDATE')
     or has_column_privilege('anon', 'public.profiles', c, 'UPDATE');
  if bad is not null then
    raise exception 'unexpected UPDATE privilege on protected column(s): %', bad;
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'profiles' and column_name = 'biz_custom_terms') then
    raise exception 'public.profiles.biz_custom_terms does not exist';
  end if;
end $$;

-- The change: one column, one role.
grant update (biz_custom_terms) on public.profiles to authenticated;

-- Post-flight: the new column is writable, and nothing protected became writable.
do $$
declare
  bad text;
begin
  if not has_column_privilege('authenticated', 'public.profiles', 'biz_custom_terms', 'UPDATE') then
    raise exception 'grant did not take effect';
  end if;
  if has_column_privilege('anon', 'public.profiles', 'biz_custom_terms', 'UPDATE') then
    raise exception 'anon must not be able to update biz_custom_terms';
  end if;
  if has_table_privilege('authenticated', 'public.profiles', 'UPDATE') then
    raise exception 'table-level UPDATE appeared for authenticated';
  end if;

  select string_agg(c, ', ') into bad
  from unnest(array['id','created_at','email','tier','stripe_customer_id','stripe_subscription_id',
                    'subscription_status','beta_tester']) as c
  where has_column_privilege('authenticated', 'public.profiles', c, 'UPDATE');
  if bad is not null then
    raise exception 'protected column(s) became writable: %', bad;
  end if;
end $$;

commit;

-- ----------------------------------------------------------------------------
-- After applying, confirm (read-only):
--   select attname, attacl::text from pg_attribute
--    where attrelid = 'public.profiles'::regclass and attname = 'biz_custom_terms';
--      -> {authenticated=w/postgres}
--   select attname from pg_attribute
--    where attrelid = 'public.profiles'::regclass and attnum > 0 and not attisdropped
--      and has_column_privilege('authenticated', 'public.profiles', attname, 'UPDATE') order by attnum;
--      -> the original 18 columns + biz_custom_terms (19 rows), and none of the protected eight.
-- Then on testing.chemcalc.co: Account > Business > Save should return 204 (no 403 in the
-- project's edge logs), and the saved row should show the terms in the table editor.
--
-- Rollback (restores the broken-save state, so only if the grant itself is ever in question):
--   revoke update (biz_custom_terms) on public.profiles from authenticated;
--
-- ----------------------------------------------------------------------------
-- OPTIONAL hardening, separate decision, NOT part of the fix (leave commented out):
-- Supabase's default privileges leave TRUNCATE (and REFERENCES/TRIGGER) on profiles for anon and
-- authenticated. PostgREST cannot issue TRUNCATE, so this is not reachable through the API, only
-- through a direct database connection. If you want it closed:
--   revoke truncate, references, trigger on public.profiles from anon, authenticated;
-- ----------------------------------------------------------------------------
