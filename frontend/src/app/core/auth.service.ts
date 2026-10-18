import { Injectable, computed, signal } from '@angular/core';
import { AppwriteException, ID, Models, OAuthProvider } from 'appwrite';

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

  async signup(name: string, email: string, password: string): Promise<void> {
    await account.create({ userId: ID.unique(), email, password, name });
    await account.createEmailPasswordSession({ email, password });
    await this.sendVerification();
    await this.load();
  }

  async login(email: string, password: string): Promise<void> {
    await account.createEmailPasswordSession({ email, password });
    await this.load();
  }

  async logout(): Promise<void> {
    await account.deleteSession({ sessionId: 'current' });
    this._user.set(null);
  }

  loginWithOAuth(provider: OAuthProvider): void {
    account.createOAuth2Session({
      provider,
      success: `${location.origin}/`,
      failure: `${location.origin}/login?error=oauth`,
    });
  }

  async sendVerification(): Promise<void> {
    await account.createVerification({ url: `${location.origin}/verify-email` });
  }

  async confirmVerification(userId: string, secret: string): Promise<void> {
    await account.updateVerification({ userId, secret });
    await this.load();
  }

  async sendPasswordReset(email: string): Promise<void> {
    await account.createRecovery({ email, url: `${location.origin}/reset-password` });
  }

  async resetPassword(userId: string, secret: string, password: string): Promise<void> {
    await account.updateRecovery({ userId, secret, password });
  }
}

/** Turn an Appwrite error into a message safe to show in the UI. */
export function errorMessage(err: unknown): string {
  if (err instanceof AppwriteException) return err.message;
  return 'Something went wrong. Please try again.';
}
