// The job board's filters as plain functions (no screen, no Appwrite), shared by the
// front page and the map. Tested in job-filters.spec.ts.
// Several options in one group match ANY of them; different groups must ALL match.

import { hasEquity } from './job-format';
import { CompanySize, Job, JobRole, JobType, Level, Workplace } from './jobs';

/** Everything the job board and map can filter and sort by. */
export interface JobFilters {
  query: string;
  location: string;
  roles: JobRole[];
  workplaces: Workplace[];
  types: JobType[];
  levels: Level[];
  sizes: CompanySize[];
  /** Only jobs whose salary reaches this yearly USD amount; 0 = any. */
  minSalary: number;
  /** Jobs must list every one of these skills. */
  skills: string[];
  equityOnly: boolean;
  visaOnly: boolean;
  /** Posted within this many days; 0 = any time. */
  postedWithinDays: number;
  /** 'distance' is only offered on the map, which has a point to measure from. */
  sort: 'newest' | 'salary' | 'distance';
}

/** No filters: every job, newest first. */
export const EMPTY_FILTERS: JobFilters = {
  query: '',
  location: '',
  roles: [],
  workplaces: [],
  types: [],
  levels: [],
  sizes: [],
  minSalary: 0,
  skills: [],
  equityOnly: false,
  visaOnly: false,
  postedWithinDays: 0,
  sort: 'newest',
};

// Choices for the Salary (minimum, in USD per year) and Date posted dropdowns.
export const SALARY_OPTIONS = [0, 50_000, 80_000, 100_000, 120_000, 150_000, 200_000];
export const POSTED_OPTIONS = [
  { days: 0, label: 'Any time' },
  { days: 1, label: 'Past 24 hours' },
  { days: 7, label: 'Past week' },
  { days: 30, label: 'Past month' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Jobs that pass every filter, sorted newest first or by highest salary. */
export function filterJobs(jobs: Job[], f: JobFilters, now = Date.now()): Job[] {
  const words = f.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const location = f.location.trim().toLowerCase();
  const skills = f.skills.map((s) => s.toLowerCase());
  const oldest = f.postedWithinDays ? now - f.postedWithinDays * DAY_MS : 0;

  const matches = jobs.filter((job) => {
    const text = [job.title, job.company, job.role, job.description, ...job.skills].join(' ').toLowerCase();
    const jobSkills = job.skills.map((s) => s.toLowerCase());
    return (
      words.every((w) => text.includes(w)) &&
      (!location || `${job.location} ${job.address}`.toLowerCase().includes(location)) &&
      inList(f.roles, job.role) &&
      inList(f.workplaces, job.workplace) &&
      inList(f.types, job.type) &&
      inList(f.levels, job.level) &&
      inList(f.sizes, job.companySize) &&
      (!f.minSalary || topSalary(job) >= f.minSalary) &&
      skills.every((s) => jobSkills.includes(s)) &&
      (!f.equityOnly || hasEquity(job)) &&
      (!f.visaOnly || job.visaSponsorship) &&
      Date.parse(job.postedAt) >= oldest
    );
  });

  return matches.sort((a, b) =>
    f.sort === 'salary' ? topSalary(b) - topSalary(a) : Date.parse(b.postedAt) - Date.parse(a.postedAt),
  );
}

/** How many filters differ from the defaults (search box and sort not counted). */
export function activeFilterCount(f: JobFilters): number {
  return (
    (f.location.trim() ? 1 : 0) +
    f.roles.length +
    f.workplaces.length +
    f.types.length +
    f.levels.length +
    f.sizes.length +
    f.skills.length +
    (f.minSalary ? 1 : 0) +
    (f.equityOnly ? 1 : 0) +
    (f.visaOnly ? 1 : 0) +
    (f.postedWithinDays ? 1 : 0)
  );
}

/** A job with no value for a filtered field doesn't match that filter. */
function inList<T>(selected: T[], value: T | null): boolean {
  return selected.length === 0 || (value !== null && selected.includes(value));
}

/** The highest salary a job lists (0 when none), used for the salary filter and sort. */
function topSalary(job: Job): number {
  return job.salaryMax ?? job.salaryMin ?? 0;
}
