/* =========================================================
   PRIMO-IDÉO
   Catalogue + interface commune + panier
   ========================================================= */

(function () {

    "use strict";

    /* =====================================================
       DONNÉES
       ===================================================== */

    const DATA = window.PRIMO_DATA || {
        products: [],
        categories: [],
        site_info: {}
    };

    const PRODUCTS = Array.isArray(DATA.products)
        ? DATA.products
        : [];

    const CATEGORIES = Array.isArray(DATA.categories)
        ? DATA.categories
        : [];

    const INFO = DATA.site_info || {};


    /* =====================================================
       UTILITAIRES
       ===================================================== */

    function esc(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function normalize(value) {

        return String(value ?? "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }


    const usefulProducts = PRODUCTS.filter(function (product) {

        return (
            product &&
            product.name &&
            product.url &&
            !String(product.name)
                .toLowerCase()
                .startsWith("primo-ideo :")
        );

    });


    /* =====================================================
       IMAGE PRODUIT
       ===================================================== */

    function imageOf(product) {

        if (!product) {
            return "";
        }

        return (
            product.image ||
            product.image_url ||
            (
                Array.isArray(product.images)
                    ? product.images[0]
                    : ""
            ) ||
            ""
        );
    }


    /* =====================================================
       PRIX
       ===================================================== */

    function priceOf(product) {

        const raw = String(
            product?.price ?? ""
        ).trim();

        if (!raw) {
            return "Prix sur demande";
        }

        const number = Number(
            raw
                .replace(/\s/g, "")
                .replace(",", ".")
                .replace(/[^0-9.\-]/g, "")
        );

        if (Number.isFinite(number)) {

            return new Intl.NumberFormat(
                "fr-FR",
                {
                    style: "currency",
                    currency: "EUR"
                }
            ).format(number);
        }

        return raw;
    }


    function num(value) {

        const number = Number(
            String(value || "")
                .replace(/\s/g, "")
                .replace(",", ".")
                .replace(/[^0-9.\-]/g, "")
        );

        return Number.isFinite(number)
            ? number
            : 0;
    }


    /* =====================================================
       CHEMIN DES PAGES
       ===================================================== */

    function basePath() {

        return location.pathname.includes("/pages/")
            ? "../"
            : "./";
    }


    function link(path) {

        return basePath() + path;
    }


    /* =====================================================
       PANIER
       IMPORTANT :
       On utilise "cart" comme dans panier.html
       ===================================================== */

    function cart() {

        try {

            const data =
                localStorage.getItem("cart");

            if (!data) {
                return [];
            }

            const result =
                JSON.parse(data);

            return Array.isArray(result)
                ? result
                : [];

        } catch (error) {

            console.error(
                "Erreur lecture panier :",
                error
            );

            return [];
        }
    }


    function saveCart(items) {

        localStorage.setItem(
            "cart",
            JSON.stringify(items)
        );
    }


    function cartCount() {

        return cart().reduce(
            function (total, item) {

                return total +
                    Number(item.quantity || 1);

            },
            0
        );
    }


    function updateCartCount() {

        document
            .querySelectorAll(".cart-count")
            .forEach(function (element) {

                element.textContent =
                    cartCount();

            });
    }


    /* =====================================================
       AJOUTER AU PANIER
       ===================================================== */

    function addToCart(id) {

        const product =
            usefulProducts.find(function (item) {

                return String(item.id) ===
                    String(id);

            });


        if (!product) {

            alert(
                "Produit introuvable."
            );

            return;
        }


        const items = cart();


        const existing =
            items.find(function (item) {

                return String(item.id) ===
                    String(id);

            });


        if (existing) {

            existing.quantity =
                Number(existing.quantity || 1) + 1;

        } else {

            items.push({

                id: product.id,

                name:
                    product.name || "Produit",

                price:
                    product.price || "",

                image:
                    imageOf(product),

                reference:
                    product.reference || "",

                quantity: 1
            });
        }


        saveCart(items);

        updateCartCount();


        alert(
            "Produit ajouté au panier."
        );
    }


    window.addToCart =
        addToCart;


    /* =====================================================
       EN-TÊTE / FOOTER
       ===================================================== */

    function shell() {

        const root =
            basePath();


        document.body.insertAdjacentHTML(

            "afterbegin",

            `
            <div class="topbar">

                <div class="container topbar-inner">

                    <span>
                        Primo-Idéo • produits, services & conseils
                    </span>

                    <span>
                        Neuf • garanti • informations claires
                    </span>

                </div>

            </div>


            <header class="site-header">

                <div class="container header-main">

                    <a
                        class="logo"
                        href="${root}index.html"
                    >
                        PRIMO<span>-IDÉO</span>
                    </a>


                    <form
                        class="search-form"
                        id="globalSearch"
                    >

                        <input
                            id="globalSearchInput"
                            type="search"
                            placeholder="Rechercher un produit..."
                            autocomplete="off"
                        >

                        <button type="submit">
                            Rechercher
                        </button>

                    </form>


                    <div class="header-actions">

                        <a
                            href="${root}pages/connexion.html"
                        >
                            Compte
                        </a>

                        <a
                            href="${root}pages/panier.html"
                        >
                            🛒 Panier
                            <b class="cart-count">
                                0
                            </b>
                        </a>

                    </div>

                </div>


                <nav class="main-nav">

                    <div class="container">

                        <a href="${root}index.html">
                            Accueil
                        </a>

                        <a href="${root}pages/categories.html">
                            Catégories
                        </a>

                        <a href="${root}pages/produits.html">
                            Produits
                        </a>

                        <a href="${root}pages/services.html">
                            À propos
                        </a>

                        <a href="${root}pages/livraison.html">
                            Livraison
                        </a>

                        <a href="${root}pages/contact.html">
                            Contact
                        </a>

                        <a
                            class="nav-cta"
                            href="${root}pages/contact.html"
                        >
                            Contact
                        </a>

                    </div>

                </nav>

            </header>
            `
        );


        document.body.insertAdjacentHTML(

            "beforeend",

            `
            <footer class="footer">

                <div class="container footer-grid">


                    <div>

                        <h3>
                            PRIMO-IDÉO
                        </h3>

                        <p>
                            Produits, services et conseils.
                        </p>

                    </div>


                    <div>

                        <h4>
                            Navigation
                        </h4>

                        <a href="${root}pages/categories.html">
                            Catégories
                        </a>

                        <a href="${root}pages/produits.html">
                            Produits
                        </a>

                        <a href="${root}pages/livraison.html">
                            Livraison
                        </a>

                        <a href="${root}pages/contact.html">
                            Contact
                        </a>

                    </div>


                    <div>

                        <h4>
                            Contact
                        </h4>

                        <p>
                            ${esc(
                                INFO.contact?.phone ||
                                "03 65 65 66 90"
                            )}
                        </p>

                        <p>
                            ${esc(
                                INFO.contact?.email ||
                                "contact@primo-ideo.com"
                            )}
                        </p>

                    </div>


                    <div>

                        <h4>
                            Dépôt
                        </h4>

                        <p>
                            ${esc(
                                INFO.address ||
                                "55 route de Senlis - 60330 Lagny le Sec"
                            )}
                        </p>

                    </div>


                </div>


                <div class="footer-bottom">

                    © ${new Date().getFullYear()}
                    Primo Distribution

                </div>

            </footer>
            `
        );


        updateCartCount();
    }


    /* =====================================================
       CARTE PRODUIT
       Compatible avec style.css
       ===================================================== */

    function productCard(product) {

        const id =
            product.id ||
            product.reference ||
            product.url;


        const image =
            imageOf(product);


        const productLink =
            link(
                "pages/produit.html?id=" +
                encodeURIComponent(id)
            );


        return `

        <article class="product-card">


            <a
                class="product-image"
                href="${productLink}"
            >

                ${
                    image

                        ? `

                        <img
                            src="${esc(image)}"
                            alt="${esc(product.name)}"
                            loading="lazy"

                            onerror="
                                this.parentElement.classList.add('no-image');
                                this.remove();
                            "
                        >

                        `

                        : `

                        <span>
                            Image indisponible
                        </span>

                        `
                }

            </a>


            <div class="product-body">


                <div class="product-brand">

                    ${esc(
                        product.brand ||
                        "Primo-Idéo"
                    )}

                </div>


                <a href="${productLink}">

                    <h3>
                        ${esc(product.name)}
                    </h3>

                </a>


                ${
                    product.category

                        ? `

                        <p class="product-cat">

                            ${esc(
                                product.category
                            )}

                        </p>

                        `

                        : ""
                }


                <strong class="price">

                    ${esc(
                        priceOf(product)
                    )}

                </strong>


                <div class="product-actions">


                    <a
                        class="btn btn-light-outline"
                        href="${productLink}"
                    >
                        Voir
                    </a>


                    <button
                        type="button"
                        class="btn btn-primary"
                        onclick="addToCart('${esc(id)}')"
                    >
                        🛒 Panier
                    </button>


                </div>


            </div>


        </article>

        `;
    }


    /* =====================================================
       CATÉGORIE
       ===================================================== */

    function categoryCard(category) {

        const count =
            Number(
                category.product_count || 0
            );


        return `

        <a
            class="category-card"
            href="${link(
                "pages/produits.html?category=" +
                encodeURIComponent(category.name)
            )}"
        >

            <div class="category-icon">

                ${icon(category.name)}

            </div>


            <div>

                <h3>

                    ${esc(
                        category.name
                    )}

                </h3>


                <p>

                    ${count}
                    produit${count > 1 ? "s" : ""}

                </p>

            </div>

        </a>

        `;
    }


    function icon(name) {

        const n =
            normalize(name);


        if (n.includes("cuisine"))
            return "🍳";

        if (n.includes("gros"))
            return "🧊";

        if (n.includes("petit"))
            return "☕";

        if (n.includes("chauffage"))
            return "🔥";

        if (n.includes("jardin"))
            return "🌿";

        if (n.includes("image"))
            return "📺";

        if (n.includes("ecologique"))
            return "⚡";


        return "🛍️";
    }


    /* =====================================================
       ACCUEIL
       ===================================================== */

    function renderHome() {

        const categories =
            document.getElementById(
                "homeCategories"
            );


        if (categories) {

            categories.innerHTML =
                CATEGORIES
                    .map(categoryCard)
                    .join("");
        }


        const products =
            document.getElementById(
                "homeProducts"
            );


        if (products) {

            products.innerHTML =
                usefulProducts
                    .slice(0, 8)
                    .map(productCard)
                    .join("");
        }
    }


    /* =====================================================
       CATÉGORIES
       ===================================================== */

    function renderCategories() {

        const element =
            document.getElementById(
                "categories"
            );


        if (element) {

            element.innerHTML =
                CATEGORIES
                    .map(categoryCard)
                    .join("");
        }
    }


    /* =====================================================
       FILTRE PRODUITS
       ===================================================== */

    function matches(
        product,
        term,
        category
    ) {

        const haystack =
            normalize([

                product.name,

                product.brand,

                product.reference,

                product.category,

                product.subcategory,

                product.description,

                product.url

            ].join(" "));


        return (

            (
                !term ||
                haystack.includes(
                    normalize(term)
                )
            )

            &&

            (
                !category ||
                normalize(product.category) ===
                normalize(category)
            )

        );
    }


    /* =====================================================
       PAGE PRODUITS
       ===================================================== */

    function renderProducts() {

        const grid =
            document.getElementById(
                "productsGrid"
            );


        if (!grid) {
            return;
        }


        const params =
            new URLSearchParams(
                location.search
            );


        const initialCategory =
            params.get("category") || "";


        const initialSearch =
            params.get("q") ||
            params.get("search") ||
            "";


        const search =
            document.getElementById(
                "productSearch"
            );


        const select =
            document.getElementById(
                "categoryFilter"
            );


        const sort =
            document.getElementById(
                "sortProducts"
            );


        if (search && initialSearch) {

            search.value =
                initialSearch;
        }


        if (select) {

            select.innerHTML =

                `
                <option value="">
                    Toutes les catégories
                </option>
                `

                +

                CATEGORIES
                    .map(function (category) {

                        return `

                        <option
                            value="${esc(category.name)}"
                        >
                            ${esc(category.name)}
                        </option>

                        `;

                    })
                    .join("");


            if (initialCategory) {

                select.value =
                    initialCategory;
            }
        }


        function draw() {

            let list =
                usefulProducts.filter(
                    function (product) {

                        return matches(

                            product,

                            search?.value || "",

                            select?.value || ""

                        );

                    }
                );


            const sortValue =
                sort?.value || "";


            if (sortValue === "priceAsc") {

                list.sort(
                    function (a, b) {

                        return (
                            num(a.price) -
                            num(b.price)
                        );

                    }
                );
            }


            if (sortValue === "priceDesc") {

                list.sort(
                    function (a, b) {

                        return (
                            num(b.price) -
                            num(a.price)
                        );

                    }
                );
            }


            if (sortValue === "name") {

                list.sort(
                    function (a, b) {

                        return a.name.localeCompare(
                            b.name,
                            "fr"
                        );

                    }
                );
            }


            grid.innerHTML =

                list.length

                    ? list
                        .map(productCard)
                        .join("")

                    : `

                    <div class="empty-state">

                        <h2>
                            Aucun produit trouvé
                        </h2>

                        <p>
                            Essayez une autre recherche.
                        </p>

                    </div>

                    `;
        }


        [search, select, sort]
            .filter(Boolean)
            .forEach(function (element) {

                element.addEventListener(
                    "input",
                    draw
                );

            });


        [select, sort]
            .filter(Boolean)
            .forEach(function (element) {

                element.addEventListener(
                    "change",
                    draw
                );

            });


        draw();
    }


    /* =====================================================
       PAGE DÉTAIL PRODUIT
       ===================================================== */

    function renderProductDetail() {

        const element =
            document.getElementById(
                "productDetail"
            );


        if (!element) {
            return;
        }


        const id =
            new URLSearchParams(
                location.search
            ).get("id");


        const product =
            usefulProducts.find(
                function (item) {

                    return (

                        String(item.id) ===
                        String(id)

                        ||

                        String(item.reference) ===
                        String(id)

                    );

                }
            );


        if (!product) {

            element.innerHTML = `

                <div class="empty-state">

                    <h1>
                        Produit introuvable
                    </h1>

                    <p>
                        Ce produit n'existe pas
                        dans les données.
                    </p>

                </div>

            `;

            return;
        }


        const image =
            imageOf(product);


        element.innerHTML = `

        <div class="detail-card">


            <div class="detail-image">

                ${
                    image

                        ? `

                        <img
                            src="${esc(image)}"
                            alt="${esc(product.name)}"
                        >

                        `

                        : `

                        Image indisponible

                        `
                }

            </div>


            <div class="detail-info">


                <span class="eyebrow">

                    ${esc(
                        product.brand ||
                        "Primo-Idéo"
                    )}

                </span>


                <h1>

                    ${esc(
                        product.name
                    )}

                </h1>


                <div class="detail-price">

                    ${esc(
                        priceOf(product)
                    )}

                </div>


                ${
                    product.description

                        ? `

                        <p>

                            ${esc(
                                product.description
                            )}

                        </p>

                        `

                        : ""
                }


                <dl>


                    ${
                        product.reference

                            ? `

                            <dt>
                                Référence
                            </dt>

                            <dd>

                                ${esc(
                                    product.reference
                                )}

                            </dd>

                            `

                            : ""
                    }


                    ${
                        product.category

                            ? `

                            <dt>
                                Catégorie
                            </dt>

                            <dd>

                                ${esc(
                                    product.category
                                )}

                            </dd>

                            `

                            : ""
                    }


                    ${
                        product.subcategory

                            ? `

                            <dt>
                                Sous-catégorie
                            </dt>

                            <dd>

                                ${esc(
                                    product.subcategory
                                )}

                            </dd>

                            `

                            : ""
                    }


                </dl>


                <div class="product-actions">


                    <button
                        type="button"
                        class="btn btn-primary"
                        onclick="addToCart('${esc(product.id)}')"
                    >
                        🛒 Ajouter au panier
                    </button>


                    ${
                        product.url

                            ? `

                            <a
                                class="btn btn-light-outline"
                                target="_blank"
                                rel="noopener"
                                href="${esc(product.url)}"
                            >
                                Voir la fiche source
                            </a>

                            `

                            : ""
                    }


                </div>


            </div>

        </div>

        `;
    }


    /* =====================================================
       INFORMATIONS STATIQUES
       ===================================================== */

    function renderStaticInfo() {

        const phone =
            INFO.contact?.phone ||
            "03 65 65 66 90";


        const email =
            INFO.contact?.email ||
            "contact@primo-ideo.com";


        document
            .querySelectorAll("[data-phone]")
            .forEach(function (element) {

                element.textContent =
                    phone;

            });


        document
            .querySelectorAll("[data-email]")
            .forEach(function (element) {

                element.textContent =
                    email;

            });


        document
            .querySelectorAll("[data-address]")
            .forEach(function (element) {

                element.textContent =
                    INFO.address ||
                    "55 route de Senlis - 60330 Lagny le Sec";

            });


        document
            .querySelectorAll("[data-hours]")
            .forEach(function (element) {

                element.innerHTML = `

                    ${esc(
                        INFO.contact?.hours?.weekdays ||
                        "Lundi–vendredi : 9h30–18h30"
                    )}

                    <br>

                    ${esc(
                        INFO.contact?.hours?.saturday ||
                        "Samedi : 10h–17h30"
                    )}

                `;

            });
    }


    /* =====================================================
       RECHERCHE GLOBALE
       ===================================================== */

    function renderSearch() {

        const form =
            document.getElementById(
                "globalSearch"
            );


        if (!form) {
            return;
        }


        form.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                const input =
                    document.getElementById(
                        "globalSearchInput"
                    );


                const query =
                    input
                        ? input.value.trim()
                        : "";


                location.href =

                    link(
                        "pages/produits.html"
                    )

                    +

                    (
                        query
                            ? "?q=" +
                              encodeURIComponent(query)
                            : ""
                    );

            }
        );
    }


    /* =====================================================
       RECHERCHE SUR PAGE PRODUITS
       ===================================================== */

    function renderQuerySearch() {

        const query =
            new URLSearchParams(
                location.search
            ).get("q");


        const search =
            document.getElementById(
                "productSearch"
            );


        if (
            query &&
            search
        ) {

            search.value =
                query;

            search.dispatchEvent(
                new Event("input")
            );
        }
    }


    /* =====================================================
       PANIER
       ===================================================== */

    function renderCart() {

        const element =
            document.getElementById(
                "cartItems"
            );


        const oldElement =
            document.getElementById(
                "cart-content"
            );


        const container =
            element ||
            oldElement;


        if (!container) {
            return;
        }


        const items =
            cart();


        updateCartCount();


        /* PANIER VIDE */

        if (!items.length) {

            container.innerHTML = `

                <div class="empty-state">

                    <div
                        style="font-size:60px;"
                    >
                        🛒
                    </div>

                    <h2>
                        Votre panier est vide
                    </h2>

                    <p>
                        Vous n'avez encore ajouté
                        aucun produit.
                    </p>

                    <a
                        href="${link(
                            "pages/produits.html"
                        )}"
                        class="btn btn-primary"
                    >
                        Voir les produits
                    </a>

                </div>

            `;

            return;
        }


        let total = 0;


        items.forEach(function (item) {

            const quantity =
                Number(item.quantity) || 1;


            total +=
                num(item.price) *
                quantity;

        });


        container.innerHTML = `

            <div class="cart-list">

                ${items.map(

                    function (item, index) {

                        const quantity =
                            Number(
                                item.quantity
                            ) || 1;


                        const price =
                            num(item.price);


                        const subtotal =
                            price * quantity;


                        const image =
                            item.image ||
                            item.image_url ||
                            "";


                        return `

                        <div class="cart-item">


                            <div class="cart-product">


                                ${
                                    image

                                        ? `

                                        <img
                                            src="${esc(image)}"
                                            alt="${esc(item.name)}"
                                            class="cart-product-image"

                                            onerror="
                                                this.style.display='none';
                                            "
                                        >

                                        `

                                        : `

                                        <div
                                            class="cart-image-placeholder"
                                        >
                                            📦
                                        </div>

                                        `
                                }


                                <div
                                    class="cart-product-info"
                                >


                                    <a
                                        href="${link(
                                            "pages/produit.html?id=" +
                                            encodeURIComponent(
                                                item.id ||
                                                item.reference ||
                                                index
                                            )
                                        )}"
                                        class="cart-product-name"
                                    >

                                        ${esc(
                                            item.name ||
                                            "Produit"
                                        )}

                                    </a>


                                    ${
                                        item.reference

                                            ? `

                                            <small>

                                                Référence :
                                                ${esc(
                                                    item.reference
                                                )}

                                            </small>

                                            `

                                            : ""
                                    }


                                </div>


                            </div>


                            <div class="cart-price">

                                ${price.toLocaleString(
                                    "fr-FR",
                                    {
                                        maximumFractionDigits: 2
                                    }
                                )} €

                            </div>


                            <div class="cart-quantity">


                                <button
                                    type="button"
                                    onclick="changeQuantity(${index}, -1)"
                                >
                                    −
                                </button>


                                <span>
                                    ${quantity}
                                </span>


                                <button
                                    type="button"
                                    onclick="changeQuantity(${index}, 1)"
                                >
                                    +
                                </button>


                            </div>


                            <div class="cart-subtotal">

                                ${subtotal.toLocaleString(
                                    "fr-FR",
                                    {
                                        maximumFractionDigits: 2
                                    }
                                )} €

                            </div>


                            <button
                                type="button"
                                class="cart-remove"
                                onclick="removeFromCart(${index})"
                            >
                                Supprimer
                            </button>


                        </div>

                        `;

                    }

                ).join("")}

            </div>


            <div class="cart-actions">


                <button
                    type="button"
                    class="btn btn-secondary"
                    onclick="clearCart()"
                >
                    Vider le panier
                </button>


                <a
                    href="${link(
                        "pages/produits.html"
                    )}"
                    class="btn btn-secondary"
                >
                    Continuer mes achats
                </a>


            </div>


            <div class="cart-summary">


                <h2>
                    Résumé de la commande
                </h2>


                <div class="summary-line">

                    <span>
                        Sous-total
                    </span>

                    <strong>

                        ${total.toLocaleString(
                            "fr-FR",
                            {
                                maximumFractionDigits: 2
                            }
                        )} €

                    </strong>

                </div>


                <div class="summary-line">

                    <span>
                        Livraison
                    </span>

                    <span>
                        À définir
                    </span>

                </div>


                <hr>


                <div class="summary-total">

                    <span>
                        Total
                    </span>

                    <strong>

                        ${total.toLocaleString(
                            "fr-FR",
                            {
                                maximumFractionDigits: 2
                            }
                        )} €

                    </strong>

                </div>


                <div
                    style="
                        display:flex;
                        gap:10px;
                        flex-wrap:wrap;
                        margin-top:20px;
                    "
                >


                    <a
                        href="${link(
                            "pages/paiement.html"
                        )}"
                        class="btn btn-primary"
                    >
                        Passer au paiement
                    </a>


                    <button
                        type="button"
                        class="btn btn-primary"
                        onclick="validerCommande()"
                    >
                        ✓ Valider la commande
                    </button>


                </div>


            </div>

        `;
    }


    /* =====================================================
       MODIFIER QUANTITÉ
       ===================================================== */

    function changeQuantity(
        index,
        amount
    ) {

        const items =
            cart();


        if (!items[index]) {
            return;
        }


        let quantity =
            Number(
                items[index].quantity
            ) || 1;


        quantity += amount;


        if (quantity <= 0) {

            items.splice(
                index,
                1
            );

        } else {

            items[index].quantity =
                quantity;
        }


        saveCart(items);

        updateCartCount();

        renderCart();
    }


    window.changeQuantity =
        changeQuantity;


    /* =====================================================
       SUPPRIMER UN PRODUIT
       ===================================================== */

    function removeFromCart(index) {

        const items =
            cart();


        if (!items[index]) {
            return;
        }


        items.splice(
            index,
            1
        );


        saveCart(items);

        updateCartCount();

        renderCart();
    }


    window.removeFromCart =
        removeFromCart;


    /* =====================================================
       VIDER LE PANIER
       ===================================================== */

    function clearCart() {

        const confirmation =
            confirm(
                "Voulez-vous vraiment vider le panier ?"
            );


        if (!confirmation) {
            return;
        }


        localStorage.removeItem(
            "cart"
        );


        updateCartCount();

        renderCart();
    }


    window.clearCart =
        clearCart;


    /* =====================================================
       VALIDATION COMMANDE
       ===================================================== */

    function validerCommande() {

        const items =
            cart();


        if (
            !items ||
            items.length === 0
        ) {

            alert(
                "Votre panier est vide."
            );

            return;
        }


        const confirmation =
            confirm(
                "Voulez-vous valider cette commande ?"
            );


        if (!confirmation) {
            return;
        }


        let total = 0;


        items.forEach(
            function (item) {

                const quantity =
                    Number(
                        item.quantity
                    ) || 1;


                const price =
                    num(item.price);


                total +=
                    price *
                    quantity;

            }
        );


        const orderNumber =
            "PI-" +
            Date.now();


        const commande = {

            numero:
                orderNumber,

            date:
                new Date()
                    .toLocaleString(
                        "fr-FR"
                    ),

            produits:
                items,

            total:
                total
        };


        let commandes = [];


        try {

            commandes =
                JSON.parse(
                    localStorage.getItem(
                        "commandes"
                    ) || "[]"
                );


            if (!Array.isArray(commandes)) {
                commandes = [];
            }

        } catch (error) {

            console.error(
                "Erreur commandes :",
                error
            );

            commandes = [];
        }


        commandes.push(
            commande
        );


        localStorage.setItem(
            "commandes",
            JSON.stringify(
                commandes
            )
        );


        localStorage.removeItem(
            "cart"
        );


        updateCartCount();


        alert(

            "Commande validée avec succès !\n\n" +

            "Numéro de commande : " +

            orderNumber

        );


        renderCart();
    }


    window.validerCommande =
        validerCommande;


    /* =====================================================
       INITIALISATION
       ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        function () {


            /*
             * On retire uniquement les anciens
             * éléments communs.
             */

            document
                .querySelectorAll(
                    "body > header, body > nav, body > .topbar, body > .footer"
                )
                .forEach(function (element) {

                    element.remove();

                });


            shell();


            renderHome();

            renderCategories();

            renderProducts();

            renderProductDetail();

            renderStaticInfo();

            renderSearch();

            renderQuerySearch();

            renderCart();

            updateCartCount();

        }
    );

})();