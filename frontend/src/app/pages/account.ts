import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';

import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-account',
  imports: [DatePipe],
  template: `
    @if (auth.user(); as user) {
      <section class="page">
        <h1>Your account</h1>
        <dl class="details">
          <dt>Name</dt><dd>{{ user.name || '—' }}</dd>
          <dt>Email</dt><dd>{{ user.email }} {{ user.emailVerification ? '(verified)' : '(not verified)' }}</dd>
          <dt>Member since</dt><dd>{{ user.$createdAt | date: 'mediumDate' }}</dd>
        </dl>
      </section>
    }
  `,
})
export class Account {
  protected readonly auth = inject(AuthService);
}
