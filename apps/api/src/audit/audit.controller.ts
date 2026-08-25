import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service.js';
@Controller('audit')
export class AuditController { constructor(private readonly audit: AuditService) {} @Get() list(@Query('limit') limit?: string) { return this.audit.list(Number(limit ?? 100)); } }
