import { Injectable, Logger, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { BitacoraService } from '../bitacora/bitacora.service';
import type { UserPayload } from './auth.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly bitacora: BitacoraService,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.users.findByUsername(username);
    if (!user || user.status !== 'activo') return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? user : null;
  }

  async login(username: string, password: string, ip?: string) {
    const user = await this.validateUser(username, password);
    if (!user) {
      await this.bitacora.registrar({
        modulo: 'auth',
        accion: 'login_fallido',
        detalles: { username: username?.trim()?.toLowerCase() ?? null },
        ip,
      });
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
    await this.bitacora.registrar({
      modulo: 'auth',
      accion: 'login',
      usuarioId: user.id,
      detalles: { username: user.username, role: user.role.slug },
      ip,
    });
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
    const isClient = user.role.slug === 'cliente';
    const fromParam = isClient ? '&from=cliente' : '';
    const changePasswordUrl = `${frontendUrl}/cambiar-password?token=${encodeURIComponent(token)}${fromParam}`;
    const displayName = user.name?.trim() || user.username;

    if (!this.mail.isConfigured()) {
      return { message: msg };
    }

    // Envío en segundo plano para no bloquear la respuesta
    this.mail
      .sendPasswordReset(user.email, displayName, tempPassword, changePasswordUrl, isClient)
      .catch((err: unknown) =>
        this.logger.warn(
          `Fallo al enviar correo de recuperación: ${err instanceof Error ? err.message : 'error desconocido'}`,
        ),
      );
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

  /** Registro público de cliente para consultar historial de cotizaciones. */
  async registerClient(
    data: { email: string; password: string; name: string; phone?: string },
    ip?: string,
  ) {
    const email = data.email.trim().toLowerCase();
    if (!email || !data.password?.trim() || !data.name?.trim()) {
      throw new UnauthorizedException('Correo, nombre y contraseña son obligatorios.');
    }
    if (data.password.length < 8) {
      throw new UnauthorizedException('La contraseña debe tener al menos 8 caracteres.');
    }

    const user = await this.users.createClient(
      {
        email,
        password: data.password,
        name: data.name.trim(),
        phone: data.phone,
      },
      { ip },
    );

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

  /** Resumen de seguridad para el panel admin (alcance punto 15 / matriz #8). */
  async getSecurityOverview(
    user: UserPayload,
    opts: { protocol?: string; host?: string },
  ) {
    if (user.role === 'cliente') {
      throw new ForbiddenException('Acceso restringido al personal autorizado.');
    }

    const matrix = await this.users.getRolePermissionMatrix();
    const isHttps = opts.protocol === 'https';
    const isProd = this.config.get<string>('NODE_ENV') === 'production';

    return {
      sesion: {
        usuario: user.username,
        rol: user.role,
        permisos: user.permissions,
        permisosCount: user.permissions.length,
      },
      matriz: matrix,
      controles: [
        {
          id: 'auth',
          titulo: 'Autenticación de usuarios',
          descripcion:
            'Login con credenciales validadas en el servidor. Sesión mediante JWT en cookie HttpOnly (no accesible desde JavaScript).',
          estado: 'activo',
          detalle: 'Cookie HttpOnly + endpoint /api/auth/me',
        },
        {
          id: 'rbac',
          titulo: 'Control de acceso por roles y permisos',
          descripcion:
            'RBAC: cada rol tiene permisos granulares. El menú admin y la API validan permisos en cada operación.',
          estado: 'activo',
          detalle: `${matrix.roles.length} roles internos · ${matrix.permissions.length} permisos`,
        },
        {
          id: 'bcrypt',
          titulo: 'Cifrado de contraseñas',
          descripcion:
            'Las contraseñas se almacenan con bcrypt (hash irreversible). Nunca se guardan en texto plano ni en el navegador.',
          estado: 'activo',
          detalle: 'bcrypt cost factor 10',
        },
        {
          id: 'validation',
          titulo: 'Validación de entradas',
          descripcion:
            'DTOs con class-validator en la API y validación en formularios del frontend antes de enviar datos.',
          estado: 'activo',
          detalle: 'ValidationPipe global en NestJS',
        },
        {
          id: 'guards',
          titulo: 'Protección de rutas administrativas',
          descripcion:
            'Rutas /admin protegidas con authGuard. Endpoints sensibles exigen JwtAuthGuard + PermissionsGuard.',
          estado: 'activo',
          detalle: 'Guards en Angular y NestJS',
        },
        {
          id: 'bitacora',
          titulo: 'Trazabilidad y auditoría',
          descripcion:
            'Bitácora registra logins, cambios críticos y alertas. Consultable en Admin → Bitácora.',
          estado: 'activo',
          detalle: 'Módulo bitácora + tabla bitacora',
        },
        {
          id: 'apikey',
          titulo: 'API Key para sincronización de inventario',
          descripcion:
            'El endpoint bulk-sync de productos exige header X-API-Key; no usa credenciales de usuario.',
          estado: 'activo',
          detalle: 'INVENTORY_SYNC_API_KEY en servidor',
        },
        {
          id: 'https',
          titulo: 'Conexión segura HTTPS',
          descripcion:
            'En producción el sitio y la API deben servirse por HTTPS para cifrar datos en tránsito.',
          estado: isHttps ? 'activo' : isProd ? 'pendiente' : 'desarrollo',
          detalle: isHttps
            ? `Conexión actual: ${opts.protocol}://${opts.host ?? 'servidor'}`
            : 'En localhost se usa HTTP; activar HTTPS al desplegar',
        },
      ],
      rutasProtegidas: [
        { ruta: '/admin/*', guard: 'authGuard + rol interno', permiso: 'Sesión válida' },
        { ruta: '/admin/productos', guard: 'permissionGuard', permiso: 'manage_products' },
        { ruta: '/admin/categorias', guard: 'permissionGuard', permiso: 'manage_categories' },
        { ruta: '/admin/cotizaciones', guard: 'permissionGuard', permiso: 'view_quotes' },
        { ruta: '/admin/bitacora', guard: 'permissionGuard', permiso: 'view_bitacora' },
        { ruta: '/admin/usuarios', guard: 'permissionGuard', permiso: 'manage_users' },
        { ruta: '/admin/chatbot', guard: 'permissionGuard', permiso: 'manage_chatbot' },
        { ruta: '/mis-cotizaciones', guard: 'rol cliente', permiso: 'view_own_quotes' },
      ],
      generadoEn: new Date().toISOString(),
    };
  }
}
