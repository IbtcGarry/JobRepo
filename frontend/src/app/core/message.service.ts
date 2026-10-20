// Messages: one-to-one chat between users (e.g. an employer and an applicant).
// Table `messages`; the inbox groups messages into conversations by the other person,
// and new messages arrive live through Appwrite Realtime.

import { Injectable, computed, signal } from '@angular/core';
import { ID, Models, Query } from 'appwrite';

import { DATABASE_ID, MESSAGES_TABLE_ID, client, tableChannel, tablesDB } from './appwrite';

/** One message between two users. */
export interface Message {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  body: string;
  read: boolean;
  sentAt: string;
}

/** One conversation in the inbox: the other person and the latest message. */
export interface Conversation {
  otherId: string;
  otherName: string;
  last: Message;
  unread: number;
}

type MessageRow = Models.Row & Omit<Message, 'id' | 'sentAt'>;

/** Messages between two users: loads them, groups them into conversations, sends, marks read, and listens live. */
@Injectable({ providedIn: 'root' })
export class MessageService {
  /** Every message the signed-in user sent or received (latest 500). */
  readonly all = signal<Message[]>([]);
  /** Unread messages sent to the signed-in user, for the header badge. */
  readonly unread = computed(() => this.all().filter((m) => m.toId === this.userId && !m.read).length);
  private userId: string | null = null;
  private stopListening: (() => void) | null = null;

  /** Load a user's messages and listen for new ones; pass null on logout to stop. */
  async start(userId: string | null): Promise<void> {
    this.stopListening?.();
    this.stopListening = null;
    this.userId = userId;
    if (!userId) return this.all.set([]);
    await this.load();
    this.stopListening = client.subscribe(tableChannel(MESSAGES_TABLE_ID), (event) => {
      const row = event.payload as MessageRow;
      if (row.fromId === userId || row.toId === userId) void this.load();
    });
  }

  /** Inbox: one entry per person, most recent conversation first. */
  conversations(): Conversation[] {
    const me = this.userId;
    const byPerson = new Map<string, Conversation>();
    for (const m of this.all()) {
      const mine = m.fromId === me;
      const otherId = mine ? m.toId : m.fromId;
      const entry = byPerson.get(otherId) ?? { otherId, otherName: mine ? m.toName : m.fromName, last: m, unread: 0 };
      if (m.sentAt > entry.last.sentAt) entry.last = m;
      if (!mine && !m.read) entry.unread++;
      byPerson.set(otherId, entry);
    }
    return [...byPerson.values()].sort((a, b) => b.last.sentAt.localeCompare(a.last.sentAt));
  }

  /** Messages between the signed-in user and one other person, oldest first. */
  thread(otherId: string): Message[] {
    return this.all()
      .filter((m) => m.fromId === otherId || m.toId === otherId)
      .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  }

  /** Send a message. */
  async send(from: { id: string; name: string }, to: { id: string; name: string }, body: string): Promise<void> {
    await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: MESSAGES_TABLE_ID,
      rowId: ID.unique(),
      data: { fromId: from.id, fromName: from.name, toId: to.id, toName: to.name, body: body.trim(), read: false },
    });
    await this.load();
  }

  /** Mark every message from one person as read (when their conversation is opened). */
  async markThreadRead(otherId: string): Promise<void> {
    const unread = this.all().filter((m) => m.fromId === otherId && m.toId === this.userId && !m.read);
    if (!unread.length) return;
    this.all.update((list) => list.map((m) => (unread.includes(m) ? { ...m, read: true } : m)));
    await Promise.all(
      unread.map((m) => tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: MESSAGES_TABLE_ID, rowId: m.id, data: { read: true } })),
    );
  }

  /** Fetch messages sent by or to the signed-in user. */
  private async load(): Promise<void> {
    if (!this.userId) return;
    const { rows } = await tablesDB.listRows<MessageRow>({
      databaseId: DATABASE_ID,
      tableId: MESSAGES_TABLE_ID,
      queries: [
        Query.or([Query.equal('fromId', this.userId), Query.equal('toId', this.userId)]),
        Query.orderDesc('$createdAt'),
        Query.limit(500),
      ],
    });
    this.all.set(rows.map((r) => ({ ...r, id: r.$id, read: r.read ?? false, sentAt: r.$createdAt })));
  }
}
