document.addEventListener("DOMContentLoaded", function() {
    const productListContainer = document.getElementById("product-list-container");
    const filterButtonsContainer = document.getElementById("filter-buttons");
    const searchInput = document.getElementById("search-input");

    // Function to fetch and inject product list HTML
    async function loadProductList() {
        try {
            const response = await fetch("products.html");
            if (!response.ok) {
                console.error("Failed to load products.html. Status:", response.status);
                productListContainer.innerHTML = "<p class=\"text-danger\">Error loading product list. Please try again later.</p>";
                return;
            }
            const html = await response.text();
            productListContainer.innerHTML = html;
            initializePageFunctions(); // Call functions that depend on the product list being loaded
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
                star.addEventListener("click", function(e) {
                    e.stopPropagation(); // Prevent li click if any
                    this.classList.toggle("user-favorite");
                    this.innerHTML = this.classList.contains("user-favorite") ? "★" : "☆";
                    
                    const linkElem = item.querySelector("a");
                    if (linkElem) {
                        const link = linkElem.href;
                        let favorites = JSON.parse(localStorage.getItem("userFavoritesChemCalc")) || [];
                        if (this.classList.contains("user-favorite")) {
                            if (!favorites.includes(link)) favorites.push(link);
                        } else {
                            favorites = favorites.filter(fav => fav !== link);
                        }
                        localStorage.setItem("userFavoritesChemCalc", JSON.stringify(favorites));
                    }
                });
            }
        });

        // Load saved user favorites from localStorage
        const savedFavorites = JSON.parse(localStorage.getItem("userFavoritesChemCalc")) || [];
        if (savedFavorites.length > 0) {
            listItems.forEach(item => {
                const linkElem = item.querySelector("a");
                if (linkElem && savedFavorites.includes(linkElem.href)) {
                    const star = item.querySelector(".star-toggle:not(.my-favorite)"); // Only target non-pre-defined favorites
                    if (star) {
                        star.classList.add("user-favorite");
                        star.innerHTML = "★";
                    }
                }
            });
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

