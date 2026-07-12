import { Controller, Get, Put, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { PoliciesService, PolicyPageDto } from './policies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UserPayload } from '../auth/auth.types';

@Controller('policies')
export class PoliciesController {
  constructor(private readonly policies: PoliciesService) {}

  /** Público: cualquiera puede ver las políticas */
  @Get()
  getPage() {
    return this.policies.getPage();
  }

  /** Protegido: solo admin puede actualizar */
  @Put()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage_policies')
  updatePage(
    @Body() body: PolicyPageDto,
    @CurrentUser() user: UserPayload,
    @Req() req: Request,
  ) {
    return this.policies.updatePage(body, {
      usuarioId: user?.sub,
      ip: req.ip ?? req.socket?.remoteAddress,
    });
  }
}
