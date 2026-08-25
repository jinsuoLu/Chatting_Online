import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const origin = request.headers.origin;
    const allowedOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
    if (origin && origin !== allowedOrigin) {
      throw new ForbiddenException({ code: 'CSRF_ORIGIN_INVALID', message: 'Invalid request origin' });
    }
    return true;
  }
}
