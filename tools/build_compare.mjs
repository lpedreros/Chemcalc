// Pre-renders testing/compare.html from testing/compare.js, so crawlers that do not run JavaScript
// (GPTBot, ClaudeBot, PerplexityBot...) read the full comparison page.
//
//   node tools/build_compare.mjs            write the result into testing/compare.html
//   node tools/build_compare.mjs --check    exit 1 if compare.html is out of date (changes nothing)
//
// HOW: it runs the REAL compare.js in a sandbox with a very small DOM stand-in, so the page is drawn by exactly the
// code the browser would run (one renderer, no second copy of the markup). The result is written between
//   <!-- cmp-prerender:jump --> ... <!-- /cmp-prerender:jump -->      (and :sections, :trust)
// and into the four hero figures (data-cmp-count / -total / -rest / -checked). Edit the copy in compare.js, then run this.
// In the browser compare.js leaves an already-filled container alone.
import { readFileSync, writeFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'testing', 'compare.js');
const HTML = join(ROOT, 'testing', 'compare.html');

/* ---------- a DOM stand-in just big enough for compare.js's rendering code ---------- */
class Text { constructor(t) { this.text = String(t); } }
class El {
  constructor(tag) { this.tag = tag; this.attrs = []; this.kids = []; }
  setAttribute(k, v) { const a = this.attrs.find((x) => x[0] === k); if (a) a[1] = String(v); else this.attrs.push([k, String(v)]); }
  getAttribute(k) { const a = this.attrs.find((x) => x[0] === k); return a ? a[1] : null; }
  appendChild(n) { this.kids.push(n); return n; }
  get children() { return this.kids.filter((k) => k instanceof El); }
  get textContent() { return this.kids.map((k) => (k instanceof Text ? k.text : k.textContent)).join(''); }
  set textContent(t) { this.kids = [new Text(t)]; }
  set className(v) { this.setAttribute('class', v); }
  get className() { return this.getAttribute('class') || ''; }
  set id(v) { this.setAttribute('id', v); }
  set href(v) { this.setAttribute('href', v); }
  set scope(v) { this.setAttribute('scope', v); }
  set type(v) { this.setAttribute('type', v); }
  set tabIndex(v) { this.setAttribute('tabindex', v); }
}
const escText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
function html(n) {
  if (n instanceof Text) return escText(n.text);
  const a = n.attrs.map(([k, v]) => ` ${k}="${escAttr(v)}"`).join('');
  return `<${n.tag}${a}>${n.kids.map(html).join('')}</${n.tag}>`;
}

const containers = { cmpJump: new El('ul'), cmpSections: new El('div'), cmpTrust: new El('ul') };
const stat = { '[data-cmp-count]': new El('span'), '[data-cmp-total]': new El('span'), '[data-cmp-rest]': new El('p'), '[data-cmp-checked]': new El('p') };
const document = {
  readyState: 'complete',
  getElementById: (id) => containers[id] || null,
  querySelector: (sel) => stat[sel] || null,
  querySelectorAll: () => [],
  createElement: (tag) => new El(tag),
  createElementNS: (ns, tag) => new El(tag),
  createTextNode: (t) => new Text(t),
  addEventListener() {},
  body: { style: {} },
};
runInNewContext(readFileSync(JS, 'utf8'), { window: {}, document, location: { hash: '' } }, { filename: 'compare.js' });

/* ---------- write it into compare.html ---------- */
const lines = (el) => el.children.map(html).join('\n');
const regions = { jump: lines(containers.cmpJump), sections: lines(containers.cmpSections), trust: lines(containers.cmpTrust) };
if (!regions.jump || !regions.sections || !regions.trust) throw new Error('compare.js drew nothing: the sandbox is missing something it needs');

let page = readFileSync(HTML, 'utf8');
const original = page;

// first run: put the marker pairs into the (empty) containers
for (const [id, tag, name] of [['cmpJump', 'ul', 'jump'], ['cmpSections', 'div', 'sections'], ['cmpTrust', 'ul', 'trust']]) {
  const empty = new RegExp(`(id="${id}">)(</${tag}>)`);
  if (empty.test(page)) page = page.replace(empty, `$1<!-- cmp-prerender:${name} --><!-- /cmp-prerender:${name} -->$2`);
}
for (const [name, body] of Object.entries(regions)) {
  const re = new RegExp(`(<!-- cmp-prerender:${name} -->)[\\s\\S]*?(<!-- /cmp-prerender:${name} -->)`);
  if (!re.test(page)) throw new Error(`marker cmp-prerender:${name} not found in compare.html`);
  page = page.replace(re, (m, a, b) => `${a}\n${body}\n${b}`);
}
for (const [attr, sel] of [['data-cmp-count', '[data-cmp-count]'], ['data-cmp-total', '[data-cmp-total]'], ['data-cmp-rest', '[data-cmp-rest]'], ['data-cmp-checked', '[data-cmp-checked]']]) {
  const re = new RegExp(`(<(?:span|p)[^>]*${attr}>)[^<]*(</(?:span|p)>)`);
  if (!re.test(page)) throw new Error(`${attr} not found in compare.html`);
  page = page.replace(re, (m, a, b) => `${a}${escText(stat[sel].textContent)}${b}`);
}

if (process.argv.includes('--check')) {
  if (page !== original) { console.error('testing/compare.html is out of date: run node tools/build_compare.mjs'); process.exit(1); }
  console.log('testing/compare.html is up to date with compare.js');
} else {
  if (page !== original) writeFileSync(HTML, page);
  console.log(page !== original ? 'wrote testing/compare.html' : 'testing/compare.html already up to date');
}
