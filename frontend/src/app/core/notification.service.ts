// Notifications. Rows are written by the Node.js Appwrite Function
// (functions/notifier) when someone applies, an application moves stage, a job alert matches,
// or an invite arrives; this service lists them, marks them read and listens for new ones live.
// Nothing on the site shows them at the moment (the header bell was removed on request).

import { Injectable, computed, signal } from '@angular/core';
import { Models, Query } from 'appwrite';

import { DATABASE_ID, NOTIFICATIONS_TABLE_ID, client, tableChannel, tablesDB } from './appwrite';

/** One notification written by the notifier function for a user. */
export interface Notification {
  id: string;
  text: string;
  /** Page to open when the notification is clicked, e.g. /jobs/123. */
  link: string | null;
  read: boolean;
  createdAt: string;
}

type NotificationRow = Models.Row & { userId: string; text: string; link: string | null; read: boolean };

/** Notifications written by the notifier function: list, mark read, and listen live (not shown in the header since the bell was removed). */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  /** The signed-in user's latest notifications, newest first. */
  readonly items = signal<Notification[]>([]);
  /** How many are unread, for the red badge on the bell. */
  readonly unread = computed(() => this.items().filter((n) => !n.read).length);
  private stopListening: (() => void) | null = null;

  /** Load a user's notifications and listen for new ones; pass null on logout to stop. */
  async start(userId: string | null): Promise<void> {
    this.stopListening?.();
    this.stopListening = null;
    if (!userId) return this.items.set([]);
    await this.load(userId);
    this.stopListening = client.subscribe(tableChannel(NOTIFICATIONS_TABLE_ID), (event) => {
      const row = event.payload as NotificationRow;
      if (row.userId === userId) void this.load(userId);
    });
  }

  /** Mark one notification read (when it's clicked). */
  async markRead(id: string): Promise<void> {
    this.items.update((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: NOTIFICATIONS_TABLE_ID, rowId: id, data: { read: true } });
  }

  /** "Mark all read" in the bell menu. */
  async markAllRead(): Promise<void> {
    const unread = this.items().filter((n) => !n.read);
    this.items.update((list) => list.map((n) => ({ ...n, read: true })));
    await Promise.all(
      unread.map((n) =>
        tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: NOTIFICATIONS_TABLE_ID, rowId: n.id, data: { read: true } }),
      ),
    );
  }

  /** Fetch the latest 30 notifications for a user. */
  private async load(userId: string): Promise<void> {
    const { rows } = await tablesDB.listRows<NotificationRow>({
      databaseId: DATABASE_ID,
      tableId: NOTIFICATIONS_TABLE_ID,
      queries: [Query.equal('userId', userId), Query.orderDesc('$createdAt'), Query.limit(30)],
    });
    this.items.set(rows.map((r) => ({ id: r.$id, text: r.text, link: r.link ?? null, read: r.read ?? false, createdAt: r.$createdAt })));
  }
}
