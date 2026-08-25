import { Injectable, NotFoundException, ForbiddenException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

export type LinkStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';
export type RoomState = 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'REVOKED' | 'DELETED';
export interface AccessLinkRecord { id:string; roomId:string; tokenHash:string; expiresAt:Date; revokedAt:Date|null; maxUses:number|null; usedCount:number; status:LinkStatus; createdBy:string; createdAt:Date; lastUsedAt:Date|null; }
export interface RoomRecord { id:string; adminId:string; status:RoomState; deletedAt?:Date|null; maxVisitors:number; }
export interface AccessAttempt { id:string; tokenHash:string; roomId:string|null; success:boolean; reason:string; createdAt:Date; }

@Injectable()
export class AccessLinksService {
  readonly links = new Map<string, AccessLinkRecord>();
  readonly rooms = new Map<string, RoomRecord>();
  readonly attempts: AccessAttempt[] = [];
  registerRoom(room: RoomRecord) { this.rooms.set(room.id, room); }
  private hash(token:string) { return createHash('sha256').update(token).digest('hex'); }
  private url(token:string) { const base=(process.env.PUBLIC_APP_URL ?? 'https://example.com').replace(/\/$/,''); return `${base}/join/${token}`; }
  create(roomId:string, createdBy:string, input:{expiresAt:Date|string;maxUses?:number|null;batch?:number}) {
    const room=this.rooms.get(roomId); if (!room || room.deletedAt || room.status==='DELETED') throw new NotFoundException('ROOM_NOT_FOUND');
    if (room.adminId!==createdBy) throw new ForbiddenException('FORBIDDEN');
    const count=Math.max(1,Math.min(input.batch??1,100)); const result=[] as Array<AccessLinkRecord & {url:string}>;
    for(let i=0;i<count;i++){ const raw=randomBytes(32).toString('base64url'); const now=new Date(); const rec:AccessLinkRecord={id:randomUUID(),roomId,tokenHash:this.hash(raw),expiresAt:new Date(input.expiresAt),revokedAt:null,maxUses:input.maxUses??null,usedCount:0,status:'ACTIVE',createdBy,createdAt:now,lastUsedAt:null}; this.links.set(rec.id,rec); result.push({...rec,url:this.url(raw)}); }
    return result;
  }
  list(roomId:string, actorId:string) { const room=this.rooms.get(roomId); if(!room||room.adminId!==actorId) throw new ForbiddenException('FORBIDDEN'); return [...this.links.values()].filter(x=>x.roomId===roomId).map(x=>({...x})); }
  revoke(id:string, actorId:string) { const l=this.links.get(id); if(!l) throw new NotFoundException('LINK_NOT_FOUND'); const room=this.rooms.get(l.roomId); if(!room||room.adminId!==actorId) throw new ForbiddenException('FORBIDDEN'); l.revokedAt=new Date(); l.status='REVOKED'; return l; }
  rotate(id:string, actorId:string, expiresAt:Date|string, maxUses?:number|null) { const l=this.links.get(id); if(!l) throw new NotFoundException('LINK_NOT_FOUND'); const room=this.rooms.get(l.roomId); if(!room||room.adminId!==actorId) throw new ForbiddenException('FORBIDDEN'); l.revokedAt=new Date(); l.status='REVOKED'; return this.create(l.roomId,actorId,{expiresAt,maxUses})[0]; }
  findByToken(token:string) { const hash=this.hash(token); return [...this.links.values()].find(x=>x.tokenHash===hash); }
  markExpired(now=new Date()) { let n=0; for(const l of this.links.values()) if(l.status==='ACTIVE'&&l.expiresAt<=now){l.status='EXPIRED';n++;} return n; }
  recordAttempt(tokenHash:string, roomId:string|null, success:boolean, reason:string){this.attempts.push({id:randomUUID(),tokenHash,roomId,success,reason,createdAt:new Date()});}
}
