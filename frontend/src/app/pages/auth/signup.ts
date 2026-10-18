import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService, USERNAME_PATTERN, errorMessage } from '../../core/auth.service';

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth-card">
      <h1>Create your account</h1>
      <p class="muted">Find your next role or your next hire.</p>

      @if (error()) { <p class="error">{{ error() }}</p> }

      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>
          Username
          <input formControlName="username" autocomplete="username" autocapitalize="none" spellcheck="false" />
          <span class="small muted">3–30 characters: lowercase letters, numbers, . _ -</span>
        </label>
        <label>
          Password
          <input type="password" formControlName="password" autocomplete="new-password" />
          <span class="small muted">At least 8 characters.</span>
        </label>
        <button class="btn" type="submit" [disabled]="form.invalid || busy()">
          {{ busy() ? 'Creating account…' : 'Sign up' }}
        </button>
      </form>

      <p class="muted center">Already have an account? <a routerLink="/login">Log in</a></p>
    </section>
  `,
})
export class Signup {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = inject(NonNullableFormBuilder).group({
    username: ['', [Validators.required, Validators.pattern(USERNAME_PATTERN)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  async submit() {
    this.busy.set(true);
    this.error.set('');
    try {
      const { username, password } = this.form.getRawValue();
      await this.auth.signup(username, password);
      await this.router.navigateByUrl('/');
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
