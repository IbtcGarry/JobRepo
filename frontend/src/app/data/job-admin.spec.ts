import { describe, expect, it } from 'vitest';

import { summarizeJobs } from './job-admin';
import { Job } from './jobs';

const job = (id: string, status: Job['status'], postedByName: string | null, views = 0) => ({ id, status, postedByName, views }) as Job;

describe('summarizeJobs', () => {
  it('counts jobs, statuses, applicants and distinct posters', () => {
    const jobs = [job('a', 'open', 'garry', 10), job('b', 'closed', 'wesker', 3), job('c', 'open', 'garry'), job('d', 'draft', null)];
    expect(summarizeJobs(jobs, { a: 5, b: 7 })).toEqual({ total: 4, open: 2, closed: 1, drafts: 1, views: 13, applicants: 12, posters: 2 });
  });

  it('handles a company with no jobs', () => {
    expect(summarizeJobs([], {})).toEqual({ total: 0, open: 0, closed: 0, drafts: 0, views: 0, applicants: 0, posters: 0 });
  });
});
