/** Public, versioned data contracts shared by API and web clients. */

export type UtcDateTime = string;
export type Uuid = string;

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
}

export enum RoomStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  DELETED = 'DELETED',
}

export enum RoomAccessLinkStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

export enum MessageType {
  TEXT = 'TEXT',
  SYSTEM = 'SYSTEM',
}

export interface User {
  id: Uuid;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: UtcDateTime;
  updatedAt: UtcDateTime;
}

export interface AdminQuota {
  id: Uuid;
  adminId: Uuid;
  maxRooms: number;
  currentRooms: number;
  maxVisitorsPerRoom: number;
  maxLinksPerRoom: number;
  maxBatchCreate: number;
  createdAt: UtcDateTime;
  updatedAt: UtcDateTime;
}

export interface Room {
  id: Uuid;
  adminId: Uuid;
  name: string;
  description: string | null;
  status: RoomStatus;
  maxVisitors: number;
  expiresAt: UtcDateTime | null;
  closedAt: UtcDateTime | null;
  deletedAt: UtcDateTime | null;
  createdAt: UtcDateTime;
  updatedAt: UtcDateTime;
}

export interface BatchJob {
  id: Uuid;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  requested: number;
  completed: number;
  failed: number;
  createdAt: UtcDateTime;
  updatedAt: UtcDateTime;
}

export interface RoomAccessLink {
  id: Uuid;
  roomId: Uuid;
  tokenHash?: never;
  status: RoomAccessLinkStatus;
  expiresAt: UtcDateTime;
  revokedAt: UtcDateTime | null;
  maxUses: number | null;
  usedCount: number;
  createdBy: Uuid;
  createdAt: UtcDateTime;
  lastUsedAt: UtcDateTime | null;
}

/** Raw URL is returned only at link creation or rotation and is never persisted. */
export interface CreatedRoomAccessLink extends RoomAccessLink { url: string; }

export interface VisitorSession {
  id: Uuid;
  roomId: Uuid;
  accessLinkId: Uuid;
  displayName: string;
  expiresAt: UtcDateTime;
  revokedAt: UtcDateTime | null;
  createdAt: UtcDateTime;
  updatedAt: UtcDateTime;
}

export interface Message {
  id: Uuid;
  roomId: Uuid;
  visitorSessionId: Uuid | null;
  type: MessageType;
  content: string;
  createdAt: UtcDateTime;
}

export interface AuditLog {
  id: Uuid;
  actorUserId: Uuid | null;
  actorVisitorSessionId: Uuid | null;
  action: string;
  resourceType: string;
  resourceId: Uuid | null;
  metadata: Record<string, unknown> | null;
  createdAt: UtcDateTime;
}

export interface DeviceConnection {
  id: Uuid;
  visitorSessionId: Uuid;
  socketId: string;
  connectedAt: UtcDateTime;
  disconnectedAt: UtcDateTime | null;
}

export interface RealtimeEvent<TPayload = unknown> {
  eventId: Uuid;
  eventType: string;
  occurredAt: UtcDateTime;
  payload: TPayload;
}

export interface CommandResult<TData = undefined> {
  success: boolean;
  data?: TData;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId: string;
  timestamp: UtcDateTime;
}

export interface ApiErrorResponse {
  error: ApiError;
}





export enum VisitorSessionStatus { ACTIVE = 'ACTIVE', DISCONNECTED = 'DISCONNECTED', EXPIRED = 'EXPIRED', REVOKED = 'REVOKED' }

