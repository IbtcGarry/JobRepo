// Company admin dashboard (/company/:id/admin), for owners and managers: totals, then a
// table of every job under the company (open and closed) with posted by, date, salary,
// View applicants, screening questions and Close / Reopen / Edit / Remove. Template: company-admin.html.

import { Component, computed, inject, input, resource, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ApplicationService } from '../../core/application.service';
import { AuthService, errorMessage } from '../../core/auth.service';
import { Company, CompanyService } from '../../core/company.service';
import { JobService } from '../../core/job.service';
import { ProfileService, canEditCompany } from '../../core/profile.service';
import { summarizeJobs } from '../../data/job-admin';
import { salaryRange } from '../../data/job-format';
import { Job, JobStatus } from '../../data/jobs';
import { Avatar } from '../../shared/avatar';

/** Everything the admin page loads at once. */
interface AdminData {
  company: Company | null;
  allowed: boolean;
  jobs: Job[];
  counts: Record<string, number>;
}

/** Every job under a company, for its owners and managers (`/company/:id/admin`). */
@Component({
  selector: 'app-company-admin',
  imports: [RouterLink, DatePipe, Avatar],
  templateUrl: './company-admin.html',
})
export class CompanyAdmin {
  /** Company row ID from the address (/company/:id/admin). */
  readonly id = input.required<string>();

  // Shared services this page uses (inject borrows the one app-wide copy).
  private readonly auth = inject(AuthService);
  protected readonly companies = inject(CompanyService);
  protected readonly profiles = inject(ProfileService);
  private readonly jobService = inject(JobService);
  private readonly applications = inject(ApplicationService);
  /** Salary formatter used in the table. */
  protected readonly salaryRange = salaryRange;

  /** Which tab is showing: All, Open or Closed. */
  protected readonly view = signal<'all' | JobStatus>('all');
  /** ID of the job being changed, to disable its buttons meanwhile. */
  protected readonly busy = signal<string | null>(null);
  /** Error message from the last failed action. */
  protected readonly error = signal('');

  /** Loads the company, checks the user is an owner / manager, then loads every job and its applicant count. */
  protected readonly data = resource<AdminData, { id: string; userId: string }>({
    params: () => ({ id: this.id(), userId: this.auth.user()!.$id }),
    loader: async ({ params }) => {
      const [company, profile] = await Promise.all([this.companies.get(params.id), this.profiles.get(params.userId)]);
      if (!company || !canEditCompany(profile, params.id)) return { company, allowed: false, jobs: [], counts: {} };
      const jobs = await this.jobService.listForCompany(params.id, { includeClosed: true });
      const counts = await this.applications.countForJobs(jobs.map((j) => j.id));
      return { company, allowed: true, jobs, counts };
    },
  });

  /** Totals for the tiles: jobs, open, closed, applicants, posters. */
  protected readonly summary = computed(() => {
    const d = this.data.value();
    return summarizeJobs(d?.jobs ?? [], d?.counts ?? {});
  });

  /** The jobs in the table for the current tab. */
  protected readonly shown = computed(() => {
    const jobs = this.data.value()?.jobs ?? [];
    const view = this.view();
    return view === 'all' ? jobs : jobs.filter((j) => j.status === view);
  });

  /** All / Open / Closed tab buttons. */
  protected showView(view: 'all' | JobStatus) {
    this.view.set(view);
  }

  /** How many of a job's screening questions are must-haves. */
  protected mustHaves(job: Job): number {
    return job.questions.filter((q) => q.mustHave).length;
  }

  /** How many people applied to a job. */
  protected count(job: Job): number {
    return this.data.value()?.counts[job.id] ?? 0;
  }

  /** Status badge text: Open, Closed or Draft. */
  protected statusText(job: Job): string {
    return { open: 'Open', closed: 'Closed', draft: 'Draft' }[job.status];
  }

  /** Close / Reopen / Publish button: open ↔ closed, and a draft is published (opened). */
  async toggleStatus(job: Job) {
    const status: JobStatus = job.status === 'open' ? 'closed' : 'open';
    await this.act(job.id, async () => {
      await this.jobService.setStatus(job.id, status);
      this.updateJobs((jobs) => jobs.map((j) => (j.id === job.id ? { ...j, status } : j)));
    });
  }

  /** Remove button: delete the job and take it out of the table. */
  async remove(job: Job) {
    await this.act(job.id, async () => {
      await this.jobService.delete(job.id);
      this.updateJobs((jobs) => jobs.filter((j) => j.id !== job.id));
    });
  }

  /** Change the loaded job list in place, so the table and totals update without reloading. */
  private updateJobs(change: (jobs: Job[]) => Job[]) {
    this.data.update((d) => d && { ...d, jobs: change(d.jobs) });
  }

  /** Shared wrapper for row actions: mark the row busy, run the task, show any error. */
  private async act(jobId: string, task: () => Promise<void>) {
    this.busy.set(jobId);
    this.error.set('');
    try {
      await task();
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(null);
    }
  }
}
