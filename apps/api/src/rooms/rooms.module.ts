import { Module } from '@nestjs/common';
import { AuthService } from '../auth/auth.service.js';
import { BatchJobsService } from '../batch-jobs/batch-jobs.service.js';
import { AuthGuard } from '../guards/auth.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { PrismaService } from '../prisma.service.js';
import { RoomsController } from './rooms.controller.js';
import { RoomsService } from './rooms.service.js';
@Module({controllers:[RoomsController],providers:[RoomsService,BatchJobsService,PrismaService,AuthService,AuthGuard,RolesGuard],exports:[RoomsService]})
export class RoomsModule {}
