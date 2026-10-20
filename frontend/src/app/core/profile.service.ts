// Profiles: username, roles (seeker / employer), occupation, bio, resume, profile picture,
// saved jobs, public / private, and the user's company + role.
// Table `profiles` (one row per user, row ID = user ID) and files in the `uploads` bucket.
// Used by the account page, the apply page and the applicants pages.

import { Injectable, signal } from '@angular/core';
import { AppwriteException, ID, Models, Permission, Query, Role } from 'appwrite';

import { DATABASE_ID, PROFILES_TABLE_ID, UPLOADS_BUCKET_ID, storage, tablesDB } from './appwrite';

/** What a user does on JobTest: look for work, hire, or both. */
export type UserRole = 'seeker' | 'employer';

/** A user's profile as pages use it (one row per user in the profiles table). */
export interface Profile {
  /** Same as the user's account ID. */
  id: string;
  /** Lowercase username, stored so others can find and invite this user. */
  username: string;
  roles: UserRole[];
  /** Shown at /profile/:id to other users when true. */
  isPublic: boolean;
  savedJobIds: string[];
  /** Site moderators can see and act on reports at /admin. */
  siteAdmin: boolean;
  occupation: string;
  bio: string;
  resumeFileId: string | null;
  resumeName: string | null;
  avatarFileId: string | null;
  /** Company the user works for or manages, by its row ID. */
  companyId: string | null;
  companyRole: CompanyRole | null;
}

/** A user's role in their company: owners and managers can edit it, post jobs and review applicants. */
export type CompanyRole = 'owner' | 'manager' | 'member';

/** Owners and managers can edit their company's page. */
export function canEditCompany(profile: Profile | null, companyId: string): boolean {
  return profile?.companyId === companyId && (profile.companyRole === 'owner' || profile.companyRole === 'manager');
}

type ProfileRow = Models.Row & Omit<Profile, 'id'>;

// Upload rules: resumes are PDF / Word up to 10 MB; profile pictures are images up to 5 MB.
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
  /** Signed-in user's own profile (roles, saved jobs, admin flag), or null when logged out. */
  readonly me = signal<Profile | null>(null);

  /** Load the signed-in user's profile and picture (or clear both when logged out). */
  async loadMe(userId: string | null): Promise<void> {
    if (!userId) {
      this.me.set(null);
      return this.avatarUrl.set(null);
    }
    try {
      const profile = await this.get(userId);
      this.me.set(profile);
      this.avatarUrl.set(profile?.avatarFileId ? this.avatarFileUrl(profile.avatarFileId) : null);
    } catch {
      this.me.set(null);
      this.avatarUrl.set(null);
    }
  }

  /** Reload the signed-in user's profile after a change elsewhere. */
  async refreshMe(): Promise<void> {
    const id = this.me()?.id;
    if (id) await this.loadMe(id);
  }

  /** Load a user's profile; null when they haven't saved one yet. */
  async get(userId: string): Promise<Profile | null> {
    try {
      const row = await tablesDB.getRow<ProfileRow>({
        databaseId: DATABASE_ID,
        tableId: PROFILES_TABLE_ID,
        rowId: userId,
      });
      return toProfile(row);
    } catch (err) {
      if (err instanceof AppwriteException && err.code === 404) return null;
      throw err;
    }
  }

  /** Find a user's profile by username (for invites); null when nobody has that name. */
  async findByUsername(username: string): Promise<Profile | null> {
    const { rows } = await tablesDB.listRows<ProfileRow>({
      databaseId: DATABASE_ID,
      tableId: PROFILES_TABLE_ID,
      queries: [Query.equal('username', username.trim().toLowerCase()), Query.limit(1)],
    });
    return rows[0] ? toProfile(rows[0]) : null;
  }

  /** Everyone who works for a company (owners, managers, members). */
  async listForCompany(companyId: string): Promise<Profile[]> {
    const { rows } = await tablesDB.listRows<ProfileRow>({
      databaseId: DATABASE_ID,
      tableId: PROFILES_TABLE_ID,
      queries: [Query.equal('companyId', companyId), Query.limit(100)],
    });
    return rows.map(toProfile);
  }

  /** Save or unsave a job for the signed-in user; returns the new saved list. */
  async toggleSavedJob(userId: string, jobId: string): Promise<string[]> {
    const current = (await this.get(userId))?.savedJobIds ?? [];
    const next = current.includes(jobId) ? current.filter((id) => id !== jobId) : [...current, jobId];
    await this.save(userId, { savedJobIds: next });
    this.me.update((me) => me && { ...me, savedJobIds: next });
    return next;
  }

  /** Create or update the user's profile with the given fields; other fields are left as they are. */
  async save(userId: string, data: Partial<Omit<Profile, 'id'>>): Promise<void> {
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

  /** Unlink the resume from the profile, then delete the file. */
  async removeResume(userId: string, fileId: string): Promise<void> {
    await this.save(userId, { resumeFileId: null, resumeName: null });
    await this.deleteFile(fileId);
  }

  /** Address that opens a resume file in the browser. */
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

  /** Unlink the profile picture, delete the file, and clear the header picture. */
  async removeAvatar(userId: string, fileId: string): Promise<void> {
    await this.save(userId, { avatarFileId: null });
    await this.deleteFile(fileId);
    this.avatarUrl.set(null);
  }

  /** Address of a profile picture image. */
  avatarFileUrl(fileId: string): string {
    return storage.getFileView({ bucketId: UPLOADS_BUCKET_ID, fileId });
  }

  /** Delete a file from the uploads bucket, ignoring failures. */
  private async deleteFile(fileId: string): Promise<void> {
    try {
      await storage.deleteFile({ bucketId: UPLOADS_BUCKET_ID, fileId });
    } catch {
      // The profile no longer points at it; a leftover file is harmless.
    }
  }
}

/** Turn a database row into the Profile shape pages use, with defaults for older rows. */
function toProfile(row: ProfileRow): Profile {
  return {
    id: row.$id,
    username: row.username ?? '',
    roles: row.roles ?? [],
    isPublic: row.isPublic ?? true,
    savedJobIds: row.savedJobIds ?? [],
    siteAdmin: row.siteAdmin ?? false,
    occupation: row.occupation ?? '',
    bio: row.bio ?? '',
    resumeFileId: row.resumeFileId ?? null,
    resumeName: row.resumeName ?? null,
    avatarFileId: row.avatarFileId ?? null,
    companyId: row.companyId ?? null,
    companyRole: row.companyRole ?? null,
  };
}

/** Permissions so only this user can read, change or delete the item. */
function ownerOnly(userId: string): string[] {
  const owner = Role.user(userId);
  return [Permission.read(owner), Permission.update(owner), Permission.delete(owner)];
}
