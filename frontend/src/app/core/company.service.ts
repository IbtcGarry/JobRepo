import { Injectable } from '@angular/core';
import { AppwriteException, ID, Models, Permission, Role } from 'appwrite';

import { COMPANIES_TABLE_ID, DATABASE_ID, UPLOADS_BUCKET_ID, storage, tablesDB } from './appwrite';

export interface Company {
  id: string;
  name: string;
  bio: string;
  locations: string[];
  logoFileId: string | null;
}

type CompanyRow = Models.Row & Omit<Company, 'id'>;

export const LOGO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
export const LOGO_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Company pages. Security is intentionally loose while JobTest is a dummy site:
 * any signed-in user can update a company row or its logo.
 */
@Injectable({ providedIn: 'root' })
export class CompanyService {
  async get(id: string): Promise<Company | null> {
    try {
      const row = await tablesDB.getRow<CompanyRow>({ databaseId: DATABASE_ID, tableId: COMPANIES_TABLE_ID, rowId: id });
      return toCompany(row);
    } catch (err) {
      if (err instanceof AppwriteException && err.code === 404) return null;
      throw err;
    }
  }

  async list(): Promise<Company[]> {
    const { rows } = await tablesDB.listRows<CompanyRow>({ databaseId: DATABASE_ID, tableId: COMPANIES_TABLE_ID });
    return rows.map(toCompany);
  }

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
    if (previousFileId) {
      await storage.deleteFile({ bucketId: UPLOADS_BUCKET_ID, fileId: previousFileId }).catch(() => undefined);
    }
    return uploaded.$id;
  }

  logoUrl(fileId: string | null): string | null {
    return fileId ? storage.getFileView({ bucketId: UPLOADS_BUCKET_ID, fileId }) : null;
  }
}

function toCompany(row: CompanyRow): Company {
  return {
    id: row.$id,
    name: row.name,
    bio: row.bio ?? '',
    locations: row.locations ?? [],
    logoFileId: row.logoFileId ?? null,
  };
}
