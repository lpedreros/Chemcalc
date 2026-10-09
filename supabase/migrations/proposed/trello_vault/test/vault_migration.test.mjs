// PROPOSED -- NOT APPLIED. Migration / rollback / rehearsal tests against the PGlite replica (see replica.mjs for what it is).
//   npm install && npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDb, runScript, asRole, snapshot, assertNoSecrets, MIGRATION, ROLLBACK, readRehearsal, U, CRED, ALL_SECRET_VALUES } from './replica.mjs';
import { extractBody } from './build_rehearsal.mjs';

const FNS = ['trello_store_credentials', 'trello_read_credentials', 'trello_clear_credentials'];
const FN_SIGS = ['public.trello_store_credentials(uuid,text,text)', 'public.trello_read_credentials(uuid)', 'public.trello_clear_credentials(uuid)'];
const rows = async (db, sql, p = []) => (await db.query(sql, p)).rows;
const migrate = async (db, sql = MIGRATION) => { const r = await runScript(db, sql); assert.ok(r.ok, 'migration failed: ' + r.message); return r; };
const asService = (db, fn) => asRole(db, 'service_role', fn);
const read = (db, uid) => asService(db, async (tx) => (await tx.query('select * from public.trello_read_credentials($1)', [uid])).rows[0]);

/** A refusal must be loud (error), carry no credential value, and leave EVERYTHING as it was. */
async function assertRefuses(db, script, messagePattern) {
  const before = await snapshot(db);
  const r = await runScript(db, script);
  assert.equal(r.ok, false, 'expected a refusal, but the script committed');
  assert.match(r.message, messagePattern);
  assertNoSecrets(r.message, 'error message');
  for (const n of r.notices) assertNoSecrets(n, 'notice');
  assert.deepEqual(await snapshot(db), before, 'a refused script must change nothing');
  return r;
}

/* ============================ happy path ============================ */

test('migrates the one connected profile: plaintext nulled, Vault holds the originals, ids set, flag still true', async () => {
  const db = await freshDb();
  const r = await migrate(db);
  assert.ok(r.notices.some((n) => n.includes('moved 1 profile(s) into Vault')));
  const [leo] = await rows(db, 'select * from public.profiles where id = $1', [U.leo]);
  assert.equal(leo.trello_api_key, null);
  assert.equal(leo.trello_token, null);
  assert.ok(leo.trello_api_key_id && leo.trello_token_id);
  assert.equal(leo.trello_connected, true);
  // plaintext columns still exist (safety net), just empty
  assert.equal((await rows(db, "select count(*)::int n from pg_attribute where attrelid='public.profiles'::regclass and attname in ('trello_api_key','trello_token') and not attisdropped"))[0].n, 2);
  const v = await rows(db, 'select id, decrypted_secret from vault.decrypted_secrets order by name');
  assert.equal(v.length, 2);
  assert.deepEqual(new Set(v.map((x) => x.decrypted_secret)), new Set([CRED[U.leo].key, CRED[U.leo].token]));
  assert.deepEqual(await read(db, U.leo), { api_key: CRED[U.leo].key, token: CRED[U.leo].token });
  const [maria] = await rows(db, 'select trello_connected, trello_api_key_id from public.profiles where id = $1', [U.maria]);
  assert.equal(maria.trello_connected, false);
  assert.equal(maria.trello_api_key_id, null);
  for (const n of r.notices) assertNoSecrets(n, 'notice');
});

