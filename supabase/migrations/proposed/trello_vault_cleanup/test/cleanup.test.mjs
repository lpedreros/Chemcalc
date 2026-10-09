// PROPOSED -- NOT APPLIED. Tests for the cleanup trigger against the PGlite replica of ../../trello_vault/test/replica.mjs
// (roles, RLS, profiles' measured grants, Vault stand-in with the 0.3.1 API) with the Vault migration already applied.
//   (cd ../trello_vault && npm install) && npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshDb, runScript, asRole, snapshot, assertNoSecrets, MIGRATION as VAULT_MIGRATION, U, CRED, ALL_SECRET_VALUES } from '../../trello_vault/test/replica.mjs';
import { DIR, MIGRATION_FILE, extractBody } from './build_rehearsal.mjs';

const MIGRATION = readFileSync(`${DIR}/${MIGRATION_FILE}`, 'utf8');
const ROLLBACK = readFileSync(`${DIR}/rollback.sql`, 'utf8');
const REHEARSAL = () => readFileSync(`${DIR}/live_rehearsal_rolled_back.sql`, 'utf8');
const rows = async (db, sql, p = []) => (await db.query(sql, p)).rows;
const secretCount = async (db) => (await rows(db, 'select count(*)::int n from vault.secrets'))[0].n;
const profileIds = async (db) => (await rows(db, 'select id from public.profiles order by id')).map((r) => r.id);

/** Replica with the Vault migration applied, Supabase Auth's own role, a table that cascades off auth.users, and the signup trigger. */
async function cleanupDb({ rows: seed = { [U.leo]: CRED[U.leo], [U.maria]: CRED[U.maria], [U.sam]: {} }, apply = true } = {}) {
  const db = await freshDb({ rows: seed });
  const v = await runScript(db, VAULT_MIGRATION);
  assert.ok(v.ok, v.message);
  await db.exec(`
    create role supabase_auth_admin superuser nologin;
    grant usage on schema auth to supabase_auth_admin;
    grant select, insert, update, delete on auth.users to supabase_auth_admin;
    create table public.estimates (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, note text);
    insert into public.estimates (user_id, note) select id, 'e' from auth.users;
    create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
      begin insert into public.profiles (id, email) values (new.id, new.email); return new; end $$;
    create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();`);
  if (apply) { const r = await runScript(db, MIGRATION); assert.ok(r.ok, r.message); }
  return db;
}
/** What Supabase Auth does for admin.deleteUser(): its own database role, no SET ROLE, no JWT claims. */
async function deleteAs(db, role, uid) {
  // SET SESSION AUTHORIZATION changes session_user (which SET ROLE cannot), and that is what the Vault functions' caller
  // check looks at. PGlite cannot RESET it for a non-superuser, so the replica's supabase_auth_admin is a SUPERUSER stand-in
  // (the real one is not; nothing here depends on that, the functions are SECURITY DEFINER and RI cascades run as the table owner).
  try {
    if (role !== 'postgres') await db.exec(`set session authorization ${role}`);
    return await db.query('delete from auth.users where id = $1', [uid]);
  } finally {
    if (role !== 'postgres') await db.exec('set session authorization postgres');
  }
}
const idsOf = async (db, uid) => (await rows(db, 'select trello_api_key_id k, trello_token_id t from public.profiles where id = $1', [uid]))[0];
const exists = async (db, ids) => (await rows(db, 'select count(*)::int n from vault.secrets where id = any($1::uuid[])', [[ids.k, ids.t]]))[0].n;

async function assertRefuses(db, script, pattern) {
  const before = await snapshot(db);
  const r = await runScript(db, script);
  assert.equal(r.ok, false);
  assert.match(r.message, pattern);
  assertNoSecrets(r.message);
  assert.deepEqual(await snapshot(db), before, 'a refused script must change nothing');
}

/* ============================ the real paths ============================ */

