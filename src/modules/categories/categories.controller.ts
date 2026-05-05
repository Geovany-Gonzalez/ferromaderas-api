import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  /** Público: listado de categorías para catálogo */
  @Get()
  list() {
    return this.categories.findAll();
  }

  @Get('slug/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.categories.findBySlug(slug);
  }

  @Get('by-id/:id')
  getById(@Param('id') id: string) {
    return this.categories.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage_categories')
  create(
    @Body()
    body: {
      name: string;
      slug: string;
      imageUrl?: string;
      description?: string;
      active?: boolean;
    }
  ) {
    return this.categories.create(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage_categories')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      slug?: string;
      imageUrl?: string | null;
      description?: string | null;
      active?: boolean;
    }
  ) {
    return this.categories.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage_categories')
  delete(@Param('id') id: string) {
    return this.categories.delete(id);
  }
}
