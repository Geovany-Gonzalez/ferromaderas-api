import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ProductsService,
  CreateProductDto,
  BulkImportItemDto,
  BulkImportResultDto,
} from './products.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UserPayload } from '../auth/auth.types';
import { RecommendationAgentService } from '../recommendation-agent/recommendation-agent.service';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly recommendationAgent: RecommendationAgentService,
  ) {}

  /** Público: catálogo activo (para sitio web) */
  @Get('catalog')
  getCatalog() {
    return this.products.findAll(true);
  }

  /** Público: alias del agente de recomendaciones (compatibilidad). */
  @Get('recommendations')
  async getRecommendations(
    @Query('query') query?: string,
    @Query('productId') productId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('cartCodes') cartCodes?: string,
    @Query('limit') limit?: string,
  ) {
    const codes = cartCodes
      ? cartCodes.split(',').map((c) => c.trim()).filter(Boolean)
      : undefined;
    const result = await this.recommendationAgent.suggest({
      query,
      productId,
      categoryId,
      cartCodes: codes,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return result.recomendaciones.map((r) => r.product);
  }

  /** Público: detalle de un producto activo del catálogo. */
  @Get('catalog/:id')
  async getCatalogProduct(@Param('id') id: string) {
    return this.products.findActiveCatalogProduct(id);
  }

  /** Admin: todos los productos */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage_products')
  list(@Query('activeOnly') activeOnly?: string) {
    return this.products.findAll(activeOnly === 'true');
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage_products')
  getById(@Param('id') id: string) {
    return this.products.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage_products')
  create(
    @Body() body: CreateProductDto,
    @CurrentUser() user: UserPayload,
    @Req() req: Request
  ) {
    return this.products.create(body, {
      usuarioId: user?.sub,
      ip: req.ip ?? req.socket?.remoteAddress,
    });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage_products')
  update(
    @Param('id') id: string,
    @Body() body: Partial<CreateProductDto>,
    @CurrentUser() user: UserPayload,
    @Req() req: Request
  ) {
    return this.products.update(id, body, {
      usuarioId: user?.sub,
      ip: req.ip ?? req.socket?.remoteAddress,
    });
  }

  @Patch(':id/active')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage_products')
  setActive(
    @Param('id') id: string,
    @Body() body: { active: boolean },
    @CurrentUser() user: UserPayload,
    @Req() req: Request
  ) {
    return this.products.setActive(id, body.active, {
      usuarioId: user?.sub,
      ip: req.ip ?? req.socket?.remoteAddress,
    });
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage_products')
  async bulkImport(
    @Body()
    body: {
      items: BulkImportItemDto[];
      sync?: boolean;
    },
    @CurrentUser() user: UserPayload,
    @Req() req: Request,
  ): Promise<BulkImportResultDto> {
    const result = await this.products.bulkImport(body.items ?? [], body.sync ?? false, {
      usuarioId: user?.sub,
      ip: req.ip ?? req.socket?.remoteAddress,
      origen: 'admin',
    });
    return result;
  }

  /**
   * Sincronización automática desde el .exe local (sin JWT).
   * Requiere header X-API-Key con INVENTORY_SYNC_API_KEY.
   */
  @Post('bulk-sync')
  @UseGuards(ApiKeyGuard)
  async bulkSync(
    @Body()
    body: {
      items: BulkImportItemDto[];
      sync?: boolean;
    },
    @Req() req: Request,
  ): Promise<BulkImportResultDto> {
    const result = await this.products.bulkImport(body.items ?? [], body.sync ?? false, {
      ip: req.ip ?? req.socket?.remoteAddress,
      origen: 'sincronizacion_automatica',
    });
    return result;
  }
}
