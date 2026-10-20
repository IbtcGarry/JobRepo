// Job alerts: a saved map / board search. When a new job matching it is posted, the Node.js
// function (functions/notifier) sends the owner a notification. Table `alerts`; `params` holds
// the search exactly as the map stores it in its page address (data/map-search.ts).

import { Injectable } from '@angular/core';
import { ID, Models, Permission, Query, Role } from 'appwrite';

import { ALERTS_TABLE_ID, DATABASE_ID, tablesDB } from './appwrite';

/** A saved search the user is notified about. */
export interface JobAlert {
  id: string;
  name: string;
  /** Search params, e.g. { role: 'Engineering', near: '41.8,-87.6', r: '25' }. */
  params: Record<string, string>;
}

type AlertRow = Models.Row & { userId: string; name: string; params: string };

/** Job alerts: save, list and delete a user's saved searches; the notifier function sends the matching notifications. */
@Injectable({ providedIn: 'root' })
export class AlertService {
  /** Save a search as an alert. */
  async create(userId: string, name: string, params: Record<string, string>): Promise<void> {
    const owner = Role.user(userId);
    await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: ALERTS_TABLE_ID,
      rowId: ID.unique(),
      data: { userId, name: name.trim(), params: JSON.stringify(params) },
      permissions: [Permission.read(owner), Permission.update(owner), Permission.delete(owner)],
    });
  }

  /** The user's alerts. */
  async listMine(userId: string): Promise<JobAlert[]> {
    const { rows } = await tablesDB.listRows<AlertRow>({
      databaseId: DATABASE_ID,
      tableId: ALERTS_TABLE_ID,
      queries: [Query.equal('userId', userId), Query.orderDesc('$createdAt'), Query.limit(50)],
    });
    return rows.map((r) => ({ id: r.$id, name: r.name, params: safeParse(r.params) }));
  }

  /** Delete an alert. */
  async remove(id: string): Promise<void> {
    await tablesDB.deleteRow({ databaseId: DATABASE_ID, tableId: ALERTS_TABLE_ID, rowId: id });
  }
}

/** Parse the stored params, treating bad data as an empty search. */
function safeParse(value: string): Record<string, string> {
  try {
    return JSON.parse(value) ?? {};
  } catch {
    return {};
  }
}
