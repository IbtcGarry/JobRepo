// Onboarding (/onboarding): right after sign-up, the user picks what they're here for —
// finding a job, hiring, or both. Employers can create their company straight away or
// wait for an invite from an existing company (they'll see it on their account page).

import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService, errorMessage } from '../../core/auth.service';
import { CompanyService } from '../../core/company.service';
import { ProfileService, UserRole } from '../../core/profile.service';

/** Onboarding (/onboarding): pick looking for a job, hiring or both; employers can create their company. */
@Component({
  selector: 'app-onboarding',
  imports: [FormsModule, RouterLink],
  templateUrl: './onboarding.html',
})
export class Onboarding implements OnInit {
  // Shared services this page uses (inject borrows the one app-wide copy).
  protected readonly auth = inject(AuthService);
  private readonly profiles = inject(ProfileService);
  private readonly companies = inject(CompanyService);
  private readonly router = inject(Router);

  /** The roles ticked so far. */
  protected readonly roles = signal<UserRole[]>([]);
  /** Name typed for a new company (employers only). */
  protected companyName = '';
  /** True while saving. */
  protected readonly saving = signal(false);
  /** Error message from the last failed save. */
  protected readonly error = signal('');

  /** On open: start from the roles the user already has (when revisiting from Settings). */
  async ngOnInit() {
    this.roles.set((await this.profiles.get(this.auth.user()!.$id))?.roles ?? []);
  }

  /** True when a role is ticked. */
  protected has(role: UserRole): boolean {
    return this.roles().includes(role);
  }

  /** Tick or untick a role card. */
  protected toggle(role: UserRole) {
    this.roles.update((r) => (r.includes(role) ? r.filter((x) => x !== role) : [...r, role]));
  }

  /**
   * Continue button: save the roles; an employer who typed a company name gets that company
   * created with themselves as owner. Then go to the account page.
   */
  async finish() {
    if (!this.roles().length) return this.error.set('Pick at least one.');
    this.saving.set(true);
    this.error.set('');
    try {
      const userId = this.auth.user()!.$id;
      await this.profiles.save(userId, { roles: this.roles() });
      let companyId: string | null = null;
      if (this.has('employer') && this.companyName.trim()) {
        companyId = await this.companies.create(this.companyName);
        await this.profiles.save(userId, { companyId, companyRole: 'owner' });
      }
      await this.profiles.loadMe(userId);
      await this.router.navigate(companyId ? ['/company', companyId, 'edit'] : ['/account']);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : errorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }
}
