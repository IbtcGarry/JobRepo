import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormArray, FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { errorMessage } from '../../core/auth.service';
import { CompanyService, LOGO_EXTENSIONS, LOGO_MAX_BYTES } from '../../core/company.service';
import { Avatar } from '../../shared/avatar';

@Component({
  selector: 'app-company-edit',
  imports: [ReactiveFormsModule, RouterLink, Avatar],
  template: `
    <section class="page profile">
      @if (loading()) {
        <p class="muted">Loading…</p>
      } @else if (notFound()) {
        <h1>Company not found</h1>
      } @else {
        <div class="identity">
          <app-avatar [name]="form.controls.name.value" [url]="companies.logoUrl(logoFileId())" size="large" />
          <div>
            <h1>Edit company page</h1>
            <label class="btn btn-outline btn-sm" [class.disabled]="logoBusy()">
              {{ logoBusy() ? 'Uploading…' : logoFileId() ? 'Change logo' : 'Add logo' }}
              <input #logo type="file" [accept]="accept" hidden [disabled]="logoBusy()" (change)="uploadLogo(logo)" />
            </label>
          </div>
        </div>

        @if (error()) { <p class="error">{{ error() }}</p> }
        @if (message()) { <p class="success">{{ message() }}</p> }

        <form [formGroup]="form" (ngSubmit)="save()">
          <label>Company name <input formControlName="name" maxlength="120" /></label>

          <label>
            Bio
            <textarea formControlName="bio" rows="8" maxlength="5000" placeholder="What does the company do, and what's it like to work there?"></textarea>
            <span class="small muted">{{ form.controls.bio.value.length }} / 5000</span>
          </label>

          <fieldset class="locations-edit">
            <legend>Locations</legend>
            @for (control of form.controls.locations.controls; track control; let i = $index) {
              <div class="row">
                <input [formControl]="control" placeholder="City, country" maxlength="120" />
                <button type="button" class="link" (click)="removeLocation(i)">Remove</button>
              </div>
            }
            <div>
              <button type="button" class="btn btn-outline btn-sm" (click)="addLocation()">+ Add location</button>
            </div>
          </fieldset>

          <div class="resume-actions">
            <button class="btn" type="submit" [disabled]="form.invalid || form.pristine || saving()">
              {{ saving() ? 'Saving…' : 'Save company page' }}
            </button>
            <a [routerLink]="['/company', id()]">View page</a>
          </div>
        </form>
      }
    </section>
  `,
})
export class CompanyEdit implements OnInit {
  readonly id = input.required<string>();

  protected readonly companies = inject(CompanyService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    bio: ['', Validators.maxLength(5000)],
    locations: this.fb.array<FormControl<string>>([]),
  });
  protected readonly accept = LOGO_EXTENSIONS.map((ext) => '.' + ext).join(',');

  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly saving = signal(false);
  protected readonly logoBusy = signal(false);
  protected readonly logoFileId = signal<string | null>(null);
  protected readonly message = signal('');
  protected readonly error = signal('');

  async ngOnInit() {
    try {
      const company = await this.companies.get(this.id());
      if (!company) {
        this.notFound.set(true);
        return;
      }
      this.form.patchValue({ name: company.name, bio: company.bio });
      company.locations.forEach((l) => this.addLocation(l));
      this.form.markAsPristine();
      this.logoFileId.set(company.logoFileId);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected addLocation(value = '') {
    (this.form.controls.locations as FormArray<FormControl<string>>).push(this.fb.control(value));
    this.form.markAsDirty();
  }

  protected removeLocation(index: number) {
    this.form.controls.locations.removeAt(index);
    this.form.markAsDirty();
  }

  async save() {
    this.saving.set(true);
    this.message.set('');
    this.error.set('');
    try {
      const { name, bio, locations } = this.form.getRawValue();
      await this.companies.update(this.id(), {
        name: name.trim(),
        bio,
        locations: locations.map((l) => l.trim()).filter(Boolean),
      });
      await this.router.navigate(['/company', this.id()]);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }

  async uploadLogo(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!LOGO_EXTENSIONS.includes(ext)) return this.error.set('Logo must be a JPG, PNG, WebP or GIF image.');
    if (file.size > LOGO_MAX_BYTES) return this.error.set('Logo must be 5 MB or smaller.');

    this.logoBusy.set(true);
    this.message.set('');
    this.error.set('');
    try {
      this.logoFileId.set(await this.companies.replaceLogo(this.id(), file, this.logoFileId()));
      this.message.set('Logo updated.');
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.logoBusy.set(false);
    }
  }
}
