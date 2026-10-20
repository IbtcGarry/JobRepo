// Reports: any user can report a job, company or profile; site moderators (profiles.siteAdmin)
// review them at /admin and resolve them. Table `reports`.

import { Injectable } from '@angular/core';
import { ID, Models, Query } from 'appwrite';

import { DATABASE_ID, REPORTS_TABLE_ID, tablesDB } from './appwrite';

/** What kind of thing a report is about. */
export type ReportTarget = 'job' | 'company' | 'profile';

/** A user's report, as the moderation page shows it. */
export interface Report {
  id: string;
  targetType: ReportTarget;
  targetId: string;
  targetName: string;
  reason: string;
  reporterId: string;
  reporterName: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
}

type ReportRow = Models.Row & Omit<Report, 'id' | 'createdAt'>;

/** Reports about jobs, companies or profiles: file one, list them for moderators, resolve or dismiss. */
@Injectable({ providedIn: 'root' })
export class ReportService {
  /** File a report. */
  async report(target: { type: ReportTarget; id: string; name: string }, reason: string, reporter: { id: string; name: string }): Promise<void> {
    await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: REPORTS_TABLE_ID,
      rowId: ID.unique(),
      data: {
        targetType: target.type,
        targetId: target.id,
        targetName: target.name,
        reason: reason.trim(),
        reporterId: reporter.id,
        reporterName: reporter.name,
        status: 'open',
      },
    });
  }

  /** Reports for the moderation page: open ones, or everything. */
  async list(onlyOpen: boolean): Promise<Report[]> {
    const { rows } = await tablesDB.listRows<ReportRow>({
      databaseId: DATABASE_ID,
      tableId: REPORTS_TABLE_ID,
      queries: [...(onlyOpen ? [Query.equal('status', 'open')] : []), Query.orderDesc('$createdAt'), Query.limit(100)],
    });
    return rows.map((r) => ({ ...r, id: r.$id, status: r.status ?? 'open', createdAt: r.$createdAt }));
  }

  /** Close a report as resolved (action taken) or dismissed (nothing wrong). */
  async setStatus(id: string, status: Report['status']): Promise<void> {
    await tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: REPORTS_TABLE_ID, rowId: id, data: { status } });
  }
}
