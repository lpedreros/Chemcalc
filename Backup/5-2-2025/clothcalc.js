// clothcalc.js - v6 (Adds result unit selection, fixes colors/escaping)

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
  const temperatureInput = document.getElementById("temperature");
  const tempUnitToggle = document.getElementById("temp-unit-toggle");
  const tempUnitLabel = document.getElementById("temp-unit-label");
  const resinCostInput = document.getElementById("resin-cost");
  const resinCostUnitSelect = document.getElementById("resin-cost-unit");
  const resultSystemSelect = document.getElementById("result-system"); // Updated
  const resultVolumeUnitSelect = document.getElementById("result-volume-unit"); // New

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
  const clothResinRatioEl = document.getElementById("cloth-resin-ratio"); // New

  let layerCount = 1;
  let isFahrenheit = false;
  let currentResultUnitSystem = "metric"; // New: 'metric' or 'imperial'
  let lastCalculatedResults = null; // New: Store last calculated metric values

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

  // --- Resin Data (Density in g/cm³, Mix Ratio) ---
  const resinData = {
    polyester: { density: 1.1, catalystRatio: 0.015 }, // Base MEKP ratio
    vinylester: { density: 1.1, catalystRatio: 0.015 }, // Base MEKP ratio
    epoxy: { density: 1.15, hardenerRatio: 0.5 }, // Example: 2:1 by volume often ~100:45 by weight. Adjust as needed.
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
  const mlPerDrop = 0.05; // Approximate mL per drop for MEKP
  const mekpDensity = 1.1; // g/cm³ or kg/L

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
      resultVolumeUnitSelect.innerHTML = ""; // Clear existing options

      if (system === "imperial") {
          resultVolumeUnitSelect.innerHTML = `
              <option value="gal">Gallons (US)</option>
              <option value="qt">Quarts (US)</option>
              <option value="floz">Fluid Ounces (US)</option>
          `;
      } else { // Metric
          resultVolumeUnitSelect.innerHTML = `
              <option value="l">Liters</option>
              <option value="ml">Milliliters (mL/cc)</option>
          `;
      }
      // Trigger recalculation/redisplay when volume unit changes
      resultVolumeUnitSelect.removeEventListener("change", displayResultsInSelectedUnits);
      resultVolumeUnitSelect.addEventListener("change", displayResultsInSelectedUnits);
  }

  // --- Handle Result System Change ---
  function handleResultSystemChange() {
      currentResultUnitSystem = resultSystemSelect.value;
      populateResultUnitOptions(); // Update volume options
      displayResultsInSelectedUnits(); // Re-display with new system
  }

  // --- Initial Setup for Result Units ---
  function setupResultUnits() {
      if (!resultSystemSelect) return;
      resultSystemSelect.value = currentResultUnitSystem;
      populateResultUnitOptions(); // Populate volume units based on default system
      resultSystemSelect.removeEventListener("change", handleResultSystemChange);
      resultSystemSelect.addEventListener("change", handleResultSystemChange);
  }

