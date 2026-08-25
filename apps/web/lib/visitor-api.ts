import type { Room } from '@chatting/contracts';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export class VisitorApiError extends Error {
  constructor(public code: string, message: string, public details?: Record<string, unknown>) {
    super(message);
    this.name = 'VisitorApiError';
  }
}

export interface AccessLinkPreview {
  room: Pick<Room, 'id' | 'name'>;
  expiresAt: string;
}

export interface VisitorSessionResponse {
  id: string;
  roomId: string;
  displayName: string;
  sessionToken: string;
  expiresAt: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
    credentials: 'include',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as any;
    throw new VisitorApiError(body?.error?.code ?? `HTTP_${response.status}`, body?.error?.message ?? '服务暂时不可用，请稍后重试。', body?.error?.details);
  }
  return response.json();
}

export const validateAccessLink = (token: string) => request<AccessLinkPreview>(`/join/${encodeURIComponent(token)}/validate`);
export const createVisitorSession = (token: string, displayName: string) => request<VisitorSessionResponse>(`/join/${encodeURIComponent(token)}/session`, {
  method: 'POST',
  body: JSON.stringify({ displayName }),
});