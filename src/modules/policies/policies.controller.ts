import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { PoliciesService, PolicyPageDto } from './policies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

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
  updatePage(@Body() body: PolicyPageDto) {
    return this.policies.updatePage(body);
  }
}
