import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service.js';
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(ctx: ExecutionContext) { const req = ctx.switchToHttp().getRequest(); const token = req.cookies?.access_session; if (!token) throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Authentication required' }); const user = await this.auth.validateSession(token); if (!user) throw new UnauthorizedException({ code: 'AUTH_INVALID', message: 'Authentication required' }); req.user = user; return true; }
}
