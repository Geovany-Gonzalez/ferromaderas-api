import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import type { UserPayload } from './auth.types';
import { authCookieName } from './auth-cookie';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const cookieNm = authCookieName(config);
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) =>
          req?.cookies?.[cookieNm] && typeof req.cookies[cookieNm] === 'string'
            ? req.cookies[cookieNm]
            : null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey:
        config.get<string>('JWT_SECRET') ?? 'ferromaderas-secret-change-in-prod',
    });
  }

  async validate(payload: UserPayload): Promise<UserPayload> {
    if (!payload.sub) throw new UnauthorizedException();
    return payload;
  }
}
