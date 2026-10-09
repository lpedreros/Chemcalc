/* ============================================================
   PROPOSED, NOT APPLIED, NOT DEPLOYED. Vault version of supabase/functions/trello/handler.ts.
   Deploy only AFTER 20261009120000_trello_credentials_to_vault.sql has been applied (it calls the three
   trello_*_credentials functions that migration creates). To adopt: copy this file over handler.ts.
   ============================================================

   trello/handler.ts — request handling for the `trello` Edge Function

   WHY THIS EXISTS: the browser used to hold the user's Trello API key and token (read from
   public.profiles) and call api.trello.com directly. That put the credentials in every page
   load and let any signed-in user read them with the Supabase client. Now the credentials
   live only in Supabase Vault (encrypted at rest), reached through three SECURITY DEFINER SQL functions that
   only service_role may execute (trello_store_credentials / trello_read_credentials / trello_clear_credentials,
   called as PostgREST RPCs below), and this function makes the Trello calls on the user's behalf.
   The browser never receives them.

   ONE FUNCTION, FIVE ACTIONS (POST, JSON body { action, ... }):
     connect     { apiKey, token }      verify the pair against Trello, then store it for the caller
     boards      {}                     GET  /1/members/me/boards
     lists       { boardId }            GET  /1/boards/{id}/lists
     card        { idList, name, desc } POST /1/cards
     disconnect  {}                     delete the caller's Vault secrets, clear the four board/list columns, then revoke the token at Trello

   IDENTITY: the caller is whoever Supabase Auth says owns the Bearer token (GET /auth/v1/user).
   Nothing in the request body is ever used to choose whose credentials are read or written.
   (verify_jwt = true on the gateway is NOT enough on its own: the public anon key is also a
   validly signed project JWT and passes that check. See the report.)

   No imports on purpose: a cold start only has to load this file, and the file runs unchanged
   under Node for the tests (fetch and env are injected).
   ============================================================ */

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export interface Deps {
  env: Env;
  fetch: typeof fetch;
  allowedOrigins?: string[];
}

// Browsers may call this function from these origins only (create-checkout allows chemcalc.co alone,
// which is why it cannot be called from testing.chemcalc.co).
export const ALLOWED_ORIGINS = ['https://chemcalc.co', 'https://testing.chemcalc.co'];

const TRELLO_API = 'https://api.trello.com/1';
const MAX_BODY_CHARS = 65536;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TRELLO_ID_RE = /^[A-Za-z0-9]{8,32}$/;      // board and list ids; also stops path tricks like "../"
const CREDENTIAL_RE = /^[A-Za-z0-9_-]{8,200}$/;  // Trello keys and tokens are plain alphanumerics

