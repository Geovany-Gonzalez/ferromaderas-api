import { Controller, Get, Query } from '@nestjs/common';
import { RecommendationAgentService } from './recommendation-agent.service';

@Controller('recommendation-agent')
export class RecommendationAgentController {
  constructor(private readonly agent: RecommendationAgentService) {}

  /**
   * Agente de IA de recomendaciones (alcance punto 13).
   * Público: sugiere complementos/alternativos según consulta, categoría y catálogo.
   */
  @Get()
  suggest(
    @Query('query') query?: string,
    @Query('productId') productId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('cartCodes') cartCodes?: string,
    @Query('limit') limit?: string,
  ) {
    const codes = cartCodes
      ? cartCodes.split(',').map((c) => c.trim()).filter(Boolean)
      : undefined;

    return this.agent.suggest({
      query,
      productId,
      categoryId,
      cartCodes: codes,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