test('handles 0 and N rows generically (0, 3)', async () => {
  const none = await freshDb({ rows: { [U.leo]: {}, [U.maria]: {} } });
  const r0 = await migrate(none);
  assert.ok(r0.notices.some((n) => n.includes('moved 0 profile(s)')));
  assert.equal((await rows(none, 'select count(*)::int n from vault.secrets'))[0].n, 0);

  const three = await freshDb({ rows: { [U.leo]: CRED[U.leo], [U.maria]: CRED[U.maria], [U.sam]: CRED[U.sam] } });
  const r3 = await migrate(three);
  assert.ok(r3.notices.some((n) => n.includes('moved 3 profile(s)')));
  for (const uid of [U.leo, U.maria, U.sam]) assert.deepEqual(await read(three, uid), { api_key: CRED[uid].key, token: CRED[uid].token });
  assert.equal((await rows(three, 'select count(*)::int n from public.profiles where trello_connected'))[0].n, 3);
  assert.equal((await rows(three, 'select count(*)::int n from vault.secrets'))[0].n, 6);
});

test('idempotent: a second (and third) run is a no-op that passes, with identical state', async () => {
  const db = await freshDb();
  await migrate(db);
  const after1 = await snapshot(db);
  const r2 = await migrate(db);
  assert.ok(r2.notices.some((n) => n.includes('moved 0 profile(s)')));
  assert.ok(r2.notices.some((n) => n.includes('already follows the id columns')));
  assert.deepEqual(await snapshot(db), after1, 'second run changed something');
  await migrate(db);
  assert.deepEqual(await snapshot(db), after1, 'third run changed something');
});

test('trello_connected: SET EXPRESSION keeps the column, its generation and every ACL; the expression now follows the ids', async () => {
  const db = await freshDb();
  const before = await snapshot(db);
  await migrate(db);
  const after = await snapshot(db);
  assert.equal(after.relacl, before.relacl);
  assert.deepEqual(after.attacl.filter((a) => a.attname === 'trello_connected'), before.attacl.filter((a) => a.attname === 'trello_connected'));
  const col = (s) => s.columns.find((c) => c.attname === 'trello_connected');
  assert.equal(col(before).attgenerated, 's');
  assert.equal(col(after).attgenerated, 's');
  assert.match(col(before).expr, /trello_api_key,/);
  assert.match(col(after).expr, /trello_api_key_id/);
  assert.doesNotMatch(col(after).expr, /trello_api_key,/);
  // readers keep their SELECT on it
  await asRole(db, 'authenticated', async (tx) => {
    const r = await tx.query('select trello_connected from public.profiles where id = $1', [U.leo]);
    assert.equal(r.rows[0].trello_connected, true);
  }, U.leo);
});

/* ============================ grants / the landmine ============================ */

test('landmine: the replica reproduces the measured grants (table-level rDxtm), and the migration never touches table/column grants', async () => {
  const db = await freshDb();
  const before = await snapshot(db);
  assert.match(before.relacl, /authenticated=rDxtm\/postgres/);   // table-level SELECT, the thing information_schema makes look column-level
  assert.match(before.relacl, /anon=rDxtm\/postgres/);
  await migrate(db);
  const after = await snapshot(db);
  assert.equal(after.relacl, before.relacl);
  assert.deepEqual(after.attacl.map((a) => a.attname).sort(), before.attacl.map((a) => a.attname).sort());   // same column-level grants as before
  // The new id columns inherit the table-level SELECT (known, documented until Migration B) but are not writable by the browser roles.
  for (const role of ['anon', 'authenticated']) {
    for (const col of ['trello_api_key_id', 'trello_token_id']) {
      assert.equal((await rows(db, 'select has_column_privilege($1, $2, $3, $4) ok', [role, 'public.profiles', col, 'UPDATE']))[0].ok, false);
      assert.equal((await rows(db, 'select has_column_privilege($1, $2, $3, $4) ok', [role, 'public.profiles', col, 'INSERT']))[0].ok, false);
    }
  }
  assert.equal((await rows(db, "select has_column_privilege('authenticated','public.profiles','trello_api_key_id','SELECT') ok"))[0].ok, true);
  // ...and a real UPDATE attempt by a signed-in user is refused
  await assert.rejects(asRole(db, 'authenticated', (tx) => tx.query('update public.profiles set trello_token_id = gen_random_uuid() where id = $1', [U.leo]), U.leo), /permission denied/);
  // Browser roles cannot reach the vault schema at all
  await assert.rejects(asRole(db, 'authenticated', (tx) => tx.query('select * from vault.decrypted_secrets'), U.leo), /permission denied/);
});

