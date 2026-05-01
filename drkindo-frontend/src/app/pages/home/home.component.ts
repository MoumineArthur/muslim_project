import { Component, OnInit, OnDestroy, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { Subscription } from "rxjs";
import { Post } from "../../core/models/models";
import { PostService } from "../../core/services/post.service";
import { MediaService } from "../../core/services/media.service";
import { AuthService } from "../../core/services/auth.service";
import { AudioPlayerService } from "../../core/services/audio-player.service";
import { FolderService } from "../../core/services/folder.service";
import { Folder } from "../../core/models/models";

@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  styles: [
    `
      /* ──── Container Global ──── */
      .page-container {
        height: 100svh;
        overflow-y: auto;
        background: var(--bg-primary);
        padding-bottom: 80px; /* Space for global player & nav */
        font-family: 'Inter', sans-serif;
      }

      /* ──── Header & Tabs ──── */
      .header {
        position: sticky;
        top: 0;
        z-index: 50;
        background: rgba(8, 8, 14, 0.95);
        backdrop-filter: blur(20px);
        padding: 16px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }
      
      .page-title {
        font-size: 24px;
        font-weight: 800;
        background: linear-gradient(90deg, #a855f7, #ec4899);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 16px;
      }

      .tabs {
        display: flex;
        gap: 12px;
      }

      .tab-btn {
        flex: 1;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: var(--text-secondary);
        padding: 10px 16px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: center;
      }

      .tab-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }

      .tab-btn.active {
        background: var(--accent);
        border-color: var(--accent);
        color: white;
        box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
      }

      /* ──── Category Chips ──── */
      .chips-container {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding: 0 20px 12px;
        scrollbar-width: none;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }
      .chips-container::-webkit-scrollbar {
        display: none;
      }
      .chip {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: var(--text-secondary);
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .chip:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }
      .chip.active {
        background: rgba(124, 58, 237, 0.2);
        color: var(--accent-light);
        border-color: rgba(124, 58, 237, 0.4);
      }

      /* ──── Feed List ──── */
      .feed-list {
        padding: 16px 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .post-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        transition: transform 0.2s ease, background 0.2s ease;
      }

      .post-card:hover {
        background: rgba(255, 255, 255, 0.06);
        transform: translateY(-2px);
      }

      .post-card.active-playing {
        border-color: rgba(124, 58, 237, 0.5);
        background: rgba(124, 58, 237, 0.05);
        box-shadow: 0 0 20px rgba(124, 58, 237, 0.1);
      }

      /* Row 1: Image + Info */
      .post-header {
        display: flex;
        gap: 16px;
        align-items: center;
      }

      .post-thumb {
        width: 80px;
        height: 80px;
        border-radius: 12px;
        background: linear-gradient(135deg, #4c1d95, #9d174d);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        position: relative;
        overflow: hidden;
      }
      
      .post-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .play-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s;
        cursor: pointer;
      }
      
      .post-thumb:hover .play-overlay {
        opacity: 1;
      }
      
      .play-overlay mat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        color: white;
      }
      
      .post-thumb.active-playing .play-overlay {
        opacity: 1;
        background: rgba(124, 58, 237, 0.5);
      }

      .post-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .post-category {
        font-size: 11px;
        text-transform: uppercase;
        color: var(--accent-light);
        font-weight: 700;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .post-title {
        font-size: 16px;
        font-weight: 600;
        color: white;
        line-height: 1.3;
        margin-bottom: 6px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .post-author {
        font-size: 12px;
        color: var(--text-secondary);
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .post-meta {
        font-size: 11px;
        color: rgba(255,255,255,0.4);
        margin-top: 4px;
      }

      /* Row 2: Actions */
      .post-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 4px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
      }

      .action-group {
        display: flex;
        gap: 16px;
      }

      .action-btn {
        background: none;
        border: none;
        color: var(--text-secondary);
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        padding: 4px;
        border-radius: 6px;
        transition: all 0.2s;
      }

      .action-btn:hover {
        color: white;
        background: rgba(255, 255, 255, 0.05);
      }

      .action-btn mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .action-btn.liked {
        color: #f472b6;
      }

      .play-main-btn {
        background: var(--accent);
        border: none;
        color: white;
        border-radius: 20px;
        padding: 6px 16px;
        font-size: 12px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .play-main-btn:hover {
        background: var(--accent-light);
        transform: scale(1.05);
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
        padding: 6px 16px;
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

      /* ──── Loaders & Empty ──── */
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      .spinner {
        animation: spin 1s linear infinite;
      }
      .empty-state {
        padding: 60px 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        color: var(--text-secondary);
        text-align: center;
      }
      .empty-state mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        opacity: 0.3;
      }
    `,
  ],
  template: `
    <div class="page-container" (scroll)="onScroll($event)">
      <!-- Header -->
      <div class="header">
        <h1 class="page-title">Découverte</h1>
        <div class="tabs">
          <button 
            class="tab-btn" 
            [class.active]="activeTab === 'AUDIO'"
            (click)="switchTab('AUDIO')"
          >
            Podcasts Audio
          </button>
          <button 
            class="tab-btn" 
            [class.active]="activeTab === 'VIDEO'"
            (click)="switchTab('VIDEO')"
          >
            Vidéos
          </button>
        </div>
      </div>

      <!-- Category Chips -->
      <div class="chips-container">
        <button class="chip" [class.active]="selectedFolderId === null" (click)="selectFolder(null)">
          Toutes
        </button>
        @for (folder of folders; track folder.id) {
          <button class="chip" [class.active]="selectedFolderId === folder.id" (click)="selectFolder(folder.id)">
            {{ folder.name }}
          </button>
        }
      </div>

      <!-- Feed List -->
      <div class="feed-list">
        @if (loading && posts.length === 0) {
          <div class="empty-state">
            <mat-icon class="spinner">autorenew</mat-icon>
            <p>Chargement en cours…</p>
          </div>
        }

        @for (post of posts; track post.id; let i = $index) {
          <div class="post-card" [class.active-playing]="audioPlayer.playing?.id === post.media.id">
            
            <div class="post-header" (click)="togglePlay(post)" style="cursor: pointer;">
              <div class="post-thumb" [class.active-playing]="audioPlayer.playing?.id === post.media.id && audioPlayer.isPlaying">
                <!-- Fallback thumbnail if none available -->
                <mat-icon *ngIf="!getMediaThumbnail(post.media) || getMediaThumbnail(post.media) === 'assets/default-thumbnail.png'" style="font-size: 40px; width:40px; height:40px; opacity:0.5; color:white;">
                  {{ activeTab === 'VIDEO' ? 'videocam' : 'music_note' }}
                </mat-icon>
                <img *ngIf="getMediaThumbnail(post.media) && getMediaThumbnail(post.media) !== 'assets/default-thumbnail.png'" [src]="getMediaThumbnail(post.media)" alt="" />
                
                <div class="play-overlay">
                  <mat-icon>{{ audioPlayer.playing?.id === post.media.id && audioPlayer.isPlaying ? 'pause' : 'play_arrow' }}</mat-icon>
                </div>
              </div>

              <div class="post-info">
                <div class="post-category">
                  <mat-icon style="font-size:12px; width:12px; height:12px">folder</mat-icon>
                  {{ post.media.folder?.name || "DrKindo" }}
                </div>
                <div class="post-title">
                  {{ post.title || post.media.filename }}
                </div>
                <div class="post-author">
                  <mat-icon style="font-size:14px; width:14px; height:14px">account_circle</mat-icon>
                  {{ post.author.name }}
                </div>
                <div class="post-meta">
                  {{ formatTime(post.media.duration || 0) }} • {{ post.likesCount || 0 }} J'aime
                </div>
              </div>
            </div>

            <div class="post-actions">
              <button class="play-main-btn" (click)="togglePlay(post)">
                <mat-icon style="font-size:18px; width:18px; height:18px">
                  {{ audioPlayer.playing?.id === post.media.id && audioPlayer.isPlaying ? 'pause' : 'play_arrow' }}
                </mat-icon>
                {{ audioPlayer.playing?.id === post.media.id && audioPlayer.isPlaying ? 'Pause' : 'Écouter' }}
              </button>

              <div class="action-group">
                <button class="action-btn" [class.liked]="post.liked" (click)="like(post)">
                  <mat-icon>{{ post.liked ? 'favorite' : 'favorite_border' }}</mat-icon>
                  <span>{{ post.likesCount || 0 }}</span>
                </button>
                <button class="action-btn" (click)="addToPlaylist(post)" title="Ajouter à la playlist">
                  <mat-icon>playlist_add</mat-icon>
                </button>
                <button class="action-btn" (click)="watchLater(post)" title="À regarder plus tard">
                  <mat-icon>watch_later</mat-icon>
                </button>
                <button class="action-btn" title="Partager">
                  <mat-icon>share</mat-icon>
                </button>
              </div>
            </div>

          </div>
        }

        @if (posts.length === 0 && !loading) {
          <div class="empty-state">
            <mat-icon>mic_off</mat-icon>
            <p>Aucun contenu trouvé pour le moment.</p>
          </div>
        }

        @if (loading && posts.length > 0) {
          <div style="display:flex; justify-content:center; padding: 20px 0;">
            <mat-icon class="spinner" style="color:var(--text-secondary)">autorenew</mat-icon>
          </div>
        }
      </div>
    </div>

    <!-- Barre de navigation -->
    <nav class="bottom-nav">
      <a class="nav-btn active" routerLink="/home">
        <mat-icon>home</mat-icon>
        Accueil
      </a>
      <a class="nav-btn" routerLink="/explorer">
        <mat-icon>explore</mat-icon>
        Explorer
      </a>
      
      @if (isMediaUser()) {
        <a class="nav-btn nav-upload" routerLink="/upload">
          <mat-icon>add</mat-icon>
        </a>
      }
      
      @if (isMediaUser()) {
        <a class="nav-btn" routerLink="/live">
          <mat-icon>radio</mat-icon>
          Live
        </a>
      }
      
      <a class="nav-btn" [routerLink]="['/profile', userId]">
        <mat-icon>person_outline</mat-icon>
        Profil
      </a>
    </nav>
  `,
})
export class HomeComponent implements OnInit, OnDestroy {
  posts: Post[] = [];
  folders: Folder[] = [];
  playlist: Post[] = [];
  loading = false;
  userId = 0;
  currentUser: any = null;

