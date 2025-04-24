const unitConversionRates = {
    squareFootage: { ccs: 1, gallons: 0.00629, quarts: 0.02517, liters: 0.02382, ounces: 0.133, ccs: 29.5735 },
    gallons: { squareFootage: 159, quarts: 4, liters: 3.78541, ounces: 128, ccs: 3785.41 },
    quarts: { squareFootage: 39.75, gallons: 0.25, liters: 0.946353, ounces: 32, ccs: 946.353 },
    liters: { squareFootage: 42.01, gallons: 0.264172, quarts: 1.05669, ounces: 33.814, ccs: 1000 },
    ounces: { squareFootage: 7.5, gallons: 0.0078125, liters: 0.0295735, quarts: 0.03125, ccs: 29.5735 },
    ccs: { squareFootage: 0.25, gallons: 0.000264172, liters: 0.001, quarts: 0.00105669, ounces: 0.033814 }
};

function convertUnits(volume, fromUnit, toUnit) {
    let numericVolume = parseFloat(volume);
    if (isNaN(numericVolume)) {
        return "Conversion Error";
    }
    return fromUnit === toUnit ? numericVolume : (numericVolume * (unitConversionRates[fromUnit][toUnit] || 0));
}

function formatNumber(number) {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number);
}

function calculateEpifanes() {
    const inputValue = parseFloat(document.getElementById('inputValue').value);
    const inputUnitType = document.getElementById('unitType').value;
    const outputUnitType = document.getElementById('outputUnitType').value;

    let coverageArea;
    if (inputUnitType === 'squareFootage') {
        coverageArea = inputValue; // Use input as coverage area for square footage
    } else {
        // Convert input volume to equivalent coverage area
        let totalVolumeCCs = convertUnits(inputValue, inputUnitType, 'ccs');
        coverageArea = totalVolumeCCs / (750 / 120); // Convert total volume to coverage area
    }

    let totalVolumeCCs = coverageArea * (750 / 120);
    const volumeA = totalVolumeCCs * (2/3); // Component A volume
    const volumeB = totalVolumeCCs * (1/3); // Component B volume

    // Convert volumes to output units
    const volumeAInOutputUnits = convertUnits(volumeA, 'ccs', outputUnitType);
    const volumeBInOutputUnits = convertUnits(volumeB, 'ccs', outputUnitType);

    const coverageAreaFormatted = formatNumber(coverageArea);
    const volumeAFormatted = formatNumber(volumeAInOutputUnits);
    const volumeBFormatted = formatNumber(volumeBInOutputUnits);

    document.getElementById('result').innerHTML = `
        <p>Approximate coverage area: <strong>${coverageAreaFormatted} sq. ft.</strong></p>
        <p>Component A (Paint): <strong>${volumeAFormatted} ${outputUnitType}</strong></p>
        <p>Component B (Catalyst): <strong>${volumeBFormatted} ${outputUnitType}</strong></p>`;
}

document.getElementById('inputValue').addEventListener('input', calculateEpifanes);
document.getElementById('unitType').addEventListener('change', calculateEpifanes);
document.getElementById('outputUnitType').addEventListener('change', calculateEpifanes);

calculateEpifanes(); // Initial calculation on page load
