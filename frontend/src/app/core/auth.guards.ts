// Route guards used in app.routes.ts: they decide whether a page may open.

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { ProfileService, canEditCompany } from './profile.service';

import { AuthService } from './auth.service';

/** Only signed-in users; others go to /login and come back afterwards. */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).isLoggedIn()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { redirect: state.url } });
};

/** Only signed-out users (login / signup pages). */
export const guestGuard: CanActivateFn = () => {
  if (!inject(AuthService).isLoggedIn()) return true;
  return inject(Router).createUrlTree(['/']);
};

/**
 * Only the owners and managers of the company in the address (/company/:id/...).
 * Others are sent to that company's public page. Use after authGuard.
 */
export const employerGuard: CanActivateFn = async (route) => {
  const companyId = route.paramMap.get('id') ?? '';
  const userId = inject(AuthService).user()?.$id;
  const router = inject(Router);
  const profiles = inject(ProfileService);
  if (userId && canEditCompany(await profiles.get(userId), companyId)) return true;
  return router.createUrlTree(['/company', companyId]);
};

/** Only site moderators (profiles.siteAdmin); others go to the front page. Use after authGuard. */
export const moderatorGuard: CanActivateFn = async () => {
  const userId = inject(AuthService).user()?.$id;
  const router = inject(Router);
  const profiles = inject(ProfileService);
  if (userId && (await profiles.get(userId))?.siteAdmin) return true;
  return router.createUrlTree(['/']);
};
