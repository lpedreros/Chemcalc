-- ============================================================================
-- PROPOSED, NOT APPLIED. Step B of 2 for "Trello credentials server-side". THIS ONE BREAKS OLD CLIENTS, so read the
-- ORDER section before running it. Project rnrzjlfpwxzomupnxikt (shared by testing.chemcalc.co AND chemcalc.co).
-- Migration name: revoke_profiles_trello_secret_columns
--
-- WHY: profiles.trello_api_key and profiles.trello_token are readable and writable by every signed-in user, and a
-- request through the Supabase client returns them in plaintext. After this migration only service_role (the `trello`
-- Edge Function) can touch them. The board/list columns stay readable and writable by the user.
--
-- WHAT IS ACTUALLY GRANTED TODAY (measured 2026-10-08, pg_class.relacl / pg_attribute.attacl):
--   table-level : anon=rDxtm  authenticated=rDxtm  (r = SELECT on EVERY column, granted by supabase_schema.sql)
--   column-level: trello_api_key, trello_token ... authenticated=w   (UPDATE only; every other writable column the same)
-- So SELECT on the two secrets comes from the TABLE-LEVEL grant. `revoke select (trello_api_key, trello_token) ...` would
-- change NOTHING (a column-level revoke cannot take away a table-level grant). The only revoke that works is the
-- table-level one, followed by an explicit column list for what must stay readable. That is what this does.
--
-- WHAT THIS DOES, in one transaction:
--   1. revoke SELECT on public.profiles from anon and authenticated (table level)
--   2. revoke UPDATE (trello_api_key, trello_token) from authenticated
--   3. grant SELECT on the 28 other columns (incl. the generated trello_connected and the two opaque Vault id columns
--      trello_api_key_id / trello_token_id added by 20261009212435_trello_credentials_to_vault) to authenticated
--   anon gets nothing: RLS ("auth.uid() = id") already returns anon zero rows, so no behavior is lost; it only removes
--   a grant that served no purpose. (Opt-out: delete "anon" from statement 1 and the anon assertions; the secrets are
--   then still readable by anon in principle, blocked only by RLS.)
--
-- CONSEQUENCES, deliberately checked by the pre-flight where the database can check them:
--   * `select *` on profiles now FAILS for authenticated (42501), because * includes the two secrets. Every reader must
--     list its columns. testing/auth.js does after the client change; the PRODUCTION auth.js (repo root) still uses
--     select('*') and must be changed first.
--   * Every FUTURE profiles column the browser must read needs its own GRANT SELECT (column), exactly like the UPDATE
--     rule from the biz_custom_terms incident. Add it in the same migration that adds the column.
--   * The pre-flight refuses to run if profiles has any column this file does not know about, so a column added since
--     this was written cannot silently lose browser access.
--
-- ORDER (do not skip): A (20261008130000 add_profiles_trello_connected) -> deploy the `trello` function -> ship the new
-- testing client and QA it -> port the same client change to PRODUCTION (repo root: auth.js, trello.js, estimate.js,
-- global-account-modal.js) and release it -> THIS migration -> post-apply checks below. Tabs left open on the old
-- client keep running old JS until reloaded; their Trello calls/saves will fail after this until they reload.
-- ============================================================================
begin;

-- Pre-flight
do $$
declare
  readable text[] := array[
    'id','created_at','email','full_name','company_name','estimate_prefix','logo_url','tier',
    'stripe_customer_id','stripe_subscription_id','subscription_status',
    'trello_board_id','trello_board_name','trello_list_id','trello_list_name',
    'biz_name','biz_tagline','biz_phone','biz_email','biz_website','biz_address','biz_prefix','biz_logo_url',
    'beta_tester','biz_custom_terms','trello_connected','trello_api_key_id','trello_token_id'];
  secrets text[] := array['trello_api_key','trello_token'];
  unknown_cols text;
  missing_cols text;
  bad text;
begin
  select string_agg(column_name, ', ') into unknown_cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'profiles'
     and column_name <> all (readable || secrets);
  if unknown_cols is not null then
    raise exception 'profiles has column(s) this migration does not list: %. Add them to the SELECT grant (or decide they stay hidden) and re-run.', unknown_cols;
  end if;

  select string_agg(c, ', ') into missing_cols
    from unnest(readable || secrets) as c
   where not exists (select 1 from information_schema.columns
                      where table_schema = 'public' and table_name = 'profiles' and column_name = c);
  if missing_cols is not null then
    raise exception 'expected profiles column(s) not found: % (is step A, or the Trello Vault migration that adds the two id columns, applied?)', missing_cols;
  end if;

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

  -- The Edge Function runs as service_role and needs both.
  if not (has_column_privilege('service_role', 'public.profiles', 'trello_api_key', 'SELECT')
          and has_column_privilege('service_role', 'public.profiles', 'trello_token', 'SELECT')
          and has_column_privilege('service_role', 'public.profiles', 'trello_api_key', 'UPDATE')
          and has_column_privilege('service_role', 'public.profiles', 'trello_token', 'UPDATE')) then
    raise exception 'service_role lacks SELECT/UPDATE on the Trello secret columns: the Edge Function would break';
  end if;

  -- Everything that makes the new client work must already be in place.
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'profiles'
                    and column_name = 'trello_connected' and is_generated = 'ALWAYS') then
    raise exception 'trello_connected (step A) is missing or not a generated column';
  end if;
