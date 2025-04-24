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
  // DOM Elements
  const unitSystemSelect = document.getElementById('unitSystem');
  const materialTypeSelect = document.getElementById('materialType');
  const clothTypeSelect = document.getElementById('clothType');
  const resinTypeSelect = document.getElementById('resinType');
  const surfaceAreaInput = document.getElementById('surfaceArea');
  const areaUnitSelect = document.getElementById('areaUnit');
  const volumeResultUnitSelect = document.getElementById('volumeResultUnit');
  const weightResultUnitSelect = document.getElementById('weightResultUnit');
  
  // Result Elements
  const clothWeightResult = document.getElementById('clothWeight').querySelector('span');
  const resinVolumeResult = document.getElementById('resinVolume').querySelector('span');
  const resinWeightResult = document.getElementById('resinWeight').querySelector('span');
  const resinRatioResult = document.getElementById('resinRatio').querySelector('span');
  const coverageInfoElement = document.getElementById('coverageInfo');

  // Material Data
  const materials = {
    fiberglass: {
      imperial: [
        { id: 'csm_1.5', name: 'Chopped Strand Mat (1.5 oz/ft²)', weight: 1.5, unit: 'oz/ft²', ratios: { polyester: 2.0, epoxy: 2.0, vinylester: 2.0 } },
        { id: 'fg_0.75', name: 'Lightweight Cloth (0.75 oz/yd²)', weight: 0.75/9, unit: 'oz/ft²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_1.5', name: 'Lightweight Cloth (1.5 oz/yd²)', weight: 1.5/9, unit: 'oz/ft²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_4', name: 'Medium Weight Cloth (4 oz/yd²)', weight: 4/9, unit: 'oz/ft²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_5.6', name: 'Medium Weight Cloth (5.6 oz/yd²)', weight: 5.6/9, unit: 'oz/ft²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_7.5', name: 'Heavy Weight Cloth (7.5 oz/yd²)', weight: 7.5/9, unit: 'oz/ft²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_10', name: 'Heavy Weight Cloth (10 oz/yd²)', weight: 10/9, unit: 'oz/ft²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'biaxial_17', name: 'Biaxial Cloth (17 oz/yd²)', weight: 17/9, unit: 'oz/ft²', ratios: { polyester: 3.0, epoxy: 2.5, vinylester: 2.8 } }
      ],
      metric: [
        { id: 'csm_450', name: 'Chopped Strand Mat (450 g/m²)', weight: 450, unit: 'g/m²', ratios: { polyester: 2.0, epoxy: 2.0, vinylester: 2.0 } },
        { id: 'fg_25', name: 'Lightweight Cloth (25 g/m²)', weight: 25, unit: 'g/m²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_50', name: 'Lightweight Cloth (50 g/m²)', weight: 50, unit: 'g/m²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_135', name: 'Medium Weight Cloth (135 g/m²)', weight: 135, unit: 'g/m²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_190', name: 'Medium Weight Cloth (190 g/m²)', weight: 190, unit: 'g/m²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_255', name: 'Heavy Weight Cloth (255 g/m²)', weight: 255, unit: 'g/m²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_340', name: 'Heavy Weight Cloth (340 g/m²)', weight: 340, unit: 'g/m²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'biaxial_580', name: 'Biaxial Cloth (580 g/m²)', weight: 580, unit: 'g/m²', ratios: { polyester: 3.0, epoxy: 2.5, vinylester: 2.8 } }
      ]
    },
    carbon: {
      imperial: [
        { id: 'carbon_5.7', name: 'Plain Weave (5.7 oz/yd²)', weight: 5.7/9, unit: 'oz/ft²', ratios: { polyester: 0, epoxy: 1.8, vinylester: 2.0 } },
        { id: 'carbon_5.8', name: 'Twill Weave (5.8 oz/yd²)', weight: 5.8/9, unit: 'oz/ft²', ratios: { polyester: 0, epoxy: 1.8, vinylester: 2.0 } },
        { id: 'carbon_9', name: 'Unidirectional (9 oz/yd²)', weight: 9/9, unit: 'oz/ft²', ratios: { polyester: 0, epoxy: 1.5, vinylester: 1.8 } }
      ],
      metric: [
        { id: 'carbon_193', name: 'Plain Weave (193 g/m²)', weight: 193, unit: 'g/m²', ratios: { polyester: 0, epoxy: 1.8, vinylester: 2.0 } },
        { id: 'carbon_197', name: 'Twill Weave (197 g/m²)', weight: 197, unit: 'g/m²', ratios: { polyester: 0, epoxy: 1.8, vinylester: 2.0 } },
        { id: 'carbon_305', name: 'Unidirectional (305 g/m²)', weight: 305, unit: 'g/m²', ratios: { polyester: 0, epoxy: 1.5, vinylester: 1.8 } }
      ]
    },
    kevlar: {
      imperial: [
        { id: 'kevlar_5', name: 'Plain Weave (5 oz/yd²)', weight: 5/9, unit: 'oz/ft²', ratios: { polyester: 0, epoxy: 2.2, vinylester: 2.5 } },
        { id: 'kevlar_carbon_6', name: 'Kevlar/Carbon Hybrid (6 oz/yd²)', weight: 6/9, unit: 'oz/ft²', ratios: { polyester: 0, epoxy: 2.0, vinylester: 2.3 } }
      ],
      metric: [
        { id: 'kevlar_170', name: 'Plain Weave (170 g/m²)', weight: 170, unit: 'g/m²', ratios: { polyester: 0, epoxy: 2.2, vinylester: 2.5 } },
        { id: 'kevlar_carbon_200', name: 'Kevlar/Carbon Hybrid (200 g/m²)', weight: 200, unit: 'g/m²', ratios: { polyester: 0, epoxy: 2.0, vinylester: 2.3 } }
      ]
    }
  };

  // Conversion factors
  const conversions = {
    // Area conversions to standard units (ft² for imperial, m² for metric)
    area: {
      imperial: {
        'ft²': 1,
        'yd²': 9,
        'in²': 1/144
      },
      metric: {
        'm²': 1,
        'cm²': 1/10000,
        'mm²': 1/1000000
      }
    },
    // Volume conversions
    volume: {
      imperial: {
        // To fluid ounces
        'fl oz': 1,
        'quart': 32,
        'gallon': 128
      },
      metric: {
        // To milliliters
        'mL': 1,
        'cc': 1,
        'L': 1000
      }
    },
    // Weight conversions
    weight: {
      imperial: {
        'oz': 1
      },
      metric: {
        'g': 1,
        'kg': 1000
      }
    },
    // Density of resins (for weight calculations)
    density: {
      imperial: {
        // lb/gal
        'polyester': 9.2,
        'epoxy': 9.5,
        'vinylester': 9.3
      },
      metric: {
        // g/mL
        'polyester': 1.1,
        'epoxy': 1.14,
        'vinylester': 1.12
      }
    }
  };

  // Initialize area unit options based on measurement system
  function updateAreaUnits() {
    const system = unitSystemSelect.value;
    areaUnitSelect.innerHTML = '';
    
    const units = system === 'imperial' 
      ? ['ft²', 'yd²', 'in²'] 
      : ['m²', 'cm²', 'mm²'];
    
    units.forEach(unit => {
      const option = document.createElement('option');
      option.value = unit;
      option.textContent = unit;
      areaUnitSelect.appendChild(option);
    });
  }

  // Initialize result unit options based on measurement system
  function updateResultUnits() {
    const system = unitSystemSelect.value;
    
    // Update volume result units
    volumeResultUnitSelect.innerHTML = '';
    const volumeUnits = system === 'imperial' 
      ? ['fl oz', 'quart', 'gallon'] 
      : ['mL', 'cc', 'L'];
    
    volumeUnits.forEach(unit => {
      const option = document.createElement('option');
      option.value = unit;
      option.textContent = unit;
      volumeResultUnitSelect.appendChild(option);
    });
    
    // Update weight result units
    weightResultUnitSelect.innerHTML = '';
    const weightUnits = system === 'imperial' 
      ? ['oz'] 
      : ['g', 'kg'];
    
    weightUnits.forEach(unit => {
      const option = document.createElement('option');
      option.value = unit;
      option.textContent = unit;
      weightResultUnitSelect.appendChild(option);
    });
  }

  // Update cloth type options based on material and measurement system
  function updateClothTypes() {
    const material = materialTypeSelect.value;
    const system = unitSystemSelect.value;
    clothTypeSelect.innerHTML = '';
    
    if (!materials[material] || !materials[material][system]) {
      return;
    }
    
    materials[material][system].forEach(cloth => {
      const option = document.createElement('option');
      option.value = cloth.id;
      option.textContent = cloth.name;
      clothTypeSelect.appendChild(option);
    });
    
    // Check if resin type is compatible with material
    checkResinCompatibility();
  }
  
  // Check if selected resin is compatible with selected material
  function checkResinCompatibility() {
    const material = materialTypeSelect.value;
    const resin = resinTypeSelect.value;
    const system = unitSystemSelect.value;
    
    if (material === 'carbon' || material === 'kevlar') {
      // Carbon and Kevlar are not compatible with polyester resin
      if (resin === 'polyester') {
        resinTypeSelect.value = 'epoxy';
        alert('Polyester resin is not recommended for ' + 
              (material === 'carbon' ? 'Carbon Fiber' : 'Kevlar') + 
              '. Switching to Epoxy resin.');
      }
      
      // Disable polyester option
      Array.from(resinTypeSelect.options).forEach(option => {
        if (option.value === 'polyester') {
          option.disabled = true;
        }
      });
    } else {
      // Enable all options for fiberglass
      Array.from(resinTypeSelect.options).forEach(option => {
        option.disabled = false;
      });
    }
    
    // Recalculate with new values
    calculate();
  }

  // Main calculation function
  function calculate() {
    const material = materialTypeSelect.value;
    const system = unitSystemSelect.value;
    const clothId = clothTypeSelect.value;
    const resinType = resinTypeSelect.value;
    const surfaceArea = parseFloat(surfaceAreaInput.value) || 0;
    const areaUnit = areaUnitSelect.value;
    
    // Find the selected cloth data
    const clothData = materials[material][system].find(c => c.id === clothId);
    
    if (!clothData || surfaceArea <= 0) {
      resetResults();
      return;
    }
    
    // Convert surface area to standard units (ft² or m²)
    const standardArea = surfaceArea * conversions.area[system][areaUnit];
    
    // Calculate cloth weight
    const totalClothWeight = clothData.weight * standardArea;
    
    // Get resin ratio for the selected cloth and resin type
    const resinRatio = clothData.ratios[resinType];
    
    if (!resinRatio) {
      resetResults();
      return;
    }
    
    // Calculate resin weight
    const resinWeight = totalClothWeight * resinRatio;
    
    // Calculate resin volume based on density
    const resinDensity = conversions.density[system][resinType];
    let resinVolume;
    
    if (system === 'imperial') {
      // Convert weight in oz to volume in fl oz
      resinVolume = resinWeight / (resinDensity * 0.0078125); // 0.0078125 = 1/128 (oz per gallon)
    } else {
      // For metric, weight in g to volume in mL
      resinVolume = resinWeight / resinDensity;
    }
    
    // Display results
    displayResults(totalClothWeight, resinVolume, resinWeight, resinRatio, system, clothData, resinType);
  }
  
  // Convert volume to selected unit
  function convertVolume(volume, fromUnit, toUnit, system) {
    // All volumes are stored in base units (fl oz for imperial, mL for metric)
    if (fromUnit === toUnit) return volume;
    
    // Get conversion factor
    const factor = conversions.volume[system][toUnit];
    if (!factor) return volume;
    
    return volume / factor;
  }
  
  // Convert weight to selected unit
  function convertWeight(weight, fromUnit, toUnit, system) {
    // All weights are stored in base units (oz for imperial, g for metric)
    if (fromUnit === toUnit) return weight;
    
    // Get conversion factor
    const factor = conversions.weight[system][toUnit];
    if (!factor) return weight;
    
    return weight / factor;
  }
  
  // Display calculation results
  function displayResults(clothWeight, resinVolume, resinWeight, ratio, system, clothData, resinType) {
    // Get selected result units
    const volumeUnit = volumeResultUnitSelect.value;
    const weightUnit = weightResultUnitSelect.value;
    
    // Format cloth weight
    const clothWeightFormatted = system === 'imperial' 
      ? clothWeight.toFixed(2) + ' oz' 
      : clothWeight.toFixed(2) + ' g';
    
    // Convert and format resin volume based on selected unit
    const convertedVolume = convertVolume(resinVolume, system === 'imperial' ? 'fl oz' : 'mL', volumeUnit, system);
    const resinVolumeFormatted = convertedVolume.toFixed(2) + ' ' + volumeUnit;
    
    // Convert and format resin weight based on selected unit
    const convertedWeight = convertWeight(resinWeight, system === 'imperial' ? 'oz' : 'g', weightUnit, system);
    const resinWeightFormatted = convertedWeight.toFixed(2) + ' ' + weightUnit;
    
    // Update result elements
    clothWeightResult.textContent = clothWeightFormatted;
    resinVolumeResult.textContent = resinVolumeFormatted;
    resinWeightResult.textContent = resinWeightFormatted;
    resinRatioResult.textContent = ratio.toFixed(1) + ':1 (resin:cloth)';
    
    // Add coverage info
    let coverageInfo = '';
    if (system === 'imperial') {
      if (clothData.id.includes('fg_4')) {
        coverageInfo = '1 gallon of ' + resinType + ' resin will wet out approximately 15 square yards of this cloth.';
      } else if (clothData.id.includes('fg_5.6')) {
        coverageInfo = '1 gallon of ' + resinType + ' resin will wet out approximately 10 square yards of this cloth.';
      } else if (clothData.id.includes('fg_10')) {
        coverageInfo = '1 gallon of ' + resinType + ' resin will wet out approximately 6.5 square yards of this cloth.';
      }
    }
    
    coverageInfoElement.textContent = coverageInfo;
  }
  
  // Reset result displays
  function resetResults() {
    clothWeightResult.textContent = '—';
    resinVolumeResult.textContent = '—';
    resinWeightResult.textContent = '—';
    resinRatioResult.textContent = '—';
    coverageInfoElement.textContent = '';
  }

  // Event listeners
  unitSystemSelect.addEventListener('change', () => {
    updateAreaUnits();
    updateResultUnits();
    updateClothTypes();
    calculate();
  });
  
  materialTypeSelect.addEventListener('change', () => {
    updateClothTypes();
    calculate();
  });
  
  clothTypeSelect.addEventListener('change', calculate);
  resinTypeSelect.addEventListener('change', checkResinCompatibility);
  surfaceAreaInput.addEventListener('input', calculate);
  areaUnitSelect.addEventListener('change', calculate);
  volumeResultUnitSelect.addEventListener('change', calculate);
  weightResultUnitSelect.addEventListener('change', calculate);

  // Initialize the form
  updateAreaUnits();
  updateResultUnits();
  updateClothTypes();
});
