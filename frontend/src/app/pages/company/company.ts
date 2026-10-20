// A company's public page (/company/:id): logo, locations, bio and its open jobs.
// Owners and managers also see Admin, Post a job, Edit company page and View applicants.

import { Component, inject, input, resource } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { CompanyService } from '../../core/company.service';
import { JobService } from '../../core/job.service';
import { JobCard } from '../../shared/job-card';
import { ReportButton } from '../../shared/report-button';
import { ProfileService, canEditCompany } from '../../core/profile.service';
import { Avatar } from '../../shared/avatar';

/** Company page (/company/:id): logo, locations, bio and open jobs, plus admin buttons for its owners / managers. */
@Component({
  selector: 'app-company',
  imports: [RouterLink, Avatar, JobCard, ReportButton],
  templateUrl: './company.html',
})
export class CompanyPage {
  /** Company row ID from the address (/company/:id). */
  readonly id = input.required<string>();

  // Shared services this page uses (inject borrows the one app-wide copy).
  protected readonly companies = inject(CompanyService);
  private readonly auth = inject(AuthService);
  private readonly profiles = inject(ProfileService);
  private readonly jobService = inject(JobService);

  /** The company, reloaded when the address changes. */
  protected readonly company = resource({
    params: () => this.id(),
    loader: ({ params }) => this.companies.get(params),
  });

  /** The company's open jobs for the "Open jobs" list. */
  protected readonly jobs = resource({
    params: () => this.id(),
    loader: ({ params }) => this.jobService.listForCompany(params),
  });

  /** True for the company's owners and managers: shows Admin, Post a job, Edit and View applicants. */
  protected readonly canEdit = resource({
    params: () => ({ id: this.id(), userId: this.auth.user()?.$id }),
    loader: async ({ params }) =>
      params.userId ? canEditCompany(await this.profiles.get(params.userId), params.id) : false,
  });
}
