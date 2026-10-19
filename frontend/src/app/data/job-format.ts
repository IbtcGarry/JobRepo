import { Job } from './jobs';

export function salaryRange(job: Pick<Job, 'salaryMin' | 'salaryMax'>): string | null {
  const k = (n: number) => `$${Math.round(n / 1000)}K`;
  const { salaryMin: min, salaryMax: max } = job;
  if (min && max) return min === max ? k(min) : `${k(min)} – ${k(max)}`;
  if (min) return `${k(min)}+`;
  if (max) return `Up to ${k(max)}`;
  return null;
}

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
    job.equity ? `${job.equity} equity` : null,
    job.visaSponsorship ? 'Visa sponsorship' : null,
    job.companySize ? `${job.companySize} employees` : null,
  ].filter((f): f is string => !!f);
}
