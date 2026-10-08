// A fake world for the `trello` Edge Function: Supabase Auth, PostgREST (profiles) and the Trello API, all behind one
// fetch(). Shared by trello_handler.test.mjs (unit) and trello_fn_server.mjs (real HTTP server for the browser harness).
// Nothing here talks to the network.
export const SUPABASE_URL = 'https://proj.supabase.co';
export const ANON_KEY = 'eyJhbGciOiJIUzI1NiJ9.anon-role.sig';
export const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiJ9.service-role.sig';

export const UID_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const UID_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
export const KEY_A = 'KEYAAAAAAAA11112222333344445555';
export const TOK_A = 'ATTAtokenAAAA1111222233334444555566667777888899990000aaaabbbbccccdddd';
export const KEY_B = 'KEYBBBBBBBB11112222333344445555';
export const TOK_B = 'ATTAtokenBBBB1111222233334444555566667777888899990000aaaabbbbccccdddd';
export const SECRETS = [KEY_A, TOK_A, KEY_B, TOK_B];

export function createWorld() {
  const w = {
    calls: [],                 // every request the handler made: { method, url, headers, body }
    sessions: new Map(),       // bearer token -> uid
    profiles: new Map(),       // uid -> row
    accounts: new Map(),       // "key|token" -> { boards: [{id,name,closed}], lists: { boardId: [{id,name}] } }
    cards: [],                 // cards created: { idList, name, desc }
    revoked: [],               // tokens revoked at Trello
    fail: {},                  // fault injection: trelloThrow, trelloStatus, restStatus, authThrow, revokeStatus
    log: [],
  };

  w.sessions.set('tokA', UID_A);
  w.sessions.set('tokB', UID_B);
  w.profiles.set(UID_A, { id: UID_A, tier: 'pro', trello_api_key: KEY_A, trello_token: TOK_A, trello_board_id: 'boardA001', trello_board_name: 'Jobs A', trello_list_id: 'listA001', trello_list_name: 'Sent A' });
  w.profiles.set(UID_B, { id: UID_B, tier: 'pro', trello_api_key: KEY_B, trello_token: TOK_B, trello_board_id: 'boardB001', trello_board_name: 'Jobs B', trello_list_id: 'listB001', trello_list_name: 'Sent B' });
  w.accounts.set(`${KEY_A}|${TOK_A}`, {
    boards: [{ id: 'boardA001', name: 'Jobs A', closed: false }, { id: 'boardA002', name: 'Other A', closed: false }],
    lists: { boardA001: [{ id: 'listA001', name: 'Sent A' }, { id: 'listA002', name: 'Done A' }], boardA002: [{ id: 'listA003', name: 'Misc A' }] },
  });
  w.accounts.set(`${KEY_B}|${TOK_B}`, { boards: [{ id: 'boardB001', name: 'Jobs B', closed: false }], lists: { boardB001: [{ id: 'listB001', name: 'Sent B' }] } });

  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  w.fetch = async (input, init = {}) => {
    const url = String(input);
    const u = new URL(url);
    const headers = Object.fromEntries(Object.entries(init.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
    const method = (init.method || 'GET').toUpperCase();
    w.calls.push({ method, url, headers, body: init.body ?? null });

    if (url.startsWith(SUPABASE_URL + '/auth/v1/user')) {
      if (w.fail.authThrow) throw new TypeError('fetch failed');
      const token = (headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (token === ANON_KEY) return json(403, { code: 403, error_code: 'bad_jwt', msg: 'invalid claim: missing sub claim' });
      const uid = w.sessions.get(token);
      if (!uid) return json(403, { code: 403, error_code: 'bad_jwt', msg: 'invalid JWT: unable to parse or verify signature' }); // real Auth answers 403 bad_jwt (checked 2026-10-08)
      return json(200, { id: uid, email: 'x@example.test', is_anonymous: false });
    }

    if (url.startsWith(SUPABASE_URL + '/rest/v1/profiles')) {
      if (headers.apikey !== SERVICE_KEY) return json(401, { message: 'Invalid API key' });
      if (w.fail.restStatus) return json(w.fail.restStatus, { message: 'boom' });
      const uid = (u.searchParams.get('id') || '').replace(/^eq\./, '');
      const row = w.profiles.get(uid);
      if (method === 'GET') return json(200, row ? [{ trello_api_key: row.trello_api_key ?? null, trello_token: row.trello_token ?? null }] : []);
      if (method === 'PATCH') {
        if (!row) return json(200, []);
        Object.assign(row, JSON.parse(init.body));
        return json(200, [{ id: uid }]);
      }
    }

    if (u.hostname === 'api.trello.com') {
      if (w.fail.trelloThrow) throw new TypeError(`error sending request for url (${url})`);
      if (w.fail.trelloStatus) return new Response('upstream said no', { status: w.fail.trelloStatus });
      const acct = w.accounts.get(`${u.searchParams.get('key')}|${u.searchParams.get('token')}`);
      if (!acct) return new Response('invalid token', { status: 401 });
      const path = u.pathname.replace(/^\/1/, '');
      if (method === 'GET' && path === '/members/me') return json(200, { id: 'member1' });
      if (method === 'GET' && path === '/members/me/boards') return json(200, acct.boards.filter((b) => !b.closed).map((b) => ({ id: b.id, name: b.name, closed: b.closed, secretExtra: 'x' })));
      let m = /^\/boards\/([^/]+)\/lists$/.exec(path);
      if (method === 'GET' && m) return acct.lists[m[1]] ? json(200, acct.lists[m[1]]) : new Response('invalid id', { status: 404 });
      if (method === 'POST' && path === '/cards') {
        const form = Object.fromEntries(new URLSearchParams(init.body));
        w.cards.push(form);
        return json(200, { id: 'card' + w.cards.length, shortUrl: 'https://trello.com/c/x', ...form });
      }
      m = /^\/tokens\/([^/]+)$/.exec(path);
      if (method === 'DELETE' && m) {
        if (w.fail.revokeStatus) return new Response('nope', { status: w.fail.revokeStatus });
        w.revoked.push(decodeURIComponent(m[1]));
        return json(200, {});
      }
    }
    return new Response('fake world: unrouted ' + method + ' ' + url, { status: 599 });
  };
  return w;
}

export const ENV = { SUPABASE_URL, SUPABASE_ANON_KEY: ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY };
