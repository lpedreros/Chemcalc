/* epifanesScript.js - v2.1 (Ensures related products are always visible and mixing results update) */

document.addEventListener("DOMContentLoaded", () => {
  const totalVolumeInput = document.getElementById("totalVolume");
  const volumeUnitSelect = document.getElementById("volumeUnit");
  const resultBaseDisplay = document.getElementById("resultBase");
  const resultHardenerDisplay = document.getElementById("resultHardener");
  const resultThinnerDisplay = document.getElementById("resultThinner");
  const affiliateLinksList = document.getElementById("affiliateLinksList");
  const affiliateLinksContainer = document.getElementById("affiliateLinksContainer");

  // Check if essential elements exist
  if (!totalVolumeInput || !volumeUnitSelect || !resultBaseDisplay || !resultHardenerDisplay || !affiliateLinksList || !affiliateLinksContainer) {
    console.error("One or more essential DOM elements for the Epifanes calculator are missing. Functionality may be impaired.");
    if (affiliateLinksContainer) affiliateLinksContainer.style.display = "none";
    return; 
  }

  const toCcs = {
    ccs: 1,
    ounces: 29.5735,
    liters: 1000,
    quarts: 946.353,
    gallons: 3785.41,
  };

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
    let fractionDigits = 2; 
    if (unit === "ounces" || unit === "ccs") {
        fractionDigits = 1;
    }
    return number.toLocaleString("en-US", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  }

  function displayAffiliateLinks() {
    if (typeof affiliateLinksData === "undefined") {
      console.error("Affiliate links data (affiliateLinksData) not found. Ensure affiliate_links.js is loaded correctly before this script.");
      if (affiliateLinksContainer) affiliateLinksContainer.style.display = "none";
      return;
    }

    affiliateLinksList.innerHTML = ""; 
    const linksToShowKeys = new Set();

    linksToShowKeys.add("latex_gloves");
    linksToShowKeys.add("mixing_sticks_reusable");
    linksToShowKeys.add("disposable_paper_cups_125pack");
    linksToShowKeys.add("foam_rollers_6inch_20pack");
    linksToShowKeys.add("chip_brushes_2inch_36pack");
    linksToShowKeys.add("blue_tape_1inch_6pack");
    linksToShowKeys.add("rags");
    linksToShowKeys.add("3m_full_face_respirator_medium_model_6800_filter_kit_linked_below");
    linksToShowKeys.add("denatured_alcohol_1gallon");

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
          console.warn(`Affiliate link key "${key}" not found in affiliateLinksData or data is incomplete.`);
      }
    });

    if (hasDisplayedLinks) {
      affiliateLinksContainer.style.display = "block";
    } else {
      affiliateLinksList.innerHTML = "<li>No specific products found. Check Kits page.</li>";
      affiliateLinksContainer.style.display = "block"; 
    }
  }

  function calculateEpifanes() {
    const totalVolumeValue = parseFloat(totalVolumeInput.value) || 0;
    const unit = volumeUnitSelect.value;

    if (totalVolumeValue <= 0) {
      resultBaseDisplay.textContent = "Component A (Base): --";
      resultHardenerDisplay.textContent = "Component B (Hardener): --";
      return;
    }

    const totalVolumeCcs = totalVolumeValue * (toCcs[unit] || 0);

    if (totalVolumeCcs <= 0) {
        resultBaseDisplay.textContent = "Component A (Base): Error";
        resultHardenerDisplay.textContent = "Component B (Hardener): Error";
        return;
    }

    const baseVolumeCcs = totalVolumeCcs * (2 / 3);
    const hardenerVolumeCcs = totalVolumeCcs * (1 / 3);

    const baseVolumeOutput = baseVolumeCcs * (fromCcs[unit] || 0);
    const hardenerVolumeOutput = hardenerVolumeCcs * (fromCcs[unit] || 0);

    resultBaseDisplay.innerHTML = `Component A (Base): <strong>${formatNumber(baseVolumeOutput)} ${unit}</strong>`;
    resultHardenerDisplay.innerHTML = `Component B (Hardener): <strong>${formatNumber(hardenerVolumeOutput)} ${unit}</strong>`;
    
    if (resultThinnerDisplay) { 
        resultThinnerDisplay.textContent = "Thinner (Optional): Use Epifanes Polyurethane Thinner (Brush or Spray) as needed, typically 0-5% for brushing, 5-15% for spraying. Refer to TDS.";
    }
  }

  totalVolumeInput.addEventListener("input", calculateEpifanes);
  volumeUnitSelect.addEventListener("change", calculateEpifanes);

  const printButton = document.getElementById("printButton");
  const qrCodeContainer = document.getElementById("printQrCode");

  if (printButton && qrCodeContainer) {
    if (typeof QRCode !== "undefined") {
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
        console.error("QRCode library not loaded, print QR functionality disabled.");
        if(printButton) printButton.style.display = 'none';
    }
  } else {
      if (!printButton) console.warn("Print button not found.");
      if (!qrCodeContainer) console.warn("QR code container for print not found.");
  }

  calculateEpifanes();
  displayAffiliateLinks();
});

