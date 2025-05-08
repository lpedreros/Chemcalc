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
      const resinVolumeUnitSpan = document.getElementById("resinVolumeUnit");
      if (resinVolumeUnitSpan) resinVolumeUnitSpan.textContent = "oz"; 
    } else { // metric
      options = [
        { value: "ml", text: "Milliliters (mL/cc)" },
        { value: "liter", text: "Liters (L)" },
      ];
      defaultUnit = "ml";
      const resinVolumeUnitSpan = document.getElementById("resinVolumeUnit");
      if (resinVolumeUnitSpan) resinVolumeUnitSpan.textContent = "mL"; 
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
        if (!isNaN(tempC)) {
            if (tempC >= 29.4) recommendedPct = "1.0%";
            else if (tempC >= 23.9) recommendedPct = "1.5%";
            else if (tempC >= 18.3) recommendedPct = "2.0%";
            else if (tempC >= 15.6) recommendedPct = "2.5%";
            else recommendedPct = "3.0% (Caution!)";
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

