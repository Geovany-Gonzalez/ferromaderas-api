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

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  /** Público: catálogo activo (para sitio web) */
  @Get('catalog')
  getCatalog() {
    return this.products.findAll(true);
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
