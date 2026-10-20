// One conversation (/messages/:userId): messages with one person, oldest first, and a box
// to reply. Opening it marks their messages read; new messages appear live.

import { Component, ElementRef, computed, effect, inject, input, resource, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService, errorMessage } from '../../core/auth.service';
import { MessageService } from '../../core/message.service';
import { ProfileService } from '../../core/profile.service';

/** Conversation page (/messages/:userId): the messages with one person and a reply box. */
@Component({
  selector: 'app-thread',
  imports: [RouterLink, DatePipe, FormsModule],
  templateUrl: './thread.html',
})
export class Thread {
  /** The other person's user ID from the address. */
  readonly userId = input.required<string>();

  // Shared services this page uses (inject borrows the one app-wide copy).
  protected readonly auth = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly profiles = inject(ProfileService);
  /** The scrolling message list, kept scrolled to the newest message. */
  private readonly listEl = viewChild<ElementRef<HTMLElement>>('list');

  /** The other person's profile (for their name). */
  protected readonly other = resource({ params: () => this.userId(), loader: ({ params }) => this.profiles.get(params) });
  /** Their name: from the profile, or from an earlier message. */
  protected readonly otherName = computed(
    () =>
      this.other.value()?.username ||
      this.messages().find((m) => m.fromId === this.userId())?.fromName ||
      this.messages().find((m) => m.toId === this.userId())?.toName ||
      'User',
  );
  /** Messages in this conversation, oldest first. */
  protected readonly messages = computed(() => {
    this.messageService.all();
    return this.messageService.thread(this.userId());
  });
  /** The reply being typed. */
  protected draft = '';
  /** True while sending. */
  protected readonly sending = signal(false);
  /** Error from the last failed send. */
  protected readonly error = signal('');

  /** Marks the other person's messages read and scrolls down whenever messages change. */
  constructor() {
    // Whenever messages change: mark theirs read and scroll to the newest.
    effect(() => {
      this.messages();
      void this.messageService.markThreadRead(this.userId());
      queueMicrotask(() => this.listEl()?.nativeElement.scrollTo({ top: 1e9 }));
    });
  }

  /** Enter in the reply box sends (Shift+Enter makes a new line). */
  protected onEnter(event: Event) {
    if ((event as KeyboardEvent).shiftKey) return;
    event.preventDefault();
    void this.send();
  }

  /** Send button (or Enter): send the reply. */
  async send() {
    const body = this.draft.trim();
    const me = this.auth.user();
    if (!body || !me) return;
    this.sending.set(true);
    this.error.set('');
    try {
      await this.messageService.send({ id: me.$id, name: me.name }, { id: this.userId(), name: this.otherName() }, body);
      this.draft = '';
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.sending.set(false);
    }
  }
}
