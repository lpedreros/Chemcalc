// email-results.js
// Handles the "Email me these results" functionality across all calculators

async function sendResultsEmail(calculatorName, resultElementIds, recapBuilderName) {
    const emailInput = document.getElementById('captureEmailInput');
    const btn = document.getElementById('btnEmailResults');
    const msg = document.getElementById('emailResultsMsg');

    if (!emailInput || !btn || !msg) return;

    const email = emailInput.value.trim();
    if (!email || !email.includes('@')) {
        msg.textContent = "Please enter a valid email address.";
        msg.style.color = "#e74c3c";
        msg.style.display = "block";
        return;
    }

    // Optional batch-input recap, prepended ahead of the computed results
    // below. recapBuilderName is a global function name (not a function
    // reference -- this call is assembled into an inline onclick string
    // by injectEmailCaptureUI, so it has to stay JSON-serializable) that
    // the calling page supplies. It's looked up and called HERE, at send
    // time, so it reads whatever the real inputs say right now -- not
    // whatever they said back when injectEmailCaptureUI ran at page load.
    // Pages that don't pass a third argument keep the exact old behavior.
    let recapHtml = '';
    if (recapBuilderName && typeof window[recapBuilderName] === 'function') {
        try {
            const recapPairs = window[recapBuilderName]() || [];
            recapPairs.forEach(pair => {
                if (pair && pair.label && pair.value) {
                    recapHtml += `<p style="margin-bottom: 6px; font-size: 14px; color: #555555;"><strong>${pair.label}:</strong> ${pair.value}</p>`;
                }
            });
        } catch (err) {
            console.error('Recap builder (' + recapBuilderName + ') failed:', err);
        }
    }

    // Gather results HTML
    let resultsHtml = '';
    resultElementIds.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.style.display !== 'none') {
            resultsHtml += `<p style="margin-bottom: 10px; font-size: 16px;">${el.innerHTML}</p>`;
        }
    });

    if (!resultsHtml) {
        msg.textContent = "No results to send yet. Please calculate first.";
        msg.style.color = "#e74c3c";
        msg.style.display = "block";
        return;
    }

    // UI Loading state
    const originalBtnText = btn.innerHTML;
    btn.innerHTML = "Sending...";
    btn.disabled = true;
    msg.style.display = "none";

    try {
        if (typeof _sb === 'undefined' || !_sb) {
            throw new Error("Supabase client not loaded.");
        }

        const { data, error } = await _sb.functions.invoke('send-results', {
            body: {
                email: email,
                calculatorName: calculatorName,
                resultsHtml: recapHtml + resultsHtml,
                sourceUrl: window.location.href
            }
        });

        if (error) throw error;

        msg.textContent = "Results sent! Check your inbox.";
        msg.style.color = "#2ecc71";
        msg.style.display = "block";
        emailInput.value = ""; // clear input

        // Mark this session as having captured an email in analytics
        if (typeof markEmailCaptured === 'function') {
          markEmailCaptured();
        }

        // Log this settled answer immediately (skips the debounce).
        // NOTE: window._ccLastCalc.calculator is the tracker's own
        // identifier (e.g. 'mekp') set by the calculator script alongside
        // its logCalculation() call -- NOT this function's own
        // calculatorName parameter above, which is just the display
        // string used for the email subject (e.g. "MEKP Catalyst").
        if (window._ccLastCalc && typeof logCalculation === 'function') {
          logCalculation(window._ccLastCalc.calculator, window._ccLastCalc.inputs, window._ccLastCalc.results, true);
        }

    } catch (err) {
        console.error("Error sending email:", err);
        msg.textContent = "Failed to send. Please try again.";
        msg.style.color = "#e74c3c";
        msg.style.display = "block";
    } finally {
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
    }
}

// Helper to inject the UI into a container. recapBuilderName is optional:
// the name of a global function (defined on the calling page) that
// returns an array of {label, value} pairs assembled from that page's
// own real inputs -- see sendResultsEmail() above for how/when it's
// called. Omit it and behavior is unchanged from before this existed.
function injectEmailCaptureUI(containerId, calculatorName, resultElementIdsArray, recapBuilderName) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const recapArg = recapBuilderName ? `, '${recapBuilderName}'` : '';

    const html = `
        <div class="email-capture-box mt-4 p-3" style="background-color: #f8f9fa; border-radius: 5px; border: 1px solid #e9ecef;">
            <h6 style="margin-bottom: 10px; color: #2c3e50;">Save Your Results</h6>
            <p style="font-size: 0.85rem; color: #7f8c8d; margin-bottom: 10px;">Enter your email to get a copy of these results and helpful marine repair tips.</p>
            <div class="input-group mb-2">
                <input type="email" id="captureEmailInput" class="form-control" placeholder="your@email.com">
                <div class="input-group-append">
                    <button class="btn btn-primary" id="btnEmailResults" onclick="sendResultsEmail('${calculatorName}', ${JSON.stringify(resultElementIdsArray).replace(/"/g, "'")}${recapArg})">Email Me</button>
                </div>
            </div>
            <div id="emailResultsMsg" style="display:none; font-size: 0.85rem; margin-top: 5px;"></div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}
