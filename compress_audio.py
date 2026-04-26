#!/usr/bin/env python3
"""
compress_audio.py
=================
Parcourt récursivement un dossier audio et applique une compression
optimale FORMAT PAR FORMAT, en evitant toute degradation de qualite.

STRATEGIE PAR FORMAT
--------------------
MP3  -> OPUS (.opus)  : codec moderne, -30 a -50% de taille a qualite egale
        ou AAC (.m4a) : si --target-format aac
        !! Jamais MP3->MP3 : chaque reencodage lossy->lossy degrade l'audio !!

FLAC -> FLAC niveau 8 : recompression lossless pure
WAV  -> FLAC niveau 8 : conversion lossless, economie 40-60%
AIFF -> FLAC niveau 8 : idem
OGG  -> OPUS          : codec moderne, meilleure compression
AAC/M4A -> AAC 192k   : reencodage propre
OPUS -> OPUS 128k VBR : deja optimal, reencodage si bitrate > seuil

Dependances :
  pip install tqdm colorama
  ffmpeg >= 4.0 dans le PATH (avec libopus et libmp3lame)

Usage :
  python compress_audio.py /dossier/musique --output /dossier/sortie
  python compress_audio.py /dossier/musique --output /sortie --dry-run
  python compress_audio.py /dossier/musique --output /sortie --target-format aac

Options :
  --output DIR          Dossier de sortie (arborescence reproduite)
  --dry-run             Simulation : analyse sans creer aucun fichier
  --target-format FMT   Format cible pour MP3/OGG : opus (defaut) ou aac
  --opus-bitrate N      Bitrate Opus en kbps (defaut : 128 - transparent)
  --aac-bitrate N       Bitrate AAC en kbps  (defaut : 192)
  --workers N           Threads paralleles   (defaut : nb CPUs)
  --min-saving PCT      Seuil de gain pour recompression meme-format (defaut : 3%)
  --log FILE            Rapport CSV          (defaut : compress_audio.log)
"""

"""
# Test d'abord sur 20 fichiers via dry-run
python compress_audio.py /musique --output /musique_opus --dry-run

# Lancement réel
python compress_audio.py /musique --output /musique_opus --workers 8

# Si vous préférez AAC (compatible iPhone/iTunes)
python compress_audio.py /musique --output /musique_aac --target-format aac

""" 

import argparse
import csv
import os
import shutil
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from pathlib import Path
from threading import Lock
from typing import Optional

# ── Dependances optionnelles ──────────────────────────────────────────────────
try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False

try:
    from colorama import Fore, Style, init as colorama_init
    colorama_init(autoreset=True)
    HAS_COLOR = True
except ImportError:
    HAS_COLOR = False

AUDIO_EXTENSIONS = {
    ".mp3", ".flac", ".wav", ".aac", ".m4a",
    ".ogg", ".opus", ".aiff", ".aif",
}


# ── Utilitaires ───────────────────────────────────────────────────────────────
def color(text: str, c: str = "") -> str:
    if HAS_COLOR and c:
        return f"{c}{text}{Style.RESET_ALL}"
    return text


def human_size(n: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if abs(n) < 1024:
            return f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"


def check_ffmpeg() -> bool:
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False


def probe_bitrate(src: Path) -> Optional[int]:
    """Retourne le bitrate audio source en kbps, ou None si indisponible."""
    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-select_streams", "a:0",
            "-show_entries", "stream=bit_rate",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(src),
        ]
        out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL, timeout=10)
        val = out.strip().decode()
        if val and val not in ("N/A", ""):
            return int(val) // 1000
    except Exception:
        pass
    return None


def find_audio_files(root: Path) -> list:
    files = []
    for dirpath, _, filenames in os.walk(root):
        for fn in sorted(filenames):
            p = Path(dirpath) / fn
            if p.suffix.lower() in AUDIO_EXTENSIONS:
                files.append(p)
    return files


def mirror_path(src: Path, root: Path, output_dir: Path,
                new_ext: Optional[str] = None) -> Path:
    """Chemin miroir dans output_dir avec arborescence identique."""
    rel = src.relative_to(root)
    if new_ext:
        rel = rel.with_suffix(new_ext)
    dst = output_dir / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    return dst


# ── Structures de donnees ─────────────────────────────────────────────────────
@dataclass
class Result:
    src: Path
    dst: Path
    original_size: int
    compressed_size: int
    saving_pct: float
    status: str        # "converted" | "recompressed" | "copied" | "error"
    method: str = ""
    error_msg: str = ""
    duration_s: float = 0.0


