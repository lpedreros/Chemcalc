// Replays the five calculators in headless Edge and feeds every "Email Me" body they can produce to the REAL send-results handler.
//   node tools/verify/send_results_vocab_check.mjs [--tree root|testing|both] [--emit] [--quick]
//   exit 0 = every captured body was accepted (HTTP 200) and every word/character is in vocab.ts; non-zero = something is missing (printed).
//   --emit  also prints every word and punctuation character seen (used to build vocab.ts); --quick samples fewer combinations.
// How: each calculator page is served from the chosen tree (root = production copy, testing = testing/), driven through a grid of every
// dropdown option, radio, checkbox, unit system, slider position and temperature/amount (one input varied at a time, dropdown combinations
// all-pairs or full product), and the page's own "Email Me" button is clicked with the Supabase call replaced by a recorder. Nothing is sent or
// written: writes to supabase.co are blocked, logCalculation is stubbed, and the recorder returns an error so no analytics row is made.
// Needs Microsoft Edge or Chrome installed. It uses port 9382 for the debugging connection: run one copy at a time.
import http from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { handle, sanitizeResultsHtml, wordText } from '../../supabase/functions/send-results/handler.ts';
import { createWorld, ENV, NOW } from './send_results_fakes.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i < 0 ? d : (args[i + 1] ?? d); };
const EMIT = args.includes('--emit');
const QUICK = args.includes('--quick');
const TREES = { root: REPO, testing: join(REPO, 'testing') };
const wantTrees = opt('--tree', 'both') === 'both' ? ['root', 'testing'] : [opt('--tree', 'both')];
const PAGES = [['mekp', 'mekpcalc.html'], ['awlgrip', 'awlgrip.html'], ['alexseal', 'alexseal.html'], ['epifanes', 'epifanespoly.html'], ['clothcalc', 'clothcalc.html']];
const PORT = 8791, DEBUG_PORT = 9382;

/* ---------- the vocabulary (absent while it is being built: --emit then only lists what was seen) ---------- */
let VOCAB = null, ALLOWED_PUNCT = null;
try { ({ VOCAB, ALLOWED_PUNCT } = await import('../../supabase/functions/send-results/vocab.ts')); } catch { /* not written yet */ }
const wordsOf = (t) => (t.match(/[A-Za-z]+/g) || []).map((w) => w.toLowerCase());
const punctOf = (t) => [...t].filter((c) => !/[A-Za-z0-9\s]/.test(c));

/* ---------- a static server for one tree ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp', '.csv': 'text/csv' };
let treeDir = TREES.root;
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = resolve(join(treeDir, p === '/' ? 'index.html' : p));
  if (!f.startsWith(resolve(treeDir)) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(readFileSync(f));
});

/* ---------- the browser, over the DevTools protocol ---------- */
const EDGES = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'];
const EXE = EDGES.find((p) => existsSync(p));
if (!EXE) { console.error('No Edge or Chrome found: the replay cannot run (this script has no weaker fallback; it never reports a pass it did not earn).'); process.exit(2); }
let proc, prof, ws, nextId = 0;
const pending = new Map();
const call = (method, params = {}) => new Promise((res) => { const i = ++nextId; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
async function startBrowser() {
  prof = mkdtempSync(join(tmpdir(), 'vocab-check-'));
  proc = spawn(EXE, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DEBUG_PORT}`, '--remote-allow-origins=*', '--user-data-dir=' + prof, 'about:blank'], { stdio: 'ignore' });
  let page;
  for (let i = 0; i < 80 && !page; i++) {
    try { page = (await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`)).json()).find((t) => t.type === 'page'); } catch { /* not up yet */ }
    if (!page) await new Promise((r) => setTimeout(r, 500));
  }
  if (!page) throw new Error('browser did not start');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', async (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); return; }
    if (d.method === 'Fetch.requestPaused') {   // supabase.co: reads pass, anything that writes is refused
      const r = d.params.request;
      if (['GET', 'HEAD', 'OPTIONS'].includes(r.method)) call('Fetch.continueRequest', { requestId: d.params.requestId });
      else call('Fetch.failRequest', { requestId: d.params.requestId, errorReason: 'BlockedByClient' });
    }
  });
  await call('Page.enable');
  await call('Network.enable');
  await call('Network.setBlockedURLs', { urls: ['*googlesyndication*', '*ampproject*', '*googletagmanager*', '*facebook*', '*stackpath*', '*fonts.g*', '*paypal*', '*jquery.com*', '*popper*'] });
  await call('Fetch.enable', { patterns: [{ urlPattern: '*supabase.co*' }] });
}
async function stopBrowser() {
  try { ws?.close(); } catch { /* ignore */ }
  try { if (proc) execSync(process.platform === 'win32' ? `taskkill /PID ${proc.pid} /T /F` : `kill -9 ${proc.pid}`, { stdio: 'ignore' }); } catch { /* ignore */ }
  await new Promise((r) => setTimeout(r, 1000));
  try { if (prof) rmSync(prof, { recursive: true, force: true }); } catch { /* ignore */ }
}
async function ev(expression, timeout = 600000) {
  const r = await Promise.race([call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }), new Promise((_, rej) => setTimeout(() => rej(new Error('evaluate timed out')), timeout))]);
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 600));
  return r.result.result.value;
}

