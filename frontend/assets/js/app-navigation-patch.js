
 
  

function currentPage() {
  const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  return file === '' ? 'index.html' : file;
}

function navActive(fileNames) {
  const current = currentPage();
  return fileNames.includes(current) ? ' active' : '';
}

function categoryNavigation() {
  if (!CATEGORIES.length) {
    return '<a href="' + link('pages/categories.html') + '"><span>›</span>Toutes les catégories</a>';
  }

  return CATEGORIES.map(function (c) {
    const name = String(c.name || '').trim();
    if (!name) return '';

    const count = Number(c.product_count || 0);

    return `
      <a href="${link('pages/produits.html?category=' + encodeURIComponent(name))}">
        <span>›</span>
        ${esc(name)}
        ${count ? `<small class="cat-count">${count}</small>` : ''}
      </a>
    `;
  }).join('');
}

function toggleMobileMenu(force) {
  const menu = document.getElementById('mainNavigation');
  const button = document.getElementById('mobileMenuButton');

  if (!menu || !button) return;

  const open = typeof force === 'boolean'
    ? force
    : !menu.classList.contains('open');

  menu.classList.toggle('open', open);
  button.classList.toggle('open', open);
  button.setAttribute('aria-expanded', String(open));
  button.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
}

function closeNavigation() {
  toggleMobileMenu(false);
  document.querySelectorAll('.nav-dropdown.open').forEach(function (item) {
    item.classList.remove('open');
  });
}

function setupNavigation() {
  const menuButton = document.getElementById('mobileMenuButton');

  if (menuButton) {
    menuButton.addEventListener('click', function () {
      toggleMobileMenu();
    });
  }

  document.querySelectorAll('[data-nav-dropdown]').forEach(function (dropdown) {
    const toggle = dropdown.querySelector('.nav-dropdown-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', function (event) {
      event.preventDefault();

      const isOpen = dropdown.classList.contains('open');

      document.querySelectorAll('.nav-dropdown.open').forEach(function (item) {
        item.classList.remove('open');
      });

      dropdown.classList.toggle('open', !isOpen);
      toggle.setAttribute('aria-expanded', String(!isOpen));
    });
  });

  document.querySelectorAll('.main-nav a').forEach(function (anchor) {
    anchor.addEventListener('click', function () {
      if (window.innerWidth <= 850) {
        closeNavigation();
      }
    });
  });

  document.addEventListener('click', function (event) {
    const navigation = document.querySelector('.main-nav');

    if (navigation && !navigation.contains(event.target)) {
      document.querySelectorAll('.nav-dropdown.open').forEach(function (item) {
        item.classList.remove('open');
      });
    }
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 850) {
      const menu = document.getElementById('mainNavigation');
      const button = document.getElementById('mobileMenuButton');

      menu?.classList.remove('open');
      button?.classList.remove('open');
      button?.setAttribute('aria-expanded', 'false');
      button?.setAttribute('aria-label', 'Ouvrir le menu');
    }
  });
}

/* ============================================================
   NOUVELLE NAVIGATION
   Remplace l'ancien contenu de shell() par cette version.
   ============================================================ */
function shell() {
  const root = basePath();
  const categoriesActive = navActive(['categories.html', 'produits.html', 'produit.html']);

  document.body.insertAdjacentHTML('afterbegin', `
    <div class="topbar">
      <div class="container topbar-inner">
        <span>Primo-Idéo • produits, services & conseils</span>

        <div class="topbar-links">
          <a href="${root}pages/devis.html">Commander</a>
          <a href="${root}pages/panier.html">
            Panier <b class="cart-count">0</b>
          </a>
          <a href="${root}pages/connexion.html">Connexion</a>
          <a href="${root}pages/mon-compte.html">Mon compte</a>
          <a href="${root}pages/contact.html">Aide</a>
        </div>
      </div>
    </div>

    <header class="site-header">
      <div class="container header-main">

        <a class="logo"
           href="${root}index.html"
           aria-label="Primo-Idéo — accueil">
          PRIMO<span>-IDÉO</span>
        </a>

        <form class="search-form" id="globalSearch" role="search">
          <input
            id="globalSearchInput"
            placeholder="Rechercher un produit..."
            autocomplete="off"
            aria-label="Rechercher un produit"
          >
          <button type="submit">Rechercher</button>
        </form>

        <div class="header-actions">
          <a href="${root}pages/connexion.html">Compte</a>
          <a href="${root}pages/panier.html">
            Panier <b class="cart-count">0</b>
          </a>
        </div>

        <button
          id="mobileMenuButton"
          class="mobile-menu-button"
          type="button"
          aria-controls="mainNavigation"
          aria-expanded="false"
          aria-label="Ouvrir le menu"
        >
          <span class="hamburger"></span>
        </button>
      </div>

      <nav class="main-nav" aria-label="Navigation principale">
        <div class="container main-nav-inner" id="mainNavigation">

          <a
            class="nav-link${navActive(['index.html'])}"
            href="${root}index.html"
          >
            Accueil
          </a>

          <div class="nav-dropdown" data-nav-dropdown>
            <button
              class="nav-dropdown-toggle${categoriesActive}"
              type="button"
              aria-expanded="false"
            >
              Catégories <span class="chevron">▼</span>
            </button>

            <div class="nav-dropdown-menu" role="menu">
              ${categoryNavigation()}

              <a href="${root}pages/categories.html">
                <span>›</span>
                <strong>Toutes les catégories</strong>
              </a>
            </div>
          </div>

          <a
            class="nav-link${navActive(['produits.html', 'produit.html'])}"
            href="${root}pages/produits.html"
          >
            Produits
          </a>

          <a
            class="nav-link${navActive(['services.html'])}"
            href="${root}pages/services.html"
          >
            À propos
          </a>

          <a
            class="nav-link${navActive(['livraison.html'])}"
            href="${root}pages/livraison.html"
          >
            Livraison
          </a>

          <a
            class="nav-link${navActive(['contact.html'])}"
            href="${root}pages/contact.html"
          >
            Contact
          </a>

          <a
            class="nav-link nav-cta${navActive(['devis.html'])}"
            href="${root}pages/devis.html"
          >
            Devis Express
          </a>

        </div>
      </nav>
    </header>
  `);

  document.body.insertAdjacentHTML('beforeend', `
    <footer class="footer">
      <div class="container footer-grid">
        <div>
          <h3>PRIMO-IDÉO</h3>
          <p>Produits, services et conseils.</p>
        </div>

        <div>
          <h4>Navigation</h4>
          <a href="${root}pages/categories.html">Catégories</a>
          <a href="${root}pages/produits.html">Produits</a>
          <a href="${root}pages/livraison.html">Livraison</a>
          <a href="${root}pages/contact.html">Contact</a>
        </div>

        <div>
          <h4>Contact</h4>
          <p>${esc(INFO.contact?.phone || '03 65 65 66 90')}</p>
          <p>${esc(INFO.contact?.email || 'contact@primo-ideo.com')}</p>
        </div>

        <div>
          <h4>Dépôt</h4>
          <p>${esc(INFO.address || '55 route de Senlis - 60330 Lagny le Sec')}</p>
        </div>
      </div>

      <div class="footer-bottom">
        © ${new Date().getFullYear()} Primo Distribution — interface modernisée.
      </div>
    </footer>
  `);

  setupNavigation();
  updateCartCount();
}

