-- ============================================================================
-- PROPOSED -- NOT APPLIED. Rollback for 20261009230000_trello_vault_cleanup_on_profile_delete.sql.
-- Drops the trigger and its function; account deletion goes back to leaving Vault secrets behind (the pre-migration state).
-- Idempotent. It does NOT bring back secrets the migration's one-time sweep removed: those were unreachable orphans
-- (no profile referenced them and no profile with that uuid existed), so there is nothing to restore them to.
-- Touches nothing else: not the Vault data, not the profiles rows, not any grant.
-- ============================================================================
begin;

drop trigger if exists trello_cleanup_vault_on_profile_delete on public.profiles;
drop function if exists public.trello_cleanup_vault_on_profile_delete();

do $$
begin
  if exists (select 1 from pg_trigger where tgrelid = 'public.profiles'::regclass and tgname = 'trello_cleanup_vault_on_profile_delete') then
    raise exception 'the cleanup trigger is still present';
  end if;
  if exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'trello_cleanup_vault_on_profile_delete') then
    raise exception 'the cleanup function is still present';
  end if;
  -- the Vault feature itself must be untouched
  if to_regprocedure('public.trello_clear_credentials(uuid)') is null then
    raise exception 'trello_clear_credentials disappeared: this rollback must not touch the Vault migration';
  end if;
end $$;

commit;
