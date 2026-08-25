import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module.js';
import { HealthController } from '../health.controller.js';
import { DatabaseModule } from './database.module.js';
import { HealthService } from './health.service.js';

@Module({ imports: [DatabaseModule, RedisModule], controllers: [HealthController], providers: [HealthService], exports: [HealthService] })
export class HealthModule {}
