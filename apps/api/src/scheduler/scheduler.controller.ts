import { Controller, Get, Param, Post } from '@nestjs/common';
import { SchedulerService, TASK_NAMES } from './scheduler.service.js';
@Controller('ops/tasks')
export class SchedulerController { constructor(private readonly scheduler: SchedulerService) {} @Get() list() { return Promise.all(TASK_NAMES.map(async task => this.scheduler.latest(task))); } @Get(':name') latest(@Param('name') name: string) { return this.scheduler.latest(name); } @Post(':name/run') run(@Param('name') name: string) { return this.scheduler.run(name); } }
