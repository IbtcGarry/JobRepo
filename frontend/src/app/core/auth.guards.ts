import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

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
