// Unit tests for supabase/functions/send-results/handler.ts.   node --test tools/verify/send_results_handler.test.mjs   (Node 22.18+/24: runs the .ts directly)
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { handle, sanitizeResultsHtml, safeSourceUrl, validate, ALLOWED_ORIGINS, CALCULATOR_IDS, LIMITS, MAX_RESULTS_HTML, BREVO_LIST_ID } from '../../supabase/functions/send-results/handler.ts';
import { createWorld, ENV, NOW, HOUR, RESEND_KEY, BREVO_KEY, SERVICE_KEY, sha256Hex, resendCalls, brevoCalls, logWrites } from './send_results_fakes.mjs';

const REAL = JSON.parse(readFileSync(new URL('./send_results_real_payloads.json', import.meta.url), 'utf8'));   // 7 bodies captured from the live calculators
const URL_FN = 'https://proj.supabase.co/functions/v1/send-results';
const EMAIL = 'Tester@Example.com';
const IP = '203.0.113.7';

let w; let logs;
beforeEach(() => {
  w = createWorld();
  logs = [];
  console.error = (...a) => logs.push(a.map(String).join(' '));
  console.warn = (...a) => logs.push(a.map(String).join(' '));
});

const goodBody = (over = {}) => ({
  email: EMAIL,
  calculatorName: 'MEKP Catalyst',
  calculatorId: 'mekp',
  resultsHtml: '<p style="margin-bottom: 10px; font-size: 16px;">Add <strong>12 mL</strong></p>',
  sourceUrl: 'https://chemcalc.co/mekpcalc.html',
  marketingOptIn: false,
  ...over,
});
const call = (body, { origin = 'https://chemcalc.co', ip = IP, method = 'POST', raw, env = ENV, headers = {} } = {}) =>
  handle(new Request(URL_FN, {
    method,
    headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}), ...(ip ? { 'x-forwarded-for': ip } : {}), ...headers },
    body: method === 'POST' ? (raw ?? JSON.stringify(body)) : undefined,
  }), { env, fetch: w.fetch, now: () => NOW });
const expectInvalid = async (body, opts) => {
  const r = await call(body, opts);
  assert.equal(r.status, 400);
  assert.deepEqual(await r.json(), { error: 'Invalid request' });
  assert.equal(resendCalls(w).length, 0, 'nothing is sent');
  assert.equal(w.calls.length, 0, 'not even a database call');
};

/* ---------- happy path ---------- */
test('success: 200 {success, message}; one Resend call to one recipient, same from address and subject pattern', async () => {
  const r = await call(goodBody());
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { success: true, message: 'Email sent successfully' });
  const [s] = resendCalls(w);
  assert.equal(resendCalls(w).length, 1);
  assert.equal(s.headers.authorization, `Bearer ${RESEND_KEY}`);
  assert.equal(s.body.from, 'ChemCalc Results <chemcalc-results@thinkandengage.com>');
  assert.deepEqual(s.body.to, [EMAIL]);
  assert.equal(s.body.subject, 'Your MEKP Catalyst Results from ChemCalc');
});
test('success: email keeps the layout: heading, results box, return link, tip, kits and estimate buttons, footer', async () => {
  await call(goodBody());
  const h = resendCalls(w)[0].body.html;
  for (const s of ['<h2 style="color:#2c3e50;">Your MEKP Catalyst Results</h2>', 'background:#f8f9fa;padding:20px', '&larr; Return to Calculator', 'href="https://chemcalc.co/mekpcalc.html"',
    'Pro Tip', 'Mix in small batches.', 'Need materials for your project?', 'href="https://chemcalc.co/kits.html"', 'Shop Marine Kits', 'href="https://chemcalc.co/estimate.html"', 'Build an Estimate', 'Think &amp; Engage, LLC. All rights reserved.'])
    assert.ok(h.includes(s), s);
});
test('success: no tip block when the tip lookup fails, and the email still goes', async () => {
  w.fail.tipStatus = 500;
  const r = await call(goodBody());
  assert.equal(r.status, 200);
  assert.ok(!resendCalls(w)[0].body.html.includes('Pro Tip'));
});
test('the tip lookup uses the calculator id (null when none)', async () => {
  await call(goodBody({ calculatorId: 'awlgrip' }));
  await call(goodBody({ calculatorId: null, email: 'b@example.com' }));
  const tips = w.calls.filter((c) => c.url.endsWith('/rpc/get_random_tip')).map((c) => c.body);
  assert.deepEqual(tips, [{ p_calculator: 'awlgrip' }, { p_calculator: null }]);
});
test('real payloads: all 7 captured request bodies are accepted and their results HTML reaches the email byte-for-byte', async () => {
  assert.equal(REAL.length, 7);
  let i = 0;
  for (const s of REAL) {
    const body = { ...s.body, email: `user${i++}@example.com`, sourceUrl: 'https://chemcalc.co/' + s.page };
    assert.equal(sanitizeResultsHtml(body.resultsHtml), body.resultsHtml, s.label);
    const r = await call(body, { ip: `198.51.100.${i}` });
    assert.equal(r.status, 200, s.label);
    assert.ok(resendCalls(w).at(-1).body.html.includes(body.resultsHtml), s.label);
  }
  const biggest = Math.max(...REAL.map((s) => s.body.resultsHtml.length));
  assert.ok(MAX_RESULTS_HTML >= biggest * 3 && MAX_RESULTS_HTML <= biggest * 4, 'the cap is about 3x the largest real payload (' + biggest + ')');
});
test('real calculator ids are all allowed', () => {
  assert.deepEqual([...CALCULATOR_IDS].sort(), ['alexseal', 'awlgrip', 'clothcalc', 'epifanes', 'mekp']);
  for (const s of REAL) assert.ok(CALCULATOR_IDS.includes(s.body.calculatorId), s.label);
});

