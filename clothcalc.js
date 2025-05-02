// clothcalc.js - v12 (Fix Material Filtering & Bugs)

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

  let layerCount = 1;
  let isFahrenheit = false;
  let currentResultUnitSystem = "metric";
  let lastCalculatedResults = null;

  // --- Material Data (Resin Ratio by Weight, Density in g/cm³) ---
  const materialData = {
    // Imperial
    "csm_0.75": { ratio: 1.5, density: 1.5, system: 'imperial' },
    "csm_1.5": { ratio: 1.5, density: 1.5, system: 'imperial' },
    "csm_2.0": { ratio: 1.5, density: 1.5, system: 'imperial' },
    wr_18: { ratio: 1.0, density: 1.8, system: 'imperial' },
    wr_24: { ratio: 1.0, density: 1.8, system: 'imperial' },
    combo_1708: { ratio: 1.2, density: 1.6, system: 'imperial' },
    combo_1808: { ratio: 1.2, density: 1.6, system: 'imperial' },
    cloth_4: { ratio: 1.0, density: 1.9, system: 'imperial' },
    cloth_6: { ratio: 1.0, density: 1.9, system: 'imperial' },
    cloth_10: { ratio: 1.0, density: 1.9, system: 'imperial' },
    "carbon_5.7": { ratio: 0.8, density: 1.7, system: 'imperial' },
    "carbon_11": { ratio: 0.8, density: 1.7, system: 'imperial' },
    "kevlar_5": { ratio: 1.0, density: 1.44, system: 'imperial' },
    // Metric
    "csm_225gsm": { ratio: 1.5, density: 1.5, system: 'metric' },
    "csm_450gsm": { ratio: 1.5, density: 1.5, system: 'metric' },
    "csm_600gsm": { ratio: 1.5, density: 1.5, system: 'metric' },
    "wr_600gsm": { ratio: 1.0, density: 1.8, system: 'metric' },
    "wr_800gsm": { ratio: 1.0, density: 1.8, system: 'metric' },
    "combo_800gsm": { ratio: 1.2, density: 1.6, system: 'metric' },
    "combo_850gsm": { ratio: 1.2, density: 1.6, system: 'metric' },
    "cloth_135gsm": { ratio: 1.0, density: 1.9, system: 'metric' },
    "cloth_200gsm": { ratio: 1.0, density: 1.9, system: 'metric' },
    "cloth_340gsm": { ratio: 1.0, density: 1.9, system: 'metric' },
    "carbon_200gsm": { ratio: 0.8, density: 1.7, system: 'metric' },
    "carbon_370gsm": { ratio: 0.8, density: 1.7, system: 'metric' },
    "kevlar_170gsm": { ratio: 1.0, density: 1.44, system: 'metric' }
  };

  // --- Resin Data (Density in g/cm³, Base Working Time in minutes at 20C) ---
  const resinData = {
    polyester: { density: 1.1, baseWorkingTime: 30, tempSensitivityFactor: 0.07 },
    vinylester: { density: 1.1, baseWorkingTime: 30, tempSensitivityFactor: 0.07 },
    epoxy: { density: 1.15, baseWorkingTime: 45, tempSensitivityFactor: 0.04 },
  };

  // --- Unit Conversion Factors ---
  const unitsToSqMeters = { in: 0.00064516, ft: 0.092903, cm: 0.0001, m: 1 };
  const ozSqFtToKgSqM = 0.030515;
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
  const mekpDensity = 1.1; // g/cm³
  const approxEpoxyHardenerDensity = 1.0; // g/cm³ (approximation for volume calcs)

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
    const system = resultSystemSelect.value; // 'metric' or 'imperial'

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

  // --- Update Material Options Based on System (Revised Logic) ---
  function updateMaterialOptions() {
    if (!resultSystemSelect || !layersContainer) return;
    const targetSystem = resultSystemSelect.value; // 'metric' or 'imperial'
    const materialSelects = layersContainer.querySelectorAll('.material-type');

    materialSelects.forEach(select => {
      let firstVisibleOptionValue = null;
      let currentSelectionVisible = false;
      const currentSelectedValue = select.value;

      for (let i = 0; i < select.options.length; i++) {
        const option = select.options[i];
        const optionValue = option.value;
        const materialInfo = materialData[optionValue]; // Get data based on value
        let isVisible = false;

        // Check if material data exists and matches the target system
        if (materialInfo && materialInfo.system === targetSystem) {
            isVisible = true;
        }

        option.style.display = isVisible ? '' : 'none';

        if (isVisible) {
          if (firstVisibleOptionValue === null) {
            firstVisibleOptionValue = optionValue; // Store the first valid option
          }
          if (optionValue === currentSelectedValue) {
            currentSelectionVisible = true;
          }
        }
      }

      // If the currently selected option is now hidden, select the first visible one
      if (!currentSelectionVisible && firstVisibleOptionValue) {
        select.value = firstVisibleOptionValue;
      }
      // If no options are visible (error state), maybe log it or handle it
      if (firstVisibleOptionValue === null) {
          console.error("No material options available for the selected system!");
          // Optionally clear the selection or set to a default/placeholder
          // select.value = ""; // Or some default value if applicable
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
      resultVolumeUnitSelect.removeEventListener("change", displayResultsInSelectedUnits);
      resultVolumeUnitSelect.addEventListener("change", displayResultsInSelectedUnits);
  }

  // --- Handle Result System Change ---
  function handleResultSystemChange() {
      currentResultUnitSystem = resultSystemSelect.value;
      populateResultUnitOptions();
      updateInputOptions(); // Update ALL input dropdowns (dimensions, cost, materials)
      calculateResin(); // Recalculate with new system defaults
  }

  // --- Initial Setup for Result Units & Inputs ---
  function setupInitialUnitsAndInputs() {
      if (!resultSystemSelect) return;
      resultSystemSelect.value = currentResultUnitSystem;
      populateResultUnitOptions();
      updateInputOptions(); // Initial filtering of ALL input options
      resultSystemSelect.removeEventListener("change", handleResultSystemChange);
      resultSystemSelect.addEventListener("change", handleResultSystemChange);
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

  // Event Listeners for automatic calculation
  const inputsToWatch = [
    lengthInput, widthInput, unitsSelect, resinTypeSelect,
    epoxyMixRatioSelect,
    temperatureInput, resinCostInput, resinCostUnitSelect
    // resultSystemSelect is handled separately by handleResultSystemChange
  ];

  inputsToWatch.forEach(input => {
    if (input) {
      const eventType = (input.tagName === "SELECT") ? "change" : "input";
      input.addEventListener(eventType, calculateResin);
    }
  });

  // Special listener for resin type to toggle epoxy ratio dropdown
  if (resinTypeSelect) {
      resinTypeSelect.addEventListener("change", () => {
          toggleEpoxyRatioVisibility();
          calculateResin(); // Recalculate when resin type changes
      });
  }

  if (tempUnitToggle) {
      tempUnitToggle.addEventListener("change", () => {
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
      });
  }

  // --- Add Layer Functionality ---
  if (addLayerBtn) {
      addLayerBtn.addEventListener("click", () => {
        layerCount++;
        const firstLayer = layersContainer.querySelector(".layer");
        if (!firstLayer) return;
        const newLayer = firstLayer.cloneNode(true);
        newLayer.querySelector(".layer-title").textContent = `Layer ${layerCount}`;
        newLayer.querySelectorAll("[id]").forEach((el) => {
          const oldId = el.id;
          if (oldId) {
              const newId = oldId.replace(/-\d+$/, `-${layerCount}`);
              el.id = newId;
              if (el.classList.contains("material-type")) {
                  el.addEventListener("change", calculateResin);
              }
          }
        });
        newLayer.querySelectorAll("[for]").forEach((el) => {
          const oldFor = el.htmlFor;
          if (oldFor) {
              el.htmlFor = oldFor.replace(/-\d+$/, `-${layerCount}`);
          }
        });
        newLayer.querySelectorAll("[name]").forEach((el) => {
            const oldName = el.name;
            if(oldName) {
                el.name = oldName.replace(/-\d+$/, `-${layerCount}`);
            }
        });

        const materialSelect = newLayer.querySelector(".material-type");
        // No need to set selectedIndex = 0, let updateMaterialOptions handle it

        const removeBtn = newLayer.querySelector(".remove-layer-btn");
        if (removeBtn) {
            removeBtn.style.display = "inline-block";
            removeBtn.addEventListener("click", () => {
              if (layersContainer.children.length > 1) {
                newLayer.remove();
                updateLayerTitles();
                calculateResin();
              }
            });
        }
        layersContainer.appendChild(newLayer);
        updateLayerTitles();
        updateMaterialOptions(); // Filter options for the newly added layer
        calculateResin();
      });
  }

  function updateLayerTitles() {
    const layers = layersContainer.querySelectorAll(".layer");
    layers.forEach((layer, index) => {
      layer.querySelector(".layer-title").textContent = `Layer ${index + 1}`;
      const removeBtn = layer.querySelector(".remove-layer-btn");
      if (removeBtn) {
          removeBtn.style.display = (index === 0 && layers.length === 1) ? "none" : "inline-block";
      }
    });
    layerCount = layers.length;
  }

  function setupInitialLayer(){
      const firstLayerSelect = layersContainer.querySelector(".material-type");
      if(firstLayerSelect) {
          firstLayerSelect.addEventListener("change", calculateResin);
      }
      updateLayerTitles();
      // updateMaterialOptions(); // Called by setupInitialUnitsAndInputs
  }

  // --- Calculation Logic ---
  function calculateResin() {
    console.log("calculateResin called - v12"); // Debug log
    const length = parseFloat(lengthInput.value) || 0;
    const width = parseFloat(widthInput.value) || 0;
    const unit = unitsSelect.value;
    const resinType = resinTypeSelect.value;
    const epoxyMixRatioValue = epoxyMixRatioSelect ? epoxyMixRatioSelect.value : null;
    const tempInputVal = parseFloat(temperatureInput.value) || (isFahrenheit ? 68 : 20);
    const tempC = isFahrenheit ? fahrenheitToCelsius(tempInputVal) : tempInputVal;
    const resinCostInputVal = parseFloat(resinCostInput.value) || 0;
    const resinCostUnit = resinCostUnitSelect.value;

    // Validate dimension unit consistency
    const currentSystem = resultSystemSelect.value;
    const isMetricDimUnit = unit === 'cm' || unit === 'm';
    if ((currentSystem === 'metric' && !isMetricDimUnit) || (currentSystem === 'imperial' && isMetricDimUnit)) {
        console.warn("Dimension unit inconsistent with selected system. Recalculating after unit update.");
    }

    if (length <= 0 || width <= 0) {
      clearResults(true);
      resultsSection.style.display = "block";
      lastCalculatedResults = null;
      return;
    }

    resultsSection.style.display = "block";

    const areaSqM = length * width * unitsToSqMeters[unit];
    let totalMaterialWeightKg = 0;
    let totalBaseResinWeightKg = 0;
    const selectedMaterials = [];
    const selectedRatios = [];
    const multiLayerEfficiencyFactor = 0.85;

    const layers = layersContainer.querySelectorAll(".layer");
    layers.forEach((layer, index) => {
      const materialSelect = layer.querySelector(".material-type");
      if (!materialSelect) return;
      const materialKey = materialSelect.value;
      selectedMaterials.push(materialKey);
      const data = materialData[materialKey];

      // Check if the selected material data exists
      if (!data) {
        console.warn(`Material data not found: ${materialKey}`);
        return; // Skip this layer if data is missing
      }
      // We assume updateMaterialOptions has already filtered correctly based on system
      selectedRatios.push(data.ratio);

      let materialWeightKgSqM = 0;
      const selectedOptionText = materialSelect.options[materialSelect.selectedIndex]?.text || "";
      const weightMatch = selectedOptionText.match(/(\d*\.?\d+)\s*oz\/(sq ft|sq yd)|(\d*\.?\d+)\s*gsm/i);

      if (weightMatch) {
        if (weightMatch[1] && weightMatch[2]) { // Imperial oz
          const weightOz = parseFloat(weightMatch[1]);
          const areaUnit = weightMatch[2].toLowerCase();
          materialWeightKgSqM = areaUnit === "sq ft" ? weightOz * ozSqFtToKgSqM : weightOz * ozSqYdToKgSqM;
        } else if (weightMatch[3]) { // Metric gsm
          const weightGsm = parseFloat(weightMatch[3]);
          materialWeightKgSqM = weightGsm * gsmToKgSqM;
        }
      }

      if (materialWeightKgSqM > 0) {
        const layerMaterialWeightKg = materialWeightKgSqM * areaSqM;
        totalMaterialWeightKg += layerMaterialWeightKg;

        let layerBaseResinWeightKg = layerMaterialWeightKg * data.ratio;
        if (index > 0) {
            layerBaseResinWeightKg *= multiLayerEfficiencyFactor;
        }
        totalBaseResinWeightKg += layerBaseResinWeightKg;

      } else {
        console.warn(`Could not parse weight for material: ${materialKey} from text: "${selectedOptionText}"`);
      }
    });

    const wasteFactor = 1.15;
    totalBaseResinWeightKg *= wasteFactor;

    const selectedResin = resinData[resinType];
    if (!selectedResin) {
        console.error(`Resin data not found for type: ${resinType}`);
        clearResults();
        lastCalculatedResults = null;
        return;
    }
    const resinDensityKgL = selectedResin.density;
    const totalBaseResinVolumeL = totalBaseResinWeightKg / resinDensityKgL;

    // --- Calculate Hardener/Catalyst (Metric) ---
    let hardenerWeightKg = null;
    let hardenerVolumeL = null;
    let mekpPercentage = null;
    let mekpVolumeMl = null;
    let mekpDrops = null;
    let totalMixedResinWeightKg = totalBaseResinWeightKg;
    let totalMixedResinVolumeL = totalBaseResinVolumeL;
    let hardenerRatio = null;
    let hardenerRatioType = null; // 'w' or 'v'

    if (resinType === "epoxy" && epoxyMixRatioValue) {
        const ratioMatch = epoxyMixRatioValue.match(/(\d+):(\d+)([wv])/);
        if (ratioMatch) {
            const resinPart = parseFloat(ratioMatch[1]);
            const hardenerPart = parseFloat(ratioMatch[2]);
            hardenerRatioType = ratioMatch[3];
            hardenerRatio = hardenerPart / resinPart;

            if (hardenerRatioType === 'w') { // Ratio by Weight
                hardenerWeightKg = totalBaseResinWeightKg * hardenerRatio;
                hardenerVolumeL = hardenerWeightKg / approxEpoxyHardenerDensity; // Approx volume
                totalMixedResinWeightKg = totalBaseResinWeightKg + hardenerWeightKg;
                totalMixedResinVolumeL = totalBaseResinVolumeL + hardenerVolumeL;
            } else { // Ratio by Volume
                hardenerVolumeL = totalBaseResinVolumeL * hardenerRatio;
                hardenerWeightKg = hardenerVolumeL * approxEpoxyHardenerDensity; // Approx weight
                totalMixedResinWeightKg = totalBaseResinWeightKg + hardenerWeightKg;
                totalMixedResinVolumeL = totalBaseResinVolumeL + hardenerVolumeL;
            }
        } else {
            console.error("Invalid epoxy mix ratio format:", epoxyMixRatioValue);
        }
    } else if (resinType === "polyester" || resinType === "vinylester") {
      // MEKP calculation (based on BASE resin weight)
      mekpPercentage = 1.5;
      if (tempC >= 29.4) mekpPercentage = 1.0;
      else if (tempC >= 23.9) mekpPercentage = 1.5;
      else if (tempC >= 18.3) mekpPercentage = 2.0;
      else if (tempC >= 15.6) mekpPercentage = 2.5;
      else mekpPercentage = 3.0;
      mekpPercentage = Math.max(1.0, Math.min(3.0, mekpPercentage));
      const mekpWeightKg = totalBaseResinWeightKg * (mekpPercentage / 100);
      mekpVolumeMl = (mekpWeightKg / mekpDensity) * 1000;
      mekpDrops = mekpVolumeMl / mlPerDrop;
      // For display purposes, treat MEKP as the "hardener"
      hardenerWeightKg = mekpWeightKg;
      hardenerVolumeL = mekpVolumeMl / 1000;
    }

    // --- Calculate Working Time ---
    const baseWorkingTime = selectedResin.baseWorkingTime;
    const tempSensitivityFactor = selectedResin.tempSensitivityFactor;
    const workingTimeMinutes = baseWorkingTime * Math.exp((20 - tempC) * tempSensitivityFactor);

    // --- Calculate Cost ---
    let estimatedCost = 0;
    if (resinCostInputVal > 0) {
        let costPerKg = 0;
        // Validate cost unit consistency
        const isMetricCostUnit = resinCostUnit === 'liter' || resinCostUnit === 'kg';
        if ((currentSystem === 'metric' && !isMetricCostUnit) || (currentSystem === 'imperial' && isMetricCostUnit)) {
             console.warn("Cost unit inconsistent with selected system. Cost calculation may be inaccurate.");
        }

        switch (resinCostUnit) {
            case 'gal': costPerKg = resinCostInputVal / (literToGallon * resinDensityKgL); break;
            case 'liter': costPerKg = resinCostInputVal / resinDensityKgL; break;
            case 'lb': costPerKg = resinCostInputVal * kgToLb; break;
            case 'kg': costPerKg = resinCostInputVal; break;
        }
        // Cost based on TOTAL mixed resin weight (including hardener/catalyst)
        estimatedCost = totalMixedResinWeightKg * costPerKg;
    }

    // --- Store Results (Metric Base Units) ---
    lastCalculatedResults = {
      areaSqM,
      totalBaseResinWeightKg,
      totalBaseResinVolumeL,
      hardenerWeightKg,
      hardenerVolumeL,
      totalMixedResinWeightKg,
      totalMixedResinVolumeL,
      mekpPercentage,
      mekpVolumeMl,
      mekpDrops,
      workingTimeMinutes,
      estimatedCost,
      resinType,
      epoxyMixRatioValue,
      hardenerRatioType,
      tempC,
      selectedRatios
    };

    // --- Display Results ---
    displayResultsInSelectedUnits();
    updateAffiliateLinks(selectedMaterials, resinType);
  }

  // --- Display Results in Selected Units ---
  function displayResultsInSelectedUnits() {
    if (!lastCalculatedResults || !resultsContent) {
        clearResults();
        return;
    }

    const system = resultSystemSelect.value;
    const selectedVolumeUnit = resultVolumeUnitSelect.value;
    const { areaSqM, totalBaseResinWeightKg, totalBaseResinVolumeL, hardenerWeightKg, hardenerVolumeL, totalMixedResinWeightKg, totalMixedResinVolumeL, mekpPercentage, mekpVolumeMl, mekpDrops, workingTimeMinutes, estimatedCost, resinType, epoxyMixRatioValue, hardenerRatioType, tempC, selectedRatios } = lastCalculatedResults;

    let displayArea, displayAreaUnit, areaPrecision;
    let displayWeight, displayWeightUnit, weightPrecision;
    let displayVolume, displayVolumeUnit, volumePrecision;
    let displayHardener, displayHardenerUnit, hardenerPrecision;
    let displayCost, costPrecision;

    if (system === "imperial") {
      displayArea = areaSqM * sqMeterToSqFeet;
      displayAreaUnit = "ft²";
      areaPrecision = 2;

      displayWeight = totalMixedResinWeightKg * kgToLb;
      displayWeightUnit = "lbs";
      weightPrecision = 2;
      if (displayWeight < 1.0 && displayWeight > 0) {
          displayWeight *= lbToOz;
          displayWeightUnit = "oz";
          weightPrecision = 1;
      }

      let initialDisplayVolume, initialDisplayHardener;
      switch (selectedVolumeUnit) {
        case "gal":
          initialDisplayVolume = totalMixedResinVolumeL * literToGallon;
          displayVolumeUnit = "gal";
          initialDisplayHardener = hardenerVolumeL * literToGallon;
          displayHardenerUnit = "gal";
          volumePrecision = 2;
          hardenerPrecision = 2;
          // Auto-switch gal to qt
          if (initialDisplayVolume < 1.0 && initialDisplayVolume > 0) {
              initialDisplayVolume *= gallonToQuart;
              displayVolumeUnit = "qt";
              initialDisplayHardener *= gallonToQuart;
              displayHardenerUnit = "qt";
              // Auto-switch qt to fl oz
              if (initialDisplayVolume < 1.0 && initialDisplayVolume > 0) {
                  initialDisplayVolume *= quartToFlOz;
                  displayVolumeUnit = "fl oz";
                  initialDisplayHardener *= quartToFlOz;
                  displayHardenerUnit = "fl oz";
                  volumePrecision = 1;
                  hardenerPrecision = 1;
              }
          }
          break;
        case "qt":
          initialDisplayVolume = totalMixedResinVolumeL * literToQuart;
          displayVolumeUnit = "qt";
          initialDisplayHardener = hardenerVolumeL * literToQuart;
          displayHardenerUnit = "qt";
          volumePrecision = 2;
          hardenerPrecision = 2;
          // Auto-switch qt to fl oz
          if (initialDisplayVolume < 1.0 && initialDisplayVolume > 0) {
              initialDisplayVolume *= quartToFlOz;
              displayVolumeUnit = "fl oz";
              initialDisplayHardener *= quartToFlOz;
              displayHardenerUnit = "fl oz";
              volumePrecision = 1;
              hardenerPrecision = 1;
          }
          break;
        case "floz":
        default:
          initialDisplayVolume = totalMixedResinVolumeL * literToFlOz;
          displayVolumeUnit = "fl oz";
          initialDisplayHardener = hardenerVolumeL * literToFlOz;
          displayHardenerUnit = "fl oz";
          volumePrecision = 1;
          hardenerPrecision = 1;
          break;
      }
      displayVolume = initialDisplayVolume;
      displayHardener = initialDisplayHardener;

      displayCost = estimatedCost;
      costPrecision = 2;

    } else { // Metric
      displayArea = areaSqM;
      displayAreaUnit = "m²";
      areaPrecision = 2;

      displayWeight = totalMixedResinWeightKg;
      displayWeightUnit = "kg";
      weightPrecision = 2;
      if (displayWeight < 1.0 && displayWeight > 0) {
          displayWeight *= 1000;
          displayWeightUnit = "g";
          weightPrecision = 1;
      }

      let initialDisplayVolume, initialDisplayHardener;
      switch (selectedVolumeUnit) {
        case "ml":
          initialDisplayVolume = totalMixedResinVolumeL * 1000;
          displayVolumeUnit = "mL";
          initialDisplayHardener = hardenerVolumeL * 1000;
          displayHardenerUnit = "mL";
          volumePrecision = 1;
          hardenerPrecision = 1;
          break;
        case "l":
        default:
          initialDisplayVolume = totalMixedResinVolumeL;
          displayVolumeUnit = "L";
          initialDisplayHardener = hardenerVolumeL;
          displayHardenerUnit = "L";
          volumePrecision = 2;
          hardenerPrecision = 2;
          // Auto-switch L to mL
          if (initialDisplayVolume < 1.0 && initialDisplayVolume > 0) {
              initialDisplayVolume *= 1000;
              displayVolumeUnit = "mL";
              initialDisplayHardener *= 1000;
              displayHardenerUnit = "mL";
              volumePrecision = 1;
              hardenerPrecision = 1;
          }
          break;
      }
      displayVolume = initialDisplayVolume;
      displayHardener = initialDisplayHardener;

      displayCost = estimatedCost;
      costPrecision = 2;
    }

    // --- Update DOM Elements ---
    totalAreaEl.textContent = `${displayArea.toFixed(areaPrecision)} ${displayAreaUnit}`;
    resinVolumeEl.textContent = `${displayVolume.toFixed(volumePrecision)} ${displayVolumeUnit}`;
    resinWeightEl.textContent = `${displayWeight.toFixed(weightPrecision)} ${displayWeightUnit}`;

    // Cloth:Resin Ratio Display (Average)
    if (selectedRatios.length > 0 && totalBaseResinWeightKg > 0) { // Ensure we have ratios and resin weight
        const avgRatio = selectedRatios.reduce((sum, ratio) => sum + ratio, 0) / selectedRatios.length;
        // Calculate ratio based on total material weight and total BASE resin weight (before hardener)
        const totalMaterialWeight = totalBaseResinWeightKg / avgRatio; // Estimate total material weight based on average ratio
        const calculatedRatio = totalBaseResinWeightKg / totalMaterialWeight;
        clothResinRatioEl.textContent = `~1:${calculatedRatio.toFixed(1)}`; // Display calculated ratio
    } else {
        clothResinRatioEl.textContent = "N/A";
    }

    // Hardener/Catalyst Display
    if (resinType === "epoxy" && hardenerWeightKg !== null) {
        const ratioText = epoxyMixRatioValue ? `(${epoxyMixRatioValue.replace('w', ' by weight').replace('v', ' by volume')})` : '';
        if (hardenerRatioType === 'w') {
            let hardenerWeightDisplay = system === 'imperial' ? hardenerWeightKg * kgToLb : hardenerWeightKg;
            let hardenerWeightUnit = system === 'imperial' ? 'lbs' : 'kg';
            let hardenerWeightPrecision = 2;
            if (system === 'imperial' && hardenerWeightDisplay < 1.0 && hardenerWeightDisplay > 0) {
                hardenerWeightDisplay *= lbToOz;
                hardenerWeightUnit = 'oz';
                hardenerWeightPrecision = 1;
            } else if (system === 'metric' && hardenerWeightDisplay < 1.0 && hardenerWeightDisplay > 0) {
                hardenerWeightDisplay *= 1000;
                hardenerWeightUnit = 'g';
                hardenerWeightPrecision = 1;
            }
            hardenerAmountEl.textContent = `${hardenerWeightDisplay.toFixed(hardenerWeightPrecision)} ${hardenerWeightUnit} ${ratioText}`;
        } else { // Volume
             hardenerAmountEl.textContent = `${displayHardener.toFixed(hardenerPrecision)} ${displayHardenerUnit} ${ratioText}`;
        }
        mekpResultsContainer.style.display = "none";
    } else if ((resinType === "polyester" || resinType === "vinylester") && mekpPercentage !== null) {
        hardenerAmountEl.textContent = `See MEKP details below`;
        mekpPercentageEl.textContent = `${mekpPercentage.toFixed(1)}%`;
        // Always show MEKP in mL (cc) and drops, regardless of system
        mekpCcsEl.textContent = `${mekpVolumeMl.toFixed(1)} mL (cc)`;
        mekpDropsEl.textContent = `${Math.round(mekpDrops)} drops`;
        mekpResultsContainer.style.display = "block";
    } else {
        hardenerAmountEl.textContent = "N/A";
        mekpResultsContainer.style.display = "none";
    }

    // Working Time Display
    const tempDisplay = system === 'imperial' ? celsiusToFahrenheit(tempC).toFixed(1) + '°F' : tempC.toFixed(1) + '°C';
    workingTimeEl.textContent = `${Math.round(workingTimeMinutes)} minutes (@ ${tempDisplay})`;

    // Cost Display
    const currencySymbol = system === 'imperial' ? '$' : ''; // Basic assumption for now
    estimatedCostEl.textContent = estimatedCost > 0 ? `${currencySymbol}${displayCost.toFixed(costPrecision)}` : "N/A";

    resultsContent.style.display = "block";
  }

  // --- Clear Results ---
  function clearResults(showPlaceholder = false) {
    if (!resultsContent) return;
    if (showPlaceholder) {
        totalAreaEl.textContent = "--";
        resinVolumeEl.textContent = "--";
        resinWeightEl.textContent = "--";
        hardenerAmountEl.textContent = "--";
        workingTimeEl.textContent = "--";
        estimatedCostEl.textContent = "--";
        clothResinRatioEl.textContent = "--";
        mekpResultsContainer.style.display = "none";
        resultsContent.style.display = "block"; // Keep placeholder visible
    } else {
        resultsContent.style.display = "none";
    }
    if (affiliateLinksList) affiliateLinksList.innerHTML = '';
    if (affiliateLinksContainer) affiliateLinksContainer.style.display = 'none';
  }

  // --- Affiliate Link Logic (Placeholder) ---
  function updateAffiliateLinks(materials, resin) {
    if (!affiliateLinksContainer || !affiliateLinksList) return;
    // Basic example: Show generic links based on resin type
    let linksHtml = '';
    if (resin === 'polyester' || resin === 'vinylester') {
        linksHtml += '<li><a href="#" target="_blank">Buy Polyester/Vinylester Resin</a></li>';
        linksHtml += '<li><a href="#" target="_blank">Buy MEKP Catalyst</a></li>';
    } else if (resin === 'epoxy') {
        linksHtml += '<li><a href="#" target="_blank">Buy Epoxy Resin & Hardener</a></li>';
    }
    // Add links based on materials (e.g., CSM, Carbon)
    if (materials.some(m => m.includes('csm'))) {
        linksHtml += '<li><a href="#" target="_blank">Buy Chopped Strand Mat</a></li>';
    }
    if (materials.some(m => m.includes('carbon'))) {
        linksHtml += '<li><a href="#" target="_blank">Buy Carbon Fiber Cloth</a></li>';
    }

    if (linksHtml) {
        affiliateLinksList.innerHTML = linksHtml;
        affiliateLinksContainer.style.display = 'block';
    } else {
        affiliateLinksList.innerHTML = '';
        affiliateLinksContainer.style.display = 'none';
    }
    // TODO: Integrate with actual affiliate_links.js data
  }

  // --- Initial Setup ---
  setupInitialUnitsAndInputs(); // Renamed function
  setupInitialLayer();
  toggleEpoxyRatioVisibility();
  calculateResin(); // Initial calculation on load

});

