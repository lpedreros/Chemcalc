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

    // Per-account favorites: the star exists and shows for every visitor
    // regardless of tier (2026-10-02; superseded 55db6d2's "no star at all
    // for non-Pro" approach per Leo's visual feedback -- a mix of rows
    // with and without a star read as broken, not tier-gated). Only the
    // CLICK behavior forks by tier: Pro toggles and persists (table for
    // material-id items, localStorage for fallback-path items with none);
    // non-Pro does nothing to the star itself and instead opens the
    // existing upgrade/login nudge (openModal('loginModal'), the same
    // global function kits.html's own help-modal CTA already calls
    // inline). A Pro user logging out mid-session gets their interactive
    // stars reset to unfavorited rather than left showing a stale ★ with
    // no session backing it. This is unrelated to affiliate_materials.
    // is_favorite (the "favorite" tag / isPreFavorite below) -- that
    // sitewide editorial star is untouched, unconditional, same for every
    // visitor regardless of tier.
    let favoritesAuthListenerBound = false;

    // Race fix (2026-10-02): an already-favorited item couldn't be
    // un-favorited, because a resync's SELECT -- already in flight from
    // page load or an auth event -- could resolve AFTER a fast DELETE
    // completed and reassert the star from its now-stale snapshot.
    //
    // A plain "pending while the write is in flight" set isn't enough on
    // its own: verified by a manual timing test (slow mocked SELECT,
    // fast mocked DELETE, both run through the real functions below) that
    // a pending-only guard still loses the race, because the DELETE
    // finishes and clears its own pending entry well before the slower,
    // already-in-flight SELECT ever resolves and checks it -- the key is
    // long gone by the time the stale read needs to see it.
    //
    // Fix: keep favoritesPendingMaterialIds for the in-flight write
    // itself (keyed by material_id for table-backed items, href for
    // fallback-path items -- same priority as createInteractiveStar()'s
    // own pendingKey), AND remember WHEN each write last completed in
    // favoritesLastWriteCompletedAt. Every resync captures its own
    // syncStartedAt before it does anything else (including the Pro
    // check, so it's at least as early as the real network fetch it's
    // about to issue) and skips any item with either an in-flight write
    // or a completed one at/after that timestamp -- a write that
    // completed no earlier than when this resync's snapshot was taken is
    // strictly more recent than that snapshot, so the local DOM state
    // wins. Confirmed via the same manual test that this closes the gap
    // the pending-only version didn't.
    const favoritesPendingMaterialIds = new Set();
    const favoritesLastWriteCompletedAt = new Map();

    function favoritesSyncShouldSkip(key, syncStartedAt) {
        if (!key) return false;
        if (favoritesPendingMaterialIds.has(key)) return true;
        const lastWrite = favoritesLastWriteCompletedAt.get(key);
        return lastWrite !== undefined && lastWrite >= syncStartedAt;
    }

    // Reads the shared auth-state broadcast by global-account-modal.js
    // (2026-10-02 consolidation) instead of running an independent
    // getSession() call -- this file was one of four places on the page
    // doing that independently, which the login-indicator bug (commit
    // 4b6f080) and this file's own favorites race (commit 421da99) both
    // trace back to. Returns a session-shaped object ({user: {...}}) so
    // existing call sites (session.user.id) didn't need to change, even
    // though the shared source only tracks the user object, not a full
    // Supabase session. No longer async -- window.getAuthState() is
    // synchronous, there's no network call left to await.
    function getCurrentSession() {
        if (typeof window.getAuthState !== 'function') return null;
        const state = window.getAuthState();
        return state.user ? { user: state.user } : null;
    }

    // Per-account favorites are Pro-only. Pure synchronous function over
    // the shared profile now (no network call of its own) -- same
    // tier/subscription_status pattern as global-auth.js's own isPro
    // check. No longer async, for the same reason as getCurrentSession().
    function isCurrentUserPro() {
        if (typeof window.getAuthState !== 'function') return false;
        const profile = window.getAuthState().profile;
        return !!(profile && (profile.tier === 'pro' || profile.subscription_status === 'active'));
    }

    // Logged-out (and fallback-path-item) source of truth: localStorage,
    // matched by href -- same read this function replaces used to do inline.
    // Also used to revert visual state on logout, so it must set BOTH
    // directions (★ and ☆), not only add stars for matches.
    function syncFavoriteStarsFromLocalStorage(syncStartedAt) {
        if (syncStartedAt === undefined) syncStartedAt = Date.now();
        const savedFavorites = JSON.parse(localStorage.getItem("userFavoritesChemCalc")) || [];
        const listItems = productListContainer.querySelectorAll(".content ul li");
        listItems.forEach(item => {
            const star = item.querySelector(".star-toggle:not(.my-favorite)");
            if (!star) return;
            const linkElem = item.querySelector("a");
            const materialId = item.getAttribute("data-material-id");
            const pendingKey = materialId || (linkElem ? linkElem.href : null);
            if (favoritesSyncShouldSkip(pendingKey, syncStartedAt)) return;
            const isFavorited = !!(linkElem && savedFavorites.includes(linkElem.href));
            star.classList.toggle("user-favorite", isFavorited);
            star.innerHTML = isFavorited ? "★" : "☆";
        });
    }

    // Logged-in source of truth for items WITH a data-material-id: the
    // user_favorites table (plain select -- RLS already scopes it to userId).
    // Items with no data-material-id (fallback-path) are left untouched here;
    // they stay governed by localStorage regardless of login state.
    async function syncFavoriteStarsFromTable(userId, syncStartedAt) {
        if (syncStartedAt === undefined) syncStartedAt = Date.now();
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
            if (favoritesSyncShouldSkip(materialId, syncStartedAt)) return;
            const star = item.querySelector(".star-toggle:not(.my-favorite)");
            if (!star) return;
            const isFavorited = favoritedIds.has(materialId);
            star.classList.toggle("user-favorite", isFavorited);
            star.innerHTML = isFavorited ? "★" : "☆";
        });
    }

    // Creates the interactive (non-editorial) star on one item and wires
    // its click handler. Created unconditionally for every non-editorial
    // item regardless of tier (see initializeFavorites()) -- only the
    // click behavior forks by tier, re-checked here at click time (not
    // cached from init) as defense in depth: the localStorage write path
    // below has no server-side protection the way the user_favorites
    // table's RLS does.
    function createInteractiveStar(item) {
        const star = document.createElement("span");
        star.classList.add("star-toggle");
        star.innerHTML = "☆";
        item.insertBefore(star, item.firstChild);

        star.addEventListener("click", async function(e) {
            e.stopPropagation(); // Prevent li click if any

            const pro = isCurrentUserPro();
            if (!pro) {
                // Non-Pro: no toggle, no write -- nudge toward the
                // existing upgrade/login flow instead. Don't touch
                // classList/innerHTML at all, so there's no flicker of a
                // change that's about to not happen.
                openModal('loginModal');
                return;
            }

            const materialId = item.getAttribute("data-material-id");
            const linkElem = item.querySelector("a");
            const link = linkElem ? linkElem.href : null;
            const pendingKey = materialId || link;
            const session = getCurrentSession();

            if (pendingKey) favoritesPendingMaterialIds.add(pendingKey);
            try {
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
            } finally {
                // Clears even on an unexpected throw, not just the normal
                // success/revert paths above -- a pending key must never
                // get stuck set, or every future resync for that item
                // would be silently skipped forever. Recording the
                // completion time (not just clearing "in flight") is what
                // still protects against a resync that was already in
                // flight before this write started and only resolves
                // after it -- see favoritesSyncShouldSkip()'s own comment.
                if (pendingKey) {
                    favoritesPendingMaterialIds.delete(pendingKey);
                    favoritesLastWriteCompletedAt.set(pendingKey, Date.now());
                }
            }
        });
    }

    // Resets every interactive star to unfavorited -- the star element
    // itself is never removed (it always exists now, regardless of
    // tier), only its favorited display. Used when the current user
    // isn't Pro, including a Pro user logging out mid-session, so a
    // previously-favorited star doesn't linger showing ★ with no
    // session/subscription backing it. Editorial .my-favorite stars are
    // untouched, this selector explicitly excludes them.
    function resetInteractiveStarsToUnfavorited() {
        productListContainer.querySelectorAll(".star-toggle:not(.my-favorite)").forEach(star => {
            star.classList.remove("user-favorite");
            star.innerHTML = "☆";
        });
    }

    // Syncs the interactive stars' VISUAL favorited state based on Pro
    // status -- the star itself always exists for every visitor (see
    // initializeFavorites()); only its favorited/unfavorited display (and
    // the click behavior, in createInteractiveStar()) fork by tier. Pro:
    // sync from localStorage then the table, same as before this rework.
    // Not Pro: reset every interactive star to unfavorited rather than
    // leaving a stale ★ around. Called once on init and again on every
    // chemcalc:authchange event. No longer async: isCurrentUserPro()/
    // getCurrentSession() are now synchronous reads of the shared auth
    // state, and syncFavoriteStarsFromTable()'s own fetch is already
    // fire-and-forget here (not awaited) exactly as before this change.
    function applyFavoritesProGate() {
        // Captured before anything else (even the Pro check), so it's at
        // least as early as the real network fetch syncFavoriteStarsFromTable()
        // is about to issue -- see favoritesSyncShouldSkip().
        const syncStartedAt = Date.now();
        const pro = isCurrentUserPro();
        if (!pro) {
            resetInteractiveStarsToUnfavorited();
            return;
        }
        syncFavoriteStarsFromLocalStorage(syncStartedAt);
        const session = getCurrentSession();
        if (session) syncFavoriteStarsFromTable(session.user.id, syncStartedAt);
    }

    function initializeFavorites() {
        // Every item gets its star unconditionally, regardless of tier --
        // visual consistency across visitors was the whole point of this
        // rework. Editorial (.my-favorite) items get the non-interactive
        // filled star, same as always; everything else gets the
        // interactive one. Only the click behavior forks by tier (see
        // createInteractiveStar()), never whether the star exists.
        const listItems = productListContainer.querySelectorAll(".content ul li");
        listItems.forEach(item => {
            const tags = item.getAttribute("data-tags") ? item.getAttribute("data-tags").toLowerCase() : "";
            if (tags.includes("favorite")) {
                const star = document.createElement("span");
                star.classList.add("star-toggle", "my-favorite");
                star.innerHTML = "★";
                item.insertBefore(star, item.firstChild);
                return;
            }
            createInteractiveStar(item);
        });

        // Sync the interactive stars' visual favorited state for the
        // current user (or reset them if not Pro) -- see
        // applyFavoritesProGate()'s own comment.
        applyFavoritesProGate();

        if (!favoritesAuthListenerBound) {
            favoritesAuthListenerBound = true;
            // Re-sync visual state (never existence -- the star always
            // exists) on login/logout, without a page reload. Listens for
            // the shared chemcalc:authchange event (2026-10-02
            // consolidation) instead of registering its own independent
            // _sb.auth.onAuthStateChange() -- this was one of four places
            // on the page doing that independently, which this file's own
            // favorites race (fixed in commit 421da99, but only by working
            // around the duplication) traces back to. The previous
            // SIGNED_IN/SIGNED_OUT-only event filter is dropped: the
            // broadcast event's detail doesn't carry the raw Supabase
            // event name, only {user, profile}, and the 421da99 timestamp
            // guard (favoritesSyncShouldSkip) already prevents the race
            // regardless of how often a resync fires -- so a resync on
            // every chemcalc:authchange (including a token refresh) is at
            // most a few extra queries, not a correctness regression.
            window.addEventListener('chemcalc:authchange', function () {
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
