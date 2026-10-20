// Applications: apply to a job, check whether you already applied, list and count a
// job's applicants, and mark them Interview / Rejected. Table `applications`.
// Screening answers are stored as JSON text and turned back into objects in toApplication().

import { Injectable } from '@angular/core';
import { AppwriteException, ID, Models, Query } from 'appwrite';

import { Job } from '../data/jobs';
import { Answers, parseJson } from '../data/screening';
import { APPLICATIONS_TABLE_ID, DATABASE_ID, tablesDB } from './appwrite';
import { Profile } from './profile.service';

/** Where an application stands; the employer's pipeline board has a column per stage. */
export type ApplicationStatus = 'submitted' | 'reviewing' | 'interview' | 'offer' | 'hired' | 'rejected';

/** Pipeline stages in board order, with their labels. */
export const PIPELINE: { status: ApplicationStatus; label: string }[] = [
  { status: 'submitted', label: 'New' },
  { status: 'reviewing', label: 'Reviewing' },
  { status: 'interview', label: 'Interview' },
  { status: 'offer', label: 'Offer' },
  { status: 'hired', label: 'Hired' },
  { status: 'rejected', label: 'Rejected' },
];

/** The label for a status, e.g. 'interview' → "Interview". */
export function statusLabel(status: ApplicationStatus): string {
  return PIPELINE.find((p) => p.status === status)?.label ?? status;
}

/** One person's application to one job, as pages use it. */
export interface Application {
  id: string;
  jobId: string;
  companyId: string;
  jobTitle: string;
  applicantId: string;
  applicantName: string;
  note: string;
  resumeFileId: string | null;
  resumeName: string | null;
  status: ApplicationStatus;
  /** Answers to the job's screening questions, by question ID. */
  answers: Answers;
  appliedAt: string;
}

type ApplicationRow = Models.Row & Omit<Application, 'id' | 'appliedAt' | 'answers'> & { answers: string | null };

/** Job applications. Security is loose while JobTest is a dummy site: any signed-in user can read them. */
@Injectable({ providedIn: 'root' })
export class ApplicationService {
  /** Apply with the applicant's current resume (copied onto the application). */
  async apply(
    job: Job,
    user: Models.User<Models.Preferences>,
    profile: Profile | null,
    note: string,
    answers: Answers,
  ): Promise<void> {
    await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: APPLICATIONS_TABLE_ID,
      rowId: ID.unique(),
      data: {
        jobId: job.id,
        companyId: job.companyId,
        jobTitle: job.title,
        applicantId: user.$id,
        applicantName: user.name,
        note: note.trim(),
        resumeFileId: profile?.resumeFileId ?? null,
        resumeName: profile?.resumeName ?? null,
        status: 'submitted',
        answers: JSON.stringify(answers),
      },
    });
  }

  /** The user's application to a job, or null if they haven't applied. */
  async findMine(jobId: string, userId: string): Promise<Application | null> {
    const rows = await this.query([Query.equal('jobId', jobId), Query.equal('applicantId', userId), Query.limit(1)]);
    return rows[0] ?? null;
  }

  /** The signed-in user's own applications, newest first (My applications page). */
  async listMine(userId: string): Promise<Application[]> {
    return this.query([Query.equal('applicantId', userId), Query.orderDesc('$createdAt'), Query.limit(100)]);
  }

  /** Withdraw an application (the applicant deletes it). */
  async withdraw(id: string): Promise<void> {
    await tablesDB.deleteRow({ databaseId: DATABASE_ID, tableId: APPLICATIONS_TABLE_ID, rowId: id });
  }

  /** Every application to one job, newest first. */
  async listForJob(jobId: string): Promise<Application[]> {
    return this.query([Query.equal('jobId', jobId), Query.orderDesc('$createdAt'), Query.limit(100)]);
  }

  /** Number of applications per job ID. */
  async countForJobs(jobIds: string[]): Promise<Record<string, number>> {
    if (!jobIds.length) return {};
    const rows = await this.query([Query.equal('jobId', jobIds), Query.select(['jobId']), Query.limit(5000)]);
    const counts: Record<string, number> = Object.fromEntries(jobIds.map((id) => [id, 0]));
    for (const row of rows) counts[row.jobId]++;
    return counts;
  }

  /** Move an application to a pipeline stage (New, Reviewing, Interview, Offer, Hired, Rejected). */
  async setStatus(id: string, status: ApplicationStatus): Promise<void> {
    await tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: APPLICATIONS_TABLE_ID, rowId: id, data: { status } });
  }

  /** Load one application by ID; null when it doesn't exist. */
  async get(id: string): Promise<Application | null> {
    try {
      const row = await tablesDB.getRow<ApplicationRow>({ databaseId: DATABASE_ID, tableId: APPLICATIONS_TABLE_ID, rowId: id });
      return toApplication(row);
    } catch (err) {
      if (err instanceof AppwriteException && err.code === 404) return null;
      throw err;
    }
  }

  /** Run an applications query and convert the rows. */
  private async query(queries: string[]): Promise<Application[]> {
    const { rows } = await tablesDB.listRows<ApplicationRow>({ databaseId: DATABASE_ID, tableId: APPLICATIONS_TABLE_ID, queries });
    return rows.map(toApplication);
  }
}

/** Turn a database row into the Application shape pages use (answers JSON → object). */
function toApplication(row: ApplicationRow): Application {
  return {
    id: row.$id,
    jobId: row.jobId,
    companyId: row.companyId,
    jobTitle: row.jobTitle,
    applicantId: row.applicantId,
    applicantName: row.applicantName,
    note: row.note ?? '',
    resumeFileId: row.resumeFileId ?? null,
    resumeName: row.resumeName ?? null,
    status: row.status ?? 'submitted',
    answers: parseJson<Answers>(row.answers, {}),
    appliedAt: row.$createdAt,
  };
}
