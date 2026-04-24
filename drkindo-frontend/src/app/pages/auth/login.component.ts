import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatIconModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-logo">
          <mat-icon style="font-size:48px;color:var(--accent-light)">library_music</mat-icon>
          <h1>DrKindo</h1>
          <p>Plateforme audio islamique</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onLogin()">
          <div class="form-group">
            <label>Nom d'utilisateur</label>
            <input formControlName="username" placeholder="Entrez votre nom d'utilisateur" />
          </div>
          <div class="form-group">
            <label>Mot de passe</label>
            <input type="password" formControlName="password" placeholder="••••••••" />
          </div>
          @if (error) {
            <div style="color:var(--danger);font-size:13px;margin-bottom:12px;text-align:center">{{ error }}</div>
          }
          <button class="btn-primary" type="submit" [disabled]="form.invalid || loading">
            {{ loading ? 'Connexion...' : 'Se connecter' }}
          </button>
        </form>

        <div class="auth-link">
          Pas encore de compte ? <a routerLink="/auth/register">S'inscrire</a>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  form = this.fb.group({
    username: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {}

  onLogin() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const { username, password } = this.form.value;
    this.authService.login(username!, password!).subscribe({
      next: () => this.router.navigate(['/home']),
      error: () => { this.error = 'Identifiants incorrects'; this.loading = false; }
    });
  }
}