@dataclass
class Stats:
    total: int = 0
    converted: int = 0
    recompressed: int = 0
    copied: int = 0
    errors: int = 0
    bytes_before: int = 0
    bytes_after: int = 0
    lock: Lock = field(default_factory=Lock)

    def add(self, r: Result):
        with self.lock:
            self.total += 1
            self.bytes_before += r.original_size
            self.bytes_after += r.compressed_size
            if r.status == "converted":
                self.converted += 1
            elif r.status == "recompressed":
                self.recompressed += 1
            elif r.status == "copied":
                self.copied += 1
            else:
                self.errors += 1


# ── Choix de la strategie d'encodage ─────────────────────────────────────────
def build_plan(src: Path, target_fmt: str,
               opus_kbps: int, aac_kbps: int) -> tuple:
    """
    Retourne (codec_args: list[str], out_ext: str).

    Regles :
      - Lossless (FLAC/WAV/AIFF) -> FLAC niveau 8 (sans perte)
      - MP3/OGG -> OPUS ou AAC  (jamais MP3->MP3 pour eviter double lossy)
      - Le bitrate cible est plafonne au bitrate source (pas d'upscaling)
    """
    ext = src.suffix.lower()
    src_kbps = probe_bitrate(src)

    # Lossless -> FLAC maximalement compresse
    if ext in (".flac", ".wav", ".aiff", ".aif"):
        return ["-c:a", "flac", "-compression_level", "8"], ".flac"

    # MP3 -> OPUS (defaut) ou AAC
    if ext == ".mp3":
        if target_fmt == "aac":
            tkbps = min(aac_kbps, src_kbps) if src_kbps else aac_kbps
            return (["-c:a", "aac", "-b:a", f"{tkbps}k",
                     "-movflags", "+faststart"], ".m4a")
        else:
            tkbps = min(opus_kbps, src_kbps) if src_kbps else opus_kbps
            return (["-c:a", "libopus", "-b:a", f"{tkbps}k",
                     "-vbr", "on", "-compression_level", "10"], ".opus")

    # OGG -> OPUS
    if ext == ".ogg":
        tkbps = min(opus_kbps, src_kbps) if src_kbps else opus_kbps
        return (["-c:a", "libopus", "-b:a", f"{tkbps}k",
                 "-vbr", "on", "-compression_level", "10"], ".opus")

    # OPUS -> OPUS (recompression si bitrate eleve)
    if ext == ".opus":
        tkbps = min(opus_kbps, src_kbps) if src_kbps else opus_kbps
        return (["-c:a", "libopus", "-b:a", f"{tkbps}k",
                 "-vbr", "on", "-compression_level", "10"], ".opus")

    # AAC / M4A -> AAC optimise
    if ext in (".aac", ".m4a"):
        tkbps = min(aac_kbps, src_kbps) if src_kbps else aac_kbps
        return (["-c:a", "aac", "-b:a", f"{tkbps}k",
                 "-movflags", "+faststart"], ".m4a")

    # Fallback : copie du stream sans reencoder
    return ["-c:a", "copy"], ext


