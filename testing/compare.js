/* ============================================================
   compare.js -- "How We Compare": the comparison copy (single source) and the
   code that draws it.

   Used in two places, both reading the same data below so the copy cannot
   drift between them:
     1. compare.html -- the full index: hero numbers, a jump card per
        calculator, one chart section per calculator, the trust panel.
        The page ships empty containers (#cmpJump, #cmpSections, #cmpTrust)
        and the figures in the hero box; this file fills them.
     2. Each calculator page -- a hero button
        <button class="mp-btn mp-btn--ghost" data-compare-open="SLUG"> opens a
        dialog showing that one calculator's chart. The dialog is built on
        first use; there is no page navigation.

   The copy is the Editor-reviewed final text (2026-10-19). Do not reword it
   here; change it in this one place.

   Everything is built with createElement/textContent (no innerHTML), so the
   copy can contain "&", "<" or quotes without escaping.
   ============================================================ */
(function () {
  'use strict';

  var LAST_CHECKED = 'October 2026';

  // kind 'contested': a real competitor exists -> side-by-side table (rows carry both columns).
  // kind 'uncontested': none exists -> a statement banner plus a "What ChemCalc does" list (rows carry the ChemCalc column only).
  var COMPARISONS = [
    {
      slug: 'mekp',
      name: 'MEKP Calculator',
      shortName: 'MEKP',
      href: 'mekpcalc.html',
      kind: 'contested',
      competitorLabel: 'Closest competitor',
      verdictLabel: 'Generic percentage tool',
      brand: null,
      intro: "The closest thing we found to real competition is a generic online percentage calculator. It says right on the page that it's not a safe way to pick your mix rate.",
      rows: [
        { feature: 'Is there a calculator at all', chemcalc: 'Yes', competitor: 'Yes — but a major MEKP supplier themselves only publish a static chart, not a tool', verdict: 'yes' },
        { feature: 'Resin types', chemcalc: 'Polyester, vinylester, and gelcoat — one calculator covers all three', competitor: 'Gelcoat only, no resin-type choice', verdict: 'no' },
        { feature: 'Does temperature matter here?', chemcalc: "Yes — tells you what band you're in and adjusts for it, °F or °C, your choice", competitor: 'Not used at all — the page says so directly', verdict: 'no' },
        { feature: 'Known brands built in', chemcalc: 'Duratec support built in', competitor: 'None — you need to already know your target percentage', verdict: 'no' },
        { feature: 'Safety guidance', chemcalc: "Gives you a heads-up based on the temperature band you're in", competitor: "Comes with a disclaimer that it doesn't establish a safe mix rate", verdict: 'no' },
        { feature: 'Can you trust the numbers', chemcalc: 'Checked against real manufacturer data, with hand-validated temperature bands', competitor: 'Plain arithmetic, no manufacturer data behind it', verdict: 'no' }
      ]
    },
    {
      slug: 'awlgrip',
      name: 'Awlgrip Coatings Calculator',
      shortName: 'Awlgrip',
      href: 'awlgrip.html',
      kind: 'uncontested',
      competitorLabel: 'Everyone else',
      verdictLabel: 'No calculator exists',
      brand: 'Awlgrip',
      noToolHeadline: 'No mixing calculator exists',
      noToolDetail: "The manufacturer's only tool is a color-matching guide for distributors.",
      intro: "We checked — nobody has built a mixing calculator for these products. The manufacturer's only tool is a color-matching guide for distributors, not something that tells you how much to mix.",
      rows: [
        { feature: "How you tell it what you're covering", chemcalc: 'Does the math for you — and lets you choose how: the actual area, the total volume to mix, or just width × height' },
        { feature: 'Products covered', chemcalc: '6 Awlgrip products — Topcoat, Awlcraft 2000/3000, 545 Epoxy Primer, Awlcraft SE, HDT Clear' },
        { feature: 'Spray vs. brush/roll', chemcalc: 'Changes the mix automatically depending on how you\'re applying it' },
        { feature: 'Units', chemcalc: 'Imperial or metric, your choice' },
        { feature: 'How much it\'ll cover', chemcalc: "Gives you a real coverage estimate, so you know roughly how many coats you'll need" },
        { feature: 'Accelerator (hardener speed)', chemcalc: 'Pick Pro-Cure X-98 or X-138 and it shows you the dose, max working temp, and cure time side by side' },
        { feature: 'Heads-up on gotchas', chemcalc: 'Tells you the gotchas for whichever product you picked (for example, Awlcraft SE: no accelerator needed)' },
        { feature: 'Can you trust the numbers', chemcalc: 'Checked line by line against the real spec sheets — mix, coverage, and accelerator dose all come straight from Awlgrip\'s own data' }
      ]
    },
    {
      slug: 'epifanes',
      name: 'Epifanes Polyurethane Paint & Varnish Calculator',
      shortName: 'Epifanes',
      href: 'epifanespoly.html',
      kind: 'uncontested',
      competitorLabel: 'Everyone else',
      verdictLabel: 'No calculator exists',
      brand: 'Epifanes',
      noToolHeadline: 'No mixing calculator exists',
      noToolDetail: 'Not from Epifanes, not from anybody else.',
      intro: 'Nobody has built a calculator for mixing Epifanes products — not Epifanes, not anybody else.',
      rows: [
        { feature: 'Is there a calculator at all', chemcalc: 'Yes' },
        { feature: 'Products covered', chemcalc: '6 products — Clear Gloss, Clear Satin, Colour/Yacht Coating, in both Standard and Speedcoat' },
        { feature: 'Application method', chemcalc: 'Brush/roll or spray for Standard; spray-only for Speedcoat' },
        { feature: 'How guys actually mix it', chemcalc: 'Straight 2:1 by volume — tells you exactly how much of each you need' },
        { feature: 'Still need to measure it yourself?', chemcalc: 'Yes — the calculator gets you the right amounts, but you still need a scale, cup, or marked stick to pour it out' },
        { feature: 'Thinning guidance', chemcalc: 'Tells you how much to thin it, specific to the product and method you picked' },
        { feature: 'Can you trust the numbers', chemcalc: 'Checked against the real spec sheet — recoat time and pot life both taken straight from it, not estimated' },
        { feature: "Honest about what's not built yet", chemcalc: 'Skipped Polyurethane Primer on purpose — waiting on a straight answer from the manufacturer instead of guessing' }
      ]
    },
    {
      slug: 'fiberglass',
      name: 'Fiberglass Cloth Saturation Calculator',
      shortName: 'Fiberglass',
      href: 'clothcalc.html',
      kind: 'contested',
      competitorLabel: 'Closest competitor',
      verdictLabel: 'One supplier tool',
      brand: null,
      intro: 'The closest real competitor we found is a materials calculator from a fiberglass supply company. Everyone else just publishes a static chart or a rule of thumb.',
      rows: [
        { feature: 'Is there a calculator at all', chemcalc: 'Yes', competitor: 'Yes, genuinely interactive', verdict: 'yes' },
        { feature: 'Resin type', chemcalc: 'Pick polyester, vinylester, or epoxy — the math changes for each', competitor: "One fixed ratio no matter what resin you're using", verdict: 'no' },
        { feature: 'Materials covered', chemcalc: 'Mat, woven roving, combo mat, cloth, carbon fiber, Kevlar', competitor: 'Only their own fabric lineup', verdict: 'no' },
        { feature: 'Where the ratio comes from', chemcalc: 'Real hand-layup practice — checked against an actual test pour, within about a cup of a gallon', competitor: 'A fixed multiplier, with no supporting numbers shown on their page', verdict: 'no' },
        { feature: 'Does temperature matter here?', chemcalc: 'Yes — same temperature guidance as our MEKP calculator, by resin type', competitor: 'Not mentioned', verdict: 'no' },
        { feature: 'Epoxy-specific help', chemcalc: 'Tells you fast vs. slow hardener and steers you to the right product for natural-wood finishing', competitor: 'Not mentioned', verdict: 'no' },
        { feature: 'What you get at the end', chemcalc: 'Full resin-to-hardener breakdown for epoxy; straight resin amount for polyester/vinylester', competitor: 'Just one resin number', verdict: 'no' }
      ]
    },
    {
      slug: 'alexseal',
      name: 'Alexseal Yacht Coatings Calculator',
      shortName: 'Alexseal',
      href: 'alexseal.html',
      kind: 'uncontested',
      competitorLabel: 'Everyone else',
      verdictLabel: 'No calculator exists',
      brand: 'Alexseal',
      noToolHeadline: 'No mixing calculator exists',
      noToolDetail: 'Not from the manufacturer, not from any retailer, not anybody.',
      intro: 'Nobody has built a calculator for mixing Alexseal products — not the manufacturer, not any retailer, not anybody. Same story as Epifanes.',
      rows: [
        { feature: "How you tell it what you're covering", chemcalc: 'Does the math for you — and lets you choose how: the actual area, the total volume to mix, or just width × height' },
        { feature: 'Products covered', chemcalc: '3 products — Premium Topcoat 501, Finish Primer 442, Protective Primer 161' },
        { feature: 'Accelerator (hardener speed)', chemcalc: "Shows the right accelerator for each product — and doesn't show one at all for the one product that doesn't use it" },
        { feature: 'Mixing ratio', chemcalc: 'Exact ratio for the product and method you picked, calculated live' },
        { feature: "How much it'll cover", chemcalc: 'Shows real coverage numbers as a reference, not something we quietly bake into the math for you' },
        { feature: "Finding the manufacturer's own paperwork", chemcalc: 'Links straight to their real spec sheet library' }
      ]
    }
  ];

  var TRUST = [
    { calculator: 'Awlgrip', claim: 'Checked line by line against the real spec sheets', detail: 'Mix ratio, coverage, and accelerator dose all come straight from Awlgrip\'s own published data — not a label, not a guess.' },
    { calculator: 'Fiberglass', claim: 'Tested against a real resin pour', detail: 'Our hand-layup ratios were checked against an actual pour, not just worked out on paper — within about a cup of a gallon of what the cloth actually took.' },
    { calculator: 'Epifanes', claim: 'Recoat time and pot life straight from the spec sheet', detail: "Both figures come directly from Epifanes' own documentation, not a rule of thumb." },
    { calculator: 'MEKP', claim: 'Temperature bands hand-validated', detail: 'Checked against real manufacturer data, band by band — not one blanket number for every condition.' },
    { calculator: 'Alexseal', claim: 'Links straight to the manufacturer\'s own paperwork', detail: "Every Alexseal product in the calculator links back to Alexseal's real spec sheet library, so you can check the numbers yourself." }
  ];

  /* ---------- tiny DOM helpers ---------- */
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // Lucide-style 24x24 stroke icons (the site sprite has no check, minus or arrow glyphs).
  var ICONS = {
    check: ['M20 6 9 17l-5-5'],
    minus: ['M5 12h14'],
    close: ['M18 6 6 18', 'm6 6 12 12'],
    arrowRight: ['M5 12h14', 'm12 5 7 7-7 7'],
    arrowDown: ['M12 5v14', 'm19 12-7 7-7-7'],
    searchX: ['m21 21-4.3-4.3', 'm13.5 8.5-5 5', 'm8.5 8.5 5 5']
  };

  function icon(name, className) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    if (className) svg.setAttribute('class', className);
    if (name === 'searchX') {
      var c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', '11'); c.setAttribute('cy', '11'); c.setAttribute('r', '8');
      svg.appendChild(c);
    }
    ICONS[name].forEach(function (d) {
      var p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', d);
      svg.appendChild(p);
    });
    return svg;
  }

  function find(slug) {
    for (var i = 0; i < COMPARISONS.length; i += 1) if (COMPARISONS[i].slug === slug) return COMPARISONS[i];
    return null;
  }

  /* ---------- pieces ---------- */
  function usCell(text) {
    var cell = el('span', 'cmp-cell cmp-cell--us');
    cell.appendChild(icon('check', 'cmp-cell-icon'));
    cell.appendChild(el('span', 'cmp-cell-text', text));
    return cell;
  }

  function themCell(text, verdict) {
    var cell = el('span', 'cmp-cell cmp-cell--them');
    cell.appendChild(icon(verdict === 'yes' ? 'check' : 'minus', 'cmp-cell-icon'));
    cell.appendChild(el('span', 'sr-only', verdict === 'yes' ? 'Has it: ' : 'Lacks it: '));
    cell.appendChild(el('span', 'cmp-cell-text', text));
    return cell;
  }

  function brandNote(brand) {
    var p = el('p', 'cmp-brand-note');
    p.appendChild(el('strong', null, 'Independent & unofficial'));
    p.appendChild(document.createTextNode(" — ChemCalc isn't affiliated with or endorsed by the maker of " + brand + '.'));
    return p;
  }

  // Contested: a real side-by-side table (stacks into one block per feature on phones).
  function tableChart(c) {
    var wrap = el('div', 'cmp-table-wrap');
    var table = el('table', 'cmp-table');
    var caption = el('caption', 'sr-only', c.name + ': ChemCalc compared with ' + c.competitorLabel.toLowerCase());
    table.appendChild(caption);
    var thead = el('thead');
    var hr = el('tr');
    var h1 = el('th', null, 'Feature'); h1.scope = 'col';
    var h2 = el('th', 'cmp-col-us', 'ChemCalc'); h2.scope = 'col';
    var h3 = el('th', null, c.competitorLabel); h3.scope = 'col';
    hr.appendChild(h1); hr.appendChild(h2); hr.appendChild(h3);
    thead.appendChild(hr);
    table.appendChild(thead);
    var tbody = el('tbody');
    c.rows.forEach(function (row) {
      var tr = el('tr');
      var th = el('th', 'cmp-feature', row.feature); th.scope = 'row';
      var tdUs = el('td', 'cmp-col-us'); tdUs.setAttribute('data-label', 'ChemCalc');
      tdUs.appendChild(usCell(row.chemcalc));
      var tdThem = el('td', 'cmp-col-them'); tdThem.setAttribute('data-label', c.competitorLabel);
      tdThem.appendChild(themCell(row.competitor, row.verdict));
      tr.appendChild(th); tr.appendChild(tdUs); tr.appendChild(tdThem);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  // Uncontested: a statement banner and the list of what ChemCalc does.
  function listChart(c) {
    var box = el('div', 'cmp-uncontested');
    var banner = el('div', 'cmp-banner');
    var badge = el('span', 'cmp-banner-icon');
    badge.appendChild(icon('searchX'));
    banner.appendChild(badge);
    var text = el('div');
    text.appendChild(el('p', 'cmp-banner-title', c.noToolHeadline));
    text.appendChild(el('p', 'cmp-banner-detail', c.noToolDetail));
    banner.appendChild(text);
    box.appendChild(banner);

    var body = el('div', 'cmp-list-body');
    body.appendChild(el('h3', 'cmp-list-title', 'What ChemCalc does'));
    var ul = el('ul', 'cmp-list');
    c.rows.forEach(function (row) {
      var li = el('li', 'cmp-list-row');
      li.appendChild(el('span', 'cmp-list-feature', row.feature));
      li.appendChild(usCell(row.chemcalc));
      ul.appendChild(li);
    });
    body.appendChild(ul);
    box.appendChild(body);
    return box;
  }

  function chart(c) {
    return c.kind === 'contested' ? tableChart(c) : listChart(c);
  }

  /* ---------- compare.html ---------- */
  function renderIndexPage() {
    var jump = document.getElementById('cmpJump');
    var sections = document.getElementById('cmpSections');
    var trust = document.getElementById('cmpTrust');
    if (!jump && !sections && !trust) return;

    var uncontested = COMPARISONS.filter(function (c) { return c.kind === 'uncontested'; }).length;
    var total = COMPARISONS.length;
    setText('[data-cmp-count]', String(uncontested));
    setText('[data-cmp-total]', 'of ' + total);
    setText('[data-cmp-rest]', 'The other ' + (total - uncontested) + ' face one generic tool each.');
    setText('[data-cmp-checked]', 'Last checked ' + LAST_CHECKED);

    if (jump) {
      COMPARISONS.forEach(function (c) {
        var a = el('a', 'mp-card mp-card--stack mp-card--link cmp-jump');
        a.href = '#' + c.slug;
        a.appendChild(el('span', 'cmp-jump-name', c.shortName));
        a.appendChild(el('span', 'cmp-badge' + (c.kind === 'uncontested' ? ' cmp-badge--solo' : ''), c.verdictLabel));
        var go = el('span', 'cmp-jump-go', 'View chart');
        go.appendChild(icon('arrowDown', 'cmp-jump-arrow'));
        a.appendChild(go);
        var li = el('li');
        li.appendChild(a);
        jump.appendChild(li);
      });
    }

    if (sections) {
      COMPARISONS.forEach(function (c) {
        var s = el('section', 'cmp-section');
        s.id = c.slug;
        s.setAttribute('aria-labelledby', c.slug + '-heading');
        var head = el('div', 'cmp-section-head');
        var left = el('div', 'cmp-section-text');
        var h2 = el('h2', 'cmp-section-title', c.name);
        h2.id = c.slug + '-heading';
        left.appendChild(h2);
        left.appendChild(el('p', 'cmp-section-intro', c.intro));
        head.appendChild(left);
        var open = el('a', 'cmp-open-link', 'Open the calculator');
        open.href = c.href;
        open.appendChild(icon('arrowRight', 'cmp-open-arrow'));
        head.appendChild(open);
        s.appendChild(head);
        var holder = el('div', 'cmp-chart');
        holder.appendChild(chart(c));
        s.appendChild(holder);
        if (c.brand) {
          var note = el('div', 'cmp-note-row');
          note.appendChild(brandNote(c.brand));
          s.appendChild(note);
        }
        sections.appendChild(s);
      });
    }

    if (trust) {
      TRUST.forEach(function (t) {
        var li = el('li', 'cmp-trust-row');
        li.appendChild(el('span', 'cmp-trust-calc', t.calculator));
        var body = el('span', 'cmp-trust-body');
        body.appendChild(el('span', 'cmp-trust-claim', t.claim));
        body.appendChild(el('span', 'cmp-trust-detail', t.detail));
        li.appendChild(body);
        trust.appendChild(li);
      });
    }

    // The sections did not exist when the browser first tried to follow a #mekp style link.
    if (location.hash.length > 1) {
      var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView();
    }
  }

  function setText(selector, text) {
    var node = document.querySelector(selector);
    if (node) node.textContent = text;
  }

  /* ---------- the per-calculator dialog ---------- */
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var modal = null;       // { root, dialog, closeBtn, trigger, prevOverflow }

  function openModal(slug, trigger) {
    var c = find(slug);
    if (!c || modal) return;

    var root = el('div', 'cmp-modal');
    var scrim = el('div', 'cmp-modal-scrim');
    scrim.addEventListener('click', closeModal);
    root.appendChild(scrim);

    var dialog = el('div', 'cmp-modal-dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'cmpModalTitle');
    dialog.tabIndex = -1;

    var head = el('div', 'cmp-modal-head');
    var headText = el('div', 'cmp-modal-head-text');
    var kicker = el('p', 'cmp-modal-kicker', 'How we compare');
    kicker.appendChild(el('span', null, ' · Last checked ' + LAST_CHECKED));
    headText.appendChild(kicker);
    var title = el('h2', 'cmp-modal-title', c.name);
    title.id = 'cmpModalTitle';
    headText.appendChild(title);
    headText.appendChild(el('p', 'cmp-modal-intro', c.intro));
    head.appendChild(headText);
    var closeBtn = el('button', 'cmp-modal-close');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.appendChild(icon('close'));
    closeBtn.addEventListener('click', closeModal);
    head.appendChild(closeBtn);
    dialog.appendChild(head);

    var body = el('div', 'cmp-modal-body');
    body.appendChild(chart(c));
    var foot = el('div', 'cmp-modal-foot');
    if (c.brand) foot.appendChild(brandNote(c.brand)); else foot.appendChild(el('span'));
    var all = el('a', 'cmp-open-link', 'See all comparisons');
    all.href = 'compare.html';
    all.appendChild(icon('arrowRight', 'cmp-open-arrow'));
    foot.appendChild(all);
    body.appendChild(foot);
    dialog.appendChild(body);
    root.appendChild(dialog);

    modal = { root: root, dialog: dialog, closeBtn: closeBtn, trigger: trigger || document.activeElement, prevOverflow: document.body.style.overflow };
    document.body.style.overflow = 'hidden';
    document.body.appendChild(root);
    document.addEventListener('keydown', onKeydown, true);
    document.addEventListener('focusin', onFocusin, true);
    closeBtn.focus();
    // next frame, so the opening transition runs
    window.requestAnimationFrame(function () { if (modal) modal.root.classList.add('is-open'); });
  }

  function closeModal() {
    if (!modal) return;
    var m = modal;
    modal = null;
    document.removeEventListener('keydown', onKeydown, true);
    document.removeEventListener('focusin', onFocusin, true);
    document.body.style.overflow = m.prevOverflow;
    if (m.root.parentNode) m.root.parentNode.removeChild(m.root);
    if (m.trigger && typeof m.trigger.focus === 'function') m.trigger.focus();
  }

  function onKeydown(e) {
    if (!modal) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
      return;
    }
    if (e.key !== 'Tab') return;
    var items = Array.prototype.filter.call(modal.dialog.querySelectorAll(FOCUSABLE), function (n) { return n.offsetParent !== null; });
    if (!items.length) { e.preventDefault(); modal.dialog.focus(); return; }
    var first = items[0];
    var last = items[items.length - 1];
    var active = document.activeElement;
    if (e.shiftKey && (active === first || !modal.dialog.contains(active))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (active === last || !modal.dialog.contains(active))) { e.preventDefault(); first.focus(); }
  }

  // Catches focus that gets out by other routes (a click on the floating help/chat buttons, a screen reader cursor).
  function onFocusin(e) {
    if (modal && !modal.dialog.contains(e.target)) modal.closeBtn.focus();
  }

  function bindTriggers() {
    var buttons = document.querySelectorAll('[data-compare-open]');
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener('click', function () { openModal(btn.getAttribute('data-compare-open'), btn); });
    });
  }

  function init() {
    renderIndexPage();
    bindTriggers();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // For tests and debugging.
  window.ChemCalcCompare = { comparisons: COMPARISONS, trust: TRUST, lastChecked: LAST_CHECKED, open: openModal, close: closeModal };
}());
