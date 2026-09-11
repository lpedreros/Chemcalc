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
//      status pill, and on/off-recommendation color coding on the
//      catalyst numbers themselves — all parsed from the real
//      #mekpRecommended / #mekpPercentage / #mekpCcs / #mekpDrops
//      strings calculateMEKP() already writes (same extraction approach
//      as mekpcalc-print-summary.js).
//   4. Slider fill gradient — a CSS custom property set from the
//      slider's own value/min/max.
//   5. Duratec-locked message — shown only while the checkbox is
//      checked.
//   6. Slider auto-sync — snaps #customPercentage to the recommended %
//      whenever ambientTemp/tempUnit changes (skipped while Duratec is
//      checked), overriding any value the user had set manually.
//   7. Default pre-fill — 32oz / 72°F on load, fed through the exact
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

  // Mirrors clothcalc.js's celsiusToFahrenheit/fahrenheitToCelsius exactly
  // (same formulas, same .toFixed(1) rounding) -- used below to keep
  // #ambientTemp's number correct whenever either toggle changes which
  // unit it's interpreted in. mekpcalc-ui.js has no other reason to share
  // code with clothcalc.js, so this is a small parallel copy, not an
  // import.
  function celsiusToFahrenheit(celsius) {
    return (celsius * 9 / 5) + 32;
  }
  function fahrenheitToCelsius(fahrenheit) {
    return (fahrenheit - 32) * 5 / 9;
  }

  // ---------- 1. Temperature-unit toggle ----------
  function initTempUnitToggle() {
    var hidden = document.getElementById('tempUnit');
    var buttons = Array.prototype.slice.call(
      document.querySelectorAll('.mp-unit-btn[data-unit]')
    );
    if (!hidden || !buttons.length) return;

    function setUnit(unit) {
      // Fix: this toggle used to only relabel the unit, never convert the
      // number already in #ambientTemp -- e.g. "20" typed as °C, then
      // clicking °F left the field showing "20" (now misread as 20°F)
      // instead of updating it to 68. Convert BEFORE the hidden value/
      // change event fire, so calculateMEKP() sees the new unit and the
      // already-converted number together in one pass.
      if (unit !== hidden.value) {
        var tempInput = document.getElementById('ambientTemp');
        var currentTempValue = tempInput ? parseFloat(tempInput.value) : NaN;
        if (tempInput && !isNaN(currentTempValue)) {
          tempInput.value = (unit === 'fahrenheit')
            ? celsiusToFahrenheit(currentTempValue).toFixed(1)
            : fahrenheitToCelsius(currentTempValue).toFixed(1);
        }
      }

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
      document.querySelectorAll('.mp-unit-btn[data-system]')
    );
    if (!hidden || !buttons.length) return;

    function setSystem(system) {
      // Keep the temperature-unit toggle paired with the measurement
      // system (imperial<->fahrenheit, metric<->celsius), same fix as
      // setUnit() above. Update the temp toggle's hidden value + button
      // states directly, WITHOUT dispatching its own "change" event --
      // that would run calculateMEKP() a second time (once here, once
      // via unitSystem's own change below), including a second
      // logCalculation() analytics call. One dispatch below, on
      // unitSystem, reads the fully-updated, consistent state (new
      // system + new temp unit + converted number) in a single pass.
      var pairedUnit = (system === 'metric') ? 'celsius' : 'fahrenheit';
      var tempUnitHidden = document.getElementById('tempUnit');
      if (tempUnitHidden && tempUnitHidden.value !== pairedUnit) {
        var tempInput = document.getElementById('ambientTemp');
        var currentTempValue = tempInput ? parseFloat(tempInput.value) : NaN;
        if (tempInput && !isNaN(currentTempValue)) {
          tempInput.value = (pairedUnit === 'fahrenheit')
            ? celsiusToFahrenheit(currentTempValue).toFixed(1)
            : fahrenheitToCelsius(currentTempValue).toFixed(1);
        }
        tempUnitHidden.value = pairedUnit;
        var tempButtons = document.querySelectorAll('.mp-unit-btn[data-unit]');
        tempButtons.forEach(function (btn) {
          var active = btn.getAttribute('data-unit') === pairedUnit;
          btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
      }

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
  // Breakpoints are the LIVE SITE's own (60 / 65 / 75 / 85°F), not MP's
  // fabricated ones (60/70/80/90 in useMekpCalculator.ts) — frozen math,
  // never ported. Input is converted to °F first when the toggle is set
  // to Celsius.
  function computeAdvisory(rawTemp, unit) {
    if (rawTemp === '' || rawTemp === null || isNaN(rawTemp)) return null;
    var f = unit === 'celsius' ? (rawTemp * 9) / 5 + 32 : rawTemp;
    if (f < 60) return { band: 'cold', text: 'Cold shop — expect a slow, extended cure.' };
    if (f < 65) return { band: 'cool', text: 'Cool conditions — comfortable working time.' };
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
  // On/off-recommendation coloring targets: the status pill (text +
  // class) plus the numeric values themselves (class only). Both read
  // off ONE comparison below -- not duplicated per target.
  var COLOR_CODED_IDS = ['mekpHeroValue', 'mekpHeroDrops', 'mekpCompareUsed'];

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

    var recommendedNum = parseFloat(recommendedTail);
    var isDuratec = !!(duratecChk && duratecChk.checked);
    var isOn = !isDuratec && !isNaN(recommendedNum) && usedPct !== null && Math.abs(recommendedNum - usedPct) < 0.05;
    var isOff = !isDuratec && !isOn;

    // Duratec-locked keeps its own neutral/locked treatment on these
    // values -- neither class gets added in that state.
    COLOR_CODED_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('is-on', 'is-off');
      if (isOn) el.classList.add('is-on');
      else if (isOff) el.classList.add('is-off');
    });

    if (!pill) return;
    pill.classList.remove('is-on', 'is-off', 'is-locked');

    if (isDuratec) {
      pill.textContent = 'Duratec locked';
      pill.classList.add('is-locked');
    } else if (isOn) {
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

  // ---------- 6. Slider auto-sync to recommended % ----------
  // On every ambientTemp/tempUnit change, snap the custom-percentage
  // slider to the freshly-computed recommended value -- reusing the same
  // #mekpRecommended parsing updateResultsPanel() already does for the
  // status pill (afterLastColon + parseFloat), so there's one source of
  // truth for "what did calculateMEKP() recommend." Skipped while
  // Duratec is checked (that already locks/disables the slider).
  // Confirmed with Leo: this always overrides a value the user set
  // manually on the slider -- simplest behavior. The user can still
  // nudge the slider again afterward; it just won't fight them unless
  // temperature changes again.
  function syncSliderToRecommended() {
    var duratecChk = document.getElementById('usingDuratec');
    if (duratecChk && duratecChk.checked) return;

    var slider = document.getElementById('customPercentage');
    if (!slider) return;

    var recommendedTail = afterLastColon(textOf('mekpRecommended'), null);
    var recommendedNum = recommendedTail ? parseFloat(recommendedTail) : NaN;
    if (isNaN(recommendedNum)) return;

    slider.value = recommendedNum;
    // Same events applyDefaults() already uses -- this is what runs
    // calculateMEKP() (via mekscript.js's own listener on this element);
    // it is never called directly from here.
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ---------- 7. Default pre-fill on load ----------
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

    // Slider auto-sync: only on temperature-driving inputs, never on
    // customPercentage/resinVolume/etc. -- otherwise dragging the slider
    // would immediately get overridden back to the recommended value.
    ['ambientTemp', 'tempUnit'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', syncSliderToRecommended);
      el.addEventListener('change', syncSliderToRecommended);
    });

    applyDefaults();
    renderAll();
  });
})();
