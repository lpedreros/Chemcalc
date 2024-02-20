const unitConversionRates = {
  squareFootage: { ccs: 1 }, // Placeholder ratio, adjust as needed
  gallons: { liters: 3.78541, quarts: 4, ounces: 128, ccs: 3785.41 },
  liters: { gallons: 0.264172, quarts: 1.05669, ounces: 33.814, ccs: 1000 },
  quarts: { gallons: 0.25, liters: 0.946353, ounces: 32, ccs: 946.353 },
  ounces: { gallons: 0.0078125, liters: 0.0295735, quarts: 0.03125, ccs: 29.5735 },
  ccs: { gallons: 0.000264172, liters: 0.001, quarts: 0.00105669, ounces: 0.033814 }
};

/**
 * Converts a volume from one unit to another.
 *
 * @param {number} volume - The volume to convert.
 * @param {string} fromUnit - The unit to convert from.
 * @param {string} toUnit - The unit to convert to.
 * @returns {number} The converted volume.
 */
function convertUnits(volume, fromUnit, toUnit) {
  let numericVolume = parseFloat(volume);
  if (isNaN(numericVolume)) {
    return "Conversion Error";
  }

  return fromUnit === toUnit ? numericVolume.toFixed(2) : (numericVolume * (unitConversionRates[fromUnit][toUnit] || 0)).toFixed(2);
}

/**
 * Calculates the coverage of a given paint type.
 *
 * @param {string} paintType - The paint type.
 * @param {number} area - The area to be painted.
 * @param {string} methodType - The application method.
 * @returns {number} The coverage in the selected result unit.
 */
function calculatePaintCoverage(paintType, area, methodType) {
  let coveragePerGallon;
  switch (paintType) {
    case '545primer':
      coveragePerGallon = methodType === 'spray' ? 317.8 : 635.6; // Adjusted values based on data sheet
      break;
    case 'awlgrip':
      coveragePerGallon = methodType === 'spray' ? 542.9 : 814.8; // Adjusted values based on data sheet
      break;
    case 'awlcraft2000':
      coveragePerGallon = 725.2; // Adjusted values based on data sheet
      break;
    default:
      return "Coverage Error";
  }

  return area ? (area / coveragePerGallon).toFixed(2) : "0.00";
}

/**
 * Calculates the paint needs for a given paint type, input value, unit type, result unit type, and method type.
 *
 * @param {string} paintType - The paint type.
 * @param {number} inputValue - The input value.
 * @param {string} unitType - The input unit type.
 * @param {string} resultUnitType - The result unit type.
 * @param {string} methodType - The application method.
 * @returns {object} The calculated paint needs, including the paint, converter, and reducer.
 */
function calculatePaintNeeds(paintType, inputValue, unitType, resultUnitType, methodType) {
  const inputValueNum = parseFloat(inputValue);
  if (isNaN(inputValueNum)) {
    return { paint: "Error", converter: "Error", reducer: "Error" };
  }

  let paintVolumeInCCs = convertUnits(inputValueNum, unitType, 'ccs');
  if (paintVolumeInCCs === "Conversion Error") return { paint: "Error", converter: "Error", reducer: "Error" };

  let converterRatio, reducerRatio;
  switch (paintType) {
    case '545primer':
      converterRatio = 1; // 1:1 ratio
      reducerRatio = methodType === 'spray' ? 0.25 : 0.15; // Adjusted based on data sheet
      break;
    case 'awlgrip':
      converterRatio = methodType === 'spray' ? 1 : 0.5; // 1:1 for spray, 2:1 for roll
      reducerRatio = methodType === 'spray' ? 0.25 : 0.20; // Adjusted based on data sheet
      break;
    case 'awlcraft2000':
      converterRatio = 0.5; // 2:1 ratio for spray
      reducerRatio = 0.33; // 33% reduction for spray
      break;
    default:
      converterRatio = reducerRatio = 0; // Unsupported types/methods
  }

  let converterVolumeInCCs = paintVolumeInCCs * converterRatio;
  let reducerVolumeInCCs = paintVolumeInCCs * reducerRatio;

  return {
    paint: convertUnits(paintVolumeInCCs, 'ccs', resultUnitType),
    converter: convertUnits(converterVolumeInCCs, 'ccs', resultUnitType),
    reducer: convertUnits(reducerVolumeInCCs, 'ccs', resultUnitType)
  };
}

function updateResults() {
  const methodType = document.getElementById('methodType').value;
  const paintTypeSelect = document.getElementById('paintType');
  const paintType = paintTypeSelect.value;
		const inputValue = document.getElementById("inputValue");
    const unitType = document.getElementById('unitType').value;
    const resultUnitType = document.getElementById('resultUnitType').value;

  for (let option of paintTypeSelect.options) {
    option.disabled = (option.value === 'awlcraft2000' && methodType === 'roll');
  }

  let inputValueNum = parseFloat(inputValue.value);
  if (isNaN(inputValueNum)) {
    return;
  }

  let result;
  if (methodType === 'roll' && paintType === 'awlcraft2000') {
    paintTypeSelect.value = 'awlgrip';
    result = calculatePaintNeeds(paintType, inputValueNum, unitType, resultUnitType, methodType);
  } else {
    result = calculatePaintNeeds(paintType, inputValueNum, unitType, resultUnitType, methodType);
  }

  document.getElementById('result').innerHTML = `
        <p>Amount of paint needed: <strong>${result.paint} ${resultUnitType}</strong></p>
        <p>Converter: <strong>${result.converter} ${resultUnitType}</strong></p>
        <p>Reducer: <strong>${result.reducer} ${resultUnitType}</strong></p>`;
}

// Attach event listeners to form elements
document.getElementById('methodType').addEventListener('change', updateResults);
document.getElementById('paintType').addEventListener('change', updateResults);
document.getElementById('unitType').addEventListener('input', updateResults);
document.getElementById('resultUnitType').addEventListener('input', updateResults);
document.getElementById("inputValue").addEventListener("input", updateResults);

// Initial call to update results based on default form values
updateResults();