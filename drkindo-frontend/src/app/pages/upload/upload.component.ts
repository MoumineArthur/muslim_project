import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { MediaService } from "../../core/services/media.service";
import { PostService } from "../../core/services/post.service";

@Component({
  selector: "app-upload",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, ReactiveFormsModule],
  template: `
    <div class="page-header">
      <h2>Upload un média</h2>
    </div>

    <div style="padding:80px 20px 80px;min-height:100svh">
      <!-- Zone de dépôt -->
      <div
        class="upload-zone"
        [class.dragover]="isDragover"
        (dragover)="onDragOver($event)"
        (dragleave)="isDragover = false"
        (drop)="onDrop($event)"
        (click)="fileInput.click()"
      >
        @if (!selectedFile) {
          <mat-icon
            style="font-size:56px;color:var(--accent-light);margin-bottom:12px"
            >cloud_upload</mat-icon
          >
          <p style="font-weight:600;margin-bottom:4px">
            Glissez votre fichier ici
          </p>
          <p style="color:var(--text-secondary);font-size:13px">
            MP3, WAV, MP4, OGG... jusqu'à 500 MB
          </p>
        } @else {
          <mat-icon
            style="font-size:56px;color:var(--success);margin-bottom:12px"
            >check_circle</mat-icon
          >
          <p style="font-weight:600;margin-bottom:4px">
            {{ selectedFile.name }}
          </p>
          <p style="color:var(--text-secondary);font-size:13px">
            {{ (selectedFile.size / 1024 / 1024).toFixed(1) }} MB
          </p>
        }
      </div>
      <input
        #fileInput
        type="file"
        accept="audio/*,video/*"
        style="display:none"
        (change)="onFileSelected($event)"
      />

      <!-- Formulaire de publication -->
      @if (selectedFile) {
        <form [formGroup]="form" (ngSubmit)="upload()" style="margin-top:24px">
          <div class="form-group" style="margin-bottom:16px">
            <label
              style="display:block;font-size:13px;color:var(--text-secondary);margin-bottom:6px"
              >Titre (optionnel)</label
            >
            <input
              formControlName="title"
              placeholder="Titre du post"
              style="width:100%;background:var(--bg-card);border:1px solid var(--border);color:var(--text-primary);padding:12px 16px;border-radius:12px;font-size:14px;outline:none;font-family:inherit"
            />
          </div>
          <div class="form-group" style="margin-bottom:16px">
            <label
              style="display:block;font-size:13px;color:var(--text-secondary);margin-bottom:6px"
              >Description (optionnel)</label
            >
            <textarea
              formControlName="description"
              rows="3"
              placeholder="Décrivez le contenu..."
              style="width:100%;background:var(--bg-card);border:1px solid var(--border);color:var(--text-primary);padding:12px 16px;border-radius:12px;font-size:14px;outline:none;font-family:inherit;resize:none"
            ></textarea>
          </div>

          @if (uploading) {
            <div style="margin-bottom:16px">
              <div
                style="background:var(--border);border-radius:4px;height:4px"
              >
                <div
                  style="background:var(--accent);height:100%;border-radius:4px;transition:width 0.3s"
                  [style.width.%]="progress"
                ></div>
              </div>
              <p
                style="font-size:12px;color:var(--text-secondary);margin-top:4px"
              >
                Upload en cours... {{ progress }}%
              </p>
            </div>
          }

          @if (success) {
            <div
              style="background:rgba(34,197,94,0.1);border:1px solid var(--success);border-radius:12px;padding:12px;margin-bottom:16px;text-align:center;color:var(--success);font-size:14px"
            >
              ✅ Fichier uploadé et publié avec succès !
            </div>
          }

          <button class="btn-primary" type="submit" [disabled]="uploading">
            {{ uploading ? "Upload en cours..." : "Uploader et publier" }}
          </button>
        </form>
      }
    </div>

    <nav class="app-nav">
      <a class="nav-item" routerLink="/home"><mat-icon>home</mat-icon>Feed</a>
      <a class="nav-item" routerLink="/explorer"
        ><mat-icon>folder_open</mat-icon>Explorer</a
      >
      <a class="nav-item active" routerLink="/upload"
        ><mat-icon>add_circle_outline</mat-icon>Upload</a
      >
      <a class="nav-item" routerLink="/live"><mat-icon>radio</mat-icon>Live</a>
      <a class="nav-item" routerLink="/profile/0"
        ><mat-icon>person_outline</mat-icon>Profil</a
      >
    </nav>
  `,
})
export class UploadComponent {
  selectedFile: File | null = null;
  isDragover = false;
  uploading = false;
  progress = 0;
  success = false;
  form = this.fb.group({ title: [""], description: [""] });

  constructor(
    private fb: FormBuilder,
    private mediaService: MediaService,
    private postService: PostService,
  ) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.selectedFile = input.files[0];
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.isDragover = true;
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragover = false;
    if (e.dataTransfer?.files.length)
      this.selectedFile = e.dataTransfer.files[0];
  }

  upload() {
    if (!this.selectedFile) return;
    this.uploading = true;
    this.progress = 0;
    const interval = setInterval(() => {
      if (this.progress < 85) this.progress += 5;
    }, 200);

    this.mediaService.upload(this.selectedFile).subscribe({
      next: (media) => {
        clearInterval(interval);
        this.progress = 100;
        const { title, description } = this.form.value;
        // Create post with minimal required fields (authorId defaults to 1, tags empty)
        this.postService
          .create(media.id, title || media.filename, description || "", 1, [])
          .subscribe(() => {
            this.uploading = false;
            this.success = true;
            this.selectedFile = null;
            setTimeout(() => (this.success = false), 3000);
          });
      },
      error: () => {
        clearInterval(interval);
        this.uploading = false;
      },
    });
  }
}
