// A job's page (/jobs/:id): facts, address with a Google Maps link, skills, description,
// and Apply (or "You applied" / "This job is closed"). Owners and managers get View applicants.

import { Component, computed, effect, inject, input, resource } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ApplicationService } from '../../core/application.service';
import { AuthService } from '../../core/auth.service';
import { googleMapsUrl } from '../../core/geocode';
import { JobService } from '../../core/job.service';
import { ReportButton } from '../../shared/report-button';
import { SaveJobButton } from '../../shared/save-job-button';
import { ProfileService, canEditCompany } from '../../core/profile.service';
import { isExpired, jobFacts, postedAgo } from '../../data/job-format';

/** Job page (/jobs/:id): facts, address, skills, description, and Apply / Save / Message employer / Report. */
@Component({
  selector: 'app-job-detail',
  imports: [RouterLink, DatePipe, SaveJobButton, ReportButton],
  templateUrl: './job-detail.html',
})
export class JobDetail {
  /** Job ID from the address (/jobs/:id). */
  readonly id = input.required<string>();

  // Shared services this page uses (inject borrows the one app-wide copy).
  protected readonly auth = inject(AuthService);
  private readonly jobs = inject(JobService);
  private readonly applications = inject(ApplicationService);
  private readonly profiles = inject(ProfileService);
  /** Google Maps link helper for the address line. */
  protected readonly mapsUrl = googleMapsUrl;

  /** The job, reloaded when the address changes. */
  protected readonly job = resource({ params: () => this.id(), loader: ({ params }) => this.jobs.get(params) });
  /** The user's application to this job, if any (shows "You applied"). */
  protected readonly mine = resource({
    params: () => ({ jobId: this.id(), userId: this.auth.user()?.$id }),
    loader: ({ params }) => (params.userId ? this.applications.findMine(params.jobId, params.userId) : Promise.resolve(null)),
  });
  /** Owners and managers of the job's company get a View applicants button. */
  protected readonly canManage = resource({
    params: () => ({ companyId: this.job.value()?.companyId, userId: this.auth.user()?.$id }),
    loader: async ({ params }) =>
      !!params.companyId && !!params.userId && canEditCompany(await this.profiles.get(params.userId), params.companyId),
  });
  /** True once the job's closing date has passed. */
  protected readonly expired = computed(() => (this.job.value() ? isExpired(this.job.value()!) : false));

  /** Counts a view when a signed-in user opens the page. */
  constructor() {
    // Count one view each time a signed-in user opens a job page.
    effect(() => {
      if (this.auth.user()) void this.jobs.countView(this.id());
    });
  }

  /** The fact line under the title. */
  protected readonly facts = computed(() => (this.job.value() ? jobFacts(this.job.value()!) : []));
  /** "Posted 2d ago" text. */
  protected readonly ago = computed(() => (this.job.value() ? postedAgo(this.job.value()!.postedAt) : ''));
}
