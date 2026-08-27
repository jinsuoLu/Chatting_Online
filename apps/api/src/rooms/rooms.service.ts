import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma.service.js';
import { BatchJobsService } from '../batch-jobs/batch-jobs.service.js';

export type Actor = { id: string; role: 'ADMIN' | 'SUPER_ADMIN' };
export type CreateRoomInput = { name: string; description?: string; expiresAt?: string | Date; maxVisitors?: number };
export type BatchCreateInput = CreateRoomInput & { namePrefix: string; count: number; autoGenerateLinks?: boolean };
type Quota = { adminId: string; maxRooms: number; currentRooms: number; maxVisitorsPerRoom: number; maxLinksPerRoom: number; maxBatchCreate: number };
const ACTIVE_ROOM_STATUSES = new Set(['ACTIVE', 'PAUSED', 'EXPIRED', 'REVOKED']);
const ASYNC_BATCH_THRESHOLD = 25;

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService, private readonly batchJobs: BatchJobsService) {}

  async create(actor: Actor, input: CreateRoomInput) {
    return this.prisma.$transaction((tx) => this.createInTransaction(tx, actor, input), { isolationLevel: 'Serializable' });
  }

  async list(actor: Actor) {
    const now = new Date();
    return this.prisma.room.findMany({
      where: {
        ...(actor.role === 'SUPER_ADMIN' ? {} : { adminId: actor.id }),
        deletedAt: null,
        status: { notIn: ['DELETED', 'EXPIRED'] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(actor: Actor, id: string) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException({ code: 'ROOM_NOT_FOUND', message: 'Room not found' });
    this.assertOwner(room, actor);
    return room;
  }

  async update(actor: Actor, id: string, input: Partial<CreateRoomInput>) {
    const room = await this.get(actor, id);
    if (room.status === 'DELETED') throw new BadRequestException({ code: 'ROOM_DELETED', message: 'Deleted rooms cannot be changed' });
    return this.prisma.$transaction(async (tx) => {
      const quota = await this.lockQuota(tx, room.adminId);
      if (input.maxVisitors !== undefined && quota && input.maxVisitors > quota.maxVisitorsPerRoom && actor.role !== 'SUPER_ADMIN') throw new BadRequestException({ code: 'VISITOR_QUOTA_EXCEEDED', message: 'Visitor limit exceeds quota' });
      const updated = await tx.room.update({ where: { id }, data: { name: input.name, description: input.description, maxVisitors: input.maxVisitors, expiresAt: input.expiresAt === undefined ? undefined : input.expiresAt ? new Date(input.expiresAt) : null } });
      await this.audit(tx, actor, 'ROOM_UPDATED', id);
      return updated;
    }, { isolationLevel: 'Serializable' });
  }

  pause(actor: Actor, id: string) { return this.changeStatus(actor, id, 'PAUSED', 'ROOM_PAUSED'); }
  resume(actor: Actor, id: string) { return this.changeStatus(actor, id, 'ACTIVE', 'ROOM_RESUMED'); }

  async remove(actor: Actor, id: string) {
    const room = await this.get(actor, id);
    if (room.status === 'DELETED') return room;
    return this.prisma.$transaction(async (tx) => {
      await this.lockQuota(tx, room.adminId);
      const deleted = await tx.room.update({ where: { id }, data: { status: 'DELETED', deletedAt: new Date() } });
      await tx.adminQuota.updateMany({ where: { adminId: room.adminId, currentRooms: { gt: 0 } }, data: { currentRooms: { decrement: 1 } } });
      await this.audit(tx, actor, 'ROOM_DELETED', id);
      return deleted;
    }, { isolationLevel: 'Serializable' });
  }

  async batch(actor: Actor, input: BatchCreateInput) {
    this.validateBatchInput(input);
    await this.validateBatchQuota(actor, input);
    if (input.count > ASYNC_BATCH_THRESHOLD) {
      const job = this.batchJobs.create(actor.id, input.count);
      void this.runAsyncBatch(job.id, actor, input);
      return { asynchronous: true, job };
    }
    return { asynchronous: false, ...(await this.createBatchAtomically(actor, input)) };
  }

  getBatchJob(actor: Actor, id: string) {
    if (actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN') throw new ForbiddenException();
    const job = this.batchJobs.get(id);
    if (actor.role !== 'SUPER_ADMIN' && job.ownerAdminId !== actor.id) throw new ForbiddenException({ code: 'BATCH_JOB_FORBIDDEN', message: 'You cannot access this batch job' });
    return job;
  }

  private async runAsyncBatch(jobId: string, actor: Actor, input: BatchCreateInput) {
    this.batchJobs.start(jobId);
    try {
      const result = await this.createBatchAtomically(actor, input, (completed, failed) => this.batchJobs.progress(jobId, completed, failed));
      this.batchJobs.complete(jobId, result);
    } catch (error) {
      this.batchJobs.fail(jobId, error);
    }
  }

  private async createBatchAtomically(actor: Actor, input: BatchCreateInput, progress?: (completed: number, failed: number) => void) {
    return this.prisma.$transaction(async (tx) => {
      const quota = await this.reserveQuota(tx, actor, input.count, input.maxVisitors, input.autoGenerateLinks === true);
      const rooms: unknown[] = [];
      for (let index = 1; index <= input.count; index += 1) {
        const room = await this.createRoom(tx, actor, quota, { ...input, name: `${input.namePrefix}-${String(index).padStart(3, '0')}` });
        rooms.push(room);
        progress?.(index, 0);
      }
      await this.audit(tx, actor, 'ROOM_BATCH_CREATED', undefined, { count: input.count });
      return { requested: input.count, succeeded: rooms.length, failed: [], rooms };
    }, { isolationLevel: 'Serializable' });
  }

  private async createInTransaction(tx: any, actor: Actor, input: CreateRoomInput) {
    if (!input.name?.trim()) throw new BadRequestException({ code: 'ROOM_NAME_REQUIRED', message: 'Room name is required' });
    const quota = await this.reserveQuota(tx, actor, 1, input.maxVisitors, false);
    const room = await this.createRoom(tx, actor, quota, input);
    await this.audit(tx, actor, 'ROOM_CREATED', room.id);
    return room;
  }

  private async createRoom(tx: any, actor: Actor, quota: Quota | null, input: CreateRoomInput & { autoGenerateLinks?: boolean }) {
    const room = await tx.room.create({ data: { adminId: actor.id, name: input.name.trim(), description: input.description, maxVisitors: input.maxVisitors ?? quota?.maxVisitorsPerRoom ?? 100, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null } });
    if (input.autoGenerateLinks) {
      const rawToken = randomBytes(32).toString('base64url');
      const expiresAt = room.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000);
      const link = await tx.roomAccessLink.create({ data: { roomId: room.id, tokenHash: createHash('sha256').update(rawToken).digest('hex'), expiresAt, createdBy: actor.id } });
      return { ...room, initialAccessLink: { id: link.id, url: `${(process.env.PUBLIC_APP_URL ?? '').replace(/\/$/, '')}/join/${rawToken}` } };
    }
    return room;
  }

  private async reserveQuota(tx: any, actor: Actor, count: number, maxVisitors?: number, needsLink = false) {
    const quota = await this.lockQuota(tx, actor.id);
    if (!quota) {
      if (actor.role === 'SUPER_ADMIN') return null;
      throw new BadRequestException({ code: 'ADMIN_QUOTA_NOT_FOUND', message: 'Administrator quota is missing' });
    }
    if (actor.role !== 'SUPER_ADMIN' && quota.currentRooms + count > quota.maxRooms) throw new BadRequestException({ code: 'ROOM_QUOTA_EXCEEDED', message: 'Room quota exceeded' });
    if (actor.role !== 'SUPER_ADMIN' && maxVisitors !== undefined && maxVisitors > quota.maxVisitorsPerRoom) throw new BadRequestException({ code: 'VISITOR_QUOTA_EXCEEDED', message: 'Visitor limit exceeds quota' });
    if (needsLink && actor.role !== 'SUPER_ADMIN' && quota.maxLinksPerRoom < 1) throw new BadRequestException({ code: 'LINK_QUOTA_EXCEEDED', message: 'Access-link quota does not allow generated links' });
    if (actor.role !== 'SUPER_ADMIN') await tx.adminQuota.update({ where: { adminId: actor.id }, data: { currentRooms: { increment: count } } });
    return quota;
  }

  private async validateBatchQuota(actor: Actor, input: BatchCreateInput) {
    if (actor.role === 'SUPER_ADMIN') return;
    const quota = await this.prisma.adminQuota.findUnique({ where: { adminId: actor.id } });
    if (!quota) throw new BadRequestException({ code: 'ADMIN_QUOTA_NOT_FOUND', message: 'Administrator quota is missing' });
    if (input.count > quota.maxBatchCreate) throw new BadRequestException({ code: 'BATCH_LIMIT_EXCEEDED', message: 'Batch size exceeds quota' });
    if (input.count > quota.maxRooms - quota.currentRooms) throw new BadRequestException({ code: 'ROOM_QUOTA_EXCEEDED', message: 'Room quota exceeded' });
  }

  private validateBatchInput(input: BatchCreateInput) {
    if (!input.namePrefix?.trim()) throw new BadRequestException({ code: 'ROOM_NAME_PREFIX_REQUIRED', message: 'Room name prefix is required' });
    if (!Number.isInteger(input.count) || input.count < 1) throw new BadRequestException({ code: 'BATCH_COUNT_INVALID', message: 'Batch count must be a positive integer' });
  }

  private async changeStatus(actor: Actor, id: string, status: 'ACTIVE' | 'PAUSED', action: string) {
    const room = await this.get(actor, id);
    if (!ACTIVE_ROOM_STATUSES.has(room.status)) throw new BadRequestException({ code: 'ROOM_STATE_INVALID', message: 'Room cannot transition from its current state' });
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.room.update({ where: { id }, data: { status } });
      await this.audit(tx, actor, action, id);
      return updated;
    });
  }

  private assertOwner(room: { adminId: string }, actor: Actor) {
    if (actor.role !== 'SUPER_ADMIN' && room.adminId !== actor.id) throw new ForbiddenException({ code: 'ROOM_FORBIDDEN', message: 'You cannot access this room' });
  }

  private async lockQuota(tx: any, adminId: string): Promise<Quota | null> {
    const rows = await tx.$queryRaw<Quota[]>`SELECT "adminId", "maxRooms", "currentRooms", "maxVisitorsPerRoom", "maxLinksPerRoom", "maxBatchCreate" FROM "AdminQuota" WHERE "adminId" = CAST(${adminId} AS uuid) FOR UPDATE`;
    return rows[0] ?? null;
  }

  private async audit(tx: any, actor: Actor, action: string, resourceId?: string, metadata?: Record<string, unknown>) {
    await tx.auditLog.create({ data: { actorUserId: actor.id, action, resourceType: 'Room', resourceId, metadata } });
  }
}
