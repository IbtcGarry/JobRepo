// Log in page (/login): username + password. After logging in it returns you to the page
// you were trying to open (the ?redirect= address set by authGuard).

import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService, errorMessage } from '../../core/auth.service';

/** Log in page (/login): username + password, then back to the page the user was heading to. */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  // Shared services this page uses (inject borrows the one app-wide copy).
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Username + password fields, both required. */
  protected readonly form = inject(NonNullableFormBuilder).group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });
  /** True while logging in (disables the button). */
  protected readonly busy = signal(false);
  /** Message shown when login fails. */
  protected readonly error = signal('');

  /** Log in button: log in, then go to the page the user was heading to (or the front page). */
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
