// Job listing shape for the front page board. There are no listings yet;
// they will come from the Appwrite `jobs` table once job posting is built.
export type JobRole = 'Engineering' | 'Design' | 'Product' | 'Sales' | 'Operations';

export interface Job {
  id: string;
  company: string;
  batch: string;
  tagline: string;
  title: string;
  role: JobRole;
  location: string;
  remote: boolean;
  salary: string;
  equity: string;
  posted: string;
}

export const ROLES: JobRole[] = ['Engineering', 'Design', 'Product', 'Sales', 'Operations'];

export const JOBS: Job[] = [];
