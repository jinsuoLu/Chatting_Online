import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BatchJobsService } from '../batch-jobs/batch-jobs.service.js';
import { PrismaService } from '../prisma.service.js';
import { RoomsController } from './rooms.controller.js';
import { RoomsService } from './rooms.service.js';

@Module({
  imports: [AuthModule],
  controllers: [RoomsController],
  providers: [RoomsService, BatchJobsService, PrismaService],
  exports: [RoomsService],
})
export class RoomsModule {}
