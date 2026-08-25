import { Module } from '@nestjs/common';
import { AccessLinksController } from './access-links.controller.js';
import { AccessLinksService } from './access-links.service.js';
@Module({ controllers: [AccessLinksController], providers: [AccessLinksService], exports: [AccessLinksService] })
export class AccessLinksModule {}
