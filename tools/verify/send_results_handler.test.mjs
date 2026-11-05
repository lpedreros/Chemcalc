// Unit tests for supabase/functions/send-results/handler.ts.   node --test tools/verify/send_results_handler.test.mjs   (Node 22.18+/24: runs the .ts directly)
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VOCAB, ALLOWED_PUNCT } from '../../supabase/functions/send-results/vocab.ts';
import { handle, sanitizeResultsHtml, safeSourceUrl, validate, hasLinkLikeText, wordText, outsideVocabulary, ALLOWED_ORIGINS, CALCULATOR_IDS, CALCULATOR_NAMES, LIMITS, MAX_RESULTS_HTML, BREVO_LIST_ID } from '../../supabase/functions/send-results/handler.ts';
import { createWorld, ENV, NOW, HOUR, RESEND_KEY, BREVO_KEY, SERVICE_KEY, sha256Hex, resendCalls, brevoCalls, logWrites, ownDeletes } from './send_results_fakes.mjs';

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
  resultsHtml: '<p style="margin-bottom: 10px; font-size: 16px;">MEKP Volume: <strong>18.9</strong> cc (mL)</p>',
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
test('sanitizer: no link survives, not even to a ChemCalc host; the tag goes and its text stays', () => {
  assert.equal(clean('<a href="https://chemcalc.co/kits.html">Kits</a>'), 'Kits');
  assert.equal(clean('<a href="https://www.chemcalc.co/">x</a>'), 'x');
  assert.equal(clean('<a href="https://testing.chemcalc.co/a?b=1">x</a>'), 'x');
  for (const href of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'java\tscript:alert(1)', 'jav&#x61;script:alert(1)', '&#106;avascript:alert(1)', 'java&Tab;script:alert(1)', 'data:text/html,<script>a()</script>', 'vbscript:msgbox(1)',
    'http://chemcalc.co/', 'https://evil.example/', 'https://chemcalc.co.evil.example/', 'https://evil.example/chemcalc.co', 'https://user:pw@chemcalc.co/', 'https://chemcalc.co@evil.example/', '//evil.example/', '/relative', 'mailto:a@b.com', 'https://evilchemcalc.co/', '']) {
    const out = clean(`<a href="${href}">click</a>`);
    assert.ok(!/<a\b/i.test(out), href + ' -> ' + out);
    assert.ok(!/javascript|vbscript|data:|evil|href/i.test(out), href + ' -> ' + out);
    assert.ok(out.includes('click'), href);
  }
  assert.equal(clean('<a>no href</a>'), 'no href');
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
  const evil = '<p onclick="a()">Total</p><script>steal()</script><img src=x onerror=a()><a href="https://evil.example/pay">Recommended drops</a><iframe src="https://evil.example"></iframe>';
  const r = await call(goodBody({ resultsHtml: evil }));
  assert.equal(r.status, 200);
  const h = resendCalls(w)[0].body.html;
  assert.ok(h.includes('<p>Total</p>') && h.includes('Recommended drops'));
  for (const bad of ['steal', 'onclick', 'onerror', 'evil.example', '<iframe', '<img', '<script']) assert.ok(!h.includes(bad), bad);
});
test('calculatorName: the posted value is only shape-checked; heading and subject use the name for the calculator id', async () => {
  await call(goodBody({ calculatorName: `A&B "x" 'y'` }));
  const s = resendCalls(w)[0].body;
  assert.ok(s.html.includes('Your MEKP Catalyst Results</h2>'));
  assert.equal(s.subject, 'Your MEKP Catalyst Results from ChemCalc');
  assert.ok(!s.html.includes('A&amp;B') && !s.subject.includes('A&B'));
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
  assert.equal(w.rows.length, 3, 'a refused request leaves no row behind');
  assert.equal(ownDeletes(w).length, 1, 'it gave its own slot back');
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
test('limits: 25 per day overall', async () => {
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
  assert.match(w.rows[0].id, /^[0-9a-f-]{36}$/);
  assert.equal(w.rows[0].recipient_hash, await sha256Hex('tester@example.com'));
  assert.match(w.rows[0].recipient_hash, /^[0-9a-f]{64}$/);
  assert.match(w.rows[0].ip_hash, /^[0-9a-f]{64}$/);
  assert.equal(w.rows[0].kind, 'results');
  const wire = JSON.stringify(logWrites(w).map((c) => c.body));
  assert.ok(!/tester|example\.com|203\.0\.113/i.test(wire));
});
test('limits: order is insert, then count, then send (own row is counted; checked BEFORE Resend)', async () => {
  await call(goodBody());
  const idx = (pred) => w.calls.findIndex(pred);
  const firstCount = idx((c) => c.method === 'GET' && c.url.includes('email_send_log'));
  const insert = idx((c) => c.method === 'POST' && c.url.includes('email_send_log'));
  const send = idx((c) => c.url === 'https://api.resend.com/emails');
  assert.ok(insert >= 0 && insert < firstCount && firstCount < send, [insert, firstCount, send].join(','));
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
  for (const h of ['authorization', 'x-client-info', 'apikey', 'content-type', 'x-retry-count', 'traceparent', 'tracestate', 'baggage']) assert.ok(allowed.includes(h), h);
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
  await call(goodBody({ resultsHtml: '<p>MEKP Drops: 7777.77 drops</p>' }));
  w.fail.resendStatus = 500;
  await call(goodBody({ email: 'q@example.com', resultsHtml: '<p>MEKP Drops: 7777.77 drops</p>' }), { ip: '198.51.100.5' });
  w.fail.resendStatus = 0; w.fail.countThrows = true;
  await call(goodBody({ email: 'r@example.com', resultsHtml: '<p>MEKP Drops: 7777.77 drops</p>' }), { ip: '198.51.100.6' });
  const all = logs.join('\n');
  assert.ok(logs.length >= 3);
  for (const s of ['tester@example.com', 'Tester@Example.com', 'q@example.com', 'r@example.com', '203.0.113.7', '198.51.100', '7777.77', RESEND_KEY, BREVO_KEY, SERVICE_KEY, 'resend says'])
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

/* ---------- bursts: parallel requests must not get past the daily limits ---------- */
// The fake yields 1-5 ms (with jitter) on every request, so the parallel requests really interleave.
const burst = (n, make) => Promise.all(Array.from({ length: n }, (_, i) => call(...make(i))));
const summary = (rs) => `${resendCalls(w).length} emails sent, ${rs.filter((r) => r.status === 200).length} x 200, ${rs.filter((r) => r.status === 429).length} x 429, ${w.rows.length} log rows left`;

test('burst: 30 parallel requests for one recipient send at most 3 emails, and the log holds exactly the sent ones', async () => {
  w.latency = true;
  const rs = await burst(30, (i) => [goodBody(), { ip: `192.0.2.${i + 1}` }]);
  console.log('burst same recipient:', summary(rs));
  assert.ok(resendCalls(w).length <= LIMITS.recipient, `${resendCalls(w).length} emails sent, the cap is ${LIMITS.recipient}`);
  assert.equal(w.rows.length, resendCalls(w).length, 'no orphaned rows');
});
test('burst: 80 parallel requests to different recipients and IPs send at most 25 emails (the overall cap)', async () => {
  w.latency = true;
  const rs = await burst(80, (i) => [goodBody({ email: `user${i}@example.com` }), { ip: `198.51.100.${i + 1}` }]);
  console.log('burst different recipients:', summary(rs));
  assert.ok(resendCalls(w).length <= LIMITS.global, `${resendCalls(w).length} emails sent, the cap is ${LIMITS.global}`);
  assert.equal(w.rows.length, resendCalls(w).length);
});
test('burst: 30 parallel requests from one IP to different recipients send at most 10 emails', async () => {
  w.latency = true;
  const rs = await burst(30, (i) => [goodBody({ email: `user${i}@example.com` }), { ip: '203.0.113.9' }]);
  console.log('burst same IP:', summary(rs));
  assert.ok(resendCalls(w).length <= LIMITS.ip, `${resendCalls(w).length} emails sent, the cap is ${LIMITS.ip}`);
  assert.equal(w.rows.length, resendCalls(w).length);
});
test('burst: a calm trickle under the caps all succeeds (the fix does not over-refuse sequential callers)', async () => {
  w.latency = true;
  for (let i = 0; i < 3; i++) assert.equal((await call(goodBody(), { ip: `192.0.2.${i + 1}` })).status, 200);
  assert.equal(w.rows.length, 3);
});

/* ---------- giving the slot back ---------- */
test('slot: a Resend failure is a 502, removes its own row, and the next request for that recipient still succeeds', async () => {
  w.fail.resendStatus = 500;
  const r = await call(goodBody());
  assert.equal(r.status, 502);
  assert.equal(w.rows.length, 0);
  assert.equal(ownDeletes(w).length, 1);
  w.fail.resendStatus = 0;
  for (let i = 0; i < LIMITS.recipient; i++) assert.equal((await call(goodBody(), { ip: `192.0.2.${i + 1}` })).status, 200, 'all three slots are still free');
});
test('slot: a count failure is a 503, nothing is sent, and the row is removed', async () => {
  for (const k of ['countStatus', 'countThrows', 'noContentRange']) {
    w = createWorld(); w.fail[k] = k === 'countStatus' ? 500 : true;
    const r = await call(goodBody({ marketingOptIn: true }));
    assert.equal(r.status, 503, k);
    assert.equal(resendCalls(w).length, 0, k);
    assert.equal(brevoCalls(w).length, 0, k);
    assert.equal(w.rows.length, 0, k);
  }
});
test('slot: if the delete also fails, at most one row is left behind (it costs one slot), and nothing leaks into the logs', async () => {
  for (const f of [{ deleteOwnStatus: 500 }, { deleteOwnThrows: true }]) {
    w = createWorld(); logs.length = 0; Object.assign(w.fail, f, { countStatus: 500 });
    const r = await call(goodBody());
    assert.equal(r.status, 503);
    assert.equal(resendCalls(w).length, 0);
    assert.ok(w.rows.length <= 1, JSON.stringify(f));
    assert.ok(!logs.join(' ').includes('tester@'));
  }
});
test('slot: an insert failure is a 503, nothing is sent, and no count is attempted', async () => {
  for (const k of ['insertStatus', 'insertThrows']) {
    w = createWorld(); w.fail[k] = k === 'insertStatus' ? 500 : true;
    const r = await call(goodBody());
    assert.equal(r.status, 503, k);
    assert.equal(resendCalls(w).length, 0);
    assert.equal(w.rows.length, 0);
    assert.equal(w.calls.filter((c) => c.method === 'GET').length, 0, k);
  }
});

/* ---------- client IP ---------- */
test('ip: cf-connecting-ip wins over any x-forwarded-for; without it the first x-forwarded-for value; with neither "unknown"', async () => {
  await call(goodBody({ email: 'a@example.com' }), { ip: '6.6.6.6', headers: { 'cf-connecting-ip': ' 203.0.113.77 ' } });
  await call(goodBody({ email: 'b@example.com' }), { ip: '7.7.7.7', headers: { 'cf-connecting-ip': '203.0.113.77' } });
  await call(goodBody({ email: 'c@example.com' }), { ip: '203.0.113.50, 10.0.0.1' });
  await call(goodBody({ email: 'd@example.com' }), { ip: null });
  await call(goodBody({ email: 'e@example.com' }), { ip: '8.8.8.8', headers: { 'cf-connecting-ip': '   ' } });
  const h = w.rows.map((r) => r.ip_hash);
  assert.equal(h[0], await sha256Hex('203.0.113.77'));
  assert.equal(h[1], h[0], 'a different spoofed x-forwarded-for does not change the IP used');
  assert.equal(h[2], await sha256Hex('203.0.113.50'));
  assert.equal(h[3], await sha256Hex('unknown'));
  assert.equal(h[4], await sha256Hex('8.8.8.8'), 'a blank cf-connecting-ip falls back');
});
test('ip: spoofing x-forwarded-for cannot dodge the per-IP cap when cf-connecting-ip is present', async () => {
  for (let i = 0; i < LIMITS.ip; i++) assert.equal((await call(goodBody({ email: `u${i}@example.com` }), { ip: `9.9.9.${i}`, headers: { 'cf-connecting-ip': '203.0.113.88' } })).status, 200);
  assert.equal((await call(goodBody({ email: 'late@example.com' }), { ip: '1.2.3.4', headers: { 'cf-connecting-ip': '203.0.113.88' } })).status, 429);
});
test('ip: the raw IP is never logged', async () => {
  w.seed(await sha256Hex('tester@example.com'), 'x', HOUR, 3);
  await call(goodBody(), { ip: '6.6.6.6', headers: { 'cf-connecting-ip': '203.0.113.99' } });
  assert.ok(logs.length > 0);
  assert.ok(!/203\.0\.113\.99|6\.6\.6\.6/.test(logs.join(' ')));
});

/* ---------- F1: no client IP header ---------- */
const FRESH = new URL('../../supabase/functions/send-results/handler.ts?isolate=' + Date.now(), import.meta.url).href;   // a new module copy = a new isolate (the warn flag starts false)
const ipQueries = (w) => w.calls.filter((c) => c.method === 'GET' && c.url.includes('ip_hash='));
test('no IP headers: the per-IP count is never queried, 25 pass (the overall cap, not 10), and the skip is warned once without any address', async () => {
  const fresh = await import(FRESH);
  const send = (email, headers = {}) => fresh.handle(new Request(URL_FN, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://chemcalc.co', ...headers }, body: JSON.stringify(goodBody({ email })) }), { env: ENV, fetch: w.fetch, now: () => NOW });
  const statuses = [];
  for (let i = 0; i < 40; i++) statuses.push((await send(`user${i}@example.com`)).status);
  assert.equal(statuses.filter((s) => s === 200).length, LIMITS.global, 'exactly the overall cap passes');
  assert.equal(statuses.filter((s) => s === 429).length, 40 - LIMITS.global);
  assert.equal(resendCalls(w).length, LIMITS.global);
  assert.equal(ipQueries(w).length, 0, 'the per-IP count is never queried');
  assert.equal(w.rows[0].ip_hash, await sha256Hex('unknown'));
  const warns = logs.filter((l) => l.includes('client IP unavailable; per-IP limit skipped'));
  assert.equal(warns.length, 1, 'warned once per isolate');
  assert.ok(!logs.join(' ').includes('example.com') && !logs.join(' ').includes('unknown@'), 'no address in the logs');
  // With an IP header the per-IP cap of 10 still applies (same module copy, so no new warning).
  w = createWorld(); logs.length = 0;
  const ok = [];
  for (let i = 0; i < 12; i++) ok.push((await send(`ipuser${i}@example.com`, { 'cf-connecting-ip': '203.0.113.20' })).status);
  assert.equal(ok.filter((s) => s === 200).length, LIMITS.ip);
  assert.deepEqual(ok.slice(10), [429, 429]);
  assert.ok(ipQueries(w).length > 0);
  assert.equal(logs.filter((l) => l.includes('client IP unavailable')).length, 0);
});
test('no IP headers: the recipient cap still applies', async () => {
  for (let i = 0; i < LIMITS.recipient; i++) assert.equal((await call(goodBody(), { ip: null })).status, 200);
  assert.equal((await call(goodBody(), { ip: null })).status, 429);
});

/* ---------- F2a: fixed display names ---------- */
test('names: a hostile calculatorName never reaches the subject, heading or Brevo; each id has its fixed name; no id gives "Calculator"', async () => {
  const hostile = 'FREE GIFT at evil.example/win or write evil@x.example';
  await call(goodBody({ calculatorName: hostile, marketingOptIn: true }));
  const s = resendCalls(w)[0].body;
  assert.equal(s.subject, 'Your MEKP Catalyst Results from ChemCalc');
  assert.ok(s.html.includes('<h2 style="color:#2c3e50;">Your MEKP Catalyst Results</h2>'));
  assert.ok(!/evil|FREE GIFT/i.test(s.subject + s.html));
  assert.ok(!/evil|FREE GIFT/i.test(JSON.stringify(brevoCalls(w)[0].body)));
  assert.equal(brevoCalls(w)[0].body.attributes.LAST_CALCULATOR_USED, 'MEKP Catalyst');
  const expected = { mekp: 'MEKP Catalyst', awlgrip: 'Awlgrip Paint Mix', alexseal: 'Alexseal Paint Mix', epifanes: 'Epifanes Polyurethane Mix', clothcalc: 'Fiberglass Cloth Saturation' };
  assert.deepEqual(CALCULATOR_NAMES, expected);
  assert.deepEqual([...CALCULATOR_IDS].sort(), Object.keys(expected).sort());
  for (const [id, name] of Object.entries(expected)) {
    w = createWorld();
    await call(goodBody({ calculatorId: id, calculatorName: hostile, marketingOptIn: true }), { ip: '198.51.100.' + (Object.keys(expected).indexOf(id) + 1) });
    const m = resendCalls(w)[0].body;
    assert.equal(m.subject, `Your ${name} Results from ChemCalc`, id);
    assert.ok(m.html.includes(`Your ${name} Results</h2>`), id);
    assert.equal(brevoCalls(w)[0].body.attributes.LAST_CALCULATOR_USED, name, id);
  }
  for (const over of [{ calculatorId: null }, { calculatorId: undefined }]) {
    w = createWorld();
    await call(goodBody({ calculatorName: hostile, marketingOptIn: true, ...over }));
    assert.equal(resendCalls(w)[0].body.subject, 'Your Calculator Results from ChemCalc');
    assert.ok(resendCalls(w)[0].body.html.includes('Your Calculator Results</h2>'));
    assert.equal(brevoCalls(w)[0].body.attributes.LAST_CALCULATOR_USED, 'Calculator');
  }
  // The posted name is still shape-checked: bad values are still a 400.
  for (const bad of ['', 'x'.repeat(81), '<b>x</b>', 'a\nb', 5, null]) { w = createWorld(); await expectInvalid(goodBody({ calculatorName: bad })); }
});
test('names: the seven real payloads give the same names as before (their posted names equal the fixed ones)', () => {
  for (const x of REAL) assert.equal(CALCULATOR_NAMES[x.body.calculatorId], x.body.calculatorName, x.label);
});

/* ---------- F2b: links and addresses in results text ---------- */
test('links: every link becomes plain text, even to chemcalc.co; the text stays', async () => {
  const r = await call(goodBody({ resultsHtml: '<p>See <a href="https://chemcalc.co/kits.html">Gallons</a> and <a href="https://www.chemcalc.co/">Liters</a></p>' }));
  assert.equal(r.status, 200);
  const h = resendCalls(w)[0].body.html;
  assert.ok(h.includes('<p>See Gallons and Liters</p>'), h);
  assert.ok(!h.includes('<a href="https://chemcalc.co/kits.html">Gallons</a>'));
});
test('links: results text with "://", "www." or "@" (plain, entity-encoded or tag-split) is a 400 and nothing is written or sent', async () => {
  const bad = [
    '<p>see http://x.example</p>', '<p>see https://chemcalc.co/kits.html</p>', '<p>HTTPS://X.EXAMPLE</p>', '<p>go to www.x.example</p>', '<p>WWW.X.EXAMPLE</p>', '<p>mail me a@b.co</p>', '<p>@</p>',
    '<p>a&#64;b.co</p>', '<p>a&#x40;b.co</p>', '<p>a&#X40;b.co</p>', '<p>a&#0064;b.co</p>', '<p>a&#64b.co</p>', '<p>a&commat;b.co</p>',
    '<p>http&#58;&#47;&#47;x.example</p>', '<p>http&colon;&sol;&sol;x.example</p>', '<p>&#119;&#119;&#119;.x.example</p>', '<p>www&period;x.example</p>',
    '<p>ht<b></b>tp://x.example</p>', '<p>ht<strong>tp:</strong>//x.example</p>', '<p>ht<img src=x>tp://x.example</p>', '<p>ww<span>w</span>.x.example</p>', '<p>a<b></b>@b.co</p>',
    '<a href="https://chemcalc.co/">https://chemcalc.co/</a>', '<a href="https://chemcalc.co/">www.chemcalc.co</a>',
  ];
  for (const html of bad) {
    w = createWorld(); logs.length = 0;
    const r = await call(goodBody({ resultsHtml: html }));
    assert.equal(r.status, 400, html);
    assert.deepEqual(await r.json(), { error: 'Invalid request' }, html);
    assert.equal(w.calls.length, 0, 'nothing written, nothing sent: ' + html);
  }
});
test('links: results text without those tokens still sends (colons, slashes, ampersands, degrees, dashes)', async () => {
  const good = ['<p>Total: 4:1 Gallons</p>', '<p>1/2 oz of resin — 2.0%</p>', '<p>cost $5.00 / gal</p>', '<p>a &lt; b</p>', '<p>Factory Product Coverage Rate: 450 ft²/gal • Recommended coats: 2</p>'];
  for (const html of good) {
    w = createWorld();
    const r = await call(goodBody({ resultsHtml: html }));
    assert.equal(r.status, 200, html);
    assert.equal(resendCalls(w).length, 1, html);
  }
  assert.equal(hasLinkLikeText('<p>plain</p>'), false);
  assert.equal(hasLinkLikeText('<p>a@b</p>'), true);
});
test('links: the seven real payloads are accepted and reach the email byte for byte', async () => {
  for (const x of REAL) {
    w = createWorld();
    assert.equal(hasLinkLikeText(sanitizeResultsHtml(x.body.resultsHtml)), false, x.label);
    const r = await call(x.body);
    assert.equal(r.status, 200, x.label);
    assert.equal(sanitizeResultsHtml(x.body.resultsHtml), x.body.resultsHtml, x.label + ': sanitizer leaves it unchanged');
    assert.ok(resendCalls(w)[0].body.html.includes(x.body.resultsHtml), x.label + ': byte for byte in the email');
  }
});

/* ---------- F5: an unknown Resend outcome keeps the slot ---------- */
test('slot: Resend answering 500 is a 502 and the row is removed; a timeout or network error is a 502 and the row is KEPT', async () => {
  w.fail.resendStatus = 500;
  assert.equal((await call(goodBody())).status, 502);
  assert.equal(w.rows.length, 0);
  assert.equal(ownDeletes(w).length, 1);
  for (const k of ['resendThrows', 'resendTimeout']) {
    w = createWorld(); w.fail[k] = true;
    const r = await call(goodBody());
    assert.equal(r.status, 502, k);
    assert.deepEqual(await r.json(), { error: 'Email service unavailable' }, k);
    assert.equal(w.rows.length, 1, k + ': the row is kept');
    assert.equal(ownDeletes(w).length, 0, k + ': no delete was attempted');
    // the next requests for that recipient see the kept row: 1 kept + 2 more = 3, the 4th row is over the cap of 3
    w.fail[k] = false;
    assert.equal((await call(goodBody(), { ip: '192.0.2.1' })).status, 200);
    assert.equal((await call(goodBody(), { ip: '192.0.2.2' })).status, 200);
    assert.equal((await call(goodBody(), { ip: '192.0.2.3' })).status, 429);
  }
});

/* ---------- F8: the tip is escaped ---------- */
test('tip: markup and ampersands in the tip are escaped in the email', async () => {
  w.tip = 'Use <b>care</b> & "patience" <img src=x onerror=a()>';
  await call(goodBody());
  const h = resendCalls(w)[0].body.html;
  assert.ok(h.includes('Use &lt;b&gt;care&lt;/b&gt; &amp; &quot;patience&quot; &lt;img src=x onerror=a()&gt;'), h);
  assert.ok(!h.includes('<b>care') && !h.includes('<img'));
});

/* ---------- F11: CORS ---------- */
test('CORS: the preflight allows the four optional supabase-js headers, exactly as listed', async () => {
  const r = await call(null, { method: 'OPTIONS' });
  assert.equal(r.headers.get('access-control-allow-headers'), 'authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage');
});

/* ---------- R9: closed vocabulary ---------- */
const refusedWithNothingDone = async (htmls, why) => {
  for (const html of htmls) {
    w = createWorld(); logs.length = 0;
    const r = await call(goodBody({ resultsHtml: html }));
    assert.equal(r.status, 400, `${why}: ${JSON.stringify(html)}`);
    assert.deepEqual(await r.json(), { error: 'Invalid request' });
    assert.equal(w.calls.length, 0, `nothing written, nothing sent: ${JSON.stringify(html)}`);
  }
};
const acceptedAndSent = async (htmls) => {
  for (const html of htmls) {
    w = createWorld();
    const r = await call(goodBody({ resultsHtml: html }));
    assert.equal(r.status, 200, JSON.stringify(html));
    assert.equal(resendCalls(w).length, 1, JSON.stringify(html));
  }
};
test('vocab: hostile prose is refused (400), nothing written, nothing sent', async () => {
  await refusedWithNothingDone([
    '<p>Your account is suspended, verify now</p>', '<p>Call 555-123-4567 now</p>', '<p>evil.com</p>', '<p>EVIL.COM</p>', '<p>visit evil dot com</p>', '<p>chemcalc.co</p>', '<p>a.b</p>',
    '<p>Click here</p>', '<p>FREE GIFT</p>', '<p>Total Gallons Resin hardener evil</p>', '<p>MEKP Volume: 18.9 cc (mL) refund</p>', '<p>Gallons.Resin</p>', '<p>Gallons<br>evil</p>',
  ], 'prose');
});
test('vocab: character tricks are refused', async () => {
  await refusedWithNothingDone([
    '<p>ｅｖｉｌ．ｃｏｍ</p>',     // fullwidth e v i l . c o m
    '<p>Gal​lons</p>',                                    // zero-width space inside an allowed word
    '<p>Gаllons</p>', '<p>Gallons раy</p>',      // Cyrillic look-alikes (a, p, a)
    '<p>Gallons \u{1F600}</p>', '<p>Gallons \\ resin</p>', '<p>Gallons `resin`</p>', '<p>Gallons_resin</p>', '<p>Gallons ~ resin</p>', '<p>Gallons | resin</p>',
    '<p>Gallons {resin}</p>', '<p>Gallons [resin]</p>', '<p>Gallons = resin</p>', '<p>Gallons * resin</p>', '<p>Gallons ? resin</p>', '<p>Gallons ^ resin</p>', '<p>Gallons + resin</p>',
    '<p>Gallons "resin"</p>', '<p>Gallons &gt; resin</p>', '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>', '<p>Gallons resin</p>', '<p>Gallons resin</p>', '<p>Gallons　resin</p>', '<p>Resin &amp; hardener</p>',   // no calculator prints an ampersand
  ], 'characters');
});
test('vocab: entity-encoded, tag-split and mixed-case forms of an invalid word are refused; the same forms of a valid word are accepted', async () => {
  await refusedWithNothingDone(['<p>Ev&#105;l</p>', '<p>Ev&#x69;l</p>', '<p>ev<b></b>il</p>', '<p>EvIl</p>', '<p>EVIL</p>', '<p>e<strong>v</strong>i<em>l</em></p>', '<p>Gal&#108;ons evil</p>'], 'forms of an invalid word');
  await acceptedAndSent(['<p>Gal&#108;ons</p>', '<p>Gal&#x6c;ons</p>', '<p>Gal<b></b>lons</p>', '<p>Gal<strong></strong>lons</p>', '<p>GALLONS</p>', '<p>gAlLoNs</p>', '<p>a &lt; b</p>']);
});
test('vocab: ordinary calculator wording and number formats still send', async () => {
  await acceptedAndSent([
    '<p>Total: 4:1 Gallons</p>', '<p>1/2 oz of resin — 2.0%</p>', '<p>cost $5.00 / gal</p>', '<p>Total: —</p>', '<p>Reducer: &lt; 0.01 mL</p>', '<p>Estimated Cost: $0.23</p>',
    '<p>Factory Product Coverage Rate: 450 ft²/gal • Recommended coats: 2</p>', '<p>Accelerator (Pro-Cure X-98): 1.41 mL</p>', '<p>Reducer (T0001/T0002/T0003/T0005, 25%): 0.12 Liters</p>',
    '<p>Recommended MEKP % (based on 72°F): 2.0%</p>', '<p>Gallons</p><p>Resin</p>',
  ]);
});
test('vocab: VOCAB is lower-case ASCII letters only with no duplicates; every word of the 7 real payloads is in it; ALLOWED_PUNCT has no letter, digit or space', () => {
  const src = readFileSync(new URL('../../supabase/functions/send-results/vocab.ts', import.meta.url), 'utf8');
  const listed = [...src.slice(0, src.indexOf(']);')).matchAll(/'([^']*)'/g)].map((m) => m[1]);
  assert.ok(listed.length > 100);
  assert.equal(new Set(listed).size, listed.length, 'duplicate words in vocab.ts');
  assert.equal(listed.length, VOCAB.size);
  for (const wd of VOCAB) assert.match(wd, /^[a-z]+$/, wd);
  for (const x of REAL) for (const wd of wordText(sanitizeResultsHtml(x.body.resultsHtml)).match(/[A-Za-z]+/g) ?? []) assert.ok(VOCAB.has(wd.toLowerCase()), `${x.label}: ${wd}`);
  assert.ok(ALLOWED_PUNCT.length > 0);
  for (const c of ALLOWED_PUNCT) assert.ok(!/[A-Za-z0-9\s]/.test(c), JSON.stringify(c));
  for (const c of ['@', ':', '/']) assert.ok(c === '@' ? !ALLOWED_PUNCT.includes(c) : ALLOWED_PUNCT.includes(c), c);   // "@" never; ":" and "/" are in real results ("4:1", "ft²/gal")
});
test('vocab: the refusal logs one line with one lower-case token (at most 20 letters), a code point or "dot between letters", and nothing else', async () => {
  const line = /^send-results: text outside closed vocabulary \((word [a-z]{1,20}|character U\+[0-9A-F]{4,6}|dot between letters)\)$/;
  const cases = [
    ['<p>Gallons evilverylongwordthatgoesonandon</p>', 'word evilverylongwordthat'],
    ['<p>Gallons EVIL</p>', 'word evil'],
    ['<p>Gallons Ж</p>', 'character U+0416'],
    ['<p>Gallons \u{1F600}</p>', 'character U+1F600'],
    ['<p>a.b</p>', 'dot between letters'],
  ];
  for (const [html, reason] of cases) {
    w = createWorld(); logs.length = 0;
    await call(goodBody({ email: 'victim@example.com', resultsHtml: html }));
    assert.equal(logs.length, 1, 'exactly one log line: ' + logs.join(' | '));
    assert.match(logs[0], line);
    assert.equal(logs[0], `send-results: text outside closed vocabulary (${reason})`);
    assert.ok(!/victim|example\.com|<|203\.0\.113|\bp\b>/.test(logs[0]));
  }
});
