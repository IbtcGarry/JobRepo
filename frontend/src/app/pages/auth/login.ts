import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService, errorMessage } from '../../core/auth.service';
import { OAuthButtons } from './oauth-buttons';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, OAuthButtons],
  template: `
    <section class="auth-card">
      <h1>Log in</h1>
      <p class="muted">Welcome back to JobTest.</p>

      @if (oauthFailed) { <p class="error">Social login failed. Please try again.</p> }
      @if (error()) { <p class="error">{{ error() }}</p> }

      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>Email <input type="email" formControlName="email" autocomplete="email" /></label>
        <label>Password <input type="password" formControlName="password" autocomplete="current-password" /></label>
        <a routerLink="/forgot-password" class="small">Forgot password?</a>
        <button class="btn" type="submit" [disabled]="form.invalid || busy()">
          {{ busy() ? 'Logging in…' : 'Log in' }}
        </button>
      </form>

      <app-oauth-buttons />

      <p class="muted center">No account? <a routerLink="/signup">Sign up</a></p>
    </section>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly oauthFailed = this.route.snapshot.queryParamMap.get('error') === 'oauth';

  async submit() {
    this.busy.set(true);
    this.error.set('');
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email, password);
      const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/';
      await this.router.navigateByUrl(redirect);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
