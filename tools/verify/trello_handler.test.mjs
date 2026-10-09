// Unit tests for supabase/functions/trello/handler.ts.   node --test tools/verify/trello_handler.test.mjs   (Node 22.18+/24: runs the .ts directly)
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { handle, ALLOWED_ORIGINS } from '../../supabase/functions/trello/handler.ts';
import { createWorld, ENV, SECRETS, UID_A, UID_B, KEY_A, TOK_A, KEY_B, TOK_B, ANON_KEY } from './trello_fakes.mjs';

const URL_FN = 'https://proj.supabase.co/functions/v1/trello';
let w; let logged;
beforeEach(() => {
  w = createWorld();
  logged = [];
  console.error = (...a) => logged.push(a.map(String).join(' '));
});

const call = (body, { token = 'tokA', origin = 'https://testing.chemcalc.co', method = 'POST', raw } = {}) =>
  handle(new Request(URL_FN, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(origin ? { Origin: origin } : {}) },
    body: method === 'POST' ? (raw ?? JSON.stringify(body)) : undefined,
  }), { env: ENV, fetch: w.fetch });
const noSecrets = (text, label) => { for (const s of SECRETS) assert.ok(!text.includes(s), `${label} leaked a credential`); };
const upstream = () => w.calls.filter((c) => c.url.includes('api.trello.com'));
const rows = () => w.calls.filter((c) => c.url.includes('/rest/v1/'));
const rpcCalls = (fn) => rows().filter((c) => c.url.endsWith('/rpc/' + fn));   // the Vault SQL functions the handler calls (credentials never ride a profiles request)

/* ---------- CORS ---------- */
test('CORS: preflight answers both site origins, echoes the origin, and allows the headers supabase-js sends', async () => {
  for (const origin of ALLOWED_ORIGINS) {
    const r = await call(null, { method: 'OPTIONS', origin });
    assert.equal(r.status, 204);
    assert.equal(r.headers.get('access-control-allow-origin'), origin);
    assert.equal(r.headers.get('vary'), 'Origin');
    const allowed = r.headers.get('access-control-allow-headers');
    for (const h of ['authorization', 'x-client-info', 'apikey', 'content-type']) assert.ok(allowed.includes(h), h);
  }
  assert.deepEqual(ALLOWED_ORIGINS, ['https://chemcalc.co', 'https://testing.chemcalc.co']);
});
test('CORS: a foreign or missing Origin gets no Allow-Origin header', async () => {
  for (const origin of ['https://evil.example', 'http://testing.chemcalc.co', 'https://chemcalc.co.evil.example', null]) {
    const r = await call(null, { method: 'OPTIONS', origin });
    assert.equal(r.status, 204);
    assert.equal(r.headers.get('access-control-allow-origin'), null, String(origin));
  }
});
test('CORS headers also ride on real responses (success and error)', async () => {
  const ok = await call({ action: 'boards' });
  const bad = await call({ action: 'boards' }, { token: null });
  for (const r of [ok, bad]) assert.equal(r.headers.get('access-control-allow-origin'), 'https://testing.chemcalc.co');
});

/* ---------- identity ---------- */
test('no Authorization header -> 401 and no network call at all', async () => {
  const r = await call({ action: 'boards' }, { token: null });
  assert.equal(r.status, 401);
  assert.equal(w.calls.length, 0);
});
test('the public ANON key as Bearer (what passes verify_jwt:true) is rejected: 401, no profile read, no Trello call', async () => {
  const r = await call({ action: 'boards' }, { token: ANON_KEY });
  assert.equal(r.status, 401);
  assert.equal(rows().length, 0);
  assert.equal(upstream().length, 0);
});
test('a garbage token -> 401', async () => {
  assert.equal((await call({ action: 'boards' }, { token: 'not-a-session' })).status, 401);
  assert.equal(rows().length + upstream().length, 0);
});
test('Auth unreachable -> 503, not a crash and not a pass', async () => {
  w.fail.authThrow = true;
  const r = await call({ action: 'boards' });
  assert.equal(r.status, 503);
  assert.equal(upstream().length, 0);
});
test('a user id sent in the body is ignored: the verified session decides whose credentials are used', async () => {
  const r = await call({ action: 'boards', userId: UID_B, id: UID_B, user_id: UID_B });
  assert.equal(r.status, 200);
  assert.equal(JSON.parse(rows()[0].body).p_user_id, UID_A);   // the verified session's id went to the database, not the body's
  assert.ok(upstream()[0].url.includes(KEY_A) && !upstream()[0].url.includes(KEY_B));
  assert.deepEqual((await r.json()).boards.map((b) => b.id), ['boardA001', 'boardA002']);
});
test('two users get their own data; neither sees the other', async () => {
  const a = await (await call({ action: 'boards' }, { token: 'tokA' })).json();
  const b = await (await call({ action: 'boards' }, { token: 'tokB' })).json();
  assert.deepEqual(a.boards.map((x) => x.name), ['Jobs A', 'Other A']);
  assert.deepEqual(b.boards.map((x) => x.name), ['Jobs B']);
});

