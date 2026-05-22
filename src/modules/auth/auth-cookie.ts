import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';

/** Debe coincidir con JwtModule signOptions.expiresIn (11h). */
const AUTH_COOKIE_MAX_AGE_MS = 11 * 60 * 60 * 1000;

export function authCookieName(config: ConfigService): string {
  return config.get<string>('AUTH_COOKIE_NAME')?.trim() || 'fm_access_token';
}

/** Cookie HttpOnly: mismo site que el front cuando usás rewrite /api (Vercel → Railway). */
export function setAuthCookie(
  res: Response,
  token: string,
  config: ConfigService,
): void {
  const name = authCookieName(config);
  const crossOrigin = config.get<string>('AUTH_CROSS_ORIGIN') === 'true';
  const isProd = config.get<string>('NODE_ENV') === 'production';
  res.cookie(name, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: crossOrigin ? 'none' : 'lax',
    path: '/api',
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  });
}

export function clearAuthCookie(res: Response, config: ConfigService): void {
  const name = authCookieName(config);
  const crossOrigin = config.get<string>('AUTH_CROSS_ORIGIN') === 'true';
  const isProd = config.get<string>('NODE_ENV') === 'production';
  res.clearCookie(name, {
    path: '/api',
    httpOnly: true,
    secure: isProd,
    sameSite: crossOrigin ? 'none' : 'lax',
  });
}
