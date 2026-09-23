/*
 * Primo-Ideo — gestion globale du compte
 * Front-end uniquement.
 *
 * Fonctionnement :
 * - visiteur : Connexion + Inscription
 * - utilisateur connecté : Mon compte + Déconnexion
 * - le panier reste géré par app.js
 */

(function () {
    "use strict";

    const CURRENT_USER_KEY = "primoIdeoCurrentUser";

    function getCurrentUser() {
        try {
            const raw = localStorage.getItem(CURRENT_USER_KEY);

            if (!raw) {
                return null;
            }

            const user = JSON.parse(raw);

            return user && typeof user === "object"
                ? user
                : null;

        } catch (error) {
            console.error("Impossible de lire le compte :", error);
            return null;
        }
    }

    /*
     * Retourne le bon chemin vers une page située dans /pages/
     *
     * Depuis index.html :
     *     pages/connexion.html
     *
     * Depuis une page de /pages/ :
     *     connexion.html
     */
    function getPageLink(fileName) {
        const path = window.location.pathname.replace(/\\/g, "/");

        if (/\/pages\//i.test(path)) {
            return fileName;
        }

        return "pages/" + fileName;
    }

    function logout() {
        localStorage.removeItem(CURRENT_USER_KEY);

        window.location.reload();
    }

    function createLink(href, text, className) {
        const link = document.createElement("a");

        link.href = href;
        link.textContent = text;

        if (className) {
            link.className = className;
        }

        return link;
    }

    function updateAccountNavigation() {
        const user = getCurrentUser();

        /*
         * Zones reconnues :
         * - [data-account-nav]
         * - .header-actions
         */
        const zones = document.querySelectorAll(
            "[data-account-nav], .header-actions"
        );

        zones.forEach(function (zone) {

            /*
             * Supprime uniquement les liens créés
             * précédemment par ce script.
             */
            const oldLinks = zone.querySelectorAll(
                "[data-primo-account-link]"
            );

            oldLinks.forEach(function (item) {
                item.remove();
            });

            if (user) {

                const accountLink = createLink(
                    getPageLink("mon-compte.html"),
                    "Mon compte",
                    "header-link"
                );

                accountLink.setAttribute(
                    "data-primo-account-link",
                    "true"
                );

                const logoutLink = createLink(
                    "#",
                    "Déconnexion",
                    "header-link"
                );

                logoutLink.setAttribute(
                    "data-primo-account-link",
                    "true"
                );

                logoutLink.addEventListener(
                    "click",
                    function (event) {
                        event.preventDefault();
                        logout();
                    }
                );

                zone.insertBefore(
                    accountLink,
                    zone.firstChild
                );

                zone.insertBefore(
                    logoutLink,
                    accountLink.nextSibling
                );

            } else {

                const loginLink = createLink(
                    getPageLink("connexion.html"),
                    "Connexion",
                    "header-link"
                );

                loginLink.setAttribute(
                    "data-primo-account-link",
                    "true"
                );

                const registerLink = createLink(
                    getPageLink("inscription.html"),
                    "Inscription",
                    "header-link"
                );

                registerLink.setAttribute(
                    "data-primo-account-link",
                    "true"
                );

                zone.insertBefore(
                    loginLink,
                    zone.firstChild
                );

                zone.insertBefore(
                    registerLink,
                    loginLink.nextSibling
                );
            }
        });

        /*
         * Zones utilisant :
         * data-account-status
         */
        document
            .querySelectorAll("[data-account-status]")
            .forEach(function (zone) {

                zone.innerHTML = "";

                if (user) {

                    const account = createLink(
                        getPageLink("mon-compte.html"),
                        "Mon compte"
                    );

                    const logoutButton = createLink(
                        "#",
                        "Déconnexion"
                    );

                    logoutButton.addEventListener(
                        "click",
                        function (event) {
                            event.preventDefault();
                            logout();
                        }
                    );

                    zone.appendChild(account);

                    zone.appendChild(
                        document.createTextNode(" · ")
                    );

                    zone.appendChild(logoutButton);

                } else {

                    zone.appendChild(
                        createLink(
                            getPageLink("connexion.html"),
                            "Connexion"
                        )
                    );

                    zone.appendChild(
                        document.createTextNode(" · ")
                    );

                    zone.appendChild(
                        createLink(
                            getPageLink("inscription.html"),
                            "Inscription"
                        )
                    );
                }
            });
    }

    /*
     * Protection du passage vers le paiement
     *
     * Le panier reste accessible.
     * Une connexion est demandée avant le paiement.
     */
    function protectCheckoutLinks() {

        const user = getCurrentUser();

        if (user) {
            return;
        }

        document
            .querySelectorAll('a[href$="paiement.html"]')
            .forEach(function (link) {

                if (
                    link.dataset.accountChecked === "true"
                ) {
                    return;
                }

                link.dataset.accountChecked = "true";

                link.addEventListener(
                    "click",
                    function (event) {

                        const confirmLogin = window.confirm(
                            "Vous devez être connecté pour continuer vers le paiement.\n\n" +
                            "Voulez-vous ouvrir la page de connexion ?"
                        );

                        if (confirmLogin) {

                            event.preventDefault();

                            window.location.href =
                                getPageLink(
                                    "connexion.html"
                                ) +
                                "?redirect=paiement.html";

                        } else {

                            event.preventDefault();
                        }
                    }
                );
            });
    }

    function init() {
        updateAccountNavigation();
        protectCheckoutLinks();
    }

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();
    }

    /*
     * API disponible globalement si nécessaire.
     */
    window.PrimoIdeoAccount = {
        getCurrentUser: getCurrentUser,
        logout: logout,
        updateAccountNavigation: updateAccountNavigation
    };

})();