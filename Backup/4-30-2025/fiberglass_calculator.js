/**
 * Fiberglass Cloth Resin Calculator
 * 
 * This script calculates the amount of resin needed to saturate different types
 * of fiberglass cloth, carbon fiber, and Kevlar based on surface area.
 * 
 * It supports both imperial and metric measurement systems and accounts for
 * different resin types (polyester, epoxy, vinylester).
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements - Single Layer Calculator
  const unitSystemSelect       = document.getElementById('unitSystem');
  const materialTypeSelect     = document.getElementById('materialType');
  const clothTypeSelect        = document.getElementById('clothType');
  const resinTypeSelect        = document.getElementById('resinType');
  const surfaceAreaInput       = document.getElementById('surfaceArea');
  const areaUnitSelect         = document.getElementById('areaUnit');
  const volumeResultUnitSelect = document.getElementById('volumeResultUnit');
  const weightResultUnitSelect = document.getElementById('weightResultUnit');
  
  // Print elements (if they exist)
  const printButton            = document.getElementById('printButton');
  const printUrlSpan           = document.getElementById('printUrl');
  const printUnitSystemSpan    = document.getElementById('printUnitSystem');
  const printMaterialTypeSpan  = document.getElementById('printMaterialType');
  const printClothTypeSpan     = document.getElementById('printClothType');
  const printResinTypeSpan     = document.getElementById('printResinType');
  const printSurfaceAreaSpan   = document.getElementById('printSurfaceArea');
  const printAreaUnitSpan      = document.getElementById('printAreaUnit');
  const printQrImage           = document.getElementById('printQr');
  
  // Thumbnail element (if it exists)
  const clothThumbnail         = document.getElementById('clothThumbnail');

  // Results elements - Single Layer Calculator
  const clothWeightResult      = document.getElementById('clothWeight').querySelector('span');
  const resinVolumeResult      = document.getElementById('resinVolume').querySelector('span');
  const resinWeightResult      = document.getElementById('resinWeight').querySelector('span');
  const resinRatioResult       = document.getElementById('resinRatio').querySelector('span');
  const coverageInfoElement    = document.getElementById('coverageInfo');

  // DOM Elements - Batch Calculator
  const singleLayerMode = document.getElementById('singleLayerMode');
  const batchMode = document.getElementById('batchMode');
  const singleLayerCalculator = document.getElementById('singleLayerCalculator');
  const batchCalculator = document.getElementById('batchCalculator');
  const batchUnitSystemSelect = document.getElementById('batchUnitSystem');
  const batchResinTypeSelect = document.getElementById('batchResinType');
  const batchSurfaceAreaInput = document.getElementById('batchSurfaceArea');
  const batchAreaUnitSelect = document.getElementById('batchAreaUnit');
  const batchVolumeResultUnitSelect = document.getElementById('batchVolumeResultUnit');
  const batchWeightResultUnitSelect = document.getElementById('batchWeightResultUnit');
  const addLayerBtn = document.getElementById('addLayerBtn');
  const layersList = document.getElementById('layersList');
  const layerTemplate = document.getElementById('layerTemplate');
  
  // Result Elements - Batch Calculator
  const batchTotalResinWeightResult = document.getElementById('batchTotalResinWeight') ? document.getElementById('batchTotalResinWeight').querySelector('span') : null;
  const batchTotalResinVolumeResult = document.getElementById('batchTotalResinVolume') ? document.getElementById('batchTotalResinVolume').querySelector('span') : null;
  const batchTotalClothWeightResult = document.getElementById('batchTotalClothWeight') ? document.getElementById('batchTotalClothWeight').querySelector('span') : null;
  const batchAverageRatioResult = document.getElementById('batchAverageRatio') ? document.getElementById('batchAverageRatio').querySelector('span') : null;
  const batchEfficiencyResult = document.getElementById('batchEfficiency') ? document.getElementById('batchEfficiency').querySelector('span') : null;

  // Material & cloth data
  const materials = {
    fiberglass: {
      imperial: [
        { id: 'csm_1.5', name: 'CSM - Chopped Strand Mat (1.5 oz/ft²)', weight: 1.5, unit: 'oz/ft²', ratios: { polyester: 2.0, epoxy: 2.0, vinylester: 2.0 } },
        { id: 'fg_0.75', name: 'Style #106 - Lightweight Cloth (0.75 oz/yd²)', weight: 0.75/9, unit: 'oz/ft²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_1.5', name: 'Style #108 - Lightweight Cloth (1.5 oz/yd²)', weight: 1.5/9, unit: 'oz/ft²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_4', name: 'Style #1522 - Medium Weight (4 oz/yd²)', weight: 4/9, unit: 'oz/ft²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_5.6', name: 'Style #3733 - Sailboat Cloth (5.6 oz/yd²)', weight: 5.6/9, unit: 'oz/ft²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_7.5', name: 'Style #7532 - Heavy Weight (7.5 oz/yd²)', weight: 7.5/9, unit: 'oz/ft²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_10', name: 'Style #7500 - Heavy Weight (10 oz/yd²)', weight: 10/9, unit: 'oz/ft²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'biaxial_1708', name: 'DBM 1708 - Biaxial (+/-45°, 17oz w/mat)', weight: 17/9, unit: 'oz/ft²', ratios: { polyester: 3.0, epoxy: 2.5, vinylester: 2.8 } },
        { id: 'biaxial_1208', name: 'DBM 1208 - Biaxial (+/-45°, 12oz w/mat)', weight: 12/9, unit: 'oz/ft²', ratios: { polyester: 3.0, epoxy: 2.5, vinylester: 2.8 } },
        { id: 'biaxial_1808', name: 'DBM 1808 - Biaxial (+/-45°, 18oz w/mat)', weight: 18/9, unit: 'oz/ft²', ratios: { polyester: 3.0, epoxy: 2.5, vinylester: 2.8 } },
        { id: 'woven_roving_18', name: 'Woven Roving (18 oz/yd²)', weight: 18/9, unit: 'oz/ft²', ratios: { polyester: 2.2, epoxy: 1.8, vinylester: 2.0 } },
        { id: 'woven_roving_24', name: 'Woven Roving (24 oz/yd²)', weight: 24/9, unit: 'oz/ft²', ratios: { polyester: 2.2, epoxy: 1.8, vinylester: 2.0 } }
      ],
      metric: [
        { id: 'csm_450', name: 'CSM - Chopped Strand Mat (450 g/m²)', weight: 450, unit: 'g/m²', ratios: { polyester: 2.0, epoxy: 2.0, vinylester: 2.0 } },
        { id: 'fg_25', name: 'Style #106 - Lightweight Cloth (25 g/m²)', weight: 25, unit: 'g/m²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_50', name: 'Style #108 - Lightweight Cloth (50 g/m²)', weight: 50, unit: 'g/m²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_135', name: 'Style #1522 - Medium Weight (135 g/m²)', weight: 135, unit: 'g/m²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_190', name: 'Style #3733 - Sailboat Cloth (190 g/m²)', weight: 190, unit: 'g/m²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_255', name: 'Style #7532 - Heavy Weight (255 g/m²)', weight: 255, unit: 'g/m²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_340', name: 'Style #7500 - Heavy Weight (340 g/m²)', weight: 340, unit: 'g/m²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'biaxial_580', name: 'DBM 1708 - Biaxial (+/-45°, 580 g/m²)', weight: 580, unit: 'g/m²', ratios: { polyester: 3.0, epoxy: 2.5, vinylester: 2.8 } },
        { id: 'biaxial_400', name: 'DBM 1208 - Biaxial (+/-45°, 400 g/m²)', weight: 400, unit: 'g/m²', ratios: { polyester: 3.0, epoxy: 2.5, vinylester: 2.8 } },
        { id: 'biaxial_600', name: 'DBM 1808 - Biaxial (+/-45°, 600 g/m²)', weight: 600, unit: 'g/m²', ratios: { polyester: 3.0, epoxy: 2.5, vinylester: 2.8 } },
        { id: 'woven_roving_600', name: 'Woven Roving (600 g/m²)', weight: 600, unit: 'g/m²', ratios: { polyester: 2.2, epoxy: 1.8, vinylester: 2.0 } },
        { id: 'woven_roving_800', name: 'Woven Roving (800 g/m²)', weight: 800, unit: 'g/m²', ratios: { polyester: 2.2, epoxy: 1.8, vinylester: 2.0 } }
      ]
    },
    carbon: {
      imperial: [
        { id: 'carbon_5.7', name: '3K Plain Weave (5.7 oz/yd²)', weight: 5.7/9, unit: 'oz/ft²', ratios: { polyester: 0, epoxy: 1.8, vinylester: 2.0 } },
        { id: 'carbon_5.8', name: '3K 2x2 Twill Weave (5.8 oz/yd²)', weight: 5.8/9, unit: 'oz/ft²', ratios: { polyester: 0, epoxy: 1.8, vinylester: 2.0 } },
        { id: 'carbon_9', name: 'Unidirectional (9 oz/yd²)', weight: 9/9, unit: 'oz/ft²', ratios: { polyester: 0, epoxy: 1.5, vinylester: 1.8 } }
      ],
      metric: [
        { id: 'carbon_193', name: '3K Plain Weave (193 g/m²)', weight: 193, unit: 'g/m²', ratios: { polyester: 0, epoxy: 1.8, vinylester: 2.0 } },
        { id: 'carbon_197', name: '3K 2x2 Twill Weave (197 g/m²)', weight: 197, unit: 'g/m²', ratios: { polyester: 0, epoxy: 1.8, vinylester: 2.0 } },
        { id: 'carbon_305', name: 'Unidirectional (305 g/m²)', weight: 305, unit: 'g/m²', ratios: { polyester: 0, epoxy: 1.5, vinylester: 1.8 } }
      ]
    },
    kevlar: {
      imperial: [
        { id: 'kevlar_5', name: 'Kevlar Plain Weave (5 oz/yd²)', weight: 5/9, unit: 'oz/ft²', ratios: { polyester: 0, epoxy: 2.2, vinylester: 2.5 } },
        { id: 'kevlar_carbon_6', name: 'Kevlar/Carbon Hybrid (6 oz/yd²)', weight: 6/9, unit: 'oz/ft²', ratios: { polyester: 0, epoxy: 2.0, vinylester: 2.3 } }
      ],
      metric: [
        { id: 'kevlar_170', name: 'Kevlar Plain Weave (170 g/m²)', weight: 170, unit: 'g/m²', ratios: { polyester: 0, epoxy: 2.2, vinylester: 2.5 } },
        { id: 'kevlar_carbon_200', name: 'Kevlar/Carbon Hybrid (200 g/m²)', weight: 200, unit: 'g/m²', ratios: { polyester: 0, epoxy: 2.0, vinylester: 2.3 } }
      ]
    }
  };

  // Conversion factors (base units: ft², m², oz, g, mL)
  const conversions = {
    area: {
      imperial: { 'ft²':1, 'yd²':9, 'in²':1/144 },
      metric:   { 'm²':1, 'cm²':1/10000, 'mm²':1/1000000 }
    },
    volume: {
      imperial: { 'fl oz':1, 'quart':32, 'gallon':128 },
      metric:   { 'mL':1, 'cc':1, 'L':1000 }
    },
    weight: {
      imperial: { 'oz':1, 'lb':16 },
      metric:   { 'g':1, 'kg':1000 }
    }
  };

  // Resin densities for accurate weight/volume conversions
  const resinDensity = {
    imperial: { // lb/gal
      polyester: 9.2,
      epoxy: 9.5,
      vinylester: 9.3
    },
    metric: { // g/mL
      polyester: 1.1,
      epoxy: 1.14,
      vinylester: 1.12
    }
  };

  // Batch calculator layers
  let layers = [];
  let nextLayerId = 1;

  // Initialize calculator mode toggle
  if (singleLayerMode && batchMode) {
    singleLayerMode.addEventListener('click', function() {
      singleLayerCalculator.style.display = 'block';
      batchCalculator.style.display = 'none';
    });
    
    batchMode.addEventListener('click', function() {
      singleLayerCalculator.style.display = 'none';
      batchCalculator.style.display = 'block';
      
      // Initialize batch calculator if it's empty
      if (layers.length === 0) {
        addLayer();
      }
    });
  }

  // Populate area units
  function updateAreaUnits() {
    const sys = unitSystemSelect.value;
    const list = sys === 'imperial' ? ['ft²', 'yd²', 'in²'] : ['m²', 'cm²', 'mm²'];
    
    // Clear and populate area unit select
    areaUnitSelect.innerHTML = '';
    list.forEach(u => {
      const option = document.createElement('option');
      option.value = u;
      option.textContent = u;
      areaUnitSelect.appendChild(option);
    });
    
    // Also update batch calculator area units if they exist
    if (batchAreaUnitSelect) {
      batchAreaUnitSelect.innerHTML = '';
      list.forEach(u => {
        const option = document.createElement('option');
        option.value = u;
        option.textContent = u;
        batchAreaUnitSelect.appendChild(option);
      });
    }
  }

  // Populate result unit dropdowns
  function updateResultUnits() {
    const sys = unitSystemSelect.value;
    
    // Volume units
    const volList = sys === 'imperial' ? ['fl oz', 'quart', 'gallon'] : ['mL', 'cc', 'L'];
    volumeResultUnitSelect.innerHTML = '';
    volList.forEach(u => {
      const option = document.createElement('option');
      option.value = u;
      option.textContent = u;
      volumeResultUnitSelect.appendChild(option);
    });
    
    // Weight units - Include volume units for weight as requested
    const wtList = sys === 'imperial' ? ['oz', 'lb', 'quart', 'gallon'] : ['g', 'kg', 'L'];
    weightResultUnitSelect.innerHTML = '';
    wtList.forEach(u => {
      const option = document.createElement('option');
      option.value = u;
      option.textContent = u;
      weightResultUnitSelect.appendChild(option);
    });
    
    // Also update batch calculator result units if they exist
    if (batchVolumeResultUnitSelect && batchWeightResultUnitSelect) {
      batchVolumeResultUnitSelect.innerHTML = '';
      volList.forEach(u => {
        const option = document.createElement('option');
        option.value = u;
        option.textContent = u;
        batchVolumeResultUnitSelect.appendChild(option);
      });
      
      batchWeightResultUnitSelect.innerHTML = '';
      wtList.forEach(u => {
        const option = document.createElement('option');
        option.value = u;
        option.textContent = u;
        batchWeightResultUnitSelect.appendChild(option);
      });
    }
  }

  // Cloth list & thumbnail
  function updateClothTypes() {
    const mat = materialTypeSelect.value;
    const sys = unitSystemSelect.value;
    
    // Clear and populate cloth type select
    clothTypeSelect.innerHTML = '';
    
    if (!materials[mat] || !materials[mat][sys]) {
      return;
    }
    
    materials[mat][sys].forEach(c => {
      const option = document.createElement('option');
      option.value = c.id;
      option.textContent = c.name;
      clothTypeSelect.appendChild(option);
    });
    
    if (clothThumbnail) {
      updateThumbnail();
    }
    
    validateResinCompatibility();
  }

  function updateThumbnail() {
    if (!clothThumbnail) return;
    
    const id = clothTypeSelect.value;
    clothThumbnail.src = `images/${id}.svg`;
    clothThumbnail.alt = clothTypeSelect.selectedOptions[0].text;
  }

  function validateResinCompatibility() {
    const mat = materialTypeSelect.value;
    Array.from(resinTypeSelect.options).forEach(opt => {
      opt.disabled = mat !== 'fiberglass' && opt.value === 'polyester';
    });
    
    if ((mat === 'carbon' || mat === 'kevlar') && resinTypeSelect.value === 'polyester') {
      resinTypeSelect.value = 'epoxy';
      alert(`Polyester resin is not recommended for ${mat}. Switched to epoxy.`);
    }
  }

  // Convert between weight and volume units
  function convertWeight(weight, fromUnit, toUnit, resinType, system) {
    // First convert to base weight unit (oz or g)
    let baseWeight = weight;
    
    if (system === 'imperial') {
      // Convert from source unit to base weight (oz)
      if (fromUnit === 'lb') {
        baseWeight = weight * 16; // lb to oz
      } else if (fromUnit === 'quart') {
        // Convert quart volume to weight using density
        // 1 quart = 32 fl oz
        // density is in lb/gal, and 1 gal = 128 fl oz = 16 cups
        const lbPerGallon = resinDensity.imperial[resinType];
        const ozPerFlOz = (lbPerGallon * 16) / 128; // Convert lb/gal to oz/fl oz
        baseWeight = weight * 32 * ozPerFlOz; // quarts to fl oz to oz
      } else if (fromUnit === 'gallon') {
        // Convert gallon volume to weight using density
        const lbPerGallon = resinDensity.imperial[resinType];
        baseWeight = weight * lbPerGallon * 16; // gallons to lb to oz
      }
      
      // Convert from base weight (oz) to target unit
      if (toUnit === 'oz') {
        return baseWeight;
      } else if (toUnit === 'lb') {
        return baseWeight / 16; // oz to lb
      } else if (toUnit === 'quart') {
        // Convert weight to volume using density
        const lbPerGallon = resinDensity.imperial[resinType];
        const ozPerFlOz = (lbPerGallon * 16) / 128; // Convert lb/gal to oz/fl oz
        const flOz = baseWeight / ozPerFlOz; // oz to fl oz
        return flOz / 32; // fl oz to quarts
      } else if (toUnit === 'gallon') {
        // Convert weight to volume using density
        const lbPerGallon = resinDensity.imperial[resinType];
        const lb = baseWeight / 16; // oz to lb
        return lb / lbPerGallon; // lb to gallons
      }
    } else { // metric
      // Convert from source unit to base weight (g)
      if (fromUnit === 'kg') {
        baseWeight = weight * 1000; // kg to g
      } else if (fromUnit === 'L') {
        // Convert L volume to weight using density
        // density is in g/mL, and 1 L = 1000 mL
        const gPerMl = resinDensity.metric[resinType];
        baseWeight = weight * 1000 * gPerMl; // L to mL to g
      }
      
      // Convert from base weight (g) to target unit
      if (toUnit === 'g') {
        return baseWeight;
      } else if (toUnit === 'kg') {
        return baseWeight / 1000; // g to kg
      } else if (toUnit === 'L') {
        // Convert weight to volume using density
        const gPerMl = resinDensity.metric[resinType];
        const mL = baseWeight / gPerMl; // g to mL
        return mL / 1000; // mL to L
      }
    }
    
    return weight; // Default fallback
  }

  // Convert volume between units
  function convertVolume(volume, fromUnit, toUnit, system) {
    if (system === 'imperial') {
      // Convert to base volume (fl oz)
      let volumeInFlOz = volume;
      
      if (fromUnit === 'quart') {
        volumeInFlOz = volume * 32; // quart to fl oz
      } else if (fromUnit === 'gallon') {
        volumeInFlOz = volume * 128; // gallon to fl oz
      }
      
      // Convert from base volume (fl oz) to target unit
      if (toUnit === 'fl oz') {
        return volumeInFlOz;
      } else if (toUnit === 'quart') {
        return volumeInFlOz / 32; // fl oz to quart
      } else if (toUnit === 'gallon') {
        return volumeInFlOz / 128; // fl oz to gallon
      }
    } else { // metric
      // Convert to base volume (mL)
      let volumeInMl = volume;
      
      if (fromUnit === 'L') {
        volumeInMl = volume * 1000; // L to mL
      }
      
      // Convert from base volume (mL) to target unit
      if (toUnit === 'mL' || toUnit === 'cc') {
        return volumeInMl;
      } else if (toUnit === 'L') {
        return volumeInMl / 1000; // mL to L
      }
    }
    
    return volume; // Default fallback
  }

  // Main calculation for single layer
  function calculate() {
    const sys = unitSystemSelect.value;
    const mat = materialTypeSelect.value;
    const resin = resinTypeSelect.value;
    const area = parseFloat(surfaceAreaInput.value) || 0;
    const aUnit = areaUnitSelect.value;
    const volUnit = volumeResultUnitSelect.value;
    const wtUnit = weightResultUnitSelect.value;
    
    // Find the selected cloth
    const cloth = materials[mat][sys].find(c => c.id === clothTypeSelect.value);
    
    if (!cloth || area <= 0) {
      resetResults();
      return;
    }

    // Standard area (convert to ft² or m²)
    const stdArea = area * conversions.area[sys][aUnit];

    // Cloth weight (oz or g)
    const clothWt = cloth.weight * stdArea;

    // Resin weight based on ratio
    const ratio = cloth.ratios[resin];
    const resinWt = clothWt * ratio; // in oz or g

    // Resin volume (fl oz or mL)
    let resinVol;
    if (sys === 'imperial') {
      // Convert oz to fl oz using density
      // density is in lb/gal, and 1 gal = 128 fl oz, 1 lb = 16 oz
      const lbPerGallon = resinDensity.imperial[resin];
      const ozPerFlOz = (lbPerGallon * 16) / 128; // Convert lb/gal to oz/fl oz
      resinVol = resinWt / ozPerFlOz;
    } else {
      // Convert g to mL using density
      // density is in g/mL
      resinVol = resinWt / resinDensity.metric[resin];
    }

    // Display cloth weight
    clothWeightResult.textContent = sys === 'imperial'
      ? `${clothWt.toFixed(2)} oz`
      : `${clothWt.toFixed(2)} g`;

    // Display resin volume in chosen unit
    const displayVol = convertVolume(resinVol, sys === 'imperial' ? 'fl oz' : 'mL', volUnit, sys);
    resinVolumeResult.textContent = `${displayVol.toFixed(2)} ${volUnit}`;

    // Display resin weight in chosen unit
    const displayWt = convertWeight(resinWt, sys === 'imperial' ? 'oz' : 'g', wtUnit, resin, sys);
    resinWeightResult.textContent = `${displayWt.toFixed(2)} ${wtUnit}`;

    // Display ratio
    resinRatioResult.textContent = `${ratio.toFixed(1)}:1 (resin:cloth)`;

    // Update coverage info
    updateCoverageInfo(cloth, resin, sys);

    // Update print summary if it exists
    updatePrintSummary();
  }

  // Reset results display
  function resetResults() {
    clothWeightResult.textContent = '—';
    resinVolumeResult.textContent = '—';
    resinWeightResult.textContent = '—';
    resinRatioResult.textContent = '—';
    coverageInfoElement.textContent = '';
  }

  // Update coverage info text
  function updateCoverageInfo(cloth, resin, sys) {
    if (!coverageInfoElement) return;
    
    const clothType = cloth.name.split(' ')[0];
    const resinName = resin.charAt(0).toUpperCase() + resin.slice(1);
    
    coverageInfoElement.textContent = `${resinName} resin with ${clothType} typically requires a ${cloth.ratios[resin]}:1 ratio for proper saturation.`;
  }

  // Update print summary
  function updatePrintSummary() {
    if (!printUrlSpan) return;
    
    printUrlSpan.textContent = window.location.href;
    
    if (printUnitSystemSpan) {
      printUnitSystemSpan.textContent = unitSystemSelect.options[unitSystemSelect.selectedIndex].text;
    }
    
    if (printMaterialTypeSpan) {
      printMaterialTypeSpan.textContent = materialTypeSelect.options[materialTypeSelect.selectedIndex].text;
    }
    
    if (printClothTypeSpan && clothTypeSelect.selectedOptions[0]) {
      printClothTypeSpan.textContent = clothTypeSelect.selectedOptions[0].text;
    }
    
    if (printResinTypeSpan) {
      printResinTypeSpan.textContent = resinTypeSelect.options[resinTypeSelect.selectedIndex].text;
    }
    
    if (printSurfaceAreaSpan) {
      printSurfaceAreaSpan.textContent = surfaceAreaInput.value;
    }
    
    if (printAreaUnitSpan) {
      printAreaUnitSpan.textContent = areaUnitSelect.options[areaUnitSelect.selectedIndex].text;
    }
    
    if (printQrImage) {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(window.location.href)}`;
      printQrImage.src = qrUrl;
    }
  }

  // Batch Calculator Functions
  function addLayer() {
    if (!layerTemplate || !layersList) return;
    
    const layerId = nextLayerId++;
    const clone = layerTemplate.content.cloneNode(true);
    const layerCard = clone.querySelector('.layer-card');
    
    // Set layer number
    layerCard.querySelector('.layer-number').textContent = layers.length + 1;
    layerCard.dataset.layerId = layerId;
    
    // Get references to elements
    const materialSelect = layerCard.querySelector('.layer-material');
    const clothTypeSelect = layerCard.querySelector('.layer-cloth-type');
    const removeBtn = layerCard.querySelector('.remove-layer-btn');
    const clothWeightSpan = layerCard.querySelector('.layer-cloth-weight');
    const resinVolumeSpan = layerCard.querySelector('.layer-resin-volume');
    const resinWeightSpan = layerCard.querySelector('.layer-resin-weight');
    
    // Add event listeners
    materialSelect.addEventListener('change', function() {
      updateLayerClothTypes(layerId);
      calculateBatchResults();
    });
    
    clothTypeSelect.addEventListener('change', function() {
      calculateBatchResults();
    });
    
    removeBtn.addEventListener('click', function() {
      removeLayer(layerId);
    });
    
    // Add to DOM
    layersList.appendChild(clone);
    
    // Add to layers array
    layers.push({
      id: layerId,
      materialSelect,
      clothTypeSelect,
      clothWeightSpan,
      resinVolumeSpan,
      resinWeightSpan
    });
    
    // Initialize cloth types
    updateLayerClothTypes(layerId);
    
    // Update calculations
    calculateBatchResults();
  }

  function removeLayer(layerId) {
    // Remove from DOM
    const layerCard = document.querySelector(`.layer-card[data-layer-id="${layerId}"]`);
    if (layerCard) {
      layerCard.remove();
    }
    
    // Remove from layers array
    const index = layers.findIndex(layer => layer.id === layerId);
    if (index !== -1) {
      layers.splice(index, 1);
    }
    
    // Update layer numbers
    document.querySelectorAll('.layer-card').forEach((card, idx) => {
      card.querySelector('.layer-number').textContent = idx + 1;
    });
    
    // Update calculations
    calculateBatchResults();
  }

  function updateLayerClothTypes(layerId) {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;
    
    const materialType = layer.materialSelect.value;
    const sys = batchUnitSystemSelect.value;
    
    // Clear and populate cloth type select
    layer.clothTypeSelect.innerHTML = '';
    
    if (!materials[materialType] || !materials[materialType][sys]) {
      return;
    }
    
    materials[materialType][sys].forEach(c => {
      const option = document.createElement('option');
      option.value = c.id;
      option.textContent = c.name;
      layer.clothTypeSelect.appendChild(option);
    });
    
    // Validate resin compatibility
    validateBatchResinCompatibility();
  }

  function validateBatchResinCompatibility() {
    // Check if any layer uses carbon or kevlar
    const hasNonFiberglass = layers.some(layer => 
      layer.materialSelect.value === 'carbon' || layer.materialSelect.value === 'kevlar'
    );
    
    // Disable polyester option if any layer uses carbon or kevlar
    Array.from(batchResinTypeSelect.options).forEach(opt => {
      opt.disabled = hasNonFiberglass && opt.value === 'polyester';
    });
    
    // Switch to epoxy if polyester is selected but incompatible
    if (hasNonFiberglass && batchResinTypeSelect.value === 'polyester') {
      batchResinTypeSelect.value = 'epoxy';
      alert('Polyester resin is not recommended for carbon fiber or kevlar. Switched to epoxy.');
    }
  }

  function calculateBatchResults() {
    if (layers.length === 0) return;
    
    const sys = batchUnitSystemSelect.value;
    const resinType = batchResinTypeSelect.value;
    const area = parseFloat(batchSurfaceAreaInput.value) || 0;
    const areaUnit = batchAreaUnitSelect.value;
    const volumeUnit = batchVolumeResultUnitSelect.value;
    const weightUnit = batchWeightResultUnitSelect.value;
    
    if (area <= 0) return;
    
    // Standard area (convert to ft² or m²)
    const stdArea = area * conversions.area[sys][areaUnit];
    
    let totalClothWeight = 0;
    let totalResinWeight = 0;
    let totalResinVolume = 0;
    let weightedRatioSum = 0;
    
    // Calculate for each layer with efficiency factor
    layers.forEach((layer, index) => {
      const materialType = layer.materialSelect.value;
      const clothTypeId = layer.clothTypeSelect.value;
      
      // Find the selected cloth
      const cloth = materials[materialType][sys].find(c => c.id === clothTypeId);
      if (!cloth) return;
      
      // Cloth weight
      const clothWeight = cloth.weight * stdArea;
      totalClothWeight += clothWeight;
      
      // Resin weight with efficiency factor
      const ratio = cloth.ratios[resinType];
      let efficiencyFactor = 1.0; // First layer has no reduction
      
      // Apply efficiency factors for subsequent layers
      if (index === 1) efficiencyFactor = 0.9;  // Second layer: 10% reduction
      else if (index === 2) efficiencyFactor = 0.85; // Third layer: 15% reduction
      else if (index >= 3) efficiencyFactor = 0.8;  // Fourth+ layers: 20% reduction
      
      const layerResinWeight = clothWeight * ratio * efficiencyFactor;
      totalResinWeight += layerResinWeight;
      
      // For weighted average ratio calculation
      weightedRatioSum += ratio * clothWeight;
      
      // Resin volume
      let layerResinVolume;
      if (sys === 'imperial') {
        // Convert oz to fl oz using density
        const lbPerGallon = resinDensity.imperial[resinType];
        const ozPerFlOz = (lbPerGallon * 16) / 128; // Convert lb/gal to oz/fl oz
        layerResinVolume = layerResinWeight / ozPerFlOz;
      } else {
        // Convert g to mL using density
        layerResinVolume = layerResinWeight / resinDensity.metric[resinType];
      }
      totalResinVolume += layerResinVolume;
      
      // Update layer results
      layer.clothWeightSpan.textContent = sys === 'imperial'
        ? `${clothWeight.toFixed(2)} oz`
        : `${clothWeight.toFixed(2)} g`;
      
      const displayLayerVol = convertVolume(layerResinVolume, sys === 'imperial' ? 'fl oz' : 'mL', volumeUnit, sys);
      layer.resinVolumeSpan.textContent = `${displayLayerVol.toFixed(2)} ${volumeUnit}`;
      
      const displayLayerWt = convertWeight(layerResinWeight, sys === 'imperial' ? 'oz' : 'g', weightUnit, resinType, sys);
      layer.resinWeightSpan.textContent = `${displayLayerWt.toFixed(2)} ${weightUnit}`;
    });
    
    // Calculate average ratio
    const avgRatio = totalClothWeight > 0 ? weightedRatioSum / totalClothWeight : 0;
    
    // Calculate efficiency percentage
    const standardResinWeight = totalClothWeight * avgRatio;
    const efficiencyPercentage = standardResinWeight > 0 
      ? 100 - (totalResinWeight / standardResinWeight * 100)
      : 0;
    
    // Update batch results
    if (batchTotalClothWeightResult) {
      batchTotalClothWeightResult.textContent = sys === 'imperial'
        ? `${totalClothWeight.toFixed(2)} oz`
        : `${totalClothWeight.toFixed(2)} g`;
    }
    
    if (batchTotalResinVolumeResult) {
      const displayTotalVol = convertVolume(totalResinVolume, sys === 'imperial' ? 'fl oz' : 'mL', volumeUnit, sys);
      batchTotalResinVolumeResult.textContent = `${displayTotalVol.toFixed(2)} ${volumeUnit}`;
    }
    
    if (batchTotalResinWeightResult) {
      const displayTotalWt = convertWeight(totalResinWeight, sys === 'imperial' ? 'oz' : 'g', weightUnit, resinType, sys);
      batchTotalResinWeightResult.textContent = `${displayTotalWt.toFixed(2)} ${weightUnit}`;
    }
    
    if (batchAverageRatioResult) {
      batchAverageRatioResult.textContent = `${avgRatio.toFixed(1)}:1 (resin:cloth)`;
    }
    
    if (batchEfficiencyResult) {
      batchEfficiencyResult.textContent = `${efficiencyPercentage.toFixed(1)}% less resin than single layers`;
    }
  }

  // Initialize the calculator
  function init() {
    // Set up event listeners for single layer calculator
    unitSystemSelect.addEventListener('change', function() {
      updateAreaUnits();
      updateResultUnits();
      updateClothTypes();
      calculate();
    });
    
    materialTypeSelect.addEventListener('change', function() {
      updateClothTypes();
      calculate();
    });
    
    clothTypeSelect.addEventListener('change', function() {
      if (clothThumbnail) updateThumbnail();
      calculate();
    });
    
    resinTypeSelect.addEventListener('change', calculate);
    surfaceAreaInput.addEventListener('input', calculate);
    areaUnitSelect.addEventListener('change', calculate);
    volumeResultUnitSelect.addEventListener('change', calculate);
    weightResultUnitSelect.addEventListener('change', calculate);
    
    // Set up print button if it exists
    if (printButton) {
      printButton.addEventListener('click', function() {
        window.print();
      });
    }
    
    // Set up batch calculator event listeners
    if (batchUnitSystemSelect) {
      batchUnitSystemSelect.addEventListener('change', function() {
        updateAreaUnits();
        updateResultUnits();
        layers.forEach(layer => updateLayerClothTypes(layer.id));
        calculateBatchResults();
      });
    }
    
    if (batchResinTypeSelect) {
      batchResinTypeSelect.addEventListener('change', calculateBatchResults);
    }
    
    if (batchSurfaceAreaInput) {
      batchSurfaceAreaInput.addEventListener('input', calculateBatchResults);
    }
    
    if (batchAreaUnitSelect) {
      batchAreaUnitSelect.addEventListener('change', calculateBatchResults);
    }
    
    if (batchVolumeResultUnitSelect) {
      batchVolumeResultUnitSelect.addEventListener('change', calculateBatchResults);
    }
    
    if (batchWeightResultUnitSelect) {
      batchWeightResultUnitSelect.addEventListener('change', calculateBatchResults);
    }
    
    // Set up Add Layer button
    if (addLayerBtn) {
      addLayerBtn.style.display = 'inline-block';
      addLayerBtn.removeEventListener('click', addLayer);
      addLayerBtn.addEventListener('click', addLayer);
    }
    
    // Initialize dropdowns
    updateAreaUnits();
    updateResultUnits();
    updateClothTypes();
    
    // Initial calculation
    calculate();
  }

  // Start the calculator
  init();
});