/* ---------- the driver that runs INSIDE the page ---------- */
const DRIVER = String.raw`
window.__drive = async function (QUICK) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fire = (el, types) => types.forEach((t) => el.dispatchEvent(new Event(t, { bubbles: true })));
  const EXCL = /^(feedback|signup|profile|chatbot|captureEmail|marketingOptIn|currency|email)/i;
  // Never write anything: the analytics logger is stubbed and the Supabase call is a recorder that answers with an error.
  window.logCalculation = async () => {}; window.markEmailCaptured = async () => {};
  window.__last = null;
  Object.defineProperty(_sb, 'functions', { configurable: true, value: { invoke: async (name, o) => { window.__last = o.body; return { data: null, error: new Error('recorded') }; } } });   // 'functions' is a getter in supabase-js, so replace the property itself
  const emailIn = document.getElementById('captureEmailInput'), btn = document.getElementById('btnEmailResults');
  emailIn.value = 'replay@example.com';
  const out = { captures: [], combos: 0, noResults: 0, skipped: 0, states: 0, info: {} };
  const seen = new Set();
  const capture = (tag) => {
    out.combos++;
    window.__last = null; btn.disabled = false; btn.click();   // the page disables the button while a send is in flight; every click here is a fresh one
    const b = window.__last;
    if (!b) { out.noResults++; return; }
    const key = b.calculatorName + '|' + b.calculatorId + '|' + b.resultsHtml;
    if (!seen.has(key)) { seen.add(key); out.captures.push({ tag, body: b }); }
  };
  const all = (sel) => [...document.querySelectorAll(sel)];
  const okId = (e) => e.id && !EXCL.test(e.id) && !EXCL.test(e.name || '');
  const selects = () => all('select').filter(okId);
  const checks = () => all('input[type=checkbox]').filter(okId);
  const radioGroups = () => { const g = {}; all('input[type=radio]').filter((r) => r.name && !EXCL.test(r.name)).forEach((r) => (g[r.name] = g[r.name] || []).push(r)); return g; };
  const nums = () => all('input[type=number],input[type=range]').filter(okId);
  const isRange = (e) => e.type === 'range';
  // Starting values of the numeric inputs (what the page loads with); empty ones get a plain base.
  const base = {}; nums().forEach((e) => { base[e.id] = e.value !== '' ? e.value : (/length|width/i.test(e.id) ? '12' : '5'); });
  const setNum = (e, v) => { e.value = String(v); fire(e, ['input', 'change']); };
  const resetNums = () => nums().forEach((e) => setNum(e, base[e.id]));
  const TEMPS = ['', -10, 0, 10, 16, 18, 21, 24, 27, 30, 35, 40, 45, 55, 62, 70, 80, 90, 100, 120];
  const AMOUNTS = ['', 0, -5, 0.00001, 0.001, 1, 7.5, 32, 150, 12345, 1e9];
  const COSTS = ['', 0, 25, 99.99, 1000000];
  const candidates = (e) => {
    if (isRange(e)) { const mn = +e.min, mx = +e.max, st = +e.step || 1, n = Math.round((mx - mn) / st); const vals = []; const stepEvery = QUICK ? Math.max(1, Math.round(n / 6)) : 1; for (let i = 0; i <= n; i += stepEvery) vals.push(+(mn + i * st).toFixed(4)); if (vals[vals.length - 1] !== mx) vals.push(mx); return vals; }
    if (/temp/i.test(e.id)) return QUICK ? ['', -10, 10, 18, 21, 27, 35, 55, 62, 70, 80, 90, 100] : TEMPS;
    if (/cost/i.test(e.id)) return COSTS;
    return AMOUNTS;
  };
  const numericSweep = (tag) => {
    resetNums(); capture(tag + '/base');
    for (const e of nums()) {
      for (const v of candidates(e)) { setNum(e, v); capture(tag + '/' + e.id + '=' + v); }
      setNum(e, base[e.id]);
    }
  };
  // ---- structural controls and their values (re-read each time: choosing one control can rebuild another's options)
  const factors = () => {
    const f = [];
    selects().forEach((s) => { if (s.options.length > 1 && s.options.length <= 8) f.push({ kind: 'select', el: s, id: s.id, vals: [...s.options].map((o) => o.value) }); });
    checks().forEach((c) => f.push({ kind: 'check', el: c, id: c.id, vals: [false, true] }));
    const g = radioGroups(); Object.keys(g).forEach((n) => f.push({ kind: 'radio', els: g[n], id: n, vals: g[n].map((r) => r.value) }));
    return f;
  };
  const apply = (f, v) => {
    if (f.kind === 'select') { if (![...f.el.options].some((o) => o.value === v)) { out.skipped++; return; } f.el.value = v; fire(f.el, ['input', 'change']); }
    else if (f.kind === 'check') { if (f.el.checked !== v) { f.el.checked = v; fire(f.el, ['click', 'input', 'change']); } }
    else { const r = f.els.find((x) => x.value === v); if (r) { r.checked = true; fire(r, ['click', 'input', 'change']); } }
  };
  const applyState = (fs, st) => { for (let pass = 0; pass < 2; pass++) fs.forEach((f, i) => apply(f, st[i])); };
  const pairwise = (sizes) => {
    const n = sizes.length, tests = [], need = new Set();
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let a = 0; a < sizes[i]; a++) for (let b = 0; b < sizes[j]; b++) need.add(i + ':' + a + ':' + j + ':' + b);
    while (need.size) {
      const t = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        let best = 0, bestGain = -1;
        for (let a = 0; a < sizes[i]; a++) { let gain = 0; for (let j = 0; j < i; j++) if (need.has(j + ':' + t[j] + ':' + i + ':' + a)) gain++; if (gain > bestGain) { bestGain = gain; best = a; } }
        t[i] = best;
      }
      let any = false;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (need.delete(i + ':' + t[i] + ':' + j + ':' + t[j])) any = true;
      if (!any) { const k = [...need][0].split(':').map(Number); const u = new Array(n).fill(0); u[k[0]] = k[1]; u[k[2]] = k[3]; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) need.delete(i + ':' + u[i] + ':' + j + ':' + u[j]); tests.push(u); } else tests.push(t);
    }
    return tests.length ? tests : [new Array(n).fill(0)];
  };
  const product = (sizes) => { let acc = [[]]; sizes.forEach((s) => { const nx = []; acc.forEach((p) => { for (let a = 0; a < s; a++) nx.push(p.concat(a)); }); acc = nx; }); return acc; };
  const wideSelects = () => selects().filter((s) => s.options.length > 8);

  // Cloth: show extra layer rows so the multi-layer arithmetic runs.
  const addLayer = document.getElementById('add-layer-btn');
  if (addLayer) { addLayer.click(); addLayer.click(); }

  // The outer control is the measurement system (it rebuilds the unit lists); everything else is enumerated under it.
  const outerEl = document.getElementById('unitSystem') || document.getElementById('result-system');
  const outerVals = outerEl ? [...outerEl.options].map((o) => o.value) : [null];
  for (const ov of outerVals) {
    if (outerEl) { outerEl.value = ov; fire(outerEl, ['input', 'change']); await sleep(30); }
    const fs = factors().filter((f) => f.el !== outerEl);
    const sizes = fs.map((f) => f.vals.length);
    const full = sizes.reduce((a, b) => a * b, 1);
    const states = (full <= (QUICK ? 60 : 500)) ? product(sizes) : pairwise(sizes);
    out.info[String(ov)] = { factors: fs.map((f) => f.id + ':' + f.vals.length).join(' '), fullSize: full, states: states.length, mode: full <= (QUICK ? 60 : 500) ? 'full product' : 'all pairs' };
    for (const st of states) {
      applyState(fs, st.map((a, i) => fs[i].vals[a]));
      out.states++;
      numericSweep('sys=' + ov + ' ' + fs.map((f, i) => f.id + '=' + f.vals[st[i]]).join(','));
      await sleep(0);
    }
    // wide dropdowns (cloth materials: 26 options per layer row): every option of every row, one at a time
    for (const s of wideSelects()) {
      for (const o of [...s.options]) { s.value = o.value; fire(s, ['input', 'change']); resetNums(); capture('sys=' + ov + ' ' + s.id + '=' + o.value); }
    }
  }
  return JSON.stringify(out);
};
true;
`;

