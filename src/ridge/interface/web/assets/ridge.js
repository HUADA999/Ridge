// Toggle the navigation menu
function toggleMenu() {
    var menu = document.getElementById("ridge-nav-menu");
    menu.classList.toggle("show");
}

// Close the dropdown menu if the user clicks outside of it
document.addEventListener('click', function(event) {
    let menu = document.getElementById("ridge-nav-menu");
    let menuContainer = document.getElementById("ridge-nav-menu-container");
    let isClickOnMenu = menuContainer.contains(event.target) || menuContainer === event.target;
    if (isClickOnMenu === false && menu.classList.contains("show")) {
        menu.classList.remove("show");
    }
});
