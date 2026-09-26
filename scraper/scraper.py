# ============================================================
# PRIMO-IDEO SCRAPER V8
# Scraping catégories + sous-catégories + pagination
# + fiches produits + images
# + CSV / XLSX / JSON
# ============================================================

import os
import re
import json
import time
import hashlib
import logging
from collections import deque
from urllib.parse import urljoin, urlparse, urldefrag

import requests
import pandas as pd
from bs4 import BeautifulSoup


# ============================================================
# CONFIGURATION
# ============================================================

BASE_URL = "https://www.primo-ideo.com/"
BASE_DOMAIN = "www.primo-ideo.com"

OUTPUT_DIR = "output"
IMAGE_DIR = os.path.join(OUTPUT_DIR, "images", "products")

CSV_FILE = os.path.join(OUTPUT_DIR, "primo_ideo_products.csv")
XLSX_FILE = os.path.join(OUTPUT_DIR, "primo_ideo_products.xlsx")
JSON_FILE = os.path.join(OUTPUT_DIR, "primo_ideo_products.json")

VISITED_FILE = os.path.join(OUTPUT_DIR, "visited_urls.json")
ERROR_FILE = os.path.join(OUTPUT_DIR, "errors.json")

MAX_PAGES = 1000
DELAY = 0.8
REQUEST_TIMEOUT = 20
MAX_RETRIES = 3

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/140.0.0.0 Safari/537.36"
)

HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;"
        "q=0.9,image/avif,image/webp,*/*;q=0.8"
    ),
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    "Connection": "keep-alive",
}


# ============================================================
# DOSSIERS
# ============================================================

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(IMAGE_DIR, exist_ok=True)


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

logger = logging.getLogger("PRIMO-IDEO-V8")


# ============================================================
# SESSION HTTP
# ============================================================

session = requests.Session()
session.headers.update(HEADERS)


# ============================================================
# DONNEES
# ============================================================

products = []
visited_urls = set()
errors = []


# ============================================================
# UTILITAIRES
# ============================================================

