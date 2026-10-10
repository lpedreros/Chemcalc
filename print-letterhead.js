// print-letterhead.js
// Shared print-letterhead renderer for all 5 ChemCalc calculators.
// Pure render only — no math, no calculator-specific DOM reads. Each
// calculator's own calc()-equivalent function builds a config object
// from values it already computed and calls render(config) once, at
// the end of its run. Replaces MEKP/ClothCalc/Awlgrip's old separate
// -print-summary.js files and their own hardcoded input-listener
// lists — the letterhead now rides on the same function that already
// owns correctness, so it can't drift out of sync with a new input.
(function () {
  'use strict';

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // compareColsOverride lets the "compare" grid's column count match
  // the number of items actually being shown, instead of a single
  // fixed value. Verified against real content before this file was
  // written: MEKP always has 2 compare items, ClothCalc always has 3,
  // and Awlgrip/Alexseal switch between 2 and 3 depending on whether
  // their accelerator row is shown -- a single hardcoded column count
  // (the original per-page CSS blocks used 2 for MEKP/Awlgrip and 3
  // for ClothCalc, not "byte-identical" as assumed) would have wrongly
  // flattened ClothCalc's letterhead to 2 columns and left Awlgrip/
  // Alexseal's 3-item accelerator case squeezed into 2. Capped to
  // {2,3} since those are the only counts any real page produces
  // today; anything else falls back to 2.
  function dl(items, modifierClass, compareColsOverride) {
    var list = el('dl', 'print-lh-' + modifierClass);
    var visibleCount = 0;
    (items || []).forEach(function (item) {
      if (item.hidden) return;
      visibleCount++;
      var row = document.createElement('div');
      row.appendChild(el('dt', null, item.label));
      row.appendChild(el('dd', null, item.value || '—'));
      list.appendChild(row);
    });
    if (compareColsOverride) {
      var cols = (visibleCount === 3) ? 3 : 2;
      list.setAttribute('data-cols', String(cols));
    }
    return list;
  }

  function render(config) {
    var host = document.getElementById('printLetterhead');
    if (!host) return;
    host.innerHTML = '';

    // Head: brand + doc title/meta (identical on every page)
    var head = el('div', 'print-lh-head');
    var brand = el('div', 'print-lh-brand');
    var mark = el('span', 'print-lh-mark');
    var markImg = document.createElement('img');
    markImg.src = 'images/Think-and-Engage-Logo1c-Black-Seal.png';
    markImg.alt = '';
    mark.appendChild(markImg);
    brand.appendChild(mark);
    var brandText = document.createElement('span');
    brandText.appendChild(el('span', 'print-lh-name', 'ChemCalc'));
    brandText.appendChild(el('span', 'print-lh-tagline', 'A Think & Engage Brand'));
    brand.appendChild(brandText);
    head.appendChild(brand);

    var doc = el('div', 'print-lh-doc');
    doc.appendChild(el('p', 'print-lh-doc-title', config.docTitle));
    var generatedOn = (config.generatedOn || new Date()).toLocaleDateString(
      'en-US', { year: 'numeric', month: 'long', day: 'numeric' }
    );
    doc.appendChild(el('p', 'print-lh-doc-meta', 'Generated ' + generatedOn + ' · chemcalc.co/' + config.pageSlug));
    head.appendChild(doc);
    host.appendChild(head);

    host.appendChild(dl(config.recap, 'recap'));

    var primary = el('div', 'print-lh-primary');
    primary.appendChild(el('p', 'print-lh-primary-label', config.primary.label));
    var valueP = document.createElement('p');
    valueP.className = 'print-lh-primary-value';
    valueP.appendChild(document.createTextNode(config.primary.value || '—'));
    if (config.primary.unit) valueP.appendChild(el('span', 'unit', config.primary.unit));
    primary.appendChild(valueP);
    if (config.primary.sub) primary.appendChild(el('p', 'print-lh-primary-sub', config.primary.sub));
    host.appendChild(primary);

    host.appendChild(dl(config.compare, 'compare', true));

    host.appendChild(el('p', 'print-lh-advisory', config.advisory || ''));

    var footer = el('div', 'print-lh-footer');
    footer.appendChild(el('p', 'print-lh-disclaimer', config.disclaimer));
    var qr = el('div', 'print-lh-qr');
    var qrDiv = document.createElement('div');
    qrDiv.id = 'printQrCode';
    qr.appendChild(qrDiv);
    qr.appendChild(el('span', null, 'Scan to reopen'));
    footer.appendChild(qr);
    host.appendChild(footer);
  }

  window.ChemCalcPrintLetterhead = { render: render };
})();
