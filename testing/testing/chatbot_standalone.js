// ChemCalc Chatbot - Standalone Version
// Works without backend API by using YouTube Data API directly

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        MAX_VIDEOS: 5,
        MAX_PRODUCTS: 5
    };

    // State management
    let chatHistory = [];
    let isProcessing = false;
    let affiliateLinksData = null;

    // Initialize chatbot
    function initChatbot() {
        injectChatbotHTML();
        attachEventListeners();
        loadAffiliateLinks();
    }

    // Inject chatbot HTML into page
    function injectChatbotHTML() {
        const chatbotHTML = `
            <div id="chemcalc-chatbot">
                <button id="chatbot-toggle" class="chatbot-toggle" aria-label="Toggle chatbot">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                </button>
                <div id="chatbot-window" class="chatbot-window" style="display: none;">
                    <div class="chatbot-header">
                        <h3>Boat Repair Assistant</h3>
                        <button id="chatbot-close" class="chatbot-close" aria-label="Close chatbot">&times;</button>
                    </div>
                    <div id="chatbot-messages" class="chatbot-messages">
                        <div class="chatbot-message bot-message">
                            <p>Hi! I'm your boat repair assistant. I can help you:</p>
                            <ul>
                                <li>Find YouTube tutorial videos for boat repairs</li>
                                <li>Recommend products from our affiliate partners</li>
                            </ul>
                            <p>What boat repair topic are you interested in?</p>
                        </div>
                    </div>
                    <div class="chatbot-input-area">
                        <input type="text" id="chatbot-input" class="chatbot-input" placeholder="Ask about boat repair..." />
                        <button id="chatbot-send" class="chatbot-send" aria-label="Send message">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', chatbotHTML);
    }

    // Attach event listeners
    function attachEventListeners() {
        const toggleBtn = document.getElementById('chatbot-toggle');
        const closeBtn = document.getElementById('chatbot-close');
        const sendBtn = document.getElementById('chatbot-send');
        const input = document.getElementById('chatbot-input');

        toggleBtn.addEventListener('click', toggleChatbot);
        closeBtn.addEventListener('click', closeChatbot);
        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !isProcessing) {
                sendMessage();
            }
        });
    }

    // Toggle chatbot window
    function toggleChatbot() {
        const window = document.getElementById('chatbot-window');
        const isVisible = window.style.display !== 'none';
        window.style.display = isVisible ? 'none' : 'flex';
        if (!isVisible) {
            document.getElementById('chatbot-input').focus();
        }
    }

    // Close chatbot window
    function closeChatbot() {
        document.getElementById('chatbot-window').style.display = 'none';
    }

    // Load affiliate links data
    async function loadAffiliateLinks() {
        try {
            const response = await fetch('/affiliate_links.js');
            const text = await response.text();
            // Extract the object from the JS file
            const match = text.match(/const\s+affiliateLinks\s*=\s*({[\s\S]*?});/);
            if (match) {
                affiliateLinksData = eval('(' + match[1] + ')');
                console.log('Loaded affiliate links:', Object.keys(affiliateLinksData).length);
            }
        } catch (error) {
            console.error('Failed to load affiliate links:', error);
        }
    }

    // Send message
    async function sendMessage() {
        if (isProcessing) return;

        const input = document.getElementById('chatbot-input');
        const message = input.value.trim();
        
        if (!message) return;

        // Add user message to chat
        addMessage(message, 'user');
        input.value = '';
        isProcessing = true;

        // Show typing indicator
        const typingId = addTypingIndicator();

        try {
            // Process the query
            const response = await processQuery(message);
            removeTypingIndicator(typingId);
            
            // Add bot response
            addBotResponse(response);
        } catch (error) {
            removeTypingIndicator(typingId);
            addMessage('Sorry, I encountered an error. Please try again.', 'bot');
            console.error('Chatbot error:', error);
        } finally {
            isProcessing = false;
        }
    }

    // Process user query
    async function processQuery(query) {
        // Search YouTube
        const videos = await searchYouTube(query);
        
        // Find relevant products
        const products = findRelevantProducts(query);
        
        // Generate response text
        let text = `Here's what I found for "${query}":\n\n`;
        
        if (videos.length === 0 && products.length === 0) {
            text = `I'm searching for resources about "${query}". Let me find some helpful information for you.`;
        }

        return { text, videos, products };
    }

    // Search YouTube using Manus API
    async function searchYouTube(query) {
        try {
            const searchQuery = `boat repair ${query}`;
            
            // Use Python script to call YouTube API
            const response = await fetch('/api/youtube-search?q=' + encodeURIComponent(searchQuery) + '&maxResults=' + CONFIG.MAX_VIDEOS);
            
            if (!response.ok) {
                console.error('YouTube API error:', response.status);
                return [];
            }

            const data = await response.json();
            return data.videos || [];
        } catch (error) {
            console.error('YouTube search error:', error);
            return [];
        }
    }

    // Find relevant products from affiliate links
    function findRelevantProducts(query) {
        if (!affiliateLinksData) {
            console.log('No affiliate links data loaded');
            return [];
        }

        const queryLower = query.toLowerCase();
        const keywords = queryLower.split(/\s+/);
        const products = [];

        // Search through affiliate links
        for (const [key, product] of Object.entries(affiliateLinksData)) {
            const productName = product.name.toLowerCase();
            const productKey = key.toLowerCase();
            
            // Check if any keyword matches
            let relevance = 0;
            keywords.forEach(keyword => {
                if (keyword.length < 3) return; // Skip short words
                if (productName.includes(keyword)) relevance += 2;
                if (productKey.includes(keyword)) relevance += 1;
            });

            if (relevance > 0) {
                products.push({
                    name: product.name,
                    url: product.url,
                    relevance: relevance
                });
            }
        }

        // Sort by relevance and return top matches
        return products
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, CONFIG.MAX_PRODUCTS);
    }

    // Add bot response with videos and products
    function addBotResponse(response) {
        const messagesContainer = document.getElementById('chatbot-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chatbot-message bot-message';

        let html = `<p>${escapeHtml(response.text)}</p>`;

        // Add videos if present
        if (response.videos && response.videos.length > 0) {
            html += '<div class="chatbot-section-title">📺 Video Tutorials:</div>';
            html += '<div class="chatbot-videos">';
            response.videos.forEach(video => {
                html += `
                    <div class="chatbot-video-item">
                        <a href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer">
                            <img src="${escapeHtml(video.thumbnail)}" alt="${escapeHtml(video.title)}" loading="lazy" />
                            <div class="video-info">
                                <div class="video-title">${escapeHtml(video.title)}</div>
                                ${video.publishedTime ? `<div class="video-meta">${escapeHtml(video.publishedTime)}</div>` : ''}
                            </div>
                        </a>
                    </div>
                `;
            });
            html += '</div>';
        }

        // Add products if present
        if (response.products && response.products.length > 0) {
            html += '<div class="chatbot-section-title">🛠️ Recommended Products:</div>';
            html += '<div class="chatbot-products">';
            response.products.forEach(product => {
                html += `
                    <div class="chatbot-product-item">
                        <a href="${escapeHtml(product.url)}" target="_blank" rel="noopener noreferrer">
                            ${escapeHtml(product.name)}
                        </a>
                    </div>
                `;
            });
            html += '</div>';
        }

        messageDiv.innerHTML = html;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Add message to chat
    function addMessage(text, sender) {
        const messagesContainer = document.getElementById('chatbot-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chatbot-message ${sender}-message`;
        messageDiv.innerHTML = `<p>${escapeHtml(text)}</p>`;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Add typing indicator
    function addTypingIndicator() {
        const messagesContainer = document.getElementById('chatbot-messages');
        const typingDiv = document.createElement('div');
        const id = 'typing-' + Date.now();
        typingDiv.id = id;
        typingDiv.className = 'chatbot-message bot-message typing-indicator';
        typingDiv.innerHTML = '<span></span><span></span><span></span>';
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return id;
    }

    // Remove typing indicator
    function removeTypingIndicator(id) {
        const indicator = document.getElementById(id);
        if (indicator) {
            indicator.remove();
        }
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChatbot);
    } else {
        initChatbot();
    }
})();

