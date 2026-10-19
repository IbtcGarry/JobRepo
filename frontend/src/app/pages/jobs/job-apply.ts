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
  template: `
    <section class="page profile">
      @if (data.isLoading()) {
        <p class="muted">Loading…</p>
      } @else if (!data.value()?.job) {
        <h1>Job not found</h1>
      } @else if (data.value()!.job!.status === 'closed') {
        <h1>This job is closed</h1>
        <p class="muted">{{ data.value()!.job!.company }} is no longer taking applications for {{ data.value()!.job!.title }}.</p>
        <a [routerLink]="['/jobs', id()]">Back to the job</a>
      } @else if (data.value()!.existing) {
        <h1>You already applied</h1>
        <p class="muted">You applied to {{ data.value()!.job!.title }} at {{ data.value()!.job!.company }}.</p>
        <a [routerLink]="['/jobs', id()]">Back to the job</a>
      } @else {
        @let job = data.value()!.job!;
        @let profile = data.value()!.profile;
        <p class="muted small"><a [routerLink]="['/jobs', job.id]">{{ job.title }}</a> · {{ job.company }}</p>
        <h1>Apply</h1>
        <p class="muted">The employer will see your profile, your resume and the note below.</p>

        <div class="company-card">
          <app-avatar [name]="auth.user()!.name" [url]="profiles.avatarUrl()" size="medium" />
          <div>
            <strong>{{ auth.user()!.name }}</strong>
            @if (profile?.occupation) { <span class="muted"> · {{ profile!.occupation }}</span> }
            <p class="small">
              @if (profile?.resumeFileId) {
                Resume: {{ profile!.resumeName }}
              } @else {
                <span class="error">No resume yet.</span>&nbsp;<a routerLink="/account">Add one on your account page</a> (optional).
              }
            </p>
          </div>
        </div>

        @if (error()) { <p class="error">{{ error() }}</p> }

        <form (ngSubmit)="submit()" novalidate>
          @if (job.questions.length) {
            <h2>Questions from {{ job.company }}</h2>
            @for (q of job.questions; track q.id; let i = $index) {
              <fieldset class="answer" [class.missing]="missing().includes(q.id)">
                <legend>{{ i + 1 }}. {{ q.text }} @if (q.required) { <span class="error">*</span> }</legend>
                @switch (q.type) {
                  @case ('yesno') {
                    <div class="choices">
                      @for (o of ['Yes', 'No']; track o) {
                        <label class="check">
                          <input type="radio" [name]="q.id" [value]="o" [checked]="answers()[q.id] === o" (change)="answer(q.id, o)" /> {{ o }}
                        </label>
                      }
                    </div>
                  }
                  @case ('choice') {
                    <div class="choices">
                      @for (o of q.options; track o) {
                        <label class="check">
                          <input type="radio" [name]="q.id" [value]="o" [checked]="answers()[q.id] === o" (change)="answer(q.id, o)" /> {{ o }}
                        </label>
                      }
                    </div>
                  }
                  @case ('number') {
                    <input type="number" min="0" step="any" [value]="answers()[q.id] ?? ''" (input)="answer(q.id, $any($event.target).value)" />
                  }
                  @default {
                    <input type="text" maxlength="500" [value]="answers()[q.id] ?? ''" (input)="answer(q.id, $any($event.target).value)" />
                  }
                }
                @if (missing().includes(q.id)) { <span class="error small">Please answer this question.</span> }
              </fieldset>
            }
          }

          <label>
            Note to the employer (optional)
            <textarea name="note" rows="6" maxlength="3000" [(ngModel)]="note" placeholder="Why you're a good fit."></textarea>
          </label>
          <div class="resume-actions">
            <button class="btn" type="submit" [disabled]="sending()">{{ sending() ? 'Sending…' : 'Send application' }}</button>
            <a [routerLink]="['/jobs', job.id]">Cancel</a>
          </div>
        </form>
      }
    </section>
  `,
})
export class JobApply {
  readonly id = input.required<string>();

  protected readonly auth = inject(AuthService);
  protected readonly profiles = inject(ProfileService);
  private readonly jobs = inject(JobService);
  private readonly applications = inject(ApplicationService);
  private readonly router = inject(Router);

  protected note = '';
  protected readonly answers = signal<Answers>({});
  /** Required questions still unanswered after a submit attempt. */
  protected readonly missing = signal<string[]>([]);
  protected readonly sending = signal(false);
  protected readonly error = signal('');

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

  protected answer(questionId: string, value: string) {
    this.answers.update((a) => ({ ...a, [questionId]: value }));
    this.missing.update((ids) => ids.filter((id) => id !== questionId));
  }

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