test('deleting a Trello-connected account removes exactly its two Vault secrets, via every real delete path', async () => {
  for (const role of ['postgres', 'supabase_auth_admin']) {   // (b) direct SQL as postgres, (a) Admin API = Supabase Auth's own role
    const db = await cleanupDb();
    const leo = await idsOf(db, U.leo);
    const maria = await idsOf(db, U.maria);
    assert.equal(await secretCount(db), 4);
    await deleteAs(db, role, U.leo);
    assert.equal(await exists(db, leo), 0, role + ': Leo\'s secrets should be gone');
    assert.equal(await exists(db, maria), 2, role + ': Maria\'s secrets must be untouched');
    assert.equal(await secretCount(db), 2);
    assert.ok(!(await profileIds(db)).includes(U.leo));
    assert.equal((await rows(db, 'select count(*)::int n from public.estimates where user_id = $1', [U.leo]))[0].n, 0, 'other cascades still happen');
    // the survivor still works
    const r = await asRole(db, 'service_role', (tx) => tx.query('select * from public.trello_read_credentials($1)', [U.maria]));
    assert.equal(r.rows[0].api_key, CRED[U.maria].key);
  }
});

test('PostgREST-style deletes also work: service_role deleting the profiles row directly', async () => {
  const db = await cleanupDb();
  const leo = await idsOf(db, U.leo);
  await asRole(db, 'service_role', (tx) => tx.query('delete from public.profiles where id = $1', [U.leo]));
  assert.equal(await exists(db, leo), 0);
  // the browser roles still cannot delete profiles at all (no DELETE grant), trigger or not
  await assert.rejects(asRole(db, 'authenticated', (tx) => tx.query('delete from public.profiles where id = $1', [U.maria]), U.maria), /permission denied/);
  await assert.rejects(asRole(db, 'anon', (tx) => tx.query('delete from public.profiles where id = $1', [U.maria])), /permission denied/);
  assert.equal(await exists(db, await idsOf(db, U.maria)), 2);
});

test('FINDING: reusing trello_clear_credentials from the trigger does not work in either timing, in any delete path', async () => {
  const naive = (timing) => `
    create function public.naive_cleanup() returns trigger language plpgsql security definer set search_path = '' as $$
      begin perform public.trello_clear_credentials(old.id); return old; end $$;
    create trigger naive_cleanup ${timing} delete on public.profiles for each row
      when (old.trello_api_key_id is not null or old.trello_token_id is not null) execute function public.naive_cleanup()`;

  // BEFORE DELETE (the suggested design): the clear function UPDATEs the row that is being deleted -> Postgres refuses, for every path
  for (const role of ['postgres', 'supabase_auth_admin']) {
    const db = await cleanupDb({ apply: false });
    await db.exec(naive('before'));
    const before = await snapshot(db);
    await assert.rejects(deleteAs(db, role, U.leo), (e) => /tuple to be deleted was already modified|service_role only/.test(e.message), role);
    assert.deepEqual(await snapshot(db), before, 'the account must not be half-deleted');
    assert.equal((await rows(db, 'select 1 from auth.users where id = $1', [U.leo])).length, 1);
  }
  // ...and the caller check is a second, independent failure for the Admin-API path: Supabase Auth's role is not allowed
  {
    const db = await cleanupDb({ apply: false });
    await db.exec('set session authorization supabase_auth_admin');
    try {
      await assert.rejects(db.query('select public.trello_clear_credentials($1)', [U.leo]), (e) => e.code === '42501' && /service_role only/.test(e.message));
    } finally { await db.exec('set session authorization postgres'); }
  }
  // AFTER DELETE: the profile row is already gone, so the clear function finds nothing, answers false and deletes NO secret: silent orphans
  for (const role of ['postgres', 'supabase_auth_admin']) {
    const db = await cleanupDb({ apply: false });
    const leo = await idsOf(db, U.leo);
    await db.exec(naive('after'));
    try { await deleteAs(db, role, U.leo); } catch (e) { assert.match(e.message, /service_role only/); continue; }   // auth admin: refused loudly
    assert.equal(await exists(db, leo), 2, role + ': the secrets were silently left behind');
  }
});

