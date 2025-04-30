/* mekp-init.js
   ----------------
   Runs AFTER mekscript.js.
   Populates the volume‑unit dropdown whenever the measurement system changes,
   then dispatches a 'change' event so mekscript.js recalculates immediately. */
document.addEventListener('DOMContentLoaded', () => {
  const unitsMap = {
    imperial: ['ounces', 'pints', 'quarts', 'gallons'],
    metric:   ['ccs', 'mls', 'liters']
  };

  const unitSystem    = document.getElementById('unitSystem');
  const volumeUnitSel = document.getElementById('volumeUnit');
  const pctSlider     = document.getElementById('customPercentage');
  const pctValLabel   = document.getElementById('customPercentageValue');
  const duratecChk    = document.getElementById('usingDuratec');
  const duratecHelp   = document.getElementById('duratecHelp');

  function populateVolumeUnits() {
    const list = unitsMap[unitSystem.value];
    volumeUnitSel.innerHTML = '';
    list.forEach(u => volumeUnitSel.add(new Option(u.toUpperCase(), u)));
    /* Trigger change so mekscript updates abbreviations/results */
    volumeUnitSel.dispatchEvent(new Event('change', { bubbles:true }));
  }

  function updateDuratecUI() {
    if (duratecChk.checked) {
      pctSlider.value = 2;
      pctSlider.disabled = true;
      duratecHelp.textContent = 'Duratec mode engaged – slider locked at 2 %.';
    } else {
      pctSlider.disabled = false;
      duratecHelp.textContent = 'Use the slider (1–3 %) or re‑enable Duratec for 2 %.';
    }
    pctValLabel.textContent = pctSlider.value + '%';
    window.updateMekpValues && window.updateMekpValues();
  }

  /* listeners */
  unitSystem.addEventListener('change', populateVolumeUnits);
  pctSlider .addEventListener('input', () => {
    pctValLabel.textContent = pctSlider.value + '%';
    window.updateMekpValues && window.updateMekpValues();
  });
  duratecChk.addEventListener('change', updateDuratecUI);

  /* init */
  populateVolumeUnits();   // set dropdown for default system
  updateDuratecUI();       // sync slider + help text
});
/* mekp-init.js
   --------------------------------------------
   Unchanged except for final dispatch to ensure label refresh. */
document.addEventListener('DOMContentLoaded', () => {
  const unitsMap = {
    imperial: ['ounces', 'pints', 'quarts', 'gallons'],
    metric:   ['ccs', 'mls', 'liters']
  };

  const unitSystem    = document.getElementById('unitSystem');
  const volumeUnitSel = document.getElementById('volumeUnit');
  const pctSlider     = document.getElementById('customPercentage');
  const pctValLabel   = document.getElementById('customPercentageValue');
  const duratecChk    = document.getElementById('usingDuratec');
  const duratecHelp   = document.getElementById('duratecHelp');

  function populateVolumeUnits() {
    const list = unitsMap[unitSystem.value];
    volumeUnitSel.innerHTML = '';
    list.forEach(u => volumeUnitSel.add(new Option(u.toUpperCase(), u)));
    volumeUnitSel.dispatchEvent(new Event('change', { bubbles:true }));
  }

  function updateDuratecUI() {
    if (duratecChk.checked) {
      pctSlider.value = 2;
      pctSlider.disabled = true;
      duratecHelp.textContent = 'Duratec mode engaged – slider locked at 2 %.';
    } else {
      pctSlider.disabled = false;
      duratecHelp.textContent = 'Use the slider (1–3 %) or re‑enable Duratec for 2 %.';
    }
    pctValLabel.textContent = pctSlider.value + '%';
    window.updateMekpValues && window.updateMekpValues();
  }

  unitSystem .addEventListener('change', populateVolumeUnits);
  pctSlider  .addEventListener('input', () => {
    pctValLabel.textContent = pctSlider.value + '%';
    window.updateMekpValues && window.updateMekpValues();
  });
  duratecChk.addEventListener('change', updateDuratecUI);

  populateVolumeUnits();
  updateDuratecUI();
});
/* mekp-init.js
   --------------------------------------------
   Populates volume-unit dropdown and keeps UI synced.
   Runs after mekscript.js so updateMekpValues exists.
*/
document.addEventListener('DOMContentLoaded', () => {
  const unitsMap = {
    imperial: ['ounces', 'pints', 'quarts', 'gallons'],
    metric:   ['ccs', 'mls', 'liters']
  };

  const unitSystem    = document.getElementById('unitSystem');
  const volumeUnitSel = document.getElementById('volumeUnit');
  const pctSlider     = document.getElementById('customPercentage');
  const pctValLabel   = document.getElementById('customPercentageValue');
  const duratecChk    = document.getElementById('usingDuratec');
  const duratecHelp   = document.getElementById('duratecHelp');

  function populateVolumeUnits() {
    const list = unitsMap[unitSystem.value];
    volumeUnitSel.innerHTML = '';
    list.forEach(u => volumeUnitSel.add(new Option(u.toUpperCase(), u)));
    volumeUnitSel.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function updateDuratecUI() {
    if (duratecChk.checked) {
      pctSlider.value = 2;
      pctSlider.disabled = true;
      duratecHelp.textContent = 'Duratec mode engaged – slider locked at 2%.';
    } else {
      pctSlider.disabled = false;
      duratecHelp.textContent =
        'Use the slider (1–3%) or re‑enable Duratec for 2%.';
    }
    pctValLabel.textContent = pctSlider.value + '%';
    window.updateMekpValues && window.updateMekpValues();
  }

  unitSystem.addEventListener('change', populateVolumeUnits);
  pctSlider .addEventListener('input', () => {
    pctValLabel.textContent = pctSlider.value + '%';
    window.updateMekpValues && window.updateMekpValues();
  });
  duratecChk.addEventListener('change', updateDuratecUI);

  populateVolumeUnits();
  updateDuratecUI();
});
