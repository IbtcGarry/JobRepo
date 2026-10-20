// Jobs: list open jobs for the board and map, a company's jobs for its admins,
// and create / update / close / reopen / delete. Table `jobs`.
// Screening questions are stored as JSON text and turned back into objects in toJob().

import { Injectable } from '@angular/core';
import { AppwriteException, ID, Models, Query } from 'appwrite';

import { isExpired } from '../data/job-format';
import { Job, JobStatus } from '../data/jobs';
import { ScreeningQuestion, parseJson } from '../data/screening';
import { APPLICATIONS_TABLE_ID, DATABASE_ID, JOBS_TABLE_ID, tablesDB } from './appwrite';

/** What the job form supplies; poster and view count are set by the service. */
export type NewJob = Omit<Job, 'id' | 'postedAt' | 'status' | 'postedByName' | 'postedById' | 'views'>;

type JobRow = Models.Row &
  Omit<Job, 'id' | 'postedAt' | 'status' | 'postedByName' | 'postedById' | 'questions' | 'views' | 'expiresAt'> & {
    views: number | null;
    expiresAt: string | null;
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
  /** Open, unexpired jobs for the public board and map. */
  async list(): Promise<Job[]> {
    const jobs = await this.query([Query.equal('status', 'open'), Query.orderDesc('$createdAt'), Query.limit(100)]);
    return jobs.filter((j) => !isExpired(j));
  }

  /** Several jobs by ID (for saved jobs), in the order given; missing ones are skipped. */
  async getMany(ids: string[]): Promise<Job[]> {
    if (!ids.length) return [];
    const jobs = await this.query([Query.equal('$id', ids), Query.limit(100)]);
    return ids.map((id) => jobs.find((j) => j.id === id)).filter((j): j is Job => !!j);
  }

  /** Count one view of a job page (signed-in visitors only; failures are ignored). */
  async countView(id: string): Promise<void> {
    await tablesDB.incrementRowColumn({ databaseId: DATABASE_ID, tableId: JOBS_TABLE_ID, rowId: id, column: 'views', value: 1 }).catch(() => undefined);
  }

  /** A company's jobs: open ones only, or every job (drafts and closed too) for its admins. */
  async listForCompany(companyId: string, { includeClosed = false } = {}): Promise<Job[]> {
    const jobs = await this.query([
      Query.equal('companyId', companyId),
      ...(includeClosed ? [] : [Query.equal('status', 'open')]),
      Query.orderDesc('$createdAt'),
      Query.limit(100),
    ]);
    return includeClosed ? jobs : jobs.filter((j) => !isExpired(j));
  }

  /** Load one job by ID; null when it doesn't exist. */
  async get(id: string): Promise<Job | null> {
    try {
      return toJob(await tablesDB.getRow<JobRow>({ databaseId: DATABASE_ID, tableId: JOBS_TABLE_ID, rowId: id }));
    } catch (err) {
      if (err instanceof AppwriteException && err.code === 404) return null;
      throw err;
    }
  }

  /** Post a new job (open, or a draft) with who posted it, and return its new ID. */
  async create(job: NewJob, poster: { id: string; name: string }, status: JobStatus = 'open'): Promise<string> {
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
        status,
        views: 0,
      },
    });
    return row.$id;
  }

  /** Save an edited job (status and poster are left unchanged). */
  async update(id: string, job: NewJob): Promise<void> {
    const { company, questions, ...rest } = job;
    await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: JOBS_TABLE_ID,
      rowId: id,
      data: { ...rest, companyName: company, questions: JSON.stringify(questions) },
    });
  }

  /** Open or close a job; closed jobs leave the board but stay in the company admin. */
  async setStatus(id: string, status: JobStatus): Promise<void> {
    await tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: JOBS_TABLE_ID, rowId: id, data: { status } });
  }

  /** Remove a job for good, together with its applications. */
  async delete(id: string): Promise<void> {
    const { rows } = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: APPLICATIONS_TABLE_ID,
      queries: [Query.equal('jobId', id), Query.select(['$id']), Query.limit(500)],
    });
    await Promise.all(rows.map((r) => tablesDB.deleteRow({ databaseId: DATABASE_ID, tableId: APPLICATIONS_TABLE_ID, rowId: r.$id })));
    await tablesDB.deleteRow({ databaseId: DATABASE_ID, tableId: JOBS_TABLE_ID, rowId: id });
  }

  /** Run a jobs query and convert the rows. */
  private async query(queries: string[]): Promise<Job[]> {
    const { rows } = await tablesDB.listRows<JobRow>({ databaseId: DATABASE_ID, tableId: JOBS_TABLE_ID, queries });
    return rows.map(toJob);
  }
}

/** Turn a database row into the Job shape pages use (questions JSON → objects). */
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
    views: row.views ?? 0,
    expiresAt: row.expiresAt ?? null,
    postedByName: row.postedByName ?? null,
    postedById: row.postedBy ?? null,
    questions: parseJson<ScreeningQuestion[]>(row.questions, []),
  };
}

