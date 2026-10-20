// Post a job (/company/:id/jobs/new) or edit one (/company/:id/jobs/:jobId/edit) — one
// page does both. Required: title, role, salary, a real street address and a description.
// The address is checked with core/geocode.ts; screening questions use shared/question-editor.ts.
// Template: job-form.html.

import { Component, OnInit, inject, input, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService, errorMessage } from '../../core/auth.service';
import { Company, CompanyService } from '../../core/company.service';
import { VerifiedAddress, googleMapsUrl, verifyAddress } from '../../core/geocode';
import { JobService, NewJob } from '../../core/job.service';
import { hasEquity, salaryRange } from '../../data/job-format';
import { COMPANY_SIZES, JOB_TYPES, JobRole, JobStatus, LEVELS, ROLES, WORKPLACES } from '../../data/jobs';
import { ScreeningQuestion, cleanQuestions, questionProblems } from '../../data/screening';
import { QuestionEditor } from '../../shared/question-editor';

/** "Salary to" can't be below "Salary from". */
function salaryOrder(group: AbstractControl): ValidationErrors | null {
  const { salaryMin, salaryMax } = group.getRawValue();
  return salaryMin && salaryMax && salaryMax < salaryMin ? { salaryOrder: true } : null;
}

/** Turn "Python, SQL, python" into a unique list of up to 20 skills. */
function splitSkills(value: string): string[] {
  return [...new Set(value.split(',').map((s) => s.trim()).filter(Boolean))].slice(0, 20);
}

/** Post a new job (`/company/:id/jobs/new`) or edit one (`/company/:id/jobs/:jobId/edit`). */
@Component({
  selector: 'app-job-form',
  imports: [ReactiveFormsModule, RouterLink, QuestionEditor],
  templateUrl: './job-form.html',
})
export class JobForm implements OnInit {
  /** Company row ID from the address. */
  readonly id = input.required<string>();
  /** Job ID when editing (/company/:id/jobs/:jobId/edit); empty when posting a new job. */
  readonly jobId = input<string>();

  // Shared services this page uses (inject borrows the one app-wide copy).
  private readonly auth = inject(AuthService);
  private readonly companies = inject(CompanyService);
  private readonly jobs = inject(JobService);
  private readonly router = inject(Router);

  // Option lists for the dropdowns, and the Google Maps link helper.
  protected readonly roles = ROLES;
  protected readonly workplaces = WORKPLACES;
  protected readonly types = JOB_TYPES;
  protected readonly levels = LEVELS;
  protected readonly sizes = COMPANY_SIZES;
  protected readonly mapsUrl = googleMapsUrl;

