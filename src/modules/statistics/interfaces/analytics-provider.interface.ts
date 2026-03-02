/**
 * Contrato para proveedores de analytics.
 * SOLID - Dependency Inversion: el servicio depende de abstracciones.
 */
export interface IAnalyticsProvider {
  /** Obtiene métricas resumidas del sitio */
  getSummary(dateRange?: DateRange): Promise<AnalyticsSummary>;

  /** Obtiene visitas por día */
  getVisitsByDay(days: number): Promise<{ date: string; visits: number }[]>;

  /** Obtiene distribución por dispositivo */
  getDeviceDistribution(dateRange?: DateRange): Promise<DeviceBreakdown[]>;

  /** Obtiene tráfico mensual */
  getMonthlyTraffic(months: number): Promise<{ month: string; visits: number }[]>;

  /** Obtiene páginas más visitadas */
  getTopPages(dateRange?: DateRange): Promise<TopPage[]>;
}

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;
}

export interface AnalyticsSummary {
  visitasTotales: number;
  vistasPagina: number;
  paginasSesion: number;
  rebotePorcentaje: number;
}

export interface DeviceBreakdown {
  device: string;
  percentage: number;
}

export interface TopPage {
  pagina: string;
  vistas: number;
}
