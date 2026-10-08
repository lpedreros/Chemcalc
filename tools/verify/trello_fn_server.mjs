// The REAL supabase/functions/trello/handler.ts behind a local HTTP server, with the fake Auth / PostgREST / Trello world behind it.
// For the browser harness (forge-harness/cdp_trello_server.py): the page calls this like it would call the deployed function, so
// preflight and CORS are exercised for real.
//   node tools/verify/trello_fn_server.mjs PORT ALLOWED_ORIGIN [ALLOWED_ORIGIN ...]
// Control endpoints (test only): POST /__world/reset {connected, boardId, listId}   POST /__world/account {key, token}   GET /__world
import http from 'node:http';
import { handle } from '../../supabase/functions/trello/handler.ts';
import { createWorld, ENV } from './trello_fakes.mjs';

const [port, ...origins] = process.argv.slice(2);
if (!port || !origins.length) { console.error('usage: node trello_fn_server.mjs PORT ALLOWED_ORIGIN...'); process.exit(2); }

// the browser harness's fake session: access_token "test" for this user (see forge-harness/mock_supabase.py)
export const MOCK_UID = '11111111-1111-1111-1111-111111111111';
export const SRV_KEY = 'SRVKEYSRVKEY11112222333344445555';
export const SRV_TOKEN = 'ATTAsrvtoken1111222233334444555566667777888899990000aaaabbbbccccdddd';

let w;
function reset(opts = {}) {
  w = createWorld();
  w.sessions.set('test', MOCK_UID);
  w.accounts.set(`${SRV_KEY}|${SRV_TOKEN}`, {
    boards: [{ id: 'boardM001', name: 'Jobs Board', closed: false }, { id: 'boardM002', name: 'Other Board', closed: false }],
    lists: { boardM001: [{ id: 'listM001', name: 'Estimates Sent' }, { id: 'listM002', name: 'Done' }], boardM002: [{ id: 'listM003', name: 'Misc' }] },
  });
  const connected = opts.connected !== false;
  w.profiles.set(MOCK_UID, {
    id: MOCK_UID, tier: 'pro',
    trello_api_key: connected ? SRV_KEY : null, trello_token: connected ? SRV_TOKEN : null,
    trello_board_id: connected ? 'boardM001' : null, trello_board_name: connected ? 'Jobs Board' : null,
    trello_list_id: connected ? 'listM001' : null, trello_list_name: connected ? 'Estimates Sent' : null,
  });
}
reset();

const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };

http.createServer(async (nreq, nres) => {
  const chunks = [];
  for await (const c of nreq) chunks.push(c);
  const raw = Buffer.concat(chunks);
  if (nreq.url.startsWith('/__world')) {
    if (nreq.method === 'POST' && nreq.url === '/__world/reset') { reset(JSON.parse(raw.toString() || '{}')); return send(nres, 200, { ok: true }); }
    if (nreq.method === 'POST' && nreq.url === '/__world/account') {
      const a = JSON.parse(raw.toString());
      w.accounts.set(`${a.key}|${a.token}`, { boards: [{ id: 'boardN001', name: 'New Account Board', closed: false }], lists: { boardN001: [{ id: 'listN001', name: 'New List' }] } });
      return send(nres, 200, { ok: true });
    }
    if (nreq.method === 'POST' && nreq.url === '/__world/clear-profile') { Object.assign(w.profiles.get(MOCK_UID), { trello_api_key: null, trello_token: null }); return send(nres, 200, { ok: true }); }
    if (nreq.method === 'GET' && nreq.url === '/__world') {
      return send(nres, 200, { profile: w.profiles.get(MOCK_UID), cards: w.cards, revoked: w.revoked, upstream: w.calls.filter((c) => c.url.includes('api.trello.com')).map((c) => ({ method: c.method, path: new URL(c.url).pathname })) });
    }
    return send(nres, 404, { error: 'unknown control endpoint' });
  }
  const url = `http://${nreq.headers.host}${nreq.url}`;
  const req = new Request(url, { method: nreq.method, headers: nreq.headers, body: ['GET', 'HEAD'].includes(nreq.method) ? undefined : raw });
  const res = await handle(req, { env: ENV, fetch: w.fetch, allowedOrigins: origins });
  nres.writeHead(res.status, Object.fromEntries(res.headers));
  nres.end(Buffer.from(await res.arrayBuffer()));
}).listen(Number(port), '127.0.0.1', () => console.log('trello function server on 127.0.0.1:' + port + ', allowed origins: ' + origins.join(', ')));
