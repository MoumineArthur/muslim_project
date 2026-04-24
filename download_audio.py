import os
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse, unquote, parse_qs

# Extensions de fichiers audio à rechercher
AUDIO_EXTENSIONS = ('.mp3', '.wav', '.ogg', '.aac', '.m4a', '.flac')
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'}

CATEGORIES = [
    "TAFSIR-DE-DIMANCHE", "Dr-Kindo-IMAN-BIN-NABI", "Dr-Kindo-DIFFERENCE-ENTRE-GROUPE-ISLAMIQUE",
    "Dr-Kindo-IMAN-BIL-KITAB", "Dr-Kindo-KABAAIR", "Dr-Kindo-Fatwa",
    "Dr-Kindo-Parle-des-ANGES-Malaikat", "Dr-Kindo-Parle-des-GENIES-Djine",
    "Dr-Kindo-Parle-du-Ramadan", "Dr-Kindo-Sermon-Houtba", "ANCIEN-TAFSIR-A-ZANGUETIN",
    "DOUROUS-DE-DIMANCHE-DE-2014", "TOUS-LES-DIVERS-PRECHES-DE-2014", "TAFSIR-2014-DR-MOHAMAD-KINDO",
    "DOUROUS-DE-DIMANCHE-DE-2015", "DR-KINDO-DIVERS-PRECHES-DE-2015", "TAFSIR-2015-DR-MOHAMAD-KINDO",
    "FATWA-QUESTIONS-REPONSES-SUR-HORIZON-FM", "DOUROUS-DE-DIMANCHE-DE-2016",
    "DR-KINDO-DIVERS-PRECHES-DE-2016", "DR-KINDO-DANS-LES-SEMINAIRES", "TAFSIR-2016-DR-MOHAMAD-KINDO",
    "LES-VIDEOS-DU-DR-MOHAMAD-KINDO", "DOUROUS-DE-DIMANCHE-DE-2017", "DR-KINDO-DIVERS-PRECHES-DE-2017",
    "TAFSIR-2017-DR-MOHAMAD-KINDO", "DR-KINDO-DIVERS-PRECHES-DE-2018", "DOUROUS-DE-DIMANCHE-DE-2018",
    "TAFSIR-2018-DR-MOHAMAD-KINDO", "AVANT-2014-ET-SANS-DATE", "DOUROUS-DE-DIMANCHE-DE-2019",
    "DR-KINDO-DIVERS-PRECHES-DE-2019", "TAFSIR-2019", "DOUROUS-DE-DIMANCHE-DE-2020",
    "DR-KINDO-DIVERS-PRECHES-DE-2020", "DR-KINDO-EN-COTE-D-IVOIRE-2020",
    "DR-KINDO-DIVERS-PRECHES-DE-2021", "TAFSIR-2021", "DOUROUS-DE-DIMANCHE-DE-2022",
    "DOUROUS-DE-DIMANCHE-DE-2021", "DR-KINDO-DIVERS-PRECHES-DE-2022", "TAFSIR-2022",
    "DOUROUS-DE-DIMANCHE-DE-2023", "DR-KINDO-DIVERS-PRECHES-DE-2023", "TAFSIR-2023"
]

def sanitize_name(name):
    """Supprime les caractères interdits sous Windows dans un nom de fichier/dossier."""
    return re.sub(r'[\\/*?:"<>|\n\t]', '', name).strip()

def truncate_filename(filename):
    """Tronque le nom de fichier à 150 caractères max (sécurité Windows MAX_PATH)."""
    for ext in AUDIO_EXTENSIONS:
        if filename.lower().endswith(ext):
            stem = filename[:-len(ext)]
            if len(stem) > 150:
                stem = stem[:145] + "..."
            return stem + ext
    # Pas d'extension reconnue : on tronque et ajoute .mp3
    if len(filename) > 150:
        filename = filename[:145] + "..."
    return filename + ".mp3"

