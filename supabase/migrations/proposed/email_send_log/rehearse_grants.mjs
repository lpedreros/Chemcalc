// PROPOSED -- NOT APPLIED. Rehearses 20261029120000_email_send_log.sql and rollback.sql on a local PGlite replica (default privileges as on Supabase).
// Uses the PGlite install in ../trello_vault/node_modules. Run: node rehearse_grants.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(new URL('../trello_vault/package.json', import.meta.url));
const { pathToFileURL } = await import('node:url'); const { PGlite } = await import(pathToFileURL(require.resolve('@electric-sql/pglite')).href);
const mig = readFileSync(new URL('./20261029120000_email_send_log.sql', import.meta.url), 'utf8');
const rb = readFileSync(new URL('./rollback.sql', import.meta.url), 'utf8');
const db = new PGlite();
await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;`);
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
await db.exec(mig);
await db.exec(mig);   // idempotent: second run must not error
ok(true, 'migration runs twice without error');
const priv = async (role, p) => (await db.query(`select has_table_privilege('${role}','public.email_send_log','${p}') as v`)).rows[0].v;
for (const r of ['anon', 'authenticated']) for (const p of ['select', 'insert', 'update', 'delete']) ok(!(await priv(r, p)), `${r} has no ${p}`);
for (const p of ['select', 'insert', 'delete']) ok(await priv('service_role', p), `service_role has ${p}`);
ok(!(await priv('service_role', 'update')), 'service_role has no update (not granted)');
ok((await db.query(`select relrowsecurity r from pg_class where relname='email_send_log'`)).rows[0].r, 'RLS enabled');
ok((await db.query(`select count(*)::int n from pg_policies where tablename='email_send_log'`)).rows[0].n === 0, 'no policies');
ok((await db.query(`select count(*)::int n from pg_indexes where tablename='email_send_log'`)).rows[0].n === 4, 'pk + 3 indexes');
// the actual access paths, as each role
for (const r of ['anon', 'authenticated']) {
  await db.exec(`set role ${r}`);
  let denied = false; try { await db.query('select 1 from public.email_send_log'); } catch (e) { denied = e.code === '42501'; }
  await db.exec('reset role'); ok(denied, `${r} select is refused with 42501`);
}
await db.exec(`set role service_role`);
await db.query(`insert into public.email_send_log(recipient_hash, ip_hash) values ('a','b')`);
const n = (await db.query('select count(*)::int n, min(kind) k from public.email_send_log')).rows[0];
await db.exec('reset role'); ok(n.n === 1 && n.k === 'results', 'service_role can insert/select; kind defaults to results');
await db.exec(rb); ok((await db.query(`select to_regclass('public.email_send_log') t`)).rows[0].t === null, 'rollback drops the table');
console.log(fails ? `FAILED ${fails}` : 'ALL OK');
process.exit(fails ? 1 : 0);
