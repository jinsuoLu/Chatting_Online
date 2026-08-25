import { Module } from '@nestjs/common';
import { AccessLinksModule } from '../access-links/access-links.module.js';
import { VisitorAuthController } from './visitor-auth.controller.js';
import { VisitorAuthService } from './visitor-auth.service.js';
@Module({ imports: [AccessLinksModule], controllers: [VisitorAuthController], providers: [VisitorAuthService], exports: [VisitorAuthService] })
export class VisitorAuthModule {}
