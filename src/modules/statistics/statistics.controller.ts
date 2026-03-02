import { Controller, Get } from '@nestjs/common';
import { StatisticsService } from './statistics.service';

/**
 * Controlador de estadísticas del sitio.
 * Endpoints consumidos por el dashboard del frontend Angular.
 */
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statistics: StatisticsService) {}

  /**
   * Todas las estadísticas para el dashboard en una sola petición.
   * GET /api/statistics/dashboard
   */
  @Get('dashboard')
  async getDashboard() {
    return this.statistics.getDashboardStats();
  }

  /**
   * Resumen de métricas principales.
   * GET /api/statistics/summary
   */
  @Get('summary')
  async getSummary() {
    return this.statistics.getSummary();
  }
}
