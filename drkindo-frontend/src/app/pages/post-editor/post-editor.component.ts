import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PostService } from '../../core/services/post.service';
import { AuthorService } from '../../core/services/author.service';
import { MediaService } from '../../core/services/media.service';
import { Author, Media } from '../../core/models/models';

@Component({
  selector: 'app-post-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './post-editor.component.html',
  styleUrls: ['./post-editor.component.scss']
})
export class PostEditorComponent implements OnInit {
  mediaId!: number;
  media?: Media;
  
  title = '';
  description = '';
  selectedAuthorId?: number;
  tagsText = '';
  
  authors: Author[] = [];
  loading = true;
  saving = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private postService: PostService,
    private authorService: AuthorService,
    private mediaService: MediaService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.mediaId = Number(params['mediaId']);
      if (!this.mediaId) {
        this.router.navigate(['/media']);
        return;
      }
      this.loadData();
    });
  }

  loadData(): void {
    this.authorService.getAll().subscribe(authors => {
      this.authors = authors;
      this.mediaService.getById(this.mediaId).subscribe(m => {
        this.media = m;
        this.loadSuggestions();
      });
    });
  }

  loadSuggestions(): void {
    this.postService.suggest(this.mediaId).subscribe({
      next: (suggestion) => {
        if (suggestion.title) this.title = suggestion.title;
        if (suggestion.tags) this.tagsText = suggestion.tags.join(', ');
        
        if (suggestion.author && suggestion.author.id) {
          this.selectedAuthorId = suggestion.author.id;
        } else if (this.authors.length > 0) {
          this.selectedAuthorId = this.authors[0].id;
        }
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  get streamUrl(): string {
    return this.mediaService.getStreamUrl(this.mediaId);
  }

  submit(): void {
    if (!this.title || !this.selectedAuthorId) {
      alert("Le titre et l'auteur sont obligatoires");
      return;
    }
    this.saving = true;
    
    const tagsArray = this.tagsText.split(',').map(t => t.trim()).filter(t => t.length > 0);
    
    this.postService.create(this.mediaId, this.title, this.description, this.selectedAuthorId, tagsArray).subscribe({
      next: (post) => {
        this.mediaService.changeStatus(this.mediaId, 'PUBLISHED').subscribe(() => {
          this.router.navigate(['/home']);
        });
      },
      error: (err) => {
        console.error(err);
        alert('Erreur lors de la publication');
        this.saving = false;
      }
    });
  }
}