  /** The job form. Required: title, role, salary from, address, description; the rest are optional filter details. */
  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      title: ['', [Validators.required, Validators.maxLength(120)]],
      role: ['', Validators.required],
      salaryMin: [null as number | null, [Validators.required, Validators.min(1)]],
      salaryMax: [null as number | null, Validators.min(1)],
      address: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', [Validators.required, Validators.maxLength(10000)]],
      workplace: [''],
      type: [''],
      level: [''],
      companySize: [''],
      equity: ['', Validators.maxLength(40)],
      visaSponsorship: [false],
      skills: [''],
      /** Optional closing date (yyyy-mm-dd); the job closes automatically after it. */
      expiresOn: [''],
    },
    { validators: salaryOrder },
  );

  // Page state: the company, loading / not found, busy flags, and messages.
  protected readonly company = signal<Company | null>(null);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal('');
  /** Screening questions being edited (the question editor changes these). */
  protected readonly questions = signal<ScreeningQuestion[]>([]);
  /** Problems with the questions, shown under the editor after Save. */
  protected readonly questionErrors = signal<string[]>([]);
  /** When editing, the job's current status (a draft gets a Publish button). */
  protected readonly editingStatus = signal<JobStatus | null>(null);
  /** The job being previewed, or null while editing the form. */
  protected readonly preview = signal<NewJob | null>(null);
  /** Fact line and salary helpers for the preview. */
  protected readonly salaryRange = salaryRange;

  /** Result of the last address check; cleared whenever the address changes. */
  protected readonly verified = signal<VerifiedAddress | null>(null);
  /** True while the address is being checked. */
  protected readonly checking = signal(false);
  /** Why the address couldn't be found, shown under the box. */
  protected readonly addressError = signal('');

  /** On open: load the company and, when editing, fill the form with the job. */
  async ngOnInit() {
    this.form.controls.address.valueChanges.subscribe(() => {
      this.verified.set(null);
      this.addressError.set('');
    });

    try {
      this.company.set(await this.companies.get(this.id()));
      const jobId = this.jobId();
      if (jobId) {
        const job = await this.jobs.get(jobId);
        if (!job || job.companyId !== this.id()) {
          this.notFound.set(true);
          return;
        }
        this.form.setValue({
          title: job.title,
          role: job.role,
          salaryMin: job.salaryMin ? job.salaryMin / 1000 : null,
          salaryMax: job.salaryMax ? job.salaryMax / 1000 : null,
          address: job.address,
          description: job.description,
          workplace: job.workplace ?? '',
          type: job.type ?? '',
          level: job.level ?? '',
          companySize: job.companySize ?? '',
          equity: job.equity ?? '',
          visaSponsorship: job.visaSponsorship,
          skills: job.skills.join(', '),
          expiresOn: job.expiresAt ? job.expiresAt.slice(0, 10) : '',
        });
        this.editingStatus.set(job.status);
        this.questions.set(job.questions);
        if (job.lat !== null && job.lng !== null) {
          this.verified.set({ address: job.address, location: job.location, lat: job.lat, lng: job.lng });
        }
      }
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  /** True when a field should show its red error (after it was touched or Save was pressed). */
  protected invalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  /** Look the address up; returns the verified result or null (with addressError set). */
  async checkAddress(): Promise<VerifiedAddress | null> {
    if (this.verified()) return this.verified();
    this.checking.set(true);
    this.addressError.set('');
    try {
      const result = await verifyAddress(this.form.controls.address.value);
      this.verified.set(result);
      return result;
    } catch (err) {
      this.addressError.set(err instanceof Error ? err.message : 'Couldn’t check the address.');
      return null;
    } finally {
      this.checking.set(false);
    }
  }

  /** Post job / Save changes: check the form, questions and address, then create or update the job and open its page. */
  /**
   * Check everything and turn the form into a job, or return null (with errors shown).
   * Steps: 1) mark fields touched so errors appear, 2) check fields and questions,
   * 3) look the address up, 4) build the job from the form values.
   */
  private async buildJob(): Promise<NewJob | null> {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    const company = this.company();
    this.questionErrors.set(questionProblems(this.questions()));
    if (this.form.invalid || this.questionErrors().length || !company) return null;

    const place = await this.checkAddress();
    if (!place) return null;

    const v = this.form.getRawValue();
    // Salary fields are entered in thousands of dollars.
    const salary = (k: number | null) => (k ? Math.round(k * 1000) : null);
    return {
      companyId: company.id,
      company: company.name,
      title: v.title.trim(),
      role: v.role as JobRole,
      location: place.location,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      description: v.description.trim(),
      workplace: (v.workplace || null) as NewJob['workplace'],
      type: (v.type || null) as NewJob['type'],
      level: (v.level || null) as NewJob['level'],
      companySize: (v.companySize || null) as NewJob['companySize'],
      salaryMin: salary(v.salaryMin),
      salaryMax: salary(v.salaryMax),
      equity: hasEquity({ equity: v.equity }) ? v.equity.trim() : null,
      visaSponsorship: v.visaSponsorship,
      skills: splitSkills(v.skills),
      questions: cleanQuestions(this.questions()),
      // End of the chosen day, so a job "closing on the 30th" stays open all of the 30th.
      expiresAt: v.expiresOn ? new Date(`${v.expiresOn}T23:59:59`).toISOString() : null,
    };
  }

  /** Preview button: show the job as applicants will see it, without saving. */
  async showPreview() {
    this.error.set('');
    const job = await this.buildJob();
    if (job) this.preview.set(job);
  }

  /** "Back to editing" on the preview. */
  protected closePreview() {
    this.preview.set(null);
  }

  /**
   * Post job / Save changes / Save as draft / Publish.
   * New job: creates it as open ('post') or draft ('draft'). Editing: saves the changes and,
   * for 'post', also publishes a draft.
   */
  async submit(mode: 'post' | 'draft' = 'post') {
    this.saving.set(true);
    this.error.set('');
    try {
      const job = await this.buildJob();
      if (!job) return;
      const user = this.auth.user()!;
      const jobId = this.jobId();
      if (jobId) {
        await this.jobs.update(jobId, job);
        if (mode === 'post' && this.editingStatus() === 'draft') await this.jobs.setStatus(jobId, 'open');
        await this.router.navigate(['/jobs', jobId]);
      } else {
        const id = await this.jobs.create(job, { id: user.$id, name: user.name }, mode === 'draft' ? 'draft' : 'open');
        await this.router.navigate(mode === 'draft' ? ['/company', job.companyId, 'admin'] : ['/jobs', id]);
      }
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }

}
