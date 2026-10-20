// Public profile (/profile/:id): another user's picture, username, roles, occupation, bio,
// company and resume, with Message and Report buttons. Private profiles show only to their owner.

import { Component, computed, inject, input, resource } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { CompanyService } from '../../core/company.service';
import { ProfileService } from '../../core/profile.service';
import { Avatar } from '../../shared/avatar';
import { ReportButton } from '../../shared/report-button';

/** Public profile (/profile/:id): picture, username, roles, occupation, bio, company and resume, with Message / Report. */
@Component({
  selector: 'app-public-profile',
  imports: [RouterLink, Avatar, ReportButton],
  templateUrl: './public-profile.html',
})
export class PublicProfile {
  /** User ID from the address (/profile/:id). */
  readonly id = input.required<string>();

  // Shared services this page uses (inject borrows the one app-wide copy).
  protected readonly auth = inject(AuthService);
  protected readonly profiles = inject(ProfileService);
  private readonly companies = inject(CompanyService);

  /** The profile and its company, reloaded when the address changes. */
  protected readonly data = resource({
    params: () => this.id(),
    loader: async ({ params }) => {
      const profile = await this.profiles.get(params);
      const company = profile?.companyId ? await this.companies.get(profile.companyId) : null;
      return { profile, company };
    },
  });

  /** True when the signed-in user is looking at their own profile. */
  protected readonly isMe = computed(() => this.auth.user()?.$id === this.id());

  /** "Looking for work · Hiring" from the roles. */
  protected rolesText(roles: string[]): string {
    return roles.map((r) => (r === 'seeker' ? 'Looking for work' : 'Hiring')).join(' · ');
  }
}
