/* mekscript.js
   --------------------------------------------
   BoatDesign.net rule:
     • 1% at >= 85 °F
     • Add 0.5% for every 5 °F drop
   Duratec toggle forces 2%.
   Clamp between 1% and 3%. Twelve drops/oz floor.
*/
document.addEventListener('DOMContentLoaded', () => {
  const resinVolInput  = document.getElementById('resinVolume');
  const volumeUnitSel  = document.getElementById('volumeUnit');
  const ambientTempInp = document.getElementById('ambientTemp');
  const tempUnitSel    = document.getElementById('tempUnit');
  const duratecChk     = document.getElementById('usingDuratec');
  const pctSlider      = document.getElementById('customPercentage');

  const recDisplay     = document.getElementById('mekpRecommended');
  const pctDisplay     = document.getElementById('mekpPercentage');
  const pctSource      = document.getElementById('pctSource');
  const ccsDisplay     = document.getElementById('mekpCcs');
  const dropsDisplay   = document.getElementById('mekpDrops');
  const tempAdviceDisp = document.getElementById('tempAdvice');
  const resinVolUnit   = document.getElementById('resinVolumeUnit');

  /* ---------- helpers ---------- */
  const unitAbbrev = u => ({
    ounces: 'oz', pints: 'pt', quarts: 'qt', gallons: 'gal',
    ccs: 'mL', mls: 'mL', liters: 'L'
  }[u] || u);

  const volToOz = (v, u) => ({
    ounces: 1, pints: 16, quarts: 32, gallons: 128,
    ccs: 0.033814, mls: 0.033814, liters: 33.814
  }[u] || 1) * v;

  const toF = (t, u) => (u === 'celsius' ? t * 9 / 5 + 32 : t);
  const toC = t => (t - 32) * 5 / 9;

  function recommendedPct(tempF) {
    if (duratecChk.checked) return 2;
    if (tempF >= 85) return 1;
    const steps = Math.ceil((85 - tempF) / 5);
    return Math.min(3, 1 + steps * 0.5);
  }

  /* ---------- main calc ---------- */
  function calculate() {
    const vol     = parseFloat(resinVolInput.value) || 0;
    const ambTemp = parseFloat(ambientTempInp.value) || 70;
    const volUnit = volumeUnitSel.value;
    const tmpUnit = tempUnitSel.value;

    const resinOz = volToOz(vol, volUnit);
    const tempF   = toF(ambTemp, tmpUnit);

    const recPct  = recommendedPct(tempF);
    recDisplay.innerHTML =
      'Recommended MEKp % (based on temperature): <b>' + recPct.toFixed(2) + '%</b>';

    let usePct;
    if (duratecChk.checked) {
      pctSource.textContent = 'Duratec override';
      usePct = 2;
    } else {
      pctSource.textContent = 'slider';
      usePct = parseFloat(pctSlider.value) || 1;
    }

    pctDisplay.innerHTML =
      'Using ' + pctSource.textContent + ' value: <b>' + usePct.toFixed(2) + '%</b>';

    const ccsRaw   = (usePct / 100) * resinOz * 29.5735;
    const dropsRaw = ccsRaw * 20;
    const dropsMin = resinOz * 12;
    const drops    = Math.max(dropsRaw, dropsMin);

    ccsDisplay.innerHTML   = 'MEKp CCs: <b>' + ccsRaw.toFixed(2) + ' CCs</b>';
    dropsDisplay.innerHTML = 'MEKp Drops: <b>' + drops.toFixed(0) + ' Drops</b>';

    const threshF = 60;
    tempAdviceDisp.textContent =
      tempF < threshF
        ? 'Find a way to raise and maintain the substrate temperature to ' +
          (tmpUnit === 'celsius' ? toC(threshF).toFixed(2) : threshF) +
          '°' + (tmpUnit === 'celsius' ? 'C' : 'F') + '.'
        : '';

    resinVolUnit.textContent = unitAbbrev(volUnit);
  }

  /* listeners */
  ['input', 'change'].forEach(evt => {
    resinVolInput .addEventListener(evt, calculate);
    volumeUnitSel .addEventListener(evt, calculate);
    ambientTempInp.addEventListener(evt, calculate);
    tempUnitSel   .addEventListener(evt, calculate);
    duratecChk    .addEventListener(evt, calculate);
    pctSlider     .addEventListener(evt, calculate);
  });

  calculate();
  window.updateMekpValues = calculate; // allow init script to trigger recalcs
});
