// Job listings, stored in the Appwrite `jobs` table and posted from a company page.
import { ScreeningQuestion } from './screening';

export const ROLES = ['Engineering', 'Design', 'Product', 'Data', 'Marketing', 'Sales', 'Operations'] as const;
export const WORKPLACES = ['Remote', 'Hybrid', 'On-site'] as const;
export const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'] as const;
export const LEVELS = ['Intern', 'Entry', 'Mid', 'Senior', 'Lead'] as const;
export const COMPANY_SIZES = ['1–10', '11–50', '51–200', '200+'] as const;

export type JobRole = (typeof ROLES)[number];
export type Workplace = (typeof WORKPLACES)[number];
export type JobType = (typeof JOB_TYPES)[number];
export type Level = (typeof LEVELS)[number];
export type CompanySize = (typeof COMPANY_SIZES)[number];
/** Closed jobs leave the public board but stay in the company's admin list. */
export type JobStatus = 'open' | 'closed';

export interface Job {
  id: string;
  companyId: string;
  company: string;
  title: string;
  role: JobRole;
  /** Short "City, State" form shown on cards; derived from the address. */
  location: string;
  /** Full street address as found on Google Maps. */
  address: string;
  lat: number | null;
  lng: number | null;
  description: string;
  // Optional details used by the board's filters.
  workplace: Workplace | null;
  type: JobType | null;
  level: Level | null;
  companySize: CompanySize | null;
  /** Yearly USD salary range. */
  salaryMin: number | null;
  salaryMax: number | null;
  /** e.g. "0.5% – 1%", or null when no equity is offered. */
  equity: string | null;
  visaSponsorship: boolean;
  skills: string[];
  /** ISO date the job was posted. */
  postedAt: string;
  status: JobStatus;
  /** Username of whoever posted the job. */
  postedByName: string | null;
  /** Screening questions applicants answer when applying. */
  questions: ScreeningQuestion[];
}
