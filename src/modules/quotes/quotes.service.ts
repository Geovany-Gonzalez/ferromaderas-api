import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../core/database/prisma.service';
import { BitacoraService } from '../bitacora/bitacora.service';

/** Estados válidos del ciclo de vida de una cotización. */
export const QUOTE_STATUSES = [
  'nueva',
  'en_seguimiento',
  'confirmada',
  'cerrada',
  'cancelada',
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export interface QuoteItemInput {
  productoId?: string;
  codigo: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
}

export interface CreateQuoteInput {
  clienteNombre?: string;
  clienteTelefono?: string;
  clienteDireccion?: string;
  clienteNota?: string;
  items: QuoteItemInput[];
}

export interface QuoteItemDto {
  id: string;
  productoId?: string;
  codigo: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
}

export interface QuoteDto {
  id: string;
  codigo: string;
  estado: QuoteStatus;
  clienteNombre?: string;
  clienteTelefono?: string;
  clienteDireccion?: string;
  clienteNota?: string;
  total: number;
  vendedorId?: string;
  vendedorNombre?: string;
  createdAt: string;
  updatedAt: string;
  items?: QuoteItemDto[];
}

export interface QuoteAuditMeta {
  usuarioId?: string;
  ip?: string;
}

type CotizacionRow = Prisma.CotizacionGetPayload<{ include: { items: true } }>;

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
  ) {}

  private toDto(row: CotizacionRow, includeItems = true): QuoteDto {
    const dto: QuoteDto = {
      id: row.id,
      codigo: row.codigo,
      estado: row.estado as QuoteStatus,
      clienteNombre: row.clienteNombre ?? undefined,
      clienteTelefono: row.clienteTelefono ?? undefined,
      clienteDireccion: row.clienteDireccion ?? undefined,
      clienteNota: row.clienteNota ?? undefined,
      total: Number(row.total),
      vendedorId: row.vendedorId ?? undefined,
      vendedorNombre: row.vendedorNombre ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    if (includeItems) {
      dto.items = row.items.map((it) => ({
        id: it.id,
        productoId: it.productoId ?? undefined,
        codigo: it.codigo,
        nombre: it.nombre,
        precioUnitario: Number(it.precioUnitario),
        cantidad: it.cantidad,
        subtotal: Number(it.subtotal),
      }));
    }
    return dto;
  }

  /** Genera un código legible tipo FM-2026-AB12 y garantiza unicidad. */
  private async generateCodigo(): Promise<string> {
    const year = new Date().getFullYear();
    for (let intento = 0; intento < 5; intento++) {
      const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
      const codigo = `FM-${year}-${rand}`;
      const existe = await this.prisma.cotizacion.findUnique({
        where: { codigo },
        select: { id: true },
      });
      if (!existe) return codigo;
    }
    // Fallback prácticamente imposible de colisionar
    return `FM-${year}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
  }

  async create(input: CreateQuoteInput, meta?: QuoteAuditMeta): Promise<QuoteDto> {
    const items = (input.items ?? []).filter(
      (i) => i && i.cantidad > 0 && i.precioUnitario >= 0,
    );
    if (items.length === 0) {
      throw new BadRequestException('La cotización debe incluir al menos un producto.');
    }

    let total = new Decimal(0);
    const itemsData = items.map((i) => {
      const cantidad = Math.trunc(i.cantidad);
      const precio = new Decimal(i.precioUnitario);
      const subtotal = precio.mul(cantidad);
      total = total.add(subtotal);
      return {
        productoId: i.productoId || null,
        codigo: String(i.codigo ?? '').trim() || 's/código',
        nombre: String(i.nombre ?? '').trim() || 'Producto',
        precioUnitario: precio,
        cantidad,
        subtotal,
      };
    });

    const codigo = await this.generateCodigo();
    const row = await this.prisma.cotizacion.create({
      data: {
        codigo,
        estado: 'nueva',
        clienteNombre: input.clienteNombre?.trim() || null,
        clienteTelefono: input.clienteTelefono?.trim() || null,
        clienteDireccion: input.clienteDireccion?.trim() || null,
        clienteNota: input.clienteNota?.trim() || null,
        total,
        ip: meta?.ip ?? null,
        items: { create: itemsData },
      },
      include: { items: true },
    });

    await this.bitacora.registrar({
      modulo: 'cotizaciones',
      accion: 'crear',
      usuarioId: meta?.usuarioId,
      ip: meta?.ip,
      detalles: {
        cotizacionId: row.id,
        codigo: row.codigo,
        totalItems: itemsData.length,
        total: Number(total),
        origen: 'sitio_publico',
      },
    });

    return this.toDto(row);
  }

  async findAll(): Promise<QuoteDto[]> {
    const rows = await this.prisma.cotizacion.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
    return rows.map((r) => this.toDto(r, false));
  }

  async findById(id: string): Promise<QuoteDto | null> {
    const row = await this.prisma.cotizacion.findUnique({
      where: { id },
      include: { items: true },
    });
    return row ? this.toDto(row) : null;
  }

  async findByCodigo(codigo: string): Promise<QuoteDto | null> {
    const row = await this.prisma.cotizacion.findUnique({
      where: { codigo: codigo.trim() },
      include: { items: true },
    });
    return row ? this.toDto(row) : null;
  }

  async updateStatus(
    id: string,
    estado: QuoteStatus,
    meta?: QuoteAuditMeta,
  ): Promise<QuoteDto> {
    if (!QUOTE_STATUSES.includes(estado)) {
      throw new BadRequestException(`Estado inválido: ${estado}`);
    }
    const existing = await this.prisma.cotizacion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Cotización no encontrada');

    const row = await this.prisma.cotizacion.update({
      where: { id },
      data: { estado },
      include: { items: true },
    });

    await this.bitacora.registrar({
      modulo: 'cotizaciones',
      accion: 'cambiar_estado',
      usuarioId: meta?.usuarioId,
      ip: meta?.ip,
      detalles: {
        cotizacionId: id,
        codigo: existing.codigo,
        estadoAnterior: existing.estado,
        estadoNuevo: estado,
      },
    });

    return this.toDto(row);
  }

  async assignVendedor(
    id: string,
    vendedorId: string | null,
    vendedorNombre: string | null,
    meta?: QuoteAuditMeta,
  ): Promise<QuoteDto> {
    const existing = await this.prisma.cotizacion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Cotización no encontrada');

    const asignar = Boolean(vendedorId);
    const nuevoEstado =
      asignar && existing.estado === 'nueva' ? 'en_seguimiento' : existing.estado;

    const row = await this.prisma.cotizacion.update({
      where: { id },
      data: {
        vendedorId: vendedorId || null,
        vendedorNombre: vendedorNombre || null,
        estado: nuevoEstado,
      },
      include: { items: true },
    });

    await this.bitacora.registrar({
      modulo: 'cotizaciones',
      accion: asignar ? 'asignar_vendedor' : 'desasignar_vendedor',
      usuarioId: meta?.usuarioId,
      ip: meta?.ip,
      detalles: {
        cotizacionId: id,
        codigo: existing.codigo,
        vendedorId: vendedorId || null,
        vendedorNombre: vendedorNombre || null,
      },
    });

    return this.toDto(row);
  }
}
