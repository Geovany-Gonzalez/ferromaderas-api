import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { Category as PrismaCategory } from '@prisma/client';
import { BitacoraService } from '../bitacora/bitacora.service';

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  description?: string;
  active: boolean;
}

/** Usuario e IP para auditoría (panel admin). */
export interface CategoryAuditMeta {
  usuarioId?: string;
  ip?: string;
}

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
  ) {}

  async findAll(): Promise<CategoryDto[]> {
    const list = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    return list.map((c) => this.toDto(c));
  }

  async findBySlug(slug: string): Promise<CategoryDto | null> {
    const c = await this.prisma.category.findUnique({
      where: { slug },
    });
    return c ? this.toDto(c) : null;
  }

  async findById(id: string): Promise<CategoryDto | null> {
    const c = await this.prisma.category.findUnique({
      where: { id },
    });
    return c ? this.toDto(c) : null;
  }

  async create(
    data: {
      name: string;
      slug: string;
      imageUrl?: string;
      description?: string;
      active?: boolean;
    },
    meta?: CategoryAuditMeta,
  ): Promise<CategoryDto> {
    const c = await this.prisma.category.create({
      data: {
        name: data.name.trim(),
        slug: data.slug.trim().toLowerCase(),
        imageUrl: this.normalizeOptionalText(data.imageUrl),
        description: this.normalizeOptionalText(data.description),
        active: data.active ?? true,
      },
    });
    await this.registrarAuditoria(
      'crear',
      { categoriaId: c.id, nombre: c.name, slug: c.slug, activa: c.active },
      meta,
    );
    return this.toDto(c);
  }

  async update(
    id: string,
    data: {
      name?: string;
      slug?: string;
      imageUrl?: string | null;
      description?: string | null;
      active?: boolean;
    },
    meta?: CategoryAuditMeta,
  ): Promise<CategoryDto | null> {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) return null;
    const c = await this.prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.slug !== undefined && {
          slug: data.slug.trim().toLowerCase(),
        }),
        ...(data.imageUrl !== undefined && {
          imageUrl: this.normalizeOptionalText(data.imageUrl),
        }),
        ...(data.description !== undefined && {
          description: this.normalizeOptionalText(data.description),
        }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });
    const campos = Object.keys(data).filter(
      (k) => data[k as keyof typeof data] !== undefined,
    );
    let accion = 'actualizar';
    if (campos.length === 1 && campos[0] === 'active') {
      accion = data.active ? 'activar' : 'desactivar';
    }
    await this.registrarAuditoria(
      accion,
      { categoriaId: c.id, nombre: c.name, slug: c.slug, campos },
      meta,
    );
    return this.toDto(c);
  }

  async delete(id: string, meta?: CategoryAuditMeta): Promise<boolean> {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    const result = await this.prisma.category.deleteMany({
      where: { id },
    });
    const eliminada = result.count > 0;
    if (eliminada) {
      await this.registrarAuditoria(
        'eliminar',
        {
          categoriaId: id,
          nombre: existing?.name ?? null,
          slug: existing?.slug ?? null,
        },
        meta,
      );
    }
    return eliminada;
  }

  private async registrarAuditoria(
    accion: string,
    detalles: Record<string, unknown>,
    meta?: CategoryAuditMeta,
  ): Promise<void> {
    await this.bitacora.registrar({
      modulo: 'categorias',
      accion,
      usuarioId: meta?.usuarioId,
      ip: meta?.ip,
      detalles,
    });
  }

  private normalizeOptionalText(
    value: string | null | undefined
  ): string | null {
    if (value === null || value === undefined) return null;
    const t = String(value).trim();
    return t.length ? t : null;
  }

  private toDto(c: PrismaCategory): CategoryDto {
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      imageUrl: c.imageUrl ?? '',
      description: c.description ?? '',
      active: c.active,
    };
  }
}
