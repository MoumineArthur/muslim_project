import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Comment, Page, Post } from '../models/models';

@Injectable({ providedIn: 'root' })
export class PostService {
  private apiUrl = 'http://localhost:8080/api/posts';

  constructor(private http: HttpClient) {}

  getFeed(page = 0, size = 10): Observable<Page<Post>> {
    return this.http.get<Page<Post>>(this.apiUrl, { params: { page, size } });
  }

  getByUser(userId: number, page = 0, size = 10): Observable<Page<Post>> {
    return this.http.get<Page<Post>>(`${this.apiUrl}/user/${userId}`, { params: { page, size } });
  }

  create(mediaId: number, title: string, description: string, authorId: number, tags: string[]): Observable<Post> {
    return this.http.post<Post>(this.apiUrl, { mediaId, title, description, authorId, tags });
  }

  suggest(mediaId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/suggest/${mediaId}`);
  }

  search(q: string, page = 0, size = 10): Observable<Page<Post>> {
    return this.http.get<Page<Post>>(`${this.apiUrl}/search`, { params: { q, page, size } });
  }

  toggleLike(postId: number): Observable<{ liked: boolean; count: number }> {
    return this.http.post<{ liked: boolean; count: number }>(`${this.apiUrl}/${postId}/like`, {});
  }

  addComment(postId: number, content: string): Observable<Comment> {
    return this.http.post<Comment>(`${this.apiUrl}/${postId}/comments`, { content });
  }

  getComments(postId: number, page = 0, size = 20): Observable<Page<Comment>> {
    return this.http.get<Page<Comment>>(`${this.apiUrl}/${postId}/comments`, { params: { page, size } });
  }
}
