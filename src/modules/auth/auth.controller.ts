import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  ServiceUnavailableException,
  UnauthorizedException,
  Res,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { UserPayload } from './auth.types';
import { clearAuthCookie, setAuthCookie } from './auth-cookie';
import { QuotesService } from '../quotes/quotes.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    private readonly quotes: QuotesService,
  ) {}

  @Post('login')
  async login(
    @Body() body: { username: string; password: string },
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    try {
      const result = await this.auth.login(
        body.username,
        body.password,
        req.ip ?? req.socket?.remoteAddress,
      );
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

  @Post('register-client')
  async registerClient(
    @Body() body: { email: string; password: string; name: string; phone?: string },
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const result = await this.auth.registerClient(body, req.ip ?? req.socket?.remoteAddress);
    const linkedQuotes = await this.quotes.linkQuotesToCliente(
      result.user.id,
      result.user.email,
    );
    setAuthCookie(res, result.access_token, this.config);
    return { user: result.user, linkedQuotes };
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

  /** Panel de seguridad visible (alcance punto 15). Solo personal interno autenticado. */
  @Get('security-overview')
  @UseGuards(JwtAuthGuard)
  async securityOverview(@CurrentUser() payload: UserPayload, @Req() req: Request) {
    return this.auth.getSecurityOverview(payload, {
      protocol: req.protocol,
      host: req.get('host') ?? undefined,
    });
  }
}
