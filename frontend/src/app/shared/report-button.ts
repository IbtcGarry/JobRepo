// <app-report>: "Report" link that opens a short form to report a job, company or profile to
// the site moderators (core/report.service.ts; reviewed at /admin). Signed-in users only.

import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService, errorMessage } from '../core/auth.service';
import { ReportService, ReportTarget } from '../core/report.service';

/** <app-report>: a Report link that opens a short form and files a report for moderators. */
@Component({
  selector: 'app-report',
  imports: [FormsModule],
  templateUrl: './report-button.html',
})
export class ReportButton {
  /** What is being reported. */
  readonly type = input.required<ReportTarget>();
  readonly targetId = input.required<string>();
  readonly targetName = input.required<string>();

  // Shared services this component uses.
  protected readonly auth = inject(AuthService);
  private readonly reports = inject(ReportService);

  /** Whether the reason box is open. */
  protected readonly open = signal(false);
  /** Text typed in the reason box. */
  protected reason = '';
  /** True while sending. */
  protected readonly sending = signal(false);
  /** "Thanks" once sent, or an error. */
  protected readonly message = signal('');

  /** Report link: open or close the reason box. */
  protected toggle() {
    this.open.update((o) => !o);
    this.message.set('');
  }

  /** Send report button: file the report with the typed reason. */
  async send() {
    const user = this.auth.user();
    if (!user || !this.reason.trim()) return;
    this.sending.set(true);
    try {
      await this.reports.report({ type: this.type(), id: this.targetId(), name: this.targetName() }, this.reason, { id: user.$id, name: user.name });
      this.reason = '';
      this.open.set(false);
      this.message.set('Thanks — a moderator will take a look.');
    } catch (err) {
      this.message.set(errorMessage(err));
    } finally {
      this.sending.set(false);
    }
  }
}
