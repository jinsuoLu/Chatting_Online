import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaService } from '../prisma.service.js';
import { QuotasController } from './quotas.controller.js';
import { QuotasService } from './quotas.service.js';

@Module({
  imports: [AuthModule],
  controllers: [QuotasController],
  providers: [QuotasService, PrismaService],
})
export class QuotasModule {}
