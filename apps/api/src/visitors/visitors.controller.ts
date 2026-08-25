import { Body, Controller, Get, Headers, Param, Post, Req } from '@nestjs/common';
import { VisitorsService } from './visitors.service.js';
@Controller('join')
export class VisitorsController {
  constructor(private readonly visitors: VisitorsService) {}
  @Get(':token') inspect(@Param('token') token: string) { return this.visitors.inspectAccessLink(token); }
  @Post(':token') join(@Param('token') token: string, @Body() body: { nickname?: string }, @Headers('user-agent') userAgent: string | undefined, @Req() request: any) { return this.visitors.createSession(token, body.nickname ?? '', request.ip, userAgent); }
}