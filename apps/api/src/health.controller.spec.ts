import { HealthController } from './health.controller';
describe('HealthController', () => { it('returns ok status', () => { const health = { live: () => ({ status: 'ok' }) } as never; expect(new HealthController(health).check().status).toBe('ok'); }); });
