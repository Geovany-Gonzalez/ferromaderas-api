import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { BitacoraService } from '../bitacora/bitacora.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface ProductDto {
  id: string;
  code: string;
  name: string;
  price: number;
  imageUrl?: string;
  categoryId?: string;
  active: boolean;
  featured: boolean;
  pendingConfig: boolean;
  stock: number;
}

export interface CreateProductDto {
  code: string;
  name: string;
  price: number;
  imageUrl?: string;
  categoryId?: string;
  active?: boolean;
  featured?: boolean;
  pendingConfig?: boolean;
  stock?: number;
}

export interface BulkImportItemDto {
  code: string;
  name: string;
  stock?: number;
}

export interface BulkImportResultDto {
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
}

export interface BulkImportMeta {
  usuarioId?: string;
  ip?: string;
  origen: 'admin' | 'sincronizacion_automatica';
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
  ) {}

  private toDto(p: {
    id: string;
    code: string;
    name: string;
    price: Decimal;
    imageUrl: string | null;
    categoryId: string | null;
    active: boolean;
    featured: boolean;
    pendingConfig: boolean;
    stock: number;
  }): ProductDto {
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      price: Number(p.price),
      imageUrl: p.imageUrl ?? undefined,
      categoryId: p.categoryId ?? undefined,
      active: p.active,
      featured: p.featured,
      pendingConfig: p.pendingConfig,
      stock: p.stock,
    };
  }

  async findAll(activeOnly = false): Promise<ProductDto[]> {
    const where = activeOnly ? { active: true } : {};
    const list = await this.prisma.product.findMany({
      where,
      orderBy: { code: 'asc' },
    });
    return list.map((p) => this.toDto(p));
  }

  async findById(id: string): Promise<ProductDto | null> {
    const p = await this.prisma.product.findUnique({ where: { id } });
    return p ? this.toDto(p) : null;
  }

  async findByCode(code: string): Promise<ProductDto | null> {
    const p = await this.prisma.product.findFirst({
      where: { code: { equals: code, mode: 'insensitive' } },
    });
    return p ? this.toDto(p) : null;
  }

  async create(dto: CreateProductDto): Promise<ProductDto> {
    const p = await this.prisma.product.create({
      data: {
        code: dto.code.trim(),
        name: dto.name.trim(),
        price: dto.price,
        imageUrl: dto.imageUrl?.trim() || null,
        categoryId: dto.categoryId || null,
        active: dto.active ?? true,
        featured: dto.featured ?? false,
        pendingConfig: dto.pendingConfig ?? false,
        stock: dto.stock ?? 0,
      },
    });
    return this.toDto(p);
  }

  async update(
    id: string,
    dto: Partial<CreateProductDto>
  ): Promise<ProductDto | null> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) return null;

    const p = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code.trim() }),
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.imageUrl !== undefined && {
          imageUrl: dto.imageUrl?.trim() || null,
        }),
        ...(dto.categoryId !== undefined && {
          categoryId: dto.categoryId || null,
        }),
        ...(dto.active !== undefined && { active: dto.active }),
        ...(dto.featured !== undefined && { featured: dto.featured }),
        ...(dto.pendingConfig !== undefined && {
          pendingConfig: dto.pendingConfig,
        }),
        ...(dto.stock !== undefined && { stock: dto.stock }),
      },
    });
    return this.toDto(p);
  }

  async setActive(id: string, active: boolean): Promise<ProductDto | null> {
    return this.update(id, { active });
  }

  async bulkImport(
    items: BulkImportItemDto[],
    sync = false,
    meta?: BulkImportMeta,
  ): Promise<BulkImportResultDto> {
    const errors: string[] = [];
    let created = 0;
    let updated = 0;
    const excelCodes = new Set(
      items.map((i) => i.code.trim().toLowerCase())
    );

    const existingByCode = new Map<
      string,
      { id: string; active: boolean; pendingConfig: boolean }
    >();
    const all = await this.prisma.product.findMany({
      select: { id: true, code: true, active: true, pendingConfig: true },
    });
    for (const p of all) {
      existingByCode.set(p.code.trim().toLowerCase(), {
        id: p.id,
        active: p.active,
        pendingConfig: p.pendingConfig,
      });
    }

    for (const item of items) {
      const code = String(item.code ?? '').trim();
      const name = String(item.name ?? '').trim();
      const stock = typeof item.stock === 'number' ? item.stock : 0;
      if (!code) {
        errors.push(`Fila con descripción "${name?.slice(0, 30) || 'vacía'}...": código vacío`);
        continue;
      }
      const codeKey = code.toLowerCase();
      const existing = existingByCode.get(codeKey);
      if (existing) {
        // Actualiza nombre y existencia. No activar: los productos pendientes de configurar
        // deben permanecer inactivos hasta que se configuren (foto, precio, categoría).
        await this.prisma.product.update({
          where: { id: existing.id },
          data: {
            name: name || undefined,
            stock,
          },
        });
        updated++;
        continue;
      }
      existingByCode.set(codeKey, { id: '', active: false, pendingConfig: true });
      await this.prisma.product.create({
        data: {
          code,
          name: name || code,
          price: 0,
          active: false,
          pendingConfig: true,
          stock,
        },
      });
      created++;
    }

    let deleted = 0;
    if (sync) {
      const allActive = await this.prisma.product.findMany({
        where: { active: true },
        select: { id: true, code: true },
      });
      for (const p of allActive) {
        if (!excelCodes.has(p.code.trim().toLowerCase())) {
          await this.prisma.product.update({
            where: { id: p.id },
            data: { active: false },
          });
          deleted++;
        }
      }
    }

    await this.bitacora.registrar({
      modulo: 'inventario_sync',
      accion: 'carga_masiva',
      usuarioId: meta?.usuarioId,
      ip: meta?.ip,
      detalles: {
        origen: meta?.origen ?? 'admin',
        creados: created,
        actualizados: updated,
        desactivados: deleted,
        totalItems: items.length,
        errores: errors.length,
      },
    });

    return {
      created,
      updated,
      deleted,
      errors,
    };
  }
}
