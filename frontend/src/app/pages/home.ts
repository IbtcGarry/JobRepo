import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <section class="hero">
      @if (auth.user(); as user) {
        <h1>Welcome, {{ user.name || user.email }}</h1>
        @if (!user.emailVerification) {
          <p class="notice">Please verify your email. <a routerLink="/verify-email">Resend link</a></p>
        }
        <p class="muted">Job listings and your profile are coming next.</p>
      } @else {
        <h1>Find work at great companies.</h1>
        <p class="muted">Salary up front. One profile. Apply in a click.</p>
        <div class="actions">
          <a class="btn" routerLink="/signup">Get started</a>
          <a class="btn btn-outline" routerLink="/login">Log in</a>
        </div>
      }
    </section>
  `,
})
export class Home {
  protected readonly auth = inject(AuthService);
}
