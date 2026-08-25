import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../health/database.service.js';

const REDACTED_KEYS = /password|token|cookie|session/i;
@Injectable()
export class AuditService {
  constructor(private readonly database: DatabaseService) {}
  sanitize(metadata: Record<string, unknown> | undefined) {
    if (!metadata) return undefined;
    return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, REDACTED_KEYS.test(key) ? '[REDACTED]' : typeof value === 'string' && value.length > 160 ? '[REDACTED]' : value]));
  }
  async record(input: { action: string; resourceType: string; resourceId?: string; actorUserId?: string; actorVisitorSessionId?: string; metadata?: Record<string, unknown> }) {
    return this.database.auditLog.create({ data: { action: input.action, resourceType: input.resourceType, resourceId: input.resourceId, actorUserId: input.actorUserId, actorVisitorSessionId: input.actorVisitorSessionId, metadata: this.sanitize(input.metadata) } });
  }
  async list(limit = 100) { return this.database.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: Math.min(Math.max(limit, 1), 500) }); }
}
