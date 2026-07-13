import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  IAnalyticsProvider,
  AnalyticsSummary,
  DeviceBreakdown,
  TopPage,
} from './interfaces/analytics-provider.interface';
import { ANALYTICS_PROVIDER } from './statistics.constants';

export interface DashboardStatsDto {
  visitasTotales: number;
  vistasPagina: number;
  paginasSesion: number;
  rebotePorcentaje: number;
  paginasMasVisitadas: TopPage[];
  visitasPorDia: { date: string; visits: number }[];
  dispositivos: DeviceBreakdown[];
  traficoMensual: { month: string; visits: number }[];
  /** 'ga4' si GA4_PROPERTY_ID está configurado; 'mock' si son datos de demostración. */
  dataSource: 'ga4' | 'mock';
}

/**
 * Servicio de estadísticas del sitio.
 * SOLID - Single Responsibility: orquesta los proveedores y formatea respuestas.
 * SOLID - Dependency Inversion: usa IAnalyticsProvider, no implementación concreta.
 */
@Injectable()
export class StatisticsService {
  constructor(
    @Inject(ANALYTICS_PROVIDER)
    private readonly analyticsProvider: IAnalyticsProvider,
    private readonly config: ConfigService,
  ) {}

  async getDashboardStats(): Promise<DashboardStatsDto> {
    const [summary, topPages, visitsByDay, devices, monthly] = await Promise.all([
      this.analyticsProvider.getSummary(),
      this.analyticsProvider.getTopPages(),
      this.analyticsProvider.getVisitsByDay(7),
      this.analyticsProvider.getDeviceDistribution(),
      this.analyticsProvider.getMonthlyTraffic(12),
    ]);

    const ga4Configured = !!this.config.get<string>('GA4_PROPERTY_ID')?.trim();

    return {
      ...summary,
      paginasMasVisitadas: topPages,
      visitasPorDia: visitsByDay,
      dispositivos: devices,
      traficoMensual: monthly,
      dataSource: ga4Configured ? 'ga4' : 'mock',
    };
  }

  async getSummary(): Promise<AnalyticsSummary> {
    return this.analyticsProvider.getSummary();
  }
}