test('profile with no Vault ids, user without a profile, half ids, dangling ids: no error, nothing else touched', async () => {
  const db = await cleanupDb();
  const before = await secretCount(db);
  await deleteAs(db, 'supabase_auth_admin', U.sam);          // profile, no ids
  await deleteAs(db, 'postgres', U.noprof);                  // auth user with no profile row at all
  assert.equal(await secretCount(db), before);
  // half a pair of ids
  const maria = await idsOf(db, U.maria);
  await db.query('update public.profiles set trello_token_id = null where id = $1', [U.maria]);
  await deleteAs(db, 'supabase_auth_admin', U.maria);
  assert.equal((await rows(db, 'select count(*)::int n from vault.secrets where id = $1', [maria.k]))[0].n, 0, 'the one referenced secret goes');
  assert.equal((await rows(db, 'select count(*)::int n from vault.secrets where id = $1', [maria.t]))[0].n, 0, 'and so does the one named after the profile');
  // dangling id (secret already gone)
  const leo = await idsOf(db, U.leo);
  await db.query('delete from vault.secrets where id = $1', [leo.t]);
  await deleteAs(db, 'postgres', U.leo);
  assert.equal(await secretCount(db), 0);
});

test('the ordinary non-Trello delete path is unchanged: multi-row delete, cascades, accounts without Trello', async () => {
  const db = await cleanupDb({ rows: { [U.leo]: {}, [U.maria]: {}, [U.sam]: CRED[U.sam] } });
  assert.equal(await secretCount(db), 2);
  await db.query('delete from auth.users where id = any($1::uuid[])', [[U.leo, U.maria, U.sam]]);   // one statement, three rows
  assert.deepEqual(await profileIds(db), []);
  assert.equal(await secretCount(db), 0);
  assert.equal((await rows(db, 'select count(*)::int n from public.estimates where user_id = any($1::uuid[])', [[U.leo, U.maria, U.sam]]))[0].n, 0);
  // inserting and updating profiles is unaffected
  await db.query("insert into auth.users (id, email) values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'e@example.test')");
  await db.query("update public.profiles set trello_board_id = 'x' where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'");
  assert.equal((await profileIds(db)).length, 1);
});

test('a connected account deleted together with others in one statement: every secret goes, only theirs', async () => {
  const db = await cleanupDb({ rows: { [U.leo]: CRED[U.leo], [U.maria]: CRED[U.maria], [U.sam]: CRED[U.sam] } });
  const sam = await idsOf(db, U.sam);
  await deleteAs(db, 'supabase_auth_admin', U.leo);
  await db.query('delete from auth.users where id = $1', [U.maria]);
  assert.equal(await secretCount(db), 2);
  assert.equal(await exists(db, sam), 2);
});

/* ============================ failure and design choices ============================ */

test('if Vault cleanup fails, the whole account deletion fails loudly and nothing is half-deleted', async () => {
  const db = await cleanupDb();
  await db.exec(`create function vault.refuse_delete() returns trigger language plpgsql as $$ begin raise exception 'simulated vault failure'; end $$;
                 create trigger refuse before delete on vault.secrets for each row execute function vault.refuse_delete()`);
  const before = await snapshot(db);
  await assert.rejects(deleteAs(db, 'supabase_auth_admin', U.leo), /simulated vault failure/);
  assert.deepEqual(await snapshot(db), before);
  assert.equal((await rows(db, 'select 1 from auth.users where id = $1', [U.leo])).length, 1);
});

