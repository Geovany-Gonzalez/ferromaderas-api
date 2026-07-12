import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import type { UserPayload } from './auth.types';
import { authCookieName } from './auth-cookie';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
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

  /**
   * Resuelve el usuario en cada petición contra la BD (no solo lo que venía
   * firmado en el token). Así los permisos siempre están vigentes: si a un rol
   * se le agrega/quita un permiso o se desactiva al usuario, aplica de inmediato
   * sin necesidad de volver a iniciar sesión.
   */
  async validate(payload: UserPayload): Promise<UserPayload> {
    if (!payload.sub) throw new UnauthorizedException();
    const fresh = await this.authService.validateToken(payload);
    if (!fresh) throw new UnauthorizedException('Sesión inválida o usuario inactivo.');
    return {
      sub: fresh.id,
      username: fresh.username,
      role: fresh.role,
      permissions: fresh.permissions,
    };
  }
}
