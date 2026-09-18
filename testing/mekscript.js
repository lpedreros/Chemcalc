// mekscript.js - v8 (Corrects affiliate link keys based on console feedback)

document.addEventListener("DOMContentLoaded", () => {
  // Get elements using correct IDs from mekpcalc.html
  const unitSystemSelect = document.getElementById("unitSystem");
  const resinVolumeInput = document.getElementById("resinVolume");
  const volumeUnitSelect = document.getElementById("volumeUnit");
  const ambientTempInput = document.getElementById("ambientTemp");
  const tempUnitSelect = document.getElementById("tempUnit");
  const usingDuratecCheckbox = document.getElementById("usingDuratec");
  const customPercentageSlider = document.getElementById("customPercentage");
  const customPercentageValueSpan = document.getElementById("customPercentageValue");
  const pctSourceSpan = document.getElementById("pctSource");

  // Result elements
  const mekpRecommendedP = document.getElementById("mekpRecommended");
  const mekpPercentageP = document.getElementById("mekpPercentage"); // The paragraph showing the final % used
  const mekpCcsP = document.getElementById("mekpCcs");
  const mekpDropsP = document.getElementById("mekpDrops");
  const tempAdviceP = document.getElementById("tempAdvice");

  // Affiliate links
  const affiliateLinksList = document.getElementById("affiliateLinksList");

  // affiliate_links.js's Supabase fetch is async and can resolve after this
  // DOMContentLoaded handler's own displayAffiliateLinks() call has already
  // run against a still-empty affiliateLinksData -- re-render once the
  // fetch actually completes. displayAffiliateLinks() takes no args and is
  // pure render (innerHTML rebuild only, no analytics), so it's safe to
  // call directly here.
  window.addEventListener('affiliateLinksReady', () => {
    displayAffiliateLinks();
  }, { once: true });

  // Constants
  const mlPerOz = 29.5735;
  const mlPerQuart = 946.353;
  const mlPerLiter = 1000;
  const mlPerGallon = 3785.41;
  const mlPerDrop = 0.05; // Approximate mL per drop

  // Function to update volume unit options based on system
  function updateVolumeUnits() {
    const selectedSystem = unitSystemSelect.value;
    const currentVolumeUnitValue = volumeUnitSelect.value; // Store current selection if possible
    volumeUnitSelect.innerHTML = ""; // Clear existing options
    let options = [];
    let defaultUnit = "";

    if (selectedSystem === "imperial") {
      options = [
        { value: "oz", text: "Fluid Ounces (fl oz)" },
        { value: "quart", text: "Quarts (qt)" },
        { value: "gallon", text: "Gallons (gal)" },
      ];
      defaultUnit = "oz";
    } else { // metric
      options = [
        { value: "ml", text: "Milliliters (mL/cc)" },
        { value: "liter", text: "Liters (L)" },
      ];
      defaultUnit = "ml";
    }
    
    let unitFound = false;
    options.forEach(opt => {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.text;
      volumeUnitSelect.appendChild(option);
      if (opt.value === currentVolumeUnitValue) {
          option.selected = true;
          unitFound = true;
      }
    });

    if (!unitFound) {
        volumeUnitSelect.value = defaultUnit;
    }

    calculateMEKP(); 
  }

  function calculateMEKP() {
    const resinAmount = parseFloat(resinVolumeInput.value) || 0;
    const selectedVolumeUnit = volumeUnitSelect.value;
    let temp = parseFloat(ambientTempInput.value);
    const selectedTempUnit = tempUnitSelect.value;
    const useDuratec = usingDuratecCheckbox.checked;
    let customPercentage = parseFloat(customPercentageSlider.value);

    if (customPercentageValueSpan) {
        customPercentageValueSpan.textContent = `${customPercentage.toFixed(2)}%`;
    }

    let tempC = NaN;
    if (!isNaN(temp)) {
        tempC = (selectedTempUnit === "fahrenheit") ? (temp - 32) * 5 / 9 : temp;
    }

    let mekpPercentage = 0;
    let percentageSource = "temperature";

    if (useDuratec) {
      mekpPercentage = 2.0;
      percentageSource = "Duratec override";
      customPercentageSlider.disabled = true;
    } else {
      customPercentageSlider.disabled = false;
      mekpPercentage = customPercentage;
      percentageSource = "slider";
    }
    
    if(pctSourceSpan) pctSourceSpan.textContent = percentageSource;

    let resinMl = 0;
    switch (selectedVolumeUnit) {
      case "oz": resinMl = resinAmount * mlPerOz; break;
      case "quart": resinMl = resinAmount * mlPerQuart; break;
      case "gallon": resinMl = resinAmount * mlPerGallon; break;
      case "ml": resinMl = resinAmount; break;
      case "liter": resinMl = resinAmount * mlPerLiter; break;
    }

    const mekpMl = resinMl * (mekpPercentage / 100);
    const mekpDrops = mekpMl / mlPerDrop;

    if (resinMl > 0) {
        let recommendedPct = "N/A";
        // Hoisted out of the block below (rather than left as a `const`
        // scoped to the `if (!isNaN(tempC))` branch) so the analytics
        // block further down can read the actual number instead of
        // re-parsing it back out of mekpRecommendedP's formatted text.
        let recommendedNum = null;
        if (!isNaN(tempC)) {
            recommendedNum = getRecommendedMekpPercent(tempC);
            recommendedPct = (recommendedNum === 3.0) ? "3.0% (Caution!)" : `${recommendedNum.toFixed(1)}%`;
            mekpRecommendedP.textContent = `Recommended MEKP % (based on ${temp.toFixed(0)}°${selectedTempUnit === 'fahrenheit' ? 'F' : 'C'}): ${recommendedPct}`;
        } else {
            mekpRecommendedP.textContent = "Recommended MEKP % (based on temperature): Enter Temp";
        }
        
        mekpPercentageP.textContent = `Using ${mekpPercentage.toFixed(2)}% (${percentageSource})`;
        mekpCcsP.textContent = `MEKP Volume: ${mekpMl.toFixed(1)} cc (mL)`;
        mekpDropsP.textContent = `MEKP Drops: ${mekpDrops.toFixed(0)} drops`;

        if (!isNaN(tempC) && tempC < 15.6) {
            tempAdviceP.textContent = "Warning: Temperature is below 60°F (15.6°C). Curing may be significantly slowed or inhibited. Consider warming the workspace or materials.";
            tempAdviceP.style.display = "block";
        } else {
            tempAdviceP.style.display = "none";
        }

        displayAffiliateLinks();

        // ── Analytics: log this calculation (fire-and-forget) ──
        // Guard: only log when the user has entered a real resin amount.
        // Temperature is deliberately NOT required: the slider/Duratec path
        // produces a complete, correct answer without one, and those
        // calculations were previously invisible to analytics entirely.
        if (typeof logCalculation === 'function' && resinAmount > 0) {
          const CC = window.CC_UNITS;
          // Volume-unit select values ("oz" etc.) -> shared vocabulary.
          // "oz" here is Fluid Ounces (see updateVolumeUnits()'s option
          // list above), so it maps to FLOZ, not the mass OZ.
          const volumeUnitMap = { oz: CC.FLOZ, quart: CC.QT, gallon: CC.GAL, ml: CC.ML, liter: CC.L };
          const _ccInputs = {
            resinAmount:      { value: resinAmount, unit: volumeUnitMap[selectedVolumeUnit], base: resinMl, baseUnit: CC.ML },
            temperature:      isNaN(tempC)
              ? null
              : { value: temp, unit: (selectedTempUnit === 'fahrenheit' ? CC.F : CC.C), base: tempC, baseUnit: CC.C },
            usingDuratec:     useDuratec,
            mekpPercentage:   { value: mekpPercentage, unit: CC.PCT },
            percentageSource: percentageSource
          };
          const _ccResults = {
            mekpVolume:  { value: mekpMl, unit: CC.ML },
            mekpDrops:   { value: mekpDrops, unit: CC.DROPS },
            // recommendedNum is the number getRecommendedMekpPercent()
            // returned (or null if temp was invalid) -- not a re-parse of
            // mekpRecommendedP's formatted text.
            recommended: (recommendedNum === null) ? null : { value: recommendedNum, unit: CC.PCT }
          };
          logCalculation('mekp', _ccInputs, _ccResults);
          // Cached for Print/Email Me to log this settled answer immediately
          // (see calc-tracker.js's logCalculation immediate=true path).
          window._ccLastCalc = { calculator: 'mekp', inputs: _ccInputs, results: _ccResults };
        }
    } else {
        mekpRecommendedP.textContent = "Recommended MEKP % (based on temperature): —";
        mekpPercentageP.textContent = "Using: —";
        mekpCcsP.textContent = "MEKP Volume: —";
        mekpDropsP.textContent = "MEKP Drops: —";
        tempAdviceP.style.display = "none";
        if (affiliateLinksList) affiliateLinksList.innerHTML = "";
    }
  }

  function displayAffiliateLinks() {
    if (!affiliateLinksList || typeof affiliateLinksData === "undefined") return;

    affiliateLinksList.innerHTML = "";
    // Corrected keys based on console output and affiliate_links.js structure
    const linksToShow = [
        "polyester_resin_1gallon_kit_with_mekp",      // Corrected: was polyester_resin_1_gallon_kit_with_mekp
        "white_gel_coat_1gallon_kit_with_wax_and_mekp", // Corrected: was white_gel_coat_1_gallon_kit_with_mekp
        "latex_gloves",                               // Correct (was working)
        "disposable_paper_cups_125pack",              // Corrected: was disposable_paper_cups_125_pack
        "mixing_sticks_reusable",                     // Correct (was working)
        "3m_full_face_respirator_large_model_ultimate_fx_ff402_filter_kit_linked_below" // Corrected: was 3m_full_face_respirator_large_model_ultimate_fx_ff_402_filter_kit_linked_below
    ];

    linksToShow.forEach(key => {
      const linkData = affiliateLinksData[key]; 
      if (linkData) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = linkData.url;
        a.textContent = linkData.name;
        a.target = "_blank";
        a.rel = "noopener noreferrer sponsored";
        li.appendChild(a);
        affiliateLinksList.appendChild(li);
      } else {
          console.warn(`Affiliate link key not found in affiliateLinksData: ${key}`);
      }
    });
  }

  const inputsToWatch = [
    resinVolumeInput,
    volumeUnitSelect,
    ambientTempInput,
    tempUnitSelect,
    usingDuratecCheckbox,
    customPercentageSlider
  ];

  inputsToWatch.forEach(el => {
    if (el) {
      el.addEventListener("input", calculateMEKP);
      el.addEventListener("change", calculateMEKP);
    }
  });

  if (unitSystemSelect) {
      unitSystemSelect.addEventListener("change", updateVolumeUnits);
  }

  updateVolumeUnits();

  const printButton = document.getElementById("printButton");
  const qrCodeContainer = document.getElementById("printQrCode");

  if (printButton && qrCodeContainer && typeof QRCode !== "undefined") {
    printButton.addEventListener("click", (event) => {
      event.preventDefault();
      if (window._ccLastCalc && typeof logCalculation === 'function') {
        logCalculation(window._ccLastCalc.calculator, window._ccLastCalc.inputs, window._ccLastCalc.results, true);
      }
      const pageUrl = window.location.href;
      qrCodeContainer.innerHTML = "";
      new QRCode(qrCodeContainer, {
        text: pageUrl,
        width: 100,
        height: 100,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
      });
      
      setTimeout(() => {
          window.print();
      }, 250);
    });
  } else {
      if (!printButton) console.error("Print button not found");
      if (!qrCodeContainer) console.error("QR code container not found");
      if (typeof QRCode === "undefined") console.error("QRCode library not loaded");
  }
});

