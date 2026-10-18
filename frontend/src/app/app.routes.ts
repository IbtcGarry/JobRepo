import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth.guards';
import { Account } from './pages/account';
import { ForgotPassword } from './pages/auth/forgot-password';
import { Login } from './pages/auth/login';
import { ResetPassword } from './pages/auth/reset-password';
import { Signup } from './pages/auth/signup';
import { VerifyEmail } from './pages/auth/verify-email';
import { Home } from './pages/home';

export const routes: Routes = [
  { path: '', component: Home, title: 'JobTest' },
  { path: 'login', component: Login, canActivate: [guestGuard], title: 'Log in · JobTest' },
  { path: 'signup', component: Signup, canActivate: [guestGuard], title: 'Sign up · JobTest' },
  { path: 'forgot-password', component: ForgotPassword, title: 'Reset password · JobTest' },
  { path: 'reset-password', component: ResetPassword, title: 'New password · JobTest' },
  { path: 'verify-email', component: VerifyEmail, title: 'Verify email · JobTest' },
  { path: 'account', component: Account, canActivate: [authGuard], title: 'Account · JobTest' },
  { path: '**', redirectTo: '' },
];
