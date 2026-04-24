import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatIconModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-logo">
          <mat-icon style="font-size:48px;color:var(--accent-light)">library_music</mat-icon>
          <h1>DrKindo</h1>
          <p>Créer votre compte</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onRegister()">
          <div class="form-group">
            <label>Nom d'utilisateur</label>
            <input formControlName="username" placeholder="Choisissez un nom d'utilisateur" />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" formControlName="email" placeholder="votre@email.com" />
          </div>
          <div class="form-group">
            <label>Mot de passe</label>
            <input type="password" formControlName="password" placeholder="6 caractères minimum" />
          </div>
          @if (error) {
            <div style="color:var(--danger);font-size:13px;margin-bottom:12px;text-align:center">{{ error }}</div>
          }
          <button class="btn-primary" type="submit" [disabled]="form.invalid || loading">
            {{ loading ? 'Inscription...' : "S'inscrire" }}
          </button>
        </form>

        <div class="auth-link">
          Déjà un compte ? <a routerLink="/auth/login">Se connecter</a>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  form = this.fb.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {}

  onRegister() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const { username, email, password } = this.form.value;
    this.authService.register(username!, email!, password!).subscribe({
      next: () => this.router.navigate(['/home']),
      error: (e) => { this.error = e.error?.message || 'Erreur lors de l\'inscription'; this.loading = false; }
    });
  }
}
