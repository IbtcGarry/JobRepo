import { Component, OnInit, inject, input, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService, errorMessage } from '../../core/auth.service';
import { Company, CompanyService } from '../../core/company.service';
import { VerifiedAddress, googleMapsUrl, verifyAddress } from '../../core/geocode';
import { JobService, NewJob } from '../../core/job.service';
import { COMPANY_SIZES, JOB_TYPES, JobRole, LEVELS, ROLES, WORKPLACES } from '../../data/jobs';
import { ScreeningQuestion, cleanQuestions, questionProblems } from '../../data/screening';
import { QuestionEditor } from '../../shared/question-editor';

/** "Salary to" can't be below "Salary from". */
function salaryOrder(group: AbstractControl): ValidationErrors | null {
  const { salaryMin, salaryMax } = group.getRawValue();
  return salaryMin && salaryMax && salaryMax < salaryMin ? { salaryOrder: true } : null;
}

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
  readonly id = input.required<string>();
  readonly jobId = input<string>();

  private readonly auth = inject(AuthService);
  private readonly companies = inject(CompanyService);
  private readonly jobs = inject(JobService);
  private readonly router = inject(Router);

  protected readonly roles = ROLES;
  protected readonly workplaces = WORKPLACES;
  protected readonly types = JOB_TYPES;
  protected readonly levels = LEVELS;
  protected readonly sizes = COMPANY_SIZES;
  protected readonly mapsUrl = googleMapsUrl;

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
    },
    { validators: salaryOrder },
  );

  protected readonly company = signal<Company | null>(null);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal('');
  protected readonly questions = signal<ScreeningQuestion[]>([]);
  protected readonly questionErrors = signal<string[]>([]);

  /** Result of the last address check; cleared whenever the address changes. */
  protected readonly verified = signal<VerifiedAddress | null>(null);
  protected readonly checking = signal(false);
  protected readonly addressError = signal('');

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
        });
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

  async submit() {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    const company = this.company();
    this.questionErrors.set(questionProblems(this.questions()));
    if (this.form.invalid || this.questionErrors().length || !company) return;

    this.saving.set(true);
    this.error.set('');
    try {
      const place = await this.checkAddress();
      if (!place) return;

      const v = this.form.getRawValue();
      // Salary fields are entered in thousands of dollars.
      const salary = (k: number | null) => (k ? Math.round(k * 1000) : null);
      const job: NewJob = {
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
        equity: v.equity.trim() || null,
        visaSponsorship: v.visaSponsorship,
        skills: splitSkills(v.skills),
        questions: cleanQuestions(this.questions()),
      };

      const jobId = this.jobId();
      if (jobId) {
        await this.jobs.update(jobId, job);
        await this.router.navigate(['/jobs', jobId]);
      } else {
        await this.router.navigate(['/jobs', await this.jobs.create(job, { id: this.auth.user()!.$id, name: this.auth.user()!.name })]);
      }
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }
}
