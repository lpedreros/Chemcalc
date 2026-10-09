// PROPOSED -- NOT APPLIED. Local replica for the trello_vault tests: an in-process Postgres (PGlite) that reproduces
// what the migration depends on: the Supabase roles, auth.uid(), public.profiles with its real column list, RLS policies and
// its measured grants (table-level `rDxtm` for anon/authenticated + column-level UPDATE on 19 columns), the default
// privileges that hand EXECUTE on every new function to anon/authenticated/service_role, and a Vault STAND-IN with the
// v0.3.1 API (create_secret, update_secret that silently no-ops on a missing id, no delete_secret, vault.secrets,
// vault.decrypted_secrets).
//
// What it is NOT: real pgsodium encryption (the stand-in stores base64, which is enough to prove "the migration only ever
// reads/writes through the Vault API"), nor PostgREST (trello_handler_e2e.test.mjs stands one in), nor Supabase's real
// privilege layout for the vault schema (the live rehearsal script exists to check that against the real database).
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const HERE = dirname(fileURLToPath(import.meta.url));
export const DIR = join(HERE, '..');
export const MIGRATION = readFileSync(join(DIR, '20261009120000_trello_credentials_to_vault.sql'), 'utf8');
export const ROLLBACK = readFileSync(join(DIR, 'rollback.sql'), 'utf8');
export const readRehearsal = () => readFileSync(join(DIR, 'live_rehearsal_rolled_back.sql'), 'utf8');

export const U = {
  leo:   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  maria: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  sam:   'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  noprof:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',   // exists in auth.users, has NO profiles row
};
// Fake credential-shaped values. Every test asserts none of these ever appears in an error, notice or log line.
export const CRED = {
  [U.leo]:   { key: 'KEYLEOLEOLEO1111222233334444', token: 'ATTAtokenLEO1111222233334444555566667777888899990000aaaabbbbcccc' },
  [U.maria]: { key: 'KEYMARIAMARIA111122223333444', token: 'ATTAtokenMARIA11112222333344445555666677778888999900aaaabbbbcccc' },
  [U.sam]:   { key: 'KEYSAMSAMSAM11112222333344445', token: 'ATTAtokenSAM11112222333344445555666677778888999900aaaabbbbccccdd' },
};
export const ALL_SECRET_VALUES = Object.values(CRED).flatMap((c) => [c.key, c.token]);

const SETUP = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator noinherit login;
grant anon, authenticated, service_role to authenticator;
grant usage on schema public to anon, authenticated, service_role;

-- Supabase's default privileges: every function the postgres role creates in public is executable by these roles.
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;