class HttpError extends Error {
  status: number;
  code: string;
  extra: Record<string, unknown>;
  constructor(status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

/* ---------- small helpers ---------- */

function corsHeaders(req: Request, allowed: string[]): Record<string, string> {
  const origin = req.headers.get('Origin');
  const h: Record<string, string> = {
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '7200',
  };
  if (origin && allowed.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function reply(status: number, body: unknown, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

// Anything that could carry a credential (a thrown fetch error names the URL, and Trello's URLs carry key= and token=)
// goes through here before it is logged or shown.
function scrub(text: unknown, secrets: string[] = []): string {
  let s = String(text ?? '');
  for (const secret of secrets) if (secret) s = s.split(secret).join('[redacted]');
  return s.replace(/([?&](?:key|token)=)[^&\s)"']+/gi, '$1[redacted]').slice(0, 300);
}

function asText(v: unknown, max: number): string | null {
  return typeof v === 'string' && v.length <= max ? v : null;
}

/* ---------- Supabase (identity and the profiles row) ---------- */

function bearerOf(key: string): Record<string, string> {
  // Legacy keys are JWTs and go in both headers; the newer sb_secret_ keys are not JWTs and go in apikey only.
  return key.startsWith('eyJ') ? { apikey: key, Authorization: `Bearer ${key}` } : { apikey: key };
}

async function verifiedUserId(req: Request, d: Deps): Promise<string> {
  const m = /^Bearer\s+([A-Za-z0-9._~+\/-]+=*)$/.exec(req.headers.get('Authorization') ?? '');
  if (!m) throw new HttpError(401, 'unauthorized', 'Please sign in again to use Trello.');
  let res: Response;
  try {
    res = await d.fetch(`${d.env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: d.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${m[1]}` },
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    console.error('trello: auth lookup failed:', (e as Error).name);
    throw new HttpError(503, 'auth_unavailable', 'Could not verify your sign-in. Please try again.');
  }
  // The anon key (and any token without a user in it) is rejected here: Auth answers 4xx instead of a user.
  if (!res.ok) throw new HttpError(401, 'unauthorized', 'Please sign in again to use Trello.');
  const user = await res.json().catch(() => null) as { id?: unknown; is_anonymous?: unknown } | null;
  if (!user || typeof user.id !== 'string' || !UUID_RE.test(user.id) || user.is_anonymous === true) {
    throw new HttpError(401, 'unauthorized', 'Please sign in again to use Trello.');
  }
  return user.id.toLowerCase();
}

function rest(d: Deps, path: string, init: RequestInit = {}): Promise<Response> {
  return d.fetch(`${d.env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...bearerOf(d.env.SUPABASE_SERVICE_ROLE_KEY), 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) },
    signal: AbortSignal.timeout(8000),
  });
}

interface Creds { key: string; token: string }

// Calls one of the Vault SQL functions through PostgREST as service_role. The result is whatever the function
// returns (JSON); failures never include the request body, which carries the credentials.
async function rpc(d: Deps, fn: string, args: Record<string, unknown>, failMessage: string): Promise<unknown> {
  let res: Response;
  try {
    res = await rest(d, `rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) });
  } catch (e) {
    console.error(`trello: ${fn} failed:`, (e as Error).name);
    throw new HttpError(503, 'db_unavailable', 'Could not reach your account data. Please try again.');
  }
  if (!res.ok) {
    // PostgREST error bodies hold a code and message from the function; none of them contains a credential.
    console.error(`trello: ${fn} status`, res.status, scrub(await res.text().catch(() => '')));
    throw new HttpError(500, 'db_error', failMessage);
  }
  const text = await res.text().catch(() => '');
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

async function readCreds(d: Deps, uid: string): Promise<Creds | null> {
  const out = await rpc(d, 'trello_read_credentials', { p_user_id: uid }, 'Could not read your Trello connection. Please try again.');
  // A table-returning function answers an array of rows; a single object is accepted too.
  const row = (Array.isArray(out) ? out[0] : out) as { api_key?: unknown; token?: unknown } | null | undefined;
  if (!row || typeof row.api_key !== 'string' || typeof row.token !== 'string' || !row.api_key || !row.token) return null;
  return { key: row.api_key, token: row.token };
}

async function storeCreds(d: Deps, uid: string, apiKey: string, token: string): Promise<void> {
  const out = await rpc(d, 'trello_store_credentials', { p_user_id: uid, p_api_key: apiKey, p_token: token }, 'Could not save your Trello connection. Please try again.');
  if (out !== true) throw new HttpError(404, 'no_profile', 'Your account profile was not found.');
}

async function clearCreds(d: Deps, uid: string): Promise<void> {
  const out = await rpc(d, 'trello_clear_credentials', { p_user_id: uid }, 'Could not save your Trello connection. Please try again.');
  if (out !== true) throw new HttpError(404, 'no_profile', 'Your account profile was not found.');
}

// Plain profile columns (board and list choices); the credentials never go through here.
async function patchProfile(d: Deps, uid: string, columns: Record<string, string | null>): Promise<void> {
  let res: Response;
  try {
    // return=representation + select=id so that "no such profile row" is visible (a bare PATCH answers 204 either way)
    res = await rest(d, `profiles?id=eq.${uid}&select=id`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(columns) });
  } catch (e) {
    console.error('trello: profile write failed:', (e as Error).name);
    throw new HttpError(503, 'db_unavailable', 'Could not reach your account data. Please try again.');
  }
  if (!res.ok) {
    console.error('trello: profile write status', res.status, scrub(await res.text().catch(() => '')));
    throw new HttpError(500, 'db_error', 'Could not save your Trello connection. Please try again.');
  }
  const rows = await res.json().catch(() => null);
  if (!Array.isArray(rows) || rows.length !== 1) throw new HttpError(404, 'no_profile', 'Your account profile was not found.');
}

/* ---------- Trello ---------- */

async function trelloCall(d: Deps, creds: Creds, method: string, path: string, query: Record<string, string>, form?: Record<string, string>): Promise<unknown> {
  const url = new URL(TRELLO_API + path);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  url.searchParams.set('key', creds.key);
  url.searchParams.set('token', creds.token);
  const secrets = [creds.key, creds.token];
  let res: Response;
  try {
    res = await d.fetch(url.toString(), {
      method,
      headers: form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {},
      body: form ? new URLSearchParams(form).toString() : undefined,
      signal: AbortSignal.timeout(10000),
    });
  } catch (e) {
    console.error('trello: upstream request failed:', (e as Error).name, scrub((e as Error).message, secrets));
    throw new HttpError(502, 'trello_unreachable', 'Could not reach Trello. Please try again.');
  }
  if (!res.ok) {
    const detail = scrub(await res.text().catch(() => ''), secrets).slice(0, 200);
    if (res.status === 401 || res.status === 403) {
      throw new HttpError(502, 'trello_unauthorized', 'Trello no longer accepts the saved connection. Disconnect Trello and connect it again.', { trelloStatus: res.status });
    }
    if (res.status === 404) throw new HttpError(502, 'trello_not_found', 'Trello could not find that board or list.', { trelloStatus: 404 });
    if (res.status === 429) throw new HttpError(502, 'trello_rate_limited', 'Trello is busy. Please wait a moment and try again.', { trelloStatus: 429 });
    throw new HttpError(502, 'trello_error', `Trello returned an error (HTTP ${res.status}).`, { trelloStatus: res.status, detail });
  }
  return await res.json().catch(() => null);
}

async function requireCreds(d: Deps, uid: string): Promise<Creds> {
  const creds = await readCreds(d, uid);
  if (!creds) throw new HttpError(409, 'not_connected', 'Trello is not connected. Connect it in My Business Info first.');
  return creds;
}

/* ---------- actions ---------- */

async function actionConnect(d: Deps, uid: string, body: Record<string, unknown>): Promise<unknown> {
  const apiKey = asText(body.apiKey, 200)?.trim() ?? '';
  const token = asText(body.token, 200)?.trim() ?? '';
  if (!CREDENTIAL_RE.test(apiKey) || !CREDENTIAL_RE.test(token)) {
    throw new HttpError(400, 'bad_request', 'That Trello API key or token does not look right. Check the key and authorize again.');
  }
  // Prove the pair works before storing anything.
  try {
    await trelloCall(d, { key: apiKey, token }, 'GET', '/members/me', { fields: 'id' });
  } catch (e) {
    if (e instanceof HttpError && e.code === 'trello_unauthorized') {
      throw new HttpError(400, 'invalid_credentials', 'Trello did not accept that API key and token. Check the key and authorize again.');
    }
    throw e;
  }
  await storeCreds(d, uid, apiKey, token);
  return { ok: true };
}

async function actionBoards(d: Deps, uid: string): Promise<unknown> {
  const creds = await requireCreds(d, uid);
  const data = await trelloCall(d, creds, 'GET', '/members/me/boards', { fields: 'id,name,closed', filter: 'open' });
  const boards = (Array.isArray(data) ? data : [])
    .filter((b): b is { id: string; name?: unknown } => !!b && typeof (b as { id?: unknown }).id === 'string')
    .map((b) => ({ id: b.id, name: String(b.name ?? '') }));
  return { boards };
}

async function actionLists(d: Deps, uid: string, body: Record<string, unknown>): Promise<unknown> {
  const boardId = asText(body.boardId, 64) ?? '';
  if (!TRELLO_ID_RE.test(boardId)) throw new HttpError(400, 'bad_request', 'Choose a Trello board first.');
  const creds = await requireCreds(d, uid);
  const data = await trelloCall(d, creds, 'GET', `/boards/${boardId}/lists`, { filter: 'open', fields: 'id,name' });
  const lists = (Array.isArray(data) ? data : [])
    .filter((l): l is { id: string; name?: unknown } => !!l && typeof (l as { id?: unknown }).id === 'string')
    .map((l) => ({ id: l.id, name: String(l.name ?? '') }));
  return { lists };
}

async function actionCard(d: Deps, uid: string, body: Record<string, unknown>): Promise<unknown> {
  const idList = asText(body.idList, 64) ?? '';
  const name = asText(body.name, 16384) ?? '';
  const desc = body.desc === undefined ? '' : asText(body.desc, 16384);
  if (!TRELLO_ID_RE.test(idList)) throw new HttpError(400, 'bad_request', 'Choose a Trello list first.');
  if (!name.trim()) throw new HttpError(400, 'bad_request', 'The card needs a name.');
  if (desc === null) throw new HttpError(400, 'bad_request', 'The card description is too long.');
  const creds = await requireCreds(d, uid);
  const card = await trelloCall(d, creds, 'POST', '/cards', {}, { idList, name, desc }) as { id?: unknown } | null;
  if (!card || typeof card.id !== 'string') throw new HttpError(502, 'trello_error', 'Trello did not return the new card.');
  return { card: { id: card.id } };
}

async function actionDisconnect(d: Deps, uid: string): Promise<unknown> {
  // read first: after the clear below there is nothing left to revoke. A stored connection that cannot be decrypted
  // (db_error from the read) must still be disconnectable, otherwise the user is stuck: treat it as nothing to revoke.
  let creds: Creds | null = null;
  try {
    creds = await readCreds(d, uid);
  } catch (e) {
    if (!(e instanceof HttpError) || e.code !== 'db_error') throw e;
  }
  await clearCreds(d, uid);
  await patchProfile(d, uid, { trello_board_id: null, trello_board_name: null, trello_list_id: null, trello_list_name: null });
  // Best effort, after the user's intent is done: also revoke the "never expires" token at Trello.
  // revoked: true / false = attempted, null = there was nothing connected.
  let revoked: boolean | null = null;
  if (creds) {
    try {
      await trelloCall(d, creds, 'DELETE', `/tokens/${encodeURIComponent(creds.token)}`, {});
      revoked = true;
    } catch {
      revoked = false;
    }
  }
  return { ok: true, revoked };
}

/* ---------- entry ---------- */

export async function handle(req: Request, d: Deps): Promise<Response> {
  const cors = corsHeaders(req, d.allowedOrigins ?? ALLOWED_ORIGINS);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed', code: 'method_not_allowed' }, cors);

  try {
    if (!d.env.SUPABASE_URL || !d.env.SUPABASE_ANON_KEY || !d.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('trello: missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY');
      throw new HttpError(500, 'config', 'Trello is not available right now.');
    }

    // Identity first: nothing below runs for a caller Supabase Auth does not vouch for.
    const uid = await verifiedUserId(req, d);

    if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_CHARS) throw new HttpError(413, 'too_large', 'That request is too large.');
    const text = await req.text();
    if (text.length > MAX_BODY_CHARS) throw new HttpError(413, 'too_large', 'That request is too large.');
    let body: unknown;
    try { body = JSON.parse(text); } catch { throw new HttpError(400, 'bad_request', 'Invalid request.'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'bad_request', 'Invalid request.');
    const b = body as Record<string, unknown>;

    let result: unknown;
    switch (b.action) {
      case 'connect':    result = await actionConnect(d, uid, b); break;
      case 'boards':     result = await actionBoards(d, uid); break;
      case 'lists':      result = await actionLists(d, uid, b); break;
      case 'card':       result = await actionCard(d, uid, b); break;
      case 'disconnect': result = await actionDisconnect(d, uid); break;
      default: throw new HttpError(400, 'bad_request', 'Unknown action.');
    }
    return reply(200, result, cors);
  } catch (e) {
    if (e instanceof HttpError) return reply(e.status, { error: e.message, code: e.code, ...e.extra }, cors);
    console.error('trello: unexpected error:', (e as Error)?.name, scrub((e as Error)?.message));
    return reply(500, { error: 'Something went wrong. Please try again.', code: 'internal' }, cors);
  }
}
