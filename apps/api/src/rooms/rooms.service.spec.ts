import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RoomsService } from './rooms.service';

describe('RoomsService quotas and lifecycle', () => {
  const quota = { adminId:'a1', maxRooms:2, currentRooms:0, maxVisitorsPerRoom:10, maxLinksPerRoom:2, maxBatchCreate:2 };
  let rooms:any[]; let prisma:any; let jobs:any;
  beforeEach(() => { quota.currentRooms=0; quota.maxRooms=2; rooms=[]; jobs={create:jest.fn(()=>({id:'job-1'})),start:jest.fn(),progress:jest.fn(),complete:jest.fn(),fail:jest.fn(),get:jest.fn()}; const q=quota; prisma={ $transaction: async (fn:any)=>fn(prisma), $queryRaw:jest.fn(async()=>[q]), room:{create:jest.fn(async({data}:any)=>{const r={id:`r-${rooms.length+1}`,status:'ACTIVE',createdAt:new Date(),...data};rooms.push(r);return r}), findMany:jest.fn(async()=>rooms), findUnique:jest.fn(async({where}:any)=>rooms.find(r=>r.id===where.id)), update:jest.fn(async({where,data}:any)=>{const r=rooms.find(x=>x.id===where.id);Object.assign(r,data);return r})}, adminQuota:{update:jest.fn(async({data}:any)=>{q.currentRooms+=data.currentRooms.increment;return q}),updateMany:jest.fn(),findUnique:jest.fn(async()=>q)}, auditLog:{create:jest.fn()}, roomAccessLink:{create:jest.fn(async({data}:any)=>({id:'l1',...data}))} }; });
  it('creates and increments quota transactionally', async()=>{const s=new RoomsService(prisma,jobs);const room=await s.create({id:'a1',role:'ADMIN'},{name:'Room'});expect(room.name).toBe('Room');expect(prisma.adminQuota.update).toHaveBeenCalledWith(expect.objectContaining({data:{currentRooms:{increment:1}}}));});
  it('rejects quota overflow', async()=>{quota.maxRooms=0;await expect(new RoomsService(prisma,jobs).create({id:'a1',role:'ADMIN'},{name:'Room'})).rejects.toBeInstanceOf(BadRequestException);});
  it('rejects cross-admin access', async()=>{const s=new RoomsService(prisma,jobs);rooms.push({id:'r1',adminId:'a2',status:'ACTIVE'});await expect(s.get({id:'a1',role:'ADMIN'},'r1')).rejects.toBeInstanceOf(ForbiddenException);});
  it('pauses, resumes and soft deletes', async()=>{const s=new RoomsService(prisma,jobs);const r=await s.create({id:'a1',role:'ADMIN'},{name:'Room'});await s.pause({id:'a1',role:'ADMIN'},r.id);expect(r.status).toBe('PAUSED');await s.resume({id:'a1',role:'ADMIN'},r.id);expect(r.status).toBe('ACTIVE');await s.remove({id:'a1',role:'ADMIN'},r.id);expect(r.status).toBe('DELETED');});
  it('rejects oversized batch', async()=>{await expect(new RoomsService(prisma,jobs).batch({id:'a1',role:'ADMIN'},{namePrefix:'P',count:3} as any)).rejects.toBeInstanceOf(BadRequestException);});
});



