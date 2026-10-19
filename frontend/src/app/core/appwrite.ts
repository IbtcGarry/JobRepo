import { Account, Client, Storage, TablesDB, Teams } from 'appwrite';

import { environment } from '../../environments/environment';

// Single shared Appwrite client for the whole app.
export const client = new Client()
  .setEndpoint(environment.appwrite.endpoint)
  .setProject(environment.appwrite.projectId);

export const account = new Account(client);
export const tablesDB = new TablesDB(client);
export const storage = new Storage(client);
export const teams = new Teams(client);

// Database, table and bucket IDs (see appwrite.json).
export const DATABASE_ID = 'main';
export const PROFILES_TABLE_ID = 'profiles';
export const COMPANIES_TABLE_ID = 'companies';
export const JOBS_TABLE_ID = 'jobs';
export const APPLICATIONS_TABLE_ID = 'applications';
// The free plan allows one bucket, so resumes, profile pictures and company logos share it;
// each file carries its own permissions.
export const UPLOADS_BUCKET_ID = 'uploads';
