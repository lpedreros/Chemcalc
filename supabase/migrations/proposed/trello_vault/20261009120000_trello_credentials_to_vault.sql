-- ============================================================================
-- PROPOSED -- NOT APPLIED. Do not run against the live database without Sentinel's pre-flight and Leo's approval.
-- Project rnrzjlfpwxzomupnxikt. Migration name: trello_credentials_to_vault
--
-- WHY: public.profiles.trello_api_key / trello_token are plain `text`, so a DB-level compromise (leaked service-role key,
-- backup/export, careless collaborator) reads them directly. This moves both secrets into Supabase Vault (supabase_vault
-- v0.3.1, schema `vault`) and reaches them only through three SECURITY DEFINER functions that service_role alone may EXECUTE
-- (the `trello` Edge Function calls them as PostgREST RPCs; see handler.vault.ts next to this file).
--
-- WHAT THIS DOES, in one transaction (it commits only if every check passes, otherwise nothing changes):
--   1. pre-flight: Vault objects and privileges present, the profiles shape is what we expect, no half pairs, no conflicts
--   2. adds profiles.trello_api_key_id / trello_token_id (nullable uuid, UNIQUE so two profiles can never share a secret)
--   3. creates trello_store_credentials / trello_read_credentials / trello_clear_credentials and sets their ACLs:
--        REVOKE ALL FROM PUBLIC, anon, authenticated (all three named; Supabase default privileges grant EXECUTE to anon and
--        authenticated on every new function, so revoking PUBLIC alone does not close it)  +  GRANT EXECUTE TO service_role
--   4. one-time data move, 0..N rows: every profile holding BOTH plaintext values gets two Vault secrets, the new id columns,
--      and then NULL in both plaintext columns (the plaintext columns are NOT dropped; they stay as nulled safety net)
--   5. trello_connected: ALTER COLUMN ... SET EXPRESSION (not drop/recreate: that keeps the column's ACL untouched)
--   6. post-flight: refuses to commit if any plaintext credential survives, any secret fails to decrypt, any ACL is wrong
-- Idempotent: a second run finds nothing to move, re-creates the same functions and ACLs, skips SET EXPRESSION, passes.
--
-- LANDMINE (this table has caused two incidents): information_schema.column_privileges expands a TABLE-level grant into one
-- row per column and looks column-level. profiles has `authenticated=rDxtm` at table level (pg_class.relacl), so SELECT on
-- every column, including the two new id columns, is already granted to anon/authenticated by the table-level grant and a
-- column-level REVOKE would be a silent no-op. Every load-bearing check below reads pg_class.relacl, pg_attribute.attacl,
-- pg_proc.proacl or has_*_privilege() (which resolves both levels), never information_schema.
-- Consequence, stated plainly: until the separate Migration B (revoke table-level SELECT, re-grant an explicit column list)
-- runs, a signed-in user can still SELECT their OWN row's two id columns (RLS "auth.uid() = id" still applies). They are
-- opaque uuids, useless without vault access, and the browser cannot WRITE them (post-flight asserts that).
--
-- DEPENDS ON: Migration A (20261008130000_add_profiles_trello_connected) already applied (trello_connected exists).
-- ORDER OF OPERATIONS: apply this, then deploy handler.vault.ts immediately. Between the two the OLD handler reads the
-- now-NULL plaintext columns and answers 409 not_connected for everyone (nothing is lost; it is a window of minutes).
-- Rollback: rollback.sql next to this file.
-- ============================================================================
begin;
-- >>> MIGRATION BODY BEGIN (live_rehearsal_rolled_back.sql embeds this block verbatim; the test suite diffs the two)

-- ---- 1. pre-flight --------------------------------------------------------
do $$
declare
  fn text;
  missing text;
  half int;
begin
  if (select count(*) from pg_roles where rolname in ('anon', 'authenticated', 'service_role')) <> 3 then
    raise exception 'roles anon / authenticated / service_role are not all present: not a Supabase database?';
  end if;

  select string_agg(c, ', ') into missing
    from unnest(array['trello_api_key', 'trello_token', 'trello_connected']) as c
   where not exists (select 1 from pg_attribute a
                      where a.attrelid = 'public.profiles'::regclass and a.attname = c and a.attnum > 0 and not a.attisdropped);
  if missing is not null then
    raise exception 'public.profiles is missing column(s): % (is Migration A applied?)', missing;
  end if;
  if not exists (select 1 from pg_attribute a
                  where a.attrelid = 'public.profiles'::regclass and a.attname = 'trello_connected' and a.attgenerated = 's') then
    raise exception 'profiles.trello_connected is not a STORED generated column';
  end if;

  -- Vault objects (names and signatures of v0.3.1)
  if not exists (select 1 from pg_namespace where nspname = 'vault') then
    raise exception 'schema vault does not exist: supabase_vault is not installed';
  end if;
  foreach fn in array array['vault.create_secret(text,text,text,uuid)', 'vault.update_secret(uuid,text,text,text,uuid)'] loop
    if to_regprocedure(fn) is null then
      raise exception 'Vault function % not found (different supabase_vault version?)', fn;
    end if;
    if not has_function_privilege(current_user, to_regprocedure(fn), 'EXECUTE') then
      raise exception 'role % may not execute % : missing Vault privileges', current_user, fn;
    end if;
  end loop;
  if to_regclass('vault.secrets') is null or to_regclass('vault.decrypted_secrets') is null then
    raise exception 'vault.secrets / vault.decrypted_secrets not found';
  end if;
  if not has_schema_privilege(current_user, 'vault', 'USAGE')
     or not has_table_privilege(current_user, 'vault.decrypted_secrets', 'SELECT')
     or not has_table_privilege(current_user, 'vault.secrets', 'SELECT')
     or not has_table_privilege(current_user, 'vault.secrets', 'DELETE') then
    raise exception 'role % lacks USAGE on vault, SELECT on vault.decrypted_secrets / vault.secrets or DELETE on vault.secrets: missing Vault privileges', current_user;
  end if;

  -- The browser roles must not hold table-level UPDATE (pg_class.relacl, the real table-level fact)
  if exists (select 1
               from pg_class c, aclexplode(c.relacl) x
               join pg_roles r on r.oid = x.grantee
              where c.oid = 'public.profiles'::regclass and x.privilege_type = 'UPDATE' and r.rolname in ('anon', 'authenticated')) then
    raise exception 'anon/authenticated hold table-level UPDATE on public.profiles (pg_class.relacl): the lock-down is not in place. Stop and investigate.';
  end if;

  -- Data shape: only look at the id columns if they already exist (re-run), otherwise they are null by definition.
  if exists (select 1 from pg_attribute where attrelid = 'public.profiles'::regclass and attname = 'trello_api_key_id' and not attisdropped) then
    -- one id without the other
    select count(*) into half from public.profiles where (trello_api_key_id is null) <> (trello_token_id is null);
    if half > 0 then
      raise exception '% profile(s) have only one of trello_api_key_id / trello_token_id set: inconsistent, refusing', half;
    end if;
    -- ids that point nowhere
    if exists (select 1 from public.profiles p
                where (p.trello_api_key_id is not null and not exists (select 1 from vault.secrets s where s.id = p.trello_api_key_id))
                   or (p.trello_token_id   is not null and not exists (select 1 from vault.secrets s where s.id = p.trello_token_id))) then
      raise exception 'a profile points at a Vault secret that does not exist: refusing';
    end if;
    -- ids set AND plaintext still present: two sources of truth, which one wins is a human decision
    if exists (select 1 from public.profiles
                where trello_api_key_id is not null and (coalesce(trello_api_key, '') <> '' or coalesce(trello_token, '') <> '')) then
      raise exception 'a profile has Vault ids AND plaintext credentials: refusing to guess which is current';
    end if;
  end if;
  -- half a plaintext pair cannot be moved as a pair and must not be left behind
  select count(*) into half from public.profiles where (coalesce(trello_api_key, '') <> '') <> (coalesce(trello_token, '') <> '');
  if half > 0 then
    raise exception '% profile(s) hold only one of trello_api_key / trello_token (half a pair): refusing to move or discard it', half;
  end if;
end $$;

-- Remember trello_connected's grants so we can prove SET EXPRESSION left them alone.
create temp table _trello_vault_acl_before on commit drop as
  select (select c.relacl::text from pg_class c where c.oid = 'public.profiles'::regclass) as relacl,
         (select a.attacl::text from pg_attribute a
           where a.attrelid = 'public.profiles'::regclass and a.attname = 'trello_connected') as attacl;

-- ---- 2. columns -----------------------------------------------------------
alter table public.profiles add column if not exists trello_api_key_id uuid;
alter table public.profiles add column if not exists trello_token_id uuid;
create unique index if not exists profiles_trello_api_key_id_key on public.profiles (trello_api_key_id);
create unique index if not exists profiles_trello_token_id_key   on public.profiles (trello_token_id);

-- ---- 3. functions ---------------------------------------------------------
-- Defensive caller check (the real control is the EXECUTE grant, this is the second lock): inside a SECURITY DEFINER
-- function current_user is the owner, but the `role` setting still holds what PostgREST did with SET LOCAL ROLE. A direct
-- admin session (SQL editor, migrations) has role 'none' and session_user postgres/supabase_admin.

create or replace function public.trello_store_credentials(p_user_id uuid, p_api_key text, p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  k uuid;
  t uuid;
begin
  if not (current_setting('role') = 'service_role'
          or (current_setting('role') = 'none' and session_user in ('postgres', 'supabase_admin', 'service_role'))) then
    raise exception 'trello_store_credentials: service_role only' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'trello_store_credentials: p_user_id is required' using errcode = '22004';
  end if;
  if coalesce(p_api_key, '') = '' or coalesce(p_token, '') = '' then
    raise exception 'trello_store_credentials: both the API key and the token are required' using errcode = '22023';
  end if;

  select trello_api_key_id, trello_token_id into k, t from public.profiles where id = p_user_id for update;
  if not found then
    return false;                                   -- no such profile; the Edge Function answers 404 no_profile
  end if;

  -- vault.update_secret() silently does nothing for a missing id, so only update ids that exist, create otherwise,
  -- and read everything back below.
  if k is not null and exists (select 1 from vault.secrets where id = k) then
    perform vault.update_secret(k, p_api_key);
  else
    k := vault.create_secret(p_api_key, 'trello_api_key:' || p_user_id::text, 'Trello API key');
  end if;
  if t is not null and exists (select 1 from vault.secrets where id = t) then
    perform vault.update_secret(t, p_token);
  else
    t := vault.create_secret(p_token, 'trello_token:' || p_user_id::text, 'Trello token');
  end if;

  update public.profiles
     set trello_api_key_id = k, trello_token_id = t, trello_api_key = null, trello_token = null
   where id = p_user_id;

  if (select decrypted_secret from vault.decrypted_secrets where id = k) is distinct from p_api_key then
    raise exception 'trello_store_credentials: Vault read-back of the API key did not match (update_secret no-op or decrypt failure)' using errcode = 'XX000';
  end if;
  if (select decrypted_secret from vault.decrypted_secrets where id = t) is distinct from p_token then
    raise exception 'trello_store_credentials: Vault read-back of the token did not match (update_secret no-op or decrypt failure)' using errcode = 'XX000';
  end if;
  return true;
end
$fn$;

create or replace function public.trello_read_credentials(p_user_id uuid)
returns table (api_key text, token text)
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  k uuid;
  t uuid;
  v_key text;
  v_token text;
begin
  if not (current_setting('role') = 'service_role'
          or (current_setting('role') = 'none' and session_user in ('postgres', 'supabase_admin', 'service_role'))) then
    raise exception 'trello_read_credentials: service_role only' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'trello_read_credentials: p_user_id is required' using errcode = '22004';
  end if;

  select trello_api_key_id, trello_token_id into k, t from public.profiles where id = p_user_id;
  -- no profile, or not a complete pair of ids (the same condition trello_connected tests): "not connected"
  if not found or k is null or t is null then
    return query select null::text, null::text;
    return;
  end if;

  select decrypted_secret into v_key   from vault.decrypted_secrets where id = k;
  select decrypted_secret into v_token from vault.decrypted_secrets where id = t;
  if coalesce(v_key, '') = '' or coalesce(v_token, '') = '' then
    raise exception 'trello_read_credentials: a stored credential could not be decrypted' using errcode = 'XX000';
  end if;
  return query select v_key, v_token;
end
$fn$;

create or replace function public.trello_clear_credentials(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  k uuid;
  t uuid;
  ids uuid[];
begin
  if not (current_setting('role') = 'service_role'
          or (current_setting('role') = 'none' and session_user in ('postgres', 'supabase_admin', 'service_role'))) then
    raise exception 'trello_clear_credentials: service_role only' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'trello_clear_credentials: p_user_id is required' using errcode = '22004';
  end if;

  select trello_api_key_id, trello_token_id into k, t from public.profiles where id = p_user_id for update;
  if not found then
    return false;
  end if;

  update public.profiles
     set trello_api_key_id = null, trello_token_id = null, trello_api_key = null, trello_token = null
   where id = p_user_id;

  ids := array_remove(array[k, t], null);
  if cardinality(ids) > 0 then
    -- Vault 0.3.1 has no delete_secret(); a direct delete is the supported way.
    delete from vault.secrets where id = any (ids);
    if exists (select 1 from vault.secrets where id = any (ids)) then
      raise exception 'trello_clear_credentials: Vault secret(s) still present after delete' using errcode = 'XX000';
    end if;
  end if;
  return true;
end
$fn$;

-- ACLs. Name anon and authenticated explicitly: the default privileges of the postgres role grant EXECUTE on every new
-- function to both, and REVOKE ... FROM PUBLIC does not touch those separate entries.
revoke all on function public.trello_store_credentials(uuid, text, text) from public, anon, authenticated;
revoke all on function public.trello_read_credentials(uuid)               from public, anon, authenticated;
revoke all on function public.trello_clear_credentials(uuid)              from public, anon, authenticated;
grant execute on function public.trello_store_credentials(uuid, text, text) to service_role;
grant execute on function public.trello_read_credentials(uuid)               to service_role;
grant execute on function public.trello_clear_credentials(uuid)              to service_role;

-- ---- 4. data move (0..N rows) ----------------------------------------------
do $$
declare
  r record;
  k uuid;
  t uuid;
  moved int := 0;
begin
  for r in
    select id, trello_api_key, trello_token
      from public.profiles
     where coalesce(trello_api_key, '') <> '' and coalesce(trello_token, '') <> ''
       and trello_api_key_id is null and trello_token_id is null
     order by id
       for update
  loop
    k := vault.create_secret(r.trello_api_key, 'trello_api_key:' || r.id::text, 'Trello API key');
    t := vault.create_secret(r.trello_token,   'trello_token:'   || r.id::text, 'Trello token');
    if (select decrypted_secret from vault.decrypted_secrets where id = k) is distinct from r.trello_api_key
       or (select decrypted_secret from vault.decrypted_secrets where id = t) is distinct from r.trello_token then
      raise exception 'Vault read-back did not match for profile %: nothing was committed', r.id;
    end if;
    update public.profiles
       set trello_api_key_id = k, trello_token_id = t, trello_api_key = null, trello_token = null
     where id = r.id;
    moved := moved + 1;
  end loop;
  raise notice 'trello_vault: moved % profile(s) into Vault', moved;
end $$;

-- ---- 5. trello_connected now follows the id columns --------------------------
do $$
begin
  if exists (select 1
               from pg_attrdef d
               join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
              where d.adrelid = 'public.profiles'::regclass and a.attname = 'trello_connected'
                and pg_get_expr(d.adbin, d.adrelid) like '%trello_api_key_id%') then
    raise notice 'trello_vault: trello_connected already follows the id columns';
  else
    -- SET EXPRESSION (PG17+) keeps the column and its ACL; the table is rewritten to recompute the stored values.
    alter table public.profiles alter column trello_connected
      set expression as (trello_api_key_id is not null and trello_token_id is not null);
  end if;
end $$;

-- ---- 6. post-flight: refuse to commit unless all of this holds ---------------
do $$
declare
  fn regprocedure;
  who text;
  expected int;
  actual int;
  before_relacl text;
  before_attacl text;
begin
  -- no plaintext credential survived
  if exists (select 1 from public.profiles where coalesce(trello_api_key, '') <> '' or coalesce(trello_token, '') <> '') then
    raise exception 'a plaintext Trello credential survives in public.profiles: refusing to commit';
  end if;

  -- every pair of ids resolves to two decryptable, non-empty secrets
  select count(*) into expected from public.profiles where trello_api_key_id is not null or trello_token_id is not null;
  select count(*) into actual
    from public.profiles p
    join vault.decrypted_secrets a on a.id = p.trello_api_key_id and coalesce(a.decrypted_secret, '') <> ''
    join vault.decrypted_secrets b on b.id = p.trello_token_id   and coalesce(b.decrypted_secret, '') <> '';
  if actual <> expected then
    raise exception '% profile(s) reference Vault secrets but only % decrypt to non-empty values', expected, actual;
  end if;
  if (select count(*) from public.profiles where trello_api_key_id is not null and trello_token_id is not null)
     <> (select count(*) from public.profiles where trello_connected) then
    raise exception 'trello_connected disagrees with the id columns';
  end if;
  if exists (select 1 from public.profiles where trello_connected is null) then
    raise exception 'trello_connected must never be null';
  end if;

  -- function ACLs, per role, by pg_proc / has_function_privilege (which also resolves PUBLIC), not by assumption
  foreach fn in array array['public.trello_store_credentials(uuid,text,text)'::regprocedure,
                            'public.trello_read_credentials(uuid)'::regprocedure,
                            'public.trello_clear_credentials(uuid)'::regprocedure] loop
    foreach who in array array['anon', 'authenticated'] loop
      if has_function_privilege(who, fn, 'EXECUTE') then
        raise exception '% can EXECUTE %', who, fn;
      end if;
    end loop;
    if exists (select 1 from pg_proc p, aclexplode(p.proacl) x
                where p.oid = fn and x.privilege_type = 'EXECUTE' and x.grantee = 0) then
      raise exception 'PUBLIC can EXECUTE %', fn;
    end if;
    if exists (select 1 from pg_proc p, aclexplode(p.proacl) x
                join pg_roles r on r.oid = x.grantee
               where p.oid = fn and x.privilege_type = 'EXECUTE' and x.grantee <> p.proowner
                  and r.rolname not in ('service_role', 'postgres', 'supabase_admin')) then
      raise exception 'an unexpected role can EXECUTE % (see pg_proc.proacl)', fn;
    end if;
    if not has_function_privilege('service_role', fn, 'EXECUTE') then
      raise exception 'service_role cannot EXECUTE %', fn;
    end if;
    if not coalesce((select p.prosecdef and exists (select 1 from unnest(p.proconfig) c where c in ('search_path=""', 'search_path='))
                       from pg_proc p where p.oid = fn), false) then
      raise exception '% is not SECURITY DEFINER with an empty search_path', fn;
    end if;
  end loop;

  -- the browser roles can neither write the id columns (they could point them at someone else's secret) nor the
  -- plaintext columns; has_column_privilege resolves table-level and column-level grants together
  foreach who in array array['anon', 'authenticated'] loop
    if has_column_privilege(who, 'public.profiles', 'trello_api_key_id', 'UPDATE')
       or has_column_privilege(who, 'public.profiles', 'trello_token_id', 'UPDATE')
       or has_column_privilege(who, 'public.profiles', 'trello_api_key_id', 'INSERT')
       or has_column_privilege(who, 'public.profiles', 'trello_token_id', 'INSERT')
       or has_column_privilege(who, 'public.profiles', 'trello_connected', 'UPDATE') then
      raise exception '% can write the Vault id columns or trello_connected', who;
    end if;
    if has_schema_privilege(who, 'vault', 'USAGE') then
      raise exception '% has USAGE on schema vault', who;
    end if;
  end loop;
  if exists (select 1
               from pg_class c, aclexplode(c.relacl) x
               join pg_roles r on r.oid = x.grantee
              where c.oid = 'public.profiles'::regclass and x.privilege_type in ('UPDATE', 'INSERT') and r.rolname in ('anon', 'authenticated')) then
    raise exception 'a table-level UPDATE/INSERT grant to anon/authenticated exists on public.profiles';
  end if;

  -- SET EXPRESSION left the column, its generation and every ACL as they were
  if not exists (select 1 from pg_attribute a
                  where a.attrelid = 'public.profiles'::regclass and a.attname = 'trello_connected' and a.attgenerated = 's') then
    raise exception 'trello_connected is no longer a STORED generated column';
  end if;
  select relacl, attacl into before_relacl, before_attacl from _trello_vault_acl_before;
  if (select c.relacl::text from pg_class c where c.oid = 'public.profiles'::regclass) is distinct from before_relacl
     or (select a.attacl::text from pg_attribute a
          where a.attrelid = 'public.profiles'::regclass and a.attname = 'trello_connected') is distinct from before_attacl then
    raise exception 'the grants on public.profiles / trello_connected changed during the migration';
  end if;
  raise notice 'trello_vault: post-flight passed';
end $$;

-- <<< MIGRATION BODY END
commit;
