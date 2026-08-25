import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { VisitorAuthService } from './visitor-auth.service.js';
@Controller('join')
export class VisitorAuthController {
  constructor(private readonly visitorAuth: VisitorAuthService) {}
  @Get(':token/validate') validate(@Param('token') token: string) { return this.visitorAuth.validate(token); }
  @Post(':token/session') session(@Param('token') token: string, @Body() body: { displayName?: string }) { return this.visitorAuth.createSession(token, body.displayName ?? ''); }
}
