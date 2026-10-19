import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth.guards';
import { Account } from './pages/account';
import { Login } from './pages/auth/login';
import { Signup } from './pages/auth/signup';
import { CompanyPage } from './pages/company/company';
import { CompanyAdmin } from './pages/company/company-admin';
import { CompanyEdit } from './pages/company/company-edit';
import { Companies } from './pages/company/companies';
import { Home } from './pages/home';
import { JobDetail } from './pages/jobs/job-detail';
import { JobApply } from './pages/jobs/job-apply';
import { JobForm } from './pages/jobs/job-form';
import { ApplicationView } from './pages/applicants/application';
import { Applicants } from './pages/applicants/applicants';

export const routes: Routes = [
  { path: '', component: Home, title: 'JobTest' },
  { path: 'login', component: Login, canActivate: [guestGuard], title: 'Log in · JobTest' },
  { path: 'signup', component: Signup, canActivate: [guestGuard], title: 'Sign up · JobTest' },
  { path: 'account', component: Account, canActivate: [authGuard], title: 'Account · JobTest' },
  { path: 'companies', component: Companies, title: 'Companies · JobTest' },
  { path: 'company/:id', component: CompanyPage, title: 'Company · JobTest' },
  { path: 'company/:id/edit', component: CompanyEdit, canActivate: [authGuard], title: 'Edit company · JobTest' },
  { path: 'company/:id/admin', component: CompanyAdmin, canActivate: [authGuard], title: 'Admin · JobTest' },
  { path: 'company/:id/jobs/new', component: JobForm, canActivate: [authGuard], title: 'Post a job · JobTest' },
  { path: 'company/:id/jobs/:jobId/edit', component: JobForm, canActivate: [authGuard], title: 'Edit job · JobTest' },
  { path: 'company/:id/jobs/:jobId/applicants', component: Applicants, canActivate: [authGuard], title: 'Applicants · JobTest' },
  {
    path: 'company/:id/jobs/:jobId/applicants/:applicationId',
    component: ApplicationView,
    canActivate: [authGuard],
    title: 'Application · JobTest',
  },
  {
    path: 'map',
    loadComponent: () => import('./pages/map/jobs-map').then((m) => m.JobsMap),
    title: 'Job map · JobTest',
  },
  { path: 'jobs/:id', component: JobDetail, title: 'Job · JobTest' },
  { path: 'jobs/:id/apply', component: JobApply, canActivate: [authGuard], title: 'Apply · JobTest' },
  { path: '**', redirectTo: '' },
];
