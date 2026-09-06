// email-results.js
// Handles the "Email me these results" functionality across all calculators

async function sendResultsEmail(calculatorName, resultElementIds) {
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
                resultsHtml: resultsHtml,
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

// Helper to inject the UI into a container
function injectEmailCaptureUI(containerId, calculatorName, resultElementIdsArray) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const html = `
        <div class="email-capture-box mt-4 p-3" style="background-color: #f8f9fa; border-radius: 5px; border: 1px solid #e9ecef;">
            <h6 style="margin-bottom: 10px; color: #2c3e50;">Save Your Results</h6>
            <p style="font-size: 0.85rem; color: #7f8c8d; margin-bottom: 10px;">Enter your email to get a copy of these results and helpful marine repair tips.</p>
            <div class="input-group mb-2">
                <input type="email" id="captureEmailInput" class="form-control" placeholder="your@email.com">
                <div class="input-group-append">
                    <button class="btn btn-primary" id="btnEmailResults" onclick="sendResultsEmail('${calculatorName}', ${JSON.stringify(resultElementIdsArray).replace(/"/g, "'")})">Email Me</button>
                </div>
            </div>
            <div id="emailResultsMsg" style="display:none; font-size: 0.85rem; margin-top: 5px;"></div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}
