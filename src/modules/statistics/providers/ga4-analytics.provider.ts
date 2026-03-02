import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

interface Ga4DateRange {
  startDate: string;
  endDate: string;
}
import type {
  IAnalyticsProvider,
  DateRange,
  AnalyticsSummary,
  DeviceBreakdown,
  TopPage,
} from '../interfaces/analytics-provider.interface';

/**
 * Proveedor de analytics usando Google Analytics Data API (GA4).
 * Los datos son enviados desde el frontend vía GTM.
 * SOLID - Single Responsibility: solo obtiene datos de GA4.
 */
@Injectable()
export class Ga4AnalyticsProvider implements IAnalyticsProvider {
  private readonly logger = new Logger(Ga4AnalyticsProvider.name);
  private readonly propertyId: string;
  private readonly client: BetaAnalyticsDataClient;

  constructor(private readonly config: ConfigService) {
    const propId = this.config.get<string>('GA4_PROPERTY_ID');
    if (!propId) {
      this.logger.warn(
        'GA4_PROPERTY_ID not configured. Statistics endpoints will return mock data.',
      );
    }
    this.propertyId = propId ?? '';
    this.client = new BetaAnalyticsDataClient();
  }

  private get dateRanges(): Ga4DateRange[] {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return [
      {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
    ];
  }

  private get baseRequest() {
    return {
      property: `properties/${this.propertyId}`,
      dateRanges: this.dateRanges,
    };
  }

  private toDateRange(range?: DateRange): Ga4DateRange[] {
    if (!range) return this.dateRanges;
    return [{ startDate: range.startDate, endDate: range.endDate }];
  }

  async getSummary(dateRange?: DateRange): Promise<AnalyticsSummary> {
    if (!this.propertyId) return this.getMockSummary();

    try {
      const [response] = await this.client.runReport({
        ...this.baseRequest,
        dateRanges: this.toDateRange(dateRange),
        metrics: [
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'screenPageViewsPerSession' },
          { name: 'engagementRate' },
        ],
      });

      const row = response.rows?.[0];
      if (!row) return this.getMockSummary();

      // engagementRate: 0-1. Bounce = 100 - engagement
      const engagementRate = parseFloat(row.metricValues?.[3]?.value ?? '0');
      const rebotePorcentaje = Math.round((1 - engagementRate) * 100);

      return {
        visitasTotales: parseInt(row.metricValues?.[0]?.value ?? '0', 10),
        vistasPagina: parseInt(row.metricValues?.[1]?.value ?? '0', 10),
        paginasSesion: parseFloat(row.metricValues?.[2]?.value ?? '0'),
        rebotePorcentaje,
      };
    } catch (err) {
      this.logger.error('GA4 getSummary error', err);
      return this.getMockSummary();
    }
  }

  async getVisitsByDay(
    days: number,
  ): Promise<{ date: string; visits: number }[]> {
    if (!this.propertyId) return this.getMockVisitsByDay();

    try {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);

      const [response] = await this.client.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [
          {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
          },
        ],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      });

      return (response.rows ?? []).map((row) => ({
        date: row.dimensionValues?.[0]?.value ?? '',
        visits: parseInt(row.metricValues?.[0]?.value ?? '0', 10),
      }));
    } catch (err) {
      this.logger.error('GA4 getVisitsByDay error', err);
      return this.getMockVisitsByDay();
    }
  }

  async getDeviceDistribution(
    dateRange?: DateRange,
  ): Promise<DeviceBreakdown[]> {
    if (!this.propertyId) return this.getMockDeviceDistribution();

    try {
      const [response] = await this.client.runReport({
        ...this.baseRequest,
        dateRanges: this.toDateRange(dateRange),
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }],
      });

      const total = (response.rows ?? []).reduce(
        (sum, r) => sum + parseInt(r.metricValues?.[0]?.value ?? '0', 10),
        0,
      );

      const mapping: Record<string, string> = {
        mobile: 'Móvil',
        desktop: 'Escritorio',
        tablet: 'Tablet',
      };

      return (response.rows ?? []).map((row) => {
        const raw = row.dimensionValues?.[0]?.value ?? 'desktop';
        const device = mapping[raw] ?? raw;
        const count = parseInt(row.metricValues?.[0]?.value ?? '0', 10);
        return {
          device,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        };
      });
    } catch (err) {
      this.logger.error('GA4 getDeviceDistribution error', err);
      return this.getMockDeviceDistribution();
    }
  }

  async getMonthlyTraffic(
    months: number,
  ): Promise<{ month: string; visits: number }[]> {
    if (!this.propertyId) return this.getMockMonthlyTraffic();

    try {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - months);

      const [response] = await this.client.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [
          {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
          },
        ],
        dimensions: [{ name: 'yearMonth' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'yearMonth' } }],
      });

      const monthNames = [
        'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
        'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
      ];

      return (response.rows ?? []).map((row) => {
        const yyyymm = row.dimensionValues?.[0]?.value ?? '';
        const year = parseInt(yyyymm.slice(0, 4), 10);
        const month = parseInt(yyyymm.slice(4, 6), 10) - 1;
        return {
          month: `${monthNames[month]} ${year.toString().slice(-2)}`,
          visits: parseInt(row.metricValues?.[0]?.value ?? '0', 10),
        };
      });
    } catch (err) {
      this.logger.error('GA4 getMonthlyTraffic error', err);
      return this.getMockMonthlyTraffic();
    }
  }

  async getTopPages(dateRange?: DateRange): Promise<TopPage[]> {
    if (!this.propertyId) return this.getMockTopPages();

    try {
      const [response] = await this.client.runReport({
        ...this.baseRequest,
        dateRanges: this.toDateRange(dateRange),
        dimensions: [{ name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }],
        limit: 10,
        orderBys: [{ metric: { metricName: 'screenPageViews' } }],
      });

      return (response.rows ?? []).map((row) => ({
        pagina: row.dimensionValues?.[0]?.value ?? '(sin título)',
        vistas: parseInt(row.metricValues?.[0]?.value ?? '0', 10),
      }));
    } catch (err) {
      this.logger.error('GA4 getTopPages error', err);
      return this.getMockTopPages();
    }
  }

  // ----- Datos mock cuando GA4 no está configurado -----
  private getMockSummary(): AnalyticsSummary {
    return {
      visitasTotales: 12480,
      vistasPagina: 38420,
      paginasSesion: 3.1,
      rebotePorcentaje: 42,
    };
  }

  private getMockVisitsByDay(): { date: string; visits: number }[] {
    const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const data = [1420, 1680, 1520, 1890, 2100, 1840, 2030];
    return labels.map((l, i) => ({ date: l, visits: data[i] }));
  }

  private getMockDeviceDistribution(): DeviceBreakdown[] {
    return [
      { device: 'Móvil', percentage: 58 },
      { device: 'Escritorio', percentage: 35 },
      { device: 'Tablet', percentage: 7 },
    ];
  }

  private getMockMonthlyTraffic(): { month: string; visits: number }[] {
    const months = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
    ];
    const data = [
      2800, 3200, 4100, 3800, 4500, 5200,
      4800, 5100, 5900, 6200, 5800, 6700,
    ];
    return months.map((m, i) => ({ month: m, visits: data[i] }));
  }

  private getMockTopPages(): TopPage[] {
    return [
      { pagina: 'Inicio', vistas: 8520 },
      { pagina: 'Categorías', vistas: 6120 },
      { pagina: 'Carrito', vistas: 3240 },
      { pagina: 'Ubicación', vistas: 2180 },
      { pagina: 'Políticas', vistas: 960 },
    ];
  }
}
