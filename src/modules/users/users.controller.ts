import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('roles')
  getRoles() {
    return this.users.getRoles();
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('manage_users')
  list(
    @Query('search') search?: string,
    @Query('rol') rol?: string,
    @Query('estado') estado?: string,
  ) {
    return this.users.list({ search, role: rol, status: estado });
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('manage_users')
  create(
    @Body()
    body: {
      username: string;
      email: string;
      password: string;
      name: string;
      phone?: string;
      role: string;
      status?: string;
    },
  ) {
    return this.users.create({
      username: body.username,
      email: body.email,
      password: body.password,
      name: body.name,
      phone: body.phone,
      roleSlug: body.role,
      status: body.status,
    });
  }

  @Put(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('manage_users')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      email?: string;
      phone?: string;
      role?: string;
      status?: string;
    },
  ) {
    return this.users.update(id, {
      name: body.name,
      email: body.email,
      phone: body.phone,
      roleSlug: body.role,
      status: body.status,
    });
  }

}
