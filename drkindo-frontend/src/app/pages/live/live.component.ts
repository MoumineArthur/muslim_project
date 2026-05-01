import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

@Component({
  selector: 'app-live',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, FormsModule],
  template: `
    <div class="page-header">
      <h2>🔴 Live Streaming</h2>
    </div>

    <div style="padding:80px 20px 80px;min-height:100svh">
      @if (!isBroadcasting && !isWatching) {
        <div style="text-align:center;margin-top:32px">
          <mat-icon style="font-size:80px;color:var(--accent-light)">radio</mat-icon>
          <h3 style="margin:16px 0 8px">Live Streaming</h3>
          <p style="color:var(--text-secondary);font-size:14px;margin-bottom:32px">Diffusez ou regardez en temps réel</p>

          <button (click)="startBroadcast()" style="background:var(--danger);color:white;border:none;padding:16px 32px;border-radius:50px;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:16px;width:100%;display:block">
            <mat-icon style="vertical-align:middle;margin-right:8px">fiber_manual_record</mat-icon>
            Démarrer un Live
          </button>

          @if (activeLives.length > 0) {
            <h4 style="margin:24px 0 12px;color:var(--text-secondary);font-size:13px">LIVES EN COURS</h4>
            @for (live of activeLives; track live.roomId) {
              <div (click)="watchLive(live)" style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:8px;cursor:pointer;display:flex;align-items:center;gap:12px">
                <div style="width:8px;height:8px;border-radius:50%;background:var(--danger);animation:pulse-ring 1s infinite"></div>
                <div style="text-align:left">
                  <div style="font-weight:600;font-size:14px">{{ live.username }}</div>
                  <div style="font-size:12px;color:var(--text-secondary)">Live en cours</div>
                </div>
                <mat-icon style="margin-left:auto;color:var(--text-secondary)">chevron_right</mat-icon>
              </div>
            }
          } @else {
            <p style="color:var(--text-secondary);font-size:13px;margin-top:24px">Aucun live en cours pour le moment</p>
          }
        </div>
      }

      @if (isBroadcasting) {
        <div style="text-align:center">
          <div style="width:120px;height:120px;border-radius:50%;background:var(--danger);margin:0 auto 24px;display:flex;align-items:center;justify-content:center;animation:pulse-ring 1.5s infinite;box-shadow:0 0 40px rgba(239,68,68,0.4)">
            <mat-icon style="font-size:56px;color:white">mic</mat-icon>
          </div>
          <h3 style="margin-bottom:8px">Live en cours</h3>
          <p style="color:var(--text-secondary);font-size:14px;margin-bottom:32px">Room: {{ roomId }}</p>
          <button (click)="stopBroadcast()" style="background:var(--bg-card);border:1px solid var(--danger);color:var(--danger);padding:12px 32px;border-radius:50px;font-size:14px;cursor:pointer">
            Arrêter le live
          </button>
        </div>
      }

      @if (isWatching) {
        <div style="text-align:center">
          <div style="width:120px;height:120px;border-radius:50%;background:var(--bg-card);margin:0 auto 24px;display:flex;align-items:center;justify-content:center;border:2px solid var(--danger)">
            <mat-icon style="font-size:56px;color:var(--accent-light)">headphones</mat-icon>
          </div>
          <h3 style="margin-bottom:8px">Vous regardez {{ watchingUser }}</h3>
          <button (click)="isWatching=false;watchingUser=''" style="background:var(--bg-card);border:1px solid var(--border);color:var(--text-secondary);padding:12px 32px;border-radius:50px;font-size:14px;cursor:pointer;margin-top:16px">
            Quitter
          </button>
        </div>
      }
    </div>

    <nav class="app-nav">
      <a class="nav-item" routerLink="/home"><mat-icon>home</mat-icon>Feed</a>
      <a class="nav-item" routerLink="/explorer"><mat-icon>folder_open</mat-icon>Explorer</a>
      <a class="nav-item" routerLink="/upload"><mat-icon>add_circle_outline</mat-icon>Upload</a>
      <a class="nav-item active" routerLink="/live"><mat-icon>radio</mat-icon>Live</a>
      <a class="nav-item" routerLink="/profile/0"><mat-icon>person_outline</mat-icon>Profil</a>
    </nav>
  `
})
export class LiveComponent implements OnInit, OnDestroy {
  isBroadcasting = false;
  isWatching = false;
  watchingUser = '';
  roomId = '';
  activeLives: { username: string; roomId: string }[] = [];
  private client!: Client;
  private username = '';

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(u => { this.username = u?.username || ''; });
    this.connectWebSocket();
  }

  connectWebSocket() {
    this.client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      onConnect: () => {
        this.client.subscribe('/topic/live/list', (msg: IMessage) => {
          const map = JSON.parse(msg.body);
          this.activeLives = Object.entries(map).map(([username, roomId]) => ({ username, roomId: roomId as string }));
        });
      }
    });
    this.client.activate();
  }

  startBroadcast() {
    this.roomId = `${this.username}-${Date.now()}`;
    this.isBroadcasting = true;
    this.client.publish({ destination: '/app/live/start', body: JSON.stringify({ username: this.username, roomId: this.roomId }) });
  }

  stopBroadcast() {
    this.isBroadcasting = false;
    this.client.publish({ destination: '/app/live/stop', body: JSON.stringify({ username: this.username, roomId: this.roomId }) });
  }

  watchLive(live: { username: string; roomId: string }) {
    this.isWatching = true;
    this.watchingUser = live.username;
  }

  ngOnDestroy() {
    if (this.isBroadcasting) this.stopBroadcast();
    this.client?.deactivate();
  }
}
