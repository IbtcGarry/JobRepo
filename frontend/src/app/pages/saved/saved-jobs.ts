// Saved jobs (/saved): jobs the user starred with the Save button, newest save first.

import { Component, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';

import { JobService } from '../../core/job.service';
import { ProfileService } from '../../core/profile.service';
import { JobCard } from '../../shared/job-card';
import { SaveJobButton } from '../../shared/save-job-button';

/** Saved jobs (/saved): jobs the user saved, newest first. */
@Component({
  selector: 'app-saved-jobs',
  imports: [RouterLink, JobCard, SaveJobButton],
  templateUrl: './saved-jobs.html',
})
export class SavedJobs {
  // Shared services this page uses (inject borrows the one app-wide copy).
  private readonly jobService = inject(JobService);
  private readonly profiles = inject(ProfileService);

  /** The saved jobs, reloaded whenever the saved list changes (e.g. after Unsave). */
  protected readonly jobs = resource({
    params: () => this.profiles.me()?.savedJobIds ?? [],
    loader: ({ params }) => this.jobService.getMany([...params].reverse()),
  });
}