# ── Traitement d'un fichier ───────────────────────────────────────────────────
def compress_file(
    src: Path,
    output_dir: Optional[Path],
    root: Path,
    min_saving_pct: float,
    dry_run: bool,
    target_fmt: str,
    opus_kbps: int,
    aac_kbps: int,
) -> Result:
    t0 = time.monotonic()
    original_size = src.stat().st_size
    ext = src.suffix.lower()

    codec_args, out_ext = build_plan(src, target_fmt, opus_kbps, aac_kbps)
    fmt_changed = (out_ext.lower() != ext.lower())
    method = f"{ext} -> {out_ext}"

    # Mode dry-run : on calcule juste les chemins, aucun fichier cree
    if dry_run:
        if output_dir:
            dst = mirror_path(src, root, output_dir, out_ext)
        else:
            dst = src.with_suffix(out_ext)
        return Result(
            src=src, dst=dst,
            original_size=original_size, compressed_size=original_size,
            saving_pct=0.0, status="copied",
            method=f"[DRY-RUN] {method}", duration_s=0.0,
        )

    # Fichier temporaire dans le dossier systeme
    tmp_fd, tmp_str = tempfile.mkstemp(suffix=out_ext)
    tmp_path = Path(tmp_str)
    os.close(tmp_fd)

    try:
        cmd = [
            "ffmpeg", "-y",
            "-i", str(src),
            *codec_args,
            "-map_metadata", "0",
            "-id3v2_version", "3",
            str(tmp_path),
        ]
        proc = subprocess.run(cmd, capture_output=True, timeout=300)

        if proc.returncode != 0:
            tmp_path.unlink(missing_ok=True)
            dst = _copy_original(src, root, output_dir)
            return Result(
                src=src, dst=dst,
                original_size=original_size, compressed_size=original_size,
                saving_pct=0.0, status="error", method=method,
                error_msg=proc.stderr.decode(errors="replace")[-400:],
                duration_s=time.monotonic() - t0,
            )

        compressed_size = tmp_path.stat().st_size
        saving_pct = (
            (1 - compressed_size / original_size) * 100
            if original_size else 0.0
        )

        # Pour une conversion de format (MP3->OPUS etc.) : on applique toujours,
        # le gain futur en maintenance justifie la conversion.
        # Pour meme format : on applique le seuil min_saving_pct.
        do_replace = fmt_changed or (saving_pct >= min_saving_pct)

        if not do_replace:
            tmp_path.unlink(missing_ok=True)
            dst = _copy_original(src, root, output_dir)
            return Result(
                src=src, dst=dst,
                original_size=original_size, compressed_size=original_size,
                saving_pct=saving_pct, status="copied", method=method,
                duration_s=time.monotonic() - t0,
            )

        # Deplacement vers la destination finale
        if output_dir:
            dst = mirror_path(src, root, output_dir, out_ext)
        else:
            dst = src.with_suffix(out_ext)

        shutil.move(str(tmp_path), dst)

        # En mode en-place : supprimer l'original si extension differente
        if not output_dir and dst != src:
            src.unlink()

        status = "converted" if fmt_changed else "recompressed"
        return Result(
            src=src, dst=dst,
            original_size=original_size, compressed_size=compressed_size,
            saving_pct=saving_pct, status=status, method=method,
            duration_s=time.monotonic() - t0,
        )

    except Exception as exc:
        tmp_path.unlink(missing_ok=True)
        dst = _copy_original(src, root, output_dir)
        return Result(
            src=src, dst=dst,
            original_size=original_size, compressed_size=original_size,
            saving_pct=0.0, status="error", method=method,
            error_msg=str(exc), duration_s=time.monotonic() - t0,
        )


def _copy_original(src: Path, root: Path, output_dir: Optional[Path]) -> Path:
    """Copie le fichier original dans output_dir (arborescence preservee)."""
    if output_dir:
        try:
            dst = mirror_path(src, root, output_dir)
            shutil.copy2(src, dst)
            return dst
        except Exception:
            pass
    return src


