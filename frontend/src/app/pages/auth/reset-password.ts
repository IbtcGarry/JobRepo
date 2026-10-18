import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService, errorMessage } from '../../core/auth.service';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth-card">
      <h1>Choose a new password</h1>
      @if (!userId || !secret) {
        <p class="error">This reset link is invalid or incomplete.</p>
        <a routerLink="/forgot-password">Request a new link</a>
      } @else if (done()) {
        <p class="success">Password updated.</p>
        <a class="btn" routerLink="/login">Log in</a>
      } @else {
        @if (error()) { <p class="error">{{ error() }}</p> }
        <form [formGroup]="form" (ngSubmit)="submit()">
          <label>
            New password
            <input type="password" formControlName="password" autocomplete="new-password" />
            <span class="small muted">At least 8 characters.</span>
          </label>
          <button class="btn" type="submit" [disabled]="form.invalid || busy()">Update password</button>
        </form>
      }
    </section>
  `,
})
export class ResetPassword {
  private readonly auth = inject(AuthService);
  private readonly params = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly userId = this.params.get('userId');
  protected readonly secret = this.params.get('secret');
  protected readonly form = inject(NonNullableFormBuilder).group({
    password: ['', [Validators.required, Validators.minLength(8)]],
  });
  protected readonly busy = signal(false);
  protected readonly done = signal(false);
  protected readonly error = signal('');

  async submit() {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.resetPassword(this.userId!, this.secret!, this.form.getRawValue().password);
      this.done.set(true);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
