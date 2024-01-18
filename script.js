document.addEventListener('DOMContentLoaded', function () {
  // Initialize history array
  const history = [];

  // Track the number of digits entered for temperature
  let temperatureDigitsEntered = 0;

  // Function to update calculated values and history
  function updateValues() {
    // Get user inputs
    const duratecCheckbox = document.getElementById('duratecCheckbox').checked;
    const resinVolumeInput = parseFloat(document.getElementById('resinVolume').value);
    const ambientTemperatureInput = document.getElementById('ambientTemperature').value;
    const tempUnits = document.getElementById('tempUnits').value;
    const makeItHotCheckbox = document.getElementById('makeItHotCheckbox').checked;
    const makeItTheHottestCheckbox = document.getElementById('makeItTheHottestCheckbox').checked;

    // Validate resin volume input
    if (isNaN(resinVolumeInput) || resinVolumeInput < 0.1 || resinVolumeInput > 5000) {
      alert('Please enter a valid resin volume between 0.1 and 5000.');
      return;
    }

    // Check if ambient temperature is out of range
    if (temperatureDigitsEntered >= 2 && (!isNaN(ambientTemperatureInput) && (ambientTemperatureInput < 50 || ambientTemperatureInput > 105))) {
      alert('Ambient temperature should be between 50°F and 105°F.');
      return;
    }

    // Check if ambient temperature is not a valid number
    if (temperatureDigitsEntered >= 2 && isNaN(ambientTemperatureInput) && ambientTemperatureInput !== '') {
      alert('Please enter a valid ambient temperature.');
      return;
    }

    // Conversion factors
    const gallonToCC = 3785.41178;
    const quartToCC = 946.352945;
    const ounceToCC = 29.5735;
    const dropToCC = 0.05;

    // Convert volume to CCs
    let volumeInCCs;
    switch (document.getElementById('volumeUnits').value) {
      case 'oz':
        volumeInCCs = resinVolumeInput * ounceToCC;
        break;
      case 'qt':
        volumeInCCs = resinVolumeInput * quartToCC;
        break;
      case 'gal':
        volumeInCCs = resinVolumeInput * gallonToCC;
        break;
      case 'cc':
      default:
        volumeInCCs = resinVolumeInput;
    }

    // Convert temperature to Celsius
    const ambientTemperatureInC = tempUnits === 'F' ? (parseFloat(ambientTemperatureInput) - 32) * (5 / 9) : parseFloat(ambientTemperatureInput);

    // Base temperature is 70°F
    const baseTemperatureInC = 21.11; // 21.11°C is 70°F

    // Adjust for temperature changes from the base
    const temperatureChange = ambientTemperatureInC - baseTemperatureInC;

    // Increase base MEKp by 0.5% for every 10°F drop in temperature
    // Decrease base MEKp by 0.25% for every 10°F increase in temperature
    const temperatureAdjustment = (temperatureChange / 10) * (temperatureChange > 0 ? -0.25 : 0.5);

    // Base MEKp percentage at 70°F
    let mekpPercentage = duratecCheckbox ? 2 : 1.25;

    // Apply temperature adjustment
    mekpPercentage += temperatureAdjustment;

    // Apply additional adjustments
    if (makeItHotCheckbox) {
      mekpPercentage += 0.5;
    }

    if (makeItTheHottestCheckbox) {
      mekpPercentage += 1;
    }

    // Ensure MEKp percentage stays within limits
    mekpPercentage = Math.min(Math.max(mekpPercentage, 0.75), 3);

    // Calculate MEKp values
    const mekpCCs = volumeInCCs * (mekpPercentage / 100);
    const mekpDrops = mekpCCs / dropToCC;

    // Update UI elements with calculated values
    document.getElementById('recommendedPercentageValue').textContent = mekpPercentage.toFixed(2);
    document.getElementById('mekpCCsValue').textContent = mekpCCs.toFixed(2);
    document.getElementById('mekpDropsValue').textContent = mekpDrops.toFixed(Number.isInteger(mekpDrops) ? 0 : 2); // Adjusted for trailing zero

    // Add entry to history only if both inputs are provided
    if (!isNaN(ambientTemperatureInput) && temperatureDigitsEntered >= 2) {
      const historyEntry = {
        date: new Date().toLocaleString(),
        temperature: ambientTemperatureInput,
        volume: resinVolumeInput,
        volumeUnits: document.getElementById('volumeUnits').value,
        mekpPercentage: mekpPercentage.toFixed(2),
        mekpCCs: mekpCCs.toFixed(2),
        mekpDrops: mekpDrops.toFixed(Number.isInteger(mekpDrops) ? 0 : 2), // Adjusted for trailing zero
      };

      // Add entry to history array
      history.unshift(historyEntry);

      // Limit history to 5 entries
      if (history.length > 5) {
        history.pop();
      }

      // Update and display history
      updateHistory();
    }
  }

  // Function to update and display history
  function updateHistory() {
    const historyList = document.getElementById('historyList');

    // Clear previous history
    historyList.innerHTML = '';

    // Display history entries
    history.forEach(entry => {
      const listItem = document.createElement('li');
      listItem.textContent = `${entry.date} - Temperature: ${entry.temperature}°, Volume: ${entry.volume} ${entry.volumeUnits}, MEKp Percentage: ${entry.mekpPercentage}, MEKp CCs: ${entry.mekpCCs}, MEKp Drops: ${entry.mekpDrops}`;
      historyList.appendChild(listItem);
    });
  }

  // Event listener for temperature input to track the number of digits entered
  document.getElementById('ambientTemperature').addEventListener('input', function () {
    temperatureDigitsEntered = this.value.replace(/\D/g, '').length;
  });

  // Event listeners for live updates
  document.getElementById('duratecCheckbox').addEventListener('change', updateValues);
  document.getElementById('resinVolume').addEventListener('input', updateValues);
  document.getElementById('volumeUnits').addEventListener('change', updateValues);
  document.getElementById('ambientTemperature').addEventListener('input', updateValues);
  document.getElementById('tempUnits').addEventListener('change', function () {
    // Update temperature input field on unit change
    updateValues();
  });
  document.getElementById('makeItHotCheckbox').addEventListener('change', updateValues);
  document.getElementById('makeItTheHottestCheckbox').addEventListener('change', updateValues);

  // Additional logic and event listeners can be added as needed
});
