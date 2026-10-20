// Front page (/): the hero with the View map button, then the job board with search,
// filter dropdowns (shared/job-filter-bar.ts) and job cards (shared/job-card.ts).
// Template: home.html. Styles: home.scss.

import { Component, computed, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { JobService } from '../core/job.service';
import { EMPTY_FILTERS, JobFilters, filterJobs } from '../data/job-filters';
import { JobCard } from '../shared/job-card';
import { JobFilterBar } from '../shared/job-filter-bar';
import { SaveJobButton } from '../shared/save-job-button';

/** Front page (/): the hero with the View map button, then the job board with search, filters and job cards. */
@Component({
  selector: 'app-home',
  imports: [RouterLink, JobCard, JobFilterBar, SaveJobButton],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  /** Who is logged in (changes the hero text and buttons). */
  protected readonly auth = inject(AuthService);
  /** Loads the open jobs. */
  private readonly jobService = inject(JobService);

  /** Every open job, loaded when the page opens. */
  protected readonly allJobs = resource({ loader: () => this.jobService.list() });
  /** How many open jobs exist, to tell "no jobs yet" from "no matches". */
  protected readonly total = computed(() => this.allJobs.value()?.length ?? 0);
  /** Search text, location and dropdown filters; the filter bar edits these. */
  protected readonly filters = signal<JobFilters>(EMPTY_FILTERS);
  /** The jobs to list: every open job that passes the filters, sorted. */
  protected readonly jobs = computed(() => filterJobs(this.allJobs.value() ?? [], this.filters()));

  /** Change one filter (search box, location box, sort menu). */
  protected set<K extends keyof JobFilters>(key: K, value: JobFilters[K]) {
    this.filters.update((f) => ({ ...f, [key]: value }));
  }
}
