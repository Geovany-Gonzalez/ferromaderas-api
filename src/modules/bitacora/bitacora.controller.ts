import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { BitacoraService } from './bitacora.service';

@Controller('bitacora')
export class BitacoraController {
  constructor(private readonly bitacora: BitacoraService) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('view_bitacora')
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('modulo') modulo?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string
  ) {
    return this.bitacora.listar({
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      modulo,
      desde,
      hasta,
    });
  }
}
