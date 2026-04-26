#!/usr/bin/env python3
"""
Téléchargeur audio pour le site islam.bf - Dr Kindo
Fonctionne de manière incrémentale en découvrant les dossiers depuis la page principale
"""

import os
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse, unquote, parse_qs
import time
import logging
from datetime import datetime
from urllib.parse import unquote

# Configuration
BASE_URL = "https://islam.bf/mp3preches/MP3/Dr-Mohamad-Kindo/"

# Extensions de fichiers audio à rechercher
AUDIO_EXTENSIONS = ('.mp3', '.wav', '.ogg', '.aac', '.m4a', '.flac', '.wma', '.opus', '.aiff')

# Headers HTTP complètes
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
}

# Paramètres URL possibles contenir le nom du fichier audio
AUDIO_URL_PARAMS = ['bissmillah', 'file', 'audio', 'src', 'url', 'download', 'path', 'media', 'mp3', 'filename', 'name', 'track', 'fichier']

# Délai entre les requêtes
DELAY_BETWEEN_REQUESTS = 0.5  # secondes
DELAY_BETWEEN_CATEGORIES = 1  # secondes

def sanitize_name(name):
    """Supprime les caractères interdits sous Windows dans un nom de fichier/dossier."""
    return re.sub(r'[\\/*?:"<>|\n\t]', '', name).strip()

def truncate_filename(filename):
    """Tronque le nom de fichier à 200 caractères max."""
    for ext in AUDIO_EXTENSIONS:
        if filename.lower().endswith(ext):
            stem = filename[:-len(ext)]
            if len(stem) > 195:
                stem = stem[:190] + "..."
            return stem + ext
    if len(filename) > 200:
        filename = filename[:195] + "..."
    return filename + ".mp3"

def get_filename_from_href(href):
    """
    Extrait le vrai nom du fichier audio depuis un lien.
    """
    if not href:
        return None
    
    href = href.strip()
    if not href or href.startswith('#') or href.startswith('javascript:') or href.startswith('mailto:'):
        return None
    
    try:
        parsed_url = urlparse(href)
        path = parsed_url.path.lower()
        query = parsed_url.query
        
        # Cas 1: lien direct avec extension audio
        if any(path.endswith(ext) for ext in AUDIO_EXTENSIONS):
            filename = os.path.basename(path)
            if filename:
                return unquote(filename)
        
        # Cas 2: essayer de décoder le path
        try:
            decoded_path = unquote(path)
            if any(decoded_path.lower().endswith(ext) for ext in AUDIO_EXTENSIONS):
                filename = os.path.basename(decoded_path)
                if filename:
                    return filename
        except Exception:
            pass
        
        # Cas 3: paramètres URL
        if query:
            params = parse_qs(query)
            for param_name in AUDIO_URL_PARAMS:
                for key in params:
                    if key.lower() == param_name:
                        value = params[key][0]
                        if any(value.lower().endswith(ext) for ext in AUDIO_EXTENSIONS):
                            return unquote(value)
        
        # Cas 4: chercher dans le href complet
        if query:
            params = parse_qs(query)
            for key in params:
                value = params[key][0]
                value_lower = value.lower()
                for ext in AUDIO_EXTENSIONS:
                    if ext in value_lower:
                        try:
                            basename = os.path.basename(value)
                            if basename:
                                return unquote(basename)
                        except Exception:
                            pass
        
        # Cas 5: regex dans le href
        href_lower = href.lower()
        for ext in AUDIO_EXTENSIONS:
            if ext in href_lower:
                match = re.search(r'([^\/]+)' + ext, href_lower)
                if match:
                    return unquote(match.group(1))
    except Exception as e:
        print(f"    [Debug] Erreur解析: {e}")
    
    return None

def find_audio_links_in_menu2(soup, base_url):
    """Trouve tous les liens audio dans l'element id='menutelecharger2'."""
    found_links = []
    
    # Chercher l'element avec id="menutelecharger2"
    menu2 = soup.find(id='menutelecharger2')
    if not menu2:
        return found_links
    
    seen_urls = set()
    
    # Chercher tous les liens <a> dans ce menu
    for link in menu2.find_all('a'):
        href = link.get('href')
        if not href:
            continue
        
        # Chercher le pattern allah.php?bissmillah= ou facebook.php?bissmillah=
        if 'bissmillah=' in href:
            # Extraire le nom du fichier depuis le parametre bissmillah
            try:
                parsed = urlparse(href)
                params = parse_qs(parsed.query)
                if 'bissmillah' in params:
                    filename = params['bissmillah'][0]
                    if filename and filename not in seen_urls:
                        seen_urls.add(filename)
                        found_links.append((href, filename))
            except Exception:
                pass
    
    return found_links


