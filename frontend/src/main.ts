// Entry point: starts Angular with the app shell (app/app.ts) and its settings (app/app.config.ts).
// Runs once when the page loads; you rarely need to edit it.

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
