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
  readonly id = input.required<string>();

  private readonly auth = inject(AuthService);
  protected readonly companies = inject(CompanyService);
  private readonly profiles = inject(ProfileService);
  private readonly jobService = inject(JobService);
  private readonly applications = inject(ApplicationService);
  protected readonly salaryRange = salaryRange;

  protected readonly view = signal<'all' | JobStatus>('all');
  protected readonly busy = signal<string | null>(null);
  protected readonly error = signal('');

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

  protected readonly summary = computed(() => {
    const d = this.data.value();
    return summarizeJobs(d?.jobs ?? [], d?.counts ?? {});
  });

  protected readonly shown = computed(() => {
    const jobs = this.data.value()?.jobs ?? [];
    const view = this.view();
    return view === 'all' ? jobs : jobs.filter((j) => j.status === view);
  });

  protected mustHaves(job: Job): number {
    return job.questions.filter((q) => q.mustHave).length;
  }

  protected count(job: Job): number {
    return this.data.value()?.counts[job.id] ?? 0;
  }

  async toggleStatus(job: Job) {
    const status: JobStatus = job.status === 'open' ? 'closed' : 'open';
    await this.act(job.id, async () => {
      await this.jobService.setStatus(job.id, status);
      this.updateJobs((jobs) => jobs.map((j) => (j.id === job.id ? { ...j, status } : j)));
    });
  }

  async remove(job: Job) {
    await this.act(job.id, async () => {
      await this.jobService.delete(job.id);
      this.updateJobs((jobs) => jobs.filter((j) => j.id !== job.id));
    });
  }

  private updateJobs(change: (jobs: Job[]) => Job[]) {
    this.data.update((d) => d && { ...d, jobs: change(d.jobs) });
  }

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
