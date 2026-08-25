import { Controller, Get, HttpCode, ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health/health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}
  @Get() check() { return this.health.live(); }
  @Get('live') live() { return this.health.live(); }
  @Get('ready') @HttpCode(200)
  async ready() { const result = await this.health.ready(); if (result.status !== 'ok') throw new ServiceUnavailableException(result); return result; }
}