test('AFTER vs BEFORE: with a competing BEFORE trigger that cancels the delete, a BEFORE cleanup would strand the profile with dangling ids; the AFTER trigger does not', async () => {
  const cancel = `create function public.cancel_delete() returns trigger language plpgsql as $$ begin return null; end $$;
                  create trigger z_cancel before delete on public.profiles for each row execute function public.cancel_delete()`;
  // AFTER (the migration): the row is never deleted, so the cleanup never fires and the secrets stay referenced
  let db = await cleanupDb();
  await db.exec(cancel);
  const ids = await idsOf(db, U.leo);
  await db.query('delete from public.profiles where id = $1', [U.leo]);
  assert.equal(await exists(db, ids), 2);
  assert.deepEqual(await idsOf(db, U.leo), ids);
  // BEFORE (the alternative): the secrets are deleted although the profile survives -> dangling ids
  db = await cleanupDb({ apply: false });
  await db.exec(`${cancel};
    create function public.before_cleanup() returns trigger language plpgsql security definer set search_path = '' as $$
      begin delete from vault.secrets where id in (old.trello_api_key_id, old.trello_token_id); return old; end $$;
    create trigger a_before_cleanup before delete on public.profiles for each row execute function public.before_cleanup()`);
  const ids2 = await idsOf(db, U.leo);
  await db.query('delete from public.profiles where id = $1', [U.leo]);
  assert.equal(await exists(db, ids2), 0);
  assert.ok((await rows(db, 'select 1 from public.profiles where id = $1', [U.leo])).length === 1, 'profile survived');
});

test('the trigger function cannot be called, and no role but its owner can execute it', async () => {
  const db = await cleanupDb();
  for (const role of ['anon', 'authenticated', 'service_role']) {
    assert.equal((await rows(db, "select has_function_privilege($1, 'public.trello_cleanup_vault_on_profile_delete()', 'EXECUTE') ok", [role]))[0].ok, false, role);
    await assert.rejects(asRole(db, role, (tx) => tx.query('select public.trello_cleanup_vault_on_profile_delete()'), U.leo), (e) => e.code === '42501');
  }
  await assert.rejects(db.query('select public.trello_cleanup_vault_on_profile_delete()'), /trigger functions can only be called as triggers/);
  // negative control: without the revoke the default privileges DO hand it out
  const db2 = await cleanupDb({ apply: false });
  await db2.exec('create function public.dummy_trigger_fn() returns trigger language plpgsql as $$ begin return null; end $$');
  assert.equal((await rows(db2, "select has_function_privilege('anon','public.dummy_trigger_fn()','EXECUTE') ok"))[0].ok, true);
});

test('the existing Vault functions and grants are not touched by this migration', async () => {
  const db = await freshDb();
  assert.ok((await runScript(db, VAULT_MIGRATION)).ok);
  const before = await snapshot(db);
  assert.ok((await runScript(db, MIGRATION)).ok);
  const after = await snapshot(db);
  assert.equal(after.relacl, before.relacl);
  assert.deepEqual(after.attacl, before.attacl);
  assert.deepEqual(after.columns, before.columns);
  assert.deepEqual(after.profiles, before.profiles);
  assert.deepEqual(after.vault, before.vault);
  const trello = (s) => s.functions.filter((f) => /^trello_(store|read|clear)_credentials$/.test(f.proname));
  assert.deepEqual(trello(after), trello(before));
  assert.equal(after.functions.length, before.functions.length + 1);
});

/* ============================ migration mechanics ============================ */

test('idempotent: second and third run change nothing and pass', async () => {
  const db = await cleanupDb({ apply: false });
  assert.ok((await runScript(db, MIGRATION)).ok);
  const one = await snapshot(db);
  const trig = async () => rows(db, "select tgname, tgenabled, tgtype from pg_trigger where tgrelid = 'public.profiles'::regclass and not tgisinternal order by 1");
  const t1 = await trig();
  for (let i = 0; i < 2; i += 1) {
    const r = await runScript(db, MIGRATION);
    assert.ok(r.ok, r.message);
    assert.ok(r.notices.some((n) => n.includes('swept 0 orphaned')));
  }
  assert.deepEqual(await snapshot(db), one);
  assert.deepEqual(await trig(), t1);
  assert.equal(t1.filter((t) => t.tgname === 'trello_cleanup_vault_on_profile_delete').length, 1);
});

