import { Module } from '@nestjs/common'; import { QuotasService } from './quotas.service.js'; import { QuotasController } from './quotas.controller.js'; import { PrismaService } from '../prisma.service.js';
@Module({controllers:[QuotasController],providers:[QuotasService,PrismaService]}) export class QuotasModule {}

