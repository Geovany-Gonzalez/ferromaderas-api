import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

/**
 * Controlador de salud para monitoreo y load balancers.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    let dbConnected = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbConnected = true;
    } catch {
      // DB no disponible
    }

    return {
      status: dbConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbConnected ? 'connected' : 'disconnected',
      },
    };
  }
}
