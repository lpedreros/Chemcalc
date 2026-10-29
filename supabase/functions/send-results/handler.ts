/* ============================================================
   send-results/handler.ts — request handling for the `send-results` Edge Function

   WHAT IT DOES: the calculators' "Email Me These Results" box posts { email, calculatorName, resultsHtml, sourceUrl,
   calculatorId, marketingOptIn } here; this function emails the results through Resend and, if the visitor ticked the
   marketing box, starts a Brevo double opt-in (a confirmation email; nobody is added to the list until they click it).

   WHY IT WAS REWRITTEN (2026-10-28): the deployed version (v3) was an open mail relay. It had no limits and trusted every field, so anyone
   could make it send an email from chemcalc-results@thinkandengage.com to ANY address with ANY html and links. Now:
     R1 every field is validated (one plain address, short name, known calculator id, size cap) -> 400 "Invalid request"
     R2 resultsHtml is run through an allowlist sanitizer built from what the real calculators send (only <p> and
        <strong> with a few style properties; links only to ChemCalc hosts)
     R3 sourceUrl is only used when it is a ChemCalc address
     R4 limits per rolling 24 h, checked BEFORE anything is sent: 3 per recipient, 10 per IP, 50 overall -> 429.
        Only SHA-256 hashes are stored (table public.email_send_log). Any database failure fails closed (503, nothing sent).
     R5 CORS: only the three ChemCalc origins are echoed (never *)
     R6 generic error bodies; logs hold the first 8 characters of the recipient hash, never the address or the html
     R7 Brevo: never POST /v3/contacts (that adds people with no confirmation). Double opt-in only, and only when
        BREVO_DOI_TEMPLATE_ID is set; a Brevo failure never blocks the results email

   No imports on purpose (same as the trello function): the file runs unchanged under Node for the tests (fetch, env and
   the clock are injected).
   ============================================================ */

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY: string;
  BREVO_API_KEY?: string;
  BREVO_DOI_TEMPLATE_ID?: string;
  BREVO_DOI_REDIRECT_URL?: string;
}

export interface Deps {
  env: Env;
  fetch: typeof fetch;
  now?: () => number;
  allowedOrigins?: string[];
}

export const ALLOWED_ORIGINS = ['https://chemcalc.co', 'https://www.chemcalc.co', 'https://testing.chemcalc.co'];
// The tracker ids the calculators send (window._ccLastCalc.calculator); the page sends null before any calculation.
export const CALCULATOR_IDS = ['alexseal', 'awlgrip', 'clothcalc', 'epifanes', 'mekp'];
// Largest real resultsHtml seen (Alexseal, 910 characters) times three, rounded.
export const MAX_RESULTS_HTML = 3000;
const MAX_BODY_CHARS = MAX_RESULTS_HTML + 3000;
export const LIMITS = { recipient: 3, ip: 10, global: 50 };
const WINDOW_MS = 24 * 60 * 60 * 1000;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
// Brevo list the confirmed contacts join. UNVERIFIED: Leo must confirm that list 2 is the right list in the Brevo dashboard.
export const BREVO_LIST_ID = 2;
const LINK_HOSTS = ['chemcalc.co', 'www.chemcalc.co', 'testing.chemcalc.co'];
const SOURCE_PREFIXES = ['https://chemcalc.co/', 'https://www.chemcalc.co/', 'https://testing.chemcalc.co/'];
const FROM = 'ChemCalc Results <chemcalc-results@thinkandengage.com>';

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
const INVALID = () => new HttpError(400, 'Invalid request');
const TOO_MANY = () => new HttpError(429, 'Too many requests');
const UNAVAILABLE = () => new HttpError(503, 'Service unavailable');

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
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ---------- R1: validation ---------- */

