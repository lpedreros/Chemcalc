// awlgrip-print-summary.js
//
// Populates the print-only letterhead summary (#awlgripPrintLetterhead),
// mirroring mekpcalc-print-summary.js's structure exactly for the
// Awlgrip Coatings Calculator.
//
// IMPORTANT: this file performs NO Awlgrip math of its own. It only
// mirrors/reformats values that already exist in the DOM:
//   - the real functional inputs (paintType, methodType, the
//     inputMethod radio pair, inputValue, unitType, calculatedAreaDisplay)
//     are read directly, verbatim.
//   - the result lines (resultPaintLabel/resultPaint,
//     resultConverterLabel/resultConverter, resultReducerLabel/
//     resultReducer, resultAcceleratorBox/resultAccelerator,
//     resultCoverage) are the exact values awlgripscript.js's calc()
//     already wrote into the page -- including Part F's manufacturer
//     part-number labels. This file only reads and recombines that
//     already-computed text; it never invents or recomputes a value.
//     awlgripscript.js and calc() are never called or modified from
//     here.
//
// The QR code itself is untouched: awlgripscript.js's existing
// printButton click handler still generates it into #printQrCode (now
// relocated into the letterhead footer) and still owns window.print().
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
    var paintSelect = document.getElementById('paintType');
    var methodSelect = document.getElementById('methodType');
    var inputMethodRadio = document.querySelector('input[name="inputMethod"]:checked');
    var inputValueEl = document.getElementById('inputValue');
    var unitTypeSelect = document.getElementById('unitType');
    var calculatedAreaDisplay = document.getElementById('calculatedAreaDisplay');

    // --- Inputs recap: direct reads of the real controls, no parsing ---
    setText('awlgripPrintRecapProduct', selectedOptionText(paintSelect) || '—');
    setText('awlgripPrintRecapMethod', selectedOptionText(methodSelect) || '—');

    if (inputMethodRadio && inputMethodRadio.value === 'lengthWidth') {
      setText('awlgripPrintRecapAmount', calculatedAreaDisplay ? calculatedAreaDisplay.textContent.trim() : '—');
    } else {
      var v = inputValueEl ? (inputValueEl.value || '').trim() : '';
      var u = selectedOptionText(unitTypeSelect);
      setText('awlgripPrintRecapAmount', v ? (v + ' ' + u) : '—');
    }

    // --- Results: mirror calc()'s own output text, reformatted ---
    setText('awlgripPrintRecapBaseLabel', textOf('resultPaintLabel') || 'Paint Base');
    setText('awlgripPrintRecapBase', textOf('resultPaint') || '—');
    setText('awlgripPrintRecapConverterLabel', textOf('resultConverterLabel') || 'Converter / Catalyst');
    setText('awlgripPrintRecapConverter', textOf('resultConverter') || '—');
    setText('awlgripPrintRecapReducerLabel', textOf('resultReducerLabel') || 'Reducer');
    setText('awlgripPrintRecapReducer', textOf('resultReducer') || '—');

    var accelBox = document.getElementById('resultAcceleratorBox');
    var accelRow = document.getElementById('awlgripPrintRecapAcceleratorRow');
    var accelShown = !!(accelBox && accelBox.style.display !== 'none');
    if (accelRow) accelRow.style.display = accelShown ? '' : 'none';
    if (accelShown) setText('awlgripPrintRecapAccelerator', textOf('resultAccelerator') || '—');

    setText('awlgripPrintRecapCoverage', textOf('resultCoverage'));

    setText(
      'awlgripPrintGeneratedOn',
      new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    );
  }

  document.addEventListener('DOMContentLoaded', function () {
    syncPrintLetterhead();

    // Keep the letterhead fresh as the user edits inputs. awlgripscript.js's
    // own listeners on these same elements were registered first (its
    // <script> tag loads before this one), so calc() has always already
    // updated the result elements by the time this runs.
    [
      'unitSystem', 'inputValue', 'unitType', 'length', 'width',
      'dimensionUnit', 'resultUnit', 'methodType', 'paintType',
      'reducerPercent'
    ].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', syncPrintLetterhead);
        el.addEventListener('change', syncPrintLetterhead);
      }
    });
    document.querySelectorAll('input[name="inputMethod"]').forEach(function (radio) {
      radio.addEventListener('change', syncPrintLetterhead);
    });

    // Belt-and-suspenders: re-sync right when Print Results is clicked
    // (awlgripscript.js's own listener on this same button still owns
    // QR generation + window.print()), and on the native beforeprint
    // event so Ctrl+P / the browser's print menu also gets a fresh
    // letterhead.
    var printButton = document.getElementById('printButton');
    if (printButton) printButton.addEventListener('click', syncPrintLetterhead);
  });

  window.addEventListener('beforeprint', syncPrintLetterhead);
})();
