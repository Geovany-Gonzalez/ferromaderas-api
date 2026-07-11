import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { QuotesService } from './quotes.service';
import {
  AssignVendedorDto,
  CreateQuoteDto,
  UpdateStatusDto,
} from './dto/quotes.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UserPayload } from '../auth/auth.types';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  /** Público: crea una cotización desde el carrito del sitio. */
  @Post()
  create(@Body() body: CreateQuoteDto, @Req() req: Request) {
    return this.quotes.create(body, {
      ip: req.ip ?? req.socket?.remoteAddress,
    });
  }

  /** Público: ver una cotización por su código (enlace compartible). */
  @Get('public/:codigo')
  async getPublic(@Param('codigo') codigo: string) {
    const quote = await this.quotes.findByCodigo(codigo);
    if (!quote) throw new NotFoundException('Cotización no encontrada');
    return quote;
  }

  /** Admin: listado para el panel de seguimiento. */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('view_quotes')
  list() {
    return this.quotes.findAll();
  }

  /** Admin: detalle con items. */
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('view_quotes')
  async getById(@Param('id') id: string) {
    const quote = await this.quotes.findById(id);
    if (!quote) throw new NotFoundException('Cotización no encontrada');
    return quote;
  }

  /** Admin: cambia el estado de seguimiento. */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('view_quotes')
  updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateStatusDto,
    @CurrentUser() user: UserPayload,
    @Req() req: Request,
  ) {
    return this.quotes.updateStatus(id, body.estado, {
      usuarioId: user?.sub,
      ip: req.ip ?? req.socket?.remoteAddress,
    });
  }

  /** Admin: asigna o quita el vendedor responsable. */
  @Patch(':id/vendedor')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('view_quotes')
  assignVendedor(
    @Param('id') id: string,
    @Body() body: AssignVendedorDto,
    @CurrentUser() user: UserPayload,
    @Req() req: Request,
  ) {
    return this.quotes.assignVendedor(
      id,
      body.vendedorId ?? null,
      body.vendedorNombre ?? null,
      {
        usuarioId: user?.sub,
        ip: req.ip ?? req.socket?.remoteAddress,
      },
    );
  }
}
