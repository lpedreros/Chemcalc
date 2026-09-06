// mekpcalc-print.js
//
// Populates the print-only letterhead summary (#mekpPrintLetterhead).
//
// IMPORTANT: this file performs NO MEKP math of its own. It only
// mirrors/reformats values that already exist in the DOM:
//   - the real functional inputs (resinVolume, volumeUnit, ambientTemp,
//     tempUnit, usingDuratec) are read directly, verbatim.
//   - the result lines (#mekpRecommended, #mekpPercentage, #mekpCcs,
//     #mekpDrops, #tempAdvice) are the exact strings mekscript.js's
//     calculateMEKP() already wrote into the page. This file only
//     extracts the trailing number/value out of those sentences with a
//     defensive regex, and always falls back to the original computed
//     text if a pattern doesn't match — it never invents or recomputes
//     a value. mekscript.js and calculateMEKP() are never called or
//     modified from here.
//
// The QR code itself is untouched: mekscript.js's existing printButton
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

  // Returns whatever follows the LAST colon in `str`, trimmed.
  // Used for sentences like "Recommended MEKP % (based on 72°F): 1.5%"
  // -> "1.5%", or "...: —" -> "—".
  function afterLastColon(str, fallback) {
    if (!str) return fallback;
    var idx = str.lastIndexOf(':');
    if (idx === -1) return str;
    var tail = str.slice(idx + 1).trim();
    return tail || fallback;
  }

  function extract(str, pattern, fallback) {
    var m = str && str.match(pattern);
    return m ? m[1] : fallback;
  }

  function syncPrintLetterhead() {
    var volumeInput = document.getElementById('resinVolume');
    var volumeUnitLabel = document.getElementById('resinVolumeUnit');
    var tempInput = document.getElementById('ambientTemp');
    var tempUnitSelect = document.getElementById('tempUnit');
    var duratecChk = document.getElementById('usingDuratec');

    // --- Inputs recap: direct reads of the real controls, no parsing ---
    if (volumeInput) {
      var vol = (volumeInput.value || '').trim();
      var unitLabel = volumeUnitLabel ? volumeUnitLabel.textContent.trim() : '';
      setText('printRecapVolume', vol ? (unitLabel ? vol + ' ' + unitLabel : vol) : '—');
    }
    if (tempInput) {
      var deg = tempUnitSelect && tempUnitSelect.value === 'celsius' ? 'C' : 'F';
      var t = (tempInput.value || '').trim();
      setText('printRecapTemp', t ? t + '°' + deg : '—');
    }
    setText(
      'printRecapMethod',
      duratecChk && duratecChk.checked
        ? 'Duratec 904-001 (locked 2%)'
        : 'Custom percentage'
    );

    // --- Results: mirror calculateMEKP()'s own output text, reformatted ---
    var recommendedSentence = textOf('mekpRecommended');
    setText('printRecapRecommended', afterLastColon(recommendedSentence, '—'));

    var usedSentence = textOf('mekpPercentage');
    setText(
      'printRecapUsed',
      extract(usedSentence, /Using\s+([\d.]+%)/i, afterLastColon(usedSentence, '—'))
    );

    var ccSentence = textOf('mekpCcs');
    var ccValue = extract(ccSentence, /:\s*([\d.]+)\s*cc/i, null);
    setText('printRecapCcs', ccValue || '—');

    var dropsSentence = textOf('mekpDrops');
    var dropsValue = extract(dropsSentence, /:\s*([\d.]+)\s*drops/i, null);
    setText('printRecapDrops', dropsValue ? '≈ ' + dropsValue + ' drops' : '—');

    var advisoryEl = document.getElementById('tempAdvice');
    var advisoryText =
      advisoryEl && advisoryEl.style.display !== 'none' ? advisoryEl.textContent.trim() : '';
    setText('printRecapAdvisory', advisoryText);

    setText(
      'printGeneratedOn',
      new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    );
  }

  document.addEventListener('DOMContentLoaded', function () {
    syncPrintLetterhead();

    // Keep the letterhead fresh as the user edits inputs. mekscript.js's
    // own listeners on these same elements were registered first (its
    // <script> tag loads before this one), so calculateMEKP() has always
    // already updated the result paragraphs by the time this runs.
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
      if (el) {
        el.addEventListener('input', syncPrintLetterhead);
        el.addEventListener('change', syncPrintLetterhead);
      }
    });

    // Belt-and-suspenders: re-sync right when Print Results is clicked
    // (mekscript.js's own listener on this same button still owns QR
    // generation + window.print()), and on the native beforeprint event
    // so Ctrl+P / the browser's print menu also gets a fresh letterhead.
    var printButton = document.getElementById('printButton');
    if (printButton) printButton.addEventListener('click', syncPrintLetterhead);
  });

  window.addEventListener('beforeprint', syncPrintLetterhead);
})();
