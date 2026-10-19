import { describe, expect, it } from 'vitest';

import { summarizeJobs } from './job-admin';
import { Job } from './jobs';

const job = (id: string, status: Job['status'], postedByName: string | null) => ({ id, status, postedByName }) as Job;

describe('summarizeJobs', () => {
  it('counts jobs, statuses, applicants and distinct posters', () => {
    const jobs = [job('a', 'open', 'garry'), job('b', 'closed', 'wesker'), job('c', 'open', 'garry'), job('d', 'open', null)];
    expect(summarizeJobs(jobs, { a: 5, b: 7 })).toEqual({ total: 4, open: 3, closed: 1, applicants: 12, posters: 2 });
  });

  it('handles a company with no jobs', () => {
    expect(summarizeJobs([], {})).toEqual({ total: 0, open: 0, closed: 0, applicants: 0, posters: 0 });
  });
});
