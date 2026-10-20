// <app-job-card>: one job in a list, with its company's logo. Buttons placed between its tags appear on the right.
// Used on the job board, company page, Company tab and map list — edit here to change them all.

import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CompanyService } from '../core/company.service';
import { Avatar } from './avatar';

import { jobFacts, postedAgo } from '../data/job-format';
import { Job } from '../data/jobs';

/** One row in a job list: company, title, key facts and skills. Content projected in goes on the right. */
@Component({
  selector: 'app-job-card',
  imports: [RouterLink, Avatar],
  templateUrl: './job-card.html',
  styleUrl: './job-card.scss',
})
export class JobCard {
  /** The job to show. */
  readonly job = input.required<Job>();
  /** e.g. "3.2 mi", shown when the list is measured from a place. */
  readonly distance = input<string | null>(null);

  /** Company logos, shared and cached across every job card. */
  private readonly companies = inject(CompanyService);
  /** This job's company logo (the same one as on the company page), or null for the letter. */
  protected readonly logoUrl = computed(() => this.companies.logos()[this.job().companyId] ?? null);

  constructor() {
    // Load this job's company logo once (cached for every other card from the same company).
    effect(() => void this.companies.loadLogos([this.job().companyId]));
  }

  /** The short fact line under the title (location, role, type, salary…). */
  protected facts() {
    return jobFacts(this.job());
  }

  /** "2d ago" for when the job was posted. */
  protected ago() {
    return postedAgo(this.job().postedAt);
  }
}