/* ---------- boards / lists / card ---------- */
test('boards: same Trello call as before (open boards of the member), returns only id and name, never a credential', async () => {
  const r = await call({ action: 'boards' });
  const text = await r.text();
  assert.equal(r.status, 200);
  assert.deepEqual(JSON.parse(text), { boards: [{ id: 'boardA001', name: 'Jobs A' }, { id: 'boardA002', name: 'Other A' }] });
  noSecrets(text, 'boards response');
  const u = new URL(upstream()[0].url);
  assert.equal(u.pathname, '/1/members/me/boards');
  assert.equal(u.searchParams.get('fields'), 'id,name,closed');
  assert.equal(u.searchParams.get('filter'), 'open');
  assert.equal(u.searchParams.get('key'), KEY_A);
  assert.equal(u.searchParams.get('token'), TOK_A);
});
test('boards: not connected -> 409 not_connected and Trello is never called', async () => {
  w.profiles.get(UID_A).trello_api_key = null;
  const r = await call({ action: 'boards' });
  assert.equal(r.status, 409);
  assert.equal((await r.json()).code, 'not_connected');
  assert.equal(upstream().length, 0);
});
test('boards: profile row missing -> 409, not a crash', async () => {
  w.profiles.delete(UID_A);
  assert.equal((await call({ action: 'boards' })).status, 409);
});
test('lists: same Trello call, id+name only', async () => {
  const r = await call({ action: 'lists', boardId: 'boardA001' });
  const text = await r.text();
  assert.deepEqual(JSON.parse(text), { lists: [{ id: 'listA001', name: 'Sent A' }, { id: 'listA002', name: 'Done A' }] });
  noSecrets(text, 'lists response');
  const u = new URL(upstream()[0].url);
  assert.equal(u.pathname, '/1/boards/boardA001/lists');
  assert.equal(u.searchParams.get('filter'), 'open');
  assert.equal(u.searchParams.get('fields'), 'id,name');
});
test('lists: a board id that is not a plain id (path tricks, empty, long) -> 400 and nothing is sent anywhere', async () => {
  for (const boardId of ['../members/me/tokens', 'a/b', '', 'x', 'a'.repeat(40), 'board 1', '%2e%2e%2fx', null, 42]) {
    const r = await call({ action: 'lists', boardId });
    assert.equal(r.status, 400, String(boardId));
  }
  assert.equal(w.calls.filter((c) => !c.url.includes('/auth/v1/user')).length, 0);
});
test('card: same POST /1/cards form body; the response is just { card: { id } }', async () => {
  const r = await call({ action: 'card', idList: 'listA001', name: 'EST-1 — Ada | Robalo', desc: '**Total:** $5\n- task (1.0 hrs)' });
  const text = await r.text();
  assert.deepEqual(JSON.parse(text), { card: { id: 'card1' } });
  noSecrets(text, 'card response');
  const c = upstream()[0];
  assert.equal(c.method, 'POST');
  assert.equal(new URL(c.url).pathname, '/1/cards');
  assert.equal(c.headers['content-type'], 'application/x-www-form-urlencoded');
  assert.deepEqual(w.cards[0], { idList: 'listA001', name: 'EST-1 — Ada | Robalo', desc: '**Total:** $5\n- task (1.0 hrs)' });
});
test('card: validation (bad list id, empty name, oversize) -> 400 with no Trello call', async () => {
  for (const b of [{ idList: '../x', name: 'n' }, { idList: 'listA001', name: '   ' }, { idList: 'listA001' }, { idList: 'listA001', name: 'n', desc: 'x'.repeat(16385) }, { idList: 'listA001', name: 'n', desc: 5 }]) {
    assert.equal((await call({ action: 'card', ...b })).status, 400, JSON.stringify(b).slice(0, 60));
  }
  assert.equal(upstream().length, 0);
});

