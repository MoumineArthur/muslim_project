import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { AuthResponse } from '../models/models';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/auth';
  private currentUserSubject = new BehaviorSubject<AuthResponse | null>(this.getStoredUser());
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  register(username: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, { username, email, password })
      .pipe(tap(res => this.storeUser(res)));
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { username, password })
      .pipe(tap(res => this.storeUser(res)));
  }

  logout(): void {
    localStorage.removeItem('auth');
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return this.getStoredUser()?.token || null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  private storeUser(user: AuthResponse): void {
    localStorage.setItem('auth', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private getStoredUser(): AuthResponse | null {
    const stored = localStorage.getItem('auth');
    return stored ? JSON.parse(stored) : null;
  }
}
