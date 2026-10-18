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