/* ---------- R1 validation ---------- */
test('validation: bad email shapes are rejected with the generic 400 and nothing is called', async () => {
  const bad = ['', 'plain', 'a@b', 'a@b.com,c@d.com', 'a@b.com;c@d.com', 'a b@example.com', ' a@example.com', 'a@example.com\n', 'a@example.com\r\nBcc: x@y.com', '<a@example.com>', '"a b"@example.com', 'a@exa mple.com',
    'Name <a@example.com>', 'a@@example.com', '@example.com', 'a@.com', 'a@example..com', 'a'.repeat(65) + '@example.com', 'a@' + 'b'.repeat(250) + '.com', null, 5, true, ['a@example.com'], { a: 1 }];
  for (const email of bad) await expectInvalid(goodBody({ email }));
  await expectInvalid(goodBody({ email: undefined }));
});
test('validation: a 254-character address passes the length check boundary, 255 does not', () => {
  const ok = 'a@' + ('b'.repeat(60) + '.').repeat(3) + 'com';
  assert.ok(ok.length < 254);
  assert.equal(validate(goodBody({ email: ok })).email, ok);
  assert.throws(() => validate(goodBody({ email: 'a@' + 'b'.repeat(253) + '.com' })));
});
test('validation: calculatorName must be a 1-80 character string without < > CR LF', async () => {
  for (const calculatorName of ['', 'x'.repeat(81), 'A<b>', 'A>B', 'A\nB', 'A\rB', 5, null, ['MEKP'], undefined]) await expectInvalid(goodBody({ calculatorName }));
  assert.equal(validate(goodBody({ calculatorName: 'x'.repeat(80) })).calculatorName.length, 80);
});
test('validation: calculatorId must be null/absent or one of the five real ids', async () => {
  for (const calculatorId of ['other', '', 'MEKP', 5, ['mekp'], {}, true]) await expectInvalid(goodBody({ calculatorId }));
  assert.equal(validate(goodBody({ calculatorId: null })).calculatorId, null);
  const b = goodBody(); delete b.calculatorId;
  assert.equal(validate(b).calculatorId, null);
});
test('validation: resultsHtml must be a non-empty string up to the cap (about 3x the largest real one)', async () => {
  for (const resultsHtml of ['', 'x'.repeat(MAX_RESULTS_HTML + 1), 5, null, ['<p>x</p>'], undefined]) await expectInvalid(goodBody({ resultsHtml }));
  assert.equal(validate(goodBody({ resultsHtml: 'x'.repeat(MAX_RESULTS_HTML) })).resultsHtml.length, MAX_RESULTS_HTML);
});
test('validation: marketingOptIn is true only for the boolean true', () => {
  for (const v of ['true', 1, 'yes', {}, [], null, undefined, false]) assert.equal(validate(goodBody({ marketingOptIn: v })).marketingOptIn, false);
  assert.equal(validate(goodBody({ marketingOptIn: true })).marketingOptIn, true);
});
test('validation: a body that is not a JSON object, or is huge, is rejected', async () => {
  await expectInvalid(null, { raw: 'not json' });
  await expectInvalid(null, { raw: '[]' });
  await expectInvalid(null, { raw: 'null' });
  await expectInvalid(null, { raw: '"str"' });
  await expectInvalid(null, { raw: '' });
  await expectInvalid(null, { raw: JSON.stringify({ ...goodBody(), pad: 'x'.repeat(10000) }) });
});
test('validation: extra fields are ignored and never reach the email', async () => {
  await call({ ...goodBody(), bcc: ['x@y.com'], from: 'ceo@thinkandengage.com', subject: 'Hacked', to: ['v@x.com'] });
  const s = resendCalls(w)[0].body;
  assert.deepEqual(s.to, [EMAIL]);
  assert.equal(s.subject, 'Your MEKP Catalyst Results from ChemCalc');
  assert.equal(s.from, 'ChemCalc Results <chemcalc-results@thinkandengage.com>');
  assert.equal(s.bcc, undefined);
});
test('methods: GET gets 405 and calls nothing', async () => {
  const r = await call(null, { method: 'GET' });
  assert.equal(r.status, 405);
  assert.equal(w.calls.length, 0);
});

