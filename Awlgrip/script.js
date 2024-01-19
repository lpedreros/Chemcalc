function convertUnits(volume, fromUnit, toUnit) {
    // Conversion logic
    switch (fromUnit) {
        case 'gallons':
            if (toUnit === 'liters') return volume * 3.78541;
            if (toUnit === 'quarts') return volume * 4;
            if (toUnit === 'ounces') return volume * 128;
            break;
        case 'liters':
            if (toUnit === 'gallons') return volume / 3.78541;
            if (toUnit === 'quarts') return volume * 1.05669;
            if (toUnit === 'ounces') return volume * 33.814;
            break;
        case 'quarts':
            if (toUnit === 'gallons') return volume / 4;
            if (toUnit === 'liters') return volume * 0.946353;
            if (toUnit === 'ounces') return volume * 32;
            break;
        case 'ounces':
            if (toUnit === 'gallons') return volume / 128;
            if (toUnit === 'liters') return volume * 0.0295735;
            if (toUnit === 'quarts') return volume / 32;
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
        // Convert area to volume in gallons
        paintVolumeInGallons = calculatePaintCoverage(paintType, Number(inputValue));
    } else {
        // Convert input volume to gallons
        paintVolumeInGallons = convertUnits(Number(inputValue), unitType, 'gallons');
    }

    // Calculate the amounts for paint, converter, and reducer
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

    // Convert the results to the desired output unit
    let paint = convertUnits(paintVolumeInGallons, 'gallons', resultUnitType);
    converter = convertUnits(converter, 'gallons', resultUnitType);
    reducer = convertUnits(reducer, 'gallons', resultUnitType);

    return { paint, converter, reducer };
}

document.getElementById('mixForm').addEventListener('submit', function(event) {
    event.preventDefault();

    let paintType = document.getElementById('paintType').value;
    let unitType = document.getElementById('unitType').value;
    let resultUnitType = document.getElementById('resultUnitType').value;
    let inputValue = document.getElementById('inputValue').value;

    let result = calculatePaintNeeds(paintType, inputValue, unitType, resultUnitType);

    let resultText = `Amount of paint needed: ${result.paint.toFixed(2)} ${resultUnitType}\n`;
    resultText += `Converter: ${result.converter.toFixed(2)} ${resultUnitType}\n`;
    resultText += `Reducer: ${result.reducer.toFixed(2)} ${resultUnitType}`;

    document.getElementById('result').innerText = resultText;
});
