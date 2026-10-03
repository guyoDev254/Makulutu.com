import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** Short GET signatures. IAM role session tokens are themselves short-lived. */
const SIGNED_GET_SECONDS = 5 * 60;
const SIGNED_PUT_SECONDS = 15 * 60;

const KEY_PREFIXES = [
  'creators/',
  'users/',
  'posts/',
  'shoutouts/',
  'documents/',
  'temp/',
] as const;

export type UploadBody = {
  key: string;
  body: Buffer;
  contentType: string;
};

export type PresignUploadInput = {
  key: string;
  contentType: string;
  expiresIn?: number;
};

export function isAwsCredentialsError(err: unknown): boolean {
  const name = err && typeof err === 'object' && 'name' in err ? String(err.name) : '';
  const msg = err instanceof Error ? err.message : String(err);
  return (
    name === 'CredentialsProviderError' ||
    /Could not load credentials/i.test(msg) ||
    /credentials from any providers/i.test(msg)
  );
}

/**
 * Empty AWS_* key env vars block the default provider chain (EC2 instance role
 * MakulutuEC2S3Role, or `aws configure` locally). Never put access keys in .env.
 */
export function clearEmptyAwsAccessKeyEnv(): void {
  for (const name of [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_SESSION_TOKEN',
  ]) {
    const value = process.env[name];
    if (value !== undefined && !value.trim()) {
      delete process.env[name];
    }
  }
}

export function extractStoredS3Key(
  stored: string,
  bucket: string,
): string | null {
  const trimmed = stored.trim();
  if (!trimmed) return null;
  if (KEY_PREFIXES.some((p) => trimmed.startsWith(p))) {
    if (trimmed.includes('..')) return null;
    return trimmed.replace(/^\/+/, '');
  }

  const fromMediaQuery = (url: URL): string | null => {
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (path !== '/media' && !path.endsWith('/media')) return null;
    const k = url.searchParams.get('key')?.trim() || '';
    if (!k || k.includes('..')) return null;
    return KEY_PREFIXES.some((p) => k.startsWith(p)) ? k : null;
  };

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      const viaMedia = fromMediaQuery(url);
      if (viaMedia) return viaMedia;
      const path = url.pathname.replace(/^\/+/, '');
      const host = url.hostname.toLowerCase();
      const bucketName = bucket.toLowerCase();
      if (
        host === `${bucketName}.s3.amazonaws.com` ||
        host.startsWith(`${bucketName}.s3.`)
      ) {
        return path.split('?')[0] || null;
      }
      if (host.includes('amazonaws.com') && path.startsWith(`${bucketName}/`)) {
        return path.slice(bucketName.length + 1).split('?')[0] || null;
      }
    } else if (trimmed.startsWith('/media?') || trimmed.startsWith('media?')) {
      const url = new URL(
        trimmed.startsWith('/') ? trimmed : `/${trimmed}`,
        'http://local.invalid',
      );
      return fromMediaQuery(url);
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Private bucket `makulutu` in eu-north-1.
 *
 * Production EC2: SDK default chain → instance profile MakulutuEC2S3Role.
 * Local Mac: `aws configure` (~/.aws), never git, never .env keys.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly region: string;
  private usable = true;

  constructor(private readonly config: ConfigService) {
    clearEmptyAwsAccessKeyEnv();
    this.bucket = this.config.get<string>('AWS_S3_BUCKET')?.trim() || '';
    this.region =
      this.config.get<string>('AWS_REGION')?.trim() || 'eu-north-1';

    if (this.bucket) {
      this.client = new S3Client({
        region: this.region,
      });
      this.logger.log(
        `S3 enabled for bucket ${this.bucket} (${this.region}) using the default credential provider chain (EC2 role MakulutuEC2S3Role, or local aws configure)`,
      );
    } else {
      this.client = null;
      this.logger.warn(
        'AWS_S3_BUCKET is not set — uploads stay on local disk',
      );
    }
  }

  isEnabled(): boolean {
    return Boolean(this.client && this.bucket && this.usable);
  }

  bucketName(): string {
    return this.bucket;
  }

  /** After a credentials failure, skip S3 so local disk uploads can proceed. */
  disableIfCredentialsMissing(err: unknown): boolean {
    if (!isAwsCredentialsError(err)) return false;
    if (this.usable) {
      this.logger.warn(
        'S3 credentials are not available. Photos will be stored on local disk. On the Mac run `aws configure`. On EC2 use instance role MakulutuEC2S3Role — do not put AWS_ACCESS_KEY_ID in .env.',
      );
    }
    this.usable = false;
    return true;
  }

  /** Stable API path. HTML must not embed IAM-session-bound S3 signatures. */
  mediaProxyPath(key: string): string {
    return `/media?key=${encodeURIComponent(key)}`;
  }

  async upload(input: UploadBody): Promise<{ key: string }> {
    if (!this.client) {
      throw new Error('S3 is not configured');
    }
    const key = input.key.replace(/^\/+/, '');
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: input.body,
          ContentType: input.contentType,
          CacheControl: 'private, max-age=31536000, immutable',
        }),
      );
    } catch (err) {
      this.disableIfCredentialsMissing(err);
      throw err;
    }
    return { key };
  }

  async getSignedUrl(
    key: string,
    expiresIn = SIGNED_GET_SECONDS,
  ): Promise<string> {
    if (!this.client) {
      throw new Error('S3 is not configured');
    }
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key.replace(/^\/+/, ''),
    });
    try {
      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (err) {
      this.disableIfCredentialsMissing(err);
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client) return;
    const objectKey = key.replace(/^\/+/, '');
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
        }),
      );
    } catch (err) {
      this.logger.warn(
        `Could not delete s3://${this.bucket}/${objectKey}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async getPresignedUploadUrl(
    input: PresignUploadInput,
  ): Promise<{ uploadUrl: string; key: string; expiresIn: number }> {
    if (!this.client) {
      throw new Error('S3 is not configured');
    }
    const key = input.key.replace(/^\/+/, '');
    const expiresIn = input.expiresIn ?? SIGNED_PUT_SECONDS;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: input.contentType,
      CacheControl: 'private, max-age=31536000, immutable',
    });
    try {
      const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });
      return { uploadUrl, key, expiresIn };
    } catch (err) {
      this.disableIfCredentialsMissing(err);
      throw err;
    }
  }

  /**
   * Browser-facing URL for a stored key.
   * Returns `/media?key=…` so pages never cache a signature that dies with the
   * EC2 role session. GET /media 302s to a fresh presigned S3 URL.
   */
  async resolveUrl(stored: string | null | undefined): Promise<string | null> {
    const trimmed = (stored || '').trim();
    if (!trimmed) return null;
    if (!this.isEnabled()) return trimmed;
    const key = extractStoredS3Key(trimmed, this.bucket);
    if (!key) return trimmed;
    return this.mediaProxyPath(key);
  }

  async resolveAvatar<T extends { avatarUrl?: string | null }>(
    row: T | null | undefined,
  ): Promise<T | null> {
    if (!row) return null;
    return {
      ...row,
      avatarUrl: await this.resolveUrl(row.avatarUrl),
    };
  }

  async deleteStored(stored: string | null | undefined): Promise<void> {
    const trimmed = (stored || '').trim();
    if (!trimmed || !this.client) return;
    const key = extractStoredS3Key(trimmed, this.bucket);
    if (key) await this.delete(key);
  }
}
