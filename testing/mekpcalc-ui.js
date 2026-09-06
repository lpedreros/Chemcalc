// mekpcalc-ui.js
//
// MEKP Calculator — Phase 1 re-platform (ChemCalc_FullSite_Blueprint.md).
// Page-scoped presentation logic plus one small compatibility shim, all
// built strictly on top of calculateMEKP()'s existing output. Nothing
// here performs MEKP math, and nothing here touches mekscript.js.
//
// Replaces mekpcalc-enhance.js (orphaned — flagged for deletion). Same
// behavior, re-platformed onto Phase 0's sitewide --chrome-* tokens
// instead of that file's page-scoped --mekp-* duplicate (see
// mekpcalc.css) — the temperature bands and on-target threshold below
// are the real site's own (unchanged), not MP's fabricated ones.
//
//   1. Temperature-unit toggle shim — mekscript.js reads
//      document.getElementById('tempUnit').value to know the current
//      unit ("fahrenheit" | "celsius"). The visible control is a
//      two-button toggle; a hidden <input id="tempUnit"> keeps that
//      exact element/value contract so calculateMEKP() runs completely
//      unmodified.
//   1b. Measurement-system toggle shim — same pattern, for
//      document.getElementById('unitSystem').value ("imperial" |
//      "metric"). Site owner's explicit instruction; the approved
//      mockup itself still uses a <select> here.
//   2. Ambient-temperature advisory — reads the temp field + unit,
//      renders one of five fixed messages. Presentation only.
//   3. Results panel — hero cc value, drops sub-line, comparison grid,
//      status pill — all parsed from the real #mekpRecommended /
//      #mekpPercentage / #mekpCcs / #mekpDrops strings calculateMEKP()
//      already writes (same extraction approach as
//      mekpcalc-print-summary.js).
//   4. Slider fill gradient — a CSS custom property set from the
//      slider's own value/min/max.
//   5. Duratec-locked message — shown only while the checkbox is
//      checked.
//   6. Default pre-fill — 32oz / 72°F on load, fed through the exact
//      same input/change events a real user typing would fire, so
//      calculateMEKP() is never called directly from here.
//
// Loads after mekscript.js (see mekpcalc.html) so this file's
// DOMContentLoaded handler always registers — and therefore always
// fires — after mekscript.js's. Every read below happens after
// calculateMEKP() has already run for that same event.
(function () {
  'use strict';

  function textOf(id) {
    var el = document.getElementById(id);
    return el ? el.textContent.trim() : '';
  }
  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }
  function afterLastColon(str, fallback) {
    if (!str) return fallback;
    var idx = str.lastIndexOf(':');
    if (idx === -1) return fallback;
    var tail = str.slice(idx + 1).trim();
    return tail || fallback;
  }
  function extract(str, pattern, fallback) {
    var m = str && str.match(pattern);
    return m ? m[1] : fallback;
  }

  // ---------- 1. Temperature-unit toggle ----------
  function initTempUnitToggle() {
    var hidden = document.getElementById('tempUnit');
    var buttons = Array.prototype.slice.call(
      document.querySelectorAll('.mekp-unit-btn[data-unit]')
    );
    if (!hidden || !buttons.length) return;

    function setUnit(unit) {
      hidden.value = unit;
      buttons.forEach(function (btn) {
        var active = btn.getAttribute('data-unit') === unit;
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      // mekscript.js's own "change" listener on this exact element
      // (registered via its inputsToWatch loop) re-runs calculateMEKP().
      hidden.dispatchEvent(new Event('change', { bubbles: true }));
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.getAttribute('aria-pressed') === 'true') return;
        setUnit(btn.getAttribute('data-unit'));
      });
    });
  }

  // ---------- 1b. Measurement-system toggle ----------
  // Same safe pattern as the temperature-unit toggle above: mekscript.js
  // reads document.getElementById('unitSystem').value ("imperial" |
  // "metric") to drive updateVolumeUnits()/calculateMEKP(). The visible
  // control is a two-button toggle; the hidden <select id="unitSystem">
  // keeps that exact element/value contract so both functions run
  // completely unmodified.
  function initUnitSystemToggle() {
    var hidden = document.getElementById('unitSystem');
    var buttons = Array.prototype.slice.call(
      document.querySelectorAll('.mekp-unit-btn[data-system]')
    );
    if (!hidden || !buttons.length) return;

    function setSystem(system) {
      hidden.value = system;
      buttons.forEach(function (btn) {
        var active = btn.getAttribute('data-system') === system;
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      // mekscript.js's own "change" listener on this exact element
      // re-runs updateVolumeUnits() (which itself calls calculateMEKP()).
      hidden.dispatchEvent(new Event('change', { bubbles: true }));
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.getAttribute('aria-pressed') === 'true') return;
        setSystem(btn.getAttribute('data-system'));
      });
    });
  }

  // ---------- 2. Ambient-temperature advisory ----------
  // Breakpoints are the LIVE SITE's own (60 / 65.6 / 75 / 85°F), not MP's
  // fabricated ones (60/70/80/90 in useMekpCalculator.ts) — frozen math,
  // never ported. Input is converted to °F first when the toggle is set
  // to Celsius.
  function computeAdvisory(rawTemp, unit) {
    if (rawTemp === '' || rawTemp === null || isNaN(rawTemp)) return null;
    var f = unit === 'celsius' ? (rawTemp * 9) / 5 + 32 : rawTemp;
    if (f < 60) return { band: 'cold', text: 'Cold shop — expect a slow, extended cure.' };
    if (f < 65.6) return { band: 'cool', text: 'Cool conditions — comfortable working time.' };
    if (f < 75) return { band: 'ideal', text: 'Ideal range — standard gel time.' };
    if (f < 85) return { band: 'warm', text: 'Warm shop — gel time shortens noticeably.' };
    return { band: 'hot', text: 'Hot conditions — mix small batches, work fast.' };
  }

  function updateTempAdvisory() {
    var tempInput = document.getElementById('ambientTemp');
    var tempUnitEl = document.getElementById('tempUnit');
    var adviceEl = document.getElementById('tempAdvice');
    if (!tempInput || !tempUnitEl || !adviceEl) return;

    var raw = tempInput.value === '' ? NaN : parseFloat(tempInput.value);
    var advisory = computeAdvisory(raw, tempUnitEl.value);

    if (advisory) {
      adviceEl.textContent = advisory.text;
      adviceEl.setAttribute('data-band', advisory.band);
      adviceEl.style.display = 'block';
    } else {
      adviceEl.textContent = '';
      adviceEl.removeAttribute('data-band');
      adviceEl.style.display = 'none';
    }
  }

  // ---------- 3. Results panel ----------
  function updateResultsPanel() {
    var ccsText = textOf('mekpCcs');
    var dropsText = textOf('mekpDrops');
    var recommendedText = textOf('mekpRecommended');
    var usedText = textOf('mekpPercentage');

    var ccValue = extract(ccsText, /:\s*([\d.]+)\s*cc/i, null);
    var dropsValue = extract(dropsText, /:\s*([\d.]+)\s*drops/i, null);
    var recommendedTail = afterLastColon(recommendedText, '—');
    var usedMatch = usedText.match(/Using\s+([\d.]+)%/i);
    var usedPct = usedMatch ? parseFloat(usedMatch[1]) : null;

    setText('mekpHeroValue', ccValue !== null ? ccValue : '—');
    setText('mekpHeroDrops', dropsValue !== null ? dropsValue : '—');
    setText('mekpCompareRecommended', recommendedTail || '—');
    setText('mekpCompareUsed', usedPct !== null ? usedPct.toFixed(2) + '%' : '—');

    var pill = document.getElementById('mekpStatusPill');
    var duratecChk = document.getElementById('usingDuratec');
    if (!pill) return;

    pill.classList.remove('is-on', 'is-off', 'is-locked');

    if (duratecChk && duratecChk.checked) {
      pill.textContent = 'Duratec locked';
      pill.classList.add('is-locked');
      return;
    }

    var recommendedNum = parseFloat(recommendedTail);
    if (!isNaN(recommendedNum) && usedPct !== null && Math.abs(recommendedNum - usedPct) < 0.05) {
      pill.textContent = 'On recommendation';
      pill.classList.add('is-on');
    } else {
      pill.textContent = 'Off recommendation';
      pill.classList.add('is-off');
    }
  }

  // ---------- 4. Slider fill gradient ----------
  function updateSliderGradient() {
    var slider = document.getElementById('customPercentage');
    if (!slider) return;
    var min = parseFloat(slider.min) || 0;
    var max = parseFloat(slider.max) || 100;
    var val = parseFloat(slider.value);
    if (isNaN(val)) val = min;
    var pct = ((val - min) / (max - min)) * 100;
    slider.style.setProperty('--slider-fill', pct + '%');
  }

  // ---------- 5. Duratec-locked message ----------
  function updateDuratecLockedMessage() {
    var chk = document.getElementById('usingDuratec');
    var msg = document.getElementById('duratecHelp');
    if (!chk || !msg) return;
    msg.style.display = chk.checked ? 'flex' : 'none';
  }

  function renderAll() {
    updateTempAdvisory();
    updateResultsPanel();
    updateSliderGradient();
    updateDuratecLockedMessage();
  }

  // ---------- 6. Default pre-fill on load ----------
  function applyDefaults() {
    var resinVolumeInput = document.getElementById('resinVolume');
    var ambientTempInput = document.getElementById('ambientTemp');

    var changed = false;
    if (resinVolumeInput && resinVolumeInput.value === '') {
      resinVolumeInput.value = '32';
      changed = true;
    }
    if (ambientTempInput && ambientTempInput.value === '') {
      ambientTempInput.value = '72';
      changed = true;
    }
    if (!changed) return;

    // Same events a real user typing + tabbing away would fire — this is
    // what runs calculateMEKP(); it is never called directly from here.
    [resinVolumeInput, ambientTempInput].forEach(function (el) {
      if (!el) return;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initTempUnitToggle();
    initUnitSystemToggle();

    // Re-render after every input mekscript.js's own calculateMEKP()
    // listens on. Attached here — after mekscript.js's own listeners on
    // these same elements — so this always runs after that calculation.
    [
      'unitSystem',
      'resinVolume',
      'volumeUnit',
      'ambientTemp',
      'tempUnit',
      'usingDuratec',
      'customPercentage'
    ].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', renderAll);
      el.addEventListener('change', renderAll);
    });

    applyDefaults();
    renderAll();
  });
})();
