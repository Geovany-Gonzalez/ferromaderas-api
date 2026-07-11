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

/** Estados del flujo de aprobación comercial de descuentos. */
export const APPROVAL_STATES = [
  'no_requiere',
  'pendiente',
  'aprobada',
  'rechazada',
] as const;
export type ApprovalState = (typeof APPROVAL_STATES)[number];

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
  subtotal: number;
  descuentoPorcentaje: number;
  descuentoMonto: number;
  descuentoMotivo?: string;
  total: number;
  aprobacion: ApprovalState;
  aprobadoPorNombre?: string;
  aprobadoEn?: string;
  aprobacionNota?: string;
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
    const total = Number(row.total);
    // Compatibilidad con cotizaciones previas a la función de descuentos:
    // si no hay subtotal registrado, se asume igual al total.
    const subtotal = Number(row.subtotal) || total;
    const dto: QuoteDto = {
      id: row.id,
      codigo: row.codigo,
      estado: row.estado as QuoteStatus,
      clienteNombre: row.clienteNombre ?? undefined,
      clienteTelefono: row.clienteTelefono ?? undefined,
      clienteDireccion: row.clienteDireccion ?? undefined,
      clienteNota: row.clienteNota ?? undefined,
      subtotal,
      descuentoPorcentaje: Number(row.descuentoPorcentaje),
      descuentoMonto: Number(row.descuentoMonto),
      descuentoMotivo: row.descuentoMotivo ?? undefined,
      total,
      aprobacion: (row.aprobacion as ApprovalState) ?? 'no_requiere',
      aprobadoPorNombre: row.aprobadoPorNombre ?? undefined,
      aprobadoEn: row.aprobadoEn ? row.aprobadoEn.toISOString() : undefined,
      aprobacionNota: row.aprobacionNota ?? undefined,
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
        subtotal: total,
        descuentoPorcentaje: new Decimal(0),
        descuentoMonto: new Decimal(0),
        total,
        aprobacion: 'no_requiere',
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

  /**
   * Registra (o quita, con porcentaje 0) una solicitud de descuento sobre el
   * subtotal. Política del negocio: TODO descuento requiere autorización de un
   * gerente. Por eso, al solicitarlo la cotización queda en estado `pendiente`
   * y el descuento NO se aplica al total hasta que sea aprobado.
   */
  async applyDiscount(
    id: string,
    porcentaje: number,
    motivo: string | null,
    meta?: QuoteAuditMeta,
  ): Promise<QuoteDto> {
    if (porcentaje < 0 || porcentaje > 100) {
      throw new BadRequestException('El descuento debe estar entre 0 y 100%.');
    }
    const existing = await this.prisma.cotizacion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Cotización no encontrada');

    const subtotal = new Decimal(existing.subtotal ?? existing.total);
    const pct = new Decimal(porcentaje);
    const descuentoMonto = subtotal.mul(pct).div(100).toDecimalPlaces(2);

    // Con porcentaje 0 se elimina el descuento (no requiere aprobación).
    // Cualquier descuento mayor a 0 queda pendiente de aprobación y el total
    // se mantiene en el subtotal hasta que un gerente lo apruebe.
    const aprobacion: ApprovalState = porcentaje === 0 ? 'no_requiere' : 'pendiente';

    const row = await this.prisma.cotizacion.update({
      where: { id },
      data: {
        subtotal,
        descuentoPorcentaje: pct,
        descuentoMonto,
        descuentoMotivo: motivo?.trim() || null,
        // El descuento se hará efectivo en el total únicamente al aprobarse.
        total: subtotal,
        aprobacion,
        // Al recalcular el descuento se limpia cualquier aprobación previa.
        aprobadoPorId: null,
        aprobadoPorNombre: null,
        aprobadoEn: null,
        aprobacionNota: null,
      },
      include: { items: true },
    });

    await this.bitacora.registrar({
      modulo: 'cotizaciones',
      accion: porcentaje === 0 ? 'quitar_descuento' : 'solicitar_descuento',
      usuarioId: meta?.usuarioId,
      ip: meta?.ip,
      detalles: {
        cotizacionId: id,
        codigo: existing.codigo,
        porcentaje,
        descuentoMontoSolicitado: Number(descuentoMonto),
        subtotal: Number(subtotal),
        requiereAprobacion: porcentaje > 0,
      },
    });

    return this.toDto(row);
  }

  /**
   * Resuelve el flujo de aprobación de un descuento pendiente.
   * Solo aplica a cotizaciones en estado `pendiente`. Si se aprueba, el
   * descuento se hace efectivo en el total; si se rechaza, no se concede y el
   * total permanece igual al subtotal.
   */
  async decideApproval(
    id: string,
    decision: 'aprobada' | 'rechazada',
    nota: string | null,
    aprobador: { id?: string; nombre?: string },
    meta?: QuoteAuditMeta,
  ): Promise<QuoteDto> {
    if (decision !== 'aprobada' && decision !== 'rechazada') {
      throw new BadRequestException('Decisión de aprobación inválida.');
    }
    const existing = await this.prisma.cotizacion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Cotización no encontrada');
    if (existing.aprobacion !== 'pendiente') {
      throw new BadRequestException(
        'La cotización no tiene un descuento pendiente de aprobación.',
      );
    }

    const rechazada = decision === 'rechazada';
    const subtotal = new Decimal(existing.subtotal ?? existing.total);
    const descuentoMonto = new Decimal(existing.descuentoMonto ?? 0);

    const row = await this.prisma.cotizacion.update({
      where: { id },
      data: {
        aprobacion: decision,
        aprobadoPorId: aprobador.id ?? null,
        aprobadoPorNombre: aprobador.nombre ?? null,
        aprobadoEn: new Date(),
        aprobacionNota: nota?.trim() || null,
        ...(rechazada
          ? {
              // Rechazado: el descuento no se concede, el total es el subtotal.
              descuentoPorcentaje: new Decimal(0),
              descuentoMonto: new Decimal(0),
              total: subtotal,
            }
          : {
              // Aprobado: el descuento se hace efectivo en el total.
              total: subtotal.sub(descuentoMonto),
            }),
      },
      include: { items: true },
    });

    await this.bitacora.registrar({
      modulo: 'cotizaciones',
      accion: rechazada ? 'rechazar_descuento' : 'aprobar_descuento',
      usuarioId: meta?.usuarioId,
      ip: meta?.ip,
      detalles: {
        cotizacionId: id,
        codigo: existing.codigo,
        porcentajeSolicitado: Number(existing.descuentoPorcentaje),
        aprobadoPor: aprobador.nombre ?? null,
        nota: nota?.trim() || null,
      },
    });

    return this.toDto(row);
  }
}
