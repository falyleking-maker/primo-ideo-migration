
/* =========================================================
   PRIMO-IDÉO
   NAVIGATION COMMUNE — TOUTES LES PAGES
   ========================================================= */

(function () {
    "use strict";

    /* ---------- MENU ---------- */

    const menuHTML = `
        <button class="menu-toggle" id="menuToggle" aria-label="Ouvrir le menu">
            <span></span>
            <span></span>
            <span></span>
        </button>

        <nav class="main-navigation" id="mainNavigation">

            <a href="index.html" class="nav-link">
                <span>Accueil</span>
            </a>

            <a href="categories.html" class="nav-link">
                <span>Catégories</span>
            </a>

            <a href="produits.html" class="nav-link">
                <span>Produits</span>
            </a>

            <a href="panier(1).html" class="nav-link">
                <span>Panier</span>
            </a>

            <a href="reservation.html" class="nav-link">
                <span>Réservation</span>
            </a>

            <a href="livraison.html" class="nav-link">
                <span>Livraison</span>
            </a>

            <a href="conditions.html" class="nav-link">
                <span>Conditions</span>
            </a>

            <a href="login.html" class="nav-link">
                <span>Connexion</span>
            </a>

            <a href="inscription.html" class="nav-link">
                <span>Inscription</span>
            </a>

        </nav>
    `;


    /* ---------- INSERTION ---------- */

    function createNavigation() {

        /* Évite de créer deux menus */
        if (document.querySelector(".primo-navigation")) {
            return;
        }

        const header =
            document.querySelector("header") ||
            document.querySelector(".header") ||
            document.body;

        const navigationContainer = document.createElement("div");

        navigationContainer.className = "primo-navigation";

        navigationContainer.innerHTML = menuHTML;

        header.prepend(navigationContainer);

        initializeMenu();
        detectCurrentPage();
    }


    /* ---------- BURGER ---------- */

    function initializeMenu() {

        const toggle = document.getElementById("menuToggle");
        const navigation = document.getElementById("mainNavigation");

        if (!toggle || !navigation) {
            return;
        }

        toggle.addEventListener("click", function (event) {

            event.stopPropagation();

            toggle.classList.toggle("active");
            navigation.classList.toggle("active");

        });


        /* Fermer après clic sur un lien */

        navigation.querySelectorAll(".nav-link").forEach(function (link) {

            link.addEventListener("click", function () {

                toggle.classList.remove("active");
                navigation.classList.remove("active");

            });

        });


        /* Fermer si on clique ailleurs */

        document.addEventListener("click", function (event) {

            if (
                !navigation.contains(event.target) &&
                !toggle.contains(event.target)
            ) {

                toggle.classList.remove("active");
                navigation.classList.remove("active");

            }

        });


        /* Touche ESC */

        document.addEventListener("keydown", function (event) {

            if (event.key === "Escape") {

                toggle.classList.remove("active");
                navigation.classList.remove("active");

            }

        });

    }


    /* ---------- PAGE ACTIVE ---------- */

    function detectCurrentPage() {

        let currentPage = window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();

        if (!currentPage) {
            currentPage = "index.html";
        }

        document.querySelectorAll(".nav-link").forEach(function (link) {

            const href = link
                .getAttribute("href")
                .toLowerCase();

            if (href === currentPage) {
                link.classList.add("active");
            }

        });

    }


    /* ---------- LANCEMENT ---------- */

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            createNavigation
        );

    } else {

        createNavigation();

    }

})();

