-- ============================================================================
-- PROPOSED -- NOT APPLIED. Do not run against the live database before Sentinel's pre-flight and Leo's approval.
-- Project rnrzjlfpwxzomupnxikt. Migration name: trello_vault_cleanup_on_profile_delete
-- Depends on: 20261009212435_trello_credentials_to_vault (applied 2026-10-09).
--
-- PROBLEM: public.profiles.id REFERENCES auth.users(id) ON DELETE CASCADE. When an account is deleted, its profiles row
-- cascades away but the two Vault secrets named by trello_api_key_id / trello_token_id stay in vault.secrets forever,
-- unreachable and undeletable by the user (before the Vault move, deleting the row also deleted the plaintext).
--
-- WHAT THIS DOES (one transaction; commits only if every check passes):
--   1. pre-flight: the Vault migration is in place, the running role may DELETE from vault.secrets and owns profiles
--   2. creates trigger function public.trello_cleanup_vault_on_profile_delete() and an AFTER DELETE ... FOR EACH ROW trigger
--      on public.profiles (WHEN the old row has a Vault id) that deletes the old row's two Vault secrets
--   3. one-time sweep of secrets this feature already orphaned (named trello_api_key:<uuid> / trello_token:<uuid>, not
--      referenced by any profile, and no profile with that uuid)
--   4. post-flight: trigger present/enabled/AFTER/row-level, function SECURITY DEFINER with empty search_path and executable
--      by no one but its owner, no orphan left, every profile's ids still resolve
-- Idempotent. Rollback: rollback.sql next to this file.
--
-- WHY NOT JUST CALL trello_clear_credentials(OLD.id) FROM THE TRIGGER (the design the dispatch suggested)?  Measured on the
-- local replica (see REPORT.md, tests "FINDING"): that function only accepts role service_role or a direct admin session
-- (role 'none' with session_user postgres/supabase_admin/service_role). An account deleted through the Admin API
-- (supabase.auth.admin.deleteUser, or the dashboard's Delete user button) is deleted by Supabase Auth itself, whose database
-- role is supabase_auth_admin (Supabase docs: "the Postgres role that is used by Supabase Auth to make requests to your
-- database"). A trigger that called trello_clear_credentials would therefore raise 42501 "service_role only" and make
-- EVERY deletion of a Trello-connected account fail. Widening that function's check to admit supabase_auth_admin would weaken
-- the control on the one function that returns decrypted credentials, so it is left alone. This trigger function does its own,
-- much narrower job instead: it can only run as a trigger (it cannot be called), only for a row that is already being
-- deleted, and it deletes only the secrets that row references (plus the two secrets named after that profile's uuid).
--
-- WHY AFTER DELETE, NOT BEFORE: with BEFORE, another BEFORE DELETE trigger that cancels the row's deletion (RETURN NULL) would
-- leave the profile alive with its secrets already gone. AFTER fires only for a row that really was deleted, in the same
-- transaction, so a failure here (it raises) rolls the whole account deletion back instead of orphaning or half-deleting.
-- If Vault cleanup fails the account deletion fails loudly; the alternative (swallow the error) would silently keep a
-- deleted user's credentials.
-- Not covered by any row trigger, by design of Postgres: TRUNCATE public.profiles, and sessions running with
-- session_replication_role = replica (pg_restore --disable-triggers). Neither is a normal account-deletion path.
-- ============================================================================
begin;
-- >>> MIGRATION BODY BEGIN (live_rehearsal_rolled_back.sql embeds this block verbatim; the test suite diffs the two)

-- ---- 1. pre-flight --------------------------------------------------------
do $$
declare
  missing text;
begin
  select string_agg(c, ', ') into missing
    from unnest(array['trello_api_key_id', 'trello_token_id']) as c
   where not exists (select 1 from pg_attribute a
                      where a.attrelid = 'public.profiles'::regclass and a.attname = c and a.attnum > 0 and not a.attisdropped);
  if missing is not null then
    raise exception 'public.profiles is missing column(s): % (is the Trello Vault migration applied?)', missing;
  end if;
  if to_regprocedure('public.trello_clear_credentials(uuid)') is null then
    raise exception 'public.trello_clear_credentials(uuid) not found: the Trello Vault migration is not in place';
  end if;
  if to_regclass('vault.secrets') is null then
    raise exception 'vault.secrets not found';
  end if;
  if not has_schema_privilege(current_user, 'vault', 'USAGE')
     or not has_table_privilege(current_user, 'vault.secrets', 'SELECT')
     or not has_table_privilege(current_user, 'vault.secrets', 'DELETE') then
    raise exception 'role % lacks USAGE on vault or SELECT/DELETE on vault.secrets: missing Vault privileges', current_user;
  end if;
  if not pg_has_role(current_user, (select c.relowner from pg_class c where c.oid = 'public.profiles'::regclass), 'USAGE') then
    raise exception 'role % is not the owner of public.profiles, so it cannot create a trigger on it', current_user;
  end if;
end $$;

-- ---- 2. trigger function and trigger --------------------------------------
create or replace function public.trello_cleanup_vault_on_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  ids uuid[] := array_remove(array[old.trello_api_key_id, old.trello_token_id], null);
begin
  -- Vault 0.3.1 has no delete_secret(); a direct delete is the supported way. The two named secrets are included so a
  -- profile whose id column was nulled by hand still leaves nothing behind.
  delete from vault.secrets
   where id = any (ids)
      or name in ('trello_api_key:' || old.id::text, 'trello_token:' || old.id::text);
  if exists (select 1 from vault.secrets
              where id = any (ids)
                 or name in ('trello_api_key:' || old.id::text, 'trello_token:' || old.id::text)) then
    raise exception 'trello_cleanup_vault_on_profile_delete: Vault secret(s) of profile % still present after delete', old.id
      using errcode = 'XX000';
  end if;
  return old;
end
$fn$;

-- A trigger function is never called directly. Nobody but the owner needs EXECUTE; the default privileges would otherwise
-- hand it to anon/authenticated/service_role (it cannot be invoked as a plain function anyway; this is belt and braces).
revoke all on function public.trello_cleanup_vault_on_profile_delete() from public, anon, authenticated, service_role;

create or replace trigger trello_cleanup_vault_on_profile_delete
  after delete on public.profiles
  for each row
  when (old.trello_api_key_id is not null or old.trello_token_id is not null)
  execute function public.trello_cleanup_vault_on_profile_delete();

-- ---- 3. one-time sweep of secrets already orphaned ------------------------------
do $$
declare
  swept int;
begin
  delete from vault.secrets s
   where s.name ~ '^trello_(api_key|token):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     and not exists (select 1 from public.profiles p
                      where p.trello_api_key_id = s.id or p.trello_token_id = s.id
                         or p.id::text = substr(s.name, position(':' in s.name) + 1));
  get diagnostics swept = row_count;
  raise notice 'trello_vault_cleanup: swept % orphaned secret(s)', swept;
end $$;

-- ---- 4. post-flight --------------------------------------------------------------
do $$
declare
  who text;
begin
  if not exists (select 1
                   from pg_trigger t
                  where t.tgrelid = 'public.profiles'::regclass and t.tgname = 'trello_cleanup_vault_on_profile_delete'
                    and not t.tgisinternal
                    and t.tgenabled = 'O'                       -- enabled for ordinary sessions
                    and (t.tgtype & 1) = 1                      -- row-level
                    and (t.tgtype & 2) = 0                      -- not BEFORE
                    and (t.tgtype & 4) = 0 and (t.tgtype & 16) = 0 and (t.tgtype & 8) = 8 and (t.tgtype & 32) = 0   -- DELETE only
                    and t.tgfoid = 'public.trello_cleanup_vault_on_profile_delete()'::regprocedure) then
    raise exception 'the cleanup trigger is missing, disabled, or not AFTER DELETE FOR EACH ROW';
  end if;
  if not coalesce((select p.prosecdef and exists (select 1 from unnest(p.proconfig) c where c in ('search_path=""', 'search_path='))
                     from pg_proc p where p.oid = 'public.trello_cleanup_vault_on_profile_delete()'::regprocedure), false) then
    raise exception 'the trigger function is not SECURITY DEFINER with an empty search_path';
  end if;
  foreach who in array array['anon', 'authenticated', 'service_role'] loop
    if has_function_privilege(who, 'public.trello_cleanup_vault_on_profile_delete()'::regprocedure, 'EXECUTE') then
      raise exception '% can EXECUTE the trigger function', who;
    end if;
  end loop;
  if exists (select 1 from pg_proc p, aclexplode(p.proacl) x
              where p.oid = 'public.trello_cleanup_vault_on_profile_delete()'::regprocedure
                and x.privilege_type = 'EXECUTE' and x.grantee = 0) then
    raise exception 'PUBLIC can EXECUTE the trigger function (pg_proc.proacl)';
  end if;
  if exists (select 1 from pg_proc p, aclexplode(p.proacl) x
              join pg_roles r on r.oid = x.grantee
              where p.oid = 'public.trello_cleanup_vault_on_profile_delete()'::regprocedure
                and x.privilege_type = 'EXECUTE' and x.grantee <> p.proowner and r.rolname not in ('postgres', 'supabase_admin')) then
    raise exception 'an unexpected role can EXECUTE the trigger function (pg_proc.proacl)';
  end if;
  if exists (select 1 from vault.secrets s
              where s.name ~ '^trello_(api_key|token):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                and not exists (select 1 from public.profiles p
                                 where p.trello_api_key_id = s.id or p.trello_token_id = s.id
                                    or p.id::text = substr(s.name, position(':' in s.name) + 1))) then
    raise exception 'an orphaned Trello Vault secret remains';
  end if;
  if exists (select 1 from public.profiles p
              where (p.trello_api_key_id is not null and not exists (select 1 from vault.secrets s where s.id = p.trello_api_key_id))
                 or (p.trello_token_id is not null and not exists (select 1 from vault.secrets s where s.id = p.trello_token_id))) then
    raise exception 'a profile points at a Vault secret that does not exist (the sweep must never remove a referenced secret)';
  end if;
  raise notice 'trello_vault_cleanup: post-flight passed';
end $$;

-- <<< MIGRATION BODY END
commit;
