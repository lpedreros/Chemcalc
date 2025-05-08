document.addEventListener("DOMContentLoaded", () => {
    const feedbackButton = document.getElementById("feedbackBtn");

    if (feedbackButton) {
        feedbackButton.addEventListener("click", function() {
            let calculatorName = "Fiberglass Cloth Saturation Calculator"; // Default/Fallback name
            const pageTitleElement = document.querySelector("h1.text-center.my-4"); // Targets your main calculator title
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
