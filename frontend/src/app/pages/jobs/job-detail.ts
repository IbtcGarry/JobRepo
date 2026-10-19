import { Component, computed, inject, input, resource } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApplicationService } from '../../core/application.service';
import { AuthService } from '../../core/auth.service';
import { googleMapsUrl } from '../../core/geocode';
import { JobService } from '../../core/job.service';
import { ProfileService, canEditCompany } from '../../core/profile.service';
import { jobFacts, postedAgo } from '../../data/job-format';

@Component({
  selector: 'app-job-detail',
  imports: [RouterLink],
  template: `
    <section class="page job-detail">
      @if (job.isLoading()) {
        <p class="muted">Loading…</p>
      } @else if (job.error()) {
        <p class="error">Couldn't load this job.</p>
      } @else if (job.value(); as j) {
        <p class="muted small">
          <a [routerLink]="['/company', j.companyId]">{{ j.company }}</a> · Posted {{ ago() }}
        </p>
        <h1>{{ j.title }}</h1>
        <div class="facts">
          @for (fact of facts(); track fact) { <span>{{ fact }}</span> }
        </div>
        <p class="small">
          {{ j.address }} · <a [href]="mapsUrl(j.address)" target="_blank" rel="noopener">Open in Google Maps</a>
        </p>
        @if (j.skills.length) {
          <div class="tags">
            @for (s of j.skills; track s) { <span class="tag">{{ s }}</span> }
          </div>
        }
        <div class="actions">
          @if (canManage.value()) {
            <a class="btn btn-outline" [routerLink]="['/company', j.companyId, 'jobs', j.id, 'applicants']">View applicants</a>
          }
          @if (j.status === 'closed') {
            <span class="closed-tag">This job is closed</span>
          } @else if (!auth.user()) {
            <a class="btn" routerLink="/login" [queryParams]="{ redirect: '/jobs/' + j.id + '/apply' }">Log in to apply</a>
          } @else if (mine.value()) {
            <span class="applied">✓ You applied</span>
          } @else if (!mine.isLoading()) {
            <a class="btn" [routerLink]="['/jobs', j.id, 'apply']">Apply</a>
          }
        </div>
        <h2>About the job</h2>
        <p class="description">{{ j.description }}</p>
      } @else {
        <h1>Job not found</h1>
        <a routerLink="/">Back to all jobs</a>
      }
    </section>
  `,
})
export class JobDetail {
  readonly id = input.required<string>();

  protected readonly auth = inject(AuthService);
  private readonly jobs = inject(JobService);
  private readonly applications = inject(ApplicationService);
  private readonly profiles = inject(ProfileService);
  protected readonly mapsUrl = googleMapsUrl;

  protected readonly job = resource({ params: () => this.id(), loader: ({ params }) => this.jobs.get(params) });
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
  protected readonly facts = computed(() => (this.job.value() ? jobFacts(this.job.value()!) : []));
  protected readonly ago = computed(() => (this.job.value() ? postedAgo(this.job.value()!.postedAt) : ''));
}
