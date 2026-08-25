import { APP_INTERCEPTOR } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller.js';
import { AuditInterceptor } from './audit.interceptor.js';
import { AuditService } from './audit.service.js';
@Module({ controllers: [AuditController], providers: [AuditService, { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }], exports: [AuditService] })
export class AuditModule {}
