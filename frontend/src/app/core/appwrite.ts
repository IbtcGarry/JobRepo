// The one Appwrite client the whole app shares, plus the IDs of every table and bucket.
// Services in this folder import from here; change an ID here and every caller follows.

import { Account, Client, Storage, TablesDB, Teams } from 'appwrite';

import { environment } from '../../environments/environment';

/** Connection to the JobTesting Appwrite project. */
export const client = new Client()
  .setEndpoint(environment.appwrite.endpoint)
  .setProject(environment.appwrite.projectId);

/** Log in, sign up, log out, current user. */
export const account = new Account(client);
/** Database rows (profiles, companies, jobs, applications). */
export const tablesDB = new TablesDB(client);
/** Files in the uploads bucket (resumes, pictures, logos). */
export const storage = new Storage(client);
/** Appwrite Teams — not used yet; kept for a future "invite recruiters" feature. */
export const teams = new Teams(client);

// Database, table and bucket IDs (see appwrite.json).
export const DATABASE_ID = 'main';
export const PROFILES_TABLE_ID = 'profiles';
export const COMPANIES_TABLE_ID = 'companies';
export const JOBS_TABLE_ID = 'jobs';
export const APPLICATIONS_TABLE_ID = 'applications';
export const NOTIFICATIONS_TABLE_ID = 'notifications';
// Tables added for messaging, invites, job alerts and moderation.
export const MESSAGES_TABLE_ID = 'messages';
export const INVITES_TABLE_ID = 'invites';
export const ALERTS_TABLE_ID = 'alerts';
export const REPORTS_TABLE_ID = 'reports';

/** Realtime channel for every row change in a table (used for live messages and notifications). */
export function tableChannel(tableId: string): string {
  return `tablesdb.${DATABASE_ID}.tables.${tableId}.rows`;
}
// The free plan allows one bucket, so resumes, profile pictures and company logos share it;
// each file carries its own permissions.
export const UPLOADS_BUCKET_ID = 'uploads';
