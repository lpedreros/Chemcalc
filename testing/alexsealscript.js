// alexsealscript.js
// Alexseal Yacht Coatings Calculator -- Premium Topcoat 501, Finish Primer
// 442, Protective Primer 161 (Round 1 -- see build dispatch; HS Base Coat,
// fairing compounds and the interior line are explicitly out of scope).
//
// Structure follows awlgripscript.js directly: same unitsFor/labels/cv
// conversion tables, the same area/volume-vs-length-width dual input
// engine, and the same ratios()-driven base/converter/reducer split. Unlike
// awlgripscript.js, every product here uses an ADJUSTABLE reducer slider
// (not just one product), so the reducer fraction is read live from the
// slider on every calc() rather than being a fixed per-product constant.
//
// Toggle-button-syncs-to-hidden-select shims (Measurement System, Coating
// Amount input method, Application Method) are folded directly into this
// file's own DOMContentLoaded handler -- same "no separate -ui.js file
// needed" approach epifanesScript.js already uses for its one toggle, just
// covering three toggles instead of one. Likewise, print/QR is handled
// inline (epifanesScript.js's pattern) rather than via a separate branded
// letterhead file like awlgrip-print-summary.js -- the visible results
// panel (.printable-section) is what prints, with #printQrCode injected
// into it.
//
// COATS COUNT -- deliberately different from awlgripscript.js's cov{}:
// Alexseal's Coverage-table ft²/gal figures are used directly with NO
// per-coat multiplier (totalGallonsMixed = areaFt2 / c). Scout's TDS
// research found the coverage figures relate inconsistently to the stated
// per-coat/total buildup across these three products -- multiplying by a
// coat count risks a 2-3x sizing error either way. "Recommended coats" is
// shown as informational text only, never fed into the volume math.

