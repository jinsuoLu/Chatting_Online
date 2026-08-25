import { Module } from '@nestjs/common'; import { RoomsController } from './rooms.controller.js'; import { RoomsService } from './rooms.service.js'; import { PrismaService } from '../prisma.service.js';
@Module({controllers:[RoomsController],providers:[RoomsService,PrismaService],exports:[RoomsService]}) export class RoomsModule {}

