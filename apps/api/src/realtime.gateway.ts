import { ForbiddenException, Inject, Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { createAdapter } from '@socket.io/redis-adapter';
import type Redis from 'ioredis';
import { Server, Socket } from 'socket.io';
import { REDIS } from './redis/redis.module.js';
import { VisitorsService, type VisitorIdentity } from './visitors/visitors.service.js';
import { MessagesService } from './messages/messages.service.js';

const ROOM_PREFIX = 'room:';
const roomKey = (roomId: string) => `chat:room:${roomId}:sockets`;

@WebSocketGateway({ namespace: '/chat', cors: { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000', credentials: true } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly identities = new Map<string, VisitorIdentity>();
  private readonly joinedRooms = new Map<string, string>();
  private readonly localRooms = new Map<string, Set<string>>();

  constructor(@Inject(REDIS) private readonly redis: Redis, private readonly visitors: VisitorsService, private readonly messages: MessagesService) {}

  async afterInit(server: Server) {
    try {
      const pub = this.redis.duplicate();
      const sub = this.redis.duplicate();
      await Promise.all([pub.connect(), sub.connect()]);
      server.adapter(createAdapter(pub, sub));
    } catch (error) { this.logger.warn(`Redis adapter unavailable; using in-memory adapter: ${(error as Error).message}`); }
  }

  async handleConnection(client: Socket) {
    try {
      const sessionToken = client.handshake.auth?.sessionToken;
      if (typeof sessionToken !== 'string') throw new ForbiddenException('INVALID_SESSION');
      const identity = await this.visitors.authenticate(sessionToken);
      this.identities.set(client.id, identity);
      await this.visitors.touch(identity);
    } catch {
      client.emit('error', { code: 'UNAUTHORIZED', message: 'Invalid or expired visitor session' });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const identity = this.identities.get(client.id);
    const roomId = this.joinedRooms.get(client.id);
    if (roomId && identity) {
      await this.leave(client, identity, roomId, true);
      await this.visitors.disconnect(identity).catch(() => undefined);
    }
    this.identities.delete(client.id);
  }

  @SubscribeMessage('room:join')
  async joinRoom(@ConnectedSocket() client: Socket, @MessageBody() body: { roomId?: string }) {
    const identity = this.identity(client);
    if (body?.roomId !== identity.roomId) return this.fail(client, 'ROOM_FORBIDDEN', 'Visitor session does not belong to this room');
    try { await this.visitors.assertRoomActive(identity.roomId); } catch { return this.closeRoom(client); }
    const current = this.joinedRooms.get(client.id);
    if (current === identity.roomId) return this.emitJoined(client, identity.roomId, identity);
    if (current) await this.leave(client, identity, current, false);
    await client.join(ROOM_PREFIX + identity.roomId);
    this.joinedRooms.set(client.id, identity.roomId);
    await this.addOnline(identity.roomId, client.id);
    const count = await this.countOnline(identity.roomId);
    client.emit('room:joined', { roomId: identity.roomId, visitorSessionId: identity.id, nickname: identity.nickname, onlineCount: count, serverTime: new Date().toISOString() });
    client.to(ROOM_PREFIX + identity.roomId).emit('visitor:joined', { visitorSessionId: identity.id, nickname: identity.nickname });
    this.server.to(ROOM_PREFIX + identity.roomId).emit('visitor:count', { roomId: identity.roomId, count });
  }

  @SubscribeMessage('message:send')
  async sendMessage(@ConnectedSocket() client: Socket, @MessageBody() body: { roomId?: string; content?: string }) {
    const identity = this.identity(client);
    if (this.joinedRooms.get(client.id) !== identity.roomId || body?.roomId !== identity.roomId) return this.fail(client, 'ROOM_FORBIDDEN', 'Join your assigned room first');
    if (typeof body.content !== 'string') return this.fail(client, 'INVALID_MESSAGE_CONTENT', 'Text content is required');
    if (!(await this.allowMessage(identity.id))) return this.fail(client, 'RATE_LIMITED', 'Too many messages; try again shortly');
    try {
      const message = await this.messages.create(identity, body.content);
      this.server.to(ROOM_PREFIX + identity.roomId).emit('message:new', message);
      return message;
    } catch (error) { return this.fail(client, 'MESSAGE_REJECTED', (error as Error).message); }
  }

  @SubscribeMessage('typing:start') typingStart(@ConnectedSocket() client: Socket, @MessageBody() body: { roomId?: string }) { return this.typing(client, body, true); }
  @SubscribeMessage('typing:stop') typingStop(@ConnectedSocket() client: Socket, @MessageBody() body: { roomId?: string }) { return this.typing(client, body, false); }
  @SubscribeMessage('room:leave') async leaveRoom(@ConnectedSocket() client: Socket) { const identity = this.identity(client); const roomId = this.joinedRooms.get(client.id); if (roomId) await this.leave(client, identity, roomId, false); }
  @SubscribeMessage('heartbeat') async heartbeat(@ConnectedSocket() client: Socket) { const identity = this.identity(client); try { await this.visitors.assertRoomActive(identity.roomId); await this.visitors.touch(identity); return { serverTime: new Date().toISOString() }; } catch { return this.closeRoom(client); } }

  onlineCount(roomId: string) { return this.localRooms.get(roomId)?.size ?? 0; }
  async closeRoomConnections(roomId: string) { this.server.to(ROOM_PREFIX + roomId).emit('room:closed', { roomId }); for (const socket of await this.server.in(ROOM_PREFIX + roomId).fetchSockets()) socket.disconnect(true); }

  private identity(client: Socket) { const identity = this.identities.get(client.id); if (!identity) throw new ForbiddenException('INVALID_SESSION'); return identity; }
  private typing(client: Socket, body: { roomId?: string }, isTyping: boolean) { const identity = this.identity(client); if (body?.roomId !== identity.roomId || this.joinedRooms.get(client.id) !== identity.roomId) return this.fail(client, 'ROOM_FORBIDDEN', 'Join your assigned room first'); client.to(ROOM_PREFIX + identity.roomId).emit('typing:update', { visitorSessionId: identity.id, nickname: identity.nickname, isTyping }); }
  private async leave(client: Socket, identity: VisitorIdentity, roomId: string, disconnected: boolean) { await client.leave(ROOM_PREFIX + roomId); this.joinedRooms.delete(client.id); await this.removeOnline(roomId, client.id); const count = await this.countOnline(roomId); if (!disconnected) client.emit('visitor:left', { visitorSessionId: identity.id, nickname: identity.nickname }); client.to(ROOM_PREFIX + roomId).emit('visitor:left', { visitorSessionId: identity.id, nickname: identity.nickname }); this.server.to(ROOM_PREFIX + roomId).emit('visitor:count', { roomId, count }); }
  private emitJoined(client: Socket, roomId: string, identity: VisitorIdentity) { client.emit('room:joined', { roomId, visitorSessionId: identity.id, nickname: identity.nickname, onlineCount: this.onlineCount(roomId), serverTime: new Date().toISOString() }); }
  private fail(client: Socket, code: string, message: string) { client.emit('error', { code, message }); }
  private closeRoom(client: Socket) { client.emit('room:closed', { roomId: this.identities.get(client.id)?.roomId }); client.disconnect(true); }
  private async allowMessage(id: string) { const key = `chat:rate:${id}`; try { const count = await this.redis.incr(key); if (count === 1) await this.redis.expire(key, 10); return count <= 5; } catch { const keyLocal = `${key}:${Math.floor(Date.now() / 10_000)}`; const count = (this.localRate.get(keyLocal) ?? 0) + 1; this.localRate.set(keyLocal, count); return count <= 5; } }
  private readonly localRate = new Map<string, number>();
  private async addOnline(roomId: string, socketId: string) { const set = this.localRooms.get(roomId) ?? new Set<string>(); set.add(socketId); this.localRooms.set(roomId, set); try { await this.redis.sadd(roomKey(roomId), socketId); await this.redis.expire(roomKey(roomId), SESSION_TTL_SECONDS); } catch { /* local fallback */ } }
  private async removeOnline(roomId: string, socketId: string) { const set = this.localRooms.get(roomId); set?.delete(socketId); if (set?.size === 0) this.localRooms.delete(roomId); try { await this.redis.srem(roomKey(roomId), socketId); } catch { /* local fallback */ } }
  private async countOnline(roomId: string) { try { return await this.redis.scard(roomKey(roomId)); } catch { return this.onlineCount(roomId); } }
}
const SESSION_TTL_SECONDS = 60 * 60 * 4;