/* ---------- fragments the replay cannot reach ---------- */
// Result text that only appears in a branch no input of the grid triggers (an error, or an option combination the page never offers).
// Each must still be present, word for word, in the named source file (so a reworded calculator fails here), and every word must be in vocab.ts.
const STATIC = [
  ['mekscript.js', 'Recommended MEKP % (based on temperature): Enter Temp'],
  ['mekscript.js', 'Warning: Temperature is below 60°F (15.6°C). Curing may be significantly slowed or inhibited. Consider warming the workspace or materials.'],
  ['mekscript.js', 'Recommended MEKP % (based on temperature): —'],
  ['mekscript.js', 'Using: —'],
  ['alexsealscript.js', 'Coverage info not available for this selection.'],
  ['awlgripscript.js', 'Coverage info not available for this selection.'],
  ['alexsealscript.js', '"Err"'],
  ['awlgripscript.js', '"Err"'],
  ['epifanesScript.js', 'return "--";'],
];

/* ---------- run ---------- */
const reasons = [];
const origWarn = console.warn;
const results = [];
const seenWords = new Map(), seenPunct = new Map(), sample = new Map(), byPage = new Map();   // sample: first text each word/character was seen in
let failures = 0;

async function feedHandler(body) {
  const w = createWorld();
  const msgs = [];
  console.warn = (...a) => msgs.push(a.map(String).join(' '));
  const r = await handle(new Request('https://proj.supabase.co/functions/v1/send-results', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://chemcalc.co', 'cf-connecting-ip': '203.0.113.7' }, body: JSON.stringify(body) }), { env: ENV, fetch: w.fetch, now: () => NOW });
  console.warn = origWarn;
  return { status: r.status, msgs };
}

try {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  await startBrowser();
  for (const treeName of wantTrees) {
    treeDir = TREES[treeName];
    for (const [name, file] of PAGES) {
      const t0 = Date.now();
      await call('Page.navigate', { url: `http://127.0.0.1:${PORT}/${file}` });
      let ready = false;
      for (let i = 0; i < 40 && !ready; i++) { await new Promise((r) => setTimeout(r, 500)); ready = await ev(`document.readyState === 'complete' && typeof _sb !== 'undefined' && !!_sb && !!document.getElementById('btnEmailResults')`).catch(() => false); }
      if (!ready) { console.log(`FAIL ${treeName}/${name}: page did not load (no Email Me button or no _sb)`); failures++; continue; }
      await new Promise((r) => setTimeout(r, 4000));   // product lists arrive asynchronously
      await ev(DRIVER);
      const out = JSON.parse(await ev(`window.__drive(${QUICK})`));
      let accepted = 0, refused = 0;
      const bad = [];
      for (const c of out.captures) {
        const { status, msgs } = await feedHandler(c.body);
        const text = wordText(sanitizeResultsHtml(c.body.resultsHtml));   // exactly what the handler's vocabulary check will see
        for (const wd of wordsOf(text)) { (byPage.get(name) || byPage.set(name, new Set()).get(name)).add(wd); seenWords.set(wd, (seenWords.get(wd) || 0) + 1); if (!sample.has(wd)) sample.set(wd, treeName + '/' + name + ': ' + text.replace(/\s+/g, ' ').trim()); }
        for (const ch of punctOf(text)) { seenPunct.set(ch, (seenPunct.get(ch) || 0) + 1); if (!sample.has(ch)) sample.set(ch, treeName + '/' + name + ': ' + text.replace(/\s+/g, ' ').trim()); }
        if (status === 200) accepted++; else { refused++; bad.push({ tag: c.tag, status, msgs, html: c.body.resultsHtml }); }
      }
      if (refused) failures++;
      results.push({ tree: treeName, page: name, combos: out.combos, unique: out.captures.length, accepted, refused, noResults: out.noResults, skipped: out.skipped, states: out.states });
      console.log(`${refused ? 'FAIL' : 'ok  '} ${treeName.padEnd(7)} ${name.padEnd(9)} combinations ${String(out.combos).padStart(6)}  distinct bodies ${String(out.captures.length).padStart(5)}  accepted ${String(accepted).padStart(5)}  refused ${refused}  (no-results clicks ${out.noResults}, unreachable option values ${out.skipped}, dropdown states ${out.states}, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
      console.log('       ' + Object.entries(out.info).map(([k, v]) => `${k}: ${v.mode} of ${v.fullSize} -> ${v.states}`).join(' | '));
      for (const b of bad.slice(0, 6)) console.log(`   refused [${b.tag}] ${b.msgs.join(' / ') || 'status ' + b.status}\n      ${b.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 220)}`);
    }
  }
} finally {
  await stopBrowser();
  server.close();
}

/* ---------- the static fragments ---------- */
const staticWords = new Set();
for (const [file, text] of STATIC) {
  for (const treeName of ['root', 'testing']) {
    if (!readFileSync(join(TREES[treeName], file), 'utf8').includes(text)) { console.log(`FAIL static fragment not found in ${treeName}/${file}: ${text}`); failures++; }
  }
  if (!text.startsWith('return') && !text.startsWith('"')) { for (const wd of wordsOf(text)) staticWords.add(wd); }
  else if (text === '"Err"') staticWords.add('err');
}
const missingStatic = VOCAB ? [...staticWords].filter((w) => !VOCAB.has(w)) : [];
if (missingStatic.length) { console.log('STATIC FRAGMENT WORDS NOT IN VOCAB: ' + missingStatic.join(' ')); failures++; }
const emitJson = opt('--emit-json', '');
if (emitJson) writeFileSync(emitJson, JSON.stringify({ byPage: Object.fromEntries([...byPage].map(([k, v]) => [k, [...v].sort()])), static: [...staticWords].sort(), punct: [...seenPunct.keys()].sort() }, null, 1));

/* ---------- words and characters seen ---------- */
const missingWords = VOCAB ? [...seenWords.keys()].filter((w) => !VOCAB.has(w)) : [];
const missingPunct = ALLOWED_PUNCT !== null ? [...seenPunct.keys()].filter((c) => !ALLOWED_PUNCT.includes(c)) : [];
for (const t of (opt('--find', '') || '').split(',').filter(Boolean)) console.log(`
first seen: ${t} -> ${sample.get(t) ?? '(never)'}`);
if (EMIT) {
  console.log('\nWORDS SEEN (' + seenWords.size + '): ' + [...seenWords.keys()].sort().join(' '));
  console.log('PUNCTUATION SEEN: ' + [...seenPunct.keys()].map((c) => c + ' (U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0') + ')').join('  '));
}
if (!VOCAB) { console.log('\nvocab.ts not found: nothing to check against (use --emit to list what was seen).'); process.exit(EMIT ? 0 : 1); }
if (missingWords.length) console.log('\nWORDS SEEN BUT NOT IN VOCAB: ' + missingWords.join(' '));
if (missingPunct.length) console.log('CHARACTERS SEEN BUT NOT IN ALLOWED_PUNCT: ' + missingPunct.join(' '));
const total = results.reduce((a, r) => a + r.combos, 0), acc = results.reduce((a, r) => a + r.accepted, 0), uniq = results.reduce((a, r) => a + r.unique, 0);
console.log(`\n${failures || missingWords.length || missingPunct.length ? 'FAILED' : 'PASSED'}: ${total} combinations replayed, ${uniq} distinct bodies, ${acc} accepted by the real handler; ${seenWords.size} distinct words and ${seenPunct.size} punctuation characters seen.`);
process.exit(failures || missingWords.length || missingPunct.length ? 1 : 0);
