import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AccessLinksController } from './access-links.controller.js';
import { AccessLinksService } from './access-links.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AccessLinksController],
  providers: [AccessLinksService],
  exports: [AccessLinksService],
})
export class AccessLinksModule {}
