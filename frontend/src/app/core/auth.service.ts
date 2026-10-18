import { Injectable, computed, signal } from '@angular/core';
import { AppwriteException, ID, Models } from 'appwrite';

import { account } from './appwrite';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<Models.User<Models.Preferences> | null>(null);

  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);

  /** Load the current session (if any). Called once on app start. */
  async load(): Promise<void> {
    try {
      this._user.set(await account.get());
    } catch {
      this._user.set(null);
    }
  }

  async signup(username: string, password: string): Promise<void> {
    const email = usernameToEmail(username);
    await account.create({ userId: ID.unique(), email, password, name: username.trim() });
    await account.createEmailPasswordSession({ email, password });
    await this.load();
  }

  async login(username: string, password: string): Promise<void> {
    await account.createEmailPasswordSession({ email: usernameToEmail(username), password });
    await this.load();
  }

  async logout(): Promise<void> {
    await account.deleteSession({ sessionId: 'current' });
    this._user.set(null);
  }
}

/** Usernames: 3–30 lowercase letters, numbers, dots, dashes or underscores. */
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;

/**
 * Appwrite accounts need an email, so while JobTest is a test app each username
 * maps to a placeholder address on a reserved domain that never receives mail.
 */
function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@jobtest.example.com`;
}

/** Turn an Appwrite error into a message safe to show in the UI. */
export function errorMessage(err: unknown): string {
  if (err instanceof AppwriteException) {
    if (err.type === 'user_already_exists') return 'That username is taken.';
    if (err.type === 'user_invalid_credentials') return 'Wrong username or password.';
    return err.message;
  }
  return 'Something went wrong. Please try again.';
}
