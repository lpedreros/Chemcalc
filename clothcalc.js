// clothcalc.js - v12.7.7 (Updates affiliate link keys and product selection)

document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("resin-calculator-form");
  const layersContainer = document.getElementById("layers-container");
  const addLayerBtn = document.getElementById("add-layer-btn");
  const resultsSection = document.getElementById("results");
  const resultsContent = document.getElementById("results-content");
  const affiliateLinksList = document.getElementById("affiliateLinksList");
  const affiliateLinksContainer = document.getElementById("affiliateLinksContainer");

  // Input Elements
  const lengthInput = document.getElementById("length");
  const widthInput = document.getElementById("width");
  const unitsSelect = document.getElementById("units");
  const resinTypeSelect = document.getElementById("resin-type");
  const epoxyRatioContainer = document.getElementById("epoxy-ratio-container");
  const epoxyMixRatioSelect = document.getElementById("epoxy-mix-ratio");
  const temperatureInput = document.getElementById("temperature");
  const tempUnitToggle = document.getElementById("temp-unit-toggle");
  const tempUnitLabel = document.getElementById("temp-unit-label");
  const resinCostInput = document.getElementById("resin-cost");
  const resinCostUnitSelect = document.getElementById("resin-cost-unit");
  const resultSystemSelect = document.getElementById("result-system");
  const resultVolumeUnitSelect = document.getElementById("result-volume-unit");

  // Result Elements
  const totalAreaEl = document.getElementById("total-area");
  const resinVolumeEl = document.getElementById("resin-volume");
  const resinWeightEl = document.getElementById("resin-weight");
  const hardenerAmountEl = document.getElementById("hardener-amount");
  const workingTimeEl = document.getElementById("working-time");
  const estimatedCostEl = document.getElementById("estimated-cost");
  const mekpResultsContainer = document.getElementById("mekp-results-container");
  const mekpPercentageEl = document.getElementById("mekp-percentage");
  const mekpCcsEl = document.getElementById("mekp-ccs");
  const mekpDropsEl = document.getElementById("mekp-drops");
  const clothResinRatioEl = document.getElementById("cloth-resin-ratio");

  // Print Summary Elements
  const printTimestampEl = document.getElementById("print-timestamp");
  const printSystemEl = document.getElementById("print-system");
  const printDimensionsEl = document.getElementById("print-dimensions");
  const printResinEl = document.getElementById("print-resin");
  const printTempEl = document.getElementById("print-temp");
  const printLayersEl = document.getElementById("print-layers");

  let layerCount = 1;
  let isFahrenheit = false;
  let currentResultUnitSystem = "metric";
  let lastCalculatedResults = null;

  const materialData = {
    "csm_0.75": { ratio: 1.5, density: 1.5, system: 'imperial', name: 'CSM (0.75 oz/sq ft)', weight: 0.75, unit: 'oz/sq ft', type: 'fiberglass' },
    "csm_1.5": { ratio: 1.5, density: 1.5, system: 'imperial', name: 'CSM (1.5 oz/sq ft)', weight: 1.5, unit: 'oz/sq ft', type: 'fiberglass' },
    "csm_2.0": { ratio: 1.5, density: 1.5, system: 'imperial', name: 'CSM (2.0 oz/sq ft)', weight: 2.0, unit: 'oz/sq ft', type: 'fiberglass' },
    wr_18: { ratio: 1.0, density: 1.8, system: 'imperial', name: 'Woven Roving (18 oz/sq yd)', weight: 18, unit: 'oz/sq yd', type: 'fiberglass' },
    wr_24: { ratio: 1.0, density: 1.8, system: 'imperial', name: 'Woven Roving (24 oz/sq yd)', weight: 24, unit: 'oz/sq yd', type: 'fiberglass' },
    combo_1708: { ratio: 1.2, density: 1.6, system: 'imperial', name: 'Combination Mat (1708)', weight: 24, unit: 'oz/sq yd', type: 'fiberglass' },
    combo_1808: { ratio: 1.2, density: 1.6, system: 'imperial', name: 'Combination Mat (1808)', weight: 25, unit: 'oz/sq yd', type: 'fiberglass' },
    cloth_4: { ratio: 1.0, density: 1.9, system: 'imperial', name: 'Cloth (4 oz/sq yd)', weight: 4, unit: 'oz/sq yd', type: 'fiberglass' },
    cloth_6: { ratio: 1.0, density: 1.9, system: 'imperial', name: 'Cloth (6 oz/sq yd)', weight: 6, unit: 'oz/sq yd', type: 'fiberglass' },
    cloth_10: { ratio: 1.0, density: 1.9, system: 'imperial', name: 'Cloth (10 oz/sq yd)', weight: 10, unit: 'oz/sq yd', type: 'fiberglass' },
    "carbon_5.7": { ratio: 0.8, density: 1.7, system: 'imperial', name: 'Carbon Fiber (5.7 oz)', weight: 5.7, unit: 'oz/sq yd', type: 'carbon' },
    "carbon_11": { ratio: 0.8, density: 1.7, system: 'imperial', name: 'Carbon Fiber (11 oz)', weight: 11, unit: 'oz/sq yd', type: 'carbon' },
    "kevlar_5": { ratio: 1.0, density: 1.44, system: 'imperial', name: 'Kevlar (5 oz)', weight: 5, unit: 'oz/sq yd', type: 'kevlar' },
    "csm_225gsm": { ratio: 1.5, density: 1.5, system: 'metric', name: 'CSM (225 gsm)', weight: 225, unit: 'gsm', type: 'fiberglass' },
    "csm_450gsm": { ratio: 1.5, density: 1.5, system: 'metric', name: 'CSM (450 gsm)', weight: 450, unit: 'gsm', type: 'fiberglass' },
    "csm_600gsm": { ratio: 1.5, density: 1.5, system: 'metric', name: 'CSM (600 gsm)', weight: 600, unit: 'gsm', type: 'fiberglass' },
    "wr_600gsm": { ratio: 1.0, density: 1.8, system: 'metric', name: 'Woven Roving (600 gsm)', weight: 600, unit: 'gsm', type: 'fiberglass' },
    "wr_800gsm": { ratio: 1.0, density: 1.8, system: 'metric', name: 'Woven Roving (800 gsm)', weight: 800, unit: 'gsm', type: 'fiberglass' },
    "combo_800gsm": { ratio: 1.2, density: 1.6, system: 'metric', name: 'Combination Mat (800 gsm)', weight: 800, unit: 'gsm', type: 'fiberglass' },
    "combo_850gsm": { ratio: 1.2, density: 1.6, system: 'metric', name: 'Combination Mat (850 gsm)', weight: 850, unit: 'gsm', type: 'fiberglass' },
    "cloth_135gsm": { ratio: 1.0, density: 1.9, system: 'metric', name: 'Cloth (135 gsm)', weight: 135, unit: 'gsm', type: 'fiberglass' },
    "cloth_200gsm": { ratio: 1.0, density: 1.9, system: 'metric', name: 'Cloth (200 gsm)', weight: 200, unit: 'gsm', type: 'fiberglass' },
    "cloth_340gsm": { ratio: 1.0, density: 1.9, system: 'metric', name: 'Cloth (340 gsm)', weight: 340, unit: 'gsm', type: 'fiberglass' },
    "carbon_200gsm": { ratio: 0.8, density: 1.7, system: 'metric', name: 'Carbon Fiber (200 gsm)', weight: 200, unit: 'gsm', type: 'carbon' },
    "carbon_370gsm": { ratio: 0.8, density: 1.7, system: 'metric', name: 'Carbon Fiber (370 gsm)', weight: 370, unit: 'gsm', type: 'carbon' },
    "kevlar_170gsm": { ratio: 1.0, density: 1.44, system: 'metric', name: 'Kevlar (170 gsm)', weight: 170, unit: 'gsm', type: 'kevlar' }
  };

  const resinData = {
    polyester: { density: 1.1, baseWorkingTime: 30, tempSensitivityFactor: 0.07 },
    vinylester: { density: 1.1, baseWorkingTime: 30, tempSensitivityFactor: 0.07 },
    epoxy: { density: 1.15, baseWorkingTime: 45, tempSensitivityFactor: 0.04 },
  };

  const unitsToSqMeters = { in: 0.00064516, ft: 0.092903, cm: 0.0001, m: 1 };
  const ozSqFtToKgSqM = 0.30515;
  const ozSqYdToKgSqM = 0.033906;
  const gsmToKgSqM = 0.001;
  const kgToLb = 2.20462;
  const lbToOz = 16;
  const literToGallon = 0.264172;
  const literToQuart = 1.05669;
  const literToFlOz = 33.814;
  const gallonToQuart = 4;
  const quartToFlOz = 32;
  const sqMeterToSqFeet = 10.7639;
  const mlToFlOz = 0.033814;
  const mlPerDrop = 0.05;
  const mekpDensity = 1.1;
  const approxEpoxyHardenerDensity = 1.0;

  function celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
  }

  function fahrenheitToCelsius(fahrenheit) {
    return (fahrenheit - 32) * 5/9;
  }

  function updateInputOptions() {
    if (!resultSystemSelect || !unitsSelect || !resinCostUnitSelect) return;
    const system = resultSystemSelect.value;
    const currentDimUnit = unitsSelect.value;
    let firstVisibleDimUnit = null;
    let currentDimUnitVisible = false;
    for (let i = 0; i < unitsSelect.options.length; i++) {
      const option = unitsSelect.options[i];
      const isMetricUnit = option.value === 'cm' || option.value === 'm';
      const isVisible = (system === 'metric' && isMetricUnit) || (system === 'imperial' && !isMetricUnit);
      option.style.display = isVisible ? '' : 'none';
      if (isVisible) {
        if (firstVisibleDimUnit === null) firstVisibleDimUnit = option.value;
        if (option.value === currentDimUnit) currentDimUnitVisible = true;
      }
    }
    if (!currentDimUnitVisible && firstVisibleDimUnit) {
      unitsSelect.value = firstVisibleDimUnit;
    }

    const currentCostUnit = resinCostUnitSelect.value;
    let firstVisibleCostUnit = null;
    let currentCostUnitVisible = false;
    for (let i = 0; i < resinCostUnitSelect.options.length; i++) {
      const option = resinCostUnitSelect.options[i];
      const isMetricUnit = option.value === 'liter' || option.value === 'kg';
      const isVisible = (system === 'metric' && isMetricUnit) || (system === 'imperial' && !isMetricUnit);
      option.style.display = isVisible ? '' : 'none';
      if (isVisible) {
        if (firstVisibleCostUnit === null) firstVisibleCostUnit = option.value;
        if (option.value === currentCostUnit) currentCostUnitVisible = true;
      }
    }
    if (!currentCostUnitVisible && firstVisibleCostUnit) {
      resinCostUnitSelect.value = firstVisibleCostUnit;
    }
    updateMaterialOptions();
  }

  function updateMaterialOptions() {
    if (!resultSystemSelect || !layersContainer) return;
    const targetSystem = resultSystemSelect.value;
    const materialSelects = layersContainer.querySelectorAll('.material-type');
    materialSelects.forEach(select => {
      let firstVisibleOptionValue = null;
      let currentSelectionVisible = false;
      const currentSelectedValue = select.value;
      for (let i = 0; i < select.options.length; i++) {
        const option = select.options[i];
        const optionValue = option.value;
        const materialInfo = materialData[optionValue];
        let isVisible = false;
        if (materialInfo && materialInfo.system === targetSystem) {
            isVisible = true;
        }
        option.style.display = isVisible ? '' : 'none';
        if (isVisible) {
          if (firstVisibleOptionValue === null) {
            firstVisibleOptionValue = optionValue;
          }
          if (optionValue === currentSelectedValue) {
            currentSelectionVisible = true;
          }
        }
      }
      if (!currentSelectionVisible && firstVisibleOptionValue) {
        select.value = firstVisibleOptionValue;
      }
      if (firstVisibleOptionValue === null) {
          console.error("No material options available for the selected system!");
      }
    });
  }

  function populateResultUnitOptions() {
      if (!resultSystemSelect || !resultVolumeUnitSelect) return;
      const system = resultSystemSelect.value;
      resultVolumeUnitSelect.innerHTML = "";
      if (system === "imperial") {
          resultVolumeUnitSelect.innerHTML = `
              <option value=\"gal\">Gallons (US)</option>
              <option value=\"qt\">Quarts (US)</option>
              <option value=\"floz\">Fluid Ounces (US)</option>
          `;
      } else {
          resultVolumeUnitSelect.innerHTML = `
              <option value=\"l\">Liters</option>
              <option value=\"ml\">Milliliters (mL/cc)</option>
          `;
      }
  }

  function handleResultSystemChange() {
      currentResultUnitSystem = resultSystemSelect.value;
      populateResultUnitOptions();
      updateInputOptions();
      calculateResin();
  }

  function setupInitialUnitsAndInputs() {
      if (!resultSystemSelect) return;
      resultSystemSelect.value = currentResultUnitSystem;
      populateResultUnitOptions();
      updateInputOptions();
  }

  function toggleEpoxyRatioVisibility() {
      if (!resinTypeSelect || !epoxyRatioContainer) return;
      if (resinTypeSelect.value === "epoxy") {
          epoxyRatioContainer.style.display = "block";
      } else {
          epoxyRatioContainer.style.display = "none";
      }
  }

  function handleTempUnitToggle() {
      isFahrenheit = tempUnitToggle.checked;
      const currentTempValue = parseFloat(temperatureInput.value);
      if (!isNaN(currentTempValue)) {
          if (isFahrenheit) {
            tempUnitLabel.textContent = "°F";
            temperatureInput.value = celsiusToFahrenheit(currentTempValue).toFixed(1);
          } else {
            tempUnitLabel.textContent = "°C";
            temperatureInput.value = fahrenheitToCelsius(currentTempValue).toFixed(1);
          }
      } else {
           temperatureInput.value = isFahrenheit ? "68" : "20";
           tempUnitLabel.textContent = isFahrenheit ? "°F" : "°C";
      }
      calculateResin();
  }

  function handleAddLayer() {
      layerCount++;
      const firstLayer = layersContainer.querySelector(".layer");
      if (!firstLayer) return;
      const newLayer = firstLayer.cloneNode(true);
      newLayer.querySelector(".layer-title").textContent = `Layer ${layersContainer.children.length + 1}`;
      newLayer.querySelectorAll("[id]").forEach((el) => {
        const oldId = el.id;
        if (oldId) {
            const baseId = oldId.replace(/-\d+$/, '');
            el.id = `${baseId}-${layerCount}`;
        }
      });
      newLayer.querySelectorAll("[for]").forEach((el) => {
        const oldFor = el.htmlFor;
        if (oldFor) {
            const baseFor = oldFor.replace(/-\d+$/, '');
            el.htmlFor = `${baseFor}-${layerCount}`;
        }
      });
      newLayer.querySelectorAll("[name]").forEach((el) => {
          const oldName = el.name;
          if(oldName) {
              const baseName = oldName.replace(/-\d+$/, '');
              el.name = `${baseName}-${layerCount}`;
          }
      });
      const newMaterialSelect = newLayer.querySelector('.material-type');
      if (newMaterialSelect) {
          updateMaterialOptions();
      }
      const removeBtn = newLayer.querySelector('.remove-layer-btn');
      if (removeBtn) {
          removeBtn.style.display = 'inline-block';
      }
      layersContainer.appendChild(newLayer);
      updateRemoveButtonVisibility();
      calculateResin();
  }

  function handleRemoveLayer(event) {
      const layerToRemove = event.target.closest('.layer');
      if (layerToRemove && layersContainer.children.length > 1) {
          layerToRemove.remove();
          renumberLayers();
          updateRemoveButtonVisibility();
          calculateResin();
      }
  }

  function renumberLayers() {
      const layers = layersContainer.querySelectorAll('.layer');
      layers.forEach((layer, index) => {
          layer.querySelector('.layer-title').textContent = `Layer ${index + 1}`;
      });
  }

  function updateRemoveButtonVisibility() {
      const layers = layersContainer.querySelectorAll('.layer');
      layers.forEach((layer, index) => {
          const removeBtn = layer.querySelector('.remove-layer-btn');
          if (removeBtn) {
              removeBtn.style.display = layers.length > 1 ? 'inline-block' : 'none';
          }
      });
  }

  function displayAffiliateLinks(resinType) {
    if (!affiliateLinksList || !affiliateLinksContainer || typeof affiliateLinksData === "undefined") {
      console.error("Affiliate links container or data not found.");
      if (affiliateLinksContainer) affiliateLinksContainer.style.display = "none";
      return;
    }

    affiliateLinksList.innerHTML = ""; 
    const linksToShowKeys = new Set();

    // Add Resin Specific Links
    if (resinType === "polyester" || resinType === "vinylester") {
        linksToShowKeys.add("polyester_resin_1gallon_kit_with_mekp");
        // MEKp is usually included or bought separately, but the kit has it.
        // If a standalone MEKp link existed, it would be added here.
    } else if (resinType === "epoxy") {
        linksToShowKeys.add("epoxy_resin_base_1gallon");
        linksToShowKeys.add("epoxy_resin_hardener_fast_1quart"); // Or slow, depending on preference
    }

    // Add Fiberglass Cloth Links (examples)
    linksToShowKeys.add("fiberglass_cloth_1708_biaxial_50_in_x_10_yards");
    linksToShowKeys.add("fiberglass_cloth_csm_chopped_strand_matt_50_in_x_10_yards");

    // Add General Supplies (using standardized keys)
    linksToShowKeys.add("latex_gloves");
    linksToShowKeys.add("mixing_sticks_reusable");
    linksToShowKeys.add("disposable_paper_cups_125pack");
    linksToShowKeys.add("chip_brushes_2inch_36pack"); // Example, could be 1-inch too
    linksToShowKeys.add("blue_tape_1inch_6pack");
    linksToShowKeys.add("rags");
    linksToShowKeys.add("ribbed_bubble_rollers_for_fiberglass_assorted_sizes_4pack");
    linksToShowKeys.add("3m_full_face_respirator_medium_model_6800_filter_kit_linked_below");
    linksToShowKeys.add("acetone"); // Common for polyester/vinylester cleanup
    linksToShowKeys.add("denatured_alcohol_1gallon"); // Common for epoxy cleanup

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

  function calculateResin() {
    const lengthVal = lengthInput.value;
    const widthVal = widthInput.value;
    const length = parseFloat(lengthVal);
    const width = parseFloat(widthVal);
    const units = unitsSelect.value;
    const resinType = resinTypeSelect.value;
    const epoxyMixRatio = epoxyMixRatioSelect.value;
    const temp = parseFloat(temperatureInput.value);
    const resinCost = parseFloat(resinCostInput.value) || 0;
    const resinCostUnit = resinCostUnitSelect.value;
    const resultUnit = resultVolumeUnitSelect.value;

    if (isNaN(length) || isNaN(width) || length <= 0 || width <= 0) {
      resultsSection.style.display = "none";
      if (affiliateLinksContainer) affiliateLinksContainer.style.display = "none";
      return;
    }

    const areaSqMeters = length * width * (unitsToSqMeters[units] || 0);
    if (areaSqMeters <= 0) {
        resultsSection.style.display = "none";
        if (affiliateLinksContainer) affiliateLinksContainer.style.display = "none";
        return;
    }

    let totalResinKg = 0;
    let totalClothWeightKg = 0;
    const layers = layersContainer.querySelectorAll(".layer");
    let avgClothResinRatio = 0;
    let validLayers = 0;

    layers.forEach((layer) => {
      const materialSelect = layer.querySelector(".material-type");
      const material = materialSelect.value;
      const materialInfo = materialData[material];
      if (!materialInfo) return;

      let clothWeightKgPerSqM;
      if (materialInfo.unit === "oz/sq ft") {
        clothWeightKgPerSqM = materialInfo.weight * ozSqFtToKgSqM;
      } else if (materialInfo.unit === "oz/sq yd") {
        clothWeightKgPerSqM = materialInfo.weight * ozSqYdToKgSqM;
      } else if (materialInfo.unit === "gsm") {
        clothWeightKgPerSqM = materialInfo.weight * gsmToKgSqM;
      } else {
        return; 
      }
      totalClothWeightKg += clothWeightKgPerSqM * areaSqMeters;

      totalResinKg += clothWeightKgPerSqM * materialInfo.ratio * areaSqMeters;
      avgClothResinRatio += materialInfo.ratio;
      validLayers++;
    });

    if (validLayers > 0) {
        avgClothResinRatio /= validLayers;
    } else {
        resultsSection.style.display = "none";
        if (affiliateLinksContainer) affiliateLinksContainer.style.display = "none";
        return;
    }

    const resinInfo = resinData[resinType];
    if (!resinInfo) {
        resultsSection.style.display = "none";
        if (affiliateLinksContainer) affiliateLinksContainer.style.display = "none";
        return;
    }

    const resinVolumeLiters = totalResinKg / resinInfo.density;
    let hardenerVolumeLiters = 0;
    let mekpPercentage = 0;
    let mekpCcs = 0;
    let mekpDrops = 0;

    if (resinType === "epoxy") {
      const ratioParts = epoxyMixRatio.split(":").map(Number);
      if (ratioParts.length === 2 && ratioParts[0] > 0 && ratioParts[1] > 0) {
        hardenerVolumeLiters = resinVolumeLiters * (ratioParts[1] / ratioParts[0]);
      }
      mekpResultsContainer.style.display = "none";
      hardenerAmountEl.style.display = "block";
    } else { // Polyester or Vinylester
      const tempC = isFahrenheit ? fahrenheitToCelsius(temp) : temp;
      if (tempC >= 15 && tempC <= 18) mekpPercentage = 2.0;
      else if (tempC > 18 && tempC <= 22) mekpPercentage = 1.8;
      else if (tempC > 22 && tempC <= 25) mekpPercentage = 1.5;
      else if (tempC > 25 && tempC <= 30) mekpPercentage = 1.0;
      else mekpPercentage = tempC < 15 ? 2.5 : 0.8; // Simplified for out of range

      mekpCcs = (resinVolumeLiters * 1000 * (mekpPercentage / 100) * resinInfo.density) / mekpDensity;
      mekpDrops = mekpCcs / mlPerDrop;
      mekpResultsContainer.style.display = "block";
      hardenerAmountEl.style.display = "none";
    }

    let workingTime = resinInfo.baseWorkingTime;
    const tempCForWorkingTime = isFahrenheit ? fahrenheitToCelsius(temp) : temp;
    workingTime *= Math.pow(2, -(tempCForWorkingTime - 20) / 10); // Simplified Arrhenius approx.
    workingTime = Math.max(5, Math.min(120, workingTime)); // Cap working time

    let estimatedCost = 0;
    if (resinCost > 0) {
      let costPerLiter = 0;
      if (resinCostUnit === "gallon") costPerLiter = resinCost / literToGallon;
      else if (resinCostUnit === "liter") costPerLiter = resinCost;
      else if (resinCostUnit === "kg") costPerLiter = resinCost / resinInfo.density;
      else if (resinCostUnit === "lb") costPerLiter = (resinCost / kgToLb) / resinInfo.density;
      estimatedCost = (resinVolumeLiters + hardenerVolumeLiters) * costPerLiter;
    }

    resultsSection.style.display = "block";
    totalAreaEl.textContent = `${areaSqMeters.toFixed(2)} m² / ${(areaSqMeters * sqMeterToSqFeet).toFixed(2)} ft²`;
    clothResinRatioEl.textContent = `Average Cloth to Resin Ratio: 1:${avgClothResinRatio.toFixed(2)} by weight`;

    let displayResinVol, displayHardenerVol, displayResinWeight;
    if (resultUnit === "gal") {
      displayResinVol = resinVolumeLiters * literToGallon;
      displayHardenerVol = hardenerVolumeLiters * literToGallon;
      displayResinWeight = totalResinKg * kgToLb;
      resinVolumeEl.textContent = `${displayResinVol.toFixed(2)} gal`;
      hardenerAmountEl.textContent = `Hardener: ${displayHardenerVol.toFixed(2)} gal`;
      resinWeightEl.textContent = `${displayResinWeight.toFixed(2)} lbs`;
    } else if (resultUnit === "qt") {
      displayResinVol = resinVolumeLiters * literToQuart;
      displayHardenerVol = hardenerVolumeLiters * literToQuart;
      displayResinWeight = totalResinKg * kgToLb;
      resinVolumeEl.textContent = `${displayResinVol.toFixed(2)} qt`;
      hardenerAmountEl.textContent = `Hardener: ${displayHardenerVol.toFixed(2)} qt`;
      resinWeightEl.textContent = `${displayResinWeight.toFixed(2)} lbs`;
    } else if (resultUnit === "floz") {
      displayResinVol = resinVolumeLiters * literToFlOz;
      displayHardenerVol = hardenerVolumeLiters * literToFlOz;
      displayResinWeight = totalResinKg * kgToLb * lbToOz;
      resinVolumeEl.textContent = `${displayResinVol.toFixed(1)} fl oz`;
      hardenerAmountEl.textContent = `Hardener: ${displayHardenerVol.toFixed(1)} fl oz`;
      resinWeightEl.textContent = `${displayResinWeight.toFixed(1)} oz (weight)`;
    } else if (resultUnit === "l") {
      displayResinVol = resinVolumeLiters;
      displayHardenerVol = hardenerVolumeLiters;
      displayResinWeight = totalResinKg;
      resinVolumeEl.textContent = `${displayResinVol.toFixed(2)} L`;
      hardenerAmountEl.textContent = `Hardener: ${displayHardenerVol.toFixed(2)} L`;
      resinWeightEl.textContent = `${displayResinWeight.toFixed(2)} kg`;
    } else { // ml (ccs)
      displayResinVol = resinVolumeLiters * 1000;
      displayHardenerVol = hardenerVolumeLiters * 1000;
      displayResinWeight = totalResinKg * 1000;
      resinVolumeEl.textContent = `${displayResinVol.toFixed(0)} mL`;
      hardenerAmountEl.textContent = `Hardener: ${displayHardenerVol.toFixed(0)} mL`;
      resinWeightEl.textContent = `${displayResinWeight.toFixed(0)} g`;
    }

    mekpPercentageEl.textContent = `${mekpPercentage.toFixed(1)}%`;
    mekpCcsEl.textContent = `${mekpCcs.toFixed(1)} mL`;
    mekpDropsEl.textContent = `${mekpDrops.toFixed(0)} drops`;
    workingTimeEl.textContent = `~${workingTime.toFixed(0)} minutes`;
    estimatedCostEl.textContent = `$${estimatedCost.toFixed(2)}`;

    lastCalculatedResults = {
        length, width, units,
        resinType, epoxyMixRatio,
        temp, isFahrenheit,
        layers: Array.from(layers).map(l => l.querySelector(".material-type").value),
        totalAreaSqM: areaSqMeters,
        resinVolumeLiters,
        hardenerVolumeLiters,
        mekpPercentage, mekpCcs, mekpDrops,
        workingTime,
        estimatedCost,
        resultUnit,
        avgClothResinRatio
    };

    displayAffiliateLinks(resinType);
  }

  function setupEventListeners() {
    if (form) form.addEventListener("submit", (e) => e.preventDefault());
    if (addLayerBtn) addLayerBtn.addEventListener("click", handleAddLayer);
    if (layersContainer) layersContainer.addEventListener("click", (event) => {
      if (event.target.classList.contains("remove-layer-btn")) {
        handleRemoveLayer(event);
      }
    });

    const inputs = [lengthInput, widthInput, unitsSelect, resinTypeSelect, epoxyMixRatioSelect, temperatureInput, resinCostInput, resinCostUnitSelect, resultVolumeUnitSelect];
    inputs.forEach(input => {
      if (input) input.addEventListener("change", calculateResin);
    });
    if (lengthInput) lengthInput.addEventListener("input", calculateResin);
    if (widthInput) widthInput.addEventListener("input", calculateResin);
    if (temperatureInput) temperatureInput.addEventListener("input", calculateResin);
    if (resinCostInput) resinCostInput.addEventListener("input", calculateResin);

    if (tempUnitToggle) tempUnitToggle.addEventListener("change", handleTempUnitToggle);
    if (resinTypeSelect) resinTypeSelect.addEventListener("change", () => {
        toggleEpoxyRatioVisibility();
        calculateResin();
    });
    if (resultSystemSelect) resultSystemSelect.addEventListener("change", handleResultSystemChange);
  }

  function initializeCalculator() {
    setupInitialUnitsAndInputs();
    toggleEpoxyRatioVisibility();
    updateRemoveButtonVisibility();
    setupEventListeners();
    calculateResin();
  }

  initializeCalculator();

  const printButton = document.getElementById("printButton");
  const qrCodeContainer = document.getElementById("printQrCode");

  if (printButton && qrCodeContainer && typeof QRCode !== "undefined") {
    printButton.addEventListener("click", (event) => {
      event.preventDefault();
      if (!lastCalculatedResults) {
          alert("Please perform a calculation first.");
          return;
      }
      if (printTimestampEl) printTimestampEl.textContent = new Date().toLocaleString();
      if (printSystemEl) printSystemEl.textContent = resultSystemSelect.options[resultSystemSelect.selectedIndex].text;
      if (printDimensionsEl) printDimensionsEl.textContent = `${lastCalculatedResults.length} x ${lastCalculatedResults.width} ${unitsSelect.options[unitsSelect.selectedIndex].text}`;
      if (printResinEl) printResinEl.textContent = resinTypeSelect.options[resinTypeSelect.selectedIndex].text + (lastCalculatedResults.resinType === 'epoxy' ? ` (${lastCalculatedResults.epoxyMixRatio})` : '');
      if (printTempEl) printTempEl.textContent = `${lastCalculatedResults.temp}°${lastCalculatedResults.isFahrenheit ? 'F' : 'C'}`;
      
      if (printLayersEl) {
          printLayersEl.innerHTML = "";
          lastCalculatedResults.layers.forEach((layerKey, index) => {
              const materialName = materialData[layerKey] ? materialData[layerKey].name : 'Unknown Material';
              const li = document.createElement("li");
              li.textContent = `Layer ${index + 1}: ${materialName}`;
              printLayersEl.appendChild(li);
          });
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

