import { Component, inject, input, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Application, ApplicationService, ApplicationStatus } from '../../core/application.service';
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
  template: `
    <section class="page applicants">
      <p class="muted small">
        <a [routerLink]="['/account']" [queryParams]="{ tab: 'company' }">Job listings</a>
        @if (data.value()?.job; as job) { › <a [routerLink]="['/jobs', job.id]">{{ job.title }}</a> }
      </p>
      <h1>Applicants</h1>
      @if (error()) { <p class="error">{{ error() }}</p> }

      @if (data.isLoading()) {
        <p class="muted">Loading applicants…</p>
      } @else if (data.error()) {
        <p class="error">Couldn't load applicants.</p>
      } @else if (!data.value()?.job) {
        <p>Job not found.</p>
      } @else {
        <p class="muted">{{ data.value()!.applicants.length }} {{ data.value()!.applicants.length === 1 ? 'applicant' : 'applicants' }}</p>
        <ul class="job-list">
          @for (a of data.value()!.applicants; track a.application.id) {
            <li class="applicant">
              <app-avatar [name]="a.application.applicantName" [url]="a.avatarUrl" size="medium" />
              <div class="info">
                <strong>{{ a.application.applicantName }}</strong>
                @if (a.score.total) {
                  <span class="decision" [class.interview]="a.score.met === a.score.total" [class.rejected]="a.score.met < a.score.total">
                    {{ a.score.met === a.score.total ? 'Meets must-haves' : 'Missed ' + (a.score.total - a.score.met) + ' must-have' + (a.score.total - a.score.met === 1 ? '' : 's') }}
                  </span>
                }
                @if (a.application.status !== 'submitted') {
                  <span class="decision" [class]="a.application.status">{{ statusLabel[a.application.status] }}</span>
                }
                @if (a.profile?.occupation) { <span class="muted"> · {{ a.profile!.occupation }}</span> }
                @if (a.profile?.bio) { <p class="bio-preview">{{ a.profile!.bio }}</p> }
                <p class="muted small">
                  Applied {{ ago(a.application.appliedAt) }}
                  · {{ a.application.resumeFileId ? 'Resume attached' : 'No resume' }}
                </p>
              </div>
              <div class="decide">
                <a class="btn btn-sm" [routerLink]="[a.application.id]">View application</a>
                <button
                  type="button"
                  class="btn btn-outline btn-sm interview"
                  [class.on]="a.application.status === 'interview'"
                  [disabled]="busy() === a.application.id"
                  [attr.aria-pressed]="a.application.status === 'interview'"
                  (click)="decide(a.application, 'interview')"
                >
                  Interview
                </button>
                <button
                  type="button"
                  class="btn btn-outline btn-sm reject"
                  [class.on]="a.application.status === 'rejected'"
                  [disabled]="busy() === a.application.id"
                  [attr.aria-pressed]="a.application.status === 'rejected'"
                  (click)="decide(a.application, 'rejected')"
                >
                  Reject
                </button>
              </div>
            </li>
          } @empty {
            <li class="empty muted">No one has applied yet.</li>
          }
        </ul>
      }
    </section>
  `,
})
export class Applicants {
  readonly id = input.required<string>();
  readonly jobId = input.required<string>();

  private readonly jobs = inject(JobService);
  private readonly applications = inject(ApplicationService);
  private readonly profiles = inject(ProfileService);
  protected readonly ago = postedAgo;
  protected readonly statusLabel: Record<ApplicationStatus, string> = {
    submitted: 'New',
    interview: 'Interview',
    rejected: 'Rejected',
  };
  protected readonly busy = signal<string | null>(null);
  protected readonly error = signal('');

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

  /** Mark an applicant for interview or rejected; clicking the current choice again undoes it. */
  async decide(application: Application, choice: Exclude<ApplicationStatus, 'submitted'>) {
    const status: ApplicationStatus = application.status === choice ? 'submitted' : choice;
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
}
