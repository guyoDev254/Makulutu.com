import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class FanJwtAuthGuard extends AuthGuard('fan-jwt') {}
