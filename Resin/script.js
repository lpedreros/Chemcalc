document.getElementById("calculateButton").addEventListener("click", function () {
    // Get user inputs
    const resinVolume = parseFloat(document.getElementById("resinVolume").value);
    const volumeUnits = document.getElementById("volumeUnits").value;
    const ambientTemperature = parseFloat(document.getElementById("ambientTemperature").value);
    const tempUnits = document.getElementById("tempUnits").value;
    const useDuratec = document.getElementById("duratecCheckbox").checked;
    const makeItHot = document.getElementById("makeItHotCheckbox").checked;
    const makeItTheHottest = document.getElementById("makeItTheHottestCheckbox").checked;

    // Calculate MEKp Percentage
    let mekpPercentage = 1;

    // Handle Duratec checkbox
    if (useDuratec) {
        mekpPercentage = 2;
    }

    // Handle Make it Hot and Make it the Hottest checkboxes
    if (makeItHot) {
        mekpPercentage += 0.5;
    } else if (makeItTheHottest) {
        mekpPercentage += 1;
    }

    // Handle temperature adjustments
    if (tempUnits === "C") {
        if (ambientTemperature < 10) {
            mekpPercentage -= 0.75;
        } else if (ambientTemperature > 30) {
            mekpPercentage -= 3;
        } else {
            mekpPercentage -= (ambientTemperature - 10) * 0.25;
        }
    } else {
        if (ambientTemperature < 50) {
            mekpPercentage -= 0.75;
        } else if (ambientTemperature > 122) {
            mekpPercentage -= 3;
        } else {
            mekpPercentage -= (ambientTemperature - 50) * 0.25;
        }
    }

    // Calculate MEKp CCs and Drops based on the selected volume units
    let mekpCCs = 0;
    let mekpDrops = 0;

    if (volumeUnits === "oz") {
        mekpCCs = resinVolume * mekpPercentage;
        mekpDrops = resinVolume * 7 * mekpPercentage;
    } else if (volumeUnits === "qt") {
        mekpCCs = resinVolume * 32 * mekpPercentage;
        mekpDrops = resinVolume * 7 * 32 * mekpPercentage;
    } else if (volumeUnits === "liters") {
        mekpCCs = resinVolume * 1000 * mekpPercentage;
        mekpDrops = resinVolume * 7 * 1000 * mekpPercentage;
    }

    // Get selected result units
    const resultUnits = document.getElementById("resultUnits").value;

    // Convert MEKp CCs and Drops based on the selected result units
    if (resultUnits === "cc") {
        mekpCCs = mekpCCs;
        mekpDrops = mekpDrops;
    } else if (resultUnits === "gal") {
        mekpCCs = mekpCCs / 1000;
        mekpDrops = mekpDrops / 1000;
    } else if (resultUnits === "liters") {
        mekpCCs = mekpCCs / 1000;
        mekpDrops = mekpDrops / 1000;
    }

    // Update the result display
    document.getElementById("resultMekpPercentage").textContent = mekpPercentage.toFixed(2) + "%";
    document.getElementById("resultMekpCCs").textContent = mekpCCs.toFixed(2);
    document.getElementById("resultMekpDrops").textContent = mekpDrops.toFixed(2);

    // Update the history list with the current date and time
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString();
    const formattedTime = currentDate.toLocaleTimeString();

    // Create a history item
    const historyItem = document.createElement("li");
    historyItem.textContent = `${formattedDate}, ${formattedTime} - Resin Volume: ${resinVolume} ${volumeUnits}, Ambient Temperature: ${ambientTemperature} ${tempUnits}, MEKp Percentage: ${mekpPercentage.toFixed(2)}%, MEKp CCs: ${mekpCCs.toFixed(2)}, MEKp Drops: ${mekpDrops.toFixed(2)}`;

    // Add the history item to the list
    const historyList = document.getElementById("historyList");
    historyList.appendChild(historyItem);
});
