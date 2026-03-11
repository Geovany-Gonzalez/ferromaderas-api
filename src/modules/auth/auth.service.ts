import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import type { UserPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.users.findByUsername(username);
    if (!user || user.status !== 'activo') return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? user : null;
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }
    if (user.mustChangePassword) {
      throw new UnauthorizedException(
        'Debes cambiar tu contraseña primero. Revisa el enlace que te enviamos por correo.',
      );
    }
    await this.users.updateLastLogin(user.id);
    const payload: UserPayload = {
      sub: user.id,
      username: user.username,
      role: user.role.slug,
      permissions: user.role.permissions.map((rp) => rp.permission.slug),
    };
    return {
      access_token: this.jwt.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role.slug,
        permissions: payload.permissions,
      },
    };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const msg = 'Si el correo existe, recibirás una contraseña temporal. Revisa tu bandeja de entrada.';
    if (!email) {
      throw new UnauthorizedException('Correo requerido');
    }
    const user = await this.users.findByEmail(email);
    if (!user || user.status !== 'activo') {
      return { message: msg };
    }
    const tempPassword = this.generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);
    await this.users.updatePassword(user.id, hash, true);
    const token = this.jwt.sign(
      { sub: user.id, purpose: 'force-password-change' },
      { expiresIn: '1d' },
    );
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:4200';
    const changePasswordUrl = `${frontendUrl}/cambiar-password?token=${encodeURIComponent(token)}`;

    if (!this.mail.isConfigured()) {
      return { message: msg };
    }

    // Envío en segundo plano para no bloquear la respuesta
    this.mail
      .sendPasswordReset(user.email, user.username, tempPassword, changePasswordUrl)
      .catch((err) => console.error('[AuthService] Error enviando email de recuperación:', err));
    return { message: msg };
  }

  async forcePasswordChange(
    token: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    if (!token || !currentPassword || !newPassword) {
      throw new UnauthorizedException('Token, contraseña actual y nueva son requeridos');
    }
    if (newPassword.length < 8) {
      throw new UnauthorizedException('La nueva contraseña debe tener al menos 8 caracteres');
    }
    let payload: { sub: string; purpose?: string };
    try {
      payload = this.jwt.verify(token) as { sub: string; purpose?: string };
    } catch {
      throw new UnauthorizedException('Enlace inválido o expirado. Solicita uno nuevo.');
    }
    if (payload.purpose !== 'force-password-change') {
      throw new UnauthorizedException('Enlace inválido');
    }
    const user = await this.users.findById(payload.sub);
    if (!user || user.status !== 'activo') {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await this.users.updatePassword(user.id, hash);
    await this.users.clearMustChangePassword(user.id);
    return { message: 'Contraseña actualizada. Ya puedes iniciar sesión.' };
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  }

  async validateToken(payload: UserPayload) {
    const user = await this.users.findById(payload.sub);
    if (!user || user.status !== 'activo') return null;
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role.slug,
      permissions: user.role.permissions.map((rp) => rp.permission.slug),
    };
  }
}
