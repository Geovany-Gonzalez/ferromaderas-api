import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../core/database/prisma.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';

const userInclude = {
  role: {
    include: {
      permissions: { include: { permission: true } },
    },
  },
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async findByEmail(email: string) {
    const value = email.trim().toLowerCase();
    return this.prisma.user.findFirst({
      where: { email: value },
      include: userInclude,
    });
  }

  async findByUsername(username: string) {
    const value = username.trim().toLowerCase();
    return this.prisma.user.findFirst({
      where: { username: value, status: 'activo' },
      include: userInclude,
    });
  }

  async findByUsernameOrEmail(identifier: string) {
    const value = identifier.trim().toLowerCase();
    const isEmail = value.includes('@');
    return this.prisma.user.findFirst({
      where: isEmail
        ? { email: value, status: 'activo' }
        : { username: value, status: 'activo' },
      include: userInclude,
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: userInclude,
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async updateLastLogin(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async list(filters?: { search?: string; role?: string; status?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.search?.trim()) {
      where.OR = [
        { username: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters?.role) {
      where.role = { slug: filters.role };
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    const users = await this.prisma.user.findMany({
      where,
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      email: u.email,
      rol: u.role.slug,
      ultimoAcceso: u.lastLoginAt
        ? u.lastLoginAt.toISOString().split('T')[0]
        : null,
      estado: u.status,
    }));
  }

  async create(data: {
    username: string;
    email: string;
    password: string;
    name: string;
    phone?: string;
    roleSlug: string;
    status?: string;
  }) {
    const username = data.username.trim().toLowerCase();
    const email = data.email.trim().toLowerCase();

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) {
      throw new ConflictException(
        existing.username === username
          ? 'El usuario ya existe'
          : 'El correo ya está registrado',
      );
    }

    const role = await this.prisma.role.findUnique({
      where: { slug: data.roleSlug },
    });
    if (!role) throw new NotFoundException('Rol no encontrado');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        roleId: role.id,
        status: data.status ?? 'activo',
        mustChangePassword: true,
      },
      include: { role: true },
    });
    const token = this.jwt.sign(
      { sub: user.id, purpose: 'force-password-change' },
      { expiresIn: '7d' },
    );
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:4200';
    const changePasswordUrl = `${frontendUrl}/cambiar-password?token=${encodeURIComponent(token)}`;
    try {
      await this.mail.sendCredentials(user.email, user.username, data.password, changePasswordUrl);
    } catch (err) {
      console.error('[UsersService] Error enviando credenciales por email:', err);
      throw new ConflictException(
        'Usuario creado pero no se pudo enviar el correo. Verifica la configuración SMTP.',
      );
    }
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      rol: user.role.slug,
      estado: user.status,
    };
  }

  async update(
    id: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      roleSlug?: string;
      status?: string;
    },
  ) {
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name.trim();
    if (data.email !== undefined) {
      const email = data.email.trim().toLowerCase();
      const existing = await this.prisma.user.findFirst({
        where: { email, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('El correo ya está registrado');
      }
      update.email = email;
    }
    if (data.phone !== undefined) update.phone = data.phone?.trim() || null;
    if (data.status !== undefined) update.status = data.status;
    if (data.roleSlug) {
      const role = await this.prisma.role.findUnique({
        where: { slug: data.roleSlug },
      });
      if (!role) throw new NotFoundException('Rol no encontrado');
      update.roleId = role.id;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: update,
      include: { role: true },
    });
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      rol: user.role.slug,
      estado: user.status,
    };
  }

  async resetPassword(id: string, newPassword: string) {
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: hash },
    });
    return { ok: true };
  }

  async updatePassword(id: string, passwordHash: string) {
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  async clearMustChangePassword(id: string) {
    await this.prisma.user.update({
      where: { id },
      data: { mustChangePassword: false },
    });
  }

  async getRoles() {
    return this.prisma.role.findMany({
      select: { id: true, slug: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}
