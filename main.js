document.addEventListener("DOMContentLoaded", function() {
  var menuToggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('mainNav');
  menuToggle.addEventListener('click', function() {
    nav.classList.toggle('active');
  });
});

document.addEventListener("DOMContentLoaded", function() {
  // Mobile menu toggle (existing functionality)
  var menuToggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('mainNav');
  if(menuToggle && nav) {
    menuToggle.addEventListener('click', function() {
      nav.classList.toggle('active');
    });
  }
  
  // Collapsible sections
  var coll = document.querySelectorAll(".collapsible");
  coll.forEach(function(button) {
    button.addEventListener("click", function() {
      this.classList.toggle("active");
      var content = this.nextElementSibling;
      if (content.style.maxHeight){
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = content.scrollHeight + "px";
      } 
    });
  });
});
