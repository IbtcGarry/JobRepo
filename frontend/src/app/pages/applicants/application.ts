// One application (/company/:id/jobs/:jobId/applicants/:applicationId): screening answers
// with ✓ / ✗ for must-haves, the resume, the applicant's note and bio.

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
  templateUrl: './application.html',
})
export class ApplicationView {
  /** Company row ID from the address. */
  readonly id = input.required<string>();
  /** Job ID from the address. */
  readonly jobId = input.required<string>();
  /** Application ID from the address. */
  readonly applicationId = input.required<string>();

  // Shared services this page uses (inject borrows the one app-wide copy).
  private readonly applications = inject(ApplicationService);
  private readonly profiles = inject(ProfileService);
  private readonly jobs = inject(JobService);

  /** Loads the application, the applicant's profile and picture, and the job's questions. */
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

  /** Whether one answer meets its must-have (✓ / ✗). */
  protected readonly check = meetsMustHave;

  /** "1/2 must-haves" score for the header badge. */
  protected mustHave() {
    const d = this.data.value();
    return d?.application ? mustHaveScore(d.questions, d.application.answers) : { met: 0, total: 0 };
  }

  /** Address that opens the applicant's resume. */
  protected resumeUrl(fileId: string): string {
    return this.profiles.resumeUrl(fileId);
  }
}
