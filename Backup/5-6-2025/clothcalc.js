// clothcalc.js - v12.7.6 (Fix affiliate links - remove automatic default list inclusion)

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

  // --- Material Data ---
  const materialData = {
    // Imperial
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
    // Metric
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

  // --- Resin Data ---
  const resinData = {
    polyester: { density: 1.1, baseWorkingTime: 30, tempSensitivityFactor: 0.07 },
    vinylester: { density: 1.1, baseWorkingTime: 30, tempSensitivityFactor: 0.07 },
    epoxy: { density: 1.15, baseWorkingTime: 45, tempSensitivityFactor: 0.04 },
  };

  // --- Unit Conversion Factors ---
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

  // --- Temperature Conversion Functions ---
  function celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
  }

  function fahrenheitToCelsius(fahrenheit) {
    return (fahrenheit - 32) * 5/9;
  }

  // --- Update Input Options Based on System ---
  function updateInputOptions() {
    if (!resultSystemSelect || !unitsSelect || !resinCostUnitSelect) return;
    const system = resultSystemSelect.value;

    // Filter Dimension Units
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

    // Filter Cost Units
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

    // Update Material Options
    updateMaterialOptions();
  }

  // --- Update Material Options Based on System ---
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

  // --- Populate Result Unit Dropdowns ---
  function populateResultUnitOptions() {
      if (!resultSystemSelect || !resultVolumeUnitSelect) return;
      const system = resultSystemSelect.value;
      resultVolumeUnitSelect.innerHTML = "";
      if (system === "imperial") {
          resultVolumeUnitSelect.innerHTML = `
              <option value="gal">Gallons (US)</option>
              <option value="qt">Quarts (US)</option>
              <option value="floz">Fluid Ounces (US)</option>
          `;
      } else {
          resultVolumeUnitSelect.innerHTML = `
              <option value="l">Liters</option>
              <option value="ml">Milliliters (mL/cc)</option>
          `;
      }
  }

  // --- Handle Result System Change ---
  function handleResultSystemChange() {
      currentResultUnitSystem = resultSystemSelect.value;
      populateResultUnitOptions();
      updateInputOptions();
      calculateResin();
  }

  // --- Initial Setup for Result Units & Inputs ---
  function setupInitialUnitsAndInputs() {
      if (!resultSystemSelect) return;
      resultSystemSelect.value = currentResultUnitSystem;
      populateResultUnitOptions();
      updateInputOptions();
  }

  // --- Toggle Epoxy Ratio Dropdown Visibility ---
  function toggleEpoxyRatioVisibility() {
      if (!resinTypeSelect || !epoxyRatioContainer) return;
      if (resinTypeSelect.value === "epoxy") {
          epoxyRatioContainer.style.display = "block";
      } else {
          epoxyRatioContainer.style.display = "none";
      }
  }

  // --- Handler Functions for Specific Actions ---
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

      // Update IDs and names for uniqueness
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
          updateMaterialOptions(); // Ensure it shows correct options for current system
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

  // --- Main Calculation Function ---
  function calculateResin() {

    // Get values
    const lengthVal = lengthInput.value;
    const widthVal = widthInput.value;
    const length = parseFloat(lengthVal);
    const width = parseFloat(widthVal);

    const units = unitsSelect.value;
    const resinType = resinTypeSelect.value;
    const epoxyRatioValue = epoxyMixRatioSelect.value;
    let temperature = parseFloat(temperatureInput.value);
    const cost = parseFloat(resinCostInput.value);
    const costUnit = resinCostUnitSelect.value;
    const system = resultSystemSelect.value;

    // Validate inputs
    if (isNaN(length) || isNaN(width) || length <= 0 || width <= 0) {
      if (resultsSection) resultsSection.style.display = "none";
      if (affiliateLinksContainer) affiliateLinksContainer.style.display = "none";
      lastCalculatedResults = null;
      return;
    }

    if (isNaN(temperature)) {
        temperature = isFahrenheit ? 68 : 20;
    }
    const tempCelsius = isFahrenheit ? fahrenheitToCelsius(temperature) : temperature;

    // Calculate area
    const areaMultiplier = unitsToSqMeters[units];
    const areaSqMeters = length * width * areaMultiplier;

    // Calculate total cloth and resin weight & track material types used
    let totalClothWeightKg = 0;
    let totalResinWeightKg = 0;
    const layers = layersContainer.querySelectorAll(".layer");
    let layerDetails = [];
    const materialTypesUsed = new Set(); // Track types like 'fiberglass', 'carbon', 'kevlar'

    layers.forEach((layer, index) => {
      const materialSelect = layer.querySelector(".material-type");
      const materialKey = materialSelect.value;
      const material = materialData[materialKey];

      if (!material || typeof material.weight !== 'number' || !material.unit || typeof material.ratio !== 'number') {
        console.error(`Invalid or incomplete material data for key: ${materialKey} in layer ${index + 1}`);
        layerDetails.push(`${materialSelect.options[materialSelect.selectedIndex].text} (Error)`);
        return;
      }

      // Track the type of material used (e.g., 'fiberglass', 'carbon')
      if (material.type) {
          materialTypesUsed.add(material.type);
      }

      let layerMaterialWeightKgSqM = 0;
      if (material.unit === 'oz/sq ft') {
        layerMaterialWeightKgSqM = material.weight * ozSqFtToKgSqM;
      } else if (material.unit === 'oz/sq yd') {
        layerMaterialWeightKgSqM = material.weight * ozSqYdToKgSqM;
      } else if (material.unit === 'gsm') {
        layerMaterialWeightKgSqM = material.weight * gsmToKgSqM;
      } else {
        console.error(`Unknown material unit: ${material.unit} for key: ${materialKey}`);
        layerDetails.push(`${material.name} (Unknown Unit)`);
        return;
      }

      if (isNaN(layerMaterialWeightKgSqM) || layerMaterialWeightKgSqM < 0) {
        console.error(`Invalid calculated material weight for key: ${materialKey}`);
        layerMaterialWeightKgSqM = 0;
      }

      const layerClothWeightKg = areaSqMeters * layerMaterialWeightKgSqM;
      if (isNaN(layerClothWeightKg)) {
        console.error(`Invalid layer cloth weight calculated for key: ${materialKey}`);
        layerDetails.push(`${material.name} (Calc Error)`);
        return;
      }

      const layerResinWeightKg = layerClothWeightKg * material.ratio;
      if (isNaN(layerResinWeightKg)) {
        console.error(`Invalid layer resin weight calculated for key: ${materialKey}`);
        layerDetails.push(`${material.name} (Calc Error)`);
        return;
      }

      totalClothWeightKg += layerClothWeightKg;
      totalResinWeightKg += layerResinWeightKg;
      layerDetails.push(material.name);
    });

    if (totalResinWeightKg <= 0 || isNaN(totalResinWeightKg)) {
        if (resultsSection) resultsSection.style.display = "none";
        if (affiliateLinksContainer) affiliateLinksContainer.style.display = "none";
        lastCalculatedResults = null;
        return;
    }

    // Calculate resin volume
    const selectedResin = resinData[resinType];
    const resinDensityGramsPerML = selectedResin.density;
    const resinVolumeLiters = (totalResinWeightKg * 1000) / resinDensityGramsPerML / 1000;

    // Calculate hardener/MEKP
    let hardenerAmount = 0;
    let hardenerUnit = "";
    let mekpPercentage = 0;
    let mekpCcs = 0;
    let mekpDrops = 0;

    if (resinType === "epoxy") {
      if (mekpResultsContainer) mekpResultsContainer.style.display = "none";
      const ratioParts = epoxyRatioValue.split(":");
      const resinPart = parseFloat(ratioParts[0]);
      const hardenerPart = parseFloat(ratioParts[1]);

      if (!isNaN(resinPart) && !isNaN(hardenerPart) && resinPart > 0) {
        if (epoxyRatioValue.includes("Volume")) {
          const hardenerVolumeLiters = (resinVolumeLiters / resinPart) * hardenerPart;
          hardenerAmount = hardenerVolumeLiters;
          hardenerUnit = "L";
        } else { // Assume ratio is by weight
          const hardenerWeightKg = (totalResinWeightKg / resinPart) * hardenerPart;
          hardenerAmount = (hardenerWeightKg * 1000) / approxEpoxyHardenerDensity / 1000;
          hardenerUnit = "L";
        }
      }
    } else { // Polyester or Vinylester
      if (mekpResultsContainer) mekpResultsContainer.style.display = "block";
      mekpPercentage = Math.max(1, Math.min(3, 1.5 + (20 - tempCelsius) * 0.1));
      const mekpWeightGrams = (totalResinWeightKg * 1000) * (mekpPercentage / 100);
      mekpCcs = mekpWeightGrams / mekpDensity;
      mekpDrops = mekpCcs / mlPerDrop;
      hardenerAmount = mekpCcs;
      hardenerUnit = "mL";
    }

    // Calculate working time
    const tempDiff = tempCelsius - 20;
    const workingTime = selectedResin.baseWorkingTime * Math.exp(-selectedResin.tempSensitivityFactor * tempDiff);

    // Calculate cost
    let estimatedCost = 0;
    if (!isNaN(cost) && cost > 0) {
        let costPerLiter = 0;
        if (costUnit === 'gallon') {
            costPerLiter = cost / literToGallon / gallonToQuart / quartToFlOz * literToFlOz;
        } else if (costUnit === 'quart') {
            costPerLiter = cost / literToQuart / quartToFlOz * literToFlOz;
        } else if (costUnit === 'liter') {
            costPerLiter = cost;
        } else if (costUnit === 'kg') {
            costPerLiter = cost * resinDensityGramsPerML;
        } else if (costUnit === 'lb') {
            costPerLiter = (cost / kgToLb) * resinDensityGramsPerML;
        }
        estimatedCost = resinVolumeLiters * costPerLiter;
    }

    // Store results
    lastCalculatedResults = {
      system: system,
      areaSqMeters: areaSqMeters,
      resinVolumeLiters: resinVolumeLiters,
      totalResinWeightKg: totalResinWeightKg,
      totalClothWeightKg: totalClothWeightKg,
      hardenerAmountBase: hardenerAmount,
      hardenerUnitBase: hardenerUnit,
      mekpPercentage: mekpPercentage,
      mekpCcs: mekpCcs,
      mekpDrops: mekpDrops,
      workingTime: workingTime,
      estimatedCost: estimatedCost,
      materialTypesUsed: materialTypesUsed, // Store the set of material types
      printTimestamp: new Date().toLocaleString(),
      printSystem: system === 'metric' ? 'Metric' : 'Imperial',
      printDimensions: `${length} ${unitsSelect.options[unitsSelect.selectedIndex].text} x ${width} ${unitsSelect.options[unitsSelect.selectedIndex].text}`,
      printResin: resinTypeSelect.options[resinTypeSelect.selectedIndex].text + (resinType === 'epoxy' ? ` (${epoxyRatioValue})` : ''),
      printTemp: `${temperature.toFixed(1)} ${isFahrenheit ? '°F' : '°C'}`,
      printLayers: layerDetails.join(', ')
    };

    // Display results
    displayResultsInSelectedUnits();
    updateAffiliateLinks(resinType, materialTypesUsed);
    updatePrintSummary();

    // Make results visible
    if (resultsSection) resultsSection.style.display = "block";
    if (affiliateLinksContainer) affiliateLinksContainer.style.display = "block";
  }

  // --- Helper: Format Volume ---
  function formatVolume(volumeLiters, targetUnit, system) {
      let value = 0;
      let unit = targetUnit;
      let note = "";

      if (system === "imperial") {
          const volumeGal = volumeLiters * literToGallon;
          const volumeQt = volumeLiters * literToQuart;
          const volumeFlOz = volumeLiters * literToFlOz;

          if (targetUnit === "gal") {
              if (volumeGal < 0.25 && volumeQt >= 1) {
                  value = volumeQt;
                  unit = "qt";
                  note = " (shown in qt as result < 0.25 gal)";
              } else if (volumeGal < 0.25 && volumeQt < 1) {
                  value = volumeFlOz;
                  unit = "fl oz";
                  note = " (shown in fl oz as result < 1 qt)";
              } else {
                  value = volumeGal;
                  unit = "gal";
              }
          } else if (targetUnit === "qt") {
              if (volumeQt < 1) {
                  value = volumeFlOz;
                  unit = "fl oz";
                  note = " (shown in fl oz as result < 1 qt)";
              } else {
                  value = volumeQt;
                  unit = "qt";
              }
          } else { // targetUnit === "floz"
              value = volumeFlOz;
              unit = "fl oz";
          }
      } else { // Metric
          const volumeML = volumeLiters * 1000;
          if (targetUnit === "l") {
              if (volumeLiters < 1) {
                  value = volumeML;
                  unit = "mL";
                  note = " (shown in mL as result < 1 L)";
              } else {
                  value = volumeLiters;
                  unit = "l";
              }
          } else { // targetUnit === "ml"
              value = volumeML;
              unit = "mL";
          }
      }
      const precision = (unit === "fl oz" || unit === "mL") ? 2 : 3;
      return `${value.toFixed(precision)} ${unit}${note}`;
  }

  // --- Helper: Format Weight ---
 function formatWeight(weightKg, system) {
    let value = 0;
    let unit = "";
    if (system === "imperial") {
        const weightLb = weightKg * kgToLb;
        const weightOz = weightLb * lbToOz;
        if (weightLb < 1) {
            value = weightOz;
            unit = "oz";
        } else {
            value = weightLb;
            unit = "lb";
        }
    } else { // Metric
        const weightG = weightKg * 1000;
        if (weightKg < 1) {
            value = weightG;
            unit = "g";
        } else {
            value = weightKg;
            unit = "kg";
        }
    }
    const precision = (unit === "oz" || unit === "g") ? 2 : 3;
    return `${value.toFixed(precision)} ${unit}`;
}


  // --- Display Results in Selected Units ---
  function displayResultsInSelectedUnits() {
    if (!lastCalculatedResults) {
        if (totalAreaEl) totalAreaEl.textContent = '-';
        if (resinVolumeEl) resinVolumeEl.textContent = '-';
        if (resinWeightEl) resinWeightEl.textContent = '-';
        if (hardenerAmountEl) hardenerAmountEl.textContent = '-';
        if (workingTimeEl) workingTimeEl.textContent = '-';
        if (estimatedCostEl) estimatedCostEl.textContent = '-';
        if (clothResinRatioEl) clothResinRatioEl.textContent = '-';
        if (mekpPercentageEl) mekpPercentageEl.textContent = '-';
        if (mekpCcsEl) mekpCcsEl.textContent = '-';
        if (mekpDropsEl) mekpDropsEl.textContent = '-';
        return;
    }

    const { system, areaSqMeters, resinVolumeLiters, totalResinWeightKg, totalClothWeightKg,
            hardenerAmountBase, hardenerUnitBase, mekpPercentage, mekpCcs, mekpDrops,
            workingTime, estimatedCost } = lastCalculatedResults;

    const selectedVolumeUnit = resultVolumeUnitSelect.value;

    // Update textContent of existing elements
    if (totalAreaEl) {
        const areaDisplay = system === 'metric' ? `${areaSqMeters.toFixed(3)} m²` : `${(areaSqMeters * sqMeterToSqFeet).toFixed(2)} ft²`;
        totalAreaEl.textContent = areaDisplay;
    } else { console.error("totalAreaEl not found!"); }

    if (resinVolumeEl) {
        const volumeText = formatVolume(resinVolumeLiters, selectedVolumeUnit, system);
        resinVolumeEl.textContent = volumeText;
    } else { console.error("resinVolumeEl not found!"); }

    if (resinWeightEl) {
        const weightText = formatWeight(totalResinWeightKg, system);
        resinWeightEl.textContent = weightText;
    } else { console.error("resinWeightEl not found!"); }

    if (hardenerAmountEl) {
        let hardenerDisplay = "N/A";
        if (hardenerUnitBase === "L") {
            hardenerDisplay = formatVolume(hardenerAmountBase, selectedVolumeUnit, system);
        } else if (hardenerUnitBase === "mL") {
            hardenerDisplay = formatVolume(hardenerAmountBase / 1000, selectedVolumeUnit, system);
        }
        hardenerAmountEl.textContent = hardenerDisplay;
    } else { console.error("hardenerAmountEl not found!"); }

    if (mekpResultsContainer && mekpResultsContainer.style.display === "block") {
        if (mekpPercentageEl) { mekpPercentageEl.textContent = `${mekpPercentage.toFixed(1)}%`; } else { console.error("mekpPercentageEl not found!"); }
        if (mekpCcsEl) { mekpCcsEl.textContent = `${mekpCcs.toFixed(2)} cc`; } else { console.error("mekpCcsEl not found!"); }
        if (mekpDropsEl) { mekpDropsEl.textContent = `${Math.round(mekpDrops)} drops`; } else { console.error("mekpDropsEl not found!"); }
    }

    if (workingTimeEl) {
        const timeText = `${Math.round(workingTime)} minutes`;
        workingTimeEl.textContent = timeText;
    } else { console.error("workingTimeEl not found!"); }

    if (estimatedCostEl) {
        const costText = estimatedCost > 0 ? `$${estimatedCost.toFixed(2)}` : "N/A";
        estimatedCostEl.textContent = costText;
    } else { console.error("estimatedCostEl not found!"); }

    if (clothResinRatioEl) {
        const overallRatio = totalClothWeightKg > 0 ? (totalResinWeightKg / totalClothWeightKg).toFixed(2) : 'N/A';
        const ratioText = totalClothWeightKg > 0 ? `1 : ${overallRatio} (by weight)` : "N/A";
        clothResinRatioEl.textContent = ratioText;
    } else { console.error("clothResinRatioEl not found!"); }
  }

  // --- Update Print Summary ---
  function updatePrintSummary() {
      if (!lastCalculatedResults || !printTimestampEl) return;
      printTimestampEl.textContent = lastCalculatedResults.printTimestamp;
      printSystemEl.textContent = lastCalculatedResults.printSystem;
      printDimensionsEl.textContent = lastCalculatedResults.printDimensions;
      printResinEl.textContent = lastCalculatedResults.printResin;
      printTempEl.textContent = lastCalculatedResults.printTemp;
      printLayersEl.textContent = lastCalculatedResults.printLayers;
  }

  // --- Affiliate Link Logic ---
  function updateAffiliateLinks(resinType, materialTypesUsed) {
    if (typeof chemcalcAffiliateLinks !== 'undefined' && affiliateLinksList) {
      const alwaysShowLinks = chemcalcAffiliateLinks.alwaysShow || [];
      const resinSpecificLinks = chemcalcAffiliateLinks[resinType] || [];
      const dynamicLinks = chemcalcAffiliateLinks.dynamic || {};
      // const defaultLinks = chemcalcAffiliateLinks.default || []; // REMOVED: Don't automatically include all defaults

      // Determine which dynamic cloth links to add based on materials used
      const dynamicLinksToShow = [];
      if (materialTypesUsed) { // Check if the set exists
          if (materialTypesUsed.has('fiberglass') && dynamicLinks.fiberglass_cloth) {
              dynamicLinksToShow.push(dynamicLinks.fiberglass_cloth);
          }
          if (materialTypesUsed.has('carbon') && dynamicLinks.carbon_fiber) {
              dynamicLinksToShow.push(dynamicLinks.carbon_fiber);
          }
          if (materialTypesUsed.has('kevlar') && dynamicLinks.kevlar) {
              dynamicLinksToShow.push(dynamicLinks.kevlar);
          }
          // Add more checks here if more dynamic cloth types are added
      }

      // Combine links: Always show + Resin Specific + Dynamic
      let linksToShow = [...alwaysShowLinks, ...resinSpecificLinks, ...dynamicLinksToShow];

      // REMOVED: Logic that added defaultLinks automatically
      // linksToShow = [...linksToShow, ...defaultLinks];

      // Remove duplicates (based on URL, simple approach)
      const uniqueLinks = [];
      const seenUrls = new Set();
      for (const link of linksToShow) {
          if (link && link.url && !seenUrls.has(link.url)) {
              uniqueLinks.push(link);
              seenUrls.add(link.url);
          }
      }

      affiliateLinksList.innerHTML = uniqueLinks.map(link =>
        `<li><a href="${link.url}" target="_blank" rel="noopener sponsored">${link.text}</a></li>`
      ).join('');

    } else if (affiliateLinksList) {
      affiliateLinksList.innerHTML = '<li>Affiliate links not available.</li>';
    } else {
        console.error("affiliateLinksList element not found!");
    }
  }

  // --- EVENT DELEGATION SETUP ---
  if (form) {
      form.addEventListener('input', (event) => {
          if (event.target.matches('#length, #width, #temperature, #resin-cost')) {
              calculateResin();
          }
      });

      form.addEventListener('change', (event) => {
          if (event.target.matches('#units, #resin-type, #epoxy-mix-ratio, #resin-cost-unit, .material-type')) {
              calculateResin();
          }
          else if (event.target.matches('#result-system')) {
              handleResultSystemChange();
          }
          else if (event.target.matches('#result-volume-unit')) {
              displayResultsInSelectedUnits(); // Only redisplay, don't recalculate
          }
          else if (event.target.matches('#temp-unit-toggle')) {
              handleTempUnitToggle();
          }
          if (event.target.matches('#resin-type')) {
              toggleEpoxyRatioVisibility();
          }
      });

      form.addEventListener('click', (event) => {
          if (event.target.matches('#add-layer-btn')) {
              handleAddLayer();
          }
          else if (event.target.matches('.remove-layer-btn')) {
              handleRemoveLayer(event);
          }
      });
  } else {
      console.error("Form element not found!");
  }

  // --- Initial Setup Calls ---
  setupInitialUnitsAndInputs();
  toggleEpoxyRatioVisibility();
  updateRemoveButtonVisibility();
  calculateResin(); // Initial calculation on load

});

