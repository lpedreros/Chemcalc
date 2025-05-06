/* epifanesScript.js - v2 (Updates affiliate link keys and product selection) */

document.addEventListener("DOMContentLoaded", () => {
  const totalVolumeInput = document.getElementById("totalVolume");
  const volumeUnitSelect = document.getElementById("volumeUnit");
  const resultBaseDisplay = document.getElementById("resultBase");
  const resultHardenerDisplay = document.getElementById("resultHardener");
  const resultThinnerDisplay = document.getElementById("resultThinner");
  const affiliateLinksList = document.getElementById("affiliateLinksList");
  const affiliateLinksContainer = document.getElementById("affiliateLinksContainer"); // Added for consistency

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
    if (isNaN(number) || number === null) {
        return "--";
    }
    const unit = volumeUnitSelect.value;
    const fractionDigits = (unit === "ounces" || unit === "ccs") ? 1 : 2;
    return number.toLocaleString("en-US", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  }

  function displayAffiliateLinks() {
    if (!affiliateLinksList || !affiliateLinksContainer || typeof affiliateLinksData === "undefined") {
      console.error("Affiliate links container or data not found.");
      if (affiliateLinksContainer) affiliateLinksContainer.style.display = "none";
      return;
    }

    affiliateLinksList.innerHTML = ""; 
    const linksToShowKeys = new Set();

    // Epifanes Polyurethane specific products are not in the provided affiliate_links.js
    // So, we will link to general painting/varnishing supplies.
    // Key names are based on the standardized keys from affiliate_links.js (140 products version)

    linksToShowKeys.add("latex_gloves");
    linksToShowKeys.add("mixing_sticks_reusable");
    linksToShowKeys.add("disposable_paper_cups_125pack");
    linksToShowKeys.add("foam_rollers_6inch_20pack"); // For varnish application
    linksToShowKeys.add("chip_brushes_2inch_36pack"); // For cutting in or small areas
    linksToShowKeys.add("blue_tape_1inch_6pack");
    linksToShowKeys.add("rags");
    linksToShowKeys.add("3m_full_face_respirator_medium_model_6800_filter_kit_linked_below"); // Good for solvent based paints
    linksToShowKeys.add("denatured_alcohol_1gallon"); // Often used for surface prep with polyurethanes

    if (linksToShowKeys.size > 0) {
      let hasDisplayedLinks = false;
      linksToShowKeys.forEach((key) => {
        const linkData = affiliateLinksData[key];
        if (linkData && linkData.url && linkData.name) {
          const li = document.createElement("li");
          const a = document.createElement("a");
          a.href = linkData.url;
          a.textContent = linkData.name;
          a.target = "_blank";
          a.rel = "noopener noreferrer sponsored";
          li.appendChild(a);
          affiliateLinksList.appendChild(li);
          hasDisplayedLinks = true;
        } else {
            console.warn(`Attempted to render link for key but not found in affiliateLinksData: ${key}`);
        }
      });
      if (hasDisplayedLinks) {
        if (affiliateLinksContainer) affiliateLinksContainer.style.display = "block";
      } else {
        affiliateLinksList.innerHTML = "<li>No specific products found. Check Kits page.</li>";
        if (affiliateLinksContainer) affiliateLinksContainer.style.display = "block"; 
      }
    } else {
      affiliateLinksList.innerHTML = "<li>No specific products found. Check Kits page.</li>";
      if (affiliateLinksContainer) affiliateLinksContainer.style.display = "block"; 
    }
  }

  function calculateEpifanes() {
    const totalVolumeValue = parseFloat(totalVolumeInput.value) || 0;
    const unit = volumeUnitSelect.value;

    if (totalVolumeValue <= 0) {
      resultBaseDisplay.textContent = "Component A (Base): --";
      resultHardenerDisplay.textContent = "Component B (Hardener): --";
      if (affiliateLinksList) affiliateLinksList.innerHTML = "";
      if (affiliateLinksContainer) affiliateLinksContainer.style.display = "none";
      return;
    }

    const totalVolumeCcs = totalVolumeValue * (toCcs[unit] || 0);

    if (totalVolumeCcs <= 0) {
        resultBaseDisplay.textContent = "Component A (Base): Error";
        resultHardenerDisplay.textContent = "Component B (Hardener): Error";
        if (affiliateLinksList) affiliateLinksList.innerHTML = "";
        if (affiliateLinksContainer) affiliateLinksContainer.style.display = "none";
        return;
    }

    const baseVolumeCcs = totalVolumeCcs * (2 / 3);
    const hardenerVolumeCcs = totalVolumeCcs * (1 / 3);

    const baseVolumeOutput = baseVolumeCcs * (fromCcs[unit] || 0);
    const hardenerVolumeOutput = hardenerVolumeCcs * (fromCcs[unit] || 0);

    resultBaseDisplay.innerHTML = `Component A (Base): <strong>${formatNumber(baseVolumeOutput)} ${unit}</strong>`;
    resultHardenerDisplay.innerHTML = `Component B (Hardener): <strong>${formatNumber(hardenerVolumeOutput)} ${unit}</strong>`;
    resultThinnerDisplay.textContent = "Thinner (Optional): Use Epifanes Polyurethane Thinner (Brush or Spray) as needed, typically 0-5% for brushing, 5-15% for spraying. Refer to TDS.";

    displayAffiliateLinks();
  }

  totalVolumeInput.addEventListener("input", calculateEpifanes);
  volumeUnitSelect.addEventListener("change", calculateEpifanes);

  // --- Print Functionality ---
  const printButton = document.getElementById("printButton");
  const qrCodeContainer = document.getElementById("printQrCode");

  if (printButton && qrCodeContainer && typeof QRCode !== "undefined") {
    printButton.addEventListener("click", (event) => { 
      event.preventDefault(); 
      const pageUrl = window.location.href;
      qrCodeContainer.innerHTML = ""; 
      new QRCode(qrCodeContainer, {
        text: pageUrl,
        width: 100, 
        height: 100,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
      });
      
      setTimeout(() => {
          window.print();
      }, 250); 
    });
  } else {
      if (!printButton) console.error("Print button not found");
      if (!qrCodeContainer) console.error("QR code container not found");
      if (typeof QRCode === "undefined") console.error("QRCode library not loaded");
  }

  calculateEpifanes(); 
});

