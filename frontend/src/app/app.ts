// The app shell: the header on every page (logo, links, login state, profile picture).
// Its template is app.html and its styles app.scss; the current page appears in <router-outlet />.

import { Component, effect, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth.service';
import { MessageService } from './core/message.service';
import { ProfileService } from './core/profile.service';
import { Avatar } from './shared/avatar';

/** The app shell: the header on every page (logo, links, profile picture, Settings) around the current page. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, Avatar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  // Shared services this page uses (inject borrows the one app-wide copy).
  protected readonly auth = inject(AuthService);
  protected readonly profiles = inject(ProfileService);
  protected readonly messages = inject(MessageService);

  /** Runs once when the app starts. */
  constructor() {
    // Keep the header (picture, message badge) in step with who is signed in;
    // on logout the message service stops listening for live updates.
    effect(() => {
      const userId = this.auth.user()?.$id ?? null;
      void this.profiles.loadMe(userId);
      void this.messages.start(userId);
    });
  }
}
