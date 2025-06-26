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
    "545primer": { spray: { c: 317.8, k: 2 }, roll: { c: 635.6, k: 2 } }
  };

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
  var outC = document.getElementById("resultConverter");
  var outR = document.getElementById("resultReducer");
  var outA = document.getElementById("resultAccelerator");
  var outCov = document.getElementById("resultCoverage");
  var affiliateLinksList = document.getElementById("affiliateLinksList"); 
  var affiliateLinksContainer = document.getElementById("affiliateLinksContainer"); 
  var resultsCard = document.querySelector(".card.mt-4"); 

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
        return { conv: 1, red: m === "spray" ? 0.25 : 0.15 };
      case "awlgrip":
        return { conv: m === "spray" ? 1 : 0.5, red: m === "spray" ? 0.25 : 0.2 };
      case "awlcraft2000":
        return { conv: 0.5, red: 0.33 };
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

    var isAwlcraft = paintType === "awlcraft2000";
    method.querySelector("[value=\"roll\"]").disabled = isAwlcraft;
    if (isAwlcraft && methodType === "roll") {
      method.value = "spray"; 
      methodType = method.value; 
    }

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

    // Calculate accelerator for Awlcraft 2000 only
    // Pro-Cure X-98: 0.5 fl oz per 2 gallons (256 fl oz) of mixed topcoat (base + converter)
    // Ratio: 0.5 / 256 = 0.001953125 fl oz accelerator per 1 fl oz mixed topcoat
    var mixedTopcoatCC = baseCC + convCC; // base + converter (before reducer)
    var acceleratorRatio = 0.001953125; // fl oz accelerator per fl oz mixed topcoat
    var mixedTopcoatOunces = convert(mixedTopcoatCC, "ccs", "ounces");
    var acceleratorOunces = mixedTopcoatOunces * acceleratorRatio;
    var acceleratorCC = convert(acceleratorOunces, "ounces", "ccs");

    var outUnit = isArea ? resU.value : inUnit; 
    
    var pVol = convert(baseCC, "ccs", outUnit);
    var cVol = convert(convCC, "ccs", outUnit);
    var rVol = convert(redCC, "ccs", outUnit);
    
    pVol = pVol ? pVol.toFixed(2) : "Err";
    cVol = cVol ? cVol.toFixed(2) : "Err";
    rVol = rVol ? rVol.toFixed(2) : "Err";

    outP.textContent = "Paint Base: " + pVol + " " + labels[outUnit];
    outC.textContent = "Converter / Catalyst: " + cVol + " " + labels[outUnit];
    outR.textContent = "Reducer: " + rVol + " " + labels[outUnit];

    // Show accelerator only for Awlcraft 2000, always in mL for easier measurement
    if (paintType === "awlcraft2000") {
      var aVolML = acceleratorCC ? acceleratorCC.toFixed(2) : "Err";
      outA.textContent = "Accelerator (Pro-Cure X-98): " + aVolML + " mL";
      outA.style.display = "block";
    } else {
      outA.style.display = "none";
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
  }

  function reset(msg) {
    if (!msg) msg = "—";
    outP.textContent = "Paint Base: " + msg;
    outC.textContent = "Converter / Catalyst: " + msg;
    outR.textContent = "Reducer: " + msg;
    outA.style.display = "none";
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
  val.addEventListener("input", calc);
  lengthInput.addEventListener("input", calc);
  widthInput.addEventListener("input", calc);
  dimensionUnitSelect.addEventListener("change", calc);

  var printButton = document.getElementById("printButton");
  var qrCodeContainer = document.getElementById("printQrCode");

  if (printButton && qrCodeContainer && typeof QRCode !== "undefined") {
    printButton.addEventListener("click", function() {
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