// A single plain address: no quotes, no spaces, no angle brackets, no comma or semicolon, no CR/LF. Deliberately narrower than the RFC.
const EMAIL_RE = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export interface Request_ {
  email: string;
  calculatorName: string;
  calculatorId: string | null;
  resultsHtml: string;
  sourceUrl: string;
  marketingOptIn: boolean;
}

export function validate(body: unknown): Request_ {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw INVALID();
  const b = body as Record<string, unknown>;
  const email = b.email;
  if (typeof email !== 'string' || email.length > 254 || !EMAIL_RE.test(email)) throw INVALID();
  const name = b.calculatorName;
  if (typeof name !== 'string' || name.length < 1 || name.length > 80 || /[<>\r\n]/.test(name)) throw INVALID();
  let calculatorId: string | null = null;
  if (b.calculatorId !== undefined && b.calculatorId !== null) {
    if (typeof b.calculatorId !== 'string' || !CALCULATOR_IDS.includes(b.calculatorId)) throw INVALID();
    calculatorId = b.calculatorId;
  }
  const html = b.resultsHtml;
  if (typeof html !== 'string' || html.length < 1 || html.length > MAX_RESULTS_HTML) throw INVALID();
  const sourceUrl = typeof b.sourceUrl === 'string' ? b.sourceUrl : '';
  return { email, calculatorName: name, calculatorId, resultsHtml: html, sourceUrl, marketingOptIn: b.marketingOptIn === true };
}

/* ---------- R3: the "Return to Calculator" address ---------- */

export function safeSourceUrl(src: string): string {
  const fallback = 'https://chemcalc.co';
  if (typeof src !== 'string' || src.length > 2000) return fallback;
  const okPrefix = SOURCE_PREFIXES.some((p) => src.startsWith(p)) || ALLOWED_ORIGINS.includes(src);
  if (!okPrefix) return fallback;
  try {
    const u = new URL(src);
    if (u.protocol !== 'https:' || u.username || u.password || !LINK_HOSTS.includes(u.hostname)) return fallback;
    return u.href;
  } catch {
    return fallback;
  }
}

/* ---------- R2: sanitizer for resultsHtml ---------- */
// What the real calculators send (7 captured payloads, 5 calculators): only <p style="..."> and <strong>, no links, no images.
// Style properties seen: margin-bottom, font-size, color. A few harmless neighbours are allowed so a reworded page does not break.

const ALLOWED_TAGS = new Set(['p', 'strong', 'b', 'em', 'i', 'br', 'span', 'a']);
const VOID_TAGS = new Set(['br']);
// Removed together with everything inside them.
const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'template', 'noscript', 'textarea', 'title', 'head', 'math', 'xmp', 'plaintext']);
const STYLE_PROPS = new Set(['margin-bottom', 'margin-top', 'font-size', 'font-weight', 'color', 'text-align']);
const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", colon: ':', tab: '\t', newline: '\n', lpar: '(', rpar: ')' };

function decodeEntities(s: string): string {
  return s.replace(/&(?:#x([0-9a-f]+)|#(\d+)|([a-z]+));?/gi, (m, hex, dec, name) => {
    if (hex || dec) {
      const cp = hex ? parseInt(hex, 16) : parseInt(dec, 10);
      return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : '';
    }
    const v = NAMED_ENTITIES[String(name).toLowerCase()];
    return v === undefined ? m : v;
  });
}

function parseAttrs(src: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const re = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) out.push([m[1].toLowerCase(), decodeEntities(m[2] ?? m[3] ?? m[4] ?? '')]);
  return out;
}

