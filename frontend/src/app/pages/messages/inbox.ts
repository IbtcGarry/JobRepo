// Messages inbox (/messages): one row per person you've talked to, newest first,
// with the last message and an unread count. Updates live (core/message.service.ts).

import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { MessageService } from '../../core/message.service';

/** Messages inbox (/messages): one row per conversation, newest first, with unread counts. */
@Component({
  selector: 'app-inbox',
  imports: [RouterLink, DatePipe],
  templateUrl: './inbox.html',
})
export class Inbox {
  // Shared services this page uses (inject borrows the one app-wide copy).
  private readonly messages = inject(MessageService);

  /** Conversations, recomputed whenever a message arrives. */
  protected readonly conversations = computed(() => {
    this.messages.all();
    return this.messages.conversations();
  });
}
