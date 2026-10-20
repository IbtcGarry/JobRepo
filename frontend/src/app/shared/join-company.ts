// <app-join-company>: shown on the account Company tab when the user has no company —
// invitations waiting for them (Accept / Decline) and a form to create a new company.

import { Component, inject, output, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService, errorMessage } from '../core/auth.service';
import { CompanyService } from '../core/company.service';
import { Invite, InviteService } from '../core/invite.service';
import { ProfileService } from '../core/profile.service';

/** <app-join-company>: invitations waiting for the user, and a form to create a new company. */
@Component({
  selector: 'app-join-company',
  imports: [FormsModule],
  templateUrl: './join-company.html',
})
export class JoinCompany {
  /** Fired after the user joins or creates a company, so the page can reload. */
  readonly joined = output<void>();

  // Shared services this component uses.
  private readonly auth = inject(AuthService);
  private readonly profiles = inject(ProfileService);
  private readonly companies = inject(CompanyService);
  private readonly invites = inject(InviteService);
  private readonly router = inject(Router);

  /** Invitations sent to this user's username. */
  protected readonly myInvites = resource({ loader: () => this.invites.listMine(this.auth.user()!.name) });
  /** Name typed for a new company. */
  protected companyName = '';
  /** True while working. */
  protected readonly busy = signal(false);
  /** Error from the last action. */
  protected readonly error = signal('');

  /** Accept: join that company with the invited role. */
  async accept(invite: Invite) {
    await this.run(async () => {
      await this.invites.accept(invite, this.auth.user()!.$id);
      this.joined.emit();
    });
  }

  /** Decline the invitation. */
  async decline(invite: Invite) {
    await this.run(async () => {
      await this.invites.decline(invite);
      this.myInvites.reload();
    });
  }

  /** Create company button: create it with this user as owner, then open its edit page. */
  async create() {
    await this.run(async () => {
      const userId = this.auth.user()!.$id;
      const id = await this.companies.create(this.companyName);
      const roles = this.profiles.me()?.roles ?? [];
      await this.profiles.save(userId, { companyId: id, companyRole: 'owner', roles: roles.includes('employer') ? roles : [...roles, 'employer'] });
      await this.profiles.refreshMe();
      await this.router.navigate(['/company', id, 'edit']);
    });
  }

  /** Shared wrapper: mark busy, run, show any error. */
  private async run(task: () => Promise<void>) {
    this.busy.set(true);
    this.error.set('');
    try {
      await task();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
