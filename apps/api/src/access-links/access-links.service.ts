import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { DatabaseService } from '../health/database.service.js';

type Actor = { id: string; role?: string };
type CreateInput = { expiresAt: string | Date; maxUses?: number | null; batch?: number };
const invalid = () => new UnauthorizedException('ACCESS_LINK_INVALID');

@Injectable()
export class AccessLinksService {
  constructor(private readonly database: DatabaseService) {}

  hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
  private joinUrl(token: string) {
    const origin = (process.env.PUBLIC_APP_URL ?? 'https://example.com').replace(/\/$/, '');
    if (!origin.startsWith('https://')) throw new Error('PUBLIC_APP_URL must use HTTPS');
    return `${origin}/join/${token}`;
  }
  private publicLink(link: any) {
    const { tokenHash: _tokenHash, updatedAt: _updatedAt, ...result } = link;
    return result;
  }
  private async owner(roomId: string, actor: Actor) {
    const room = await this.database.room.findUnique({ where: { id: roomId } });
    if (!room || room.deletedAt || room.status === 'DELETED') throw new NotFoundException('ROOM_NOT_FOUND');
    if (actor.role !== 'SUPER_ADMIN' && room.adminId !== actor.id) throw new ForbiddenException('FORBIDDEN');
    return room;
  }
  private async audit(action: string, resourceId: string | undefined, actorUserId?: string, metadata?: Record<string, unknown>) {
    await this.database.auditLog.create({ data: { action, resourceType: 'RoomAccessLink', resourceId, actorUserId, metadata: metadata as Prisma.InputJsonValue | undefined } }).catch(() => undefined);
  }

  async create(roomId: string, actor: Actor, input: CreateInput) {
    const room = await this.owner(roomId, actor);
    const expiresAt = new Date(input.expiresAt);
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date()) throw new BadRequestException('INVALID_EXPIRY');
    if (input.maxUses !== undefined && input.maxUses !== null && (!Number.isInteger(input.maxUses) || input.maxUses < 1)) throw new BadRequestException('INVALID_MAX_USES');
    const count = Math.max(1, Math.min(input.batch ?? 1, 100));
    const result: any[] = [];
    for (let index = 0; index < count; index += 1) {
      const rawToken = randomBytes(32).toString('base64url');
      const link = await this.database.roomAccessLink.create({ data: { roomId: room.id, tokenHash: this.hash(rawToken), expiresAt, maxUses: input.maxUses ?? null, createdBy: actor.id } });
      await this.audit('ACCESS_LINK_CREATED', link.id, actor.id, { roomId });
      result.push({ ...this.publicLink(link), url: this.joinUrl(rawToken) });
    }
    return result;
  }

  async list(roomId: string, actor: Actor) {
    await this.owner(roomId, actor);
    const links = await this.database.roomAccessLink.findMany({ where: { roomId }, orderBy: { createdAt: 'desc' } });
    return links.map((link) => this.publicLink(link));
  }

  async usage(id: string, actor: Actor) {
    const link = await this.database.roomAccessLink.findUnique({ where: { id } });
    if (!link) throw new NotFoundException('LINK_NOT_FOUND');
    await this.owner(link.roomId, actor);
    return this.database.auditLog.findMany({ where: { resourceType: 'RoomAccessLink', resourceId: id }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async revoke(id: string, actor: Actor) {
    const link = await this.database.roomAccessLink.findUnique({ where: { id } });
    if (!link) throw new NotFoundException('LINK_NOT_FOUND');
    await this.owner(link.roomId, actor);
    const updated = await this.database.roomAccessLink.update({ where: { id }, data: { status: 'REVOKED', revokedAt: new Date() } });
    await this.audit('ACCESS_LINK_REVOKED', id, actor.id);
    return this.publicLink(updated);
  }

  async rotate(id: string, actor: Actor, input: Omit<CreateInput, 'batch'>) {
    const link = await this.database.roomAccessLink.findUnique({ where: { id } });
    if (!link) throw new NotFoundException('LINK_NOT_FOUND');
    await this.revoke(id, actor);
    return (await this.create(link.roomId, actor, input))[0];
  }

  async validate(token: string) {
    const tokenHash = this.hash(token);
    const link = await this.database.roomAccessLink.findUnique({ where: { tokenHash }, include: { room: true } });
    const unavailable = !link || link.status !== 'ACTIVE' || !!link.revokedAt || link.expiresAt <= new Date() || !link.room || link.room.status !== 'ACTIVE' || !!link.room.deletedAt || (!!link.room.expiresAt && link.room.expiresAt <= new Date()) || (link.maxUses !== null && link.usedCount >= link.maxUses);
    if (unavailable) {
      await this.audit('ACCESS_LINK_REJECTED', link?.id, undefined, { reason: 'INVALID_OR_UNAVAILABLE' });
      throw invalid();
    }
    const online = await this.database.visitorSession.count({ where: { roomId: link.roomId, status: 'ACTIVE', expiresAt: { gt: new Date() }, revokedAt: null } });
    if (online >= link.room.maxVisitors) {
      await this.audit('ACCESS_LINK_REJECTED', link.id, undefined, { reason: 'ROOM_FULL' });
      throw invalid();
    }
    await this.audit('ACCESS_LINK_VALIDATED', link.id, undefined);
    return { link, room: link.room };
  }

  async consume(token: string) {
    const tokenHash = this.hash(token);
    try {
      return await this.database.$transaction(async (tx: any) => {
        const link = await tx.roomAccessLink.findUnique({ where: { tokenHash }, include: { room: true } });
        const unavailable = !link || link.status !== 'ACTIVE' || !!link.revokedAt || link.expiresAt <= new Date() || link.room.status !== 'ACTIVE' || !!link.room.deletedAt || (!!link.room.expiresAt && link.room.expiresAt <= new Date()) || (link.maxUses !== null && link.usedCount >= link.maxUses);
        if (unavailable) throw invalid();
        const online = await tx.visitorSession.count({ where: { roomId: link.roomId, status: 'ACTIVE', expiresAt: { gt: new Date() }, revokedAt: null } });
        if (online >= link.room.maxVisitors) throw invalid();
        const claimed = await tx.roomAccessLink.updateMany({ where: { id: link.id, status: 'ACTIVE', revokedAt: null, ...(link.maxUses === null ? {} : { usedCount: { lt: link.maxUses } }) }, data: { usedCount: { increment: 1 }, lastUsedAt: new Date() } });
        if (claimed.count !== 1) throw invalid();
        return link;
      }, { isolationLevel: 'Serializable' as any });
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw invalid();
    }
  }

  async markExpired(now = new Date()) {
    return this.database.roomAccessLink.updateMany({ where: { status: 'ACTIVE', expiresAt: { lte: now } }, data: { status: 'EXPIRED' } });
  }
}


