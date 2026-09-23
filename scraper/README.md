# Scraping puis création des pages Primo-Idéo

## 1. Installer Python
Dans le terminal VS Code :

```bat
py -m pip install -r scraper\requirements.txt
```

## 2. Lancer le scraping
Depuis le dossier du projet :

```bat
py scraper\scraper.py --max-pages 5000 --delay 0.7
```

Le scraper régénère automatiquement :
- `frontend/data/products.json`
- `frontend/data/products.csv`
- `frontend/data/products.xlsx`
- `frontend/data/categories.json`
- `frontend/data/pages.json`
- `frontend/data/site_info.json`
- `frontend/data/catalog.js`

`catalog.js` est important : les pages peuvent afficher les données même si le navigateur est ouvert en `file:///`. Il évite l'erreur « impossible de charger le data » liée à `fetch()`.

## 3. Créer/afficher les pages
Les pages HTML utilisent automatiquement `catalog.js`. Il n'est donc pas nécessaire de modifier les HTML après chaque scraping.

Pour le mode serveur local :

```bat
start_server.bat
```

Puis : `http://localhost:8000/`

## 4. Images
Pour télécharger les images localement pendant le scraping :

```bat
py scraper\scraper.py --max-pages 5000 --delay 0.7 --download-images
```

## Architecture conservée
- `scraper/`
- `frontend/`
- `frontend/data/`
- `frontend/assets/css/`
- `frontend/assets/js/`
- `frontend/pages/`

Les noms des pages existantes sont conservés.
