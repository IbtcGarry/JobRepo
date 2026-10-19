import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService, errorMessage } from '../core/auth.service';
import { Company, CompanyService } from '../core/company.service';
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

@Component({
  selector: 'app-account',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, Avatar, ManageJobs],
  templateUrl: './account.html',
})
export class Account implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly profiles = inject(ProfileService);
  protected readonly companies = inject(CompanyService);

  protected readonly tab = signal<'profile' | 'company'>(
    inject(ActivatedRoute).snapshot.queryParamMap.get('tab') === 'company' ? 'company' : 'profile',
  );
  protected readonly company = signal<Company | null>(null);
  protected readonly canEditCompany = signal(false);
  protected readonly roleLabel = signal('');

  protected readonly form = inject(NonNullableFormBuilder).group({
    occupation: ['', Validators.maxLength(120)],
    bio: ['', Validators.maxLength(2000)],
  });
  protected readonly accept = RESUME_EXTENSIONS.map((ext) => '.' + ext).join(',');
  protected readonly avatarAccept = AVATAR_EXTENSIONS.map((ext) => '.' + ext).join(',');

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly avatarBusy = signal(false);
  private avatarFileId: string | null = null;
  protected readonly message = signal('');
  protected readonly error = signal('');
  protected readonly resume = signal<Pick<Profile, 'resumeFileId' | 'resumeName'>>({ resumeFileId: null, resumeName: null });

  private get userId(): string {
    return this.auth.user()!.$id;
  }

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
        }
      }
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async save() {
    await this.run(this.saving, 'Saved.', () => this.profiles.save(this.userId, this.form.getRawValue()));
    this.form.markAsPristine();
  }

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

  async removeAvatar() {
    const fileId = this.avatarFileId;
    if (!fileId) return;
    await this.run(this.avatarBusy, 'Profile picture removed.', async () => {
      await this.profiles.removeAvatar(this.userId, fileId);
      this.avatarFileId = null;
    });
  }

  async removeResume() {
    const fileId = this.resume().resumeFileId;
    if (!fileId) return;
    await this.run(this.uploading, 'Resume removed.', async () => {
      await this.profiles.removeResume(this.userId, fileId);
      this.resume.set({ resumeFileId: null, resumeName: null });
    });
  }

  protected resumeUrl(fileId: string): string {
    return this.profiles.resumeUrl(fileId);
  }

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
