import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService, errorMessage } from '../../core/auth.service';
import { OAuthButtons } from './oauth-buttons';

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink, OAuthButtons],
  template: `
    <section class="auth-card">
      <h1>Create your account</h1>
      <p class="muted">Find your next role or your next hire.</p>

      @if (error()) { <p class="error">{{ error() }}</p> }

      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>Full name <input formControlName="name" autocomplete="name" /></label>
        <label>Email <input type="email" formControlName="email" autocomplete="email" /></label>
        <label>
          Password
          <input type="password" formControlName="password" autocomplete="new-password" />
          <span class="small muted">At least 8 characters.</span>
        </label>
        <button class="btn" type="submit" [disabled]="form.invalid || busy()">
          {{ busy() ? 'Creating account…' : 'Sign up' }}
        </button>
      </form>

      <app-oauth-buttons />

      <p class="muted center">Already have an account? <a routerLink="/login">Log in</a></p>
    </section>
  `,
})
export class Signup {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  async submit() {
    this.busy.set(true);
    this.error.set('');
    try {
      const { name, email, password } = this.form.getRawValue();
      await this.auth.signup(name, email, password);
      await this.router.navigateByUrl('/verify-email');
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