end $$;

-- The change
revoke select on public.profiles from anon, authenticated;
revoke update (trello_api_key, trello_token) on public.profiles from authenticated;
grant select (
  id, created_at, email, full_name, company_name, estimate_prefix, logo_url, tier,
  stripe_customer_id, stripe_subscription_id, subscription_status,
  trello_board_id, trello_board_name, trello_list_id, trello_list_name,
  biz_name, biz_tagline, biz_phone, biz_email, biz_website, biz_address, biz_prefix, biz_logo_url,
  beta_tester, biz_custom_terms, trello_connected, trello_api_key_id, trello_token_id
) on public.profiles to authenticated;

-- Post-flight: the secrets are closed to the browser roles, everything else still works, nothing protected became writable.
do $$
declare
  readable text[] := array[
    'id','created_at','email','full_name','company_name','estimate_prefix','logo_url','tier',
    'stripe_customer_id','stripe_subscription_id','subscription_status',
    'trello_board_id','trello_board_name','trello_list_id','trello_list_name',
    'biz_name','biz_tagline','biz_phone','biz_email','biz_website','biz_address','biz_prefix','biz_logo_url',
    'beta_tester','biz_custom_terms','trello_connected','trello_api_key_id','trello_token_id'];
  writable text[] := array[
    'full_name','company_name','estimate_prefix','logo_url',
    'trello_board_id','trello_board_name','trello_list_id','trello_list_name',
    'biz_name','biz_tagline','biz_phone','biz_email','biz_website','biz_address','biz_prefix','biz_logo_url','biz_custom_terms'];
  c text;
  bad text;
begin
  foreach c in array array['trello_api_key','trello_token'] loop
    if has_column_privilege('authenticated', 'public.profiles', c, 'SELECT')
       or has_column_privilege('authenticated', 'public.profiles', c, 'UPDATE')
       or has_column_privilege('anon', 'public.profiles', c, 'SELECT')
       or has_column_privilege('anon', 'public.profiles', c, 'UPDATE') then
      raise exception 'browser roles can still reach % ', c;
    end if;
    if not (has_column_privilege('service_role', 'public.profiles', c, 'SELECT')
            and has_column_privilege('service_role', 'public.profiles', c, 'UPDATE')) then
      raise exception 'service_role lost access to %', c;
    end if;
  end loop;

  if has_table_privilege('authenticated', 'public.profiles', 'SELECT') or has_table_privilege('anon', 'public.profiles', 'SELECT') then
    raise exception 'a table-level SELECT grant is still present';
  end if;
  if has_any_column_privilege('anon', 'public.profiles', 'SELECT') then
    raise exception 'anon can still read a column of profiles';
  end if;

  foreach c in array readable loop
    if not has_column_privilege('authenticated', 'public.profiles', c, 'SELECT') then
      raise exception 'authenticated lost SELECT on %', c;
    end if;
  end loop;

  -- UPDATE set is exactly the 17 board/list/profile/business columns: the previous 19 minus the two secrets.
  select string_agg(a.attname::text, ', ') into bad
    from pg_attribute a
   where a.attrelid = 'public.profiles'::regclass and a.attnum > 0 and not a.attisdropped
     and has_column_privilege('authenticated', 'public.profiles', a.attname, 'UPDATE')
     and a.attname::text <> all (writable);
  if bad is not null then raise exception 'authenticated can update unexpected column(s): %', bad; end if;
  foreach c in array writable loop
    if not has_column_privilege('authenticated', 'public.profiles', c, 'UPDATE') then
      raise exception 'authenticated lost UPDATE on %', c;
    end if;
  end loop;
  if has_table_privilege('authenticated', 'public.profiles', 'UPDATE') then
    raise exception 'table-level UPDATE appeared for authenticated';
  end if;
end $$;

commit;

-- ----------------------------------------------------------------------------
-- After applying, confirm as the signed-in role (each in its OWN run: an error aborts the transaction). Use a real profile id:
--   begin; set local role authenticated;
--   select set_config('request.jwt.claims', '{"sub":"<profile uuid>","role":"authenticated"}', true);
--   select id, tier, trello_connected, trello_board_name from public.profiles;   -- 1 row (own), no error
--   rollback;
--   begin; set local role authenticated; select set_config('request.jwt.claims', '{"sub":"<profile uuid>","role":"authenticated"}', true);
--   select trello_token from public.profiles;                                    -- ERROR 42501 permission denied
--   rollback;
--   begin; set local role authenticated; select set_config('request.jwt.claims', '{"sub":"<profile uuid>","role":"authenticated"}', true);
--   select * from public.profiles;                                               -- ERROR 42501 (this is why auth.js lists columns)
--   rollback;
-- Then on the site: sign in, open Account > Trello, Refresh Boards, Add to Trello, Disconnect (see the report's QA list).
--
-- Rollback (restores today's state exactly: table-level SELECT for both roles, UPDATE on the two secrets):
--   grant select on public.profiles to anon, authenticated;
--   grant update (trello_api_key, trello_token) on public.profiles to authenticated;
--
-- Also update supabase_schema.sql ("grant select on public.profiles to anon, authenticated") when this is applied, so the
-- reference file does not describe the old state.
-- ----------------------------------------------------------------------------
