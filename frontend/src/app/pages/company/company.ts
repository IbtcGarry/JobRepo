import { Component, inject, input, resource } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { CompanyService } from '../../core/company.service';
import { JobService } from '../../core/job.service';
import { JobCard } from '../../shared/job-card';
import { ProfileService, canEditCompany } from '../../core/profile.service';
import { Avatar } from '../../shared/avatar';

@Component({
  selector: 'app-company',
  imports: [RouterLink, Avatar, JobCard],
  template: `
    <section class="page company">
      @if (company.isLoading()) {
        <p class="muted">Loading…</p>
      } @else if (company.error()) {
        <p class="error">Couldn't load this company.</p>
      } @else if (company.value(); as c) {
        <div class="company-head">
          <app-avatar [name]="c.name" [url]="companies.logoUrl(c.logoFileId)" size="large" />
          <div>
            <h1>{{ c.name }}</h1>
            @if (c.locations.length) {
              <p class="muted">{{ c.locations.join(' · ') }}</p>
            }
          </div>
          @if (canEdit.value()) {
            <div class="edit resume-actions">
              <a class="btn btn-sm" [routerLink]="['/company', c.id, 'admin']">Admin</a>
              <a class="btn btn-outline btn-sm" [routerLink]="['/company', c.id, 'jobs', 'new']">Post a job</a>
              <a class="btn btn-outline btn-sm" [routerLink]="['/company', c.id, 'edit']">Edit company page</a>
            </div>
          }
        </div>

        <h2>About</h2>
        @if (c.bio) {
          <p class="bio">{{ c.bio }}</p>
        } @else {
          <p class="muted">No bio yet.</p>
        }

        @if (c.locations.length) {
          <h2>Locations</h2>
          <ul class="locations">
            @for (l of c.locations; track l) { <li>{{ l }}</li> }
          </ul>
        }

        <h2>Open jobs</h2>
        @if (jobs.value()?.length) {
          <ul class="job-list">
            @for (job of jobs.value(); track job.id) {
              <li>
                <app-job-card [job]="job">
                  @if (canEdit.value()) {
                    <a class="btn btn-outline btn-sm" [routerLink]="['/company', job.companyId, 'jobs', job.id, 'applicants']">View applicants</a>
                  }
                  <a class="btn btn-sm" [routerLink]="['/jobs', job.id]">View</a>
                </app-job-card>
              </li>
            }
          </ul>
        } @else if (!jobs.isLoading()) {
          <p class="muted">No jobs posted yet.</p>
        }
      } @else {
        <h1>Company not found</h1>
        <a routerLink="/companies">See all companies</a>
      }
    </section>
  `,
})
export class CompanyPage {
  readonly id = input.required<string>();

  protected readonly companies = inject(CompanyService);
  private readonly auth = inject(AuthService);
  private readonly profiles = inject(ProfileService);
  private readonly jobService = inject(JobService);

  protected readonly company = resource({
    params: () => this.id(),
    loader: ({ params }) => this.companies.get(params),
  });

  protected readonly jobs = resource({
    params: () => this.id(),
    loader: ({ params }) => this.jobService.listForCompany(params),
  });

  protected readonly canEdit = resource({
    params: () => ({ id: this.id(), userId: this.auth.user()?.$id }),
    loader: async ({ params }) =>
      params.userId ? canEditCompany(await this.profiles.get(params.userId), params.id) : false,
  });
}
