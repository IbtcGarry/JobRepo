// Sign up page (/signup): pick a username (3–30 lowercase letters, numbers, . _ -) and a
// password of at least 8 characters.

import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService, USERNAME_PATTERN, errorMessage } from '../../core/auth.service';
import { ProfileService } from '../../core/profile.service';

/** Sign up page (/signup): create an account with a username and password, then go to onboarding. */
@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup.html',
})
export class Signup {
  // Shared services this page uses (inject borrows the one app-wide copy).
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly profiles = inject(ProfileService);

  /** Username (3–30 lowercase letters, numbers, . _ -) and password (8+ characters). */
  protected readonly form = inject(NonNullableFormBuilder).group({
    username: ['', [Validators.required, Validators.pattern(USERNAME_PATTERN)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });
  /** True while creating the account (disables the button). */
  protected readonly busy = signal(false);
  /** Message shown when sign-up fails (e.g. username taken). */
  protected readonly error = signal('');

  /** Sign up button: create the account and its profile, log in, then choose a role (onboarding). */
  async submit() {
    this.busy.set(true);
    this.error.set('');
    try {
      const { username, password } = this.form.getRawValue();
      await this.auth.signup(username, password);
      // Start the profile with the username so others can find and invite this user.
      const userId = this.auth.user()!.$id;
      await this.profiles.save(userId, { username: username.trim().toLowerCase(), roles: [] });
      await this.profiles.loadMe(userId);
      await this.router.navigateByUrl('/onboarding');
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
