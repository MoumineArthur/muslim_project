import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { MediaService } from "../../core/services/media.service";
import { Media, Page } from "../../core/models/models";

interface DuplicatesResponse {
  [hash: string]: Media[];
}

@Component({
  selector: "app-media-manager",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./media-manager.component.html",
  styleUrls: ["./media-manager.component.scss"],
})
export class MediaManagerComponent implements OnInit {
  mediaPage?: Page<Media>;
  loading = false;
  duplicates: DuplicatesResponse | null = null;

  constructor(private mediaService: MediaService) {}

  ngOnInit(): void {
    this.loadMedia();
  }

  loadMedia(page = 0): void {
    this.loading = true;
    this.mediaService.getAll(page, 20).subscribe({
      next: (data) => {
        this.mediaPage = data;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  analyze(media: Media): void {
    media.status = "ANALYZED"; // Optimistic update
    this.mediaService.analyze(media.id).subscribe({
      next: () => this.loadMedia(this.mediaPage?.number || 0),
      error: () => alert("Erreur lors de l'analyse"),
    });
  }

  checkDuplicates(): void {
    this.mediaService.getDuplicates().subscribe((res) => {
      this.duplicates = res.duplicates;
    });
  }

  formatDuration(ms?: number): string {
    if (!ms) return "-";
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
}