test('function ACLs: negative control shows the default privileges DO hand EXECUTE to anon/authenticated; after the migration only service_role holds it (checked per role, per function)', async () => {
  const db = await freshDb();
  await db.exec('create function public.dummy_default_priv() returns int language sql as $$ select 1 $$');
  assert.equal((await rows(db, "select has_function_privilege('anon','public.dummy_default_priv()','EXECUTE') a, has_function_privilege('authenticated','public.dummy_default_priv()','EXECUTE') b"))[0].a, true);
  await migrate(db);
  for (const sig of FN_SIGS) {
    const [m] = await rows(db, `select has_function_privilege('anon', $1, 'EXECUTE') anon, has_function_privilege('authenticated', $1, 'EXECUTE') auth, has_function_privilege('service_role', $1, 'EXECUTE') svc, has_function_privilege('authenticator', $1, 'EXECUTE') authr`, [sig]);
    assert.deepEqual(m, { anon: false, auth: false, svc: true, authr: false /* authenticator is NOINHERIT: it gets service_role's rights only through SET ROLE, as PostgREST does */ }, sig);
    const acl = (await rows(db, 'select proacl::text a from pg_proc where oid = $1::regprocedure', [sig]))[0].a;
    assert.doesNotMatch(acl, /(^|[{,])=X/, 'PUBLIC entry present: ' + acl);
    assert.doesNotMatch(acl, /anon=|authenticated=/);
    assert.match(acl, /service_role=X\/postgres/);
  }
  // actual calls
  for (const role of ['anon', 'authenticated']) {
    await assert.rejects(asRole(db, role, (tx) => tx.query('select * from public.trello_read_credentials($1)', [U.leo]), U.leo), (e) => e.code === '42501' && /permission denied for function/.test(e.message));
    await assert.rejects(asRole(db, role, (tx) => tx.query('select public.trello_clear_credentials($1)', [U.leo]), U.leo), (e) => e.code === '42501');
    await assert.rejects(asRole(db, role, (tx) => tx.query("select public.trello_store_credentials($1,'a','b')", [U.leo]), U.leo), (e) => e.code === '42501');
  }
  assert.deepEqual(await read(db, U.leo), { api_key: CRED[U.leo].key, token: CRED[U.leo].token });
});

test('defense in depth: even if EXECUTE were re-granted to anon/authenticated, the functions themselves refuse non-service callers', async () => {
  const db = await freshDb();
  await migrate(db);
  for (const sig of FN_SIGS) await db.exec(`grant execute on function ${sig} to anon, authenticated, public`);
  for (const role of ['anon', 'authenticated']) {
    for (const call of ['select * from public.trello_read_credentials($1)', 'select public.trello_clear_credentials($1)']) {
      await assert.rejects(asRole(db, role, (tx) => tx.query(call, [U.leo]), U.leo), (e) => e.code === '42501' && /service_role only/.test(e.message), role + ' ' + call);
    }
    await assert.rejects(asRole(db, role, (tx) => tx.query("select public.trello_store_credentials($1,'AAAAAAAAAA','BBBBBBBBBB')", [U.leo]), U.leo), (e) => /service_role only/.test(e.message));
  }
  // the credential is untouched by those attempts
  assert.deepEqual(await read(db, U.leo), { api_key: CRED[U.leo].key, token: CRED[U.leo].token });
  // a direct admin session (SQL editor) is allowed; service_role is allowed
  assert.equal((await db.query('select * from public.trello_read_credentials($1)', [U.leo])).rows.length, 1);
});

test('mutation check: if the migration revoked from PUBLIC only (the mistake the brief warns about), its own post-flight refuses', async () => {
  const db = await freshDb();
  const mutated = MIGRATION.replaceAll('from public, anon, authenticated;', 'from public;');
  assert.notEqual(mutated, MIGRATION);
  await assertRefuses(db, mutated, /(anon|authenticated) can EXECUTE/);
});

/* ============================ failure modes: refuse loudly, change nothing ============================ */

test('refuses: half a plaintext pair (key without token)', async () => {
  const db = await freshDb({ rows: { [U.leo]: { key: CRED[U.leo].key }, [U.maria]: CRED[U.maria] } });
  await assertRefuses(db, MIGRATION, /1 profile\(s\) hold only one of trello_api_key \/ trello_token/);
  const db2 = await freshDb({ rows: { [U.leo]: { token: CRED[U.leo].token } } });
  await assertRefuses(db2, MIGRATION, /half a pair/);
});

test('refuses: half a pair of Vault ids, dangling ids, ids plus plaintext', async () => {
  const mk = async () => { const db = await freshDb(); await migrate(db); return db; };
  let db = await mk();
  await db.query('update public.profiles set trello_token_id = null where id = $1', [U.leo]);
  await assertRefuses(db, MIGRATION, /only one of trello_api_key_id \/ trello_token_id/);

  db = await mk();
  await db.query('delete from vault.secrets where id = (select trello_token_id from public.profiles where id = $1)', [U.leo]);
  await assertRefuses(db, MIGRATION, /Vault secret that does not exist/);

  db = await mk();
  await db.query("update public.profiles set trello_api_key = 'SOMETHINGELSE12345', trello_token = 'SOMETHINGELSE67890' where id = $1", [U.leo]);
  await assertRefuses(db, MIGRATION, /Vault ids AND plaintext/);
});

test('refuses: missing Vault privileges (non-superuser migrator without DELETE on vault.secrets / without EXECUTE on create_secret)', async () => {
  const setup = async (grants) => {
    const db = await freshDb();
    await db.exec(`create role migrator nologin; alter table public.profiles owner to migrator; grant usage, create on schema public to migrator;
      grant usage on schema vault to migrator; ${grants}; set role migrator`);
    return db;
  };
  const full = `grant select, delete on vault.secrets to migrator; grant select on vault.decrypted_secrets to migrator;
                grant execute on function vault.create_secret(text,text,text,uuid), vault.update_secret(uuid,text,text,text,uuid) to migrator`;
  // positive control: with the grants the migration needs, a non-superuser owner can run it (so the checks above are not just over-strict)
  let db = await setup(full);
  const ok = await runScript(db, MIGRATION);
  assert.ok(ok.ok, ok.message);

  db = await setup(full.replace('select, delete on vault.secrets', 'select on vault.secrets'));
  let before = await snapshot(await (async () => { await db.exec('reset role'); return db; })());
  await db.exec('set role migrator');
  let r = await runScript(db, MIGRATION);
  assert.equal(r.ok, false);
  assert.match(r.message, /missing Vault privileges/);
  await db.exec('reset role');
  assert.deepEqual(await snapshot(db), before);

  db = await setup(full.replace('vault.create_secret(text,text,text,uuid), ', ''));
  await db.exec('reset role'); before = await snapshot(db); await db.exec('set role migrator');
  r = await runScript(db, MIGRATION);
  assert.equal(r.ok, false);
  assert.match(r.message, /missing Vault privileges/);
  await db.exec('reset role');
  assert.deepEqual(await snapshot(db), before);
});

test('refuses: Vault read-back/decrypt failure during the data move (decrypted_secrets yields nothing usable); no secret is left behind', async () => {
  const db = await freshDb();
  await db.exec(`drop view vault.decrypted_secrets;
    create view vault.decrypted_secrets as select id, name, description, secret, null::text as decrypted_secret, key_id, created_at, updated_at from vault.secrets`);
  await assertRefuses(db, MIGRATION, /Vault read-back did not match for profile/);
  assert.equal((await rows(db, 'select count(*)::int n from vault.secrets'))[0].n, 0);
});

test('refuses: Vault unavailable (no vault schema / wrong version)', async () => {
  let db = await freshDb();
  await db.exec('drop schema vault cascade');
  await assertRefuses(db, MIGRATION, /schema vault does not exist/);
  db = await freshDb();
  await db.exec('drop function vault.update_secret(uuid,text,text,text,uuid)');
  await assertRefuses(db, MIGRATION, /Vault function .*update_secret.* not found/);
});

test('refuses: Migration A missing, or the lock-down missing (table-level UPDATE for authenticated)', async () => {
  let db = await freshDb();
  await db.exec('alter table public.profiles drop column trello_connected');
  await assertRefuses(db, MIGRATION, /missing column\(s\): trello_connected \(is Migration A applied/);
  db = await freshDb();
  await db.exec('grant update on public.profiles to authenticated');
  await assertRefuses(db, MIGRATION, /table-level UPDATE on public\.profiles \(pg_class\.relacl\)/);
});

test('refuses to commit when a plaintext credential survives the move (a trigger puts one back); nothing changes', async () => {
  const db = await freshDb();
  await db.exec(`create function public.leave_plaintext() returns trigger language plpgsql as $$ begin new.trello_token := 'LEFTOVERLEFTOVER'; return new; end $$;
    create trigger leave_plaintext before update on public.profiles for each row when (new.trello_token is null) execute function public.leave_plaintext()`);
  await assertRefuses(db, MIGRATION, /plaintext Trello credential survives/);
});

/* ============================ the functions themselves ============================ */

test('functions: store (new / update / dangling id), read (not connected, half ids, decrypt failure), clear, bad arguments', async () => {
  const db = await freshDb({ rows: { [U.leo]: CRED[U.leo], [U.maria]: {}, [U.sam]: {} } });
  await migrate(db);
  const svc = (sql, p) => asService(db, async (tx) => (await tx.query(sql, p)).rows);

  // read: unconnected, unknown profile, user without profile -> nulls, never an error
  assert.deepEqual(await read(db, U.maria), { api_key: null, token: null });
  assert.deepEqual(await read(db, U.noprof), { api_key: null, token: null });
  assert.deepEqual(await read(db, 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'), { api_key: null, token: null });

  // store: new connection for maria
  const m = CRED[U.maria];
  assert.equal((await svc('select public.trello_store_credentials($1,$2,$3) ok', [U.maria, m.key, m.token]))[0].ok, true);
  assert.deepEqual(await read(db, U.maria), { api_key: m.key, token: m.token });
  assert.equal((await rows(db, 'select trello_connected, trello_api_key, trello_token from public.profiles where id=$1', [U.maria]))[0].trello_connected, true);
  const idsBefore = await rows(db, 'select trello_api_key_id k, trello_token_id t from public.profiles where id=$1', [U.maria]);
  // store again with new values: UPDATE path, same secret ids, new values
  assert.equal((await svc('select public.trello_store_credentials($1,$2,$3) ok', [U.maria, 'NEWKEYNEWKEY1234', 'NEWTOKENNEWTOKEN1234']))[0].ok, true);
  assert.deepEqual(await read(db, U.maria), { api_key: 'NEWKEYNEWKEY1234', token: 'NEWTOKENNEWTOKEN1234' });
  assert.deepEqual(await rows(db, 'select trello_api_key_id k, trello_token_id t from public.profiles where id=$1', [U.maria]), idsBefore);
  assert.equal((await rows(db, 'select count(*)::int n from vault.secrets'))[0].n, 4);   // leo 2 + maria 2, no leak of old versions
  // no such profile -> false, creates nothing
  assert.equal((await svc("select public.trello_store_credentials($1,'AAAAAAAAAA','BBBBBBBBBB') ok", [U.noprof]))[0].ok, false);
  assert.equal((await rows(db, 'select count(*)::int n from vault.secrets'))[0].n, 4);

  // the Vault trap: update_secret on a missing id does NOTHING and says nothing...
  await db.exec("select vault.update_secret('99999999-9999-4999-8999-999999999999', 'x')");
  assert.equal((await rows(db, "select count(*)::int n from vault.secrets where secret = encode(convert_to('x','utf8'),'base64')"))[0].n, 0);
  // ...so a profile whose secret vanished gets a NEW secret on store (and the read-back confirms it)
  await db.query('delete from vault.secrets where id = (select trello_token_id from public.profiles where id=$1)', [U.maria]);
  await assert.rejects(read(db, U.maria), (e) => e.code === 'XX000' && /could not be decrypted/.test(e.message));   // loud, not "not connected"
  assert.equal((await svc('select public.trello_store_credentials($1,$2,$3) ok', [U.maria, m.key, m.token]))[0].ok, true);
  assert.deepEqual(await read(db, U.maria), { api_key: m.key, token: m.token });

  // half a pair of ids reads as not connected (the same condition trello_connected uses)
  await db.query('update public.profiles set trello_token_id = null where id=$1', [U.sam]);
  assert.deepEqual(await read(db, U.sam), { api_key: null, token: null });

  // clear: deletes both secrets, nulls everything, false for an unknown profile, idempotent
  const kt = (await rows(db, 'select trello_api_key_id k, trello_token_id t from public.profiles where id=$1', [U.maria]))[0];
  assert.equal((await svc('select public.trello_clear_credentials($1) ok', [U.maria]))[0].ok, true);
  assert.equal((await rows(db, 'select count(*)::int n from vault.secrets where id in ($1,$2)', [kt.k, kt.t]))[0].n, 0);
  assert.deepEqual(await rows(db, 'select trello_connected, trello_api_key, trello_token, trello_api_key_id, trello_token_id from public.profiles where id=$1', [U.maria]),
    [{ trello_connected: false, trello_api_key: null, trello_token: null, trello_api_key_id: null, trello_token_id: null }]);
  assert.equal((await svc('select public.trello_clear_credentials($1) ok', [U.maria]))[0].ok, true);
  assert.equal((await svc('select public.trello_clear_credentials($1) ok', [U.noprof]))[0].ok, false);
  assert.deepEqual(await read(db, U.maria), { api_key: null, token: null });
  // clearing a corrupted profile (dangling id) still works
  await db.query('delete from vault.secrets where id = (select trello_api_key_id from public.profiles where id=$1)', [U.leo]);
  assert.equal((await svc('select public.trello_clear_credentials($1) ok', [U.leo]))[0].ok, true);

  // bad arguments
  await assert.rejects(svc("select public.trello_store_credentials(null,'a','b')"), (e) => e.code === '22004');
  await assert.rejects(svc("select public.trello_store_credentials($1,'','b')", [U.sam]), (e) => e.code === '22023');
  await assert.rejects(svc("select public.trello_store_credentials($1,'a',null)", [U.sam]), (e) => e.code === '22023');
  await assert.rejects(svc('select * from public.trello_read_credentials(null)'), (e) => e.code === '22004');
  await assert.rejects(svc('select public.trello_clear_credentials(null)'), (e) => e.code === '22004');
});

test('functions: update_secret no-op (stub that silently does nothing) is caught by the read-back; the old value and the row stay', async () => {
  const db = await freshDb();
  await migrate(db);
  await db.exec(`create or replace function vault.update_secret(secret_id uuid, new_secret text default null, new_name text default null, new_description text default null, new_key_id uuid default null)
                 returns void language plpgsql as $$ begin null; end $$`);
  const before = await snapshot(db);
  await assert.rejects(asService(db, (tx) => tx.query("select public.trello_store_credentials($1,'REPLACEDKEY1234','REPLACEDTOKEN1234')", [U.leo])),
    (e) => e.code === 'XX000' && /read-back of the API key did not match/.test(e.message) && !ALL_SECRET_VALUES.some((v) => e.message.includes(v)));
  assert.deepEqual(await snapshot(db), before);
  assert.deepEqual(await read(db, U.leo), { api_key: CRED[U.leo].key, token: CRED[U.leo].token });
});

test('functions: decrypt failure after migration is loud on read and on store, and nothing is written', async () => {
  const db = await freshDb();
  await migrate(db);
  await db.exec(`drop view vault.decrypted_secrets;
    create view vault.decrypted_secrets as select id, name, description, secret, null::text as decrypted_secret, key_id, created_at, updated_at from vault.secrets`);
  await assert.rejects(read(db, U.leo), (e) => e.code === 'XX000' && /could not be decrypted/.test(e.message));
  const before = await snapshot(db);
  await assert.rejects(asService(db, (tx) => tx.query("select public.trello_store_credentials($1,'REPLACEDKEY1234','REPLACEDTOKEN1234')", [U.leo])), /read-back/);
  assert.deepEqual(await snapshot(db), before);
});

/* ============================ rollback ============================ */

test('rollback: restores every credential (migrated AND connected-after-migration) as plaintext, original trello_connected expression, nothing of the feature left', async () => {
  const db = await freshDb({ rows: { [U.leo]: CRED[U.leo], [U.maria]: {}, [U.sam]: {} } });
  const original = await snapshot(db);
  await migrate(db);
  // someone connects AFTER the migration: their credential exists ONLY in Vault
  await asService(db, (tx) => tx.query('select public.trello_store_credentials($1,$2,$3)', [U.sam, CRED[U.sam].key, CRED[U.sam].token]));
  assert.equal((await rows(db, 'select trello_api_key from public.profiles where id=$1', [U.sam]))[0].trello_api_key, null);

  const r = await runScript(db, ROLLBACK);
  assert.ok(r.ok, r.message);
  assert.ok(r.notices.some((n) => n.includes('restored 2 profile(s), deleted 4 Vault secret(s)')), r.notices.join('|'));
  const after = await snapshot(db);
  const byId = (s) => Object.fromEntries(s.profiles.map((p) => [p.id, p]));
  assert.equal(byId(after)[U.leo].trello_api_key, CRED[U.leo].key);
  assert.equal(byId(after)[U.leo].trello_token, CRED[U.leo].token);
  assert.equal(byId(after)[U.sam].trello_api_key, CRED[U.sam].key);   // the post-migration connection survived the rollback
  assert.equal(byId(after)[U.sam].trello_token, CRED[U.sam].token);
  assert.deepEqual([U.leo, U.maria, U.sam].map((u) => byId(after)[u].trello_connected), [true, false, true]);
  // structure is back to exactly the original: columns, generation expression text, ACLs, no feature functions/indexes/secrets
  assert.deepEqual(after.columns, original.columns);
  assert.equal(after.relacl, original.relacl);
  assert.deepEqual(after.attacl, original.attacl);
  assert.deepEqual(after.functions.map((f) => f.proname), original.functions.map((f) => f.proname));
  assert.deepEqual(after.indexes, original.indexes);
  assert.deepEqual(after.vault, []);
  for (const n of r.notices) assertNoSecrets(n, 'notice');
});

test('rollback is idempotent; a rollback then a re-migration round-trips', async () => {
  const db = await freshDb();
  await migrate(db);
  assert.ok((await runScript(db, ROLLBACK)).ok);
  const afterFirst = await snapshot(db);
  const second = await runScript(db, ROLLBACK);
  assert.ok(second.ok, second.message);
  assert.ok(second.notices.some((n) => n.includes('restored 0 profile(s)')));
  assert.deepEqual(await snapshot(db), afterFirst);
  await migrate(db);
  assert.deepEqual(await read(db, U.leo), { api_key: CRED[U.leo].key, token: CRED[U.leo].token });
});

test('rollback refuses (nothing changed) when a secret is missing, does not decrypt, or a profile holds ids AND plaintext', async () => {
  const mk = async () => { const db = await freshDb(); await migrate(db); return db; };
  let db = await mk();
  await db.query('delete from vault.secrets where id = (select trello_token_id from public.profiles where id = $1)', [U.leo]);
  await assertRefuses(db, ROLLBACK, /no longer exists: that credential cannot be restored/);

  db = await mk();
  await db.exec(`drop view vault.decrypted_secrets;
    create view vault.decrypted_secrets as select id, name, description, secret, null::text as decrypted_secret, key_id, created_at, updated_at from vault.secrets`);
  await assertRefuses(db, ROLLBACK, /did not decrypt to a value, nothing was changed/);

  db = await mk();
  await db.query("update public.profiles set trello_api_key = 'SOMETHINGELSE12345', trello_token = 'SOMETHINGELSE67890' where id = $1", [U.leo]);
  await assertRefuses(db, ROLLBACK, /ids AND plaintext/);
});

/* ============================ the live rehearsal script ============================ */

test('rehearsal script: embeds the migration body verbatim and is up to date', async () => {
  assert.ok(readRehearsal().includes(extractBody(MIGRATION)), 'live_rehearsal_rolled_back.sql is stale: run node test/build_rehearsal.mjs');
  assert.match(readRehearsal(), /PROPOSED -- NOT APPLIED/);
});

test('rehearsal script: runs the full migration + checks on the replica, ends in the deliberate error, commits nothing, prints no credential', async () => {
  for (const seed of [undefined, { rows: { [U.leo]: {}, [U.maria]: {} } }, { rows: { [U.leo]: CRED[U.leo], [U.maria]: CRED[U.maria], [U.sam]: CRED[U.sam] } }]) {
    const db = await freshDb(seed);
    const before = await snapshot(db);
    const r = await runScript(db, readRehearsal());
    assert.equal(r.ok, false);
    assert.match(r.message, /^REHEARSAL_ROLLBACK \(deliberate, nothing committed\):/);
    assert.doesNotMatch(r.message, /REHEARSAL_FAILED/);
    assertNoSecrets(r.message, 'rehearsal output');
    for (const n of r.notices) assertNoSecrets(n, 'rehearsal notice');
    const lines = r.message.split('\n').slice(1);
    assert.ok(lines.length >= 7 && lines.every((l) => /^(ok |-- )/.test(l)), r.message);
    assert.deepEqual(await snapshot(db), before, 'the rehearsal committed something');
  }
});

test('rehearsal script: reports FAILED (and still commits nothing) when a check fails', async () => {
  const db = await freshDb();
  const before = await snapshot(db);
  // sabotage: make the function ACL wrong *after* the body runs by mutating the body's revoke list, then run only the rehearsal
  const mutated = readRehearsal().replaceAll('from public, anon, authenticated;', 'from public;');
  const r = await runScript(db, mutated);
  assert.equal(r.ok, false);
  assert.doesNotMatch(r.message, /^REHEARSAL_ROLLBACK/);
  assert.deepEqual(await snapshot(db), before);
});

test('source hygiene: every proposed file carries the PROPOSED -- NOT APPLIED banner', async () => {
  const { readFileSync } = await import('node:fs');
  const { DIR } = await import('./replica.mjs');
  for (const f of ['20261009120000_trello_credentials_to_vault.sql', 'rollback.sql', 'live_rehearsal_rolled_back.sql', 'handler.vault.ts']) {
    assert.match(readFileSync(DIR + '/' + f, 'utf8').slice(0, 400), /PROPOSED/, f);
  }
  assert.equal(FNS.length, 3);
});