def get_filename_from_href(href):
    """
    Extrait le vrai nom du fichier audio depuis un lien.
    Gère :
      - allah.php?bissmillah=NOM_FICHIER
      - Lien direct se terminant par .mp3 (ou autre extension audio)
    """
    # Cas 1 : paramètre bissmillah (ex: allah.php?bissmillah=sermon.mp3)
    if 'bissmillah=' in href.lower():
        params = parse_qs(urlparse(href).query)
        for key in params:
            if key.lower() == 'bissmillah':
                return unquote(params[key][0])

    # Cas 2 : lien direct contenant une extension audio
    path = urlparse(href).path.lower()
    if any(path.endswith(ext) for ext in AUDIO_EXTENSIONS):
        return unquote(os.path.basename(urlparse(href).path))

    return None

def download_file(url, target_folder, filename):
    """Télécharge un fichier audio dans le dossier cible."""
    filename = sanitize_name(filename)
    filename = truncate_filename(filename)
    
    os.makedirs(target_folder, exist_ok=True)
    file_path = os.path.join(target_folder, filename)

    if os.path.exists(file_path):
        print(f"    [Déjà téléchargé] {filename}")
        return

    print(f"    [Téléchargement] {filename}")
    try:
        response = requests.get(url, headers=HEADERS, stream=True)
        response.raise_for_status()
        with open(file_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        print(f"    [OK] {filename}")
    except requests.exceptions.RequestException as e:
        print(f"    [Erreur] {e}")

def download_category(base_url, category, base_download_dir):
    """
    Visite l'URL base_url/category, trouve tous les liens audio (<a>)
    et les télécharge dans base_download_dir/category/.
    """
    category_url = base_url.rstrip('/') + '/' + category
    target_folder = os.path.join(base_download_dir, category)

    print(f"\n{'='*60}")
    print(f"[Catégorie] {category}")
    print(f"[URL]       {category_url}")
    print(f"{'='*60}")

    try:
        response = requests.get(category_url, headers=HEADERS)
        response.raise_for_status()

        content_type = response.headers.get('Content-Type', '')
        if 'text/html' not in content_type:
            print("  -> Page non HTML, ignorée.")
            return

        soup = BeautifulSoup(response.content, 'html.parser')
        found = 0

        for link in soup.find_all('a'):
            href = link.get('href')
            if not href or href.startswith('#') or href.startswith('javascript:'):
                continue

            filename = get_filename_from_href(href)
            if filename:
                # Construire l'URL absolue pour le téléchargement
                download_url = urljoin(category_url + '/', href)
                download_file(download_url, target_folder, filename)
                found += 1

        if found == 0:
            print("  -> Aucun fichier audio trouvé sur cette page.")
        else:
            print(f"\n  -> {found} fichier(s) traité(s) dans [{category}]")

    except requests.exceptions.HTTPError as e:
        print(f"  -> Erreur HTTP {e.response.status_code} : catégorie introuvable ou inaccessible.")
    except requests.exceptions.RequestException as e:
        print(f"  -> Erreur réseau : {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("  Téléchargeur audio - Dr Kindo")
    print("=" * 60)

    base_url = input("\nEntrez l'URL de base du site (ex: http://exemple.com/) : ").strip()
    destination_folder = input("Entrez le dossier de destination local (ex: drkindo) : ").strip()

    if not base_url:
        print("Erreur : URL requise.")
        exit(1)

    if not destination_folder:
        destination_folder = "Telechargements_Audio"

    # Pré-créer toute l'arborescence locale
    print(f"\n[Création de l'arborescence dans '{destination_folder}']")
    for cat in CATEGORIES:
        os.makedirs(os.path.join(destination_folder, cat), exist_ok=True)
    print("  -> Arborescence créée.")

    # Télécharger catégorie par catégorie
    for cat in CATEGORIES:
        download_category(base_url, cat, destination_folder)

    print("\n" + "=" * 60)
    print("  [TERMINÉ] Tous les téléchargements sont complétés !")
    print("=" * 60)
