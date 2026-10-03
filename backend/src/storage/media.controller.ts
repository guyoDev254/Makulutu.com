import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { extractStoredS3Key, StorageService } from './storage.service';

/**
 * Public photo access for a private bucket.
 * Nest signs a short GET URL with the current IAM role (or local aws configure)
 * and redirects. The page HTML only stores `/media?key=creators/…/avatar-….jpg`.
 */
@Controller('media')
export class MediaController {
  constructor(private readonly storage: StorageService) {}

  @Get()
  async serve(@Query('key') key: string, @Res() res: Response) {
    const raw = (key || '').trim();
    if (!raw) {
      throw new BadRequestException('Missing key');
    }
    if (!this.storage.isEnabled()) {
      throw new NotFoundException('Photo not found');
    }
    const objectKey = extractStoredS3Key(raw, this.storage.bucketName());
    if (!objectKey) {
      throw new BadRequestException('Invalid storage key');
    }
    try {
      const signed = await this.storage.getSignedUrl(objectKey);
      res.setHeader('Cache-Control', 'private, no-store');
      res.redirect(302, signed);
    } catch {
      throw new NotFoundException('Photo not found');
    }
  }
}
