import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

export type Actor = { id: string; role: 'ADMIN' | 'SUPER_ADMIN' };
export type CreateRoomInput = { name: string; description?: string; expiresAt?: string | Date; maxVisitors?: number };

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}
  private assertOwner(room: any, actor: Actor) { if (actor.role !== 'SUPER_ADMIN' && room.adminId !== actor.id) throw new ForbiddenException('ROOM_FORBIDDEN'); }
  private async audit(tx: any, actor: Actor, action: string, resourceId?: string, metadata?: any) { await tx.auditLog.create({ data: { actorUserId: actor.id, action, resourceType: 'Room', resourceId, metadata } }); }

  async create(actor: Actor, input: CreateRoomInput) {
    if (actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN') throw new ForbiddenException();
    return this.prisma.$transaction(async (tx: any) => {
      const quota = await tx.adminQuota.findUnique({ where: { adminId: actor.id } });
      if (actor.role !== 'SUPER_ADMIN' && (!quota || quota.currentRooms >= quota.maxRooms)) throw new BadRequestException('ROOM_QUOTA_EXCEEDED');
      if (quota && input.maxVisitors && actor.role !== 'SUPER_ADMIN' && input.maxVisitors > quota.maxVisitorsPerRoom) throw new BadRequestException('VISITOR_QUOTA_EXCEEDED');
      const room = await tx.room.create({ data: { adminId: actor.id, name: input.name, description: input.description, maxVisitors: input.maxVisitors ?? quota?.maxVisitorsPerRoom ?? 100, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null } });
      if (quota && actor.role !== 'SUPER_ADMIN') await tx.adminQuota.update({ where: { adminId: actor.id }, data: { currentRooms: { increment: 1 } } });
      await this.audit(tx, actor, 'ROOM_CREATED', room.id);
      return room;
    }, { isolationLevel: 'Serializable' as any });
  }
  async list(actor: Actor) { return this.prisma.room.findMany({ where: actor.role === 'SUPER_ADMIN' ? {} : { adminId: actor.id }, orderBy: { createdAt: 'desc' } }); }
  async get(actor: Actor, id: string) { const room = await this.prisma.room.findUnique({ where: { id } }); if (!room) throw new NotFoundException('ROOM_NOT_FOUND'); this.assertOwner(room, actor); return room; }
  async update(actor: Actor, id: string, input: Partial<CreateRoomInput>) { const room = await this.get(actor,id); return this.prisma.$transaction(async (tx: any) => { const updated = await (tx as any).room.update({ where: { id }, data: { ...(input.name !== undefined && {name: input.name}), ...(input.description !== undefined && {description: input.description}), ...(input.maxVisitors !== undefined && {maxVisitors: input.maxVisitors}), ...(input.expiresAt !== undefined && {expiresAt: input.expiresAt ? new Date(input.expiresAt) : null}) } }); await this.audit(tx, actor, 'ROOM_UPDATED', id); return updated; }); }
  async pause(actor: Actor, id: string) { return this.changeStatus(actor,id,'PAUSED','ROOM_PAUSED'); }
  async resume(actor: Actor, id: string) { return this.changeStatus(actor,id,'ACTIVE','ROOM_RESUMED'); }
  private async changeStatus(actor: Actor,id:string,status:any,action:string) { const room=await this.get(actor,id); if (room.status==='DELETED') throw new BadRequestException('ROOM_DELETED'); return this.prisma.$transaction(async tx=>{const updated=await (tx as any).room.update({where:{id},data:{status}}); await this.audit(tx,actor,action,id); return updated;}); }
  async remove(actor: Actor,id:string) { const room=await this.get(actor,id); if(room.status==='DELETED') return room; return this.prisma.$transaction(async tx=>{const updated=await (tx as any).room.update({where:{id},data:{status:'DELETED',deletedAt:new Date()}}); const q=await (tx as any).adminQuota.findUnique({where:{adminId:room.adminId}}); if(q && q.currentRooms>0) await (tx as any).adminQuota.update({where:{adminId:room.adminId},data:{currentRooms:{decrement:1}}}); await this.audit(tx,actor,'ROOM_DELETED',id); return updated;}); }
  async batch(actor: Actor, input: {namePrefix:string; count:number; expiresAt?:string; maxVisitors?:number; description?:string; autoGenerateLinks?:boolean}) { const quota=actor.role==='SUPER_ADMIN'?null:await this.prisma.adminQuota.findUnique({where:{adminId:actor.id}}); if(input.count<1 || (quota && input.count>quota.maxBatchCreate)) throw new BadRequestException('BATCH_LIMIT_EXCEEDED'); if(quota && input.count>quota.maxRooms-quota.currentRooms) throw new BadRequestException('ROOM_QUOTA_EXCEEDED'); const results=[] as any[]; for(let i=1;i<=input.count;i++){ try{ results.push(await this.create(actor,{...input,name:`${input.namePrefix}-${String(i).padStart(3,'0')}`})); } catch(error){ results.push({index:i,error:(error as Error).message}); } } return { requested:input.count, succeeded:results.filter(r=>r.id).length, failed:results.filter(r=>!r.id), rooms:results.filter(r=>r.id) }; }
}


