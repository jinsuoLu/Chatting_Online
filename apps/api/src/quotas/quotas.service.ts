import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import * as argon2 from 'argon2';
@Injectable()
export class QuotasService {
  constructor(private readonly prisma: PrismaService) {}
  private admin(actor:any) { if (actor?.role !== 'SUPER_ADMIN') throw new ForbiddenException('SUPER_ADMIN_REQUIRED'); }
  async createAdmin(actor:any, input:any) { this.admin(actor); return this.prisma.user.create({ data: { username: input.username ?? input.email, passwordHash: await argon2.hash(input.password ?? 'change-me'), email: input.email, displayName: input.displayName, role: 'ADMIN', quota: { create: { maxRooms: input.maxRooms, currentRooms: 0, maxVisitorsPerRoom: input.maxVisitorsPerRoom, maxLinksPerRoom: input.maxLinksPerRoom, maxBatchCreate: input.maxBatchCreate } } }, include: { quota: true } }); }
  async update(actor:any, id:string, input:any) { this.admin(actor); if (!await this.prisma.adminQuota.findUnique({ where: { adminId: id } })) throw new NotFoundException('QUOTA_NOT_FOUND'); return this.prisma.adminQuota.update({ where: { adminId: id }, data: input }); }
  async list(actor:any) { this.admin(actor); return this.prisma.adminQuota.findMany({ include: { admin: { select: { id: true, email: true, displayName: true } } } }); }
}

