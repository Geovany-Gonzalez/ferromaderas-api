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
} from '@nestjs/common';
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
  create(@Body() body: CreateProductDto) {
    return this.products.create(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage_products')
  update(@Param('id') id: string, @Body() body: Partial<CreateProductDto>) {
    return this.products.update(id, body);
  }

  @Patch(':id/active')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage_products')
  setActive(
    @Param('id') id: string,
    @Body() body: { active: boolean }
  ) {
    return this.products.setActive(id, body.active);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage_products')
  bulkImport(
    @Body()
    body: {
      items: BulkImportItemDto[];
      sync?: boolean;
    }
  ): Promise<BulkImportResultDto> {
    return this.products.bulkImport(body.items ?? [], body.sync ?? false);
  }

  /**
   * Sincronización automática desde el .exe local (sin JWT).
   * Requiere header X-API-Key con INVENTORY_SYNC_API_KEY.
   */
  @Post('bulk-sync')
  @UseGuards(ApiKeyGuard)
  bulkSync(
    @Body()
    body: {
      items: BulkImportItemDto[];
      sync?: boolean;
    }
  ): Promise<BulkImportResultDto> {
    return this.products.bulkImport(body.items ?? [], body.sync ?? false);
  }
}
