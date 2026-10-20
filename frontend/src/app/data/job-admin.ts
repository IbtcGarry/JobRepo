// Totals for the company admin page (jobs, open, closed, applicants, posters).
// Tested in job-admin.spec.ts.

import { Job } from './jobs';

/** Totals shown in the company admin page's tiles. */
export interface JobSummary {
  total: number;
  open: number;
  closed: number;
  drafts: number;
  /** Total job-page views across all jobs. */
  views: number;
  applicants: number;
  /** Distinct people who posted jobs. */
  posters: number;
}

/** Totals for a company's admin dashboard. */
export function summarizeJobs(jobs: Job[], applicantCounts: Record<string, number>): JobSummary {
  // How many jobs have a given status.
  const count = (status: Job['status']) => jobs.filter((j) => j.status === status).length;
  return {
    total: jobs.length,
    open: count('open'),
    closed: count('closed'),
    drafts: count('draft'),
    views: jobs.reduce((sum, j) => sum + (j.views ?? 0), 0),
    applicants: jobs.reduce((sum, j) => sum + (applicantCounts[j.id] ?? 0), 0),
    posters: new Set(jobs.map((j) => j.postedByName).filter(Boolean)).size,
  };
}
