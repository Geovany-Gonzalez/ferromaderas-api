import { Inject, Injectable } from '@nestjs/common';
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
  ) {}

  async getDashboardStats(): Promise<DashboardStatsDto> {
    const [summary, topPages, visitsByDay, devices, monthly] = await Promise.all([
      this.analyticsProvider.getSummary(),
      this.analyticsProvider.getTopPages(),
      this.analyticsProvider.getVisitsByDay(7),
      this.analyticsProvider.getDeviceDistribution(),
      this.analyticsProvider.getMonthlyTraffic(12),
    ]);

    return {
      ...summary,
      paginasMasVisitadas: topPages,
      visitasPorDia: visitsByDay,
      dispositivos: devices,
      traficoMensual: monthly,
    };
  }

  async getSummary(): Promise<AnalyticsSummary> {
    return this.analyticsProvider.getSummary();
  }
}
