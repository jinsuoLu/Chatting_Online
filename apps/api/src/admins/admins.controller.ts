import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { AuthService } from '../auth/auth.service.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';
import { Roles } from '../decorators/roles.decorator.js';
import { AuthGuard } from '../guards/auth.guard.js';
import { CsrfGuard } from '../guards/csrf.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';

@Controller('admins')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminsController {
  constructor(private readonly auth: AuthService) {}

  @Post()
  @UseGuards(CsrfGuard)
  @Roles(UserRole.SUPER_ADMIN)
  create(@CurrentUser() actor: any, @Body() body: any) {
    return this.auth.createAdmin(actor, this.required(body.username, 'username'), this.required(body.password, 'password'), body.role === UserRole.SUPER_ADMIN ? UserRole.SUPER_ADMIN : UserRole.ADMIN);
  }

  @Get()
  list(@CurrentUser() actor: any) { return this.auth.listAdmins(actor); }

  @Patch(':id/status')
  @UseGuards(CsrfGuard)
  setStatus(@CurrentUser() actor: any, @Param('id') id: string, @Body() body: any) {
    return this.auth.setStatus(actor, id, body.status === UserStatus.DISABLED ? UserStatus.DISABLED : UserStatus.ACTIVE);
  }

  @Patch(':id/password')
  @UseGuards(CsrfGuard)
  setPassword(@CurrentUser() actor: any, @Param('id') id: string, @Body() body: any) {
    return this.auth.setPassword(actor, id, this.required(body.password, 'password'));
  }

  private required(value: unknown, field: string) {
    if (typeof value !== 'string' || value.trim().length < 8 || value.length > 128) throw new Error(`${field} is invalid`);
    return value;
  }
}
