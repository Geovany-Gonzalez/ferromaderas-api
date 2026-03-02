import { Module, Global } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';
import { HealthController } from './health/health.controller';

/**
 * Módulo core con servicios globales.
 * SOLID - Single Responsibility: configuración base compartida.
 */
@Global()
@Module({
  controllers: [HealthController],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class CoreModule {}
