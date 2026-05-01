import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Author } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class AuthorService {
  private apiUrl = '/api/authors';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Author[]> {
    return this.http.get<Author[]>(this.apiUrl);
  }

  getById(id: number): Observable<Author> {
    return this.http.get<Author>(`${this.apiUrl}/${id}`);
  }

  create(author: Partial<Author>): Observable<Author> {
    return this.http.post<Author>(this.apiUrl, author);
  }

  update(id: number, author: Partial<Author>): Observable<Author> {
    return this.http.put<Author>(`${this.apiUrl}/${id}`, author);
  }
}
