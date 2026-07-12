import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { authCookieName } from './auth-cookie';

/** JWT opcional: si no hay token, deja pasar con `req.user = null`. */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const cookieNm = authCookieName(this.config);
    const hasCookie = !!req?.cookies?.[cookieNm];
    const hasBearer =
      typeof req?.headers?.authorization === 'string' &&
      req.headers.authorization.startsWith('Bearer ');
    if (!hasCookie && !hasBearer) {
      req.user = null;
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser>(err: unknown, user: TUser): TUser | null {
    if (err || !user) return null;
    return user;
  }
}
