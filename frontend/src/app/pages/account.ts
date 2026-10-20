// Account page (/account) with two tabs:
// - Profile: occupation, bio, resume and profile picture (core/profile.service.ts),
// - Company: your company card, Admin / Edit buttons and the job listings (shared/manage-jobs.ts).
// Template: account.html. Open the Company tab directly with /account?tab=company.

import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService, errorMessage } from '../core/auth.service';
import { Company, CompanyService } from '../core/company.service';
import { CompanyTeam } from '../shared/company-team';
import { JoinCompany } from '../shared/join-company';
import { ManageJobs } from '../shared/manage-jobs';
import { Avatar } from '../shared/avatar';
import {
  AVATAR_EXTENSIONS,
  AVATAR_MAX_BYTES,
  Profile,
  ProfileService,
  canEditCompany,
  RESUME_EXTENSIONS,
  RESUME_MAX_BYTES,
} from '../core/profile.service';

/** Account page (/account): the Profile tab (occupation, bio, resume, picture) and the Company tab (company, team, job listings). */
@Component({
  selector: 'app-account',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, Avatar, ManageJobs, CompanyTeam, JoinCompany],
  templateUrl: './account.html',
})
export class Account implements OnInit {
  // Shared services this page uses (inject borrows the one app-wide copy).
  protected readonly auth = inject(AuthService);
  protected readonly profiles = inject(ProfileService);
  protected readonly companies = inject(CompanyService);

  /** Which tab is showing; /account?tab=company opens the Company tab. */
  protected readonly tab = signal<'profile' | 'company'>(
    inject(ActivatedRoute).snapshot.queryParamMap.get('tab') === 'company' ? 'company' : 'profile',
  );
  // Company tab: the user's company, whether they can edit it, and their role label.
  protected readonly company = signal<Company | null>(null);
  protected readonly canEditCompany = signal(false);
  protected readonly roleLabel = signal('');
  /** True for the company's owner (shows the Team section). */
  protected readonly isOwner = signal(false);

  /** Profile tab form: occupation (up to 120 characters) and bio (up to 2000). */
  protected readonly form = inject(NonNullableFormBuilder).group({
    occupation: ['', Validators.maxLength(120)],
    bio: ['', Validators.maxLength(2000)],
  });
  // File types the resume and picture pickers accept.
  protected readonly accept = RESUME_EXTENSIONS.map((ext) => '.' + ext).join(',');
  protected readonly avatarAccept = AVATAR_EXTENSIONS.map((ext) => '.' + ext).join(',');

  // Page state: loading, busy flags for each button, and the last success / error message.
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly avatarBusy = signal(false);
  /** Current profile picture file, so the old one can be deleted when it's replaced. */
  private avatarFileId: string | null = null;
  protected readonly message = signal('');
  protected readonly error = signal('');
  /** The current resume file (ID + name), or nulls when there is none. */
  protected readonly resume = signal<Pick<Profile, 'resumeFileId' | 'resumeName'>>({ resumeFileId: null, resumeName: null });

  /** The logged-in user's ID (this page is only reachable when logged in). */
  private get userId(): string {
    return this.auth.user()!.$id;
  }

  /** On open: load the profile into the form, the resume, picture, and the user's company. */
  async ngOnInit() {
    try {
      const profile = await this.profiles.get(this.userId);
      if (profile) {
        this.form.setValue({ occupation: profile.occupation, bio: profile.bio });
        this.resume.set({ resumeFileId: profile.resumeFileId, resumeName: profile.resumeName });
        this.avatarFileId = profile.avatarFileId;
        if (profile.companyId) {
          this.company.set(await this.companies.get(profile.companyId));
          this.canEditCompany.set(canEditCompany(profile, profile.companyId));
          this.roleLabel.set({ owner: 'Owner', manager: 'Manager', member: 'Works here' }[profile.companyRole ?? 'member']);
          this.isOwner.set(profile.companyRole === 'owner');
        }
      }
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  /** After joining or creating a company from the Company tab: reload the page's data. */
  async reloadCompany() {
    this.loading.set(true);
    await this.profiles.refreshMe();
    await this.ngOnInit();
  }

  /** Profile / Company tab buttons. */
  protected showTab(tab: 'profile' | 'company') {
    this.tab.set(tab);
  }

  /** Save profile button: save occupation and bio. */
  async save() {
    await this.run(this.saving, 'Saved.', () => this.profiles.save(this.userId, this.form.getRawValue()));
    this.form.markAsPristine();
  }

  /** Upload / Replace resume: check type (PDF, Word) and size (10 MB), then upload. */
  async upload(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!RESUME_EXTENSIONS.includes(ext)) {
      this.error.set('Resume must be a PDF or Word file.');
      return;
    }
    if (file.size > RESUME_MAX_BYTES) {
      this.error.set('Resume must be 10 MB or smaller.');
      return;
    }

    await this.run(this.uploading, 'Resume uploaded.', async () => {
      const fileId = await this.profiles.replaceResume(this.userId, file, this.resume().resumeFileId);
      this.resume.set({ resumeFileId: fileId, resumeName: file.name });
    });
  }

  /** Add / Change photo: check type (image) and size (5 MB), then upload. */
  async uploadAvatar(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!AVATAR_EXTENSIONS.includes(ext)) {
      this.error.set('Profile picture must be a JPG, PNG, WebP or GIF image.');
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      this.error.set('Profile picture must be 5 MB or smaller.');
      return;
    }

    await this.run(this.avatarBusy, 'Profile picture updated.', async () => {
      this.avatarFileId = await this.profiles.replaceAvatar(this.userId, file, this.avatarFileId);
    });
  }

  /** Remove the profile picture. */
  async removeAvatar() {
    const fileId = this.avatarFileId;
    if (!fileId) return;
    await this.run(this.avatarBusy, 'Profile picture removed.', async () => {
      await this.profiles.removeAvatar(this.userId, fileId);
      this.avatarFileId = null;
    });
  }

  /** Remove the resume. */
  async removeResume() {
    const fileId = this.resume().resumeFileId;
    if (!fileId) return;
    await this.run(this.uploading, 'Resume removed.', async () => {
      await this.profiles.removeResume(this.userId, fileId);
      this.resume.set({ resumeFileId: null, resumeName: null });
    });
  }

  /** Address that opens the resume. */
  protected resumeUrl(fileId: string): string {
    return this.profiles.resumeUrl(fileId);
  }

  /** Shared wrapper for every button: show busy, clear messages, run the task, show success or the error. */
  private async run(busy: ReturnType<typeof signal<boolean>>, done: string, task: () => Promise<void>) {
    busy.set(true);
    this.message.set('');
    this.error.set('');
    try {
      await task();
      this.message.set(done);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      busy.set(false);
    }
  }
}