// Event Listeners for automatic calculation
  const inputsToWatch = [
    lengthInput, widthInput, unitsSelect, resinTypeSelect,
    temperatureInput, resinCostInput, resinCostUnitSelect
  ];

  inputsToWatch.forEach(input => {
    if (input) { // Check if element exists
      const eventType = (input.tagName === "SELECT") ? "change" : "input";
      input.addEventListener(eventType, calculateResin);
    }
  });

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
    console.log("calculateResin called"); // Debug log
    const length = parseFloat(lengthInput.value) || 0;
    const width = parseFloat(widthInput.value) || 0;
    const unit = unitsSelect.value;
    const resinType = resinTypeSelect.value;
    const tempInputVal = parseFloat(temperatureInput.value) || (isFahrenheit ? 68 : 20);
    const tempC = isFahrenheit ? fahrenheitToCelsius(tempInputVal) : tempInputVal;
    const resinCostInputVal = parseFloat(resinCostInput.value) || 0;
    const resinCostUnit = resinCostUnitSelect.value;

    if (length <= 0 || width <= 0) {
      clearResults(true);
      resultsSection.style.display = "block";
      lastCalculatedResults = null; // Clear stored results
      return;
    }

    resultsSection.style.display = "block";

    const areaSqM = length * width * unitsToSqMeters[unit];
    let totalMaterialWeightKg = 0;
    let totalResinWeightKg = 0;
    const selectedMaterials = [];
    const selectedRatios = []; // New: Store ratios for each layer

    const layers = layersContainer.querySelectorAll(".layer");
    layers.forEach((layer) => {
      const materialSelect = layer.querySelector(".material-type");
      if (!materialSelect) return;
      const materialKey = materialSelect.value;
      selectedMaterials.push(materialKey);
      const data = materialData[materialKey];

      if (!data) {
        console.error(`Material data not found for key: ${materialKey}`);
        return;
      }
      selectedRatios.push(data.ratio); // New: Store the ratio

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
        totalResinWeightKg += layerMaterialWeightKg * data.ratio;
      } else {
        console.warn(`Could not parse weight for material: ${materialKey}`);
      }
    });

    const tempFactor = 1 + (20 - tempC) * 0.005;
    totalResinWeightKg *= tempFactor;
    const wasteFactor = 1.15;
    totalResinWeightKg *= wasteFactor;

    const selectedResin = resinData[resinType];
    if (!selectedResin) {
        console.error(`Resin data not found for type: ${resinType}`);
        clearResults();
        lastCalculatedResults = null;
        return;
    }
    const resinDensityKgL = selectedResin.density;
    const totalResinVolumeL = totalResinWeightKg / resinDensityKgL;

    // --- Calculate Hardener/Catalyst (Metric) ---
    let hardenerWeightKg = null;
    let hardenerVolumeL = null;
    let mekpPercentage = null;
    let mekpVolumeMl = null;
    let mekpDrops = null;

    if (resinType === "epoxy" && selectedResin.hardenerRatio) {
      hardenerWeightKg = totalResinWeightKg * selectedResin.hardenerRatio;
      hardenerVolumeL = hardenerWeightKg / resinDensityKgL; // Approx.
    } else if ((resinType === "polyester" || resinType === "vinylester") && selectedResin.catalystRatio) {
      mekpPercentage = 1.5;
      if (tempC >= 29.4) mekpPercentage = 1.0;
      else if (tempC >= 23.9) mekpPercentage = 1.5;
      else if (tempC >= 18.3) mekpPercentage = 2.0;
      else if (tempC >= 15.6) mekpPercentage = 2.5;
      else mekpPercentage = 3.0;
      mekpPercentage = Math.max(1.0, Math.min(3.0, mekpPercentage));

      const mekpWeightKg = totalResinWeightKg * (mekpPercentage / 100);
      mekpVolumeMl = (mekpWeightKg / mekpDensity) * 1000;
      mekpDrops = mekpVolumeMl / mlPerDrop;
    }

    // Estimated Working Time (Metric Temp)
    let workingTimeMinutes = (resinType === "epoxy") ? 45 : 30;
    workingTimeMinutes *= 1 - (tempC - 20) * 0.05;
    workingTimeMinutes = Math.max(10, workingTimeMinutes);

    // Cost Estimation (Metric)
    let estimatedCost = null;
    if (resinCostInputVal > 0) {
      let costPerKg = 0;
      switch (resinCostUnit) {
        case "gal": costPerKg = resinCostInputVal / (literToGallon * resinDensityKgL); break;
        case "liter": costPerKg = resinCostInputVal / resinDensityKgL; break;
        case "lb": costPerKg = resinCostInputVal / (1 / kgToLb); break;
        case "kg": costPerKg = resinCostInputVal; break;
      }
      if (costPerKg > 0) {
        estimatedCost = totalResinWeightKg * costPerKg;
      }
    }

    // Calculate overall ratio string
    let ratioString = "N/A";
    if (selectedRatios.length > 0) {
        const minRatio = Math.min(...selectedRatios);
        const maxRatio = Math.max(...selectedRatios);
        if (minRatio === maxRatio) {
            ratioString = `${maxRatio.toFixed(1)}:1`;
        } else {
            ratioString = `${minRatio.toFixed(1)}:1 - ${maxRatio.toFixed(1)}:1`;
        }
    }

    // Store metric results before displaying
    lastCalculatedResults = {
        areaSqM,
        totalResinVolumeL,
        totalResinWeightKg,
        hardenerWeightKg,
        hardenerVolumeL,
        mekpPercentage,
        mekpVolumeMl,
        mekpDrops,
        workingTimeMinutes,
        estimatedCost,
        tempInputVal, // Store the original input temp for display
        isFahrenheit, // Store the unit used for input temp
        resinType, // Needed for hardener/catalyst display logic
        selectedResin, // Needed for hardener ratio display
        ratioString // New: Store the calculated ratio string
    };

    // Display results in the currently selected unit system
    displayResultsInSelectedUnits();

    // Display affiliate links
    displayAffiliateLinks(resinType, selectedMaterials);
  }

  // --- Display Results Function (Handles Unit   // --- Display Results Function (Handles Unit Conversion) ---
  function displayResultsInSelectedUnits() {
      if (!lastCalculatedResults) {
          clearResults(); // Clear if no valid results stored
          return;
      }

      const { areaSqM, totalResinVolumeL, totalResinWeightKg, hardenerWeightKg, hardenerVolumeL,
              mekpPercentage, mekpVolumeMl, mekpDrops, workingTimeMinutes, estimatedCost,
              tempInputVal, isFahrenheit, resinType, selectedResin, ratioString } = lastCalculatedResults; // Added ratioString

      let areaStr, volumeStr, weightStr, hardenerStr, mekpCcsStr, mekpDropsStr;
      const selectedVolumeUnit = resultVolumeUnitSelect.value; // Get selected volume unit

      if (currentResultUnitSystem === "imperial") {
          const areaSqFt = areaSqM * sqMeterToSqFeet;
          const weightLb = totalResinWeightKg * kgToLb;
          areaStr = `${areaSqFt.toFixed(2)} ft²`;
          weightStr = `${weightLb.toFixed(2)} lbs`;

          // Volume conversion based on selected unit
          let volumeImperial;
          let volumeUnitLabel;
          if (selectedVolumeUnit === "gal") {
              volumeImperial = totalResinVolumeL * literToGallon;
              volumeUnitLabel = "US Gallons";
          } else if (selectedVolumeUnit === "qt") {
              volumeImperial = totalResinVolumeL * literToQuart;
              volumeUnitLabel = "US Quarts";
          } else { // floz
              volumeImperial = totalResinVolumeL * literToFlOz;
              volumeUnitLabel = "US fl oz";
          }
          volumeStr = `${volumeImperial.toFixed(2)} ${volumeUnitLabel}`;

          // Hardener/Catalyst conversion (keep simple for now, maybe enhance later)
          if (resinType === "epoxy" && hardenerWeightKg !== null && hardenerVolumeL !== null) {
              const hardenerLb = hardenerWeightKg * kgToLb;
              const hardenerGal = hardenerVolumeL * literToGallon;
              hardenerStr = `${hardenerLb.toFixed(2)} lbs / ${hardenerGal.toFixed(3)} gal (Approx. Ratio ${selectedResin.hardenerRatio * 100}:100 by weight)`;
          } else if ((resinType === "polyester" || resinType === "vinylester") && mekpVolumeMl !== null && mekpDrops !== null) {
              const mekpFlOz = mekpVolumeMl * mlToFlOz;
              hardenerStr = `${mekpFlOz.toFixed(2)} fl oz / ${mekpDrops.toFixed(0)} drops (at ${mekpPercentage.toFixed(1)}%)`;
              mekpCcsStr = `${(mekpVolumeMl).toFixed(1)} mL (${mekpFlOz.toFixed(2)} fl oz)`; // Show both in MEKP section
              mekpDropsStr = `${mekpDrops.toFixed(0)} drops`;
          } else {
              hardenerStr = "N/A";
          }
      } else { // Metric
          areaStr = `${areaSqM.toFixed(2)} m²`;
          weightStr = `${totalResinWeightKg.toFixed(2)} kg`;

          // Volume conversion based on selected unit
          let volumeMetric;
          let volumeUnitLabel;
          if (selectedVolumeUnit === "l") {
              volumeMetric = totalResinVolumeL;
              volumeUnitLabel = "Liters";
          } else { // ml
              volumeMetric = totalResinVolumeL * 1000;
              volumeUnitLabel = "mL (cc)";
          }
          volumeStr = `${volumeMetric.toFixed(2)} ${volumeUnitLabel}`;

          // Hardener/Catalyst conversion
          if (resinType === "epoxy" && hardenerWeightKg !== null && hardenerVolumeL !== null) {
              hardenerStr = `${hardenerWeightKg.toFixed(2)} kg / ${hardenerVolumeL.toFixed(3)} L (Approx. Ratio ${selectedResin.hardenerRatio * 100}:100 by weight)`;
          } else if ((resinType === "polyester" || resinType === "vinylester") && mekpVolumeMl !== null && mekpDrops !== null) {
              hardenerStr = `${mekpVolumeMl.toFixed(1)} mL / ${mekpDrops.toFixed(0)} drops (at ${mekpPercentage.toFixed(1)}%)`;
              mekpCcsStr = `${mekpVolumeMl.toFixed(1)} mL`;
              mekpDropsStr = `${mekpDrops.toFixed(0)} drops`;
          } else {
              hardenerStr = "N/A";
          }
      }

      // Update DOM Elements
      totalAreaEl.textContent = areaStr;
      clothResinRatioEl.textContent = ratioString; // New: Display ratio
      resinVolumeEl.textContent = volumeStr;
      resinWeightEl.textContent = weightStr;
      hardenerAmountEl.textContent = hardenerStr;
      workingTimeEl.textContent = `~${workingTimeMinutes.toFixed(0)} minutes at ${tempInputVal.toFixed(1)} ${isFahrenheit ? "°F" : "°C"}`;
      estimatedCostEl.textContent = estimatedCost !== null ? `$${estimatedCost.toFixed(2)} USD` : "N/A";

      // Update MEKP section if applicable
      if ((resinType === "polyester" || resinType === "vinylester") && mekpPercentage !== null) {
          mekpPercentageEl.textContent = `${mekpPercentage.toFixed(1)}%`;
          mekpCcsEl.textContent = mekpCcsStr;
          mekpDropsEl.textContent = mekpDropsStr;
          mekpResultsContainer.style.display = "block";
      } else {
          mekpResultsContainer.style.display = "none";
      }
  }

  // --- Clear Results Function ---
  function clearResults(isInvalidInput = false) {
      const placeholder = isInvalidInput ? "Enter valid dimensions" : "—";
      const elementsToClear = [
          totalAreaEl, resinVolumeEl, resinWeightEl, hardenerAmountEl,
          workingTimeEl, estimatedCostEl, mekpPercentageEl, mekpCcsEl, mekpDropsEl
      ];
      elementsToClear.forEach(el => {
          if (el) el.textContent = placeholder;
      });
      if (mekpResultsContainer) mekpResultsContainer.style.display = "none";
      if (affiliateLinksList) affiliateLinksList.innerHTML = "";
      if (affiliateLinksContainer) affiliateLinksContainer.style.display = "none";
      lastCalculatedResults = null; // Clear stored results on clear
  }

  // --- Affiliate Link Display Logic ---
  function displayAffiliateLinks(resinType, materialKeys) {
    if (!affiliateLinksList || !affiliateLinksContainer || typeof affiliateLinksData === 'undefined') return;

    affiliateLinksList.innerHTML = ""; // Clear previous links
    const linksToShow = new Set();

    // --- Find relevant links based on keywords (adjust keywords as needed) ---
    const resinKeywords = {
        polyester: ["polyester resin"],
        vinylester: ["vinylester"], // Assuming no specific vinylester link, might show general resin
        epoxy: ["epoxy resin"]
    };

    const materialKeywords = {
        "csm_0.75": ["csm", "chopped strand"],
        "csm_1.5": ["csm", "chopped strand"],
        "csm_2.0": ["csm", "chopped strand"],
        wr_18: ["woven roving"],
        wr_24: ["woven roving"],
        combo_1708: ["1708", "biax"],
        combo_1808: ["1808", "biax"],
        cloth_4: ["cloth", "fiberglass cloth"],
        cloth_6: ["cloth", "fiberglass cloth"],
        cloth_10: ["cloth", "fiberglass cloth"],
        "carbon_5.7": ["carbon fiber"],
        "carbon_11": ["carbon fiber"],
        "kevlar_5": ["kevlar"]
    };

    const catalystKeywords = {
        polyester: ["mekp"],
        vinylester: ["mekp"],
        epoxy: ["epoxy hardener", "epoxy resin hardener"]
    };

    // Function to check if a link name contains any of the keywords
    const checkKeywords = (name, keywords) => {
        if (!keywords) return false;
        const lowerCaseName = name.toLowerCase();
        return keywords.some(keyword => lowerCaseName.includes(keyword.toLowerCase()));
    };

    // Iterate through all affiliate links
    for (const key in affiliateLinksData) {
        const linkData = affiliateLinksData[key];

        // Check for resin type match
        if (checkKeywords(linkData.name, resinKeywords[resinType])) {
            linksToShow.add(linkData);
        }

        // Check for material type match
        materialKeys.forEach(materialKey => {
            if (checkKeywords(linkData.name, materialKeywords[materialKey])) {
                linksToShow.add(linkData);
            }
        });

        // Check for catalyst/hardener match
        if (checkKeywords(linkData.name, catalystKeywords[resinType])) {
            linksToShow.add(linkData);
        }
    }
    // Add general supplies (optional, based on keywords)
    const generalSuppliesKeywords = ["gloves", "respirator", "mixing cups", "brushes", "rollers"];
    for (const key in affiliateLinksData) {
        const linkData = affiliateLinksData[key];
        if (checkKeywords(linkData.name, generalSuppliesKeywords)) {
             // Limit the number of general supplies shown, e.g., max 3
             if (linksToShow.size < 8) { // Example limit
                linksToShow.add(linkData);
             }
        }
    }


    if (linksToShow.size > 0) {
        linksToShow.forEach(linkData => {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.href = linkData.url;
            a.textContent = linkData.name;
            a.target = "_blank"; // Open in new tab
            a.rel = "noopener noreferrer sponsored"; // SEO & disclosure
            li.appendChild(a);
            affiliateLinksList.appendChild(li);
        });
        affiliateLinksContainer.style.display = "block"; // Show container
    } else {
        affiliateLinksContainer.style.display = "none"; // Hide container if no links
    }
  }

  // --- Print Functionality ---
  const printButton = document.getElementById("printButton");
  const qrCodeContainer = document.getElementById("printQrCode");

  if (printButton && qrCodeContainer) {
    printButton.addEventListener("click", () => {
      qrCodeContainer.innerHTML = ""; // Clear previous QR code
      new QRCode(qrCodeContainer, {
          text: window.location.href,
          width: 128,
          height: 128,
          colorDark : "#000000",
          colorLight : "#ffffff",
          correctLevel : QRCode.CorrectLevel.H
      });

      // Use a small delay to ensure QR code renders before print dialog
      setTimeout(() => {
          window.print();
      }, 250); // 250ms delay
    });
  }


  // Initial Calculation on Load
  setupResultUnits(); // Setup the new unit dropdowns
  setupInitialLayer();
  calculateResin();

});

