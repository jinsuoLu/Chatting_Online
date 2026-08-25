import { Module } from '@nestjs/common';
import { SchedulerController } from './scheduler.controller.js';
import { SchedulerService } from './scheduler.service.js';
import { LifecycleScheduler } from './lifecycle.scheduler.js';
import { AccessLinksModule } from '../access-links/access-links.module.js';
import { VisitorAuthModule } from '../visitor-auth/visitor-auth.module.js';
@Module({ imports:[AccessLinksModule,VisitorAuthModule], controllers:[SchedulerController], providers:[SchedulerService,LifecycleScheduler], exports:[SchedulerService,LifecycleScheduler] })
export class SchedulerModule {}
