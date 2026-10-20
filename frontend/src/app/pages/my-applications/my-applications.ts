// My applications (/applications): every job the user applied to, with its current stage
// (New, Reviewing, Interview, Offer, Hired, Rejected) and a Withdraw button.

import { Component, inject, resource, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Application, ApplicationService, statusLabel } from '../../core/application.service';
import { AuthService, errorMessage } from '../../core/auth.service';

/** My applications (/applications): each job applied to, its current stage, and Withdraw. */
@Component({
  selector: 'app-my-applications',
  imports: [RouterLink, DatePipe],
  templateUrl: './my-applications.html',
})
export class MyApplications {
  // Shared services this page uses (inject borrows the one app-wide copy).
  private readonly auth = inject(AuthService);
  private readonly applicationService = inject(ApplicationService);

  /** The user's applications, newest first. */
  protected readonly applications = resource({ loader: () => this.applicationService.listMine(this.auth.user()!.$id) });
  /** Stage name for the status badge. */
  protected readonly label = statusLabel;
  /** ID of the application being withdrawn. */
  protected readonly busy = signal<string | null>(null);
  /** Error from the last failed withdraw. */
  protected readonly error = signal('');

  /** Withdraw button: delete the application. */
  async withdraw(application: Application) {
    this.busy.set(application.id);
    this.error.set('');
    try {
      await this.applicationService.withdraw(application.id);
      this.applications.update((list) => list?.filter((a) => a.id !== application.id));
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(null);
    }
  }
}
