import { Injectable, signal } from '@angular/core';
import { AppwriteException, ID, Models, Permission, Role } from 'appwrite';

import { DATABASE_ID, PROFILES_TABLE_ID, UPLOADS_BUCKET_ID, storage, tablesDB } from './appwrite';

export interface Profile {
  occupation: string;
  bio: string;
  resumeFileId: string | null;
  resumeName: string | null;
  avatarFileId: string | null;
  /** Company the user works for or manages, by its row ID. */
  companyId: string | null;
  companyRole: CompanyRole | null;
}

export type CompanyRole = 'owner' | 'manager' | 'member';

/** Owners and managers can edit their company's page. */
export function canEditCompany(profile: Profile | null, companyId: string): boolean {
  return profile?.companyId === companyId && (profile.companyRole === 'owner' || profile.companyRole === 'manager');
}

type ProfileRow = Models.Row & Profile;

export const RESUME_EXTENSIONS = ['pdf', 'doc', 'docx'];
export const RESUME_MAX_BYTES = 10 * 1024 * 1024;
export const AVATAR_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/**
 * One `profiles` row per user, keyed by the user's ID. Only the owner can edit it; any signed-in
 * user can read profiles and resumes (table / bucket permissions) so employers can review applicants.
 * Profile pictures are readable by anyone so they can appear next to the user's name.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  /** Signed-in user's profile picture URL, shown in the header. */
  readonly avatarUrl = signal<string | null>(null);

  async loadAvatar(userId: string | null): Promise<void> {
    if (!userId) return this.avatarUrl.set(null);
    try {
      const fileId = (await this.get(userId))?.avatarFileId;
      this.avatarUrl.set(fileId ? this.avatarFileUrl(fileId) : null);
    } catch {
      this.avatarUrl.set(null);
    }
  }

  async get(userId: string): Promise<Profile | null> {
    try {
      const row = await tablesDB.getRow<ProfileRow>({
        databaseId: DATABASE_ID,
        tableId: PROFILES_TABLE_ID,
        rowId: userId,
      });
      return {
        occupation: row.occupation ?? '',
        bio: row.bio ?? '',
        resumeFileId: row.resumeFileId ?? null,
        resumeName: row.resumeName ?? null,
        avatarFileId: row.avatarFileId ?? null,
        companyId: row.companyId ?? null,
        companyRole: row.companyRole ?? null,
      };
    } catch (err) {
      if (err instanceof AppwriteException && err.code === 404) return null;
      throw err;
    }
  }

  async save(userId: string, data: Partial<Profile>): Promise<void> {
    await tablesDB.upsertRow({
      databaseId: DATABASE_ID,
      tableId: PROFILES_TABLE_ID,
      rowId: userId,
      data,
      permissions: ownerOnly(userId),
    });
  }

  /** Upload a new resume, point the profile at it, then delete the old file. */
  async replaceResume(userId: string, file: File, previousFileId: string | null): Promise<Profile['resumeFileId']> {
    const uploaded = await storage.createFile({
      bucketId: UPLOADS_BUCKET_ID,
      fileId: ID.unique(),
      file,
      permissions: ownerOnly(userId),
    });
    await this.save(userId, { resumeFileId: uploaded.$id, resumeName: file.name });
    if (previousFileId) await this.deleteFile(previousFileId);
    return uploaded.$id;
  }

  async removeResume(userId: string, fileId: string): Promise<void> {
    await this.save(userId, { resumeFileId: null, resumeName: null });
    await this.deleteFile(fileId);
  }

  resumeUrl(fileId: string): string {
    return storage.getFileView({ bucketId: UPLOADS_BUCKET_ID, fileId });
  }

  /** Upload a new profile picture, point the profile at it, then delete the old one. */
  async replaceAvatar(userId: string, file: File, previousFileId: string | null): Promise<string> {
    const uploaded = await storage.createFile({
      bucketId: UPLOADS_BUCKET_ID,
      fileId: ID.unique(),
      file,
      permissions: [Permission.read(Role.any()), Permission.update(Role.user(userId)), Permission.delete(Role.user(userId))],
    });
    await this.save(userId, { avatarFileId: uploaded.$id });
    if (previousFileId) await this.deleteFile(previousFileId);
    this.avatarUrl.set(this.avatarFileUrl(uploaded.$id));
    return uploaded.$id;
  }

  async removeAvatar(userId: string, fileId: string): Promise<void> {
    await this.save(userId, { avatarFileId: null });
    await this.deleteFile(fileId);
    this.avatarUrl.set(null);
  }

  avatarFileUrl(fileId: string): string {
    return storage.getFileView({ bucketId: UPLOADS_BUCKET_ID, fileId });
  }

  private async deleteFile(fileId: string): Promise<void> {
    try {
      await storage.deleteFile({ bucketId: UPLOADS_BUCKET_ID, fileId });
    } catch {
      // The profile no longer points at it; a leftover file is harmless.
    }
  }
}

function ownerOnly(userId: string): string[] {
  const owner = Role.user(userId);
  return [Permission.read(owner), Permission.update(owner), Permission.delete(owner)];
}
