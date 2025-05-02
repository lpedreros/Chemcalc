// mekscript.js - v5 (Fixes unit dropdown update bug)

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
      // Update placeholder hint if element exists
      const resinVolumeUnitSpan = document.getElementById("resinVolumeUnit");
      if (resinVolumeUnitSpan) resinVolumeUnitSpan.textContent = "oz"; 
    } else { // metric
      options = [
        { value: "ml", text: "Milliliters (mL/cc)" },
        { value: "liter", text: "Liters (L)" },
      ];
      defaultUnit = "ml";
      // Update placeholder hint if element exists
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
          option.selected = true; // Try to keep the previous selection if it exists in the new list
          unitFound = true;
      }
    });

    // If the previously selected unit is not in the new list, select the default for the system
    if (!unitFound) {
        volumeUnitSelect.value = defaultUnit;
    }

    // Trigger calculation update after changing units
    calculateMEKP(); 
  }

  function calculateMEKP() {
    const resinAmount = parseFloat(resinVolumeInput.value) || 0;
    const selectedVolumeUnit = volumeUnitSelect.value;
    let temp = parseFloat(ambientTempInput.value);
    const selectedTempUnit = tempUnitSelect.value;
    const useDuratec = usingDuratecCheckbox.checked;
    let customPercentage = parseFloat(customPercentageSlider.value);

    // Update slider value display
    if (customPercentageValueSpan) {
        customPercentageValueSpan.textContent = `${customPercentage.toFixed(2)}%`;
    }

    // Convert temperature to Celsius
    let tempC = NaN;
    if (!isNaN(temp)) {
        tempC = (selectedTempUnit === "fahrenheit") ? (temp - 32) * 5 / 9 : temp;
    }

    // Determine MEKP percentage
    let mekpPercentage = 0;
    let percentageSource = "temperature";

    if (useDuratec) {
      mekpPercentage = 2.0;
      percentageSource = "Duratec override";
      customPercentageSlider.disabled = true;
    } else {
      customPercentageSlider.disabled = false;
      // Use slider value
      mekpPercentage = customPercentage;
      percentageSource = "slider";
    }
    
    // Update pctSource span
    if(pctSourceSpan) pctSourceSpan.textContent = percentageSource;

    // Convert resin amount to mL
    let resinMl = 0;
    switch (selectedVolumeUnit) {
      case "oz": resinMl = resinAmount * mlPerOz; break;
      case "quart": resinMl = resinAmount * mlPerQuart; break;
      case "gallon": resinMl = resinAmount * mlPerGallon; break;
      case "ml": resinMl = resinAmount; break;
      case "liter": resinMl = resinAmount * mlPerLiter; break;
    }

    // Calculate MEKP amount
    const mekpMl = resinMl * (mekpPercentage / 100);
    const mekpDrops = mekpMl / mlPerDrop;

    // Display results
    if (resinMl > 0) {
        // Display recommended % based on temp (informational)
        let recommendedPct = "N/A";
        if (!isNaN(tempC)) {
            if (tempC >= 29.4) recommendedPct = "1.0%"; // 85F
            else if (tempC >= 23.9) recommendedPct = "1.5%"; // 75F
            else if (tempC >= 18.3) recommendedPct = "2.0%"; // 65F
            else if (tempC >= 15.6) recommendedPct = "2.5%"; // 60F
            else recommendedPct = "3.0% (Caution!)"; // Below 60F
            mekpRecommendedP.textContent = `Recommended MEKP % (based on ${temp.toFixed(0)}°${selectedTempUnit === 'fahrenheit' ? 'F' : 'C'}): ${recommendedPct}`;
        } else {
            mekpRecommendedP.textContent = "Recommended MEKP % (based on temperature): Enter Temp";
        }
        
        mekpPercentageP.textContent = `Using ${mekpPercentage.toFixed(2)}% (${percentageSource})`;
        mekpCcsP.textContent = `MEKP Volume: ${mekpMl.toFixed(1)} cc (mL)`;
        mekpDropsP.textContent = `MEKP Drops: ${mekpDrops.toFixed(0)} drops`;

        // Temperature advice
        if (!isNaN(tempC) && tempC < 15.6) { // Below 60F
            tempAdviceP.textContent = "Warning: Temperature is below 60°F (15.6°C). Curing may be significantly slowed or inhibited. Consider warming the workspace or materials.";
            tempAdviceP.style.display = "block";
        } else {
            tempAdviceP.style.display = "none";
        }

        displayAffiliateLinks();
    } else {
        // Clear results if input is invalid
        mekpRecommendedP.textContent = "Recommended MEKP % (based on temperature): —";
        mekpPercentageP.textContent = "Using: —";
        mekpCcsP.textContent = "MEKP Volume: —";
        mekpDropsP.textContent = "MEKP Drops: —";
        tempAdviceP.style.display = "none";
        if (affiliateLinksList) affiliateLinksList.innerHTML = ""; // Clear links
    }
  }

  function displayAffiliateLinks() {
    if (!affiliateLinksList || typeof affiliateLinksData === "undefined") return;

    affiliateLinksList.innerHTML = ""; // Clear previous links
    const linksToShow = ["mekp", "polyester_resin_gallon", "latex_gloves", "mixing_sticks", "disposable_paper_cups"];

    linksToShow.forEach(key => {
      // Check if the key exists directly in affiliateLinksData
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
          // Fallback: Search for the key within the affiliateLinksData object (if structured differently)
          // This part might need adjustment based on the actual structure of affiliate_links.js
          for (const category in affiliateLinksData) {
              if (affiliateLinksData[category][key]) {
                  const nestedLinkData = affiliateLinksData[category][key];
                  const li = document.createElement("li");
                  const a = document.createElement("a");
                  a.href = nestedLinkData.url;
                  a.textContent = nestedLinkData.name;
                  a.target = "_blank";
                  a.rel = "noopener noreferrer sponsored";
                  li.appendChild(a);
                  affiliateLinksList.appendChild(li);
                  break; // Found it, stop searching this category
              }
          }
      }
    });
  }

  // Event listeners for automatic calculation
  const inputsToWatch = [
    // unitSystemSelect, // Removed from here, handled separately below
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
      el.addEventListener("change", calculateMEKP); // Handles selects and checkboxes
    }
  });

  // *** FIX: Add specific event listener for unit system changes ***
  if (unitSystemSelect) {
      unitSystemSelect.addEventListener("change", updateVolumeUnits);
  }

  // Initial setup
  updateVolumeUnits(); // Set initial volume units and trigger calculation
  // calculateMEKP(); // calculateMEKP is called by updateVolumeUnits, no need to call twice

  // --- Print Functionality ---
  const printButton = document.getElementById("printButton");
  const qrCodeContainer = document.getElementById("printQrCode");

  if (printButton && qrCodeContainer && typeof QRCode !== "undefined") {
    printButton.addEventListener("click", (event) => { // Added event parameter
      event.preventDefault(); // Prevent potential form submission if button is inside a form
      const pageUrl = window.location.href;
      qrCodeContainer.innerHTML = ""; // Clear previous QR code
      new QRCode(qrCodeContainer, {
        text: pageUrl,
        width: 100, // Keep original size unless requested otherwise
        height: 100,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
      });
      
      // Timeout to allow QR code rendering before print dialog
      setTimeout(() => {
          window.print();
      }, 250); // Adjust delay if needed
    });
  } else {
      if (!printButton) console.error("Print button not found");
      if (!qrCodeContainer) console.error("QR code container not found");
      if (typeof QRCode === "undefined") console.error("QRCode library not loaded");
  }

});

