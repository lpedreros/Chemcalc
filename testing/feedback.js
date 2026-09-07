// Grabs the page's <h1> — the calculator name — regardless of which
// Bootstrap utility classes it carries. Page markup isn't consistent:
// awlgrip.html/epifanespoly.html use h1.text-center.mb-4, clothcalc.html
// uses h1.text-center.my-4, and the redesigned mekpcalc.html uses its
// own h1.mekp-hero-title with no Bootstrap utility classes at all.
// The old selector ("h1.text-center.my-4") only matched by coincidence
// on clothcalc.html and silently fell back to the hardcoded name above
// on every other calculator page. Every calculator page has exactly one
// <h1> — its title — so a bare "h1" selector works generically.
function getCalculatorName() {
    let calculatorName = "Fiberglass Cloth Saturation Calculator"; // Default/Fallback name
    const pageTitleElement = document.querySelector("h1");
    if (pageTitleElement && pageTitleElement.textContent.trim()) {
        calculatorName = pageTitleElement.textContent.trim();
    }
    return calculatorName;
}

document.addEventListener("DOMContentLoaded", () => {
    const feedbackButton = document.getElementById("feedbackBtn");
    const feedbackModal = document.getElementById("feedbackModal");

    if (feedbackButton) {
        feedbackButton.addEventListener("click", function() {
            // Pages with a real #feedbackModal (currently mekpcalc.html only)
            // open it instead of falling back to mailto.
            if (feedbackModal) {
                const msg = document.getElementById("feedbackMsg");
                if (msg) { msg.style.display = "none"; }

                if (typeof window.openModal === 'function') {
                    openModal('feedbackModal');
                } else {
                    feedbackModal.style.display = 'flex';
                }
                return;
            }

            const calculatorName = getCalculatorName();

            const recipientEmail = "info@thinkandengage.com";
            const subject = `Calculator Feedback: ${calculatorName}`;
            const bodyTemplate = `Calculator Name: ${calculatorName}\n\n` +
                               `Feedback Type: [Bug Report / Feature Request / Other - Please specify]\n\n` +
                               `Browser/OS (if reporting a bug, e.g., Chrome on Windows 10):\n\n` +
                               `Description of Issue/Suggestion:\n` +
                               `------------------------------------------------------\n` +
                               `[Please provide as much detail as possible here]\n` +
                               `------------------------------------------------------\n`;

            const mailtoLink =
`mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyTemplate)}`;
            window.location.href = mailtoLink;
        });
    }

    const feedbackForm = document.getElementById("feedbackForm");
    if (feedbackForm) {
        feedbackForm.addEventListener("submit", async function(e) {
            e.preventDefault();

            const msg = document.getElementById("feedbackMsg");
            const btn = document.getElementById("feedbackSubmitBtn");
            const description = document.getElementById("feedbackDescription").value.trim();

            if (!description) {
                msg.textContent = "Please describe the issue or suggestion.";
                msg.style.color = "#e74c3c";
                msg.style.display = "block";
                return;
            }

            const calculatorName = getCalculatorName();
            const feedbackType = document.getElementById("feedbackType").value;
            const replyEmail = document.getElementById("feedbackReplyEmail").value.trim();
            const browserInfo = navigator.userAgent;
            const sourceUrl = window.location.href;

            const originalBtnText = btn.innerHTML;
            btn.innerHTML = "Sending...";
            btn.disabled = true;
            msg.style.display = "none";

            try {
                if (typeof _sb === 'undefined' || !_sb) {
                    throw new Error("Supabase client not loaded.");
                }

                const { data, error } = await _sb.functions.invoke('send-feedback', {
                    body: {
                        calculatorName: calculatorName,
                        feedbackType: feedbackType,
                        description: description,
                        browserInfo: browserInfo,
                        replyEmail: replyEmail,
                        sourceUrl: sourceUrl
                    }
                });

                if (error) throw error;

                msg.textContent = "Thanks — your feedback has been sent.";
                msg.style.color = "#2ecc71";
                msg.style.display = "block";
                feedbackForm.reset();

                setTimeout(function() {
                    closeModal('feedbackModal');
                    msg.style.display = "none";
                }, 1500);

            } catch (err) {
                console.error("Error sending feedback:", err);
                msg.textContent = (err && err.message) ? err.message : "Failed to send. Please try again.";
                msg.style.color = "#e74c3c";
                msg.style.display = "block";
            } finally {
                btn.innerHTML = originalBtnText;
                btn.disabled = false;
            }
        });
    }
});
