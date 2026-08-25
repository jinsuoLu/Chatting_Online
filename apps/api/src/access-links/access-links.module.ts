import { Module } from '@nestjs/common'; import { AccessLinksService } from './access-links.service.js'; import { AccessLinksController } from './access-links.controller.js';
@Module({providers:[AccessLinksService],controllers:[AccessLinksController],exports:[AccessLinksService]}) export class AccessLinksModule {}
