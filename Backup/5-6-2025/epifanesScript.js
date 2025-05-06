/* epifanesScript.js - Calculates mix ratios for Epifanes Polyurethane (2:1) and displays affiliate links */

document.addEventListener("DOMContentLoaded", () => {
  const totalVolumeInput = document.getElementById("totalVolume");
  const volumeUnitSelect = document.getElementById("volumeUnit");
  const resultBaseDisplay = document.getElementById("resultBase");
  const resultHardenerDisplay = document.getElementById("resultHardener");
  const resultThinnerDisplay = document.getElementById("resultThinner");
  const affiliateLinksList = document.getElementById("affiliateLinksList"); // Added for affiliate links

  // Conversion factors TO ccs (mL)
  const toCcs = {
    ccs: 1,
    ounces: 29.5735,
    liters: 1000,
    quarts: 946.353,
    gallons: 3785.41,
  };

  // Conversion factors FROM ccs (mL)
  const fromCcs = {
    ccs: 1,
    ounces: 1 / 29.5735,
    liters: 1 / 1000,
    quarts: 1 / 946.353,
    gallons: 1 / 3785.41,
  };

  function formatNumber(number) {
    // Avoid formatting if input is invalid
    if (isNaN(number) || number === null) {
        return "--";
    }
    // Show more precision for smaller units like oz and ccs
    const unit = volumeUnitSelect.value;
    const fractionDigits = (unit === "ounces" || unit === "ccs") ? 1 : 2;
    return number.toLocaleString("en-US", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  }

  /* --- Affiliate Link Display Logic --- */
  function displayAffiliateLinks() {
    if (!affiliateLinksList || typeof affiliateLinksData === "undefined") {
      console.error("Affiliate links container or data not found.");
      return;
    }

    affiliateLinksList.innerHTML = ""; // Clear previous links
    const linksToShowKeys = new Set();

    // Add General Supplies (Epifanes specific links not found in affiliate_links.js)
    if (affiliateLinksData["latex_gloves"]) linksToShowKeys.add("latex_gloves");
    if (affiliateLinksData["mixing_sticks"]) linksToShowKeys.add("mixing_sticks");
    if (affiliateLinksData["disposable_paper_cups"]) linksToShowKeys.add("disposable_paper_cups");
    if (affiliateLinksData["foam_rollers"]) linksToShowKeys.add("foam_rollers"); // Often used for varnish/paint
    if (affiliateLinksData["chip_brushes"]) linksToShowKeys.add("chip_brushes");
    if (affiliateLinksData["blue_tape"]) linksToShowKeys.add("blue_tape");
    if (affiliateLinksData["rags"]) linksToShowKeys.add("rags");

    // Render the links
    if (linksToShowKeys.size > 0) {
      linksToShowKeys.forEach((key) => {
        const linkData = affiliateLinksData[key];
        if (linkData) {
          const li = document.createElement("li");
          const a = document.createElement("a");
          a.href = linkData.url;
          a.textContent = linkData.name;
          a.target = "_blank";
          a.rel = "noopener noreferrer sponsored";
          li.appendChild(a);
          affiliateLinksList.appendChild(li);
        }
      });
    } else {
      affiliateLinksList.innerHTML = "<li>No relevant products found. Check Kits page.</li>";
    }
  }

  function calculateEpifanes() {
    const totalVolumeValue = parseFloat(totalVolumeInput.value) || 0;
    const unit = volumeUnitSelect.value;

    if (totalVolumeValue <= 0) {
      resultBaseDisplay.textContent = "Component A (Base): --";
      resultHardenerDisplay.textContent = "Component B (Hardener): --";
      if (affiliateLinksList) affiliateLinksList.innerHTML = ""; // Clear links if input is invalid
      return;
    }

    // Convert total desired volume to ccs
    const totalVolumeCcs = totalVolumeValue * (toCcs[unit] || 0);

    if (totalVolumeCcs <= 0) {
        resultBaseDisplay.textContent = "Component A (Base): Error";
        resultHardenerDisplay.textContent = "Component B (Hardener): Error";
        if (affiliateLinksList) affiliateLinksList.innerHTML = "";
        return;
    }

    // Epifanes Polyurethane is 2:1 by volume (Base:Hardener)
    const baseVolumeCcs = totalVolumeCcs * (2 / 3);
    const hardenerVolumeCcs = totalVolumeCcs * (1 / 3);

    // Convert back to the selected output unit
    const baseVolumeOutput = baseVolumeCcs * (fromCcs[unit] || 0);
    const hardenerVolumeOutput = hardenerVolumeCcs * (fromCcs[unit] || 0);

    // Display results
    resultBaseDisplay.innerHTML = `Component A (Base): <strong>${formatNumber(baseVolumeOutput)} ${unit}</strong>`;
    resultHardenerDisplay.innerHTML = `Component B (Hardener): <strong>${formatNumber(hardenerVolumeOutput)} ${unit}</strong>`;
    resultThinnerDisplay.textContent = "Thinner (Optional): Use Epifanes Polyurethane Thinner (Brush or Spray) as needed, typically 0-5% for brushing, 5-15% for spraying. Refer to TDS.";

    // Update affiliate links
    displayAffiliateLinks();
  }

  // Add event listeners
  totalVolumeInput.addEventListener("input", calculateEpifanes);
  volumeUnitSelect.addEventListener("change", calculateEpifanes);

  // Initial calculation on page load
  calculateEpifanes();
});




  // --- Print Functionality ---
  const printButton = document.getElementById("printButton");
  const qrCodeContainer = document.getElementById("printQrCode");

  if (printButton && qrCodeContainer && typeof QRCode !== "undefined") {
    printButton.addEventListener("click", (event) => { // Add event parameter
      event.preventDefault(); // Prevent default button behavior (form submission)
      const pageUrl = window.location.href;
      qrCodeContainer.innerHTML = ""; // Clear previous QR code
      new QRCode(qrCodeContainer, {
        text: pageUrl,
        width: 100, // Base size, CSS handles print enlargement
        height: 100,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
      });

      // Timeout to allow QR code rendering before print dialog
      setTimeout(() => {
          window.print();
      }, 250); // Adjust delay if needed
    });
  } else {
      if (!printButton) console.error("Print button not found");
      if (!qrCodeContainer) console.error("QR code container not found");
      if (typeof QRCode === "undefined") console.error("QRCode library not loaded");
  }

