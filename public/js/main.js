const backdrop = $(".backdrop");
const sideDrawer = $(".mobile-nav");
const menuToggle = $("#side-menu-toggle");

backdrop.on('click', function() {
  $(this).hide();
  sideDrawer.removeClass("open");
})

menuToggle.on('click', function() {
  backdrop.show();
  sideDrawer.addClass("open");
})