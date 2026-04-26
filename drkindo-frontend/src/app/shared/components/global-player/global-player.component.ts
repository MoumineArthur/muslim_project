import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { AudioPlayerService } from "../../../core/services/audio-player.service";
import { Router } from "@angular/router";

@Component({
  selector: "app-global-player",
  standalone: true,
  imports: [CommonModule, MatIconModule],
  styles: [
    `
      /* ──── Mini player ──── */
      .mini-player {
        position: fixed;
        bottom: 66px;
        left: 10px;
        right: 10px;
        background: rgba(26, 26, 38, 0.97);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(124, 58, 237, 0.3);
        border-radius: 16px;
        padding: 10px 14px;
        z-index: 999;
        box-shadow: 0 -4px 40px rgba(0, 0, 0, 0.4);
        transition: all 0.3s ease;
      }

      /* État minimisé en haut à droite */
      .mini-player.minimized {
        position: fixed;
        bottom: auto;
        top: 10px;
        right: 10px;
        left: auto;
        width: 280px;
        padding: 8px 10px;
        border-radius: 12px;
        cursor: pointer;
      }

      .mini-player.minimized .player-controls {
        display: none;
      }

      .mini-player.minimized .mini-content {
        gap: 8px;
      }

      .mini-player.minimized .mini-info {
        min-width: 0;
      }

      .mini-player.minimized .mini-title {
        font-size: 11px;
      }

      .mini-player.minimized .mini-sub {
        font-size: 9px;
      }

      .mini-player.minimized .mini-icon {
        width: 32px;
        height: 32px;
      }

      .mini-player.minimized .mini-icon mat-icon {
        font-size: 16px;
      }

      .mini-player.minimized .mini-btns {
        gap: 2px;
      }

      .mini-player.minimized .mini-btn mat-icon {
        font-size: 18px;
      }

      .mini-progress {
        width: 100%;
        height: 2px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 1px;
        margin-bottom: 10px;
        cursor: pointer;
      }
      .mini-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--accent), var(--accent-light));
        border-radius: 1px;
        transition: width 0.1s linear;
      }

      .mini-content {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .mini-icon {
        width: 36px;
        height: 36px;
        background: radial-gradient(circle, var(--accent), #4c1d95);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .mini-icon mat-icon {
        font-size: 18px;
        color: white;
      }

      .mini-info {
        flex: 1;
        overflow: hidden;
      }
      .mini-title {
        font-size: 12px;
        font-weight: 600;
        color: white;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .mini-sub {
        font-size: 10px;
        color: var(--text-secondary);
      }

      .mini-btns {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .mini-btn {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 4px;
        border-radius: 50%;
        display: flex;
        transition: color 0.2s;
      }
      .mini-btn:hover,
      .mini-btn.main {
        color: white;
      }
      .mini-btn.active {
        color: var(--accent-light);
      }
      .mini-btn mat-icon {
        font-size: 22px;
      }

      /* Contrôles avancés du lecteur */
      .player-controls {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
      }

      .control-group {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .volume-slider {
        width: 70px;
        height: 3px;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.1);
        cursor: pointer;
        appearance: none;
        outline: none;
      }
      .volume-slider::-webkit-slider-thumb {
        appearance: none;
        width: 12px;
        height: 12px;
        background: var(--accent-light);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 4px rgba(124, 58, 237, 0.6);
      }
      .volume-slider::-moz-range-thumb {
        width: 12px;
        height: 12px;
        background: var(--accent-light);
        border: none;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 4px rgba(124, 58, 237, 0.6);
      }

      .speed-btn,
      .loop-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: var(--text-secondary);
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 3px;
      }
      .speed-btn:hover,
      .loop-btn:hover {
        border-color: var(--accent);
        color: var(--accent-light);
      }
      .speed-btn.active,
      .loop-btn.active {
        background: var(--accent);
        border-color: var(--accent);
        color: white;
      }

      .speed-menu {
        position: absolute;
        bottom: 100%;
        right: 0;
        background: rgba(26, 26, 38, 0.98);
        border: 1px solid rgba(124, 58, 237, 0.3);
        border-radius: 10px;
        padding: 6px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        z-index: 1000;
        min-width: 60px;
      }

      .speed-option {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 500;
        transition: all 0.2s;
      }
      .speed-option:hover {
        background: rgba(124, 58, 237, 0.2);
        color: white;
      }
      .speed-option.active {
        background: var(--accent);
        color: white;
      }
    `,
  ],
  template: `
    @if (player.playing && player.currentRoute !== "home") {
      <div
        class="mini-player"
        [class.minimized]="player.minimized"
        (click)="onMiniPlayerClick()"
      >
        <!-- Barre de progression (masquée si minimisé) -->
        @if (!player.minimized) {
          <div
            class="mini-progress"
            (click)="seek($event)"
            title="Cliquer pour avancer"
          >
            <div class="mini-fill" [style.width.%]="player.miniProgress"></div>
          </div>
        }

        <!-- Infos et contrôles principaux -->
        <div class="mini-content">
          <div class="mini-icon">
            <mat-icon>{{
              player.playing.type === "VIDEO" ? "videocam" : "music_note"
            }}</mat-icon>
          </div>
          <div class="mini-info">
            <div
              class="mini-title"
              style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex: 1;"
            >
              <span style="overflow: hidden; text-overflow: ellipsis;">{{
                player.playing.filename
              }}</span>
              @if (!player.minimized) {
                <button
                  class="mini-btn"
                  (click)="goToFolder(); $event.stopPropagation()"
                  title="Voir dans le dossier"
                  style="padding: 2px; flex-shrink: 0;"
                >
                  <mat-icon style="font-size: 16px; width: 16px; height: 16px;"
                    >folder_open</mat-icon
                  >
                </button>
              }
            </div>
            @if (!player.minimized) {
              <div class="mini-sub">
                {{ player.playing.folder?.name || "DrKindo" }} ·
                {{ formatTime(player.currentTime) }} /
                {{ formatTime(player.duration) }}
              </div>
            }
          </div>
          <div class="mini-btns">
            @if (!player.minimized) {
              <button
                class="mini-btn"
                (click)="player.prevTrack(); $event.stopPropagation()"
                title="Piste précédente"
              >
                <mat-icon>skip_previous</mat-icon>
              </button>
            }
            <button
              class="mini-btn main"
              (click)="player.toggleAudio(); $event.stopPropagation()"
              title="Lecture/Pause"
            >
              <mat-icon [style.font-size.px]="player.minimized ? 20 : 25">{{
                player.isPlaying ? "pause_circle" : "play_circle"
              }}</mat-icon>
            </button>
            <button
              class="mini-btn"
              (click)="toggleMinimize($event)"
              [title]="player.minimized ? 'Maximiser' : 'Minimiser'"
            >
              <mat-icon>{{
                player.minimized ? "fullscreen" : "fullscreen_exit"
              }}</mat-icon>
            </button>
            @if (!player.minimized) {
              <button
                class="mini-btn"
                (click)="player.nextTrack(); $event.stopPropagation()"
                title="Piste suivante"
              >
                <mat-icon>skip_next</mat-icon>
              </button>
            }
            @if (player.minimized) {
              <button
                class="mini-btn"
                (click)="closeMiniPlayer(); $event.stopPropagation()"
                title="Fermer le lecteur"
              >
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>
        </div>

        <!-- Contrôles avancés (masqués si minimisé) -->
        @if (!player.minimized) {
          <div class="player-controls">
            <!-- Volume -->
            <div class="control-group">
              <button
                class="mini-btn"
                (click)="player.toggleMute()"
                [title]="player.isMuted ? 'Réactiver le volume' : 'Muet'"
              >
                <mat-icon>{{
                  player.isMuted
                    ? "volume_off"
                    : player.volume < 0.3
                      ? "volume_mute"
                      : player.volume < 0.7
                        ? "volume_down"
                        : "volume_up"
                }}</mat-icon>
              </button>
              <input
                type="range"
                class="volume-slider"
                [value]="player.volume"
                (input)="player.setVolume($any($event.target).value)"
                min="0"
                max="1"
                step="0.05"
                title="Volume"
              />
            </div>

            <!-- Vitesse de lecture -->
            <div class="control-group">
              <div style="position: relative;">
                <button
                  class="speed-btn"
                  (click)="showSpeedMenu = !showSpeedMenu"
                  title="Vitesse de lecture"
                >
                  <mat-icon style="font-size: 16px">speed</mat-icon>
                  <span>{{ player.playbackRate }}x</span>
                </button>
                @if (showSpeedMenu) {
                  <div class="speed-menu">
                    @for (rate of playbackRates; track rate) {
                      <button
                        class="speed-option"
                        [class.active]="player.playbackRate === rate"
                        (click)="
                          player.changePlaybackRate(rate); showSpeedMenu = false
                        "
                      >
                        {{ rate }}x
                      </button>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Boucle -->
            <div class="control-group">
              <button
                class="loop-btn"
                [class.active]="player.isLooping"
                (click)="player.toggleLoop()"
                title="Boucle"
              >
                <mat-icon style="font-size: 16px">repeat</mat-icon>
                <span>{{ player.isLooping ? "Boucle" : "Répéter" }}</span>
              </button>
            </div>

            <!-- Espaceur -->
            <div style="flex: 1;"></div>

            <!-- Durée totale -->
            <div
              style="font-size: 10px; color: var(--text-secondary); white-space: nowrap;"
            >
              {{ formatTime(player.duration) }}
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class GlobalPlayerComponent {
  playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];
  showSpeedMenu = false;

  constructor(
    public player: AudioPlayerService,
    private router: Router,
  ) {}

  goToFolder() {
    if (this.player.playing?.folder?.id) {
      this.router.navigate(["/explorer"], {
        queryParams: {
          folderId: this.player.playing.folder.id,
          highlight: this.player.playing.id,
        },
      });
    } else {
      this.router.navigate(["/explorer"]);
    }
  }

  onMiniPlayerClick() {
    if (this.player.minimized) {
      // Retourner à explorer et agrandir le lecteur
      this.router.navigate(["/explorer"]);
      this.player.expand();
    }
  }

  toggleMinimize(event: MouseEvent) {
    event.stopPropagation();
    if (this.player.minimized) {
      this.player.expand();
    } else {
      this.player.minimize();
    }
  }

  closeMiniPlayer() {
    this.player.stop();
  }

  seek(e: MouseEvent) {
    const bar = e.currentTarget as HTMLElement;
    const ratio = e.offsetX / bar.offsetWidth;
    this.player.seek(ratio);
  }

  formatTime(s: number): string {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60)
      .toString()
      .padStart(2, "0")}`;
  }
}
