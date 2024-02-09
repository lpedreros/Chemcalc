function convertUnits(volume, fromUnit, toUnit) {
    const conversionRates = {
        squareFootage: { ccs: 1 }, // Placeholder ratio, adjust as needed
        gallons: { liters: 3.78541, quarts: 4, ounces: 128, ccs: 3785.41 },
        liters: { gallons: 0.264172, quarts: 1.05669, ounces: 33.814, ccs: 1000 },
        quarts: { gallons: 0.25, liters: 0.946353, ounces: 32, ccs: 946.353 },
        ounces: { gallons: 0.0078125, liters: 0.0295735, quarts: 0.03125, ccs: 29.5735 },
        ccs: { gallons: 0.000264172, liters: 0.001, quarts: 0.00105669, ounces: 0.033814 }
    };

    let numericVolume = parseFloat(volume);
    if (isNaN(numericVolume)) {
        return "Conversion Error";
    }

    return fromUnit === toUnit ? numericVolume.toFixed(2) : (numericVolume * (conversionRates[fromUnit][toUnit] || 0)).toFixed(2);
}

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

function calculatePaintNeeds(paintType, inputValue, unitType, resultUnitType, methodType) {
    let paintVolumeInCCs = convertUnits(inputValue.trim() === '' ? 0 : Number(inputValue), unitType, 'ccs');
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
    let methodType = document.getElementById('methodType').value;
    let paintTypeSelect = document.getElementById('paintType');
    let paintType = paintTypeSelect.value;
		let unitType = document.getElementById('unitType').value;
    let resultUnitType = document.getElementById('resultUnitType').value;
    let inputValue = document.getElementById('inputValue').value;

    for (let option of paintTypeSelect.options) {
        option.disabled = (option.value === 'awlcraft2000' && methodType === 'roll');
    }
    if (methodType === 'roll' && paintType === 'awlcraft2000') {
        paintTypeSelect.value = 'awlgrip';
        paintType = 'awlgrip';
    }

    let result = calculatePaintNeeds(paintType, inputValue, unitType, resultUnitType, methodType);

    document.getElementById('result').innerHTML = `
        <p>Amount of paint needed: <strong>${result.paint} ${resultUnitType}</strong></p>
        <p>Converter: <strong>${result.converter} ${resultUnitType}</strong></p>
        <p>Reducer: <strong>${result.reducer} ${resultUnitType}</strong></p>`;
}

// Attach event listeners to form elements
document.getElementById('methodType').addEventListener('change', updateResults);
document.getElementById('paintType').addEventListener('change', updateResults);
document.getElementById('unitType').addEventListener('change', updateResults);
document.getElementById('resultUnitType').addEventListener('change', updateResults);
document.getElementById('inputValue').addEventListener('input', updateResults);

// Initial call to update results based on default form values
updateResults();
