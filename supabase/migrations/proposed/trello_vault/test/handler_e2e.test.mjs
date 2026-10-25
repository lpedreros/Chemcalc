// End-to-end (the migration it exercises is applied live as 20261009212435; this folder keeps the evidence): supabase/functions/trello/handler.ts -> a stand-in for PostgREST -> the REAL SQL functions in the PGlite replica.
//   * Trello and Supabase Auth are the same fakes the deployed handler's own tests use (tools/verify/trello_fakes.mjs).
//   * The stand-in PostgREST maps /rest/v1/rpc/<fn> and PATCH /rest/v1/profiles onto SQL run as service_role in a
//     transaction (SET LOCAL ROLE + request.jwt.claims), the way PostgREST does it. It is a stand-in: it does not parse
//     PostgREST's full filter grammar, only the two shapes the handler sends.
//   * PARITY: the same request script runs against the PRE-VAULT handler (test/fixtures/handler.pre-vault.ts, in-memory profiles) and the patched one (Vault);
//     every status and body must be identical.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle as handleOriginal } from './fixtures/handler.pre-vault.ts';   // the plaintext-column handler that was live until 2026-10-09 (git f1e7c91)
import { handle as handleVault } from '../../../../functions/trello/handler.ts';  // the Vault handler, now the repo's real one
import { createWorld, ENV, SECRETS, SUPABASE_URL, SERVICE_KEY, ANON_KEY, UID_A, UID_B, KEY_A, TOK_A, KEY_B, TOK_B } from '../../../../../tools/verify/trello_fakes.mjs';
import { freshDb, asRole, runScript, MIGRATION, U } from './replica.mjs';

const UID_NP = U.noprof;
const FN_ARGS = {
  trello_read_credentials: { sql: 'select * from public.trello_read_credentials(p_user_id => $1::uuid)', args: ['p_user_id'], setof: true },
  trello_store_credentials: { sql: 'select public.trello_store_credentials(p_user_id => $1::uuid, p_api_key => $2, p_token => $3) as r', args: ['p_user_id', 'p_api_key', 'p_token'] },
  trello_clear_credentials: { sql: 'select public.trello_clear_credentials(p_user_id => $1::uuid) as r', args: ['p_user_id'] },
};
const BOARD_COLS = new Set(['trello_board_id', 'trello_board_name', 'trello_list_id', 'trello_list_name']);

