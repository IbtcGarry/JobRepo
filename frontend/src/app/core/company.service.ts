// Companies: load, list and update company pages, and replace a company's logo.
// Table `companies` (row ID = the company's address slug, e.g. umbrella-corp) and the `uploads` bucket.

import { Injectable, signal } from '@angular/core';
import { AppwriteException, ID, Models, Permission, Role } from 'appwrite';

import { slugify } from '../data/job-format';
import { COMPANIES_TABLE_ID, DATABASE_ID, UPLOADS_BUCKET_ID, storage, tablesDB } from './appwrite';

/** A company page as pages use it (row ID = address slug, e.g. umbrella-corp). */
export interface Company {
  id: string;
  name: string;
  bio: string;
  locations: string[];
  logoFileId: string | null;
}

type CompanyRow = Models.Row & Omit<Company, 'id'>;

// Logo uploads: allowed image types and the 5 MB size limit.
export const LOGO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
export const LOGO_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Company pages. Security is intentionally loose while JobTest is a dummy site:
 * any signed-in user can update a company row or its logo.
 */
@Injectable({ providedIn: 'root' })
export class CompanyService {
  /** Logo address per company ID, filled in by loadLogos (null = the company has no logo). */
  readonly logos = signal<Record<string, string | null>>({});
  /** Companies whose logo is already loaded or loading, so each is fetched only once. */
  private readonly requested = new Set<string>();

  /** Make sure these companies' logos are in `logos` (used by job cards). */
  async loadLogos(companyIds: string[]): Promise<void> {
    const missing = [...new Set(companyIds)].filter((id) => !this.requested.has(id));
    if (!missing.length) return;
    missing.forEach((id) => this.requested.add(id));
    const found = await Promise.all(missing.map((id) => this.get(id).catch(() => null)));
    this.logos.update((all) => {
      const next = { ...all };
      missing.forEach((id, i) => (next[id] = this.logoUrl(found[i]?.logoFileId ?? null)));
      return next;
    });
  }

  /** Load one company by its row ID (e.g. umbrella-corp); null when it doesn't exist. */
  async get(id: string): Promise<Company | null> {
    try {
      const row = await tablesDB.getRow<CompanyRow>({ databaseId: DATABASE_ID, tableId: COMPANIES_TABLE_ID, rowId: id });
      return toCompany(row);
    } catch (err) {
      if (err instanceof AppwriteException && err.code === 404) return null;
      throw err;
    }
  }

  /** Load every company, for the Companies page. */
  async list(): Promise<Company[]> {
    const { rows } = await tablesDB.listRows<CompanyRow>({ databaseId: DATABASE_ID, tableId: COMPANIES_TABLE_ID });
    return rows.map(toCompany);
  }

  /** Create a company with its slug as the ID (e.g. "Acme Labs" → acme-labs); returns the ID. */
  async create(name: string): Promise<string> {
    const id = slugify(name);
    if (!id) throw new Error('Pick a company name with letters or numbers.');
    if (await this.get(id)) throw new Error(`A company called "${name.trim()}" already exists.`);
    await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: COMPANIES_TABLE_ID,
      rowId: id,
      data: { name: name.trim(), bio: '', locations: [] },
    });
    return id;
  }

  /** Save changed fields of a company page. */
  async update(id: string, data: Partial<Omit<Company, 'id'>>): Promise<void> {
    await tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: COMPANIES_TABLE_ID, rowId: id, data });
  }

  /** Upload a new logo, point the company at it, then delete the old one. */
  async replaceLogo(id: string, file: File, previousFileId: string | null): Promise<string> {
    const uploaded = await storage.createFile({
      bucketId: UPLOADS_BUCKET_ID,
      fileId: ID.unique(),
      file,
      permissions: [Permission.read(Role.any()), Permission.update(Role.users()), Permission.delete(Role.users())],
    });
    await this.update(id, { logoFileId: uploaded.$id });
    this.logos.update((all) => ({ ...all, [id]: this.logoUrl(uploaded.$id) }));
    if (previousFileId) {
      await storage.deleteFile({ bucketId: UPLOADS_BUCKET_ID, fileId: previousFileId }).catch(() => undefined);
    }
    return uploaded.$id;
  }

  /** Address of a logo image, or null when the company has none. */
  logoUrl(fileId: string | null): string | null {
    return fileId ? storage.getFileView({ bucketId: UPLOADS_BUCKET_ID, fileId }) : null;
  }
}

/** Turn a database row into the Company shape pages use. */
function toCompany(row: CompanyRow): Company {
  return {
    id: row.$id,
    name: row.name,
    bio: row.bio ?? '',
    locations: row.locations ?? [],
    logoFileId: row.logoFileId ?? null,
  };
}

