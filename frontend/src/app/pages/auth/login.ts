import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService, errorMessage } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth-card">
      <h1>Log in</h1>
      <p class="muted">Welcome back to JobTest.</p>

      @if (error()) { <p class="error">{{ error() }}</p> }

      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>Username <input formControlName="username" autocomplete="username" autocapitalize="none" spellcheck="false" /></label>
        <label>Password <input type="password" formControlName="password" autocomplete="current-password" /></label>
        <button class="btn" type="submit" [disabled]="form.invalid || busy()">
          {{ busy() ? 'Logging in…' : 'Log in' }}
        </button>
      </form>

      <p class="muted center">No account? <a routerLink="/signup">Sign up</a></p>
    </section>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = inject(NonNullableFormBuilder).group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  async submit() {
    this.busy.set(true);
    this.error.set('');
    try {
      const { username, password } = this.form.getRawValue();
      await this.auth.login(username, password);
      const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/';
      await this.router.navigateByUrl(redirect);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
