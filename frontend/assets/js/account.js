"use strict";


/* =====================================================
   PRIMO-IDÉO
   Gestion du compte client - Front-end
   ===================================================== */

const USERS_KEY =
    "primoIdeoUsers";

const CURRENT_USER_KEY =
    "primoIdeoCurrentUser";


/* =====================================================
   UTILITAIRES
   ===================================================== */

function getUsers() {

    try {

        const users =
            JSON.parse(
                localStorage.getItem(USERS_KEY)
                || "[]"
            );

        return Array.isArray(users)
            ? users
            : [];

    } catch (error) {

        return [];

    }

}


function saveUsers(users) {

    localStorage.setItem(
        USERS_KEY,
        JSON.stringify(users)
    );

}


function getCurrentUser() {

    try {

        return JSON.parse(
            localStorage.getItem(
                CURRENT_USER_KEY
            )
        );

    } catch (error) {

        return null;

    }

}


function saveCurrentUser(user) {

    localStorage.setItem(
        CURRENT_USER_KEY,
        JSON.stringify(user)
    );

}


function logout() {

    localStorage.removeItem(
        CURRENT_USER_KEY
    );

    window.location.href =
        "connexion.html";

}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =====================================================
   INSCRIPTION
   ===================================================== */

const registerForm =
    document.getElementById(
        "registerForm"
    );


if (registerForm) {

    const deliveryType =
        document.querySelectorAll(
            'input[name="deliveryType"]'
        );


    const deliveryAddress =
        document.getElementById(
            "deliveryAddress"
        );


    function updateDeliveryFields() {

        const selected =
            document.querySelector(
                'input[name="deliveryType"]:checked'
            );


        const different =
            selected &&
            selected.value === "differente";


        if (!deliveryAddress) {
            return;
        }


        deliveryAddress.style.display =
            different
                ? ""
                : "none";


        const fields =
            deliveryAddress.querySelectorAll(
                "input, select, textarea"
            );


        fields.forEach(function (field) {

            field.disabled =
                !different;

        });

    }


    deliveryType.forEach(function (radio) {

        radio.addEventListener(
            "change",
            updateDeliveryFields
        );

    });


    updateDeliveryFields();


    registerForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const message =
                document.getElementById(
                    "registerMessage"
                );


            const email =
                document.getElementById(
                    "email"
                ).value.trim().toLowerCase();


            const password =
                document.getElementById(
                    "password"
                ).value;


            const passwordConfirm =
                document.getElementById(
                    "passwordConfirm"
                ).value;


            const name =
                document.getElementById(
                    "name"
                ).value.trim();


            const firstname =
                document.getElementById(
                    "firstname"
                ).value.trim();


            const phone =
                document.getElementById(
                    "phone"
                ).value.trim();


            /* -----------------------------
               VALIDATION MOT DE PASSE
               ----------------------------- */

            if (password.length < 6) {

                message.textContent =
                    "Le mot de passe doit contenir au moins 6 caractères.";

                return;

            }


            if (
                password !==
                passwordConfirm
            ) {

                message.textContent =
                    "Les deux mots de passe ne correspondent pas.";

                return;

            }


            /* -----------------------------
               VERIFICATION EMAIL
               ----------------------------- */

            const users =
                getUsers();


            const existingUser =
                users.find(function (user) {

                    return (
                        user.email ===
                        email
                    );

                });


            if (existingUser) {

                message.textContent =
                    "Cette adresse e-mail possède déjà un compte.";

                return;

            }


            /* -----------------------------
               DONNEES PRINCIPALES
               ----------------------------- */

            const user = {

                id:
                    Date.now().toString(),

                email:
                    email,

                password:
                    password,

                customerType:
                    document.querySelector(
                        'input[name="customerType"]:checked'
                    )?.value || "Particulier",

                civility:
                    document.getElementById(
                        "civility"
                    ).value,

                name:
                    name,

                firstname:
                    firstname,

                company:
                    document.getElementById(
                        "company"
                    ).value.trim(),

                vat:
                    document.getElementById(
                        "vat"
                    ).value.trim(),

                rcs:
                    document.getElementById(
                        "rcs"
                    ).value.trim(),

                phone:
                    phone,

                mobile:
                    document.getElementById(
                        "mobile"
                    ).value.trim(),

                address:
                    document.getElementById(
                        "address"
                    ).value.trim(),

                postalCode:
                    document.getElementById(
                        "postalCode"
                    ).value.trim(),

                city:
                    document.getElementById(
                        "city"
                    ).value.trim(),

                region:
                    document.getElementById(
                        "region"
                    ).value.trim(),

                country:
                    document.getElementById(
                        "country"
                    ).value,

                birthDay:
                    document.getElementById(
                        "birthDay"
                    ).value,

                birthMonth:
                    document.getElementById(
                        "birthMonth"
                    ).value,

                birthYear:
                    document.getElementById(
                        "birthYear"
                    ).value,

                newsletter:
                    document.getElementById(
                        "newsletter"
                    ).checked,

                deliveryType:
                    document.querySelector(
                        'input[name="deliveryType"]:checked'
                    )?.value || "identique",

                delivery: {}

            };


            /* -----------------------------
               ADRESSE DE LIVRAISON
               ----------------------------- */

            if (
                user.deliveryType ===
                "differente"
            ) {

                user.delivery = {

                    civility:
                        document.getElementById(
                            "deliveryCivility"
                        ).value,

                    name:
                        document.getElementById(
                            "deliveryName"
                        ).value.trim(),

                    firstname:
                        document.getElementById(
                            "deliveryFirstname"
                        ).value.trim(),

                    company:
                        document.getElementById(
                            "deliveryCompany"
                        ).value.trim(),

                    phone:
                        document.getElementById(
                            "deliveryPhone"
                        ).value.trim(),

                    mobile:
                        document.getElementById(
                            "deliveryMobile"
                        ).value.trim(),

                    address:
                        document.getElementById(
                            "deliveryAddressText"
                        ).value.trim(),

                    postalCode:
                        document.getElementById(
                            "deliveryPostalCode"
                        ).value.trim(),

                    city:
                        document.getElementById(
                            "deliveryCity"
                        ).value.trim(),

                    region:
                        document.getElementById(
                            "deliveryRegion"
                        ).value.trim(),

                    country:
                        document.getElementById(
                            "deliveryCountry"
                        ).value

                };

            }


            /* -----------------------------
               ENREGISTREMENT
               ----------------------------- */

            users.push(user);

            saveUsers(users);


            message.innerHTML =
                "<p>Votre compte a été créé avec succès.</p>" +
                "<p>Redirection vers la connexion...</p>";


            setTimeout(function () {

                window.location.href =
                    "connexion.html";

            }, 1000);

        }
    );

}


