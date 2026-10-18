import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService, errorMessage } from '../../core/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth-card">
      <h1>Reset your password</h1>
      @if (sent()) {
        <p class="success">If an account exists for that email, a reset link is on its way.</p>
      } @else {
        <p class="muted">Enter your email and we'll send you a reset link.</p>
        @if (error()) { <p class="error">{{ error() }}</p> }
        <form [formGroup]="form" (ngSubmit)="submit()">
          <label>Email <input type="email" formControlName="email" autocomplete="email" /></label>
          <button class="btn" type="submit" [disabled]="form.invalid || busy()">Send reset link</button>
        </form>
      }
      <p class="muted center"><a routerLink="/login">Back to log in</a></p>
    </section>
  `,
})
export class ForgotPassword {
  private readonly auth = inject(AuthService);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
  });
  protected readonly busy = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal('');

  async submit() {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.sendPasswordReset(this.form.getRawValue().email);
      this.sent.set(true);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