create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(coalesce(current_setting('request.jwt.claim.sub', true), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')), '')::uuid $$;

-- ---- Vault stand-in (supabase_vault 0.3.1 API) ----
create schema vault;
create table vault.secrets (
  id uuid primary key default gen_random_uuid(),
  name text,
  description text not null default '',
  secret text not null,                       -- "ciphertext" (base64 here)
  key_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index secrets_name_idx on vault.secrets (name) where name is not null;
create view vault.decrypted_secrets as
  select id, name, description, secret, convert_from(decode(secret, 'base64'), 'utf8') as decrypted_secret, key_id, created_at, updated_at
    from vault.secrets;
create function vault.create_secret(new_secret text, new_name text default null, new_description text default '', new_key_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
  insert into vault.secrets (secret, name, description, key_id)
  values (encode(convert_to(new_secret, 'utf8'), 'base64'), new_name, coalesce(new_description, ''), new_key_id) returning id into rid;
  return rid;
end $$;
-- like the real one: an unknown id updates zero rows and raises nothing
create function vault.update_secret(secret_id uuid, new_secret text default null, new_name text default null, new_description text default null, new_key_id uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update vault.secrets set
    secret = coalesce(encode(convert_to(new_secret, 'utf8'), 'base64'), secret),
    name = coalesce(new_name, name),
    description = coalesce(new_description, description),
    updated_at = now()
  where id = secret_id;
end $$;
revoke all on schema vault from public, anon, authenticated, service_role;
revoke all on all tables in schema vault from public, anon, authenticated, service_role;
revoke all on all functions in schema vault from public, anon, authenticated, service_role;

-- ---- public.profiles: column list of supabase_schema.sql + later additions, Migration A applied ----
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  email text, full_name text, company_name text, estimate_prefix text default 'EST', logo_url text,
  tier text default 'free', stripe_customer_id text, stripe_subscription_id text, subscription_status text default 'inactive',
  trello_api_key text, trello_token text, trello_board_id text, trello_board_name text, trello_list_id text, trello_list_name text,
  biz_name text, biz_tagline text, biz_phone text, biz_email text, biz_website text, biz_address text, biz_prefix text, biz_logo_url text,
  beta_tester boolean default false,
  biz_custom_terms text,
  trello_connected boolean generated always as (coalesce(trello_api_key, '') <> '' and coalesce(trello_token, '') <> '') stored
);
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Measured live 2026-10-08: authenticated=rDxtm (table-level SELECT, no INSERT/UPDATE/DELETE) + column-level UPDATE.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, company_name, estimate_prefix, logo_url, trello_api_key, trello_token,
              trello_board_id, trello_board_name, trello_list_id, trello_list_name,
              biz_name, biz_tagline, biz_phone, biz_email, biz_website, biz_address, biz_prefix, biz_logo_url, biz_custom_terms)
  on public.profiles to authenticated;
`;

/** A fresh database. `rows`: uid -> {key, token} (either may be undefined/'' to build odd shapes); users without an entry get a plain profile. */
export async function freshDb({ rows = { [U.leo]: CRED[U.leo], [U.maria]: {} }, noProfileUser = true } = {}) {
  const db = new PGlite();
  const notices = [];
  db.notices = notices;
  await db.exec(SETUP);
  for (const [uid, c] of Object.entries(rows)) {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [uid, uid.slice(0, 4) + '@example.test']);
    await db.query('insert into public.profiles (id, email, tier, trello_api_key, trello_token, trello_board_id, trello_board_name, trello_list_id, trello_list_name) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [uid, uid.slice(0, 4) + '@example.test', 'pro', c.key ?? null, c.token ?? null, 'board' + uid.slice(0, 4), 'Jobs', 'list' + uid.slice(0, 4), 'Sent']);
  }
  if (noProfileUser) await db.query('insert into auth.users (id, email) values ($1, $2) on conflict do nothing', [U.noprof, 'np@example.test']);
  return db;
}

/** Run a script the way psql/the SQL editor would: an error aborts the transaction, whatever follows it is moot. */
export async function runScript(db, sql) {
  db.notices.length = 0;
  try {
    await db.exec(sql, { onNotice: (n) => db.notices.push(n.message ?? String(n)) });
    return { ok: true, notices: [...db.notices] };
  } catch (e) {
    try { await db.exec('rollback'); } catch { /* nothing open */ }
    return { ok: false, error: e, message: String(e.message ?? e), code: e.code, notices: [...db.notices] };
  }
}

/** Run fn(tx) as a given role, the way PostgREST does: one transaction, SET LOCAL ROLE, JWT claims in a GUC. */
export async function asRole(db, role, fn, sub = null) {
  return await db.transaction(async (tx) => {
    if (role !== 'postgres') await tx.query(`set local role ${role}`);
    if (sub) await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub, role })]);
    return await fn(tx);
  });
}

/** Everything the migration could touch, in a comparable form. Never contains plaintext values from the vault view. */
export async function snapshot(db) {
  const q = async (sql) => (await db.query(sql)).rows;
  return {
    columns: await q(`select attname, attgenerated, pg_get_expr(d.adbin, d.adrelid) as expr from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
                      where a.attrelid='public.profiles'::regclass and a.attnum>0 and not a.attisdropped order by a.attnum`),
    relacl: (await q(`select relacl::text as acl from pg_class where oid='public.profiles'::regclass`))[0].acl,
    attacl: await q(`select attname, attacl::text as acl from pg_attribute where attrelid='public.profiles'::regclass and attnum>0 and not attisdropped and attacl is not null order by attnum`),
    functions: await q(`select proname, proacl::text as acl from pg_proc where pronamespace='public'::regnamespace order by proname`),
    indexes: await q(`select indexname from pg_indexes where schemaname='public' and tablename='profiles' order by 1`),
    profiles: await q(`select * from public.profiles order by id`),
    vault: (await q(`select to_regclass('vault.secrets') is not null as has`))[0].has ? await q(`select id, name, secret from vault.secrets order by name`) : null,
  };
}

export function assertNoSecrets(text, label = 'text') {
  for (const v of ALL_SECRET_VALUES) if (String(text).includes(v)) throw new Error(`${label} contains a credential value`);
}
