// How job details read on screen: salary ranges ("$90K – $130K"), "2d ago", and the
// short fact line under a job title. Used by job cards, the job page and the admin table.

import { Job } from './jobs';

/** Salary for display: "$90K – $130K", "$90K+", "Up to $130K", or null when none is given. */
export function salaryRange(job: Pick<Job, 'salaryMin' | 'salaryMax'>): string | null {
  // 90000 → "$90K".
  const k = (n: number) => `$${Math.round(n / 1000)}K`;
  const { salaryMin: min, salaryMax: max } = job;
  if (min && max) return min === max ? k(min) : `${k(min)} – ${k(max)}`;
  if (min) return `${k(min)}+`;
  if (max) return `Up to ${k(max)}`;
  return null;
}

/** How long ago a job was posted: "just now", "5h ago", "3d ago", "2w ago". */
export function postedAgo(postedAt: string, now = Date.now()): string {
  const hours = Math.max(0, Math.floor((now - Date.parse(postedAt)) / 3_600_000));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : `${Math.floor(days / 7)}w ago`;
}

/** Short facts shown under a job title, skipping anything the employer left out. */
export function jobFacts(job: Job): string[] {
  return [
    [job.location, job.workplace].filter(Boolean).join(' · '),
    job.role,
    [job.type, job.level].filter(Boolean).join(' · '),
    salaryRange(job),
    hasEquity(job) ? `${job.equity} equity` : null,
    job.visaSponsorship ? 'Visa sponsorship' : null,
    job.companySize ? `${job.companySize} employees` : null,
  ].filter((f): f is string => !!f);
}

/** True once a job's closing date has passed (the notifier function also closes these). */
export function isExpired(job: Pick<Job, 'expiresAt'>, now = Date.now()): boolean {
  return !!job.expiresAt && Date.parse(job.expiresAt) < now;
}

/** Company name → address-safe ID: lowercase letters, numbers and dashes, at most 36 characters. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36)
    .replace(/-+$/, '');
}

/** True when a job really offers equity: a blank, "0", "0%" or "none" counts as no equity. */
export function hasEquity(job: Pick<Job, 'equity'>): boolean {
  const e = (job.equity ?? '').trim().toLowerCase();
  return !!e && !/^(0+(\.0+)?\s*%?|none|no|n\/a)$/.test(e);
}
