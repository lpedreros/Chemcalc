document.addEventListener("DOMContentLoaded", function() {
  // Unit sets
  var unitsFor = {
    imperial: { area: "squareFootage", volume: ["gallons", "quarts", "ounces"], dimension: "feet" },
    metric: { area: "squareMeters", volume: ["liters", "ccs"], dimension: "meters" }
  };
  
  var labels = {
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

  // Coverage ft²/gal + coats
  var cov = {
    awlgrip: { spray: { c: 542.9, k: 3 }, roll: { c: 814.8, k: 2 } },
    awlcraft2000: { spray: { c: 725.2, k: 3 } },
    "545primer": { spray: { c: 317.8, k: 2 }, roll: { c: 635.6, k: 2 } },
    awlcraftse: { spray: { c: 806.7, k: 2 } },
    awlgriphdtclear: { spray: { c: 537.8, k: 2 } }
  };

  // Products that are spray-only (Roll/Brush disabled)
  var sprayOnlyProducts = ["awlcraft2000", "awlcraftse", "awlgriphdtclear"];

  // DOM elements
  var sys = document.getElementById("unitSystem");
  var inputMethodRadios = document.querySelectorAll("input[name=\"inputMethod\"]");
  var areaVolumeInputsDiv = document.getElementById("areaVolumeInputs");
  var lengthWidthInputsDiv = document.getElementById("lengthWidthInputs");
  var inU = document.getElementById("unitType"); 
  var val = document.getElementById("inputValue"); 
  var lengthInput = document.getElementById("length");
  var widthInput = document.getElementById("width");
  var dimensionUnitSelect = document.getElementById("dimensionUnit");
  var calculatedAreaDisplaySpan = document.getElementById("calculatedAreaDisplay");
  var resRow = document.getElementById("resultUnitRow");
  var resU = document.getElementById("resultUnit");
  var method = document.getElementById("methodType");
  var paint = document.getElementById("paintType");
  var outP = document.getElementById("resultPaint");
  var outPLabel = document.getElementById("resultPaintLabel");
  var outC = document.getElementById("resultConverter");
  var outCLabel = document.getElementById("resultConverterLabel");
  var outR = document.getElementById("resultReducer");
  var outRLabel = document.getElementById("resultReducerLabel");
  var outA = document.getElementById("resultAccelerator");
  var outALabel = document.getElementById("resultAcceleratorLabel");
  var outAccelBox = document.getElementById("resultAcceleratorBox");
  var acceleratorType = document.getElementById("acceleratorType");
  var outCov = document.getElementById("resultCoverage");
  // sr-only, full-labeled-sentence mirrors for email-results.js's
  // injectEmailCaptureUI (see awlgrip.html) -- the visible spans above
  // hold bare values next to a separate .mp-compare-label element,
  // which injectEmailCaptureUI can't see.
  var emailP = document.getElementById("awlgripEmailPaint");
  var emailC = document.getElementById("awlgripEmailConverter");
  var emailR = document.getElementById("awlgripEmailReducer");
  var emailA = document.getElementById("awlgripEmailAccelerator");
  var affiliateLinksList = document.getElementById("affiliateLinksList");
  var affiliateLinksContainer = document.getElementById("affiliateLinksContainer");
  // #resultsCard is a real, stable id on the results section -- the old
  // querySelector(".card.mt-4") silently broke (null-check swallowed it)
  // once the results section stopped carrying that literal Bootstrap
  // class combo in the .mp-* visual rebuild.
  var resultsCard = document.getElementById("resultsCard");

  // affiliate_links.js's Supabase fetch is async and can resolve after this
  // page's own init has already called displayAffiliateLinks() against a
  // still-empty affiliateLinksData -- re-render once the fetch actually
  // completes. Call displayAffiliateLinks(paintType, methodType) directly
  // (not the full calc()) -- calc() also fires a logCalculation() analytics
  // call, which must not run a second time as a side effect of this
  // listener. Derive paintType/methodType the same way calc() does
  // (paint.value / method.value).
  window.addEventListener('affiliateLinksReady', function() {
    displayAffiliateLinks(paint.value, method.value);
  }, { once: true });

  // Conversions
  var cv = {
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
  
  function convert(v, f, t) {
    var n = parseFloat(v);
    if (isNaN(n)) return null;
    if (f === t) return n;
    var r = (cv[f] || {})[t];
    return r ? n * r : null;
  }

  // Ratios
  function ratios(p, m) {
    switch (p) {
      case "545primer":
        return { conv: 1, red: m === "spray" ? 0.25 : 0.10 };
      case "awlgrip":
        return { conv: m === "spray" ? 1 : 0.5, red: m === "spray" ? 0.25 : 0.2 };
      case "awlcraft2000":
        // TDS-confirmed 2:1 base:G3010 converter (both former 2000/3000 lines).
        // Reducer is a range, "up to 33%, varies color to color" per TDS — slider,
        // read literally as a fraction of base (no derived conversion).
        var pct = parseFloat((document.getElementById("reducerPercent") || {}).value) || 25;
        return { conv: 0.5, red: pct / 100 };
      // ── New products ──────────────────────────────────────
      case "awlcraftse":
        // TDS-confirmed fixed ratio, 100:15:50 (Base:Converter:Reducer),
        // reducers T0001/T0003/T0005, no accelerator.
        return { conv: 0.15, red: 0.50 };
      case "awlgriphdtclear":
        // TDS: 1:1:12.5% (Base:Curing Solution:Activator) = 1:1:0.25
        return { conv: 1, red: 0.25 };
      default:
        return { conv: 0, red: 0 };
    }
  }

  function populateLists() {
    var system = sys.value;
    var areaUnit = unitsFor[system].area;
    var volumeUnits = unitsFor[system].volume;
    var dimensionUnits = system === "imperial" ? ["feet", "inches"] : ["meters", "cm"];

    inU.innerHTML = "";
    inU.add(new Option(labels[areaUnit], areaUnit));
    volumeUnits.forEach(function(u) { 
      inU.add(new Option(labels[u], u));
    });

    resU.innerHTML = "";
    volumeUnits.forEach(function(u) { 
      resU.add(new Option(labels[u], u));
    });

    dimensionUnitSelect.innerHTML = "";
    dimensionUnits.forEach(function(u) { 
      dimensionUnitSelect.add(new Option(labels[u], u));
    });
  }

  function toggleInputMethod() {
    var selectedMethod = document.querySelector("input[name=\"inputMethod\"]:checked").value;
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
    if (isAreaInput) {
      resRow.classList.remove("d-none");
    } else {
      resRow.classList.add("d-none");
    }
  }

  function displayAffiliateLinks(paintType, methodType) {
    if (!affiliateLinksList || !affiliateLinksContainer || typeof affiliateLinksData === "undefined") {
      console.error("Affiliate links container or data not found.");
      if (affiliateLinksContainer) affiliateLinksContainer.style.display = "none";
      return;
    }

    affiliateLinksList.innerHTML = ""; 
    var linksToShowKeys = [];

    var baseKeys = [];
    var converterKey = null;
    var reducerKey = null;

    if (paintType === "awlcraft2000") {
      baseKeys = [];
      converterKey = "awlcraft2000awlgrip_spray_converter_1quart"; 
      reducerKey = "awlcraft2000awlgrip_spray_reducer_1quart"; 
    } else if (paintType === "awlgrip") {
      baseKeys = [];
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
    } else if (paintType === "awlcraftse") {
      baseKeys = [];
      converterKey = "awlcraft2000awlgrip_spray_converter_1quart";
      reducerKey = "awlcraft2000awlgrip_spray_reducer_1quart";
    } else if (paintType === "awlgriphdtclear") {
      baseKeys = [];
      converterKey = null;
      reducerKey = null;
    }

    baseKeys.forEach(function(key) {
      if (affiliateLinksData[key]) {
        linksToShowKeys.push(key);
      } else {
        console.warn("Affiliate link key for base color not found: " + key);
      }
    });
    
    if (converterKey && affiliateLinksData[converterKey]) {
      linksToShowKeys.push(converterKey);
    } else if(converterKey) {
      console.warn("Affiliate link key for converter not found: " + converterKey);
    }

    if (reducerKey && affiliateLinksData[reducerKey]) {
      linksToShowKeys.push(reducerKey);
    } else if(reducerKey) {
      console.warn("Affiliate link key for reducer not found: " + reducerKey);
    }

    linksToShowKeys.push("latex_gloves");
    linksToShowKeys.push("mixing_sticks_reusable"); 
    linksToShowKeys.push("disposable_paper_cups_125pack"); 
    linksToShowKeys.push("blue_tape_1inch_6pack"); 

    if (methodType === "spray") {
      linksToShowKeys.push("3m_performance_spray_gun_kit");
      linksToShowKeys.push("masking_plastic_24inch_with_dispenser"); 
      linksToShowKeys.push("3m_full_face_respirator_large_model_ultimate_fx_ff402_filter_kit_linked_below"); 
    } else { 
      linksToShowKeys.push("foam_rollers_6inch_20pack"); 
      linksToShowKeys.push("roller_tray_with_liners_and_roller_frame_6inch_11pack"); 
    }

    if (linksToShowKeys.length > 0) {
      var hasDisplayedLinks = false;
      linksToShowKeys.forEach(function(key) {
        var linkData = affiliateLinksData[key];
        if (linkData && linkData.url && linkData.name) {
          var li = document.createElement("li");
          var a = document.createElement("a");
          a.href = linkData.url;
          a.textContent = linkData.name;
          a.target = "_blank";
          a.rel = "noopener noreferrer sponsored";
          li.appendChild(a);
          affiliateLinksList.appendChild(li);
          hasDisplayedLinks = true;
        } else {
          console.warn("Attempted to render link for key but not found in affiliateLinksData: " + key);
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
    var selectedInputMethod = document.querySelector("input[name=\"inputMethod\"]:checked").value;
    var sysType = sys.value;
    var paintType = paint.value;
    var methodType = method.value;
    var inVal = 0;
    var inUnit = null;
    var isArea = false;

    // Disable Roll/Brush for spray-only products
    var isSprayOnly = sprayOnlyProducts.indexOf(paintType) !== -1;
    method.querySelector("[value=\"roll\"]").disabled = isSprayOnly;
    if (isSprayOnly && methodType === "roll") {
      method.value = "spray"; 
      methodType = method.value; 
    }

    // Show/hide Awlcraft 2000/3000 reducer slider
    var reducerPercentRow = document.getElementById("reducerPercentRow");
    if (reducerPercentRow) {
      reducerPercentRow.style.display = (paintType === "awlcraft2000") ? "block" : "none";
    }
    // Show/hide Awlcraft 2000/3000 Accelerator (Pro-Cure X-98/X-138)
    // type toggle -- same gate the accelerator result box below uses.
    var acceleratorTypeRow = document.getElementById("acceleratorTypeRow");
    if (acceleratorTypeRow) {
      acceleratorTypeRow.style.display = (paintType === "awlcraft2000") ? "block" : "none";
    }
    // Show/hide product-specific notes
    var noteAwlcraftSE = document.getElementById("productNoteAwlcraftSE");
    var noteHDTClear = document.getElementById("productNoteHDTClear");
    if (noteAwlcraftSE) noteAwlcraftSE.style.display = (paintType === "awlcraftse") ? "block" : "none";
    if (noteHDTClear) noteHDTClear.style.display = (paintType === "awlgriphdtclear") ? "block" : "none";

    if (selectedInputMethod === "areaVolume") {
      inVal = parseFloat(val.value) || 0;
      inUnit = inU.value;
      isArea = ["squareFootage", "squareMeters"].indexOf(inUnit) !== -1;
    } else { 
      var length = parseFloat(lengthInput.value) || 0;
      var width = parseFloat(widthInput.value) || 0;
      var dimUnit = dimensionUnitSelect.value;
      isArea = true; 
      inUnit = unitsFor[sysType].area; 

      if (length > 0 && width > 0) {
        var baseDimUnit = sysType === "imperial" ? "feet" : "meters";
        var lengthBase = convert(length, dimUnit, baseDimUnit);
        var widthBase = convert(width, dimUnit, baseDimUnit);
        
        if (lengthBase !== null && widthBase !== null) {
          var areaBase = lengthBase * widthBase; 
          inVal = areaBase; 
          calculatedAreaDisplaySpan.textContent = areaBase.toFixed(2) + " " + labels[inUnit];
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
    
    var baseCC;
    if (isArea) {
      var coverageInfo = (cov[paintType] || {})[methodType];
      if (!coverageInfo) {
        reset("—");
        return;
      }
      var areaFt2 = inUnit === "squareFootage" ? inVal : convert(inVal, "squareMeters", "squareFootage");

      if (areaFt2 === null) {
        reset("Err");
        return;
      }

      var totalGallonsMixed = (areaFt2 / coverageInfo.c) * coverageInfo.k;
      var totalCCMixed = convert(totalGallonsMixed, "gallons", "ccs");

      var ratioData = ratios(paintType, methodType);
      var conv = ratioData.conv;
      var red = ratioData.red;
      var totalParts = 1 + conv + red;
      baseCC = totalCCMixed / totalParts;

    } else { 
      baseCC = convert(inVal, inUnit, "ccs");
    }

    if (baseCC === null || baseCC <= 0) {
      reset("Err");
      return;
    }

    var ratioData = ratios(paintType, methodType);
    var conv = ratioData.conv;
    var red = ratioData.red;
    var convCC = baseCC * conv;
    var redCC = baseCC * red;

    // Calculate accelerator for Awlcraft 2000 only -- Pro-Cure X-98
    // (default) or X-138, per #acceleratorType.
    // X-98:  0.5 fl oz per 2 gallons (256 fl oz) of mixed topcoat (base + converter) -> 0.5/256 = 0.001953125
    // X-138: 1 fl oz per 2 gallons (256 fl oz) of mixed topcoat -> 1/256 = 0.00390625
    var mixedTopcoatCC = baseCC + convCC; // base + converter (before reducer)
    var acceleratorRatio = (acceleratorType && acceleratorType.value === "x138")
      ? 0.00390625
      : 0.001953125; // fl oz accelerator per fl oz mixed topcoat
    var mixedTopcoatOunces = convert(mixedTopcoatCC, "ccs", "ounces");
    var acceleratorOunces = mixedTopcoatOunces * acceleratorRatio;
    var acceleratorCC = convert(acceleratorOunces, "ounces", "ccs");

    var outUnit = isArea ? resU.value : inUnit; 
    
    var pVol = convert(baseCC, "ccs", outUnit);
    var cVol = convert(convCC, "ccs", outUnit);
    var rVol = convert(redCC, "ccs", outUnit);

    // pVol/cVol/rVol keep holding the raw numbers (used by the analytics
    // block further down) -- the formatted display strings go into their
    // own *Str variables instead of overwriting them.
    var pVolStr = pVol ? pVol.toFixed(2) : "Err";
    var cVolStr = cVol ? cVol.toFixed(2) : "Err";
    var rVolStr = rVol ? rVol.toFixed(2) : "Err";

    // Product-specific result labels, including real AkzoNobel part
    // numbers so users know exactly what to buy. Base labels never carry
    // a specific color/tint code for Awlgrip Topcoat, Awlcraft 2000/3000,
    // or Awlcraft SE -- these are custom-tinted (Awlmix) products with no
    // single fixed part number; "no fixed code" is the
    // correct, complete answer there, not a gap. 545 Epoxy Primer is the
    // one product with fixed base codes (no color-tinting/Awlmix step),
    // so both stocked colors are listed since there's no color selector
    // in this UI to pick one.
    var baseLabel = "Paint Base";
    var convLabel = "Converter / Catalyst";
    var redLabel = "Reducer";
    if (paintType === "545primer") {
      baseLabel = "545 Primer Base (D8001 White / D1001 Grey)";
      convLabel = "545 Primer Converter (D3001)";
      redLabel = methodType === "spray" ? "Reducer (T0006)" : "Reducer (T0031)";
    } else if (paintType === "awlgrip") {
      convLabel = methodType === "spray" ? "Awlcat #2 (G3010) Converter" : "Awlcat #3 (H3002) Brushing Converter";
      redLabel = methodType === "spray" ? "Reducer (T0001/T0002/T0003/T0005)" : "Reducer (T0031)";
    } else if (paintType === "awlcraft2000") {
      baseLabel = "Awlcraft 2000/3000 Base";
      convLabel = "Awlcat #2 (G3010) Converter";
      redLabel = "Reducer (T0001/T0002/T0003/T0005, " + ((document.getElementById("reducerPercent") || {}).value || 25) + "%)";
    } else if (paintType === "awlcraftse") {
      baseLabel = "Awlcraft SE Basecoat";
      convLabel = "Awlcat #2 (G3010) Converter";
      redLabel = "Reducer (T0001/T0003/T0005)";
    } else if (paintType === "awlgriphdtclear") {
      baseLabel = "HDT Clear Base (OC0300)";
      convLabel = "Curing Solution (OC0010)";
      redLabel = "Activator";
    }

    // Label/value split (visual rebuild only -- see build report): these
    // used to write one combined sentence ("Paint Base: 12.34 oz") into
    // a single element. The results panel now has a separate
    // .mp-compare-label element per row for the (genuinely per-product
    // dynamic) label, so label and value are written separately here.
    outPLabel.textContent = baseLabel;
    outP.textContent = pVolStr + " " + labels[outUnit];
    outCLabel.textContent = convLabel;
    outC.textContent = cVolStr + " " + labels[outUnit];
    outRLabel.textContent = redLabel;
    outR.textContent = rVolStr + " " + labels[outUnit];

    // sr-only email mirrors: full labeled sentences, same label/value
    // pair as the visible spans just above.
    emailP.textContent = baseLabel + ": " + pVolStr + " " + labels[outUnit];
    emailC.textContent = convLabel + ": " + cVolStr + " " + labels[outUnit];
    emailR.textContent = redLabel + ": " + rVolStr + " " + labels[outUnit];

    // Show accelerator only for Awlcraft 2000, always in mL for easier
    // measurement. Accelerator name follows the same dynamic-label style
    // as baseLabel/convLabel/redLabel above -- Pro-Cure X-98 (default)
    // or X-138, per #acceleratorType.
    if (paintType === "awlcraft2000") {
      var aVolML = acceleratorCC ? acceleratorCC.toFixed(2) : "Err";
      var acceleratorName = "Pro-Cure X-98";
      if (acceleratorType && acceleratorType.value === "x138") {
        acceleratorName = "Pro-Cure X-138";
      }
      var acceleratorLabel = "Accelerator (" + acceleratorName + ")";

      outALabel.textContent = acceleratorLabel;
      outA.textContent = aVolML + " mL";
      outA.style.display = "block";
      outAccelBox.style.display = "block";
      emailA.textContent = acceleratorLabel + ": " + aVolML + " mL";
      emailA.style.display = "block";
      // Print-letterhead accelerator label -- the rest of that row
      // (value + show/hide) is synced by awlgrip-print-summary.js from
      // #resultAccelerator/#resultAcceleratorBox as before; this label
      // text doesn't change on its own timer, so it's simplest to set
      // it directly here, once, alongside its two other mirrors above.
      var printAccelLabelEl = document.getElementById("awlgripPrintRecapAcceleratorLabel");
      if (printAccelLabelEl) printAccelLabelEl.textContent = acceleratorLabel;
    } else {
      outA.style.display = "none";
      outAccelBox.style.display = "none";
      emailA.style.display = "none";
    }

    if (cov[paintType] && cov[paintType][methodType]) {
      var d = cov[paintType][methodType];
      var covFt2 = d.c;
      var covM2 = (covFt2 * 0.092903 / 3.78541).toFixed(1);

      var covStr = sysType === "imperial" ? 
        covFt2.toFixed(0) + " ft²/gal" : 
        covM2 + " m²/L";
      outCov.textContent = "Factory Product Coverage Rate: " + covStr + " • Recommended coats: " + d.k;
    } else {
      outCov.textContent = "Coverage info not available for this selection.";
    }

    displayAffiliateLinks(paintType, methodType);

    // ── Analytics: log this calculation (fire-and-forget) ──
    // Guard: only log when user has entered a real input value
    if (typeof logCalculation === 'function' && inVal > 0) {
      const CC = window.CC_UNITS;
      const areaUnitMap = { squareFootage: CC.FT2, squareMeters: CC.M2 };
      // "ccs" displays as "mL (cc)" in this file's own labels table above
      // -- maps to ML (not CCS) to match what's actually shown, same as
      // the hardcoded-mL accelerator value below.
      const volUnitMap = { gallons: CC.GAL, quarts: CC.QT, ounces: CC.FLOZ, liters: CC.L, ccs: CC.ML };
      const inputValueUnit = isArea ? areaUnitMap[inUnit] : volUnitMap[inUnit];
      const outputUnit = volUnitMap[outUnit];
      const _ccInputs = {
        paintType:   paintType,
        methodType:  methodType,
        inputMethod: selectedInputMethod,
        // areaFt2 (area path) / baseCC (direct-volume-entry path) are
        // canonical values the calculator already computed above -- not
        // re-derived here.
        inputValue:  isArea
          ? { value: inVal, unit: inputValueUnit, base: areaFt2, baseUnit: CC.FT2 }
          : { value: inVal, unit: inputValueUnit, base: baseCC, baseUnit: CC.CCS },
        unitSystem:  sysType,
        acceleratorType: acceleratorType.value
      };
      const _ccResults = {
        // pVol/cVol/rVol are the raw numbers convert() returned, before
        // .toFixed(2) formatted them into pVolStr/cVolStr/rVolStr above
        // for display -- not parsed back out of the display strings.
        paintBase:   { value: pVol, unit: outputUnit, base: baseCC, baseUnit: CC.CCS },
        converter:   { value: cVol, unit: outputUnit, base: convCC, baseUnit: CC.CCS },
        reducer:     { value: rVol, unit: outputUnit, base: redCC, baseUnit: CC.CCS },
        accelerator: (paintType === 'awlcraft2000') ? { value: acceleratorCC, unit: CC.ML } : null,
        // cov[paintType][methodType].c/.k are the fixed ft²/gal coverage
        // rate and recommended-coat count from the product-spec table
        // above -- a lookup, not something derived from this
        // calculation. No single CC_UNITS entry represents a compound
        // rate (ft² per gal), so the field name itself carries that unit
        // instead of forcing it into {value, unit}.
        coverage: (cov[paintType] && cov[paintType][methodType]) ? {
          coverageFt2PerGal: cov[paintType][methodType].c,
          recommendedCoats: { value: cov[paintType][methodType].k, unit: CC.COUNT }
        } : null
      };
      logCalculation('awlgrip', _ccInputs, _ccResults);
      // Cached for Print/Email Me to log this settled answer immediately
      // (see calc-tracker.js's logCalculation immediate=true path).
      window._ccLastCalc = { calculator: 'awlgrip', inputs: _ccInputs, results: _ccResults };
    }
  }

  function reset(msg) {
    if (!msg) msg = "—";
    outPLabel.textContent = "Paint Base";
    outP.textContent = msg;
    outCLabel.textContent = "Converter / Catalyst";
    outC.textContent = msg;
    outRLabel.textContent = "Reducer";
    outR.textContent = msg;
    emailP.textContent = "Paint Base: " + msg;
    emailC.textContent = "Converter / Catalyst: " + msg;
    emailR.textContent = "Reducer: " + msg;
    outA.style.display = "none";
    outAccelBox.style.display = "none";
    emailA.style.display = "none";
    outCov.textContent = "";
    if (affiliateLinksList) affiliateLinksList.innerHTML = ""; 
    if (affiliateLinksContainer) affiliateLinksContainer.style.display = "none"; 
    calculatedAreaDisplaySpan.textContent = "—"; 
  }

  sys.addEventListener("change", function() {
    populateLists();
    calc();
  });
  
  for (var i = 0; i < inputMethodRadios.length; i++) {
    inputMethodRadios[i].addEventListener("change", toggleInputMethod);
  }
  
  inU.addEventListener("change", calc);
  resU.addEventListener("change", calc);
  method.addEventListener("change", calc);
  paint.addEventListener("change", calc);
  if (acceleratorType) acceleratorType.addEventListener("change", calc);
  // Awlcraft 2000/3000 reducer slider
  var reducerSlider = document.getElementById("reducerPercent");
  var reducerSliderLabel = document.getElementById("reducerPercentValue");
  if (reducerSlider) {
    reducerSlider.addEventListener("input", function() {
      if (reducerSliderLabel) reducerSliderLabel.textContent = reducerSlider.value;
      calc();
    });
  }
  val.addEventListener("input", calc);
  lengthInput.addEventListener("input", calc);
  widthInput.addEventListener("input", calc);
  dimensionUnitSelect.addEventListener("change", calc);

  var printButton = document.getElementById("printButton");
  var qrCodeContainer = document.getElementById("printQrCode");

  if (printButton && qrCodeContainer && typeof QRCode !== "undefined") {
    printButton.addEventListener("click", function() {
      if (window._ccLastCalc && typeof logCalculation === 'function') {
        logCalculation(window._ccLastCalc.calculator, window._ccLastCalc.inputs, window._ccLastCalc.results, true);
      }
      var pageUrl = window.location.href;
      qrCodeContainer.innerHTML = ""; 
      new QRCode(qrCodeContainer, {
        text: pageUrl,
        width: 100,
        height: 100,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
      });
      
      setTimeout(function() {
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

