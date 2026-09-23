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

    selectors = [
        ".description",
        ".product-description",
        ".product_detail",
        ".description-produit",
        "[itemprop='description']"
    ]

    for selector in selectors:

        element = soup.select_one(selector)

        if element:

            text = clean_text(
                element.get_text(" ", strip=True)
            )

            if text:
                return text

    # Meta description
    meta = soup.find(
        "meta",
        attrs={"name": "description"}
    )

    if meta:

        return clean_text(
            meta.get("content", "")
        )

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

    logger.info(
        "Produits trouvés : %s",
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

    print(
        f"Images : {sum(len(p.get('images', [])) for p in products)}"
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