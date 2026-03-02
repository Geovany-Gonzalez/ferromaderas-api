import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { UserPayload } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    try {
      return await this.auth.login(body.username, body.password);
    } catch (err: unknown) {
      if (err instanceof UnauthorizedException) throw err;
      const e = err as { code?: string; message?: string };
      const isDbError =
        e?.code?.startsWith('P10') ||
        e?.message?.includes('connect') ||
        e?.message?.includes('database');
      if (isDbError) {
        throw new ServiceUnavailableException(
          'No se puede conectar a la base de datos. Revisa el .env (DATABASE_URL) y que PostgreSQL esté corriendo.',
        );
      }
      throw err;
    }
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
