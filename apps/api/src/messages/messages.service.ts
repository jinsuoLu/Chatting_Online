import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { VisitorIdentity } from '../visitors/visitors.service.js';
import type { Actor } from '../rooms/rooms.service.js';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}
  private clean(content: string) {
    const value = content.trim();
    if (!value || value.length > 2000 || /<[^>]*>/.test(value)) throw new ForbiddenException('INVALID_MESSAGE_CONTENT');
    return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
  }
  async create(visitor: VisitorIdentity, content: string) {
    const room = await this.prisma.room.findUnique({ where: { id: visitor.roomId } });
    if (!room || room.status !== 'ACTIVE' || room.closedAt || room.deletedAt || (room.expiresAt && room.expiresAt <= new Date())) throw new ForbiddenException('ROOM_CLOSED');
    const saved = await this.prisma.message.create({ data: { roomId: visitor.roomId, visitorSessionId: visitor.id, type: MessageType.TEXT, content: this.clean(content) }, include: { visitorSession: true } });
    return { id: saved.id, roomId: saved.roomId, visitorSessionId: visitor.id, nickname: saved.visitorSession?.displayName ?? visitor.nickname, content: saved.content, createdAt: saved.createdAt.toISOString() };
  }
  async list(actor: Actor, roomId: string, after?: string) {
    await this.assertOwner(actor, roomId);
    return this.prisma.message.findMany({ where: { roomId, ...(after ? { createdAt: { gt: new Date(after) } } : {}) }, include: { visitorSession: { select: { displayName: true } } }, orderBy: { createdAt: 'asc' }, take: 200 });
  }
  async remove(actor: Actor, roomId: string, messageId: string) {
    await this.assertOwner(actor, roomId);
    const message = await this.prisma.message.findFirst({ where: { id: messageId, roomId } });
    if (!message) throw new NotFoundException('MESSAGE_NOT_FOUND');
    return this.prisma.message.delete({ where: { id: messageId } });
  }
  async onlineCount(actor: Actor, roomId: string, count: number) { await this.assertOwner(actor, roomId); return { roomId, count }; }
  private async assertOwner(actor: Actor, roomId: string) { const room = await this.prisma.room.findUnique({ where: { id: roomId } }); if (!room) throw new NotFoundException('ROOM_NOT_FOUND'); if (actor.role !== 'SUPER_ADMIN' && room.adminId !== actor.id) throw new ForbiddenException('ROOM_FORBIDDEN'); }
}