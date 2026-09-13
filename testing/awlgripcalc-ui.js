// awlgripcalc-ui.js
//
// Awlgrip Coatings Calculator -- .mp-* visual rebuild, page-scoped
// presentation logic only. Nothing here performs any Awlgrip math, and
// nothing here touches awlgripscript.js -- same division of
// responsibility as mekpcalc-ui.js on the MEKP page.
//
//   1. Measurement System toggle shim -- awlgripscript.js reads
//      document.getElementById('unitSystem').value ("imperial" |
//      "metric"). The visible control is a two-button toggle; the
//      hidden <select id="unitSystem"> keeps that exact element/value
//      contract so populateLists()/calc() run completely unmodified.
//   2. Coating Amount (input method) toggle shim -- same pattern, but
//      for the existing hidden input[name="inputMethod"] radio pair
//      ("areaVolume" | "lengthWidth") instead of a select.
//   3. Application Method toggle shim -- same pattern, for
//      document.getElementById('methodType').value ("spray" | "roll").
//      Also keeps the "Roll" button's disabled state in sync with the
//      real <option value="roll"> awlgripscript.js's own calc() already
//      disables for spray-only products (and re-syncs after calc() has
//      run, since calc() can flip methodType back to "spray" on its own
//      without dispatching a change event).
//   4. Reducer-percentage slider fill gradient -- a CSS custom property
//      set from the slider's own value/min/max, same technique as
//      mekpcalc-ui.js's customPercentage slider.
//
// Loads after awlgripscript.js (see awlgrip.html) so this file's
// DOMContentLoaded handler always registers -- and therefore always
// fires, and its listeners attach after awlgripscript.js's own -- after
// awlgripscript.js's.
(function () {
  'use strict';

  // ---------- 1. Measurement System toggle ----------
  function initUnitSystemToggle() {
    var hidden = document.getElementById('unitSystem');
    var buttons = Array.prototype.slice.call(
      document.querySelectorAll('.mp-unit-btn[data-system]')
    );
    if (!hidden || !buttons.length) return;

    function setSystem(system) {
      hidden.value = system;
      buttons.forEach(function (btn) {
        var active = btn.getAttribute('data-system') === system;
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      // awlgripscript.js's own "change" listener on this exact element
      // re-runs populateLists()/calc().
      hidden.dispatchEvent(new Event('change', { bubbles: true }));
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.getAttribute('aria-pressed') === 'true') return;
        setSystem(btn.getAttribute('data-system'));
      });
    });
  }

  // ---------- 2. Coating Amount (input method) toggle ----------
  function initInputMethodToggle() {
    var buttons = Array.prototype.slice.call(
      document.querySelectorAll('.mp-unit-btn[data-input]')
    );
    if (!buttons.length) return;

    function setMethod(methodValue) {
      var radio = document.querySelector(
        'input[name="inputMethod"][value="' + methodValue + '"]'
      );
      if (!radio) return;
      radio.checked = true;
      buttons.forEach(function (btn) {
        var active = btn.getAttribute('data-input') === methodValue;
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      // awlgripscript.js's own "change" listener on each inputMethod
      // radio re-runs toggleInputMethod()/calc().
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.getAttribute('aria-pressed') === 'true') return;
        setMethod(btn.getAttribute('data-input'));
      });
    });
  }

  // ---------- 3. Application Method toggle ----------
  // awlgripscript.js's calc() disables the real <option value="roll">
  // for spray-only products and can reset methodType.value to "spray"
  // directly (no change event) as a side effect of a Product Line
  // change. syncAppMethodButtons() re-reads the hidden select after
  // every relevant change so this toggle never fights that reset.
  function syncAppMethodButtons() {
    var hidden = document.getElementById('methodType');
    var buttons = Array.prototype.slice.call(
      document.querySelectorAll('.mp-unit-btn[data-appmethod]')
    );
    if (!hidden || !buttons.length) return;

    var rollOption = hidden.querySelector('option[value="roll"]');
    var rollDisabled = !!(rollOption && rollOption.disabled);

    buttons.forEach(function (btn) {
      var value = btn.getAttribute('data-appmethod');
      btn.setAttribute('aria-pressed', value === hidden.value ? 'true' : 'false');
      if (value === 'roll') btn.disabled = rollDisabled;
    });
  }

  function initAppMethodToggle() {
    var hidden = document.getElementById('methodType');
    var paintSelect = document.getElementById('paintType');
    var buttons = Array.prototype.slice.call(
      document.querySelectorAll('.mp-unit-btn[data-appmethod]')
    );
    if (!hidden || !buttons.length) return;

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var value = btn.getAttribute('data-appmethod');
        if (btn.disabled || hidden.value === value) return;
        hidden.value = value;
        syncAppMethodButtons();
        // awlgripscript.js's own "change" listener on this exact
        // element re-runs calc().
        hidden.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });

    // Re-sync after calc() may have changed methodType's value/disabled
    // state on its own (Product Line change -> spray-only reset).
    // Attached after awlgripscript.js's own "change" listeners on these
    // same elements, so calc() has already run by the time this fires.
    hidden.addEventListener('change', syncAppMethodButtons);
    if (paintSelect) paintSelect.addEventListener('change', syncAppMethodButtons);
  }

  // ---------- 4. Reducer-percentage slider fill gradient ----------
  function updateReducerSliderGradient() {
    var slider = document.getElementById('reducerPercent');
    if (!slider) return;
    var min = parseFloat(slider.min) || 0;
    var max = parseFloat(slider.max) || 100;
    var val = parseFloat(slider.value);
    if (isNaN(val)) val = min;
    var pct = ((val - min) / (max - min)) * 100;
    slider.style.setProperty('--slider-fill', pct + '%');
  }

  document.addEventListener('DOMContentLoaded', function () {
    initUnitSystemToggle();
    initInputMethodToggle();
    initAppMethodToggle();
    syncAppMethodButtons();

    var reducerSlider = document.getElementById('reducerPercent');
    if (reducerSlider) {
      reducerSlider.addEventListener('input', updateReducerSliderGradient);
      updateReducerSliderGradient();
    }
  });
})();