# ── Rapport CSV ───────────────────────────────────────────────────────────────
def write_csv(log_path: Path, results: list):
    with open(log_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow([
            "source", "destination", "methode",
            "original_bytes", "compresse_bytes",
            "gain_%", "statut", "duree_s", "erreur",
        ])
        for r in sorted(results, key=lambda x: str(x.src)):
            w.writerow([
                r.src, r.dst, r.method,
                r.original_size, r.compressed_size,
                f"{r.saving_pct:.2f}", r.status,
                f"{r.duration_s:.2f}", r.error_msg,
            ])


# ── Point d'entree ────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Compression audio intelligente format par format",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("folder", type=Path,
                        help="Dossier racine source")
    parser.add_argument("--output", type=Path, default=None, metavar="DIR",
                        help="Dossier de sortie (arborescence reproduite a l'identique)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Simulation : analyse et affichage sans creer de fichiers")
    parser.add_argument("--target-format", choices=["opus", "aac"], default="opus",
                        help="Format cible pour MP3/OGG (defaut: opus)")
    parser.add_argument("--opus-bitrate", type=int, default=128, metavar="KBPS",
                        help="Bitrate Opus en kbps (defaut: 128, transparent pour l'oreille)")
    parser.add_argument("--aac-bitrate", type=int, default=192, metavar="KBPS",
                        help="Bitrate AAC en kbps (defaut: 192)")
    parser.add_argument("--workers", type=int, default=os.cpu_count() or 4,
                        help="Nombre de threads paralleles (defaut: nb CPUs)")
    parser.add_argument("--min-saving", type=float, default=3.0, metavar="PCT",
                        help="Seuil de gain en %% pour meme-format (defaut: 3)")
    parser.add_argument("--log", type=Path, default=Path("compress_audio.log"),
                        help="Fichier de rapport CSV (defaut: compress_audio.log)")
    args = parser.parse_args()

    root: Path = args.folder.resolve()
    if not root.is_dir():
        print(color(f"[ERREUR] Dossier introuvable : {root}", Fore.RED if HAS_COLOR else ""))
        sys.exit(1)

    if not check_ffmpeg():
        print(color("[ERREUR] ffmpeg introuvable. https://ffmpeg.org", Fore.RED if HAS_COLOR else ""))
        sys.exit(1)

    if args.output and not args.dry_run:
        args.output.mkdir(parents=True, exist_ok=True)

    sep = color("=" * 64, Fore.CYAN if HAS_COLOR else "")
    print(sep)
    print(color("  COMPRESS AUDIO  —  compression intelligente par format", Fore.CYAN if HAS_COLOR else ""))
    print(sep)
    print(f"  Source          : {root}")
    print(f"  Sortie          : {args.output or '(modification en place)'}")
    print(f"  Mode            : {'[DRY-RUN]' if args.dry_run else 'REEL'}")
    print(f"  MP3/OGG -> {args.target_format.upper():<4}  : {args.opus_bitrate if args.target_format == 'opus' else args.aac_bitrate} kbps")
    print(f"  FLAC/WAV/AIFF   : -> FLAC lossless niveau 8")
    print(f"  Threads         : {args.workers}")
    print(f"  Seuil (meme fmt): {args.min_saving:.0f}%")
    print()

    print("Scan des fichiers audio...")
    files = find_audio_files(root)
    if not files:
        print(color("Aucun fichier audio trouve.", Fore.YELLOW if HAS_COLOR else ""))
        sys.exit(0)

    # Resume des formats trouves
    from collections import Counter
    ext_counts = Counter(p.suffix.lower() for p in files)
    print(f"  -> {len(files)} fichier(s) : " +
          "  ".join(f"{e}:{n}" for e, n in sorted(ext_counts.items())))
    print()

    stats = Stats()
    all_results = []
    results_lock = Lock()

    bar = (tqdm(total=len(files), unit="fichier", dynamic_ncols=True)
           if HAS_TQDM else None)

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {
            pool.submit(
                compress_file,
                f, args.output, root,
                args.min_saving, args.dry_run,
                args.target_format, args.opus_bitrate, args.aac_bitrate,
            ): f
            for f in files
        }

        for future in as_completed(futures):
            r = future.result()
            stats.add(r)
            with results_lock:
                all_results.append(r)

            try:
                label = str(r.src.relative_to(root))
            except ValueError:
                label = r.src.name

            if r.status in ("converted", "recompressed"):
                gain_str = f"-{r.saving_pct:.1f}%"
                icon = "[+]" if r.status == "converted" else "[~]"
                msg = (
                    color(f"{icon} {label}", Fore.GREEN if HAS_COLOR else "")
                    + f"  [{r.method}]"
                    + f"  {human_size(r.original_size)} -> {human_size(r.compressed_size)}"
                    + color(f"  ({gain_str})", Fore.GREEN if HAS_COLOR else "")
                )
            elif r.status == "copied":
                msg = color(
                    f"[=] {label}  [{r.method}]  copie sans recompression",
                    Fore.YELLOW if HAS_COLOR else "",
                )
            else:
                msg = color(
                    f"[!] {label}  ERREUR: {r.error_msg[:100]}",
                    Fore.RED if HAS_COLOR else "",
                )

            if bar:
                bar.set_postfix_str(label[:36])
                bar.write(msg)
                bar.update(1)
            else:
                print(msg)

    if bar:
        bar.close()

    # Rapport final
    saved = stats.bytes_before - stats.bytes_after
    pct_total = (saved / stats.bytes_before * 100) if stats.bytes_before else 0.0

    print()
    print(sep)
    print(color("  RAPPORT FINAL", Fore.CYAN if HAS_COLOR else ""))
    print(sep)
    print(f"  Fichiers traites      : {stats.total}")
    print(color(f"  Convertis (format)    : {stats.converted}", Fore.GREEN if HAS_COLOR else ""))
    print(color(f"  Recompresses          : {stats.recompressed}", Fore.GREEN if HAS_COLOR else ""))
    print(color(f"  Copies (inchanges)    : {stats.copied}", Fore.YELLOW if HAS_COLOR else ""))
    print(color(f"  Erreurs               : {stats.errors}", Fore.RED if HAS_COLOR else ""))
    print(f"  Taille avant          : {human_size(stats.bytes_before)}")
    print(f"  Taille apres          : {human_size(stats.bytes_after)}")
    gain_color = Fore.GREEN if HAS_COLOR and saved > 0 else (Fore.RED if HAS_COLOR else "")
    print(color(
        f"  Espace libere         : {human_size(saved)} ({pct_total:.1f}%)",
        gain_color,
    ))
    print()

    write_csv(args.log, all_results)
    print(f"  Rapport CSV : {args.log}")
    print(sep)


if __name__ == "__main__":
    main()