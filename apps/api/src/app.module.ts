import { Logger, Module } from '@nestjs/common';
import { AccessLinksModule } from './access-links/access-links.module.js';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BatchJobsModule } from './batch-jobs/batch-jobs.module.js';
import { HealthModule } from './health/health.module.js';
import { MessagesController } from './messages/messages.controller.js';
import { MessagesService } from './messages/messages.service.js';
import { PrismaService } from './prisma/prisma.service.js';
import { QuotasModule } from './quotas/quotas.module.js';
import { RealtimeGateway } from './realtime.gateway.js';
import { RedisModule } from './redis/redis.module.js';
import { RoomsModule } from './rooms/rooms.module.js';
import { SchedulerModule } from './scheduler/scheduler.module.js';
import { VisitorAuthModule } from './visitor-auth/visitor-auth.module.js';
import { VisitorsService } from './visitors/visitors.service.js';

@Module({
  imports: [HealthModule, RedisModule, AuditModule, SchedulerModule, RoomsModule, QuotasModule, BatchJobsModule, AccessLinksModule, VisitorAuthModule, AuthModule],
  controllers: [MessagesController],
  providers: [Logger, PrismaService, VisitorsService, MessagesService, RealtimeGateway],
})
export class AppModule {}