test('one-time sweep: removes orphaned Trello secrets only (unreferenced, no profile with that uuid); keeps referenced, named-for-live-profile and unrelated secrets', async () => {
  const db = await cleanupDb({ apply: false });
  const ghost = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  await db.exec(`select vault.create_secret('GHOSTKEYVALUE1234', 'trello_api_key:${ghost}'), vault.create_secret('GHOSTTOKENVALUE1234', 'trello_token:${ghost}');
                 select vault.create_secret('unrelated-secret-value', 'stripe_webhook');
                 select vault.create_secret('stale-but-live', 'trello_api_key:${U.sam}');     -- profile sam exists: kept (conservative)
                 select vault.create_secret('no-name-secret');`);
  const before = await secretCount(db);   // leo 2 + maria 2 + ghost 2 + 3 others
  const r = await runScript(db, MIGRATION);
  assert.ok(r.ok, r.message);
  assert.ok(r.notices.some((n) => n.includes('swept 2 orphaned')), r.notices.join('|'));
  assert.equal(await secretCount(db), before - 2);
  assert.equal((await rows(db, "select count(*)::int n from vault.secrets where name like '%' || $1", [ghost]))[0].n, 0);
  assert.equal((await rows(db, "select count(*)::int n from vault.secrets where name in ('stripe_webhook', 'trello_api_key:' || $1)", [U.sam]))[0].n, 2);
  assert.equal(await exists(db, await idsOf(db, U.leo)), 2);
  for (const n of r.notices) assertNoSecrets(n);
});

test('refuses (nothing changed): Vault migration missing, missing Vault privileges, not the table owner', async () => {
  let db = await freshDb();                                  // no Vault migration applied
  await assertRefuses(db, MIGRATION, /missing column\(s\): trello_api_key_id, trello_token_id/);

  const setup = async (grants, owner = 'migrator') => {
    const d = await cleanupDb({ apply: false });
    await d.exec(`create role migrator nologin; grant usage, create on schema public to migrator; grant usage on schema vault to migrator; ${grants};
                  alter table public.profiles owner to ${owner}`);
    return d;
  };
  const full = 'grant select, delete on vault.secrets to migrator';
  let d = await setup(full);                                  // positive control: a non-superuser owner with the grants can apply it
  await d.exec('set role migrator');
  const ok = await runScript(d, MIGRATION);
  await d.exec('reset role');
  assert.ok(ok.ok, ok.message);

  d = await setup('grant select on vault.secrets to migrator');
  const before = await snapshot(d);
  await d.exec('set role migrator');
  const r = await runScript(d, MIGRATION);
  await d.exec('reset role');
  assert.equal(r.ok, false);
  assert.match(r.message, /missing Vault privileges/);
  assert.deepEqual(await snapshot(d), before);

  d = await setup(full, 'postgres');                          // grants fine, but migrator does not own profiles
  await d.exec('set role migrator');
  const r2 = await runScript(d, MIGRATION);
  await d.exec('reset role');
  assert.equal(r2.ok, false);
  assert.match(r2.message, /not the owner of public\.profiles/);
});

test('post-flight catches a disabled trigger and a mutation that leaves EXECUTE on the function (nothing committed)', async () => {
  const db = await cleanupDb({ apply: false });
  const mutated = MIGRATION.replace('revoke all on function public.trello_cleanup_vault_on_profile_delete() from public, anon, authenticated, service_role;', '-- (revoke removed)');
  assert.notEqual(mutated, MIGRATION);
  await assertRefuses(db, mutated, /(anon|authenticated|service_role) can EXECUTE the trigger function/);
  const db2 = await cleanupDb({ apply: false });
  const mutated2 = MIGRATION.replace('create or replace trigger trello_cleanup_vault_on_profile_delete\n  after delete', 'create or replace trigger trello_cleanup_vault_on_profile_delete\n  before delete');
  assert.notEqual(mutated2, MIGRATION);
  await assertRefuses(db2, mutated2, /not AFTER DELETE FOR EACH ROW/);
});

