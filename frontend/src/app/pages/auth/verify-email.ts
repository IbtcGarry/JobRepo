import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService, errorMessage } from '../../core/auth.service';

@Component({
  selector: 'app-verify-email',
  imports: [RouterLink],
  template: `
    <section class="auth-card">
      @switch (state()) {
        @case ('verifying') { <h1>Verifying…</h1> }
        @case ('verified') {
          <h1>Email verified</h1>
          <p class="muted">You're all set.</p>
          <a class="btn" routerLink="/">Continue</a>
        }
        @default {
          <h1>Check your inbox</h1>
          <p class="muted">
            We sent a verification link to <strong>{{ auth.user()?.email }}</strong>.
            Click it to confirm your email.
          </p>
          @if (error()) { <p class="error">{{ error() }}</p> }
          @if (sent()) { <p class="success">Sent! Check your inbox.</p> }
          @if (auth.isLoggedIn()) {
            <button class="btn btn-outline" (click)="resend()">Resend email</button>
          }
          <a class="small" routerLink="/">Skip for now</a>
        }
      }
    </section>
  `,
})
export class VerifyEmail implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  protected readonly state = signal<'waiting' | 'verifying' | 'verified'>('waiting');
  protected readonly error = signal('');
  protected readonly sent = signal(false);

  async ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    const userId = params.get('userId');
    const secret = params.get('secret');
    if (!userId || !secret) return;

    this.state.set('verifying');
    try {
      await this.auth.confirmVerification(userId, secret);
      this.state.set('verified');
    } catch (err) {
      this.state.set('waiting');
      this.error.set(errorMessage(err));
    }
  }

  async resend() {
    this.error.set('');
    try {
      await this.auth.sendVerification();
      this.sent.set(true);
    } catch (err) {
      this.error.set(errorMessage(err));
    }
  }
}
