// Apply page (/jobs/:id/apply): answer the job's screening questions, add a note, and send
// your profile + resume (core/application.service.ts).

import { Component, inject, input, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ApplicationService } from '../../core/application.service';
import { AuthService, errorMessage } from '../../core/auth.service';
import { JobService } from '../../core/job.service';
import { ProfileService } from '../../core/profile.service';
import { Answers, missingAnswers } from '../../data/screening';
import { Avatar } from '../../shared/avatar';

/** Apply to a job with your saved profile and resume (`/jobs/:id/apply`). */
@Component({
  selector: 'app-job-apply',
  imports: [FormsModule, RouterLink, Avatar],
  templateUrl: './job-apply.html',
})
export class JobApply {
  /** Job ID from the address (/jobs/:id/apply). */
  readonly id = input.required<string>();

  // Shared services this page uses (inject borrows the one app-wide copy).
  protected readonly auth = inject(AuthService);
  protected readonly profiles = inject(ProfileService);
  private readonly jobs = inject(JobService);
  private readonly applications = inject(ApplicationService);
  private readonly router = inject(Router);

  /** The optional note to the employer (bound to the text box). */
  protected note = '';
  /** Answers so far, by question ID. */
  protected readonly answers = signal<Answers>({});
  /** Required questions still unanswered after a submit attempt. */
  protected readonly missing = signal<string[]>([]);
  /** True while sending (disables the button). */
  protected readonly sending = signal(false);
  /** Message shown when sending fails or questions are unanswered. */
  protected readonly error = signal('');

  /** Loads the job, the user's profile, and any earlier application to this job. */
  protected readonly data = resource({
    params: () => this.id(),
    loader: async ({ params }) => {
      const userId = this.auth.user()!.$id;
      const [job, profile, existing] = await Promise.all([
        this.jobs.get(params),
        this.profiles.get(userId),
        this.applications.findMine(params, userId),
      ]);
      return { job, profile, existing };
    },
  });

  /** Record an answer and clear that question's "please answer" warning. */
  protected answer(questionId: string, value: string) {
    this.answers.update((a) => ({ ...a, [questionId]: value }));
    this.missing.update((ids) => ids.filter((id) => id !== questionId));
  }

  /** Send application: check required questions, then save the application with answers and resume. */
  async submit() {
    const { job, profile } = this.data.value()!;
    if (job!.status === 'closed') return;
    this.missing.set(missingAnswers(job!.questions, this.answers()));
    if (this.missing().length) {
      this.error.set('Please answer the required questions.');
      return;
    }
    const asked = new Set(job!.questions.map((q) => q.id));
    const answers = Object.fromEntries(
      Object.entries(this.answers())
        .map(([id, value]) => [id, (value ?? '').trim()] as const)
        .filter(([id, value]) => asked.has(id) && value),
    );
    this.sending.set(true);
    this.error.set('');
    try {
      await this.applications.apply(job!, this.auth.user()!, profile, this.note, answers);
      await this.router.navigate(['/jobs', job!.id]);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.sending.set(false);
    }
  }
}
