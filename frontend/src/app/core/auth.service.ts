// Accounts: sign up, log in, log out, and who is logged in (the `user` signal).
// JobTest is username + password only; Appwrite needs an email, so each username is turned into a
// placeholder address (usernameToEmail) that never receives mail.

import { Injectable, computed, signal } from '@angular/core';
import { AppwriteException, ID, Models } from 'appwrite';

import { account } from './appwrite';

/** Accounts: sign up, log in, log out, change username / password, and who is logged in (the `user` signal). */
@Injectable({ providedIn: 'root' })
export class AuthService {
  /** The logged-in user, or null. Private so only this service can change it; pages read `user` below. */
  private readonly _user = signal<Models.User<Models.Preferences> | null>(null);

  /** Read-only view of the logged-in user for pages and the header. */
  readonly user = this._user.asReadonly();
  /** True when someone is logged in; used by the route guards. */
  readonly isLoggedIn = computed(() => this._user() !== null);

  /** Load the current session (if any). Called once on app start. */
  async load(): Promise<void> {
    try {
      this._user.set(await account.get());
    } catch {
      this._user.set(null);
    }
  }

  /** Create an account from a username + password, log straight in, and load the new user. */
  async signup(username: string, password: string): Promise<void> {
    const email = usernameToEmail(username);
    await account.create({ userId: ID.unique(), email, password, name: username.trim() });
    await account.createEmailPasswordSession({ email, password });
    await this.load();
  }

  /** Log in with a username + password (turned into the hidden placeholder email first). */
  async login(username: string, password: string): Promise<void> {
    await account.createEmailPasswordSession({ email: usernameToEmail(username), password });
    await this.load();
  }

  /**
   * Change username: Appwrite needs the current password to change the hidden email,
   * then the display name follows. Throws "That username is taken." if someone has it.
   */
  async changeUsername(newUsername: string, password: string): Promise<void> {
    const name = newUsername.trim().toLowerCase();
    await account.updateEmail({ email: usernameToEmail(name), password });
    await account.updateName({ name });
    await this.load();
  }

  /** Change password: the current password is required. */
  async changePassword(newPassword: string, currentPassword: string): Promise<void> {
    await account.updatePassword({ password: newPassword, oldPassword: currentPassword });
  }

  /** End this browser's session and forget the user. */
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
    if (err.type === 'user_email_already_exists' || err.type === 'user_target_already_exists') return 'That username is taken.';
    return err.message;
  }
  return 'Something went wrong. Please try again.';
}
