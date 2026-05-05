import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';

export interface BitacoraEntry {
  modulo: string;
  accion: string;
  usuarioId?: string;
  detalles?: Record<string, unknown>;
  ip?: string;
}

export interface BitacoraListItemDto {
  id: string;
  fecha: string;
  modulo: string;
  accion: string;
  usuarioId: string | null;
  detalles: Record<string, unknown> | null;
  ip: string | null;
}

export interface BitacoraListResultDto {
  items: BitacoraListItemDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BitacoraListQueryDto {
  page?: number;
  pageSize?: number;
  modulo?: string;
  desde?: string;
  hasta?: string;
}

@Injectable()
export class BitacoraService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(params: BitacoraListQueryDto): Promise<BitacoraListResultDto> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 25));
    const skip = (page - 1) * pageSize;

    const where: Prisma.BitacoraWhereInput = {
      ...(params.modulo?.trim() && {
        modulo: { contains: params.modulo.trim(), mode: 'insensitive' },
      }),
      ...(params.desde || params.hasta
        ? {
            fecha: {
              ...(params.desde && { gte: new Date(params.desde) }),
              ...(params.hasta && {
                lte: (() => {
                  const d = new Date(params.hasta);
                  d.setHours(23, 59, 59, 999);
                  return d;
                })(),
              }),
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.bitacora.count({ where }),
      this.prisma.bitacora.findMany({
        where,
        orderBy: { fecha: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        fecha: r.fecha.toISOString(),
        modulo: r.modulo,
        accion: r.accion,
        usuarioId: r.usuarioId,
        detalles: (r.detalles as Record<string, unknown> | null) ?? null,
        ip: r.ip,
      })),
      total,
      page,
      pageSize,
    };
  }

  async registrar(entry: BitacoraEntry): Promise<void> {
    try {
      await this.prisma.bitacora.create({
        data: {
          modulo: entry.modulo,
          accion: entry.accion,
          usuarioId: entry.usuarioId ?? null,
          detalles: entry.detalles as object | undefined,
          ip: entry.ip ?? null,
        },
      });
    } catch (err) {
      console.error('[BitacoraService] Error registrando bitácora:', err);
      // No fallar la operación principal si falla el log
    }
  }
}
