import { Injectable } from '@angular/core';
import { AppwriteException, ID, Models, Query } from 'appwrite';

import { Job, JobStatus } from '../data/jobs';
import { ScreeningQuestion, parseJson } from '../data/screening';
import { DATABASE_ID, JOBS_TABLE_ID, tablesDB } from './appwrite';

/** What the job form supplies; status and poster are set by the service. */
export type NewJob = Omit<Job, 'id' | 'postedAt' | 'status' | 'postedByName'>;

type JobRow = Models.Row &
  Omit<Job, 'id' | 'postedAt' | 'status' | 'postedByName' | 'questions'> & {
    /** Screening questions as JSON. */
    questions: string | null;
    companyName: string;
    postedBy: string | null;
    postedByName: string | null;
    status: JobStatus | null;
  };

/** Job listings. Like companies, security is loose while JobTest is a dummy site. */
@Injectable({ providedIn: 'root' })
export class JobService {
  /** Open jobs for the public board. */
  async list(): Promise<Job[]> {
    return this.query([Query.equal('status', 'open'), Query.orderDesc('$createdAt'), Query.limit(100)]);
  }

  /** A company's jobs: open ones only, or every job for its admins. */
  async listForCompany(companyId: string, { includeClosed = false } = {}): Promise<Job[]> {
    return this.query([
      Query.equal('companyId', companyId),
      ...(includeClosed ? [] : [Query.equal('status', 'open')]),
      Query.orderDesc('$createdAt'),
      Query.limit(100),
    ]);
  }

  async get(id: string): Promise<Job | null> {
    try {
      return toJob(await tablesDB.getRow<JobRow>({ databaseId: DATABASE_ID, tableId: JOBS_TABLE_ID, rowId: id }));
    } catch (err) {
      if (err instanceof AppwriteException && err.code === 404) return null;
      throw err;
    }
  }

  async create(job: NewJob, poster: { id: string; name: string }): Promise<string> {
    const { company, questions, ...rest } = job;
    const row = await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: JOBS_TABLE_ID,
      rowId: ID.unique(),
      data: {
        ...rest,
        companyName: company,
        questions: JSON.stringify(questions),
        postedBy: poster.id,
        postedByName: poster.name,
        status: 'open',
      },
    });
    return row.$id;
  }

  async update(id: string, job: NewJob): Promise<void> {
    const { company, questions, ...rest } = job;
    await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: JOBS_TABLE_ID,
      rowId: id,
      data: { ...rest, companyName: company, questions: JSON.stringify(questions) },
    });
  }

  async setStatus(id: string, status: JobStatus): Promise<void> {
    await tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: JOBS_TABLE_ID, rowId: id, data: { status } });
  }

  async delete(id: string): Promise<void> {
    await tablesDB.deleteRow({ databaseId: DATABASE_ID, tableId: JOBS_TABLE_ID, rowId: id });
  }

  private async query(queries: string[]): Promise<Job[]> {
    const { rows } = await tablesDB.listRows<JobRow>({ databaseId: DATABASE_ID, tableId: JOBS_TABLE_ID, queries });
    return rows.map(toJob);
  }
}

function toJob(row: JobRow): Job {
  return {
    id: row.$id,
    companyId: row.companyId,
    company: row.companyName,
    title: row.title,
    role: row.role,
    location: row.location,
    address: row.address ?? row.location,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    description: row.description,
    workplace: row.workplace ?? null,
    type: row.type ?? null,
    level: row.level ?? null,
    companySize: row.companySize ?? null,
    salaryMin: row.salaryMin ?? null,
    salaryMax: row.salaryMax ?? null,
    equity: row.equity ?? null,
    visaSponsorship: row.visaSponsorship ?? false,
    skills: row.skills ?? [],
    postedAt: row.$createdAt,
    status: row.status ?? 'open',
    postedByName: row.postedByName ?? null,
    questions: parseJson<ScreeningQuestion[]>(row.questions, []),
  };
}