/* ---------- Trello failures ---------- */
test('Trello 401 -> 502 trello_unauthorized with a reconnect message; no credential in the answer', async () => {
  w.profiles.get(UID_A).trello_token = 'revokedrevokedrevoked';
  const r = await call({ action: 'boards' });
  const text = await r.text();
  assert.equal(r.status, 502);
  assert.equal(JSON.parse(text).code, 'trello_unauthorized');
  noSecrets(text, 'error response');
});
test('Trello other errors: status passed through as data, 404 and 429 get their own codes', async () => {
  for (const [status, code] of [[404, 'trello_not_found'], [429, 'trello_rate_limited'], [500, 'trello_error']]) {
    w.fail.trelloStatus = status;
    const r = await call({ action: 'boards' });
    assert.equal(r.status, 502);
    assert.equal((await r.json()).code, code);
  }
});
test('a thrown fetch error that names the Trello URL (key and token inside) never reaches the response or the logs', async () => {
  w.fail.trelloThrow = true;
  const r = await call({ action: 'boards' });
  const text = await r.text();
  assert.equal(r.status, 502);
  assert.equal(JSON.parse(text).code, 'trello_unreachable');
  noSecrets(text, 'error response');
  noSecrets(logged.join('\n'), 'server log');
  assert.ok(logged.length > 0, 'the failure was logged (without secrets)');
});
test('database error -> 500 db_error, no secrets in log or response', async () => {
  w.fail.restStatus = 500;
  const r = await call({ action: 'boards' });
  assert.equal(r.status, 500);
  noSecrets(await r.text() + logged.join('\n'), 'db failure');
});

/* ---------- connect ---------- */
test('connect: verifies the pair at Trello first, then stores the pair through the Vault function for the CALLER', async () => {
  const newKey = 'NEWKEYNEWKEY1111222233334444'; const newTok = 'NEWTOKENNEWTOKEN11112222333344445555';
  w.accounts.set(`${newKey}|${newTok}`, { boards: [], lists: {} });
  const r = await call({ action: 'connect', apiKey: newKey, token: newTok, userId: UID_B });
  const text = await r.text();
  assert.equal(r.status, 200);
  assert.deepEqual(JSON.parse(text), { ok: true });
  assert.ok(!text.includes(newKey) && !text.includes(newTok));
  assert.equal(w.calls.filter((c) => c.url.includes('api.trello.com')).length, 1);          // the verification call
  assert.equal(new URL(upstream()[0].url).pathname, '/1/members/me');
  assert.equal(rows().filter((c) => c.method === 'PATCH').length, 0);                       // the credential never rides a profiles PATCH
  assert.equal(rpcCalls('trello_store_credentials').length, 1);
  assert.deepEqual(JSON.parse(rpcCalls('trello_store_credentials')[0].body), { p_user_id: UID_A, p_api_key: newKey, p_token: newTok });
  assert.equal(w.profiles.get(UID_A).trello_token, newTok);
  assert.equal(w.profiles.get(UID_B).trello_token, TOK_B);                                  // the other user is untouched
  assert.equal(w.profiles.get(UID_A).trello_board_id, 'boardA001');                         // board/list choices are not touched
});
test('connect: Trello rejects the pair -> 400 invalid_credentials and NOTHING is written', async () => {
  const r = await call({ action: 'connect', apiKey: 'WRONGKEYWRONGKEY12', token: 'WRONGTOKENWRONGTOKEN12' });
  assert.equal(r.status, 400);
  assert.equal((await r.json()).code, 'invalid_credentials');
  assert.equal(rpcCalls('trello_store_credentials').length, 0);
  assert.equal(w.profiles.get(UID_A).trello_token, TOK_A);
});
test('connect: malformed key/token -> 400 before any network call (beyond Auth)', async () => {
  for (const b of [{ apiKey: '', token: 'x'.repeat(20) }, { apiKey: 'short', token: 'x'.repeat(20) }, { apiKey: 'k'.repeat(20), token: 'bad token with spaces!' }, { apiKey: 'k'.repeat(300), token: 't'.repeat(20) }, {}, { apiKey: 5, token: 6 }]) {
    assert.equal((await call({ action: 'connect', ...b })).status, 400);
  }
  assert.equal(w.calls.filter((c) => !c.url.includes('/auth/v1/user')).length, 0);
});
test('connect: no profile row for the caller -> 404, nothing stored', async () => {
  w.profiles.delete(UID_A);
  const k = 'NEWKEYNEWKEY1111222233334444'; const t = 'NEWTOKENNEWTOKEN11112222333344445555';
  w.accounts.set(`${k}|${t}`, { boards: [], lists: {} });
  assert.equal((await call({ action: 'connect', apiKey: k, token: t })).status, 404);
});

