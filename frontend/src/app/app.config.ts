// App-wide settings, applied before any page shows:
// - restores the logged-in user from Appwrite (AuthService.load) so login checks are correct,
// - sets up the router (app.routes.ts), passes address parts like :id to pages as inputs,
//   and scrolls to #anchors / the top of the page on navigation.

import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { AuthService } from './core/auth.service';

/** App-wide providers, applied before the first page shows (used by main.ts). */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Restore the Appwrite session before the first route (and its guards) runs.
    provideAppInitializer(() => inject(AuthService).load()),
    provideRouter(
      routes,
      // Hand address parts like :id and ?tab= to pages as inputs (e.g. `id = input.required<string>()`).
      withComponentInputBinding(),
      // Scroll to #anchors (e.g. /#jobs) and start each new page at the top.
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
  ],
};
