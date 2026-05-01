import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, ActivatedRoute, Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { HttpClient } from "@angular/common/http";
import { debounceTime, distinctUntilChanged, Subject } from "rxjs";
import { Author, Folder, Media, Page } from "../../core/models/models";
import { MediaService } from "../../core/services/media.service";
import { AudioPlayerService } from "../../core/services/audio-player.service";
import { FolderService } from "../../core/services/folder.service";
import { AuthorService } from "../../core/services/author.service";
import { PostService } from "../../core/services/post.service";
import { Post } from "../../core/models/models";

@Component({
  selector: "app-explorer",
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatIconModule],
  styles: [
    `
      :host {
        display: block;
        background: var(--bg-primary);
        min-height: 100svh;
      }

      /* ──── Header ──── */
      .header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 99;
        background: rgba(10, 10, 15, 0.95);
        backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        padding: 12px 16px 0;
      }

      .header-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 10px;
      }

      .header-title {
        font-size: 20px;
        font-weight: 800;
        background: linear-gradient(135deg, #fff 0%, var(--accent-light) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        flex: 1;
      }

      .view-toggle {
        display: flex;
        gap: 4px;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 10px;
        padding: 3px;
      }

      .view-btn {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 5px 8px;
        border-radius: 7px;
        display: flex;
        align-items: center;
        transition: all 0.2s;
      }
      .view-btn.active {
        background: var(--accent);
        color: white;
      }
      .view-btn mat-icon {
        font-size: 18px;
      }

      /* Search */
      .search-wrap {
        position: relative;
        margin-bottom: 10px;
      }
      .search-icon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-secondary);
        font-size: 18px;
      }
      .search-input {
        width: 100%;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: var(--text-primary);
        padding: 10px 12px 10px 38px;
        border-radius: 50px;
        font-size: 13px;
        font-family: inherit;
        outline: none;
        transition: border-color 0.2s;
      }
      .search-input:focus {
        border-color: var(--accent);
      }
      .filters-row {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 10px;
      }
      .filter-input {
        width: 100%;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: var(--text-primary);
        padding: 10px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-family: inherit;
        outline: none;
      }
      .filter-input:focus {
        border-color: var(--accent);
      }

      /* Breadcrumb */
      .breadcrumb {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 0 8px;
        overflow-x: auto;
        white-space: nowrap;
        scrollbar-width: none;
      }
      .breadcrumb::-webkit-scrollbar {
        display: none;
      }

      .crumb {
        background: none;
        border: none;
        font-size: 12px;
        color: var(--accent-light);
        cursor: pointer;
        font-family: inherit;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 3px 8px;
        border-radius: 6px;
        transition: background 0.2s;
      }
      .crumb:hover {
        background: rgba(124, 58, 237, 0.15);
      }
      .crumb.root mat-icon {
        font-size: 16px;
      }
      .crumb-sep {
        color: rgba(255, 255, 255, 0.2);
        font-size: 12px;
      }

      /* ──── Content ──── */
      .content {
        padding: 0 14px 160px;
        /* dynamically set by header height */
      }

      /* Section titre */
      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 16px 0 10px;
      }

      .section-title {
        font-size: 11px;
        font-weight: 700;
        color: var(--text-secondary);
        letter-spacing: 1px;
        text-transform: uppercase;
      }

      .section-count {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.3);
      }

      /* ──── Folders grid ──── */
      .folders-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }

      .folder-card {
        background: var(--bg-card);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 16px;
        padding: 16px 14px;
        cursor: pointer;
        transition: all 0.25s;
        position: relative;
        overflow: hidden;
      }
      .folder-card::before {
        content: "";
        position: absolute;
        top: -30px;
        right: -30px;
        width: 80px;
        height: 80px;
        background: radial-gradient(
          circle,
          rgba(124, 58, 237, 0.2),
          transparent
        );
        border-radius: 50%;
      }
      .folder-card:hover {
        border-color: rgba(124, 58, 237, 0.4);
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(124, 58, 237, 0.15);
      }
      .folder-card.playing-folder {
        border-color: rgba(124, 58, 237, 0.6);
        background: rgba(124, 58, 237, 0.08);
      }

      .folder-icon {
        font-size: 32px;
        color: var(--accent-light);
        margin-bottom: 8px;
      }

      .folder-name {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-primary);
        word-break: break-word;
        line-height: 1.3;
        margin-bottom: 4px;
      }

      .folder-meta {
        font-size: 10px;
        color: var(--text-secondary);
      }

      /* ──── Files list ──── */
      .files-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .file-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.04);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .file-row:hover,
      .file-row.active {
        background: rgba(124, 58, 237, 0.1);
        border-color: rgba(124, 58, 237, 0.3);
      }

      .file-thumb {
        width: 42px;
        height: 42px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        background: radial-gradient(
          circle,
          rgba(124, 58, 237, 0.4),
          rgba(76, 29, 149, 0.3)
        );
      }
      .file-thumb mat-icon {
        font-size: 20px;
        color: var(--accent-light);
      }

      .file-info {
        flex: 1;
        overflow: hidden;
      }
      .file-name {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .file-sub {
        font-size: 10px;
        color: var(--text-secondary);
        margin-top: 2px;
      }

      .file-play {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 6px;
        border-radius: 50%;
        display: flex;
        transition: all 0.2s;
        flex-shrink: 0;
      }
      .file-play:hover,
      .file-row.active .file-play {
        color: var(--accent-light);
      }
      .file-play mat-icon {
        font-size: 22px;
      }

      /* Fichiers en grid */
      .files-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
      }

      .file-grid-card {
        background: var(--bg-card);
        border: 1px solid rgba(255, 255, 255, 0.04);
        border-radius: 12px;
        padding: 14px 8px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
      }
      .file-grid-card:hover,
      .file-grid-card.active {
        border-color: rgba(124, 58, 237, 0.4);
        background: rgba(124, 58, 237, 0.08);
      }
      .file-grid-card mat-icon {
        font-size: 28px;
        color: var(--accent-light);
        margin-bottom: 6px;
      }
      .file-grid-name {
        font-size: 9px;
        color: var(--text-secondary);
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      /* ──── Nav ──── */
      .bottom-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: space-around;
        align-items: center;
        background: rgba(8, 8, 14, 0.95);
        backdrop-filter: blur(20px);
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        padding: 10px 0 max(10px, env(safe-area-inset-bottom));
        z-index: 100;
      }
      .nav-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.4);
        font-size: 10px;
        font-weight: 500;
        cursor: pointer;
        padding: 6px 14px;
        border-radius: 12px;
        text-decoration: none;
        transition: all 0.2s;
      }
      .nav-btn mat-icon {
        font-size: 22px;
      }
      .nav-btn.active,
      .nav-btn:hover {
        color: var(--accent-light);
      }
      .nav-upload {
        background: var(--accent);
        border-radius: 16px;
        padding: 10px 20px;
        color: white !important;
        box-shadow: 0 0 16px rgba(124, 58, 237, 0.4);
      }

      /* Spinner */
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      .spin {
        animation: spin 1s linear infinite;
        display: inline-block;
      }
    `,
  ],
  template: `
    <!--─── HEADER FIXE ───────────────────────────────────────────────────────-->
    <div class="header" #header>
      <div class="header-row">
        <span class="header-title">Explorer</span>

        <!-- Scan incrémental -->
        <button
          (click)="scan()"
          title="Scan incrémental (nouveaux fichiers uniquement)"
          style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);
                       color:var(--text-secondary);padding:7px;border-radius:10px;cursor:pointer;display:flex"
        >
          <mat-icon [class.spin]="scanning" style="font-size:18px">{{
            scanning ? "autorenew" : "sync"
          }}</mat-icon>
        </button>

        <!-- Reset + Scan complet -->
        <button
          (click)="resetScan()"
          title="Vider la BD et rescanner tout"
          style="background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);
                       color:#f87171;padding:7px;border-radius:10px;cursor:pointer;display:flex"
        >
          <mat-icon [class.spin]="resetting" style="font-size:18px">{{
            resetting ? "autorenew" : "restart_alt"
          }}</mat-icon>
        </button>

        <!-- Vue -->
        <div class="view-toggle">
          <button
            class="view-btn"
            [class.active]="viewMode === 'list'"
            (click)="viewMode = 'list'"
          >
            <mat-icon>view_list</mat-icon>
          </button>
          <button
            class="view-btn"
            [class.active]="viewMode === 'grid'"
            (click)="viewMode = 'grid'"
          >
            <mat-icon>grid_view</mat-icon>
          </button>
        </div>
      </div>

      <!-- Recherche -->
      <div class="search-wrap">
        <mat-icon class="search-icon">search</mat-icon>
        <input
          class="search-input"
          placeholder="Rechercher un audio, un dossier..."
          [(ngModel)]="searchQuery"
          (ngModelChange)="onSearch($event)"
        />
        @if (searchQuery) {
          <button
            (click)="clearSearch()"
            style="position:absolute;right:12px;top:50%;transform:translateY(-50%);
                         background:none;border:none;color:var(--text-secondary);cursor:pointer;display:flex"
          >
            <mat-icon style="font-size:18px">close</mat-icon>
          </button>
        }
      </div>

      <div class="filters-row">
        <select
          class="filter-input"
          [(ngModel)]="selectedFolderId"
          (change)="triggerAdvancedSearch()"
        >
          <option [ngValue]="null">Toutes les catégories</option>
          @for (f of allFolders; track f.id) {
            <option [ngValue]="f.id">{{ f.name }}</option>
          }
        </select>

        <select
          class="filter-input"
          [(ngModel)]="selectedAuthorId"
          (change)="triggerAdvancedSearch()"
        >
          <option [ngValue]="null">Tous les auteurs</option>
          @for (author of authors; track author.id) {
            <option [ngValue]="author.id">{{ author.name }}</option>
          }
        </select>

        <select
          class="filter-input"
          [(ngModel)]="selectedYear"
          (change)="triggerAdvancedSearch()"
        >
          <option [ngValue]="null">Toutes les années</option>
          <option [ngValue]="2025">2025</option>
          <option [ngValue]="2024">2024</option>
          <option [ngValue]="2023">2023</option>
          <option [ngValue]="2022">2022</option>
          <option [ngValue]="2021">2021</option>
        </select>

        @if (hasActiveFilters()) {
          <button class="filter-input" (click)="clearFilters()">
            Reinitialiser les filtres
          </button>
        }
      </div>

      <!-- Fil d'Ariane -->
      @if (!searchQuery) {
        <div class="breadcrumb">
          <button class="crumb root" (click)="goRoot()">
            <mat-icon>home</mat-icon> Accueil
          </button>
          @for (b of breadcrumb; track b.id) {
            <span class="crumb-sep">›</span>
            <button class="crumb" (click)="openFolder(b, true)">
              {{ b.name }}
            </button>
          }
        </div>
      }
    </div>

    <!--─── CONTENU ───────────────────────────────────────────────────────────-->
    <div class="content" [style.padding-top]="headerHeight + 'px'">
      <!--── RÉSULTATS DE RECHERCHE ──────────────────────────────────────────-->
      @if (searchQuery || hasActiveFilters()) {
        <div class="section-header">
          <span class="section-title">Résultats de la recherche</span>
          <span class="section-count">{{ searchResults.length }} post(s)</span>
        </div>

        @if (searchResults.length === 0 && !searching) {
          <div
            style="text-align:center;padding:48px 24px;color:var(--text-secondary)"
          >
            <mat-icon style="font-size:48px;opacity:.3">search_off</mat-icon>
            <p style="margin-top:12px;font-size:14px">Aucun résultat trouvé.</p>
          </div>
        }

        <div class="files-list">
          @for (post of searchResults; track post.id) {
            <div
              class="file-row"
              [id]="'media-' + post.media.id"
              [class.active]="player.playing?.id === post.media.id"
              (click)="playPost(post)"
            >
              <div class="file-thumb">
                <mat-icon>{{
                  post.media.type === "VIDEO" ? "videocam" : "music_note"
                }}</mat-icon>
              </div>
              <div class="file-info">
                <div class="file-name">
                  {{ post.title || post.media.filename }}
                </div>
                <div class="file-sub">
                  {{ post.author.name || "Inconnu" }} ·
                  {{ post.media.folder?.name || "—" }}
                </div>
              </div>
              <button
                class="file-play"
                (click)="$event.stopPropagation(); playPost(post)"
              >
                <mat-icon>{{
                  player.playing?.id === post.media.id && player.isPlaying
                    ? "pause_circle"
                    : "play_circle"
                }}</mat-icon>
              </button>
            </div>
          }
        </div>
      } @else if (!searchQuery && !hasActiveFilters()) {
        <!--── DOSSIERS ──────────────────────────────────────────────────────-->
        @if (filteredFolders.length > 0) {
          <div class="section-header">
            <span class="section-title">Dossiers</span>
            <span class="section-count">{{ filteredFolders.length }}</span>
          </div>
          <div class="folders-grid">
            @for (f of filteredFolders; track f.id) {
              <div
                class="folder-card"
                [class.playing-folder]="player.playing?.folder?.id === f.id"
                (click)="openFolder(f)"
              >
                <div
                  style="display:flex;justify-content:space-between;align-items:flex-start;"
                >
                  <mat-icon class="folder-icon">folder</mat-icon>
                  @if (player.playing?.folder?.id === f.id) {
                    <mat-icon
                      style="color:var(--accent-light);font-size:18px;"
                      title="Lecture en cours"
                      >graphic_eq</mat-icon
                    >
                  }
                </div>
                <div class="folder-name">{{ f.name }}</div>
                <div class="folder-meta">
                  <div style="margin-bottom: 2px;">
                    <mat-icon style="font-size:11px;vertical-align:middle"
                      >subdirectory_arrow_right</mat-icon
                    >
                    {{ f.children?.length || 0 }} sous-dossier(s)
                  </div>
                  <div
                    style="display:flex; gap: 8px; align-items:center; margin-top: 4px;"
                  >
                    <span
                      title="Fichiers audio"
                      style="display:flex;align-items:center;gap:2px;"
                    >
                      <mat-icon
                        style="font-size:12px;color:rgba(255,255,255,0.5)"
                        >music_note</mat-icon
                      >
                      {{ f.audioCount || 0 }}
                    </span>
                    <span
                      title="Fichiers vidéo"
                      style="display:flex;align-items:center;gap:2px;"
                    >
                      <mat-icon
                        style="font-size:12px;color:rgba(255,255,255,0.5)"
                        >videocam</mat-icon
                      >
                      {{ f.videoCount || 0 }}
                    </span>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!--── FICHIERS ──────────────────────────────────────────────────────-->
        @if (filteredMedias.length > 0) {
          <div class="section-header">
            <span class="section-title">Fichiers</span>
            <span class="section-count"
              >{{ displayedMediaCount }} au total</span
            >
          </div>

          <!-- Vue liste -->
          @if (viewMode === "list") {
            <div class="files-list">
              @for (m of filteredMedias; track m.id) {
                <div
                  class="file-row"
                  [id]="'media-' + m.id"
                  [class.active]="player.playing?.id === m.id"
                  style="display:flex; align-items:center; justify-content:space-between;"
                >
                  <div
                    (click)="playMedia(m)"
                    style="flex:1; display:flex; align-items:center; gap:12px; cursor:pointer;"
                  >
                    <div class="file-thumb">
                      <mat-icon>{{
                        m.type === "VIDEO" ? "videocam" : "music_note"
                      }}</mat-icon>
                    </div>
                    <div class="file-info">
                      <div class="file-name">{{ m.filename }}</div>
                      <div class="file-sub">
                        {{ formatSize(m.size) }} ·
                        {{ formatDuration(m.durationMs) }}
                      </div>
                    </div>
                  </div>

                  <!-- Action Buttons -->
                  <div style="display:none; gap:4px; margin-right:8px;">
                    @if (m.status === "NEW") {
                      <button
                        (click)="analyzeMedia(m, $event)"
                        title="Analyser le média"
                        style="background:rgba(59,130,246,0.2); border:1px solid rgba(59,130,246,0.3); color:#60a5fa; padding:5px 10px; border-radius:6px; font-size:11px; cursor:pointer; font-weight:600; transition:all 0.2s"
                      >
                        Analyser
                      </button>
                    }
                    @if (m.status === "ANALYZED") {
                      <button
                        (click)="createPost(m, $event)"
                        title="Créer une publication"
                        style="background:rgba(34,197,94,0.2); border:1px solid rgba(34,197,94,0.3); color:#4ade80; padding:5px 10px; border-radius:6px; font-size:11px; cursor:pointer; font-weight:600; transition:all 0.2s"
                      >
                        Publier
                      </button>
                    }
                    @if (m.status === "ANALYZED") {
                      <button
                        (click)="publish(m, $event)"
                        title="Marquer comme publié"
                        style="background:rgba(168,85,247,0.2); border:1px solid rgba(168,85,247,0.3); color:#d8b4fe; padding:5px 10px; border-radius:6px; font-size:11px; cursor:pointer; font-weight:600; transition:all 0.2s"
                      >
                        ✓ Publié
                      </button>
                    }
                  </div>

                  <button
                    class="file-play"
                    (click)="$event.stopPropagation(); playMedia(m)"
                  >
                    <mat-icon>{{
                      player.playing?.id === m.id && player.isPlaying
                        ? "pause_circle"
                        : "play_circle"
                    }}</mat-icon>
                  </button>
                </div>
              }
            </div>
          }

          <!-- Vue grille -->
          @if (viewMode === "grid") {
            <div class="files-grid">
              @for (m of filteredMedias; track m.id) {
                <div
                  class="file-grid-card"
                  [id]="'media-' + m.id"
                  [class.active]="player.playing?.id === m.id"
                  (click)="playMedia(m)"
                >
                  <mat-icon>{{
                    m.type === "VIDEO" ? "videocam" : "music_note"
                  }}</mat-icon>
                  <div class="file-grid-name">{{ m.filename }}</div>
                </div>
              }
            </div>
          }

          <!-- Pagination fichiers -->
          @if (!hasActiveFilters() && mediaPage * mediaSize < mediaTotalCount) {
            <button
              (click)="loadMoreFiles()"
              style="width:100%;margin-top:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);
                           color:var(--text-secondary);padding:12px;border-radius:12px;cursor:pointer;font-size:13px;font-family:inherit"
            >
              Charger plus…
            </button>
          }
        }

        <!-- Dossier vide -->
        @if (filteredFolders.length === 0 && filteredMedias.length === 0) {
          <div
            style="text-align:center;padding:80px 24px;color:var(--text-secondary)"
          >
            <mat-icon style="font-size:64px;opacity:.2">folder_open</mat-icon>
            <p style="margin-top:16px;font-size:14px">Aucun contenu trouvé</p>
            <p style="font-size:12px;margin-top:8px;opacity:.6">
              Lancez un scan ou naviguez dans un dossier
            </p>
          </div>
        }
      }
    </div>

    <!--─── NAVIGATION ────────────────────────────────────────────────────────-->
    <nav class="bottom-nav">
      <a class="nav-btn" routerLink="/home"><mat-icon>home</mat-icon>Feed</a>
      <a class="nav-btn active" routerLink="/explorer"
        ><mat-icon>explore</mat-icon>Explorer</a
      >
      <a class="nav-btn" routerLink="/media" style="display:none"
        ><mat-icon>storage</mat-icon>Médias</a
      >
      <a class="nav-btn nav-upload" routerLink="/upload"
        ><mat-icon>add</mat-icon></a
      >
      <a class="nav-btn" routerLink="/live"><mat-icon>radio</mat-icon>Live</a>
      <a class="nav-btn" routerLink="/profile/0"
        ><mat-icon>person_outline</mat-icon>Profil</a
      >
    </nav>
  `,
})
export class ExplorerComponent implements OnInit, OnDestroy {
  authors: Author[] = [];
  folders: Folder[] = [];
  allFolders: Folder[] = []; // For global search dropdown
  medias: Media[] = [];
  searchResults: Post[] = []; // Now fetching Posts!
  searchQuery = "";
  breadcrumb: Folder[] = [];
  viewMode: "list" | "grid" = "list";
  currentFolderId: number | null = null;

