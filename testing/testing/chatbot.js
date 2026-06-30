// ChemCalc Chatbot - Final Working Version
// Boat repair assistant with YouTube search and product recommendations

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        MAX_VIDEOS: 5,
        MAX_PRODUCTS: 6
    };

    // State management
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
        input.addEventListener('keypress', function(e) {
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
            const match = text.match(/const\s+affiliateLinksData\s*=\s*({[\s\S]*?});?\s*$/);
            if (match) {
                affiliateLinksData = JSON.parse(match[1]);
                console.log('Loaded', Object.keys(affiliateLinksData).length, 'affiliate products');
            }
        } catch (error) {
            console.warn('Could not load affiliate links:', error);
        }
    }

    // Send message
    async function sendMessage() {
        if (isProcessing) return;

        const input = document.getElementById('chatbot-input');
        const message = input.value.trim();
        
        if (!message) return;

        addMessage(message, 'user');
        input.value = '';
        isProcessing = true;

        const typingId = addTypingIndicator();

        try {
            const response = await processQuery(message);
            removeTypingIndicator(typingId);
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
        const videos = generateYouTubeSearchResults(query);
        const products = findRelevantProducts(query);
        
        let text = 'Here\'s what I found for "' + query + '":';
        
        return { text: text, videos: videos, products: products };
    }

    // Generate YouTube search results
    function generateYouTubeSearchResults(query) {
        const searchQuery = 'boat repair ' + query;
        const youtubeSearchUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(searchQuery);
        
        return [{
            title: 'Search YouTube for "' + searchQuery + '"',
            url: youtubeSearchUrl,
            publishedTime: 'Click to search YouTube'
        }];
    }

    // Find relevant products from affiliate links
    function findRelevantProducts(query) {
        if (!affiliateLinksData) {
            console.log('No affiliate links loaded');
            return [];
        }

        const queryLower = query.toLowerCase();
        
        const keywords = queryLower
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(function(word) { return word.length >= 3; });
        
        const repairMappings = {
            'gelcoat': ['gel', 'coat', 'gelcoat', 'white', 'surface', 'finish'],
            'gel coat': ['gel', 'coat', 'gelcoat', 'white', 'surface', 'finish'],
            'spider crack': ['gel', 'coat', 'gelcoat', 'crack', 'repair'],
            'fiberglass': ['fiberglass', 'fiber', 'glass', 'cloth', 'mat', 'csm', 'biaxial'],
            'epoxy': ['epoxy', 'resin', 'hardener'],
            'resin': ['resin', 'polyester', 'epoxy'],
            'paint': ['paint', 'spray', 'gun', 'atomizing'],
            'bottom paint': ['paint', 'bottom', 'antifoul'],
            'sand': ['sandpaper', 'sanding', 'sand', 'grit'],
            'polish': ['polish', 'compound', 'buff', 'wax']
        };
        
        let expandedKeywords = keywords.slice();
        for (const key in repairMappings) {
            if (queryLower.indexOf(key) !== -1) {
                expandedKeywords = expandedKeywords.concat(repairMappings[key]);
            }
        }
        
        const uniqueKeywords = [];
        for (let i = 0; i < expandedKeywords.length; i++) {
            if (uniqueKeywords.indexOf(expandedKeywords[i]) === -1) {
                uniqueKeywords.push(expandedKeywords[i]);
            }
        }
        
        const products = [];

        for (const key in affiliateLinksData) {
            const product = affiliateLinksData[key];
            const productName = product.name.toLowerCase();
            const productKey = key.toLowerCase();
            
            let relevance = 0;
            
            for (let i = 0; i < uniqueKeywords.length; i++) {
                const keyword = uniqueKeywords[i];
                if (productName.indexOf(keyword) !== -1) relevance += 3;
                if (productKey.indexOf(keyword) !== -1) relevance += 2;
            }
            
            if (queryLower.length > 3 && productName.indexOf(queryLower) !== -1) {
                relevance += 10;
            }
            
            if (relevance > 0) {
                products.push({
                    name: product.name,
                    url: product.url,
                    relevance: relevance
                });
            }
        }

        products.sort(function(a, b) { return b.relevance - a.relevance; });
        const results = products.slice(0, CONFIG.MAX_PRODUCTS);
        
        console.log('Found', results.length, 'products for "' + query + '"');
        return results;
    }

    // Add bot response with videos and products
    function addBotResponse(response) {
        const messagesContainer = document.getElementById('chatbot-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chatbot-message bot-message';

        let html = '<p>' + escapeHtml(response.text) + '</p>';

        if (response.videos && response.videos.length > 0) {
            html += '<div class="chatbot-section-title">📺 Video Tutorials:</div>';
            html += '<div class="chatbot-videos">';
            for (let i = 0; i < response.videos.length; i++) {
                const video = response.videos[i];
                html += '<div class="chatbot-video-item">';
                html += '<a href="' + escapeHtml(video.url) + '" target="_blank" rel="noopener noreferrer" style="display: block; padding: 0.75rem;">';
                html += '<div class="video-title" style="font-weight: 500;">🎥 ' + escapeHtml(video.title) + '</div>';
                if (video.publishedTime) {
                    html += '<div class="video-meta">' + escapeHtml(video.publishedTime) + '</div>';
                }
                html += '</a>';
                html += '</div>';
            }
            html += '</div>';
        }

        if (response.products && response.products.length > 0) {
            html += '<div class="chatbot-section-title">🛠️ Recommended Products:</div>';
            html += '<div class="chatbot-products">';
            for (let i = 0; i < response.products.length; i++) {
                const product = response.products[i];
                html += '<div class="chatbot-product-item">';
                html += '<a href="' + escapeHtml(product.url) + '" target="_blank" rel="noopener noreferrer">';
                html += escapeHtml(product.name);
                html += '</a>';
                html += '</div>';
            }
            html += '</div>';
        }

        if ((!response.videos || response.videos.length === 0) && 
            (!response.products || response.products.length === 0)) {
            html += '<p>I couldn\'t find specific resources for that query. Try asking about: gelcoat repair, fiberglass work, epoxy application, or boat painting.</p>';
        }

        messageDiv.innerHTML = html;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Add message to chat
    function addMessage(text, sender) {
        const messagesContainer = document.getElementById('chatbot-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chatbot-message ' + sender + '-message';
        messageDiv.innerHTML = '<p>' + escapeHtml(text) + '</p>';
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
        if (indicator) indicator.remove();
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

