import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { ProductDto } from '../products/products.service';
import {
  RecommendationAgentInput,
  RecommendationAgentResponse,
  RecommendationFuente,
  RecommendationItem,
  RecommendationTipo,
} from './recommendation-agent.types';

/** Pesos del motor híbrido (consulta + categoría + co-ocurrencia + popularidad). */
const WEIGHTS = {
  consulta: 40,
  coOcurrencia: 35,
  categoria: 20,
  popularidad: 15,
  destacado: 5,
} as const;

@Injectable()
export class RecommendationAgentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Agente de recomendación (Opción A — alcance punto 13):
   * combina consulta del cliente, categoría y relación entre artículos del catálogo
   * usando datos reales de productos y cotizaciones de Ferromaderas.
   */
  async suggest(input: RecommendationAgentInput): Promise<RecommendationAgentResponse> {
    const limit = Math.min(12, Math.max(1, input.limit ?? 6));
    const query = (input.query ?? '').trim();
    const cartCodes = (input.cartCodes ?? [])
      .map((c) => c.trim())
      .filter(Boolean);

    const catalog = await this.prisma.product.findMany({
      where: { active: true },
      include: { category: { select: { id: true, name: true, parentId: true } } },
    });

    let contextProduct: (typeof catalog)[number] | undefined;
    if (input.productId) {
      contextProduct = catalog.find((p) => p.id === input.productId);
    }

    const categoryId = input.categoryId ?? contextProduct?.categoryId ?? undefined;
    const anchorCodes = this.buildAnchorCodes(contextProduct?.code, cartCodes);
    const excludeCodes = new Set(
      anchorCodes.map((c) => c.toLowerCase()),
    );

    const coScores = await this.getCoOccurrenceScores(anchorCodes);
    const popScores = await this.getPopularityScores(categoryId);
    const queryTokens = this.tokenize(query);

    const scored: RecommendationItem[] = [];

    for (const p of catalog) {
      if (excludeCodes.has(p.code.toLowerCase())) continue;

      const dto = this.toDto(p);
      const fuentes: RecommendationFuente[] = [];
      let score = 0;

      const queryScore = this.scoreQuery(queryTokens, p.code, p.name);
      if (queryScore > 0) {
        score += queryScore * WEIGHTS.consulta;
        fuentes.push('consulta');
      }

      const coScore = coScores.get(p.code.toLowerCase()) ?? 0;
      if (coScore > 0) {
        score += coScore * WEIGHTS.coOcurrencia;
        fuentes.push('co_ocurrencia');
      }

      const catScore = this.scoreCategory(categoryId, p.categoryId, p.category?.parentId);
      if (catScore > 0) {
        score += catScore * WEIGHTS.categoria;
        fuentes.push('categoria');
      }

      const popScore = popScores.get(p.code.toLowerCase()) ?? 0;
      if (popScore > 0) {
        score += popScore * WEIGHTS.popularidad;
        fuentes.push('popularidad');
      }

      if (p.featured) {
        score += WEIGHTS.destacado;
        fuentes.push('destacado');
      }

      if (score <= 0) continue;

      const tipo = this.resolveTipo(
        p.categoryId,
        contextProduct?.categoryId,
        coScore,
        catScore,
        queryScore,
      );
      const razon = this.buildRazon(
        tipo,
        query,
        contextProduct?.name,
        p.category?.name,
        fuentes,
      );

      scored.push({
        product: dto,
        score: Math.round(score * 100) / 100,
        tipo,
        razon,
        fuentes,
      });
    }

    scored.sort((a, b) => b.score - a.score);
    let results = scored.slice(0, limit);

    if (results.length < limit) {
      results = this.fillFallback(catalog, results, excludeCodes, limit);
    }

    return {
      recomendaciones: results,
      meta: {
        consulta: query || undefined,
        categoriaId: categoryId,
        productoContextoId: contextProduct?.id,
        productoContextoCodigo: contextProduct?.code,
        carritoCodigos: cartCodes,
        fuentesDatos: [
          'productos (catálogo activo)',
          'categorias (jerarquía y agrupación)',
          'cotizacion_items (patrones de venta cruzada)',
        ],
        algoritmo:
          'hibrido_consulta_categoria_coocurrencia_popularidad',
        generadoEn: new Date().toISOString(),
      },
    };
  }

  private buildAnchorCodes(
    contextCode?: string,
    cartCodes: string[] = [],
  ): string[] {
    const set = new Set<string>();
    if (contextCode) set.add(contextCode);
    for (const c of cartCodes) set.add(c);
    return [...set];
  }

  private async getCoOccurrenceScores(
    anchorCodes: string[],
  ): Promise<Map<string, number>> {
    if (!anchorCodes.length) return new Map();

    const related = await this.prisma.cotizacionItem.findMany({
      where: { codigo: { in: anchorCodes } },
      select: { cotizacionId: true },
      distinct: ['cotizacionId'],
      take: 200,
    });
    const cotizacionIds = related.map((r) => r.cotizacionId);
    if (!cotizacionIds.length) return new Map();

    const grouped = await this.prisma.cotizacionItem.groupBy({
      by: ['codigo'],
      where: {
        cotizacionId: { in: cotizacionIds },
        codigo: { notIn: anchorCodes },
      },
      _count: { _all: true },
    });

    const max = Math.max(...grouped.map((g) => g._count._all), 1);
    const map = new Map<string, number>();
    for (const g of grouped) {
      map.set(g.codigo.toLowerCase(), g._count._all / max);
    }
    return map;
  }

  private async getPopularityScores(
    categoryId?: string,
  ): Promise<Map<string, number>> {
    let allowedCodes: string[] | undefined;
    if (categoryId) {
      const inCat = await this.prisma.product.findMany({
        where: { active: true, categoryId },
        select: { code: true },
      });
      allowedCodes = inCat.map((p) => p.code);
      if (!allowedCodes.length) return new Map();
    }

    const grouped = await this.prisma.cotizacionItem.groupBy({
      by: ['codigo'],
      where: allowedCodes ? { codigo: { in: allowedCodes } } : undefined,
      _count: { _all: true },
      orderBy: { _count: { codigo: 'desc' } },
      take: 50,
    });

    const max = Math.max(...grouped.map((g) => g._count._all), 1);
    const map = new Map<string, number>();
    for (const g of grouped) {
      map.set(g.codigo.toLowerCase(), g._count._all / max);
    }
    return map;
  }

  private tokenize(query: string): string[] {
    if (!query) return [];
    return this.normalize(query)
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2);
  }

  private scoreQuery(tokens: string[], code: string, name: string): number {
    if (!tokens.length) return 0;
    const haystack = this.normalize(`${code} ${name}`);
    let hits = 0;
    for (const t of tokens) {
      if (haystack.includes(t)) hits++;
    }
    return hits / tokens.length;
  }

  private scoreCategory(
    contextCategoryId: string | undefined,
    productCategoryId: string | null,
    _parentId: string | null | undefined,
  ): number {
    if (!contextCategoryId || !productCategoryId) return 0;
    if (contextCategoryId === productCategoryId) return 1;
    return 0.35;
  }

  private resolveTipo(
    productCategoryId: string | null,
    contextCategoryId: string | null | undefined,
    coScore: number,
    catScore: number,
    queryScore: number,
  ): RecommendationTipo {
    const sameCategory =
      !!contextCategoryId &&
      !!productCategoryId &&
      contextCategoryId === productCategoryId;

    if (coScore >= 0.4 && !sameCategory) return 'complementario';
    if (sameCategory && (catScore > 0 || queryScore > 0)) return 'alternativo';
    if (coScore > 0) return 'complementario';
    return 'relacionado';
  }

  private buildRazon(
    tipo: RecommendationTipo,
    query: string,
    contextName: string | undefined,
    categoryName: string | null | undefined,
    fuentes: RecommendationFuente[],
  ): string {
    if (query && fuentes.includes('consulta')) {
      return `Relacionado con tu búsqueda «${query}».`;
    }
    if (contextName && fuentes.includes('co_ocurrencia')) {
      if (tipo === 'complementario') {
        return `Complemento frecuente cuando se cotiza «${contextName}».`;
      }
      return `Suele cotizarse junto a «${contextName}».`;
    }
    if (tipo === 'alternativo' && categoryName) {
      return `Alternativa en la categoría ${categoryName}.`;
    }
    if (fuentes.includes('popularidad') && categoryName) {
      return `Muy cotizado en ${categoryName}.`;
    }
    if (fuentes.includes('popularidad')) {
      return 'Entre los productos más cotizados en Ferromaderas.';
    }
    if (fuentes.includes('destacado')) {
      return 'Producto destacado del catálogo.';
    }
    return 'Sugerido por el agente según el catálogo y las cotizaciones.';
  }

  private fillFallback(
    catalog: Array<{
      id: string;
      code: string;
      name: string;
      price: { toString(): string };
      imageUrl: string | null;
      categoryId: string | null;
      active: boolean;
      featured: boolean;
      pendingConfig: boolean;
      stock: number;
      category?: { name: string | null } | null;
    }>,
    current: RecommendationItem[],
    excludeCodes: Set<string>,
    limit: number,
  ): RecommendationItem[] {
    const used = new Set(current.map((r) => r.product.code.toLowerCase()));
    const pool = catalog.filter(
      (p) =>
        !excludeCodes.has(p.code.toLowerCase()) &&
        !used.has(p.code.toLowerCase()),
    );

    const extras = pool
      .sort((a, b) => Number(b.featured) - Number(a.featured))
      .slice(0, limit - current.length)
      .map((p) => ({
        product: this.toDto(p),
        score: p.featured ? 5 : 1,
        tipo: 'relacionado' as RecommendationTipo,
        razon: p.featured
          ? 'Producto destacado del catálogo.'
          : 'Sugerencia general del catálogo activo.',
        fuentes: ['destacado'] as RecommendationFuente[],
      }));

    return [...current, ...extras];
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s/-]/g, ' ');
  }

  private toDto(p: {
    id: string;
    code: string;
    name: string;
    price: { toString(): string };
    promotionalPrice?: { toString(): string } | null;
    imageUrl: string | null;
    categoryId: string | null;
    active: boolean;
    featured: boolean;
    pendingConfig: boolean;
    stock: number;
  }): ProductDto {
    const price = Number(p.price);
    const promotionalPrice =
      p.promotionalPrice != null ? Number(p.promotionalPrice) : null;
    const onPromotion =
      promotionalPrice != null &&
      promotionalPrice > 0 &&
      promotionalPrice < price;
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      price,
      promotionalPrice: onPromotion ? promotionalPrice : null,
      effectivePrice: onPromotion ? promotionalPrice! : price,
      onPromotion,
      imageUrl: p.imageUrl ?? undefined,
      categoryId: p.categoryId ?? undefined,
      active: p.active,
      featured: p.featured,
      pendingConfig: p.pendingConfig,
      stock: p.stock,
    };
  }
}
