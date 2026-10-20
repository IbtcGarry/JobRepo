// Edit a company page (/company/:id/edit): name, bio, locations and logo.

import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormArray, FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { errorMessage } from '../../core/auth.service';
import { CompanyService, LOGO_EXTENSIONS, LOGO_MAX_BYTES } from '../../core/company.service';
import { Avatar } from '../../shared/avatar';

/** Edit company page (/company/:id/edit): name, bio, locations and logo. */
@Component({
  selector: 'app-company-edit',
  imports: [ReactiveFormsModule, RouterLink, Avatar],
  templateUrl: './company-edit.html',
})
export class CompanyEdit implements OnInit {
  /** Company row ID from the address (/company/:id/edit). */
  readonly id = input.required<string>();

  // Shared services this page uses (inject borrows the one app-wide copy).
  protected readonly companies = inject(CompanyService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  /** Name (required), bio, and a growable list of locations. */
  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    bio: ['', Validators.maxLength(5000)],
    locations: this.fb.array<FormControl<string>>([]),
  });
  /** Image types the logo picker accepts. */
  protected readonly accept = LOGO_EXTENSIONS.map((ext) => '.' + ext).join(',');

  // Page state: loading / not found, busy flags, the current logo, and messages.
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly saving = signal(false);
  protected readonly logoBusy = signal(false);
  protected readonly logoFileId = signal<string | null>(null);
  protected readonly message = signal('');
  /** Error message from the last failed action. */
  protected readonly error = signal('');

  /** On open: load the company into the form. */
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

  /** + Add location: add a location box (optionally pre-filled). */
  protected addLocation(value = '') {
    (this.form.controls.locations as FormArray<FormControl<string>>).push(this.fb.control(value));
    this.form.markAsDirty();
  }

  /** Remove one location box. */
  protected removeLocation(index: number) {
    this.form.controls.locations.removeAt(index);
    this.form.markAsDirty();
  }

  /** Save company page: save name, bio and non-blank locations, then show the page. */
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

  /** Add / Change logo: check type and size (5 MB), then upload and replace the old logo. */
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