function pgrstError(e) {
  const status = e.code === '42501' ? 403 : e.code === '22004' || e.code === '22023' ? 400 : 500;
  return new Response(JSON.stringify({ code: e.code, message: e.message, details: null, hint: null }), { status, headers: { 'Content-Type': 'application/json' } });
}
const ok = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** World whose profiles live in the replica (migrated), reached through a PostgREST stand-in. */
async function vaultWorld({ connected = [UID_A], withNoProfileUser = true } = {}) {
  const seed = { [UID_A]: connected.includes(UID_A) ? { key: KEY_A, token: TOK_A } : {}, [UID_B]: connected.includes(UID_B) ? { key: KEY_B, token: TOK_B } : {} };
  const db = await freshDb({ rows: seed, noProfileUser: withNoProfileUser });
  const m = await runScript(db, MIGRATION);
  assert.ok(m.ok, m.message);
  await db.query("update public.profiles set tier = 'pro'");   // the handler now checks the plan first; the fake world's profiles are Pro too
  const w = createWorld();
  if (withNoProfileUser) w.sessions.set('tokNP', UID_NP);
  w.db = db;
  w.restCalls = [];
  const fakeFetch = w.fetch;
  w.fetch = async (input, init = {}) => {
    const url = String(input);
    if (!url.startsWith(SUPABASE_URL + '/rest/v1/')) return fakeFetch(input, init);
    const headers = Object.fromEntries(Object.entries(init.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
    const method = (init.method || 'GET').toUpperCase();
    w.restCalls.push({ method, url, body: init.body ?? null });
    if (headers.apikey !== SERVICE_KEY) return ok(401, { message: 'Invalid API key' });
    if (w.fail.restThrow) throw new TypeError('fetch failed');
    if (w.fail.restStatus) return ok(w.fail.restStatus, { message: 'boom' });
    const u = new URL(url);
    const m = /^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(u.pathname);
    if (m) {
      const fn = FN_ARGS[m[1]];
      if (!fn || method !== 'POST') return ok(404, { code: 'PGRST202', message: 'Could not find the function' });
      const body = JSON.parse(init.body);
      try {
        const rows = await asRole(db, 'service_role', async (tx) => (await tx.query(fn.sql, fn.args.map((a) => body[a]))).rows, null);
        return ok(200, fn.setof ? rows : rows[0].r);   // PostgREST: table function -> array of rows; scalar function -> the bare value
      } catch (e) { return pgrstError(e); }
    }
    if (u.pathname === '/rest/v1/profiles' && method === 'GET') {   // the plan lookup: select=tier,subscription_status for one id
      const uid = (u.searchParams.get('id') || '').replace(/^eq\./, '');
      assert.equal(u.searchParams.get('select'), 'tier,subscription_status');
      const rows = await asRole(db, 'service_role', async (tx) => (await tx.query('select tier, subscription_status from public.profiles where id = $1::uuid', [uid])).rows, null);
      return ok(200, rows);
    }
    if (u.pathname === '/rest/v1/profiles' && method === 'PATCH') {
      const uid = (u.searchParams.get('id') || '').replace(/^eq\./, '');
      const body = JSON.parse(init.body);
      const cols = Object.keys(body);
      if (!cols.every((c) => BOARD_COLS.has(c))) return ok(400, { code: 'TEST', message: 'stand-in only accepts the four board/list columns: ' + cols.join(',') });
      const rows = await asRole(db, 'service_role', async (tx) => (await tx.query(
        `update public.profiles set ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')} where id = $1::uuid returning id`, [uid, ...cols.map((c) => body[c])])).rows, null);
      return ok(200, rows);
    }
    return ok(599, { message: 'stand-in: unrouted ' + method + ' ' + url });
  };
  return w;
}

/** Original handler against the in-memory world, with the same starting data. */
function memoryWorld({ connected = [UID_A] } = {}) {
  const w = createWorld();
  w.sessions.set('tokNP', UID_NP);
  const inner = w.fetch;   // the shared fake has no "database unreachable" switch; give it the same one the Vault world has
  w.fetch = async (input, init) => { if (w.fail.restThrow && String(input).includes('/rest/v1/')) throw new TypeError('fetch failed'); return inner(input, init); };
  for (const [uid] of [[UID_A], [UID_B]]) if (!connected.includes(uid)) { const p = w.profiles.get(uid); p.trello_api_key = null; p.trello_token = null; }
  return w;
}

let logged;
const URL_FN = 'https://proj.supabase.co/functions/v1/trello';
const make = (handle, w) => (body, { token = 'tokA', origin = 'https://testing.chemcalc.co', raw } = {}) =>
  handle(new Request(URL_FN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(origin ? { Origin: origin } : {}) },
    body: raw ?? JSON.stringify(body),
  }), { env: ENV, fetch: w.fetch }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const quiet = () => { logged = []; console.error = (...a) => logged.push(a.map(String).join(' ')); };

/* The plan check (requirePro) runs first and fails closed, so on these steps the Vault handler intentionally answers 403 pro_check_failed
   where the pre-Vault handler (which has no plan check) answered 404 no_profile / 500 db_error / 503. Everything else must be identical. */
const DENIED_PLAN_CHECK = { status: 403, body: { error: 'We could not check your plan. Please try again.', code: 'pro_check_failed' } };
const PLAN_CHECK_DIFFERS = new Set([
  'boards (signed in, no profile row)', 'connect (signed in, no profile row)',
  'database answers 500 (read)', 'database answers 500 (connect)', 'database unreachable (read)',
]);

/* The scripted conversation. Each step gets (call, w) and returns what to compare. */
const STEPS = [
  ['boards (connected user)',            (c) => c({ action: 'boards' })],
  ['lists',                              (c) => c({ action: 'lists', boardId: 'boardA001' })],
  ['card',                               (c) => c({ action: 'card', idList: 'listA001', name: 'EST-1 - Client | Vessel', desc: 'hello' })],
  ['body userId is ignored',             (c) => c({ action: 'boards', userId: UID_B, user_id: UID_B })],
  ['boards (not connected user)',        (c) => c({ action: 'boards' }, { token: 'tokB' })],
  ['lists / card (not connected user)',  async (c) => [await c({ action: 'lists', boardId: 'boardB001' }, { token: 'tokB' }), await c({ action: 'card', idList: 'listB001', name: 'x' }, { token: 'tokB' })]],
  ['boards (signed in, no profile row)', (c) => c({ action: 'boards' }, { token: 'tokNP' })],
  ['connect (signed in, no profile row)', (c) => c({ action: 'connect', apiKey: KEY_A, token: TOK_A }, { token: 'tokNP' })],
  ['connect rejected by Trello',         (c) => c({ action: 'connect', apiKey: 'WRONGKEYWRONGKEY1', token: 'WRONGTOKENWRONG123' }, { token: 'tokB' })],
  ['connect malformed',                  (c) => c({ action: 'connect', apiKey: 'short', token: '!!' }, { token: 'tokB' })],
  ['connect (user B)',                   (c) => c({ action: 'connect', apiKey: KEY_B, token: TOK_B }, { token: 'tokB' })],
  ['boards (user B, after connect)',     (c) => c({ action: 'boards' }, { token: 'tokB' })],
  ['connect again (replace, user B)',    (c) => c({ action: 'connect', apiKey: KEY_B, token: TOK_B }, { token: 'tokB' })],
  ['boards (user A unaffected)',         (c) => c({ action: 'boards' })],
  ['Trello says 401 for saved creds',    async (c, w) => { w.fail.trelloStatus = 401; const r = await c({ action: 'boards' }); w.fail.trelloStatus = 0; return r; }],
  ['Trello unreachable',                 async (c, w) => { w.fail.trelloThrow = true; const r = await c({ action: 'boards' }); w.fail.trelloThrow = false; return r; }],
  ['database answers 500 (read)',        async (c, w) => { w.fail.restStatus = 500; const r = await c({ action: 'boards' }); w.fail.restStatus = 0; return r; }],
  ['database answers 500 (connect)',     async (c, w) => { w.fail.restStatus = 500; const r = await c({ action: 'connect', apiKey: KEY_B, token: TOK_B }, { token: 'tokB' }); w.fail.restStatus = 0; return r; }],
  ['database unreachable (read)',        async (c, w) => { w.fail.restThrow = true; const r = await c({ action: 'boards' }); w.fail.restThrow = false; return r; }],
  ['no Authorization',                   (c) => c({ action: 'boards' }, { token: null })],
  ['anon key as bearer',                 (c) => c({ action: 'boards' }, { token: ANON_KEY })],
  ['unknown action / bad JSON',          async (c) => [await c({ action: 'nope' }), await c(null, { raw: '{not json' })]],
  ['disconnect (revoke fails)',          async (c, w) => { w.fail.revokeStatus = 500; const r = await c({ action: 'disconnect' }, { token: 'tokB' }); w.fail.revokeStatus = 0; return r; }],
  ['boards after disconnect (B)',        (c) => c({ action: 'boards' }, { token: 'tokB' })],
  ['disconnect again (nothing there)',   (c) => c({ action: 'disconnect' }, { token: 'tokB' })],
  ['disconnect (user A, revoked)',       (c) => c({ action: 'disconnect' })],
  ['boards after disconnect (A)',        (c) => c({ action: 'boards' })],
  ['disconnect (no profile row)',        (c) => c({ action: 'disconnect' }, { token: 'tokNP' })],
];

test('PARITY: the Vault handler answers every scripted request exactly like the deployed handler (status and body), including every error path', async () => {
  quiet();
  const mem = memoryWorld();
  const vlt = await vaultWorld();
  const callMem = make(handleOriginal, mem);
  const callVlt = make(handleVault, vlt);
  let compared = 0;
  const trelloCalls = (w) => w.calls.filter((c) => c.url.includes('api.trello.com')).map((c) => c.method + ' ' + new URL(c.url).pathname);
  const memTraffic = [], vltTraffic = [];
  let memSeen = 0, vltSeen = 0;
  for (const [name, step] of STEPS) {
    const a = await step(callMem, mem);
    const b = await step(callVlt, vlt);
    const differs = PLAN_CHECK_DIFFERS.has(name);
    if (differs) assert.deepEqual(b, DENIED_PLAN_CHECK, `step "${name}" should be denied by the plan check`);
    else assert.deepEqual(b, a, `step "${name}" differs`);
    const m = trelloCalls(mem), v = trelloCalls(vlt);
    if (differs) assert.deepEqual(v.slice(vltSeen), [], `step "${name}" reached Trello after a denied plan check`);   // denied: Trello is never called
    else memTraffic.push(...m.slice(memSeen));
    vltTraffic.push(...v.slice(vltSeen));
    memSeen = m.length; vltSeen = v.length;
    compared += 1;
  }
  assert.equal(compared, STEPS.length);
  // Trello saw the same traffic from both (apart from the steps the plan check now stops before Trello)
  assert.deepEqual(vltTraffic, memTraffic);
  assert.deepEqual(vlt.cards, mem.cards);
  assert.deepEqual(vlt.revoked, mem.revoked);
});

test('PARITY, state side: after the script the DB holds no credential anywhere in plaintext, and disconnected users have no Vault secrets', async () => {
  quiet();
  const vlt = await vaultWorld();
  const call = make(handleVault, vlt);
  await call({ action: 'connect', apiKey: KEY_B, token: TOK_B }, { token: 'tokB' });
  const { rows: prof } = await vlt.db.query('select id, trello_api_key, trello_token, trello_connected, trello_board_id from public.profiles order by id');
  assert.ok(prof.every((p) => p.trello_api_key === null && p.trello_token === null), 'plaintext found in profiles');
  assert.deepEqual(prof.map((p) => p.trello_connected), [true, true]);
  assert.equal((await vlt.db.query('select count(*)::int n from vault.secrets')).rows[0].n, 4);
  await call({ action: 'disconnect' }, { token: 'tokA' });
  await call({ action: 'disconnect' }, { token: 'tokB' });
  const after = await vlt.db.query('select trello_connected, trello_api_key_id, trello_token_id, trello_board_id, trello_board_name, trello_list_id, trello_list_name, trello_api_key, trello_token from public.profiles');
  for (const p of after.rows) assert.deepEqual(p, { trello_connected: false, trello_api_key_id: null, trello_token_id: null, trello_board_id: null, trello_board_name: null, trello_list_id: null, trello_list_name: null, trello_api_key: null, trello_token: null });
  assert.equal((await vlt.db.query('select count(*)::int n from vault.secrets')).rows[0].n, 0);
});

test('the credential never rides a profiles request; the user id sent to SQL is the verified one, never the body\'s', async () => {
  quiet();
  const vlt = await vaultWorld();
  const call = make(handleVault, vlt);
  await call({ action: 'boards', userId: UID_B, p_user_id: UID_B }, { token: 'tokA' });
  await call({ action: 'connect', apiKey: KEY_B, token: TOK_B, userId: UID_A, p_user_id: UID_A }, { token: 'tokB' });
  await call({ action: 'disconnect', userId: UID_A }, { token: 'tokB' });
  const rpcs = vlt.restCalls.filter((c) => c.url.includes('/rpc/'));
  assert.ok(rpcs.length >= 4);
  // call 1 was user A's session (its body said B) and addressed A; every later call was user B's session (body said A) and addressed B
  assert.equal(JSON.parse(rpcs[0].body).p_user_id, UID_A);
  const bCalls = rpcs.slice(1).map((r) => JSON.parse(r.body).p_user_id);
  assert.ok(bCalls.every((id) => id === UID_B), 'user B requests addressed ' + bCalls.join(','));
  for (const r of vlt.restCalls.filter((c) => c.url.includes('/rest/v1/profiles'))) {
    assert.doesNotMatch(r.body ?? '', /trello_api_key|trello_token/, 'a credential column was sent to a profiles request');
    for (const s of SECRETS) assert.ok(!(r.body ?? '').includes(s) && !r.url.includes(s));
  }
  // A's credential is still intact (B's calls with A's id in the body did nothing to it)
  assert.equal((await call({ action: 'boards' }, { token: 'tokA' })).status, 200);
});

test('no response body and no log line ever contains a credential (success and failure paths)', async () => {
  quiet();
  const vlt = await vaultWorld();
  const call = make(handleVault, vlt);
  const out = [];
  out.push(await call({ action: 'boards' }));
  vlt.fail.restStatus = 500; out.push(await call({ action: 'boards' })); out.push(await call({ action: 'connect', apiKey: KEY_B, token: TOK_B }, { token: 'tokB' })); vlt.fail.restStatus = 0;
  vlt.fail.trelloThrow = true; out.push(await call({ action: 'boards' })); vlt.fail.trelloThrow = false;
  vlt.fail.trelloStatus = 403; out.push(await call({ action: 'card', idList: 'listA001', name: 'x' })); vlt.fail.trelloStatus = 0;
  out.push(await call({ action: 'connect', apiKey: KEY_B, token: TOK_B }, { token: 'tokB' }));
  out.push(await call({ action: 'disconnect' }));
  const text = JSON.stringify(out) + '\n' + logged.join('\n');
  for (const s of SECRETS) assert.ok(!text.includes(s), 'leaked a credential');
});

test('corrupt state: a stored secret that no longer decrypts is a loud 500 db_error on use, but Disconnect still works and leaves the user cleanly not connected', async () => {
  quiet();
  const vlt = await vaultWorld();
  const call = make(handleVault, vlt);
  await vlt.db.query('delete from vault.secrets where id = (select trello_token_id from public.profiles where id = $1)', [UID_A]);
  const boards = await call({ action: 'boards' });
  assert.equal(boards.status, 500);
  assert.equal(boards.body.code, 'db_error');
  const dis = await call({ action: 'disconnect' });
  assert.deepEqual(dis, { status: 200, body: { ok: true, revoked: null } });
  assert.deepEqual(await call({ action: 'boards' }), { status: 409, body: { error: 'Trello is not connected. Connect it in My Business Info first.', code: 'not_connected' } });
  assert.equal((await call({ action: 'connect', apiKey: KEY_A, token: TOK_A })).status, 200);   // and it can be reconnected
  assert.equal((await call({ action: 'boards' })).status, 200);
});

test('the update_secret no-op is a loud failure end to end: connect answers 500 db_error, the old credential keeps working', async () => {
  quiet();
  const vlt = await vaultWorld();
  const call = make(handleVault, vlt);
  await vlt.db.exec(`create or replace function vault.update_secret(secret_id uuid, new_secret text default null, new_name text default null, new_description text default null, new_key_id uuid default null)
                     returns void language plpgsql as $$ begin null; end $$`);
  // a *different valid* pair for user A so the stored value would have to change
  vlt.accounts.set('KEYAAAA2AAAAAAAAAAA|TOKAAAA2AAAAAAAAAAAAAAAAAAA', { boards: [], lists: {} });
  const r = await call({ action: 'connect', apiKey: 'KEYAAAA2AAAAAAAAAAA', token: 'TOKAAAA2AAAAAAAAAAAAAAAAAAA' });
  assert.equal(r.status, 500);
  assert.equal(r.body.code, 'db_error');
  assert.equal((await call({ action: 'boards' })).status, 200);   // still the original pair
});

test('PostgREST variants the handler must tolerate: a single object instead of an array, an empty body, null fields', async () => {
  quiet();
  const w = createWorld();
  const answers = { read: null };
  w.fetch = ((orig) => async (input, init) => {
    if (String(input).includes('/rest/v1/rpc/trello_read_credentials')) return new Response(JSON.stringify(answers.read), { status: 200 });
    return orig(input, init);
  })(w.fetch);
  const call = make(handleVault, w);
  const key = KEY_A, token = TOK_A;
  for (const [shape, expected] of [
    [[{ api_key: key, token }], 200], [{ api_key: key, token }, 200],
    [[{ api_key: null, token: null }], 409], [[], 409], [null, 409], [[{ api_key: key, token: '' }], 409], [[{ api_key: 5, token: 6 }], 409],
  ]) {
    answers.read = shape;
    assert.equal((await call({ action: 'boards' })).status, expected, JSON.stringify(shape));
  }
});

test('the Vault handler differs from the pre-Vault one only where the credentials are read, written and cleared', async () => {
  const { readFileSync } = await import('node:fs');
  const strip = (s) => s.replace(/\r/g, '');
  const a = strip(readFileSync(new URL('./fixtures/handler.pre-vault.ts', import.meta.url), 'utf8')).split('\n');
  const b = strip(readFileSync(new URL('../../../../functions/trello/handler.ts', import.meta.url), 'utf8')).split('\n');
  // The Trello section, the entry point and the header types are untouched; same exports.
  const section = (lines, from, to) => lines.slice(lines.findIndex((l) => l.includes(from)), lines.findIndex((l) => l.includes(to))).join('\n');
  assert.equal(section(b, '/* ---------- Trello ---------- */', '/* ---------- actions ---------- */'), section(a, '/* ---------- Trello ---------- */', '/* ---------- actions ---------- */'));
  const tail = (lines) => lines.slice(lines.findIndex((l) => l.includes('/* ---------- entry ---------- */'))).join('\n');
  // the one intended difference: the plan check (requirePro) between the markers
  const withoutPlanCheck = (text) => text.replace(/ *\/\/ --- plan check \(Pro\) ---\n[\s\S]*?\/\/ --- end plan check ---\n\n?/, '');
  assert.ok(tail(b).includes('--- plan check (Pro) ---') && !tail(a).includes('plan check'));
  assert.equal(withoutPlanCheck(tail(b)), tail(a));
  const head = (lines) => lines.slice(lines.findIndex((l) => l.includes('export interface Env')), lines.findIndex((l) => l.includes('/* ---------- small helpers ---------- */'))).join('\n');
  assert.equal(head(b), head(a));
});

/* ---------- the plan check (Pro) ---------- */
const PRO_REQUIRED = { status: 403, body: { error: 'Trello needs a Pro plan.', code: 'pro_required' } };
const setPlan = (w, uid, tier, status) => w.db.query('update public.profiles set tier = $2, subscription_status = $3 where id = $1::uuid', [uid, tier, status]);
const ACTIONS = [
  { action: 'connect', apiKey: KEY_A, token: TOK_A },
  { action: 'boards' },
  { action: 'lists', boardId: 'boardA001' },
  { action: 'card', idList: 'listA001', name: 'EST-1 - Client | Vessel', desc: 'x' },
];

test('PLAN: a Free user is denied connect, boards, lists and card with 403 pro_required, and nothing is read, stored or sent to Trello', async () => {
  quiet();
  for (const [tier, status] of [['free', null], ['free', 'inactive'], ['free', 'canceled'], ['free', 'past_due'], [null, null], ['PRO', null], ['', 'ACTIVE']]) {
    const vlt = await vaultWorld();
    await setPlan(vlt, UID_A, tier, status);
    const call = make(handleVault, vlt);
    for (const body of ACTIONS) assert.deepEqual(await call(body), PRO_REQUIRED, `${body.action} for tier=${tier} status=${status}`);
    assert.equal(vlt.calls.filter((c) => c.url.includes('api.trello.com')).length, 0, 'Trello was called for a denied user');
    assert.equal(vlt.restCalls.filter((c) => c.url.includes('/rpc/')).length, 0, 'the credentials were touched for a denied user');
  }
});

test('PLAN: tier = pro is allowed on all four actions', async () => {
  quiet();
  const vlt = await vaultWorld();
  await setPlan(vlt, UID_A, 'pro', null);
  const call = make(handleVault, vlt);
  for (const body of ACTIONS) assert.equal((await call(body)).status, 200, body.action);
});

test('PLAN: subscription_status = active is allowed even when tier is not pro', async () => {
  quiet();
  const vlt = await vaultWorld();
  await setPlan(vlt, UID_A, 'free', 'active');
  const call = make(handleVault, vlt);
  for (const body of ACTIONS) assert.equal((await call(body)).status, 200, body.action);
});

test('PLAN: a failed lookup is a denial (fail closed): database error, unreachable, no profile row, and an unexpected answer', async () => {
  quiet();
  const vlt = await vaultWorld();
  const call = make(handleVault, vlt);
  vlt.fail.restStatus = 500;
  for (const body of ACTIONS) assert.deepEqual(await call(body), DENIED_PLAN_CHECK, 'status 500: ' + body.action);
  vlt.fail.restStatus = 0; vlt.fail.restThrow = true;
  for (const body of ACTIONS) assert.deepEqual(await call(body), DENIED_PLAN_CHECK, 'unreachable: ' + body.action);
  vlt.fail.restThrow = false;
  for (const body of ACTIONS) assert.deepEqual(await call(body, { token: 'tokNP' }), DENIED_PLAN_CHECK, 'no profile row: ' + body.action);
  // an answer that is not exactly one row
  const w = createWorld();
  const plan = { answer: null };
  w.fetch = ((orig) => async (input, init) => {
    if (String(input).includes('/rest/v1/profiles') && (init?.method ?? 'GET') === 'GET') return new Response(JSON.stringify(plan.answer), { status: 200 });
    return orig(input, init);
  })(w.fetch);
  const call2 = make(handleVault, w);
  for (const answer of [null, [], {}, 'pro', [{}, {}], [null], [{ tier: 'pro' }, { tier: 'pro' }]]) {
    plan.answer = answer;
    assert.deepEqual(await call2({ action: 'boards' }), DENIED_PLAN_CHECK, JSON.stringify(answer));
  }
  plan.answer = [{ tier: 'pro' }];
  assert.equal((await call2({ action: 'boards' })).status, 200);   // exactly one row, tier pro: allowed
});

test('PLAN: disconnect is never blocked: a Free user can remove their stored credentials, and no plan lookup is made for it', async () => {
  quiet();
  const vlt = await vaultWorld();
  await setPlan(vlt, UID_A, 'free', 'canceled');
  const call = make(handleVault, vlt);
  assert.equal((await call({ action: 'boards' })).status, 403);
  const before = vlt.restCalls.length;
  const r = await call({ action: 'disconnect' });
  assert.equal(r.status, 200);
  assert.equal(vlt.restCalls.slice(before).filter((c) => c.method === 'GET' && c.url.includes('/rest/v1/profiles')).length, 0, 'disconnect made a plan lookup');
  const after = await vlt.db.query('select trello_connected from public.profiles where id = $1', [UID_A]);
  assert.equal(after.rows[0].trello_connected, false);   // the credentials really are gone
});

test('PLAN: the check is made for the verified user only (the body\'s userId is ignored) and before the action runs', async () => {
  quiet();
  const vlt = await vaultWorld({ connected: [UID_A, UID_B] });
  await setPlan(vlt, UID_A, 'free', null);   // A is Free, B is Pro
  const call = make(handleVault, vlt);
  assert.deepEqual(await call({ action: 'boards', userId: UID_B, user_id: UID_B }, { token: 'tokA' }), PRO_REQUIRED);   // pretending to be B does not help A
  assert.equal((await call({ action: 'boards', userId: UID_A }, { token: 'tokB' })).status, 200);                     // and B is not held back by A's plan
  const lookups = vlt.restCalls.filter((c) => c.method === 'GET' && c.url.includes('/rest/v1/profiles'));
  assert.ok(lookups[0].url.includes('id=eq.' + UID_A) && !lookups[0].url.includes(UID_B));
  assert.ok(lookups[1].url.includes('id=eq.' + UID_B) && !lookups[1].url.includes(UID_A));
});

test('PLAN: identity still comes first: no token / the anon key is 401 as before, and no plan lookup happens', async () => {
  quiet();
  const vlt = await vaultWorld();
  const call = make(handleVault, vlt);
  const none = await call({ action: 'boards' }, { token: null });
  const anon = await call({ action: 'boards' }, { token: ANON_KEY });
  assert.deepEqual(none, { status: 401, body: { error: 'Please sign in again to use Trello.', code: 'unauthorized' } });
  assert.deepEqual(anon, none);
  assert.equal(vlt.restCalls.length, 0);
});

test('PLAN: unknown actions and bad bodies are answered as before (400), a denied Free user never reaches validation of connect/lists/card fields', async () => {
  quiet();
  const vlt = await vaultWorld();
  const call = make(handleVault, vlt);
  assert.equal((await call({ action: 'nope' })).status, 400);
  assert.equal((await call(null, { raw: '{not json' })).status, 400);
  await setPlan(vlt, UID_A, 'free', null);
  assert.equal((await call({ action: 'nope' })).status, 400);                       // unknown action: no plan lookup needed
  assert.deepEqual(await call({ action: 'connect', apiKey: 'x', token: 'y' }), PRO_REQUIRED);   // Free + malformed: the plan answer comes first
});
