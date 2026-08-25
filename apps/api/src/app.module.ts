import { Module, Logger } from '@nestjs/common';
import { HealthModule } from './health/health.module.js'; import { RedisModule } from './redis/redis.module.js'; import { RealtimeGateway } from './realtime.gateway.js'; import { AuditModule } from './audit/audit.module.js'; import { SchedulerModule } from './scheduler/scheduler.module.js'; import { RoomsModule } from './rooms/rooms.module.js'; import { QuotasModule } from './quotas/quotas.module.js'; import { BatchJobsModule } from './batch-jobs/batch-jobs.module.js'; import { AccessLinksModule } from './access-links/access-links.module.js'; import { VisitorAuthModule } from './visitor-auth/visitor-auth.module.js';
import { AuthModule } from './auth/auth.module.js';
import { PrismaService } from './prisma/prisma.service.js';
import { VisitorsController } from './visitors/visitors.controller.js';
import { VisitorsService } from './visitors/visitors.service.js';
import { MessagesController } from './messages/messages.controller.js';
import { MessagesService } from './messages/messages.service.js';
@Module({ imports:[HealthModule,RedisModule,AuditModule,SchedulerModule,RoomsModule,QuotasModule,BatchJobsModule,AccessLinksModule,VisitorAuthModule,AuthModule], controllers:[VisitorsController,MessagesController], providers:[Logger,PrismaService,VisitorsService,MessagesService,RealtimeGateway] }) export class AppModule {}




