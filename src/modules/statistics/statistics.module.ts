import { Module } from '@nestjs/common';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { Ga4AnalyticsProvider } from './providers/ga4-analytics.provider';
import { ANALYTICS_PROVIDER } from './statistics.constants';

/**
 * Módulo de estadísticas del sitio web.
 * Consume datos de Google Analytics 4 (vía GTM en el frontend).
 * SOLID - Open/Closed: se puede agregar otro provider sin modificar el servicio.
 */
@Module({
  controllers: [StatisticsController],
  providers: [
    StatisticsService,
    {
      provide: ANALYTICS_PROVIDER,
      useClass: Ga4AnalyticsProvider,
    },
  ],
  exports: [StatisticsService],
})
export class StatisticsModule {}
