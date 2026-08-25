import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS } from '../redis/redis.module.js';
import { DatabaseService } from '../health/database.service.js';

export const TASK_NAMES = ['expire-rooms','expire-links','cleanup-sessions','reconcile-online','cleanup-messages','timeout-batches','reconcile-quotas'] as const;
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  constructor(private readonly database: DatabaseService, @Inject(REDIS) private readonly redis: Redis) {}
  async run(name: string) {
    if (!TASK_NAMES.includes(name as never)) throw new Error(`Unknown task: ${name}`);
    const startedAt = new Date(); let affected = 0;
    try {
      const now = new Date();
      if (name === 'expire-rooms') affected = (await this.database.room.updateMany({ where: { status: 'ACTIVE', expiresAt: { lt: now } }, data: { status: 'EXPIRED', closedAt: now } })).count;
      if (name === 'expire-links') affected = (await this.database.roomAccessLink.updateMany({ where: { status: 'ACTIVE', expiresAt: { lt: now } }, data: { status: 'EXPIRED' } })).count;
      if (name === 'cleanup-sessions') affected = (await this.database.visitorSession.updateMany({ where: { revokedAt: null, expiresAt: { lt: now } }, data: { revokedAt: now, status: 'EXPIRED', disconnectedAt: now } })).count;
      if (name === 'reconcile-online') affected = (await this.database.deviceConnection.updateMany({ where: { disconnectedAt: null, connectedAt: { lt: new Date(now.getTime() - 24*3600*1000) } }, data: { disconnectedAt: now } })).count;
      if (name === 'cleanup-messages') affected = (await this.database.message.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - Number(process.env.MESSAGE_RETENTION_DAYS ?? 30)*86400000) } } })).count;
      if (name === 'reconcile-quotas') { const admins = await this.database.adminQuota.findMany({ select: { adminId: true } }); for (const admin of admins) { const currentRooms = await this.database.room.count({ where: { adminId: admin.adminId, status: { in: ['ACTIVE','PAUSED'] } } }); await this.database.adminQuota.update({ where: { adminId: admin.adminId }, data: { currentRooms } }); affected++; } }
      const result = { task: name, status: 'success', affected, startedAt: startedAt.toISOString(), finishedAt: new Date().toISOString() }; await this.redis.set(`ops:task:${name}`, JSON.stringify(result)); return result;
    } catch (error) { this.logger.error(`Task ${name} failed`, error); const result = { task: name, status: 'failed', error: error instanceof Error ? error.message : String(error), startedAt: startedAt.toISOString(), finishedAt: new Date().toISOString() }; await this.redis.set(`ops:task:${name}`, JSON.stringify(result)); throw error; }
  }
  async latest(name: string) { const value = await this.redis.get(`ops:task:${name}`); return value ? JSON.parse(value) : null; }
}