/* =====================================================
   CONNEXION
   ===================================================== */

const loginForm =
    document.getElementById(
        "loginForm"
    );


if (loginForm) {

    loginForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const email =
                document.getElementById(
                    "loginEmail"
                ).value.trim().toLowerCase();


            const password =
                document.getElementById(
                    "loginPassword"
                ).value;


            const message =
                document.getElementById(
                    "loginMessage"
                );


            const users =
                getUsers();


            const user =
                users.find(function (item) {

                    return (
                        item.email === email &&
                        item.password === password
                    );

                });


            if (!user) {

                message.textContent =
                    "Adresse e-mail ou mot de passe incorrect.";

                return;

            }


            saveCurrentUser(user);


            message.textContent =
                "Connexion réussie. Redirection...";


            setTimeout(function () {

                window.location.href =
                    "mon-compte.html";

            }, 700);

        }
    );


    /* ================================
       MOT DE PASSE OUBLIE
       ================================ */

    const forgotPassword =
        document.getElementById(
            "forgotPassword"
        );


    if (forgotPassword) {

        forgotPassword.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                alert(
                    "La récupération du mot de passe nécessite un serveur ou un service e-mail. Dans cette version front-end, cette fonction n'est pas active."
                );

            }
        );

    }

}


/* =====================================================
   MON COMPTE
   ===================================================== */

const accountContent =
    document.getElementById(
        "accountContent"
    );


