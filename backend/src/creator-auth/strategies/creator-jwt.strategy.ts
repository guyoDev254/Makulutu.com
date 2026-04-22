import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CreatorAuthService } from '../creator-auth.service';

@Injectable()
export class CreatorJwtStrategy extends PassportStrategy(Strategy, 'creator-jwt') {
  constructor(
    configService: ConfigService,
    private readonly creatorAuthService: CreatorAuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('CREATOR_JWT_SECRET') ||
        configService.get<string>('JWT_SECRET') ||
        'your-secret-key-change-in-production',
    });
  }

  async validate(payload: { sub?: string; kind?: string }) {
    if (!payload?.sub || payload.kind !== 'creator') {
      throw new UnauthorizedException('Invalid creator token');
    }
    const creator = await this.creatorAuthService.validateCreatorById(payload.sub);
    if (!creator || !creator.isActive) {
      throw new UnauthorizedException('Creator not found or inactive');
    }
    return {
      sub: creator.id,
      email: creator.email,
      kind: 'creator' as const,
    };
  }
}
