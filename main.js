<script>
  document.addEventListener("DOMContentLoaded", function() {
    var menuToggle = document.querySelector('.menu-toggle');
    var nav = document.getElementById('mainNav');
    menuToggle.addEventListener('click', function() {
      nav.classList.toggle('active');
    });
  });
</script>// JavaScript Document