// <app-save-job>: a Save / Saved toggle for one job, shown only to signed-in users.
// Saved job IDs live on the user's profile (profiles.savedJobIds); see the /saved page.

import { Component, computed, inject, input, signal } from '@angular/core';

import { AuthService } from '../core/auth.service';
import { ProfileService } from '../core/profile.service';

/** <app-save-job>: a ☆ Save / ★ Saved toggle for one job (signed-in users only). */
@Component({
  selector: 'app-save-job',
  templateUrl: './save-job-button.html',
})
export class SaveJobButton {
  /** The job to save or unsave. */
  readonly jobId = input.required<string>();

  // Shared services this component uses.
  protected readonly auth = inject(AuthService);
  private readonly profiles = inject(ProfileService);

  /** True while saving, to disable the button. */
  protected readonly busy = signal(false);
  /** Whether this job is in the user's saved list. */
  protected readonly saved = computed(() => this.profiles.me()?.savedJobIds.includes(this.jobId()) ?? false);

  /** Save / Saved button: add or remove the job from the saved list. */
  async toggle() {
    const userId = this.auth.user()?.$id;
    if (!userId) return;
    this.busy.set(true);
    try {
      await this.profiles.toggleSavedJob(userId, this.jobId());
    } finally {
      this.busy.set(false);
    }
  }
}
