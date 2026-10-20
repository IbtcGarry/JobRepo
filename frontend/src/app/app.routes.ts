// The site map: which page component shows at which address.
// Every page is lazy-loaded (loadComponent), so a visitor only downloads the pages they open.
// Guards (core/auth.guards.ts): authGuard = must be logged in; guestGuard = must be logged out;
// employerGuard = owner / manager of the company in the address; moderatorGuard = site moderator.

import { Routes } from '@angular/router';

import { authGuard, employerGuard, guestGuard, moderatorGuard } from './core/auth.guards';

/** Every page and the address it lives at, grouped by who may open it. */
export const routes: Routes = [
  // ----- Public pages -----
  { path: '', loadComponent: () => import('./pages/home').then((m) => m.Home), title: 'JobTest' },
  { path: 'map', loadComponent: () => import('./pages/map/jobs-map').then((m) => m.JobsMap), title: 'Job map · JobTest' },
  { path: 'jobs/:id', loadComponent: () => import('./pages/jobs/job-detail').then((m) => m.JobDetail), title: 'Job · JobTest' },
  { path: 'companies', loadComponent: () => import('./pages/company/companies').then((m) => m.Companies), title: 'Companies · JobTest' },
  { path: 'company/:id', loadComponent: () => import('./pages/company/company').then((m) => m.CompanyPage), title: 'Company · JobTest' },
  { path: 'profile/:id', loadComponent: () => import('./pages/profile/public-profile').then((m) => m.PublicProfile), title: 'Profile · JobTest' },

  // ----- Logged-out only -----
  { path: 'login', loadComponent: () => import('./pages/auth/login').then((m) => m.Login), canActivate: [guestGuard], title: 'Log in · JobTest' },
  { path: 'signup', loadComponent: () => import('./pages/auth/signup').then((m) => m.Signup), canActivate: [guestGuard], title: 'Sign up · JobTest' },

  // ----- Any signed-in user -----
  { path: 'onboarding', loadComponent: () => import('./pages/onboarding/onboarding').then((m) => m.Onboarding), canActivate: [authGuard], title: 'Welcome · JobTest' },
  { path: 'account', loadComponent: () => import('./pages/account').then((m) => m.Account), canActivate: [authGuard], title: 'Account · JobTest' },
  { path: 'settings', loadComponent: () => import('./pages/settings/settings').then((m) => m.Settings), canActivate: [authGuard], title: 'Settings · JobTest' },
  { path: 'saved', loadComponent: () => import('./pages/saved/saved-jobs').then((m) => m.SavedJobs), canActivate: [authGuard], title: 'Saved jobs · JobTest' },
  { path: 'applications', loadComponent: () => import('./pages/my-applications/my-applications').then((m) => m.MyApplications), canActivate: [authGuard], title: 'My applications · JobTest' },
  { path: 'messages', loadComponent: () => import('./pages/messages/inbox').then((m) => m.Inbox), canActivate: [authGuard], title: 'Messages · JobTest' },
  { path: 'messages/:userId', loadComponent: () => import('./pages/messages/thread').then((m) => m.Thread), canActivate: [authGuard], title: 'Messages · JobTest' },
  { path: 'jobs/:id/apply', loadComponent: () => import('./pages/jobs/job-apply').then((m) => m.JobApply), canActivate: [authGuard], title: 'Apply · JobTest' },

  // ----- Company owners and managers -----
  { path: 'company/:id/edit', loadComponent: () => import('./pages/company/company-edit').then((m) => m.CompanyEdit), canActivate: [authGuard, employerGuard], title: 'Edit company · JobTest' },
  { path: 'company/:id/admin', loadComponent: () => import('./pages/company/company-admin').then((m) => m.CompanyAdmin), canActivate: [authGuard, employerGuard], title: 'Admin · JobTest' },
  { path: 'company/:id/jobs/new', loadComponent: () => import('./pages/jobs/job-form').then((m) => m.JobForm), canActivate: [authGuard, employerGuard], title: 'Post a job · JobTest' },
  { path: 'company/:id/jobs/:jobId/edit', loadComponent: () => import('./pages/jobs/job-form').then((m) => m.JobForm), canActivate: [authGuard, employerGuard], title: 'Edit job · JobTest' },
  { path: 'company/:id/jobs/:jobId/applicants', loadComponent: () => import('./pages/applicants/applicants').then((m) => m.Applicants), canActivate: [authGuard, employerGuard], title: 'Applicants · JobTest' },
  {
    path: 'company/:id/jobs/:jobId/applicants/:applicationId',
    loadComponent: () => import('./pages/applicants/application').then((m) => m.ApplicationView),
    canActivate: [authGuard, employerGuard],
    title: 'Application · JobTest',
  },

  // ----- Site moderators -----
  { path: 'admin', loadComponent: () => import('./pages/moderation/moderation').then((m) => m.Moderation), canActivate: [authGuard, moderatorGuard], title: 'Moderation · JobTest' },

  // Any unknown address goes to the front page.
  { path: '**', redirectTo: '' },
];
