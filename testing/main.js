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
        if (!productListContainer) return;
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

    // Per-account favorites are Pro-only (2026-10-02; previously gated on
    // any logged-in session, free or Pro). Pro users read/write
    // public.user_favorites (scoped by RLS) for table-backed items, and
    // localStorage for fallback-path items (no data-material-id, i.e. the
    // loadFallbackProductList() path) that still have no id to key a table
    // row on. Logged-out AND free-tier visitors get no interactive star at
    // all -- not a localStorage-backed one. This is unrelated to
    // affiliate_materials.is_favorite (the "favorite" tag / isPreFavorite
    // below) -- that sitewide editorial star is untouched, unconditional,
    // same for every visitor regardless of tier.
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

    // Per-account favorites are Pro-only (2026-10-02). Queries the real
    // source directly -- same reason getCurrentSession() doesn't read
    // sessionStorage.chemcalc_user_tier for login state: that value is
    // set by global-auth.js's own async init, which can still be
    // in-flight when this runs. Same tier/subscription_status pattern
    // as global-auth.js's fetchProfile()/isPro.
    async function isCurrentUserPro() {
        const session = await getCurrentSession();
        if (!session) return false;
        try {
            const { data, error } = await _sb.from('profiles')
                .select('tier, subscription_status')
                .eq('id', session.user.id)
                .single();
            if (error || !data) return false;
            return data.tier === 'pro' || data.subscription_status === 'active';
        } catch (err) {
            console.warn("Exception checking Pro status for favorites:", err);
            return false;
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

    // Creates the interactive (non-editorial) star on one item and wires
    // its click handler. Only ever called for Pro users (see
    // addInteractiveStarsIfMissing()) -- the handler still re-checks
    // isCurrentUserPro() itself before writing anywhere (defense in
    // depth: the localStorage write path below has no server-side
    // protection the way the user_favorites table's RLS does).
    function createInteractiveStar(item) {
        const star = document.createElement("span");
        star.classList.add("star-toggle");
        star.innerHTML = "☆";
        item.insertBefore(star, item.firstChild);

        star.addEventListener("click", async function(e) {
            e.stopPropagation(); // Prevent li click if any

            const stillPro = await isCurrentUserPro();
            if (!stillPro) return;

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
                // Pro user, fallback-path item (no data-material-id, i.e.
                // loadFallbackProductList()): localStorage, unchanged --
                // there's still no id to key a table row on.
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

    // Removes any interactive stars (e.g. on logout, or a Pro account
    // signing out of Pro) -- editorial .my-favorite stars are untouched,
    // this selector explicitly excludes them.
    function removeInteractiveStars() {
        productListContainer.querySelectorAll(".star-toggle:not(.my-favorite)").forEach(star => star.remove());
    }

    // Adds interactive stars to every non-pre-favorite item that doesn't
    // already have one. Idempotent (checked per item) so it's safe to
    // call again on every auth-state change without double-creating.
    function addInteractiveStarsIfMissing() {
        const listItems = productListContainer.querySelectorAll(".content ul li");
        listItems.forEach(item => {
            const tags = item.getAttribute("data-tags") ? item.getAttribute("data-tags").toLowerCase() : "";
            if (tags.includes("favorite")) return; // editorial item, no interactive star
            if (item.querySelector(".star-toggle:not(.my-favorite)")) return; // already has one
            createInteractiveStar(item);
        });
    }

    // Resolves Pro status, then adds or removes the interactive stars
    // accordingly, and (if Pro) syncs their visual favorited state. Called
    // once on init and again on every auth-state change -- this is the
    // single place that decides whether the feature's UI exists at all,
    // so the gate can't be bypassed by an auth-change re-sync forgetting
    // to check it. Resolving Pro status BEFORE creating anything means a
    // non-Pro visitor never sees a star flash in and then disappear.
    async function applyFavoritesProGate() {
        const pro = await isCurrentUserPro();
        if (!pro) {
            removeInteractiveStars();
            return;
        }
        addInteractiveStarsIfMissing();
        syncFavoriteStarsFromLocalStorage();
        const session = await getCurrentSession();
        if (session) syncFavoriteStarsFromTable(session.user.id);
    }

    function initializeFavorites() {
        // Editorial (.my-favorite) stars: unconditional, same for every
        // visitor regardless of tier, exactly as before this change.
        const listItems = productListContainer.querySelectorAll(".content ul li");
        listItems.forEach(item => {
            const tags = item.getAttribute("data-tags") ? item.getAttribute("data-tags").toLowerCase() : "";
            if (!tags.includes("favorite")) return;
            const star = document.createElement("span");
            star.classList.add("star-toggle", "my-favorite");
            star.innerHTML = "★";
            item.insertBefore(star, item.firstChild);
        });

        // Interactive stars are Pro-gated -- resolve and apply async so
        // non-Pro visitors never get one created in the first place.
        applyFavoritesProGate();

        if (typeof _sb !== 'undefined' && _sb !== null && !favoritesAuthListenerBound) {
            favoritesAuthListenerBound = true;
            // Re-apply the Pro gate (not just a visual re-sync) on every
            // login/logout, without a page reload -- a free-tier login
            // must not leave stale interactive stars from a prior guest
            // state, and a Pro login must add them.
            _sb.auth.onAuthStateChange(function (event, session) {
                applyFavoritesProGate();
            });
        }
    }

    // Affiliate click tracking
    if (productListContainer) {
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
    }
    
    // Footer Year
    const currentYearSpan = document.getElementById("currentYear");
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // Initial load of product list
    loadProductList();

});
