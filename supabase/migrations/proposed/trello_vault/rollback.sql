-- ============================================================================
-- PROPOSED -- NOT APPLIED. Standalone rollback for 20261009120000_trello_credentials_to_vault.sql.
-- Project rnrzjlfpwxzomupnxikt. Run only if the Vault migration was applied and has to be undone.
--
-- IS RESTORING PLAINTEXT FROM VAULT REALLY REACHABLE, GIVEN THE PLAINTEXT COLUMNS WERE NOT DROPPED?  Yes, and it is the
-- main job of this script. The migration NULLED the plaintext columns, and from the moment the patched Edge Function is
-- live every new "Connect Trello" writes to Vault only. After the migration the plaintext columns therefore hold nothing
-- (for the migrated user as well as for anyone who connected later); the only copy of each credential is in Vault. Dropping the
-- id columns without copying the values back would silently disconnect every user. So this script:
--   1. decrypts each Vault pair back into trello_api_key / trello_token, comparing every value after writing it
--   2. puts trello_connected back on its ORIGINAL expression (SET EXPRESSION, so its ACL is not touched), while the id
--      columns still exist (the new expression references them, so this must precede the drop)
--   3. deletes the Vault secrets this feature created (the ids on the profiles, plus any orphan named
--      trello_api_key:<uuid> / trello_token:<uuid> left behind by a deleted account)
--   4. drops the two id columns (their unique indexes go with them) and the three functions
-- It refuses (raises, nothing changes) if a secret is missing or does not decrypt, a profile has half a pair of ids, or a
-- profile has both Vault ids and plaintext (two sources of truth).
-- The one thing a rollback cannot recover is a credential whose Vault secret was deleted out from under the profile: that
-- is reported as a refusal naming the profile count, and the user has to reconnect Trello after the rollback.
--
-- ORDER OF OPERATIONS: run this script, then immediately redeploy the ORIGINAL handler.ts (the one that reads the plaintext
-- columns). Between the two, the patched handler answers 500 db_error on Trello actions (its RPCs are gone).
-- Idempotent: a second run finds nothing to roll back and exits cleanly.
-- ============================================================================
begin;

do $$
declare
  has_cols boolean;
  r record;
  v_key text;
  v_token text;
  restored int := 0;
  half int;
  expected_connected int;
  deleted int;
