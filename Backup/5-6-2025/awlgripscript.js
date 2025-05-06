/* awlgripscript.js - v5 (Updates Affiliate Links for Base Colors) */
document.addEventListener("DOMContentLoaded", () => {
  /* unit sets */
  const unitsFor = {
    imperial: { area: "squareFootage", volume: ["gallons", "quarts", "ounces"], dimension: "feet" },
    metric: { area: "squareMeters", volume: ["liters", "ccs"], dimension: "meters" },
  };
  const labels = {
    squareFootage: "ft²",
    squareMeters: "m²",
    gallons: "Gallons",
    quarts: "Quarts",
    ounces: "Ounces",
    liters: "Liters",
    ccs: "mL (cc)",
    feet: "Feet (ft)",
    meters: "Meters (m)",
    inches: "Inches (in)", // Added for dimension input
    cm: "Centimeters (cm)" // Added for dimension input
  };

  /* coverage ft²/gal + coats */
  const cov = {
    awlgrip: { spray: { c: 542.9, k: 3 }, roll: { c: 814.8, k: 2 } },
    awlcraft2000: { spray: { c: 725.2, k: 3 } }, // No roll option for Awlcraft 2000
    "545primer": { spray: { c: 317.8, k: 2 }, roll: { c: 635.6, k: 2 } },
  };

  /* DOM */
  const sys = document.getElementById("unitSystem");
  const inputMethodRadios = document.querySelectorAll("input[name=\"inputMethod\"]");
  const areaVolumeInputsDiv = document.getElementById("areaVolumeInputs");
  const lengthWidthInputsDiv = document.getElementById("lengthWidthInputs");
  const inU = document.getElementById("unitType"); // For direct area/volume
  const val = document.getElementById("inputValue"); // For direct area/volume
  const lengthInput = document.getElementById("length");
  const widthInput = document.getElementById("width");
  const dimensionUnitSelect = document.getElementById("dimensionUnit");
  const calculatedAreaDisplaySpan = document.getElementById("calculatedAreaDisplay");
  const resRow = document.getElementById("resultUnitRow");
  const resU = document.getElementById("resultUnit");
  const method = document.getElementById("methodType");
  const paint = document.getElementById("paintType");
  const outP = document.getElementById("resultPaint");
  const outC = document.getElementById("resultConverter");
  const outR = document.getElementById("resultReducer");
  const outCov = document.getElementById("resultCoverage");
  const affiliateLinksList = document.getElementById("affiliateLinksList"); 
  const affiliateLinksContainer = document.getElementById("affiliateLinksContainer"); // Added
  const resultsCard = document.querySelector(".card.mt-4"); // Get the results card

  /* conversions */
  const cv = {
    squareFootage: { squareMeters: 0.092903 },
    squareMeters: { squareFootage: 10.7639 },
    gallons: { liters: 3.78541, quarts: 4, ounces: 128, ccs: 3785.41 },
    liters: { gallons: 0.264172, quarts: 1.05669, ounces: 33.814, ccs: 1000 },
    quarts: { gallons: 0.25, liters: 0.946353, ounces: 32, ccs: 946.353 },
    ounces: { gallons: 0.0078125, liters: 0.0295735, quarts: 0.03125, ccs: 29.5735 },
    ccs: { gallons: 0.000264172, liters: 0.001, quarts: 0.00105669, ounces: 0.033814 },
    // Dimension conversions to base unit (feet or meters)
    feet: { meters: 0.3048, inches: 12 },
    meters: { feet: 3.28084, cm: 100 },
    inches: { feet: 1/12, meters: 0.0254 },
    cm: { meters: 0.01, feet: 0.0328084 }
  };
  const convert = (v, f, t) => {
    const n = +v;
    if (isNaN(n)) return null;
    if (f === t) return n;
    const r = (cv[f] || {})[t];
    return r ? n * r : null;
  };

  /* ratios */
  const ratios = (p, m) => {
    switch (p) {
      case "545primer":
        return { conv: 1, red: m === "spray" ? 0.25 : 0.15 };
      case "awlgrip":
        return { conv: m === "spray" ? 1 : 0.5, red: m === "spray" ? 0.25 : 0.2 };
      case "awlcraft2000":
        return { conv: 0.5, red: 0.33 };
      default:
        return { conv: 0, red: 0 };
    }
  };

  /* populate dropdowns */
  function populateLists() {
    const system = sys.value;
    const areaUnit = unitsFor[system].area;
    const volumeUnits = unitsFor[system].volume;
    const dimensionUnits = system === "imperial" ? ["feet", "inches"] : ["meters", "cm"];

    // Populate Direct Input Units (Area + Volume)
    inU.innerHTML = "";
    inU.add(new Option(labels[areaUnit], areaUnit));
    volumeUnits.forEach((u) => inU.add(new Option(labels[u], u)));

    // Populate Result Units (Volume only)
    resU.innerHTML = "";
    volumeUnits.forEach((u) => resU.add(new Option(labels[u], u)));

    // Populate Dimension Units
    dimensionUnitSelect.innerHTML = "";
    dimensionUnits.forEach((u) => dimensionUnitSelect.add(new Option(labels[u], u)));
  }

  /* show/hide input sections based on radio selection */
  function toggleInputMethod() {
    const selectedMethod = document.querySelector("input[name=\"inputMethod\"]:checked").value;
    if (selectedMethod === "areaVolume") {
      areaVolumeInputsDiv.style.display = "block";
      lengthWidthInputsDiv.style.display = "none";
    } else { // lengthWidth
      areaVolumeInputsDiv.style.display = "none";
      lengthWidthInputsDiv.style.display = "block";
    }
    calc(); // Recalculate when method changes
  }

  /* show/hide result-unit row */
  function toggleResRow(isAreaInput) {
    resRow.classList.toggle("d-none", !isAreaInput);
  }

  /* --- Affiliate Link Display Logic --- */
  function displayAffiliateLinks(paintType, methodType) {
    if (!affiliateLinksList || !affiliateLinksContainer || typeof affiliateLinksData === "undefined") {
      console.error("Affiliate links container or data not found.");
      if (affiliateLinksContainer) affiliateLinksContainer.style.display = "none";
      return;
    }

    affiliateLinksList.innerHTML = ""; 
    const linksToShowKeys = new Set();

    let baseKeys = [];
    let converterKey = null;
    let reducerKey = null;

    if (paintType === "awlcraft2000") {
      baseKeys = [
        "awlcraft2000_base_snow_white_gallon",
        "awlcraft2000_base_super_jet_black_gallon",
        "awlcraft2000_base_flag_blue_quart" // Note: Quart
      ];
      converterKey = "awlcraft_awlgrip_spray_converter"; 
      reducerKey = "awlgrip_spray_reducer_quart"; 
    } else if (paintType === "awlgrip") {
      baseKeys = [
        "awlgrip_topcoat_base_snow_white_gallon",
        "awlgrip_topcoat_base_extreme_black_gallon",
        "awlgrip_topcoat_base_flag_blue_gallon"
      ];
      if (methodType === "spray") {
        converterKey = "awlcraft_awlgrip_spray_converter"; 
        reducerKey = "awlgrip_spray_reducer_quart"; 
      } else { // roll/brush
        converterKey = "awlgrip_roll_brush_converter"; 
        reducerKey = "awlgrip_brush_reducer_quart"; 
      }
    } else if (paintType === "545primer") {
      baseKeys = ["awlgrip_545_primer_base_white_gallon"]; 
      converterKey = "awlgrip_545_primer_converter"; 
      if (methodType === "spray") {
        reducerKey = "awlgrip_spray_reducer_quart"; 
      } else { // roll/brush
        reducerKey = "awlgrip_brush_reducer_quart"; 
      }
    }

    // Add base colors
    baseKeys.forEach(key => {
        if (affiliateLinksData[key]) linksToShowKeys.add(key);
    });
    // Add converter and reducer
    if (converterKey && affiliateLinksData[converterKey]) linksToShowKeys.add(converterKey);
    if (reducerKey && affiliateLinksData[reducerKey]) linksToShowKeys.add(reducerKey);

    // Add General Supplies
    if (affiliateLinksData["latex_gloves"]) linksToShowKeys.add("latex_gloves");
    if (affiliateLinksData["mixing_sticks"]) linksToShowKeys.add("mixing_sticks");
    if (affiliateLinksData["disposable_paper_cups"]) linksToShowKeys.add("disposable_paper_cups");
    if (affiliateLinksData["blue_tape"]) linksToShowKeys.add("blue_tape");
    if (methodType === "spray") {
        if (affiliateLinksData["3m_performance_spray_gun_kit"]) linksToShowKeys.add("3m_performance_spray_gun_kit");
        if (affiliateLinksData["masking_plastic"]) linksToShowKeys.add("masking_plastic");
        if (affiliateLinksData["3m_full_face_respirator"]) linksToShowKeys.add("3m_full_face_respirator");
    } else { // roll/brush
        if (affiliateLinksData["foam_rollers"]) linksToShowKeys.add("foam_rollers");
        if (affiliateLinksData["roller_tray_with_liners_and_roller_frame"]) linksToShowKeys.add("roller_tray_with_liners_and_roller_frame");
    }

    // Render links
    if (linksToShowKeys.size > 0) {
      linksToShowKeys.forEach((key) => {
        const linkData = affiliateLinksData[key];
        if (linkData && linkData.url && linkData.name) {
          const li = document.createElement("li");
          const a = document.createElement("a");
          a.href = linkData.url;
          a.textContent = linkData.name;
          a.target = "_blank";
          a.rel = "noopener noreferrer sponsored";
          li.appendChild(a);
          affiliateLinksList.appendChild(li);
        }
      });
      if (affiliateLinksContainer) affiliateLinksContainer.style.display = "block"; // Show container
    } else {
      affiliateLinksList.innerHTML = "<li>No specific products found. Check Kits page.</li>";
      if (affiliateLinksContainer) affiliateLinksContainer.style.display = "block"; // Still show container with message
    }
  }

  /* calc */
  function calc() {
    const selectedInputMethod = document.querySelector("input[name=\"inputMethod\"]:checked").value;
    const sysType = sys.value;
    let paintType = paint.value;
    let methodType = method.value;
    let inVal = 0;
    let inUnit = null;
    let isArea = false;

    // Disable roll method for Awlcraft
    const isAwlcraft = paintType === "awlcraft2000";
    method.querySelector("[value=\"roll\"]").disabled = isAwlcraft;
    if (isAwlcraft && methodType === "roll") {
      method.value = "spray"; // Auto-switch if roll was selected
      methodType = method.value; // Update methodType after potential change
    }

    // Determine input value and unit based on selected method
    if (selectedInputMethod === "areaVolume") {
        inVal = parseFloat(val.value) || 0;
        inUnit = inU.value;
        isArea = ["squareFootage", "squareMeters"].includes(inUnit);
    } else { // lengthWidth
        const length = parseFloat(lengthInput.value) || 0;
        const width = parseFloat(widthInput.value) || 0;
        const dimUnit = dimensionUnitSelect.value;
        isArea = true; // Always calculating area
        inUnit = unitsFor[sysType].area; // Set input unit to the system's area unit

        if (length > 0 && width > 0) {
            // Convert dimensions to the system's base dimension unit (feet or meters)
            const baseDimUnit = sysType === "imperial" ? "feet" : "meters";
            const lengthBase = convert(length, dimUnit, baseDimUnit);
            const widthBase = convert(width, dimUnit, baseDimUnit);
            
            if (lengthBase !== null && widthBase !== null) {
                const areaBase = lengthBase * widthBase; // Area in ft² or m²
                inVal = areaBase; // Use this calculated area as the input value
                calculatedAreaDisplaySpan.textContent = `${areaBase.toFixed(2)} ${labels[inUnit]}`;
            } else {
                inVal = 0; // Error in conversion
                calculatedAreaDisplaySpan.textContent = "Error";
            }
        } else {
            inVal = 0;
            calculatedAreaDisplaySpan.textContent = "—";
        }
    }

    toggleResRow(isArea); // Show/hide result unit selector based on whether input is area

    // Validate input value
    if (inVal <= 0) {
      reset();
      // Keep results card visible but show placeholders
      if(resultsCard) resultsCard.style.display = "block"; 
      return;
    }
    if(resultsCard) resultsCard.style.display = "block"; // Ensure results card is visible
    
    let baseCC;
    if (isArea) {
      const coverageInfo = (cov[paintType] || {})[methodType];
      if (!coverageInfo) {
        reset("—");
        return;
      }
      // Convert input area to ft² for coverage calculation
      const areaFt2 = inUnit === "squareFootage" ? inVal : convert(inVal, "squareMeters", "squareFootage");

      if (areaFt2 === null) {
          reset("Err");
          return;
      }

      const totalGallonsMixed = (areaFt2 / coverageInfo.c) * coverageInfo.k;
      const totalCCMixed = convert(totalGallonsMixed, "gallons", "ccs");

      const { conv, red } = ratios(paintType, methodType);
      const totalParts = 1 + conv + red;
      baseCC = totalCCMixed / totalParts;

    } else { // Input is volume
      // Assume input volume is the BASE paint volume
      baseCC = convert(inVal, inUnit, "ccs");
    }

    if (baseCC === null || baseCC <= 0) {
      reset("Err");
      return;
    }

    const { conv, red } = ratios(paintType, methodType);
    const convCC = baseCC * conv;
    const redCC = baseCC * red;

    // Determine output unit
    const outUnit = isArea ? resU.value : inUnit; // Use result unit selector if area, else use input unit
    
    const pVol = convert(baseCC, "ccs", outUnit)?.toFixed(2) ?? "Err";
    const cVol = convert(convCC, "ccs", outUnit)?.toFixed(2) ?? "Err";
    const rVol = convert(redCC, "ccs", outUnit)?.toFixed(2) ?? "Err";

    outP.textContent = `Paint Base: ${pVol} ${labels[outUnit]}`;
    outC.textContent = `Converter / Catalyst: ${cVol} ${labels[outUnit]}`;
    outR.textContent = `Reducer: ${rVol} ${labels[outUnit]}`;

    // Display coverage info
    if (cov[paintType] && cov[paintType][methodType]) {
      const d = cov[paintType][methodType];
      const covFt2 = d.c;
      // Calculate m²/L from ft²/gal: (ft²/gal) * (0.092903 m²/ft²) / (3.78541 L/gal)
      const covM2 = (covFt2 * 0.092903 / 3.78541).toFixed(1);

      const covStr =
        sysType === "imperial"
          ? `${covFt2.toFixed(0)} ft²/gal`
          : `${covM2} m²/L`;
      outCov.textContent = `Factory Product Coverage Rate: ${covStr} • Recommended coats: ${d.k}`;
    } else {
      outCov.textContent = "Coverage info not available for this selection.";
    }

    displayAffiliateLinks(paintType, methodType);
  }

  const reset = (msg = "—") => {
    outP.textContent = `Paint Base: ${msg}`;
    outC.textContent = `Converter / Catalyst: ${msg}`;
    outR.textContent = `Reducer: ${msg}`;
    outCov.textContent = "";
    if (affiliateLinksList) affiliateLinksList.innerHTML = ""; 
    if (affiliateLinksContainer) affiliateLinksContainer.style.display = "none"; // Hide container on reset
    calculatedAreaDisplaySpan.textContent = "—"; // Reset calculated area display
  };

  /* listeners */
  sys.addEventListener("change", () => {
    populateLists();
    calc();
  });
  inputMethodRadios.forEach(radio => radio.addEventListener("change", toggleInputMethod));
  inU.addEventListener("change", calc);
  resU.addEventListener("change", calc);
  method.addEventListener("change", calc);
  paint.addEventListener("change", calc);
  val.addEventListener("input", calc);
  lengthInput.addEventListener("input", calc);
  widthInput.addEventListener("input", calc);
  dimensionUnitSelect.addEventListener("change", calc);

  // --- Print Functionality ---
  const printButton = document.getElementById("printButton");
  const qrCodeContainer = document.getElementById("printQrCode");

  if (printButton && qrCodeContainer && typeof QRCode !== "undefined") {
    printButton.addEventListener("click", () => {
      const pageUrl = window.location.href;
      qrCodeContainer.innerHTML = ""; // Clear previous QR code
      new QRCode(qrCodeContainer, {
        text: pageUrl,
        width: 100,
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

  // Initial setup
  populateLists();
  toggleInputMethod(); // Set initial visibility based on default radio
  calc(); // Includes initial reset/hide if value is empty
});