document.addEventListener("DOMContentLoaded", function() {
  // ── Unit sets (identical to awlgripscript.js) ──────────────────────
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

  // ── Coverage ft²/gal -- NO "k" (coats) factor, see file header ──────
  var cov = {
    "501": { spray: { c: 146 }, brush: { c: 244 } },
    "442": { spray: { c: 120 }, brush: { c: 225 } },
    "161": { spray: { c: 100 }, brush: { c: 142 } }
  };

  // Recommended-coats copy, shown next to Coverage -- informational text
  // only, exact TDS wording (161's "1 cross coat or 2 coats" is real, not
  // a paraphrase -- see dispatch). Never multiplied into the volume math.
  var recommendedText = {
    "501": "Recommended coats: 2-3.",
    "442": "Recommended coats: 2-3.",
    "161": "Recommended application: 1 cross coat or 2 coats."
  };

  // ── Reducer slider range per product+method (TDS-sourced) ───────────
  // Every product here gets an adjustable slider (unlike awlgripscript.js,
  // where only Awlcraft 2000/3000 has one) -- range and default change
  // per product, and for 501 specifically, per method too.
  var reducerConfig = {
    "501|spray": { min: 30, max: 37.5, step: 0.5, def: 34 },
    "501|brush": { min: 16, max: 33, step: 0.5, def: 25 },
    "442|spray": { min: 15, max: 25, step: 0.5, def: 20 },
    "442|brush": { min: 15, max: 25, step: 0.5, def: 20 },
    "161|spray": { min: 5, max: 25, step: 0.5, def: 7.5 },
    "161|brush": { min: 5, max: 25, step: 0.5, def: 7.5 }
  };

  function reducerHintText(product, method) {
    if (product === "501") {
      return method === "spray"
        ? "Spray: 30–37.5% by volume of base + converter. Brush/Roll uses a different range and a different converter (C5012)."
        : "Brush/Roll: 16–33% by volume of base + converter, with Converter Brush (C5012) — a different product from the spray converter (C5051).";
    }
    if (product === "442") {
      return "Typical range 15–25% by volume of base + converter. Checking “Add Accelerator” below replaces the separate reducer amount entirely — Alexseal’s own TDS worked example uses A4429 alone, with no separate reducer line.";
    }
    return "Typical range 5–10% by volume. Up to 25% is supported for special application, per Alexseal’s TDS.";
  }

  // Base:converter ratio (relative to base = 1), independent of the
  // reducer slider. 501's brush ratio (2:1) mirrors awlgripscript.js's own
  // Awlgrip Topcoat brush case (conv: 0.5) -- same structural pattern.
  function converterRatio(product, method) {
    if (product === "501") return method === "spray" ? 1 : 0.5;
    if (product === "442") return 1;
    if (product === "161") return 1 / 6;
    return 0;
  }

  function converterLabel(product, method) {
    if (product === "501") {
      return method === "spray" ? "Topcoat Converter Spray (C5051)" : "Topcoat Converter Brush (C5012)";
    }
    if (product === "442") return "Finish Primer Converter (C4427)";
    if (product === "161") return "Protective Primer Converter (C1617)";
    return "Converter";
  }

  function baseLabel(product) {
    if (product === "501") return "Premium Topcoat 501 Base";
    if (product === "442") return "Finish Primer 442 Base";
    if (product === "161") return "Protective Primer 161 Base";
    return "Paint Base";
  }

  // Accelerator applicability: 501 is spray-only (A5035); 442 applies to
  // both methods (A4429); 161 has no accelerator at all -- no row shown.
  function acceleratorApplicable(product, method) {
    if (product === "501") return method === "spray";
    if (product === "442") return true;
    return false;
  }

  function acceleratorProductLabel(product) {
    return product === "501" ? "Accelerator (A5035)" : "Accelerator (A4429)";
  }

  // DOM elements
  var sys = document.getElementById("unitSystem");
  var sysButtons = Array.prototype.slice.call(document.querySelectorAll(".mp-unit-btn[data-system]"));
  var inputMethodRadios = document.querySelectorAll("input[name=\"inputMethod\"]");
  var inputMethodButtons = Array.prototype.slice.call(document.querySelectorAll(".mp-unit-btn[data-input]"));
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
  var methodButtons = Array.prototype.slice.call(document.querySelectorAll(".mp-unit-btn[data-appmethod]"));
  var product = document.getElementById("alexsealProduct");
  var outP = document.getElementById("resultPaint");
  var outPLabel = document.getElementById("resultPaintLabel");
  var outC = document.getElementById("resultConverter");
  var outCLabel = document.getElementById("resultConverterLabel");
  var outR = document.getElementById("resultReducer");
  var outRLabel = document.getElementById("resultReducerLabel");
  var outA = document.getElementById("resultAccelerator");
  var outALabel = document.getElementById("resultAcceleratorLabel");
  var outAccelBox = document.getElementById("resultAcceleratorBox");
  var outCov = document.getElementById("resultCoverage");
  var emailP = document.getElementById("alexsealEmailPaint");
  var emailC = document.getElementById("alexsealEmailConverter");
  var emailR = document.getElementById("alexsealEmailReducer");
  var emailA = document.getElementById("alexsealEmailAccelerator");
  var affiliateLinksList = document.getElementById("affiliateLinksList");
  var affiliateLinksContainer = document.getElementById("affiliateLinksContainer");
  var resultsCard = document.getElementById("resultsCard");

  var reducerRow = document.getElementById("reducerPercentRow");
  var reducerSlider = document.getElementById("reducerPercent");
  var reducerSliderLabel = document.getElementById("reducerPercentValue");
  var reducerScaleMin = document.getElementById("reducerScaleMin");
  var reducerScaleMid = document.getElementById("reducerScaleMid");
  var reducerScaleMax = document.getElementById("reducerScaleMax");
  var reducerHint = document.getElementById("reducerHint");

  var acceleratorRow = document.getElementById("acceleratorRow");
  var acceleratorCheckbox = document.getElementById("acceleratorEnabled");
  var acceleratorCheckboxLabel = document.getElementById("acceleratorEnabledLabel");

  var note442 = document.getElementById("alexsealNote442Metal");

  if (!sys || !method || !product || !reducerSlider || !outP || !outC || !outR || !outCov) {
    console.error("One or more essential DOM elements for the Alexseal calculator are missing. Functionality may be impaired.");
    if (affiliateLinksContainer) affiliateLinksContainer.style.display = "none";
    return;
  }

  // affiliate_links.js's Supabase fetch is async and can resolve after this
  // page's own init has already called displayAffiliateLinks() against a
  // still-empty affiliateLinksData -- re-render once the fetch actually
  // completes (same pattern as awlgripscript.js/epifanesScript.js).
  window.addEventListener('affiliateLinksReady', function() {
    displayAffiliateLinks(product.value, method.value);
  }, { once: true });

  // ── Conversions (identical to awlgripscript.js) ─────────────────────
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
    inches: { feet: 1 / 12, meters: 0.0254 },
    cm: { meters: 0.01, feet: 0.0328084 }
  };

  function convert(v, f, t) {
    var n = parseFloat(v);
    if (isNaN(n)) return null;
    if (f === t) return n;
    var r = (cv[f] || {})[t];
    return r ? n * r : null;
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

  // ── Reducer slider range/default -- re-applied only when the
  // product|method combo actually changes, so an in-progress manual
  // adjustment isn't clobbered by an unrelated recalculation. ──────────
  var lastReducerKey = null;
  function updateReducerRange(productType, methodType) {
    var key = productType + "|" + methodType;
    var cfg = reducerConfig[key];
    if (!cfg) return;
    if (key !== lastReducerKey) {
      reducerSlider.min = cfg.min;
      reducerSlider.max = cfg.max;
      reducerSlider.step = cfg.step;
      reducerSlider.value = cfg.def;
      if (reducerSliderLabel) reducerSliderLabel.textContent = cfg.def;
      lastReducerKey = key;
    }
    if (reducerScaleMin) reducerScaleMin.textContent = cfg.min + "%";
    if (reducerScaleMax) reducerScaleMax.textContent = cfg.max + "%";
    if (reducerScaleMid) reducerScaleMid.textContent = ((cfg.min + cfg.max) / 2).toFixed(1) + "%";
    if (reducerHint) reducerHint.textContent = reducerHintText(productType, methodType);
    updateReducerSliderGradient();
  }

  function updateReducerSliderGradient() {
    var min = parseFloat(reducerSlider.min) || 0;
    var max = parseFloat(reducerSlider.max) || 100;
    var value = parseFloat(reducerSlider.value);
    if (isNaN(value)) value = min;
    var pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
    reducerSlider.style.setProperty("--slider-fill", pct + "%");
  }

  // ── Affiliate links -- structure copied directly from
  // awlgripscript.js's displayAffiliateLinks(), per dispatch. TIER 1
  // (Alexseal-branded consumables) keys don't exist in affiliate_materials
  // yet (confirmed 2026-09-27) -- they degrade gracefully (console.warn +
  // skip), same as any other missing key; no placeholder URLs inserted.
  // TIER 2 (generic tools/materials) keys are the exact same real,
  // confirmed-live set awlgripscript.js already uses for Awlgrip Topcoat. */
  function displayAffiliateLinks(productType, methodType) {
    if (!affiliateLinksList || !affiliateLinksContainer || typeof affiliateLinksData === "undefined") {
      console.error("Affiliate links container or data not found.");
      if (affiliateLinksContainer) affiliateLinksContainer.style.display = "none";
      return;
    }

    affiliateLinksList.innerHTML = "";
    var linksToShowKeys = [];

    // TIER 1 -- Alexseal-branded consumables (unlinked for now, see file header)
    var baseKey = null, converterKey = null, reducerKey = null, acceleratorKey = null;
    if (productType === "501") {
      baseKey = "alexseal_501_base";
      converterKey = methodType === "spray" ? "alexseal_501_converter_spray" : "alexseal_501_converter_brush";
      reducerKey = "alexseal_501_reducer";
      if (methodType === "spray") acceleratorKey = "alexseal_501_accelerator_a5035";
    } else if (productType === "442") {
      baseKey = "alexseal_442_base";
      converterKey = "alexseal_442_converter";
      reducerKey = "alexseal_442_reducer";
      acceleratorKey = "alexseal_442_accelerator_a4429";
    } else if (productType === "161") {
      baseKey = "alexseal_161_base";
      converterKey = "alexseal_161_converter";
      reducerKey = "alexseal_161_reducer";
    }

    [baseKey, converterKey, reducerKey, acceleratorKey].forEach(function(key) {
      if (!key) return;
      if (affiliateLinksData[key]) {
        linksToShowKeys.push(key);
      } else {
        console.warn("Affiliate link key not found (expected -- not yet added to affiliate_materials): " + key);
      }
    });

    // TIER 2 -- generic tools/materials, real live keys (same set
    // awlgripscript.js already uses for Awlgrip Topcoat -- two-part
    // polyurethane, spray + brush/roll, same job type).
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
      affiliateLinksContainer.style.display = "block";
    } else {
      affiliateLinksList.innerHTML = "<li>No specific products found. Check Kits page.</li>";
      affiliateLinksContainer.style.display = "block";
    }
  }

  function calc() {
    var selectedInputMethod = document.querySelector("input[name=\"inputMethod\"]:checked").value;
    var sysType = sys.value;
    var productType = product.value;
    var methodType = method.value;
    var inVal = 0;
    var inUnit = null;
    var isArea = false;

    updateReducerRange(productType, methodType);

    var accelApplicable = acceleratorApplicable(productType, methodType);
    if (acceleratorRow) acceleratorRow.style.display = accelApplicable ? "block" : "none";
    if (!accelApplicable && acceleratorCheckbox) acceleratorCheckbox.checked = false;
    if (acceleratorCheckboxLabel) acceleratorCheckboxLabel.textContent = "Add " + acceleratorProductLabel(productType);

    // 442-only: checking Accelerator replaces the separate reducer amount
    // entirely (Alexseal's own worked example uses A4429 alone) -- hide
    // the reducer row rather than trying to blend two partial amounts.
    var accelChecked = !!(accelApplicable && acceleratorCheckbox && acceleratorCheckbox.checked);
    var reducerReplacedByAccelerator = (productType === "442" && accelChecked);
    if (reducerRow) reducerRow.style.display = reducerReplacedByAccelerator ? "none" : "block";

    if (note442) note442.style.display = (productType === "442") ? "block" : "none";

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
      if (resultsCard) resultsCard.style.display = "block";
      return;
    }
    if (resultsCard) resultsCard.style.display = "block";

    var conv = converterRatio(productType, methodType);
    var red = reducerReplacedByAccelerator ? 0 : (parseFloat(reducerSlider.value) || 0) / 100;

    var baseCC;
    var areaFt2 = null;
    if (isArea) {
      var coverageInfo = (cov[productType] || {})[methodType];
      if (!coverageInfo) {
        reset("—");
        return;
      }
      areaFt2 = inUnit === "squareFootage" ? inVal : convert(inVal, "squareMeters", "squareFootage");

      if (areaFt2 === null) {
        reset("Err");
        return;
      }

      // COATS COUNT: no "k" multiplier here, unlike awlgripscript.js's
      // cov{} -- see file header comment.
      var totalGallonsMixed = areaFt2 / coverageInfo.c;
      var totalCCMixed = convert(totalGallonsMixed, "gallons", "ccs");

      var totalParts = 1 + conv + red;
      baseCC = totalCCMixed / totalParts;
    } else {
      baseCC = convert(inVal, inUnit, "ccs");
    }

    if (baseCC === null || baseCC <= 0) {
      reset("Err");
      return;
    }

    var convCC = baseCC * conv;
    var redCC = baseCC * red;

    // Accelerator volume -- two entirely different bases/dosages per
    // product, both TDS-sourced (see file header / build report):
    //   501 (A5035): ratio of accelerator to MIXED-AND-REDUCED topcoat
    //     (base+converter+reducer) -- 10 mL per 2 quarts (1892.706 mL).
    //   442 (A4429): 12.5% of the CATALYZED primer only (base+converter,
    //     NOT reducer) -- matches the TDS worked example's 2qt:2qt:1pt
    //     (1:1:0.25) ratio exactly, and replaces the reducer entirely
    //     (red is already forced to 0 above when this is checked).
    var acceleratorCC = 0;
    if (accelChecked) {
      if (productType === "501") {
        var mixedAndReducedCC = baseCC + convCC + redCC;
        acceleratorCC = mixedAndReducedCC * (10 / 1892.706);
      } else if (productType === "442") {
        var catalyzedCC = baseCC + convCC;
        acceleratorCC = catalyzedCC * 0.125;
      }
    }

    var outUnit = isArea ? resU.value : inUnit;

    var pVol = convert(baseCC, "ccs", outUnit);
    var cVol = convert(convCC, "ccs", outUnit);
    var rVol = convert(redCC, "ccs", outUnit);

    var pVolStr = pVol !== null ? pVol.toFixed(2) : "Err";
    var cVolStr = cVol !== null ? cVol.toFixed(2) : "Err";
    var rVolStr = rVol !== null ? rVol.toFixed(2) : "Err";

    var bLabel = baseLabel(productType);
    var cLabel = converterLabel(productType, methodType);
    var rLabel = reducerReplacedByAccelerator ? "Reducer (replaced by Accelerator)" : "Reducer";

    outPLabel.textContent = bLabel;
    outP.textContent = pVolStr + " " + labels[outUnit];
    outCLabel.textContent = cLabel;
    outC.textContent = cVolStr + " " + labels[outUnit];

    if (reducerReplacedByAccelerator) {
      // Keep the row present (matches the shared print/email markup other
      // calculators rely on) but show it's inactive rather than a stale
      // number from before the checkbox was checked.
      outRLabel.textContent = rLabel;
      outR.textContent = "—";
    } else {
      outRLabel.textContent = rLabel;
      outR.textContent = rVolStr + " " + labels[outUnit];
    }

    emailP.textContent = bLabel + ": " + pVolStr + " " + labels[outUnit];
    emailC.textContent = cLabel + ": " + cVolStr + " " + labels[outUnit];
    emailR.textContent = reducerReplacedByAccelerator ? (rLabel + ": —") : (rLabel + ": " + rVolStr + " " + labels[outUnit]);

    if (accelChecked) {
      var aVol = convert(acceleratorCC, "ccs", "ccs"); // stays mL for display, same as Awlgrip's accelerator
      var aVolStr = aVol !== null ? aVol.toFixed(2) : "Err";
      var aLabel = acceleratorProductLabel(productType);
      outALabel.textContent = aLabel;
      outA.textContent = aVolStr + " mL";
      outA.style.display = "block";
      outAccelBox.style.display = "block";
      emailA.textContent = aLabel + ": " + aVolStr + " mL";
      emailA.style.display = "block";
    } else {
      outA.style.display = "none";
      outAccelBox.style.display = "none";
      emailA.style.display = "none";
    }

    if (cov[productType] && cov[productType][methodType]) {
      var d = cov[productType][methodType];
      var covFt2 = d.c;
      var covM2 = (covFt2 * 0.092903 / 3.78541).toFixed(1);
      var covStr = sysType === "imperial" ? covFt2.toFixed(0) + " ft²/gal" : covM2 + " m²/L";
      outCov.textContent = "Factory Product Coverage Rate: " + covStr + " • " + recommendedText[productType];
    } else {
      outCov.textContent = "Coverage info not available for this selection.";
    }

    displayAffiliateLinks(productType, methodType);

    // ── Analytics: log this calculation (fire-and-forget) ──
    if (typeof logCalculation === 'function' && inVal > 0) {
      const CC = window.CC_UNITS;
      const areaUnitMap = { squareFootage: CC.FT2, squareMeters: CC.M2 };
      const volUnitMap = { gallons: CC.GAL, quarts: CC.QT, ounces: CC.FLOZ, liters: CC.L, ccs: CC.ML };
      const inputValueUnit = isArea ? areaUnitMap[inUnit] : volUnitMap[inUnit];
      const outputUnit = volUnitMap[outUnit];
      const _ccInputs = {
        productType: productType,
        methodType: methodType,
        inputMethod: selectedInputMethod,
        inputValue: isArea
          ? { value: inVal, unit: inputValueUnit, base: areaFt2, baseUnit: CC.FT2 }
          : { value: inVal, unit: inputValueUnit, base: baseCC, baseUnit: CC.CCS },
        unitSystem: sysType,
        reducerPercent: red * 100,
        acceleratorEnabled: accelChecked
      };
      const _ccResults = {
        base: { value: pVol, unit: outputUnit, base: baseCC, baseUnit: CC.CCS },
        converter: { value: cVol, unit: outputUnit, base: convCC, baseUnit: CC.CCS },
        reducer: reducerReplacedByAccelerator ? null : { value: rVol, unit: outputUnit, base: redCC, baseUnit: CC.CCS },
        accelerator: accelChecked ? { value: acceleratorCC, unit: CC.ML } : null,
        coverage: (cov[productType] && cov[productType][methodType]) ? {
          coverageFt2PerGal: cov[productType][methodType].c
        } : null
      };
      logCalculation('alexseal', _ccInputs, _ccResults);
      window._ccLastCalc = { calculator: 'alexseal', inputs: _ccInputs, results: _ccResults };
    }
  }

  function reset(msg) {
    if (!msg) msg = "—";
    outPLabel.textContent = "Paint Base";
    outP.textContent = msg;
    outCLabel.textContent = "Converter";
    outC.textContent = msg;
    outRLabel.textContent = "Reducer";
    outR.textContent = msg;
    emailP.textContent = "Paint Base: " + msg;
    emailC.textContent = "Converter: " + msg;
    emailR.textContent = "Reducer: " + msg;
    outA.style.display = "none";
    outAccelBox.style.display = "none";
    emailA.style.display = "none";
    outCov.textContent = "";
    if (affiliateLinksList) affiliateLinksList.innerHTML = "";
    if (affiliateLinksContainer) affiliateLinksContainer.style.display = "none";
    calculatedAreaDisplaySpan.textContent = "—";
  }

  // ── Toggle-button-syncs-to-hidden-select shims (folded in directly,
  // no separate -ui.js file -- see file header) ───────────────────────
  function syncSystemButtons() {
    sysButtons.forEach(function(btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-system") === sys.value ? "true" : "false");
    });
  }
  sysButtons.forEach(function(btn) {
    btn.addEventListener("click", function() {
      if (btn.getAttribute("aria-pressed") === "true") return;
      sys.value = btn.getAttribute("data-system");
      syncSystemButtons();
      sys.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });

  function syncInputMethodButtons() {
    var checked = document.querySelector("input[name=\"inputMethod\"]:checked");
    if (!checked) return;
    inputMethodButtons.forEach(function(btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-input") === checked.value ? "true" : "false");
    });
  }
  inputMethodButtons.forEach(function(btn) {
    btn.addEventListener("click", function() {
      if (btn.getAttribute("aria-pressed") === "true") return;
      var radio = document.querySelector("input[name=\"inputMethod\"][value=\"" + btn.getAttribute("data-input") + "\"]");
      if (!radio) return;
      radio.checked = true;
      syncInputMethodButtons();
      radio.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });

  function syncAppMethodButtons() {
    methodButtons.forEach(function(btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-appmethod") === method.value ? "true" : "false");
    });
  }
  methodButtons.forEach(function(btn) {
    btn.addEventListener("click", function() {
      if (btn.getAttribute("aria-pressed") === "true") return;
      method.value = btn.getAttribute("data-appmethod");
      syncAppMethodButtons();
      method.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });

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
  product.addEventListener("change", calc);
  reducerSlider.addEventListener("input", function() {
    if (reducerSliderLabel) reducerSliderLabel.textContent = reducerSlider.value;
    updateReducerSliderGradient();
    calc();
  });
  if (acceleratorCheckbox) acceleratorCheckbox.addEventListener("change", calc);
  val.addEventListener("input", calc);
  lengthInput.addEventListener("input", calc);
  widthInput.addEventListener("input", calc);
  dimensionUnitSelect.addEventListener("change", calc);

  var printButton = document.getElementById("printButton");
  var qrCodeContainer = document.getElementById("printQrCode");

  if (printButton && qrCodeContainer && typeof QRCode !== "undefined") {
    printButton.addEventListener("click", function(event) {
      event.preventDefault();
      if (window._ccLastCalc && typeof logCalculation === 'function') {
        logCalculation(window._ccLastCalc.calculator, window._ccLastCalc.inputs, window._ccLastCalc.results, true);
      }
      var pageUrl = window.location.href;
      qrCodeContainer.innerHTML = "";
      new QRCode(qrCodeContainer, {
        text: pageUrl,
        width: 100,
        height: 100,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
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
  syncSystemButtons();
  syncInputMethodButtons();
  syncAppMethodButtons();
  toggleInputMethod();
  calc();
});