function safeStyle(value: string): string {
  const parts: string[] = [];
  for (const decl of value.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    const val = decl.slice(i + 1).trim();
    if (!STYLE_PROPS.has(prop) || !val) continue;
    if (!/^[#a-zA-Z0-9.%\s,()-]+$/.test(val)) continue;
    if (/url\s*\(|expression|@import|behavior|javascript|var\s*\(|calc\s*\(/i.test(val)) continue;
    parts.push(`${prop}: ${val};`);
  }
  return parts.join(' ');
}

function safeHref(value: string): string | null {
  const v = value.replace(/[\u0000- \u007f-\u009f]/g, '');
  if (!/^https:\/\//i.test(v)) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:' || u.username || u.password || !LINK_HOSTS.includes(u.hostname)) return null;
    return u.href;
  } catch {
    return null;
  }
}

const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/y;

export function sanitizeResultsHtml(html: string): string {
  let out = '';
  const stack: string[] = [];
  let i = 0;
  const n = html.length;
  while (i < n) {
    const lt = html.indexOf('<', i);
    if (lt < 0) { out += html.slice(i); break; }
    out += html.slice(i, lt);
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      i = end < 0 ? n : end + 3;
      continue;
    }
    TAG_RE.lastIndex = lt;
    const m = TAG_RE.exec(html);
    if (!m) { out += '&lt;'; i = lt + 1; continue; }   // not a well-formed tag: show it as text, never as markup
    i = lt + m[0].length;
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (DROP_WITH_CONTENT.has(tag)) {
      if (!closing) {
        const close = new RegExp('</' + tag + '\\s*>', 'ig');
        close.lastIndex = i;
        const cm = close.exec(html);
        i = cm ? cm.index + cm[0].length : n;
      }
      continue;
    }
    if (!ALLOWED_TAGS.has(tag)) continue;               // img, input, button, form, link, meta, base, ...: the tag goes, its text stays
    if (closing) {
      const at = stack.lastIndexOf(tag);
      if (at < 0) continue;
      while (stack.length - 1 > at) out += `</${stack.pop()}>`;
      out += `</${stack.pop()}>`;
      continue;
    }
    const attrs = parseAttrs(m[3]);
    let built = `<${tag}`;
    if (tag === 'a') {
      const hrefAttr = attrs.find(([k]) => k === 'href');
      const href = hrefAttr ? safeHref(hrefAttr[1]) : null;
      if (!href) continue;                              // any other link becomes plain text (its closing tag is dropped too: not on the stack)
      built += ` href="${escHtml(href)}"`;
    }
    const styleAttr = attrs.find(([k]) => k === 'style');
    if (styleAttr) {
      const s = safeStyle(styleAttr[1]);
      if (s) built += ` style="${escHtml(s)}"`;
    }
    built += '>';
    out += built;
    if (!VOID_TAGS.has(tag)) stack.push(tag);
  }
  while (stack.length) out += `</${stack.pop()}>`;
  return out;
}

/* ---------- the email ---------- */

function buildEmailHtml(calculatorName: string, resultsHtml: string, sourceUrl: string, tip: string): string {
  const tipBlock = tip
    ? `<div style="background:#e8f4f8;border-left:4px solid #3498db;padding:14px 18px;border-radius:4px;margin:24px 0;">
         <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#2c3e50;text-transform:uppercase;letter-spacing:0.05em;">Pro Tip</p>
         <p style="margin:0;font-size:14px;color:#2c3e50;">${tip}</p>
       </div>`
    : '';

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#2c3e50;">
      <h2 style="color:#2c3e50;">Your ${escHtml(calculatorName)} Results</h2>

      <div style="background:#f8f9fa;padding:20px;border-radius:5px;margin-bottom:20px;">
        ${resultsHtml}
      </div>

      <p>
        <a href="${escHtml(sourceUrl)}" style="color:#3498db;text-decoration:none;">&larr; Return to Calculator</a>
      </p>

      ${tipBlock}

      <hr style="border:0;border-top:1px solid #eee;margin:30px 0;">

      <h3 style="color:#2c3e50;">Need materials for your project?</h3>
      <p>Check out our curated marine repair kits and expert-recommended products.</p>
      <p>
        <a href="https://chemcalc.co/kits.html"
           style="display:inline-block;background:#3498db;color:white;padding:10px 20px;text-decoration:none;border-radius:3px;">
          Shop Marine Kits
        </a>
        &nbsp;&nbsp;
        <a href="https://chemcalc.co/estimate.html"
           style="display:inline-block;background:#2ecc71;color:white;padding:10px 20px;text-decoration:none;border-radius:3px;">
          Build an Estimate
        </a>
      </p>

      <p style="font-size:12px;color:#7f8c8d;margin-top:40px;">
        &copy; ${new Date().getFullYear()} Think &amp; Engage, LLC. All rights reserved.
      </p>
    </div>
  `;
}

/* ---------- Supabase REST (service role): the send log and the tip ---------- */

function rest(d: Deps, path: string, init: RequestInit = {}): Promise<Response> {
  const key = d.env.SUPABASE_SERVICE_ROLE_KEY;
  // Legacy keys are JWTs and go in both headers; the newer sb_secret_ keys are not JWTs and go in apikey only.
  const auth: Record<string, string> = key.startsWith('eyJ') ? { apikey: key, Authorization: `Bearer ${key}` } : { apikey: key };
  return d.fetch(`${d.env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...auth, 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) },
    signal: AbortSignal.timeout(8000),
  });
}

// Rows in the log since `sinceIso` that match `filter` ('' = all). Fails closed: any problem is a 503.
async function countSince(d: Deps, filter: string, sinceIso: string): Promise<number> {
  let res: Response;
  try {
    res = await rest(d, `email_send_log?select=id&${filter}created_at=gte.${encodeURIComponent(sinceIso)}&limit=1`, { method: 'GET', headers: { Prefer: 'count=exact' } });
  } catch (e) {
    console.error('send-results: limit check failed:', (e as Error).name);
    throw UNAVAILABLE();
  }
  if (!res.ok) {
    console.error('send-results: limit check status', res.status);
    throw UNAVAILABLE();
  }
  const m = /\/(\d+)$/.exec(res.headers.get('content-range') ?? '');
  if (!m) {
    console.error('send-results: limit check gave no count');
    throw UNAVAILABLE();
  }
  return parseInt(m[1], 10);
}

async function recordSend(d: Deps, recipientHash: string, ipHash: string): Promise<void> {
  let res: Response;
  try {
    res = await rest(d, 'email_send_log', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ recipient_hash: recipientHash, ip_hash: ipHash, kind: 'results' }) });
  } catch (e) {
    console.error('send-results: log write failed:', (e as Error).name);
    throw UNAVAILABLE();
  }
  if (!res.ok) {
    console.error('send-results: log write status', res.status);
    throw UNAVAILABLE();
  }
}

