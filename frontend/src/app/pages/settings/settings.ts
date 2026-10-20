// Settings (/settings): change username or password, pick roles, make the profile public or
// private, and manage job alerts (saved searches that notify you about new matching jobs).

import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AlertService, JobAlert } from '../../core/alert.service';
import { AuthService, USERNAME_PATTERN, errorMessage } from '../../core/auth.service';
import { ProfileService, UserRole } from '../../core/profile.service';

/** Settings (/settings): username, password, roles, profile visibility, job alerts and Log out. */
@Component({
  selector: 'app-settings',
  imports: [FormsModule, RouterLink],
  templateUrl: './settings.html',
})
export class Settings implements OnInit {
  // Shared services this page uses (inject borrows the one app-wide copy).
  protected readonly auth = inject(AuthService);
  private readonly profiles = inject(ProfileService);
  private readonly alertService = inject(AlertService);
  private readonly router = inject(Router);

  // Form fields (bound with ngModel).
  protected newUsername = '';
  protected usernamePassword = '';
  protected currentPassword = '';
  protected newPassword = '';

  /** Roles and public / private, loaded from the profile. */
  protected readonly roles = signal<UserRole[]>([]);
  protected readonly isPublic = signal(true);
  /** The user's job alerts. */
  protected readonly alerts = signal<JobAlert[]>([]);
  /** Which section is saving, and the last message per section. */
  protected readonly busy = signal<string | null>(null);
  protected readonly messages = signal<Record<string, { ok: boolean; text: string }>>({});

  private get userId(): string {
    return this.auth.user()!.$id;
  }

  /** On open: load roles, visibility and alerts. */
  async ngOnInit() {
    const profile = await this.profiles.get(this.userId);
    this.roles.set(profile?.roles ?? []);
    this.isPublic.set(profile?.isPublic ?? true);
    this.alerts.set(await this.alertService.listMine(this.userId));
  }

  /** Change username section. */
  async saveUsername() {
    if (!USERNAME_PATTERN.test(this.newUsername.trim().toLowerCase())) {
      return this.say('username', false, 'Use 3–30 lowercase letters, numbers, . _ -');
    }
    await this.run('username', 'Username changed.', async () => {
      await this.auth.changeUsername(this.newUsername, this.usernamePassword);
      await this.profiles.save(this.userId, { username: this.newUsername.trim().toLowerCase() });
      this.newUsername = this.usernamePassword = '';
    });
  }

  /** Change password section. */
  async savePassword() {
    if (this.newPassword.length < 8) return this.say('password', false, 'Use at least 8 characters.');
    await this.run('password', 'Password changed.', async () => {
      await this.auth.changePassword(this.newPassword, this.currentPassword);
      this.newPassword = this.currentPassword = '';
    });
  }

  /** Role checkboxes: tick or untick, then save. */
  async toggleRole(role: UserRole) {
    const next = this.roles().includes(role) ? this.roles().filter((r) => r !== role) : [...this.roles(), role];
    await this.run('roles', 'Saved.', async () => {
      await this.profiles.save(this.userId, { roles: next });
      this.roles.set(next);
      await this.profiles.refreshMe();
    });
  }

  /** Public profile checkbox. */
  async setPublic(isPublic: boolean) {
    await this.run('visibility', isPublic ? 'Your profile is public.' : 'Your profile is private.', async () => {
      await this.profiles.save(this.userId, { isPublic });
      this.isPublic.set(isPublic);
    });
  }

  /** Log out button: end this browser's session, then go to the front page. */
  async logout() {
    this.busy.set('logout');
    await this.auth.logout();
    await this.router.navigateByUrl('/');
  }

  /** Delete a job alert. */
  async removeAlert(alert: JobAlert) {
    await this.run('alerts', 'Alert deleted.', async () => {
      await this.alertService.remove(alert.id);
      this.alerts.update((list) => list.filter((a) => a.id !== alert.id));
    });
  }

  /** The message shown under one section, if any. */
  protected messageFor(section: string) {
    return this.messages()[section] ?? null;
  }

  /** Show a message under a section. */
  private say(section: string, ok: boolean, text: string) {
    this.messages.update((m) => ({ ...m, [section]: { ok, text } }));
  }

  /** Shared wrapper for each section's button: show busy, run the task, show success or the error. */
  private async run(section: string, done: string, task: () => Promise<void>) {
    this.busy.set(section);
    this.say(section, true, '');
    try {
      await task();
      this.say(section, true, done);
    } catch (err) {
      this.say(section, false, errorMessage(err));
    } finally {
      this.busy.set(null);
    }
  }
}
