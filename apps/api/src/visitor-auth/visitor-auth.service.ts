import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { AccessLinksService } from '../access-links/access-links.service.js';
import { DatabaseService } from '../health/database.service.js';

const SESSION_LIFETIME_MS = 4 * 60 * 60 * 1000;
@Injectable()
export class VisitorAuthService {
  constructor(private readonly links: AccessLinksService, private readonly database: DatabaseService) {}
  private hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
  async validate(token: string) {
    const { link, room } = await this.links.validate(token);
    return { expiresAt: link.expiresAt.toISOString(), room: { id: room.id, name: room.name } };
  }
  async createSession(token: string, displayName: string) {
    const nickname = displayName.trim();
    if (!nickname || nickname.length > 80) throw new UnauthorizedException('ACCESS_LINK_INVALID');
    const link = await this.links.consume(token);
    const sessionToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Math.min(link.expiresAt.getTime(), Date.now() + SESSION_LIFETIME_MS));
    const session = await this.database.visitorSession.create({ data: { roomId: link.roomId, accessLinkId: link.id, displayName: nickname, sessionTokenHash: this.hash(sessionToken), expiresAt } });
    await this.database.auditLog.create({ data: { action: 'VISITOR_SESSION_CREATED', resourceType: 'RoomAccessLink', resourceId: link.id, actorVisitorSessionId: session.id } }).catch(() => undefined);
    return { id: session.id, roomId: link.roomId, displayName: nickname, sessionToken, expiresAt: expiresAt.toISOString() };
  }
}
