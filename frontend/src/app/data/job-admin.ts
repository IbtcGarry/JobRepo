import { Job } from './jobs';

export interface JobSummary {
  total: number;
  open: number;
  closed: number;
  applicants: number;
  /** Distinct people who posted jobs. */
  posters: number;
}

/** Totals for a company's admin dashboard. */
export function summarizeJobs(jobs: Job[], applicantCounts: Record<string, number>): JobSummary {
  const open = jobs.filter((j) => j.status === 'open').length;
  return {
    total: jobs.length,
    open,
    closed: jobs.length - open,
    applicants: jobs.reduce((sum, j) => sum + (applicantCounts[j.id] ?? 0), 0),
    posters: new Set(jobs.map((j) => j.postedByName).filter(Boolean)).size,
  };
}
