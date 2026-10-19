import { Component, computed, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { JobService } from '../core/job.service';
import { EMPTY_FILTERS, JobFilters, filterJobs } from '../data/job-filters';
import { JobCard } from '../shared/job-card';
import { JobFilterBar } from '../shared/job-filter-bar';

@Component({
  selector: 'app-home',
  imports: [RouterLink, JobCard, JobFilterBar],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly auth = inject(AuthService);
  private readonly jobService = inject(JobService);

  protected readonly allJobs = resource({ loader: () => this.jobService.list() });
  protected readonly total = computed(() => this.allJobs.value()?.length ?? 0);
  protected readonly filters = signal<JobFilters>(EMPTY_FILTERS);
  protected readonly jobs = computed(() => filterJobs(this.allJobs.value() ?? [], this.filters()));

  protected set<K extends keyof JobFilters>(key: K, value: JobFilters[K]) {
    this.filters.update((f) => ({ ...f, [key]: value }));
  }
}
