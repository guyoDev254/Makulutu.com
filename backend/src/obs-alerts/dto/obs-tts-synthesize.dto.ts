import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ObsTtsSynthesizeDto {
  @IsString()
  @MinLength(1)
  /** Capped server-side to 5000 UTF-8 bytes for Google TTS. */
  @MaxLength(5000)
  text: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  languageCode?: string;

  /** Google Cloud voice `name`, e.g. en-US-Wavenet-F. Same as player URL ?voice= */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const s = String(value).trim().slice(0, 64);
    return s.length === 0 ? undefined : s;
  })
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9._-]+$/, {
    message: 'voiceName must be a valid Google TTS voice id',
  })
  voiceName?: string;
}
