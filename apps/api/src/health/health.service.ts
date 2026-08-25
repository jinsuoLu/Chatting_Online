import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS } from '../redis/redis.module.js';
import { DatabaseService } from './database.service.js';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  constructor(private readonly database: DatabaseService, @Inject(REDIS) private readonly redis: Redis) {}
  live() { return this.info('ok'); }
  async ready() {
    const checks = await Promise.allSettled([this.database.isReady(), this.redis.ping()]);
    const database = checks[0].status === 'fulfilled';
    const redis = checks[1].status === 'fulfilled' && checks[1].value === 'PONG';
    const status = database && redis ? 'ok' : 'error';
    if (status === 'error') this.logger.error('Readiness check failed', { database, redis });
    return { ...this.info(status), checks: { database, redis } };
  }
  private info(status: 'ok' | 'error') { return { status, service: 'api', version: process.env.APP_VERSION ?? '0.1.0', mode: process.env.NODE_ENV ?? 'development', timestamp: new Date().toISOString() }; }
}
