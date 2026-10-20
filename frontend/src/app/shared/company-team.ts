// <app-company-team>: for a company's owner — everyone who works there, an "Invite by
// username" form (manager or member), and invites still waiting for an answer.

import { Component, inject, input, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService, errorMessage } from '../core/auth.service';
import { Company } from '../core/company.service';
import { Invite, InviteService } from '../core/invite.service';
import { ProfileService } from '../core/profile.service';

/** <app-company-team>: a company's members, the invite-by-username form, and pending invites (owners only). */
@Component({
  selector: 'app-company-team',
  imports: [FormsModule, RouterLink],
  templateUrl: './company-team.html',
})
export class CompanyTeam {
  /** The owner's company. */
  readonly company = input.required<Company>();

  // Shared services this component uses.
  private readonly auth = inject(AuthService);
  private readonly profiles = inject(ProfileService);
  private readonly invites = inject(InviteService);

  /** Members and the company's invites, reloaded after each change. */
  protected readonly team = resource({
    params: () => this.company().id,
    loader: async ({ params }) => ({
      members: await this.profiles.listForCompany(params),
      invites: (await this.invites.listForCompany(params)).filter((i) => i.status === 'pending'),
    }),
  });
  // Invite form fields.
  protected username = '';
  protected role: Invite['role'] = 'manager';
  /** True while sending an invite. */
  protected readonly busy = signal(false);
  /** Result of the last action. */
  protected readonly message = signal<{ ok: boolean; text: string } | null>(null);

  /** Role names for the members list. */
  protected roleText(role: string | null): string {
    return { owner: 'Owner', manager: 'Manager', member: 'Member' }[role ?? 'member'] ?? 'Member';
  }

  /** Invite button: invite the typed username with the chosen role. */
  async invite() {
    this.busy.set(true);
    this.message.set(null);
    try {
      await this.invites.invite(this.company(), this.username, this.role, this.auth.user()!.name);
      this.message.set({ ok: true, text: `Invited ${this.username.trim().toLowerCase()}.` });
      this.username = '';
      this.team.reload();
    } catch (err) {
      this.message.set({ ok: false, text: err instanceof Error ? err.message : errorMessage(err) });
    } finally {
      this.busy.set(false);
    }
  }

  /** Cancel a pending invite. */
  async cancel(invite: Invite) {
    await this.invites.cancel(invite.id);
    this.team.reload();
  }
}
