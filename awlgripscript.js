/* awlgripscript.js - v8 (Corrects 3M Spray Gun Kit affiliate link key to full version) */
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
    inches: "Inches (in)", 
    cm: "Centimeters (cm)" 
  };

  /* coverage ft²/gal + coats */
  const cov = {
    awlgrip: { spray: { c: 542.9, k: 3 }, roll: { c: 814.8, k: 2 } },
    awlcraft2000: { spray: { c: 725.2, k: 3 } }, 
    "545primer": { spray: { c: 317.8, k: 2 }, roll: { c: 635.6, k: 2 } },
  };

  /* DOM */
  const sys = document.getElementById("unitSystem");
  const inputMethodRadios = document.querySelectorAll("input[name=\"inputMethod\"]");
  const areaVolumeInputsDiv = document.getElementById("areaVolumeInputs");
  const lengthWidthInputsDiv = document.getElementById("lengthWidthInputs");
  const inU = document.getElementById("unitType"); 
  const val = document.getElementById("inputValue"); 
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
  const affiliateLinksContainer = document.getElementById("affiliateLinksContainer"); 
  const resultsCard = document.querySelector(".card.mt-4"); 

  /* conversions */
  const cv = {
    squareFootage: { squareMeters: 0.092903 },
    squareMeters: { squareFootage: 10.7639 },
    gallons: { liters: 3.78541, quarts: 4, ounces: 128, ccs: 3785.41 },
    liters: { gallons: 0.264172, quarts: 1.05669, ounces: 33.814, ccs: 1000 },
    quarts: { gallons: 0.25, liters: 0.946353, ounces: 32, ccs: 946.353 },
    ounces: { gallons: 0.0078125, liters: 0.0295735, quarts: 0.03125, ccs: 29.5735 },
    ccs: { gallons: 0.000264172, liters: 0.001, quarts: 0.00105669, ounces: 0.033814 },
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

  function populateLists() {
    const system = sys.value;
    const areaUnit = unitsFor[system].area;
    const volumeUnits = unitsFor[system].volume;
    const dimensionUnits = system === "imperial" ? ["feet", "inches"] : ["meters", "cm"];

    inU.innerHTML = "";
    inU.add(new Option(labels[areaUnit], areaUnit));
    volumeUnits.forEach((u) => inU.add(new Option(labels[u], u)));

    resU.innerHTML = "";
    volumeUnits.forEach((u) => resU.add(new Option(labels[u], u)));

    dimensionUnitSelect.innerHTML = "";
    dimensionUnits.forEach((u) => dimensionUnitSelect.add(new Option(labels[u], u)));
  }

  function toggleInputMethod() {
    const selectedMethod = document.querySelector("input[name=\"inputMethod\"]:checked").value;
    if (selectedMethod === "areaVolume") {
      areaVolumeInputsDiv.style.display = "block";
      lengthWidthInputsDiv.style.display = "none";
    } else { 
      areaVolumeInputsDiv.style.display = "none";
      lengthWidthInputsDiv.style.display = "block";
    }
    calc(); 
  }

  function toggleResRow(isAreaInput) {
    resRow.classList.toggle("d-none", !isAreaInput);
  }

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
      baseKeys = []; // Specific base colors are generally not linked directly here
      converterKey = "awlcraft2000awlgrip_spray_converter_1quart"; 
      reducerKey = "awlcraft2000awlgrip_spray_reducer_1quart"; 
    } else if (paintType === "awlgrip") {
      baseKeys = []; // Specific base colors are generally not linked directly here
      if (methodType === "spray") {
        converterKey = "awlcraft2000awlgrip_spray_converter_1quart"; 
        reducerKey = "awlcraft2000awlgrip_spray_reducer_1quart"; 
      } else { 
        converterKey = "awlgrip_rollbrush_converter_1pint"; 
        reducerKey = "awlgrip_rollbrush_reducer_1quart"; 
      }
    } else if (paintType === "545primer") {
      baseKeys = ["awlgrip_545_primer_base_white_1gallon", "awlgrip_545_primer_base_grey_1gallon"]; 
      converterKey = "awlgrip_545_primer_converter_1gallon";
      if (methodType === "spray") {
        reducerKey = "awlcraft2000awlgrip_spray_reducer_1quart"; 
      } else { 
        reducerKey = "awlgrip_rollbrush_reducer_1quart"; 
      }
    }

    baseKeys.forEach(key => {
        if (affiliateLinksData[key]) linksToShowKeys.add(key);
        else console.warn(`Affiliate link key for base color not found: ${key}`)
    });
    if (converterKey && affiliateLinksData[converterKey]) linksToShowKeys.add(converterKey);
    else if(converterKey) console.warn(`Affiliate link key for converter not found: ${converterKey}`);

    if (reducerKey && affiliateLinksData[reducerKey]) linksToShowKeys.add(reducerKey);
    else if(reducerKey) console.warn(`Affiliate link key for reducer not found: ${reducerKey}`);

    linksToShowKeys.add("latex_gloves");
    linksToShowKeys.add("mixing_sticks_reusable"); 
    linksToShowKeys.add("disposable_paper_cups_125pack"); 
    linksToShowKeys.add("blue_tape_1inch_6pack"); 

    if (methodType === "spray") {
        linksToShowKeys.add("3m_performance_spray_gun_kit"); // Corrected Key to full version
        linksToShowKeys.add("masking_plastic_24inch_with_dispenser"); 
        linksToShowKeys.add("3m_full_face_respirator_large_model_ultimate_fx_ff402_filter_kit_linked_below"); 
    } else { 
        linksToShowKeys.add("foam_rollers_6inch_20pack"); 
        linksToShowKeys.add("roller_tray_with_liners_and_roller_frame_6inch_11pack"); 
    }

    if (linksToShowKeys.size > 0) {
      let hasDisplayedLinks = false;
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
          hasDisplayedLinks = true;
        } else {
            console.warn(`Attempted to render link for key but not found in affiliateLinksData: ${key}`);
        }
      });
      if (hasDisplayedLinks) {
        if (affiliateLinksContainer) affiliateLinksContainer.style.display = "block";
      } else {
        affiliateLinksList.innerHTML = "<li>No specific products found. Check Kits page.</li>";
        if (affiliateLinksContainer) affiliateLinksContainer.style.display = "block";
      }
    } else {
      affiliateLinksList.innerHTML = "<li>No specific products found. Check Kits page.</li>";
      if (affiliateLinksContainer) affiliateLinksContainer.style.display = "block";
    }
  }

  function calc() {
    const selectedInputMethod = document.querySelector("input[name=\"inputMethod\"]:checked").value;
    const sysType = sys.value;
    let paintType = paint.value;
    let methodType = method.value;
    let inVal = 0;
    let inUnit = null;
    let isArea = false;

    const isAwlcraft = paintType === "awlcraft2000";
    method.querySelector("[value=\"roll\"]").disabled = isAwlcraft;
    if (isAwlcraft && methodType === "roll") {
      method.value = "spray"; 
      methodType = method.value; 
    }

    if (selectedInputMethod === "areaVolume") {
        inVal = parseFloat(val.value) || 0;
        inUnit = inU.value;
        isArea = ["squareFootage", "squareMeters"].includes(inUnit);
    } else { 
        const length = parseFloat(lengthInput.value) || 0;
        const width = parseFloat(widthInput.value) || 0;
        const dimUnit = dimensionUnitSelect.value;
        isArea = true; 
        inUnit = unitsFor[sysType].area; 

        if (length > 0 && width > 0) {
            const baseDimUnit = sysType === "imperial" ? "feet" : "meters";
            const lengthBase = convert(length, dimUnit, baseDimUnit);
            const widthBase = convert(width, dimUnit, baseDimUnit);
            
            if (lengthBase !== null && widthBase !== null) {
                const areaBase = lengthBase * widthBase; 
                inVal = areaBase; 
                calculatedAreaDisplaySpan.textContent = `${areaBase.toFixed(2)} ${labels[inUnit]}`;
            } else {
                inVal = 0; 
                calculatedAreaDisplaySpan.textContent = "Error";
            }
        } else {
            inVal = 0;
            calculatedAreaDisplaySpan.textContent = "—";
        }
    }

    toggleResRow(isArea); 

    if (inVal <= 0) {
      reset();
      if(resultsCard) resultsCard.style.display = "block"; 
      return;
    }
    if(resultsCard) resultsCard.style.display = "block"; 
    
    let baseCC;
    if (isArea) {
      const coverageInfo = (cov[paintType] || {})[methodType];
      if (!coverageInfo) {
        reset("—");
        return;
      }
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

    } else { 
      baseCC = convert(inVal, inUnit, "ccs");
    }

    if (baseCC === null || baseCC <= 0) {
      reset("Err");
      return;
    }

    const { conv, red } = ratios(paintType, methodType);
    const convCC = baseCC * conv;
    const redCC = baseCC * red;

    const outUnit = isArea ? resU.value : inUnit; 
    
    const pVol = convert(baseCC, "ccs", outUnit)?.toFixed(2) ?? "Err";
    const cVol = convert(convCC, "ccs", outUnit)?.toFixed(2) ?? "Err";
    const rVol = convert(redCC, "ccs", outUnit)?.toFixed(2) ?? "Err";

    outP.textContent = `Paint Base: ${pVol} ${labels[outUnit]}`;
    outC.textContent = `Converter / Catalyst: ${cVol} ${labels[outUnit]}`;
    outR.textContent = `Reducer: ${rVol} ${labels[outUnit]}`;

    if (cov[paintType] && cov[paintType][methodType]) {
      const d = cov[paintType][methodType];
      const covFt2 = d.c;
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
    if (affiliateLinksContainer) affiliateLinksContainer.style.display = "none"; 
    calculatedAreaDisplaySpan.textContent = "—"; 
  };

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

  const printButton = document.getElementById("printButton");
  const qrCodeContainer = document.getElementById("printQrCode");

  if (printButton && qrCodeContainer && typeof QRCode !== "undefined") {
    printButton.addEventListener("click", () => {
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

  populateLists();
  toggleInputMethod(); 
  calc();
});