def find_audio_links(soup, base_url):
    """Trouve tous les liens audio sur une page."""
    found_links = []
    seen_urls = set()
    
    # PRIORITE: Chercher dans id="menutelecharger2" (specifique au site)
    menu2_links = find_audio_links_in_menu2(soup, base_url)
    if menu2_links:
        return menu2_links
    
    # Fallback: methodes originales si menu2 non trouvo!
    # 1. Liens <a> standards
    for link in soup.find_all('a'):
        href = link.get('href')
        if href and href not in seen_urls:
            seen_urls.add(href)
            filename = get_filename_from_href(href)
            if filename:
                found_links.append((href, filename))
    
    # 2. Elements <audio> et <source>
    for audio in soup.find_all('audio'):
        src = audio.get('src')
        if src and src not in seen_urls:
            seen_urls.add(src)
            filename = get_filename_from_href(src)
            if filename:
                found_links.append((src, filename))
        for source in audio.find_all('source'):
            src = source.get('src')
            if src and src not in seen_urls:
                seen_urls.add(src)
                filename = get_filename_from_href(src)
                if filename:
                    found_links.append((src, filename))
    
    # 3. Elements <source> autonomes
    for source in soup.find_all('source'):
        src = source.get('src')
        if src and src not in seen_urls:
            seen_urls.add(src)
            filename = get_filename_from_href(src)
            if filename:
                found_links.append((src, filename))
    
    # 4. Attributs data-
    for element in soup.find_all(attrs={'data-src': True}):
        src = element.get('data-src')
        if src and src not in seen_urls:
            seen_urls.add(src)
            filename = get_filename_from_href(src)
            if filename:
                found_links.append((src, filename))
    
    for element in soup.find_all(attrs={'data-audio': True}):
        src = element.get('data-audio')
        if src and src not in seen_urls:
            seen_urls.add(src)
            filename = get_filename_from_href(src)
            if filename:
                found_links.append((src, filename))
    
    # 5. onclick JavaScript
    for element in soup.find_all(onclick=True):
        onclick = element.get('onclick', '')
        matches = re.findall(r"(?:window\.)?location\.href\s*=\s*['\"]([^'\"]+)['\"]", onclick)
        for match in matches:
            href = match.strip()
            if href and href not in seen_urls:
                seen_urls.add(href)
                filename = get_filename_from_href(href)
                if filename:
                    found_links.append((href, filename))
        
        matches = re.findall(r"[Aa]udio\(['\"]([^'\"]+)['\"]", onclick)
        for match in matches:
            href = match.strip()
            if href and href not in seen_urls:
                seen_urls.add(href)
                filename = get_filename_from_href(href)
                if filename:
                    found_links.append((href, filename))
    
    # 6. Recherche texte page
    page_text = str(soup)
    for ext in AUDIO_EXTENSIONS:
        pattern = r'[\"\']([^\"\']*' + re.escape(ext) + r')[\"\']'
        matches = re.findall(pattern, page_text)
        for match in matches:
            if match.startswith('http'):
                href = match
            else:
                href = match
            if href and href not in seen_urls:
                seen_urls.add(href)
                filename = get_filename_from_href(href)
                if filename:
                    found_links.append((href, filename))
    
    return found_links

