import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service.js';

const actions: Array<[RegExp, string, string]> = [
  [/\/auth\/login$/, 'login', 'user'], [/\/auth\/logout$/, 'logout', 'user'], [/\/admins$/, 'create_admin', 'user'],
  [/\/quota/, 'update_quota', 'quota'], [/\/rooms\/batch/, 'batch_create_rooms', 'room'], [/\/rooms$/, 'create_room', 'room'],
  [/\/links.*revoke/, 'revoke_link', 'access_link'], [/\/links/, 'generate_link', 'access_link'], [/\/rooms.*pause/, 'pause_room', 'room'],
  [/\/rooms.*resume/, 'resume_room', 'room'], [/\/rooms.*force-close/, 'force_close_room', 'room'], [/\/rooms/, 'delete_room', 'room'],
  [/\/messages/, 'delete_message', 'message'], [/\/config/, 'update_system_config', 'system_config'],
];
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ method?: string; originalUrl?: string; url?: string; user?: { id?: string }; params?: { id?: string } }>();
    const match = request.method && request.method !== 'GET' ? actions.find(([pattern]) => pattern.test(request.originalUrl ?? request.url ?? '')) : undefined;
    return next.handle().pipe(tap({ next: () => { if (match) void this.audit.record({ action: match[1], resourceType: match[2], resourceId: request.params?.id, actorUserId: request.user?.id }); } }));
  }
}
