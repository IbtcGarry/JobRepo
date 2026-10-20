// What a job is: the Job type and the fixed option lists (roles, workplaces, job types,
// levels, company sizes) used by the job form, the filters and the cards.
// Add an option here and it appears everywhere automatically.

import { ScreeningQuestion } from './screening';

// Fixed option lists for the job form, the filters and the cards.
export const ROLES = ['Engineering', 'Design', 'Product', 'Data', 'Marketing', 'Sales', 'Operations'] as const;
export const WORKPLACES = ['Remote', 'Hybrid', 'On-site'] as const;
export const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'] as const;
export const LEVELS = ['Intern', 'Entry', 'Mid', 'Senior', 'Lead'] as const;
export const COMPANY_SIZES = ['1–10', '11–50', '51–200', '200+'] as const;

// Types for one value from each list above (e.g. JobRole = 'Engineering' | 'Design' | …).
export type JobRole = (typeof ROLES)[number];
export type Workplace = (typeof WORKPLACES)[number];
export type JobType = (typeof JOB_TYPES)[number];
export type Level = (typeof LEVELS)[number];
export type CompanySize = (typeof COMPANY_SIZES)[number];
/**
 * draft = saved but not posted (only the company sees it), open = on the board,
 * closed = off the board but kept in the company's admin list.
 */
export type JobStatus = 'draft' | 'open' | 'closed';

/** A job listing as pages use it (built from a jobs row by toJob in core/job.service.ts). */
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
  /** Username and user ID of whoever posted the job (for "Message employer"). */
  postedByName: string | null;
  postedById: string | null;
  /** Screening questions applicants answer when applying. */
  questions: ScreeningQuestion[];
  /** How many times signed-in visitors opened the job page. */
  views: number;
  /** ISO date the job closes automatically, or null for no end date. */
  expiresAt: string | null;
}
