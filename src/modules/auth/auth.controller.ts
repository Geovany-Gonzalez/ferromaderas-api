import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  ServiceUnavailableException,
  UnauthorizedException,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { UserPayload } from './auth.types';
import { clearAuthCookie, setAuthCookie } from './auth-cookie';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  async login(
    @Body() body: { username: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.auth.login(body.username, body.password);
      setAuthCookie(res, result.access_token, this.config);
      return { user: result.user };
    } catch (err: unknown) {
      if (err instanceof UnauthorizedException) throw err;
      const e = err as { code?: string; message?: string };
      const isDbError =
        e?.code?.startsWith('P10') ||
        e?.message?.includes('connect') ||
        e?.message?.includes('database');
      if (isDbError) {
        throw new ServiceUnavailableException(
          'El servicio no está disponible en este momento.',
        );
      }
      throw err;
    }
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    clearAuthCookie(res, this.config);
    return { ok: true };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.auth.forgotPassword(body.email?.trim()?.toLowerCase());
  }

  @Post('force-password-change')
  async forcePasswordChange(
    @Body() body: { token: string; currentPassword: string; newPassword: string },
  ) {
    return this.auth.forcePasswordChange(
      body.token,
      body.currentPassword,
      body.newPassword,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() payload: UserPayload) {
    const user = await this.auth.validateToken(payload);
    if (!user) return { user: null };
    return { user };
  }
}
