import { Component, inject, input, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApplicationService } from '../core/application.service';
import { errorMessage } from '../core/auth.service';
import { JobService } from '../core/job.service';
import { JobCard } from './job-card';

/** A company's job listings with Applicants / Edit / Remove, for owners and managers. */
@Component({
  selector: 'app-manage-jobs',
  imports: [RouterLink, JobCard],
  template: `
    <div class="posted-head">
      <h2>Job listings</h2>
      <div class="resume-actions">
        <a [routerLink]="['/company', companyId(), 'admin']">See all in admin</a>
        <a class="btn btn-sm" [routerLink]="['/company', companyId(), 'jobs', 'new']">Post a job</a>
      </div>
    </div>

    @if (error()) { <p class="error">{{ error() }}</p> }

    @if (listing.isLoading()) {
      <p class="muted">Loading jobs…</p>
    } @else if (listing.value()?.jobs?.length) {
      <ul class="job-list">
        @for (job of listing.value()!.jobs; track job.id) {
          <li>
            <app-job-card [job]="job">
              <div class="manage-actions">
                @if (job.status === 'closed') { <span class="closed-tag">Closed</span> }
                <a class="btn btn-sm" [routerLink]="['/company', companyId(), 'jobs', job.id, 'applicants']">
                  View applicants ({{ listing.value()!.counts[job.id] }})
                </a>
                <a class="btn btn-outline btn-sm" [routerLink]="['/company', companyId(), 'jobs', job.id, 'edit']">Edit</a>
                <button type="button" class="link" [disabled]="removing() === job.id" (click)="remove(job.id)">
                  {{ removing() === job.id ? 'Removing…' : 'Remove' }}
                </button>
              </div>
            </app-job-card>
          </li>
        }
      </ul>
    } @else {
      <p class="muted">No job listings yet.</p>
    }
  `,
})
export class ManageJobs {
  readonly companyId = input.required<string>();

  private readonly jobs = inject(JobService);
  private readonly applications = inject(ApplicationService);

  protected readonly removing = signal<string | null>(null);
  protected readonly error = signal('');

  protected readonly listing = resource({
    params: () => this.companyId(),
    loader: async ({ params }) => {
      const jobs = await this.jobs.listForCompany(params, { includeClosed: true });
      return { jobs, counts: await this.applications.countForJobs(jobs.map((j) => j.id)) };
    },
  });

  async remove(id: string) {
    this.removing.set(id);
    this.error.set('');
    try {
      await this.jobs.delete(id);
      this.listing.update((l) => l && { ...l, jobs: l.jobs.filter((j) => j.id !== id) });
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.removing.set(null);
    }
  }
}
