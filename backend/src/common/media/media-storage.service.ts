import { Injectable } from '@nestjs/common';
import { StorageService } from '../../storage/storage.service';
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

export type CreatorMediaSlot = 'avatar';

export const CREATOR_MEDIA_SLOTS: CreatorMediaSlot[] = ['avatar'];

export function isCreatorMediaSlot(value: string): value is CreatorMediaSlot {
  return value === 'avatar';
}

export function creatorMediaColumn(
  slot: CreatorMediaSlot,
): 'avatarUrl' {
  return 'avatarUrl';
}

export function creatorMediaObjectKey(
  creatorId: string,
  slot: CreatorMediaSlot,
  ext: string,
): string {
  return `creators/${creatorId}/profile/${slot}-${Date.now()}.${ext}`;
}

export function fanAvatarObjectKey(fanId: string, ext: string): string {
  return `users/${fanId}/profile/avatar-${Date.now()}.${ext}`;
}

type StoredFile = {
  key: string;
};

@Injectable()
export class MediaStorageService {
  constructor(private readonly storage: StorageService) {}

  isRemote(): boolean {
    return this.storage.isEnabled();
  }

  resolveUrl(stored: string | null | undefined): Promise<string | null> {
    return this.storage.resolveUrl(stored);
  }

  async putCreatorImage(opts: {
    creatorId: string;
    slot: CreatorMediaSlot;
    buffer: Buffer;
    ext: string;
    contentType: string;
    origin: string;
    previousUrl?: string | null;
  }): Promise<StoredFile> {
    if (opts.previousUrl) {
      await this.deleteStored(opts.previousUrl);
    }
    const key = creatorMediaObjectKey(opts.creatorId, opts.slot, opts.ext);
    if (this.storage.isEnabled()) {
      try {
        await this.storage.upload({
          key,
          body: opts.buffer,
          contentType: opts.contentType,
        });
        return { key };
      } catch (err) {
        if (!this.storage.disableIfCredentialsMissing(err)) throw err;
      }
    }
    return this.writeLocalCreatorImage(opts);
  }

  async putFanAvatar(opts: {
    fanId: string;
    buffer: Buffer;
    ext: string;
    contentType: string;
    origin: string;
    previousUrl?: string | null;
  }): Promise<StoredFile> {
    if (opts.previousUrl) {
      await this.deleteStored(opts.previousUrl);
    }
    const key = fanAvatarObjectKey(opts.fanId, opts.ext);
    if (this.storage.isEnabled()) {
      try {
        await this.storage.upload({
          key,
          body: opts.buffer,
          contentType: opts.contentType,
        });
        return { key };
      } catch (err) {
        if (!this.storage.disableIfCredentialsMissing(err)) throw err;
      }
    }
    return this.writeLocalFanAvatar(opts);
  }

  private writeLocalCreatorImage(opts: {
    creatorId: string;
    slot: CreatorMediaSlot;
    buffer: Buffer;
    ext: string;
    origin: string;
  }): StoredFile {
    const dir = join(process.cwd(), 'uploads', 'creators', opts.creatorId);
    mkdirSync(dir, { recursive: true });
    const filename = `${opts.slot}-${Date.now()}.${opts.ext}`;
    for (const name of readdirSync(dir)) {
      if (name.startsWith(`${opts.slot}-`) || name.startsWith(`${opts.slot}.`)) {
        unlinkSync(join(dir, name));
      }
    }
    writeFileSync(join(dir, filename), opts.buffer);
    const base = opts.origin.replace(/\/+$/, '');
    return {
      key: `${base}/uploads/creators/${opts.creatorId}/${filename}`,
    };
  }

  private writeLocalFanAvatar(opts: {
    fanId: string;
    buffer: Buffer;
    ext: string;
    origin: string;
  }): StoredFile {
    const dir = join(process.cwd(), 'uploads', 'fan-avatars');
    mkdirSync(dir, { recursive: true });
    const filename = `${opts.fanId}-${Date.now()}.${opts.ext}`;
    for (const name of readdirSync(dir)) {
      if (name.startsWith(`${opts.fanId}-`) || name.startsWith(`${opts.fanId}.`)) {
        unlinkSync(join(dir, name));
      }
    }
    writeFileSync(join(dir, filename), opts.buffer);
    const base = opts.origin.replace(/\/+$/, '');
    return { key: `${base}/uploads/fan-avatars/${filename}` };
  }

  async presignCreatorUpload(opts: {
    creatorId: string;
    slot: CreatorMediaSlot;
    ext: string;
    contentType: string;
  }): Promise<{ uploadUrl: string; key: string; expiresIn: number }> {
    if (!this.storage.isEnabled()) {
      throw new Error('S3 is not configured');
    }
    const key = creatorMediaObjectKey(opts.creatorId, opts.slot, opts.ext);
    return this.storage.getPresignedUploadUrl({
      key,
      contentType: opts.contentType,
    });
  }

  async deleteStored(stored: string | null | undefined): Promise<void> {
    const trimmed = (stored || '').trim();
    if (!trimmed) return;
    if (this.storage.isEnabled()) {
      await this.storage.deleteStored(trimmed);
      return;
    }
    this.deleteLocalByUrl(trimmed);
  }

  private deleteLocalByUrl(url: string) {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname.replace(/^\/+/, '');
      if (!path.startsWith('uploads/')) return;
      const full = join(process.cwd(), path);
      if (existsSync(full)) unlinkSync(full);
    } catch {
      /* ignore */
    }
  }
}
