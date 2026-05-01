import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Post } from '../../core/models/models';
import { PostService } from '../../core/services/post.service';
import { AuthService } from '../../core/services/auth.service';
import { MediaService } from '../../core/services/media.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <div style="min-height:100svh;padding-bottom:80px">
      <!-- Header profil -->
      <div style="background:linear-gradient(180deg,rgba(124,58,237,0.3) 0%,var(--bg-primary) 100%);padding:60px 24px 24px">
        <div style="display:flex;align-items:center;gap:16px">
          <div style="width:72px;height:72px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700">
            {{ username.charAt(0).toUpperCase() }}
          </div>
          <div>
            <h2 style="font-size:20px;font-weight:700">{{ username }}</h2>
            <p style="color:var(--text-secondary);font-size:13px">{{ posts.length }} publication(s)</p>
          </div>
          <button (click)="logout()" style="margin-left:auto;background:none;border:1px solid var(--border);color:var(--text-secondary);padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px">
            <mat-icon style="font-size:16px;vertical-align:middle">logout</mat-icon>
          </button>
        </div>
      </div>

      <!-- Posts grid -->
      <div style="padding:16px">
        <h3 style="font-size:14px;color:var(--text-secondary);margin-bottom:12px">MES PUBLICATIONS</h3>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2px">
          @for (post of posts; track post.id) {
            <div (click)="play(post)" style="aspect-ratio:1;background:var(--bg-card);border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;overflow:hidden;border:1px solid var(--border)">
              <mat-icon style="font-size:32px;color:var(--accent-light)">{{ post.media.type === 'VIDEO' ? 'videocam' : 'music_note' }}</mat-icon>
              <div style="position:absolute;bottom:4px;left:4px;right:4px;font-size:9px;color:white;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ post.title || post.media.filename }}</div>
            </div>
          }
        </div>
        @if (posts.length === 0) {
          <div style="text-align:center;padding:48px 24px;color:var(--text-secondary)">
            <mat-icon style="font-size:48px">library_music</mat-icon>
            <p style="margin-top:12px">Aucune publication</p>
          </div>
        }
      </div>
    </div>

    <nav class="app-nav">
      <a class="nav-item" routerLink="/home"><mat-icon>home</mat-icon>Feed</a>
      <a class="nav-item" routerLink="/explorer"><mat-icon>folder_open</mat-icon>Explorer</a>
      <a class="nav-item" routerLink="/upload"><mat-icon>add_circle_outline</mat-icon>Upload</a>
      <a class="nav-item" routerLink="/live"><mat-icon>radio</mat-icon>Live</a>
      <a class="nav-item active" routerLink="/profile/0"><mat-icon>person</mat-icon>Profil</a>
    </nav>
  `
})
export class ProfileComponent implements OnInit {
  posts: Post[] = [];
  username = '';
  private userId = 0;
  private audio = new Audio();

  constructor(
    private route: ActivatedRoute,
    private postService: PostService,
    private authService: AuthService,
    private mediaService: MediaService
  ) { }

  ngOnInit() {
    this.authService.currentUser$.subscribe(u => {
      this.username = u?.username || '';
      this.userId = u?.id || 0;
      if (this.userId) {
        this.postService.getByUser(this.userId).subscribe(p => this.posts = p.content);
      }
    });
  }

  play(post: Post) {
    this.audio.src = this.mediaService.getStreamUrl(post.media.id);
    this.audio.play();
  }

  logout() { this.authService.logout(); }
}
