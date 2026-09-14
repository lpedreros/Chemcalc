// clothcalc-print-summary.js
//
// Populates the print-only letterhead summary (#clothcalcPrintLetterhead),
// mirroring mekpcalc-print-summary.js's structure exactly for the
// Fiberglass Cloth Saturation Calculator.
//
// IMPORTANT: this file performs NO cloth/resin math of its own. It only
// mirrors/reformats values that already exist in the DOM:
//   - the real functional inputs (length, width, units, resin-type,
//     epoxy-mix-ratio, temperature, temp-unit-label) are read directly,
//     verbatim.
//   - the result lines (resin-volume, cloth-resin-ratio, resin-weight,
//     resin-weight-label, working-time, estimated-cost, and -- for
//     epoxy -- clothEmailHardener, or -- for polyester/vinylester --
//     mekp-percentage/mekp-ccs/mekp-drops) are the exact values
//     clothcalc.js's calculateResin() already wrote into the page. This
//     file only reads and recombines that already-computed text; it
//     never invents or recomputes a value. clothcalc.js and
//     calculateResin() are never called or modified from here.
//
// The QR code itself is untouched: clothcalc.js's existing printButton
// click handler still generates it into #printQrCode (now relocated
// into the letterhead footer) and still owns window.print().
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

  function selectedOptionText(select) {
    if (!select || select.selectedIndex < 0) return '';
    var opt = select.options[select.selectedIndex];
    return opt ? opt.text : '';
  }

  function syncPrintLetterhead() {
    var lengthInput = document.getElementById('length');
    var widthInput = document.getElementById('width');
    var unitsSelect = document.getElementById('units');
    var resinTypeSelect = document.getElementById('resin-type');
    var epoxyMixRatioSelect = document.getElementById('epoxy-mix-ratio');
    var temperatureInput = document.getElementById('temperature');
    var tempUnitLabel = document.getElementById('temp-unit-label');

    // --- Inputs recap: direct reads of the real controls, no parsing ---
    if (lengthInput && widthInput && unitsSelect) {
      var l = (lengthInput.value || '').trim();
      var w = (widthInput.value || '').trim();
      var unitText = selectedOptionText(unitsSelect);
      setText('clothPrintRecapDimensions', (l && w) ? (l + ' x ' + w + ' ' + unitText) : '—');
    }
    if (resinTypeSelect) {
      var resinText = selectedOptionText(resinTypeSelect);
      if (resinTypeSelect.value === 'epoxy' && epoxyMixRatioSelect) {
        var ratioText = selectedOptionText(epoxyMixRatioSelect);
        if (ratioText) resinText += ' (' + ratioText + ')';
      }
      setText('clothPrintRecapResin', resinText || '—');
    }
    if (temperatureInput) {
      var t = (temperatureInput.value || '').trim();
      // #temp-unit-label's own text already includes the degree symbol
      // (e.g. "°C") -- see clothcalc.html.
      var unit = tempUnitLabel ? tempUnitLabel.textContent : '';
      setText('clothPrintRecapTemp', t ? (t + unit) : '—');
    }

    // --- Results: mirror calculateResin()'s own output text, reformatted ---
    setText('clothPrintRecapVolume', textOf('resin-volume') || '—');
    setText('clothPrintRecapRatio', textOf('cloth-resin-ratio'));
    setText('clothPrintRecapWeightLabel', textOf('resin-weight-label') || 'Resin Weight');
    setText('clothPrintRecapWeight', textOf('resin-weight') || '—');
    setText('clothPrintRecapWorkingTime', textOf('working-time') || '—');
    setText('clothPrintRecapCost', textOf('estimated-cost') || '—');

    // Catalyst line: epoxy shows the Resin:Hardener recap (reusing the
    // exact sentence clothcalc.js already built for the email recap --
    // one source of truth); polyester/vinylester shows the MEKP recap.
    var resinType = resinTypeSelect ? resinTypeSelect.value : '';
    if (resinType === 'epoxy') {
      setText('clothPrintRecapCatalyst', textOf('clothEmailHardener'));
    } else {
      var pct = textOf('mekp-percentage');
      var ccs = textOf('mekp-ccs');
      var drops = textOf('mekp-drops');
      setText(
        'clothPrintRecapCatalyst',
        (pct || ccs || drops) ? ('MEKP Catalyst: ' + pct + ' • ' + ccs + ' • ' + drops) : ''
      );
    }

    setText(
      'clothPrintGeneratedOn',
      new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    );
  }

  document.addEventListener('DOMContentLoaded', function () {
    syncPrintLetterhead();

    // Keep the letterhead fresh as the user edits inputs. clothcalc.js's
    // own listeners on these same elements were registered first (its
    // <script> tag loads before this one), so calculateResin() has
    // always already updated the result elements by the time this runs.
    [
      'length', 'width', 'units', 'resin-type', 'epoxy-mix-ratio',
      'temperature', 'temp-unit-toggle', 'resin-cost', 'resin-cost-unit',
      'result-system', 'result-volume-unit'
    ].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', syncPrintLetterhead);
        el.addEventListener('change', syncPrintLetterhead);
      }
    });

    // Layer add/remove/material changes -- same delegated coverage
    // clothcalc.js's own setupEventListeners() uses, so a new or edited
    // layer is reflected here too.
    var addLayerBtn = document.getElementById('add-layer-btn');
    if (addLayerBtn) addLayerBtn.addEventListener('click', syncPrintLetterhead);
    var layersContainer = document.getElementById('layers-container');
    if (layersContainer) {
      layersContainer.addEventListener('click', syncPrintLetterhead);
      layersContainer.addEventListener('change', syncPrintLetterhead);
    }

    // Belt-and-suspenders: re-sync right when Print Results is clicked
    // (clothcalc.js's own listener on this same button still owns QR
    // generation + window.print()), and on the native beforeprint event
    // so Ctrl+P / the browser's print menu also gets a fresh letterhead.
    var printButton = document.getElementById('printButton');
    if (printButton) printButton.addEventListener('click', syncPrintLetterhead);
  });

  window.addEventListener('beforeprint', syncPrintLetterhead);
})();
