import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserPayload } from './auth.types';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
