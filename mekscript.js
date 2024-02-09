document.addEventListener('DOMContentLoaded', function () {
    var resinVolumeInput = document.getElementById('resinVolume');
    var volumeUnitSelect = document.getElementById('volumeUnit');
    var ambientTempInput = document.getElementById('ambientTemp');
    var tempUnitSelect = document.getElementById('tempUnit');
    var usingDuratecCheckbox = document.getElementById('usingDuratec');
    var makeItHotCheckbox = document.getElementById('makeItHot');
    var makeItHottestCheckbox = document.getElementById('makeItHottest');
    var mekpPercentageDisplay = document.getElementById('mekpPercentage');
    var mekpCcsDisplay = document.getElementById('mekpCcs');
    var mekpDropsDisplay = document.getElementById('mekpDrops');
    var tempAdviceDisplay = document.getElementById('tempAdvice'); // New element for temperature advice

    function updateMekpValues() {
        var resinVolume = parseFloat(resinVolumeInput.value) || 0;
        var ambientTemp = parseFloat(ambientTempInput.value) || 70; // default temperature
        var volumeUnit = volumeUnitSelect.value;
        var tempUnit = tempUnitSelect.value;
        var usingDuratec = usingDuratecCheckbox.checked;
        var makeItHot = makeItHotCheckbox.checked;
        var makeItHottest = makeItHottestCheckbox.checked;

        resinVolume = convertVolumeToOunces(resinVolume, volumeUnit);
        ambientTemp = convertTempToFahrenheit(ambientTemp, tempUnit);

        var mekpValues = calculateMekp(resinVolume, ambientTemp, usingDuratec, makeItHot, makeItHottest);

        mekpPercentageDisplay.innerHTML = 'Recommended MEKp Percentage: <b>' + mekpValues.percentage.toFixed(2) + '%</b>';
        mekpCcsDisplay.innerHTML = 'MEKp CCs: <b>' + mekpValues.ccs.toFixed(2) + ' CCs</b>';
        mekpDropsDisplay.innerHTML = 'MEKp Drops: <b>' + mekpValues.drops.toFixed(0) + ' Drops</b>';

        // New feature: Check for low temperature and advise
        var thresholdTemp = 60; // Temperature threshold in Fahrenheit
        var displayTempThreshold = tempUnit === 'celsius' ? convertFahrenheitToCelsius(thresholdTemp).toFixed(2) : thresholdTemp;
        var tempUnitDisplay = tempUnit === 'celsius' ? 'C' : 'F';

        if (ambientTemp < thresholdTemp) {
            tempAdviceDisplay.innerHTML = 'Find a way to raise and maintain the substrate temperature to ' + displayTempThreshold + '°' + tempUnitDisplay + '.';
        } else {
            tempAdviceDisplay.innerHTML = ''; // Clear the message if the temperature is above the threshold
        }
    }

    // Listen for input changes and update values
    resinVolumeInput.addEventListener('input', updateMekpValues);
    volumeUnitSelect.addEventListener('change', updateMekpValues);
    ambientTempInput.addEventListener('input', updateMekpValues);
    tempUnitSelect.addEventListener('change', updateMekpValues);
    usingDuratecCheckbox.addEventListener('change', updateMekpValues);
    makeItHotCheckbox.addEventListener('change', updateMekpValues);
    makeItHottestCheckbox.addEventListener('change', updateMekpValues);

    // Initial update
    updateMekpValues();

    function convertVolumeToOunces(volume, unit) {
        switch (unit) {
            case 'ccs':
                return volume * 0.033814; // 1 CC = 0.033814 ounces
            case 'quarts':
                return volume * 32; // 1 Quart = 32 ounces
            case 'gallons':
                return volume * 128; // 1 Gallon = 128 ounces
            case 'liters':
                return volume * 33.814; // 1 Liter = 33.814 ounces
            default:
                return volume; // Already in ounces
        }
    }

    function convertTempToFahrenheit(temp, unit) {
        if (unit === 'celsius') {
            return (temp * 9 / 5) + 32;
        }
        return temp; // Already in Fahrenheit
    }

    function convertFahrenheitToCelsius(temp) {
        return (temp - 32) * 5 / 9;
    }

    function calculateMekp(volume, temp, usingDuratec, makeItHot, makeItHottest) {
        var basePercentage = usingDuratec ? 2 : 1; // Base percentage is 2% when Using Duratec is checked
        if (temp < 70) {
            basePercentage += 0.5; // Increase for temperatures below 70°F
        }
        if (temp > 70) {
            basePercentage -= 0.25; // Decrease for temperatures above 70°F
        }
        if (makeItHot) {
            basePercentage += 0.5;
        }
        if (makeItHottest) {
            basePercentage += 1;
        }

        // Ensure MEKP percentage is within the specified range
        basePercentage = Math.max(0.75, Math.min(basePercentage, 3));

        var ccs = (basePercentage / 100) * volume * 29.5735; // Convert percentage to CCs
        var drops = ccs * 20; // Approximate conversion of 1 CC to 20 drops

        return { percentage: basePercentage, ccs: ccs, drops: drops };
    }
});