// Best effort, at most once per request: drop log rows older than 30 days. Never affects the response.
async function pruneOldRows(d: Deps, nowMs: number): Promise<void> {
  try {
    const res = await rest(d, `email_send_log?created_at=lt.${encodeURIComponent(new Date(nowMs - RETENTION_MS).toISOString())}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    if (!res.ok) console.warn('send-results: prune status', res.status);
  } catch (e) {
    console.warn('send-results: prune failed:', (e as Error).name);
  }
}

// Same behaviour as before: a tip for the calculator, or nothing; never blocks the email.
async function getRandomTip(d: Deps, calculatorId: string | null): Promise<string> {
  try {
    const res = await rest(d, 'rpc/get_random_tip', { method: 'POST', body: JSON.stringify({ p_calculator: calculatorId ?? null }) });
    if (!res.ok) return '';
    const data = await res.json().catch(() => null);
    return typeof data === 'string' ? data : '';
  } catch {
    return '';
  }
}

/* ---------- Resend and Brevo ---------- */

async function sendWithResend(d: Deps, to: string, subject: string, html: string): Promise<void> {
  let res: Response;
  try {
    res = await d.fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${d.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (e) {
    console.error('send-results: resend unreachable:', (e as Error).name);
    throw new HttpError(502, 'Email service unavailable');
  }
  if (!res.ok) {
    console.error('send-results: resend status', res.status);   // the upstream body is never logged or returned
    throw new HttpError(502, 'Email service unavailable');
  }
}

let doiSkipLogged = false;

// Double opt-in only: Brevo emails the visitor a confirmation and adds them to the list after they click it.
async function startDoubleOptIn(d: Deps, email: string, calculatorName: string): Promise<void> {
  const templateId = Number(d.env.BREVO_DOI_TEMPLATE_ID);
  if (!d.env.BREVO_DOI_TEMPLATE_ID || !Number.isInteger(templateId) || templateId <= 0 || !d.env.BREVO_API_KEY) {
    if (!doiSkipLogged) { doiSkipLogged = true; console.warn('send-results: Brevo double opt-in is not configured; marketing sign-ups are skipped'); }
    return;
  }
  try {
    const res = await d.fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
      method: 'POST',
      headers: { 'api-key': d.env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email,
        attributes: { LAST_CALCULATOR_USED: calculatorName },
        includeListIds: [BREVO_LIST_ID],
        templateId,
        redirectionUrl: d.env.BREVO_DOI_REDIRECT_URL || 'https://chemcalc.co/',
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.status !== 201) console.warn('send-results: Brevo double opt-in status', res.status);
  } catch (e) {
    console.warn('send-results: Brevo double opt-in failed:', (e as Error).name);
  }
}

/* ---------- entry ---------- */

export async function handle(req: Request, d: Deps): Promise<Response> {
  const cors = corsHeaders(req, d.allowedOrigins ?? ALLOWED_ORIGINS);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' }, cors);

  try {
    if (!d.env.SUPABASE_URL || !d.env.SUPABASE_SERVICE_ROLE_KEY || !d.env.RESEND_API_KEY) {
      console.error('send-results: missing configuration');
      throw UNAVAILABLE();
    }

    if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_CHARS) throw INVALID();
    const text = await req.text();
    if (text.length > MAX_BODY_CHARS) throw INVALID();
    let body: unknown;
    try { body = JSON.parse(text); } catch { throw INVALID(); }
    const v = validate(body);

    const now = (d.now ?? Date.now)();
    const sinceIso = new Date(now - WINDOW_MS).toISOString();
    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
    const recipientHash = await sha256Hex(v.email.toLowerCase());
    const ipHash = await sha256Hex(ip);

    // Limits first: nothing is sent unless all three are under their cap.
    if ((await countSince(d, `recipient_hash=eq.${recipientHash}&`, sinceIso)) >= LIMITS.recipient) { console.warn('send-results: recipient limit', recipientHash.slice(0, 8)); throw TOO_MANY(); }
    if ((await countSince(d, `ip_hash=eq.${ipHash}&`, sinceIso)) >= LIMITS.ip) { console.warn('send-results: ip limit', ipHash.slice(0, 8)); throw TOO_MANY(); }
    if ((await countSince(d, '', sinceIso)) >= LIMITS.global) { console.warn('send-results: global limit'); throw TOO_MANY(); }
    await recordSend(d, recipientHash, ipHash);

    const tip = await getRandomTip(d, v.calculatorId);
    const html = buildEmailHtml(v.calculatorName, sanitizeResultsHtml(v.resultsHtml), safeSourceUrl(v.sourceUrl), tip);
    const subject = `Your ${v.calculatorName.replace(/[\r\n]+/g, ' ')} Results from ChemCalc`;
    await sendWithResend(d, v.email, subject, html);

    if (v.marketingOptIn) await startDoubleOptIn(d, v.email, v.calculatorName);
    await pruneOldRows(d, now);

    return reply(200, { success: true, message: 'Email sent successfully' }, cors);
  } catch (e) {
    if (e instanceof HttpError) return reply(e.status, { error: e.message }, cors);
    console.error('send-results: unexpected error:', (e as Error)?.name);
    return reply(503, { error: 'Service unavailable' }, cors);
  }
}