begin
  if (select count(*) from pg_roles where rolname = 'service_role') <> 1 then
    raise exception 'not a Supabase database (no service_role)';
  end if;

  select count(*) = 2 into has_cols from pg_attribute
   where attrelid = 'public.profiles'::regclass and attname in ('trello_api_key_id', 'trello_token_id') and not attisdropped;

  create temp table _trello_vault_rb_ids (id uuid primary key) on commit drop;

  if has_cols then
    -- ---- pre-flight --------------------------------------------------------
    select count(*) into half from public.profiles where (trello_api_key_id is null) <> (trello_token_id is null);
    if half > 0 then raise exception '% profile(s) have only one Vault id: refusing to roll back', half; end if;
    if exists (select 1 from public.profiles
                where trello_api_key_id is not null and (coalesce(trello_api_key, '') <> '' or coalesce(trello_token, '') <> '')) then
      raise exception 'a profile has Vault ids AND plaintext credentials: refusing to guess which is current';
    end if;
    if exists (select 1 from public.profiles p
                where (p.trello_api_key_id is not null and not exists (select 1 from vault.secrets s where s.id = p.trello_api_key_id))
                   or (p.trello_token_id   is not null and not exists (select 1 from vault.secrets s where s.id = p.trello_token_id))) then
      raise exception 'a profile points at a Vault secret that no longer exists: that credential cannot be restored, refusing (nothing changed)';
    end if;
    select count(*) into half from public.profiles where (coalesce(trello_api_key, '') <> '') <> (coalesce(trello_token, '') <> '');
    if half > 0 then raise exception '% profile(s) hold half a plaintext pair: refusing', half; end if;

    insert into _trello_vault_rb_ids
      select trello_api_key_id from public.profiles where trello_api_key_id is not null
      union select trello_token_id from public.profiles where trello_token_id is not null;
    select count(*) into expected_connected from public.profiles where trello_api_key_id is not null;

    -- ---- 1. restore plaintext ---------------------------------------------------
    for r in select id, trello_api_key_id as kid, trello_token_id as tid from public.profiles
              where trello_api_key_id is not null order by id for update loop
      select decrypted_secret into v_key   from vault.decrypted_secrets where id = r.kid;
      select decrypted_secret into v_token from vault.decrypted_secrets where id = r.tid;
      if coalesce(v_key, '') = '' or coalesce(v_token, '') = '' then
        raise exception 'profile %: a Vault secret did not decrypt to a value, nothing was changed', r.id;
      end if;
      update public.profiles set trello_api_key = v_key, trello_token = v_token where id = r.id;
      if (select trello_api_key from public.profiles where id = r.id) is distinct from v_key
         or (select trello_token from public.profiles where id = r.id) is distinct from v_token then
        raise exception 'profile %: restored plaintext did not match Vault', r.id;
      end if;
      restored := restored + 1;
    end loop;

    -- ---- 2. trello_connected back on its original expression ------------------------
    alter table public.profiles alter column trello_connected
      set expression as ((coalesce(trello_api_key, '') <> '') and (coalesce(trello_token, '') <> ''));
    if (select count(*) from public.profiles where trello_connected) <> expected_connected then
      raise exception 'trello_connected count after restore (%) differs from the number of restored pairs (%)',
        (select count(*) from public.profiles where trello_connected), expected_connected;
    end if;

    -- ---- 4a. drop the id columns (indexes go with them) ----------------------------
    alter table public.profiles drop column trello_api_key_id, drop column trello_token_id;
  end if;

  -- ---- 3. delete the Vault secrets this feature created ----------------------------------
  -- (no vault.delete_secret() in 0.3.1; a direct DELETE is the supported way)
  delete from vault.secrets
   where id in (select id from _trello_vault_rb_ids)
      or name ~ '^trello_(api_key|token):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  get diagnostics deleted = row_count;

  -- ---- 4b. drop the functions -----------------------------------------------------------
  drop function if exists public.trello_store_credentials(uuid, text, text);
  drop function if exists public.trello_read_credentials(uuid);
  drop function if exists public.trello_clear_credentials(uuid);

  raise notice 'trello_vault rollback: restored % profile(s), deleted % Vault secret(s)%', restored, deleted,
    case when has_cols then '' else ' (id columns were already gone)' end;
end $$;

-- ---- post-flight -------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_attribute where attrelid = 'public.profiles'::regclass and attname in ('trello_api_key_id', 'trello_token_id') and not attisdropped) then
    raise exception 'an id column is still present';
  end if;
  if exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace
               and proname in ('trello_store_credentials', 'trello_read_credentials', 'trello_clear_credentials')) then
    raise exception 'a trello_*_credentials function is still present';
  end if;
  if exists (select 1 from vault.secrets where name like 'trello\_api\_key:%' or name like 'trello\_token:%') then
    raise exception 'a Vault secret created by this feature is still present';
  end if;
  if not exists (select 1
                   from pg_attrdef d join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
                  where d.adrelid = 'public.profiles'::regclass and a.attname = 'trello_connected' and a.attgenerated = 's'
                    and pg_get_expr(d.adbin, d.adrelid) like '%trello_api_key,%' and pg_get_expr(d.adbin, d.adrelid) like '%trello_token,%'
                    and pg_get_expr(d.adbin, d.adrelid) not like '%\_id%') then
    raise exception 'trello_connected is not back on its original expression';
  end if;
  if exists (select 1 from public.profiles where trello_connected is distinct from
              (coalesce(trello_api_key, '') <> '' and coalesce(trello_token, '') <> '')) then
    raise exception 'trello_connected disagrees with the restored plaintext';
  end if;
end $$;

commit;