  selectedAuthorId: number | null = null;
  selectedFolderId: number | null = null;
  selectedYear: number | null = null;

  scanning = false;
  resetting = false;
  searching = false;
  headerHeight = 160;

  mediaPage = 0;
  mediaSize = 30;
  mediaTotalCount = 0;

  private searchSubject = new Subject<void>();

  constructor(
    private authorService: AuthorService,
    private folderService: FolderService,
    private mediaService: MediaService,
    private postService: PostService,
    public player: AudioPlayerService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.authorService.getAll().subscribe({
      next: (authors) => {
        this.authors = authors.length
          ? authors
          : [{ id: 0, name: "Dr Kindo", createdAt: "" }];
      },
      error: () => {
        this.authors = [{ id: 0, name: "Dr Kindo", createdAt: "" }];
      },
    });

    this.folderService.getRoots().subscribe((folders) => {
      this.allFolders = folders;
    });

    // Recherche avec debounce
    this.searchSubject
      .pipe(debounceTime(350))
      .subscribe(() => this.doAdvancedSearch());

    this.route.queryParams.subscribe((params) => {
      const folderId = params["folderId"];
      const highlight = params["highlight"];

      if (folderId) {
        // Fetch the folder details to pass to openFolder
        this.folderService.getById(folderId).subscribe((folder) => {
          this.openFolder(folder);

          if (highlight) {
            // Wait for media rendering
            setTimeout(() => {
              const el = document.getElementById("media-" + highlight);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                // Optional: add a temporary highlight effect
                el.style.background = "rgba(124, 58, 237, 0.3)";
                setTimeout(() => (el.style.background = ""), 2000);
              }
            }, 500);
          }
        });
      } else {
        this.loadRoot();
      }
    });
  }

  ngOnDestroy() {
    // Le composant local ne gère plus la destruction de l'audio.
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  loadRoot() {
    this.folderService.getRoots().subscribe((folders) => {
      this.folders = folders.filter(
        (f) =>
          (f.children?.length || 0) > 0 ||
          (f.audioCount || 0) > 0 ||
          (f.videoCount || 0) > 0,
      );
      this.medias = [];
      this.mediaTotalCount = 0;
    });
  }

  openFolder(folder: Folder, fromCrumb = false) {
    if (fromCrumb) {
      const idx = this.breadcrumb.findIndex((b) => b.id === folder.id);
      this.breadcrumb = this.breadcrumb.slice(0, idx + 1);
    } else {
      this.breadcrumb.push(folder);
    }
    this.currentFolderId = folder.id;
    this.mediaPage = 0;
    this.medias = [];

    // Charger sous-dossiers
    this.folderService.getChildren(folder.id).subscribe((f) => {
      this.folders = f.filter(
        (sub) =>
          (sub.children?.length || 0) > 0 ||
          (sub.audioCount || 0) > 0 ||
          (sub.videoCount || 0) > 0,
      );
    });

    // Charger fichiers du dossier (tous d'un coup via l'API folder)
    this.mediaService.getByFolder(folder.id).subscribe((m) => {
      m.forEach((media) => (media.folder = folder));
      this.medias = m;
      this.mediaTotalCount = m.length;
    });
  }

  goRoot() {
    this.breadcrumb = [];
    this.currentFolderId = null;
    this.mediaPage = 0;
    this.medias = [];
    this.loadRoot();
  }

  // ── Fichiers paginés de la vue globale ───────────────────────────────────
  loadMoreFiles() {
    this.mediaPage++;
    this.mediaService.getAll(this.mediaPage, this.mediaSize).subscribe((p) => {
      this.medias = [...this.medias, ...p.content];
      this.mediaTotalCount = p.totalElements;
    });
  }

  // ── Recherche ────────────────────────────────────────────────────────────
  onSearch(q: string) {
    this.searchSubject.next();
  }

  triggerAdvancedSearch() {
    this.searchSubject.next();
  }

  doAdvancedSearch() {
    if (!this.searchQuery && !this.hasActiveFilters()) {
      this.searchResults = [];
      return;
    }

    this.searching = true;
    const criteria: any = {};
    if (this.searchQuery) criteria.query = this.searchQuery;
    if (this.selectedAuthorId) criteria.authorId = this.selectedAuthorId;
    if (this.selectedFolderId) criteria.folderId = this.selectedFolderId;
    if (this.selectedYear) criteria.year = this.selectedYear;

    this.postService.search(criteria, 0, 50).subscribe((p) => {
      this.searchResults = p.content;
      this.searching = false;
    });
  }

  clearSearch() {
    this.searchQuery = "";
    this.doAdvancedSearch();
  }

  clearFilters() {
    this.selectedAuthorId = null;
    this.selectedFolderId = null;
    this.selectedYear = null;
    this.doAdvancedSearch();
  }

  get filteredFolders(): Folder[] {
    return this.folders;
  }

  get filteredMedias(): Media[] {
    return this.medias;
  }

  get displayedMediaCount(): number {
    return this.mediaTotalCount;
  }

  hasActiveFilters(): boolean {
    return !!(
      this.selectedAuthorId ||
      this.selectedFolderId ||
      this.selectedYear
    );
  }

  // ── Player ───────────────────────────────────────────────────────────────
  playMedia(media: Media) {
    this.player.playMedia(media, this.medias);
  }

  playPost(post: Post) {
    this.player.playMedia(
      post.media,
      this.searchResults.map((p) => p.media),
    );
  }

  // ── Scan ─────────────────────────────────────────────────────────────────
  scan() {
    this.scanning = true;
    this.mediaService.triggerScan().subscribe({
      next: () => {
        this.scanning = false;
        this.goRoot();
      },
      error: () => {
        this.scanning = false;
      },
    });
  }

  resetScan() {
    if (
      !confirm(
        "Vider la base de données et rescanner tout le dossier drkindo ?",
      )
    )
      return;
    this.resetting = true;
    this.mediaService.resetAndScan().subscribe({
      next: (res: any) => {
        this.resetting = false;
        this.goRoot();
        alert(
          `✅ Reset terminé !\n${res.foldersCreated} dossier(s) et ${res.filesScanned} fichier(s) indexé(s).`,
        );
      },
      error: () => {
        this.resetting = false;
      },
    });
  }

  // ── Media Actions ────────────────────────────────────────────────────────
  analyzeMedia(media: Media, event: Event) {
    event.stopPropagation();
    media.status = "ANALYZED"; // Optimistic update
    this.mediaService.analyze(media.id).subscribe({
      next: () => {
        // Status updated
      },
      error: () => alert("Erreur lors de l'analyse"),
    });
  }

  createPost(media: Media, event: Event) {
    event.stopPropagation();
    // Navigate to post editor with mediaId
    this.router.navigate(["/post/new"], { queryParams: { mediaId: media.id } });
  }

  publish(media: Media, event: Event) {
    event.stopPropagation();
    if (media.status !== "ANALYZED") {
      alert("Analysez le média d'abord");
      return;
    }
    this.mediaService.changeStatus(media.id, "PUBLISHED").subscribe({
      next: () => {
        media.status = "PUBLISHED";
      },
      error: () => alert("Erreur lors de la publication"),
    });
  }

  formatSize(bytes: number): string {
    if (!bytes) return "—";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  }

  formatTime(s: number): string {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60)
      .toString()
      .padStart(2, "0")}`;
  }

  formatDuration(ms?: number): string {
    if (!ms) return "-";
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
}
