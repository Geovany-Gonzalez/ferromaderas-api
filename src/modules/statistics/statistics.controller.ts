import { Controller, Get, UseGuards } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * Controlador de estadísticas del sitio.
 * Endpoints consumidos por el dashboard del frontend Angular.
 * Acceso restringido a usuarios autenticados (panel administrativo).
 */
@Controller('statistics')
@UseGuards(JwtAuthGuard)
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
