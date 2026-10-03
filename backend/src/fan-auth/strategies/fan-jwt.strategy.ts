import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { FanAuthService } from '../fan-auth.service';

@Injectable()
export class FanJwtStrategy extends PassportStrategy(Strategy, 'fan-jwt') {
  constructor(
    configService: ConfigService,
    private readonly fanAuthService: FanAuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('FAN_JWT_SECRET') ||
        configService.get<string>('JWT_SECRET') ||
        'your-secret-key-change-in-production',
    });
  }

  async validate(payload: { sub?: string; kind?: string }) {
    if (!payload?.sub || payload.kind !== 'fan') {
      throw new UnauthorizedException('Invalid fan token');
    }
    const fan = await this.fanAuthService.validateFanById(payload.sub);
    if (!fan || !fan.isActive) {
      throw new UnauthorizedException('Fan not found or inactive');
    }
    return {
      sub: fan.id,
      phone: fan.phone,
      kind: 'fan' as const,
    };
  }
}
