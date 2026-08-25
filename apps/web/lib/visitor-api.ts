import type { Message, Room } from '@chatting/contracts';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
export class VisitorApiError extends Error { constructor(public code: string, message: string, public details?: Record<string, unknown>) { super(message); this.name = 'VisitorApiError'; } }
export interface AccessLinkPreview { room: Pick<Room,'id'|'name'|'expiresAt'|'status'>; expiresAt: string }
export interface VisitorSessionResponse { sessionId:string; roomId:string; displayName:string; expiresAt:string }
export interface RoomSnapshot { room: Pick<Room,'id'|'name'|'expiresAt'|'status'>; messages:Array<Message & {displayName?:string}>; onlineCount:number }
async function request<T>(path:string, init?:RequestInit):Promise<T>{ const res=await fetch(`${API_BASE_URL}${path}`,{...init,headers:{'content-type':'application/json',...init?.headers},credentials:'include'}); if(!res.ok){const body=await res.json().catch(()=>null) as any; throw new VisitorApiError(body?.error?.code??`HTTP_${res.status}`,body?.error?.message??'服务暂时不可用，请稍后重试。',body?.error?.details)} return res.json() }
export const validateAccessLink=(token:string)=>request<AccessLinkPreview>(`/visitor/access-links/${encodeURIComponent(token)}`);
export const createVisitorSession=(token:string,displayName:string)=>request<VisitorSessionResponse>(`/visitor/access-links/${encodeURIComponent(token)}/sessions`,{method:'POST',body:JSON.stringify({displayName})});
