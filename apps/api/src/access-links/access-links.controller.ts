import { Body, Controller, Get, Param, Post, Req, UnauthorizedException } from '@nestjs/common';
import { AccessLinksService } from './access-links.service.js';
const actor = (request: any) => { if (!request.user) throw new UnauthorizedException('AUTH_REQUIRED'); return request.user; };
@Controller()
export class AccessLinksController {
  constructor(private readonly links: AccessLinksService) {}
  @Post('rooms/:roomId/access-links') create(@Param('roomId') roomId: string, @Body() body: any, @Req() request: any) { return this.links.create(roomId, actor(request), body); }
  @Get('rooms/:roomId/access-links') list(@Param('roomId') roomId: string, @Req() request: any) { return this.links.list(roomId, actor(request)); }
  @Get('access-links/:id/usage') usage(@Param('id') id: string, @Req() request: any) { return this.links.usage(id, actor(request)); }
  @Post('access-links/:id/revoke') revoke(@Param('id') id: string, @Req() request: any) { return this.links.revoke(id, actor(request)); }
  @Post('access-links/:id/rotate') rotate(@Param('id') id: string, @Body() body: any, @Req() request: any) { return this.links.rotate(id, actor(request), body); }
}
