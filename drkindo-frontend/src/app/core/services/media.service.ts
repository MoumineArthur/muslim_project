import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Media, Page } from '../models/models';

@Injectable({ providedIn: 'root' })
export class MediaService {
  private apiUrl = 'http://localhost:8080/api/media';

  constructor(private http: HttpClient) {}

  getAll(page = 0, size = 20): Observable<Page<Media>> {
    return this.http.get<Page<Media>>(this.apiUrl, { params: { page, size } });
  }

  getById(id: number): Observable<Media> {
    return this.http.get<Media>(`${this.apiUrl}/${id}`);
  }

  getByFolder(folderId: number): Observable<Media[]> {
    return this.http.get<Media[]>(`${this.apiUrl}/folder/${folderId}`);
  }

  search(keyword: string, page = 0, size = 20): Observable<Page<Media>> {
    return this.http.get<Page<Media>>(`${this.apiUrl}/search`, { params: { keyword, page, size } });
  }

  getStreamUrl(id: number): string {
    return `${this.apiUrl}/stream/${id}`;
  }

  upload(file: File, folderId?: number): Observable<Media> {
    const form = new FormData();
    form.append('file', file);
    if (folderId) form.append('folderId', folderId.toString());
    return this.http.post<Media>(`${this.apiUrl}/upload`, form);
  }

  triggerScan(): Observable<any> {
    return this.http.post(`${this.apiUrl}/scan`, {});
  }

  resetAndScan(): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-scan`, {});
  }

  analyze(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/analyze`, {});
  }

  changeStatus(id: number, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, null, { params: { status } });
  }

  getDuplicates(): Observable<any> {
    return this.http.get(`${this.apiUrl}/duplicates`);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
