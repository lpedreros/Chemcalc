document.addEventListener("DOMContentLoaded", () => {
    const feedbackButton = document.getElementById("feedbackBtn");

    if (feedbackButton) {
        feedbackButton.addEventListener("click", function() {
            let calculatorName = "Fiberglass Cloth Saturation Calculator"; // Default/Fallback name
            // Grabs the page's <h1> — the calculator name — regardless of which
            // Bootstrap utility classes it carries. Page markup isn't consistent:
            // awlgrip.html/epifanespoly.html use h1.text-center.mb-4, clothcalc.html
            // uses h1.text-center.my-4, and the redesigned mekpcalc.html uses its
            // own h1.mekp-hero-title with no Bootstrap utility classes at all.
            // The old selector ("h1.text-center.my-4") only matched by coincidence
            // on clothcalc.html and silently fell back to the hardcoded name above
            // on every other calculator page. Every calculator page has exactly one
            // <h1> — its title — so a bare "h1" selector works generically.
            const pageTitleElement = document.querySelector("h1"); // Targets the page's main calculator title
            if (pageTitleElement && pageTitleElement.textContent.trim()) {
                calculatorName = pageTitleElement.textContent.trim();
            }

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
});
