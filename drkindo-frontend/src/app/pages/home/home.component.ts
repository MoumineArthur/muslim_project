import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Post } from '../../core/models/models';
import { PostService } from '../../core/services/post.service';
import { MediaService } from '../../core/services/media.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  styles: [`
    .feed-wrap {
      height: 100svh;
      overflow-y: scroll;
      scroll-snap-type: y mandatory;
      background: var(--bg-primary);
    }

    .post-slide {
      height: 100svh;
      scroll-snap-align: start;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    /* Fond dynamique par post */
    .post-slide::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at 50% 40%, rgba(124,58,237,0.18) 0%, transparent 70%);
      pointer-events: none;
    }

    /* ──── Visualiseur ──── */
    .viz-container {
      position: relative;
      width: 200px;
      height: 200px;
      margin-bottom: 28px;
    }

    .viz-ring {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 2px solid rgba(124,58,237,0.35);
      animation: expand 2.5s ease-out infinite;
    }
    .viz-ring:nth-child(2) { animation-delay: .6s; }
    .viz-ring:nth-child(3) { animation-delay: 1.2s; }

    @keyframes expand {
      0%   { transform: scale(0.85); opacity: .8; }
      100% { transform: scale(1.6);  opacity: 0; }
    }

    .viz-circle {
      position: absolute;
      inset: 20px;
      border-radius: 50%;
      background: radial-gradient(circle at 40% 40%, #a855f7, #7c3aed 60%, #4c1d95);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 60px rgba(124,58,237,.5), 0 0 120px rgba(124,58,237,.2);
      transition: transform .2s;
    }

    .viz-circle.paused { animation: none; filter: saturate(.4); }
    .viz-circle mat-icon { font-size: 56px; color: rgba(255,255,255,.9); }

    /* Bars EQ animées */
    .eq-bars {
      display: flex;
      gap: 4px;
      align-items: flex-end;
      height: 30px;
      position: absolute;
      bottom: -40px;
      left: 50%;
      transform: translateX(-50%);
    }

    .eq-bar {
      width: 4px;
      background: var(--accent-light);
      border-radius: 2px;
      animation: eq 1.2s ease-in-out infinite alternate;
    }
    .eq-bar:nth-child(1) { height: 12px; animation-delay: 0s; }
    .eq-bar:nth-child(2) { height: 22px; animation-delay: .15s; }
    .eq-bar:nth-child(3) { height: 30px; animation-delay: .3s; }
    .eq-bar:nth-child(4) { height: 18px; animation-delay: .45s; }
    .eq-bar:nth-child(5) { height: 26px; animation-delay: .6s; }
    .eq-bar:nth-child(6) { height: 14px; animation-delay: .75s; }
    .eq-bar:nth-child(7) { height: 20px; animation-delay: .9s; }

    @keyframes eq {
      from { transform: scaleY(0.3); opacity: .5; }
      to   { transform: scaleY(1);   opacity: 1; }
    }

    .eq-bars.paused .eq-bar { animation-play-state: paused; }

    /* ──── Infos ──── */
    .post-info {
      text-align: center;
      padding: 0 80px 0 20px;
      max-width: 380px;
      width: 100%;
    }

    .post-category {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(124,58,237,.2);
      border: 1px solid rgba(124,58,237,.4);
      color: var(--accent-light);
      font-size: 11px;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 20px;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: .5px;
    }

    .post-title {
      font-size: 15px;
      font-weight: 700;
      line-height: 1.4;
      margin-bottom: 6px;
      color: var(--text-primary);
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
      justify-content: center;
      gap: 6px;
    }

    /* ──── Progress + Controls ──── */
    .player-controls {
      width: 100%;
      max-width: 380px;
      padding: 0 20px 0 20px;
      margin-top: 28px;
    }

    .time-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--text-secondary);
      margin-bottom: 6px;
    }

    .progress-track {
      width: 100%;
      height: 3px;
      background: rgba(255,255,255,.12);
      border-radius: 2px;
      cursor: pointer;
      margin-bottom: 20px;
      position: relative;
    }

    .progress-thumb {
      position: absolute;
      top: 50%;
      transform: translate(-50%,-50%);
      width: 12px;
      height: 12px;
      background: white;
      border-radius: 50%;
      box-shadow: 0 0 8px rgba(124,58,237,.8);
      transition: left .1s linear;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #7c3aed, #a855f7);
      border-radius: 2px;
      transition: width .1s linear;
    }

    .ctrl-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
    }

    .ctrl-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
      transition: all .2s;
    }
    .ctrl-btn:hover { color: var(--text-primary); transform: scale(1.1); }
    .ctrl-btn mat-icon { font-size: 24px; }

    .ctrl-btn.play {
      background: var(--accent);
      width: 56px;
      height: 56px;
      box-shadow: 0 0 24px rgba(124,58,237,.5);
      color: white;
    }
    .ctrl-btn.play mat-icon { font-size: 28px; }
    .ctrl-btn.play:hover { background: var(--accent-light); transform: scale(1.05); }

    /* ──── Actions latérales ──── */
    .side-actions {
      position: absolute;
      right: 14px;
      bottom: 100px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      background: rgba(255,255,255,.07);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,.08);
      color: white;
      cursor: pointer;
      padding: 10px;
      border-radius: 50%;
      font-size: 10px;
      font-weight: 600;
      transition: all .2s;
      min-width: 46px;
    }

    .action-btn mat-icon { font-size: 22px; }
    .action-btn:hover, .action-btn.liked { background: rgba(124,58,237,.25); border-color: rgba(124,58,237,.4); }
    .action-btn.liked mat-icon { color: #f472b6; }
    .action-btn.liked { color: #f472b6; }

    /* ──── Nav ──── */
    .bottom-nav {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      display: flex;
      justify-content: space-around;
      align-items: center;
      background: rgba(8,8,14,.95);
      backdrop-filter: blur(20px);
      border-top: 1px solid rgba(255,255,255,.06);
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
      color: rgba(255,255,255,.4);
      font-size: 10px;
      font-weight: 500;
      cursor: pointer;
      padding: 6px 16px;
      border-radius: 12px;
      text-decoration: none;
      transition: all .2s;
    }
    .nav-btn mat-icon { font-size: 22px; }
    .nav-btn.active, .nav-btn:hover { color: var(--accent-light); }

    .nav-upload {
      background: var(--accent);
      border-radius: 16px;
      padding: 10px 20px;
      color: white !important;
      box-shadow: 0 0 16px rgba(124,58,237,.4);
    }
    .nav-upload mat-icon { font-size: 22px; }

    /* ──── Loader ──── */
    @keyframes spin { to { transform: rotate(360deg); } }
    .spinner { animation: spin 1s linear infinite; }

    /* ──── Empty ──── */
    .empty-state {
      height: 100svh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      color: var(--text-secondary);
    }
    .empty-state mat-icon { font-size: 64px; opacity: .3; }
  `],
  template: `
    <div class="feed-wrap" (scroll)="onScroll($event)">

      @if (loading && posts.length === 0) {
        <div class="empty-state">
          <mat-icon class="spinner">autorenew</mat-icon>
          <p>Chargement du feed…</p>
        </div>
      }

      @for (post of posts; track post.id; let i = $index) {
        <div class="post-slide" [id]="'post-' + post.id">

          <!-- Visualiseur central -->
          <div class="viz-container">
            <div class="viz-ring"></div>
            <div class="viz-ring"></div>
            <div class="viz-ring"></div>

            <div class="viz-circle" [class.paused]="currentId !== post.id || !isPlaying"
                 (click)="togglePlay(post)">
              <mat-icon>{{ currentId === post.id && isPlaying ? 'pause' : 'music_note' }}</mat-icon>
            </div>

            <div class="eq-bars" [class.paused]="currentId !== post.id || !isPlaying">
              @for (b of [1,2,3,4,5,6,7]; track b) {
                <div class="eq-bar"></div>
              }
            </div>
          </div>

          <!-- Infos -->
          <div class="post-info" style="margin-top:52px">
            <div class="post-category">
              <mat-icon style="font-size:12px">folder</mat-icon>
              {{ post.media.folder?.name || 'DrKindo' }}
            </div>
            <div class="post-title">{{ post.title || post.media.filename }}</div>
            <div class="post-author">
              <mat-icon style="font-size:14px">account_circle</mat-icon>
              {{ post.author.name }}
              @if (post.description) {
                <span>·</span>
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px">{{ post.description }}</span>
              }
            </div>
          </div>

          <!-- Player -->
          <div class="player-controls">
            <div class="time-row">
              <span>{{ formatTime(currentTime) }}</span>
              <span>{{ formatTime(duration) }}</span>
            </div>
            <div class="progress-track" (click)="seek($event, post)">
              <div class="progress-fill" [style.width.%]="getProgress(post.id)"></div>
              @if (currentId === post.id) {
                <div class="progress-thumb" [style.left.%]="getProgress(post.id)"></div>
              }
            </div>
            <div class="ctrl-row">
              <button class="ctrl-btn" (click)="jump(-10)">
                <mat-icon>replay_10</mat-icon>
              </button>
              <button class="ctrl-btn" (click)="prev(post)">
                <mat-icon>skip_previous</mat-icon>
              </button>
              <button class="ctrl-btn play" (click)="togglePlay(post)">
                <mat-icon>{{ currentId === post.id && isPlaying ? 'pause' : 'play_arrow' }}</mat-icon>
              </button>
              <button class="ctrl-btn" (click)="next(post)">
                <mat-icon>skip_next</mat-icon>
              </button>
              <button class="ctrl-btn" (click)="jump(10)">
                <mat-icon>forward_10</mat-icon>
              </button>
            </div>
          </div>

          <!-- Actions latérales -->
          <div class="side-actions">
            <button class="action-btn" [class.liked]="post.liked" (click)="like(post)">
              <mat-icon>{{ post.liked ? 'favorite' : 'favorite_border' }}</mat-icon>
              <span>{{ post.likesCount || 0 }}</span>
            </button>
            <button class="action-btn">
              <mat-icon>chat_bubble_outline</mat-icon>
              <span>0</span>
            </button>
            <button class="action-btn">
              <mat-icon>share</mat-icon>
            </button>
            <button class="action-btn">
              <mat-icon>more_horiz</mat-icon>
            </button>
          </div>

        </div>
      }

      @if (loading && posts.length > 0) {
        <div style="height:60px;display:flex;align-items:center;justify-content:center">
          <mat-icon class="spinner" style="color:var(--text-secondary)">autorenew</mat-icon>
        </div>
      }
    </div>

    <!-- Barre de navigation -->
    <nav class="bottom-nav">
      <a class="nav-btn active" routerLink="/home"><mat-icon>home</mat-icon>Feed</a>
      <a class="nav-btn" routerLink="/explorer"><mat-icon>explore</mat-icon>Explorer</a>
      <a class="nav-btn nav-upload" routerLink="/upload"><mat-icon>add</mat-icon></a>
      <a class="nav-btn" routerLink="/live"><mat-icon>radio</mat-icon>Live</a>
      <a class="nav-btn" [routerLink]="['/profile', userId]"><mat-icon>person_outline</mat-icon>Profil</a>
    </nav>
  `
})
export class HomeComponent implements OnInit, OnDestroy {
  posts: Post[] = [];
  loading = false;
  isPlaying = false;
  currentId: number | null = null;
  currentTime = 0;
  duration = 0;
  userId = 0;

  private page = 0;
  private hasMore = true;
  private audio = new Audio();
  private progressMap = new Map<number, number>();
  private timeInterval: any;

  constructor(
    private postService: PostService,
    private mediaService: MediaService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(u => this.userId = u?.id || 0);
    this.audio.addEventListener('timeupdate', () => {
      this.currentTime = this.audio.currentTime;
      this.duration = this.audio.duration || 0;
      if (this.currentId) {
        this.progressMap.set(this.currentId, this.duration ? (this.currentTime / this.duration) * 100 : 0);
      }
    });
    this.audio.addEventListener('ended', () => this.next());
    this.loadMore();
  }

  ngOnDestroy() {
    this.audio.pause();
    clearInterval(this.timeInterval);
  }

  loadMore() {
    if (this.loading || !this.hasMore) return;
    this.loading = true;
    this.postService.getFeed(this.page).subscribe({
      next: p => {
        this.posts = [...this.posts, ...p.content];
        this.hasMore = !p.last;
        this.page++;
        this.loading = false;
      },
      error: err => {
        console.error('Erreur lors du chargement du feed', err);
        this.loading = false;
      }
    });
  }

  togglePlay(post: Post) {
    if (this.currentId === post.id) {
      this.audio.paused ? this.audio.play() : this.audio.pause();
      this.isPlaying = !this.audio.paused;
    } else {
      this.audio.src = this.mediaService.getStreamUrl(post.media.id);
      this.audio.play();
      this.currentId = post.id;
      this.currentTime = 0;
      this.duration = 0;
      this.isPlaying = true;
      this.scrollToPost(post.id);
    }
  }

  seek(e: MouseEvent, post: Post) {
    const bar = e.currentTarget as HTMLElement;
    const ratio = Math.max(0, Math.min(1, e.offsetX / bar.offsetWidth));
    if (this.currentId === post.id) this.audio.currentTime = ratio * this.audio.duration;
  }

  jump(secs: number) {
    this.audio.currentTime = Math.max(0, Math.min(this.audio.duration, this.audio.currentTime + secs));
  }

  prev(anchorPost?: Post) {
    const idx = this.getActiveIndex(anchorPost);
    if (idx > 0) this.togglePlay(this.posts[idx - 1]);
  }

  next(anchorPost?: Post) {
    const idx = this.getActiveIndex(anchorPost);
    if (idx >= 0 && idx < this.posts.length - 1) {
      this.togglePlay(this.posts[idx + 1]);
      return;
    }

    this.loadMore();
  }

  like(post: Post) {
    this.postService.toggleLike(post.id).subscribe(r => {
      post.liked = r.liked;
      post.likesCount = r.count;
    });
  }

  getProgress(id: number) { return this.progressMap.get(id) || 0; }

  formatTime(s: number): string {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  onScroll(e: Event) {
    const el = e.target as HTMLElement;
    if (el.scrollHeight - el.scrollTop < el.clientHeight + 300) this.loadMore();
  }

  private getActiveIndex(anchorPost?: Post): number {
    if (this.currentId != null) {
      const currentIndex = this.posts.findIndex(p => p.id === this.currentId);
      if (currentIndex >= 0) {
        return currentIndex;
      }
    }

    if (anchorPost) {
      return this.posts.findIndex(p => p.id === anchorPost.id);
    }

    return -1;
  }

  private scrollToPost(postId: number): void {
    setTimeout(() => {
      const element = document.getElementById(`post-${postId}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }
}
