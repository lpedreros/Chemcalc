// clothcalc.js - v8 (Refined temp adjustments, Epoxy ratios)

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
  const epoxyRatioContainer = document.getElementById("epoxy-ratio-container"); // Added
  const epoxyMixRatioSelect = document.getElementById("epoxy-mix-ratio"); // Added
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
    "csm_0.75": { ratio: 1.5, density: 1.5 },
    "csm_1.5": { ratio: 1.5, density: 1.5 },
    "csm_2.0": { ratio: 1.5, density: 1.5 },
    wr_18: { ratio: 1.0, density: 1.8 },
    wr_24: { ratio: 1.0, density: 1.8 },
    combo_1708: { ratio: 1.2, density: 1.6 },
    combo_1808: { ratio: 1.2, density: 1.6 },
    cloth_4: { ratio: 1.0, density: 1.9 },
    cloth_6: { ratio: 1.0, density: 1.9 },
    cloth_10: { ratio: 1.0, density: 1.9 },
    "carbon_5.7": { ratio: 0.8, density: 1.7 },
    "carbon_11": { ratio: 0.8, density: 1.7 },
    "kevlar_5": { ratio: 1.0, density: 1.44 }
  };

  // --- Resin Data (Density in g/cm³, Base Working Time in minutes at 20C) ---
  const resinData = {
    polyester: { density: 1.1, baseWorkingTime: 30, tempSensitivityFactor: 0.07 },
    vinylester: { density: 1.1, baseWorkingTime: 30, tempSensitivityFactor: 0.07 },
    epoxy: { density: 1.15, baseWorkingTime: 45, tempSensitivityFactor: 0.04 }, // Default hardener ratio removed
  };

  // --- Unit Conversion Factors ---
  const unitsToSqMeters = { in: 0.00064516, ft: 0.092903, cm: 0.0001, m: 1 };
  const ozSqFtToKgSqM = 0.030515;
  const ozSqYdToKgSqM = 0.033906;
  const gsmToKgSqM = 0.001;
  const kgToLb = 2.20462;
  const literToGallon = 0.264172;
  const literToQuart = 1.05669;
  const literToFlOz = 33.814;
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
      displayResultsInSelectedUnits();
  }

  // --- Initial Setup for Result Units ---
  function setupResultUnits() {
      if (!resultSystemSelect) return;
      resultSystemSelect.value = currentResultUnitSystem;
      populateResultUnitOptions();
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
    epoxyMixRatioSelect, // Added
    temperatureInput, resinCostInput, resinCostUnitSelect
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
        if (materialSelect) materialSelect.selectedIndex = 0;
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
  }

  // --- Calculation Logic ---
  function calculateResin() {
    console.log("calculateResin called - v8"); // Debug log
    const length = parseFloat(lengthInput.value) || 0;
    const width = parseFloat(widthInput.value) || 0;
    const unit = unitsSelect.value;
    const resinType = resinTypeSelect.value;
    const epoxyMixRatioValue = epoxyMixRatioSelect ? epoxyMixRatioSelect.value : null; // Added
    const tempInputVal = parseFloat(temperatureInput.value) || (isFahrenheit ? 68 : 20);
    const tempC = isFahrenheit ? fahrenheitToCelsius(tempInputVal) : tempInputVal;
    const resinCostInputVal = parseFloat(resinCostInput.value) || 0;
    const resinCostUnit = resinCostUnitSelect.value;

    if (length <= 0 || width <= 0) {
      clearResults(true);
      resultsSection.style.display = "block";
      lastCalculatedResults = null;
      return;
    }

    resultsSection.style.display = "block";

    const areaSqM = length * width * unitsToSqMeters[unit];
    let totalMaterialWeightKg = 0;
    let totalBaseResinWeightKg = 0; // Renamed from totalResinWeightKg
    const selectedMaterials = [];
    const selectedRatios = [];
    const multiLayerEfficiencyFactor = 0.85; // 15% reduction for subsequent layers

    const layers = layersContainer.querySelectorAll(".layer");
    layers.forEach((layer, index) => {
      const materialSelect = layer.querySelector(".material-type");
      if (!materialSelect) return;
      const materialKey = materialSelect.value;
      selectedMaterials.push(materialKey);
      const data = materialData[materialKey];

      if (!data) {
        console.error(`Material data not found for key: ${materialKey}`);
        return;
      }
      selectedRatios.push(data.ratio);

      let materialWeightKgSqM = 0;
      const selectedOptionText = materialSelect.options[materialSelect.selectedIndex]?.text || "";
      const weightMatch = selectedOptionText.match(/(\d*\.?\d+)\s*oz\/(sq ft|sq yd)|(\d*\.?\d+)\s*gsm/i);

      if (weightMatch) {
        if (weightMatch[1] && weightMatch[2]) {
          const weightOz = parseFloat(weightMatch[1]);
          const areaUnit = weightMatch[2].toLowerCase();
          materialWeightKgSqM = areaUnit === "sq ft" ? weightOz * ozSqFtToKgSqM : weightOz * ozSqYdToKgSqM;
        } else if (weightMatch[3]) {
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
        console.warn(`Could not parse weight for material: ${materialKey}`);
      }
    });

    // Removed tempFactor adjustment for resin amount
    // const tempFactor = 1 + (20 - tempC) * 0.005;
    // totalBaseResinWeightKg *= tempFactor;

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
      totalMixedResinWeightKg = totalBaseResinWeightKg + hardenerWeightKg;
      totalMixedResinVolumeL = totalBaseResinVolumeL + hardenerVolumeL;
    }

    // Estimated Working Time (Refined based on resin type)
    let workingTimeMinutes = selectedResin.baseWorkingTime || 30;
    const tempDeviation = tempC - 20;
    const sensitivityFactor = selectedResin.tempSensitivityFactor || 0.05;
    workingTimeMinutes *= (1 - tempDeviation * sensitivityFactor);
    workingTimeMinutes = Math.max(10, workingTimeMinutes); // Ensure minimum working time

    // Cost Estimation (Based on TOTAL MIXED resin weight/volume)
    let estimatedCost = null;
    if (resinCostInputVal > 0) {
      let costPerKg = 0;
      let costPerLiter = 0;
      switch (resinCostUnit) {
        case "gal": costPerLiter = resinCostInputVal / literToGallon; costPerKg = costPerLiter / resinDensityKgL; break; // Approx density
        case "liter": costPerLiter = resinCostInputVal; costPerKg = costPerLiter / resinDensityKgL; break; // Approx density
        case "lb": costPerKg = resinCostInputVal * kgToLb; costPerLiter = costPerKg * resinDensityKgL; break; // Approx density
        case "kg": costPerKg = resinCostInputVal; costPerLiter = costPerKg * resinDensityKgL; break; // Approx density
      }
      if (costPerKg > 0) {
        // Base cost on weight as it's more consistent across components
        estimatedCost = totalMixedResinWeightKg * costPerKg;
      }
    }

    // Calculate overall cloth:resin ratio string
    let ratioString = "N/A";
    if (selectedRatios.length > 0 && totalMaterialWeightKg > 0) {
        // Calculate effective ratio based on total material and total BASE resin (before waste)
        const effectiveRatio = totalBaseResinWeightKg / wasteFactor / totalMaterialWeightKg;
        ratioString = `${effectiveRatio.toFixed(1)}:1`;
    } else if (selectedRatios.length === 1) {
        ratioString = `${selectedRatios[0].toFixed(1)}:1`;
    }

    // Store metric results before displaying
    lastCalculatedResults = {
        areaSqM,
        totalMixedResinVolumeL, // Use total mixed volume
        totalMixedResinWeightKg, // Use total mixed weight
        hardenerWeightKg,
        hardenerVolumeL,
        mekpPercentage,
        mekpVolumeMl,
        mekpDrops,
        workingTimeMinutes,
        estimatedCost,
        tempInputVal,
        isFahrenheit,
        resinType,
        selectedResin,
        ratioString,
        epoxyMixRatioValue, // Store selected epoxy ratio
        hardenerRatioType // Store epoxy ratio type (w/v)
    };

    // Display results in the currently selected unit system
    displayResultsInSelectedUnits();

    // Display affiliate links
    displayAffiliateLinks(resinType, selectedMaterials);
  }

  // --- Display Results Function (Handles Unit Conversion) ---
  function displayResultsInSelectedUnits() {
      if (!lastCalculatedResults) {
          clearResults();
          return;
      }

      const { areaSqM, totalMixedResinVolumeL, totalMixedResinWeightKg, hardenerWeightKg, hardenerVolumeL,
              mekpPercentage, mekpVolumeMl, mekpDrops, workingTimeMinutes, estimatedCost,
              tempInputVal, isFahrenheit, resinType, selectedResin, ratioString,
              epoxyMixRatioValue, hardenerRatioType } = lastCalculatedResults;

      let areaStr, volumeStr, weightStr, hardenerStr = "N/A", mekpCcsStr = "N/A", mekpDropsStr = "N/A";
      const selectedVolumeUnit = resultVolumeUnitSelect.value;
      const system = resultSystemSelect.value;

      // Area
      if (system === "imperial") {
          areaStr = `${(areaSqM * sqMeterToSqFeet).toFixed(2)} ft²`;
      } else {
          areaStr = `${areaSqM.toFixed(2)} m²`;
      }

      // Volume
      if (system === "imperial") {
          if (selectedVolumeUnit === "gal") volumeStr = `${(totalMixedResinVolumeL * literToGallon).toFixed(2)} gal`;
          else if (selectedVolumeUnit === "qt") volumeStr = `${(totalMixedResinVolumeL * literToQuart).toFixed(2)} qt`;
          else volumeStr = `${(totalMixedResinVolumeL * literToFlOz).toFixed(1)} fl oz`;
      } else {
          if (selectedVolumeUnit === "l") volumeStr = `${totalMixedResinVolumeL.toFixed(2)} L`;
          else volumeStr = `${(totalMixedResinVolumeL * 1000).toFixed(1)} mL`;
      }

      // Weight
      if (system === "imperial") {
          weightStr = `${(totalMixedResinWeightKg * kgToLb).toFixed(2)} lbs`;
      } else {
          weightStr = `${totalMixedResinWeightKg.toFixed(2)} kg`;
      }

      // Hardener/Catalyst
      mekpResultsContainer.style.display = "none"; // Hide MEKP by default
      if (resinType === "epoxy" && hardenerWeightKg !== null && hardenerVolumeL !== null) {
          let hardenerWeightDisplay, hardenerVolumeDisplay;
          if (system === "imperial") {
              hardenerWeightDisplay = `${(hardenerWeightKg * kgToLb).toFixed(2)} lbs`;
              if (selectedVolumeUnit === "gal") hardenerVolumeDisplay = `${(hardenerVolumeL * literToGallon).toFixed(3)} gal`;
              else if (selectedVolumeUnit === "qt") hardenerVolumeDisplay = `${(hardenerVolumeL * literToQuart).toFixed(2)} qt`;
              else hardenerVolumeDisplay = `${(hardenerVolumeL * literToFlOz).toFixed(1)} fl oz`;
          } else {
              hardenerWeightDisplay = `${hardenerWeightKg.toFixed(3)} kg`;
              if (selectedVolumeUnit === "l") hardenerVolumeDisplay = `${hardenerVolumeL.toFixed(3)} L`;
              else hardenerVolumeDisplay = `${(hardenerVolumeL * 1000).toFixed(1)} mL`;
          }
          const ratioText = epoxyMixRatioValue ? `(${epoxyMixRatioValue.replace('w',' by Weight').replace('v',' by Volume')})` : '';
          hardenerStr = `${hardenerWeightDisplay} / ${hardenerVolumeDisplay} ${ratioText}`;
      } else if ((resinType === "polyester" || resinType === "vinylester") && mekpPercentage !== null) {
          hardenerStr = `MEKP @ ${mekpPercentage.toFixed(1)}%`;
          mekpResultsContainer.style.display = "block"; // Show MEKP details
          if (system === "imperial") {
              mekpCcsStr = `${(mekpVolumeMl * mlToFlOz).toFixed(1)} fl oz`;
          } else {
              mekpCcsStr = `${mekpVolumeMl.toFixed(1)} mL (cc)`;
          }
          mekpDropsStr = `${Math.round(mekpDrops)} drops`;
      }

      // Update DOM
      totalAreaEl.textContent = areaStr;
      resinVolumeEl.textContent = volumeStr;
      resinWeightEl.textContent = weightStr;
      hardenerAmountEl.innerHTML = hardenerStr; // Use innerHTML for potential ratio text
      workingTimeEl.textContent = `~${Math.round(workingTimeMinutes)} minutes at ${tempInputVal.toFixed(1)}${isFahrenheit ? '°F' : '°C'}`;
      estimatedCostEl.textContent = estimatedCost !== null ? `$${estimatedCost.toFixed(2)} USD` : "N/A";
      clothResinRatioEl.textContent = ratioString;

      if (mekpResultsContainer.style.display === "block") {
          mekpPercentageEl.textContent = `${mekpPercentage.toFixed(1)}%`;
          mekpCcsEl.textContent = mekpCcsStr;
          mekpDropsEl.textContent = mekpDropsStr;
      }
  }

  // --- Clear Results ---
  function clearResults(clearInputs = false) {
    if (clearInputs) {
        // Optionally clear inputs, or just results
    }
    totalAreaEl.textContent = "--";
    resinVolumeEl.textContent = "--";
    resinWeightEl.textContent = "--";
    hardenerAmountEl.textContent = "--";
    workingTimeEl.textContent = "--";
    estimatedCostEl.textContent = "--";
    clothResinRatioEl.textContent = "--";
    mekpResultsContainer.style.display = "none";
    mekpPercentageEl.textContent = "--";
    mekpCcsEl.textContent = "--";
    mekpDropsEl.textContent = "--";
    if (affiliateLinksList) affiliateLinksList.innerHTML = "";
    if (affiliateLinksContainer) affiliateLinksContainer.style.display = "none";
    lastCalculatedResults = null;
  }

  // --- Initial Setup ---
  setupResultUnits();
  setupInitialLayer();
  toggleEpoxyRatioVisibility(); // Initial check
  calculateResin(); // Initial calculation on load

});

// --- Affiliate Link Logic (Keep separate or integrate if preferred) ---
// Assuming affiliate_links.js is loaded and provides displayAffiliateLinks function

