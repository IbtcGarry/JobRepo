import { Component, inject, input, resource } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ApplicationService } from '../../core/application.service';
import { JobService } from '../../core/job.service';
import { ProfileService } from '../../core/profile.service';
import { ScreeningQuestion, meetsMustHave, mustHaveScore } from '../../data/screening';
import { Avatar } from '../../shared/avatar';

/** One applicant's application (`/company/:id/jobs/:jobId/applicants/:applicationId`). */
@Component({
  selector: 'app-application',
  imports: [RouterLink, DatePipe, Avatar],
  template: `
    <section class="page application">
      <p class="muted small">
        <a [routerLink]="['/company', id(), 'jobs', jobId(), 'applicants']">‹ All applicants</a>
      </p>

      @if (data.isLoading()) {
        <p class="muted">Loading application…</p>
      } @else if (data.error()) {
        <p class="error">Couldn't load this application.</p>
      } @else if (data.value()?.application; as app) {
        <div class="identity">
          <app-avatar [name]="app.applicantName" [url]="data.value()!.avatarUrl" size="large" />
          <div>
            <h1>
              {{ app.applicantName }}
              @if (app.status !== 'submitted') {
                <span class="decision" [class]="app.status">{{ app.status === 'interview' ? 'Interview' : 'Rejected' }}</span>
              }
            </h1>
            <p class="muted">
              @if (data.value()!.profile?.occupation) { {{ data.value()!.profile!.occupation }} · }
              Applied for <a [routerLink]="['/jobs', app.jobId]">{{ app.jobTitle }}</a> on {{ app.appliedAt | date: 'mediumDate' }}
            </p>
          </div>
        </div>

        @if (data.value()!.questions.length; as asked) {
          @let score = mustHave();
          <h2>
            Screening answers
            @if (score.total) {
              <span class="decision" [class.interview]="score.met === score.total" [class.rejected]="score.met < score.total">
                {{ score.met }}/{{ score.total }} must-haves
              </span>
            }
          </h2>
          <dl class="answers">
            @for (q of data.value()!.questions; track q.id) {
              @let result = check(q, app.answers[q.id]);
              <dt>{{ q.text }}</dt>
              <dd>
                {{ app.answers[q.id] || '—' }}
                @if (result === true) { <span class="mark ok" title="Meets the must-have">✓</span> }
                @if (result === false) {
                  <span class="mark no">✗ wanted {{ q.type === 'number' ? 'at least ' + q.minNumber : q.idealAnswer }}</span>
                }
              </dd>
            }
          </dl>
        }

        <h2>Resume</h2>
        @if (app.resumeFileId) {
          <p><a class="btn btn-outline btn-sm" [href]="resumeUrl(app.resumeFileId)" target="_blank" rel="noopener">Open {{ app.resumeName || 'resume' }}</a></p>
        } @else {
          <p class="muted">No resume attached.</p>
        }

        <h2>Note from the applicant</h2>
        @if (app.note) { <p class="prewrap">{{ app.note }}</p> } @else { <p class="muted">No note.</p> }

        <h2>About</h2>
        @if (data.value()!.profile?.bio) {
          <p class="prewrap">{{ data.value()!.profile!.bio }}</p>
        } @else {
          <p class="muted">No bio.</p>
        }
      } @else {
        <h1>Application not found</h1>
      }
    </section>
  `,
})
export class ApplicationView {
  readonly id = input.required<string>();
  readonly jobId = input.required<string>();
  readonly applicationId = input.required<string>();

  private readonly applications = inject(ApplicationService);
  private readonly profiles = inject(ProfileService);
  private readonly jobs = inject(JobService);

  protected readonly data = resource({
    params: () => this.applicationId(),
    loader: async ({ params }) => {
      const application = await this.applications.get(params);
      if (!application) return { application: null, profile: null, avatarUrl: null, questions: [] as ScreeningQuestion[] };
      const [profile, job] = await Promise.all([
        this.profiles.get(application.applicantId).catch(() => null),
        this.jobs.get(application.jobId).catch(() => null),
      ]);
      const avatarUrl = profile?.avatarFileId ? this.profiles.avatarFileUrl(profile.avatarFileId) : null;
      return { application, profile, avatarUrl, questions: job?.questions ?? [] };
    },
  });

  protected readonly check = meetsMustHave;

  protected mustHave() {
    const d = this.data.value();
    return d?.application ? mustHaveScore(d.questions, d.application.answers) : { met: 0, total: 0 };
  }

  protected resumeUrl(fileId: string): string {
    return this.profiles.resumeUrl(fileId);
  }
}
