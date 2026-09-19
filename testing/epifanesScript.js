/* epifanesScript.js - v3.0 (Product + application-method selectors added;
   see build report for the .mp-* visual rebuild this pairs with) */

document.addEventListener("DOMContentLoaded", () => {
  const totalVolumeInput = document.getElementById("totalVolume");
  const volumeUnitSelect = document.getElementById("volumeUnit");
  const productSelect = document.getElementById("epifanesProduct");
  const methodSelect = document.getElementById("epifanesMethod");
  const methodButtons = Array.prototype.slice.call(document.querySelectorAll('.mp-unit-btn[data-method]'));
  const resultBaseLabelEl = document.getElementById("resultBaseLabel");
  const resultBaseDisplay = document.getElementById("resultBase");
  const resultHardenerLabelEl = document.getElementById("resultHardenerLabel");
  const resultHardenerDisplay = document.getElementById("resultHardener");
  const resultThinnerLabelEl = document.getElementById("resultThinnerLabel");
  const resultThinnerDisplay = document.getElementById("resultThinner");
  const emailBaseEl = document.getElementById("epifanesEmailBase");
  const emailHardenerEl = document.getElementById("epifanesEmailHardener");
  const emailThinnerEl = document.getElementById("epifanesEmailThinner");
  const noteSpeedcoatEl = document.getElementById("epifanesNoteSpeedcoat");
  const noteSprayGuidanceEl = document.getElementById("epifanesNoteSprayGuidance");
  const affiliateLinksList = document.getElementById("affiliateLinksList");
  const affiliateLinksContainer = document.getElementById("affiliateLinksContainer");

  // Check if essential elements exist. Thinner label/value, the sr-only
  // email mirrors, the two product/method notes and the method toggle
  // buttons are soft-checked at their own use sites instead (same
  // philosophy as the original guard, which already treated
  // resultThinnerDisplay as optional).
  if (!totalVolumeInput || !volumeUnitSelect || !productSelect || !methodSelect ||
      !resultBaseLabelEl || !resultBaseDisplay || !resultHardenerLabelEl || !resultHardenerDisplay ||
      !affiliateLinksList || !affiliateLinksContainer) {
    console.error("One or more essential DOM elements for the Epifanes calculator are missing. Functionality may be impaired.");
    if (affiliateLinksContainer) affiliateLinksContainer.style.display = "none";
    return;
  }

  // affiliate_links.js's Supabase fetch is async and can resolve after this
  // DOMContentLoaded handler's own displayAffiliateLinks() call (below) has
  // already run against a still-empty affiliateLinksData -- re-render once
  // the fetch actually completes. displayAffiliateLinks() takes no args and
  // is pure render (innerHTML rebuild only, no analytics), so it's safe to
  // call directly here.
  window.addEventListener('affiliateLinksReady', () => {
    displayAffiliateLinks();
  }, { once: true });

  const toCcs = {
    ccs: 1,
    ounces: 29.5735,
    liters: 1000,
    quarts: 946.353,
    gallons: 3785.41,
  };

  const fromCcs = {
    ccs: 1,
    ounces: 1 / 29.5735,
    liters: 1 / 1000,
    quarts: 1 / 946.353,
    gallons: 1 / 3785.41,
  };

  // Human-readable unit labels for display/email only -- toCcs/fromCcs
  // keys stay the lookup keys and analytics unit codes. "ounces" reads
  // "fl oz", not "Ounces": these are fluid ounces (the page's own
  // <option> reads "Fluid Ounces (US fl oz)", and the analytics comment
  // below states "ounces" maps to FLOZ, not the mass OZ).
  const unitLabels = {
    ccs: "mL (cc)",
    ounces: "fl oz",
    liters: "Liters",
    quarts: "Quarts",
    gallons: "Gallons"
  };

  // Standard line supports Brush/Roll and Spray; PU Speedcoat is
  // spray-only by manufacturer design. Colour products (both lines) get
  // the "(colour)" result label instead of "(clear)".
  const speedcoatProducts = ['en012', 'en013', 'en110'];
  const colourProducts = ['en105', 'en110'];

  function formatNumber(number) {
    if (isNaN(number) || number === null) {
        return "--";
    }
    const unit = volumeUnitSelect.value;
    let fractionDigits = 2;
    if (unit === "ounces" || unit === "ccs") {
        fractionDigits = 1;
    }
    return number.toLocaleString("en-US", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  }

  function displayAffiliateLinks() {
    if (typeof affiliateLinksData === "undefined") {
      console.error("Affiliate links data (affiliateLinksData) not found. Ensure affiliate_links.js is loaded correctly before this script.");
      if (affiliateLinksContainer) affiliateLinksContainer.style.display = "none";
      return;
    }

    affiliateLinksList.innerHTML = "";
    const linksToShowKeys = new Set();

    linksToShowKeys.add("latex_gloves");
    linksToShowKeys.add("mixing_sticks_reusable");
    linksToShowKeys.add("disposable_paper_cups_125pack");
    linksToShowKeys.add("foam_rollers_6inch_20pack");
    linksToShowKeys.add("chip_brushes_2inch_36pack");
    linksToShowKeys.add("blue_tape_1inch_6pack");
    linksToShowKeys.add("rags");
    linksToShowKeys.add("3m_full_face_respirator_medium_model_6800_filter_kit_linked_below");
    linksToShowKeys.add("denatured_alcohol_1gallon");

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
          console.warn(`Affiliate link key "${key}" not found in affiliateLinksData or data is incomplete.`);
      }
    });

    if (hasDisplayedLinks) {
      affiliateLinksContainer.style.display = "block";
    } else {
      affiliateLinksList.innerHTML = "<li>No specific products found. Check Kits page.</li>";
      affiliateLinksContainer.style.display = "block";
    }
  }

  // ── Application Method toggle shim ──────────────────────────────────
  // Same pattern as awlgrip.html's methodType toggle (see
  // awlgripcalc-ui.js), folded directly in here since this page only has
  // the one toggle to sync -- no separate -ui.js file needed. The hidden
  // <select id="epifanesMethod"> stays the source of truth; the visible
  // buttons just mirror it.
  function syncMethodButtons() {
    if (!methodButtons.length) return;
    const brushOption = methodSelect.querySelector('option[value="brush"]');
    const brushDisabled = !!(brushOption && brushOption.disabled);
    methodButtons.forEach((btn) => {
      const value = btn.getAttribute('data-method');
      btn.setAttribute('aria-pressed', value === methodSelect.value ? 'true' : 'false');
      if (value === 'brush') {
        btn.disabled = brushDisabled;
        btn.setAttribute('aria-disabled', brushDisabled ? 'true' : 'false');
      }
    });
  }

  methodButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = btn.getAttribute('data-method');
      if (btn.disabled || methodSelect.value === value) return;
      methodSelect.value = value;
      // methodSelect's own "change" listener (registered below) re-runs
      // calculateEpifanes(), which calls syncMethodButtons() itself.
      methodSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  // ── Thinner advisory (product + method aware, NOT computed) ─────────
  // Deliberately advisory rather than a calculated volume: the real TDS
  // gives ranges that vary by coat and substrate, not one number per
  // product, so a single computed figure would be invented precision.
  function thinnerAdvisory(productType, methodType) {
    if (speedcoatProducts.indexOf(productType) !== -1) {
      return "Thin 15-20%. Use Epifanes PU Speedcoat Spraythinner - a different product from the standard line's spray thinner.";
    }
    if (methodType === 'spray') {
      return "Thin 15-20%. Use Epifanes Poly-urethane Spray Thinner. Note: Epifanes recommends the PU Speedcoat version of this product for spray application.";
    }
    return "Thin 0-15% depending on coat and substrate - see the TDS. Use Epifanes Poly-urethane Brush Thinner or Epifanes PU Slow Reducer.";
  }

  function setThinnerAdvisory(productType, methodType) {
    const label = "Thinning";
    const text = thinnerAdvisory(productType, methodType);
    if (resultThinnerLabelEl) resultThinnerLabelEl.textContent = label;
    if (resultThinnerDisplay) resultThinnerDisplay.textContent = text;
    if (emailThinnerEl) emailThinnerEl.textContent = label + ": " + text;
  }

  // Label/value split (visual rebuild only): .mp-compare-box splits the
  // label and value into two separate spans, so both are written here
  // together, plus the sr-only "Label: value" mirrors for
  // injectEmailCaptureUI (see build report -- .mp-compare-value alone
  // can't be read as a full sentence, same fix awlgrip.html needed).
  function setResults(baseLabel, baseValue, hardenerLabel, hardenerValue) {
    resultBaseLabelEl.textContent = baseLabel;
    resultBaseDisplay.textContent = baseValue;
    resultHardenerLabelEl.textContent = hardenerLabel;
    resultHardenerDisplay.textContent = hardenerValue;
    if (emailBaseEl) emailBaseEl.textContent = baseLabel + ": " + baseValue;
    if (emailHardenerEl) emailHardenerEl.textContent = hardenerLabel + ": " + hardenerValue;
  }

  function calculateEpifanes() {
    const productType = productSelect.value;
    const isSpeedcoat = speedcoatProducts.indexOf(productType) !== -1;
    const isColour = colourProducts.indexOf(productType) !== -1;

    // Speedcoat constraint: force + lock Spray, disable Brush/Roll --
    // same mechanism awlgripscript.js uses to disable its real
    // <option value="roll"> for spray-only products.
    const brushOption = methodSelect.querySelector('option[value="brush"]');
    if (brushOption) brushOption.disabled = isSpeedcoat;
    if (isSpeedcoat && methodSelect.value === 'brush') {
      methodSelect.value = 'spray';
    }
    // Re-sync the visible toggle buttons every time, so a Speedcoat
    // product selection VISIBLY moves the toggle to Spray instead of
    // leaving Brush/Roll highlighted while spray values are computed.
    syncMethodButtons();

    const methodType = methodSelect.value;

    // Product/method-driven notes -- same style="display:none;" + JS
    // pattern as awlgrip.html's productNoteAwlcraftSE/productNoteHDTClear.
    if (noteSpeedcoatEl) noteSpeedcoatEl.style.display = isSpeedcoat ? "block" : "none";
    if (noteSprayGuidanceEl) noteSprayGuidanceEl.style.display = (!isSpeedcoat && methodType === 'spray') ? "block" : "none";

    const baseLabel = isColour ? "Component A (colour)" : "Component A (clear)";
    const hardenerLabel = "Component B (hardener)";

    // Thinner advisory is product/method-driven, not volume-driven --
    // update it regardless of whether a volume has been entered yet.
    setThinnerAdvisory(productType, methodType);

    const totalVolumeValue = parseFloat(totalVolumeInput.value) || 0;
    const unit = volumeUnitSelect.value;

    if (totalVolumeValue <= 0) {
      setResults(baseLabel, "--", hardenerLabel, "--");
      return;
    }

    const totalVolumeCcs = totalVolumeValue * (toCcs[unit] || 0);

    if (totalVolumeCcs <= 0) {
      setResults(baseLabel, "Error", hardenerLabel, "Error");
      return;
    }

    const baseVolumeCcs = totalVolumeCcs * (2 / 3);
    const hardenerVolumeCcs = totalVolumeCcs * (1 / 3);

    const baseVolumeOutput = baseVolumeCcs * (fromCcs[unit] || 0);
    const hardenerVolumeOutput = hardenerVolumeCcs * (fromCcs[unit] || 0);

    const baseValueStr = formatNumber(baseVolumeOutput) + " " + (unitLabels[unit] || unit);
    const hardenerValueStr = formatNumber(hardenerVolumeOutput) + " " + (unitLabels[unit] || unit);

    setResults(baseLabel, baseValueStr, hardenerLabel, hardenerValueStr);

    // ── Analytics: log this calculation (fire-and-forget) ──
    // Guard: function already returns early for <= 0, but be explicit
    if (typeof logCalculation === 'function' && totalVolumeValue > 0) {
      const CC = window.CC_UNITS;
      // toCcs/fromCcs keys ("ounces" etc.) are volumes of mixed paint,
      // not mass -- "ounces" maps to FLOZ, not the mass OZ.
      const unitMap = { ccs: CC.CCS, ounces: CC.FLOZ, liters: CC.L, quarts: CC.QT, gallons: CC.GAL };
      const _ccInputs = {
        productType: productType,
        methodType: methodType,
        totalVolume: { value: totalVolumeValue, unit: unitMap[unit], base: totalVolumeCcs, baseUnit: CC.CCS }
      };
      const _ccResults = {
        base:     { value: baseVolumeOutput, unit: unitMap[unit], base: baseVolumeCcs, baseUnit: CC.CCS },
        hardener: { value: hardenerVolumeOutput, unit: unitMap[unit], base: hardenerVolumeCcs, baseUnit: CC.CCS }
      };
      logCalculation('epifanes', _ccInputs, _ccResults);
      // Cached for Print/Email Me to log this settled answer immediately
      // (see calc-tracker.js's logCalculation immediate=true path).
      window._ccLastCalc = { calculator: 'epifanes', inputs: _ccInputs, results: _ccResults };
    }
  }

  totalVolumeInput.addEventListener("input", calculateEpifanes);
  volumeUnitSelect.addEventListener("change", calculateEpifanes);
  productSelect.addEventListener("change", calculateEpifanes);
  methodSelect.addEventListener("change", calculateEpifanes);

  const printButton = document.getElementById("printButton");
  const qrCodeContainer = document.getElementById("printQrCode");

  if (printButton && qrCodeContainer) {
    if (typeof QRCode !== "undefined") {
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
        console.error("QRCode library not loaded, print QR functionality disabled.");
        if(printButton) printButton.style.display = 'none';
    }
  } else {
      if (!printButton) console.warn("Print button not found.");
      if (!qrCodeContainer) console.warn("QR code container for print not found.");
  }

  calculateEpifanes();
  displayAffiliateLinks();
});
