import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { jobFacts, postedAgo } from '../data/job-format';
import { Job } from '../data/jobs';

/** One row in a job list: company, title, key facts and skills. Content projected in goes on the right. */
@Component({
  selector: 'app-job-card',
  imports: [RouterLink],
  template: `
    <div class="mark">{{ job().company[0] }}</div>
    <div class="info">
      <div class="company">
        <a [routerLink]="['/company', job().companyId]"><strong>{{ job().company }}</strong></a>
        <span class="muted small">· {{ ago() }}</span>
        @if (distance()) { <span class="distance">{{ distance() }}</span> }
      </div>
      <h3><a [routerLink]="['/jobs', job().id]">{{ job().title }}</a></h3>
      <div class="meta">
        @for (fact of facts(); track fact) { <span>{{ fact }}</span> }
      </div>
      @if (job().skills.length) {
        <div class="tags">
          @for (s of job().skills; track s) { <span class="tag">{{ s }}</span> }
        </div>
      }
    </div>
    <div class="side"><ng-content /></div>
  `,
  styles: `
    :host { display: flex; align-items: center; gap: 16px; padding: 20px; }
    .mark {
      display: flex; flex-shrink: 0; align-items: center; justify-content: center;
      width: 48px; height: 48px; background: var(--surface);
      font-family: var(--font-display); font-size: 1.25rem; font-weight: 700;
    }
    .info { flex: 1; min-width: 0; }
    .company { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 0.875rem; }
    a { color: var(--text); text-decoration: none; &:hover { text-decoration: underline; } }
    h3 { margin: 4px 0 0; font-family: var(--font-display); font-size: 1.125rem; }
    .distance { padding: 1px 6px; background: var(--accent-soft); color: var(--accent-soft-text); font-size: 0.75rem; font-weight: 600; }
    .meta { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 4px; color: var(--muted); font-size: 0.875rem; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .tag { padding: 2px 8px; background: var(--surface); font-size: 0.75rem; }
    .side { display: flex; align-items: center; gap: 16px; }
    @media (max-width: 640px) {
      :host { flex-direction: column; align-items: flex-start; }
    }
  `,
})
export class JobCard {
  readonly job = input.required<Job>();
  /** e.g. "3.2 mi", shown when the list is measured from a place. */
  readonly distance = input<string | null>(null);

  protected facts() {
    return jobFacts(this.job());
  }

  protected ago() {
    return postedAgo(this.job().postedAt);
  }
}
