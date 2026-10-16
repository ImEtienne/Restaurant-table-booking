'use strict'
document.addEventListener('DOMContentLoaded', function() {
    // Restaurer le thème depuis localStorage
    var savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        var icon = document.querySelector(".theme-toggle");
        if (icon) {
            icon.classList.remove("fa-moon");
            icon.classList.add("fa-sun");
        }
    }

    var menuItems = document.querySelectorAll('.menu-item');

    menuItems.forEach(function(item) {
        // Navigation au clavier
        item.setAttribute('tabindex', '0');
        item.setAttribute('role', 'button');
        
        // Initialiser aria-expanded pour les items avec sous-menu
        var target = item.getAttribute('data-target');
        var submenu = document.getElementById(target);
        if (submenu) {
            var isExpanded = submenu.classList.contains('submenu-active');
            item.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
        }
        
        // Gestion du clic
        item.addEventListener('click', function(event) {
            event.preventDefault();
            toggleMenuItem(item);
        });

        // Gestion de la touche Enter et Espace
        item.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleMenuItem(item);
            }
        });
    });

    function toggleMenuItem(item) {
        // Désactive l'onglet précédemment activé
        var activeMenuItem = document.querySelector('.menu-item.active');
        if (activeMenuItem && activeMenuItem !== item) {
            activeMenuItem.classList.remove('active');
            activeMenuItem.setAttribute('aria-expanded', 'false');
            var activeSubmenu = document.getElementById(activeMenuItem.getAttribute('data-target'));
            if (activeSubmenu) {
                activeSubmenu.classList.remove('submenu-active');
                activeSubmenu.style.maxHeight = null;
            }
        }

        // Active l'onglet sur lequel vous venez de cliquer
        var target = item.getAttribute('data-target');
        var submenu = document.getElementById(target);
        var isActive = item.classList.contains('active');
        
        if (submenu) {
            if (isActive && submenu.classList.contains('submenu-active')) {
                // Fermer le sous-menu
                item.classList.remove('active');
                item.setAttribute('aria-expanded', 'false');
                submenu.classList.remove('submenu-active');
                submenu.style.maxHeight = null;
            } else {
                // Ouvrir le sous-menu
                item.classList.add('active');
                item.setAttribute('aria-expanded', 'true');
                document.querySelectorAll('.submenu').forEach(function(sub) {
                    if (sub !== submenu) {
                        sub.classList.remove('submenu-active');
                        sub.style.maxHeight = null;
                    }
                });
                submenu.classList.add('submenu-active');
                submenu.style.maxHeight = submenu.scrollHeight + 'px';
            }
        } else {
            item.classList.add('active');
        }
    }

    // Activer l'onglet "Tableau de Bord" par défaut au chargement de la page
    var defaultMenuItem = document.querySelector('.menu-item[data-target="dashboard"]');
    if (defaultMenuItem) {
        defaultMenuItem.classList.add('active');
    }

    // Navigation clavier pour les sous-menus
    var submenuLinks = document.querySelectorAll('.submenu a');
    submenuLinks.forEach(function(link) {
        link.setAttribute('tabindex', '0');
        link.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                var parentMenu = link.closest('.submenu');
                var parentMenuItem = document.querySelector('[data-target="' + parentMenu.id + '"]');
                if (parentMenuItem) {
                    parentMenuItem.focus();
                }
            }
        });
    });
});


function toggleDropdown() {
    var dropdown = document.getElementById("avatarDropdown");
    var avatar = document.querySelector('.avatar');
    if (dropdown && avatar) {
        var isOpen = dropdown.style.display === "block";
        dropdown.style.display = isOpen ? "none" : "block";
        avatar.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
        
        // Navigation clavier dans le dropdown
        if (!isOpen) {
            var firstItem = dropdown.querySelector('a[role="menuitem"]');
            if (firstItem) {
                setTimeout(function() {
                    firstItem.focus();
                }, 100);
            }
        } else {
            avatar.focus();
        }
    }
}

// Navigation clavier pour le dropdown avatar
document.addEventListener('keydown', function(event) {
    var dropdown = document.getElementById("avatarDropdown");
    if (dropdown && dropdown.style.display === "block") {
        var items = Array.from(dropdown.querySelectorAll('a[role="menuitem"]'));
        var currentIndex = items.indexOf(document.activeElement);
        
        if (event.key === 'Escape') {
            dropdown.style.display = "none";
            document.querySelector('.avatar').focus();
            document.querySelector('.avatar').setAttribute('aria-expanded', 'false');
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            var nextIndex = (currentIndex + 1) % items.length;
            items[nextIndex].focus();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            var prevIndex = currentIndex === -1 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
            items[prevIndex].focus();
        }
    }
});

// Initialiser le dropdown au chargement
document.addEventListener('DOMContentLoaded', function() {
    var dropdown = document.getElementById("avatarDropdown");
    var avatar = document.querySelector('.avatar');
    if (dropdown && avatar) {
        dropdown.style.display = "none";
        avatar.setAttribute('aria-expanded', 'false');
    }
});

// Fermer le menu déroulant si l'utilisateur clique en dehors
document.addEventListener('click', function(event) {
    var avatar = document.querySelector('.avatar');
    var dropdown = document.getElementById("avatarDropdown");
    
    if (avatar && dropdown && !avatar.contains(event.target) && !dropdown.contains(event.target)) {
        if (dropdown.style.display === "block") {
            dropdown.style.display = "none";
            avatar.setAttribute('aria-expanded', 'false');
        }
    }
});

function toggleTheme() {
    var element = document.body;
    element.classList.toggle("dark-mode");

    // Sauvegarder le thème dans localStorage
    var isDarkMode = element.classList.contains("dark-mode");
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');

    // Changer l'icône en fonction du mode
    var icon = document.querySelector(".theme-toggle");
    if (icon) {
        if (isDarkMode) {
            icon.classList.remove("fa-moon");
            icon.classList.add("fa-sun");
            icon.setAttribute('aria-label', 'Activer le mode clair');
        } else {
            icon.classList.remove("fa-sun");
            icon.classList.add("fa-moon");
            icon.setAttribute('aria-label', 'Activer le mode sombre');
        }
    }
}