/* ---------- disconnect ---------- */
test('disconnect: clears the credentials (Vault function) and the four board/list columns on the caller row, then revokes the token at Trello', async () => {
  const r = await call({ action: 'disconnect' });
  assert.deepEqual(await r.json(), { ok: true, revoked: true });
  const p = w.profiles.get(UID_A);
  for (const k of ['trello_api_key', 'trello_token', 'trello_board_id', 'trello_board_name', 'trello_list_id', 'trello_list_name']) assert.equal(p[k], null, k);
  assert.deepEqual(w.revoked, [TOK_A]);
  assert.equal(w.profiles.get(UID_B).trello_token, TOK_B);
  // order: the clear is written BEFORE the revoke is attempted
  const order = w.calls.map((c) => (c.url.endsWith('/rpc/trello_clear_credentials') ? 'clear' : c.method === 'PATCH' ? 'board' : c.method === 'DELETE' ? 'revoke' : null)).filter(Boolean);
  assert.deepEqual(order, ['clear', 'board', 'revoke']);
  assert.deepEqual(JSON.parse(rows().find((c) => c.method === 'PATCH').body), { trello_board_id: null, trello_board_name: null, trello_list_id: null, trello_list_name: null });
});
test('disconnect: a failed revoke does not undo the disconnect; it is reported as revoked:false', async () => {
  w.fail.revokeStatus = 500;
  const r = await call({ action: 'disconnect' });
  assert.deepEqual(await r.json(), { ok: true, revoked: false });
  assert.equal(w.profiles.get(UID_A).trello_token, null);
});
test('disconnect: when the clear fails nothing is revoked and the error is reported', async () => {
  let n = 0; const real = w.fetch;
  w.fetch = (url, init) => (String(url).includes('/rpc/trello_clear_credentials') ? Promise.resolve(new Response('{}', { status: 500 })) : real(url, init));
  const r = await call({ action: 'disconnect' });
  assert.equal(r.status, 500);
  assert.deepEqual(w.revoked, []);
  assert.equal(w.profiles.get(UID_A).trello_token, TOK_A);
});
test('disconnect when nothing is connected is idempotent: ok, revoked:null, no Trello call', async () => {
  const p = w.profiles.get(UID_A); p.trello_api_key = null; p.trello_token = null;
  const r = await call({ action: 'disconnect' });
  assert.deepEqual(await r.json(), { ok: true, revoked: null });
  assert.equal(upstream().length, 0);
});

/* ---------- request shape ---------- */
test('wrong method, unknown action, bad JSON, non-object body, oversize body', async () => {
  assert.equal((await call(null, { method: 'GET' })).status, 405);
  assert.equal((await call({ action: 'nope' })).status, 400);
  assert.equal((await call(null, { raw: '{not json' })).status, 400);
  assert.equal((await call(null, { raw: '[1,2]' })).status, 400);
  assert.equal((await call(null, { raw: '{"action":"card","desc":"' + 'x'.repeat(70000) + '"}' })).status, 413);
});
test('missing server env -> 500 config, never a pass-through', async () => {
  const r = await handle(new Request(URL_FN, { method: 'POST', headers: { Authorization: 'Bearer tokA' }, body: '{}' }), { env: { ...ENV, SUPABASE_SERVICE_ROLE_KEY: '' }, fetch: w.fetch });
  assert.equal(r.status, 500);
  assert.equal(w.calls.length, 0);
});
test('sb_secret_ style service keys (not JWTs) go in apikey only, never as a Bearer', async () => {
  const env = { ...ENV, SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_abc' };
  const real = w.fetch;
  w.fetch = (url, init) => real(url, init);
  // the fake PostgREST insists on SERVICE_KEY, so only check what the handler sent
  await handle(new Request(URL_FN, { method: 'POST', headers: { Authorization: 'Bearer tokA' }, body: '{"action":"boards"}' }), { env, fetch: w.fetch });
  const r = rows()[0];
  assert.equal(r.headers.apikey, 'sb_secret_abc');
  assert.equal(r.headers.authorization, undefined);
});
