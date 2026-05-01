import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Folder } from '../models/models';

@Injectable({ providedIn: 'root' })
export class FolderService {
  private apiUrl = 'http://localhost:8080/api/folders';

  constructor(private http: HttpClient) {}

  getRoots(): Observable<Folder[]> {
    return this.http.get<Folder[]>(this.apiUrl);
  }

  getById(id: number): Observable<Folder> {
    return this.http.get<Folder>(`${this.apiUrl}/${id}`);
  }

  getChildren(id: number): Observable<Folder[]> {
    return this.http.get<Folder[]>(`${this.apiUrl}/${id}/children`);
  }
}
