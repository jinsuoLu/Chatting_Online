import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { PrismaService } from '../prisma/prisma.service.js';
import type { VisitorIdentity } from '../visitors/visitors.service.js';
import type { Actor } from '../rooms/rooms.service.js';

type ImageUpload = { buffer: Buffer; size: number; mimetype?: string };
type ImageInfo = { extension: string; mimeType: string };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  private clean(content: string) {
    const value = content.trim();
    if (!value || value.length > 2000 || /<[^>]*>/.test(value)) throw new ForbiddenException('INVALID_MESSAGE_CONTENT');
    return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
  }

  async create(visitor: VisitorIdentity, content: string) {
    await this.assertRoomOpen(visitor.roomId);
    const saved = await this.prisma.message.create({ data: { roomId: visitor.roomId, visitorSessionId: visitor.id, type: MessageType.TEXT, content: this.clean(content) }, include: { visitorSession: true } });
    return this.publicMessage(saved, visitor.nickname);
  }

  async createImage(visitor: VisitorIdentity, upload: ImageUpload) {
    await this.assertRoomOpen(visitor.roomId);
    const image = this.inspectImage(upload);
    const imageKey = `${randomUUID()}.${image.extension}`;
    const filePath = path.join(this.uploadDir(), imageKey);
    await fs.mkdir(this.uploadDir(), { recursive: true });
    await fs.writeFile(filePath, upload.buffer, { flag: 'wx' });
    try {
      const saved = await this.prisma.message.create({ data: { roomId: visitor.roomId, visitorSessionId: visitor.id, type: MessageType.IMAGE, content: '', imageKey, imageMimeType: image.mimeType }, include: { visitorSession: true } });
      return this.publicMessage(saved, visitor.nickname);
    } catch (error) {
      await fs.unlink(filePath).catch(() => undefined);
      throw error;
    }
  }

  async visitorImage(visitor: VisitorIdentity, messageId: string) {
    await this.assertRoomOpen(visitor.roomId);
    const saved = await this.prisma.message.findFirst({ where: { id: messageId, roomId: visitor.roomId, visitorSessionId: visitor.id, type: MessageType.IMAGE }, include: { visitorSession: true } });
    if (!saved) throw new NotFoundException('IMAGE_MESSAGE_NOT_FOUND');
    return this.publicMessage(saved, visitor.nickname);
  }

  async imageFile(messageId: string) {
    const message = await this.prisma.message.findFirst({ where: { id: messageId, type: MessageType.IMAGE, imageKey: { not: null }, imageMimeType: { not: null } }, select: { roomId: true, imageKey: true, imageMimeType: true } });
    if (!message?.imageKey || !message.imageMimeType) throw new NotFoundException('IMAGE_NOT_FOUND');
    await this.assertRoomOpen(message.roomId);
    const filePath = path.join(this.uploadDir(), message.imageKey);
    await fs.access(filePath).catch(() => { throw new NotFoundException('IMAGE_NOT_FOUND'); });
    return { stream: createReadStream(filePath), mimeType: message.imageMimeType };
  }

  async list(actor: Actor, roomId: string, after?: string) {
    await this.assertOwner(actor, roomId);
    return this.prisma.message.findMany({ where: { roomId, ...(after ? { createdAt: { gt: new Date(after) } } : {}) }, include: { visitorSession: { select: { displayName: true } } }, orderBy: { createdAt: 'asc' }, take: 200 });
  }

  async remove(actor: Actor, roomId: string, messageId: string) {
    await this.assertOwner(actor, roomId);
    const message = await this.prisma.message.findFirst({ where: { id: messageId, roomId } });
    if (!message) throw new NotFoundException('MESSAGE_NOT_FOUND');
    const deleted = await this.prisma.message.delete({ where: { id: messageId } });
    if (deleted.imageKey) await fs.unlink(path.join(this.uploadDir(), deleted.imageKey)).catch(() => undefined);
    return deleted;
  }

  async onlineCount(actor: Actor, roomId: string, count: number) { await this.assertOwner(actor, roomId); return { roomId, count }; }

  private publicMessage(saved: any, fallbackNickname: string) {
    return { id: saved.id, roomId: saved.roomId, visitorSessionId: saved.visitorSessionId, nickname: saved.visitorSession?.displayName ?? fallbackNickname, type: saved.type, content: saved.content, imageUrl: saved.imageKey ? `/api/v1/uploads/${saved.id}` : null, createdAt: saved.createdAt.toISOString() };
  }

  private async assertRoomOpen(roomId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.status !== 'ACTIVE' || room.closedAt || room.deletedAt || (room.expiresAt && room.expiresAt <= new Date())) throw new ForbiddenException('ROOM_CLOSED');
  }

  private uploadDir() { return process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), 'uploads'); }

  private inspectImage(upload: ImageUpload): ImageInfo {
    if (!upload?.buffer?.length || upload.size > MAX_IMAGE_BYTES) throw new ForbiddenException('IMAGE_TOO_LARGE');
    const buffer = upload.buffer;
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { extension: 'png', mimeType: 'image/png' };
    if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return { extension: 'jpg', mimeType: 'image/jpeg' };
    if (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a') return { extension: 'gif', mimeType: 'image/gif' };
    if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return { extension: 'webp', mimeType: 'image/webp' };
    throw new ForbiddenException('INVALID_IMAGE_TYPE');
  }

  private async assertOwner(actor: Actor, roomId: string) { const room = await this.prisma.room.findUnique({ where: { id: roomId } }); if (!room) throw new NotFoundException('ROOM_NOT_FOUND'); if (actor.role !== 'SUPER_ADMIN' && room.adminId !== actor.id) throw new ForbiddenException('ROOM_FORBIDDEN'); }
}
