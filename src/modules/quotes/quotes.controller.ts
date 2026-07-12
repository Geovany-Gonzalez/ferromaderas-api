import {
  Body,
  Controller,
  ForbiddenException,
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
  ApplyDiscountDto,
  ApprovalDecisionDto,
  AssignVendedorDto,
  CreateQuoteDto,
  SendQuoteEmailDto,
  UpdateStatusDto,
} from './dto/quotes.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UserPayload } from '../auth/auth.types';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  /** Público: crea una cotización desde el carrito del sitio. */
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  create(
    @Body() body: CreateQuoteDto,
    @Req() req: Request,
    @CurrentUser() user?: UserPayload | null,
  ) {
    const clienteId = user?.role === 'cliente' ? user.sub : undefined;
    return this.quotes.create(body, {
      ip: req.ip ?? req.socket?.remoteAddress,
      clienteRegistradoId: clienteId,
      usuarioId: clienteId,
      usuarioNombre: user?.username,
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
  list(@CurrentUser() user: UserPayload) {
    return this.quotes.findAll(user);
  }

  /** Admin: alertas de seguimiento comercial para el panel. */
  @Get('seguimiento/alertas')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('view_quotes')
  followUpAlerts(@CurrentUser() user: UserPayload) {
    return this.quotes.getFollowUpAlerts(user);
  }

  /** Admin: productos más cotizados (reportes). */
  @Get('reportes/productos-cotizados')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('view_quotes')
  topQuotedProducts(@CurrentUser() user: UserPayload) {
    return this.quotes.getTopQuotedProducts(user);
  }

  /** Cliente registrado: sus cotizaciones. */
  @Get('mis-cotizaciones')
  @UseGuards(JwtAuthGuard)
  async misCotizaciones(@CurrentUser() user: UserPayload) {
    if (user?.role !== 'cliente') {
      throw new ForbiddenException('Solo clientes registrados pueden ver este listado.');
    }
    const profile = await this.quotes.getUserEmail(user.sub);
    if (!profile) throw new NotFoundException('Usuario no encontrado');
    return this.quotes.findMisCotizaciones(user.sub, profile.email);
  }

  /** Admin / cliente: historial de seguimiento de una cotización. */
  @Get(':id/historial-seguimiento')
  @UseGuards(JwtAuthGuard)
  async historialSeguimiento(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.quotes.assertCanViewQuote(id, user);
    return this.quotes.getSeguimientoHistorial(id);
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
      usuarioNombre: user?.username,
      ip: req.ip ?? req.socket?.remoteAddress,
      comentario: body.comentario,
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
    if (user?.role === 'vendedor') {
      throw new ForbiddenException('Los vendedores no pueden asignar cotizaciones.');
    }
    return this.quotes.assignVendedor(
      id,
      body.vendedorId ?? null,
      body.vendedorNombre ?? null,
      {
        usuarioId: user?.sub,
        usuarioNombre: user?.username,
        ip: req.ip ?? req.socket?.remoteAddress,
      },
    );
  }

  /** Admin: aplica o quita un descuento (puede requerir aprobación). */
  @Patch(':id/descuento')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('view_quotes')
  applyDiscount(
    @Param('id') id: string,
    @Body() body: ApplyDiscountDto,
    @CurrentUser() user: UserPayload,
    @Req() req: Request,
  ) {
    return this.quotes.applyDiscount(id, body.porcentaje, body.motivo ?? null, {
      usuarioId: user?.sub,
      ip: req.ip ?? req.socket?.remoteAddress,
    });
  }

  /** Admin: envía la cotización al cliente por correo (socialización SMTP). */
  @Post(':id/enviar-correo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('view_quotes')
  sendByEmail(
    @Param('id') id: string,
    @Body() body: SendQuoteEmailDto,
    @CurrentUser() user: UserPayload,
    @Req() req: Request,
  ) {
    return this.quotes.sendByEmail(id, body.email ?? null, {
      usuarioId: user?.sub,
      ip: req.ip ?? req.socket?.remoteAddress,
    });
  }

  /** Admin (gerente): aprueba o rechaza un descuento pendiente. */
  @Patch(':id/aprobacion')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('approve_quotes')
  decideApproval(
    @Param('id') id: string,
    @Body() body: ApprovalDecisionDto,
    @CurrentUser() user: UserPayload,
    @Req() req: Request,
  ) {
    return this.quotes.decideApproval(
      id,
      body.decision,
      body.nota ?? null,
      { id: user?.sub, nombre: user?.username },
      {
        usuarioId: user?.sub,
        ip: req.ip ?? req.socket?.remoteAddress,
      },
    );
  }
}