/* ---------- R2 sanitizer ---------- */
const clean = (h) => sanitizeResultsHtml(h);
test('sanitizer: dangerous elements go, with their content', () => {
  for (const tag of ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'template']) {
    const out = clean(`<p>a</p><${tag}>EVIL()</${tag}><p>b</p>`);
    assert.ok(!out.includes('EVIL'), tag);
    assert.ok(!new RegExp('<' + tag, 'i').test(out), tag);
    assert.ok(out.includes('<p>a</p>') && out.includes('<p>b</p>'), tag);
  }
  assert.ok(!clean('<script src="https://evil.example/x.js"></script>').includes('evil'));
  assert.ok(!clean('<p>x</p><script>unterminated(').includes('unterminated'));
});
test('sanitizer: tags with no place in the email are removed (their text stays)', () => {
  for (const html of ['<img src=x onerror=alert(1)>', '<img src="https://evil.example/p.png">', '<form action="https://evil.example"><input name=a><button>Go</button></form>', '<link rel=stylesheet href=//evil.example/x.css>', '<meta http-equiv=refresh content="0;url=https://evil.example">', '<base href="https://evil.example/">', '<input value=x>', '<button onclick=a()>b</button>', '<div>d</div>', '<h1>h</h1>', '<table><tr><td>t</td></tr></table>']) {
    const out = clean(html);
    assert.ok(!/<(img|form|input|button|link|meta|base|div|h1|table|tr|td)\b/i.test(out), html + ' -> ' + out);
    assert.ok(!/evil|onerror|onclick/i.test(out.replace(/Go|b|d|h|t/g, '')), html + ' -> ' + out);
  }
});
test('sanitizer: every on* attribute is dropped, in any case or quoting', () => {
  for (const html of ['<p onclick="a()">x</p>', '<p ONMOUSEOVER=a()>x</p>', "<p onfocus='a()' style=\"color:red\">x</p>", '<strong onclick=a()>x</strong>', '<p/onclick=a()>x</p>', '<p\nonload="a()">x</p>']) {
    const out = clean(html);
    assert.ok(!/on[a-z]+\s*=/i.test(out), html + ' -> ' + out);
    assert.ok(out.includes('x'));
  }
});
test('sanitizer: links are kept only for https chemcalc hosts; every other link becomes plain text', () => {
  assert.equal(clean('<a href="https://chemcalc.co/kits.html">Kits</a>'), '<a href="https://chemcalc.co/kits.html">Kits</a>');
  assert.equal(clean('<a href="https://www.chemcalc.co/">x</a>'), '<a href="https://www.chemcalc.co/">x</a>');
  assert.equal(clean('<a href="https://testing.chemcalc.co/a?b=1">x</a>'), '<a href="https://testing.chemcalc.co/a?b=1">x</a>');
  for (const href of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'java\tscript:alert(1)', 'jav&#x61;script:alert(1)', '&#106;avascript:alert(1)', 'java&Tab;script:alert(1)', 'data:text/html,<script>a()</script>', 'vbscript:msgbox(1)',
    'http://chemcalc.co/', 'https://evil.example/', 'https://chemcalc.co.evil.example/', 'https://evil.example/chemcalc.co', 'https://user:pw@chemcalc.co/', 'https://chemcalc.co@evil.example/', '//evil.example/', '/relative', 'mailto:a@b.com', 'https://evilchemcalc.co/', '']) {
    const out = clean(`<a href="${href}">click</a>`);
    assert.ok(!/<a\b/i.test(out), href + ' -> ' + out);
    assert.ok(!/javascript|vbscript|data:|evil/i.test(out), href + ' -> ' + out);
    assert.ok(out.includes('click'), href);
  }
  assert.ok(!/<a\b/i.test(clean('<a>no href</a>')));
});
test('sanitizer: style keeps only the safe properties and scrubs dangerous values', () => {
  assert.equal(clean('<p style="margin-bottom: 6px; font-size: 14px; color: #555555;">x</p>'), '<p style="margin-bottom: 6px; font-size: 14px; color: #555555;">x</p>');
  const evil = ['background: url(https://evil.example/x.png)', 'color: red; background-image: url(javascript:a())', 'width: expression(alert(1))', 'color: expression(alert(1))', '@import url(//evil.example/x.css)', 'behavior: url(x.htc)', 'position: fixed; top: 0; left: 0; width: 100%', 'color: url(x)', 'font-size: calc(1px + 2px)', 'color: var(--x)', 'margin-bottom: 1px; } body { display:none', 'color: red\\;position:fixed'];
  for (const s of evil) {
    const out = clean(`<p style="${s}">x</p>`);
    assert.ok(!/url\s*\(|expression|@import|behavior|position|javascript|background|display|width|calc|var\(/i.test(out), s + ' -> ' + out);
  }
  assert.equal(clean('<p style="position:absolute">x</p>'), '<p>x</p>');
});
test('sanitizer: no way to smuggle a tag: nested, malformed, commented, encoded', () => {
  for (const html of ['<scr<script>ipt>alert(1)</scr</script>ipt>', '<<script>script>alert(1)<</script>/script>', '<p <script>alert(1)</script>>x</p>', '<!-- <script>alert(1)</script> -->', '<!--><script>alert(1)</script>-->', '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>', '<SCRIPT >alert(1)</SCRIPT >', '<script\n>alert(1)</script\n>', '<svg/onload=alert(1)>', '<p title="><script>alert(1)</script>">x</p>', '<a href="https://chemcalc.co/" onclick="a()" style="x">l</a>', '<p style="color:red" /><iframe src=javascript:a()>']) {
    const out = clean(html);
    assert.ok(!/<\s*(script|svg|iframe|img|object|embed)/i.test(out), html + ' -> ' + out);
    assert.ok(!/<[^>]*\bon[a-z]+\s*=/i.test(out), html + ' -> ' + out);
  }
});
test('sanitizer: output is always balanced and never carries a raw unterminated tag', () => {
  assert.equal(clean('<p>a<strong>b'), '<p>a<strong>b</strong></p>');
  assert.equal(clean('a</p>b</strong>'), 'ab');
  assert.equal(clean('1 < 2 and 3 > 2'), '1 &lt; 2 and 3 > 2');
  assert.equal(clean('<p'), '&lt;p');
  assert.equal(clean('<br>x<br/>y'), '<br>x<br>y');
  assert.equal(clean('<p><strong>a</p>b'), '<p><strong>a</strong></p>b');
});
test('sanitizer: end to end, an attacker body is sanitized before it is emailed', async () => {
  const evil = '<p onclick="a()">Hi</p><script>steal()</script><img src=x onerror=a()><a href="https://evil.example/pay">Click to claim</a><iframe src="https://evil.example"></iframe>';
  const r = await call(goodBody({ resultsHtml: evil }));
  assert.equal(r.status, 200);
  const h = resendCalls(w)[0].body.html;
  assert.ok(h.includes('<p>Hi</p>') && h.includes('Click to claim'));
  for (const bad of ['steal', 'onclick', 'onerror', 'evil.example', '<iframe', '<img', '<script']) assert.ok(!h.includes(bad), bad);
});
test('calculatorName is HTML-escaped in the heading and kept plain in the subject', async () => {
  await call(goodBody({ calculatorName: `A&B "x" 'y'` }));
  const s = resendCalls(w)[0].body;
  assert.ok(s.html.includes('Your A&amp;B &quot;x&quot; &#39;y&#39; Results</h2>'));
  assert.equal(s.subject, `Your A&B "x" 'y' Results from ChemCalc`);
});

/* ---------- R3 sourceUrl ---------- */
test('sourceUrl: only ChemCalc https addresses are used; anything else falls back to https://chemcalc.co', async () => {
  for (const u of ['https://chemcalc.co/awlgrip.html', 'https://www.chemcalc.co/awlgrip.html?x=1#r', 'https://testing.chemcalc.co/awlgrip.html']) assert.equal(safeSourceUrl(u), u, u);
  for (const u of ['https://chemcalc.co', 'https://testing.chemcalc.co']) assert.equal(safeSourceUrl(u), u + '/', u);   // a bare origin is normalised with a slash
  for (const u of ['https://evil.example/', 'http://chemcalc.co/a', 'javascript:alert(1)', 'https://chemcalc.co.evil.example/', 'https://chemcalc.co@evil.example/', 'https://user:pw@chemcalc.co/', 'https://chemcalc.coevil.example/', 'data:text/html,x', '', 'x'.repeat(3000), 'https://evil.example/https://chemcalc.co/', 'https://chemcalc.co/a"onmouseover="x'])
    assert.ok(['https://chemcalc.co', 'https://chemcalc.co/a%22onmouseover=%22x'].includes(safeSourceUrl(u)), u + ' -> ' + safeSourceUrl(u));
  assert.equal(safeSourceUrl('https://evil.example/'), 'https://chemcalc.co');
  await call(goodBody({ sourceUrl: 'https://evil.example/phish' }));
  assert.ok(resendCalls(w)[0].body.html.includes('href="https://chemcalc.co"'));
  assert.ok(!resendCalls(w)[0].body.html.includes('evil.example'));
});
test('sourceUrl: a quote in the address cannot break out of the href attribute', async () => {
  await call(goodBody({ sourceUrl: 'https://chemcalc.co/a"><script>x()</script>' }));
  const h = resendCalls(w)[0].body.html;
  assert.ok(!h.includes('<script'));
  assert.ok(!h.includes('"><'));
});

/* ---------- R4 limits ---------- */
test('limits: the 4th email to one recipient inside 24 h gets 429 and nothing is sent for it', async () => {
  for (let i = 0; i < LIMITS.recipient; i++) assert.equal((await call(goodBody(), { ip: `192.0.2.${i}` })).status, 200);
  const r = await call(goodBody(), { ip: '192.0.2.99' });
  assert.equal(r.status, 429);
  assert.deepEqual(await r.json(), { error: 'Too many requests' });
  assert.equal(resendCalls(w).length, 3);
  assert.equal(logWrites(w).length, 3, 'a refused request is not logged as a send');
});
test('limits: the recipient limit ignores letter case', async () => {
  for (const e of ['a@example.com', 'A@Example.com', 'a@EXAMPLE.COM']) assert.equal((await call(goodBody({ email: e }), { ip: '192.0.2.1' })).status, 200);
  assert.equal((await call(goodBody({ email: 'a@example.com' }), { ip: '192.0.2.2' })).status, 429);
});
test('limits: sends older than 24 h do not count, newer ones do', async () => {
  const rh = await sha256Hex('tester@example.com');
  w.seed(rh, 'x', 25 * HOUR, 5);
  w.seed(rh, 'x', 23 * HOUR, 2);
  assert.equal((await call(goodBody())).status, 200);          // 2 recent + this one = 3
  assert.equal((await call(goodBody())).status, 429);          // now 3 recent
});
test('limits: 10 per IP, different recipients', async () => {
  for (let i = 0; i < LIMITS.ip; i++) assert.equal((await call(goodBody({ email: `u${i}@example.com` }))).status, 200);
  const r = await call(goodBody({ email: 'another@example.com' }));
  assert.equal(r.status, 429);
  assert.equal((await call(goodBody({ email: 'another@example.com' }), { ip: '198.51.100.1' })).status, 200, 'a different IP is unaffected');
});
test('limits: 50 per day overall', async () => {
  w.seed('other', 'otherip', HOUR, LIMITS.global - 1);
  assert.equal((await call(goodBody())).status, 200);
  assert.equal((await call(goodBody({ email: 'next@example.com' }), { ip: '198.51.100.2' })).status, 429);
  assert.equal(resendCalls(w).length, 1);
});
test('limits: the IP is the first x-forwarded-for value; "unknown" when there is none', async () => {
  await call(goodBody(), { ip: '203.0.113.50, 10.0.0.1, 10.0.0.2' });
  await call(goodBody({ email: 'b@example.com' }), { ip: null });
  assert.equal(w.rows[0].ip_hash, await sha256Hex('203.0.113.50'));
  assert.equal(w.rows[1].ip_hash, await sha256Hex('unknown'));
});
test('limits: the log holds only hashes, never the address or the IP', async () => {
  await call(goodBody());
  assert.equal(w.rows.length, 1);
  assert.equal(w.rows[0].recipient_hash, await sha256Hex('tester@example.com'));
  assert.match(w.rows[0].recipient_hash, /^[0-9a-f]{64}$/);
  assert.match(w.rows[0].ip_hash, /^[0-9a-f]{64}$/);
  assert.equal(w.rows[0].kind, 'results');
  const wire = JSON.stringify(logWrites(w).map((c) => c.body));
  assert.ok(!/tester|example\.com|203\.0\.113/i.test(wire));
});
test('limits: order is count, then insert, then send (checked BEFORE Resend)', async () => {
  await call(goodBody());
  const idx = (pred) => w.calls.findIndex(pred);
  const firstCount = idx((c) => c.method === 'GET' && c.url.includes('email_send_log'));
  const insert = idx((c) => c.method === 'POST' && c.url.includes('email_send_log'));
  const send = idx((c) => c.url === 'https://api.resend.com/emails');
  assert.ok(firstCount >= 0 && firstCount < insert && insert < send, [firstCount, insert, send].join(','));
  assert.equal(w.calls.filter((c) => c.method === 'GET' && c.url.includes('email_send_log')).length, 3, 'recipient, ip and global counts');
});
test('limits: a rejected request makes no Resend or Brevo call at all', async () => {
  w.seed(await sha256Hex('tester@example.com'), 'x', HOUR, 3);
  const r = await call(goodBody({ marketingOptIn: true }));
  assert.equal(r.status, 429);
  assert.equal(resendCalls(w).length, 0);
  assert.equal(brevoCalls(w).length, 0);
});
test('limits: the database is called with the service key', async () => {
  await call(goodBody());
  const db = w.calls.filter((c) => c.url.includes('/rest/v1/'));
  assert.ok(db.length >= 4);
  for (const c of db) { assert.equal(c.headers.apikey, SERVICE_KEY); assert.equal(c.headers.authorization, `Bearer ${SERVICE_KEY}`); }
});
test('fail closed: any database failure is a 503 and nothing is sent', async () => {
  const cases = [['countStatus', 500], ['countStatus', 401], ['countThrows', true], ['noContentRange', true], ['insertStatus', 500], ['insertThrows', true]];
  for (const [k, v] of cases) {
    w = createWorld(); w.fail[k] = v;
    const r = await call(goodBody({ marketingOptIn: true }));
    assert.equal(r.status, 503, k);
    assert.deepEqual(await r.json(), { error: 'Service unavailable' }, k);
    assert.equal(resendCalls(w).length, 0, k);
    assert.equal(brevoCalls(w).length, 0, k);
  }
});
test('fail closed: missing configuration is a 503 and nothing is called', async () => {
  for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY']) {
    w = createWorld();
    const r = await call(goodBody(), { env: { ...ENV, [k]: '' } });
    assert.equal(r.status, 503, k);
    assert.equal(w.calls.length, 0, k);
  }
});
test('cleanup: rows older than 30 days are deleted (once per request), newer ones are kept', async () => {
  w.seed('old', 'old', 31 * 24 * HOUR, 3);
  w.seed('mid', 'mid', 29 * 24 * HOUR, 2);
  await call(goodBody());
  const deletes = w.calls.filter((c) => c.method === 'DELETE');
  assert.equal(deletes.length, 1);
  assert.equal(w.rows.filter((r) => r.recipient_hash === 'old').length, 0);
  assert.equal(w.rows.filter((r) => r.recipient_hash === 'mid').length, 2);
});
test('cleanup: a failed cleanup never changes the response', async () => {
  w.fail.pruneThrows = true;
  const r = await call(goodBody());
  assert.equal(r.status, 200);
});

/* ---------- R5 CORS ---------- */
test('CORS: the three ChemCalc origins are echoed, never a wildcard', async () => {
  assert.deepEqual(ALLOWED_ORIGINS, ['https://chemcalc.co', 'https://www.chemcalc.co', 'https://testing.chemcalc.co']);
  for (const origin of ALLOWED_ORIGINS) {
    const r = await call(goodBody({ email: `${ALLOWED_ORIGINS.indexOf(origin)}@example.com` }), { origin });
    assert.equal(r.headers.get('access-control-allow-origin'), origin);
    assert.equal(r.headers.get('vary'), 'Origin');
  }
});
test('CORS: foreign, look-alike and missing origins get no Allow-Origin header (but still a Vary)', async () => {
  for (const origin of ['https://evil.example', 'http://chemcalc.co', 'https://chemcalc.co.evil.example', 'https://evilchemcalc.co', 'null', 'https://chemcalc.co/', null]) {
    const r = await call(goodBody({ email: Math.random() + '@example.com' }), { origin, ip: '198.51.100.' + Math.floor(Math.random() * 200) });
    assert.equal(r.headers.get('access-control-allow-origin'), null, String(origin));
    assert.notEqual(r.headers.get('access-control-allow-origin'), '*');
    assert.equal(r.headers.get('vary'), 'Origin');
  }
});
test('CORS: preflight answers 204 with the allowed headers and calls nothing', async () => {
  const r = await call(null, { method: 'OPTIONS', origin: 'https://testing.chemcalc.co' });
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('access-control-allow-origin'), 'https://testing.chemcalc.co');
  const allowed = r.headers.get('access-control-allow-headers');
  for (const h of ['authorization', 'x-client-info', 'apikey', 'content-type']) assert.ok(allowed.includes(h), h);
  assert.ok(r.headers.get('access-control-allow-methods').includes('POST'));
  assert.equal(w.calls.length, 0);
  const bad = await call(null, { method: 'OPTIONS', origin: 'https://evil.example' });
  assert.equal(bad.headers.get('access-control-allow-origin'), null);
});
test('CORS: error responses carry the CORS headers too, so the page can read them', async () => {
  const r = await call(goodBody({ email: 'nope' }));
  assert.equal(r.status, 400);
  assert.equal(r.headers.get('access-control-allow-origin'), 'https://chemcalc.co');
});

