import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext) { const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY,[ctx.getHandler(),ctx.getClass()]); if (!roles?.length) return true; const user=ctx.switchToHttp().getRequest().user; if (!user || !roles.includes(user.role)) throw new ForbiddenException({code:'FORBIDDEN',message:'Insufficient permissions'}); return true; }
}
