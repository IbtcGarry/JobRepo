// Applicants list for one job (/company/:id/jobs/:jobId/applicants): each person's picture,
// occupation, bio preview and must-have badge, with View application, Interview and Reject.

import { Component, inject, input, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Application, ApplicationService, ApplicationStatus, PIPELINE, statusLabel } from '../../core/application.service';
import { errorMessage } from '../../core/auth.service';
import { JobService } from '../../core/job.service';
import { ProfileService } from '../../core/profile.service';
import { postedAgo } from '../../data/job-format';
import { mustHaveScore } from '../../data/screening';
import { Avatar } from '../../shared/avatar';

/** Everyone who applied to one job (`/company/:id/jobs/:jobId/applicants`). */
@Component({
  selector: 'app-applicants',
  imports: [RouterLink, Avatar],
  templateUrl: './applicants.html',
})
export class Applicants {
  /** Company row ID from the address. */
  readonly id = input.required<string>();
  /** Job ID from the address. */
  readonly jobId = input.required<string>();

  // Shared services this page uses (inject borrows the one app-wide copy).
  private readonly jobs = inject(JobService);
  private readonly applications = inject(ApplicationService);
  private readonly profiles = inject(ProfileService);
  /** "Applied 2d ago" helper. */
  protected readonly ago = postedAgo;
  /** Pipeline stages in order, for the stage menus and board columns. */
  protected readonly pipeline = PIPELINE;
  /** List or Pipeline board. */
  protected readonly view = signal<'list' | 'board'>('list');
  /** Board column the dragged card is over, to highlight it. */
  protected readonly dragOver = signal<ApplicationStatus | null>(null);
  /** ID of the application being changed, to disable its buttons meanwhile. */
  protected readonly busy = signal<string | null>(null);
  /** Error message from the last failed action. */
  protected readonly error = signal('');

  /** Loads the job, its applications, and each applicant's profile, picture and must-have score. */
  protected readonly data = resource({
    params: () => this.jobId(),
    loader: async ({ params }) => {
      const [job, applications] = await Promise.all([this.jobs.get(params), this.applications.listForJob(params)]);
      const applicants = await Promise.all(
        applications.map(async (application) => {
          const profile = await this.profiles.get(application.applicantId).catch(() => null);
          const avatarUrl = profile?.avatarFileId ? this.profiles.avatarFileUrl(profile.avatarFileId) : null;
          const score = mustHaveScore(job?.questions ?? [], application.answers);
          return { application, profile, avatarUrl, score };
        }),
      );
      return { job, applicants };
    },
  });

  /** List / Pipeline board switch. */
  protected showView(view: 'list' | 'board') {
    this.view.set(view);
  }

  /** Stage name for a status badge. */
  protected label(status: ApplicationStatus): string {
    return statusLabel(status);
  }

  /** "Meets must-haves" or "Missed 2 must-haves". */
  protected mustHaveText(score: { met: number; total: number }): string {
    const missed = score.total - score.met;
    return missed ? `Missed ${missed} must-have${missed === 1 ? '' : 's'}` : 'Meets must-haves';
  }

  /** Applicants currently in one pipeline stage (one board column). */
  protected inStage(status: ApplicationStatus) {
    return (this.data.value()?.applicants ?? []).filter((a) => a.application.status === status);
  }

  /** Interview / Reject buttons: set that stage; clicking the current choice again moves back to New. */
  async decide(application: Application, choice: Exclude<ApplicationStatus, 'submitted'>) {
    await this.moveTo(application, application.status === choice ? 'submitted' : choice);
  }

  /** Stage menu or a board drop: move an application to a stage (the applicant is notified). */
  async moveTo(application: Application, status: ApplicationStatus) {
    if (application.status === status) return;
    this.busy.set(application.id);
    this.error.set('');
    try {
      await this.applications.setStatus(application.id, status);
      this.data.update(
        (d) =>
          d && {
            ...d,
            applicants: d.applicants.map((a) =>
              a.application.id === application.id ? { ...a, application: { ...a.application, status } } : a,
            ),
          },
      );
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(null);
    }
  }

  /** Board: a card starts being dragged; remember which application it is. */
  protected startDrag(event: DragEvent, applicationId: string) {
    event.dataTransfer?.setData('text/plain', applicationId);
  }

  /** Board: let a card be dropped on this column and highlight it. */
  protected allowDrop(event: DragEvent, status: ApplicationStatus) {
    event.preventDefault();
    this.dragOver.set(status);
  }

  /** Board: the dragged card left a column. */
  protected leaveColumn(status: ApplicationStatus) {
    if (this.dragOver() === status) this.dragOver.set(null);
  }

  /** Board: a card was dropped on a column; move that application to its stage. */
  protected dropOn(event: DragEvent, status: ApplicationStatus) {
    event.preventDefault();
    this.dragOver.set(null);
    const id = event.dataTransfer?.getData('text/plain');
    const entry = this.data.value()?.applicants.find((a) => a.application.id === id);
    if (entry) void this.moveTo(entry.application, status);
  }
}
