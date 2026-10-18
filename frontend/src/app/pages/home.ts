import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { JobRole, ROLES, SAMPLE_JOBS } from '../data/sample-jobs';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly auth = inject(AuthService);

  protected readonly roles = ROLES;
  protected readonly query = signal('');
  protected readonly remoteOnly = signal(false);
  protected readonly role = signal<JobRole | null>(null);

  protected readonly jobs = computed(() => {
    const q = this.query().trim().toLowerCase();
    const role = this.role();
    return SAMPLE_JOBS.filter(
      (job) =>
        (!role || job.role === role) &&
        (!this.remoteOnly() || job.remote) &&
        (!q || [job.title, job.company, job.tagline, job.location].some((f) => f.toLowerCase().includes(q))),
    );
  });
}
