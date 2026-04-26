import { Injectable, OnDestroy } from "@angular/core";
import { Router, NavigationStart, Event as RouterEvent } from "@angular/router";
import { BehaviorSubject } from "rxjs";
import { filter } from "rxjs/operators";
import { Media } from "../models/models";
import { MediaService } from "./media.service";

@Injectable({
  providedIn: "root",
})
export class AudioPlayerService implements OnDestroy {
  audio = new Audio();
  playing: Media | null = null;
  isPlaying = false;
  miniProgress = 0;
  currentTime = 0;
  duration = 0;

  volume = 1;
  isMuted = false;
  playbackRate = 1;
  isLooping = false;
  previousVolume = 1;

  playlist: Media[] = [];
  minimized = false;
  currentRoute = "home";
  currentMedia$ = new BehaviorSubject<Media | null>(null);

  constructor(
    private mediaService: MediaService,
    private router: Router,
  ) {
    this.initAudioListeners();
    this.loadPersistedSettings();
    this.listenToRouter();
  }

  private initAudioListeners() {
    this.audio.addEventListener("timeupdate", () => {
      this.currentTime = this.audio.currentTime;
      this.duration = this.audio.duration || 0;
      this.miniProgress = this.duration
        ? (this.currentTime / this.duration) * 100
        : 0;
    });

    this.audio.addEventListener("ended", () => {
      if (this.isLooping) {
        this.audio.currentTime = 0;
        this.audio.play();
      } else {
        this.nextTrack();
      }
    });
  }

  private loadPersistedSettings() {
    const savedVolume = localStorage.getItem("player_volume");
    if (savedVolume !== null) {
      this.volume = parseFloat(savedVolume);
      this.previousVolume = this.volume > 0 ? this.volume : 1;
      this.audio.volume = this.volume;
    }

    const savedMuted = localStorage.getItem("player_muted");
    if (savedMuted !== null) {
      this.isMuted = savedMuted === "true";
      if (this.isMuted) {
        this.audio.volume = 0;
      }
    }

    const savedRate = localStorage.getItem("player_rate");
    if (savedRate !== null) {
      this.playbackRate = parseFloat(savedRate);
      this.audio.playbackRate = this.playbackRate;
    }

    const savedLoop = localStorage.getItem("player_loop");
    if (savedLoop !== null) {
      this.isLooping = savedLoop === "true";
    }
  }

  private listenToRouter() {
    this.router.events
      .pipe(
        filter(
          (event: RouterEvent): event is NavigationStart =>
            event instanceof NavigationStart,
        ),
      )
      .subscribe((event: NavigationStart) => {
        // Extraire la route actuelle
        const urlParts = event.url.split("?")[0].split("/");
        this.currentRoute = urlParts[1] || "home"; // 'home', 'explorer', etc.

        // Si on navigue vers explorer et une audio joue : minimiser
        if (
          this.currentRoute === "explorer" &&
          this.playing?.type === "AUDIO"
        ) {
          this.minimized = true;
        }
        // Si on navigue vers home et une audio joue : agrandir (pas minimisé)
        else if (
          this.currentRoute === "home" &&
          this.playing?.type === "AUDIO"
        ) {
          this.minimized = false;
        }
        // Si vidéo : toujours arrêter
        if (this.playing?.type === "VIDEO") {
          this.stop();
          this.minimized = false;
        }
      });
  }

  minimize() {
    this.minimized = true;
  }

  expand() {
    this.minimized = false;
  }

  playMedia(media: Media, currentPlaylist: Media[]) {
    this.playlist = currentPlaylist || [];

    if (this.playing?.id === media.id) {
      this.toggleAudio();
      return;
    }

    this.audio.src = this.mediaService.getStreamUrl(media.id);
    this.audio.volume = this.isMuted ? 0 : this.volume;
    this.audio.playbackRate = this.playbackRate;
    this.audio.play().catch((e) => console.error("Playback error", e));
    this.playing = media;
    this.isPlaying = true;
    this.currentMedia$.next(this.playing);

    // Minimiser automatiquement si on est dans explorer
    if (this.currentRoute === "explorer") {
      this.minimized = true;
    }
    // Sinon (home ou autre) : ne pas minimiser
    else {
      this.minimized = false;
    }
  }

  toggleAudio() {
    if (!this.playing) return;
    this.audio.paused ? this.audio.play() : this.audio.pause();
    this.isPlaying = !this.audio.paused;
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.playing = null;
    this.isPlaying = false;
    this.currentMedia$.next(null);
  }

  prevTrack() {
    if (!this.playlist.length) return;
    const idx = this.playlist.findIndex((m) => m.id === this.playing?.id);
    if (idx > 0) {
      this.playMedia(this.playlist[idx - 1], this.playlist);
    }
  }

  nextTrack() {
    if (!this.playlist.length) return;
    const idx = this.playlist.findIndex((m) => m.id === this.playing?.id);
    if (idx !== -1 && idx < this.playlist.length - 1) {
      this.playMedia(this.playlist[idx + 1], this.playlist);
    }
  }

  seek(ratio: number) {
    if (!this.duration) return;
    this.audio.currentTime = ratio * this.audio.duration;
  }

  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    this.audio.volume = this.volume;
    if (this.volume > 0) this.isMuted = false;
    localStorage.setItem("player_volume", this.volume.toString());
    localStorage.setItem("player_muted", this.isMuted.toString());
  }

  toggleMute() {
    if (this.isMuted) {
      this.volume = this.previousVolume || 0.7;
      this.audio.volume = this.volume;
      this.isMuted = false;
    } else {
      this.previousVolume = this.volume;
      this.volume = 0;
      this.audio.volume = 0;
      this.isMuted = true;
    }
    localStorage.setItem("player_muted", this.isMuted.toString());
    localStorage.setItem("player_volume", this.volume.toString());
  }

  changePlaybackRate(rate: number) {
    this.playbackRate = rate;
    this.audio.playbackRate = rate;
    localStorage.setItem("player_rate", rate.toString());
  }

  toggleLoop() {
    this.isLooping = !this.isLooping;
    localStorage.setItem("player_loop", this.isLooping.toString());
  }

  ngOnDestroy() {
    this.stop();
  }
}
