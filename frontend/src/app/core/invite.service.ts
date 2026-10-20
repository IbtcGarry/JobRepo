// Company invites: an owner invites a user by username to join their company as a manager
// or member; the invited user accepts or declines from their account. Table `invites`.
// (Appwrite Teams needs real email invitations, which JobTest doesn't have, so invites are rows.)

import { Injectable, inject } from '@angular/core';
import { ID, Models, Query } from 'appwrite';

import { DATABASE_ID, INVITES_TABLE_ID, tablesDB } from './appwrite';
import { CompanyRole, ProfileService } from './profile.service';

/** An invitation for a username to join a company as manager or member. */
export interface Invite {
  id: string;
  companyId: string;
  companyName: string;
  username: string;
  role: Exclude<CompanyRole, 'owner'>;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'declined';
}

type InviteRow = Models.Row & Omit<Invite, 'id'>;

/** Company invites by username: send, list, accept, decline and cancel. */
@Injectable({ providedIn: 'root' })
export class InviteService {
  /** Profile lookups (find the invited user, join the company on accept). */
  private readonly profiles = inject(ProfileService);

  /** Invite a username to a company; throws a friendly error when the username doesn't exist. */
  async invite(company: { id: string; name: string }, username: string, role: Invite['role'], invitedBy: string): Promise<void> {
    const name = username.trim().toLowerCase();
    const person = await this.profiles.findByUsername(name);
    if (!person) throw new Error(`No user called "${name}".`);
    if (person.companyId === company.id) throw new Error(`${name} already works at ${company.name}.`);
    await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: INVITES_TABLE_ID,
      rowId: ID.unique(),
      data: { companyId: company.id, companyName: company.name, username: name, role, invitedBy, status: 'pending' },
    });
  }

  /** Pending invites sent to a username. */
  async listMine(username: string): Promise<Invite[]> {
    return this.query([Query.equal('username', username.toLowerCase()), Query.equal('status', 'pending')]);
  }

  /** Every invite a company has sent (any status), newest first. */
  async listForCompany(companyId: string): Promise<Invite[]> {
    return this.query([Query.equal('companyId', companyId), Query.orderDesc('$createdAt')]);
  }

  /** Accept: join the company with the invited role. */
  async accept(invite: Invite, userId: string): Promise<void> {
    await this.profiles.save(userId, { companyId: invite.companyId, companyRole: invite.role });
    await this.setStatus(invite.id, 'accepted');
  }

  /** Decline the invite. */
  async decline(invite: Invite): Promise<void> {
    await this.setStatus(invite.id, 'declined');
  }

  /** Withdraw an invite (owner side). */
  async cancel(inviteId: string): Promise<void> {
    await tablesDB.deleteRow({ databaseId: DATABASE_ID, tableId: INVITES_TABLE_ID, rowId: inviteId });
  }

  /** Change an invite's status. */
  private async setStatus(id: string, status: Invite['status']): Promise<void> {
    await tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: INVITES_TABLE_ID, rowId: id, data: { status } });
  }

  /** Run an invites query and convert the rows. */
  private async query(queries: string[]): Promise<Invite[]> {
    const { rows } = await tablesDB.listRows<InviteRow>({ databaseId: DATABASE_ID, tableId: INVITES_TABLE_ID, queries: [...queries, Query.limit(100)] });
    return rows.map((r) => ({ ...r, id: r.$id, status: r.status ?? 'pending' }));
  }
}