  activeTab: 'AUDIO' | 'VIDEO' = 'AUDIO';
  selectedFolderId: number | null = null;

  private page = 0;
  private hasMore = true;
  private subscriptions = new Subscription();

  constructor(
    private postService: PostService,
    private mediaService: MediaService,
    private authService: AuthService,
    public audioPlayer: AudioPlayerService,
    private folderService: FolderService
  ) {}

  ngOnInit() {
    this.subscriptions.add(
      this.authService.currentUser$.subscribe((u) => {
        this.userId = u?.id || 0;
        this.currentUser = u;
      }),
    );
    this.folderService.getRoots().subscribe(folders => {
      this.folders = folders;
    });
    this.loadPlaylist();
    this.loadMore();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  switchTab(tab: 'AUDIO' | 'VIDEO') {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.posts = [];
    this.page = 0;
    this.hasMore = true;
    this.loadMore();
  }

  selectFolder(folderId: number | null) {
    if (this.selectedFolderId === folderId) return;
    this.selectedFolderId = folderId;
    this.posts = [];
    this.page = 0;
    this.hasMore = true;
    this.loadMore();
  }

  loadPlaylist() {
    const savedPlaylist = localStorage.getItem("userPlaylist");
    if (savedPlaylist) {
      this.playlist = JSON.parse(savedPlaylist);
    }
  }

  savePlaylist() {
    localStorage.setItem("userPlaylist", JSON.stringify(this.playlist));
  }

  addToPlaylist(post: Post) {
    if (!this.playlist.find((p) => p.id === post.id)) {
      this.playlist.push(post);
      this.savePlaylist();
    }
  }

  removeFromPlaylist(post: Post) {
    this.playlist = this.playlist.filter((p) => p.id !== post.id);
    this.savePlaylist();
  }

  watchLater(post: Post) {
    const watchLaterList = JSON.parse(
      localStorage.getItem("watchLater") || "[]",
    );
    if (!watchLaterList.find((p: Post) => p.id === post.id)) {
      watchLaterList.push(post);
      localStorage.setItem("watchLater", JSON.stringify(watchLaterList));
    }
  }

  isMediaUser(): boolean {
    return this.currentUser?.role === "ADMIN" || this.currentUser?.role === "MEDIA";
  }

  getMediaThumbnail(media: any): string {
    return "assets/default-thumbnail.png"; 
  }

  loadMore() {
    if (this.loading || !this.hasMore) return;
    this.loading = true;
    
    const criteria: any = { type: this.activeTab };
    if (this.selectedFolderId) {
      criteria.folderId = this.selectedFolderId;
    }

    this.postService.search(criteria, this.page, 10).subscribe({
      next: (p) => {
        this.posts = [...this.posts, ...p.content];
        this.hasMore = !p.last;
        this.page++;
        this.loading = false;
      },
      error: (err) => {
        console.error("Erreur lors du chargement du feed", err);
        this.loading = false;
      },
    });
  }

  togglePlay(post: Post) {
    if (this.audioPlayer.playing?.id === post.media.id) {
      this.audioPlayer.toggleAudio();
    } else {
      this.audioPlayer.playMedia(
        post.media,
        this.posts.map((p) => p.media),
      );
    }
  }

  like(post: Post) {
    this.postService.toggleLike(post.id).subscribe((r) => {
      post.liked = r.liked;
      post.likesCount = r.count;
    });
  }

  formatTime(s: number): string {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  onScroll(e: Event) {
    const el = e.target as HTMLElement;
    if (el.scrollHeight - el.scrollTop < el.clientHeight + 150) {
      this.loadMore();
    }
  }
}
