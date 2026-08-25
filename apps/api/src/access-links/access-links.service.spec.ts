import { AccessLinksService } from './access-links.service';

const room = { id: 'room-1', adminId: 'admin-1', name: 'Test room', status: 'ACTIVE', deletedAt: null, expiresAt: null, maxVisitors: 5 };
const future = () => new Date(Date.now() + 60_000);
function database() {
  const links = new Map<string, any>();
  let id = 0;
  const db: any = {
    room: { findUnique: jest.fn(async () => room) },
    roomAccessLink: {
      create: jest.fn(async ({ data }) => { const link = { id: `link-${++id}`, status: 'ACTIVE', revokedAt: null, usedCount: 0, lastUsedAt: null, createdAt: new Date(), updatedAt: new Date(), ...data }; links.set(link.id, link); return link; }),
      findUnique: jest.fn(async ({ where }) => [...links.values()].find((link) => link.id === where.id || link.tokenHash === where.tokenHash) ? { ...[...links.values()].find((link) => link.id === where.id || link.tokenHash === where.tokenHash), room } : null),
      findMany: jest.fn(async () => [...links.values()]),
      update: jest.fn(async ({ where, data }) => Object.assign(links.get(where.id), data)),
      updateMany: jest.fn(async ({ where, data }) => { const link = links.get(where.id); if (!link || link.status !== where.status || link.revokedAt !== where.revokedAt || (where.usedCount && !(link.usedCount < where.usedCount.lt))) return { count: 0 }; link.usedCount += data.usedCount?.increment ?? 0; link.lastUsedAt = data.lastUsedAt; return { count: 1 }; }),
    },
    visitorSession: { count: jest.fn(async () => 0) },
    auditLog: { create: jest.fn(async () => ({})), findMany: jest.fn(async () => []) },
  };
  db.$transaction = async (run: any) => run(db);
  return { db, links };
}

describe('AccessLinksService', () => {
  test('generates distinct 32-byte opaque links and never persists raw tokens', async () => {
    const { db, links } = database(); const service = new AccessLinksService(db);
    const [first] = await service.create(room.id, { id: room.adminId }, { expiresAt: future() });
    const [second] = await service.create(room.id, { id: room.adminId }, { expiresAt: future() });
    expect(first.url).toMatch(/^https:\/\/example\.com\/join\/[A-Za-z0-9_-]{43}$/);
    expect(first.url).not.toEqual(second.url);
    expect([...links.values()][0]).toHaveProperty('tokenHash');
    expect(Object.keys([...links.values()][0])).not.toContain('token');
  });
  test('rejects expired and revoked links with one public error', async () => {
    const { db, links } = database(); const service = new AccessLinksService(db);
    const [expired] = await service.create(room.id, { id: room.adminId }, { expiresAt: new Date(Date.now() - 1) }).catch(() => []);
    expect(expired).toBeUndefined();
    const created: any = (await service.create(room.id, { id: room.adminId }, { expiresAt: future() }))[0];
    await service.revoke(created.id, { id: room.adminId });
    await expect(service.validate(created.url.split('/').pop()!)).rejects.toThrow('ACCESS_LINK_INVALID');
    expect(links.get(created.id).status).toBe('REVOKED');
  });
  test('does not allow one administrator to revoke another administrator link', async () => {
    const { db } = database(); const service = new AccessLinksService(db);
    const created: any = (await service.create(room.id, { id: room.adminId }, { expiresAt: future() }))[0];
    await expect(service.revoke(created.id, { id: 'admin-2' })).rejects.toThrow('FORBIDDEN');
  });
});

