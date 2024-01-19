function convertUnits(volume, fromUnit, toUnit) {
    // Conversion logic with cubic centimeters (cc)
    const gallonToCc = 3785.41; // 1 gallon is approximately 3785.41 cc
    const literToCc = 1000; // 1 liter is 1000 cc
    const quartToCc = 946.353; // 1 quart is approximately 946.353 cc
    const ounceToCc = 29.5735; // 1 fluid ounce is approximately 29.5735 cc

    switch (fromUnit) {
        case 'gallons':
            if (toUnit === 'liters') return volume * 3.78541;
            if (toUnit === 'quarts') return volume * 4;
            if (toUnit === 'ounces') return volume * 128;
            if (toUnit === 'ccs') return volume * gallonToCc;
            break;
        case 'liters':
            if (toUnit === 'gallons') return volume / 3.78541;
            if (toUnit === 'quarts') return volume * 1.05669;
            if (toUnit === 'ounces') return volume * 33.814;
            if (toUnit === 'ccs') return volume * literToCc;
            break;
        case 'quarts':
            if (toUnit === 'gallons') return volume / 4;
            if (toUnit === 'liters') return volume * 0.946353;
            if (toUnit === 'ounces') return volume * 32;
            if (toUnit === 'ccs') return volume * quartToCc;
            break;
        case 'ounces':
            if (toUnit === 'gallons') return volume / 128;
            if (toUnit === 'liters') return volume * 0.0295735;
            if (toUnit === 'quarts') return volume / 32;
            if (toUnit === 'ccs') return volume * ounceToCc;
            break;
        case 'ccs':
            if (toUnit === 'gallons') return volume / gallonToCc;
            if (toUnit === 'liters') return volume / literToCc;
            if (toUnit === 'quarts') return volume / quartToCc;
            if (toUnit === 'ounces') return volume / ounceToCc;
            break;
        // Add other cases as needed
    }
    return volume; // Return the original volume for unhandled cases or same units
}
function calculatePaintCoverage(paintType, area) {
    let coveragePerUnit;
    switch (paintType) {
        case 'awlcraft2000':
            coveragePerUnit = 300; // square feet per gallon
            break;
        case 'awlgrip':
            coveragePerUnit = 250; // square feet per gallon
            break;
        case 'highBuild':
            coveragePerUnit = 200; // square feet per gallon
            break;
        default:
            coveragePerUnit = 0;
    }
    return area / coveragePerUnit;
}

function calculatePaintNeeds(paintType, inputValue, unitType, resultUnitType) {
    let paintVolumeInGallons, converter, reducer;

    if (unitType === 'squareFootage') {
        paintVolumeInGallons = calculatePaintCoverage(paintType, Number(inputValue));
    } else {
        paintVolumeInGallons = convertUnits(Number(inputValue), unitType, 'gallons');
    }

    // Initialize result object
    let result = {
        paint: 0,
        converter: 0,
        reducer: 0
    };

    switch (paintType) {
        case 'awlcraft2000':
            converter = paintVolumeInGallons / 2;
            reducer = paintVolumeInGallons * 0.33; // up to 33%
            break;
        case 'awlgrip':
            converter = paintVolumeInGallons;
            reducer = paintVolumeInGallons * 0.25; // up to 25%
            break;
        case 'highBuild':
            converter = paintVolumeInGallons;
            reducer = 0; // No reducer needed
            break;
    }

     result.paint = convertUnits(paintVolumeInGallons, 'gallons', resultUnitType);
    result.converter = convertUnits(converter, 'gallons', resultUnitType);
    result.reducer = convertUnits(reducer, 'gallons', resultUnitType);

    return result; // Return the result object
}

// Function to update results
function updateResults() {
    let paintType = document.getElementById('paintType').value;
    let unitType = document.getElementById('unitType').value;
    let resultUnitType = document.getElementById('resultUnitType').value;
    let inputValue = document.getElementById('inputValue').value;

    let result = calculatePaintNeeds(paintType, inputValue, unitType, resultUnitType);

    // Format results with <strong> tags for bold text and wrap in <p> tags for each line
    let resultText = `<p>Amount of paint needed: <strong>${result.paint.toFixed(2)} ${resultUnitType}</strong></p>`;
    resultText += `<p>Converter: <strong>${result.converter.toFixed(2)} ${resultUnitType}</strong></p>`;
    resultText += `<p>Reducer: <strong>${result.reducer.toFixed(2)} ${resultUnitType}</strong></p>`;

    document.getElementById('result').innerHTML = resultText;
}

// Event listeners to update results when inputs change
document.getElementById('paintType').addEventListener('change', updateResults);
document.getElementById('unitType').addEventListener('change', updateResults);
document.getElementById('resultUnitType').addEventListener('change', updateResults);
document.getElementById('inputValue').addEventListener('input', updateResults);

// Initial update of results
updateResults();