def get_folder_list(base_url):
    """Récupère la liste des dossiers depuis la page principale."""
    print(f"\n[*] Récupération de la liste des dossiers depuis:")
    print(f"    {base_url}")
    
    try:
        response = requests.get(base_url, headers=HEADERS, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Chercher la section "Liste des dossiers"
        folders = []
        
        # Methode 1: chercher le titre "Liste des dossiers"
        # titre_elem = soup.find(id='titre', text='Liste des dossiers')
        # if titre_elem:
        #     # Chercher les li dans le ul suivant
        #     ul = titre_elem.find_next('ul')
        #     if ul:
        #         for li in ul.find_all('li'):
        #             link = li.find('a')
        #             if link:
        #                 href = link.get('href')
        #                 name = link.get_text(strip=True)
        #                 if href and name:
        #                     folders.append((name, href))
        
        # Methode 2: chercher directement les liens dans "menutelechargerz"
        menu = soup.find(id='menutelechargerz')
        if menu:
            for li in menu.find_all('li'):
                link = li.find('a')
                if link:
                    href = link.get('href')
                    name = link.get_text(strip=True)
                    if href and name:
                        folders.append((name, href))
        
        # Methode 3: chercher tous les liens qui ressemble à des dossiers
        if not folders:
            for link in soup.find_all('a'):
                href = link.get('href', '')
                text = link.get_text(strip=True)
                # Vérifier si c'est un chemin de dossier (contient / à la fin ou chemin relatif)
                if href and ('/Dr-Mohamad-Kindo/' in href or href.startswith('./')):
                    if text and text not in [f[0] for f in folders]:
                        folders.append((text, href))
        
        print(f"    -> Trouvé {len(folders)} dossiers")
        return folders
        
    except Exception as e:
        print(f"    [Erreur] {e}")
        return []

def download_file(url, target_folder, filename):
    """Télécharge un fichier audio sans modifier les métadonnées."""
    filename = sanitize_name(filename)
    filename = truncate_filename(filename)
    
    os.makedirs(target_folder, exist_ok=True)
    file_path = os.path.join(target_folder, filename)

    if os.path.exists(file_path):
        size = os.path.getsize(file_path)
        if size > 1000:  # Plus de 1KB = probablement déjà Téléchargé
            print(f"    [Déjà] {filename}")
            return
    
    print(f"    [↓] {filename}")
    try:
        response = requests.get(url, headers=HEADERS, stream=True, timeout=60)
        response.raise_for_status()
        
        # Enregistrer le contenu dans le fichier tel quel
        with open(file_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        
        print(f"    [OK] {filename}")
    except requests.exceptions.RequestException as e:
        print(f"    [Erreur] {e}")
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass

def download_folder(folder_url, folder_name, base_download_dir, base_url):
    """Télécharge tous les fichiers audio d'un dossier."""
    # Construire l'URL absolue
    if folder_url.startswith('./'):
        folder_url = base_url + folder_url[2:]
    elif not folder_url.startswith('http'):
        folder_url = base_url + folder_url
    
    # Retirer le slash final
    folder_url = folder_url.rstrip('/')
    
    target_folder = os.path.join(base_download_dir, folder_name)
    
    print(f"\n{'='*60}")
    print(f"[Dossier] {folder_name}")
    print(f"[URL]    {folder_url}")
    print(f"{'='*60}")
    
    time.sleep(DELAY_BETWEEN_CATEGORIES)
    
    try:
        response = requests.get(folder_url, headers=HEADERS, timeout=30)
        response.raise_for_status()
        
        content_type = response.headers.get('Content-Type', '')
        if 'text/html' not in content_type:
            print("  -> Page non HTML, ignorée.")
            return
        
        soup = BeautifulSoup(response.content, 'html.parser')
        found = 0
        
        # Trouver tous les liens audio
        audio_links = find_audio_links(soup, folder_url)
        
        for href, filename in audio_links:
            # Construire l'URL absolue
            if href.startswith('http'):
                download_url = href
            else:
                download_url = urljoin(folder_url + '/', href)
            
            download_file(download_url, target_folder, filename)
            found += 1
            time.sleep(DELAY_BETWEEN_REQUESTS)
        
        if found == 0:
            print("  -> Aucun fichier audio trouvé.")
            # Debug: afficher les liens trouves
            all_links = soup.find_all('a')
            print(f"  -> Debug: {len(all_links)} liens <a> trouves")
        else:
            print(f"\n  -> {found} fichier(s) Télécharge(s)")
            
    except requests.exceptions.HTTPError as e:
        print(f"  -> Erreur HTTP {e.response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"  -> Erreur réseau: {e}")

def main():
    print("=" * 60)
    print("  Téléchargeur audio - Dr Kindo (islam.bf)")
    print("=" * 60)
    
    # Option 1: Entrer une URL de sous-dossier directement
    # Option 2: Appuyer sur Entree pour la liste automatique
    user_url = input("\nURL du dossier (ex: https://islam.bf/mp3preches/MP3/Dr-Mohamad-Kindo/45-TAFSIR-DE-DIMANCHE)\nou laissez vide pour liste auto: ").strip()
    
    if user_url and '/mp3preches/MP3/' in user_url:
        # URL de sous-dossier specifique
        # Extraire le chemin de base et le nom du dossier
        parts = user_url.rstrip('/').split('/')
        folder_name = parts[-1]
        
        # Construire l'URL de base (jusqu'a /MP3/)
        base_parts = parts[:4]  # https://islam.bf/mp3preches/MP3/
        base_url = '/'.join(base_parts) + '/'
        
        print(f"\n[*] Sous-dossier: {folder_name}")
        print(f"    URL: {user_url}")
        
        destination_folder = input("Dossier de destination [audio_drkindo]: ").strip()
        if not destination_folder:
            destination_folder = "audio_drkindo"
        
        os.makedirs(destination_folder, exist_ok=True)
        
        # Telecharger directement ce sous-dossier
        download_folder(user_url, folder_name, destination_folder, base_url)
    else:
        # Mode automatique avec discovery
        if user_url:
            base_url = user_url.rstrip('/') + '/'
        else:
            base_url = BASE_URL
        
        download_from_base(base_url)


def download_from_base(base_url):
    """Telecharge depuis l'URL de base avec discovery automatique."""
    destination_folder = input("Dossier de destination [audio_drkindo]: ").strip()
    if not destination_folder:
        destination_folder = "audio_drkindo"
    
    os.makedirs(destination_folder, exist_ok=True)
    
    folders = get_folder_list(base_url)
    
    if not folders:
        print("\n[Erreur] Aucun dossier trouvé. Vérifiez l'URL du site.")
        exit(1)
    
    print(f"\n[*] Début du téléchargement de {len(folders)} dossiers...")
    print(f"    Destination: {destination_folder}")
    
    for i, (name, href) in enumerate(folders, 1):
        print(f"\n[{i}/{len(folders)}] ", end="", flush=True)
        download_folder(href, name, destination_folder, base_url)
    
    print("\n" + "=" * 60)
    print("  [TERMINÉ] Tous les téléchargements sont complétés!")
    print("=" * 60)

if __name__ == "__main__":
    main()
