import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SchedulerService } from './scheduler.service.js';
@Injectable()
export class LifecycleScheduler implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  constructor(private readonly scheduler: SchedulerService) {}
  onModuleInit() { const interval = Number(process.env.LIFECYCLE_INTERVAL_MS ?? 60_000); this.timer = setInterval(() => void this.runOnce(), interval); this.timer.unref(); }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  async runOnce() {
    const tasks = ['expire-rooms', 'expire-links', 'cleanup-sessions', 'reconcile-online', 'cleanup-messages'];
    return { ranAt: new Date().toISOString(), results: await Promise.all(tasks.map((task) => this.scheduler.run(task))) };
  }
}
