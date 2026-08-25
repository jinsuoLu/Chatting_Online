import { AuthService } from './auth.service';

describe('AuthService security', () => {
  const users = new Map<string, any>();
  const prisma: any = {
    user: {
      findUnique: async ({ where }: any) => where.id ? [...users.values()].find(u => u.id === where.id) : users.get(where.username),
      update: async ({ where, data }: any) => { const u = [...users.values()].find(x => x.id === where.id); Object.assign(u, data); return u; },
      create: async ({ data }: any) => { const u = { id: '1', createdAt: new Date(), updatedAt: new Date(), ...data }; users.set(u.username, u); return u; },
      findMany: async () => [...users.values()],
    },
    auditLog: { create: async () => undefined },
  };
  beforeEach(async () => { users.clear(); const argon2 = await import('argon2'); users.set('admin', { id:'1', username:'admin', passwordHash: await argon2.hash('secret',{type:argon2.argon2id}), role:'SUPER_ADMIN', status:'ACTIVE' }); });
  it('logs in without returning password hash', async () => { const result = await new AuthService(prisma).login('admin','secret'); expect(result.user.passwordHash).toBeUndefined(); expect(result.token).toBeDefined(); });
  it('rejects wrong password with generic error', async () => { await expect(new AuthService(prisma).login('admin','wrong')).rejects.toMatchObject({ response: { code:'INVALID_CREDENTIALS' } }); });
  it('rejects disabled account', async () => { users.get('admin').status='DISABLED'; await expect(new AuthService(prisma).login('admin','secret')).rejects.toMatchObject({ response: { code:'INVALID_CREDENTIALS' } }); });
});
