import { Injectable, UnauthorizedException, ConflictException, HttpException, ForbiddenException, HttpStatus } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma.service.js';

type Session = { userId: string; expiresAt: number };
@Injectable()
export class AuthService {
  private readonly sessions = new Map<string, Session>();
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly prisma: PrismaService) {}
  private key(username: string, ip: string) { return `${username.toLowerCase()}:${ip}`; }
  private async user(username: string) { return this.prisma.user.findUnique({ where: { username } }); }
  async login(username: string, password: string, ip = 'unknown') {
    const k=this.key(username,ip), now=Date.now(), a=this.attempts.get(k); if (a && a.resetAt>now && a.count>=5) throw new HttpException({code:'LOGIN_RATE_LIMITED',message:'Too many login attempts'}, HttpStatus.TOO_MANY_REQUESTS); if (a && a.resetAt<=now) this.attempts.delete(k);
    const u=await this.user(username); const valid=!!u && u.status===UserStatus.ACTIVE && await argon2.verify(u.passwordHash,password).catch(()=>false);
    if (!valid) { const next=this.attempts.get(k); this.attempts.set(k,{count:(next?.count??0)+1,resetAt:now+15*60*1000}); throw new UnauthorizedException({code:'INVALID_CREDENTIALS',message:'Invalid username or password'}); }
    this.attempts.delete(k); const token=randomBytes(32).toString('hex'); this.sessions.set(token,{userId:u.id,expiresAt:now+15*60*1000}); await this.prisma.user.update({where:{id:u.id},data:{lastLoginAt:new Date()}}); await this.audit(u.id,'LOGIN','User',u.id); return { token, user: this.safe(u) };
  }
  async validateSession(token: string) { const s=this.sessions.get(token); if(!s||s.expiresAt<Date.now()){this.sessions.delete(token);return null;} const u=await this.prisma.user.findUnique({where:{id:s.userId}}); if(!u||u.status!==UserStatus.ACTIVE){this.sessions.delete(token);return null;} return this.safe(u); }
  async refresh(token: string) { const u=await this.validateSession(token); if(!u) throw new UnauthorizedException({code:'AUTH_INVALID',message:'Authentication required'}); this.sessions.get(token)!.expiresAt=Date.now()+15*60*1000; return {token,user:u}; }
  async logout(token?: string) { if(token) this.sessions.delete(token); return {success:true}; }
  async changePassword(userId:string,currentPassword:string,newPassword:string){ const u=await this.prisma.user.findUnique({where:{id:userId}}); if(!u||!(await argon2.verify(u.passwordHash,currentPassword).catch(()=>false))) throw new UnauthorizedException({code:'INVALID_PASSWORD',message:'Current password is incorrect'}); await this.prisma.user.update({where:{id:userId},data:{passwordHash:await argon2.hash(newPassword,{type:argon2.argon2id})}}); return {success:true}; }
  async createAdmin(actor:any, username:string,password:string,role:UserRole=UserRole.ADMIN){ if(actor.role!==UserRole.SUPER_ADMIN) throw new ForbiddenException({code:'FORBIDDEN',message:'Insufficient permissions'}); if(await this.user(username)) throw new ConflictException({code:'USERNAME_EXISTS',message:'Username already exists'}); const u=await this.prisma.user.create({data:{username,passwordHash:await argon2.hash(password,{type:argon2.argon2id}),role,status:UserStatus.ACTIVE}}); return this.safe(u); }
  async listAdmins(actor:any){ const where=actor.role===UserRole.SUPER_ADMIN?{role:{in:[UserRole.ADMIN,UserRole.SUPER_ADMIN]}}:{id:actor.id}; return (await this.prisma.user.findMany({where,orderBy:{createdAt:'desc'}})).map(u=>this.safe(u)); }
  async setStatus(actor:any,id:string,status:UserStatus){ if(actor.role!==UserRole.SUPER_ADMIN && actor.id!==id) throw new ForbiddenException({code:'FORBIDDEN',message:'Insufficient permissions'}); const u=await this.prisma.user.update({where:{id},data:{status}}); return this.safe(u); }
  async setPassword(actor:any,id:string,password:string){ if(actor.role!==UserRole.SUPER_ADMIN && actor.id!==id) throw new ForbiddenException({code:'FORBIDDEN',message:'Insufficient permissions'}); const u=await this.prisma.user.update({where:{id},data:{passwordHash:await argon2.hash(password,{type:argon2.argon2id})}}); return this.safe(u); }
  private safe(u:any){ const {passwordHash, ...safe}=u; return safe; }
  private async audit(actorUserId:string,action:string,resourceType:string,resourceId:string){ try{await this.prisma.auditLog.create({data:{actorUserId,action,resourceType,resourceId}});}catch{} }
}