/* ---------- R6 errors and logs ---------- */
test('errors: Resend failing is a generic 502 that does not reveal the upstream message or key', async () => {
  for (const k of ['resendStatus', 'resendThrows']) {
    w = createWorld(); w.fail[k] = k === 'resendStatus' ? 422 : true;
    const r = await call(goodBody({ marketingOptIn: true }));
    assert.equal(r.status, 502, k);
    const text = await r.text();
    assert.deepEqual(JSON.parse(text), { error: 'Email service unavailable' }, k);
    assert.ok(!text.includes(RESEND_KEY) && !/resend says/i.test(text), k);
    assert.equal(brevoCalls(w).length, 0, 'no marketing sign-up when the email failed');
  }
});
test('errors: the only status codes are 200, 400, 405, 429, 502, 503; bodies are one of the generic messages', async () => {
  const generic = new Set(['Invalid request', 'Too many requests', 'Service unavailable', 'Email service unavailable', 'Method not allowed']);
  const outcomes = [];
  outcomes.push(await call(goodBody({ email: 'bad' })));
  outcomes.push(await call(goodBody(), { method: 'GET' }));
  w.fail.countStatus = 500; outcomes.push(await call(goodBody())); w.fail.countStatus = 0;
  w.fail.resendStatus = 500; outcomes.push(await call(goodBody({ email: 'z@example.com' }))); w.fail.resendStatus = 0;
  for (const r of outcomes) { assert.ok([400, 405, 502, 503].includes(r.status)); assert.ok(generic.has((await r.json()).error)); }
});
test('logs: nothing logged contains the address, the IP, the results HTML or any key; the hash prefix is logged on a limit', async () => {
  w.seed(await sha256Hex('tester@example.com'), 'x', HOUR, 3);
  await call(goodBody({ resultsHtml: '<p>SECRETRESULTS</p>' }));
  w.fail.resendStatus = 500;
  await call(goodBody({ email: 'q@example.com', resultsHtml: '<p>SECRETRESULTS</p>' }), { ip: '198.51.100.5' });
  w.fail.resendStatus = 0; w.fail.countThrows = true;
  await call(goodBody({ email: 'r@example.com', resultsHtml: '<p>SECRETRESULTS</p>' }), { ip: '198.51.100.6' });
  const all = logs.join('\n');
  assert.ok(logs.length >= 3);
  for (const s of ['tester@example.com', 'Tester@Example.com', 'q@example.com', 'r@example.com', '203.0.113.7', '198.51.100', 'SECRETRESULTS', RESEND_KEY, BREVO_KEY, SERVICE_KEY, 'resend says'])
    assert.ok(!all.includes(s), 'log leaked ' + s);
  assert.ok(all.includes((await sha256Hex('tester@example.com')).slice(0, 8)));
  assert.ok(!all.includes(await sha256Hex('tester@example.com')), 'only the first 8 characters');
});