def clean_text(value):
    """Nettoie un texte HTML."""
    if not value:
        return ""

    value = str(value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def normalize_url(url, base=BASE_URL):
    """Transforme une URL relative en URL absolue."""
    if not url:
        return ""

    url = url.strip()

    if url.startswith("#"):
        return ""

    absolute = urljoin(base, url)
    absolute, _ = urldefrag(absolute)

    return absolute


def is_same_domain(url):
    """Vérifie que l'URL appartient à Primo-Ideo."""
    try:
        parsed = urlparse(url)
        hostname = parsed.netloc.lower()

        return hostname in {
            BASE_DOMAIN,
            "primo-ideo.com",
            "www.primo-ideo.com",
        }

    except Exception:
        return False


def is_http_url(url):
    return url.startswith("http://") or url.startswith("https://")


def safe_filename(value, max_length=150):
    """Crée un nom de fichier sûr."""
    value = clean_text(value)

    value = re.sub(
        r'[<>:"/\\|?*\x00-\x1F]',
        "_",
        value
    )

    value = re.sub(r"\s+", "_", value)

    if not value:
        value = "image"

    return value[:max_length]


def url_hash(url):
    return hashlib.md5(url.encode("utf-8")).hexdigest()[:10]


# ============================================================
# REQUÊTE HTTP ROBUSTE
# ============================================================

def get_page(url):
    """Télécharge une page avec plusieurs tentatives."""

    for attempt in range(1, MAX_RETRIES + 1):

        try:
            logger.info(
                "GET [%s/%s] %s",
                attempt,
                MAX_RETRIES,
                url
            )

            response = session.get(
                url,
                timeout=REQUEST_TIMEOUT
            )

            if response.status_code == 200:

                response.encoding = response.apparent_encoding

                time.sleep(DELAY)

                return response

            logger.warning(
                "HTTP %s : %s",
                response.status_code,
                url
            )

        except requests.RequestException as exc:

            logger.warning(
                "Erreur réseau [%s/%s] : %s",
                attempt,
                MAX_RETRIES,
                exc
            )

        if attempt < MAX_RETRIES:
            time.sleep(2 * attempt)

    errors.append({
        "url": url,
        "error": "Impossible de télécharger la page"
    })

    return None


# ============================================================
# SOUP
# ============================================================

def get_soup(url):
    response = get_page(url)

    if response is None:
        return None

    try:
        return BeautifulSoup(
            response.text,
            "html.parser"
        )

    except Exception as exc:

        logger.error(
            "Erreur BeautifulSoup : %s",
            exc
        )

        errors.append({
            "url": url,
            "error": f"BeautifulSoup: {exc}"
        })

        return None


# ============================================================
# EXTRACTION DES LIENS
# ============================================================

def extract_links(soup, current_url):
    links = set()

    if soup is None:
        return links

    for tag in soup.find_all("a", href=True):

        href = tag.get("href")

        url = normalize_url(
            href,
            current_url
        )

        if not url:
            continue

        if not is_http_url(url):
            continue

        if not is_same_domain(url):
            continue

        links.add(url)

    return links


# ============================================================
# DÉTECTION PRODUIT
# ============================================================

def looks_like_product_url(url):
    """
    Détection souple des fiches produits.

    On utilise plusieurs indices plutôt qu'une seule règle,
    car la structure exacte du site peut varier.
    """

    path = urlparse(url).path.lower()

    keywords = [
        "/produit",
        "/product",
        "produit-",
        "product-",
        ".htm"
    ]

    return any(
        keyword in path
        for keyword in keywords
    )


# ============================================================
# DÉTECTION CATÉGORIE
# ============================================================

def looks_like_category_url(url):
    path = urlparse(url).path.lower()

    keywords = [
        "categorie",
        "category",
        "categories",
        "cuisine",
        "salon",
        "chambre",
        "bureau",
        "jardin",
        "meuble",
        "tendance"
    ]

    return any(
        keyword in path
        for keyword in keywords
    )


# ============================================================
# EXTRACTION DU TITRE
# ============================================================

def extract_title(soup):

    selectors = [
        "h1",
        ".product-title",
        ".product_name",
        ".product-name",
        ".title",
        "[itemprop='name']",
        "title"
    ]

    for selector in selectors:

        element = soup.select_one(selector)

        if element:

            text = clean_text(
                element.get_text(" ", strip=True)
            )

            if text:
                return text

    return ""


# ============================================================
# EXTRACTION PRIX
# ============================================================

def extract_price(soup):

    selectors = [
        ".price",
        ".product-price",
        ".prix",
        ".price-new",
        ".current-price",
        "[itemprop='price']"
    ]

    for selector in selectors:

        element = soup.select_one(selector)

        if element:

            value = clean_text(
                element.get_text(" ", strip=True)
            )

            if value:
                return value

            content = element.get("content")

            if content:
                return clean_text(content)

    # Recherche générale
    text = clean_text(
        soup.get_text(" ", strip=True)
    )

    patterns = [
        r"\d[\d\s.,]*\s*(?:€|EUR|Ar|MGA)",
        r"(?:€|EUR|Ar|MGA)\s*\d[\d\s.,]*"
    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            text,
            flags=re.IGNORECASE
        )

        if match:
            return clean_text(match.group())

    return ""


# ============================================================
# EXTRACTION DESCRIPTION
# ============================================================

def extract_description(soup):
    """
    V9 - Extraction renforcée de la description réelle du produit.
    Aucun texte n'est inventé.
    """

    if soup is None:
        return ""

    selectors = [
        "[itemprop='description']",
        ".product-description",
        ".product_detail",
        ".product-details",
        ".description-produit",
        ".description_product",
        ".description",
        "#description",
        "#product-description",
        "[class*='product-description']",
        "[class*='description-produit']",
        "[id*='description']",
        "[class*='description']",
    ]

    bad_words = (
        "menu", "navigation", "breadcrumb", "fil-ariane",
        "footer", "header", "cookie", "newsletter",
        "social", "share", "partage", "related",
        "recommend", "similaire", "panier", "cart",
        "login", "connexion", "contact", "formulaire",
        "form", "price", "prix", "gallery", "galerie",
        "image", "thumbnail"
    )

    def clean_description_element(element):
        if element is None:
            return ""

        node = BeautifulSoup(str(element), "html.parser")

        for tag in node.find_all([
            "script", "style", "noscript", "iframe",
            "form", "button", "input", "select",
            "textarea", "svg", "nav"
        ]):
            tag.decompose()

        pieces = []

        for child in node.find_all(
            ["h2", "h3", "h4", "p", "li", "dt", "dd"]
        ):
            value = clean_text(child.get_text(" ", strip=True))
            if value:
                pieces.append(value)

        if not pieces:
            return clean_text(node.get_text(" ", strip=True))

        unique = []
        seen = set()

        for piece in pieces:
            key = piece.lower()
            if key not in seen:
                seen.add(key)
                unique.append(piece)

        return "\n\n".join(unique).strip()

    priority = {
        "[itemprop='description']": 100,
        ".product-description": 95,
        ".product_detail": 90,
        ".product-details": 88,
        ".description-produit": 85,
        ".description_product": 82,
        ".description": 80,
        "#description": 78,
        "#product-description": 76,
    }

    candidates = []

    for selector in selectors:
        try:
            elements = soup.select(selector)
        except Exception:
            elements = []

        for element in elements:
            value = clean_description_element(element)

            if not value:
                continue

            classes = " ".join(element.get("class", [])).lower()
            if any(word in classes for word in bad_words):
                continue

            score = priority.get(selector, 50)
            length = len(value)

            if length >= 100:
                score += 20
            elif length >= 50:
                score += 10
            elif length < 20:
                score -= 20

            if length > 15000:
                score -= 40

            candidates.append((score, value))

    if candidates:
        candidates.sort(key=lambda item: item[0], reverse=True)
        return candidates[0][1]

    # Meta description
    for attrs in [
        {"name": "description"},
        {"property": "og:description"},
        {"name": "twitter:description"},
    ]:
        meta = soup.find("meta", attrs=attrs)

        if meta:
            value = clean_text(meta.get("content", ""))
            if value:
                return value

    # JSON-LD Product.description
    for script in soup.find_all(
        "script",
        type="application/ld+json"
    ):
        raw = script.string or script.get_text()

        if not raw:
            continue

        try:
            data = json.loads(raw)
        except Exception:
            continue

        items = []

        if isinstance(data, dict):
            items.append(data)
            graph = data.get("@graph")
            if isinstance(graph, list):
                items.extend(graph)

        elif isinstance(data, list):
            items.extend(data)

        for item in items:
            if not isinstance(item, dict):
                continue

            item_type = item.get("@type", "")

            if (
                item_type == "Product"
                or (
                    isinstance(item_type, list)
                    and "Product" in item_type
                )
            ):
                value = clean_text(
                    item.get("description", "")
                )

                if value:
                    return value

    return ""


# ============================================================
# EXTRACTION REFERENCE
# ============================================================

def extract_reference(soup):

    text = clean_text(
        soup.get_text(" ", strip=True)
    )

    patterns = [
        r"(?:référence|reference|réf\.?|ref\.?)\s*[:#-]?\s*([A-Za-z0-9._/-]+)",
        r"(?:SKU|sku)\s*[:#-]?\s*([A-Za-z0-9._/-]+)"
    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            text,
            flags=re.IGNORECASE
        )

        if match:
            return clean_text(
                match.group(1)
            )

    return ""


# ============================================================
# EXTRACTION IMAGES
# ============================================================

def extract_images(soup, page_url):

    images = []

    for img in soup.find_all("img"):

        candidates = [
            img.get("src"),
            img.get("data-src"),
            img.get("data-lazy-src"),
            img.get("data-original"),
            img.get("data-image"),
        ]

        srcset = img.get("srcset")

        if srcset:

            first = srcset.split(",")[0].strip()

            if first:
                candidates.append(
                    first.split(" ")[0]
                )

        for candidate in candidates:

            if not candidate:
                continue

            image_url = normalize_url(
                candidate,
                page_url
            )

            if not image_url:
                continue

            if image_url not in images:
                images.append(image_url)

            break

    return images


# ============================================================
# CATÉGORIE / SOUS-CATÉGORIE
# ============================================================

def detect_category(soup, product_url):

    category = ""
    subcategory = ""

    # Breadcrumb
    breadcrumb_selectors = [
        ".breadcrumb",
        ".breadcrumbs",
        "[class*='breadcrumb']",
        "nav[aria-label*='breadcrumb']"
    ]

    breadcrumb = None

    for selector in breadcrumb_selectors:

        breadcrumb = soup.select_one(selector)

        if breadcrumb:
            break

    if breadcrumb:

        items = []

        for item in breadcrumb.find_all(
            ["a", "span", "li"]
        ):

            text = clean_text(
                item.get_text(" ", strip=True)
            )

            if text and text not in items:
                items.append(text)

        if len(items) >= 2:

            category = items[-2]

            if len(items) >= 3:
                subcategory = items[-1]

    return category, subcategory


# ============================================================
# EXTRACTION PRODUIT
# ============================================================

def scrape_product(url, soup=None):

    logger.info(
        "PRODUIT : %s",
        url
    )

    if soup is None:
        soup = get_soup(url)

    if soup is None:
        return None

    try:

        title = extract_title(soup)
        price = extract_price(soup)
        description = extract_description(soup)
        reference = extract_reference(soup)

        category, subcategory = detect_category(
            soup,
            url
        )

        images = extract_images(
            soup,
            url
        )

        # Image principale
        main_image = images[0] if images else ""

        product = {
            "url": url,
            "title": title,
            "price": price,
            "reference": reference,
            "category": category,
            "subcategory": subcategory,
            "description": description,
            "main_image": main_image,
            "images": images,
            "image_count": len(images),
        }

        return product

    except Exception as exc:

        logger.exception(
            "Erreur extraction produit : %s",
            url
        )

        errors.append({
            "url": url,
            "error": str(exc)
        })

        return None


# ============================================================
# SAUVEGARDE IMAGE
# ============================================================

def download_image(image_url, product_title, index):

    if not image_url:
        return ""

    try:

        response = session.get(
            image_url,
            timeout=REQUEST_TIMEOUT,
            stream=True
        )

        if response.status_code != 200:
            return ""

        extension = ".jpg"

        content_type = response.headers.get(
            "Content-Type",
            ""
        ).lower()

        if "png" in content_type:
            extension = ".png"

        elif "webp" in content_type:
            extension = ".webp"

        elif "gif" in content_type:
            extension = ".gif"

        filename = (
            f"{safe_filename(product_title)}_"
            f"{index}_{url_hash(image_url)}"
            f"{extension}"
        )

        filepath = os.path.join(
            IMAGE_DIR,
            filename
        )

        if not os.path.exists(filepath):

            with open(filepath, "wb") as file:

                for chunk in response.iter_content(
                    chunk_size=8192
                ):

                    if chunk:
                        file.write(chunk)

        return os.path.relpath(
            filepath,
            OUTPUT_DIR
        ).replace("\\", "/")

    except Exception as exc:

        logger.warning(
            "Image impossible : %s | %s",
            image_url,
            exc
        )

        return ""


# ============================================================
# TELECHARGER LES IMAGES D'UN PRODUIT
# ============================================================

def download_product_images(product):

    image_urls = product.get(
        "images",
        []
    )

    local_images = []

    for index, image_url in enumerate(
        image_urls,
        start=1
    ):

        local_path = download_image(
            image_url,
            product.get("title", "product"),
            index
        )

        if local_path:
            local_images.append(
                local_path
            )

        time.sleep(0.2)

    product["local_images"] = local_images

    if local_images:
        product["local_main_image"] = (
            local_images[0]
        )
    else:
        product["local_main_image"] = ""

    return product


# ============================================================
# EXTRACTION PAGINATION
# ============================================================

def extract_pagination(soup, current_url):

    links = set()

    if soup is None:
        return links

    selectors = [
        ".pagination a",
        ".pager a",
        ".pages a",
        "a[rel='next']",
        "a.next",
        "a.next-page",
        "a[href*='page=']",
        "a[href*='Page=']"
    ]

    for selector in selectors:

        for link in soup.select(selector):

            href = link.get("href")

            url = normalize_url(
                href,
                current_url
            )

            if url and is_same_domain(url):
                links.add(url)

    return links


# ============================================================
# SAUVEGARDE DE LA PROGRESSION
# ============================================================

def save_progress():

    try:

        with open(
            VISITED_FILE,
            "w",
            encoding="utf-8"
        ) as file:

            json.dump(
                sorted(visited_urls),
                file,
                ensure_ascii=False,
                indent=2
            )

    except Exception as exc:

        logger.warning(
            "Impossible de sauvegarder visited_urls : %s",
            exc
        )


# ============================================================
# CHARGEMENT DE LA PROGRESSION
# ============================================================

def load_progress():

    global visited_urls

    if not os.path.exists(VISITED_FILE):
        return

    try:

        with open(
            VISITED_FILE,
            "r",
            encoding="utf-8"
        ) as file:

            data = json.load(file)

            if isinstance(data, list):
                visited_urls.update(data)

        logger.info(
            "%s URLs déjà visitées chargées.",
            len(visited_urls)
        )

    except Exception as exc:

        logger.warning(
            "Impossible de charger la progression : %s",
            exc
        )


# ============================================================
# DEDUPLICATION
# ============================================================

def add_product(product):

    if not product:
        return

    url = product.get("url", "")

    if not url:
        return

    existing_urls = {
        p.get("url")
        for p in products
    }

    if url not in existing_urls:

        products.append(product)

        logger.info(
            "Produit ajouté : %s",
            product.get("title", "")
        )



# ============================================================
# PROGRESSION PRODUITS V9.1
# ============================================================

def load_products_progress():
    """Recharge les produits déjà collectés."""
    if not os.path.exists(PRODUCTS_PROGRESS_FILE):
        return []

    try:
        with open(PRODUCTS_PROGRESS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except Exception as e:
        logger.warning(
            "Impossible de charger products_progress.json : %s", e
        )
        return []


def save_products_progress(products):
    """Sauvegarde immédiatement les produits collectés."""
    tmp_file = PRODUCTS_PROGRESS_FILE + ".tmp"

    try:
        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(products, f, ensure_ascii=False, indent=2)

        os.replace(tmp_file, PRODUCTS_PROGRESS_FILE)

    except Exception as e:
        logger.warning(
            "Impossible de sauvegarder les produits : %s", e
        )


def merge_product(existing_products, product):
    """Ajoute ou met à jour un produit sans créer de doublon."""
    url = product.get("url", "").strip()

    if not url:
        return existing_products

    for i, old in enumerate(existing_products):
        if old.get("url", "").strip() == url:
            existing_products[i] = product
            return existing_products

    existing_products.append(product)
    return existing_products


# ============================================================
# CRAWLER PRINCIPAL
# ============================================================

def crawl():

    queue = deque()

    queue.append(BASE_URL)

    queued = {BASE_URL}

    page_count = 0

    while queue and page_count < MAX_PAGES:

        current_url = queue.popleft()

        if current_url in visited_urls:
            continue

        if not is_same_domain(current_url):
            continue

        page_count += 1

        logger.info(
            "\n=================================================="
        )

        logger.info(
            "PAGE %s/%s",
            page_count,
            MAX_PAGES
        )

        logger.info(
            "%s",
            current_url
        )

        soup = get_soup(current_url)

        visited_urls.add(
            current_url
        )

        save_progress()

        if soup is None:
            continue

        # ----------------------------------------------------
        # Détection produit
        # ----------------------------------------------------

        if looks_like_product_url(
            current_url
        ):

            product = scrape_product(
                current_url,
                soup
            )

            if product:

                product = download_product_images(
                    product
                )

                add_product(product)

        # ----------------------------------------------------
        # Tous les liens
        # ----------------------------------------------------

        links = extract_links(
            soup,
            current_url
        )

        # ----------------------------------------------------
        # Pagination
        # ----------------------------------------------------

        pagination_links = extract_pagination(
            soup,
            current_url
        )

        links.update(
            pagination_links
        )

        # ----------------------------------------------------
        # Ajouter les nouveaux liens
        # ----------------------------------------------------

        for link in links:

            if link in visited_urls:
                continue

            if link in queued:
                continue

            if not is_same_domain(link):
                continue

            queued.add(link)

            queue.append(link)

        logger.info(
            "Liens trouvés : %s | File restante : %s",
            len(links),
            len(queue)
        )

    logger.info(
        "\nCrawling terminé."
    )

    logger.info(
        "Pages visitées : %s",
        len(visited_urls)
    )

    description_count = sum(
        1
        for product in products
        if clean_text(product.get("description", ""))
    )

    logger.info(
        "Produits trouvés : %s",
        len(products)
    )

    logger.info(
        "Descriptions trouvées : %s/%s",
        description_count,
        len(products)
    )


# ============================================================
# EXPORT JSON
# ============================================================

def export_json():

    try:

        with open(
            JSON_FILE,
            "w",
            encoding="utf-8"
        ) as file:

            json.dump(
                products,
                file,
                ensure_ascii=False,
                indent=2
            )

        logger.info(
            "JSON créé : %s",
            JSON_FILE
        )

    except Exception as exc:

        logger.error(
            "Erreur export JSON : %s",
            exc
        )


# ============================================================
# EXPORT CSV
# ============================================================

def export_csv():

    try:

        rows = []

        for product in products:

            row = product.copy()

            # Listes -> texte
            row["images"] = " | ".join(
                row.get("images", [])
            )

            row["local_images"] = " | ".join(
                row.get("local_images", [])
            )

            rows.append(row)

        dataframe = pd.DataFrame(rows)

        dataframe.to_csv(
            CSV_FILE,
            index=False,
            encoding="utf-8-sig"
        )

        logger.info(
            "CSV créé : %s",
            CSV_FILE
        )

    except Exception as exc:

        logger.error(
            "Erreur export CSV : %s",
            exc
        )


# ============================================================
# EXPORT XLSX
# ============================================================

def export_xlsx():

    try:

        rows = []

        for product in products:

            row = product.copy()

            row["images"] = " | ".join(
                row.get("images", [])
            )

            row["local_images"] = " | ".join(
                row.get("local_images", [])
            )

            rows.append(row)

        dataframe = pd.DataFrame(rows)

        dataframe.to_excel(
            XLSX_FILE,
            index=False
        )

        logger.info(
            "XLSX créé : %s",
            XLSX_FILE
        )

    except Exception as exc:

        logger.error(
            "Erreur export XLSX : %s",
            exc
        )


# ============================================================
# EXPORT ERREURS
# ============================================================

def export_errors():

    try:

        with open(
            ERROR_FILE,
            "w",
            encoding="utf-8"
        ) as file:

            json.dump(
                errors,
                file,
                ensure_ascii=False,
                indent=2
            )

        logger.info(
            "Fichier erreurs créé : %s",
            ERROR_FILE
        )

    except Exception as exc:

        logger.warning(
            "Erreur sauvegarde erreurs : %s",
            exc
        )


# ============================================================
# STATISTIQUES
# ============================================================

def print_statistics():

    print()
    print("=" * 60)
    print("           PRIMO-IDEO SCRAPER V8")
    print("=" * 60)

    print(
        f"Pages visitées : {len(visited_urls)}"
    )

    print(
        f"Produits trouvés : {len(products)}"
    )

    print(
        f"Erreurs : {len(errors)}"
    )

    image_total = sum(
        len(p.get("images", []))
        for p in products
    )

    description_total = sum(
        1
        for p in products
        if clean_text(p.get("description", ""))
    )

    print(f"Images : {image_total}")
    print(
        f"Descriptions trouvées : "
        f"{description_total}/{len(products)}"
    )

    if products and description_total < len(products):
        print(
            "Attention : certains produits n'ont pas de "
            "description détectable sur leur fiche source."
        )

    print()
    print("Fichiers :")
    print(
        f"  JSON : {JSON_FILE}"
    )
    print(
        f"  CSV  : {CSV_FILE}"
    )
    print(
        f"  XLSX : {XLSX_FILE}"
    )
    print(
        f"  Images : {IMAGE_DIR}"
    )

    print("=" * 60)


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 60)
    print("       PRIMO-IDEO SCRAPER V8")
    print("=" * 60)
    print()

    logger.info(
        "Démarrage du scraper..."
    )

    load_progress()

    try:

        crawl()

    except KeyboardInterrupt:

        logger.warning(
            "Scraping interrompu par l'utilisateur."
        )

    except Exception as exc:

        logger.exception(
            "Erreur générale : %s",
            exc
        )

    finally:

        export_json()
        export_csv()
        export_xlsx()
        export_errors()
        save_progress()

        print_statistics()

        logger.info(
            "Scraping terminé."
        )


# ============================================================
# EXECUTION
# ============================================================

if __name__ == "__main__":
    main()