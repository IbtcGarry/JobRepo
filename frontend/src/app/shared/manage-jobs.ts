// <app-manage-jobs>: a company's job listings on the account Company tab, with
// View applicants (count), Edit and Remove, plus Post a job and a link to the admin page.

import { Component, inject, input, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApplicationService } from '../core/application.service';
import { errorMessage } from '../core/auth.service';
import { JobService } from '../core/job.service';
import { JobCard } from './job-card';

/** Job listings for one company; shown to its owners and managers. */
@Component({
  selector: 'app-manage-jobs',
  imports: [RouterLink, JobCard],
  templateUrl: './manage-jobs.html',
})
export class ManageJobs {
  /** Which company's jobs to list. */
  readonly companyId = input.required<string>();

  // Shared services this component uses.
  private readonly jobs = inject(JobService);
  private readonly applications = inject(ApplicationService);

  /** ID of the job being removed, to disable its button meanwhile. */
  protected readonly removing = signal<string | null>(null);
  /** Error message from the last failed action. */
  protected readonly error = signal('');

  /** The company's jobs (open and closed) plus each job's applicant count. */
  protected readonly listing = resource({
    params: () => this.companyId(),
    loader: async ({ params }) => {
      const jobs = await this.jobs.listForCompany(params, { includeClosed: true });
      return { jobs, counts: await this.applications.countForJobs(jobs.map((j) => j.id)) };
    },
  });

  /** Remove button: delete the job and take it off the list. */
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
