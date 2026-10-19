import { Injectable } from '@angular/core';
import { AppwriteException, ID, Models, Query } from 'appwrite';

import { Job } from '../data/jobs';
import { Answers, parseJson } from '../data/screening';
import { APPLICATIONS_TABLE_ID, DATABASE_ID, tablesDB } from './appwrite';
import { Profile } from './profile.service';

/** Where an application stands with the employer. */
export type ApplicationStatus = 'submitted' | 'interview' | 'rejected';

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

  async findMine(jobId: string, userId: string): Promise<Application | null> {
    const rows = await this.query([Query.equal('jobId', jobId), Query.equal('applicantId', userId), Query.limit(1)]);
    return rows[0] ?? null;
  }

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

  async setStatus(id: string, status: ApplicationStatus): Promise<void> {
    await tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: APPLICATIONS_TABLE_ID, rowId: id, data: { status } });
  }

  async get(id: string): Promise<Application | null> {
    try {
      const row = await tablesDB.getRow<ApplicationRow>({ databaseId: DATABASE_ID, tableId: APPLICATIONS_TABLE_ID, rowId: id });
      return toApplication(row);
    } catch (err) {
      if (err instanceof AppwriteException && err.code === 404) return null;
      throw err;
    }
  }

  private async query(queries: string[]): Promise<Application[]> {
    const { rows } = await tablesDB.listRows<ApplicationRow>({ databaseId: DATABASE_ID, tableId: APPLICATIONS_TABLE_ID, queries });
    return rows.map(toApplication);
  }
}

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
