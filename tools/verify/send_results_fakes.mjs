// Fake world for supabase/functions/send-results/handler.ts: a stand-in for PostgREST (the email_send_log table and the
// get_random_tip function), Resend and Brevo. Every outgoing request is recorded in `calls`. No network, no real keys.
export const SUPABASE_URL = 'https://proj.supabase.co';
export const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiJ9.service-role.sig';
export const RESEND_KEY = 're_test_key_123';
export const BREVO_KEY = 'xkeysib-test-key-456';
export const ENV = { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, RESEND_API_KEY: RESEND_KEY, BREVO_API_KEY: BREVO_KEY, BREVO_DOI_TEMPLATE_ID: '7', BREVO_DOI_REDIRECT_URL: 'https://chemcalc.co/thanks' };
export const NOW = Date.parse('2026-10-28T12:00:00.000Z');
export const HOUR = 3600 * 1000;

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const json = (status, body, headers = {}) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

export function createWorld() {
  const w = {
    rows: [],                 // email_send_log rows: { id, created_at(ISO), recipient_hash, ip_hash, kind }
    calls: [],                // { method, url, headers, body }
    tip: 'Mix in small batches.',
    fail: { countStatus: 0, countThrows: false, noContentRange: false, insertStatus: 0, insertThrows: false, pruneThrows: false, tipStatus: 0, resendStatus: 0, resendThrows: false, brevoStatus: 201, brevoThrows: false },
    seed(recipientHash, ipHash, ageMs, n = 1) {
      for (let i = 0; i < n; i++) w.rows.push({ id: 'seed' + w.rows.length, created_at: new Date(NOW - ageMs).toISOString(), recipient_hash: recipientHash, ip_hash: ipHash, kind: 'results' });
    },
    async fetch(input, init = {}) {
      const url = String(input);
      const method = init.method || 'GET';
      const headers = Object.fromEntries(Object.entries(init.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
      const bodyText = init.body === undefined ? undefined : String(init.body);
      const call = { method, url, headers, body: bodyText === undefined ? undefined : JSON.parse(bodyText) };
      w.calls.push(call);
      const u = new URL(url);

      if (u.origin === SUPABASE_URL && u.pathname === '/rest/v1/email_send_log') {
        if (method === 'GET') {
          if (w.fail.countThrows) throw new TypeError('network down');
          if (w.fail.countStatus) return json(w.fail.countStatus, { message: 'boom' });
          const p = u.searchParams;
          const since = p.get('created_at').replace(/^gte\./, '');
          const rec = (p.get('recipient_hash') || '').replace(/^eq\./, '');
          const ip = (p.get('ip_hash') || '').replace(/^eq\./, '');
          const n = w.rows.filter((r) => r.created_at >= since && (!rec || r.recipient_hash === rec) && (!ip || r.ip_hash === ip)).length;
          return json(200, [], w.fail.noContentRange ? {} : { 'Content-Range': n ? `0-0/${n}` : '*/0' });
        }
        if (method === 'POST') {
          if (w.fail.insertThrows) throw new TypeError('network down');
          if (w.fail.insertStatus) return json(w.fail.insertStatus, { message: 'boom' });
          w.rows.push({ id: 'row' + w.rows.length, created_at: new Date(w.now ?? NOW).toISOString(), kind: 'results', ...call.body });
          return new Response(null, { status: 201 });
        }
        if (method === 'DELETE') {
          if (w.fail.pruneThrows) throw new TypeError('network down');
          const before = u.searchParams.get('created_at').replace(/^lt\./, '');
          w.rows = w.rows.filter((r) => r.created_at >= before);
          return new Response(null, { status: 204 });
        }
      }
      if (u.origin === SUPABASE_URL && u.pathname === '/rest/v1/rpc/get_random_tip') {
        if (w.fail.tipStatus) return json(w.fail.tipStatus, { message: 'boom' });
        return json(200, w.tip);
      }
      if (url === 'https://api.resend.com/emails') {
        if (w.fail.resendThrows) throw new TypeError('network down');
        if (w.fail.resendStatus) return json(w.fail.resendStatus, { message: 'resend says: ' + RESEND_KEY });
        return json(200, { id: 'em_1' });
      }
      if (u.origin === 'https://api.brevo.com') {
        if (w.fail.brevoThrows) throw new TypeError('network down');
        return json(w.fail.brevoStatus, { message: 'brevo' });
      }
      throw new Error('fake world: unexpected request ' + method + ' ' + url);
    },
  };
  w.fetch = w.fetch.bind(w);
  return w;
}

export const resendCalls = (w) => w.calls.filter((c) => c.url === 'https://api.resend.com/emails');
export const brevoCalls = (w) => w.calls.filter((c) => c.url.startsWith('https://api.brevo.com'));
export const logWrites = (w) => w.calls.filter((c) => c.url.includes('/rest/v1/email_send_log') && c.method === 'POST');