/* ============================ rollback ============================ */

test('rollback removes the trigger and function only, is idempotent, and leaves the Vault feature intact; deletes then orphan again (the pre-migration state)', async () => {
  const db = await cleanupDb({ apply: false });
  const before = await snapshot(db);
  assert.ok((await runScript(db, MIGRATION)).ok);
  const r = await runScript(db, ROLLBACK);
  assert.ok(r.ok, r.message);
  assert.deepEqual(await snapshot(db), before);
  assert.ok((await runScript(db, ROLLBACK)).ok);
  assert.deepEqual(await snapshot(db), before);
  const ids = await idsOf(db, U.leo);
  await deleteAs(db, 'postgres', U.leo);
  assert.equal(await exists(db, ids), 2, 'without the trigger the secrets are orphaned again');
  // and re-applying afterwards sweeps them
  const again = await runScript(db, MIGRATION);
  assert.ok(again.ok);
  assert.ok(again.notices.some((n) => n.includes('swept 2 orphaned')), again.notices.join('|'));
});

/* ============================ rehearsal ============================ */

test('rehearsal script embeds the migration body verbatim', () => {
  assert.ok(REHEARSAL().includes(extractBody(MIGRATION)), 'stale: run node test/build_rehearsal.mjs');
});

test('rehearsal script on the replica: deliberate error, every check ok, commits nothing, prints no credential', async () => {
  for (const seed of [undefined, { rows: { [U.leo]: {} } }]) {
    const db = await cleanupDb({ ...(seed ?? {}), apply: false });
    const before = await snapshot(db);
    const r = await runScript(db, REHEARSAL());
    assert.equal(r.ok, false);
    assert.match(r.message, /^REHEARSAL_ROLLBACK \(deliberate, nothing committed\):/);
    assert.doesNotMatch(r.message, /REHEARSAL_FAILED/);
    assertNoSecrets(r.message);
    assert.doesNotMatch(r.message, /REHEARSALKEY|REHEARSALTOKEN/);
    for (const n of r.notices) assertNoSecrets(n);
    const lines = r.message.split('\n').slice(1);
    assert.ok(lines.length >= 5 && lines.every((l) => /^ok /.test(l)), r.message);
    assert.deepEqual(await snapshot(db), before, 'the rehearsal committed something');
    assert.equal((await rows(db, "select count(*)::int n from pg_trigger where tgrelid='public.profiles'::regclass and tgname='trello_cleanup_vault_on_profile_delete'"))[0].n, 0);
  }
});

test('rehearsal script reports FAILED (still committing nothing) when the trigger does not do its job', async () => {
  const db = await cleanupDb({ apply: false });
  const before = await snapshot(db);
  const broken = REHEARSAL().replace('when (old.trello_api_key_id is not null or old.trello_token_id is not null)', 'when (false)');
  assert.notEqual(broken, REHEARSAL());
  const r = await runScript(db, broken);
  assert.equal(r.ok, false);
  assert.match(r.message, /REHEARSAL_FAILED/);
  assert.deepEqual(await snapshot(db), before);
});

test('every proposed file carries the PROPOSED -- NOT APPLIED banner', () => {
  for (const f of [MIGRATION_FILE, 'rollback.sql', 'live_rehearsal_rolled_back.sql']) {
    assert.match(readFileSync(`${DIR}/${f}`, 'utf8').slice(0, 300), /PROPOSED -- NOT APPLIED/, f);
  }
  assert.ok(ALL_SECRET_VALUES.length > 0);
});