/* ---------- R7 Brevo ---------- */
test('Brevo: marketingOptIn true with a template set starts a double opt-in and never POSTs /v3/contacts', async () => {
  const r = await call(goodBody({ marketingOptIn: true }));
  assert.equal(r.status, 200);
  assert.equal(brevoCalls(w).length, 1);
  const [b] = brevoCalls(w);
  assert.equal(b.url, 'https://api.brevo.com/v3/contacts/doubleOptinConfirmation');
  assert.equal(b.method, 'POST');
  assert.equal(b.headers['api-key'], BREVO_KEY);
  assert.equal(b.headers['content-type'], 'application/json');
  assert.equal(b.headers.accept, 'application/json');
  assert.deepEqual(b.body, { email: EMAIL, attributes: { LAST_CALCULATOR_USED: 'MEKP Catalyst' }, includeListIds: [2], templateId: 7, redirectionUrl: 'https://chemcalc.co/thanks' });
  assert.equal(BREVO_LIST_ID, 2);
  assert.ok(!w.calls.some((c) => /\/v3\/contacts$/.test(c.url)), 'the direct-add endpoint is never used');
});
test('Brevo: the redirect falls back to https://chemcalc.co/ when BREVO_DOI_REDIRECT_URL is not set', async () => {
  await call(goodBody({ marketingOptIn: true }), { env: { ...ENV, BREVO_DOI_REDIRECT_URL: undefined } });
  assert.equal(brevoCalls(w)[0].body.redirectionUrl, 'https://chemcalc.co/');
});
test('Brevo: skipped (email still sent) when the template id is unset or not a number, or the Brevo key is missing', async () => {
  for (const env of [{ ...ENV, BREVO_DOI_TEMPLATE_ID: undefined }, { ...ENV, BREVO_DOI_TEMPLATE_ID: '' }, { ...ENV, BREVO_DOI_TEMPLATE_ID: 'abc' }, { ...ENV, BREVO_DOI_TEMPLATE_ID: '0' }, { ...ENV, BREVO_DOI_TEMPLATE_ID: '1.5' }, { ...ENV, BREVO_API_KEY: undefined }]) {
    w = createWorld();
    const r = await call(goodBody({ marketingOptIn: true }), { env });
    assert.equal(r.status, 200);
    assert.equal(resendCalls(w).length, 1);
    assert.equal(brevoCalls(w).length, 0);
  }
});
test('Brevo: no call at all when marketingOptIn is not exactly true', async () => {
  for (const marketingOptIn of [false, 'true', 1, null, undefined]) {
    w = createWorld();
    await call(goodBody({ marketingOptIn }));
    assert.equal(brevoCalls(w).length, 0, String(marketingOptIn));
  }
});
test('Brevo: a failure (error status or network) only warns; the response is still 200', async () => {
  for (const f of [{ brevoStatus: 400 }, { brevoStatus: 500 }, { brevoThrows: true }]) {
    w = createWorld(); Object.assign(w.fail, f); logs.length = 0;
    const r = await call(goodBody({ marketingOptIn: true }));
    assert.equal(r.status, 200, JSON.stringify(f));
    assert.deepEqual(await r.json(), { success: true, message: 'Email sent successfully' });
    assert.ok(!logs.join('\n').includes(EMAIL));
  }
});
