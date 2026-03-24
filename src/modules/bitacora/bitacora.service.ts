import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

export interface BitacoraEntry {
  modulo: string;
  accion: string;
  usuarioId?: string;
  detalles?: Record<string, unknown>;
  ip?: string;
}

@Injectable()
export class BitacoraService {
  constructor(private readonly prisma: PrismaService) {}

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