if (accountContent) {

    const user =
        getCurrentUser();


    if (!user) {

        accountContent.innerHTML = `

            <section class="account-section">

                <h2>
                    J'ai déjà un compte
                </h2>

                <p>
                    Vous devez être connecté
                    pour accéder à votre compte.
                </p>

                <a
                    href="connexion.html"
                    class="btn btn-primary"
                >
                    Se connecter
                </a>

                <a
                    href="inscription.html"
                    class="btn btn-primary"
                >
                    Créer un compte
                </a>

            </section>

        `;

    } else {

        accountContent.innerHTML = `

            <section class="account-section">

                <h2>
                    Bonjour
                    ${escapeHTML(user.firstname)}
                    ${escapeHTML(user.name)}
                </h2>

                <p>
                    Bienvenue dans votre espace client.
                </p>

            </section>


            <section class="account-section">

                <h2>
                    Mes coordonnées
                </h2>

                <p>
                    <strong>Civilité :</strong>
                    ${escapeHTML(user.civility)}
                </p>

                <p>
                    <strong>Nom :</strong>
                    ${escapeHTML(user.name)}
                </p>

                <p>
                    <strong>Prénom :</strong>
                    ${escapeHTML(user.firstname)}
                </p>

                <p>
                    <strong>E-mail :</strong>
                    ${escapeHTML(user.email)}
                </p>

                <p>
                    <strong>Téléphone :</strong>
                    ${escapeHTML(user.phone)}
                </p>

                <p>
                    <strong>Tél. portable :</strong>
                    ${escapeHTML(user.mobile)}
                </p>

                <p>
                    <strong>Adresse :</strong>
                    ${escapeHTML(user.address)}
                </p>

                <p>
                    <strong>Code postal :</strong>
                    ${escapeHTML(user.postalCode)}
                </p>

                <p>
                    <strong>Ville :</strong>
                    ${escapeHTML(user.city)}
                </p>

                <p>
                    <strong>Région :</strong>
                    ${escapeHTML(user.region)}
                </p>

                <p>
                    <strong>Pays :</strong>
                    ${escapeHTML(user.country)}
                </p>

            </section>


            <section class="account-section">

                <h2>
                    Adresse de livraison
                </h2>

                ${
                    user.deliveryType === "identique"

                    ? `
                        <p>
                            Votre adresse de livraison
                            est identique à votre
                            adresse principale.
                        </p>
                    `

                    : `

                        <p>
                            <strong>Nom :</strong>
                            ${escapeHTML(user.delivery.name)}
                        </p>

                        <p>
                            <strong>Prénom :</strong>
                            ${escapeHTML(user.delivery.firstname)}
                        </p>

                        <p>
                            <strong>Téléphone :</strong>
                            ${escapeHTML(user.delivery.phone)}
                        </p>

                        <p>
                            <strong>Adresse :</strong>
                            ${escapeHTML(user.delivery.address)}
                        </p>

                        <p>
                            <strong>Code postal :</strong>
                            ${escapeHTML(user.delivery.postalCode)}
                        </p>

                        <p>
                            <strong>Ville :</strong>
                            ${escapeHTML(user.delivery.city)}
                        </p>

                        <p>
                            <strong>Région :</strong>
                            ${escapeHTML(user.delivery.region)}
                        </p>

                        <p>
                            <strong>Pays :</strong>
                            ${escapeHTML(user.delivery.country)}
                        </p>

                    `
                }

            </section>


            <section class="account-section">

                <h2>
                    Abonnements
                </h2>

                <p>
                    ${
                        user.newsletter
                        ? "Inscription à la newsletter activée."
                        : "Vous n'êtes pas inscrit à la newsletter."
                    }
                </p>

            </section>


            <section class="account-section">

                <button
                    type="button"
                    id="logoutButton"
                    class="btn btn-primary"
                >
                    Déconnexion
                </button>

            </section>

        `;


        const logoutButton =
            document.getElementById(
                "logoutButton"
            );


        if (logoutButton) {

            logoutButton.addEventListener(
                "click",
                logout
            );

        }

    }

}