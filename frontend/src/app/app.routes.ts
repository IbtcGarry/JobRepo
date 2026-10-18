import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth.guards';
import { Account } from './pages/account';
import { Login } from './pages/auth/login';
import { Signup } from './pages/auth/signup';
import { Home } from './pages/home';

export const routes: Routes = [
  { path: '', component: Home, title: 'JobTest' },
  { path: 'login', component: Login, canActivate: [guestGuard], title: 'Log in · JobTest' },
  { path: 'signup', component: Signup, canActivate: [guestGuard], title: 'Sign up · JobTest' },
  { path: 'account', component: Account, canActivate: [authGuard], title: 'Account · JobTest' },
  { path: '**', redirectTo: '' },
];
