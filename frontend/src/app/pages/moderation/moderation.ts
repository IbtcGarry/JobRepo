// Moderation (/admin), for site moderators only (profiles.siteAdmin, moderatorGuard):
// reports from users about jobs, companies and profiles, with actions to close a reported
// job, resolve or dismiss the report.

import { Component, inject, resource, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { errorMessage } from '../../core/auth.service';
import { JobService } from '../../core/job.service';
import { Report, ReportService } from '../../core/report.service';

/** Moderation page (/admin), site moderators only: review reports and close jobs, resolve or dismiss. */
@Component({
  selector: 'app-moderation',
  imports: [RouterLink, DatePipe],
  templateUrl: './moderation.html',
})
export class Moderation {
  // Shared services this page uses (inject borrows the one app-wide copy).
  private readonly reportService = inject(ReportService);
  private readonly jobs = inject(JobService);

  /** Show only open reports, or every report. */
  protected readonly onlyOpen = signal(true);
  /** The reports for the current filter. */
  protected readonly reports = resource({ params: () => this.onlyOpen(), loader: ({ params }) => this.reportService.list(params) });
  /** ID of the report being acted on. */
  protected readonly busy = signal<string | null>(null);
  /** Error from the last failed action. */
  protected readonly error = signal('');

  /** Open only / All switch. */
  protected showOpenOnly(on: boolean) {
    this.onlyOpen.set(on);
  }

  /** Address of the reported item. */
  protected link(report: Report): string[] {
    return [{ job: '/jobs', company: '/company', profile: '/profile' }[report.targetType], report.targetId];
  }

  /** "Close job" on a job report: take the job off the board and resolve the report. */
  async closeJob(report: Report) {
    await this.act(report, async () => {
      await this.jobs.setStatus(report.targetId, 'closed');
      await this.reportService.setStatus(report.id, 'resolved');
    });
  }

  /** Resolve (action taken elsewhere) or Dismiss (nothing wrong). */
  async setStatus(report: Report, status: 'resolved' | 'dismissed') {
    await this.act(report, () => this.reportService.setStatus(report.id, status));
  }

  /** Shared wrapper for report actions: mark busy, run, reload the list, show any error. */
  private async act(report: Report, task: () => Promise<void>) {
    this.busy.set(report.id);
    this.error.set('');
    try {
      await task();
      this.reports.reload();
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(null);
    }
  }
}
