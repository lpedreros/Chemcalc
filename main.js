document.addEventListener("DOMContentLoaded", function() {
  // Mobile menu toggle
  var menuToggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('mainNav');
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', function() {
      nav.classList.toggle('active');
    });
  }

  // Collapsible sections
  var coll = document.querySelectorAll(".collapsible");
  coll.forEach(function(button) {
    button.classList.add("active");
    var content = button.nextElementSibling;
    content.style.maxHeight = content.scrollHeight + "px";
    button.addEventListener("click", function() {
      this.classList.toggle("active");
      if (content.style.maxHeight && content.style.maxHeight !== "0px") {
        content.style.maxHeight = "0px";
      } else {
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
  });

  // Filtering functionality
  var activeFilters = [];
  var searchQuery = '';

  var filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var filter = this.getAttribute('data-filter').toLowerCase();
      if (filter === 'all') {
        activeFilters = [];
        filterButtons.forEach(function(b) {
          if(b.getAttribute('data-filter').toLowerCase() !== 'all'){
            b.classList.remove('active');
          }
        });
        this.classList.add('active');
      } else {
        this.classList.toggle('active');
        document.querySelector('.filter-btn[data-filter="all"]').classList.remove('active');
        if (this.classList.contains('active')) {
          activeFilters.push(filter);
        } else {
          activeFilters = activeFilters.filter(function(f) { return f !== filter; });
        }
        if (activeFilters.length === 0) {
          document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
        }
      }
      updateItemVisibility();
    });
  });

  var searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      searchQuery = this.value.toLowerCase();
      updateItemVisibility();
    });
  }

  function updateItemVisibility() {
    var items = document.querySelectorAll('.content ul li');
    items.forEach(function(item) {
      var tagsStr = item.getAttribute('data-tags') || "";
      var tags = tagsStr.toLowerCase().split(',').map(function(t) { return t.trim(); });
      var tagMatch = activeFilters.length === 0 || activeFilters.every(function(filter) {
        return tags.indexOf(filter) !== -1;
      });
      var text = item.textContent.toLowerCase();
      var searchMatch = searchQuery === "" || text.indexOf(searchQuery) !== -1;
      var visible = tagMatch && searchMatch;
      if (visible) {
        item.style.display = "";
        setTimeout(function() {
          item.style.opacity = "1";
          item.style.transform = "scale(1)";
        }, 10);
      } else {
        item.style.opacity = "0";
        item.style.transform = "scale(0.95)";
        setTimeout(function() {
          item.style.display = "none";
        }, 300);
      }
    });
  }

  // Affiliate click tracking using Google Analytics (if available)
  var affiliateLinks = document.querySelectorAll('a[target="_blank"]');
  affiliateLinks.forEach(function(link) {
    link.addEventListener('click', function() {
      if (typeof gtag === 'function') {
        gtag('event', 'click', {
          'event_category': 'Affiliate',
          'event_label': this.href
        });
      }
      console.log("Affiliate link clicked: " + this.href);
    });
  });

  // Favorites toggle
  var listItems = document.querySelectorAll('.content ul li');
  listItems.forEach(function(item) {
    var star = document.createElement('span');
    star.classList.add('star-toggle');
    var tags = item.getAttribute('data-tags') ? item.getAttribute('data-tags').toLowerCase() : "";
    if (tags.indexOf('favorite') !== -1) {
      star.innerHTML = "★";
      star.classList.add('my-favorite');
    } else {
      star.innerHTML = "☆";
    }
    item.insertBefore(star, item.firstChild);
    if (!star.classList.contains('my-favorite')) {
      star.addEventListener('click', function(e) {
        e.stopPropagation();
        if (this.classList.contains('user-favorite')) {
          this.classList.remove('user-favorite');
          this.innerHTML = "☆";
        } else {
          this.classList.add('user-favorite');
          this.innerHTML = "★";
        }
        var linkElem = item.querySelector('a');
        if (linkElem) {
          var link = linkElem.href;
          var favorites = JSON.parse(localStorage.getItem('userFavorites')) || [];
          if (this.classList.contains('user-favorite')) {
            if (favorites.indexOf(link) === -1) favorites.push(link);
          } else {
            favorites = favorites.filter(function(fav) { return fav !== link; });
          }
          localStorage.setItem('userFavorites', JSON.stringify(favorites));
        }
      });
    }
  });

  var savedFavorites = JSON.parse(localStorage.getItem('userFavorites')) || [];
  if (savedFavorites.length > 0) {
    var listItems = document.querySelectorAll('.content ul li');
    listItems.forEach(function(item) {
      var linkElem = item.querySelector('a');
      if (linkElem && savedFavorites.indexOf(linkElem.href) !== -1) {
        var star = item.querySelector('.star-toggle');
        if (star && !star.classList.contains('my-favorite')) {
          star.classList.add('user-favorite');
          star.innerHTML = "★";
        }
      }
    });
  }
});
