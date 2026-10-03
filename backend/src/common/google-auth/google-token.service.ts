import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export type GoogleProfile = {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};

@Injectable()
export class GoogleTokenService {
  private readonly client = new OAuth2Client();

  constructor(private readonly config: ConfigService) {}

  audiences(): string[] {
    return [
      this.config.get<string>('GOOGLE_WEB_CLIENT_ID'),
      this.config.get<string>('GOOGLE_IOS_CLIENT_ID'),
      this.config.get<string>('GOOGLE_ANDROID_CLIENT_ID'),
      this.config.get<string>('GOOGLE_CLIENT_ID'),
    ]
      .map((value) => (value || '').trim())
      .filter(Boolean);
  }

  isConfigured(): boolean {
    return this.audiences().length > 0;
  }

  async verifyIdToken(idTokenRaw: string): Promise<GoogleProfile> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('Google sign-in is not configured');
    }
    const idToken = (idTokenRaw || '').trim();
    if (!idToken) {
      throw new UnauthorizedException('Missing Google token');
    }
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.audiences(),
      });
      const payload = ticket.getPayload();
      const email = payload?.email?.trim().toLowerCase();
      if (!payload?.sub || !email) {
        throw new UnauthorizedException('Google account has no email');
      }
      if (payload.email_verified === false) {
        throw new UnauthorizedException('Google email is not verified');
      }
      return {
        googleId: payload.sub,
        email,
        emailVerified: true,
        name: payload.name?.trim() || payload.given_name?.trim() || null,
        picture: payload.picture || null,
      };
    } catch (err) {
      if (
        err instanceof UnauthorizedException ||
        err instanceof ServiceUnavailableException
      ) {
        throw err;
      }
      throw new UnauthorizedException('Invalid Google sign-in');
    }
  }
}
