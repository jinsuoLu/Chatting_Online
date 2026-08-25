import { Module } from '@nestjs/common';
import { BatchJobsService } from './batch-jobs.service.js';
@Module({ providers: [BatchJobsService], exports: [BatchJobsService] })
export class BatchJobsModule {}
