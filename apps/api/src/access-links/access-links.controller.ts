import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../decorators/roles.decorator.js';
import { AuthGuard } from '../guards/auth.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { AccessLinksService } from './access-links.service.js';

@Controller()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AccessLinksController {
  constructor(private readonly links: AccessLinksService) {}

  @Post('rooms/:roomId/access-links') create(@Param('roomId') roomId: string, @Body() body: any, @Req() request: any) { return this.links.create(roomId, request.user, body); }
  @Get('rooms/:roomId/access-links') list(@Param('roomId') roomId: string, @Req() request: any) { return this.links.list(roomId, request.user); }
  @Get('access-links/:id/usage') usage(@Param('id') id: string, @Req() request: any) { return this.links.usage(id, request.user); }
  @Post('access-links/:id/revoke') revoke(@Param('id') id: string, @Req() request: any) { return this.links.revoke(id, request.user); }
  @Post('access-links/:id/rotate') rotate(@Param('id') id: string, @Body() body: any, @Req() request: any) { return this.links.rotate(id, request.user, body); }
}
