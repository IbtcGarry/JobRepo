import { describe, expect, it } from 'vitest';

import { EMPTY_FILTERS, JobFilters, activeFilterCount, filterJobs } from './job-filters';
import { Job } from './jobs';

const NOW = Date.parse('2026-10-18T12:00:00Z');

function job(overrides: Partial<Job>): Job {
  return {
    id: '1',
    companyId: 'acme',
    company: 'Acme',
    description: 'Rockets for everyone',
    companySize: '11–50',
    title: 'Backend Engineer',
    role: 'Engineering',
    type: 'Full-time',
    level: 'Mid',
    location: 'Chicago, IL',
    address: '233 S Wacker Dr, Chicago, IL 60606',
    lat: null,
    lng: null,
    workplace: 'On-site',
    salaryMin: 100_000,
    salaryMax: 140_000,
    equity: null,
    visaSponsorship: false,
    skills: ['TypeScript', 'Postgres'],
    postedAt: '2026-10-17T12:00:00Z',
    status: 'open',
    postedByName: 'garry',
    questions: [],
    ...overrides,
  };
}

const run = (jobs: Job[], f: Partial<JobFilters>) => filterJobs(jobs, { ...EMPTY_FILTERS, ...f }, NOW).map((j) => j.id);

describe('filterJobs', () => {
  const jobs = [
    job({ id: 'a' }),
    job({ id: 'b', title: 'Product Designer', role: 'Design', workplace: 'Remote', level: 'Senior', salaryMax: 180_000, equity: '0.5%', skills: ['Figma'], postedAt: '2026-09-01T00:00:00Z' }),
    job({ id: 'c', type: 'Internship', level: 'Intern', location: 'Austin, TX', address: '500 W 2nd St, Austin, TX 78701', salaryMax: 40_000, visaSponsorship: true, companySize: '1–10' }),
  ];

  it('returns everything, newest first, with no filters', () => {
    expect(run(jobs, {})).toEqual(['a', 'c', 'b']);
  });

  it('matches every search word across title, company and skills', () => {
    expect(run(jobs, { query: 'designer figma' })).toEqual(['b']);
    expect(run(jobs, { query: 'designer postgres' })).toEqual([]);
  });

  it('ORs within a group and ANDs across groups', () => {
    expect(run(jobs, { levels: ['Mid', 'Intern'] })).toEqual(['a', 'c']);
    expect(run(jobs, { levels: ['Mid', 'Intern'], types: ['Internship'] })).toEqual(['c']);
  });

  it('filters by location, workplace, salary, equity, visa, size, skills and age', () => {
    expect(run(jobs, { location: 'austin' })).toEqual(['c']);
    expect(run(jobs, { location: 'wacker' })).toEqual(['a', 'b']);
    expect(run(jobs, { workplaces: ['Remote'] })).toEqual(['b']);
    expect(run(jobs, { minSalary: 150_000 })).toEqual(['b']);
    expect(run(jobs, { equityOnly: true })).toEqual(['b']);
    expect(run(jobs, { visaOnly: true })).toEqual(['c']);
    expect(run(jobs, { sizes: ['1–10'] })).toEqual(['c']);
    expect(run(jobs, { skills: ['typescript', 'postgres'] })).toEqual(['a', 'c']);
    expect(run(jobs, { postedWithinDays: 7 })).toEqual(['a', 'c']);
  });

  it('excludes jobs missing a filtered field', () => {
    const bare = job({ id: 'd', workplace: null, salaryMin: null, salaryMax: null });
    expect(run([bare], { workplaces: ['Remote'] })).toEqual([]);
    expect(run([bare], { minSalary: 50_000 })).toEqual([]);
    expect(run([bare], {})).toEqual(['d']);
  });

  it('sorts by highest salary', () => {
    expect(run(jobs, { sort: 'salary' })).toEqual(['b', 'a', 'c']);
  });
});

describe('activeFilterCount', () => {
  it('counts each selected option but not search or sort', () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...EMPTY_FILTERS, query: 'x', sort: 'salary', roles: ['Data', 'Design'], visaOnly: true })).toBe(3);
  });
});
