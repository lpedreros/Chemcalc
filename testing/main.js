document.addEventListener("DOMContentLoaded", function() {
    const productListContainer = document.getElementById("product-list-container");
    const filterButtonsContainer = document.getElementById("filter-buttons");
    const searchInput = document.getElementById("search-input");

    // Mobile menu toggle: bound by Library/global-scripts.lbi (guarded by a
    // data-bound check to avoid double-binding). A second, unguarded copy
    // used to live here too -- with both listeners firing on the same
    // click, classList.toggle('active') ran twice and canceled itself out,
    // so the mobile nav never actually opened. Removed rather than fixed
    // in place since global-scripts.lbi's copy already covers this
    // correctly and sitewide (Phase 0 fix while rebuilding the header --
    // see Library/nav.lbi).

    // Escape HTML to prevent XSS
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Function to fetch product list from Supabase affiliate_materials table
    async function loadProductList() {
        if (typeof _sb !== 'undefined' && _sb !== null) {
            try {
                const { data, error } = await _sb
                    .from('affiliate_materials')
                    .select('id, name, url, section, tags, is_favorite')
                    .order('section', { ascending: true })
                    .order('name', { ascending: true });

                if (error) {
                    console.warn("Supabase fetch error, falling back to static HTML:", error.message);
                    await loadFallbackProductList();
                    return;
                }

                if (data && data.length > 0) {
                    renderProductsFromData(data);
                    return;
                }
            } catch (err) {
                console.warn("Exception during Supabase fetch, falling back to static HTML:", err);
                await loadFallbackProductList();
                return;
            }
        }
        
        // If _sb is not defined or data was empty, fallback
        await loadFallbackProductList();
    }

    // Render HTML structure from JSON data
    function renderProductsFromData(data) {
        // Group items by section
        const grouped = {};
        data.forEach(item => {
            const sec = item.section || "OTHER";
            if (!grouped[sec]) grouped[sec] = [];
            grouped[sec].push(item);
        });

        let html = '';
        const sections = Object.keys(grouped).sort();

        sections.forEach(section => {
            html += `<button type="button" class="collapsible">${escapeHtml(section)}</button>\n`;
            html += `<div class="content">\n  <ul>\n`;
            
            grouped[section].forEach(item => {
                // Ensure tags are a comma-separated string
                let tagsStr = "";
                if (Array.isArray(item.tags)) {
                    tagsStr = item.tags.join(",");
                } else if (typeof item.tags === 'string') {
                    tagsStr = item.tags;
                }
                
                // Add favorite tag if the flag is true
                if (item.is_favorite) {
                    const tagArray = tagsStr ? tagsStr.split(',').map(t => t.trim()) : [];
                    if (!tagArray.includes('favorite')) {
                        tagArray.push('favorite');
                        tagsStr = tagArray.join(',');
                    }
                }

                const url = item.url ? escapeHtml(item.url) : "#";
                const name = escapeHtml(item.name || "Unnamed Item");
                const materialId = escapeHtml(item.id);

                html += `    <li data-tags="${escapeHtml(tagsStr)}" data-material-id="${materialId}"><a href="${url}" target="_blank" rel="noopener">${name}</a></li>\n`;
            });
            
            html += `  </ul>\n</div>\n`;
        });

        productListContainer.innerHTML = html;
        initializePageFunctions();
    }

    // Fallback: fetch static products.html
    async function loadFallbackProductList() {
        try {
            const response = await fetch("products.html");
            if (!response.ok) {
                console.error("Failed to load products.html. Status:", response.status);
                productListContainer.innerHTML = "<p class=\"text-danger\">Error loading product list. Please try again later.</p>";
                return;
            }
            const html = await response.text();
            productListContainer.innerHTML = html;
            initializePageFunctions();
        } catch (error) {
            console.error("Error fetching product list:", error);
            productListContainer.innerHTML = "<p class=\"text-danger\">Error loading product list. Please check your connection or contact support.</p>";
        }
    }

    function initializePageFunctions() {
        // Collapsible sections
        const collapsibles = productListContainer.querySelectorAll(".collapsible");
        collapsibles.forEach(button => {
            button.classList.remove("active"); // Start collapsed
            const content = button.nextElementSibling;
            if (content && content.classList.contains("content")) {
                content.style.maxHeight = "0px";
            }

            button.addEventListener("click", function() {
                this.classList.toggle("active");
                const currentContent = this.nextElementSibling;
                if (currentContent && currentContent.classList.contains("content")) {
                    if (currentContent.style.maxHeight && currentContent.style.maxHeight !== "0px") {
                        currentContent.style.maxHeight = "0px";
                    } else {
                        currentContent.style.maxHeight = currentContent.scrollHeight + "px";
                    }
                }
            });
        });

        // Dynamically generate filter buttons
        const allTags = new Set();
        const itemsForTagExtraction = productListContainer.querySelectorAll(".content ul li");
        itemsForTagExtraction.forEach(item => {
            const tagsStr = item.getAttribute("data-tags") || "";
            tagsStr.toLowerCase().split(",").forEach(tag => {
                const trimmedTag = tag.trim().replace(/^#/, "");
                if (trimmedTag) allTags.add(trimmedTag);
            });
        });

        // Clear existing buttons except "Show All"
        while (filterButtonsContainer.children.length > 1) {
            filterButtonsContainer.removeChild(filterButtonsContainer.lastChild);
        }
        
        Array.from(allTags).sort().forEach(tag => {
            const button = document.createElement("button");
            button.className = "filter-btn btn btn-outline-secondary";
            button.setAttribute("data-filter", tag);
            button.textContent = tag;
            filterButtonsContainer.appendChild(button);
        });

        // Re-attach event listeners to all filter buttons (including dynamically added ones)
        const filterButtons = filterButtonsContainer.querySelectorAll(".filter-btn");
        filterButtons.forEach(btn => {
            btn.addEventListener("click", function() {
                const filter = this.getAttribute("data-filter").toLowerCase();
                if (filter === "all") {
                    activeFilters = [];
                    filterButtons.forEach(b => b.classList.remove("active"));
                    this.classList.add("active");
                } else {
                    this.classList.toggle("active");
                    filterButtonsContainer.querySelector(".filter-btn[data-filter=\"all\"]").classList.remove("active");
                    if (this.classList.contains("active")) {
                        activeFilters.push(filter);
                    } else {
                        activeFilters = activeFilters.filter(f => f !== filter);
                    }
                    if (activeFilters.length === 0 && !filterButtonsContainer.querySelector(".filter-btn[data-filter=\"all\"]").classList.contains("active")) {
                        filterButtonsContainer.querySelector(".filter-btn[data-filter=\"all\"]").classList.add("active");
                    }
                }
                updateItemVisibility();
            });
        });
        
        // Initialize favorites after items are loaded
        initializeFavorites();
        // Initial display update
        updateItemVisibility(); 
    }

    let activeFilters = [];
    let searchQuery = "";

    if (searchInput) {
        searchInput.addEventListener("input", function() {
            searchQuery = this.value.toLowerCase().trim();
            updateItemVisibility();
        });
    }

    function updateItemVisibility() {
        if (!productListContainer.querySelector(".content ul li")) return; // Don't run if no items loaded

        const items = productListContainer.querySelectorAll(".content ul li");
        const sections = productListContainer.querySelectorAll(".collapsible");

        items.forEach(item => {
            const tagsStr = item.getAttribute("data-tags") || "";
            const tags = tagsStr.toLowerCase().split(",").map(t => t.trim().replace(/^#/, ""));
            const name = (item.querySelector("a")?.textContent || item.textContent).toLowerCase();
            const descriptionNode = item.querySelector("em");
            const description = descriptionNode ? descriptionNode.textContent.toLowerCase() : "";

            const tagMatch = activeFilters.length === 0 || activeFilters.every(filter => tags.includes(filter));
            
            const searchMatch = searchQuery === "" || 
                                name.includes(searchQuery) || 
                                description.includes(searchQuery) || 
                                tags.some(tag => tag.includes(searchQuery));

            if (tagMatch && searchMatch) {
                item.style.display = "";
                item.style.opacity = "1";
                item.style.transform = "scale(1)";
            } else {
                item.style.opacity = "0";
                item.style.transform = "scale(0.95)";
                // Delay display none for transition effect if desired, but direct is simpler
                item.style.display = "none"; 
            }
        });

        sections.forEach(button => {
            const content = button.nextElementSibling;
            if (content && content.classList.contains("content")) {
                const visibleItemsInSection = Array.from(content.querySelectorAll("ul li")).filter(li => li.style.display !== "none");
                
                if (visibleItemsInSection.length > 0) {
                    if (!button.classList.contains("active")) {
                        // Only auto-expand if search/filter is active, not on initial load (unless user wants this)
                        if(searchQuery !== "" || activeFilters.length > 0){
                            button.classList.add("active");
                            content.style.maxHeight = content.scrollHeight + "px";
                        }
                    } else {
                         // If already active, ensure maxHeight is correct (e.g. if items were added/removed dynamically affecting scrollHeight)
                         content.style.maxHeight = content.scrollHeight + "px";
                    }
                } else {
                    if (button.classList.contains("active")) {
                        button.classList.remove("active");
                        content.style.maxHeight = "0px";
                    }
                }
            }
        });
    }

    // Per-account favorites: logged-in users read/write public.user_favorites
    // (scoped by RLS), logged-out users (and items with no data-material-id,
    // i.e. the loadFallbackProductList() path) keep using localStorage exactly
    // as before. This is unrelated to affiliate_materials.is_favorite (the
    // "favorite" tag / isPreFavorite below) -- that sitewide editorial star
    // is untouched.
    let favoritesAuthListenerBound = false;

    async function getCurrentSession() {
        if (typeof _sb === 'undefined' || _sb === null) return null;
        try {
            const { data, error } = await _sb.auth.getSession();
            if (error) {
                console.warn("Error checking session for favorites:", error.message);
                return null;
            }
            return data && data.session ? data.session : null;
        } catch (err) {
            console.warn("Exception checking session for favorites:", err);
            return null;
        }
    }

    // Logged-out (and fallback-path-item) source of truth: localStorage,
    // matched by href -- same read this function replaces used to do inline.
    // Also used to revert visual state on logout, so it must set BOTH
    // directions (★ and ☆), not only add stars for matches.
    function syncFavoriteStarsFromLocalStorage() {
        const savedFavorites = JSON.parse(localStorage.getItem("userFavoritesChemCalc")) || [];
        const listItems = productListContainer.querySelectorAll(".content ul li");
        listItems.forEach(item => {
            const star = item.querySelector(".star-toggle:not(.my-favorite)");
            if (!star) return;
            const linkElem = item.querySelector("a");
            const isFavorited = !!(linkElem && savedFavorites.includes(linkElem.href));
            star.classList.toggle("user-favorite", isFavorited);
            star.innerHTML = isFavorited ? "★" : "☆";
        });
    }

    // Logged-in source of truth for items WITH a data-material-id: the
    // user_favorites table (plain select -- RLS already scopes it to userId).
    // Items with no data-material-id (fallback-path) are left untouched here;
    // they stay governed by localStorage regardless of login state.
    async function syncFavoriteStarsFromTable(userId) {
        let favoritedIds = new Set();
        try {
            const { data, error } = await _sb.from('user_favorites').select('material_id');
            if (error) {
                console.warn("Error fetching user_favorites, treating as no favorites:", error.message);
            } else if (data) {
                favoritedIds = new Set(data.map(row => row.material_id));
            }
        } catch (err) {
            console.warn("Exception fetching user_favorites, treating as no favorites:", err);
        }

        const listItems = productListContainer.querySelectorAll(".content ul li");
        listItems.forEach(item => {
            const materialId = item.getAttribute("data-material-id");
            if (!materialId) return; // fallback-path item: stays on localStorage
            const star = item.querySelector(".star-toggle:not(.my-favorite)");
            if (!star) return;
            const isFavorited = favoritedIds.has(materialId);
            star.classList.toggle("user-favorite", isFavorited);
            star.innerHTML = isFavorited ? "★" : "☆";
        });
    }

    function initializeFavorites() {
        const listItems = productListContainer.querySelectorAll(".content ul li");
        listItems.forEach(item => {
            const star = document.createElement("span");
            star.classList.add("star-toggle");
            const tags = item.getAttribute("data-tags") ? item.getAttribute("data-tags").toLowerCase() : "";
            const isPreFavorite = tags.includes("favorite"); // Check for pre-defined favorites

            if (isPreFavorite) {
                star.innerHTML = "★"; // Filled star for pre-defined favorites
                star.classList.add("my-favorite"); // Indicates it's a site-defined favorite
            } else {
                star.innerHTML = "☆"; // Empty star for others
            }

            // Insert star before the link/text content of the li
            const firstChild = item.firstChild;
            item.insertBefore(star, firstChild);

            // Add click listener only if it's not a pre-defined favorite
            if (!isPreFavorite) {
                star.addEventListener("click", async function(e) {
                    e.stopPropagation(); // Prevent li click if any

                    const materialId = item.getAttribute("data-material-id");
                    const linkElem = item.querySelector("a");
                    const link = linkElem ? linkElem.href : null;
                    const session = await getCurrentSession();

                    // Optimistic UI update.
                    const nowFavorited = !this.classList.contains("user-favorite");
                    this.classList.toggle("user-favorite");
                    this.innerHTML = nowFavorited ? "★" : "☆";

                    if (session && materialId) {
                        // Logged in, table-backed item.
                        const userId = session.user.id;
                        const { error } = nowFavorited
                            ? await _sb.from('user_favorites').insert({ user_id: userId, material_id: materialId })
                            : await _sb.from('user_favorites').delete().eq('user_id', userId).eq('material_id', materialId);

                        if (error) {
                            console.warn("Failed to save favorite:", error.message);
                            // Revert the optimistic update.
                            this.classList.toggle("user-favorite");
                            this.innerHTML = this.classList.contains("user-favorite") ? "★" : "☆";
                        }
                    } else if (link) {
                        // Logged out, or logged in with no data-material-id
                        // (fallback-path item): localStorage, unchanged.
                        let favorites = JSON.parse(localStorage.getItem("userFavoritesChemCalc")) || [];
                        if (nowFavorited) {
                            if (!favorites.includes(link)) favorites.push(link);
                        } else {
                            favorites = favorites.filter(fav => fav !== link);
                        }
                        localStorage.setItem("userFavoritesChemCalc", JSON.stringify(favorites));
                    }
                });
            }
        });

        // Set initial visual state: localStorage first (covers logged-out
        // and fallback-path items), then override with the table for
        // whichever session is currently resolved (covers data-material-id
        // items for a logged-in user).
        syncFavoriteStarsFromLocalStorage();

        if (typeof _sb !== 'undefined' && _sb !== null) {
            getCurrentSession().then(session => {
                if (session) {
                    syncFavoriteStarsFromTable(session.user.id);
                }
            });

            // Re-sync visual state only (no DOM rebuild, no re-binding) on
            // login/logout, without a page reload.
            if (!favoritesAuthListenerBound) {
                favoritesAuthListenerBound = true;
                _sb.auth.onAuthStateChange((event, session) => {
                    if (session) {
                        syncFavoriteStarsFromTable(session.user.id);
                    } else {
                        syncFavoriteStarsFromLocalStorage();
                    }
                });
            }
        }
    }

    // Affiliate click tracking
    productListContainer.addEventListener("click", function(event) {
        let targetElement = event.target;
        // Traverse up the DOM tree to find an anchor tag if the click was on a child element
        while (targetElement != null && targetElement.tagName !== "A") {
            targetElement = targetElement.parentElement;
        }

        if (targetElement && targetElement.tagName === "A" && targetElement.hasAttribute("target") && targetElement.getAttribute("target") === "_blank") {
            if (typeof gtag === "function") {
                gtag("event", "click", {
                    "event_category": "Affiliate Link",
                    "event_label": targetElement.href,
                    "value": targetElement.textContent.trim()
                });
            }
            console.log("Affiliate link clicked: " + targetElement.href);
        }
    });
    
    // Footer Year
    const currentYearSpan = document.getElementById("currentYear");
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // Initial load of product list
    loadProductList();

});
